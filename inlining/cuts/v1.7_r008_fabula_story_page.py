"""v1.7 r008: the story page, its tabs, and the Story tab's folding panels.

Drak's calls (2026-10-25), one per message, recorded in docs/fabula-spec.md
sections 3 and 4: every one of a story's seven tabs shows, the six not built
yet greyed out with a tooltip saying what each will hold; the Story tab's four
panels fold under their headings, and the folds belong to the browser, kept
with the app's other display settings, one set for every story; a reference
field to world templates follows their names, and one that finds none of its
targets says which template is missing and offers a Restore button for it;
and the fields that point at Fabula's own records show now, offering only the
story's own and saying so while there are none.

- 22_trunk: FABULA_KINDS gains each kind's plural, for that line.
- 13_form-engine-display: EntryView draws a template's fields in panels when
  it's given them, each under a heading that folds it (fieldPanelSegments,
  FieldPanelHeading); resolveRefTarget's comment, stale since r007, names
  what opens.
- 14_form-engine-edit: EntryForm draws panels the same way and passes
  onRestoreTemplate down; a group's subfields get the registered records and
  the restore too; EntryRefEditor offers nothing for a field none of whose
  templates the world has, says which, and offers the restore, and shows a
  field's emptyNote when it has nothing to offer.
- 12_trunk: a story's page over the Fabula page it was opened from, its
  draft, handlers, header, and body; the folds in the display settings; a
  Concordance click on a story opens its page.
- shell.html: a half-width label keeps room for its help line's dotted
  underline, which its clipping had cut off since help lines began.
- 27_trunk: a click on a story's row opens it; fabulaTemplate's reference
  fields follow their names (fabulaLiveFields); and, at the tail, the page,
  its tabs, its panels, and the registered records its pickers may offer.

Declared scope: 12_trunk, 13_form-engine-display, 14_form-engine-edit,
22_trunk, 27_trunk, and the shell. Declarations added: fieldPanelSegments, FieldPanelHeading,
FABULA_STORY_PANELS, FABULA_STORY_TABS, fabulaLiveFields, fabulaStoryNodes,
FabulaStoryTabs, FabulaStoryPage.

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given). Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r008_fabula_story_page.py
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


# ---------------------------------------------------------------- 22: plurals
PLURALS = [
    ("#d9a066", "corpora"), ("#e6c27a", "stories"), ("#d98f8f", "cast"),
    ("#c97b9b", "arcs"), ("#b98bc0", "relationships"), ("#8fa8d9", "plot points"),
    ("#7fb8c2", "promises and payoffs"), ("#a3b87f", "parts"), ("#c2b47f", "chapters"),
    ("#d6a07a", "scenes"), ("#a3a3ad", "research notes"),
]
edit(MODULES / "22_trunk.jsx", [
    ('''// kind's own name, where name says it's Fabula's; color is its node's in
// Concordance.
const FABULA_KINDS = [''',
     '''// kind's own name, where name says it's Fabula's; color is its node's in
// Concordance; plural is the label in a sentence ("This story has no cast
// yet.", v1.7 r008).
const FABULA_KINDS = ['''),
] + [(f'color: "{c}" }},', f'color: "{c}", plural: "{p}" }},') for c, p in PLURALS])

# ---------------------------------------------------------------- 13: panels in the entry view
edit(MODULES / "13_form-engine-display.jsx", [
    ('''function EntryView({ entry, template, templates, entries, onOpenEntry, onSelectTag, showSecrets, imageFolder, dirHandle, calendar, onExportEntry, state, onUpdateViewPrefs, canvasSlot }) {''',
     '''function EntryView({ entry, template, templates, entries, onOpenEntry, onSelectTag, showSecrets, imageFolder, dirHandle, calendar, onExportEntry, state, onUpdateViewPrefs, canvasSlot, panels, foldedPanels, onTogglePanel }) {'''),
    ('''      {canvasSlot}
      {buildFieldLayoutUnits(
        template.fields,
        (f) => isFieldVisibleDisplay(f, entry.fields || {}, showSecrets)
      ).map(unit => {''',
     '''      {canvasSlot}
      {fieldPanelSegments(template.fields, panels).map(seg => {
        // v1.7 r008: fields under panels, each heading folding its own; a
        // template without panels is one segment, drawn as before.
        const units = buildFieldLayoutUnits(
        seg.fields,
        (f) => isFieldVisibleDisplay(f, entry.fields || {}, showSecrets)
      ).map(unit => {'''),
    ('''        );
      })}
    </div>
  );
}

// Renders a single-line text value with `[[Name]]` and `[[Name|display]]` wiki-link''',
     '''        );
      });
        if (!seg.panel) return <React.Fragment key="fields">{units}</React.Fragment>;
        const folded = !!(foldedPanels && foldedPanels[seg.panel.id]);
        // An empty field doesn't show here, so an open panel with none filled
        // in says so rather than leaving its heading bare.
        return (
          <React.Fragment key={`panel-${seg.panel.id}`}>
            <FieldPanelHeading panel={seg.panel} folded={folded} onToggle={onTogglePanel} />
            {!folded && (units.length > 0 ? units : <div className="field-hint field-panel-empty" style={{ marginTop: -8, marginBottom: 22 }}>Nothing in {seg.panel.label} yet.</div>)}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// v1.7 r008: a template's fields as segments for drawing, the fields that
// belong to no panel first and then each panel's own, in the panels' order,
// so a half-width pair never straddles a heading. Without panels the whole
// list is one segment, drawn as it always was. A field names its panel by id
// (field.panel); panels are [{ id, label }], given by the caller.
const fieldPanelSegments = (fields, panels) => {
  const all = Array.isArray(fields) ? fields : [];
  if (!Array.isArray(panels) || panels.length === 0) return [{ panel: null, fields: all }];
  const known = new Set(panels.map(p => p.id));
  return [
    { panel: null, fields: all.filter(f => !(f && known.has(f.panel))) },
    ...panels.map(p => ({ panel: p, fields: all.filter(f => f && f.panel === p.id) })),
  ];
};

// A panel's heading, which folds the panel away and back (v1.7 r008). The
// folds are the caller's to keep.
function FieldPanelHeading({ panel, folded, onToggle }) {
  return (
    <button
      type="button"
      className="field-panel-heading"
      aria-expanded={!folded}
      onClick={() => { if (onToggle) onToggle(panel.id); }}
      title={folded ? `Show the ${panel.label} panel` : `Fold the ${panel.label} panel away`}
      style={{ display: "flex", alignItems: "baseline", gap: 10, width: "100%", margin: "30px 0 18px", padding: "0 0 8px", background: "transparent", border: "none", borderBottom: "1px solid var(--border)", color: "var(--text-bright)", fontFamily: "'Cormorant Garamond', serif", fontSize: "calc(22px * var(--font-scale))", fontWeight: 500, textAlign: "left", cursor: "pointer" }}
    >
      <span aria-hidden="true" style={{ color: "var(--accent)", fontFamily: "'DM Sans', sans-serif", fontSize: "calc(12px * var(--font-scale))", width: 12, flexShrink: 0 }}>{folded ? "\\u25B8" : "\\u25BE"}</span>
      <span>{panel.label}</span>
    </button>
  );
}

// Renders a single-line text value with `[[Name]]` and `[[Name|display]]` wiki-link'''),
    ('''// v1.7 r003: what a reference value points at, for display: an entry, a body,
// or another registered record (a Glossopoeia record, a map), or null when
// nothing has its id. `open` says whether a click can take you there:
// openEntryFromAnywhere knows entries, maps, and bodies, and a Glossopoeia
// record has no route yet, so it shows as a plain chip (Drak, 2026-10-24).
// `kind` names the record's type for a chip that can't be opened.''',
     '''// v1.7 r003: what a reference value points at, for display: an entry, a body,
// or another registered record (a Glossopoeia record, a map, and since r007 a
// Fabula record), or null when nothing has its id. `open` says whether a
// click can take you there: entries, maps, and bodies open; a Glossopoeia
// record has no route yet, so it shows as a plain chip (Drak, 2026-10-24),
// and a Fabula record shows as one too until People settles whether a
// reference opens it (v1.7 r008). `kind` names the record's type for a chip
// that can't be opened.'''),
])

# ---------------------------------------------------------------- 14: panels in the form, the picker's lines
edit(MODULES / "14_form-engine-edit.jsx", [
    ('''function EntryForm({ draft, template, entries, templates, bodies, registeredNodes, onChange, showSecrets, imageFolder, allTags, dirHandle, calendar, primaryCalendar, selfEntryId, flash, previewMode, additionalCalendars, ipaSymbols, canvasSlot, hideTags }) {''',
     '''function EntryForm({ draft, template, entries, templates, bodies, registeredNodes, onChange, showSecrets, imageFolder, allTags, dirHandle, calendar, primaryCalendar, selfEntryId, flash, previewMode, additionalCalendars, ipaSymbols, canvasSlot, hideTags, panels, foldedPanels, onTogglePanel, onRestoreTemplate }) {'''),
    ('''        return buildFieldLayoutUnits(
          template.fields,
          (f) => isFieldVisibleEdit(f, draft.fields, showSecrets)
        ).map(unit => {''',
     '''        // v1.7 r008: fields under panels, each heading folding its own, as
        // EntryView draws them; a template without panels is one segment.
        return fieldPanelSegments(template.fields, panels).map(seg => {
        const units = buildFieldLayoutUnits(
          seg.fields,
          (f) => isFieldVisibleEdit(f, draft.fields, showSecrets)
        ).map(unit => {'''),
    ('''        );
        });
      })()}
    </div>
  );
}

// Single-line text input with wiki-link autocomplete.''',
     '''        );
        });
        if (!seg.panel) return <React.Fragment key="fields">{units}</React.Fragment>;
        const folded = !!(foldedPanels && foldedPanels[seg.panel.id]);
        return (
          <React.Fragment key={`panel-${seg.panel.id}`}>
            <FieldPanelHeading panel={seg.panel} folded={folded} onToggle={onTogglePanel} />
            {!folded && units}
          </React.Fragment>
        );
        });
      })()}
    </div>
  );
}

// Single-line text input with wiki-link autocomplete.'''),
    ('''allFieldValues={draft.fields} tplFields={template.fields} flash={flash} ipaSymbols={ipaSymbols} />''',
     '''allFieldValues={draft.fields} tplFields={template.fields} flash={flash} ipaSymbols={ipaSymbols} onRestoreTemplate={onRestoreTemplate} />''', 3),
    ('''function FieldEditor({ field, value, onChange, entries, templates, bodies, registeredNodes, imageFolder, dirHandle, calendar, selfEntryId, allFieldValues, tplFields, flash, ipaSymbols }) {''',
     '''function FieldEditor({ field, value, onChange, entries, templates, bodies, registeredNodes, imageFolder, dirHandle, calendar, selfEntryId, allFieldValues, tplFields, flash, ipaSymbols, onRestoreTemplate }) {'''),
    ('''  if (ftype === "entry-ref") return <EntryRefEditor field={field} value={value} onChange={onChange} entries={entries} templates={templates} bodies={bodies} registeredNodes={registeredNodes} selfEntryId={selfEntryId} calendar={calendar} />;''',
     '''  if (ftype === "entry-ref") return <EntryRefEditor field={field} value={value} onChange={onChange} entries={entries} templates={templates} bodies={bodies} registeredNodes={registeredNodes} selfEntryId={selfEntryId} calendar={calendar} onRestoreTemplate={onRestoreTemplate} />;'''),
    ('''  if (ftype === "group") return <GroupEditor field={field} value={value || []} onChange={onChange} entries={entries} templates={templates} bodies={bodies} imageFolder={imageFolder} dirHandle={dirHandle} calendar={calendar} selfEntryId={selfEntryId} flash={flash} ipaSymbols={ipaSymbols} />;''',
     '''  if (ftype === "group") return <GroupEditor field={field} value={value || []} onChange={onChange} entries={entries} templates={templates} bodies={bodies} registeredNodes={registeredNodes} imageFolder={imageFolder} dirHandle={dirHandle} calendar={calendar} selfEntryId={selfEntryId} flash={flash} ipaSymbols={ipaSymbols} onRestoreTemplate={onRestoreTemplate} />;'''),
    ('''function EntryRefEditor({ field, value, onChange, entries, templates, bodies, registeredNodes, selfEntryId, calendar }) {''',
     '''function EntryRefEditor({ field, value, onChange, entries, templates, bodies, registeredNodes, selfEntryId, calendar, onRestoreTemplate }) {'''),
    ('''  const candidates = useMemo(() => {
    let pool = entries;''',
     '''  const candidates = useMemo(() => {
    // v1.7 r008: a field none of whose templates the world has offers
    // nothing, where an empty target list would read as any template.
    if (Array.isArray(field.refMissing) && field.refMissing.length > 0) return [];
    let pool = entries;'''),
    ('''  }, [entries, bodies, registeredNodes, field.refTemplatesId, field.refTemplateId, field.refFilters, selfEntryId, tplById]);''',
     '''  }, [entries, bodies, registeredNodes, field.refTemplatesId, field.refTemplateId, field.refFilters, field.refMissing, selfEntryId, tplById]);'''),
    ('''  const isSpouse = field.relationKind === SPOUSE_KIND;
''',
     '''  const isSpouse = field.relationKind === SPOUSE_KIND;
  // v1.7 r008: what the picker says in place of its list. A field none of
  // whose templates the world has names them, with a Restore button for each
  // missing built-in (refMissing and refRestorable, which Fabula's
  // fabulaLiveFields sets); a field with nothing to offer yet can say why
  // (emptyNote).
  const missing = Array.isArray(field.refMissing) ? field.refMissing : [];
  const restorable = Array.isArray(field.refRestorable) ? field.refRestorable : [];
  const refNote = missing.length > 0 ? (
    <div className="field-hint ref-missing-note" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
      <span>{missing.length === 1 ? `This world has no ${missing[0]} template.` : `This world has none of this field's templates: ${missing.join(", ")}.`}</span>
      {onRestoreTemplate && restorable.map(name => (
        <button key={name} type="button" className="btn" style={{ padding: "2px 8px", fontSize: 12, fontStyle: "normal" }} onClick={() => onRestoreTemplate(name)} title={`Bring back the built-in ${name} template, as Restore Built-ins in the sidebar does`}>Restore {name}</button>
      ))}
    </div>
  ) : (sorted.length === 0 && field.emptyNote ? <div className="field-hint ref-empty-note">{field.emptyNote}</div> : null);
'''),
    ('''        <select className="input" value="" onChange={e => addOne(e.target.value)}>
          <option value="">+ Add reference...</option>
          {available.map(e => <option key={e.id} value={e.id}>{formatEntryLabel(e)}</option>)}
        </select>
      </>''',
     '''        {refNote || (
        <select className="input" value="" onChange={e => addOne(e.target.value)}>
          <option value="">+ Add reference...</option>
          {available.map(e => <option key={e.id} value={e.id}>{formatEntryLabel(e)}</option>)}
        </select>
        )}
      </>'''),
    ('''                : (typeof value === "string" && value ? { id: value } : null);
    return (''',
     '''                : (typeof value === "string" && value ? { id: value } : null);
    if (refNote && !item) return refNote;
    return ('''),
    ('''  return (
    <select className="input" value={value || ""} onChange={e => onChange(e.target.value)}>''',
     '''  if (refNote && !value) return refNote;
  return (
    <select className="input" value={value || ""} onChange={e => onChange(e.target.value)}>'''),
    ('''function GroupEditor({ field, value, onChange, entries, templates, bodies, imageFolder, dirHandle, calendar, selfEntryId, flash, ipaSymbols }) {''',
     '''// v1.7 r008: the subfields get the registered records and the restore too, so
// a reference subfield can offer a language, a map, or a Fabula record, as a
// top-level reference field can.
function GroupEditor({ field, value, onChange, entries, templates, bodies, registeredNodes, imageFolder, dirHandle, calendar, selfEntryId, flash, ipaSymbols, onRestoreTemplate }) {'''),
    ('''              <FieldEditor field={sf} value={inst[sf.id]} onChange={(v) => updateAt(i, sf.id, v)} entries={entries} templates={templates} bodies={bodies} imageFolder={imageFolder} dirHandle={dirHandle} calendar={calendar} selfEntryId={selfEntryId} allFieldValues={inst} tplFields={field.subfields || []} flash={flash} ipaSymbols={ipaSymbols} />''',
     '''              <FieldEditor field={sf} value={inst[sf.id]} onChange={(v) => updateAt(i, sf.id, v)} entries={entries} templates={templates} bodies={bodies} registeredNodes={registeredNodes} imageFolder={imageFolder} dirHandle={dirHandle} calendar={calendar} selfEntryId={selfEntryId} allFieldValues={inst} tplFields={field.subfields || []} flash={flash} ipaSymbols={ipaSymbols} onRestoreTemplate={onRestoreTemplate} />'''),
])

# ---------------------------------------------------------------- shell: half-width labels' help lines
edit(ROOT / "cartulary-src" / "shell.html", [
    (""".form-row .form-label,
.field-row .field-label{
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
""",
     """.form-row .form-label,
.field-row .field-label{
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
/* v1.7 r008: room under a half-width label for its help line's dotted
   underline, which the clipping above cut off; the spacing is unchanged. */
.form-row .form-label{padding-bottom:4px;margin-bottom:calc(var(--s-2) - 4px)}
"""),
])

# ---------------------------------------------------------------- 12: the story page in App
edit(MODULES / "12_trunk.jsx", [
    ('''  const initialCorpusDraftRef = useRef(null);
''',
     '''  const initialCorpusDraftRef = useRef(null);
  // v1.7 r008: a story's page. activeStoryId null = no story open, an id =
  // that story's page, drawn over the Fabula page it was opened from
  // (activeCorpusId: a corpus's page, or the index), which its Back returns
  // to. storyDraft is the Story record in edit, committed on Save.
  const [activeStoryId, setActiveStoryId] = useState(null);
  const [storyDraft, setStoryDraft] = useState(null);
  const initialStoryDraftRef = useRef(null);
'''),
    ('''    mapStrip: null, // the map editor's strip layout (r046), normalized where it is read
  });''',
     '''    mapStrip: null, // the map editor's strip layout (r046), normalized where it is read
    fabulaFolds: {}, // v1.7 r008: the Story tab's folded panels, one set for every story
  });'''),
    ('''            mapStrip: stored.mapStrip && typeof stored.mapStrip === "object" ? stored.mapStrip : null,
          });''',
     '''            mapStrip: stored.mapStrip && typeof stored.mapStrip === "object" ? stored.mapStrip : null,
            fabulaFolds: stored.fabulaFolds && typeof stored.fabulaFolds === "object" && !Array.isArray(stored.fabulaFolds) ? stored.fabulaFolds : {},
          });'''),
    ('''    if (corpusDraft && JSON.stringify(corpusDraft) !== initialCorpusDraftRef.current) return true;
''',
     '''    if (corpusDraft && JSON.stringify(corpusDraft) !== initialCorpusDraftRef.current) return true;
    if (storyDraft && JSON.stringify(storyDraft) !== initialStoryDraftRef.current) return true;
'''),
    ('''    const which = mapDraft ? "this map" : corpusDraft ? "this corpus" : entryDraft ? "this entry" : "this template";''',
     '''    const which = mapDraft ? "this map" : corpusDraft ? "this corpus" : storyDraft ? "this story" : entryDraft ? "this entry" : "this template";'''),
    ('''    setEntryDraft(null); setTplDraft(null); setMapDraft(null); setCorpusDraft(null);
''',
     '''    setEntryDraft(null); setTplDraft(null); setMapDraft(null); setCorpusDraft(null); setStoryDraft(null);
'''),
    ('''    initialCorpusDraftRef.current = null;
    clearTimeout(draftSaveTimerRef.current);''',
     '''    initialCorpusDraftRef.current = null;
    initialStoryDraftRef.current = null;
    clearTimeout(draftSaveTimerRef.current);'''),
    ('''    setActiveStemmaId(null); setFocalNodeId(null); setActiveMapId(null); setActiveCorpusId(null);
''',
     '''    setActiveStemmaId(null); setFocalNodeId(null); setActiveMapId(null); setActiveCorpusId(null); setActiveStoryId(null);
'''),
    ('''    // v1.7 r007: Fabula fallback. A corpus opens on its page; a story, whose
    // page comes in r008, opens its corpus's page, or the index when it's in
    // no corpus.''',
     '''    // v1.7 r007: Fabula fallback. A corpus opens on its page, and since r008
    // a story on its own, drawn over its corpus's page (or the index, when
    // it's in no corpus), which the story's Back returns to.'''),
    ('''      setCorpusDraft(null); initialCorpusDraftRef.current = null;
      setActiveCorpusId(fabStory ? (home ? home.id : null) : id);
      setView("fabula");''',
     '''      setCorpusDraft(null); initialCorpusDraftRef.current = null;
      setStoryDraft(null); initialStoryDraftRef.current = null;
      setActiveCorpusId(fabStory ? (home ? home.id : null) : id);
      setActiveStoryId(fabStory ? id : null);
      setView("fabula");'''),
    ('''        return { ...c, storyIds: ids, updatedAt: isoNow() };
      }),
    }));
  };

  const openEditEntry = () => {''',
     '''        return { ...c, storyIds: ids, updatedAt: isoNow() };
      }),
    }));
  };

  // v1.7 r008: a story's page (docs/fabula-spec.md, section 4). It opens over
  // the Fabula page it was opened from, which Back returns to, and the Story
  // record changes through Edit, Save, and Cancel, as a corpus's fields do.
  const openStory = (id) => {
    if (!confirmDiscardDraft()) return;
    setStoryDraft(null); initialStoryDraftRef.current = null;
    setActiveStoryId(id);
    setView("fabula");
  };

  const closeStory = () => {
    if (!confirmDiscardDraft()) return;
    setStoryDraft(null); initialStoryDraftRef.current = null;
    setActiveStoryId(null);
  };

  const editStory = () => {
    const rec = fabArr(state.fabula || {}, "stories").find(st => st.id === activeStoryId);
    if (!rec || isLocked) return;
    if (!confirmDiscardDraft()) return;
    const draft = { id: rec.id, name: rec.name || "", fields: JSON.parse(JSON.stringify(rec.fields || {})) };
    setStoryDraft(draft);
    initialStoryDraftRef.current = JSON.stringify(draft);
  };

  const saveStory = () => {
    if (!storyDraft || isLocked) return;
    const name = (storyDraft.name || "").trim();
    if (!name) return;
    const now = isoNow();
    updateFabula(fab => ({ ...fab, stories: fabArr(fab, "stories").map(st => st.id === storyDraft.id ? { ...st, name, fields: storyDraft.fields || {}, updatedAt: now } : st) }));
    setStoryDraft(null); initialStoryDraftRef.current = null;
    flash("Saved");
  };

  const cancelStoryEdit = () => {
    if (!confirmDiscardDraft()) return;
    setStoryDraft(null); initialStoryDraftRef.current = null;
  };

  // Delete, from the story's own page: asks first, then goes back.
  const deleteOpenStory = () => {
    const rec = fabArr(state.fabula || {}, "stories").find(st => st.id === activeStoryId);
    if (!rec || isLocked) return;
    if (!confirm(`Delete the story "${rec.name || "untitled story"}"?`)) return;
    deleteStory(rec.id);
    setStoryDraft(null); initialStoryDraftRef.current = null;
    setActiveStoryId(null);
  };

  // The Story tab's folds belong to the browser, one set for every story
  // (Drak, 2026-10-25), so they live with the display settings.
  const toggleFabulaFold = (panelId) => setPrefs(p => ({ ...p, fabulaFolds: { ...(p.fabulaFolds || {}), [panelId]: !(p.fabulaFolds || {})[panelId] } }));

  const openEditEntry = () => {'''),
    ('''    if (corpusDraft) headerTitle = (corpusDraft.name && corpusDraft.name.trim()) ? corpusDraft.name : "New Corpus";''',
     '''    if (activeStoryId) {
      const rec = ((state.fabula && state.fabula.stories) || []).find(st => st.id === activeStoryId);
      headerTitle = storyDraft ? ((storyDraft.name && storyDraft.name.trim()) ? storyDraft.name : "Story") : (rec?.name || "Story");
    }
    else if (corpusDraft) headerTitle = (corpusDraft.name && corpusDraft.name.trim()) ? corpusDraft.name : "New Corpus";'''),
    ('''              {view === "fabula" && corpusDraft && <>''',
     '''              {view === "fabula" && activeStoryId && storyDraft && <>
                <button className="btn btn-ghost" onClick={cancelStoryEdit}>Cancel</button>
                <button className="btn btn-accent" onClick={saveStory} disabled={!storyDraft?.name?.trim()}>Save</button>
              </>}
              {view === "fabula" && activeStoryId && !storyDraft && <>
                {!isLocked && <button className="btn btn-danger" onClick={deleteOpenStory}>Delete</button>}
                {!isLocked && <button className="btn btn-ghost" onClick={editStory}>Edit</button>}
                <button className="btn btn-ghost" onClick={closeStory}>← Back</button>
              </>}
              {view === "fabula" && corpusDraft && <>'''),
    ('''              {view === "fabula" && activeCorpusId && !corpusDraft && <>''',
     '''              {view === "fabula" && activeCorpusId && !corpusDraft && !activeStoryId && <>'''),
    ('''          {view === "fabula" && !activeCorpusId && !corpusDraft && (''',
     '''          {view === "fabula" && !activeCorpusId && !corpusDraft && !activeStoryId && ('''),
    ('''              onSetStoryCorpus={setStoryCorpus}
            />''',
     '''              onSetStoryCorpus={setStoryCorpus}
              onOpenStory={openStory}
            />'''),
    ('''          {view === "fabula" && activeCorpusId && !corpusDraft && (() => {''',
     '''          {view === "fabula" && activeCorpusId && !corpusDraft && !activeStoryId && (() => {'''),
    ('''                    onRenameStory={renameStory}
                  />''',
     '''                    onRenameStory={renameStory}
                    onOpenStory={openStory}
                  />'''),
    ('''          {view === "glossopoeia" && (
            <GlossopoeiaView''',
     '''          {view === "fabula" && activeStoryId && (() => {
            const rec = ((state.fabula && state.fabula.stories) || []).find(st => st.id === activeStoryId);
            if (!rec) {
              return (
                <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-dim)" }}>
                  This story no longer exists.
                  <div style={{ marginTop: 16 }}>
                    <button className="btn btn-ghost" onClick={closeStory}>← Back</button>
                  </div>
                </div>
              );
            }
            return (
              <FabulaStoryPage
                state={state}
                story={rec}
                draft={storyDraft}
                onDraftChange={setStoryDraft}
                isLocked={isLocked}
                folds={prefs.fabulaFolds}
                onToggleFold={toggleFabulaFold}
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
          {view === "glossopoeia" && (
            <GlossopoeiaView'''),
])

# ---------------------------------------------------------------- 27: rows open, live targets, the page
p27 = MODULES / "27_trunk.jsx"
edit(p27, [
    ('''// A kind's schema as the template EntryForm and EntryView take: the world's
// stored schema, or the seed when the world has none.''',
     '''// A kind's schema as the template EntryForm and EntryView take: the world's
// stored schema, or the seed when the world has none, its reference fields
// following their targets' names (fabulaLiveFields, v1.7 r008).'''),
    ('''fields: s.fields, nameHelp: s.nameHelp };''',
     '''fields: fabulaLiveFields(s.fields, state.templates || []), nameHelp: s.nameHelp };'''),
    ('''function FabulaStoryLine({ state, story }) {
  const counts = fabulaStoryCounts(state, story.id);
  const status = formatSelectDisplay((story.fields || {}).status);
  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>''',
     '''function FabulaStoryLine({ state, story, onOpen }) {
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
    <div className="fabula-story-line" {...open} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, cursor: onOpen ? "pointer" : undefined }}>'''),
    ('''function FabulaStoryRow({ state, story, isLocked, autoRename, onRename, onRenameEnd, leading, actions, trailing, rowProps }) {''',
     '''function FabulaStoryRow({ state, story, isLocked, autoRename, onRename, onRenameEnd, onOpen, leading, actions, trailing, rowProps }) {'''),
    ('''      ) : <FabulaStoryLine state={state} story={story} />}''',
     '''      ) : <FabulaStoryLine state={state} story={story} onOpen={onOpen} />}'''),
    ('''function FabulaIndexView({ state, isLocked, onOpenCorpus, onCreateCorpus, onCreateStory, onRenameStory, onDeleteStory, onSetStoryCorpus }) {''',
     '''function FabulaIndexView({ state, isLocked, onOpenCorpus, onCreateCorpus, onCreateStory, onRenameStory, onDeleteStory, onSetStoryCorpus, onOpenStory }) {'''),
    ('''      onRenameEnd={() => setJustMade(null)}
      actions={''',
     '''      onRenameEnd={() => setJustMade(null)}
      onOpen={onOpenStory}
      actions={'''),
    ('''function FabulaReadingOrder({ state, corpus, isLocked, onMoveStory, onCreateStory, onRenameStory }) {''',
     '''function FabulaReadingOrder({ state, corpus, isLocked, onMoveStory, onCreateStory, onRenameStory, onOpenStory }) {'''),
    ('''              onRenameEnd={() => setJustMade(null)}
              rowProps={isLocked ? null : {''',
     '''              onRenameEnd={() => setJustMade(null)}
              onOpen={onOpenStory}
              rowProps={isLocked ? null : {'''),
])

STORY_PAGE = header("Fabula: the story page (v1.7 r008)") + '''
// A story's page (docs/fabula-spec.md, section 4): its section tabs under its
// title and, on the Story tab, the Story record, its own fields first and then
// its four panels, each folding under its heading. The folds belong to the
// browser, one set for every story, so App keeps them with its other display
// settings (Drak, 2026-10-25). Every tab shows; one that isn't built yet is
// greyed out until the cut that builds it turns it on.
const FABULA_STORY_PANELS = [
  { id: "premise", label: "Premise" },
  { id: "genre", label: "Genre" },
  { id: "narration", label: "Narration" },
  { id: "setting", label: "Setting" },
];

// holds is what a tab will hold, which an unbuilt tab's tooltip says.
const FABULA_STORY_TABS = [
  { id: "story", label: "Story", built: true, holds: "the story's own fields and its four panels" },
  { id: "people", label: "People", built: false, holds: "the story's cast, their arcs, and their relationships" },
  { id: "plot", label: "Plot", built: false, holds: "the story's plot threads, plot points, and promises and payoffs" },
  { id: "outline", label: "Outline", built: false, holds: "the story's parts, chapters, and scenes, as one ordered tree" },
  { id: "meaning", label: "Meaning", built: false, holds: "the themes and motifs the Premise panel lists" },
  { id: "notes", label: "Notes", built: false, holds: "the story's research notes" },
  { id: "timeline", label: "Timeline", built: false, holds: "the story's own timeline, kept apart from Chronometric" },
];

// A schema's fields for a form, worked out each time one opens (Drak,
// 2026-10-25). A reference field to world templates follows their names:
// its targets are its stored ids that still exist plus whatever templates
// its names find now, the rule r002 gave templates, so a template deleted
// and brought back is found again, and nothing is written back to the
// schema. A field that finds none of its targets gets refMissing (its
// names) and refRestorable (the missing built-ins), for the picker to say so
// and offer the restore. A link to Fabula's own records keeps its kind's
// sentinel and gets the line its picker shows while the story has none of
// the kind (emptyNote).
const fabulaLiveFields = (fields, templates) => {
  const { byName } = refTargetIndex(templates, false);
  const live = new Set([...templates.map(t => t && t.id).filter(Boolean), ...NODE_SOURCE_REGISTRY.map(src => src.id)]);
  const builtinHere = new Set(templates.filter(t => t && t.origin === TEMPLATE_ORIGIN.BUILTIN).map(t => t.name));
  const walk = (list) => (Array.isArray(list) ? list : []).map(fl => {
    if (!fl || typeof fl !== "object") return fl;
    let out = fl;
    if (fl.type === "entry-ref" && fl.fabulaScope) {
      const k = FABULA_KINDS.find(x => (fl.refTemplatesId || []).includes(x.id));
      if (k) out = { ...fl, emptyNote: `This story has no ${k.plural} yet.` };
    } else if (fl.type === "entry-ref" && Array.isArray(fl.refTemplates) && fl.refTemplates.length > 0) {
      const kept = (Array.isArray(fl.refTemplatesId) ? fl.refTemplatesId : []).filter(id => live.has(id));
      const named = fl.refTemplates.map(n => byName[n]).filter(Boolean);
      const ids = [...new Set([...kept, ...named])];
      out = ids.length > 0
        ? { ...fl, refTemplatesId: ids }
        : { ...fl, refTemplatesId: [], refMissing: [...fl.refTemplates], refRestorable: fl.refTemplates.filter(n => BUILTIN_TEMPLATES.some(b => b.name === n) && !builtinHere.has(n)) };
    }
    if (Array.isArray(fl.subfields)) out = { ...out, subfields: walk(fl.subfields) };
    return out;
  });
  return walk(fields);
};

// The registered records a story's pickers may offer: everything that isn't
// Fabula's, and Fabula's own records from this story alone (spec, section 3).
const fabulaStoryNodes = (state, storyId) => {
  const fab = state.fabula || {};
  const kindIds = new Set(FABULA_KINDS.map(k => k.id));
  const inStory = new Set();
  FABULA_KINDS.forEach(k => (Array.isArray(fab[k.slice]) ? fab[k.slice] : []).forEach(r => { if (r && r.id && r.storyId === storyId) inStory.add(r.id); }));
  return getRegisteredGraphNodes(state).filter(n => !kindIds.has(n.templateId) || inStory.has(n.id));
};

function FabulaStoryTabs({ active }) {
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
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// The page itself: the Story record in view or, with a draft, in edit.
function FabulaStoryPage({ state, story, draft, onDraftChange, isLocked, folds, onToggleFold, onRestoreTemplate, showSecrets, allTags, dirHandle, flash, onOpenEntry, onSelectTag, onUpdateViewPrefs }) {
  const template = fabulaTemplate(state, "story");
  const tabs = <FabulaStoryTabs active="story" />;
  const panelProps = { panels: FABULA_STORY_PANELS, foldedPanels: folds || {}, onTogglePanel: onToggleFold };
  if (draft) {
    return (
      <EntryForm
        draft={draft}
        template={template}
        entries={state.entries}
        templates={state.templates}
        bodies={state.celestialBodies}
        registeredNodes={fabulaStoryNodes(state, story.id)}
        onChange={onDraftChange}
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
        canvasSlot={tabs}
        onRestoreTemplate={isLocked ? undefined : onRestoreTemplate}
        {...panelProps}
      />
    );
  }
  return (
    <EntryView
      entry={story}
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
      canvasSlot={tabs}
      {...panelProps}
    />
  );
}'''

t27 = p27.read_text(encoding="utf-8")
end = '''      )}
    </div>
  );
}'''
assert not t27.endswith("\n") and t27.endswith(end), "27_trunk.jsx no longer ends the way this cut expects"
p27.write_text(t27 + "\n\n" + STORY_PAGE, encoding="utf-8")

print("v1.7 r008 applied: 12, 13, 14, 22, 27, shell")
