"""r044: the paint engine and pointer events (Cartographia+ cut 14 of the amendment).

Brush and Eraser join the strip. A stroke lays dabs of a tip (the built-in
hard round and soft round, or any imported alpha tip) along the pointer's
path at the slider's size and spacing, accumulated at full strength on a
stroke canvas and composited onto the active raster layer's bitmap on
release at the stroke's opacity (source-over for the Brush, destination-out
for the Eraser), so two overlapping half-strength strokes read as a half and
three quarters. With a vector layer active the Brush paints into a raster
layer named Paint that lands directly above it, with the stroke, in one
commit on release (so nothing reflows under the pointer mid-stroke and
Escape leaves no empty layer), and makes it active; the Eraser asks for a
raster layer instead. The
live stroke draws on an HTML canvas over the svg at the bitmap's resolution
(the layer's own bitmap under it, the layer's <image> hidden meanwhile) and
the finished bitmap is encoded, decoded once so the swap does not flash, and
stored where the layer lives: the image folder under the layer's own file
(what the file held before the session's first write, and after each, is
kept in a side table the history carries, so undo and redo rewrite the
file), inline as a data URL otherwise. The history gains a byte cap over the
distinct bitmaps its steps hold.

Mouse events become pointer events throughout the editor (the svg, the
overlay, the window listeners of every drag, the pins, the resize grip),
with touch-action none on the drawing canvas, the pins, and the grip, so a
pen or a finger draws, paints, selects, and drags. No pressure, by decision.

Decided (Drak, 2026-10-22): every recommendation; a Surface to test with.

Declared scope: 16_trunk (+MAP_PAINT, +mapBuiltinTips, +mapTipDef,
+mapTipSprite, +mapTrimHistory), shell.html (the paint overlay, touch-action,
cursors).

String-anchored edits; every anchor must occur exactly once unless the edit
names its count. Run from the repository root against the r043 tree:
python3 inlining/cuts/r044_paint.py
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


def replace_span(path, start, end, new):
    s = path.read_text(encoding="utf-8")
    assert s.count(start) == 1, f"{path.name}: start anchor occurs {s.count(start)} times"
    assert s.count(end) == 1, f"{path.name}: end anchor occurs {s.count(end)} times"
    a = s.index(start)
    b = s.index(end) + len(end)
    assert a < b
    path.write_text(s[:a] + new + s[b:], encoding="utf-8")


TRUNK = MOD / "16_trunk.jsx"

# ─── 1. the tools, the paint constants, the tips ─────────────────────────────

PAINT_DECLS = r'''
// Paint (r044): the Brush and the Eraser lay dabs of a tip along the
// pointer's path on the active raster layer. Sizes are in canvas units (the
// slider's range, and the most the field accepts); the spacing of the two
// built-in tips is a percentage of the dab; historyBytes is the most bytes of
// bitmaps the undo history keeps before its oldest steps go.
const MAP_PAINT = { sizeMin: 4, sizeMax: 256, sizeLimit: 1024, defaultSize: 24, tipSide: 64, tipSpacing: 10, historyBytes: 67108864 };

// The two tips every world has, made once from code at tipSide pixels: a
// hard round and a soft round (a radial falloff). The same shape as an
// imported alpha tip, so the engine, the strip, and the picker treat every
// tip alike; never stored.
function mapBuiltinTips() {
  if (!mapBuiltinTips.list) {
    const n = MAP_PAINT.tipSide, c = n / 2;
    const make = (id, name, paint) => {
      const canvas = document.createElement("canvas");
      canvas.width = n; canvas.height = n;
      paint(canvas.getContext("2d"));
      return { id, name, kind: "alpha", image: canvas.toDataURL("image/png"), width: n, height: n, spacing: MAP_PAINT.tipSpacing };
    };
    mapBuiltinTips.list = [
      make("round", "Round", g => { g.fillStyle = "#ffffff"; g.beginPath(); g.arc(c, c, c - 0.5, 0, Math.PI * 2); g.fill(); }),
      make("soft", "Soft round", g => {
        const grad = g.createRadialGradient(c, c, 0, c, c, c);
        grad.addColorStop(0, "rgba(255,255,255,1)");
        grad.addColorStop(0.4, "rgba(255,255,255,0.85)");
        grad.addColorStop(0.75, "rgba(255,255,255,0.3)");
        grad.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = grad; g.fillRect(0, 0, n, n);
      }),
    ];
  }
  return mapBuiltinTips.list;
}

// A tip by id: the built-in two, then the world's alpha stamps (a color
// stamp is a picture, not a tip, and is not offered).
function mapTipDef(id, stamps) {
  return mapBuiltinTips().find(t => t.id === id) || (Array.isArray(stamps) ? stamps.find(s => s && s.id === id && s.kind === "alpha") : null) || null;
}

// A tip's image tinted for painting: the color where the tip has coverage,
// transparent elsewhere, as a canvas at the tip's own size. Cached per tip
// and color (a few dozen entries); a stroke scales it to its dab once.
function mapTipSprite(tip, color) {
  if (!mapTipSprite.cache) mapTipSprite.cache = new Map();
  const cache = mapTipSprite.cache;
  const key = `${tip.id}|${tip.image.length}|${color}`;
  if (!cache.has(key)) {
    if (cache.size >= 24) cache.delete(cache.keys().next().value);
    cache.set(key, mapDecodeImage(tip.image).then(img => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || tip.width; canvas.height = img.naturalHeight || tip.height;
      const g = canvas.getContext("2d");
      g.fillStyle = color; g.fillRect(0, 0, canvas.width, canvas.height);
      g.globalCompositeOperation = "destination-in";
      g.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas;
    }));
  }
  return cache.get(key);
}
'''

edit(TRUNK, [
    # the two tools, after Stamp
    ('''  { id: "stamp",   label: "Stamp",   hint: "Pick a stamp in the strip, then click to place it or drag to size it · Right-click when done" },
];''',
     '''  { id: "stamp",   label: "Stamp",   hint: "Pick a stamp in the strip, then click to place it or drag to size it · Right-click when done" },
  { id: "brush",   label: "Brush",   hint: "Drag on the map to paint on the active raster layer (with a vector layer active, the stroke lands in a new raster layer named Paint above it) · Tip, size, opacity, and the Fill color are in the strip · Right-click when done" },
  { id: "eraser",  label: "Eraser",  hint: "Drag on the map to erase from the active raster layer · Tip, size, and opacity are in the strip · Right-click when done" },
];'''),
    # the paint constants and tips, after MAP_FREEHAND
    ('''const MAP_FREEHAND = { spacing: 1 / 400, tolerance: 1 / 400, maxPoints: 400, handleCap: 40 };
''',
     '''const MAP_FREEHAND = { spacing: 1 / 400, tolerance: 1 / 400, maxPoints: 400, handleCap: 40 };
''' + PAINT_DECLS),
])

# ─── 2. the hook: pointer events, the paint engine ───────────────────────────

edit(TRUNK, [
    ('''// coordinates and hit tests), the canvas div ref (focused on mousedown so the
// browser's own keyboard scrolling stays on the canvas), and the canvas size
// the tree rendered at.
function useMapDrawing({ data, onChange, svgRef, canvasRef, width, height, fillContext, stamps }) {''',
     '''// coordinates and hit tests), the canvas div ref (focused on pointerdown so
// the browser's own keyboard scrolling stays on the canvas), the canvas size
// the tree rendered at, the raster layers' urls and missing files, and the
// editor's painter (r044: the live-stroke overlay, where a layer's bitmap is
// read from, and where a painted one is stored).
function useMapDrawing({ data, onChange, svgRef, canvasRef, width, height, fillContext, stamps, layerImages, painter }) {'''),
    # paint state after handleDrag
    ('''  const [handleDrag, setHandleDrag] = useState(null); // {kind: "scale"|"rotate", id, handle, origin, start, seq} while Select drags a frame handle
''',
     '''  const [handleDrag, setHandleDrag] = useState(null); // {kind: "scale"|"rotate", id, handle, origin, start, seq} while Select drags a frame handle
  // Paint (r044). The Brush and the Eraser each keep a tip, a size in canvas
  // units, and an opacity. The stroke in progress lives in a ref, outside
  // React state, because pointer samples arrive at input rate and each lands
  // as dabs on a canvas; React hears about a stroke when it is committed.
  const [paint, setPaintState] = useState({
    brush: { tipId: "round", size: MAP_PAINT.defaultSize, opacity: 1 },
    eraser: { tipId: "round", size: MAP_PAINT.defaultSize, opacity: 1 },
  });
  const paintTool = tool === "brush" || tool === "eraser";
  const paintSettings = paint[tool === "eraser" ? "eraser" : "brush"];
  const setPaint = (patch) => setPaintState(p => { const k = tool === "eraser" ? "eraser" : "brush"; return { ...p, [k]: { ...p[k], ...patch } }; });
  const strokeRef = useRef(null);         // the stroke in progress
  const strokeSeqRef = useRef(0);
  const baseCacheRef = useRef(new Map()); // layer id -> { url, canvas, pending }: a layer's bitmap as last decoded or painted
  const strokeCanvasRef = useRef(null);   // one canvas reused by every stroke: the dabs at full strength
  const commitChainRef = useRef(Promise.resolve()); // strokes commit in order, each after the last has landed
  const liveRef = useRef({});             // the latest render's values, for handlers that outlive it
'''),
    # setLayerImage takes opts
    ('''  const setLayerImage = (id, image, w, h) => setLayers(layers.map(l => (l.id === id && l.kind === "raster" ? { ...l, image, width: Math.max(1, Math.round(w)), height: Math.max(1, Math.round(h)) } : l)));''',
     '''  const setLayerImage = (id, image, w, h, opts) => setLayers(layers.map(l => (l.id === id && l.kind === "raster" ? { ...l, image, width: Math.max(1, Math.round(w)), height: Math.max(1, Math.round(h)) } : l)), opts);'''),
    # setTool ends a stroke
    ('''  const setTool = (t) => {
    setToolState(t);
    setFillNote(null);''',
     '''  const setTool = (t) => {
    if (strokeRef.current) endStroke();
    setToolState(t);
    setFillNote(null);'''),
    # pointerdown
    ('''  const onSvgMouseDown = (e) => {
    if (e.button !== 0) return;
    if (canvasRef.current && canvasRef.current.focus) canvasRef.current.focus({ preventScroll: true });
    const p = toPoint(e);
    if (!p) return;
    if (tool === "rect" || tool === "ellipse" || tool === "stamp") {''',
     '''  const onSvgPointerDown = (e) => {
    if (e.button !== 0 || e.isPrimary === false) return;
    if (canvasRef.current && canvasRef.current.focus) canvasRef.current.focus({ preventScroll: true });
    if (paintTool) {
      e.preventDefault();
      beginStroke(e);
      return;
    }
    const p = toPoint(e);
    if (!p) return;
    if (tool === "rect" || tool === "ellipse" || tool === "stamp") {'''),
    # contextmenu during a stroke
    ('''  const onSvgContextMenu = (e) => {
    e.preventDefault();
    if (tool === "pin") return;''',
     '''  const onSvgContextMenu = (e) => {
    e.preventDefault();
    if (strokeRef.current) return; // a long press on a touch screen is not a right-click mid-stroke
    if (tool === "pin") return;'''),
    # pointermove, pointerleave
    ('''  const onSvgMouseMove = (e) => {
    if (!draft || (draft.type !== "polygon" && draft.type !== "stroke")) return;
    const p = toPoint(e);
    if (p) setCursor(p);
  };''',
     '''  const onSvgPointerMove = (e) => {
    if (paintTool) {
      // the brush outline follows the pointer between strokes; during one the overlay draws it
      if (strokeRef.current) return;
      const p = toPoint(e);
      if (p) setCursor(p);
      return;
    }
    if (!draft || (draft.type !== "polygon" && draft.type !== "stroke")) return;
    const p = toPoint(e);
    if (p) setCursor(p);
  };
  const onSvgPointerLeave = () => {
    if (paintTool && !strokeRef.current) setCursor(null);
  };'''),
    # Escape cancels a stroke
    ('''      if (e.key === "Escape") {
        if (draft) cancelDraft();
        else if (selectedShapeId) setSelectedShapeId(null);
        else return;
        e.preventDefault();
        return;
      }''',
     '''      if (e.key === "Escape") {
        if (strokeRef.current) cancelStroke();
        else if (draft) cancelDraft();
        else if (selectedShapeId) setSelectedShapeId(null);
        else return;
        e.preventDefault();
        return;
      }'''),
])

# the five identical window-listener tails: mouse to pointer, with pointercancel as a release
edit_n(TRUNK,
       '''    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };''',
       '''    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); };''',
       5)

PAINT_ENGINE = r'''
  // ── The paint engine (r044) ──
  // A stroke begins on pointerdown with the tool's settings taken at the
  // press (a slider moved mid-stroke changes the next one). Its base is the
  // layer's bitmap, decoded at the stroke's start and kept per layer (as the
  // result after each stroke, so the next starts at once); a layer with no
  // bitmap gets one of its units capped at the raster cap. A Brush stroke
  // with a vector layer active paints into a raster layer that does not
  // exist yet: it is inserted above the active layer, bitmap and all, by
  // the stroke's commit, so the Layers panel cannot grow and shift the
  // canvas under the pointer mid-stroke (found by probe14), and a stroke
  // begun while that commit is pending paints into the same layer. Samples that
  // arrive before the base is ready wait and land when it is. Each sample
  // lays dabs of the sprite along the path from the last one, every
  // `spacing` pixels with the remainder carried, on the stroke canvas at
  // full strength; the overlay redraws once a frame: the base, then the
  // stroke at the opacity (cut out of it for the Eraser), then the outline.
  // Release composites the same way onto the base, encodes it, decodes the
  // result once (so the swap does not flash), stores it through the editor's
  // painter, and commits the layer's new image; the overlay stays until the
  // layer's <image> has loaded the result. Escape discards the stroke;
  // pointercancel commits it.
  const toPointRaw = (e) => {
    const el = svgRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return [(e.clientX - rect.left) / rect.width * width, (e.clientY - rect.top) / rect.height * height];
  };
  const layerUrl = (layer) => (layer.image ? (layer.image.startsWith("data:") ? layer.image : ((layerImages && layerImages.urls && layerImages.urls[layer.image]) || null)) : null);
  const setLayerImageVisible = (layerId, visible) => {
    const el = svgRef.current ? svgRef.current.querySelector(`[data-layer="${String(layerId).replace(/["\\]/g, "")}"]`) : null;
    if (el) el.style.visibility = visible ? "" : "hidden";
  };
  const overlayEl = () => (painter && painter.overlayRef ? painter.overlayRef.current : null);
  const strokeHandlersRef = useRef(null);
  if (!strokeHandlersRef.current) strokeHandlersRef.current = { move: (e) => liveRef.current.strokeMove(e), up: (e) => liveRef.current.strokeUp(e) };
  const attachStroke = () => { const h = strokeHandlersRef.current; window.addEventListener("pointermove", h.move); window.addEventListener("pointerup", h.up); window.addEventListener("pointercancel", h.up); };
  const detachStroke = () => { const h = strokeHandlersRef.current; window.removeEventListener("pointermove", h.move); window.removeEventListener("pointerup", h.up); window.removeEventListener("pointercancel", h.up); };
  // The latest record and commit, for a stroke that commits after renders it
  // did not see (the layer it added, for one).
  const patchLayer = (layerId, patch, opts) => {
    const live = liveRef.current;
    const d = live.data;
    live.onChange({ ...d, drawing: { ...d.drawing, layers: d.drawing.layers.map(l => (l.id === layerId && l.kind === "raster" ? { ...l, ...patch } : l)) } }, opts);
  };
  const insertLayer = (layer, afterId, opts) => {
    const live = liveRef.current;
    const d = live.data;
    const next = d.drawing.layers.slice();
    const i = next.findIndex(l => l.id === afterId);
    next.splice(i < 0 ? next.length : i + 1, 0, layer);
    live.onChange({ ...d, drawing: { ...d.drawing, layers: next } }, opts);
  };
  const pendingLayerRef = useRef(null); // a Paint layer whose first stroke has not landed yet
  const beginStroke = (e) => {
    if (strokeRef.current) return; // a second finger
    const al = activeLayer;
    if (!al) { setFillNote("No layer to paint on; add one in Layers"); return; }
    if (!al.visible || al.locked) return; // the hint says which
    const key = `paint-${Date.now().toString(36)}-${strokeSeqRef.current + 1}`;
    let layer = al;
    let newLayer = null;
    if (al.kind !== "raster") {
      if (tool === "eraser") return; // the hint asks for a raster layer
      const pending = pendingLayerRef.current;
      if (pending && pending.afterId === al.id) {
        layer = pending.layer; // the Paint layer of the stroke still landing
      } else {
        // a raster layer named Paint, inserted above the active vector layer by this stroke's commit
        const n = layers.filter(l => l.kind === "raster" && /^Paint( \d+)?$/.test(l.name)).length;
        layer = makeDefaultMapLayer(n === 0 ? "Paint" : `Paint ${n + 1}`, "raster", drawing.width, drawing.height);
        newLayer = { layer, afterId: al.id };
        pendingLayerRef.current = newLayer;
      }
    } else if (tool === "eraser" && !layer.image) {
      setFillNote(`Nothing to erase on "${layer.name}"`);
      return;
    } else if (layer.image && !layer.image.startsWith("data:") && layerImages && Array.isArray(layerImages.missing) && layerImages.missing.includes(layer.image)) {
      setFillNote(`The raster layer "${layer.name}" could not be read; check the image folder`);
      return;
    }
    const p = toPointRaw(e);
    if (!p) return;
    const settings = paintSettings;
    const tip = mapTipDef(settings.tipId, stamps) || mapBuiltinTips()[0];
    const s = {
      seq: ++strokeSeqRef.current, pointerId: e.pointerId, tool, key, newLayer,
      layerId: layer.id, layerName: layer.name, units: { w: layer.width, h: layer.height },
      tip, size: settings.size, opacity: settings.opacity, color: tool === "eraser" ? "#000000" : (style.fill || MAP_PALETTE[0].hex),
      ready: false, released: false, cancelled: false, pending: [p], last: null, carry: 0, cursor: null, raf: 0,
    };
    strokeRef.current = s;
    setCursor(null);
    attachStroke();
    prepareStroke(s, layer);
  };
  const prepareStroke = async (s, layer) => {
    try {
      const url = layerUrl(layer);
      const cached = baseCacheRef.current.get(layer.id);
      let base = null;
      if (cached && (cached.pending || cached.url === url)) {
        base = cached.canvas;
      } else if (layer.image) {
        const src = painter && painter.loadBase ? await painter.loadBase(layer) : url;
        if (!src) throw new Error("unreadable");
        const img = await mapDecodeImage(src);
        base = document.createElement("canvas");
        base.width = img.naturalWidth; base.height = img.naturalHeight;
        base.getContext("2d").drawImage(img, 0, 0);
        baseCacheRef.current.set(layer.id, { url, canvas: base, pending: false });
      }
      const sprite = await mapTipSprite(s.tip, s.color);
      if (s.cancelled) return;
      let bw, bh;
      if (base) { bw = base.width; bh = base.height; }
      else {
        const k = Math.min(1, MAP_RASTER_LAYER.maxSide / Math.max(s.units.w, s.units.h));
        bw = Math.max(1, Math.round(s.units.w * k)); bh = Math.max(1, Math.round(s.units.h * k));
      }
      s.base = base; s.bw = bw; s.bh = bh;
      s.sx = bw / s.units.w; s.sy = bh / s.units.h;
      // the dab: the size on its long side, the tip's aspect, in bitmap pixels
      const aspect = s.tip.width > 0 && s.tip.height > 0 ? s.tip.width / s.tip.height : 1;
      const long = Math.max(0.5, s.size * s.sx);
      const dw = Math.max(1, aspect >= 1 ? long : long * aspect);
      const dh = Math.max(1, (aspect >= 1 ? long / aspect : long) * (s.sy / s.sx));
      const spacingPct = Number.isFinite(s.tip.spacing) && s.tip.spacing > 0 ? s.tip.spacing : MAP_RASTER_TIP.spacing;
      s.spacing = Math.max(1, long * spacingPct / 100);
      const sc = document.createElement("canvas");
      sc.width = Math.ceil(dw); sc.height = Math.ceil(dh);
      sc.getContext("2d").drawImage(sprite, 0, 0, sc.width, sc.height);
      s.sprite = sc;
      let strokeCanvas = strokeCanvasRef.current;
      if (!strokeCanvas) strokeCanvas = strokeCanvasRef.current = document.createElement("canvas");
      if (strokeCanvas.width !== bw || strokeCanvas.height !== bh) { strokeCanvas.width = bw; strokeCanvas.height = bh; }
      else strokeCanvas.getContext("2d").clearRect(0, 0, bw, bh);
      s.strokeCanvas = strokeCanvas;
      const ov = overlayEl();
      if (ov) {
        ov.width = bw; ov.height = bh;
        ov.style.width = `${s.units.w / width * 100}%`;
        ov.style.height = `${s.units.h / height * 100}%`;
        ov.style.display = "block";
      }
      s.overlay = ov;
      setLayerImageVisible(s.layerId, false);
      s.ready = true;
      const waiting = s.pending;
      s.pending = [];
      waiting.forEach(q => dabTo(s, q));
      scheduleRedraw(s);
      if (s.released) finishStroke(s);
    } catch (err) {
      if (strokeRef.current === s) { strokeRef.current = null; detachStroke(); }
      s.cancelled = true;
      if (s.newLayer && pendingLayerRef.current === s.newLayer) pendingLayerRef.current = null;
      setFillNote(`The raster layer "${s.layerName}" could not be read; check the image folder`);
    }
  };
  const dabTo = (s, p) => {
    const x = p[0] * s.sx, y = p[1] * s.sy;
    const g = s.strokeCanvas.getContext("2d");
    const put = (px, py) => g.drawImage(s.sprite, px - s.sprite.width / 2, py - s.sprite.height / 2);
    s.cursor = [x, y];
    if (!s.last) { put(x, y); s.last = [x, y]; s.carry = s.spacing; return; }
    const [x0, y0] = s.last;
    const dx = x - x0, dy = y - y0;
    const d = Math.hypot(dx, dy);
    if (d === 0) return;
    let t = s.carry;
    while (t <= d) { put(x0 + dx * t / d, y0 + dy * t / d); t += s.spacing; }
    s.carry = t - d;
    s.last = [x, y];
  };
  const redrawOverlay = (s) => {
    const ov = s.overlay;
    if (!ov) return;
    const g = ov.getContext("2d");
    g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
    g.clearRect(0, 0, s.bw, s.bh);
    if (s.base) g.drawImage(s.base, 0, 0);
    g.globalCompositeOperation = s.tool === "eraser" ? "destination-out" : "source-over";
    g.globalAlpha = s.opacity;
    g.drawImage(s.strokeCanvas, 0, 0);
    g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
    if (s.cursor) {
      // the outline at the latest sample, one screen pixel wide at any zoom
      const rect = ov.getBoundingClientRect();
      const pxPer = rect.width > 0 ? s.bw / rect.width : 1;
      const rx = Math.max(0.5, s.sprite.width / 2), ry = Math.max(0.5, s.sprite.height / 2);
      [["rgba(244,239,228,0.85)", 3], ["rgba(43,36,32,0.9)", 1]].forEach(([color, w]) => {
        g.strokeStyle = color; g.lineWidth = w * pxPer;
        g.beginPath(); g.ellipse(s.cursor[0], s.cursor[1], rx, ry, 0, 0, Math.PI * 2); g.stroke();
      });
    }
  };
  const scheduleRedraw = (s) => {
    if (s.raf) return;
    s.raf = requestAnimationFrame(() => { s.raf = 0; if (!s.cancelled) redrawOverlay(s); });
  };
  const strokeMove = (e) => {
    const s = strokeRef.current;
    if (!s || e.pointerId !== s.pointerId) return;
    const list = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : null;
    (list && list.length ? list : [e]).forEach(ev => {
      const p = toPointRaw(ev);
      if (!p) return;
      if (s.ready) dabTo(s, p); else s.pending.push(p);
    });
    if (s.ready) scheduleRedraw(s);
  };
  const strokeUp = (e) => {
    const s = strokeRef.current;
    if (!s || e.pointerId !== s.pointerId) return;
    endStroke();
  };
  const endStroke = () => {
    const s = strokeRef.current;
    if (!s) return;
    strokeRef.current = null;
    detachStroke();
    s.released = true;
    if (s.ready) finishStroke(s);
  };
  const cancelStroke = () => {
    const s = strokeRef.current;
    if (!s) return;
    strokeRef.current = null;
    detachStroke();
    s.cancelled = true;
    if (s.raf) { cancelAnimationFrame(s.raf); s.raf = 0; }
    if (s.newLayer && pendingLayerRef.current === s.newLayer) pendingLayerRef.current = null;
    const ov = overlayEl();
    if (ov) ov.style.display = "none";
    setLayerImageVisible(s.layerId, true);
  };
  const finishStroke = (s) => {
    if (s.raf) { cancelAnimationFrame(s.raf); s.raf = 0; }
    redrawOverlay(s);
    let result = s.base;
    if (!result) { result = document.createElement("canvas"); result.width = s.bw; result.height = s.bh; }
    const g = result.getContext("2d");
    g.globalCompositeOperation = s.tool === "eraser" ? "destination-out" : "source-over";
    g.globalAlpha = s.opacity;
    g.drawImage(s.strokeCanvas, 0, 0);
    g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
    baseCacheRef.current.set(s.layerId, { url: null, canvas: result, pending: true });
    const { layerId, key, seq, newLayer } = s;
    const release = () => { if (newLayer && pendingLayerRef.current === newLayer) pendingLayerRef.current = null; };
    commitChainRef.current = commitChainRef.current.then(async () => {
      try {
        const blob = await new Promise((resolve, reject) => result.toBlob(b => (b ? resolve(b) : reject(new Error("the browser produced no image"))), "image/png"));
        const dataUrl = await fileToDataUrl(blob);
        await mapDecodeImage(dataUrl);
        const live = liveRef.current;
        const existing = live.data.drawing.layers.find(l => l.id === layerId && l.kind === "raster");
        const layer = existing || (newLayer ? newLayer.layer : null);
        if (!layer) { release(); settleOverlay(layerId, seq, null); return; }
        const stored = live.painter && live.painter.store ? await live.painter.store(layer, blob, dataUrl) : { image: dataUrl };
        if (!stored || stored.error) {
          release();
          baseCacheRef.current.delete(layerId);
          setFillNote(`The stroke was not kept: ${stored && stored.error ? stored.error : "it could not be stored"}`);
          settleOverlay(layerId, seq, null);
          return;
        }
        const cached = baseCacheRef.current.get(layerId);
        if (cached && cached.canvas === result) { cached.url = stored.image.startsWith("data:") ? stored.image : dataUrl; cached.pending = false; }
        if (existing) patchLayer(layerId, { image: stored.image }, { coalesce: key, sidePatch: stored.sidePatch });
        else {
          insertLayer({ ...layer, image: stored.image }, newLayer.afterId, { sidePatch: stored.sidePatch });
          setActiveLayerId(layerId);
        }
        release();
        setFillNote(null);
        settleOverlay(layerId, seq, stored.image.startsWith("data:") ? stored.image : dataUrl);
      } catch (err) {
        console.warn("Paint commit failed", err);
        release();
        baseCacheRef.current.delete(layerId);
        setFillNote("The stroke could not be kept");
        settleOverlay(layerId, seq, null);
      }
    });
  };
  // The overlay comes down once the layer's <image> shows the result (its
  // load event, or half a second), unless a newer stroke owns it by then.
  const settleOverlay = (layerId, seq, href) => {
    const done = () => {
      const current = strokeRef.current;
      if (current && current.layerId === layerId && current.seq > seq) return;
      const ov = overlayEl();
      if (ov && !current) ov.style.display = "none";
      setLayerImageVisible(layerId, true);
    };
    requestAnimationFrame(() => {
      const el = svgRef.current && href ? svgRef.current.querySelector(`[data-layer="${String(layerId).replace(/["\\]/g, "")}"]`) : null;
      if (!el || el.getAttribute("href") !== href) { requestAnimationFrame(done); return; }
      let settled = false;
      const finish = () => { if (settled) return; settled = true; el.removeEventListener("load", finish); done(); };
      el.addEventListener("load", finish);
      setTimeout(finish, 500);
    });
  };
  liveRef.current = { data, onChange, painter, strokeMove, strokeUp };
  useEffect(() => () => { const s = strokeRef.current; if (s) { s.cancelled = true; strokeRef.current = null; detachStroke(); } }, []);
'''

edit(TRUNK, [
    # the engine goes right before the keydown effect's comment
    ('''  // Keys are document-wide while a drawing tool is active, because the strip's
  // buttons take focus when clicked and a Delete that only worked with the
  // canvas focused would fail right after picking a swatch. Typing targets are
  // left alone, and Enter on a focused button is the button's.
  useEffect(() => {
    if (tool === "pin") return;''',
     PAINT_ENGINE + '''
  // Keys are document-wide while a drawing tool is active, because the strip's
  // buttons take focus when clicked and a Delete that only worked with the
  // canvas focused would fail right after picking a swatch. Typing targets are
  // left alone, and Enter on a focused button is the button's.
  useEffect(() => {
    if (tool === "pin") return;'''),
    # the hint
    ('''  if (tool !== "pin" && !targetLayer) {
    hint = activeLayer
      ? (activeLayer.kind === "raster"
        ? `"${activeLayer.name}" is a raster layer; paint tools come with the next cut. Pick a vector layer in Layers to draw shapes`
        : `The active layer "${activeLayer.name}" is ${activeLayer.visible ? "locked" : "hidden"}; pick another in Layers, or ${activeLayer.visible ? "unlock" : "show"} it`)
      : "No layer to draw on; add one in Layers";
  }
''',
     '''  if (tool !== "pin") {
    if (!activeLayer) hint = "No layer to draw on; add one in Layers";
    else if (!activeLayer.visible || activeLayer.locked) hint = `The active layer "${activeLayer.name}" is ${activeLayer.visible ? "locked" : "hidden"}; pick another in Layers, or ${activeLayer.visible ? "unlock" : "show"} it`;
    else if (tool === "eraser" && activeLayer.kind !== "raster") hint = "Pick a raster layer in Layers to erase from, or paint one first with Brush";
    else if (!paintTool && activeLayer.kind === "raster") hint = `"${activeLayer.name}" is a raster layer; use Brush or Eraser on it, or pick a vector layer in Layers to draw shapes`;
  }
'''),
    # the return
    ('''    addLayer, renameLayer, toggleLayerVisible, toggleLayerLocked, moveLayer, deleteLayer, moveShapeToLayer, setLayerImage, clearLayerImage,
    onSvgMouseDown, onSvgClick, onSvgDoubleClick, onSvgMouseMove, onSvgContextMenu,
  };
}''',
     '''    addLayer, renameLayer, toggleLayerVisible, toggleLayerLocked, moveLayer, deleteLayer, moveShapeToLayer, setLayerImage, clearLayerImage,
    paintSettings, setPaint,
    onSvgPointerDown, onSvgClick, onSvgDoubleClick, onSvgPointerMove, onSvgPointerLeave, onSvgContextMenu,
  };
}'''),
])

# ─── 3. the history: a side table per step, the byte cap, restore ─────────────

TRIM = r'''
// The history's byte cap (r044): the bytes of the distinct bitmaps the past
// steps hold (a raster layer's inline data URL, or a folder file's entry in
// the step's side table; one bitmap shared by many steps counts once), the
// oldest steps dropped until the rest fit. One step always stays.
function mapTrimHistory(past, cap) {
  const weigh = () => {
    const seen = new Set();
    let bytes = 0;
    const add = (v) => { if (typeof v === "string" && v.startsWith("data:") && !seen.has(v)) { seen.add(v); bytes += v.length; } };
    past.forEach(step => {
      const d = step.record && step.record.drawing;
      (d && Array.isArray(d.layers) ? d.layers : []).forEach(l => { if (l && l.kind === "raster") add(l.image); });
      Object.values(step.side || {}).forEach(add);
    });
    return bytes;
  };
  while (past.length > 1 && weigh() > cap) past.shift();
}
'''

edit(TRUNK, [
    ('''// Undo/redo over the whole mapData, pins included: one history of snapshots,
// editor-local, gone when the editor closes. commit(next, opts) is what every
// write goes through; a snapshot of the current record is pushed before each
// step. opts.coalesce names a gesture (a drag, a run of typing in one field):
// consecutive commits under the same name are one step, so a drag of any
// length undoes in one go and the first keystroke's snapshot is the one that
// comes back. opts.silent writes through with no step (the image-size heal).
// Keys are document-wide while the editor is mounted, typing fields excluded,
// so a text field keeps the browser's own undo.
function useMapHistory(data, onChange, limit) {
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const keyRef = useRef(null);
  const [, bump] = useState(0);
  const max = limit || 50;
  const commit = (next, opts) => {
    const o = opts || {};
    if (!o.silent) {
      const key = o.coalesce || null;
      if (!(key && keyRef.current === key)) {
        pastRef.current.push(data);
        if (pastRef.current.length > max) pastRef.current.shift();
      }
      futureRef.current = [];
      keyRef.current = key;
      bump(n => n + 1);
    }
    onChange(next);
  };
  const undo = () => {
    if (pastRef.current.length === 0) return;
    const prev = pastRef.current.pop();
    futureRef.current.push(data);
    keyRef.current = null;
    bump(n => n + 1);
    onChange(prev);
  };
  const redo = () => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current.pop();
    pastRef.current.push(data);
    keyRef.current = null;
    bump(n => n + 1);
    onChange(next);
  };''',
     TRIM + '''
// Undo/redo over the whole mapData, pins included: one history of snapshots,
// editor-local, gone when the editor closes. commit(next, opts) is what every
// write goes through; a snapshot of the current record is pushed before each
// step. opts.coalesce names a gesture (a drag, a run of typing in one field):
// consecutive commits under the same name are one step, so a drag of any
// length undoes in one go and the first keystroke's snapshot is the one that
// comes back. opts.silent writes through with no step (the image-size heal).
// Each step also carries a side table (r044): the bitmaps of the folder-held
// raster layers written this session, by filename, as they stood at that
// step; opts.sidePatch merges a write into it, and undo or redo hand the
// restored step's table to onRestore, which rewrites the files, since the
// record names the same file before and after a stroke. The past is capped
// by step count and by the bytes of bitmaps it holds. Keys are document-wide
// while the editor is mounted, typing fields excluded, so a text field keeps
// the browser's own undo.
function useMapHistory(data, onChange, limit, onRestore) {
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const sideRef = useRef({});
  const keyRef = useRef(null);
  const [, bump] = useState(0);
  const max = limit || 50;
  const commit = (next, opts) => {
    const o = opts || {};
    if (!o.silent) {
      const key = o.coalesce || null;
      if (!(key && keyRef.current === key)) {
        pastRef.current.push({ record: data, side: sideRef.current });
        if (pastRef.current.length > max) pastRef.current.shift();
        mapTrimHistory(pastRef.current, MAP_PAINT.historyBytes);
      }
      futureRef.current = [];
      keyRef.current = key;
      bump(n => n + 1);
    }
    if (o.sidePatch) sideRef.current = { ...sideRef.current, ...o.sidePatch };
    onChange(next);
  };
  const undo = () => {
    if (pastRef.current.length === 0) return;
    const prev = pastRef.current.pop();
    futureRef.current.push({ record: data, side: sideRef.current });
    keyRef.current = null;
    sideRef.current = prev.side;
    bump(n => n + 1);
    onChange(prev.record);
    if (onRestore) onRestore(prev.side);
  };
  const redo = () => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current.pop();
    pastRef.current.push({ record: data, side: sideRef.current });
    keyRef.current = null;
    sideRef.current = next.side;
    bump(n => n + 1);
    onChange(next.record);
    if (onRestore) onRestore(next.side);
  };'''),
])

# ─── 4. the strip: Brush and Eraser rows; the picker's tip mode ──────────────

edit(TRUNK, [
    ('''  const [pickerOpen, setPickerOpen] = useState(false);
  const kind = selectedShape ? selectedShape.type : tool;''',
     '''  const [pickerOpen, setPickerOpen] = useState(false);
  const [tipPickerOpen, setTipPickerOpen] = useState(false);
  const kind = selectedShape ? selectedShape.type : tool;'''),
    ('''  const showStyle = tool !== "pin" && (tool !== "select" || !!selectedShape);
  const showFill = kind !== "stroke" && kind !== "freehand";
  const showStroke = kind !== "fill"; // a bucket fill lands with no stroke; give it one in Select
  const showSmooth = kind === "rect" || kind === "polygon" || kind === "stroke" || kind === "freehand" || kind === "region";
  const isText = !!selectedShape && selectedShape.type === "text";
  const hasAngle = !!selectedShape && (selectedShape.type === "text" || selectedShape.type === "stamp");
  const showWidth = kind !== "stamp" && kind !== "fill"; // a stamp's line weight is the symbol's own
  const { stampId, setStampId } = drawing;''',
     '''  const showStyle = tool !== "pin" && (tool !== "select" || !!selectedShape);
  const showFill = kind !== "stroke" && kind !== "freehand" && kind !== "eraser";
  const showStroke = kind !== "fill" && kind !== "brush" && kind !== "eraser"; // a bucket fill lands with no stroke; give it one in Select
  const showSmooth = kind === "rect" || kind === "polygon" || kind === "stroke" || kind === "freehand" || kind === "region";
  const isText = !!selectedShape && selectedShape.type === "text";
  const hasAngle = !!selectedShape && (selectedShape.type === "text" || selectedShape.type === "stamp");
  const showWidth = kind !== "stamp" && kind !== "fill" && kind !== "brush" && kind !== "eraser"; // a stamp's line weight is the symbol's own
  const { stampId, setStampId, paintSettings, setPaint } = drawing;'''),
    ('''      {showStyle && (
        <div className="map-tools-row">
          {(tool === "stamp" || (selectedShape && selectedShape.type === "stamp")) && (() => {''',
     '''      {showStyle && (
        <div className="map-tools-row">
          {(tool === "brush" || tool === "eraser") && !selectedShape && (() => {
            // The tip: the built-in two inline, an armed imported tip first,
            // More... for the rest; then the size (the slider to 256, the
            // field to 1024) and the opacity. The Brush's color is the Fill.
            const tips = mapBuiltinTips();
            const alphaStamps = worldStamps.filter(s => s.kind === "alpha");
            const armed = alphaStamps.find(s => s.id === paintSettings.tipId) || null;
            const glyphFill = tool === "eraser" ? MAP_PALETTE[0].hex : current.fill;
            return (
              <>
                <span className="map-tools-label">Tip</span>
                {armed && (
                  <button type="button" className="map-stamp-pick active" title={`${armed.name} (${armed.pack || "imported"})`} onClick={() => setTipPickerOpen(true)}>
                    <MapStampGlyph def={armed} fill={glyphFill} stroke={null} size={22} />
                  </button>
                )}
                {tips.map(t => (
                  <button key={t.id} type="button" className={`map-stamp-pick ${paintSettings.tipId === t.id ? "active" : ""}`} title={t.name} onClick={() => setPaint({ tipId: t.id })}>
                    <MapStampGlyph def={t} fill={glyphFill} stroke={null} size={22} />
                  </button>
                ))}
                {alphaStamps.length > 0 && <button type="button" className="btn btn-small btn-ghost" onClick={() => setTipPickerOpen(true)} title="Every tip: the built-in two and the imported alpha stamps">More{"\\u2026"}</button>}
                {tipPickerOpen && <MapStampPicker stamps={alphaStamps} builtins={tips} title="Choose a tip" current={paintSettings.tipId} fill={glyphFill} stroke={null} onPick={(id) => { setPaint({ tipId: id }); setTipPickerOpen(false); }} onClose={() => setTipPickerOpen(false)} />}
                <span className="map-tools-label">Size</span>
                <input
                  className="map-tools-range"
                  type="range"
                  min={MAP_PAINT.sizeMin} max={MAP_PAINT.sizeMax} step="1"
                  value={Math.min(MAP_PAINT.sizeMax, paintSettings.size)}
                  onChange={e => setPaint({ size: parseInt(e.target.value, 10) || MAP_PAINT.sizeMin })}
                  title={`${tool === "eraser" ? "Eraser" : "Brush"} size, in drawing units`}
                />
                <input
                  className="input map-tools-num"
                  type="number"
                  min={MAP_PAINT.sizeMin} max={MAP_PAINT.sizeLimit} step="1"
                  value={paintSettings.size}
                  onChange={e => { const v = parseInt(e.target.value, 10); if (Number.isFinite(v)) setPaint({ size: Math.max(MAP_PAINT.sizeMin, Math.min(MAP_PAINT.sizeLimit, v)) }); }}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") e.target.blur(); }}
                  title={`${tool === "eraser" ? "Eraser" : "Brush"} size, ${MAP_PAINT.sizeMin} to ${MAP_PAINT.sizeLimit}`}
                />
                <span className="map-tools-label">Opacity</span>
                <input
                  className="map-tools-range"
                  type="range"
                  min="5" max="100" step="5"
                  value={Math.round(paintSettings.opacity * 100)}
                  onChange={e => setPaint({ opacity: Math.max(0.05, Math.min(1, (parseInt(e.target.value, 10) || 100) / 100)) })}
                  title={tool === "eraser" ? "How much one stroke takes away; strokes over each other add up" : "How strongly one stroke lands; strokes over each other add up"}
                />
                <span className="map-tools-value">{Math.round(paintSettings.opacity * 100)}%</span>
              </>
            );
          })()}
          {(tool === "stamp" || (selectedShape && selectedShape.type === "stamp")) && (() => {'''),
    # the picker: a built-in group and a title of the caller's
    ('''function MapStampPicker({ stamps, current, fill, stroke, onPick, onClose }) {
  const groups = [{ id: "builtin", name: "Built in", stamps: MAP_BUILTIN_STAMPS }, ...mapStampGroups(stamps)];''',
     '''function MapStampPicker({ stamps, current, fill, stroke, onPick, onClose, builtins, title }) {
  const groups = [{ id: "builtin", name: "Built in", stamps: builtins || MAP_BUILTIN_STAMPS }, ...mapStampGroups(stamps)];'''),
    ('''        <div className="modal-hdr">Choose a stamp</div>''',
     '''        <div className="modal-hdr">{title || "Choose a stamp"}</div>'''),
])

# ─── 5. the overlay: the brush outline, pointer events ───────────────────────

edit(TRUNK, [
    ('''  const { tool, draft, cursor, selBox, style, selectable, selectedShape, onSvgMouseDown, onSvgContextMenu } = drawing;''',
     '''  const { tool, draft, cursor, selBox, style, selectable, selectedShape, onSvgPointerDown, onSvgContextMenu, paintSettings } = drawing;'''),
    ('''  const frame = selectedShape ? mapShapeFrame(selectedShape, selBox) : null;
  if (frame) {''',
     '''  if ((tool === "brush" || tool === "eraser") && cursor) {
    // the brush outline between strokes: the dab's long side, in a halo and ink
    const r = Math.max(0.5, (paintSettings ? paintSettings.size : MAP_PAINT.defaultSize) / 2);
    items.push(<circle key="brush-halo" cx={f(cursor[0])} cy={f(cursor[1])} r={f(r)} fill="none" stroke="#f4efe4" strokeWidth={3} vectorEffect="non-scaling-stroke" opacity={0.85} />);
    items.push(<circle key="brush-ring" cx={f(cursor[0])} cy={f(cursor[1])} r={f(r)} fill="none" stroke={MAP_PALETTE[0].hex} strokeWidth={1} vectorEffect="non-scaling-stroke" opacity={0.9} />);
  }
  const frame = selectedShape ? mapShapeFrame(selectedShape, selBox) : null;
  if (frame) {'''),
    ('''      onMouseDown={selectMode ? onSvgMouseDown : undefined}
      onContextMenu={selectMode ? onSvgContextMenu : undefined}''',
     '''      onPointerDown={selectMode ? onSvgPointerDown : undefined}
      onContextMenu={selectMode ? onSvgContextMenu : undefined}'''),
])

# ─── 6. the resize grip, the pins: pointer events ────────────────────────────

edit(TRUNK, [
    ('''// Shared resize handler for the map canvas. Returns a mousedown handler that the
// caller wires onto a resize-handle element.''',
     '''// Shared resize handler for the map canvas. Returns a pointerdown handler that
// the caller wires onto a resize-handle element.'''),
    ('''    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);''',
     '''    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);'''),
    ('''function MapPin({ pin, entries, templates, asOfYear, timeMode, isSelected, onClick, onMouseDown, editable }) {''',
     '''function MapPin({ pin, entries, templates, asOfYear, timeMode, isSelected, onClick, onPointerDown, editable }) {'''),
    ('''      onClick={onClick}
      onMouseDown={onMouseDown}
    >''',
     '''      onClick={onClick}
      onPointerDown={onPointerDown}
    >'''),
])
edit_n(TRUNK,
       '''<div className="map-resize-handle" onMouseDown={handleResizeStart} title="Drag to resize · double-click to reset" onDoubleClick={() => setSizePct(100)} />''',
       '''<div className="map-resize-handle" onPointerDown={handleResizeStart} title="Drag to resize · double-click to reset" onDoubleClick={() => setSizePct(100)} />''',
       2)

# ─── 7. the editor: live urls, the side table's restore, the painter ────────

edit(TRUNK, [
    ('''  const layerImages = useMapLayerImages(data.drawing.layers, dirHandle, imageFolder);
  const canvasTree = useMemo(() => buildMapDrawingTree(data.drawing, {
    id: "editor",
    className: "map-image",
    imageHref: data.image ? imageUrl : null,
    imageWidth: imageSize ? imageSize.width : null,
    imageHeight: imageSize ? imageSize.height : null,
    stamps,
    placeholder: true,
    layerImages: layerImages.urls,
  }), [data, imageUrl, imageSize, stamps, layerImages]);
  // Every write to the record goes through the history (one step per gesture;
  // pins included, by decision at session 19). The hook writes through it too.
  const history = useMapHistory(data, onChange);
  const commit = history.commit;''',
     '''  const layerImages = useMapLayerImages(data.drawing.layers, dirHandle, imageFolder);
  // Bitmaps written this session (r044): a paint stroke or Load image lands
  // in the image folder under the layer's own file, and the folder hook only
  // re-reads when the set of filenames changes, so the editor keeps the data
  // URL of what each such file now holds and draws from it. diskRef is what
  // each file holds; originalRef what it held before the session's first
  // write to it (null for a file the session made), for undo.
  const [liveUrls, setLiveUrls] = useState({});
  const mergedUrls = useMemo(() => ({ ...layerImages.urls, ...liveUrls }), [layerImages, liveUrls]);
  const diskRef = useRef({});
  const originalRef = useRef({});
  const writeChainRef = useRef(Promise.resolve());
  const paintOverlayRef = useRef(null);
  const canvasTree = useMemo(() => buildMapDrawingTree(data.drawing, {
    id: "editor",
    className: "map-image",
    imageHref: data.image ? imageUrl : null,
    imageWidth: imageSize ? imageSize.width : null,
    imageHeight: imageSize ? imageSize.height : null,
    stamps,
    placeholder: true,
    layerImages: mergedUrls,
  }), [data, imageUrl, imageSize, stamps, mergedUrls]);
  // A folder file written in order, one write at a time per editor; a data
  // URL or a blob.
  const writeLayerFile = (filename, src) => {
    const run = async () => {
      const blob = typeof src === "string" ? await (await fetch(src)).blob() : src;
      const fh = await dirHandle.getFileHandle(filename, { create: true });
      const writable = await fh.createWritable();
      await writable.write(blob);
      await writable.close();
    };
    const p = writeChainRef.current.then(run, run);
    writeChainRef.current = p.catch(() => {});
    return p;
  };
  // Undo or redo in folder mode: the record names the same file before and
  // after a stroke, so each file this session wrote is put back to what the
  // restored step held (its side table, else what the file held before the
  // session touched it) and the editor draws that at once.
  const restoreFolderBitmaps = (side) => {
    if (!dirHandle) return;
    const want = { ...originalRef.current, ...(side || {}) };
    const changed = {};
    Object.keys(diskRef.current).forEach(name => {
      const desired = want[name];
      if (!desired || desired === diskRef.current[name]) return;
      diskRef.current[name] = desired;
      changed[name] = desired;
      writeLayerFile(name, desired).catch(err => console.error("FSAA write failed", err));
    });
    if (Object.keys(changed).length > 0) setLiveUrls(prev => ({ ...prev, ...changed }));
  };
  // Every write to the record goes through the history (one step per gesture;
  // pins included, by decision at session 19). The hook writes through it too.
  const history = useMapHistory(data, onChange, undefined, restoreFolderBitmaps);
  const commit = history.commit;'''),
    ('''    for (const l of data.drawing.layers) {
      if (l.kind !== "raster" || !l.image || l.image.startsWith("data:")) continue;
      const v = await inlineUrl(layerImages.urls[l.image]);
      if (v) inlined[l.image] = v;
    }
    return { imageHref, imageWidth: imageSize ? imageSize.width : null, imageHeight: imageSize ? imageSize.height : null, stamps, layerImages: inlined };
  };''',
     '''    for (const l of data.drawing.layers) {
      if (l.kind !== "raster" || !l.image || l.image.startsWith("data:")) continue;
      const v = await inlineUrl(mergedUrls[l.image]);
      if (v) inlined[l.image] = v;
    }
    return { imageHref, imageWidth: imageSize ? imageSize.width : null, imageHeight: imageSize ? imageSize.height : null, stamps, layerImages: inlined };
  };
  // Where a raster layer's bitmap is kept (r044, shared by Load image and the
  // paint engine): the image folder when one is connected, under the layer's
  // own file when it has one of this type, else <map id>-<layer id>.<ext>,
  // with what the file held before the session's first write remembered for
  // undo; inline as a data URL otherwise (under the byte cap; `warn` asks
  // past a megabyte, as Set Image does). Returns { image, sidePatch },
  // { error }, or { cancelled }.
  const storeBitmap = async (layer, blob, dataUrl, ext, warn) => {
    if (dirHandle) {
      const ok = await verifyHandlePermission(dirHandle);
      if (ok) {
        const current = layer.image && !layer.image.startsWith("data:") ? layer.image : null;
        const name = current && current.toLowerCase().endsWith(`.${ext}`) ? current : `${recordId || "map"}-${layer.id}.${ext}`;
        try {
          if (!(name in diskRef.current)) {
            let before = null;
            if (current === name) { try { before = await inlineUrl(mergedUrls[name]); } catch (err) { before = null; } }
            originalRef.current[name] = before;
            diskRef.current[name] = before;
          }
          await writeLayerFile(name, blob);
          diskRef.current[name] = dataUrl;
          setLiveUrls(prev => ({ ...prev, [name]: dataUrl }));
          return { image: name, sidePatch: { [name]: dataUrl } };
        } catch (err) {
          console.error("FSAA write failed", err);
        }
      }
    }
    if (warn && blob.size > MAP_RASTER_LAYER.inlineWarn) {
      const proceed = confirm(`This image is ${(blob.size / 1024 / 1024).toFixed(1)} MB. Without an image folder set up, it will be embedded directly in your save file. Continue?\\n\\nTip: cancel and connect an image folder in Settings to keep saves small.`);
      if (!proceed) return { cancelled: true };
    }
    if (!mapRasterLayerCheck(dataUrl)) return { error: "too large to embed; connect an image folder in Settings" };
    return { image: dataUrl };
  };
  // What the paint engine starts a stroke from: the layer's bitmap as a data
  // URL (inline as it is; a folder file read once through the fill cache).
  const loadBase = async (layer) => {
    if (!layer.image) return null;
    if (layer.image.startsWith("data:")) return layer.image;
    const url = mergedUrls[layer.image];
    return url ? inlineUrl(url) : null;
  };
  const painter = { overlayRef: paintOverlayRef, loadBase, store: (layer, blob, dataUrl) => storeBitmap(layer, blob, dataUrl, "png", false) };'''),
    # Load image goes through the shared store
    ('''      const units = { width: data.drawing.width, height: Math.max(1, Math.round(h0 * data.drawing.width / w0)) };
      if (dirHandle) {
        const ok = await verifyHandlePermission(dirHandle);
        if (ok) {
          try {
            const filename = `${recordId || "map"}-${layerId}.${ext}`;
            const fh = await dirHandle.getFileHandle(filename, { create: true });
            const writable = await fh.createWritable();
            await writable.write(blob);
            await writable.close();
            drawing.setLayerImage(layerId, filename, units.width, units.height);
            return;
          } catch (err) {
            console.error("FSAA write failed", err);
          }
        }
      }
      if (blob.size > MAP_RASTER_LAYER.inlineWarn) {
        const proceed = confirm(`This image is ${(blob.size / 1024 / 1024).toFixed(1)} MB. Without an image folder set up, it will be embedded directly in your save file. Continue?\\n\\nTip: cancel and connect an image folder in Settings to keep saves small.`);
        if (!proceed) return;
      }
      try {
        const dataUrl = await fileToDataUrl(blob);
        if (!mapRasterLayerCheck(dataUrl)) { flash && flash("That image is too large to embed; connect an image folder in Settings", "error"); return; }
        drawing.setLayerImage(layerId, dataUrl, units.width, units.height);
      } catch (err) {
        flash && flash("Failed to read image", "error");
      }
    };
    input.click();
  };''',
     '''      const units = { width: data.drawing.width, height: Math.max(1, Math.round(h0 * data.drawing.width / w0)) };
      let dataUrl;
      try { dataUrl = await fileToDataUrl(blob); } catch (err) { flash && flash("Failed to read image", "error"); return; }
      const stored = await storeBitmap(layer, blob, dataUrl, ext, true);
      if (stored.cancelled) return;
      if (stored.error) { flash && flash(`That image is ${stored.error}`, "error"); return; }
      drawing.setLayerImage(layerId, stored.image, units.width, units.height, { sidePatch: stored.sidePatch });
    };
    input.click();
  };'''),
    ('''  const drawing = useMapDrawing({ data, onChange: commit, svgRef: imgRef, canvasRef, width: canvasTree.width, height: canvasTree.height, fillContext, stamps });''',
     '''  const drawing = useMapDrawing({ data, onChange: commit, svgRef: imgRef, canvasRef, width: canvasTree.width, height: canvasTree.height, fillContext, stamps, layerImages: { urls: mergedUrls, missing: layerImages.missing }, painter });'''),
    # the pin drag
    ('''  const pinDragSeq = useRef(0);
  const handlePinMouseDown = (e, pinId) => {
    e.stopPropagation();''',
     '''  const pinDragSeq = useRef(0);
  const handlePinPointerDown = (e, pinId) => {
    if (e.button !== 0 || e.isPrimary === false) return;
    e.stopPropagation();'''),
    ('''    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [draggingPinId, data, pins, onChange]);''',
     '''    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [draggingPinId, data, pins, onChange]);'''),
    # the canvas JSX
    ('''              {mapTreeToReact(canvasTree, "canvas", {
                ref: imgRef,
                onMouseDown: drawing.onSvgMouseDown,
                onMouseMove: drawing.onSvgMouseMove,
                onClick: drawing.onSvgClick,
                onDoubleClick: drawing.onSvgDoubleClick,
                onContextMenu: drawing.onSvgContextMenu,
              })}
              {pins.map(pin => (
                <MapPin
                  key={pin.id}
                  pin={pin}
                  entries={entries}
                  editable
                  isSelected={pin.id === selectedPinId}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => handlePinMouseDown(e, pin.id)}
                />
              ))}''',
     '''              {mapTreeToReact(canvasTree, "canvas", {
                ref: imgRef,
                onPointerDown: drawing.onSvgPointerDown,
                onPointerMove: drawing.onSvgPointerMove,
                onPointerLeave: drawing.onSvgPointerLeave,
                onClick: drawing.onSvgClick,
                onDoubleClick: drawing.onSvgDoubleClick,
                onContextMenu: drawing.onSvgContextMenu,
              })}
              <canvas className="map-paint-overlay" ref={paintOverlayRef} aria-hidden="true" />
              {pins.map(pin => (
                <MapPin
                  key={pin.id}
                  pin={pin}
                  entries={entries}
                  editable
                  isSelected={pin.id === selectedPinId}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => handlePinPointerDown(e, pin.id)}
                />
              ))}'''),
])

# ─── 8. the shell: the paint overlay, touch-action, cursors ──────────────────

edit(SHELL, [
    ('''.map-canvas.tool-rect,.map-canvas.tool-ellipse,.map-canvas.tool-polygon,.map-canvas.tool-stroke,.map-canvas.tool-freehand{cursor:crosshair}
.map-canvas.tool-fill{cursor:cell}
.map-overlay{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:6}''',
     '''.map-canvas.tool-rect,.map-canvas.tool-ellipse,.map-canvas.tool-polygon,.map-canvas.tool-stroke,.map-canvas.tool-freehand,.map-canvas.tool-brush,.map-canvas.tool-eraser{cursor:crosshair}
.map-canvas.tool-fill{cursor:cell}
.map-canvas.draw-mode,.map-pin,.map-resize-handle{touch-action:none}
.map-paint-overlay{position:absolute;left:0;top:0;pointer-events:none;z-index:4;display:none}
.map-overlay{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:6}'''),
])

print("r044 applied")
