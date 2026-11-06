# Behavior probes

Headless checks of what the app does, run by CI on every push. Each probe opens the working build from a `file://` URL, as a user does, in a fresh browser profile; the page's CDN requests are answered from `deps/` and the fonts answered empty, and any other request fails the probe, as does any page error.

```
python3 inlining/build_inline.py working
node tools/probes/run.js                 # every probe
node tools/probes/run.js rename          # the probes whose file names match
node tools/probes/teeth.js               # each probe made to fail on a planted defect
```

`PROBE_BROWSER=<path to a Chrome or Chromium>` picks the browser; without it the installed Google Chrome is used, which GitHub's Ubuntu runner image carries. `PROBE_BUILD=<html>` probes another build, a final for one; without it, `inlining/out/cartulary-working.html`. `playwright-core` comes from `deps/` and is unpacked, with the libraries the page loads, into `tools/probes/.deps/` (ignored).

- `probes/`: one file per probe, run in name order. 01 to 05 are the save file: a reload, a world's JSON round trip, a template's entries round trip as JSON and as CSV, a rename's link rewrite, a delete's count and what it leaves. 06 to 11 are the desktop controls mobile's cuts 2 to 5 change, each as it works today: picking in the sidebar, ← Back, a sidebar drag reorder, Chronometric's pan and Edit drag, Ephemeris's sky pan and Compute split, and Fabula's timeline pan (`docs/mobile-spec.md`, call 4's condition).
- `worlds/basic.world.json`: the fixture, a fresh world's export with three entries (two linked by `[[Eastwatch]]`, one by reference), a lifespan each for two of them, and a story with two dated scenes.
- `teeth.js`: one planted defect per probe it covers, each a string replacement on a copy of the build, asserted to occur once; it fails when a probe passes on its defect, or when an anchor has moved.

A probe drives the screen, so a cut that changes what a probe clicks changes the probe in the same cut, and says so.
