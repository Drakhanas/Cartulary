
// ─── Stemma index view ───────────────────────────────────────────────────────
// The Views-section landing page when the user clicks "Stemma" in the sidebar.
// Lists every stemma in the world; click into a row opens its canvas. Per-row
// Export and Delete actions stop propagation so they don't trigger row-click
// open. Header has Import (file picker) and, since v1.7's r029, + New Rota and
// + New Tabula; all gated on !isLocked. Empty state suggests both creation
// paths. Each row is marked with its layout and counted in its own terms:
// nodes for a rota, cards (and columns, from r030) for a tabula.

function StemmaIndexView({ state, isLocked, onOpen, onCreate, onImport, onExport, onExportMarkdown, onDelete }) {
  const stemmas = Array.isArray(state.stemmas) ? state.stemmas : [];
  const importInputRef = useRef(null);

  return (
    <div style={{ padding: "20px 24px", maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
        <div style={{ color: "var(--text-dim)", fontSize: 14, lineHeight: 1.5, maxWidth: 560 }}>
          Freeform mind maps for plot threads, theme webs, organizational hierarchies — anything tree-shaped. A rota is a radial tree with a focal node at the center; click into any node to drill in and re-center on it. A tabula is a board: cards where you put them, for the thinking that doesn't fit a tree.
        </div>
        {!isLocked && (
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <input
              ref={importInputRef}
              type="file"
              accept=".json,application/json"
              style={{ display: "none" }}
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) onImport(f);
                e.target.value = "";  // reset so re-importing the same file fires onChange
              }}
            />
            <button
              className="btn btn-ghost"
              onClick={() => importInputRef.current?.click()}
              title="Import a stemma from JSON"
            >Import</button>
            <button className="btn btn-accent" onClick={() => onCreate("rota")}>+ New Rota</button>
            <button className="btn btn-accent" onClick={() => onCreate("tabula")}>+ New Tabula</button>
          </div>
        )}
      </div>

      {stemmas.length === 0 ? (
        <div style={{
          padding: "60px 20px",
          textAlign: "center",
          color: "var(--text-dim)",
          fontStyle: "italic",
          border: "1px dashed var(--border)",
          borderRadius: 6,
          background: "var(--surf)"
        }}>
          No stemmas yet.{!isLocked && " Click + New Rota or + New Tabula above to create one, or Import an existing stemma JSON."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 1, border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
          {stemmas.map(s => {
            const isTabula = s.layout === "tabula";
            const nodeCount = isTabula ? 0 : countStemmaNodes(s);
            const counts = isTabula ? tabulaCounts(s) : null;
            const countText = isTabula
              ? `${counts.cards} ${counts.cards === 1 ? "card" : "cards"}${counts.columns > 0 ? ` · ${counts.columns} ${counts.columns === 1 ? "column" : "columns"}` : ""}`
              : `${nodeCount} ${nodeCount === 1 ? "node" : "nodes"}`;
            return (
              <div
                key={s.id}
                className="stemma-index-row"
                style={{ padding: "12px 16px", background: "var(--surf)", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 12 }}
                onClick={() => onOpen(s.id)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name || "(unnamed stemma)"}</span>
                      <span className="tabula-badge" title={isTabula ? "A board" : "A radial tree"}>{isTabula ? "Tabula" : "Rota"}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-dim)", whiteSpace: "nowrap" }}>
                      {countText}
                      {s.updatedAt && <span> · updated {fmtDate(s.updatedAt)}</span>}
                    </div>
                  </div>
                  {s.description && (
                    <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 4 }}>
                      {s.description}
                    </div>
                  )}
                  {Array.isArray(s.tags) && s.tags.length > 0 && (
                    <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {s.tags.map(t => (
                        <span key={t} style={{ fontSize: 11, padding: "2px 8px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-dim)" }}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
                {/* Per-row actions. Click handlers stop propagation so they
                    don't trigger the row's onOpen. */}
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: "3px 8px", fontSize: 12 }}
                    onClick={ev => { ev.stopPropagation(); onExport(s); }}
                    title="Export this stemma as JSON"
                  >Export</button>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: "3px 8px", fontSize: 12 }}
                    onClick={ev => { ev.stopPropagation(); onExportMarkdown && onExportMarkdown(s); }}
                    title="Export this stemma as Markdown"
                  >Markdown</button>
                  {!isLocked && (
                    <button
                      className="btn"
                      style={{ padding: "3px 8px", fontSize: 12, color: "var(--danger)", borderColor: "rgba(184,92,76,.35)" }}
                      onClick={ev => {
                        ev.stopPropagation();
                        askRecordDelete({ state, ids: [s.id], title: `Delete stemma "${s.name}"?`, onConfirm: () => onDelete(s.id) });
                      }}
                      title="Delete this stemma"
                    >Delete</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}