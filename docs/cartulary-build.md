# Cartulary — Build Infrastructure and File Conventions

Filename convention: precompiled `Cartulary_v#.#.html`, readable `Cartulary_v#.#_Readable.html`, staged working copy `Cartulary_v#.#_Working_r###_(description).html` where `r###` is a zero-padded revision counter (starting at `r001`) and `(description)` is a two-to-three-word lower-snake-case summary of the change. When the working copy carries STRESS_MODE-gated instrumentation for scale-test work, the staged artifact is named `Cartulary_v#.#_Smoketest_r###_(description).html` instead, to disambiguate from the canonical branch. Version comes from the `VERSION` constant in `build_inline.py`. The `r###` counter persists across sessions within a release and resets to `r001` when `VERSION` bumps (i.e. on release ship). The current counter value is tracked in `handoff.md` so the next session knows where to continue.

## File locations

### Working copy (master source)
- `/home/claude/cartulary.html` — the canonical source the assistant edits. **All changes happen here first.**

### Build outputs (staged for user)
- `/mnt/user-data/outputs/Cartulary_v#.#.html` — precompiled production build (~1.4 MB). What users actually run. Filename derives from `VERSION` constant in `build_inline.py`.
- `/mnt/user-data/outputs/Cartulary_v#.#_Readable.html` — JSX-preserved canonical source distribution (~4.4 MB).
- `/mnt/user-data/outputs/Cartulary_v#.#_Working_r###_(description).html` — staged working copy for user review during dev on the canonical branch (between releases). `r###` increments per stage; description is a 2-3 word lower-snake-case summary of the change.
- `/mnt/user-data/outputs/Cartulary_v#.#_Smoketest_r###_(description).html` — staged working copy on the smoketest branch (working copy carries scale-test instrumentation). See "Smoketest branch convention" below.

### Asset files
- `/mnt/user-data/outputs/cartulary-favicon.svg` — standalone favicon SVG file (already wired as inline data URI in working copy; standalone exists for separate distribution if ever needed).

### Documentation files (regenerate per release)
- `/mnt/user-data/outputs/README.md` — `.zip` distribution README
- `/mnt/user-data/outputs/itch-page-full.md` — integrated itch.io page text per major version
- `/mnt/user-data/outputs/itch-page-additions.md` — incremental update notes (smaller updates)
- `/mnt/user-data/outputs/devlog-1.X.md` — devlog entry per release
- `/mnt/user-data/outputs/roadmap.md` — current roadmap (always current)
- `/mnt/user-data/outputs/changelog.md` — current changelog
- `/mnt/user-data/outputs/cartulary-doctrine.md` — standing doctrine
- `/mnt/user-data/outputs/cartulary-build.md` — this file
- `/mnt/user-data/outputs/handoff.md` — most recent session-end handoff (overwritten per session)

### Build script directory
- `/home/claude/inlining/` — build infrastructure
- `/home/claude/inlining/build_inline.py` — main dual-build script (Python, produces both outputs from one source)
- `/home/claude/inlining/compile_jsx.js` — Node helper for JSX precompilation
- `/home/claude/inlining/validate_html.js` — parse-validates inline scripts in built outputs
- `/home/claude/inlining/package.json` — npm dependencies
- `/home/claude/inlining/node_modules/` — installed deps (run `npm install` if missing)
- `/home/claude/inlining/out/` — staging area before promotion to `/mnt/user-data/outputs/`

### Validation tools
- `/tmp/babelcheck/check.js` — Babel parse validation. Runs after every change to working copy as a hard gate.

## Standard workflow

For a typical edit to the working copy:

1. Edit `/home/claude/cartulary.html` (use `str_replace` or `view` then targeted edits)
2. Run Babel parse validation: `cd /tmp/babelcheck && node check.js`
3. If parse OK, copy to staged working copy. Filename includes the next `r###` (increment from the last staged value in the current release) and a 2-3 word lower-snake-case description of the change:
   - Canonical branch (no instrumentation): `cp /home/claude/cartulary.html /mnt/user-data/outputs/Cartulary_v#.#_Working_r###_(description).html`
   - Smoketest branch (STRESS_MODE-gated instrumentation present): `cp /home/claude/cartulary.html /mnt/user-data/outputs/Cartulary_v#.#_Smoketest_r###_(description).html`
4. Use `present_files` to surface the working copy to the user

For a release:

5. Confirm `VERSION` in `build_inline.py` matches the target release version
6. Confirm the working copy is on the canonical branch (no smoketest instrumentation), or that the keep-vs-rip decision has been made and applied. Smoketest instrumentation in a shipping build needs explicit Drak approval.
7. Run the dual-build: `python3 /home/claude/inlining/build_inline.py`
8. Validate both outputs:
   - `node /home/claude/inlining/validate_html.js /home/claude/inlining/out/Cartulary_v#.#.html`
   - `node /home/claude/inlining/validate_html.js /home/claude/inlining/out/Cartulary_v#.#_Readable.html`
9. Stage to outputs: `cp /home/claude/inlining/out/Cartulary_v#.#*.html /mnt/user-data/outputs/`
10. Use `present_files` to surface both builds

After ship: when `VERSION` bumps to the next release, the `r###` counter for staged working copies resets to `r001` for the new release. The handoff doc tracks the current counter; reset is implicit on VERSION bump.

## Babel parse validation (hard gate)

Run after every change to `/home/claude/cartulary.html` **without exception.** The check.js validates the inline JSX block parses with `@babel/preset-react`. If it fails, the file is broken — fix before doing anything else, including before staging or presenting.

```bash
cd /tmp/babelcheck && node check.js
```

Output is either `PARSE OK` (continue) or detailed error (fix immediately). Treat any error as immediate-stop, no exceptions, no "let me do one more change first."

## Dual-build approach

Two outputs from one source:

### `Cartulary_v#.#.html` (precompiled, ~1.4 MB)
- JSX transformed to `React.createElement` calls at build time via `@babel/preset-react` classic runtime
- Targets the React global (loaded via inlined `react.production.min.js` immediately above the compiled output)
- Babel-standalone NOT shipped (saves ~3 MB of payload)
- Faster first paint, no runtime transform overhead, no "deoptimised the styling" console warning
- **What users actually run**

### `Cartulary_v#.#_Readable.html` (~4.4 MB)
- JSX preserved as `<script type="text/babel" data-presets="react">`
- Babel-standalone inlined for runtime transform in the browser
- Identical functionality to the precompiled build
- Open in a text editor to read the source as authored
- **The canonical source distribution**

### Both builds share
- Inlined React/ReactDOM/marked/d3/jszip
- Inlined Cormorant Garamond and DM Sans fonts as base64 woff2 in `@font-face` rules (latin subset, weights 400/500/600/700 with italic capped at 500)
- Combined license preamble (MIT + BSD-3 + OFL-1.1) at top of file
- Inline favicon SVG data URI in `<head>` after `<title>`
- **Zero network requests after load** (fully offline)

## Build script details

`build_inline.py` flow:
1. Read source from `/home/claude/cartulary.html`
2. Branch by mode (`precompiled` or `readable`):
   - `precompiled`: extract JSX block, run through `compile_jsx.js`, replace `<script type="text/babel">` with plain `<script>` containing compiled JS
   - `readable`: leave JSX block as-is, include Babel-standalone in JS lib list
3. Replace external `<script src="...cdnjs...">` block with inlined library content
4. Replace Google Fonts `<link>` with inline `<style>` containing `@font-face` rules with base64 woff2 data URIs
5. Prepend license preamble
6. Write output to `/home/claude/inlining/out/` as `Cartulary_v{VERSION}.html` and `Cartulary_v{VERSION}_Readable.html`

`compile_jsx.js` flow:
- Reads JSX from file path argument
- Transforms with `@babel/preset-react` using `runtime: 'classic'` (targets React global, no JSX runtime imports)
- Writes compiled JS to stdout

### Critical gotchas

- **Use the classic JSX runtime, NOT automatic.** Automatic would insert `import { jsx as _jsx } from "react/jsx-runtime"` which has nowhere to resolve from in a `<script>` tag without a module loader. Classic runtime emits `React.createElement(...)` which uses the React global.

- **Escape `</script>` sequences inside inline scripts** to `<\/script>` before output, or the HTML parser closes the script block early. This applies to library code (React-DOM has `</script>` substrings inside string literals already escaped to `\x3c/script>`) and to the compiled JSX output. The build script's `escape_for_inline_script` helper handles both cases.

- **The favicon path `</script>` issue doesn't apply** — favicon is an SVG inside a data URI, not a script.

## Smoketest branch convention

When scale-test or performance-measurement work is active, the working copy carries STRESS_MODE-gated instrumentation added on top of canonical source. Production behavior is unchanged when the flag is off, but the working copy diverges from canonical in measurable ways (~7,800 bytes of additions across eight regions: perf marks, harness API, OPFS shim, permission-less handle support).

The branch convention disambiguates this state:

- **`_Working_r###_(...)`** stages the canonical branch (no instrumentation; what gets dual-built for release).
- **`_Smoketest_r###_(...)`** stages the smoketest branch (carries instrumentation; not directly buildable for release without an explicit keep-or-rip decision).

The two branches are not synced automatically. When working on canonical changes during a scale-test session, those changes need to be applied to both branches or coordinated via a single source. In practice the working copy at `/home/claude/cartulary.html` IS one branch at a time, and which one is reflected by the filename of the most recent staged build.

The instrumentation pattern itself is documented in `smoketest-package/docs/PATCHES.md` (eight regions, each with anchor + insertion content). To re-apply after a rip, walk PATCHES.md. To strip from a working copy, reverse-apply.

Releases ship from the canonical branch. If a future release decides to keep the instrumentation as a permanent gated debug surface, the branch convention collapses — the `_Smoketest_` root retires and the instrumented version becomes the new `_Working_` baseline.

## Validation methodology

After every build, run `validate_html.js` on both outputs. It uses `@babel/parser` to syntax-check every inline `<script>` block. If any block fails to parse, the build is broken.

```bash
cd /home/claude/inlining
node validate_html.js out/Cartulary_v#.#.html
node validate_html.js out/Cartulary_v#.#_Readable.html
```

The readable build's JSX block must parse with `plugins: ['jsx']` enabled; the script identifies it via `type="text/babel"` and parses accordingly.

Expected output for a clean build:
```
  ✓ block #1 (10,808 bytes)
  ✓ block #2 (131,900 bytes)
  ...
ALL OK · N blocks, X bytes total
```

## Skills check workflow

When the assistant has access to skills (via `/mnt/skills/public/SKILL.md` files), `view` the relevant skill **before**:
- Creating any new file in the user's workspace
- Running any code that produces user-visible artifacts
- Working with `.docx`, `.pdf`, `.pptx`, `.xlsx` files

This is non-negotiable — skills define environment-specific constraints (libraries, rendering quirks, paths) that aren't in training data. Skipping the skill read produces lower-quality output.

## Session continuity

- Past session transcripts at `/mnt/transcripts/`
- `journal.txt` index in same directory listing each transcript with description
- When Drak references prior session work, **check transcripts for specifics** rather than guessing
- Use `bash_tool` to read and `grep` transcripts when needed

If a session ends with substantial state, the next session opens with a compaction summary at the top of the conversation context. That summary is reliable for high-level state but check transcripts for code-level specifics.

## File handling notes

- Files in `/home/claude/` are the assistant's workspace; user does **NOT see them directly**
- Files in `/mnt/user-data/outputs/` are visible to user via `present_files` tool
- Files in `/mnt/user-data/uploads/` are user uploads — check this directory when user mentions uploaded files
- For sharing, ALWAYS stage to `/mnt/user-data/outputs/` first, then call `present_files`
- Never just describe a file's contents — present the file

## Things that should NOT persist in /home/claude

Keep the home directory focused. Clean up if encountered:
- Old build outputs (build script output goes to `inlining/out/`, gets copied to `/mnt/user-data/outputs/`, doesn't need to persist in home)
- Test fixtures from prior sessions
- Temporary scratch files
- Anything not in active use for current work

## When build_inline.py needs npm install

If `node_modules` is missing under `/home/claude/inlining/`:

```bash
cd /home/claude/inlining
npm install --no-audit --no-fund
```

Required deps (per `package.json`):
- `@babel/standalone` — for the readable build's runtime transform
- `@babel/core` + `@babel/preset-react` — for compile_jsx.js
- `@fontsource/cormorant-garamond` + `@fontsource/dm-sans` — for inline font files
- `react`, `react-dom`, `marked`, `d3`, `jszip` — production deps inlined into builds

## Quick reference card

The `#.#` placeholder below is the current `VERSION` constant in `build_inline.py` (currently `1.5`). Substitute literally before running. The `r###` placeholder is the next sequential staging revision; `(description)` is a 2-3 word lower-snake-case label.

| Task | Command |
|---|---|
| Edit working copy | Use `str_replace` on `/home/claude/cartulary.html` |
| Validate parse | `cd /tmp/babelcheck && node check.js` |
| Stage working copy (canonical) | `cp /home/claude/cartulary.html /mnt/user-data/outputs/Cartulary_v#.#_Working_r###_(description).html` |
| Stage working copy (smoketest branch) | `cp /home/claude/cartulary.html /mnt/user-data/outputs/Cartulary_v#.#_Smoketest_r###_(description).html` |
| Build dual outputs | `python3 /home/claude/inlining/build_inline.py` |
| Validate built precompiled | `node /home/claude/inlining/validate_html.js /home/claude/inlining/out/Cartulary_v#.#.html` |
| Validate built readable | `node /home/claude/inlining/validate_html.js /home/claude/inlining/out/Cartulary_v#.#_Readable.html` |
| Stage built outputs | `cp /home/claude/inlining/out/Cartulary_v#.#*.html /mnt/user-data/outputs/` |
| Read past transcripts | `cat /mnt/transcripts/journal.txt` then `cat /mnt/transcripts/<filename>` |
