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
- **Undo/redo covers the drawing only**, not pins and not the schema fields. Local to the editor session, not persisted.
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
```

`state.mapStamps` (new slice, backfilled empty): `[{ id, name, viewBox, body }]` where `body` is sanitized SVG inner markup. Built-in stamps are not stored.

---

## 3. Rendering

- The canvas is `<svg viewBox="0 0 {width} {height}">` in the slot the `<img>` occupies today, width 100%, zoomed by the same wrapper-width mechanism. Pin overlays are unchanged and position against the SVG's rect, which is the image's rect when an image exists (viewBox equals its natural size) and the drawing's own aspect otherwise.
- Order inside the SVG: background rect (and grain filter) when no image; `<image>` when there is one; `<defs>` with the stamp symbols in use; one `<g>` per layer in order, hidden layers omitted; nothing else. Pins are HTML, above the SVG, as today.
- Smoothing: a polygon or stroke with `smooth` renders as a path through the midpoints of consecutive segments with the vertices as control points (quadratic), closed for polygons.
- Text uses `font-family: 'Cormorant Garamond', serif`. In-app it renders with the loaded font; the exported HTML falls back to the viewer's serif unless the export embeds fonts, which it does not today. Accepted for v1.
- Grain is an `feTurbulence` plus `feColorMatrix` filter at low opacity over the background rect. Off when `grain` is 0.

---

## 4. Stamp packs

Envelope `{ "cartulary_mapstamp_pack": 1, "name": ..., "stamps": [{ id, name, viewBox, body }] }`, single JSON, the same shape of thing as a template pack. Import opens the Skip / Replace / Rename collision modal that Templates and Packs use, keyed on stamp id. Export writes the world's imported stamps back out in the same envelope.

**Sanitizer, on import, not on render.** Imported `body` markup is parsed and rebuilt from an allowlist: elements `g path circle ellipse rect polygon polyline line`; attributes `d points cx cy r rx ry x y x1 y1 x2 y2 width height fill stroke stroke-width stroke-linecap stroke-linejoin opacity transform`. Everything else is dropped: scripts, event handlers, `href`, `foreignObject`, `style`, `use`. A stamp pack is the first third-party content Cartulary renders as markup, in-app and into exported HTML that other people open, so the HTML export trust model (hardened against user-content hrefs) extends to it. Rejected content is reported at import, not silently removed.

---

## 5. Exports

- **HTML export:** `renderMapHtml` emits the drawing SVG (string serializer) in place of, or under, the image; pin overlay and legend unchanged. Hidden layers are omitted.
- **Markdown export:** unchanged; markdown never embedded the canvas.
- **Per-map download:** SVG (the serialized drawing with the image inlined when present) and PNG (the SVG drawn to a canvas at 2x). These are the only image exports; nothing beyond SVG/PNG, per the won't-have list.

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

- Default canvas size presets beyond 1600 x 1000 (portrait, square) and whether the creation flow asks.
- Selection handles for scale and rotate on stamps and text: corner handles versus a numeric panel. Cut 5.
- Whether PNG export rasterizes at 2x or lets the user choose. Cut 7.
- Canvas size for image maps. Section 2 says width and height equal the image's natural pixels when an image exists, but `migrate` cannot decode an image (it may live behind a folder handle), so r031 backfills 1600 x 1000 on every record, image or not. Decided at cut 2 (r032): the renderer takes the viewBox from the loaded image's natural size when an image exists and from the stored size otherwise; the editor writes the natural size into the drawing the first time an image loads while the drawing is still empty (so removing the image later keeps the shapes' units), and never once the drawing has content. Setting an image on a map that already has shapes leaves the stored size alone; the shapes then render in the image's units, which is the accepted v1 edge. Found at r031 by the fixture probe.
- Pointer events on the canvas. Decided at cut 3 (r033): Pin is a tool in the strip and the default; under it the svg keeps `pointer-events: none` and pin clicks reach the canvas div as before. The drawing tools put pointer events on the svg (`.draw-mode`) and make pins inert; Select takes its events on the editor's overlay svg, which carries an invisible 14-pixel non-scaling hit copy of every selectable shape and the point handles of the selected polygon or line. Right-click steps back: a drawing tool finishes its shape and goes to Select with it selected, Select goes to Pin.
- Canvas size presets. Decided at cut 3 (r033), revising the proposal: the picker (Landscape 1600 x 1000, Portrait 1000 x 1600, Square 1200 x 1200) sits on every image-less map, not only an empty one, and asks before changing a canvas that has shapes or pins; nothing is transformed on accept (shapes keep their coordinates and are cut off beyond the new edges, pins keep their 0-1 positions). Image maps have no picker.
- Resize handles for rect and ellipse: still cut 5, with the stamp and text handles; r033 shipped point handles for polygons and lines because Drak asked at review and they share the overlay mechanism.
- `shell.html` was declared on cut 2 and not touched; declare what changed, not what the sheet guessed. The `.map-image` rule already sized the svg. Cut 3 did change it (36 lines) and declared it.
