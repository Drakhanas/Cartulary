# Cartulary roadmap

Forward-looking only. What shipped, and the plans and session blocks that got it there, are in `roadmap-archive.md`, verbatim. The standing planning and scope principles are in `roadmap-principles.md`. The sections below are the standing backlog, edited in place as items move. The dated `=== ADDED ... ===` blocks after them are the session log: the newest block is the current status, and it is the only part of this file the doc gate checks (`tools/turnover/conventions.md`).

Nothing in the backlog is committed to a version. A row is a claim about the tree, so check it against the source before scheduling work on it.

---

## Backlog: features

- **Concordance sector graph.** Half shipped in v1.5: the node-source registry already puts stars, planets, and moons in Concordance and draws the `parentBodyId` hierarchy as "orbits" edges, so the star-planet-moon view exists. Still open: connections between star systems with distance stored on the edge (topological, not coordinate-accurate), distance labels on those edges, and a stars-only filter mode. Open design questions: binary stars, 2D or 3D, the single-system empty state, and whether it's a Concordance mode or its own view. The same two primitives (kind-aware filtering, per-edge metadata) would also serve trade routes and faction links. It's the only backlog item sized to headline a release. The full sketch is in `roadmap-archive.md`, in the v1.6 record's copy of the backlog.
- **D.4, recurrence on the calendar-date field.** A recurring date as part of the field's value (`recurrence: {periodDays, count?, until?}`), expanded for display by Chronometric, the Kalendarium grid, and entry rendering. Every date-walking helper would have to learn it. Days only for v1, because months and years drift under calendar edits; a cap on displayed occurrences; additive, with no migration. It's a different layer from the rejected holidays-as-entities idea below. The trigger is users saying the prose-in-notes fallback for promoted Ephemeris events is what's in their way. The full sketch is in the same place.
- **Concordance polish.** Edge-label placement and truncation, and a per-node "auto-place this" action that clears one saved position so the layout re-places that node. Neither is in the tree as of 2026-10-23; the only reset the view has is zoom.
- **Per-map JSON import and export** (Cartographia). Deferred at v1.6 "to the later, larger Cartographia work", which no plan defines yet.
- **CSV lexicon import** (Glossopoeia), deferred with a plan: a column-mapping step rather than a fixed header, add-only, a small inline parser, aimed so a Vulgarlang export lines up without hard-coding its columns. A Swadesh starter list is a separate and weaker follow-on, never built alongside it. The plan is in `roadmap-principles.md`, the 2026-06-23 (deferred) block.
- **Variant filter v2.** The r087 filter generalized: variant as an entry-level attribute, the first world-scoped config slice, filtering across the specialty views, `showWhen` reading the variant, exports aware of it. Estimated at 14 to 22 r-bumps; the open question is how each view treats edges into entries the filter hides. It wants its own release slot. The plan is in `roadmap-principles.md`, the 2026-06-09 block.
- **Game Mechanics pack.** Shelved since 2026-06-17 with the design done and no code written; `packs/game-mechanics-pack-reference.md` is the resumption point. The full SRD seed for both editions is 12 to 18 sessions, most of it extraction. Templates first and the seed later is the cheaper route, and nothing is built against either.

## Backlog: engineering

- **`App` hooks-extraction.** `App` is about three quarters of the core. Shrinking it is a refactor that keeps behavior but not bytes, so the parity gate can't verify it; it needs a verification design before it needs code.
- **First-step context-completeness gate.** Not built. It matters only if editing goes module-scoped (loading the spine and one module instead of the whole tree).
- **A named `utils` module** for the 43-line `02_trunk` residue arc. Optional.

## Backlog: documents and housekeeping

- **Entry-ref correctness audit, the semantic half.** The mechanical half was checked 2026-10-23: the 20 built-in templates carry 149 ref targets naming 19 distinct targets, and every one is a built-in template or a registered node source (ConLang, Astronomical Body), so nothing dangles. Whether each field points at the right template is a read nobody has done.
- **Needs Drak's files:** the master `journal.txt` into `docs/`, with a checker change so only its newest entry is live; the `cartulary-turnover` skill package pointed at `tools/turnover/` with its script copies dropped (its description of the handoff is also behind `conventions.md` since 2026-10-23); the v1.4 patch notes and the v1.5 zip README into `docs/release-notes/`; itch screenshots for v1.6.

## Tolerated

- **A deleted parent language leaves its children's Descended From dangling** (Glossopoeia). The graph and the derive step skip dead pointers, so nothing breaks; a scrub on delete is cheap if it ever matters.

## Decided no

- **The map editor.** From the v1 won't-have list (`docs/cartographia-plus-spec.md`, section 7) and the shipped Limitations: no custom color picker; no layer opacity, blend modes, or per-layer export; no procedural generation; no image export beyond SVG and PNG; no grid or snapping beyond the rotation knob's Shift snap; no fog of war, measurement or scale tools, dice, or initiative tracking. Pen pressure is outside any scope Drak will support for now (2026-10-22).
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

**v1.7 is not scoped.** It opens with the `VERSION` bump in `inlining/build_inline.py`, and the first product edit after that is r001. What goes in it is Drak's call. The three shapes on the table: a feature headline (the sector graph is the only backlog item sized for one), a consolidation release (hooks-extraction and the remaining housekeeping), or waiting to see what the first public issues ask for.

**What changed in this file.** The v1.5 plan, filed under "Active / Next Up" since before v1.5 shipped, and everything about v1.6 moved verbatim to `roadmap-archive.md`, where the v1.5 retrospective's "the v1.5 plan above" is now true. The backlog above was rewritten from the old backlog, the post-v1.5 carry-forward list, the handoff's post-pillar list (the handoff now points here instead of keeping a copy), and two deferred plans that lived only in `roadmap-principles.md` (CSV import, variant filter v2). Four rows were struck as already done, each checked against the tree or the record first:

- **Marriage dates on spouse declarations** shipped in v1.2 (the Married and Ended pickers); `marriedOn` and `endedOn` appear 59 times in the tree.
- **The data-shapes reference doc** already exists: the in-app JSON Save File Schema topic covers tags as an array, every field value shape, `relationKind` with the marriage dates, and the cartographia record, and cartulary.world's JSON Structure page mirrors it. The repository README now points at both.
- **Ephemeris bug-audit rows BA-01, BA-02, and BA-04** were run and passed on 2026-06-23 against Drak's Dul Pantra world (`changelog-v1.5.md`, "Ephemeris Bug Audit closed"). The handoff and this file carried them as unrun for four months afterward.
- **The patch-notes format** was decided on 2026-10-22: one file per version in `docs/release-notes/`.
