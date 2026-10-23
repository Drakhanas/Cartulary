# Cartulary roadmap

**v1.3 is shipped.** Released to itch.io May 14 2026. All template work, all migration framework additions, origin protection, half-width auto-pair (universal rule + visibility-aware re-pairing), Template Preview popup, and Concordance persistence (Level 1 + Level 2) live in the public release. Six Home doc sections updated. Pre-release audit cleanup landed. Post-build hotfix for half-width pair-layout blank slots caught by Drak during staging QA; fixed, rebuilt, re-uploaded before broken zip was in the wild beyond Drak's household. Devlog posted to itch.io release-announcements board (title: "These are the templates you're looking for").

**v1.4 is shipped.** Released to itch.io 2026-05-18. Multi-calendar support (Kalendarium), HTML export, snapshot-based version history, Cartographia (Maps view promoted to top-level), the calendar grid + seasons + moons polish cluster pulled forward from post-1.7 backlog, and a visual design pass across the application. Code modularization originally slated as the fourth v1.4 piece was pushed to v1.7 once it became clear v1.4 isn't the stable surface modularization wants. Devlog: "Getting stuck in time. So it goes." Details in the Done — v1.4 release section below.

**Version theme note.** Each minor through v1.2 carried a view-level change (Stemma in 1.1, Linea overhaul in 1.2). v1.3 broke that pattern by going deep on schema + Concordance + builder UX. v1.4 returns to view-level features (Kalendarium is a new top-level view; Cartographia is the bound collection of maps, also a top-level view) and adds external-artifact work (HTML export) alongside, plus the visual-richness cluster (calendar grid + seasons + moons) inline with Kalendarium. v1.5 ships the Packs framework + one flagship pack (Space Opera) + ConLang promoted to its own core view + Ephemeris view (top-level celestial-mechanics surface). [Game Mechanics, originally the second flagship pack, was shelved to post-v1.5 on 2026-06-17 — design-only, no code shipped; see the v1.5 section and the 2026-06-17 block below.] v1.6 ships the Cartographia+ map creator full feature. v1.7 ships code modularization standalone, with no competing user-facing feature to obscure the structural work. User-facing surface area grows steadily release-over-release; foundation underneath gets the modularization treatment once the foreseen features are stable.

---

## Active / Next Up

### v1.5 — Ephemeris view + Packs framework + Space Opera pack + ConLang core view

Solo project, no schedule pressure; release ships when the pieces are done.

Two major surfaces in one release. Sequencing rationale: v1.4 carried four headline pieces and is the heaviest release in the line; v1.5 as Packs-only would have been underweight by comparison; v1.6 with the Cartographia+ creator alone is already a 60-100 hour build. Adding Ephemeris to v1.5 balances the cadence without overloading any single release.

**Status:** Ephemeris **feature-complete and QA-clean** (working copy at iteration r032; full 59-test QA pass closed 2026-05-24). All four original workspaces built: Astronomical Body, Compute, Observe, Event-Festival-Holiday. **Fifth workspace Forced Alignment shipped 2026-05-31 (r045–r047, polished r048, extended with verify+revert r051).** Moon unification built + QA-closed clean (r033–r040). Explorer-polish pass shipped (r041–r044). **Habitable zone three-model + luminosity override (r049).** **Apsides terminology + chain-break warnings (r050).** **Structured Ephemeris bug audit with seven fixes (r052).** **QA fixes: Compute single-day scan (r053), Observe banner copy (r054).** Discord community server launched 2026-05-21. Build order within v1.5: Ephemeris → moon unification → explorer polish → Forced Alignment → HZ overrides → terminology + diagnostics → verify+revert → bug audit → r048–r052 QA pass → Packs framework. **r048–r052 QA pass run and closed 2026-05-31 (37 PASS / 0 FAIL on run rows; two fixes — r053 Compute single-day scan, r054 Observe banner copy).** Remaining (as of 2026-06-20): the rest of the Glossopoeia core view (Phonotactics onward; built through r094), then three unrun Bug Audit rows (BA-01 trail composition, BA-02 tooltip copy, BA-04 reload-canonical; BA-03 N/A), then cartulary.world. cartulary.world deferred to post-v1.5 — the site will carry full feature guides rather than the scoped quick-help shipped inside the app, which requires the final v1.5 feature surface to be locked first. **Packs framework BUILT (r055–r060, 2026-06-01)** — parse-gated, browser-unverified *at build time*; the Space Opera pack was the QA vehicle (now closed, see the current-status block later in this paragraph). **Native `grid` field type BUILT + browser-QA-clean (r062–r074, 2026-06-02)** — an engine field type added ahead of the Conlang pack because Paradigm needs a 2D inflection table; per-entry axes, per-cell types, refs-any-entry. Source audit on Packs + grid fixed two real bugs (r071 pack re-import false-conflict, r072 grid-cell refs in Concordance) plus a walker-lockstep drift the audit missed (r074); footer button order swapped (r073). Grid QA full pass. Build order amended: Ephemeris → … → Packs framework → **grid field type**. **Node-source registry BUILT (r075–r081, 2026-06-02)** — parse-gated + source-audited, browser-unverified *at build time* (browser pass closed r087, see current-status block below in this paragraph). A registry of first-class linkable node types presenting as synthetic templates, so non-entry state slices (Ephemeris bodies now, ConLang later) become graphable in Concordance and targetable by entry-ref fields. Astronomical Bodies are the first registrant. Built pre-ConLang because the promote-to-view pattern (own state slice) severs objects from the entry-graph; the registry is the seam they register through. **Pack roadmap (current, 2026-06-17):** **Space Opera is the SOLE flagship pack** for v1.5. **Game Mechanics (D&D 5.1/5.2.1 SRD) is SHELVED to post-v1.5** — design-only, no code shipped, frozen at `game-mechanics-pack-reference.md`. **ConLang is promoted from a deferred pack to the next active workstream**, built as a core view (own state slice, registers through the registry). **Current build order: Ephemeris → … → Packs framework → grid field type → node-source registry → Space Opera pack (DONE, browser-verified r087) → registry QA (DONE, browser-verified r087) → Glossopoeia core view (BUILD IN PROGRESS — ConLang/Lexicon/L-G supersede/Inventory built through r094) → Ephemeris BA rows → cartulary.world.** **Space Opera pack DONE + FULLY BROWSER-VERIFIED (designed/authored r082–r085 2026-06-05; final re-test r087 2026-06-17, 13/13 PASS):** 8 templates, hand-authored single-file JSON; the framework's first browser pass surfaced and fixed three import bugs (r082 resolve-on-import + double-namespace guard, r083 world-import envelope guard) and added editor ref-field hints (r084–r085); r087 re-test cleared every path including the cascade-child otherTextField and user-template ref hints. **Registry DONE + BROWSER-VERIFIED (built r075–r081; QA full pass r087 2026-06-17).** **Variant filter SHIPPED + BROWSER-VERIFIED (r087):** core primitive, ships dormant on unconfigured worlds (see the r087 block below). **Glossopoeia core view COMPLETE + BROWSER-VERIFIED (r095–r104, 2026-06-21):** all eleven workspaces, field tooltips, in-app docs, per-language import/export; Drak confirmed at the r106 gate and re-exercised the import path on a real file 2026-06-22. **Glossopoeia Phase 2 DEFINED + STARTED (r105–r109, 2026-06-21):** the all-in-one direction (build compute substrates in-tool) was chosen over the Lexurgy round-trip integration layer; r105 (registry comment + lock guard), r106 (Lexeme **Word Pieces** group — a sanctioned second built-in group, one-group doctrine waived), r107 (IPA palette on every IPA field), r108 (small-wins: Duplicate / ready-to-name / palette close / list filter / list subtitles), r109 (the **syllabifier** engine + readout — the keystone substrate; one morpheme-aware maximal-onset rule with coda retention at seams reproduces both Ethlinde and Ân-lâna). r106–r109 were **browser-verified 2026-06-22** (Drak loaded the full Ethlinde file through the r104 import, which drove Word Pieces / the IPA fields / the list affordances and put the syllabifier readout through dense real data — `ae.θi.ran` AUTO confirmed; gate closed). **Phase 2 sequencing (2026-06-22): harvest first** — the word generator + phonotactic validation pair, both riding the syllabifier r109 already bought, ahead of the IPA rule engine. **The phonotactic validator shipped across r110–r111 (2026-06-22):** r110 added the check (`glossPhonotacticCheck`) and a warning block in the Lexicon Syllables card — onset/coda vs Max Onset/Max Coda, missing-onset-if-required, prohibited constraints warn, permitted documentary, unreadable patterns "not auto-checked," warn-only. Loading it against the Ethlinde import showed every word "not auto-checked"; cause was a build-time miss in the import (the prohibited constraints stored their real data in the Phonemes link and used Pattern as prose). **r111** rewired the check to read the **Phonemes link as set-membership** (fallback order: link → Pattern-as-sequence → not-auto-checked) and added a new closed-select **Applies When** field on the Phonotactic Constraint ("Anywhere at this position" / "Only in a cluster," shown only on Onset/Coda, no migration) so "velars never cluster" is modeled as data rather than guessed from wording. Node-tested against the real Ethlinde file and **browser-confirmed** by Drak. Canonical `Ethlinde.conlang.json` re-issued with the cluster flag pre-set. **r112 then shipped the word generator together with a sonority rewrite of the syllabifier** (the generator needed it): maximal onset now keeps only the rising-sonority run as the onset and drops the rest into the coda, sonority read from each Phoneme's Manner, which replaces the r109 count rule that over-pulled (`ranfir`→`ra.nfir`). 114 of the 599 Ethlinde words display a changed split as a result. The generator is a review-list panel in the Lexicon, the check run backward, weighted by lexicon frequency, deduped within the language. Both confirmed. **r113 then shipped the grammar/dictionary export** (the rendering layer: a whole-language reference document in Markdown and HTML, a new builder walking the 21 Glossopoeia arrays rather than `state.entries`), and **r114 keyed that export to the live theme** after the first cut exported plain black-on-white (it now reuses the entry export's `extractThemeVars()` path). Both confirmed ("renderer is good"). **r115 then shipped the IPA rule engine** (`glossApplyRules` runs the Phonological Rules in Order against a phoneme string, producing a per-word surface line with a fired-rules trace; slot notation for the environment), Node-validated against the real Gutter Elf rules; the Gutter Elf import was rebuilt to 177 records with its own inventory and notation rules to exercise it (data artifact, no r-bump). **r116 shipped the three-item cleanup batch** (inline paradigm tables, the Corpus picker scoped to lexemes, singleton enforcement), clearing the phase-two known-limits list. **r117 shipped auto-paradigms** (a word with an inflection class set shows its generated table in the Lexicon) and is confirmed. **r118 shipped the morpheme matcher / assisted glossing** (a "Gloss a sentence" panel atop the Corpus workspace that creates a pre-filled interlinear Example via a corpus-memory → lexicon → stem+ending → blank fallback); it's staged and Node-tested, browser pass open at the time. **r-counter now r122 (browser-verified).** The matcher (r118) plus the **diachronics apex** (r119–r121: engine split, fork clone, run) shipped; the r118–r121 browser pass ran 2026-06-23, r121 surfaced a full render crash (a deleted ternary opener in GlossopoeiaView) that r122 fixed with a one-line restore, and the whole set is now browser-verified. See the two 2026-06-23 blocks below. Both decisions from the Gutter Elf rebuild are now resolved (apocope narrowed to {e, a}; parent-inventory fallback declined) — see the 2026-06-23 (decisions) block below. **Ethlinde + Gutter Elf import artifacts delivered (2026-06-22, no r-bump):** two finished `.conlang.json` files (Ethlinde 745 records; Gutter Elf 178 (the canonical r115 rebuild at 177, +1 from the §9 apocope split; 145/146-record original superseded), a `varietyOf`) built and Node-tested through the r104 import — data files, not HTML. **Current build order: … → Glossopoeia core view (DONE, browser-verified r095–r104) → Glossopoeia Phase 2 substrates (syllabifier DONE, rewritten sonority-based at r112; phonotactic validator r110–r111 DONE; word generator r112 DONE; grammar/dictionary export r113–r114 DONE; IPA rule engine r115 DONE; cleanup batch r116 DONE; auto-paradigms r117 DONE; morpheme matcher r118 DONE; diachronics apex r119–r121 DONE, browser-verified r122) → optional apex polish (none blocking, unscheduled) → Ephemeris BA rows → cartulary.world.**

#### Ephemeris view

**Top-level view for celestial mechanics.** Parallel to Linea / Stemma / Concordance / Kalendarium / Cartographia in the sidebar register. Name: Ephemeris (Greek-rooted scholarly term for tabulated astronomical positions/events over time). Locked.

**Naming history.** Stellarium considered and rejected — direct collision with established open-source planetarium software (stellarium.org, ~25 years of name recognition in the exact adjacent domain). Astrarium considered and rejected — phonetically awkward (`astr-AR-i-um` consonant cluster), even though it would have matched the `-arium` suffix of Kalendarium. Ephemeris won on phonetic flow and semantic accuracy: an ephemeris IS a table of computed positions over time, which is exactly what the view produces.

**Feature surface (locked at planning, may narrow during build):**

- Body list (sidebar within the view, filterable by kind)
- Per-body editor: orbital elements (semi-major axis or period, eccentricity, inclination, ascending node, argument of periapsis, mean anomaly at epoch), physical parameters (mass or proxy, radius or apparent size), parent body picker, axial tilt for non-moons
- Alignment finder: phase alignment (all moons at same fractional cycle position), ecliptic conjunction (same sky angle from parent), eclipse alignment (moon crosses parent-star line), nodal alignment (multiple moons at their nodes simultaneously)
- Export of computed alignment dates to Festival/Holiday entries via existing date-field flows
- Visualization: top-down orbital diagram (Observe mode). Sky-from-surface cut from v1.5 — half-feature without body rotation, time-of-day, and lat/long precision; deferred indefinitely.

**Hard constraint v1 (load-bearing won't-have list):**

- No real-star catalogs (Yale Bright Star, Hipparcos, etc.)
- No real-world ephemeris data import (JPL, NASA, Skyfield)
- No observation simulation (light pollution, atmospheric refraction, twilight phases)
- No weather, no tides, no astrology
- No precession, nutation, or other long-period dynamics
- No N-body simulation — purely 2-body Keplerian per moon

These are the rabbit-hole edges. The same pattern Cartographia+ uses for its won't-have list (no freehand brush, no custom color picker, no layers) applies here.

**Schema rework — non-trivial:**

The current `calendar.celestials` scoping is structurally wrong for Ephemeris. Moons belong to physical bodies (planets), which belong to systems (stars). The calendar relationship is derivative — a calendar's months often derive from a moon's cycle, not the other way around. New state surface: `state.celestialBodies = [{id, name, kind, parentBodyId, orbitalElements, physicalParams, axialTilt}]`. Calendar grid view's celestial render keeps working via a lookup that pulls cycle/offset from the moon's orbital period — derived display rather than stored duplicate. Migration backfills bodies for any existing `calendar.celestials`, sets parentBodyId to null (user pairs them up in Ephemeris), and either deletes or shadows the duplicate.

> **Superseded by what shipped (note 2026-05-24).** What actually shipped did NOT make calendar render a derived display. Migration backfilled bodies but left `calendar.celestials` reading its own `cycleDays`/`offsetDays` directly (preserved as `legacyCycle` on the body), so the two surfaces stayed decoupled — a moon ends up defined in BOTH stores with the id-link broken. That decoupling is the friction the moon-unification work (below) now closes, circling back toward this paragraph's original "derived display" intent but with an explicit geometric→cycle fallback.

**Moon unification (Kalendarium ↔ Ephemeris) — BUILT and QA-CLOSED CLEAN (r033–r040, 2026-05-28 build / 2026-05-31 QA):**

A moon is defined once, in Ephemeris; calendars reference moon bodies by id and render phase resolved geometric → synodic-cycle → "no phase". Built across seven steps: shared `fractionToPhaseIndex` extract + `computeMoonPhaseGeometric` (unsigned elongation/360, reuses the bucketing) → `calendar.celestials` object→id-ref migration (id-then-name resolution across the merge/dedup passes) + `CalendarGridView` resolver + shape-tolerant `ensureCalendarShape` → first-class `synodicCycleDays`/`phaseAnchorDay` in AsBo (inert when geometry available) → eager `legacyCycle` promotion at migration (wrapper retired) → calendar moon-ref picker + quick-create → `deleteBody` ref sweep + single-calendar export embedding → single-calendar import reconciliation modal (option c). r040 followed QA: reconciliation dropdown options carry an `orbits <parent>` / `Nd cycle` / `no phase data` descriptor so same-named moons disambiguate. Two decisions diverged from the written spec, both recorded in `cartulary-doctrine.md`: (1) **eager** `legacyCycle` promotion instead of lazy keep-as-fallback (values are copied, nothing reads the wrapper after, so it was vestigial); (2) **unguarded** `+ New moon` quick-create instead of the parent-guard (the guard locked out the cycle-only users the fallback is built for). Single-calendar import is option (c): export embeds each moon's synodic data, import rebinds-by-name-or-creates via a per-moon reconciliation modal, bodies created atomically with the calendar. QA pass: 33/34 PASS, 1 SKIP (MU-21, the orphan-cleanup affordance, unreachable post delete-sweep).

**Ephemeris explorer-polish (r041–r044, shipped 2026-05-31):**

After moon unification closed, manual Ephemeris use surfaced UX gaps for non-astronomer users. Sanity-check audit produced seven candidate items; six shipped (the seventh — a louder visual cue for tooltip discoverability — held back as a tradeoff call). r041: narrative mirror kinds for every Computable kind (9 new entries with `(narrative)` suffix), `FIELD_TOOLTIPS` constant + dotted-underline `tooltip` prop on AsBoEditRow / AsBoFieldRow with 12+12 wired rows across edit and view modes, draggable Compute split divider persisted to `compute.querySplitRatio`. r042: dimmed explainer where the Orbital Elements block hides for computable + no-parent bodies. r043: Kind row context hint (Computable vs Narrative), conditional Parent Body empty-state hint, Mass field hint extended to flag the satellites requirement, Compute panel tooltip pass + jargon-to-plain rewrites of `ALIGNMENT_TYPES` hints and `tolHint`, "Use sample values" button in AsBoOrbitalEditBlock with `SAMPLE_SMA_BY_KIND` map and confirm-if-edited safety, Tutorial seed button in AsBo empty state adding Sol/Terra/Luna with realistic values. r044: tutorial button tooltip notes the empty-world-only availability so the disappearance after first use isn't a surprise.

**Forced Alignment workspace — BUILT (r045–r047, shipped 2026-05-31; QA-passed 2026-05-31):**

Fifth Ephemeris workspace slotted between Compute and Observe. Inverse of Compute: pick bodies + target date + alignment type + optional recurrence, and the workspace shows what edits force that alignment and (on confirm) writes them. r045: state shape extended with `state.ephemeris.forceAlign` (per-workspace selection, separate from Compute), math helpers added (`computeSmaFromPeriod` inverse Kepler, `targetMeanAnomalyForBody`, `computeForceAlignPreview`, `isBodyEligibleForForceAlign`), `ForceAlignModeContent` component built with live preview (no separate "compute" button), apply pipeline with confirm dialog. Tree generalized `isComputeMode` → `isMultiSelect` so Compute and Forced Alignment share the multi-select infrastructure with separate selection state. r046: eclipse caveat banner corrected (multi-body syzygy was already supported; the r045 banner inaccurately said "first two picks"). r047: **full-3D eclipse forcing.** New `meanAnomalyFromTrueAnomaly` inverse-Kepler helper; eclipse type rewrites `ascendingNode = 0` (orbital plane contains shared eclipse direction) and `meanAnomalyAtEpoch` via ν = -ω inverse; preview gains Ω column for eclipse mode; apply pipeline writes Ω only when `omegaRewritten` is set (other alignment types still leave Ω alone). Inclination preserved across all alignment types — tilted planes that contain the shared line still work. Math validated end-to-end: three bodies with inclinations 2°/25°/60° and eccentricities 0.05/0.1/0.2 all forced to land exactly on +x at the target day (unit direction `(1.000000, 0, 0)` for all three). Recurring intervals supported on all types: `sma` rewritten per body to make each period divide N evenly (k auto-picked to minimize disruption); warning glyph on rows with > 50% sma change. Eclipse caveat that remains: pick the WHOLE chain (unpicked ancestors don't get rewritten, so a chain with gaps doesn't line up).

**Forced Alignment gap+polish pass (r048, shipped 2026-05-31; QA-passed 2026-05-31):**

Closed seven items from a gap audit. Gaps (3 of 4): nodal eligibility now requires `inclination > 0` (mirrors Compute's existing filter); `migrate()` backfills `forceAlign` substate for pre-r045 worlds; eclipse chain-completeness check walks each picked body's parent chain and surfaces unpicked non-root ancestors as warnings in a new `warnings[]` preview array. Polishes (4 of 4): phase reference fraction input with four preset buttons (0/¼/½/¾), new state field `phaseReferenceFraction` default 0; preview sorts eligible bodies by sma ascending; empty-world bridge ("Go to Astronomical Body →" button) when no bodies exist; calendar dropdown change auto-clears `targetDate` to avoid silent reinterpretation. G4 (structured QA pass) still pending.

**Habitable zone three-model + luminosity override (r049, shipped 2026-05-31; QA-passed 2026-05-31):**

`computeHabitableZoneAU(pp)` rewritten with three-model precedence: manual > optimistic > conservative (default). Conservative = Kasting (1993) 0.95/1.37; optimistic = Kopparapu (2013) 0.75/1.77; manual = direct `hzInnerAU` / `hzOuterAU` bypassing physics. Luminosity override (`pp.luminosity` in L☉) decouples L from M, applies to conservative and optimistic models. Star-only edit sub-block in Physical Parameters. Derived display caveat shows active model. No migration needed.

**Apsides terminology + chain-break warnings (r050, shipped 2026-05-31; QA-passed 2026-05-31, banner copy fixed at r054):**

Three independent cleanups. (1) "Perihelion"/"Aphelion" → "Periapsis"/"Apoapsis" — generic terms correct for any parent; perihelion/aphelion specifically mean "around the sun". (2) `FIELD_TOOLTIPS` rewritten for `semiMajorAxis`, `eccentricity`, `inclination` with both planet-scale and moon-scale references. (3) Chain-break warnings: AsBo orbital elements block shows accent warning when parent has no mass; Observe diagram shows banner listing affected bodies.

**Force-Align verify-in-Compute + revert (r051, shipped 2026-05-31; QA-passed 2026-05-31, verify fixed at r053):**

State extension `forceAlign.lastApply` captures per-body before/after snapshot of only the fields the apply actually touched (M₀ always, sma if recurring, Ω if eclipse). Snapshot persists across mode switches and the empty-world bridge. Three buttons in the lastApply UI block: **Verify in Compute →** switches mode + pre-fills currentQuery with the applied bodies/type/day; **Revert** restores each snapshotted body's pre-apply field values (locked-mode disabled); **Dismiss** clears the record. Only most recent apply revertable.

**Ephemeris bug audit + fixes (r052, shipped 2026-05-31; QA-passed except BA-01 trail / BA-02 tooltip-copy still unrun, BA-03 N/A):**

Structured audit identified 3 real bugs + 4 polish items, all fixed. (1) Trail rendering now uses `computeRootRelativePosition` at each sample time so moon trails follow the parent's wake instead of drawing as stationary ellipses around the planet's now-position. (2) `deleteBody` sweeps `forceAlign.bodyIds` + `lastApply.snapshots` (clears lastApply if empty). (3) Observe skips broken-chain bodies entirely (orbit rings, trails, body dots all gated on `brokenChainIdSet`). (4) Compute eligibility requires parent mass when body has a parent — dim in picker instead of silently producing zero results. (5) Force-Align target date shows resolved absolute day as inline italic helper. (6) `computeOrbitalPosition` guards `argumentOfPeriapsisDeg` defensively. (7) Phase fraction tooltip rewritten to make orbit-position-vs-lunar-phase disconnect prominent. v2-deferred items from the audit: calendar-edit drift warning, moon-wrapper retirement audit.

**r048–r052 QA pass + two fixes (r053–r054, 2026-05-31):**

First browser QA of the r048–r052 work. Engineered fixture world (`Cartulary_QA_ForceAlign_World.json` — 12 bodies, one star system, bodies deliberately un-aligned so Force-Align produces visible deltas, every eligibility/exclusion branch represented) + 41-case sheet (`Cartulary_v1.5_Ephemeris_r048-r052_QA.xlsx`, four tabs, doctrine yellow/black-moat frame). 37 PASS / 0 FAIL on run rows; two bugs found and fixed. **r053 — Compute single-day scan:** all four `find*Alignments` finders bailed on `dateRangeEnd <= dateRangeStart`, so the zero-width range Verify-in-Compute writes (`start == end == targetDayAbs`) returned nothing; guard relaxed to `<` so a single-day scan runs (also closes the manual start==end footgun). **r054 — Observe banner copy:** broken-chain banner still read "drawn at the system root as a fallback", but r052 stopped drawing those bodies; reworded to "left out of the diagram". Unrun: BA-01 (trail composition — the headline r052 fix), BA-02 (tooltip copy), BA-04 (reload-canonical); BA-03 (ω guard) is N/A.

**Orbital math depth — full Keplerian (2-body):**

Orbital positions computed via iterative Newton-Raphson solve of Kepler's equation (`M = E - e·sin(E)`, 5-10 iterations to convergence for e < 0.9), true anomaly derived from eccentric anomaly, three-rotation chain (Ω about Z, i about X, ω about Z) to inertial position. Simplified-Keplerian alternative (mean longitude as position, coplanar-circular assumption) rejected because eclipse alignment requires real 3D positions — without them, the finder produces phantom eclipses on inclined moons and misses real eclipses at non-zero ascending nodes. Eccentric orbits (comets, elongated moons) also deviate significantly from mean longitude near periapsis. Cost delta vs simplified: ~50-80 lines of math, ~10-20× more floating-point ops per evaluation, negligible at worldbuilder scales. Eccentricity capped at e < 1 (elliptical only); parabolic and hyperbolic orbits out of scope.

**Astronomical Body template — resolved (option a, locked):**

Astronomical Body promotes to the view-object pattern Map → Cartographia established in v1.4. The `kind: "celestial-body"` system template is hidden from the sidebar Templates section (parallel to the Map filter); body data lives in `state.celestialBodies`. Edit Template access stays available through the Astronomical Body workspace overflow menu. Locked via two doctrine entries: "Ephemeris uses `state.celestialBodies`, not calendar-scoped celestials" and "System templates can be hidden from the sidebar template list while their data is exposed through a workspace UI." Two-layer (b) and full-migration (c) were considered and rejected — (b) introduces a dual-representation pattern Cartulary doesn't have elsewhere, (c) loses the "worldbuilding entry like any other" affordance for cultural/narrative fields.

**Open design questions (UI design pass, not scoping):**

Resolved during scoping: Observe mode locked as top-down orbital diagram only (sky-from-surface cut — see Visualization in the Feature surface above); alignment finder ships all four types (phase, conjunction, eclipse, nodal). Both confirmed in the cross-cutting decisions and per-workspace locks.

Still open, design-pass territory:

- Sidebar icon: ☉ ☆ ★ ⊙ ✦ ✧ ☽ candidates.
- Sidebar order: probable placement between Kalendarium and Cartographia.

**Estimated code cost (per the part-3 breakdown, updated for full Keplerian):** ~1050 new lines (all four alignment types plus full Keplerian solver and 3D rotation chain) plus 7-8 new schema fields, migration pass, ~70-80 QA test cases. Shared sidebar infrastructure for v1.5's new sidebar entries lands in Ephemeris as the first piece of the sequence, then Packs picks up the already-modified sidebar.

**Trade accepted:** Putting a new top-level view into the monolith two releases before modularization adds incremental scope to v1.7. Not a fire — modularization always has to deal with whatever views exist when it lands — but stated cleanly so the trade is conscious.

#### Packs framework

**Templates-only top-level abstraction.** Separate sidebar section between Templates and Tags. Multi-collision import modal. State shape: `state.packs = [{id, name, description, templateIds: [...]}]`. Hard constraint v1: templates only, no entries/assets/fonts/CSS expansion.

Packs is the pressure-relief mechanism for genre-shaped feature requests. The doctrine principle "small default set, unlimited user extension" has been implemented at the single-template level via custom template builder + JSON import; Packs scales the pattern to bundle-shaped expansion. A Sci-Fi Pack with FTL Route / Fleet / Tech / Climate / CivilizationStage templates does the same job a built-in "complete sci-fi workbench" feature would, but without the maintenance burden landing on Cartulary core. Same for Mystery, Court Intrigue, procgen-driven settings, anything else genre-bound. The polite-no answer to "Cartulary should support [feature for genre X]" is: build a pack.

**Edge case worth surfacing in v1.5 docs:** Packs in v1 cannot add fields to *existing built-in templates* — the v1.4 origin-protection doctrine deliberately prevents external sources from modifying built-in templates. Pack authors who want to extend (e.g.) Faction with a Tech Level concept have two clean paths: create a separate TechLevel template referenced from Faction via entry-ref (relationship visible in Concordance), or create a custom Faction-like template (e.g. "Stellar Faction") that replaces the built-in for worlds using the pack. Field-additions to built-ins would require a "pack v2" extension; backlog candidate only if real demand emerges, since the entry-ref path handles the same cases.

**Build (r055–r060, 2026-06-01).** Shipped end-to-end: `state.packs` reference-sets (r055 foundation — state/migrate/sidebar/create/detail-pane/rename/delete), membership (r056 — add/remove + sidebar grouping + Templates-list filtering), export (r057 — `cartulary_pack_export` envelope, keeps template ids), import (r058 — deterministic per-pack id namespace + entry-ref remap + three pack-id branches + dedup), re-import reconciliation modal (r059 — stable-diff → per-template Replace/Keep), pack-qualified entry-ref labels (r060). In-app help for Ephemeris, Kalendarium (moon unification), and the JSON Save File Schema (new top-level keys) updated at r061. Each parse-gated; the pack runtime is validated via real-world import/export of the Space Opera pack. Locked scope decisions: reference-set not container; built-ins never members; a template may belong to multiple packs; pack id file-stable; per-pack id namespacing so same-named templates across packs coexist; pack delete never cascades.

#### Grid field type (engine, v1.5 — BUILT 2026-06-02)

Native `grid` field type (2D tables) added to the template engine ahead of the ConLang core view, because the Paradigm template needs an inflection table and no existing field type holds a 2D grid. Justified as general-purpose infrastructure, not a Paradigm one-off — relationship matrices, stat blocks, comparison tables, and script/orthography charts all want one; Paradigm is just the first consumer. Will also serve the eventual script/orthography work (sound-to-glyph and romanization tables) and any future pack.

Locked design (full rationale in `cartulary-doctrine.md`): axes are **per-entry** (each entry defines its own rows/columns — required because paradigms vary in shape, and the strict superset of fixed-axis); each **cell is independently typed** via `{type, value}`, five cell types (text / number / entry-ref / calendar-date / calendar-date-range); **ref cells target any entry** (no per-grid or per-cell target config — which also means a packed grid-bearing template needs no ref remapping). Cells default to text, switch-clears-value, sparse storage. Stable row/col ids so rename/reorder never disturbs cell bindings.

Built r062–r070 (foundation → editor → builder → display → per-cell rework → export → composition), audited and fixed r071 (pack re-import false-conflict) + r072 (grid refs in Concordance) + r074 (date-walker lockstep), footer swap r073. Browser-QA full pass (17-case sheet, `Cartulary_v1.5_Grid_QA.xlsx`, fixture `Cartulary_QA_Grid_World.json`). Documented v1 limitations: grid-cell refs show in Concordance but not Linea (family roles aren't cells); grid date cells aren't in the calendar-day-click popover (discovery-only walker, scoped out); number cells store strings; empty non-text cells persist.

#### Node-source registry (engine, v1.5 — BUILT 2026-06-02)

A registry of **first-class linkable node types**, added because Ephemeris Astronomical Bodies live in `state.celestialBodies` (not `state.entries`) and were therefore invisible to Concordance and un-targetable by entry-ref fields — and the same wall would hit ConLang the moment it becomes a core view with its own state slice. Built pre-ConLang as the seam future view-slices register through.

Registering a type buys two things: it's **graphable** (contributes nodes + intra-type edges to Concordance) and **ref-targetable** (entry-ref fields can point at it). **Registration is a data contract, not an API** — a source supplies a descriptor `{id, name, color, icon, refEligible, getInstances(state), getColor(inst), getEdges(state)}` and presents as a **synthetic template** so the existing templateId-keyed machinery (picker, coloring, name→id, legend) reuses with minimal branching. Core views satisfy the descriptor in code; a future pack could satisfy the same descriptor by declaration once Packs grows past templates-only (the descriptor is kept declarative so that door stays open at no cost now). Packs as they exist need nothing — their instances are entries, already first-class — but a pack **can target a registered type by name** in `refTemplates`, resolved via the same `fix()` name→id path, which makes the registered-type names a **published allow-list** that's part of the pack-authoring contract.

Astronomical Body is the first registrant. Built r075–r081: foundation (r075) → Concordance reads bodies as kind-colored nodes with orbital "orbits" edges, the sector hierarchy for free (r076) → "Astronomical Body" becomes an authorable entry-ref target, the id unified onto the existing `__bodies__` sentinel, `BODY_REF_LABEL` renamed "Celestial Body" → "Astronomical Body" with the old label kept as a resolving alias (r077) → bodies as Stemma nodes (r078) → bodies as Cartographia pins (r079) → Ephemeris delete silently scrubs inbound entry refs with a "referenced by N entries" warning before confirm (r080) → bug-audit fix for a body-label/template-name collision the rename introduced (r081). Parse-gated and source-audited; **browser-verified r087 (2026-06-17, full QA pass)** — the five net-new behaviors (r076 graph read, legend toggle coupling, r081 sentinel guard surviving reload, synthetic-template exclusion) all cleared. Also a stale-comment note: the sentinel comment near the top of the registry block still says "Celestial Body" while the constant resolves to "Astronomical Body" — harmless, one-line fix when next in that region. View triage that scoped it: Concordance (read) + the entry-ref picker (author) were the real gaps; Linea and Chronometric are correct-by-design; Stemma and Cartographia were soft manual-surface gaps brought in scope.

#### Two flagship packs (post-registry) — replace the single ConLang pack

Under-promise/over-deliver originally aimed for two flagship packs; **revised 2026-06-17 to one (Space Opera).** Game Mechanics shelved to post-v1.5 (design-only, no code shipped; frozen at `game-mechanics-pack-reference.md`). The Packs framework is fully validated by the single Space Opera pass — the second pack was for over-delivery, not framework coverage, so shelving it costs no verification.

**Pack A — Space Opera (system-agnostic), built FIRST as the Packs-framework browser-QA vehicle. DESIGNED + AUTHORED + PARTIALLY BROWSER-VALIDATED (2026-06-05, r082–r085).** It hits every framework code path self-contained — Type-gated `showWhen`, two `optionsByParent` cascades, `refFilters`, intra-pack single + multi refs, multi-template refs, refs into Faction/Character/Location/Race/Magic-Tech built-ins, a ship-spec grid, `otherTextField` — with no SRD/attribution confounds. **Locked roster (8, the 4–7 target held fluid):** Vessel, Technology, Cargo / Commodity, Colony / Station / Habitat, Route, AI / Synthetic, Crew, Powers / Abilities. Designed via full proposal-review (halfwidth tables, Drak reordered each); hand-authored as a single-file `.cartulary-pack.json` by `build_pack.py` (self-validating, 0 errors). Doctrine settled here: **packs aren't gated by the built-in high bar** (overlap expected), **specialized-slice over self-contained** (ship the genre slices, lean on genre-neutral built-ins), **single-JSON format** for templates-only packs. Stays off celestial bodies and does NOT depend on the registry — the QA vehicle stays self-contained. The browser pass surfaced three framework bugs (r082 import-resolve + double-namespace guard, r083 world-import envelope guard) and prompted a new editor feature (r084–r085 ref-field hints); **final re-test on r087 (2026-06-17) cleared 13/13** including the cascade-child otherTextField and user-template ref hints.

**Pack B — Game Mechanics on the D&D 5.1/5.2.1 SRD (CC-BY 4.0). SHELVED to post-v1.5 (2026-06-17) — design-only, zero code shipped; authoritative frozen design at `game-mechanics-pack-reference.md`. The text below is the historical sketch as of mid-design and is NOT the current plan; the reference doc supersedes it (8 locked schemas, the {2014,2024}+flag edition model, Species/Race proposal, seven open decisions).** Templates (sketch): **Stat Block / Ability / Item / Encounter**. **Ships the stat-block SHAPE, not SRD content** — Packs v1 is templates-only, so no SRD creatures/spells/items as entries. This keeps licensing light: game *mechanics* aren't copyrightable (six abilities, AC, HP, CR, the d20 structure are free to model); CC-BY only bites on reproduced *expression* or verbatim curated lists (conditions, damage types, schools). The 5.1 SRD is mostly the reference for getting the shape right; the standard CC-BY attribution slots into the existing license preamble (MIT + BSD-3 + OFL) as cheap insurance for any enumerations copied. (Not legal advice — verify any specific verbatim list before release.) Heavier grid showcase, which is why it's second, not the test rig. Attaches stat blocks to existing Creature/Character entries rather than duplicating them.

> **Licensing research findings (2026-06-02).** Targets checked for a free, MIT/itch.io-distributable mechanics pack. **Legend in the Mist** (Son of Oak / Mist Engine) — RULED OUT: the "Cauldron of Mist" third-party program is a closed DriveThruRPG storefront, platform-exclusive (content can't be listed elsewhere), 50% royalty, no open SRD, and excludes universal systems based on its games; also tag/narrative-based (no stat-block showcase). **Mongoose Traveller** — RULED OUT for the brand: 1e (2008) was OGL with a public SRD; 2e (2016+) is closed; the 2023 "Traveller Open Content" promise delivered only a gated Compatibility Licence (royalty-free private contract, established publishers only, SRD behind closed doors) + the TAS DriveThru storefront. Escape hatch: **Cepheus Engine** (the OGL "2d6 SF SRD" forked from MgT1e) is fully open/reproducible/free, mechanically Traveller-feel, minus the trademark. **Clean open targets:** PF2e (ORC), D&D 5.1 SRD (CC-BY), and OGL survivors like Cepheus. Daggerheart carries a third-party VTT restriction; system-agnostic stays viable at the cost of mechanical fidelity. Drak picked the 5.1 SRD for pack B.

**Authoring workflow (resolved 2026-06-02):** a pack is normally authored in-app and exported, but the assistant can't drive the UI, so the assistant **hand-writes the `.cartulary-pack.json`** directly (it knows the template schema and the `cartulary_pack_export: 1` envelope); Drak imports and validates. Each template goes through the proposal-review cycle (halfwidth tables, sign-off) before any JSON is generated.

#### Glossopoeia: the ConLang core view (COMPLETE r088–r104; Phase 2 COMPLETE r105–r122, browser-verified; apex polish r123, browser-verified)

The ConLang core view is named **Glossopoeia**. The core view is **complete and browser-verified (r095–r104)** and **Phase 2 is complete and browser-verified through r122** (the diachronics apex shipped and verified). Glossopoeia is closed as a workstream; its two dedicated docs (`glossopoeia-design-handover.md`, `glossopoeia-phase-two.md`) are retired and frozen as of 2026-06-23, with status consolidated into this roadmap, the handoff, and the changelog. **Architecture (locked, built):** Glossopoeia is a VIEW with its own state slice (`state.glossopoeia` — 21 record arrays + workspaceNotes + ui), exactly like Ephemeris — NOT templates in `BUILTIN_TEMPLATES` (an early attempt was reverted, r089–r090). Entities render through the existing `EntryForm` with per-type schemas built in code; node types register through the node-source registry. Full schema reference: `glossopoeia-design-handover.md`; state in handoff §1.

**Core view DONE (r088–r104, browser-verified):** r088 multi-select prerequisite; r091 view shell + ConLang container + EntryRefEditor generalization; r092 Lexeme + Lexicon (Senses group); r093 the destructive Language/Glossary supersede-and-migrate; r094 Phonology: Inventory + `GlossEntityList`; r095 Phonotactics + Inventory longform; r096 the Morphology four-entity toolbox (four node types + the three deferred Lexeme refs); r097 Noun Number + Verbs display digests; r098 Pronouns; r099 Syntax + Complex Structures + Lexeme reorder; r100 Orthography + Corpus (eleven workspaces complete); r101 grid-cell ref threading audit fix; r102 field tooltips (176 fields); r103 in-app usage + JSON-schema docs; r104 per-language import/export. **Eight node types register:** ConLang, Lexeme, Phoneme, Grammatical Value, Affix, Word-Building Process, Inflection Class, Writing System.

**Phase 2 DEFINED — all-in-one** (2026-06-21). Build the compute substrates in-tool; the discarded alternative was the integration layer (round-trip to Lexurgy). Substrate spine: substrate-zero (word as phonemes + morpheme seams) is partially done — clean-IPA Pronunciation + the **Word Pieces** group (r106); the **syllabifier** is the keystone and is DONE (r109); the **IPA rule engine** (r115), **morpheme matcher** (r118), and **rendering layer** (r113–r114) followed, then the diachronics apex (r119–r122). Tier features the substrates unlock: word generator, phonotactic validation on save, paradigm autogeneration, sound-change applier, auto reference grammar.

**Phase 2 BUILT + BROWSER-VERIFIED (r105–r122):** all compute substrates, every tier feature, and the diachronics apex. Per-build:
- r105 — registry comment fix (Astronomical Body) + `onConlangFile` lock guard (no-op / unreachable).
- r106 — Lexeme **Word Pieces** group (Sounds / Role / Affix), the **second** sanctioned built-in group; the one-group doctrine was waived deliberately.
- r107 — **IPA palette** on every IPA field in Glossopoeia (a "This language" row from the inventory + the full chart).
- r108 — small-wins: Duplicate, ready-to-name, palette close on Esc/click-outside, list filter past 6 items, list subtitles.
- r109 — the **syllabifier** engine `glossSyllabify` + per-word Syllables readout/override; one morpheme-aware maximal-onset rule (coda retention at seams) proven on Ethlinde + Ân-lâna; engine Node-tested. Rewritten sonority-based at r112.
- r110–r111 — **phonotactic validator** `glossPhonotacticCheck`; onset/coda vs Max Onset/Max Coda, missing-onset-if-required, prohibited constraints by Phonemes-link set-membership (r111 fix), new **Applies When** field; warn-only.
- r112 — **word generator** (the check run backward, weighted by lexicon frequency, review-list panel) plus the sonority rewrite of the syllabifier the generator needed. 114 of 599 Ethlinde splits changed.
- r113–r114 — **grammar/dictionary export**; a slice-walking builder over the 21 arrays, Markdown + HTML, r114 keyed it to the live theme.
- r115 — **IPA rule engine** `glossApplyRules`; runs Phonological Rules in Order against a phoneme string, per-word surface line, slot notation. Gutter Elf import rebuilt to 177 records to exercise it.
- r116 — cleanup batch (inline paradigm tables, Corpus picker scoped to lexemes, singleton enforcement).
- r117 — **auto-paradigms**; a word with an inflection class shows its generated table in the Lexicon.
- r118 — **morpheme matcher / assisted glossing** `glossGlossSentence`; "Gloss a sentence" panel, corpus-memory → lexicon → stem+ending → blank fallback.
- r119–r121 — the **diachronics apex**: engine split into `glossRunRules` + the Diachronic-filtering wrapper plus the Diachronic flag (r119); `glossForkLanguage` clone + Descended From on ConLang and Lexeme + "descended from" Concordance edges (r120); `glossDeriveDaughters` / `glossRomanize` / `glossApplyDaughters` run + review-diff modal (r121).
- r122 — fixed the r121 render crash (restored the deleted ternary opener in GlossopoeiaView); completed the apex browser pass.

**Next:** the apex-polish bucket is empty — #1 unused-sound prune and #4 Source Word help shipped (r123, browser-verified), #2 per-word run exclusion and #3 stem-level paradigms declined on scope (see the 2026-06-23 (later) block at the tail and the doctrine block of the same date). Also shipped this session: r124 delete-language cascade (bug fix, browser-verified) and r125 per-calendar date format + single-formatter consolidation (browser-verified). Next real work: Ephemeris BA rows (BA-01/02/04), then cartulary.world. Both Gutter Elf decisions resolved (apocope -> {e, a}, file updated 2026-06-23; parent-inventory fallback declined). CSV/Swadesh import is scoped and deferred (see the 2026-06-23 (deferred) block at the tail; CSV-with-mapping is the priority half, Swadesh optional or skip). The other Tier 1 items (Concordance cross-type edges, romanization→IPA, lexicon statistics) remain optional. Open gap: deleting a PARENT language leaves children's Descended From dangling (non-blocking; downstream skips dead pointers).

**Deferred (carry forward):** visual script assets (Scrap's glyph chart + images; the world-scoped asset subsystem stays out of v1, Scrap migration gated on it — note PolyGlot ships a logographic engine, so this is a single-file-architecture call, not a nobody-does-it call); structured root-and-pattern as a first-class type; the romanization→IPA parser (the languages use clean IPA, so deferred). Limits cleanup: cross-type Concordance edges (intra-type only), unfiltered grid ref cells + cross-boundary refs inside grid cells not relinking on import, the duplicable per-language specs (r108 gave them a label but didn't block a second create).

**Import artifacts (2026-06-22, no r-bump):** `Ethlinde.conlang.json` (745 records) and `Gutter_Elf.conlang.json` (178 records — 177 at the r115 rebuild plus one from the §9 apocope split to {e, a}; its own inventory and notation rules; the 145/146-record original is superseded, do not re-import it; a `varietyOf` Ethlinde) — built and Node-tested through the r104 import to bulk-populate Glossopoeia from Drak's DPE source docs. Data files in `/mnt/user-data/outputs/`, not part of cartulary.html. Import order: Ethlinde first, then Gutter Elf.

---

## v1.6 — Cartographia+ map creator (Excalidraw-for-maps)

Primitive map creator inside Cartographia. Currently Maps requires the user to bring their own background image (Inkarnate / Wonderdraft / Dungeondraft / Azgaar / hand-drawn scan). For users without those tools and without artistic skill, that's a real onboarding barrier — one of Cartulary's headline views is gated behind external software ownership. A primitive editor lets a new user produce a serviceable rough map in twenty minutes, place pins, exercise the time-aware filtering and name-history rendering — actually use Maps instead of staring at an empty canvas.

**Frame: Excalidraw-for-maps, NOT Inkarnate-lite.** Excalidraw shipped wildly popular by leaning into a single aesthetic constraint (everything looks hand-sketched on graph paper) and refusing to be a real diagramming tool. The constraint is the feature. Cartulary's map editor picks one aesthetic — parchment-and-ink as default, with stamp packs extending to other styles — and stays inside it.

**Why this is borderline doctrine and how it stays inside.** Drawing tools categorically don't have a defined feature edge — every drawing app gets requests forever ("can you add a brush, fill, forest texture, hex overlay, measurement, elevation tints"). Each individual request is small. None individually break doctrine. Cumulatively they turn Cartulary into a bad Wonderdraft. The architectural answer is the small-default-set + user-extension pattern (see doctrine): ship a small built-in set that meets the high bar, support unlimited user extension via an importable spec, and the polite-no answer to feature requests becomes "the spec supports it, build your own." This makes the feature defensible inside doctrine; without the extensibility hook, it isn't.

**Why Packs lands first.** Packs v1.5 validates the small-default-set + user-extension pattern at the more familiar Templates surface. Map editor is the second instance applied to a creative-content tool. Shipping Packs first means the import collision modal, JSON envelope conventions, and user mental model are already established before the Map editor relies on them for stamp pack import.

**v1 scope (locked from Chat 08):**
- Drawing primitives: filled shapes (polygon, circle, rectangle) with smoothed corners; strokes (lines, paths) with a small set of widths
- Text labels in Cormorant Garamond
- A small fixed palette tuned to the chosen aesthetic — 6–8 colors, not a picker
- A starter built-in stamp set: mountain, tree, settlement marker, compass rose
- Undo/redo
- Save as SVG embedded in the Map entry (data stays inside the world JSON)
- Stamp pack import via `cartulary_mapstamp_pack: 1` envelope, Skip/Replace/Rename collision modal mirroring Templates and Packs

**v1 explicit won't-have list (the load-bearing artifact):**
- Freehand brush tools
- Custom color picker
- Layers beyond a named, ordered, show/hide, lock list: no opacity, no blend modes, no per-layer export. (The list itself was added by decision at session 19; this line originally read "Layers".)
- Procedural generation
- Image import as drawable surface *(struck 2026-10-22: r043's raster layers load a bitmap as a layer, and the paint engine of cut 14 paints on it)*
- Image export beyond SVG/PNG

**Estimated scope:** Larger than Concordance overhaul, smaller than Stemma. 60–100 hours equivalent depending on undo/redo depth and stamp manager polish. Realistic ship ~1–2 weeks of focused work plus QA.

---

## v1.7 — Code modularization

Internal refactor splitting the working source into a modular set of source files, with the dual-build pipeline assembling them into the shipping artifacts. Standalone release with no competing user-facing feature, so the structural work is visible for what it is. Originally slated for v1.4; pushed to v1.7 once it became clear the "stable feature surface" criterion applies more honestly here than there. By v1.7, Kalendarium, Cartographia, HTML export, Packs, the ConLang view, and the Cartographia+ creator have all landed and stabilized. Module boundaries get carved against the full picture.

Cartulary's distribution model is non-negotiable: users download one HTML file and it works. The build pipeline already supports this — `build_inline.py` reads source, inlines dependencies, emits the precompiled production build and the JSX-preserved readable build. Modularization extends that pipeline to read multiple source modules instead of one monolithic file.

**Scope to be defined.** Drak owns the architectural plan; specific module boundaries, build flow changes, and Readable-distribution shape get pinned down when the work starts.

Candidate axes for the split (any subset may apply):

- Built-in templates definition (`BUILTIN_TEMPLATES`) out into its own module — dominates working-copy size and changes frequently
- Migration framework (rename tables, conversion tables, field-add pass, etc) out into its own module
- View components (`GraphView`, `FamilyView`, `StemmaCanvasView`, `ChronometricsView`, `MapView`, `KalendariumIndexView`, `KalendariumEditorView`, `CartographiaIndexView`, plus the v1.6 Cartographia+ creator subsystem) into per-view modules
- Editor components (`EntryForm`, `FieldEditor`, `TemplateBuilder`, `RichTextEditor`) into per-editor modules
- Core state plumbing (`updateState`, normalize/migrate, IndexedDB persistence) stays in the entry point

**Origin protection enables this.** With `origin: "builtin" | "user"` on every template, the migration framework filters built-in operations safely. A split where built-in template definitions live in a module imported by `seedBuiltinTemplates` doesn't risk a user template sharing a built-in name being subject to canonical-schema force-merge.

**Monolith pain signal.** v1.4–v1.6 ship with the monolith intact. Currently 1.17 MB; v1.6 working copy could be ~1.5 MB. If at any point through v1.5/v1.6 the monolith starts costing real navigation or AI-assistance time (both have a curve that gets noticeable past some threshold), that's the signal to slide modularization forward rather than wait. Worth keeping a finger on, not blocking.

**No user-visible features.** If anyone notices anything different after the refactor, it failed. Functional parity verified by running the v1.3 + v1.4 + v1.5 + v1.6 QA test sheets against modularized outputs.

---

## Backlog (post-1.7, non-blocking)

### Kalendarium polish / visual richness — pulled forward to v1.4

The three originally-backlogged items (calendar grid view, moons / celestial bodies, seasons) shipped in v1.4 once modularization was de-scoped to v1.7. See "Done — v1.4 release" below for the full feature surface. The deferred sub-cluster (weather, holidays as recurring entities, auto-advancing current date) remains deferred — those were Kanka-feature-spam calls and the reasoning hasn't changed.

Still deferred from the original cluster (not pulled forward):
- **Weather per-day grid data** — fantasy worldbuilders define weather narratively, not as grid data. Kanka feature-spam.
- **Holidays as recurring first-class entities** — Festival / Holiday template already covers this through prose. Auto-recurrence rendering would clutter Chronometric without adding worldbuilding value.
- **Auto-advancing "current date"** — Kanka does this; not relevant to typical worldbuilder workflows (writers and GMs advance time narratively, not via wall-clock ticks).

### Concordance polish

Level 1 and Level 2 of the Concordance persistence overhaul shipped in v1.3. Remaining items are pure polish:

- **Edge labeling** — minor visual improvements to edge-label placement and truncation, ship anytime without ceremony.
- **Per-node reset action** ("auto-place this") — fallback when a manual position becomes wrong and the user wants the simulation to re-place a single node around its connections. Implementation is local: clear `state.concordance.positions[entryId]`, trigger a re-cook for that node only.

### Concordance sector graph (stars from Ephemeris as graph nodes)

*(Surfaced post-v1.5 Ephemeris scoping. Unknown target version.)* **PARTIALLY DELIVERED (r075–r081):** the node-source registry already puts stars/planets/moons in Concordance as nodes and draws the orbital hierarchy (`parentBodyId`) as "orbits" edges — the star→planet→moon sector view falls out for free. What remains open is the rest of this entry's scope below: user-defined inter-system connections with per-edge distance metadata, and a star-only filter mode. per the v1.3 doctrine entry on manual positioning ("abstract-graph and spatial-diagram use cases — star maps, faction-power diagrams, planar cosmologies — without requiring a separate Star Map view"). This entry captures a specific extension: stars from Ephemeris auto-populate as Concordance nodes, with user-defined inter-system connections carrying per-edge distance metadata.

Key design move that keeps scope bounded: **topological positioning, not coordinate-accurate.** The graph doesn't simulate real distances in space; node positions are wherever force layout places them (or wherever the user manually drags them), and "distance" is metadata on the edge (light-years as user-entered value), not derived from positions. This skips the entire coordinate-accuracy / 3D-projection rabbit hole and treats the sector as a relationship graph that happens to be about stars.

Sketch:

- **Star auto-population.** Bodies with `kind: "star"` and `parentBodyId: null` (top-level stars, one per system) appear as Concordance-eligible entities. Hidden from the standard template list per the v1.5 Astronomical Body workspace doctrine, but visible as graph nodes — different surface.
- **Inter-system connections.** Either a new field on star bodies (`connectedSystems` multi entry-ref with per-row distance metadata, extending the `relationKind`-with-extra-fields pattern already used for spouse marriedOn/endedOn) or a standalone "System Connection" entity type. Entry-ref pattern is lighter and reuses existing plumbing.
- **Edge labels.** Distance value shown on the edge. Promotes the existing "Edge labeling" polish item above from polish to load-bearing.
- **Hover popup.** Star info via existing Concordance hover: name, kind, planets in the system (derivable from the star's children in Ephemeris's body tree), worldbuilding entries set in that system via faction/location backlinks.
- **Filtering mode.** Concordance grows a "filter to star nodes" mode so the sector view shows only stars + inter-system connections, hiding all other entries. Toggleable.

Open design questions deferred to scoping when the work is actually targeted:

- Binary star handling — does the secondary appear as a separate node, or just surface via hover on the primary?
- 2D vs 3D rendering — topological positioning works in both; 3D would feel more sci-fi and use depth as a layout axis to reduce edge crossings, but 2D is a much smaller addition. The originating idea was 3D; worth revisiting against actual scope budget when targeted.
- Empty-state handling — single-system worlds (most fantasy) don't benefit from a sector graph; UX should explain rather than show one floating node.
- Whether this is Concordance-with-star-mode or a separate view (e.g., "Astrography"). Concordance extension is lightest for v1; separate view is more discoverable but adds a new top-level sidebar slot.

**Generalization.** The same pattern (entity-kind-aware filtering + per-edge metadata) extends beyond sci-fi. Faction connection graphs, trade route maps, explicit planar cosmology links — same shape, different entity type. Once Concordance supports these two primitives, the star-sector use case is one application of many; the implementation effort amortizes across multiple worldbuilding domains.

**Competitive context.** Fills the in-game-tool gap currently held loosely by AstroSynthesis (Windows-only, paid, feature-frozen since 2013). The integration story is what's new vs AstroSynthesis: graph nodes ARE worldbuilding entries with all the existing Cartulary plumbing — templates, entry-refs, time-aware filtering, name-history, faction backlinks — not a separate star-mapping silo.

Not committed to any release. Lands when it's the right size of next thing to ship or when worldbuilder demand surfaces.

### Marriage feature followup

`marriedOn` / `endedOn` dates on spouse `relationKind` value shape. v1.2 marriage feature shipped with the basics; expanding to capture start/end dates is the natural next step.

### Data shapes reference doc

Add to project docs (`cartulary-doctrine.md` or new `docs/data-shapes.md`). Cover entry shape (tags is ARRAY not string, fields object keyed by field id), template field shape, key field value shapes. Prevents assumption bugs like the v1.3 hover-pane tags-as-string crash.

### Entry-ref correctness audit

Verify `refTemplate` / `refTemplates` point to correct templates across all 20 built-in templates. Template renames during the v1.3 uplift may have left stale references. Check both single (`refTemplate`) and multi-template (`refTemplates`) fields.

### Native recurrence support on calendar-date field type (D.4)

*(Surfaced from v1.5 Ephemeris scoping. v1.6+ candidate.)* When v1.5 Ephemeris promotes a recurring computed event (e.g. a phase alignment that recurs every 30.4 days) to a Festival/Holiday entry, recurrence information lands as plain text in the entry's notes. The shipped v1.5 entry is a single Festival with first occurrence as the date and recurrence info described in prose. D.4 would make recurrence a structural property of the `calendar-date` field type itself.

Sketch (subject to design pass): field value shape becomes `{absoluteDay, recurrence: {periodDays, count?, until?} | null}`. Consumers (Chronometric ticks, Kalendarium grid cells, Festival/Holiday entry rendering, Concordance edges where applicable) expand a single stored field into multiple display occurrences.

Scope considerations:

- **Calendar-position invariance.** Period in days is calendar-agnostic and stable across primary structural edits. Period in months or years would drift under primary structural edits the same way `currentMoment` would if stored as absoluteDay — likely just days for v1.
- **Render expansion bounds.** Cap on displayed occurrences (worldbuilder-tunable per view? hard cap on storage shape?). A "recurs every day for 10,000 years" pathological case needs a story.
- **Storage compactness vs query simplicity.** One field with recurrence is more compact than N expanded events at storage time, but every date-walking helper (`reframeDateAcrossStructure`, `collectCalendarDateUsages`, etc.) needs to learn about recurrence expansion.
- **Migration story.** Existing date fields without recurrence are unaffected — the new field is an additive optional sub-shape on the existing `calendar-date` value envelope.

**Distinct from the deferred "Holidays as recurring first-class entities" item** (in the Kalendarium polish backlog above). That was about entity-level recurrence — a "recurring festival" entity type — and was rejected as Kanka feature-spam. D.4 is field-level recurrence — a `calendar-date` field that represents a recurring date — driven by an actual concrete v1.5 use case (computed event promotion). Different layer, different motivation, different scope.

Triggered by v1.5 Ephemeris work but doesn't block v1.5 ship. The plain-text-in-notes fallback is acceptable for v1.5 release. D.4 lands when worldbuilder feedback indicates the prose-only model is the friction point worth fixing.

---

## Deferred indefinitely

- Stemma v2 features (sibling reorder, mention tracking, keyboard shortcuts, undo/redo, depth cap, MD export)
- World-scoped custom assets (gates Scrap conlang migration)
- Mobile UX
- Markdown export for Stemma (separate from JSON export which exists)
- Per-filter-state Concordance position storage (current behavior is global per world)
- "Star Map" as a separate sidebar view (Concordance with persistent positions IS the star map)

---

## Done: shipped-release retrospectives (v1.1 through v1.4)

> Archived to `roadmap-archive.md` (verbatim). The per-release "what shipped" retrospectives live there to keep this roadmap forward-looking.

## Standing principles

> Relocated to `roadmap-principles.md` (verbatim) to keep this roadmap forward-looking. These are the accumulated planning/scope/sequencing principles, consulted during planning, not read top-to-bottom each session.

## Done: v1.5 release (SHIPPED 2026-06-26)

> Archived to `roadmap-archive.md` (verbatim).

## Post-v1.5 backlog (carry-forward into v1.6 planning)

- **Game Mechanics pack** — shelved, design-complete, frozen at `game-mechanics-pack-reference.md`. The full-SRD-seed decision turned it into a 12–18 session pipeline; reversible to templates-first/seed-later if the grind warrants. Reconsider as a post-v1.5 standalone effort, not necessarily bundled with v1.6.
- **Data-shapes reference doc** — still owed in product docs. Entry shape, template field shape, key field value shapes (entry-ref with relationKind, calendar-date, calendar-date-range, name-history, repeating-group, spouse decl). Prevents assumption bugs like the v1.3 tags-as-string crash. Separate deliverable, not a product edit.
- **Ephemeris Bug Audit rows** — BA-01 (trail composition), BA-02 (phase-fraction tooltip copy), BA-04 (reload-canonical) remain unrun. BA-03 N/A. Low priority; none blocking.
- **Parent-delete dangling Descended From** (Glossopoeia) — tolerated, skip-on-dead-pointer. Not blocking.
- **PATCHNOTES.txt format decision** — accumulate per-release vs replace each release. Decide before v1.6 ships so the format is consistent.
- **Concordance size-threshold variant** — the full-graph-for-small-worlds / empty-only-past-N-nodes option was declined for blanket-empty at r134. On record in case it resurfaces.
- **Deferred indefinitely:** Stemma v2 features, world-scoped custom assets (gates Scrap conlang migration), mobile UX, Ephemeris sky-from-surface view.

## v1.6 — Cartographia+ map creator (next active)

Per the long-standing plan: the full map-creation feature, ~60–100 hour build, shipped standalone with no competing headline feature. Reset the line at session start (`build_inline.py` VERSION 1.5 -> 1.6, r-counter -> r001). Planning not yet started as of the v1.5 ship.

---

=== ADDED 2026-06-28, v1.6 reshaped to three pillars; maps-promotion pulled to first; line opened ===

**v1.6 line is OPEN.** r000 (`Cartulary_v1.6_Working_r000.html`) is the shipped v1.5 code renamed to the new minor to show status (byte-identical, no r-move). `build_inline.py` `VERSION` bumped 1.5 -> 1.6 this session. Next product code edit is r001.

**v1.6 is now a three-pillar release, not the standalone Cartographia+ creator.** Full architecture and the carve-list live in the frozen `cartulary-modularization-plan.md`; the immediate build sheet is the frozen `maps-promotion-spec.md`. The pillars, in build order:

1. **Maps promotion (FIRST, r001+).** Promote Maps from a hidden built-in template to a `state.cartographia` slice. Monolith work against the shipped baseline, before modularization. Invisible to users if successful. This is the next build.
2. **Modularization.** Pulled forward from its v1.7 slot. The "monolith pain signal" flagged in the v1.7 section below tripped during the back half of Glossopoeia (the heaviest subsystem, edited in a 2 MB+ file). Carve the monolith into per-view + shared modules assembled by `build_inline.py`. Invisible if successful.
3. **Drawing editor (Cartographia+).** The map-creation feature described in the "## v1.6, Cartographia+ map creator" section below; scope and won't-have list unchanged. Built into the now-sliced, now-modular Cartographia. The only user-visible pillar.

**Sequencing.** maps-promotion -> modularization infra -> carve the map-independent modules -> build the editor -> carve Concordance + Cartographia last. Maps-promotion goes absolutely first (Drak: "get maps sorted before we do anything else") because it is the highest-uncertainty change in the release (a live-data migration severing a slice from the entry-graph); doing it against a known-good codebase isolates the risk and makes promoted maps part of the parity baseline the refactor verifies against. The editor and the promotion both touch Cartographia, and the promotion's pin-edge rewire touches Concordance, so those two modules carve last against their final shapes to avoid a re-carve. QA attribution stays at two clean levels: modularization parity (against the existing v1.3/v1.4/v1.5 sheets) vs the new Cartographia view+editor (a fresh test plan, Cartographia QA'd as one workstream).

**Maps-promotion scope (locked).** Sized as the cheap version of a promote-to-view: maps are a graph leaf with outbound-only pin edges and no inbound refs, already isolated from the general entry surfaces. Storage/index mirror Stemma (flat `state.cartographia`, no per-template grouping); the three fields render through `EntryForm` via `cartographiaMapSchema()` (the Glossopoeia pattern); the canvas is unchanged. Multiple maps behave like multiple stemmas (flat, no grouping). Explicit exclusions: no per-map import/export (deferred to the later, larger Cartographia work), no drawing, no carve, no UX redesign. Full detail in `maps-promotion-spec.md`.

**The v1.6 "next active" stub below (and the detailed "## v1.6, Cartographia+ map creator" design section) remain as authored**: the editor scope did not change, only its position in the release sequence. This block supersedes the "Planning not yet started" note in the stub.

**Still owed in v1.6, separate from the three pillars:** the in-app-help backlog (help-vs-code mismatches accumulated during the site-grounding sessions; code correct in every case). Decide whether it rides along with a pillar or gets its own pass before v1.6 ships.

=== ADDED 2026-06-29, v1.6 r001 shipped: pillar 1 (maps promotion) BUILT + browser-verified ===

**Pillar 1 (maps promotion) is done.** r000 -> r001. Built against the frozen `maps-promotion-spec.md` rev 2, in the monolith, against the shipped v1.5 baseline; **browser-verified by Drak (all green, including oldest imports with map data and time-aware pins).** Maps are now first-class records in `state.cartographia` (flat, Stemma-shaped) instead of `kind:"map"` entries. The promotion is invisible to users, which was the acceptance test. Full per-area detail in the changelog session-10 block.

**Pillar status now:**
1. Maps promotion -- **DONE (r001, browser-verified).**
2. Modularization -- **NEXT.** Reinforced this session: the r001 source crossed 2 MB (2,101,533 bytes). The promotion was net-additive (migration + registrant + routing + export slice-walks outweigh the removed `isMap` branches and the old multi-template index), so the monolith pain signal is now past threshold by byte count, not just by feel.
3. Drawing editor (Cartographia+) -- unchanged, last.

**Backlog deltas from r001:**
- **Per-map JSON import/export** -- still deferred to the later, larger Cartographia work; explicitly out of the promotion.
- **Data-shapes reference doc** -- now also needs the Cartographia record shape `{ id, name, tags:[], fields:{}, mapData:{image,pins}, updatedAt }` and the fixed map-field ids (`cart-fld-description` / `cart-fld-scope-region` / `cart-fld-notes`).
- **cartulary.world Cartographia page** -- its copy frames maps as template-backed entries; that framing is now wrong. Not owed until convenient (the in-app behavior is invisible), but flag for the post-feature site sweep alongside the editor.
- **In-app-help backlog** -- the r001 stale-string fixes cleared the map-specific lies (template-kind comment, json-schema help, the "maps are entries/templates" help prose). The rest of the help backlog stands.

**Doctrine added this batch (2026-06-29):** origin-agnostic removal of a retired system-template kind; field-id remap-by-label when literal id preservation is impossible; the canvasSlot generalization for de-coupling a feature from a shared component; the migration runtime-harness practice; invisible-promotion is net-additive.



=== ADDED 2026-06-30, v1.6 pillar 2 phase-1 underway: spine manifest + relief sizing + gathers (r002, r003) ===

**Pillar 2 (modularization) phase-1 started.** No carve yet. This session produced the architecture artifact the carves run against and did the pre-carve relocation passes. Two product cuts (r002, r003), both pure relocation, both browser-verified.

**Pillar status now:**
1. Maps promotion -- DONE (r001, browser-verified).
2. Modularization -- **IN PROGRESS (phase-1).** Spine manifest authored; boundary decisions locked; spine sized to relief; gather relocations done and verified. Build-pipeline rework + gate tooling next, then the carves.
3. Drawing editor (Cartographia+) -- unchanged, last.

**What phase-1 produced:**
- **Spine manifest** (`cartulary-spine-manifest.md`, NEW): the module map, grounded in the actual r001 source (39,336-line babel body, 419 declarations). It is the oracle both modularization gates check against, updated in the same pass as every split/combine. This is the live architecture reference; it supersedes the frozen plan's "decide at carve time" placeholders.
- **Spine sized to relief** (Drak: minimize the spine, more smaller modules beat fewer large ones for AI-assisted editing): old ~12,800-line spine reduced to a ~6,000-line core. `migrate` (5,511) became a load-on-demand companion; `HOME_SECTIONS` (1,328) became a `home-data` module; `App` (4,532) stays core with its hooks-extraction deferred to a separate risk tier.
- **Gathers resolved** (r002 + r003): five scattered modules made into contiguous decl runs so each carve is a clean slice (calendar-engine, export-layer, persistence, cartographia at r002; entry-ops folded into field-system and io-utils stood up standalone at r003). Two ownership questions closed by caller-trace: the "stemma" calendar helpers are calendar-engine, and the pre-`App` orphan block split cleanly into io-utils (own module) + entry-ops (field-system).

**Backlog deltas:**
- **App hooks-extraction** -- new deferred item. The core is ~75% `App`; shrinking it further needs a behavior-preserving refactor that the invisible-carve gate cannot verify byte-for-byte. Out of phase-1; revisit after the clean carves land and parity is established.
- **io-utils / entry-ops micro-gather** -- resolved at r003 (was surfaced and held at r002).
- **Glossopoeia-as-directory** -- a derived decision this session (not in the frozen plan's three boundary calls); vetoable before the carve reaches it.

**Doctrine added this batch (2026-06-30):** spine manifest as step-1 oracle; spine-relief sizing (companion for load-once-central functions, data-module for static content behind a sole consumer); module ownership by caller-trace; gather discipline (pure relocation to contiguous runs, normalized-diff + parse + browser, hand-verified eval-order); data-consolidation vs code-layout-consolidation.





=== ADDED 2026-06-30 (session 12, v1.6 pillar 2 phase-1: build pipeline + gate tooling landed, first three carves) ===

**Pillar 2 (modularization) infra is built and the carves have started.** The pipeline rework and the reconstitution gate landed; three shared/data modules are carved and browser-verified. Three product cuts (r004, r005, r006).

**Pillar status now:**
1. Maps promotion -- DONE (r001, browser-verified).
2. Modularization -- **IN PROGRESS.** Phase-1 infra done (pipeline assembles from a module tree; canonicalizer + reconstitution gate built and proven). Carving underway: home-data (r004), modals (r005), io-utils (r006) done. Remaining shared modules, then map-independent views, then concordance/cartographia last.
3. Drawing editor (Cartographia+) -- unchanged, last.

**What landed:**
- **Build pipeline reworked.** Source is no longer one HTML; it's `cartulary-src/shell.html` + `cartulary-src/modules/NN_name.jsx` (assembly-order prefix + module name), assembled by ordered concatenation. `build_inline.py` gained `working` / `verify` / `finals` modes; `canonicalize.py` (new) is the reconstitution-gate normal form. Frozen `reference-r003-body.jsx` is the parity anchor.
- **First three carves, all pure splits, all browser-verified.** home-data (`HOME_SECTIONS` behind `HomeView`), modals (the three destructive-op dialogs), io-utils (the four FSAA helpers). Each reassembles to r003 byte-for-byte; the carve is invisible at the byte level.

**r-counter policy changed:** one r-bump per full carve, not per HTML edit. A pure carve produces byte-identical output, so the old rule would never advance through modularization. r004 = pipeline rework + home-data; r005 = modals; r006 = io-utils.

**Backlog deltas:**
- **First-step context-completeness gate** -- not built; lower-priority until editing goes module-scoped. The end-step reconstitution gate is what the carves run against for now.
- **App hooks-extraction** -- still deferred (separate risk tier, post-clean-carves).

**Doctrine added this batch (2026-06-30, session 12):** ordered-concatenation assembly (not dependency resolution); shell + module-tree source split; one r-bump per full carve; the two gate normal forms (sequence for splits, multiset for gathers) against a frozen anchor; carve boundary discipline; prove a gate has teeth with a negative test; validate a pipeline against a real split; bare-trunk residue naming.

=== ADDED 2026-07-03 (session 13, v1.6 pillar 2: four more carves, gather-free shared set complete) ===

**Pillar 2 (modularization) progress.** Four pure-split carves (r007-r010): temporal, persistence, calendar-engine, export-layer. All browser-verified. The tree is now 13 arcs and the whole gather-free shared-module set is carved. No behavior change (pure splits, byte-identical output through r003-r010).

Pillar status unchanged in shape:
1. Maps promotion -- DONE (r001, browser-verified).
2. Modularization -- **IN PROGRESS.** Infra done. Carved: home-data (r004), modals (r005), io-utils (r006), temporal (r007), persistence (r008), calendar-engine (r009), export-layer (r010). Remaining shared modules each need a gather or relocation cut first (`builtin-templates` scattered, `field-system` two base zones, `form-engine/edit` + `template-builder` builder-component relocation, `migrate` companion tail check), then map-independent views, then concordance/cartographia last.
3. Drawing editor (Cartographia+) -- pending pillar 2.

**What changed the remaining work.** The easy carves are spent. Everything left in the shared tier needs a pure-relocation gather before it slices, so the per-carve cost goes up from here (a gather cut, then the carve, two verified steps instead of one). Not a fire, just the expected shape once the pre-gathered set is exhausted.

**Manifest hygiene note (carried into doctrine).** The section-4 ownership table had gone stale against section 10 (pre-r002 "gather on carve" flags on modules already gathered). Corrected in place this session. The lesson: adding an authoritative section does not retire a stale note elsewhere in the same file; strike the stale text where it lives.

=== ADDED 2026-07-15 (session 14, v1.6 pillar 2: two more carves, free-split set exhausted, carve path settled) ===

**Pillar 2 (modularization) progress.** Two pure-split carves (r011 template-builder, r012 migrate), both browser-verified. Both were free (no gather needed), which contradicts last session's "everything left needs a gather." Tree now 16 arcs. No behavior change (byte-identical output through r003-r012).

Pillar status unchanged in shape:
1. Maps promotion -- DONE (r001, browser-verified).
2. Modularization -- **IN PROGRESS.** Infra done. Carved: home-data (r004), modals (r005), io-utils (r006), temporal (r007), persistence (r008), calendar-engine (r009), export-layer (r010), template-builder (r011), migrate (r012). Every zero-gather target in the shared/companion tier is now spent. Remaining shared work is three gathers (form-engine display/edit as one cut, builtin-templates, field-system), then map-independent views, then concordance/cartographia last.
3. Drawing editor (Cartographia+) -- pending pillar 2.

**What changed the plan.** The remaining shared carves were mapped end-to-end this session and priced honestly:
- Two targets the manifest flagged as gather-first turned out free (template-builder, migrate). Their manifest flags were stale and have been struck at source.
- One target the manifest flagged as probably-free turned out split (form-engine/display: two members stranded in the edit block). Its "likely contiguous" note was wrong and is corrected.
- Net: three real gathers remain, not the four-plus implied before. The display/edit pair collapses to one gather that frees both modules.

**Carve path (settled).** Free splits done. Then, in order: display/edit gather -> carve display + edit; builtin-templates gather -> carve; field-system gather -> carve; map-independent views; concordance + cartographia last. Each gather rotates the parity anchor (re-freeze `reference-r0NN-body.jsx`, repoint `REFERENCE_BODY`); the display/edit gather is the first rotation since r003. Rejected the single-big-relayout shortcut: fewer anchor rotations but no bisectability if a browser check fails.

**Backlog deltas:** none new. App hooks-extraction still deferred (separate risk tier). First-step context-completeness gate still not built (lower-priority until editing goes module-scoped).

**Doctrine added this batch (2026-07-15, session 14):** manifest flags are stale until re-checked by name (a flag from an old range survives real gathers and lies in both directions -- template-builder/migrate were flagged gather-first but were free, form-engine/display was flagged free but is split); one gather can free two carves when the scattered members interleave (display stragglers in the edit block); assembly-order inversion is safe for runtime-only const-arrow callees (makeInitialState -> migrate); sequence the remaining work as gather-episodes with per-cut re-anchoring rather than one grand relayout.

=== ADDED 2026-09-05 (session 15, v1.6 pillar 2: three gathers + four carves, shared/companion tier COMPLETE) ===

**Pillar 2 (modularization) progress.** Seven r-bumps (r013-r019), all browser-verified: three gather episodes (r013 display/edit, r016 builtin-templates, r018 field-system) and four pure-split carves (r014 display, r015 edit, r017 builtin-templates, r019 field-system). **The entire shared/companion tier is now carved.** Tree is 21 arcs: 13 named modules + 8 trunk residue. No behavior change. The parity anchor rotated three times, the first rotations since r003; active anchor is `reference-r018-body.jsx`.

Pillar status:
1. Maps promotion -- DONE (r001, browser-verified).
2. Modularization -- **IN PROGRESS, shared tier done.** Infra done. All 13 shared/companion/data modules carved (r004-r019). Remaining: map-independent views, then concordance + cartographia last (after pillar 3).
3. Drawing editor (Cartographia+) -- pending pillar 2.

**What the three gathers cost, versus the estimate.** The session-14 plan called for three relocation cuts and three anchor rotations, and that held. Two surprises, neither expensive:
- The display/edit split point is `ImageFieldEditor`, not `EntryForm`. Caught before cutting; no rework.
- field-system's zone A was internally split as well as separated from zone B, so r018 was TWO relocations in one cut rather than one. Surfaced before cutting, Drak picked the placement (grid constants move up, spine ownership preserved).

**Next phase: map-independent views.** `glossopoeia/`, `ephemeris/`, `chronometric`, `linea`, `stemma`, `kalendarium`. Two things to settle BEFORE that phase starts, neither urgent:
- Contiguity is unchecked for all six. Expect most to be contiguous (views tend to be written as blocks) but that is exactly the assumption that was wrong for form-engine/display. Budget for a gather on any of them.
- `glossopoeia/` and `ephemeris/` are proposed as DIRECTORIES rather than single modules. That proposal is vetoable and should be settled before the carve, not mid-cut, since it changes the slice shape. Drak's call.

**Backlog deltas:** one new optional item, non-blocking. The r017 carve left a 42-line residue arc holding only the util wedge (`genId`, `fmtDate`, `isoNow`, `slugify`, and the two snapshot formatters). Correct as anonymous residue; a clean pure split if a named `utils` module is ever wanted. Not scheduled.

**Doctrine added this batch (2026-09-05, session 15):** byte-identity is a distinct check that catches what canonical-sequence cannot (the r014 dropped-blank); a gather's anchor freeze must wait for the browser pass; scattered-module surveys understate the work when a zone is internally split; carved-module filenames go stale as `NN` prefixes reflow, so find modules by name and sweep filename references on every doc pass.


=== ADDED 2026-09-05 (session 16, v1.6 pillar 2: r020-r024, first directory carves, gate bug fixed) ===

**Pillar 2 (modularization) progress.** Five r-bumps (r020-r024): three gather episodes (r020 ephemeris three-zone unify, r021 ephemeris sub-modules, r022 glossopoeia sub-modules) and two directory carves (r023 glossopoeia, r024 ephemeris). The first two VIEW modules are on the board, and both are real subdirectories rather than single files. Tree is 34 files, 39,335 lines. No behavior change: the two carves emit bytes identical to r022. The anchor rotated three more times; active anchor is `reference-r022-body.jsx`, the sixth.

**Pillar status now:**
1. Maps promotion -- DONE (r001, browser-verified).
2. Modularization -- **IN PROGRESS, shared tier done, view phase started.** All 13 shared/companion/data modules carved (r004-r019), plus `glossopoeia/` (r023, 5 parts) and `ephemeris/` (r024, 7 parts). Remaining map-independent views: `chronometric`, `linea`, `stemma`, `kalendarium`, all four confirmed contiguous, all four pure splits, no gathers owed anywhere in the phase. Then concordance + cartographia last, after pillar 3.
3. Drawing editor (Cartographia+) -- pending pillar 2.

**Contiguity for the entire map-independent phase is now settled**, which had been carried as an open unknown since session 15. One pass classifying every declaration in the trunk arc answered all six views at once plus the two held-for-last ones. Five were already contiguous; ephemeris was in three zones and needed a gather, then needed a second gather because its intended sub-modules were interleaved with each other.

**Gate defect found and fixed.** The reconstitution gate had been scoring its verdict from two of its three checks since r004, excluding byte-identity, which is the only one that can see a dropped blank line. It therefore reported GREEN on the exact combination the doctrine calls a RED. Nothing slipped through, but the safety net had a hole for twenty r-numbers. Fixed and re-proven at r023. See doctrine, this batch.

**Backlog deltas:**
- **In-app help / user-visible em dashes.** The em-dash audit this session counted 283 U+2014 in `17_home-data` (now `20_home-data`), which is in-app help content the user reads. Not a defect and not scheduled; recorded so the number is known if a copy pass ever happens.
- **Named `utils` module** -- unchanged, still optional, still the 43-line `02_trunk` residue arc.
- **Data-shapes reference doc** -- unchanged, still owed.
- **`/mnt/project/` re-sync** -- genuinely owed now. `build_inline.py` there is two anchor generations and one structural change behind (it names the long-retired `reference-r003-body.jsx` [stale: deliberate, describing the stale project copy] and has the flat `glob` enumeration plus the unfixed gate verdict).

**Doctrine added this batch (2026-09-05, session 16):** a printed-but-unscored gate check is worse than no check, and teeth must be re-proven after any gate or assembler change; a contiguous view says nothing about whether its sub-modules are contiguous; sub-module groupings are proposals and content overrules tidiness; boundary rule 5, doc comments can sit behind a blank line and defeat a walk-back, so read the seams before slicing; a pure split that changes no product bytes needs no browser pass but a gather always does; prefer the smaller relocation except where it costs a TDZ argument; write the assembly ordering rule down explicitly and keep exactly one assembly path; an audit that only checks the artifact is half an audit.

=== ADDED 2026-09-05 (session 16 post-turnover audit: r025 header integrity becomes the next work) ===

**The next modularization work is NOT a carve.** An audit of the r024 bundle found twelve sheared section headers across the module tree [thirteen as first counted; corrected in the second-pass block below]: headers labelling a block that lives elsewhere. Nothing behavioral. The problem is that the carve procedure treats seam lines as ground truth, and at those thirteen seams the evidence is wrong. The mechanism is live rather than inherited: the r013 gather created one of them and nothing noticed.

**r025, two parts, part 1 first.**
1. Add `header_pairs()` to `canonicalize.py` as a fourth gate invariant. Hard gate on pure splits, reported-diff on gathers. A sheared header is invisible to all three existing checks by construction.
2. A comment-only sweep gather resolving all twelve, giving the invariant a clean baseline. Ten have a determined destination; two need a decision rather than a move. [Corrected 2026-09-05 second pass: the census is twelve, not thirteen; `10_migrate:5803` was wrongly accused.]

Then the four remaining map-independent view carves. Two of them are entangled with r025. [Corrected 2026-09-05: the original wording here said chronometric "inherits" the orphan, which is backwards.] The 25-line orphaned Ephemeris header at `16_trunk` 2055-2079 sits ABOVE the chronometric span (2080-3605), so carving first leaves it in the HEAD arc and makes that arc end on line 2079, a comment, producing a third file that ends on a comment. Kalendarium carved first leaves a TWO-line trunk arc (boundary blank plus the next module's header), not one line; a one-line arc would require kalendarium to end on a blank, which rule 1 forbids.

**Pillar status is unchanged** (1 done, 2 in progress with 15 modules carved, 3 pending). r025 is a correctness pass inside pillar 2, not new scope.

**Doctrine added this batch:** a section header is a separate block and does not travel with a relocation, so every relocation must decide explicitly whether it goes; and when an audit finds N instances of a defect, build the check that would have caught the first one before fixing the N, or the count regrows.

=== ADDED 2026-09-05 (session 16 second-pass audit: r025 scope corrected) ===

**The census is twelve, not thirteen.** `10_migrate:5803` "Marked configuration" correctly heads a live `marked.use({...})` block; it read as a shear only because the census tool pairs headers with the next top-level declaration and a call expression is not one. The proposed remedy had included deleting it.

**r025 part 1 gained three specification requirements**, all of which decide the baseline count and none of which can be left to whoever writes the regex: which comment forms count as headers (the old census of 64 was itself regex drift: it required dashes on both sides at column 0 and dropped two real headers. Under one stated rule the tree holds 108 header-shaped comments, 66 of them column-0 box-drawing, and the shear census is twelve of those 66), how call-block headers are handled, and the fact that file placement is out of scope because the gate runs on the assembled body. One of the twelve, `19_trunk:878`, pairs correctly in assembled order and is a file-placement defect the invariant structurally cannot see, so part 1 cannot validate part 2's fix for that item.

**Carve spans corrected again, in the opposite direction.** Rule-1 conformant and tiling both arcs exactly: chronometric `16_trunk` 2080-3605 (1,526), linea 3606-4251 (646), stemma 4252-5661 (1,410), kalendarium `19_trunk` 1-876 (876). Residue in `16_trunk` after all three is 2,433.

**Doctrine added this batch:** a hedge in a spec document is usually a defect in disguise, so when a document hedges a number ask whether a rule already determines it; do not accuse a correct artifact during a defect sweep, because a sweep's tool defines what it can see; and state an invariant's scope limit at the same time as the invariant, since a check whose coverage gap is undocumented is read as covering everything it is named after.

=== ADDED 2026-09-06 (session 17, v1.6 pillar 2: r025 header integrity closed, r026 specced) ===

**Header integrity is closed.** r025 landed as one r-bump in two parts: the invariant first, then the sweep. Eleven sheared section headers went to the blocks they name; two new gate checks (`header pairs`, `header placement`) stop the next one accumulating. The gate now scores five conditions on a pure split and four on a gather.

**Next: r026, then the four view carves.** r026 replaces one header with two, because the block it named split across two modules at r013. It is specced in manifest section 11 with its expected signals written down in advance, and it needs the two replacement strings locked before it runs. It cannot return a green verdict from either gate mode, which is stated rather than discovered.

**Then chronometric, linea, stemma, kalendarium.** All four pure splits, all four confirmed contiguous, no gathers owed. Both prior entanglements are gone: the `16_trunk` head arc ends on code, and `19_trunk` is kalendarium end to end. Spans re-derived post-r025 and published in the handoff and manifest section 11.

**Then pillar 3, the drawing editor**, and `concordance` + `cartographia` carved last against their final shapes.

**New roadmap item, small.** Pillar 3 is entirely content edits rather than relocations or splits, and r026 is the first taste: neither `verify` nor `gather` can return a verdict on a cut that adds or changes lines on purpose. Whether that earns a third mode is a pillar-3 planning question, not an r026 one, but it should be decided before the editor work starts rather than during it.

**Deferred unchanged:** `App` hooks-extraction, the first-step context-completeness gate, a named `utils` module for the 43-line `02_trunk` residue.


=== ADDED 2026-10-19 (session 18, v1.6 pillar 2: r026-r030, map-independent phase COMPLETE; pillar 3 is next) ===

**Pillar 2's map-independent phase is closed.** r026 replaced the last sheared header with two correct ones and rotated the anchor to `reference-r026-body.jsx`. r027-r030 carved stemma, linea, chronometric, and kalendarium as pure splits against it, all byte-identical to the r026 artifact. Nineteen named modules; what remains in the trunk arcs is residue plus the two carves held for last.

**Next: pillar 3, the drawing editor (Cartographia+).** The v1 scope and the won't-have list above are still the plan. Cartographia is a single contiguous run of 758 lines at the tail of `16_trunk` (span and tiling in the handoff and manifest section 10), behind concordance and `SettingsView`; the editor builds into that run. **First decision, before any editor code lands: the verification mode for content edits.** r026 proved the point at three lines. Neither `verify` nor `gather` can return a verdict on a cut that adds or changes lines on purpose, so it was gated on a written delta table matching the `gather` report line for line, plus parse and a browser pass. A feature cannot be gated that way. The candidates are a third mode that checks what a content edit must preserve (every declaration name, every header pair, every file's rule-1 shape, the raw count outside the edited span) and reports the edited span as a diff, or dropping the parity gate for pillar 3 and leaning on parse plus browser passes the way v1.5 did. Drak's call; the trade is tooling time against the only pillar whose bugs a user would see.

**Then concordance and cartographia carve last**, against their final shapes, and pillar 2 closes. Each is a pure split today (1,028 and 758 lines); the editor will change cartographia's figures and may change the seam, so the spans get re-derived at that point rather than trusted.

**Tooling carried into pillar 3.** The source bundle is the only durable copy of the tree between sessions, and session 18 showed it can be the only durable copy within one: the sandbox was wiped between two turns, and the state came back because every cut was a script and the artifact hash said when the replay was right. Keep every change a script, re-bundle before any pause, and treat the rotation procedure's last step as the recovery check.

**Deferred unchanged:** `App` hooks-extraction, the first-step context-completeness gate, a named `utils` module for the 43-line `02_trunk` residue. **Doc debt unchanged:** the doctrine's v1.4 feature-surface section.

=== ADDED 2026-10-19 (session 19: verification mode for content edits DECIDED and BUILT; source and docs in GitHub; pillar 3 next) ===

**The open tooling question from session 18 is closed.** Drak chose the scoped-edit mode over the r026 procedure and over dropping the parity gate for pillar 3. It is built, probed (eighteen probes), and in the repository; the content-cut procedure is in the handoff. Pillar 3 can start.

**The project lives in `github.com/Drakhanas/Cartulary` (private).** Cold start is a clone; turnover is a commit; CI runs every gate on every push. The bundle zips, the turnover zips, and the Project's per-session documents are gone. Drak clones locally at `D:\Git\_Cartulary` and pushes tags from there.

**Pillar 3, the drawing editor (Cartographia+), is under way.** The v1 scope and won't-have list above are unchanged except for layers (below). The build order is the build sheet; cuts go under the edit procedure, each browser-passed and rotated with `freeze`. Expect the editor to touch `16_trunk` (cartographia), `12_trunk` (App routing and handlers), `08_export-layer` (SVG in exports), `10_migrate` (any new `mapData` shape), `24_home-data` (help), and `shell.html` (CSS); every one of those is a declared scope on the cut that touches it.

**Build sheet locked (session 19, after proposal-review): `docs/cartographia-plus-spec.md`.** Eight cuts with declared scope, the data model, the one-renderer rule, the stamp-pack sanitizer, and one recorded scope change: layers (named, ordered, show/hide, lock; nothing more) are in, overriding the v1 won't-have list above. **Cuts 1-3 landed, browser-passed 2026-10-20: the data model at r031, the SVG canvas (one tree, two serializers; image-less maps on their background; the export through the same renderer) at r032, and the drawing tools at r033 (a strip with Pin as the default tool; Select, Rect, Ellipse, Polygon, Line; palette, width, Smooth; right-click to finish; point handles on polygons and lines; the canvas picker with a warning)**, text labels, undo/redo over the whole record (pins included, overriding the sheet by decision), and the layer panel at r034, and at r035 the four built-in stamps, the frame handles (corners on rect, ellipse, and stamp; a knob on stamp and text), labels on an arc, and from the pass the canvas chrome (the resize grip to 150%, no inner scrolling unzoomed with the strip sticky, Custom size), and at r036 stamp packs (the envelope with ids namespaced by pack, the sanitizer on import with a report and again on load, the Stamps panel at the head of the index with Export per pack and Export built-ins as a pack, the grid picker, placeholders for missing stamps, the help, and the Project view no longer reading a maps-only world as empty), and at r037 the per-map download (SVG standalone with the image inlined, stamps resolved, no pins, the map font embedded; PNG at 2x capped at sixteen million pixels)**; and at r038 cut 8, the help and the site (the Cartographia help section rewritten around the editor as shipped, the stale lines elsewhere in the help fixed, the index's lead sentence, and cartulary.world's Cartographia, Import & Export, and JSON Structure panels rewritten for v1.6 under `site/`, ahead of the live v1.5 site until launch). The locked sheet's eight cuts are done. Point handles came in at r033 on Drak's review; the arc deformer at r035 on his reply to the forks; namespaced stamp ids in place of a collision modal at r036 on his.

**Scope change, 2026-10-22 (the second recorded one, after layers): raster brushes go into v1.6.** Reading the new Limitations paragraph ("no freehand brush"), Drak judged freehand with brush support "massively wanted" and, after the costs were laid out, decided: raster brushes, in this line (he wrote 1.9 first and corrected it to 1.6); **no pressure support**, not within any scope he will support currently; tip-level import of existing brush packs, `.abr` as the primary target because brush sites distribute in it (the free fantasy-map sets ship as a Photoshop ABR plus a PNG pack for Wonderdraft), PNG as the native pack format, `.gbr`/`.gih` and Procreate `.brushset` behind, tips and spacing only, dynamics never; the SVG download becomes a mixed file with raster layers and raster tips as `<image>` rather than going away (he was willing to lose it; he does not have to). Estimated at seven to eight cuts: tip import and raster stamps (two; the downloaded brush sets are mostly symbols, so this half is where they land and it leaves the one-renderer rule untouched), a `vector`/`raster` layer kind with the migration (one to two), the paint engine with Brush and Eraser and bitmap undo (two), vector freehand as a drag-drawn Line with simplification (one, optional), help and site again (one). Answered the same day, every recommendation taken: both halves in 1.6, stamps-and-import first; vector freehand in; and, by research on what the tools accept (map tools take PNG only, art apps converge on `.abr` and import tips only), importers for PNG, `.abr`, `.gbr`/`.gih`, and Procreate packs, with a PNG-zip export in the Wonderdraft layout so Cartulary is the converter in the middle. The won't-have list's first line ("Freehand brush tools") is struck for v1.6; the amendment is section 9 of the build sheet. **Landed: cut 9 at r039** (Freehand as its own tool, a drag simplified into an ordinary stroke; and from the pass a width slider, 1-32 with a field to 64, in place of the three widths) **and cut 10 at r040** (the bucket fill, Drak's ask on the r039 pass, inserted ahead of the amendment's cuts, which renumber 11-15: a Fill tool that traces the enclosed area off-screen into a `region` shape with holes, seals gaps up to ten trace pixels, and places the fill just above the painted shape under the click; four revisions on the pass, among them the trace svg's intrinsic size, without which Brave drew it blank) **and cut 11 at r041** (raster tips: a stamp may be a PNG, tinted by the Fill or placed as is, imported as a `.json` pack, PNG files, or a zip in the Wonderdraft layout with its symbols file honored, drawn once per map as a symbol with a use per placement; and from the pass, with an official Wonderdraft pack, a fix to r036's forty-character cap on stored stamp ids, which had folded 484 stamps onto two). **And cut 12 at r042** (the importers: Photoshop `.abr`, GIMP `.gbr` and `.gih`, Procreate `.brush` and `.brushset`, and a zip holding any of them, every tip landing as a stamp; a pack or the built-ins written out as a PNG zip in the Wonderdraft layout; from the pass, the wording that says where brushes import and the zip walker that takes a set's download as it is). **And cut 13 at r043** (raster layers: a layer `kind`, a raster layer one bitmap with the canvas units it covers, stored like a map image, drawn as one `<image>` in stack order so the export, the downloads, and the fill carry it; Add raster layer, Load image scaled to the canvas width and capped at 4096, Clear; the shape tools refusing on it). **And cut 14 at r044** (the paint engine: Brush and Eraser laying dabs of a built-in or imported tip along the pointer's path, composited at the stroke's opacity onto the active raster layer, a Paint layer inserted above a vector one by the first stroke, a live stroke on a canvas over the svg, storage shared with Load image with the history rewriting folder files on undo, a byte cap; and pointer events throughout the editor, so a pen or a finger draws, paints, selects, and drags). **And cut 15 at r045** (zoom and pan: a camera over the svg's viewBox, 1x to 8x, Ctrl+wheel about the pointer, a pinch, the keys and a corner bar; a Pan tool, Space, the middle button, two fingers; the wheel and the keys waiting mid-gesture; handles at screen size; the view on the same camera). **And cut 16 at r046** (editor polish: the strip as named groups in rows with the style groups dimmed rather than removed, the layout editable in an Arrange modal and kept in the app's preferences; Done and Cancel for an open draft; the picker's filter and Import, the import flow shared; one letter per tool, arrow nudging; swatch labels and a live region; the pen's eraser end; Cancel putting the folder back; a reload error fixed). Next: cut 17, help and the site, the last of the amendment. **Amended after cut 13, on Drak's ask:** seven usability findings on the editor folded into the table rather than deferred: pointer events into cut 14, zoom and pan as cut 15, an editor-polish cut 16 (a Done button, fixed strip slots, a picker filter, import from the picker, keyboard shortcuts and nudging, swatch labels, a live region), help and site moving to 17. Next: cut 14, the paint engine. The two carves still wait for pillar 3's final shape.

**Then concordance and cartographia carve last**, against their final shapes, and pillar 2 closes.

**Follow-ups opened this session, none blocking:** master `journal.txt` into `docs/` with a checker change; the `cartulary-turnover` skill package refreshed to point at `tools/turnover/`; the v1.4 patch notes and the itch README into `docs/release-notes/`; tag pushes from Drak's clone.

**Deferred unchanged:** `App` hooks-extraction, the first-step context-completeness gate, a named `utils` module for the 43-line `02_trunk` residue. **Doc debt unchanged:** the doctrine's v1.4 feature-surface section.
