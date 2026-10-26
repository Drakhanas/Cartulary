"""v1.7 r009: People, the story's cast, arcs, and relationships.

Drak's calls (2026-10-25), one per message, recorded in docs/fabula-spec.md
sections 3, 4, 9, and 10: People before the template builder; a cast record,
an arc, or a relationship opens on a page of its own over the story's page,
with Edit, Save, Cancel, and Delete, and Back to the page it was opened from;
a reference to a Fabula record opens that record, from a chip or from
Concordance; deleting a cast record counts what points at it and clears those
references, leaving the arcs and relationships standing; and section 9's
cleaning for a deleted entry, a template's entries included, with a cast
record whose character is deleted kept and marked.

- 12_trunk: the People tab and the record pages in App: the story's tab, the
  open record, its draft, and fabulaBack, the pages Back returns through; the
  handlers, the header, and the body; a chip or a Concordance click on a
  record opens it; deleting an entry or a template clears Fabula's references
  to it, and deleting a story takes its own records with it.
- 13_form-engine-display: a reference to a record with a page opens it
  (resolveRefTarget).
- 14_form-engine-edit: a reference field can leave out given records
  (excludeIds), for one cast record per character per story.
- 24_ephemeris/01_shell: deleting a body clears Fabula's references to it, as
  it clears entries'.
- 27_trunk: Concordance's edges for the links that exist; the story's tabs
  switch; the People tab, the record page, and the cleaning, counting, and
  naming helpers, at Fabula's tail. From Drak's pass (2026-10-25): an arc's
  Cast takes more than one, as friends to lovers does, so the seed is 2, and
  an arc's one cast record from seed 1 becomes a list of one.

Declared scope: 12_trunk, 13_form-engine-display, 14_form-engine-edit,
24_ephemeris/01_shell, 27_trunk. Declarations added: FABULA_NOUNS,
FABULA_PAGE_KINDS, FABULA_IMPORTANCE, fabulaCount, fabulaJoin,
fabulaKindFields, scrubFabulaRefs, fabulaInboundCounts,
fabulaRecordDeleteMessage, fabulaStoryDeleteMessage, fabulaDropStoryRecords,
fabulaFindRecord, fabulaRecordOpens, fabulaCastNameFill, FabulaPeopleTab,
FabulaRecordPage.

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given). Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r009_fabula_people.py
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


# ---------------------------------------------------------------- 13: a record with a page opens
edit(MODULES / "13_form-engine-display.jsx", [
    ('''// record has no route yet, so it shows as a plain chip (Drak, 2026-10-24),
// and a Fabula record shows as one too until People settles whether a
// reference opens it (v1.7 r008). `kind` names the record's type for a chip
// that can't be opened.''',
     '''// record has no route yet, so it shows as a plain chip (Drak, 2026-10-24),
// and since v1.7's r009 a Fabula record with a page of its own opens too
// (fabulaRecordOpens; Drak, 2026-10-25), where a scene stays a plain chip
// until it has one. `kind` names the record's type for a chip that can't be
// opened.'''),
    ('''  return { name: n.name, open: n.templateId === SYNTH_TPL_MAP || n.templateId === BODY_REF_SENTINEL, kind: src ? src.name : "" };''',
     '''  return { name: n.name, open: n.templateId === SYNTH_TPL_MAP || n.templateId === BODY_REF_SENTINEL || fabulaRecordOpens(n.templateId), kind: src ? src.name : "" };'''),
])

# ---------------------------------------------------------------- 14: a field can leave records out
edit(MODULES / "14_form-engine-edit.jsx", [
    ('''    return pool.filter(e => e.id !== selfEntryId);  // self-references are never legitimate
  }, [entries, bodies, registeredNodes, field.refTemplatesId, field.refTemplateId, field.refFilters, field.refMissing, selfEntryId, tplById]);''',
     '''    // v1.7 r009: a field can leave out given records (excludeIds), as a cast
    // record's Character leaves out the characters the story has cast.
    const excluded = Array.isArray(field.excludeIds) && field.excludeIds.length > 0 ? new Set(field.excludeIds) : null;
    return pool.filter(e => e.id !== selfEntryId && !(excluded && excluded.has(e.id)));  // self-references are never legitimate
  }, [entries, bodies, registeredNodes, field.refTemplatesId, field.refTemplateId, field.refFilters, field.refMissing, field.excludeIds, selfEntryId, tplById]);'''),
])

# ---------------------------------------------------------------- 24: a deleted body leaves Fabula too
edit(MODULES / "24_ephemeris" / "01_shell.jsx", [
    ('''        entries: scrubEntryRefs(s.entries, s.templates, new Set([bodyId])),
        celestialBodies: remaining,''',
     '''        entries: scrubEntryRefs(s.entries, s.templates, new Set([bodyId])),
        // v1.7 r009: and Fabula's references to it, the same way.
        fabula: scrubFabulaRefs(s, new Set([bodyId])),
        celestialBodies: remaining,'''),
])

# ---------------------------------------------------------------- 12: App
edit(MODULES / "12_trunk.jsx", [
    ('''  const [activeStoryId, setActiveStoryId] = useState(null);
  const [storyDraft, setStoryDraft] = useState(null);
  const initialStoryDraftRef = useRef(null);
''',
     '''  const [activeStoryId, setActiveStoryId] = useState(null);
  const [storyDraft, setStoryDraft] = useState(null);
  const initialStoryDraftRef = useRef(null);
  // v1.7 r009: People. storyTab is the story page's open tab; activeRecord
  // ({ kind, id }) is a cast record's, an arc's, or a relationship's page,
  // drawn over its story's page; recordDraft is that record in edit (one
  // whose id isn't in its slice is new); fabulaBack holds the pages the
  // record was opened from, a story's tab or another record, for Back.
  const [storyTab, setStoryTab] = useState("story");
  const [activeRecord, setActiveRecord] = useState(null);
  const [recordDraft, setRecordDraft] = useState(null);
  const initialRecordDraftRef = useRef(null);
  const [fabulaBack, setFabulaBack] = useState([]);
'''),
    ('''    if (storyDraft && JSON.stringify(storyDraft) !== initialStoryDraftRef.current) return true;
''',
     '''    if (storyDraft && JSON.stringify(storyDraft) !== initialStoryDraftRef.current) return true;
    if (recordDraft && JSON.stringify(recordDraft) !== initialRecordDraftRef.current) return true;
'''),
    ('''    const which = mapDraft ? "this map" : corpusDraft ? "this corpus" : storyDraft ? "this story" : entryDraft ? "this entry" : "this template";''',
     '''    const which = mapDraft ? "this map" : corpusDraft ? "this corpus" : storyDraft ? "this story" : recordDraft && activeRecord ? `this ${FABULA_NOUNS[activeRecord.kind].one}` : entryDraft ? "this entry" : "this template";'''),
    ('''    setEntryDraft(null); setTplDraft(null); setMapDraft(null); setCorpusDraft(null); setStoryDraft(null);
''',
     '''    setEntryDraft(null); setTplDraft(null); setMapDraft(null); setCorpusDraft(null); setStoryDraft(null); setRecordDraft(null);
'''),
    ('''    initialStoryDraftRef.current = null;
    clearTimeout(draftSaveTimerRef.current);''',
     '''    initialStoryDraftRef.current = null;
    initialRecordDraftRef.current = null;
    clearTimeout(draftSaveTimerRef.current);'''),
    ('''setActiveCorpusId(null); setActiveStoryId(null);
    clearDraftAndStorage(); setSearch(""); setView(v);''',
     '''setActiveCorpusId(null); setActiveStoryId(null);
    setActiveRecord(null); setFabulaBack([]);
    clearDraftAndStorage(); setSearch(""); setView(v);'''),
    ('''    // v1.7 r007: Fabula fallback. A corpus opens on its page, and since r008''',
     '''    // v1.7 r009: a cast record, an arc, or a relationship opens on its own
    // page over its story's (Drak, 2026-10-25). From a Fabula page, Back
    // returns to the page the click came from; from anywhere else, such as
    // Concordance, to its story's People tab.
    const fabRec = fabulaFindRecord(state, id);
    if (fabRec) {
      const onFabulaPage = view === "fabula" && activeStoryId && activeStoryId === fabRec.record.storyId;
      const from = onFabulaPage ? (activeRecord ? { kind: activeRecord.kind, id: activeRecord.id } : { kind: "story", tab: storyTab }) : null;
      setActiveTagFilter(null);
      setCorpusDraft(null); initialCorpusDraftRef.current = null;
      setStoryDraft(null); initialStoryDraftRef.current = null;
      setRecordDraft(null); initialRecordDraftRef.current = null;
      if (!onFabulaPage) {
        const home = ((state.fabula && state.fabula.corpora) || []).find(c => c && Array.isArray(c.storyIds) && c.storyIds.includes(fabRec.record.storyId));
        setActiveCorpusId(home ? home.id : null);
        setActiveStoryId(fabRec.record.storyId);
        setStoryTab("people");
      }
      setFabulaBack(b => from ? [...b, from] : [{ kind: "story", tab: "people" }]);
      setActiveRecord({ kind: fabRec.kind, id });
      setView("fabula");
      return;
    }
    // v1.7 r007: Fabula fallback. A corpus opens on its page, and since r008'''),
    ('''      setActiveCorpusId(fabStory ? (home ? home.id : null) : id);
      setActiveStoryId(fabStory ? id : null);
      setView("fabula");''',
     '''      setActiveCorpusId(fabStory ? (home ? home.id : null) : id);
      setActiveStoryId(fabStory ? id : null);
      setStoryTab("story"); setActiveRecord(null); setFabulaBack([]);
      setRecordDraft(null); initialRecordDraftRef.current = null;
      setView("fabula");'''),
    ('''  const deleteStory = (id) => {
    if (isLocked) return;
    updateFabula(fab => ({
      ...fab,
      stories: fabArr(fab, "stories").filter(st => st.id !== id),
      corpora: fabArr(fab, "corpora").map(c => (c.storyIds || []).includes(id) ? { ...c, storyIds: c.storyIds.filter(x => x !== id) } : c),
    }));
  };''',
     '''  // v1.7 r009: a story's own records (cast, arcs, and the rest, each with the
  // story's storyId) go with it; the confirmation says how many.
  const deleteStory = (id) => {
    if (isLocked) return;
    updateFabula(fab => ({
      ...fab,
      ...fabulaDropStoryRecords(fab, id),
      stories: fabArr(fab, "stories").filter(st => st.id !== id),
      corpora: fabArr(fab, "corpora").map(c => (c.storyIds || []).includes(id) ? { ...c, storyIds: c.storyIds.filter(x => x !== id) } : c),
    }));
  };'''),
    ('''  const openStory = (id) => {
    if (!confirmDiscardDraft()) return;
    setStoryDraft(null); initialStoryDraftRef.current = null;
    setActiveStoryId(id);
    setView("fabula");
  };

  const closeStory = () => {
    if (!confirmDiscardDraft()) return;
    setStoryDraft(null); initialStoryDraftRef.current = null;
    setActiveStoryId(null);
  };''',
     '''  const openStory = (id) => {
    if (!confirmDiscardDraft()) return;
    setStoryDraft(null); initialStoryDraftRef.current = null;
    setRecordDraft(null); initialRecordDraftRef.current = null;
    setStoryTab("story"); setActiveRecord(null); setFabulaBack([]);
    setActiveStoryId(id);
    setView("fabula");
  };

  const closeStory = () => {
    if (!confirmDiscardDraft()) return;
    setStoryDraft(null); initialStoryDraftRef.current = null;
    setActiveRecord(null); setFabulaBack([]);
    setActiveStoryId(null);
  };

  // The story page's tabs; the Story record's edit keeps its tab.
  const selectStoryTab = (tab) => { if (!storyDraft) setStoryTab(tab); };'''),
    ('''    if (!confirm(`Delete the story "${rec.name || "untitled story"}"?`)) return;
    deleteStory(rec.id);''',
     '''    if (!confirm(fabulaStoryDeleteMessage(state, rec))) return;
    deleteStory(rec.id);'''),
    ('''  const toggleFabulaFold = (panelId) => setPrefs(p => ({ ...p, fabulaFolds: { ...(p.fabulaFolds || {}), [panelId]: !(p.fabulaFolds || {})[panelId] } }));
''',
     '''  const toggleFabulaFold = (panelId) => setPrefs(p => ({ ...p, fabulaFolds: { ...(p.fabulaFolds || {}), [panelId]: !(p.fabulaFolds || {})[panelId] } }));

  // v1.7 r009: People (docs/fabula-spec.md, section 4). A cast record, an arc,
  // or a relationship opens on a page of its own over its story's page, and
  // Back walks fabulaBack. A new record is a draft until Save, as a new
  // corpus is, and Save asks for the schema's required fields.
  const fabulaSliceOf = (kind) => (FABULA_KINDS.find(k => k.kind === kind) || {}).slice;
  const fabulaRecordOf = (kind, id) => fabArr(state.fabula || {}, fabulaSliceOf(kind)).find(r => r && r.id === id) || null;
  const fabulaHere = () => (activeRecord ? { kind: activeRecord.kind, id: activeRecord.id } : { kind: "story", tab: storyTab });

  const openFabulaRecord = (kind, id) => {
    if (!confirmDiscardDraft()) return;
    setStoryDraft(null); initialStoryDraftRef.current = null;
    setRecordDraft(null); initialRecordDraftRef.current = null;
    setFabulaBack(b => [...b, fabulaHere()]);
    setActiveRecord({ kind, id });
  };

  const newFabulaRecord = (kind) => {
    if (isLocked || !activeStoryId) return;
    if (!confirmDiscardDraft()) return;
    const id = `fab-${kind}-${genId()}`;
    const draft = { id, name: "", fields: {} };
    setFabulaBack(b => [...b, fabulaHere()]);
    setActiveRecord({ kind, id });
    setRecordDraft(draft);
    initialRecordDraftRef.current = JSON.stringify(draft);
  };

  // The page a record was opened from, without asking.
  const popFabulaBack = () => {
    const frame = fabulaBack[fabulaBack.length - 1];
    setFabulaBack(b => b.slice(0, -1));
    if (frame && frame.kind !== "story") { setActiveRecord({ kind: frame.kind, id: frame.id }); return; }
    setActiveRecord(null);
    setStoryTab((frame && frame.tab) || "people");
  };

  const closeFabulaRecord = () => {
    if (!confirmDiscardDraft()) return;
    setRecordDraft(null); initialRecordDraftRef.current = null;
    popFabulaBack();
  };

  const editFabulaRecord = () => {
    if (!activeRecord || isLocked) return;
    const rec = fabulaRecordOf(activeRecord.kind, activeRecord.id);
    if (!rec) return;
    if (!confirmDiscardDraft()) return;
    const draft = { id: rec.id, name: rec.name || "", fields: JSON.parse(JSON.stringify(rec.fields || {})) };
    setRecordDraft(draft);
    initialRecordDraftRef.current = JSON.stringify(draft);
  };

  const saveFabulaRecord = () => {
    if (!recordDraft || !activeRecord || isLocked) return;
    const name = (recordDraft.name || "").trim();
    if (!name) return;
    const requiredErrors = validateRequiredFields(fabulaTemplate(state, activeRecord.kind), recordDraft.fields || {});
    if (requiredErrors.length > 0) { flash(requiredErrors.join(" \\u00b7 ")); return; }
    const slice = fabulaSliceOf(activeRecord.kind);
    const kind = activeRecord.kind;
    const now = isoNow();
    updateFabula(fab => {
      const arr = fabArr(fab, slice);
      const old = arr.find(r => r.id === recordDraft.id);
      const rec = { ...(old || { storyId: activeStoryId, createdAt: now }), id: recordDraft.id, name, fields: recordDraft.fields || {}, updatedAt: now };
      // A cast record given a character again is no longer marked.
      if (kind === "cast" && rec.fields.character) delete rec.characterDeleted;
      return { ...fab, [slice]: old ? arr.map(r => r.id === rec.id ? rec : r) : [...arr, rec] };
    });
    setRecordDraft(null); initialRecordDraftRef.current = null;
    flash("Saved");
  };

  const cancelFabulaRecordEdit = () => {
    if (!confirmDiscardDraft()) return;
    const existed = !!(activeRecord && fabulaRecordOf(activeRecord.kind, activeRecord.id));
    setRecordDraft(null); initialRecordDraftRef.current = null;
    if (!existed) popFabulaBack(); // a new record, never saved: back where it began
  };

  // Delete asks first, counting what points at the record, then clears those
  // references; nothing else is deleted with it (Drak, 2026-10-25).
  const deleteFabulaRecord = () => {
    if (!activeRecord || isLocked) return;
    const rec = fabulaRecordOf(activeRecord.kind, activeRecord.id);
    if (!rec) return;
    if (!confirm(fabulaRecordDeleteMessage(state, activeRecord.kind, rec))) return;
    const slice = fabulaSliceOf(activeRecord.kind);
    updateState(s => {
      const fab = s.fabula || {};
      const without = { ...fab, [slice]: fabArr(fab, slice).filter(r => r.id !== rec.id) };
      return { ...s, fabula: scrubFabulaRefs({ ...s, fabula: without }, new Set([rec.id])) };
    });
    setRecordDraft(null); initialRecordDraftRef.current = null;
    popFabulaBack();
  };
'''),
    ('''    const deletedIds = new Set([activeEntryId]);
      const remaining = s.entries.filter(e => e.id !== activeEntryId);
      return { ...s, entries: scrubEntryRefs(remaining, s.templates, deletedIds) };''',
     '''    const deletedIds = new Set([activeEntryId]);
      const remaining = s.entries.filter(e => e.id !== activeEntryId);
      // v1.7 r009: Fabula's references to it go too, and a cast record whose
      // character it was stays, marked (spec, section 9).
      const names = new Map([[activeEntryId, activeEntry ? activeEntry.name : ""]]);
      return { ...s, entries: scrubEntryRefs(remaining, s.templates, deletedIds), fabula: scrubFabulaRefs(s, deletedIds, names) };'''),
    ('''      return {
        ...s,
        templates: remainingTemplates,
        entries: scrubEntryRefs(remainingEntries, remainingTemplates, deletedEntryIds),
      };''',
     '''      // v1.7 r009: Fabula's references to its entries go too (spec, section 9).
      const names = new Map(s.entries.filter(e => deletedEntryIds.has(e.id)).map(e => [e.id, e.name]));
      return {
        ...s,
        templates: remainingTemplates,
        entries: scrubEntryRefs(remainingEntries, remainingTemplates, deletedEntryIds),
        fabula: scrubFabulaRefs(s, deletedEntryIds, names),
      };'''),
    ('''    if (activeStoryId) {
      const rec = ((state.fabula && state.fabula.stories) || []).find(st => st.id === activeStoryId);
      headerTitle = storyDraft ? ((storyDraft.name && storyDraft.name.trim()) ? storyDraft.name : "Story") : (rec?.name || "Story");
    }''',
     '''    if (activeStoryId && activeRecord) {
      const k = FABULA_KINDS.find(x => x.kind === activeRecord.kind);
      const rec = fabArr(state.fabula || {}, k.slice).find(r => r.id === activeRecord.id);
      headerTitle = recordDraft ? ((recordDraft.name && recordDraft.name.trim()) ? recordDraft.name : `New ${k.label}`) : (rec?.name || k.label);
    }
    else if (activeStoryId) {
      const rec = ((state.fabula && state.fabula.stories) || []).find(st => st.id === activeStoryId);
      headerTitle = storyDraft ? ((storyDraft.name && storyDraft.name.trim()) ? storyDraft.name : "Story") : (rec?.name || "Story");
    }'''),
    ('''              {view === "fabula" && activeStoryId && storyDraft && <>''',
     '''              {view === "fabula" && activeRecord && recordDraft && <>
                <button className="btn btn-ghost" onClick={cancelFabulaRecordEdit}>Cancel</button>
                <button className="btn btn-accent" onClick={saveFabulaRecord} disabled={!recordDraft?.name?.trim()}>Save</button>
              </>}
              {view === "fabula" && activeRecord && !recordDraft && <>
                {!isLocked && <button className="btn btn-danger" onClick={deleteFabulaRecord}>Delete</button>}
                {!isLocked && <button className="btn btn-ghost" onClick={editFabulaRecord}>Edit</button>}
                <button className="btn btn-ghost" onClick={closeFabulaRecord}>← Back</button>
              </>}
              {view === "fabula" && activeStoryId && !activeRecord && storyDraft && <>'''),
    ('''              {view === "fabula" && activeStoryId && !storyDraft && <>
                {!isLocked && <button className="btn btn-danger" onClick={deleteOpenStory}>Delete</button>}
                {!isLocked && <button className="btn btn-ghost" onClick={editStory}>Edit</button>}''',
     '''              {view === "fabula" && activeStoryId && !activeRecord && !storyDraft && <>
                {!isLocked && <button className="btn btn-danger" onClick={deleteOpenStory}>Delete</button>}
                {!isLocked && storyTab === "story" && <button className="btn btn-ghost" onClick={editStory}>Edit</button>}'''),
    ('''          {view === "fabula" && activeStoryId && (() => {
            const rec = ((state.fabula && state.fabula.stories) || []).find(st => st.id === activeStoryId);''',
     '''          {view === "fabula" && activeStoryId && activeRecord && (() => {
            const k = FABULA_KINDS.find(x => x.kind === activeRecord.kind);
            const rec = fabArr(state.fabula || {}, k.slice).find(r => r.id === activeRecord.id) || (recordDraft && recordDraft.id === activeRecord.id ? recordDraft : null);
            if (!rec) {
              return (
                <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-dim)" }}>
                  This {FABULA_NOUNS[activeRecord.kind].one} no longer exists.
                  <div style={{ marginTop: 16 }}>
                    <button className="btn btn-ghost" onClick={closeFabulaRecord}>← Back</button>
                  </div>
                </div>
              );
            }
            return (
              <FabulaRecordPage
                state={state}
                kind={activeRecord.kind}
                record={rec}
                draft={recordDraft}
                onDraftChange={setRecordDraft}
                storyId={activeStoryId}
                isLocked={isLocked}
                onRestoreTemplate={(name) => restoreBuiltinTemplates([name])}
                showSecrets={showSecrets}
                allTags={allTags}
                dirHandle={dirHandle}
                flash={flash}
                onOpenEntry={openEntryFromAnywhere}
                onSelectTag={selectTag}
                onUpdateViewPrefs={updateViewPrefs}
              />
            );
          })()}
          {view === "fabula" && activeStoryId && !activeRecord && (() => {
            const rec = ((state.fabula && state.fabula.stories) || []).find(st => st.id === activeStoryId);'''),
    ('''                draft={storyDraft}
                onDraftChange={setStoryDraft}
                isLocked={isLocked}
                folds={prefs.fabulaFolds}''',
     '''                draft={storyDraft}
                onDraftChange={setStoryDraft}
                tab={storyTab}
                onSelectTab={selectStoryTab}
                onOpenRecord={openFabulaRecord}
                onNewRecord={newFabulaRecord}
                isLocked={isLocked}
                folds={prefs.fabulaFolds}'''),
])

# ---------------------------------------------------------------- 27: the seed: an arc's Cast takes more than one
p27 = MODULES / "27_trunk.jsx"
edit(p27, [
    ('''// 2026-10-25 (spec, section 5). The code grows here until the view is in,
// then moves to a module of its own by a carve.
const FABULA_SCHEMA_SEED = 1;''',
     '''// 2026-10-25 (spec, section 5). The code grows here until the view is in,
// then moves to a module of its own by a carve. The seed's number rises when
// the seed changes, so a world's unedited schemas follow it: 2 since v1.7's
// r009, when an arc's Cast took more than one (Drak, 2026-10-25, at r009's
// pass).
const FABULA_SCHEMA_SEED = 2;'''),
    ('''      kref("cast", "Cast", "Whose arc this is.", "cast", CORE),''',
     '''      kref("cast", "Cast", "Whose arc this is; there can be more than one.", "cast", { ...CORE, ...MANY }),'''),
    ('''// giving an edited schema new core fields. A schema from a newer seed is left
// alone. Idempotent: a second load changes nothing.''',
     '''// giving an edited schema new core fields. A schema from a newer seed is left
// alone. A reference the replacing seed takes more than one of keeps what it
// held, as a list of one (seed 2: an arc's Cast). Idempotent: a second load
// changes nothing.'''),
    ('''    fab.schemas[k.kind] = seeded[k.kind];
  });''',
     '''    fab.schemas[k.kind] = seeded[k.kind];
    const lists = seeded[k.kind].fields.filter(fl => fl.type === "entry-ref" && fl.multi).map(fl => fl.id);
    fab[k.slice].forEach(r => {
      if (!r || !isObj(r.fields)) return;
      lists.forEach(id => { if (typeof r.fields[id] === "string") r.fields[id] = r.fields[id] ? [r.fields[id]] : []; });
    });
  });'''),
])

# ---------------------------------------------------------------- 27: edges, tabs, the people, the pages
edit(p27, [
    ('''const fabulaRegistryEdges = (state, k) => {
  if (k.kind !== "corpus") return [];
  const fab = (state && state.fabula) || {};
  const storyIds = new Set((Array.isArray(fab.stories) ? fab.stories : []).map(st => st && st.id).filter(Boolean));
  const edges = [];
  (Array.isArray(fab.corpora) ? fab.corpora : []).forEach(c => {
    if (!c || !c.id || !Array.isArray(c.storyIds)) return;
    c.storyIds.forEach(id => { if (storyIds.has(id)) edges.push({ source: c.id, target: id, label: "includes", kind: "directed" }); });
  });
  return edges;
};''',
     '''const fabulaRegistryEdges = (state, k) => {
  const fab = (state && state.fabula) || {};
  const edges = [];
  if (k.kind === "corpus") {
    const storyIds = new Set((Array.isArray(fab.stories) ? fab.stories : []).map(st => st && st.id).filter(Boolean));
    (Array.isArray(fab.corpora) ? fab.corpora : []).forEach(c => {
      if (!c || !c.id || !Array.isArray(c.storyIds)) return;
      c.storyIds.forEach(id => { if (storyIds.has(id)) edges.push({ source: c.id, target: id, label: "includes", kind: "directed" }); });
    });
    return edges;
  }
  // v1.7 r009: the links that exist so far (spec, section 9), each labeled as
  // its field is: a story to its threads and themes, a cast record to its
  // character, an arc to its cast, a relationship to its two. Concordance
  // drops an edge whose other end isn't drawn.
  const links = { story: ["threads", "themes"], cast: ["character"], arc: ["cast"], relationship: ["castA", "castB"] }[k.kind];
  if (!links) return edges;
  const fields = fabulaKindFields(state, k.kind);
  (Array.isArray(fab[k.slice]) ? fab[k.slice] : []).forEach(r => {
    if (!r || !r.id) return;
    links.forEach(fid => {
      const f = fields.find(x => x.id === fid);
      const v = (r.fields || {})[fid];
      (Array.isArray(v) ? v : [v]).forEach(t => { if (typeof t === "string" && t) edges.push({ source: r.id, target: t, label: f ? f.label : fid, kind: "directed" }); });
    });
  });
  return edges;
};'''),
    ('''const fabulaTemplate = (state, kind) => {
  const k = FABULA_KINDS.find(x => x.kind === kind);
  const stored = state.fabula && state.fabula.schemas && state.fabula.schemas[kind];
  const s = stored && Array.isArray(stored.fields) ? stored : fabulaSeedSchemas(state.templates || [])[kind];
  return { id: k.id, name: k.label, icon: "\\u2042", color: k.color, kind: `fabula-${kind}`, fields: fabulaLiveFields(s.fields, state.templates || []), nameHelp: s.nameHelp };
};''',
     '''const fabulaTemplate = (state, kind, ctx) => {
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
  return { id: k.id, name: k.label, icon: "\\u2042", color: k.color, kind: `fabula-${kind}`, fields, nameHelp: s.nameHelp };
};'''),
    ('''          if (confirm(`Delete the story "${st.name || "untitled story"}"?`)) onDeleteStory(st.id);''',
     '''          if (confirm(fabulaStoryDeleteMessage(state, st))) onDeleteStory(st.id);'''),
    ('''  { id: "people", label: "People", built: false, holds: "the story's cast, their arcs, and their relationships" },''',
     '''  { id: "people", label: "People", built: true, holds: "the story's cast, their arcs, and their relationships" },'''),
    ('''function FabulaStoryTabs({ active }) {
  return (
    <div role="tablist" aria-label="Story sections" style={{ display: "flex", flexWrap: "wrap", borderBottom: "1px solid var(--border)", margin: "0 0 22px" }}>
      {FABULA_STORY_TABS.map(t => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={on}
            aria-disabled={t.built ? undefined : "true"}
            title={t.built ? undefined : `Not built yet: ${t.holds}.`}
            style={{ padding: "8px 14px", border: "none", background: "transparent", fontFamily: "inherit", fontSize: 13, color: on ? "var(--text)" : "var(--text-dim)", fontWeight: on ? 600 : 400, borderBottom: on ? "2px solid var(--accent)" : "2px solid transparent", marginBottom: -1, cursor: t.built ? "pointer" : "default", opacity: t.built ? 1 : 0.45 }}
          >''',
     '''// A built tab switches the page (v1.7 r009); while the Story record is in
// edit there's no onSelect, and the other tabs wait for Save or Cancel.
function FabulaStoryTabs({ active, onSelect }) {
  return (
    <div role="tablist" aria-label="Story sections" style={{ display: "flex", flexWrap: "wrap", borderBottom: "1px solid var(--border)", margin: "0 0 22px" }}>
      {FABULA_STORY_TABS.map(t => {
        const on = t.id === active;
        const usable = t.built && (on || !!onSelect);
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={on}
            aria-disabled={usable ? undefined : "true"}
            title={!t.built ? `Not built yet: ${t.holds}.` : !usable ? "Save or cancel the Story's edit first." : undefined}
            onClick={usable && !on ? () => onSelect(t.id) : undefined}
            style={{ padding: "8px 14px", border: "none", background: "transparent", fontFamily: "inherit", fontSize: 13, color: on ? "var(--text)" : "var(--text-dim)", fontWeight: on ? 600 : 400, borderBottom: on ? "2px solid var(--accent)" : "2px solid transparent", marginBottom: -1, cursor: usable && !on ? "pointer" : "default", opacity: usable ? 1 : 0.45 }}
          >'''),
    ('''// The page itself: the Story record in view or, with a draft, in edit.
function FabulaStoryPage({ state, story, draft, onDraftChange, isLocked, folds, onToggleFold, onRestoreTemplate, showSecrets, allTags, dirHandle, flash, onOpenEntry, onSelectTag, onUpdateViewPrefs }) {
  const template = fabulaTemplate(state, "story");
  const tabs = <FabulaStoryTabs active="story" />;''',
     '''// The page itself: the Story record in view or, with a draft, in edit, and
// since v1.7's r009 the People tab.
function FabulaStoryPage({ state, story, draft, onDraftChange, tab, onSelectTab, onOpenRecord, onNewRecord, isLocked, folds, onToggleFold, onRestoreTemplate, showSecrets, allTags, dirHandle, flash, onOpenEntry, onSelectTag, onUpdateViewPrefs }) {
  const template = fabulaTemplate(state, "story");
  const active = draft ? "story" : (tab || "story");
  const tabs = <FabulaStoryTabs active={active} onSelect={draft ? null : onSelectTab} />;
  if (!draft && active === "people") {
    return (
      <EntryView
        entry={story}
        template={{ ...template, fields: [] }}
        templates={state.templates}
        entries={state.entries}
        onOpenEntry={onOpenEntry}
        onSelectTag={onSelectTag}
        showSecrets={showSecrets}
        imageFolder={state.world.imageFolder}
        dirHandle={dirHandle}
        calendar={getCalendar(state, null)}
        state={state}
        onUpdateViewPrefs={onUpdateViewPrefs}
        canvasSlot={<>{tabs}<FabulaPeopleTab state={state} story={story} isLocked={isLocked} onOpenRecord={onOpenRecord} onNewRecord={onNewRecord} /></>}
      />
    );
  }'''),
])

PEOPLE = header("Fabula: People (v1.7 r009)") + '''
// People (docs/fabula-spec.md, section 4, Drak's calls of 2026-10-25): the
// story's cast, arcs, and relationships, each opening on a page of its own
// over the story's page, a reference to one opening it as a reference to an
// entry opens the entry. A delete never takes another record with it: it
// counts what points at the record and clears those references. A deleted
// world entry is cleaned out of Fabula the way it's cleaned out of entries,
// and a cast record whose character it was stays, marked (spec, section 9).

// A kind's record in a sentence, one or many; add names its + New button.
const FABULA_NOUNS = {
  corpus: { one: "corpus", many: "corpora" },
  story: { one: "story", many: "stories" },
  cast: { one: "cast record", many: "cast records", add: "Cast" },
  arc: { one: "arc", many: "arcs", add: "Arc" },
  relationship: { one: "relationship", many: "relationships", add: "Relationship" },
  plotPoint: { one: "plot point", many: "plot points" },
  promise: { one: "promise and payoff", many: "promises and payoffs" },
  part: { one: "part", many: "parts" },
  chapter: { one: "chapter", many: "chapters" },
  scene: { one: "scene", many: "scenes" },
  research: { one: "research note", many: "research notes" },
};

// The kinds whose records have pages of their own, so a reference opens one.
const FABULA_PAGE_KINDS = ["cast", "arc", "relationship"];

// A cast list's order: by Importance, then by name.
const FABULA_IMPORTANCE = ["Main", "Secondary", "Minor"];

const fabulaCount = (kind, n) => `${n} ${n === 1 ? FABULA_NOUNS[kind].one : FABULA_NOUNS[kind].many}`;

const fabulaJoin = (parts) => parts.length <= 1 ? (parts[0] || "")
  : parts.length === 2 ? `${parts[0]} and ${parts[1]}`
  : `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;

// A kind's fields as stored, or the seed's: what the cleaning and the
// counting walk. Neither needs the targets worked out.
const fabulaKindFields = (state, kind) => {
  const stored = state && state.fabula && state.fabula.schemas && state.fabula.schemas[kind];
  if (stored && Array.isArray(stored.fields)) return stored.fields;
  const seeded = fabulaSeedSchemas((state && state.templates) || [])[kind];
  return seeded ? seeded.fields : [];
};

// Fabula with every reference to deletedIds cleared, through the same walk
// scrubEntryRefs gives entries (groups and grids included). names maps a
// deleted entry's id to its name, for a cast record whose character it was:
// that record stays, its Character cleared and marked characterDeleted.
const scrubFabulaRefs = (state, deletedIds, names) => {
  const fab = state && state.fabula;
  if (!fab || !deletedIds || deletedIds.size === 0) return fab;
  const next = { ...fab };
  FABULA_KINDS.forEach(k => {
    const arr = Array.isArray(fab[k.slice]) ? fab[k.slice] : null;
    if (!arr || arr.length === 0) return;
    const tpl = { id: k.id, fields: fabulaKindFields(state, k.kind) };
    const marked = k.kind !== "cast" ? arr : arr.map(r => {
      const c = r && r.fields && r.fields.character;
      return typeof c === "string" && deletedIds.has(c) ? { ...r, characterDeleted: { name: (names && names.get(c)) || "" } } : r;
    });
    next[k.slice] = scrubEntryRefs(marked.map(r => ({ ...r, templateId: k.id })), [tpl], deletedIds).map(({ templateId, ...r }) => r);
  });
  return next;
};

// How many of each kind's records point at id: [[kind, n]], for a delete's
// confirmation.
const fabulaInboundCounts = (state, id) => {
  const fab = (state && state.fabula) || {};
  return FABULA_KINDS.map(k => {
    const arr = (Array.isArray(fab[k.slice]) ? fab[k.slice] : []).filter(r => r && r.id !== id);
    const tpl = { id: k.id, fields: fabulaKindFields(state, k.kind) };
    return [k.kind, countInboundEntryRefs(arr.map(r => ({ ...r, templateId: k.id })), [tpl], id)];
  }).filter(([, n]) => n > 0);
};

const fabulaRecordDeleteMessage = (state, kind, rec) => {
  const head = `Delete the ${FABULA_NOUNS[kind].one} "${rec.name || "untitled"}"?`;
  const counts = fabulaInboundCounts(state, rec.id);
  if (counts.length === 0) return head;
  const total = counts.reduce((a, [, n]) => a + n, 0);
  const said = fabulaJoin(counts.map(([kk, n]) => kk === "story" ? "the story" : fabulaCount(kk, n)));
  return `${head} ${said.charAt(0).toUpperCase()}${said.slice(1)} ${total === 1 ? "points" : "point"} at it; ${total === 1 ? "it stays" : "they stay"}, without it.`;
};

// What deleting a story takes with it: its own records, by kind.
const fabulaStoryDeleteMessage = (state, story) => {
  const fab = (state && state.fabula) || {};
  const counts = FABULA_KINDS.filter(k => k.kind !== "corpus" && k.kind !== "story")
    .map(k => [k.kind, (Array.isArray(fab[k.slice]) ? fab[k.slice] : []).filter(r => r && r.storyId === story.id).length])
    .filter(([, n]) => n > 0);
  const head = `Delete the story "${story.name || "untitled story"}"?`;
  if (counts.length === 0) return head;
  const one = counts.length === 1 && counts[0][1] === 1;
  return `${head} Its ${fabulaJoin(counts.map(([kk, n]) => fabulaCount(kk, n)))} ${one ? "goes" : "go"} with it.`;
};

// Fabula's slices below the story level without one story's records.
const fabulaDropStoryRecords = (fab, storyId) => Object.fromEntries(
  FABULA_KINDS.filter(k => k.kind !== "corpus" && k.kind !== "story")
    .map(k => [k.slice, (Array.isArray(fab[k.slice]) ? fab[k.slice] : []).filter(r => !r || r.storyId !== storyId)])
);

// A record with a page of its own, found by id: { kind, record } or null.
const fabulaFindRecord = (state, id) => {
  const fab = (state && state.fabula) || {};
  for (const kind of FABULA_PAGE_KINDS) {
    const k = FABULA_KINDS.find(x => x.kind === kind);
    const record = (Array.isArray(fab[k.slice]) ? fab[k.slice] : []).find(r => r && r.id === id);
    if (record) return { kind, record };
  }
  return null;
};

// Whether a reference to a record of this source opens it (resolveRefTarget).
const fabulaRecordOpens = (sourceId) => FABULA_KINDS.some(k => k.id === sourceId && FABULA_PAGE_KINDS.includes(k.kind));

// A cast record's name follows the character picked while it's still blank or
// still the last character's name; a name of the user's own stays.
const fabulaCastNameFill = (state, prev, next) => {
  const was = (prev.fields || {}).character, now = (next.fields || {}).character;
  if (!now || now === was) return next;
  const nameOf = (id) => { const e = (state.entries || []).find(x => x.id === id); return e ? e.name : ""; };
  const prevName = (prev.name || "").trim();
  if (prevName && prevName !== nameOf(was)) return next;
  return { ...next, name: nameOf(now) || next.name };
};

// The People tab: the story's cast, by importance and then name, its arcs,
// and its relationships, each list with its + New. A row's details sit to
// the right of its name and drop under it when the two don't fit, each dot
// kept with the detail before it.
function FabulaPeopleTab({ state, story, isLocked, onOpenRecord, onNewRecord }) {
  const fab = state.fabula || {};
  const mine = (slice) => (Array.isArray(fab[slice]) ? fab[slice] : []).filter(r => r && r.id && r.storyId === story.id);
  const byName = (a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
  const castById = new Map(mine("cast").map(c => [c.id, c]));
  const castName = (id) => { const c = typeof id === "string" && castById.get(id); return c ? (c.name || "(unnamed)") : null; };
  const rank = (c) => { const i = FABULA_IMPORTANCE.indexOf(formatSelectDisplay((c.fields || {}).importance)); return i === -1 ? FABULA_IMPORTANCE.length : i; };
  const many = (v) => (Array.isArray(v) ? v : []).filter(Boolean).join(", ");
  const cast = mine("cast").slice().sort((a, b) => rank(a) - rank(b) || byName(a, b));
  const arcs = mine("arcs").slice().sort(byName);
  const rels = mine("relationships").slice().sort(byName);
  const meta = {
    cast: (c) => [formatSelectDisplay((c.fields || {}).importance), many((c.fields || {}).role), c.characterDeleted ? "character deleted" : null],
    arc: (a) => {
      const f = a.fields || {};
      const names = (Array.isArray(f.cast) ? f.cast : []).map(castName).filter(Boolean);
      return [names.length ? fabulaJoin(names) : "no cast", formatSelectDisplay(f.arcType), formatSelectDisplay(f.status)];
    },
    relationship: (r) => {
      const f = r.fields || {};
      const a = castName(f.castA), b = castName(f.castB);
      return [a || b ? `${a || "?"} and ${b || "?"}` : "no cast", many(f.kind)];
    },
  };
  const section = (title, kind, items, empty) => (
    <div className="fabula-people-section" data-kind={kind} style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
        <div className="field-label"><span>{title}</span></div>
        {!isLocked && <button className="btn" style={{ padding: "3px 10px", fontSize: 12 }} onClick={() => onNewRecord(kind)}>+ New {FABULA_NOUNS[kind].add}</button>}
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--text-dim)", fontStyle: "italic" }}>{empty}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 1, border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
          {items.map(r => (
            <div
              key={r.id}
              className="stemma-index-row fabula-record-row"
              role="button"
              tabIndex={0}
              title={`Open this ${FABULA_NOUNS[kind].one}`}
              onClick={() => onOpenRecord(kind, r.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenRecord(kind, r.id); } }}
              style={{ padding: "10px 16px", background: "var(--surf)", display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 12, rowGap: 2, cursor: "pointer" }}
            >
              <div style={{ fontSize: 15, fontWeight: 500, minWidth: 0, overflowWrap: "anywhere" }}>{r.name || "(untitled)"}</div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginLeft: "auto", minWidth: 0, textAlign: "right", overflowWrap: "anywhere" }}>{meta[kind](r).filter(Boolean).join("\\u00a0\\u00b7 ")}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
  return (
    <div className="fabula-people">
      {section("Cast", "cast", cast, "No cast yet.")}
      {section("Arcs", "arc", arcs, "No arcs yet.")}
      {section("Relationships", "relationship", rels, "No relationships yet.")}
    </div>
  );
}

// A cast record's, an arc's, or a relationship's page, over its story's: its
// fields in view or, with a draft, in edit, its pickers offering the story's
// own records. A cast record whose character was deleted says so.
function FabulaRecordPage({ state, kind, record, draft, onDraftChange, storyId, isLocked, onRestoreTemplate, showSecrets, allTags, dirHandle, flash, onOpenEntry, onSelectTag, onUpdateViewPrefs }) {
  const template = fabulaTemplate(state, kind, { storyId, recordId: record.id });
  const gone = kind === "cast" ? record.characterDeleted : null;
  const note = gone ? (
    <div className="fabula-character-deleted" style={{ margin: "0 0 18px", padding: "10px 14px", border: "1px solid var(--border)", borderLeft: "2px solid var(--danger)", borderRadius: 3, fontSize: 13, color: "var(--text)" }}>
      Character deleted{gone.name ? ` (was ${gone.name})` : ""}. {draft ? "Pick another below, or cancel and delete this cast record." : "Edit to pick another, or delete this cast record."}
    </div>
  ) : null;
  if (draft) {
    return (
      <EntryForm
        draft={draft}
        template={template}
        entries={state.entries}
        templates={state.templates}
        bodies={state.celestialBodies}
        registeredNodes={fabulaStoryNodes(state, storyId)}
        onChange={(d) => onDraftChange(kind === "cast" ? fabulaCastNameFill(state, draft, d) : d)}
        showSecrets={showSecrets}
        imageFolder={state.world.imageFolder}
        allTags={allTags}
        dirHandle={dirHandle}
        calendar={getCalendar(state, null)}
        primaryCalendar={state.world.calendar}
        additionalCalendars={[]}
        selfEntryId={draft.id}
        flash={flash}
        hideTags
        canvasSlot={note}
        onRestoreTemplate={isLocked ? undefined : onRestoreTemplate}
      />
    );
  }
  return (
    <EntryView
      entry={record}
      template={template}
      templates={state.templates}
      entries={state.entries}
      onOpenEntry={onOpenEntry}
      onSelectTag={onSelectTag}
      showSecrets={showSecrets}
      imageFolder={state.world.imageFolder}
      dirHandle={dirHandle}
      calendar={getCalendar(state, null)}
      state={state}
      onUpdateViewPrefs={onUpdateViewPrefs}
      canvasSlot={note}
    />
  );
}'''

t27 = p27.read_text(encoding="utf-8")
end = '''      canvasSlot={tabs}
      {...panelProps}
    />
  );
}'''
assert not t27.endswith("\n") and t27.endswith(end), "27_trunk.jsx no longer ends the way this cut expects"
p27.write_text(t27 + "\n\n" + PEOPLE, encoding="utf-8")

print("v1.7 r009 applied: 12, 13, 14, 24_ephemeris/01_shell, 27")
