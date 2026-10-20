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


def drop_code_line(M):
    p = M / '11_io-utils.jsx'
    L = _lines(p)
    i = next(k for k, l in enumerate(L) if l.startswith('const '))
    _write(p, L[:i] + L[i + 1:])


def drop_blank_line(M):
    p = M / '11_io-utils.jsx'
    L = _lines(p)
    i = next(k for k, l in enumerate(L) if k > 0 and l == '')
    _write(p, L[:i] + L[i + 1:])


def rename_decl(M):
    p = M / '11_io-utils.jsx'
    t = p.read_text(encoding='utf-8')
    m = re.search(r'^const ([A-Za-z0-9_$]+)', t, re.M)
    p.write_text(t.replace(m.group(1), m.group(1) + 'X'), encoding='utf-8')


def shear_header(M):
    """Relocate a declaration and leave its section header behind. The r013
    shape exactly: multiset, decl-set, and raw count all survive, so the pair
    list is the only check that can see it."""
    p = M / '02_trunk.jsx'
    L = _lines(p)
    decl = L.pop(next(k for k, l in enumerate(L) if l.startswith('const genId')))
    j = next(k for k, l in enumerate(L) if l.startswith('const isoNow'))
    L.insert(j, decl)
    _write(p, L)


def misfile_header(M):
    """Move a header to the TAIL of the previous file. The 19_trunk:878 shape (r024 numbering):
    the assembled body is BYTE-IDENTICAL, because the file join reproduces the
    same line sequence either way, so sequence, decl-set, byte-identity, raw
    count and header_pairs all pass. Only the per-file placement check can see
    it. This probe is the reason that check exists."""
    # Resolve by NAME, not NN prefix: every mid-tree carve reflows the prefixes
    # (r027-r029 moved this pair from 19/20 to 23/24). `b` is the home-data
    # module; `a` is whatever file precedes it in assembly order.
    files = sorted(M.rglob('[0-9][0-9]_*.jsx'), key=lambda f: f.relative_to(M).as_posix())
    b = next(f for f in files if f.name.endswith('_home-data.jsx'))
    a = files[files.index(b) - 1]
    LA, LB = _lines(a), _lines(b)
    hdr = LB.pop(1)          # the header
    LB.pop(1)                # the blank under it
    _write(a, LA + ['', hdr])
    _write(b, LB)


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

def _by_name(M, suffix):
    return next(p for p in sorted(M.rglob('[0-9][0-9]_*.jsx'),
                                  key=lambda f: f.relative_to(M).as_posix())
                if p.name.endswith(suffix))


def _rel(M, p):
    return p.relative_to(M).as_posix()


def _append_decl(M):
    p = _by_name(M, '_io-utils.jsx')
    p.write_text(p.read_text(encoding='utf-8').rstrip('\n') + '\n\nconst zzProbeDecl = 1;',
                 encoding='utf-8')


def _trailing_blank(M):
    p = _by_name(M, '_io-utils.jsx')
    p.write_text(p.read_text(encoding='utf-8').rstrip('\n') + '\n\n', encoding='utf-8')


def _misfile_by_name(M):
    b = _by_name(M, '_home-data.jsx')
    files = sorted(M.rglob('[0-9][0-9]_*.jsx'), key=lambda f: f.relative_to(M).as_posix())
    a = files[files.index(b) - 1]
    LA, LB = _lines(a), _lines(b)
    hdr = LB.pop(1)
    LB.pop(1)
    _write(a, LA + ['', hdr])
    _write(b, LB)


def _stale_layout(M):
    lp = next(M.parent.glob('reference-*-layout.json'))
    lp.write_text(lp.read_text(encoding='utf-8').replace('"anchor_sha256": "', '"anchor_sha256": "0'),
                  encoding='utf-8')


def _rename_file(M):
    p = _by_name(M, '_io-utils.jsx')
    p.rename(p.with_name(p.name.replace('io-utils', 'io-utilz')))


def _touch_shell(M):
    s = M.parent / 'shell.html'
    s.write_text(s.read_text(encoding='utf-8').replace('</head>', '<!-- probe -->\n</head>', 1),
                 encoding='utf-8')


def _io_utils_scope():
    return ('--files', _rel(SRC / 'modules', _by_name(SRC / 'modules', '_io-utils.jsx')))


def _misfile_scope():
    M = SRC / 'modules'
    b = _by_name(M, '_home-data.jsx')
    files = sorted(M.rglob('[0-9][0-9]_*.jsx'), key=lambda f: f.relative_to(M).as_posix())
    return ('--files', _rel(M, files[files.index(b) - 1]) + ',' + _rel(M, b))


EDIT_PROBES = [
    ("declared edit (positive control)", 'edit', _append_decl,
     lambda c, o: c == 0 and 'EDIT GREEN' in o and 'out-of-scope files : PASS' in o
                  and 'decl delta         : PASS' in o and 'zzProbeDecl' in o,
     _io_utils_scope() + ('--add', 'zzProbeDecl')),
    ("edit outside declared scope", 'edit', drop_blank_line,
     lambda c, o: c != 0 and 'out-of-scope files : FAIL' in o and 'io-utils.jsx' in o and 'EDIT RED' in o,
     ('--files', '02_trunk.jsx')),
    ("undeclared declaration added", 'edit', _append_decl,
     lambda c, o: c != 0 and 'decl delta         : FAIL' in o and 'added, undeclared' in o,
     _io_utils_scope()),
    ("declaration lost in scope", 'edit', drop_code_line,
     lambda c, o: c != 0 and 'decl delta         : FAIL' in o and 'removed, undeclared' in o,
     _io_utils_scope()),
    ("declared file ends on a blank", 'edit', _trailing_blank,
     lambda c, o: c != 0 and 'out-of-scope files : PASS' in o and 'decl delta         : PASS' in o
                  and 'rule-1 shape       : FAIL' in o and 'EDIT RED' in o,
     _io_utils_scope()),
    ("misfile a header (in scope)", 'edit', _misfile_by_name,
     lambda c, o: c != 0 and 'out-of-scope files : PASS' in o
                  and 'header placement   : FAIL' in o and 'EDIT RED' in o,
     _misfile_scope()),
    ("shear reported, not scored", 'edit', shear_header,
     lambda c, o: c == 0 and 'EDIT GREEN' in o and 'retargeted' in o,
     ('--files', '02_trunk.jsx')),
    ("stale layout", 'edit', _stale_layout,
     lambda c, o: c != 0 and 'layout fresh       : FAIL' in o,
     _io_utils_scope()),
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
