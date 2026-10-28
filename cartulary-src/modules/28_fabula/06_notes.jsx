
// ─── Fabula: Notes (v1.7 r014) ─────────────────────────────────────────────────
// The Notes tab (docs/fabula-spec.md, sections 4 and 5.11, Drak's calls of
// 2026-10-26): the story's research notes by topic, A to Z, each opening on
// a page of its own. A note whose Open Questions holds any text is flagged
// open wherever its row appears, in a color quieter than an unpaid promise's
// red, and the tab's heading counts them; emptying the field clears the
// flag. A scene's page lists, under its fields, the notes whose Used In
// names it: read-only, changed from the note's side, and worked out each
// time the page is drawn, so nothing is stored.

// A note with open questions: its Open Questions holds any text.
const fabulaNoteOpen = (rec) => {
  const q = rec && rec.fields ? rec.fields.openQuestions : null;
  return typeof q === "string" && q.trim() !== "";
};

// A story's research notes by topic, A to Z; given a scene, only the notes
// whose Used In names it.
const fabulaNotesOf = (state, storyId, sceneId) => {
  const byName = (a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
  const usedIn = (r) => Array.isArray((r.fields || {}).usedIn) && r.fields.usedIn.includes(sceneId);
  return fabulaArr((state && state.fabula) || {}, "research")
    .filter(r => r && r.id && r.storyId === storyId && (!sceneId || usedIn(r)))
    .slice().sort(byName);
};

// The open flag.
const fabulaOpenFlag = () => (
  <span className="fabula-note-open" title="This note has open questions" style={{ fontSize: 11, padding: "0 7px", border: "1px solid var(--accent)", borderRadius: 9, color: "var(--accent)", letterSpacing: ".04em" }}>open</span>
);

// The Notes tab.
function FabulaNotesTab({ state, story, isLocked, onOpenRecord, onNewRecord }) {
  const fab = state.fabula || {};
  const notes = fabulaNotesOf(state, story.id);
  const open = notes.filter(fabulaNoteOpen).length;
  const places = fabulaOutlinePlaces(state, story.id);
  const entryById = new Map((state.entries || []).filter(e => e && e.id).map(e => [e.id, e]));
  const sceneById = new Map(fabulaArr(fab, "scenes").filter(s => s && s.id && s.storyId === story.id).map(s => [s.id, s]));
  const ids = (v) => (Array.isArray(v) ? v : []).filter(x => typeof x === "string" && x);
  // A row's details, each kept with the dot before it, and a list of names
  // in the order the field holds them, as a promise's row lists its scenes;
  // a scene names itself by its position, quieter, then its title.
  const dotted = (parts) => parts.map((p, i) => <span key={i}>{i > 0 ? "\u00a0\u00b7 " : ""}{p}</span>);
  const commas = (nodes) => nodes.map((n, i) => <span key={i}>{i > 0 ? ", " : ""}{n}</span>);
  const about = (v) => ids(v).map(id => entryById.get(id)).filter(Boolean).map(e => e.name || "(unnamed)");
  const usedIn = (v) => ids(v).filter(id => sceneById.has(id)).map(id => {
    const p = places.get(id);
    return <>{p && <span className="fabula-note-position" style={{ opacity: 0.6 }}>{p.path} </span>}{sceneById.get(id).name || "(untitled)"}</>;
  });
  // The title, then the flag, take the slack on their line, so the details
  // sit at the right while they fit and drop under the title, flush left,
  // when they don't, as the Plot tab's rows do.
  const lead = (last) => ({ flex: last ? "1000 1 auto" : "0 1 auto", minWidth: 0 });
  const metaStyle = { flex: "1 1 auto", minWidth: 0, fontSize: 12, fontWeight: 400, color: "var(--text-dim)", textAlign: "left", overflowWrap: "anywhere" };
  const row = (r) => {
    const f = r.fields || {};
    const flagged = fabulaNoteOpen(r);
    const a = about(f.appliesTo), u = usedIn(f.usedIn);
    const parts = [a.length ? <>about {commas(a)}</> : null, u.length ? <>used in {commas(u)}</> : null].filter(Boolean);
    return (
      <div
        key={r.id}
        className="stemma-index-row fabula-note-row"
        data-note={r.id}
        data-open={flagged ? "true" : undefined}
        role="button"
        tabIndex={0}
        title="Open this research note"
        onClick={() => onOpenRecord("research", r.id)}
        onKeyDown={e => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); onOpenRecord("research", r.id); } }}
        style={{ padding: "9px 12px 9px 16px", background: "var(--surf)", display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 12, rowGap: 2, cursor: "pointer" }}
      >
        <span className="fabula-note-title" style={{ ...lead(!flagged), fontSize: 14.5, fontWeight: 500, overflowWrap: "anywhere" }}>{r.name || "(untitled)"}</span>
        {flagged && <span style={lead(true)}>{fabulaOpenFlag()}</span>}
        {parts.length > 0 && <span className="fabula-note-meta" style={metaStyle}>{dotted(parts)}</span>}
      </div>
    );
  };
  return (
    <div className="fabula-notes">
      <div className="fabula-notes-section" style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
          <div className="field-label">
            <span>Research Notes</span>
            {open > 0 && <span className="fabula-notes-open-count" style={{ textTransform: "none", letterSpacing: 0, fontSize: 12, color: "var(--accent)" }}>{"\u00b7 "}{open} open</span>}
          </div>
          {!isLocked && <button className="btn" style={{ padding: "3px 10px", fontSize: 12 }} onClick={() => onNewRecord("research")}>+ New {FABULA_NOUNS.research.add}</button>}
        </div>
        {notes.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--text-dim)", fontStyle: "italic" }}>No research notes yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 1, border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
            {notes.map(row)}
          </div>
        )}
      </div>
    </div>
  );
}

// A scene's research, under its fields: the notes whose Used In names it,
// by topic, each opening its note, and nothing at all when there are none.
// In edit it says where the list is changed.
function FabulaSceneResearch({ state, storyId, sceneId, editing, onOpenEntry }) {
  const notes = fabulaNotesOf(state, storyId, sceneId);
  if (notes.length === 0) return null;
  return (
    <div className="fabula-scene-research" style={{ marginTop: 26 }}>
      <div className="field-label">
        <span>Research</span>
        {editing && <span style={{ textTransform: "none", letterSpacing: 0, fontSize: 12, color: "var(--text-dim)" }}>set by each note's Used In</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1, border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
        {notes.map(r => (
          <div
            key={r.id}
            className="stemma-index-row fabula-scene-note"
            data-note={r.id}
            role="button"
            tabIndex={0}
            title="Open this research note"
            onClick={() => onOpenEntry(r.id)}
            onKeyDown={e => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); onOpenEntry(r.id); } }}
            style={{ padding: "8px 14px", background: "var(--surf)", display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 10, rowGap: 2, cursor: "pointer" }}
          >
            <span className="fabula-note-title" style={{ fontSize: 14, minWidth: 0, overflowWrap: "anywhere" }}>{r.name || "(untitled)"}</span>
            {fabulaNoteOpen(r) && fabulaOpenFlag()}
          </div>
        ))}
      </div>
    </div>
  );
}