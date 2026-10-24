"""
Cartulary build. Source is no longer one HTML file. It is:

  cartulary-src/shell.html              the page scaffolding, with one sentinel
                                        (@@CARTULARY_BABEL_BODY@@) where the babel
                                        body is injected.
  cartulary-src/modules/NN_name.jsx     the babel body, carved into modules. NN is
                                        the assembly order (sorted() honours it);
                                        name is the carve/module name. Concatenated
                                        in NN order, they reconstitute the body.
  cartulary-src/reference-r###-body.jsx the frozen parity anchor: the exact body
                                        every PURE carve must reassemble to. Found
                                        by glob; exactly one must exist. Its
                                        companion reference-r###-layout.json records
                                        the per-file segmentation and the shell's
                                        hash, for edit mode.

Assembly is ordered concatenation, never dependency resolution. Resolution would
reorder declarations and break both byte-parity and eval-order; concatenation in
source order reconstitutes the monolith exactly, which is what the parity gate needs.

Modes:
  python3 build_inline.py working   assemble shell+tree -> the working HTML (CDN
                                    head, raw babel block). The thing to parse-gate,
                                    stage, and browser-verify. No precompile, no inline.
  python3 build_inline.py verify    assemble the body, compare its canonical form to
                                    the reference anchor, check the 419 decl-name set,
                                    report byte-identity. The end-step reconstitution
                                    gate (plan section 6). Exit 1 on any failure.
  python3 build_inline.py gather    the GATHER check: multiset + decl-name set +
                                    RAW line count, all scored; header-pair diff
                                    reported. For a relocation cut, where sequence
                                    and byte-identity differ on purpose. Exit 1 on
                                    any failure.
  python3 build_inline.py edit      the SCOPED-EDIT check, for a content edit (pillar
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
                                    prepend the license, swap CDN for pinned/inlined
                                    d3 7.9.0 + babel-standalone 7.29.4. Release-prep
                                    only; produces both finals from the assembled HTML.

The two finals (finals mode):
  Cartulary_v{VERSION}.html           JSX precompiled to React.createElement, no
                                      Babel runtime shipped. What users run.
  Cartulary_v{VERSION}_Readable.html  JSX preserved, Babel runtime shipped. What
                                      people read.

Defensive: JS payloads and the precompiled output contain literal '</script>' (in
regexes and the Babel grammar). Those are escaped inside inline <script> blocks or
the HTML parser closes the script early and the page dies silently.
"""

import base64
import re
import subprocess
import tempfile
import sys
from pathlib import Path

import canonicalize

# The repository root, derived from this file's location so a clone works anywhere
# (a sandbox, a CI runner, Y:\_Cartulary). Nothing hard-codes /home/claude any more.
ROOT = Path(__file__).resolve().parent.parent
INLINING = ROOT / 'inlining'
NODE_MODULES = INLINING / 'node_modules'
COMPILE_JSX = INLINING / 'compile_jsx.js'

SRC_DIR = ROOT / 'cartulary-src'
SHELL = SRC_DIR / 'shell.html'
MODULES_DIR = SRC_DIR / 'modules'


def reference_body_path():
    """The active anchor, discovered rather than named. Exactly one
    reference-r###-body.jsx may exist; two means a rotation was left half done,
    zero means the bundle is incomplete. Either way the gate refuses rather than
    guessing, which is what the old REFERENCE_BODY constant could not do: it
    went stale in /mnt/project for eight anchors."""
    found = sorted(SRC_DIR.glob('reference-r[0-9][0-9][0-9]-body.jsx'))
    if len(found) != 1:
        raise RuntimeError(f"expected exactly one anchor in {SRC_DIR}, found "
                           f"{[f.name for f in found]}")
    return found[0]


def layout_path_for(anchor):
    return anchor.with_name(anchor.name.replace('-body.jsx', '-layout.json'))
OUT_DIR = INLINING / 'out'

SENTINEL = '@@CARTULARY_BABEL_BODY@@'
MODULE_GLOB = '[0-9][0-9]_*.jsx'

# Output filenames derive from VERSION (finals mode only). Working files are named
# Cartulary_v{VERSION}_Working_r###_(carve_name_##).html and staged by hand.
VERSION = '1.6.1'

JS_LIBS_BASE = [
    ('react/18.2.0/umd/react.production.min.js',
     'react/umd/react.production.min.js', None),
    ('react-dom/18.2.0/umd/react-dom.production.min.js',
     'react-dom/umd/react-dom.production.min.js', None),
    ('marked/4.3.0/marked.min.js',
     'marked/marked.min.js', None),
    ('d3/7.8.5/d3.min.js',
     'd3/dist/d3.min.js', None),
    ('jszip/3.10.1/jszip.min.js',
     'jszip/dist/jszip.min.js', None),
]
BABEL_LIB = (
    'babel-standalone/7.23.5/babel.min.js',
    '@babel/standalone/babel.min.js',
    '/*! @babel/standalone v7.29.4\n'
    ' * Copyright (c) 2014-present Sebastian McKenzie and other contributors\n'
    ' * Released under the MIT License. Full text bundled at top of file. */\n',
)

FONT_FACES = []
for weight in [400, 500, 600, 700]:
    for style in ['normal', 'italic']:
        if style == 'italic' and weight > 500:
            continue
        FONT_FACES.append({
            'family': 'Cormorant Garamond', 'weight': weight, 'style': style,
            'file': NODE_MODULES / '@fontsource/cormorant-garamond/files'
                    / f'cormorant-garamond-latin-{weight}-{style}.woff2',
        })
for weight in [300, 400, 500]:
    FONT_FACES.append({
        'family': 'DM Sans', 'weight': weight, 'style': 'normal',
        'file': NODE_MODULES / '@fontsource/dm-sans/files'
                / f'dm-sans-latin-{weight}-normal.woff2',
    })

LICENSE_BLOCK = """<!--
================================================================================
Cartulary bundles the following third-party software. Full license texts and
the original copyright notices ride with each minified payload below.

  React 18.2.0                MIT       (c) Meta Platforms, Inc. and affiliates
  React-DOM 18.2.0            MIT       (c) Meta Platforms, Inc. and affiliates
  @babel/standalone 7.29.4    MIT       (c) Sebastian McKenzie and contributors
                                          (readable build only - not in
                                           cartulary.html, where JSX is
                                           precompiled at build time)
  marked 4.3.0                MIT       (c) 2011-2023 Christopher Jeffrey
  d3 7.9.0                    BSD-3     (c) 2010-2023 Mike Bostock
  JSZip 3.10.1                MIT/GPL3  (c) 2009-2016 Stuart Knightley et al.
                                          (Cartulary uses JSZip under MIT)

  Cormorant Garamond          OFL-1.1   (c) 2015 The Cormorant Project Authors
                                          github.com/CatharsisFonts/Cormorant
  DM Sans                     OFL-1.1   (c) 2014 The DM Sans Project Authors
                                          github.com/googlefonts/dm-fonts

MIT License (applies to React, React-DOM, Babel, marked, JSZip):

  Permission is hereby granted, free of charge, to any person obtaining
  a copy of this software and associated documentation files (the
  "Software"), to deal in the Software without restriction, including
  without limitation the rights to use, copy, modify, merge, publish,
  distribute, sublicense, and/or sell copies of the Software, and to
  permit persons to whom the Software is furnished to do so, subject to
  the following conditions:

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
  BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
  ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.

BSD-3-Clause License (applies to d3):

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions
  are met:
  1. Redistributions of source code must retain the above copyright
     notice, this list of conditions and the following disclaimer.
  2. Redistributions in binary form must reproduce the above copyright
     notice, this list of conditions and the following disclaimer in
     the documentation and/or other materials provided with the
     distribution.
  3. Neither the name of the copyright holder nor the names of its
     contributors may be used to endorse or promote products derived
     from this software without specific prior written permission.
  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
  "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
  LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
  FOR A PARTICULAR PURPOSE ARE DISCLAIMED.

SIL Open Font License 1.1 (applies to Cormorant Garamond, DM Sans):

  -----------------------------------------------------------
  SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
  -----------------------------------------------------------

  PREAMBLE
  The goals of the Open Font License (OFL) are to stimulate worldwide
  development of collaborative font projects, to support the font
  creation efforts of academic and linguistic communities, and to
  provide a free and open framework in which fonts may be shared and
  improved in partnership with others.

  The OFL allows the licensed fonts to be used, studied, modified and
  redistributed freely as long as they are not sold by themselves. The
  fonts, including any derivative works, can be bundled, embedded,
  redistributed and/or sold with any software provided that any
  reserved names are not used by derivative works. The fonts and
  derivatives, however, cannot be released under any other type of
  license. The requirement for fonts to remain under this license does
  not apply to any document created using the fonts or their
  derivatives.

  PERMISSION & CONDITIONS
  Permission is hereby granted, free of charge, to any person
  obtaining a copy of the Font Software, to use, study, copy, merge,
  embed, modify, redistribute, and sell modified and unmodified copies
  of the Font Software, subject to the following conditions:

  1) Neither the Font Software nor any of its individual components,
  in Original or Modified Versions, may be sold by itself.

  2) Original or Modified Versions of the Font Software may be
  bundled, redistributed and/or sold with any software, provided that
  each copy contains the above copyright notice and this license.

  3) No Modified Version of the Font Software may use the Reserved
  Font Name(s) unless explicit written permission is granted by the
  corresponding Copyright Holder.

  4) The name(s) of the Copyright Holder(s) or the Author(s) of the
  Font Software shall not be used to promote, endorse or advertise any
  Modified Version, except to acknowledge the contribution(s) of the
  Copyright Holder(s) and the Author(s) or with their explicit written
  permission.

  5) The Font Software, modified or unmodified, in part or in whole,
  must be distributed entirely under this license, and must not be
  distributed under any other license.

  TERMINATION
  This license becomes null and void if any of the above conditions
  are not met.

  DISCLAIMER
  THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
  OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL
  THE COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR
  CONSEQUENTIAL DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR
  OTHERWISE, ARISING FROM, OUT OF THE USE OR INABILITY TO USE THE FONT
  SOFTWARE OR FROM OTHER DEALINGS IN THE FONT SOFTWARE.

================================================================================
-->
"""


# ----- assembly (shared by every mode) ---------------------------------------

def module_files():
    # Modules may be flat (NN_name.jsx) or grouped one level deep in an
    # NN_name/ directory holding its own NN-prefixed parts. Sorting on the
    # posix-relative path gives the correct assembly order in both cases,
    # because the outer NN sorts before the inner one.
    files = sorted(MODULES_DIR.rglob(MODULE_GLOB),
                   key=lambda f: f.relative_to(MODULES_DIR).as_posix())
    if not files:
        raise RuntimeError(f"no module files matching {MODULE_GLOB} in {MODULES_DIR}")
    return files


def assemble_body():
    """Concatenate the module tree in NN order into the babel body. rstrip('\\n')
    per file so an editor-added trailing newline cannot inject blank lines at a
    join; the single '\\n' the join inserts is the real seam."""
    return '\n'.join(f.read_text(encoding='utf-8').rstrip('\n') for f in module_files())


def assemble_working_html():
    shell = SHELL.read_text(encoding='utf-8')
    if shell.count(SENTINEL) != 1:
        raise RuntimeError(f"shell must contain {SENTINEL} exactly once")
    return shell.replace(SENTINEL, assemble_body())


# ----- finals machinery (unchanged behaviour, now fed the assembled HTML) -----

def escape_for_inline_script(js_text):
    return re.sub(r'</(script)', r'<\\/\1', js_text, flags=re.IGNORECASE)


def build_js_libs_block(libs):
    parts = []
    for cdnjs_path, local_path, prepend in libs:
        content = (NODE_MODULES / local_path).read_text(encoding='utf-8')
        if prepend:
            content = prepend + content
        parts.append(f'<script>/* inlined: {cdnjs_path} */\n'
                     f'{escape_for_inline_script(content)}\n</script>')
    return '\n'.join(parts)


def build_fonts_block():
    rules = []
    for ff in FONT_FACES:
        b64 = base64.b64encode(ff['file'].read_bytes()).decode('ascii')
        rules.append(
            f"@font-face{{font-family:'{ff['family']}';"
            f"font-style:{ff['style']};font-weight:{ff['weight']};"
            f"font-display:swap;"
            f"src:url(data:font/woff2;base64,{b64}) format('woff2')}}")
    return '<style>\n' + '\n'.join(rules) + '\n</style>'


def replace_js_block(html, libs_inline_block):
    start = '<script crossorigin src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>'
    end = '<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>'
    s = html.find(start); e = html.find(end)
    if s < 0 or e < 0:
        raise RuntimeError("couldn't locate JS dependency block markers")
    return html[:s] + libs_inline_block + html[e + len(end):]


def replace_fonts_block(html, fonts_inline_block):
    start = '<link rel="preconnect" href="https://fonts.googleapis.com">'
    end = 'rel="stylesheet">'
    s = html.find(start)
    if s < 0:
        raise RuntimeError("couldn't locate fonts block start")
    e = html.find(end, s + len(start))
    if e < 0:
        raise RuntimeError("couldn't locate fonts block end")
    return html[:s] + fonts_inline_block + html[e + len(end):]


def precompile_jsx_block(html):
    open_marker = '<script type="text/babel" data-presets="react">'
    s = html.find(open_marker)
    if s < 0:
        raise RuntimeError("couldn't locate JSX block opening tag")
    body_start = s + len(open_marker)
    e = html.find('</script>', body_start)
    if e < 0:
        raise RuntimeError("couldn't locate JSX block closing tag")
    jsx_source = html[body_start:e]
    if len(jsx_source) < 100_000:
        raise RuntimeError(f"JSX block suspiciously small ({len(jsx_source)} bytes)")

    # The JSX goes to node through a file in a fresh temporary directory, not a
    # fixed /tmp path, which a Windows Python reads as \tmp on the current
    # drive, a folder that usually isn't there. Bytes and an
    # explicit UTF-8 decode, so the platform's default encoding and newline
    # translation can't change what Babel reads or what comes back.
    with tempfile.TemporaryDirectory() as td:
        tmp_in = Path(td) / 'cartulary_jsx_input.jsx'
        tmp_in.write_bytes(jsx_source.encode('utf-8'))
        print(f"  Compiling {len(jsx_source):,} bytes of JSX via @babel/standalone...")
        result = subprocess.run(['node', str(COMPILE_JSX), str(tmp_in)],
                                capture_output=True, encoding='utf-8', check=False)
    if result.returncode != 0:
        print(f"  Babel transform failed:\n{result.stderr}", file=sys.stderr)
        raise RuntimeError("JSX precompile failed")
    compiled = escape_for_inline_script(result.stdout)
    print(f"  Compiled to {len(result.stdout):,} bytes of JS")
    return html[:s] + f'<script>\n{compiled}\n</script>' + html[e + len('</script>'):]


def build_final(html, mode):
    if mode not in ('readable', 'precompiled'):
        raise ValueError(f"unknown mode: {mode}")
    if mode == 'precompiled':
        html = precompile_jsx_block(html)
    libs = JS_LIBS_BASE.copy()
    if mode == 'readable':
        libs.append(BABEL_LIB)
    html = replace_js_block(html, build_js_libs_block(libs))
    html = replace_fonts_block(html, build_fonts_block())
    return LICENSE_BLOCK + html


# ----- modes ------------------------------------------------------------------

def mode_working():
    OUT_DIR.mkdir(exist_ok=True)
    html = assemble_working_html()
    out = OUT_DIR / 'cartulary-working.html'
    out.write_text(html, encoding='utf-8')
    print(f"Assembled working HTML: {out}")
    print(f"  modules: {', '.join(p.relative_to(MODULES_DIR).as_posix() for p in module_files())}")
    print(f"  size: {out.stat().st_size:,} bytes")
    return out


def header_placement_defects():
    """
    Headers that sit in a file with no target after them IN THAT FILE.

    Separate from header_pairs() on purpose. header_pairs runs on the ASSEMBLED
    body, where file boundaries do not exist, so a header sitting at the tail of
    one module and labelling the head of the next pairs CORRECTLY and the check
    is blind to it. `19_trunk:878` is exactly that: it resolves to HOME_SECTIONS
    at +2 and its only defect is which file it lives in. This is the per-file
    companion that can see that class.
    """
    out = []
    for p in module_files():
        text = p.read_text(encoding='utf-8')
        rel = p.relative_to(MODULES_DIR).as_posix()
        for title, target in canonicalize.header_pairs(text):
            if target is None:
                out.append((rel, title))
    return out


def mode_verify():
    body = assemble_body()
    ref = reference_body_path().read_text(encoding='utf-8')

    diff = canonicalize.first_difference(body, ref)
    seq_ok = diff is None
    decls_asm = canonicalize.decl_names(body)
    decls_ref = canonicalize.decl_names(ref)
    decls_ok = decls_asm == decls_ref
    byte_ok = body.rstrip('\n') == ref.rstrip('\n')

    hp_asm = canonicalize.header_pairs(body)
    hp_ref = canonicalize.header_pairs(ref)
    hdr_ok = hp_asm == hp_ref

    n_asm = len(canonicalize.canonical_sequence(body))
    n_ref = len(canonicalize.canonical_sequence(ref))

    print("Reconstitution-parity gate (pure split)")
    print(f"  canonical sequence : {'PASS' if seq_ok else 'FAIL'} "
          f"({n_asm} non-blank lines vs reference {n_ref})")
    if not seq_ok:
        idx, a, b = diff
        print(f"    first divergence at canonical line {idx}:")
        print(f"      assembled : {a!r}")
        print(f"      reference : {b!r}")
    print(f"  decl-name set      : {'PASS' if decls_ok else 'FAIL'} "
          f"({len(decls_asm)} names)")
    if not decls_ok:
        print(f"    only in assembled : {sorted(decls_asm - decls_ref)}")
        print(f"    only in reference : {sorted(decls_ref - decls_asm)}")
    print(f"  byte-identity      : {'exact' if byte_ok else 'differs (blank/ws only if canonical PASS)'}")
    print(f"  header pairs       : {'PASS' if hdr_ok else 'FAIL'} "
          f"({len(hp_asm)} headers)")
    if not hdr_ok:
        added, removed, retargeted = canonicalize.header_pair_diff(body, ref)
        for t, rt, at in retargeted:
            print(f"    retargeted : {t}: {rt} -> {at}")
        for t, g in added:
            print(f"    added      : {t} -> {g}")
        for t, g in removed:
            print(f"    removed    : {t} -> {g}")

    # All FOUR are gate conditions for a pure split. byte_ok is the only one
    # that catches a dropped or added BLANK line: canonicalize drops blanks, so
    # sequence and decl-set both pass through that change untouched. Leaving it
    # out of the verdict is what made "sequence PASS + byte-identity differs"
    # report GREEN, which is precisely the r014 failure the gate exists to stop.
    # Scored since the r025 sweep took it to zero. It was a report through the
    # sweep itself, because gating on zero while two known defects were still
    # queued would have failed on purpose every run and taught the operator to
    # skim past it. A standing non-zero is how a check stops being read.
    placement = header_placement_defects()
    place_ok = not placement
    print(f"  header placement   : {'PASS' if place_ok else 'FAIL'} "
          f"({len(placement)} misfiled)")
    for rel, title in placement:
        print(f"    {rel}: {title}  [no target in this file]")

    ok = seq_ok and decls_ok and byte_ok and hdr_ok and place_ok
    print("\nGATE", "GREEN" if ok else "RED")
    if not ok:
        sys.exit(1)


def mode_gather():
    """
    The GATHER check. A relocation moves lines on purpose, so canonical sequence
    and byte-identity are expected to differ and cannot be the verdict. What has
    to hold: nothing added, dropped, or altered (multiset), the declaration set
    intact, and the RAW line count unchanged.

    raw_ok is scored, not printed. Multiset, decl-set, and canonical sequence
    all run on blank-stripped lines, and byte-identity is expected to differ, so
    on a gather a dropped or added BLANK line is invisible to every other check.
    That is the same shape as the byte_ok verdict bug fixed at r023, and it is
    live damage rather than theory: cutting a block that leaves its file ending
    on a blank loses a line to the assembler's per-file rstrip.

    This mode exists because the gather check previously lived as a snippet in
    the handoff and got retyped each time. It drifted once already, carrying a
    flat MODULES_DIR.glob() that stopped seeing directory parts at r023. A check
    that lives in prose is a check that decays.
    """
    body = assemble_body()
    ref = reference_body_path().read_text(encoding='utf-8')

    ms_asm = canonicalize.canonical_multiset(body)
    ms_ref = canonicalize.canonical_multiset(ref)
    decls_asm = canonicalize.decl_names(body)
    decls_ref = canonicalize.decl_names(ref)
    raw_asm = len(body.split('\n'))
    raw_ref = len(ref.rstrip('\n').split('\n'))

    ms_ok = ms_asm == ms_ref
    decls_ok = decls_asm == decls_ref
    raw_ok = raw_asm == raw_ref

    print("Gather check (relocation; sequence and byte-identity WILL differ)")
    print(f"  multiset           : {'PASS' if ms_ok else 'FAIL'}")
    if not ms_ok:
        print(f"    extra   : {list((ms_asm - ms_ref).items())[:6]}")
        print(f"    missing : {list((ms_ref - ms_asm).items())[:6]}")
    print(f"  decl-name set      : {'PASS' if decls_ok else 'FAIL'} "
          f"({len(decls_asm)} names)")
    if not decls_ok:
        print(f"    only in assembled : {sorted(decls_asm - decls_ref)}")
        print(f"    only in reference : {sorted(decls_ref - decls_asm)}")
    print(f"  raw line count     : {'PASS' if raw_ok else 'FAIL'} "
          f"({raw_asm} vs {raw_ref})")
    print(f"  canonical lines    : {len(canonicalize.canonical_sequence(body))} vs "
          f"{len(canonicalize.canonical_sequence(ref))}")

    # Reported, never scored. A gather may legitimately move a header with its
    # block, so a pair change is a decision point, not a failure: fix the shear
    # in the same cut or record why not.
    added, removed, retargeted = canonicalize.header_pair_diff(body, ref)
    n = len(added) + len(removed) + len(retargeted)
    print(f"  header pairs       : {n} change(s) (reported, not scored)")
    for t, rt, at in retargeted:
        print(f"    retargeted : {t}: {rt} -> {at}")
    for t, g in added:
        print(f"    added      : {t} -> {g}")
    for t, g in removed:
        print(f"    removed    : {t} -> {g}")

    # Scored on a gather too, and this is the cut where it matters: a relocation
    # is exactly how a header ends up in the wrong FILE while pairing correctly
    # in the assembled body, which is the one class header_pairs cannot see.
    placement = header_placement_defects()
    place_ok = not placement
    print(f"  header placement   : {'PASS' if place_ok else 'FAIL'} "
          f"({len(placement)} misfiled)")
    for rel, title in placement:
        print(f"    {rel}: {title}  [no target in this file]")

    ok = ms_ok and decls_ok and raw_ok and place_ok
    print("\nGATHER", "GREEN" if ok else "RED")
    if not ok:
        sys.exit(1)


def mode_finals():
    OUT_DIR.mkdir(exist_ok=True)
    html = assemble_working_html()
    print(f"Assembled source: {len(html):,} bytes ({len(html)/1024/1024:.2f} MB)\n")

    print("Precompiled production build (no Babel runtime)...")
    pre = build_final(html, 'precompiled')
    pre_path = OUT_DIR / f'Cartulary_v{VERSION}.html'
    pre_path.write_bytes(pre.encode('utf-8'))
    print(f"  {pre_path.name}: {pre_path.stat().st_size:,} bytes\n")

    print("Readable build (JSX preserved, Babel runtime)...")
    read = build_final(html, 'readable')
    read_path = OUT_DIR / f'Cartulary_v{VERSION}_Readable.html'
    read_path.write_bytes(read.encode('utf-8'))
    print(f"  {read_path.name}: {read_path.stat().st_size:,} bytes\n")
    print(f"Both in: {OUT_DIR}")


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


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else ''
    if mode == 'working':
        mode_working()
    elif mode == 'verify':
        mode_verify()
    elif mode == 'gather':
        mode_gather()
    elif mode == 'edit':
        mode_edit(sys.argv[2:])
    elif mode == 'freeze':
        mode_freeze(sys.argv[2:])
    elif mode == 'finals':
        mode_finals()
    else:
        print("usage: build_inline.py {working|verify|gather|edit|freeze|finals}", file=sys.stderr)
        sys.exit(2)


if __name__ == '__main__':
    main()
