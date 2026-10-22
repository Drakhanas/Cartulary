# Cartographia+ build sheet (v1.6 pillar 3, the drawing editor)

> **FROZEN BUILD SHEET.** Locked 2026-10-20 (session 19) after proposal-review. The scope and won't-have list come from `roadmap.md`'s v1.6 Cartographia+ section, with one recorded change (layers, section 1) and, since 2026-10-22, a second: raster brushes, section 9, six more cuts. The cut order in section 6 is the plan; the declared scope on each cut is what `build_inline.py edit` holds the tree to. Find code by NAME, never line number.

---

## 0. What this is

The map-creation feature: a vector drawing layer inside Cartographia so a user with no Inkarnate, Wonderdraft, or scanner can produce a serviceable map in twenty minutes, place pins on it, and use the time-aware filtering and name-history rendering that already exist. Excalidraw-for-maps, not Inkarnate-lite: one aesthetic (parchment and ink by default), a small fixed palette, a starter stamp set, and an importable stamp-pack spec so the polite-no answer to every further request is "the spec supports it, build your own."

Nothing here changes how pins, time mode, exports of pins, or the three schema fields work. The drawing sits under the pins.

---

## 1. Decisions locked (session 19)

- **Rendering is SVG.** One renderer turns `mapData.drawing` into a node tree; the editor turns the tree into React elements, the HTML export turns it into a string. Two renderers would drift, so there is one tree and two serializers.
- **Layers, narrowly.** The roadmap's v1 won't-have list said no layers. Drak overrode it at session 19: layers are named, ordered, show/hide, lock. No opacity, no blend modes, no per-layer export. The roadmap line is corrected where it lives.
- **Drawing over an existing raster image is allowed.** The image renders as the bottom `<image>` in the SVG and the layers sit above it. The won't-have "image import as drawable surface" forbids painting into pixels, which this does not do. *(Amended 2026-10-22, section 9: a raster layer is painted into, but it is the map's own layer, never the imported image, which stays untouched under the drawing.)*
- **Background for image-less maps** is a fill with an optional grain: presets White, Vellum, Parchment. Under an image the background is not drawn.
- **Pins stay 0-1 normalized** to the canvas rect, as they are today. Consequence: a drawn map's canvas size is fixed once any shape or pin exists, editable while the map is empty. Pins in absolute drawing units would be the alternative and is not v1.
- **Undo/redo covers the drawing only**, not pins and not the schema fields. Local to the editor session, not persisted. *(Overridden at cut 4, r034, by decision at the fork: the history is a snapshot of the whole `mapData`, so pins are in it; schema fields still are not, and it is still local to the editor session.)*
- **Palette, eight colors, stored as hex** so stamp packs can carry their own: ink `#2b2420`, sepia `#6b4e2e`, parchment `#e8dcc0`, forest `#4f6b3a`, water `#5b7f99`, stone `#8a8378`, blood `#8c3b2e`, chalk `#f4efe4`. The editor offers only these; the data does not constrain.
- **Stamps are SVG symbols.** Four built in (mountain, tree, settlement marker, compass rose), defined in code; imported stamps live in `state.mapStamps` and travel in the world JSON. Imported SVG passes a whitelist sanitizer (section 4). *(Amended 2026-10-22, section 9: a stamp may also be a raster tip, `alpha` or `color`, rendered as an `<image>`.)*
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
- **Per-map download:** SVG (the serialized drawing with the image inlined when present) and PNG (the SVG drawn to a canvas at 2x). These are the only image exports; nothing beyond SVG/PNG, per the won't-have list. *(Amended 2026-10-22, section 9: the SVG becomes a mixed file once raster layers and tips exist, carrying them as `<image>` data URLs.)* *(As built at r037: Download SVG and PNG above the canvas in the map view, view only; no pins in either file; the map font embedded in the svg as a data-URL `@font-face` when Google Fonts can be fetched, with a silent fallback; `href` doubled as `xlink:href` for older viewers; the png's 2x capped at sixteen million pixels; an image that cannot be read writes the drawing alone and the note says so.)*

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
| 8 | Help text and the cartulary.world Cartographia page (site, no r-bump) | `24_home-data`, `site/` (as built at r038: plus one string in `16_trunk`, the index's lead sentence) | Reads true |

---

## 7. Won't-have (v1, unchanged from the roadmap except layers)

*(Amended 2026-10-22, after cut 8: Drak decided that raster brushes go into v1.6, no pressure support, tip-level import of existing packs with `.abr` primary and PNG native, the SVG download becoming a mixed file. The first line below is struck for v1.6; the amendment with its decisions and cut table is section 9.)*

- ~~Freehand brush tools~~ (struck 2026-10-22; section 9)
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
- Cut 8 is help and the site: the Cartographia help section still describes the pre-pillar-3 map (an image with pins) and ends with "no layers"; r036 added the pack format and the save-file shapes, nothing else. Done at r038.
- Decided at cut 8 (r038): the help is quick-help depth and the site is the full guide (the roadmap's split); the section was rewritten rather than appended to, with time mode and the pack block kept; lines elsewhere in the help that the editor had made false were fixed in the same pass (no-undo in three places, no-version-history, the HTML-export line, the Templates map kind, the schema's missing `cartographia` slice), and one claim false in both the help and the site (a pin's link on a backlinks panel that does not exist) was corrected to what the component does; the index's lead sentence in `16_trunk` was one string and went in with a scope widening; the site content was written now and committed under `site/`, ahead of the live v1.5 site, to deploy with the v1.6 launch; the pass is "reads true", backed by a mechanical cross-check of every control name against the component in both directions and a headless probe of the rendered help and the routed site panels.
- Found at cut 8: a right-click in a drawing tool finishes the shape and switches to Select, and only Select's right-click returns to Pin; the forks had said "returns to Pin" from the hint strings. The help and the site say what the hook does.
- `shell.html` was declared on cut 2 and not touched; declare what changed, not what the sheet guessed. The `.map-image` rule already sized the svg. Cut 3 did change it (36 lines) and declared it.

---

## 9. Amendment: raster brushes (decided 2026-10-22, after cut 8)

**Why.** Reading the cut-8 Limitations paragraph ("no freehand brush"), Drak judged freehand with brush support "massively wanted" and, after the costs were laid out, put raster brushes into v1.6 (he wrote 1.9 first and corrected it to 1.6). The won't-have list's first line is struck (section 7). This is the second recorded scope change on the sheet, after layers.

**Decisions (Drak, 2026-10-22; every recommendation taken, item 4 by research):**

1. **Both halves in v1.6**, built stamps-and-import first: the tip model and importers with raster stamps (cuts 10-11), then raster layers and the paint engine (cuts 12-13). Committing both now lets the layer kind be designed for paint rather than retrofitted.
2. **Vector freehand is in** (cut 9): a Line drawn by dragging, sampled at a minimum spacing in canvas units, simplified on release (Douglas-Peucker), no per-point handles above a point count. A freehand coastline you can reshape later is what the vector side does and paint cannot.
3. **Two raster tip kinds**, detected on import: `alpha` (grayscale or white-on-transparent, what `.abr`, `.gbr`, and Procreate shapes are), rendered as an `<image>` tinted by the shape's Fill through an SVG filter so the palette still applies; and `color` (an RGBA PNG with color in it, what Wonderdraft-style asset packs are), shown as is. Neither takes Stroke or Width.
4. **Interoperability, by research** (what the tools accept today). Map tools take PNG and nothing else: Wonderdraft wants PNG sprites under `assets/<pack>/sprites/{symbols,mountains,trees}/<set>/` with an optional `.wonderdraft_symbols` JSON (name, pivot, radius, draw mode); Inkarnate takes PNG only, uploaded as Stamp, Texture, or Stroke Asset, Pro only, 500 cap; Dungeondraft packs are built from PNG folders. Art apps converge on `.abr`: Photoshop, Procreate, Clip Studio Paint 1.10.5+, Affinity, Fresco, Artstudio Pro, GIMP, and Krita import it, and all of the non-Adobe ones import tips only (Krita's docs: "only import a brush texture from abr file"); newer Photoshop versions' files fail silently in GIMP. Every other format is one app's own. **So: import** PNG (single files, a zip of PNGs, and a Wonderdraft asset folder zipped as is, reading its `.wonderdraft_symbols` for names), `.abr` v1/v2/v6 clean-room (tips and spacing; v7/v10 files from current Photoshop are tried, and refused with a pointer to a PNG export from the source app), `.gbr`/`.gih`, and Procreate `.brush`/`.brushset` (a zip whose `Shape.png` is the tip; JSZip is already vendored). Skip `.sut`, `.kpp`, `.afbrushes`, `.myb`. **Export** the Cartulary pack (the envelope with `image` stamps) plus a PNG zip in the Wonderdraft folder layout with its JSON, which also serves Inkarnate and Dungeondraft. Cartulary is the converter in the middle: anything in, PNG out. Writing `.abr` is possible later and unscheduled.
5. **Raster layers:** a layer gains `kind`, `vector` (the default, backfilled) or `raster`; a raster layer is one PNG at the canvas size, carried through the tree as an `<image>` so the renderer, the HTML export, and the download keep their shape. Stored like map images: a file in the image folder when one is connected, inline with the 1 MB warning otherwise. A canvas resize clips a raster layer, as shapes keep their coordinates.
6. **Paint resolution:** drawing units are the paint pixels, with raster layers capped at 4096 on the long side and scaled up to the canvas when it is bigger.
7. **Brush controls:** Brush tool with a tip (the imported alpha tips plus a built-in round and soft round), size and opacity as sliders, spacing from the tip, color from Fill; Eraser is the same with destination-out.
8. **Undo:** the one history, raster steps included (a step holds the changed layer's new PNG; unchanged layers share strings), capped by total bytes rather than by fifty steps.
9. **No pressure support** (not within any scope Drak will support currently; potentially in the future). **The SVG download becomes a mixed file** (raster layers and raster tips as `<image>` data URLs) rather than going away; he was willing to lose it and does not have to. The PNG download rasterizes everything as before.

**Data model deltas** (the rest of section 2 stands):

```
state.mapStamps[i]   kind          "svg" | "alpha" | "color"; absent means "svg" (the r036 body stamps)
                     image         PNG data URL, alpha and color kinds only; body absent
                     width, height tip pixel size, for the placement box's aspect
                     spacing       percent of width, from .abr / .gbr; default 25
layers[i]            kind          "vector" | "raster"; backfilled "vector"
                     image         raster only: a filename in folder mode, a data URL otherwise
shape (stamp)        stampId       may name an alpha or color tip; rendered as <image>, tinted when alpha
```

Pack envelope: a stamp entry carries `image` (PNG data URL), `kind`, and `spacing` in place of `body`. The raster sanitizer decodes the PNG through an `Image` (anything that will not decode is dropped and reported), re-encodes it through a canvas to strip metadata, and caps the tip at 1024 on the long side; on load as on import, as `ensureMapStamps` does for bodies. The tint is a `<filter>` per color in `<defs>` (`feFlood` the fill, `feComposite in2="SourceAlpha" operator="in"`), which rasterizes correctly in the download's canvas and in exported pages.

**Cuts** (one script each in `inlining/cuts/`, the same gate and replay procedure; the r-counter continues from r039):

| # | Cut | Declared scope | Browser check |
|---|---|---|---|
| 9 | Vector freehand: Line by drag, minimum sample spacing, Douglas-Peucker on release, no point handles above a count | `16_trunk`, `shell.html` if a cursor rule | Draw a coastline in one drag; move it; a short one still reshapes by its points |
| 10 | Raster tips: `kind`, `image`, `spacing` on stamps; PNG import (single, zip, Wonderdraft folder with its JSON); raster stamps as `<image>` with the tint filter; the panel and picker showing them; the raster sanitizer | `16_trunk`, `shell.html` | Import a PNG pack; stamp a color symbol and a tintable one; the view, the HTML export, and both downloads show both |
| 11 | Importers: `.abr` v1/v2/v6, `.gbr`/`.gih`, Procreate `.brush`/`.brushset`; export a pack as a PNG zip in the Wonderdraft layout | `16_trunk`, `12_trunk` (the world importer's redirect) | Import a real fantasy-map ABR and a Procreate brushset; export the pack as PNGs and drop them into Wonderdraft |
| 12 | Raster layers: `kind`, storage (folder file or inline), `migrate` backfill, the tree's `<image>`, the HTML export and the downloads carrying it, the size cap | `16_trunk`, `10_migrate`, `08_export-layer`, `12_trunk` | An old world loads with every layer `vector`; a raster layer survives save, reload, HTML export, SVG and PNG download |
| 13 | Paint engine: Brush and Eraser, tip choice, size and opacity sliders, spacing, dabs on the active raster layer (auto-created), snapshot undo with the byte cap | `16_trunk`, `shell.html` | Paint a coastline with a textured tip, erase part of it, undo past it, save, reload |
| 14 | Help and the site, again | `24_home-data`, `site/` | Reads true |

**Open at the amendment, decided at the cut:**

- Cut 9: the sample spacing and the simplification tolerance in units (a drag should land at thirty to sixty points, not hundreds); the point count above which a stroke has no per-point handles; whether freehand is its own button or Line's drag.
- Cut 10: the exact `alpha`/`color` detection (any non-gray pixel with alpha above a threshold means color); the placement box of a non-square tip (follows the tip's aspect at 120 units on the long side); whether an alpha tip with Fill None draws untinted or not at all.
- Cut 11: the Procreate brush name (a minimal binary-plist string lookup in `Brush.archive`, or the folder name); what an `.abr` v7/v10 file says when refused; the headless probe writes its own `.abr` v1/v2/v6 files, and a real pack (CC0 or CC BY) is Drak's check.
- Cut 12: the raster file's name in folder mode (`<map id>-<layer id>.png`); what the HTML export does with a folder raster file it cannot read (the drawing without it, as the download does for an image).
- Cut 13: the paint surface during a stroke (an offscreen canvas, the `<image>` updated per stroke); the snapshot's form in the history (the data URL string, shared by reference when unchanged); the byte cap (64 MB to start); the built-in round and soft round tips as code, not stored.
