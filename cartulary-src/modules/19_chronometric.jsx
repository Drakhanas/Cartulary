
// ─── Timeline view ─────────────────────────────────────────────────────────────

function TimelineView({ state, onOpenEntry, showSecrets, onUpdateViewPrefs }) {
  const { calendar: viewCalendar, Selector: ViewCalendarSelector, hasAdditional } = getViewCalendarContext(state, "timelineCalendarId", onUpdateViewPrefs);
  const [enabledTemplates, setEnabledTemplates] = useState(() => new Set(state.templates.map(t => t.id)));

  // Zoom level controls grouping granularity. Three discrete levels cycled
  // by Ctrl+scroll (and ± buttons). Persisted in viewPrefs so reopening the
  // view restores the user's preferred granularity.
  //   year  — flat list of events under a year header, compact date label
  //   month — year → month headers, no per-event day label
  //   day   — year → month → events with "Day N" prefix (the original layout)
  const ZOOM_LEVELS = ["year", "month", "day"];
  const zoomLevel = (() => {
    const stored = state.viewPrefs?.timelineZoomLevel;
    return ZOOM_LEVELS.includes(stored) ? stored : "day";
  })();
  const setZoomLevel = (lvl) => onUpdateViewPrefs({ timelineZoomLevel: lvl });
  const stepZoom = (direction) => {
    const idx = ZOOM_LEVELS.indexOf(zoomLevel);
    const next = direction === "in"
      ? Math.min(ZOOM_LEVELS.length - 1, idx + 1)
      : Math.max(0, idx - 1);
    if (next !== idx) setZoomLevel(ZOOM_LEVELS[next]);
  };

  // Native Ctrl+wheel handler. Bound natively rather than via React onWheel
  // because React attaches wheel listeners as passive on modern browsers,
  // which blocks preventDefault — and without preventDefault the browser's
  // page zoom would fire instead of (or alongside) ours. Mirrors the
  // Chronometric pattern.
  const wrapperRef = useRef(null);
  const lastZoomFireRef = useRef(0);
  const wheelStateRef = useRef({});
  wheelStateRef.current = { zoomLevel, onUpdateViewPrefs };
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const handler = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      // Throttle to ~5 flips/sec so a single trackpad gesture doesn't burn
      // through all three levels at once.
      const now = Date.now();
      if (now - lastZoomFireRef.current < 180) return;
      lastZoomFireRef.current = now;
      const s = wheelStateRef.current;
      const idx = ZOOM_LEVELS.indexOf(s.zoomLevel);
      const next = e.deltaY < 0
        ? Math.min(ZOOM_LEVELS.length - 1, idx + 1)
        : Math.max(0, idx - 1);
      if (next !== idx) s.onUpdateViewPrefs({ timelineZoomLevel: ZOOM_LEVELS[next] });
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  // Time-aware name resolver: uses the event's year in the entry's bound
  // calendar (not the view calendar) since name-history rows are stored
  // against the entry's own calendar reckoning.
  const entryById = useMemo(() => Object.fromEntries(state.entries.map(e => [e.id, e])), [state.entries]);
  const tplByEntryId = useMemo(() => {
    const m = {};
    const tplById = Object.fromEntries(state.templates.map(t => [t.id, t]));
    state.entries.forEach(e => { m[e.id] = tplById[e.templateId]; });
    return m;
  }, [state.entries, state.templates]);
  const eventDisplayName = (ev) => {
    const e = entryById[ev.entryId];
    if (!e) return ev.entryName;
    return resolveEntryNameAtYear(e, tplByEntryId[ev.entryId], ev.date?.year);
  };
  // Compact projected date used in year-level zoom rows (e.g., "Quenith 5").
  // Walks the view calendar's months for the projected monthIndex.
  const compactProjectedDate = (ev) => {
    const projected = absoluteDayToCalendarDate(viewCalendar, ev.absoluteDay ?? 0);
    if (!projected) return "";
    const month = viewCalendar.months?.[projected.monthIndex];
    const monthAbbr = month?.abbreviation || deriveMonthAbbreviation(month?.name || "") || `M${projected.monthIndex + 1}`;
    return `${monthAbbr} ${projected.day}`;
  };

  const events = useMemo(() => {
    const tplById = Object.fromEntries(state.templates.map(t => [t.id, t]));
    const list = [];
    state.entries.forEach(e => {
      if (!enabledTemplates.has(e.templateId)) return;
      const tpl = tplById[e.templateId];
      if (!tpl) return;
      // Resolve the calendar this entry's dates reckon in. Cached per entry
      // since most entries share calendars and we don't want to re-resolve
      // for every date field on every event.
      const entryCal = getCalendar(state, e.calendarId);
      const walk = (fields, fieldValues) => {
        fields.forEach(f => {
          if (f.secret && !showSecrets) return;
          const val = fieldValues[f.id];
          if (f.type === "calendar-date") {
            if (val && typeof val === "object" && val.year != null) {
              const absDay = calendarDateToAbsoluteDay(entryCal, val);
              list.push({
                entryId: e.id,
                entryName: e.name,
                templateId: e.templateId,
                templateIcon: tpl.icon,
                templateColor: tpl.color,
                templateName: tpl.name,
                fieldLabel: f.label,
                date: val,             // original, in entry's bound calendar — used by name-history resolver
                absoluteDay: absDay,   // universal axis for sort/group/projection
              });
            }
          } else if (f.type === "calendar-date-range" && val && typeof val === "object") {
            // Emit start and end as two separate events. Lifespan / span
            // entries (characters, eras, historical events) get one row per
            // endpoint with " · start" / " · end" suffixed onto the field
            // label so the meta line disambiguates which endpoint this is.
            // Missing endpoint (Living, ongoing, unknown) just skips that side.
            const pushEnd = (endpoint, suffix) => {
              if (!endpoint || endpoint.year == null) return;
              list.push({
                entryId: e.id,
                entryName: e.name,
                templateId: e.templateId,
                templateIcon: tpl.icon,
                templateColor: tpl.color,
                templateName: tpl.name,
                fieldLabel: `${f.label} · ${suffix}`,
                date: endpoint,
                absoluteDay: calendarDateToAbsoluteDay(entryCal, endpoint),
              });
            };
            pushEnd(val.start, "start");
            pushEnd(val.end, "end");
          } else if (f.type === "group" && Array.isArray(val)) {
            val.forEach(inst => walk(f.subfields || [], inst));
          }
        });
      };
      walk(tpl.fields, e.fields || {});
    });
    // Sort by absoluteDay so events from different calendars interleave
    // correctly. Falls back to 0 for entries that produced null absoluteDay
    // (shouldn't happen with calendar-date validation, but defensive).
    list.sort((a, b) => (a.absoluteDay ?? 0) - (b.absoluteDay ?? 0));
    return list;
  }, [state, enabledTemplates, showSecrets]);

  // Group events by year in the view calendar, then by month within year.
  // Each event's projected date is computed from absoluteDay through the
  // view calendar — so an Elven-bound event displays under the right
  // Imperial year when viewing in Imperial, with no per-event divergence.
  const grouped = useMemo(() => {
    const groups = [];
    let curYear = null, yearGroup = null, curMonth = null, monthGroup = null;
    events.forEach(ev => {
      const projected = absoluteDayToCalendarDate(viewCalendar, ev.absoluteDay ?? 0);
      if (!projected) return;
      if (projected.year !== curYear) {
        curYear = projected.year;
        yearGroup = { year: curYear, months: [] };
        groups.push(yearGroup);
        curMonth = null;
        monthGroup = null;
      }
      if (projected.monthIndex !== curMonth) {
        curMonth = projected.monthIndex;
        const monthName = viewCalendar.months[curMonth]?.name || `Month ${curMonth + 1}`;
        monthGroup = { monthIndex: curMonth, name: monthName, events: [] };
        yearGroup.months.push(monthGroup);
      }
      // Carry the projected day along with the event so the render uses it
      // (not the original day, which may sit on a different calendar's grid)
      monthGroup.events.push({ ...ev, projectedDay: projected.day });
    });
    return groups;
  }, [events, viewCalendar]);

  const toggleTemplate = (id) => {
    const next = new Set(enabledTemplates);
    if (next.has(id)) next.delete(id); else next.add(id);
    setEnabledTemplates(next);
  };
  const allOn = () => setEnabledTemplates(new Set(state.templates.map(t => t.id)));
  const allOff = () => setEnabledTemplates(new Set());

  return (
    <div className="timeline-view" ref={wrapperRef}>
      <div className="timeline-controls">
        <span className="timeline-controls-label">Templates:</span>
        {state.templates.map(t => (
          <label key={t.id} className="graph-filter-row" style={{ padding: 0 }}>
            <input type="checkbox" checked={enabledTemplates.has(t.id)} onChange={() => toggleTemplate(t.id)} />
            <span className="graph-filter-color" style={{ background: t.color }} />
            <span style={{ fontSize: 13 }}>{t.name}</span>
          </label>
        ))}
        <span style={{ flex: 1 }} />
        <a href="#" onClick={(e) => { e.preventDefault(); allOn(); }} style={{ color: "var(--accent)", fontSize: 11, textDecoration: "none" }}>all</a>
        <a href="#" onClick={(e) => { e.preventDefault(); allOff(); }} style={{ color: "var(--text-dim)", fontSize: 11, textDecoration: "none" }}>none</a>
      </div>

      <div className="timeline-controls" style={{ marginTop: 0, borderTop: "1px solid var(--border)" }}>
        {hasAdditional && <ViewCalendarSelector />}
        {hasAdditional && <span style={{ flex: 1 }} />}
        {!hasAdditional && <span style={{ flex: 1 }} />}
        <span className="timeline-controls-label" style={{ marginRight: 4 }}>Zoom:</span>
        {ZOOM_LEVELS.map(lvl => (
          <button
            key={lvl}
            className={`btn btn-ghost btn-small${zoomLevel === lvl ? " timeline-zoom-active" : ""}`}
            onClick={() => setZoomLevel(lvl)}
            style={{ minWidth: 48 }}
            title={`Group events by ${lvl}`}
          >{lvl}</button>
        ))}
        <span style={{ fontSize: 10, color: "var(--text-dim)", marginLeft: 6 }}>Ctrl+scroll</span>
      </div>

      {events.length === 0 ? (
        <div className="timeline-empty">
          <div className="timeline-empty-glyph">⏳</div>
          <div>{state.entries.length === 0
            ? "No entries yet."
            : "No calendar dates found. Add a Calendar Date or Calendar Date Range field to a template, then enter dates on entries."}</div>
          <div style={{ fontSize: 12 }}>Edit any template, add a field of type "Calendar Date (in-world)" or "Calendar Date Range".</div>
        </div>
      ) : (
        <div className="timeline-spine">
          {grouped.map(yg => (
            <div key={yg.year} className="timeline-year-block">
              <div className="timeline-year-marker">{formatYear(yg.year, viewCalendar)}</div>
              {zoomLevel === "year" ? (
                // Year-level: flatten months into a single chronological list.
                // Each event row shows a compact "Mon D" projected date in the
                // slot where Day-level renders "Day N".
                yg.months.flatMap(mg => mg.events).map((ev, i) => (
                  <div key={i} className="timeline-event" onClick={() => onOpenEntry(ev.entryId)}>
                    <div className="timeline-event-day">{compactProjectedDate(ev)}</div>
                    <div className="timeline-event-icon" style={{ color: ev.templateColor }}>{ev.templateIcon}</div>
                    <div className="timeline-event-body">
                      <div className="timeline-event-name">{eventDisplayName(ev)}</div>
                      <div className="timeline-event-meta">
                        <span className="timeline-event-tplname">{ev.templateName}</span>
                        <span style={{ color: "var(--border2)" }}>·</span>
                        <span className="timeline-event-fieldlabel">{ev.fieldLabel}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                // Month-level and Day-level share the month-headered structure;
                // they differ only in whether the per-event "Day N" prefix is
                // rendered.
                yg.months.map(mg => (
                  <div key={mg.monthIndex} className="timeline-month-block">
                    <div className="timeline-month-label">{mg.name}</div>
                    {mg.events.map((ev, i) => (
                      <div key={i} className="timeline-event" onClick={() => onOpenEntry(ev.entryId)}>
                        {zoomLevel === "day" && (
                          <div className="timeline-event-day">Day {ev.projectedDay ?? ev.date.day}</div>
                        )}
                        <div className="timeline-event-icon" style={{ color: ev.templateColor }}>{ev.templateIcon}</div>
                        <div className="timeline-event-body">
                          <div className="timeline-event-name">{eventDisplayName(ev)}</div>
                          <div className="timeline-event-meta">
                            <span className="timeline-event-tplname">{ev.templateName}</span>
                            <span style={{ color: "var(--border2)" }}>·</span>
                            <span className="timeline-event-fieldlabel">{ev.fieldLabel}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Chronometric math ─────────────────────────────────────────────────────────
// What the Chronometrics view computes to place a world's dated events,
// pulled out of it at v1.7's r018 so Fabula's timeline can place a story's
// events the same way. Each function takes plain values and returns them;
// none reads state, React, or the page. The expressions moved as they were,
// so Chronometric drew a world as it had: tools/chrono-parity compares its
// drawing with the last passed build's, step by step. v1.7's r019 changed
// what the lanes draw, on Drak's calls (2026-10-26): rows by what each event
// draws, long lane titles wrapped with their lanes grown to fit, and year
// ticks on whole years.

// The chart's sizes, in pixels: the lane-title column, the axis and era band
// above the lanes, a lane's least height, a sub-row's height, a title line's
// height and the room a title's lines have, and the gap after an event.
const CHRONO_LAYOUT = {
  LEFT_GUTTER: 140, // template label column
  TOP_GUTTER: 50,   // year axis + era band
  LANE_HEIGHT: 56,
  ROW_HEIGHT: 24,   // sub-row height for stacking events within a lane
  TITLE_LINE: 16,   // a wrapped lane title's line height
  TITLE_WIDTH: 124, // a title line's room, right-aligned 10 short of the chart
  EVENT_GAP: 4,     // the least room between two events in a row
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
    step = Math.ceil(step); // whole years only: a step of 1.6, the one fraction the doubling reaches, becomes 2 (v1.7 r019)
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

// A span's name as its bar draws it: cut short with an ellipsis where it
// runs past about 7 pixels a character of the bar's width w.
const chronoSpanLabel = (name, w) => (name.length > Math.floor(w / 7) ? name.substring(0, Math.floor(w / 7) - 1) + "…" : name);

// Where an event's drawing starts and ends, in pixels (v1.7 r019), from its
// x's and the measured widths of the name it draws and of the → mark: a
// point's circle (radius 5) and its name, which starts 8 pixels past its
// middle and counts whether or not the chart's edge hides it; a span's bar,
// at least 2 pixels, its ~ 8 pixels before it when its start is approximate,
// its name, which starts 5 pixels in, and its → 2 pixels past its end when
// it's open-ended.
const chronoEventExtent = (ev, x1, x2, nameWidth, arrowWidth) => {
  if (ev.kind === "point") return { left: x1 - 5, right: x1 + 8 + nameWidth };
  const w = Math.max(2, x2 - x1);
  let right = x1 + w;
  if (nameWidth > 0) right = Math.max(right, x1 + 5 + nameWidth);
  if (ev.openEnded) right = Math.max(right, x2 + 2 + arrowWidth);
  return { left: ev.startApprox ? x1 - 8 : x1, right };
};

// A lane's events stacked into sub-rows by what they draw (v1.7 r019): each
// extent, { left, right } in pixels, taken in the order the drawings start,
// goes into the first row whose last drawing ends more than gap pixels before
// its own starts, or into a new row. Returns each one's row, index for index.
const chronoStackRows = (extents, gap) => {
  const rowRights = []; // index = row, value = where its last drawing ends
  return extents.map(ex => {
    let assigned = -1;
    for (let i = 0; i < rowRights.length; i++) {
      if (rowRights[i] < ex.left - gap) {
        assigned = i;
        rowRights[i] = ex.right;
        break;
      }
    }
    if (assigned === -1) {
      assigned = rowRights.length;
      rowRights.push(ex.right);
    }
    return assigned;
  });
};

// A lane title, its icon first, broken into lines no wider than maxWidth
// (v1.7 r019): at its slashes, as many whole parts to a line as fit, each
// slash ending a line; inside a part, at its spaces, only when the part alone
// is too wide; and a word too wide alone cut short with an ellipsis. A slash
// stays with the word before it and the icon with the word after it. widthOf
// measures a line. A title that fits is one line. Since r020 a title can come
// without an icon (hasIcon false, Fabula's timeline), and its first word then
// stands alone.
const chronoTitleLines = (title, widthOf, maxWidth, hasIcon = true) => {
  if (widthOf(title) <= maxWidth) return [title];
  const words = [];
  title.split(" ").forEach((word, i) => {
    if (words.length && (word === "/" || (hasIcon && i === 1))) words[words.length - 1] += " " + word;
    else words.push(word);
  });
  const parts = [[]];
  words.forEach(word => {
    parts[parts.length - 1].push(word);
    if (word.endsWith(" /")) parts.push([]);
  });
  if (!parts[parts.length - 1].length) parts.pop();
  const fit = (piece) => {
    if (widthOf(piece) <= maxWidth) return piece;
    let cut = piece;
    while (cut.length > 1 && widthOf(cut + "…") > maxWidth) cut = cut.slice(0, -1);
    return cut + "…";
  };
  const lines = [];
  let line = "";
  const add = (piece) => {
    const joined = line ? line + " " + piece : piece;
    if (widthOf(joined) <= maxWidth) { line = joined; return; }
    if (line) lines.push(line);
    line = fit(piece);
  };
  parts.forEach(part => {
    const piece = part.join(" ");
    if (widthOf(piece) <= maxWidth) add(piece);
    else part.forEach(add);
  });
  if (line) lines.push(line);
  return lines;
};

// The lanes, in order, from their rows and their titles' line counts: each
// lane's height (its rows and 8 pixels above and below, or its title's lines
// and the same, whichever is taller, never under LANE_HEIGHT), each lane's
// top (stacked from TOP_GUTTER), and the chart's whole height.
const chronoLaneLayout = (laneIds, rowsByLane, titleLineCounts = {}) => {
  const { TOP_GUTTER, LANE_HEIGHT, ROW_HEIGHT, TITLE_LINE } = CHRONO_LAYOUT;
  const heights = {};
  laneIds.forEach(id => {
    const rows = rowsByLane[id] || [];
    const maxRow = rows.reduce((m, row) => Math.max(m, row ?? 0), -1);
    const rowsUsed = maxRow + 1;
    const required = rowsUsed * ROW_HEIGHT + 16;  // 8px top + bottom padding
    const titleNeeds = (titleLineCounts[id] || 1) * TITLE_LINE + 16;
    heights[id] = Math.max(LANE_HEIGHT, required, titleNeeds);
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
const chronoRowY = (laneY, row) => laneY + 12 + row * CHRONO_LAYOUT.ROW_HEIGHT + CHRONO_LAYOUT.ROW_HEIGHT / 2;

// ─── Chronometrics view ────────────────────────────────────────────────────────
// Horizontal timeline with proportional duration and parallel lanes per template.

function ChronometricsView({ state, onOpenEntry, showSecrets, onUpdateEntryDate, isLocked, disabledTemplates, setDisabledTemplates, onUpdateViewPrefs }) {
  // View-level calendar selector. Single-calendar worlds see no selector;
  // multi-calendar worlds get a dropdown defaulting to primary. Every event
  // gets projected into viewCalendar's fractional-year frame for spatial
  // positioning. Drag-edit reverse-projects back to the entry's bound
  // calendar before writing to the underlying date field.
  const { calendar: viewCalendar, Selector: ViewCalendarSelector, hasAdditional } = getViewCalendarContext(state, "chronometricsCalendarId", onUpdateViewPrefs);
  const daysPerYear = daysPerCalendarYear(viewCalendar);

  // Lookups for resolving an event's display name as of its own year. Events
  // gathered below carry entryId; use the entry's name-history (if any) to
  // pick the version that was active when the event happened. Name-history
  // rows are in the entry's bound calendar, so we match on ev.date.year
  // (entry-frame), not ev.startYear (view-frame).
  const entryById = useMemo(() => Object.fromEntries(state.entries.map(e => [e.id, e])), [state.entries]);
  const tplByEntryId = useMemo(() => {
    const m = {};
    const tplById = Object.fromEntries(state.templates.map(t => [t.id, t]));
    state.entries.forEach(e => { m[e.id] = tplById[e.templateId]; });
    return m;
  }, [state.entries, state.templates]);
  const eventDisplayName = (ev) => {
    const e = entryById[ev.entryId];
    if (!e) return ev.entryName;
    return resolveEntryNameAtYear(e, tplByEntryId[ev.entryId], ev.date?.year);
  };

  // Projection: entry-frame date → viewCalendar fractional year. Used at
  // event-build time to place every event on the chart's view-frame axis,
  // regardless of which calendar the entry was originally bound to.
  // Composition: entry-frame date → absoluteDay (via entryCal) → viewCalendar
  // date (via viewCalendar) → fractional year (via viewCalendar). Returns
  // null on any conversion failure.
  const entryDateToViewFractional = (date, entryCal) => chronoAxisYear(date, entryCal, viewCalendar);

  // Reverse projection: viewCalendar fractional year → entry-frame date.
  // Used by drag-edit's commit path. When the user drags an event to a new
  // position on the view-frame axis, the underlying entry stores its date
  // in its own calendar's coordinates — so we reverse through absoluteDay
  // (the universal axis) to land on the right Y/M/D for the entry to keep.
  // Preserves the absolute moment exactly; only the displayed calendar
  // representation changes.
  const viewFractionalToEntryDate = (frac, entryCal) => chronoAxisDate(frac, viewCalendar, entryCal);

  // Stable identity for an event: derived from where it lives in the data, not
  // its array index. Lets selection survive re-renders that re-sort events.
  const eventKey = (ev) => {
    const path = (ev.groupPath || []).map(s => `${s.groupFieldId}:${s.instanceIdx}`).join("/");
    return `${ev.entryId}|${ev.fieldId}|${path}`;
  };

  // Collect all events with their start/end fractional years
  const allEvents = useMemo(() => {
    const tplById = Object.fromEntries(state.templates.map(t => [t.id, t]));
    const entryById = Object.fromEntries(state.entries.map(e => [e.id, e]));
    const list = [];
    const marriagePairsSeen = new Set();  // dedup marriage events to one per pair
    state.entries.forEach(e => {
      const tpl = tplById[e.templateId];
      if (!tpl) return;
      // Resolve this entry's bound calendar once per entry — used to project
      // every date field through into viewCalendar's fractional year axis.
      // Null calendarId resolves to primary via getCalendar's defensive path.
      const entryCal = getCalendar(state, e.calendarId);
      const walk = (fields, fieldValues, groupPath) => {
        fields.forEach(f => {
          if (f.secret && !showSecrets) return;
          const val = fieldValues[f.id];
          if (f.type === "calendar-date" && val && val.year != null) {
            const y = entryDateToViewFractional(val, entryCal);
            list.push({
              entryId: e.id, entryName: e.name, templateId: e.templateId,
              entryCalendarId: e.calendarId || null,
              templateIcon: tpl.icon, templateColor: tpl.color, templateName: tpl.name,
              fieldId: f.id, fieldLabel: f.label, fieldSecret: !!f.secret,
              groupPath: [...groupPath],
              kind: "point",
              startYear: y, endYear: y,
              startApprox: !!val.approximate, endApprox: !!val.approximate,
              date: val,
            });
          } else if (f.type === "calendar-date-range" && val && (val.start || val.end)) {
            const startY = val.start && val.start.year != null ? entryDateToViewFractional(val.start, entryCal) : null;
            const endY = val.end && val.end.year != null ? entryDateToViewFractional(val.end, entryCal) : null;
            if (startY != null || endY != null) {
              list.push({
                entryId: e.id, entryName: e.name, templateId: e.templateId,
                entryCalendarId: e.calendarId || null,
                templateIcon: tpl.icon, templateColor: tpl.color, templateName: tpl.name,
                fieldId: f.id, fieldLabel: f.label, fieldSecret: !!f.secret,
                groupPath: [...groupPath],
                kind: "span",
                startYear: startY ?? endY,
                endYear: endY ?? startY,
                startApprox: !!val.start?.approximate,
                endApprox: !!val.end?.approximate,
                openEnded: startY != null && endY == null,
                openStarted: startY == null && endY != null,
                range: val,
              });
            }
          } else if (f.type === "entry-ref" && f.relationKind === SPOUSE_KIND) {
            // Synthesize one span event per LOGICAL marriage (deduped by
            // alphabetically-sorted entry-id pair). Each spouse declaration
            // produces an event, but with reciprocity both sides hold matching
            // data, so emitting one per pair is sufficient. Skip if the pair
            // already has an event from the other side. Routed to a synthetic
            // "Marriages" lane (laneId = MARRIAGES_LANE_ID) rather than the
            // owning entry's template lane, so dense Character timelines don't
            // pile marriages on top of lifespans. Click-through opens the
            // alphabetically-first entry. Read-only on the timeline — edits
            // happen in the entry editor.
            //
            // marriedOn/endedOn dates are stored on the spouse-ref value
            // alongside the partner id. Conceptually they belong to the
            // marriage relation, which lives on the entry holding the ref.
            // We project them through the holding entry's calendar — same as
            // any other date field on that entry.
            const items = getRelationValues(val, f.multi);
            items.forEach(it => {
              if (!it || !it.id) return;
              const startY = it.marriedOn && it.marriedOn.year != null ? entryDateToViewFractional(it.marriedOn, entryCal) : null;
              const endY = it.endedOn && it.endedOn.year != null ? entryDateToViewFractional(it.endedOn, entryCal) : null;
              if (startY == null && endY == null) return;

              // Pair key: sorted ids joined. Dedup against already-seen pairs.
              const partner = entryById[it.id];
              const partnerName = partner ? partner.name : "(missing entry)";
              const [firstId, secondId] = e.id < it.id ? [e.id, it.id] : [it.id, e.id];
              const pairKey = `${firstId}|${secondId}`;
              if (marriagePairsSeen.has(pairKey)) return;
              marriagePairsSeen.add(pairKey);

              // Click-through anchor: alphabetically-first entry by name (with id as tiebreak)
              const selfFirst = (e.name || "").localeCompare(partnerName) <= 0;
              const anchorEntry = selfFirst ? e : (partner || e);
              const anchorName = anchorEntry.name || "(unknown)";
              const otherName = anchorEntry === e ? partnerName : (e.name || "(unknown)");

              list.push({
                entryId: anchorEntry.id, entryName: anchorName, templateId: anchorEntry.templateId,
                entryCalendarId: e.calendarId || null,  // marriage date origin = holding entry's calendar
                templateIcon: tpl.icon, templateColor: tpl.color, templateName: tpl.name,
                laneId: MARRIAGES_LANE_ID,
                fieldId: `marriage:${pairKey}`,
                fieldLabel: `${anchorName} & ${otherName}`,
                fieldSecret: !!f.secret,
                groupPath: [...groupPath],
                kind: "span",
                startYear: startY ?? endY,
                endYear: endY ?? startY,
                startApprox: !!it.marriedOn?.approximate,
                endApprox: !!it.endedOn?.approximate,
                openEnded: startY != null && endY == null,
                openStarted: startY == null && endY != null,
                range: { start: it.marriedOn || null, end: it.endedOn || null },
                readOnly: true,
                marriagePartnerId: it.id,
              });
            });
          } else if (f.type === "group" && Array.isArray(val)) {
            val.forEach((inst, idx) => walk(f.subfields || [], inst, [...groupPath, { groupFieldId: f.id, instanceIdx: idx }]));
          }
        });
      };
      walk(tpl.fields, e.fields || {}, []);
    });
    // Default laneId = templateId for events that didn't set one explicitly
    // (i.e., everything that isn't on a synthetic lane like marriages).
    list.forEach(ev => { if (!ev.laneId) ev.laneId = ev.templateId; });
    return list;
  }, [state, showSecrets]);

  // Lanes with at least one event. A "lane" is either a template (one per
  // template that has events on it) or a synthetic category lane (e.g.,
  // "Marriages") that aggregates events from multiple entries. Each lane
  // record exposes the same shape as a template — id, name, color?, icon? —
  // so downstream rendering doesn't need to distinguish them.
  const templatesWithEvents = useMemo(() => {
    const ids = new Set(allEvents.map(ev => ev.laneId));
    const tplLanes = state.templates.filter(t => ids.has(t.id));
    const synthLanes = SYNTHETIC_LANES.filter(s => ids.has(s.id));
    return [...tplLanes, ...synthLanes];
  }, [state.templates, allEvents]);

  // Lane visibility (Bug 12). Tracks templates the user has EXPLICITLY hidden.
  // disabledTemplates state is now lifted to App — see ChronometricsView's
  // signature. Local useState was clobbered every time the user navigated
  // away and back to this view (component unmount = state reset). Lifting
  // makes the filter persist within the session.
  // Prune disables when a template stops having events (keeps the set small;
  // not strictly necessary, but avoids stale IDs accumulating).
  useEffect(() => {
    const liveIds = new Set(templatesWithEvents.map(t => t.id));
    setDisabledTemplates(prev => {
      let changed = false;
      const next = new Set();
      prev.forEach(id => {
        if (liveIds.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [templatesWithEvents.map(t => t.id).join(",")]);
  const enabledTemplates = useMemo(() => {
    const set = new Set();
    templatesWithEvents.forEach(t => { if (!disabledTemplates.has(t.id)) set.add(t.id); });
    return set;
  }, [templatesWithEvents, disabledTemplates]);
  const setEnabledTemplates = (updater) => {
    setDisabledTemplates(prevDisabled => {
      const prevEnabled = new Set();
      templatesWithEvents.forEach(t => { if (!prevDisabled.has(t.id)) prevEnabled.add(t.id); });
      const nextEnabled = typeof updater === "function" ? updater(prevEnabled) : updater;
      const nextDisabled = new Set();
      templatesWithEvents.forEach(t => { if (!nextEnabled.has(t.id)) nextDisabled.add(t.id); });
      return nextDisabled;
    });
  };

  // Viewport range bounds (year limits) — null means auto-fit
  const [viewStart, setViewStart] = useState(null);
  const [viewEnd, setViewEnd] = useState(null);

  // Compute auto-bounds from events when no manual bounds set
  const dataBounds = useMemo(() => chronoDataBounds(allEvents), [allEvents]);

  const effStart = viewStart ?? dataBounds.min;
  const effEnd = viewEnd ?? dataBounds.max;

  // Pan + zoom state — treat as transform on the year axis
  const [pan, setPan] = useState(0); // years offset
  const [zoom, setZoom] = useState(1); // multiplier
  const baseRange = effEnd - effStart;
  const visibleRange = baseRange / zoom;
  const visStart = effStart + pan;
  const visEnd = visStart + visibleRange;

  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(1000);
  useEffect(() => {
    const update = () => setContainerWidth(containerRef.current?.clientWidth || 1000);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Text widths for the lanes' layout (v1.7 r019), measured on a canvas in
  // the fonts the chart draws in, and measured again once the page's fonts
  // finish loading, since a fallback face sets other widths.
  const [fontsLoaded, setFontsLoaded] = useState(0);
  useEffect(() => {
    const fonts = document.fonts;
    if (!fonts) return undefined;
    let live = true;
    const bump = () => { if (live) setFontsLoaded(n => n + 1); };
    if (fonts.ready) fonts.ready.then(bump);
    if (fonts.addEventListener) fonts.addEventListener("loadingdone", bump);
    return () => { live = false; if (fonts.removeEventListener) fonts.removeEventListener("loadingdone", bump); };
  }, []);
  const measureText = useMemo(() => {
    const ctx = document.createElement("canvas").getContext("2d");
    const widths = new Map();
    return (text, size) => {
      const key = size + "|" + text;
      if (!widths.has(key)) {
        if (ctx) ctx.font = `${size}px "DM Sans", sans-serif`;
        widths.set(key, ctx ? ctx.measureText(text).width : text.length * size * 0.55);
      }
      return widths.get(key);
    };
  }, [fontsLoaded]);

  const { LEFT_GUTTER, TOP_GUTTER, LANE_HEIGHT } = CHRONO_LAYOUT;
  const chartWidth = chronoChartWidth(containerWidth);
  const { yearsPerPx, yearToX, xToYear } = chronoScale(visStart, visibleRange, chartWidth);

  // Visible lanes (filtered) become rows in display order
  const visibleTemplates = templatesWithEvents.filter(t => enabledTemplates.has(t.id));

  // Each visible lane's events in the visible span, sorted by start
  const eventsByTemplate = useMemo(() => {
    const map = {};
    visibleTemplates.forEach(t => { map[t.id] = []; });
    allEvents.forEach(ev => {
      if (!enabledTemplates.has(ev.laneId)) return;
      // Skip events fully outside visible range
      if (ev.endYear < visStart || ev.startYear > visEnd) return;
      if (map[ev.laneId]) map[ev.laneId].push(ev);
    });
    // Sort within lane by start
    Object.values(map).forEach(arr => {
      arr.sort((a, b) => a.startYear - b.startYear);
    });
    return map;
  }, [allEvents, enabledTemplates, visStart, visEnd, visibleTemplates.map(t => t.id).join(",")]);

  // Stack overlapping events within each lane into sub-rows by what each
  // draws (v1.7 r019): a lane's rows, index for index with its sorted events.
  // The extents are taken in the order the drawings start.
  const rowsByLane = useMemo(() => {
    const rows = {};
    const arrowWidth = measureText("→", 12);
    Object.keys(eventsByTemplate).forEach(id => {
      const evs = eventsByTemplate[id];
      const extents = evs.map(ev => {
        const x1 = yearToX(ev.startYear), x2 = yearToX(ev.endYear);
        const name = eventDisplayName(ev);
        const w = Math.max(2, x2 - x1);
        const nameWidth = ev.kind === "point" ? measureText((ev.startApprox ? "~" : "") + name, 11)
          : (w > 50 ? measureText(chronoSpanLabel(name, w), 11) : 0);
        return chronoEventExtent(ev, x1, x2, nameWidth, arrowWidth);
      });
      const order = extents.map((ex, i) => i).sort((a, b) => (extents[a].left - extents[b].left) || (a - b));
      const stacked = chronoStackRows(order.map(i => extents[i]), CHRONO_LAYOUT.EVENT_GAP);
      const laneRows = new Array(evs.length);
      order.forEach((i, k) => { laneRows[i] = stacked[k]; });
      rows[id] = laneRows;
    });
    return rows;
  }, [eventsByTemplate, visStart, visibleRange, chartWidth, measureText, entryById, tplByEntryId]);

  // Each visible lane's title broken into lines that fit its column (v1.7
  // r019); a title that fits is one line
  const titleLinesByLane = useMemo(() => {
    const lines = {};
    visibleTemplates.forEach(t => {
      lines[t.id] = chronoTitleLines(`${t.icon || ""} ${t.name || ""}`, (s) => measureText(s, 13), CHRONO_LAYOUT.TITLE_WIDTH);
    });
    return lines;
  }, [visibleTemplates.map(t => `${t.id}|${t.icon}|${t.name}`).join("\n"), measureText]);

  // Variable lane heights — each lane sized to fit its actual row count.
  // Default LANE_HEIGHT (56) accommodates ~2 rows comfortably (24px each).
  // When a lane has more events stacked, expand the lane to fit them all
  // rather than letting events render outside the lane band. Solves the
  // crowding problem for any lane with many overlapping events, not just
  // marriages — was the structural fix on the roadmap as the "Chronometric
  // crowded-lane label heuristic." Still uses LANE_HEIGHT as the minimum
  // so sparse lanes don't shrink below the established visual rhythm.
  // Cumulative lane Y-offsets so each lane starts where the previous ended.
  const laneLayout = useMemo(
    () => chronoLaneLayout(visibleTemplates.map(t => t.id), rowsByLane,
      Object.fromEntries(Object.entries(titleLinesByLane).map(([id, ls]) => [id, ls.length]))),
    [visibleTemplates.map(t => t.id).join(","), rowsByLane, titleLinesByLane]
  );
  const laneHeights = laneLayout.heights;
  const laneOffsets = laneLayout.offsets;
  const totalHeight = laneLayout.totalHeight;

  // Tick marks for year axis — adaptive density
  // Tick generation has three modes keyed by visible range. The transitions
  // are tuned so labels stay readable at any zoom level without collisions.
  //   visRange >= 5 years   → year ticks (decimal step scaling like the original).
  //   0.4 <= visRange < 5y  → month ticks at viewCalendar.months boundaries; first
  //                           month of each year gets the year label as a major tick.
  //   visRange < 0.4 years  → day ticks; first day of each month gets a major label.
  // Tick objects carry {value, label, major}. Major ticks render heavier so the
  // viewer can locate year/month boundaries at a glance under denser sub-year
  // tick fields.
  const ticks = useMemo(() => chronoTicks(visStart, visEnd, chartWidth, viewCalendar), [visStart, visEnd, chartWidth, viewCalendar]);

  // Era bands. Rebound to viewCalendar's eras — change the calendar selector
  // and the bands shift to whichever era system the user picked. Era boundary
  // positions are integer year values in viewCalendar's frame (since that's
  // where every event also lives after projection), so no conversion needed.
  const eraBands = useMemo(() => chronoEraBands(viewCalendar), [viewCalendar]);

  // Pan handlers
  const dragRef = useRef(null);
  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    dragRef.current = { startX: e.clientX, startPan: pan };
  };
  const onMouseMove = (e) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    setPan(dragRef.current.startPan - dx * yearsPerPx);
  };
  const onMouseUp = () => { dragRef.current = null; };
  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  });

  // ── Wheel zoom (Ctrl+scroll) ─────────────────────────────────────────────
  // Bound natively (not via React's onWheel) because React attaches wheel
  // events as passive by default, which silently disables preventDefault —
  // Brave/Chrome then treats Ctrl+wheel as page zoom and the in-app zoom
  // never gets to fire. Using addEventListener with passive:false fixes that.
  // The handler reads its dependencies through a ref so the listener can be
  // bound once and never re-attached, while still seeing fresh values.
  const wheelStateRef = useRef({});
  wheelStateRef.current = { zoom, xToYear, chartWidth, baseRange, effStart };
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const s = wheelStateRef.current;
      const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
      const rect = svg.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const next = chronoZoomAround({ ...s, factor, x: mouseX });
      setZoom(next.zoom);
      setPan(next.pan);
    };
    svg.addEventListener("wheel", handler, { passive: false });
    return () => svg.removeEventListener("wheel", handler);
  }, []);

  const resetView = () => { setPan(0); setZoom(1); setViewStart(null); setViewEnd(null); };

  const toggleTemplate = (id) => {
    const next = new Set(enabledTemplates);
    if (next.has(id)) next.delete(id); else next.add(id);
    setEnabledTemplates(next);
  };
  const allOn = () => setEnabledTemplates(new Set(templatesWithEvents.map(t => t.id)));
  const allOff = () => setEnabledTemplates(new Set());

  // ── Interactive editing state ────────────────────────────────────────────────
  // editMode is opt-in. When off, click an event to open the entry (existing
  // behavior). When on, click an event to select it for editing in the panel
  // and via drag. Hidden entirely when the world is locked.
  const [editMode, setEditMode] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);
  const selectedEvent = useMemo(
    () => allEvents.find(ev => eventKey(ev) === selectedKey) || null,
    [allEvents, selectedKey]
  );
  // Drop selection if the event no longer exists (e.g. user deleted it elsewhere)
  useEffect(() => {
    if (selectedKey && !selectedEvent) setSelectedKey(null);
  }, [selectedKey, selectedEvent]);
  // Force out of edit mode if the world locks while editing.
  useEffect(() => {
    if (isLocked && editMode) {
      setEditMode(false);
      setSelectedKey(null);
    }
  }, [isLocked, editMode]);

  // Esc to deselect (only fires when an event is selected; doesn't steal Esc
  // from the rest of the app when nothing is going on).
  useEffect(() => {
    if (!selectedKey) return;
    const onKey = (e) => {
      if (e.key === "Escape") setSelectedKey(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedKey]);

  // ── Drag-edit on events ──────────────────────────────────────────────────────
  // dragState: { eventKey, edge, startX, startEvent, deltaYears, moved } | null
  //   edge: "point" | "middle" | "start" | "end"
  // Mousedown on an event in edit mode starts drag tracking. Mousemove on
  // window updates deltaYears (also sets moved=true once past threshold).
  // Mouseup commits the change via onUpdateEntryDate, OR if the user never
  // moved, treats it as a click and selects the event.
  const [dragState, setDragState] = useState(null);
  const dragStateRef = useRef(null);
  useEffect(() => { dragStateRef.current = dragState; }, [dragState]);

  const handleEventMouseDown = (ev, edge) => (mouseEvent) => {
    if (!editMode || ev.readOnly) {
      // Default behavior: click-to-open. Read-only events (synthesized marriage
      // spans) bypass edit mode entirely — their underlying data isn't a
      // calendar-date-range and the drag-edit path can't update it correctly.
      mouseEvent.stopPropagation();
      onOpenEntry(ev.entryId);
      return;
    }
    mouseEvent.stopPropagation();  // suppress pan
    mouseEvent.preventDefault();
    setDragState({
      eventKey: eventKey(ev),
      edge,
      startX: mouseEvent.clientX,
      startEvent: ev,
      deltaYears: 0,
      moved: false,
    });
  };

  // ── Image export ─────────────────────────────────────────────────────────────
  // Serializes the current chronometric SVG with computed styles inlined, a
  // background rect, and a "Made with Cartulary" watermark. Exports as PNG (raster,
  // 2x for retina) or SVG (vector). What you see is what gets exported — only the
  // visible date range, only the enabled lanes, at the current zoom level.
  const exportImage = (format) => {
    const original = svgRef.current;
    if (!original) return;
    const ns = "http://www.w3.org/2000/svg";

    // Clone and strip interactive attributes
    const clone = original.cloneNode(true);
    clone.removeAttribute("style");
    clone.removeAttribute("onmousedown");
    clone.removeAttribute("onwheel");
    clone.setAttribute("xmlns", ns);
    clone.setAttribute("viewBox", `0 0 ${containerWidth} ${totalHeight}`);

    // Inline computed styles. Walking original + clone in parallel so each
    // clone element gets the resolved styles its original had under the app's
    // stylesheet (which doesn't travel with a serialized SVG).
    const PROPS = [
      "fill", "stroke", "stroke-width", "stroke-dasharray", "stroke-opacity",
      "fill-opacity", "opacity", "font-family", "font-size", "font-weight",
      "font-style", "text-anchor", "dominant-baseline",
    ];
    const inline = (orig, copy) => {
      if (orig.nodeType !== 1) return;
      const computed = getComputedStyle(orig);
      let style = "";
      PROPS.forEach(p => {
        const v = computed.getPropertyValue(p);
        if (v && v !== "none" && v !== "normal" && v !== "auto") style += `${p}:${v};`;
      });
      if (style) {
        const existing = copy.getAttribute("style") || "";
        copy.setAttribute("style", existing + style);
      }
      for (let i = 0; i < orig.children.length; i++) {
        if (copy.children[i]) inline(orig.children[i], copy.children[i]);
      }
    };
    inline(original, clone);

    // Background rect (so PNG isn't transparent and SVG matches the app's bg).
    const bgColor = (getComputedStyle(document.documentElement).getPropertyValue("--bg") || "#0c0b0a").trim();
    const bg = document.createElementNS(ns, "rect");
    bg.setAttribute("x", "0");
    bg.setAttribute("y", "0");
    bg.setAttribute("width", String(containerWidth));
    bg.setAttribute("height", String(totalHeight));
    bg.setAttribute("fill", bgColor);
    clone.insertBefore(bg, clone.firstChild);

    // Watermark
    const accentColor = (getComputedStyle(document.documentElement).getPropertyValue("--accent") || "#c8a96e").trim();
    const watermark = document.createElementNS(ns, "text");
    watermark.setAttribute("x", String(containerWidth - 12));
    watermark.setAttribute("y", String(totalHeight - 12));
    watermark.setAttribute("text-anchor", "end");
    watermark.setAttribute("font-family", "DM Sans, sans-serif");
    watermark.setAttribute("font-size", "11");
    watermark.setAttribute("font-weight", "400");
    watermark.setAttribute("fill", accentColor);
    watermark.setAttribute("fill-opacity", "0.55");
    watermark.textContent = "Made with Cartulary";
    clone.appendChild(watermark);

    const svgString = new XMLSerializer().serializeToString(clone);
    const safeName = slugify(state.world.name) || "world";
    const dateStr = new Date().toISOString().slice(0, 10);
    const baseName = `${safeName}-timeline-${dateStr}`;

    if (format === "svg") {
      const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${baseName}.svg`; a.click();
      URL.revokeObjectURL(url);
      return;
    }

    // PNG: load the serialized SVG into an Image, draw to a 2x canvas, blob to PNG.
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = containerWidth * scale;
      canvas.height = totalHeight * scale;
      const ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(b => {
        if (!b) { console.error("PNG export: canvas.toBlob returned null"); return; }
        const purl = URL.createObjectURL(b);
        const a = document.createElement("a");
        a.href = purl; a.download = `${baseName}.png`; a.click();
        URL.revokeObjectURL(purl);
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      console.error("PNG export: image load failed (SVG may contain unsupported elements)");
    };
    img.src = url;
  };

  // ── Drag commit effect ──────────────────────────────────────────────────────
  // Bound to window so the user can drag past the SVG's bounds without
  // releasing the gesture. Threshold of 3px before a movement counts as a
  // drag (so a tiny shake while clicking doesn't reorder dates).
  useEffect(() => {
    if (!dragState) return;
    const onMove = (e) => {
      const cur = dragStateRef.current;
      if (!cur) return;
      const dx = e.clientX - cur.startX;
      const deltaYears = (dx / chartWidth) * visibleRange;
      const moved = cur.moved || Math.abs(dx) > 3;
      setDragState({ ...cur, deltaYears, moved });
    };
    const onUp = () => {
      const cur = dragStateRef.current;
      setDragState(null);
      if (!cur) return;
      const ev = cur.startEvent;
      if (!cur.moved) {
        // Treat as a click: select the event for panel editing.
        setSelectedKey(eventKey(ev));
        return;
      }
      // Commit the dragged date.
      const dy = cur.deltaYears || 0;
      if (Math.abs(dy) < 1 / daysPerYear) return;  // sub-day drag, skip noise
      // Resolve the entry's bound calendar — drag positions are in viewCalendar
      // fractional year, but the entry stores dates in its own calendar's
      // coordinates. viewFractionalToEntryDate handles the absoluteDay reverse-
      // projection so the absolute moment is preserved exactly across the round-trip.
      const entryCal = getCalendar(state, ev.entryCalendarId);
      if (ev.kind === "point") {
        const newPos = viewFractionalToEntryDate(ev.startYear + dy, entryCal);
        if (!newPos) return;
        const updated = { ...ev.date, ...newPos };
        onUpdateEntryDate(ev.entryId, ev.fieldId, ev.groupPath, updated);
      } else if (ev.kind === "span") {
        const newRange = JSON.parse(JSON.stringify(ev.range || {}));
        if (cur.edge === "middle") {
          if (newRange.start && newRange.start.year != null) {
            const np = viewFractionalToEntryDate(ev.startYear + dy, entryCal);
            if (np) newRange.start = { ...newRange.start, ...np };
          }
          if (newRange.end && newRange.end.year != null) {
            const np = viewFractionalToEntryDate(ev.endYear + dy, entryCal);
            if (np) newRange.end = { ...newRange.end, ...np };
          }
        } else if (cur.edge === "start" && newRange.start && newRange.start.year != null) {
          const np = viewFractionalToEntryDate(ev.startYear + dy, entryCal);
          if (np) newRange.start = { ...newRange.start, ...np };
        } else if (cur.edge === "end" && newRange.end && newRange.end.year != null) {
          const np = viewFractionalToEntryDate(ev.endYear + dy, entryCal);
          if (np) newRange.end = { ...newRange.end, ...np };
        }
        onUpdateEntryDate(ev.entryId, ev.fieldId, ev.groupPath, newRange);
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragState, chartWidth, visibleRange, daysPerYear, onUpdateEntryDate, viewCalendar, state.calendars]);

  // Click on empty SVG space deselects the current selection (only in edit mode).
  const onSvgBackgroundMouseDown = (e) => {
    if (editMode && selectedKey) setSelectedKey(null);
    onMouseDown(e);  // existing pan handler
  };

  if (allEvents.length === 0) {
    return (
      <div className="chrono-view">
        <div className="chrono-empty">
          <div className="chrono-empty-glyph">⌚</div>
          <div>{state.entries.length === 0
            ? "No entries yet."
            : "No dated events found. Add Calendar Date or Calendar Date Range fields to your templates and fill them in on entries."}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="chrono-view" ref={containerRef}>
      <div className="chrono-controls">
        {hasAdditional && (
          <div className="chrono-controls-row" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 8, marginBottom: 4 }}>
            <ViewCalendarSelector />
          </div>
        )}
        <div className="chrono-controls-row">
          <span className="chrono-controls-label">Lanes:</span>
          {templatesWithEvents.map(t => (
            <label key={t.id} className="chrono-filter-row">
              <input type="checkbox" checked={enabledTemplates.has(t.id)} onChange={() => toggleTemplate(t.id)} />
              <span className="chrono-filter-color" style={{ background: t.color }} />
              <span style={{ fontSize: "calc(13px * var(--font-scale))" }}>{t.name}</span>
            </label>
          ))}
          <span style={{ flex: 1 }} />
          <a href="#" onClick={(e) => { e.preventDefault(); allOn(); }} className="chrono-link">all</a>
          <a href="#" onClick={(e) => { e.preventDefault(); allOff(); }} className="chrono-link" style={{ color: "var(--text-dim)" }}>none</a>
        </div>
        <div className="chrono-controls-row" style={{ borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 4 }}>
          <span className="chrono-controls-label">Range:</span>
          <input
            className="input chrono-bound-input"
            type="number"
            placeholder="From year"
            value={viewStart ?? ""}
            onChange={e => setViewStart(e.target.value === "" ? null : parseInt(e.target.value))}
          />
          <span style={{ color: "var(--text-dim)" }}>→</span>
          <input
            className="input chrono-bound-input"
            type="number"
            placeholder="To year"
            value={viewEnd ?? ""}
            onChange={e => setViewEnd(e.target.value === "" ? null : parseInt(e.target.value))}
          />
          <span style={{ flex: 1 }} />
          <button className="btn btn-ghost btn-small" onClick={() => setZoom(z => Math.min(1000, z * 1.5))}>+</button>
          <button className="btn btn-ghost btn-small" onClick={() => setZoom(z => Math.max(0.1, z / 1.5))}>−</button>
          <button className="btn btn-ghost btn-small" onClick={resetView}>Reset</button>
          <span style={{ width: 1, height: 18, background: "var(--border)", margin: "0 4px" }} />
          <button className="btn btn-ghost btn-small" onClick={() => exportImage("png")} title="Download timeline as PNG (2x resolution, current viewport, includes a small Made with Cartulary watermark)">PNG</button>
          <button className="btn btn-ghost btn-small" onClick={() => exportImage("svg")} title="Download timeline as SVG vector (current viewport, includes a small Made with Cartulary watermark)">SVG</button>
          {!isLocked && (
            <>
              <span style={{ width: 1, height: 18, background: "var(--border)", margin: "0 4px" }} />
              <button
                className={`btn btn-small ${editMode ? "btn-accent" : "btn-ghost"}`}
                onClick={() => { setEditMode(m => !m); setSelectedKey(null); }}
                title={editMode
                  ? "Leave edit mode. Clicking events will open their entries again."
                  : "Enter edit mode. Click an event to select it for date editing; drag events to move them on the timeline."}
              >
                {editMode ? "Editing" : "Edit"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="chrono-svg-wrap">
        <svg
          ref={svgRef}
          width={containerWidth}
          height={totalHeight}
          onMouseDown={onSvgBackgroundMouseDown}
          style={{ cursor: dragRef.current ? "grabbing" : (editMode ? "default" : "grab"), userSelect: "none" }}
        >
          <defs>
            <clipPath id="chrono-events-clip">
              <rect x={LEFT_GUTTER} y={0} width={chartWidth} height={totalHeight} />
            </clipPath>
          </defs>
          {/* Era bands */}
          {eraBands.map((b, i) => {
            const x1 = Math.max(LEFT_GUTTER, yearToX(Math.max(b.start, visStart)));
            const x2 = Math.min(LEFT_GUTTER + chartWidth, yearToX(Math.min(b.end, visEnd)));
            if (x2 <= x1) return null;
            // Cycle through subtle hues based on era index
            const hues = ["rgba(200,169,110,.06)", "rgba(160,110,200,.06)", "rgba(110,158,200,.06)", "rgba(200,110,110,.06)"];
            return (
              <g key={i}>
                <rect x={x1} y={TOP_GUTTER - 18} width={x2 - x1} height={totalHeight - TOP_GUTTER + 18} fill={hues[i % hues.length]} />
                {(x2 - x1) > 50 && (
                  <text
                    x={x1 + 6} y={TOP_GUTTER - 6}
                    fill="var(--accent-dim)"
                    fontSize={10}
                    fontFamily="DM Sans, sans-serif"
                    fontStyle="italic"
                  >
                    {b.era.shortName || b.era.name}
                  </text>
                )}
              </g>
            );
          })}

          {/* Year/month/day axis */}
          <line x1={LEFT_GUTTER} y1={TOP_GUTTER} x2={LEFT_GUTTER + chartWidth} y2={TOP_GUTTER} stroke="var(--border2)" strokeWidth={1} />
          {ticks.map((t, i) => (
            <g key={i}>
              <line
                x1={yearToX(t.value)} y1={TOP_GUTTER - 4}
                x2={yearToX(t.value)} y2={totalHeight - 10}
                stroke={t.major ? "var(--border2)" : "var(--border)"}
                strokeWidth={t.major ? 0.7 : 0.4}
                strokeDasharray={t.major ? "2 4" : "1 5"}
              />
              <text
                x={yearToX(t.value)} y={TOP_GUTTER - 8}
                fill={t.major ? "var(--text-dim)" : "var(--text-faint, var(--text-dim))"}
                fontSize={t.major ? 10 : 9}
                fontFamily="DM Sans, sans-serif"
                textAnchor="middle"
                opacity={t.major ? 1 : 0.75}
              >
                {t.label}
              </text>
            </g>
          ))}

          {/* Lanes */}
          {visibleTemplates.map((t, laneIdx) => {
            const laneY = laneOffsets[t.id];
            const actualLaneHeight = laneHeights[t.id] || LANE_HEIGHT;
            const laneEvents = eventsByTemplate[t.id] || [];
            const laneRows = rowsByLane[t.id] || [];
            return (
              <g key={t.id}>
                {/* Lane background (alternating subtle stripe) */}
                {laneIdx % 2 === 1 && (
                  <rect x={LEFT_GUTTER} y={laneY} width={chartWidth} height={actualLaneHeight} fill="rgba(255,255,255,0.012)" />
                )}
                {/* Lane label: as before when it fits, else a line to a tspan, centered on the lane (v1.7 r019) */}
                {(() => {
                  const full = `${t.icon || ""} ${t.name || ""}`;
                  const lines = titleLinesByLane[t.id] || [full];
                  if (lines.length === 1 && lines[0] === full) return (
                    <text x={LEFT_GUTTER - 10} y={laneY + actualLaneHeight / 2 + 4} fill={t.color} fontSize={13} fontFamily="DM Sans, sans-serif" textAnchor="end" style={{ fontVariantEmoji: "text" }}>
                      {t.icon} {t.name}
                    </text>
                  );
                  const firstY = laneY + actualLaneHeight / 2 + 4 - (lines.length - 1) * CHRONO_LAYOUT.TITLE_LINE / 2;
                  return (
                    <text x={LEFT_GUTTER - 10} y={firstY} fill={t.color} fontSize={13} fontFamily="DM Sans, sans-serif" textAnchor="end" style={{ fontVariantEmoji: "text" }}>
                      {lines.map((line, i) => (
                        <tspan key={i} x={LEFT_GUTTER - 10} dy={i === 0 ? 0 : CHRONO_LAYOUT.TITLE_LINE}>{line}</tspan>
                      ))}
                      {lines.some(line => line.endsWith("…")) && <title>{full}</title>}
                    </text>
                  );
                })()}
                {/* Events — clipped to chart area so they don't bleed into the gutter when the timeline is panned */}
                <g clipPath="url(#chrono-events-clip)">
                {laneEvents.map((ev, evIdx) => {
                  const subRow = laneRows[evIdx] || 0;
                  const cy = chronoRowY(laneY, subRow);
                  const isSelected = selectedKey === eventKey(ev);
                  const isDragging = dragState && dragState.eventKey === eventKey(ev);
                  // Drag preview: shift positions by dragState.deltaYears
                  const previewDelta = isDragging ? (dragState.deltaYears || 0) : 0;
                  const dragEdge = isDragging ? dragState.edge : null;
                  const evStartYr = ev.startYear + (dragEdge === "middle" || dragEdge === "start" || dragEdge === "point" ? previewDelta : 0);
                  const evEndYr = ev.endYear + (dragEdge === "middle" || dragEdge === "end" || dragEdge === "point" ? previewDelta : 0);
                  const x1 = yearToX(evStartYr);
                  const x2 = yearToX(evEndYr);
                  // Read-only events (synthesized marriage spans) keep the
                  // pointer cursor and skip drag-handle rendering even in edit
                  // mode — their underlying data isn't editable from here.
                  const evEditable = editMode && !ev.readOnly;
                  const editCursor = evEditable ? "ew-resize" : "pointer";
                  if (ev.kind === "point") {
                    const dispName = eventDisplayName(ev);
                    const nameWidth = measureText((ev.startApprox ? "~" : "") + dispName, 11);
                    return (
                      <g key={evIdx} className={`chrono-event ${isSelected ? "chrono-event-selected" : ""}`} onMouseDown={handleEventMouseDown(ev, "point")} style={{ cursor: editCursor }}>
                        {isSelected && <circle cx={x1} cy={cy} r={9} fill="none" stroke="var(--accent)" strokeWidth={2} />}
                        <circle cx={x1} cy={cy} r={5} fill={ev.templateColor} stroke="var(--bg)" strokeWidth={1.5} />
                        {(x2 - x1 < 40) && x1 + 8 + nameWidth <= LEFT_GUTTER + chartWidth && (
                          <text x={x1 + 8} y={cy + 3} fill="var(--text)" fontSize={11} fontFamily="DM Sans, sans-serif" style={{ pointerEvents: "none" }}>
                            {ev.startApprox ? "~" : ""}{dispName}
                          </text>
                        )}
                        <title>{dispName} — {formatCalendarDate(chronoFractionalYearToDate(ev.startYear, viewCalendar), viewCalendar)} ({ev.fieldLabel})</title>
                      </g>
                    );
                  }
                  // span
                  const w = Math.max(2, x2 - x1);
                  // Edge handle width — generous click target when in edit mode
                  const HANDLE = evEditable ? 6 : 0;
                  return (
                    <g key={evIdx} className={`chrono-event ${isSelected ? "chrono-event-selected" : ""}`} style={{ cursor: editCursor }}>
                      {isSelected && <rect x={x1 - 3} y={cy - 10} width={w + 6} height={20} fill="none" stroke="var(--accent)" strokeWidth={2} rx={3} />}
                      {/* Middle drag zone */}
                      <rect
                        x={x1 + HANDLE} y={cy - 7} width={Math.max(0, w - HANDLE * 2)} height={14}
                        fill={ev.templateColor} fillOpacity={0.65} stroke={ev.templateColor} strokeWidth={1} rx={2}
                        onMouseDown={handleEventMouseDown(ev, "middle")}
                      />
                      {evEditable && w > HANDLE * 2 && ev.range?.start?.year != null && (
                        <rect
                          x={x1} y={cy - 8} width={HANDLE} height={16}
                          fill="var(--accent)" fillOpacity={isSelected ? 0.85 : 0.45}
                          onMouseDown={handleEventMouseDown(ev, "start")}
                          style={{ cursor: "ew-resize" }}
                        />
                      )}
                      {evEditable && w > HANDLE * 2 && ev.range?.end?.year != null && (
                        <rect
                          x={x2 - HANDLE} y={cy - 8} width={HANDLE} height={16}
                          fill="var(--accent)" fillOpacity={isSelected ? 0.85 : 0.45}
                          onMouseDown={handleEventMouseDown(ev, "end")}
                          style={{ cursor: "ew-resize" }}
                        />
                      )}
                      {ev.openEnded && (
                        <text x={x2 + 2} y={cy + 4} fill={ev.templateColor} fontSize={12} fontFamily="DM Sans, sans-serif" style={{ pointerEvents: "none" }}>→</text>
                      )}
                      {ev.startApprox && (
                        <text x={x1 - 8} y={cy + 4} fill={ev.templateColor} fontSize={11} fontFamily="DM Sans, sans-serif" style={{ pointerEvents: "none" }}>~</text>
                      )}
                      {w > 50 && (() => {
                        const dispName = eventDisplayName(ev);
                        return (
                          <text x={x1 + 5} y={cy + 4} fill="var(--text-bright)" fontSize={11} fontFamily="DM Sans, sans-serif" style={{ pointerEvents: "none" }}>
                            {chronoSpanLabel(dispName, w)}
                          </text>
                        );
                      })()}
                      <title>
                        {eventDisplayName(ev)} ({ev.fieldLabel})
                        {"\n"}
                        {ev.range.start ? (ev.range.start.approximate ? "~" : "") + formatCalendarDate(chronoFractionalYearToDate(ev.startYear, viewCalendar), viewCalendar) : "?"}
                        {" → "}
                        {ev.range.end ? (ev.range.end.approximate ? "~" : "") + formatCalendarDate(chronoFractionalYearToDate(ev.endYear, viewCalendar), viewCalendar) : "ongoing"}
                      </title>
                    </g>
                  );
                })}
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="chrono-hint">
        {editMode
          ? "Edit mode · Click an event to select · Drag to move on the timeline · Use the panel below for precise input"
          : "Drag to pan · Ctrl+scroll to zoom around cursor · Click an event to open the entry"}
      </div>

      {editMode && selectedEvent && (
        <ChronoEditPanel
          key={eventKey(selectedEvent)}
          event={selectedEvent}
          calendar={getCalendar(state, selectedEvent.entryCalendarId)}
          onUpdate={(newValue) => onUpdateEntryDate(selectedEvent.entryId, selectedEvent.fieldId, selectedEvent.groupPath, newValue)}
          onOpenEntry={() => onOpenEntry(selectedEvent.entryId)}
          onClose={() => setSelectedKey(null)}
        />
      )}
    </div>
  );
}

// Selection panel for in-place date editing on the chronometric view.
// Renders different controls for point vs range. Numeric inputs commit on
// blur or Enter; +/− buttons commit immediately. Approximate (~) toggles
// commit on click.
function ChronoEditPanel({ event, calendar, onUpdate, onOpenEntry, onClose }) {
  const cal = calendar || DEFAULT_CALENDAR;
  const months = cal.months || [];
  const isPoint = event.kind === "point";

  // Local input state for the year/day fields. Commit-on-blur lets the user
  // type "147" without the timeline jumping to 14 → 147 mid-keystroke.
  const [localStart, setLocalStart] = useState({});  // {year, day}
  const [localEnd, setLocalEnd] = useState({});

  // Reset local typing state when the selected event changes (different
  // event) or when its values change from the outside (e.g. drag commit).
  useEffect(() => { setLocalStart({}); setLocalEnd({}); }, [
    event.entryId, event.fieldId, event.groupPath?.length,
    isPoint ? event.date?.year : event.range?.start?.year,
    isPoint ? event.date?.day : event.range?.start?.day,
    isPoint ? event.date?.monthIndex : event.range?.start?.monthIndex,
    isPoint ? null : event.range?.end?.year,
    isPoint ? null : event.range?.end?.day,
    isPoint ? null : event.range?.end?.monthIndex,
  ]);

  // Build the new value object after a single-side change.
  const applyPointChange = (patch) => {
    const next = { ...event.date, ...patch };
    // Clamp day to month length
    const monthLen = months[next.monthIndex]?.days || 30;
    if (next.day > monthLen) next.day = monthLen;
    if (next.day < 1) next.day = 1;
    onUpdate(next);
  };
  const applyRangeChange = (side, patch) => {
    const cur = event.range || {};
    const sideObj = cur[side] || { year: null, monthIndex: 0, day: 1 };
    const merged = { ...sideObj, ...patch };
    const monthLen = months[merged.monthIndex]?.days || 30;
    if (merged.day > monthLen) merged.day = monthLen;
    if (merged.day < 1) merged.day = 1;
    onUpdate({ ...cur, [side]: merged });
  };

  const renderDateRow = (label, dateObj, onChange, allowApproximate, allowClear) => {
    const cur = dateObj || { year: null, monthIndex: 0, day: 1 };
    const localBuf = label.includes("Start") ? localStart : (label.includes("End") ? localEnd : localStart);
    const setLocalBuf = label.includes("Start") ? setLocalStart : (label.includes("End") ? setLocalEnd : setLocalStart);
    const yearVal = localBuf.year !== undefined ? localBuf.year : (cur.year ?? "");
    const dayVal = localBuf.day !== undefined ? localBuf.day : (cur.day ?? 1);
    const monthLen = months[cur.monthIndex ?? 0]?.days || 30;
    const stepYear = (delta) => onChange({ year: (cur.year ?? 0) + delta });
    const stepDay = (delta) => onChange({ day: Math.max(1, Math.min(monthLen, (cur.day ?? 1) + delta)) });
    const commitYear = () => {
      if (localBuf.year === undefined) return;
      const v = localBuf.year === "" ? null : parseInt(localBuf.year, 10);
      setLocalBuf(b => ({ ...b, year: undefined }));
      if (v == null || isNaN(v)) return;
      onChange({ year: v });
    };
    const commitDay = () => {
      if (localBuf.day === undefined) return;
      const v = parseInt(localBuf.day, 10);
      setLocalBuf(b => ({ ...b, day: undefined }));
      if (isNaN(v)) return;
      onChange({ day: Math.max(1, Math.min(monthLen, v)) });
    };

    if (cur.year == null && allowClear) {
      // Open-ended side: render "(no end set)" and Add button as a single
      // visual unit. flex:1 on a wrapper instead of on the empty span keeps
      // the two pieces side by side rather than letting the empty span push
      // the button to the far edge of the panel where it's easy to miss.
      // Default year for Add: if the other side of the range has a year,
      // use that — gives the user a sensible starting point instead of
      // year 0. Falls back to 0 only when no other side exists (point edits
      // hit the inhabited branch above, so this only matters for ranges).
      const otherSide = label.toLowerCase().includes("end") ? event.range?.start : event.range?.end;
      const seedYear = otherSide?.year ?? 0;
      return (
        <div className="chrono-edit-row">
          <span className="chrono-edit-row-label">{label}</span>
          <div className="chrono-edit-row-empty-group">
            <span className="chrono-edit-row-empty">(no {label.toLowerCase().includes("end") ? "end" : "date"} set)</span>
            <button className="btn btn-ghost btn-small" onClick={() => onChange({ year: seedYear, monthIndex: 0, day: 1 })}>Add</button>
          </div>
        </div>
      );
    }

    return (
      <div className="chrono-edit-row">
        <span className="chrono-edit-row-label">{label}</span>
        <div className="chrono-edit-numgroup">
          <button className="chrono-edit-stepbtn" onClick={() => stepYear(-1)} title="Year −1">−</button>
          <input
            className="input chrono-edit-num"
            type="number"
            value={yearVal}
            onChange={e => setLocalBuf(b => ({ ...b, year: e.target.value }))}
            onBlur={commitYear}
            onKeyDown={e => { if (e.key === "Enter") { commitYear(); e.target.blur(); } }}
            placeholder="Year"
          />
          <button className="chrono-edit-stepbtn" onClick={() => stepYear(1)} title="Year +1">+</button>
        </div>
        <select
          className="input chrono-edit-month"
          value={cur.monthIndex ?? 0}
          onChange={e => onChange({ monthIndex: parseInt(e.target.value, 10) })}
        >
          {months.map((m, i) => <option key={i} value={i}>{m.name}</option>)}
        </select>
        <div className="chrono-edit-numgroup">
          <button className="chrono-edit-stepbtn" onClick={() => stepDay(-1)} title="Day −1">−</button>
          <input
            className="input chrono-edit-num"
            type="number"
            min={1}
            max={monthLen}
            value={dayVal}
            onChange={e => setLocalBuf(b => ({ ...b, day: e.target.value }))}
            onBlur={commitDay}
            onKeyDown={e => { if (e.key === "Enter") { commitDay(); e.target.blur(); } }}
          />
          <button className="chrono-edit-stepbtn" onClick={() => stepDay(1)} title="Day +1">+</button>
        </div>
        {allowApproximate && (
          <label className="chrono-edit-approx" title="Mark this date as approximate (renders with a ~ prefix)">
            <input type="checkbox" checked={!!cur.approximate} onChange={e => onChange({ approximate: e.target.checked })} />
            <span>~</span>
          </label>
        )}
        {allowClear && cur.year != null && (
          <button className="btn btn-ghost btn-small" onClick={() => onChange({ __clear: true })} title="Remove this side of the range (makes the timeline bar open-ended)">×</button>
        )}
      </div>
    );
  };

  // Wrapper for range to handle the __clear sentinel
  const onRangeSideChange = (side) => (patch) => {
    if (patch.__clear) {
      const cur = event.range || {};
      onUpdate({ ...cur, [side]: null });
      return;
    }
    applyRangeChange(side, patch);
  };

  return (
    <div className="chrono-edit-panel">
      <div className="chrono-edit-header">
        <div className="chrono-edit-title">
          <button className="chrono-edit-entrybtn" onClick={onOpenEntry} title="Open this entry">
            <span style={{ color: event.templateColor, fontVariantEmoji: "text" }}>{event.templateIcon}</span>
            <span className="chrono-edit-entryname">{event.entryName}</span>
          </button>
          <span className="chrono-edit-fieldlabel">{event.templateName} · {event.fieldLabel}{event.fieldSecret ? " · secret" : ""}</span>
        </div>
        <button className="chrono-edit-closebtn" onClick={onClose} title="Close panel (Esc)">×</button>
      </div>
      <div className="chrono-edit-body">
        {isPoint
          ? renderDateRow("Date", event.date, applyPointChange, true, false)
          : (
            <>
              {renderDateRow("Start", event.range?.start, onRangeSideChange("start"), true, true)}
              {renderDateRow("End", event.range?.end, onRangeSideChange("end"), true, true)}
            </>
          )
        }
      </div>
    </div>
  );
}