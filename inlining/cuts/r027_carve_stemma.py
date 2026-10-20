#!/usr/bin/env python3
"""
r027: carve `stemma` out of `16_trunk` (pure split, no gather owed).

Members located BY NAME in the r026 tree: 18 declarations, one contiguous run,
STEMMA_SLOTS (16_trunk:4234) through StemmaIndexView (16_trunk:5528, closes at
5635). Preceding declaration FamilyView (linea) closes at 4225; following
declaration SYNTH_TPL_ASTROBODY (node-source registry) opens at 5672.

Seams read before slicing (16_trunk, r026 numbering):
  4225 `}`                       last line of FamilyView        -> stays in 16_trunk
  4226 blank                     leads the stemma file          (rule 1)
  4227 `// ─── Stemma helpers and canvas ───`  header travels    (rule 3)
  5635 `}`                       last line of StemmaIndexView   -> last line of 17_stemma
  5636 blank                     leads the tail file            (rule 1)
  5637 `// ── Node-source registry (v1.5 r075) ──`              -> 18_trunk

Result:
  16_trunk.jsx   lines    1-4225  (4,225)  SettingsView, concordance, cartographia,
                                           chronometric, linea  (spans unchanged)
  17_stemma.jsx  lines 4226-5635  (1,410)  new
  18_trunk.jsx   lines 5636-5989  (  354)  node-source registry
  everything downstream reflows +2:
    17_glossopoeia/ -> 19_glossopoeia/     20_home-data -> 22_home-data
    18_ephemeris/   -> 20_ephemeris/       21_trunk     -> 23_trunk
    19_trunk        -> 21_trunk            22_modals    -> 24_modals
                                           23_trunk     -> 25_trunk

Back-to-front order chosen on purpose: stemma was the last of the three
16_trunk carves in source order, so chronometric (2052-3579) and linea
(3580-4225) keep their published spans after this cut.

New files carry no trailing newline, matching 16_trunk and every file the
r023/r024 carves wrote. The assembler rstrips per file, so the body is
unaffected either way; the count is a facts.json figure, so it is kept
deliberate: 26 -> 28.
"""
import re
from pathlib import Path

MODULES = Path(__file__).resolve().parent.parent / 'cartulary-src' / 'modules'

START = 4226   # first line of 17_stemma (the leading blank)
END = 5635     # last line of 17_stemma (closing brace of StemmaIndexView)
TRUNK_LINES = 5989

RENAMES = [    # reverse order so no rename lands on a name that still exists
    ('23_trunk.jsx', '25_trunk.jsx'),
    ('22_modals.jsx', '24_modals.jsx'),
    ('21_trunk.jsx', '23_trunk.jsx'),
    ('20_home-data.jsx', '22_home-data.jsx'),
    ('19_trunk.jsx', '21_trunk.jsx'),
    ('18_ephemeris', '20_ephemeris'),
    ('17_glossopoeia', '19_glossopoeia'),
]

DECL = re.compile(r'^(?:const|let|var|function|class|async function)\s+([A-Za-z0-9_$]+)')
EXPECTED_MEMBERS = [
    'STEMMA_SLOTS', 'stemmaSlotAngle', 'findStemmaNode', 'findStemmaNodePath',
    'regenerateStemmaIds', 'normalizeImportedStemma', 'collectStemmaMissingRefs',
    'countStemmaNodes', 'countStemmaDescendants', 'StemmaNode', 'StemmaPlusSlot',
    'StemmaSmartInput', 'StemmaInspectorEntryPicker', 'StemmaInspector',
    'FreeformInspectorBody', 'LinkedInspectorBody', 'StemmaCanvasView',
    'StemmaIndexView',
]


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
    stemma = lines[START - 1:END]
    tail = lines[END:]
    check((len(head), len(stemma), len(tail)) == (4225, 1410, 354),
          f'span sizes {(len(head), len(stemma), len(tail))}')

    # seams, as read
    check(head[-1] == '}', f'head does not end on a closing brace: {head[-1]!r}')
    check(stemma[0] == '', 'stemma does not lead with a blank')
    check(stemma[1].startswith('// ─── Stemma helpers and canvas'), f'stemma header missing: {stemma[1]!r}')
    check(stemma[-1] == '}', f'stemma does not end on a closing brace: {stemma[-1]!r}')
    check(tail[0] == '', 'tail does not lead with a blank')
    check(tail[1].startswith('// ── Node-source registry'), f'tail header missing: {tail[1]!r}')
    check(tail[-1].strip() != '', 'tail ends on a blank (rule 1)')

    # members by name: exactly the 18, in order, and none of them left behind
    members = [DECL.match(l).group(1) for l in stemma if DECL.match(l)]
    check(members == EXPECTED_MEMBERS, f'stemma members differ:\n  got {members}')
    leaked = [DECL.match(l).group(1) for l in head + tail if DECL.match(l) and 'stemma' in l.lower()]
    check(not leaked, f'stemma-named declarations outside the span: {leaked}')

    # every source present; every destination that is not itself a source absent
    sources = {old for old, _ in RENAMES}
    for old, new in RENAMES:
        check((MODULES / old).exists(), f'missing {old}')
        if new not in sources:
            check(not (MODULES / new).exists(), f'{new} already exists')
    for fresh in ('17_stemma.jsx', '18_trunk.jsx'):
        check(not (MODULES / fresh).exists(), f'{fresh} already exists')

    # --- mutate ---
    for old, new in RENAMES:
        (MODULES / old).rename(MODULES / new)
    (MODULES / '17_stemma.jsx').write_text('\n'.join(stemma), encoding='utf-8')
    (MODULES / '18_trunk.jsx').write_text('\n'.join(tail), encoding='utf-8')
    trunk.write_text('\n'.join(head), encoding='utf-8')

    files = sorted(MODULES.rglob('[0-9][0-9]_*.jsx'), key=lambda f: f.relative_to(MODULES).as_posix())
    total = sum(len(p.read_text(encoding='utf-8').splitlines()) for p in files)
    nonl = sum(1 for p in files if not p.read_text(encoding='utf-8').endswith('\n'))
    print(f'files {len(files)}  lines {total}  no-trailing-newline {nonl}')
    for p in files:
        print(f'  {len(p.read_text(encoding="utf-8").splitlines()):6d}  {p.relative_to(MODULES).as_posix()}')


if __name__ == '__main__':
    main()
