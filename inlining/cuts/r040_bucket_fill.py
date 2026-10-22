"""r040: bucket fill (Cartographia+ cut 10 of the amendment; Drak's ask on the
r039 pass, 2026-10-22).

A Fill tool: click inside an enclosed area and a `region` shape lands there
with the current Fill color and no stroke. The region is traced, not
guessed: the drawing as it stands (visible layers, the image when there is
one, the background without its grain) is rasterized off-screen at up to
2048 pixels on the long side, flooded from the click with a small color
tolerance after the fillable area is shrunk by five pixels (so a gap in an
outline up to ten pixels wide seals itself; a hand-drawn loop rarely meets
its own start, and on Drak's pass every such loop leaked the fill across
the map), grown back by six so the fill tucks under the line that bounds
it, traced into closed rings (outer edges and holes, so an island in a lake
stays dry), simplified with the freehand simplifier, and stored as rings
rendered as one even-odd path, Smooth off: the trace is already within a
pixel of the boundary, and the midpoint smoothing bends straight edges into
curves (Drak's pass: a fill on an empty canvas came out as an oval, the
four-corner rectangle smoothed). It goes in just above the
shape you clicked when that shape has a fill, otherwise at the bottom of
the active layer, so lines stay on top of their fills; "the shape you
clicked" is found by hit-testing the active layer's painted shapes at the
click from the top down (isPointInFill, which honors a region's holes), not
by the DOM target, which is the line when you click near one and would have
put the fill under a parchment-colored land polygon (Drak's map, the Vell
Coast fixture). In Select it moves,
restyles (Fill, Stroke, Width, Smooth), deletes, and undoes; it has no point
handles. A gap wider than ten trace pixels still leaks; undo. In
Select a hollow shape (no fill) is now hit by its outline only, so the fill
beneath a hollow coastline can be selected; a filled shape is still hit
anywhere inside.

The trace svg carries its size on the root and xlink:href doubles, as the
download's svg does: an svg with only a viewBox draws nothing to a canvas in
Firefox, and a blank raster floods the whole map (Drak's pass: a hollow
smoothed polygon, closed by construction, still "leaked"; a raster with no
opaque pixel is now refused with a note instead).

`region` is a new shape type: { id, type, rings: [[[x, y], ...], ...], fill,
stroke, strokeWidth, smooth }. `rasterizeMapSvg` now draws through
`mapSvgToCanvas`, which the fill shares.

Decided at the fork (Drak, 2026-10-22, "Bucket fill"; the defaults taken):
trace at 2048 on the long side; above the clicked filled shape, else the
layer's bottom; a fixed color tolerance; holes traced.

Declared scope: 16_trunk (+MAP_FILL, +mapSvgToCanvas, +mapMatchMask,
+mapFloodMask, +mapDilateMask, +mapTraceMask), shell.html.

String-anchored edits; every anchor must occur exactly once. Run from the
repository root against the r039 tree: python3 inlining/cuts/r040_bucket_fill.py
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


RASTER_HELPERS = r'''// The bucket fill's numbers: the trace raster's long side in pixels (the
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

'''

edit(MOD / "16_trunk.jsx", [
    # the shape type
    ("""const MAP_SHAPE_TYPES = ["rect", "ellipse", "polygon", "stroke", "text", "stamp"];""",
     """const MAP_SHAPE_TYPES = ["rect", "ellipse", "polygon", "stroke", "text", "stamp", "region"];"""),
    # the normalizer: rings
    ("""  if (type === "rect" || type === "polygon" || type === "stroke") {
    out.smooth = s.smooth === true;
  }""",
     """  if (type === "rect" || type === "polygon" || type === "stroke") {
    out.smooth = s.smooth === true;
  }
  if (type === "region") {
    const rings = (Array.isArray(s.rings) ? s.rings : [])
      .map(r => (Array.isArray(r) ? r : []).filter(p => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])).map(p => [p[0], p[1]]))
      .filter(r => r.length >= 3);
    if (rings.length === 0) return null;
    out.rings = rings;
    out.smooth = s.smooth === true;
  }"""),
    # the renderer: one even-odd path
    ("""    case "stroke": {
      const linePaint = { ...paint, fill: "none" };""",
     """    case "region": {
      const d = s.rings.map(r => (s.smooth ? mapSmoothPath(r, true) : `M${r.map(p => `${f(p[0])} ${f(p[1])}`).join(" L")} Z`)).join(" ");
      return { tag: "path", attrs: { ...common, d, "fill-rule": "evenodd", ...paint } };
    }
    case "stroke": {
      const linePaint = { ...paint, fill: "none" };"""),
    # the tool, after Freehand
    ("""  { id: "freehand", label: "Freehand", hint: "Drag on the map to draw a line freehand · Esc while dragging discards it · Right-click when done" },""",
     """  { id: "freehand", label: "Freehand", hint: "Drag on the map to draw a line freehand · Esc while dragging discards it · Right-click when done" },
  { id: "fill",    label: "Fill",    hint: "Click inside an area to fill it with the Fill color · The fill goes under the lines around it, and small gaps in them close · Right-click when done" },"""),
    # translate: rings
    ("""  if (s.type === "polygon" || s.type === "stroke") return { ...s, points: s.points.map(p => [r(p[0] + dx), r(p[1] + dy)]) };""",
     """  if (s.type === "polygon" || s.type === "stroke") return { ...s, points: s.points.map(p => [r(p[0] + dx), r(p[1] + dy)]) };
  if (s.type === "region") return { ...s, rings: s.rings.map(ring => ring.map(p => [r(p[0] + dx), r(p[1] + dy)])) };"""),
    # the helpers, ahead of translateMapShape (after the freehand simplifier)
    ("""// Shift a normalized shape by (dx, dy) viewBox units, rounded to two decimals
// so stored coordinates stay short.
function translateMapShape(s, dx, dy) {""",
     RASTER_HELPERS + """// Shift a normalized shape by (dx, dy) viewBox units, rounded to two decimals
// so stored coordinates stay short.
function translateMapShape(s, dx, dy) {"""),
    # the hook takes the fill's context from the editor
    ("""function useMapDrawing({ data, onChange, svgRef, canvasRef, width, height }) {
  const [tool, setToolState] = useState("pin");""",
     """function useMapDrawing({ data, onChange, svgRef, canvasRef, width, height, fillContext }) {
  const [tool, setToolState] = useState("pin");
  const [filling, setFilling] = useState(false); // a bucket fill in flight; a second click waits
  const [fillNote, setFillNote] = useState(null); // why the last fill did nothing, in the hint until the next click or tool"""),
    # the fill itself, before the click handler
    ("""  const onSvgClick = (e) => {
    if (tool === "text") {""",
     """  // The bucket fill. The drawing as it stands is rasterized off-screen (the
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
      const el = svg.querySelector(`[data-shape="${s.id.replace(/["\\\\]/g, "")}"]`);
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
        id: "fill", imageHref: fc.imageHref, imageWidth: fc.imageWidth, imageHeight: fc.imageHeight, stamps: fc.stamps,
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
    if (tool === "text") {"""),
    # a tool change clears the fill's note
    ("""  const setTool = (t) => {
    setToolState(t);
    setDraft(null);""",
     """  const setTool = (t) => {
    setToolState(t);
    setFillNote(null);
    setDraft(null);"""),
    # the hint while filling
    ("""  const toolDef = MAP_TOOLS.find(t => t.id === tool) || MAP_TOOLS[0];
  let hint = toolDef.hint;
  if (tool !== "pin" && !targetLayer) {""",
     """  const toolDef = MAP_TOOLS.find(t => t.id === tool) || MAP_TOOLS[0];
  let hint = toolDef.hint;
  if (fillNote) hint = fillNote;
  if (filling) hint = "Filling\\u2026";
  if (tool !== "pin" && !targetLayer) {"""),
    # the strip: Fill shows the swatches and nothing else; a region has everything
    ("""  const showFill = kind !== "stroke" && kind !== "freehand";
  const showSmooth = kind === "rect" || kind === "polygon" || kind === "stroke" || kind === "freehand";
  const isText = !!selectedShape && selectedShape.type === "text";
  const hasAngle = !!selectedShape && (selectedShape.type === "text" || selectedShape.type === "stamp");
  const showWidth = kind !== "stamp"; // a stamp's line weight is the symbol's own""",
     """  const showFill = kind !== "stroke" && kind !== "freehand";
  const showStroke = kind !== "fill"; // a bucket fill lands with no stroke; give it one in Select
  const showSmooth = kind === "rect" || kind === "polygon" || kind === "stroke" || kind === "freehand" || kind === "region";
  const isText = !!selectedShape && selectedShape.type === "text";
  const hasAngle = !!selectedShape && (selectedShape.type === "text" || selectedShape.type === "stamp");
  const showWidth = kind !== "stamp" && kind !== "fill"; // a stamp's line weight is the symbol's own"""),
    ("""          <span className="map-tools-label">Stroke</span>{swatches(current.stroke, v => applyStyle({ stroke: v }))}""",
     """          {showStroke && <><span className="map-tools-label">Stroke</span>{swatches(current.stroke, v => applyStyle({ stroke: v }))}</>}"""),
    # Select: a hollow shape is hit by its outline only, so the fill beneath it can be selected
    ("""      const attrs = { ...node.attrs, fill: s.type === "stroke" ? "none" : "transparent", stroke: "transparent", "stroke-width": "14", "vector-effect": "non-scaling-stroke", "data-hit": "shape" };""",
     """      const attrs = { ...node.attrs, fill: s.type === "stroke" || !s.fill ? "none" : "transparent", stroke: "transparent", "stroke-width": "14", "vector-effect": "non-scaling-stroke", "data-hit": "shape" };"""),
    # the download's png draws through the shared rasterizer
    ("""function rasterizeMapSvg(svg, width, height, scale) {
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
        canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error("the browser produced no image"))), "image/png");
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("the svg would not decode")); };
    img.src = url;
  });
}""",
     """function rasterizeMapSvg(svg, width, height, scale) {
  return mapSvgToCanvas(svg, width, height, scale).then(canvas => new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error("the browser produced no image"))), "image/png");
  }));
}"""),
    # the editor supplies the fill's context: the image as a data URL, its size, the stamps
    ("""  const drawing = useMapDrawing({ data, onChange: commit, svgRef: imgRef, canvasRef, width: canvasTree.width, height: canvasTree.height });""",
     """  // What the bucket fill rasterizes besides the drawing: the image as a data
  // URL (a folder image's blob URL cannot be loaded inside a sealed svg, so it
  // is read once per image and kept), its natural size, and the stamps.
  const fillImageRef = useRef({ url: null, data: null });
  const fillContext = async () => {
    let imageHref = null;
    if (data.image && imageUrl && imageSize) {
      if (imageUrl.startsWith("data:")) {
        imageHref = imageUrl;
      } else {
        if (fillImageRef.current.url !== imageUrl) {
          try {
            fillImageRef.current = { url: imageUrl, data: await fileToDataUrl(await (await fetch(imageUrl)).blob()) };
          } catch (err) {
            fillImageRef.current = { url: imageUrl, data: null };
          }
        }
        imageHref = fillImageRef.current.data;
      }
    }
    return { imageHref, imageWidth: imageSize ? imageSize.width : null, imageHeight: imageSize ? imageSize.height : null, stamps };
  };
  const drawing = useMapDrawing({ data, onChange: commit, svgRef: imgRef, canvasRef, width: canvasTree.width, height: canvasTree.height, fillContext });"""),
])

edit(SHELL, [
    (""".map-canvas.tool-rect,.map-canvas.tool-ellipse,.map-canvas.tool-polygon,.map-canvas.tool-stroke,.map-canvas.tool-freehand{cursor:crosshair}""",
     """.map-canvas.tool-rect,.map-canvas.tool-ellipse,.map-canvas.tool-polygon,.map-canvas.tool-stroke,.map-canvas.tool-freehand{cursor:crosshair}
.map-canvas.tool-fill{cursor:cell}"""),
])

print("r040 applied")
