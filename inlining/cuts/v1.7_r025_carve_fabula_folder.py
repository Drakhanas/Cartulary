#!/usr/bin/env python3
"""
v1.7 r025: split `28_fabula.jsx` into a folder at its section headers (pure
carve, no gather owed, no pass owed).

Drak's call (2026-10-25): Fabula is one file, which every Fabula cut edits,
until Fabula is finished, and then it splits into a folder at its section
headers. Its cut plan finished with the site's Fabula page (2026-10-27), and
Drak took the split as r025, ahead of Stemma v2 (2026-10-27).

28_fabula.jsx at r024: 4,776 lines, 146 declarations, twelve sections, each
under a column-0 header, each header on a rule-1 seam (a blank before it, and
code before the blank). The file leads with its boundary blank and ends on
code (FabulaExportModal's closing brace), with no trailing newline.

  28_fabula/00_seed.jsx        lines    1-270    270 lines   3 decls  FABULA_SCHEMA_SEED .. ensureFabulaSlice
  28_fabula/01_index.jsx       lines  271-604    334 lines   9 decls  fabulaRegistryInstances .. FabulaReadingOrder
  28_fabula/02_story.jsx       lines  605-818    214 lines   6 decls  FABULA_STORY_PANELS .. FabulaStoryPage
  28_fabula/03_people.jsx      lines  819-1092   274 lines  16 decls  FABULA_NOUNS .. FabulaRecordPage
  28_fabula/04_outline.jsx     lines 1093-1850   758 lines  28 decls  FABULA_OUTLINE_KINDS .. FabulaHoldsDeleteModal
  28_fabula/05_plot.jsx        lines 1851-2523   673 lines  25 decls  FABULA_STRUCTURES .. FabulaPlotTab
  28_fabula/06_notes.jsx       lines 2524-2658   135 lines   5 decls  fabulaNoteOpen .. FabulaSceneResearch
  28_fabula/07_meaning.jsx     lines 2659-2885   227 lines   8 decls  fabulaStoryThemes .. FabulaMeaningTab
  28_fabula/08_threads.jsx     lines 2886-3140   255 lines  10 decls  fabulaRoleTemplate .. FabulaEntryStories
  28_fabula/09_templates.jsx   lines 3141-3436   296 lines  14 decls  fabulaSeedIds .. FabulaResetModal
  28_fabula/10_timeline.jsx    lines 3437-4196   760 lines   7 decls  FABULA_TIMELINE_LANES .. FabulaTimelineTab
  28_fabula/11_export.jsx      lines 4197-4776   580 lines  15 decls  FABULA_EXPORT_TITLE .. FabulaExportModal

The directory keeps the file's prefix, so nothing downstream reflows:
29_modals and 30_trunk keep their names. Every part leads with its boundary
blank, carries its header on its second line (rule 3), and ends on code; the
parts tile the file exactly. New files carry no trailing newline, matching
the file they come from and every carve since session 18; the count goes
37 -> 48 and the file count 45 -> 56.

Pure carve: `verify` must come back GREEN against the r024 anchor with
byte-identity exact; then `freeze` (no name) rewrites the anchor's layout for
the new file set; then `verify` again, and `working` hashes to the file Drak
passed at r024. No browser pass (no byte changed), no rotation.
"""
import re
from pathlib import Path

MODULES = Path(__file__).resolve().parent.parent.parent / 'cartulary-src' / 'modules'

FILE_LINES = 4776
PARTS = [  # (file, first line, last line) in 28_fabula's r024 numbering, 1-based inclusive
    ('00_seed.jsx', 1, 270),
    ('01_index.jsx', 271, 604),
    ('02_story.jsx', 605, 818),
    ('03_people.jsx', 819, 1092),
    ('04_outline.jsx', 1093, 1850),
    ('05_plot.jsx', 1851, 2523),
    ('06_notes.jsx', 2524, 2658),
    ('07_meaning.jsx', 2659, 2885),
    ('08_threads.jsx', 2886, 3140),
    ('09_templates.jsx', 3141, 3436),
    ('10_timeline.jsx', 3437, 4196),
    ('11_export.jsx', 4197, 4776),
]
HEADERS = {
    '00_seed.jsx': '// ─── Fabula: the slice and its seeded schemas (v1.7 r006)',
    '01_index.jsx': '// ─── Fabula: the index and the corpus page (v1.7 r007)',
    '02_story.jsx': '// ─── Fabula: the story page (v1.7 r008)',
    '03_people.jsx': '// ─── Fabula: People (v1.7 r009)',
    '04_outline.jsx': '// ─── Fabula: Outline (v1.7 r011)',
    '05_plot.jsx': '// ─── Fabula: Plot (v1.7 r013)',
    '06_notes.jsx': '// ─── Fabula: Notes (v1.7 r014)',
    '07_meaning.jsx': '// ─── Fabula: Meaning (v1.7 r015)',
    '08_threads.jsx': '// ─── Fabula: threads and themes (v1.7 r016)',
    '09_templates.jsx': '// ─── Fabula: templates (v1.7 r017)',
    '10_timeline.jsx': '// ─── Fabula: the timeline (v1.7 r020)',
    '11_export.jsx': '// ─── Fabula: the export (v1.7 r023)',
}
FIRST_LAST = {
    '00_seed.jsx': ('FABULA_SCHEMA_SEED', 'ensureFabulaSlice', 3),
    '01_index.jsx': ('fabulaRegistryInstances', 'FabulaReadingOrder', 9),
    '02_story.jsx': ('FABULA_STORY_PANELS', 'FabulaStoryPage', 6),
    '03_people.jsx': ('FABULA_NOUNS', 'FabulaRecordPage', 16),
    '04_outline.jsx': ('FABULA_OUTLINE_KINDS', 'FabulaHoldsDeleteModal', 28),
    '05_plot.jsx': ('FABULA_STRUCTURES', 'FabulaPlotTab', 25),
    '06_notes.jsx': ('fabulaNoteOpen', 'FabulaSceneResearch', 5),
    '07_meaning.jsx': ('fabulaStoryThemes', 'FabulaMeaningTab', 8),
    '08_threads.jsx': ('fabulaRoleTemplate', 'FabulaEntryStories', 10),
    '09_templates.jsx': ('fabulaSeedIds', 'FabulaResetModal', 14),
    '10_timeline.jsx': ('FABULA_TIMELINE_LANES', 'FabulaTimelineTab', 7),
    '11_export.jsx': ('FABULA_EXPORT_TITLE', 'FabulaExportModal', 15),
}

DECL = re.compile(r'^(?:const|let|var|function|class|async function)\s+([A-Za-z0-9_$]+)')


def check(cond, msg):
    if not cond:
        raise SystemExit('ABORT: ' + msg)


def main():
    src = MODULES / '28_fabula.jsx'
    check(src.exists(), '28_fabula.jsx is missing')
    check(not (MODULES / '28_fabula').exists(), '28_fabula/ already exists')
    text = src.read_text(encoding='utf-8')
    check(not text.endswith('\n'), '28_fabula unexpectedly carries a trailing newline')
    lines = text.split('\n')
    check(len(lines) == FILE_LINES, f'28_fabula has {len(lines)} lines, expected {FILE_LINES}')
    check(lines[0] == '', 'the file does not lead with a blank')
    check(lines[-1] == '}', f'the file does not end on a closing brace: {lines[-1]!r}')

    parts = {}
    cursor = 1
    total_decls = 0
    for name, a, b in PARTS:
        check(a == cursor, f'{name}: starts at {a}, expected {cursor}')
        seg = lines[a - 1:b]
        check(seg[0] == '', f'{name} does not lead with a blank (line {a}: {seg[0]!r})')
        check(seg[1].startswith(HEADERS[name]), f'{name} header missing at line {a + 1}: {seg[1]!r}')
        check(seg[-1] in ('}', '};'), f'{name} does not end on code (line {b}: {seg[-1]!r})')
        check(all(not l.startswith('// ───') for l in seg[2:]), f'{name} holds a second column-0 header')
        if a > 1:
            check(lines[a - 2] in ('}', '};'), f'{name}: the line before its leading blank is not code: {lines[a - 2]!r}')
        members = [DECL.match(l).group(1) for l in seg if DECL.match(l)]
        first, last, count = FIRST_LAST[name]
        check(members and members[0] == first and members[-1] == last and len(members) == count,
              f'{name} members differ: {len(members)} from {members[:1]} to {members[-1:]}')
        total_decls += len(members)
        parts[name] = seg
        cursor = b + 1
    check(cursor == FILE_LINES + 1, f'parts cover through {cursor - 1}, the file is {FILE_LINES}')
    check(sum(len(s) for s in parts.values()) == FILE_LINES, 'parts do not total the file')
    check(total_decls == 146, f'{total_decls} declarations, expected 146')
    check('\n'.join(l for name, _, _ in PARTS for l in parts[name]) == text, 'the parts do not rejoin to the file')

    # --- mutate ---
    d = MODULES / '28_fabula'
    d.mkdir()
    for name, _, _ in PARTS:
        (d / name).write_text('\n'.join(parts[name]), encoding='utf-8')
    src.unlink()

    files = sorted(MODULES.rglob('[0-9][0-9]_*.jsx'), key=lambda f: f.relative_to(MODULES).as_posix())
    total = sum(len(p.read_text(encoding='utf-8').splitlines()) for p in files)
    nonl = sum(1 for p in files if not p.read_text(encoding='utf-8').endswith('\n'))
    print(f'files {len(files)}  lines {total}  no-trailing-newline {nonl}')
    for p in files:
        if '28_fabula' in p.as_posix():
            print(f'  {len(p.read_text(encoding="utf-8").splitlines()):6d}  {p.relative_to(MODULES).as_posix()}')


if __name__ == '__main__':
    main()
