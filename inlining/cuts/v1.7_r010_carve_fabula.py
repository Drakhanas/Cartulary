#!/usr/bin/env python3
"""
v1.7 r010: carve Fabula out of `27_trunk` (pure split, no gather owed).

Drak's call (2026-10-25), recorded in docs/fabula-spec.md, section 10,
item 1: Fabula grew at `27_trunk`'s tail until its view was in (r008), and
r009 went there too; now it leaves for one file of its own, which every later
Fabula cut edits, to be split into a folder at its section headers once
Fabula is finished. The other ways were a folder split at the four headers
now, or no carve until Fabula is finished.

The arc at r009: `27_trunk` 1-248, HomeView and ProjectView, and 249-1218,
Fabula, four blocks under four column-0 headers, one per cut that wrote them:
  250 `// ─── Fabula: the slice and its seeded schemas (v1.7 r006)`
  506 `// ─── Fabula: the index and the corpus page (v1.7 r007)`
  802 `// ─── Fabula: the story page (v1.7 r008)`
  970 `// ─── Fabula: People (v1.7 r009)`

Members located BY NAME: 34 declarations, one run, FABULA_SCHEMA_SEED
(27_trunk:262) through FabulaRecordPage (1168, closes at 1218). The
preceding declaration, ProjectView, closes at 248.

Seams read before slicing (27_trunk, r009 numbering):
   248 `}`      last line of ProjectView   -> stays in 27_trunk (its new last line)
   249 blank    leads 28_fabula            (rule 1)
   250 `// ─── Fabula: the slice ...`     header travels (rule 3)
  1218 `}`      last line of FabulaRecordPage -> last line of 28_fabula

Result:
  27_trunk.jsx    lines    1-248  (  248)  HomeView and ProjectView, still a trunk arc
  28_fabula.jsx   lines  249-1218 (  970)  new
  downstream reflows +1:
    28_modals  -> 29_modals
    29_trunk   -> 30_trunk

The file is named for the view (fabula, as linea and stemma are). Fabula's
record kinds stay beside the node-source registry in `22_trunk`
(FABULA_KINDS), and App's Fabula state and handlers stay in `12_trunk`:
neither is a run of top-level code at 27_trunk's tail. 27_trunk has no
trailing newline, and neither does the new file, so the count goes 36 -> 37.

Pure carve: `verify` GREEN against the r009 anchor, byte-identity exact; the
`working` rebuild hashes to the artifact Drak passed at r009; then `freeze`
(no name) rewrites the r009 anchor's layout for the 45-file tree, and
`verify` again. No browser pass and no rotation.

Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r010_carve_fabula.py
"""
import re
from pathlib import Path

ROOT = next(p for p in Path(__file__).resolve().parents if (p / 'cartulary-src').is_dir())
MODULES = ROOT / 'cartulary-src' / 'modules'

TRUNK_LINES = 1218
START = 249    # first line of 28_fabula (the leading blank)
END = 1218     # last line of 28_fabula (closing brace of FabulaRecordPage)

RENAMES = [    # reverse order so no rename lands on a name that still exists
    ('29_trunk.jsx', '30_trunk.jsx'),
    ('28_modals.jsx', '29_modals.jsx'),
]

HEADERS = [    # the four headers, at their lines in the new file
    (2, '// ─── Fabula: the slice and its seeded schemas (v1.7 r006)'),
    (258, '// ─── Fabula: the index and the corpus page (v1.7 r007)'),
    (554, '// ─── Fabula: the story page (v1.7 r008)'),
    (722, '// ─── Fabula: People (v1.7 r009)'),
]

MEMBERS = [
    'FABULA_SCHEMA_SEED', 'fabulaSeedSchemas', 'ensureFabulaSlice',
    'fabulaRegistryInstances', 'fabulaRegistryEdges', 'fabulaTemplate', 'fabulaStoryCounts',
    'fabulaCorpusDeleteMessage', 'FabulaStoryLine', 'FabulaStoryRow', 'FabulaIndexView', 'FabulaReadingOrder',
    'FABULA_STORY_PANELS', 'FABULA_STORY_TABS', 'fabulaLiveFields', 'fabulaStoryNodes', 'FabulaStoryTabs',
    'FabulaStoryPage',
    'FABULA_NOUNS', 'FABULA_PAGE_KINDS', 'FABULA_IMPORTANCE', 'fabulaCount', 'fabulaJoin', 'fabulaKindFields',
    'scrubFabulaRefs', 'fabulaInboundCounts', 'fabulaRecordDeleteMessage', 'fabulaStoryDeleteMessage',
    'fabulaDropStoryRecords', 'fabulaFindRecord', 'fabulaRecordOpens', 'fabulaCastNameFill', 'FabulaPeopleTab',
    'FabulaRecordPage',
]

DECL = re.compile(r'^(?:const|let|var|function|class|async function)\s+([A-Za-z0-9_$]+)')


def check(cond, msg):
    if not cond:
        raise SystemExit('ABORT: ' + msg)


def main():
    trunk = MODULES / '27_trunk.jsx'
    text = trunk.read_text(encoding='utf-8')
    check(not text.endswith('\n'), '27_trunk unexpectedly carries a trailing newline')
    lines = text.split('\n')
    check(len(lines) == TRUNK_LINES, f'27_trunk has {len(lines)} lines, expected {TRUNK_LINES}')

    head = lines[:START - 1]
    fab = lines[START - 1:END]
    check((len(head), len(fab)) == (248, 970), f'span sizes {(len(head), len(fab))}')

    # seams, as read
    check(head[-1] == '}', f'27_trunk would not end on a closing brace: {head[-1]!r}')
    check(head[-2] == '  );', f'unexpected line above the seam: {head[-2]!r}')
    check(fab[0] == '', '28_fabula does not lead with a blank')
    check(fab[-1] == '}', f'28_fabula does not end on a closing brace: {fab[-1]!r}')
    for n, h in HEADERS:
        check(fab[n - 1].startswith(h), f'28_fabula:{n} is not its header: {fab[n - 1]!r}')
    check(sum(1 for l in fab if l.startswith('// ─── ')) == 4, 'header count in 28_fabula is not 4')

    # members by name
    check([DECL.match(l).group(1) for l in head if DECL.match(l)] == ['HomeView', 'ProjectView'], 'head members differ')
    members = [DECL.match(l).group(1) for l in fab if DECL.match(l)]
    check(members == MEMBERS, f'28_fabula members differ:\n  got {members}')

    # every source present; every destination that is not itself a source absent
    sources = {old for old, _ in RENAMES}
    for old, new in RENAMES:
        check((MODULES / old).exists(), f'missing {old}')
        if new not in sources:
            check(not (MODULES / new).exists(), f'{new} already exists')
    check(not (MODULES / '28_fabula.jsx').exists(), '28_fabula.jsx already exists')

    # --- mutate ---
    for old, new in RENAMES:
        (MODULES / old).rename(MODULES / new)
    (MODULES / '28_fabula.jsx').write_text('\n'.join(fab), encoding='utf-8')
    trunk.write_text('\n'.join(head), encoding='utf-8')

    files = sorted(MODULES.rglob('[0-9][0-9]_*.jsx'), key=lambda f: f.relative_to(MODULES).as_posix())
    total = sum(len(p.read_text(encoding='utf-8').splitlines()) for p in files)
    nonl = sum(1 for p in files if not p.read_text(encoding='utf-8').endswith('\n'))
    print(f'files {len(files)}  lines {total}  no-trailing-newline {nonl}')
    for p in files[-6:]:
        print(f'  {len(p.read_text(encoding="utf-8").splitlines()):6d}  {p.relative_to(MODULES).as_posix()}')
    print('trunk arcs left:', [p.name for p in files if p.name.endswith('_trunk.jsx')])


if __name__ == '__main__':
    main()
