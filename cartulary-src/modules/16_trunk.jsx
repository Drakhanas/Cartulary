
// ─── Settings ──────────────────────────────────────────────────────────────────

function SettingsView({ world, entries, templates, onUpdateMeta, onExport, onExportMarkdown, onExportMarkdownZip, onImport, onNewWorld, dirHandle, fsaaSupported, onSetupFolder, onDisconnectFolder, prefs, onUpdatePrefs, isLocked, onNavigateToKalendarium, onCreateManualSnapshot, onRestoreSnapshot, onExportSnapshot, onDeleteSnapshot }) {
  const fileRef = useRef(null);
  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    if (f) onImport(f);
    e.target.value = "";
  };

  return (
    <div className="settings-view">
      <div className="settings-section">
        <div className="section-hdr" style={{ marginTop: 0 }}>Appearance</div>
        <div className="form-field">
          <label className="form-label">Theme</label>
          <div className="appearance-options">
            {[
              { v: "default", label: "Default" },
              { v: "high-contrast", label: "High Contrast" },
            ].map(opt => (
              <button
                key={opt.v}
                type="button"
                className={`appearance-btn ${prefs.theme === opt.v ? "active" : ""}`}
                onClick={() => onUpdatePrefs({ theme: opt.v })}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="appearance-hint">High Contrast theme increases color contrast for low-vision accessibility (black/white/yellow).</div>
        </div>
        <div className="form-field">
          <label className="form-label">Font Size</label>
          <div className="appearance-options">
            {[
              { v: "small", label: "Small" },
              { v: "medium", label: "Medium" },
              { v: "large", label: "Large" },
              { v: "x-large", label: "Extra Large" },
            ].map(opt => (
              <button
                key={opt.v}
                type="button"
                className={`appearance-btn ${prefs.fontSize === opt.v ? "active" : ""}`}
                onClick={() => onUpdatePrefs({ fontSize: opt.v })}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="appearance-hint">Affects the entire UI. Family tree text uses its own zoom controls.</div>
        </div>
      </div>

      <div className="settings-section">
        <div className="section-hdr" style={{ marginTop: 0 }}>World</div>
        <div className="form-field">
          <label className="form-label">World Name</label>
          <input className="input" value={world.name} onChange={e => onUpdateMeta({ name: e.target.value })} />
        </div>
        <div className="form-field">
          <label className="form-label">Description</label>
          <AutoTextarea value={world.description} onChange={v => onUpdateMeta({ description: v })} placeholder="A short description of this world..." />
        </div>
      </div>

      <div className="settings-section">
        <div className="section-hdr">Variant Filter</div>
        <div className="cal-section-help">
          Filter the entry list to one variant of your world — an "Edition" field splitting
          content between rule editions, an "Era" field splitting it between world-ages, and
          so on. Name a Dropdown field below (matched by label across all templates) and a
          variant picker appears above the entry list. With a variant picked, entries whose
          field holds a different value are hidden; templates without the field, and entries
          with it unset, always stay visible. The optional second field names a Yes/No
          Dropdown marking an entry as belonging to every variant. Applies to the entry
          list only — views, exports, and reference pickers are never filtered.
        </div>
        <div className="form-field">
          <label className="form-label">Variant Field Label</label>
          <input
            className="input"
            value={world.variantAxis ? world.variantAxis.fieldLabel : ""}
            placeholder={"e.g. Edition"}
            onChange={e => {
              const v = e.target.value;
              if (!v.trim()) { onUpdateMeta({ variantAxis: null }); return; }
              // Changing the axis resets the active pick — a previously
              // active value is meaningless against a different field.
              onUpdateMeta({ variantAxis: { fieldLabel: v, flagLabel: world.variantAxis ? world.variantAxis.flagLabel : "", active: "" } });
            }}
          />
        </div>
        <div className="form-field">
          <label className="form-label">All-Variants Flag Field Label (optional)</label>
          <input
            className="input"
            value={world.variantAxis ? world.variantAxis.flagLabel : ""}
            placeholder={"e.g. Applies to Both Editions"}
            disabled={!world.variantAxis}
            onChange={e => onUpdateMeta({ variantAxis: { ...world.variantAxis, flagLabel: e.target.value } })}
          />
        </div>
      </div>

      <div className="settings-section">
        <div className="section-hdr">Calendar</div>
        <div className="cal-section-help">
          Calendar management has moved to <strong>Kalendarium</strong>. The world's primary calendar lives there alongside any additional calendars you've defined.
        </div>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "12px 14px",
          background: "var(--bg-panel)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          marginTop: 8,
        }}>
          <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
            Primary calendar: <strong style={{ color: "var(--text)" }}>{world.calendar?.name || "Gregorian"}</strong>
            {" · "}
            {world.calendar?.months?.length || 0} month{(world.calendar?.months?.length || 0) === 1 ? "" : "s"}
            {" · "}
            {(world.calendar?.eras || []).length} era{((world.calendar?.eras || []).length) === 1 ? "" : "s"}
          </div>
          <button className="btn btn-ghost" onClick={onNavigateToKalendarium}>
            Open Kalendarium →
          </button>
        </div>
      </div>

      <div className="settings-section">
        <div className="section-hdr">Images</div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-title">Image Folder</div>
            <div className="settings-row-desc">
              {fsaaSupported
                ? "Connect a folder where images are saved. Inserted images are written there as files; without a folder, images embed inline (larger save files)."
                : "Your browser doesn't support direct folder access. Images will embed inline as base64. For folder-based images, use Chrome or Edge."}
            </div>
            <div className={`fsaa-status ${dirHandle ? "connected" : ""}`} style={{ marginTop: 8 }}>
              <div className="fsaa-status-dot" />
              <span>{dirHandle ? `Connected: ${dirHandle.name}` : (fsaaSupported ? "No folder connected" : "Not supported in this browser")}</span>
            </div>
          </div>
          <div className="settings-row-action" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {fsaaSupported && (
              dirHandle
                ? <>
                    <button className="btn btn-ghost" onClick={onSetupFolder}>Change</button>
                    <button className="btn btn-danger" onClick={onDisconnectFolder}>Disconnect</button>
                  </>
                : <button className="btn btn-accent" onClick={onSetupFolder}>Connect Folder</button>
            )}
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="section-hdr">Access</div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-title">Lock to view-only</div>
            <div className="settings-row-desc">Hides edit / new / delete controls and disables the Calendar editor. Lock state persists in the save file. Unlocking requires a confirmation.</div>
          </div>
          <div className="settings-row-action">
            <div className={`toggle ${world.locked ? "on" : ""}`} onClick={() => {
              if (world.locked) {
                if (!confirm("Unlock this world? Edit controls will be visible again.")) return;
              }
              onUpdateMeta({ locked: !world.locked });
            }}>
              <div className="toggle-knob" />
            </div>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="section-hdr">Save File</div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-title">Export world</div>
            <div className="settings-row-desc">Download your world as a JSON file. This is the canonical save format — keep it next to your image folder.</div>
          </div>
          <div className="settings-row-action">
            <button className="btn btn-accent" onClick={onExport}>Export .json</button>
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-title">Export as Markdown</div>
            <div className="settings-row-desc">Download a human-readable Markdown version with all references resolved to names. Useful as a player handout, printed reference, or context for an AI assistant. Not a save file — use the JSON export to back up your world.</div>
          </div>
          <div className="settings-row-action" style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
            <button className="btn btn-accent" onClick={() => onExportMarkdown(false)}>Export .md</button>
            <button className="btn btn-ghost" onClick={() => onExportMarkdown(true)} title="Includes secret-marked fields. Use only for personal/GM reference.">Export .md (with secrets)</button>
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-title">Export as Markdown + images</div>
            <div className="settings-row-desc">Same as above, but bundled as a .zip with all referenced images in an <code>images/</code> folder alongside the .md. Image references in the Markdown point to <code>images/filename.ext</code>. Useful for sharing a self-contained world reference.</div>
          </div>
          <div className="settings-row-action" style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
            <button className="btn btn-accent" onClick={() => onExportMarkdownZip(false)}>Export .zip</button>
            <button className="btn btn-ghost" onClick={() => onExportMarkdownZip(true)} title="Includes secret-marked fields. Use only for personal/GM reference.">Export .zip (with secrets)</button>
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-title">Import world</div>
            <div className="settings-row-desc">Load a previously exported world file. This will replace the current world.</div>
          </div>
          <div className="settings-row-action">
            <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>Import .json</button>
            <input ref={fileRef} type="file" accept=".json,application/json" className="hidden-file-input" onChange={onPickFile} />
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="section-hdr">Reminders</div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-title">Backup reminder</div>
            <div className="settings-row-desc">When on, a banner appears at the top of the app once it's been more than 2 hours since your last JSON export and you have unsaved changes. The banner has Export and Snooze 1 hour buttons. Turn this off if you have your own backup workflow.</div>
          </div>
          <div className="settings-row-action">
            <div className={`toggle ${prefs.disableBackupReminder ? "" : "on"}`} onClick={() => onUpdatePrefs({ disableBackupReminder: !prefs.disableBackupReminder })}>
              <div className="toggle-knob" />
            </div>
          </div>
        </div>
      </div>

      <VersionHistoryPanel
        onCreateManual={onCreateManualSnapshot}
        onRestore={onRestoreSnapshot}
        onExport={onExportSnapshot}
        onDelete={onDeleteSnapshot}
      />

      <div className="danger-zone">
        <div className="danger-zone-title">Danger Zone</div>
        <div className="settings-row" style={{ borderBottom: "none", padding: "8px 0" }}>
          <div className="settings-row-info">
            <div className="settings-row-title">Start new world</div>
            <div className="settings-row-desc">Wipe everything and start fresh. Export first if you want to keep the current world.</div>
          </div>
          <div className="settings-row-action">
            <button className="btn btn-danger" onClick={onNewWorld}>Reset</button>
          </div>
        </div>
      </div>
    </div>
  );
}