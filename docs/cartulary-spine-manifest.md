# Cartulary spine manifest (pillar 2 modularization)

Authoritative module map for the v1.6 modularization. This file is the oracle both
modularization gates check against: first-step verify (context-completeness) and
end-step confirm (reconstitution-parity). It is updated in the same pass as every
split or combine, never out of band.

Line-number source of record: `Cartulary_v1.6_Working_r001_(maps-promotion).html`, the
babel block (39,336-line total at r001; the L-numbers in sections 1-9 are relative to it). That r001 figure is NOT the current body length and should not be used as a sanity check: the current assembled body is **41,490 lines** (r038 anchor). Gathers and pure carves preserve line count; the delta against r001 is one line of r001-vs-r003 accounting (the r002/r003 gathers predate the anchor), the two comment lines r026 added, and the 176, 280, 469, 254, 322, 464, 158, and 30 lines r031 through r038 added. When checking a fresh clone, compare against the ACTIVE anchor's length, not this number, and count with Python `splitlines()` rather than `wc -l`: as of r038 the tree is **38 module files** and **30 of them have no trailing newline**, so `wc -l` under-reports the total by exactly 30. That figure moves with every carve; re-derive it from the tree rather than quoting it.
Those line numbers are ADVISORY: find code by NAME, never by line number, and do not trust
them against the current tree. The build source of record is no longer this HTML; it is the
module tree. **Section 10 is the live source layout, carve status, and r-policy, and
supersedes any pre-carve framing above it.**

Status (session 19, r038): the source lives in `github.com/Drakhanas/Cartulary` (private)
as of session 19, with CI running every gate on every push. The pipeline assembles the babel
body from a module tree and is DIRECTORY-AWARE; the reconstitution gate scores five conditions
on a pure split, four on a gather, and seven on a scoped content edit (`edit` mode, session
19), and has had two verdict bugs found and fixed (section 10, Gate verdict).
**Every map-independent module is carved.** The shared/companion tier (home-data r004,
modals r005, io-utils r006, temporal r007, persistence r008, calendar-engine r009,
export-layer r010, template-builder r011, migrate r012, form-engine/display r014,
form-engine/edit r015, builtin-templates r017, field-system r019), the two DIRECTORY views
(`glossopoeia/` r023 in five parts, `ephemeris/` r024 in seven), and the four flat views
(stemma r027, linea r028, chronometric r029, kalendarium r030). **Nine gather cuts have run
in total** (r002, r003, r013, r016, r018, r020, r021, r022, r025); the first two predate the
reconstitution gate and were verified by multiset against the r001 body, so **seven are
anchor-rotating gathers**. Quote the count as "seven anchor-rotating gathers" or "nine
gather cuts"; bare "seven gathers" contradicts the session-11 record. The anchor has
rotated sixteen times, because r026 (one header replaced by two, a comment edit) and the pillar-3
content cuts r031 through r038 rotated it as well; the active anchor is `reference-r038-body.jsx`. **Header integrity is CLOSED**
(section 11): r025 swept eleven shears, r026 replaced the one held back, and zero sheared
headers remain. **Pillar 2 is parked behind pillar 3**: only `concordance` and
`cartographia` remain, both in `16_trunk`, both held by decision until the drawing editor
has landed so they carve against their final shapes. Pillar 3 is under way: cut 1 of 8, the
drawing data model, landed at r031 (+160 lines in the cartographia run), cut 2, the SVG
canvas, at r032 (+241 there and +39 in `08_export-layer`), cut 3, the drawing tools, at
r033 (+469 there and 36 lines of CSS in `shell.html`), cut 4, text, undo/redo, and layers,
at r034 (+254 there and 19 lines of CSS), cut 5, stamps, frame handles, and labels on an arc,
at r035 (+322 there and 13 lines of CSS net), and cut 6, stamp packs, at r036 (+403 there, +53 in
`24_home-data`, +7 in `12_trunk`, +1 in `08_export-layer`, one line of `25_trunk` rewritten, and 23 lines of CSS), and cut 7,
the per-map download, at r037 (+158 there and 2 lines of CSS), and cut 8, the help and the site, at r038 (+30 in
`24_home-data`, one line of `16_trunk` rewritten in place, and the site outside the tree). Sections 1-9 are the ownership map,
still authoritative for what-goes-where. Section 8 is the historical gather record
(r002/r003); section 10 carries the r013 through r038 record. Line numbers in sections 1-9
are pre-r002 and advisory.

---

## 0. Decisions locked (session 11)

- **Spine sized to minimal core.** Old §3 spine (~12,800 lines) reduced to ~6,000 by
  moving `migrate` and `HOME_SECTIONS` out. Granularity preference: more, smaller
  modules over fewer large ones, to keep per-session context load low.
- **`migrate` → companion module.** Order-dependent step sequence, one-way deps,
  consumed only by `App` on load. Loaded whole for migration-work sessions, excluded
  from view-editing sessions. Not splittable (steps are sequential), but fully liftable.
- **`HOME_SECTIONS` → `home-data` module.** Static help/reference content, only
  consumer is `HomeView`. Leaves the core.
- **`App` stays in core.** Dominant remaining cost (~75% of core). Shrinking it
  requires hooks-extraction (a refactor, not a pure carve), which fails the
  normalized-diff gate. Deferred to a separate risk tier; NOT phase-1.
- **Ephemeris → directory.** CONFIRMED and BUILT at r024, but as **seven** sub-modules,
  not the six proposed here. The proposed `orbital-math` grouping lumped body-kind
  taxonomy (`BODY_KINDS`, `NARRATIVE_BODY_KINDS`, `BODY_KIND_*`, `isComputableKind`,
  `buildBodyTree`, `makeNewCelestialBody`) together with actual orbital mechanics
  (Kepler solvers, apsides, habitable zone, the alignment finders). Those two halves sat
  in separate contiguous runs at opposite ends of the zone, so unifying them would have
  cost a relocation to produce a grouping that was never defensible on content. They are
  `body-kinds` and `orbital-math` instead, and both carved with zero relocation. Final
  layout: body-kinds / shell / asbo / observe / forcealign / compute / orbital-math.
- **Glossopoeia → directory.** CONFIRMED and BUILT at r023, five sub-modules exactly as
  proposed: schemas / substrate / grammar / components / view. The proposal was flagged
  vetoable through session 15 and Drak locked it in session 16.
- **Directories are real subdirectories, not a filename convention.** A carved directory
  is `modules/NN_name/` holding its own `NN`-prefixed parts. `build_inline.py` walks the
  tree with `rglob` and sorts on the posix-relative path, which orders outer `NN` before
  inner `NN` correctly with no special-casing.
- **Form engine → directory** (display path / edit path).
- **Form-engine | builder boundary:** one-way edge, builder imports `EntryForm`.
  (Session-0 plan expected four interleaved builder components -- `SelectOptionsInput`,
  `CascadeOptionsInput`, `MultiTemplateRefConfig`, `SubfieldList` -- to need relocation out
  of the form-engine range before either could carve. STALE as of r010: at carve time they
  already sat contiguously ahead of the rest of template-builder, so **template-builder
  carved clean as a pure split at r011** with no relocation. Nothing dual-owned.)
- **Form-engine display | edit boundary (settled r014/r015):** the split point is
  `ImageFieldEditor`, NOT `EntryForm`. `ImageFieldEditor` sits physically ahead of
  `EntryForm` in source order, so cutting at `EntryForm` would drag an edit member into
  display. `form-engine/edit` therefore OPENS with `ImageFieldEditor`. The builder ->
  `EntryForm` seam above is unaffected (`EntryForm` is still inside edit).

---

## 1. Spine core (loads every session)

The irreducible context every module-scoped session pulls. Target: keep this small.

| Group | Owns | L-range(s) |
|---|---|---|
| Shell | `App`, `Sidebar`, `ProjectView`, `HomeView` (component only, not its data) | 10811-15635, 38490-38604 |
| Registry | `NODE_SOURCE_REGISTRY`, all `SYNTH_TPL_*` + `*_REF_LABEL`, `getRegistered*` accessors, `BODY_REF_SENTINEL/LABEL` | 25726-26051, 1443-1452 |
| State factories | `makeInitialState`, `makeDefaultEphemerisState`, `makeDefaultGlossopoeiaState`, `makeDefaultCartographiaState`, `cartographiaMapSchema`, `CART_FIELD_*`, `SCHEMA_VERSION` | 4380-4524, 66 |
| Constant tables | `FIELD_TYPES`, `SUBFIELD_TYPES`, `MAX_GROUP_DEPTH`, `GRID_CELL_TYPES`/`_SET`/`_LABELS`, `ICONS`, `COLORS`, `TEMPLATE_ORIGIN` | 68-296 |
| Settings view | `SettingsView` | trunk head of `16_trunk` |
| Generic utils | `genId`, `fmtDate`, `isoNow`, `slugify`, `htmlEscape`, `hexToRgba` | 1139-1154, 3520, 2588 |

Core total ≈ 6,000 lines. `App` is ~4,532 of that. See §6 for the deferred App question.

**Constant-table note (r018).** Ownership of the constant tables is UNCHANGED, but three of
them moved position at r018: `GRID_CELL_TYPES`/`_SET`/`_LABELS` were wedged between
field-system's `subfieldTypesAtDepth` and its grid-helper run, and were relocated up to sit
beside `FIELD_TYPES`/`SUBFIELD_TYPES` so field-system could gather. They remain spine-owned.
(This note lived in a fourth cell of a three-column table row until session 16, which meant
no markdown renderer ever displayed it.)

**`SettingsView` note (added session 16, updated session 18).** `SettingsView` (273 lines) had no owner anywhere
in this manifest through session 15: not in the spine tables, not in any module row in §3,
§4, or §5. It is spine-owned residue and stays in the trunk. Recorded explicitly because
once `concordance` and `cartographia` carve out of `16_trunk`, `SettingsView` is the only
thing left in that arc, and the next reader will ask why. The node-source registry, which
used to share the arc, has been its own residue arc (`20_trunk`, 354 lines) since the r027
stemma carve split `16_trunk` on both sides of stemma.

---

## 2. Companion (load-on-demand, migration sessions only)

| Module | Owns | L-range | Notes |
|---|---|---|---|
| `migrate` | `migrate`, `validateMigrated`, `normalizeEntryFields`, `isCalendarDateZombie`, `cleanCalendarDate`, `collectCalendarDateUsages` | 4583-4725, 4726-10236, 10303-10409 | Order-dependent step sequence. Not splittable. One-way deps on registry, builtin-templates, field-system, calendar-engine. No view depends on it. **CARVED r012** (`10_migrate.jsx`), 2-way arc-boundary split: the six members are one contiguous run at the tail of the old `06_trunk` [stale: pre-r012 arc name] (the "tail check" flag was stale; a prior gather had already unified it), kept the `Field normalization` header. Note the resulting assembly inversion: `makeInitialState` (trunk head, slot 06) calls `migrate` (slot 07); safe, runtime-only const arrow. |

---

## 3. Data modules

| Module | Owns | L-range | Notes |
|---|---|---|---|
| `builtin-templates` | `BUILTIN_TEMPLATES`, `seedBuiltinTemplates`, `makeTemplateFromBuiltin`, `resolveTemplateRefs` | 299-1138, 1265-1285, 1181-1264 | Carve as one whole module (do not sub-split). Imported by spine seed path, builder, migrate. **GATHERED r016** (resolver trio moved up past the six-decl util wedge to meet the array); **CARVED r017** (`01_builtin-templates.jsx`, 942 lines). `TEMPLATE_ORIGIN` was NOT swept in: it sits directly above the array but section 4 owns it under the spine constant tables, so the cut is at its closing brace. The carve left the util wedge (`genId`, `fmtDate`, `isoNow`, `slugify`, `formatSnapshotTimestamp`, `formatSnapshotSize`) as a 43-line residue arc, the smallest in the tree, and a candidate for a later named `utils` carve. |
| `home-data` | `HOME_SECTIONS` | 37162-38489 | Static help content. Sole consumer `HomeView`. **CARVED r004** (`24_home-data.jsx` at r030). |

---

## 4. Shared modules

Imported by whichever modules need them; not carried by the core.

| Module | Owns | L-range(s) | Consumers |
|---|---|---|---|
| `field-system` | grid helpers (`makeEmptyGrid`..`canonicalTemplateForReconcile`), `subfieldTypesAtDepth`, relation/ref helpers (`getRelationValues`, `getEntryRefIds`, spouse mirror set, `isEntryDeceased`, `templateSupportsDeceased`), ref-maintenance (`scrubEntryRefs`, `countInboundEntryRefs`, `scrubSelfRefs`, folded in at r003), field visibility/layout (`isFieldVisible*`, `buildFieldLayoutUnits`, `isFieldHalfWidthEligible`, `HALF_WIDTH_ELIGIBLE_TYPES`), `validateRequiredFields`, cascade/select helpers | 98-260, 1433-1925 | form-engine, builder, export, several views, migrate. **GATHERED r018; CARVED r019** (`05_field-system.jsx`, 768 lines, 35 decls). The r018 gather was TWO relocations, because zone A was internally split as well as separated from zone B: `subfieldTypesAtDepth` was orphaned above a wedge of three SPINE constants (`GRID_CELL_TYPES`/`_SET`/`_LABELS`). Those three moved UP to sit beside `FIELD_TYPES`/`SUBFIELD_TYPES` (spine ownership preserved, see §4 constant tables), then the contiguous zone A moved down to meet zone B above `getRelationValues`. |
| `io-utils` | `verifyHandlePermission`, `sanitizeFilename`, `generateUniqueFilename`, `fileToDataUrl` | contiguous block before `App` (r003) | export-layer, form-engine/edit (image editors), cartographia, App. **CARVED r006** (`11_io-utils.jsx`), kept its section header. |
| `calendar-engine` | `DEFAULT_CALENDAR`, date math (`calendarDateToAbsoluteDay`..`getSeasonForDayOfYear`), `DATE_FORMAT_PRESETS`, moon-phase helpers, import helpers (`ensureCalendarShape`/`normalizeImportedCalendar`/`regenerateCalendarId`, moved here from stemma r002), `CalendarEditor` | 1926-2607, 19336-19661 | kalendarium, ephemeris, chronometric, cartographia, form-engine date fields, migrate. **Gathered r002; CARVED r009** (`06_calendar-engine.jsx`): date math + moon helpers + import helpers + `CalendarEditor` are one contiguous run. |
| `temporal` | `getEntryTemporalRange*`, `isPinVisibleAt*`, `resolveEntryNameAtYear`, `getEntryNameHistory`, wiki-link resolvers | 2689-2916 | cartographia, concordance, chronometric, export. **CARVED r007** (`07_temporal.jsx`); the `Map time-mode helpers` section header travelled with it. |
| `export-layer` | markdown render/build (`renderFieldForMd`..`buildMarkdownExport`), html render/build (`collectImageRefsForHtmlExport`..`buildHtmlExport`), `renderMapHtml`, `renderEntryArticleHtml`, `extractThemeVars`, `HtmlExportModal` | 2949-4379, 38749-38828 | App export handlers. **Gathered r002; CARVED r010** (`08_export-layer.jsx`): render/build + `HtmlExportModal` are one contiguous run. |
| `persistence` | DB constants + `openDB`/`migrateLegacyDB`/`db*`, snapshot layer (`snapshot*`, `db*Extra`, `db*ByPrefix`), `VersionHistoryPanel` | 1286-1432, 10410-10810, 38923-39143 | App. **Gathered r002; CARVED r008** (`03_persistence.jsx`): DB + snapshot + `VersionHistoryPanel` are one contiguous run. (The four file helpers moved to `io-utils`, carved r006; the ref-scrub helpers folded into `field-system`, r003.) |
| `form-engine/display` | `EntryList`, `EntryView`, `InlineWikiLinkText`, `FieldValueDisplay`, `ImagePreview`, `MarkdownDisplay`, `LongformDisplay` | 15749-16278 (display subset) | App routes, builder preview (via EntryForm). **GATHERED r013; CARVED r014** (`13_form-engine-display.jsx`, 656 lines, exactly the seven members). The r013 gather moved `LongformDisplay` + `MarkdownDisplay` 139 lines up out of the edit block to sit immediately before `FieldValueDisplay`, their only caller (affinity placement); that one relocation freed BOTH this module and `form-engine/edit`. |
| `form-engine/edit` | `ImageFieldEditor`, `EntryForm`, `WikiLinkInput`, `refHintFor`, `FieldLabelText`, `MultiSelectEditor`, `IPA_CHART`, `IpaTextInput`, `FieldEditor`, `AutoTextarea`, `EntryRefEditor`, `GridEditor`, `GroupEditor`, `LongformEditor`, `RichTextEditor`, `CalendarDateEditor`, `CalendarDateRangeEditor`, `NameHistoryEditor` (18 members, source order) | 16409-18194 | App entry routes; exposes `EntryForm` to builder. **CARVED r015** (`14_form-engine-edit.jsx`, 1,777 lines): all 18 members, running to the arc tail. 2-way arc-boundary split with no residual tail, so the cut was a rename of the residue left by r014. Freed by the r013 display gather (no gather of its own). NOTE the module OPENS with `ImageFieldEditor`, not `EntryForm` (see the §0 display/edit boundary note). Through session 15 both this row and the handoff said "17 members plus `ImageFieldEditor`", which double-counted it; the file has exactly 18 top-level declarations. |
| `template-builder` | `SelectOptionsInput`, `CascadeOptionsInput`, `MultiTemplateRefConfig`, `SubfieldList`, `PREVIEW_*`, `setupPreviewPopup`, `updatePreviewPopupTitle`, `TemplatePreviewBody`, `TemplateBuilder` | 18195-19298 | App template routes. **Imports `EntryForm`** from form-engine/edit (one-way). |
| `modals` | `DestructiveOpModal`, `ResetTemplateModal`, `RestoreBuiltinsModal` | 38829-38922, 39144-39333 (contiguous at r006 once the r002 persistence gather vacated the gap between them) | App. **CARVED r005** (`26_modals.jsx` at r030); doc-comment travelled with it, Mount header went to the trunk tail. |

---

## 5. View modules

| Module | Owns | L-range(s) | Carve phase |
|---|---|---|---|
| `glossopoeia/` (directory) | schemas (`glossopoeia*Schema`, nav, labels), substrate (`glossSyllabify`..`glossApplyDaughters`, import/export, fork, romanize, daughters), grammar (`glossGrammar*`, blocks-to-md/html), components (`GlossEntityList`, `GlossWorkspaceNote`, `GlossToolboxDigest`, `GlossWordGenerator`, `GlossSurfaceLine`, `GlossParadigm`, `GlossSentenceGloss`), `GlossopoeiaView` | 26052-29163 | **GATHERED r022; CARVED r023.** Five sub-modules, 3,119 lines: `00_schemas` (476, 25 decls) / `01_substrate` (1,025, 20) / `02_grammar` (380, 6) / `03_components` (393, 7) / `04_view` (845, 1). The r022 gather was ONE relocation: `GlossEntityList` + `GlossWorkspaceNote` + `GlossToolboxDigest` (194 lines) sat mid-substrate and moved down to join the other four components, which unified `substrate` and `components` in a single move. All three are function declarations with zero references in the 790 lines they crossed, so the direction was free. |
| `ephemeris/` (directory) | body-kinds (`makeNewCelestialBody`, `buildBodyTree`, `BODY_KINDS`, `NARRATIVE_BODY_KINDS`, `BODY_KIND_BY_ID`, `BODY_KIND_COLORS_DEFAULT`, `observeColorForKind`, `isComputableKind`), shell (`EPHEMERIS_MODES`, `EphemerisView`, `EphemerisModeTabs`, `EphemerisBodyTree`, `EphemerisPlaceholderPane`), asbo (`AsBo*`, `FIELD_TOOLTIPS`, `asboInputStyle`, `asboLabelStyle`, `getChildrenLabel`), observe (`ObserveModeContent`, `observeButtonStyle`, `EventModeContent`), forcealign (`ForceAlignModeContent`), compute (`ALIGNMENT_TYPES`, `DEFAULT_TOLERANCE`, `computeQualityScore`, `ComputeModeContent`, `ComputeTabSwitcher`, `ComputeQueryPanel`, `ComputeAbsoluteDayInput`, `ComputeResultsPanel`, `QualityBadge`, `ComputeDetailDrawer`), orbital-math (`fmtNum`..`findInvalidBodiesForType`) | 25551-25725, 29164-36305, 19299-19335 | **GATHERED r020 + r021; CARVED r024.** Seven sub-modules, 7,307 lines: `00_body-kinds` (187, 8 decls) / `01_shell` (696, 5) / `02_asbo` (1,459, 16) / `03_observe` (1,937, 3) / `04_forcealign` (585, 1) / `05_compute` (1,177, 10) / `06_orbital-math` (1,266, 36). Largest module in the tree, 1,468 lines over `migrate`. **Carve-time check ANSWERED (session 16):** orbital-math is not consumer-free. `makeNewCelestialBody` has two consumers in the spine (`12_trunk`), `ALIGNMENT_TYPES` has one; all three sit inside function bodies, so all are call-time and none block the directory. |
| `chronometric` | `TimelineView`, `ChronometricsView`, `ChronoEditPanel` | 21592-23119 | **CARVED r029** (`17_chronometric.jsx`, 1,528 lines, 3 decls). Pure split out of `16_trunk` 2052-3579 (r028 numbering), carrying the `Timeline view` header r025 gave it. Contiguity confirmed session 16, re-confirmed by name at the cut. |
| `linea` | `buildFamilyData`, `buildFamilyTree`, `FamilyView` | 23120-23770 | **CARVED r028** (`18_linea.jsx`, 646 lines, 3 decls). Pure split out of `16_trunk` 3580-4225 (r027 numbering), carrying the `Family tree view` header. |
| `stemma` | `STEMMA_SLOTS`..`StemmaIndexView` (slots, id/normalize helpers, `StemmaNode`, `StemmaPlusSlot`, `StemmaSmartInput`, inspectors, `StemmaCanvasView`, `StemmaIndexView`) | 23771-25407 | **CARVED r027** (`19_stemma.jsx`, 1,410 lines, 18 decls). Pure split out of `16_trunk` 4226-5635 (r026 numbering), carrying the `Stemma helpers and canvas` header and its doc block; the node-source registry that followed it became `20_trunk`. (The three calendar-import helpers formerly lodged here moved to `calendar-engine` at r002; ownership closed, see §8.) |
| `kalendarium` | `KalendariumIndexView`, `CalendarGridView`, `KalendariumEditorView` | 36306-37161 | **CARVED r030** (`23_kalendarium.jsx`, 876 lines, 3 decls). A whole-arc rename with zero residue, the same shape as `io-utils`: r025 had moved the arc's two-line tail (a boundary blank plus the home-data header) to `home-data`, so nothing was left to split. |
| `concordance` | `GraphView`, `VAGUE_EDGE_LABELS` | 19935-20954 | **last** (pin-edge rewire touches it). Contiguous in `16_trunk` at r030; current span in section 10. |
| `cartographia` | `useMapImageUrl`, `useResizeHandler`, `MapPin`, `MapView`, `MapEditor`, `CartographiaIndexView` | 20955-21591, 25408-25550 | **last** (editor pillar lands here). **Gathered r002:** canvas + index now one contiguous run, and still one at r030; current span in section 10. |

---

## 6. Deferred: the App question

`App` is ~4,532 lines and ~75% of the post-relief core. Its bulk is handler sets
(per-view open/create/edit/save/delete, draft-discard guards, import/export
orchestration, snapshot orchestration) that close over `App`'s `useState`/`useRef`.
Extracting them into custom hooks would shrink the core further but is a
behavior-preserving refactor, not a pure text split: it changes structure, so the
normalized-diff gate cannot verify it as invisible. It carries a different risk
profile (browser-verify required, behavior-equivalence not byte-equivalence) and is
out of phase-1 scope. Revisit after the clean carves land and parity is established.

---

## 7. Cross-module seam edges (asserted so far)

- `template-builder` → `form-engine/edit` (`EntryForm`), one-way. `TemplatePreviewBody`
  renders a live `EntryForm`. No cycle.
- everything graph-bearing → `registry` (spine). Views register node-sources; `GraphView`
  re-emits edges from registered sources.
- `export-layer` → `field-system`, `calendar-engine`, `temporal`, `builtin-templates`.
- `migrate` → `registry`, `builtin-templates`, `field-system`, `calendar-engine`.
- date-bearing views (`chronometric`, `cartographia`, `kalendarium`, `ephemeris`) →
  `calendar-engine`, `temporal`.
- `App` → everything (it's the shell). This is why App stays core.

Edges not yet traced exhaustively; each tightens when its source module carves.

---

## 8. Gather status (resolved at r002)

The r002 relocation pass gathered scattered module members into contiguous module
homes. Pure relocation: normalized-diff verified (37,302 code lines identical as a
multiset, 419 decls preserved), parse-clean, browser-verified (r001-r003). Each gathered
module is now a single contiguous decl run, so its carve is a clean slice.

RESOLVED:

- `calendar-engine`: `CalendarEditor` and the three import helpers (`regenerateCalendarId`,
  `ensureCalendarShape`, `normalizeImportedCalendar`) moved up to sit after
  `computeMoonPhase`. The date math + moon helpers + import helpers + `CalendarEditor`
  are now one run. The import helpers were misfiled in the stemma region; this also
  clears `stemma` of code it never owned (ownership question closed: they are
  calendar-engine, used by date math, `migrate`, `App`, and `CalendarEditor`).
- `export-layer`: `HtmlExportModal` moved up to sit after `buildHtmlExport`. Render/build
  + modal now contiguous.
- `persistence`: snapshot machinery (`FSAA_SUPPORTED` through `snapshotDeleteAll`,
  including db-extra and snapshot caps) and `VersionHistoryPanel` moved up to sit after
  `dbSetPrefs`. The DB layer + snapshot layer + history panel are now one run.
- `cartographia`: `CartographiaIndexView` moved up to sit after `MapEditor`. Canvas +
  index now contiguous. (This is what r001's data-model promotion did NOT do; r001
  unified the data, not the JSX layout.)

RESOLVED at r003 (the micro-gather the persistence move surfaced):

- entry-ops (`scrubEntryRefs`, `countInboundEntryRefs`, `scrubSelfRefs`) folded into
  `field-system` next to the existing ref/relation family. io-utils
  (`verifyHandlePermission`, `sanitizeFilename`, `generateUniqueFilename`,
  `fileToDataUrl`) became a standalone `io-utils` module (already contiguous before
  `App` once entry-ops left, no move needed). Pure relocation, normalized-diff verified,
  parse-clean, browser-verified (r001-r003).

---

## 9. Build-order (from the frozen plan, modules slotted)

*(Progress against these steps is tracked in section 10. As of r030: steps 1, 2, and 3 are DONE. Step 4, pillar 3, is next; concordance + cartographia stay last.)*


1. modularization infra (build_inline.py rework + this manifest + gate tooling)
2. carve map-independent shared modules: `field-system`, `calendar-engine`, `temporal`,
   `export-layer`, `persistence`, `modals`, `form-engine/*`, `template-builder`,
   `builtin-templates`, `home-data`; companion: `migrate`
3. carve map-independent views: `glossopoeia/`, `ephemeris/`, `chronometric`, `linea`,
   `stemma`, `kalendarium`
4. (pillar 3: drawing editor builds into cartographia)
5. carve `concordance` + `cartographia` last, against final shapes


---

## 10. Source layout and carve status (session 19, r038)

**The source is a module tree, not the monolith.** The line ranges in sections 1-9 above stay babel-body-relative to the r001/pre-r002 numbering and are advisory (find by NAME, never line number). What is authoritative for the build is the module tree below.

### Layout

- `cartulary-src/shell.html` : the page scaffolding (head, dependency `<script>` tags, mount div), with one `@@CARTULARY_BABEL_BODY@@` sentinel where the assembled babel body injects. The body's trailing newline is owned by the shell (sits after the sentinel).
- `cartulary-src/modules/NN_name.jsx` : a flat module. `NN` is a two-digit assembly-order prefix; `name` is the module/carve name.
- `cartulary-src/modules/NN_name/NN_part.jsx` : a DIRECTORY module (as of r023). The directory carries the outer assembly-order prefix; each part inside carries its own `00`-based prefix. Two exist: `21_glossopoeia/` and `22_ephemeris/` (they were `17_` and `18_` until the r027-r029 carves inserted three modules and a residue arc ahead of them).
- Concatenated in that order, flat files and directory parts interleaved, they reconstitute the body exactly.
- `cartulary-src/reference-r0NN-body.jsx` : the frozen parity anchor, **currently `reference-r038-body.jsx`**, found by glob (exactly one may exist; the gate refuses on zero or two) rather than named in code since session 19. Every PURE carve must reassemble to the ACTIVE anchor byte-for-byte; the reconstitution gate checks against it.
- `cartulary-src/reference-r0NN-layout.json` : the anchor's companion since session 19, **currently `reference-r038-layout.json`**: the per-file line counts that segment the anchor, the anchor's sha256, and the shell's text and sha256. `edit` mode locates each file's anchor segment through it and refuses one written for another anchor; `freeze` writes it. The anchor ROTATES on every cut that changes assembled bytes: every gather (seven so far: r013, r016, r018, r020, r021, r022, r025), r026, a comment edit, and the content cuts r031 through r038, which makes sixteen rotations; always after the browser pass, never before. It does not rotate on a pure split. Retired anchors are deleted at rotation, so a reference to any earlier anchor filename is stale by definition. See the Anchor history block below.

### Build

`build_inline.py` modes: `working` (assemble shell + tree into the working HTML), `verify` (the reconstitution gate for a pure split), `gather` (the relocation gate, added r025), `edit` (the scoped-edit gate for a content cut, added session 19: declared files and declaration delta, everything else held to the anchor through the layout), `freeze` (rotation, added session 19: new anchor plus layout from the current tree, retired pair deleted, nothing to repoint), `finals` (the unchanged dual-build, release-prep only, fed the assembled HTML). Paths derive from the script's own location since session 19, so the clone can sit anywhere; invoke as `python3 inlining/build_inline.py MODE` from the repository root. Assembly is ordered concatenation, never dependency resolution. `canonicalize.py` holds the gate's normal forms (sequence for pure splits, multiset for gathers, decl-name-set invariant, and `header_pairs()` since r025).

**Directory-aware enumeration (changed r023).** `module_files()` walks the tree with `rglob` and sorts on the posix-relative path:

```python
files = sorted(MODULES_DIR.rglob(MODULE_GLOB),
               key=lambda f: f.relative_to(MODULES_DIR).as_posix())
```

The explicit key is deliberate. Path ordering happens to give the same answer, but the assembler is the thing every gate depends on, so the ordering rule is written down rather than inherited from `PurePath.__lt__` semantics. Outer `NN` sorts before inner `NN` with no special-casing (`20_trunk.jsx` < `21_glossopoeia/00_schemas.jsx` < `22_ephemeris/00_body-kinds.jsx` < `23_kalendarium.jsx`). `working` mode also prints module identities as posix-relative paths rather than bare filenames, so `21_glossopoeia/00_schemas.jsx` is distinguishable from `22_ephemeris/00_body-kinds.jsx`.

**Anything that rebuilds the assembly by hand is now wrong.** Any snippet that does `MODULES_DIR.glob(MODULE_GLOB)` directly will silently miss every directory part. Call `build_inline.assemble_body()` instead; it is the single assembly path and it cannot drift from the build.

### Gate verdict (bug found and fixed r023)

`mode_verify()` scored its verdict as `ok = seq_ok and decls_ok`. `byte_ok` was computed and printed but never entered the decision. Because `canonicalize` drops blank lines before comparing, a dropped or added BLANK line passes canonical-sequence and decl-set untouched, and byte-identity is the only check that sees it. So the gate reported **GATE GREEN** on exactly the combination this document has always described as a RED, and it had done so since the gate was built.

Nothing slipped through: byte-identity printed `exact` on every pure split from r004 forward, so the information was on screen even when the verdict ignored it. But the r014 dropped-blank incident, the one time the third check earned its keep, was caught by a human reading the line, not by the gate failing. Fixed at r023 to `ok = seq_ok and decls_ok and byte_ok`, and re-proven: a dropped blank line now exits 1 with GATE RED.

**`raw_ok` had the identical defect and was fixed at r025.** The gather check computed a raw line count, printed it, and scored the verdict from multiset and decl-set only. On a gather, sequence and byte-identity are expected to differ and every other check runs on blank-stripped lines, so a dropped or added blank was invisible to the verdict from r004 to r025. Two gates, same shape, twenty r-numbers apart: **a check that is computed and printed but excluded from the verdict is worse than no check, because it reads as coverage.**

**Teeth re-proof is mandatory after any change to the assembler, the gate, or the tree's numbering**, and it now lives in `prove_gate_teeth.py` rather than as prose here, because a check that lives in prose decays. Its misfile probe hard-coded the kalendarium and home-data paths by their r025 prefixes (19 and 20) through r029 and crashed on the reflowed r030 tree, where they are 23 and 24; it now resolves the home-data module by name suffix and takes whichever file precedes it in assembly order. Eighteen probes: drop one code line, drop one blank line, rename one declaration, shear a section header (in both `verify` and `gather`), misfile a header to another file's tail, drop a blank in `gather` mode, and eleven for `edit` mode (a positive control that must go GREEN, an edit outside the declared scope, an undeclared declaration added, a declaration lost in scope, a declared file ending on a blank, a misfiled header in scope, a shear reported not scored, a stale layout, a renamed file, the shell changed undeclared and declared). Every probe must read OK; a MISS is a blind spot and you fix the check, never the probe. The script re-anchors each sandbox on the CURRENT tree before mutating, so it still reports the truth between a gather and its rotation. The blank-line probe found the `byte_ok` bug and the gather blank-line probe found `raw_ok`; both are the ones that feel redundant. Do not confuse this with `prove_teeth.py`, which probes the DOC gate `check_docs.py`.

### r-counter policy (changed session 12)

One r-bump per FULL carve OR gather OR other byte-changing cut, not per HTML edit. A pure carve produces byte-identical assembled output, so the old "increments only on HTML changes" rule would never advance through modularization. The pipeline rework itself carried no bump (infra); it rode into r004 with the first carve. The r023 assembler change and gate-verdict fix rode into r023 the same way, and the r025 gate additions rode into the header sweep. r026, which was neither a carve nor a gather, took a bump of its own because it changed bytes and rotated the anchor. The session-19 edit mode and the move into the repository changed no bytes and took none; r031 through r038, the first content cuts, took one each.

### Carve status

Residue arcs are all named bare `trunk` (distinguished by `NN` prefix); carved modules get real names.

| Carve | r | Module file | Status |
|---|---|---|---|
| pipeline rework + home-data | r004 | `24_home-data.jsx` | DONE, browser-verified |
| modals | r005 | `26_modals.jsx` | DONE, browser-verified |
| io-utils | r006 | `11_io-utils.jsx` | DONE, browser-verified |
| temporal | r007 | `07_temporal.jsx` | DONE, browser-verified |
| persistence | r008 | `03_persistence.jsx` | DONE, browser-verified |
| calendar-engine | r009 | `06_calendar-engine.jsx` | DONE, browser-verified |
| export-layer | r010 | `08_export-layer.jsx` | DONE, browser-verified |
| template-builder | r011 | `15_template-builder.jsx` | DONE, browser-verified |
| migrate | r012 | `10_migrate.jsx` | DONE, browser-verified |
| *(gather: form-engine display/edit)* | r013 | *(relocation only)* | DONE, browser-verified; anchor rotated to `reference-r013-body.jsx` |
| form-engine/display | r014 | `13_form-engine-display.jsx` | DONE, browser-verified |
| form-engine/edit | r015 | `14_form-engine-edit.jsx` | DONE, browser-verified |
| *(gather: builtin-templates)* | r016 | *(relocation only)* | DONE, browser-verified; anchor rotated to `reference-r016-body.jsx` |
| builtin-templates | r017 | `01_builtin-templates.jsx` | DONE, browser-verified |
| *(gather: field-system)* | r018 | *(relocation only)* | DONE, browser-verified; anchor rotated to `reference-r018-body.jsx` |
| field-system | r019 | `05_field-system.jsx` | DONE, browser-verified |
| *(gather: ephemeris three-zone unify)* | r020 | *(relocation only)* | DONE, browser-verified; anchor rotated to `reference-r020-body.jsx` |
| *(gather: ephemeris sub-modules)* | r021 | *(relocation only)* | DONE, browser-verified; anchor rotated to `reference-r021-body.jsx` |
| *(gather: glossopoeia sub-modules)* | r022 | *(relocation only)* | DONE, browser-verified; anchor rotated to `reference-r022-body.jsx` |
| glossopoeia (directory, 5 parts) | r023 | `21_glossopoeia/` | DONE; assembler made directory-aware and gate-verdict bug fixed in the same bump |
| ephemeris (directory, 7 parts) | r024 | `22_ephemeris/` | DONE |
| *(gather: header-integrity sweep)* | r025 | *(relocation only, 11 headers)* | DONE, browser-verified; `header pairs` + `header placement` + `gather` mode landed in the same bump; anchor rotated to `reference-r025-body.jsx` |
| *(edit: one sheared header replaced by two)* | r026 | *(comment edit, +2 lines)* | DONE, browser-verified; gated on a written delta table; anchor rotated to `reference-r026-body.jsx` |
| stemma | r027 | `19_stemma.jsx` | DONE; pure split, byte-identical to the r026 artifact |
| linea | r028 | `18_linea.jsx` | DONE; pure split, byte-identical to the r026 artifact |
| chronometric | r029 | `17_chronometric.jsx` | DONE; pure split, byte-identical to the r026 artifact |
| kalendarium | r030 | `23_kalendarium.jsx` | DONE; whole-arc rename, byte-identical to the r026 artifact |
| *(pillar 3 cut 1: map drawing data model)* | r031 | *(content edit, +176 lines, 13 declarations; `16_trunk`, `10_migrate`, `12_trunk`, `09_trunk`)* | DONE, browser-verified; gated by `edit` mode; anchor rotated to `reference-r031-body.jsx` |
| *(pillar 3 cut 2: the SVG canvas)* | r032 | *(content edit, +280 lines, 12 declarations; `16_trunk`, `08_export-layer`)* | DONE, browser-verified; gated by `edit` mode; anchor rotated to `reference-r032-body.jsx` |
| *(pillar 3 cut 3: the drawing tools)* | r033 | *(content edit, +469 lines, 6 declarations; `16_trunk`, `shell.html` +36)* | DONE, browser-verified after three review rounds; gated by `edit` mode with the shell declared; anchor rotated to `reference-r033-body.jsx` |
| *(pillar 3 cut 4: text, undo/redo, layers)* | r034 | *(content edit, +254 lines, 2 declarations; `16_trunk`, `shell.html` +19)* | DONE, browser-verified; gated by `edit` mode with the shell declared; anchor rotated to `reference-r034-body.jsx` |
| *(pillar 3 cut 5: stamps, frame handles, labels on an arc)* | r035 | *(content edit, +322 lines, 6 declarations; `16_trunk`, `shell.html` +13 net)* | DONE, browser-verified after four stagings (the last three on the canvas chrome); gated by `edit` mode with the shell declared; anchor rotated to `reference-r035-body.jsx` |
| *(pillar 3 cut 6: stamp packs)* | r036 | *(content edit, +464 lines, 10 declarations; `16_trunk`, `12_trunk`, `08_export-layer`, `24_home-data`, `25_trunk`, `shell.html` +23)* | DONE, browser-verified after three stagings; gated by `edit` mode with the shell declared; anchor rotated to `reference-r036-body.jsx` |
| *(pillar 3 cut 7: per-map SVG and PNG download)* | r037 | *(content edit, +158 lines, 3 declarations; `16_trunk`, `shell.html` +2)* | DONE, browser-verified in one staging; gated by `edit` mode with the shell declared; anchor rotated to `reference-r037-body.jsx` |
| *(pillar 3 cut 8: help text and the site page)* | r038 | *(content edit, +30 lines, no declarations; `24_home-data`, `16_trunk` one line; `site/` outside the tree)* | DONE, browser-verified in one staging; gated by `edit` mode, shell untouched; anchor rotated to `reference-r038-body.jsx` (ACTIVE) |

**On r023/r024 verification.** Both are pure splits: byte-identity against the r022 anchor is exact and the assembled HTML is byte-identical (sha256 `0379036386496acb`) to the r022 build Drak browser-passed. There is nothing new for a browser to see, and the gate proves the directory enumeration ordered correctly, which is the only thing that could have gone wrong. Same relationship as r003 through r012, ten r-numbers with one output artifact. Do NOT read this as a relaxation of the browser-pass rule: it applies because the product bytes provably did not change, and it does not apply to any gather.

**On r027-r030 verification.** The same relationship a third time: four pure splits against the r026 anchor, byte-identity exact on each, and the `working` rebuild after each one hashing to sha256 `2facf10cea574525`, the r026 artifact Drak browser-passed. Five r-numbers, one artifact. The three `16_trunk` carves ran back to front (stemma, then linea, then chronometric) so that each remaining published span stayed numerically valid as the runs after it left the arc; nothing was re-derived between cuts and every seam was read before slicing.

**On r031 verification.** The first cut gated by `edit` rather than `verify` or `gather`: four declared files, thirteen declared additions, every other file held byte-identical to its r026 anchor segment through the layout, raw 39,337 → 39,513, canonical 37,303 → 37,469, one header pair added, shell unchanged. PARSE OK, a Node harness over the normalizers, a before/after fixture probe in headless Chromium against the r030 and r031 builds (identical rendering, the r031 export carrying the new keys), then Drak's browser pass, then `freeze r031` and the `working` rebuild hashing to sha256 `3604074d447fcc41`, the file he passed. The pattern every later pillar-3 cut follows.

**On r032 verification.** The same shape: two declared files, twelve declared additions, 36 files held to the r031 anchor through the layout, raw 39,513 → 39,793, canonical 37,469 → 37,735, one header pair added, shell unchanged. PARSE OK, then a headless probe of forty-two assertions over a three-map fixture (pin geometry against the svg rect in-app and in the export, the exported svg equal to the in-app DOM, hidden layer absent, the r031 time-mode run identical), then Drak's pass, then `freeze r032` and the `working` rebuild hashing to sha256 `cce2d99770ed6ee4`.

**On r033 verification.** One declared module plus the shell, six declared additions, 37 files held to the r032 anchor, raw 39,793 → 40,262, canonical 37,735 → 38,184, one header pair added, shell CHANGED and declared (the first cut to touch it since the gate learned to see it). PARSE OK, then a headless probe driving real mouse and key events (52 assertions at delivery: every gesture's resulting shape at the coordinates the data model expects, hit areas, handles, the picker's warning), then Drak's pass after three review rounds, each a script revision replayed from the r032 files, then `freeze r033` and the `working` rebuild hashing to sha256 `a3e8d460d3bab754`.

**On r034 verification.** The same shape again: one declared module plus the shell, two declared additions, 37 files held to the r033 anchor, raw 40,262 → 40,516, canonical 38,184 → 38,435, no header change, shell CHANGED and declared. PARSE OK, a headless probe of 46 assertions (text, the undo history step by step in both directions, pins in it, every layer operation, the hidden layer absent from view and export), Drak's pass, then `freeze r034` and the `working` rebuild hashing to sha256 `4e01cbf041ffed41`.

**On r035 verification.** The same shape: one declared module plus the shell, six declared additions, 37 files held to the r034 anchor, raw 40,516 → 40,838, canonical 38,435 → 38,749, no header change, shell CHANGED and declared. PARSE OK, a headless probe of 62 assertions (stamps placed, swapped, scaled, turned, and moved; a rect's free scale and clamp; the arc both ways with the pivot following; the export's symbols, uses, and arc paths; the grip past 100%, the grip click, the edge pin, Custom size, the tall canvas without inner scrolling, the sticky strip, the zoomed window), the r032 fixture exported identically but for its stamp, Drak's pass after four stagings, then `freeze r035` and the `working` rebuild hashing to sha256 `9c0bbfe453e80668`.

**On r036 verification.** Five declared modules plus the shell, ten declared additions, 33 files held to the r035 anchor, raw 40,838 → 41,302, canonical 38,749 → 39,192, no header change, shell CHANGED and declared. PARSE OK, a headless probe of 36 assertions (the panel and its exports, a dirty pack's report and what lands, a clean pack, a re-import, the grid, imported stamps in the editor, the view, and the HTML export, a deleted pack's placeholder and its re-pointing, the save file round trip with a hand-edited script sanitized on load, the world importer's redirect, the help, and a maps-only world's Project view), the r032 fixture exported identically, Drak's pass after three stagings, then `freeze r036` and the `working` rebuild hashing to sha256 `1543145c4ce2e5b9`.

**On r037 verification.** One declared module plus the shell, three declared additions, 37 files held to the r036 anchor, raw 41,302 → 41,460, canonical 39,192 → 39,347, no header change, shell CHANGED and declared. PARSE OK, a headless probe of 14 assertions (the row, the svg's shape and embedded font, the png at 2x and under the cap, an image map, no row in the editor, a folderless image map), the r032 fixture exported identically, Drak's pass in one staging, then `freeze r037` and the `working` rebuild hashing to sha256 `4b3b7eee4cc16920`.

**On r038 verification.** Two declared modules, no declared additions, 36 files held to the r037 anchor, raw 41,460 → 41,490, canonical 39,347 → 39,370, no header change, shell untouched and not declared. PARSE OK, a headless probe of 19 assertions (the rendered help sections, the index's lead sentence, the site's three panels routed in headless Chromium), a mechanical cross-check of every control name against the component in both directions, Drak's pass in one staging, then `freeze r038` and the `working` rebuild hashing to sha256 `02757469587b7ba5`.

Note: the `NN` prefixes of previously-carved modules shift as new modules are inserted upstream. The filenames above are as of r038; every prefix from `17` onward changed in session 18, and session 19 moved none. Find a module by NAME, never by its prefix or a remembered path.

**Current tree (r038), assembly order, with line counts:**

`00_trunk` (134) / `01_builtin-templates` (942) / `02_trunk` (43) / `03_persistence` (592) / `04_trunk` (25) / `05_field-system` (774) / `06_calendar-engine` (1291) / `07_temporal` (249) / `08_export-layer` (1560) / `09_trunk` (221) / `10_migrate` (5850) / `11_io-utils` (42) / `12_trunk` (4945) / `13_form-engine-display` (658) / `14_form-engine-edit` (1777) / `15_template-builder` (1111) / `16_trunk` (4058) / `17_chronometric` (1528) / `18_linea` (646) / `19_stemma` (1410) / `20_trunk` (354) / **`21_glossopoeia/`** `00_schemas` (476) + `01_substrate` (1025) + `02_grammar` (380) + `03_components` (393) + `04_view` (845) / **`22_ephemeris/`** `00_body-kinds` (187) + `01_shell` (722) + `02_asbo` (1459) + `03_observe` (1937) + `04_forcealign` (585) + `05_compute` (1177) + `06_orbital-math` (1266) / `23_kalendarium` (876) / `24_home-data` (1413) / `25_trunk` (248) / `26_modals` (286) / `27_trunk` (5). Session 18 added two lines at r026 (`13_form-engine-display` 656 → 658) and four arcs at r027-r029 (`16_trunk` 5,989 → 2,051, with stemma, linea, chronometric, and the registry tail becoming arcs of their own); r030 renamed an arc in place. Session 19's r031 added 176 lines in three files (`16_trunk` 2,051 → 2,211, `10_migrate` 5,839 → 5,850, `09_trunk` 216 → 221) and rewrote two lines of `12_trunk` in place; r032 added 280 in two (`16_trunk` 2,211 → 2,452, `08_export-layer` 1,520 → 1,559); r033 added 469 to `16_trunk` (2,452 → 2,921) and 36 lines to `shell.html`, which the tree count does not include; r034 added 254 to `16_trunk` (2,921 → 3,175) and 19 lines to `shell.html`; r035 added 322 to `16_trunk` (3,175 → 3,497) and 13 lines net to `shell.html`; r036 added 403 to `16_trunk` (3,497 → 3,900), 53 to `24_home-data`, 7 to `12_trunk`, 1 to `08_export-layer`, rewrote one line of `25_trunk`, and added 23 lines to `shell.html`; r037 added 158 to `16_trunk` (3,900 → 4,058) and 2 lines to `shell.html`; r038 added 30 to `24_home-data` (1,383 → 1,413) and rewrote one line of `16_trunk` in place.

**38 files, 41,490 lines.** Nineteen named modules (seventeen flat + two directories), **nine** trunk arcs (`00`, `02`, `04`, `09`, `12`, `16`, `20`, `25`, `27`), of which `16` still holds the two uncarved views and is therefore not residue. The `NN` prefix is assembly order and is decoupled from the r-number (carve order): `01_builtin-templates` was carved at r017, `17_chronometric` at r029.

**What is left in the trunk arcs.** `16_trunk` (4,058) holds `SettingsView`, concordance, and cartographia, in that order, three contiguous runs tiling the arc (table under Remaining-carve readiness, below). `20_trunk` (354) is the node-source registry, spine-owned, split off when r027 took stemma from the middle of the old `16_trunk`. The other seven are ordinary residue.

**Line-count convention.** Every per-arc and per-module line count in this document is a Python `splitlines()` count, consistent with the 41,490 total. As of r038, 30 of the 38 files have no trailing newline, so `wc -l` under-reports the total by exactly 30. That figure changed twice in session 16 (13 → 19 → 26), held at r025 and r026 because neither added a file, rose by two at r027 (stemma and the registry tail were both new files) and by one each at r028 and r029 (the new files carry none, matching `16_trunk` and every file the r023/r024 carves wrote); r030 renamed a file and changed nothing; r031 through r038 edited files in place and changed nothing. It will change again on every carve, so re-derive it from the tree rather than quoting a remembered number. Where a prose figure and the tree list disagree for the same file, the tree list is correct.

**Anchor history.** Pure carves reassemble to the ACTIVE anchor byte-for-byte; gathers move lines on purpose, are gated by multiset instead, and rotate the anchor once browser-verified. The full chain: r003 anchored r004 through r012, nine r-numbers, across which r003 through r012 shared one output artifact. r013 rotated to `reference-r013-body.jsx` (anchored r014-r015). r016 rotated to `reference-r016-body.jsx` (anchored r017). r018 rotated to `reference-r018-body.jsx` (anchored r019). r020 rotated to `reference-r020-body.jsx`. r021 rotated to `reference-r021-body.jsx`. r022 rotated to `reference-r022-body.jsx` (anchored r023-r024). r025 rotated to `reference-r025-body.jsx` (2,007,848 bytes, the same size as r022, because relocating comment lines moves bytes without adding or removing any; no pure split was ever gated against it). r026 rotated to `reference-r026-body.jsx` (anchored r027 through r030); it was 2,008,051 bytes, 203 more than r025: one 82-character header with its blank (184 bytes) and one 81-character header rewritten at 82 (19 bytes), the dash character being three bytes in UTF-8. r031 rotated to `reference-r031-body.jsx` (anchored nothing; r032 rotated again), 2,016,635 bytes, 8,584 more than r026 (the 176 lines cut 1 added, net of two rewritten in place), sha256 beginning `d068ba88cf127c05`. r032 rotated to `reference-r032-body.jsx` (anchored nothing; r033 rotated again), 2,030,001 bytes, 13,366 more than r031 (cut 2's 280 added lines net of its in-place rewrites), sha256 beginning `04ac5cac0aed8584`. r033 rotated to `reference-r033-body.jsx` (anchored nothing; r034 rotated again), 2,054,476 bytes, 24,475 more than r032 (cut 3's 469 lines net of its rewrites), sha256 beginning `9cf9d200d6f24e6d`. r034 rotated to `reference-r034-body.jsx` (anchored nothing; r035 rotated again), 2,069,935 bytes, 15,459 more than r033 (cut 4's 254 lines net of its rewrites), sha256 beginning `ada63157aaa51db4`. r035 rotated to `reference-r035-body.jsx` (anchored nothing; r036 rotated again), 2,091,388 bytes, 21,453 more than r034 (cut 5's 322 lines net of its rewrites), sha256 beginning `e04b86ea989e1c92`. r036 rotated to `reference-r036-body.jsx` (anchored nothing; r037 rotated again), 2,119,487 bytes, 28,099 more than r035 (cut 6's 464 lines net of its rewrites), sha256 beginning `41c6bee96d39f9ad`. r037 rotated to `reference-r037-body.jsx` (anchored nothing; r038 rotated again), 2,127,336 bytes, 7,849 more than r036 (cut 7's 158 lines net of its rewrites), sha256 beginning `77877273ba3c9fe6`. r038 rotated to `reference-r038-body.jsx`, **the active anchor**, 2,133,394 bytes, 6,058 more than r037 (cut 8's help text net of its rewrites), sha256 beginning `6f772636a317ffbd`. Retired anchors (r003, r013, r016, r018, r020, r021, r022, r025, r026, r031, r032, r033, r034, r035, r036, r037) are deleted at rotation; r026 onward are in git history, the earlier ones predate the repository and are gone. A freeze always waits for the browser pass: never anchor an unverified body, or the gate loses its ability to tell you the body is wrong.

**Rotation procedure, mechanised at session 19.** After the browser pass on any byte-changing cut: `python3 inlining/build_inline.py freeze r###` freezes the assembled body as the new anchor with its layout, confirms frozen-equals-assembled, and deletes the retired pair (there is no `REFERENCE_BODY` to repoint; the anchor is found by glob); then re-run `verify` (expect green with byte-identity exact), then rebuild `working` and confirm the rebuild is byte-identical to the artifact that was actually browser-passed. That last step is what catches a rotation that accidentally froze the wrong body, and it is also the recovery check after an environment loss: session 18's sandbox was wiped between turns, r026 was replayed from the r025 bundle with its own script, and the replay was known to be right when its rebuild hashed to the artifact that had passed.

### Build-order progress (against section 9)

1. modularization infra (pipeline rework + this manifest + gate tooling) : **DONE.**
2. carve map-independent shared modules + `migrate` companion + `home-data` : **DONE** (r004-r019; all 13 modules, including the three that needed gathers first).
3. carve map-independent views : **DONE** (r023-r030; `glossopoeia/` r023, `ephemeris/` r024, header integrity r025-r026, `stemma` r027, `linea` r028, `chronometric` r029, `kalendarium` r030).
4. (pillar 3 drawing editor) : **the locked sheet's eight cuts are DONE** (the drawing data model, the SVG canvas, the drawing tools, text with undo/redo and layers, stamps with frame handles and labels on an arc, stamp packs, the per-map download, the help and the site) at r031-r038; **EXTENDED by decision on 2026-10-22** with raster brushes (no pressure; tip-level `.abr`/PNG import; a raster layer kind; a paint engine), amendment pending; the verification mode is `edit`, built at session 19; the build sheet is `docs/cartographia-plus-spec.md`.
5. carve `concordance` + `cartographia` last : pending, held until pillar 3 lands.

Not built: the first-step context-completeness gate (its design is in the frozen plan, not this manifest's §6; lower-priority until editing goes module-scoped). Deferred: `App` hooks-extraction (section 6).

### Remaining-carve readiness

The manifest's L-ranges are r001-relative and do NOT tell you current contiguity, because one module's gather can vacate a gap and make an unrelated module contiguous. Confirm contiguity BY NAME in the current tree before carving.

**Contiguity for the whole map-independent phase was checked in one pass at session 16 open**, by classifying every top-level declaration in `16_trunk` into its owning module and looking for runs. Result: five of six views were already contiguous and `ephemeris` was in three zones. That single check retired an open question that had been carried as "unchecked for all of them" since session 15, and it is the pattern to reuse: classify all declarations at once rather than checking modules one at a time.

**The map-independent phase is carved (r023-r030).** The four flat views went as pure splits at session 18 against the spans section 11 published after r025, every seam read before slicing and every one matching the published span line for line. Order mattered: the three in `16_trunk` were cut back to front so each remaining span stayed numerically valid as the runs after it left the arc.

**What `16_trunk` holds at r038.** Fifty-nine declarations in three contiguous runs tiling the arc (r038 rewrote one line in place and moved nothing); each span leads with its boundary blank and ends on code, per rule 1. These are the starting point for the two carves held until after pillar 3, not a carve order; the editor lands in cartographia and will change its figures, and may change the seam.

| Run | Members | Span | Lines |
|---|---|---|---|
| *(spine residue)* | `SettingsView` | 1-265 | 265 |
| `concordance` | `VAGUE_EDGE_LABELS`, `GraphView` | 266-1293 | 1,028 |
| `cartographia` | the thirteen r031 drawing-model declarations (`MAP_PALETTE` through `ensureMapStamps`) with r036's eight pack helpers (`MAP_STAMP_ALLOWLIST` through `mapStampGroups`) after them, the ten r032 renderer declarations (`mapNum` through `useImageNaturalSize`) with r035's five stamp and arc helpers (`MAP_BUILTIN_STAMPS` through `mapTextArcPath`) among them, the six r033 tool declarations (`MAP_TOOLS` through `MapEditorOverlay`) with r034's `useMapHistory` and `MapLayerPanel`, r035's `mapShapeFrame`, and r036's `MapStampPicker` among them, then `useMapImageUrl`, r037's `mapFontFaceCss`, `buildMapDownloadSvg`, and `rasterizeMapSvg`, `useResizeHandler`, `MapPin`, `MapView`, `MapEditor`, r036's `MapStampsPanel`, `CartographiaIndexView` | 1294-4058 | 2,765 |

`265 + 1028 + 2765 = 4058`. The earlier approximations ("~1,018" and "~780") are superseded by these counts, the 758 published at r030 by r031's 918, that by r032's 1,159, and that by r033's 1,628, that by r034's 1,882, that by r035's 2,204, that by r036's 2,607, and that by r037's 2,765. Cartographia carries five section headers, `Map drawing model (v1.6 pillar 3)` at 1295, `Map drawing renderer (v1.6 pillar 3)` at 1638, `Map drawing tools (v1.6 pillar 3)` at 1976, `Map view` at 2903, and `Cartographia` at 3790, and all five travel with it; r034 through r037 added no header: r034's two declarations sit inside the tools section, r035's five inside the renderer section and one inside the tools section, r036's eight inside the model section, one inside the tools section, and one inside the Cartographia section, r037's three inside the map view section.

**Held for last (after pillar 3).**
- `concordance` (`GraphView`, `VAGUE_EDGE_LABELS`, 1,028 lines). Carve last with cartographia: pillar 3's pin-edge rewire lands on this seam.
- `cartographia` (drawing model + renderer + tools + canvas + index, 2,765 lines; gathered r002, grown at r031 through r037, one line rewritten at r038). Contiguity held through every cut since. Carves LAST regardless. Since r032 `08_export-layer` calls into this run at export time (`renderMapHtml` → `buildMapDrawingTree`), a one-way runtime edge that stays with cartographia when it carves.

**Residue-arc candidate (optional, not scheduled).** The r017 carve left `02_trunk` as a 43-line arc holding only the util wedge (`genId`, `fmtDate`, `isoNow`, `slugify`, `formatSnapshotTimestamp`, `formatSnapshotSize`). It is correct as anonymous residue, but it is a clean pure split if a named `utils` module is ever wanted. Drak's call; no need.

**Record of struck contiguity flags (kept as evidence for the re-check-by-name rule).**
- template-builder, flagged "four interleaved builder components must relocate first": FALSE at r010; carved clean as a pure split at r011.
- migrate, flagged "tail check (ranges separated)": FALSE at r012; one contiguous run, carved as a 2-way arc-boundary split.
- form-engine/display, flagged "likely contiguous": WRONG; two members were stranded deep in the edit block. Needed the r013 gather.
- field-system, flagged "two base zones, merge them": UNDERSTATED. Zone A was ALSO internally split, by a wedge of three spine constants. The r018 gather was two relocations, not one.
- ephemeris, flagged only with three advisory L-ranges: UNDERSTATED at the sub-module level. The zone needed one gather to become contiguous (r020) and a SECOND gather to make its proposed sub-modules contiguous (r021). A view being contiguous says nothing about whether its intended sub-modules are.
- chronometric, linea, stemma, kalendarium, flagged "confirmed contiguous, pure splits, no gather owed" at session 16: CORRECT, and the only flags in this list that were. The difference was that the session-16 check classified every declaration in the arc at once instead of inspecting one module's neighbourhood.

**Already carved (19 modules):** `home-data` (r004), `modals` (r005), `io-utils` (r006), `temporal` (r007), `persistence` (r008), `calendar-engine` (r009), `export-layer` (r010), `template-builder` (r011), `migrate` (r012), `form-engine/display` (r014), `form-engine/edit` (r015), `builtin-templates` (r017), `field-system` (r019), `glossopoeia/` (r023, 5 parts), `ephemeris/` (r024, 7 parts), `stemma` (r027), `linea` (r028), `chronometric` (r029), `kalendarium` (r030).

---

## 11. Header integrity (opened session 16 post-turnover audit; CLOSED at r025; r026 landed at session 18)

**Status: closed.** r025 relocated **eleven sheared section headers** to the blocks they name, and added the two checks that stop the next one accumulating. r026 replaced the twelfth, held back by decision, with two correct headers at session 18; **zero sheared headers remain**, and the tree holds **77 column-0 section headers** at r034. This section is kept because the mechanism that produced the twelve is still live and every future relocation has to handle it consciously.

### The header rule (one rule, stated once, implemented in code)

A SECTION HEADER is a **column-0** `//` comment whose text is set off by a LEADING run of two or more dash characters (`─` U+2500 or ASCII `-`), **or** by a trailing-only run of eight or more. Both floors are earned. Two rather than three, because a three-dash minimum drops `16_trunk`'s `// ── Node-source registry ──`, a real column-0 header one line past the stemma boundary blank, which is exactly a seam a carve reads for evidence. Eight rather than fewer, because below that nine prose lines in `21_glossopoeia/` that terminate blocks with ` ---` get swept in.

Under that rule the tree held 73 at r025, plus 35 indented dash-set comments that the rule also matches; r026 added one, and r031, r032, and r033 added one each (`Map drawing model`, `Map drawing renderer`, `Map drawing tools`, all `(v1.6 pillar 3)`), each heading its own block, so there are **77 column-0 section headers** at r038 (r034 through r038 added none). **The invariant covers column 0 only.** Pairing an indented header with the next TOP-LEVEL declaration says nothing, by construction: an indented header sits inside a function body, so its "next declaration" is whatever follows the enclosing function, often hundreds of lines downstream. That pair is wrong from the start and churns whenever the enclosing function moves. Including them buys nothing on a pure split, where byte-identity already sees any header that moved, and costs 35 permanently-wrong rows in the one list the check exists to keep readable.

The rule now lives in `canonicalize.py`, not here. If this section and the code disagree, the code is right.

### The two checks

**`header_pairs(text)`** returns the ordered list of (header title, next top-level declaration OR column-0 call block). It is the only thing that can see a SHEARED header: a header left behind when its block moved. A shear passes canonical sequence (the line is still there), passes multiset (same line, different position), and passes byte-identity on a gather (bytes are supposed to move). Twelve accumulated before anything was watching. Scanning does not stop at an intervening header, so two stacked headers pair with the same target and a repeated target is how a bare orphan shows up. The title is dash-stripped, so a change in fill width is not a diff.

Call blocks are RECOGNISED, not allowlisted. `10_migrate` "Marked configuration" correctly heads a live `marked.use({...})` at `10_migrate:5816`; a declaration-only pair function reports it as a shear forever, in a module the header does not belong to. An allowlist would go stale the moment the block moves. This one was the thirteenth item on the original census and was struck: it only looked sheared because the census tool paired headers with declarations and a call expression is not one. **A sweep's tool defines what it can see, and everything outside that definition reads as a defect.** The remedy offered at the time included deleting a header that heads nothing, which would have destroyed a correct one.

**`header_placement()`** reads each file on its own and fails any section header with no declaration after it IN THAT FILE. It exists because `header_pairs()` runs on the ASSEMBLED body, where file boundaries do not exist, so a header at the tail of one module labelling the head of the next pairs CORRECTLY and the invariant is structurally blind to it. The kalendarium arc's tail was exactly that shape before r025 (line 878 of the arc then numbered 19). This is not theory: the misfile probe in `prove_gate_teeth.py` moves a header to the previous file's tail, the assembled body comes out BYTE-IDENTICAL because the file join reproduces the same line sequence either way, and five checks see nothing while placement is the only one that fires.

Both are scored in `verify` and `gather`. Placement was a REPORT through the sweep itself and flipped to a gate condition once it read zero, because gating on zero while two known defects were queued would have failed on purpose every run and taught the operator to skim past it. A standing non-zero is how a check stops being read.

### What r025 moved

Eleven relocations, 50 lines, comment-only, one r-bump. Each is line-neutral by construction: block plus one adjacent blank leaves the source, block plus one blank arrives at the destination. At a file tail the PRECEDING blank travels so the vacated file ends on code; everywhere else the FOLLOWING blank travels so the preceding blank stays as the separator.

| Header | Was (r024 numbering, module:line) | Now (r038 path:line) |
|---|---|---|
| Relation value helpers (7-line block) | persistence:143 | `05_field-system:167`, above `getRelationValues` |
| Reset Template confirmation modal | trunk arc 04:2 | `26_modals:98` |
| v1.3 select / cascade / required helpers | field-system:409 | `05_field-system:552`, above `formatSelectDisplay`'s doc comment |
| App | field-system:546 | `12_trunk:2` |
| Initial state | export-layer:1441 | `09_trunk:174`, above `makeInitialState` |
| Destructive Op confirmation modal | trunk arc 09:2 | `26_modals:2` |
| Timeline view | trunk arc 16:1932 | `17_chronometric:2`, above `TimelineView` (it was `16_trunk:2053` until the r029 carve took it along) |
| Ephemeris view (v1.5) (25-line block) | trunk arc 16:2055 | `22_ephemeris/01_shell:10` |
| Home view (app instructions) | trunk arc 19:878 | `24_home-data:2` |
| HTML export modal (10-line block) | trunk arc 21:250 | `08_export-layer:1480`, above `HtmlExportModal` (1441 until r032 added the map image sizes above it) |
| Version History panel | modals:96 | `03_persistence:367`, above `VersionHistoryPanel` |

The "Now" column is kept current with the tree (every path in it is a `facts.json` assertion); the "Was" column is history and deliberately carries no `NN` prefixes, because those prefixes reflow and a pre-r025 path would read as stale.

Two corrections to what this section previously estimated, both found by reading the seams rather than trusting the census. **The twelve blocks total 51 lines, not "roughly 60 to 80", and THREE carry doc comments, not two.** The missed one is `03_persistence:143`, logged as a bare header but actually a 7-line block: the header plus six lines documenting entry-ref relationKind value shapes. What sat below it was `const FSAA_SUPPORTED`, unrelated, so the whole block was stranded and the whole block travelled, per rule 4.

**Headers moved verbatim, never re-padded.** Widths run 75 to 82 and four landed next to neighbours of a different width. Adjusting one to match its new surroundings changes the string, which fails multiset, which is the only substantive check a gather has.

Gate result at r025 [stale: r025 gather report; the body was 39,335 lines then]: multiset PASS, decl-set PASS at 419, raw line count PASS at 39,335, header placement 0 misfiled, ten retargeted pairs. The eleventh does not appear in the pair diff at all, because the kalendarium arc's tail header paired with `HOME_SECTIONS` correctly both before and after; placement is what verified it.

### r026: the one held back (landed at session 18)

`14_form-engine-edit:1223` read `// ─── Markdown display + rich text editor ───` (81 wide) and named two blocks that had lived in different modules since the r013 gather: `LongformEditor` in `14_form-engine-edit` and `LongformDisplay` in `13_form-engine-display`. It got its own r-bump because one removal against two additions fails multiset by construction, and multiset is the only substantive check a gather has; folding it into r025 would have meant adjudicating a RED with the sweep's own diff on top of it.

**What landed (r026, 2026-10-19).** The strings were locked as proposed and written at 82 characters, the local convention at both sites (the earlier figure of 81 was the width of the header being retired). `14_form-engine-edit:1223` was rewritten in place to `Longform + rich text editor`, net zero lines; `Longform + markdown display` was inserted with its following blank above `LongformDisplay` in `13_form-engine-display`, which now sits at line 264 with the declaration at 266. Both edits were string-anchored, so neither file's trailing-newline state changed. The cut script is `r026_longform_headers.py` in the bundle.

**The written delta held line for line.** Predicted before the cut and read off the `gather` report after it: raw line count 39,335 → 39,337; multiset RED, missing one and extra two; canonical 37,303 against 37,302; byte-identity differs; the declaration set held at 419; header placement PASS at 0; header pairs 74 with exactly three changes, `Markdown display + rich text editor -> LongformEditor` removed, `Longform + rich text editor -> LongformEditor` and `Longform + markdown display -> LongformDisplay` added. Parse OK. Browser-passed by Drak on the Longform Note field type in both directions. Then the anchor rotated to `reference-r026-body.jsx`, by the gather procedure, with the post-rotation rebuild hashing to the artifact passed; the r025 edition of this section specced every signal and omitted the rotation, which was its one real gap.

**That was the weakest gate anything has run under since r004**, a written table plus parse plus a browser pass, and it worked for an edit of three lines. Pillar 3 is entirely content edits and will not fit that shape; whether a third mode earns its keep is the first pillar-3 decision (roadmap, session-18 block).

### Carve spans, re-derived after r025 (carved against at session 18)

The sweep relocated lines, so every span published before it went stale the moment it landed; these were re-derived from the r025 tree and r027-r030 carved exactly them, every seam read before slicing. Kept as the record. `16_trunk` was 5,989 lines when these were measured, 2,051 after the carves, and 4,058 now that r031 through r037 have added to it (r038 added nothing there); the kalendarium arc, numbered 19 then, is `23_kalendarium` now.

| Module | Was | Became |
|---|---|---|
| *(trunk head)* | `16_trunk` 1-2051, 2,051 lines | `16_trunk` (4058) at r038; the carves left its 2,051 lines unchanged in content, r031 added 160, r032 241, r033 469, r034 254, r035 322, r036 403, r037 158, r038 rewrote one line |
| `chronometric` | `16_trunk` 2052-3579, 1,528 lines | `17_chronometric` (1528) at r029 |
| `linea` | `16_trunk` 3580-4225, 646 lines | `18_linea` (646) at r028 |
| `stemma` | `16_trunk` 4226-5635, 1,410 lines | `19_stemma` (1410) at r027 |
| *(trunk tail)* | `16_trunk` 5636-5989, 354 lines | `20_trunk` (354) at r027 |
| `kalendarium` | the whole 876-line arc | `23_kalendarium` (876) at r030 |

`2051 + 1528 + 646 + 1410 + 354 = 5989`. Chronometric carried its own `// ─── Timeline view ───` header out, which r025 had given it. The carves ran back to front within `16_trunk` (stemma, linea, chronometric) so that each remaining span stayed valid as the runs after it left; the mid-tree cuts reflowed every prefix from `17` onward, which is the stated cost of the procedure.

### What this cost, and the lesson that generalises

The twelve were found by an audit, not by a gate, four hours after a doctrine entry was written telling carves to read seam lines as evidence. At those twelve seams the evidence was lying, which made them exactly the sort of plausible-looking evidence that rule was written to guard against. One of them was created by the r013 gather, run and gated and browser-passed with nobody noticing, so the damage was live rather than inherited from the monolith.

The first remedy proposed was a doctrine note plus a one-time sweep. Drak asked what actually fixes it rather than leaving a note, which was the right question: a sweep alone would have been undone incrementally by the next several gathers, exactly the way the twelve accumulated. **The sweep is the cleanup; the check is the fix, and the check goes first so the cleanup has something to prove itself against.**
