
// ─── Map drawing renderer (v1.6 pillar 3) ──────────────────────────────────────
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
  return d.layers.some(l => (l.kind === "raster" ? !!l.image : l.shapes.length > 0));
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


// The four built-in stamps: line art in a 64 x 64 box. Parts carry no fill or
// stroke of their own so they inherit the shape's from the <use>; parts that
// must stay hollow say fill="none". Line weight is the symbol's own and scales
// with the stamp. Bodies are markup written as markup (the `raw` node below);
// these are code. Imported stamps (state.mapStamps) have the same shape and
// reach the renderer only through ensureMapStamps, which sanitizes every body
// on load, so nothing unsanitized reaches a page either way.
const MAP_BUILTIN_STAMPS = [
  { id: "mountain", name: "Mountain", viewBox: "0 0 64 64",
    body: '<path d="M3 56 L23 18 L33 34 L41 24 L61 56 Z" stroke-width="3" stroke-linejoin="round"/><path d="M23 18 L27 28 L22 33 L27 39 L21 45" fill="none" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/><path d="M41 24 L44 31 L40 35 L44 40" fill="none" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' },
  { id: "tree", name: "Tree", viewBox: "0 0 64 64",
    body: '<path d="M32 4 L19 26 L26 26 L15 42 L25 42 L12 58 L52 58 L39 42 L49 42 L38 26 L45 26 Z" stroke-width="3" stroke-linejoin="round"/><path d="M29 58 V63 H35 V58" fill="none" stroke-width="3" stroke-linejoin="round"/>' },
  { id: "settlement", name: "Settlement", viewBox: "0 0 64 64",
    body: '<path d="M6 58 V36 L16 26 L26 36 V58 Z" stroke-width="3" stroke-linejoin="round"/><path d="M26 58 V30 L39 16 L52 30 V58 Z" stroke-width="3" stroke-linejoin="round"/><path d="M52 58 V40 L58 34 V58 Z" stroke-width="3" stroke-linejoin="round"/><path d="M35 58 V44 H43 V58" fill="none" stroke-width="2.5" stroke-linejoin="round"/><path d="M39 16 V8 L46 10 L39 12" fill="none" stroke-width="2.5" stroke-linejoin="round"/>' },
  { id: "compass", name: "Compass rose", viewBox: "0 0 64 64",
    body: '<circle cx="32" cy="32" r="25" fill="none" stroke-width="2.5"/><path d="M32 3 L37 32 L32 61 L27 32 Z" stroke-width="2.5" stroke-linejoin="round"/><path d="M9 32 L32 27 L55 32 L32 37 Z" stroke-width="2.5" stroke-linejoin="round"/><path d="M12 12 L32 28 L52 12" fill="none" stroke-width="1.5"/><path d="M12 52 L32 36 L52 52" fill="none" stroke-width="1.5"/><circle cx="32" cy="32" r="3" fill="none" stroke-width="2"/>' },
];

// A stamp by id: the built-ins first, then the world's imported stamps.
function mapStampDef(id, stamps) {
  return MAP_BUILTIN_STAMPS.find(s => s.id === id) || (Array.isArray(stamps) ? stamps.find(s => s && s.id === id) : null) || null;
}

// A label's width, estimated from its characters: the renderer has no DOM to
// measure with, and the export runs where there is none. Cormorant Garamond
// capitals run about 0.68 em, lower case about 0.45, a space a quarter. Only
// a bent label depends on this, and only for where its apex sits.
function mapTextWidthEstimate(text, fontSize) {
  let w = 0;
  for (const ch of String(text || "")) {
    if (ch === " ") w += 0.25;
    else if (/[A-Z]/.test(ch)) w += 0.68;
    else if (/[0-9]/.test(ch)) w += 0.5;
    else if (/[ilj.,:;'!|]/.test(ch)) w += 0.25;
    else if (/[mwMW]/.test(ch)) w += 0.85;
    else w += 0.45;
  }
  return Math.max(fontSize * 0.5, w * fontSize);
}

// Where a label turns: its anchor when straight, the apex of its arc when bent.
function mapTextPivot(s) {
  if (Math.abs(s.arc || 0) >= 1) return [s.x + mapTextWidthEstimate(s.text, s.fontSize) / 2, s.y];
  return [s.x, s.y];
}

// The path a bent label runs along: a circular arc whose apex is the label's
// middle, bending through `arc` degrees over the label's estimated width,
// arching up for positive values and down for negative. The path runs well
// past both ends of the label so a wider-than-estimated label is never cut
// off; the label is centred on it, so the spare path is invisible.
function mapTextArcPath(s) {
  const f = mapNum;
  const theta = Math.min(180, Math.max(1, Math.abs(s.arc))) * Math.PI / 180;
  const wc = mapTextWidthEstimate(s.text, s.fontSize);
  const R = wc / (2 * Math.sin(theta / 2));
  const half = Math.min(170 * Math.PI / 180, (wc * 0.85 + s.fontSize) / R); // half the path's angle, in radians
  const [ax, ay] = mapTextPivot(s);
  const up = s.arc > 0;
  const cy = up ? ay + R : ay - R;
  const base = up ? -Math.PI / 2 : Math.PI / 2;
  const a1 = up ? base - half : base + half; // the left end
  const a2 = up ? base + half : base - half; // the right end
  const p1 = [ax + R * Math.cos(a1), cy + R * Math.sin(a1)];
  const p2 = [ax + R * Math.cos(a2), cy + R * Math.sin(a2)];
  const large = half > Math.PI / 2 ? 1 : 0;
  const sweep = up ? 1 : 0;
  return `M${f(p1[0])} ${f(p1[1])} A${f(R)} ${f(R)} 0 ${large} ${sweep} ${f(p2[0])} ${f(p2[1])}`;
}

// One normalized shape to one node, or null for a stamp whose symbol is not
// known. ctx ({idBase, defs, stampsUsed, stamps, placeholder}) comes from
// buildMapDrawingTree: a bent label's path goes into the defs, a stamp's
// symbol (built in or from ctx.stamps) is recorded so the tree can emit it
// once, and with ctx.placeholder (the editor) a stamp whose symbol is missing
// draws as a dashed box with a question mark so it can be found, re-pointed,
// or deleted; the view and the export draw nothing for it. Without ctx a bent
// label renders straight and a stamp renders nothing.
function mapShapeNode(s, ctx) {
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
    case "region": {
      const d = s.rings.map(r => (s.smooth ? mapSmoothPath(r, true) : `M${r.map(p => `${f(p[0])} ${f(p[1])}`).join(" L")} Z`)).join(" ");
      return { tag: "path", attrs: { ...common, d, "fill-rule": "evenodd", ...paint } };
    }
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
      if (s.rotation) {
        const [px, py] = mapTextPivot(s);
        attrs.transform = `rotate(${f(s.rotation)} ${f(px)} ${f(py)})`;
      }
      if (ctx && Math.abs(s.arc || 0) >= 1) {
        const pid = `${ctx.idBase}-arc-${String(s.id).replace(/[^A-Za-z0-9_-]/g, "")}`;
        ctx.defs.push({ tag: "path", attrs: { id: pid, d: mapTextArcPath(s), fill: "none" } });
        delete attrs.x;
        delete attrs.y;
        return { tag: "text", attrs, children: [{ tag: "textPath", attrs: { href: `#${pid}`, startOffset: "50%", "text-anchor": "middle" }, children: [s.text] }] };
      }
      return { tag: "text", attrs, children: [s.text] };
    }
    case "stamp": {
      if (!ctx) return null;
      const def = mapStampDef(s.stampId, ctx.stamps);
      if (!def) {
        if (!ctx.placeholder) return null;
        const g = { ...common, "data-missing-stamp": s.stampId };
        if (s.rotation) g.transform = `rotate(${f(s.rotation)} ${f(s.x + s.w / 2)} ${f(s.y + s.h / 2)})`;
        return { tag: "g", attrs: g, children: [
          { tag: "rect", attrs: { x: f(s.x), y: f(s.y), width: f(s.w), height: f(s.h), fill: "none", stroke: MAP_PALETTE[6].hex, "stroke-width": "2", "stroke-dasharray": "6 4", "vector-effect": "non-scaling-stroke" } },
          { tag: "text", attrs: { x: f(s.x + s.w / 2), y: f(s.y + s.h / 2), "text-anchor": "middle", "dominant-baseline": "central", "font-family": "'DM Sans', sans-serif", "font-size": f(Math.max(8, Math.min(s.w, s.h) * 0.5)), fill: MAP_PALETTE[6].hex }, children: ["?"] },
        ] };
      }
      if (def.kind === "alpha" || def.kind === "color") {
        // a raster tip: a use of its symbol (the image once in defs, however
        // many placements), stretched to the box, which keeps the tip's
        // aspect; an alpha tip through a tint filter in the Fill, one per color
        ctx.stampsUsed.set(def.id, def);
        const attrs = { ...common, href: `#${ctx.idBase}-stamp-${String(def.id).replace(/[^A-Za-z0-9_-]/g, "")}`, x: f(s.x), y: f(s.y), width: f(s.w), height: f(s.h) };
        if (def.kind === "alpha") {
          const hex = s.fill || MAP_PALETTE[0].hex;
          const fid = `${ctx.idBase}-tint-${hex.slice(1)}`;
          if (ctx.tints && !ctx.tints.has(hex)) ctx.tints.set(hex, { tag: "filter", attrs: { id: fid, "color-interpolation-filters": "sRGB" }, children: [{ tag: "feFlood", attrs: { "flood-color": hex, result: "tint" } }, { tag: "feComposite", attrs: { in: "tint", in2: "SourceAlpha", operator: "in" } }] });
          attrs.filter = `url(#${fid})`;
        }
        if (s.rotation) attrs.transform = `rotate(${f(s.rotation)} ${f(s.x + s.w / 2)} ${f(s.y + s.h / 2)})`;
        return { tag: "use", attrs };
      }
      ctx.stampsUsed.set(def.id, def);
      const attrs = { ...common, href: `#${ctx.idBase}-stamp-${String(def.id).replace(/[^A-Za-z0-9_-]/g, "")}`, x: f(s.x), y: f(s.y), width: f(s.w), height: f(s.h), fill: s.fill || "none", stroke: s.stroke || "none" };
      if (s.rotation) attrs.transform = `rotate(${f(s.rotation)} ${f(s.x + s.w / 2)} ${f(s.y + s.h / 2)})`;
      return { tag: "use", attrs };
    }
    default:
      return null;
  }
}

// opts: { id, className, label, imageHref, imageWidth, imageHeight, stamps,
// placeholder, layerImages }. stamps is the world's imported stamps
// (state.mapStamps), which the built-ins come before; placeholder is the
// editor's, see mapShapeNode; layerImages maps a raster layer's filename to
// the url that draws it (a data URL draws as it is), and a raster layer with
// no url is left out (r043).
// With an image the canvas is the image's natural size and the background is not
// drawn; without one the background rect (and its grain) comes first. Then one
// <g> per visible layer, in order. <defs> carries the grain filter, the path
// of every bent label, and a <symbol> for every stamp the map uses, all with
// ids prefixed by the map so several maps on one exported page never collide.
// The returned root also carries width and height so a caller can read the
// canvas size it rendered at.
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
  const ctx = { idBase, defs, stampsUsed: new Map(), tints: new Map(), stamps: Array.isArray(o.stamps) ? o.stamps : [], placeholder: !!o.placeholder };
  const layerHref = (layer) => {
    if (!layer.image) return null;
    if (layer.image.startsWith("data:")) return layer.image;
    const m = o.layerImages;
    const v = m ? (m instanceof Map ? m.get(layer.image) : m[layer.image]) : null;
    return typeof v === "string" && v ? v : null;
  };
  d.layers.forEach(layer => {
    if (!layer.visible) return;
    if (layer.kind === "raster") {
      // the bitmap stretched to the units it covers; past the canvas it is clipped
      const href = layerHref(layer);
      if (href) children.push({ tag: "image", attrs: { "data-layer": layer.id, "data-kind": "raster", href, x: "0", y: "0", width: f(layer.width), height: f(layer.height), preserveAspectRatio: "none" } });
      return;
    }
    children.push({ tag: "g", attrs: { "data-layer": layer.id }, children: layer.shapes.map(s => mapShapeNode(s, ctx)).filter(Boolean) });
  });
  ctx.stampsUsed.forEach(def => {
    const id = `${idBase}-stamp-${String(def.id).replace(/[^A-Za-z0-9_-]/g, "")}`;
    if (def.kind === "alpha" || def.kind === "color") {
      // a raster tip's symbol: its image at its own size, stretched to every use
      defs.push({ tag: "symbol", attrs: { id, viewBox: `0 0 ${def.width} ${def.height}`, preserveAspectRatio: "none" }, children: [{ tag: "image", attrs: { href: def.image, x: "0", y: "0", width: String(def.width), height: String(def.height) } }] });
      return;
    }
    defs.push({ tag: "symbol", attrs: { id, viewBox: def.viewBox, overflow: "visible" }, raw: def.body });
  });
  ctx.tints.forEach(node => defs.push(node));
  const attrs = { xmlns: "http://www.w3.org/2000/svg", viewBox: `0 0 ${f(width)} ${f(height)}`, role: "img" };
  if (o.className) attrs.class = o.className;
  if (o.label) attrs["aria-label"] = o.label;
  return { tag: "svg", attrs, children: defs.length > 0 ? [{ tag: "defs", children: defs }, ...children] : children, width, height };
}

// Static markup for the HTML export. Text and attribute values are escaped;
// empty elements self-close, which HTML's parser honors for SVG content. A
// node with `raw` is a stamp symbol: its body is markup written as markup.
function mapTreeToString(node) {
  if (node == null) return "";
  if (typeof node === "string") return mapEscapeXml(node);
  const attrs = Object.entries(node.attrs || {})
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => ` ${k}="${mapEscapeXml(v)}"`)
    .join("");
  const kids = node.raw != null ? String(node.raw) : (node.children || []).map(mapTreeToString).join("");
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
  if (node.raw != null) {
    props.dangerouslySetInnerHTML = { __html: String(node.raw) };
    return React.createElement(node.tag, props);
  }
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