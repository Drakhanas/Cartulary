"""r039: vector freehand (Cartographia+ cut 9, the first of the brush amendment).

A ninth tool, Freehand: press and drag to draw a line, sampled at a minimum
spacing in canvas units, simplified on release (Douglas-Peucker) and committed
as an ordinary `stroke` shape with Smooth on, so the renderer, the HTML
export, and the downloads need nothing. The stroke lands unselected and the
tool stays Freehand; right-click goes to Select as the other drawing tools do.
In Select, a polygon or line with more than forty points has no per-point
handles (move, restyle, Smooth, Delete, undo still apply). Esc during a drag
discards it.

Decided at the fork (Drak, 2026-10-22): every recommendation. Its own tool
button; sampling and tolerance in canvas units scaled by the canvas width (4
and 4 units at 1600 wide; the fork said 2 for the tolerance, and the probe's
hand-like coastline kept 113 points at 2, 2 being under a screen pixel of
jitter), the tolerance raised until a stroke is under 400 points; lands unselected; handles up to forty points; Smooth forced on at
creation.

Revised on Drak's pass (2026-10-22): line width is a slider, 1 to 32 units
with the value in a number field beside it (the data accepts 1 to 64, so a
pack or a hand edit can go wider), in place of the three fixed widths; the
normalizer clamps instead of snapping to the set, so 2, 4, and 8 in existing
files are untouched. `MAP_STROKE_WIDTHS` retires, `MAP_STROKE_WIDTH_RANGE`
replaces it.

Declared scope: 16_trunk (+MAP_FREEHAND, +mapSimplifyPoints,
+MAP_STROKE_WIDTH_RANGE, -MAP_STROKE_WIDTHS), shell.html.

String-anchored edits; every anchor must occur exactly once. Run from the
repository root against the r038 tree: python3 inlining/cuts/r039_freehand.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
MOD = ROOT / "cartulary-src" / "modules"
SHELL = ROOT / "cartulary-src" / "shell.html"


def edit(path, pairs):
    s = path.read_text(encoding="utf-8")
    for old, new in pairs:
        c = s.count(old)
        assert c == 1, f"{path.name}: anchor occurs {c} times: {old[:80]!r}"
        s = s.replace(old, new)
    path.write_text(s, encoding="utf-8")


edit(MOD / "16_trunk.jsx", [
    # line width: a range, not a set (Drak's pass at r039)
    ("""const MAP_STROKE_WIDTHS = [2, 4, 8];        // viewBox units""",
     """const MAP_STROKE_WIDTH_RANGE = { min: 1, max: 32, limit: 64 };   // viewBox units; the slider's range, and the widest the data accepts"""),
    ("""    strokeWidth: pick(s.strokeWidth, MAP_STROKE_WIDTHS, 4),""",
     """    strokeWidth: Math.max(MAP_STROKE_WIDTH_RANGE.min, Math.min(MAP_STROKE_WIDTH_RANGE.limit, Math.round(num(s.strokeWidth, 4)))),"""),
    # the strip: a slider and a number field in place of the three buttons
    ("""          {showWidth && <><span className="map-tools-label">Width</span>
          {MAP_STROKE_WIDTHS.map(w => (
            <button key={w} type="button" className={`btn btn-small ${current.strokeWidth === w ? "btn-accent" : "btn-ghost"}`} onClick={() => applyStyle({ strokeWidth: w })}>{w}</button>
          ))}</>}""",
     """          {showWidth && (
            <>
              <span className="map-tools-label">Width</span>
              <input
                className="map-tools-range"
                type="range"
                min={MAP_STROKE_WIDTH_RANGE.min} max={MAP_STROKE_WIDTH_RANGE.max} step="1"
                value={Math.min(MAP_STROKE_WIDTH_RANGE.max, current.strokeWidth)}
                onChange={e => applyStyle({ strokeWidth: parseInt(e.target.value, 10) || MAP_STROKE_WIDTH_RANGE.min }, "width")}
                title="Line width, in drawing units"
              />
              <input
                className="input map-tools-num"
                type="number"
                min={MAP_STROKE_WIDTH_RANGE.min} max={MAP_STROKE_WIDTH_RANGE.limit} step="1"
                value={current.strokeWidth}
                onChange={e => { const v = parseInt(e.target.value, 10); if (Number.isFinite(v)) applyStyle({ strokeWidth: Math.max(MAP_STROKE_WIDTH_RANGE.min, Math.min(MAP_STROKE_WIDTH_RANGE.limit, v)) }, "width"); }}
                onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") e.target.blur(); }}
                title="Line width, 1 to 64"
              />
            </>
          )}"""),
    # applyStyle takes a coalescing key, so a slider drag is one undo step
    ("""  const applyStyle = (patch) => {
    setStyle(st => ({ ...st, ...patch }));
    if (selectedShape) updateShape(selectedShape.id, patch);
  };""",
     """  const applyStyle = (patch, coalesceKey) => {
    setStyle(st => ({ ...st, ...patch }));
    if (selectedShape) updateShape(selectedShape.id, patch, coalesceKey ? { coalesce: `${coalesceKey}-${selectedShape.id}` } : undefined);
  };"""),
    # the tool, between Line and Text
    ("""  { id: "stroke",  label: "Line",    hint: "Click to place the points of an open line · Double-click, Enter, or right-click finishes it · Esc discards" },
  { id: "text",    label: "Text",    hint: "Click on the map to place a label · Edit it, its size, its angle, and its arc in the strip · Right-click when done" },""",
     """  { id: "stroke",  label: "Line",    hint: "Click to place the points of an open line · Double-click, Enter, or right-click finishes it · Esc discards" },
  { id: "freehand", label: "Freehand", hint: "Drag on the map to draw a line freehand · Esc while dragging discards it · Right-click when done" },
  { id: "text",    label: "Text",    hint: "Click on the map to place a label · Edit it, its size, its angle, and its arc in the strip · Right-click when done" },"""),
    # the constants and the simplifier, after the presets
    ("""// Shift a normalized shape by (dx, dy) viewBox units, rounded to two decimals
// so stored coordinates stay short.
function translateMapShape(s, dx, dy) {""",
     """// Freehand: a new point every `spacing` of the canvas width while dragging
// (4 units at 1600 wide), Douglas-Peucker on release at `tolerance` of the
// width (4 units at 1600, about two screen pixels at the default width, which
// is where hand jitter lives), the tolerance raised by half until the stroke is
// under `maxPoints`; a polygon or line with more than `handleCap` points has
// no per-point handles in Select. All in canvas units, so the result does not
// depend on zoom.
const MAP_FREEHAND = { spacing: 1 / 400, tolerance: 1 / 400, maxPoints: 400, handleCap: 40 };

// Douglas-Peucker, iterative. Consecutive duplicates are dropped first; the
// ends always survive. Points are [x, y] pairs in canvas units.
function mapSimplifyPoints(points, tolerance) {
  const pts = [];
  points.forEach(p => { const last = pts[pts.length - 1]; if (!last || last[0] !== p[0] || last[1] !== p[1]) pts.push(p); });
  if (pts.length <= 2) return pts;
  const keep = new Array(pts.length).fill(false);
  keep[0] = true; keep[pts.length - 1] = true;
  const stack = [[0, pts.length - 1]];
  const tol2 = tolerance * tolerance;
  while (stack.length) {
    const [a, b] = stack.pop();
    if (b - a < 2) continue;
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let best = -1, bestD = 0;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = pts[i];
      let d2;
      if (len2 === 0) {
        d2 = (px - ax) * (px - ax) + (py - ay) * (py - ay);
      } else {
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
        const qx = ax + t * dx, qy = ay + t * dy;
        d2 = (px - qx) * (px - qx) + (py - qy) * (py - qy);
      }
      if (d2 > bestD) { bestD = d2; best = i; }
    }
    if (best >= 0 && bestD > tol2) { keep[best] = true; stack.push([a, best], [best, b]); }
  }
  return pts.filter((p, i) => keep[i]);
}

// Shift a normalized shape by (dx, dy) viewBox units, rounded to two decimals
// so stored coordinates stay short.
function translateMapShape(s, dx, dy) {"""),
    # finishDraft commits a freehand draft as a simplified stroke, Smooth on
    ("""  const finishDraft = (pointsOverride) => {
    if (!draft) return null;
    let id = null;
    if (draft.type === "polygon" || draft.type === "stroke") {""",
     """  const finishDraft = (pointsOverride) => {
    if (!draft) return null;
    let id = null;
    if (draft.type === "freehand") {
      let tol = MAP_FREEHAND.tolerance * width;
      let pts = mapSimplifyPoints(draft.points, tol);
      while (pts.length > MAP_FREEHAND.maxPoints) { tol *= 1.5; pts = mapSimplifyPoints(draft.points, tol); }
      if (pts.length >= 2) {
        id = addShape({ type: "stroke", points: pts.map(p => [r2(p[0]), r2(p[1])]), fill: null, stroke: style.stroke, strokeWidth: style.strokeWidth, smooth: true });
      }
      setDraft(null);
      setCursor(null);
      return id;
    }
    if (draft.type === "polygon" || draft.type === "stroke") {"""),
    # mousedown starts the drag
    ("""    if (tool === "rect" || tool === "ellipse" || tool === "stamp") {
      if (!targetLayer) return;
      e.preventDefault();
      setDraft({ type: tool, x0: p[0], y0: p[1], x1: p[0], y1: p[1] });
      return;
    }
    if (tool === "select") {""",
     """    if (tool === "rect" || tool === "ellipse" || tool === "stamp") {
      if (!targetLayer) return;
      e.preventDefault();
      setDraft({ type: tool, x0: p[0], y0: p[1], x1: p[0], y1: p[1] });
      return;
    }
    if (tool === "freehand") {
      if (!targetLayer) return;
      e.preventDefault();
      setDraft({ type: "freehand", points: [p] });
      return;
    }
    if (tool === "select") {"""),
    # the drag itself: window listeners, a point per `spacing`, commit on release
    ("""  // Press-drag-release for rect, ellipse, and stamp: window listeners so a
  // drag that leaves the canvas still ends cleanly.""",
     """  // Freehand: window listeners so a drag that leaves the canvas still ends
  // cleanly (toPoint clamps to the edge). A point is taken when the cursor
  // has moved `spacing` of the width since the last one; release commits the
  // simplified stroke through finishDraft and the tool stays Freehand.
  useEffect(() => {
    if (!draft || draft.type !== "freehand") return;
    const minGap = MAP_FREEHAND.spacing * width;
    const move = (e) => {
      const p = toPoint(e);
      if (!p) return;
      setDraft(d => {
        if (!d || d.type !== "freehand") return d;
        const last = d.points[d.points.length - 1];
        if (Math.hypot(p[0] - last[0], p[1] - last[1]) < minGap) return d;
        return { ...d, points: [...d.points, p] };
      });
    };
    const up = () => { finishDraft(); };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [draft]);

  // Press-drag-release for rect, ellipse, and stamp: window listeners so a
  // drag that leaves the canvas still ends cleanly."""),
    # the overlay: a freehand draft is its trail alone, no vertex marks
    ("""  } else if (draft) {
    const pts = draft.points;
    const trail = cursor ? [...pts, cursor] : pts;""",
     """  } else if (draft && draft.type === "freehand") {
    items.push(<polyline key="draft" points={draft.points.map(p => `${f(p[0])},${f(p[1])}`).join(" ")} fill="none" stroke={style.stroke || MAP_PALETTE[0].hex} strokeWidth={style.strokeWidth} strokeLinejoin="round" strokeLinecap="round" opacity={0.7} />);
  } else if (draft) {
    const pts = draft.points;
    const trail = cursor ? [...pts, cursor] : pts;"""),
    # Select: no point handles past the cap
    ("""  if (selectMode && selectedShape && Array.isArray(selectedShape.points)) {
    // A visible dot, then its hit target on top: a transparent disk (the""",
     """  if (selectMode && selectedShape && Array.isArray(selectedShape.points) && selectedShape.points.length <= MAP_FREEHAND.handleCap) {
    // A visible dot, then its hit target on top: a transparent disk (the"""),
    # the strip: a freehand line has no fill, and has Smooth
    ("""  const showFill = kind !== "stroke";
  const showSmooth = kind === "rect" || kind === "polygon" || kind === "stroke";""",
     """  const showFill = kind !== "stroke" && kind !== "freehand";
  const showSmooth = kind === "rect" || kind === "polygon" || kind === "stroke" || kind === "freehand";"""),
])

edit(SHELL, [
    (""".map-canvas.tool-rect,.map-canvas.tool-ellipse,.map-canvas.tool-polygon,.map-canvas.tool-stroke{cursor:crosshair}""",
     """.map-canvas.tool-rect,.map-canvas.tool-ellipse,.map-canvas.tool-polygon,.map-canvas.tool-stroke,.map-canvas.tool-freehand{cursor:crosshair}"""),
])

print("r039 applied")
