"""Apply the scoped-edit tooling to a build_inline.py (r025 lineage or later).

String-anchored, each anchor must occur exactly once, refuses to run twice.
Used on the dev reconstruction now and on the real r030 bundle when it lands,
so the two copies cannot drift.

usage: python3 -I apply_edit_mode.py PATH/TO/build_inline.py
"""
import re
import sys
from pathlib import Path

p = Path(sys.argv[1])
t = p.read_text(encoding='utf-8')
assert 'def mode_edit(' not in t, 'already applied'


def rep(old, new, count=1):
    global t
    assert t.count(old) == count, (t.count(old), old[:70])
    t = t.replace(old, new)


# ---- docstring: the anchor is discovered, not named; three new modes ---------
m = re.search(r"  cartulary-src/reference-r(\d{3})-body\.jsx the frozen parity anchor: the exact r\1\n"
              r"                                        body every PURE carve must reassemble to\.\n", t)
assert m, 'anchor docstring line not found'
rep(m.group(0),
    "  cartulary-src/reference-r###-body.jsx the frozen parity anchor: the exact body\n"
    "                                        every PURE carve must reassemble to. Found\n"
    "                                        by glob; exactly one must exist. Its\n"
    "                                        companion reference-r###-layout.json records\n"
    "                                        the per-file segmentation and the shell's\n"
    "                                        hash, for edit mode.\n")
rep("""  python3 build_inline.py finals    the dual-build: precompile JSX, inline libs/fonts,
""", """  python3 build_inline.py edit      the SCOPED-EDIT check, for a content edit (pillar
                                    3). Declares which files may differ and which
                                    declarations are added/removed; every undeclared
                                    file must be byte-identical to its anchor segment.
                                    Scored: layout fresh, file set unchanged, out-of-
                                    scope identity, decl delta, rule-1 shape per file,
                                    header placement, shell unchanged unless --shell.
                                    Reported: the in-scope diff (also written to
                                    out/edit-diff.patch), the header-pair diff, line
                                    counts. Exit 1 on any failure.
  python3 build_inline.py freeze    rotate the anchor after a browser pass: `freeze
                                    r031` writes reference-r031-body.jsx plus its
                                    layout from the current tree and retires the old
                                    pair. `freeze` with no name only (re)writes the
                                    layout for the ACTIVE anchor, and refuses unless
                                    the tree reassembles to it byte-for-byte.
  python3 build_inline.py finals    the dual-build: precompile JSX, inline libs/fonts,
""")

# ---- constant -> discovery --------------------------------------------------
m = re.search(r"REFERENCE_BODY = SRC_DIR / 'reference-r\d{3}-body\.jsx'\n", t)
assert m
rep(m.group(0), """

def reference_body_path():
    \"\"\"The active anchor, discovered rather than named. Exactly one
    reference-r###-body.jsx may exist; two means a rotation was left half done,
    zero means the bundle is incomplete. Either way the gate refuses rather than
    guessing, which is what the old REFERENCE_BODY constant could not do: it
    went stale in /mnt/project for eight anchors.\"\"\"
    found = sorted(SRC_DIR.glob('reference-r[0-9][0-9][0-9]-body.jsx'))
    if len(found) != 1:
        raise RuntimeError(f"expected exactly one anchor in {SRC_DIR}, found "
                           f"{[f.name for f in found]}")
    return found[0]


def layout_path_for(anchor):
    return anchor.with_name(anchor.name.replace('-body.jsx', '-layout.json'))
""")
rep("    ref = REFERENCE_BODY.read_text(encoding='utf-8')\n",
    "    ref = reference_body_path().read_text(encoding='utf-8')\n", count=2)

# ---- the new modes, inserted before main() ----------------------------------
NEW = r'''
# ----- scoped edit: layout, edit, freeze -----------------------------------------

import difflib
import hashlib
import json


def _sha(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def file_segments():
    """[(posix-relative name, raw text, rstripped content)] in assembly order."""
    out = []
    for f in module_files():
        raw = f.read_text(encoding='utf-8')
        out.append((f.relative_to(MODULES_DIR).as_posix(), raw, raw.rstrip('\n')))
    return out


def layout_for_tree(body_sha=None):
    """The per-file segmentation of the assembled body: file name and its line
    count (of the rstripped content, which is what the join concatenates), plus
    the body's sha and the shell's sha. Only valid when the tree assembles
    to the anchor the layout is written for, which freeze() guarantees."""
    segs = file_segments()
    shell = SHELL.read_text(encoding='utf-8')
    return {
        'anchor_sha256': body_sha if body_sha else _sha(assemble_body()),
        'shell_sha256': _sha(shell),
        'files': [[name, len(core.split('\n'))] for name, _, core in segs],
        # the shell rides along so an edit that touches it can be diffed, not
        # just detected; it is outside the babel body and no other gate sees it
        'shell_text': shell,
    }


def write_layout(path, layout):
    path.write_text(json.dumps(layout, indent=2) + '\n', encoding='utf-8')


def anchor_segments(ref_text, layout):
    """Slice the anchor into per-file segments by the layout's line counts."""
    lines = ref_text.rstrip('\n').split('\n')
    out, pos = {}, 0
    for name, n in layout['files']:
        out[name] = '\n'.join(lines[pos:pos + n])
        pos += n
    if pos != len(lines):
        raise RuntimeError(f"layout covers {pos} lines, anchor has {len(lines)}")
    return out


def rule1_defects(raw, name):
    """Boundary rule 1 on the RAW file text. A file that ends on a blank loses
    that line to the assembler's per-file rstrip, silently; the assembled body
    then looks fine to every check that runs on it. A file that does not lead
    with a blank breaks the seam convention every file in the tree follows."""
    out = []
    core = raw.rstrip('\n')
    tail = raw[len(core):]
    if tail.count('\n') >= 2:
        out.append(f"{name}: ends on a blank line (the assembler would drop it)")
    elif core and core.split('\n')[-1].strip() == '':
        out.append(f"{name}: ends on a whitespace-only line")
    if not raw.startswith('\n'):
        out.append(f"{name}: does not lead with a blank line")
    return out


def _parse_edit_args(argv):
    import argparse
    ap = argparse.ArgumentParser(prog='build_inline.py edit')
    ap.add_argument('--files', default='', help='comma list of module paths allowed to differ, '
                    'posix-relative to modules/ (e.g. 16_trunk.jsx,22_ephemeris/01_shell.jsx)')
    ap.add_argument('--add', default='', help='comma list of top-level declaration names added')
    ap.add_argument('--remove', default='', help='comma list of top-level declaration names removed')
    ap.add_argument('--shell', action='store_true', help='the edit is allowed to change shell.html')
    a = ap.parse_args(argv)
    split = lambda s: [x.strip() for x in s.split(',') if x.strip()]
    files = [f if f.endswith('.jsx') else f + '.jsx' for f in split(a.files)]
    return files, set(split(a.add)), set(split(a.remove)), a.shell


def mode_edit(argv):
    """
    The SCOPED-EDIT check. A content edit adds and changes lines on purpose, so
    neither verify nor gather can return a verdict on it: r026 was gated on a
    hand-written delta table matching the gather report line for line, which
    worked for three lines and does not scale to a feature.

    What a content edit must preserve is everything it did not declare. So the
    cut declares its scope (which files, which declarations come and go) and the
    gate holds the rest to the anchor: every undeclared file byte-identical to
    its anchor segment, the declaration delta exactly as stated, no file ending
    on a blank, no header left with nothing to head, the shell untouched unless
    said otherwise. The in-scope diff is the review artifact and is printed and
    written, not scored; a human reads it the way the r026 table was read.

    Header pairs are reported, not scored, for the same reason gather reports
    them: inserting a declaration at the head of a block retargets that block's
    header legitimately. Placement is scored because a header with no
    declaration after it in its file is wrong in every session.
    """
    files, adds, removes, allow_shell = _parse_edit_args(argv)
    anchor = reference_body_path()
    lp = layout_path_for(anchor)
    ref = anchor.read_text(encoding='utf-8')
    body = assemble_body()
    segs = file_segments()
    names = [n for n, _, _ in segs]
    checks = []

    print(f"Scoped-edit check (content edit; sequence and byte-identity WILL differ)")
    print(f"  anchor  : {anchor.name}")
    print(f"  scope   : {', '.join(files) if files else '(no files declared)'}")
    print(f"  decls   : +{sorted(adds)} -{sorted(removes)}")

    # 1. layout present and written for THIS anchor
    layout = None
    if not lp.exists():
        layout_ok, why = False, f"{lp.name} missing; run `build_inline.py freeze` at GATE GREEN"
    else:
        layout = json.loads(lp.read_text(encoding='utf-8'))
        if layout.get('anchor_sha256') != _sha(ref.rstrip('\n')):
            layout_ok, why = False, f"{lp.name} was written for a different anchor"
        else:
            layout_ok, why = True, ''
    checks.append(('layout fresh', layout_ok))
    print(f"  layout fresh       : {'PASS' if layout_ok else 'FAIL'}{'  ' + why if why else ''}")
    if not layout_ok:
        print("\nEDIT RED")
        sys.exit(1)

    # 2. same file set, same order: a carve, gather, or rename is not an edit
    want = [n for n, _ in layout['files']]
    set_ok = names == want
    checks.append(('file set', set_ok))
    print(f"  file set unchanged : {'PASS' if set_ok else 'FAIL'} ({len(names)} files)")
    if not set_ok:
        for n in sorted(set(names) - set(want)):
            print(f"    not in anchor layout : {n}")
        for n in sorted(set(want) - set(names)):
            print(f"    missing from tree    : {n}")
        print("\nEDIT RED")
        sys.exit(1)
    unknown = [f for f in files if f not in names]
    if unknown:
        raise SystemExit(f"declared file(s) not in the tree: {unknown}")

    # 3. every undeclared file byte-identical to its anchor segment
    aseg = anchor_segments(ref, layout)
    out_bad = []
    for name, _, core in segs:
        if name in files:
            continue
        if core != aseg[name]:
            a, b = aseg[name].split('\n'), core.split('\n')
            k = next((i for i in range(min(len(a), len(b))) if a[i] != b[i]), min(len(a), len(b)))
            out_bad.append((name, k + 1, a[k] if k < len(a) else None, b[k] if k < len(b) else None))
    out_ok = not out_bad
    checks.append(('out-of-scope identity', out_ok))
    print(f"  out-of-scope files : {'PASS' if out_ok else 'FAIL'} "
          f"({len(names) - len(files)} files held to the anchor)")
    for name, ln, ra, ba in out_bad[:8]:
        print(f"    {name}:{ln} differs  anchor={ra!r:.60}  tree={ba!r:.60}")

    # 4. declaration delta exactly as declared
    d_body, d_ref = canonicalize.decl_names(body), canonicalize.decl_names(ref)
    got_add, got_rem = d_body - d_ref, d_ref - d_body
    decl_ok = got_add == adds and got_rem == removes
    checks.append(('decl delta', decl_ok))
    print(f"  decl delta         : {'PASS' if decl_ok else 'FAIL'} "
          f"({len(d_ref)} -> {len(d_body)} names)")
    if not decl_ok:
        for n in sorted(got_add - adds):
            print(f"    added, undeclared   : {n}")
        for n in sorted(adds - got_add):
            print(f"    declared add, absent: {n}")
        for n in sorted(got_rem - removes):
            print(f"    removed, undeclared : {n}")
        for n in sorted(removes - got_rem):
            print(f"    declared removal, still present: {n}")

    # 5. rule-1 shape on every file's RAW text
    r1 = [d for name, raw, _ in segs for d in rule1_defects(raw, name)]
    r1_ok = not r1
    checks.append(('rule 1', r1_ok))
    print(f"  rule-1 shape       : {'PASS' if r1_ok else 'FAIL'} ({len(r1)} defects)")
    for d in r1:
        print(f"    {d}")

    # 6. header placement, scored; header pairs, reported
    placement = header_placement_defects()
    place_ok = not placement
    checks.append(('placement', place_ok))
    print(f"  header placement   : {'PASS' if place_ok else 'FAIL'} ({len(placement)} misfiled)")
    for rel, title in placement:
        print(f"    {rel}: {title}  [no target in this file]")
    added, removed, retargeted = canonicalize.header_pair_diff(body, ref)
    n = len(added) + len(removed) + len(retargeted)
    print(f"  header pairs       : {n} change(s) (reported, not scored; "
          f"{len(canonicalize.header_pairs(body))} headers)")
    for ti, rt, at in retargeted:
        print(f"    retargeted : {ti}: {rt} -> {at}")
    for ti, g in added:
        print(f"    added      : {ti} -> {g}")
    for ti, g in removed:
        print(f"    removed    : {ti} -> {g}")

    # 7. shell
    shell_text = SHELL.read_text(encoding='utf-8')
    shell_same = _sha(shell_text) == layout.get('shell_sha256')
    shell_ok = shell_same or allow_shell
    checks.append(('shell', shell_ok))
    print(f"  shell.html         : {'PASS' if shell_ok else 'FAIL'} "
          f"({'unchanged' if shell_same else 'CHANGED' + (', declared' if allow_shell else ', undeclared')})")

    # reports: line counts and the in-scope diff
    raw_ref = len(ref.rstrip('\n').split('\n'))
    raw_asm = len(body.split('\n'))
    print(f"  raw lines          : {raw_ref} -> {raw_asm} ({raw_asm - raw_ref:+d})")
    print(f"  canonical lines    : {len(canonicalize.canonical_sequence(ref))} -> "
          f"{len(canonicalize.canonical_sequence(body))}")
    OUT_DIR.mkdir(exist_ok=True)
    patch = []
    for name, _, core in segs:
        if name not in files:
            continue
        a, b = aseg[name].split('\n'), core.split('\n')
        d = list(difflib.unified_diff(a, b, fromfile=f'anchor/{name}', tofile=f'tree/{name}',
                                      lineterm='', n=2))
        plus = sum(1 for l in d[2:] if l.startswith('+'))
        minus = sum(1 for l in d[2:] if l.startswith('-'))
        print(f"  in-scope diff      : {name}  +{plus} -{minus}" if d else
              f"  in-scope diff      : {name}  unchanged")
        patch.extend(d)
    if not shell_same:
        d = list(difflib.unified_diff(layout.get('shell_text', '').split('\n'), shell_text.split('\n'),
                                      fromfile='anchor/shell.html', tofile='tree/shell.html',
                                      lineterm='', n=2))
        plus = sum(1 for l in d[2:] if l.startswith('+'))
        minus = sum(1 for l in d[2:] if l.startswith('-'))
        print(f"  in-scope diff      : shell.html  +{plus} -{minus}")
        patch.extend(d)
    pp = OUT_DIR / 'edit-diff.patch'
    pp.write_text('\n'.join(patch) + ('\n' if patch else ''), encoding='utf-8')
    print(f"\n  in-scope diff written to {pp} ({len(patch)} lines); READ IT, it is the review artifact")
    if patch:
        print('  ' + '-' * 70)
        for l in patch:
            print('  ' + l)
        print('  ' + '-' * 70)

    ok = all(v for _, v in checks)
    print("\nEDIT", "GREEN" if ok else "RED")
    if not ok:
        sys.exit(1)


def mode_freeze(argv):
    """
    Anchor rotation, the mechanical half. The human half, the browser pass,
    comes FIRST and the tool cannot check it: never freeze an unverified body.

    `freeze` with no name rewrites the layout for the active anchor and refuses
    unless the tree reassembles to it byte-for-byte, so a layout can never
    describe a body other than the one it sits beside. `freeze r031` writes the
    new anchor and its layout from the current tree, confirms frozen equals
    assembled, and retires the old pair; the next verify picks the new anchor
    up by discovery, with nothing to repoint.
    """
    body = assemble_body()
    current = reference_body_path()
    if not argv:
        ref = current.read_text(encoding='utf-8')
        if body != ref.rstrip('\n'):
            raise SystemExit(f"tree does not reassemble to {current.name}; a layout written now "
                             f"would describe a body that does not exist. If this is a verified "
                             f"byte-changing cut, rotate with `freeze r###` instead.")
        lp = layout_path_for(current)
        write_layout(lp, layout_for_tree(_sha(body)))
        print(f"layout written: {lp.name} ({len(module_files())} files, anchor sha {_sha(body)[:16]})")
        return
    name = argv[0]
    if not re.fullmatch(r'r\d{3}', name):
        raise SystemExit("freeze takes an r-number like r031")
    new = SRC_DIR / f'reference-{name}-body.jsx'
    if new.exists():
        raise SystemExit(f"{new.name} already exists; a rotation never overwrites an anchor")
    if body == current.read_text(encoding='utf-8').rstrip('\n'):
        raise SystemExit(f"tree reassembles to {current.name} byte-for-byte; nothing to rotate")
    new.write_text(body, encoding='utf-8')
    frozen = new.read_text(encoding='utf-8')
    if frozen != body:
        new.unlink()
        raise SystemExit("frozen body does not equal the assembled body; nothing rotated")
    write_layout(layout_path_for(new), layout_for_tree(_sha(body)))
    old_layout = layout_path_for(current)
    current.unlink()
    if old_layout.exists():
        old_layout.unlink()
    print(f"anchor rotated: {current.name} -> {new.name}")
    print(f"  {len(body.encode('utf-8')):,} bytes, {len(body.split(chr(10))):,} lines, sha256 {_sha(body)}")
    print(f"  layout written: {layout_path_for(new).name}")
    print("  now: `verify` (expect GREEN, byte-identity exact), then `working`, then confirm the")
    print("  rebuild hashes to the artifact that was browser-passed. Nothing to repoint.")

'''
rep("\ndef main():\n", NEW + "\ndef main():\n")
rep("""    elif mode == 'finals':
        mode_finals()
    else:
        print("usage: build_inline.py {working|verify|gather|finals}", file=sys.stderr)
""", """    elif mode == 'edit':
        mode_edit(sys.argv[2:])
    elif mode == 'freeze':
        mode_freeze(sys.argv[2:])
    elif mode == 'finals':
        mode_finals()
    else:
        print("usage: build_inline.py {working|verify|gather|edit|freeze|finals}", file=sys.stderr)
""")
p.write_text(t, encoding='utf-8')
print(f'applied to {p}')
