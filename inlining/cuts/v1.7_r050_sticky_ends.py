"""
v1.7 r050: Sticky line ends on maps, the pin-id fix first, Pipes' twelfth
cut.

docs/pipes-spec.md, section 8, with the three details Drak settled at the
cut (2026-10-31, one per message: a, a, a), the three section 13 left for
r050:

1. A line stuck to a pin that isn't shown, which time mode can hide in the
   map view and in an HTML export taken at a moment, and which the SVG and
   PNG downloads never draw: the end stays at the pin's point whether the
   pin shows or not, so a line is the same in every view and file.
2. A line stuck to a stamp that isn't drawn, on a hidden layer or with its
   symbol missing: the end keeps to the stamp's box while it isn't drawn, as
   a hidden pin's does. Either way nothing new sticks to a stamp on a
   hidden layer.
3. A long freehand line, which had no point handles past 40 points:
   Freehand's ends stay free when drawn, as Tabula's do, and a line past 40
   points shows handles at its two ends only, so they stick and come free
   by a drag in Select. Tabula's handles are unchanged.

With them, Claude's defaults, said in the plan and not stopped: a new pin's
id takes genId()'s random part, as a shape's does, and a load gives a pin
whose id an earlier pin has, or that has none, a new one; a map line carries
`anchors: { start, end }`, a pin's id or a stamp's shape id each, null where
the end is free, and none at all where both are, so a map saved before r050
loads and saves as it was; ensureMapShape keeps it, and ensureMapData clears
an anchor naming neither a pin nor a stamp of the map, the end keeping the
point it was put down at; buildMapDrawingTree takes the pins and draws each
stuck end through tabulaDrawnPoints, a pin a box of no size at its point on
the canvas drawn, a stamp its box turned by its rotation, which
tabulaAttachPoint learns (no card has one, so Tabula draws as before); every
place a map is drawn passes the pins: the editor's canvas and its Select
overlay, the map view, the SVG and PNG downloads, the world's HTML export,
and the bucket fill's trace; the Line tool's first and last points and an
end dragged in Select stick to the topmost pin whose marker, grown by six
screen pixels, holds the pointer, else the topmost stamp on a shown layer,
locked or not, whose turned box, grown the same, holds it, the end jumping
there while the pointer is over one; off one, a dragged end comes free; a
line moved or nudged whole keeps its stuck ends; Delete Pin, deleting a
stamp, and deleting a layer that holds stamps free the ends stuck to them
where they're drawn, in the same step as the delete; the Line and Select
hints and the canvas-size warning say so.

- 18_cartographia/00_model: the pin ids and the anchors at load, the boxes
  an end sticks to, a line's drawn points, and the ends a delete frees.
- 18_cartographia/01_renderer: the tree drawing a stuck end where it's
  stuck.
- 18_cartographia/02_tools: sticking, in the Line tool and a point drag;
  freeing, in a stamp's and a layer's delete; the overlay at the drawn
  points, with a long line's end handles; the fill's trace; the hints.
- 18_cartographia/03_view: the pin id, a pin's marker found by its id, the
  pins passed to the view, the editor, and the download, Delete Pin freeing
  its ends, the canvas-size warning.
- 08_export-layer: the HTML export's map drawn with its pins.
- 21_stemma/05_tabula-drawing: tabulaAttachPoint turning a box.

Declared scope: 08_export-layer, 18_cartographia/00_model,
18_cartographia/01_renderer, 18_cartographia/02_tools,
18_cartographia/03_view, 21_stemma/05_tabula-drawing.
Declarations added: MAP_STICK, mapWithAnchors, mapCheckAnchors,
mapAnchorBoxes, mapDrawnPoints, mapFreeEnds. None removed. No header added.

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given), and nothing is written unless every anchor in
every file holds. Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r050_sticky_ends.py
"""
from pathlib import Path

ROOT = next(p for p in Path(__file__).resolve().parents if (p / 'cartulary-src').is_dir())
MODULES = ROOT / "cartulary-src" / "modules"

PLAN = []


def B(s):
    """A block written with its opening newline, which isn't part of it."""
    return s[1:] if s.startswith("\n") else s


def edit(path, steps):
    PLAN.append((path, steps))


# --------------------------------------------------- 18_cartographia/00_model
MODEL_AFTER = B(r'''

// Sticky line ends (v1.7 r050). A line's first and last points may stick to a
// pin or a stamp (`anchors`, in ensureMapShape) and are drawn from it from
// then on, through Tabula's tabulaDrawnPoints, so they follow it however it
// moves; the points kept are where the ends were put down, for the day it
// goes. Nothing is written when a pin or a stamp moves.

// A line with its anchors set to `a`, or with none where both ends are free.
function mapWithAnchors(s, a) {
  const out = { ...s };
  delete out.anchors;
  if (a && (a.start || a.end)) out.anchors = { start: a.start || null, end: a.end || null };
  return out;
}

// A drawing's anchors checked against the map's pins (their ids, `pinIds`)
// and the drawing's stamps, on any layer: an anchor naming neither clears,
// its end keeping the point it was put down at. A drawing nothing changed in
// comes back as it was.
function mapCheckAnchors(drawing, pinIds) {
  const ids = new Set(pinIds);
  drawing.layers.forEach(l => l.shapes.forEach(s => { if (s.type === "stamp") ids.add(s.id); }));
  let changed = false;
  const layers = drawing.layers.map(l => {
    let touched = false;
    const shapes = l.shapes.map(s => {
      if (!s.anchors) return s;
      const a = { start: ids.has(s.anchors.start) ? s.anchors.start : null, end: ids.has(s.anchors.end) ? s.anchors.end : null };
      if (a.start === s.anchors.start && a.end === s.anchors.end) return s;
      touched = true;
      return mapWithAnchors(s, a);
    });
    if (!touched) return l;
    changed = true;
    return { ...l, shapes };
  });
  return changed ? { ...drawing, layers } : drawing;
}

// What a line's ends stick to, by id, in canvas units, as tabulaDrawnPoints
// takes them: a pin a box of no size at its point on the canvas being drawn
// (`width` by `height`, which its fractions are of), a stamp its box and its
// rotation, on any layer. A pin time mode hides or a download leaves out,
// and a stamp on a hidden layer or with its symbol missing, are here all the
// same (Drak's calls 1 and 2 at r050), so a line is drawn alike in every
// view and file.
function mapAnchorBoxes(drawing, pins, width, height) {
  const boxes = Object.create(null);
  (Array.isArray(pins) ? pins : []).forEach(p => {
    if (p && typeof p.id === "string" && !(p.id in boxes) && Number.isFinite(p.x) && Number.isFinite(p.y)) boxes[p.id] = { x: p.x * width, y: p.y * height, w: 0, h: 0 };
  });
  ((drawing && drawing.layers) || []).forEach(l => (l.shapes || []).forEach(s => {
    if (s && s.type === "stamp" && !(s.id in boxes)) boxes[s.id] = { x: s.x, y: s.y, w: s.w, h: s.h, rotation: s.rotation || 0 };
  }));
  return boxes;
}

// A line's points as drawn, its stuck ends worked out from `boxes`; any
// other shape's, or a line with no anchors, as stored.
function mapDrawnPoints(s, boxes) {
  if (!s || s.type !== "stroke" || !s.anchors || !Array.isArray(s.points) || s.points.length < 2) return s ? s.points : null;
  return tabulaDrawnPoints(s, boxes, null);
}

// The ends stuck to `ids` freed where they're drawn now, for a delete that
// takes those pins or stamps away, in the same step: each such end keeps its
// drawn point, rounded as a point is stored, and loses its anchor. The
// layers come back as they were where nothing is stuck to any of them.
function mapFreeEnds(layers, ids, boxes) {
  const gone = new Set(ids);
  const r = (v) => Math.round(v * 100) / 100;
  const held = (s) => !!s.anchors && (gone.has(s.anchors.start) || gone.has(s.anchors.end));
  if (!layers.some(l => (l.shapes || []).some(held))) return layers;
  return layers.map(l => (!(l.shapes || []).some(held) ? l : { ...l, shapes: l.shapes.map(s => {
    if (!held(s)) return s;
    const drawn = mapDrawnPoints(s, boxes);
    const points = s.points.slice();
    const a = { start: s.anchors.start, end: s.anchors.end };
    if (gone.has(a.start)) { points[0] = [r(drawn[0][0]), r(drawn[0][1])]; a.start = null; }
    if (gone.has(a.end)) { const k = points.length - 1; points[k] = [r(drawn[k][0]), r(drawn[k][1])]; a.end = null; }
    return mapWithAnchors({ ...s, points }, a);
  }) }));
}
''')

edit(MODULES / "18_cartographia" / "00_model.jsx", [
    (B('''
  if (type === "stroke") {
    // the heads (v1.7 r032): none, one at the end, or one at each end
    out.arrow = pick(s.arrow, ["none", "end", "both"], "none");
  }
'''), B('''
  if (type === "stroke") {
    // the heads (v1.7 r032): none, one at the end, or one at each end
    out.arrow = pick(s.arrow, ["none", "end", "both"], "none");
    // the ends (v1.7 r050): what each sticks to, a pin's id or a stamp's
    // shape id, null where it's free; a line with both ends free carries
    // none, so one saved before r050 round-trips unchanged
    const a = s.anchors && typeof s.anchors === "object" ? s.anchors : {};
    const idOf = (v) => (typeof v === "string" && v ? v : null);
    if (idOf(a.start) || idOf(a.end)) out.anchors = { start: idOf(a.start), end: idOf(a.end) };
  }
''')),
    (B('''
// mapData as every consumer may assume it: image (string or null, as the r001
// migration kept it), pins (array, untouched here), drawing (normalized).
function ensureMapData(md) {
  const src = (md && typeof md === "object") ? md : {};
  return {
    image: typeof src.image === "string" ? src.image : null,
    pins: Array.isArray(src.pins) ? src.pins : [],
    drawing: ensureDrawingShape(src.drawing),
  };
}
'''), B('''
// mapData as every consumer may assume it: image (string or null, as the r001
// migration kept it), pins (array), drawing (normalized). A pin passes
// through as it is, except that since v1.7 r050 one whose id an earlier pin
// has, or that has none, gets a new one, the random part of genId() as a
// shape's, so two pins placed within a second of each other before r050
// come apart; and a line's anchors are kept only where they name a pin or a
// stamp of this map (mapCheckAnchors).
function ensureMapData(md) {
  const src = (md && typeof md === "object") ? md : {};
  const given = Array.isArray(src.pins) ? src.pins : [];
  const seen = new Set();
  let renamed = false;
  const pins = given.map(p => {
    if (!p || typeof p !== "object") return p;
    if (typeof p.id === "string" && p.id && !seen.has(p.id)) { seen.add(p.id); return p; }
    let id = `pin-${genId().slice(-6)}`;
    while (seen.has(id)) id = `pin-${genId().slice(-6)}`;
    seen.add(id);
    renamed = true;
    return { ...p, id };
  });
  return {
    image: typeof src.image === "string" ? src.image : null,
    pins: renamed ? pins : given,
    drawing: mapCheckAnchors(ensureDrawingShape(src.drawing), seen),
  };
}
''')),
    (B('''
function makeDefaultMapData() {
  return ensureMapData(null);
}
'''), B('''
function makeDefaultMapData() {
  return ensureMapData(null);
}
''') + MODEL_AFTER),
])


# ------------------------------------------------ 18_cartographia/01_renderer
edit(MODULES / "18_cartographia" / "01_renderer.jsx", [
    (B('''
// opts: { id, className, label, imageHref, imageWidth, imageHeight, stamps,
// placeholder, layerImages }. stamps is the world's imported stamps
// (state.mapStamps), which the built-ins come before; placeholder is the
// editor's, see mapShapeNode; layerImages maps a raster layer's filename to
// the url that draws it (a data URL draws as it is), and a raster layer with
// no url is left out (r043).
'''), B('''
// opts: { id, className, label, imageHref, imageWidth, imageHeight, stamps,
// placeholder, layerImages, pins }. stamps is the world's imported stamps
// (state.mapStamps), which the built-ins come before; placeholder is the
// editor's, see mapShapeNode; layerImages maps a raster layer's filename to
// the url that draws it (a data URL draws as it is), and a raster layer with
// no url is left out (r043); pins are the map's, every one whether it's
// shown or not, and a line's stuck ends are drawn from them and from the
// stamps (v1.7 r050, mapAnchorBoxes); without them an end stuck to a pin is
// drawn where it was put down.
''')),
    (B('''
  const ctx = { idBase, defs, stampsUsed: new Map(), tints: new Map(), stamps: Array.isArray(o.stamps) ? o.stamps : [], placeholder: !!o.placeholder };
'''), B('''
  const ctx = { idBase, defs, stampsUsed: new Map(), tints: new Map(), stamps: Array.isArray(o.stamps) ? o.stamps : [], placeholder: !!o.placeholder };
  const boxes = mapAnchorBoxes(d, o.pins, width, height); // what a line's stuck ends are drawn from (r050)
''')),
    ('''    children.push({ tag: "g", attrs: { "data-layer": layer.id }, children: layer.shapes.map(s => mapShapeNode(s, ctx)).filter(Boolean) });''',
     '''    children.push({ tag: "g", attrs: { "data-layer": layer.id }, children: layer.shapes.map(s => mapShapeNode(s.anchors ? { ...s, points: mapDrawnPoints(s, boxes) } : s, ctx)).filter(Boolean) });'''),
])


# --------------------------------------------------- 18_cartographia/02_tools
edit(MODULES / "18_cartographia" / "02_tools.jsx", [
    ('''hint: "Click a shape to select it · Drag to move · Corners and points reshape it, the knob turns it · Arrows nudge it · Delete removes it · Right-click returns to Pin" },''',
     '''hint: "Click a shape to select it · Drag to move · Corners and points reshape it, the knob turns it · A line's end dropped on a pin or a stamp sticks to it, off one it comes free · Arrows nudge it · Delete removes it · Right-click returns to Pin" },'''),
    ('''hint: "Click to place the points of an open line · Done in the strip, a double-click, Enter, or right-click finishes it · Esc discards · Arrowheads in the strip" },''',
     '''hint: "Click to place the points of an open line · An end put down on a pin or a stamp sticks to it and follows it · Done in the strip, a double-click, Enter, or right-click finishes it · Esc discards · Arrowheads in the strip" },'''),
    (B('''
// under `maxPoints`; a polygon or line with more than `handleCap` points has
// no per-point handles in Select. All in canvas units, so the result does not
// depend on zoom.
const MAP_FREEHAND = { spacing: 1 / 400, tolerance: 1 / 400, maxPoints: 400, handleCap: 40 };
'''), B('''
// under `maxPoints`; a polygon with more than `handleCap` points has no
// point handles in the map's Select, and a line past it has handles at its
// two ends only (v1.7 r050, Drak's call 3), so its ends can still be stuck
// and freed. All in canvas units, so the result does not depend on zoom.
const MAP_FREEHAND = { spacing: 1 / 400, tolerance: 1 / 400, maxPoints: 400, handleCap: 40 };
// A line's end put down within this many screen pixels of a pin's marker or
// a stamp's box sticks to it (v1.7 r050), the reach Tabula gives a card.
const MAP_STICK = 6;
''')),
    (B('''
  const [cursor, setCursor] = useState(null);   // [x, y] while a polygon or line is in progress
'''), B('''
  const [cursor, setCursor] = useState(null);   // [x, y] while a polygon or line is in progress
  const [stick, setStick] = useState(null);     // the pin or stamp a line's pending point is over (r050), or null
''')),
    (B('''
  const unitsPerPx = () => {
    const el = svgRef.current;
    const rect = el ? el.getBoundingClientRect() : null;
    return rect && rect.width ? getV().w / rect.width : 1;
  };
'''), B('''
  const unitsPerPx = () => {
    const el = svgRef.current;
    const rect = el ? el.getBoundingClientRect() : null;
    return rect && rect.width ? getV().w / rect.width : 1;
  };

  // Sticky line ends (v1.7 r050). What the ends stick to, from the map's pins
  // and stamps on the canvas the tree drew; a line's points as drawn; and what
  // an end put down at the pointer sticks to: the topmost pin whose marker,
  // grown by MAP_STICK screen pixels, holds it, else the topmost stamp on a
  // shown layer, locked or not, whose turned box, grown the same, holds it,
  // else nothing. A stamp on a hidden layer can't be seen, so nothing new
  // sticks to it; an end stuck to it before still follows it.
  const boxes = mapAnchorBoxes(drawing, data.pins, width, height);
  const drawn = (s) => mapDrawnPoints(s, boxes);
  const stickAt = (e) => {
    const g = MAP_STICK;
    let pin = null;
    const root = canvasRef.current;
    if (root) root.querySelectorAll("[data-pin]").forEach(node => {
      const r = (node.querySelector(".map-pin-marker") || node).getBoundingClientRect();
      if (e.clientX >= r.left - g && e.clientX <= r.right + g && e.clientY >= r.top - g && e.clientY <= r.bottom + g) pin = node.getAttribute("data-pin");
    });
    if (pin) return pin;
    const p = toPoint(e);
    if (!p) return null;
    const k = g * unitsPerPx();
    for (let i = layers.length - 1; i >= 0; i--) {
      const l = layers[i];
      if (!l.visible || l.kind === "raster") continue;
      for (let j = l.shapes.length - 1; j >= 0; j--) {
        const s = l.shapes[j];
        if (s.type !== "stamp") continue;
        const th = (s.rotation || 0) * Math.PI / 180, c = Math.cos(th), sn = Math.sin(th);
        const fx = p[0] - (s.x + s.w / 2), fy = p[1] - (s.y + s.h / 2);
        if (Math.abs(fx * c + fy * sn) <= s.w / 2 + k && Math.abs(fy * c - fx * sn) <= s.h / 2 + k) return s.id;
      }
    }
    return null;
  };
''')),
    (B('''
  const deleteShape = (id) => {
    setLayers(layers.map(l => ({ ...l, shapes: l.shapes.filter(s => s.id !== id) })));
    if (selectedShapeId === id) setSelectedShapeId(null);
  };
'''), B('''
  // a stamp deleted frees the ends stuck to it where they're drawn, in the same step (r050)
  const deleteShape = (id) => {
    setLayers(mapFreeEnds(layers, [id], boxes).map(l => ({ ...l, shapes: l.shapes.filter(s => s.id !== id) })));
    if (selectedShapeId === id) setSelectedShapeId(null);
  };
''')),
    (B('''
    setLayers(layers.filter(x => x.id !== id));
    if (selectedShape && l.shapes.some(s => s.id === selectedShape.id)) setSelectedShapeId(null);
'''), B('''
    // its stamps' stuck ends freed where they're drawn, in the same step (r050)
    setLayers(mapFreeEnds(layers, l.shapes.filter(s => s.type === "stamp").map(s => s.id), boxes).filter(x => x.id !== id));
    if (selectedShape && l.shapes.some(s => s.id === selectedShape.id)) setSelectedShapeId(null);
''')),
    (B('''
        id = addShape({ type: draft.type, points: pts, fill: draft.type === "stroke" ? null : style.fill, stroke: style.stroke, strokeWidth: style.strokeWidth, smooth: style.smooth, arrow: draft.type === "stroke" ? style.arrow : undefined });
'''), B('''
        // a line's ends stick to what its first and last points were put down on (r050)
        id = addShape({ type: draft.type, points: pts, fill: draft.type === "stroke" ? null : style.fill, stroke: style.stroke, strokeWidth: style.strokeWidth, smooth: style.smooth, arrow: draft.type === "stroke" ? style.arrow : undefined, anchors: draft.type === "stroke" ? { start: draft.start || null, end: draft.over || null } : undefined });
''')),
    (B('''
        id: "fill", imageHref: fc.imageHref, imageWidth: fc.imageWidth, imageHeight: fc.imageHeight, stamps: fc.stamps, layerImages: fc.layerImages,
'''), B('''
        id: "fill", imageHref: fc.imageHref, imageWidth: fc.imageWidth, imageHeight: fc.imageHeight, stamps: fc.stamps, layerImages: fc.layerImages, pins: data.pins,
''')),
    (B('''
    if (!draft) { setDraft({ type: tool, points: [p] }); setCursor(p); return; }
    if (tool === "polygon" && draft.points.length >= 3) {
      const first = draft.points[0];
      if (Math.hypot(p[0] - first[0], p[1] - first[1]) <= 10 * unitsPerPx()) { finishDraft(); return; }
    }
    setDraft({ ...draft, points: [...draft.points, p] });
'''), B('''
    // a line's point put down on a pin or a stamp: the first sticks its
    // start, the latest its end (r050)
    const over = tool === "stroke" ? stickAt(e) : null;
    setStick(over);
    if (!draft) { setDraft({ type: tool, points: [p], start: over, over }); setCursor(p); return; }
    if (tool === "polygon" && draft.points.length >= 3) {
      const first = draft.points[0];
      if (Math.hypot(p[0] - first[0], p[1] - first[1]) <= 10 * unitsPerPx()) { finishDraft(); return; }
    }
    setDraft({ ...draft, points: [...draft.points, p], over });
''')),
    (B('''
    if (!draft || (draft.type !== "polygon" && draft.type !== "stroke")) return;
    const p = toPoint(e);
    if (p) setCursor(p);
  };
'''), B('''
    if (!draft || (draft.type !== "polygon" && draft.type !== "stroke")) return;
    const p = toPoint(e);
    if (p) setCursor(p);
    if (draft.type === "stroke") setStick(stickAt(e));
  };
''')),
    (B('''
  // Vertex drag: one point of the selected polygon or line follows the cursor.
  useEffect(() => {
    if (!vertexDrag) return;
    const move = (e) => {
      const p = toPoint(e);
      if (!p) return;
      setLayers(layers.map(l => ({ ...l, shapes: l.shapes.map(s => (s.id === vertexDrag.id && Array.isArray(s.points))
        ? { ...s, points: s.points.map((q, i) => (i === vertexDrag.index ? p : q)) }
        : s) })), { coalesce: `vertex-${vertexDrag.id}-${vertexDrag.index}-${vertexDrag.seq}` });
    };
'''), B('''
  // Vertex drag: one point of the selected polygon or line follows the cursor.
  // A line's end sticks to the pin or the stamp it's over and comes free off
  // one (r050), its anchor set at every move, so the end is drawn there
  // while the pointer is and the drop keeps the last.
  useEffect(() => {
    if (!vertexDrag) return;
    const move = (e) => {
      const p = toPoint(e);
      if (!p) return;
      const shape = allShapes.find(s => s.id === vertexDrag.id);
      const n = shape && Array.isArray(shape.points) ? shape.points.length : 0;
      const end = !!shape && shape.type === "stroke" && (vertexDrag.index === 0 || vertexDrag.index === n - 1);
      const over = end ? stickAt(e) : null;
      setLayers(layers.map(l => ({ ...l, shapes: l.shapes.map(s => {
        if (s.id !== vertexDrag.id || !Array.isArray(s.points)) return s;
        const moved = { ...s, points: s.points.map((q, i) => (i === vertexDrag.index ? p : q)) };
        if (!end) return moved;
        const a = { start: s.anchors ? s.anchors.start : null, end: s.anchors ? s.anchors.end : null };
        if (vertexDrag.index === 0) a.start = over;
        if (vertexDrag.index === n - 1) a.end = over;
        return mapWithAnchors(moved, a);
      }) })), { coalesce: `vertex-${vertexDrag.id}-${vertexDrag.index}-${vertexDrag.seq}` });
    };
''')),
    (B('''
    draft, cursor, selBox, style, selectable, finishDraft, cancelDraft,
'''), B('''
    draft, cursor, selBox, style, selectable, finishDraft, cancelDraft,
    drawn, boxes, stick, freeEnds: (ids) => mapFreeEnds(layers, ids, boxes),
''')),
    (B('''
  const { tool, draft, cursor, selBox, style, selectable, selectedShape, onSvgPointerDown, onSvgContextMenu, paintSettings } = drawing;
'''), B('''
  const { tool, draft, cursor, selBox, style, selectable, selectedShape, onSvgPointerDown, onSvgContextMenu, paintSettings, drawn, boxes, stick } = drawing;
''')),
    (B('''
      const node = mapShapeNode(s, hitCtx);
      if (!node) return;
'''), B('''
      const node = mapShapeNode(s.anchors ? { ...s, points: drawn(s) } : s, hitCtx); // a line where it's drawn (r050)
      if (!node) return;
''')),
    (B('''
  } else if (draft) {
    const pts = draft.points;
    const trail = cursor ? [...pts, cursor] : pts;
'''), B('''
  } else if (draft) {
    const pts = draft.points;
    const typed = cursor ? [...pts, cursor] : pts;
    // a line's rubber band as it will be drawn (r050): its start from what
    // its first point stuck to, its pending end from what the pointer is over
    const trail = draft.type === "stroke" && typed.length >= 2 ? mapDrawnPoints({ type: "stroke", points: typed, anchors: { start: draft.start || null, end: (cursor ? stick : draft.over) || null } }, boxes) : typed;
''')),
    (B('''
  if (selectMode && selectedShape && Array.isArray(selectedShape.points) && selectedShape.points.length <= MAP_FREEHAND.handleCap) {
    // A visible dot, then its hit target on top: a transparent disk (the
    // stroke ring alone leaves the centre of a small circle unhittable in
    // Chromium) plus a transparent 16-pixel non-scaling stroke around it.
    const hr = Math.max(0.5, v.w / 130);
    selectedShape.points.forEach((p, i) => {
'''), B('''
  const longLine = !!selectedShape && selectedShape.type === "stroke" && Array.isArray(selectedShape.points) && selectedShape.points.length > MAP_FREEHAND.handleCap;
  if (selectMode && selectedShape && Array.isArray(selectedShape.points) && (selectedShape.points.length <= MAP_FREEHAND.handleCap || longLine)) {
    // A visible dot, then its hit target on top: a transparent disk (the
    // stroke ring alone leaves the centre of a small circle unhittable in
    // Chromium) plus a transparent 16-pixel non-scaling stroke around it.
    // A line's handles sit at its drawn points, a stuck end's where the end
    // is drawn, and a line past the cap has handles at its two ends only
    // (r050, Drak's call 3).
    const hr = Math.max(0.5, v.w / 130);
    const handlePts = drawn(selectedShape);
    handlePts.forEach((p, i) => {
      if (longLine && i !== 0 && i !== handlePts.length - 1) return;
''')),
])


# ---------------------------------------------------- 18_cartographia/03_view
edit(MODULES / "18_cartographia" / "03_view.jsx", [
    (B('''
// the world's stamps resolved, hidden layers omitted, no pins (pins are app
// data with their own renderer), the map font embedded from the page's own
'''), B('''
// the world's stamps resolved, hidden layers omitted, no pins (pins are app
// data with their own renderer; a line's end stuck to one is drawn at its
// point all the same, r050), the map font embedded from the page's own
''')),
    (B('''
    stamps: state ? state.mapStamps : [],
    layerImages,
  });
'''), B('''
    stamps: state ? state.mapStamps : [],
    layerImages,
    pins: mapData.pins,
  });
''')),
    (B('''
      className={`map-pin ${editable ? "editable" : ""} ${isSelected ? "selected" : ""}`}
      style={{ left: `${left * 100}%`, top: `${top * 100}%` }}
'''), B('''
      className={`map-pin ${editable ? "editable" : ""} ${isSelected ? "selected" : ""}`}
      data-pin={pin.id}
      style={{ left: `${left * 100}%`, top: `${top * 100}%` }}
''')),
    (B('''
    stamps: state ? state.mapStamps : [],
    layerImages: layerImages.urls,
  }), [mapData, entry.id, entry.name, imageUrl, imageSize, state ? state.mapStamps : null, layerImages]);
'''), B('''
    stamps: state ? state.mapStamps : [],
    layerImages: layerImages.urls,
    pins: mapData.pins,
  }), [mapData, entry.id, entry.name, imageUrl, imageSize, state ? state.mapStamps : null, layerImages]);
''')),
    (B('''
    placeholder: true,
    layerImages: mergedUrls,
  }), [data, imageUrl, imageSize, stamps, mergedUrls]);
'''), B('''
    placeholder: true,
    layerImages: mergedUrls,
    pins: data.pins,
  }), [data, imageUrl, imageSize, stamps, mergedUrls]);
''')),
    (B('''
  // coordinates (anything beyond the new edges is cut off) and pins keep their
  // 0-1 positions, so they shift against the drawing. An image map's canvas is
  // the image's size and has no picker.
'''), B('''
  // coordinates (anything beyond the new edges is cut off) and pins keep their
  // 0-1 positions, so they shift against the drawing, a line's end stuck to a
  // pin with it (r050). An image map's canvas is the image's size and has no
  // picker.
''')),
    ("pins keep their relative positions and will shift against the drawing. Undo restores it.`)) return;",
     "pins keep their relative positions and will shift against the drawing, and a line's end stuck to a pin goes with it. Undo restores it.`)) return;"),
    ('''      id: `pin-${genId().slice(0, 6)}`,''',
     '''      id: `pin-${genId().slice(-6)}`, // the random part, as a shape's (r050); the time's repeated within a second'''),
    (B('''
  const deletePin = (pinId) => {
    commit({ ...data, pins: pins.filter(p => p.id !== pinId) });
    setSelectedPinId(null);
  };
'''), B('''
  // a line's end stuck to the pin is freed where it's drawn, in the same step (r050)
  const deletePin = (pinId) => {
    const layers = drawing.freeEnds([pinId]);
    commit({ ...data, pins: pins.filter(p => p.id !== pinId), drawing: layers === data.drawing.layers ? data.drawing : { ...data.drawing, layers } });
    setSelectedPinId(null);
  };
''')),
])


# ------------------------------------------------------------ 08_export-layer
edit(MODULES / "08_export-layer.jsx", [
    (B('''
// isPinVisibleAtAbsDay when ctx.currentMomentDay is set; null currentMomentDay
// shows all pins (per the warning-and-proceed flow in the export modal).
'''), B('''
// isPinVisibleAtAbsDay when ctx.currentMomentDay is set; null currentMomentDay
// shows all pins (per the warning-and-proceed flow in the export modal). The
// drawing takes every pin, shown or not, so a line's end stuck to a pin the
// moment hides is drawn at its point all the same (r050, Drak's call 1).
''')),
    (B('''
      stamps: state.mapStamps,
      layerImages,
    })) + layerNotes;
'''), B('''
      stamps: state.mapStamps,
      layerImages,
      pins: allPins,
    })) + layerNotes;
''')),
    ('''imgHtml = mapTreeToString(buildMapDrawingTree(mapData.drawing, { id: entry.id, className: "map-image", label: entry.name, stamps: state.mapStamps, layerImages })) + layerNotes;''',
     '''imgHtml = mapTreeToString(buildMapDrawingTree(mapData.drawing, { id: entry.id, className: "map-image", label: entry.name, stamps: state.mapStamps, layerImages, pins: allPins })) + layerNotes;'''),
])


# ----------------------------------------------- 21_stemma/05_tabula-drawing
edit(MODULES / "21_stemma" / "05_tabula-drawing.jsx", [
    (B('''
// The point on a card's box a stuck end is drawn at: on the border, where
// the line from the box's center toward the next point leaves it.
const tabulaAttachPoint = (box, from) => {
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
'''), B('''
// The point on a card's box a stuck end is drawn at: on the border, where
// the line from the box's center toward the next point leaves it. A box
// with a rotation, in degrees about its center as the map's renderer turns
// a stamp (v1.7 r050; no card has one), is worked out unturned, toward the
// next point turned back by its angle, and the point found is turned
// forward.
const tabulaAttachPoint = (box, from) => {
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  if (box.rotation) {
    const th = box.rotation * Math.PI / 180, c = Math.cos(th), s = Math.sin(th);
    const fx = from[0] - cx, fy = from[1] - cy;
    const ux = fx * c + fy * s, uy = fy * c - fx * s;
    if (!ux && !uy) return [cx, cy];
    const k = Math.min(ux ? box.w / 2 / Math.abs(ux) : Infinity, uy ? box.h / 2 / Math.abs(uy) : Infinity);
    const q = (v) => Math.round(v * 100) / 100;
    return [q(cx + (ux * c - uy * s) * k), q(cy + (ux * s + uy * c) * k)];
  }
''')),
])


def main():
    staged = []
    for path, steps in PLAN:
        text = path.read_text(encoding="utf-8")
        for step in steps:
            old, new = step[0], step[1]
            count = step[2] if len(step) > 2 else 1
            n = text.count(old)
            assert n == count, f"{path.name}: anchor occurs {n} times, not {count}:\n{old[:300]}"
            text = text.replace(old, new)
        if chr(0xFEFF) in text:
            raise SystemExit(f"{path.name}: a byte-order mark would be written")
        staged.append((path, text))
    for path, text in staged:
        path.write_text(text, encoding="utf-8")
    print(f"r050 applied to {len(staged)} files")


if __name__ == "__main__":
    main()
