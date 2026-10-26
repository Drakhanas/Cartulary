"""v1.7 r012: the outline's positions, an act's, a chapter's, or a scene's
place in its story's outline, on its page and wherever it's referenced.

Drak's addition (2026-10-26), recorded in docs/fabula-spec.md section 7
before this cut: an act's, a chapter's, or a scene's page says where it sits,
between its kind and its updated date (SCENE · II.4.A · UPDATED), the act in
Roman numerals, then the chapter, then the scene's letter, joined by dots. A
chapter reads II.4 and an act II; a scene straight under an act reads II.A,
one at the story's own level A, and a chapter outside any act 4. A reference
to one reads the same way ("II.4.A dddd"), and a picker that offers scenes
lists them in the outline's order, each with its position, where it listed
them by name (his answer, option a). The position is worked out from the
outline each time it's drawn, as every number is.

A chip draws the position quieter than the name, as the outline draws its
numbers, because a scene at the story's own level read "A Prologue" in the
first screenshots, an article and a word. It still reads "II.4.A dddd". A
picker's options are plain text and can't do the same.

- 28_fabula: fabulaOutlinePlaces, each outline record's path and its index in
  the outline's order, after the numbers it's made from; fabulaStoryNodes
  names the story's acts, chapters, and scenes with their paths, keeps each
  path and name apart as well, and puts them last, in that order;
  fabulaLiveFields marks a reference to acts, chapters, or scenes keepOrder;
  a record's page gives its view the story's nodes and, for an act, a
  chapter, or a scene, its path for the badge; the Story tab's view reads its
  references the same way.
- 13_form-engine-display: EntryView takes the nodes a caller gives it, and a
  word for its badge between the kind and the date (badgeExtra);
  resolveRefTarget passes a node's place on, and a chip draws it.
- 14_form-engine-edit: EntryRefEditor keeps its candidates' order when the
  field says keepOrder, where it sorted them by name.

Declared scope: 13_form-engine-display, 14_form-engine-edit, 28_fabula.
Declarations added: fabulaOutlinePlaces.

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given). Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r012_outline_positions.py
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


# ---------------------------------------------------------------- 13: the nodes given, the badge's word
edit(MODULES / "13_form-engine-display.jsx", [
    (r'''function EntryView({ entry, template, templates, entries, onOpenEntry, onSelectTag, showSecrets, imageFolder, dirHandle, calendar, onExportEntry, state, onUpdateViewPrefs, canvasSlot, panels, foldedPanels, onTogglePanel }) {''',
     r'''function EntryView({ entry, template, templates, entries, onOpenEntry, onSelectTag, showSecrets, imageFolder, dirHandle, calendar, onExportEntry, state, onUpdateViewPrefs, canvasSlot, panels, foldedPanels, onTogglePanel, registeredNodes: nodesGiven, badgeExtra }) {'''),
    (r'''  // v1.7 r003: the records that aren't entries (bodies, Glossopoeia records,
  // maps), so a reference to one shows its name (resolveRefTarget).
  const registeredNodes = state ? getRegisteredGraphNodes(state) : [];''',
     r'''  // v1.7 r003: the records that aren't entries (bodies, Glossopoeia records,
  // maps), so a reference to one shows its name (resolveRefTarget). Since
  // r012 a caller can give its own, named as its form names them, as a
  // Fabula page gives its story's (fabulaStoryNodes).
  const registeredNodes = nodesGiven || (state ? getRegisteredGraphNodes(state) : []);'''),
    (r'''        {template.name}
        <span style={{ color: "var(--border2)" }}>·</span>
        <span>Updated {fmtDate(entry.updatedAt)}</span>''',
     r'''        {template.name}
        {/* v1.7 r012: a word between the kind and the date, as an act's, a chapter's, or a scene's place in its outline (II.4.A). */}
        {badgeExtra && <><span style={{ color: "var(--border2)" }}>·</span><span className="entry-badge-position">{badgeExtra}</span></>}
        <span style={{ color: "var(--border2)" }}>·</span>
        <span>Updated {fmtDate(entry.updatedAt)}</span>'''),
    (r'''// or a scene does as well. `kind` names the record's type for a chip that
// can't be opened.''',
     r'''// or a scene does as well. `kind` names the record's type for a chip that
// can't be opened. Since r012 `place` is an act's, a chapter's, or a scene's
// position and its own name, apart, when the nodes given carry them
// (fabulaStoryNodes), for a chip to draw the position quieter than the name.'''),
    (r'''  return { name: n.name, open: n.templateId === SYNTH_TPL_MAP || n.templateId === BODY_REF_SENTINEL || fabulaRecordOpens(n.templateId), kind: src ? src.name : "" };''',
     r'''  return { name: n.name, place: n.place || null, open: n.templateId === SYNTH_TPL_MAP || n.templateId === BODY_REF_SENTINEL || fabulaRecordOpens(n.templateId), kind: src ? src.name : "" };'''),
    (r'''<span className="entry-ref-chip-icon">→</span>{ref.name}''',
     r'''<span className="entry-ref-chip-icon">→</span>{ref.place ? <><span className="entry-ref-chip-position" style={{ opacity: 0.6 }}>{ref.place.path}</span>{" "}{ref.place.name}</> : ref.name}''', 2),
])

# ---------------------------------------------------------------- 14: a picker that keeps its order
edit(MODULES / "14_form-engine-edit.jsx", [
    (r'''  const sorted = [...candidates].sort((a, b) => a.name.localeCompare(b.name));''',
     r'''  // v1.7 r012: a field can keep its candidates in the order they come
  // (keepOrder), as a Fabula picker of scenes keeps the outline's.
  const sorted = field.keepOrder ? [...candidates] : [...candidates].sort((a, b) => a.name.localeCompare(b.name));'''),
])

# ---------------------------------------------------------------- 28: the places, the nodes, the pages
edit(MODULES / "28_fabula.jsx", [
    (r'''// and offer the restore. A link to Fabula's own records keeps its kind's
// sentinel and gets the line its picker shows while the story has none of
// the kind (emptyNote).''',
     r'''// and offer the restore. A link to Fabula's own records keeps its kind's
// sentinel and gets the line its picker shows while the story has none of
// the kind (emptyNote). Since v1.7's r012 a link to acts, chapters, or
// scenes keeps the order its records come in (keepOrder), the outline's
// (fabulaStoryNodes), where other pickers sort by name.'''),
    (r'''      if (k) out = { ...fl, emptyNote: `This story has no ${k.plural} yet.` };''',
     r'''      if (k) out = { ...fl, emptyNote: `This story has no ${k.plural} yet.`, ...(FABULA_OUTLINE_KINDS.includes(k.kind) ? { keepOrder: true } : {}) };'''),
    (r'''// The registered records a story's pickers may offer: everything that isn't
// Fabula's, and Fabula's own records from this story alone (spec, section 3).
const fabulaStoryNodes = (state, storyId) => {
  const fab = state.fabula || {};
  const kindIds = new Set(FABULA_KINDS.map(k => k.id));
  const inStory = new Set();
  FABULA_KINDS.forEach(k => (Array.isArray(fab[k.slice]) ? fab[k.slice] : []).forEach(r => { if (r && r.id && r.storyId === storyId) inStory.add(r.id); }));
  return getRegisteredGraphNodes(state).filter(n => !kindIds.has(n.templateId) || inStory.has(n.id));
};''',
     r'''// The registered records a story's pickers may offer: everything that isn't
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
};'''),
    (r'''      onUpdateViewPrefs={onUpdateViewPrefs}
      canvasSlot={tabs}
      {...panelProps}
    />''',
     r'''      onUpdateViewPrefs={onUpdateViewPrefs}
      registeredNodes={fabulaStoryNodes(state, story.id)}
      canvasSlot={tabs}
      {...panelProps}
    />'''),
    (r'''// A cast record's, an arc's, or a relationship's page, over its story's: its
// fields in view or, with a draft, in edit, its pickers offering the story's
// own records. A cast record whose character was deleted says so.
function FabulaRecordPage(''',
     r'''// A record's page, over its story's (a cast record's, an arc's, or a
// relationship's since v1.7's r009; an act's, a chapter's, or a scene's
// since r011): its fields in view or, with a draft, in edit, its pickers
// offering the story's own records. A cast record whose character was
// deleted says so. Since r012 an act's, a chapter's, or a scene's page says
// where it sits, between its kind and its date (SCENE · II.4.A · UPDATED),
// and a page's references read as its pickers offer them.
function FabulaRecordPage('''),
    (r'''  const gone = kind === "cast" ? record.characterDeleted : null;
''',
     r'''  const gone = kind === "cast" ? record.characterDeleted : null;
  const nodes = fabulaStoryNodes(state, storyId);
  const place = FABULA_OUTLINE_KINDS.includes(kind) ? fabulaOutlinePlaces(state, storyId).get(record.id) : null;
'''),
    (r'''        registeredNodes={fabulaStoryNodes(state, storyId)}''',
     r'''        registeredNodes={nodes}'''),
    (r'''      canvasSlot={note || povNote}
    />''',
     r'''      canvasSlot={note || povNote}
      registeredNodes={nodes}
      badgeExtra={place ? place.path : null}
    />'''),
    (r'''  walk(tree);
  return numbers;
};
''',
     r'''  walk(tree);
  return numbers;
};

// Where each of a story's acts, chapters, and scenes sits (Drak, 2026-10-26;
// v1.7 r012): its path, the act's number, then the chapter's, then the
// scene's letter, joined by dots, so a scene reads II.4.A, a chapter II.4,
// an act II, a scene straight under an act II.A, one at the story's own level
// A, and a chapter outside any act 4; and its index in the outline's order.
// Worked out from the outline each time, as the numbers are.
const fabulaOutlinePlaces = (state, storyId) => {
  const fab = (state && state.fabula) || {};
  const story = (Array.isArray(fab.stories) ? fab.stories : []).find(st => st && st.id === storyId);
  const places = new Map();
  if (!story) return places;
  const tree = fabulaOutlineTree(state, story);
  const numbers = fabulaOutlineNumbers(tree);
  const walk = (nodes, prefix) => nodes.forEach(n => {
    const path = prefix ? `${prefix}.${numbers.get(n.id)}` : numbers.get(n.id);
    places.set(n.id, { path, index: places.size });
    walk(n.children, path);
  });
  walk(tree, "");
  return places;
};
'''),
])

print("v1.7 r012 applied: 13_form-engine-display, 14_form-engine-edit, 28_fabula")
