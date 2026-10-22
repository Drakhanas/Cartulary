# Cartographia+ build sheet (v1.6 pillar 3, the drawing editor)

> **FROZEN BUILD SHEET.** Locked 2026-10-20 (session 19) after proposal-review. The scope and won't-have list come from `roadmap.md`'s v1.6 Cartographia+ section, with one recorded change (layers, section 1). The cut order in section 6 is the plan; the declared scope on each cut is what `build_inline.py edit` holds the tree to. Find code by NAME, never line number.

---

## 0. What this is

The map-creation feature: a vector drawing layer inside Cartographia so a user with no Inkarnate, Wonderdraft, or scanner can produce a serviceable map in twenty minutes, place pins on it, and use the time-aware filtering and name-history rendering that already exist. Excalidraw-for-maps, not Inkarnate-lite: one aesthetic (parchment and ink by default), a small fixed palette, a starter stamp set, and an importable stamp-pack spec so the polite-no answer to every further request is "the spec supports it, build your own."

Nothing here changes how pins, time mode, exports of pins, or the three schema fields work. The drawing sits under the pins.

---

## 1. Decisions locked (session 19)

- **Rendering is SVG.** One renderer turns `mapData.drawing` into a node tree; the editor turns the tree into React elements, the HTML export turns it into a string. Two renderers would drift, so there is one tree and two serializers.
- **Layers, narrowly.** The roadmap's v1 won't-have list said no layers. Drak overrode it at session 19: layers are named, ordered, show/hide, lock. No opacity, no blend modes, no per-layer export. The roadmap line is corrected where it lives.
- **Drawing over an existing raster image is allowed.** The image renders as the bottom `<image>` in the SVG and the layers sit above it. The won't-have "image import as drawable surface" forbids painting into pixels, which this does not do.
- **Background for image-less maps** is a fill with an optional grain: presets White, Vellum, Parchment. Under an image the background is not drawn.
- **Pins stay 0-1 normalized** to the canvas rect, as they are today. Consequence: a drawn map's canvas size is fixed once any shape or pin exists, editable while the map is empty. Pins in absolute drawing units would be the alternative and is not v1.
- **Undo/redo covers the drawing only**, not pins and not the schema fields. Local to the editor session, not persisted. *(Overridden at cut 4, r034, by decision at the fork: the history is a snapshot of the whole `mapData`, so pins are in it; schema fields still are not, and it is still local to the editor session.)*
- **Palette, eight colors, stored as hex** so stamp packs can carry their own: ink `#2b2420`, sepia `#6b4e2e`, parchment `#e8dcc0`, forest `#4f6b3a`, water `#5b7f99`, stone `#8a8378`, blood `#8c3b2e`, chalk `#f4efe4`. The editor offers only these; the data does not constrain.
- **Stamps are SVG symbols.** Four built in (mountain, tree, settlement marker, compass rose), defined in code; imported stamps live in `state.mapStamps` and travel in the world JSON. Imported SVG passes a whitelist sanitizer (section 4).
- **No new module files.** Every cut edits existing files, because cartographia carves last against its final shape and the edit gate refuses a changed file set. The editor code lands in the cartographia run of `16_trunk`.

---

## 2. Data model

`mapData` gains `drawing`. `migrate()` backfills it on every record (idempotent); a read-time normalizer (`ensureDrawingShape`) coerces malformed input to defaults rather than throwing, per the defensive-validation rule.

```
Label         Type                 Notes
width         number               viewBox units; = image natural px when an image exists, else 1600
height        number               = image natural px when an image exists, else 1000
background    object               { fill: hex, grain: 0..1 }; presets White / Vellum / Parchment; ignored under an image
layers        array                [{ id, name, visible, locked, shapes: [] }]; one "Drawing" layer by default

shape fields
id            string
type          select               rect | ellipse | polygon | stroke | text | stamp
x, y          number               rect/ellipse/text/stamp origin, viewBox units
w, h          number               rect/ellipse/stamp size
points        array                polygon/stroke [[x,y],...]
smooth        boolean              polygon corners and stroke paths through midpoint quadratics
fill          hex | null           palette only in the editor; stored as hex
stroke        hex | null
strokeWidth   select               2 | 4 | 8 (viewBox units)
text          string               text shapes; Cormorant Garamond; fontSize select 24 | 36 | 56
stampId       string               built-in id or state.mapStamps id
rotation      number               stamps and text, degrees
arc           number               text, degrees of bend, -180..180, 0 straight (r035)
```

`state.mapStamps` (new slice, backfilled empty): `[{ id, name, viewBox, body }]` where `body` is sanitized SVG inner markup. Built-in stamps are not stored.

---

## 3. Rendering

- The canvas is `<svg viewBox="0 0 {width} {height}">` in the slot the `<img>` occupies today, width 100%, zoomed by the same wrapper-width mechanism. Pin overlays are unchanged and position against the SVG's rect, which is the image's rect when an image exists (viewBox equals its natural size) and the drawing's own aspect otherwise.
- Order inside the SVG: background rect (and grain filter) when no image; `<image>` when there is one; `<defs>` with the stamp symbols in use and, since r035, the arc path of every bent label; one `<g>` per layer in order, hidden layers omitted; nothing else. Pins are HTML, above the SVG, as today.
- Smoothing: a polygon or stroke with `smooth` renders as a path through the midpoints of consecutive segments with the vertices as control points (quadratic), closed for polygons.
- Text uses `font-family: 'Cormorant Garamond', serif`. In-app it renders with the loaded font; the exported HTML falls back to the viewer's serif unless the export embeds fonts, which it does not today. Accepted for v1.
- Grain is an `feTurbulence` plus `feColorMatrix` filter at low opacity over the background rect. Off when `grain` is 0.

---

## 4. Stamp packs

Envelope `{ "cartulary_mapstamp_pack": 1, "name": ..., "stamps": [{ id, name, viewBox, body }] }`, single JSON, the same shape of thing as a template pack. Import opens the Skip / Replace / Rename collision modal that Templates and Packs use, keyed on stamp id. Export writes the world's imported stamps back out in the same envelope. *(Revised at cut 6, r036, by Drak's call at the fork: no collision modal. The envelope gains an optional `id` (a slug of the name when absent), and a stored stamp's id is namespaced by pack, `<packId>__<stampId>`, so packs never collide with each other or with the built-ins and a re-import replaces its own stamps in place; a stored stamp also carries `packId` and `pack`. Export is per pack, writing the pack's own ids back out, plus Export built-ins as a pack.)*

**Sanitizer, on import, not on render.** Imported `body` markup is parsed and rebuilt from an allowlist: elements `g path circle ellipse rect polygon polyline line`; attributes `d points cx cy r rx ry x y x1 y1 x2 y2 width height fill stroke stroke-width stroke-linecap stroke-linejoin opacity transform`. Everything else is dropped: scripts, event handlers, `href`, `foreignObject`, `style`, `use`. A stamp pack is the first third-party content Cartulary renders as markup, in-app and into exported HTML that other people open, so the HTML export trust model (hardened against user-content hrefs) extends to it. Rejected content is reported at import, not silently removed. *(As built at r036: the allowlist also admits `fill-rule`, `fill-opacity`, `stroke-dasharray`, `stroke-opacity`, and `stroke-miterlimit`, which real line art uses and whose values are plain; every attribute value is held to a plain charset with `url(` refused; the body is parsed with the HTML parser, as inline svg in a page, because that is how the app and an exported page render it; and the sanitizer runs on load as well as on import, in `ensureMapStamps`, so the save file is not trusted either. The report is a modal before anything lands, with Cancel.)*

---

## 5. Exports

- **HTML export:** `renderMapHtml` emits the drawing SVG (string serializer) in place of, or under, the image; pin overlay and legend unchanged. Hidden layers are omitted.
- **Markdown export:** unchanged; markdown never embedded the canvas.
- **Per-map download:** SVG (the serialized drawing with the image inlined when present) and PNG (the SVG drawn to a canvas at 2x). These are the only image exports; nothing beyond SVG/PNG, per the won't-have list. *(As built at r037: Download SVG and PNG above the canvas in the map view, view only; no pins in either file; the map font embedded in the svg as a data-URL `@font-face` when Google Fonts can be fetched, with a silent fallback; `href` doubled as `xlink:href` for older viewers; the png's 2x capped at sixteen million pixels; an image that cannot be read writes the drawing alone and the note says so.)*

---

## 6. Cuts

Each cut is one script in `inlining/cuts/`, gated by `build_inline.py edit` with the declared scope below, parse-gated, staged for a browser pass, then rotated with `freeze`. One r-bump each; cuts 3 and 4 may split.

| # | Cut | Declared scope | Browser check |
|---|---|---|---|
| 1 | Data model: `drawing` shape, `ensureDrawingShape`, `migrate` backfill, `createMap` seeds it, `state.mapStamps` slice | `16_trunk`, `10_migrate`, `12_trunk`, `09_trunk` | Old worlds load; every existing map opens unchanged |
| 2 | SVG canvas: background, image as `<image>`, layer groups, view mode and HTML export through the one renderer | `16_trunk`, `08_export-layer`, `shell.html` | Pins land where they did at every zoom; a new map with no image shows vellum; HTML export matches |
| 3 | Tools: select/move/delete, rect, ellipse, polygon, stroke, palette, widths, smoothing | `16_trunk`, `shell.html` | Draw a coastline and a forest, drag them, delete one |
| 4 | Text labels; undo/redo; layer list (add, rename, reorder, hide, lock) | `16_trunk`, `shell.html` | Undo ten steps; a hidden layer stays hidden in export |
| 5 | Built-in stamps: place, scale, rotate | `16_trunk` | Stamp a mountain range |
| 6 | Stamp packs: envelope, sanitizer, collision modal, export; json-schema help | `16_trunk`, `12_trunk`, `10_migrate`, `24_home-data` | Import a pack, collide on a name, each option behaves; a pack with a script tag imports without it and says so |
| 7 | Per-map SVG and PNG download | `16_trunk`, `12_trunk` | Files open in a browser and an image viewer |
| 8 | Help text and the cartulary.world Cartographia page (site, no r-bump) | `24_home-data`, `site/` | Reads true |

---

## 7. Won't-have (v1, unchanged from the roadmap except layers)

- Freehand brush tools
- Custom color picker
- Layer opacity, blend modes, per-layer export (the layer list itself is in, by the session-19 decision)
- Procedural generation
- Painting into an imported image
- Image export beyond SVG/PNG

---

## 8. Open at lock, decided at the cut

- Default canvas size presets beyond 1600 x 1000 (portrait, square) and whether the creation flow asks. Custom, width and height typed in (100 to 10000 units), added at r035 on Drak's pass.
- Selection handles for scale and rotate on stamps and text: corner handles versus a numeric panel. Cut 5. Decided at r035: both. Corners on the frame for scale (rect, ellipse, stamp; not text, whose sizes are the fixed three), a knob above the frame for rotation (stamp, text), and the strip keeps the numeric angle.
- Whether PNG export rasterizes at 2x or lets the user choose. Cut 7. Decided at r037: 2x, no dialog, capped so the pixel area stays under sixteen million (Safari's canvas limit), with the note saying the size written; a 1x / 2x / 4x choice can come if anyone asks.
- Canvas size for image maps. Section 2 says width and height equal the image's natural pixels when an image exists, but `migrate` cannot decode an image (it may live behind a folder handle), so r031 backfills 1600 x 1000 on every record, image or not. Decided at cut 2 (r032): the renderer takes the viewBox from the loaded image's natural size when an image exists and from the stored size otherwise; the editor writes the natural size into the drawing the first time an image loads while the drawing is still empty (so removing the image later keeps the shapes' units), and never once the drawing has content. Setting an image on a map that already has shapes leaves the stored size alone; the shapes then render in the image's units, which is the accepted v1 edge. Found at r031 by the fixture probe.
- Pointer events on the canvas. Decided at cut 3 (r033): Pin is a tool in the strip and the default; under it the svg keeps `pointer-events: none` and pin clicks reach the canvas div as before. The drawing tools put pointer events on the svg (`.draw-mode`) and make pins inert; Select takes its events on the editor's overlay svg, which carries an invisible 14-pixel non-scaling hit copy of every selectable shape and the point handles of the selected polygon or line. Right-click steps back: a drawing tool finishes its shape and goes to Select with it selected, Select goes to Pin.
- Canvas size presets. Decided at cut 3 (r033), revising the proposal: the picker (Landscape 1600 x 1000, Portrait 1000 x 1600, Square 1200 x 1200) sits on every image-less map, not only an empty one, and asks before changing a canvas that has shapes or pins; nothing is transformed on accept (shapes keep their coordinates and are cut off beyond the new edges, pins keep their 0-1 positions). Image maps have no picker.
- Resize handles for rect and ellipse: still cut 5, with the stamp and text handles; r033 shipped point handles for polygons and lines because Drak asked at review and they share the overlay mechanism. r034 gave text its angle by steppers and a number box in the strip, so cut 5's rotate handle is for stamps first; whether text gets the handle too is cut 5's call. Landed at r035: corners on rect, ellipse, and stamp (uniform for a stamp), the knob on stamp and text, both as deltas from the press.
- Decided at cut 4 (r034): text is placed by a Text tool and edited in the strip (field, size, angle), not in place on the canvas; undo covers the whole record (see section 1); the layer list is a panel toggled from the strip, the active layer is explicit and shown in the strip, and a selected shape can be moved between layers from the strip.
- A hidden layer is easy to forget once the panel is closed (Drak's pass at r034 chased a non-bug that way). A hidden-layer count on the Layers button is a candidate tweak, not scheduled.
- Decided at cut 5 (r035): a label's arc is a circular `<textPath>` centred on the label (startOffset 50%, text-anchor middle), the apex at the estimated middle of the straight label, the path running past both ends; the width estimate is by character class, shared by the editor and the export because the export has no DOM, so the two agree and a bent label's position is approximate by the estimate's error (small; a drag fixes it). A bent label turns about its apex, a straight one about its anchor. Stamps inherit the shape's Fill and Stroke; their line weight is the symbol's own and the strip hides Width for them. `mapStampDef` resolves built-ins only until the sanitizer (cut 6).
- Canvas chrome, decided on the r035 pass: the resize grip goes to 150% of the column (centred growth, capped at the scroll pane); a click on the grip is not a pin; no scrolling inside the canvas unless zoomed in (the 75vh cap applies only then; otherwise the page scrolls and the strip sticks to its top); Custom size in the picker.
- Cut 6 must pass `state.mapStamps` into `buildMapDrawingTree` from the view, the editor, and `renderMapHtml` (the `opts.stamps` plumbing was left out at r035 on purpose, with the sanitizer). Done at r036; `08_export-layer` joined the cut's scope for the one line.
- Decided at cut 6 (r036): the Stamps panel lives at the head of the Cartographia index, above the map list; a missing stamp (its pack deleted, or a map from another world) draws in the editor as a dashed box with a question mark, is named in the strip when selected, and is re-pointed from the picker, while the view and the export draw nothing for it; deleting a stamp or a pack warns with how many placed stamps go missing; the picker is the four built-ins inline plus More..., a modal grid grouped by pack. Found at the pass: the Project view read a world with maps and no entries as empty and hid Export as HTML (`25_trunk`, fixed in the cut).
- Cut 7 should pass the world's stamps into the svg it serializes, as the view and `renderMapHtml` do, or an imported stamp will be missing from the download. Done at r037.
- Decided at cut 7 (r037): the buttons above the canvas in the map view rather than the page header, so the scope stayed in `16_trunk`; pins stay out of the files (two pin renderers to keep in step otherwise); the font is fetched from Google Fonts once per session and embedded, which needs the network once; a sealed svg cannot see the page's fonts, so without the embedding both files would fall back to the viewer's serif.
- Cut 8 is help and the site: the Cartographia help section still describes the pre-pillar-3 map (an image with pins) and ends with "no layers"; r036 added the pack format and the save-file shapes, nothing else.
- `shell.html` was declared on cut 2 and not touched; declare what changed, not what the sheet guessed. The `.map-image` rule already sized the svg. Cut 3 did change it (36 lines) and declared it.
