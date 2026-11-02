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
