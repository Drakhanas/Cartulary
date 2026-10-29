# Cartulary, Pipes Spec (v1.7)

> **The build sheet, settled 2026-10-29 (session 21).** Planned in the session that finished Stemma v2, right after r038, from the roadmap's Pipes section, one call per message, eight calls. Before the first call the roadmap's open Pipes items (1, 3, 4, 6, 7 with 9, and 10) were checked again against the r038 tree (`5ee8ce0`), since they were written on 2026-10-23, before Letters added Fabula, Tabula, and the registry's new sources; section 2 has what the check found, and where it and the roadmap disagree, section 2 is right. Every decision below is Drak's unless it says otherwise; the dated calls are in section 1. Claude's defaults are marked as his, each said before the work it shapes.

---

## 0. One-sentence statement

Pipes makes a world harder to lose and easier to reach into: saves that can't slip away unseen and backups outside the browser, one index of every link the app stores with the lists and warnings built on it, links that survive a rename, a filter builder with saved lists, entries that move in and out of a template as JSON and CSV, and map lines whose ends stay on their pins and stamps.

## 1. Decisions (Drak, 2026-10-29)

- **Durability, call 1, option a** (01:02). Two cuts: saving first, then backups outside the browser (section 3). The other ways were saving alone, with folder backups to the backlog.
- **Backlinks, call 2, option a** (01:10). One link index for the whole app, in two cuts: the index with a Referenced by list on every page that has one, then the delete warnings and Concordance drawing from the index (section 4). The other ways were the index and lists with Concordance keeping its own scan, and only what Fabula's spec had promised (entry pages and the entry delete).
- **Renames, call 3, option a** (01:11). One resolver for every place a `[[link]]` is read, then renames that offer to rewrite the links that name the old name (section 5). The other ways were the same two cuts with links reaching entries and bodies only, as Fabula's spec had it, and Name History only.
- **The query layer's shape, call 4, option a** (01:15). A filter builder on the entry list, for entries only, matching what the page shows; it stops at the entry list (section 6). The other ways were the search fix and an All entries scope alone, and the builder with the specialty views taking its filter.
- **The query layer's persistence, call 5, option a** (01:16). Saved in the world as named lists, the shape joining the save format for good (section 6). The other ways were a query built fresh with the last one kept per browser, and nothing kept.
- **Entry export and import, call 6, option a** (01:19). Add or update, chosen on the mapping screen, with a preview and a restore point, and Export entries writing CSV beside the JSON so a template's entries can make the round trip; three cuts (section 7). The other ways were add only, and a choice per clash as template and stemma imports offer.
- **Sticky line ends on maps, call 7, option a** (01:22). The reading of Drak's ask at r032's pass is confirmed: a map line's end sticks to a pin or a stamp, follows it however it moves, and comes free when it's deleted, worked out when the map is drawn, as Tabula does, in one cut that starts with the pin-id fix (section 8). The other ways were pins only, and leaving it out of v1.7.
- **The cut plan, call 8, option a** (01:25). The order of 2026-10-24, sticky ends after the entry import, one help cut, then the site: thirteen r-numbers, r039 to r051 (section 11). The other ways were sticky ends first, and each cut carrying its own help.
- **Claude's defaults, said with the check's findings before call 1, and not stopped:** the small defects the check found go on the roadmap for the next cut that touches their file, and each Pipes cut's plan reads those rows (section 15); the "longform field" line in r036's help, the site's Stemma page, and the Stemma spec, which should say Long Text, is fixed in the Stemma spec now and in r051 and the next site edit.
- **Standing from earlier calls.** The order, durability, backlinks, renames, the query layer, then entry import with its export (2026-10-23, the query layer's place 2026-10-24). Entry import's sources, JSON and CSV through one mapping screen, the JSON half in a format of its own, `cartulary_entries_export: 1`, written by an Export entries action on each template, naming fields by label with their ids alongside and references and calendars by name, images as file names, secret fields left out unless asked (2026-10-23). Typed relations to the backlog, the leap rules to v1.8 (2026-10-23).

## 2. What the check found (the tree at r038)

Paths are under `cartulary-src/modules/`; line numbers are r038's.

### Saving and storage

- The world lives in IndexedDB, database `cartulary`, store `data`, under the key `world`, beside `user-prefs`, `imageDirHandle`, `draft`, and the snapshots' `snap-<ms>-<rand4>` keys (`03_persistence` 4-18, 178-183). Nothing calls `navigator.storage` anywhere, so clearing site data, or an eviction, takes the world, its Version History, and the folder link together.
- The auto-save writes 250 ms after the last change, and every change restarts the wait (`12_trunk` 384-407). Nothing writes on `pagehide` or `visibilitychange`; the one `beforeunload` (594-603) warns only while a draft is dirty. An explicit Save waits out the same 250 ms, and `saveEntry` clears the stored draft at once (1831, 847), so a reload inside that window loses the edit with no warning. The backlog's row on the auto-save's last 250 ms said as much for typing; Save has it too.
- A failed save logs `Save failed:` to the console and returns (387-390): no message, no retry. A snapshot refused for quota logs a warning and returns null; only a manual snapshot tells the user.
- Version History keeps ten automatic snapshots, any number of manual ones, and three "before restore" ones (`03_persistence` 184-186). `executeReset` and `executeImport` delete every snapshot, manual ones included, before pinning a "Before reset" or "Before import" (`12_trunk` 2805, 2839), while the panel says manual points "stay until you delete them" (`03_persistence` 457).
- The images-folder handle is checked at load by a mount effect with no click (`11_io-utils` 4-12, `12_trunk` 281-292); a browser that wants a gesture refuses, the handle is dropped without a word, and Settings says "No folder connected" until the folder is picked again. Four things write into the folder (image fields, rich text images, a map's image and layers, Tabula's images); nothing writes JSON or makes a subfolder. The folder exists only where `showDirectoryPicker` does: Chromium browsers, Brave behind a flag (help, `26_home-data` 900-904).
- Ids are built from a name and four random characters with no check against what exists: entries `ent-<slug>-xxxx` (`12_trunk` 1795, 1054; `10_migrate` 2925; `28_fabula/05_plot` 247, `07_meaning` 39), templates `tpl-<slug>-xxxx`, fields `fld-<label>-xxxx`. `validateMigrated` refuses a duplicate entry, template, or field id on import and on every load (`10_migrate` 5973, 5981, 6002), which sends the world to the load-error screen. `slugify` keeps only a to z and digits (`02_trunk` 14), so names in non-Latin scripts all build ids from one pool: about a 0.3% chance of a clash at 100 such entries, 7% at 500, 26% at 1,000.

### Links and backlinks

- `countInboundEntryRefs` (`05_field-system` 469) has five callers, not the one the roadmap named: the body, map, and stemma delete warnings and Fabula's two delete counts. It counts entries' reference fields only, at any depth, reads no `[[links]]`, and returns a number. No function returns what points at one record.
- Concordance's scan is private to its graph's memo (`17_concordance` 50-244). It reads only the templates toggled on, skips secret fields while secrets are hidden, reads `[[links]]` in Short Text and Long Text fields of entries only, and resolves names with the last same-named entry winning. Its memo leaves out the Fabula, stemma, map, and Glossopoeia slices.
- The registry's links (`getRegisteredGraphEdges`, `22_trunk` 419) miss a story's Brainstorm, Narrators, Places, and Rules in Play, a cast record's First Appears and Belief Systems, a chapter's POV, a scene's Walk-ons, every Fabula group subfield, a ConLang's Spoken By and Region, and a body's Visible From, Notable Locations, Inhabited By, and Sacred To, and every `[[link]]` outside entries.
- Three inbound lists exist already: a Plot Thread's or a Theme's stories (`28_fabula/08_threads` 211), a scene's research notes (`06_notes` 106), and Linea's children (`20_linea` 3). `EntryView` (`13_form-engine-display` 67) draws entries, maps, corpora, stories, and Fabula records, with a `footSlot` after the fields that the thread, theme, and scene pages use. Bodies have their own page; Glossopoeia records and stemmas have none.
- Deleting an entry asks a bare `Delete "Aria"?` (`12_trunk` 1844) and clears entries' and Fabula's references (1851), leaving a map pin that pointed at it drawn broken (`18_cartographia/03_view` 428) and stemma nodes orphaned, by design. A template's delete counts its entries; a map's counts entries and doesn't clear Fabula's references to it (1242); a body's counts entries but clears Fabula's too; a stemma's counts entries, Fabula records, and other stemmas; a Fabula record's counts Fabula; a Glossopoeia record's asks bare. Fabula's spec (section 9) promised the entry delete would count across entries and Fabula ("removes her from 4 entries, 2 cast records, and 9 scenes"), waiting on this plan.

### Wiki-links and renames

- The entry view resolves a `[[name]]` by primary name, the first stored entry winning a tie, then the template's first Name History field, then bodies by name and other names (`13_form-engine-display` 236-410). The world's HTML and Markdown exports and Fabula's export resolve by entries' primary names only, the last stored winning (`08_export-layer` 274, 503-505, 1355; `28_fabula/11_export` 81), and only in Long Text fields and the world description; Short Text goes out raw. Concordance resolves the last same-named entry, then registered records (`17_concordance` 66-70). Tabula notes reach every registered record (`12_trunk` 4218-4221), a Glossopoeia one shown as found though nothing opens it. The help, the save warning, and `getRegisteredNameToId`'s comment all say "first".
- `getRegisteredNameToId` (`22_trunk` 427-437) has never had a caller.
- Four of the twenty built-in templates have a Name History field (Character, Faction / Government / Organization, House / Dynasty / Clan / Bloodline, Location); the help names three and leaves out House (`26_home-data` 146). Seventeen have an Other Names text field, which resolution ignores.
- Saving a renamed entry keeps no old name and touches nothing outside entries (`saveEntry`, `12_trunk` 1714-1840). Names copied when a link was made go stale: a stemma node's or a Tabula card's `_cachedName`, which the rota's Convert to freeform uses even while the record exists (`21_stemma/01_transforms` 126), and a Fabula cast record's name (`28_fabula/03_people` 125-132).
- Renaming a template quietly switches off other templates' reference filters, which are keyed by the target template's name (`14_form-engine-edit` 887); `syncRefTargetNames` (`01_builtin-templates` 984) updates the saved template's own fields only.
- Longform Note fields render plain text (`13_form-engine-display` 325), so r036's help line, the site's Stemma page, and the Stemma spec were wrong to say a Stemma Markdown link resolves in "a longform field": it resolves in Long Text.

### The entry list and search

- The list filters by variant, then by one template or one tag, never both and never the whole world, then by search, then sorts (`12_trunk` 680-724). Search matches names, tags, and `JSON.stringify(fields)`, so it hits ids, stored keys, and field ids, which carry their labels: "death" matches every saved Character through Cause of Death. Search and sort are App state, lost on reload.
- Seventeen field types (`00_trunk` 68-86). A Tags field stores a comma-separated string and a Number field the input's text, though the help's schema table and the site say a list and a number; a required Number field can never pass validation (`05_field-system` 746). Dates carry no calendar of their own; the entry's `calendarId` names it, and an unknown one falls back to the primary without a word (`06_calendar-engine` 141).
- Nothing saves a list or a filter. Ephemeris saves queries in the world and clears a deleted body out of them (`24_ephemeris/05_compute` 120-186, `01_shell` 219-267), the upkeep a saved query brings.

### Entry import and export

- Every file input takes JSON, and every envelope has its key: template, pack, calendar, stemma, language, and stamp pack. A world file has none, and `importWorld` takes any JSON with a `world`, `templates`, `entries`, or `schemaVersion` key (`12_trunk` 2743), so an entries file needs its own refusal there, as packs have.
- The help and the site already name `cartulary_entries_export`, saying Fabula's records don't ride in it (`26_home-data` 1487, `site/helloworld.html` 2262); nothing writes it yet.
- Field ids differ between worlds even for built-ins (`makeTemplateFromBuiltin`, `01_builtin-templates` 1027). Calendar ids are always fresh on import, and calendar names aren't unique. `migrate()`'s cleanup drops dangling references only in top-level fields with a target list or filters, which leaves out the 79 single-target built-in fields (`10_migrate` 5869-5935). Spouse declarations mirror through `computeSpouseReciprocity` at save (`05_field-system` 356). An image value is a folder file name or, with no folder, a data URL. The language file already writes entry references as `{ kind, name, template }` and relinks them by name on import, counting what it drops (`23_glossopoeia/01_substrate` 662, 749-804).
- The release build inlines d3 7.9.0, whose `csvParse` keys rows by header, so a repeated header keeps only its last column; `csvParseRows` keeps them all. The working build loads 7.8.5 from the CDN (`shell.html` 12), and the inline comment still says 7.8.5.

### Maps

- A map shape has no `anchors`: `ensureMapShape` (`18_cartographia/00_model` 91-147) rebuilds each shape from a fixed list, at load, at save, and at every edit. `ensureMapData` (189) is the one normalizer that sees pins and the drawing together.
- A pin's id is `pin-` and the first six characters of `genId()`, which are the time's and change every 1,296 ms (`18_cartographia/03_view` 1092), so two pins placed within about a second share one: they edit, drag, select, and delete together, and their React keys collide. Migration and `ensureMapData` pass duplicates through.
- A pin is a 0 to 1 fraction of the canvas; on an image map the canvas is the image's natural size, measured at runtime. Pins move without a drag when the canvas is resized or the image changed (`03_view` 983-988). A stamp is a shape with a box and a rotation about its center, and its own shape id; `stampId` names the symbol and is shared by every copy.
- Map shapes are drawn in six places, none given the pins: the editor's canvas and overlay, the map view, the SVG and PNG downloads, the world's HTML export, and the bucket fill's trace. The editor's undo snapshots the whole map with its pins, a pin drag one coalesced step.
- Tabula's sticky ends never write the line when a card moves: the stored points keep where the end was put down, and the drawn point is worked out at render (`21_stemma/05_tabula-drawing` 33-59). `tabulaAttachPoint` and `tabulaDrawnPoints` are plain functions a map can share; a zero-size box returns the point itself, which is a pin.

## 3. Durability (r039, r040)

**r039, saving.**

- Save writes the world at once, before the draft is cleared, so a reload straight after Save keeps the edit. The auto-save keeps its 250 ms wait for typing.
- A pending save is written when the page is hidden (`visibilitychange`) and on `pagehide`; the hidden write is the reliable one, since a browser may cut a write short at unload.
- A failed save shows a banner that names the error and says it will retry, and retries with a growing wait until a save succeeds; the banner goes when one does. A snapshot refused for quota says so in the Version History panel.
- The app asks for persistent storage (`navigator.storage.persist()`) at the first save of a session where `persisted()` says no, and Settings' Save File section says whether the browser keeps Cartulary's storage or may clear it under pressure, with the help's note on pages opened from a file.
- Every id built from a name and random characters is checked against the world's and drawn again on a clash: entries wherever they're made, templates, and fields. A load that finds a duplicate entry, template, or field id gives each later copy a new id, keeps references on the first, and says how many it changed, instead of refusing; `validateMigrated` refuses only what can't be repaired.
- Manual restore points survive an import and a reset, as the panel promises; automatic ones still go, and the pinned "Before import" or "Before reset" stays.

**r040, backups outside the browser.**

- With an images folder connected and its permission held, the world is written as a world file (the export's format, so Import reads it) into a subfolder of the images folder, at most every ten minutes while the world changes, the last ten kept and the oldest deleted.
- Settings' Save File section shows the last backup's time and file, a Back up now button, and the folder's state. When the stored folder's permission has lapsed, a Reconnect button asks for it again, the click being the gesture the browser wants, instead of the folder being dropped.
- A backup counts as one for the backup reminder.
- Where `showDirectoryPicker` doesn't exist, Settings says backups need a folder this browser can't give, and the reminder stays the outside copy.

## 4. Backlinks: the link index (r041, r042)

**r041, the index and the Referenced by lists.**

- One function in the registry (`22_trunk`) lists every link in the world, each with its source, its target, its kind, the field it runs through by label, and whether that field is secret, memoized per slice of state so an edit to one slice doesn't rebuild the rest.
- Stored links: entries' reference fields at any depth (group subfields, grid cells, parent and spouse declarations), Fabula records' reference fields at any depth, bodies' and ConLangs' reference fields, map pins, stemma nodes, and Tabula's linked cards.
- `[[links]]`: every one in text the app shows as a link, entries' Short Text and Long Text fields at any depth, Fabula records' text fields, a map's Description and Notes, body narratives, Tabula note bodies, and the world description, resolved by the entry view's rules lifted into one function, which r043 makes the only one. Tabula notes' links count, where the Stemma spec had counted linked cards only (its section 4 notes the change).
- A Referenced by list on every page `EntryView` draws (entries, maps, corpora, stories, Fabula records) and on a body's page, after the fields and after the lists the thread, theme, and scene pages already carry. It groups its rows by kind (entries by template, Fabula records by kind, maps, stemmas, bodies, ConLangs); each row names the source and the field it links through and opens the source. A link from a secret field shows only while secrets are shown. A page nothing links to shows no list.
- The five callers of `countInboundEntryRefs` keep it until r042 moves their warnings onto the index.

**r042, delete warnings and Concordance.**

- One delete modal for every record a link can point at (an entry, a template with its entries, a body, a map, a stemma, a Fabula record, a Glossopoeia record), counting from the index by kind ("removes her from 4 entries, 2 cast records, and 9 scenes"). The entry's bare prompt goes.
- Concordance draws its links from the index; its toggles, its secrets rule, and its focus mode stay as they are. It gains the fields section 2 lists as missing, so the graph, the lists, and the counts agree.

## 5. Renames (r043, r044)

**r043, one resolver.**

- One function resolves a `[[name]]` for the entry view, the world's HTML and Markdown exports, Fabula's export, Concordance, Tabula notes, and the link index: the primary name first, the first stored record winning a tie, as the help says; then the template's Name History field; then bodies by name and other names; then maps, stemmas, and Fabula records by name. Glossopoeia records stay out until they have a page to open.
- The exports resolve links wherever the entry view does, Short Text included.
- Autocomplete offers what the resolver reaches.

**r044, the rename modal.**

- Renaming anything a link can name (an entry, a body, a map, a stemma, a Fabula record) opens a modal when the index finds `[[links]]` by the old name that resolve to it, with the count: Rename and update links, or Rename only. Updating rewrites each such link in every text the index reads; a link by the same name that resolves to another record is left alone.
- Where the record's template has a Name History field, the modal offers to add the old name to it.
- Renaming a template carries other templates' reference filters and target names with it.
- The names cached on stemma nodes, Tabula cards, and Fabula cast records refresh.

## 6. The query layer: filters and lists (r045, r046)

**r045, the filter builder.**

- The entry list gains an All entries scope beside the template and tag picks, and a Filter button that opens rows of conditions, each a field, an operator, and a value.
- Fields go by label across templates, so Status matches in every template that has a Status; Name, Tags, and Template are fields too, and so is "linked with", to, from, or either way, through the link index. Either way finds the members of a house whichever side declared the membership.
- Operators by type: text contains, is, or is empty; a dropdown is, is not, or any of; a multi-select has any or has all; a number compares as a number, though it's stored as text; a date is before, after, or between, compared as Chronometric compares dates; a reference matches the linked record by name. Group subfields and grid cells are read at any depth.
- Every condition must hold, with one switch for any of them instead; conditions don't nest.
- Plain search matches what the page shows: names, tags, displayed values, and linked records' names, which ends the accidental matches section 2 lists. A secret field counts only while secrets are shown.
- It stops at the entry list. Filtering inside Concordance, Chronometric, and the other views stays with Variant filter v2 on the backlog, and the variant filter keeps running ahead of the builder.

**r046, saved lists.**

- The filter's Save names the current query; saved lists appear in the sidebar in a section of their own, Lists (Claude's default name, beside the sidebar's Templates, Packs, and Tags); opening one shows the entry list with its query.
- A list is its name, its scope, all or any, and its conditions. A field is kept by label, and a condition whose label no template has shows "field not found" until it's fixed. A record a condition names is kept by id, so a rename doesn't break it, and deleting the record clears it from the condition through r042's delete.
- Lists travel with the world file, its snapshots and backups, and its import. The shape joins the save format for good: the schema topic and the site's JSON page document it, and every later version reads it.

## 7. Entry export and import (r047 to r049)

**r047, the export.**

- Export entries on each template writes a JSON file in `cartulary_entries_export: 1`: the template's name and fields (label, id, type), the calendars its entries use by name, and each entry with its id, name, tags, calendar by name, and fields by label, references as the record's name and template, the language file's precedent. Secret fields stay out unless asked for; images travel as file names.
- It also writes a CSV of the same entries for a spreadsheet: a row per entry, a column per top-level field by label, references as names, multi-values joined, dates as the entry's calendar writes them; group and grid fields are left out of the CSV.
- A world import refuses an entries file and says to use Import entries, as it refuses a pack.

**r048, JSON import through the mapping screen.**

- Import entries on each template opens the mapping screen: the file's fields matched to the template's by label, a repeated label flagged; calendars by name, an unmatched one counted and its entries given the primary; references by name, the named template first, an unresolved one counted.
- Each row is matched to an existing entry of the template, by id when the file came from this world, then by name. A matched row updates only the fields mapped; an unmatched row becomes a new entry with a new id, checked as r039 checks ids. A switch turns matching off, making every row new and flagging names already taken.
- Before anything is written, a preview counts new, updated, and skipped rows, the references that found no record, and the values that didn't read (a date that isn't one, an option not in the list). The import takes a pinned restore point first, and spouse declarations mirror onto their partners as a save does.

**r049, CSV import through the same screen.**

- The same screen reads a CSV through `csvParseRows`, so a repeated header keeps its columns: a header row, each column mapped to a field, values read by the field's type (dates as the calendar writes them, options by label, multi-values split, references by name).

## 8. Sticky line ends on maps (r050)

- **The pin-id fix first.** A new pin's id takes the random part of `genId()`, as maps', layers', and shapes' ids do. A load that finds two pins sharing an id gives the later one a new id.
- Drawing a line, or dragging a point in Select, sticks an end put down within six screen pixels of a pin or a stamp. The end is drawn from the pin's point, or from the edge of the stamp's rotated box toward the next point, and follows the pin or the stamp however it moves: a drag, a nudge, a canvas resize, a changed image. It's worked out when the map is drawn, through Tabula's `tabulaAttachPoint` and `tabulaDrawnPoints`, so nothing more is written and undo stays one step.
- Deleting the pin or the stamp, or the stamp's layer, frees the end where it was last drawn.
- Every place a map is drawn works the ends out the same way: the editor, the map view, the SVG and PNG downloads, and the world's HTML export.
- `anchors` joins the map shape in the save format, as it is on a tabula's lines, coerced by `ensureMapShape` and checked against the map's pins and stamps by `ensureMapData`.

## 9. Help and site (r051, then the site)

- **r051, the help.** Every topic Pipes changes: Save & Share (saving, persistent storage, backups, Reconnect), the entry view's Referenced by, the delete warnings, Concordance, wiki-links and renames, the entry list (All entries, the filter, search, lists), Import and export (Export entries and Import entries, JSON and CSV), Cartographia's lines, and the JSON Save File Schema topic (lists, a map shape's `anchors`, the entries file). With them, the help errors the check found: the "longform field" line in the Stemma topic (and the same words in `21_stemma/02_markdown`'s comment), the schema table's Tags and Number shapes, the "autosaves silently every 500ms" line, "Reset is permanent", and the Name History list missing House; and Save & Share's line that a change pending the 500ms debounce brings up a browser warning, which r039 left stale; and what r040 left: Back Up Your World's line that the reminder anchors on JSON exports specifically, its silence on the folder backups, and Browser Compatibility's folder paragraph, which names images only (its Brave line, the flag to set, is already there).
- **The site**, a commit without an r-number after r051, written from the help: the same pages, the Stemma page's longform line, the JSON page's Tags and Number lines, and the Version History section's line that a reset also clears the rest of that history, which r039 left stale, and the Settings page's line that the reminder tracks JSON exports specifically, which r040 left stale. Then v1.7's finals.

## 10. Where it lives (Claude's defaults)

- Saving and backups in `03_persistence`, `11_io-utils`, and `12_trunk`, with Settings in `16_trunk`.
- The link index and the one resolver in `22_trunk`, the registry, with the entry view's renderers in `13_form-engine-display` and the exports in `08_export-layer` calling it; Concordance in `17_concordance`; the delete modal in `29_modals`.
- The filter builder and lists with the entry list in `12_trunk`, a list's normalizer in `10_migrate`.
- The entries file and the mapping screen with the other imports and exports in `12_trunk` and `08_export-layer`, the screen in `29_modals`.
- Sticky ends in `18_cartographia`, calling the two Tabula helpers where they are, at draw time, after load.
- No cut adds a file, since the edit gate refuses one; a carve follows if a section grows past reading.

## 11. Cut plan (approved 2026-10-29)

0. **Docs, no r-number.** This file; the roadmap's Pipes entry and section; the handoff's banner.
1. **r039, saving.** Section 3. **Done** (2026-10-29, `8fbc47c`, passed). Decided at the cut, of section 13, Drak's calls one per message, option a on the first four and b on the fifth: an import or a reset clears the automatic snapshots only, and Before import and Before reset take kinds of their own, each kind keeping its newest three, as Before restore does; the browser is asked to keep the storage after the session's first edit, once a session, inside the user's own action, and Settings' Save File section opens with what it answered; a failed save retries after 2, 5, 15, and 30 seconds and then every minute, its banner saying Not saved, with Try now and Export now, and leaving the page while it's up asks first; a load, an import, or a restore repairs shared and missing ids before every other pass and says so in a banner that stays until dismissed, naming up to five; the pass covers Chrome or Edge, and Firefox. Whether `pagehide`'s write lands was tested headless in Chromium, where a reload and a closed tab straight after an edit kept it, and Drak passed the cut in Chrome, Brave, and Firefox; at that pass Chrome and Brave answered the ask no for a page opened from a file, and Firefox asked with its own prompt. Found at the cut: a write past the quota aborts its transaction with no error event, so every write helper rejects on abort.
2. **r040, backups outside the browser.** Section 3. **Done** (2026-10-29, `a13d322`, passed). Decided at the cut, of section 13's three and a fourth Claude raised, where Reconnect shows, Drak's calls one per message, option a on the first three and b on the fourth: the backups go in a `cartulary-backups` subfolder of the images folder, each named as Export names its file and then the local date and time to the minute, `<world-slug>-YYYY-MM-DD-HHMM.world.json`, the newest ten kept per world name; connecting a folder, changing it, or reconnecting a lapsed one writes a backup at once unless the folder holds a backup of this world newer than its last change; at most one every ten minutes while the world changes, the changes after one written ten minutes after it if the tab is still open, an idle tab writing nothing, and the edits a closed tab left out going in at the next connect; and Reconnect shows in Settings' Images and Folder backups rows and in a banner, with Not now, while the folder's permission has lapsed. Found at the cut: an automatic backup waits for two seconds with no change, since a world's name is part of its file's, and a write that fails removes the file it opened. The pass covered Chrome or Edge for the folder and Firefox for a browser without one, and at it Chrome's prompt on Reconnect offered Allow on every visit for a page opened from a file.
3. **r041, the link index and the Referenced by lists.** Section 4.
4. **r042, delete warnings and Concordance from the index.** Section 4.
5. **r043, the one resolver.** Section 5.
6. **r044, the rename modal.** Section 5.
7. **r045, the filter builder, the search fix, and All entries.** Section 6.
8. **r046, saved lists in the world.** Section 6.
9. **r047, Export entries in JSON and CSV.** Section 7.
10. **r048, JSON import through the mapping screen.** Section 7.
11. **r049, CSV import through the same screen.** Section 7.
12. **r050, sticky line ends on maps, the pin-id fix first.** Section 8.
13. **r051, the help.** Section 9.
14. **Site, no r-number.** Section 9.

Thirteen r-numbers and two commits without one. Every r-number owes Drak's pass. Least certain at the plan: r041's scan on a large world, and the query builder's date conditions across calendars.

## 12. Won't-have in v1.7

- Filtering inside the specialty views, which stays Variant filter v2's (backlog).
- Typed relations with properties (backlog); backlinks read the other direction without them.
- Glossopoeia records as link targets, until they have a page to open.
- Nested conditions, or any and all mixed in one query.
- Reading world files or Markdown exports back as entries; images carried inside an entries file.
- CSV lexicon import for Glossopoeia (backlog), though its mapper can borrow r049's screen later.
- Per-map JSON import and export (backlog).
- Two tabs on one world, which still overwrite each other, as the help warns.
- Backups where `showDirectoryPicker` doesn't exist.

## 13. Open at lock, decided at the cut

- r039: the retry's waits and the banner's words; whether `pagehide`'s write lands in each browser (tested, not assumed); when the persistence request is made.
- r040: the subfolder's and the files' names; the first backup at connect; an idle session.
- r041: whether the thread, theme, and scene pages' own lists fold into Referenced by or sit above it; whether the world description shows as a source; the memo's keys and the scan's cost on a 10,000-entry world.
- r042: what each delete clears and what it leaves, said in its warning. Claude's lean: every delete clears the stored links it counts, except stemma nodes and cards, which turn orphan as designed; a pin linked to a deleted record keeps its label and loses its link; a map's delete clears Fabula's links to it as an entry's does.
- r043: how the HTML export writes a link to a map (its article), a stemma, or a Fabula record (named, since the world export doesn't carry them).
- r044: whether adding the old name to Name History starts checked; undo across the surfaces a rewrite touches.
- r045: the condition rows' controls; entering a date in a condition; how the list shows which conditions are active.
- r046: where Lists sits in the sidebar and how a list is renamed, reordered, and deleted.
- r047 to r049: the file's exact keys; the CSV's value formats; the calendar mapping when names repeat.
- r050: a line stuck to a pin that time mode hides or a download leaves out; a stamp on a hidden layer; a long freehand line, whose ends have no handles past 40 points.

## 14. Acceptance tests

Each cut gets its probes in the doctrine's shape: a Playwright run over the working build with its checks counted, screenshots read by eye, the build before as control where a check can tell them apart, and planted copies of the cut, each with one rule undone, failing at the check named for it. The rota and chrono parity tools rerun on every cut, and every earlier probe still passes.

- **r039:** a reload 50 ms after Save keeps the edit; a hidden page writes a pending save; a save made to fail shows the banner and lands when the failure clears; `persist()` is asked and Settings shows its answer; a world built with two entries sharing an id loads, the later renumbered and counted, where r038's refuses it; an import and a reset keep a manual restore point.
- **r040:** with a folder, edits over twenty simulated minutes write two backups and never more than one in ten; an eleventh deletes the oldest; a lapsed permission shows Reconnect and a click restores the folder; a backup file imports as a world.
- **r041:** on a probe world, every link kind of section 4 appears in its target's list under the right group, with the field named; a secret field's link hides with secrets; the index's counts match a brute-force scan; a 10,000-entry world opens an entry page in a time the cut sets.
- **r042:** each kind's delete counts what the index counts; the entry's prompt is the modal; Concordance draws every edge it drew at r041 plus exactly the fields section 2 lists.
- **r043:** every link on the parity worlds resolves to the same record in every surface as at r042, except the listed changes; exports resolve Name History, bodies, maps, and Short Text.
- **r044:** a rename with links updates exactly the links that resolved to the record and leaves a same-named record's; Rename only rewrites nothing; a template rename keeps another template's filter working; cached names refresh.
- **r045:** "Status is Living" and "linked with House X, either way" return the expected set on a probe world; a search for a field's label no longer matches every entry; dates compare across calendars as Chronometric's do.
- **r046:** a saved list survives a reload, an export and import, and a snapshot restore; a deleted record leaves its condition empty; a renamed label shows "field not found".
- **r047:** the JSON and CSV files hold every entry with its fields by label; secrets stay out unless asked; a world import refuses the file.
- **r048:** a file exported and edited updates exactly the rows it matches, by id then by name; the preview's counts are right; matching off makes every row new; the restore point is pinned.
- **r049:** a CSV with a repeated header keeps both columns; values read by type; unresolved references and unread values are counted.
- **r050:** two pins placed half a second apart get different ids; a line stuck to a pin follows a drag, a canvas resize, and a changed image, and to a rotated stamp's edge; deleting either frees the end where it was drawn; the five drawing sites agree; undo is one step.
- **r051:** r024's and r036's pattern: the help read from the page and held to the build, with planted copies.

## 15. Found on the way, filed

Each goes on the roadmap for the next cut that touches its file, and each Pipes cut's plan reads them (Claude's default). The ones Pipes' cuts take are in sections 3 to 9.

- A required Number field can never pass validation: the form stores the input's text and the check wants a number (`05_field-system` 746, `14_form-engine-edit` 697).
- The world's Markdown export writes a Name History field as "[object Object]": `renderFieldForMd` has no case for it (`08_export-layer` 53-141; the HTML renderer has one, 877).
- The world's Markdown export formats every date in the primary calendar (`08_export-layer` 507), so an entry bound to another calendar is mislabeled; read from the code, to be confirmed at the plan of the cut that takes it.
- The entry view's single date leaves out the "~" an approximate date carries elsewhere (`13_form-engine-display` 496).
- The Search help says to deselect the active filter by clicking it again, which the sidebar doesn't do (`26_home-data` 632, `12_trunk` 5480); r045's All entries scope and r051 take it.
- Fabula's spec says Fabula filters its own lists by status, POV, and thread (section 9); its lists have no filters.
- The inline d3's comment in the release build says 7.8.5 for the 7.9.0 it inlines (`inlining/build_inline.py`).

## Sources

- `docs/roadmap.md`, the v1.7 section and its Pipes section (2026-10-23 to 28).
- `docs/fabula-spec.md`, sections 9 and 10, for what Fabula left to backlinks.
- `docs/stemma-v2-spec.md`, sections 4 and 5, for Tabula's sticky ends and the registry's stemma source.
- The r038 tree (`5ee8ce0`), read for section 2 on 2026-10-29: six reports, one per item, each claim spot-checked against the code before it went into a call.
