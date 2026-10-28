# Cartulary, Stemma v2 Spec (v1.7, Letters)

> **The build sheet, settled 2026-10-27 (session 21).** Planned in a fresh chat from the roadmap's Stemma entry, one call per message, five calls and a name: the board's storage, what a card can point at, the canvas's manners, Rota's own v2 items, the names, then the cut plan. The kanban board the roadmap carried at r025 (a tree two deep, drawn as columns) is superseded by this file, by Drak's call at the first message: it was the radial's own recursion in different clothes. Every decision below is his unless it says otherwise; the dated calls are in section 1.

---

## 0. One-sentence statement

Stemma gains a second kind of document, Tabula, a freeform board in Milanote's structure with none of Milanote's social feel, beside the radial tree, now named Rota; both are brainstorm surfaces for the world, and the pair is Fabula's foil.

## 1. Decisions (Drak, 2026-10-27)

- **Not a kanban, and not the radial's shape.** The board disregards the radial stemma's node shape entirely and follows the structure Milanote has: a canvas, cards placed where you put them, columns that stack cards, boards inside boards, lines, images. A kanban built as a two-deep stemma tree was rejected as a radial tree with a different name; a canvas has a different unit, position rather than parent, and that is what makes it a companion.
- **Two sub-options under one view.** Stemma stays the sidebar entry. Its documents come in two layouts: **Rota**, the radial tree (the wheel; the sixteen slots are its spokes), and **Tabula**, the board. "Radii", his first guess, reads in Latin as "of the spoke"; Rota and Tabula are two feminine nouns naming artifacts, the pair the house scheme wants.
- **Storage, call 1, option A.** A tabula is a document in `state.stemmas` with `layout: "tabula"`; absent `layout` is a rota, so nothing migrates. The first cut's kinds are note, linked, image, column, board and the drawing layer's shapes (section 4). A to-do card and free text were offered and left for later, both additive.
- **What a card points at, call 2, option C.** Entries plus every registered record, and stemmas themselves join the registry as a source (section 5). That gives Fabula's parked Brainstorm field its target and gives Pipes' backlinks the stemma mentions for free.
- **The canvas, call 3, option B, amended.** Two screen cuts, single selection first (section 6). Amendments at the call: columns are any number from none up, each labeled (already so: a column is an item); lines crib Cartographia's Line tool and add Freehand, drawn to link cards visually without making a data link; and cards stay exactly where they're placed, nothing moves one but the user.
- **Lines, option C.** One Line tool, the map's, whose endpoint sticks to a card when dropped on one and stays free otherwise. A stuck end follows its card. Freehand never sticks. Arrowheads join the stroke shape that Cartographia shares.
- **Rota's v2 items, call 4, option A on the one fork.** Sibling reorder, keyboard, undo and Markdown export go in; the depth cap is dropped, for Rota and for Tabula's sub-boards alike. Mention tracking is paid for by call 2's registry edges.
- **The cut plan**, section 11, approved as proposed ("looks good").

## 2. The boundary

**In:** Milanote's skeleton. A canvas you pan and zoom, cards you place and move, columns that stack cards, boards within boards with a breadcrumb, lines and freehand strokes, images, links into the world. Everything stays in the one save file and works with the file closed to the network.

**Out:** Milanote's social layer and anything that reaches outside the file. No comments, no sharing, no collaborators, no activity, no notifications. Nothing fires from a file: no due dates, no reminders. No URL bookmark previews, since the app makes no network request, ever. No prose: a note is a note, and a story's text lives nowhere in Cartulary (Fabula's boundary holds here too).

**The test:** if Milanote has it because several people are in the board at once, it's out; if it reaches past the file, it's out.

## 3. Where it lives

- **`state.stemmas`**, both layouts in one array, one row each on the Stemma index. A document's shared keys are what a rota has today: `id` (`stem-xxxx`), `name`, `description`, `tags`, `createdAt`, `updatedAt`, and `root`. A tabula adds `layout: "tabula"`; a rota never writes `layout`, so every world saved before v1.7 reads as rotas and no byte of a rota changes.
- **A slice of its own was rejected.** `state.boards` would have copied the index, import with its collision modal, export, `regenerateStemmaIds`, the orphan handling, and the help, site and schema text, and failed the ten-year filter.
- **Load-time normalization** for both layouts, the way `ensureMapData` treats a map: coerce, never throw, so a hand-edited or older file renders. The rota normalizes at import only today; the newer pattern is better and both get it.
- **Export envelope:** `cartulary_stemma_export: 2` for a tabula, 1 for a rota, unchanged. Both shipped builds in the repository refuse anything but 1 outright, which is the point: a version-1 board would import into an older build as its root alone, since `normalizeImportedStemma` drops a slotless child silently. A rota stays at 1 so older builds keep importing rota exports made by v1.7. The new importer takes 1 and 2 and says "made by a newer Cartulary" for anything higher. A tabula file would fail the old node validator anyway (`type "board"`), so the refusal holds twice over. The v1.4 and v1.5 finals predate the repository; a grep for the version check in the archive copies would confirm they match.
- **Pan and zoom** are display state, kept in `prefs` per board node, the way Fabula's folds are; never in the file.

## 4. The Tabula document

The root is a board node. A board node is the document's root or a sub-board placed on a parent's canvas.

```
// board node
{ "id": "n-xxxx", "type": "board", "x", "y", "w",        // x, y, w only when placed on a parent
  "title": string, "color": hex, "icon": string,
  "items": [ ...items, in z-order ],
  "shapes": [ ...shapes, the map's shape model ] }

// items; x, y, w on the canvas, none inside a column
{ "id", "type": "note",   "x", "y", "w", "title": string, "body": markdown, "color": hex }
{ "id", "type": "linked", "x", "y", "w", "entryId": string, "_cachedName": string }
{ "id", "type": "image",  "x", "y", "w", "image": filename | data URL, "caption": string }
{ "id", "type": "column", "x", "y", "w", "title": string, "color": hex, "items": [ ...items ] }
{ "id", "type": "board",  ...as above }

// a shape, in the map's model (ensureMapShape): stroke, with two additions
{ "id": "shape-xxxxxx", "type": "stroke", "points": [[x, y], ...], "stroke": hex, "strokeWidth": n, "smooth": bool,
  "arrow": "none" | "end" | "both",
  "anchors": { "start": itemId | null, "end": itemId | null } }
```

Rules:

- `x`, `y`, `w` are integers in canvas pixels at zoom 1, unbounded. Heights are never stored: a note's comes from its text, an image's from its own aspect, a column's from its stack, a board card's from its face. Z-order is array order; a dragged card goes to the end.
- **Cards stay put.** Every position is absolute and nothing moves a card but the user: no force layout, no tidy-up, no reflow on zoom. The one nudge is the 10-pixel snap at drop, and it goes if Drak wants placement to the pixel. Shapes share the canvas units, so a circle drawn around a card stays around it through pan and zoom; only moving that card leaves it behind, unless a line's end is stuck to it.
- A note's `body` is Markdown through `marked` with wiki-links resolved, exactly a longform field. A title-only note is a heading.
- A linked card is the rota's linked node: the same two keys, the same orphan behavior (section 5).
- An image is stored as an entry's image field or a map's raster layer is: a file name in the world's images folder, written as `<stemma id>-<item id>.<ext>`, or a data URL under the map's byte cap.
- A column holds any item but a column. An item dragged out gets `x`, `y`, `w` at the drop; one dragged in loses them. A board starts with no columns, and takes as many as are placed.
- Sub-boards are inline, never separate documents: the index stays one row per document, export carries the whole thing, delete takes the subtree with a count, and ids regenerate together on import. Depth is uncapped.
- Shapes live beside the items so the overlay draws them. A stroke's `anchors` name items of the same board; a stuck end keeps its last point in `points` as well and is drawn from the card's measured box while the anchor holds. Deleting a card clears the anchors on it and the line stays, its freed end at the point it kept; the normalizer clears an anchor whose card is gone the same way. The normalizer takes the map's whole vector set, so Rect, Ellipse and Text can join later with no format change; raster layers never come.
- The drawing never makes a data link. Concordance and the backlinks read linked cards only.

## 5. What a linked card points at

- **Every registered record, and entries.** The picker, `StemmaSmartInput`, which both layouts share and which searches `entries` by name today, searches entries and `getRegisteredGraphNodes` together: each hit shows its name and, for anything that isn't an entry, its source's label, the way a multi-template picker appends the template's name. A card or node draws the source's icon and color, opens what `openEntryFromAnywhere` opens (entries, bodies, maps, corpora, stories, every Fabula record with a page), and shows a Glossopoeia record as a chip that opens nowhere, as everywhere else. The template builder's `refEligible` flag is untouched: it governs template fields, not this picker, and Fabula's kinds come in despite being ineligible there.
- **Stemmas join the registry:** `__stemmas__`, instances from `state.stemmas` with the layout as the record's kind, `refEligible: true`, opening onto the canvas, rota or tabula. The picker leaves out the document it's in. Hence:
  - A card can link to another stemma: a tabula card that opens a rota, a rota node that opens a board.
  - **Fabula's Brainstorm field** gets its target: a Story seed change, `FABULA_SCHEMA_SEED` to 5, and the roadmap's three "will" sentences ride that bump as filed.
  - Any template's field can point at a stemma, as maps set the precedent on purpose; `migrate()`'s cleanup keeps such a reference for free, since r052 keeps a reference to any registered source among the field's targets.
  - `getEdges` emits stemma → target for every linked node in a document, so Concordance draws a stemma as a node with its links, and Pipes' backlinks reads stemma mentions from the same edges. That is the roadmap's mention-tracking item, done by this.
  - Deleting a stemma follows the map's pattern: count the references to it, clear them after the confirmation; linked cards elsewhere that pointed at it orphan with their cached name.
- **Orphans** are by failed resolution, so they work for any source without a change: the cached name, the unlinked style, relink or convert from the inspector.
- **Not in:** a link to a node or sub-board inside a document. Node ids are regenerated on import, so such a link survives nothing that crosses worlds; it waits until someone wants it.

## 6. The canvas

What carries over: the map editor's camera grammar, the rota's breadcrumb and right-side inspector, Fabula's holds-delete modal, and `useMapHistory`, which stacks any record with coalescing and a byte trim.

- **Surface.** HTML, not SVG: cards are divs so a note wraps and renders Markdown, with one SVG overlay for the shapes and a transform for pan and zoom. The surface is unbounded: it extends to the items plus a margin on every side. A board opens at Fit. Inputs are the map editor's: Ctrl+wheel zooms about the pointer, pinch too, + - 0 on the keys, middle button or Space to pan; plain wheel pans, Shift+wheel sideways; zoom 0.25 to 2.
- **Making things.** A tool rail in the map editor's pattern: Note, Link, Image, Column, Board, Line, Freehand, Select (for shapes). Click places an item at the view's center, drag places it at the drop. Double-click on empty canvas makes a note there. An image file dropped on the canvas becomes an image card. Link opens the picker where the card lands.
- **Selecting and editing.** Click selects one card and the inspector opens on the right: title, body and color for a note; relink, convert to a note, and open for a linked card; caption and replace for an image; title and color for a column or a board; color, width and arrowheads for a shape. Delete sits at the inspector's foot and on the Delete key, with a count when the item holds things. Double-click a note edits it in place, title then body, Markdown source in a textarea over the card, Esc or blur to commit; a column's or a board's title the same. Linked cards, images and shapes edit in the inspector only. Drag moves, and the dragged card comes to the top. The right edge is a width handle on notes, columns, images and board cards; an image keeps its aspect. Arrows nudge the selection by the grid; Esc deselects. Second screen cut: Shift+click extends a selection and a drag on empty canvas draws a marquee; a selection moves, nudges and deletes together.
- **Columns.** A card dragged over a column shows an insertion line at the gap nearest the pointer and drops into it; dragged out, it lands free at the drop; reorder by drag inside. A column drags with its contents. Deleting one asks, as Fabula's modal does: cards out onto the canvas where the column stood (default) or gone with it.
- **Lines and strokes.** The drawing layer is the map's shape model and renderer, vector only, no layer UI, drawn above the cards and inert to the pointer unless a draw tool is up or a shape is selected. Line takes its points by click, double-click or Enter finishes, Esc cancels; an endpoint dropped on a card sticks to it, shown by a highlight while the pending point is over the card, and sticks nowhere else. Freehand is a drag, Esc discards. Select moves, reshapes and deletes a shape, with the map's swatches and width. The two tools' pointer handling is ported out of `useMapDrawing`, which assumes a map's fixed size and raster layers; the shape model and the renderer come over whole.
- **Sub-boards.** A board card shows its title, icon, color and item count. Double-click opens it; the breadcrumb at the top is the rota's, and Back returns to the parent. Moving items into a sub-board by drag is the second screen cut's.
- **Undo.** Edits write to the world at once, as the rota's do, and `useMapHistory` wraps the open document for Ctrl+Z and Ctrl+Y within a session on the canvas; drags coalesce to one step. The world's auto-save and Version History stay the safety net beyond that.
- **Locked world.** View only: pan, zoom, drill in, open links. No rail, no inspector edits.

## 7. Rota's own v2 items

- **Sibling reorder.** Drag a child along the orbit: it follows the pointer's angle and snaps to the nearest slot; dropped on an empty slot it moves, on an occupied one the two swap, Esc cancels. Alt+Left and Alt+Right do the same to the next free slot either way round. No slot number anywhere in the UI. On a tabula, reorder is the drag inside a column.
- **Keyboard.** Left and Right walk the focus around the children, Enter drills in, Backspace goes to the parent, Home to the root, Delete removes the focused node with the confirmation it has now, N opens the smart input on the first empty slot, Esc closes the inspector or cancels, and + - 0 zoom as the map editor's do.
- **Undo.** One wrapper for both layouts (section 6). The rota's edits are closures in `App` that write `state.stemmas` directly (`addStemmaChild` and six more); they become pure document transforms in `21_stemma`, the way Chronometric's math left its view at r018, and `App` keeps one `replaceStemma`.
- **No depth cap.** It was on the v1 "not in" list as a gap, which doesn't make it a feature: the breadcrumb handles any depth, the importer copes with any depth, and a cap would refuse the twelfth level of someone's taxonomy for nothing in return.
- **Markdown export**, section 9.

## 8. The index

One list as now, each row marked Rota or Tabula and counted in its own terms (nodes, or columns and cards); + New splits into + New Rota and + New Tabula; Import takes both files; Export on a row offers JSON and Markdown.

## 9. Exports

- **JSON:** the envelope of section 3, `<slug>.stemma.json`.
- **Markdown**, `<slug>.stemma.md`, from the index row and the canvas bar. Rota: the name as a heading, the description, then the tree as a nested list in slot order from 12 o'clock, a freeform node its label, a linked node a `[[wiki-link]]` so a paste into a longform field links, an orphan its cached name marked unlinked. Tabula: each column a heading with its cards as a list, free cards in reading order (top to bottom, then left to right), a note's body under its title, an image as its file name with its caption, a sub-board a nested section; shapes don't export.
- **The world's own Markdown and HTML exports** don't carry stemmas today and this doesn't change that; a Stemmas section there can come later with no format change.

## 10. Help and site

The help's Stemma topic takes a section per layout and retires its "What's not in v1" list; the JSON Save File Schema topic's stemma block gains the tabula shape and the `layout` key; the site's Stemma page and its JSON Structure page follow, as Fabula's did. The three help lines the roadmap has carried since r005 ride the help cut, since it is the next cut that touches the help.

## 11. Cut plan (approved 2026-10-27)

Tabula grows inside `21_stemma` under section headers and is carved at the end, Fabula's path.

0. **Docs, no r-number.** This file; the roadmap's Stemma entry rewritten from the kanban; the handoff's banner.
1. **r026, Rota's edit path.** The seven `App` closures become pure transforms in `21_stemma`, `App` keeps `replaceStemma`, and `useMapHistory` wraps the open document for undo. Must change nothing but undo: its check runs one scripted edit sequence through the r025 build and the new one and compares the saved stemma JSON, chrono-parity's pattern.
2. **r027, links past entries.** The `__stemmas__` source, the smart input searching entries and every registered record with source labels, linked nodes drawing a source's icon and color, `openEntryFromAnywhere` onto the canvas, deleting a stemma counting and clearing references, Concordance taking stemmas and their edges from the registry with no change of its own.
3. **r028, Fabula's Brainstorm.** The Story seed takes the field, targets `__stemmas__`, seed to 5; the three "will" sentences ride the bump. The schema topic and the site's seed tables follow, because r024's probe holds them to the seed.
4. **r029, Tabula I.** The document shape with load-time normalization for both layouts, envelope 2, import of both; the index with two buttons, badges and counts; the canvas: camera, rail with Note, Link, Image, placement, single selection, the inspector, in-place editing, drag, width resize, snap, undo, locked view, remembered pan and zoom.
5. **r030, Tabula II.** Columns and sub-boards: the two tools, drop in and out, reorder inside, a column dragging with its contents, the holds-delete modal, board cards with counts, drill-in and the breadcrumb.
6. **r031, Tabula III.** The drawing layer: Line with sticky endpoints, Freehand, Select for shapes, swatches and width; `arrow` on the shared stroke shape, which `ensureMapShape` and the renderer learn. Its check renders a set of maps' drawings through the old renderer and the new and compares the SVG text, so Cartographia's output is proven unchanged; the map strip's arrowhead toggle is Drak's call at the cut.
7. **r032, Tabula IV.** Shift+click, the marquee, group move, nudge, delete and column drops, dragging items into a sub-board, duplicate, copy and paste.
8. **r033, Rota's reorder and keyboard.**
9. **r034, Markdown export**, both layouts.
10. **r035, the help.** The Stemma topic in two sections, its "not in v1" list retired, the schema topic's stemma block, and the three filed help lines.
11. **Site, no r-number.** The Stemma page and the JSON Structure page's stemma sections.
12. **r036, the carve.** `21_stemma` into a folder at its section headers, pure, byte for byte.

Eleven r-numbers and two commits without one. Least certain: r029, and r031's port of the two tools out of `useMapDrawing`.

## 12. Won't-have at birth

Comments, sharing, collaborators, activity, notifications; anything that fires from a file (due dates, reminders); URL bookmark previews; switching a document between layouts (rota to tabula loses depth past two, tabula to rota needs slots, and a column of more than sixteen cards doesn't fit); a link to a node or sub-board inside a document; dragging a card between documents; a hand tool; touch beyond pinch and two-finger pan; raster or paint layers on a board; a depth cap; a data link from a drawn line; auto-layout of any kind.

## 13. Open at lock, decided at the cut

- Default widths (a note 280, a column 300, an image 320, a board card 280; a floor of 160 and a ceiling of 800 for the first three) and the card color control (the rota's color input, default `#c8a96e`, or the map's eight swatches).
- Zoom step (the map's 1.25 or the rota's 1.15) and whether the 10-pixel snap ships on.
- The sticky endpoint's hit test (the card's box, or the box grown by a few pixels) and the line's own hit width.
- What a board card's count counts: its direct items, with a column's cards counted in, or everything below it.
- Whether a new tabula opens empty or with one note placed.
- The picker's hit layout: a source suffix per hit, or hits grouped under source headings as `EntryRefEditor` groups.
- The Markdown export's handling of a linked card that points at a registered record (its name, since `[[wiki-links]]` resolve to entries and registered names alike).
- Whether Cartographia's strip exposes the arrowhead toggle in r031 or waits for a map cut.

## 14. Acceptance tests

Each cut gets its probes in the doctrine's shape: a Playwright run over the working build with its checks counted, screenshots read by eye for every new control at its shortest and longest value, a control run through the build before where one can stop at more than its first check, and planted defects for each main rule where the control can't.

- **r026:** the same scripted edit sequence (add freeform, add linked, rename, relink, convert both ways, delete a subtree, rename the document) saved through the r025 build and the new one is byte-identical as JSON; undo and redo walk the sequence back and forward; leaving the canvas clears the stack.
- **r027:** a rota node linked to a body, a map, a scene and a lexeme shows each source's icon and name; three open and the lexeme doesn't; deleting the scene orphans its node with the cached name; a Story's Brainstorm picker lists the world's stemmas but not the one being edited; Concordance shows the stemma with four edges; deleting the stemma counts and clears the reference.
- **r028:** a world saved at r027 loads with Brainstorm on the Story, seed 5, an edited schema keeping its labels; the help's and the site's seed tables hold to the code (r024's probe, rerun).
- **r029:** a tabula round-trips through export and import with ids regenerated and positions intact; a version-2 file is refused by the v1.6.1 final rebuilt from its tag; a rota export from the new build imports into that final; placement, in-place editing, drag, resize and undo each change the saved document as expected and nothing else; the locked view edits nothing.
- **r030:** a card dropped into a column loses its position and takes the stack's order; dragged out, it lands at the drop; deleting a column moves its cards out by default; a sub-board opens with the breadcrumb and its count is right.
- **r031:** a stroke's stuck end follows its card across a drag and detaches when the card is deleted; a free point stays; the map parity set renders identically through the old and new renderers; a map drawing with `arrow` set renders the heads.
- **r032:** a marquee selects what it encloses and nothing else; a group drop into a column keeps the group's order; copy and paste lands with new ids.
- **r033:** a drag along the orbit moves a child to the nearest free slot and swaps with an occupant; each key does what section 7 says and nothing when the world is locked.
- **r034:** the Markdown of a rota and a tabula each match a fixture to the byte.
- **r035:** the help's mechanical claims hold to the code's tables, r024's pattern.

## Sources

- Milanote's structure, read from the product: boards, notes, columns, lines, sub-boards, images, to-do lists, links; the social layer left out by Drak's call.
- The roadmap's Stemma entry at r025 (`e79fb97`), the kanban board as a second layout, from a review in another chat read against the tree; superseded here.
- `docs/fabula-spec.md`, for the Brainstorm field (its sections 1 and 10) and the cut-plan shape this file follows.
- `docs/cartographia-plus-spec.md`, for the shape model this file borrows.
