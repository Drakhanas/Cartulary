"""r042: brush importers and the PNG-zip export (Cartographia+ cut 12 of the
amendment).

The Stamps panel's Import now also takes a Photoshop `.abr` (versions 1, 2,
6, 7, and 10; sampled tips only, 8-bit masks, raw or PackBits rows; names
and spacing for 6+ paired to each tip by its sample id through a byte scan
of the `desc` section), GIMP `.gbr` (versions 1, 2, 3; gray masks and RGBA
pixmaps) and `.gih` hoses (every cell a stamp), and Procreate `.brush` and
`.brushset` files (zips; `Shape.png` is the tip with luminance as coverage,
Grain.png ignored; the brush name read from `Brush.archive` through a
minimal binary-plist reader, the folder or file name as fallback). A brush
tip lands as an alpha tip through mapPrepareRasterTip like any PNG, so the
report modal, the pack-name field, the size line, and the caps apply.
A known .abr version that yields no tip is refused with what was found.

Export: a pack, or the four built-ins, as a PNG zip in the Wonderdraft
layout (`<pack>/sprites/symbols/<pack>/<stem>.png` with a
`.wonderdraft_symbols` file: name, radius, offsets, draw_mode), svg stamps
rasterized at 512 on the long side white on transparent as custom_colors,
raster tips as stored (alpha custom_colors, color normal). "PNG zip" beside
Export on every pack, "Built-ins as PNG zip" beside Export built-ins.

World settings' Import .json refuses a brush or image file with a pointer
to the Stamps panel (`12_trunk`), as it refuses a pack file since r036.

Decided (Drak, 2026-10-22): every recommendation.

Declared scope: 16_trunk (+mapPixelsToDataUrl, +mapReadAbr, +mapReadGbr,
+mapReadGih, +mapReadBplist, +mapReadProcreateBrushes,
+buildMapStampPngZip), 12_trunk (the redirect).

String-anchored edits; every anchor must occur exactly once. Run from the
repository root against the r041 tree: python3 inlining/cuts/r042_importers.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
MOD = ROOT / "cartulary-src" / "modules"


def edit(path, pairs):
    s = path.read_text(encoding="utf-8")
    for old, new in pairs:
        c = s.count(old)
        assert c == 1, f"{path.name}: anchor occurs {c} times: {old[:80]!r}"
        s = s.replace(old, new)
    path.write_text(s, encoding="utf-8")


def replace_span(path, start, end, new):
    """Replace the text from the unique `start` anchor through the unique `end` anchor."""
    s = path.read_text(encoding="utf-8")
    assert s.count(start) == 1, f"{path.name}: start anchor occurs {s.count(start)} times"
    assert s.count(end) == 1, f"{path.name}: end anchor occurs {s.count(end)} times"
    a = s.index(start)
    b = s.index(end) + len(end)
    assert a < b, f"{path.name}: end anchor precedes start anchor"
    path.write_text(s[:a] + new + s[b:], encoding="utf-8")


READERS = r'''
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
'''

TAIL = r'''  // ---- the readers behind the routes; each gives { pack, stamps, report } or { error }
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
}'''

edit(MOD / "16_trunk.jsx", [
    # ---- the classifier takes the Procreate reading of an opaque image
    ("""// alpha to work with. `want` ("alpha" or "color") overrides the pixel test,
// which is how a Wonderdraft symbol's draw_mode is honored.
function mapPrepareRasterTip(src, want) {""",
     """// alpha to work with. `want` ("alpha" or "color") overrides the pixel test,
// which is how a Wonderdraft symbol's draw_mode is honored; `luma` reads an
// opaque image with its luminance as the coverage (white is the shape), which
// is how a Procreate shape is drawn.
function mapPrepareRasterTip(src, want, luma) {"""),
    ("""            const a = hasAlpha ? px[i + 3] : 255 - Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
            px[i] = 255; px[i + 1] = 255; px[i + 2] = 255; px[i + 3] = a;
          }
          g.putImageData(data, 0, 0);
          notes.push(hasAlpha ? "alpha tip" : "alpha tip from a grayscale image, black as ink");""",
     """            const l = Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
            const a = hasAlpha ? px[i + 3] : (luma ? l : 255 - l);
            px[i] = 255; px[i + 1] = 255; px[i + 2] = 255; px[i + 3] = a;
          }
          g.putImageData(data, 0, 0);
          notes.push(hasAlpha ? "alpha tip" : (luma ? "alpha tip from a grayscale image, white as the shape" : "alpha tip from a grayscale image, black as ink"));"""),
    # ---- the readers, after the classifier
    ("""    img.onerror = () => done({ error: "not a readable PNG" });
    img.src = url;
  });
}
""",
     """    img.onerror = () => done({ error: "not a readable PNG" });
    img.src = url;
  });
}
""" + READERS),
    # ---- the reader's comment and branches
    ("""// The files the Stamps panel's Import takes, read into one or more candidate
// packs: a `.json` envelope (svg bodies and image entries alike), one or
// several `.png` files (one pack), or a `.zip` of PNGs (each folder holding
// PNGs is a pack when there is more than one, named after the folder, else
// after the zip; a Wonderdraft `.wonderdraft_symbols` file beside the PNGs names
// them, and its draw_mode decides the kind, "normal" as is and
// "custom_colors" tinted; `__MACOSX` and dotfiles are skipped). Every raster tip goes through
// mapPrepareRasterTip. Resolves to { ok, packs: [{ pack: { id, name,""",
     """// The files the Stamps panel's Import takes, read into one or more candidate
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
// mapPrepareRasterTip. Resolves to { ok, packs: [{ pack: { id, name,"""),
    ("""      const r = await mapPrepareRasterTip(c.src, c.kind);""",
     """      const r = await mapPrepareRasterTip(c.src, c.kind, c.luma === true);"""),
    # ---- the panel: a blob download, the PNG zips, the accept list, the note
    ("""  const [reading, setReading] = useState(false); // an import being decoded; the button says so""",
     """  const [reading, setReading] = useState(false); // an import being decoded; the button says so
  const [writing, setWriting] = useState(false); // a PNG zip being built; its buttons wait"""),
    ("""  const download = (filename, obj) => {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);""",
     """  const downloadBlob = (filename, blob) => {
    const url = URL.createObjectURL(blob);"""),
    ("""    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;""",
     """    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const download = (filename, obj) => downloadBlob(filename, new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" }));
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  // A pack as PNGs in the Wonderdraft layout (buildMapStampPngZip); the
  // built-ins through the same path under their pack id.
  const exportPngZip = async (packId, name, list) => {
    if (writing) return;
    if (typeof JSZip === "undefined") { say("Zip library not loaded; try reloading the page.", "error"); return; }
    setWriting(true);
    try {
      const blob = await buildMapStampPngZip(packId, list);
      downloadBlob(`${packId}.stamps-png.zip`, blob);
      say(`Wrote "${name}" as ${plural(list.length, "PNG", "PNGs")} in the Wonderdraft layout (${fmtBytes(blob.size)}). Unzip it into Wonderdraft's assets folder; Inkarnate and Dungeondraft take the PNGs inside.`);
    } catch (err) {
      console.warn("PNG zip failed", err);
      say("The PNG zip could not be written.", "error");
    } finally {
      setWriting(false);
    }
  };"""),
    ("""    input.accept = ".json,application/json,.png,image/png,.zip,application/zip";""",
     """    input.accept = ".json,application/json,.png,image/png,.zip,application/zip,.abr,.gbr,.gih,.brush,.brushset";"""),
    ("""        {!isLocked && <button type="button" className="btn btn-small btn-accent" onClick={importPack} disabled={reading} title="Import a stamp pack: a .json pack, a .zip of PNGs, or PNG files">{reading ? "Reading\\u2026" : "+ Import pack"}</button>}
        <button type="button" className="btn btn-small btn-ghost" onClick={exportBuiltins} title="A correct pack file with the four built-in stamps, to start your own from">Export built-ins as a pack</button>""",
     """        {!isLocked && <button type="button" className="btn btn-small btn-accent" onClick={importPack} disabled={reading} title="Import a stamp pack: a .json pack, a .zip of PNGs, PNG files, a Photoshop .abr, GIMP .gbr or .gih files, or Procreate .brush or .brushset files">{reading ? "Reading\\u2026" : "+ Import pack or brushes"}</button>}
        <button type="button" className="btn btn-small btn-ghost" onClick={exportBuiltins} title="A correct pack file with the four built-in stamps, to start your own from">Export built-ins as a pack</button>
        <button type="button" className="btn btn-small btn-ghost" onClick={() => exportPngZip("cartulary-builtins", "Cartulary built-in stamps", MAP_BUILTIN_STAMPS)} disabled={writing} title="The four built-in stamps as PNGs in the Wonderdraft folder layout">{writing ? "Writing\\u2026" : "Built-ins as PNG zip"}</button>"""),
    ("""            <button type="button" className="btn btn-small btn-ghost" onClick={() => exportGroup(g)} title="Write this pack back out as a file">Export</button>""",
     """            <button type="button" className="btn btn-small btn-ghost" onClick={() => exportGroup(g)} title="Write this pack back out as a file">Export</button>
            <button type="button" className="btn btn-small btn-ghost" onClick={() => exportPngZip(g.id, g.name, g.stamps)} disabled={writing} title="This pack as PNGs in the Wonderdraft folder layout, svg stamps rasterized">{writing ? "Writing\\u2026" : "PNG zip"}</button>"""),
    ("""        <div className="map-stamps-empty">No imported stamps. The map editor's Stamp tool has four built in; a stamp pack adds more.</div>""",
     """        <div className="map-stamps-empty">No imported stamps. The map editor's Stamp tool has four built in; a stamp pack adds more. Import takes a Cartulary pack, PNG files or a zip of them, a Photoshop .abr or the zip it came in, GIMP .gbr and .gih files, and Procreate .brush and .brushset files.</div>"""),
    ("""        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// The layer panel under the strip""",
     """        <div className="modal-actions">
          <span className="map-stamps-note" style={{ marginRight: "auto" }}>Import packs and brush files from the Stamps panel at the top of Cartographia.</span>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// The layer panel under the strip"""),
    ("""A PNG tip is decoded and re-encoded here, at most 1024 pixels on its long side; one with any color is placed as is, one without is tinted by the map's Fill.</p>""",
     """A PNG tip is decoded and re-encoded here, at most 1024 pixels on its long side; one with any color is placed as is, one without is tinted by the map's Fill. A Photoshop .abr, a GIMP .gbr or .gih, and a Procreate shape import as tinted tips.</p>"""),
])

replace_span(
    MOD / "16_trunk.jsx",
    """  if (list.length === 1 && ext(list[0]) === "json") {
    const text = await new Promise((resolve, reject) => {""",
    """  return { ok: false, error: "Import one stamp-pack .json, one .zip of PNGs, or one or more .png files." };
}""",
    TAIL,
)

edit(MOD / "12_trunk.jsx", [
    ("""  const importWorld = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      let parsed;
      try {
        parsed = JSON.parse(reader.result);
      } catch (e) {
        console.error(e);
        flash("Import failed: file is not valid JSON", "error");
        return;
      }""",
     """  const importWorld = (file) => {
    // A brush or image file is for the Stamps panel (r042), as a pack file
    // is since r036; say so before reading it as JSON.
    const brushExt = /\\.(abr|gbr|gih|brush|brushset|png|zip)$/i.exec(file && file.name ? file.name : "");
    if (brushExt) {
      const e = brushExt[1].toLowerCase();
      flash(e === "zip" || e === "png" ? `That's a .${e}, not a world file. Stamp images import from the Stamps panel at the top of Cartographia.` : `That's a brush file (.${e}). Import it from the Stamps panel at the top of Cartographia, not as a world.`, "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      let parsed;
      try {
        parsed = JSON.parse(reader.result);
      } catch (e) {
        console.error(e);
        flash("Import failed: file is not valid JSON", "error");
        return;
      }"""),
])

print("r042 applied")
