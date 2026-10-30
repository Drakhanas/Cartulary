
// ─── Destructive Op confirmation modal (Reset / Import) ─────────────────────

// Replaces the native window.confirm() flow for newWorld (Reset) and
// importWorld (Import). Offers "Export world first" as the path of least
// resistance, with an explicit skip-export checkbox required to confirm
// without exporting. Friction is intentional: makes export the default
// path, forces explicit acknowledgment to bypass it. Per Drak spec, the
// checkbox state resets on every modal open. That's enforced at the mount
// site via React's keyed-mount: passing op.type as the key forces a fresh
// component instance for each open, which resets internal state.
function DestructiveOpModal({ op, onCancel, onConfirm, onExportFirst }) {
  const [exported, setExported] = useState(false);
  const [skipExport, setSkipExport] = useState(false);
  // Tracks the post-Confirm async work happening in the parent (executeReset
  // or executeImport). The parent doesn't await onConfirm, so this is the
  // only way to (a) gate double-clicks on Confirm, (b) gate the Cancel
  // button so a click after Confirm doesn't fight the running operation,
  // and (c) show "Working…" feedback during slow ops.
  const [confirming, setConfirming] = useState(false);

  if (!op) return null;

  const isReset = op.type === "reset";
  const title = isReset ? "Reset world" : "Import world";
  const confirmLabel = isReset ? "Reset world" : "Import world";
  const canConfirm = exported || skipExport;

  // Treat the click on [Export world first] as the export commitment,
  // regardless of what the user does with the resulting file. Per Drak
  // spec — we have no completion callback to wait on anyway.
  const handleExport = () => {
    onExportFirst();
    setExported(true);
  };

  const handleConfirm = () => {
    if (confirming) return;
    setConfirming(true);
    onConfirm();
  };

  // The backdrop click is gated by confirming too — clicking outside the
  // modal while async work is running shouldn't cancel anything.
  const handleBackdrop = () => {
    if (confirming) return;
    onCancel();
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdrop}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">{title}</div>
        <div className="modal-body">
          <div className="modal-notice modal-notice-warning">
            <strong>This cannot be undone.</strong>
            {isReset
              ? <> Your current world will be discarded and replaced with a fresh, empty one.</>
              : <> Your current world will be replaced with <strong>"{op.sourceName}"</strong>.</>
            }
            {" "}A pinned restore point will be saved automatically so you can roll back inside Cartulary, but exporting to a JSON file is the safest backup.
          </div>

          <div className="modal-section">
            <button
              type="button"
              className="btn btn-accent"
              onClick={handleExport}
              disabled={exported || confirming}
            >
              {exported ? "Exported ✓" : "Export world first"}
            </button>
          </div>

          <label className="modal-ack">
            <input
              type="checkbox"
              checked={skipExport}
              onChange={e => setSkipExport(e.target.checked)}
              disabled={confirming}
            />
            <span>Skip export, I don't need a backup</span>
          </label>
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel} disabled={confirming}>Cancel</button>
          <button
            className="btn btn-danger"
            onClick={handleConfirm}
            disabled={!canConfirm || confirming}
          >{confirming ? "Working…" : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Reset Template confirmation modal ───────────────────────────────────────

function ResetTemplateModal({ analysis, onCancel, onConfirm }) {
  const [acknowledged, setAcknowledged] = useState(false);

  if (!analysis) {
    return (
      <div className="modal-backdrop" onClick={onCancel}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-hdr">Cannot Reset</div>
          <div className="modal-body">
            This template can't be reset because it isn't a built-in template (custom templates have no factory default to restore to).
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={onCancel}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  const { template, builtin, customFields, missingFields, entriesTotal, entriesAffected, iconChanged, colorChanged, nameChanged } = analysis;
  const hasCustomFields = customFields.length > 0;
  const hasMissing = missingFields.length > 0;
  const hasMetaChanges = iconChanged || colorChanged || nameChanged;
  const noChanges = !hasCustomFields && !hasMissing && !hasMetaChanges;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">
          <span style={{ color: builtin.color, marginRight: 8 }}>{builtin.icon}</span>
          Reset "{template.name}" to default?
        </div>
        <div className="modal-body">
          {noChanges ? (
            <div className="modal-notice modal-notice-info">
              This template already matches the factory default. Nothing would change.
            </div>
          ) : (
            <>
              <div className="modal-notice modal-notice-warning">
                <strong>This action cannot be undone.</strong> Make sure you've exported your world (.json) recently if you want a backup.
              </div>

              <div className="modal-section">
                <div className="modal-section-hdr">Changes that will happen:</div>
                <ul className="modal-list">
                  {nameChanged && <li>Name will be restored to "<strong>{builtin.name}</strong>" (currently "{template.name}")</li>}
                  {iconChanged && <li>Icon will be restored to <strong>{builtin.icon}</strong> (currently {template.icon})</li>}
                  {colorChanged && <li>Color will be restored to factory default</li>}
                  {hasMissing && (
                    <li>
                      <strong>{missingFields.length}</strong> missing field{missingFields.length === 1 ? "" : "s"} will be added back:
                      <ul className="modal-list-nested">
                        {missingFields.map(f => <li key={f.label}>{f.label}</li>)}
                      </ul>
                    </li>
                  )}
                  {hasCustomFields && (
                    <li className="modal-list-warn">
                      <strong>{customFields.length}</strong> custom field{customFields.length === 1 ? "" : "s"} will be removed:
                      <ul className="modal-list-nested">
                        {customFields.map(f => <li key={f.label}>{f.label}</li>)}
                      </ul>
                    </li>
                  )}
                  <li>Field order will be reset to factory default</li>
                </ul>
              </div>

              {entriesTotal > 0 && (
                <div className="modal-section">
                  <div className="modal-section-hdr">Impact on existing entries:</div>
                  {entriesAffected > 0 ? (
                    <div className="modal-notice modal-notice-warning">
                      <strong>{entriesAffected}</strong> of <strong>{entriesTotal}</strong> {template.name} entries have data in custom fields. <strong>That data will be permanently deleted.</strong> Other field data on these entries is preserved.
                    </div>
                  ) : (
                    <div className="modal-notice modal-notice-info">
                      {entriesTotal} {template.name} {entriesTotal === 1 ? "entry exists" : "entries exist"}, but none have data in custom fields, so no entry data will be lost.
                    </div>
                  )}
                </div>
              )}

              <label className="modal-ack">
                <input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} />
                <span>I understand this will permanently remove the changes listed above and cannot be undone.</span>
              </label>
            </>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          {!noChanges && (
            <button
              className="btn btn-danger"
              onClick={onConfirm}
              disabled={!acknowledged}
            >Reset Template</button>
          )}
        </div>
      </div>
    </div>
  );
}

// Modal for restoring built-in templates the user previously deleted. Lists
// the deleted built-ins with checkboxes (all selected by default — most users
// who open this dialog want to restore the lot). Submitting calls onConfirm
// with the array of selected names.
function RestoreBuiltinsModal({ deletedNames, onCancel, onConfirm }) {
  const [selected, setSelected] = useState(() => new Set(deletedNames || []));

  if (!deletedNames || deletedNames.length === 0) {
    return (
      <div className="modal-backdrop" onClick={onCancel}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-hdr">No deleted built-ins</div>
          <div className="modal-body">
            All built-in templates are present in this world. There's nothing to restore.
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={onCancel}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  const toggle = (name) => {
    const next = new Set(selected);
    if (next.has(name)) next.delete(name); else next.add(name);
    setSelected(next);
  };
  const toggleAll = () => {
    if (selected.size === deletedNames.length) setSelected(new Set());
    else setSelected(new Set(deletedNames));
  };
  const allSelected = selected.size === deletedNames.length;

  // Look up the built-in's icon and color for visual recognition
  const lookup = (name) => BUILTIN_TEMPLATES.find(b => b.name === name);

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">Restore built-in templates</div>
        <div className="modal-body">
          <div className="modal-notice modal-notice-info">
            These built-in templates are not currently in your world. Select the ones you want to restore — each will be added back with its factory fields, icon, and color. Existing custom templates and entries are not affected.
          </div>
          <div className="modal-section">
            <button className="btn btn-ghost btn-small" onClick={toggleAll} style={{ marginBottom: 8 }}>
              {allSelected ? "Deselect all" : "Select all"}
            </button>
            <div className="restore-builtins-list">
              {deletedNames.map(name => {
                const b = lookup(name);
                return (
                  <label key={name} className="restore-builtins-item">
                    <input
                      type="checkbox"
                      checked={selected.has(name)}
                      onChange={() => toggle(name)}
                    />
                    {b && <span className="restore-builtins-icon" style={{ color: b.color }}>{b.icon}</span>}
                    <span className="restore-builtins-name">{name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button
            className="btn btn-accent"
            onClick={() => onConfirm([...selected])}
            disabled={selected.size === 0}
          >
            Restore {selected.size === 0 ? "" : `(${selected.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Record delete (v1.7 r042) ─────────────────────────────────────────────────
// docs/pipes-spec.md, section 4, with Drak's calls at the cut: one modal for
// every record a link can point at, an entry, a template with its entries, a
// body, a map, a stemma, a story, a corpus, a Fabula record, or a Glossopoeia
// record, where a confirm or an inline prompt asked before. It says what goes
// with the record, if anything, and what the delete does to what links to
// it, counted from the link index (linkDeleteCounts): the stored links it
// clears, by the kind of record they're in, the map pins it unlinks, the
// stemma nodes and cards it leaves orphaned, and the [[links]] that stay as
// typed. Anything can ask (askRecordDelete); App draws it once.

const RECORD_DELETE = { open: null };

// ask: { state, ids, title, goes, onConfirm }, ids what goes, goes a line for
// what goes with the record, or null.
const askRecordDelete = (ask) => {
  if (RECORD_DELETE.open) { RECORD_DELETE.open(ask); return; }
  if (window.confirm(ask.title)) ask.onConfirm();
};

// What a delete of the records in ids does to what links to them, one
// sentence a line, "it" or "them" by how many go; going as linkDeleteCounts
// takes it.
const recordDeleteLines = (state, ids, going) => {
  const list = Array.isArray(ids) ? ids : [...(ids || [])];
  const c = linkDeleteCounts(state, list, going);
  const it = list.length > 1 ? "them" : "it";
  const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const kinds = [["entry", "entry", "entries"], ...FABULA_KINDS.map(k => [`fabula:${k.kind}`, FABULA_NOUNS[k.kind].one, FABULA_NOUNS[k.kind].many]), ["body", "body", "bodies"], ["conlang", "language", "languages"], ["lexeme", "word", "words"]];
  const lines = [];
  const from = kinds.filter(([key]) => c.refs.has(key)).map(([key, one, many]) => [c.refs.get(key).size, one, many]);
  const holders = from.reduce((n, [k]) => n + k, 0);
  if (from.length > 0) lines.push(`Removes ${it} from ${fabulaJoin(from.map(([n, one, many]) => count(n, one, many)))}, which ${holders === 1 ? "stays" : "stay"}.`);
  if (c.pins > 0) lines.push(c.pins === 1 ? "A map pin loses its link and keeps its label." : `${c.pins} map pins lose their links and keep their labels.`);
  if (c.pinsBare > 0) lines.push(c.pinsBare === 1 ? "A map pin without a label loses its link and takes the name it pointed at." : `${c.pinsBare} map pins without labels lose their links and take the names they pointed at.`);
  const held = c.nodes + c.cards;
  if (held > 0) lines.push(`${fabulaJoin([c.nodes ? count(c.nodes, "linked node", "linked nodes") : null, c.cards ? count(c.cards, "card", "cards") : null].filter(Boolean))} in ${count(c.stemmas.size, "stemma", "stemmas")} ${held === 1 ? "stays" : "stay"}, unlinked.`);
  if (c.wiki.size > 0) lines.push(`[[Links]] to ${it} in ${count(c.wiki.size, "place", "places")} stay as typed and show as broken.`);
  if (c.wikiMoved.size > 0) lines.push(`[[Links]] to ${it} in ${count(c.wikiMoved.size, "place", "places")} stay as typed and will lead to ${list.length > 1 ? "other records by the same names" : "another record by the same name"}.`);
  return lines;
};

// The modal, drawn once by App; askRecordDelete opens it. Esc and a click
// outside cancel, as Cancel does.
function RecordDeleteModal() {
  const [ask, setAsk] = useState(null);
  useEffect(() => {
    RECORD_DELETE.open = setAsk;
    return () => { if (RECORD_DELETE.open === setAsk) RECORD_DELETE.open = null; };
  }, []);
  useEffect(() => {
    if (!ask) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setAsk(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [ask]);
  const lines = useMemo(() => (ask ? [...(ask.goes ? [ask.goes] : []), ...recordDeleteLines(ask.state, ask.ids)] : []), [ask]);
  if (!ask) return null;
  const doDelete = () => { setAsk(null); ask.onConfirm(); };
  return (
    <div className="modal-backdrop" onClick={() => setAsk(null)}>
      <div className="modal record-delete" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">{ask.title}</div>
        {lines.length > 0 && (
          <div className="modal-body">
            {lines.map((line, i) => <p key={i} className="record-delete-line" style={{ margin: i === 0 ? 0 : "8px 0 0" }}>{line}</p>)}
          </div>
        )}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setAsk(null)}>Cancel</button>
          <button className="btn btn-danger record-delete-confirm" onClick={doDelete} autoFocus>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── Record rename (v1.7 r044) ─────────────────────────────────────────────────
// docs/pipes-spec.md, section 5, with Drak's calls at the cut: a rename that
// [[links]] by the old name reach asks here first (renameAsk, 22_trunk), how
// many places link by it and what Rename only leaves them doing, and offers
// Rename and update links, or Rename only, alone when the new name already
// reaches a record ahead of this one. Where the record keeps former names, a
// box adds the old name there, unticked (call 1). App draws it once.

const RECORD_RENAME = { open: null };

// ask: { plan, onConfirm(choice), onCancel }, plan renamePlan's, choice
// { update, former, places }. With no modal drawn, the browser's confirm
// asks about the update.
const askRename = (ask) => {
  if (RECORD_RENAME.open) { RECORD_RENAME.open(ask); return; }
  const p = ask.plan;
  const update = !p.taken && window.confirm(`Update the [[links]] by "${p.oldName}" to "${p.newName}"?`);
  ask.onConfirm({ update, former: false, places: p.places });
};

// A record a line names, by its kind: the entry "Aria", the map "Twinmark".
const renameRecordNoun = (rec) => {
  if (!rec) return "another record";
  const fab = rec.kind === "fabula" ? FABULA_KINDS.find(k => k.id === rec.source) : null;
  const noun = rec.kind === "entry" ? "entry" : rec.kind === "body" ? "body" : rec.kind === "map" ? "map"
    : rec.kind === "stemma" ? "stemma" : rec.kind === "conlang" ? "language"
    : fab && FABULA_NOUNS[fab.kind] ? FABULA_NOUNS[fab.kind].one : "record";
  return `the ${noun} "${rec.name}"`;
};

// What Rename only leaves the links doing, with the old name added to the
// record's former names or without.
const renameLeavesLine = (plan, former) => {
  const l = former && plan.leavesFormer ? plan.leavesFormer : plan.leaves;
  if (l.how === "kept") return `With Rename only, they stay as typed and still lead to it, through its ${plan.formerLabel || "former names"}.`;
  if (l.how === "moved") return `With Rename only, they stay as typed and lead instead to ${renameRecordNoun(l.to)}.`;
  return "With Rename only, they stay as typed and show as broken.";
};

// The modal, drawn once by App; askRename opens it. Esc and a click outside
// cancel, as Cancel does. While it's open the keys are its own, so none
// reaches what's under it: a board's arrows, Enter, and Delete, or Undo.
function RecordRenameModal() {
  const [ask, setAsk] = useState(null);
  const [former, setFormer] = useState(false);
  useEffect(() => {
    const open = (a) => { setFormer(false); setAsk(a); };
    RECORD_RENAME.open = open;
    return () => { if (RECORD_RENAME.open === open) RECORD_RENAME.open = null; };
  }, []);
  const cancel = () => {
    const a = ask;
    setAsk(null);
    if (a && a.onCancel) a.onCancel();
  };
  useEffect(() => {
    if (!ask) return undefined;
    const onKey = (e) => {
      e.stopPropagation();
      if (e.key === "Escape") { e.preventDefault(); cancel(); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [ask]);
  if (!ask) return null;
  const p = ask.plan;
  const done = (update) => {
    setAsk(null);
    ask.onConfirm({ update, former: !!(p.former && former), places: p.places });
  };
  return (
    <div className="modal-backdrop" onClick={cancel}>
      <div className="modal record-rename" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">Rename "{p.oldName}" to "{p.newName}"?</div>
        <div className="modal-body">
          <p className="record-rename-line" style={{ margin: 0 }}>[[Links]] in {p.places} {p.places === 1 ? "place" : "places"} lead to it by the old name.</p>
          {p.taken && <p className="record-rename-line" style={{ margin: "8px 0 0" }}>[[{p.newName}]] already leads to {renameRecordNoun(p.taken)}, so updating the links would send them there. It can be renamed without updating them.</p>}
          {p.former && (
            <label className="record-rename-former" style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0 0", cursor: "pointer" }}>
              <input type="checkbox" checked={former} onChange={e => setFormer(e.target.checked)} />
              <span>Add "{p.oldName}" to its {p.former}</span>
            </label>
          )}
          <p className="record-rename-line" style={{ margin: "8px 0 0" }}>{renameLeavesLine(p, former)}</p>
          {!p.taken && <p className="record-rename-line" style={{ margin: "8px 0 0" }}>Updating them saves a restore point first, Before rename, in Version History.</p>}
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={cancel}>Cancel</button>
          <button className="btn record-rename-only" onClick={() => done(false)} autoFocus={!!p.taken}>Rename only</button>
          {!p.taken && <button className="btn btn-accent record-rename-update" onClick={() => done(true)} autoFocus>Rename and update links</button>}
        </div>
      </div>
    </div>
  );
}