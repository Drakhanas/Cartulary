# Cartulary, Context Gate Spec (v1.8)

> **The build sheet, settled 2026-11-07 (session 23).** Planned before v1.8 opened, from the roadmap's context-completeness gate row and the design in `docs/cartulary-modularization-plan.md`, section 6, one call per message, three calls. Every decision below is Drak's unless it says otherwise; the dated calls are in section 1. Claude's defaults are marked as his.

---

## 0. One-sentence statement

Editing goes module by module: a generated seam file says what each module declares and reaches, `build_inline.py pack` hands a session the module and the declarations it names, and the edit gate fails a content cut whose changed module had no pack or whose edit reached past it.

## 1. Decisions (Drak, 2026-11-07)

- **Into v1.8** (00:46: "The context-completeness gate. we should be at the point where we're moving toward editing module-by-module"); **its place** (10:48: "a, begin planning", engineering right after r001, before mobile).
- **What the gate does, call 1, option a** (12:47: "a"). Seams derived by parsing, a context pack handed out before an edit, and the edit's reach checked after it. The other ways were seams declared by hand in the manifest and checked against the code, as the old plan wrote it; and the pack alone with no reach check.
- **How deep a pack goes, call 2, option a** (13:02: "a"). One hop; a declaration over a size limit comes as its head and leading comment, in full when asked by name. The other ways were one hop with everything in full, and one hop with signatures only.
- **Whether the pack is required, call 3, option a** (13:04: "a"). Required for content cuts; `edit --whole` for carves, gathers, and cuts that say why, named in the staging message. The other ways were advisory, and required with no escape.
- **The plan** (section 6; 13:34: "looks good").

## 2. What the plan found

- No imports: the build joins the modules into one script, so every top-level name is visible everywhere, and a module's seam is the names it uses from other modules. The manifest's section 7 asserts six edges by hand, "not yet traced exhaustively".
- The spine is large: `App` is about 6,170 lines of `12_trunk`'s 6,621, so spine plus a module often outweighs the module.
- A tool can't see what a session has read; it can check what an edit reaches. A git clone is one commit, which is the old design's revision agreement.
- A prototype (2026-11-07, name matching without scope, so it overcounts) over the 62 module files of a 59,763-line tree: following reaches transitively comes to about 42,000 lines for nearly every module; one hop leaves 51 of the 62 under 1,000 lines of reached declarations (Chronometric 15 names and 197 lines, the calendar engine 7 and 162). The large ones carry a big declaration: `App` in `30_trunk`'s pack (about 6,170), `12_trunk` reaching 173 names and about 19,000 lines, and Ephemeris's shell, a Fabula page, and `09_trunk` each one of 3,000 to 6,000.

## 3. The seam file (step G1)

- A script parses each module with the vendored Babel parser (`deps/parser-7.25.3.tgz`) and resolves names by scope, so a local that shares a name with another module's declaration doesn't count as a reach.
- It writes a generated file: each module's top-level declarations, their line counts, and the names each module reaches in other modules.
- CI regenerates it on every push and fails if the committed copy differs.
- G1 compares its seams with the prototype's figures and spot-checks several modules by hand before its counts are taken as right.

## 4. The pack (step G2)

- `build_inline.py pack <module>` writes the module and each declaration it names from another module: in full at 300 lines or under, as head and leading comment over that, and in full when asked for by name.
- The pack records what it holds and the commit it was made at.

## 5. The edit gate (step G3)

- `edit` fails if a module the cut changed has no pack made at the current commit, or if the edit reaches a name its pack didn't hold.
- `edit --whole` skips both, for carves, gathers, and any cut that says why; the staging message names the flag.

## 6. Plan

Tooling, no r-number; after r001 and the `utils` carve, which moves code between modules and so goes first, before mobile.

| # | Step | What it does |
|---|---|---|
| G1 | Seam extractor | Section 3 |
| G2 | `pack` | Section 4 |
| G3 | The edit gate | Section 5 |
| G4 | Teeth | Planted cases each go red: an edit reaching outside its pack, a module edited without a pack, a stale seam file |
| G5 | Docs | The generated seam file replaces the manifest's section 7; the handoff's procedures load the pack, not the tree |
