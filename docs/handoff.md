# Cartulary: Handoff (v1.6 OPEN; pillar 2 parked, pillar 3 next. r030. Session 19, 2026-10-19)

> **VERSION LINE. READ FIRST.** **v1.5 is SHIPPED** (drakhanas.itch.io/cartulary, 2026-06-26, line closed at r134). **The v1.6 line is OPEN.** Pillar 1 (maps promotion, r001) is done and browser-verified. **Pillar 2 (modularization): every map-independent module is carved.** Nineteen named modules: seventeen flat (home-data r004, modals r005, io-utils r006, temporal r007, persistence r008, calendar-engine r009, export-layer r010, template-builder r011, migrate r012, form-engine/display r014, form-engine/edit r015, builtin-templates r017, field-system r019, stemma r027, linea r028, chronometric r029, kalendarium r030) plus two DIRECTORIES (`glossopoeia/` r023, five parts; `ephemeris/` r024, seven parts). **Nine gather cuts have run** (r002, r003, r013, r016, r018, r020, r021, r022, r025); the first two predate the reconstitution gate and were verified by multiset against the r001 body, so **seven are anchor-rotating gathers**. Say "seven anchor-rotating gathers" or "nine gather cuts"; a bare "seven gathers" contradicts the session-11 record. **The anchor has rotated eight times**, because r026 (a comment edit, neither carve nor gather) rotated it too; the active anchor is `reference-r026-body.jsx`. Current highest source is **r030**. There is no open product bug and no owed ship gate.

> **THE SOURCE LIVES IN A GIT REPOSITORY AS OF SESSION 19.** `github.com/Drakhanas/Cartulary`, private, branch `main`. The tree, the tooling, the twelve dependency tarballs, every document and archive, the site, and the packs are in it, and a CI workflow runs every gate on every push. There are no more bundle zips, no more turnover zips, no `/mnt/project` copies of anything that changes per session, and no skill-package copy of the toolchain to go stale. Cold start is `git clone`. Session 19 moved everything in one commit (`f5d9b42`, 104 files) and the first CI run was green on all six steps.

> **>>> NEXT: pillar 3, the drawing editor (Cartographia+). Pillar 2 is parked, not finished. <<<** Only `concordance` and `cartographia` remain uncarved, and both are held until after pillar 3 by decision so they carve against their final shapes. Pillar 3's v1 scope and won't-have list are locked in `docs/roadmap.md` under the v1.6 Cartographia+ heading; read that before proposing anything. **The verification mode for content edits is DECIDED and BUILT:** `build_inline.py edit`, the scoped-edit check (session 19, below). **The build sheet is LOCKED:** `docs/cartographia-plus-spec.md`, eight cuts with declared scope, locked after proposal-review at session 19. **Cut 1 is next:** the data model (`mapData.drawing`, its normalizer, the `migrate` backfill, `createMap` seeding it, the `state.mapStamps` slice), declared scope `16_trunk`, `10_migrate`, `12_trunk`, `09_trunk`. Every content cut is a script in `inlining/cuts/`, gated by `edit`, parse, and a browser pass, then rotated with `freeze`.

> **Where the editor lands in the tree.** All of cartographia sits in `16_trunk` 1294-2051 (758 lines, six declarations, `useMapImageUrl` through `CartographiaIndexView`), behind `SettingsView` (1-265) and concordance (266-1293). Those three spans tile the arc (`265 + 1028 + 758 = 2051`), each leads with its boundary blank and ends on code per rule 1, and they are published so the eventual last two carves have a starting point; pillar 3 will move the cartographia figures and may move the seam, so re-derive before cutting. The live architecture is in `docs/cartulary-spine-manifest.md` (the oracle); the frozen `docs/cartulary-modularization-plan.md` is the original release architecture, superseded on boundary decisions by the manifest.

Read this end-to-end before doing anything. Find code by NAME, never line number, and never by a remembered `NN_` filename (prefixes reflow as modules are inserted upstream; every prefix from `17` onward changed in session 18).

---

## COLD-START PREREQUISITES

**Verify state; do not trust this list's account of it.** The repository is the only input. Clone it, then let the gates say what state it is in.

1. **Clone.** Attach `Drakhanas/Cartulary` to the session with push access and clone it (`git clone --depth 1 https://github.com/Drakhanas/Cartulary`). Every path below is relative to the clone root. Nothing hard-codes `/home/claude` any more: `build_inline.py`, `prove_gate_teeth.py`, and `check.js` derive their paths from their own location, so the clone can sit anywhere, including Drak's local clone at `Y:\_Cartulary`.
2. **Read `docs/handoff.md`** (this file) end to end, then `docs/roadmap.md` for the pillar-3 scope.
3. **Post-clone sanity check, before any work.** Every figure here moves as the tree grows; re-derive rather than trusting a remembered number.
   - `git log --oneline -3` and `git status`: on `main`, clean.
   - module file count → **38** at r030. Count with `rglob`, not `glob`; a flat glob misses every directory part and will silently under-report.
   - total lines → **39,337**. Use `splitlines()`, NOT `wc -l`: at r030, 30 of the 38 files have no trailing newline, so `wc -l` under-reports by exactly 30. This number was 13 at r019, 19 at r023, 26 at r025.
   - `ls cartulary-src/reference-*` → exactly two files, the active anchor and its layout (`reference-r026-body.jsx`, `reference-r026-layout.json` at r030).
   - `python3 inlining/build_inline.py verify` → GATE GREEN: sequence PASS at 37,303, decl-set PASS at 419, byte-identity exact, header pairs PASS at 74, header placement PASS at 0
   - `python3 inlining/build_inline.py edit` on the untouched tree → EDIT GREEN

```
python3 -c "
from pathlib import Path
M=Path('cartulary-src/modules')
ps=sorted(M.rglob('[0-9][0-9]_*.jsx'), key=lambda f: f.relative_to(M).as_posix())
print('files', len(ps))
print('lines', sum(len(p.read_text().splitlines()) for p in ps))
print('no-trailing-NL', sum(1 for p in ps if not p.read_text().endswith(chr(10))))
"
```

4. **Parse gate setup** (once per session; no network, the parser comes from `deps/`):

```
mkdir -p babelcheck/node_modules/@babel/parser
tar -xzf deps/parser-7.25.3.tgz -C babelcheck/node_modules/@babel/parser --strip-components=1
python3 inlining/build_inline.py working && node babelcheck/check.js
```

`check.js` reads `inlining/out/cartulary-working.html` by default, or the path given as its first argument. Expect `PARSE OK`.

5. **What is NOT in the repository, on purpose.** Staged working HTMLs and release finals: they are regenerable byte-for-byte from the tree (`working` at r030 hashes to sha256 `2facf10cea574525`, the r026 artifact Drak browser-passed), the r-number plus hash in the changelog is the record, and Drak's NAS archive (`__Working`, `__LiveFinal`) keeps the files. `node_modules/` and `inlining/out/` are ignored. Drak's profile and the two SRD PDFs stay in the claude.ai Project, which otherwise holds only its instructions and the five slow-changing reference companions (`roadmap-principles.md`, `doctrine-code-watch.md`, `doctrine-site.md`, `cartulary-modularization-plan.md`, `game-mechanics-pack-reference.md`), all of which are ALSO in `docs/`; the repository copy is canonical if they ever disagree.

---

## THE SOURCE IS A MODULE TREE

As of r004 the working HTML is no longer the source. The source is:

- `cartulary-src/shell.html` : the page scaffolding, with one `@@CARTULARY_BABEL_BODY@@` sentinel where the babel body injects. The body's trailing newline is owned by the shell.
- `cartulary-src/modules/NN_name.jsx` : a flat module. `NN` is a two-digit assembly-order prefix; `name` is the module/carve name.
- `cartulary-src/modules/NN_name/NN_part.jsx` : a DIRECTORY module (new at r023). The directory carries the outer prefix; each part inside carries its own `00`-based prefix. Two exist: `21_glossopoeia/` and `22_ephemeris/`.
- `cartulary-src/reference-r026-body.jsx` : the frozen parity anchor, **active as of r026**. Every pure carve must reassemble to it byte-for-byte. Found by glob, never named in code: exactly one `reference-r###-body.jsx` may exist, and the gate refuses on zero or two. Retired anchors are deleted at rotation.
- `cartulary-src/reference-r026-layout.json` : the anchor's companion (new at session 19): the per-file line counts that segment the anchor, the anchor's sha256, and the shell's text and sha256. `edit` mode needs it; `freeze` writes it.

The assembler joins with a per-file `rstrip('\n')`, so **no slice may END on a blank line** (boundary rule 1 below; violating it silently drops a line). Every file in the tree leads with a blank, none ends on a blank, and none ends on a comment. The last property is enforced by `header placement` in every mode; the first two are enforced by `edit` mode's rule-1 check and asserted here for the others.

These plus `inlining/build_inline.py`, `inlining/canonicalize.py`, `inlining/prove_gate_teeth.py`, and the cut scripts in `inlining/cuts/` (`r025_sweep.py` through `r030_carve_kalendarium.py`, plus `infra_edit_mode.py` and `infra_edit_probes.py`, the session-19 tooling patches kept as the record) are the repository. A staged working HTML is produced for each cut that CHANGES bytes (every gather, r026, and every pillar-3 content cut); a pure carve produces identical bytes and gets no separate artifact.

**Current tree (r030), assembly order, with line counts:** `00_trunk` (134) / `01_builtin-templates` (942) / `02_trunk` (43) / `03_persistence` (592) / `04_trunk` (25) / `05_field-system` (774) / `06_calendar-engine` (1291) / `07_temporal` (249) / `08_export-layer` (1520) / `09_trunk` (216) / `10_migrate` (5839) / `11_io-utils` (42) / `12_trunk` (4938) / `13_form-engine-display` (658) / `14_form-engine-edit` (1777) / `15_template-builder` (1111) / `16_trunk` (2051) / `17_chronometric` (1528) / `18_linea` (646) / `19_stemma` (1410) / `20_trunk` (354) / **`21_glossopoeia/`** = `00_schemas` (476) + `01_substrate` (1025) + `02_grammar` (380) + `03_components` (393) + `04_view` (845) / **`22_ephemeris/`** = `00_body-kinds` (187) + `01_shell` (722) + `02_asbo` (1459) + `03_observe` (1937) + `04_forcealign` (585) + `05_compute` (1177) + `06_orbital-math` (1266) / `23_kalendarium` (876) / `24_home-data` (1330) / `25_trunk` (248) / `26_modals` (286) / `27_trunk` (5). Session 18 added two lines (r026) and four arcs (r027-r029 split `16_trunk` three times and left its tail as `20_trunk`; r030 renamed an arc in place). Session 19 changed no bytes in the tree.

**38 files, 39,337 lines, 28 arcs.** Nineteen named modules, nine trunk arcs (`00`, `02`, `04`, `09`, `12`, `16`, `20`, `25`, `27`). One of those is not residue: `16_trunk` holds `SettingsView`, concordance, and cartographia, and the last two are the held-back carves. The other eight are residue; `20_trunk` is the node-source registry, spine-owned, and the remaining seven are the ordinary kind. The `NN` prefix is decoupled from the r-number: `01_builtin-templates` was carved at r017, `17_chronometric` at r029.

**Line-count convention.** Every per-arc and per-module line count in this doc set is a Python `splitlines()` count, consistent with the 39,337 total. If a prose figure and a tree figure disagree for the same file, the tree figure is correct and the prose figure is a `wc -l` leak.

**Anchor history.** Pure carves reassemble to the ACTIVE anchor byte-for-byte; gathers move lines on purpose, are gated by multiset instead, and rotate the anchor once browser-verified. r003 anchored r004 through r012, nine r-numbers, across which r003 through r012 shared one output artifact. Then r013 → `reference-r013-body.jsx` (anchored r014-r015); r016 → `reference-r016-body.jsx` (anchored r017); r018 → `reference-r018-body.jsx` (anchored r019); r020 → `reference-r020-body.jsx`; r021 → `reference-r021-body.jsx`; r022 → `reference-r022-body.jsx` (anchored r023-r024); r025 → `reference-r025-body.jsx` (no pure split was ever gated against it: r026 changed bytes and rotated again); r026 → `reference-r026-body.jsx`, **active**, anchoring r027 through r030 and onward. The r026 anchor is 2,008,051 bytes, 203 more than r025, which is one 82-character header plus its blank (184 bytes) and one 81-character header rewritten at 82 (19 bytes), the dash character being three bytes in UTF-8. Its sha256 begins `07bb0eaa48a0f974`, and that is also the sha256 of the babel body inside the browser-passed r026 artifact, which is how session 19 proved the two are the same thing without a tree in hand.

---

## WHAT'S DONE

**v1.5 ship** (2026-06-26, r134). Glossopoeia, Ephemeris, Packs framework + Space Opera pack, Grid + Longform Note field types, the node-source registry, House/Dynasty/Clan/Bloodline built-in, Concordance synthetic-node persistence, and cartulary.world. Finals `Cartulary_v1.5.html` (2.50 MB) + `_Readable.html` (5.77 MB), offline, validator-green.

**Pillar 1: maps promotion** (r001, 2026-06-29, browser-verified). Maps moved from `kind:"map"` entries to a flat `state.cartographia` slice. Invisible to users (the acceptance test). Full per-area detail in the changelog session-10 block. Deviations on record: field-id remap by LABEL, Restore/Reset modals verify-absent, calendar selector + per-map Export dropped (all dead for maps).

**Pillar 2: modularization** (sessions 11-18, 2026-06-30 to 10-19).

- **Phase-1 prep (session 11, r002/r003).** Spine manifest authored; boundary decisions locked; spine sized to relief; five scattered modules gathered into contiguous runs.
- **Pipeline rework + gate tooling (session 12, folded into r004).** `build_inline.py` assembles the babel body from the module tree; `working` / `verify` / `finals` modes. `canonicalize.py` is the reconstitution-gate normal form. Assembly is ordered concatenation, never dependency resolution.
- **Carves r004-r012 (sessions 12-14).** home-data, modals, io-utils, temporal, persistence, calendar-engine, export-layer, template-builder, migrate. All pure splits reassembling to r003 byte-for-byte.
- **Session 15, r013-r019.** Three gathers and the four carves they freed: display/edit gather (r013) freeing form-engine/display (r014) and form-engine/edit (r015); builtin-templates gather (r016) freeing its carve (r017); field-system gather (r018) freeing its carve (r019). Shared/companion tier complete.
- **Session 16, r020-r024.** Three gathers (r020 ephemeris zone unification, r021 ephemeris sub-modules, r022 glossopoeia sub-modules) and the first two DIRECTORY carves, `glossopoeia/` at r023 in five parts and `ephemeris/` at r024 in seven. The assembler became directory-aware and the `byte_ok` gate-verdict bug was found and fixed.
- **Session 17, r025.** Header integrity: `header_pairs()` and `header placement` added to the gate, `raw_ok` scored, the gather check made a mode, eleven sheared headers swept to the blocks they name, anchor rotated. The turnover skill's doc gate was rebuilt from its spec.
- **Session 18, r026-r030.** r026 replaced the last sheared header with two correct ones (82 characters each) and rotated the anchor; r027-r030 carved stemma, linea, chronometric, and kalendarium as pure splits against it, back to front within `16_trunk` so no span was re-derived between cuts. One artifact for all five r-numbers, sha256 `2facf10cea574525`. The sandbox was wiped mid-session and replayed from the bundle; two harness defects (a rename pre-check, a probe hard-coding prefixes) were caught by the harness. Full detail in the changelog session-18 block.
- **Session 19, no r-bump.** Detail below.

### Session 19 in detail

**Handoff audit first, on the artifact and then on the bundle.** The session opened with the turnover zip uploaded under the source bundle's name and the real bundle absent. Everything testable without a tree was tested against the browser-passed r026 artifact on Drak's disk: the babel body is 2,008,051 bytes (the anchor's size), 39,337 lines, 37,303 canonical, 419 decls, 74 header pairs; it is 203 bytes and +2 lines over the r025 anchor, and the diff is exactly one header rewritten and one inserted with its blank, both 82 wide, with exactly the three pair changes the manifest names. Parse OK. The six doc checks that need no tree were PASS against an r025 baseline, and the 348 newly authored lines carried no em dashes and no banned phrases. The four stale-tooling deltas in the Project's `build_inline.py` and `canonicalize.py` were all still real. When the bundle arrived: 38 files, 39,337 lines, 30 without trailing newline, one anchor at `07bb0eaa48a0f974`, GATE GREEN at 37,303 / 419 / exact / 74 / 0, `working` byte-identical to the passed artifact, PARSE OK, seven probes bit, `check_docs.py` DOCS GREEN 11/11, the corrected `prove_teeth.py` 10/10. The skill's stale `prove_teeth.py`, run against the same set, read MISS on its published-figure probe, as the r030 edition predicted.

**Prose defects found, both minor, fixed in this edition:** the "Product HTML changed at" enumeration omitted r002 and r003 (inherited from the r025 edition; both were relocation cuts that changed product bytes), and the turnover zip's `journal-entry.txt` was the pre-rewrap copy of the one in the Project, same words, different wrapping. Nothing affected progress.

**A dev reconstruction of the r030 tree, built from the r025 bundle plus the documented r026 edit and the four published spans, matched the real bundle byte for byte, trailing-newline states included.** It was used to build and probe the edit mode while the bundle was still missing and was discarded when the bundle arrived; nothing from it shipped. The handoff's rule stands: a reconstruction is enough to audit against and to develop against, never to cut from.

**The scoped-edit mode (Drak chose option 1 of three).** Pillar 3 is entirely content edits, and neither `verify` nor `gather` can return a verdict on a cut that adds or changes lines on purpose; r026 was gated on a hand-written delta table, which worked for three lines and does not scale. `build_inline.py edit` declares the cut's scope and holds everything else to the anchor:

- `--files` : the module files allowed to differ (posix-relative to `modules/`, `.jsx` optional). Every file NOT declared must be byte-identical to its segment of the anchor, located through the layout file. Scored.
- `--add` / `--remove` : the top-level declaration names the cut adds or removes. The actual delta against the anchor must equal the declared sets exactly; a rename is a remove plus an add. Scored. A feature adds declarations, so the invariant a content gate can hold is "nothing lost or renamed outside the declared edit", not "the set unchanged".
- Rule-1 shape on every file's RAW text (leads with a blank, does not end on one). Scored. A declared file that ends on a blank is invisible to every check that runs on the assembled body, because the assembler already ate the line.
- Header placement. Scored. Header pairs: reported, not scored, for the reason gather reports them: inserting a declaration at the head of a block retargets its header legitimately.
- `shell.html` unchanged unless `--shell` is given; the layout carries the shell's text, so a declared shell change is diffed, not just detected. No other gate has ever seen the shell, and pillar 3 will likely touch its CSS.
- Reported: the in-scope unified diff, printed and written to `inlining/out/edit-diff.patch` (the review artifact; read it the way the r026 table was read), the header-pair diff, raw and canonical line counts.
- The layout must exist and must have been written for the active anchor (sha match), and the file set must be unchanged; a carve, gather, or rename is a different operation and `edit` refuses it.

`build_inline.py freeze` is the rotation, mechanised: `freeze r031` writes `reference-r031-body.jsx` and its layout from the current tree, confirms frozen-equals-assembled, and deletes the retired pair; the next `verify` finds the new anchor by glob, so there is nothing to repoint. `freeze` with no name rewrites the layout for the ACTIVE anchor and refuses unless the tree reassembles to it byte-for-byte. The human half of rotation, the browser pass, comes first and the tool cannot check it: never freeze an unverified body.

**Proven before it shipped.** Replaying r026 on the r025 bundle through `edit --files 13_form-engine-display,14_form-engine-edit` reproduced the r025 handoff's delta table line for line (raw 39,335 → 39,337, canonical 37,302 → 37,303, the three pair changes, +2 in display, +1/-1 in edit) and `freeze r026` froze the same sha as the passed artifact's body, after which the `working` rebuild hashed to `2facf10cea574525`. `prove_gate_teeth.py` gained eleven probes, including a positive control (a correctly declared edit goes GREEN; a gate that only fails is as useless as one that only passes) and the two silent classes (a declared file ending on a blank, a misfiled header with a byte-identical body); eighteen probes, all bit, on the dev tree and again on the real one. The tooling rode into the repository with no r-bump, the same as r004, r023, and r025.

**The repository.** Drak's call after the night's handling: the turnover ritual had become the hazard. `Drakhanas/Cartulary`, private. One commit moved the r030 tree with its anchor and layout, the build and gate tooling, the twelve tarballs, every document with its archives, the turnover toolchain (`tools/turnover/`), cartulary.world (`site/`), and the packs (`packs/`). The toolchain was made relocatable in the same commit. `.gitattributes` unsets text conversion for every path (`* -text`): the gate is byte identity, and one Windows checkout with autocrlf on would have failed it on a tree nobody touched. `.editorconfig` says `insert_final_newline = false` so an editor does not quietly change the 30-file count. The gate workflow (`.github/workflows/gate.yml`) runs verify, working, the parse gate from the tarball, the build-gate teeth, the doc gate, and the doc-gate teeth on every push, offline; the first run was green. The claude.ai Project was retired as a document store: the six per-session documents, `facts.json`, `prove_teeth.py`, and the eight tooling files were deleted from it. Tag pushes are refused by the session's git credential (branches go through); the `r030` tag is Drak's to push from his clone.

**Verification posture.** No tree bytes changed this session; `working` still hashes to `2facf10cea574525`. Gate tooling changed, so teeth were re-proven: eighteen probes, all bit, on the real tree and again from the repository clone with relocatable paths. Doc gate DOCS GREEN at delivery, and CI re-ran everything on the push. **Dual-build finals have NOT been cut for r001 through r030** (release-prep only).

---

## v1.6 SHAPE (the release plan)

1. **Maps promotion**: **DONE (r001, browser-verified).**
2. **Modularization**: **map-independent phase DONE** (shared tier r004-r019, views r023-r030, header integrity r025-r026). Two carves parked for after pillar 3. Invisible if successful.
3. **Drawing editor (Cartographia+).** The map-creation feature. The only user-visible pillar. Built into the now-sliced, now-modular Cartographia, under the scoped-edit procedure. **NEXT.**

**Why this order:** maps-promotion first isolated the migration risk; modularize before the editor so the largest feature is built against clean seams; carve the map-coupled modules (Concordance, Cartographia) last, against their final shapes, to avoid a re-carve.

---

## Modularization state (read before any carve)

The authoritative module map is `docs/cartulary-spine-manifest.md` (section 10 for source layout, carve status, gate design, and anchor history). Summary:

- **Spine core (~6,000 lines):** `App` shell + router, `Sidebar`, `ProjectView`, `HomeView` component, `SettingsView`, the node-source registry (`NODE_SOURCE_REGISTRY` + `SYNTH_TPL_*` + accessors, now alone in `20_trunk`), the state factories, and the constant tables (`FIELD_TYPES`, `SUBFIELD_TYPES`, `MAX_GROUP_DEPTH`, `GRID_CELL_TYPES`/`_SET`/`_LABELS`, `ICONS`, `COLORS`, `TEMPLATE_ORIGIN`). `App` is ~75% of this.
- **CARVED (19 modules):** the whole shared/companion/data tier, namely `builtin-templates` (r017), `persistence` (r008), `field-system` (r019), `calendar-engine` (r009), `temporal` (r007), `export-layer` (r010), `migrate` companion (r012), `io-utils` (r006), `form-engine/display` (r014), `form-engine/edit` (r015), `template-builder` (r011), `home-data` (r004), `modals` (r005), plus every map-independent view: `glossopoeia/` (r023), `ephemeris/` (r024), `stemma` (r027), `linea` (r028), `chronometric` (r029), `kalendarium` (r030).
- **NOT carved, held for after pillar 3:** `concordance` and `cartographia`, both in `16_trunk`, both contiguous today.

**What `16_trunk` holds, re-derived after r029.** Three runs, nine declarations, tiling the arc exactly; each span leads with its boundary blank and ends on code, per rule 1.

| Run | Members | Span | Lines |
|---|---|---|---|
| *(spine residue)* | `SettingsView` | 1-265 | 265 |
| `concordance` | `VAGUE_EDGE_LABELS`, `GraphView` | 266-1293 | 1,028 |
| `cartographia` | `useMapImageUrl`, `useResizeHandler`, `MapPin`, `MapView`, `MapEditor`, `CartographiaIndexView` | 1294-2051 | 758 |

`265 + 1028 + 758 = 2051`. These are not carve orders; they are the starting point for the two carves that come after pillar 3, and pillar 3 will change the cartographia figures. Re-derive before cutting.

- **Deferred (separate risk tier):** `App` hooks-extraction. Behavior-preserving refactor, not a pure carve, so the reconstitution gate cannot verify it byte-for-byte.
- **Optional, not scheduled:** the r017 carve left `02_trunk` as a 43-line arc holding only the util wedge (`genId`, `fmtDate`, `isoNow`, `slugify`, `formatSnapshotTimestamp`, `formatSnapshotSize`). Correct as anonymous residue; a clean pure split if a named `utils` module is ever wanted.

**Gate design.** The end-step reconstitution-parity gate is `build_inline.py verify` + `canonicalize.py`. It reports FIVE results and **a pure split must be green on all five:** canonical sequence, decl-name set, byte-identity, header pairs, header placement. Two of those five were added because a check that is computed and printed but excluded from the verdict reads as coverage while providing none. `byte_ok` was wrong from r004 to r023; `raw_ok` was wrong from r004 to r025. Both were found by trying to fool the gate, not by reading it.

```
python3 inlining/build_inline.py verify
Reconstitution-parity gate (pure split)
  canonical sequence : PASS (37303 non-blank lines vs reference 37303)
  decl-name set      : PASS (419 names)
  byte-identity      : exact
  header pairs       : PASS (74 headers)
  header placement   : PASS (0 misfiled)

GATE GREEN
```

**A gather uses `build_inline.py gather`, a mode since r025.** Sequence and byte-identity are expected to differ on a relocation, so the verdict is multiset + decl-name set + RAW LINE COUNT + header placement, all scored, with the header-pair diff reported rather than scored (a gather may legitimately move a header with its block, so a pair change is a decision point, not a failure). Expected for a good gather: GATHER GREEN, MULTISET PASS, decl-set PASS at 419, canonical lines equal at 37,303, raw line count PASS at 39,337, header placement 0 misfiled.

**A content edit uses `build_inline.py edit`, a mode since session 19** (the full description is in the session-19 block above). Expected for a good content cut: EDIT GREEN with layout fresh, file set unchanged, out-of-scope files PASS, decl delta PASS at the declared additions, rule-1 shape PASS, header placement PASS, shell PASS, and an in-scope diff that reads as the change intended and nothing else.

**Why `raw_ok` has to be scored.** On a gather, multiset, decl-set, and canonical sequence ALL run on blank-stripped lines and byte-identity is expected to differ, so a dropped or added BLANK line is invisible to every other scored check. Cutting a block that leaves its file ending on a blank loses that line to the assembler's per-file `rstrip('\n')`: one line, 39,336 against 39,337, and the destination does not change it. Reaching 39,335 takes a second rule-1 violation stacked on the first. `edit` mode catches the same class on the raw file text instead, because on a content edit the raw count is supposed to move.

**Why `header placement` is separate from `header pairs`.** `header_pairs()` runs on the assembled body, where file boundaries do not exist. A header sitting at the tail of one module and labelling the head of the next pairs CORRECTLY and the check cannot see it. The kalendarium arc's tail was exactly that shape before r025. The placement check reads each file on its own and fails any section header with no declaration after it in that file.

**Teeth re-proof, mandatory after any change to the assembler, the gate, or the tree's numbering, and run by CI on every push.** `python3 inlining/prove_gate_teeth.py`, eighteen mutation probes, each injecting one defect into a throwaway copy and asserting the right check goes RED (or, for the positive control and the two reported-not-scored cases, GREEN with the right signal). Every probe must read OK; a MISS is a blind spot, and you fix the check, never the probe. The script re-anchors each sandbox on the CURRENT tree, layout included, before mutating, so it still says something true between a cut and its rotation. Do not confuse it with `tools/turnover/prove_teeth.py`, which probes the DOC gate (`check_docs.py`).

```
OK  drop one code line                 verify   OK  declared edit (positive control)   edit
OK  drop one BLANK line                verify   OK  edit outside declared scope        edit
OK  rename one declaration             verify   OK  undeclared declaration added       edit
OK  shear a section header             verify   OK  declaration lost in scope          edit
OK  shear a section header             gather   OK  declared file ends on a blank      edit
OK  misfile a header (byte-identical)  verify   OK  misfile a header (in scope)        edit
OK  drop one BLANK line                gather   OK  shear reported, not scored         edit
                                                OK  stale layout                       edit
                                                OK  file renamed (not an edit)         edit
                                                OK  shell changed, undeclared          edit
                                                OK  shell changed, declared            edit
```

**Carve procedure (proven on 19 carves).** Locate the module's members BY NAME in the current tree; confirm contiguity (gather first if scattered, as a separate cut); **print the actual seam lines and read them before slicing**; slice with the boundary discipline; write the new module file(s), reflowing the `NN` prefixes so assembly order stays contiguous (a mid-tree carve renumbers everything downstream); run `verify` (all five checks green) and the parse gate; browser-check only if the bytes changed; commit. One r-bump per full carve. **When several carves share one arc and their spans are published as line numbers, carve back to front:** the runs nearest the arc's tail leave first, so every span ahead of them keeps its line numbers, and nothing has to be re-derived between cuts. Session 18 did three this way and never re-measured.

**Boundary discipline (five rules, all earned):**
1. **Boundary blanks LEAD the following file. No slice may END on a blank.** The assembler's per-file `rstrip('\n')` silently eats a trailing blank, dropping a line from the output. Canonical sequence will NOT catch this; only byte-identity will, and on a content edit only `edit` mode's rule-1 check will.
2. The body's trailing newline stays in the shell, not in the last module.
3. A section header travels with its block.
4. A doc-comment travels with its declaration.
5. **A doc comment can sit behind a blank line, which defeats a walk-back.** Finding a comment block's start by walking backward over `//` lines fails whenever the author left a blank between the comment and the code, and the failure looks like a plausible span rather than an error. This bit twice in r021, and then bit again in the session-16 turnover itself: three of the four published pending-carve line counts were wrong because the measuring script had the same defect. It bit a third time at r025, where a sweep script reading with a bare `split(chr(10))` handed a phantom trailing blank to the 8 files that carry a trailing newline and tripped its own rule-1 assertion on a file it never touched. Print the eight lines around every cut point and read them; a computed span is a hypothesis, the seam lines are the evidence.

**Companion note to rules 3 and 4.** Section headers in the current tree ARE trustworthy block labels, and the gate keeps them that way. r025 relocated eleven sheared section headers to the blocks they name and r026 replaced the one that named two blocks; `header pairs` and `header placement` are what stop the next one accumulating. The mechanism that produced them is still live and needs conscious handling on every relocation: a cut moves a declaration and its doc comment because those are adjacent, and leaves the section header behind because there is usually a blank between the header and the comment. Rule 3 is not automatic. **Zero sheared headers remain.** Confirm every seam against DECLARATION NAMES, and treat a pair diff on a gather or an edit as a question to answer rather than noise to clear. History, census, and the header rule: manifest section 11.

**Gather procedure (seven anchor-rotating gathers: r013, r016, r018, r020, r021, r022, r025; the same rotation ran once more at r026).** Each gather is its own r-bump: relocate the scattered members into one contiguous run (only position changes, no code), run `build_inline.py gather` (byte-identity will NOT hold, on purpose), parse gate, **then STOP for the browser pass**. Only after it passes: `build_inline.py freeze r###`, which freezes the assembled body as the new anchor with its layout, confirms frozen-equals-assembled, and deletes the retired pair; then `verify` (expect green with byte-identity exact), then rebuild `working` and confirm the rebuild is byte-identical to the artifact that was actually browser-passed. That last step catches a rotation that froze the wrong body, and it is also the recovery check after an environment loss: a replay from the repository is correct when its rebuild hashes to the artifact that passed. **Never freeze an unverified body.** Do the gathers one at a time; do not batch them into a single relayout. **Any cut that changes assembled bytes rotates the anchor**, whether or not it is a gather; r026 was a comment edit and rotated.

**Content-cut procedure (pillar 3).** Script the edit into `inlining/cuts/r###_description.py` (no hand edits to the tree; every change a script, so a wiped sandbox can replay from the repository). Run `build_inline.py edit --files ... --add ... [--remove ...] [--shell]`; read `inlining/out/edit-diff.patch` as the delta table; parse gate; `working`; stage the working HTML as `Cartulary_v1.6_Working_r###_(description).html`; **STOP for the browser pass**; then `freeze r###`, `verify`, rebuild `working` and confirm the hash equals the file that was passed; commit with the r-number in the message, push. Name the concrete browser things to check after each cut, and say plainly which file to open.

**Browser passes: when they are owed and when they are not.** A gather always owes one; it changes bytes on purpose and is gated on a weaker check. So does any other byte-changing cut (r026, every content cut). A pure split whose byte-identity against the active anchor is exact AND whose assembled artifact hashes equal to one already passed owes nothing, because the product provably did not change and the gate is what proves the enumeration ordered correctly. r003-r012 shared one artifact across ten r-numbers on exactly this basis, as did r023-r024 and r026-r030. Keep the exception narrow; ritual verification erodes the meaning of the real ones.

**Eval-order check before any relocation.** What matters is definition-time vs call-time reference, not source order. Function declarations hoist and are always safe. Const arrows are safe to move above their callees provided the reference sits INSIDE the arrow body (resolved at call time); an initializer that runs at eval time (e.g. `const X_SET = new Set(X_TYPES)`) must keep its dependency above it and should travel with it. Prefer the smaller relocation, EXCEPT where the smaller move costs a TDZ argument a future reader has to re-derive; that cost recurs, extra moved lines are paid once.

**Assembly-order inversions on record.** `makeInitialState` (trunk head) calls `migrate` (a later module), which is safe: runtime-only const arrow. `12_trunk` calls `makeNewCelestialBody` and reads `ALIGNMENT_TYPES`, both now in `22_ephemeris/`, both from inside function bodies. Same class of one-way edge as builder → `EntryForm`.

---

## Architecture (read before touching the slices)

**Glossopoeia, Ephemeris, and Cartographia are VIEWS with their own state slices, not sets of templates.** Pattern: own `state.*` slice, records `{ id, name, tags:[], fields:{} ... }`, rendered through `EntryForm` via a per-type `*Schema(state)` function, registered through the node-source registry so they stay graphable in Concordance, with `migrate()` backfilling the slice arrays. Never model these as `BUILTIN_TEMPLATES` entries.

- **Cartographia slice:** `state.cartographia` is a FLAT array (Stemma-shaped, no per-template grouping). Record `{ id, name, tags:[], fields:{}, mapData:{image,pins}, updatedAt }`. Fixed field ids `cart-fld-description` / `cart-fld-scope-region` / `cart-fld-notes`. The three fields render through `EntryForm` via `cartographiaMapSchema()`; the canvas (`MapView`/`MapEditor`) rides above through the `canvasSlot` prop. Maps register as a node source (`SYNTH_TPL_MAP`), outbound pin edges only, `refEligible:false`.
- **Glossopoeia slice:** `state.glossopoeia` holds 21 record arrays + `workspaceNotes` + `ui`. Record shape `{ id, langId, name, tags:[], fields:{} }`. Full schemas in the frozen Glossopoeia design docs (`docs/glossopoeia-design-handover.md`, `docs/glossopoeia-phase-two.md`).
- **`canvasSlot`.** `EntryView`/`EntryForm` take an optional `canvasSlot` node, rendered between the divider/calendar and the field layout. The Cartographia route fills it; entry routes pass nothing. Use the same slot for any future canvas-over-`EntryForm` view; do not re-add a kind-check.
- **Registry-from-`migrate()` safety:** `migrate()` calls `getRegisteredGraphNodes(state)` before the slice backfills; safe because the registry's `getInstances` accessors are `Array.isArray`-guarded and every call site is runtime. The r001 migration backfills `state.cartographia` and promotes entries-to-slice BEFORE that validation so migrated maps count as valid graph nodes. Preserve this ordering.

**Built-in template count is 20 (user-facing), unchanged.**

---

## Build setup beyond the gates (fresh clone; `/home/claude` and `/tmp` do NOT persist, and can be wiped MID-SESSION)

The repository is the durable state. Commit after every gate-green step and push after every browser pass; a wiped sandbox recovers with `git clone` and the rotation procedure's hash check. Keep every change a script, and never hand-edit the tree.

1. **Finals (release-prep only, not per cut).** Extract each tarball from `deps/` into `inlining/node_modules/` (scoped packages under `@babel/` and `@fontsource/`), then `python3 inlining/build_inline.py finals`. Validate each with `node inlining/validate_html.js inlining/out/<file>` (needs `@babel/parser` on the resolution path; extract it into `inlining/node_modules/@babel/parser` the same way). The working source carries CDN `<script>` links and d3 7.8.5 / babel 7.23.5 in shell.html's head; that is the dev-source form, and `finals` swaps them for inlined, pinned d3 7.9.0 / babel-standalone 7.29.4. Do NOT "fix" the shell head; the zero-external-URLs rule applies to the built finals, not the working source.
2. **Stage** byte-changing builds as `Cartulary_v1.6_Working_r###_(description).html` for Drak's browser pass; they are not committed (regenerable; his NAS archive keeps them). **Dual-build is release-prep only** (not done for r001 through r030).
3. **Tags.** Tag the browser-passed state `r###`; the session's git credential refuses tag pushes, so Drak pushes tags from his clone.

---

## Known carry-forward facts (product-wide)

- **Concordance opens to an empty template filter (r134, by design).** `enabledTemplates` defaults empty; **all** / **none** links recover or clear. Per-session. Do not "fix" back to all-on.
- **Concordance synthetic-node layout persistence (r131-r132).** Synthetic-node positions persist across load; force containment keeps the graph compact.
- **r001 edge cases, accepted.** A map's `calendarId` is dropped. An unsaved map edit is lost on reload. An imported `.template.json` with `kind:"map"` is self-healed by `migrate()`. None blocking.
- **r002-r030 changed no behavior (none intended, none found).** If anything surfaced it would present as a blank panel or load error, not a subtle logic change. Three parity relationships, do not conflate them: (a) r002/r003 were the FIRST gathers, verified by multiset against the r001 body before the reconstitution gate existed; (b) PURE SPLITS reassemble to the active anchor byte-for-byte and emit byte-identical product HTML; (c) GATHERS and other byte-changing cuts change the assembled bytes on purpose, pass on a weaker check, and rotate the anchor. Product HTML changed at r002, r003, r013, r016, r018, r020, r021, r022, r025 (relocation only) and r026 (one comment line rewritten, one added with its blank).
- **In-app help.** r001 fixed the map-specific stale strings. The rest of the v1.6 in-app-help backlog stands.
- **Parent-delete dangling Descended From** (Glossopoeia): tolerated, skip-on-dead-pointer. Not blocking.

---

## cartulary.world (site; non-product, no r-counter): SHIPPED LIVE

Live at cartulary.world (Porkbun static hosting, HTTPS). Two files: `index.html` (splash) + `helloworld.html` (docs), both fully offline, deployed to the domain ROOT together; the repository copies are in `site/`. Build doctrine in `docs/doctrine-site.md`.

**Owed when convenient (not blocking):** the site's Cartographia page frames maps as template-backed entries, which r001 made wrong. The in-app behavior is invisible so there is no urgency; flag it for the post-feature site sweep alongside the editor (pillar 3).

---

## Communication preferences and workflow (enforced globally)

- No narrating tool/backend work step-by-step; run searches, code, file ops silently and lead with the result.
- For parse-green crashes: lead with diagnosis; verification detail to 1-2 lines.
- No restating the question, no end-summary recaps, no volunteered follow-up offers.
- No praise, cheerleading, hedging, motivational framing. Snark/sarcasm welcome.
- **No em dashes in newly authored text.** Verify with Python, not bash grep, and check all four forms (U+2014, `&#8212;`, `&mdash;`, `&#x2014;`). **Exception, locked 2026-09-05 and widened at session 16: the rule governs newly authored text only, and ALL pre-v1.6 content is frozen, docs and source alike.** Measured at session 16: `roadmap.md` 135, `cartulary-doctrine.md` 205, `roadmap-principles.md` 81, `doctrine-code-watch.md` 78, `game-mechanics-pack-reference.md` 37, `drak-profile.md` 11, `doctrine-site.md` 6, plus 1,096 U+2014 and 5 `&mdash;` in the module tree and another 10 U+2014 in `shell.html`, so 1,111 across the source in total, 1,106 of them U+2014 (283 of them in the home-data module, which is user-visible in-app help). None of that is a defect and none of it gets swept. The doc gate measures newly authored text against `docs/.turnover-baseline.json`, which is committed. Avoid the banned adjectives and AI-isms in Drak's preference set.
- Python over PowerShell; .md/.txt only, never .docx.
- Flat pick-one lists for decisions. Proposal-review-implement: propose, Drak reorders/locks, then build. "go/proceed/next/yes/lock/hit it" = implement exactly what was last agreed. Decisions belong to Drak; surface findings that change the shape of planned work BEFORE committing artifacts. Session 16 did this four times, session 18 once (carve order), session 19 twice (the verification-mode fork, the repository), and each time the finding changed the plan.
- **Do not stall on micro-decisions.** When a choice is forced (only one option is safe) or clearly dominated, make it, state it, and say why. Reserve the pick-one list for genuine forks.
- **"Next" is not a browser pass.** After a cut that changes the assembled bytes, confirm the browser pass explicitly before treating it as verified.
- Parse-gate is a HARD gate after every change. Parse-green is not working; for anything that changes bytes, the browser pass is the only proof.
- **Drak is not a coder by trade** (NOC engineer). He directs design/scope/QA; the AI implements. Do not assume he knows what to do with build artifacts. Name the concrete browser things to check after a change, and say plainly which file to open vs which to save.
- **Doc defects that do not affect progress are not a reason to stop.** Drak said so at session 18: fix them at turnover, not before the cut.

---

## Session continuity and cold-start (doc layout)

- Everything is in the repository under `docs/`. This handoff stands alone and is the living current-state document (full rewrite each batch). Frozen/reference docs: `cartographia-plus-spec.md` (the pillar-3 build sheet, frozen at session 19), `cartulary-spine-manifest.md` (the LIVE module map + source layout + carve status + gate design + anchor history, the modularization oracle), `cartulary-modularization-plan.md` (the original release architecture, superseded on boundary decisions by the manifest), `maps-promotion-spec.md` (r001 build sheet, historical), the Glossopoeia design docs, `cartulary-build.md` (pre-modular build notes, historical).
- **Turnover is full integrated documents, history preserved verbatim, never append-snippets.** It is also now a commit: edit the documents in place, run the doc gate, commit, push, and CI runs the gate again. There is no zip and no upload step.
  - **`changelog.md` is the ACTIVE file, current open version only (v1.6).** Closed versions frozen verbatim: `changelog-v1.5.md`, `changelog-v1.4.md`, `changelog-v1.1-v1.3.md`. Append v1.6 sessions to the active file only.
  - **`roadmap.md` is the active forward plan + backlog + pointers;** `roadmap-archive.md` holds frozen retrospectives; `roadmap-principles.md` holds planning/scope/sequencing principles.
  - **`cartulary-doctrine.md` is the active product/build doctrine + dated entries;** `doctrine-code-watch.md` (code-review / bug-pattern catalog, load when coding) and `doctrine-site.md` (cartulary.world build doctrine) are the companions.
  - **`journal-entry.txt` is the newest session's journal entry**, for Drak to paste into his master `journal.txt`; earlier entries live in git history. Moving the master journal into `docs/journal.txt` is his to do when convenient (he holds the file).
  - **The turnover toolchain lives in `tools/turnover/`:** `check_docs.py` (the doc gate), `prove_teeth.py` (its probes; they resolve the checker through `Path(__file__).parent` and must stay beside it), `conventions.md`, `facts.example.json`, and `SKILL.md`. The `cartulary-turnover` skill package in claude.ai is a pointer to these, and any copy of a script inside it is stale by definition; invoke the repository's. `docs/facts.json` is the per-project ground truth the gate checks published figures against, regenerated with `--write-facts` at every turnover; `docs/.turnover-baseline.json` is the em-dash and banned-phrase baseline.
  - **This batch (session 19) changed: handoff (full rewrite), changelog, roadmap, doctrine, manifest, journal entry, `facts.json`, `tools/turnover/SKILL.md` and `conventions.md`.** Committed as one turnover commit after the migration commit.
  - **Turnover documents must be internally consistent before delivery, and that is gated.** A superseding section elsewhere does not retire a stale note; strike stale text at its source. `python3 tools/turnover/check_docs.py --docs docs --src cartulary-src --facts docs/facts.json` must exit 0 before the commit: it checks derived tree figures, newly authored em dashes and banned phrases against the baseline, stale `NN_` filenames, per-file line counts quoted in prose, markdown table shape, published figures against `facts.json`, retired anchors named as live, required strings surviving a correction, carve-span tiling and rule-1 conformance, and `file:line` assertions against the source. `python3 tools/turnover/prove_teeth.py --docs docs --src cartulary-src` re-proves it after any change to the checker or the facts. What the checker does NOT cover, and what still needs an adversarial read: directional and causal claims, whether a doctrine entry is right rather than merely numerate, file placement, and anything absent from `facts.json`.
  - **Filename references decay.** `NN_` prefixes reflow as modules are inserted upstream, so any document naming a carved file goes stale. Re-verify every `NN_name.jsx` reference against the live tree at each turnover (session 16 moved four of them; session 18 changed every prefix from `17` onward; session 19 moved none).
- **r-counter: one bump per FULL carve OR gather OR other byte-changing cut, zero-padded, persists across sessions, resets on VERSION bump.** A pure carve produces byte-identical output, so the counter tracks progress rather than output-byte change. Gate and build tooling changes carry no bump; they ride into the next cut (r004, r023, r025, and the session-19 edit mode). **Current: r030.**
- **Commits.** One commit per gate-green step, the r-number in the message for cuts; `freeze` is a commit; turnover is a commit. Commit messages carry the attribution lines the session is given. The `r###` tag marks the browser-passed state and is pushed by Drak.

---

## Post-pillar backlog (not committed to a specific pillar; pull in as planning warrants)

- **App hooks-extraction** (modularization, deferred): the core is ~75% `App`; shrinking it needs a behavior-preserving refactor the reconstitution gate cannot verify byte-for-byte. Separate risk tier, post-clean-carves.
- **First-step context-completeness gate** (modularization): not built. Lower-priority until the editing workflow goes module-scoped (load spine + one module).
- **Named `utils` module** (modularization, optional): the 43-line `02_trunk` residue arc left by r017.
- **Master journal into the repository** (docs): `docs/journal.txt`, appended per session, with `check_docs.py` treating only the newest entry as live, the way it treats the changelog. Needs Drak's copy of the file and a small checker change (then re-prove teeth).
- **Skill package refresh** (Drak): point the `cartulary-turnover` skill at `tools/turnover/` and drop its script copies, so nothing in it can go stale again.
- **Data-shapes reference doc** (owed in product docs): entry shape (tags is ARRAY not string, fields object keyed by field id), template field shape, key field value shapes (entry-ref with relationKind, calendar-date, calendar-date-range, name-history, repeating-group, spouse decl with marriedOn/endedOn), AND the Cartographia record shape + fixed map-field ids. Prevents assumption bugs like the v1.3 tags-as-string crash.
- **Per-map JSON import/export** (Cartographia): deferred to the later, larger Cartographia work.
- **v1.6 in-app-help backlog** (help-vs-code mismatches; code correct): Field Types help omits Longform Note + Grid; Templates help lists retired Astronomical Body + Language/Glossary; Linea help omits zoom / view-calendar selector / shift-click; Concordance feed omits grid-cell + group-subfield refs; Stemma help omits Delete-node; the "nothing required" get-started line; json-schema celestialBodies orbital-element shape + `month.abbreviation` + calendar `dateFormat`; Glossopoeia nav order; Ephemeris Compute shortcut + Observe stepper; moon/calendar "Celestials" header; Language/Glossary supersede phantom "glossary" type; `timeline-editing` Escape behavior.
- **Game Mechanics pack:** shelved, design-complete, frozen at `packs/game-mechanics-pack-reference.md`.
- **Ephemeris Bug Audit rows** BA-01 / BA-02 / BA-04 (unrun; none blocking).
- **PATCHNOTES.txt format decision:** accumulate per-release vs replace each release. Decide before v1.6 ships. The v1.5 notes are in `docs/release-notes/`; the v1.4 notes and the itch README are still only on Drak's disk.
- Concordance edge labeling polish; marriage feature followup (marriedOn/endedOn on spouse relationKind); entry-ref correctness audit across built-in templates; D.4 native recurrence on calendar-date field type; Concordance sector graph (stars from Ephemeris).
- **Deferred indefinitely:** Stemma v2, world-scoped custom assets (gates Scrap conlang migration), mobile UX, Ephemeris sky-from-surface.

**Doc-debt flagged (not yet actioned):** `cartulary-doctrine.md` still carries `## Feature surface (current as of v1.4)` (~52 lines), now three minors stale (v1.5 Glossopoeia/Ephemeris/Packs and the v1.6 maps slice are absent). Left in place because the fix is a content decision, not a carve: update it to the v1.6 surface or move it to a historical note. Do NOT fabricate a v1.6 surface; rebuild it from the actual feature set when convenient. Drak's call which.
