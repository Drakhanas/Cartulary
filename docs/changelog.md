# Cartulary changelog (no line open: v1.6 shipped 2026-10-23; v1.7 not yet opened)

Reverse-chronological log for the current version line. Between lines (one version shipped, the next not yet opened with the `VERSION` bump in `inlining/build_inline.py`), it holds only the sessions in that gap, and they stay here as the first entries of the next line when it opens. Each release header includes the build's filename version. Append-only applies within the active file; a closed version is frozen in its own file and never rewritten.

**Per-version archives** (frozen, verbatim; read when you want closed-release history):
- `changelog-v1.6.md` -- v1.6 (shipped 2026-10-23, line closed at r051; every cut r001-r051 with its gate figures and hashes)
- `changelog-v1.5.md` -- v1.5 (shipped 2026-06-26, r134)
- `changelog-v1.4.md` -- v1.4 (released 2026-05-18)
- `changelog-v1.1-v1.3.md` -- v1.1 through v1.3

---

## Between v1.6 and v1.7

### Session 2026-10-23 (session 19, after the v1.6 ship: the document-debt pass; no r-bump, no tree change)

Drak's call after the ship: cut the working documents back to what a session reads. The doc set stood at 738 KB, most of it v1.6 history that the frozen archives can carry. Four forks, every recommendation taken.

- **The changelog froze.** The v1.6 changelog moved verbatim to `changelog-v1.6.md` (body byte-identical from the v1.6 header down; the active file's preamble dropped, as in the v1.5 and v1.4 archives), and this file started over with the gap between v1.6 and v1.7. `tools/turnover/conventions.md` already said a closed version is frozen in its own file; the old preamble's "when v1.6 ships and v1.7 opens" predated the gap between the two.
