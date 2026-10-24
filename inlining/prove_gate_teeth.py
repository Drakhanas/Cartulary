#!/usr/bin/env python3
"""
prove_gate_teeth.py -- mutation probes for the BUILD gate (build_inline.py
verify / gather + canonicalize.py). Distinct from prove_teeth.py, which probes
the DOC gate (check_docs.py).

Run after ANY change to the assembler or the gate. Each probe injects one defect
into a throwaway copy of the source tree and asserts the right check goes RED. A
gate nobody has tried to fool is a gate nobody knows works: this project shipped
two that had been scoring wrong for twenty-plus r-numbers (byte_ok, found r023;
raw_ok, found r025), and in both cases the probe that would have caught it was
the one that felt redundant.

These probes previously lived as prose in the handoff and the manifest. That is
how the gather snippet drifted into a flat glob() that stopped seeing directory
parts at r023. A check that lives in prose decays.

Usage: python3 inlining/prove_gate_teeth.py   (from anywhere; paths are file-relative)
"""
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

INL = Path(__file__).resolve().parent
SRC = INL.parent / 'cartulary-src'
sys.path.insert(0, str(INL))
import canonicalize  # noqa: E402  the gate's own header and declaration rules


def run_mode(root, mode, *args):
    # build_inline.py derives ROOT from its own location, so the sandbox copy
    # under root/inlining/ reads root/cartulary-src/ with no rewrite needed.
    r = subprocess.run([sys.executable, 'build_inline.py', mode, *args],
                       cwd=root / 'inlining', capture_output=True, text=True)
    return r.returncode, r.stdout + r.stderr


def probe(name, mode, mutate, expect, args=()):
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        shutil.copytree(SRC, root / 'cartulary-src')
        shutil.copytree(INL, root / 'inlining')
        # Re-anchor the sandbox on the CURRENT tree before mutating. A probe
        # asks "does the gate catch this defect", which is a question about the
        # tree as it stands, not about how far it has drifted from the last
        # frozen anchor. Without this the script reads as a pile of blind spots
        # any time it runs between a gather and its rotation, which is exactly
        # when someone reaches for it.
        _seed(root)
        mutate(root / 'cartulary-src' / 'modules')
        code, out = run_mode(root, mode, *args)
        got = expect(code, out)
        print(f"  {'OK  ' if got else 'MISS'} {name:34} {mode:7} exit {code}")
        if not got:
            print('\n'.join('        ' + l for l in out.strip().split('\n')))
        return got


def _seed(root):
    """Freeze the sandbox's own assembled body as its parity anchor."""
    sys.path.insert(0, str(INL))
    import build_inline
    body = build_inline.assemble_body()
    ref = next((root / 'cartulary-src').glob('reference-*.jsx'))
    ref.write_text(body, encoding='utf-8')
    # and its layout, so edit-mode probes see a layout written for THIS anchor;
    # layout_for_tree reads the real tree, which the sandbox copied unmutated
    build_inline.write_layout(build_inline.layout_path_for(ref),
                              build_inline.layout_for_tree(build_inline._sha(body)))


def _lines(p):
    return p.read_text(encoding='utf-8').split('\n')


def _write(p, lines):
    p.write_text('\n'.join(lines), encoding='utf-8')


# ----- probe targets, resolved by role ------------------------------------------
# A probe names what it needs of a file, never the file. Until 2026-10-24 these
# probes named `11_io-utils.jsx` and `02_trunk.jsx` outright, so the next carve
# of either would have had to rewrite the probes in the same cut. Each role is
# resolved once, from the real tree, and every sandbox copy uses the same
# relative path. A role no module fits stops the run: a probe with no target
# proves nothing, and must not read as a pass.

def _modules(M):
    return sorted(M.rglob('[0-9][0-9]_*.jsx'), key=lambda f: f.relative_to(M).as_posix())


def _shear_site(L):
    """(i, j) for the first column-0 header whose target (canonicalize's rule:
    the first top-level declaration after it) is a one-line `const` with two
    more top-level declarations after it in the same file. Moving line i to
    just before line j leaves the header labelling the declaration between:
    the r013 shear."""
    for h, line in enumerate(L):
        if not canonicalize._is_header(line):
            continue
        i = next((k for k in range(h + 1, len(L)) if canonicalize._DECL.match(L[k])), None)
        if i is None or not (L[i].startswith('const ') and L[i].rstrip().endswith(';')):
            continue
        later = [k for k in range(i + 1, len(L)) if canonicalize._DECL.match(L[k])]
        if len(later) >= 2:
            return i, later[1]
    return None


def _misfile_shape(L):
    """A file that opens blank, header, blank: its header can move to the tail
    of the file before it and leave the assembled body byte-identical."""
    return len(L) > 2 and L[0] == '' and canonicalize._is_header(L[1]) and L[2] == ''


def _roles():
    M = SRC / 'modules'
    files = _modules(M)

    def need(role, hits):
        if not hits:
            raise SystemExit(f'prove_gate_teeth: no module fits the {role} role')
        return hits[0].relative_to(M)

    # PLAIN: an ordinary flat module with a top-level const and an interior blank
    # line; the smallest, so the probes that drop or rename a line stay cheap.
    plain = sorted((len(_lines(p)), n, p) for n, p in enumerate(files)
                   if p.parent == M
                   and any(l.startswith('const ') for l in _lines(p))
                   and any(k > 0 and l == '' for k, l in enumerate(_lines(p))))
    return (need('plain', [p for _, _, p in plain]),
            need('shear', [p for p in files if _shear_site(_lines(p))]),
            need('misfile', [p for p in files[1:] if _misfile_shape(_lines(p))]))


PLAIN, SHEAR, MISFILE = _roles()


def _misfile(M):
    """Move the MISFILE module's opening header to the tail of the file before
    it. That file's trailing blank lines go first: the assembler strips them
    anyway, and left in place they would add a blank at the join."""
    files = _modules(M)
    b = M / MISFILE
    a = files[files.index(b) - 1]
    LA, LB = _lines(a), _lines(b)
    while LA and LA[-1] == '':
        LA.pop()
    hdr = LB.pop(1)          # the header
    LB.pop(1)                # the blank under it
    _write(a, LA + ['', hdr])
    _write(b, LB)


def drop_code_line(M):
    p = M / PLAIN
    L = _lines(p)
    i = next(k for k, l in enumerate(L) if l.startswith('const '))
    _write(p, L[:i] + L[i + 1:])


def drop_blank_line(M):
    p = M / PLAIN
    L = _lines(p)
    i = next(k for k, l in enumerate(L) if k > 0 and l == '')
    _write(p, L[:i] + L[i + 1:])


def rename_decl(M):
    p = M / PLAIN
    t = p.read_text(encoding='utf-8')
    m = re.search(r'^const ([A-Za-z0-9_$]+)', t, re.M)
    p.write_text(t.replace(m.group(1), m.group(1) + 'X'), encoding='utf-8')


def shear_header(M):
    """Relocate a declaration and leave its section header behind. The r013
    shape exactly: multiset, decl-set, and raw count all survive, so the pair
    list is the only check that can see it."""
    p = M / SHEAR
    L = _lines(p)
    i, j = _shear_site(L)
    decl = L.pop(i)
    L.insert(j - 1, decl)  # j counted before the pop
    _write(p, L)


def misfile_header(M):
    """Move a header to the TAIL of the previous file. The 19_trunk:878 shape (r024 numbering):
    the assembled body is BYTE-IDENTICAL, because the file join reproduces the
    same line sequence either way, so sequence, decl-set, byte-identity, raw
    count and header_pairs all pass. Only the per-file placement check can see
    it. This probe is the reason that check exists."""
    # `b` is the MISFILE role (see _roles); `a` is whatever file precedes it in
    # assembly order.
    _misfile(M)


PROBES = [
    ("drop one code line", 'verify', drop_code_line,
     lambda c, o: c != 0 and 'canonical sequence : FAIL' in o and 'decl-name set      : FAIL' in o),
    ("drop one BLANK line", 'verify', drop_blank_line,
     lambda c, o: c != 0 and 'canonical sequence : PASS' in o
                  and 'decl-name set      : PASS' in o
                  and 'byte-identity      : differs' in o and 'GATE RED' in o),
    ("rename one declaration", 'verify', rename_decl,
     lambda c, o: c != 0 and 'canonical sequence : FAIL' in o and 'decl-name set      : FAIL' in o),
    ("shear a section header", 'verify', shear_header,
     lambda c, o: c != 0 and 'header pairs       : FAIL' in o and 'retargeted' in o),
    ("shear a section header", 'gather', shear_header,
     lambda c, o: c == 0 and 'multiset           : PASS' in o
                  and 'decl-name set      : PASS' in o
                  and 'raw line count     : PASS' in o
                  and 'GATHER GREEN' in o and 'retargeted' in o),
    ("misfile a header (byte-identical)", 'verify', misfile_header,
     lambda c, o: c != 0 and 'canonical sequence : PASS' in o
                  and 'byte-identity      : exact' in o
                  and 'header pairs       : PASS' in o
                  and 'header placement   : FAIL' in o and 'GATE RED' in o),
    ("drop one BLANK line", 'gather', drop_blank_line,
     lambda c, o: c != 0 and 'multiset           : PASS' in o
                  and 'decl-name set      : PASS' in o
                  and 'raw line count     : FAIL' in o and 'GATHER RED' in o),
]


# ----- scoped-edit probes -------------------------------------------------------
# Edit mode gates a cut that changes lines on purpose, so its probes come in
# both directions: the positive control proves the mode can go GREEN on a
# correctly declared edit (a gate that only fails is as useless as one that
# only passes), and each negative proves one undeclared change is caught by
# the check named for it. The silent ones are the dropped blank in a declared
# file (the assembled body is unchanged, only the raw text knows) and the
# misfiled header (byte-identical body, placement is the only signal).

def _append_decl(M):
    p = M / PLAIN
    p.write_text(p.read_text(encoding='utf-8').rstrip('\n') + '\n\nconst zzProbeDecl = 1;',
                 encoding='utf-8')


def _trailing_blank(M):
    p = M / PLAIN
    p.write_text(p.read_text(encoding='utf-8').rstrip('\n') + '\n\n', encoding='utf-8')


def _stale_layout(M):
    lp = next(M.parent.glob('reference-*-layout.json'))
    lp.write_text(lp.read_text(encoding='utf-8').replace('"anchor_sha256": "', '"anchor_sha256": "0'),
                  encoding='utf-8')


def _rename_file(M):
    p = M / PLAIN
    p.rename(p.with_name(p.stem + 'z' + p.suffix))


def _touch_shell(M):
    s = M.parent / 'shell.html'
    s.write_text(s.read_text(encoding='utf-8').replace('</head>', '<!-- probe -->\n</head>', 1),
                 encoding='utf-8')


def _plain_scope():
    return ('--files', PLAIN.as_posix())


def _other_scope():
    """A declared file that isn't the one the probe touches."""
    M = SRC / 'modules'
    other = next(p for p in _modules(M) if p.relative_to(M) != PLAIN)
    return ('--files', other.relative_to(M).as_posix())


def _misfile_scope():
    M = SRC / 'modules'
    files = _modules(M)
    b = M / MISFILE
    return ('--files', files[files.index(b) - 1].relative_to(M).as_posix() + ',' + MISFILE.as_posix())


EDIT_PROBES = [
    ("declared edit (positive control)", 'edit', _append_decl,
     lambda c, o: c == 0 and 'EDIT GREEN' in o and 'out-of-scope files : PASS' in o
                  and 'decl delta         : PASS' in o and 'zzProbeDecl' in o,
     _plain_scope() + ('--add', 'zzProbeDecl')),
    ("edit outside declared scope", 'edit', drop_blank_line,
     lambda c, o: c != 0 and 'out-of-scope files : FAIL' in o and PLAIN.name in o and 'EDIT RED' in o,
     _other_scope()),
    ("undeclared declaration added", 'edit', _append_decl,
     lambda c, o: c != 0 and 'decl delta         : FAIL' in o and 'added, undeclared' in o,
     _plain_scope()),
    ("declaration lost in scope", 'edit', drop_code_line,
     lambda c, o: c != 0 and 'decl delta         : FAIL' in o and 'removed, undeclared' in o,
     _plain_scope()),
    ("declared file ends on a blank", 'edit', _trailing_blank,
     lambda c, o: c != 0 and 'out-of-scope files : PASS' in o and 'decl delta         : PASS' in o
                  and 'rule-1 shape       : FAIL' in o and 'EDIT RED' in o,
     _plain_scope()),
    ("misfile a header (in scope)", 'edit', _misfile,
     lambda c, o: c != 0 and 'out-of-scope files : PASS' in o
                  and 'header placement   : FAIL' in o and 'EDIT RED' in o,
     _misfile_scope()),
    ("shear reported, not scored", 'edit', shear_header,
     lambda c, o: c == 0 and 'EDIT GREEN' in o and 'retargeted' in o,
     ('--files', SHEAR.as_posix())),
    ("stale layout", 'edit', _stale_layout,
     lambda c, o: c != 0 and 'layout fresh       : FAIL' in o,
     _plain_scope()),
    ("file renamed (not an edit)", 'edit', _rename_file,
     lambda c, o: c != 0 and 'file set unchanged : FAIL' in o),
    ("shell changed, undeclared", 'edit', _touch_shell,
     lambda c, o: c != 0 and 'shell.html         : FAIL' in o and 'EDIT RED' in o),
    ("shell changed, declared", 'edit', _touch_shell,
     lambda c, o: c == 0 and 'EDIT GREEN' in o and 'shell.html  +1' in o,
     ('--shell',)),
]


def main():
    print(f"  {'result':4} {'probe':34} {'mode':7} exit")
    results = [probe(*p) for p in PROBES] + [probe(*p) for p in EDIT_PROBES]
    print()
    if all(results):
        print("All probes bit. Restore and re-verify green before working.")
    else:
        print("A probe read MISS. The gate has a blind spot. Fix the check, not the probe.")
        sys.exit(1)


if __name__ == '__main__':
    main()
