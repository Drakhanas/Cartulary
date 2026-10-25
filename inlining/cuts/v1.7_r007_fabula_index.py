"""v1.7 r007: Fabula's first screen, the index and the corpus page.

Drak's calls (2026-10-25): the view comes before the template builder, so the
help lines get reviewed in place while every schema still follows the seed,
and in two cuts, this one and the story page (r008). Fabula sits after Linea
in the sidebar's default order, and Kalendarium moves below Ephemeris. A story
joins a corpus through a Corpus dropdown on its index row. As the first cut
that shows Fabula, this one carries call C: Fabula's record kinds join the
node-source registry, the template builder offers only sources marked
eligible, and Concordance shows Fabula behind one toggle.

- 22_trunk: FABULA_KINDS gains each kind's label and color; Fabula's kinds
  join NODE_SOURCE_REGISTRY, not eligible as reference targets and grouped
  as "Fabula"; the synthetic templates carry the group.
- 15_template-builder: the target lists offer only eligible sources. Every
  source registered before this cut is eligible, so the lists don't change.
- 17_concordance: one Fabula row in the filter for all of Fabula's kinds.
- 14_form-engine-edit: EntryForm takes hideTags (Fabula's records have no
  tags), and the name input shows the template's nameHelp as its tooltip.
- 12_trunk: the sidebar entry and the new default order (a stored default
  is lifted to it; a rearranged order keeps its arrangement and gains Fabula
  after Linea); the corpus page's state and handlers, on the map page's
  pattern; the story handlers; the header and the body; a Concordance click
  on a corpus opens its page, and on a story its corpus's page or the index.
- 27_trunk, at Fabula's growing tail: the registry's readers, a kind's
  schema as a template, and the index and the reading order.

Declared scope: 12_trunk, 14_form-engine-edit, 15_template-builder,
17_concordance, 22_trunk, 27_trunk. Declarations added: fabulaRegistryInstances,
fabulaRegistryEdges, fabulaTemplate, fabulaStoryCounts, fabulaCorpusDeleteMessage,
FabulaStoryLine, FabulaStoryRow, FabulaIndexView, FabulaReadingOrder.

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given). Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r007_fabula_index.py
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
    line = f"// \u2500\u2500\u2500 {title} "
    return line + "\u2500" * (82 - len(line))


# ---------------------------------------------------------------- 22: kinds and registry
KINDS_OLD = '''// kind of Fabula record. None is registered: the registry entries come with
// the first cut that shows Fabula, together with Concordance's single Fabula
// toggle and a template builder that offers only sources marked eligible
// (Drak, 2026-10-25). Until then the ids appear only in Fabula's seeded
// schemas (fabulaSeedSchemas).
const FABULA_KINDS = [
  { kind: "corpus",       slice: "corpora",       id: "__fabula_corpora__",       name: "Corpus (Fabula)" },
  { kind: "story",        slice: "stories",       id: "__fabula_stories__",       name: "Story (Fabula)" },
  { kind: "cast",         slice: "cast",          id: "__fabula_cast__",          name: "Cast (Fabula)" },
  { kind: "arc",          slice: "arcs",          id: "__fabula_arcs__",          name: "Arc (Fabula)" },
  { kind: "relationship", slice: "relationships", id: "__fabula_relationships__", name: "Relationship (Fabula)" },
  { kind: "plotPoint",    slice: "plotPoints",    id: "__fabula_plotpoints__",    name: "Plot Point (Fabula)" },
  { kind: "promise",      slice: "promises",      id: "__fabula_promises__",      name: "Promise & Payoff (Fabula)" },
  { kind: "part",         slice: "parts",         id: "__fabula_parts__",         name: "Part / Act (Fabula)" },
  { kind: "chapter",      slice: "chapters",      id: "__fabula_chapters__",      name: "Chapter (Fabula)" },
  { kind: "scene",        slice: "scenes",        id: "__fabula_scenes__",        name: "Scene (Fabula)" },
  { kind: "research",     slice: "research",      id: "__fabula_research__",      name: "Research Note (Fabula)" },
];'''
KINDS_NEW = '''// kind of Fabula record. They joined the registry with the first cut that
// shows Fabula, v1.7's r007, as sources that aren't eligible as reference
// targets, together with Concordance's single Fabula toggle and a template
// builder that offers only eligible sources (Drak, 2026-10-25). label is the
// kind's own name, where name says it's Fabula's; color is its node's in
// Concordance.
const FABULA_KINDS = [
  { kind: "corpus",       slice: "corpora",       id: "__fabula_corpora__",       name: "Corpus (Fabula)",           label: "Corpus",           color: "#d9a066" },
  { kind: "story",        slice: "stories",       id: "__fabula_stories__",       name: "Story (Fabula)",            label: "Story",            color: "#e6c27a" },
  { kind: "cast",         slice: "cast",          id: "__fabula_cast__",          name: "Cast (Fabula)",             label: "Cast",             color: "#d98f8f" },
  { kind: "arc",          slice: "arcs",          id: "__fabula_arcs__",          name: "Arc (Fabula)",              label: "Arc",              color: "#c97b9b" },
  { kind: "relationship", slice: "relationships", id: "__fabula_relationships__", name: "Relationship (Fabula)",     label: "Relationship",     color: "#b98bc0" },
  { kind: "plotPoint",    slice: "plotPoints",    id: "__fabula_plotpoints__",    name: "Plot Point (Fabula)",       label: "Plot Point",       color: "#8fa8d9" },
  { kind: "promise",      slice: "promises",      id: "__fabula_promises__",      name: "Promise & Payoff (Fabula)", label: "Promise & Payoff", color: "#7fb8c2" },
  { kind: "part",         slice: "parts",         id: "__fabula_parts__",         name: "Part / Act (Fabula)",       label: "Part / Act",       color: "#a3b87f" },
  { kind: "chapter",      slice: "chapters",      id: "__fabula_chapters__",      name: "Chapter (Fabula)",          label: "Chapter",          color: "#c2b47f" },
  { kind: "scene",        slice: "scenes",        id: "__fabula_scenes__",        name: "Scene (Fabula)",            label: "Scene",            color: "#d6a07a" },
  { kind: "research",     slice: "research",      id: "__fabula_research__",      name: "Research Note (Fabula)",    label: "Research Note",    color: "#a3a3ad" },
];'''

REGISTRY_TAIL_OLD = '''      return edges;
    },
  },
];

// Synthetic template objects, shaped like BUILTIN_TEMPLATES entries so the'''
REGISTRY_TAIL_NEW = '''      return edges;
    },
  },
  // v1.7 r007: Fabula's record kinds (FABULA_KINDS), one source each. Not
  // eligible: no template's field can point at one, and the template builder
  // offers eligible sources only. group puts all eleven behind one toggle in
  // Concordance's filter, named by groupName. Their records and edges are read
  // beside Fabula's view (fabulaRegistryInstances, fabulaRegistryEdges).
  ...FABULA_KINDS.map(k => ({
    id: k.id,
    name: k.name,
    color: k.color,
    icon: "\\u2042", // ⁂
    refEligible: false,
    group: "fabula",
    groupName: "Fabula",
    getInstances: (state) => fabulaRegistryInstances(state, k),
    getColor: () => k.color,
    getEdges: (state) => fabulaRegistryEdges(state, k),
  })),
];

// Synthetic template objects, shaped like BUILTIN_TEMPLATES entries so the'''

edit(MODULES / "22_trunk.jsx", [
    (KINDS_OLD, KINDS_NEW),
    (REGISTRY_TAIL_OLD, REGISTRY_TAIL_NEW),
    (
        "    synthetic: true,\n    refEligible: !!src.refEligible,\n    fields: [],\n  }));",
        "    synthetic: true,\n    refEligible: !!src.refEligible,\n    group: src.group || null,\n    groupName: src.groupName || null,\n    fields: [],\n  }));",
    ),
])

# ---------------------------------------------------------------- 15: eligible sources only
edit(MODULES / "15_template-builder.jsx", [
    (
        "  // v1.5 r077: registered node types (Astronomical Body, future ConLang) are\n"
        "  // offered as ref targets alongside real templates. Checking one stores its\n"
        "  // synthetic-template id (= the body sentinel) into refTemplatesId.\n"
        "  const targetTemplates = [...templates, ...getRegisteredSyntheticTemplates()];",
        "  // v1.5 r077: registered node types (Astronomical Body, future ConLang) are\n"
        "  // offered as ref targets alongside real templates. Checking one stores its\n"
        "  // synthetic-template id (= the body sentinel) into refTemplatesId. Since\n"
        "  // v1.7 r007 only the sources marked eligible: Fabula's kinds aren't.\n"
        "  const targetTemplates = [...templates, ...getRegisteredSyntheticTemplates().filter(t => t.refEligible)];",
    ),
    (
        "{getRegisteredSyntheticTemplates().map(t => <option key={t.id} value={t.id}>{t.icon} {t.name} only</option>)}",
        "{getRegisteredSyntheticTemplates().filter(t => t.refEligible).map(t => <option key={t.id} value={t.id}>{t.icon} {t.name} only</option>)}",
        2,
    ),
])

# ---------------------------------------------------------------- 17: one Fabula toggle
edit(MODULES / "17_concordance.jsx", [
    (
        "  const allOn = () => setEnabledTemplates(new Set([...state.templates.map(t => t.id), ...getRegisteredSyntheticTemplates().map(t => t.id)]));",
        "  // v1.7 r007: a group of sources (Fabula's eleven kinds) toggles as one.\n"
        "  const toggleGroup = (ids, on) => {\n"
        "    const next = new Set(enabledTemplates);\n"
        "    ids.forEach(id => { if (on) next.delete(id); else next.add(id); });\n"
        "    setEnabledTemplates(next);\n"
        "  };\n\n"
        "  const allOn = () => setEnabledTemplates(new Set([...state.templates.map(t => t.id), ...getRegisteredSyntheticTemplates().map(t => t.id)]));",
    ),
    (
        "          {[...state.templates, ...getRegisteredSyntheticTemplates()].map(t => (\n"
        "            <label key={t.id} className=\"graph-filter-row\">\n"
        "              <input type=\"checkbox\" checked={enabledTemplates.has(t.id)} onChange={() => toggleTemplate(t.id)} />\n"
        "              <span className=\"graph-filter-color\" style={{ background: t.color }} />\n"
        "              <span className=\"graph-filter-name\">{t.name}</span>\n"
        "              <span className=\"graph-filter-count\">{perTemplateCount[t.id] || 0}</span>\n"
        "            </label>\n"
        "          ))}\n",
        "          {[...state.templates, ...getRegisteredSyntheticTemplates().filter(t => !t.group)].map(t => (\n"
        "            <label key={t.id} className=\"graph-filter-row\">\n"
        "              <input type=\"checkbox\" checked={enabledTemplates.has(t.id)} onChange={() => toggleTemplate(t.id)} />\n"
        "              <span className=\"graph-filter-color\" style={{ background: t.color }} />\n"
        "              <span className=\"graph-filter-name\">{t.name}</span>\n"
        "              <span className=\"graph-filter-count\">{perTemplateCount[t.id] || 0}</span>\n"
        "            </label>\n"
        "          ))}\n"
        "          {Object.values(getRegisteredSyntheticTemplates().filter(t => t.group).reduce((acc, t) => {\n"
        "            (acc[t.group] = acc[t.group] || []).push(t);\n"
        "            return acc;\n"
        "          }, {})).map(members => {\n"
        "            const ids = members.map(m => m.id);\n"
        "            const on = ids.every(id => enabledTemplates.has(id));\n"
        "            return (\n"
        "              <label key={`group-${members[0].group}`} className=\"graph-filter-row\">\n"
        "                <input type=\"checkbox\" checked={on} onChange={() => toggleGroup(ids, on)} />\n"
        "                <span className=\"graph-filter-color\" style={{ background: members[0].color }} />\n"
        "                <span className=\"graph-filter-name\">{members[0].groupName || members[0].group}</span>\n"
        "                <span className=\"graph-filter-count\">{ids.reduce((n, id) => n + (perTemplateCount[id] || 0), 0)}</span>\n"
        "              </label>\n"
        "            );\n"
        "          })}\n",
    ),
])

# ---------------------------------------------------------------- 14: EntryForm
edit(MODULES / "14_form-engine-edit.jsx", [
    (
        "function EntryForm({ draft, template, entries, templates, bodies, registeredNodes, onChange, showSecrets, imageFolder, allTags, dirHandle, calendar, primaryCalendar, selfEntryId, flash, previewMode, additionalCalendars, ipaSymbols, canvasSlot }) {",
        "function EntryForm({ draft, template, entries, templates, bodies, registeredNodes, onChange, showSecrets, imageFolder, allTags, dirHandle, calendar, primaryCalendar, selfEntryId, flash, previewMode, additionalCalendars, ipaSymbols, canvasSlot, hideTags }) {",
    ),
    (
        "          : <input className=\"form-title-input\" placeholder={`${template.name} name...`} value={draft.name} onChange={e => onChange({ ...draft, name: e.target.value })} autoFocus />",
        "          : <input className=\"form-title-input\" placeholder={`${template.name} name...`} title={template.nameHelp || undefined} value={draft.name} onChange={e => onChange({ ...draft, name: e.target.value })} autoFocus />",
    ),
    (
        "      {!previewMode && (\n        <div className=\"form-tags-bar\">\n          <label className=\"form-label\">Tags</label>",
        "      {!previewMode && !hideTags && (\n        <div className=\"form-tags-bar\">\n          <label className=\"form-label\">Tags</label>",
    ),
])

# ---------------------------------------------------------------- 12: the app
APP = MODULES / "12_trunk.jsx"
edit(APP, [
    # state
    (
        "  const initialMapDraftRef = useRef(null);\n",
        "  const initialMapDraftRef = useRef(null);\n"
        "  // Fabula session state (v1.7 r007), the map pattern: activeCorpusId null =\n"
        "  // the index, an id = that corpus's page; corpusDraft null = view mode, an\n"
        "  // object = its fields in edit (a working copy, committed on Save). A\n"
        "  // corpusDraft whose id isn't in state.fabula.corpora is a new corpus.\n"
        "  const [activeCorpusId, setActiveCorpusId] = useState(null);\n"
        "  const [corpusDraft, setCorpusDraft] = useState(null);\n"
        "  const initialCorpusDraftRef = useRef(null);\n",
    ),
    # dirty check and discard prompt
    (
        "    if (mapDraft && JSON.stringify(mapDraft) !== initialMapDraftRef.current) return true;\n",
        "    if (mapDraft && JSON.stringify(mapDraft) !== initialMapDraftRef.current) return true;\n"
        "    if (corpusDraft && JSON.stringify(corpusDraft) !== initialCorpusDraftRef.current) return true;\n",
    ),
    (
        "    const which = mapDraft ? \"this map\" : entryDraft ? \"this entry\" : \"this template\";",
        "    const which = mapDraft ? \"this map\" : corpusDraft ? \"this corpus\" : entryDraft ? \"this entry\" : \"this template\";",
    ),
    (
        "    setEntryDraft(null); setTplDraft(null); setMapDraft(null);\n"
        "    initialEntryDraftRef.current = null;\n"
        "    initialTplDraftRef.current = null;\n"
        "    initialMapDraftRef.current = null;\n",
        "    setEntryDraft(null); setTplDraft(null); setMapDraft(null); setCorpusDraft(null);\n"
        "    initialEntryDraftRef.current = null;\n"
        "    initialTplDraftRef.current = null;\n"
        "    initialMapDraftRef.current = null;\n"
        "    initialCorpusDraftRef.current = null;\n",
    ),
    (
        "    setActiveStemmaId(null); setFocalNodeId(null); setActiveMapId(null);\n",
        "    setActiveStemmaId(null); setFocalNodeId(null); setActiveMapId(null); setActiveCorpusId(null);\n",
    ),
    # Concordance clicks on Fabula's records
    (
        "    // v1.5 r004: body fallback.",
        "    // v1.7 r007: Fabula fallback. A corpus opens on its page; a story, whose\n"
        "    // page comes in r008, opens its corpus's page, or the index when it's in\n"
        "    // no corpus.\n"
        "    const fabCorpora = (state.fabula && Array.isArray(state.fabula.corpora)) ? state.fabula.corpora : [];\n"
        "    const fabStory = (state.fabula && Array.isArray(state.fabula.stories)) ? state.fabula.stories.find(st => st && st.id === id) : null;\n"
        "    if (fabStory || fabCorpora.some(c => c && c.id === id)) {\n"
        "      const home = fabStory ? fabCorpora.find(c => c && Array.isArray(c.storyIds) && c.storyIds.includes(id)) : null;\n"
        "      setActiveTagFilter(null);\n"
        "      setCorpusDraft(null); initialCorpusDraftRef.current = null;\n"
        "      setActiveCorpusId(fabStory ? (home ? home.id : null) : id);\n"
        "      setView(\"fabula\");\n"
        "      return;\n"
        "    }\n"
        "    // v1.5 r004: body fallback.",
    ),
    # handlers
    (
        "  const openEditEntry = () => {",
        "  // v1.7 r007: Fabula's corpora and stories (docs/fabula-spec.md, section 4).\n"
        "  // A corpus's page follows the map's: a new corpus is a draft until Save,\n"
        "  // and its fields change through Edit, Save, and Cancel. Its reading order\n"
        "  // and the stories in it change at once, as the index's actions do. A\n"
        "  // corpus's membership is its storyIds; a story's corpus is stored nowhere\n"
        "  // else, and each change takes the story out of every corpus first.\n"
        "  const updateFabula = (fn) => updateState(s => ({ ...s, fabula: fn(s.fabula || {}) }));\n"
        "  const fabArr = (fab, slice) => (Array.isArray(fab[slice]) ? fab[slice] : []);\n\n"
        "  const openCorpus = (id) => {\n"
        "    if (!confirmDiscardDraft()) return;\n"
        "    setCorpusDraft(null); initialCorpusDraftRef.current = null;\n"
        "    setActiveCorpusId(id);\n"
        "    setView(\"fabula\");\n"
        "  };\n\n"
        "  const closeCorpusToIndex = () => {\n"
        "    if (!confirmDiscardDraft()) return;\n"
        "    setCorpusDraft(null); initialCorpusDraftRef.current = null;\n"
        "    setActiveCorpusId(null);\n"
        "  };\n\n"
        "  const createCorpus = () => {\n"
        "    if (isLocked) return;\n"
        "    if (!confirmDiscardDraft()) return;\n"
        "    const id = `fab-corpus-${genId()}`;\n"
        "    const draft = { id, name: \"\", fields: {} };\n"
        "    setActiveCorpusId(id);\n"
        "    setCorpusDraft(draft);\n"
        "    initialCorpusDraftRef.current = JSON.stringify(draft);\n"
        "    setView(\"fabula\");\n"
        "  };\n\n"
        "  const editCorpus = () => {\n"
        "    const rec = fabArr(state.fabula || {}, \"corpora\").find(c => c.id === activeCorpusId);\n"
        "    if (!rec || isLocked) return;\n"
        "    if (!confirmDiscardDraft()) return;\n"
        "    const draft = { id: rec.id, name: rec.name || \"\", fields: JSON.parse(JSON.stringify(rec.fields || {})) };\n"
        "    setCorpusDraft(draft);\n"
        "    initialCorpusDraftRef.current = JSON.stringify(draft);\n"
        "  };\n\n"
        "  const saveCorpus = () => {\n"
        "    if (!corpusDraft || isLocked) return;\n"
        "    const name = (corpusDraft.name || \"\").trim();\n"
        "    if (!name) return;\n"
        "    const now = isoNow();\n"
        "    updateFabula(fab => {\n"
        "      const arr = fabArr(fab, \"corpora\");\n"
        "      const old = arr.find(c => c.id === corpusDraft.id);\n"
        "      const rec = { ...(old || { storyIds: [], createdAt: now }), id: corpusDraft.id, name, fields: corpusDraft.fields || {}, updatedAt: now };\n"
        "      return { ...fab, corpora: old ? arr.map(c => c.id === rec.id ? rec : c) : [...arr, rec] };\n"
        "    });\n"
        "    setCorpusDraft(null); initialCorpusDraftRef.current = null;\n"
        "    setActiveCorpusId(corpusDraft.id);\n"
        "    flash(\"Saved\");\n"
        "  };\n\n"
        "  const cancelCorpusEdit = () => {\n"
        "    if (!confirmDiscardDraft()) return;\n"
        "    const existed = fabArr(state.fabula || {}, \"corpora\").some(c => c.id === activeCorpusId);\n"
        "    setCorpusDraft(null); initialCorpusDraftRef.current = null;\n"
        "    if (!existed) setActiveCorpusId(null); // a new corpus, never saved: back to the index\n"
        "  };\n\n"
        "  // Deleting a corpus leaves its stories in Fabula, in no corpus.\n"
        "  const deleteCorpus = (id) => {\n"
        "    if (isLocked) return;\n"
        "    updateFabula(fab => ({ ...fab, corpora: fabArr(fab, \"corpora\").filter(c => c.id !== id) }));\n"
        "    if (activeCorpusId === id) {\n"
        "      setActiveCorpusId(null);\n"
        "      setCorpusDraft(null); initialCorpusDraftRef.current = null;\n"
        "    }\n"
        "  };\n\n"
        "  // A new story, in a corpus (at the end of its reading order) or in none.\n"
        "  // Returns its id, so the row it lands in can open its title for typing.\n"
        "  const createStory = (corpusId) => {\n"
        "    if (isLocked) return null;\n"
        "    const id = `fab-story-${genId()}`;\n"
        "    const now = isoNow();\n"
        "    updateFabula(fab => ({\n"
        "      ...fab,\n"
        "      stories: [...fabArr(fab, \"stories\"), { id, name: \"Untitled story\", fields: {}, outline: [], createdAt: now, updatedAt: now }],\n"
        "      corpora: fabArr(fab, \"corpora\").map(c => c.id === corpusId ? { ...c, storyIds: [...(c.storyIds || []), id], updatedAt: now } : c),\n"
        "    }));\n"
        "    return id;\n"
        "  };\n\n"
        "  const renameStory = (id, name) => {\n"
        "    const n = (name || \"\").trim();\n"
        "    if (isLocked || !n) return;\n"
        "    updateFabula(fab => ({ ...fab, stories: fabArr(fab, \"stories\").map(st => st.id === id ? { ...st, name: n, updatedAt: isoNow() } : st) }));\n"
        "  };\n\n"
        "  const deleteStory = (id) => {\n"
        "    if (isLocked) return;\n"
        "    updateFabula(fab => ({\n"
        "      ...fab,\n"
        "      stories: fabArr(fab, \"stories\").filter(st => st.id !== id),\n"
        "      corpora: fabArr(fab, \"corpora\").map(c => (c.storyIds || []).includes(id) ? { ...c, storyIds: c.storyIds.filter(x => x !== id) } : c),\n"
        "    }));\n"
        "  };\n\n"
        "  // The Corpus dropdown: into a corpus, at the end of its reading order, or\n"
        "  // into none (corpusId null).\n"
        "  const setStoryCorpus = (storyId, corpusId) => {\n"
        "    if (isLocked) return;\n"
        "    const now = isoNow();\n"
        "    updateFabula(fab => ({\n"
        "      ...fab,\n"
        "      corpora: fabArr(fab, \"corpora\").map(c => {\n"
        "        const ids = (c.storyIds || []).filter(x => x !== storyId);\n"
        "        if (c.id === corpusId) return { ...c, storyIds: [...ids, storyId], updatedAt: now };\n"
        "        return ids.length === (c.storyIds || []).length ? c : { ...c, storyIds: ids, updatedAt: now };\n"
        "      }),\n"
        "      stories: fabArr(fab, \"stories\").map(st => st.id === storyId ? { ...st, updatedAt: now } : st),\n"
        "    }));\n"
        "  };\n\n"
        "  // The reading order: a story to a new place in its corpus.\n"
        "  const moveCorpusStory = (corpusId, storyId, toIndex) => {\n"
        "    if (isLocked) return;\n"
        "    updateFabula(fab => ({\n"
        "      ...fab,\n"
        "      corpora: fabArr(fab, \"corpora\").map(c => {\n"
        "        if (c.id !== corpusId || !(c.storyIds || []).includes(storyId)) return c;\n"
        "        const ids = c.storyIds.filter(x => x !== storyId);\n"
        "        ids.splice(Math.max(0, Math.min(ids.length, toIndex)), 0, storyId);\n"
        "        return { ...c, storyIds: ids, updatedAt: isoNow() };\n"
        "      }),\n"
        "    }));\n"
        "  };\n\n"
        "  const openEditEntry = () => {",
    ),
    # header title
    (
        "  else if (view === \"ephemeris\") headerTitle = \"Ephemeris\";",
        "  else if (view === \"fabula\") {\n"
        "    if (corpusDraft) headerTitle = (corpusDraft.name && corpusDraft.name.trim()) ? corpusDraft.name : \"New Corpus\";\n"
        "    else if (activeCorpusId) {\n"
        "      const rec = ((state.fabula && state.fabula.corpora) || []).find(c => c.id === activeCorpusId);\n"
        "      headerTitle = rec?.name || \"Corpus\";\n"
        "    } else headerTitle = \"Fabula\";\n"
        "  }\n"
        "  else if (view === \"ephemeris\") headerTitle = \"Ephemeris\";",
    ),
    # header buttons
    (
        "              {(view === \"tpl-build\" || view === \"tpl-edit\") && <>",
        "              {view === \"fabula\" && corpusDraft && <>\n"
        "                <button className=\"btn btn-ghost\" onClick={cancelCorpusEdit}>Cancel</button>\n"
        "                <button className=\"btn btn-accent\" onClick={saveCorpus} disabled={!corpusDraft?.name?.trim()}>Save</button>\n"
        "              </>}\n"
        "              {view === \"fabula\" && activeCorpusId && !corpusDraft && <>\n"
        "                {!isLocked && <button className=\"btn btn-danger\" onClick={() => {\n"
        "                  const rec = ((state.fabula && state.fabula.corpora) || []).find(c => c.id === activeCorpusId);\n"
        "                  if (rec && confirm(fabulaCorpusDeleteMessage(rec))) deleteCorpus(activeCorpusId);\n"
        "                }}>Delete</button>}\n"
        "                {!isLocked && <button className=\"btn btn-ghost\" onClick={editCorpus}>Edit</button>}\n"
        "                <button className=\"btn btn-ghost\" onClick={closeCorpusToIndex}>\u2190 Back</button>\n"
        "              </>}\n"
        "              {(view === \"tpl-build\" || view === \"tpl-edit\") && <>",
    ),
    # body
    (
        "          {view === \"glossopoeia\" && (",
        "          {view === \"fabula\" && !activeCorpusId && !corpusDraft && (\n"
        "            <FabulaIndexView\n"
        "              state={state}\n"
        "              isLocked={isLocked}\n"
        "              onOpenCorpus={openCorpus}\n"
        "              onCreateCorpus={createCorpus}\n"
        "              onCreateStory={createStory}\n"
        "              onRenameStory={renameStory}\n"
        "              onDeleteStory={deleteStory}\n"
        "              onSetStoryCorpus={setStoryCorpus}\n"
        "            />\n"
        "          )}\n"
        "          {view === \"fabula\" && corpusDraft && (\n"
        "            <EntryForm\n"
        "              draft={corpusDraft}\n"
        "              template={fabulaTemplate(state, \"corpus\")}\n"
        "              entries={state.entries}\n"
        "              templates={state.templates}\n"
        "              bodies={state.celestialBodies}\n"
        "              registeredNodes={getRegisteredGraphNodes(state)}\n"
        "              onChange={setCorpusDraft}\n"
        "              showSecrets={showSecrets}\n"
        "              imageFolder={state.world.imageFolder}\n"
        "              allTags={allTags}\n"
        "              dirHandle={dirHandle}\n"
        "              calendar={getCalendar(state, null)}\n"
        "              primaryCalendar={state.world.calendar}\n"
        "              additionalCalendars={[]}\n"
        "              selfEntryId={corpusDraft.id}\n"
        "              flash={flash}\n"
        "              hideTags\n"
        "            />\n"
        "          )}\n"
        "          {view === \"fabula\" && activeCorpusId && !corpusDraft && (() => {\n"
        "            const rec = ((state.fabula && state.fabula.corpora) || []).find(c => c.id === activeCorpusId);\n"
        "            if (!rec) {\n"
        "              return (\n"
        "                <div style={{ padding: \"40px 24px\", textAlign: \"center\", color: \"var(--text-dim)\" }}>\n"
        "                  This corpus no longer exists.\n"
        "                  <div style={{ marginTop: 16 }}>\n"
        "                    <button className=\"btn btn-ghost\" onClick={closeCorpusToIndex}>\u2190 Back to Fabula</button>\n"
        "                  </div>\n"
        "                </div>\n"
        "              );\n"
        "            }\n"
        "            return (\n"
        "              <EntryView\n"
        "                entry={rec}\n"
        "                template={fabulaTemplate(state, \"corpus\")}\n"
        "                templates={state.templates}\n"
        "                entries={state.entries}\n"
        "                onOpenEntry={openEntryFromAnywhere}\n"
        "                onSelectTag={selectTag}\n"
        "                showSecrets={showSecrets}\n"
        "                imageFolder={state.world.imageFolder}\n"
        "                dirHandle={dirHandle}\n"
        "                calendar={getCalendar(state, null)}\n"
        "                state={state}\n"
        "                onUpdateViewPrefs={updateViewPrefs}\n"
        "                canvasSlot={\n"
        "                  <FabulaReadingOrder\n"
        "                    state={state}\n"
        "                    corpus={rec}\n"
        "                    isLocked={isLocked}\n"
        "                    onMoveStory={moveCorpusStory}\n"
        "                    onCreateStory={createStory}\n"
        "                    onRenameStory={renameStory}\n"
        "                  />\n"
        "                }\n"
        "              />\n"
        "            );\n"
        "          })()}\n"
        "          {view === \"glossopoeia\" && (",
    ),
    # the sidebar
    (
        "    cartographia:  { id: \"cartographia\",  icon: \"\u25a6\", label: \"Cartographia\" },\n",
        "    cartographia:  { id: \"cartographia\",  icon: \"\u25a6\", label: \"Cartographia\" },\n"
        "    fabula:        { id: \"fabula\",        icon: \"\\u2042\", label: \"Fabula\" },\n",
    ),
    (
        "  const orderedViews = (viewOrder || [\"family\", \"stemma\", \"kalendarium\", \"ephemeris\", \"glossopoeia\", \"cartographia\", \"graph\", \"timeline\", \"chronometrics\"])",
        "  const orderedViews = (viewOrder || [\"family\", \"fabula\", \"stemma\", \"ephemeris\", \"kalendarium\", \"glossopoeia\", \"cartographia\", \"graph\", \"timeline\", \"chronometrics\"])",
    ),
    (
        "  const DEFAULT_VIEW_ORDER = [\"family\", \"stemma\", \"kalendarium\", \"ephemeris\", \"glossopoeia\", \"cartographia\", \"graph\", \"timeline\", \"chronometrics\"];",
        "  // v1.7 r007 (Drak, 2026-10-25): Fabula after Linea, and Kalendarium below\n"
        "  // Ephemeris.\n"
        "  const DEFAULT_VIEW_ORDER = [\"family\", \"fabula\", \"stemma\", \"ephemeris\", \"kalendarium\", \"glossopoeia\", \"cartographia\", \"graph\", \"timeline\", \"chronometrics\"];",
    ),
    (
        "    [\"family\", \"stemma\", \"kalendarium\", \"ephemeris\", \"cartographia\", \"graph\", \"timeline\", \"chronometrics\"],\n",
        "    [\"family\", \"stemma\", \"kalendarium\", \"ephemeris\", \"cartographia\", \"graph\", \"timeline\", \"chronometrics\"],\n"
        "    // v1.5 through v1.7 r006 (Glossopoeia in, Fabula not yet)\n"
        "    [\"family\", \"stemma\", \"kalendarium\", \"ephemeris\", \"glossopoeia\", \"cartographia\", \"graph\", \"timeline\", \"chronometrics\"],\n",
    ),
])

# ---------------------------------------------------------------- 27: Fabula's screen
FABULA = header("Fabula: the index and the corpus page (v1.7 r007)") + r'''
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
  if (k.kind !== "corpus") return [];
  const fab = (state && state.fabula) || {};
  const storyIds = new Set((Array.isArray(fab.stories) ? fab.stories : []).map(st => st && st.id).filter(Boolean));
  const edges = [];
  (Array.isArray(fab.corpora) ? fab.corpora : []).forEach(c => {
    if (!c || !c.id || !Array.isArray(c.storyIds)) return;
    c.storyIds.forEach(id => { if (storyIds.has(id)) edges.push({ source: c.id, target: id, label: "includes", kind: "directed" }); });
  });
  return edges;
};

// A kind's schema as the template EntryForm and EntryView take: the world's
// stored schema, or the seed when the world has none.
const fabulaTemplate = (state, kind) => {
  const k = FABULA_KINDS.find(x => x.kind === kind);
  const stored = state.fabula && state.fabula.schemas && state.fabula.schemas[kind];
  const s = stored && Array.isArray(stored.fields) ? stored : fabulaSeedSchemas(state.templates || [])[kind];
  return { id: k.id, name: k.label, icon: "\u2042", color: k.color, kind: `fabula-${kind}`, fields: s.fields, nameHelp: s.nameHelp };
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

function FabulaStoryLine({ state, story }) {
  const counts = fabulaStoryCounts(state, story.id);
  const status = formatSelectDisplay((story.fields || {}).status);
  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
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
function FabulaStoryRow({ state, story, isLocked, autoRename, onRename, onRenameEnd, leading, actions, trailing, rowProps }) {
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
      ) : <FabulaStoryLine state={state} story={story} />}
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

function FabulaIndexView({ state, isLocked, onOpenCorpus, onCreateCorpus, onCreateStory, onRenameStory, onDeleteStory, onSetStoryCorpus }) {
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
      actions={
        <select className="input" value={corpusOf.get(st.id) || ""} onChange={e => onSetStoryCorpus(st.id, e.target.value || null)} title="The corpus this story belongs to" aria-label="Corpus" style={{ fontSize: 12, padding: "3px 28px 3px 8px", minWidth: 130, maxWidth: 220 }}>
          <option value="">No corpus</option>
          {corpora.map(c => <option key={c.id} value={c.id}>{c.name || "(untitled corpus)"}</option>)}
        </select>
      }
      trailing={
        <button className="btn" style={{ ...smallBtn, color: "var(--danger)", borderColor: "rgba(184,92,76,.35)" }} onClick={() => {
          if (confirm(`Delete the story "${st.name || "untitled story"}"?`)) onDeleteStory(st.id);
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
    </div>
  );
}

// A corpus's stories in reading order, on its page: drag a row to a new
// place, or move it with the arrows. A story made here starts at the end.
function FabulaReadingOrder({ state, corpus, isLocked, onMoveStory, onCreateStory, onRenameStory }) {
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
}'''

p27 = MODULES / "27_trunk.jsx"
t27 = p27.read_text(encoding="utf-8")
end = "    fab.schemas[k.kind] = seeded[k.kind];\n  });\n};"
assert not t27.endswith("\n") and t27.endswith(end), "27_trunk.jsx no longer ends the way this cut expects"
p27.write_text(t27 + "\n\n" + FABULA, encoding="utf-8")

print("v1.7 r007 applied: 12, 14, 15, 17, 22, 27")
