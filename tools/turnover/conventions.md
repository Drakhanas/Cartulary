# Turnover conventions

Companion to the `cartulary-turnover` skill. The skill says the conventions live here; they
did not exist in any delivered form, so this is a reconstruction from the doc set's actual
practice as of session 17. Where this file and the delivered documents disagree, the
documents are the evidence and this file is the defect.

## Where the toolchain lives

In the repository (`github.com/Drakhanas/Cartulary`), one home per thing, since session 19.
Session 17 found two of the four turnover files missing from the skill package; session 18
found the package's probe harness stale. Copies drift, so there are none: the skill package
is a pointer to these paths.

| File | Home | Why |
|---|---|---|
| `check_docs.py` | `tools/turnover/` | the gate; CI runs it on every push |
| `prove_teeth.py` | `tools/turnover/` | probes the gate; resolves the checker through `Path(__file__).parent`, so it must sit beside it |
| `conventions.md` | `tools/turnover/` | this file; phase 1 reads it |
| `facts.json` | `docs/` | per-project state, regenerated each session by `--write-facts` |
| `.turnover-baseline.json` | `docs/` | the em-dash and banned-phrase baseline, committed |

Invoke from the repository root:

```
python3 tools/turnover/check_docs.py --docs docs --src cartulary-src --facts docs/facts.json
python3 tools/turnover/prove_teeth.py --docs docs --src cartulary-src
```

Build tooling has its own home, `inlining/` (`build_inline.py`, `canonicalize.py`,
`prove_gate_teeth.py`, the cut scripts under `inlining/cuts/`).

Deliver by commit and push, never by zip or file card; the push is what runs the gate again.

## The six documents

**`handoff.md`** is the living current-state document, fully rewritten each batch. It stands
alone: a fresh chat reads it top to bottom and can work. Order matters, because a cold reader
goes top-down and stops when they think they have enough.

1. Version-line banner, then the NEXT banner. What to do next, with expected signals stated
   in advance where a cut cannot return a clean verdict. Then one line saying where the
   history is.
2. Cold start. Verify commands, not claims about state.
3. The tree and the anchor, then the gates.
4. The procedures, each stated once.
5. Architecture, carry-forward facts, the site and the release artifacts, working with Drak,
   the documents.

It carries current state only. The per-cut record belongs in the changelog, each cut its own
entry with its gate figures and hashes; the backlog belongs in the roadmap. Neither is copied
here. *(Amended 2026-10-23: the v1.6 handoff had grown to 177 KB, 101 KB of it a session's
cut-by-cut detail that the changelog already carried, and a cold start read all of it first.)*

State a fact in exactly ONE place. A superseding section elsewhere does not retire a stale
note; strike stale text at its source. An earlier edition carried the `/mnt/project` sync
status in two sections two hundred lines apart, and a top-down reader got both.

**`changelog.md`** is append-only. The active file holds the open version only; closed
versions are frozen in their own files. Between lines (a version shipped, the next not yet
opened), it holds the gap's sessions, which stay as the first entries of the next line. History is preserved verbatim, including its errors:
older session blocks fall out of the checker's live region on purpose. If a superseded block
contains a wrong figure, say so at delivery rather than editing it. Use `[stale: reason]`
inline when a live block deliberately quotes something retired.

**`roadmap.md`** is the standing backlog (features, engineering, housekeeping, what is tolerated,
what is decided no, what is deferred), edited in place as items move, followed by a dated
`=== ADDED ... ===` block per session. The newest block is the current status. The checker reads it
for figures, file names, and anchors, and reads the whole file for em dashes, banned phrases,
tables, and required strings; the standing sections are kept true by hand, and a row struck there
is recorded, with its evidence, in that session's block.

**At a version's close** (the upload, not the build), the changelog freezes verbatim to
`changelog-v<version>.md`, the handoff to `handoff-v<version>.md`, and the version's plan and
session blocks move verbatim from the roadmap to `roadmap-archive.md`. The archives sit outside
the gate and are never edited; the live files start over as current state.

**`cartulary-doctrine.md`** appends dated entries. One lesson per bullet, each naming the
defect that produced it in parentheses. A doctrine entry with no incident behind it is an
opinion.

**`cartulary-spine-manifest.md`** is the modularization oracle: module map, source layout,
carve status, gate design, anchor history. Sections become records rather than plans as work
lands; when a section closes, rewrite it as history and say what it cost.

**`journal.txt`** keeps every entry, oldest first: one per session that changes the record,
each opened by a `=== date (session N, ...) ===` line. The checker reads only the newest entry.
First person, narrative, no headers, and it is the one place that records what went wrong and
what it felt like to get it wrong. It is not a status report; the changelog already is one.
It is kept for transparency, by Drak's choice: in a public repository, it lets anyone see how
Cartulary was thought through, not only what changed.
*(Amended 2026-10-23: it was `journal-entry.txt`, one entry for Drak to paste into a master
`journal.txt` that he never kept, because the journal began as a turnover aid against context
compaction rather than as a document to collect. The repository is the master now, seeded with
the two entries its history held, sessions 18 and 19.)*

## Rules that apply to all six

- **No em dashes in newly authored text**, in any of the four forms. Pre-v1.6 content is
  frozen and never swept; the baseline is what makes "newly authored" measurable.
- **No banned adjectives or AI-isms** from Drak's preference set, same baseline logic.
- Contractions by default. Vary sentence length. No end-summary recaps.
- **Every published number carries its derivation.** If a script produced it, the rule goes
  in `facts.json` and the prose quotes the fact.
- **Filename references decay.** `NN_` prefixes reflow on every upstream insertion, so
  re-verify every `NN_name.jsx` reference against the live tree at each turnover.
- **Per-arc and per-module line counts are Python `splitlines()` counts**, never `wc -l`.
- **A revision from a closed line carries its version** (`v1.6 r036`). The r-counter starts
  over with each line, so a bare r-number means the open line's, or, between lines, the line
  just closed. Tags carry the same pair as `v<version>_r###` (`docs/handoff.md`, Tags).
- **Rebaseline after a rewrite that shrinks a document** (`check_docs.py --baseline`), once a
  Python sweep shows nothing newly authored. The em-dash and banned-phrase checks count against
  the baseline, so a stale higher count lets new text through; `prove_teeth.py`'s em-dash probe
  is what notices, and since 2026-10-23 it fails the run when it misses.

## `facts.json`

`derived` is regenerated by `--write-facts` and never hand-edited. The four hand-authored
sections are the coverage, and the gate is only as good as what goes in them:

- `published`: every figure the docs state, with a regex that finds it in prose. `value` may
  be a list so a figure written as a word and as a numeral both pass.
- `assertions`: every `file:line` claim the prose makes about the tree.
- `spans`: the full tiling per arc, checked for rule-1 conformance and exact coverage.
- `required_strings`: per document, strings that must survive a correction round. This is how
  a fix is proven to have landed in every sibling.

When a review round finds a figure the gate missed, add it to `facts.json` in the same pass
as the fix.
