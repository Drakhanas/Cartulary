"""r041: raster tips (Cartographia+ cut 11 of the amendment).

A stamp may now be a PNG tip. `mapStamps[i]` gains `kind` ("svg", the r036
body stamps, absent meaning "svg"; "alpha", a coverage mask tinted by the
shape's Fill; "color", shown as is), `image` (a PNG data URL, re-encoded
through a canvas at import so metadata is stripped and the cap holds),
`width`, `height`, and `spacing` (percent of width; 25 for a PNG). On load
the check is shape-only (a `data:image/png;base64,` string under the byte
cap): an <image> with a PNG source can run and fetch nothing.

Import, from the Stamps panel's + Import pack: `.json` (the envelope, now
with `image` entries), `.png` (one or several files at once, one pack), and
`.zip` (a folder of PNGs; each folder with PNGs becomes a pack when there is
more than one, a Wonderdraft `.wonderdraft_symbols` file honored for names).
A PNG with any transparency keeps its alpha as the coverage and its colors
decide alpha against color (any pixel with real hue means color); a fully
opaque PNG is a grayscale mask, black is ink, unless it has color. An alpha
tip is stored white-on-transparent so the tint filter does the rest. Tips
are capped at 1024 on the long side (resized, and the report says so) and
4 MB. The report modal gains a pack-name field for PNG and zip imports and
shows the pack's size. Export writes `image` entries back out.

Rendering: a <symbol> per used tip holding its <image> once, each placement
a <use> stretched to the shape's box, with a tint filter per color in <defs>
(feFlood the Fill, feComposite in SourceAlpha) for alpha tips; Fill None on
an alpha tip draws in Ink. A click
places the tip at 120 units on its long side with the tip's aspect; a drag's
long side is the box's with the aspect kept (the corner handles already
keep a stamp's aspect). The strip, the picker, and the panel preview a tip
through the same filter in a small inline svg (MapStampGlyph).

Decided (Drak, 2026-10-22): every recommendation, with the note that most
items had one.

Declared scope: 16_trunk (+MAP_RASTER_TIP, +MAP_STAMP_ID_MAX, +mapRasterTipCheck,
+mapPrepareRasterTip, +mapReadStampFiles, +MapStampGlyph). No shell change:
the tile and strip previews fit the existing boxes.

String-anchored edits; every anchor must occur exactly once. Run from the
repository root against the r040 tree: python3 inlining/cuts/r041_raster_tips.py
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


RASTER_MODEL = r'''// Raster tips: a PNG tip's cap on the long side (bigger is scaled down at
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
// which is how a Wonderdraft symbol's draw_mode is honored.
function mapPrepareRasterTip(src, want) {
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
            const a = hasAlpha ? px[i + 3] : 255 - Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
            px[i] = 255; px[i + 1] = 255; px[i + 2] = 255; px[i + 3] = a;
          }
          g.putImageData(data, 0, 0);
          notes.push(hasAlpha ? "alpha tip" : "alpha tip from a grayscale image, black as ink");
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

'''

READ_FILES = r'''// The files the Stamps panel's Import takes, read into one or more candidate
// packs: a `.json` envelope (svg bodies and image entries alike), one or
// several `.png` files (one pack), or a `.zip` of PNGs (each folder holding
// PNGs is a pack when there is more than one, named after the folder, else
// after the zip; a Wonderdraft `.wonderdraft_symbols` file beside the PNGs names
// them, and its draw_mode decides the kind, "normal" as is and
// "custom_colors" tinted; `__MACOSX` and dotfiles are skipped). Every raster tip goes through
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
      const r = await mapPrepareRasterTip(c.src, c.kind);
      if (r.error) { dropped.push({ id: c.sid, reason: r.error }); continue; }
      seen.add(c.sid);
      if (r.notes.some(n => /^resized/.test(n))) removed.push({ id: c.sid, items: r.notes.filter(n => /^resized/.test(n)) });
      stamps.push({ sid: c.sid, name: c.name || c.sid, kind: r.kind, image: r.image, width: r.width, height: r.height, spacing: Number.isFinite(c.spacing) ? c.spacing : MAP_RASTER_TIP.spacing });
    }
    return { stamps, dropped, removed };
  };
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
    if (typeof JSZip === "undefined") return { ok: false, error: "Zip library not loaded; try reloading the page, or import the PNGs directly." };
    let zip;
    try { zip = await JSZip.loadAsync(list[0]); } catch (err) { return { ok: false, error: "Couldn't open that zip." }; }
    const entries = Object.values(zip.files).filter(e => !e.dir && !/(^|\/)__MACOSX\//.test(e.name) && !/(^|\/)\./.test(e.name));
    const pngs = entries.filter(e => /\.png$/i.test(e.name));
    if (pngs.length === 0) return { ok: false, error: "No PNG files in that zip." };
    if (pngs.length > 500) return { ok: false, error: "A stamp pack holds at most 500 stamps." };
    const folders = new Map();
    pngs.forEach(e => { const dir = e.name.replace(/[^\/]*$/, ""); if (!folders.has(dir)) folders.set(dir, []); folders.get(dir).push(e); });
    const zipName = base(list[0].name) || "stamps";
    const packs = [];
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
      const folderName = dir.replace(/\/$/, "").replace(/^.*\//, "");
      const name = nameOf(folders.size > 1 && folderName ? folderName : zipName);
      packs.push({ pack: { id: mapStampSlug(name) || "stamps", name, editable: true }, stamps: r.stamps, report: r });
    }
    return finish(packs);
  }
  return { ok: false, error: "Import one stamp-pack .json, one .zip of PNGs, or one or more .png files." };
}

'''

GLYPH = r'''// A stamp's preview, in the strip, the picker, and the panel: an svg body in
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

'''

edit(MOD / "16_trunk.jsx", [
    # ---- model: a stored stamp may be a raster tip
    ("""    const id = mapStampSlug(s.id);
    if (!id || seen.has(id)) return;
    const clean = sanitizeMapStampBody(s.body);
    if (!clean.body) return;
    seen.add(id);
    out.push({
      id,
      name: (typeof s.name === "string" && s.name.trim()) ? s.name.trim().slice(0, 60) : id,
      viewBox: mapStampViewBox(s.viewBox) || "0 0 64 64",
      body: clean.body,
      packId: (typeof s.packId === "string" && s.packId) ? mapStampSlug(s.packId) : "",
      pack: (typeof s.pack === "string" && s.pack.trim()) ? s.pack.trim().slice(0, 80) : "",
    });""",
     """    const id = mapStampSlug(s.id, MAP_STAMP_ID_MAX);
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
    });"""),
    # the raster model helpers, ahead of the slug helper
    ("""function mapStampSlug(v) {
  return String(v == null ? "" : v).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}""",
     """// A stamp or pack id: lower case, a plain charset, at most `max` characters
// (40 by default; a stored id is `<packId>__<sid>` and gets room for both
// halves, since a cap on a composite key is the sum of its parts' caps).
function mapStampSlug(v, max) {
  return String(v == null ? "" : v).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, max || 40);
}

""" + RASTER_MODEL.rstrip("\n")),
    # ---- the envelope parser: image entries become raster candidates; stamps carry a bare sid
    ("""    const rawId = (s && typeof s.id === "string") ? s.id : "";
    const label = rawId || `stamp #${i + 1}`;
    const sid = mapStampSlug(rawId);
    if (!s || typeof s !== "object" || !sid) { droppedStamps.push({ id: label, reason: "no usable id" }); return; }
    if (seen.has(sid)) { droppedStamps.push({ id: label, reason: "duplicate id" }); return; }
    if (typeof s.body !== "string") { droppedStamps.push({ id: label, reason: "no body" }); return; }""",
     """    const rawId = (s && typeof s.id === "string") ? s.id : "";
    const label = rawId || `stamp #${i + 1}`;
    const sid = mapStampSlug(rawId);
    if (!s || typeof s !== "object" || !sid) { droppedStamps.push({ id: label, reason: "no usable id" }); return; }
    if (seen.has(sid)) { droppedStamps.push({ id: label, reason: "duplicate id" }); return; }
    if (typeof s.image === "string") {
      // a raster entry: decoded and classified by the async reader, after this pass
      if (!/^data:image\\/png;base64,/.test(s.image)) { droppedStamps.push({ id: label, reason: "image is not a PNG data URL" }); return; }
      if (s.image.length > MAP_RASTER_TIP.maxBytes * 4 / 3 + 64) { droppedStamps.push({ id: label, reason: "image over 4 MB" }); return; }
      seen.add(sid);
      rasterCandidates.push({ sid, name: (typeof s.name === "string" && s.name.trim()) ? s.name.trim().slice(0, 60) : sid, src: s.image, spacing: Number.isFinite(s.spacing) ? s.spacing : undefined });
      return;
    }
    if (typeof s.body !== "string") { droppedStamps.push({ id: label, reason: "no body or image" }); return; }"""),
    ("""  const seen = new Set();
  const stamps = [];
  const removed = [];
  const droppedStamps = [];
  parsed.stamps.forEach((s, i) => {""",
     """  const seen = new Set();
  const stamps = [];
  const removed = [];
  const droppedStamps = [];
  const rasterCandidates = [];
  parsed.stamps.forEach((s, i) => {"""),
    ("""    seen.add(sid);
    stamps.push({
      id: `${packId}__${sid}`,
      name: (typeof s.name === "string" && s.name.trim()) ? s.name.trim().slice(0, 60) : sid,
      viewBox: vb || "0 0 64 64",
      body: clean.body,
      packId,
      pack: name,
    });
  });
  const existingIds = new Set((Array.isArray(existing) ? existing : []).map(s => s.id));
  const updated = stamps.filter(s => existingIds.has(s.id)).length;
  return { ok: true, pack: { id: packId, name }, stamps, report: { removed, dropped: droppedStamps, updated, added: stamps.length - updated } };
}""",
     """    seen.add(sid);
    stamps.push({
      sid,
      name: (typeof s.name === "string" && s.name.trim()) ? s.name.trim().slice(0, 60) : sid,
      kind: "svg",
      viewBox: vb || "0 0 64 64",
      body: clean.body,
    });
  });
  return { ok: true, pack: { id: packId, name }, stamps, rasterCandidates, report: { removed, dropped: droppedStamps } };
}"""),
    # ---- the export writes raster entries
    ("""    stamps: (stamps || []).map(s => ({
      id: s.id.startsWith(prefix) ? s.id.slice(prefix.length) : s.id,
      name: s.name,
      viewBox: s.viewBox,
      body: s.body,
    })),""",
     """    stamps: (stamps || []).map(s => (s.kind === "alpha" || s.kind === "color"
      ? { id: s.id.startsWith(prefix) ? s.id.slice(prefix.length) : s.id, name: s.name, kind: s.kind, image: s.image, width: s.width, height: s.height, spacing: s.spacing }
      : { id: s.id.startsWith(prefix) ? s.id.slice(prefix.length) : s.id, name: s.name, viewBox: s.viewBox, body: s.body })),"""),
    # the file reader and the glyph, after the groups helper
    ("""// ─── Map drawing renderer (v1.6 pillar 3) ──────────────────────────────────────""",
     READ_FILES + GLYPH + """// ─── Map drawing renderer (v1.6 pillar 3) ──────────────────────────────────────"""),
    # ---- the renderer: a raster tip is an <image>, tinted when alpha
    ("""      ctx.stampsUsed.set(def.id, def);
      const attrs = { ...common, href: `#${ctx.idBase}-stamp-${String(def.id).replace(/[^A-Za-z0-9_-]/g, "")}`, x: f(s.x), y: f(s.y), width: f(s.w), height: f(s.h), fill: s.fill || "none", stroke: s.stroke || "none" };
      if (s.rotation) attrs.transform = `rotate(${f(s.rotation)} ${f(s.x + s.w / 2)} ${f(s.y + s.h / 2)})`;
      return { tag: "use", attrs };""",
     """      if (def.kind === "alpha" || def.kind === "color") {
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
      return { tag: "use", attrs };"""),
    ("""  const ctx = { idBase, defs, stampsUsed: new Map(), stamps: Array.isArray(o.stamps) ? o.stamps : [], placeholder: !!o.placeholder };
  d.layers.forEach(layer => {
    if (!layer.visible) return;
    children.push({ tag: "g", attrs: { "data-layer": layer.id }, children: layer.shapes.map(s => mapShapeNode(s, ctx)).filter(Boolean) });
  });
  ctx.stampsUsed.forEach(def => {
    defs.push({ tag: "symbol", attrs: { id: `${idBase}-stamp-${String(def.id).replace(/[^A-Za-z0-9_-]/g, "")}`, viewBox: def.viewBox, overflow: "visible" }, raw: def.body });
  });""",
     """  const ctx = { idBase, defs, stampsUsed: new Map(), tints: new Map(), stamps: Array.isArray(o.stamps) ? o.stamps : [], placeholder: !!o.placeholder };
  d.layers.forEach(layer => {
    if (!layer.visible) return;
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
  ctx.tints.forEach(node => defs.push(node));"""),
    ("""    const hitCtx = { idBase: "hit", defs: [], stampsUsed: new Map() };""",
     """    const hitCtx = { idBase: "hit", defs: [], stampsUsed: new Map(), tints: new Map() };"""),
    # ---- the hook: the box follows a raster tip's aspect, settled when the press begins
    ("""function useMapDrawing({ data, onChange, svgRef, canvasRef, width, height, fillContext }) {""",
     """function useMapDrawing({ data, onChange, svgRef, canvasRef, width, height, fillContext, stamps }) {"""),
    ("""    if (tool === "rect" || tool === "ellipse" || tool === "stamp") {
      if (!targetLayer) return;
      e.preventDefault();
      setDraft({ type: tool, x0: p[0], y0: p[1], x1: p[0], y1: p[1] });
      return;
    }""",
     """    if (tool === "rect" || tool === "ellipse" || tool === "stamp") {
      if (!targetLayer) return;
      e.preventDefault();
      // a raster tip's box keeps the tip's aspect, long side first; an svg
      // stamp's is square (r041); the aspect rides in the draft for the overlay
      const def = tool === "stamp" ? mapStampDef(stampId, stamps) : null;
      const aspect = def && (def.kind === "alpha" || def.kind === "color") && def.width > 0 && def.height > 0 ? def.width / def.height : 1;
      setDraft({ type: tool, x0: p[0], y0: p[1], x1: p[0], y1: p[1], aspect });
      return;
    }"""),
    ("""  // drag that leaves the canvas still ends cleanly. For a rect or ellipse a
  // drag under two units each way is a click and places nothing; for a stamp
  // a click places the chosen stamp at 120 units centred on it, and a drag
  // places it square at the drag's larger side. A placed stamp is selected,
  // so the strip's angle controls and the frame's handles apply to it.""",
     """  // drag that leaves the canvas still ends cleanly. For a rect or ellipse a
  // drag under two units each way is a click and places nothing; for a stamp
  // a click places the chosen stamp at 120 units on its long side centred on
  // it, and a drag places it with its long side at the drag's larger side; an
  // svg stamp's box is square, a raster tip's keeps the tip's aspect (r041).
  // A placed stamp is selected, so the strip's angle controls and the frame's
  // handles apply to it."""),
    ("""      if (d.type === "stamp") {
        const size = Math.max(w, h);
        const box = size >= 8
          ? { x: r2(x), y: r2(y), w: r2(size), h: r2(size) }
          : { x: r2(d.x0 - 60), y: r2(d.y0 - 60), w: 120, h: 120 };""",
     """      if (d.type === "stamp") {
        const aspect = d.aspect > 0 ? d.aspect : 1;
        const side = Math.max(w, h) >= 8 ? Math.max(w, h) : 120;
        const bw = aspect >= 1 ? side : side * aspect, bh = aspect >= 1 ? side / aspect : side;
        const box = Math.max(w, h) >= 8
          ? { x: r2(x), y: r2(y), w: r2(bw), h: r2(bh) }
          : { x: r2(d.x0 - bw / 2), y: r2(d.y0 - bh / 2), w: r2(bw), h: r2(bh) };"""),
    # the overlay's draft box follows the same aspect
    ("""    const size = Math.max(Math.abs(draft.x1 - draft.x0), Math.abs(draft.y1 - draft.y0));
    if (size >= 8) items.push(<rect key="draft" x={f(x)} y={f(y)} width={f(size)} height={f(size)} fill="none" stroke={style.stroke || MAP_PALETTE[0].hex} strokeWidth={1} strokeDasharray="6 6" vectorEffect="non-scaling-stroke" opacity={0.7} />);""",
     """    const size = Math.max(Math.abs(draft.x1 - draft.x0), Math.abs(draft.y1 - draft.y0));
    const aspect = draft.aspect > 0 ? draft.aspect : 1;
    if (size >= 8) items.push(<rect key="draft" x={f(x)} y={f(y)} width={f(aspect >= 1 ? size : size * aspect)} height={f(aspect >= 1 ? size / aspect : size)} fill="none" stroke={style.stroke || MAP_PALETTE[0].hex} strokeWidth={1} strokeDasharray="6 6" vectorEffect="non-scaling-stroke" opacity={0.7} />);"""),
    ("""  const drawing = useMapDrawing({ data, onChange: commit, svgRef: imgRef, canvasRef, width: canvasTree.width, height: canvasTree.height, fillContext });""",
     """  const drawing = useMapDrawing({ data, onChange: commit, svgRef: imgRef, canvasRef, width: canvasTree.width, height: canvasTree.height, fillContext, stamps });"""),
    # ---- the strip's previews
    ("""                  <button type="button" className="map-stamp-pick active" title={`${armed.name} (${armed.pack || "imported"})`} onClick={() => setPickerOpen(true)}>
                    <svg viewBox={armed.viewBox} width="22" height="22" fill={current.fill || "none"} stroke={current.stroke || "none"} aria-hidden="true" dangerouslySetInnerHTML={{ __html: armed.body }} />
                  </button>""",
     """                  <button type="button" className="map-stamp-pick active" title={`${armed.name} (${armed.pack || "imported"})`} onClick={() => setPickerOpen(true)}>
                    <MapStampGlyph def={armed} fill={current.fill} stroke={current.stroke} size={22} />
                  </button>"""),
    ("""                    <svg viewBox={st.viewBox} width="22" height="22" fill={current.fill || "none"} stroke={current.stroke || "none"} aria-hidden="true" dangerouslySetInnerHTML={{ __html: st.body }} />
                  </button>
                ))}""",
     """                    <MapStampGlyph def={st} fill={current.fill} stroke={current.stroke} size={22} />
                  </button>
                ))}"""),
    # ---- the picker's tiles
    ("""                  <button key={s.id} type="button" className={`map-stamp-tile ${current === s.id ? "active" : ""}`} title={s.id} onClick={() => onPick(s.id)}>
                    <svg viewBox={s.viewBox} width="40" height="40" fill={fill || "none"} stroke={stroke || "none"} aria-hidden="true" dangerouslySetInnerHTML={{ __html: s.body }} />
                    <span className="map-stamp-tile-name">{s.name}</span>
                  </button>""",
     """                  <button key={s.id} type="button" className={`map-stamp-tile ${current === s.id ? "active" : ""}`} title={s.id} onClick={() => onPick(s.id)}>
                    <MapStampGlyph def={s} fill={fill} stroke={stroke} size={40} />
                    <span className="map-stamp-tile-name">{s.name}</span>
                  </button>"""),
    # ---- the panel: import of json, png, zip; a name field; the tiles
    ("""  const [pending, setPending] = useState(null); // a parsed pack waiting on the report modal""",
     """  const [pending, setPending] = useState(null); // the packs read from the import, waiting on the report modal: { packs, index }
  const [pendingName, setPendingName] = useState(""); // the editable name of the pack being shown
  const [reading, setReading] = useState(false); // an import being decoded; the button says so"""),
    ("""  const applyPack = (parsed) => {
    const incoming = new Map(parsed.stamps.map(s => [s.id, s]));
    const next = stamps.map(s => (incoming.has(s.id) ? incoming.get(s.id) : s));
    parsed.stamps.forEach(s => { if (!stamps.some(e => e.id === s.id)) next.push(s); });
    onChange(next);
    const r = parsed.report;
    say(`Imported "${parsed.pack.name}": ${plural(r.added, "new stamp", "new stamps")}, ${r.updated} updated${r.dropped.length ? `, ${r.dropped.length} dropped` : ""}.`);
  };
  const importPack = () => {
    if (isLocked) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const parsed = parseMapStampPack(String(reader.result || ""), stamps);
        if (!parsed.ok) { say(parsed.error, "error"); return; }
        if (parsed.report.removed.length || parsed.report.dropped.length || parsed.stamps.length === 0) { setPending(parsed); return; }
        applyPack(parsed);
      };
      reader.onerror = () => say("Couldn't read that file.", "error");
      reader.readAsText(file);
    };
    input.click();
  };""",
     """  // A read pack becomes stored stamps: the pack's id (a slug of its name when
  // the name is editable) namespaces every stamp id; a stamp this pack
  // imported before is replaced in place, the rest are appended.
  const applyPacks = (packs, current) => {
    let next = current.slice();
    const said = [];
    const used = new Set();
    packs.forEach(p => {
      const typed = (p.pack.editable && typeof p.pack.nameOverride === "string") ? p.pack.nameOverride.trim().slice(0, 80) : "";
      const name = typed || p.pack.name;
      // a pack's id is the one it was read with unless its name was changed here; unique within the batch
      const base = (typed && typed !== p.pack.name) ? (mapStampSlug(typed) || p.pack.id) : p.pack.id;
      let packId = base, n = 2;
      while (used.has(packId)) packId = `${base}-${n++}`;
      used.add(packId);
      const stored = ensureMapStamps(p.stamps.map(s => ({ ...s, id: `${packId}__${s.sid}`, packId, pack: name })));
      const incoming = new Map(stored.map(s => [s.id, s]));
      let updated = 0;
      next = next.map(s => { if (incoming.has(s.id)) { updated += 1; return incoming.get(s.id); } return s; });
      stored.forEach(s => { if (!next.some(e => e.id === s.id)) next.push(s); });
      said.push(`"${name}": ${plural(stored.length - updated, "new stamp", "new stamps")}, ${updated} updated${p.report.dropped.length ? `, ${p.report.dropped.length} dropped` : ""}`);
    });
    onChange(next);
    say(`Imported ${said.join("; ")}.`);
  };
  const importPack = () => {
    if (isLocked) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json,.png,image/png,.zip,application/zip";
    input.multiple = true;
    input.onchange = async (e) => {
      const files = e.target.files;
      if (!files || !files.length) return;
      setReading(true);
      let read;
      try { read = await mapReadStampFiles(files, stamps); } finally { setReading(false); }
      if (!read.ok) { say(read.error, "error"); return; }
      const quiet = read.packs.every(p => !p.pack.editable && !p.report.removed.length && !p.report.dropped.length && p.stamps.length > 0);
      if (quiet) { applyPacks(read.packs, stamps); return; }
      setPendingName(read.packs[0].pack.name);
      setPending({ packs: read.packs, index: 0 });
    };
    input.click();
  };
  const fmtBytes = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);"""),
    ("""        {!isLocked && <button type="button" className="btn btn-small btn-accent" onClick={importPack} title="Import a stamp pack (.json)">+ Import pack</button>}""",
     """        {!isLocked && <button type="button" className="btn btn-small btn-accent" onClick={importPack} disabled={reading} title="Import a stamp pack: a .json pack, a .zip of PNGs, or PNG files">{reading ? "Reading\\u2026" : "+ Import pack"}</button>}"""),
    ("""              <div key={s.id} className="map-stamp-tile" title={`${s.name} (${s.id})`}>
                <svg viewBox={s.viewBox} width="40" height="40" fill={MAP_PALETTE[5].hex} stroke={MAP_PALETTE[0].hex} aria-hidden="true" dangerouslySetInnerHTML={{ __html: s.body }} />
                <span className="map-stamp-tile-name">{s.name}</span>""",
     """              <div key={s.id} className="map-stamp-tile" title={`${s.name} (${s.id}${s.kind === "alpha" || s.kind === "color" ? `, ${s.kind} tip ${s.width} \\u00d7 ${s.height}` : ""})`}>
                <MapStampGlyph def={s} fill={MAP_PALETTE[5].hex} stroke={MAP_PALETTE[0].hex} size={40} />
                <span className="map-stamp-tile-name">{s.name}</span>"""),
    ("""      {pending && (
        <div className="modal-backdrop" onClick={() => setPending(null)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">Import stamp pack "{pending.pack.name}"</div>
            <div className="modal-body">
              <p>
                {pending.stamps.length === 0
                  ? "Nothing in this pack can be imported."
                  : `${plural(pending.stamps.length, "stamp", "stamps")} will import: ${pending.report.added} new${pending.report.updated ? `, ${pending.report.updated} replacing ${pending.report.updated === 1 ? "a stamp" : "stamps"} this pack imported before` : ""}.`}
              </p>
              {pending.report.removed.length > 0 && (
                <div className="modal-notice modal-notice-warning">
                  <strong>The sanitizer removed:</strong>
                  <ul>{listMore(pending.report.removed, 12).map((r, i) => (typeof r === "string" ? <li key={i}>{r}</li> : <li key={i}><code>{r.id}</code>: {r.items.join(", ")}</li>))}</ul>
                </div>
              )}
              {pending.report.dropped.length > 0 && (
                <div className="modal-notice modal-notice-warning">
                  <strong>Dropped:</strong>
                  <ul>{listMore(pending.report.dropped, 12).map((r, i) => (typeof r === "string" ? <li key={i}>{r}</li> : <li key={i}><code>{r.id}</code>: {r.reason}</li>))}</ul>
                </div>
              )}
              <p className="map-stamps-note">A stamp body may hold only g, path, circle, ellipse, rect, polygon, polyline, and line, with geometry, paint, opacity, and transform attributes. Everything else is removed on import and again whenever the world loads.</p>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setPending(null)}>Cancel</button>
              <button type="button" className="btn btn-accent" disabled={pending.stamps.length === 0} onClick={() => { applyPack(pending); setPending(null); }}>Import {plural(pending.stamps.length, "stamp", "stamps")}</button>
            </div>
          </div>
        </div>
      )}""",
     """      {pending && (() => {
        // one modal per pack read; a zip of several folders steps through them
        const cur = pending.packs[pending.index];
        const last = pending.index === pending.packs.length - 1;
        const commit = () => {
          cur.pack.nameOverride = pendingName;
          if (last) { applyPacks(pending.packs, stamps); setPending(null); return; }
          setPendingName(pending.packs[pending.index + 1].pack.name);
          setPending({ ...pending, index: pending.index + 1 });
        };
        const skip = () => {
          if (last) { const rest = pending.packs.filter((p, i) => i !== pending.index); if (rest.length) applyPacks(rest, stamps); setPending(null); return; }
          setPendingName(pending.packs[pending.index + 1].pack.name);
          setPending({ packs: pending.packs.filter((p, i) => i !== pending.index), index: pending.index });
        };
        return (
          <div className="modal-backdrop" onClick={() => setPending(null)}>
            <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
              <div className="modal-hdr">Import stamp pack "{cur.pack.editable ? pendingName : cur.pack.name}"{pending.packs.length > 1 ? ` (${pending.index + 1} of ${pending.packs.length})` : ""}</div>
              <div className="modal-body">
                {cur.pack.editable && (
                  <div className="form-field">
                    <label className="form-label">Pack name</label>
                    <input className="input" value={pendingName} onChange={e => setPendingName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") commit(); }} placeholder="Pack name" />
                  </div>
                )}
                <p>
                  {cur.stamps.length === 0
                    ? "Nothing in this pack can be imported."
                    : `${plural(cur.stamps.length, "stamp", "stamps")} will import: ${cur.report.added} new${cur.report.updated ? `, ${cur.report.updated} replacing ${cur.report.updated === 1 ? "a stamp" : "stamps"} this pack imported before` : ""}${cur.stamps.some(s => s.image) ? `, ${fmtBytes(cur.report.bytes)} in the world file` : ""}.`}
                </p>
                {cur.report.removed.length > 0 && (
                  <div className="modal-notice modal-notice-warning">
                    <strong>Changed on import:</strong>
                    <ul>{listMore(cur.report.removed, 12).map((r, i) => (typeof r === "string" ? <li key={i}>{r}</li> : <li key={i}><code>{r.id}</code>: {r.items.join(", ")}</li>))}</ul>
                  </div>
                )}
                {cur.report.dropped.length > 0 && (
                  <div className="modal-notice modal-notice-warning">
                    <strong>Dropped:</strong>
                    <ul>{listMore(cur.report.dropped, 12).map((r, i) => (typeof r === "string" ? <li key={i}>{r}</li> : <li key={i}><code>{r.id}</code>: {r.reason}</li>))}</ul>
                  </div>
                )}
                <p className="map-stamps-note">An svg stamp body may hold only g, path, circle, ellipse, rect, polygon, polyline, and line, with geometry, paint, opacity, and transform attributes; everything else is removed on import and again whenever the world loads. A PNG tip is decoded and re-encoded here, at most 1024 pixels on its long side; one with any color is placed as is, one without is tinted by the map's Fill.</p>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setPending(null)}>Cancel</button>
                {pending.packs.length > 1 && <button type="button" className="btn btn-ghost" onClick={skip}>Skip this pack</button>}
                <button type="button" className="btn btn-accent" disabled={cur.stamps.length === 0} onClick={commit}>{last ? `Import ${plural(cur.stamps.length, "stamp", "stamps")}` : "Next"}</button>
              </div>
            </div>
          </div>
        );
      })()}"""),
])

print("r041 applied")
