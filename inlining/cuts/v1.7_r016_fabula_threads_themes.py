"""v1.7 r016: Plot Thread and Theme / Motif under Fabula.

Drak's calls (2026-10-26), one per message, recorded in docs/fabula-spec.md
sections 4 and 5.12 before this cut (5387bf6). Fabula's index lists the two
templates' entries in two sections after the stories, Plot Threads and Themes
& Motifs, each row naming the stories that use it, each section with + New
Entry and Edit Template. Promoting a template into a view takes it out of the
built-in template list (Drak's procedure); Map and Astronomical Body left
BUILTIN_TEMPLATES because their entries became records, and these two stay
entries, so they stay in BUILTIN_TEMPLATES, which seeds, upgrades, restores,
and resets them, and a flag on each world's copy, fabulaRole ("threads" or
"themes"), takes them out of the sidebar's Templates list and Restore
Built-ins. Drak's terms: out of the sidebar's list, usable in Fabula, every
entry with them, and every world there at go-live. An entry of theirs keeps
the ordinary entry page, with Fabula lit in the sidebar, and every exit that
landed on the template's list page lands on its section instead; and each
entry's page lists the stories that use it, with their scenes and, for a
thread, its plot points and promises. Claude's defaults for the rest, named
before the cut, are in section 4 and 5.12: the flagging rules on load, Fabula
finding the two by the flag, the sections' rows, Export, Restore, and Lock
Mode, the home page's rows, the sidebar's light, packs, imports, and Back from
a story or a record opened from an entry's list.

- 01_builtin-templates: Plot Thread and Theme / Motif carry fabulaRole, and
  makeTemplateFromBuiltin copies it, so a new world's copies and a restored
  or reset one have it.
- 10_migrate: migrate() flags the two (fabulaFlagTemplates) before Fabula's
  slice, every load, and the load's merge of same-named templates keeps the
  one Fabula holds, so its entries and the others' stay in Fabula.
- 12_trunk: the sidebar's Templates list, Restore Built-ins, and a pack's add
  list leave them out; Reset to Default and Restore find them by the flag;
  the template file never carries it, and an import never brings it; a page
  of theirs lights Fabula; whatever lands on one's list page lands on its
  section of Fabula's index, deleting the template included; the index gets
  its sections' handlers; and an entry's page draws its stories, from whose
  stories and records Back returns to the entry.
- 28_fabula: a reference naming either finds it by the flag; + New Thread and
  + New Theme take the flagged template; the index ends with the sections;
  and the helpers and components at the file's tail under a ninth header.

Declared scope: 01_builtin-templates, 10_migrate, 12_trunk, 28_fabula.
Declarations added: fabulaRoleTemplate, fabulaRoleBuiltin, fabulaRoleOfName,
fabulaFlagTemplates, fabulaIndexStories, fabulaRoleStories, fabulaEntryRuns,
FabulaTemplateSections, FabulaTemplateSection, FabulaEntryStories.

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given). Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r016_fabula_threads_themes.py
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


# ---------------------------------------------------------------- 01: the flag
edit(MODULES / "01_builtin-templates.jsx", [
    (r"""  { name: "Plot Thread", icon: "◑", color: "#c86ea8",""",
     r"""  { name: "Plot Thread", icon: "◑", color: "#c86ea8", fabulaRole: "threads","""),
    (r"""  { name: "Theme / Motif", icon: "◐", color: "#b0a8c8",""",
     r"""  { name: "Theme / Motif", icon: "◐", color: "#b0a8c8", fabulaRole: "themes","""),
    (r"""  origin: TEMPLATE_ORIGIN.BUILTIN,
  fields: bt.fields.map(f => ({""",
     r"""  origin: TEMPLATE_ORIGIN.BUILTIN,
  // v1.7 r016: Plot Thread and Theme / Motif belong to Fabula, which finds
  // them by this flag (docs/fabula-spec.md, section 4).
  ...(bt.fabulaRole ? { fabulaRole: bt.fabulaRole } : {}),
  fields: bt.fields.map(f => ({"""),
])

# ---------------------------------------------------------------- 10: flagging on load
edit(MODULES / "10_migrate.jsx", [
    (r"""      counts.forEach((c, i) => { if (c > bestCount) { bestCount = c; keepIdx = i; } });
      const keeper = dupes[keepIdx];""",
     r"""      counts.forEach((c, i) => { if (c > bestCount) { bestCount = c; keepIdx = i; } });
      // v1.7 r016: a template Fabula holds (fabulaRole) is the keeper, so its
      // place in Fabula and its id survive, and the others' entries join it.
      const held = dupes.findIndex(t => t && t.fabulaRole);
      if (held >= 0) keepIdx = held;
      const keeper = dupes[keepIdx];"""),
    (r"""  // v1.7 r006: Fabula's slice and its seeded schemas (docs/fabula-spec.md,
  // section 3). Last, so the templates the schemas point at are final.
  ensureFabulaSlice(state);""",
     r"""  // v1.7 r016: Plot Thread and Theme / Motif belong to Fabula, each world's
  // copy flagged by fabulaRole (docs/fabula-spec.md, section 4). A world with
  // no template flagged for one flags one (fabulaFlagTemplates), every load,
  // since a load that finds them flagged changes nothing.
  fabulaFlagTemplates(state);

  // v1.7 r006: Fabula's slice and its seeded schemas (docs/fabula-spec.md,
  // section 3). Last, so the templates the schemas point at are final.
  ensureFabulaSlice(state);"""),
])

# ---------------------------------------------------------------- 12: the app
edit(MODULES / "12_trunk.jsx", [
    # the section to scroll to
    (r"""  const [fabulaBack, setFabulaBack] = useState([]);
""",
     r"""  const [fabulaBack, setFabulaBack] = useState([]);
  // v1.7 r016: the section of Fabula's index to scroll to, Plot Threads or
  // Themes & Motifs, set where a page of theirs lands there.
  const [fabulaFocus, setFabulaFocus] = useState(null);
"""),
    # Restore Built-ins leaves them out
    (r"""    return BUILTIN_TEMPLATES
      .map(b => b.name)
      .filter(name => !presentBuiltinNames.has(name));""",
     r"""    // v1.7 r016: Plot Thread and Theme / Motif aren't offered here; Fabula's
    // index restores them.
    return BUILTIN_TEMPLATES
      .filter(b => !b.fabulaRole)
      .map(b => b.name)
      .filter(name => !presentBuiltinNames.has(name));"""),
    # whatever lands on one's list page lands on its section
    (r"""  }, [state, activeTagFilter, activeTemplateId, search, sortBy, variantAxisInfo]);

  if (loaded && loadError) {""",
     r"""  }, [state, activeTagFilter, activeTemplateId, search, sortBy, variantAxisInfo]);

  // v1.7 r016: Plot Thread and Theme / Motif live under Fabula, so whatever
  // would land on one's list page (Back with nothing behind it, Delete, a new
  // entry's Cancel, the builder's Save and Cancel, the home page's row) lands
  // on its section of Fabula's index instead (docs/fabula-spec.md, section
  // 4). Before the paint, so the list page never shows.
  React.useLayoutEffect(() => {
    if (view !== "list" || activeTagFilter || !state) return;
    const t = (state.templates || []).find(x => x && x.id === activeTemplateId);
    if (!t || !t.fabulaRole) return;
    setActiveTemplateId(null); setActiveEntryId(null);
    setActiveCorpusId(null); setActiveStoryId(null); setActiveRecord(null); setFabulaBack([]);
    setFabulaFocus(t.fabulaRole); setView("fabula");
  }, [view, activeTemplateId, activeTagFilter, state]);

  if (loaded && loadError) {"""),
    # a page of theirs lights Fabula
    (r"""  const activeEntry = state.entries.find(e => e.id === activeEntryId);
""",
     r"""  const activeEntry = state.entries.find(e => e.id === activeEntryId);
  // v1.7 r016: on an entry page, a new entry, or the builder of Plot Thread
  // or Theme / Motif, the sidebar lights Fabula, which holds them.
  const pageTemplate = (view === "entry" || view === "entry-edit")
    ? (activeEntry ? state.templates.find(t => t.id === activeEntry.templateId) : null)
    : (view === "entry-new" || view === "tpl-edit") ? activeTemplate : null;
  const sidebarView = pageTemplate && pageTemplate.fabulaRole ? "fabula" : view;
"""),
    # a record opened from an entry's page goes back to the entry
    (r"""    // research note. From a Fabula page, Back returns to the page the click
    // came from; from anywhere else, such as Concordance, to the story's tab
    // that lists it (fabulaTabOf).""",
     r"""    // research note. From a Fabula page, Back returns to the page the click
    // came from, and since r016 from an entry's page to the entry; from
    // anywhere else, such as Concordance, to the story's tab that lists it
    // (fabulaTabOf)."""),
    (r"""      setFabulaBack(b => from ? [...b, from] : [{ kind: "story", tab: fabulaTabOf(fabRec.kind) }]);""",
     r"""      const fromEntry = (view === "entry" || view === "entry-edit") && activeEntryId ? { kind: "entry", id: activeEntryId } : null;
      setFabulaBack(b => from ? [...b, from] : [fromEntry || { kind: "story", tab: fabulaTabOf(fabRec.kind) }]);"""),
    # a story opened from an entry's page goes back to the entry; the handlers
    (r"""  const closeStory = () => {
    if (!confirmDiscardDraft()) return;
    setStoryDraft(null); initialStoryDraftRef.current = null;
    setActiveRecord(null); setFabulaBack([]);
    setActiveStoryId(null);
  };
""",
     r"""  // v1.7 r016: back from Fabula to the entry's page a story or a record was
  // opened from, or Fabula's index when the entry is gone.
  const returnToEntry = (id) => {
    const ent = state.entries.find(e => e && e.id === id);
    setActiveRecord(null); setActiveStoryId(null); setActiveCorpusId(null); setFabulaBack([]);
    if (!ent) { setView("fabula"); return; }
    setActiveTemplateId(ent.templateId); setActiveTagFilter(null); setActiveEntryId(id); setView("entry");
  };

  const closeStory = () => {
    if (!confirmDiscardDraft()) return;
    setStoryDraft(null); initialStoryDraftRef.current = null;
    // v1.7 r016: a story opened from an entry's page goes back to the entry.
    const frame = fabulaBack[fabulaBack.length - 1];
    if (frame && frame.kind === "entry") { returnToEntry(frame.id); return; }
    setActiveRecord(null); setFabulaBack([]);
    setActiveStoryId(null);
  };

  // v1.7 r016: a story opened from an entry's list of the stories that use
  // it opens on the tab that lists the entry, Plot or Meaning, and Back
  // returns to the entry (docs/fabula-spec.md, 5.12).
  const openStoryFromEntry = (storyId, tab) => {
    if (!confirmDiscardDraft()) return;
    const fab = state.fabula || {};
    if (!fabArr(fab, "stories").some(st => st && st.id === storyId)) return;
    const home = fabArr(fab, "corpora").find(c => c && Array.isArray(c.storyIds) && c.storyIds.includes(storyId));
    const from = (view === "entry" || view === "entry-edit") && activeEntryId ? [{ kind: "entry", id: activeEntryId }] : [];
    clearDraftAndStorage();
    setActiveTagFilter(null);
    setCorpusDraft(null); initialCorpusDraftRef.current = null;
    setStoryDraft(null); initialStoryDraftRef.current = null;
    setRecordDraft(null); initialRecordDraftRef.current = null;
    setActiveCorpusId(home ? home.id : null);
    setActiveStoryId(storyId);
    setStoryTab(tab || "story"); setActiveRecord(null); setFabulaBack(from);
    setView("fabula");
  };

  // v1.7 r016: Fabula's index, scrolled to Plot Threads or Themes & Motifs.
  const landOnFabulaSection = (role) => {
    setActiveTemplateId(null); setActiveTagFilter(null); setActiveEntryId(null);
    setActiveCorpusId(null); setActiveStoryId(null); setActiveRecord(null); setFabulaBack([]);
    setFabulaFocus(role); setView("fabula");
  };

  // v1.7 r016: the index sections' Edit Template and + New Entry. A new
  // entry's Back returns to the index.
  const editFabulaTemplate = (tpl) => {
    if (isLocked || !tpl) return;
    if (!confirmDiscardDraft()) return;
    const draft = JSON.parse(JSON.stringify(tpl));
    setActiveTemplateId(tpl.id); setActiveTagFilter(null); setActiveEntryId(null);
    setTplDraft(draft);
    initialTplDraftRef.current = JSON.stringify(draft);
    initialEntryDraftRef.current = null;
    setView("tpl-edit");
  };

  const newFabulaEntry = (tpl) => {
    if (isLocked || !tpl) return;
    setEntryNavStack([{ view: "fabula", entryId: null }]);
    openNewEntry(tpl);
  };
"""),
    (r"""  const popFabulaBack = () => {
    const frame = fabulaBack[fabulaBack.length - 1];
    setFabulaBack(b => b.slice(0, -1));
""",
     r"""  const popFabulaBack = () => {
    const frame = fabulaBack[fabulaBack.length - 1];
    setFabulaBack(b => b.slice(0, -1));
    if (frame && frame.kind === "entry") { returnToEntry(frame.id); return; }
"""),
    # deleting either lands on its section
    (r"""  const deleteTemplate = () => {
    if (!activeTemplate) return;
""",
     r"""  const deleteTemplate = () => {
    if (!activeTemplate) return;
    const fabRole = activeTemplate.fabulaRole || null;
"""),
    (r"""    setActiveTemplateId(null); clearDraftAndStorage(); setView("home");
    flash("Template deleted");""",
     r"""    setActiveTemplateId(null); clearDraftAndStorage();
    // v1.7 r016: Plot Thread or Theme / Motif deleted lands on its section of
    // Fabula's index, which then offers Restore.
    if (fabRole) landOnFabulaSection(fabRole); else setView("home");
    flash("Template deleted");"""),
    # Reset to Default and Restore find them by the flag
    (r"""    if (userTpl.origin !== TEMPLATE_ORIGIN.BUILTIN) return null;
    const builtin = BUILTIN_TEMPLATES.find(b => b.name === userTpl.name);""",
     r"""    if (userTpl.origin !== TEMPLATE_ORIGIN.BUILTIN) return null;
    // v1.7 r016: Plot Thread and Theme / Motif by their flag, renamed or not.
    const builtin = (userTpl.fabulaRole && fabulaRoleBuiltin(userTpl.fabulaRole)) || BUILTIN_TEMPLATES.find(b => b.name === userTpl.name);"""),
    (r"""      if (userTpl.origin !== TEMPLATE_ORIGIN.BUILTIN) return s;
      const builtin = BUILTIN_TEMPLATES.find(b => b.name === userTpl.name);""",
     r"""      if (userTpl.origin !== TEMPLATE_ORIGIN.BUILTIN) return s;
      // v1.7 r016: Plot Thread and Theme / Motif by their flag, renamed or not.
      const builtin = (userTpl.fabulaRole && fabulaRoleBuiltin(userTpl.fabulaRole)) || BUILTIN_TEMPLATES.find(b => b.name === userTpl.name);"""),
    (r"""        const builtinIdx = BUILTIN_TEMPLATES.findIndex(b => b.name === name);
        if (builtinIdx === -1) return;
""",
     r"""        const builtinIdx = BUILTIN_TEMPLATES.findIndex(b => b.name === name);
        if (builtinIdx === -1) return;
        // v1.7 r016: Plot Thread or Theme / Motif comes back only when no
        // template holds its place in Fabula, a renamed one included.
        const role = BUILTIN_TEMPLATES[builtinIdx].fabulaRole;
        if (role && newTemplates.some(t => t && t.fabulaRole === role)) { seeded.delete(name); return; }
"""),
    # the template file never carries the flag; an import never brings it
    (r"""    const { id, ...rest } = template;""",
     r"""    // v1.7 r016: the file never carries Fabula's flag.
    const { id, fabulaRole, ...rest } = template;"""),
    (r"""    ensureIds(newTpl.fields);
    if (mode === "replace" && existingId) {
      newTpl.id = existingId;
""",
     r"""    // v1.7 r016: an import never brings Fabula's flag, and one imported over
    // Plot Thread or Theme / Motif keeps the flag that template had.
    delete newTpl.fabulaRole;
    ensureIds(newTpl.fields);
    if (mode === "replace" && existingId) {
      newTpl.id = existingId;
      const was = state.templates.find(t => t.id === existingId);
      if (was && was.fabulaRole) newTpl.fabulaRole = was.fabulaRole;
"""),
    # the sidebar
    (r"""        activeView={view}""",
     r"""        activeView={sidebarView}"""),
    (r"""  const displayedTemplates = state.templates
    .map((t, originalIdx) => ({ t, originalIdx }))
    .filter(({ t }) => t.kind !== "map" && (t.origin === "builtin" || !packedTemplateIds.has(t.id)));""",
     r"""  // v1.7 r016: Plot Thread and Theme / Motif leave it too; they live under
  // Fabula (fabulaRole).
  const displayedTemplates = state.templates
    .map((t, originalIdx) => ({ t, originalIdx }))
    .filter(({ t }) => t.kind !== "map" && !t.fabulaRole && (t.origin === "builtin" || !packedTemplateIds.has(t.id)));"""),
    (r"""  // Eligible to add: user (non-builtin) templates, not map-kind (those live in
  // Cartographia), not already in this pack.
  const addable = (templates || []).filter(t =>
    t.origin !== "builtin" && t.kind !== "map" && !(pack.templateIds || []).includes(t.id));""",
     r"""  // Eligible to add: user (non-builtin) templates, not map-kind (those live in
  // Cartographia), not Fabula's (fabulaRole, v1.7 r016), not already in this
  // pack.
  const addable = (templates || []).filter(t =>
    t.origin !== "builtin" && t.kind !== "map" && !t.fabulaRole && !(pack.templateIds || []).includes(t.id));"""),
    # the index's sections
    (r"""              onSetStoryCorpus={setStoryCorpus}
              onOpenStory={openStory}
            />""",
     r"""              onSetStoryCorpus={setStoryCorpus}
              onOpenStory={openStory}
              sections={{
                focus: fabulaFocus,
                onFocused: () => setFabulaFocus(null),
                onOpenEntry: openEntryFromAnywhere,
                onNewEntry: newFabulaEntry,
                onEditTemplate: editFabulaTemplate,
                onExportTemplate: (tpl, fmt) => (fmt === "md" ? exportTemplateMarkdown(tpl) : exportTemplateJson(tpl)),
                onRestoreTemplate: (name) => restoreBuiltinTemplates([name]),
              }}
            />"""),
    # an entry's page draws its stories
    (r"""              onExportEntry={exportEntryMarkdown}
              state={state}
              onUpdateViewPrefs={updateViewPrefs}
            />""",
     r"""              onExportEntry={exportEntryMarkdown}
              state={state}
              onUpdateViewPrefs={updateViewPrefs}
              footSlot={pageTemplate && pageTemplate.fabulaRole ? <FabulaEntryStories state={state} entry={activeEntry} role={pageTemplate.fabulaRole} onOpenEntry={openEntryFromAnywhere} onOpenStory={openStoryFromEntry} /> : undefined}
            />"""),
    (r"""                selfEntryId={activeEntryId}
                flash={flash}
              />
            );
          })()}
          {(view === "tpl-build" || view === "tpl-edit") && tplDraft && (""",
     r"""                selfEntryId={activeEntryId}
                flash={flash}
                footSlot={view === "entry-edit" && activeEntry && editorTpl.fabulaRole ? <FabulaEntryStories state={state} entry={activeEntry} role={editorTpl.fabulaRole} editing onOpenEntry={openEntryFromAnywhere} onOpenStory={openStoryFromEntry} /> : undefined}
              />
            );
          })()}
          {(view === "tpl-build" || view === "tpl-edit") && tplDraft && ("""),
])

# ---------------------------------------------------------------- 28: Fabula
edit(MODULES / "28_fabula.jsx", [
    (r"""// (fabulaStoryNodes), where other pickers sort by name.
const fabulaLiveFields = (fields, templates) => {""",
     r"""// (fabulaStoryNodes), where other pickers sort by name. Since r016 a name of
// Plot Thread's or Theme / Motif's finds the template flagged for it, and
// finds by name only where no template carries the flag.
const fabulaLiveFields = (fields, templates) => {"""),
    (r"""      const named = fl.refTemplates.map(n => byName[n]).filter(Boolean);""",
     r"""      const named = fl.refTemplates.map(n => { const role = fabulaRoleOfName(n); const own = role ? fabulaRoleTemplate(templates, role) : null; return own ? own.id : byName[n]; }).filter(Boolean);"""),
    (r"""// The template a new thread takes: the first of the Story's Threads targets
// the world has, or null.
const fabulaThreadTemplateId = (state) => {
""",
     r"""// The template a new thread takes: the one flagged for threads (v1.7 r016),
// else the first of the Story's Threads targets the world has, or null.
const fabulaThreadTemplateId = (state) => {
  const own = fabulaRoleTemplate(state.templates, "threads");
  if (own) return own.id;
"""),
    (r"""// The template a new theme takes: the first of the Story's Themes targets
// the world has, or null.
const fabulaThemeTemplateId = (state) => {
""",
     r"""// The template a new theme takes: the one flagged for themes (v1.7 r016),
// else the first of the Story's Themes targets the world has, or null.
const fabulaThemeTemplateId = (state) => {
  const own = fabulaRoleTemplate(state.templates, "themes");
  if (own) return own.id;
"""),
    (r"""function FabulaIndexView({ state, isLocked, onOpenCorpus, onCreateCorpus, onCreateStory, onRenameStory, onDeleteStory, onSetStoryCorpus, onOpenStory }) {""",
     r"""// v1.7 r016: the index ends with the world's plot threads and themes, two
// sections (FabulaTemplateSections) whose handlers App hands in as sections.
function FabulaIndexView({ state, isLocked, onOpenCorpus, onCreateCorpus, onCreateStory, onRenameStory, onDeleteStory, onSetStoryCorpus, onOpenStory, sections }) {"""),
    (r"""          <div style={listBox}>{loose.map(row)}</div>
        </div>
      )}
    </div>
  );
}""",
     r"""          <div style={listBox}>{loose.map(row)}</div>
        </div>
      )}

      {sections && <FabulaTemplateSections state={state} isLocked={isLocked} sections={sections} />}
    </div>
  );
}"""),
])

TAIL = r'''

''' + header("Fabula: threads and themes (v1.7 r016)") + r'''
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
}'''

p28 = MODULES / "28_fabula.jsx"
t28 = p28.read_text(encoding="utf-8")
end = "          </div>\n        )}\n      </div>\n    </div>\n  );\n}"
assert not t28.endswith("\n") and t28.endswith(end), "28_fabula.jsx no longer ends the way this cut expects"
p28.write_text(t28 + TAIL, encoding="utf-8")
print("v1.7 r016 applied: 01_builtin-templates, 10_migrate, 12_trunk, 28_fabula")
