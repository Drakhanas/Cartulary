#!/usr/bin/env python3
"""
r029: carve `chronometric` out of `16_trunk` (pure split, no gather owed).

Members located BY NAME in the r028 tree: 3 declarations, one contiguous run,
TimelineView (16_trunk:2055), ChronometricsView (2340), ChronoEditPanel (3407,
closes at 3579, which is the end of the file after r028 took linea).
Preceding declaration CartographiaIndexView closes at 2051.

Seams read before slicing (16_trunk, r028 numbering):
  2051 `}`                            last line of CartographiaIndexView -> stays in 16_trunk
  2052 blank                          leads the chronometric file         (rule 1)
  2053 `// ─── Timeline view ───`     header travels                      (rule 3)
  2055 `function TimelineView(`
  3579 `}`                            last line of ChronoEditPanel, last line of the file

Result:
  16_trunk.jsx         lines    1-2051  (2,051)  SettingsView, concordance, cartographia
  17_chronometric.jsx  lines 2052-3579  (1,528)  new
  everything from 17_linea on reflows +1:
    17_linea  -> 18_linea         22_trunk     -> 23_trunk
    18_stemma -> 19_stemma        23_home-data -> 24_home-data
    19_trunk  -> 20_trunk         24_trunk     -> 25_trunk
    20_glossopoeia/ -> 21_glossopoeia/   25_modals -> 26_modals
    21_ephemeris/   -> 22_ephemeris/     26_trunk  -> 27_trunk

No trailing newline on the new file (matches 16_trunk and the r023+ carves).
"""
import re
from pathlib import Path

MODULES = Path(__file__).resolve().parent.parent / 'cartulary-src' / 'modules'

START = 2052   # first line of 17_chronometric (the leading blank)
TRUNK_LINES = 3579

RENAMES = [    # reverse order so no rename lands on a name that still exists
    ('26_trunk.jsx', '27_trunk.jsx'),
    ('25_modals.jsx', '26_modals.jsx'),
    ('24_trunk.jsx', '25_trunk.jsx'),
    ('23_home-data.jsx', '24_home-data.jsx'),
    ('22_trunk.jsx', '23_trunk.jsx'),
    ('21_ephemeris', '22_ephemeris'),
    ('20_glossopoeia', '21_glossopoeia'),
    ('19_trunk.jsx', '20_trunk.jsx'),
    ('18_stemma.jsx', '19_stemma.jsx'),
    ('17_linea.jsx', '18_linea.jsx'),
]

DECL = re.compile(r'^(?:const|let|var|function|class|async function)\s+([A-Za-z0-9_$]+)')
EXPECTED_MEMBERS = ['TimelineView', 'ChronometricsView', 'ChronoEditPanel']


def check(cond, msg):
    if not cond:
        raise SystemExit('ABORT: ' + msg)


def main():
    trunk = MODULES / '16_trunk.jsx'
    text = trunk.read_text(encoding='utf-8')
    check(not text.endswith('\n'), '16_trunk unexpectedly carries a trailing newline')
    lines = text.split('\n')
    check(len(lines) == TRUNK_LINES, f'16_trunk has {len(lines)} lines, expected {TRUNK_LINES}')

    head = lines[:START - 1]
    chrono = lines[START - 1:]
    check((len(head), len(chrono)) == (2051, 1528), f'span sizes {(len(head), len(chrono))}')

    check(head[-1] == '}', f'head does not end on a closing brace: {head[-1]!r}')
    check(chrono[0] == '', 'chronometric does not lead with a blank')
    check(chrono[1].startswith('// ─── Timeline view'), f'chronometric header missing: {chrono[1]!r}')
    check(chrono[-1] == '}', f'chronometric does not end on a closing brace: {chrono[-1]!r}')

    members = [DECL.match(l).group(1) for l in chrono if DECL.match(l)]
    check(members == EXPECTED_MEMBERS, f'chronometric members differ:\n  got {members}')
    leaked = [DECL.match(l).group(1) for l in head
              if DECL.match(l) and re.search(r'chrono|timeline', l, re.I)]
    check(not leaked, f'chrono/timeline-named declarations left in the head: {leaked}')

    sources = {old for old, _ in RENAMES}
    for old, new in RENAMES:
        check((MODULES / old).exists(), f'missing {old}')
        if new not in sources:
            check(not (MODULES / new).exists(), f'{new} already exists')
    check(not (MODULES / '17_chronometric.jsx').exists(), '17_chronometric.jsx already exists')

    # --- mutate ---
    for old, new in RENAMES:
        (MODULES / old).rename(MODULES / new)
    (MODULES / '17_chronometric.jsx').write_text('\n'.join(chrono), encoding='utf-8')
    trunk.write_text('\n'.join(head), encoding='utf-8')

    files = sorted(MODULES.rglob('[0-9][0-9]_*.jsx'), key=lambda f: f.relative_to(MODULES).as_posix())
    total = sum(len(p.read_text(encoding='utf-8').splitlines()) for p in files)
    nonl = sum(1 for p in files if not p.read_text(encoding='utf-8').endswith('\n'))
    print(f'files {len(files)}  lines {total}  no-trailing-newline {nonl}')
    for p in files:
        if p.relative_to(MODULES).as_posix()[:2] >= '16':
            print(f'  {len(p.read_text(encoding="utf-8").splitlines()):6d}  {p.relative_to(MODULES).as_posix()}')


if __name__ == '__main__':
    main()
