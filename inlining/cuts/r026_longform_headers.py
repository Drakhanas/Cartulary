#!/usr/bin/env python3
"""
r026: replace one sheared header with two.

`14_form-engine-edit:1223` read `// ─── Markdown display + rich text editor ───`
(81 wide) and named two blocks that have lived in different modules since the
r013 gather: LongformEditor (14_form-engine-edit) and LongformDisplay
(13_form-engine-display).

This is NOT a carve and NOT a gather. It adds lines on purpose, so neither
`verify` nor `gather` can return a green verdict. The expected signals were
written down in handoff.md and manifest section 11 before this ran:
  raw 39,335 -> 39,337; multiset RED (-1 +2); decl-set PASS 419;
  placement PASS 0; header pairs 73 -> 74 with exactly three named changes.

Edits, both string-anchored so per-file trailing-newline state is untouched:
  14_form-engine-edit   : rewrite the header line in place (net 0 lines)
  13_form-engine-display: insert header + following blank above
                          LongformDisplay (+2)

After the browser pass the anchor rotates to reference-r026-body.jsx
(gather procedure, even though this is not a gather: bytes changed on purpose).
"""
from pathlib import Path

MODULES = Path(__file__).resolve().parent.parent / 'cartulary-src' / 'modules'
D = '─'

OLD_PREFIX = '// ' + D * 3 + ' Markdown display + rich text editor '


def header(title):
    s = '// ' + D * 3 + ' ' + title + ' '
    return s + D * (82 - len(s))


NEW_EDIT = header('Longform + rich text editor')
NEW_DISPLAY = header('Longform + markdown display')

EDIT = MODULES / '14_form-engine-edit.jsx'
DISPLAY = MODULES / '13_form-engine-display.jsx'

DISPLAY_ANCHOR = '}\n\nfunction LongformDisplay({ value }) {'
DISPLAY_REPLACEMENT = '}\n\n' + NEW_DISPLAY + '\n\nfunction LongformDisplay({ value }) {'


def check(cond, msg):
    if not cond:
        raise SystemExit('ABORT: ' + msg)


def main():
    check(len(NEW_EDIT) == 82, f'edit header is {len(NEW_EDIT)} wide, expected 82')
    check(len(NEW_DISPLAY) == 82, f'display header is {len(NEW_DISPLAY)} wide, expected 82')

    edit_text = EDIT.read_text(encoding='utf-8')
    disp_text = DISPLAY.read_text(encoding='utf-8')

    hits = [l for l in edit_text.split('\n') if l.startswith(OLD_PREFIX)]
    check(len(hits) == 1, f'retired header appears {len(hits)}x in {EDIT.name}')
    OLD = hits[0]
    check(len(OLD) == 81, f'retired header is {len(OLD)} wide, expected 81')
    check(set(OLD[len(OLD_PREFIX):]) == {D}, 'retired header does not end in a clean dash run')

    check(edit_text.count(OLD) == 1, f'old header appears {edit_text.count(OLD)}x in {EDIT.name}')
    check(NEW_EDIT not in edit_text, 'new edit header already present')
    check(disp_text.count(DISPLAY_ANCHOR) == 1,
          f'display anchor appears {disp_text.count(DISPLAY_ANCHOR)}x in {DISPLAY.name}')
    check(NEW_DISPLAY not in disp_text, 'new display header already present')

    before = {p.relative_to(MODULES).as_posix(): len(p.read_text(encoding='utf-8').splitlines())
              for p in MODULES.rglob('[0-9][0-9]_*.jsx')}
    edit_nl = edit_text.endswith('\n')
    disp_nl = disp_text.endswith('\n')

    new_edit_text = edit_text.replace(OLD, NEW_EDIT)
    new_disp_text = disp_text.replace(DISPLAY_ANCHOR, DISPLAY_REPLACEMENT)

    # boundary rule 1: no file may end on a blank line
    for name, text in [(EDIT.name, new_edit_text), (DISPLAY.name, new_disp_text)]:
        check(text.rstrip('\n').splitlines()[-1].strip() != '', f'{name} would end on a blank line')
    check(new_edit_text.endswith('\n') == edit_nl, 'edit trailing newline changed')
    check(new_disp_text.endswith('\n') == disp_nl, 'display trailing newline changed')

    EDIT.write_text(new_edit_text, encoding='utf-8')
    DISPLAY.write_text(new_disp_text, encoding='utf-8')

    after = {p.relative_to(MODULES).as_posix(): len(p.read_text(encoding='utf-8').splitlines())
             for p in MODULES.rglob('[0-9][0-9]_*.jsx')}
    print('line deltas:')
    for k in sorted(before):
        if before[k] != after[k]:
            print(f'  {k}: {before[k]} -> {after[k]} ({after[k] - before[k]:+d})')
    print(f'total: {sum(before.values())} -> {sum(after.values())} '
          f'({sum(after.values()) - sum(before.values()):+d})')


if __name__ == '__main__':
    main()
