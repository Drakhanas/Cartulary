# Cartulary roadmap

Forward-looking only. What shipped, and the plans and session blocks that got it there, are in `roadmap-archive.md`, verbatim. The standing planning and scope principles are in `roadmap-principles.md`. The sections below are the standing backlog, edited in place as items move. The dated `=== ADDED ... ===` blocks after them are the session log, and the newest block is the current status. The doc gate reads that block for figures, file names, and anchors, and the whole file for em dashes, banned phrases, tables, and required strings, so the standing sections are kept true by hand (`tools/turnover/conventions.md`).

Nothing in the backlog is committed to a version. A row is a claim about the tree, so check it against the source before scheduling work on it.

---

## v1.7: the Letters and Pipes update

Named by Drak on 2026-10-23. Not opened yet: `VERSION` in `inlining/build_inline.py` still reads `'1.6'`, and the line opens when code work starts.

- **First: a data-loss bug that shipped in v1.5 and v1.6** (found 2026-10-23 by the entry-ref audit). `migrate()` cleans entry-ref values near its end and keeps one only if it's an entry's id, so a reference to an astronomical body or a Glossopoeia record vanishes at the next load, import, or snapshot restore: a Location's Parent set to a planet, a Historical Event's Location set to a body, and any user-built multi-template field that targets either. Single-target fields skip the cleanup and keep their values. Shown in both shipped finals, headless; the details are in `docs/entry-ref-audit.md`. The fix is a cut, and whether it ships as a v1.6 patch or as v1.7's first cut is Drak's call.
- **Letters: writing tools.** Drak's scope, held open on purpose until work on the app begins. Nothing in the backlog is attached to it.
- **Pipes: the deficiencies a new adversarial review raised**, brought in 2026-10-23 and checked against the tree below. All eight hold. None is scheduled until Drak makes the call on each.
- **Carry-in fixes, whatever the theme:** the four product-text defects in the backlog below (the Concordance help's reload line, the save-file schema's missing `longform` and `grid` shapes in the help and on the site, the Ephemeris note that still names v1.5, and the site's line saying there's no repository). The three in the application are the natural first cut after the line opens, r001, which also flips the two version literals in `08_export-layer`, unless the data-loss fix takes that slot; the site line is a site edit and can go any time.
- **Everything else in the backlog stays unscheduled** unless planning Letters or Pipes pulls it in.
- **Names on the line** (decided 2026-10-23; the rules are under Tags and Content cut in `handoff.md`): the v1.6 tree as shipped is r000 and isn't tagged; each passed revision is tagged from `v1.7_r001` on; the release is `v1.7_Release`, on the ship-turnover commit; and each cut's script is `inlining/cuts/v1.7_r###_description.py`.

### Pipes: the review's list, checked against the tree (2026-10-23)

1. **Backlinks.** Nothing shows what points at an entry. The entry list's search (`12_trunk`) matches names, tags, and `JSON.stringify(fields)`, and an entry-ref is stored as an id, so a house's name never finds its members unless their prose wiki-links it, while "year" matches every entry with a date. `countInboundEntryRefs` (`05_field-system`) has one caller, the Ephemeris body-delete confirmation. A "Referenced by" list on the entry view is derived at render time and needs no schema change.
2. **Relations beyond family carry nothing.** `relationKind` has two values, parent and spouse, and the template builder offers both. Spouse declarations carry Married and Ended dates and mirror to the partner (since v1.2), and parent declarations carry a label; every other entry-ref is a bare id, one-way, with no date, note, or reciprocity. Typed relations with properties are a schema change across the form engine, Concordance, Linea, and the exports. Backlinks would cover reading the other direction without one.
3. **Renames break wiki-links.** Wiki-links resolve by primary name, then by Name History (`13_form-engine-display`), so `[[Old Name]]` survives only if the old name is in the entry's Name History field. Nothing puts it there: saving a renamed entry records and rewrites nothing, and only 4 of the 20 built-in templates have a Name History field. The choices: rewrite the links across the world on rename, with a count shown first, or add the old name to Name History where the template has one.
4. **No query layer.** The entry list filters by one variant axis, then by a tag or a template, then by the search above; nothing filters on field values, so "every living member of House X" can't be asked. The review expects it to fail the 10-years filter. It's here so the answer is a decision.
5. **Leap years.** No leap or intercalary rule exists anywhere in the source. `DEFAULT_CALENDAR` (`06_calendar-engine`) is named Gregorian with a 28-day February, absolute-day math multiplies a fixed days-per-year, and the calendar-name placeholder suggests Gregorian, Julian, Islamic, and Hebrew, none of which Kalendarium can express. A leap rule reaches absolute-day math, the cross-calendar anchors, the grid, seasons, date validation, and everything downstream that reads absolute days (Chronometric, Ephemeris). The review's Dul Pantra figure is arithmetically right (a leap week every eight years is 0.875 days a year, 87.5 a century); the leap week itself lives in Drak's world file, not in the repository. The cheap half fits the first cut: stop calling the default Gregorian (its name, the placeholder, the Kalendarium help, the schema examples in the help and on the site, and `16_trunk`'s fallback label).
6. **World durability.** Nothing calls `navigator.storage.persist()`, and Version History keeps its snapshots in the same IndexedDB store as the world, so an eviction or a cleared site takes both. The images-folder handle (kept in IndexedDB, re-permissioned in `11_io-utils`) already writes image files, so a rolling world JSON beside them needs no new permission flow. The limits: the folder exists only where `showDirectoryPicker` does (Chromium browsers), a write without a click can only happen while the permission still holds, and whether a browser grants persistence to a page opened from a file has to be tested in each one.
7. **No CSV import.** Nothing in the tree parses CSV. The deferred Glossopoeia plan in the backlog below (a column-mapping step, add-only, a small inline parser) is the same door, and a field-mapped importer for entries would reuse it. A parser for one generator's format fails the 10-years filter; a generic mapper doesn't.
8. **The free-forever argument answers the wrong question.** cartulary.world's "Free, and not as a pricing decision" and "Free by construction" sections argue from the MIT license and the architecture, which guarantee the price but not that fixes keep coming. The answer the project has now is the public repository and its deterministic build: anyone can rebuild the shipped file byte for byte and carry on. It's a site edit with no r-bump; the itch page and the zip README already name the repository, and the site's stale line about having no repository is in the product-text defects below.

### Before code work

None of these edits the application, so none takes an r-number.

1. **The bug's route** (Drak): a v1.6 patch, or v1.7's first cut.
2. **The Pipes calls** (Drak): for each of the eight items above, v1.7, the backlog, or decided no.
3. **The entry-ref calls** (Drak): the eight flags in `docs/entry-ref-audit.md`. The read is done, every field against its targets, and whatever is taken becomes part of a v1.7 cut; any flag that adds a body or a Glossopoeia target waits on the bug fix.
4. **Build and gate tooling** (scripts only, no product code): make `prove_gate_teeth.py` find its targets by role instead of by filename (it names `11_io-utils.jsx` and `02_trunk.jsx`); move the temporary file `finals` writes off the hard-coded `/tmp`; and give the doc gate's retired-anchor check a narrower rule, so a history word anywhere on a line stops excusing it while the legitimate history lines keep passing. None of the three is on the review's list.
5. **Optional document debt:** the spine manifest (91 KB) is mostly pillar 2's finished carve record. It could freeze the way the handoff did, with the module map and the gate design kept live.

---

## Backlog: features

- **Concordance sector graph.** Half shipped in v1.5: the node-source registry already puts stars, planets, and moons in Concordance and draws the `parentBodyId` hierarchy as "orbits" edges, so the star-planet-moon view exists. Still open: connections between star systems with distance stored on the edge (topological, not coordinate-accurate), distance labels on those edges, and a stars-only filter mode. Open design questions: binary stars, 2D or 3D, the single-system empty state, and whether it's a Concordance mode or its own view. The same two primitives (kind-aware filtering, per-edge metadata) would also serve trade routes and faction links. It's one of three items here big enough to headline a release, with variant filter v2 and the Game Mechanics pack. The full sketch is in `roadmap-archive.md`, in the v1.6 record's copy of the backlog.
- **D.4, recurrence on the calendar-date field.** A recurring date as part of the field's value (`recurrence: {periodDays, count?, until?}`), expanded for display by Chronometric, the Kalendarium grid, and entry rendering. Every date-walking helper would have to learn it. Days only for v1, because months and years drift under calendar edits; a cap on displayed occurrences; additive, with no migration. It's a different layer from the rejected holidays-as-entities idea below. The trigger is users saying the prose-in-notes fallback for promoted Ephemeris events is what's in their way. The full sketch is in the same place.
- **Concordance: a per-node "auto-place this" action** that clears one saved position so the layout re-places that node. Not in the tree as of 2026-10-23; the only reset the view has is zoom. The old row also asked for edge-label polish, but labels already fit their lines and offset when reciprocal (`truncateLabels` and `labelPosFor` in `17_concordance`), and the row named nothing further.
- **Per-map JSON import and export** (Cartographia). Deferred at v1.6 "to the later, larger Cartographia work", which no plan defines yet.
- **CSV lexicon import** (Glossopoeia), deferred with a plan: a column-mapping step rather than a fixed header, add-only, a small inline parser, aimed so a Vulgarlang export lines up without hard-coding its columns. A Swadesh starter list is a separate and weaker follow-on, never built alongside it. The plan is in `roadmap-principles.md`, the 2026-06-23 (deferred) block.
- **Variant filter v2.** v1.5's r087 filter, generalized: variant as an entry-level attribute, the first world-scoped config slice, filtering across the specialty views, `showWhen` reading the variant, exports aware of it. Estimated at 14 to 22 r-bumps; the open question is how each view treats edges into entries the filter hides. It wants its own release slot. The plan is in `roadmap-principles.md`, the 2026-06-09 block.
- **Pen pressure** for Brush and Eraser (Drak, 2026-10-23, reversing the 2026-10-22 call that put it outside any scope he'd support). The map editor handles Pointer Events throughout (`18_cartographia`), so a pen's `pressure` is readable at every dab, and a raster stroke lands as pixels, so scaling dab size or opacity needs no schema change. A mouse reports a constant pressure and has to keep today's behavior. Freehand is a vector tool, so pressure there would mean variable-width paths, a bigger job.
- **Game Mechanics pack.** Shelved since 2026-06-17, mid-design, with no code written; `packs/game-mechanics-pack-reference.md` is the resumption point. Of its 15 templates, 8 are locked (with revisions awaiting sign-off), 1 is proposed, and 6 are not designed, and seven decisions are open. The full SRD seed for both editions is 12 to 18 sessions, most of it extraction. Templates first and the seed later is the cheaper route, and nothing is built against either.

## Backlog: engineering

- **`App` hooks-extraction.** `App` is about three quarters of the core. Shrinking it is a refactor that keeps behavior but not bytes, so the parity gate can't verify it; it needs a verification design before it needs code.
- **First-step context-completeness gate.** Not built. It matters only if editing goes module-scoped (loading the spine and one module instead of the whole tree).
- **A named `utils` module** for the 43-line `02_trunk` residue arc. Optional. `prove_gate_teeth.py` names `02_trunk.jsx` as a probe target, so the carve updates the probes in the same cut unless the before-code tooling item has made them find their targets by role.

## Backlog: product-text defects

Three were found by the independent read of the rewritten handoff on 2026-10-23, and the site's repository line by the Pipes check the same day. Each is a help, site, or product string, not behavior, and each is small; together they're a natural first v1.7 cut, and the help and the site would move together.

- **The Concordance help says the template filter comes back all-on after a reload** ("refresh the page and all templates are visible again", in the help module's Concordance topic). Since v1.5's r134 the filter opens empty, by design.
- **The save-file schema has no `longform` or `grid` shape.** The in-app JSON Save File Schema topic's field-type list and its field-values table omit both, and cartulary.world's JSON Structure page lists `grid` as a two-dimensional array (`grid[rowIndex][colIndex]`), which it isn't. The real shape is `{ rowAxisLabel, colAxisLabel, rows:[{id,label}], cols:[{id,label}], cells:{ [rowId]:{ [colId]:{ type, value } } } }` (`makeEmptyGrid` in `05_field-system`).
- **cartulary.world says there's no repository.** The documentation page's "The file is its own source" section says "There's no separate repository to clone", false since the repository went public on 2026-10-23. A site edit, no r-bump; the itch page and the zip README already name the repository.
- **A promoted Ephemeris event still writes "native recurrence support is not in v1.5"** into its notes (`12_trunk`). The version is stale; D.4 above is the feature it refers to.

## Tolerated

- **r025 through r030's cut scripts can't run where they sit.** r025 names an absolute path from the sandbox before the repository and r026 through r030 count two folders up, so since the 2026-10-19 move into `inlining/cuts/` they point at folders that don't exist. Their earlier trees aren't in the history either, so they couldn't be replayed anyway; they stay as the record of what ran (Drak, 2026-10-23).
- **A deleted parent language leaves its children's Descended From dangling** (Glossopoeia). The graph and the derive step skip dead pointers, so nothing breaks; a scrub on delete is cheap if it ever matters.

## Decided no

- **The map editor.** From the v1 won't-have list (`docs/cartographia-plus-spec.md`, section 7) and the shipped Limitations: no custom color picker; no layer opacity, blend modes, or per-layer export; no procedural generation; no image export beyond SVG and PNG; no grid or snapping beyond the rotation knob's Shift snap; no fog of war, measurement or scale tools, dice, or initiative tracking.
- **Kalendarium.** No per-day weather data, no holidays as recurring first-class entities, no auto-advancing current date: writers and GMs move time narratively. Field-level recurrence (D.4 above) is a different layer.
- **Concordance.** The empty-on-open template filter stays blanket; a size-threshold variant was declined at v1.5's r134.
- **Glossopoeia** stops at the diachronic fork: no stem-level paradigm derivation, no per-word derivation locks, no live parent-inventory fallback for varieties (all declined 2026-06-23).

## Deferred indefinitely

- Stemma v2 (sibling reorder, mention tracking, keyboard shortcuts, undo/redo, a depth cap, Markdown export)
- World-scoped custom assets (they gate the Scrap conlang migration)
- Mobile UX
- Per-filter-state Concordance position storage (positions are global per world)
- "Star Map" as a separate sidebar view (Concordance with saved positions is the star map)
- The Ephemeris sky-from-surface view

=== ADDED 2026-10-23 (session 19, after the v1.6 ship: the roadmap cut back to what is ahead) ===

**v1.6 shipped 2026-10-23** from the r051 tree: maps as records, the module tree, the map editor with painting, stamps, and brush packs, and the help and the site read against the application. The finals are `Cartulary_v1.6.html` (sha256 `b99381a041153d9d`) and `Cartulary_v1.6_Readable.html` (sha256 `e748142eadb3e1aa`), regenerable from the tagged tree, and the repository has been public since the same day. **No line is open.**

**v1.7 is not scoped.** It opens with the `VERSION` bump in `inlining/build_inline.py`, and the first product edit after that is r001. What goes in it is Drak's call. The three shapes on the table: a feature headline (the sector graph, variant filter v2, or the Game Mechanics pack), a consolidation release (hooks-extraction and the remaining housekeeping), or waiting to see what the first public issues ask for.

**What changed in this file.** The v1.5 plan, filed under "Active / Next Up" since before v1.5 shipped, and everything about v1.6 moved verbatim to `roadmap-archive.md`, where the v1.5 retrospective's "the v1.5 plan above" is now true. The backlog above was rewritten from the old backlog, the post-v1.5 carry-forward list, the handoff's post-pillar list (the handoff now points here instead of keeping a copy), and two deferred plans that lived only in `roadmap-principles.md` (CSV import, variant filter v2). Three rows were struck as already done, each checked against the tree or the record first, and a fourth was struck and then reopened:

- **Marriage dates on spouse declarations** shipped in v1.2 (the Married and Ended pickers); `marriedOn` and `endedOn` appear on 59 lines of the tree.
- **The data-shapes reference doc** was struck as covered by the in-app JSON Save File Schema topic and the site's JSON Structure page, and reopened the same night by the independent read: neither documents `longform`, and the site's `grid` shape is wrong. It's now a product-text defect above. The repository README points at both documents as the reference and says they're incomplete.
- **Ephemeris bug-audit rows BA-01, BA-02, and BA-04** were run and passed on 2026-06-23 against Drak's Dul Pantra world (`changelog-v1.5.md`, "Ephemeris Bug Audit closed"). The handoff and this file carried them as unrun for four months afterward.
- **The patch-notes format** was decided on 2026-10-22: one file per version in `docs/release-notes/`.

**Corrected the same night.** An independent read of the rewritten handoff and this file against the tree found the struck data-shapes row, the Concordance edge-label half of the polish row, the Game Mechanics row's "design done", the sector graph as the only headline-sized item, and this file's account of what the doc gate reads all wrong. Each is fixed above, and three product-text defects it found are now on the backlog.

**The journal row is done.** There was never a master `journal.txt` to import: the journal began as a turnover aid against context compaction, and Drak never collected the entries. Drak's call (2026-10-23): the repository is the master. `docs/journal.txt` replaces `journal-entry.txt`, keeps every entry oldest first, starts with the two entries the repository's history held (sessions 18 and 19), and the doc gate reads only its newest entry.

=== ADDED 2026-10-23 (session 19, later: v1.7 named) ===

**v1.7 is the Letters and Pipes update** (Drak, 2026-10-23): Letters is writing tools, with its scope held open until work on the app begins, and Pipes is the deficiencies a new adversarial review raised, addressed when code work is planned. The v1.7 section at the top of this file holds the carry-in fixes and the before-code list. **No line is open** until the `VERSION` bump; v1.6 stays shipped from the r051 tree (finals `b99381a041153d9d` and `e748142eadb3e1aa`). The entry-ref audit and Drak's files moved from the housekeeping backlog into the before-code list, which is now their one place.

**The cut-script names are settled** (Drak, 2026-10-23), closing the before-code item that asked how v1.7's would be named: from v1.7 a script is `inlining/cuts/v<version>_r###_description.py`, the tag plus a description, and v1.6's 27 stay where they are. A new script finds the repository by walking up to the folder that holds `cartulary-src/`. Checking the item found r025 through r030 pointing at folders that haven't existed since the move into the repository; r031 through r051 each reproduce their tag exactly when replayed (the changelog has the method).

**Re-checked before presenting** (2026-10-23, at Drak's ask). Every standing row that makes a claim about the tree was read against the r051 source, and all of them hold: `VERSION` reads `'1.6'` and the export's two version literals read v1.6; the three product-text defects are still in `26_home-data`, `site/helloworld.html`, and `12_trunk`; `makeEmptyGrid` is in `05_field-system`; Concordance has `truncateLabels` and `labelPosFor` and no auto-place; `prove_gate_teeth.py` still names `11_io-utils.jsx` and `02_trunk.jsx`, `finals` still writes to `/tmp`, and `02_trunk` is 43 lines; the manifest is 91 KB; and `docs/release-notes/` still lacks the v1.4 notes and the v1.5 README. What changed: the v1.7 section gains the line's names, the skill refresh says what the installed copy is missing, v1.5's r087 says which line it's from, and r025 through r030's scripts are filed under Tolerated.

**The release notes are filled in** from Drak's archive of every release (2026-10-23): the v1.4 patch notes, the text in the v1.0 through v1.4 zips byte for byte, and an index with every release's finals hashes (`docs/release-notes/README.md`), which the repository had never recorded. That takes the release-notes half off before-code item 2. The row also asked for the v1.5 zip's README, but that zip held none.

**The v1.6 itch screenshots are up** (Drak, 2026-10-23), which leaves item 2 as the skill refresh: `tools/turnover/SKILL.md` was brought current first, and the card that replaces the installed copy with it waits on Drak.

=== ADDED 2026-10-23 (session 19, later: the review's list and the entry-ref read) ===

**The review's list is in**, all eight items checked against the tree and every one holding; they sit in the v1.7 section with what each would take, and none is scheduled until Drak's call. **The entry-ref read is done** (`docs/entry-ref-audit.md`): eight flags for Drak, and on the way a data-loss bug that shipped in v1.5 and v1.6, now the first item in the v1.7 section. **Pen pressure is on the feature backlog** (Drak), out of Decided no. **The refreshed turnover skill is saved**, so the installed copy is `tools/turnover/SKILL.md`; the package still holds the old script copies, which that file tells every session to ignore. The before-code list is rewritten around Drak's three calls. **No line is open.**
