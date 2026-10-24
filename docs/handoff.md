# Cartulary: Handoff (no line open: v1.6.1 shipped 2026-10-23 from r052; v1.7 not yet opened. Session 19, 2026-10-23)

> **VERSION LINE. READ FIRST.** **v1.6.1 is SHIPPED** (drakhanas.itch.io/cartulary, 2026-10-23), the project's first patch, built from the r052 tree: `Cartulary_v1.6.1.html` (2,891,667 bytes, sha256 `d9125ed013be5641`) and `Cartulary_v1.6.1_Readable.html` (6,360,482 bytes, sha256 `c10c693bbacbe9e6`), rebuilt byte for byte from the tagged tree. It fixes one bug that shipped in v1.5 and v1.6: `migrate()` kept an entry-ref value only if it was an entry's id, so references to astronomical bodies, Glossopoeia records, and maps vanished from top-level fields with a target list at every load, import, and snapshot restore (`docs/entry-ref-audit.md`). r052 keeps such a reference when its source is among the field's targets. Its tags are `v1.6.1_r052` on `956fd03`, the first in the `v<version>_r###` form, and `v1.6.1_Release` on the ship-turnover commit, which Drak pushes. One gap is known and not fixed: a world made in v1.4 loses these references the first time v1.5 or later opens it, because its converted fields still list the retired Astronomical Body template's id (the roadmap has it). **No line is open.** v1.7 opens with its `VERSION` bump in `inlining/build_inline.py` (it reads `'1.6.1'`); its first product edit is r001, tagged `v1.7_r001`, and it flips the export's two version literals (the `generator` meta tag and the footer line) from v1.6.1. Three stale product strings are on the roadmap's backlog for that cut: a Concordance help line, the in-app schema topic's missing `longform` and `grid` shapes with the site's wrong `grid`, and an Ephemeris note that still names v1.5; the site's line saying there's no repository is a site edit. **v1.6 is SHIPPED** too, the same day, from the r051 tree (the `v1.6` tag is on `8554fdf`): `Cartulary_v1.6.html` (2,890,891 bytes, sha256 `b99381a041153d9d`) and `Cartulary_v1.6_Readable.html` (6,359,585 bytes, sha256 `e748142eadb3e1aa`).

> **>>> NEXT: v1.7, the Letters and Pipes update, not yet opened. <<<** Letters is everything but the writing: a new view for planning a story down to its scenes and their beats, with Stemma v2 alongside. Pipes is the deficiencies a new adversarial review raised, with Drak's own entry import added, in the roadmap since 2026-10-23, each checked against the tree and each with Drak's call, and the two things v1.6.1 left (the v1.4 upgrade path and the Map target) are there too. The before-code list, the carry-in fixes, and the backlog are in `docs/roadmap.md`, and this handoff does not copy them.

> **This handoff is current state only.** The v1.6 build record, cut by cut with every gate figure and hash, is frozen in `docs/changelog-v1.6.md` (v1.6.1's r052 is in `docs/changelog.md`), and the handoff as it stood at the close of the line is frozen in `docs/handoff-v1.6.md`. Read those for history; nothing here repeats them.

Read this end to end before doing anything. Find code by NAME, never by line number, and never by a remembered `NN_` filename: the prefixes reflow whenever a module is inserted upstream.

---

## Cold start

**Verify state; do not trust this file's account of it.** The repository is the only input. Clone it and let the gates say what state it's in.

1. **Clone.** Attach `Drakhanas/Cartulary` to the session with push access and clone it (`git clone https://github.com/Drakhanas/Cartulary`). The repository is public since the v1.6 ship, with issues enabled. Every path below is relative to the clone root; the build, the gates, and the parse check derive their paths from their own location, so the clone can sit anywhere, including Drak's local clone at `D:\Git\_Cartulary`.
2. **Read** this file, then `docs/roadmap.md`. Before any turnover, read `tools/turnover/conventions.md`.
3. **Sanity check, before any work.** Every figure moves as the tree grows; re-derive it.
   - `git log --oneline -3` and `git status`: on `main`, clean.
   - Module files: **44**. Count with `rglob`; a flat glob misses every directory part.
   - Total lines: **44,110**, counted with `splitlines()`. 36 of the 44 files have no trailing newline, so `wc -l` under-reports by exactly 36.
   - `ls cartulary-src/reference-*`: exactly two files, the active anchor and its layout, `reference-r052-body.jsx` and `reference-r052-layout.json`.
   - `python3 inlining/build_inline.py verify`: GATE GREEN, sequence PASS at 41,926, decl-set PASS at 510, byte-identity exact, header pairs at 77, header placement at 0.
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
6. **What is not in the repository, on purpose.** Staged working HTMLs and release finals: they rebuild byte for byte from the tree (`working` at r052 hashes to sha256 `d8369c86696f8f46`, the artifact Drak passed; r052's record is in `changelog.md`, and every earlier cut's hash is in `changelog-v1.6.md`), and Drak's NAS archive keeps the files. `node_modules/` and `inlining/out/` are ignored. The claude.ai Project holds Drak's profile, the two SRD PDFs, and five slow-changing companions that are also in `docs/` or `packs/` (`roadmap-principles.md`, `doctrine-code-watch.md`, `doctrine-site.md`, `cartulary-modularization-plan.md`, `game-mechanics-pack-reference.md`); the repository copy is canonical if they ever disagree.

---

## The tree

The working HTML is not the source. The source is:

- `cartulary-src/shell.html`: the page scaffolding, with one `@@CARTULARY_BABEL_BODY@@` sentinel where the babel body goes. The body's trailing newline belongs to the shell.
- `cartulary-src/modules/NN_name.jsx`: a flat module. `NN` is the two-digit assembly order; `name` is the module.
- `cartulary-src/modules/NN_name/NN_part.jsx`: a directory module. The directory carries the outer prefix and each part its own `00`-based one. Three exist: `18_cartographia/`, `23_glossopoeia/`, and `24_ephemeris/`.
- `cartulary-src/reference-r052-body.jsx`: the frozen parity anchor, active as of r052. Found by glob, never named in code: exactly one `reference-r###-body.jsx` may exist, and the gate refuses on zero or two. Its companion `reference-r052-layout.json` holds the per-file line counts that segment it, its sha256, and the shell's text and sha256; `edit` needs it and `freeze` writes it.

**Assembly is ordered concatenation**, never dependency resolution: the modules are joined in path order with a per-file `rstrip('\n')` and injected at the sentinel. Resolution would reorder declarations and break both byte parity and evaluation order. Because of the `rstrip`, **no file may end on a blank line** (boundary rule 1 below); every file leads with a blank, none ends on a blank, and none ends on a comment.

**Current tree (r052), assembly order, with line counts:** `00_trunk` (134) / `01_builtin-templates` (942) / `02_trunk` (43) / `03_persistence` (592) / `04_trunk` (25) / `05_field-system` (774) / `06_calendar-engine` (1291) / `07_temporal` (249) / `08_export-layer` (1576) / `09_trunk` (221) / `10_migrate` (5865) / `11_io-utils` (42) / `12_trunk` (4965) / `13_form-engine-display` (658) / `14_form-engine-edit` (1777) / `15_template-builder` (1111) / `16_trunk` (265) / `17_concordance` (1028) / **`18_cartographia/`** = `00_model` (1096) + `01_renderer` (380) + `02_tools` (2121) + `03_view` (1286) + `04_index` (348) / `19_chronometric` (1528) / `20_linea` (646) / `21_stemma` (1410) / `22_trunk` (354) / **`23_glossopoeia/`** = `00_schemas` (476) + `01_substrate` (1025) + `02_grammar` (380) + `03_components` (393) + `04_view` (845) / **`24_ephemeris/`** = `00_body-kinds` (187) + `01_shell` (722) + `02_asbo` (1459) + `03_observe` (1937) + `04_forcealign` (585) + `05_compute` (1177) + `06_orbital-math` (1266) / `25_kalendarium` (876) / `26_home-data` (1516) / `27_trunk` (248) / `28_modals` (286) / `29_trunk` (5).

**44 files, 44,110 lines, 30 arcs.** Twenty-one named modules (eighteen flat, three directories) and nine trunk arcs (`00`, `02`, `04`, `09`, `12`, `16`, `22`, `27`, `29`), all residue: `16_trunk` holds `SettingsView` alone, `22_trunk` is the node-source registry, `02_trunk` is the util wedge (`genId`, `fmtDate`, `isoNow`, `slugify`, the two snapshot formatters). The `NN` prefix is not the r-number: `17_concordance` was carved at r049.

**Where the map editor lives.** All of cartographia is `18_cartographia/` (5,231 lines, ninety-five declarations), cut at its five section headers at r048: `00_model` (1,096 lines, `MAP_PALETTE` through `MapStampGlyph`), `01_renderer` (380, `mapNum` through `useImageNaturalSize`), `02_tools` (2,121, `MAP_TOOLS` through `MapEditorOverlay`), `03_view` (1,286, `useMapImageUrl` through `MapEditor`), `04_index` (348, `MapStampImportButton` through `CartographiaIndexView`). Until r048 it shared one arc with Concordance and Settings that tiled `265 + 1028 + 5233 = 6526`. Cartographia and `08_export-layer` call each other at run time, both from inside function bodies: the HTML export's `renderMapHtml` calls into cartographia's model and renderer (`ensureMapData`, `buildMapDrawingTree`, `mapTreeToString`, and others), and the download in `03_view` calls the export layer's `loadImageNaturalSizeForExport`. `12_trunk` renders the views.

**Line-count convention.** Every per-file count in the doc set is a Python `splitlines()` count. If a prose figure and a tree figure disagree, the tree is right and the prose is a `wc -l` leak.

**The anchor.** The r052 anchor is 2,299,501 bytes, sha256 `1dbfec5bbafcdaa2`. The anchor has rotated twenty-eight times: at the seven anchor-rotating gathers, at r026, at every content cut from r031 through r047, and at r050, r051, and v1.6.1's r052. A pure carve never rotates it. The full rotation history is in the manifest's section 10.

The live module map, the carve record, and the gate design are in `docs/cartulary-spine-manifest.md`. `docs/cartulary-modularization-plan.md` is the original architecture, superseded on boundary decisions by the manifest.

---

## The gates

**The build gate is `build_inline.py verify` with `canonicalize.py`.** It scores five checks and a pure split must pass all five: canonical sequence, decl-name set, byte-identity, header pairs, header placement. Byte-identity is scored because a check that's printed but left out of the verdict reads as coverage while providing none: `byte_ok` was wrong from r004 to r023. `gather`'s raw line count (`raw_ok`) was the same defect from r004 to r025. Both were found by trying to fool the gate.

```
python3 inlining/build_inline.py verify
Reconstitution-parity gate (pure split)
  canonical sequence : PASS (41926 non-blank lines vs reference 41926)
  decl-name set      : PASS (510 names)
  byte-identity      : exact
  header pairs       : PASS (77 headers)
  header placement   : PASS (0 misfiled)

GATE GREEN
```

**A gather uses `build_inline.py gather`.** Sequence and byte-identity differ on a relocation by design, so it scores the multiset, the decl-name set, the raw line count, and header placement, and reports the header-pair diff without scoring it. A good gather: GATHER GREEN, decl-set PASS at 510, raw line count PASS at 44,110, header placement 0 misfiled.

**A content edit uses `build_inline.py edit --files ... [--add ...] [--remove ...] [--shell]`.** It holds every undeclared file byte-identical to its anchor segment and scores the layout's freshness, the file set, the declared declaration delta, rule-1 shape per file, header placement, and the shell. It writes the in-scope diff to `inlining/out/edit-diff.patch`, which is the review artifact: read it. A good cut is EDIT GREEN with a diff that reads as the change intended and nothing else.

**Why the raw count is scored.** On a gather the other checks run on blank-stripped lines, so a dropped blank line is invisible to all of them. A cut that leaves a file ending on a blank loses that line to the assembler's `rstrip`. On a content edit, `edit`'s rule-1 check catches the same class on the raw text.

**Why `header placement` is separate from `header pairs`.** Pairs run on the assembled body, where file boundaries don't exist, so a header at the tail of one module labelling the head of the next pairs correctly. Placement reads each file alone and fails a section header with no declaration after it. r025 swept eleven sheared section headers to the blocks they name, and r026 replaced the last one; zero sheared headers remain.

**Gate teeth.** `python3 inlining/prove_gate_teeth.py` runs eighteen mutation probes, each injecting one defect into a throwaway copy of the current tree and asserting the right check goes red (or, for four of them, green with the right signal: the positive control, the two header shears that are reported rather than scored, and the declared shell change). Every probe must read OK; a MISS is a blind spot, and the fix goes in the check, never the probe. A probe that crashes, rather than reading OK or MISS, is a defect in the harness, and that one is fixed in the probe: `prove_gate_teeth.py` targets `11_io-utils.jsx` and `02_trunk.jsx` by name, so a cut that renames either updates the probes in the same cut. Run it after any change to the assembler, the gate, or the tree's numbering. `tools/turnover/prove_teeth.py` is a different script: it probes the doc gate.

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

**The doc gate** is `tools/turnover/check_docs.py`. It checks the six working documents (this file, the changelog, the roadmap, the doctrine, the manifest, the journal) against the tree and `docs/facts.json`. The stale-filename, line-count, published-figure, and retired-anchor checks read only each document's live region (the changelog's newest session block, the roadmap's newest dated block, the journal's newest entry, the other three whole); the em-dash, banned-phrase, table, and required-string checks read whole files. It checks derived tree figures, newly authored em dashes and banned phrases against `docs/.turnover-baseline.json`, stale `NN_` filenames, per-file line counts quoted in prose, table shape, published figures, retired anchors named as live, required strings, carve-span tiling, and `file:line` assertions against the source. `prove_teeth.py` re-proves it with ten probes after any change to the checker or the facts. What it does not cover still needs a read: directional and causal claims, whether a doctrine entry is right rather than merely numerate, and anything absent from `facts.json`. One known blind spot: the retired-anchor check excuses any line carrying a history marker (an arrow, or any of retired, anchored, rotation, history, stale, superseded, "was the", formerly, "no longer"), so a retired anchor named on such a line passes. Read every line that names an anchor by hand at each rotation.

**CI.** `.github/workflows/` runs verify, working, the parse gate, the gate teeth, the doc gate, and the doc-gate teeth on every push and on every tag push, with nothing fetched from the network. Every step fails the run on a miss; the doc-gate teeth have since 2026-10-23, when `prove_teeth.py` started exiting non-zero on a MISS (before that it only printed one).

---

## Procedures

Each is stated here once.

**Content cut.** Script the change into `inlining/cuts/v<version>_r###_description.py`: the cut's tag, then a snake_case description (`v1.7_r001_text_fixes.py`; v1.6's scripts keep their bare `r###_` names). String-anchor it, every anchor asserted to occur exactly once, and have it find the repository by what it holds, never by counting folders or by an absolute path: `ROOT = next(p for p in Path(__file__).resolve().parents if (p / 'cartulary-src').is_dir())`. No hand edits to the tree, so a wiped sandbox can replay from the repository: every script from v1.6's r031 on reproduces its tag exactly when run against the tag before it (checked 2026-10-23), and r025 through r030, which came in with the tree already past them, can't be replayed at all. A cut script is not idempotent: to replay it, `git checkout <prior sha> -- <files>` first. Then `build_inline.py edit` with the declared files and declarations, and read the diff; if the script also edits `site/`, read `git diff -- site/` too, because `edit` never sees it. Then `working` and the parse gate, in that order (`check.js` reads the working HTML, which `edit` doesn't write), and stage the working HTML as `Cartulary_v<version>_Working_r###_(description).html`. Run a headless probe of the change where one can be written, and commit the cut locally; it is pushed only after the pass, the freeze, and the turnover. **Stop for Drak's browser pass**, naming the concrete things to check and which file to open. After the pass: `freeze r###`, `verify`, rebuild `working` and confirm its hash equals the file he passed, commit the freeze, then the turnover. One cut per r-number.

**Pure carve** (proven on 21 carves). Locate the module's members by name; confirm they're contiguous (gather first, as its own cut, if they aren't); print the seam lines and read them before slicing; slice under the boundary rules; write the new file or directory, reflowing the downstream `NN` prefixes so assembly order stays contiguous; `verify` must pass all five checks; `working` and the parse gate; the rebuilt `working` must hash equal to the artifact last passed (`verify` never reads `shell.html`, so the hash is what proves nothing outside the tree moved); `freeze` with no name rewrites the active anchor's layout for the new file set; `verify` again. With the byte-identity and the hash both holding, the carve changed no byte of the product: it owes no browser pass and does not rotate the anchor. When several carves share one arc and their spans are published, carve back to front, so every span ahead keeps its line numbers.

**Boundary rules, all earned.**
1. Boundary blanks lead the following file; no file may end on a blank. The assembler's `rstrip` eats a trailing blank. Canonical sequence won't catch it; byte-identity will, and on a content edit `edit`'s rule-1 check will.
2. The body's trailing newline stays in the shell, not in the last module.
3. A section header travels with its block.
4. A doc comment travels with its declaration.
5. A doc comment can sit behind a blank line, which defeats a walk-back over `//` lines and produces a plausible wrong span. Print the lines around every cut point; a computed span is a hypothesis and the seam lines are the evidence.

**Gather.** Its own r-number: relocate the scattered members into one contiguous run (position only, no code), `gather`, then `working` and the parse gate, stop for the browser pass, then `freeze r###`, `verify`, and the hash check. One gather at a time.

**When a browser pass is owed.** Every cut that changes the assembled bytes owes one: every gather and every content cut. A pure carve owes nothing only when both hold: byte-identity against the active anchor is exact, and the rebuilt `working` hashes equal to the artifact last passed. The first proves the tree reassembles; only the second covers `shell.html`, which `verify` never reads. Keep that exception narrow.

**Rotation.** `build_inline.py freeze r###` writes the assembled body as the new anchor with its layout, confirms frozen equals assembled, and deletes the retired pair. Then `verify` (byte-identity exact) and rebuild `working`: its hash must equal the artifact that was passed. That check catches a rotation that froze the wrong body, and it's the recovery check after a lost sandbox. Never freeze a body that hasn't passed.

**Eval-order check before any relocation.** What matters is definition time against call time, not source order. Function declarations hoist. A const arrow may sit above its callees when the reference is inside its body; an initializer that runs at evaluation (`const X_SET = new Set(X_TYPES)`) keeps its dependency above it. Assembly-order inversions on record, all call-time and safe: `makeInitialState` calls `migrate`; `12_trunk` calls into `24_ephemeris/`; `08_export-layer` calls cartographia's renderer.

**Turnover.** After every cut, and at any session close that changed the record: edit the documents in place to match the tree, run the doc gate (DOCS GREEN) and `prove_teeth.py` (all ten OK; it exits non-zero on a MISS), sweep every added line for em dashes and banned phrases, commit, push, and wait for CI on the head commit. After a rewrite that shrinks a document, rebaseline with `check_docs.py --docs docs --src cartulary-src --baseline docs/.turnover-baseline.json` once a Python sweep shows nothing newly authored: the gate counts against the baseline, so a stale higher count lets new dashes through. The em-dash probe writes into this file, whose baseline of 3 is the three entity forms named in the em-dash rule under Working with Drak; a rewrite that drops that line needs a rebaseline before the probe bites again. `--write-facts FILE` regenerates the derived section of `facts.json`; published figures, assertions, spans, and required strings are edited by hand when the documents change what they state. The six documents' roles and rules are in `tools/turnover/conventions.md`.

**Finals** (release prep only, never per cut). Extract each tarball in `deps/` into `inlining/node_modules/` (scoped packages under `@babel/` and `@fontsource/`; the exact loop is in the repository README), then `python3 inlining/build_inline.py finals`, then `node inlining/validate_html.js` on each output. `finals` inlines the libraries and both fonts, precompiles the JSX, and swaps the shell head's CDN tags (d3 7.8.5, babel 7.23.5, the dev form) for pinned d3 7.9.0 and babel-standalone 7.29.4. Do not "fix" the shell head: the zero-external-URL rule is about the built finals. `finals` writes a temporary file to `/tmp/cartulary_jsx_input.jsx`, so it runs where `/tmp` exists (the sandbox, CI, WSL), not as written on Windows. Finals are never committed.

**Shipping.** The ship gate is Drak's pass on the finals themselves, never on the working file: the precompiled build is its own code path (JSX compiled ahead of time, libraries and fonts inlined), and the working file exercises none of it. Before his pass, run the headless probes against the precompiled final. The checklists that gated v1.6 and v1.6.1 are `docs/release-notes/v1.6/finals-pass.md` and `docs/release-notes/v1.6.1/finals-pass.md`; write the next one from them. A defect the pass finds is a cut before ship, not a note in the release. Then: the zip (`Cartulary_v<version>.zip`: both finals and the zip README, which v1.6 carried as `README.md`; v1.6.1's, packed by Drak, also carried its patch notes and named the README `README_v1.6.1.md`); the itch upload with the page text and the devlog from `docs/release-notes/v<version>/`; the site deploy if `site/` moved; the ship turnover (the version line to SHIPPED, the finals' hashes, the date, and the line's last revision tag, which names the tree the finals came from); and the `v<version>_Release` tag on the ship-turnover commit, which Drak pushes.

**Tags.** Two forms. A revision's tag is `v<version>_r###`: a lower-case `v`, the line's version with its dot, then `_r` and the zero-padded counter, the same pair a working copy's file name carries (`v1.7_r001`). A release's tag is `v<version>_Release`, with a capital R (`v1.7_Release`). No spaces; git refuses them. A revision tag marks a passed state and goes on the commit CI went green on, which after a cut is its turnover commit; a bare freeze commit is doc-gate red until its turnover lands. The previous line's shipped tree is the new line's r000 and is never tagged (v1.7's r000 is the tree `v1.6.1_Release` marks), so a line's first tag is its r001. A patch continues its line instead of opening one: v1.6.1 bumps `VERSION` to `'1.6.1'` but keeps v1.6's count, so its first cut is r052, tagged `v1.6.1_r052`, the first tag in this form, and it ships with its own release tag, `v1.6.1_Release` (Drak, 2026-10-23). The release tag goes on the ship-turnover commit once CI is green there; the ship turnover changes only documents, so that commit builds the same finals as the line's last revision tag. A tag push re-runs CI on the tagged commit. The session's git credential refuses tag pushes, so Drak tags from his clone with the three lines `git pull` / `git tag v1.7_rNNN <sha>` / `git push origin v1.7_rNNN`, and the same three with `v1.7_Release` at the ship. The tags from before the rule (2026-10-23) keep their names: `r030` through `r051` on the v1.6 line's passed states, and `v1.6` on `8554fdf`, the v1.6 ship turnover. The anchor's name stays bare: `freeze` takes `r###` and names it `reference-r###-body.jsx`, which can't collide because only one exists at a time. Cut scripts carry the tag (Content cut).

**Opening and closing a line.** A line closes when the finals are live (the upload, not the build). At the close, the changelog freezes to `changelog-v<version>.md`, this handoff freezes to `handoff-v<version>.md`, and the version's plan and session blocks move from the roadmap to `roadmap-archive.md`, all verbatim; the live files start over with current state. A patch closes without a freeze: its record stays in the active changelog's between-lines section, its release text goes to `docs/release-notes/`, and the version line records the ship, as v1.6.1's did. A line opens with the `VERSION` bump, which puts the r-counter at r000: the previous line's tree as shipped, which takes no tag. A patch's bump (`1.6.1`) keeps the line's count instead (see Tags). The first product edit is r001, the line's first tag, and it flips the export's version literals. From the bump on, a bare r-number in the live documents means the new line's, so the opening turnover writes the version into any of the closed line's that remain (`v1.6 r036`).

**Commits.** One commit per gate-green step, with the revision in the message for cuts, written as its tag (`v1.7_r001: ...`, `Freeze v1.7_r001`, `Turnover v1.7_r001`); a freeze is a commit and a turnover is a commit. Commits are signed, authored as `Claude <noreply@anthropic.com>`, and end with the attribution lines the session is given. Nothing is pushed ahead of the browser pass it depends on.

**The r-counter.** One bump per carve, gather, or other byte-changing cut, zero-padded, persistent across sessions, reset to r000 by a line's `VERSION` bump and kept by a patch's. Tooling changes and site edits carry no bump. **Current: r052, v1.6.1's fix and the last revision before v1.7, which starts at r000.**

---

## Architecture

**Glossopoeia, Ephemeris, and Cartographia are views with their own state slices, not sets of templates.** Each owns a `state.*` slice, registers through the node-source registry so it's graphable in Concordance, and has `migrate()` backfill its arrays; never model these as `BUILTIN_TEMPLATES` entries. Glossopoeia and Cartographia records are shaped `{ id, name, tags:[], fields:{} ... }` and render their fields through `EntryForm` with a per-type `*Schema()` function. **Ephemeris is the exception:** a celestial body is a flat record (`makeNewCelestialBody` in `24_ephemeris/`) with its own editor rather than `EntryForm`, and its `tags` is a comma-separated string, split on read. Code that assumes `tags` is an array breaks on bodies, the same family of mistake as the v1.3 tags crash.

- **`state.cartographia`** is a flat array of map records `{ id, name, tags:[], fields:{}, mapData:{ image, pins, drawing }, updatedAt }`, with the fixed field ids `cart-fld-description`, `cart-fld-scope-region`, `cart-fld-notes` rendered through `cartographiaMapSchema()`. `drawing` is `{ width, height, background, layers }`; a layer is vector (shapes) or raster (one bitmap, stored like a map image: a folder file `<map id>-<layer id>.<ext>` or a data URL). `ensureMapData` normalizes on every load and coerces rather than throws. Maps register as `SYNTH_TPL_MAP` with outbound pin edges only and `refEligible:false`, though the template builder offers Map as a reference target anyway; since r052 a reference to a map in such a field survives the load, and whether to keep offering it is on the roadmap. The JSON shapes are in the in-app help's JSON Save File Schema topic.
- **`state.mapStamps`**: stamps imported from stamp packs, world-scoped, ids namespaced by pack (`forest__pine`), every SVG body sanitized on import and again on load.
- **`state.glossopoeia`**: 21 record arrays plus `workspaceNotes` and `ui`, records `{ id, langId, name, tags:[], fields:{} }`. The schemas are in the frozen design docs `docs/glossopoeia-design-handover.md` and `docs/glossopoeia-phase-two.md`.
- **`canvasSlot`.** `EntryView` and `EntryForm` take an optional canvas node rendered above the fields; Cartographia fills it. Reuse it for any future canvas-over-form view.
- **`migrate()`'s entry-ref cleanup** (near its end) checks every top-level field with a target list or filters: an entry reference survives if the entry exists, its template is allowed, and it passes the field's filters, and since r052 a reference to a registered record (a body, a Glossopoeia record, a map) survives if the record's source is among the field's targets. Group subfields are never cleaned. Anything new that a reference can point at has to be taught to this check, or the load erases it.
- **The registry runs from `migrate()`** before the slice backfills, which is safe because every `getInstances` accessor is `Array.isArray`-guarded. The v1.6 r001 migration promotes map entries to the slice before that validation, so migrated maps count as graph nodes. Keep that order.

**The built-in template count is 20.**

---

## Carry-forward facts

- **Zero network requests is a rule** (Drak, 2026-10-23, r051): a request anywhere in the application is a defect to cut, not a feature with a fallback. The SVG download embeds the map font from the page's own inline stylesheet; the development build, whose head loads fonts by link, falls back to the viewer's serif in the download, and that's expected.
- **Concordance opens with an empty template filter** (v1.5 r134, by design); **all** and **none** recover it. Don't "fix" it back to all-on.
- **Synthetic-node positions persist** across reload, with force containment keeping the graph compact (v1.5 r131-r132).
- **v1.6 r001 edge cases, accepted:** a map's `calendarId` is dropped; an unsaved map edit is lost on reload; an imported `.template.json` with `kind:"map"` is self-healed by `migrate()`.
- **Pre-v1.6 em dashes are frozen.** The rule governs newly authored text only. At the session-16 count the source carried 1,111 older ones, 283 of them in the in-app help, and none get swept.
- **The undo history covers the map editor only.** Everywhere else, Version History and the exported `.json` are the safety net.

---

## The site and the release artifacts

**cartulary.world** is live on Porkbun static hosting with HTTPS: `index.html` (the splash) and `helloworld.html` (the docs), both fully offline, deployed together to the domain root. The repository copies are in `site/`, and at the v1.6 ship the live files were byte-identical to them (`helloworld.html` sha256 `150f79959a6ffa40`, checked by hashing the served bytes). Site edits carry no r-number; the site's doctrine is `docs/doctrine-site.md`. **Once a cut edits `site/`, the repository is ahead of the live site:** the site then ships with the next release's finals, both files to the domain root together, confirmed by hashing the served bytes. Cut scripts that touch the help usually touch `site/helloworld.html` too (r038, r047, r050, and r051 did). **The live site matches the repository** after a site-only edit Drak uploaded on 2026-10-23 (the free-forever argument and the repository line, roadmap Pipes item 8): the served `helloworld.html` hashes to `28ec1f20b8dd889e` and the unchanged `index.html` to `69b410b69f4b3863`, the repository's copies.

**`docs/release-notes/`** holds one patch-notes file per version from v1.4 on (`Cartulary_v1.4_PatchNotes.txt` through `Cartulary_v1.6.1_PatchNotes.txt`), a `v<version>/` folder per release with the text its zip carried, verbatim (v1.0 through v1.4 came from Drak's archive of every release on 2026-10-23; v1.5's zip had no README), and an index, `README.md`, with every release's finals hashes. `v1.6.1/` holds the zip's README under its shipped name, the devlog as posted, and the finals checklist. `v1.6/` also holds the public copy, `itch-page.html` and `devlog-1.6.html` in the live pages' own markup (pulled from the published pages, so the next rewrite starts from the real thing), the zip's `README.md`, and `finals-pass.md`. The repository's own `README.md` is the public face of the repository.

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

- **The six working documents**, gated: this handoff (current state), `changelog.md` (append-only, the open line only; between lines, the gap's sessions), `roadmap.md` (the backlog, edited in place, then a dated session log), `cartulary-doctrine.md` (rules, each with the incident that taught it), `cartulary-spine-manifest.md` (the module map and gate design), and `journal.txt` (every session's entry, oldest first; it began as a turnover aid against context compaction and is now the narrative beside the record). Their rules are in `tools/turnover/conventions.md`.
- **Archives**, outside the gate. Frozen and never edited: `changelog-v1.6.md`, `changelog-v1.5.md`, `changelog-v1.4.md`, `changelog-v1.1-v1.3.md`, `handoff-v1.6.md`. Appended at each close and never rewritten: `roadmap-archive.md`, the plans, session blocks, and retrospectives of shipped versions.
- **Reference documents:** `roadmap-principles.md` (planning and scope principles, plus the v1.5 session blocks carved out with them, including the deferred CSV-import and variant-filter plans), `doctrine-code-watch.md` (the code-review catalog), `doctrine-site.md` (the site's doctrine), `cartographia-plus-spec.md` (the map editor's frozen build sheet, with the won't-have list in section 7), `maps-promotion-spec.md` (the v1.6 r001 build sheet), `cartulary-modularization-plan.md`, and the two Glossopoeia design documents.
- **The turnover toolchain** is `tools/turnover/`: `check_docs.py`, `prove_teeth.py` (which resolves the checker beside itself, so they stay together), `conventions.md`, `facts.example.json`, and `SKILL.md`. The `cartulary-turnover` skill package in claude.ai is meant to be a pointer to these; until Drak refreshes it (on the roadmap) it still carries script copies, which are stale by definition. Always run the repository's. `docs/facts.json` is the ground truth the gate checks against; `docs/.turnover-baseline.json` is the em-dash and banned-phrase baseline.
- **Filename references decay.** Re-verify every `NN_name` reference against the live tree at each turnover; the doc gate checks only the ones in each working document's live region, so references elsewhere get read by hand.
