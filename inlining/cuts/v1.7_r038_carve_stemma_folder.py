#!/usr/bin/env python3
"""
v1.7 r038: split `21_stemma.jsx` into a folder at its section headers (pure
carve, no gather owed, no pass owed).

Stemma v2's plan item 14 (`docs/stemma-v2-spec.md`, section 11), the plan's
last: the carve of `21_stemma` at its seven section headers, pure, byte for
byte, as r025's split of `28_fabula` was. Two headers had drifted from their
blocks, so Drak took a gather first (2026-10-28): r037 moved the rota's
transforms below `StemmaCanvasView` and the tabula's canvas header down to
its canvas, and every member now reads under the header that names it.

21_stemma.jsx at r037: 4,601 lines, 101 declarations, seven sections, each
under a column-0 header with its boundary blank before it and code before
the blank. The file leads with its boundary blank and ends on code
(`TabulaCanvasView`'s closing brace), with no trailing newline.

  21_stemma/00_helpers-canvas.jsx   lines    1-1585  1,585 lines  21 decls  STEMMA_SLOTS .. StemmaCanvasView
  21_stemma/01_transforms.jsx       lines 1586-1767    182 lines  12 decls  addChildToStemmaTree .. stemmaRotateChild
  21_stemma/02_markdown.jsx         lines 1768-1853     86 lines   1 decl   stemmaMarkdown
  21_stemma/03_index.jsx            lines 1854-1986    133 lines   1 decl   StemmaIndexView
  21_stemma/04_tabula-document.jsx  lines 1987-2703    717 lines  53 decls  TABULA .. tabulaDeleteShape
  21_stemma/05_tabula-drawing.jsx   lines 2704-3192    489 lines   6 decls  TABULA_TOOLS .. TabulaShapePanel
  21_stemma/06_tabula-canvas.jsx    lines 3193-4601  1,409 lines   7 decls  useTabulaGestures .. TabulaCanvasView

The parts are named for their headers (Claude's default, said at r037's
staging; Drak passed r037 without changing it). One seam is two blanks
deep: the tabula's document ends, as it has since r029, with two blank
lines before the next header, and rule 1 gives both to the following file, so
`05_tabula-drawing.jsx` leads with two blanks and carries its header on its
third line; every other part carries it on its second. The directory keeps
the file's prefix, so nothing downstream reflows: `22_trunk` and the rest
keep their names. Every part ends on code, and the parts tile the file
exactly. New files carry no trailing newline, matching the file they come
from; the module count goes 56 -> 62, and the no-trailing-newline count
48 -> 54.

Pure carve: `verify` must come back GREEN against the r037 anchor with
byte-identity exact; then `freeze` (no name) rewrites the anchor's layout for
the new file set; then `verify` again, and `working` hashes to the file Drak
passed at r037. No browser pass (no byte changed), no rotation.

Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r038_carve_stemma_folder.py
"""
import re
from pathlib import Path

ROOT = next(p for p in Path(__file__).resolve().parents if (p / 'cartulary-src').is_dir())
MODULES = ROOT / 'cartulary-src' / 'modules'

FILE_LINES = 4601
PARTS = [  # (file, first line, last line) in 21_stemma's r037 numbering, 1-based inclusive
    ('00_helpers-canvas.jsx', 1, 1585),
    ('01_transforms.jsx', 1586, 1767),
    ('02_markdown.jsx', 1768, 1853),
    ('03_index.jsx', 1854, 1986),
    ('04_tabula-document.jsx', 1987, 2703),
    ('05_tabula-drawing.jsx', 2704, 3192),
    ('06_tabula-canvas.jsx', 3193, 4601),
]
HEADERS = {  # the header each part carries, and how many boundary blanks lead it
    '00_helpers-canvas.jsx': ('// ─── Stemma helpers and canvas ', 1),
    '01_transforms.jsx': ('// ─── Stemma transforms ', 1),
    '02_markdown.jsx': ('// ─── Stemma Markdown (v1.7 r035) ', 1),
    '03_index.jsx': ('// ─── Stemma index view ', 1),
    '04_tabula-document.jsx': ('// ─── Tabula: the document (v1.7 r029) ', 1),
    '05_tabula-drawing.jsx': ('// ─── Tabula: the drawing layer (v1.7 r032) ', 2),
    '06_tabula-canvas.jsx': ('// ─── Tabula: the canvas (v1.7 r029) ', 1),
}
FIRST_LAST = {
    '00_helpers-canvas.jsx': ('STEMMA_SLOTS', 'StemmaCanvasView', 21),
    '01_transforms.jsx': ('addChildToStemmaTree', 'stemmaRotateChild', 12),
    '02_markdown.jsx': ('stemmaMarkdown', 'stemmaMarkdown', 1),
    '03_index.jsx': ('StemmaIndexView', 'StemmaIndexView', 1),
    '04_tabula-document.jsx': ('TABULA', 'tabulaDeleteShape', 53),
    '05_tabula-drawing.jsx': ('TABULA_TOOLS', 'TabulaShapePanel', 6),
    '06_tabula-canvas.jsx': ('useTabulaGestures', 'TabulaCanvasView', 7),
}

DECL = re.compile(r'^(?:const|let|var|function|class|async function)\s+([A-Za-z0-9_$]+)')


def check(cond, msg):
    if not cond:
        raise SystemExit('ABORT: ' + msg)


def main():
    src = MODULES / '21_stemma.jsx'
    check(src.exists(), '21_stemma.jsx is missing')
    check(not (MODULES / '21_stemma').exists(), '21_stemma/ already exists')
    text = src.read_text(encoding='utf-8')
    check(not text.endswith('\n'), '21_stemma unexpectedly carries a trailing newline')
    lines = text.split('\n')
    check(len(lines) == FILE_LINES, f'21_stemma has {len(lines)} lines, expected {FILE_LINES}')
    check(lines[0] == '', 'the file does not lead with a blank')
    check(lines[-1] == '}', f'the file does not end on a closing brace: {lines[-1]!r}')

    parts = {}
    cursor = 1
    total_decls = 0
    for name, a, b in PARTS:
        check(a == cursor, f'{name}: starts at {a}, expected {cursor}')
        seg = lines[a - 1:b]
        header, lead = HEADERS[name]
        check(all(l == '' for l in seg[:lead]), f'{name} does not lead with {lead} blank line(s) (line {a}: {seg[0]!r})')
        check(seg[lead].startswith(header), f'{name} header missing at line {a + lead}: {seg[lead]!r}')
        check(seg[-1].strip() != '', f'{name} ends on a blank (line {b})')
        check(all(not l.startswith('// ───') for l in seg[lead + 1:]), f'{name} holds a second column-0 header')
        if a > 1:
            check(lines[a - 2].strip() != '', f'{name}: the line before its leading blanks is not code: {lines[a - 2]!r}')
        members = [DECL.match(l).group(1) for l in seg if DECL.match(l)]
        first, last, count = FIRST_LAST[name]
        check(members and members[0] == first and members[-1] == last and len(members) == count,
              f'{name} members differ: {len(members)} from {members[:1]} to {members[-1:]}')
        total_decls += len(members)
        parts[name] = seg
        cursor = b + 1
    check(cursor == FILE_LINES + 1, f'parts cover through {cursor - 1}, the file is {FILE_LINES}')
    check(sum(len(s) for s in parts.values()) == FILE_LINES, 'parts do not total the file')
    check(total_decls == 101, f'{total_decls} declarations, expected 101')
    check('\n'.join(l for name, _, _ in PARTS for l in parts[name]) == text, 'the parts do not rejoin to the file')

    # --- mutate ---
    d = MODULES / '21_stemma'
    d.mkdir()
    for name, _, _ in PARTS:
        (d / name).write_text('\n'.join(parts[name]), encoding='utf-8')
    src.unlink()

    files = sorted(MODULES.rglob('[0-9][0-9]_*.jsx'), key=lambda f: f.relative_to(MODULES).as_posix())
    total = sum(len(p.read_text(encoding='utf-8').splitlines()) for p in files)
    nonl = sum(1 for p in files if not p.read_text(encoding='utf-8').endswith('\n'))
    print(f'files {len(files)}  lines {total}  no-trailing-newline {nonl}')
    for p in files:
        if '21_stemma' in p.as_posix():
            print(f'  {len(p.read_text(encoding="utf-8").splitlines()):6d}  {p.relative_to(MODULES).as_posix()}')


if __name__ == '__main__':
    main()
