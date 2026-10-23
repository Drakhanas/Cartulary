# Cartulary: Handoff (no line open: v1.6 shipped 2026-10-23, line closed at r051; v1.7 not yet opened. Session 19, 2026-10-23)

> **VERSION LINE. READ FIRST.** **v1.6 is SHIPPED** (drakhanas.itch.io/cartulary, 2026-10-23, line closed at r051; the `v1.6` tag is on `8554fdf`). The finals are `Cartulary_v1.6.html` (2,890,891 bytes, sha256 `b99381a041153d9d`) and `Cartulary_v1.6_Readable.html` (6,359,585 bytes, sha256 `e748142eadb3e1aa`), and a clean checkout of the tagged tree rebuilds both byte for byte. **No line is open.** v1.7 opens with the `VERSION` bump in `inlining/build_inline.py` (it reads `'1.6'`); the first product edit after it is r001, and that cut also flips the two version literals in `08_export-layer` (the HTML export's `generator` meta tag and its footer line). There is no open product bug and no owed ship gate.

> **>>> NEXT: nothing is owed. <<<** What v1.7 holds is Drak's call. The backlog lives in one place, `docs/roadmap.md`, and this handoff does not copy it. The three shapes on the table: a feature headline (the Concordance sector graph is the only backlog item sized for one), a consolidation release (`App` hooks-extraction and the remaining housekeeping), or waiting to see what the first public issues ask for.

> **This handoff is current state only.** The v1.6 build record, cut by cut with every gate figure and hash, is frozen in `docs/changelog-v1.6.md`, and the handoff as it stood at the close of the line is frozen in `docs/handoff-v1.6.md`. Read those for history; nothing here repeats them.

Read this end to end before doing anything. Find code by NAME, never by line number, and never by a remembered `NN_` filename: the prefixes reflow whenever a module is inserted upstream.

---

## Cold start

**Verify state; do not trust this file's account of it.** The repository is the only input. Clone it and let the gates say what state it's in.

1. **Clone.** Attach `Drakhanas/Cartulary` to the session with push access and clone it (`git clone https://github.com/Drakhanas/Cartulary`). The repository is public since the v1.6 ship, with issues enabled. Every path below is relative to the clone root; the build, the gates, and the parse check derive their paths from their own location, so the clone can sit anywhere, including Drak's local clone at `D:\Git\_Cartulary`.
2. **Read** this file, then `docs/roadmap.md`. Before any turnover, read `tools/turnover/conventions.md`.
3. **Sanity check, before any work.** Every figure moves as the tree grows; re-derive it.
   - `git log --oneline -3` and `git status`: on `main`, clean.
   - Module files: **44**. Count with `rglob`; a flat glob misses every directory part.
   - Total lines: **44,095**, counted with `splitlines()`. 36 of the 44 files have no trailing newline, so `wc -l` under-reports by exactly 36.
   - `ls cartulary-src/reference-*`: exactly two files, the active anchor and its layout, `reference-r051-body.jsx` and `reference-r051-layout.json`.
   - `python3 inlining/build_inline.py verify`: GATE GREEN, sequence PASS at 41,911, decl-set PASS at 510, byte-identity exact, header pairs at 77, header placement at 0.
   - `python3 inlining/build_inline.py edit` on the untouched tree: EDIT GREEN.

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

4. **Parse gate setup**, once per session; nothing comes from the network:

```
mkdir -p babelcheck/node_modules/@babel/parser
tar -xzf deps/parser-7.25.3.tgz -C babelcheck/node_modules/@babel/parser --strip-components=1
python3 inlining/build_inline.py working && node babelcheck/check.js
```

`check.js` reads `inlining/out/cartulary-working.html` by default, or the path given as its first argument. Expect `PARSE OK`.

5. **Doc gate:** `python3 tools/turnover/check_docs.py --docs docs --src cartulary-src --facts docs/facts.json` (expect DOCS GREEN) and `python3 tools/turnover/prove_teeth.py --docs docs --src cartulary-src` (expect ten probes OK).
6. **What is not in the repository, on purpose.** Staged working HTMLs and release finals: they rebuild byte for byte from the tree (`working` at r051 hashes to sha256 `5be00252d31a679c`, the artifact Drak passed; every earlier cut's hash is in `changelog-v1.6.md`), and Drak's NAS archive keeps the files. `node_modules/` and `inlining/out/` are ignored. The claude.ai Project holds Drak's profile, the two SRD PDFs, and five slow-changing companions that are also in `docs/` or `packs/` (`roadmap-principles.md`, `doctrine-code-watch.md`, `doctrine-site.md`, `cartulary-modularization-plan.md`, `game-mechanics-pack-reference.md`); the repository copy is canonical if they ever disagree.

---

## The tree

The working HTML is not the source. The source is:

- `cartulary-src/shell.html`: the page scaffolding, with one `@@CARTULARY_BABEL_BODY@@` sentinel where the babel body goes. The body's trailing newline belongs to the shell.
- `cartulary-src/modules/NN_name.jsx`: a flat module. `NN` is the two-digit assembly order; `name` is the module.
- `cartulary-src/modules/NN_name/NN_part.jsx`: a directory module. The directory carries the outer prefix and each part its own `00`-based one. Three exist: `18_cartographia/`, `23_glossopoeia/`, and `24_ephemeris/`.
- `cartulary-src/reference-r051-body.jsx`: the frozen parity anchor, active as of r051. Found by glob, never named in code: exactly one `reference-r###-body.jsx` may exist, and the gate refuses on zero or two. Its companion `reference-r051-layout.json` holds the per-file line counts that segment it, its sha256, and the shell's text and sha256; `edit` needs it and `freeze` writes it.

**Assembly is ordered concatenation**, never dependency resolution: the modules are joined in path order with a per-file `rstrip('\n')` and injected at the sentinel. Resolution would reorder declarations and break both byte parity and evaluation order. Because of the `rstrip`, **no file may end on a blank line** (boundary rule 1 below); every file leads with a blank, none ends on a blank, and none ends on a comment.

**Current tree (r051), assembly order, with line counts:** `00_trunk` (134) / `01_builtin-templates` (942) / `02_trunk` (43) / `03_persistence` (592) / `04_trunk` (25) / `05_field-system` (774) / `06_calendar-engine` (1291) / `07_temporal` (249) / `08_export-layer` (1576) / `09_trunk` (221) / `10_migrate` (5850) / `11_io-utils` (42) / `12_trunk` (4965) / `13_form-engine-display` (658) / `14_form-engine-edit` (1777) / `15_template-builder` (1111) / `16_trunk` (265) / `17_concordance` (1028) / **`18_cartographia/`** = `00_model` (1096) + `01_renderer` (380) + `02_tools` (2121) + `03_view` (1286) + `04_index` (348) / `19_chronometric` (1528) / `20_linea` (646) / `21_stemma` (1410) / `22_trunk` (354) / **`23_glossopoeia/`** = `00_schemas` (476) + `01_substrate` (1025) + `02_grammar` (380) + `03_components` (393) + `04_view` (845) / **`24_ephemeris/`** = `00_body-kinds` (187) + `01_shell` (722) + `02_asbo` (1459) + `03_observe` (1937) + `04_forcealign` (585) + `05_compute` (1177) + `06_orbital-math` (1266) / `25_kalendarium` (876) / `26_home-data` (1516) / `27_trunk` (248) / `28_modals` (286) / `29_trunk` (5).

**44 files, 44,095 lines, 30 arcs.** Twenty-one named modules (eighteen flat, three directories) and nine trunk arcs (`00`, `02`, `04`, `09`, `12`, `16`, `22`, `27`, `29`), all residue: `16_trunk` holds `SettingsView` alone, `22_trunk` is the node-source registry, `02_trunk` is the util wedge (`genId`, `fmtDate`, `isoNow`, `slugify`, the two snapshot formatters). The `NN` prefix is not the r-number: `17_concordance` was carved at r049.

**Where the map editor lives.** All of cartographia is `18_cartographia/` (5,231 lines, ninety-five declarations), cut at its five section headers at r048: `00_model` (1,096 lines, `MAP_PALETTE` through `MapStampGlyph`), `01_renderer` (380, `mapNum` through `useImageNaturalSize`), `02_tools` (2,121, `MAP_TOOLS` through `MapEditorOverlay`), `03_view` (1,286, `useMapImageUrl` through `MapEditor`), `04_index` (348, `MapStampImportButton` through `CartographiaIndexView`). Until r048 it shared one arc with Concordance and Settings that tiled `265 + 1028 + 5233 = 6526`. `08_export-layer` calls into it at export time (`renderMapHtml` to `buildMapDrawingTree`), a one-way runtime edge; `12_trunk` renders its views.

**Line-count convention.** Every per-file count in the doc set is a Python `splitlines()` count. If a prose figure and a tree figure disagree, the tree is right and the prose is a `wc -l` leak.

**The anchor.** The r051 anchor is 2,298,604 bytes, sha256 `50480113ab7f5382`. The anchor has rotated twenty-seven times: at the seven anchor-rotating gathers, at r026, and at every content cut from r031 through r047 and at r050 and r051. A pure carve never rotates it. The full rotation history is in the manifest's section 10.

The live module map, the carve record, and the gate design are in `docs/cartulary-spine-manifest.md`. `docs/cartulary-modularization-plan.md` is the original architecture, superseded on boundary decisions by the manifest.

---

## The gates

**The build gate is `build_inline.py verify` with `canonicalize.py`.** It scores five checks and a pure split must pass all five: canonical sequence, decl-name set, byte-identity, header pairs, header placement. Two of the five are scored because a check that's printed but left out of the verdict reads as coverage while providing none: `byte_ok` scored wrong from r004 to r023 and `raw_ok` from r004 to r025, and both were found by trying to fool the gate.

```
python3 inlining/build_inline.py verify
Reconstitution-parity gate (pure split)
  canonical sequence : PASS (41911 non-blank lines vs reference 41911)
  decl-name set      : PASS (510 names)
  byte-identity      : exact
  header pairs       : PASS (77 headers)
  header placement   : PASS (0 misfiled)

GATE GREEN
```

**A gather uses `build_inline.py gather`.** Sequence and byte-identity differ on a relocation by design, so it scores the multiset, the decl-name set, the raw line count, and header placement, and reports the header-pair diff without scoring it. A good gather: GATHER GREEN, decl-set PASS at 510, raw line count PASS at 44,095, header placement 0 misfiled.

**A content edit uses `build_inline.py edit --files ... [--add ...] [--remove ...] [--shell]`.** It holds every undeclared file byte-identical to its anchor segment and scores the layout's freshness, the file set, the declared declaration delta, rule-1 shape per file, header placement, and the shell. It writes the in-scope diff to `inlining/out/edit-diff.patch`, which is the review artifact: read it. A good cut is EDIT GREEN with a diff that reads as the change intended and nothing else.

**Why the raw count is scored.** On a gather the other checks run on blank-stripped lines, so a dropped blank line is invisible to all of them. A cut that leaves a file ending on a blank loses that line to the assembler's `rstrip`. On a content edit, `edit`'s rule-1 check catches the same class on the raw text.

**Why `header placement` is separate from `header pairs`.** Pairs run on the assembled body, where file boundaries don't exist, so a header at the tail of one module labelling the head of the next pairs correctly. Placement reads each file alone and fails a section header with no declaration after it. r025 swept eleven sheared section headers to the blocks they name, and r026 replaced the last one; zero sheared headers remain.

**Gate teeth.** `python3 inlining/prove_gate_teeth.py` runs eighteen mutation probes, each injecting one defect into a throwaway copy of the current tree and asserting the right check goes red (or, for the positive control and the two reported-not-scored cases, green with the right signal). Every probe must read OK; a MISS is a blind spot, and the fix goes in the check, never the probe. Run it after any change to the assembler, the gate, or the tree's numbering. `tools/turnover/prove_teeth.py` is a different script: it probes the doc gate.

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

**The doc gate** is `tools/turnover/check_docs.py`. It checks the six working documents (this file, the changelog, the roadmap, the doctrine, the manifest, the journal entry) against the tree and `docs/facts.json`: derived tree figures, newly authored em dashes and banned phrases against `docs/.turnover-baseline.json`, stale `NN_` filenames, per-file line counts quoted in prose, table shape, published figures, retired anchors named as live, required strings, carve-span tiling, and `file:line` assertions against the source. `prove_teeth.py` re-proves it with ten probes after any change to the checker or the facts. What it does not cover still needs a read: directional and causal claims, whether a doctrine entry is right rather than merely numerate, and anything absent from `facts.json`. One known blind spot: a retired anchor named on a line that also carries an arrow passes, because the arrow reads as a history marker.

**CI.** `.github/workflows/` runs verify, working, the parse gate, the gate teeth, the doc gate, and the doc-gate teeth on every push and on every tag push, with nothing fetched from the network.

---

## Procedures

Each is stated here once.

**Content cut.** Script the change into `inlining/cuts/r###_description.py`, string-anchored, every anchor asserted to occur exactly once; no hand edits to the tree, so a wiped sandbox can replay from the repository. A cut script is not idempotent: to replay it, `git checkout <prior sha> -- <files>` first. Then `build_inline.py edit` with the declared files and declarations, read the diff, parse gate, `working`, and stage the working HTML as `Cartulary_v<version>_Working_r###_(description).html`. Run a headless probe of the change where one can be written, and commit the cut locally; it is pushed only after the pass, the freeze, and the turnover. **Stop for Drak's browser pass**, naming the concrete things to check and which file to open. After the pass: `freeze r###`, `verify`, rebuild `working` and confirm its hash equals the file he passed, commit the freeze, then the turnover. One cut per r-number.

**Pure carve** (proven on 21 carves). Locate the module's members by name; confirm they're contiguous (gather first, as its own cut, if they aren't); print the seam lines and read them before slicing; slice under the boundary rules; write the new file or directory, reflowing the downstream `NN` prefixes so assembly order stays contiguous; `verify` must pass all five checks; parse gate; `freeze` with no name rewrites the active anchor's layout for the new file set; `verify` again. A pure carve changes no byte, so it owes no browser pass and does not rotate the anchor. When several carves share one arc and their spans are published, carve back to front, so every span ahead keeps its line numbers.

**Boundary rules, all earned.**
1. Boundary blanks lead the following file; no file may end on a blank. The assembler's `rstrip` eats a trailing blank. Canonical sequence won't catch it; byte-identity will, and on a content edit `edit`'s rule-1 check will.
2. The body's trailing newline stays in the shell, not in the last module.
3. A section header travels with its block.
4. A doc comment travels with its declaration.
5. A doc comment can sit behind a blank line, which defeats a walk-back over `//` lines and produces a plausible wrong span. Print the lines around every cut point; a computed span is a hypothesis and the seam lines are the evidence.

**Gather.** Its own r-number: relocate the scattered members into one contiguous run (position only, no code), `gather`, parse gate, stop for the browser pass, then `freeze r###`, `verify`, and the hash check. One gather at a time.

**When a browser pass is owed.** Every cut that changes the assembled bytes owes one: every gather and every content cut. A pure carve whose byte-identity against the active anchor is exact owes nothing, because the product provably did not change. Keep that exception narrow.

**Rotation.** `build_inline.py freeze r###` writes the assembled body as the new anchor with its layout, confirms frozen equals assembled, and deletes the retired pair. Then `verify` (byte-identity exact) and rebuild `working`: its hash must equal the artifact that was passed. That check catches a rotation that froze the wrong body, and it's the recovery check after a lost sandbox. Never freeze a body that hasn't passed.

**Eval-order check before any relocation.** What matters is definition time against call time, not source order. Function declarations hoist. A const arrow may sit above its callees when the reference is inside its body; an initializer that runs at evaluation (`const X_SET = new Set(X_TYPES)`) keeps its dependency above it. Assembly-order inversions on record, all call-time and safe: `makeInitialState` calls `migrate`; `12_trunk` calls into `24_ephemeris/`; `08_export-layer` calls cartographia's renderer.

**Turnover.** After every cut, and at any session close that changed the record: edit the documents in place to match the tree, run the doc gate (DOCS GREEN) and `prove_teeth.py`, sweep every added line for em dashes and banned phrases, commit, push, and wait for CI on the head commit. `--write-facts FILE` regenerates the derived section of `facts.json`; published figures, assertions, spans, and required strings are edited by hand when the documents change what they state. The six documents' roles and rules are in `tools/turnover/conventions.md`.

**Finals** (release prep only, never per cut). Extract each tarball in `deps/` into `inlining/node_modules/` (scoped packages under `@babel/` and `@fontsource/`; the exact loop is in the repository README), then `python3 inlining/build_inline.py finals`, then `node inlining/validate_html.js` on each output. `finals` inlines the libraries and both fonts, precompiles the JSX, and swaps the shell head's CDN tags (d3 7.8.5, babel 7.23.5, the dev form) for pinned d3 7.9.0 and babel-standalone 7.29.4. Do not "fix" the shell head: the zero-external-URL rule is about the built finals. Finals are never committed.

**Tags.** `r###` marks a passed state and goes on the commit CI went green on, which after a cut is its turnover commit; a bare freeze commit is doc-gate red until its turnover lands. A tag push re-runs CI on the tagged commit. The session's git credential refuses tag pushes, so Drak tags from his clone with the three lines `git pull` / `git tag rNNN <sha>` / `git push origin rNNN`. `v1.6` is on `8554fdf`.

**Opening and closing a line.** A line closes when the finals are live (the upload, not the build). At the close, the changelog freezes to `changelog-v<version>.md`, this handoff freezes to `handoff-v<version>.md`, and the version's plan and session blocks move from the roadmap to `roadmap-archive.md`, all verbatim; the live files start over with current state. A line opens with the `VERSION` bump; the r-counter restarts at r001 with the first product edit, which flips the export's version literals.

**Commits.** One commit per gate-green step, the r-number in the message for cuts; a freeze is a commit and a turnover is a commit. Commits are signed, authored as `Claude <noreply@anthropic.com>`, and end with the attribution lines the session is given. Nothing is pushed ahead of the browser pass it depends on.

**The r-counter.** One bump per carve, gather, or other byte-changing cut, zero-padded, persistent across sessions, reset by the `VERSION` bump. Tooling changes and site edits carry no bump. **Current: r051, the last of the v1.6 line.**

---

## Architecture

**Glossopoeia, Ephemeris, and Cartographia are views with their own state slices, not sets of templates.** Each owns a `state.*` slice of records shaped `{ id, name, tags:[], fields:{} ... }`, renders its fields through `EntryForm` with a per-type `*Schema()` function, registers through the node-source registry so it's graphable in Concordance, and has `migrate()` backfill its arrays. Never model these as `BUILTIN_TEMPLATES` entries.

- **`state.cartographia`** is a flat array of map records `{ id, name, tags:[], fields:{}, mapData:{ image, pins, drawing }, updatedAt }`, with the fixed field ids `cart-fld-description`, `cart-fld-scope-region`, `cart-fld-notes` rendered through `cartographiaMapSchema()`. `drawing` is `{ width, height, background, layers }`; a layer is vector (shapes) or raster (one bitmap, stored like a map image: a folder file `<map id>-<layer id>.<ext>` or a data URL). `ensureMapData` normalizes on every load and coerces rather than throws. Maps register as `SYNTH_TPL_MAP` with outbound pin edges only and `refEligible:false`. The JSON shapes are in the in-app help's JSON Save File Schema topic.
- **`state.mapStamps`**: stamps imported from stamp packs, world-scoped, ids namespaced by pack (`forest__pine`), every SVG body sanitized on import and again on load.
- **`state.glossopoeia`**: 21 record arrays plus `workspaceNotes` and `ui`, records `{ id, langId, name, tags:[], fields:{} }`. The schemas are in the frozen design docs `docs/glossopoeia-design-handover.md` and `docs/glossopoeia-phase-two.md`.
- **`canvasSlot`.** `EntryView` and `EntryForm` take an optional canvas node rendered above the fields; Cartographia fills it. Reuse it for any future canvas-over-form view.
- **The registry runs from `migrate()`** before the slice backfills, which is safe because every `getInstances` accessor is `Array.isArray`-guarded. The r001 migration promotes map entries to the slice before that validation, so migrated maps count as graph nodes. Keep that order.

**The built-in template count is 20.**

---

## Carry-forward facts

- **Zero network requests is a rule** (Drak, 2026-10-23, r051): a request anywhere in the application is a defect to cut, not a feature with a fallback. The SVG download embeds the map font from the page's own inline stylesheet; the development build, whose head loads fonts by link, falls back to the viewer's serif in the download, and that's expected.
- **Concordance opens with an empty template filter** (v1.5 r134, by design); **all** and **none** recover it. Don't "fix" it back to all-on.
- **Synthetic-node positions persist** across reload, with force containment keeping the graph compact (v1.5 r131-r132).
- **r001 edge cases, accepted:** a map's `calendarId` is dropped; an unsaved map edit is lost on reload; an imported `.template.json` with `kind:"map"` is self-healed by `migrate()`.
- **Pre-v1.6 em dashes are frozen.** The rule governs newly authored text only. At the session-16 count the source carried 1,111 older ones, 283 of them in the in-app help, and none get swept.
- **The undo history covers the map editor only.** Everywhere else, Version History and the exported `.json` are the safety net.

---

## The site and the release artifacts

**cartulary.world** is live on Porkbun static hosting with HTTPS: `index.html` (the splash) and `helloworld.html` (the docs), both fully offline, deployed together to the domain root. The repository copies are in `site/`, and at the v1.6 ship the live files were byte-identical to them (`helloworld.html` sha256 `150f79959a6ffa40`, checked by hashing the served bytes). Site edits carry no r-number; the site's doctrine is `docs/doctrine-site.md`.

**`docs/release-notes/`** holds one patch-notes file per version (`Cartulary_v1.5_PatchNotes.txt`, `Cartulary_v1.6_PatchNotes.txt`) and, for v1.6, the public copy in `v1.6/`: `itch-page.html` and `devlog-1.6.html` in the live pages' own markup (pulled from the published pages, so the next rewrite starts from the real thing), and `README.md` for the zip. The repository's own `README.md` is the public face of the repository.

---

## Working with Drak

- Lead with the result. No narrating tool work, no restating the question, no end-summary recaps, no volunteered follow-up offers, no praise or motivational framing. Snark and sarcasm are welcome.
- **No em dashes in newly authored text**, checked in Python across all four forms (U+2014, `&#8212;`, `&mdash;`, `&#x2014;`), and none of the banned phrases in his preference set.
- `.md` and `.txt` only, never `.docx`. Python over PowerShell.
- **Proposal, review, implement.** A decision with real alternatives is a fork: lettered options with a recommendation, then build exactly what he picks. "Go", "proceed", "yes", "lock", "all as rec" mean implement what was last agreed. A choice that's forced or clearly dominated is made, stated, and explained, not forked.
- **Surface any finding that changes the shape of planned work before committing to it.**
- **"Next" is not a browser pass.** After a byte-changing cut, confirm the pass explicitly.
- **Drak is not a coder by trade** (a NOC engineer). He directs design, scope, and QA; the AI implements. Name the concrete things to check after a change, and say plainly which file to open and which to save.
- Doc defects that don't block progress get fixed at turnover, not before the cut.
- A file card in the conversation is a snapshot: a re-sent draft gets a commit suffix in its filename.

---

## The documents

Everything is in the repository under `docs/`, `tools/turnover/`, and `inlining/cuts/`.

- **The six working documents**, gated: this handoff (current state), `changelog.md` (append-only, the open line only; between lines, the gap's sessions), `roadmap.md` (the backlog, edited in place, then a dated session log), `cartulary-doctrine.md` (rules, each with the incident that taught it), `cartulary-spine-manifest.md` (the module map and gate design), and `journal-entry.txt` (the newest session's entry, for Drak's master `journal.txt`). Their rules are in `tools/turnover/conventions.md`.
- **Frozen archives**, never edited and outside the gate: `changelog-v1.6.md`, `changelog-v1.5.md`, `changelog-v1.4.md`, `changelog-v1.1-v1.3.md`, `handoff-v1.6.md`, and `roadmap-archive.md` (plans, session blocks, and retrospectives of shipped versions).
- **Reference documents:** `roadmap-principles.md` (planning and scope principles, plus the v1.5 session blocks carved out with them, including the deferred CSV-import and variant-filter plans), `doctrine-code-watch.md` (the code-review catalog), `doctrine-site.md` (the site's doctrine), `cartographia-plus-spec.md` (the map editor's frozen build sheet, with the won't-have list in section 7), `maps-promotion-spec.md` (the r001 build sheet), `cartulary-modularization-plan.md`, and the two Glossopoeia design documents.
- **The turnover toolchain** is `tools/turnover/`: `check_docs.py`, `prove_teeth.py` (which resolves the checker beside itself, so they stay together), `conventions.md`, `facts.example.json`, and `SKILL.md`. The `cartulary-turnover` skill package in claude.ai is a pointer to these, and any script copy inside it is stale by definition; always run the repository's. `docs/facts.json` is the ground truth the gate checks against; `docs/.turnover-baseline.json` is the em-dash and banned-phrase baseline.
- **Filename references decay.** Re-verify every `NN_name` reference against the live tree at each turnover; the doc gate checks the ones in the six working documents.
