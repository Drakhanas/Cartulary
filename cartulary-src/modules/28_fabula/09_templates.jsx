
// ─── Fabula: templates (v1.7 r017) ─────────────────────────────────────────────
// Fabula's kinds in the template builder (docs/fabula-spec.md, sections 3,
// 4, and 5.0, Drak's calls of 2026-10-26). The index's Templates section
// lists the eleven kinds, each with Edit Template, which opens the builder on
// a copy of the kind's schema. The seed owns every part of a core field a
// feature reads, which the builder locks and each load brings up to the seed
// (fabulaRefreshCore); a core field's label, help line, Secret, and panel are
// the user's, and its options unless the seed locks them, and every other
// field is the user's whole. Save marks a schema edited; Reset to Default
// puts the seed back and clears the values the seed has no field for.

// The ids a kind's seed uses at its top level, which a field of the user's
// own never takes. They don't depend on the world's templates.
const fabulaSeedIds = (() => {
  let cache = null;
  return (kind) => {
    if (!cache) {
      const all = fabulaSeedSchemas([]);
      cache = {};
      Object.keys(all).forEach(kk => { cache[kk] = new Set(all[kk].fields.map(f => f.id)); });
    }
    return cache[kind] || new Set();
  };
})();

// An edited schema's core fields brought up to the seed (spec, section 3).
// Each takes the seed's field with the user's label, help line, Secret, and
// panel, and the user's options and Other unless the seed locks them
// (optionsLocked); a blank label keeps the seed's. A core field the schema
// lacks comes back where the seed puts it, after the nearest field before it
// that the schema has, and a field the seed doesn't count core loses the
// mark. The rest is the user's and stays as it is. Idempotent.
const fabulaRefreshCore = (stored, seed) => {
  const coreSeed = seed.fields.filter(f => f && f.core);
  const byId = new Map(coreSeed.map(f => [f.id, f]));
  const mine = (sf, f) => {
    const out = { ...sf };
    if (typeof f.label === "string" && f.label.trim()) out.label = f.label;
    const keys = sf.optionsLocked ? ["help", "secret", "panel"] : ["help", "secret", "panel", "options", "otherTextField"];
    keys.forEach(key => { if (f[key] !== undefined) out[key] = f[key]; else delete out[key]; });
    return out;
  };
  const fields = [];
  (Array.isArray(stored.fields) ? stored.fields : []).forEach(f => {
    if (!f || typeof f !== "object") return;
    if (byId.has(f.id)) { if (!fields.some(x => x.id === f.id)) fields.push(mine(byId.get(f.id), f)); return; }
    if ("core" in f || "reads" in f || "optionsLocked" in f) {
      const { core, reads, optionsLocked, ...rest } = f;
      fields.push(rest);
      return;
    }
    fields.push(f);
  });
  coreSeed.forEach(sf => {
    if (fields.some(f => f.id === sf.id)) return;
    const idx = seed.fields.findIndex(x => x.id === sf.id);
    let at = 0;
    for (let i = idx - 1; i >= 0; i--) {
      const j = fields.findIndex(x => x.id === seed.fields[i].id);
      if (j !== -1) { at = j + 1; break; }
    }
    fields.splice(at, 0, sf);
  });
  return { ...stored, kind: seed.kind, seed: FABULA_SCHEMA_SEED, nameHelp: typeof stored.nameHelp === "string" ? stored.nameHelp : seed.nameHelp, fields };
};

// A kind's schema as the world keeps it, or the seed's where it has none.
const fabulaSchemaOf = (state, kind) => {
  const stored = state.fabula && state.fabula.schemas && state.fabula.schemas[kind];
  return stored && Array.isArray(stored.fields) ? stored : fabulaSeedSchemas(state.templates || [])[kind];
};

// What the builder edits for one of Fabula's kinds: a copy of its fields and
// the help line of its records' names, with the kind they belong to.
const fabulaSchemaDraft = (state, kind) => {
  const s = fabulaSchemaOf(state, kind);
  return JSON.parse(JSON.stringify({ kind, nameHelp: typeof s.nameHelp === "string" ? s.nameHelp : "", fields: s.fields }));
};

// The builder's Save for one of Fabula's kinds (spec, section 4). A field
// with no label is dropped, as a template's is, except a core field, which
// takes its seeded label back; a field of the user's own gets an id no seed
// uses; and a reference's target names follow its ids, as a template's do.
// The schema is marked edited, unless the Save changes nothing. Returns
// Fabula.
const fabulaSchemaSave = (state, kind, draft) => {
  const fab = state.fabula || {};
  const base = fabulaSchemaOf(state, kind);
  const seeded = new Map(fabulaSeedSchemas(state.templates || [])[kind].fields.map(f => [f.id, f.label]));
  const named = (f) => typeof f.label === "string" && f.label.trim() !== "";
  const clean = (list, top) => (Array.isArray(list) ? list : []).filter(f => f && typeof f === "object" && ((top && f.core) || named(f))).map(f => {
    const out = { ...f };
    if (top && out.core && !named(out)) out.label = seeded.get(out.id) || out.label || "";
    if (!out.id) out.id = genId();
    if (out.type === "group" && Array.isArray(out.subfields)) out.subfields = clean(out.subfields, false);
    return out;
  });
  const fields = clean(JSON.parse(JSON.stringify((draft && draft.fields) || [])), true);
  const nameHelp = draft && typeof draft.nameHelp === "string" ? draft.nameHelp : "";
  if (JSON.stringify(fields) === JSON.stringify(base.fields) && nameHelp === (base.nameHelp || "")) return fab;
  syncRefTargetNames(state.templates || [], [{ fields }]);
  return { ...fab, schemas: { ...(fab.schemas || {}), [kind]: { ...base, kind, nameHelp, fields, edited: true } } };
};

// What Reset to Default would do to one of Fabula's kinds, for its
// confirmation: the seeded fields it brings back, the user's own it removes,
// the labels that go back, and how many of the kind's records hold values
// under fields the seed doesn't have, fields deleted earlier included.
const fabulaResetAnalysis = (state, kind) => {
  const k = FABULA_KINDS.find(x => x.kind === kind);
  const fab = state.fabula || {};
  const have = fabulaSchemaOf(state, kind);
  const seed = fabulaSeedSchemas(state.templates || [])[kind];
  const seedIds = new Set(seed.fields.map(f => f.id));
  const haveById = new Map(have.fields.filter(f => f && f.id).map(f => [f.id, f]));
  const filled = (v) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0);
  const records = fabulaArr(fab, k.slice).filter(r => r && r.id);
  return {
    kind,
    label: k.label,
    color: k.color,
    edited: have.edited === true,
    missing: seed.fields.filter(f => !haveById.has(f.id)).map(f => f.label),
    custom: have.fields.filter(f => f && !seedIds.has(f.id)).map(f => f.label || "(unnamed)"),
    relabeled: seed.fields.filter(f => haveById.has(f.id) && haveById.get(f.id).label !== f.label).map(f => ({ from: haveById.get(f.id).label, to: f.label })),
    total: records.length,
    affected: records.filter(r => Object.keys(r.fields || {}).some(fid => !seedIds.has(fid) && filled(r.fields[fid]))).length,
  };
};

// Reset to Default for one of Fabula's kinds: the seed's schema, unedited,
// and every value its records hold under a field the seed doesn't have
// cleared, as a built-in template's reset clears its entries'. A reference
// the seed takes more than one of keeps what it held, as a list of one.
// Returns Fabula.
const fabulaResetSchema = (state, kind) => {
  const k = FABULA_KINDS.find(x => x.kind === kind);
  const fab = state.fabula || {};
  const seed = fabulaSeedSchemas(state.templates || [])[kind];
  const seedIds = new Set(seed.fields.map(f => f.id));
  const lists = new Set(seed.fields.filter(f => f.type === "entry-ref" && f.multi).map(f => f.id));
  const now = isoNow();
  const records = fabulaArr(fab, k.slice).map(r => {
    if (!r || !r.fields || typeof r.fields !== "object") return r;
    const fields = {};
    let changed = false;
    Object.keys(r.fields).forEach(fid => {
      const v = r.fields[fid];
      if (!seedIds.has(fid)) { changed = true; return; }
      if (lists.has(fid) && typeof v === "string") { fields[fid] = v ? [v] : []; changed = true; return; }
      fields[fid] = v;
    });
    return changed ? { ...r, fields, updatedAt: now } : r;
  });
  return { ...fab, [k.slice]: records, schemas: { ...(fab.schemas || {}), [kind]: seed } };
};

// Fabula's kinds a field on kind can point at, as the seeded links do: the
// nine a story holds, from any kind but a corpus, which has no story.
const fabulaStoryKinds = (kind) => (kind && kind !== "corpus" ? FABULA_KINDS.filter(k => k.kind !== "corpus" && k.kind !== "story") : []);

// The Fabula kind a reference field points at within its story, or null.
const fabulaRefKindOf = (f) => (f && f.fabulaScope ? FABULA_KINDS.find(k => (Array.isArray(f.refTemplatesId) ? f.refTemplatesId : []).includes(k.id)) || null : null);

// A target picked in the builder on one of Fabula's kinds: one of the
// story's kinds makes the field a link to its story's records, one kind to a
// field, and anything else is a template's target, as on any template.
const fabulaTargetPatch = (v) => {
  const k = FABULA_KINDS.find(x => x.id === v);
  return k
    ? { refTemplateId: null, refTemplatesId: [k.id], refTemplates: [k.name], refFilters: null, fabulaScope: "story" }
    : { refTemplateId: v || null, refTemplatesId: null, refTemplates: undefined, refFilters: null, fabulaScope: undefined };
};

// A core field's tag, on its tooltip: what reads it, and what the builder
// locks.
const fabulaCoreTitle = (f) => {
  const locked = ["its type", f.type === "entry-ref" ? "what it points at" : null, f.optionsLocked ? "its options" : null, f.type === "group" ? "its subfields" : null].filter(Boolean);
  return `${f.reads || "Fabula reads this field."} You can rename it and change its help line; ${fabulaJoin(locked)} ${locked.length === 1 ? "is" : "are"} locked.`;
};

// A core field's Show only when, as the builder shows it, locked.
const fabulaShowWhenText = (f, fields) => {
  const sw = f.showWhen || {};
  const p = (fields || []).find(x => x && x.id === sw.fieldId);
  return `Shows only when ${p ? p.label : "another field"} is ${(sw.values || []).join(" or ")}; that stays as it is.`;
};

// The index's Templates section (spec, section 4, Drak's call at r017's
// plan): Fabula's eleven kinds in order, each with how many records of it the
// world holds, marked edited when its schema is, and Edit Template, which
// opens the builder. Scrolled into view when the builder closes back to it;
// in Lock Mode it shows no buttons.
function FabulaKindTemplates({ state, isLocked, focus, onFocused, onEditKind }) {
  const ref = useRef(null);
  useEffect(() => {
    if (focus !== "templates") return;
    if (ref.current && ref.current.scrollIntoView) ref.current.scrollIntoView({ block: "start" });
    if (onFocused) onFocused();
  }, [focus]);
  const fab = state.fabula || {};
  return (
    <div ref={ref} className="fabula-kind-templates" style={{ marginTop: 28 }}>
      <div className="field-label" style={{ marginBottom: 8 }}><span>Templates</span></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1, border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
        {FABULA_KINDS.map(k => {
          const n = fabulaArr(fab, k.slice).filter(r => r && r.id).length;
          const edited = !!(fab.schemas && fab.schemas[k.kind] && fab.schemas[k.kind].edited === true);
          return (
            <div key={k.kind} className="fabula-kind-row" data-kind={k.kind} style={{ padding: "7px 12px 7px 16px", background: "var(--surf)", display: "flex", alignItems: "center", flexWrap: "wrap", columnGap: 12, rowGap: 4 }}>
              <span className="fabula-kind-name" style={{ flex: "1 1 auto", minWidth: 0, fontSize: 14.5, fontWeight: 500 }}>{k.label}</span>
              <span className="fabula-kind-meta" style={{ fontSize: 12, color: "var(--text-dim)", whiteSpace: "nowrap" }}>
                {fabulaCount(k.kind, n)}
                {edited && <span className="fabula-kind-edited" style={{ color: "var(--accent)" }}> · edited</span>}
              </span>
              {!isLocked && onEditKind && <button className="btn btn-ghost" style={{ padding: "3px 10px", fontSize: 12 }} onClick={() => onEditKind(k.kind)}>Edit Template</button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Reset to Default's confirmation for one of Fabula's kinds, as a built-in
// template's: what comes back, what goes, and the records whose values in
// the fields that go are cleared, with the same acknowledgment before it
// runs. A kind that follows the seed has nothing to reset.
function FabulaResetModal({ analysis, onCancel, onConfirm }) {
  const [ack, setAck] = useState(false);
  const { kind, label, color, edited, missing, custom, relabeled, total, affected } = analysis;
  const nothing = !edited && affected === 0 && missing.length === 0 && custom.length === 0 && relabeled.length === 0;
  const s = (n) => (n === 1 ? "" : "s");
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal modal-wide fabula-reset-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-hdr"><span style={{ color }}>{label}</span>: reset to default?</div>
        <div className="modal-body">
          {nothing ? (
            <div className="modal-notice modal-notice-info">This template already follows the seed. Nothing would change.</div>
          ) : (
            <>
              <div className="modal-notice modal-notice-warning">
                <strong>This action cannot be undone.</strong> Make sure you've exported your world (.json) recently if you want a backup.
              </div>
              <div className="modal-section">
                <div className="modal-section-hdr">Changes that will happen:</div>
                <ul className="modal-list">
                  {missing.length > 0 && (
                    <li><strong>{missing.length}</strong> field{s(missing.length)} will be added back:
                      <ul className="modal-list-nested">{missing.map((m, i) => <li key={i}>{m}</li>)}</ul>
                    </li>
                  )}
                  {custom.length > 0 && (
                    <li className="modal-list-warn"><strong>{custom.length}</strong> field{s(custom.length)} of your own will be removed:
                      <ul className="modal-list-nested">{custom.map((m, i) => <li key={i}>{m}</li>)}</ul>
                    </li>
                  )}
                  {relabeled.length > 0 && (
                    <li><strong>{relabeled.length}</strong> label{s(relabeled.length)} will go back:
                      <ul className="modal-list-nested">{relabeled.map((r, i) => <li key={i}>{r.from} → {r.to}</li>)}</ul>
                    </li>
                  )}
                  <li>Every seeded field's type, help line, options, and place will go back to the seed's</li>
                </ul>
              </div>
              {total > 0 && (
                <div className="modal-section">
                  <div className="modal-section-hdr">Impact on existing records:</div>
                  {affected > 0 ? (
                    <div className="modal-notice modal-notice-warning">
                      <strong>{affected}</strong> of <strong>{fabulaCount(kind, total)}</strong> {affected === 1 ? "holds" : "hold"} data in fields the seed doesn't have. <strong>That data will be permanently deleted.</strong> Their other fields are kept.
                    </div>
                  ) : (
                    <div className="modal-notice modal-notice-info">
                      {fabulaCount(kind, total)} {total === 1 ? "exists, but it holds no data" : "exist, but none holds data"} in fields the seed doesn't have, so no record data will be lost.
                    </div>
                  )}
                </div>
              )}
              <label className="modal-ack">
                <input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} />
                <span>I understand this will permanently remove the changes listed above and cannot be undone.</span>
              </label>
            </>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          {!nothing && <button className="btn btn-danger" onClick={onConfirm} disabled={!ack}>Reset Template</button>}
        </div>
      </div>
    </div>
  );
}