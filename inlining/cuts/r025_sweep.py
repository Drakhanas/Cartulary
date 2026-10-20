#!/usr/bin/env python3
"""
r025 part 2: the header-integrity sweep.

Eleven sheared section headers relocated to the block each one names. Comment
lines only; no declaration moves, so behaviour cannot change. Twelfth
(14_form-engine-edit "Markdown display + rich text editor") is deferred to r026,
because it names two blocks that now live in different modules and its fix is
one removal against two additions, which fails multiset by construction.

Every move is LINE-NEUTRAL by construction: the block plus one adjacent blank
leaves the source, the same block plus one blank arrives at the destination.
Blank choice follows boundary rule 1. At a file tail the PRECEDING blank travels,
so the vacated file ends on code; everywhere else the FOLLOWING blank travels, so
the preceding blank stays as the separator.

Headers move VERBATIM. Widths across the tree run 75 to 82 and four of these land
next to neighbours of a different width. Re-padding one to match its new
surroundings changes the string, which fails multiset, which is the only
substantive check a gather has.
"""
import re
from pathlib import Path

M = Path('/home/claude/cartulary-src/modules')

# (source file, first block line, block length, blank side, dest file, dest decl)
# blank: 'after' takes the blank below the block, 'before' takes the one above.
MOVES = [
    ('03_persistence.jsx',        143,  7, 'after',  '05_field-system.jsx',        'getRelationValues'),
    ('04_trunk.jsx',                2,  1, 'after',  '22_modals.jsx',              'ResetTemplateModal'),
    ('05_field-system.jsx',       409,  1, 'after',  '05_field-system.jsx',        'formatSelectDisplay'),
    ('05_field-system.jsx',       546,  1, 'after',  '12_trunk.jsx',               'App'),
    ('08_export-layer.jsx',      1441,  1, 'after',  '09_trunk.jsx',               'makeInitialState'),
    ('09_trunk.jsx',                2,  1, 'after',  '22_modals.jsx',              'DestructiveOpModal'),
    ('16_trunk.jsx',             1932,  1, 'after',  '16_trunk.jsx',               'TimelineView'),
    ('16_trunk.jsx',             2055, 25, 'after',  '18_ephemeris/01_shell.jsx',  'EphemerisView'),
    ('19_trunk.jsx',              878,  1, 'before', '20_home-data.jsx',           'HOME_SECTIONS'),
    ('21_trunk.jsx',              250, 10, 'before', '08_export-layer.jsx',        'HtmlExportModal'),
    ('22_modals.jsx',              96,  1, 'after',  '03_persistence.jsx',         'VersionHistoryPanel'),
]

# 26 of 34 files carry no trailing newline and 8 do. The assembler rstrips it
# either way, but writing back a uniform form would churn 8 files for no reason,
# so the flag is preserved per file. Reading with a bare split('\n') would also
# hand every one of those 8 a phantom trailing blank and trip the rule-1 assert
# below on a file the sweep never touched.
files, had_nl = {}, {}
for p in M.rglob('[0-9][0-9]_*.jsx'):
    rel = p.relative_to(M).as_posix()
    raw = p.read_text(encoding='utf-8')
    had_nl[rel] = raw.endswith('\n')
    files[rel] = (raw[:-1] if had_nl[rel] else raw).split('\n')
before_total = sum(len(v) for v in files.values())

# 1. capture every block first, so later removals cannot shift an uncaptured one
blocks = []
for src, start, n, side, dst, decl in MOVES:
    blocks.append(files[src][start - 1:start - 1 + n])

# 2. removals, bottom-up per file so earlier indices stay valid
rm = sorted(
    ((src, start, n, side) for src, start, n, side, _, _ in MOVES),
    key=lambda r: (r[0], -r[1]),
)
for src, start, n, side in rm:
    L = files[src]
    lo = start - 2 if side == 'before' else start - 1
    hi = start - 1 + n if side == 'before' else start - 1 + n + 1
    assert L[lo].strip() == '' or L[hi - 1].strip() == '', f'{src}:{start} no blank to take'
    files[src] = L[:lo] + L[hi:]

# 3. insertions, anchored BY NAME on the post-removal text. The anchor is the top
#    of the declaration's own doc comment when it has one directly above it
#    (boundary rule 4: the header sits above the whole block, comment included).
for (src, start, n, side, dst, decl), block in zip(MOVES, blocks):
    L = files[dst]
    pat = re.compile(r'^(?:const|let|var|function|class|async function)\s+' + re.escape(decl) + r'\b')
    i = next(k for k, l in enumerate(L) if pat.match(l))
    while i > 0 and L[i - 1].startswith('//'):
        i -= 1
    files[dst] = L[:i] + block + [''] + L[i:]

after_total = sum(len(v) for v in files.values())
assert after_total == before_total, f'raw lines moved: {before_total} -> {after_total}'

for rel, L in files.items():
    assert L[0].strip() == '', f'{rel} no longer leads with a blank'
    assert L[-1].strip() != '', f'{rel} now ends on a blank (boundary rule 1)'
    (M / rel).write_text('\n'.join(L) + ('\n' if had_nl[rel] else ''), encoding='utf-8')

print(f'11 moves applied. raw lines {before_total} -> {after_total} (neutral).')
