# Cartulary: Handoff (v1.6 OPEN; pillar 2 view carves complete. r030. Session 18, 2026-10-19)

> **VERSION LINE. READ FIRST.** **v1.5 is SHIPPED** (drakhanas.itch.io/cartulary, 2026-06-26, line closed at r134). **The v1.6 line is OPEN.** Pillar 1 (maps promotion, r001) is done and browser-verified. **Pillar 2 (modularization): every map-independent module is carved.** Nineteen named modules: seventeen flat (home-data r004, modals r005, io-utils r006, temporal r007, persistence r008, calendar-engine r009, export-layer r010, template-builder r011, migrate r012, form-engine/display r014, form-engine/edit r015, builtin-templates r017, field-system r019, stemma r027, linea r028, chronometric r029, kalendarium r030) plus two DIRECTORIES (`glossopoeia/` r023, five parts; `ephemeris/` r024, seven parts). **Nine gather cuts have run** (r002, r003, r013, r016, r018, r020, r021, r022, r025); the first two predate the reconstitution gate and were verified by multiset against the r001 body, so **seven are anchor-rotating gathers**. Say "seven anchor-rotating gathers" or "nine gather cuts"; a bare "seven gathers" contradicts the session-11 record. **The anchor has rotated eight times**, because r026 (a comment edit, neither carve nor gather) rotated it too; the active anchor is `reference-r026-body.jsx`. Current highest source is **r030**. There is no open product bug and no owed ship gate.

> **>>> NEXT: pillar 3, the drawing editor (Cartographia+). Pillar 2 is parked, not finished. <<<** Only `concordance` and `cartographia` remain uncarved, and both are held until after pillar 3 by decision so they carve against their final shapes. Pillar 3's v1 scope and won't-have list are locked in `roadmap.md` under the v1.6 Cartographia+ heading; read that before proposing anything. **Decide the verification mode for content edits before the first editor line lands.** Pillar 3 is entirely content edits, and r026 showed what that looks like under the current gates: neither `verify` nor `gather` can return a verdict on a cut that adds or changes lines on purpose, so r026 was gated on a written delta table matching the `gather` report line for line, plus parse and a browser pass. That worked once, for an edit that rewrote one comment line and inserted two. It does not scale to a feature, and the roadmap carries the open question of whether a third mode earns its keep. That is the first pillar-3 decision, and it belongs to Drak.

> **Where the editor lands in the tree.** All of cartographia sits in `16_trunk` 1294-2051 (758 lines, six declarations, `useMapImageUrl` through `CartographiaIndexView`), behind `SettingsView` (1-265) and concordance (266-1293). Those three spans tile the arc (`265 + 1028 + 758 = 2051`), each leads with its boundary blank and ends on code per rule 1, and they are published so the eventual last two carves have a starting point; pillar 3 will move the cartographia figures and may move the seam, so re-derive before cutting. The live architecture is in `cartulary-spine-manifest.md` (the oracle); the frozen `cartulary-modularization-plan.md` is the original release architecture, superseded on boundary decisions by the manifest.

Read this end-to-end before doing anything. Find code by NAME, never line number, and never by a remembered `NN_` filename (prefixes reflow as modules are inserted upstream; every prefix from `17` onward changed in session 18).

---

## COLD-START PREREQUISITES

**Verify state; do not trust this list's account of it.** A previous edition of this document carried a stale re-sync warning in one section and a correct current-state note in another, two hundred lines apart, and a fresh chat reading top-down got both. One command settles the doc question:

```
ls /mnt/project/handoff.md && grep -n "Status (session" /mnt/project/cartulary-spine-manifest.md && head -1 /mnt/project/journal-entry.txt
```

1. **This handoff must be readable.** It is the document that says "read this first". If the `ls` comes back empty it needs uploading with the bundle.
2. **`/mnt/project/` should match the bundle's r-number.** If the `grep` reports an older session than the bundle filename, re-sync `changelog.md`, `roadmap.md`, `cartulary-doctrine.md`, `cartulary-spine-manifest.md`, `handoff.md`, `journal-entry.txt`, and treat the bundle as authoritative in the meantime. Session 18 opened with `/mnt/project` at r024 across all six documents, one session behind the bundle, and worked from the bundle.
3. **`/mnt/project/build_inline.py` and `/mnt/project/canonicalize.py` ARE STALE and must not be used.** `build_inline.py` carries four deltas, not one: its `REFERENCE_BODY` names `reference-r003-body.jsx` (retired at r013, eight anchors ago), its `module_files()` is the flat `glob` that cannot see directory modules, its `mode_verify()` carries the gate-verdict bug fixed at r023, and it predates both the `gather` mode and the two header checks added at r025. `canonicalize.py` was byte-identical through session 16 but predates `header_pairs()`. All four deltas were re-confirmed at session 18 open. Use the bundle's copies of both. Only `compile_jsx.js`, `validate_html.js`, and `check.js` still come from `/mnt/project`.
4. **The inputs a fresh chat needs:** the source bundle zip (`cartulary-modular-src_r###_*.zip`), the 12 dependency tarballs, and this handoff. **The bundle is the blocking input.** Without it there is no module tree, no anchor, and nothing can be verified, checked for contiguity, or cut. The working HTML is optional (it is an output, not a source). Session 18 opened without the bundle and reconstructed the tree from the staged HTML's babel body plus the published per-arc counts, which was enough to audit the handoff but not enough to cut; when the bundle arrived the reconstruction matched it file for file. Ask for the bundle rather than repeating that.
5. **Post-unzip sanity check, before any work.** Every figure here moves as the tree grows; re-derive rather than trusting a remembered number.
   - module file count → **38** at r030. Count with `rglob`, not `glob`; a flat glob misses every directory part and will silently under-report.
   - total lines → **39,337**. Use `splitlines()`, NOT `wc -l`: at r030, 30 of the 38 files have no trailing newline, so `wc -l` under-reports by exactly 30. This number was 13 at r019, 19 at r023, 26 at r025.
   - `ls cartulary-src/reference-*.jsx` → exactly one file, the active anchor (`reference-r026-body.jsx` at r030)
   - `build_inline.py verify` → GATE GREEN with decl-set **419**
   - the r-number in `changelog.md` matches the bundle filename. If they disagree, trust the bundle and say so.

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

---

## THE SOURCE IS A MODULE TREE

As of r004 the working HTML is no longer the source. The source is:

- `cartulary-src/shell.html` : the page scaffolding, with one `@@CARTULARY_BABEL_BODY@@` sentinel where the babel body injects. The body's trailing newline is owned by the shell.
- `cartulary-src/modules/NN_name.jsx` : a flat module. `NN` is a two-digit assembly-order prefix; `name` is the module/carve name.
- `cartulary-src/modules/NN_name/NN_part.jsx` : a DIRECTORY module (new at r023). The directory carries the outer prefix; each part inside carries its own `00`-based prefix. Two exist: `21_glossopoeia/` and `22_ephemeris/`.
- `cartulary-src/reference-r026-body.jsx` : the frozen parity anchor, **active as of r026**. Every pure carve must reassemble to it byte-for-byte. Retired anchors are not shipped.

The assembler joins with a per-file `rstrip('\n')`, so **no slice may END on a blank line** (boundary rule 1 below; violating it silently drops a line). Every file in the tree leads with a blank, none ends on a blank, and none ends on a comment. That last property is enforced by the gate rather than asserted here: `header placement` fails on any section header sitting in a file with no declaration after it.

These plus `build_inline.py`, `canonicalize.py`, `prove_gate_teeth.py`, and the cut scripts for the session's r-numbers ship as one bundle zip each turnover. That zip replaces "upload the big working HTML" as the cold-start input. A staged working HTML is produced for each cut that CHANGES bytes (every gather, and r026); a pure carve produces identical bytes and gets no separate artifact.

**Current tree (r030), assembly order, with line counts:** `00_trunk` (134) / `01_builtin-templates` (942) / `02_trunk` (43) / `03_persistence` (592) / `04_trunk` (25) / `05_field-system` (774) / `06_calendar-engine` (1291) / `07_temporal` (249) / `08_export-layer` (1520) / `09_trunk` (216) / `10_migrate` (5839) / `11_io-utils` (42) / `12_trunk` (4938) / `13_form-engine-display` (658) / `14_form-engine-edit` (1777) / `15_template-builder` (1111) / `16_trunk` (2051) / `17_chronometric` (1528) / `18_linea` (646) / `19_stemma` (1410) / `20_trunk` (354) / **`21_glossopoeia/`** = `00_schemas` (476) + `01_substrate` (1025) + `02_grammar` (380) + `03_components` (393) + `04_view` (845) / **`22_ephemeris/`** = `00_body-kinds` (187) + `01_shell` (722) + `02_asbo` (1459) + `03_observe` (1937) + `04_forcealign` (585) + `05_compute` (1177) + `06_orbital-math` (1266) / `23_kalendarium` (876) / `24_home-data` (1330) / `25_trunk` (248) / `26_modals` (286) / `27_trunk` (5). Session 18 added two lines (r026) and four arcs (r027-r029 split `16_trunk` three times and left its tail as `20_trunk`; r030 renamed an arc in place).

**38 files, 39,337 lines, 28 arcs.** Nineteen named modules, nine trunk arcs (`00`, `02`, `04`, `09`, `12`, `16`, `20`, `25`, `27`). One of those is not residue: `16_trunk` holds `SettingsView`, concordance, and cartographia, and the last two are the held-back carves. The other eight are residue; `20_trunk` is the node-source registry, spine-owned, and the remaining seven are the ordinary kind. The `NN` prefix is decoupled from the r-number: `01_builtin-templates` was carved at r017, `17_chronometric` at r029.

**Line-count convention.** Every per-arc and per-module line count in this doc set is a Python `splitlines()` count, consistent with the 39,337 total. If a prose figure and a tree figure disagree for the same file, the tree figure is correct and the prose figure is a `wc -l` leak.

**Anchor history.** Pure carves reassemble to the ACTIVE anchor byte-for-byte; gathers move lines on purpose, are gated by multiset instead, and rotate the anchor once browser-verified. r003 anchored r004 through r012, nine r-numbers, across which r003 through r012 shared one output artifact. Then r013 → `reference-r013-body.jsx` (anchored r014-r015); r016 → `reference-r016-body.jsx` (anchored r017); r018 → `reference-r018-body.jsx` (anchored r019); r020 → `reference-r020-body.jsx`; r021 → `reference-r021-body.jsx`; r022 → `reference-r022-body.jsx` (anchored r023-r024); r025 → `reference-r025-body.jsx` (no pure split was ever gated against it: r026 changed bytes and rotated again); r026 → `reference-r026-body.jsx`, **active**, anchoring r027 through r030 and onward. The r026 anchor is 2,008,051 bytes, 203 more than r025, which is one 82-character header plus its blank (184 bytes) and one 81-character header rewritten at 82 (19 bytes), the dash character being three bytes in UTF-8.

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
- **Session 18, r026-r030.** Detail below.

### Session 18 in detail

**Five r-bumps, one artifact.** r026 replaced the last sheared header with two correct ones and rotated the anchor. r027 through r030 carved stemma, linea, chronometric, and kalendarium, all pure splits against the r026 anchor, and the `working` rebuild after every one of them hashes to `2facf10cea574525`, the r026 artifact Drak browser-passed. Pillar 2's map-independent phase is closed; what remains is parked behind pillar 3 by decision.

**Handoff audit first.** The r025 handoff was read against the tree before anything was cut, and held on everything testable: file count, total lines, canonical count, decl-set, the 73-and-35 header census under the rule as stated, the anchor's byte count, the artifact hash, every relocation destination, every carve span and its tiling, every `facts.json` assertion, and the two r026 widths (81 retiring, 82 local convention). Three prose defects, none affecting progress: a stale cross-reference (`not the 81 section 11 states`, when section 11 already said 82, so a reader expecting a contradiction found agreement and distrusted both); `inserts a line into 13_form-engine-display` eight lines from a table that correctly said two; and `run verify (all three checks green)` in the carve procedure paragraph, two sessions after the gate started reporting five. All three were corrected in this edition, and the lesson from the first one is in the doctrine. The source bundle was not among the uploads, so the audit ran on a tree reconstructed from the staged HTML; the bundle arrived afterwards and the reconstruction matched it file for file.

**r026: one header replacing two, 82 characters each.** `14_form-engine-edit:1223` was rewritten in place from `Markdown display + rich text editor` (81 wide) to `Longform + rich text editor`; `Longform + markdown display` was inserted with its blank above `LongformDisplay` in `13_form-engine-display`, the header at line 264 and the declaration at 266. Both edits were string-anchored so per-file trailing-newline state was untouched. Every predicted signal came in exactly as the r025 table stated: raw 39,335 → 39,337, multiset RED missing one and extra two, canonical 37,303 against 37,302, byte-identity differs, decl-set PASS at 419, placement PASS at 0, header pairs 74 with exactly the three named changes (`Markdown display + rich text editor -> LongformEditor` removed, `Longform + rich text editor -> LongformEditor` and `Longform + markdown display -> LongformDisplay` added). Parse OK. Browser pass by Drak on the Longform Note field in both directions (display, which is the markdown render with page-break splits, and edit, which is the rich-text toolbar). Then rotation by the gather procedure, because the gather procedure is the rotation procedure and r026 changed bytes on purpose; the r025 edition of this document specced every r026 signal and never said the anchor would have to rotate, which was its one real omission. Frozen-equals-assembled held, `REFERENCE_BODY` and its docstring were repointed, the retired anchor deleted, `verify` green at 37,303 / 419 / exact / 74 / 0, and the post-rotation rebuild hashed to the file actually passed.

**The sandbox reset between turns and took the working directory with it.** Nothing was lost because nothing lived only there: r026 was replayed from the r025 bundle with the same script, the anchor froze to the same 2,008,051 bytes and the same sha, and the rebuilt `working` hashed to the browser-passed artifact before anything else was cut. The rotation procedure's last step is also the recovery check after an environment loss, and that is now doctrine.

**r027 through r029, back to front on purpose.** Three carves shared `16_trunk`, and their published spans were stated as line numbers inside that arc. Carving front to back would have invalidated every later span the moment the first cut landed, three re-derivations by the same class of script that got the spans wrong in two earlier editions. Carving back to front leaves every remaining span numerically untouched: stemma (4226-5635) left first and the arc became 1-4225 with linea still at 3580-4225; linea left and the arc became 1-3579 with chronometric still at 2052-3579; chronometric left and the head arc is 1-2051. Every seam was printed and read before slicing, all four matched the published spans line for line, and every cut script asserted its members by name, its seam lines, and rule 1 at both ends before writing anything. Each `16_trunk` cut reflowed everything downstream, which is the stated cost of the procedure and is why the directory prefixes moved from `17`/`18` to `21`/`22`.

**r030 was a rename.** The kalendarium arc (numbered 19 at r025, 23 after the reflow) had been kalendarium end to end since r025 moved its two-line tail, so the carve renamed the file to `23_kalendarium.jsx` with no reflow and no residue. Same shape as `11_io-utils`.

**Two harness defects, both caught by the harness.** The r027 script's pre-flight existence check aborted before writing anything, reporting that a rename destination already existed, because the check tested every destination against the tree as it stood and the trunk arc numbered 23 was both a destination (from the arc numbered 21) and a source (to `25_trunk`). The reverse-order rename handles that at mutation time; the pre-check did not model it. Fixed to exempt destinations that are also sources. Then `prove_gate_teeth.py` crashed on the reflowed tree because its misfile probe hard-coded the kalendarium and home-data paths by their r025 prefixes, 19 and 20, which had become 23 and 24. It now resolves the home-data module by its name suffix and takes whichever file precedes it in assembly order. That is the filename-decay class of defect, inside a probe harness, one session after the doctrine entry about filename decay in documents.

**Verification posture.** r026: GATHER RED by design, every signal matching the written table, parse OK, browser pass by Drak, rotation to `reference-r026-body.jsx` with the post-rotation rebuild confirmed byte-identical (sha256 `2facf10cea574525`) to the artifact passed. r027-r030: GATE GREEN each (sequence PASS at 37,303, decl-set PASS at 419, byte-identity exact, header pairs PASS at 74, header placement PASS at 0), `working` rebuild hashing to `2facf10cea574525` each time, so no browser pass and no separate parse run was owed: the bytes are the bytes that passed. Teeth re-proven on the final tree, seven probes, all bit. **Dual-build finals have NOT been cut for r001 through r030** (release-prep only).

---

## v1.6 SHAPE (the release plan)

1. **Maps promotion**: **DONE (r001, browser-verified).**
2. **Modularization**: **map-independent phase DONE** (shared tier r004-r019, views r023-r030, header integrity r025-r026). Two carves parked for after pillar 3. Invisible if successful.
3. **Drawing editor (Cartographia+).** The map-creation feature. The only user-visible pillar. Built into the now-sliced, now-modular Cartographia. **NEXT.**

**Why this order:** maps-promotion first isolated the migration risk; modularize before the editor so the largest feature is built against clean seams; carve the map-coupled modules (Concordance, Cartographia) last, against their final shapes, to avoid a re-carve.

---

## Modularization state (read before any carve)

The authoritative module map is `cartulary-spine-manifest.md` (section 10 for source layout, carve status, gate design, and anchor history). Summary:

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
cd /home/claude/inlining && python3 build_inline.py verify
Reconstitution-parity gate (pure split)
  canonical sequence : PASS (37303 non-blank lines vs reference 37303)
  decl-name set      : PASS (419 names)
  byte-identity      : exact
  header pairs       : PASS (74 headers)
  header placement   : PASS (0 misfiled)

GATE GREEN
```

**A gather uses `build_inline.py gather`, a mode since r025.** Sequence and byte-identity are expected to differ on a relocation, so the verdict is multiset + decl-name set + RAW LINE COUNT + header placement, all scored, with the header-pair diff reported rather than scored (a gather may legitimately move a header with its block, so a pair change is a decision point, not a failure). It was a hand-retyped snippet in this document through r024 and drifted once into a flat `MODULES_DIR.glob()` that stopped seeing directory parts at r023; a check that lives in prose decays. Expected for a good gather: GATHER GREEN, MULTISET PASS, decl-set PASS at 419, canonical lines equal at 37,303, raw line count PASS at 39,337, header placement 0 misfiled. `assemble_body()` is also how the anchor is frozen after a gather.

**Why `raw_ok` has to be scored.** On a gather, multiset, decl-set, and canonical sequence ALL run on blank-stripped lines and byte-identity is expected to differ, so a dropped or added BLANK line is invisible to every other scored check. Cutting a block that leaves its file ending on a blank loses that line to the assembler's per-file `rstrip('\n')`: one line, 39,336 against 39,337, and the destination does not change it. Reaching 39,335 takes a second rule-1 violation stacked on the first.

**Why `header placement` is separate from `header pairs`.** `header_pairs()` runs on the assembled body, where file boundaries do not exist. A header sitting at the tail of one module and labelling the head of the next pairs CORRECTLY and the check cannot see it. The kalendarium arc's tail was exactly that shape before r025. The placement check reads each file on its own and fails any section header with no declaration after it in that file.

**Teeth re-proof, mandatory after any change to the assembler, the gate, or the tree's numbering.** `python3 prove_gate_teeth.py`, seven mutation probes, each injecting one defect into a throwaway copy and asserting the right check goes RED. Every probe must read OK; a MISS is a blind spot, and you fix the check, never the probe. The script re-anchors each sandbox on the CURRENT tree before mutating, so it still says something true between a gather and its rotation, which is exactly when someone reaches for it. Since r030 its misfile probe resolves the home-data module by name rather than by `NN` prefix, because the r027-r029 reflow broke the hard-coded path. Do not confuse it with `prove_teeth.py`, which probes the DOC gate (`check_docs.py`).

```
OK  drop one code line        verify  sequence FAIL + decl-set FAIL
OK  drop one BLANK line       verify  sequence PASS, decl PASS, byte differs, RED
OK  rename one declaration    verify  sequence FAIL + decl-set FAIL
OK  shear a section header    verify  header pairs FAIL, retargeted named
OK  shear a section header    gather  everything else PASS, GREEN, pair diff the only signal
OK  misfile a header          verify  byte-identity EXACT, placement the only FAIL
OK  drop one BLANK line       gather  multiset PASS, decl PASS, raw FAIL, RED
```

**Carve procedure (proven on 19 carves).** Locate the module's members BY NAME in the current tree; confirm contiguity (gather first if scattered, as a separate cut); **print the actual seam lines and read them before slicing**; slice with the boundary discipline; write the new module file(s), reflowing the `NN` prefixes so assembly order stays contiguous (a mid-tree carve renumbers everything downstream); run `verify` (all five checks green) and the parse gate; browser-check only if the bytes changed; deliver the tree as a bundle. One r-bump per full carve. **When several carves share one arc and their spans are published as line numbers, carve back to front:** the runs nearest the arc's tail leave first, so every span ahead of them keeps its line numbers, and nothing has to be re-derived between cuts. Session 18 did three this way and never re-measured.

**Boundary discipline (five rules, all earned):**
1. **Boundary blanks LEAD the following file. No slice may END on a blank.** The assembler's per-file `rstrip('\n')` silently eats a trailing blank, dropping a line from the output. Canonical sequence will NOT catch this; only byte-identity will.
2. The body's trailing newline stays in the shell, not in the last module.
3. A section header travels with its block.
4. A doc-comment travels with its declaration.
5. **A doc comment can sit behind a blank line, which defeats a walk-back.** Finding a comment block's start by walking backward over `//` lines fails whenever the author left a blank between the comment and the code, and the failure looks like a plausible span rather than an error. This bit twice in r021, and then bit again in the session-16 turnover itself: three of the four published pending-carve line counts were wrong because the measuring script had the same defect. It bit a third time at r025, where a sweep script reading with a bare `split(chr(10))` handed a phantom trailing blank to the 8 files that carry a trailing newline and tripped its own rule-1 assertion on a file it never touched. Print the eight lines around every cut point and read them; a computed span is a hypothesis, the seam lines are the evidence.

**Companion note to rules 3 and 4.** Section headers in the current tree ARE trustworthy block labels, and the gate keeps them that way. r025 relocated eleven sheared section headers to the blocks they name and r026 replaced the one that named two blocks; `header pairs` and `header placement` are what stop the next one accumulating. The mechanism that produced them is still live and needs conscious handling on every relocation: a cut moves a declaration and its doc comment because those are adjacent, and leaves the section header behind because there is usually a blank between the header and the comment. Rule 3 is not automatic. **Zero sheared headers remain.** Confirm every seam against DECLARATION NAMES, and treat a pair diff on a gather as a question to answer rather than noise to clear. History, census, and the header rule: manifest section 11.

**Gather procedure (seven anchor-rotating gathers: r013, r016, r018, r020, r021, r022, r025; the same rotation ran once more at r026).** Each gather is its own r-bump: relocate the scattered members into one contiguous run (only position changes, no code), run `build_inline.py gather` (byte-identity will NOT hold, on purpose), parse gate, **then STOP for the browser pass**. Only after it passes: freeze the assembled body as `reference-r0NN-body.jsx` via `assemble_body()`, confirm frozen-equals-assembled, repoint `REFERENCE_BODY` and its docstring line in `build_inline.py`, delete the retired anchor, re-verify green, then rebuild `working` and confirm the rebuild is byte-identical to the artifact that was actually browser-passed. That last step catches a rotation that froze the wrong body, and it is also the recovery check after an environment loss: a replay from the bundle is correct when its rebuild hashes to the artifact that passed. **Never freeze an unverified body.** Do the gathers one at a time; do not batch them into a single relayout. **Any cut that changes assembled bytes rotates the anchor**, whether or not it is a gather; r026 was a comment edit and rotated.

**Browser passes: when they are owed and when they are not.** A gather always owes one; it changes bytes on purpose and is gated on a weaker check. So does any other byte-changing cut (r026). A pure split whose byte-identity against the active anchor is exact AND whose assembled artifact hashes equal to one already passed owes nothing, because the product provably did not change and the gate is what proves the enumeration ordered correctly. r003-r012 shared one artifact across ten r-numbers on exactly this basis, as did r023-r024 and r026-r030. Keep the exception narrow; ritual verification erodes the meaning of the real ones.

**Eval-order check before any relocation.** What matters is definition-time vs call-time reference, not source order. Function declarations hoist and are always safe. Const arrows are safe to move above their callees provided the reference sits INSIDE the arrow body (resolved at call time); an initializer that runs at eval time (e.g. `const X_SET = new Set(X_TYPES)`) must keep its dependency above it and should travel with it. Prefer the smaller relocation, EXCEPT where the smaller move costs a TDZ argument a future reader has to re-derive; that cost recurs, extra moved lines are paid once.

**Assembly-order inversions on record.** `makeInitialState` (trunk head) calls `migrate` (a later module), which is safe: runtime-only const arrow. `12_trunk` calls `makeNewCelestialBody` and reads `ALIGNMENT_TYPES`, both now in `22_ephemeris/`, both from inside function bodies. Same class of one-way edge as builder → `EntryForm`.

---

## Architecture (read before touching the slices)

**Glossopoeia, Ephemeris, and Cartographia are VIEWS with their own state slices, not sets of templates.** Pattern: own `state.*` slice, records `{ id, name, tags:[], fields:{} ... }`, rendered through `EntryForm` via a per-type `*Schema(state)` function, registered through the node-source registry so they stay graphable in Concordance, with `migrate()` backfilling the slice arrays. Never model these as `BUILTIN_TEMPLATES` entries.

- **Cartographia slice:** `state.cartographia` is a FLAT array (Stemma-shaped, no per-template grouping). Record `{ id, name, tags:[], fields:{}, mapData:{image,pins}, updatedAt }`. Fixed field ids `cart-fld-description` / `cart-fld-scope-region` / `cart-fld-notes`. The three fields render through `EntryForm` via `cartographiaMapSchema()`; the canvas (`MapView`/`MapEditor`) rides above through the `canvasSlot` prop. Maps register as a node source (`SYNTH_TPL_MAP`), outbound pin edges only, `refEligible:false`.
- **Glossopoeia slice:** `state.glossopoeia` holds 21 record arrays + `workspaceNotes` + `ui`. Record shape `{ id, langId, name, tags:[], fields:{} }`. Full schemas in the frozen Glossopoeia design docs.
- **`canvasSlot`.** `EntryView`/`EntryForm` take an optional `canvasSlot` node, rendered between the divider/calendar and the field layout. The Cartographia route fills it; entry routes pass nothing. Use the same slot for any future canvas-over-`EntryForm` view; do not re-add a kind-check.
- **Registry-from-`migrate()` safety:** `migrate()` calls `getRegisteredGraphNodes(state)` before the slice backfills; safe because the registry's `getInstances` accessors are `Array.isArray`-guarded and every call site is runtime. The r001 migration backfills `state.cartographia` and promotes entries-to-slice BEFORE that validation so migrated maps count as valid graph nodes. Preserve this ordering.

**Built-in template count is 20 (user-facing), unchanged.**

---

## Cold-start build setup (fresh chat; `/home/claude` and `/tmp` do NOT persist, and can be wiped MID-SESSION)

The input is the source bundle zip, not a single HTML. Session 18 lost its working directory between two turns with no warning; everything was recoverable because every cut was a script in the bundle and the artifact hash said when the replay was right. Keep it that way: no hand edits to the tree, every cut a script, and re-bundle before any long pause.

1. **The 12 dependency tarballs** are the offline set: `babel-standalone-7_29_4.tgz`, `d3-7_9_0.tgz`, `fontsource-cormorant-garamond-5_2_11.tgz`, `fontsource-dm-sans-5_2_8.tgz`, `helper-string-parser-7_24_8.tgz`, `helper-validator-identifier-7_28_5.tgz`, `jszip-3_10_1.tgz`, `marked-4_3_0.tgz`, `parser-7_25_3.tgz`, `react-18_2_0.tgz`, `react-dom-18_2_0.tgz`, `types-7_25_2.tgz`.
2. **Unzip the source bundle** into `/home/claude/`. It contains `cartulary-src/` (shell.html + modules/ + the active anchor) and `inlining/` (`build_inline.py`, `canonicalize.py`, `prove_gate_teeth.py`, and the cut scripts `r025_sweep.py` through `r030_carve_kalendarium.py`). The scripts hardcode `/home/claude/{cartulary-src,inlining}`, so the two directories must sit directly under `/home/claude/`. **Use the bundle's copies of `build_inline.py` and `canonicalize.py`, never `/mnt/project`'s** (see prerequisite 3). Only `compile_jsx.js`, `validate_html.js`, and `check.js` come from `/mnt/project`.
3. **Assemble + gate.** `cd /home/claude/inlining && python3 build_inline.py verify` (expect GATE GREEN: canonical sequence PASS at 37,303, decl-set PASS at 419, byte-identity exact, header pairs PASS at 74, header placement PASS). `python3 build_inline.py working` writes the assembled working HTML to `inlining/out/cartulary-working.html`; at r030 it hashes to sha256 `2facf10cea574525`. For a relocation cut use `python3 build_inline.py gather` instead.
4. **Parse gate.** `mkdir -p /tmp/babelcheck; cp /mnt/project/check.js /tmp/babelcheck/check.js`. `check.js` needs only `@babel/parser` and reads the hardcoded path `/home/claude/cartulary.html`. **Npm-free path (reliable, used since session 14):** `mkdir -p /tmp/babelcheck/node_modules/@babel/parser && tar -xzf /mnt/user-data/uploads/parser-7_25_3.tgz -C /tmp/babelcheck/node_modules/@babel/parser --strip-components=1`. Then `cp /home/claude/inlining/out/cartulary-working.html /home/claude/cartulary.html && cd /tmp/babelcheck && node check.js` (expect `PARSE OK`).
5. **Finals (release-prep only, not per carve).** Extract each tarball into `/home/claude/inlining/node_modules/` (scoped packages under `@babel/` and `@fontsource/`), then `python3 build_inline.py finals`. Validate each with `node validate_html.js out/<file>`. The working source carries CDN `<script>` links and d3 7.8.5 / babel 7.23.5 in shell.html's head; that is the dev-source form, and `finals` swaps them for inlined, pinned d3 7.9.0 / babel-standalone 7.29.4. Do NOT "fix" the shell head; the zero-external-URLs rule applies to the built finals, not the working source.
6. **Stage** byte-changing builds via `present_files` as `Cartulary_v1.6_Working_r###_(description).html`; deliver the updated tree as a bundle zip every time. **Dual-build is release-prep only** (not done for r001 through r030).

---

## Known carry-forward facts (product-wide)

- **Concordance opens to an empty template filter (r134, by design).** `enabledTemplates` defaults empty; **all** / **none** links recover or clear. Per-session. Do not "fix" back to all-on.
- **Concordance synthetic-node layout persistence (r131-r132).** Synthetic-node positions persist across load; force containment keeps the graph compact.
- **r001 edge cases, accepted.** A map's `calendarId` is dropped. An unsaved map edit is lost on reload. An imported `.template.json` with `kind:"map"` is self-healed by `migrate()`. None blocking.
- **r002-r030 changed no behavior (none intended, none found).** If anything surfaced it would present as a blank panel or load error, not a subtle logic change. Three parity relationships, do not conflate them: (a) r002/r003 were the FIRST gathers, verified by multiset against the r001 body before the reconstitution gate existed; (b) PURE SPLITS reassemble to the active anchor byte-for-byte and emit byte-identical product HTML; (c) GATHERS and other byte-changing cuts change the assembled bytes on purpose, pass on a weaker check, and rotate the anchor. Product HTML changed at r013, r016, r018, r020, r021, r022, r025 (relocation only) and r026 (one comment line rewritten, one added with its blank).
- **In-app help.** r001 fixed the map-specific stale strings. The rest of the v1.6 in-app-help backlog stands.
- **Parent-delete dangling Descended From** (Glossopoeia): tolerated, skip-on-dead-pointer. Not blocking.

---

## cartulary.world (site; non-product, no r-counter): SHIPPED LIVE

Live at cartulary.world (Porkbun static hosting, HTTPS). Two files: `index.html` (splash) + `helloworld.html` (docs), both fully offline, deployed to the domain ROOT together. Build doctrine in the `doctrine-site.md` companion.

**Owed when convenient (not blocking):** the site's Cartographia page frames maps as template-backed entries, which r001 made wrong. The in-app behavior is invisible so there is no urgency; flag it for the post-feature site sweep alongside the editor (pillar 3).

---

## Communication preferences and workflow (enforced globally)

- No narrating tool/backend work step-by-step; run searches, code, file ops silently and lead with the result.
- For parse-green crashes: lead with diagnosis; verification detail to 1-2 lines.
- No restating the question, no end-summary recaps, no volunteered follow-up offers.
- No praise, cheerleading, hedging, motivational framing. Snark/sarcasm welcome.
- **No em dashes in newly authored text.** Verify with Python, not bash grep, and check all four forms (U+2014, `&#8212;`, `&mdash;`, `&#x2014;`). **Exception, locked 2026-09-05 and widened at session 16: the rule governs newly authored text only, and ALL pre-v1.6 content is frozen, docs and source alike.** Measured at session 16: `roadmap.md` 135, `cartulary-doctrine.md` 205, `roadmap-principles.md` 81, `doctrine-code-watch.md` 78, `game-mechanics-pack-reference.md` 37, `drak-profile.md` 11, `doctrine-site.md` 6, plus 1,096 U+2014 and 5 `&mdash;` in the module tree and another 10 U+2014 in `shell.html`, so 1,111 across the source in total, 1,106 of them U+2014 (283 of them in the home-data module, which is user-visible in-app help). None of that is a defect and none of it gets swept; the earlier phrasing named only two files, which left the other ~1,300 without cover and invited a phantom cleanup. Anything written or rewritten from here on is clean. Avoid the banned adjectives and AI-isms in Drak's preference set.
- Python over PowerShell; .md/.txt only, never .docx.
- Flat pick-one lists for decisions. Proposal-review-implement: propose, Drak reorders/locks, then build. "go/proceed/next/yes/lock/hit it" = implement exactly what was last agreed. Decisions belong to Drak; surface findings that change the shape of planned work BEFORE committing artifacts. Session 16 did this four times (the ephemeris contiguity finding, the sub-module scatter finding, the orbital-math grouping, and the assembler change), and each time the finding changed the plan. Session 18 did it once (carve order), and that changed the plan too.
- **Do not stall on micro-decisions.** When a choice is forced (only one option is safe) or clearly dominated, make it, state it, and say why. Reserve the pick-one list for genuine forks.
- **"Next" is not a browser pass.** After a cut that changes the assembled bytes, confirm the browser pass explicitly before treating it as verified.
- Parse-gate is a HARD gate after every change. Parse-green is not working; for anything that changes bytes, the browser pass is the only proof.
- **Drak is not a coder by trade** (NOC engineer). He directs design/scope/QA; the AI implements. Do not assume he knows what to do with build artifacts. Name the concrete browser things to check after a change, and say plainly which file to open vs which to save.
- **Doc defects that do not affect progress are not a reason to stop.** Drak said so at session 18: fix them at turnover, not before the cut.

---

## Session continuity and cold-start (doc layout)

- This handoff stands alone and is the living current-state document (full rewrite each batch). Frozen/reference docs: `cartulary-spine-manifest.md` (the LIVE module map + source layout + carve status + gate design + anchor history, the modularization oracle), `cartulary-modularization-plan.md` (the original release architecture, superseded on boundary decisions by the manifest), `maps-promotion-spec.md` (r001 build sheet, historical), Glossopoeia design docs.
- **Turnover is full integrated documents, history preserved verbatim, never append-snippets.**
  - **`changelog.md` is the ACTIVE file, current open version only (v1.6).** Closed versions frozen verbatim: `changelog-v1.5.md`, `changelog-v1.4.md`, `changelog-v1.1-v1.3.md`. Append v1.6 sessions to the active file only.
  - **`roadmap.md` is the active forward plan + backlog + pointers;** `roadmap-archive.md` holds frozen retrospectives; `roadmap-principles.md` holds planning/scope/sequencing principles.
  - **`cartulary-doctrine.md` is the active product/build doctrine + dated entries;** `doctrine-code-watch.md` (code-review / bug-pattern catalog, load when coding) and `doctrine-site.md` (cartulary.world build doctrine) are the companions.
  - **The turnover toolchain ships INSIDE the `cartulary-turnover` skill package**, not here and not in the source bundle: `check_docs.py` (the doc gate), `prove_teeth.py` (its probes, which resolve the checker through `Path(__file__).parent` and must stay beside it), and `conventions.md` (per-document authoring rules). Invoke them by skill path. Only `facts.json` travels with the documents, because it is per-project state regenerated each session rather than skill code. Build tooling is a separate toolchain with a separate home in the bundle's `inlining/`; one home each, or they drift. **Deliver each set as ONE zip**, because loose file cards mean one upload per file and a chance to miss one. **The skill's `prove_teeth.py` is owed an update:** the copy in the skill package hard-codes the r025 file-and-line figure in its published-figure probe and the r025 span and assertion shapes in two more, so three of its ten probes stopped proving anything the moment the tree changed. The corrected copy, which derives all three targets from `facts.json`, is in the turnover zip; replace the skill's copy with it.
  - **This batch (session 18) changed: changelog, roadmap, doctrine, handoff, manifest, `facts.json`.** Also delivered: the corrected `prove_teeth.py` for the skill package, the r030 source bundle, and the staged working HTML r026 (the artifact for r026 through r030). Unchanged, not re-shipped: the changelog archives, roadmap-archive, roadmap-principles, doctrine-code-watch, doctrine-site, the frozen modularization plan. `journal-entry.txt` is the one new session entry for Drak to paste into `/mnt/transcripts/journal.txt`.
  - **Turnover documents must be internally consistent before delivery, and that is gated.** A superseding section elsewhere does not retire a stale note; strike stale text at its source. `check_docs.py --docs DOCS --src SRC --facts DOCS/facts.json` must exit 0 before anything is handed over: it checks derived tree figures, newly authored em dashes and banned phrases against a baseline, stale `NN_` filenames, per-file line counts quoted in prose, markdown table shape, published figures against `facts.json`, retired anchors named as live, required strings surviving a correction, carve-span tiling and rule-1 conformance, and `file:line` assertions against the source. `prove_teeth.py --docs DOCS --src SRC` re-proves it after any change to the checker or the facts. What the checker does NOT cover, and what still needs an adversarial read: directional and causal claims, whether a doctrine entry is right rather than merely numerate, file placement, and anything absent from `facts.json`. Session 18 found one thing in that last class: the manifest stated the four carve spans in three sections and only one had been updated at r025, and nothing fired because spans in prose are not a `published` pattern. The duplicates are gone; the spans now live in one place.
  - **Filename references decay.** `NN_` prefixes reflow as modules are inserted upstream, so any document naming a carved file goes stale. Re-verify every `NN_name.jsx` reference against the live tree at each turnover (session 16 moved four of them; session 18 changed every prefix from `17` onward).
- **r-counter: one bump per FULL carve OR gather OR other byte-changing cut, zero-padded, persists across sessions, resets on VERSION bump.** A pure carve produces byte-identical output, so the counter tracks progress rather than output-byte change. **Current: r030.**
- **`/mnt/project/` sync.** Run prerequisite 1's command rather than trusting a written status here. **`build_inline.py` and `canonicalize.py` are both known to be owed**, with the deltas named in prerequisite 3. The doc-sync status is stated in the prerequisites and nowhere else, deliberately: an earlier edition carried a second, staler account of it here, and a fresh chat reading top-down got both.

---

## Post-pillar backlog (not committed to a specific pillar; pull in as planning warrants)

- **App hooks-extraction** (modularization, deferred): the core is ~75% `App`; shrinking it needs a behavior-preserving refactor the reconstitution gate cannot verify byte-for-byte. Separate risk tier, post-clean-carves.
- **First-step context-completeness gate** (modularization): not built. Lower-priority until the editing workflow goes module-scoped (load spine + one module).
- **Named `utils` module** (modularization, optional): the 43-line `02_trunk` residue arc left by r017.
- **A verification mode for content edits** (modularization tooling, decide before pillar 3): see the NEXT banner.
- **Data-shapes reference doc** (owed in product docs): entry shape (tags is ARRAY not string, fields object keyed by field id), template field shape, key field value shapes (entry-ref with relationKind, calendar-date, calendar-date-range, name-history, repeating-group, spouse decl with marriedOn/endedOn), AND the Cartographia record shape + fixed map-field ids. Prevents assumption bugs like the v1.3 tags-as-string crash.
- **Per-map JSON import/export** (Cartographia): deferred to the later, larger Cartographia work.
- **v1.6 in-app-help backlog** (help-vs-code mismatches; code correct): Field Types help omits Longform Note + Grid; Templates help lists retired Astronomical Body + Language/Glossary; Linea help omits zoom / view-calendar selector / shift-click; Concordance feed omits grid-cell + group-subfield refs; Stemma help omits Delete-node; the "nothing required" get-started line; json-schema celestialBodies orbital-element shape + `month.abbreviation` + calendar `dateFormat`; Glossopoeia nav order; Ephemeris Compute shortcut + Observe stepper; moon/calendar "Celestials" header; Language/Glossary supersede phantom "glossary" type; `timeline-editing` Escape behavior.
- **Game Mechanics pack:** shelved, design-complete, frozen at `game-mechanics-pack-reference.md`.
- **Ephemeris Bug Audit rows** BA-01 / BA-02 / BA-04 (unrun; none blocking).
- **PATCHNOTES.txt format decision:** accumulate per-release vs replace each release. Decide before v1.6 ships.
- Concordance edge labeling polish; marriage feature followup (marriedOn/endedOn on spouse relationKind); entry-ref correctness audit across built-in templates; D.4 native recurrence on calendar-date field type; Concordance sector graph (stars from Ephemeris).
- **Deferred indefinitely:** Stemma v2, world-scoped custom assets (gates Scrap conlang migration), mobile UX, Ephemeris sky-from-surface.

**Doc-debt flagged (not yet actioned):** `cartulary-doctrine.md` still carries `## Feature surface (current as of v1.4)` (~52 lines), now three minors stale (v1.5 Glossopoeia/Ephemeris/Packs and the v1.6 maps slice are absent). Left in place because the fix is a content decision, not a carve: update it to the v1.6 surface or move it to a historical note. Do NOT fabricate a v1.6 surface; rebuild it from the actual feature set when convenient. Drak's call which.
