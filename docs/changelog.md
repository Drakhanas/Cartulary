# Cartulary changelog (no line open: v1.7 shipped 2026-11-02 from r059; v1.8 not yet opened)

Reverse-chronological log for the current version line. Between lines (one version shipped, the next not yet opened with the `VERSION` bump in `inlining/build_inline.py`), it holds only the sessions in that gap, and they stay here as the first entries of the next line when it opens. Each release header includes the build's filename version. Append-only applies within the active file; a closed version is frozen in its own file and never rewritten.

**Per-version archives** (frozen, verbatim; read when you want closed-release history):
- `changelog-v1.7.md` -- v1.7 (shipped 2026-11-02, line closed at r059; the sessions between v1.6 and v1.7 with the v1.6.1 patch, then every cut r001-r059 with its gate figures and hashes)
- `changelog-v1.6.md` -- v1.6 (shipped 2026-10-23, line closed at r051; every cut r001-r051 with its gate figures and hashes)
- `changelog-v1.5.md` -- v1.5 (shipped 2026-06-26, r134)
- `changelog-v1.4.md` -- v1.4 (released 2026-05-18)
- `changelog-v1.1-v1.3.md` -- v1.1 through v1.3

---

## Between v1.7 and v1.8

### Session 2026-11-02 (session 22, after the v1.7 ship: the close; no r-bump, no tree change)

Drak's go for the close the handoff and the conventions call for at a version's close, with the usage he had left: "let's go ahead and try it with the usage i have left, if it doesnt finish i can complete it later" (11:00).

- **The changelog froze.** The v1.7 changelog moved verbatim to `changelog-v1.7.md`, the body byte-identical to the active file at `cfe0e9e` from the between-lines section down (the sessions between v1.6 and v1.7, the v1.6.1 patch's among them, stayed as the line's first entries, so they froze with it), the active file's preamble dropped as in the v1.6, v1.5, and v1.4 archives. This file starts over with the gap between v1.7 and v1.8. facts.json's required strings for the changelog shrink to what this file states; the per-cut strings stay true in the archive, which is outside the gate like its predecessors.
- **The roadmap's v1.7 record moved to the archive.** The v1.7 section (its rows, Pipes' ten items checked against the tree, and the document-debt item) and every dated block from the cut-back after the v1.6 ship to v1.7's ship moved verbatim to `roadmap-archive.md` under a v1.7 record heading, each moved range checked present byte for byte; `roadmap.md` keeps the v1.8 section and the standing backlog as they were, with one dated block for the close, 131 KB to 16. The handoff's pointer to the drag-edit race names the archive. facts.json's required strings for the roadmap shrink to what the new file states.
- **The handoff froze.** `handoff-v1.7.md` is the handoff exactly as it stood at `5717e51`, byte-identical below a frozen header in the form of v1.6's. The live handoff's title, version line, NEXT banner, and current-state note are rewritten: v1.7 shipped with its finals, tags, and what Letters, Pipes, and the Sweep were, by spec and cut range; v1.6.1 and v1.6 shipped; v1.8 next, with its opening; the per-cut summaries left for the archives (189 KB to 152). The archives list names both new freezes. Below the banners the handoff still carries v1.7's detail in places, the procedures' worked examples and the architecture's notes by cut, and cutting those back is left for a session with room for it. facts.json keeps the handoff's required strings the new file states, dropping the 53 that lived in the old version line, and adds three.
