"""r038: help text and the cartulary.world Cartographia page (Cartographia+ cut 8).

The in-app help's Cartographia section, rewritten around the editor as it
ships at r031-r037: the canvas (image or blank sheet, presets and Custom), the
eight tools in the strip's own words, the style strip, layers, undo and redo,
pins, zoom and the grip, the download, and a Limitations paragraph that no
longer says "no layers". Time mode and the r036 stamp-pack block stay as they
were (both read true against the component). Lines elsewhere in the help that
the editor made false are fixed in the same pass (fix-on-find): "no undo" in
Getting Started, Stemma, and Things That Aren't Features; "no version history"
(contradicted by Settings > Version History since v1.5); the HTML export line
in Save & Share; the Views & Pages line; the Templates line that still offers a
map kind; and the JSON schema, which lacked the `cartographia` slice and still
put `mapData` on entries. One string in 16_trunk: the Cartographia index's
lead sentence, which described an image with pins.

The site (no r-bump): cartulary.world's Cartographia panel rewritten as the
full guide, the Import & Export panel gains stamp packs and the per-map
download, and the JSON Structure panel gains the v1.6 shapes. The site is
live at v1.5; the repository copy is ahead of it until the v1.6 launch.

Decided at the fork (Drak, 2026-10-21): every recommendation.

Declared scope: 24_home-data, 16_trunk (one string), site/helloworld.html.

String-anchored edits; every anchor must occur exactly once. Run from the
repository root against the r037 tree: python3 inlining/cuts/r038_help_site.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
MOD = ROOT / "cartulary-src" / "modules"
SITE = ROOT / "site" / "helloworld.html"


def edit(path, pairs):
    s = path.read_text(encoding="utf-8")
    for old, new in pairs:
        c = s.count(old)
        assert c == 1, f"{path.name}: anchor occurs {c} times: {old[:80]!r}"
        s = s.replace(old, new)
    path.write_text(s, encoding="utf-8")


def replace_span(path, start, end, new):
    """Replace everything from the start marker through the end marker (both
    must occur exactly once, in that order) with `new`."""
    s = path.read_text(encoding="utf-8")
    assert s.count(start) == 1, f"{path.name}: start marker occurs {s.count(start)} times"
    assert s.count(end) == 1, f"{path.name}: end marker occurs {s.count(end)} times"
    i = s.index(start)
    j = s.index(end) + len(end)
    assert i < j, f"{path.name}: markers out of order"
    path.write_text(s[:i] + new + s[j:], encoding="utf-8")


# ─── 24_home-data: the Cartographia section ───────────────────────────────────

HELP_OPENING_OLD = """  { id: "cartographia", title: "Cartographia", content: `Maps in Cartulary pair an image with clickable pins — useful for regional maps, dungeon layouts, star charts, floor plans, anything where points of interest cross-reference other entries. **Cartographia** is the sidebar view that indexes every map in the world.

**Creating a map.** Open Cartographia from the sidebar and click **+ New Map**. The editor shows a map canvas above the Description, Scope / Region, and Notes fields. Click **Set Image** to upload one — large images go through folder mode if you have a folder connected, otherwise they embed inline (you'll get a confirmation prompt for files over 1MB to warn you about save bloat). The canvas can be resized by dragging the bottom-right corner.

**Adding pins.** Click anywhere on the map image. A pin drops at that location. Selected pins show editing controls below the canvas: a label, a target entry (any entry in the world), and a remove button. Drag any pin to reposition it. Click outside any pin to deselect.

**Pin storage.** Pins are stored as percentages, not absolute pixels — they stay anchored to the same point on the image even if the canvas is resized in display. Each pin can link to another entry; the link surfaces in the Concordance and on the linked entry's "Mentioned by" panel.

**Ctrl+scroll to zoom** the map canvas (range 0.5–4×, factor 1.15). Works in both the viewer and the editor. Pin positions stay anchored — zooming moves the image and pins together. At zoomed levels the canvas scrolls in place via the browser scrollbars on its wrapper. Ephemeral; reload resets to 1×.
"""

HELP_OPENING_NEW = """  { id: "cartographia", title: "Cartographia", content: `Maps in Cartulary are canvases: an image you bring, a blank sheet you draw on, or both, with a vector drawing (shapes, labels, stamps, on layers) and clickable pins over it. Pins tie places to entries; the drawing is the map itself. Regional maps, dungeon layouts, star charts, floor plans, anything where points of interest cross-reference other entries. **Cartographia** is the sidebar view that indexes every map in the world, with the world's stamp packs in a panel above the list.

**Creating a map.** Open Cartographia from the sidebar and click **+ New Map**. The editor shows the canvas above the Description, Scope / Region, and Notes fields; Save needs a name, and **Edit** on a saved map brings the editor back. Click **Set Image** to bring an image in: with an image folder connected the file stays on disk and only its name is saved, otherwise it embeds in the save file, with a confirmation for anything over 1 MB. **Change Image** swaps the image and keeps the drawing and the pins; **Remove Image** clears it and leaves them on the canvas. Without an image the canvas is a blank vellum sheet, and a **Canvas** picker in the strip offers Landscape 1600 × 1000, Portrait 1000 × 1600, Square 1200 × 1200, or **Custom…** (whole units, 100 to 10000 a side; type the size, then **Set** or Enter). An image map's canvas is the image's own size and has no picker. Changing the size of a map that already has work on it asks first, because nothing is transformed: shapes keep their coordinates and anything past the new edges is cut off, pins keep their relative positions and shift against the drawing. Undo restores it.

**The tools.** The strip above the canvas holds eight tools, and the line above the strip says what the active one does. **Pin** is the default: click the map to add a pin, click a pin to edit it, drag a pin to move it. The rest draw. **Rect** and **Ellipse**: drag. **Polygon**: click the corners of a closed, filled area; the first corner, a double-click, Enter, or a right-click closes it. **Line**: click the points of an open line; a double-click, Enter, or a right-click finishes it. **Text**: click to place a label, then edit its words, size, angle, and arc in the strip. **Stamp**: pick a symbol in the strip, then click to place it at 120 units or drag to size it. **Select**: click a shape to select it, drag it to move it, drag a point (polygon, line) or a corner (rectangle, ellipse, stamp) to reshape it, drag the knob above a label or a stamp to turn it (Shift snaps to 15°); Delete or Backspace removes it. In any drawing tool, Esc discards the shape in progress and a right-click finishes it and switches to Select; in Select, a right-click returns to Pin.

**Style.** Fill and Stroke come from a fixed palette of eight (Ink, Sepia, Parchment, Forest, Water, Stone, Blood, Chalk) plus None; Width is 2, 4, or 8 units; **Smooth** rounds a rectangle's corners and curves a polygon or line through its points. With nothing selected the swatches set the style for the next shape; with a shape selected they restyle it. A label has a **Size** of 24, 36, or 56, an **Arc** slider from −180° to 180° (right arches it up, left bends it down; **Straight** flattens it), and an **Angle** field with −15 and +15 buttons; a stamp has the angle controls and takes its line weight from the symbol. When the map has more than one layer, the strip also shows the selected shape's layer and lets you move it to another. **Delete shape** removes it.

**Layers.** **Layers** in the strip opens the layer list, top of the stack first, one row per layer with its shape count. Pick the active layer (new shapes go there; the strip's **Layer** select does the same), rename it in place, **Hide** it (a hidden layer stays out of the HTML export and the downloads too), **Lock** it (nothing on it can be selected or drawn), move it up or down, delete it (asks when it has shapes; undo brings it back; the last layer stays), or **+ Add layer** on top. Every map starts with one layer named Drawing. A hidden or locked active layer refuses to draw, and the hint says so rather than drawing somewhere else.

**Undo and redo.** **Undo** and **Redo** in the strip, or Ctrl+Z and Ctrl+Shift+Z (Ctrl+Y also redoes), step through the last fifty changes, one step per gesture: a drag of any length or a run of typing in one field undoes in one go. Pins are included. The history belongs to the editing session and is gone once you Save or Cancel. The rest of Cartulary still has no undo.

**Pins.** A selected pin shows its editor below the canvas: Label (its first letter is the marker), Linked Entry (any entry in the world, or an Astronomical Body), Always visible (for time mode), Color, Notes, and Delete Pin; Done closes it. Pins are stored as fractions of the canvas, not pixels, so they stay on the same spot at any display size. A linked pin is an edge in Concordance, from the map to the entry; in the map's view, clicking a linked pin opens the entry, and a pin whose entry was deleted says so.

**Zoom and size.** Ctrl+scroll (Cmd+scroll on a Mac) zooms the canvas from half size to four times, in the viewer and the editor; the drawing and the pins move together, and a zoomed canvas scrolls in place. Drag the canvas's bottom-right corner to resize it on the page, from 25% to 150% of the column (past 100% it grows from the center); double-click the corner to snap back. Neither persists: reload resets both.
"""

HELP_STAMPS_HEADING_OLD = "**Stamps and stamp packs (v1.6).** The map editor's Stamp tool places symbols."
HELP_STAMPS_HEADING_NEW = "**Stamps and stamp packs.** The map editor's Stamp tool places symbols."
HELP_STAMPS_BUTTONS = [
    ("more come from stamp packs, JSON files you import from the Stamps panel at the top of the Cartographia index.",
     "more come from stamp packs, JSON files you bring in with **+ Import pack** in the Stamps panel at the top of the Cartographia index."),
    ("Deleting a stamp that is placed on a map leaves a dashed box in the editor until a pack with it is imported again.",
     "**Delete pack**, or × on a stamp, removes them; deleting a stamp that is placed on a map leaves a dashed box in the editor until a pack with it is imported again."),
]

HELP_LIMITS_OLD = """**Limitations.** No layers, no fog of war, no measurement tools. Cartulary's map support is reference-grade, not VTT-grade. If you need a virtual tabletop experience, this isn't that.` },"""

HELP_LIMITS_NEW = """**Downloading a map.** In a map's view (not the editor), a **Download** row above the canvas writes the saved map as a file. **SVG** is the map as a standalone file: the drawing with the image inlined when it can be read, the stamps resolved, hidden layers left out, the map font embedded when it can be fetched, and no pins (pins are app data with their own renderer). **PNG** is the same drawn at twice the canvas size, scaled down to fit sixteen million pixels when the canvas is huge. A note beside the buttons says what was written, and says so when the image could not be read (a folder image with no folder connected): the file then has the drawing only. The world's HTML export draws every map through the same renderer, image, drawing, and pins together.

**Limitations.** No freehand brush: lines go down point by point. No colors beyond the palette in the editor (a stamp pack can carry its own). No grid or snapping (the rotation knob's Shift snap aside), no fog of war, no measurement or scale tools, no per-layer opacity or blend modes. Cartulary's map support is reference-grade, not VTT-grade. If you need a virtual tabletop experience, this isn't that.` },"""

# ─── 24_home-data: lines the editor made false, elsewhere in the help ────────

HELP_ELSEWHERE = [
    # Getting Started
    ("""- **No undo.** Cartulary doesn't have undo/redo. If you delete an entry or a template, it's gone from the working save. The only recovery path is importing a recent .json backup, which is why backups matter — see Back Up Your World.""",
     """- **No undo, except in the map editor.** Cartulary doesn't have undo/redo outside the map editor's own Undo and Redo. If you delete an entry or a template, it's gone from the working save. The recovery paths are a restore point in Version History (Settings) or a recent .json backup, which is why backups matter (see Back Up Your World)."""),
    # Save & Share, the HTML export
    ("""maps render as static images with pin overlays, and dates resolve through your calendar system.""",
     """maps render as they do in the app (image, drawing, and pins), and dates resolve through your calendar system."""),
    # Templates: the builder has no map kind (the section says so two paragraphs later)
    ("""Pick a name, an icon glyph, an accent color, and a "kind" (regular or map). Then add fields via the Template Builder.""",
     """Pick a name, an icon glyph, and an accent color. Then add fields via the Template Builder."""),
    # Views & Pages
    ("""Click a map to open it (canvas, pins, time-mode chronicle filtering); use + New Map to create one.""",
     """Click a map to open it (canvas, drawing, pins, time-mode chronicle filtering); use + New Map to create one."""),
    # Stemma's not-in-v1 list
    ("""- **Undo / redo** — consistent with the rest of Cartulary""",
     """- **Undo / redo**: Stemma has none (the map editor has its own)"""),
    # Things That Aren't Features
    ("""**No undo.** Already covered in Getting Started. There's no Ctrl+Z. JSON exports are your safety net.""",
     """**No undo outside the map editor.** Already covered in Getting Started. The map editor has Undo and Redo while you're in it; nothing else has Ctrl+Z. Restore points and JSON exports are your safety net."""),
    ("""**No version history.** Cartulary doesn't snapshot your world over time. Whatever's in IndexedDB is your one working copy until you export. Dated JSON files are your version history — make them.""",
     """**No version history beyond the browser.** Settings → Version History keeps recent snapshots and your restore points, but they live in the same browser storage as the world and go with it. Dated JSON files are your real version history: make them."""),
    # JSON schema: the cartographia slice, and mapData is no longer on entries
    ("""  "packs":        [ ...template packs ],              // v1.5 — named reference-sets over templates; empty array if none
  "mapStamps":    [ ...imported map stamps ],         // v1.6, stamps imported from stamp packs; empty array if none""",
     """  "packs":        [ ...template packs ],              // v1.5 — named reference-sets over templates; empty array if none
  "cartographia": [ ...map records ],                 // v1.6, maps as their own records (see below); empty array if none
  "mapStamps":    [ ...imported map stamps ],         // v1.6, stamps imported from stamp packs; empty array if none"""),
    ("""\\`stemmas\\`, \\`concordance\\`, \\`calendars\\`, \\`celestialBodies\\`, \\`ephemeris\\`, \\`glossopoeia\\`, \\`packs\\`, \\`mapStamps\\`, and \\`viewPrefs\\` are all optional""",
     """\\`stemmas\\`, \\`concordance\\`, \\`calendars\\`, \\`celestialBodies\\`, \\`ephemeris\\`, \\`glossopoeia\\`, \\`packs\\`, \\`cartographia\\`, \\`mapStamps\\`, and \\`viewPrefs\\` are all optional"""),
    ("""  "fields":     { [fieldId]: value, ... },     // value shape depends on field type
  "mapData":    { ...map data },               // ONLY for entries whose template kind is "map"
  "calendarId": string | null,""",
     """  "fields":     { [fieldId]: value, ... },     // value shape depends on field type
  "calendarId": string | null,"""),
    ("""**\\`mapData\\` (on cartographia map records):**""",
     """**\\`cartographia\\` array (v1.6), one record per map:**

\\`\\`\\`
[
  {
    "id":        string,                       // e.g. "map-a3f2c1"
    "name":      string,
    "tags":      [ string, ... ],
    "fields":    {                             // the three fixed fields, by id
      "cart-fld-description":  string,
      "cart-fld-scope-region": string,
      "cart-fld-notes":        string
    },
    "mapData":   { ...map data, below },
    "updatedAt": ISO-8601 timestamp
  },
  ...
]
\\`\\`\\`

Maps were template entries (\\`kind: "map"\\`) through v1.5; a world saved by v1.5 is migrated on load: each map entry becomes a record here, its map-kind template is dropped, and any extra fields a custom map template had are kept in \\`fields\\` under their old ids (not shown in the app) with a line in Notes naming them.

**\\`mapData\\` (on cartographia map records):**"""),
]

# ─── 16_trunk: the index's lead sentence ─────────────────────────────────────

TRUNK_INTRO = [
    ("""          The bound collection of maps. Each map is a clickable image canvas with time-aware pin filtering and cross-references to other entries through its pins. Open a map to add or edit pins.""",
     """          The bound collection of maps. Each map is a canvas, an image or a blank sheet, with a drawing on it and time-aware pins over it that cross-reference other entries. Open a map to draw on it or place pins."""),
]

# ─── site/helloworld.html: the Cartographia panel ────────────────────────────

SITE_CARTO_START = """  <div class="panel" id="panel-cartographia" data-route="cartographia">"""
SITE_CARTO_END = """  </div><!-- /panel-cartographia -->"""

SITE_CARTO_NEW = """  <div class="panel" id="panel-cartographia" data-route="cartographia">
  <section>
    <p class="section-kicker">Cartographia</p>
    <h2>Maps with meaning</h2>
    <p class="lead">Cartographia is the bound collection of maps. A map is a canvas: an image you bring, a blank sheet you draw on, or both, with a vector drawing (shapes, labels, stamps, on layers) and clickable, draggable pins over it. Each pin can link to any other entry in the world, so maps are cross-referenced, time-aware, and part of the same graph as everything else: a pin that links to a city shows up in Concordance as an edge from the map to the city, and filters itself off the map when the story hasn't reached it yet.</p>

    <h3>The index</h3>
    <p>Click Cartographia in the sidebar and you land on the map index. A Stamps panel sits at the top (a world has far fewer stamp packs than maps, so it goes above the list; it's described under Stamps and stamp packs below), then every map in the world, sorted by most recently updated. Each row shows the map glyph ▣, the name, the pin count, "no image" when the map is a blank canvas, the last updated date, a preview of the Description, and any tags. Click a row to open the map. Delete from the row's Delete button, or from the map's own toolbar; the map, its drawing, and all its pins are removed, and entries the pins linked to are unaffected.</p>
    <p>Maps are their own records, not template entries: there is no map template and no map kind in the Template Builder. Every map carries the same three fields, Description, Scope / Region, and Notes. A world saved by v1.5 with map-kind templates is migrated on load: each map entry becomes a map record, the map-kind templates are dropped, and any extra fields a custom map template had are kept in the record but no longer shown, with a line in Notes naming them.</p>

    <h3>Creating a map</h3>
    <p>Click <strong>+ New Map</strong> at the top of the index. The editor opens with the name and tags at the top, the canvas, then the three fields; <strong>Save</strong> needs a name, <strong>Cancel</strong> discards. Open a saved map and click <strong>Edit</strong> to come back to the editor.</p>
    <p><strong>Set Image</strong> in the canvas toolbar brings an image in: with an image folder connected, the file stays on disk and only its name is saved; without one, the image embeds as base64 in the save, with a warning for files over 1&nbsp;MB. An image map's canvas is the image's own size. <strong>Change Image</strong> swaps the image and keeps the drawing and the pins; <strong>Remove Image</strong> clears it and leaves them on the canvas.</p>
    <p>Without an image the canvas is a blank vellum sheet, and a <strong>Canvas</strong> picker appears in the strip: Landscape 1600&nbsp;×&nbsp;1000, Portrait 1000&nbsp;×&nbsp;1600, Square 1200&nbsp;×&nbsp;1200, or <strong>Custom…</strong>, which opens width and height fields (whole units, 100 to 10000 a side; anything outside is clamped) that you apply with <strong>Set</strong> or Enter. Changing the size of a map that already has shapes or pins asks first, because nothing is transformed: shapes keep their coordinates and anything past the new edges is cut off, pins keep their relative positions and shift against the drawing. Undo restores it. Sizes are drawing units, not screen pixels; the canvas is drawn at whatever width the page gives it.</p>

    <h3>The strip</h3>
    <p>Above the canvas sits the tool strip: the eight tools, the Canvas picker on a blank map, <strong>Undo</strong> and <strong>Redo</strong>, the <strong>Layers</strong> toggle, and a <strong>Layer</strong> select naming the layer new shapes go to. A second row appears for the drawing tools and for a selected shape, with the style controls described below. The line above the strip, beside the image buttons, is the hint: it says what the active tool does, and when the active layer is hidden or locked it says that instead.</p>

    <h3>The tools</h3>
    <ul class="concepts">
      <li><span class="term">Pin</span><p>The default. Click the map to add a pin, click a pin to edit it, drag a pin to move it. Pins are the only thing the map's viewer interacts with; everything else here is drawing.</p></li>
      <li><span class="term">Select</span><p>Click a shape to select it. Drag it to move it. Drag a point to reshape a polygon or line, or a corner to resize a rectangle, ellipse, or stamp (a stamp keeps its proportions; nothing goes under 8 units). Drag the knob above a label or a stamp to turn it; Shift snaps the angle to 15°. Delete or Backspace removes the selected shape. Hidden and locked layers can't be selected from.</p></li>
      <li><span class="term">Rect</span><p>Drag on the map to draw a rectangle. A drag under two units in either direction places nothing.</p></li>
      <li><span class="term">Ellipse</span><p>Drag on the map to draw an ellipse.</p></li>
      <li><span class="term">Polygon</span><p>Click to place the corners of a closed, filled area. Clicking the first corner again, a double-click, Enter, or a right-click closes it; Esc discards it. The overlay shows the shape so far, a rubber line to the cursor, and the closing line.</p></li>
      <li><span class="term">Line</span><p>Click to place the points of an open line. A double-click, Enter, or a right-click finishes it; Esc discards it.</p></li>
      <li><span class="term">Text</span><p>Click on the map to place a label. The strip's text field takes focus so you can type over "Label"; Enter or Esc leaves the field. Size, angle, and arc are in the strip.</p></li>
      <li><span class="term">Stamp</span><p>Pick a symbol in the strip (the four built-ins are always there; <strong>More…</strong> opens a grid of every stamp in the world, grouped by pack), then click to place it 120 units square centred on the click, or drag to place it square at the drag's larger side. A placed stamp is selected, so the angle controls and the handles apply to it at once.</p></li>
    </ul>
    <p>In any drawing tool a right-click finishes the shape in progress and switches to Select, with that shape selected; in Select a right-click returns to Pin, and Esc clears the selection. The canvas never shows scrollbars of its own; only a zoomed canvas scrolls in place.</p>

    <h3>Style</h3>
    <p>The second strip row sets the style of the next shape, or restyles the selected one.</p>
    <ul class="concepts">
      <li><span class="term">Fill and Stroke</span><p>Swatches from a fixed palette of eight: Ink, Sepia, Parchment, Forest, Water, Stone, Blood, Chalk, plus None. New shapes start with a stone fill and a sepia stroke. A line has no fill.</p></li>
      <li><span class="term">Width</span><p>2, 4, or 8 drawing units. A stamp has no width control; its line weight is the symbol's own and scales with it.</p></li>
      <li><span class="term">Smooth</span><p>Rounds a rectangle's corners, and curves a polygon or line through its points instead of joining them with straight segments. On by default.</p></li>
      <li><span class="term">Text, Size, Arc, Angle</span><p>For a label: its words, one of three sizes (24, 36, 56 units, in the map's Cormorant Garamond), an <strong>Arc</strong> slider from −180° to 180° in steps of 5 (right arches the label up, left bends it down; <strong>Straight</strong> resets it), and an <strong>Angle</strong> field with −15 and +15 buttons. A stamp has the angle controls too.</p></li>
      <li><span class="term">Layer</span><p>With more than one layer on the map, a select showing which layer the selected shape is on; pick another to move it there.</p></li>
      <li><span class="term">Delete shape</span><p>Removes the selected shape. Delete and Backspace do the same.</p></li>
    </ul>

    <h3>Layers</h3>
    <p><strong>Layers</strong> in the strip opens the layer list under it, top of the stack first (the last layer in the file draws on top). Each row has a pick button for the active layer (new shapes go there; the strip's <strong>Layer</strong> select does the same), the name, editable in place, the shape count, and:</p>
    <ul class="concepts">
      <li><span class="term">Hide / Hidden</span><p>Toggles the layer's visibility. A hidden layer is skipped on screen, in the HTML export, and in the downloads.</p></li>
      <li><span class="term">Lock / Locked</span><p>A locked layer can't be drawn on and nothing on it can be selected.</p></li>
      <li><span class="term">↑ and ↓</span><p>Move the layer up or down the stack.</p></li>
      <li><span class="term">×</span><p>Deletes the layer. It asks when the layer has shapes, and undo brings it back. The last layer can't be deleted.</p></li>
      <li><span class="term">+ Add layer</span><p>Adds a layer on top of the stack and makes it active.</p></li>
    </ul>
    <p>Every map starts with one layer named Drawing. If the active layer is hidden or locked, drawing is refused and the hint says which, rather than quietly drawing on another layer. Layers are a named, ordered, show-or-hide, lock-or-unlock list and nothing more: no opacity, no blend modes, no per-layer export.</p>

    <h3>Undo and redo</h3>
    <p><strong>Undo</strong> and <strong>Redo</strong> in the strip, or Ctrl+Z and Ctrl+Shift+Z (Ctrl+Y also redoes), step through the last fifty changes to the map: one step per gesture, so a drag of any length, a run of typing in one field, or a rename undoes in one go. Pins are included, and so is a layer deletion. The history belongs to the editing session: it's gone once you Save or Cancel, and it covers the map only. The rest of Cartulary has no undo; text fields keep the browser's own.</p>

    <h3>Pins</h3>
    <p>In the Pin tool, click anywhere on the canvas to drop a pin. Clicking a pin selects it and opens the pin editor below the canvas. In the map's view (not editing), clicking a pin that's linked to an entry opens that entry. The editor has:</p>
    <ul class="concepts">
      <li><span class="term">Label</span><p>The text displayed on the pin. The first character of the label (uppercased) shows as the pin's marker initial. An empty label shows a bullet instead.</p></li>
      <li><span class="term">Linked Entry</span><p>Any entry in the world, or any Astronomical Body defined in Ephemeris. The link is an edge in Concordance, from the map to the entry. If you later delete the linked entry, the pin shows "(missing entry)" instead of breaking silently.</p></li>
      <li><span class="term">Always visible</span><p>A toggle that marks this pin permanent. Permanent pins show on the map regardless of the time scrubber. Use it for things that exist across the whole timeline: coastlines, mountain ranges, ancient ruins, anything the story predates.</p></li>
      <li><span class="term">Color</span><p>Per-pin color override. Defaults to the world's accent gold. Click Reset to default to return to it.</p></li>
      <li><span class="term">Notes</span><p>Freeform notes about this pin. Not the same as the linked entry's content; these are map-context notes.</p></li>
    </ul>
    <p>Drag any pin to reposition it. Pins store their position as fractions of the canvas, so resizing the canvas on the page or zooming it doesn't drift them (changing a blank canvas's size does shift them against the drawing, as noted above). Click the canvas away from any pin to deselect. Click <strong>Done</strong> in the editor to close it or <strong>Delete Pin</strong> to remove the pin. Pins are not part of the drawing: they sit over it, they go through undo like everything else, and they are left out of the SVG and PNG downloads.</p>

    <h3>Canvas controls</h3>
    <p><strong>Ctrl+scroll</strong> (Cmd+scroll on a Mac) zooms the map canvas, from half size up to four times, in the viewer and the editor; the drawing and the pins move together. At high zoom the canvas scrolls in place. <strong>Drag the bottom-right corner</strong> of the canvas to resize it on the page, from 25% of the column up to 150% (past 100% it grows from the center, as far as the pane allows); a small badge shows the size when it isn't 100%, and double-clicking the corner snaps back. Neither the zoom level nor the size persists; both reset on navigation and on reload.</p>
    <p>A small stats bar below the canvas shows the pin count, how many are linked to entries, and in time mode, counts of permanent and hidden-by-filter pins.</p>

    <h3>Time mode</h3>
    <p>When at least one pinned entry has a Calendar Date Range field with data, a <strong>Time</strong> button appears above the canvas. Toggle it on to add the year scrubber, and the map starts filtering pins by whether the current year falls within each pin's linked entry's range. Three pin states in time mode:</p>
    <ul class="concepts">
      <li><span class="term">Permanent pins</span><p>Marked "Always visible" in the pin editor. Always show, regardless of the scrubber. When time mode is on, a small ◇ marks them so you can tell them apart from temporal pins.</p></li>
      <li><span class="term">Temporal pins</span><p>Linked to an entry with a date range. Visible only when the scrubber year falls within that range. In time mode, pin labels show the entry's name as it was at the scrubber year, so a pin linked to "New York" shows "New Amsterdam" when the year is 1640 if the entry's Former Names says so.</p></li>
      <li><span class="term">Linked pins with no date data</span><p>Hidden when time mode is on. The interpretation is "you haven't filled in dates yet." If a pin should be visible across all time, mark it permanent explicitly.</p></li>
    </ul>
    <p>Unlinked pins (no linked entry at all) are always visible; there's nothing to filter against. Toggle <strong>show faded</strong> to render hidden pins dimmed rather than invisible, so you can see "there was something here" without cluttering the map.</p>
    <p>The scrubber's range comes from the actual data: the minimum and maximum years across all pinned entries' date ranges. Move through it with the range slider, the numeric year input, or the − and + step buttons beside it. Era buttons jump to that era's start year. If the world has multiple calendars, a calendar selector lets you drive the scrubber in any calendar's reckoning.</p>
    <p>A few rules worth knowing. Only the <strong>first</strong> Calendar Date Range field on a linked entry's template counts; if an entry has multiple range fields, the others are ignored. Point-date fields (Calendar Date, not Calendar Date Range) don't affect pin visibility at all. Open-ended ranges work as you'd expect: a range with only a start year is visible from that year onward; a range with only an end year is visible up to it.</p>

    <h3>Stamps and stamp packs</h3>
    <p>A stamp is a reusable symbol the Stamp tool places and sizes. Four are built in: mountain, tree, settlement, and compass rose. More come from stamp packs, JSON files you import from the <strong>Stamps</strong> panel at the top of the Cartographia index. The panel lists every imported stamp grouped by pack with a preview, and offers:</p>
    <ul class="concepts">
      <li><span class="term">+ Import pack</span><p>Reads a pack file. An import with nothing to report lands at once; one where the sanitizer removed something, or dropped a stamp it couldn't use, shows a report first, with Cancel. A pack file handed to World settings' Import .json instead is refused with a pointer back here.</p></li>
      <li><span class="term">Export built-ins as a pack</span><p>Writes the four built-in stamps as a correct pack file. Edit it, rename it, and import it to make your own.</p></li>
      <li><span class="term">Export</span><p>On a pack: writes it back out as a <strong>.cartulary-stamps.json</strong> with its own ids, so a re-import replaces its own stamps.</p></li>
      <li><span class="term">Delete pack, and × on a stamp</span><p>Removes a pack with all its stamps, or one stamp. When the stamps are placed on maps, the confirmation says how many placements will go missing.</p></li>
    </ul>
    <p>A pack looks like this:</p>
    <pre><code>{
  "cartulary_mapstamp_pack": 1,
  "id":     "forest",                   // optional; lower-case letters, digits, underscore, dash. Defaults to a slug of the name
  "name":   "Forest",
  "stamps": [
    {
      "id":      "pine",                // required; same characters as the pack id
      "name":    "Pine",
      "viewBox": "0 0 64 64",           // the box the body is drawn in
      "body":    "&lt;path d=\\"M32 4 L19 26 L45 26 Z\\" stroke-width=\\"3\\"/&gt;&lt;path d=\\"M29 58 V63 H35 V58\\" fill=\\"none\\"/&gt;"
    },
    ...
  ]
}</code></pre>
    <p>The <code>body</code> is SVG inner markup. Parts with no <code>fill</code> or <code>stroke</code> of their own take the colors the map gives the stamp, so leave those off wherever the stamp should follow the palette, and put <code>fill="none"</code> on parts that must stay hollow. Line weight is the stamp's own and scales with the stamp. A pack holds at most 500 stamps, and a body at most 200&nbsp;KB.</p>
    <p>Only these elements survive import: <code>g</code>, <code>path</code>, <code>circle</code>, <code>ellipse</code>, <code>rect</code>, <code>polygon</code>, <code>polyline</code>, <code>line</code>. Only these attributes: <code>d</code>, <code>points</code>, <code>cx</code>, <code>cy</code>, <code>r</code>, <code>rx</code>, <code>ry</code>, <code>x</code>, <code>y</code>, <code>x1</code>, <code>y1</code>, <code>x2</code>, <code>y2</code>, <code>width</code>, <code>height</code>, <code>fill</code>, <code>fill-rule</code>, <code>fill-opacity</code>, <code>stroke</code>, <code>stroke-width</code>, <code>stroke-linecap</code>, <code>stroke-linejoin</code>, <code>stroke-dasharray</code>, <code>stroke-opacity</code>, <code>stroke-miterlimit</code>, <code>opacity</code>, <code>transform</code>; values are plain numbers, path data, transforms, and colors, never <code>url(...)</code>. Everything else (scripts, event handlers, <code>style</code>, <code>href</code>, text, images, <code>use</code>) is removed, on import and again whenever the world loads, and the import shows what it removed before anything lands.</p>
    <p>Stamp ids are namespaced by the pack (<code>forest__pine</code>), so two packs can each have a <code>tree</code> and neither touches the built-in one; re-importing a pack replaces its own stamps in place, and every placed stamp keeps pointing at the right symbol. A placed stamp whose pack is gone shows as a dashed box with a question mark in the editor, and the strip says which stamp is missing; pick another symbol for it, delete it, or import the pack again. The view, the HTML export, and the downloads leave a missing stamp out. Stamps are world data: they travel in the world's <code>.json</code> and are listed in <a href="#json-structure">JSON Structure</a>.</p>

    <h3>Downloading a map</h3>
    <p>In a map's view (not the editor), a <strong>Download</strong> row above the canvas writes the saved map as a file named after the map.</p>
    <ul class="concepts">
      <li><span class="term">SVG</span><p>The map as a standalone file: the drawing, with the image inlined as a data URL when it can be read, the stamps it uses resolved into the file, hidden layers left out, the map font embedded when it can be fetched (so labels keep their face when the file is opened elsewhere; offline, the viewer's serif stands in), and no pins. The root carries the canvas size, so other viewers and editors open it at the right dimensions.</p></li>
      <li><span class="term">PNG</span><p>The same drawing rasterized at twice the canvas size. A canvas large enough that twice its size would pass sixteen million pixels is scaled down to fit, so a huge map writes a smaller file rather than a blank one.</p></li>
    </ul>
    <p>A note beside the buttons says what was written and at what size. When the map's image can't be read (a folder image with no image folder connected, or a file the folder no longer has), the file is written with the drawing only and the note says so. Pins are app data with their own renderer, so they are never in the file; the world's HTML export is where a map travels with its pins, drawn through the same renderer as the app.</p>

    <h3>Limitations</h3>
    <p>No freehand brush: lines are placed point by point. No colors beyond the palette in the editor (a stamp pack can carry its own). No grid, no snapping beyond the rotation knob's Shift snap, no fog of war, no measurement or scale tools, no per-layer opacity or blend modes, no image stamps. Cartulary's map support is reference-grade: a drawn or imported map with clickable, cross-referenced, time-aware pins. If you need a virtual tabletop experience, that's a different tool.</p>
  </section>
  </div><!-- /panel-cartographia -->"""

# ─── site/helloworld.html: Import & Export ───────────────────────────────────

SITE_IE = [
    ("""This page is the full map of what can travel and in what shape: a whole world, a single template, a pack of them, a constructed language, a family tree, a calendar. The JSON is always the real backup; everything else is a copy for reading, not a save.</p>""",
     """This page is the full map of what can travel and in what shape: a whole world, a single template, a pack of them, a constructed language, a family tree, a calendar, a pack of map stamps, a single map as an image. The JSON is always the real backup; everything else is a copy for reading, not a save.</p>"""),
    ("""Cross-references become anchor links, dates render through your calendar, and maps render as static images with their pins. Read-only, for sharing with people who don't run Cartulary.</p></li>""",
     """Cross-references become anchor links, dates render through your calendar, and maps render as they do in the app, image, drawing, and pins together. Read-only, for sharing with people who don't run Cartulary.</p></li>"""),
    ("""    <h3>A calendar</h3>
    <p>A calendar exports to a <strong>.calendar.json</strong> for use in another world, and imports back. Entries bound to a calendar you replace will reckon against the new structure on the next load. Set them up in <a href="#kalendarium">Kalendarium</a>. Name collisions follow the rule below.</p>
""",
     """    <h3>A calendar</h3>
    <p>A calendar exports to a <strong>.calendar.json</strong> for use in another world, and imports back. Entries bound to a calendar you replace will reckon against the new structure on the next load. Set them up in <a href="#kalendarium">Kalendarium</a>. Name collisions follow the rule below.</p>

    <h3>A stamp pack</h3>
    <p>Map stamps travel as packs: a <strong>.cartulary-stamps.json</strong> holding a pack's name, an id, and its stamps, each an SVG body in a view box. The Stamps panel at the top of <a href="#cartographia">Cartographia</a> imports one (<strong>+ Import pack</strong>) and writes one back out (<strong>Export</strong> on a pack, or <strong>Export built-ins as a pack</strong> for a correct file to start from). Every body is run through a sanitizer on the way in, and again on every load: only plain shapes and their geometry and paint attributes survive, and the import reports what it removed before anything lands. Packs don't collide by name; stamp ids are namespaced by the pack's id, so re-importing a pack replaces its own stamps in place and leaves every other pack alone. The pack format and the allowlist are on the Cartographia page.</p>

    <h3>A map as an image</h3>
    <p>Any saved map writes itself out as a standalone <strong>.svg</strong> or <strong>.png</strong> from the <strong>Download</strong> row above the canvas in the map's view: the drawing with the image inlined, stamps resolved, hidden layers out, the map font embedded, and no pins. One-way, for use outside Cartulary; the details are on the <a href="#cartographia">Cartographia</a> page.</p>
"""),
    ("""    <p>Packs are the exception: a re-imported pack reconciles per template rather than offering this three-way choice.</p>""",
     """    <p>Packs are the exception: a re-imported template pack reconciles per template rather than offering this three-way choice, and a stamp pack replaces its own stamps by id.</p>"""),
]

# ─── site/helloworld.html: JSON Structure ────────────────────────────────────

SITE_JSON = [
    ("""  "packs":          [ ...template packs ],
  "viewPrefs":      { ...per-view UI preferences }
}</code></pre>""",
     """  "packs":          [ ...template packs ],
  "cartographia":   [ ...map records ],
  "mapStamps":      [ ...imported map stamps ],
  "viewPrefs":      { ...per-view UI preferences }
}</code></pre>"""),
    ("""Older worlds without <code>stemmas</code>, <code>celestialBodies</code>, <code>glossopoeia</code>, and so on load fine. Migration backfills each missing key to its empty default. New exports always include all keys.</p>""",
     """Older worlds without <code>stemmas</code>, <code>celestialBodies</code>, <code>glossopoeia</code>, <code>cartographia</code>, and so on load fine. Migration backfills each missing key to its empty default. New exports always include all keys.</p>"""),
    ("""    "kind":   "standard" | "map",
    "fields": [ ...field definitions ]
  },
  ...
]</code></pre>
    <p><code>kind: "map"</code> enables the map canvas in the entry editor and adds <code>mapData</code> to entries of that template.</p>""",
     """    "kind":   "standard",
    "fields": [ ...field definitions ]
  },
  ...
]</code></pre>
    <p><code>kind</code> is always <code>"standard"</code>. Through v1.5 a template could be <code>kind: "map"</code>, which put a <code>mapData</code> object on its entries; since v1.6 maps are their own records in the top-level <code>cartographia</code> array (below), and a v1.5 file's map-kind templates and entries are migrated into it on load.</p>"""),
    ("""    "fields":     { [fieldId]: value },
    "mapData":    { ...map data },   // ONLY on entries whose template kind is "map"
    "calendarId": string | null,""",
     """    "fields":     { [fieldId]: value },
    "calendarId": string | null,"""),
    ("""  <section id="js-mapdata">
    <h3>Map entry data</h3>
    <p>Entries whose template has <code>kind: "map"</code> carry a <code>mapData</code> object alongside their regular <code>fields</code>:</p>
    <pre><code>{
  "image": string | null,          // filename or data URL, same shape as an image field
  "pins":  [
    {
      "id":        string,         // e.g. "pin-a3f2c1"
      "x":         number,         // 0..1, fraction of image width
      "y":         number,         // 0..1, fraction of image height
      "label":     string,
      "entryId":   string | null,  // optional cross-reference to another entry
      "color":     string | null,  // hex override; null = inherit default pin color
      "notes":     string,
      "permanent": boolean         // optional; default false. true = always visible in time mode
    },
    ...
  ]
}</code></pre>
    <p>Pin coordinates are fractions of the image dimensions (0..1), so they stay positioned correctly if the canvas is resized. The canvas size shown in the UI (<code>sizePct</code>) is session UI state and not persisted.</p>
    <p><strong>Unlinked pins</strong> (no <code>entryId</code>) are always visible in time mode. <strong>Linked pins marked permanent</strong> are also always visible, regardless of whether the linked entry has date data. <strong>Linked pins without permanent and without date data</strong> on the linked entry are hidden in time mode.</p>
  </section>""",
     """  <section id="js-mapdata">
    <h3>The <code>cartographia</code> array</h3>
    <p>One record per map. A map is not an entry: it has no <code>templateId</code>, and its three fields are fixed.</p>
    <pre><code>[
  {
    "id":        string,                       // e.g. "map-a3f2c1"
    "name":      string,
    "tags":      [ string, ... ],
    "fields":    {                             // the three fixed fields, by id
      "cart-fld-description":  string,
      "cart-fld-scope-region": string,
      "cart-fld-notes":        string
    },
    "mapData":   { ...map data, below },
    "updatedAt": ISO-8601 timestamp
  },
  ...
]</code></pre>
    <p>A world saved by v1.5 is migrated on load: each entry of a map-kind template becomes a record here, the map-kind templates are dropped, and any extra fields a custom map template had are kept in <code>fields</code> under their old ids (not shown in the app) with a line in Notes naming them.</p>

    <h3>Map data</h3>
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
  "drawing": {                     // the vector layer under the pins
    "width":  number,              // canvas units; with an image, its natural pixel size
    "height": number,
    "background": { "fill": hex, "grain": number },   // grain 0..1; not drawn under an image
    "layers": [
      { "id": string, "name": string, "visible": boolean, "locked": boolean, "shapes": [ ...shapes ] },
      ...
    ]
  }
}</code></pre>
    <p>Each shape carries <code>id</code>, <code>type</code> (<code>rect</code>, <code>ellipse</code>, <code>polygon</code>, <code>stroke</code>, <code>text</code>, or <code>stamp</code>), <code>fill</code> and <code>stroke</code> (hex or null), and <code>strokeWidth</code> (2, 4, or 8), then by type: <code>x</code>, <code>y</code>, <code>w</code>, <code>h</code> for rect, ellipse, and stamp; <code>points</code> (<code>[[x, y], ...]</code>) for polygon and stroke; <code>smooth</code> for rect, polygon, and stroke; <code>text</code>, <code>fontSize</code> (24, 36, or 56), <code>rotation</code>, and <code>arc</code> (degrees, −180..180) for text; <code>stampId</code> and <code>rotation</code> for stamp. Layers draw in array order, so the last one is on top. Pins are not part of the drawing.</p>
    <p>Pin coordinates are fractions of the canvas (0..1), so they stay positioned correctly at any display size. The canvas size shown in the UI (<code>sizePct</code>) and the zoom are session UI state and not persisted. A malformed drawing is coerced to defaults on load (one layer, a vellum background, the default 1600&nbsp;×&nbsp;1000 size) rather than refused; a shape that can't be rendered is dropped.</p>
    <p><strong>Unlinked pins</strong> (no <code>entryId</code>) are always visible in time mode. <strong>Linked pins marked permanent</strong> are also always visible, regardless of whether the linked entry has date data. <strong>Linked pins without permanent and without date data</strong> on the linked entry are hidden in time mode.</p>

    <h3>The <code>mapStamps</code> array</h3>
    <p>Stamps imported from stamp packs, world-scoped. Built-in stamps are never stored; a map's stamp shape references them by id (<code>mountain</code>, <code>tree</code>, <code>settlement</code>, <code>compass</code>).</p>
    <pre><code>[
  {
    "id":      string,             // namespaced by pack: "&lt;packId&gt;__&lt;stamp id&gt;"
    "name":    string,
    "viewBox": string,             // "minx miny width height"
    "body":    string,             // sanitized SVG inner markup; see Cartographia, stamp packs
    "packId":  string,             // the pack's slug; "" for a stamp from no pack
    "pack":    string              // the pack's display name
  },
  ...
]</code></pre>
    <p>Every body is run through the sanitizer again on load, so editing this array by hand cannot bring in markup the import would have refused.</p>
  </section>"""),
    ("""        <tr><td style="padding:.35em .8em;border-bottom:1px solid var(--border)">Pins</td><td style="padding:.35em .8em;border-bottom:1px solid var(--border);font-family:monospace">pin-{6-char}</td></tr>""",
     """        <tr><td style="padding:.35em .8em;border-bottom:1px solid var(--border)">Maps</td><td style="padding:.35em .8em;border-bottom:1px solid var(--border);font-family:monospace">map-{6-char}</td></tr>
        <tr><td style="padding:.35em .8em;border-bottom:1px solid var(--border)">Pins</td><td style="padding:.35em .8em;border-bottom:1px solid var(--border);font-family:monospace">pin-{6-char}</td></tr>
        <tr><td style="padding:.35em .8em;border-bottom:1px solid var(--border)">Map layers</td><td style="padding:.35em .8em;border-bottom:1px solid var(--border);font-family:monospace">layer-{6-char}</td></tr>
        <tr><td style="padding:.35em .8em;border-bottom:1px solid var(--border)">Map shapes</td><td style="padding:.35em .8em;border-bottom:1px solid var(--border);font-family:monospace">shape-{6-char}</td></tr>
        <tr><td style="padding:.35em .8em;border-bottom:1px solid var(--border)">Map stamps</td><td style="padding:.35em .8em;border-bottom:1px solid var(--border);font-family:monospace">{pack id}__{stamp id}</td></tr>"""),
    ("""      <li>Migrates any pre-v1.5 inline calendar moon data into <code>celestialBodies</code> and rewrites the calendar's <code>celestials</code> array to id refs</li>
    </ul>""",
     """      <li>Migrates any pre-v1.5 inline calendar moon data into <code>celestialBodies</code> and rewrites the calendar's <code>celestials</code> array to id refs</li>
      <li>Moves the entries of any v1.5 map-kind template into the <code>cartographia</code> array and drops the map-kind templates</li>
      <li>Backfills <code>mapData.drawing</code> on every map record and re-sanitizes every stamp body in <code>mapStamps</code></li>
    </ul>"""),
]


edit(MOD / "24_home-data.jsx", [(HELP_OPENING_OLD, HELP_OPENING_NEW), (HELP_STAMPS_HEADING_OLD, HELP_STAMPS_HEADING_NEW)] + HELP_STAMPS_BUTTONS + [(HELP_LIMITS_OLD, HELP_LIMITS_NEW)] + HELP_ELSEWHERE)
edit(MOD / "16_trunk.jsx", TRUNK_INTRO)
replace_span(SITE, SITE_CARTO_START, SITE_CARTO_END, SITE_CARTO_NEW)
edit(SITE, SITE_IE + SITE_JSON)

print("r038 applied")
