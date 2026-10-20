"""Add the scoped-edit probes to prove_gate_teeth.py (r025 lineage or later).

String-anchored, refuses to run twice. Does not touch the existing seven
probes, so it applies equally to the r025 copy (hard-coded misfile paths) and
the r030 copy (misfile resolved by name).

usage: python3 -I apply_edit_probes.py PATH/TO/prove_gate_teeth.py
"""
import sys
from pathlib import Path

p = Path(sys.argv[1])
t = p.read_text(encoding='utf-8')
assert 'EDIT_PROBES' not in t, 'already applied'


def rep(old, new):
    global t
    assert t.count(old) == 1, old[:70]
    t = t.replace(old, new)


rep('''def run_mode(root, mode):
    bi = root / 'inlining' / 'build_inline.py'
    t = bi.read_text(encoding='utf-8')
    bi.write_text(t.replace("ROOT = Path('/home/claude')", f"ROOT = Path('{root}')"),
                  encoding='utf-8')
    r = subprocess.run([sys.executable, 'build_inline.py', mode],
                       cwd=root / 'inlining', capture_output=True, text=True)
    return r.returncode, r.stdout
''', '''def run_mode(root, mode, *args):
    bi = root / 'inlining' / 'build_inline.py'
    t = bi.read_text(encoding='utf-8')
    bi.write_text(t.replace("ROOT = Path('/home/claude')", f"ROOT = Path('{root}')"),
                  encoding='utf-8')
    r = subprocess.run([sys.executable, 'build_inline.py', mode, *args],
                       cwd=root / 'inlining', capture_output=True, text=True)
    return r.returncode, r.stdout + r.stderr
''')
rep('''def probe(name, mode, mutate, expect):
''', '''def probe(name, mode, mutate, expect, args=()):
''')
rep('''        mutate(root / 'cartulary-src' / 'modules')
        code, out = run_mode(root, mode)
''', '''        mutate(root / 'cartulary-src' / 'modules')
        code, out = run_mode(root, mode, *args)
''')
rep('''    body = build_inline.assemble_body()
    ref = next((root / 'cartulary-src').glob('reference-*.jsx'))
    ref.write_text(body, encoding='utf-8')
''', '''    body = build_inline.assemble_body()
    ref = next((root / 'cartulary-src').glob('reference-*.jsx'))
    ref.write_text(body, encoding='utf-8')
    # and its layout, so edit-mode probes see a layout written for THIS anchor;
    # layout_for_tree reads the real tree, which the sandbox copied unmutated
    build_inline.write_layout(build_inline.layout_path_for(ref),
                              build_inline.layout_for_tree(build_inline._sha(body)))
''')

rep('''

def main():
    print(f"  {'result':4} {'probe':34} {'mode':7} exit")
    results = [probe(*p) for p in PROBES]
''', '''

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
    p.write_text(p.read_text(encoding='utf-8').rstrip('\\n') + '\\n\\nconst zzProbeDecl = 1;',
                 encoding='utf-8')


def _trailing_blank(M):
    p = _by_name(M, '_io-utils.jsx')
    p.write_text(p.read_text(encoding='utf-8').rstrip('\\n') + '\\n\\n', encoding='utf-8')


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
    s.write_text(s.read_text(encoding='utf-8').replace('</head>', '<!-- probe -->\\n</head>', 1),
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
''')
p.write_text(t, encoding='utf-8')
print(f'applied to {p}')
