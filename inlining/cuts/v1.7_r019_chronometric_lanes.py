"""v1.7 r019: Chronometric's lanes make room by what's drawn, long titles wrap.

Drak's two calls at r018's plan, a lane with room enough for its events to
sit without overlapping and a lane title too long for its column wrapped with
its lane grown to fit, and his three at r019's (2026-10-26), one per message,
recorded in docs/fabula-spec.md section 8 before this cut (26c6dde): rows go
by what's drawn, a point's circle and its name and a span's bar and its
marks, so the next event in a row starts past them or takes a new row; a
title too long for its column wraps at its slashes, as many whole parts to a
line as fit, and inside a part only when the part alone is too wide; and a
fractional year step, which only 1.6 can be, rounds up to 2. Claude's
defaults for the rest are in the same section.

- 19_chronometric, the Chronometric math: CHRONO_LAYOUT gains a title line
  (16), a title's room (124), and the gap after an event (4); chronoTicks
  rounds the year step up to a whole year; chronoSpanLabel cuts a span's name
  to its bar, as the view did inline; chronoEventExtent says where an
  event's drawing starts and ends; chronoStackRows stacks extents in pixels
  where it stacked years; chronoTitleLines breaks a title into lines; and
  chronoLaneLayout makes a lane as tall as its title needs.
- 19_chronometric, the view: text is measured on a canvas in the chart's
  fonts, again when the page's fonts finish loading; each lane's rows come
  from its events' drawn extents, taken in the order their drawings start,
  and its title's lines from chronoTitleLines; a title that fits draws as
  before, and one that wraps draws a line to a tspan, centered on the lane,
  with the full title on hover when a word was cut short; a point's name is
  drawn when it fits before the chart's right edge.

Declared scope: 19_chronometric.
Declarations added: chronoSpanLabel, chronoEventExtent, chronoTitleLines.

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given). Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r019_chronometric_lanes.py
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


edit(MODULES / "19_chronometric.jsx", [
    # ------------------------------------------------ the section's head
    (r"""// none reads state, React, or the page. The expressions moved as they were,
// so Chronometric draws a world as it did before: tools/chrono-parity
// compares its drawing with the last passed build's, step by step.

// The chart's four sizes, in pixels: the lane-title column, the axis and era
// band above the lanes, a lane's least height, and a sub-row's height.
const CHRONO_LAYOUT = {
  LEFT_GUTTER: 140, // template label column
  TOP_GUTTER: 50,   // year axis + era band
  LANE_HEIGHT: 56,
  ROW_HEIGHT: 24,   // sub-row height for stacking events within a lane
};""",
     r"""// none reads state, React, or the page. The expressions moved as they were,
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
};"""),

    # ------------------------------------------------ whole-year ticks
    (r"""    while (range / step < targetTicks / 2) step /= 2;
    if (step < 1) step = 1;""",
     r"""    while (range / step < targetTicks / 2) step /= 2;
    if (step < 1) step = 1;
    step = Math.ceil(step); // whole years only: a step of 1.6, the one fraction the doubling reaches, becomes 2 (v1.7 r019)"""),

    # ------------------------------------------------ stacking by drawn extents
    (r"""// A lane's events, sorted by start, stacked into sub-rows: each takes the
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
};""",
     r"""// A span's name as its bar draws it: cut short with an ellipsis where it
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
// measures a line. A title that fits is one line.
const chronoTitleLines = (title, widthOf, maxWidth) => {
  if (widthOf(title) <= maxWidth) return [title];
  const words = [];
  title.split(" ").forEach((word, i) => {
    if (words.length && (word === "/" || i === 1)) words[words.length - 1] += " " + word;
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
};"""),

    # ------------------------------------------------ lanes as tall as their titles
    (r"""// The lanes, in order, from their rows: each lane's height (its rows and
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
  });""",
     r"""// The lanes, in order, from their rows and their titles' line counts: each
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
  });"""),

    # ------------------------------------------------ the view: measuring text
    (r"""  const { LEFT_GUTTER, TOP_GUTTER, LANE_HEIGHT } = CHRONO_LAYOUT;
  const chartWidth = chronoChartWidth(containerWidth);""",
     r"""  // Text widths for the lanes' layout (v1.7 r019), measured on a canvas in
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
  const chartWidth = chronoChartWidth(containerWidth);"""),

    # ------------------------------------------------ the view: rows by drawn extents
    (r"""  // Stack overlapping events within each lane into sub-rows: a lane's rows,
  // index for index with its sorted events
  const rowsByLane = useMemo(() => {
    const rows = {};
    Object.keys(eventsByTemplate).forEach(id => { rows[id] = chronoStackRows(eventsByTemplate[id], yearsPerPx); });
    return rows;
  }, [eventsByTemplate, yearsPerPx]);""",
     r"""  // Stack overlapping events within each lane into sub-rows by what each
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
  }, [visibleTemplates.map(t => `${t.id}|${t.icon}|${t.name}`).join("\n"), measureText]);"""),
    (r"""  const laneLayout = useMemo(
    () => chronoLaneLayout(visibleTemplates.map(t => t.id), rowsByLane),
    [visibleTemplates.map(t => t.id).join(","), rowsByLane]
  );""",
     r"""  const laneLayout = useMemo(
    () => chronoLaneLayout(visibleTemplates.map(t => t.id), rowsByLane,
      Object.fromEntries(Object.entries(titleLinesByLane).map(([id, ls]) => [id, ls.length]))),
    [visibleTemplates.map(t => t.id).join(","), rowsByLane, titleLinesByLane]
  );"""),

    # ------------------------------------------------ the view: drawing a wrapped title
    (r"""                {/* Lane label */}
                <text x={LEFT_GUTTER - 10} y={laneY + actualLaneHeight / 2 + 4} fill={t.color} fontSize={13} fontFamily="DM Sans, sans-serif" textAnchor="end" style={{ fontVariantEmoji: "text" }}>
                  {t.icon} {t.name}
                </text>""",
     r"""                {/* Lane label: as before when it fits, else a line to a tspan, centered on the lane (v1.7 r019) */}
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
                })()}"""),

    # ------------------------------------------------ the view: a point's name at the right edge
    (r"""                    const dispName = eventDisplayName(ev);
                    return (
                      <g key={evIdx} className={`chrono-event ${isSelected ? "chrono-event-selected" : ""}`} onMouseDown={handleEventMouseDown(ev, "point")} style={{ cursor: editCursor }}>""",
     r"""                    const dispName = eventDisplayName(ev);
                    const nameWidth = measureText((ev.startApprox ? "~" : "") + dispName, 11);
                    return (
                      <g key={evIdx} className={`chrono-event ${isSelected ? "chrono-event-selected" : ""}`} onMouseDown={handleEventMouseDown(ev, "point")} style={{ cursor: editCursor }}>"""),
    (r"""                        {(x2 - x1 < 40) && chartWidth - x1 > 80 && (""",
     r"""                        {(x2 - x1 < 40) && x1 + 8 + nameWidth <= LEFT_GUTTER + chartWidth && ("""),

    # ------------------------------------------------ the view: a span's name through the helper
    (r"""                            {dispName.length > Math.floor(w / 7) ? dispName.substring(0, Math.floor(w / 7) - 1) + "…" : dispName}""",
     r"""                            {chronoSpanLabel(dispName, w)}"""),
])
print("v1.7 r019 applied: 19_chronometric")
