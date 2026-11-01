# Cartulary, the Sweep (v1.7)

> **The build sheet, settled 2026-10-31 (session 22).** Planned after r050's turnover, when Drak asked, before the help cut, whether anything in v1.7 was still open: tabled issues or decisions, or bugs not fixed. The answer was the roadmap's open rows, read again for it, and Drak asked to clear them out ("let's clear these out. draw up a plan", 17:34). Claude's plan went out with its defaults the same evening, and Drak made three calls on it, one per message. The rows the cuts below take were checked against the r050 tree (`ec37174`) where this sheet names their code; each cut's plan reads its rows again, as Pipes' did.

---

## 0. One-sentence statement

Before the help describes v1.7, the Sweep fixes what v1.7's cuts found and filed and left open, settles what was tabled, and freezes the spine manifest's record, so the help is written once, against the app as it'll ship.

## 1. Decisions (Drak, 2026-10-31)

- **Scope** (17:34): clear out what Claude's answer to the question listed: the open bugs, the tolerated rows, and the tabled decisions.
- **A grid's starting shape, call 1, option a** (17:42). The template's Grid field takes a starting shape, row and column labels and a cell type per column, which each new entry's grid copies and can change; an empty grid with no shape asks for rows by columns. A new property on the field definition, which the schema, template files, and packs carry, with nothing to migrate. Its own cut, r056, so the help moves to r057. The other ways were only the prompt on an empty grid, riding in r051, and leaving it out of v1.7.
- **Fabula's tabled features, call 2, option a** (17:46). All five go to the backlog, each with the reason it was set aside (section 7); v1.7 takes none. The other ways were building some now, a call each, or all five, about five to seven cuts before the help.
- **The spine manifest, call 3, option a** (17:53). Frozen now, in the documents commit that lands this sheet: its record through r050 moves verbatim to `docs/cartulary-spine-manifest-v1.7-r050.md`, as the handoff's did at v1.6, and the live manifest keeps the module map, the gate design, the current tree with line counts, the active anchor, and the header census. From r051 on, a turnover adds no manifest row or verification note per cut; the changelog carries both. The other ways were freezing it with v1.7's ship turnover, or dropping the item.
- **Claude's defaults, said with the plan and not stopped:** the cuts and their order (section 3), each cut's fixes as written there, the help and the site after them (section 4), the commit without an r-number (section 5), and the two items that stay tolerated (section 6).

## 2. What's open (the check, 2026-10-31)

Paths are under `cartulary-src/modules/`; line numbers are r050's. All but the themes grid and Stemma's two lines are on the roadmap, each with where it was found.

**Bugs filed and not fixed**

- A dependent dropdown's Other, with its text, is cleared by the save and by every load. The editor adds Other to a cascade child's options whenever the field keeps Other text (`14_form-engine-edit` 725-732, a v1.3 comment that says so), but the cleanup keeps a cascade child's value only where its parent's options list it (`normalizeEntryFields`, `10_migrate` 127-142). The entries import reads by the cleanup, so it counts such an Other as a value that didn't read.
- A real-world Date field shows the day before its date anywhere west of UTC: `fmtDate` (`02_trunk` 6-10) hands a bare `2026-10-30` to `new Date()`, which reads it as midnight UTC. Its eleven calls in five files pass bare dates and timestamps alike.
- The search reads a Long Text's markdown as typed, its `[[links]]` aside (`queryShown` and `queryLinkWords`, `13_form-engine-display`), where the page draws it through `MarkdownDisplay` and marked.
- Renaming a record to a name a record further down the resolver's order answers to moves every `[[link]]` by that name to the renamed record without a word; the rename modal opens only when the old name has links, and looks at the new name only for a record ahead (`22_trunk`, `29_modals`).
- An entries file saved as UTF-16 is refused: since r049 `readEntriesFile` (`12_trunk` 3329-3345) strips a UTF-8 byte-order mark and reads the bytes as UTF-8, or as Windows-1252, where r048's `readAsText` honoured a UTF-16 one.
- The entries import can't read a Multi-select's own values, the ones its Other box keeps since r005 (`entriesImportValue` and `entriesImportText`, `08_export-layer`).
- A date in a month whose name holds a comma doesn't read back from the CSV, since the reader turns every comma in a date into a space before it matches the month (`entriesImportDateText`, `08_export-layer` 2754); and a name, an option, or a tag holding a semicolon comes back split, since the export joins a cell's values with "; " (1854, 1880) and the reader splits at ";" (2701, 2812).
- Chronometric draws its chart 36 pixels wider than its frame: the width comes from the view's `clientWidth` (`19_chronometric` 874), which counts the view's padding, 18 pixels a side (`shell.html`), so the chart's right margin and last year label sit past the frame.
- A Chronometric drag let go the instant after its last move can land one move short: `dragStateRef` is set in an effect after the render (`19_chronometric` 1101-1102), and the release reads it (1250).
- Fabula's outline moves a row with Alt and the arrows, but the plain arrows don't step the focus from row to row (`28_fabula/04_outline`).
- Fabula's index squeezes a long story title at 900 pixels wide to "The Dr… Cr…" (`28_fabula/01_index`).

**Tolerated rows**

- A scene picker's option reads its position as plain text, "A The Ford" (`28_fabula`, wherever `fabulaOutlinePlaces` feeds a picker).
- A field deleted from one of Fabula's kinds keeps its values, and a delete clears references only through the kind's current fields, so Reset to Default brings the field back reading (missing entry) where a deleted record was (`28_fabula/09_templates`).
- A map record has no createdAt (`saveMap`, `12_trunk`).
- Three edges r002's and r004's repairs leave (the roadmap's Tolerated section): a reference field still holding a deleted template's id, a map template of the user's own promoted before r004, and a field naming Language / Glossary in a world last saved before r002.

**Tabled**

- A grid's starting shape, Drak's question at r001's pass (call 1).
- Fabula's timeline image export, editing on the timeline, Anachronia's lines per lane, the Meaning tab's themes-by-scenes grid, and corpus-level research notes (call 2).
- The help's and the site's Limitations line on snapping, filed with r050's turnover for the help to word.
- The spine manifest's freeze, the roadmap's one document-debt item (call 3).

**Bookkeeping**

- Fabula's spec says Fabula filters its own lists by status, POV, and thread (`docs/fabula-spec.md`, section 9); its lists have no filters.
- Stemma v2's spec lists two details as open at lock (`docs/stemma-v2-spec.md`, section 13) that r027 and r035 settled.
- The release build's inline d3 comment says 7.8.5 for the 7.9.0 it inlines (`inlining/build_inline.py`).
- CI's three actions target Node 20 and run on Node 24, which GitHub says on every run.
- The comment over `celestialBodies` (`09_trunk` 205-206) names a celestial-body template that v1.5's r004 deleted.

## 3. The cuts

Each is a content cut gated by `edit`, probed with planted copies and the earlier probes (from r052 the ones that reach the cut's changes while it's built, and all of them once on the build staged, as the handoff's Content cut says), staged for Drak's pass, frozen, and turned over, as Pipes' were.

**r051, fields kept and shown as entered** (`02_trunk`, `09_trunk`, `10_migrate`, `13_form-engine-display`, and `14_form-engine-edit`, added after its first staging). **Done** (2026-10-31, `494ac2f`, passed).

- A dependent dropdown's Other survives the save and every load: the cleanup lets Other through under any parent when the field keeps Other text, as the editor offers it. Text already cleared doesn't come back.
- A real-world Date field shows its own day: `fmtDate` reads a bare date as a local day, and a timestamp as before.
- The search reads a Long Text the way the page draws it: a link's address and the markup's characters out, the words shown in.
- The `celestialBodies` comment says what the bodies carry, without the template.
- Added after the first staging, found checking the build before its message went out: with no parent choice the save still clears a dependent dropdown, Other included, so the editor shows it empty and its Other text gone, where it went on showing them.

**r052, entries files make the round trip** (`08_export-layer`, `12_trunk`, and `13_form-engine-display` for the filter's reading)

- A file with a UTF-16 byte-order mark reads as UTF-16, either byte order.
- A Multi-select's own values read where the field keeps them, from JSON and from CSV.
- A month name holding a comma reads back.
- The import takes a dependent dropdown's Other by r051's rule.
- A real-world Date reads only on a day its month has (found checking r051's build: the import's pattern takes a 30th or a 31st in any month).
- A filter's text condition on a Long Text reads each text once per change to the world, kept with the query's memo as the search keeps its texts (found by the read of r051's turnover; Drak's call, 2026-11-01).
- Open at the cut: a value holding a semicolon (section 9).
- A file written by r047 through r050 reads as it did, except where these fixes read what it couldn't.

**r053, renames say where the links go** (`22_trunk`, `29_modals`)

- Renaming a record to a name another record already answers to opens the modal even when the old name has no links, and says how many `[[links]]` by the new name reach that record now and will reach this one after.
- Open at the cut: warn and allow, or refuse the name (section 9).

**r054, Chronometric fits its frame** (`19_chronometric`)

- The chart takes its width from the frame it's drawn in, so its right margin and its last year label show.
- A drag's last position is kept where the move is handled, so a release right after it lands there.
- Every step of `tools/chrono-parity` changes width, so the check runs with the last passed build drawn 36 pixels narrower, where both charts are the same width and should draw the same, step for step. The tool gains that option without an r-number (section 5).

**r055, Fabula's screens** (`28_fabula`)

- The outline's arrow keys step the focus from row to row, Home and End to the first and last, and Alt with the arrows still moves a row.
- On the index, a story title too long for its row takes a line of its own instead of being cut to fit.
- A picker's option reads "A · The Ford", the position and the title split by a middle dot, as the site's headings split theirs.
- A field brought back by Reset to Default drops its links to records deleted while it was gone, so it doesn't read (missing entry).

**r056, a grid's starting shape** (`14_form-engine-edit`, `15_template-builder`, and where the files are read and written)

- A Grid field in the template builder takes a starting shape: row labels, column labels, and a cell type per column.
- A new entry's grid starts as the shape, and the entry changes it as any grid; entries made before keep their grids.
- A template file and a pack carry the shape and read it back; a world without shapes loads and saves as it was.
- An empty grid with no starting shape asks for rows by columns.
- Open at the cut: the builder's controls and the prompt's limits (section 9).

## 4. The help and the site

- **r057, the help**: Pipes' r051 (`docs/pipes-spec.md`, section 9), everything listed there, and with it what r051 through r056 change where the help describes it (a dependent dropdown's Other, the entries files' formats, the rename modal, and a grid's starting shape in the Templates, Field Types, and JSON Save File Schema topics), and the Limitations line on snapping. Held to the build as r024 and r036 held theirs.
- **The site**, without an r-number, written from the help. Then v1.7's finals.

## 5. Without an r-number

- **In the documents commit that lands this sheet:** Fabula's spec loses the filters its lists don't have; Stemma v2's spec marks its two settled details; the spine manifest is frozen (call 3).
- **A tooling commit before r054:** the release build's d3 comment says 7.9.0; CI's three actions move to the majors that target Node 24, checked against their release notes; `tools/chrono-parity` gains the narrower recording r054 needs.

## 6. Staying tolerated (Claude's defaults)

- **A map record has no createdAt.** Nothing reads it, and an old map's date of making can't be known; giving new maps one adds a field to the save format with no reader.
- **The three edges r002's and r004's repairs leave.** What each would need, a deleted template's id told from any other, or a field's targets from before r002's name sync, isn't in the world to rebuild from.

## 7. To the backlog (call 2)

Each waits on the condition it was set aside under: that using Fabula shows it's wanted.

- The Fabula timeline's image export, as Chronometric's SVG export (r023's plan left it out).
- Editing on the Fabula timeline, as Chronometric's edit mode (Drak's call at r020's plan: a cut of its own if the timeline shows it's wanted).
- Anachronia's lines per lane, each POV's, thread's, or arc's scenes joined in telling order, with colors and a legend (Drak at r022's plan, if the plot shows they're wanted).
- The Meaning tab's grid of themes against scenes (r015's plan: the most work of the ways offered, set aside when Drak took the row of positions, to come later if he finds he wants it).
- Corpus-level research notes (Drak, 2026-10-25: per story for now), already in the backlog.

## 8. Cut plan

1. **r051, fields kept and shown as entered.** Section 3. **Done** (2026-10-31, `494ac2f`, passed).
2. **r052, entries files make the round trip.** Section 3.
3. **r053, renames say where the links go.** Section 3.
4. **r054, Chronometric fits its frame.** Section 3; the tooling commit first.
5. **r055, Fabula's screens.** Section 3.
6. **r056, a grid's starting shape.** Section 3.
7. **r057, the help.** Section 4.
8. **The site**, without an r-number. Then v1.7's finals.

## 9. Open at lock, decided at the cut

- r052: a value holding a semicolon. The export can escape it, the reader can rejoin the pieces that make a name or an option it knows, or both; an escape changes the CSV the export writes, and a rejoin can't help a tag, which matches nothing.
- r053: a rename to a name another record answers to. Warn and allow, or refuse the name.
- r056: the builder's controls for a starting shape; the most rows and columns the prompt takes.

## 10. Acceptance tests

Each cut's probe works its expectations out by hand, runs the last passed build as control, and plants a copy for every rule, as Pipes' cuts did; from r052 the earlier probes and both parity tools run as the handoff's Content cut says (Drak's call, 2026-10-31): the earlier probes that reach the cut's changes while it's built, and all of them and both tools once, on the build staged.

- **r051:** a cascade child's Other with its text survives a save and a reload under a parent whose options don't list Other, and a value the parent doesn't offer is still cleared; a real-world Date reads its own day in Chicago's time zone and in one east of UTC, and a timestamp reads as before; the search finds a Long Text by its shown words and not by a link's address or the markup; and, added after the first staging, with its parent cleared the editor shows a dependent dropdown empty and its Other text gone.
- **r052:** a UTF-16 file in each byte order reads; a Multi-select's own values make the round trip in JSON and in CSV; a month name holding a comma makes the round trip; the semicolon rule as called; a file written by r050's export reads as it did there.
- **r053:** renaming to a former name, a body's other name, and a map's name opens the modal with the count and where the links lead now; the old-name case reads as it did; the rule as called.
- **r054:** at 1,400 and 900 pixels the chart's right margin and last year label sit inside the frame; parity at matched widths is identical step for step; a release right after the last move lands there.
- **r055:** the outline walked by keyboard alone; a long title at 900 pixels; the pickers' separator; Reset to Default after a delete reads no (missing entry).
- **r056:** a template with a shape gives each new entry that grid, which the entry can change; entries made before keep theirs; a template file and a pack round-trip the shape; a world without shapes saves as it was; the prompt on an empty grid.

## Sources

- `docs/roadmap.md` as of `ec37174`: the v1.7 section's open rows, Backlog: features, Tolerated, and Document debt.
- `docs/pipes-spec.md`, sections 9, 11, and 15; `docs/fabula-spec.md`, sections 4 and 9; `docs/stemma-v2-spec.md`, section 13.
- Drak's three calls and the scope, 2026-10-31, 17:34 to 17:53.
