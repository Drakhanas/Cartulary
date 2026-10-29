#!/usr/bin/env python3
"""
v1.7 r037: gather `21_stemma.jsx`'s members under the headers that name them
(position only, no code), ahead of r038's split into a folder.

Drak's calls (2026-10-28). The plan's last item was a pure carve of
`21_stemma` at its seven section headers, and two of the headers had drifted
from their blocks, so the carve would have filed code under the wrong names:
(b), move the tabula's canvas header down to its canvas first; then (a), fold
the rota's matching fix into the same cut. A gather is its own r-number, so
the carve becomes r038.

The rota. `Stemma helpers and canvas` opens the file, and r026 put its
`Stemma transforms` section between the helpers and `StemmaNode`, which left
the rota's canvas (`StemmaNode` through `StemmaCanvasView`) reading under the
transforms. The transforms section (its header, its description, the three
tree walkers and the nine transforms, twelve declarations from
`addChildToStemmaTree` to `stemmaRotateChild`, with the blank after it, 182
lines) moves down past `StemmaCanvasView`, to sit before the `Stemma Markdown
(v1.7 r035)` header: the helpers and the canvas under the first header, the
transforms under the second.

The tabula. r032 put the gestures hook, `useTabulaGestures`, and its
`Tabula: the drawing layer (v1.7 r032)` section between `Tabula: the canvas
(v1.7 r029)` and the board's-screen description that had followed that
header since r029, so the hook was the one member left under the canvas
header, and the camera, the card, the inspector, the delete modal, the
selection panel, and `TabulaCanvasView` read under the drawing layer. The
canvas header moves down to sit above the board's-screen description again,
and `useTabulaGestures`, with its doc comment and the blank after it (20
lines), moves to sit between that description and `useTabulaCamera`'s doc
comment.

Every header keeps its pair (`header_pairs` reports no change): the helpers'
to `STEMMA_SLOTS`, the transforms' to `addChildToStemmaTree`, the canvas's to
`useTabulaGestures`, the drawing layer's to `TABULA_TOOLS`. Eval order: what
moves is const arrows called only from inside function bodies (the
transforms) and a function declaration (the gestures hook), and the one
thing evaluated at load between any moved line's old and new places is the
drawing layer's `TABULA_TOOLS`, a literal of strings, so call time is
untouched.

The gate is `build_inline.py gather`: multiset, decl-set (773), raw line
count (54,252), header placement. Then `working`, the parse gate, the
browser pass, `freeze r037`.

Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r037_gather_stemma.py
"""
from pathlib import Path

ROOT = next(p for p in Path(__file__).resolve().parents if (p / 'cartulary-src').is_dir())
PATH = ROOT / "cartulary-src" / "modules" / "21_stemma.jsx"


def one(lines, pred, what):
    hits = [i for i, l in enumerate(lines) if pred(l)]
    assert len(hits) == 1, f"{what}: {len(hits)} hits"
    return hits[0]


def main():
    text = PATH.read_text(encoding="utf-8")
    assert not text.endswith("\n"), "21_stemma.jsx ends without a newline"
    lines = text.split("\n")
    n0 = len(lines)

    # ── the rota's transforms section ───────────────────────────────────────
    t_start = one(lines, lambda l: l.startswith("// ─── Stemma transforms "), "transforms header")
    rotate = one(lines, lambda l: l.startswith("const stemmaRotateChild = "), "stemmaRotateChild")
    t_end = next(i for i in range(rotate, n0) if lines[i] == "};")
    assert lines[t_end + 1] == "", "a blank after stemmaRotateChild"
    assert lines[t_end + 2].startswith("// Render a single stemma node"), "StemmaNode's doc comment follows"
    assert lines[t_start - 1] == "" and lines[t_start - 2] == "};", "the helpers end on code and a blank"
    t_block = lines[t_start:t_end + 2]
    md = one(lines, lambda l: l.startswith("// ─── Stemma Markdown (v1.7 r035) "), "Markdown header")
    assert lines[md - 1] == "" and lines[md - 2] == "}", "StemmaCanvasView ends on code and a blank"
    canvas_view = one(lines, lambda l: l.startswith("function StemmaCanvasView("), "StemmaCanvasView")
    assert t_end < canvas_view < md

    # ── the tabula's canvas header and gestures hook ────────────────────────
    c_hdr = one(lines, lambda l: l.startswith("// ─── Tabula: the canvas (v1.7 r029) "), "canvas header")
    assert lines[c_hdr - 1] == "" and lines[c_hdr - 2] == "", "two blanks before the canvas header"
    assert lines[c_hdr + 1].startswith("// The gestures (r032, out of the view)"), "the gestures' doc comment"
    g_fn = one(lines, lambda l: l == "function useTabulaGestures() {", "useTabulaGestures")
    g_end = next(i for i in range(g_fn, n0) if lines[i] == "}")
    assert lines[g_end + 1] == "", "a blank after useTabulaGestures"
    assert lines[g_end + 2].startswith("// ─── Tabula: the drawing layer (v1.7 r032) "), "the drawing layer's header follows"
    header = lines[c_hdr]
    g_block = lines[c_hdr + 1:g_end + 2]
    bs = one(lines, lambda l: l.startswith("// The board's screen (docs/stemma-v2-spec.md, section 6)"), "board's screen")
    assert lines[bs - 1] == "" and lines[bs - 2] == "}", "TabulaShapePanel ends on code and a blank"
    cam = one(lines, lambda l: l.startswith("// The camera: the canvas point at the pane's top-left corner"), "camera comment")
    assert lines[cam - 1] == "", "a blank before the camera's doc comment"
    assert lines[cam + 4].startswith("function useTabulaCamera("), "useTabulaCamera follows its comment"
    assert md < c_hdr < g_end < bs < cam

    new = (lines[:t_start] + lines[t_end + 2:md] + t_block + lines[md:c_hdr]
           + lines[g_end + 2:bs] + [header] + lines[bs:cam] + g_block + lines[cam:])
    assert len(new) == n0, (len(new), n0)
    assert sorted(new) == sorted(lines), "position only: the same lines, moved"
    PATH.write_text("\n".join(new), encoding="utf-8")
    print(f"r037 gathered: {len(t_block)} lines of transforms moved below StemmaCanvasView; "
          f"the canvas header and {len(g_block)} lines of gestures moved to Tabula's canvas")


if __name__ == "__main__":
    main()
