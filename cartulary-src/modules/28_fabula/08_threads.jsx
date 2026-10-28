
// ─── Fabula: threads and themes (v1.7 r016) ────────────────────────────────────
// Plot Thread and Theme / Motif under Fabula (docs/fabula-spec.md, section 4
// and 5.12, Drak's calls of 2026-10-26). The two stay entries and stay in
// BUILTIN_TEMPLATES, which seeds, upgrades, restores, and resets them; a flag
// on each world's copy, fabulaRole ("threads" or "themes"), keeps them out of
// the sidebar's Templates list and Restore Built-ins, and Fabula's index
// lists them in two sections after the stories. An entry of theirs keeps the
// ordinary entry page, which lists the stories that use it, and whatever
// would land on its template's list page lands on its section instead.

// The template a world keeps for one of the two, or null.
const fabulaRoleTemplate = (templates, role) =>
  (Array.isArray(templates) ? templates : []).find(t => t && t.fabulaRole === role) || null;

// The built-in a role belongs to, and the role a built-in's name carries.
const fabulaRoleBuiltin = (role) => BUILTIN_TEMPLATES.find(b => b.fabulaRole === role) || null;
const fabulaRoleOfName = (name) => (BUILTIN_TEMPLATES.find(b => b.fabulaRole && b.name === name) || {}).fabulaRole || null;

// migrate()'s flagging, every load. A world with no template flagged for one
// of the two flags one: the built-in, edited or not; failing that, the
// built-in under a name the user gave it, known by the id it was seeded with
// (tpl-<slug>- and four characters, which a rename leaves alone); failing
// that, a template of the user's own with the exact name that no pack holds,
// the one Fabula's pickers find by name where the built-in is gone. A world
// with two flagged for one keeps the first, the built-in if either is, and
// the others go back to the sidebar, and a flag that names neither goes. So
// the first load from r016 on flags them, and every later load changes
// nothing.
const fabulaFlagTemplates = (state) => {
  const templates = Array.isArray(state && state.templates) ? state.templates : [];
  const owners = BUILTIN_TEMPLATES.filter(b => b.fabulaRole);
  const roles = new Set(owners.map(b => b.fabulaRole));
  templates.forEach(t => { if (t && Object.prototype.hasOwnProperty.call(t, "fabulaRole") && !roles.has(t.fabulaRole)) delete t.fabulaRole; });
  const packed = new Set((Array.isArray(state.packs) ? state.packs : []).flatMap(p => (p && Array.isArray(p.templateIds) ? p.templateIds : [])));
  owners.forEach(b => {
    const flagged = templates.filter(t => t && t.fabulaRole === b.fabulaRole);
    if (flagged.length > 0) {
      const keep = flagged.find(t => t.origin === TEMPLATE_ORIGIN.BUILTIN) || flagged[0];
      flagged.forEach(t => { if (t !== keep) delete t.fabulaRole; });
      return;
    }
    const pre = `tpl-${slugify(b.name)}-`;
    const pick = templates.find(t => t && t.origin === TEMPLATE_ORIGIN.BUILTIN && t.name === b.name)
      || templates.find(t => t && t.origin === TEMPLATE_ORIGIN.BUILTIN && typeof t.id === "string" && t.id.startsWith(pre) && t.id.length === pre.length + 4)
      || templates.find(t => t && t.origin !== TEMPLATE_ORIGIN.BUILTIN && t.name === b.name && !packed.has(t.id));
    if (pick) pick.fabulaRole = b.fabulaRole;
  });
};

// The stories in the index's order: each corpus by name with its stories in
// reading order, then the stories in no corpus by name, as FabulaIndexView
// lists them, each story once.
const fabulaIndexStories = (state) => {
  const fab = (state && state.fabula) || {};
  const byName = (a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
  const corpora = fabulaArr(fab, "corpora").filter(c => c && c.id).slice().sort(byName);
  const stories = fabulaArr(fab, "stories").filter(st => st && st.id);
  const storyById = new Map(stories.map(st => [st.id, st]));
  const corpusOf = new Map();
  corpora.forEach(c => (c.storyIds || []).forEach(id => { if (storyById.has(id) && !corpusOf.has(id)) corpusOf.set(id, c.id); }));
  const out = [];
  const seen = new Set();
  const put = (st) => { if (st && !seen.has(st.id)) { seen.add(st.id); out.push(st); } };
  corpora.forEach(c => (c.storyIds || []).forEach(id => { if (corpusOf.get(id) === c.id) put(storyById.get(id)); }));
  stories.filter(st => !corpusOf.has(st.id)).sort(byName).forEach(put);
  return out;
};

// For one of the two, the stories that use each entry, in the index's order.
// A story uses an entry when its own Threads or Themes names it, or any of
// its records does: a scene's, a plot point's, or a promise's Threads, or a
// scene's Motifs (spec, 5.12). Entry id to stories.
const fabulaRoleStories = (state, role) => {
  const fab = (state && state.fabula) || {};
  const order = fabulaIndexStories(state);
  const rank = new Map(order.map((st, i) => [st.id, i]));
  const use = new Map();
  const add = (eid, sid) => {
    if (typeof eid !== "string" || !eid || !rank.has(sid)) return;
    if (!use.has(eid)) use.set(eid, new Set());
    use.get(eid).add(sid);
  };
  order.forEach(st => (role === "threads" ? fabulaStoryThreads(st) : fabulaStoryThemes(st)).forEach(eid => add(eid, st.id)));
  const fields = role === "threads" ? [["scenes", "threads"], ["plotPoints", "threads"], ["promises", "threads"]] : [["scenes", "motifs"]];
  fields.forEach(([slice, fid]) => fabulaArr(fab, slice).forEach(r => {
    const v = r && r.fields ? r.fields[fid] : null;
    if (Array.isArray(v)) v.forEach(eid => add(eid, r.storyId));
  }));
  const out = new Map();
  use.forEach((ids, eid) => out.set(eid, [...ids].sort((a, b) => rank.get(a) - rank.get(b)).map(id => order[rank.get(id)])));
  return out;
};

// One entry's run, story by story, for its page (spec, 5.12): each story that
// uses it, in the index's order, whether the story's own list names it, the
// scenes that name it in the outline's order, and for a thread the plot
// points and promises that name it, each in the Plot tab's order.
const fabulaEntryRuns = (state, entryId, role) => {
  const fab = (state && state.fabula) || {};
  const names = (r, fid) => { const v = r && r.fields ? r.fields[fid] : null; return Array.isArray(v) && v.includes(entryId); };
  const field = role === "threads" ? "threads" : "motifs";
  return fabulaIndexStories(state).map(story => {
    const own = (role === "threads" ? fabulaStoryThreads(story) : fabulaStoryThemes(story)).includes(entryId);
    const places = fabulaOutlinePlaces(state, story.id);
    const at = (id) => (places.has(id) ? places.get(id).index : Number.MAX_SAFE_INTEGER);
    const scenes = fabulaArr(fab, "scenes").filter(s => s && s.id && s.storyId === story.id && names(s, field)).sort((a, b) => at(a.id) - at(b.id));
    const plotPoints = role === "threads" ? fabulaPlotHeadings(state, story).flatMap(h => h.points).filter(r => names(r, "threads")) : [];
    const promises = role === "threads" ? fabulaPromisesInOrder(state, story).filter(r => names(r, "threads")) : [];
    return { story, own, places, scenes, plotPoints, promises };
  }).filter(u => u.own || u.scenes.length > 0 || u.plotPoints.length > 0 || u.promises.length > 0);
};

// The index's two sections, Plot Threads then Themes & Motifs (spec, section
// 4). sections carries what App hands them: the section to scroll to
// (focus), and the handlers for a row, + New Entry, Edit Template, Export,
// and Restore.
function FabulaTemplateSections({ state, isLocked, sections }) {
  return <>{["threads", "themes"].map(role => <FabulaTemplateSection key={role} state={state} isLocked={isLocked} role={role} {...sections} />)}</>;
}

// One section: its template's entries by name, each row naming the stories
// that use it, or saying none does; a click anywhere on a row opens the
// entry. A world without the template says so and offers Restore, and in Lock
// Mode no button shows.
function FabulaTemplateSection({ state, role, isLocked, focus, onFocused, onOpenEntry, onNewEntry, onEditTemplate, onExportTemplate, onRestoreTemplate }) {
  const ref = useRef(null);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    if (focus !== role) return;
    if (ref.current && ref.current.scrollIntoView) ref.current.scrollIntoView({ block: "start" });
    if (onFocused) onFocused();
  }, [focus]);
  const tpl = fabulaRoleTemplate(state.templates, role);
  const builtin = fabulaRoleBuiltin(role);
  const threads = role === "threads";
  const title = threads ? "Plot Threads" : "Themes & Motifs";
  const byName = (a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
  const entries = tpl ? (state.entries || []).filter(e => e && e.templateId === tpl.id).slice().sort(byName) : [];
  const stories = fabulaRoleStories(state, role);
  const small = { padding: "3px 10px", fontSize: 12 };
  // A row's details sit at its right while they fit beside its title, and
  // drop under it, flush left, when they don't, as the Plot tab's rows do.
  const tail = { fontSize: 12, fontWeight: 400, color: "var(--text-dim)", marginLeft: "auto", minWidth: 0, textAlign: "left", overflowWrap: "anywhere", flex: "1 1 auto", display: "inline-flex", alignItems: "baseline", justifyContent: "flex-end", flexWrap: "nowrap" };
  return (
    <div ref={ref} className="fabula-template-section" data-section={role} style={{ marginTop: 28 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
        <div className="field-label"><span>{title}</span></div>
        {!isLocked && tpl && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "baseline" }}>
            <div className="export-menu-wrap">
              <button className="btn btn-ghost" style={small} onClick={() => setMenu(o => !o)} title="Export this template as a portable file">Export ↓</button>
              {menu && <>
                <div className="menu-backdrop" onClick={() => setMenu(false)} />
                <div className="export-menu">
                  <button onClick={() => { onExportTemplate(tpl, "json"); setMenu(false); }}>Export as .template.json</button>
                  <button onClick={() => { onExportTemplate(tpl, "md"); setMenu(false); }}>Export as .template.md</button>
                </div>
              </>}
            </div>
            <button className="btn btn-ghost" style={small} onClick={() => onEditTemplate(tpl)}>Edit Template</button>
            <button className="btn" style={small} onClick={() => onNewEntry(tpl)}>+ New Entry</button>
          </div>
        )}
      </div>
      {!tpl ? (
        <div className="field-hint ref-missing-note fabula-template-missing" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <span>This world has no {builtin ? builtin.name : title} template.</span>
          {!isLocked && builtin && onRestoreTemplate && (
            <button type="button" className="btn" style={{ padding: "2px 8px", fontSize: 12 }} onClick={() => onRestoreTemplate(builtin.name)}>Restore {builtin.name}</button>
          )}
        </div>
      ) : entries.length === 0 ? (
        <div className="fabula-template-empty" style={{ fontSize: 13, color: "var(--text-dim)", fontStyle: "italic" }}>{threads ? "No plot threads yet." : "No themes or motifs yet."}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 1, border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
          {entries.map(e => {
            const sts = stories.get(e.id) || [];
            return (
              <div
                key={e.id}
                className="stemma-index-row fabula-template-row"
                data-entry={e.id}
                role="button"
                tabIndex={0}
                title={threads ? "Open this thread" : "Open this theme"}
                onClick={() => onOpenEntry(e.id)}
                onKeyDown={ev => { if ((ev.key === "Enter" || ev.key === " ") && ev.target === ev.currentTarget) { ev.preventDefault(); onOpenEntry(e.id); } }}
                style={{ padding: "9px 12px 9px 16px", background: "var(--surf)", display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 12, rowGap: 2, cursor: "pointer" }}
              >
                <span className="fabula-template-title" style={{ flex: "1000 1 auto", minWidth: 0, fontSize: 14.5, fontWeight: 500, overflowWrap: "anywhere" }}>{e.name || "(unnamed)"}</span>
                <span style={tail}>
                  <span className="fabula-template-stories" style={{ flex: "1 1 auto", minWidth: 0, fontStyle: sts.length === 0 ? "italic" : undefined }}>{sts.length === 0 ? "no story uses it" : sts.map(st => st.name || "(untitled story)").join(", ")}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// An entry's page, for one of the two: the stories that use it (spec, 5.12),
// read-only and worked out each time the page is drawn. A story's title opens
// it on the tab that lists the entry, Plot for a thread and Meaning for a
// theme, marked as that tab marks it when the story's own list leaves the
// entry out; under it, its scenes by position, each opening its scene with
// its title on hover, then a thread's plot points and promises by name, each
// opening its page. In edit the list shows as it is, noted as set in Fabula.
function FabulaEntryStories({ state, entry, role, editing, onOpenEntry, onOpenStory }) {
  if (!entry) return null;
  const threads = role === "threads";
  const runs = fabulaEntryRuns(state, entry.id, role);
  const plain = { background: "none", border: "none", padding: 0, color: "var(--text)", font: "inherit", cursor: "pointer", textAlign: "left", textDecoration: "underline dotted", textDecorationColor: "var(--text-dim)", textUnderlineOffset: 3 };
  const link = (key, label, title, onClick, cls) => (
    <button key={key} type="button" className={cls} style={plain} title={title} onClick={onClick}>{label}</button>
  );
  const commas = (nodes) => nodes.map((n, i) => <span key={i}>{i > 0 ? ", " : ""}{n}</span>);
  return (
    <div className="fabula-entry-stories" style={{ marginTop: 26 }}>
      <div className="field-label">
        <span>Stories</span>
        {editing && <span style={{ textTransform: "none", letterSpacing: 0, fontSize: 12, color: "var(--text-dim)" }}>set in Fabula</span>}
      </div>
      {runs.length === 0 ? (
        <div className="fabula-entry-stories-none" style={{ fontSize: 13, color: "var(--text-dim)", fontStyle: "italic" }}>No story uses this {threads ? "thread" : "theme"} yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 1, border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
          {runs.map(u => {
            const lines = [];
            if (u.scenes.length > 0) lines.push(["Scenes", u.scenes.map(s => link(s.id, u.places.has(s.id) ? u.places.get(s.id).path : "?", s.name || "(untitled)", () => onOpenEntry(s.id), "fabula-entry-scene"))]);
            if (u.plotPoints.length > 0) lines.push(["Plot points", u.plotPoints.map(r => link(r.id, r.name || "(untitled)", "Open this plot point", () => onOpenEntry(r.id), "fabula-entry-point"))]);
            if (u.promises.length > 0) lines.push(["Promises", u.promises.map(r => link(r.id, r.name || "(untitled)", "Open this promise", () => onOpenEntry(r.id), "fabula-entry-promise"))]);
            return (
              <div key={u.story.id} className="fabula-entry-story" data-story={u.story.id} data-marked={u.own ? undefined : "true"} style={{ padding: "9px 14px 9px 16px", background: "var(--surf)", borderLeft: u.own ? "2px solid transparent" : "2px dashed var(--warn)" }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 10, rowGap: 2 }}>
                  <button type="button" className="fabula-entry-story-title" style={{ ...plain, fontSize: 14.5, fontWeight: 500, overflowWrap: "anywhere" }} title={threads ? "Open this story's Plot tab" : "Open this story's Meaning tab"} onClick={() => onOpenStory(u.story.id, threads ? "plot" : "meaning")}>{u.story.name || "(untitled story)"}</button>
                  {!u.own && <span className="fabula-entry-story-mark" style={{ fontSize: 12, color: "var(--warn)" }}>{threads ? "not in the Story's Threads" : "not in the Story's Themes"}</span>}
                </div>
                {lines.length === 0
                  ? <div className="fabula-entry-story-line" style={{ fontSize: 12.5, color: "var(--text-dim)", marginTop: 3 }}>{threads ? "no scenes, plot points, or promises yet" : "no scenes yet"}</div>
                  : lines.map(([label, items]) => (
                    <div key={label} className="fabula-entry-story-line" data-line={label} style={{ fontSize: 12.5, color: "var(--text-dim)", marginTop: 3, overflowWrap: "anywhere" }}>
                      <span>{label}: </span>{commas(items)}
                    </div>
                  ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}