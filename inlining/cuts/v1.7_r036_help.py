"""v1.7 r036: the help, Stemma v2's twelfth cut (docs/stemma-v2-spec.md,
section 11's item 12).

The Home view's help brought level with the build. The Stemma topic is
rewritten in three parts: the index and the two layouts, then the rota
(focal and slots, the two node kinds, the smart input, the inspector, the
orbit drag and Alt+arrows of r034, the keys, the zoom, undo, no depth cap),
the tabula (the rail's five kinds and placing, the camera, cards and the
inspector, selection, columns with lanes, dividers and rows, stacks under
cards, sub-boards, the drawing layer, the keys, the locked world), and
import and export (envelopes 1 and 2, the import rules, the Markdown
export of r035); the "What's not in v1" list is gone, every item on it
having shipped or been retired. Around it: Views & Pages' Stemma line;
the Accessibility topic's pan-and-zoom line (Chronometric stays
mouse-only, Stemma's keys are listed, what still needs a pointer); Save &
Share gains the Stemma Markdown export beside the family tree's;
Concordance lists stemmas among its sources, their `links` edges, and a
"What feeds the graph" bullet; Getting Started's no-undo line names
Stemma; Field Types' Entry Reference reaches stemmas; the Templates
topic's half-width bullet says the true rule (type and order, nothing
marked).

The JSON schema topic: the stemma block gains `layout`, the tabula's board
and items (x, y, w; lanes and a lane's own w; flow; stacks; shapes with
anchors), the coercion on load, and the export envelope; the field
definitions block is brought level with the site's (help on hover,
required, otherTextField, dependsOn and optionsByParent, refTemplates and
the id spellings, refFilters, showWhen, the legacy halfWidth); the help
and nameHelp lines say hover; the celestial body's stale "system template"
comment becomes its real tail (tags and the descriptive fields); the map
shape line gains the stroke's `arrow`; ID conventions list maps, pins,
layers, shapes, stamps, stemmas, nodes, Fabula records, calendars, bodies,
and seasons with their true formats ({time}-{6-char} where genId is used
whole); Migration lists the v1.5, v1.6, and v1.7 steps and the tabula
coercion.

Declared scope: 26_home-data.jsx. No declarations added, no header added.

String-anchored edits; every anchor must occur exactly once. Run from
anywhere inside the repository:
    python3 inlining/cuts/v1.7_r036_help.py
"""
from pathlib import Path

ROOT = next(p for p in Path(__file__).resolve().parents if (p / 'cartulary-src').is_dir())
MODULES = ROOT / "cartulary-src" / "modules"


def edit(path, pairs):
    text = path.read_text(encoding="utf-8")
    for old, new in pairs:
        n = text.count(old)
        assert n == 1, f"{path.name}: anchor occurs {n} times, not 1:\n{old[:200]}"
        text = text.replace(old, new)
    path.write_text(text, encoding="utf-8")

UNDO_OLD = r"""- **No undo, except in the map editor.** Cartulary doesn't have undo/redo outside the map editor's own Undo and Redo. If you delete"""
UNDO_NEW = r"""- **No undo, except in the map editor and Stemma.** Cartulary doesn't have undo/redo outside the map editor's and the Stemma canvases' own Undo and Redo. If you delete"""

SAVE_OLD = r"""Descendant depth caps at 6 generations.

**Fabula's export.**"""
SAVE_NEW = r"""Descendant depth caps at 6 generations.

**Stemma's markdown export.** Every stemma has a **Markdown** button beside **Export**, on its row on the Stemmas index and on its canvas's top bar. Downloads the document as Markdown: the name, the description, then a rota's tree as a nested list in slot order, a linked node written as a wiki-link to its record's name, or a tabula's board as lists under headings, column by column, sub-boards as nested sections. Filename is the stemma's slug plus \`.stemma.md\`, e.g. \`plot-threads.stemma.md\`. There's no secrets switch: it writes the nodes' and cards' own text and the records' names. **Cannot be re-imported**; the \`.stemma.json\` export is the one that comes back. The world's own exports above leave stemmas out; the \`.json\` carries them. See Stemma.

**Fabula's export.**"""

HALF_OLD = r"""- **Half-width pair layout.** Eligible field types can be marked half-width. The builder auto-pairs contiguous half-width fields onto the same row in the rendered entry form. Pairing happens after show-when evaluation, so dynamically-hidden fields don't disrupt pairing."""
HALF_NEW = r"""- **Half-width pairs.** Fields of the half-eligible types (Short Text, Number, Date, Calendar Date, Color, URL, Tags, Dropdown, single-value Entry Reference) pair onto one row when they sit next to each other in the template's field order; nothing is marked, the type and the order decide. Pairing happens after show-when evaluation, so a hidden field doesn't leave a stranded slot. The full rule is under Field Types."""

REF_OLD = r"""or to a record that isn't an entry: an Astronomical Body, a Glossopoeia record, or a Map, which the template builder lists after the templates. Deleting the referenced entry, body, or map, or the template an entry belongs to,"""
REF_NEW = r"""or to a record that isn't an entry: an Astronomical Body, a Glossopoeia record, a Map, or a Stemma, which the template builder lists after the templates. Deleting the referenced entry, body, map, or stemma, or the template an entry belongs to,"""

VIEWS_OLD = r"""- **Stemma** — radial mind-map view for tree-shaped content that doesn't fit into a single entry: plot threads, theme webs, organizational hierarchies, decision branches. Freeform or entry-linked nodes; click any child to drill in. Each stemma is a portable document, with single-file JSON import/export."""
VIEWS_NEW = r"""- **Stemma**: the mind-map view. Each stemma is a document of its own, a **rota** (a radial tree with a focal node at the center; click a child to drill in) or a **tabula** (a board of notes, linked cards, and images, columns with lanes and rows, stacks under cards, boards inside boards, and lines drawn between them). Nodes and cards link to any record of the world. JSON import and export per document, and a Markdown export. See Stemma."""

STEMMA_OLD = r"""  { id: "stemma", title: "Stemma", content: `Stemma is a radial mind-map view for tree-shaped content that doesn't fit cleanly into a single entry: plot threads, theme webs, organizational hierarchies, decision branches, classification systems. Each stemma is its own document in your world, listed on the Stemmas index page when you click **Stemma** in the sidebar.

A stemma has one **focal node** at the center, surrounded by 16 fixed slots arranged clockwise from 12 o'clock. Each slot can hold a child node or stay empty. Click a child to **drill in** — that child becomes the new focal, with its own children radiating around it. The breadcrumb at the top of the canvas shows the ancestor path; click any segment to jump back up, or use **Back to root** to return to the top of the tree. The stemma's own name (top-left of the canvas, just right of **← Stemmas**) is click-to-edit.

**Drillable indicator.** Children that have their own children show a small line radiating outward from the node — visual cue that clicking will drill in to a non-empty subtree. Children without descendants render plain. Doesn't change interaction; clicking the node itself remains the way to drill in.

**Zoom.** Ctrl+scroll (or Cmd+scroll on Mac) over the canvas zooms in or out, range 0.5×–2.5×. Plain scroll pans the visible area when you're zoomed in past 1.0× and the content overflows the pane. Mirrors the Chronometric timeline's zoom pattern; mouse-only, no keyboard shortcut.

**Two node kinds.** *Freeform* nodes have an editable label, color, and icon — useful for ad-hoc concepts that don't have an entry to anchor to ("Act II climax", "morality theme", "the missing letter"). *Linked* nodes bind to an existing entry and pull their display from that entry's template (the template's icon and color appear on the node), with a small chain badge ⛓ marking them. The label shows the entry's *current* name — rename the entry and the node updates automatically.

**Adding nodes.** Empty slots show a faint **+** button. Click it for a smart input: type a name, and matching entries from your world appear as suggestions below the input. Pick a suggestion (mouse or arrow keys + Enter) to create a linked node; ignore the suggestions and press Enter alone to create a freeform node with the typed text as its label. Esc cancels.

**Inspector.** Click any node to open the right-side inspector. For freeform nodes you can edit the label, color, and icon. For linked nodes you get a preview card and a jump-to-entry link. Any node can be **converted** between freeform and linked from the inspector footer; converting linked → freeform promotes the cached entry name to the new freeform label so nothing is lost. The inspector footer also carries a **Delete node** button on any non-root node; it removes that node and its whole subtree, with a confirmation when the node has children. The root node can be edited like any other but cannot be individually deleted — to remove an entire stemma, use **Delete** on its row in the Stemmas index page.

**Orphans.** If a linked node's entry is later deleted, the node becomes an **orphan**: desaturated fill, italic label, broken-link icon. The cached name from when the link was first created is shown so you remember what it was. Use the inspector to **re-link** the node to a different entry, or **convert to freeform** with the cached name as the new label.

**Import / export.** Each stemma exports as a single \`.stemma.json\` file via the **Export** button on the canvas top bar (right side) or the per-row Export button on the index page. Import via the **Import** button on the index. On import: every node id is regenerated to avoid colliding with existing data, name collisions prompt a Skip / Replace / Rename modal, and linked nodes whose entry IDs don't exist in the destination world land as orphans (you'll get a count in the import flash). Cross-world transfers use strict entry-ID matching only — there's no fuzzy name matching, so linked nodes usually need manual re-linking after a cross-world import.

**What's not in v1:**

- **Sibling reordering** — slot is fixed at the moment of creation; no drag-between-slots
- **Maximum depth cap** — deep trees just keep working, no enforced ceiling
- **Undo / redo**: Stemma has none (the map editor has its own)
- **Markdown export** — JSON only for now
- **World-tag pool integration** — stemma tags display on the index but don't auto-merge into the world's tag autocomplete
- **Mobile UX** — desktop-first; the radial canvas isn't tuned for narrow viewports yet` },"""
STEMMA_NEW = r"""  { id: "stemma", title: "Stemma", content: `Stemma is for the thinking that doesn't fit inside one entry: plot threads, theme webs, lines of succession, decision trees, a board of loose notes. Each stemma is a document of its own in the world, listed on the Stemmas index when you click **Stemma** in the sidebar, and it comes in two layouts. A **rota** is a radial tree: one node at the center, its children around it, and you drill in to re-center on any of them. A **tabula** is a board: cards where you put them, columns they stack in, boards inside boards, lines drawn between them. Each index row names its layout, counts its nodes or its cards and columns, and carries **Export**, **Markdown**, and **Delete**; **+ New Rota** and **+ New Tabula** make one, and **Import** brings a \`.stemma.json\` back in. A locked world hides Delete, the two new buttons, and Import. Click a row to open it. On either canvas, **← Stemmas** returns to the index, and the name beside it is click-to-edit.

A stemma is a record of the world the way a map is: an Entry Reference field can point at one (a story's Brainstorm field in Fabula does), a linked node in another stemma can, and Concordance draws it as a node with a **links** edge to every record its linked nodes or cards point at.

**The rota**

**Focal and slots.** One **focal node** sits at the center with sixteen slots around it, clockwise from 12 o'clock; each slot holds one child or stays empty. Click a child to **drill in**: it becomes the focal, with its own children around it. The breadcrumb along the top is the path from the root; click a segment to go back up, or **Back to root**. A child that has children shows a short line radiating outward, so you know a click goes somewhere. There's no depth cap; a tree goes as deep as you take it.

**Two node kinds.** A *freeform* node has a label, a color, and an icon you set, for the ideas with no record behind them ("Act II climax", "the missing letter"). A *linked* node points at a record of the world: an entry, or an Astronomical Body, a map, a Glossopoeia or Fabula record, another stemma. It takes the record's icon and color, wears a small chain badge ⛓, and shows the record's current name, so a rename follows on its own. If the record is later deleted, the node becomes an **orphan**: desaturated, italic, a broken-link icon, still showing the name it had when linked, so you can tell what it was.

**Adding nodes.** An empty slot shows a faint **+**. Click it (or press **N**, which takes the first empty slot) for the smart input: type, and up to eight matching records appear beneath; pick one with the mouse or the arrow keys and Enter for a linked node, or press Enter with no suggestion taken for a freeform node with what you typed as its label. Esc cancels.

**The inspector.** Click the focal node, the one at the center, to open the panel on the right; to inspect a child, drill into it first, since a click on a child drills in. A freeform node's label, color, and icon are edited there; a linked node shows a preview card and, where its record can be opened, an **Open** button. The footer converts either way (**Convert to linked entry**; **Convert to freeform**, which keeps the name the node was linked under as its label), **re-links** a linked or orphaned node to a different record, and **Delete node** removes a node with its whole subtree, after a confirmation that counts what goes with it. The root can be edited but not deleted; to remove a whole stemma, use **Delete** on its row in the index.

**Reordering.** Drag a child around the orbit: it snaps to the nearest slot as it goes, lands in an empty one, or swaps with the sibling whose slot it's dropped on; Esc mid-drag cancels. A press that never moves is a click, and drills in. Alt+Left and Alt+Right move the focused child to the next free slot either way round.

**Keys.** Left and Right walk the focus around the children, clockwise and back, wrapping; Enter drills into the focused child; Backspace goes up to the parent; Home to the root; Delete removes the focused child, with the same confirmation; N opens the smart input; Esc closes the inspector, then clears the focus. + and − zoom and 0 returns to 100%; Ctrl+scroll (Cmd+scroll on a Mac) zooms too, 50% to 250% in steps of 1.15, and plain scroll pans when the canvas overflows. The keys rest while you're typing, while the smart input is open, and during a drag.

**Undo.** Every change goes through **Undo** and **Redo** on the top bar, Ctrl+Z and Ctrl+Y (Ctrl+Shift+Z too): adds, deletes, moves, conversions, edits (a run of typing in one field is one step). The history holds fifty steps and lasts while the canvas is open.

**The tabula**

**The board.** A board is a canvas without edges. Cards sit where you drop them, snapped to a 10-pixel grid, and keep their order front to back; a drag raises the card. The rail on the left adds five kinds. A **Note** has a title and a Markdown body, where \`[[wiki-links]]\` resolve. A **Link** is a card for an entry or any record of the world, as the rota's linked node is, and orphans the same way. An **Image** is a picture from a file, or one dropped onto the canvas, stored as a map's image is: in the images folder when one is connected, otherwise inside the save file, with a confirmation past 1 MB. A **Column** is a stack that cards drop into. A **Board** is a board inside this one. Click a rail button to add one at the center of the view, or drag it onto the canvas to place it; double-click empty canvas for a new note. A new note, column, or board opens for its title at once (Enter moves from a note's title to its body, Esc closes the fields); a new Link opens the smart input where you put it.

**The camera.** Ctrl+scroll (Cmd+scroll on a Mac) zooms about the pointer, 25% to 200% in steps of 1.15; plain scroll pans, Shift+scroll pans sideways, a pinch zooms. Hold **Space** and drag, or drag with the middle button, to pan; in a locked world any drag on empty canvas pans. The bar in the canvas's corner has −, the zoom, +, and **Fit**; the keys + and − zoom and 0 fits. Each board remembers where you left it, in this browser with the theme and the font size, not in the world file; the first time, it opens at Fit.

**Cards.** Click a card to select it and open the inspector on the right: a note's title, body, and color; a linked card's preview with **Open**, **Re-link to a different record**, and **Convert to note**; an image's caption and **Replace image…**; a column's or board's title and color (a board has an icon too, and **Open board →**); **Duplicate**; and **Delete**. Double-click a note or a column to edit it in place. Drag a card by its grip ⋮⋮ (a column by its header) to move it; the handle on its right edge sets its width, 160 to 800 pixels (an image down to 80; a column, or a card with stacks under it, up to 2400).

**Selecting several.** Shift+click adds a card to the selection or takes it out; a drag on empty canvas draws a marquee and selects the placed cards it encloses, Shift adding them. The panel on the right then counts them. Drag any grip to move the placed ones together, onto the board, into a column in their order, or into a sub-board as they sit; the arrows nudge them by the grid; Ctrl+C copies, Ctrl+V pastes around the view's center (into another board too), Ctrl+D duplicates beside, Ctrl+A selects all, Delete deletes.

**Columns, lanes, and rows.** Drop a card on a column and it joins the stack at the gap the line shows; drag it out onto the canvas to free it. A column's **Cards per row** (1 to 6) splits it into **lanes** side by side, each a stack with a title, the cards keeping their places when the count changes; a column dropped onto a column becomes a lane of it, and a lane can hold lanes in turn. Drag the divider between two lanes to set the width of the one before it; the last lane takes what's left, and no lane goes under 80 pixels. **Lay out** switches a plain column between **Stack** (cards under each other) and **Row** (cards side by side, each as wide as what it holds, the column growing to fit). Deleting a column that holds cards asks: **Move out** puts them on the canvas where they stood, **Delete everything** takes them with it.

**Stacks under a card.** Any note, linked card, or image can hold columns, drawn under it: **Add a stack** in the inspector, or drop a column onto the card. **Stacks under it** (1 to 6) sets how many sit side by side, each a column with a title and cards, and a stacked card's **Holds** line counts them. A row of cards that each carry stacks is how a lineage draws as an org chart: a master as a note, the apprentices a row in its stack, their own apprentices rows under them. Deleting a card with stacks asks the same question; **Move out** puts the stacks on the canvas whole.

**Sub-boards.** A board card is a board inside this one. Double-click it to open it (the inspector's **Open board →** does the same); the breadcrumb along the top walks back out, and **Back** goes up one. Drop a card onto a board card and it goes inside; the edge nearest the pointer, marked as you drag, decides which side of the board's content it lands on. Cards and lines on a sub-board stay on it.

**Lines.** Below the card tools on the rail: **Select**, **Line**, and **Freehand**. Line places points click by click; a double-click, Enter, or a right-click finishes it, Esc discards it. Freehand draws in one drag, simplified on release, its ends free. An end put down on a card sticks to it and follows the card; off a card it comes free. Select picks a line to move it, drag its points, nudge it with the arrows, or delete it. The panel on the right holds the map palette's eight stroke colors, the width, **Smooth**, and **Arrowheads** (none, at the end, or at both ends), editing the selected line or setting the next one's defaults. Esc leaves the tool for the cards.

**Keys.** Esc discards a line in progress, deselects a line, and leaves a drawing tool; otherwise it closes the picker, ends an edit, then deselects. Delete or Backspace deletes the selection, or the selected line; the arrows nudge by the grid; Ctrl+C, Ctrl+V, Ctrl+D, and Ctrl+A as above; + − 0 for the camera; Space held turns a drag into a pan. Undo and Redo are on the top bar, Ctrl+Z and Ctrl+Y (Ctrl+Shift+Z too), fifty steps while the canvas is open, a drag or a run of typing one step.

**Locked.** With the world locked, both canvases open read-only: the tabula's rail and both canvases' Undo and Redo are gone, the inspectors' fields are disabled, a press on a rota child drills in and nothing moves, and a drag on empty tabula canvas pans. The view's keys still work (the rota's walk and drill, both zooms), and so do Export and Markdown.

**Import and export**

**JSON.** **Export** on a row of the index or on the canvas's top bar downloads the stemma as \`<slug>.stemma.json\`: a rota in envelope 1, a tabula in envelope 2, so an older build without boards refuses a tabula's file rather than misread it. **Import** on the index reads either. Every id is regenerated so nothing collides with what's already here; a name already in use opens a Skip / Replace / Rename modal; a linked node or card whose record isn't in this world lands as an orphan, and the import flash counts them. Records are matched by id alone, never by name, so after a cross-world import the links usually want re-linking.

**Markdown.** **Markdown**, beside Export in both places, downloads \`<slug>.stemma.md\`: the name as a heading, the description, then a rota's tree as a nested list in slot order from 12 o'clock (a linked node a \`[[wiki-link]]\` to its record's name, which a longform field resolves when the record is an entry or a body; an orphan its cached name, marked unlinked), or a tabula's board: its free cards in reading order as a list, each column a heading with its cards listed, lanes as headings below it, a sub-board a nested section, stacks as nested lists under their card, an empty column marked, lines left out. It can't be re-imported; the JSON is the copy that comes back.` },"""

CONC_OLD = r"""Inflection Classes, and Writing Systems, Maps, and Fabula's records (corpora, stories, cast, arcs, relationships, plot points, promises, parts, chapters, scenes, and research notes), which share one **Fabula** row."""
CONC_NEW = r"""Inflection Classes, and Writing Systems, Maps, Stemmas, and Fabula's records (corpora, stories, cast, arcs, relationships, plot points, promises, parts, chapters, scenes, and research notes), which share one **Fabula** row."""

CONC2_OLD = r"""a scene to its POV, participants, setting, threads, and motifs, and so on. It's force-directed"""
CONC2_NEW = r"""a scene to its POV, participants, setting, threads, and motifs, and so on; a stemma's run from the document to every record its linked nodes or cards point at, each labeled \`links\`. It's force-directed"""

FEEDS_OLD = r"""- **Repeating Group subfields.** The graph walks into every group instance, so entry-ref subfields (and wiki-links in text subfields) inside a repeating group feed edges the same as top-level fields.
"""
FEEDS_NEW = r"""- **Repeating Group subfields.** The graph walks into every group instance, so entry-ref subfields (and wiki-links in text subfields) inside a repeating group feed edges the same as top-level fields.
- **Stemma links.** A stemma has an edge to every record its linked nodes (a rota) or linked cards (a tabula) point at, one per record.
"""

ACC_OLD = r"""- **Chronometric and Stemma pan/zoom are mouse-only.** Both views use Ctrl+scroll (or Cmd+scroll on Mac) for zoom; Chronometric also uses drag-to-pan. No keyboard equivalents."""
ACC_NEW = r"""- **Chronometric's pan and zoom are mouse-only.** Ctrl+scroll (or Cmd+scroll on Mac) zooms and a drag pans; there is no keyboard equivalent. Stemma's canvases do better: a rota is walked, drilled, reordered, and zoomed from the keyboard (Left and Right, Enter, Backspace, Home, Delete, N, Alt+Left and Alt+Right, + − 0), and a tabula zooms and fits with + − 0, nudges the selection with the arrows, and copies, pastes, duplicates, selects all, and deletes from the keyboard. Panning a tabula (Space held with a drag, the middle button, or scroll), placing a card, drawing a line, or moving a card into a column still needs a pointer, and a screen reader can't walk either canvas. See Stemma."""

CEL_OLD = r"""    "phaseAnchorDay":   number | null            // absolute day on which the moon was New
    // ...plus kind-specific fields layered on via the celestial-body system template
  },"""
CEL_NEW = r"""    "phaseAnchorDay":   number | null,           // absolute day on which the moon was New
    "tags":             string,                  // one string, not an array
    // ...and the workspace's descriptive fields, strings unless noted: otherNames, type,
    // status, discoveredFounded, rotationPeriod, atmosphere, gravity, visibleFrom (array),
    // notableLocations (array), inhabitedBy (array), sacredTo (array), physicalProperties,
    // climateConditions, mythologicalSignificance, description, history, notes
  },"""

FIELDS_OLD = r"""**Field definitions (within \`templates[].fields\`):**

\`\`\`
{
  "id":       string,                          // e.g. "fld-description-71b4"
  "label":    string,
  "type":     one of:
              "text" | "textarea" | "tags" | "select" | "multiselect" |
              "number" | "date" | "calendar-date" | "calendar-date-range" |
              "url" | "color" | "image" | "entry-ref" | "name-history" |
              "group" | "longform" | "grid",
  "secret":   boolean                          // optional, default false

  // type-specific:
  "options":      [ string, ... ],             // type "select" — dropdown options
  "refTemplate":  string,                      // type "entry-ref" — by template NAME (not id)
  "multi":        boolean,                     // type "entry-ref" — single vs multi-select
  "relationKind": "parent" | "spouse",         // type "entry-ref" — drives Linea
  "subfields":    [ ...field definitions ]     // type "group" — nestable up to 3 levels deep (group→group→group; level-3 subfields cannot be groups)
}
\`\`\`

\`refTemplate\` references a template by its \`name\` (case-sensitive), not by ID. The \`resolveTemplateRefs\` step at load time also writes a \`refTemplateId\` for runtime use, but the canonical reference in your JSON is the name."""
FIELDS_NEW = r"""**Field definitions (within \`templates[].fields\`):**

\`\`\`
{
  "id":        string,                         // e.g. "fld-description-71b4"
  "label":     string,
  "type":      one of:
               "text" | "textarea" | "tags" | "select" | "multiselect" |
               "number" | "date" | "calendar-date" | "calendar-date-range" |
               "url" | "color" | "image" | "entry-ref" | "name-history" |
               "group" | "longform" | "grid",
  "help":      string,                         // optional; shown when the field's label
                                               //   is hovered
  "required":  boolean,                        // optional; default false; the form
                                               //   won't save while it's empty
  "secret":    boolean,                        // optional; default false

  // type-specific:
  "options":         [ string, ... ],          // "select" / "multiselect": the choices,
                                               //   "Other" among them when the next key
                                               //   is on
  "otherTextField":  boolean,                  // "select" / "multiselect": picking
                                               //   Other opens a text box for a choice of
                                               //   your own
  "dependsOn":       string,                   // "select": the id of a select beside it
                                               //   whose value picks this one's choices
  "optionsByParent": { [parentChoice]: [ string, ... ] },
                                               // "select", with dependsOn: the choices
                                               //   offered for each value of the parent
  "refTemplates":    [ string, ... ],          // "entry-ref": the target templates by
                                               //   NAME; a registered source's name
                                               //   counts ("Astronomical Body", "Map",
                                               //   "Stemma", "Cast (Fabula)")
  "refTemplatesId":  [ string, ... ],          // "entry-ref": the same targets by id,
                                               //   written at load from the names and by
                                               //   the builder
  "refTemplate":     string,                   // "entry-ref", one target: the same pair
                                               //   in the singular
  "refTemplateId":   string,
  "refFilters":      { [templateName]: { "fieldId": string, "allowedValues": [ string, ... ] } },
                                               // "entry-ref": of that template, offer
                                               //   only the entries whose field holds one
                                               //   of the values
  "multi":           boolean,                  // "entry-ref": single vs multi-select
  "relationKind":    "parent" | "spouse",      // "entry-ref": drives Linea and
                                               //   Chronometric's Marriages lane
  "subfields":       [ ...field definitions ],
                                               // "group": nestable up to 3 levels deep
                                               //   (group→group→group; level-3 subfields
                                               //   cannot be groups)

  // any type:
  "showWhen":        { "fieldId": string, "values": [ string, ... ] },
                                               // shown only while that field (same
                                               //   template, or same group) holds one of
                                               //   the values
  "halfWidth":       boolean                   // legacy; left on some built-in fields
                                               //   and ignored since v1.3
}
\`\`\`

Targets and parents come in two spellings, by name and by id, because field ids are generated per world while a built-in template or a pack file has to name its targets before the world exists. The authored form is the name: \`refTemplate\` or \`refTemplates\` (template names, case-sensitive), a filter's \`fieldLabel\` in place of its \`fieldId\`, a cascade's \`dependsOnLabel\` in place of \`dependsOn\`, and a condition's \`fieldLabel\` in \`showWhen\`. \`resolveTemplateRefs\` resolves each to its id when the world loads (\`refTemplateId\`, \`refTemplatesId\`, \`fieldId\`, \`dependsOn\`), and since v1.7 saving a template writes the names back from the ids, so the two stay in step. In a file you write by hand, give the names and let the ids follow; a name that resolves to nothing is kept, so a target restored later is targeted again, and a filter whose field can't be found falls back to no filter.

A cascade (\`dependsOn\`) and a condition (\`showWhen\`) reach only fields at their own level: a top-level field names a top-level field, a subfield names a sibling in the same group. A condition on a multi-select parent is met when any of the parent's picks is among \`values\`; one whose parent can't be found stays visible rather than hide data. A select with \`otherTextField\` stores \`{ value, customText }\` once Other is picked, and a multi-select stores the typed answers beside the picked options, as the Field values by type table below shows."""

NAMEHELP_OLD = r"""  "nameHelp":  string,                            // the help line under the name"""
NAMEHELP_NEW = r"""  "nameHelp":  string,                            // shown when the name field is hovered"""

HELP_OLD = r"""plus: \`help\`, the line shown under the field;"""
HELP_NEW = r"""plus: \`help\`, shown when the field's label is hovered;"""

STEMMA_SCHEMA_OLD = r"""**\`stemmas\` array — each stemma document:**

\`\`\`
{
  "id":          string,                       // e.g. "stem-{4-char-suffix}"
  "name":        string,
  "description": string,
  "tags":        [ string, ... ],
  "root":        { ...stemma node, recursive },
  "createdAt":   ISO-8601 timestamp,
  "updatedAt":   ISO-8601 timestamp
}
\`\`\`

A **stemma node** is one of:

\`\`\`
// Freeform node (user-typed content, not tied to any entry)
{
  "id":       string,                          // e.g. "n-{4-char-suffix}"
  "slot":     number,                          // 0..15 (sixteen radial slots clockwise from 12 o'clock)
  "type":     "freeform",
  "label":    string,
  "color":    string,                          // hex
  "icon":     string,                          // single character or symbol
  "children": [ ...stemma nodes ]
}

// Linked node (references an existing entry)
{
  "id":          string,
  "slot":        number,
  "type":        "linked",
  "entryId":     string,                       // references entries[].id
  "_cachedName": string,                       // optional fallback label if the entry is missing on load
  "children":    [ ...stemma nodes ]
}
\`\`\`

The root node has \`slot: 0\` by convention. Child slots are unique within their parent's children (the editor enforces this; defensive imports skip duplicate slots). Nesting is unbounded but the UI only renders meaningful drill-down for the focal node and its immediate children."""
STEMMA_SCHEMA_NEW = r"""**\`stemmas\` array — each stemma document:**

\`\`\`
{
  "id":          string,                       // e.g. "stem-{time}-{6-char-suffix}"
  "name":        string,
  "description": string,
  "tags":        [ string, ... ],
  "layout":      "tabula",                     // v1.7; a rota has none, so nothing
                                               //   migrates
  "root":        { ...a rota node, or a tabula's board node },
  "createdAt":   ISO-8601 timestamp,
  "updatedAt":   ISO-8601 timestamp
}
\`\`\`

A **rota node** is one of:

\`\`\`
// Freeform node (your own label, not tied to any record)
{
  "id":       string,                          // e.g. "n-{time}-{6-char-suffix}"
  "slot":     number,                          // 0..15 (sixteen radial slots clockwise
                                               //   from 12 o'clock)
  "type":     "freeform",
  "label":    string,
  "color":    string,                          // hex
  "icon":     string,                          // single character or symbol
  "children": [ ...rota nodes ]
}

// Linked node (points at a record)
{
  "id":          string,
  "slot":        number,
  "type":        "linked",
  "entryId":     string,                       // an entry's id, or a registered
                                               //   record's: a body, a map, a Glossopoeia
                                               //   or Fabula record, another stemma
  "_cachedName": string,                       // the record's name when linked; shown
                                               //   once it is gone
  "children":    [ ...rota nodes ]
}
\`\`\`

The root node has \`slot: 0\` by convention. Child slots are unique within their parent's children (the editor enforces this; defensive imports skip duplicate slots). Nesting is unbounded.

A **tabula's root** is a board node, and a board holds items placed by position, in z-order, with its lines:

\`\`\`
{
  "id":     string,
  "type":   "board",
  "title":  string,
  "color":  string,                            // hex
  "icon":   string,
  "items":  [ ...placed items ],               // drawn in array order, the last on top
  "shapes": [ ...lines ]
}
\`\`\`

An item is a note, a linked card, an image, a column, or a board. Placed on a board it carries \`x\`, \`y\`, and \`w\` (integers, canvas pixels at 100%; heights are never stored); inside a column it carries none of them, though a lane may keep a \`w\` of its own (below):

\`\`\`
// a note; the body is Markdown
{ "id": string, "type": "note",   "title": string, "body": string, "color": hex }
// a linked card, as the rota's linked node
{ "id": string, "type": "linked", "entryId": string, "_cachedName": string }
// an image: a filename in the images folder ("<stemma id>-<item id>.<ext>") or a data URL
{ "id": string, "type": "image",  "image": string, "caption": string }
// a column; flow only on a row, absent on a stack
{ "id": string, "type": "column", "title": string, "color": hex, "items": [ ... ],
  "flow": "row" }
// a sub-board, shaped as above, with its own items and shapes
{ "id": string, "type": "board",  ... }
\`\`\`

A column holds cards or lanes, never both: its \`items\` are cards, or columns laid side by side (lanes), at any depth. A lane, or a stack under a card, may carry \`w\` alone, its width; the last lane takes what's left. Any card but a column or a board may carry \`items\` too: columns, its stacks, drawn under it; a card with none has no \`items\` key. A line in \`shapes\` is the map editor's stroke (\`id\`, \`type: "stroke"\`, \`points\`, \`fill\` (null), \`stroke\`, \`strokeWidth\`, \`smooth\`, \`arrow\`) plus \`anchors\`, \`{ "start": item id | null, "end": item id | null }\`, the cards its ends stick to on this board. On load a tabula is coerced, never refused: a card loose among lanes goes into the first lane, a stray value lands on a default, and an item of a type this build doesn't know is kept and not drawn.

The single-file export wraps the document: \`{ "cartulary_stemma_export": 1 | 2, "exported_at": timestamp, "stemma": {...} }\`, 1 for a rota and 2 for a tabula; a build without boards refuses envelope 2, and this build refuses anything above 2."""

SHAPE_OLD = r"""\`smooth\` for rect, polygon, stroke, and region; \`text\`, \`fontSize\`"""
SHAPE_NEW = r"""\`smooth\` for rect, polygon, stroke, and region; \`arrow\` (\`none\`, \`end\`, or \`both\`, the arrowheads) for stroke; \`text\`, \`fontSize\`"""

IDS_OLD = r"""IDs are arbitrary strings, but Cartulary's own generators follow:

- Templates: \`tpl-{slug}-{4-char-suffix}\`
- Entries: \`ent-{slug}-{4-char-suffix}\`
- Fields: \`fld-{slug}-{4-char-suffix}\`
- Pins: \`pin-{6-char-suffix}\`
- Stemmas: \`stem-{4-char-suffix}\`
- Stemma nodes: \`n-{4-char-suffix}\`
- Calendars (non-primary): \`cal-{4-char-suffix}\`
- Celestial bodies: \`cel-{4-char-suffix}\`
- Seasons: \`sea-{4-char-suffix}\`

The slug is derived from the name, the suffix is randomized to avoid collisions. You can use any string format as long as you maintain uniqueness within scope."""
IDS_NEW = r"""IDs are arbitrary strings, but Cartulary's own generators follow:

- Templates: \`tpl-{slug}-{4-char-suffix}\`
- Entries: \`ent-{slug}-{4-char-suffix}\`
- Fields: \`fld-{slug}-{4-char-suffix}\`
- Maps: \`map-{6-char-suffix}\`
- Pins: \`pin-{6-char}\`
- Map layers: \`layer-{6-char-suffix}\`
- Map shapes: \`shape-{6-char-suffix}\`
- Map stamps: \`{pack id}__{stamp id}\`
- Stemmas: \`stem-{time}-{6-char-suffix}\`
- Stemma nodes and tabula items: \`n-{time}-{6-char-suffix}\`
- Fabula records: \`fab-{kind}-{time}-{6-char-suffix}\`
- Calendars (non-primary): \`cal-{time}-{6-char-suffix}\`
- Celestial bodies: \`cel-{time}-{6-char-suffix}\`
- Seasons: \`sea-{time}-{6-char-suffix}\`

\`{time}\` is the moment of creation in base 36, a slug is derived from the name, and a suffix is random, to avoid collisions. You can use any string format as long as you maintain uniqueness within scope."""

MIG_OLD = r"""- Backfills new built-in templates that didn't exist when the world was created (unless their name is in \`seededBuiltins\` — i.e., the user previously deleted them)
- Backfills new fields on existing built-in templates (similar logic via \`seededFields\`)
- Renames built-in templates when the \`TEMPLATE_RENAMES\` table specifies a rename, preserving entries by keeping the template's id stable
- Renames fields when the \`FIELD_RENAMES\` table specifies a rename, preserving values by keeping the field's id stable
- Migrates icons listed in \`ICON_MIGRATIONS\`
- Strips self-references from any entry-ref field (an entry can't reference itself)
- Normalizes legacy \`relationKind\` field values from bare ID strings into the \`{id, label?, status?}\` object shape"""
MIG_NEW = r"""- Backfills new built-in templates that didn't exist when the world was created (unless their name is in \`seededBuiltins\`, meaning the user deleted them on purpose)
- Backfills new fields on existing built-in templates (similar logic via \`seededFields\`)
- Renames built-in templates when the \`TEMPLATE_RENAMES\` table specifies a rename, preserving entries by keeping the template's id stable
- Renames fields when the \`FIELD_RENAMES\` table specifies a rename, preserving values by keeping the field's id stable
- Migrates icons listed in \`ICON_MIGRATIONS\`
- Strips self-references from any entry-ref field (an entry can't reference itself)
- Normalizes legacy \`relationKind\` field values from bare ID strings into the \`{id, label?, status?}\` object shape
- Migrates any pre-v1.5 inline calendar moon data into \`celestialBodies\` and rewrites the calendar's \`celestials\` array to id refs
- Moves the entries of any v1.5 map-kind template into the \`cartographia\` array and drops the map-kind templates
- Backfills \`mapData.drawing\` on every map record and re-sanitizes every stamp body in \`mapStamps\`
- Flags the world's Plot Thread and Theme / Motif templates \`fabulaRole\` where neither is flagged, and clears a duplicate flag (v1.7)
- Backfills \`fabula\` with an empty array for each kind and the seeded schema for each, replaces an unedited schema whose \`seed\` is behind the build's, and brings an edited schema's core fields up to the seed (v1.7)
- Coerces every tabula document in \`stemmas\` to its shape, on every load (v1.7); a rota is left as it is"""

def main():
    edit(MODULES / "26_home-data.jsx", [
        (UNDO_OLD, UNDO_NEW),
        (SAVE_OLD, SAVE_NEW),
        (HALF_OLD, HALF_NEW),
        (REF_OLD, REF_NEW),
        (VIEWS_OLD, VIEWS_NEW),
        (STEMMA_OLD, STEMMA_NEW),
        (CONC_OLD, CONC_NEW),
        (CONC2_OLD, CONC2_NEW),
        (FEEDS_OLD, FEEDS_NEW),
        (ACC_OLD, ACC_NEW),
        (CEL_OLD, CEL_NEW),
        (FIELDS_OLD, FIELDS_NEW),
        (NAMEHELP_OLD, NAMEHELP_NEW),
        (HELP_OLD, HELP_NEW),
        (STEMMA_SCHEMA_OLD, STEMMA_SCHEMA_NEW),
        (SHAPE_OLD, SHAPE_NEW),
        (IDS_OLD, IDS_NEW),
        (MIG_OLD, MIG_NEW),
    ])
    print("r036 applied: the help")


if __name__ == "__main__":
    main()
