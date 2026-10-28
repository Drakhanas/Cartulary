
// ─── Fabula: the story page (v1.7 r008) ────────────────────────────────────────
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
  { id: "people", label: "People", built: true, holds: "the story's cast, their arcs, and their relationships" },
  { id: "plot", label: "Plot", built: true, holds: "the story's plot threads, plot points, and promises and payoffs" },
  { id: "outline", label: "Outline", built: true, holds: "the story's parts, chapters, and scenes, as one ordered tree" },
  { id: "meaning", label: "Meaning", built: true, holds: "the themes and motifs the Premise panel lists" },
  { id: "notes", label: "Notes", built: true, holds: "the story's research notes" },
  { id: "timeline", label: "Timeline", built: true, holds: "the story's own timeline, kept apart from Chronometric" },
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
// the kind (emptyNote). Since v1.7's r012 a link to acts, chapters, or
// scenes keeps the order its records come in (keepOrder), the outline's
// (fabulaStoryNodes), where other pickers sort by name. Since r016 a name of
// Plot Thread's or Theme / Motif's finds the template flagged for it, and
// finds by name only where no template carries the flag.
const fabulaLiveFields = (fields, templates) => {
  const { byName } = refTargetIndex(templates, false);
  const live = new Set([...templates.map(t => t && t.id).filter(Boolean), ...NODE_SOURCE_REGISTRY.map(src => src.id)]);
  const builtinHere = new Set(templates.filter(t => t && t.origin === TEMPLATE_ORIGIN.BUILTIN).map(t => t.name));
  const walk = (list) => (Array.isArray(list) ? list : []).map(fl => {
    if (!fl || typeof fl !== "object") return fl;
    let out = fl;
    if (fl.type === "entry-ref" && fl.fabulaScope) {
      const k = FABULA_KINDS.find(x => (fl.refTemplatesId || []).includes(x.id));
      if (k) out = { ...fl, emptyNote: `This story has no ${k.plural} yet.`, ...(FABULA_OUTLINE_KINDS.includes(k.kind) ? { keepOrder: true } : {}) };
    } else if (fl.type === "entry-ref" && Array.isArray(fl.refTemplates) && fl.refTemplates.length > 0) {
      const kept = (Array.isArray(fl.refTemplatesId) ? fl.refTemplatesId : []).filter(id => live.has(id));
      const named = fl.refTemplates.map(n => { const role = fabulaRoleOfName(n); const own = role ? fabulaRoleTemplate(templates, role) : null; return own ? own.id : byName[n]; }).filter(Boolean);
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
// Since v1.7's r012 its pages' references read from it too, and its acts,
// chapters, and scenes come last, in the outline's order, each named with
// where it sits ("II.4.A The gate"), so a reference says where it points and
// a picker that keeps this order lists them as the outline does. Each keeps
// its position and its own name apart too (place), for a chip to draw the
// position quieter than the name, as the outline draws its numbers, so a
// scene at the story's own level doesn't read as "A Prologue".
const fabulaStoryNodes = (state, storyId) => {
  const fab = state.fabula || {};
  const kindIds = new Set(FABULA_KINDS.map(k => k.id));
  const inStory = new Set();
  FABULA_KINDS.forEach(k => (Array.isArray(fab[k.slice]) ? fab[k.slice] : []).forEach(r => { if (r && r.id && r.storyId === storyId) inStory.add(r.id); }));
  const nodes = getRegisteredGraphNodes(state).filter(n => !kindIds.has(n.templateId) || inStory.has(n.id));
  const places = fabulaOutlinePlaces(state, storyId);
  const placed = nodes.filter(n => places.has(n.id))
    .sort((a, b) => places.get(a.id).index - places.get(b.id).index)
    .map(n => { const path = places.get(n.id).path; return { ...n, name: `${path} ${n.name}`, place: { path, name: n.name } }; });
  return [...nodes.filter(n => !places.has(n.id)), ...placed];
};

// A built tab switches the page (v1.7 r009); while the Story record is in
// edit there's no onSelect, and the other tabs wait for Save or Cancel.
function FabulaStoryTabs({ active, onSelect }) {
  return (
    <div role="tablist" aria-label="Story sections" style={{ display: "flex", flexWrap: "wrap", borderBottom: "1px solid var(--border)", margin: "0 auto 22px" }}>
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
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// The page itself: the Story record in view or, with a draft, in edit, and
// since v1.7's r009 the People tab, r011 the Outline tab, r013 the Plot tab,
// and r020 the Timeline tab.
function FabulaStoryPage({ state, story, draft, onDraftChange, tab, onSelectTab, onOpenRecord, onNewRecord, isLocked, folds, onToggleFold, outlineFolds, onToggleOutlineFold, onUpdateFabula, onCreateThread, onCreateTheme, onRestoreTemplate, showSecrets, allTags, dirHandle, flash, onOpenEntry, onSelectTag, onUpdateViewPrefs, timelinePrefs, onSetTimelinePrefs, onOpenRecordIn, onExport }) {
  const template = fabulaTemplate(state, "story");
  // v1.7 r023: the Export button on every tab opens the story's export, the
  // bible in HTML or Markdown (FabulaExportModal).
  const exportProps = onExport ? { onExportEntry: () => onExport(), exportTitle: FABULA_EXPORT_TITLE } : {};
  const active = draft ? "story" : (tab || "story");
  const tabs = <FabulaStoryTabs active={active} onSelect={draft ? null : onSelectTab} />;
  // A tab other than Story: the story's title over the tabs and the tab's
  // own content, People's lists (v1.7 r009), the Outline (r011), Plot
  // (r013), Notes (r014), Meaning (r015), or the Timeline (r020), which
  // since r022 fills the pane's width while the title and the tabs stay in
  // the reading column (wide).
  const tabPage = (content, wide) => (
    <EntryView
      wide={wide}
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
      canvasSlot={<>{tabs}{content}</>}
      {...exportProps}
    />
  );
  if (!draft && active === "people") {
    return tabPage(<FabulaPeopleTab state={state} story={story} isLocked={isLocked} onOpenRecord={onOpenRecord} onNewRecord={onNewRecord} />);
  }
  if (!draft && active === "outline") {
    return tabPage(<FabulaOutlineTab state={state} story={story} isLocked={isLocked} folds={outlineFolds} onToggleFold={onToggleOutlineFold} onOpenRecord={onOpenRecord} onUpdateFabula={onUpdateFabula} />);
  }
  if (!draft && active === "plot") {
    return tabPage(<FabulaPlotTab state={state} story={story} isLocked={isLocked} onOpenRecord={onOpenRecord} onNewRecord={onNewRecord} onOpenEntry={onOpenEntry} onUpdateFabula={onUpdateFabula} onCreateThread={onCreateThread} onRestoreTemplate={isLocked ? undefined : onRestoreTemplate} />);
  }
  if (!draft && active === "meaning") {
    return tabPage(<FabulaMeaningTab state={state} story={story} isLocked={isLocked} showSecrets={showSecrets} onOpenEntry={onOpenEntry} onUpdateFabula={onUpdateFabula} onCreateTheme={onCreateTheme} onRestoreTemplate={isLocked ? undefined : onRestoreTemplate} />);
  }
  if (!draft && active === "notes") {
    return tabPage(<FabulaNotesTab state={state} story={story} isLocked={isLocked} onOpenRecord={onOpenRecord} onNewRecord={onNewRecord} />);
  }
  if (!draft && active === "timeline") {
    return tabPage(<FabulaTimelineTab state={state} story={story} showSecrets={showSecrets} prefs={timelinePrefs} onSetPrefs={onSetTimelinePrefs || (() => {})}
      onOpenScene={(s) => (onOpenRecordIn ? onOpenRecordIn("scene", s.id, s.storyId) : onOpenRecord("scene", s.id))} onOpenEntry={onOpenEntry} />, true);
  }
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
      registeredNodes={fabulaStoryNodes(state, story.id)}
      canvasSlot={tabs}
      {...panelProps}
      {...exportProps}
    />
  );
}