# Cartulary roadmap -- Standing principles (REFERENCE)

> Carved out of `roadmap.md` (verbatim) during the session-10 docs-diet. Planning, scope, sequencing, and design principles accumulated across the project. Consulted as reference; not read each session. Append new standing principles here.

---

## Standing principles

- **Internal IDs preserved on user-facing renames.** Saved worlds load forever.
- **Defensive validation always before state touches.** Hand-edited JSONs WILL happen.
- **Load is non-destructive; save reconciles.** Asymmetric pre-feature data inherits unchanged; next save reconciles.
- **Per-feature QA after each major feature.** Parse passes are not runtime passes.
- **Mobile UX deferred indefinitely.** Cartulary is not a phone app.
- **High bar for new templates.** Three or more structured fields, OR native rendering, OR an absent domain that justifies inclusion.
- **Other Names is not universal** *(v1.3)*. Only entries with plausible in-world aliases; authorial-tracking artifacts excluded.
- **Status fields universally get Other + otherTextField** *(v1.3)*. Type fields follow the same pattern.
- **Type + Scope split when axes are orthogonal** *(v1.3)*. Plot Thread is the precedent.
- **Half-width auto-pair is universal and visibility-aware** *(v1.3)*. Type-based eligibility, adjacency-driven pairing, no flag required. Hidden / empty / secret-gated fields filtered before pairing; visible fields re-pair with their nearest visible neighbor or auto-expand to full.
- **Concordance positions persist to world JSON** *(v1.3)*. Drag-stick across reload, export, device transfer; Level 1 stability across filter toggles within session.
- **Template origin distinguishes built-in from user** *(v1.3)*. Migrations filter on origin; user templates with built-in names are protected.
- **Two invariants for date operations** *(v1.4)*. AbsoluteDay invariance for cross-calendar work; calendar-position invariance for same-calendar structural edits. The two coexist because they answer different questions. Cross-calendar ordering can shift after primary structural edits when additional calendars exist — deliberate trade-off, don't switch invariants later.
- **Sub-view zoom uses Ctrl+scroll with native handler** *(v1.4)*. React's passive wheel default blocks `preventDefault`; native `addEventListener("wheel", h, {passive: false})` is required. Both continuous (Chronometric, fractional zoom) and discrete (Vertical Timeline, year/month/day) views use the pattern.
- **Vertical Timeline grouping granularity persists in viewPrefs** *(v1.4)*. `timelineZoomLevel` is `"year" | "month" | "day"`, default `"day"`. User's grouping preference survives reload.
- **Image field ingestion supports drag / paste / picker with FSAA-or-base64 branching** *(v1.4)*. Field value is a single string — filename when dirHandle connected, data URL when not. Downstream consumers already handle both shapes.
- **Handoff procedure runs at ~60% context** *(v1.4)*. Four-file package (handoff + doctrine + roadmap + changelog) written BEFORE further code work in a context-pressured session, so the artifact captures full state with maximum fidelity.
- **Current moment is Y/M/D in primary's frame, not absoluteDay** *(v1.4)*. `state.world.currentMoment` shape is `{year, monthIndex, day} | null`. Calendar-position invariance applies — primary structural edits don't drift the displayed moment to a different Y/M/D. Consumers derive absoluteDay at read.
- **Auto-age person-likeness gate via Status options** *(v1.4)*. Template is person-like when its Status field includes "Deceased" as an option. Cleaner than name-matching; works for user-renamed character templates. Same gate also keeps `isEntryDeceased` semantics aligned with age semantics.
- **Auto-age has two display surfaces** *(v1.4)*. Inline suffix on the Lifespan field value (`(age N)` living / `(died at age N)` deceased) plus header obituary line below `entry-badge` (`Died at age N`, deceased-only). Shared `computeLifespanAge` primitive returns `{age, isDeceased, approximate, suffix}`. Surfaces reinforce rather than duplicate — suffix is on the data, obituary line is on the biography, distinct typography signals the distinction. Living-character header symmetry deferred indefinitely.
- **Map-kind templates are hidden from the Templates sidebar** *(v1.4)*. `kind: "map"` templates are accessed via Cartographia, not the sidebar Templates section. Editing reachable via Edit Template in any open map entry's header. Creation still flows through standard "+ New Template" — setting `kind: "map"` in the builder routes the new template to Cartographia.
- **View order migration uplifts prior canonical defaults** *(v1.4)*. When a user's stored `viewOrder` deep-equals any prior canonical default, replace with the current canonical so default-order changes reach existing users. Customized orders (no prior match) preserve their arrangement and still get new items spliced at their canonical position relative to neighbors. Maintain a `PRIOR_CANONICAL_VIEW_ORDERS` list whenever the default order changes.
- **"Would I maintain this for 10 years for free" filters features.** Scope discipline is structural.
- **Small default set, unlimited user extension.** Curated built-in set + JSON spec for user extension.
- **Registration is a data contract, not an API** *(v1.5)*. A class of first-class objects that lives in its own state slice instead of `state.entries` (Ephemeris bodies; ConLang entities next) is invisible to Concordance and un-targetable by entry-ref fields *because it isn't an entry*. To become first-class it registers a node-source descriptor `{id, name, color, icon, refEligible, getInstances, getColor, getEdges}` and presents as a synthetic template; registering buys both graphable-in-Concordance and ref-targetable. Core views satisfy the descriptor in code; a future pack satisfies the same descriptor by declaration once Packs grows past templates-only. Any promote-to-view state slice hits this wall and uses this seam — design it in, don't bolt Concordance support on per-view.
- **Anti-monetization is structural.** MIT-irrevocable for shipped code, single-file/local-data architecture forecloses paywall surface even if intent ever shifted. It won't.

=== ADDED 2026-06-08 — Game Mechanics seeding build ===

Game Mechanics pack is a 4-phase build (~12–18 sessions, dominated by extraction):
1. Templates (~1–2): finish 7 remaining schemas + Edition re-adds on 5 locked templates.
2. Entries-in-packs engine + generator (~1–2): pack format gains an `entries` array; seeding import path (ID-namespacing, ref-wiring, idempotent re-import, no-clobber; r082 care-level); r-bump.
3. Extraction (~7–12, long pole): per-content-type extractors from both SRD PDFs -> structured entries; data pipeline, validated in aggregate; ~1,000–1,200 entries.
4. QA (~1–2): real-world import/export of full pack; render/ref/cascade checks + automated schema conformance.

Build order: ... -> Space Opera pack -> Game Mechanics pack (4 phases above) -> registry QA pass -> ConLang core view -> Ephemeris BA rows -> cartulary.world.

=== ADDED 2026-06-09 — variant filter shipped, v2 deferred, Phase 1 status ===

**Variant filter (r087) SHIPPED** — core feature, not pack code: world-configurable axis field + all-variants flag, entry-list picker + filtering, dormant on unconfigured worlds. Built for Game Mechanics' 2014/2024 split but generic (Era / canon-tier / continuity-branch use cases work today). Phase 2 of Game Mechanics writes the config on pack install. Browser verification pending.

**DEFERRED — variant filter v2 (general variant axis):** variant as an entry-level attribute (no per-template field), the codebase's first world-scoped config slice (would partially unblock world-scoped custom assets / Scrap migration), filtering across all 8 specialty views, showWhen reading the variant, export edition-awareness. Est. ~14–22 r; the swing factor is per-view relational behavior (edges into filtered-out entries must surface diagnostically per chain-break doctrine — dim/drop-with-diagnostic/pass-through is an undecided per-view call). Wants its own release slot and a deliberate run; NOT a Game Mechanics dependency.

**Game Mechanics Phase 1 status (mid-phase):** edition model revised to decision "b" (see doctrine 2026-06-09 block; changes Phase 2/3 — seeder sets the flag instead of writing Both entries, and the Phase 4 QA gains a flag-correctness audit). The pack's authoritative design doc is `game-mechanics-pack-reference.md` (project files). 8 schemas locked + "b" amendments proposed; Species/Race proposed (subrace question open); 6 to design. Two new pre-Phase-3 decisions on the books: canonical Edition value on flagged entries; split-entry naming convention (same-name pairs are ambiguous in wiki-links/ref pickers). Scope reversibility note recorded: full-SRD seeding can still fall back to templates-first/seed-later — nothing is built against it yet.

=== ADDED 2026-06-17 — Game Mechanics shelved; v1.5 gate cleared; ConLang next ===

**Pivot.** Game Mechanics pack workstream is **shelved to post-v1.5**. It was pure design (8 locked schemas, the {2014,2024}+flag edition model, Species/Race proposal, seven open decisions) with **zero code shipped**, so shelving removed nothing from the build. Frozen at `game-mechanics-pack-reference.md` (the authoritative resumption point — start there, not the handoff, which no longer carries the detail). **Space Opera is the sole flagship pack for v1.5.** **ConLang is promoted** from a deferred pack to the next active workstream, built as a core view. Driver: the Game Mechanics SRD-retrofit work stopped being worth forcing; the Packs framework is fully validated by one pack.

**r087 blocking gate CLEARED (2026-06-17).** Three browser passes closed:
- **Space Opera — 13/13 PASS** (final re-test on r087; cleared every framework path incl. the cascade-child otherTextField and user-template ref hints).
- **Variant filter — clean** (11 tests + 3 pre-flight, all PASS; one void test struck — a test-wording error, not a code defect, covered implicitly by surviving rows).
- **Registry — full pass** (the five net-new r075–r081 behaviors; reported verbally by Drak, not sheet-filled — a known accepted gap).

Consequence: the variant filter ships in v1.5 as verified dormant core code; the "ConLang registers on an unverified registry" sequencing risk is resolved.

**Current build order:** Space Opera re-test (DONE) → registry QA (DONE) → **Glossopoeia core view (BUILD IN PROGRESS, r094 — Phonotactics next)** → Ephemeris BA rows (BA-01/02/04) → cartulary.world (last; ships full v1.5 feature guides).

**v2 backlog unchanged:** variant filter generalization (entry-level attribute, world-scoped config, all-views filtering; ~14–22 r; swing factor = per-view relational behavior for edges into hidden entries — entry filtering is NOT centralized, only the main list runs through `filteredEntries`, every specialty view reads `state.entries` directly, and that scatter is the cost). Game Mechanics pack resumes here too if it ever does.


=== ADDED 2026-06-21 — Glossopoeia core view COMPLETE; browser pass is the v1.5 gate ===

**Glossopoeia is feature-complete (r095–r104), parse-green, browser-UNVERIFIED.** All eleven workspaces shipped this session (Phonotactics r095, Morphology r096, Noun Number + Verbs r097, Pronouns r098, Syntax + Complex Structures + Lexeme reorder r099, Orthography + Corpus r100), plus a grid-cell ref-threading audit fix (r101), field tooltips on all 176 fields (r102), the in-app usage + JSON-schema docs (r103), and per-language whole-language import/export (r104). Eight node types register: ConLang, Lexeme, Phoneme, Grammatical Value, Affix, Word-Building Process, Inflection Class, Writing System.

**Build order — remaining v1.5:** **browser-verify r095–r104 (Drak; the gate)** → fix anything it surfaces → **Ephemeris BA rows** (BA-01 trail composition, BA-02 tooltip copy, BA-04 reload-canonical; BA-03 N/A) → **cartulary.world** (last; full feature guides; needs the locked feature surface). No new Glossopoeia feature work is queued — the view is done unless Drak opens a phase 2.

**"Glossopoeia phase 2" is undefined.** No phased Glossopoeia plan exists (the Phase 1–4 plan in the docs is the Game Mechanics pack's). Candidate next chunks, pulled from the annex §8 "Deferred / parked" and presented to Drak 2026-06-21 (none picked): (1) **visual script assets** — glyph charts + glyph-image/font support for Orthography, gates the Scrap migration, drags in the world-scoped asset subsystem (partially unblocked by variant-filter v2); (2) **diachronics / sound-change execution** — an engine that runs the phonological rules currently stored as data, shared-deferred with the sound-change-over-time machinery; (3) **structured root-and-pattern** — promote it from a Word-Building Process method to a first-class type. Limits cleanup (not features): cross-type Concordance edges undrawn; grid ref cells unfiltered and their cross-boundary refs not relinked on import; per-language specs (Syllable Structure / Stress / Phrase Order / Sentence Marking / Relativization) are duplicable add-many lists.

**Import/export note:** per-language export/import shipped (r104, data-logic Node-verified). World-level JSON export already carries all languages; the new path is single-language portability between worlds, with fresh ids, name-based relink of cross-boundary references, and non-destructive always-new import.


=== ADDED 2026-06-22 — r106–r109 verified (gate closed); Phase 2 harvest sequencing; r110 phonotactic validation locked ===

**r106–r109 browser-verified.** The v1.5 verify gate — open since "browser-verify r095–r104" and re-stated for r106–r109 — is now **fully closed through r109**. Drak loaded the full Ethlinde whole-language file through the r104 per-language import; that one act re-exercised the import path and put r106 (Word Pieces), r107 (the IPA-flagged fields), r108 (list filter + subtitles), and r109's syllabifier on dense real data. The syllabifier readout was confirmed (`ae.θi.ran`, AUTO) — the one item r109 had shipped as engine-tested-only. No HTML changed; r109 stands as the working build.

**Phase 2 sequencing — harvest first.** Within the locked all-in-one direction, the first move is the **word generator + phonotactic validation** pair, ahead of the IPA rule engine. r109 already paid for the syllabifier substrate both features ride; they need nothing else built first; they serve the namer (Drak's wife); and validation makes the syllabifier honest about legal clusters in the same stroke. Not chosen (Drak: "dealer's choice... as long as the end result is right"): the rendering layer (zero-dependency, could jump the queue), the IPA rule engine (opens a fresh substrate before banking the last one), the Tier-1 hygiene items. The pair shares one new piece of logic — a "does this word obey the language's sound rules" check; validation runs it on save, the generator runs it backward to filter candidates.

**r110 — phonotactic validation: design LOCKED, build STARTED, not confirmed shipped.** Check engine + on-save warning. No schema change (Syllable Structure already holds the checkable numbers; Phonotactic Constraints hold polarity/position/pattern; the syllabifier already produces the split the checks test). Rulings: **a1** warn on prohibited matches + syllable-shape violations, treat permitted records as documentary only (a lone permitted record isn't a closed whitelist); **b2** act on machine-readable sound-sequence patterns, mark the rest "not auto-checked"; **c1** inline warning under the Syllables line in the Lexicon, recomputed live, warn-never-block-never-auto-edit; **+ coda check** against Max Coda, closing r109's count-only gap (the syllabifier caps the onset only). The source transcript ends at an architecture step with no parse-green or staging captured — confirm before trusting r110 as shipped, and do not assume the r-counter moved past r109.

**r111 — word generator (next).** The same check run backward: sample passing words, weight by existing sound frequency, drop into the dictionary. Design calls deferred until r110 settles.

**Build order: r110 (finish + verify) → r111 → rest of Phase 2 (rendering layer, IPA rule engine, the other tier features) → Ephemeris BA rows (BA-01/02/04) → cartulary.world (last; full feature guides; needs the locked surface).**


=== ADDED 2026-06-22 (later) — phonotactic validator shipped (r110–r111); generator is now r112 ===

**The validator took two builds, so the word generator (called r111 in the block above) is now r112.** r110 shipped the phonotactic check + the Lexicon warning UI (parse-green, Node-tested, staged). Loaded against the Ethlinde import it showed every word "not auto-checked"; the cause was a build-time miss in the import (the prohibited constraints kept their real data in the Phonemes link and used Pattern as prose, so the sequence-matcher had nothing to read). **r111** fixed the check to read the **Phonemes link as set-membership** (order: link → Pattern-as-sequence → not-auto-checked) and added a closed-select **Applies When** field on the Phonotactic Constraint ("Anywhere at this position" / "Only in a cluster," shown only on Onset/Coda, no migration) — chosen over keying on the word "cluster" in the description, which would only work for one language's phrasing. Tested against the real Ethlinde file (every existing word passes; stop/glide/h in a coda warn; velar cluster warns; lone velar clean; not-auto-checked line gone) and **Drak browser-confirmed**. Canonical `Ethlinde.conlang.json` re-issued with the cluster flag pre-set (does not retro-patch an already-loaded world). r-counter now **r111**.

**Build order: r112 word generator (next, design calls up first) → rest of Phase 2 (rendering layer, IPA rule engine, the other tier features) → Ephemeris BA rows (BA-01/02/04) → cartulary.world.** Doc-debt: the annex `glossopoeia-design-handover.md` does not yet carry the r111 Applies When field.


=== ADDED 2026-06-22 (still later) — r112 ships generator + sonority syllabifier; rendering layer is r113 ===

**r112 shipped two coupled builds.** The word generator (the r111 check run backward, a review-list panel in the Lexicon, weighted by lexicon frequency, deduped within the language) needed a syllabifier fix to produce clean output, so they shipped together. The generator's first pass scored clean against the check but emitted illegal onset clusters, because the legal-cluster rules are Permitted constraints (a1 documentary, unenforced) and the r109 syllabifier had been over-pulling consonants into invented onsets all along (`ranfir`→`ra.nfir`). Drak chose to fix the cause rather than patch around it ("it might be a larger build, but 3 is the correct one").

**The syllabifier was reopened and replaced.** The r109 count rule ("coda held only at a seam") became sonority-based maximal onset: keep the largest rising-sonority run as the onset, drop the rest into the coda, sonority read from each Phoneme's Manner. Prototyped spike-first before the verified function changed (r109 spikes preserved, 114/599 Ethlinde splits corrected, the attested onset set collapsing from ~60 junk clusters to ~16 real ones). Generator then runs 40/40 clean. Effect on loaded worlds: 114/599 Ethlinde words display a different split. Both parse-green, Node-validated against the real data, browser-confirmed.

**Known limits:** sonority is a general principle, not the language's exact cluster set, so a rising cluster the language forbids (`nr`, `nw`) can still appear; pinning to the exact set means reading the Permitted onset-cluster rule (the deferred exact-cluster refinement). Generator dedup is on pronunciation, within the active language, at generate time.

**r113 — rendering layer (next, design-locked a/a, build not started).** Whole-language reference document (phonology, morphology with paradigm tables, pronouns, syntax, complex structures, orthography, lexicon as a dictionary, corpus as interlinear glosses), both Markdown and HTML. A new builder: the existing exporters walk `state.entries`, not the Glossopoeia slice. Picked over the exact-cluster refinement and the IPA rule engine because it's the documentation payoff (today the only output from a finished language is a JSON dump) and has no substrate dependency.

**Build order: r113 rendering layer → IPA rule engine + remaining tier features → Ephemeris BA rows (BA-01/02/04) → cartulary.world.** Annex doc-debt: `glossopoeia-design-handover.md` lacks the r111 Applies When field and still describes the r109 syllabifier rule.


=== ADDED 2026-06-22 (r113–r114) — grammar export shipped + themed; IPA rule engine next ===

**r113 — grammar/dictionary export.** The rendering layer, built. Two buttons by the language selector emit a whole-language reference document in Markdown and HTML: phonology (inventory table, syllable structure, stress, constraints, rules), morphology with inflection-class tables, pronouns, syntax, complex structures, orthography, the lexicon as a formatted dictionary, the corpus as aligned interlinears. A new builder walking the 21 Glossopoeia arrays (the existing exporters walk `state.entries`), reusing the field-render and grid helpers. Functional-tested against the full Ethlinde data (78KB md, 218KB html) before insertion. Limits: plain-but-readable, not typeset (values and constraints are definition lists, not compact tables); inheritance not resolved (a `varietyOf` child shows only its own records).

**r114 — grammar export themed.** The first cut exported black-on-white. Fixed to reuse the entry/world export's theme path (`extractThemeVars()` into a var-driven stylesheet), so the document carries the live theme (default gold on near-black) and print flips to light. Confirmed.

**r115 — IPA rule engine (next, design-locked, build not started).** Runs the Phonological Rule records in order against a phoneme string; first payoff allophony, later the diachronics fork. A rule's own Input → Output / Environment fields are the executable spec (no scavenging, unlike the constraints). Environment uses slot notation (`_ # V C ∅` + literal IPA), chosen over a dropdown builder. Rules apply in Order (feeding/bleeding); output is a computed surface line on each Lexicon word; a toggle shows which rules fired. Scope: regular sound→sound or sound→∅ rewrites in a sound/V/C/# context. Validated against Gutter Elf's five (three executable, two — stress-keyed vowel reduction and word-truncation clipping — stay documentary). This partly reverses the design-phase "rules are documentary" stance, scoped to what the notation can run.

**Build order: r115 IPA rule engine → hygiene three (filtered grid pickers, singleton enforcement, inline paradigm readouts) → morpheme matcher / auto-paradigms / diachronics → Ephemeris BA rows (BA-01/02/04) → cartulary.world.** Annex doc-debt still open: the r111 Applies When field and the r112 syllabifier rule, plus the r115 notation once it ships.


=== ADDED 2026-06-22 (r115–r117) — IPA rule engine + Gutter Elf rebuild; cleanup batch; auto-paradigms in flight ===

**r115 — IPA rule engine.** `glossApplyRules` runs a language's Phonological Rules in Order against a word's phonemic string, each rewriting before the next so feeding works (keθare → ketare → ketar). A surface line with a fired-rules toggle shows on each Lexicon word that a rule changes. Environment in slot notation (`_ # V C ∅` + literal IPA). Node-validated against the real Gutter Elf rules. Scope: regular sound→sound or sound→∅ rewrites only; vowel reduction (stress-keyed) and clipping (lexical) stay documentary; insertion rules not yet. Lexicon-only for now (not in the grammar export).

**Gutter Elf rebuilt to 177 records (data artifact, r115 stands).** The import had zero phonemes (a `varietyOf` is self-contained after import, so it carries no inventory and the phonology tools do nothing on it) and prose rules. Rebuild copied Ethlinde's inventory plus /p/ in and converted the executable rules to notation. Two open decisions: apocope breadth (broad vs e/a/o only), and a general parent-inventory fallback for varieties (a code change, worth it only with more sociolects).

**r116 — cleanup batch (the three phase-two known-limits items).** Inline paradigm tables in Verbs and Noun Number (read-only endings grids under each class name); the Corpus interlinear picker scoped to lexemes (via a `cellRefTemplatesId` field flag; cross-language, not active-language-only, which is deferred); singleton enforcement (the New button hides once a per-language spec exists). The known-limits list is clear.

**r117 — auto-paradigms (in flight).** Generate a word's full inflection table from its class's endings grid (stem + ending; stem-alternation cells stay documentary; Irregular Forms override by label; shown in the Lexicon, export deferred). Builder validated against the real data (428 lexemes carry a class); staging at the cutoff, not confirmed shipped.

**Build order: r117 auto-paradigms → morpheme matcher / assisted glossing → diachronics apex (XL, unblocked by r115, wants a deliberate start) → Ephemeris BA rows (BA-01/02/04) → cartulary.world.** Annex doc-debt now three items: the r111 Applies When field, the r112 syllabifier rule, the r115 rule notation.


=== ADDED 2026-06-22 (r117–r118) — auto-paradigms confirmed; matcher shipped; apex is all that's left in Glossopoeia ===

**r117 — auto-paradigms (confirmed).** A word with an inflection class set shows its generated paradigm in the Lexicon: stem + ending, Irregular Forms overriding in the accent color, stem-alternation cells documentary in dim italic. Drak confirmed ("confirmed good").

**r118 — morpheme matcher / assisted glossing.** A "Gloss a sentence" panel atop the Corpus workspace creates a pre-filled Word / Parts / Gloss Example. Per-word fallback: prior gloss in the corpus (the corpus is its own memory) → whole-word lexicon match → stem+ending guess → blank. The guess is unreliable on fusional words by design; the value is fix-once. Staged, Node-tested across all four tiers, browser pass open. Known mismatch: the existing Gutter Elf corpus is two-tier (Form / Gloss), the matcher writes three.

**The apex is next, and it's the last Glossopoeia build.** Diachronics: fork a parent language, run ordered sound changes across its lexicon via the r115 engine, produce a child language in the same world with daughter forms, cognate and source-word links, and the family tree. XL, multi-session, design pass before code. Drak deferred it to a fresh chat. After it, Glossopoeia Phase 2 is done.

**Build order: browser-verify r118–r121 → optional apex polish → Ephemeris BA rows (BA-01/02/04) → cartulary.world.** Open: the two Gutter Elf decisions (apocope breadth, parent-inventory fallback). Annex is current through r121 (regenerated this session: the four prior doc-debt items closed, plus the Diachronic flag, the two Descended From fields, §4.19–4.20, §8).


=== ADDED 2026-06-23 (r119–r121) — diachronics apex shipped (MVP); browser pass + r118 still open ===

**The apex is built.** Designed (propose/reorder/lock: seven decisions + the flag-vs-entity and single-vs-multi calls) and built across three slices in one session, all parse-green and Node-tested, none browser-verified. Locked picks: a separate engine variant taking explicit args (over the child's-rules-as-engine route, which would have shown historical changes as live allophony forever); lexicon-plus-inventory fork scope (over a full clone or a lean child); a new **Descended From** field on Lexeme and ConLang (over overloading Source Word); ancestor→descendant link only, no auto-cognate (cognates are sibling links, not ancestor-descendant — the earlier "auto-link parent and child as cognates" idea was dropped as wrong); a **Diachronic** flag on the existing Phonological Rule schema (over a separate Sound Change entity / 22nd slice array); best-effort romanized daughter headwords; run-what-runs with unrunnable changes flagged; review-first diff before commit.

- **r119 — engine split + Diachronic flag.** `glossApplyRules` split into a core `glossRunRules(pron, rules, phonemes)` (explicit args, no langId coupling) plus a wrapper that filters out Diachronic-flagged rules, so the synchronic surface-form readout never runs a historical change. New `Diachronic` closed-select on Phonological Rule ({Synchronic, Diachronic}, blank = synchronic, no migration). Node 10/10.
- **r120 — fork clone + descent links.** New `Descended From` on ConLang (single, vs the Variety Of dialect hook) and Lexeme (multi, vs Source Word/Derived From/Cognates); both `getEdges` emit "descended from" so the family tree and word ancestry draw in Concordance via the existing intra-type machinery. `glossForkLanguage` clones a parent's lexemes + phonemes at fresh ids into a new in-world ConLang, sets the ancestry links (child Descended From -> parent; each daughter word -> its parent etymon, set after the remap), repoints internal word links to the child copies, passes third-language refs through, clears the parent-specific container fields and the copied words' morphology refs. Native-prompt "Fork" button. Node 31/31.
- **r121 — run + review diff.** `glossDeriveDaughters` runs the child's Diachronic rules over each parent etymon's pronunciation via `glossRunRules` (parent inventory as input), `glossRomanize` maps the surface back to a headword (symbol fallback; non-phoneme sounds flagged), `glossApplyDaughters` writes the daughter pronunciations + headwords. Always derives from the stored parent form, so re-running never compounds. "Run sound changes" button (shown only for a language with a Descended From parent) opens a review modal (counts, unrunnable-changes notice, not-derived notice, parent->daughter list, Apply/Cancel). Node 18/18, reproducing `keθare -> ketar` and `moni -> mon`.

**Build order: browser-verify r118 (matcher) and r119–r121 (apex) → optional apex polish → Ephemeris BA rows (BA-01/02/04) → cartulary.world.** The r121 regression target is reproducing the hand-built Gutter Elf daughter forms by forking Ethlinde with the Gutter Elf changes authored as Diachronic rules. Live apex limits (by design / deferred): child keeps the parent's full inventory (eliminated sounds unused until pruned); re-run overwrites manual daughter-form edits; merger words (multi parent) not derived; grammar not copied; romanization-break headwords flagged. Optional polish: inventory auto-prune, per-word diff exclusion, stem-level paradigms, tighten Source Word's help ("older or foreign" now overlaps Descended From). The two Gutter Elf decisions (apocope breadth, parent-inventory fallback) remain open and unchanged.
=== ADDED 2026-06-23 (later) — apex browser pass; r121 render crash; r122 fix; Phase 2 verified ===

The r118–r121 browser pass ran. r118, r119, r120 each came back clean in-browser. **r121 loaded to a black screen** (Glossopoeia crashed on mount, fully unusable). Parse gate had been green throughout, and the Node harness reported 18/18 on the apex functions, but neither sees a render. Cause: a ternary in GlossopoeiaView's main render had its opener deleted during the r119–r121 edit run (the Fork button and run modal were inserted just above it), so the placeholder div, a dangling `) : (`, and the nav+workspace body sat as loose adjacent children of the outer div. Babel compiled it (balanced at file level); React threw on mount.

**r122 — fix Glossopoeia render crash.** Restored the one missing ternary opener `{(!activeLang && !isUnassigned) ? (`. One line. AST-diffed (broken r121: 8 children / 66 ternaries on the outer div; r122: 5 children / 67, zero SequenceExpressions either way), then browser-confirmed. The apex pass completed clean on r122: fork + descent edges, run + review diff, and the Gutter Elf regression target (forking Ethlinde with the Gutter Elf changes as Diachronic rules reproduced `keθare → ketar`, `moni → mon`). Consistency caveat carried forward: the match proves the engine runs the authored rules consistently and idempotently, not that the linguistics is right against the source (the hand-built file and the authored rules share the same apocope-breadth assumption).

Process lesson, narrow: parse-green is not working (existing doctrine), and now Node-green is not rendering. A slice that changes JSX structure has to be loaded in a browser before handover; the parse gate and the Node suite together don't cover mount.

**Current state: build r122, browser-verified. Glossopoeia Phase 2 complete and verified through the apex.** Remaining v1.5: optional apex polish (none blocking, unscheduled) → Ephemeris BA rows (BA-01/02/04) → cartulary.world. Two Gutter Elf decisions were still open at this point (apocope breadth, parent-inventory fallback); both are resolved in the (decisions) block below. Handoff, annex, and changelog are current through r122; this block brings the roadmap to match.

=== ADDED 2026-06-23 (decisions) — both Gutter Elf §9 calls resolved ===

**Apocope breadth: narrowed to {e, a}.** The broad `V → ∅ / _ #` record in `Gutter_Elf.conlang.json` is replaced by two records, `e → ∅ / _ #` and `a → ∅ / _ #` (order 4). Two records, not a one-field edit: the rule Input takes one sound or a V/C class, never a vowel subset, so a narrow set needs one record per vowel. {e, a} rather than {e, a, o} follows the rule's own note ("especially /e/ and /a/"). Verified safe before the edit against both data files: an orphan scan found zero hand-built Gutter Elf forms that depend on broad dropping a final i/u/o, so the apex regression still reproduces the daughter set; the gloss-matched i/u-strip scan was also zero. Under the narrow rules, 10 of 126 GE words change (was 15 under broad; the 5 i-final words now keep their vowel). Record count 177 → 178, rule records 6 → 7 (5 executable, 2 documentary). Data-file edit, no r-bump.

**Parent-inventory fallback: declined.** The per-file inventory copy stands. Making the four phonology functions walk a parent at runtime would reverse the self-contained-variety rule and make a child's output depend on the parent staying unchanged. The future path for hand-authored varieties is a one-shot copy-parent-inventory action that produces a self-contained child, not live fallback. Revisit only if hand-authored varieties become common. No code change.

§9 is now empty. Handoff, annex, changelog, doctrine, roadmap, and the phase-two doc were all brought current in this same pass.

=== ADDED 2026-06-23 (deferred) — CSV/Swadesh import scoped and deferred ===

CSV lexicon import and a Swadesh starter list, discussed and deferred. They share the "import" label but are two features with different value; keep them separate.

CSV import is the one with stakes: the only backlog item that lets someone else's existing lexicon (a spreadsheet, a Vulgarlang CSV export, a massaged PolyGlot dump) enter Cartulary without hand entry. Today the only bulk path is a hand-built `.conlang.json`, which is not a user-facing door. Scope when built: bulk-load words into the active language, mapping CSV columns onto name (headword), pronunciation, part of speech, and the first sense (gloss + definition); the relational Lexeme fields (inflection class, cognates, word pieces, descent links) stay out of a flat file. Build the column-MAPPING version, NOT a fixed-header format. The fixed-header version isn't worth doing: it forces the user to reformat before importing, which defeats the point of a door. Follow the portability rule: only ADD, never merge (an optional skip-existing-headword toggle is a cheap extra). Aim the mapping so a Vulgarlang CSV lines up (Vulgarlang exports a CSV dictionary) without hardcoding its columns. Implementation note: no CSV parser is bundled and none should be; write a small correct inline parser (~40 lines, quoted fields + escaped quotes). A naive split on commas breaks the first time a definition contains a comma, so the parser is where the test pass goes. Optional pair, only if the round-trip is wanted: a matching CSV export of the lexicon (the current grammar/dictionary export is .md/.html, not re-importable).

Swadesh starter is the weaker half: seed the Lexicon with the ~100/207 basic-meaning concepts as word slots (gloss pre-filled, headword blank with a bracketed-gloss placeholder name) so a from-scratch builder fills in their word per concept. Useful to new conlangers; little value to the users here (Ethlinde is already 599 words; the book naming is in an existing setting). Treat it as a separate optional follow-on, or skip. Do NOT co-build it with CSV import. "While we're in the import code" is how one focused build becomes two half-built ones.

Priority when revisited: CSV import with the mapping step, first and on its own. It's the single legibility concession that lets other people's work walk into the niche stack. Swadesh after, or never.

=== ADDED 2026-06-23 (later) — r123-r125: apex polish #1/#4 shipped, #2/#3 declined; delete cascade; per-calendar date format ===

**r123 — unused-sound prune + phoneme-delete ref scrub + Source Word help (apex polish #1, #4). Browser-verified.** A "Remove unused sounds" action in Phonology → Inventory and an "also remove the N unused" checkbox in the Run-sound-changes diff clear sounds a language no longer uses (in no word's pronunciation, named by no constraint or active rule; a sound named only by the Diachronic rule that killed it is prunable). Deleting a phoneme now scrubs its dead references from constraints/rules (closes a pre-existing leak). Source Word help reworded to point at Descended From. Drak ran all four test paths clean.

**r124 — delete-language cascade (bug fix). Browser-verified.** Deleting a language (or a fork) used to leave its words/sounds/rules orphaned as "Unassigned." Delete now wipes every per-language array for that language and scrubs surviving languages' phoneme refs. Mirror case left open: deleting a PARENT dangles children's Descended From (non-blocking).

**r125 — per-calendar date format + single-formatter consolidation. Browser-verified.** Per-month editable abbreviation (up to 3 chars, case preserved). Per-calendar `dateFormat` with five presets (default `3 January, 2026` = unchanged; `03 JAN 2026`; `3 JAN 2026`; `January 3, 2026`; `2026 JAN 03`). All date rendering routed through one formatter that honors the pick; the second formatter `formatDateGedcom` retired and its six callers repointed (on the default preset those six shift from year-first abbreviated to day-first natural — the only default-render change). The two Kalendarium grid headers and the compact timeline label now read the abbreviation field. Format is per-calendar (multi-calendar worlds differ, travels with import/export). Presets, not a custom format string.

**Apex polish #2 and #3 declined on scope.** #2 (per-word run exclusion) guards a workflow not in use (fix-the-rule-and-re-run, not hand-finish daughter words). #3 (stem-level paradigms) needs a real morphological model; the inflection-class grid + Irregular Forms override already cover "fix the wrong cell," and the posture for generated linguistic output is good-enough-override-when-wrong. Both push Cartulary past its worldbuilding remit into lexical-software territory; the apex stays the far edge. Recorded in doctrine (2026-06-23 later block). Apex-polish bucket now empty.

**Build order from here: Ephemeris BA rows (BA-01/02/04) -> cartulary.world.** CSV/Swadesh deferred-with-plan (2026-06-23 (deferred) block). Optional/non-blocking: parent-delete dangling-etymon scrub; the other Tier 1 items (Concordance cross-type edges, romanization→IPA, lexicon statistics); the four stale "Celestial Body" no-op comments.

=== ADDED 2026-06-23 (later still) — Ephemeris bug audit closed; House/Dynasty template added (r126-r128) ===

**Ephemeris Bug Audit fully closed.** BA-01 (trail composition), BA-02 (phase-fraction tooltip copy), BA-04 (reload-canonical) browser-verified against Dul Pantra; all pass. BA-03 (ω guard) was N/A (no UI path). No code change — the r052 fixes were confirmed intact at r125, including that the r125 date-formatter consolidation did not regress the Ephemeris date surfaces (`formatDateGedcom` fully retired, zero surviving calls). The audit started at r052 is done.

**House / Dynasty / Clan / Bloodline built-in template (r126; browser-unverified).** 23rd built-in, a kin-group distinct from Faction (org). The defensible line: Faction's axis is org-structure, a House's is lineage plus single-person kinship roles (Founder, Current Head) plus a kin set (Members), with a Descended From / Cadet Of self-ref that is bloodline cadency rather than org-subordination. Seat and Sigil overlap Faction's Headquarters / Symbol and were not the justification. Render value is the entry graph (Linea hub + Concordance backlinks + members already in the family tree), NOT Stemma (which is hand-built). Adds a multi `House / Kin-group` ref to Character (r127 widened it from single so a character can hold House + Magical Line at once). Field `Dynasty Span` renamed to `Active Span` at r128 (with a FIELD_RENAMES guard against a duplicate in any world that loaded r126/r127). Migration is free: existing `seededBuiltins` + `runFieldAddPass` handle both the template and the Character field.

**Build order from here: cartulary.world (the last v1.5 item).** It ships full feature guides and now must cover the House template, so the surface should be treated as locked at r128 pending the House browser pass. Optional/non-blocking, unchanged: parent-delete dangling-etymon scrub; CSV/Swadesh (deferred-with-plan); Concordance cross-type edges; romanization→IPA; lexicon statistics; the four stale "Celestial Body" no-op comments; and now the two stale GEDCOM comments in Observe (~33309, ~34297).

=== ADDED 2026-06-24 — v1.5 release builds cut; cartulary.world started; next code line is v1.6 ===

**v1.5 is code-complete; release builds cut (r129).** A pre-cut audit caught the HTML-export generator still stamping v1.4 (two literals: the `generator` meta tag and the export footer); bumped both to v1.5 at **r129** (export-version-stamp-bump), then cut the dual-build from r129: `Cartulary_v1.5.html` (precompiled production, JSX -> createElement, no Babel runtime) and `Cartulary_v1.5_Readable.html` (JSX-preserved + Babel-standalone runtime). Both fully offline, validator-green, fonts inlined. Build-time: the precompile ran through the uploaded `@babel/standalone` (bundles preset-react) because `@babel/core`/`@babel/preset-react` weren't in the tarball set — identical classic-runtime output, fully offline, project `compile_jsx.js` untouched. License-preamble version deltas (d3 7.8.5->7.9.0, babel-standalone 7.23.5->7.29.4) left as-is per Drak. r126-r128 (House template, Character multi House ref, Active Span rename) were browser-verified by Drak this session. **Owed before the itch upload: browser smoke of the finals** (the precompiled build and the standalone-compile path are unseen on screen).

**cartulary.world started (Pass 1 of 6).** Separate artifact from the tool; does NOT move the r-counter; runs independent of the version line (can span a release boundary). Locked: one self-contained HTML per page; full hand-authored guide coverage (NOT reusing the in-app 34-chapter manual's wording — that manual is a fact-check reference only); Gilt hero -> parchment body; site inherits the product palette + fonts. The hero/landing is split into `index.html` (Gilt splash doorway: wordmark + rotating creation-myth tagline + Enter) clicking into `helloworld.html` (parchment docs). Pass 1 = shell + What it is / How it's built (incl. Level-4 AI disclosure + anti-monetization-by-construction) / Get it / Getting started / Core concepts. Passes 2-6 pending: templates+fields; calendars+exports+modes; the views; Glossopoeia; Ephemeris + colophon + QA. Open: site voice (1st-person vs neutral), the "soon" nav stubs, itch free-vs-PWYW wording, mobile hover gap.

**Version line: next code work is v1.6.** The v1.5 r-counter is retired at r129. Per the reset-on-VERSION-bump rule, the next product code edit opens **v1.6**: working filename `Cartulary_v1.6_Working_r001_(descriptor).html`, r-counter restarting at **r001**, and the `VERSION` constant in `build_inline.py` bumps `1.5` -> `1.6` at the first v1.6 release cut. Per the version-theme note at the top of this file, v1.6 was already slated for the **Cartographia+ map-creator** feature; confirm scope at v1.6 kickoff. cartulary.world continues independent of this line.

`/mnt/project/` re-sync still owed (stale at r122; the uploaded docs are now current at r129).


=== ADDED 2026-06-24 (later session) — r130 pre-ship Ephemeris fix; v1.5 finals re-cut; cartulary.world Pass 1 redesigned ===

**Pre-ship bug reopened the v1.5 line at r130.** During the owed finals browser-smoke, the Ephemeris Astronomical Body editor was found rendering its Tags block at the bottom in both edit and read-only modes, where every other surface (the shared EntryForm, the standard entry-view) puts tags directly under the name. Fixed at **r130** (Tags moved to first position, both modes), browser-verified, and the v1.5 dual-build was **RE-CUT from r130** (the r129 finals are superseded). Ruling: a pre-ship bug caught after the cut reopens the cut version line rather than deferring to the next minor — the r-counter advanced within v1.5 (r129 -> r130) and the finals re-cut. Owed before the itch upload: browser smoke of the finals themselves.

**cartulary.world Pass 1 redesigned (still non-product, still no r-counter).** The splash and docs pages were unified to a single dark-Gilt scheme and the docs nav reworked to an An-lana-style sticky top bar with section dropdowns (replacing the sidebar TOC), plus hamburger + accordion on mobile. The two-file static model was kept (not the hash-routed SPA the An-lana reference uses); fonts stay inlined and there are 0 external URLs. Palette (dark) and structure (static two-file) are applied but await Drak's after-seeing confirmation; the tagline's click-affordance underline was removed from the splash. Passes 2-6 still pending.

**Version line unchanged in direction: next code work is v1.6.** The v1.5 r-counter is now retired at **r130**. v1.6 opens at **r001** (Cartographia+ map-creator per the version-theme note at the top of this file; confirm scope at kickoff). `/mnt/project/` re-sync still owed (uploaded docs now current at r130).


=== ADDED 2026-06-24 (close) — site palette locked, nav open ===

cartulary.world palette LOCKED to the single dark-Gilt scheme (splash + docs); the Gilt-hero/parchment-body two-tone is retired. Nav approach remains OPEN — Drak will direct it next pass (rides with static-two-file vs full-siteapp). No other roadmap change.


=== ADDED 2026-06-25 — cartulary.world Pass 1 hardened + World settings live; 11 tile pages remain ===

cartulary.world advanced (non-product, no r-counter). The docs shell is hardened: a 15-tile launchpad, a client-side swap router (with `data-route` slugs pre-declared for a future siteapp), the page widened to 72rem with prose capped at 42rem, the hero removed, the nav rebuilt to flat items plus Views/Timelines dropdowns, a back-to-top floater, the type scale bumped, and header color treatment B (h2 gold, h3 dim gold) applied site-wide. Both files were em-dash-purged and the voice locked to **Model B** (first-person intros, second-person steps), authored under the standing writing rules.

**World settings is the first finished content page** (Pass 2 start), wired live with its section order mirroring the in-app panel for findability (Appearance / World / Calendar / Images / Access / Save File / Reminders / Danger Zone). **Build order from here: the 11 remaining tile destinations** — Templates, Fields, the seven Views pages (Linea / Stemma / Kalendarium / Ephemeris / Glossopoeia / Cartographia / Concordance), the two Timelines pages (Vertical / Chronometric) — each Model B, section order mirroring its in-app panel, then a colophon + cross-link/QA sweep. The static-two-file model stands; the siteapp conversion remains deferred (the swap-router groundwork makes it a route-table add if it is ever chosen). Product line unchanged: v1.5 sits at r130 with the finals smoke owed; next code line is v1.6.

=== ADDED 2026-06-25 (continued) -- cartulary.world Pass 2: five reference pages live; timelines/JSON-Structure shell change; 6 tiles remain ===

cartulary.world advanced (non-product, no r-counter). Five reference pages authored and wired LIVE: **Templates, Fields, Linea, Stemma, Concordance**, joining World settings and the three intro panels (9 LIVE routes total). Each grounded by reading the actual r130 component, not just the in-app help -- the help proved incomplete on several views, and the gaps are logged as a v1.6 product backlog item (below).

**Shell change.** The two Timeline tiles (Vertical / Chronometric) merged into one **Timelines** tile; the freed launchpad slot became a new **JSON Structure** tile (still 15 tiles). The nav Timelines dropdown collapsed to a flat item; a flat JSON Structure item was added. Routes `timeline-vertical` / `timeline-chronometric` retired → `timelines`, `json-structure`.

**Corrections (fix-on-find, retroactive).** The "no undo" overstatement was fixed on Templates (Delete copy) and World settings (new Version History section between Reminders and Danger Zone; Reminders softened; Danger Zone corrected). The Stemma tile tagline was fixed from "Hand-built family trees" to "Radial mind maps for tree-shaped ideas."

**Build order from here: 6 remaining tile destinations** -- the four heavier Views (Kalendarium, Ephemeris, Glossopoeia, Cartographia), the combined **Timelines** page (Vertical + Chronometric in one), and the new **JSON Structure** page -- each Model B, section order mirroring its in-app surface, grounded by reading the component, then a colophon + cross-link/QA sweep.

**New v1.6 product backlog -- in-app help fixes** (found while grounding the site, not touched): Field Types help omits Longform Note + Grid; Templates help still lists Astronomical Body + Language/Glossary (promoted/removed in v1.5); Linea help omits zoom / the view-calendar selector / shift-click-to-open; Concordance feed list omits grid-cell + group-subfield refs; Stemma help omits Delete-node; Get started's "nothing required" line is wrong now that required fields block save. Product line unchanged: v1.5 at r130, finals smoke owed; next code line is v1.6.


=== ADDED 2026-06-25 (site, Pass 2 continued) -- Kalendarium, Cartographia, Timelines live; sub-tile pattern established ===

cartulary.world advanced (non-product, no r-counter). Kalendarium, Cartographia, and Timelines (hub + Vertical + Chronometric sub-pages) authored and wired LIVE. Total LIVE routes: 12 content + 2 sub-routes. SOON: ephemeris, glossopoeia, json-structure.

**Sub-tile pattern established** for Timelines and locked as the model for Ephemeris and Glossopoeia: all sub-routes map to the parent panel in `LIVE`; a `SUB` table and `showSub()` toggle sub-content divs within the single panel; `samePanel` detection prevents scroll-to-launchpad on sub-tile clicks. Sub-tiles sit above intro prose so they appear directly under the main launchpad.

**Site-wide gap audit** completed this session. Additions: secrets toggle icon (◎/◉) and long-text editor toolbar + shortcuts documented in Fields; single-user collaboration statement added to Concepts; synthetic templates in Concordance's Templates filter documented (prior pass).

**Build order from here:**
1. Ephemeris -- sub-tile hub + 5 workspace pages (Astronomical Body, Compute, Forced Alignment, Observe, Event) using the sub-tile pattern
2. Glossopoeia -- sub-tile hub + workspace pages
3. JSON Structure page
4. Colophon (anti-monetization, accessibility honest statement, REAL 4, license)
5. Cross-link / QA sweep → release

Product line unchanged: v1.5 at r130, finals smoke owed; next code line is v1.6.


=== ADDED 2026-06-26 -- cartulary.world Pass 2 content complete; all 15 tiles LIVE; colophon + QA sweep remain ===

cartulary.world advanced (non-product, no r-counter). The last three tile destinations were authored and wired LIVE: **Ephemeris** (sub-tile hub + Astronomical Body / Compute / Forced Alignment / Observe / Event), **JSON Structure**, and **Glossopoeia** (sub-tile hub + 8 workspace sub-pages, with Noun Number and Verbs folded into Morphology as their read-only digests). **All 15 launchpad tiles are now LIVE and SOON is empty.** Each page was grounded by reading the actual r130 component, not the in-app help.

The Ephemeris page also got a hard re-audit against the five workspace components that corrected about a dozen errors (most material: Compute has no user-facing result limit and no promote button in its results drawer; the Observe steppers are bidirectional and the button is "Now," disabled with a banner when no current moment is set; the Event promote button is "Promote to Festival / Holiday entry"). The JSON Structure page corrected the in-app help's celestialBodies shape (orbital elements nest under `orbitalElements` with keys `ascendingNode`/`argumentOfPeriapsis`, physical params nest under `physicalParams`) and added the two v1.5 calendar fields the in-app help omits (`month.abbreviation`, calendar `dateFormat`).

**Build order from here: 1) colophon (anti-monetization summary, accessibility honest statement, REAL 4 disclosure, license); 2) cross-link / QA sweep -> site release-ready.** The static-two-file model stands; the siteapp conversion remains deferred (the swap-router groundwork keeps it a route-table add if ever chosen).

**New v1.6 product backlog additions (in-app help gaps found while grounding these pages):** the in-app json-schema help mis-documents the celestialBodies orbital-element shape (flat vs nested, wrong key names: `longitudeAscNode`/`argPeriapsis`) and omits `month.abbreviation` + calendar `dateFormat`; the in-app Glossopoeia help has the Noun Number / Verbs / Pronouns nav order wrong; Ephemeris hints understate Compute's Ctrl/Cmd+Enter shortcut and auto-deselect-on-type-change, and the Observe stepper/Now-button behavior.

Product line unchanged: v1.5 at r130, finals browser-smoke owed (the one ship gate); next code line is v1.6 r001. `/mnt/project/` re-sync still owed.


=== ADDED 2026-06-26 (session 3) -- v1.5 line reopened (r131, r132) for Concordance layout fixes; site hard-check pass begun ===

Two pre-ship Concordance bugs caught during the owed finals browser smoke reopened the v1.5 line (standing doctrine: a pre-ship bug reopens the cut line; it stays open until the finals ship). r130 -> r131 -> r132; finals re-cut from r132.

- **r131:** concordance position-prune now keeps Astronomical Body + Glossopoeia node positions across reload (was entries-only `validIds`, which stripped hand-laid synthetic-node layouts every load).
- **r132:** force layout gained `forceX`/`forceY` containment (the bug r131 surfaced -- `forceCenter` recenters but does not contain, so disconnected nodes scattered and r131 froze the scatter), plus a one-time migration that clears the pre-fix synthetic scatter so it re-settles compactly.

**cartulary.world hard-check pass.** Started a per-page hard check (re-read the component, verify full coverage, fix discrepancies, sweep house-style). Done: Glossopoeia, Ephemeris, Timelines, Concordance. Notable: the prior em-dash verification was literal-only and missed 38 `&#8212;` entity em dashes (all swept); the Ephemeris page was missing the narrative-mirror kinds entirely; several in-app labels were off (Nodal alignment, Orbital paths, Body labels, Phase fraction, Save current).

**Build order from here:**
1. Browser smoke of the r132 finals (the one ship gate) -- includes Concordance drag-persist + compact-load verification -> itch upload, after which the line retires to v1.6 r001.
2. Remaining cartulary.world hard checks: Kalendarium, Cartographia, JSON Structure, and the intro/core pages (overview, get-started, concepts, worlds, templates, fields, linea, stemma).
3. Colophon (anti-monetization summary, accessibility honest statement, REAL 4 disclosure, license) + cross-link/QA sweep -> site release-ready.

**v1.6 product backlog addition:** in-app `timeline-editing` help wrongly says Escape / closing the panel leaves edit mode (component only deselects).

Version line: v1.5 open through Final Release; current r132; next product code r133, still v1.5. `/mnt/project/` re-sync owed.


=== ADDED 2026-06-26 (session 4) -- cartulary.world hard check: 5 more pages; 8 content pages now hard-checked. No product code, no r-counter (stays r132) ===

cartulary.world hard-check pass continued (non-product, no r-counter). Five pages re-read against the r132 component and corrected: **Concordance** (completed -- hover info pane, per-row node count, canvas stats bar; plus re-applied two session-3 Concordance text fixes that were not present in the working file), **Cartographia** (index-row columns, 25% resize floor, removed false zoom/resize-persistence claim), **Kalendarium** (Celestials section name, Save Anchor button label, calendar-deletion + entry-rebind conversion modal documented), **Stemma** (index-row columns), **Linea** (click-to-refocus vs Shift-to-open corrected -- the page had plain-click as drag-only and omitted click-to-refocus; stats bar documented).

**Hard-checked so far (8 content/view pages):** Glossopoeia, Ephemeris, Timelines, Concordance, Cartographia, Kalendarium, Stemma, Linea.

**Remaining cartulary.world work:**
1. Hard-check the rest: JSON Structure, and the intro/core pages (overview, get-started, concepts, worlds, templates, fields).
2. Colophon (anti-monetization summary, accessibility honest statement, REAL 4 disclosure, license).
3. Cross-link / QA sweep -> site release-ready.

Recurring miss pattern (logged to doctrine): list-view index rows under-list their columns; canvas stats bars go undocumented. Both added to the per-page hard-check checklist.

Product line unchanged: v1.5 at r132, finals browser-smoke owed (the one ship gate); next product code r133, still v1.5; v1.6 reset only after the finals ship. `/mnt/project/` re-sync owed.


=== ADDED 2026-06-26 (session 5) -- cartulary.world hard check: 5 more pages + 2 re-checks; new Import & Export page; logged-not-shipped lineage break. No product code, no r-counter (stays r132) ===

cartulary.world hard-check pass continued (non-product, no r-counter). Five pages first-checked and corrected (Fields, Templates, World settings, Concepts, Get started), and two re-checked (Glossopoeia, Ephemeris). The re-checks surfaced a lineage break: several session-3 fixes the changelog reported as done were never in the working file (Glossopoeia counts + enumeration; the entire Ephemeris label batch; 29 of the "38 swept" em dashes). All re-applied this session. Doctrine added; Timelines flagged for re-verification (session-3 touched, not re-checked since).

A new nav-only **Import & Export** page was built: a single consolidated reference for every shareable artifact (world json/md/zip/HTML, template, pack, conlang + grammar, stemma, calendar), with the shared collision model and read-only-handout guidance, plus reciprocal cross-links from the five owner pages. It is the first site route with a nav entry and no launchpad tile (deliberate, to keep the locked 3x5 grid). The export/import surface turned out to span seven artifact types across six pages; consolidating it was the honest fix for "sharing is under-surfaced."

**Hard-checked so far (13 site pages):** Glossopoeia, Ephemeris, Timelines, Concordance, Cartographia, Kalendarium, Stemma, Linea, Fields, Templates, World settings, Concepts, Get started.

**Build order from here:**
1. Hard-check the last two pages: JSON Structure and Overview.
2. Re-verify Timelines against the component (lineage break).
3. Colophon (anti-monetization summary, accessibility honest statement, REAL 4 disclosure, license).
4. Cross-link / QA sweep, then a full browser pass (incl. Import & Export nav-only routing, desktop and mobile) -> site release-ready.

**v1.6 product backlog additions (in-app-help gaps found this session):** the moon/calendar help calls the calendar editor section "Moons" when its header is "Celestials"; the Language/Glossary supersede help uses a phantom "glossary" entry type and omits Naming Convention. (The Fields secret-icon glyph was already correct in the in-app help; only the site was wrong.)

Product line unchanged: v1.5 at r132, finals browser-smoke owed (the one ship gate); next product code r133, still v1.5; v1.6 reset only after the finals ship. `/mnt/project/` re-sync owed.


=== ADDED 2026-06-26 (session 6) -- cartulary.world hard check finished + SITE SHIPPED LIVE; v1.5 next step rescoped: full in-app-help sweep as r133 before ship. No product code, no r-counter (stays r132) ===

Site-only session. The cartulary.world hard-check pass is complete and the site is live and secure at cartulary.world (Porkbun static hosting on the domain's free trial, HTTPS via auto-issued Let's Encrypt). Three pages closed out the hard check this session: **Timelines** (re-verified per the session-3 lineage break; 4 fixes -- vertical filter is NOT persistent, approximate dates render a start-side `~` only, open-ended bars collapse to a stub with a `->` glyph rather than reaching the edge, plus the "(no end set)" labels), **Overview** (1 fix -- persistence is IndexedDB not "local storage"), and **JSON Structure** (3 fixes -- the four real viewPrefs calendar keys, the nested `kalendariumGridYear` map keyed by rowKey with `__primary__` for primary, and the complete 31-kind celestialBodies enum). The **Colophon** was written and wired (footer-anchored, the second deliberate parallel-surface exception after nav-only Import & Export), and the **index splash** was finalized (Enter arrow removed, AI-disclosure / MIT / Colophon fineprint added, copyright set to the legal name Shawn Fry). Cross-link / QA sweep clean; both files verified fully offline (zero external resource loads).

**The product decision that sets up next session: the full in-app-help backlog is now r133, to land before v1.5 ships.** Two new in-app-help discrepancies surfaced this session while grounding the site (the `kalendariumGridYear` flat-key and the incomplete body-kind enum, both in the json-schema help). Drak's call: rather than defer them (and the rest of the standing in-app-help backlog) to v1.6, sweep the ENTIRE set into one r133 pass while v1.5 is still unshipped, so v1.5 ships feature-complete rather than "mostly complete with a list of minor issues." All of these are help-text-vs-code mismatches (the code is correct in every case); fixing them is editing the embedded help strings, which moves the r-counter.

**Build order from here:**
1. **r133: the full in-app-help sweep** (next session, fresh chat). Ground each item against the r132 component first (some may be partially right), fix, parse-gate after each, re-cut the dual-build finals from r133. Itemized list in the handoff "DO THIS FIRST" section. Fold in the two trivially-cleanable carry-forwards while the finals are being re-cut anyway: the license-preamble version delta (preamble names d3 7.8.5 / babel 7.23.5; the actual build is d3 7.9.0 / babel-standalone 7.29.4) and the two stale GEDCOM comments in Observe (~33309, ~34297).
2. **Browser smoke of the r133 finals** (the ship gate). Includes the still-owed r131/r132 Concordance checks (drag a body and a ConLang node, save, reload, confirm they hold position and the graph loads compact, not scattered).
3. **itch upload** of the v1.5 finals, after which the line retires.
4. **v1.6 reset** (`build_inline.py` VERSION 1.5 -> 1.6, r-counter -> r001).

**v1.6 product backlog (post-ship, unchanged except the in-app-help items move OUT of it into r133):** Concordance edge labeling polish; marriage feature followup (marriedOn / endedOn on spouse relationKind); entry-ref correctness audit across the built-in templates; data-shapes reference doc; D.4 native recurrence on the calendar-date field type; Concordance sector graph (stars from Ephemeris). Parent-delete dangling Descended From stays a tolerated edge unless Drak promotes it. Deferred indefinitely: Stemma v2, world-scoped custom assets (gates Scrap conlang migration), mobile UX.

Site line: cartulary.world is SHIPPED. No remaining site work except whatever a future content pass adds. The site never moves the r-counter.

Product line unchanged: v1.5 at r132, finals browser-smoke owed (the one ship gate, now after the r133 sweep); next product code is r133, still v1.5; v1.6 reset only after the finals ship. `/mnt/project/` re-sync owed.


=== ADDED 2026-06-26 (session 7) -- r133 in-app-help sweep shipped into the line + r134 Concordance default-none; finals re-cut from r134; the ship gate is now the only thing between v1.5 and itch ===

First product-code session since r132. The in-app-help backlog scoped in session 6 is done (r133), plus one small UX change (r134). Finals re-cut from r134. The version line is feature-complete; the browser smoke is the last step before upload.

**r133 (the full in-app-help sweep)** landed all 14 items from the handoff "DO THIS FIRST" list, plus three off-list code-vs-help mismatches caught under fix-on-find (viewPrefs calendar keys, the House/Dynasty built-in missing from the Templates help, Grid missing from the Field Types help), plus the two fold-ins (license-preamble version delta, two stale GEDCOM comments). One listed item (the "nothing is required" get-started line) was a no-op in-app -- it only ever existed on the site, already fixed. Detail in the changelog and the handoff.

**r134 (Concordance default-none)**: the Concordance template filter now opens with no boxes checked (blank graph) instead of all-on, so a huge imported world no longer presents as a giant force-layout glob on first open. all / none recover the full view. Concordance only; per-session; blanket-empty by Drak's call.

**Build order from here (unchanged shape, now post-r134):**
1. Browser smoke of the r134 finals -- the one ship gate. Fold in the still-owed r131/r132 Concordance checks (drag a body and a ConLang node, save, reload, confirm both hold position and the graph loads compact) and a quick look at the new empty default (open -> blank, tick a template -> draws, all/none work). forceX/forceY 0.07 is the dial if the graph clusters or drifts.
2. Re-upload index.html to the domain root (favicon hotfix). helloworld.html is unchanged but both must sit at root together.
3. Sync the corrected inlining/compile_jsx.js and build_inline.py into /mnt/project (the cold-start build depends on the standalone fallback).
4. itch upload of the v1.5 finals, after which the line retires.
5. v1.6 reset (build_inline.py VERSION 1.5 -> 1.6, r-counter -> r001).

**v1.6 product backlog (post-ship, unchanged; the in-app-help items are now resolved, not deferred):** Concordance edge labeling polish; marriage feature followup (marriedOn / endedOn on spouse relationKind); entry-ref correctness audit across the built-in templates; data-shapes reference doc (still owed, separate deliverable); D.4 native recurrence on the calendar-date field type; Concordance sector graph (stars from Ephemeris). Parent-delete dangling Descended From stays tolerated unless promoted. Deferred indefinitely: Stemma v2, world-scoped custom assets (gates Scrap conlang migration), mobile UX. Possible follow-up if wanted: a size-threshold variant of the Concordance default (full graph for small worlds, empty only past N nodes) -- explicitly declined this session in favor of blanket-empty, recorded in case it resurfaces.

Site line: cartulary.world is shipped; the only owed site action is the index.html favicon re-upload. The site never moves the r-counter.

Product line: v1.5 open; current cut r134; finals browser-smoke owed (the one ship gate); next product code r135, still v1.5; v1.6 reset only after the finals ship. /mnt/project/ re-sync owed (must include the corrected build infra).

---

