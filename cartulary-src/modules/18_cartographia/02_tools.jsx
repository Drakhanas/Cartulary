
// ─── Map drawing tools (v1.6 pillar 3) ─────────────────────────────────────────
// The editor's tools. Pin is a tool in the strip and the default, so a map
// opens exactly as it did before there was a strip; the drawing tools hand
// pointer events to the svg and make the pins inert until Pin is picked again.
// Tool state is local to the editor and never persisted. The drawing changes
// only through onChange, one new mapData each time, the same as pins do.
// Overlays (the selection box, the shape in progress, the rubber line) live in
// a second svg the editor owns, over the canvas, with no pointer events, so
// the one tree stays the drawing and the export cannot pick an overlay up.
// Coordinates convert the way pins do: a fraction of the svg's rect times the
// viewBox, so a pin and a vertex placed at the same cursor agree. Since r034
// every write goes through the editor's history (useMapHistory), one step
// per completed gesture, and shapes go to an explicit active layer.

// Each tool has a key (r046): one letter, pressed with no modifier and no
// field focused, picks it.
const MAP_TOOLS = [
  { id: "pin",     label: "Pin",     key: "n", hint: "Click on map to add pin · Click pin to edit · Drag pin to move" },
  { id: "select",  label: "Select",  key: "v", hint: "Click a shape to select it · Drag to move · Corners and points reshape it, the knob turns it · Arrows nudge it · Delete removes it · Right-click returns to Pin" },
  { id: "rect",    label: "Rect",    key: "r", hint: "Drag on the map to draw a rectangle · Right-click when done" },
  { id: "ellipse", label: "Ellipse", key: "e", hint: "Drag on the map to draw an ellipse · Right-click when done" },
  { id: "polygon", label: "Polygon", key: "p", hint: "Click to place the corners of a closed, filled area · Done in the strip, the first corner, a double-click, Enter, or right-click closes it · Esc discards" },
  { id: "stroke",  label: "Line",    key: "l", hint: "Click to place the points of an open line · Done in the strip, a double-click, Enter, or right-click finishes it · Esc discards" },
  { id: "freehand", label: "Freehand", key: "f", hint: "Drag on the map to draw a line freehand · Esc while dragging discards it · Right-click when done" },
  { id: "fill",    label: "Fill",    key: "g", hint: "Click inside an area to fill it with the Fill color · The fill goes under the lines around it, and small gaps in them close · Right-click when done" },
  { id: "text",    label: "Text",    key: "t", hint: "Click on the map to place a label · Edit it, its size, its angle, and its arc in the strip · Right-click when done" },
  { id: "stamp",   label: "Stamp",   key: "s", hint: "Pick a stamp in the strip, then click to place it or drag to size it · Right-click when done" },
  { id: "brush",   label: "Brush",   key: "b", hint: "Drag on the map to paint on the active raster layer (a vector layer active gets a Paint layer above it) · Tip, size, opacity, and Fill in the strip · Right-click when done" },
  { id: "eraser",  label: "Eraser",  key: "x", hint: "Drag on the map to erase from the active raster layer · Tip, size, and opacity are in the strip · A pen's eraser end erases from any drawing tool · Right-click when done" },
  { id: "pan",     label: "Pan",     key: "h", hint: "Drag to move the view · Ctrl+wheel, a pinch, the corner buttons, or + and - zoom; 0 fits · Space or the middle button pans from any tool · Right-click when done" },
];

// The strip's layout (r046): the groups it is built from, in rows, and the
// order of the tool buttons. The default is what the editor ships with; a
// person's own, kept in the app's preferences through the Arrange modal, is
// normalized on every read so each group and each tool appears exactly once
// whatever was stored, and anything unknown is dropped.
const MAP_STRIP_GROUPS = [
  { id: "tools",   label: "Tools" },
  { id: "canvas",  label: "Canvas size (image-less maps)" },
  { id: "history", label: "Undo and Redo" },
  { id: "layers",  label: "Layers and the active layer" },
  { id: "arrange", label: "Arrange" },
  { id: "fill",    label: "Fill swatches" },
  { id: "stroke",  label: "Stroke swatches" },
  { id: "width",   label: "Width" },
  { id: "smooth",  label: "Smooth" },
  { id: "tool",    label: "The tool's own controls" },
];
const MAP_STRIP_DEFAULT = {
  rows: [["tools"], ["canvas", "history", "layers", "arrange"], ["fill", "stroke", "width", "smooth", "tool"]],
  tools: MAP_TOOLS.map(t => t.id),
};
function mapStripLayout(raw) {
  const known = MAP_STRIP_GROUPS.map(g => g.id);
  const src = raw && typeof raw === "object" ? raw : {};
  const seen = new Set();
  const rows = (Array.isArray(src.rows) ? src.rows : [])
    .map(r => (Array.isArray(r) ? r : []).filter(g => typeof g === "string" && known.includes(g) && !seen.has(g) && seen.add(g)))
    .filter(r => r.length > 0);
  const missing = known.filter(g => !seen.has(g));
  if (rows.length === 0) MAP_STRIP_DEFAULT.rows.forEach(r => rows.push(r.slice()));
  else if (missing.length) rows[rows.length - 1].push(...missing);
  const ids = MAP_TOOLS.map(t => t.id);
  const tools = (Array.isArray(src.tools) ? src.tools : []).filter((id, i, a) => typeof id === "string" && ids.includes(id) && a.indexOf(id) === i);
  ids.forEach(id => { if (!tools.includes(id)) tools.push(id); });
  return { rows, tools };
}

// The selection, said in words, for the strip's live region.
function mapDescribeShape(s, stamps) {
  if (!s) return "Nothing selected";
  const n = (v) => Math.round(v);
  switch (s.type) {
    case "rect": return `Rectangle, ${n(s.w)} by ${n(s.h)}`;
    case "ellipse": return `Ellipse, ${n(s.w)} by ${n(s.h)}`;
    case "polygon": return `Polygon, ${s.points.length} points`;
    case "stroke": return `Line, ${s.points.length} points`;
    case "region": return "Filled region";
    case "text": return `Label "${s.text}"`;
    case "stamp": { const d = mapStampDef(s.stampId, stamps); return `Stamp ${d ? d.name : s.stampId}`; }
    default: return String(s.type);
  }
}

// Canvas sizes offered on image-less maps (an image map's canvas is the image).
const MAP_CANVAS_PRESETS = [
  { id: "landscape", label: "Landscape 1600 × 1000", width: 1600, height: 1000 },
  { id: "portrait",  label: "Portrait 1000 × 1600",  width: 1000, height: 1600 },
  { id: "square",    label: "Square 1200 × 1200",    width: 1200, height: 1200 },
];

// Freehand: a new point every `spacing` of the canvas width while dragging
// (4 units at 1600 wide), Douglas-Peucker on release at `tolerance` of the
// width (4 units at 1600, about two screen pixels at the default width, which
// is where hand jitter lives), the tolerance raised by half until the stroke is
// under `maxPoints`; a polygon or line with more than `handleCap` points has
// no per-point handles in Select. All in canvas units, so the result does not
// depend on zoom.
const MAP_FREEHAND = { spacing: 1 / 400, tolerance: 1 / 400, maxPoints: 400, handleCap: 40 };

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

// The bucket fill's numbers: the trace raster's long side in pixels (the
// canvas is scaled down to it when bigger), the flood's color tolerance (the
// sum of the four channel differences from the clicked pixel, 0 to 1020), the
// gap closing in trace pixels (the fillable area is eroded by this much
// before the flood and the result grown back by one more, so a gap in an
// outline up to twice this closes on its own and the fill tucks under the
// line), the simplifier's tolerance in trace pixels, and the most points a
// region keeps (the tolerance is raised by half until it fits).
const MAP_FILL = { traceMax: 2048, tolerance: 96, close: 5, simplify: 1.25, maxPoints: 2000 };

// The pixels within `tolerance` of the seed's color, one byte per pixel.
function mapMatchMask(img, w, h, sx, sy, tolerance) {
  const data = img.data;
  const mask = new Uint8Array(w * h);
  const i0 = (sy * w + sx) * 4;
  const r0 = data[i0], g0 = data[i0 + 1], b0 = data[i0 + 2], a0 = data[i0 + 3];
  for (let i = 0, j = 0; i < w * h; i++, j += 4) {
    if (Math.abs(data[j] - r0) + Math.abs(data[j + 1] - g0) + Math.abs(data[j + 2] - b0) + Math.abs(data[j + 3] - a0) <= tolerance) mask[i] = 1;
  }
  return mask;
}

// The mask grown by `k` pixels in every direction (a square window, done as a
// horizontal pass then a vertical one). Shrinking is growing the complement.
function mapDilateMask(mask, w, h, k) {
  if (!(k > 0)) return mask;
  const pass = (src, stride, len, count, step) => {
    const out = new Uint8Array(src.length);
    for (let line = 0; line < count; line++) {
      const base = line * step;
      // a window of 2k + 1 centred on the output pixel, kept as a running count
      let sum = 0;
      for (let i = 0; i < len + k; i++) {
        if (i < len && src[base + i * stride]) sum++;
        if (i - 2 * k - 1 >= 0 && src[base + (i - 2 * k - 1) * stride]) sum--;
        const o = i - k;
        if (o >= 0 && o < len && sum > 0) out[base + o * stride] = 1;
      }
    }
    return out;
  };
  const horizontal = pass(mask, 1, w, h, w);
  return pass(horizontal, w, h, w, 1);
}

// A 4-connected flood from (sx, sy) over the set pixels of `fillable`,
// scanline by scanline. Returns the flooded mask.
function mapFloodMask(fillable, w, h, sx, sy) {
  const mask = new Uint8Array(w * h);
  if (!fillable[sy * w + sx]) return mask;
  const stack = [[sx, sy]];
  while (stack.length) {
    const [x, y] = stack.pop();
    const i = y * w + x;
    if (mask[i] || !fillable[i]) continue;
    let xl = x, xr = x;
    while (xl > 0 && !mask[i - (x - xl) - 1] && fillable[i - (x - xl) - 1]) xl--;
    while (xr < w - 1 && !mask[i + (xr - x) + 1] && fillable[i + (xr - x) + 1]) xr++;
    for (let xx = xl; xx <= xr; xx++) mask[y * w + xx] = 1;
    for (let dy = -1; dy <= 1; dy += 2) {
      const yy = y + dy;
      if (yy < 0 || yy >= h) continue;
      let inRun = false;
      for (let xx = xl; xx <= xr; xx++) {
        const j = yy * w + xx;
        const ok = !mask[j] && fillable[j];
        if (ok && !inRun) { stack.push([xx, yy]); inRun = true; } else if (!ok) inRun = false;
      }
    }
  }
  return mask;
}

// The mask's boundary as closed rings of pixel corners: every edge between a
// set pixel and an unset one (or the raster's edge) is a directed segment
// running clockwise around the set pixels, and the segments link into loops.
// Outer edges and holes both come out, which the even-odd fill wants.
function mapTraceMask(mask, w, h) {
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : mask[y * w + x]);
  const segs = new Map();
  const add = (sx, sy, ex, ey) => {
    const k = sx * (h + 1) + sy;
    const list = segs.get(k);
    if (list) list.push(ex, ey); else segs.set(k, [ex, ey]);
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      if (!at(x, y - 1)) add(x, y, x + 1, y);
      if (!at(x + 1, y)) add(x + 1, y, x + 1, y + 1);
      if (!at(x, y + 1)) add(x + 1, y + 1, x, y + 1);
      if (!at(x - 1, y)) add(x, y + 1, x, y);
    }
  }
  const rings = [];
  segs.forEach((list, k) => {
    while (list.length) {
      const sx = Math.floor(k / (h + 1)), sy = k % (h + 1);
      const ring = [[sx, sy]];
      let ey = list.pop(), ex = list.pop();
      let guard = 0;
      while (!(ex === sx && ey === sy) && guard++ < 4000000) {
        ring.push([ex, ey]);
        const next = segs.get(ex * (h + 1) + ey);
        if (!next || !next.length) break;
        ey = next.pop(); ex = next.pop();
      }
      if (ring.length >= 4) rings.push(ring);
    }
  });
  return rings;
}

// The svg drawn to a canvas at `scale` times its size, for the download's
// png and for the bucket fill's trace. Everything the svg needs is inline,
// so the canvas stays clean and can be read back. Rejects when the svg will
// not decode.
function mapSvgToCanvas(svg, width, height, scale) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas);
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("the svg would not decode")); };
    img.src = url;
  });
}

// Shift a normalized shape by (dx, dy) viewBox units, rounded to two decimals
// so stored coordinates stay short.
function translateMapShape(s, dx, dy) {
  const r = (v) => Math.round(v * 100) / 100;
  if (s.type === "polygon" || s.type === "stroke") return { ...s, points: s.points.map(p => [r(p[0] + dx), r(p[1] + dy)]) };
  if (s.type === "region") return { ...s, rings: s.rings.map(ring => ring.map(p => [r(p[0] + dx), r(p[1] + dy)])) };
  return { ...s, x: r(s.x + dx), y: r(s.y + dy) };
}

// A shape's frame in its own coordinates, before its rotation, padded the way
// the selection box is: the box the handles sit on, and the point the shape
// turns around (a stamp its middle, a label its pivot). A rect, ellipse, or
// stamp carries its box; a label's is the measured selection box the hook
// keeps, so a label has no frame until it is selected. Null for a polygon or
// line, which have points instead.
function mapShapeFrame(s, selBox) {
  if (!s) return null;
  if (s.type === "rect" || s.type === "ellipse" || s.type === "stamp") {
    const pad = (s.type !== "stamp" && s.stroke ? s.strokeWidth / 2 : 0) + 2;
    return { x: s.x - pad, y: s.y - pad, w: s.w + 2 * pad, h: s.h + 2 * pad, cx: s.x + s.w / 2, cy: s.y + s.h / 2 };
  }
  if (s.type === "text") {
    if (!selBox) return null;
    const [cx, cy] = mapTextPivot(s);
    return { x: selBox.x, y: selBox.y, w: selBox.w, h: selBox.h, cx, cy };
  }
  return null;
}

// All of the tool interaction, as a hook so MapEditor's render stays readable.
// Takes the normalized mapData and the editor's commit (useMapHistory's, which
// takes an options object after the record), the svg ref (the canvas, for
// coordinates and hit tests), the canvas div ref (focused on pointerdown so
// the browser's own keyboard scrolling stays on the canvas), the canvas size
// the tree rendered at, the raster layers' urls and missing files, the
// editor's painter (r044: the live-stroke overlay, where a layer's bitmap is
// read from, and where a painted one is stored), and getView (r045: the
// camera's visible rect, read at the event, since the camera renders after
// this hook).
function useMapDrawing({ data, onChange, svgRef, canvasRef, width, height, fillContext, stamps, layerImages, painter, getView }) {
  const getV = () => (typeof getView === "function" && getView()) || { x: 0, y: 0, w: width, h: height };
  const [tool, setToolState] = useState("pin");
  const [filling, setFilling] = useState(false); // a bucket fill in flight; a second click waits
  const [fillNote, setFillNote] = useState(null); // why the last fill did nothing, in the hint until the next click or tool
  // Defaults for the first shape: stone fill, sepia stroke. Stone because a
  // fill has to be visibly a fill on white, vellum, and parchment alike;
  // parchment on vellum read as an outline.
  const [style, setStyle] = useState({ fill: "#8a8378", stroke: "#6b4e2e", strokeWidth: 4, smooth: true });
  const [selectedShapeId, setSelectedShapeId] = useState(null);
  const [draft, setDraft] = useState(null);     // rect/ellipse: {type, x0, y0, x1, y1}; polygon/stroke: {type, points}
  const [cursor, setCursor] = useState(null);   // [x, y] while a polygon or line is in progress
  const [moving, setMoving] = useState(null);   // {id, startX, startY, origin} while Select drags a whole shape
  const [vertexDrag, setVertexDrag] = useState(null); // {id, index} while Select drags one point of a polygon or line
  const [selBox, setSelBox] = useState(null);   // selection box in viewBox units, measured from the DOM
  const [activeLayerId, setActiveLayerId] = useState(null); // explicit; falls back to the first visible unlocked layer
  const [focusTextId, setFocusTextId] = useState(null); // a label just placed: the strip's field takes focus once, then forgets
  const [stampId, setStampId] = useState(MAP_BUILTIN_STAMPS[0].id); // the stamp the Stamp tool places next
  const [handleDrag, setHandleDrag] = useState(null); // {kind: "scale"|"rotate", id, handle, origin, start, seq} while Select drags a frame handle
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

  const drawing = data.drawing;
  const layers = drawing.layers;
  // The active layer is the one picked in the panel (or the strip's Layer
  // select); until one is picked, or if it was deleted, the first visible
  // unlocked layer. A hidden or locked active layer refuses drawing, and the
  // hint says which, rather than quietly drawing somewhere else.
  const activeLayer = layers.find(l => l.id === activeLayerId) || layers.find(l => l.visible && !l.locked && l.kind !== "raster") || layers[0] || null;
  const targetLayer = activeLayer && activeLayer.visible && !activeLayer.locked && activeLayer.kind !== "raster" ? activeLayer : null;
  const allShapes = layers.flatMap(l => l.shapes);
  const selectable = layers.filter(l => l.visible && !l.locked && l.kind !== "raster").flatMap(l => l.shapes);
  const selectedShape = selectedShapeId ? (allShapes.find(s => s.id === selectedShapeId) || null) : null;

  const r2 = (v) => Math.round(v * 100) / 100;
  // The pointer in canvas units, through the camera's view (r045): the
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
  };

  // Every write: one new mapData through the history. opts.coalesce names a
  // gesture so its many commits are one undo step.
  const setLayers = (next, opts) => onChange({ ...data, drawing: { ...drawing, layers: next } }, opts);
  const addShape = (raw) => {
    if (!targetLayer) return null;
    const shape = ensureMapShape({ id: `shape-${genId().slice(-6)}`, ...raw });
    if (!shape) return null;
    setLayers(layers.map(l => l.id === targetLayer.id ? { ...l, shapes: [...l.shapes, shape] } : l));
    return shape.id;
  };
  const updateShape = (id, patch, opts) => {
    setLayers(layers.map(l => ({ ...l, shapes: l.shapes.map(s => s.id === id ? (ensureMapShape({ ...s, ...patch }) || s) : s) })), opts);
  };
  const deleteShape = (id) => {
    setLayers(layers.map(l => ({ ...l, shapes: l.shapes.filter(s => s.id !== id) })));
    if (selectedShapeId === id) setSelectedShapeId(null);
  };

  // Layer operations. Layers draw in array order, so "up" is toward the end.
  const addLayer = (kind) => {
    const raster = kind === "raster";
    const name = raster ? `Raster ${layers.filter(l => l.kind === "raster").length + 1}` : `Layer ${layers.length + 1}`;
    const layer = makeDefaultMapLayer(name, raster ? "raster" : "vector", drawing.width, drawing.height);
    setLayers([...layers, layer]);
    setActiveLayerId(layer.id);
  };
  // A raster layer's bitmap (r043): the image reference with the canvas units
  // it covers, one history step; Clear keeps the layer and its units.
  const setLayerImage = (id, image, w, h, opts) => setLayers(layers.map(l => (l.id === id && l.kind === "raster" ? { ...l, image, width: Math.max(1, Math.round(w)), height: Math.max(1, Math.round(h)) } : l)), opts);
  const clearLayerImage = (id) => setLayers(layers.map(l => (l.id === id && l.kind === "raster" ? { ...l, image: null } : l)));
  const renameLayer = (id, name) => setLayers(layers.map(l => l.id === id ? { ...l, name } : l), { coalesce: `rename-${id}` });
  const toggleLayerVisible = (id) => {
    setLayers(layers.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
    if (selectedShape && layers.some(l => l.id === id && l.visible && l.shapes.some(s => s.id === selectedShape.id))) setSelectedShapeId(null);
  };
  const toggleLayerLocked = (id) => {
    setLayers(layers.map(l => l.id === id ? { ...l, locked: !l.locked } : l));
    if (selectedShape && layers.some(l => l.id === id && !l.locked && l.shapes.some(s => s.id === selectedShape.id))) setSelectedShapeId(null);
  };
  const moveLayer = (id, dir) => {
    const i = layers.findIndex(l => l.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= layers.length) return;
    const next = layers.slice();
    const [l] = next.splice(i, 1);
    next.splice(j, 0, l);
    setLayers(next);
  };
  const deleteLayer = (id) => {
    if (layers.length <= 1) return;
    const l = layers.find(x => x.id === id);
    if (!l) return;
    if (l.kind === "raster" && l.image && !confirm(`Delete the raster layer "${l.name}" and its image? Undo brings it back.`)) return;
    if (l.shapes.length > 0 && !confirm(`Delete layer "${l.name}" and its ${l.shapes.length} ${l.shapes.length === 1 ? "shape" : "shapes"}? Undo brings it back.`)) return;
    setLayers(layers.filter(x => x.id !== id));
    if (selectedShape && l.shapes.some(s => s.id === selectedShape.id)) setSelectedShapeId(null);
  };
  const moveShapeToLayer = (shapeId, layerId) => {
    const from = layers.find(l => l.shapes.some(s => s.id === shapeId));
    const shape = from ? from.shapes.find(s => s.id === shapeId) : null;
    if (!shape || !layers.some(l => l.id === layerId && l.kind !== "raster") || from.id === layerId) return;
    setLayers(layers.map(l => {
      if (l.id === from.id) return { ...l, shapes: l.shapes.filter(s => s.id !== shapeId) };
      if (l.id === layerId) return { ...l, shapes: [...l.shapes, shape] };
      return l;
    }));
    const to = layers.find(l => l.id === layerId);
    if (selectedShapeId === shapeId && to && (!to.visible || to.locked)) setSelectedShapeId(null);
  };

  const setTool = (t) => {
    if (strokeRef.current) endStroke();
    setToolState(t);
    setFillNote(null);
    setDraft(null);
    setCursor(null);
    setMoving(null);
    setVertexDrag(null);
    setHandleDrag(null);
    if (t !== "select") setSelectedShapeId(null);
  };

  // The strip shows the selected shape's style when there is one, else the
  // defaults; a change edits the selected shape and becomes the default too.
  const current = selectedShape
    ? { fill: selectedShape.fill, stroke: selectedShape.stroke, strokeWidth: selectedShape.strokeWidth, smooth: !!selectedShape.smooth }
    : style;
  const applyStyle = (patch, coalesceKey) => {
    setStyle(st => ({ ...st, ...patch }));
    if (selectedShape) updateShape(selectedShape.id, patch, coalesceKey ? { coalesce: `${coalesceKey}-${selectedShape.id}` } : undefined);
  };
  // Text content, size, and angle edit the selected shape only, never the
  // defaults; typing coalesces into one undo step per field.
  const editSelected = (patch, coalesceKey) => {
    if (!selectedShape) return;
    updateShape(selectedShape.id, patch, coalesceKey ? { coalesce: `${coalesceKey}-${selectedShape.id}` } : undefined);
  };

  // Commits the polygon or line in progress (a rect or ellipse commits on
  // mouseup instead) and returns the new shape's id, or null.
  const finishDraft = (pointsOverride) => {
    if (!draft) return null;
    let id = null;
    if (draft.type === "freehand") {
      let tol = MAP_FREEHAND.tolerance * getV().w; // of the visible width: zoomed in, a finer line
      let pts = mapSimplifyPoints(draft.points, tol);
      while (pts.length > MAP_FREEHAND.maxPoints) { tol *= 1.5; pts = mapSimplifyPoints(draft.points, tol); }
      if (pts.length >= 2) {
        id = addShape({ type: "stroke", points: pts.map(p => [r2(p[0]), r2(p[1])]), fill: null, stroke: style.stroke, strokeWidth: style.strokeWidth, smooth: true });
      }
      setDraft(null);
      setCursor(null);
      return id;
    }
    if (draft.type === "polygon" || draft.type === "stroke") {
      const pts = pointsOverride || draft.points;
      if (pts.length >= (draft.type === "polygon" ? 3 : 2)) {
        id = addShape({ type: draft.type, points: pts, fill: draft.type === "stroke" ? null : style.fill, stroke: style.stroke, strokeWidth: style.strokeWidth, smooth: style.smooth });
      }
    }
    setDraft(null);
    setCursor(null);
    return id;
  };
  const cancelDraft = () => { setDraft(null); setCursor(null); };

  const onSvgPointerDown = (e) => {
    if (e.pointerType === "pen" && e.button === 5 && e.isPrimary !== false) {
      // the pen's eraser end (r046): an Eraser stroke whatever the tool; the tool and the strip stay
      e.preventDefault();
      if (canvasRef.current && canvasRef.current.focus) canvasRef.current.focus({ preventScroll: true });
      beginStroke(e, "eraser");
      return;
    }
    if (e.button !== 0 || e.isPrimary === false) return;
    if (canvasRef.current && canvasRef.current.focus) canvasRef.current.focus({ preventScroll: true });
    if (tool === "pan") return; // the camera takes the press in the capture phase
    if (paintTool) {
      e.preventDefault();
      beginStroke(e);
      return;
    }
    const p = toPoint(e);
    if (!p) return;
    if (tool === "rect" || tool === "ellipse" || tool === "stamp") {
      if (!targetLayer) return;
      e.preventDefault();
      // a raster tip's box keeps the tip's aspect, long side first; an svg
      // stamp's is square (r041); the aspect rides in the draft for the overlay
      const def = tool === "stamp" ? mapStampDef(stampId, stamps) : null;
      const aspect = def && (def.kind === "alpha" || def.kind === "color") && def.width > 0 && def.height > 0 ? def.width / def.height : 1;
      setDraft({ type: tool, x0: p[0], y0: p[1], x1: p[0], y1: p[1], aspect });
      return;
    }
    if (tool === "freehand") {
      if (!targetLayer) return;
      e.preventDefault();
      setDraft({ type: "freehand", points: [p] });
      return;
    }
    if (tool === "select") {
      // In Select the overlay takes the events: its hit copies carry data-shape,
      // the selected polygon's or line's point handles carry data-vertex, and
      // the selected frame's corners and knob carry data-handle.
      const handle = e.target && e.target.closest ? e.target.closest("[data-handle]") : null;
      if (handle && selectedShape) {
        e.preventDefault();
        const h = handle.getAttribute("data-handle");
        setHandleDrag({ kind: h === "rotate" ? "rotate" : "scale", id: selectedShape.id, handle: h, origin: selectedShape, start: p, seq: Date.now() });
        return;
      }
      const vertex = e.target && e.target.closest ? e.target.closest("[data-vertex]") : null;
      if (vertex && selectedShape) {
        e.preventDefault();
        setVertexDrag({ id: selectedShape.id, index: parseInt(vertex.getAttribute("data-vertex"), 10), seq: Date.now() });
        return;
      }
      const hit = e.target && e.target.closest ? e.target.closest("[data-shape]") : null;
      const id = hit ? hit.getAttribute("data-shape") : null;
      const shape = id ? selectable.find(s => s.id === id) : null;
      if (!shape) { setSelectedShapeId(null); return; }
      e.preventDefault();
      setSelectedShapeId(shape.id);
      setMoving({ id: shape.id, startX: p[0], startY: p[1], origin: shape, seq: Date.now() });
    }
  };
  // Right-click: in a drawing tool, finish what is in progress and go to Select
  // with it selected; in Select, back to Pin. Never the browser's menu.
  const onSvgContextMenu = (e) => {
    e.preventDefault();
    if (strokeRef.current) return; // a long press on a touch screen is not a right-click mid-stroke
    if (tool === "pin") return;
    if (tool === "select") { setTool("pin"); return; }
    const id = finishDraft();
    setToolState("select");
    setMoving(null);
    setVertexDrag(null);
    setHandleDrag(null);
    setSelectedShapeId(id || ((tool === "text" || tool === "stamp") ? selectedShapeId : null));
  };
  // The bucket fill. The drawing as it stands is rasterized off-screen (the
  // image when there is one, the background without its grain, every visible
  // layer), flooded from the click, grown a pixel, traced, simplified, and
  // committed as a region (Smooth off: the trace is within a pixel already,
  // and smoothing would bend a rectangle into an oval) just above the topmost
  // painted shape under the click, else at the bottom of the active layer.
  // One undo step. The layers
  // it edits are the ones at the click; an edit landing during the trace
  // (tens of milliseconds) would be overwritten, which is accepted.
  // The index, in the active layer, of the topmost shape whose paint covers
  // the point (a fill, a label, a stamp; not a line, not a hollow shape), or
  // -1. A region's holes do not cover. Read from the rendered svg, so it is
  // taken at the click, before the trace.
  const coverIndex = (p) => {
    const svg = svgRef.current;
    if (!svg || !targetLayer) return -1;
    const pt = typeof svg.createSVGPoint === "function" ? svg.createSVGPoint() : null;
    for (let i = targetLayer.shapes.length - 1; i >= 0; i--) {
      const s = targetLayer.shapes[i];
      if (!s.fill && s.type !== "stamp" && s.type !== "text") continue;
      const el = svg.querySelector(`[data-shape="${s.id.replace(/["\\]/g, "")}"]`);
      if (!el) continue;
      let inside = false;
      try {
        if (pt && typeof el.isPointInFill === "function") { pt.x = p[0]; pt.y = p[1]; inside = el.isPointInFill(pt); }
        else { const b = el.getBBox(); inside = p[0] >= b.x && p[0] <= b.x + b.width && p[1] >= b.y && p[1] <= b.y + b.height; }
      } catch (err) { inside = false; }
      if (inside) return i;
    }
    return -1;
  };
  const fillAt = async (p) => {
    if (!targetLayer || filling || !fillContext) return;
    setFillNote(null);
    const above = coverIndex(p);
    setFilling(true);
    try {
      const fc = await fillContext();
      const tree = buildMapDrawingTree({ ...drawing, background: { ...drawing.background, grain: 0 } }, {
        id: "fill", imageHref: fc.imageHref, imageWidth: fc.imageWidth, imageHeight: fc.imageHeight, stamps: fc.stamps, layerImages: fc.layerImages,
      });
      // The trace svg is loaded as an image: it needs its size on the root (an
      // svg with only a viewBox draws nothing to a canvas in Firefox, and a
      // blank canvas would flood everything) and, for older engines, href
      // doubled as xlink:href, as the download does.
      const double = (node) => {
        if (!node || typeof node !== "object") return;
        if ((node.tag === "image" || node.tag === "use" || node.tag === "textPath") && node.attrs && node.attrs.href) node.attrs["xlink:href"] = node.attrs.href;
        (node.children || []).forEach(double);
      };
      double(tree);
      tree.attrs = { ...tree.attrs, "xmlns:xlink": "http://www.w3.org/1999/xlink", width: mapNum(tree.width), height: mapNum(tree.height) };
      const scale = Math.min(1, MAP_FILL.traceMax / Math.max(width, height));
      const canvas = await mapSvgToCanvas(mapTreeToString(tree), width, height, scale);
      const pw = canvas.width, ph = canvas.height;
      const img = canvas.getContext("2d").getImageData(0, 0, pw, ph);
      // A raster with no opaque pixel at all is a failed trace, not a map; a
      // flood over it would take the whole canvas.
      let painted = false;
      for (let i = 3; i < img.data.length; i += 4) { if (img.data[i]) { painted = true; break; } }
      if (!painted) { setFillNote("The map could not be traced in this browser, so nothing was filled"); return; }
      let sx = Math.max(0, Math.min(pw - 1, Math.floor(p[0] * scale)));
      let sy = Math.max(0, Math.min(ph - 1, Math.floor(p[1] * scale)));
      const k = MAP_FILL.close;
      const matching = mapMatchMask(img, pw, ph, sx, sy, MAP_FILL.tolerance);
      // Gap closing: the fillable area shrunk by k pixels is the complement of
      // the barrier grown by k, so a gap narrower than 2k is sealed. The
      // click may sit within k of a line; then the flood starts from the
      // nearest open pixel in reach, and if there is none the area is too
      // narrow to fill at all.
      const barrier = new Uint8Array(pw * ph);
      for (let i = 0; i < barrier.length; i++) barrier[i] = matching[i] ? 0 : 1;
      const grown = mapDilateMask(barrier, pw, ph, k);
      const open = new Uint8Array(pw * ph);
      for (let i = 0; i < open.length; i++) open[i] = grown[i] ? 0 : 1;
      if (!open[sy * pw + sx]) {
        let best = null, bestD = Infinity;
        for (let dy = -k; dy <= k; dy++) {
          for (let dx = -k; dx <= k; dx++) {
            const x = sx + dx, y = sy + dy;
            if (x < 0 || y < 0 || x >= pw || y >= ph || !open[y * pw + x]) continue;
            const d = dx * dx + dy * dy;
            if (d < bestD) { bestD = d; best = [x, y]; }
          }
        }
        if (!best) { setFillNote("Too close to a line to fill here; click further inside the area"); return; }
        sx = best[0]; sy = best[1];
      }
      const mask = mapDilateMask(mapFloodMask(open, pw, ph, sx, sy), pw, ph, k + 1);
      const traced = mapTraceMask(mask, pw, ph);
      let tol = MAP_FILL.simplify;
      let rings;
      for (;;) {
        rings = traced
          .map(ring => { const s = mapSimplifyPoints([...ring, ring[0]], tol); if (s.length > 1 && s[0][0] === s[s.length - 1][0] && s[0][1] === s[s.length - 1][1]) s.pop(); return s; })
          .filter(ring => ring.length >= 3)
          .map(ring => ring.map(q => [r2(q[0] / scale), r2(q[1] / scale)]));
        if (rings.reduce((n, ring) => n + ring.length, 0) <= MAP_FILL.maxPoints) break;
        tol *= 1.5;
      }
      if (rings.length === 0) return;
      const shape = ensureMapShape({ id: `shape-${genId().slice(-6)}`, type: "region", rings, fill: style.fill, stroke: null, strokeWidth: style.strokeWidth, smooth: false });
      if (!shape) return;
      setLayers(layers.map(l => {
        if (l.id !== targetLayer.id) return l;
        const next = l.shapes.slice();
        next.splice(above >= 0 ? above + 1 : 0, 0, shape);
        return { ...l, shapes: next };
      }));
    } catch (err) {
      console.warn("Map fill failed", err); // nothing lands; the hint goes back to the tool's
    } finally {
      setFilling(false);
    }
  };

  const onSvgClick = (e) => {
    if (tool === "fill") {
      const p = toPoint(e);
      if (p) fillAt(p);
      return;
    }
    if (tool === "text") {
      // A label at the click, in ink, selected so the strip's field takes it.
      if (!targetLayer) return;
      const p = toPoint(e);
      if (!p) return;
      const id = addShape({ type: "text", x: p[0], y: p[1], text: "Label", fontSize: style.fontSize || 36, rotation: 0, fill: MAP_PALETTE[0].hex, stroke: null, strokeWidth: style.strokeWidth });
      if (id) { setSelectedShapeId(id); setFocusTextId(id); }
      return;
    }
    if (tool !== "polygon" && tool !== "stroke") return;
    if (!targetLayer) return;
    const p = toPoint(e);
    if (!p) return;
    if (!draft) { setDraft({ type: tool, points: [p] }); setCursor(p); return; }
    if (tool === "polygon" && draft.points.length >= 3) {
      const first = draft.points[0];
      if (Math.hypot(p[0] - first[0], p[1] - first[1]) <= 10 * unitsPerPx()) { finishDraft(); return; }
    }
    setDraft({ ...draft, points: [...draft.points, p] });
  };
  const onSvgDoubleClick = (e) => {
    if (!draft || (draft.type !== "polygon" && draft.type !== "stroke")) return;
    e.preventDefault();
    // the double-click's two clicks each placed a vertex at the same spot; drop the duplicate
    let pts = draft.points;
    if (pts.length >= 2) {
      const a = pts[pts.length - 1], b = pts[pts.length - 2];
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) <= 3 * unitsPerPx()) pts = pts.slice(0, -1);
    }
    finishDraft(pts);
  };
  const onSvgPointerMove = (e) => {
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
  };

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
    const v = getV();
    return [v.x + (e.clientX - rect.left) / rect.width * v.w, v.y + (e.clientY - rect.top) / rect.height * v.h];
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
  const beginStroke = (e, forced) => {
    if (strokeRef.current) return; // a second finger
    const mode = forced || tool; // "brush" or "eraser"; the pen's eraser end forces the latter
    const al = activeLayer;
    if (!al) { setFillNote("No layer to paint on; add one in Layers"); return; }
    if (!al.visible || al.locked) return; // the hint says which
    const key = `paint-${Date.now().toString(36)}-${strokeSeqRef.current + 1}`;
    let layer = al;
    let newLayer = null;
    if (al.kind !== "raster") {
      if (mode === "eraser") return; // the hint asks for a raster layer
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
    } else if (mode === "eraser" && !layer.image) {
      setFillNote(`Nothing to erase on "${layer.name}"`);
      return;
    } else if (layer.image && !layer.image.startsWith("data:") && layerImages && Array.isArray(layerImages.missing) && layerImages.missing.includes(layer.image)) {
      setFillNote(`The raster layer "${layer.name}" could not be read; check the image folder`);
      return;
    }
    const p = toPointRaw(e);
    if (!p) return;
    const settings = paint[mode === "eraser" ? "eraser" : "brush"];
    const tip = mapTipDef(settings.tipId, stamps) || mapBuiltinTips()[0];
    const s = {
      seq: ++strokeSeqRef.current, pointerId: e.pointerId, tool: mode, key, newLayer,
      layerId: layer.id, layerName: layer.name, units: { w: layer.width, h: layer.height },
      tip, size: settings.size, opacity: settings.opacity, color: mode === "eraser" ? "#000000" : (style.fill || MAP_PALETTE[0].hex),
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
        // over the layer's rect, in the camera's view (the camera is locked while the stroke runs)
        const v = getV();
        ov.width = bw; ov.height = bh;
        ov.style.left = `${-v.x / v.w * 100}%`;
        ov.style.top = `${-v.y / v.h * 100}%`;
        ov.style.width = `${s.units.w / v.w * 100}%`;
        ov.style.height = `${s.units.h / v.h * 100}%`;
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
  liveRef.current = { data, onChange, painter, strokeMove, strokeUp, busy: !!draft || !!moving || !!vertexDrag || !!handleDrag };
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
  };

  // The keyboard (r046): one letter per tool, and the arrows nudging the
  // selected shape by a unit (ten with Shift) as one undo step per run.
  // Document-wide in every tool, never while a field has focus or a modifier
  // is down (the zoom keys and Space are the camera's, Ctrl+Z the history's).
  useEffect(() => {
    const handler = (e) => {
      const t = e.target;
      const tag = t && t.tagName ? t.tagName.toUpperCase() : "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown") {
        if (!selectedShape || !(tool === "select" || tool === "text" || tool === "stamp")) return;
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        updateShape(selectedShape.id, translateMapShape(selectedShape, dx, dy), { coalesce: `nudge-${selectedShape.id}` });
        return;
      }
      if (e.shiftKey) return;
      const k = typeof e.key === "string" ? e.key.toLowerCase() : "";
      const def = MAP_TOOLS.find(x => x.key === k);
      if (!def || def.id === tool) return;
      e.preventDefault();
      setTool(def.id);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [tool, selectedShape, layers]);
  // Keys are document-wide while a drawing tool is active, because the strip's
  // buttons take focus when clicked and a Delete that only worked with the
  // canvas focused would fail right after picking a swatch. Typing targets are
  // left alone, and Enter on a focused button is the button's.
  useEffect(() => {
    if (tool === "pin") return;
    const handler = (e) => {
      const t = e.target;
      const tag = t && t.tagName ? t.tagName.toUpperCase() : "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable)) return;
      if (e.key === "Escape") {
        if (strokeRef.current) cancelStroke();
        else if (draft) cancelDraft();
        else if (selectedShapeId) setSelectedShapeId(null);
        else return;
        e.preventDefault();
        return;
      }
      if (e.key === "Enter" && tag !== "BUTTON" && draft && (draft.type === "polygon" || draft.type === "stroke")) {
        e.preventDefault();
        finishDraft();
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedShape && (tool === "select" || tool === "text" || tool === "stamp")) {
        e.preventDefault();
        deleteShape(selectedShape.id);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [tool, draft, selectedShapeId, layers]);

  // Freehand: window listeners so a drag that leaves the canvas still ends
  // cleanly (toPoint clamps to the edge). A point is taken when the cursor
  // has moved `spacing` of the width since the last one; release commits the
  // simplified stroke through finishDraft and the tool stays Freehand.
  useEffect(() => {
    if (!draft || draft.type !== "freehand") return;
    const minGap = MAP_FREEHAND.spacing * getV().w;
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
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); };
  }, [draft]);

  // Press-drag-release for rect, ellipse, and stamp: window listeners so a
  // drag that leaves the canvas still ends cleanly. For a rect or ellipse a
  // drag under two units each way is a click and places nothing; for a stamp
  // a click places the chosen stamp at 120 units on its long side centred on
  // it, and a drag places it with its long side at the drag's larger side; an
  // svg stamp's box is square, a raster tip's keeps the tip's aspect (r041).
  // A placed stamp is selected, so the strip's angle controls and the frame's
  // handles apply to it.
  useEffect(() => {
    if (!draft || (draft.type !== "rect" && draft.type !== "ellipse" && draft.type !== "stamp")) return;
    const move = (e) => { const p = toPoint(e); if (p) setDraft(d => (d ? { ...d, x1: p[0], y1: p[1] } : d)); };
    const up = () => {
      const d = draft;
      const x = Math.min(d.x0, d.x1), y = Math.min(d.y0, d.y1);
      const w = Math.abs(d.x1 - d.x0), h = Math.abs(d.y1 - d.y0);
      if (d.type === "stamp") {
        const aspect = d.aspect > 0 ? d.aspect : 1;
        const side = Math.max(w, h) >= 8 ? Math.max(w, h) : 120;
        const bw = aspect >= 1 ? side : side * aspect, bh = aspect >= 1 ? side / aspect : side;
        const box = Math.max(w, h) >= 8
          ? { x: r2(x), y: r2(y), w: r2(bw), h: r2(bh) }
          : { x: r2(d.x0 - bw / 2), y: r2(d.y0 - bh / 2), w: r2(bw), h: r2(bh) };
        const id = addShape({ type: "stamp", stampId, ...box, rotation: 0, fill: style.fill, stroke: style.stroke, strokeWidth: style.strokeWidth });
        if (id) setSelectedShapeId(id);
      } else if (w >= 2 && h >= 2) {
        addShape({ type: d.type, x: r2(x), y: r2(y), w: r2(w), h: r2(h), fill: style.fill, stroke: style.stroke, strokeWidth: style.strokeWidth, smooth: d.type === "rect" ? style.smooth : undefined });
      }
      setDraft(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); };
  }, [draft]);

  // Select-tool drag: the shape follows the cursor from its origin, so the
  // offset is always measured from where the drag began, never accumulated.
  useEffect(() => {
    if (!moving) return;
    const move = (e) => {
      const p = toPoint(e);
      if (!p) return;
      const dx = p[0] - moving.startX, dy = p[1] - moving.startY;
      setLayers(layers.map(l => ({ ...l, shapes: l.shapes.map(s => s.id === moving.id ? translateMapShape(moving.origin, dx, dy) : s) })), { coalesce: `move-${moving.id}-${moving.seq}` });
    };
    const up = () => setMoving(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); };
  }, [moving, layers]);

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
    const up = () => setVertexDrag(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); };
  }, [vertexDrag, layers]);

  // Frame handles. Both drags apply the cursor's movement since the press to
  // the shape as it was at the press, so nothing jumps on the first move and
  // nothing accumulates. A corner moves in the shape's own frame (the
  // movement is turned back by the shape's angle); the opposite corner stays
  // where it is on the canvas, which for a turned stamp means its centre
  // moves. A stamp keeps its aspect, a rect or ellipse does not; nothing goes
  // under 8 units. The knob adds the angle the cursor has swept around the
  // frame's pivot; Shift snaps the result to 15 degrees.
  useEffect(() => {
    if (!handleDrag) return;
    const o = handleDrag.origin;
    const frame = mapShapeFrame(o, selBox);
    if (!frame) { setHandleDrag(null); return; }
    const move = (e) => {
      const p = toPoint(e);
      if (!p) return;
      const start = handleDrag.start;
      if (handleDrag.kind === "rotate") {
        const a0 = Math.atan2(start[1] - frame.cy, start[0] - frame.cx);
        const a1 = Math.atan2(p[1] - frame.cy, p[0] - frame.cx);
        let deg = (o.rotation || 0) + (a1 - a0) * 180 / Math.PI;
        if (e.shiftKey) deg = Math.round(deg / 15) * 15;
        deg = ((deg + 180) % 360 + 360) % 360 - 180;
        updateShape(o.id, { rotation: r2(deg) }, { coalesce: `rotate-${o.id}-${handleDrag.seq}` });
        return;
      }
      if (o.type !== "rect" && o.type !== "ellipse" && o.type !== "stamp") return;
      const th = (o.rotation || 0) * Math.PI / 180;
      const cos = Math.cos(th), sin = Math.sin(th);
      const turn = (dx, dy) => [dx * cos - dy * sin, dx * sin + dy * cos];
      const unturn = (dx, dy) => [dx * cos + dy * sin, -dx * sin + dy * cos];
      const [dlx, dly] = unturn(p[0] - start[0], p[1] - start[1]);
      const h = handleDrag.handle;
      const sx = h.includes("w") ? 1 : -1; // the anchor corner's side of the centre
      const sy = h.includes("n") ? 1 : -1;
      const ax = sx * o.w / 2, ay = sy * o.h / 2;   // the anchor, from the old centre
      const gx = -ax + dlx, gy = -ay + dly;         // the dragged corner, moved
      let w = Math.max(8, sx * (ax - gx));          // a corner dragged past its anchor stops at 8
      let hh = Math.max(8, sy * (ay - gy));
      if (o.type === "stamp") {
        const k = Math.max(w / o.w, hh / o.h);
        w = Math.max(8, o.w * k);
        hh = Math.max(8, o.h * k);
      }
      const [awx, awy] = turn(ax, ay);
      const [nax, nay] = turn(sx * w / 2, sy * hh / 2);
      const ncx = frame.cx + awx - nax, ncy = frame.cy + awy - nay;
      updateShape(o.id, { x: r2(ncx - w / 2), y: r2(ncy - hh / 2), w: r2(w), h: r2(hh) }, { coalesce: `scale-${o.id}-${handleDrag.seq}` });
    };
    const up = () => setHandleDrag(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); };
  }, [handleDrag, layers]);

  // The selection box comes from the rendered element's bbox, which covers
  // every shape type the same way (text and stamps included, later), padded
  // by half the stroke the bbox leaves out.
  useEffect(() => {
    if (!selectedShape || !svgRef.current) { setSelBox(null); return; }
    const el = svgRef.current.querySelector(`[data-shape="${selectedShape.id.replace(/["\\]/g, "")}"]`);
    if (!el || typeof el.getBBox !== "function") { setSelBox(null); return; }
    try {
      const b = el.getBBox();
      const pad = (selectedShape.stroke ? selectedShape.strokeWidth / 2 : 0) + 2;
      setSelBox({ x: b.x - pad, y: b.y - pad, w: b.width + 2 * pad, h: b.height + 2 * pad });
    } catch (err) {
      setSelBox(null);
    }
  }, [selectedShape, data]);

  const toolDef = MAP_TOOLS.find(t => t.id === tool) || MAP_TOOLS[0];
  let hint = toolDef.hint;
  if (fillNote) hint = fillNote;
  if (filling) hint = "Filling\u2026";
  if (tool !== "pin") {
    if (!activeLayer) hint = "No layer to draw on; add one in Layers";
    else if (!activeLayer.visible || activeLayer.locked) hint = `The active layer "${activeLayer.name}" is ${activeLayer.visible ? "locked" : "hidden"}; pick another in Layers, or ${activeLayer.visible ? "unlock" : "show"} it`;
    else if (tool === "eraser" && activeLayer.kind !== "raster") hint = "Pick a raster layer in Layers to erase from, or paint one first with Brush";
    else if (!paintTool && activeLayer.kind === "raster") hint = `"${activeLayer.name}" is a raster layer; use Brush or Eraser on it, or pick a vector layer in Layers to draw shapes`;
  }

  return {
    tool, setTool, hint, current, applyStyle, editSelected,
    stampId, setStampId,
    selectedShape, deleteSelected: () => { if (selectedShape) deleteShape(selectedShape.id); },
    draft, cursor, selBox, style, selectable, finishDraft, cancelDraft,
    layers, activeLayerId: activeLayer ? activeLayer.id : null, setActiveLayerId,
    focusTextId, consumeFocusText: () => setFocusTextId(null),
    addLayer, renameLayer, toggleLayerVisible, toggleLayerLocked, moveLayer, deleteLayer, moveShapeToLayer, setLayerImage, clearLayerImage,
    paintSettings, setPaint,
    isBusy, cancelGesture,
    onSvgPointerDown, onSvgClick, onSvgDoubleClick, onSvgPointerMove, onSvgPointerLeave, onSvgContextMenu,
  };
}

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
  };
  useEffect(() => {
    const handler = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const t = e.target;
      const tag = t && t.tagName ? t.tagName.toUpperCase() : "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable)) return;
      const k = typeof e.key === "string" ? e.key.toLowerCase() : "";
      if (k === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((k === "z" && e.shiftKey) || k === "y") { e.preventDefault(); redo(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [data]);
  return { commit, undo, redo, canUndo: pastRef.current.length > 0, canRedo: futureRef.current.length > 0 };
}


// The strip under the editor toolbar (r046): built from named groups in
// rows, the layout a person can edit. The tools; the canvas presets on an
// image-less map, Undo and Redo, the Layers toggle and the active layer,
// Arrange; Fill, Stroke, Width, and Smooth, always in place and dimmed when
// the tool or the selection has no use for them, so nothing moves under the
// mouse; and the tool's own group, which changes with the tool: Done and
// Cancel with the point count while a polygon or line draft is open, the
// stamp picks, the tip and size and opacity, the text controls, the angle,
// the shape's layer, Delete. A visually hidden live region names the tool
// when it changes and the selection when it changes.
function MapToolStrip({ drawing, history, showPresets, presetValue, onPreset, canvasSize, onCustomSize, layersOpen, onToggleLayers, stamps, onStampsChange, layout, onLayout, flash }) {
  const { tool, setTool, current, applyStyle, editSelected, selectedShape, deleteSelected, layers, activeLayerId, setActiveLayerId, moveShapeToLayer, focusTextId, consumeFocusText, draft, finishDraft, cancelDraft } = drawing;
  const worldStamps = Array.isArray(stamps) ? stamps : [];
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tipPickerOpen, setTipPickerOpen] = useState(false);
  const [arrangeOpen, setArrangeOpen] = useState(false);
  const strip = mapStripLayout(layout);
  const kind = selectedShape ? selectedShape.type : tool;
  // The Custom canvas size fields: seeded from the canvas whenever Custom
  // opens or the size changes under them, applied by Set or Enter.
  const [customW, setCustomW] = useState(canvasSize ? String(canvasSize.width) : "");
  const [customH, setCustomH] = useState(canvasSize ? String(canvasSize.height) : "");
  useEffect(() => {
    if (!canvasSize) return;
    setCustomW(String(canvasSize.width));
    setCustomH(String(canvasSize.height));
  }, [presetValue === "custom", canvasSize ? canvasSize.width : 0, canvasSize ? canvasSize.height : 0]);
  const setCustomSize = () => { if (onCustomSize) onCustomSize(parseFloat(customW), parseFloat(customH)); };
  // The text field takes focus once, for the label that was just placed, so
  // typing replaces "Label". Not on any other mount: a label reselected or
  // brought back by undo would otherwise steal the next keyboard shortcut.
  const textRef = useRef(null);
  useEffect(() => {
    if (focusTextId && selectedShape && selectedShape.id === focusTextId && textRef.current) {
      textRef.current.focus();
      textRef.current.select();
      consumeFocusText();
    }
  }, [focusTextId, selectedShape]);
  const styleOn = tool !== "pin" && tool !== "pan" && (tool !== "select" || !!selectedShape);
  const fillOn = styleOn && kind !== "stroke" && kind !== "freehand" && kind !== "eraser";
  const strokeOn = styleOn && kind !== "fill" && kind !== "brush" && kind !== "eraser"; // a bucket fill lands with no stroke; give it one in Select
  const widthOn = styleOn && kind !== "stamp" && kind !== "fill" && kind !== "brush" && kind !== "eraser"; // a stamp's line weight is the symbol's own
  const smoothOn = styleOn && (kind === "rect" || kind === "polygon" || kind === "stroke" || kind === "freehand" || kind === "region");
  const isText = !!selectedShape && selectedShape.type === "text";
  const hasAngle = !!selectedShape && (selectedShape.type === "text" || selectedShape.type === "stamp");
  const draftOpen = !!draft && (draft.type === "polygon" || draft.type === "stroke");
  const { stampId, setStampId, paintSettings, setPaint } = drawing;
  const shapeLayer = selectedShape ? layers.find(l => l.shapes.some(s => s.id === selectedShape.id)) : null;
  const vectorLayers = layers.filter(l => l.kind !== "raster");
  // the live region: the tool when it changes, the selection when it changes; nothing on mount
  const [live, setLive] = useState("");
  const mountedRef = useRef(false);
  useEffect(() => { if (!mountedRef.current) return; const t = MAP_TOOLS.find(x => x.id === tool); setLive(`${t ? t.label : tool} tool`); }, [tool]);
  useEffect(() => { if (!mountedRef.current) { mountedRef.current = true; return; } setLive(mapDescribeShape(selectedShape, worldStamps)); }, [selectedShape ? selectedShape.id : null]);
  const swatches = (which, value, onPick, on) => (
    <span className="map-swatches" role="group" aria-label={which}>
      {MAP_PALETTE.map(c => (
        <button
          key={c.id}
          type="button"
          className={`map-swatch ${value === c.hex ? "active" : ""}`}
          style={{ background: c.hex }}
          title={c.label}
          aria-label={`${which}: ${c.label}`}
          aria-pressed={value === c.hex}
          disabled={!on}
          onClick={() => onPick(c.hex)}
        />
      ))}
      <button type="button" className={`map-swatch map-swatch-none ${value == null ? "active" : ""}`} title="None" aria-label={`${which}: none`} aria-pressed={value == null} disabled={!on} onClick={() => onPick(null)} />
    </span>
  );
  // The tool's own group, in order: the open draft, the brush, the stamp,
  // the label, the angle, the shape's layer, Delete.
  const toolGroup = () => {
    const parts = [];
    if (draftOpen) {
      const need = draft.type === "polygon" ? 3 : 2;
      parts.push(
        <React.Fragment key="draft">
          <span className="map-tools-label">{draft.type === "polygon" ? "Polygon" : "Line"}</span>
          <span className="map-tools-value">{draft.points.length} {draft.points.length === 1 ? "point" : "points"}</span>
          <button type="button" className="btn btn-small btn-accent" disabled={draft.points.length < need} onClick={() => finishDraft()} title={`Finish it (Enter, a double-click, or right-click); it needs ${need} points`}>Done</button>
          <button type="button" className="btn btn-small btn-ghost" onClick={cancelDraft} title="Discard it (Esc)">Cancel</button>
        </React.Fragment>
      );
    }
    if ((tool === "brush" || tool === "eraser") && !selectedShape) {
      // The tip: the built-in two inline, an armed imported tip first,
      // More... for the rest; then the size (the slider to 256, the field to
      // 1024) and the opacity. The Brush's color is the Fill.
      const tips = mapBuiltinTips();
      const alphaStamps = worldStamps.filter(s => s.kind === "alpha");
      const armed = alphaStamps.find(s => s.id === paintSettings.tipId) || null;
      const glyphFill = tool === "eraser" ? MAP_PALETTE[0].hex : current.fill;
      parts.push(
        <React.Fragment key="brush">
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
          <button type="button" className="btn btn-small btn-ghost" onClick={() => setTipPickerOpen(true)} title="Every tip: the built-in two and the imported alpha stamps; import more there">More{"…"}</button>
          {tipPickerOpen && <MapStampPicker stamps={alphaStamps} importInto={worldStamps} onImport={onStampsChange} flash={flash} builtins={tips} title="Choose a tip" current={paintSettings.tipId} fill={glyphFill} stroke={null} onPick={(id) => { setPaint({ tipId: id }); setTipPickerOpen(false); }} onClose={() => setTipPickerOpen(false)} />}
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
        </React.Fragment>
      );
    }
    if (tool === "stamp" || (selectedShape && selectedShape.type === "stamp")) {
      // Pick arms the stamp for the next placement and swaps the selected
      // stamp's symbol, which is also how a missing stamp is re-pointed.
      const pick = (id) => { setStampId(id); if (selectedShape && selectedShape.type === "stamp") editSelected({ stampId: id }); };
      const armed = worldStamps.find(s => s.id === stampId) || null;
      const missing = selectedShape && selectedShape.type === "stamp" && !mapStampDef(selectedShape.stampId, worldStamps) ? selectedShape.stampId : null;
      parts.push(
        <React.Fragment key="stamp">
          <span className="map-tools-label">Stamp</span>
          {armed && (
            <button type="button" className="map-stamp-pick active" title={`${armed.name} (${armed.pack || "imported"})`} onClick={() => setPickerOpen(true)}>
              <MapStampGlyph def={armed} fill={current.fill} stroke={current.stroke} size={22} />
            </button>
          )}
          {MAP_BUILTIN_STAMPS.map(st => (
            <button
              key={st.id}
              type="button"
              className={`map-stamp-pick ${stampId === st.id ? "active" : ""}`}
              title={st.name}
              onClick={() => pick(st.id)}
            >
              <MapStampGlyph def={st} fill={current.fill} stroke={current.stroke} size={22} />
            </button>
          ))}
          <button type="button" className="btn btn-small btn-ghost" onClick={() => setPickerOpen(true)} title="Every stamp, built in and imported; import more there">More{"…"}</button>
          {missing && <span className="map-tools-missing" title="This stamp's pack is not in the world; pick another symbol or delete the shape">missing: {missing}</span>}
          {pickerOpen && <MapStampPicker stamps={worldStamps} onImport={onStampsChange} flash={flash} current={stampId} fill={current.fill} stroke={current.stroke} onPick={(id) => { pick(id); setPickerOpen(false); }} onClose={() => setPickerOpen(false)} />}
        </React.Fragment>
      );
    }
    if (isText) {
      parts.push(
        <React.Fragment key="text">
          <span className="map-tools-label">Text</span>
          <input
            ref={textRef}
            className="input map-tools-text"
            value={selectedShape.text}
            onChange={e => editSelected({ text: e.target.value }, "text")}
            onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") e.target.blur(); }}
            placeholder="Label"
          />
          <span className="map-tools-label">Size</span>
          {MAP_TEXT_SIZES.map(sz => (
            <button key={sz} type="button" className={`btn btn-small ${selectedShape.fontSize === sz ? "btn-accent" : "btn-ghost"}`} onClick={() => editSelected({ fontSize: sz })}>{sz}</button>
          ))}
          <span className="map-tools-label">Arc</span>
          <input
            className="map-tools-range"
            type="range"
            min="-180" max="180" step="5"
            value={selectedShape.arc || 0}
            onChange={e => editSelected({ arc: parseInt(e.target.value, 10) || 0 }, "arc")}
            title="Bend the label along an arc: right arches it up, left bends it down"
          />
          <span className="map-tools-value">{selectedShape.arc || 0}°</span>
          {!!selectedShape.arc && <button type="button" className="btn btn-small btn-ghost" onClick={() => editSelected({ arc: 0 })} title="Straighten the label">Straight</button>}
        </React.Fragment>
      );
    }
    if (hasAngle) {
      parts.push(
        <React.Fragment key="angle">
          <span className="map-tools-label">Angle</span>
          <button type="button" className="btn btn-small btn-ghost" onClick={() => editSelected({ rotation: Math.round(((selectedShape.rotation || 0) - 15) * 100) / 100 })} title="Rotate 15 degrees counter-clockwise">−15</button>
          <input
            className="input map-tools-num"
            type="number"
            step="1"
            value={Math.round((selectedShape.rotation || 0) * 100) / 100}
            onChange={e => { const v = parseFloat(e.target.value); if (Number.isFinite(v)) editSelected({ rotation: v }, "rotation"); }}
            title="Angle in degrees"
          />
          <button type="button" className="btn btn-small btn-ghost" onClick={() => editSelected({ rotation: Math.round(((selectedShape.rotation || 0) + 15) * 100) / 100 })} title="Rotate 15 degrees clockwise">+15</button>
        </React.Fragment>
      );
    }
    if (selectedShape && vectorLayers.length > 1) {
      parts.push(
        <React.Fragment key="layer">
          <span className="map-tools-label">Layer</span>
          <select className="input map-tools-select" value={shapeLayer ? shapeLayer.id : ""} onChange={e => moveShapeToLayer(selectedShape.id, e.target.value)} title="Move this shape to another vector layer">
            {vectorLayers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </React.Fragment>
      );
    }
    if (selectedShape) parts.push(<button key="delete" type="button" className="btn btn-small btn-danger" onClick={deleteSelected} title="Delete the selected shape (Delete)">Delete shape</button>);
    return parts;
  };
  const group = (id) => {
    switch (id) {
      case "tools":
        return strip.tools.map(tid => MAP_TOOLS.find(t => t.id === tid)).filter(Boolean).map(t => (
          <button key={t.id} type="button" className={`btn btn-small ${tool === t.id ? "btn-accent" : "btn-ghost"}`} onClick={() => setTool(t.id)} title={`${t.label} (${t.key.toUpperCase()}) · ${t.hint}`}>{t.label}</button>
        ));
      case "canvas":
        return showPresets ? (
          <>
            <span className="map-tools-label">Canvas</span>
            <select className="input map-tools-select" value={presetValue} onChange={e => onPreset(e.target.value)} title="Canvas size, in drawing units">
              {MAP_CANVAS_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              <option value="custom">Custom…</option>
            </select>
            {presetValue === "custom" && canvasSize && (
              <>
                <input className="input map-tools-num" type="number" min="100" max="10000" step="1" value={customW} onChange={e => setCustomW(e.target.value)} onKeyDown={e => { if (e.key === "Enter") setCustomSize(); }} title="Canvas width, 100 to 10000" />
                <span className="map-tools-label">×</span>
                <input className="input map-tools-num" type="number" min="100" max="10000" step="1" value={customH} onChange={e => setCustomH(e.target.value)} onKeyDown={e => { if (e.key === "Enter") setCustomSize(); }} title="Canvas height, 100 to 10000" />
                <button type="button" className="btn btn-small btn-accent" onClick={setCustomSize} title="Apply this canvas size">Set</button>
              </>
            )}
          </>
        ) : null;
      case "history":
        return (
          <>
            <button type="button" className="btn btn-small btn-ghost" disabled={!history.canUndo} onClick={history.undo} title="Undo (Ctrl+Z)">Undo</button>
            <button type="button" className="btn btn-small btn-ghost" disabled={!history.canRedo} onClick={history.redo} title="Redo (Ctrl+Shift+Z or Ctrl+Y)">Redo</button>
          </>
        );
      case "layers":
        return (
          <>
            <button type="button" className={`btn btn-small ${layersOpen ? "btn-accent" : "btn-ghost"}`} onClick={onToggleLayers} title="Show or hide the layer list">Layers</button>
            <span className="map-tools-label">Layer</span>
            <select className="input map-tools-select" value={activeLayerId || ""} onChange={e => setActiveLayerId(e.target.value)} title="The layer new shapes go to">
              {layers.map(l => <option key={l.id} value={l.id}>{l.name}{l.kind === "raster" ? " (raster)" : ""}{l.visible ? "" : " (hidden)"}{l.locked ? " (locked)" : ""}</option>)}
            </select>
          </>
        );
      case "arrange":
        return <button type="button" className="btn btn-small btn-ghost" onClick={() => setArrangeOpen(true)} title="Arrange the strip: its rows, the order of its groups, and the order of the tools">Arrange{"…"}</button>;
      case "fill":
        return <><span className="map-tools-label">Fill</span>{swatches("Fill", current.fill, v => applyStyle({ fill: v }), fillOn)}</>;
      case "stroke":
        return <><span className="map-tools-label">Stroke</span>{swatches("Stroke", current.stroke, v => applyStyle({ stroke: v }), strokeOn)}</>;
      case "width":
        return (
          <>
            <span className="map-tools-label">Width</span>
            <input
              className="map-tools-range"
              type="range"
              min={MAP_STROKE_WIDTH_RANGE.min} max={MAP_STROKE_WIDTH_RANGE.max} step="1"
              value={Math.min(MAP_STROKE_WIDTH_RANGE.max, current.strokeWidth)}
              disabled={!widthOn}
              onChange={e => applyStyle({ strokeWidth: parseInt(e.target.value, 10) || MAP_STROKE_WIDTH_RANGE.min }, "width")}
              title="Line width, in drawing units"
            />
            <input
              className="input map-tools-num"
              type="number"
              min={MAP_STROKE_WIDTH_RANGE.min} max={MAP_STROKE_WIDTH_RANGE.limit} step="1"
              value={current.strokeWidth}
              disabled={!widthOn}
              onChange={e => { const v = parseInt(e.target.value, 10); if (Number.isFinite(v)) applyStyle({ strokeWidth: Math.max(MAP_STROKE_WIDTH_RANGE.min, Math.min(MAP_STROKE_WIDTH_RANGE.limit, v)) }, "width"); }}
              onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") e.target.blur(); }}
              title="Line width, 1 to 64"
            />
          </>
        );
      case "smooth":
        return <button type="button" className={`btn btn-small ${current.smooth && smoothOn ? "btn-accent" : "btn-ghost"}`} disabled={!smoothOn} aria-pressed={!!current.smooth} onClick={() => applyStyle({ smooth: !current.smooth })} title="Round the corners and curve the path through its points">Smooth</button>;
      case "tool":
        return toolGroup();
      default:
        return null;
    }
  };
  const groupOn = { fill: fillOn, stroke: strokeOn, width: widthOn, smooth: smoothOn };
  return (
    <div className="map-tools">
      {strip.rows.map((row, i) => (
        <div key={i} className="map-tools-row">
          {row.map(id => {
            const off = id in groupOn && !groupOn[id];
            return <span key={id} className={`map-tools-group${off ? " off" : ""}`} data-group={id} aria-disabled={off ? "true" : undefined}>{group(id)}</span>;
          })}
        </div>
      ))}
      <span className="sr-only" role="status" aria-live="polite">{live}</span>
      {arrangeOpen && <MapStripArrangeModal layout={strip} onChange={onLayout} onClose={() => setArrangeOpen(false)} />}
    </div>
  );
}

// The Arrange modal (r046): the strip's groups in their rows, each movable
// up or down, a row break before any position but the first (the breaks
// stay where they are when a group moves through them, so the rows keep
// their shape), and the tool buttons in their order. Every change lands in
// the strip behind the modal at once; Reset puts the shipped layout back.
function MapStripArrangeModal({ layout, onChange, onClose }) {
  const strip = mapStripLayout(layout);
  const label = (id) => { const g = MAP_STRIP_GROUPS.find(x => x.id === id); return g ? g.label : id; };
  const items = [];
  const breaks = new Set();
  strip.rows.forEach((row, ri) => row.forEach((id, i) => { if (ri > 0 && i === 0) breaks.add(items.length); items.push(id); }));
  const rowsOf = (list, br) => { const rows = []; list.forEach((id, i) => { if (i === 0 || br.has(i)) rows.push([]); rows[rows.length - 1].push(id); }); return rows; };
  const emit = (list, br, tools) => { if (onChange) onChange({ rows: rowsOf(list, br), tools: tools || strip.tools }); };
  const moveGroup = (i, dir) => { const j = i + dir; if (j < 0 || j >= items.length) return; const next = items.slice(); const [it] = next.splice(i, 1); next.splice(j, 0, it); emit(next, breaks); };
  const toggleBreak = (i) => { if (i === 0) return; const br = new Set(breaks); if (br.has(i)) br.delete(i); else br.add(i); emit(items, br); };
  const moveTool = (i, dir) => { const j = i + dir; if (j < 0 || j >= strip.tools.length) return; const next = strip.tools.slice(); const [t] = next.splice(i, 1); next.splice(j, 0, t); emit(items, breaks, next); };
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  let rowNo = 0;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">Arrange the strip</div>
        <div className="modal-body">
          <div className="map-arrange">
            <div className="map-arrange-col">
              <div className="modal-section-hdr">Groups and rows</div>
              {items.map((id, i) => {
                const start = i === 0 || breaks.has(i);
                if (start) rowNo += 1;
                return (
                  <React.Fragment key={id}>
                    {start && <div className="map-arrange-row">Row {rowNo}</div>}
                    <div className="map-arrange-item">
                      <button type="button" className="btn btn-small btn-ghost" disabled={i === 0} onClick={() => moveGroup(i, -1)} title="Move earlier" aria-label={`Move ${label(id)} earlier`}>▲</button>
                      <button type="button" className="btn btn-small btn-ghost" disabled={i === items.length - 1} onClick={() => moveGroup(i, 1)} title="Move later" aria-label={`Move ${label(id)} later`}>▼</button>
                      <span className="name">{label(id)}</span>
                      {i > 0 && <label className="map-arrange-break" title="Start a new row here"><input type="checkbox" checked={breaks.has(i)} onChange={() => toggleBreak(i)} /> new row</label>}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
            <div className="map-arrange-col">
              <div className="modal-section-hdr">Tools</div>
              {strip.tools.map((id, i) => {
                const t = MAP_TOOLS.find(x => x.id === id);
                return (
                  <div key={id} className="map-arrange-item">
                    <button type="button" className="btn btn-small btn-ghost" disabled={i === 0} onClick={() => moveTool(i, -1)} title="Move earlier" aria-label={`Move ${t ? t.label : id} earlier`}>▲</button>
                    <button type="button" className="btn btn-small btn-ghost" disabled={i === strip.tools.length - 1} onClick={() => moveTool(i, 1)} title="Move later" aria-label={`Move ${t ? t.label : id} later`}>▼</button>
                    <span className="name">{t ? t.label : id}</span>
                    {t && <span className="map-tools-value">{t.key.toUpperCase()}</span>}
                  </div>
                );
              })}
            </div>
          </div>
          <p className="map-stamps-note">The layout is yours, kept in this browser with the theme and the font size; it is not part of the world file.</p>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" style={{ marginRight: "auto" }} onClick={() => { if (onChange) onChange(null); }} title="The layout the editor ships with">Reset</button>
          <button type="button" className="btn btn-accent" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

// The grid the strip's More... button opens: every stamp, built in and
// imported, grouped by pack, with a filter on names and pack names (r046)
// and an Import button when the editor hands it the world's setter; a click
// arms a stamp (and swaps the selected stamp's symbol, as the inline buttons
// do) and closes. Escape clears the filter first, then closes.
function MapStampPicker({ stamps, current, fill, stroke, onPick, onClose, builtins, title, onImport, importInto, flash }) {
  const all = [{ id: "builtin", name: "Built in", stamps: builtins || MAP_BUILTIN_STAMPS }, ...mapStampGroups(stamps)];
  const [q, setQ] = useState("");
  const qRef = useRef("");
  qRef.current = q;
  const inputRef = useRef(null);
  useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") { if (qRef.current) setQ(""); else onClose(); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  const needle = q.trim().toLowerCase();
  const matches = (s, g) => !needle || String(s.name || "").toLowerCase().includes(needle) || String(g.name || "").toLowerCase().includes(needle);
  const groups = all.map(g => ({ ...g, stamps: g.stamps.filter(s => matches(s, g)) })).filter(g => g.stamps.length > 0);
  const total = all.reduce((n, g) => n + g.stamps.length, 0);
  const shown = groups.reduce((n, g) => n + g.stamps.length, 0);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">{title || "Choose a stamp"}</div>
        <div className="modal-body">
          <div className="map-stamp-filter">
            <input ref={inputRef} className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="Filter by name or pack" aria-label="Filter stamps by name or pack" />
            <span className="map-stamps-note map-stamp-count">{needle ? `${shown} of ${total}` : `${total} ${total === 1 ? "stamp" : "stamps"}`}</span>
          </div>
          {groups.length === 0 && <div className="map-stamps-empty">Nothing is named like "{q.trim()}".</div>}
          {groups.map(g => (
            <div key={g.id} className="modal-section">
              <div className="modal-section-hdr">{g.name}</div>
              <div className="map-stamp-grid">
                {g.stamps.map(s => (
                  <button key={s.id} type="button" className={`map-stamp-tile ${current === s.id ? "active" : ""}`} title={s.id} onClick={() => onPick(s.id)}>
                    <MapStampGlyph def={s} fill={fill} stroke={stroke} size={40} />
                    <span className="map-stamp-tile-name">{s.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          {onImport
            ? <MapStampImportButton stamps={importInto || stamps} onChange={onImport} flash={flash} className="btn btn-ghost" style={{ marginRight: "auto" }} label="Import pack or brushes" />
            : <span className="map-stamps-note" style={{ marginRight: "auto" }}>Import packs and brush files from the Stamps panel at the top of Cartographia.</span>}
          <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// The layer panel under the strip: one row per layer, top-most first (the
// last layer in the array draws on top). Pick the active layer, rename it in
// place, show or hide, lock or unlock, move it up or down the stack, delete
// it (asks when it has shapes; undo brings it back), or add one on top.
function MapLayerPanel({ drawing, onLoadImage, missing }) {
  const { layers, activeLayerId, setActiveLayerId, addLayer, renameLayer, toggleLayerVisible, toggleLayerLocked, moveLayer, deleteLayer, clearLayerImage } = drawing;
  const rows = [...layers].reverse();
  const lost = Array.isArray(missing) ? missing : [];
  return (
    <div className="map-layers">
      <div className="map-layers-head">
        <span className="map-tools-label">Layers</span>
        <span className="map-layers-note">Top of the stack first. Shapes go to the active layer.</span>
        <span style={{ flex: 1 }} />
        <button type="button" className="btn btn-small btn-ghost" onClick={() => addLayer("vector")}>+ Add layer</button>
        <button type="button" className="btn btn-small btn-ghost" onClick={() => addLayer("raster")} title="A layer that holds one bitmap: load a scan or a painting into it">+ Add raster layer</button>
      </div>
      {rows.map((l, i) => {
        const idx = layers.length - 1 - i;
        const active = l.id === activeLayerId;
        const raster = l.kind === "raster";
        const count = raster
          ? (l.image ? (lost.includes(l.image) ? "file missing" : "image") : "empty")
          : `${l.shapes.length} ${l.shapes.length === 1 ? "shape" : "shapes"}`;
        return (
          <div key={l.id} className={`map-layer-row ${active ? "active" : ""} ${l.visible ? "" : "hidden-layer"}`}>
            <button type="button" className={`map-layer-pick ${active ? "active" : ""}`} title={active ? "Active layer" : "Make this the active layer"} onClick={() => setActiveLayerId(l.id)}>{active ? "◉" : "○"}</button>
            <input
              className="input map-layer-name"
              value={l.name}
              onChange={e => renameLayer(l.id, e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") e.target.blur(); }}
              title="Layer name"
            />
            {raster && <span className="map-layer-kind" title="A raster layer holds one bitmap; the shape tools draw on vector layers">raster</span>}
            <span className="map-layer-count" title={raster && l.image && !l.image.startsWith("data:") ? l.image : undefined}>{count}</span>
            {raster && <button type="button" className="btn btn-small btn-ghost" onClick={() => onLoadImage && onLoadImage(l.id)} title="Load a PNG, JPEG, or WebP into this layer, scaled to the canvas width">Load image…</button>}
            {raster && <button type="button" className="btn btn-small btn-ghost" disabled={!l.image} onClick={() => clearLayerImage(l.id)} title="Empty this layer (undo brings the image back)">Clear</button>}
            <button type="button" className={`btn btn-small ${l.visible ? "btn-ghost" : "btn-accent"}`} onClick={() => toggleLayerVisible(l.id)} title={l.visible ? "Hide this layer (it stays out of the export too)" : "Show this layer"}>{l.visible ? "Hide" : "Hidden"}</button>
            <button type="button" className={`btn btn-small ${l.locked ? "btn-accent" : "btn-ghost"}`} onClick={() => toggleLayerLocked(l.id)} title={l.locked ? "Unlock this layer" : "Lock this layer (nothing on it can be selected or drawn)"}>{l.locked ? "Locked" : "Lock"}</button>
            <button type="button" className="btn btn-small btn-ghost" disabled={idx === layers.length - 1} onClick={() => moveLayer(l.id, 1)} title="Move up the stack">↑</button>
            <button type="button" className="btn btn-small btn-ghost" disabled={idx === 0} onClick={() => moveLayer(l.id, -1)} title="Move down the stack">↓</button>
            <button type="button" className="btn btn-small btn-danger" disabled={layers.length === 1} onClick={() => deleteLayer(l.id)} title={layers.length === 1 ? "The last layer stays" : "Delete this layer"}>×</button>
          </div>
        );
      })}
    </div>
  );
}


// The editor's overlay svg, same viewBox as the canvas. In the drawing tools
// it has no pointer events and draws the shape in progress in the current
// style, the rubber line to the cursor and the closing line for a polygon,
// the placed vertices (the first one larger, since clicking it closes the
// polygon), and the selection box. In Select it takes the pointer events and
// also carries an invisible hit copy of every selectable shape with a
// 14-pixel stroke that does not scale with zoom (a 4-unit line is under two
// screen pixels wide, and nobody should have to hit that), plus draggable
// point handles for the selected polygon or line.
function MapEditorOverlay({ width, height, drawing, view }) {
  const { tool, draft, cursor, selBox, style, selectable, selectedShape, onSvgPointerDown, onSvgContextMenu, paintSettings } = drawing;
  const f = mapNum;
  const items = [];
  // the visible rect (r045); handle sizes follow it so they keep their screen size at any zoom
  const v = view || { x: 0, y: 0, w: width, h: height };
  const vertexR = Math.max(0.5, v.w / 220);
  const selectMode = tool === "select";
  if (selectMode) {
    // A stamp is hit through its whole box, turned with it; a label through a
    // copy of its text (bent the same way, so the hit copies need their own
    // arc paths); everything else through a copy of its outline.
    const hitCtx = { idBase: "hit", defs: [], stampsUsed: new Map(), tints: new Map() };
    selectable.forEach(s => {
      if (s.type === "stamp") {
        const attrs = { "data-shape": s.id, "data-hit": "shape", x: f(s.x), y: f(s.y), width: f(s.w), height: f(s.h), fill: "transparent", stroke: "transparent", "stroke-width": "14", "vector-effect": "non-scaling-stroke" };
        if (s.rotation) attrs.transform = `rotate(${f(s.rotation)} ${f(s.x + s.w / 2)} ${f(s.y + s.h / 2)})`;
        items.push(mapTreeToReact({ tag: "rect", attrs }, `hit-${s.id}`));
        return;
      }
      const node = mapShapeNode(s, hitCtx);
      if (!node) return;
      const attrs = { ...node.attrs, fill: s.type === "stroke" || !s.fill ? "none" : "transparent", stroke: "transparent", "stroke-width": "14", "vector-effect": "non-scaling-stroke", "data-hit": "shape" };
      delete attrs.filter;
      items.push(mapTreeToReact({ ...node, attrs }, `hit-${s.id}`));
    });
    if (hitCtx.defs.length > 0) items.unshift(mapTreeToReact({ tag: "defs", children: hitCtx.defs }, "hit-defs"));
  }
  if (draft && draft.type === "stamp") {
    const x = Math.min(draft.x0, draft.x1), y = Math.min(draft.y0, draft.y1);
    const size = Math.max(Math.abs(draft.x1 - draft.x0), Math.abs(draft.y1 - draft.y0));
    const aspect = draft.aspect > 0 ? draft.aspect : 1;
    if (size >= 8) items.push(<rect key="draft" x={f(x)} y={f(y)} width={f(aspect >= 1 ? size : size * aspect)} height={f(aspect >= 1 ? size / aspect : size)} fill="none" stroke={style.stroke || MAP_PALETTE[0].hex} strokeWidth={1} strokeDasharray="6 6" vectorEffect="non-scaling-stroke" opacity={0.7} />);
  } else if (draft && (draft.type === "rect" || draft.type === "ellipse")) {
    const x = Math.min(draft.x0, draft.x1), y = Math.min(draft.y0, draft.y1);
    const w = Math.abs(draft.x1 - draft.x0), h = Math.abs(draft.y1 - draft.y0);
    const paint = { fill: style.fill || "none", stroke: style.stroke || "none", strokeWidth: style.strokeWidth, opacity: 0.6 };
    if (draft.type === "rect") {
      const r = style.smooth ? Math.min(w, h) / 8 : 0;
      items.push(<rect key="draft" x={f(x)} y={f(y)} width={f(w)} height={f(h)} rx={f(r)} ry={f(r)} {...paint} />);
    } else {
      items.push(<ellipse key="draft" cx={f(x + w / 2)} cy={f(y + h / 2)} rx={f(w / 2)} ry={f(h / 2)} {...paint} />);
    }
  } else if (draft && draft.type === "freehand") {
    items.push(<polyline key="draft" points={draft.points.map(p => `${f(p[0])},${f(p[1])}`).join(" ")} fill="none" stroke={style.stroke || MAP_PALETTE[0].hex} strokeWidth={style.strokeWidth} strokeLinejoin="round" strokeLinecap="round" opacity={0.7} />);
  } else if (draft) {
    const pts = draft.points;
    const trail = cursor ? [...pts, cursor] : pts;
    items.push(<polyline key="draft" points={trail.map(p => `${f(p[0])},${f(p[1])}`).join(" ")} fill="none" stroke={style.stroke || MAP_PALETTE[0].hex} strokeWidth={style.strokeWidth} strokeLinejoin="round" strokeLinecap="round" opacity={0.7} />);
    if (draft.type === "polygon" && cursor && pts.length >= 2) {
      items.push(<line key="close" x1={f(cursor[0])} y1={f(cursor[1])} x2={f(pts[0][0])} y2={f(pts[0][1])} stroke={style.stroke || MAP_PALETTE[0].hex} strokeWidth={1} strokeDasharray="6 6" vectorEffect="non-scaling-stroke" opacity={0.6} />);
    }
    pts.forEach((p, i) => {
      const first = i === 0 && draft.type === "polygon";
      items.push(<circle key={`v${i}`} cx={f(p[0])} cy={f(p[1])} r={f(first ? vertexR * 1.6 : vertexR)} fill={first ? "#c8a96e" : "#f4efe4"} stroke={MAP_PALETTE[0].hex} strokeWidth={1} vectorEffect="non-scaling-stroke" />);
    });
  }
  if ((tool === "brush" || tool === "eraser") && cursor) {
    // the brush outline between strokes: the dab's long side, in a halo and ink
    const r = Math.max(0.5, (paintSettings ? paintSettings.size : MAP_PAINT.defaultSize) / 2);
    items.push(<circle key="brush-halo" cx={f(cursor[0])} cy={f(cursor[1])} r={f(r)} fill="none" stroke="#f4efe4" strokeWidth={3} vectorEffect="non-scaling-stroke" opacity={0.85} />);
    items.push(<circle key="brush-ring" cx={f(cursor[0])} cy={f(cursor[1])} r={f(r)} fill="none" stroke={MAP_PALETTE[0].hex} strokeWidth={1} vectorEffect="non-scaling-stroke" opacity={0.9} />);
  }
  const frame = selectedShape ? mapShapeFrame(selectedShape, selBox) : null;
  if (frame) {
    // The frame turns with the shape. In Select its corners scale (not a
    // label's: its sizes are the fixed three) and, for a stamp or a label, a
    // knob above the top edge turns it. Each handle is a visible mark with a
    // transparent hit target on top, as the point handles are.
    const rot = selectedShape.rotation || 0;
    const hr = Math.max(0.5, v.w / 130);
    const g = [];
    g.push(<rect key="frame" x={f(frame.x)} y={f(frame.y)} width={f(frame.w)} height={f(frame.h)} fill="none" stroke="#c8a96e" strokeWidth={1} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" pointerEvents="none" />);
    if (selectMode && selectedShape.type !== "text") {
      [["nw", frame.x, frame.y], ["ne", frame.x + frame.w, frame.y], ["sw", frame.x, frame.y + frame.h], ["se", frame.x + frame.w, frame.y + frame.h]].forEach(([h, hx, hy]) => {
        g.push(<rect key={`c${h}`} x={f(hx - hr)} y={f(hy - hr)} width={f(hr * 2)} height={f(hr * 2)} fill="#f4efe4" stroke="#2b2420" strokeWidth={1} vectorEffect="non-scaling-stroke" pointerEvents="none" />);
        g.push(<rect key={`ch${h}`} x={f(hx - hr)} y={f(hy - hr)} width={f(hr * 2)} height={f(hr * 2)} fill="transparent" stroke="transparent" strokeWidth={14} vectorEffect="non-scaling-stroke" data-handle={h} />);
      });
    }
    if (selectMode && (selectedShape.type === "stamp" || selectedShape.type === "text")) {
      const kx = frame.x + frame.w / 2, ky = frame.y - Math.max(1, v.w / 60);
      g.push(<line key="kl" x1={f(kx)} y1={f(frame.y)} x2={f(kx)} y2={f(ky)} stroke="#c8a96e" strokeWidth={1} vectorEffect="non-scaling-stroke" pointerEvents="none" />);
      g.push(<circle key="kc" cx={f(kx)} cy={f(ky)} r={f(hr)} fill="#c8a96e" stroke="#2b2420" strokeWidth={1} vectorEffect="non-scaling-stroke" pointerEvents="none" />);
      g.push(<circle key="kh" cx={f(kx)} cy={f(ky)} r={f(hr)} fill="transparent" stroke="transparent" strokeWidth={16} vectorEffect="non-scaling-stroke" data-handle="rotate" />);
    }
    items.push(<g key="frame-g" transform={rot ? `rotate(${f(rot)} ${f(frame.cx)} ${f(frame.cy)})` : undefined}>{g}</g>);
  } else if (selBox) {
    items.push(<rect key="sel" x={f(selBox.x)} y={f(selBox.y)} width={f(selBox.w)} height={f(selBox.h)} fill="none" stroke="#c8a96e" strokeWidth={1} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" pointerEvents="none" />);
  }
  if (selectMode && selectedShape && Array.isArray(selectedShape.points) && selectedShape.points.length <= MAP_FREEHAND.handleCap) {
    // A visible dot, then its hit target on top: a transparent disk (the
    // stroke ring alone leaves the centre of a small circle unhittable in
    // Chromium) plus a transparent 16-pixel non-scaling stroke around it.
    const hr = Math.max(0.5, v.w / 130);
    selectedShape.points.forEach((p, i) => {
      items.push(<circle key={`h${i}`} cx={f(p[0])} cy={f(p[1])} r={f(hr)} fill="#f4efe4" stroke="#2b2420" strokeWidth={1} vectorEffect="non-scaling-stroke" pointerEvents="none" />);
      items.push(<circle key={`hh${i}`} cx={f(p[0])} cy={f(p[1])} r={f(hr)} fill="transparent" stroke="transparent" strokeWidth={16} vectorEffect="non-scaling-stroke" data-vertex={i} />);
    });
  }
  return (
    <svg
      className="map-overlay"
      viewBox={`${f(v.x)} ${f(v.y)} ${f(v.w)} ${f(v.h)}`}
      aria-hidden="true"
      onPointerDown={selectMode ? onSvgPointerDown : undefined}
      onContextMenu={selectMode ? onSvgContextMenu : undefined}
    >
      {items}
    </svg>
  );
}