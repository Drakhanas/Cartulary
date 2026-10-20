# Cartulary, Modularization & v1.6 Architecture Plan

> **FROZEN ARCHITECTURE PLAN.** Authoritative resumption point for the v1.6 release shape and the code-modularization effort. This outlives any single feature spec; it is the map for the whole release so the carve and the sequencing do not get re-argued from changelog fragments. Locked 2026-06-28 (session 9, planning). Find code by NAME, never line number.

---

## 0. The decision that reshaped v1.6

v1.6 was originally "the Cartographia+ map creator, standalone." This session it became a **three-pillar release**, and the pillars are sequenced deliberately. Scope is the solo dev's call; this plan records the call and the reasoning so the order holds.

The trigger for pulling modularization forward is real, not hypothetical: the roadmap's "monolith pain signal" said to slide modularization forward the moment navigation or AI-assistance time starts hurting "through v1.5/v1.6." It hurt during the back half of Glossopoeia, the largest single subsystem (21 record arrays, eleven workspaces, the syllabifier/validator/generator/rule-engine/diachronics stack across ~r095–r122), edited in a 2 MB+ file where every targeted change drags the whole monolith through context. The signal tripped on the heaviest view, which is the worst case for context cost. The r000 source is already 2.09 MB against the roadmap's "~1.5 MB" guess.

---

## 1. The three pillars and their order

**Pillar 1, Maps promotion (FIRST, before anything else).** Promote Maps from a hidden built-in template to a state slice. Done standalone in the monolith, against the shipped baseline, before modularization exists. Full spec in `maps-promotion-spec.md`. Pulled to absolute first because it is the highest-uncertainty change in the release (a live-data migration severing a slice from the entry-graph) and doing it against a stable, QA-sheet-backed baseline means any breakage has exactly one suspect. It is also a prerequisite of the Cartographia and Concordance carves and of building the editor once. It is a single contained, fully-mapped multi-site edit, worth paying monolith context for once. **Invisible if successful.**

**Pillar 2, Modularization.** Split the monolith into per-view + shared-subsystem modules that `build_inline.py` assembles into the two finals. Invisible if successful ("if anyone notices anything different after the refactor, it failed"). This is the bulk of the structural work and the bulk of the QA.

**Pillar 3, Drawing editor (Cartographia+).** The actual map-creation feature: drawing primitives, strokes, text, a small palette, starter stamps, undo/redo, SVG-into-`mapData`, stamp-pack import via the `cartulary_mapstamp_pack: 1` envelope. Built into the now-sliced, now-modular Cartographia. The only user-visible pillar. v1 scope and won't-have list are in the roadmap's v1.6 section (unchanged; the editor scope did not change, only its position in the sequence).

### Why this order

- **Maps-promotion first** isolates the migration risk against a known-good codebase, and makes promoted maps part of the baseline that the refactor's parity QA then verifies against. (Do it after modularization and a regression has two parents, refactor or migration.)
- **Modularize before the editor** so the single largest, longest feature (60–100 hrs) is built against clean seams instead of inside the 2 MB monolith, which is the exact context bite that motivated modularizing.
- **Carve the map-coupled modules last.** The editor and the maps-promotion both touch Cartographia; Concordance is touched by the maps-promotion's pin-edge rewire. Carving those modules before their final shape is known forces a re-carve. So: carve everything the editor/promotion does not touch first, build the editor, then carve Concordance and Cartographia last against their final shapes.

### Resulting phase plan

- **Phase 0, Maps promotion** (pillar 1). Monolith. Per `maps-promotion-spec.md`. Browser-verified, invisible. `r001+`.
- **Phase 1, Modularization infra.** Spine manifest (§4), `build_inline.py` reworked to assemble modules into the two finals (§5), the first-step/end-step gates built (§6). No view carved yet.
- **Phase 2, Carve the map-independent modules** (§3), each parity-QA'd against the existing v1.3/v1.4/v1.5 QA sheets. Concordance and Cartographia held back.
- **Phase 3, Build the drawing editor** (pillar 3) into the now-sliced, now-modular Cartographia, while that view is still whole (un-carved).
- **Phase 4, Carve Concordance and Cartographia last**, against their final post-editor shapes. Cartographia is QA'd as one workstream (promotion + editor + carve) on a fresh test plan, kept separate from the modularization parity QA.

---

## 2. QA attribution (why the order pays off)

The reason the standalone framing matters is not marketing, it is **clean attribution of regressions**.

- Modularization wants standalone so parity verification is clean: run the existing QA sheets against the modular outputs; any failure is the refactor's fault, full stop.
- Stacking a new feature into the same release loses that, a regression could come from the refactor OR the new code.
- The order above preserves attribution at two clean levels: **"did the refactor preserve parity"** (modularization, against existing sheets, maps-promotion already in the verified baseline) vs **"does the new Cartographia view+editor work"** (fresh test plan, Cartographia QA'd as one thing on purpose because that is the single place the two workstreams fuse).

The bill being paid by making v1.6 three pillars: two of the three (promotion, modularization) are invisible to users; only the editor shows. The devlog hook is the editor. That is accepted under the maintain-for-10-years filter; modularization serves that filter directly.

---

## 3. The module carve-list (grounded in the actual components)

96 top-level components inventoried this session. The carve-list below is grounded in that inventory, not the older roadmap wishlist.

### View modules

- **Concordance**: `GraphView`. *(Touched by the maps-promotion's pin-edge rewire; carve in Phase 4.)*
- **Linea**: `FamilyView`.
- **Stemma**: the `StemmaNode … StemmaCanvasView … StemmaIndexView` cluster (plus `StemmaInspector*`, `StemmaSmartInput`, `StemmaPlusSlot`).
- **Timelines (shared module)**: `TimelineView` + `ChronometricsView` + `ChronoEditPanel`. Physically adjacent already; clean share.
- **Kalendarium**: `KalendariumIndexView` + `CalendarGridView` + `KalendariumEditorView`. (Note: the calendar *engine* is a separate shared module, §3 shared, `CalendarEditor` already sits far from the Kalendarium views.)
- **Glossopoeia**: the `Gloss*` cluster + the compute substrates (syllabifier, phonotactic validator, word generator, IPA rule engine, diachronics). ~3000+ lines including substrates.
- **Ephemeris**: `EphemerisView` through `ComputeDetailDrawer`. **~7100 lines, roughly a third of the whole file.** See §7 caveat, likely a sub-module directory, not one flat module.
- **Cartographia**: `MapPin` + `MapView` + `MapEditor` + `CartographiaIndexView` + the new `cartographiaMapSchema` (post-promotion, slice-based). *(The editor lands here; carve last in Phase 4.)*

### Shared / non-view modules

- **Form + field engine**: `EntryForm`, `EntryView`, `EntryList`, and the editor family (`FieldEditor`, `GridEditor`, `GroupEditor`, `EntryRefEditor`, `CalendarDateEditor`, `CalendarDateRangeEditor`, `NameHistoryEditor`, `RichTextEditor`, `MarkdownDisplay`, `LongformEditor/Display`, `MultiSelectEditor`, `IpaTextInput`, `WikiLinkInput`, `FieldValueDisplay`, `ImageFieldEditor`/`ImagePreview`, `AutoTextarea`, `InlineWikiLinkText`, `FieldLabelText`). The largest shared subsystem (~3000 lines) and the thing every view renders through, Glossopoeia and the promoted maps included. See §7, sub-module candidate.
- **Export layer**: `buildSingleEntryMarkdown`, `buildFamilyTreeMarkdown`, `buildHtmlExport`, `buildHtmlExportStyles`, `renderMapHtml`, `HtmlExportModal`. Self-contained.
- **Calendar engine**: `DEFAULT_CALENDAR`, `DATE_FORMAT_PRESETS`, `MOON_*`, `CalendarEditor`, the calendar-date math helpers. Shared by every `calendar-date` field anywhere; distinct from the Kalendarium views.
- **Persistence + snapshot**: `DB_*` constants, the snapshot/throttle layer, `VersionHistoryPanel`. The IndexedDB spine.
- **Modals**: `DestructiveOpModal`, `ResetTemplateModal`, `RestoreBuiltinsModal` (the Map case removed by the promotion). Cross-cutting dialogs.
- **Template builder**: `TemplateBuilder`, `SubfieldList`, `CascadeOptionsInput`, `SelectOptionsInput`, `MultiTemplateRefConfig`, `TemplatePreviewBody`. Distinct from the builtin-templates data module. See §7, the form-engine/builder/field-editor seam is the one to decide deliberately (`FieldEditor` and `SubfieldList` straddle entry-editing and the builder).

### Data module

- **Builtin templates**: `BUILTIN_TEMPLATES` + `TEMPLATE_ORIGIN`. After the maps-promotion, Map is gone from here entirely, so the earlier "carve builtins minus Map" debate is moot: the array is clean data, carved whole.

### Stays in the spine, NOT carved

Carving any of these creates circular dependencies or drags the spine into every module:

- `migrate()`, `makeInitialState()`, `makeDefaultGlossopoeiaState()`, `makeDefaultCartographiaState()`, the state shape, `SCHEMA_VERSION`.
- The node-source registry + all `SYNTH_TPL_*` constants + `getRegisteredGraphNodes`: called from inside `migrate()`, irreducibly central. (Now includes the maps registrant from the promotion.)
- `App` router, `Sidebar`, `HomeView`, `ProjectView`: the shell.
- Global constants: `FIELD_TYPES`, `SUBFIELD_TYPES`, `GRID_CELL_TYPES`, `COLORS`, `ICONS`, `HALF_WIDTH_ELIGIBLE_TYPES`, theme vars.

---

## 4. The spine manifest (first artifact of modularization)

Build this BEFORE carving a single view. It is the oracle both gates check against (§6), the analog of the front-loaded style sheet the analysis skills read every pass.

The manifest declares, per module: what it imports from the spine, what it exposes, and which components/functions it owns. It declares, for the spine: the irreducible core every module may depend on. A module is editable in isolation only because its seam (what it imports / exposes) is documented and stable enough to trust working blind to the rest. **Defining the seam is the real work of carving; moving text is trivial.**

The manifest is append-updated in the same pass as every split/combine (a split adds a module entry + its seam; a combine removes one). If the manifest is not updated in the same pass, the next session's first-step gate verifies against a lie, same discipline as `FIELD_RENAMES` landing in the same pass as a rename.

---

## 5. Build pipeline rework

`build_inline.py` currently ingests one `cartulary.html`. Modular means it assembles many source files into the two finals. **This is the infra that changes most**: budget for it as real work, not text-moving.

Critical: modularization helps the build pipeline and human navigation, but it only helps AI/context cost if the **editing workflow changes too**. If a session still loads the whole assembled tree to make one edit, context cost is unchanged. The relief comes from a **context-scoped editing protocol**: cold-start loads the spine + the one target module, not the assembled file. The modular layout has to ship with a modular editing workflow or it buys navigation only. The cold-start protocol in the handoff must be rewritten to "load spine + target module," not "copy the highest-r working file to cartulary.html and edit that."

`VERSION` in `build_inline.py` already bumped 1.5 → 1.6 (drives output filenames only; the in-app/export version literals flip at r001).

---

## 6. The two gates (split/combine safety)

A pass-scoped editing workflow introduces two failure modes the monolith never had: stale-slice edits going in, and silent reassembly drift coming out. Two gates, checking two different things. They do not collapse into "run the parse gate twice."

**First-step verify (before touching a module), a context-completeness check, not a correctness check.** Answers: *do I have everything this module's seam needs, at the current revision?*
- Loaded module + spine match the manifest's declared seam for this module (every named import present; nothing reached-for is missing).
- Revision/hash agreement: the spine and module copies in the working tree are from the same r-number. A module carved against an older spine is the corruption case the parse gate cannot catch (both halves parse fine independently).
- Seam-only reach: the module references nothing outside its declared imports. If it does, the manifest is wrong or the seam is dirty, stop before editing.

**End-step confirm (after split or combine), a reconstitution-parity check.** Answers: *does the reassembled whole equal (original ± exactly the intended diff)?*
- **Pure split (no logic change):** the reassembled build must be functionally identical to the pre-split build. Strongest cheap proof is a **normalized diff**: assemble, strip the module-boundary scaffolding, diff against the pre-split file, expect zero substantive delta. A split that changes behavior is a failed split.
- **Combine or edit-then-reassemble:** parse gate (existing, hard) → normalized diff scoped to show only the intended change and nothing else → browser smoke (still the only proof a path runs). The diff sits between parse-green and browser as the cheap catch for "the reassembly silently ate a function."

**Normalized diff needs a defined normal form**, or it drowns in whitespace/boundary noise and gets ignored by the third split (which is how the gate quietly dies). Decide the canonicalization once (strip module wrappers, normalize the assembly join points) and build it into `validate_html.js` or a sibling so the diff is a clean signal every time.

The parse gate stays exactly where it is, hard, between the two new gates. Browser smoke stays the final proof.

### Relationship to the analysis-skill pass model (and where it differs)

The pass-scoped workflow resembles the Empyrean analysis skills (decompose a too-big job into ordered passes against a fixed reference), but two properties invert:
- **The passes WRITE, and they write to shared state.** Unlike a frozen chapter, a module edit mutates a tree the next pass depends on. The first-step gate exists to refuse editing a stale/partial slice.
- **Parse-green and browser smoke are per-tree, not per-pass.** No matter how cleanly editing is partitioned, verification happens against the assembled whole. The pass architecture saves context on the way in; it saves nothing on the way out. The end-step gate exists for the way out.

So the thing being built is a context-scoped editing protocol, not a pass pipeline. It works only if the seams are clean enough to trust working blind to the rest. A pass workflow over mushy seams just makes under-informed edits faster.

---

## 7. Caveats that bite during the carve (not before)

- **Cartographia non-contiguity.** Before the promotion, `MapView`/`MapEditor` sit far from `CartographiaIndexView` with other views in between, carving Cartographia meant gathering scattered pieces. The maps-promotion (pillar 1) gathers the map code into one slice-based Cartographia view, which partly resolves this before the carve. Still the messiest seam of the set, and it takes the editor on top, so it carves last by design.
- **Ephemeris is ~7100 lines, ~⅓ of the file.** A single Ephemeris module loaded with the spine may still be too big to work comfortably, which defeats the point. It has natural internal seams (`AsBo*` body editor / `Compute*` / `Observe*` / `ForceAlign*`). Decide at carve time: one module or a small sub-module directory. Same question, smaller, for the form engine (~3000 lines).
- **The form-engine / builder / field-editor seam is the one to decide deliberately.** `FieldEditor` and `SubfieldList` straddle entry-editing and the template builder's preview. Decide the boundary before cutting, not mid-carve.

---

## 8. Standing rules that apply throughout

- Parse-gate hard after every change; parse-green is not working; browser smoke is the only proof.
- r-counter increments only on HTML changes; site work and infra (`build_inline.py`) never move it.
- All migrations land in one pass; "done" only when reload from any older world state is canonical; nothing destroyed (data-loss edges append to Notes).
- Defensive validation before any state touch.
- No em dashes; banned adjectives (robust, comprehensive, seamless, crucial, pivotal, meaningful, structural, load-bearing); contractions by default; results before process.
- Turnover is full integrated documents, history preserved verbatim within them, never append-snippets to merge by hand. (Doctrine recorded session 9.)
