#!/usr/bin/env python3
"""
r049: carve `concordance` out of `16_trunk` (pure split, no gather owed).

The arc at r048: `16_trunk` 1-265 SettingsView (spine-owned residue) and
266-1293 concordance, two contiguous runs tiling the arc after r048 took
cartographia from its tail; concordance's line numbers are the ones published
at r047, as the back-to-front rule promised.

Members located BY NAME: 2 declarations, one run, VAGUE_EDGE_LABELS
(16_trunk:277) and GraphView (279, closes at 1293). Preceding declaration
SettingsView closes at 265.

Seams read before slicing (16_trunk, r048 numbering):
   265 `}`      last line of SettingsView     -> stays in 16_trunk (its new last line)
   266 blank    leads 17_concordance          (rule 1)
   267 `// ─── Graph view ───`                header travels (rule 3)
  1293 `}`      last line of GraphView        -> last line of 17_concordance

Result:
  16_trunk.jsx          lines    1-265   (  265)  SettingsView alone; stays a trunk arc,
                                                  spine-owned residue by the session-16 note
  17_concordance.jsx    lines  266-1293  (1,028)  new
  everything downstream reflows +1 (the second time this session):
    17_cartographia/ -> 18_cartographia/    23_ephemeris/   -> 24_ephemeris/
    18_chronometric  -> 19_chronometric     24_kalendarium  -> 25_kalendarium
    19_linea         -> 20_linea            25_home-data    -> 26_home-data
    20_stemma        -> 21_stemma           26_trunk        -> 27_trunk
    21_trunk         -> 22_trunk            27_modals       -> 28_modals
    22_glossopoeia/  -> 23_glossopoeia/     28_trunk        -> 29_trunk

The file is named for the product (concordance, as linea and stemma are),
not for the code (GraphView). New file without a trailing newline: 35 -> 36.

Decided at the fork (Drak, 2026-10-22): every recommendation.

Pure carve: `verify` GREEN against the r047 anchor, byte-identity exact; then
`freeze` (no name) rewrites the layout for the 44-file tree; then `verify`
again. No browser pass. With this cut every module the plan named is carved;
pillar 2's carve list is complete, with `16_trunk` holding SettingsView as
residue, as recorded.
"""
import re
from pathlib import Path

MODULES = Path(__file__).resolve().parent.parent.parent / 'cartulary-src' / 'modules'

TRUNK_LINES = 1293
START = 266    # first line of 17_concordance (the leading blank)
END = 1293     # last line of 17_concordance (closing brace of GraphView)

RENAMES = [    # reverse order so no rename lands on a name that still exists
    ('28_trunk.jsx', '29_trunk.jsx'),
    ('27_modals.jsx', '28_modals.jsx'),
    ('26_trunk.jsx', '27_trunk.jsx'),
    ('25_home-data.jsx', '26_home-data.jsx'),
    ('24_kalendarium.jsx', '25_kalendarium.jsx'),
    ('23_ephemeris', '24_ephemeris'),
    ('22_glossopoeia', '23_glossopoeia'),
    ('21_trunk.jsx', '22_trunk.jsx'),
    ('20_stemma.jsx', '21_stemma.jsx'),
    ('19_linea.jsx', '20_linea.jsx'),
    ('18_chronometric.jsx', '19_chronometric.jsx'),
    ('17_cartographia', '18_cartographia'),
]

DECL = re.compile(r'^(?:const|let|var|function|class|async function)\s+([A-Za-z0-9_$]+)')


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
    conc = lines[START - 1:END]
    check((len(head), len(conc)) == (265, 1028), f'span sizes {(len(head), len(conc))}')

    # seams, as read
    check(head[0] == '', 'head does not lead with a blank')
    check(head[1].startswith('// ─── Settings'), f'head header missing: {head[1]!r}')
    check(head[-1] == '}', f'head does not end on a closing brace: {head[-1]!r}')
    check(conc[0] == '', 'concordance does not lead with a blank')
    check(conc[1].startswith('// ─── Graph view'), f'concordance header missing: {conc[1]!r}')
    check(conc[-1] == '}', f'concordance does not end on a closing brace: {conc[-1]!r}')

    # members by name
    check([DECL.match(l).group(1) for l in head if DECL.match(l)] == ['SettingsView'], 'head members differ')
    members = [DECL.match(l).group(1) for l in conc if DECL.match(l)]
    check(members == ['VAGUE_EDGE_LABELS', 'GraphView'], f'concordance members differ:\n  got {members}')

    # every source present; every destination that is not itself a source absent
    sources = {old for old, _ in RENAMES}
    for old, new in RENAMES:
        check((MODULES / old).exists(), f'missing {old}')
        if new not in sources:
            check(not (MODULES / new).exists(), f'{new} already exists')
    check(not (MODULES / '17_concordance.jsx').exists(), '17_concordance.jsx already exists')

    # --- mutate ---
    for old, new in RENAMES:
        (MODULES / old).rename(MODULES / new)
    (MODULES / '17_concordance.jsx').write_text('\n'.join(conc), encoding='utf-8')
    trunk.write_text('\n'.join(head), encoding='utf-8')

    files = sorted(MODULES.rglob('[0-9][0-9]_*.jsx'), key=lambda f: f.relative_to(MODULES).as_posix())
    total = sum(len(p.read_text(encoding='utf-8').splitlines()) for p in files)
    nonl = sum(1 for p in files if not p.read_text(encoding='utf-8').endswith('\n'))
    print(f'files {len(files)}  lines {total}  no-trailing-newline {nonl}')
    for p in files:
        print(f'  {len(p.read_text(encoding="utf-8").splitlines()):6d}  {p.relative_to(MODULES).as_posix()}')
    print('trunk arcs left:', [p.name for p in files if p.name.endswith('_trunk.jsx')])


if __name__ == '__main__':
    main()
