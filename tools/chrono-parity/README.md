# Chronometric parity

Checks that a build draws Timeline; Chronometric exactly as the last passed
build did. It was written for v1.7's r018, which pulled Chronometric's math out
of the view (the section "Chronometric math" in `19_chronometric.jsx`) so
Fabula's timeline can share it, and which had to change nothing on screen. Any
later cut that touches those functions runs it again against the last build
Drak passed.

## Running it

From the repository root, with the last passed build's tag:

```
python3 tools/chrono-parity/run.py v1.7_r017
```

That builds the tagged tree in a temporary git worktree, builds the working
tree, unpacks the six libraries the page loads (React, ReactDOM, Babel,
marked, d3, JSZip) from `deps/`, records both builds, and compares them. Add
`--candidate <ref>` to check a commit instead of the working tree. Everything
it writes goes under `inlining/out/chrono-parity/`, which git ignores.

It needs Python 3, Node 18 or later, and Playwright with its Chromium
(`npm install playwright` and `npx playwright install chromium`, here or
anywhere Node resolves it). Recording takes two to three minutes a build.

The exit code is the verdict: 0 when every step of every run draws the same,
1 when any step differs, 2 when the run itself breaks, 3 when a step couldn't
be taken (the page didn't offer what the step needed).

## What it compares

`parity.js record` opens a build in Chromium, loads each world below at a
window 1,400 pixels wide and again at 900, opens Timeline; Chronometric, and
takes the steps below. After every step it writes down what Chronometric
shows: the SVG's markup as text, the controls' state, the edit panel's markup
and values, and the hint line. After a step that saves, it also reads the
world back from the browser's storage and keeps the entries and view
preferences as saved (times of saving aside). `parity.js compare` reads two
such records and prints each run's first difference, with the text around it.

The worlds (`worlds.js`) are made from the first build's own new world, so
they use its built-in templates, and are written beside its record; the other
build loads the same files.

- **centuries**: five centuries under four eras, one with no start year; a
  Character lane crowded with sixteen lives; marriages declared on both
  sides, on one, open-ended, open-started, and to a missing partner; spans
  open-ended and approximate; a faction's name history; a secret date; and a
  group's dated rows on a template of the check's own.
- **twoYears**: everything inside two years, so zooming in reaches day ticks,
  with an era starting mid-chart.
- **twoCalendars**: a second calendar, the Reckoning of Ash, with ten months
  of 36 days, its own eras, and an anchor eight centuries in; entries bound
  to each calendar, and a marriage across them.
- **oneMoment**: two events on the same day, so the auto-fit bounds widen a
  single moment.

The steps, on each world but the last: the zoom-out button to the least zoom
and once past it, a wheel turn there; the zoom-in button to the most zoom, a
wheel turn there; Reset; wheel zoom in and out around three points; a pan
each way; the From and To boxes; the lane filter set to none, one, and all;
secrets hidden and shown (centuries); edit mode, selecting a span, stepping
its year in the panel, dragging it with a look mid-drag, dragging its start,
dragging a point, Escape, and leaving edit mode; in the second calendar's
world, the same zooming and editing shown in Ash, each view dragging one
entry bound to each calendar; and the SVG export's text. oneMoment takes a
shorter run of zooms, a drag, and the export.

## Proving it still has teeth

A check that can't fail proves nothing. At r018, a copy of the working build
was made for each of twenty-three planted rule changes, one function's rule
at a time (a sub-row's height, the month ticks' threshold, the bounds'
padding, the stacking gap, the wheel's zoom limit, the date carried back
across calendars, and the rest), and every copy had to be reported different
from r017's passed build. When this check or the math changes, plant a few
again: change one number or comparison in a copy of the working HTML,
`parity.js record` it with `--fixtures` pointing at a baseline's fixtures,
and `parity.js compare` must exit 1.

A cut that changes Chronometric on purpose will differ, and should: then the
differences show where the drawing changed, and the cut's own checks judge
whether those are the intended ones. `parity.js compare --only saved` still
holds such a cut to what its edits save. r019 moved lanes and grew them but
moved no event sideways, and every drag and panel step saved the same entries
as r018's did.

`parity.js compare --aside eras`, or `run.py <ref> --aside eras`, sets each era
band aside, its tint and its name, in the drawing and in the export, leaving a
placeholder in its place, and compares the rest. r021 moved Chronometric's era
names onto a line of their own above the year labels and cut each to its band,
so its drawing differs wherever an era is drawn; with the era bands set aside
it had to come out identical to r020's, and a copy of r021 with one year label
moved a pixel had to come out different, so the setting-aside is known to hide
nothing else.
