
// ─── Map drawing model (v1.6 pillar 3) ─────────────────────────────────────────
// The vector drawing under a map's pins. Pure data: mapData.drawing is a
// viewBox-sized canvas with a background and ordered layers of shapes. The
// renderer (cut 2) and the editor (cuts 3+) consume it, migrate() backfills it
// on load, and ensureMapData() coerces anything malformed to defaults on read
// rather than throwing (defensive validation before state touches). Pins stay
// 0-1 normalized to the canvas rect and are NOT part of the drawing. Build
// sheet: docs/cartographia-plus-spec.md.

// The fixed palette the editor offers. Stored as hex on each shape, so a stamp
// pack can carry colors outside it; the palette constrains authoring, not data.
const MAP_PALETTE = [
  { id: "ink",       label: "Ink",       hex: "#2b2420" },
  { id: "sepia",     label: "Sepia",     hex: "#6b4e2e" },
  { id: "parchment", label: "Parchment", hex: "#e8dcc0" },
  { id: "forest",    label: "Forest",    hex: "#4f6b3a" },
  { id: "water",     label: "Water",     hex: "#5b7f99" },
  { id: "stone",     label: "Stone",     hex: "#8a8378" },
  { id: "blood",     label: "Blood",     hex: "#8c3b2e" },
  { id: "chalk",     label: "Chalk",     hex: "#f4efe4" },
];

// Background presets for image-less maps: a fill plus a grain amount (0-1) for
// the feTurbulence texture the renderer lays over it. Not drawn under an image.
const MAP_BACKGROUND_PRESETS = [
  { id: "white",     label: "White",     fill: "#ffffff", grain: 0 },
  { id: "vellum",    label: "Vellum",    fill: "#f1e9d6", grain: 0.25 },
  { id: "parchment", label: "Parchment", fill: "#e8dcc0", grain: 0.45 },
];
const MAP_STROKE_WIDTH_RANGE = { min: 1, max: 32, limit: 64 };   // viewBox units; the slider's range, and the widest the data accepts
const MAP_TEXT_SIZES = [24, 36, 56];        // viewBox units, Cormorant Garamond
const MAP_SHAPE_TYPES = ["rect", "ellipse", "polygon", "stroke", "text", "stamp", "region"];
// Default canvas for a map with no image. With an image, the renderer sets the
// drawing's size to the image's natural pixel size the first time it loads
// while the drawing is still empty (cut 2); after that the size is fixed,
// because pins are normalized to the canvas rect and would move otherwise.
const MAP_DRAWING_DEFAULT_SIZE = { width: 1600, height: 1000 };

function makeDefaultMapLayer(name, kind, width, height) {
  const base = { id: `layer-${genId().slice(-6)}`, name: name || "Drawing", visible: true, locked: false, shapes: [] };
  if (kind === "raster") {
    const pos = (v, d) => (Number.isFinite(v) && v > 0 ? Math.round(v) : d);
    return { ...base, kind: "raster", image: null, width: pos(width, MAP_DRAWING_DEFAULT_SIZE.width), height: pos(height, MAP_DRAWING_DEFAULT_SIZE.height) };
  }
  return { ...base, kind: "vector" };
}

// Raster layers (r043): a layer may hold one bitmap instead of shapes. The
// bitmap is capped at 4096 on the long side; inline (no image folder) it is
// a data URL of a PNG, JPEG, or WebP under the byte cap, with a warning past
// one megabyte as Set Image gives.
const MAP_RASTER_LAYER = { maxSide: 4096, maxBytes: 50331648, inlineWarn: 1048576 };

// The load-time check of an inline raster layer image: a PNG, JPEG, or WebP
// data URL, plain base64, under the byte cap. A filename is checked for shape
// too: no path separators, no scheme.
function mapRasterLayerCheck(v) {
  if (typeof v !== "string" || !v) return false;
  if (v.startsWith("data:")) return v.length <= MAP_RASTER_LAYER.maxBytes * 4 / 3 + 64 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(v);
  return v.length <= 255 && !/[\/\\:]/.test(v);
}

// A File, Blob, or URL decoded into an HTMLImageElement, for its size and
// for drawing it to a canvas. Rejects when the browser will not decode it.
function mapDecodeImage(src) {
  return new Promise((resolve, reject) => {
    const url = typeof src === "string" ? src : URL.createObjectURL(src);
    const done = (fn, v) => { if (typeof src !== "string") URL.revokeObjectURL(url); fn(v); };
    const img = new Image();
    img.onload = () => done(resolve, img);
    img.onerror = () => done(reject, new Error("the image would not decode"));
    img.src = url;
  });
}

function makeDefaultDrawing(width, height) {
  const preset = MAP_BACKGROUND_PRESETS[1]; // vellum
  return {
    width: Number.isFinite(width) && width > 0 ? Math.round(width) : MAP_DRAWING_DEFAULT_SIZE.width,
    height: Number.isFinite(height) && height > 0 ? Math.round(height) : MAP_DRAWING_DEFAULT_SIZE.height,
    background: { fill: preset.fill, grain: preset.grain },
    layers: [makeDefaultMapLayer("Drawing")],
  };
}

// One shape, coerced to its type's field set. Returns null for a shape that
// cannot be rendered (unknown type, a polygon with fewer than three points, a
// stamp with no stamp id); the caller drops those. Everything else lands on a
// default rather than failing, and a well-formed shape round-trips unchanged.
function ensureMapShape(s) {
  if (!s || typeof s !== "object") return null;
  const type = MAP_SHAPE_TYPES.includes(s.type) ? s.type : null;
  if (!type) return null;
  const num = (v, d) => (Number.isFinite(v) ? v : d);
  const hex = (v) => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : null);
  const pick = (v, list, d) => (list.includes(v) ? v : d);
  const out = {
    id: (typeof s.id === "string" && s.id) ? s.id : `shape-${genId().slice(-6)}`,
    type,
    fill: hex(s.fill),
    stroke: hex(s.stroke),
    strokeWidth: Math.max(MAP_STROKE_WIDTH_RANGE.min, Math.min(MAP_STROKE_WIDTH_RANGE.limit, Math.round(num(s.strokeWidth, 4)))),
  };
  if (type === "rect" || type === "ellipse" || type === "text" || type === "stamp") {
    out.x = num(s.x, 0);
    out.y = num(s.y, 0);
  }
  if (type === "rect" || type === "ellipse" || type === "stamp") {
    out.w = Math.max(1, num(s.w, 100));
    out.h = Math.max(1, num(s.h, 100));
  }
  if (type === "rect" || type === "polygon" || type === "stroke") {
    out.smooth = s.smooth === true;
  }
  if (type === "region") {
    const rings = (Array.isArray(s.rings) ? s.rings : [])
      .map(r => (Array.isArray(r) ? r : []).filter(p => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])).map(p => [p[0], p[1]]))
      .filter(r => r.length >= 3);
    if (rings.length === 0) return null;
    out.rings = rings;
    out.smooth = s.smooth === true;
  }
  if (type === "polygon" || type === "stroke") {
    const pts = (Array.isArray(s.points) ? s.points : [])
      .filter(p => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]))
      .map(p => [p[0], p[1]]);
    if (pts.length < (type === "polygon" ? 3 : 2)) return null;
    out.points = pts;
  }
  if (type === "text") {
    out.text = typeof s.text === "string" ? s.text : "";
    out.fontSize = pick(s.fontSize, MAP_TEXT_SIZES, 36);
    out.rotation = num(s.rotation, 0);
    out.arc = Math.max(-180, Math.min(180, num(s.arc, 0))); // degrees of bend; 0 is a straight label
  }
  if (type === "stamp") {
    if (typeof s.stampId !== "string" || !s.stampId) return null;
    out.stampId = s.stampId;
    out.rotation = num(s.rotation, 0);
  }
  return out;
}

// The whole drawing, coerced. Ids are preserved where present and minted where
// absent, so a second pass over the result changes nothing; migrate() relies
// on that.
function ensureDrawingShape(drawing) {
  const src = (drawing && typeof drawing === "object") ? drawing : {};
  const num = (v, d) => (Number.isFinite(v) ? v : d);
  const hex = (v) => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : null);
  const preset = MAP_BACKGROUND_PRESETS[1];
  const bg = (src.background && typeof src.background === "object") ? src.background : {};
  const width = Math.max(1, Math.round(num(src.width, MAP_DRAWING_DEFAULT_SIZE.width)));
  const height = Math.max(1, Math.round(num(src.height, MAP_DRAWING_DEFAULT_SIZE.height)));
  const layersSrc = (Array.isArray(src.layers) ? src.layers : []).filter(l => l && typeof l === "object");
  const layers = layersSrc.map((l, i) => {
    const base = {
      id: (typeof l.id === "string" && l.id) ? l.id : `layer-${genId().slice(-6)}`,
      name: (typeof l.name === "string" && l.name.trim()) ? l.name : `Layer ${i + 1}`,
      visible: l.visible !== false,
      locked: l.locked === true,
    };
    if (l.kind === "raster") {
      // one bitmap, no shapes (r043); a bad image reference loads as an empty layer
      const pos = (v, d) => (Number.isFinite(v) && v > 0 ? Math.round(v) : d);
      return { ...base, kind: "raster", image: mapRasterLayerCheck(l.image) ? l.image : null, width: pos(l.width, width), height: pos(l.height, height), shapes: [] };
    }
    return { ...base, kind: "vector", shapes: (Array.isArray(l.shapes) ? l.shapes : []).map(ensureMapShape).filter(Boolean) };
  });
  if (layers.length === 0) layers.push(makeDefaultMapLayer("Drawing"));
  return {
    width,
    height,
    background: {
      fill: hex(bg.fill) || preset.fill,
      grain: Math.max(0, Math.min(1, num(bg.grain, preset.grain))),
    },
    layers,
  };
}

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

function makeDefaultMapData() {
  return ensureMapData(null);
}

// state.mapStamps: stamps imported from stamp packs, world-scoped, each
// `{ id, name, viewBox, body, packId, pack }` with the id namespaced by its
// pack (`forest__pine`). Rebuilt here on every load: ids normalized and
// deduplicated, the viewBox validated, and every body put through the
// sanitizer again, so a hand-edited or foreign world file cannot carry markup
// the import would have refused. A stamp with nothing left after cleaning is
// dropped. Built-in stamps are never stored.
function ensureMapStamps(list) {
  const seen = new Set();
  const out = [];
  (Array.isArray(list) ? list : []).forEach(s => {
    if (!s || typeof s !== "object") return;
    const id = mapStampSlug(s.id, MAP_STAMP_ID_MAX);
    if (!id || seen.has(id)) return;
    const name = (typeof s.name === "string" && s.name.trim()) ? s.name.trim().slice(0, 60) : id;
    const packId = (typeof s.packId === "string" && s.packId) ? mapStampSlug(s.packId) : "";
    const pack = (typeof s.pack === "string" && s.pack.trim()) ? s.pack.trim().slice(0, 80) : "";
    if (typeof s.image === "string") {
      // a raster tip (r041): the image is checked for shape, never decoded here
      if (!mapRasterTipCheck(s.image)) return;
      const num = (v, d) => (Number.isFinite(v) && v > 0 ? Math.round(v) : d);
      seen.add(id);
      out.push({
        id, name, packId, pack,
        kind: s.kind === "color" ? "color" : "alpha",
        image: s.image,
        width: num(s.width, 64),
        height: num(s.height, 64),
        spacing: Math.max(1, Math.min(1000, num(s.spacing, MAP_RASTER_TIP.spacing))),
      });
      return;
    }
    const clean = sanitizeMapStampBody(s.body);
    if (!clean.body) return;
    seen.add(id);
    out.push({
      id,
      name,
      kind: "svg",
      viewBox: mapStampViewBox(s.viewBox) || "0 0 64 64",
      body: clean.body,
      packId,
      pack,
    });
  });
  return out;
}

// What a stamp body may contain. A stamp pack is the first third-party markup
// Cartulary renders in-app and writes into exported pages other people open,
// so the body is not trusted as text: it is parsed and rebuilt from this list,
// elements and attributes alike, with every attribute value held to a plain
// charset (numbers, path data, transforms, colors) and `url(` refused outright.
// No text, no href, no style, no use, no script, no handlers, and nothing in a
// namespace. Values that pass cannot run or fetch anything.
const MAP_STAMP_ALLOWLIST = {
  elements: ["g", "path", "circle", "ellipse", "rect", "polygon", "polyline", "line"],
  attrs: ["d", "points", "cx", "cy", "r", "rx", "ry", "x", "y", "x1", "y1", "x2", "y2", "width", "height",
    "fill", "fill-rule", "fill-opacity", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin",
    "stroke-dasharray", "stroke-opacity", "stroke-miterlimit", "opacity", "transform"],
  value: /^[A-Za-z0-9 .,#()%+\-]*$/,
};

// A stamp or pack id: lower-case letters, digits, underscore, dash; anything
// else becomes a dash; at most forty characters. Empty when nothing survives.
// A stamp or pack id: lower case, a plain charset, at most `max` characters
// (40 by default; a stored id is `<packId>__<sid>` and gets room for both
// halves, since a cap on a composite key is the sum of its parts' caps).
function mapStampSlug(v, max) {
  return String(v == null ? "" : v).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, max || 40);
}

// Raster tips: a PNG tip's cap on the long side (bigger is scaled down at
// import), the most bytes its data URL may hold, the hue past which a pixel
// counts as color (a tip with any such pixel is a color tip, shown as is;
// without one it is an alpha tip, tinted by the Fill), the alpha below which
// a pixel's hue is not looked at, and the spacing a PNG tip gets.
const MAP_RASTER_TIP = { maxSide: 1024, maxBytes: 4194304, hue: 24, alpha: 32, spacing: 25 };

// The most characters a stored stamp id may hold: a pack id and a stamp id
// of forty each, joined by two underscores, with room to spare. r036 ran the
// joined id through the forty-character slug, which folded every stamp of a
// long-named pack onto one id (found on the r041 pass with an official
// Wonderdraft pack).
const MAP_STAMP_ID_MAX = 100;

// The load-time check of a stored tip image: a PNG data URL, plain base64,
// under the byte cap. Nothing is decoded on load; the decode happened at
// import, and an <image> with a PNG source can run and fetch nothing.
function mapRasterTipCheck(v) {
  if (typeof v !== "string" || v.length > MAP_RASTER_TIP.maxBytes * 4 / 3 + 64) return false;
  return /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(v);
}

// A PNG file, blob, or data URL decoded, measured, classified, and re-encoded
// as the tip the app stores. Returns { image, width, height, kind, notes }
// or { error }. Scaled down to the cap on the long side. A PNG with any
// transparency keeps its alpha as the coverage; a fully opaque one is read
// as a grayscale mask with black as ink, which is how GIMP and Photoshop
// tips read. Any pixel with real hue makes it a color tip, kept as is; an
// alpha tip is written white-on-transparent so the tint filter has only the
// alpha to work with. `want` ("alpha" or "color") overrides the pixel test,
// which is how a Wonderdraft symbol's draw_mode is honored; `luma` reads an
// opaque image with its luminance as the coverage (white is the shape), which
// is how a Procreate shape is drawn.
function mapPrepareRasterTip(src, want, luma) {
  return new Promise((resolve) => {
    const notes = [];
    let url = null;
    let revoke = false;
    if (typeof src === "string") url = src;
    else { url = URL.createObjectURL(src); revoke = true; }
    const done = (out) => { if (revoke) URL.revokeObjectURL(url); resolve(out); };
    const img = new Image();
    img.onload = () => {
      try {
        const w0 = img.naturalWidth, h0 = img.naturalHeight;
        if (!(w0 > 0 && h0 > 0)) return done({ error: "empty image" });
        const k = Math.min(1, MAP_RASTER_TIP.maxSide / Math.max(w0, h0));
        const w = Math.max(1, Math.round(w0 * k)), h = Math.max(1, Math.round(h0 * k));
        if (k < 1) notes.push(`resized from ${w0} × ${h0} to ${w} × ${h}`);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const g = canvas.getContext("2d");
        g.drawImage(img, 0, 0, w, h);
        const data = g.getImageData(0, 0, w, h);
        const px = data.data;
        let hasAlpha = false, colored = false;
        for (let i = 0; i < px.length; i += 4) {
          const a = px[i + 3];
          if (a < 255) hasAlpha = true;
          if (a > MAP_RASTER_TIP.alpha && Math.max(px[i], px[i + 1], px[i + 2]) - Math.min(px[i], px[i + 1], px[i + 2]) > MAP_RASTER_TIP.hue) colored = true;
          if (hasAlpha && colored) break;
        }
        const kind = want === "color" || want === "alpha" ? want : (colored ? "color" : "alpha");
        if (kind === "alpha") {
          for (let i = 0; i < px.length; i += 4) {
            const l = Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
            const a = hasAlpha ? px[i + 3] : (luma ? l : 255 - l);
            px[i] = 255; px[i + 1] = 255; px[i + 2] = 255; px[i + 3] = a;
          }
          g.putImageData(data, 0, 0);
          notes.push(hasAlpha ? "alpha tip" : (luma ? "alpha tip from a grayscale image, white as the shape" : "alpha tip from a grayscale image, black as ink"));
        } else {
          notes.push("color tip");
        }
        const image = canvas.toDataURL("image/png");
        if (!mapRasterTipCheck(image)) return done({ error: "over 4 MB after re-encoding" });
        done({ image, width: w, height: h, kind, notes });
      } catch (err) {
        done({ error: "could not be decoded" });
      }
    };
    img.onerror = () => done({ error: "not a readable PNG" });
    img.src = url;
  });
}

// RGBA pixels as a PNG data URL, through a canvas: how a brush file's mask
// becomes the image mapPrepareRasterTip takes.
function mapPixelsToDataUrl(width, height, rgba) {
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const g = canvas.getContext("2d");
  const data = g.createImageData(width, height);
  data.data.set(rgba);
  g.putImageData(data, 0, 0);
  return canvas.toDataURL("image/png");
}

// A Photoshop .abr, read clean-room from the public layout. Versions 1 and
// 2: a count, then brushes of type 1 (computed, no bitmap, skipped) or 2
// (sampled: misc, spacing, a UTF-16 name in version 2, antialiasing, short
// and long bounds, depth, compression, the mask). Versions 6, 7, and 10:
// "8BIM" sections; the `samp` section holds the brushes (length, a 37-byte
// key, 10 or 264 bytes by subversion, long bounds, depth, compression, the
// mask); the `desc` section is a Photoshop descriptor holding each preset's
// `Nm  ` text and `Spcn` percentage, read by a byte scan and paired to a
// sample by the `sampledData` id. Rows are raw or PackBits (a length per
// row, then runs). Only 8-bit masks. Returns { version, subversion, tips:
// [{ key, name, spacing, width, height, mask }], dropped, computed } or
// { error }.
function mapReadAbr(buffer) {
  const u8 = new Uint8Array(buffer);
  const dv = new DataView(buffer);
  const len = u8.length;
  if (len < 4) return { error: "too short to be an .abr" };
  const i16 = (p) => dv.getInt16(p, false);
  const u16 = (p) => dv.getUint16(p, false);
  const i32 = (p) => dv.getInt32(p, false);
  const ascii = (p, n) => { let s = ""; for (let i = 0; i < n && p + i < len; i++) s += String.fromCharCode(u8[p + i]); return s; };
  const utf16 = (p, count) => { let s = ""; for (let i = 0; i < count && p + i * 2 + 1 < len; i++) { const c = u16(p + i * 2); if (c === 0) break; s += String.fromCharCode(c); } return s; };
  const MAX_PIXELS = 25000000;
  const unpack = (p, width, height, out) => {
    // `height` big-endian row lengths, then each row's PackBits runs
    let q = p + height * 2;
    for (let r = 0; r < height; r++) {
      const rowEnd = Math.min(len, q + u16(p + r * 2));
      let o = r * width;
      const outEnd = o + width;
      while (q < rowEnd) {
        let n = dv.getInt8(q); q += 1;
        if (n === -128) continue;
        if (n < 0) { n = 1 - n; const v = q < len ? u8[q] : 0; q += 1; for (let k = 0; k < n && o < outEnd; k++) out[o++] = v; }
        else { n += 1; for (let k = 0; k < n && o < outEnd && q < len; k++) out[o++] = u8[q++]; }
      }
      q = rowEnd;
    }
  };
  const readMask = (p, width, height, depth, compression) => {
    if (!(width > 0 && height > 0) || width * height > MAX_PIXELS) return { reason: "no usable size" };
    if (depth !== 8) return { reason: `${depth}-bit tip` };
    const count = width * height;
    const mask = new Uint8Array(count);
    if (compression === 0) {
      if (p + count > len) return { reason: "truncated" };
      mask.set(u8.subarray(p, p + count));
    } else {
      if (p + height * 2 > len) return { reason: "truncated" };
      unpack(p, width, height, mask);
    }
    return { mask };
  };
  const version = i16(0);
  const tips = [], dropped = [];
  let computed = 0;
  if (version === 1 || version === 2) {
    const count = i16(2);
    let p = 4;
    for (let b = 0; b < count && p + 6 <= len; b++) {
      const type = i16(p), size = i32(p + 2);
      const next = p + 6 + size;
      p += 6;
      if (type === 2) {
        let q = p + 4;                                   // misc
        const spacing = i16(q); q += 2;
        let name = "";
        if (version === 2) { const n = i32(q); q += 4; if (n >= 0 && n < 4096) { name = utf16(q, n); q += n * 2; } }
        q += 1 + 8;                                      // antialiasing, short bounds
        const top = i32(q), left = i32(q + 4), bottom = i32(q + 8), right = i32(q + 12); q += 16;
        const depth = i16(q); q += 2;
        const compression = u8[q]; q += 1;
        const width = right - left, height = bottom - top;
        const r = readMask(q, width, height, depth, compression);
        if (r.mask) tips.push({ key: "", name, spacing, width, height, mask: r.mask });
        else dropped.push({ id: name || `brush ${b + 1}`, reason: r.reason });
      } else {
        computed += 1;
      }
      if (size <= 0) break;
      p = next;
    }
    return { version, subversion: 0, tips, dropped, computed };
  }
  if (version === 6 || version === 7 || version === 10) {
    const subversion = i16(2);
    const sections = {};
    let p = 4;
    while (p + 12 <= len && ascii(p, 4) === "8BIM") {
      const key = ascii(p + 4, 4);
      const size = i32(p + 8);
      if (size < 0) break;
      if (!sections[key]) sections[key] = { start: p + 12, end: Math.min(len, p + 12 + size) };
      p = p + 12 + size;
    }
    // names and spacing from the descriptor, keyed by sample id
    const meta = new Map();
    const descs = [];
    if (sections.desc) {
      const find = (pattern, from, to) => {
        const out = [];
        const n = pattern.length;
        for (let i = from; i + n <= to; i++) {
          let ok = true;
          for (let j = 0; j < n; j++) { if (u8[i + j] !== pattern[j]) { ok = false; break; } }
          if (ok) out.push(i);
        }
        return out;
      };
      const bytes = (s) => Array.from(s, c => c.charCodeAt(0));
      const { start, end } = sections.desc;
      const text = (q) => { const n = i32(q); return n >= 0 && n < 65536 ? utf16(q + 4, n) : ""; };
      const names = find(bytes("Nm  TEXT"), start, end).map(q => ({ pos: q, text: text(q + 8) }));
      const spacings = find(bytes("SpcnUntF#Prc"), start, end).map(q => ({ pos: q, value: q + 20 <= len ? dv.getFloat64(q + 12, false) : NaN }));
      const samples = find(bytes("sampledDataTEXT"), start, end).map(q => ({ pos: q, id: text(q + 15) }));
      computed = Math.max(0, names.length - samples.length);
      samples.forEach(s => {
        const nm = names.filter(x => x.pos < s.pos).pop();
        const after = names.find(x => x.pos > s.pos);
        const spanEnd = after ? after.pos : end;
        const sp = spacings.find(x => x.pos > (nm ? nm.pos : -1) && x.pos < spanEnd);
        const m = { name: nm ? nm.text : "", spacing: sp && Number.isFinite(sp.value) ? Math.round(sp.value) : undefined };
        descs.push(m);
        if (s.id) meta.set(s.id, m);
      });
    }
    const raw = [];
    if (sections.samp) {
      const { start, end } = sections.samp;
      let q = start;
      while (q + 4 <= end) {
        const size = i32(q);
        if (size <= 0) break;
        let brushEnd = size;
        while (brushEnd % 4 !== 0) brushEnd += 1;
        const next = q + 4 + brushEnd;
        let r = q + 4;
        const keyLen = u8[r];
        const key = ascii(r + 1, Math.min(keyLen, 36));
        r += 37;
        r += subversion === 1 ? 10 : 264;
        if (r + 19 > len) break;
        const top = i32(r), left = i32(r + 4), bottom = i32(r + 8), right = i32(r + 12); r += 16;
        const depth = i16(r); r += 2;
        const compression = u8[r]; r += 1;
        raw.push({ key, res: readMask(r, right - left, bottom - top, depth, compression), width: right - left, height: bottom - top });
        q = next;
      }
    }
    // names by sample id when any id matches, else by order when the counts agree
    const byKey = raw.some(x => meta.has(x.key));
    raw.forEach((x, b) => {
      const m = (byKey ? meta.get(x.key) : (descs.length === raw.length ? descs[b] : null)) || {};
      if (x.res.mask) tips.push({ key: x.key, name: m.name || "", spacing: m.spacing, width: x.width, height: x.height, mask: x.res.mask });
      else dropped.push({ id: m.name || `brush ${b + 1}`, reason: x.res.reason });
    });
    return { version, subversion, tips, dropped, computed };
  }
  return { error: `version ${version}; Cartulary reads .abr versions 1, 2, 6, 7, and 10` };
}

// One GIMP brush at `offset` in a .gbr (or inside a .gih): header size,
// version (1, 2, or 3), width, height, bytes per pixel (1, a mask; 4, RGBA),
// "GIMP" and the spacing from version 2, the name to the end of the header,
// then the pixels. Returns { tip: { name, spacing, width, height, bytes,
// data }, next } or { error }.
function mapReadGbr(buffer, offset) {
  const u8 = new Uint8Array(buffer);
  const dv = new DataView(buffer);
  const len = u8.length;
  const p = offset || 0;
  if (p + 20 > len) return { error: "truncated header" };
  const headerSize = dv.getUint32(p, false), version = dv.getUint32(p + 4, false);
  const width = dv.getUint32(p + 8, false), height = dv.getUint32(p + 12, false), bytes = dv.getUint32(p + 16, false);
  if (version !== 1 && version !== 2 && version !== 3) return { error: `version ${version}` };
  let spacing = 10, nameStart = p + 20;
  if (version >= 2) {
    if (String.fromCharCode(u8[p + 20], u8[p + 21], u8[p + 22], u8[p + 23]) !== "GIMP") return { error: "not a GIMP brush" };
    spacing = dv.getUint32(p + 24, false);
    nameStart = p + 28;
  }
  if (headerSize < nameStart - p || p + headerSize > len) return { error: "bad header size" };
  let name = "";
  try { name = new TextDecoder("utf-8").decode(u8.subarray(nameStart, p + headerSize)).replace(/\0[\s\S]*$/, "").trim(); } catch (err) { name = ""; }
  if (!(width > 0 && height > 0) || width * height > 25000000) return { error: "no usable size" };
  if (bytes !== 1 && bytes !== 4) return { error: `${bytes} bytes per pixel` };
  const dataStart = p + headerSize, count = width * height * bytes;
  if (dataStart + count > len) return { error: "truncated pixel data" };
  return { tip: { name, spacing: Math.max(1, Math.min(1000, spacing)), width, height, bytes, data: u8.subarray(dataStart, dataStart + count) }, next: dataStart + count };
}

// A GIMP image hose: a name line, a parameter line whose first number is
// the cell count, then that many brushes back to back. Returns { name,
// tips, dropped } or { error }.
function mapReadGih(buffer) {
  const u8 = new Uint8Array(buffer);
  const nl1 = u8.indexOf(10);
  const nl2 = nl1 < 0 ? -1 : u8.indexOf(10, nl1 + 1);
  if (nl1 < 0 || nl2 < 0) return { error: "no hose header" };
  let name = "", params = "";
  try { const td = new TextDecoder("utf-8"); name = td.decode(u8.subarray(0, nl1)).trim(); params = td.decode(u8.subarray(nl1 + 1, nl2)).trim(); } catch (err) { return { error: "no hose header" }; }
  const count = parseInt(params, 10);
  if (!(count > 0)) return { error: "no cell count" };
  const tips = [], dropped = [];
  let p = nl2 + 1;
  for (let i = 0; i < count && i < 500; i++) {
    const r = mapReadGbr(buffer, p);
    if (r.error) { dropped.push({ id: `${name || "hose"} ${i + 1}`, reason: r.error }); break; }
    tips.push(r.tip);
    p = r.next;
  }
  return { name, tips, dropped };
}

// A binary property list (bplist00), read into plain values: dictionaries
// as Maps, arrays, strings, numbers, booleans, data as bytes, and UIDs as
// { uid }, which NSKeyedArchiver uses to point into its `$objects` table.
// Enough to find a Procreate brush's name. Returns the top object or null.
function mapReadBplist(buffer) {
  const u8 = new Uint8Array(buffer);
  const dv = new DataView(buffer);
  const len = u8.length;
  if (len < 40 || String.fromCharCode(u8[0], u8[1], u8[2], u8[3], u8[4], u8[5]) !== "bplist") return null;
  const t = len - 32;
  const offSize = u8[t + 6], refSize = u8[t + 7];
  const numObjects = Number(dv.getBigUint64(t + 8, false)), top = Number(dv.getBigUint64(t + 16, false)), tableOff = Number(dv.getBigUint64(t + 24, false));
  if (!(offSize >= 1 && offSize <= 8 && refSize >= 1 && refSize <= 8) || !(numObjects > 0 && numObjects < 500000) || tableOff + numObjects * offSize > len) return null;
  const uint = (p, n) => { let v = 0; for (let i = 0; i < n; i++) v = v * 256 + (p + i < len ? u8[p + i] : 0); return v; };
  const offsetOf = (i) => uint(tableOff + i * offSize, offSize);
  const cache = new Map();
  const read = (idx, depth) => {
    if (depth > 64 || !(idx >= 0 && idx < numObjects)) return null;
    if (cache.has(idx)) return cache.get(idx);
    cache.set(idx, null);
    const p = offsetOf(idx);
    if (p >= len) return null;
    const m = u8[p], type = m >> 4, info = m & 15;
    const sized = (q) => { if (info !== 15) return [info, q]; const n = 1 << (u8[q] & 15); return [uint(q + 1, n), q + 1 + n]; };
    let val = null;
    if (type === 0) val = info === 9 ? true : info === 8 ? false : null;
    else if (type === 1) { const n = 1 << info; val = n <= 6 ? uint(p + 1, n) : Number(dv.getBigInt64(p + 1, false)); }
    else if (type === 2) val = info === 3 ? dv.getFloat64(p + 1, false) : dv.getFloat32(p + 1, false);
    else if (type === 4) { const [n, q] = sized(p + 1); val = u8.subarray(q, Math.min(len, q + n)); }
    else if (type === 5) { const [n, q] = sized(p + 1); let s = ""; for (let i = 0; i < n && i < 100000 && q + i < len; i++) s += String.fromCharCode(u8[q + i]); val = s; }
    else if (type === 6) { const [n, q] = sized(p + 1); let s = ""; for (let i = 0; i < n && i < 100000 && q + i * 2 + 1 < len; i++) s += String.fromCharCode(dv.getUint16(q + i * 2, false)); val = s; }
    else if (type === 8) val = { uid: uint(p + 1, info + 1) };
    else if (type === 10) { const [n, q] = sized(p + 1); const arr = []; for (let i = 0; i < n && i < 100000; i++) arr.push(read(uint(q + i * refSize, refSize), depth + 1)); val = arr; }
    else if (type === 13) { const [n, q] = sized(p + 1); const map = new Map(); for (let i = 0; i < n && i < 100000; i++) { const k = read(uint(q + i * refSize, refSize), depth + 1); map.set(typeof k === "string" ? k : String(k), read(uint(q + (n + i) * refSize, refSize), depth + 1)); } val = map; }
    cache.set(idx, val);
    return val;
  };
  return read(top, 0);
}

// The brushes in a Procreate .brush or .brushset zip: every folder (or the
// root) holding a Shape.png is one; its name from the NSKeyedArchiver root
// object's `name` in Brush.archive beside it, else the folder name when it
// is not a UUID, else `fallback`. Shape.png is luminance-as-coverage (white
// is the shape), so each candidate asks for that reading. Grain.png is a
// tileable texture for strokes, not a tip, and is left alone. Returns the
// raster candidates for mapReadStampFiles.
async function mapReadProcreateBrushes(zip, fallback) {
  const shapes = Object.values(zip.files).filter(e => !e.dir && /(^|\/)Shape\.png$/i.test(e.name) && !/(^|\/)__MACOSX\//.test(e.name));
  const cands = [];
  const used = new Set();
  for (const e of shapes) {
    const dir = e.name.replace(/[^\/]*$/, "");
    let name = "";
    const arch = zip.file(`${dir}Brush.archive`);
    if (arch) {
      try {
        const root = mapReadBplist(await arch.async("arraybuffer"));
        const objects = root instanceof Map ? root.get("$objects") : null;
        const topRef = root instanceof Map && root.get("$top") instanceof Map ? root.get("$top").get("root") : null;
        const obj = Array.isArray(objects) && topRef && typeof topRef === "object" ? objects[topRef.uid] : null;
        const ref = obj instanceof Map ? obj.get("name") : null;
        const v = ref && typeof ref === "object" && Number.isFinite(ref.uid) ? objects[ref.uid] : ref;
        if (typeof v === "string") name = v.trim();
      } catch (err) {
        name = "";
      }
    }
    const folder = dir.replace(/\/$/, "").replace(/^.*\//, "");
    if (!name) name = folder && !/^[0-9a-f-]{30,}$/i.test(folder) ? folder : (fallback || "brush");
    name = name.slice(0, 60);
    let sid = mapStampSlug(name) || `brush-${cands.length + 1}`;
    const base = sid;
    let n = 2;
    while (used.has(sid)) sid = `${base}-${n++}`;
    used.add(sid);
    cands.push({ sid, name, kind: "alpha", luma: true, src: new Blob([await e.async("arraybuffer")], { type: "image/png" }) });
  }
  return cands;
}

// A pack as a PNG zip in the Wonderdraft layout: `<pack>/sprites/symbols/
// <pack>/<stem>.png` and a `.wonderdraft_symbols` file beside them (name,
// radius half the long side, offsets zero, draw_mode custom_colors for an
// alpha tip and normal for a color tip). An svg stamp is rasterized at 512
// on the long side, white on transparent, as custom_colors, so a mixed pack
// exports whole; Inkarnate and Dungeondraft take the same PNGs. Resolves to
// a Blob.
async function buildMapStampPngZip(packId, stamps) {
  const zip = new JSZip();
  const folder = `${packId}/sprites/symbols/${packId}/`;
  const symbols = {};
  const prefix = `${packId}__`;
  const used = new Set();
  for (const s of stamps || []) {
    let stem = s.id.startsWith(prefix) ? s.id.slice(prefix.length) : s.id;
    let n = 2;
    const base = stem;
    while (used.has(stem)) stem = `${base}-${n++}`;
    used.add(stem);
    let image = s.image, width = s.width, height = s.height, mode = s.kind === "color" ? "normal" : "custom_colors";
    if (!(s.kind === "alpha" || s.kind === "color")) {
      const vb = mapStampViewBox(s.viewBox) || "0 0 64 64";
      const parts = vb.split(" ").map(Number);
      const vw = parts[2] > 0 ? parts[2] : 64, vh = parts[3] > 0 ? parts[3] : 64;
      const k = 512 / Math.max(vw, vh);
      width = Math.max(1, Math.round(vw * k)); height = Math.max(1, Math.round(vh * k));
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${width}" height="${height}" fill="#ffffff" stroke="#ffffff">${s.body}</svg>`;
      const canvas = await mapSvgToCanvas(svg, width, height, 1);
      image = canvas.toDataURL("image/png");
      mode = "custom_colors";
    }
    if (!mapRasterTipCheck(image)) continue;
    zip.file(`${folder}${stem}.png`, image.replace(/^data:image\/png;base64,/, ""), { base64: true });
    symbols[stem] = { name: s.name, radius: Math.round(Math.max(width, height) / 2), offset_x: 0, offset_y: 0, draw_mode: mode };
  }
  zip.file(`${folder}.wonderdraft_symbols`, JSON.stringify(symbols, null, 2));
  return zip.generateAsync({ type: "blob" });
}

// "minx miny width height", four finite numbers with a positive size, as a
// normalized string; null for anything else.
function mapStampViewBox(v) {
  if (typeof v !== "string") return null;
  const parts = v.trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || !parts.every(Number.isFinite) || parts[2] <= 0 || parts[3] <= 0) return null;
  return parts.map(n => String(Math.round(n * 1000) / 1000)).join(" ");
}

// The sanitizer. Returns the rebuilt body and the list of what it removed,
// each entry readable ("<script>", "onclick on <path>", a refused value).
// The body is parsed with the HTML parser, as inline svg inside a page,
// because that is how the app (innerHTML) and an exported page render it:
// what the sanitizer sees is what would have rendered, unbound prefixes and
// unclosed tags included, where the XML parser would refuse a body a browser
// draws without complaint. An unparseable body comes back empty.
function sanitizeMapStampBody(body) {
  const dropped = [];
  if (typeof body !== "string" || !body.trim()) return { body: "", dropped };
  let doc;
  try {
    doc = new DOMParser().parseFromString(`<!DOCTYPE html><html><body><svg xmlns="http://www.w3.org/2000/svg">${body}</svg></body></html>`, "text/html");
  } catch (err) {
    return { body: "", dropped: ["markup that could not be parsed"] };
  }
  const root = doc && doc.body ? doc.body.querySelector("svg") : null;
  if (!root) return { body: "", dropped: ["markup that could not be parsed"] };
  if (Array.from(doc.body.childNodes).some(n => n !== root && !(n.nodeType === 3 && !n.textContent.trim()))) dropped.push("content outside the drawing (after a stray closing tag)");
  const allowedEl = new Set(MAP_STAMP_ALLOWLIST.elements);
  const allowedAttr = new Set(MAP_STAMP_ALLOWLIST.attrs);
  const build = (el) => {
    const tag = el.localName;
    if (el.namespaceURI !== "http://www.w3.org/2000/svg" || !allowedEl.has(tag)) { dropped.push(`<${tag}>`); return ""; }
    const attrs = [];
    Array.from(el.attributes).forEach(a => {
      const name = a.name;
      if (!allowedAttr.has(name)) { dropped.push(`${name} on <${tag}>`); return; }
      const v = a.value.trim();
      if (!MAP_STAMP_ALLOWLIST.value.test(v) || /url\s*\(/i.test(v)) { dropped.push(`${name}="${v.slice(0, 24)}${v.length > 24 ? "\u2026" : ""}" on <${tag}>`); return; }
      attrs.push(` ${name}="${v}"`);
    });
    const kids = Array.from(el.children).map(build).join("");
    return kids ? `<${tag}${attrs.join("")}>${kids}</${tag}>` : `<${tag}${attrs.join("")}/>`;
  };
  const out = Array.from(root.children).map(build).join("");
  return { body: out, dropped };
}

// A pack file, parsed and sanitized but not yet applied. ok:false carries an
// error for the flash; ok:true carries the pack ({id, name}), the stamps as
// they will be stored (ids namespaced), and a report: what the sanitizer
// removed per stamp, which stamps were dropped and why, and how many of the
// survivors replace a stamp already in the world (same pack, re-imported).
function parseMapStampPack(text, existing) {
  let parsed;
  try { parsed = JSON.parse(text); } catch (err) { return { ok: false, error: "Couldn't parse that file as JSON." }; }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || parsed.cartulary_mapstamp_pack !== 1 || !Array.isArray(parsed.stamps)) {
    return { ok: false, error: "That doesn't look like a Cartulary stamp pack." };
  }
  if (parsed.stamps.length > 500) return { ok: false, error: "A stamp pack holds at most 500 stamps." };
  const name = (typeof parsed.name === "string" && parsed.name.trim()) ? parsed.name.trim().slice(0, 80) : "Imported stamps";
  const packId = mapStampSlug((typeof parsed.id === "string" && parsed.id.trim()) ? parsed.id : name) || "pack";
  const seen = new Set();
  const stamps = [];
  const removed = [];
  const droppedStamps = [];
  const rasterCandidates = [];
  parsed.stamps.forEach((s, i) => {
    const rawId = (s && typeof s.id === "string") ? s.id : "";
    const label = rawId || `stamp #${i + 1}`;
    const sid = mapStampSlug(rawId);
    if (!s || typeof s !== "object" || !sid) { droppedStamps.push({ id: label, reason: "no usable id" }); return; }
    if (seen.has(sid)) { droppedStamps.push({ id: label, reason: "duplicate id" }); return; }
    if (typeof s.image === "string") {
      // a raster entry: decoded and classified by the async reader, after this pass
      if (!/^data:image\/png;base64,/.test(s.image)) { droppedStamps.push({ id: label, reason: "image is not a PNG data URL" }); return; }
      if (s.image.length > MAP_RASTER_TIP.maxBytes * 4 / 3 + 64) { droppedStamps.push({ id: label, reason: "image over 4 MB" }); return; }
      seen.add(sid);
      rasterCandidates.push({ sid, name: (typeof s.name === "string" && s.name.trim()) ? s.name.trim().slice(0, 60) : sid, src: s.image, spacing: Number.isFinite(s.spacing) ? s.spacing : undefined });
      return;
    }
    if (typeof s.body !== "string") { droppedStamps.push({ id: label, reason: "no body or image" }); return; }
    if (s.body.length > 200000) { droppedStamps.push({ id: label, reason: "body over 200 KB" }); return; }
    const clean = sanitizeMapStampBody(s.body);
    const items = clean.dropped.slice();
    const vb = mapStampViewBox(s.viewBox);
    if (s.viewBox != null && !vb) items.push(`viewBox "${String(s.viewBox).slice(0, 24)}" replaced by 0 0 64 64`);
    if (items.length) removed.push({ id: sid, items });
    if (!clean.body) { droppedStamps.push({ id: label, reason: "nothing left after cleaning" }); return; }
    seen.add(sid);
    stamps.push({
      sid,
      name: (typeof s.name === "string" && s.name.trim()) ? s.name.trim().slice(0, 60) : sid,
      kind: "svg",
      viewBox: vb || "0 0 64 64",
      body: clean.body,
    });
  });
  return { ok: true, pack: { id: packId, name }, stamps, rasterCandidates, report: { removed, dropped: droppedStamps } };
}

// A pack file for export: the pack's own ids (the namespace stripped), so a
// re-import lands on the same world ids and replaces its own.
function buildMapStampPackFile(id, name, stamps) {
  const prefix = `${id}__`;
  return {
    cartulary_mapstamp_pack: 1,
    id,
    name,
    exported_at: new Date().toISOString(),
    stamps: (stamps || []).map(s => (s.kind === "alpha" || s.kind === "color"
      ? { id: s.id.startsWith(prefix) ? s.id.slice(prefix.length) : s.id, name: s.name, kind: s.kind, image: s.image, width: s.width, height: s.height, spacing: s.spacing }
      : { id: s.id.startsWith(prefix) ? s.id.slice(prefix.length) : s.id, name: s.name, viewBox: s.viewBox, body: s.body })),
  };
}

// How many placed stamps reference each stamp id, and on how many maps.
function mapStampUsage(state) {
  const out = {};
  (state && Array.isArray(state.cartographia) ? state.cartographia : []).forEach(rec => {
    const d = rec && rec.mapData && rec.mapData.drawing;
    const onThisMap = new Set();
    (d && Array.isArray(d.layers) ? d.layers : []).forEach(l => (Array.isArray(l.shapes) ? l.shapes : []).forEach(s => {
      if (!s || s.type !== "stamp" || typeof s.stampId !== "string") return;
      const u = out[s.stampId] || (out[s.stampId] = { shapes: 0, maps: 0 });
      u.shapes += 1;
      if (!onThisMap.has(s.stampId)) { onThisMap.add(s.stampId); u.maps += 1; }
    }));
  });
  return out;
}

// Imported stamps grouped by pack, in first-seen order; stamps with no pack
// (a hand-edited world) group under "Ungrouped".
function mapStampGroups(stamps) {
  const groups = [];
  const byId = new Map();
  (Array.isArray(stamps) ? stamps : []).forEach(s => {
    const id = (typeof s.packId === "string" && s.packId) ? s.packId : "stamps";
    let g = byId.get(id);
    if (!g) {
      g = { id, name: (typeof s.pack === "string" && s.pack) ? s.pack : (id === "stamps" ? "Ungrouped" : id), stamps: [] };
      byId.set(id, g);
      groups.push(g);
    }
    g.stamps.push(s);
  });
  return groups;
}

// The files the Stamps panel's Import takes, read into one or more candidate
// packs: a `.json` envelope (svg bodies and image entries alike), one or
// several `.png` files (one pack), a `.zip` of PNGs (each folder holding
// PNGs is a pack, named after the folder, or after the zip when the PNGs sit
// at its root; a Wonderdraft `.wonderdraft_symbols` file beside the PNGs names
// them, and its draw_mode decides the kind, "normal" as is and
// "custom_colors" tinted; `__MACOSX` and dotfiles are skipped), a Photoshop
// `.abr` (one pack, its sampled tips as alpha tips), GIMP `.gbr` and `.gih`
// files (one pack; every hose cell a stamp), or Procreate `.brush` files or
// one `.brushset` (one pack; each Shape.png an alpha tip, named from its
// Brush.archive). Every raster tip goes through
// mapPrepareRasterTip. Resolves to { ok, packs: [{ pack: { id, name,
// editable }, stamps, report }] } or { ok: false, error }. A stamp here is
// the stored shape minus its namespaced id: `sid` is the bare id, and
// applying the pack builds `<packId>__<sid>`.
async function mapReadStampFiles(files, existing) {
  const list = Array.from(files || []);
  if (list.length === 0) return { ok: false, error: "No file." };
  const ext = (f) => (f.name || "").toLowerCase().replace(/^.*\./, "");
  const base = (name) => String(name || "").replace(/^.*[\\/]/, "").replace(/\.[^.]*$/, "");
  const nameOf = (stem) => stem.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 60) || stem;
  const sizeOf = (stamps) => stamps.reduce((n, s) => n + (s.image ? s.image.length : (s.body || "").length), 0);
  const finish = (packs) => {
    const existingIds = new Set((Array.isArray(existing) ? existing : []).map(s => s.id));
    const used = new Set();
    packs.forEach(p => {
      // two folders with one leaf name are two packs
      let id = p.pack.id, n = 2;
      while (used.has(id)) id = `${p.pack.id}-${n++}`;
      used.add(id);
      p.pack.id = id;
      const ids = p.stamps.map(s => `${p.pack.id}__${s.sid}`);
      p.report.updated = ids.filter(id => existingIds.has(id)).length;
      p.report.added = ids.length - p.report.updated;
      p.report.bytes = sizeOf(p.stamps);
    });
    return { ok: true, packs };
  };
  // raster candidates: [{ sid, name, src (blob or data URL) }] -> stamps, dropped, removed
  const prepareAll = async (cands, seen) => {
    const stamps = [], dropped = [], removed = [];
    for (const c of cands) {
      if (!c.sid) { dropped.push({ id: c.name || "?", reason: "no usable id" }); continue; }
      if (seen.has(c.sid)) { dropped.push({ id: c.sid, reason: "duplicate id" }); continue; }
      const r = await mapPrepareRasterTip(c.src, c.kind, c.luma === true);
      if (r.error) { dropped.push({ id: c.sid, reason: r.error }); continue; }
      seen.add(c.sid);
      if (r.notes.some(n => /^resized/.test(n))) removed.push({ id: c.sid, items: r.notes.filter(n => /^resized/.test(n)) });
      stamps.push({ sid: c.sid, name: c.name || c.sid, kind: r.kind, image: r.image, width: r.width, height: r.height, spacing: Number.isFinite(c.spacing) ? c.spacing : MAP_RASTER_TIP.spacing });
    }
    return { stamps, dropped, removed };
  };
  // ---- the readers behind the routes; each gives { pack, stamps, report } or { error }
  const packOf = (name, stamps, report) => ({ pack: { id: mapStampSlug(name) || "stamps", name, editable: true }, stamps, report });
  const unique = (cands) => { const seen = new Set(); cands.forEach(c => { const b = c.sid; let n = 2; while (seen.has(c.sid)) c.sid = `${b}-${n++}`; seen.add(c.sid); }); return cands; };
  const readAbr = async (stem, buf) => {
    const abr = mapReadAbr(buf);
    if (abr.error) return { error: `${stem}.abr: not an .abr Cartulary can read: ${abr.error}.` };
    if (abr.tips.length === 0) {
      const found = abr.computed ? `${abr.computed} computed ${abr.computed === 1 ? "brush" : "brushes"} and no sampled tip` : "no sampled tip";
      return { error: `${stem}.abr (version ${abr.version}${abr.subversion ? `.${abr.subversion}` : ""}) holds ${found}${abr.dropped.length ? `, ${abr.dropped.length} unreadable` : ""}. A computed brush has no bitmap; a newer Photoshop layout may hide its tips. Export the tips as PNGs from the app that made the file.` };
    }
    if (abr.tips.length > 500) return { error: `${stem}.abr: a stamp pack holds at most 500 stamps.` };
    const cands = unique(abr.tips.map((t, i) => {
      const rgba = new Uint8ClampedArray(t.width * t.height * 4);
      for (let k = 0, j = 0; k < t.mask.length; k++, j += 4) { rgba[j] = 255; rgba[j + 1] = 255; rgba[j + 2] = 255; rgba[j + 3] = t.mask[k]; }
      const name = (t.name || `${nameOf(stem)} ${i + 1}`).slice(0, 60);
      return { sid: mapStampSlug(name) || `tip-${i + 1}`, name, kind: "alpha", spacing: Number.isFinite(t.spacing) && t.spacing > 0 ? t.spacing : undefined, src: mapPixelsToDataUrl(t.width, t.height, rgba) };
    }));
    const r = await prepareAll(cands, new Set());
    r.dropped = [...abr.dropped, ...r.dropped];
    if (abr.computed) r.removed.push({ id: stem, items: [`${abr.computed} computed ${abr.computed === 1 ? "brush" : "brushes"} skipped (no bitmap)`] });
    return packOf(nameOf(stem) || "Brushes", r.stamps, r);
  };
  // GIMP brushes and hoses: items are [{ name, buf }], one pack
  const readGimp = async (items, packName) => {
    const cands = [], dropped = [];
    const push = (t, label) => {
      const name = (t.name || label).slice(0, 60);
      const rgba = new Uint8ClampedArray(t.width * t.height * 4);
      if (t.bytes === 1) { for (let k = 0, j = 0; k < t.data.length; k++, j += 4) { rgba[j] = 255; rgba[j + 1] = 255; rgba[j + 2] = 255; rgba[j + 3] = t.data[k]; } }
      else rgba.set(t.data);
      cands.push({ sid: mapStampSlug(name) || `tip-${cands.length + 1}`, name, kind: t.bytes === 1 ? "alpha" : undefined, spacing: t.spacing, src: mapPixelsToDataUrl(t.width, t.height, rgba) });
    };
    for (const it of items) {
      const stem = base(it.name);
      if (ext(it) === "gih") {
        const h = mapReadGih(it.buf);
        if (h.error) { dropped.push({ id: it.name, reason: h.error }); continue; }
        h.tips.forEach((t, i) => push({ ...t, name: `${(h.name || t.name || nameOf(stem)).slice(0, 50)} ${i + 1}` }, `${nameOf(stem)} ${i + 1}`));
        h.dropped.forEach(d => dropped.push(d));
      } else {
        const r = mapReadGbr(it.buf, 0);
        if (r.error) { dropped.push({ id: it.name, reason: r.error }); continue; }
        push(r.tip, nameOf(stem));
      }
    }
    if (cands.length > 500) return { error: "A stamp pack holds at most 500 stamps." };
    if (cands.length === 0) return { error: `No brush could be read${dropped.length ? `: ${dropped[0].id}: ${dropped[0].reason}` : ""}.` };
    const r = await prepareAll(unique(cands), new Set());
    r.dropped = [...dropped, ...r.dropped];
    return packOf(packName || "Brushes", r.stamps, r);
  };
  // Procreate files: items are [{ name, data }] where data is a File, Blob, or ArrayBuffer of a .brush or .brushset zip; one pack
  const readProcreate = async (items, packName) => {
    const cands = [], dropped = [];
    let name = packName;
    for (const it of items) {
      let zip;
      try { zip = await JSZip.loadAsync(it.data); } catch (err) { dropped.push({ id: it.name, reason: "could not be opened as a zip" }); continue; }
      if (ext(it) === "brushset" && items.length === 1) {
        const plist = zip.file(/(^|\/)brushset\.plist$/i)[0];
        if (plist) {
          try { const m = /<key>name<\/key>\s*<string>([^<]*)<\/string>/.exec(await plist.async("string")); if (m && m[1].trim()) name = m[1].trim().slice(0, 60); } catch (err) { /* the file name stands */ }
        }
      }
      const found = await mapReadProcreateBrushes(zip, nameOf(base(it.name)));
      if (found.length === 0) dropped.push({ id: it.name, reason: "no Shape.png inside" });
      found.forEach(c => cands.push(c));
    }
    if (cands.length > 500) return { error: "A stamp pack holds at most 500 stamps." };
    if (cands.length === 0) return { error: `No brush could be read${dropped.length ? `: ${dropped[0].id}: ${dropped[0].reason}` : ""}.` };
    const r = await prepareAll(unique(cands), new Set());
    r.dropped = [...dropped, ...r.dropped];
    return packOf(name || "Brushes", r.stamps, r);
  };
  // ---- the routes
  if (list.length === 1 && ext(list[0]) === "json") {
    const text = await new Promise((resolve, reject) => { const rd = new FileReader(); rd.onload = () => resolve(String(rd.result || "")); rd.onerror = () => reject(new Error("read")); rd.readAsText(list[0]); }).catch(() => null);
    if (text == null) return { ok: false, error: "Couldn't read that file." };
    const parsed = parseMapStampPack(text, existing);
    if (!parsed.ok) return parsed;
    const seen = new Set(parsed.stamps.map(s => s.sid));
    const raster = await prepareAll(parsed.rasterCandidates, seen);
    return finish([{ pack: { id: parsed.pack.id, name: parsed.pack.name, editable: false }, stamps: [...parsed.stamps, ...raster.stamps], report: { removed: [...parsed.report.removed, ...raster.removed], dropped: [...parsed.report.dropped, ...raster.dropped] } }]);
  }
  if (list.every(f => ext(f) === "png")) {
    if (list.length > 500) return { ok: false, error: "A stamp pack holds at most 500 stamps." };
    const cands = list.map(f => ({ sid: mapStampSlug(base(f.name)), name: nameOf(base(f.name)), src: f }));
    const r = await prepareAll(cands, new Set());
    return finish([{ pack: { id: "imported-stamps", name: "Imported stamps", editable: true }, stamps: r.stamps, report: r }]);
  }
  if (list.length === 1 && ext(list[0]) === "zip") {
    // a container: every folder of PNGs is a pack, every .abr, .brush, and
    // .brushset inside is a pack, .gbr and .gih files are a pack per folder;
    // a brush set's download zip comes in as it is
    if (typeof JSZip === "undefined") return { ok: false, error: "Zip library not loaded; try reloading the page, or import the PNGs directly." };
    let zip;
    try { zip = await JSZip.loadAsync(list[0]); } catch (err) { return { ok: false, error: "Couldn't open that zip." }; }
    const entries = Object.values(zip.files).filter(e => !e.dir && !/(^|\/)__MACOSX\//.test(e.name) && !/(^|\/)\./.test(e.name));
    const pngs = entries.filter(e => /\.png$/i.test(e.name));
    const brushes = entries.filter(e => /\.(abr|gbr|gih|brush|brushset)$/i.test(e.name));
    if (pngs.length === 0 && brushes.length === 0) return { ok: false, error: "No PNG or brush files in that zip." };
    if (pngs.length > 500) return { ok: false, error: "A stamp pack holds at most 500 stamps." };
    const zipName = base(list[0].name) || "stamps";
    const leaf = (dir) => dir.replace(/\/$/, "").replace(/^.*\//, "");
    const packs = [];
    const skipped = [];
    const folders = new Map();
    pngs.forEach(e => { const dir = e.name.replace(/[^\/]*$/, ""); if (!folders.has(dir)) folders.set(dir, []); folders.get(dir).push(e); });
    for (const [dir, group] of folders) {
      let names = {};
      const meta = zip.file(`${dir}.wonderdraft_symbols`);
      if (meta) { try { names = JSON.parse(await meta.async("string")) || {}; } catch (err) { names = {}; } }
      const cands = [];
      for (const e of group) {
        const stem = base(e.name);
        const sym = names[stem] && typeof names[stem] === "object" ? names[stem] : {};
        const n = typeof sym.name === "string" && sym.name.trim() ? sym.name.trim().slice(0, 60) : nameOf(stem);
        const kind = sym.draw_mode === "normal" ? "color" : sym.draw_mode === "custom_colors" ? "alpha" : undefined;
        cands.push({ sid: mapStampSlug(stem), name: n, kind, src: new Blob([await e.async("arraybuffer")], { type: "image/png" }) });
      }
      const r = await prepareAll(cands, new Set());
      packs.push(packOf(nameOf(leaf(dir) || zipName), r.stamps, r));
    }
    const gimp = new Map();
    for (const e of brushes) {
      const x = ext(e);
      const stem = base(e.name);
      if (x === "abr") {
        const r = await readAbr(stem, await e.async("arraybuffer"));
        if (r.error) skipped.push(r.error); else packs.push(r);
      } else if (x === "brush" || x === "brushset") {
        const r = await readProcreate([{ name: e.name, data: await e.async("arraybuffer") }], nameOf(stem));
        if (r.error) skipped.push(`${e.name}: ${r.error}`); else packs.push(r);
      } else {
        const dir = e.name.replace(/[^\/]*$/, "");
        if (!gimp.has(dir)) gimp.set(dir, []);
        gimp.get(dir).push({ name: e.name, buf: await e.async("arraybuffer") });
      }
    }
    for (const [dir, items] of gimp) {
      const r = await readGimp(items, items.length === 1 ? nameOf(base(items[0].name)) : nameOf(leaf(dir) || zipName));
      if (r.error) skipped.push(`${leaf(dir) || zipName}: ${r.error}`); else packs.push(r);
    }
    if (packs.length === 0) return { ok: false, error: skipped[0] || "Nothing in that zip could be read." };
    skipped.forEach(reason => packs[0].report.dropped.push({ id: zipName, reason }));
    return finish(packs);
  }
  if (list.length === 1 && ext(list[0]) === "abr") {
    const buf = await list[0].arrayBuffer().catch(() => null);
    if (!buf) return { ok: false, error: "Couldn't read that file." };
    const r = await readAbr(base(list[0].name), buf);
    if (r.error) return { ok: false, error: r.error };
    return finish([r]);
  }
  if (list.every(f => ext(f) === "gbr" || ext(f) === "gih")) {
    const items = [];
    for (const f of list) { const buf = await f.arrayBuffer().catch(() => null); if (buf) items.push({ name: f.name, buf }); }
    if (items.length === 0) return { ok: false, error: "Couldn't read that file." };
    const r = await readGimp(items, list.length === 1 ? (nameOf(base(list[0].name)) || "Brushes") : "Imported brushes");
    if (r.error) return { ok: false, error: r.error };
    return finish([r]);
  }
  if (list.every(f => ext(f) === "brush") || (list.length === 1 && ext(list[0]) === "brushset")) {
    if (typeof JSZip === "undefined") return { ok: false, error: "Zip library not loaded; try reloading the page." };
    const r = await readProcreate(list.map(f => ({ name: f.name, data: f })), list.length === 1 ? nameOf(base(list[0].name)) : "Imported brushes");
    if (r.error) return { ok: false, error: r.error };
    return finish([r]);
  }
  return { ok: false, error: "Import one stamp-pack .json, one .zip (PNGs, or the zip a brush set came in), .png files, one Photoshop .abr, GIMP .gbr or .gih files, or Procreate .brush or .brushset files." };
}

// A stamp's preview, in the strip, the picker, and the panel: an svg body in
// the given paint, or a raster tip drawn through the same tint filter the
// canvas uses (a color tip as is; an alpha tip in the Fill, Ink when none),
// so a preview is the renderer's output and not a second drawing of it. Each
// preview carries its own filter under a React id, so a strip, a picker, and
// a panel on one page never share or lose one.
function MapStampGlyph({ def, fill, stroke, size }) {
  const uid = React.useId().replace(/[^A-Za-z0-9_-]/g, "");
  if (!def) return null;
  const px = size || 22;
  if (def.kind === "alpha" || def.kind === "color") {
    const hex = def.kind === "alpha" ? (fill || MAP_PALETTE[0].hex) : null;
    const fid = hex ? `map-glyph-tint-${uid}` : null;
    return (
      <svg viewBox={`0 0 ${def.width} ${def.height}`} width={px} height={px} aria-hidden="true">
        {fid && <defs><filter id={fid} colorInterpolationFilters="sRGB"><feFlood floodColor={hex} result="tint" /><feComposite in="tint" in2="SourceAlpha" operator="in" /></filter></defs>}
        <image href={def.image} x="0" y="0" width={def.width} height={def.height} filter={fid ? `url(#${fid})` : undefined} />
      </svg>
    );
  }
  return <svg viewBox={def.viewBox} width={px} height={px} fill={fill || "none"} stroke={stroke || "none"} aria-hidden="true" dangerouslySetInnerHTML={{ __html: def.body }} />;
}