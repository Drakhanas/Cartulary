"""v1.7 r018: Chronometric's math pulled out where Fabula's timeline can use it.

Drak's calls (2026-10-26), one per message, recorded in docs/fabula-spec.md
section 8 before this cut (d7ff89c). The functions live in 19_chronometric,
under a section header of their own above the Chronometrics view, where
Fabula's timeline will call them as Fabula calls other modules' helpers. The
check that Chronometric draws the same world the same way lives in the
repository, under tools/chrono-parity, run by hand against the last passed
build rebuilt from its tag. His two calls for Chronometric's lanes (room for
their events, long titles wrapped) are r019's, so this cut changes nothing on
screen.

What moves, each expression as it was and in the same order: a date's
fractional year and back; a date carried across calendars and back; the
auto-fit bounds with their 5% padding; the chart's width; the years-to-pixels
scale; zoom around a point; the year, month, and day ticks; the era bands;
the stacking of a lane's events into sub-rows; the lanes' heights and tops
and the chart's height; an event's row's y; and the four sizes (140, 50, 56,
24). Each function takes plain values and returns them. The stacking returns
each event's row, index for index with the lane's sorted events, where it
wrote _row onto the events; the view keeps the rows in rowsByLane and reads
them there. What stays in the view: gathering the events (entries and
marriages), the lane filter, the drawing, drag edit, image export, and the
edit panel. The Vertical Timeline is untouched.

- 19_chronometric: a header above the Chronometrics view, "Chronometric
  math", over CHRONO_LAYOUT and thirteen functions; the view calls them, its
  two calendar wrappers kept so the event gathering and the drag commit read
  as before.

Declared scope: 19_chronometric.
Declarations added: CHRONO_LAYOUT, chronoDateToFractionalYear,
chronoFractionalYearToDate, chronoAxisYear, chronoAxisDate, chronoDataBounds,
chronoChartWidth, chronoScale, chronoZoomAround, chronoTicks, chronoEraBands,
chronoStackRows, chronoLaneLayout, chronoRowY.

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given). Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r018_chronometric_math.py
"""
from pathlib import Path

ROOT = next(p for p in Path(__file__).resolve().parents if (p / 'cartulary-src').is_dir())
MODULES = ROOT / "cartulary-src" / "modules"


def edit(path, pairs):
    text = path.read_text(encoding="utf-8")
    for pair in pairs:
        old, new = pair[0], pair[1]
        count = pair[2] if len(pair) > 2 else 1
        n = text.count(old)
        assert n == count, f"{path.name}: anchor occurs {n} times, not {count}:\n{old[:200]}"
        text = text.replace(old, new)
    path.write_text(text, encoding="utf-8")


def header(title):
    line = f"// ─── {title} "
    return line + "─" * (82 - len(line))


VIEW_HEADER = r"""// ─── Chronometrics view ────────────────────────────────────────────────────────
// Horizontal timeline with proportional duration and parallel lanes per template."""

MATH = header("Chronometric math") + r"""
// What the Chronometrics view computes to place a world's dated events,
// pulled out of it at v1.7's r018 so Fabula's timeline can place a story's
// events the same way. Each function takes plain values and returns them;
// none reads state, React, or the page. The expressions moved as they were,
// so Chronometric draws a world as it did before: tools/chrono-parity
// compares its drawing with the last passed build's, step by step.

// The chart's four sizes, in pixels: the lane-title column, the axis and era
// band above the lanes, a lane's least height, and a sub-row's height.
const CHRONO_LAYOUT = {
  LEFT_GUTTER: 140, // template label column
  TOP_GUTTER: 50,   // year axis + era band
  LANE_HEIGHT: 56,
  ROW_HEIGHT: 24,   // sub-row height for stacking events within a lane
};

// A date's place on its calendar's axis of years: the year, plus the share
// of the year gone before the date's day begins. Null without a year or a
// calendar.
const chronoDateToFractionalYear = (date, cal) => {
  if (!date || date.year == null || !cal) return null;
  const cdpy = daysPerCalendarYear(cal);
  let dayOfYear = 0;
  for (let i = 0; i < (date.monthIndex || 0) && i < cal.months.length; i++) {
    dayOfYear += cal.months[i].days || 0;
  }
  dayOfYear += (date.day || 1) - 1;
  return date.year + (dayOfYear / cdpy);
};

// The way back: the date (year, monthIndex, day) at a place on cal's axis,
// to the nearest day.
const chronoFractionalYearToDate = (frac, cal) => {
  if (frac == null || !isFinite(frac) || !cal) return null;
  const cdpy = daysPerCalendarYear(cal);
  const wholeYear = Math.floor(frac);
  let frDays = Math.round((frac - wholeYear) * cdpy);
  if (frDays < 0) frDays = 0;
  if (frDays >= cdpy) frDays = cdpy - 1;
  let monthIndex = 0;
  let day = frDays;
  for (let i = 0; i < cal.months.length; i++) {
    const len = cal.months[i].days || 0;
    if (day < len) { monthIndex = i; break; }
    day -= len;
    monthIndex = i;  // last-month fallback
  }
  return { year: wholeYear, monthIndex, day: day + 1 };
};

// A date written in dateCal, placed on axisCal's axis. It goes through
// absoluteDay, the moment every calendar shares, so the moment stays exact
// and only the calendar it's read in changes. Null on any failure.
const chronoAxisYear = (date, dateCal, axisCal) => {
  if (!date || date.year == null || !dateCal) return null;
  const absDay = calendarDateToAbsoluteDay(dateCal, date);
  if (absDay == null) return null;
  const axisDate = absoluteDayToCalendarDate(axisCal, absDay);
  if (!axisDate) return null;
  return chronoDateToFractionalYear(axisDate, axisCal);
};

// The way back: the date in dateCal at a place on axisCal's axis, by the
// same road.
const chronoAxisDate = (frac, axisCal, dateCal) => {
  if (frac == null || !isFinite(frac) || !dateCal) return null;
  const axisDate = chronoFractionalYearToDate(frac, axisCal);
  if (!axisDate) return null;
  const absDay = calendarDateToAbsoluteDay(axisCal, axisDate);
  if (absDay == null) return null;
  return absoluteDayToCalendarDate(dateCal, absDay);
};

// The years a set of events spans, each side padded by a twentieth of the
// span and rounded out to a whole year. A single moment is widened by a
// year each way first; no events at all span 0 to 100.
const chronoDataBounds = (events) => {
  if (events.length === 0) return { min: 0, max: 100 };
  let min = Infinity, max = -Infinity;
  events.forEach(ev => {
    if (ev.startYear < min) min = ev.startYear;
    if (ev.endYear > max) max = ev.endYear;
  });
  if (min === max) { min -= 1; max += 1; }
  const padding = (max - min) * 0.05;
  return { min: Math.floor(min - padding), max: Math.ceil(max + padding) };
};

// The chart's width: the container's, less the title column and a 24-pixel
// margin, and never under 200.
const chronoChartWidth = (containerWidth) => Math.max(200, containerWidth - CHRONO_LAYOUT.LEFT_GUTTER - 24);

// The axis's scale over the visible span: years to a pixel, a year's x, and
// an x's year.
const chronoScale = (visStart, visibleRange, chartWidth) => ({
  yearsPerPx: visibleRange / chartWidth,
  yearToX: (y) => CHRONO_LAYOUT.LEFT_GUTTER + ((y - visStart) / visibleRange) * chartWidth,
  xToYear: (x) => visStart + ((x - CHRONO_LAYOUT.LEFT_GUTTER) / chartWidth) * visibleRange,
});

// Zoom by factor around x, the year under x staying under it: the new zoom,
// held between 0.1 and 1000, and the pan that keeps that year in place.
const chronoZoomAround = ({ zoom, factor, x, xToYear, baseRange, chartWidth, effStart }) => {
  const newZoom = Math.max(0.1, Math.min(1000, zoom * factor));
  const yearAtCursor = xToYear(x);
  const newVisRange = baseRange / newZoom;
  const newVisStart = yearAtCursor - ((x - CHRONO_LAYOUT.LEFT_GUTTER) / chartWidth) * newVisRange;
  return { zoom: newZoom, pan: newVisStart - effStart };
};

// The axis's ticks over the visible span, each {value, label, major}: years
// across five years or more, months across 0.4 years or more, days below
// that, as many as the chart's width has room to label.
const chronoTicks = (visStart, visEnd, chartWidth, cal) => {
  const range = visEnd - visStart;
  const targetTicks = Math.max(5, Math.min(20, Math.floor(chartWidth / 100)));
  const out = [];
  const cdpy = daysPerCalendarYear(cal);
  const months = cal.months || [];

  if (range >= 5 || months.length === 0) {
    // Year mode (also the fallback if calendar somehow has no months).
    let step = Math.pow(10, Math.floor(Math.log10(range / targetTicks)));
    while (range / step > targetTicks) step *= 2;
    while (range / step < targetTicks / 2) step /= 2;
    if (step < 1) step = 1;
    const first = Math.ceil(visStart / step) * step;
    for (let y = first; y <= visEnd; y += step) {
      out.push({ value: y, label: formatYear(y, cal), major: true });
    }
  } else if (range >= 0.4) {
    // Month mode. Walk each year's months; decimate if too dense.
    const totalVisibleMonths = range * months.length;
    const skipEvery = Math.max(1, Math.ceil(totalVisibleMonths / targetTicks));
    const yStart = Math.floor(visStart);
    const yEnd = Math.ceil(visEnd);
    for (let y = yStart; y <= yEnd; y++) {
      let dayCursor = 0;
      for (let mi = 0; mi < months.length; mi++) {
        const frac = y + (dayCursor / cdpy);
        if (frac >= visStart && frac <= visEnd) {
          const isYearStart = mi === 0;
          if (isYearStart || mi % skipEvery === 0) {
            const monthAbbr = months[mi].abbreviation || deriveMonthAbbreviation(months[mi].name || "") || `M${mi + 1}`;
            out.push({
              value: frac,
              label: isYearStart ? formatYear(y, cal) : monthAbbr,
              major: isYearStart,
            });
          }
        }
        dayCursor += months[mi].days || 0;
      }
    }
  } else {
    // Day mode. Walk every day; decimate to ~targetTicks.
    const visibleDays = range * cdpy;
    const dayStep = Math.max(1, Math.ceil(visibleDays / targetTicks));
    const yStart = Math.floor(visStart);
    const yEnd = Math.ceil(visEnd);
    for (let y = yStart; y <= yEnd; y++) {
      let dayCursor = 0;
      for (let mi = 0; mi < months.length; mi++) {
        const monthLen = months[mi].days || 0;
        for (let d = 0; d < monthLen; d++) {
          const frac = y + ((dayCursor + d) / cdpy);
          if (frac < visStart || frac > visEnd) continue;
          const isMonthStart = d === 0;
          // Always emit month-start as a major tick; emit other days at the
          // decimated step.
          if (isMonthStart || ((dayCursor + d) % dayStep === 0)) {
            const monthAbbr = months[mi].abbreviation || deriveMonthAbbreviation(months[mi].name || "") || `M${mi + 1}`;
            out.push({
              value: frac,
              label: isMonthStart ? `${monthAbbr} ${y}` : String(d + 1),
              major: isMonthStart,
            });
          }
        }
        dayCursor += monthLen;
      }
    }
  }
  return out;
};

// A calendar's eras as bands on its axis, in order of start: each from its
// start year, or the open past without one, to the next era's start, the
// last open to the future.
const chronoEraBands = (cal) => {
  if (!Array.isArray(cal.eras) || cal.eras.length === 0) return [];
  const sorted = [...cal.eras].sort((a, b) => (a.startYear ?? -Infinity) - (b.startYear ?? -Infinity));
  const bands = [];
  for (let i = 0; i < sorted.length; i++) {
    const era = sorted[i];
    const start = era.startYear ?? -Infinity;
    const end = i + 1 < sorted.length ? (sorted[i + 1].startYear ?? Infinity) : Infinity;
    bands.push({ era, start, end });
  }
  return bands;
};

// A lane's events, sorted by start, stacked into sub-rows: each takes the
// first row whose last event ended more than four pixels' worth of years
// before it starts, or a new row. Returns each event's row, index for index;
// perPx is the scale's years to a pixel.
const chronoStackRows = (events, perPx) => {
  const rowEndYears = []; // index = row, value = endYear
  return events.map(ev => {
    let assigned = -1;
    for (let i = 0; i < rowEndYears.length; i++) {
      if (rowEndYears[i] < ev.startYear - perPx * 4) { // small gap for visual separation
        assigned = i;
        rowEndYears[i] = ev.endYear;
        break;
      }
    }
    if (assigned === -1) {
      assigned = rowEndYears.length;
      rowEndYears.push(ev.endYear);
    }
    return assigned;
  });
};

// The lanes, in order, from their rows: each lane's height (its rows and
// 8 pixels above and below, never under LANE_HEIGHT), each lane's top
// (stacked from TOP_GUTTER), and the chart's whole height.
const chronoLaneLayout = (laneIds, rowsByLane) => {
  const { TOP_GUTTER, LANE_HEIGHT, ROW_HEIGHT } = CHRONO_LAYOUT;
  const heights = {};
  laneIds.forEach(id => {
    const rows = rowsByLane[id] || [];
    const maxRow = rows.reduce((m, row) => Math.max(m, row ?? 0), -1);
    const rowsUsed = maxRow + 1;
    const required = rowsUsed * ROW_HEIGHT + 16;  // 8px top + bottom padding
    heights[id] = Math.max(LANE_HEIGHT, required);
  });
  const offsets = {};
  let y = TOP_GUTTER;
  laneIds.forEach(id => {
    offsets[id] = y;
    y += heights[id] || LANE_HEIGHT;
  });
  const totalHeight = TOP_GUTTER + laneIds.reduce(
    (sum, id) => sum + (heights[id] || LANE_HEIGHT), 0
  ) + 30;
  return { heights, offsets, totalHeight };
};

// The y of the middle of an event's row in a lane whose top is laneY.
const chronoRowY = (laneY, row) => laneY + 12 + row * CHRONO_LAYOUT.ROW_HEIGHT + CHRONO_LAYOUT.ROW_HEIGHT / 2;"""


edit(MODULES / "19_chronometric.jsx", [
    # ------------------------------------------------ the section, above the view
    (VIEW_HEADER, MATH + "\n\n" + VIEW_HEADER),

    # ------------------------------------------------ the calendar conversions
    (r"""  // Calendar-aware fractional year conversion. Takes the calendar as a
  // parameter so the same helper works for projecting entry-frame dates
  // through their own calendar's daysPerYear, and view-frame fractional
  // positions through viewCalendar's daysPerYear. Always returns a value
  // relative to the supplied calendar's epoch (year 1 month 0 day 1 = 0.0).
  const dateToFractionalYear = (date, cal) => {
    if (!date || date.year == null || !cal) return null;
    const cdpy = daysPerCalendarYear(cal);
    let dayOfYear = 0;
    for (let i = 0; i < (date.monthIndex || 0) && i < cal.months.length; i++) {
      dayOfYear += cal.months[i].days || 0;
    }
    dayOfYear += (date.day || 1) - 1;
    return date.year + (dayOfYear / cdpy);
  };

  // Inverse: take a fractional year (in cal's frame) back to a calendar date
  // (year, monthIndex, day) tuple. Used by drag-edit (in view-frame) and by
  // projection helpers (in either frame).
  const fractionalYearToDate = (frac, cal) => {
    if (frac == null || !isFinite(frac) || !cal) return null;
    const cdpy = daysPerCalendarYear(cal);
    const wholeYear = Math.floor(frac);
    let frDays = Math.round((frac - wholeYear) * cdpy);
    if (frDays < 0) frDays = 0;
    if (frDays >= cdpy) frDays = cdpy - 1;
    let monthIndex = 0;
    let day = frDays;
    for (let i = 0; i < cal.months.length; i++) {
      const len = cal.months[i].days || 0;
      if (day < len) { monthIndex = i; break; }
      day -= len;
      monthIndex = i;  // last-month fallback
    }
    return { year: wholeYear, monthIndex, day: day + 1 };
  };

  // Projection:""",
     r"""  // Projection:"""),
    (r"""  const entryDateToViewFractional = (date, entryCal) => {
    if (!date || date.year == null || !entryCal) return null;
    const absDay = calendarDateToAbsoluteDay(entryCal, date);
    if (absDay == null) return null;
    const viewDate = absoluteDayToCalendarDate(viewCalendar, absDay);
    if (!viewDate) return null;
    return dateToFractionalYear(viewDate, viewCalendar);
  };""",
     r"""  const entryDateToViewFractional = (date, entryCal) => chronoAxisYear(date, entryCal, viewCalendar);"""),
    (r"""  const viewFractionalToEntryDate = (frac, entryCal) => {
    if (frac == null || !isFinite(frac) || !entryCal) return null;
    const viewDate = fractionalYearToDate(frac, viewCalendar);
    if (!viewDate) return null;
    const absDay = calendarDateToAbsoluteDay(viewCalendar, viewDate);
    if (absDay == null) return null;
    return absoluteDayToCalendarDate(entryCal, absDay);
  };""",
     r"""  const viewFractionalToEntryDate = (frac, entryCal) => chronoAxisDate(frac, viewCalendar, entryCal);"""),

    # ------------------------------------------------ auto-fit bounds
    (r"""  const dataBounds = useMemo(() => {
    if (allEvents.length === 0) return { min: 0, max: 100 };
    let min = Infinity, max = -Infinity;
    allEvents.forEach(ev => {
      if (ev.startYear < min) min = ev.startYear;
      if (ev.endYear > max) max = ev.endYear;
    });
    if (min === max) { min -= 1; max += 1; }
    const padding = (max - min) * 0.05;
    return { min: Math.floor(min - padding), max: Math.ceil(max + padding) };
  }, [allEvents]);""",
     r"""  const dataBounds = useMemo(() => chronoDataBounds(allEvents), [allEvents]);"""),

    # ------------------------------------------------ sizes and scale
    (r"""  const LEFT_GUTTER = 140; // template label column
  const TOP_GUTTER = 50;   // year axis + era band
  const LANE_HEIGHT = 56;
  const ROW_HEIGHT = 24;   // sub-row height for stacking events within a lane
  const chartWidth = Math.max(200, containerWidth - LEFT_GUTTER - 24);
  const yearsPerPx = visibleRange / chartWidth;
  const yearToX = (y) => LEFT_GUTTER + ((y - visStart) / visibleRange) * chartWidth;
  const xToYear = (x) => visStart + ((x - LEFT_GUTTER) / chartWidth) * visibleRange;""",
     r"""  const { LEFT_GUTTER, TOP_GUTTER, LANE_HEIGHT } = CHRONO_LAYOUT;
  const chartWidth = chronoChartWidth(containerWidth);
  const { yearsPerPx, yearToX, xToYear } = chronoScale(visStart, visibleRange, chartWidth);"""),

    # ------------------------------------------------ stacking
    (r"""  // Stack overlapping events within each lane into sub-rows
  const eventsByTemplate = useMemo(() => {""",
     r"""  // Each visible lane's events in the visible span, sorted by start
  const eventsByTemplate = useMemo(() => {"""),
    (r"""    // Sort within lane by start, then assign sub-row
    Object.values(map).forEach(arr => {
      arr.sort((a, b) => a.startYear - b.startYear);
      const rowEndYears = []; // index = row, value = endYear
      arr.forEach(ev => {
        let assigned = -1;
        for (let i = 0; i < rowEndYears.length; i++) {
          if (rowEndYears[i] < ev.startYear - yearsPerPx * 4) { // small gap for visual separation
            assigned = i;
            rowEndYears[i] = ev.endYear;
            break;
          }
        }
        if (assigned === -1) {
          assigned = rowEndYears.length;
          rowEndYears.push(ev.endYear);
        }
        ev._row = assigned;
      });
    });
    return map;
  }, [allEvents, enabledTemplates, visStart, visEnd, yearsPerPx, visibleTemplates.map(t => t.id).join(",")]);""",
     r"""    // Sort within lane by start
    Object.values(map).forEach(arr => {
      arr.sort((a, b) => a.startYear - b.startYear);
    });
    return map;
  }, [allEvents, enabledTemplates, visStart, visEnd, visibleTemplates.map(t => t.id).join(",")]);

  // Stack overlapping events within each lane into sub-rows: a lane's rows,
  // index for index with its sorted events
  const rowsByLane = useMemo(() => {
    const rows = {};
    Object.keys(eventsByTemplate).forEach(id => { rows[id] = chronoStackRows(eventsByTemplate[id], yearsPerPx); });
    return rows;
  }, [eventsByTemplate, yearsPerPx]);"""),

    # ------------------------------------------------ lane heights, tops, chart height
    (r"""  const laneHeights = useMemo(() => {
    const heights = {};
    visibleTemplates.forEach(t => {
      const rows = eventsByTemplate[t.id] || [];
      const maxRow = rows.reduce((m, ev) => Math.max(m, ev._row ?? 0), -1);
      const rowsUsed = maxRow + 1;
      const required = rowsUsed * ROW_HEIGHT + 16;  // 8px top + bottom padding
      heights[t.id] = Math.max(LANE_HEIGHT, required);
    });
    return heights;
  }, [visibleTemplates.map(t => t.id).join(","), eventsByTemplate]);

  // Cumulative lane Y-offsets so each lane starts where the previous ended.
  const laneOffsets = useMemo(() => {
    const offsets = {};
    let y = TOP_GUTTER;
    visibleTemplates.forEach(t => {
      offsets[t.id] = y;
      y += laneHeights[t.id] || LANE_HEIGHT;
    });
    return offsets;
  }, [visibleTemplates.map(t => t.id).join(","), laneHeights]);

  const totalHeight = TOP_GUTTER + visibleTemplates.reduce(
    (sum, t) => sum + (laneHeights[t.id] || LANE_HEIGHT), 0
  ) + 30;""",
     r"""  // Cumulative lane Y-offsets so each lane starts where the previous ended.
  const laneLayout = useMemo(
    () => chronoLaneLayout(visibleTemplates.map(t => t.id), rowsByLane),
    [visibleTemplates.map(t => t.id).join(","), rowsByLane]
  );
  const laneHeights = laneLayout.heights;
  const laneOffsets = laneLayout.offsets;
  const totalHeight = laneLayout.totalHeight;"""),

    # ------------------------------------------------ ticks
    (r"""  const ticks = useMemo(() => {
    const range = visEnd - visStart;
    const targetTicks = Math.max(5, Math.min(20, Math.floor(chartWidth / 100)));
    const out = [];
    const cdpy = daysPerCalendarYear(viewCalendar);
    const months = viewCalendar.months || [];

    if (range >= 5 || months.length === 0) {
      // Year mode (also the fallback if calendar somehow has no months).
      let step = Math.pow(10, Math.floor(Math.log10(range / targetTicks)));
      while (range / step > targetTicks) step *= 2;
      while (range / step < targetTicks / 2) step /= 2;
      if (step < 1) step = 1;
      const first = Math.ceil(visStart / step) * step;
      for (let y = first; y <= visEnd; y += step) {
        out.push({ value: y, label: formatYear(y, viewCalendar), major: true });
      }
    } else if (range >= 0.4) {
      // Month mode. Walk each year's months; decimate if too dense.
      const totalVisibleMonths = range * months.length;
      const skipEvery = Math.max(1, Math.ceil(totalVisibleMonths / targetTicks));
      const yStart = Math.floor(visStart);
      const yEnd = Math.ceil(visEnd);
      for (let y = yStart; y <= yEnd; y++) {
        let dayCursor = 0;
        for (let mi = 0; mi < months.length; mi++) {
          const frac = y + (dayCursor / cdpy);
          if (frac >= visStart && frac <= visEnd) {
            const isYearStart = mi === 0;
            if (isYearStart || mi % skipEvery === 0) {
              const monthAbbr = months[mi].abbreviation || deriveMonthAbbreviation(months[mi].name || "") || `M${mi + 1}`;
              out.push({
                value: frac,
                label: isYearStart ? formatYear(y, viewCalendar) : monthAbbr,
                major: isYearStart,
              });
            }
          }
          dayCursor += months[mi].days || 0;
        }
      }
    } else {
      // Day mode. Walk every day; decimate to ~targetTicks.
      const visibleDays = range * cdpy;
      const dayStep = Math.max(1, Math.ceil(visibleDays / targetTicks));
      const yStart = Math.floor(visStart);
      const yEnd = Math.ceil(visEnd);
      for (let y = yStart; y <= yEnd; y++) {
        let dayCursor = 0;
        for (let mi = 0; mi < months.length; mi++) {
          const monthLen = months[mi].days || 0;
          for (let d = 0; d < monthLen; d++) {
            const frac = y + ((dayCursor + d) / cdpy);
            if (frac < visStart || frac > visEnd) continue;
            const isMonthStart = d === 0;
            // Always emit month-start as a major tick; emit other days at the
            // decimated step.
            if (isMonthStart || ((dayCursor + d) % dayStep === 0)) {
              const monthAbbr = months[mi].abbreviation || deriveMonthAbbreviation(months[mi].name || "") || `M${mi + 1}`;
              out.push({
                value: frac,
                label: isMonthStart ? `${monthAbbr} ${y}` : String(d + 1),
                major: isMonthStart,
              });
            }
          }
          dayCursor += monthLen;
        }
      }
    }
    return out;
  }, [visStart, visEnd, chartWidth, viewCalendar]);""",
     r"""  const ticks = useMemo(() => chronoTicks(visStart, visEnd, chartWidth, viewCalendar), [visStart, visEnd, chartWidth, viewCalendar]);"""),

    # ------------------------------------------------ era bands
    (r"""  const eraBands = useMemo(() => {
    if (!Array.isArray(viewCalendar.eras) || viewCalendar.eras.length === 0) return [];
    const sorted = [...viewCalendar.eras].sort((a, b) => (a.startYear ?? -Infinity) - (b.startYear ?? -Infinity));
    const bands = [];
    for (let i = 0; i < sorted.length; i++) {
      const era = sorted[i];
      const start = era.startYear ?? -Infinity;
      const end = i + 1 < sorted.length ? (sorted[i + 1].startYear ?? Infinity) : Infinity;
      bands.push({ era, start, end });
    }
    return bands;
  }, [viewCalendar]);""",
     r"""  const eraBands = useMemo(() => chronoEraBands(viewCalendar), [viewCalendar]);"""),

    # ------------------------------------------------ wheel zoom
    (r"""  wheelStateRef.current = { zoom, xToYear, chartWidth, baseRange, effStart, LEFT_GUTTER };""",
     r"""  wheelStateRef.current = { zoom, xToYear, chartWidth, baseRange, effStart };"""),
    (r"""      const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
      const newZoom = Math.max(0.1, Math.min(1000, s.zoom * factor));
      const rect = svg.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const yearAtCursor = s.xToYear(mouseX);
      const newVisRange = s.baseRange / newZoom;
      const newVisStart = yearAtCursor - ((mouseX - s.LEFT_GUTTER) / s.chartWidth) * newVisRange;
      setZoom(newZoom);
      setPan(newVisStart - s.effStart);""",
     r"""      const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
      const rect = svg.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const next = chronoZoomAround({ ...s, factor, x: mouseX });
      setZoom(next.zoom);
      setPan(next.pan);"""),

    # ------------------------------------------------ drawing: rows and titles
    (r"""            const laneEvents = eventsByTemplate[t.id] || [];""",
     r"""            const laneEvents = eventsByTemplate[t.id] || [];
            const laneRows = rowsByLane[t.id] || [];"""),
    (r"""                  const subRow = ev._row || 0;
                  const cy = laneY + 12 + subRow * ROW_HEIGHT + ROW_HEIGHT / 2;""",
     r"""                  const subRow = laneRows[evIdx] || 0;
                  const cy = chronoRowY(laneY, subRow);"""),
    (r"""formatCalendarDate(fractionalYearToDate(""",
     r"""formatCalendarDate(chronoFractionalYearToDate(""", 3),
])
print("v1.7 r018 applied: 19_chronometric")
