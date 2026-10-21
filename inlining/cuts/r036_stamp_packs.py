"""r036: stamp packs (Cartographia+ cut 6).

The envelope `{ cartulary_mapstamp_pack: 1, id?, name, stamps: [{ id, name,
viewBox, body }] }`; a Stamps panel at the head of the Cartographia index (imported
stamps grouped by pack, Delete per stamp and per pack with an in-use warning, Export
per pack, Import pack, Export built-ins as a pack); the sanitizer, which
rebuilds every body from an allowlist of elements and attributes with every
value checked, runs on import and again on load (ensureMapStamps), and reports
what it removed in a modal before anything lands; ids namespaced by pack
(`forest__pine`), so packs never collide with each other or with the built-ins
and a re-import replaces its own stamps in place; the renderer resolves
imported stamps for the view, the editor, and the HTML export; the editor
draws a dashed placeholder for a stamp that is missing; the strip's picker
gains More..., a grid of every stamp grouped by pack; the help page documents
the envelope, the allowlist, and the save-file shapes.

Decided at the fork (Drak, 2026-10-21): 1a, 2c, 3b and 3b, 4a, 5c, 6b.

Declared scope: 16_trunk, 12_trunk, 08_export-layer, 24_home-data, 25_trunk,
shell.html.
10_migrate already calls ensureMapStamps on load and needs no change.

String-anchored edits; every anchor must occur exactly once. Run from the
repository root against the r035 tree: python3 inlining/cuts/r036_stamp_packs.py
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


STAMP_MODEL = r'''// state.mapStamps: stamps imported from stamp packs, world-scoped, each
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
    const id = mapStampSlug(s.id);
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
function mapStampSlug(v) {
  return String(v == null ? "" : v).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
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
  parsed.stamps.forEach((s, i) => {
    const rawId = (s && typeof s.id === "string") ? s.id : "";
    const label = rawId || `stamp #${i + 1}`;
    const sid = mapStampSlug(rawId);
    if (!s || typeof s !== "object" || !sid) { droppedStamps.push({ id: label, reason: "no usable id" }); return; }
    if (seen.has(sid)) { droppedStamps.push({ id: label, reason: "duplicate id" }); return; }
    if (typeof s.body !== "string") { droppedStamps.push({ id: label, reason: "no body" }); return; }
    if (s.body.length > 200000) { droppedStamps.push({ id: label, reason: "body over 200 KB" }); return; }
    const clean = sanitizeMapStampBody(s.body);
    const items = clean.dropped.slice();
    const vb = mapStampViewBox(s.viewBox);
    if (s.viewBox != null && !vb) items.push(`viewBox "${String(s.viewBox).slice(0, 24)}" replaced by 0 0 64 64`);
    if (items.length) removed.push({ id: sid, items });
    if (!clean.body) { droppedStamps.push({ id: label, reason: "nothing left after cleaning" }); return; }
    seen.add(sid);
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
    stamps: (stamps || []).map(s => ({
      id: s.id.startsWith(prefix) ? s.id.slice(prefix.length) : s.id,
      name: s.name,
      viewBox: s.viewBox,
      body: s.body,
    })),
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
'''

STAMP_PANEL = r'''
// The Stamps panel at the head of the Cartographia index (above the map list;
// a world has far fewer stamps than maps, by Drak's call): every imported stamp
// grouped by pack with a preview, Delete per stamp and per pack (warning with
// the count of placed stamps that will go missing), Export per pack (its own
// ids, so a re-import replaces its own), Import pack, and Export built-ins as
// a pack, which is a correct file to start a new pack from. An import that
// has nothing to report lands at once with a flash; one where the sanitizer
// removed something, or dropped a stamp, shows the report first, with Cancel.
function MapStampsPanel({ state, isLocked, onChange, flash }) {
  const stamps = Array.isArray(state.mapStamps) ? state.mapStamps : [];
  const [pending, setPending] = useState(null); // a parsed pack waiting on the report modal
  const usage = useMemo(() => mapStampUsage(state), [state.cartographia]);
  const groups = mapStampGroups(stamps);
  const say = (text, type) => { if (flash) flash(text, type); };
  const download = (filename, obj) => {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const applyPack = (parsed) => {
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
  };
  const exportGroup = (g) => {
    download(`${g.id}.cartulary-stamps.json`, buildMapStampPackFile(g.id, g.name, g.stamps));
    say(`Exported "${g.name}" (${plural(g.stamps.length, "stamp", "stamps")}).`);
  };
  const exportBuiltins = () => {
    download("cartulary-builtins.cartulary-stamps.json", buildMapStampPackFile("cartulary-builtins", "Cartulary built-in stamps", MAP_BUILTIN_STAMPS));
    say("Exported the four built-in stamps as a pack. Edit it, rename it, and import it to make your own.");
  };
  const usageNote = (ids) => {
    let shapes = 0;
    const maps = new Set();
    ids.forEach(id => { const u = usage[id]; if (u) { shapes += u.shapes; } });
    (Array.isArray(state.cartographia) ? state.cartographia : []).forEach(rec => {
      const d = rec && rec.mapData && rec.mapData.drawing;
      if ((d && Array.isArray(d.layers) ? d.layers : []).some(l => (Array.isArray(l.shapes) ? l.shapes : []).some(s => s && s.type === "stamp" && ids.includes(s.stampId)))) maps.add(rec.id);
    });
    return shapes > 0 ? ` It is placed ${plural(shapes, "time", "times")} on ${plural(maps.size, "map", "maps")}; those will show as missing until a pack with it is imported again.` : "";
  };
  const removeStamp = (s) => {
    if (isLocked) return;
    if (!confirm(`Delete the stamp "${s.name}"?${usageNote([s.id])}`)) return;
    onChange(stamps.filter(x => x.id !== s.id));
  };
  const removeGroup = (g) => {
    if (isLocked) return;
    if (!confirm(`Delete the pack "${g.name}" and its ${plural(g.stamps.length, "stamp", "stamps")}?${usageNote(g.stamps.map(s => s.id))}`)) return;
    const ids = new Set(g.stamps.map(s => s.id));
    onChange(stamps.filter(x => !ids.has(x.id)));
  };
  const listMore = (items, max) => (items.length > max ? [...items.slice(0, max), `and ${items.length - max} more`] : items);
  return (
    <div className="map-stamps">
      <div className="map-stamps-head">
        <span className="map-stamps-title">Stamps</span>
        {!isLocked && <button type="button" className="btn btn-small btn-accent" onClick={importPack} title="Import a stamp pack (.json)">+ Import pack</button>}
        <button type="button" className="btn btn-small btn-ghost" onClick={exportBuiltins} title="A correct pack file with the four built-in stamps, to start your own from">Export built-ins as a pack</button>
      </div>
      {groups.length === 0 ? (
        <div className="map-stamps-empty">No imported stamps. The map editor's Stamp tool has four built in; a stamp pack adds more.</div>
      ) : groups.map(g => (
        <div key={g.id} className="map-stamp-group">
          <div className="map-stamp-group-head">
            <span className="map-stamp-group-name">{g.name}</span>
            <span>{plural(g.stamps.length, "stamp", "stamps")}</span>
            <span style={{ flex: 1 }} />
            <button type="button" className="btn btn-small btn-ghost" onClick={() => exportGroup(g)} title="Write this pack back out as a file">Export</button>
            {!isLocked && <button type="button" className="btn btn-small btn-danger" onClick={() => removeGroup(g)} title="Delete this pack and every stamp in it">Delete pack</button>}
          </div>
          <div className="map-stamp-grid">
            {g.stamps.map(s => (
              <div key={s.id} className="map-stamp-tile" title={`${s.name} (${s.id})`}>
                <svg viewBox={s.viewBox} width="40" height="40" fill={MAP_PALETTE[5].hex} stroke={MAP_PALETTE[0].hex} aria-hidden="true" dangerouslySetInnerHTML={{ __html: s.body }} />
                <span className="map-stamp-tile-name">{s.name}</span>
                {!isLocked && <button type="button" className="map-stamp-tile-x" title="Delete this stamp" onClick={() => removeStamp(s)}>{"\u00d7"}</button>}
              </div>
            ))}
          </div>
        </div>
      ))}
      {pending && (
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
      )}
    </div>
  );
}
'''

STAMP_PICKER = r'''
// The grid the strip's More... button opens: every stamp, built in and
// imported, grouped by pack; a click arms it (and swaps the selected stamp's
// symbol, as the inline buttons do) and closes.
function MapStampPicker({ stamps, current, fill, stroke, onPick, onClose }) {
  const groups = [{ id: "builtin", name: "Built in", stamps: MAP_BUILTIN_STAMPS }, ...mapStampGroups(stamps)];
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">Choose a stamp</div>
        <div className="modal-body">
          {groups.map(g => (
            <div key={g.id} className="modal-section">
              <div className="modal-section-hdr">{g.name}</div>
              <div className="map-stamp-grid">
                {g.stamps.map(s => (
                  <button key={s.id} type="button" className={`map-stamp-tile ${current === s.id ? "active" : ""}`} title={s.id} onClick={() => onPick(s.id)}>
                    <svg viewBox={s.viewBox} width="40" height="40" fill={fill || "none"} stroke={stroke || "none"} aria-hidden="true" dangerouslySetInnerHTML={{ __html: s.body }} />
                    <span className="map-stamp-tile-name">{s.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
'''

edit(MOD / "16_trunk.jsx", [
    # ---- model: the sanitizer and the pack machinery replace the shape-check stub
    ("""// state.mapStamps: stamps imported from stamp packs, world-scoped. Shape-checked
// here; the import sanitizer (allowlisted elements and attributes) arrives with
// stamp packs (cut 6) and runs on import and on load. Until then nothing renders
// a stamp, so an unsanitized body cannot reach a page.
function ensureMapStamps(list) {
  return (Array.isArray(list) ? list : [])
    .filter(s => s && typeof s === "object" && typeof s.id === "string" && s.id)
    .map(s => ({
      id: s.id,
      name: (typeof s.name === "string" && s.name.trim()) ? s.name : s.id,
      viewBox: typeof s.viewBox === "string" ? s.viewBox : "0 0 64 64",
      body: typeof s.body === "string" ? s.body : "",
    }));
}
""", STAMP_MODEL),

    # ---- renderer: imported stamps resolve; a missing one gets a placeholder in the editor
    ("""// with the stamp. Bodies are markup written as markup (the `raw` node below);
// these are code, so nothing unsanitized reaches a page. Imported stamps
// (state.mapStamps) have the same shape and render once the sanitizer lands
// (cut 6); until then mapStampDef knows only these.
const MAP_BUILTIN_STAMPS = [""",
     """// with the stamp. Bodies are markup written as markup (the `raw` node below);
// these are code. Imported stamps (state.mapStamps) have the same shape and
// reach the renderer only through ensureMapStamps, which sanitizes every body
// on load, so nothing unsanitized reaches a page either way.
const MAP_BUILTIN_STAMPS = ["""),
    ("""function mapStampDef(id) {
  return MAP_BUILTIN_STAMPS.find(s => s.id === id) || null;
}""",
     """// A stamp by id: the built-ins first, then the world's imported stamps.
function mapStampDef(id, stamps) {
  return MAP_BUILTIN_STAMPS.find(s => s.id === id) || (Array.isArray(stamps) ? stamps.find(s => s && s.id === id) : null) || null;
}"""),
    ("""// One normalized shape to one node, or null for a stamp whose symbol is not
// known. ctx ({idBase, defs, stampsUsed}) comes from buildMapDrawingTree: a
// bent label's path goes into the defs, and a stamp's symbol is recorded so
// the tree can emit it once. Without ctx a bent label renders straight and a
// stamp renders nothing.""",
     """// One normalized shape to one node, or null for a stamp whose symbol is not
// known. ctx ({idBase, defs, stampsUsed, stamps, placeholder}) comes from
// buildMapDrawingTree: a bent label's path goes into the defs, a stamp's
// symbol (built in or from ctx.stamps) is recorded so the tree can emit it
// once, and with ctx.placeholder (the editor) a stamp whose symbol is missing
// draws as a dashed box with a question mark so it can be found, re-pointed,
// or deleted; the view and the export draw nothing for it. Without ctx a bent
// label renders straight and a stamp renders nothing."""),
    ("""    case "stamp": {
      if (!ctx) return null;
      const def = mapStampDef(s.stampId);
      if (!def) return null;
      ctx.stampsUsed.set(def.id, def);""",
     """    case "stamp": {
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
      ctx.stampsUsed.set(def.id, def);"""),
    ("""// opts: { id, className, label, imageHref, imageWidth, imageHeight }. With an
// image the canvas is the image's natural size and the background is not
// drawn; without one the background rect (and its grain) comes first. Then one""",
     """// opts: { id, className, label, imageHref, imageWidth, imageHeight, stamps,
// placeholder }. stamps is the world's imported stamps (state.mapStamps), which
// the built-ins come before; placeholder is the editor's, see mapShapeNode.
// With an image the canvas is the image's natural size and the background is not
// drawn; without one the background rect (and its grain) comes first. Then one"""),
    ("""  const ctx = { idBase, defs, stampsUsed: new Map() };""",
     """  const ctx = { idBase, defs, stampsUsed: new Map(), stamps: Array.isArray(o.stamps) ? o.stamps : [], placeholder: !!o.placeholder };"""),

    # ---- the strip: More..., the armed imported stamp, a missing-stamp note; the picker after the layer panel
    ("""function MapToolStrip({ drawing, history, showPresets, presetValue, onPreset, canvasSize, onCustomSize, layersOpen, onToggleLayers }) {
  const { tool, setTool, current, applyStyle, editSelected, selectedShape, deleteSelected, layers, activeLayerId, setActiveLayerId, moveShapeToLayer, focusTextId, consumeFocusText } = drawing;""",
     """function MapToolStrip({ drawing, history, showPresets, presetValue, onPreset, canvasSize, onCustomSize, layersOpen, onToggleLayers, stamps }) {
  const { tool, setTool, current, applyStyle, editSelected, selectedShape, deleteSelected, layers, activeLayerId, setActiveLayerId, moveShapeToLayer, focusTextId, consumeFocusText } = drawing;
  const worldStamps = Array.isArray(stamps) ? stamps : [];
  const [pickerOpen, setPickerOpen] = useState(false);"""),
    ("""          {tool === "stamp" && (
            <>
              <span className="map-tools-label">Stamp</span>
              {MAP_BUILTIN_STAMPS.map(st => (
                <button
                  key={st.id}
                  type="button"
                  className={`map-stamp-pick ${stampId === st.id ? "active" : ""}`}
                  title={st.name}
                  onClick={() => { setStampId(st.id); if (selectedShape && selectedShape.type === "stamp") editSelected({ stampId: st.id }); }}
                >
                  <svg viewBox={st.viewBox} width="22" height="22" fill={current.fill || "none"} stroke={current.stroke || "none"} aria-hidden="true" dangerouslySetInnerHTML={{ __html: st.body }} />
                </button>
              ))}
            </>
          )}""",
     """          {(tool === "stamp" || (selectedShape && selectedShape.type === "stamp")) && (() => {
            // Pick arms the stamp for the next placement and swaps the selected
            // stamp's symbol, which is also how a missing stamp is re-pointed.
            const pick = (id) => { setStampId(id); if (selectedShape && selectedShape.type === "stamp") editSelected({ stampId: id }); };
            const armed = worldStamps.find(s => s.id === stampId) || null;
            const missing = selectedShape && selectedShape.type === "stamp" && !mapStampDef(selectedShape.stampId, worldStamps) ? selectedShape.stampId : null;
            return (
              <>
                <span className="map-tools-label">Stamp</span>
                {armed && (
                  <button type="button" className="map-stamp-pick active" title={`${armed.name} (${armed.pack || "imported"})`} onClick={() => setPickerOpen(true)}>
                    <svg viewBox={armed.viewBox} width="22" height="22" fill={current.fill || "none"} stroke={current.stroke || "none"} aria-hidden="true" dangerouslySetInnerHTML={{ __html: armed.body }} />
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
                    <svg viewBox={st.viewBox} width="22" height="22" fill={current.fill || "none"} stroke={current.stroke || "none"} aria-hidden="true" dangerouslySetInnerHTML={{ __html: st.body }} />
                  </button>
                ))}
                {worldStamps.length > 0 && <button type="button" className="btn btn-small btn-ghost" onClick={() => setPickerOpen(true)} title="Every stamp, built in and imported">More{"\\u2026"}</button>}
                {missing && <span className="map-tools-missing" title="This stamp's pack is not in the world; pick another symbol or delete the shape">missing: {missing}</span>}
                {pickerOpen && <MapStampPicker stamps={worldStamps} current={stampId} fill={current.fill} stroke={current.stroke} onPick={(id) => { pick(id); setPickerOpen(false); }} onClose={() => setPickerOpen(false)} />}
              </>
            );
          })()}"""),
    ("""// The layer panel under the strip: one row per layer, top-most first (the""",
     STAMP_PICKER + """
// The layer panel under the strip: one row per layer, top-most first (the"""),

    # ---- the view and the editor pass the world's stamps; the editor asks for placeholders
    ("""    imageHref: mapData.image ? imageUrl : null,
    imageWidth: imageSize ? imageSize.width : null,
    imageHeight: imageSize ? imageSize.height : null,
  }), [mapData, entry.id, entry.name, imageUrl, imageSize]);""",
     """    imageHref: mapData.image ? imageUrl : null,
    imageWidth: imageSize ? imageSize.width : null,
    imageHeight: imageSize ? imageSize.height : null,
    stamps: state ? state.mapStamps : [],
  }), [mapData, entry.id, entry.name, imageUrl, imageSize, state ? state.mapStamps : null]);"""),
    ("""function MapEditor({ mapData, onChange, dirHandle, imageFolder, entries, bodies, flash }) {""",
     """function MapEditor({ mapData, onChange, dirHandle, imageFolder, entries, bodies, flash, stamps }) {"""),
    ("""    imageHref: data.image ? imageUrl : null,
    imageWidth: imageSize ? imageSize.width : null,
    imageHeight: imageSize ? imageSize.height : null,
  }), [data, imageUrl, imageSize]);""",
     """    imageHref: data.image ? imageUrl : null,
    imageWidth: imageSize ? imageSize.width : null,
    imageHeight: imageSize ? imageSize.height : null,
    stamps,
    placeholder: true,
  }), [data, imageUrl, imageSize, stamps]);"""),
    ("""      <MapToolStrip drawing={drawing} history={history} showPresets={showPresets} presetValue={presetValue} onPreset={applyPreset} canvasSize={{ width: data.drawing.width, height: data.drawing.height }} onCustomSize={applyCustomSize} layersOpen={layersOpen} onToggleLayers={() => setLayersOpen(o => !o)} />""",
     """      <MapToolStrip drawing={drawing} history={history} showPresets={showPresets} presetValue={presetValue} onPreset={applyPreset} canvasSize={{ width: data.drawing.width, height: data.drawing.height }} onCustomSize={applyCustomSize} layersOpen={layersOpen} onToggleLayers={() => setLayersOpen(o => !o)} stamps={stamps} />"""),

    # ---- the index view carries the Stamps panel
    ("""function CartographiaIndexView({ state, isLocked, onOpen, onCreate, onDelete }) {""",
     STAMP_PANEL + """
function CartographiaIndexView({ state, isLocked, onOpen, onCreate, onDelete, onStampsChange, flash }) {"""),
    ("""          <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
            <button className="btn btn-accent" onClick={onCreate}>+ New Map</button>
          </div>
        )}
      </div>

      {maps.length === 0 ? (""",
     """          <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
            <button className="btn btn-accent" onClick={onCreate}>+ New Map</button>
          </div>
        )}
      </div>

      <MapStampsPanel state={state} isLocked={isLocked} onChange={onStampsChange || (() => {})} flash={flash} />

      {maps.length === 0 ? ("""),
])

edit(MOD / "12_trunk.jsx", [
    ("""      if (parsed && parsed.cartulary_conlang_export === 1) {
        flash("That's a language file — import it from Glossopoeia's Import button, not as a world.", "error");
        return;
      }""",
     """      if (parsed && parsed.cartulary_conlang_export === 1) {
        flash("That's a language file — import it from Glossopoeia's Import button, not as a world.", "error");
        return;
      }
      if (parsed && parsed.cartulary_mapstamp_pack === 1) {
        flash("That's a stamp pack. Import it from the Stamps panel at the top of Cartographia, not as a world.", "error");
        return;
      }"""),
    ("""            <CartographiaIndexView
              state={state}
              isLocked={isLocked}
              onOpen={openMap}
              onCreate={createMap}
              onDelete={deleteMap}
            />""",
     """            <CartographiaIndexView
              state={state}
              isLocked={isLocked}
              onOpen={openMap}
              onCreate={createMap}
              onDelete={deleteMap}
              onStampsChange={(next) => updateState(s => ({ ...s, mapStamps: next }))}
              flash={flash}
            />"""),
    ("""                  entries={state.entries}
                  bodies={state.celestialBodies}
                  flash={flash}
                />""",
     """                  entries={state.entries}
                  bodies={state.celestialBodies}
                  flash={flash}
                  stamps={state.mapStamps}
                />"""),
])

edit(MOD / "08_export-layer.jsx", [
    ("""      imageHref: imageDataUrl,
      imageWidth: imageSize ? imageSize.width : null,
      imageHeight: imageSize ? imageSize.height : null,
    }));
  } else if (mapData.image) {""",
     """      imageHref: imageDataUrl,
      imageWidth: imageSize ? imageSize.width : null,
      imageHeight: imageSize ? imageSize.height : null,
      stamps: state.mapStamps,
    }));
  } else if (mapData.image) {"""),
    ("""    imgHtml = mapTreeToString(buildMapDrawingTree(mapData.drawing, { id: entry.id, className: "map-image", label: entry.name }));""",
     """    imgHtml = mapTreeToString(buildMapDrawingTree(mapData.drawing, { id: entry.id, className: "map-image", label: entry.name, stamps: state.mapStamps }));"""),
])

HELP_PACKS = r'''**Stamps and stamp packs (v1.6).** The map editor's Stamp tool places symbols. Four are built in (mountain, tree, settlement, compass rose); more come from stamp packs, JSON files you import from the Stamps panel at the top of the Cartographia index. A pack looks like this:

\`\`\`
{
  "cartulary_mapstamp_pack": 1,
  "id":     "forest",                   // optional; lower-case letters, digits, underscore, dash. Defaults to a slug of the name
  "name":   "Forest",
  "stamps": [
    {
      "id":      "pine",                // required; same characters as the pack id
      "name":    "Pine",
      "viewBox": "0 0 64 64",           // the box the body is drawn in
      "body":    "<path d=\\"M32 4 L19 26 L45 26 Z\\" stroke-width=\\"3\\"/><path d=\\"M29 58 V63 H35 V58\\" fill=\\"none\\"/>"
    },
    ...
  ]
}
\`\`\`

The \`body\` is SVG inner markup. Parts with no \`fill\` or \`stroke\` of their own take the colors the map gives the stamp, so leave those off wherever the stamp should follow the palette, and put \`fill="none"\` on parts that must stay hollow. Line weight is the stamp's own and scales with it.

Only these elements survive import: \`g\`, \`path\`, \`circle\`, \`ellipse\`, \`rect\`, \`polygon\`, \`polyline\`, \`line\`. Only these attributes: \`d\`, \`points\`, \`cx\`, \`cy\`, \`r\`, \`rx\`, \`ry\`, \`x\`, \`y\`, \`x1\`, \`y1\`, \`x2\`, \`y2\`, \`width\`, \`height\`, \`fill\`, \`fill-rule\`, \`fill-opacity\`, \`stroke\`, \`stroke-width\`, \`stroke-linecap\`, \`stroke-linejoin\`, \`stroke-dasharray\`, \`stroke-opacity\`, \`stroke-miterlimit\`, \`opacity\`, \`transform\`; values are plain numbers, path data, transforms, and colors, never \`url(...)\`. Everything else (scripts, event handlers, \`style\`, \`href\`, text, images, \`use\`) is removed, on import and again whenever the world loads, and the import shows what it removed before anything lands. Stamp ids are namespaced by the pack (\`forest__pine\`), so two packs can each have a \`tree\` and neither touches the built-in one; re-importing a pack replaces its own stamps in place, and every placed stamp keeps pointing at the right symbol. Deleting a stamp that is placed on a map leaves a dashed box in the editor until a pack with it is imported again. **Export built-ins as a pack** in the Stamps panel writes a correct file to start from; **Export** on a pack writes it back out in this shape.

'''

HELP_SCHEMA_TOP = r'''  "packs":        [ ...template packs ],              // v1.5 — named reference-sets over templates; empty array if none
  "mapStamps":    [ ...imported map stamps ],         // v1.6, stamps imported from stamp packs; empty array if none
'''

HELP_SCHEMA_BLOCK = r'''
**\`mapStamps\` array (v1.6), stamps imported from stamp packs, world-scoped:**

\`\`\`
[
  {
    "id":      string,                         // namespaced by pack: "<packId>__<stamp id>"
    "name":    string,
    "viewBox": string,                         // "minx miny width height"
    "body":    string,                         // sanitized SVG inner markup; see Cartographia, stamp packs
    "packId":  string,                         // the pack's slug; "" for a stamp from no pack
    "pack":    string                          // the pack's display name
  },
  ...
]
\`\`\`

Built-in stamps are never stored; a map's stamp shape references them by id (\`mountain\`, \`tree\`, \`settlement\`, \`compass\`). Every body is run through the sanitizer again on load, so editing this array by hand cannot bring in markup the import would have refused.
'''

HELP_DRAWING = r'''    ...
  ],
  "drawing": {                                 // v1.6, the vector layer under the pins
    "width":  number,                          // canvas units; with an image, its natural pixel size
    "height": number,
    "background": { "fill": hex, "grain": number },   // grain 0..1; not drawn under an image
    "layers": [
      { "id": string, "name": string, "visible": boolean, "locked": boolean, "shapes": [ ...shapes ] },
      ...
    ]
  }
}
\`\`\`

Each shape carries \`id\`, \`type\` (\`rect\`, \`ellipse\`, \`polygon\`, \`stroke\`, \`text\`, or \`stamp\`), \`fill\` and \`stroke\` (hex or null), and \`strokeWidth\` (2, 4, or 8), then by type: \`x\`, \`y\`, \`w\`, \`h\` for rect, ellipse, and stamp; \`points\` ([[x, y], ...]) for polygon and stroke; \`smooth\` for rect, polygon, and stroke; \`text\`, \`fontSize\` (24, 36, or 56), \`rotation\`, and \`arc\` (degrees, -180..180) for text; \`stampId\` and \`rotation\` for stamp.
'''

edit(MOD / "24_home-data.jsx", [
    ("""**Limitations.** No layers, no fog of war, no measurement tools.""",
     HELP_PACKS + """**Limitations.** No layers, no fog of war, no measurement tools."""),
    ("""  "packs":        [ ...template packs ],              // v1.5 — named reference-sets over templates; empty array if none
""", HELP_SCHEMA_TOP),
    ("""\\`stemmas\\`, \\`concordance\\`, \\`calendars\\`, \\`celestialBodies\\`, \\`ephemeris\\`, \\`glossopoeia\\`, \\`packs\\`, and \\`viewPrefs\\` are all optional""",
     """\\`stemmas\\`, \\`concordance\\`, \\`calendars\\`, \\`celestialBodies\\`, \\`ephemeris\\`, \\`glossopoeia\\`, \\`packs\\`, \\`mapStamps\\`, and \\`viewPrefs\\` are all optional"""),
    ("""      "permanent": boolean                     // optional; default false. true = always visible in time mode
    },
    ...
  ]
}
\\`\\`\\`

The canvas size shown in the UI (\\`sizePct\\`) is per-session UI state and **not** persisted in the save file.
""",
     """      "permanent": boolean                     // optional; default false. true = always visible in time mode
    },
""" + HELP_DRAWING + """
The canvas size shown in the UI (\\`sizePct\\`) is per-session UI state and **not** persisted in the save file.
""" + HELP_SCHEMA_BLOCK),
])

# ---- Found at the r036 pass: the Project view's Overview and Export section hid
# behind `entries.length === 0`, so a world with maps and no entries read as
# empty and had no Export as HTML button. Maps have been first-class records
# since v1.6 r001; a world with maps is not empty.
edit(MOD / "25_trunk.jsx", [
    ("""      {entries.length === 0 ? (
        <div className="landing-empty-cta">""",
     """      {entries.length === 0 && (Array.isArray(state.cartographia) ? state.cartographia : []).length === 0 ? (
        <div className="landing-empty-cta">"""),
])

edit(SHELL, [
    (""".map-tools-value{font-size:calc(11px * var(--font-scale));color:var(--text-dim);min-width:34px}
""",
     """.map-tools-value{font-size:calc(11px * var(--font-scale));color:var(--text-dim);min-width:34px}
.map-tools-missing{font-size:calc(11px * var(--font-scale));color:var(--danger);margin-left:6px}
.map-stamps{margin-bottom:24px;border-bottom:1px solid var(--border);padding-bottom:18px}
.map-stamps-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.map-stamps-title{font-family:'Cormorant Garamond',serif;font-size:calc(19px * var(--font-scale));color:var(--text-bright);margin-right:auto}
.map-stamps-empty{color:var(--text-dim);font-style:italic;font-size:calc(13px * var(--font-scale));padding:14px;border:1px dashed var(--border);border-radius:4px;background:var(--surf)}
.map-stamps-note{font-size:calc(12px * var(--font-scale));color:var(--text-dim)}
.map-stamp-group{margin-bottom:16px}
.map-stamp-group-head{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:calc(12px * var(--font-scale));color:var(--text-dim)}
.map-stamp-group-name{color:var(--text);font-weight:500;font-size:calc(14px * var(--font-scale))}
.map-stamp-grid{display:flex;flex-wrap:wrap;gap:8px}
.map-stamp-tile{
  position:relative;width:84px;padding:8px 6px 6px;border:1px solid var(--border);border-radius:4px;background:var(--surf);
  display:flex;flex-direction:column;align-items:center;gap:4px;color:var(--text);cursor:default;font:inherit;
}
button.map-stamp-tile{cursor:pointer}
button.map-stamp-tile:hover{border-color:var(--accent-dim);background:var(--surf2)}
.map-stamp-tile.active{outline:2px solid var(--accent);outline-offset:1px}
.map-stamp-tile-name{font-size:calc(11px * var(--font-scale));text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
.map-stamp-tile-x{
  position:absolute;top:2px;right:2px;width:18px;height:18px;line-height:16px;padding:0;border-radius:3px;
  background:transparent;border:1px solid transparent;color:var(--text-dim);cursor:pointer;font-size:13px;
}
.map-stamp-tile-x:hover{color:var(--danger);border-color:var(--border2)}
"""),
])

print("r036 applied")
