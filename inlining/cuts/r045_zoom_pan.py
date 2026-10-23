"""r045: zoom and pan (Cartographia+ cut 15 of the amendment, usability item 1).

A camera. The box the map sits in never changes size; what changes is the
part of the canvas it shows: `view`, a rect in canvas units with the
canvas's aspect, 1x (the whole canvas, Fit) to 8x. The svg and the overlay
take it as their viewBox, the pins and the paint overlay are placed in it,
and the editor's pointer math maps through it, so every tool draws at any
zoom and the hint and the strip stay where they are. Inputs: Ctrl+wheel
about the pointer (what a trackpad pinch sends too), a two-finger pinch,
the keys + - 0, and the corner buttons; a pan by the middle button or Space
held in any tool, by one finger or the left button in pan mode (a Pan tool
in the strip, or the read-only view), and by two fingers anywhere. A second
finger cancels the one-finger gesture it lands on; the wheel, the keys, and
the buttons are ignored while a stroke or a drag is in progress, so nothing
shifts under a pointer that is down (the r044 lesson). The selection
frame's handles, the knob, and the vertex dots keep their screen size;
Freehand samples and simplifies at a fraction of the visible width, so
zooming in draws finer lines. Resets to Fit on open and when the canvas size
changes; nothing is stored. The wrapper-width zoom, its scrolling box, and
the hover-only size badge go; the corner bar shows the zoom, and the box's
width when the grip has changed it.

Decided (Drak, 2026-10-22): every recommendation.

Declared scope: 16_trunk (+MAP_CAMERA, +useMapCamera, +MapZoomControls),
shell.html (the bar, the cursors, touch-action, the scrolling rule and the
size badge removed).

String-anchored edits; every anchor must occur exactly once unless the edit
names its count. Run from the repository root against the r044 tree:
python3 inlining/cuts/r045_zoom_pan.py
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


def edit_n(path, old, new, n):
    s = path.read_text(encoding="utf-8")
    c = s.count(old)
    assert c == n, f"{path.name}: anchor occurs {c} times, {n} expected: {old[:80]!r}"
    path.write_text(s.replace(old, new), encoding="utf-8")


TRUNK = MOD / "16_trunk.jsx"

# ─── 1. the Pan tool ─────────────────────────────────────────────────────────

edit(TRUNK, [
    ('''  { id: "eraser",  label: "Eraser",  hint: "Drag on the map to erase from the active raster layer · Tip, size, and opacity are in the strip · Right-click when done" },
];''',
     '''  { id: "eraser",  label: "Eraser",  hint: "Drag on the map to erase from the active raster layer · Tip, size, and opacity are in the strip · Right-click when done" },
  { id: "pan",     label: "Pan",     hint: "Drag to move the view · Ctrl+wheel, a pinch, the corner buttons, or + and - zoom; 0 fits · From any tool, hold Space or drag with the middle button · Right-click when done" },
];'''),
])

# ─── 2. the camera ───────────────────────────────────────────────────────────

CAMERA = r'''
// The camera (r045): what part of the canvas the box shows. `view` is the
// visible rect in canvas units, always the canvas's aspect, so the box never
// changes size; zoom is the canvas width over the view's, 1 (the whole
// canvas, Fit) to `max`. The svg and the overlay take the view as their
// viewBox, the pins and the paint overlay are placed in it, and the editor's
// pointer math maps through it. Inputs: Ctrl+wheel about the pointer (what a
// trackpad pinch sends), a two-finger pinch, the keys + - 0, the corner
// buttons; a pan by the middle button or Space held in any tool, by one
// finger or the left button in pan mode (the Pan tool, or the read-only
// view), by two fingers anywhere. A second finger cancels the one-finger
// gesture it lands on through `cancelGesture`; the wheel, the keys, and the
// buttons are ignored while `locked()` says a gesture is in progress, so
// nothing shifts under a pointer that is down. `panMode` and `locked` are
// functions, read at the event, because the editor's tool hook renders
// after the camera. Resets to Fit when the canvas size changes.
const MAP_CAMERA = { max: 8, step: 1.25, dragSlop: 3 };

function useMapCamera({ width, height, canvasRef, svgRef, panMode, locked, cancelGesture, enabled }) {
  const W = Number.isFinite(width) && width > 0 ? width : 1;
  const H = Number.isFinite(height) && height > 0 ? height : 1;
  const [view, setViewState] = useState({ x: 0, y: 0, w: W, h: H });
  const viewRef = useRef(view);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [dragging, setDragging] = useState(false);
  const spaceRef = useRef(false);
  const panRef = useRef(null);          // { pointerId, startX, startY, view, moved } while a pan drag runs
  const pinchRef = useRef(null);        // { dist, zoom, anchor } while two fingers are down
  const touchRef = useRef(new Map());   // the touch pointers down, id -> [clientX, clientY]
  const draggedRef = useRef(false);     // the last press moved the view: the click that follows is not a click
  const attachedRef = useRef(false);
  const cfg = useRef({});
  cfg.current = { panMode, locked, cancelGesture, W, H };
  const setView = (v) => { viewRef.current = v; setViewState(v); };
  const clampView = (x, y, w, h) => ({ x: Math.max(0, Math.min(W - w, x)), y: Math.max(0, Math.min(H - h, y)), w, h });
  const rectOf = () => { const el = (svgRef && svgRef.current) || canvasRef.current; return el ? el.getBoundingClientRect() : null; };
  const fractionOf = (rect, clientX, clientY) => [rect && rect.width ? (clientX - rect.left) / rect.width : 0.5, rect && rect.height ? (clientY - rect.top) / rect.height : 0.5];
  const zoomOf = (v) => W / v.w;
  const isLocked = () => (typeof cfg.current.locked === "function" ? !!cfg.current.locked() : false);
  useEffect(() => { setView({ x: 0, y: 0, w: W, h: H }); }, [W, H]);
  // a zoom that keeps the canvas point under the pointer where it is
  const zoomAt = (factor, clientX, clientY) => {
    const v = viewRef.current;
    const z = Math.max(1, Math.min(MAP_CAMERA.max, zoomOf(v) * factor));
    const w = W / z, h = H / z;
    const [fx, fy] = fractionOf(rectOf(), clientX, clientY);
    setView(clampView(v.x + fx * v.w - fx * w, v.y + fy * v.h - fy * h, w, h));
  };
  const zoomBy = (factor) => { const r = rectOf(); zoomAt(factor, r ? r.left + r.width / 2 : 0, r ? r.top + r.height / 2 : 0); };
  const fit = () => setView({ x: 0, y: 0, w: W, h: H });
  const panBy = (dx, dy) => { const v = viewRef.current; setView(clampView(v.x + dx, v.y + dy, v.w, v.h)); };
  // the window listeners of a drag or a pinch, one stable pair that reads the latest closures
  const handlersRef = useRef(null);
  if (!handlersRef.current) handlersRef.current = { move: (e) => cfg.current.onMove(e), up: (e) => cfg.current.onUp(e) };
  const attach = () => { if (attachedRef.current) return; attachedRef.current = true; const h = handlersRef.current; window.addEventListener("pointermove", h.move); window.addEventListener("pointerup", h.up); window.addEventListener("pointercancel", h.up); };
  const detach = () => { if (!attachedRef.current) return; attachedRef.current = false; const h = handlersRef.current; window.removeEventListener("pointermove", h.move); window.removeEventListener("pointerup", h.up); window.removeEventListener("pointercancel", h.up); };
  cfg.current.onMove = (e) => {
    if (e.pointerType === "touch" && touchRef.current.has(e.pointerId)) touchRef.current.set(e.pointerId, [e.clientX, e.clientY]);
    const pinch = pinchRef.current;
    if (pinch) {
      const pts = Array.from(touchRef.current.values());
      if (pts.length < 2) return;
      const [a, b] = pts;
      const dist = Math.max(1, Math.hypot(a[0] - b[0], a[1] - b[1]));
      const z = Math.max(1, Math.min(MAP_CAMERA.max, pinch.zoom * dist / pinch.dist));
      const w = W / z, h = H / z;
      const [fx, fy] = fractionOf(rectOf(), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      setView(clampView(pinch.anchor[0] - fx * w, pinch.anchor[1] - fy * h, w, h));
      return;
    }
    const pan = panRef.current;
    if (!pan || e.pointerId !== pan.pointerId) return;
    const rect = rectOf();
    if (!rect || !rect.width || !rect.height) return;
    const dx = e.clientX - pan.startX, dy = e.clientY - pan.startY;
    if (!pan.moved && Math.hypot(dx, dy) > MAP_CAMERA.dragSlop) pan.moved = true;
    if (!pan.moved) return;
    draggedRef.current = true;
    setView(clampView(pan.view.x - dx * pan.view.w / rect.width, pan.view.y - dy * pan.view.h / rect.height, pan.view.w, pan.view.h));
  };
  cfg.current.onUp = (e) => {
    if (e.pointerType === "touch") {
      touchRef.current.delete(e.pointerId);
      if (pinchRef.current && touchRef.current.size < 2) pinchRef.current = null;
    }
    if (panRef.current && e.pointerId === panRef.current.pointerId) { panRef.current = null; setDragging(false); }
    if (!panRef.current && !pinchRef.current && touchRef.current.size === 0) detach();
  };
  // The canvas div's capture-phase pointerdown: a pan or a pinch takes the
  // pointer before the svg, the pins, or the tools see it.
  const onPointerDownCapture = (e) => {
    const t = e.target;
    if (t && t.closest && t.closest(".map-zoom, .map-resize-handle")) return;
    if (e.pointerType === "touch") {
      touchRef.current.set(e.pointerId, [e.clientX, e.clientY]);
      attach();
      if (touchRef.current.size === 2) {
        if (panRef.current) { panRef.current = null; setDragging(false); }
        if (typeof cfg.current.cancelGesture === "function") cfg.current.cancelGesture();
        const [a, b] = Array.from(touchRef.current.values());
        const v = viewRef.current;
        const [fx, fy] = fractionOf(rectOf(), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        pinchRef.current = { dist: Math.max(1, Math.hypot(a[0] - b[0], a[1] - b[1])), zoom: zoomOf(v), anchor: [v.x + fx * v.w, v.y + fy * v.h] };
        draggedRef.current = true;
        e.stopPropagation();
        e.preventDefault();
        return;
      }
      if (touchRef.current.size > 2) { e.stopPropagation(); e.preventDefault(); return; }
    }
    if (pinchRef.current) { e.stopPropagation(); return; }
    const mode = typeof cfg.current.panMode === "function" ? !!cfg.current.panMode() : !!cfg.current.panMode;
    const pan = e.button === 1 || (e.button === 0 && (spaceRef.current || mode));
    if (!pan) { draggedRef.current = false; return; }
    e.stopPropagation();
    e.preventDefault();
    draggedRef.current = false;
    panRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, view: viewRef.current, moved: false };
    setDragging(true);
    attach();
  };
  // Ctrl+wheel on the canvas, bound natively so the page does not zoom
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      if (isLocked() || pinchRef.current || panRef.current) return;
      zoomAt(e.deltaY < 0 ? MAP_CAMERA.step : 1 / MAP_CAMERA.step, e.clientX, e.clientY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [enabled, W, H]);
  // Space held, and the zoom keys, document-wide, typing fields excluded
  useEffect(() => {
    const typing = (t) => { const tag = t && t.tagName ? t.tagName.toUpperCase() : ""; return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !!(t && t.isContentEditable); };
    const down = (e) => {
      if (typing(e.target)) return;
      if (e.key === " ") {
        if (!spaceRef.current) { spaceRef.current = true; setSpaceHeld(true); }
        const el = canvasRef.current;
        if (el && typeof el.matches === "function" && el.matches(":hover")) e.preventDefault();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "+" || e.key === "=") { e.preventDefault(); if (!isLocked()) zoomBy(MAP_CAMERA.step); }
      else if (e.key === "-" || e.key === "_") { e.preventDefault(); if (!isLocked()) zoomBy(1 / MAP_CAMERA.step); }
      else if (e.key === "0") { e.preventDefault(); if (!isLocked()) fit(); }
    };
    const up = (e) => { if (e.key === " ") { spaceRef.current = false; setSpaceHeld(false); } };
    const blur = () => { spaceRef.current = false; setSpaceHeld(false); };
    document.addEventListener("keydown", down);
    document.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => { document.removeEventListener("keydown", down); document.removeEventListener("keyup", up); window.removeEventListener("blur", blur); };
  }, [W, H]);
  useEffect(() => () => { panRef.current = null; pinchRef.current = null; touchRef.current.clear(); detach(); }, []);
  const f = mapNum;
  return {
    view: { ...view, W, H },
    viewBox: `${f(view.x)} ${f(view.y)} ${f(view.w)} ${f(view.h)}`,
    zoom: zoomOf(view),
    zoomAt, zoomBy, fit, panBy,
    onPointerDownCapture,
    dragged: () => draggedRef.current,
    className: `${spaceHeld ? "pan-ready" : ""} ${dragging ? "pan-active" : ""}`.trim(),
  };
}

// The bar in the canvas's corner: zoom out, the zoom, zoom in, Fit, and the
// box's width when the grip has changed it. Its presses stay its own.
function MapZoomControls({ camera, sizePct }) {
  const z = camera.zoom;
  const stop = (e) => e.stopPropagation();
  return (
    <div className="map-zoom" onPointerDown={stop} onClick={stop} onDoubleClick={stop}>
      <button type="button" className="btn btn-small btn-ghost" disabled={z <= 1.0001} onClick={() => camera.zoomBy(1 / MAP_CAMERA.step)} title="Zoom out (-)">{"−"}</button>
      <span className="map-zoom-value" title="Zoom; Ctrl+wheel or a pinch zooms about the pointer">{Math.round(z * 100)}%</span>
      <button type="button" className="btn btn-small btn-ghost" disabled={z >= MAP_CAMERA.max - 0.0001} onClick={() => camera.zoomBy(MAP_CAMERA.step)} title="Zoom in (+)">+</button>
      <button type="button" className="btn btn-small btn-ghost" disabled={z <= 1.0001} onClick={camera.fit} title="Show the whole canvas (0)">Fit</button>
      {Number.isFinite(sizePct) && Math.round(sizePct) !== 100 && <span className="map-zoom-value" title="The box's width, from the corner grip">{Math.round(sizePct)}% wide</span>}
    </div>
  );
}
'''

edit(TRUNK, [
    ('''// Shared resize handler for the map canvas. Returns a pointerdown handler that
// the caller wires onto a resize-handle element.''',
     CAMERA + '''
// Shared resize handler for the map canvas. Returns a pointerdown handler that
// the caller wires onto a resize-handle element.'''),
])

# ─── 3. the tool hook maps through the view ──────────────────────────────────

edit(TRUNK, [
    ('''// the tree rendered at, the raster layers' urls and missing files, and the
// editor's painter (r044: the live-stroke overlay, where a layer's bitmap is
// read from, and where a painted one is stored).
function useMapDrawing({ data, onChange, svgRef, canvasRef, width, height, fillContext, stamps, layerImages, painter }) {''',
     '''// the tree rendered at, the raster layers' urls and missing files, the
// editor's painter (r044: the live-stroke overlay, where a layer's bitmap is
// read from, and where a painted one is stored), and getView (r045: the
// camera's visible rect, read at the event, since the camera renders after
// this hook).
function useMapDrawing({ data, onChange, svgRef, canvasRef, width, height, fillContext, stamps, layerImages, painter, getView }) {
  const getV = () => (typeof getView === "function" && getView()) || { x: 0, y: 0, w: width, h: height };'''),
    ('''  const toPoint = (e) => {
    const el = svgRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const fx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const fy = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return [r2(fx * width), r2(fy * height)];
  };
  // viewBox units per screen pixel, for click tolerances that should feel the same at any zoom
  const unitsPerPx = () => {
    const el = svgRef.current;
    const rect = el ? el.getBoundingClientRect() : null;
    return rect && rect.width ? width / rect.width : 1;
  };''',
     '''  // The pointer in canvas units, through the camera's view (r045): the
  // fraction of the svg's rect, then that fraction of the visible rect.
  const toPoint = (e) => {
    const el = svgRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const v = getV();
    const fx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const fy = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return [r2(v.x + fx * v.w), r2(v.y + fy * v.h)];
  };
  // canvas units per screen pixel, for click tolerances that should feel the same at any zoom
  const unitsPerPx = () => {
    const el = svgRef.current;
    const rect = el ? el.getBoundingClientRect() : null;
    return rect && rect.width ? getV().w / rect.width : 1;
  };'''),
    ('''      let tol = MAP_FREEHAND.tolerance * width;''',
     '''      let tol = MAP_FREEHAND.tolerance * getV().w; // of the visible width: zoomed in, a finer line'''),
    ('''    const minGap = MAP_FREEHAND.spacing * width;''',
     '''    const minGap = MAP_FREEHAND.spacing * getV().w;'''),
    ('''  const toPointRaw = (e) => {
    const el = svgRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return [(e.clientX - rect.left) / rect.width * width, (e.clientY - rect.top) / rect.height * height];
  };''',
     '''  const toPointRaw = (e) => {
    const el = svgRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const v = getV();
    return [v.x + (e.clientX - rect.left) / rect.width * v.w, v.y + (e.clientY - rect.top) / rect.height * v.h];
  };'''),
    ('''      const ov = overlayEl();
      if (ov) {
        ov.width = bw; ov.height = bh;
        ov.style.width = `${s.units.w / width * 100}%`;
        ov.style.height = `${s.units.h / height * 100}%`;
        ov.style.display = "block";
      }''',
     '''      const ov = overlayEl();
      if (ov) {
        // over the layer's rect, in the camera's view (the camera is locked while the stroke runs)
        const v = getV();
        ov.width = bw; ov.height = bh;
        ov.style.left = `${-v.x / v.w * 100}%`;
        ov.style.top = `${-v.y / v.h * 100}%`;
        ov.style.width = `${s.units.w / v.w * 100}%`;
        ov.style.height = `${s.units.h / v.h * 100}%`;
        ov.style.display = "block";
      }'''),
    # the Pan tool takes no press; the camera took it already
    ('''    if (canvasRef.current && canvasRef.current.focus) canvasRef.current.focus({ preventScroll: true });
    if (paintTool) {
      e.preventDefault();
      beginStroke(e);
      return;
    }''',
     '''    if (canvasRef.current && canvasRef.current.focus) canvasRef.current.focus({ preventScroll: true });
    if (tool === "pan") return; // the camera takes the press in the capture phase
    if (paintTool) {
      e.preventDefault();
      beginStroke(e);
      return;
    }'''),
    # what the camera asks of the tools
    ('''  liveRef.current = { data, onChange, painter, strokeMove, strokeUp };
  useEffect(() => () => { const s = strokeRef.current; if (s) { s.cancelled = true; strokeRef.current = null; detachStroke(); } }, []);''',
     '''  liveRef.current = { data, onChange, painter, strokeMove, strokeUp, busy: !!draft || !!moving || !!vertexDrag || !!handleDrag };
  useEffect(() => () => { const s = strokeRef.current; if (s) { s.cancelled = true; strokeRef.current = null; detachStroke(); } }, []);
  // For the camera (r045): whether a gesture is in progress (the wheel and
  // the keys wait), and the cancel a second finger brings. A shape mid-drag
  // goes back where it was when its origin is known.
  const isBusy = () => !!strokeRef.current || !!liveRef.current.busy;
  const cancelGesture = () => {
    if (strokeRef.current) cancelStroke();
    if (draft) cancelDraft();
    if (moving) {
      setLayers(layers.map(l => ({ ...l, shapes: l.shapes.map(s => (s.id === moving.id ? moving.origin : s)) })), { coalesce: `move-${moving.id}-${moving.seq}` });
      setMoving(null);
    }
    if (handleDrag) {
      updateShape(handleDrag.origin.id, handleDrag.origin, { coalesce: `${handleDrag.kind}-${handleDrag.origin.id}-${handleDrag.seq}` });
      setHandleDrag(null);
    }
    if (vertexDrag) setVertexDrag(null);
  };'''),
    ('''    paintSettings, setPaint,
    onSvgPointerDown, onSvgClick, onSvgDoubleClick, onSvgPointerMove, onSvgPointerLeave, onSvgContextMenu,
  };
}''',
     '''    paintSettings, setPaint,
    isBusy, cancelGesture,
    onSvgPointerDown, onSvgClick, onSvgDoubleClick, onSvgPointerMove, onSvgPointerLeave, onSvgContextMenu,
  };
}'''),
])

# ─── 4. the strip: no style row for Pan ──────────────────────────────────────

edit(TRUNK, [
    ('''  const showStyle = tool !== "pin" && (tool !== "select" || !!selectedShape);''',
     '''  const showStyle = tool !== "pin" && tool !== "pan" && (tool !== "select" || !!selectedShape);'''),
])

# ─── 5. the overlay in the view ──────────────────────────────────────────────

edit(TRUNK, [
    ('''function MapEditorOverlay({ width, height, drawing }) {
  const { tool, draft, cursor, selBox, style, selectable, selectedShape, onSvgPointerDown, onSvgContextMenu, paintSettings } = drawing;
  const f = mapNum;
  const items = [];
  const vertexR = Math.max(3, width / 220);''',
     '''function MapEditorOverlay({ width, height, drawing, view }) {
  const { tool, draft, cursor, selBox, style, selectable, selectedShape, onSvgPointerDown, onSvgContextMenu, paintSettings } = drawing;
  const f = mapNum;
  const items = [];
  // the visible rect (r045); handle sizes follow it so they keep their screen size at any zoom
  const v = view || { x: 0, y: 0, w: width, h: height };
  const vertexR = Math.max(0.5, v.w / 220);'''),
    ('''    const rot = selectedShape.rotation || 0;
    const hr = Math.max(4, width / 130);''',
     '''    const rot = selectedShape.rotation || 0;
    const hr = Math.max(0.5, v.w / 130);'''),
    ('''      const kx = frame.x + frame.w / 2, ky = frame.y - Math.max(16, width / 60);''',
     '''      const kx = frame.x + frame.w / 2, ky = frame.y - Math.max(1, v.w / 60);'''),
    ('''    // stroke ring alone leaves the centre of a small circle unhittable in
    // Chromium) plus a transparent 16-pixel non-scaling stroke around it.
    const hr = Math.max(4, width / 130);''',
     '''    // stroke ring alone leaves the centre of a small circle unhittable in
    // Chromium) plus a transparent 16-pixel non-scaling stroke around it.
    const hr = Math.max(0.5, v.w / 130);'''),
    ('''      viewBox={`0 0 ${f(width)} ${f(height)}`}
      aria-hidden="true"
      onPointerDown={selectMode ? onSvgPointerDown : undefined}''',
     '''      viewBox={`${f(v.x)} ${f(v.y)} ${f(v.w)} ${f(v.h)}`}
      aria-hidden="true"
      onPointerDown={selectMode ? onSvgPointerDown : undefined}'''),
])

# ─── 6. the pins in the view ─────────────────────────────────────────────────

edit(TRUNK, [
    ('''function MapPin({ pin, entries, templates, asOfYear, timeMode, isSelected, onClick, onPointerDown, editable }) {''',
     '''function MapPin({ pin, entries, templates, asOfYear, timeMode, isSelected, onClick, onPointerDown, editable, view }) {
  // placed in the camera's view (r045): a pin outside it lands outside the box, which clips it
  const left = view ? (pin.x * view.W - view.x) / view.w : pin.x;
  const top = view ? (pin.y * view.H - view.y) / view.h : pin.y;'''),
    ('''      style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}''',
     '''      style={{ left: `${left * 100}%`, top: `${top * 100}%` }}'''),
])

# ─── 7. the view ─────────────────────────────────────────────────────────────

edit(TRUNK, [
    ('''  const pins = mapData.pins || [];
  const canvasRef = useRef(null);
  const [sizePct, setSizePct] = useState(100);

  // Ctrl+scroll zoom on the map canvas. Simple wrapper-width approach (no
  // transform): the inner wrapper claims zoom × natural width, the image's
  // width:100% naturally grows to fill it, and pins keep their percentage
  // positioning. Range 0.5–4, factor 1.15. Wider upper bound than Stemma
  // because maps benefit from deep zoom-in. Listener bound natively with
  // passive:false so Ctrl+wheel doesn't trigger browser page zoom.
  //
  // Effect deps include canvasReady because the map-canvas div is gated
  // behind the early `if (!canvasReady) return <map-empty>` while an image
  // loads: first mount has no canvas and the ref is null. The effect re-runs
  // when the canvas mounts and binds to it.
  const [mapZoom, setMapZoom] = useState(1);
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const handler = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setMapZoom(z => {
        const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
        return Math.max(0.5, Math.min(4, z * factor));
      });
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [canvasReady]);''',
     '''  const pins = mapData.pins || [];
  const canvasRef = useRef(null);
  const viewSvgRef = useRef(null);
  const [sizePct, setSizePct] = useState(100);
  // The camera (r045): in the view every drag pans, so a click on a pin
  // opens its entry only when the press did not move. `enabled` carries
  // canvasReady because the box is gated behind it while an image loads.
  const camera = useMapCamera({ width: canvasTree.width, height: canvasTree.height, canvasRef, svgRef: viewSvgRef, panMode: true, enabled: canvasReady });'''),
    ('''      <div className={`map-canvas view-mode ${mapZoom > 1 ? "zoomed" : ""}`} ref={canvasRef} style={{ width: `${sizePct}%`, marginLeft: sizePct > 100 ? `${(100 - sizePct) / 2}%` : undefined }}>
        <div style={{ position: "relative", width: `${mapZoom * 100}%`, transition: "width 100ms ease" }}>
          {mapTreeToReact(canvasTree, "canvas")}''',
     '''      <div className={`map-canvas view-mode ${camera.className}`} ref={canvasRef} onPointerDownCapture={camera.onPointerDownCapture} style={{ width: `${sizePct}%`, marginLeft: sizePct > 100 ? `${(100 - sizePct) / 2}%` : undefined }}>
        <div style={{ position: "relative" }}>
          {mapTreeToReact(canvasTree, "canvas", { ref: viewSvgRef, viewBox: camera.viewBox })}'''),
    ('''                  timeMode={timeMode}
                  editable={false}
                  onClick={() => pin.entryId && onOpenEntry(pin.entryId)}
                />''',
     '''                  timeMode={timeMode}
                  editable={false}
                  view={camera.view}
                  onClick={() => { if (!camera.dragged() && pin.entryId) onOpenEntry(pin.entryId); }}
                />'''),
    ('''        {Math.round(sizePct) !== 100 && <div className="map-size-indicator">{Math.round(sizePct)}%</div>}
        <div className="map-resize-handle" onPointerDown={handleResizeStart} title="Drag to resize · double-click to reset" onDoubleClick={() => setSizePct(100)} />
      </div>
      {pins.length > 0 && (''',
     '''        <MapZoomControls camera={camera} sizePct={sizePct} />
        <div className="map-resize-handle" onPointerDown={handleResizeStart} title="Drag to resize · double-click to reset" onDoubleClick={() => setSizePct(100)} />
      </div>
      {pins.length > 0 && ('''),
])

# ─── 8. the editor ───────────────────────────────────────────────────────────

edit(TRUNK, [
    ('''  const drawing = useMapDrawing({ data, onChange: commit, svgRef: imgRef, canvasRef, width: canvasTree.width, height: canvasTree.height, fillContext, stamps, layerImages: { urls: mergedUrls, missing: layerImages.missing }, painter });''',
     '''  // The camera (r045) renders after the tool hook, which reads its view at
  // the event; the camera reads the tool hook's state at the event too.
  const cameraViewRef = useRef(null);
  const drawingRef = useRef(null);
  const drawing = useMapDrawing({ data, onChange: commit, svgRef: imgRef, canvasRef, width: canvasTree.width, height: canvasTree.height, fillContext, stamps, layerImages: { urls: mergedUrls, missing: layerImages.missing }, painter, getView: () => cameraViewRef.current });
  drawingRef.current = drawing;'''),
    ('''  // Ctrl+scroll zoom, mirroring MapView. Wrapper-width approach keeps the
  // pin-placement and drag math zoom-independent: handlers read imgRef's
  // getBoundingClientRect (the svg canvas), which already reflects the actual
  // rendered size at any zoom level, so click-to-fraction conversion still
  // works.
  //
  // Effect deps include canvasReady because the map-canvas div is gated
  // behind it while an image loads: the ref is null on first mount, and the
  // effect re-runs when the canvas mounts and binds to it.
  const [mapZoom, setMapZoom] = useState(1);
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const handler = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setMapZoom(z => {
        const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
        return Math.max(0.5, Math.min(4, z * factor));
      });
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [canvasReady]);
  const handleResizeStart = useResizeHandler(canvasRef, sizePct, setSizePct);''',
     '''  // The camera: pan mode is the Pan tool; the wheel and the keys wait while a
  // stroke, a drag, or a pin drag is in progress; a second finger cancels
  // whichever of those it lands on. The view's pointer math and the pins
  // go through camera.view.
  const camera = useMapCamera({
    width: canvasTree.width, height: canvasTree.height, canvasRef, svgRef: imgRef, enabled: canvasReady,
    panMode: () => !!drawingRef.current && drawingRef.current.tool === "pan",
    locked: () => (!!drawingRef.current && drawingRef.current.isBusy()) || !!draggingPinId,
    cancelGesture: () => { if (drawingRef.current) drawingRef.current.cancelGesture(); setDraggingPinId(null); },
  });
  cameraViewRef.current = camera.view;
  // a screen point as a 0-1 fraction of the canvas, through the view (pins are stored that way)
  const pinFraction = (clientX, clientY) => {
    const rect = imgRef.current ? imgRef.current.getBoundingClientRect() : null;
    if (!rect || !rect.width || !rect.height) return null;
    const v = camera.view;
    return [(v.x + (clientX - rect.left) / rect.width * v.w) / v.W, (v.y + (clientY - rect.top) / rect.height * v.h) / v.H];
  };
  const handleResizeStart = useResizeHandler(canvasRef, sizePct, setSizePct);'''),
    ('''  const handleCanvasClick = (e) => {
    if (drawing.tool !== "pin") return;
    if (e.target && e.target.closest && e.target.closest(".map-resize-handle")) return; // a click on the resize grip is not a pin
    if (draggingPinId) return;
    if (dragMoved) { setDragMoved(false); return; }
    if (selectedPinId) { setSelectedPinId(null); return; }
    if (!imgRef.current) return;

    const rect = imgRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
''',
     '''  const handleCanvasClick = (e) => {
    if (drawing.tool !== "pin") return;
    if (e.target && e.target.closest && e.target.closest(".map-resize-handle, .map-zoom")) return; // a click on the resize grip or the zoom bar is not a pin
    if (camera.dragged()) return; // the press panned the view
    if (draggingPinId) return;
    if (dragMoved) { setDragMoved(false); return; }
    if (selectedPinId) { setSelectedPinId(null); return; }
    const frac = pinFraction(e.clientX, e.clientY);
    if (!frac) return;
    const [x, y] = frac;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
'''),
    ('''    const handleMove = (e) => {
      if (!imgRef.current) return;
      const rect = imgRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      if (Math.abs(x - startX) > 0.002 || Math.abs(y - startY) > 0.002) {''',
     '''    const handleMove = (e) => {
      const frac = pinFraction(e.clientX, e.clientY);
      if (!frac) return;
      const x = Math.max(0, Math.min(1, frac[0]));
      const y = Math.max(0, Math.min(1, frac[1]));
      if (Math.abs(x - startX) > 0.002 || Math.abs(y - startY) > 0.002) {'''),
    ('''          <div
            className={`map-canvas tool-${drawing.tool} ${drawing.tool !== "pin" ? "draw-mode" : ""} ${mapZoom > 1 ? "zoomed" : ""}`}
            ref={canvasRef}
            onClick={handleCanvasClick}
            tabIndex={0}
            style={{ borderRadius: "0 0 3px 3px", width: `${sizePct}%`, marginLeft: sizePct > 100 ? `${(100 - sizePct) / 2}%` : undefined }}
          >
            <div style={{ position: "relative", width: `${mapZoom * 100}%`, transition: "width 100ms ease" }}>
              {mapTreeToReact(canvasTree, "canvas", {
                ref: imgRef,''',
     '''          <div
            className={`map-canvas tool-${drawing.tool} ${drawing.tool !== "pin" ? "draw-mode" : ""} ${camera.className}`}
            ref={canvasRef}
            onClick={handleCanvasClick}
            onPointerDownCapture={camera.onPointerDownCapture}
            tabIndex={0}
            style={{ borderRadius: "0 0 3px 3px", width: `${sizePct}%`, marginLeft: sizePct > 100 ? `${(100 - sizePct) / 2}%` : undefined }}
          >
            <div style={{ position: "relative" }}>
              {mapTreeToReact(canvasTree, "canvas", {
                ref: imgRef,
                viewBox: camera.viewBox,'''),
    ('''                  isSelected={pin.id === selectedPinId}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => handlePinPointerDown(e, pin.id)}
                />
              ))}
              <MapEditorOverlay width={canvasTree.width} height={canvasTree.height} drawing={drawing} />
            </div>
            {Math.round(sizePct) !== 100 && <div className="map-size-indicator">{Math.round(sizePct)}%</div>}
            <div className="map-resize-handle"''',
     '''                  isSelected={pin.id === selectedPinId}
                  view={camera.view}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => handlePinPointerDown(e, pin.id)}
                />
              ))}
              <MapEditorOverlay width={canvasTree.width} height={canvasTree.height} drawing={drawing} view={camera.view} />
            </div>
            <MapZoomControls camera={camera} sizePct={sizePct} />
            <div className="map-resize-handle"'''),
])

# ─── 9. the shell ────────────────────────────────────────────────────────────

edit(SHELL, [
    ('''.map-canvas.zoomed{overflow:auto;max-height:75vh}
.map-canvas.view-mode{cursor:default}
.map-canvas.view-mode-pannable{cursor:grab}
.map-canvas.view-mode-pannable:active{cursor:grabbing}''',
     '''.map-canvas.view-mode{cursor:grab;touch-action:pan-y}'''),
    ('''.map-size-indicator{
  position:absolute;bottom:6px;left:6px;
  font-size:calc(10px * var(--font-scale));color:var(--text-dim);
  background:rgba(12,11,10,.75);padding:2px 7px;border-radius:3px;
  font-family:'DM Sans',sans-serif;letter-spacing:.04em;
  pointer-events:none;z-index:18;
  opacity:0;transition:opacity .15s;
}
.map-canvas:hover .map-size-indicator{opacity:1}''',
     '''.map-zoom{
  position:absolute;bottom:6px;left:6px;z-index:19;
  display:flex;align-items:center;gap:3px;
  background:rgba(12,11,10,.78);padding:2px 4px;border-radius:3px;
  touch-action:auto;
}
.map-zoom .btn{padding:1px 7px;min-width:0}
.map-zoom-value{
  font-size:calc(10px * var(--font-scale));color:var(--text-dim);
  font-family:'DM Sans',sans-serif;letter-spacing:.04em;
  min-width:34px;text-align:center;
}'''),
    ('''.map-canvas.tool-stamp{cursor:copy}''',
     '''.map-canvas.tool-stamp{cursor:copy}
.map-canvas.tool-pan,.map-canvas.pan-ready{cursor:grab}
.map-canvas.pan-active{cursor:grabbing}'''),
    ('''.map-canvas.draw-mode,.map-pin,.map-resize-handle{touch-action:none}''',
     '''.map-canvas,.map-pin,.map-resize-handle{touch-action:none}'''),
])

print("r045 applied")
