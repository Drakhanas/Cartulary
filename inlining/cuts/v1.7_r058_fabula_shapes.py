r"""
v1.7 r058: the rest of Fabula's new records start from their shapes, the
Sweep's eighth cut.

docs/sweep-spec.md, section 3, added at Drak's call a (2026-11-02) after
r057's turnover read found them starting empty. r057 made a new corpus's,
cast record's, arc's, relationship's, promise's, and research note's grids
start from their kind's shapes, through createCorpus and newFabulaRecord;
the records made elsewhere took nothing from a shape. Now they do, through
r057's gridsFromShapes, and a kind or template with no shaped Grid field
makes its records exactly as before.

The plan's defaults: a new plot point keeps its slot beside its grids; a
thread or theme made from a story's page takes its grids alone, its other
fields as the buttons made them.

- 12_trunk: createStory's new story starts with Story's shaped grids.
- 28_fabula/04_outline: fabulaOutlineCreate's new act, chapter, or scene
  starts with its kind's shaped grids.
- 28_fabula/05_plot: fabulaPlotCreate's new plot point starts with Plot
  Point's shaped grids and its slot; fabulaWithNewThread's Plot Thread entry
  (+ New Thread) with its template's.
- 28_fabula/07_meaning: fabulaWithNewTheme's Theme / Motif entry (+ New
  Theme) with its template's.

Declared scope: 12_trunk, 28_fabula/04_outline, 28_fabula/05_plot,
28_fabula/07_meaning. No declaration added or removed. No header added.

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given), and nothing is written unless every anchor holds.
Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r058_fabula_shapes.py
"""
from pathlib import Path

ROOT = next(p for p in Path(__file__).resolve().parents if (p / 'cartulary-src').is_dir())
MODULES = ROOT / "cartulary-src" / "modules"

PLAN = []


def B(s):
    """A block written with its opening newline, which isn't part of it."""
    return s[1:] if s.startswith("\n") else s


def edit(path, steps):
    PLAN.append((path, steps))


# ------------------------------------------------------------------ 12_trunk
edit(MODULES / "12_trunk.jsx", [
    (B('''
      stories: [...fabArr(fab, "stories"), { id, name: "Untitled story", fields: {}, outline: [], createdAt: now, updatedAt: now }],
'''), B('''
      // v1.7 r058: Story's shaped grids, as a new corpus takes Corpus's.
      stories: [...fabArr(fab, "stories"), { id, name: "Untitled story", fields: gridsFromShapes(fabulaKindFields({ fabula: fab }, "story")), outline: [], createdAt: now, updatedAt: now }],
''')),
])

# ------------------------------------------------------------ 28_fabula/04_outline
edit(MODULES / "28_fabula" / "04_outline.jsx", [
    (B('''
  const rec = { id, storyId, name, fields: {}, createdAt: now, updatedAt: now };
'''), B('''
  const rec = { id, storyId, name, fields: gridsFromShapes(fabulaKindFields({ fabula: fab }, kind)), createdAt: now, updatedAt: now };  // v1.7 r058: its kind's shaped grids
''')),
])

# ------------------------------------------------------------ 28_fabula/05_plot
edit(MODULES / "28_fabula" / "05_plot.jsx", [
    (B('''
  const rec = { id, storyId, name: title || heading.name, fields: { slot: fabulaSlotValue(heading) }, createdAt: now, updatedAt: now };
'''), B('''
  // v1.7 r058: Plot Point's shaped grids beside the slot.
  const rec = { id, storyId, name: title || heading.name, fields: { ...gridsFromShapes(fabulaKindFields({ fabula: fab }, "plotPoint")), slot: fabulaSlotValue(heading) }, createdAt: now, updatedAt: now };
''')),
    (B('''
  const entry = { id: freshNameId("ent", title, new Set((state.entries || []).map(e => e && e.id)), "thread"), templateId: tplId, name: title, calendarId: null, fields: {}, tags: [], createdAt: now, updatedAt: now };
'''), B('''
  // v1.7 r058: the template's shaped grids, as + New Entry gives them.
  const tpl = (state.templates || []).find(t => t && t.id === tplId);
  const entry = { id: freshNameId("ent", title, new Set((state.entries || []).map(e => e && e.id)), "thread"), templateId: tplId, name: title, calendarId: null, fields: gridsFromShapes(tpl && tpl.fields), tags: [], createdAt: now, updatedAt: now };
''')),
])

# ------------------------------------------------------------ 28_fabula/07_meaning
edit(MODULES / "28_fabula" / "07_meaning.jsx", [
    (B('''
  const entry = { id: freshNameId("ent", title, new Set((state.entries || []).map(e => e && e.id)), "theme"), templateId: tplId, name: title, calendarId: null, fields: {}, tags: [], createdAt: now, updatedAt: now };
'''), B('''
  // v1.7 r058: the template's shaped grids, as + New Entry gives them.
  const tpl = (state.templates || []).find(t => t && t.id === tplId);
  const entry = { id: freshNameId("ent", title, new Set((state.entries || []).map(e => e && e.id)), "theme"), templateId: tplId, name: title, calendarId: null, fields: gridsFromShapes(tpl && tpl.fields), tags: [], createdAt: now, updatedAt: now };
''')),
])


def main():
    staged = []
    for path, steps in PLAN:
        text = path.read_text(encoding="utf-8")
        for step in steps:
            old, new = step[0], step[1]
            count = step[2] if len(step) > 2 else 1
            n = text.count(old)
            assert n == count, f"{path.name}: anchor occurs {n} times, not {count}:\n{old[:300]}"
            text = text.replace(old, new)
        if chr(0xFEFF) in text:
            raise SystemExit(f"{path.name}: a byte-order mark would be written")
        staged.append((path, text))
    for path, text in staged:
        path.write_text(text, encoding="utf-8")
    print(f"r058 applied to {len(staged)} files")


if __name__ == "__main__":
    main()
