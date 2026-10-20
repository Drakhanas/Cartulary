"""r032: the SVG map canvas (Cartographia+ cut 2).

One node tree, two serializers. buildMapDrawingTree() turns mapData.drawing
(plus the map image when there is one) into {tag, attrs, children};
mapTreeToReact() renders it in MapView and MapEditor in place of the <img>,
and mapTreeToString() writes it into the HTML export in place of the <img>.
Image-less maps render on their background (vellum by default) instead of the
"No map image set" empty state, so pins can be placed on a drawn canvas. The
viewBox is the image's natural pixel size when an image exists, else the
drawing's stored size; the editor records the natural size into the drawing
the first time an image loads while the drawing is still empty.

Declared scope: 16_trunk, 08_export-layer. shell.html unchanged (the existing
.map-image rule already sizes the svg).

String-anchored edits; every anchor must occur exactly once. Run from the
repository root: python3 inlining/cuts/r032_svg_canvas.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
MOD = ROOT / "cartulary-src" / "modules"


def header(title):
    line = "// ─── " + title + " "
    return line + "─" * (82 - len(line))


def edit(path, pairs):
    s = path.read_text(encoding="utf-8")
    for old, new in pairs:
        c = s.count(old)
        assert c == 1, f"{path.name}: anchor occurs {c} times: {old[:80]!r}"
        s = s.replace(old, new)
    path.write_text(s, encoding="utf-8")


RENDERER = header("Map drawing renderer (v1.6 pillar 3)") + r"""
// One tree, two serializers. buildMapDrawingTree() turns a drawing (plus the
// map image, when there is one) into a plain node tree {tag, attrs, children};
// mapTreeToReact() renders that tree in the app and mapTreeToString() writes it
// into the HTML export. Nothing else draws a map, so the two cannot drift.
// Attribute names are SVG's own (stroke-width, font-family) and the React
// serializer camel-cases them. Shapes arrive normalized by ensureMapShape, so
// every number is finite and every color is hex or null; the renderer draws
// what the data says and invents nothing, except that a text shape with no
// fill is drawn in ink, because invisible text is never what anyone meant.
//
// Canvas size: the image's natural pixel size when an image exists (pins are
// 0-1 normalized to the canvas rect, which is the image's rect today, and that
// must not move), else the drawing's stored width and height. The editor
// records the natural size into the drawing the first time an image loads
// while the drawing is still empty, so removing the image later keeps the
// shapes' units; the view never writes.

function mapNum(n) {
  return String(Math.round(n * 100) / 100);
}

function mapEscapeXml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// True when any layer, visible or not, holds a shape. The export skips an
// image-less map with no pins and no content; MapEditor's size heal only runs
// while this is false.
function mapDrawingHasContent(drawing) {
  const d = ensureDrawingShape(drawing);
  return d.layers.some(l => l.shapes.length > 0);
}

// Quadratic path through the midpoints of consecutive segments, with the
// vertices as control points. Open for strokes, closed for polygons.
function mapSmoothPath(points, closed) {
  const n = points.length;
  const f = mapNum;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  if (n < 2) return "";
  if (n === 2) return `M${f(points[0][0])} ${f(points[0][1])} L${f(points[1][0])} ${f(points[1][1])}`;
  const parts = [];
  if (closed) {
    const start = mid(points[n - 1], points[0]);
    parts.push(`M${f(start[0])} ${f(start[1])}`);
    for (let i = 0; i < n; i++) {
      const c = points[i];
      const e = mid(c, points[(i + 1) % n]);
      parts.push(`Q${f(c[0])} ${f(c[1])} ${f(e[0])} ${f(e[1])}`);
    }
    parts.push("Z");
  } else {
    parts.push(`M${f(points[0][0])} ${f(points[0][1])}`);
    for (let i = 1; i < n - 1; i++) {
      const c = points[i];
      const e = mid(c, points[i + 1]);
      parts.push(`Q${f(c[0])} ${f(c[1])} ${f(e[0])} ${f(e[1])}`);
    }
    parts.push(`L${f(points[n - 1][0])} ${f(points[n - 1][1])}`);
  }
  return parts.join(" ");
}

// Paper grain: fractal noise tinted a warm brown, alpha scaled by the grain
// amount, laid over the background fill as a second rect. sRGB interpolation
// so the tint reads the same in-app and in the export.
function mapGrainFilterNode(id, grain) {
  const a = mapNum(0.6 * grain);
  return {
    tag: "filter",
    attrs: { id, x: "0", y: "0", width: "100%", height: "100%", "color-interpolation-filters": "sRGB" },
    children: [
      { tag: "feTurbulence", attrs: { type: "fractalNoise", baseFrequency: "0.65", numOctaves: "3", seed: "11", stitchTiles: "stitch", result: "noise" } },
      { tag: "feColorMatrix", attrs: { in: "noise", type: "matrix", values: `0 0 0 0 0.36  0 0 0 0 0.27  0 0 0 0 0.16  0 0 0 ${a} 0` } },
    ],
  };
}

// One normalized shape to one node, or null for a type nothing renders yet
// (stamps arrive at cut 5).
function mapShapeNode(s) {
  const f = mapNum;
  const paint = { fill: s.fill || "none", stroke: s.stroke || "none" };
  if (s.stroke) {
    paint["stroke-width"] = f(s.strokeWidth);
    paint["stroke-linejoin"] = "round";
    paint["stroke-linecap"] = "round";
  }
  const common = { "data-shape": s.id };
  switch (s.type) {
    case "rect": {
      const attrs = { ...common, x: f(s.x), y: f(s.y), width: f(s.w), height: f(s.h), ...paint };
      if (s.smooth) {
        const r = f(Math.min(s.w, s.h) / 8);
        attrs.rx = r;
        attrs.ry = r;
      }
      return { tag: "rect", attrs };
    }
    case "ellipse":
      return { tag: "ellipse", attrs: { ...common, cx: f(s.x + s.w / 2), cy: f(s.y + s.h / 2), rx: f(s.w / 2), ry: f(s.h / 2), ...paint } };
    case "polygon":
      if (s.smooth) return { tag: "path", attrs: { ...common, d: mapSmoothPath(s.points, true), ...paint } };
      return { tag: "polygon", attrs: { ...common, points: s.points.map(p => `${f(p[0])},${f(p[1])}`).join(" "), ...paint } };
    case "stroke": {
      const linePaint = { ...paint, fill: "none" };
      if (s.smooth) return { tag: "path", attrs: { ...common, d: mapSmoothPath(s.points, false), ...linePaint } };
      return { tag: "polyline", attrs: { ...common, points: s.points.map(p => `${f(p[0])},${f(p[1])}`).join(" "), ...linePaint } };
    }
    case "text": {
      const attrs = {
        ...common,
        x: f(s.x), y: f(s.y),
        "font-family": "'Cormorant Garamond', serif",
        "font-size": f(s.fontSize),
        fill: s.fill || MAP_PALETTE[0].hex,
      };
      if (s.stroke) {
        attrs.stroke = s.stroke;
        attrs["stroke-width"] = f(s.strokeWidth);
        attrs["stroke-linejoin"] = "round";
        attrs["paint-order"] = "stroke";
      }
      if (s.rotation) attrs.transform = `rotate(${f(s.rotation)} ${f(s.x)} ${f(s.y)})`;
      return { tag: "text", attrs, children: [s.text] };
    }
    default:
      return null;
  }
}

// opts: { id, className, label, imageHref, imageWidth, imageHeight }. With an
// image the canvas is the image's natural size and the background is not
// drawn; without one the background rect (and its grain) comes first. Then one
// <g> per visible layer, in order. The returned root also carries width and
// height so a caller can read the canvas size it rendered at.
function buildMapDrawingTree(drawing, opts) {
  const o = opts || {};
  const d = ensureDrawingShape(drawing);
  const f = mapNum;
  const hasImage = typeof o.imageHref === "string" && o.imageHref.length > 0;
  const width = hasImage && Number.isFinite(o.imageWidth) && o.imageWidth > 0 ? o.imageWidth : d.width;
  const height = hasImage && Number.isFinite(o.imageHeight) && o.imageHeight > 0 ? o.imageHeight : d.height;
  const idBase = `map-${String(o.id || "canvas").replace(/[^A-Za-z0-9_-]/g, "")}`;
  const defs = [];
  const children = [];
  if (hasImage) {
    children.push({ tag: "image", attrs: { "data-role": "image", href: o.imageHref, x: "0", y: "0", width: f(width), height: f(height) } });
  } else {
    children.push({ tag: "rect", attrs: { "data-role": "background", x: "0", y: "0", width: f(width), height: f(height), fill: d.background.fill } });
    if (d.background.grain > 0) {
      const fid = `${idBase}-grain`;
      defs.push(mapGrainFilterNode(fid, d.background.grain));
      children.push({ tag: "rect", attrs: { "data-role": "grain", x: "0", y: "0", width: f(width), height: f(height), filter: `url(#${fid})` } });
    }
  }
  d.layers.forEach(layer => {
    if (!layer.visible) return;
    children.push({ tag: "g", attrs: { "data-layer": layer.id }, children: layer.shapes.map(mapShapeNode).filter(Boolean) });
  });
  const attrs = { xmlns: "http://www.w3.org/2000/svg", viewBox: `0 0 ${f(width)} ${f(height)}`, role: "img" };
  if (o.className) attrs.class = o.className;
  if (o.label) attrs["aria-label"] = o.label;
  return { tag: "svg", attrs, children: defs.length > 0 ? [{ tag: "defs", children: defs }, ...children] : children, width, height };
}

// Static markup for the HTML export. Text and attribute values are escaped;
// empty elements self-close, which HTML's parser honors for SVG content.
function mapTreeToString(node) {
  if (node == null) return "";
  if (typeof node === "string") return mapEscapeXml(node);
  const attrs = Object.entries(node.attrs || {})
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => ` ${k}="${mapEscapeXml(v)}"`)
    .join("");
  const kids = (node.children || []).map(mapTreeToString).join("");
  return kids ? `<${node.tag}${attrs}>${kids}</${node.tag}>` : `<${node.tag}${attrs}/>`;
}

// React elements for the app. SVG's dashed attribute names become React's
// camel-cased props (data-* and aria-* stay as they are); `extra` lands on the
// root, which is how the editor attaches its ref.
function mapTreeToReact(node, key, extra) {
  if (node == null) return null;
  if (typeof node === "string") return node;
  const props = { key };
  Object.entries(node.attrs || {}).forEach(([k, v]) => {
    if (v == null || v === "") return;
    let name = k;
    if (k === "class") name = "className";
    else if (k.includes("-") && !k.startsWith("data-") && !k.startsWith("aria-")) name = k.replace(/-([a-z])/g, (m, c) => c.toUpperCase());
    props[name] = v;
  });
  if (extra) Object.assign(props, extra);
  const children = (node.children || []).map((c, i) => mapTreeToReact(c, i));
  return React.createElement(node.tag, props, ...children);
}

// Natural pixel size of the image at `url`, or null until it loads. The
// canvas waits for it, because the viewBox is the natural size and a canvas
// that resized after first paint would move every pin. A load failure reports
// through onError (the "Image not found" state), which the folder-path case
// never had before.
function useImageNaturalSize(url, onError) {
  const [size, setSize] = useState(null);
  useEffect(() => {
    setSize(null);
    if (!url) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => { if (!cancelled) setSize({ width: img.naturalWidth, height: img.naturalHeight }); };
    img.onerror = () => { if (!cancelled && onError) onError(); };
    img.src = url;
    return () => { cancelled = true; };
  }, [url]);
  return size;
}
"""

MAP_VIEW_HEADER = "\n" + header("Map view") + "\n"

edit(MOD / "16_trunk.jsx", [
    # 1. the renderer block, between the drawing model and the Map view header
    (MAP_VIEW_HEADER, "\n" + RENDERER + MAP_VIEW_HEADER),

    # 2. MapView: normalized mapData, natural size, readiness, the tree
    ("""function MapView({ entry, dirHandle, imageFolder, entries, templates, calendar, onOpenEntry, state, onUpdateViewPrefs }) {
  const mapData = entry.mapData || { image: null, pins: [] };
  const { url: imageUrl, errored } = useMapImageUrl(mapData.image, dirHandle, imageFolder);
  const pins = mapData.pins || [];
  const canvasRef = useRef(null);
  const [sizePct, setSizePct] = useState(100);
""",
     """function MapView({ entry, dirHandle, imageFolder, entries, templates, calendar, onOpenEntry, state, onUpdateViewPrefs }) {
  const mapData = useMemo(() => ensureMapData(entry.mapData), [entry.mapData]);
  const { url: imageUrl, errored, setErrored } = useMapImageUrl(mapData.image, dirHandle, imageFolder);
  const imageSize = useImageNaturalSize(mapData.image ? imageUrl : null, () => setErrored(true));
  // The canvas renders once the image, if there is one, has loaded with a
  // known natural size; an image-less map renders at once on its background.
  const canvasReady = !mapData.image || (!errored && !!imageUrl && !!imageSize);
  const canvasTree = useMemo(() => buildMapDrawingTree(mapData.drawing, {
    id: entry.id,
    className: "map-image",
    label: entry.name,
    imageHref: mapData.image ? imageUrl : null,
    imageWidth: imageSize ? imageSize.width : null,
    imageHeight: imageSize ? imageSize.height : null,
  }), [mapData, entry.id, entry.name, imageUrl, imageSize]);
  const pins = mapData.pins || [];
  const canvasRef = useRef(null);
  const [sizePct, setSizePct] = useState(100);
"""),
    ("""  // Effect deps include imageUrl because the map-canvas div is gated behind
  // the early `if (!imageUrl) return <map-empty>` — first mount has no canvas
  // and the ref is null. The effect re-runs when imageUrl arrives and binds
  // to the now-mounted canvas div.
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
  }, [imageUrl]);

  // View-level calendar selector.""",
     """  // Effect deps include canvasReady because the map-canvas div is gated
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
  }, [canvasReady]);

  // View-level calendar selector."""),
    ("""  if (!mapData.image) {
    return (
      <div className="map-empty">
        <div className="map-empty-glyph">▣</div>
        <div>No map image set.</div>
      </div>
    );
  }
  if (errored) {
    return (
      <div className="map-empty">
        <div className="map-empty-glyph">▣</div>
        <div>Image not found: <code>{mapData.image}</code></div>
        <div style={{ fontSize: 11, marginTop: 4 }}>
          {dirHandle ? "Check the connected image folder." : "No image folder connected — set one in Settings."}
        </div>
      </div>
    );
  }
  if (!imageUrl) return <div className="map-empty">Loading...</div>;
""",
     """  if (mapData.image && errored) {
    return (
      <div className="map-empty">
        <div className="map-empty-glyph">▣</div>
        <div>Image not found: <code>{mapData.image}</code></div>
        <div style={{ fontSize: 11, marginTop: 4 }}>
          {dirHandle ? "Check the connected image folder." : "No image folder connected — set one in Settings."}
        </div>
      </div>
    );
  }
  if (!canvasReady) return <div className="map-empty">Loading...</div>;
"""),
    ("""          <img className="map-image" src={imageUrl} alt={entry.name} />
          {visiblePins.map(({ pin, state }) => {""",
     """          {mapTreeToReact(canvasTree, "canvas")}
          {visiblePins.map(({ pin, state }) => {"""),

    # 3. MapEditor: normalized data, natural size, readiness, the tree, the heal
    ("""  const [sizePct, setSizePct] = useState(100);
  const data = mapData || { image: null, pins: [] };
  const pins = data.pins || [];
  const { url: imageUrl, errored } = useMapImageUrl(data.image, dirHandle, imageFolder);

  // Ctrl+scroll zoom — mirrors MapView. Wrapper-width approach keeps the
  // pin-placement and drag math zoom-independent: handlers read imgRef's
  // getBoundingClientRect, which already reflects the actual rendered image
  // size at any zoom level, so click→fraction conversion still works.
  //
  // Effect deps include imageUrl because the map-canvas div is gated behind
  // `{data.image && !errored && imageUrl && ...}` — a fresh MapEditor on a
  // new map has no canvas yet, so the ref is null on first mount. The effect
  // re-runs when imageUrl arrives and binds to the now-mounted canvas div.
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
  }, [imageUrl]);
  const handleResizeStart = useResizeHandler(canvasRef, sizePct, setSizePct);
""",
     """  const [sizePct, setSizePct] = useState(100);
  const data = useMemo(() => ensureMapData(mapData), [mapData]);
  const pins = data.pins || [];
  const { url: imageUrl, errored, setErrored } = useMapImageUrl(data.image, dirHandle, imageFolder);
  const imageSize = useImageNaturalSize(data.image ? imageUrl : null, () => setErrored(true));
  const canvasReady = !data.image || (!errored && !!imageUrl && !!imageSize);
  const canvasTree = useMemo(() => buildMapDrawingTree(data.drawing, {
    id: "editor",
    className: "map-image",
    imageHref: data.image ? imageUrl : null,
    imageWidth: imageSize ? imageSize.width : null,
    imageHeight: imageSize ? imageSize.height : null,
  }), [data, imageUrl, imageSize]);

  // Size heal, once: the first time an image loads while the drawing is still
  // empty, record its natural size as the drawing's size (the renderer already
  // draws at that size; this keeps the units if the image is removed later).
  // Once the drawing has content the size is fixed and this never fires.
  useEffect(() => {
    if (!data.image || !imageSize) return;
    const d = data.drawing;
    if (mapDrawingHasContent(d)) return;
    if (d.width === imageSize.width && d.height === imageSize.height) return;
    onChange({ ...data, drawing: { ...d, width: imageSize.width, height: imageSize.height } });
  }, [data, imageSize, onChange]);

  // Ctrl+scroll zoom, mirroring MapView. Wrapper-width approach keeps the
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
  const handleResizeStart = useResizeHandler(canvasRef, sizePct, setSizePct);
"""),
    ("""    if (!confirm("Remove the map image? Pins will stay but won't be visible until a new image is set.")) return;""",
     """    if (!confirm("Remove the map image? The drawing and the pins stay on the canvas.")) return;"""),
    ("""        <span className="map-editor-hint">
          {data.image
            ? "Click on map to add pin · Click pin to edit · Drag pin to move"
            : "Set an image to start placing pins"}
        </span>
      </div>

      {data.image && (
        errored ? (
          <div className="map-empty" style={{ borderTop: "none", borderRadius: "0 0 3px 3px" }}>
            <div>Image not found: <code>{data.image}</code></div>
            <button className="btn btn-ghost" onClick={setImage}>Pick a different image</button>
          </div>
        ) : imageUrl ? (
          <div className="map-canvas" ref={canvasRef} onClick={handleCanvasClick} style={{ borderRadius: "0 0 3px 3px", width: `${sizePct}%` }}>
            <div style={{ position: "relative", width: `${mapZoom * 100}%`, transition: "width 100ms ease" }}>
              <img ref={imgRef} className="map-image" src={imageUrl} alt="" draggable={false} />
              {pins.map(pin => (""",
     """        <span className="map-editor-hint">
          Click on map to add pin · Click pin to edit · Drag pin to move
        </span>
      </div>

      {data.image && errored ? (
        <div className="map-empty" style={{ borderTop: "none", borderRadius: "0 0 3px 3px" }}>
          <div>Image not found: <code>{data.image}</code></div>
          <button className="btn btn-ghost" onClick={setImage}>Pick a different image</button>
        </div>
      ) : !canvasReady ? (
        <div className="map-empty" style={{ borderTop: "none" }}>Loading image...</div>
      ) : (
          <div className="map-canvas" ref={canvasRef} onClick={handleCanvasClick} style={{ borderRadius: "0 0 3px 3px", width: `${sizePct}%` }}>
            <div style={{ position: "relative", width: `${mapZoom * 100}%`, transition: "width 100ms ease" }}>
              {mapTreeToReact(canvasTree, "canvas", { ref: imgRef })}
              {pins.map(pin => ("""),
    ("""            {sizePct < 100 && <div className="map-size-indicator">{Math.round(sizePct)}%</div>}
            <div className="map-resize-handle" onMouseDown={handleResizeStart} title="Drag to resize · double-click to reset" onDoubleClick={() => setSizePct(100)} />
          </div>
        ) : (
          <div className="map-empty" style={{ borderTop: "none" }}>Loading image...</div>
        )
      )}

      {selectedPin && (""",
     """            {sizePct < 100 && <div className="map-size-indicator">{Math.round(sizePct)}%</div>}
            <div className="map-resize-handle" onMouseDown={handleResizeStart} title="Drag to resize · double-click to reset" onDoubleClick={() => setSizePct(100)} />
          </div>
      )}

      {selectedPin && ("""),
])

edit(MOD / "08_export-layer.jsx", [
    # natural sizes for map images, resolved beside the manifest
    ("""// Project a calendar-date value from one calendar's frame to another, via
// absoluteDay.""",
     """// Natural pixel size of an image given as a data URL, or null if it will not
// decode. The map canvas's viewBox is the image's natural size (pins are
// normalized to that rect), so the export has to know it before it can write
// the svg; the manifest only carries the bytes.
const loadImageNaturalSizeForExport = (src) => new Promise(resolve => {
  const img = new Image();
  img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
  img.onerror = () => resolve(null);
  img.src = src;
});

// Map<image ref, {width, height}|null> for every map image the manifest
// resolved. Entry-field images are not measured; nothing positions against them.
const resolveMapImageSizesForHtmlExport = async (state, manifest) => {
  const sizes = new Map();
  if (!manifest) return sizes;
  const maps = Array.isArray(state.cartographia) ? state.cartographia : [];
  for (const rec of maps) {
    const ref = rec && rec.mapData && rec.mapData.image;
    if (!ref || sizes.has(ref)) continue;
    const dataUrl = manifest.get(ref);
    if (!dataUrl) continue;
    sizes.set(ref, await loadImageNaturalSizeForExport(dataUrl));
  }
  return sizes;
};

// Project a calendar-date value from one calendar's frame to another, via
// absoluteDay."""),
    ("""// Render a map-kind entry's mapData as a static image with absolute-positioned
// pin overlay + numbered legend below. Pins filter through isPinVisibleAtAbsDay
// when ctx.currentMomentDay is set; null currentMomentDay shows all pins (per
// the warning-and-proceed flow in the export modal).
const renderMapHtml = (entry, tpl, state, ctx) => {
  const mapData = entry.mapData || { image: null, pins: [] };
  const allPins = Array.isArray(mapData.pins) ? mapData.pins : [];
""",
     """// Render a map record's mapData as the drawing canvas (the one svg tree, string
// serialized; the image inlined inside it when there is one) with the
// absolute-positioned pin overlay + numbered legend below. Pins filter through
// isPinVisibleAtAbsDay when ctx.currentMomentDay is set; null currentMomentDay
// shows all pins (per the warning-and-proceed flow in the export modal).
const renderMapHtml = (entry, tpl, state, ctx) => {
  const mapData = ensureMapData(entry.mapData);
  const allPins = Array.isArray(mapData.pins) ? mapData.pins : [];
"""),
    ("""  // Resolve the map background image through the manifest
  const imageDataUrl = (mapData.image && ctx.imageManifest) ? ctx.imageManifest.get(mapData.image) : null;

  let imgHtml;
  if (imageDataUrl) {
    imgHtml = `<img class="map-image" src="${htmlEscape(imageDataUrl)}" alt="" />`;
  } else if (mapData.image) {
    imgHtml = `<div class="map-image-placeholder">(map image not embedded: ${htmlEscape(mapData.image)})</div>`;
  } else if (visiblePins.length === 0) {
    return `<div class="map-empty">(empty map: no image, no pins)</div>`;
  } else {
    imgHtml = `<div class="map-image-placeholder">(no map image; pins below)</div>`;
  }
""",
     """  // Resolve the map background image through the manifest, and its natural
  // size through the sizes map; the canvas is drawn at that size.
  const imageDataUrl = (mapData.image && ctx.imageManifest) ? ctx.imageManifest.get(mapData.image) : null;
  const imageSize = (imageDataUrl && ctx.imageSizes) ? ctx.imageSizes.get(mapData.image) : null;

  let imgHtml;
  if (imageDataUrl) {
    imgHtml = mapTreeToString(buildMapDrawingTree(mapData.drawing, {
      id: entry.id,
      className: "map-image",
      label: entry.name,
      imageHref: imageDataUrl,
      imageWidth: imageSize ? imageSize.width : null,
      imageHeight: imageSize ? imageSize.height : null,
    }));
  } else if (mapData.image) {
    imgHtml = `<div class="map-image-placeholder">(map image not embedded: ${htmlEscape(mapData.image)})</div>`;
  } else if (visiblePins.length === 0 && !mapDrawingHasContent(mapData.drawing)) {
    return `<div class="map-empty">(empty map: no image, no drawing, no pins)</div>`;
  } else {
    imgHtml = mapTreeToString(buildMapDrawingTree(mapData.drawing, { id: entry.id, className: "map-image", label: entry.name }));
  }
"""),
    ("""  const imageRefs = collectImageRefsForHtmlExport(state);
  const imageManifest = await resolveImageManifestForHtmlExport(imageRefs, dirHandle);
""",
     """  const imageRefs = collectImageRefsForHtmlExport(state);
  const imageManifest = await resolveImageManifestForHtmlExport(imageRefs, dirHandle);
  const imageSizes = await resolveMapImageSizesForHtmlExport(state, imageManifest);
"""),
    ("""    currentMomentDay,
    imageManifest,
  };
""",
     """    currentMomentDay,
    imageManifest,
    imageSizes,
  };
"""),
])

print("r032 applied")
