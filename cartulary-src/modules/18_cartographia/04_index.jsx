
// ─── Cartographia ──────────────────────────────────────────────────────────────
// Top-level view that indexes every map in the world. Maps are first-class
// records in state.cartographia (a flat slice, Stemma-shaped), promoted out of
// kind:"map" entries in v1.6 r001. Each record carries name, tags, three fields
// (Description / Scope-Region / Notes via cartographiaMapSchema), and mapData
// (image + pins). The index is a flat list; opening a record routes to the
// per-map view (canvas above the schema fields). No template picker: there is
// no map-kind template anymore.

// The Stamps panel at the head of the Cartographia index (above the map list;
// a world has far fewer stamps than maps, by Drak's call): every imported stamp
// grouped by pack with a preview, Delete per stamp and per pack (warning with
// the count of placed stamps that will go missing), Export per pack (its own
// ids, so a re-import replaces its own), Import pack, and Export built-ins as
// a pack, which is a correct file to start a new pack from. An import that
// has nothing to report lands at once with a flash; one where the sanitizer
// removed something, or dropped a stamp, shows the report first, with Cancel.
// The import flow (r046, lifted from the Stamps panel so the picker has it
// too): a button that opens the file dialog, reads the files through
// mapReadStampFiles, and either applies the packs quietly or walks the
// report modal, one pack at a time. A read pack becomes stored stamps: the
// pack's id (a slug of its name when the name is editable) namespaces every
// stamp id; a stamp this pack imported before is replaced in place, the
// rest are appended.
function MapStampImportButton({ stamps, onChange, flash, className, label, title, style }) {
  const current = Array.isArray(stamps) ? stamps : [];
  const [pending, setPending] = useState(null); // the packs read from the import, waiting on the report modal: { packs, index }
  const [pendingName, setPendingName] = useState(""); // the editable name of the pack being shown
  const [reading, setReading] = useState(false); // an import being decoded; the button says so
  const say = (text, type) => { if (flash) flash(text, type); };
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const fmtBytes = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
  const listMore = (items, max) => (items.length > max ? [...items.slice(0, max), `and ${items.length - max} more`] : items);
  const applyPacks = (packs) => {
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
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json,.png,image/png,.zip,application/zip,.abr,.gbr,.gih,.brush,.brushset";
    input.multiple = true;
    input.onchange = async (e) => {
      const files = e.target.files;
      if (!files || !files.length) return;
      setReading(true);
      let read;
      try { read = await mapReadStampFiles(files, current); } finally { setReading(false); }
      if (!read.ok) { say(read.error, "error"); return; }
      const quiet = read.packs.every(p => !p.pack.editable && !p.report.removed.length && !p.report.dropped.length && p.stamps.length > 0);
      if (quiet) { applyPacks(read.packs); return; }
      setPendingName(read.packs[0].pack.name);
      setPending({ packs: read.packs, index: 0 });
    };
    input.click();
  };
  return (
    <>
      <button type="button" className={className || "btn btn-small btn-accent"} style={style} onClick={importPack} disabled={reading} title={title || "Import a stamp pack: a .json pack, a .zip of PNGs, PNG files, a Photoshop .abr, GIMP .gbr or .gih files, or Procreate .brush or .brushset files"}>{reading ? "Reading…" : (label || "+ Import pack or brushes")}</button>
      {pending && (() => {
        // one modal per pack read; a zip of several folders steps through them
        const cur = pending.packs[pending.index];
        const last = pending.index === pending.packs.length - 1;
        const commit = () => {
          cur.pack.nameOverride = pendingName;
          if (last) { applyPacks(pending.packs); setPending(null); return; }
          setPendingName(pending.packs[pending.index + 1].pack.name);
          setPending({ ...pending, index: pending.index + 1 });
        };
        const skip = () => {
          if (last) { const rest = pending.packs.filter((p, i) => i !== pending.index); if (rest.length) applyPacks(rest); setPending(null); return; }
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
                <p className="map-stamps-note">An svg stamp body may hold only g, path, circle, ellipse, rect, polygon, polyline, and line, with geometry, paint, opacity, and transform attributes; everything else is removed on import and again whenever the world loads. A PNG tip is decoded and re-encoded here, at most 1024 pixels on its long side; one with any color is placed as is, one without is tinted by the map's Fill. A Photoshop .abr, a GIMP .gbr or .gih, and a Procreate shape import as tinted tips.</p>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setPending(null)}>Cancel</button>
                {pending.packs.length > 1 && <button type="button" className="btn btn-ghost" onClick={skip}>Skip this pack</button>}
                <button type="button" className="btn btn-accent" disabled={cur.stamps.length === 0} onClick={commit}>{last ? `Import ${plural(cur.stamps.length, "stamp", "stamps")}` : "Next"}</button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}

function MapStampsPanel({ state, isLocked, onChange, flash }) {
  const stamps = Array.isArray(state.mapStamps) ? state.mapStamps : [];
  const [writing, setWriting] = useState(false); // a PNG zip being built; its buttons wait
  const usage = useMemo(() => mapStampUsage(state), [state.cartographia]);
  const groups = mapStampGroups(stamps);
  const say = (text, type) => { if (flash) flash(text, type); };
  const downloadBlob = (filename, blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
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
  };
  const fmtBytes = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
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
  return (
    <div className="map-stamps">
      <div className="map-stamps-head">
        <span className="map-stamps-title">Stamps</span>
        {!isLocked && <MapStampImportButton stamps={stamps} onChange={onChange} flash={flash} />}
        <button type="button" className="btn btn-small btn-ghost" onClick={exportBuiltins} title="A correct pack file with the four built-in stamps, to start your own from">Export built-ins as a pack</button>
        <button type="button" className="btn btn-small btn-ghost" onClick={() => exportPngZip("cartulary-builtins", "Cartulary built-in stamps", MAP_BUILTIN_STAMPS)} disabled={writing} title="The four built-in stamps as PNGs in the Wonderdraft folder layout">{writing ? "Writing\u2026" : "Built-ins as PNG zip"}</button>
      </div>
      {groups.length === 0 ? (
        <div className="map-stamps-empty">No imported stamps. The map editor's Stamp tool has four built in; a stamp pack adds more. Import takes a Cartulary pack, PNG files or a zip of them, a Photoshop .abr or the zip it came in, GIMP .gbr and .gih files, and Procreate .brush and .brushset files.</div>
      ) : groups.map(g => (
        <div key={g.id} className="map-stamp-group">
          <div className="map-stamp-group-head">
            <span className="map-stamp-group-name">{g.name}</span>
            <span>{plural(g.stamps.length, "stamp", "stamps")}</span>
            <span style={{ flex: 1 }} />
            <button type="button" className="btn btn-small btn-ghost" onClick={() => exportGroup(g)} title="Write this pack back out as a file">Export</button>
            <button type="button" className="btn btn-small btn-ghost" onClick={() => exportPngZip(g.id, g.name, g.stamps)} disabled={writing} title="This pack as PNGs in the Wonderdraft folder layout, svg stamps rasterized">{writing ? "Writing\u2026" : "PNG zip"}</button>
            {!isLocked && <button type="button" className="btn btn-small btn-danger" onClick={() => removeGroup(g)} title="Delete this pack and every stamp in it">Delete pack</button>}
          </div>
          <div className="map-stamp-grid">
            {g.stamps.map(s => (
              <div key={s.id} className="map-stamp-tile" title={`${s.name} (${s.id}${s.kind === "alpha" || s.kind === "color" ? `, ${s.kind} tip ${s.width} \u00d7 ${s.height}` : ""})`}>
                <MapStampGlyph def={s} fill={MAP_PALETTE[5].hex} stroke={MAP_PALETTE[0].hex} size={40} />
                <span className="map-stamp-tile-name">{s.name}</span>
                {!isLocked && <button type="button" className="map-stamp-tile-x" title="Delete this stamp" onClick={() => removeStamp(s)}>{"\u00d7"}</button>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// v1.7 r003: a map's delete confirmation, counting the entries that reference
// it, as a body's delete does; deleteMap clears those references.
const mapDeleteMessage = (rec, state) => {
  const n = countInboundEntryRefs(state.entries, state.templates, rec.id);
  const refs = n === 0 ? ""
    : n === 1 ? " Referenced by 1 entry. Deleting this map removes that reference; the entry stays intact."
    : ` Referenced by ${n} entries. Deleting this map removes those references; the entries stay intact.`;
  return `Delete map "${rec.name}"?${refs} This cannot be undone.`;
};

function CartographiaIndexView({ state, isLocked, onOpen, onCreate, onDelete, onStampsChange, flash }) {
  const maps = (Array.isArray(state.cartographia) ? state.cartographia : [])
    .slice()
    .sort((a, b) => {
      // Most-recently-updated first; records without updatedAt sort to bottom.
      const ad = a.updatedAt || "";
      const bd = b.updatedAt || "";
      if (ad === bd) return (a.name || "").localeCompare(b.name || "");
      return ad < bd ? 1 : -1;
    });

  // Description preview: read the fixed Description field id, strip light
  // markdown, truncate to ~140 chars.
  const previewFor = (rec) => {
    const raw = (rec.fields || {})[CART_FIELD_DESCRIPTION];
    if (!raw || typeof raw !== "string") return null;
    const cleaned = raw
      .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, n, d) => d || n)
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/\*\*|__|\*|_|`/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (cleaned.length === 0) return null;
    return cleaned.length > 140 ? cleaned.slice(0, 137).trimEnd() + "\u2026" : cleaned;
  };

  return (
    <div style={{ padding: "20px 24px", maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
        <div style={{ color: "var(--text-dim)", fontSize: 14, lineHeight: 1.5, maxWidth: 560 }}>
          The bound collection of maps. Each map is a canvas, an image or a blank sheet, with a drawing on it and time-aware pins over it that cross-reference other entries. Open a map to draw on it or place pins.
        </div>
        {!isLocked && (
          <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
            <button className="btn btn-accent" onClick={onCreate}>+ New Map</button>
          </div>
        )}
      </div>

      <MapStampsPanel state={state} isLocked={isLocked} onChange={onStampsChange || (() => {})} flash={flash} />

      {maps.length === 0 ? (
        <div style={{
          padding: "60px 20px",
          textAlign: "center",
          color: "var(--text-dim)",
          fontStyle: "italic",
          border: "1px dashed var(--border)",
          borderRadius: 6,
          background: "var(--surf)",
        }}>
          No maps yet.{!isLocked && " Click + New Map above to create one."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 1, border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
          {maps.map(rec => {
            const pinCount = rec.mapData?.pins?.length || 0;
            const hasImage = !!rec.mapData?.image;
            const preview = previewFor(rec);
            return (
              <div
                key={rec.id}
                className="stemma-index-row"
                style={{ padding: "12px 16px", background: "var(--surf)", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 12 }}
                onClick={() => onOpen(rec.id)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ color: "#7ec8c8", fontSize: 13 }}>{"\u25a3"}</span>
                      <span>{rec.name || "(unnamed map)"}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-dim)", whiteSpace: "nowrap" }}>
                      {pinCount} {pinCount === 1 ? "pin" : "pins"}
                      {!hasImage && <span style={{ color: "var(--text-dim)", fontStyle: "italic" }}> · no image</span>}
                      {rec.updatedAt && <span> · updated {fmtDate(rec.updatedAt)}</span>}
                    </div>
                  </div>
                  {preview && (
                    <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 4 }}>
                      {preview}
                    </div>
                  )}
                  {Array.isArray(rec.tags) && rec.tags.length > 0 && (
                    <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {rec.tags.map(t => (
                        <span key={t} style={{ fontSize: 11, padding: "2px 8px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-dim)" }}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
                {!isLocked && (
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button
                      className="btn"
                      style={{ padding: "3px 8px", fontSize: 12, color: "var(--danger)", borderColor: "rgba(184,92,76,.35)" }}
                      onClick={ev => {
                        ev.stopPropagation();
                        if (confirm(mapDeleteMessage(rec, state))) {
                          onDelete(rec.id);
                        }
                      }}
                      title="Delete this map"
                    >Delete</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}