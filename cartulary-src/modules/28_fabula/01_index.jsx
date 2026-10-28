
// ─── Fabula: the index and the corpus page (v1.7 r007) ─────────────────────────
// Fabula's first screen (docs/fabula-spec.md, section 4). The index lists
// every corpus with its stories in reading order, then the stories in no
// corpus, corpora and loose stories by name; a corpus opens on its page,
// where its reading order changes by drag or by the arrows. A story is a row
// until its page comes, in r008. App holds the state and the handlers, as it
// does for maps, and passes them down. What the node-source registry reads
// for Fabula's kinds lives here too: a kind's records as nodes, and each
// corpus's stories as its edges, so Concordance draws a corpus to its
// stories. Links inside a record's fields aren't edges yet.
const fabulaRegistryInstances = (state, k) =>
  ((state && state.fabula && Array.isArray(state.fabula[k.slice])) ? state.fabula[k.slice] : [])
    .filter(r => r && r.id)
    .map(r => ({ id: r.id, name: r.name || "(untitled)", kind: k.kind }));

const fabulaRegistryEdges = (state, k) => {
  const fab = (state && state.fabula) || {};
  const edges = [];
  if (k.kind === "corpus") {
    const storyIds = new Set((Array.isArray(fab.stories) ? fab.stories : []).map(st => st && st.id).filter(Boolean));
    (Array.isArray(fab.corpora) ? fab.corpora : []).forEach(c => {
      if (!c || !c.id || !Array.isArray(c.storyIds)) return;
      c.storyIds.forEach(id => { if (storyIds.has(id)) edges.push({ source: c.id, target: id, label: "includes", kind: "directed" }); });
    });
  }
  // v1.7 r009: the links that exist so far (spec, section 9), each labeled as
  // its field is: a story to its threads and themes, a cast record to its
  // character, an arc to its cast, a relationship to its two, since r011
  // a scene to its POV, participants, setting, and threads, and since r015
  // its motifs, since r013 a plot point to its scene and threads and a
  // promise to its setup and payoff scenes and its threads, and since r014 a
  // research note to the entries it applies to and the scenes it's used in.
  // Concordance drops an edge whose other end isn't drawn.
  const seeded = { story: ["threads", "themes"], cast: ["character"], arc: ["cast"], relationship: ["castA", "castB"], scene: ["pov", "participants", "setting", "threads", "motifs"], plotPoint: ["deliveredIn", "threads"], promise: ["setupIn", "payoffIn", "threads"], research: ["appliesTo", "usedIn"] }[k.kind] || [];
  // Since v1.7's r017 a link field of the user's own draws its edges too,
  // labeled as the field is (spec, section 9): any reference whose id no
  // seed uses, a corpus's included. A seeded link the user has deleted, or
  // made something other than a reference, draws none: its values stay in
  // the records unseen, as a template's deleted field's do.
  const fields = fabulaKindFields(state, k.kind);
  const seedIds = fabulaSeedIds(k.kind);
  const refIds = new Set(fields.filter(f => f && f.id && f.type === "entry-ref").map(f => f.id));
  const links = [...seeded.filter(id => refIds.has(id)), ...[...refIds].filter(id => !seedIds.has(id))];
  if (links.length === 0) return edges;
  (Array.isArray(fab[k.slice]) ? fab[k.slice] : []).forEach(r => {
    if (!r || !r.id) return;
    links.forEach(fid => {
      const f = fields.find(x => x.id === fid);
      const v = (r.fields || {})[fid];
      (Array.isArray(v) ? v : [v]).forEach(t => { if (typeof t === "string" && t) edges.push({ source: r.id, target: t, label: f ? f.label : fid, kind: "directed" }); });
    });
  });
  return edges;
};

// A kind's schema as the template EntryForm and EntryView take: the world's
// stored schema, or the seed when the world has none, its reference fields
// following their targets' names (fabulaLiveFields, v1.7 r008).
const fabulaTemplate = (state, kind, ctx) => {
  const k = FABULA_KINDS.find(x => x.kind === kind);
  const stored = state.fabula && state.fabula.schemas && state.fabula.schemas[kind];
  const s = stored && Array.isArray(stored.fields) ? stored : fabulaSeedSchemas(state.templates || [])[kind];
  let fields = fabulaLiveFields(s.fields, state.templates || []);
  // v1.7 r009: one cast record per character per story (spec, section 5.3),
  // so a cast record's Character leaves out the characters the story's other
  // cast records have (ctx: the story and the record).
  if (kind === "cast" && ctx && ctx.storyId) {
    const cast = (state.fabula && Array.isArray(state.fabula.cast)) ? state.fabula.cast : [];
    const taken = cast.filter(c => c && c.storyId === ctx.storyId && c.id !== ctx.recordId).map(c => (c.fields || {}).character).filter(v => typeof v === "string" && v);
    fields = fields.map(fl => fl.id === "character" ? { ...fl, excludeIds: taken } : fl);
  }
  // v1.7 r013: a scene's, a plot point's, or a promise's Threads lists the
  // story's own threads first, under a heading of their own (spec, section
  // 12, item 7), and a plot point's Slot offers its story's slots, with the
  // record's own slot kept when it's from another structure.
  if ((kind === "scene" || kind === "plotPoint" || kind === "promise") && ctx && ctx.storyId) {
    const story = fabulaStoryOf(state.fabula || {}, ctx.storyId);
    const own = fabulaStoryThreads(story);
    if (own.length > 0) fields = fields.map(fl => (fl.id === "threads" && fl.type === "entry-ref" ? { ...fl, firstIds: own, firstLabel: "This story's threads", restLabel: "Other threads" } : fl));
    // v1.7 r015: a scene's Motifs lists the story's own themes first, the
    // same way.
    const themes = kind === "scene" ? fabulaStoryThemes(story) : [];
    if (themes.length > 0) fields = fields.map(fl => (fl.id === "motifs" && fl.type === "entry-ref" ? { ...fl, firstIds: themes, firstLabel: "This story's themes", restLabel: "Other themes" } : fl));
    if (kind === "plotPoint") {
      const slots = fabulaStorySlots(story);
      const rec = fabulaArr(state.fabula || {}, "plotPoints").find(r => r && r.id === ctx.recordId);
      const mine = rec ? fabulaSlotOf(rec) : null;
      const options = mine && mine.name && !mine.typed && !slots.includes(mine.name) ? [...slots, mine.name] : slots;
      fields = fields.map(fl => (fl.optionsFrom === "structure" ? { ...fl, options } : fl));
    }
  }
  return { id: k.id, name: k.label, icon: "\u2042", color: k.color, kind: `fabula-${kind}`, fields, nameHelp: s.nameHelp };
};

// A story's cast and scenes, for its row.
const fabulaStoryCounts = (state, storyId) => {
  const fab = state.fabula || {};
  const count = (slice) => (Array.isArray(fab[slice]) ? fab[slice] : []).filter(r => r && r.storyId === storyId).length;
  return { cast: count("cast"), scenes: count("scenes") };
};

const fabulaCorpusDeleteMessage = (corpus) => {
  const n = Array.isArray(corpus.storyIds) ? corpus.storyIds.length : 0;
  const name = corpus.name || "this corpus";
  return n === 0
    ? `Delete the corpus "${name}"?`
    : `Delete the corpus "${name}"? Its ${n === 1 ? "story stays" : `${n} stories stay`} in Fabula, in no corpus.`;
};

function FabulaStoryLine({ state, story, onOpen }) {
  const counts = fabulaStoryCounts(state, story.id);
  const status = formatSelectDisplay((story.fields || {}).status);
  // v1.7 r008: a click on the line opens the story's page.
  const open = onOpen ? {
    role: "button",
    tabIndex: 0,
    title: "Open this story",
    onClick: () => onOpen(story.id),
    onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(story.id); } },
  } : {};
  return (
    <div className="fabula-story-line" {...open} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, cursor: onOpen ? "pointer" : undefined }}>
      <div style={{ fontSize: 15, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis" }}>{story.name || "(untitled story)"}</div>
      <div style={{ fontSize: 12, color: "var(--text-dim)", whiteSpace: "nowrap" }}>
        {status && <span>{status} · </span>}
        {counts.cast} cast · {counts.scenes} {counts.scenes === 1 ? "scene" : "scenes"}
        {story.updatedAt && <span> · updated {fmtDate(story.updatedAt)}</span>}
      </div>
    </div>
  );
}

// One story's row, with its title renamed in place. autoRename opens the
// title for typing, for a story just made, and onRenameEnd tells the parent
// the typing is over. leading comes before the title (the reading order's
// number), actions before Rename, trailing after it.
function FabulaStoryRow({ state, story, isLocked, autoRename, onRename, onRenameEnd, onOpen, leading, actions, trailing, rowProps }) {
  const [renaming, setRenaming] = useState(!!autoRename);
  const [text, setText] = useState(story.name || "");
  useEffect(() => { if (autoRename) { setText(story.name || ""); setRenaming(true); } }, [autoRename]);
  const commit = () => {
    const t = text.trim();
    if (t && t !== story.name) onRename(story.id, t);
    setRenaming(false);
    if (onRenameEnd) onRenameEnd();
  };
  const { style: rowStyle, ...rest } = rowProps || {};
  return (
    <div className="stemma-index-row" {...rest} style={{ padding: "10px 16px", background: "var(--surf)", display: "flex", alignItems: "center", gap: 12, ...(rowStyle || {}) }}>
      {leading}
      {renaming && !isLocked ? (
        <input
          className="input"
          autoFocus
          aria-label="Story title"
          value={text}
          onFocus={e => e.target.select()}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault(); commit(); }
            else if (e.key === "Escape") { e.preventDefault(); setText(story.name || ""); setRenaming(false); if (onRenameEnd) onRenameEnd(); }
          }}
          onBlur={commit}
          style={{ flex: 1 }}
        />
      ) : <FabulaStoryLine state={state} story={story} onOpen={onOpen} />}
      {!isLocked && !renaming && (
        <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
          {actions}
          <button className="btn" style={{ padding: "3px 8px", fontSize: 12 }} onClick={() => { setText(story.name || ""); setRenaming(true); }} title="Rename this story">Rename</button>
          {trailing}
        </div>
      )}
    </div>
  );
}

// v1.7 r016: the index ends with the world's plot threads and themes, two
// sections (FabulaTemplateSections) whose handlers App hands in as sections.
// Since r017 the Templates section comes after them (FabulaKindTemplates),
// and sections carries its Edit Template too (onEditKind).
function FabulaIndexView({ state, isLocked, onOpenCorpus, onCreateCorpus, onCreateStory, onRenameStory, onDeleteStory, onSetStoryCorpus, onOpenStory, sections }) {
  const [justMade, setJustMade] = useState(null);
  const fab = state.fabula || {};
  const byName = (a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
  const corpora = (Array.isArray(fab.corpora) ? fab.corpora : []).filter(c => c && c.id).slice().sort(byName);
  const stories = (Array.isArray(fab.stories) ? fab.stories : []).filter(st => st && st.id);
  const storyById = new Map(stories.map(st => [st.id, st]));
  const corpusOf = new Map();
  corpora.forEach(c => (c.storyIds || []).forEach(id => { if (storyById.has(id) && !corpusOf.has(id)) corpusOf.set(id, c.id); }));
  const loose = stories.filter(st => !corpusOf.has(st.id)).sort(byName);
  const newStory = () => { const id = onCreateStory(null); if (id) setJustMade(id); };
  const listBox = { display: "flex", flexDirection: "column", gap: 1, border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" };
  const smallBtn = { padding: "3px 8px", fontSize: 12 };
  const row = (st) => (
    <FabulaStoryRow
      key={st.id}
      state={state}
      story={st}
      isLocked={isLocked}
      autoRename={justMade === st.id}
      onRename={onRenameStory}
      onRenameEnd={() => setJustMade(null)}
      onOpen={onOpenStory}
      actions={
        <select className="input" value={corpusOf.get(st.id) || ""} onChange={e => onSetStoryCorpus(st.id, e.target.value || null)} title="The corpus this story belongs to" aria-label="Corpus" style={{ fontSize: 12, padding: "3px 28px 3px 8px", minWidth: 130, maxWidth: 220 }}>
          <option value="">No corpus</option>
          {corpora.map(c => <option key={c.id} value={c.id}>{c.name || "(untitled corpus)"}</option>)}
        </select>
      }
      trailing={
        <button className="btn" style={{ ...smallBtn, color: "var(--danger)", borderColor: "rgba(184,92,76,.35)" }} onClick={() => {
          if (confirm(fabulaStoryDeleteMessage(state, st))) onDeleteStory(st.id);
        }} title="Delete this story">Delete</button>
      }
    />
  );
  return (
    <div style={{ padding: "20px 24px", maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
        <div style={{ color: "var(--text-dim)", fontSize: 14, lineHeight: 1.5, maxWidth: 560 }}>
          The stories set in this world, planned down to their scenes and beats; the writing itself happens somewhere else. A corpus gathers stories, a series or a shared world, and a story belongs to one corpus at most.
        </div>
        {!isLocked && (
          <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
            <button className="btn" onClick={onCreateCorpus}>+ New Corpus</button>
            <button className="btn btn-accent" onClick={newStory}>+ New Story</button>
          </div>
        )}
      </div>

      {corpora.length === 0 && stories.length === 0 && (
        <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-dim)", fontStyle: "italic", border: "1px dashed var(--border)", borderRadius: 6, background: "var(--surf)" }}>
          No stories yet.{!isLocked && " Click + New Story or + New Corpus above to begin."}
        </div>
      )}

      {corpora.map(c => {
        const its = (c.storyIds || []).filter(id => corpusOf.get(id) === c.id).map(id => storyById.get(id));
        const kind = formatSelectDisplay((c.fields || {}).kind);
        const status = formatSelectDisplay((c.fields || {}).status);
        return (
          <div key={c.id} style={{ marginBottom: 20 }}>
            <div
              className="stemma-index-row"
              style={{ padding: "12px 16px", background: "var(--surf)", cursor: "pointer", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, border: "1px solid var(--border)", borderRadius: 4, marginBottom: 6 }}
              onClick={() => onOpenCorpus(c.id)}
              title="Open this corpus"
            >
              <div style={{ fontSize: 16, fontWeight: 500, display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ color: "#d9a066", fontSize: 13 }}>{"\u2042"}</span>
                <span>{c.name || "(untitled corpus)"}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", whiteSpace: "nowrap" }}>
                {[kind, status].filter(Boolean).join(" · ")}{(kind || status) ? " · " : ""}
                {its.length} {its.length === 1 ? "story" : "stories"}
                {c.updatedAt && <span> · updated {fmtDate(c.updatedAt)}</span>}
              </div>
            </div>
            {its.length > 0
              ? <div style={{ ...listBox, marginLeft: 18 }}>{its.map(row)}</div>
              : <div style={{ marginLeft: 18, fontSize: 13, color: "var(--text-dim)", fontStyle: "italic" }}>No stories in this corpus yet.</div>}
          </div>
        );
      })}

      {loose.length > 0 && (
        <div style={{ marginTop: corpora.length > 0 ? 28 : 0 }}>
          {corpora.length > 0 && <div className="field-label" style={{ marginBottom: 8 }}><span>Stories in no corpus</span></div>}
          <div style={listBox}>{loose.map(row)}</div>
        </div>
      )}

      {sections && <FabulaTemplateSections state={state} isLocked={isLocked} sections={sections} />}
      {sections && sections.onEditKind && <FabulaKindTemplates state={state} isLocked={isLocked} focus={sections.focus} onFocused={sections.onFocused} onEditKind={sections.onEditKind} />}
    </div>
  );
}

// A corpus's stories in reading order, on its page: drag a row to a new
// place, or move it with the arrows. A story made here starts at the end.
function FabulaReadingOrder({ state, corpus, isLocked, onMoveStory, onCreateStory, onRenameStory, onOpenStory }) {
  // The dragged story, in a ref as well as in state: a drop can arrive before
  // React has drawn the drag's start.
  const dragRef = useRef(null);
  const [dragId, setDragId] = useState(null);
  const [justMade, setJustMade] = useState(null);
  const fab = state.fabula || {};
  const storyById = new Map((Array.isArray(fab.stories) ? fab.stories : []).filter(st => st && st.id).map(st => [st.id, st]));
  const ids = (corpus.storyIds || []).filter(id => storyById.has(id));
  const arrow = { padding: "3px 8px", fontSize: 12, minWidth: 30 };
  return (
    <div style={{ margin: "4px 0 20px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
        <div className="field-label"><span>Reading order</span></div>
        {!isLocked && <button className="btn" style={{ padding: "3px 10px", fontSize: 12 }} onClick={() => { const id = onCreateStory(corpus.id); if (id) setJustMade(id); }}>+ New Story</button>}
      </div>
      {ids.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--text-dim)", fontStyle: "italic" }}>
          No stories in this corpus yet.{!isLocked && " Add one here, or pick this corpus in a story's Corpus dropdown on Fabula's index."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 1, border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
          {ids.map((id, i) => (
            <FabulaStoryRow
              key={id}
              state={state}
              story={storyById.get(id)}
              isLocked={isLocked}
              autoRename={justMade === id}
              onRename={onRenameStory}
              onRenameEnd={() => setJustMade(null)}
              onOpen={onOpenStory}
              rowProps={isLocked ? null : {
                draggable: true,
                onDragStart: (e) => { dragRef.current = id; setDragId(id); e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", id); } catch (_) {} },
                onDragOver: (e) => { const d = dragRef.current; if (d && d !== id) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; } },
                onDrop: (e) => { e.preventDefault(); const d = dragRef.current; if (d && d !== id) onMoveStory(corpus.id, d, i); dragRef.current = null; setDragId(null); },
                onDragEnd: () => { dragRef.current = null; setDragId(null); },
                style: { cursor: "grab", opacity: dragId === id ? 0.5 : 1 },
              }}
              leading={<span style={{ width: 22, flexShrink: 0, color: "var(--text-dim)", fontSize: 13, textAlign: "right" }}>{i + 1}.</span>}
              actions={<>
                <button className="btn" style={arrow} disabled={i === 0} onClick={() => onMoveStory(corpus.id, id, i - 1)} title="Earlier in the reading order" aria-label="Move earlier">{"\u2191"}</button>
                <button className="btn" style={arrow} disabled={i === ids.length - 1} onClick={() => onMoveStory(corpus.id, id, i + 1)} title="Later in the reading order" aria-label="Move later">{"\u2193"}</button>
              </>}
            />
          ))}
        </div>
      )}
    </div>
  );
}