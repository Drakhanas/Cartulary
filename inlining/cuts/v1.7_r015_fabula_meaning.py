"""v1.7 r015: Meaning, a story's themes and motifs, and where each one runs.

Drak's calls (2026-10-26), one per message, recorded in docs/fabula-spec.md
sections 4, 9, and 10 before this cut (1211af0): the Meaning tab's theme
list edits the Story's Themes in place, as Plot's thread list does, a picker
adding any Theme / Motif entry, x taking one off the story while the entry
stays in the world, and + New Theme making an entry by its title and adding
it, and a theme the story's scenes carry in their Motifs that the Story
doesn't list shows marked, with a button that adds it; a theme's row shows
the positions of the scenes that carry it, in the outline's order, each
opening its scene with its title on hover, and a click anywhere else on the
row opens the theme's entry; and the themes group under their entries'
Type, in the template's order, then any type of the writer's own, then
none, by name inside each, a story whose themes have no Type showing one
list with no headings. The defaults the plan named for the rest of the tab
are in section 4: the Premise panel's Theme Statement heads the tab,
read-only, when it holds text; inside a group the Story's own themes come
first and the marked after them; a theme no scene carries says so; + New
Theme works as + New Thread does; a world without the Theme / Motif
template says so and offers to restore it; a theme opens its entry, Back
returning to the tab; a scene's Motifs lists the story's own themes first,
under a heading of their own; Concordance draws a scene to its motifs; and
in Lock Mode nothing adds or comes off, and every theme and scene still
opens.

- 28_fabula: the Meaning tab (FabulaMeaningTab) and its helpers, at the
  file's tail under an eighth header; the Meaning tab is built; a scene's
  Motifs lists its story's themes first; Concordance draws a scene's
  motifs.
- 12_trunk: App hands the story page + New Theme (fabulaWithNewTheme),
  which makes the entry and adds it to the story in one change.

Declared scope: 12_trunk, 28_fabula. Declarations added:
fabulaStoryThemes, fabulaWithStoryThemes, fabulaThemeTemplateId,
fabulaWithNewTheme, fabulaThemeScenes, FABULA_THEME_TYPES,
fabulaThemeType, FabulaMeaningTab.

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given). Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r015_fabula_meaning.py
"""
from pathlib import Path

ROOT = next(p for p in Path(__file__).resolve().parents if (p / 'cartulary-src').is_dir())
MODULES = ROOT / "cartulary-src" / "modules"


def edit(path, pairs):
    text = path.read_text(encoding="utf-8")
    for pair in pairs:
        old, new = pair[0], pair[1]
        count = pair[2] if len(pair) > 2 else 1
        n = text.count(old)
        assert n == count, f"{path.name}: anchor occurs {n} times, not {count}:\n{old[:200]}"
        text = text.replace(old, new)
    path.write_text(text, encoding="utf-8")


def header(title):
    line = f"// ─── {title} "
    return line + "─" * (82 - len(line))


# ---------------------------------------------------------------- 12: + New Theme
edit(MODULES / "12_trunk.jsx", [
    (r"""                onCreateThread={(name) => { if (!isLocked) updateState(s => fabulaWithNewThread(s, rec.id, name)); }}""",
     r"""                onCreateThread={(name) => { if (!isLocked) updateState(s => fabulaWithNewThread(s, rec.id, name)); }}
                onCreateTheme={(name) => { if (!isLocked) updateState(s => fabulaWithNewTheme(s, rec.id, name)); }}"""),
])

# ---------------------------------------------------------------- 28: the Meaning tab
edit(MODULES / "28_fabula.jsx", [
    (r"""  // a scene to its POV, participants, setting, and threads, since r013 a
  // plot point to its scene and threads and a promise to its setup and payoff
  // scenes and its threads, and since r014 a research note to the entries it
  // applies to and the scenes it's used in. Concordance drops an edge whose
  // other end isn't drawn.""",
     r"""  // a scene to its POV, participants, setting, and threads, and since r015
  // its motifs, since r013 a plot point to its scene and threads and a
  // promise to its setup and payoff scenes and its threads, and since r014 a
  // research note to the entries it applies to and the scenes it's used in.
  // Concordance drops an edge whose other end isn't drawn."""),
    (r"""scene: ["pov", "participants", "setting", "threads"], plotPoint:""",
     r"""scene: ["pov", "participants", "setting", "threads", "motifs"], plotPoint:"""),
    (r"""    if (own.length > 0) fields = fields.map(fl => (fl.id === "threads" && fl.type === "entry-ref" ? { ...fl, firstIds: own, firstLabel: "This story's threads", restLabel: "Other threads" } : fl));""",
     r"""    if (own.length > 0) fields = fields.map(fl => (fl.id === "threads" && fl.type === "entry-ref" ? { ...fl, firstIds: own, firstLabel: "This story's threads", restLabel: "Other threads" } : fl));
    // v1.7 r015: a scene's Motifs lists the story's own themes first, the
    // same way.
    const themes = kind === "scene" ? fabulaStoryThemes(story) : [];
    if (themes.length > 0) fields = fields.map(fl => (fl.id === "motifs" && fl.type === "entry-ref" ? { ...fl, firstIds: themes, firstLabel: "This story's themes", restLabel: "Other themes" } : fl));"""),
    (r"""  { id: "meaning", label: "Meaning", built: false, holds: "the themes and motifs the Premise panel lists" },""",
     r"""  { id: "meaning", label: "Meaning", built: true, holds: "the themes and motifs the Premise panel lists" },"""),
    (r"""onUpdateFabula, onCreateThread, onRestoreTemplate, showSecrets,""",
     r"""onUpdateFabula, onCreateThread, onCreateTheme, onRestoreTemplate, showSecrets,"""),
    (r"""  // own content, People's lists (v1.7 r009), the Outline (r011), Plot
  // (r013), or Notes (r014).""",
     r"""  // own content, People's lists (v1.7 r009), the Outline (r011), Plot
  // (r013), Notes (r014), or Meaning (r015)."""),
    (r"""  if (!draft && active === "notes") {""",
     r"""  if (!draft && active === "meaning") {
    return tabPage(<FabulaMeaningTab state={state} story={story} isLocked={isLocked} showSecrets={showSecrets} onOpenEntry={onOpenEntry} onUpdateFabula={onUpdateFabula} onCreateTheme={onCreateTheme} onRestoreTemplate={isLocked ? undefined : onRestoreTemplate} />);
  }
  if (!draft && active === "notes") {"""),
])

TAIL = r'''

''' + header("Fabula: Meaning (v1.7 r015)") + r'''
// The Meaning tab (docs/fabula-spec.md, section 4, Drak's calls of
// 2026-10-26): the story's themes and motifs, the entries its Themes lists.
// The list edits the Story's Themes in place, as Plot's thread list does: a
// picker adds any Theme / Motif entry, × takes one off the story while the
// entry stays in the world, and + New Theme makes an entry by its title and
// adds it; a theme the story's scenes carry in their Motifs that the Story
// doesn't list shows marked, with a button that adds it. A theme's row shows
// the positions of the scenes that carry it, in the outline's order, each
// opening its scene, and the themes group under their entries' Type. The
// Premise panel's Theme Statement heads the tab, read-only.

// The Story's Themes, and Fabula with them changed.
const fabulaStoryThemes = (story) => (story && story.fields && Array.isArray(story.fields.themes) ? story.fields.themes : []).filter(id => typeof id === "string" && id);

const fabulaWithStoryThemes = (fab, storyId, fn) => ({
  ...fab,
  stories: fabulaArr(fab, "stories").map(st => (st && st.id === storyId ? { ...st, fields: { ...(st.fields || {}), themes: fn(fabulaStoryThemes(st)) }, updatedAt: isoNow() } : st)),
});

// The template a new theme takes: the first of the Story's Themes targets
// the world has, or null.
const fabulaThemeTemplateId = (state) => {
  const field = (fabulaTemplate(state, "story").fields || []).find(f => f.id === "themes");
  const ids = field && Array.isArray(field.refTemplatesId) ? field.refTemplatesId : [];
  return ids.find(id => (state.templates || []).some(t => t && t.id === id)) || null;
};

// The state with a Theme / Motif entry made by its title and added to the
// story's Themes, in one change (+ New Theme).
const fabulaWithNewTheme = (state, storyId, name) => {
  const title = (name || "").trim();
  const tplId = fabulaThemeTemplateId(state);
  if (!title || !tplId || !fabulaStoryOf(state.fabula || {}, storyId)) return state;
  const now = isoNow();
  const entry = { id: `ent-${slugify(title) || "theme"}-${genId().slice(-4)}`, templateId: tplId, name: title, calendarId: null, fields: {}, tags: [], createdAt: now, updatedAt: now };
  return { ...state, entries: [...(state.entries || []), entry], fabula: fabulaWithStoryThemes(state.fabula || {}, storyId, ids => [...ids, entry.id]) };
};

// The scenes that carry each theme in their Motifs: theme id to scene ids,
// in the outline's order.
const fabulaThemeScenes = (state, storyId) => {
  const places = fabulaOutlinePlaces(state, storyId);
  const at = (id) => (places.has(id) ? places.get(id).index : Number.MAX_SAFE_INTEGER);
  const out = new Map();
  fabulaArr((state && state.fabula) || {}, "scenes").filter(s => s && s.id && s.storyId === storyId).forEach(s => {
    new Set((Array.isArray((s.fields || {}).motifs) ? s.fields.motifs : []).filter(x => typeof x === "string" && x)).forEach(t => {
      if (!out.has(t)) out.set(t, []);
      out.get(t).push(s.id);
    });
  });
  out.forEach(ids => ids.sort((a, b) => at(a) - at(b)));
  return out;
};

// The Theme / Motif template's types, in its order, and their headings.
const FABULA_THEME_TYPES = [["Theme", "Themes"], ["Motif", "Motifs"], ["Symbol", "Symbols"], ["Leitmotif", "Leitmotifs"], ["Archetype", "Archetypes"]];

// An entry's Type, as its template's Type field holds it: the option, or
// what was typed through Other, or "" for none.
const fabulaThemeType = (state, entry) => {
  const tpl = entry ? (state.templates || []).find(t => t && t.id === entry.templateId) : null;
  const field = tpl ? (tpl.fields || []).find(f => f && f.label === "Type" && f.type === "select") : null;
  return field ? formatSelectDisplay((entry.fields || {})[field.id]).trim() : "";
};

// The Meaning tab.
function FabulaMeaningTab({ state, story, isLocked, showSecrets, onOpenEntry, onUpdateFabula, onCreateTheme, onRestoreTemplate }) {
  const [adding, setAdding] = useState(false);
  const [addText, setAddText] = useState("");
  const skipBlurRef = useRef(false);
  const write = (fn) => { if (!isLocked) onUpdateFabula(fn); };
  const entryById = new Map((state.entries || []).filter(e => e && e.id).map(e => [e.id, e]));
  const sceneById = new Map(fabulaArr(state.fabula || {}, "scenes").filter(s => s && s.id).map(s => [s.id, s]));
  const places = fabulaOutlinePlaces(state, story.id);
  const carried = fabulaThemeScenes(state, story.id);
  const own = fabulaStoryThemes(story);
  const ownSet = new Set(own);
  const byName = (a, b) => ((entryById.get(a) || {}).name || "").localeCompare((entryById.get(b) || {}).name || "", undefined, { sensitivity: "base" });
  const marked = [...carried.keys()].filter(id => !ownSet.has(id) && entryById.has(id));
  const storyFields = fabulaTemplate(state, "story").fields || [];
  const themeField = storyFields.find(f => f.id === "themes");
  const themeTpls = new Set(themeField && Array.isArray(themeField.refTemplatesId) ? themeField.refTemplatesId : []);
  const missing = themeField && Array.isArray(themeField.refMissing) && themeField.refMissing.length > 0 ? themeField : null;
  const pickable = (state.entries || []).filter(e => e && themeTpls.has(e.templateId) && !ownSet.has(e.id))
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }));
  const setThemes = (fn) => write(f => fabulaWithStoryThemes(f, story.id, fn));
  const onControl = (e) => !!(e.target && e.target.closest && e.target.closest("button, input, textarea, select"));
  const plain = { background: "none", border: "none", padding: 0, color: "inherit", font: "inherit", cursor: "pointer" };
  // The Theme Statement, when it holds text and isn't a secret kept hidden.
  const stmtField = storyFields.find(f => f.id === "themeStatement");
  const stmt = stmtField && !(stmtField.secret && !showSecrets) ? (story.fields || {}).themeStatement : "";
  const stmtText = typeof stmt === "string" ? stmt.trim() : "";

  // The groups: by Type, the template's five first in its order, then any
  // type of the writer's own by name, then none; inside each the Story's own
  // themes first and the marked after them, each by name.
  const groups = new Map();
  const place = (id, isMarked) => {
    const type = fabulaThemeType(state, entryById.get(id));
    const known = FABULA_THEME_TYPES.findIndex(([t]) => t.toLowerCase() === type.toLowerCase());
    const key = known >= 0 ? FABULA_THEME_TYPES[known][0] : type;
    if (!groups.has(key)) groups.set(key, { key, label: known >= 0 ? FABULA_THEME_TYPES[known][1] : (type || "No type"), rank: known >= 0 ? known : type ? 100 : 200, own: [], marked: [] });
    groups.get(key)[isMarked ? "marked" : "own"].push(id);
  };
  own.forEach(id => place(id, false));
  marked.forEach(id => place(id, true));
  const ordered = [...groups.values()].sort((a, b) => (a.rank - b.rank) || a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  ordered.forEach(g => { g.own.sort(byName); g.marked.sort(byName); });
  const headed = ordered.some(g => g.key !== "");

  // ---- adding a theme in place
  const stopAdd = () => { setAdding(false); setAddText(""); };
  const commitAdd = (byEnter) => {
    const text = addText.trim();
    if (isLocked) { stopAdd(); return; }
    if (text) onCreateTheme(text);
    if (byEnter) setAddText(""); else stopAdd();
  };

  // A row's details sit at its right while they fit beside its title, and
  // drop under it, flush left, when they don't, as the Plot tab's rows do; a
  // scene's position is underlined, dotted, since a click on it opens it.
  const lead = (last) => ({ flex: last ? "1000 1 auto" : "0 1 auto", minWidth: 0 });
  const tail = { flex: "1 1 auto", minWidth: 0, fontSize: 12, color: "var(--text-dim)", display: "inline-flex", alignItems: "baseline", gap: 10, justifyContent: "flex-end", flexWrap: "nowrap", textAlign: "left" };
  const row = (id, isMarked) => {
    const e = entryById.get(id);
    const scenes = (carried.get(id) || []).filter(sid => sceneById.has(sid));
    return (
      <div
        key={id}
        className="stemma-index-row fabula-meaning-row"
        data-theme={id}
        data-marked={isMarked ? "true" : undefined}
        role="button"
        tabIndex={0}
        title="Open this theme"
        onClick={ev => { if (!onControl(ev)) onOpenEntry(id); }}
        onKeyDown={ev => { if ((ev.key === "Enter" || ev.key === " ") && ev.target === ev.currentTarget) { ev.preventDefault(); onOpenEntry(id); } }}
        style={{ padding: "9px 12px 9px 16px", background: "var(--surf)", display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 12, rowGap: 2, cursor: "pointer", borderLeft: isMarked ? "2px dashed var(--warn)" : "2px solid transparent" }}
      >
        <span className="fabula-meaning-title" style={{ ...lead(!isMarked), fontSize: 14.5, fontWeight: 500, overflowWrap: "anywhere" }}>{e ? (e.name || "(unnamed)") : "(missing entry)"}</span>
        {isMarked && <span className="fabula-meaning-mark" style={{ ...lead(true), fontSize: 12, color: "var(--warn)" }}>not in the Story's Themes</span>}
        <span style={tail}>
          <span className="fabula-meaning-scenes" style={{ flex: "1 1 auto", minWidth: 0, overflowWrap: "anywhere" }}>
            {scenes.length === 0 ? "no scenes yet" : scenes.map((sid, i) => (
              <span key={sid}>{i > 0 ? ", " : ""}<button type="button" className="fabula-meaning-scene" style={{ ...plain, color: "var(--text)", textDecoration: "underline dotted", textDecorationColor: "var(--text-dim)", textUnderlineOffset: 3 }} title={sceneById.get(sid).name || "(untitled)"} onClick={() => onOpenEntry(sid)}>{places.has(sid) ? places.get(sid).path : "?"}</button></span>
            ))}
          </span>
          {!isLocked && (isMarked
            ? <button className="btn btn-ghost" style={{ padding: "1px 8px", fontSize: 11 }} onClick={() => setThemes(ids => (ids.includes(id) ? ids : [...ids, id]))} title="Add this theme to the Story's Themes">Add to the story</button>
            : <button className="btn btn-ghost" style={{ padding: "1px 6px", fontSize: 11, minWidth: 24 }} onClick={() => setThemes(ids => ids.filter(x => x !== id))} aria-label="Take this theme off the story" title="Take this theme off the story">{"\u00d7"}</button>)}
        </span>
      </div>
    );
  };
  const heading = (g) => (
    <div key={`h:${g.key}`} className="fabula-meaning-heading" data-type={g.key} style={{ padding: "8px 12px 6px", background: "var(--bg)", fontSize: 11.5, letterSpacing: ".1em", textTransform: "uppercase", color: g.key ? "var(--text)" : "var(--text-dim)" }}>{g.label}</div>
  );
  const addRow = (
    <div className="fabula-meaning-adding" style={{ padding: "5px 12px 5px 16px", background: "var(--surf)", display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 10, rowGap: 2 }}>
      <input
        className="input"
        autoFocus
        aria-label="The new theme's title"
        placeholder="The new theme's title"
        value={addText}
        onChange={e => setAddText(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") { e.preventDefault(); commitAdd(true); }
          else if (e.key === "Escape") { e.preventDefault(); skipBlurRef.current = true; stopAdd(); }
        }}
        onBlur={() => { if (skipBlurRef.current) { skipBlurRef.current = false; return; } commitAdd(false); }}
        style={{ flex: "1 1 220px", minWidth: 0, padding: "3px 8px", fontSize: 13 }}
      />
      <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Enter adds it; Esc stops</span>
    </div>
  );
  const empty = own.length === 0 && marked.length === 0 && !adding;
  return (
    <div className="fabula-meaning">
      {stmtText && (
        <div className="fabula-meaning-statement" style={{ marginBottom: 26 }}>
          <div className="field-label"><span>{stmtField.label || "Theme Statement"}</span></div>
          <MarkdownDisplay markdown={stmtText} entries={state.entries} templates={state.templates} bodies={state.celestialBodies} onOpenEntry={onOpenEntry} />
        </div>
      )}
      <div className="fabula-meaning-section" style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
          <div className="field-label"><span>{"Themes & Motifs"}</span></div>
          {!isLocked && !missing && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "baseline" }}>
              <select className="input fabula-meaning-pick" value="" disabled={pickable.length === 0} title={pickable.length === 0 ? "Every theme the world has is on the story" : undefined} onChange={e => { const id = e.target.value; if (id) setThemes(ids => (ids.includes(id) ? ids : [...ids, id])); }} style={{ padding: "3px 28px 3px 8px", fontSize: 12, width: "auto", maxWidth: 240 }} aria-label="Add a theme to the story">
                <option value="">+ Add a theme...</option>
                {pickable.map(e => <option key={e.id} value={e.id}>{e.name || "(unnamed)"}</option>)}
              </select>
              <button className="btn" style={{ padding: "3px 10px", fontSize: 12 }} onClick={() => { skipBlurRef.current = false; setAdding(true); setAddText(""); }}>+ New Theme</button>
            </div>
          )}
        </div>
        {missing && !isLocked && (
          <div className="field-hint ref-missing-note" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span>This world has no {missing.refMissing[0]} template, so no theme can be added.</span>
            {onRestoreTemplate && (missing.refRestorable || []).map(name => (
              <button key={name} type="button" className="btn" style={{ padding: "2px 8px", fontSize: 12 }} onClick={() => onRestoreTemplate(name)}>Restore {name}</button>
            ))}
          </div>
        )}
        {empty ? <div style={{ fontSize: 13, color: "var(--text-dim)", fontStyle: "italic" }}>No themes yet.</div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 1, border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
            {ordered.map(g => (
              <React.Fragment key={g.key}>
                {headed && heading(g)}
                {g.own.map(id => row(id, false))}
                {g.marked.map(id => row(id, true))}
              </React.Fragment>
            ))}
            {adding && addRow}
          </div>
        )}
      </div>
    </div>
  );
}'''

p28 = MODULES / "28_fabula.jsx"
t28 = p28.read_text(encoding="utf-8")
end = "          </div>\n        ))}\n      </div>\n    </div>\n  );\n}"
assert not t28.endswith("\n") and t28.endswith(end), "28_fabula.jsx no longer ends the way this cut expects"
p28.write_text(t28 + TAIL, encoding="utf-8")
print("v1.7 r015 applied: 12_trunk, 28_fabula")
