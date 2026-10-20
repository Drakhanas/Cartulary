#!/usr/bin/env python3
"""
r028: carve `linea` out of `16_trunk` (pure split, no gather owed).

Members located BY NAME in the r027 tree: 3 declarations, one contiguous run,
buildFamilyData (16_trunk:3583), buildFamilyTree (3645), FamilyView (3694,
closes at 4225, which is the end of the file after r027 took stemma).
Preceding declaration ChronoEditPanel (chronometric) closes at 3579.

Seams read before slicing (16_trunk, r027 numbering):
  3579 `}`                               last line of ChronoEditPanel  -> stays in 16_trunk
  3580 blank                             leads the linea file          (rule 1)
  3581 `// ─── Family tree view ───`     header travels                (rule 3)
  3583 `function buildFamilyData(`
  4225 `}`                               last line of FamilyView, last line of the file

Result:
  16_trunk.jsx  lines    1-3579  (3,579)  SettingsView, concordance, cartographia,
                                          chronometric (span 2052-3579 unchanged)
  17_linea.jsx  lines 3580-4225  (  646)  new
  everything from 17_stemma on reflows +1:
    17_stemma -> 18_stemma        21_trunk     -> 22_trunk
    18_trunk  -> 19_trunk         22_home-data -> 23_home-data
    19_glossopoeia/ -> 20_glossopoeia/   23_trunk -> 24_trunk
    20_ephemeris/   -> 21_ephemeris/     24_modals -> 25_modals
                                         25_trunk  -> 26_trunk

No trailing newline on the new file (matches 16_trunk and the r023+ carves).
"""
import re
from pathlib import Path

MODULES = Path(__file__).resolve().parent.parent / 'cartulary-src' / 'modules'

START = 3580   # first line of 17_linea (the leading blank)
TRUNK_LINES = 4225

RENAMES = [    # reverse order so no rename lands on a name that still exists
    ('25_trunk.jsx', '26_trunk.jsx'),
    ('24_modals.jsx', '25_modals.jsx'),
    ('23_trunk.jsx', '24_trunk.jsx'),
    ('22_home-data.jsx', '23_home-data.jsx'),
    ('21_trunk.jsx', '22_trunk.jsx'),
    ('20_ephemeris', '21_ephemeris'),
    ('19_glossopoeia', '20_glossopoeia'),
    ('18_trunk.jsx', '19_trunk.jsx'),
    ('17_stemma.jsx', '18_stemma.jsx'),
]

DECL = re.compile(r'^(?:const|let|var|function|class|async function)\s+([A-Za-z0-9_$]+)')
EXPECTED_MEMBERS = ['buildFamilyData', 'buildFamilyTree', 'FamilyView']


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
    linea = lines[START - 1:]
    check((len(head), len(linea)) == (3579, 646), f'span sizes {(len(head), len(linea))}')

    check(head[-1] == '}', f'head does not end on a closing brace: {head[-1]!r}')
    check(linea[0] == '', 'linea does not lead with a blank')
    check(linea[1].startswith('// ─── Family tree view'), f'linea header missing: {linea[1]!r}')
    check(linea[-1] == '}', f'linea does not end on a closing brace: {linea[-1]!r}')

    members = [DECL.match(l).group(1) for l in linea if DECL.match(l)]
    check(members == EXPECTED_MEMBERS, f'linea members differ:\n  got {members}')
    leaked = [DECL.match(l).group(1) for l in head if DECL.match(l) and 'family' in l.lower()]
    check(not leaked, f'family-named declarations left in the head: {leaked}')

    sources = {old for old, _ in RENAMES}
    for old, new in RENAMES:
        check((MODULES / old).exists(), f'missing {old}')
        if new not in sources:
            check(not (MODULES / new).exists(), f'{new} already exists')
    check(not (MODULES / '17_linea.jsx').exists(), '17_linea.jsx already exists')

    # --- mutate ---
    for old, new in RENAMES:
        (MODULES / old).rename(MODULES / new)
    (MODULES / '17_linea.jsx').write_text('\n'.join(linea), encoding='utf-8')
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
