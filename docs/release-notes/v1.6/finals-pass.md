# v1.6 finals: the pass

> The checklist Drak ran on the v1.6 finals before the upload, kept as the template for the next release's ship gate. Part one is the full pass, run on the r050 finals and passed 2026-10-23 ("all pass. 1.6 is good to go"), verbatim as it was sent. Part two is the re-pass on the r051 finals after the font cut, which changed only the download path; those r051 files (`Cartulary_v1.6.html` sha256 `b99381a041153d9d`, `Cartulary_v1.6_Readable.html` sha256 `e748142eadb3e1aa`) are what shipped. A pass is written for the person running it: one browser per section, the file named on every line, and every line a thing to see, not a thing to believe.

## Part one: the full pass (r050 finals)

Built from the r050 tree (`main` at `75f68fe`), `build_inline.py finals`, both validator-green.

- `Cartulary_v1.6.html` (2,891,113 bytes, sha256 `e85f4e5e67859017`): precompiled, no Babel at runtime. This is the file users run.
- `Cartulary_v1.6_Readable.html` (6,359,899 bytes, sha256 `78774f4ed4ffdd50`): JSX intact, Babel runtime.

Headless already: probes 5, 14, 15, 16, 17, 18 and the fixture export pass on the precompiled build; probe 17 passes on the Readable. Nothing external is loaded at start (libs and fonts inlined). One runtime fetch exists by design: the SVG download asks Google Fonts for the map face when online and falls back to the viewer's serif offline (r037).

The pass is about the compile path, which no working file you've passed has used. Do it on the precompiled file unless a line says Readable.

## Before anything

0. Export your current world to `.json` from the browser you'll test in. The finals share that browser's storage with whatever Cartulary last ran there, so the first open migrates what it finds.

## Chrome or Edge, folder mode connected

1. Open `Cartulary_v1.6.html`. It loads with no console errors; the Project view shows the world; Settings says v1.6.
2. Import a real v1.5 world that has maps. The Map template is gone from the sidebar, every map is in Cartographia with its image and pins where they were, a custom map template's extra fields show as a line in Notes, and a second reload changes nothing.
3. Open every view once: Home (the three map topics are in the TOC), an entry list and editor, the Template Builder, Concordance (a Map row in the Templates filter; a pin edge carries the 📍), Linea, Stemma, Chronometric, Kalendarium, Ephemeris, Glossopoeia, Cartographia.
4. On a real map: Rect, Polygon with Done, Freehand, Fill inside a loop, a label with an arc, a stamp from a pack, Brush with an imported tip, Eraser, a second layer, Undo past the paint stroke, Ctrl+wheel zoom and Space-drag, a letter or two, Arrange moving a group to a new row. Save, reopen, everything is there.
5. Raster layer in folder mode: Add raster layer, Load image, paint on it, Save; the folder has the layer's file. Edit again, paint, Cancel; the file is back to what it was.
6. Import a Photoshop `.abr` from the Stamps panel; export that pack as a PNG zip; open the zip.
7. Download SVG and PNG from the map's view; both open.
8. HTML export with maps; the exported page shows the drawing and the painted layer. Markdown + images zip; the painted layer's file is in it.
9. Reload the page with the map editor open on a dirty draft: the close warning appears, and after the reload nothing throws.

## Brave

10. Open the file, folder mode on the flag as before. Fill inside a hollow shape (the r040 blank-trace case). Download PNG.

## Surface

11. Pen: draw a freehand line, paint, flip the pen and erase. Touch: two-finger pinch, one-finger pan in the Pan tool, a pin dragged by finger.

## Offline, once

12. Network off, open the precompiled file in a fresh tab: it loads and a map renders. Download SVG: the note says the file was written; the font fell back.

## Readable

13. Open `Cartulary_v1.6_Readable.html` in the same browser: the same world loads, one map edit saves, Home's Map Editor topic opens.

Report by number. Anything that fails is a cut before ship, not a note in the release.

## Part two: the r051 re-pass (the download path only)

1. Working file: open, load a world, open a map's view, Download SVG and PNG. Both write, nothing throws. The SVG's labels are in the viewer's serif; that is the development build's fallback, not a bug.
2. `Cartulary_v1.6.html` (r051): same world, Download SVG, open it somewhere that is not Cartulary (a browser tab, Inkscape): labels in Cormorant Garamond.
3. Same file, network off, fresh tab: it loads, a map renders, Download SVG and PNG, the SVG's labels still in Cormorant Garamond.
4. `Cartulary_v1.6_Readable.html`: open, one map edit saves, Download SVG opens with the font.
