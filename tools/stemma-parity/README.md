# Stemma parity

Checks that a build saves and shows the same stemma, step by step, as the last
passed build did, and that its undo retraces what was done. It was written for
v1.7's r026, which turned the radial's edits into pure transforms (the section
"Stemma transforms" in `21_stemma.jsx`) committed through `useMapHistory`, and
which had to change nothing on screen but the Undo and Redo buttons. Any later
cut that touches the edit path and must change nothing else runs it again
against the last build Drak passed.

## Running it

From the repository root, with the last passed build's tag:

```
python3 tools/stemma-parity/run.py v1.7_r025
```

That builds the tagged tree in a temporary git worktree, builds the working
tree, unpacks the six libraries the page loads (React, ReactDOM, Babel,
marked, d3, JSZip) from `deps/`, records both builds through the same edit
sequence, compares them, and walks the working tree's undo. Add `--candidate
<ref>` to check a commit instead of the working tree, `--no-undo` to skip the
walk. Everything it writes goes under `inlining/out/stemma-parity/`, which git
ignores.

It needs Python 3, Node 18 or later, and Playwright with its Chromium
(`npm install playwright` and `npx playwright install chromium`, here or
anywhere Node resolves it). Recording takes about a minute a build.

The exit code is the verdict: 0 when every step saves and shows the same and
the undo walk retraces the sequence, 1 when any step differs, 2 when the run
itself breaks, 3 when a step couldn't be taken, 4 when the undo walk failed.

## What it compares

`parity.js record` opens a build in Chromium, seeds a new world with four
Character entries (Arwen, Boromir, Celeborn, Denethor), opens Stemma, makes a
rota (the button is + New Rota since r029, + New Stemma before it; the script
clicks either), renames it before the first record so the default name of the
day is never written down, and takes these steps: a freeform child at slot 0, a linked child at
slot 4 picked from the smart input's suggestions, a freeform child at slot 8; a
drill into the first child and two children under it, one of each kind; back
to the root; the root relabeled key by key in the inspector, then an icon and
a color picked; the third child converted to a linked entry, re-linked to
another, and converted back to freeform; the first child deleted with its two;
the stemma renamed again. After every step it writes down the stemmas as saved, with
every stemma and node id replaced by its number in order of first appearance
and the times of saving dropped, and what the canvas shows: the top bar's text
(Undo and Redo left out, since the build before r026 had none), each node's
position, label, color and icon, the count of empty slots, and the inspector's
text, values and picks. `parity.js compare` reads two such records and prints
each step's first difference.

The seeded world is written beside the first build's record, under
`fixtures/`, and the other build loads the same file, so both sides edit the
very same world.

## The undo walk

With `--undo`, after the sequence the recorder presses Ctrl+Z as many times as
each step committed, newest step first, and checks that the saved stemma is
the one the step before recorded; then Ctrl+Y the same way forward; then it
leaves the canvas for the index, comes back, and checks that Undo is disabled
and Ctrl+Z changes nothing. `PARITY_TRACE=1` in the environment prints the
root's label, icon, child count and the stemma's name after each group of
presses.

The walk has teeth, proven at r026: a copy of the build whose label edits
aren't coalesced (each keystroke its own step) fails it in both directions,
and the compare catches a copy whose convert-to-freeform writes a different
label.

## The map renderer

`renderer.py` is a second check, written for v1.7's r032, which taught the
map's shape model and renderer an arrowed stroke and had to change nothing
else a map draws. It loads `18_cartographia/00_model.jsx` and
`01_renderer.jsx` from a baseline ref and from the working tree (or a
candidate ref), transpiles each pair with the app's own Babel, and renders
the same four hundred generated drawings through both, comparing the SVG
text the HTML export writes. The set comes from a fixed seed, so it is the
same every run: every shape type with every option the model has (smooth
and not, bent and rotated labels, labels in ink and stroked, the built-in
stamps, imported stamps of each kind, missing stamps with and without the
editor's placeholder, regions with holes, hidden and locked layers, raster
layers with and without an image, grain, an image canvas and an image-less
one), with `arrow` absent, "none", or a value the model doesn't know, since
a map saved before r032 carries none. Then it checks what the candidate
adds: a stroke with `arrow` set renders its heads, smooth or not, and one
without renders as the baseline does.

```
python3 tools/stemma-parity/renderer.py v1.7_r031
```

Exit 0 when every drawing renders the same and the arrow checks hold, 1
when any differ, 2 when the run breaks. It needs Node and Python 3 and
nothing else: Babel is unpacked from `deps/` as `run.py` unpacks it, and
the modules run in Node's own sandbox, no browser.
