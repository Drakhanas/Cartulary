"""v1.7 r011: Outline, a story's acts, chapters, and scenes as one tree, with
each scene's beats under it.

Drak's calls (2026-10-25), one per message, recorded in docs/fabula-spec.md
sections 4, 7, and 10: the template builder goes after Outline, Plot, and
Notes; four arrows on every row move a record (up and down past a neighbor,
out a level, into the act or chapter above), Alt with the same arrow does it
on a focused row, and drag does it with a pointer; new acts, chapters, and
scenes come in place, by title, from a + line at the end of each act and
chapter and three at the tab's top; acts are numbered I, II, III, chapters
1, 2, 3 through the whole story, scenes A, B, C within their chapter, and
beats i, ii, iii within their scene, all from position; acts, chapters, and
scenes fold, the browser keeping each fold; and beats are edited in the
outline. The spec already had the rest: one tree per story, acts and chapters
optional, moving a chapter moves its scenes, and deleting an act or a chapter
asks whether what it holds moves up a level (the default) or goes with it.

From Drak's pass (2026-10-26), recorded in the spec's section 1 before this
revision: each beat keeps its line and takes What Happens, a longer text of
what needs to happen in it, both edited in place, the text under its line
(his answer, option a of three); the seed goes to 3 with it, and in the same
change a chapter's and a scene's Status and a scene's Beats, which the
outline reads, become core. The pass also found that nothing showed a row
opens and that beats read as scenes: a click anywhere on an act's, a
chapter's, or a scene's row now opens its page, as People's rows do, a click
on a beat edits it, and the beats sit in under their scene's title with a
rule down their left side.

- 28_fabula: the seed goes to 3, a beat's What Happens and the core marks;
  the Outline tab (FabulaOutlineTab) and the tree's helpers, at the file's
  tail; acts, chapters, and scenes join the kinds with pages of
  their own, so a reference to a scene opens it; a scene's page says when its
  POV is its chapter's; Concordance draws a scene to its POV, participants,
  setting, and threads; the Outline tab is built; the delete's modal for an
  act or a chapter that holds anything (FabulaHoldsDeleteModal); and the
  file's opening comment, stale since r007 and r010, says what's true.
- 12_trunk: App: the Outline tab's folds in the display settings; the tab
  gets Fabula's updater; a record found from anywhere opens over the tab that
  lists it; and Delete takes an act, a chapter, or a scene out of its story's
  outline, asking first when an act or a chapter holds anything.
- 13_form-engine-display: resolveRefTarget's comment says scenes open now.

Declared scope: 12_trunk, 13_form-engine-display, 28_fabula. Declarations
added: FABULA_OUTLINE_KINDS, fabulaOutlineHolds, fabulaTabOf,
fabulaOutlineTree, fabulaOutlineStored, fabulaOutlineClone, fabulaOutlineFind,
fabulaOutlineMove, fabulaOutlineDrop, fabulaOutlineAppend, fabulaOutlineRemove,
fabulaRoman, fabulaLetters, fabulaOutlineNumbers, fabulaWithOutline,
fabulaOutlineEdit, fabulaOutlineCreate, fabulaOutlineHolding,
fabulaInboundCountsAll, fabulaDropRecords, fabulaOutlineDelete, fabulaBeats,
fabulaWithBeats, fabulaMoveBeat, fabulaInheritedPov, FabulaOutlineTab,
FabulaHoldsDeleteModal.

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given). Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r011_fabula_outline.py
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


# ---------------------------------------------------------------- 13: scenes open now
edit(MODULES / "13_form-engine-display.jsx", [
    (r'''// (fabulaRecordOpens; Drak, 2026-10-25), where a scene stays a plain chip
// until it has one. `kind` names the record's type for a chip that can't be
// opened.''',
     r'''// (fabulaRecordOpens; Drak, 2026-10-25), and since r011 an act, a chapter,
// or a scene does as well. `kind` names the record's type for a chip that
// can't be opened.'''),
])

# ---------------------------------------------------------------- 12: App
edit(MODULES / "12_trunk.jsx", [
    (r'''    fabulaFolds: {}, // v1.7 r008: the Story tab's folded panels, one set for every story
''',
     r'''    fabulaFolds: {}, // v1.7 r008: the Story tab's folded panels, one set for every story
    fabulaOutlineFolds: {}, // v1.7 r011: the Outline tab's folded acts, chapters, and scenes, by id
'''),
    (r'''            fabulaFolds: stored.fabulaFolds && typeof stored.fabulaFolds === "object" && !Array.isArray(stored.fabulaFolds) ? stored.fabulaFolds : {},
''',
     r'''            fabulaFolds: stored.fabulaFolds && typeof stored.fabulaFolds === "object" && !Array.isArray(stored.fabulaFolds) ? stored.fabulaFolds : {},
            fabulaOutlineFolds: stored.fabulaOutlineFolds && typeof stored.fabulaOutlineFolds === "object" && !Array.isArray(stored.fabulaOutlineFolds) ? stored.fabulaOutlineFolds : {},
'''),
    (r'''  const [recordDraft, setRecordDraft] = useState(null);
  const initialRecordDraftRef = useRef(null);
''',
     r'''  const [recordDraft, setRecordDraft] = useState(null);
  const initialRecordDraftRef = useRef(null);
  // v1.7 r011: an act or a chapter whose Delete is asking what happens to
  // what it holds ({ kind, id }), while its modal is open.
  const [fabulaHoldsAsk, setFabulaHoldsAsk] = useState(null);
'''),
    (r'''    // v1.7 r009: a cast record, an arc, or a relationship opens on its own
    // page over its story's (Drak, 2026-10-25). From a Fabula page, Back
    // returns to the page the click came from; from anywhere else, such as
    // Concordance, to its story's People tab.''',
     r'''    // v1.7 r009: a cast record, an arc, or a relationship opens on its own
    // page over its story's (Drak, 2026-10-25), and since r011 an act, a
    // chapter, or a scene. From a Fabula page, Back returns to the page the
    // click came from; from anywhere else, such as Concordance, to the story's
    // tab that lists it (fabulaTabOf).'''),
    (r'''        setStoryTab("people");
      }
      setFabulaBack(b => from ? [...b, from] : [{ kind: "story", tab: "people" }]);''',
     r'''        setStoryTab(fabulaTabOf(fabRec.kind));
      }
      setFabulaBack(b => from ? [...b, from] : [{ kind: "story", tab: fabulaTabOf(fabRec.kind) }]);'''),
    (r'''  const toggleFabulaFold = (panelId) => setPrefs(p => ({ ...p, fabulaFolds: { ...(p.fabulaFolds || {}), [panelId]: !(p.fabulaFolds || {})[panelId] } }));
''',
     r'''  const toggleFabulaFold = (panelId) => setPrefs(p => ({ ...p, fabulaFolds: { ...(p.fabulaFolds || {}), [panelId]: !(p.fabulaFolds || {})[panelId] } }));

  // v1.7 r011: so do the Outline tab's, one per act, chapter, or scene
  // (Drak, 2026-10-25); an unfolded one leaves the settings.
  const toggleOutlineFold = (id) => setPrefs(p => {
    const folds = { ...(p.fabulaOutlineFolds || {}) };
    if (folds[id]) delete folds[id]; else folds[id] = true;
    return { ...p, fabulaOutlineFolds: folds };
  });
'''),
    (r'''  // Delete asks first, counting what points at the record, then clears those
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
''',
     r'''  // Delete asks first, counting what points at the record, then clears those
  // references; nothing else is deleted with it (Drak, 2026-10-25). Since
  // v1.7's r011 an act, a chapter, or a scene leaves its story's outline as
  // well, and an act or a chapter that holds anything asks instead, in a
  // modal, whether what it holds moves up a level, the default, or goes with
  // it (spec, section 7).
  const deleteFabulaRecord = () => {
    if (!activeRecord || isLocked) return;
    const rec = fabulaRecordOf(activeRecord.kind, activeRecord.id);
    if (!rec) return;
    if (fabulaOutlineHolding(state, activeRecord.kind, rec).length > 0) { setFabulaHoldsAsk({ kind: activeRecord.kind, id: rec.id }); return; }
    if (!confirm(fabulaRecordDeleteMessage(state, activeRecord.kind, rec))) return;
    finishFabulaDelete(activeRecord.kind, rec, false);
  };

  const finishFabulaDelete = (kind, rec, lift) => {
    if (isLocked) return;
    updateState(s => {
      const { fab, gone } = fabulaOutlineDelete(s.fabula || {}, kind, rec, lift);
      return { ...s, fabula: scrubFabulaRefs({ ...s, fabula: fab }, gone) };
    });
    setFabulaHoldsAsk(null);
    setRecordDraft(null); initialRecordDraftRef.current = null;
    popFabulaBack();
  };
'''),
    (r'''                onToggleFold={toggleFabulaFold}
''',
     r'''                onToggleFold={toggleFabulaFold}
                outlineFolds={prefs.fabulaOutlineFolds}
                onToggleOutlineFold={toggleOutlineFold}
                onUpdateFabula={(fn) => { if (!isLocked) updateFabula(fn); }}
'''),
    (r'''      {destructiveOp && (
        <DestructiveOpModal''',
     r'''      {fabulaHoldsAsk && (() => {
        const rec = fabulaRecordOf(fabulaHoldsAsk.kind, fabulaHoldsAsk.id);
        if (!rec) return null;
        return (
          <FabulaHoldsDeleteModal
            state={state}
            kind={fabulaHoldsAsk.kind}
            record={rec}
            onMoveUp={() => finishFabulaDelete(fabulaHoldsAsk.kind, rec, true)}
            onDeleteAll={() => finishFabulaDelete(fabulaHoldsAsk.kind, rec, false)}
            onCancel={() => setFabulaHoldsAsk(null)}
          />
        );
      })()}

      {destructiveOp && (
        <DestructiveOpModal'''),
])

# ---------------------------------------------------------------- 28: the tab, the pages, the edges
p28 = MODULES / "28_fabula.jsx"
edit(p28, [
    (r'''// (docs/fabula-spec.md). This cut lays down its data and nothing else: no
// screen, export, or Concordance node reads it yet. Its records live in
// state.fabula, one array per kind (FABULA_KINDS, beside the node-source
// registry), and each world keeps one schema per kind in
// state.fabula.schemas, seeded here from the field tables Drak passed on
// 2026-10-25 (spec, section 5). The code grows here until the view is in,
// then moves to a module of its own by a carve. The seed's number rises when
// the seed changes, so a world's unedited schemas follow it: 2 since v1.7's
// r009, when an arc's Cast took more than one (Drak, 2026-10-25, at r009's
// pass).
const FABULA_SCHEMA_SEED = 2;''',
     r'''// (docs/fabula-spec.md). Its records live in state.fabula, one array per
// kind (FABULA_KINDS, beside the node-source registry), and each world keeps
// one schema per kind in state.fabula.schemas, seeded here from the field
// tables Drak passed on 2026-10-25 (spec, section 5). Fabula's code grew at
// 27_trunk's tail until its view was in, and v1.7's r010 carved it into this
// file, which every Fabula cut edits until Fabula is finished and the file
// splits into a folder at its section headers (Drak, 2026-10-25). The seed's
// number rises when the seed changes, so a world's unedited schemas follow
// it: 2 at v1.7's r009, when an arc's Cast took more than one, and 3 since
// r011, when a beat took What Happens and the fields the outline reads, a
// chapter's and a scene's Status and a scene's Beats, became core (Drak, at
// r009's pass, 2026-10-25, and r011's, 2026-10-26).
const FABULA_SCHEMA_SEED = 3;'''),
    (r'''      pick("status", "Status", "Where the chapter stands.", OUTLINE_STATUS),''',
     r'''      pick("status", "Status", "Where the chapter stands.", OUTLINE_STATUS, CORE),'''),
    (r'''      pick("status", "Status", "Where the scene stands.", OUTLINE_STATUS),''',
     r'''      pick("status", "Status", "Where the scene stands.", OUTLINE_STATUS, CORE),'''),
    (r'''      group("beats", "Beats", "The scene's beats, one per row, in order.", [
        text("beat", "Beat", "One beat."),
      ]),''',
     r'''      group("beats", "Beats", "The scene's beats, one per row, in order.", [
        text("beat", "Beat", "The beat in a line."),
        area("whatHappens", "What Happens", "What needs to happen in the beat."),
      ], CORE),'''),
    (r'''  // v1.7 r009: the links that exist so far (spec, section 9), each labeled as
  // its field is: a story to its threads and themes, a cast record to its
  // character, an arc to its cast, a relationship to its two. Concordance
  // drops an edge whose other end isn't drawn.
  const links = { story: ["threads", "themes"], cast: ["character"], arc: ["cast"], relationship: ["castA", "castB"] }[k.kind];''',
     r'''  // v1.7 r009: the links that exist so far (spec, section 9), each labeled as
  // its field is: a story to its threads and themes, a cast record to its
  // character, an arc to its cast, a relationship to its two, and since r011
  // a scene to its POV, participants, setting, and threads. Concordance drops
  // an edge whose other end isn't drawn.
  const links = { story: ["threads", "themes"], cast: ["character"], arc: ["cast"], relationship: ["castA", "castB"], scene: ["pov", "participants", "setting", "threads"] }[k.kind];'''),
    (r'''  { id: "outline", label: "Outline", built: false, holds: "the story's parts, chapters, and scenes, as one ordered tree" },''',
     r'''  { id: "outline", label: "Outline", built: true, holds: "the story's parts, chapters, and scenes, as one ordered tree" },'''),
    (r'''// The page itself: the Story record in view or, with a draft, in edit, and
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
  }''',
     r'''// The page itself: the Story record in view or, with a draft, in edit, and
// since v1.7's r009 the People tab and r011 the Outline tab.
function FabulaStoryPage({ state, story, draft, onDraftChange, tab, onSelectTab, onOpenRecord, onNewRecord, isLocked, folds, onToggleFold, outlineFolds, onToggleOutlineFold, onUpdateFabula, onRestoreTemplate, showSecrets, allTags, dirHandle, flash, onOpenEntry, onSelectTag, onUpdateViewPrefs }) {
  const template = fabulaTemplate(state, "story");
  const active = draft ? "story" : (tab || "story");
  const tabs = <FabulaStoryTabs active={active} onSelect={draft ? null : onSelectTab} />;
  // A tab other than Story: the story's title over the tabs and the tab's
  // own content, People's lists (v1.7 r009) or the Outline (r011).
  const tabPage = (content) => (
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
      canvasSlot={<>{tabs}{content}</>}
    />
  );
  if (!draft && active === "people") {
    return tabPage(<FabulaPeopleTab state={state} story={story} isLocked={isLocked} onOpenRecord={onOpenRecord} onNewRecord={onNewRecord} />);
  }
  if (!draft && active === "outline") {
    return tabPage(<FabulaOutlineTab state={state} story={story} isLocked={isLocked} folds={outlineFolds} onToggleFold={onToggleOutlineFold} onOpenRecord={onOpenRecord} onUpdateFabula={onUpdateFabula} />);
  }'''),
    (r'''// The kinds whose records have pages of their own, so a reference opens one.
const FABULA_PAGE_KINDS = ["cast", "arc", "relationship"];''',
     r'''// The kinds whose records have pages of their own, so a reference opens one:
// People's since v1.7's r009, and the Outline's since r011.
const FABULA_PAGE_KINDS = ["cast", "arc", "relationship", "part", "chapter", "scene"];'''),
    (r'''  const gone = kind === "cast" ? record.characterDeleted : null;
''',
     r'''  const gone = kind === "cast" ? record.characterDeleted : null;
  // v1.7 r011: a scene with no POV of its own takes its chapter's, and says so.
  const inherited = kind === "scene" ? fabulaInheritedPov(state, storyId, draft || record) : null;
  const povNote = inherited ? (
    <div className="fabula-pov-inherited" style={{ margin: "0 0 18px", padding: "8px 14px", border: "1px solid var(--border)", borderLeft: "2px solid var(--accent)", borderRadius: 3, fontSize: 13, color: "var(--text)" }}>
      No POV of its own, so it takes its chapter's: {inherited.name || "(unnamed)"}.
    </div>
  ) : null;
'''),
    (r'''        canvasSlot={note}
''', r'''        canvasSlot={note || povNote}
''', 1),
    (r'''      canvasSlot={note}
''', r'''      canvasSlot={note || povNote}
''', 1),
])

TAIL = r'''

''' + header("Fabula: Outline (v1.7 r011)") + r'''
// The Outline tab (docs/fabula-spec.md, section 7): a story's acts, chapters,
// and scenes as one tree, each scene's beats under it. The tree lives in the
// story's `outline` as nested { id, children } nodes, so the order is in one
// place, and the records live in their slices. Drak's calls (2026-10-25):
// four arrows on every row, or Alt with the same arrow on a focused row, move
// a record up or down past its neighbor, out a level, or into the act or
// chapter above it, and drag does the same with a pointer; new records come
// in place, by title, from a + line at the end of each act and chapter and
// three at the top; acts are numbered I, II, III, chapters 1, 2, 3 through
// the whole story, scenes A, B, C within their chapter (or their act, or the
// story's own level), and beats i, ii, iii within their scene, all from
// position; acts, chapters, and scenes fold, the browser keeping each fold;
// and beats are edited where they sit. Acts, chapters, and scenes open on
// pages of their own, as People's records do. From Drak's pass (2026-10-26):
// a beat has its line and What Happens, what needs to happen in it, a click
// anywhere on a row opens its page, and beats sit in under their scene's
// title.

const FABULA_OUTLINE_KINDS = ["part", "chapter", "scene"];

// What a level can hold: the story's own level anything, an act chapters and
// scenes, a chapter scenes, and a scene nothing (its beats are a field).
const fabulaOutlineHolds = (parentKind, kind) => (
  parentKind === null ? FABULA_OUTLINE_KINDS.includes(kind)
    : parentKind === "part" ? kind === "chapter" || kind === "scene"
      : parentKind === "chapter" ? kind === "scene"
        : false
);

// The story page's tab that lists a kind's records.
const fabulaTabOf = (kind) => (FABULA_OUTLINE_KINDS.includes(kind) ? "outline" : "people");

// A story's outline as { id, kind, children } nodes: each stored node whose
// record is the story's own and may sit where it's stored, once, and then the
// story's acts, chapters, and scenes the stored tree doesn't place, at the
// story's own level in the order they were made. Nothing is written back
// until the tree changes.
const fabulaOutlineTree = (state, story) => {
  const fab = (state && state.fabula) || {};
  const recs = new Map();
  FABULA_OUTLINE_KINDS.forEach(kind => {
    const k = FABULA_KINDS.find(x => x.kind === kind);
    (Array.isArray(fab[k.slice]) ? fab[k.slice] : []).forEach(r => { if (r && r.id && story && r.storyId === story.id) recs.set(r.id, { kind, record: r }); });
  });
  const seen = new Set();
  const walk = (nodes, parentKind) => (Array.isArray(nodes) ? nodes : []).flatMap(n => {
    const id = n && typeof n === "object" ? n.id : null;
    const hit = typeof id === "string" ? recs.get(id) : null;
    if (!hit || seen.has(id) || !fabulaOutlineHolds(parentKind, hit.kind)) return [];
    seen.add(id);
    return [{ id, kind: hit.kind, children: hit.kind === "scene" ? [] : walk(n.children, hit.kind) }];
  });
  const placed = walk(story && story.outline, null);
  const loose = [...recs.entries()].filter(([id]) => !seen.has(id))
    .sort((a, b) => String(a[1].record.createdAt || "").localeCompare(String(b[1].record.createdAt || "")))
    .map(([id, x]) => ({ id, kind: x.kind, children: [] }));
  return [...placed, ...loose];
};

// The tree as the story stores it.
const fabulaOutlineStored = (tree) => tree.map(n => (n.kind === "scene" ? { id: n.id } : { id: n.id, children: fabulaOutlineStored(n.children) }));

const fabulaOutlineClone = (tree) => tree.map(n => ({ ...n, children: fabulaOutlineClone(n.children) }));

// Where a node sits: the list that holds it, its index there, and its parent
// node, null at the story's own level.
const fabulaOutlineFind = (tree, id, parent = null) => {
  for (let i = 0; i < tree.length; i++) {
    if (tree[i].id === id) return { list: tree, index: i, parent };
    const hit = fabulaOutlineFind(tree[i].children, id, tree[i]);
    if (hit) return hit;
  }
  return null;
};

// The four arrows: up and down swap a node with its neighbor, out puts it
// just after its parent at the parent's level, and in puts it at the end of
// the act or chapter just above it. The new tree, or null where the move
// isn't allowed.
const fabulaOutlineMove = (tree, id, dir) => {
  const t = fabulaOutlineClone(tree);
  const at = fabulaOutlineFind(t, id);
  if (!at) return null;
  const { list, index, parent } = at;
  const node = list[index];
  if (dir === "up" || dir === "down") {
    const j = dir === "up" ? index - 1 : index + 1;
    if (j < 0 || j >= list.length) return null;
    list[index] = list[j];
    list[j] = node;
    return t;
  }
  if (dir === "out") {
    if (!parent) return null;
    const up = fabulaOutlineFind(t, parent.id);
    if (!fabulaOutlineHolds(up.parent ? up.parent.kind : null, node.kind)) return null;
    list.splice(index, 1);
    up.list.splice(up.index + 1, 0, node);
    return t;
  }
  if (dir === "in") {
    const above = index > 0 ? list[index - 1] : null;
    if (!above || !fabulaOutlineHolds(above.kind, node.kind)) return null;
    list.splice(index, 1);
    above.children.push(node);
    return t;
  }
  return null;
};

// A drag's drop: before or after another node, or into an act or a chapter at
// its end. Null where it isn't allowed, onto itself or into what it holds
// included.
const fabulaOutlineDrop = (tree, dragId, targetId, where) => {
  if (dragId === targetId) return null;
  const t = fabulaOutlineClone(tree);
  const from = fabulaOutlineFind(t, dragId);
  if (!from) return null;
  const node = from.list[from.index];
  if (fabulaOutlineFind(node.children, targetId)) return null;
  from.list.splice(from.index, 1);
  const to = fabulaOutlineFind(t, targetId);
  if (!to) return null;
  if (where === "into") {
    const target = to.list[to.index];
    if (!fabulaOutlineHolds(target.kind, node.kind)) return null;
    target.children.push(node);
    return t;
  }
  if (!fabulaOutlineHolds(to.parent ? to.parent.kind : null, node.kind)) return null;
  to.list.splice(where === "before" ? to.index : to.index + 1, 0, node);
  return t;
};

// A new node at the end of an act or a chapter, or of the story's own level.
const fabulaOutlineAppend = (tree, parentId, node) => {
  const t = fabulaOutlineClone(tree);
  if (!parentId) return fabulaOutlineHolds(null, node.kind) ? [...t, node] : null;
  const at = fabulaOutlineFind(t, parentId);
  const parent = at ? at.list[at.index] : null;
  if (!parent || !fabulaOutlineHolds(parent.kind, node.kind)) return null;
  parent.children.push(node);
  return t;
};

// The tree without a node, what it held lifted into its place or gone with
// it, and the ids that went.
const fabulaOutlineRemove = (tree, id, lift) => {
  const t = fabulaOutlineClone(tree);
  const at = fabulaOutlineFind(t, id);
  if (!at) return { tree: t, gone: [] };
  const node = at.list[at.index];
  const ids = (n) => [n.id, ...n.children.flatMap(ids)];
  at.list.splice(at.index, 1, ...(lift ? node.children : []));
  return { tree: t, gone: lift ? [node.id] : ids(node) };
};

// Numbers from position, never stored (Drak, 2026-10-25): acts I, II, III
// through the story, chapters 1, 2, 3 through the whole story, and scenes A,
// B, C within their chapter, their act, or the story's own level. A scene's
// beats are numbered i, ii, iii where they're drawn (fabulaRoman, lowercased).
const fabulaRoman = (n) => {
  const steps = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let out = "", rest = n;
  steps.forEach(([v, r]) => { while (rest >= v) { out += r; rest -= v; } });
  return out;
};

const fabulaLetters = (n) => {
  let out = "", rest = n;
  while (rest > 0) { rest -= 1; out = String.fromCharCode(65 + (rest % 26)) + out; rest = Math.floor(rest / 26); }
  return out;
};

const fabulaOutlineNumbers = (tree) => {
  const numbers = new Map();
  let act = 0, chapter = 0;
  const walk = (nodes) => {
    let scene = 0;
    nodes.forEach(n => {
      if (n.kind === "part") { numbers.set(n.id, fabulaRoman(++act)); walk(n.children); }
      else if (n.kind === "chapter") { numbers.set(n.id, String(++chapter)); walk(n.children); }
      else numbers.set(n.id, fabulaLetters(++scene));
    });
  };
  walk(tree);
  return numbers;
};

// Fabula with a story's outline written back.
const fabulaWithOutline = (fab, storyId, tree) => ({
  ...fab,
  stories: (Array.isArray(fab.stories) ? fab.stories : []).map(st => (st && st.id === storyId ? { ...st, outline: fabulaOutlineStored(tree), updatedAt: isoNow() } : st)),
});

// A change to a story's outline, made against Fabula as it stands: fn takes
// the tree and returns the new one, or null for no change.
const fabulaOutlineEdit = (fab, storyId, fn) => {
  const story = (Array.isArray(fab.stories) ? fab.stories : []).find(st => st && st.id === storyId);
  if (!story) return fab;
  const next = fn(fabulaOutlineTree({ fabula: fab }, story));
  return next ? fabulaWithOutline(fab, storyId, next) : fab;
};

// A new act, chapter, or scene with its title, at the end of its place,
// written at once (Drak, 2026-10-25: in place, by title).
const fabulaOutlineCreate = (fab, storyId, parentId, kind, name, id) => {
  const story = (Array.isArray(fab.stories) ? fab.stories : []).find(st => st && st.id === storyId);
  const k = FABULA_KINDS.find(x => x.kind === kind);
  if (!story || !k) return fab;
  const tree = fabulaOutlineAppend(fabulaOutlineTree({ fabula: fab }, story), parentId, { id, kind, children: [] });
  if (!tree) return fab;
  const now = isoNow();
  const rec = { id, storyId, name, fields: {}, createdAt: now, updatedAt: now };
  return fabulaWithOutline({ ...fab, [k.slice]: [...(Array.isArray(fab[k.slice]) ? fab[k.slice] : []), rec] }, storyId, tree);
};

// What an act or a chapter holds in its story's outline, all the way down.
const fabulaOutlineHolding = (state, kind, rec) => {
  if (!rec || (kind !== "part" && kind !== "chapter")) return [];
  const fab = (state && state.fabula) || {};
  const story = (Array.isArray(fab.stories) ? fab.stories : []).find(st => st && st.id === rec.storyId);
  const at = story ? fabulaOutlineFind(fabulaOutlineTree(state, story), rec.id) : null;
  const down = (n) => n.children.flatMap(c => [c, ...down(c)]);
  return at ? down(at.list[at.index]) : [];
};

// How many of each kind's records, outside what goes, point at any of the
// ids given: [[kind, n]], for what Delete everything would clear.
const fabulaInboundCountsAll = (state, ids, going) => {
  const fab = (state && state.fabula) || {};
  return FABULA_KINDS.map(k => {
    const tpl = { id: k.id, fields: fabulaKindFields(state, k.kind) };
    const arr = (Array.isArray(fab[k.slice]) ? fab[k.slice] : []).filter(r => r && !going.has(r.id));
    return [k.kind, arr.filter(r => ids.some(id => countInboundEntryRefs([{ ...r, templateId: k.id }], [tpl], id) > 0)).length];
  }).filter(([, n]) => n > 0);
};

// Fabula's records below the story level, without the ids given.
const fabulaDropRecords = (fab, ids) => ({
  ...fab,
  ...Object.fromEntries(FABULA_KINDS.filter(k => k.kind !== "corpus" && k.kind !== "story")
    .map(k => [k.slice, (Array.isArray(fab[k.slice]) ? fab[k.slice] : []).filter(r => !r || !ids.has(r.id))])),
});

// A record deleted: out of its slice and, for an act, a chapter, or a scene,
// out of its story's outline, what an act or a chapter held lifted into its
// place or gone with it. Fabula and the ids that went, for the cleaning.
const fabulaOutlineDelete = (fab, kind, rec, lift) => {
  let next = fab;
  let gone = [rec.id];
  const story = FABULA_OUTLINE_KINDS.includes(kind) ? (Array.isArray(fab.stories) ? fab.stories : []).find(st => st && st.id === rec.storyId) : null;
  if (story) {
    const out = fabulaOutlineRemove(fabulaOutlineTree({ fabula: fab }, story), rec.id, lift);
    next = fabulaWithOutline(fab, story.id, out.tree);
    if (out.gone.length) gone = out.gone;
  }
  const ids = new Set(gone);
  return { fab: fabulaDropRecords(next, ids), gone: ids };
};

// A scene's beats: its Beats field's rows, each { beat }.
const fabulaBeats = (scene) => (scene && scene.fields && Array.isArray(scene.fields.beats) ? scene.fields.beats : []);

const fabulaWithBeats = (fab, sceneId, fn) => ({
  ...fab,
  scenes: (Array.isArray(fab.scenes) ? fab.scenes : []).map(sc => (sc && sc.id === sceneId ? { ...sc, fields: { ...(sc.fields || {}), beats: fn(fabulaBeats(sc).slice()) }, updatedAt: isoNow() } : sc)),
});

// A beat moved within its scene or to another, to an index there, or to the
// end when the index is null.
const fabulaMoveBeat = (fab, fromId, fromIndex, toId, toIndex) => {
  const from = (Array.isArray(fab.scenes) ? fab.scenes : []).find(sc => sc && sc.id === fromId);
  const beat = fabulaBeats(from)[fromIndex];
  if (beat === undefined) return fab;
  let at = toIndex;
  if (fromId === toId && at != null && at > fromIndex) at -= 1;
  const without = fabulaWithBeats(fab, fromId, b => b.filter((_, i) => i !== fromIndex));
  return fabulaWithBeats(without, toId, b => { b.splice(at == null ? b.length : Math.max(0, Math.min(at, b.length)), 0, beat); return b; });
};

// A scene with no POV of its own takes its chapter's (spec, section 5.9):
// that cast record, or null.
const fabulaInheritedPov = (state, storyId, scene) => {
  if (!scene || (scene.fields || {}).pov) return null;
  const fab = (state && state.fabula) || {};
  const story = (Array.isArray(fab.stories) ? fab.stories : []).find(st => st && st.id === storyId);
  const at = story ? fabulaOutlineFind(fabulaOutlineTree(state, story), scene.id) : null;
  if (!at || !at.parent || at.parent.kind !== "chapter") return null;
  const chapter = (Array.isArray(fab.chapters) ? fab.chapters : []).find(c => c && c.id === at.parent.id);
  const pov = chapter && (chapter.fields || {}).pov;
  return (Array.isArray(fab.cast) ? fab.cast : []).find(c => c && c.id === pov && c.storyId === storyId) || null;
};

// The Outline tab: the tree with its numbers and folds, the arrows, the keys,
// and drag; the + lines, whose rows take their title in place, Enter keeping
// one and opening the next and Esc stopping; and the beats, in under their
// scene's title, each with its line and its What Happens, edited where they
// sit, a beat emptied of both going. A click anywhere on an act's, a
// chapter's, or a scene's row opens its page, and a click on a beat edits it
// (Drak's pass, 2026-10-26).
function FabulaOutlineTab({ state, story, isLocked, folds, onToggleFold, onOpenRecord, onUpdateFabula }) {
  const fab = state.fabula || {};
  const tree = fabulaOutlineTree(state, story);
  const numbers = fabulaOutlineNumbers(tree);
  const recs = new Map();
  FABULA_OUTLINE_KINDS.forEach(kind => {
    const k = FABULA_KINDS.find(x => x.kind === kind);
    (Array.isArray(fab[k.slice]) ? fab[k.slice] : []).forEach(r => { if (r && r.id) recs.set(r.id, r); });
  });
  const castById = new Map((Array.isArray(fab.cast) ? fab.cast : []).filter(c => c && c.id && c.storyId === story.id).map(c => [c.id, c]));
  const castName = (id) => { const c = typeof id === "string" && castById.get(id); return c ? (c.name || "(unnamed)") : null; };
  const [adding, setAdding] = useState(null);
  const [addText, setAddText] = useState("");
  const [editing, setEditing] = useState(null);
  const [editText, setEditText] = useState("");
  const [editHappens, setEditHappens] = useState("");
  const [focusKey, setFocusKey] = useState(null);
  const [drop, setDrop] = useState(null);
  const dragRef = useRef(null);
  const rootRef = useRef(null);
  const skipBlurRef = useRef(false);
  useEffect(() => {
    if (!focusKey || !rootRef.current) return;
    const el = [...rootRef.current.querySelectorAll("[data-outline-key]")].find(x => x.getAttribute("data-outline-key") === focusKey);
    if (el) el.focus();
    setFocusKey(null);
  }, [focusKey]);

  const write = (fn) => { if (!isLocked) onUpdateFabula(fn); };
  const move = (id, dir) => {
    if (isLocked || !fabulaOutlineMove(tree, id, dir)) return;
    write(f => fabulaOutlineEdit(f, story.id, t => fabulaOutlineMove(t, id, dir)));
    setFocusKey(id);
  };
  const beatsOf = (sceneId) => fabulaBeats(recs.get(sceneId));
  const setBeats = (sceneId, fn) => write(f => fabulaWithBeats(f, sceneId, fn));
  const moveBeat = (sceneId, i, j) => {
    if (isLocked || j < 0 || j >= beatsOf(sceneId).length) return;
    write(f => fabulaMoveBeat(f, sceneId, i, sceneId, j > i ? j + 1 : j));
    setFocusKey(`${sceneId}#${j}`);
  };
  const startAdd = (where) => { if (isLocked) return; skipBlurRef.current = false; setEditing(null); setAdding(where); setAddText(""); };
  const commitAdd = (keepOpen) => {
    const text = addText.trim();
    if (adding && text && !isLocked) {
      if (adding.beat) setBeats(adding.sceneId, b => [...b, { beat: text, whatHappens: "" }]);
      else {
        const id = `fab-${adding.kind}-${genId()}`;
        const { parentId, kind } = adding;
        write(f => fabulaOutlineCreate(f, story.id, parentId, kind, text, id));
      }
    }
    setAddText("");
    if (!keepOpen) setAdding(null);
  };
  // A beat in edit has its line and its What Happens open together; part
  // says which one has the focus.
  const startEdit = (sceneId, index, part) => {
    if (isLocked) return;
    skipBlurRef.current = false;
    setAdding(null);
    const b = beatsOf(sceneId)[index] || {};
    setEditing({ sceneId, index, part: part === "happens" ? "happens" : "beat" });
    setEditText(b.beat || "");
    setEditHappens(b.whatHappens || "");
  };
  const stopEdit = () => { setEditing(null); setEditText(""); setEditHappens(""); };
  const commitEdit = () => {
    if (!editing) return;
    const { sceneId, index } = editing;
    const line = editText.trim(), happens = editHappens.trim();
    const was = beatsOf(sceneId)[index] || {};
    if (!line && !happens) setBeats(sceneId, b => b.filter((_, i) => i !== index));
    else if (line !== (was.beat || "") || happens !== (was.whatHappens || "")) {
      setBeats(sceneId, b => b.map((x, i) => (i === index ? { ...(x || {}), beat: line, whatHappens: happens } : x)));
    }
    stopEdit();
  };

  const ARROWS = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "out", ArrowRight: "in" };
  const typing = (e) => { const tag = e.target && e.target.tagName; return tag === "INPUT" || tag === "TEXTAREA"; };
  const onNodeKey = (e, node) => {
    if (typing(e)) return;
    if (e.altKey && ARROWS[e.key]) { e.preventDefault(); move(node.id, ARROWS[e.key]); return; }
    if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); onOpenRecord(node.kind, node.id); }
  };
  const onBeatKey = (e, sceneId, i) => {
    if (typing(e)) return;
    if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) { e.preventDefault(); moveBeat(sceneId, i, e.key === "ArrowUp" ? i - 1 : i + 1); return; }
    if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); startEdit(sceneId, i, "beat"); }
  };
  // A click on a row's own space, not on one of its buttons or boxes.
  const onControl = (e) => !!(e.target && e.target.closest && e.target.closest("button, input, textarea"));

  // Drag: a row's top or bottom quarter puts the dragged record before or
  // after it, the middle into it where it can hold it; a beat goes before or
  // after another beat, or to the end of a scene dropped on.
  const whereOn = (e, into) => {
    const r = e.currentTarget.getBoundingClientRect();
    const y = (e.clientY - r.top) / Math.max(1, r.height);
    if (into && y > 0.25 && y < 0.75) return "into";
    return y < 0.5 ? "before" : "after";
  };
  const nodeWhere = (e, node) => {
    const d = dragRef.current;
    if (!d) return null;
    if (d.beat) return node.kind === "scene" ? "into" : null;
    const where = whereOn(e, fabulaOutlineHolds(node.kind, d.kind));
    return fabulaOutlineDrop(tree, d.id, node.id, where) ? where : null;
  };
  const beatWhere = (e) => (dragRef.current && dragRef.current.beat ? whereOn(e, false) : null);
  const dragProps = (key, payload, whereFn, onDropped) => (isLocked ? {} : {
    draggable: true,
    onDragStart: (e) => { e.stopPropagation(); dragRef.current = payload; e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", key); } catch (_) {} },
    onDragEnd: () => { dragRef.current = null; setDrop(null); },
    onDragOver: (e) => {
      const where = whereFn(e);
      if (!where) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (!drop || drop.key !== key || drop.where !== where) setDrop({ key, where });
    },
    onDrop: (e) => {
      e.preventDefault();
      const where = whereFn(e);
      const d = dragRef.current;
      dragRef.current = null;
      setDrop(null);
      if (where && d) onDropped(d, where);
    },
  });

  const dropMark = (key) => (drop && drop.key === key ? (drop.where === "before" ? "inset 0 2px 0 var(--accent)" : drop.where === "after" ? "inset 0 -2px 0 var(--accent)" : "inset 0 0 0 1px var(--accent)") : "none");
  const rowStyle = (depth, key) => ({
    padding: `6px 12px 6px ${12 + depth * 22}px`,
    background: "var(--surf)",
    display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 10, rowGap: 2,
    boxShadow: dropMark(key),
  });
  // Where a row's title starts: its indent, the fold, the number, and the
  // gaps between them. A scene's beats sit in from there, past a rule.
  const titleX = (depth) => 12 + depth * 22 + 14 + 10 + 28 + 10;
  const beatStyle = (key) => ({
    padding: "4px 12px 4px 10px",
    background: "var(--surf)",
    display: "flex", alignItems: "baseline", columnGap: 10,
    fontSize: 13,
    boxShadow: dropMark(key),
  });
  const plain = { background: "none", border: "none", padding: 0, color: "inherit", font: "inherit", cursor: "pointer", textAlign: "left" };
  const numStyle = { minWidth: 28, textAlign: "right", color: "var(--text-dim)", fontVariantNumeric: "tabular-nums", flexShrink: 0 };
  const beatNumStyle = { minWidth: 26, textAlign: "right", color: "var(--text-dim)", fontVariantNumeric: "tabular-nums", flexShrink: 0 };
  const arrowBtn = (label, sym, ok, onClick) => (
    <button className="btn btn-ghost" style={{ padding: "1px 6px", fontSize: 11, minWidth: 24 }} disabled={!ok} onClick={onClick} aria-label={label} title={label}>{sym}</button>
  );
  const plusLine = (pad, items) => (
    <div className="fabula-outline-add" style={{ padding: `3px 12px 5px ${pad}px`, background: "var(--surf)", display: "flex", gap: 14 }}>
      {items.map(([label, where]) => (
        <button key={label} style={{ ...plain, fontSize: 12, color: "var(--text-dim)" }} onClick={() => startAdd(where)}>{label}</button>
      ))}
    </div>
  );
  const PLACEHOLDER = { part: "The part's or act's title", chapter: "The chapter's title", scene: "The scene's title" };
  const addRow = (style, numSt, where) => (
    <div className="fabula-outline-row fabula-outline-adding" style={style}>
      <span style={numSt}>+</span>
      <input
        className="input"
        autoFocus
        aria-label={where.beat ? "New beat" : PLACEHOLDER[where.kind]}
        placeholder={where.beat ? "The beat, in a line" : PLACEHOLDER[where.kind]}
        value={addText}
        onChange={e => setAddText(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") { e.preventDefault(); commitAdd(true); }
          else if (e.key === "Escape") { e.preventDefault(); skipBlurRef.current = true; setAdding(null); setAddText(""); }
        }}
        onBlur={() => { if (skipBlurRef.current) { skipBlurRef.current = false; return; } commitAdd(false); }}
        style={{ flex: "1 1 220px", minWidth: 0, padding: "3px 8px", fontSize: 13 }}
      />
      <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Enter adds it; Esc stops</span>
    </div>
  );
  const addingHere = (pred) => adding && pred(adding);

  // What Happens grows with what it holds.
  const autoGrow = (el) => { if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight + 2}px`; } };
  const renderBeat = (scene, beat, i, depth) => {
    const key = `${scene.id}#${i}`;
    const b = beat || {};
    const isEditing = !!editing && editing.sceneId === scene.id && editing.index === i;
    const n = beatsOf(scene.id).length;
    // In the line Enter keeps the edit; in What Happens Enter starts a new
    // line and Ctrl+Enter keeps it; Esc drops it in either.
    const keys = (e, inLine) => {
      if (e.key === "Escape") { e.preventDefault(); skipBlurRef.current = true; stopEdit(); return; }
      if (e.key === "Enter" && (inLine || e.ctrlKey || e.metaKey)) { e.preventDefault(); skipBlurRef.current = true; commitEdit(); }
    };
    const focusOn = (part) => () => setEditing(x => (x && x.part !== part ? { ...x, part } : x));
    return (
      <div
        key={key}
        className={`${isLocked ? "" : "stemma-index-row "}fabula-outline-row fabula-outline-beat`}
        data-outline-key={key}
        role="treeitem"
        aria-level={depth + 1}
        tabIndex={0}
        title={isLocked || isEditing ? undefined : "Edit this beat"}
        onKeyDown={e => onBeatKey(e, scene.id, i)}
        onClick={e => {
          if (isLocked || isEditing || onControl(e)) return;
          startEdit(scene.id, i, e.target.closest && e.target.closest(".fabula-outline-beat-happens") ? "happens" : "beat");
        }}
        onBlur={isEditing ? (e) => {
          if (e.currentTarget.contains(e.relatedTarget)) return;
          if (skipBlurRef.current) { skipBlurRef.current = false; return; }
          commitEdit();
        } : undefined}
        {...(isEditing ? {} : dragProps(key, { beat: true, sceneId: scene.id, index: i }, beatWhere, (d, where) => write(f => fabulaMoveBeat(f, d.sceneId, d.index, scene.id, where === "after" ? i + 1 : i))))}
        style={{ ...beatStyle(key), cursor: isLocked ? "default" : "text" }}
      >
        <span style={beatNumStyle}>{fabulaRoman(i + 1).toLowerCase()}</span>
        <div style={{ flex: "1 1 0", minWidth: 0 }}>
          {isEditing ? (
            <>
              <input
                className="input"
                autoFocus={editing.part !== "happens"}
                aria-label="Beat"
                placeholder="The beat, in a line"
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onFocus={focusOn("beat")}
                onKeyDown={e => keys(e, true)}
                style={{ display: "block", width: "100%", boxSizing: "border-box", padding: "3px 8px", fontSize: 13 }}
              />
              <textarea
                className="input"
                ref={autoGrow}
                rows={2}
                autoFocus={editing.part === "happens"}
                aria-label="What Happens"
                placeholder="What needs to happen in the beat"
                value={editHappens}
                onChange={e => setEditHappens(e.target.value)}
                onFocus={focusOn("happens")}
                onKeyDown={e => keys(e, false)}
                style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 4, padding: "4px 8px", fontSize: 12.5, lineHeight: 1.45, fontFamily: "inherit", resize: "none", overflow: "hidden" }}
              />
              <div className="fabula-outline-beat-hint" style={{ marginTop: 3, fontSize: 11, color: "var(--text-dim)" }}>
                {editing.part === "happens" ? "Ctrl+Enter keeps it; Esc stops" : "Enter keeps it; Tab to What Happens; Esc stops"}
              </div>
            </>
          ) : (
            <>
              <div className="fabula-outline-beat-text" style={{ overflowWrap: "anywhere", color: b.beat ? "var(--text)" : "var(--text-dim)" }}>{b.beat || "(untitled beat)"}</div>
              {b.whatHappens && (
                <div className="fabula-outline-beat-happens" style={{ marginTop: 2, fontSize: 12.5, lineHeight: 1.45, color: "var(--text-dim)", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{b.whatHappens}</div>
              )}
            </>
          )}
        </div>
        {!isLocked && !isEditing && (
          <span style={{ marginLeft: "auto", display: "inline-flex", gap: 3, flexShrink: 0 }}>
            {arrowBtn("Move up", "\u2191", i > 0, () => moveBeat(scene.id, i, i - 1))}
            {arrowBtn("Move down", "\u2193", i < n - 1, () => moveBeat(scene.id, i, i + 1))}
            {arrowBtn("Delete this beat", "\u00d7", true, () => setBeats(scene.id, bs => bs.filter((_, j) => j !== i)))}
          </span>
        )}
      </div>
    );
  };
  // A scene's beats, its + Beat, and the row that takes a new beat's line, in
  // under the scene's title with a rule down their left side.
  const beatsBlock = (scene, rec, depth) => {
    const beats = fabulaBeats(rec);
    const addingBeat = addingHere(a => a.beat && a.sceneId === scene.id);
    if (beats.length === 0 && !addingBeat && isLocked) return null;
    return (
      <div className="fabula-outline-beats" style={{ background: "var(--surf)", padding: `2px 0 4px ${titleX(depth) - 2}px` }}>
        <div style={{ borderLeft: "2px solid var(--border)", display: "flex", flexDirection: "column" }}>
          {beats.map((bt, i) => renderBeat(scene, bt, i, depth + 1))}
          {addingBeat && addRow({ ...beatStyle("add"), flexWrap: "wrap", rowGap: 2 }, beatNumStyle, adding)}
          {!isLocked && plusLine(22, [["+ Beat", { sceneId: scene.id, beat: true }]])}
        </div>
      </div>
    );
  };

  const countIn = (node, kind) => node.children.reduce((a, c) => a + (c.kind === kind ? 1 : 0) + countIn(c, kind), 0);
  const metaOf = (node, rec, parent) => {
    const f = rec.fields || {};
    if (node.kind === "part") {
      const ch = countIn(node, "chapter"), sc = countIn(node, "scene");
      return [ch ? fabulaCount("chapter", ch) : null, sc ? fabulaCount("scene", sc) : null];
    }
    if (node.kind === "chapter") {
      return [castName(f.pov), formatSelectDisplay(f.status), node.children.length ? fabulaCount("scene", node.children.length) : null];
    }
    const own = castName(f.pov);
    const chapterPov = !own && parent && parent.kind === "chapter" ? castName(((recs.get(parent.id) || {}).fields || {}).pov) : null;
    const beats = fabulaBeats(rec).length;
    return [own || (chapterPov ? `${chapterPov} (chapter's)` : null), formatSelectDisplay(f.status), beats ? `${beats} ${beats === 1 ? "beat" : "beats"}` : null];
  };
  const TYPE = {
    part: { fontSize: 15, fontWeight: 600 },
    chapter: { fontSize: 15, fontWeight: 500 },
    scene: { fontSize: 14, fontWeight: 400 },
  };

  const renderNode = (node, depth, parent) => {
    const rec = recs.get(node.id) || {};
    const folded = !!(folds || {})[node.id];
    const can = isLocked ? null : ["up", "down", "out", "in"].reduce((a, d) => ({ ...a, [d]: !!fabulaOutlineMove(tree, node.id, d) }), {});
    const meta = metaOf(node, rec, parent).filter(Boolean).join("\u00a0\u00b7 ");
    const plus = node.kind === "part" ? [["+ Chapter", { parentId: node.id, kind: "chapter" }], ["+ Scene", { parentId: node.id, kind: "scene" }]]
      : [["+ Scene", { parentId: node.id, kind: "scene" }]];
    return (
      <div key={node.id} role="none" style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <div
          className="stemma-index-row fabula-outline-row"
          data-kind={node.kind}
          data-outline-key={node.id}
          role="treeitem"
          aria-level={depth + 1}
          aria-expanded={!folded}
          tabIndex={0}
          title={`Open this ${FABULA_NOUNS[node.kind].one}`}
          onKeyDown={e => onNodeKey(e, node)}
          onClick={e => { if (!onControl(e)) onOpenRecord(node.kind, node.id); }}
          {...dragProps(node.id, { id: node.id, kind: node.kind }, e => nodeWhere(e, node), (d, where) => {
            if (d.beat) { write(f => fabulaMoveBeat(f, d.sceneId, d.index, node.id, null)); return; }
            write(f => fabulaOutlineEdit(f, story.id, t => fabulaOutlineDrop(t, d.id, node.id, where)));
            setFocusKey(d.id);
          })}
          style={{ ...rowStyle(depth, node.id), ...TYPE[node.kind], cursor: "pointer" }}
        >
          <button className="fabula-outline-fold" style={{ ...plain, width: 14, flexShrink: 0, fontSize: 10, color: "var(--text-dim)" }} onClick={() => onToggleFold(node.id)} aria-label={folded ? "Unfold" : "Fold"} title={folded ? "Unfold" : "Fold"}>{folded ? "\u25b8" : "\u25be"}</button>
          <span className="fabula-outline-num" style={numStyle}>{numbers.get(node.id)}</span>
          <span className="fabula-outline-title" style={{ minWidth: 0, overflowWrap: "anywhere", color: "var(--text)" }}>{rec.name || "(untitled)"}</span>
          <span style={{ marginLeft: "auto", display: "inline-flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "flex-end", columnGap: 10, rowGap: 2 }}>
            {meta && <span className="fabula-outline-meta" style={{ fontSize: 12, fontWeight: 400, color: "var(--text-dim)", textAlign: "right" }}>{meta}</span>}
            {can && (
              <span style={{ display: "inline-flex", gap: 3 }}>
                {arrowBtn("Move up", "\u2191", can.up, () => move(node.id, "up"))}
                {arrowBtn("Move down", "\u2193", can.down, () => move(node.id, "down"))}
                {arrowBtn("Move out a level", "\u2190", can.out, () => move(node.id, "out"))}
                {arrowBtn("Move into the part or chapter above", "\u2192", can.in, () => move(node.id, "in"))}
              </span>
            )}
          </span>
        </div>
        {!folded && (
          <div role="group" style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {node.children.map(c => renderNode(c, depth + 1, node))}
            {node.kind === "scene" ? beatsBlock(node, rec, depth) : (
              <>
                {addingHere(a => !a.beat && a.parentId === node.id) && addRow(rowStyle(depth + 1, "add"), numStyle, adding)}
                {!isLocked && plusLine(12 + depth * 22 + 44, plus)}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const small = { padding: "3px 10px", fontSize: 12 };
  const topAdding = addingHere(a => !a.beat && !a.parentId);
  return (
    <div className="fabula-outline">
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
        <div className="field-label"><span>Outline</span></div>
        {!isLocked && (
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn" style={small} onClick={() => startAdd({ parentId: null, kind: "part" })}>+ Part / Act</button>
            <button className="btn" style={small} onClick={() => startAdd({ parentId: null, kind: "chapter" })}>+ Chapter</button>
            <button className="btn" style={small} onClick={() => startAdd({ parentId: null, kind: "scene" })}>+ Scene</button>
          </div>
        )}
      </div>
      {tree.length === 0 && !topAdding && (
        <div style={{ fontSize: 13, color: "var(--text-dim)", fontStyle: "italic" }}>No acts, chapters, or scenes yet.</div>
      )}
      {(tree.length > 0 || topAdding) && (
        <div ref={rootRef} role="tree" aria-label="Outline" style={{ display: "flex", flexDirection: "column", gap: 1, border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
          {tree.map(n => renderNode(n, 0, null))}
          {topAdding && addRow(rowStyle(0, "add"), numStyle, adding)}
        </div>
      )}
    </div>
  );
}

// Deleting an act or a chapter that holds anything asks whether what it holds
// moves up a level, the default, or goes with it (spec, section 7). Esc
// cancels, as a click outside the modal does.
function FabulaHoldsDeleteModal({ state, kind, record, onMoveUp, onDeleteAll, onCancel }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);
  const held = fabulaOutlineHolding(state, kind, record);
  const count = (k) => held.filter(n => n.kind === k).length;
  const holds = fabulaJoin([count("chapter") ? fabulaCount("chapter", count("chapter")) : null, count("scene") ? fabulaCount("scene", count("scene")) : null].filter(Boolean));
  const fab = state.fabula || {};
  const story = (Array.isArray(fab.stories) ? fab.stories : []).find(st => st && st.id === record.storyId);
  const at = story ? fabulaOutlineFind(fabulaOutlineTree(state, story), record.id) : null;
  const where = at && at.parent ? `in its ${FABULA_NOUNS[at.parent.kind].one}` : "at the story's own level";
  // What points at what it holds stays when everything goes, without the
  // reference, and says so, as Delete does for the record itself.
  const pointing = fabulaInboundCountsAll(state, held.map(n => n.id), new Set([record.id, ...held.map(n => n.id)]));
  const total = pointing.reduce((a, [, n]) => a + n, 0);
  const said = fabulaJoin(pointing.map(([kk, n]) => (kk === "story" ? "the story" : fabulaCount(kk, n))));
  const warn = total ? ` ${said.charAt(0).toUpperCase()}${said.slice(1)} ${total === 1 ? "points" : "point"} at what it holds; if everything goes, ${total === 1 ? "it stays, without the reference" : "they stay, without the references"}.` : "";
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal fabula-holds-delete" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">Delete the {FABULA_NOUNS[kind].one}</div>
        <div className="modal-body">
          <p style={{ margin: "0 0 10px" }}>{fabulaRecordDeleteMessage(state, kind, record)}</p>
          <p style={{ margin: 0 }}>It holds {holds}. Move up puts what it holds in its place, {where}; Delete everything deletes it all.{warn}</p>
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onDeleteAll}>Delete everything</button>
          <button className="btn btn-accent" onClick={onMoveUp} autoFocus>Move up</button>
        </div>
      </div>
    </div>
  );
}'''

t28 = p28.read_text(encoding="utf-8")
end = "      canvasSlot={note || povNote}\n    />\n  );\n}"
assert not t28.endswith("\n") and t28.endswith(end), "28_fabula.jsx no longer ends the way this cut expects"
p28.write_text(t28 + TAIL, encoding="utf-8")
print("v1.7 r011 applied: 12, 13, 28")
