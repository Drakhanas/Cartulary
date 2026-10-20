
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