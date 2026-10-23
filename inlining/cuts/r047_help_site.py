"""r047: help and the site, again (Cartographia+ cut 17, the last of the amendment).

The in-app help's Cartographia topic, written at r038 for an editor of eight
tools, split into three topics that describe the editor as it stands after
cut 16: "Cartographia" (the index, the map, pins, the view, time mode, the
downloads, limitations), "Map Editor" (the strip and Arrange, the thirteen
tools with their letters, style, painting, layers, undo, the view, keys and
pointers), and "Stamps & Brushes" (the panel, every import route, tips and
symbols, the pickers, the pack file, the exports). Time mode's text is lifted
verbatim from the old topic. The JSON schema topic gains the raster layer,
the region shape, the width range, and the raster tip, each as its own
example block. Lines elsewhere that the amendment made false or incomplete
are fixed in the same pass: Accessibility (a map-editor line on each side),
Images and How Big Can My World Get? (where a painted layer lives and what it
weighs), Views & Pages, and Save & Share's HTML export line.

The site: cartulary.world's Cartographia panel becomes a hub with two
sub-panels (The editor, Stamps and brushes) on the Timelines and Ephemeris
pattern, the router learns the two routes, the tile says what the page
covers, the Import & Export panel's stamp entry becomes "Stamps and brushes"
and its download entry names painted layers, the JSON Structure panel gains
the same shapes as the help, and the Colophon's accessibility paragraph
says what the map editor now does from the keyboard.

Decided at the fork (Drak, 2026-10-22): every recommendation (three help
topics; sub-tiles on the site; prose per tool plus a keys-and-pointers
section; user-level importer text with one sentence on coverage; a Painting
section; the Limitations paragraph kept and rewritten; separate raster
example blocks in the schema; every stray one-liner fixed; a scratchpad
cross-check before staging; the two build strings in 16_trunk left alone).

Declared scope: 24_home-data, site/helloworld.html.

String-anchored edits; every anchor must occur exactly once. Run from the
repository root against the r046 tree: python3 inlining/cuts/r047_help_site.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
MOD = ROOT / "cartulary-src" / "modules"
HELP = MOD / "24_home-data.jsx"
SITE = ROOT / "site" / "helloworld.html"


def edit(path, pairs):
    s = path.read_text(encoding="utf-8")
    for old, new in pairs:
        c = s.count(old)
        assert c == 1, f"{path.name}: anchor occurs {c} times: {old[:80]!r}"
        s = s.replace(old, new)
    path.write_text(s, encoding="utf-8")


def span(path, start, end):
    """The text from the start marker through the end marker, both exactly once."""
    s = path.read_text(encoding="utf-8")
    assert s.count(start) == 1, f"{path.name}: start marker occurs {s.count(start)} times: {start[:60]!r}"
    assert s.count(end) == 1, f"{path.name}: end marker occurs {s.count(end)} times: {end[:60]!r}"
    i = s.index(start)
    j = s.index(end) + len(end)
    assert i < j, f"{path.name}: markers out of order"
    return s[i:j]


def replace_span(path, start, end, new):
    s = path.read_text(encoding="utf-8")
    old = span(path, start, end)
    path.write_text(s.replace(old, new), encoding="utf-8")


# ─── 24_home-data: the three topics ───────────────────────────────────────────

HELP_START = """  { id: "cartographia", title: "Cartographia", content: `Maps in Cartulary are canvases:"""
HELP_END = """If you need a virtual tabletop experience, this isn't that.` },"""
TIME_START = "**Time mode (chronicles).**"
TIME_END = "Permanent flags alone don't make the button appear, since there's nothing to scrub through."

HELP_CARTOGRAPHIA = r"""  { id: "cartographia", title: "Cartographia", content: `Maps in Cartulary are canvases: an image you bring, a blank sheet, or both, with a drawing on it (shapes, labels, stamps, and painted layers, in a layer stack) and clickable pins over it. Pins tie places to entries; the drawing is the map itself. Regional maps, dungeon layouts, star charts, floor plans, anything where points of interest cross-reference other entries. **Cartographia** is the sidebar view that indexes every map in the world, with the world's stamps and brushes in a panel above the list. This topic covers maps, pins, time mode, and the downloads; the drawing and painting tools are under **Map Editor**, and stamp packs and brush imports under **Stamps & Brushes**.

**The index.** Click Cartographia in the sidebar for the map list, most recently updated first: the name, the pin count, "no image" for a blank canvas, the last update, a preview of the Description, and the tags. Click a row to open the map; Delete on the row removes the map with its drawing and its pins (the entries the pins linked to are untouched). Maps are their own records, not template entries: there is no map template and no map kind in the Template Builder, and every map carries the same three fields, Description, Scope / Region, and Notes. A world saved by v1.5 is migrated on load: each map entry becomes a map record, the map-kind templates are dropped, and any extra fields a custom map template had are kept in the record (not shown) with a line in Notes naming them.

**Creating a map.** Click **+ New Map**. The editor shows the name and tags, the canvas, then the three fields; **Save** needs a name, and **Cancel** discards the draft (in folder mode it also puts back any layer files the session wrote). **Edit** on a saved map brings the editor back. **Set Image** brings an image in: with an image folder connected the file stays on disk and only its name is saved, otherwise it embeds in the save file, with a confirmation for anything over 1 MB. **Change Image** swaps the image and keeps the drawing and the pins; **Remove Image** clears it and leaves them on the canvas. An image map's canvas is the image's own size. Without an image the canvas is a blank vellum sheet, and a **Canvas** picker in the strip offers Landscape 1600 × 1000, Portrait 1000 × 1600, Square 1200 × 1200, or **Custom…** (whole units, 100 to 10000 a side; type the size, then **Set** or Enter). Changing the size of a map that already has work on it asks first, because nothing is transformed: shapes keep their coordinates and anything past the new edges is cut off, a painted layer is clipped, and pins keep their relative positions and shift against the drawing. Undo restores it. Sizes are drawing units, not screen pixels.

**Pins.** Pin is the editor's default tool: click the map to add a pin, click a pin to edit it, drag a pin to move it, with a mouse, a pen, or a finger. A selected pin shows its editor below the canvas: Label (its first letter is the marker), Linked Entry (any entry in the world, or an Astronomical Body), Always visible (for time mode), Color, Notes, and Delete Pin; Done closes it. Pins are stored as fractions of the canvas, not pixels, so they stay on the same spot at any size and zoom. A linked pin is an edge in Concordance, from the map to the entry; in the map's view, clicking a linked pin opens the entry (a drag pans the map instead), and a pin whose entry was deleted says so. Pins go through undo like everything else and are left out of the SVG and PNG downloads.

**Looking at a map.** In a map's view the canvas pans when you drag it, and zooms with Ctrl+scroll (Cmd+scroll on a Mac), a pinch, the − and + buttons in the canvas's corner, or the keys + and −; 0 or the corner's **Fit** shows the whole canvas, which is as far out as it goes, and the range runs to 8x. Drag the canvas's bottom-right corner to resize the box on the page, from 25% to 150% of the column (past 100% it grows from the center); double-click the corner to snap back. Neither the zoom nor the size persists. The editor has the same controls and a Pan tool besides; see Map Editor.

**Map fields.** Every map carries the same three fields (Description, Scope / Region, Notes) above its canvas. Custom per-map field sets are not part of v1.6; maps are a uniform record type.

@@TIME_MODE@@

**Downloading a map.** In a map's view (not the editor), a **Download** row above the canvas writes the saved map as a file named after the map. **SVG** is the map as a standalone file: the drawing with the image and every painted layer inlined when they can be read, the stamps and tips it uses resolved into the file (each once), hidden layers left out, the map font embedded when it can be fetched, and no pins (pins are app data with their own renderer). **PNG** is the same drawn at twice the canvas size, scaled down to fit sixteen million pixels when the canvas is huge. A note beside the buttons says what was written, and says so when the image or a painted layer could not be read (a folder file with no folder connected): the file then has the rest of the drawing. The world's HTML export draws every map through the same renderer, image, drawing, painted layers, and pins together.

**Limitations.** No pen pressure: a stroke is the width you set however hard you press. No colors beyond the palette of eight for shapes, labels, and paint (a stamp pack can carry its own colors, and a color tip paints as it is). No grid or snapping beyond the rotation knob's Shift snap, no fog of war, no measurement or scale tools, no layer opacity or blend modes, and no placing a shape or a stroke from the keyboard. Cartulary's map support is reference-grade, not VTT-grade: a drawn, painted, or imported map with clickable, cross-referenced, time-aware pins. If you need a virtual tabletop experience, this isn't that.` },

  { id: "map-editor", title: "Map Editor", content: `The map editor opens from **+ New Map** or **Edit** on a map. Above the canvas sit the image buttons and the hint, a fixed two-line space that says what the active tool does, or why it can't when the active layer is hidden, locked, or the wrong kind; then the strip: the tools, the canvas controls, and the style of the next shape or the selected one. Everything here works with a mouse, a pen, or a finger, and most of it from the keyboard too. Save and Cancel are the map's own buttons; the drawing is saved with the map.

**The strip.** The strip is built from named groups laid out in rows. As shipped: row one, the thirteen **tools**; row two, the **Canvas** picker (image-less maps only), **Undo** and **Redo**, **Layers** with the **Layer** select naming the layer new shapes go to, and **Arrange…**; row three, the **Fill** and **Stroke** swatches, **Width**, **Smooth**, and the active tool's own controls (the point count with **Done** and **Cancel** while a polygon or line is open; tip, size, and opacity for the Brush and Eraser; the stamp picks; a label's text, size, and arc; the angle of a label or stamp; the selected shape's layer; **Delete shape**). Groups that don't apply to the current tool or selection dim rather than disappear, so nothing moves under the pointer when the tool changes. **Arrange…** opens a modal where every group can be moved earlier or later, a "new row" checkbox starts a row before any group but the first, and the tool buttons can be reordered; each change lands in the strip behind the modal at once, **Reset** restores the shipped layout, and the layout is kept in this browser with the theme and the font size, not in the world file.

**The tools.** Each has a letter that selects it when no text field has focus, shown in its button's tooltip with the hint. In the shipped order:

- **Pin (N)**, the default: click the map to add a pin, click a pin to edit it, drag a pin to move it. The drawing is inert under this tool.
- **Select (V)**: click a shape to select it, drag it to move it, drag a point (polygon, line) or a corner (rectangle, ellipse, stamp) to reshape it, drag the knob above a label or a stamp to turn it (Shift snaps to 15°); the arrow keys nudge it by one unit, ten with Shift; Delete or Backspace removes it; Esc clears the selection; a right-click returns to Pin. A stamp keeps its proportions, nothing goes under 8 units, a line or polygon with more than forty points moves as a whole, and a filled region (from the Fill tool) has no handles. Shapes on hidden or locked layers can't be selected.
- **Rect (R)** and **Ellipse (E)**: drag. A drag under two units in either direction places nothing.
- **Polygon (P)**: click the corners of a closed, filled area. The first corner, a double-click, Enter, **Done** in the strip (from three points), or a right-click closes it; Esc or **Cancel** discards it.
- **Line (L)**: click the points of an open line. A double-click, Enter, **Done** (from two points), or a right-click finishes it; Esc or **Cancel** discards it.
- **Freehand (F)**: drag to draw a line in one motion. On release the line is simplified to the points it needs (a long coastline lands at a few dozen), it keeps **Smooth** on, and the tool stays so the next drag starts at once. Esc while dragging discards it. A freehand line of forty points or fewer reshapes by its points in Select; a longer one moves as a whole.
- **Fill (G)**: click inside an enclosed area to fill it with the Fill color. The drawing as it stands is traced, so lines, shapes, the image, and painted layers all bound the fill; small gaps in the outline close on their own, and the fill lands just under the lines around it, above the topmost filled shape under the click in the active layer. A click too close to a line is refused with a note, as is an area too narrow to fill. The result is a region shape: selectable, movable, restyled by the swatches (it lands with no stroke; give it one in Select), with **Smooth** off because a traced edge is already true.
- **Text (T)**: click to place a label; the strip's text field takes focus so typing replaces "Label", and Enter or Esc leaves the field. Size (24, 36, 56), **Arc** (a slider from −180° to 180°; right arches it up, left bends it down; **Straight** flattens it), and **Angle** (−15 and +15 buttons, or a typed value) are in the strip. A label is Ink until the Fill swatches restyle it.
- **Stamp (S)**: pick a symbol in the strip (the four built-ins are always there; **More…** opens every stamp in the world, with a filter), then click to place it 120 units across or drag to size it. An svg symbol places square; a raster tip keeps its own proportions. The placed stamp is selected, so the angle controls and the handles apply to it at once.
- **Brush (B)** and **Eraser (X)**: paint on and erase from a raster layer; see Painting below.
- **Pan (H)**: drag to move the view; see The view below.

In any drawing tool a right-click finishes the shape in progress and switches to Select with it selected; in Select a right-click returns to Pin. Esc discards a shape or a stroke in progress before it clears a selection.

**Style.** **Fill** and **Stroke** come from a fixed palette of eight (Ink, Sepia, Parchment, Forest, Water, Stone, Blood, Chalk) plus None, each swatch named for a screen reader; **Width** is a slider from 1 to 32 drawing units with a number field that goes to 64; **Smooth** rounds a rectangle's corners and curves a polygon, line, or region through its points. New shapes start with a stone fill, a sepia stroke, width 4, and Smooth on. With nothing selected the controls set the style for the next shape; with a shape selected they restyle it, and that becomes the default too. A line has no fill, a bucket fill has no stroke until you give it one, a stamp has no width (its line weight is the symbol's own), and the Brush's color is the Fill swatch (Ink when Fill is None).

**Painting.** A map's layers are vector (shapes) or raster (one bitmap). **Brush** paints on the active raster layer; with a vector layer active, the first stroke makes a raster layer named Paint just above it, which becomes the active layer. **Eraser** erases from the active raster layer and never makes one. The tool's controls sit in the strip: the **Tip** (the built-in Round and Soft round, plus any tintable tip the world's packs brought in; **More…** opens them all, with Import), the **Size** in drawing units (a slider from 4 to 256, a field to 1024; the ring on the canvas shows it), and the **Opacity** (5% to 100%; one stroke is flat at that strength however many times it crosses itself, and strokes over each other add up). The Brush paints in the Fill color; the Eraser's opacity is how much one stroke takes away. A pen's eraser end erases with the Eraser's settings from any drawing tool, and the tool stays. There is no pressure: a stroke is the tip at the size you set.

A painted layer's bitmap is a PNG at the canvas's size, capped at 4096 pixels on the long side; a loaded image keeps its own format and size under the same cap. Where it lives follows the map image: with an image folder connected, each painted or loaded layer is a file in the folder named after the map and the layer (\`map-a3f2c1-layer-b7c9d2.png\`), rewritten by every stroke and by undo; without one, it embeds in the save file, with a warning past 1 MB when you load an image and a hard stop at 48 MB. Cancel on the map puts the folder back to what it held when the editor opened; Save leaves the files as they are. In **Layers**, **+ Add raster layer** makes an empty one, **Load image…** fills it with a PNG, JPEG, or WebP scaled to cover the canvas width (what runs past the bottom is clipped; a JPEG stays a JPEG unless the cap resizes it), and **Clear** empties it. The shape tools don't draw on a raster layer and the paint tools don't paint on a vector one; the hint says which layer to pick. Painted layers travel with the map into the HTML export and the downloads.

**Layers.** **Layers** in the strip opens the layer list, top of the stack first, one row per layer with its shape count (a raster layer shows "image", "empty", or "file missing" instead). Pick the active layer (new shapes and strokes go there; the strip's **Layer** select does the same, marking raster, hidden, and locked layers), rename it in place, **Hide** it (a hidden layer stays out of the HTML export and the downloads too), **Lock** it (nothing on it can be selected, drawn, or painted), move it up or down, delete it (asks when it has shapes or an image; undo brings it back; the last layer stays), or add one on top with **+ Add layer** or **+ Add raster layer**. Every map starts with one vector layer named Drawing. A hidden or locked active layer refuses to draw, and the hint says so rather than drawing somewhere else. A selected shape can be moved between vector layers from the strip when the map has more than one.

**Undo and redo.** **Undo** and **Redo** in the strip, or Ctrl+Z and Ctrl+Shift+Z (Ctrl+Y also redoes), step through the last fifty changes, one step per gesture: a drag of any length, a run of typing in one field, a run of arrow nudges, or one paint stroke undoes in one go. Pins and layer changes are included. Painted bitmaps are kept for undo up to 64 MB across the history, the oldest steps dropped first when they pass it; in folder mode undo rewrites the layer's file. The history belongs to the editing session and is gone once you Save or Cancel. The rest of Cartulary still has no undo.

**The view.** The canvas is a camera over the drawing. Ctrl+scroll (Cmd+scroll on a Mac) zooms about the pointer, a pinch does the same, the bar in the canvas's corner has − and + buttons, the zoom, and **Fit**, and the keys + and − zoom while 0 fits. The range is Fit (the whole canvas) to 8x, in steps of 1.25; nothing goes below Fit. To pan, use the **Pan** tool, hold Space and drag from any tool, drag with the middle button, or drag with two fingers; two fingers anywhere also pinch, and cancel whatever one finger was doing. The zoom and the keys wait while a stroke, a shape, or a drag is in progress. The grip at the canvas's bottom-right corner sets the box's width on the page, 25% to 150% of the column (past 100% it grows from the center; the bar says "NN% wide" when it isn't 100%); double-click it to snap back. The zoom lives inside the box, handles and pins keep their screen size at any zoom, and nothing here is stored: a map opens at Fit.

**Keys and pointers.** Letters select tools (above) when no field has focus. Otherwise:

- **Arrows** nudge the selected shape by a unit; **Shift+arrows** by ten.
- **Delete** or **Backspace** removes the selected shape; **Esc** discards a stroke or shape in progress, then clears the selection; **Enter** finishes a polygon or line.
- **Ctrl+Z**, **Ctrl+Shift+Z**, **Ctrl+Y**: undo and redo.
- **+**, **−**, **0**: zoom in, zoom out, fit. **Ctrl+scroll** zooms about the pointer. **Space** held turns any drag into a pan; so does the **middle button**.
- **Right-click**: finishes the shape in progress and goes to Select; in Select, goes to Pin. The browser's menu never opens on the canvas.
- **Pen**: draws, paints, selects, and drags like a mouse, without pressure; its eraser end erases.
- **Touch**: one finger does what the tool does (in Pan, it pans); two fingers pinch and pan from any tool and cancel the one-finger gesture they land on; a long press mid-stroke is not a right-click. In a map's view (not the editor), a finger's up-and-down swipe scrolls the page and a sideways drag pans the map.
- **Screen readers**: every swatch is named ("Fill: Water"), every tool button says its letter and what it does, and a live region names the tool and the selected shape ("Rectangle, 200 by 100"). The canvas itself is a drawing surface and can't be driven from the keyboard.` },

  { id: "map-stamps", title: "Stamps & Brushes", content: `A stamp is a symbol the map editor's **Stamp** tool places and sizes; a tintable stamp is also a tip the **Brush** paints with. Four symbols are built in (mountain, tree, settlement, compass rose) and two tips (Round, Soft round); everything else comes in through the **Stamps** panel at the top of the Cartographia index, or through **Import pack or brushes** inside the editor's stamp and tip pickers. Stamps are world data: they travel in the world's .json and are listed under JSON Save File Schema.

**The panel.** The Stamps panel lists every imported stamp grouped by pack, with a preview (a tip's tooltip gives its kind and pixel size), and offers **+ Import pack or brushes**, **Export built-ins as a pack** (a correct pack file with the four symbols, to start your own from), **Built-ins as PNG zip**, and on each pack **Export**, **PNG zip**, and **Delete pack**, with × on each stamp. Deleting asks first and, when the stamps are placed on maps, says how many placements will go missing.

**What imports.** One button reads them all; pick one file or several of one kind:

- A Cartulary pack, a .json holding svg symbols, PNG tips, or both (the format is below).
- PNG files, as a pack named Imported stamps (you can rename it in the report). A PNG with any transparency uses its alpha as the shape; a fully opaque one is read as a mask with black as ink. Any colored pixel makes it a color stamp, placed as it is; without one it is a tintable tip, drawn in the map's Fill color.
- A zip: every folder of PNGs inside becomes a pack named after the folder, and a Wonderdraft \`.wonderdraft_symbols\` file beside them supplies the names and whether each is tinted (\`custom_colors\`) or placed as is (\`normal\`). Every .abr, .brush, and .brushset inside is its own pack, and .gbr and .gih files make a pack per folder, so a brush set's download zip imports as it came.
- A Photoshop .abr: every sampled tip, with its name and spacing where the file records them. Versions 1, 2, and 6 read whole; 7 and 10 read where their layout matches. A computed brush has no bitmap and is skipped with a note, and a file with no sampled tip is refused with what it found.
- GIMP brushes: a .gbr is one tip, a .gih is one tip per cell. A color brush imports as a color stamp.
- Procreate .brush and .brushset files: each brush's Shape.png is the tip, read by brightness (white is the shape), and Grain.png is ignored; the name comes from the brush's own archive, else its folder, and a brushset is named from its plist.

Tips are scaled down to 1024 pixels on the long side (the report says when), capped at 4 MB each, and a pack holds at most 500 stamps. An import with nothing to report lands at once with a flash; otherwise a report shows first, with the pack's name (editable for brush and PNG imports), what will import and what it replaces, what changed, what was dropped and why, and Cancel; a zip of several packs steps through them with Skip. A brush or image file handed to World settings' Import .json is refused with a pointer back here.

**Tips and symbols.** An svg symbol takes the map's Fill and Stroke like any shape. A tintable tip (the pack file calls it \`alpha\`) is drawn in the Fill color, Ink when Fill is None, and is what the Brush paints with; a color stamp (\`color\`) is placed as it is and never paints. A raster stamp's placement box keeps the tip's proportions at 120 units on its long side; an svg symbol's is square. A used tip goes into a map's file once, however many times it is placed.

**The pickers.** **More…** in the strip opens every stamp in the world (or, for the Brush and Eraser, every tip), grouped by pack with the built-ins first: type to filter by name or pack name, with a count; a click arms the stamp (and swaps the selected stamp's symbol, which is also how a missing one is re-pointed); Escape clears the filter, then closes. **Import pack or brushes** at the bottom imports without leaving the editor.

**A pack file.** A pack looks like this:

\`\`\`
{
  "cartulary_mapstamp_pack": 1,
  "id":     "forest",                   // optional; lower-case letters, digits, underscore, dash. Defaults to a slug of the name
  "name":   "Forest",
  "stamps": [
    {                                   // an svg symbol
      "id":      "pine",                // required; same characters as the pack id
      "name":    "Pine",
      "viewBox": "0 0 64 64",           // the box the body is drawn in
      "body":    "<path d=\\"M32 4 L19 26 L45 26 Z\\" stroke-width=\\"3\\"/><path d=\\"M29 58 V63 H35 V58\\" fill=\\"none\\"/>"
    },
    {                                   // a raster tip
      "id":      "moss",
      "name":    "Moss",
      "kind":    "alpha",               // alpha: tinted by the map's Fill, and a Brush tip; color: placed as it is
      "image":   "data:image/png;base64,...",   // a PNG, at most 1024 pixels on the long side and 4 MB
      "width":   256,                   // pixels
      "height":  256,
      "spacing": 25                     // the gap between dabs when it paints, as a percentage of the size
    },
    ...
  ]
}
\`\`\`

The \`body\` is SVG inner markup. Parts with no \`fill\` or \`stroke\` of their own take the colors the map gives the stamp, so leave those off wherever the stamp should follow the palette, and put \`fill="none"\` on parts that must stay hollow. Line weight is the stamp's own and scales with it. A body holds at most 200 KB. A raster entry's \`image\` is decoded and re-encoded on import (any colored pixel makes it \`color\` whatever \`kind\` says) and only checked for its shape on load, never decoded there.

Only these elements survive import: \`g\`, \`path\`, \`circle\`, \`ellipse\`, \`rect\`, \`polygon\`, \`polyline\`, \`line\`. Only these attributes: \`d\`, \`points\`, \`cx\`, \`cy\`, \`r\`, \`rx\`, \`ry\`, \`x\`, \`y\`, \`x1\`, \`y1\`, \`x2\`, \`y2\`, \`width\`, \`height\`, \`fill\`, \`fill-rule\`, \`fill-opacity\`, \`stroke\`, \`stroke-width\`, \`stroke-linecap\`, \`stroke-linejoin\`, \`stroke-dasharray\`, \`stroke-opacity\`, \`stroke-miterlimit\`, \`opacity\`, \`transform\`; values are plain numbers, path data, transforms, and colors, never \`url(...)\`. Everything else (scripts, event handlers, \`style\`, \`href\`, text, images, \`use\`) is removed, on import and again whenever the world loads, and the import shows what it removed before anything lands. Stamp ids are namespaced by the pack (\`forest__pine\`; pack and stamp ids are at most forty characters each), so two packs can each have a \`tree\` and neither touches the built-in one; re-importing a pack replaces its own stamps in place, and every placed stamp keeps pointing at the right symbol. Deleting a stamp that is placed on a map leaves a dashed box in the editor, and the strip names the missing stamp, until a pack with it is imported again or another symbol is picked for it.

**Exports.** **Export** on a pack writes it back out as a \`.cartulary-stamps.json\` with its own ids, so a re-import replaces its own stamps. **PNG zip** writes it as PNGs in the Wonderdraft folder layout (\`<pack>/sprites/symbols/<pack>/\` with a \`.wonderdraft_symbols\` beside them), svg symbols rasterized at 512 pixels white on transparent, so the zip unpacks into Wonderdraft's assets folder and Inkarnate and Dungeondraft take the PNGs inside. The built-ins export both ways too.` },"""


# ─── 24_home-data: the JSON schema ────────────────────────────────────────────

SCHEMA_START = "**\\`mapData\\` (on cartographia map records):**"
SCHEMA_END = "cannot bring in markup the import would have refused."

SCHEMA_NEW = r"""**\`mapData\` (on cartographia map records):**

\`\`\`
{
  "image": string | null,                      // filename or data URL, like an image field
  "pins":  [
    {
      "id":        string,                     // e.g. "pin-a3f2c1"
      "x":         number,                     // 0..1, fraction of canvas width
      "y":         number,                     // 0..1, fraction of canvas height
      "label":     string,
      "entryId":   string | null,              // optional cross-reference to another entry
      "color":     string | null,              // hex override, otherwise inherit pin color
      "notes":     string,
      "permanent": boolean                     // optional; default false. true = always visible in time mode
    },
    ...
  ],
  "drawing": {                                 // v1.6, the drawing under the pins
    "width":  number,                          // canvas units; with an image, its natural pixel size
    "height": number,
    "background": { "fill": hex, "grain": number },   // grain 0..1; not drawn under an image
    "layers": [
      { "id": string, "name": string, "visible": boolean, "locked": boolean, "kind": "vector", "shapes": [ ...shapes ] },
      ...
    ]
  }
}
\`\`\`

A raster layer (v1.6, painted with the Brush or filled by Load image) holds one bitmap instead of shapes:

\`\`\`
{
  "id":      string,
  "name":    string,                           // "Paint" when the Brush made it
  "visible": boolean,
  "locked":  boolean,
  "kind":    "raster",
  "image":   string | null,                    // a filename in the image folder ("<map id>-<layer id>.png") or a PNG, JPEG, or WebP data URL; null when empty
  "width":   number,                           // the canvas units the bitmap covers; a canvas resize clips it
  "height":  number,
  "shapes":  []
}
\`\`\`

Each shape carries \`id\`, \`type\` (\`rect\`, \`ellipse\`, \`polygon\`, \`stroke\`, \`region\`, \`text\`, or \`stamp\`), \`fill\` and \`stroke\` (hex or null), and \`strokeWidth\` (1 to 64), then by type: \`x\`, \`y\`, \`w\`, \`h\` for rect, ellipse, and stamp; \`points\` ([[x, y], ...]) for polygon and stroke; \`rings\` ([[[x, y], ...], ...], drawn even-odd, so a ring inside another is a hole) for region, which the Fill tool makes; \`smooth\` for rect, polygon, stroke, and region; \`text\`, \`fontSize\` (24, 36, or 56), \`rotation\`, and \`arc\` (degrees, -180..180) for text; \`stampId\` and \`rotation\` for stamp. Layers draw in array order, so the last one is on top; a layer without \`kind\` is vector. A malformed drawing is coerced on load rather than refused: a shape that can't be rendered is dropped, and a raster layer whose image fails the check loads empty.

The canvas size shown in the UI (\`sizePct\`) and the zoom are session UI state and **not** persisted in the save file.

**\`mapStamps\` array (v1.6), stamps imported from packs and brush files, world-scoped:**

\`\`\`
[
  {                                            // an svg symbol
    "id":      string,                         // namespaced by pack: "<packId>__<stamp id>"
    "name":    string,
    "kind":    "svg",
    "viewBox": string,                         // "minx miny width height"
    "body":    string,                         // sanitized SVG inner markup; see Stamps & Brushes
    "packId":  string,                         // the pack's slug; "" for a stamp from no pack
    "pack":    string                          // the pack's display name
  },
  {                                            // a raster tip
    "id":      string,
    "name":    string,
    "kind":    "alpha" | "color",              // alpha: tinted by the map's Fill, and a Brush tip; color: placed as it is
    "image":   string,                         // a PNG data URL, at most 1024 pixels on the long side and 4 MB
    "width":   number,                         // pixels
    "height":  number,
    "spacing": number,                         // the gap between dabs when it paints, percent of the size
    "packId":  string,
    "pack":    string
  },
  ...
]
\`\`\`

Built-in stamps and tips are never stored; a map's stamp shape references a built-in by id (\`mountain\`, \`tree\`, \`settlement\`, \`compass\`). Every svg body is run through the sanitizer again on load, and every tip image is checked for its shape (a PNG data URL under the cap) and never decoded there, so editing this array by hand cannot bring in markup the import would have refused."""


# ─── 24_home-data: the stray lines ────────────────────────────────────────────

HELP_LINES = [
    # Views & Pages
    ("Indexes every map in the world. Click a map to open it (canvas, drawing, pins, time-mode chronicle filtering); use + New Map to create one.",
     "Indexes every map in the world, with the world's stamps and brushes above the list. Click a map to open it (canvas, drawing and painted layers, pins, time-mode chronicle filtering); use + New Map to create one."),
    # Save & Share, the HTML export line
    ("maps render as they do in the app (image, drawing, and pins)",
     "maps render as they do in the app (image, drawing, painted layers, and pins)"),
    # Accessibility: what's missing, after the Chronometric/Stemma line
    ("- **Chronometric and Stemma pan/zoom are mouse-only.** Both views use Ctrl+scroll (or Cmd+scroll on Mac) for zoom; Chronometric also uses drag-to-pan. No keyboard equivalents.\n",
     "- **Chronometric and Stemma pan/zoom are mouse-only.** Both views use Ctrl+scroll (or Cmd+scroll on Mac) for zoom; Chronometric also uses drag-to-pan. No keyboard equivalents.\n"
     "- **A map's drawing needs a pointer.** The map editor's canvas takes a mouse, a pen, or a finger; a shape, a paint stroke, or a pin can't be placed from the keyboard, and the canvas isn't navigable by a screen reader. The controls around it are (see below).\n"),
    # Accessibility: what works, after the keyboard navigation line
    ("- **Keyboard navigation** for most operations: Tab moves focus, Enter activates, Escape closes modals. Form fields are reachable.\n",
     "- **Keyboard navigation** for most operations: Tab moves focus, Enter activates, Escape closes modals. Form fields are reachable.\n"
     "- **The map editor from the keyboard.** One letter per tool (each tool button's tooltip shows it), the arrow keys nudge the selected shape, + − 0 zoom and fit, Space turns a drag into a pan, Ctrl+Z undoes, every color swatch carries its name (\"Fill: Water\"), and a live region names the tool and the selected shape for a screen reader. See Map Editor, Keys and pointers.\n"),
    # Images: where a painted layer lives
    ("Cartulary detects what your browser supports automatically; if folder mode isn't available, image fields fall back to inline mode without you needing to do anything.",
     "Cartulary detects what your browser supports automatically; if folder mode isn't available, image fields fall back to inline mode without you needing to do anything.\n\n"
     "A map's painted or loaded layers follow the same two modes: in folder mode each layer's bitmap is a PNG in the image folder named after the map and the layer, rewritten as you paint; inline, it embeds in the save file. See Map Editor, Painting."),
    # Scaling: what a painted layer weighs
    ("**JSON file size.** No ceiling imposed by Cartulary",
     "**Painted map layers weigh more than shapes.** A painted layer is a PNG at the canvas's size, up to 4096 pixels on the long side (a loaded image keeps its own size under the same cap); inline, each one embeds in the save file (a warning past 1 MB on load, a hard stop at 48 MB per layer), and the editor keeps up to 64 MB of them for undo while a map is open. Folder mode keeps them as files beside your images, which is the right place for a map with more than a layer or two of paint.\n\n"
     "**JSON file size.** No ceiling imposed by Cartulary"),
]


# ─── site: the Cartographia panel ─────────────────────────────────────────────

SITE_PANEL_START = '<div class="panel" id="panel-cartographia" data-route="cartographia">'
SITE_PANEL_END = '</div><!-- /panel-cartographia -->'
SITE_TIME_START = "    <h3>Time mode</h3>"
SITE_TIME_END = "a range with only an end year is visible up to it.</p>"

SITE_PANEL_NEW = r"""<div class="panel" id="panel-cartographia" data-route="cartographia">
  <section>
    <div class="sub-tiles">
      <a class="tile" href="#cartographia-editor" data-route="cartographia-editor">
        <span class="t-title">The editor</span>
        <span class="t-sub">Tools, style, painting, layers, the view, keys</span>
      </a>
      <a class="tile" href="#cartographia-stamps" data-route="cartographia-stamps">
        <span class="t-title">Stamps and brushes</span>
        <span class="t-sub">Packs, brush imports, tips, exports</span>
      </a>
    </div>

    <div id="sub-cartographia-hub">
    <p class="section-kicker">Cartographia</p>
    <h2>Maps with meaning</h2>
    <p class="lead">Cartographia is the bound collection of maps. A map is a canvas: an image you bring, a blank sheet, or both, with a drawing on it (shapes, labels, stamps, and painted layers, in a layer stack) and clickable, draggable pins over it. Each pin can link to any other entry in the world, so maps are cross-referenced, time-aware, and part of the same graph as everything else: a pin that links to a city shows up in Concordance as an edge from the map to the city, and filters itself off the map when the story hasn't reached it yet. This page covers maps, pins, time mode, and the downloads; <a href="#cartographia-editor">The editor</a> covers drawing and painting, and <a href="#cartographia-stamps">Stamps and brushes</a> the packs and the brush imports.</p>

    <h3>The index</h3>
    <p>Click Cartographia in the sidebar and you land on the map index. A Stamps panel sits at the top (a world has far fewer stamp packs than maps, so it goes above the list; it's described under <a href="#cartographia-stamps">Stamps and brushes</a>), then every map in the world, sorted by most recently updated. Each row shows the map glyph ▣, the name, the pin count, "no image" when the map is a blank canvas, the last updated date, a preview of the Description, and any tags. Click a row to open the map. Delete from the row's Delete button, or from the map's own toolbar; the map, its drawing, and all its pins are removed, and entries the pins linked to are unaffected.</p>
    <p>Maps are their own records, not template entries: there is no map template and no map kind in the Template Builder. Every map carries the same three fields, Description, Scope / Region, and Notes. A world saved by v1.5 with map-kind templates is migrated on load: each map entry becomes a map record, the map-kind templates are dropped, and any extra fields a custom map template had are kept in the record but no longer shown, with a line in Notes naming them.</p>

    <h3>Creating a map</h3>
    <p>Click <strong>+ New Map</strong> at the top of the index. The editor opens with the name and tags at the top, the canvas, then the three fields; <strong>Save</strong> needs a name, <strong>Cancel</strong> discards (and, in folder mode, puts back any layer files the session wrote). Open a saved map and click <strong>Edit</strong> to come back to the editor.</p>
    <p><strong>Set Image</strong> in the canvas toolbar brings an image in: with an image folder connected, the file stays on disk and only its name is saved; without one, the image embeds as base64 in the save, with a warning for files over 1&nbsp;MB. An image map's canvas is the image's own size. <strong>Change Image</strong> swaps the image and keeps the drawing and the pins; <strong>Remove Image</strong> clears it and leaves them on the canvas.</p>
    <p>Without an image the canvas is a blank vellum sheet, and a <strong>Canvas</strong> picker appears in the strip: Landscape 1600&nbsp;×&nbsp;1000, Portrait 1000&nbsp;×&nbsp;1600, Square 1200&nbsp;×&nbsp;1200, or <strong>Custom…</strong>, which opens width and height fields (whole units, 100 to 10000 a side; anything outside is clamped) that you apply with <strong>Set</strong> or Enter. Changing the size of a map that already has shapes, paint, or pins asks first, because nothing is transformed: shapes keep their coordinates and anything past the new edges is cut off, a painted layer is clipped, and pins keep their relative positions and shift against the drawing. Undo restores it. Sizes are drawing units, not screen pixels; the canvas is drawn at whatever width the page gives it.</p>

    <h3>Pins</h3>
    <p>Pin is the editor's default tool. Click anywhere on the canvas to drop a pin, with a mouse, a pen, or a finger. Clicking a pin selects it and opens the pin editor below the canvas. In the map's view (not editing), clicking a pin that's linked to an entry opens that entry; a drag pans the map instead. The editor has:</p>
    <ul class="concepts">
      <li><span class="term">Label</span><p>The text displayed on the pin. The first character of the label (uppercased) shows as the pin's marker initial. An empty label shows a bullet instead.</p></li>
      <li><span class="term">Linked Entry</span><p>Any entry in the world, or any Astronomical Body defined in Ephemeris. The link is an edge in Concordance, from the map to the entry. If you later delete the linked entry, the pin shows "(missing entry)" instead of breaking silently.</p></li>
      <li><span class="term">Always visible</span><p>A toggle that marks this pin permanent. Permanent pins show on the map regardless of the time scrubber. Use it for things that exist across the whole timeline: coastlines, mountain ranges, ancient ruins, anything the story predates.</p></li>
      <li><span class="term">Color</span><p>Per-pin color override. Defaults to the world's accent gold. Click Reset to default to return to it.</p></li>
      <li><span class="term">Notes</span><p>Freeform notes about this pin. Not the same as the linked entry's content; these are map-context notes.</p></li>
    </ul>
    <p>Drag any pin to reposition it. Pins store their position as fractions of the canvas, so resizing the canvas on the page or zooming it doesn't drift them (changing a blank canvas's size does shift them against the drawing, as noted above). Click the canvas away from any pin to deselect. Click <strong>Done</strong> in the editor to close it or <strong>Delete Pin</strong> to remove the pin. Pins are not part of the drawing: they sit over it, they go through undo like everything else, and they are left out of the SVG and PNG downloads.</p>

    <h3>Looking at a map</h3>
    <p>In a map's view the canvas is a camera over the drawing. Drag it to pan. <strong>Ctrl+scroll</strong> (Cmd+scroll on a Mac) zooms about the pointer, a pinch does the same, and the bar in the canvas's corner has − and + buttons, the zoom, and <strong>Fit</strong>; the keys + and − zoom and 0 fits. Fit is the whole canvas and as far out as it goes; the range runs to 8x. <strong>Drag the bottom-right corner</strong> of the canvas to resize the box on the page, from 25% of the column up to 150% (past 100% it grows from the center, as far as the pane allows); the bar says "NN% wide" when it isn't 100%, and double-clicking the corner snaps back. Neither the zoom nor the size persists; both reset on navigation and on reload. The editor has the same controls and a Pan tool besides; see <a href="#cartographia-editor">The editor</a>.</p>
    <p>A small stats bar below the canvas shows the pin count, how many are linked to entries, and in time mode, counts of permanent and hidden-by-filter pins.</p>

@@SITE_TIME_MODE@@

    <h3>Downloading a map</h3>
    <p>In a map's view (not the editor), a <strong>Download</strong> row above the canvas writes the saved map as a file named after the map.</p>
    <ul class="concepts">
      <li><span class="term">SVG</span><p>The map as a standalone file: the drawing, with the image and every painted layer inlined as data URLs when they can be read, the stamps and tips it uses resolved into the file (each once, however many times it is placed), hidden layers left out, the map font embedded when it can be fetched (so labels keep their face when the file is opened elsewhere; offline, the viewer's serif stands in), and no pins. The root carries the canvas size, so other viewers and editors open it at the right dimensions.</p></li>
      <li><span class="term">PNG</span><p>The same drawing rasterized at twice the canvas size. A canvas large enough that twice its size would pass sixteen million pixels is scaled down to fit, so a huge map writes a smaller file rather than a blank one.</p></li>
    </ul>
    <p>A note beside the buttons says what was written and at what size. When the map's image or a painted layer can't be read (a folder file with no image folder connected, or a file the folder no longer has), the file is written with the rest of the drawing and the note names what is missing. Pins are app data with their own renderer, so they are never in the file; the world's HTML export is where a map travels with its pins, drawn through the same renderer as the app, painted layers included.</p>

    <h3>Limitations</h3>
    <p>No pen pressure: a stroke is the width you set however hard you press. No colors beyond the palette of eight for shapes, labels, and paint (a stamp pack can carry its own colors, and a color tip paints as it is). No grid, no snapping beyond the rotation knob's Shift snap, no fog of war, no measurement or scale tools, no layer opacity or blend modes, and no placing a shape or a stroke from the keyboard. Cartulary's map support is reference-grade: a drawn, painted, or imported map with clickable, cross-referenced, time-aware pins. If you need a virtual tabletop experience, that's a different tool.</p>
    </div>

    <div id="sub-cartographia-editor" style="display:none">
    <p class="section-kicker">Cartographia &middot; The editor</p>
    <h2>Drawing and painting on a map</h2>
    <p class="lead">The map editor opens from <strong>+ New Map</strong> or <strong>Edit</strong> on a map. Above the canvas sit the image buttons and the hint, a fixed two-line space that says what the active tool does, or why it can't when the active layer is hidden, locked, or the wrong kind; then the strip: the tools, the canvas controls, and the style of the next shape or the selected one. Everything here works with a mouse, a pen, or a finger, and most of it from the keyboard too.</p>

    <h3>The strip</h3>
    <p>The strip is built from named groups laid out in rows. As shipped: row one, the thirteen tools; row two, the <strong>Canvas</strong> picker (image-less maps only), <strong>Undo</strong> and <strong>Redo</strong>, <strong>Layers</strong> with the <strong>Layer</strong> select naming the layer new shapes go to, and <strong>Arrange…</strong>; row three, the <strong>Fill</strong> and <strong>Stroke</strong> swatches, <strong>Width</strong>, <strong>Smooth</strong>, and the active tool's own controls: the point count with <strong>Done</strong> and <strong>Cancel</strong> while a polygon or line is open, tip, size, and opacity for the Brush and Eraser, the stamp picks, a label's text, size, and arc, the angle of a label or stamp, the selected shape's layer, and <strong>Delete shape</strong>. Groups that don't apply to the current tool or selection dim rather than disappear, so nothing moves under the pointer when the tool changes.</p>
    <p><strong>Arrange…</strong> opens a modal where every group can be moved earlier or later, a "new row" checkbox starts a row before any group but the first, and the tool buttons can be reordered. Each change lands in the strip behind the modal at once, <strong>Reset</strong> restores the shipped layout, and the layout is kept in this browser with the theme and the font size, not in the world file.</p>

    <h3>The tools</h3>
    <p>Each has a letter that selects it when no text field has focus, shown in its button's tooltip with the hint. In the shipped order:</p>
    <ul class="concepts">
      <li><span class="term">Pin (N)</span><p>The default. Click the map to add a pin, click a pin to edit it, drag a pin to move it. The drawing is inert under this tool.</p></li>
      <li><span class="term">Select (V)</span><p>Click a shape to select it. Drag it to move it. Drag a point to reshape a polygon or line, or a corner to resize a rectangle, ellipse, or stamp (a stamp keeps its proportions; nothing goes under 8 units). Drag the knob above a label or a stamp to turn it; Shift snaps the angle to 15°. The arrow keys nudge the selection by one unit, ten with Shift. Delete or Backspace removes it, Esc clears it, and a right-click returns to Pin. A line or polygon with more than forty points moves as a whole, a filled region has no handles, and shapes on hidden or locked layers can't be selected.</p></li>
      <li><span class="term">Rect (R)</span><p>Drag on the map to draw a rectangle. A drag under two units in either direction places nothing.</p></li>
      <li><span class="term">Ellipse (E)</span><p>Drag on the map to draw an ellipse.</p></li>
      <li><span class="term">Polygon (P)</span><p>Click to place the corners of a closed, filled area. Clicking the first corner again, a double-click, Enter, <strong>Done</strong> in the strip (from three points), or a right-click closes it; Esc or <strong>Cancel</strong> discards it. The overlay shows the shape so far, a rubber line to the cursor, and the closing line.</p></li>
      <li><span class="term">Line (L)</span><p>Click to place the points of an open line. A double-click, Enter, <strong>Done</strong> (from two points), or a right-click finishes it; Esc or <strong>Cancel</strong> discards it.</p></li>
      <li><span class="term">Freehand (F)</span><p>Drag to draw a line in one motion. On release the line is simplified to the points it needs (a long coastline lands at a few dozen), it keeps <strong>Smooth</strong> on, and the tool stays so the next drag starts at once. Esc while dragging discards it. A freehand line of forty points or fewer reshapes by its points in Select; a longer one moves as a whole.</p></li>
      <li><span class="term">Fill (G)</span><p>Click inside an enclosed area to fill it with the Fill color. The drawing as it stands is traced, so lines, shapes, the image, and painted layers all bound the fill; small gaps in the outline close on their own, and the fill lands just under the lines around it, above the topmost filled shape under the click in the active layer. A click too close to a line is refused with a note, as is an area too narrow to fill. The result is a region shape: selectable, movable, restyled by the swatches (it lands with no stroke; give it one in Select), with Smooth off because a traced edge is already true.</p></li>
      <li><span class="term">Text (T)</span><p>Click on the map to place a label. The strip's text field takes focus so you can type over "Label"; Enter or Esc leaves the field. Size, angle, and arc are in the strip. A label is Ink until the Fill swatches restyle it.</p></li>
      <li><span class="term">Stamp (S)</span><p>Pick a symbol in the strip (the four built-ins are always there; <strong>More…</strong> opens a grid of every stamp in the world, grouped by pack, with a filter), then click to place it 120 units across centred on the click, or drag to place it with its long side at the drag's larger side. An svg symbol places square; a raster tip keeps its own proportions. A placed stamp is selected, so the angle controls and the handles apply to it at once.</p></li>
      <li><span class="term">Brush (B)</span><p>Paints on the active raster layer, or makes one above the active vector layer. See Painting.</p></li>
      <li><span class="term">Eraser (X)</span><p>Erases from the active raster layer. See Painting.</p></li>
      <li><span class="term">Pan (H)</span><p>Drag to move the view. See The view.</p></li>
    </ul>
    <p>In any drawing tool a right-click finishes the shape in progress and switches to Select, with that shape selected; in Select a right-click returns to Pin. Esc discards a shape or a stroke in progress before it clears a selection. The browser's own menu never opens on the canvas.</p>

    <h3>Style</h3>
    <p>The style groups set the style of the next shape, or restyle the selected one; with a shape selected, the change becomes the default too.</p>
    <ul class="concepts">
      <li><span class="term">Fill and Stroke</span><p>Swatches from a fixed palette of eight: Ink, Sepia, Parchment, Forest, Water, Stone, Blood, Chalk, plus None, each named for a screen reader. New shapes start with a stone fill and a sepia stroke. A line has no fill, a bucket fill has no stroke until you give it one, and the Brush paints in the Fill color (Ink when Fill is None).</p></li>
      <li><span class="term">Width</span><p>A slider from 1 to 32 drawing units, with a number field that goes to 64; new shapes start at 4. A stamp has no width control; its line weight is the symbol's own and scales with it.</p></li>
      <li><span class="term">Smooth</span><p>Rounds a rectangle's corners, and curves a polygon, line, or region through its points instead of joining them with straight segments. On by default.</p></li>
      <li><span class="term">Text, Size, Arc, Angle</span><p>For a label: its words, one of three sizes (24, 36, 56 units, in the map's Cormorant Garamond), an <strong>Arc</strong> slider from −180° to 180° in steps of 5 (right arches the label up, left bends it down; <strong>Straight</strong> resets it), and an <strong>Angle</strong> field with −15 and +15 buttons. A stamp has the angle controls too.</p></li>
      <li><span class="term">Layer</span><p>With more than one vector layer on the map, a select showing which layer the selected shape is on; pick another to move it there.</p></li>
      <li><span class="term">Delete shape</span><p>Removes the selected shape. Delete and Backspace do the same.</p></li>
    </ul>

    <h3>Painting</h3>
    <p>A map's layers are vector (shapes) or raster (one bitmap). <strong>Brush</strong> paints on the active raster layer; with a vector layer active, the first stroke makes a raster layer named Paint just above it, which becomes the active layer. <strong>Eraser</strong> erases from the active raster layer and never makes one. A pen's eraser end erases with the Eraser's settings from any drawing tool, and the tool stays. There is no pressure: a stroke is the tip at the size you set. The tool's controls sit in the strip:</p>
    <ul class="concepts">
      <li><span class="term">Tip</span><p>The built-in Round and Soft round, plus any tintable tip the world's packs brought in (see <a href="#cartographia-stamps">Stamps and brushes</a>); <strong>More…</strong> opens them all, with Import.</p></li>
      <li><span class="term">Size</span><p>In drawing units: a slider from 4 to 256, a field to 1024. The ring on the canvas shows it.</p></li>
      <li><span class="term">Opacity</span><p>5% to 100%. One stroke is flat at that strength however many times it crosses itself; strokes over each other add up. For the Eraser it is how much one stroke takes away.</p></li>
      <li><span class="term">Where the paint lives</span><p>A painted layer's bitmap is a PNG at the canvas's size, capped at 4096 pixels on the long side; a loaded image keeps its own format and size under the same cap. With an image folder connected, each painted or loaded layer is a file in the folder named after the map and the layer (<code>map-a3f2c1-layer-b7c9d2.png</code>), rewritten by every stroke and by undo; without one, it embeds in the save file, with a warning past 1&nbsp;MB when you load an image and a hard stop at 48&nbsp;MB. Cancel on the map puts the folder back to what it held when the editor opened; Save leaves the files as they are.</p></li>
      <li><span class="term">Load image…</span><p>In Layers, on a raster layer: fills it with a PNG, JPEG, or WebP scaled to cover the canvas width with its proportions kept; what runs past the bottom is clipped, and a JPEG stays a JPEG unless the cap resizes it. <strong>Clear</strong> empties the layer; undo brings the image back.</p></li>
    </ul>
    <p>The shape tools don't draw on a raster layer and the paint tools don't paint on a vector one; the hint says which layer to pick. Painted layers travel with the map into the HTML export and the downloads.</p>

    <h3>Layers</h3>
    <p><strong>Layers</strong> in the strip opens the layer list under it, top of the stack first (the last layer in the file draws on top). Each row has a pick button for the active layer (new shapes and strokes go there; the strip's <strong>Layer</strong> select does the same, marking raster, hidden, and locked layers), the name, editable in place, the shape count (a raster layer shows "image", "empty", or "file missing" instead), and:</p>
    <ul class="concepts">
      <li><span class="term">Hide / Hidden</span><p>Toggles the layer's visibility. A hidden layer is skipped on screen, in the HTML export, and in the downloads.</p></li>
      <li><span class="term">Lock / Locked</span><p>A locked layer can't be drawn or painted on and nothing on it can be selected.</p></li>
      <li><span class="term">↑ and ↓</span><p>Move the layer up or down the stack.</p></li>
      <li><span class="term">×</span><p>Deletes the layer. It asks when the layer has shapes or an image, and undo brings it back. The last layer can't be deleted.</p></li>
      <li><span class="term">+ Add layer, + Add raster layer</span><p>Adds a vector or a raster layer on top of the stack and makes it active.</p></li>
    </ul>
    <p>Every map starts with one vector layer named Drawing. If the active layer is hidden or locked, drawing is refused and the hint says which, rather than quietly drawing on another layer. Layers are a named, ordered, show-or-hide, lock-or-unlock list and nothing more: no opacity, no blend modes, no per-layer export.</p>

    <h3>Undo and redo</h3>
    <p><strong>Undo</strong> and <strong>Redo</strong> in the strip, or Ctrl+Z and Ctrl+Shift+Z (Ctrl+Y also redoes), step through the last fifty changes to the map: one step per gesture, so a drag of any length, a run of typing in one field, a run of arrow nudges, a rename, or one paint stroke undoes in one go. Pins are included, and so is a layer deletion. Painted bitmaps are kept for undo up to 64&nbsp;MB across the history, the oldest steps dropped first when they pass it; in folder mode undo rewrites the layer's file. The history belongs to the editing session: it's gone once you Save or Cancel, and it covers the map only. The rest of Cartulary has no undo; text fields keep the browser's own.</p>

    <h3>The view</h3>
    <p>The canvas is a camera over the drawing. <strong>Ctrl+scroll</strong> (Cmd+scroll on a Mac) zooms about the pointer, a pinch does the same, the bar in the canvas's corner has − and + buttons, the zoom, and <strong>Fit</strong>, and the keys + and − zoom while 0 fits. The range is Fit (the whole canvas) to 8x, in steps of 1.25; nothing goes below Fit. To pan, use the <strong>Pan</strong> tool, hold Space and drag from any tool, drag with the middle button, or drag with two fingers; two fingers anywhere also pinch, and cancel whatever one finger was doing. The zoom and the keys wait while a stroke, a shape, or a drag is in progress.</p>
    <p>The grip at the canvas's bottom-right corner sets the box's width on the page, 25% to 150% of the column (past 100% it grows from the center, as far as the pane allows; the bar says "NN% wide" when it isn't 100%); double-click it to snap back. The zoom lives inside the box, handles and pins keep their screen size at any zoom, and nothing here is stored: a map opens at Fit.</p>

    <h3>Keys and pointers</h3>
    <p>Letters select tools (above) when no field has focus. Otherwise:</p>
    <ul class="concepts">
      <li><span class="term">Arrows</span><p>Nudge the selected shape by a unit; Shift+arrows by ten.</p></li>
      <li><span class="term">Delete, Backspace, Esc, Enter</span><p>Delete or Backspace removes the selected shape. Esc discards a stroke or shape in progress, then clears the selection. Enter finishes a polygon or line.</p></li>
      <li><span class="term">Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y</span><p>Undo and redo.</p></li>
      <li><span class="term">+, −, 0, Ctrl+scroll, Space, middle button</span><p>Zoom in, zoom out, fit. Ctrl+scroll zooms about the pointer. Space held turns any drag into a pan; so does the middle button.</p></li>
      <li><span class="term">Right-click</span><p>Finishes the shape in progress and goes to Select; in Select, goes to Pin. The browser's menu never opens on the canvas.</p></li>
      <li><span class="term">Pen</span><p>Draws, paints, selects, and drags like a mouse, without pressure; its eraser end erases.</p></li>
      <li><span class="term">Touch</span><p>One finger does what the tool does (in Pan, it pans); two fingers pinch and pan from any tool and cancel the one-finger gesture they land on; a long press mid-stroke is not a right-click. In a map's view (not the editor), a finger's up-and-down swipe scrolls the page and a sideways drag pans the map.</p></li>
      <li><span class="term">Screen readers</span><p>Every swatch is named ("Fill: Water"), every tool button says its letter and what it does, and a live region names the tool and the selected shape ("Rectangle, 200 by 100"). The canvas itself is a drawing surface and can't be driven from the keyboard.</p></li>
    </ul>
    </div>

    <div id="sub-cartographia-stamps" style="display:none">
    <p class="section-kicker">Cartographia &middot; Stamps and brushes</p>
    <h2>Symbols to place, tips to paint with</h2>
    <p class="lead">A stamp is a symbol the map editor's Stamp tool places and sizes; a tintable stamp is also a tip the Brush paints with. Four symbols are built in (mountain, tree, settlement, compass rose) and two tips (Round, Soft round); everything else comes in through the <strong>Stamps</strong> panel at the top of the Cartographia index, or through <strong>Import pack or brushes</strong> inside the editor's stamp and tip pickers. Stamps are world data: they travel in the world's <code>.json</code> and are listed in <a href="#json-structure">JSON Structure</a>.</p>

    <h3>The Stamps panel</h3>
    <p>The panel lists every imported stamp grouped by pack, with a preview (a tip's tooltip gives its kind and pixel size), and offers:</p>
    <ul class="concepts">
      <li><span class="term">+ Import pack or brushes</span><p>Reads one file or several; the routes are below. An import with nothing to report lands at once; one where something was changed, dropped, or needs a name shows a report first, with Cancel. A brush or image file handed to World settings' Import .json instead is refused with a pointer back here.</p></li>
      <li><span class="term">Export built-ins as a pack</span><p>Writes the four built-in symbols as a correct pack file. Edit it, rename it, and import it to make your own.</p></li>
      <li><span class="term">Built-ins as PNG zip</span><p>The four symbols as PNGs in the Wonderdraft folder layout.</p></li>
      <li><span class="term">Export, PNG zip</span><p>On a pack: <strong>Export</strong> writes it back out as a <strong>.cartulary-stamps.json</strong> with its own ids, so a re-import replaces its own stamps; <strong>PNG zip</strong> writes it as PNGs in the Wonderdraft layout (below).</p></li>
      <li><span class="term">Delete pack, and × on a stamp</span><p>Removes a pack with all its stamps, or one stamp. When the stamps are placed on maps, the confirmation says how many placements will go missing.</p></li>
    </ul>

    <h3>What imports</h3>
    <ul class="concepts">
      <li><span class="term">A Cartulary pack</span><p>A .json holding svg symbols, PNG tips, or both; the format is below.</p></li>
      <li><span class="term">PNG files</span><p>As a pack named Imported stamps, which you can rename in the report. A PNG with any transparency uses its alpha as the shape; a fully opaque one is read as a mask with black as ink. Any colored pixel makes it a color stamp, placed as it is; without one it is a tintable tip, drawn in the map's Fill color.</p></li>
      <li><span class="term">A zip</span><p>Every folder of PNGs inside becomes a pack named after the folder, and a Wonderdraft <code>.wonderdraft_symbols</code> file beside them supplies the names and whether each is tinted (<code>custom_colors</code>) or placed as is (<code>normal</code>). Every .abr, .brush, and .brushset inside is its own pack, and .gbr and .gih files make a pack per folder, so a brush set's download zip imports as it came.</p></li>
      <li><span class="term">A Photoshop .abr</span><p>Every sampled tip, with its name and spacing where the file records them. Versions 1, 2, and 6 read whole; 7 and 10 read where their layout matches. A computed brush has no bitmap and is skipped with a note, and a file with no sampled tip is refused with what it found.</p></li>
      <li><span class="term">GIMP brushes</span><p>A .gbr is one tip, a .gih is one tip per cell. A color brush imports as a color stamp.</p></li>
      <li><span class="term">Procreate .brush and .brushset</span><p>Each brush's Shape.png is the tip, read by brightness (white is the shape), and Grain.png is ignored. The name comes from the brush's own archive, else its folder; a brushset is named from its plist.</p></li>
    </ul>
    <p>Tips are scaled down to 1024 pixels on the long side (the report says when), capped at 4&nbsp;MB each, and a pack holds at most 500 stamps. The report shows the pack's name (editable for brush and PNG imports), what will import and what it replaces, what changed, what was dropped and why; a zip of several packs steps through them with Skip.</p>

    <h3>Tips and symbols</h3>
    <p>An svg symbol takes the map's Fill and Stroke like any shape. A tintable tip (the pack file calls it <code>alpha</code>) is drawn in the Fill color, Ink when Fill is None, and is what the Brush paints with; a color stamp (<code>color</code>) is placed as it is and never paints. A raster stamp's placement box keeps the tip's proportions at 120 units on its long side; an svg symbol's is square. A used tip goes into a map's file once, however many times it is placed.</p>

    <h3>The pickers</h3>
    <p><strong>More…</strong> in the strip opens every stamp in the world (or, for the Brush and Eraser, every tip), grouped by pack with the built-ins first. Type to filter by name or pack name, with a count; a click arms the stamp and swaps the selected stamp's symbol, which is also how a missing one is re-pointed; Escape clears the filter, then closes. <strong>Import pack or brushes</strong> at the bottom imports without leaving the editor.</p>

    <h3>A pack file</h3>
    <p>A pack looks like this:</p>
    <pre><code>{
  "cartulary_mapstamp_pack": 1,
  "id":     "forest",                   // optional; lower-case letters, digits, underscore, dash. Defaults to a slug of the name
  "name":   "Forest",
  "stamps": [
    {                                   // an svg symbol
      "id":      "pine",                // required; same characters as the pack id
      "name":    "Pine",
      "viewBox": "0 0 64 64",           // the box the body is drawn in
      "body":    "&lt;path d=\"M32 4 L19 26 L45 26 Z\" stroke-width=\"3\"/&gt;&lt;path d=\"M29 58 V63 H35 V58\" fill=\"none\"/&gt;"
    },
    {                                   // a raster tip
      "id":      "moss",
      "name":    "Moss",
      "kind":    "alpha",               // alpha: tinted by the map's Fill, and a Brush tip; color: placed as it is
      "image":   "data:image/png;base64,...",   // a PNG, at most 1024 pixels on the long side and 4 MB
      "width":   256,                   // pixels
      "height":  256,
      "spacing": 25                     // the gap between dabs when it paints, as a percentage of the size
    },
    ...
  ]
}</code></pre>
    <p>The <code>body</code> is SVG inner markup. Parts with no <code>fill</code> or <code>stroke</code> of their own take the colors the map gives the stamp, so leave those off wherever the stamp should follow the palette, and put <code>fill="none"</code> on parts that must stay hollow. Line weight is the stamp's own and scales with the stamp. A pack holds at most 500 stamps, and a body at most 200&nbsp;KB. A raster entry's <code>image</code> is decoded and re-encoded on import (any colored pixel makes it <code>color</code> whatever <code>kind</code> says) and only checked for its shape on load, never decoded there.</p>
    <p>Only these elements survive import: <code>g</code>, <code>path</code>, <code>circle</code>, <code>ellipse</code>, <code>rect</code>, <code>polygon</code>, <code>polyline</code>, <code>line</code>. Only these attributes: <code>d</code>, <code>points</code>, <code>cx</code>, <code>cy</code>, <code>r</code>, <code>rx</code>, <code>ry</code>, <code>x</code>, <code>y</code>, <code>x1</code>, <code>y1</code>, <code>x2</code>, <code>y2</code>, <code>width</code>, <code>height</code>, <code>fill</code>, <code>fill-rule</code>, <code>fill-opacity</code>, <code>stroke</code>, <code>stroke-width</code>, <code>stroke-linecap</code>, <code>stroke-linejoin</code>, <code>stroke-dasharray</code>, <code>stroke-opacity</code>, <code>stroke-miterlimit</code>, <code>opacity</code>, <code>transform</code>; values are plain numbers, path data, transforms, and colors, never <code>url(...)</code>. Everything else (scripts, event handlers, <code>style</code>, <code>href</code>, text, images, <code>use</code>) is removed, on import and again whenever the world loads, and the import shows what it removed before anything lands.</p>
    <p>Stamp ids are namespaced by the pack (<code>forest__pine</code>; pack and stamp ids are at most forty characters each), so two packs can each have a <code>tree</code> and neither touches the built-in one; re-importing a pack replaces its own stamps in place, and every placed stamp keeps pointing at the right symbol. A placed stamp whose pack is gone shows as a dashed box with a question mark in the editor, and the strip says which stamp is missing; pick another symbol for it, delete it, or import the pack again. The view, the HTML export, and the downloads leave a missing stamp out.</p>

    <h3>Exports</h3>
    <p><strong>Export</strong> on a pack writes it back out as a <strong>.cartulary-stamps.json</strong> with its own ids, so a re-import replaces its own stamps. <strong>PNG zip</strong> writes it as PNGs in the Wonderdraft folder layout (<code>&lt;pack&gt;/sprites/symbols/&lt;pack&gt;/</code> with a <code>.wonderdraft_symbols</code> beside them), svg symbols rasterized at 512 pixels white on transparent, so the zip unpacks into Wonderdraft's assets folder and Inkarnate and Dungeondraft take the PNGs inside. The built-ins export both ways too.</p>
    </div>
  </section>
  </div><!-- /panel-cartographia -->"""


# ─── site: the router, the tile, Import & Export, the Colophon ────────────────

SITE_LINES = [
    ("<span class=\"t-sub\">Maps &amp; pins</span>",
     "<span class=\"t-sub\">Maps, drawing, pins</span>"),
    ("cartographia:'panel-cartographia',",
     "cartographia:'panel-cartographia','cartographia-editor':'panel-cartographia','cartographia-stamps':'panel-cartographia',"),
    ("var SUB={",
     "var SUB={cartographia:['sub-cartographia-hub'],'cartographia-editor':['sub-cartographia-editor'],'cartographia-stamps':['sub-cartographia-stamps'],"),
    ("var ALL_SUBS=[",
     "var ALL_SUBS=['sub-cartographia-hub','sub-cartographia-editor','sub-cartographia-stamps',"),
    # Import & Export: the stamp entry
    ("""    <h3>A stamp pack</h3>
    <p>Map stamps travel as packs: a <strong>.cartulary-stamps.json</strong> holding a pack's name, an id, and its stamps, each an SVG body in a view box. The Stamps panel at the top of <a href="#cartographia">Cartographia</a> imports one (<strong>+ Import pack</strong>) and writes one back out (<strong>Export</strong> on a pack, or <strong>Export built-ins as a pack</strong> for a correct file to start from). Every body is run through a sanitizer on the way in, and again on every load: only plain shapes and their geometry and paint attributes survive, and the import reports what it removed before anything lands. Packs don't collide by name; stamp ids are namespaced by the pack's id, so re-importing a pack replaces its own stamps in place and leaves every other pack alone. The pack format and the allowlist are on the Cartographia page.</p>""",
     """    <h3>Stamps and brushes</h3>
    <p>Map stamps travel as packs: a <strong>.cartulary-stamps.json</strong> holding a pack's name, an id, and its stamps, each an svg body in a view box or a PNG tip. The Stamps panel at the top of <a href="#cartographia">Cartographia</a> imports one (<strong>+ Import pack or brushes</strong>), and takes brushes by the same button: PNG files or a zip of them (a Wonderdraft folder's names and tint modes read), a Photoshop .abr, GIMP .gbr and .gih files, and Procreate .brush and .brushset files, each becoming a pack of tips. <strong>Export</strong> writes a pack back out, <strong>PNG zip</strong> writes it as PNGs in the Wonderdraft folder layout, and <strong>Export built-ins as a pack</strong> gives a correct file to start from. Every svg body is run through a sanitizer on the way in, and again on every load; a tip is decoded and re-encoded on import and only checked for shape on load. Packs don't collide by name; stamp ids are namespaced by the pack's id, so re-importing a pack replaces its own stamps in place and leaves every other pack alone. The formats and the allowlist are on the <a href="#cartographia-stamps">Stamps and brushes</a> page.</p>"""),
    # Import & Export: the download entry
    ("""Any saved map writes itself out as a standalone <strong>.svg</strong> or <strong>.png</strong> from the <strong>Download</strong> row above the canvas in the map's view: the drawing with the image inlined, stamps resolved, hidden layers out, the map font embedded, and no pins.""",
     """Any saved map writes itself out as a standalone <strong>.svg</strong> or <strong>.png</strong> from the <strong>Download</strong> row above the canvas in the map's view: the drawing with the image and every painted layer inlined, stamps and tips resolved, hidden layers out, the map font embedded, and no pins."""),
    # Colophon: accessibility
    ("""The canvas-based views, the Concordance graph, the Chronometric chart, the Linea family tree, and the Cartographia map, are built for a sighted user with a mouse or trackpad; they aren't navigable by a screen reader.""",
     """The canvas-based views, the Concordance graph, the Chronometric chart, the Linea family tree, and the Cartographia map, are built for a sighted user with a pointer; they aren't navigable by a screen reader. The map editor around its canvas is the partial exception: one key per tool, arrow keys to nudge, named swatches, and a live region that names the selection, but a shape or a stroke still has to be placed with a mouse, a pen, or a finger."""),
]


# ─── site: JSON Structure ─────────────────────────────────────────────────────

SITE_SCHEMA_START = "    <h3>Map data</h3>"
SITE_SCHEMA_END = "cannot bring in markup the import would have refused.</p>"

SITE_SCHEMA_NEW = r"""    <h3>Map data</h3>
    <p>Each map record's <code>mapData</code> is the image, the pins, and the drawing:</p>
    <pre><code>{
  "image": string | null,          // filename or data URL, same shape as an image field
  "pins":  [
    {
      "id":        string,         // e.g. "pin-a3f2c1"
      "x":         number,         // 0..1, fraction of the canvas width
      "y":         number,         // 0..1, fraction of the canvas height
      "label":     string,
      "entryId":   string | null,  // optional cross-reference to another entry
      "color":     string | null,  // hex override; null = inherit default pin color
      "notes":     string,
      "permanent": boolean         // optional; default false. true = always visible in time mode
    },
    ...
  ],
  "drawing": {                     // the drawing under the pins
    "width":  number,              // canvas units; with an image, its natural pixel size
    "height": number,
    "background": { "fill": hex, "grain": number },   // grain 0..1; not drawn under an image
    "layers": [
      { "id": string, "name": string, "visible": boolean, "locked": boolean, "kind": "vector", "shapes": [ ...shapes ] },
      ...
    ]
  }
}</code></pre>
    <p>A raster layer (painted with the Brush or filled by Load image) holds one bitmap instead of shapes:</p>
    <pre><code>{
  "id":      string,
  "name":    string,               // "Paint" when the Brush made it
  "visible": boolean,
  "locked":  boolean,
  "kind":    "raster",
  "image":   string | null,        // a filename in the image folder ("&lt;map id&gt;-&lt;layer id&gt;.png") or a PNG, JPEG, or WebP data URL; null when empty
  "width":   number,               // the canvas units the bitmap covers; a canvas resize clips it
  "height":  number,
  "shapes":  []
}</code></pre>
    <p>Each shape carries <code>id</code>, <code>type</code> (<code>rect</code>, <code>ellipse</code>, <code>polygon</code>, <code>stroke</code>, <code>region</code>, <code>text</code>, or <code>stamp</code>), <code>fill</code> and <code>stroke</code> (hex or null), and <code>strokeWidth</code> (1 to 64), then by type: <code>x</code>, <code>y</code>, <code>w</code>, <code>h</code> for rect, ellipse, and stamp; <code>points</code> (<code>[[x, y], ...]</code>) for polygon and stroke; <code>rings</code> (<code>[[[x, y], ...], ...]</code>, drawn even-odd, so a ring inside another is a hole) for region, which the Fill tool makes; <code>smooth</code> for rect, polygon, stroke, and region; <code>text</code>, <code>fontSize</code> (24, 36, or 56), <code>rotation</code>, and <code>arc</code> (degrees, −180..180) for text; <code>stampId</code> and <code>rotation</code> for stamp. Layers draw in array order, so the last one is on top; a layer without <code>kind</code> is vector. Pins are not part of the drawing.</p>
    <p>Pin coordinates are fractions of the canvas (0..1), so they stay positioned correctly at any display size. The canvas size shown in the UI (<code>sizePct</code>) and the zoom are session UI state and not persisted. A malformed drawing is coerced to defaults on load (one layer, a vellum background, the default 1600&nbsp;×&nbsp;1000 size) rather than refused; a shape that can't be rendered is dropped, and a raster layer whose image fails the check loads empty.</p>
    <p><strong>Unlinked pins</strong> (no <code>entryId</code>) are always visible in time mode. <strong>Linked pins marked permanent</strong> are also always visible, regardless of whether the linked entry has date data. <strong>Linked pins without permanent and without date data</strong> on the linked entry are hidden in time mode.</p>

    <h3>The <code>mapStamps</code> array</h3>
    <p>Stamps imported from packs and brush files, world-scoped. Built-in stamps and tips are never stored; a map's stamp shape references a built-in by id (<code>mountain</code>, <code>tree</code>, <code>settlement</code>, <code>compass</code>).</p>
    <pre><code>[
  {                                // an svg symbol
    "id":      string,             // namespaced by pack: "&lt;packId&gt;__&lt;stamp id&gt;"
    "name":    string,
    "kind":    "svg",
    "viewBox": string,             // "minx miny width height"
    "body":    string,             // sanitized SVG inner markup; see Stamps and brushes
    "packId":  string,             // the pack's slug; "" for a stamp from no pack
    "pack":    string              // the pack's display name
  },
  {                                // a raster tip
    "id":      string,
    "name":    string,
    "kind":    "alpha" | "color",  // alpha: tinted by the map's Fill, and a Brush tip; color: placed as it is
    "image":   string,             // a PNG data URL, at most 1024 pixels on the long side and 4 MB
    "width":   number,             // pixels
    "height":  number,
    "spacing": number,             // the gap between dabs when it paints, percent of the size
    "packId":  string,
    "pack":    string
  },
  ...
]</code></pre>
    <p>Every svg body is run through the sanitizer again on load, and every tip image is checked for its shape (a PNG data URL under the cap) and never decoded there, so editing this array by hand cannot bring in markup the import would have refused.</p>"""


def main():
    # 24_home-data: the three topics, with time mode lifted verbatim
    time_mode = span(HELP, TIME_START, TIME_END)
    assert "@@TIME_MODE@@" in HELP_CARTOGRAPHIA
    replace_span(HELP, HELP_START, HELP_END, HELP_CARTOGRAPHIA.replace("@@TIME_MODE@@", time_mode))
    replace_span(HELP, SCHEMA_START, SCHEMA_END, SCHEMA_NEW)
    edit(HELP, HELP_LINES)

    # site: the panel, with time mode lifted verbatim
    site_time = span(SITE, SITE_TIME_START, SITE_TIME_END)
    assert "@@SITE_TIME_MODE@@" in SITE_PANEL_NEW
    replace_span(SITE, SITE_PANEL_START, SITE_PANEL_END, SITE_PANEL_NEW.replace("@@SITE_TIME_MODE@@", site_time))
    replace_span(SITE, SITE_SCHEMA_START, SITE_SCHEMA_END, SITE_SCHEMA_NEW)
    edit(SITE, SITE_LINES)

    # no em dash in anything this cut wrote
    for text, name in ((HELP_CARTOGRAPHIA, "help topics"), (SCHEMA_NEW, "help schema"), (SITE_PANEL_NEW, "site panel"), (SITE_SCHEMA_NEW, "site schema")):
        assert "—" not in text, f"em dash in {name}"
    for old, new in HELP_LINES + SITE_LINES:
        assert "—" not in new.replace(old, ""), "em dash in a line edit"
    print("r047 applied: 24_home-data (three topics, schema, five lines), site/helloworld.html (hub and two sub-panels, router, tile, import/export, colophon, schema)")


if __name__ == "__main__":
    main()
