#!/usr/bin/env python3
"""
r030: carve `kalendarium` (pure split, no gather owed, no reflow).

The arc that was `19_trunk` at r025 (and is `23_trunk` after the r027-r029
reflows) is kalendarium end to end: r025 moved its two residue lines
(877-878, the `Home view` header) into `20_home-data`. Nothing is left to
split, so the carve is a whole-arc rename, the same shape as `11_io-utils`.

Members located BY NAME: 3 declarations, one run, KalendariumIndexView
(23_trunk:24), CalendarGridView (324), KalendariumEditorView (765, closes at 876).
Line 1 blank (rule 1), line 2 `// ─── Kalendarium views (v1.4) ───` (rule 3),
line 876 `}`.

Result: 23_trunk.jsx -> 23_kalendarium.jsx (876 lines). The NN prefix stays, so
no downstream reflow and the only trunk arcs left are 00, 02, 04, 09, 12, 16,
20, 25 and 27.
"""
import re
from pathlib import Path

MODULES = Path(__file__).resolve().parent.parent / 'cartulary-src' / 'modules'
DECL = re.compile(r'^(?:const|let|var|function|class|async function)\s+([A-Za-z0-9_$]+)')
EXPECTED_MEMBERS = ['KalendariumIndexView', 'CalendarGridView', 'KalendariumEditorView']


def check(cond, msg):
    if not cond:
        raise SystemExit('ABORT: ' + msg)


def main():
    src = MODULES / '23_trunk.jsx'
    dst = MODULES / '23_kalendarium.jsx'
    check(src.exists(), 'missing 23_trunk.jsx')
    check(not dst.exists(), '23_kalendarium.jsx already exists')

    text = src.read_text(encoding='utf-8')
    lines = text.split('\n')
    check(len(lines) == 876, f'23_trunk has {len(lines)} lines, expected 876')
    check(lines[0] == '', 'arc does not lead with a blank')
    check(lines[1].startswith('// ─── Kalendarium views'), f'header missing: {lines[1]!r}')
    check(lines[-1] == '}', f'arc does not end on a closing brace: {lines[-1]!r}')
    members = [DECL.match(l).group(1) for l in lines if DECL.match(l)]
    check(members == EXPECTED_MEMBERS, f'members differ:\n  got {members}')

    src.rename(dst)   # bytes untouched; only the name changes

    files = sorted(MODULES.rglob('[0-9][0-9]_*.jsx'), key=lambda f: f.relative_to(MODULES).as_posix())
    total = sum(len(p.read_text(encoding='utf-8').splitlines()) for p in files)
    nonl = sum(1 for p in files if not p.read_text(encoding='utf-8').endswith('\n'))
    print(f'files {len(files)}  lines {total}  no-trailing-newline {nonl}')
    print('trunk arcs left:', [p.name for p in files if p.name.endswith('_trunk.jsx')])


if __name__ == '__main__':
    main()
