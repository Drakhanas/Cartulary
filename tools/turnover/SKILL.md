---
name: cartulary-turnover
description: >
  Generate and verify a Cartulary session turnover document set (handoff,
  changelog, roadmap, doctrine, spine manifest, journal) that a fresh
  chat can pick up cold. Use this skill whenever the user asks for turnover,
  a handoff, session close, "wrap up the session," "give me the docs,"
  "update the doc set," or asks to correct or re-verify an existing turnover.
  Also trigger when a session has produced r-bumps, carves, gathers, or
  doctrine that are not yet written down. The skill gates delivery on a
  mechanical check (check_docs.py); nothing is handed over until it exits 0.
---

# Cartulary turnover

Produce a turnover doc set that survives a cold read, and prove it mechanically
before handing it over.

## Why this exists

Session 16 shipped a turnover, then spent four review rounds correcting it. The
artifact was clean every single time: every line count, gate result, and hash
held. The documents were wrong every single time. And by round three, most of
the defects were in prose written *during a correction round*, never read by
anyone before it shipped.

The failure was not carelessness. It was shape. A turnover written in one pass
and audited afterward puts the reviewer in the position of a compiler, and the
reviewer is a person paying for the time. So:

- Everything checkable gets checked by a script, not by attention.
- A correction pass corrects and does nothing else.
- Every published number carries its derivation.

## The five guardrails

These are the workflow, not advice. Each one is named after the defect that
produced it.

**G1. A correction pass changes only the reported items.** No new sections,
doctrine entries, changelog blocks, or journal text while correcting. Record
the round once, at the end, after the corrections have settled. *(Eight of nine
round-3 defects and most of round-4's were introduced while fixing round-2's.)*

**G2. A published number carries its derivation or it does not get published.**
If a script produced it, the rule that script implements goes in `facts.json`
and the doc quotes the fact. *(The header census went 64 → 105 → 108 and the
carve spans went too-low → too-high → right, each time from a throwaway script
whose output was published as fact.)*

**G3. Nothing ships until `check_docs.py` exits 0.** Not "I read it carefully."
*(The same six checks were hand-run by the user four times.)*

**G4. Fix a defect everywhere before fixing it anywhere.** Grep the whole set
first. *(A census item was struck in one table and left asserted in four prose
paragraphs and a doctrine entry.)*

**G5. If a fix would add more lines than it removes, stop and ask.** That is the
tripwire for G1.

## Where the toolchain lives (session 19 onward)

In the repository, `github.com/Drakhanas/Cartulary`, under `tools/turnover/`. Session 17
found two of the four files missing from the skill package and rebuilt them; session 18
found the package's `prove_teeth.py` had gone stale against the tree and could only be
replaced by Drak. A copy that lives in a skill package drifts, so there are no copies: the
skill package carries this file as a pointer, and the scripts are invoked from the clone.

- `SKILL.md` : this file.
- `check_docs.py` : the gate. Takes `--docs DIR --src DIR` plus one of `--facts`,
  `--write-facts`, `--baseline`. Exits 0 on `DOCS GREEN`.
- `prove_teeth.py` : eleven mutation probes against the gate. Resolves the checker through
  `Path(__file__).parent`, so it must stay beside `check_docs.py`. Its targets derive from
  `facts.json`, never from a literal of one session.
- `conventions.md` : per-document authoring rules and what goes where. Phase 1 reads it.

Work from a clone of the repository; if the session doesn't have one, attach
`Drakhanas/Cartulary` and clone it. If the installed skill package still holds its own
`check_docs.py`, `prove_teeth.py`, `conventions.md`, or `facts.example.json`, those are
stale copies from before session 19: use the clone's `tools/turnover/`, never the package's.

This file is the source of the installed skill. Change it here, in the repository, and
refresh the skill from it; an edit made only to the installed copy is lost at the next
refresh.

`facts.json` is NOT skill code. It is per-project state, regenerated each session by
`--write-facts`, and lives with the documents at `docs/facts.json`, as does the em-dash and
banned-phrase baseline at `docs/.turnover-baseline.json`. `facts.example.json` shows the
four hand-authored sections for a project that has none yet.

Invoke from the repository root; CI runs the same two commands on every push:

```
python3 tools/turnover/check_docs.py --docs docs --src cartulary-src --facts docs/facts.json
python3 tools/turnover/prove_teeth.py --docs docs --src cartulary-src
```

## Phases

Run them in order. Do not skip 0.

### Phase 0: baseline and ground truth (before writing anything)

```
python3 tools/turnover/check_docs.py --docs docs --src cartulary-src --write-facts docs/facts.json
```

The baseline (`docs/.turnover-baseline.json`) is committed and normally left alone: newly
authored text must add no em dashes and no banned phrases, so the counts never need to
rise. Re-write it with `--baseline docs/.turnover-baseline.json` in two cases, and only
after a Python sweep shows nothing newly authored: when verbatim pre-v1.6 content is
relocated between documents, and after a rewrite that shrinks a document. The gate counts
against the baseline, so a stale higher count lets new em dashes through;
`prove_teeth.py`'s em-dash probe is what notices (session 19's document-debt pass needed
exactly this).

`--write-facts` derives file count, total lines, canonical lines, declaration
count, no-trailing-newline count, and the active anchor **from the live tree**.
It preserves any hand-authored `published` / `assertions` / `spans` /
`required_strings` sections already in the file. Never hand-edit a `derived`
value; if it looks wrong, the tree changed and you re-run this.

`--baseline` snapshots per-file em-dash and banned-phrase counts so "newly
authored" is measurable against documents that legitimately carry hundreds of
inherited em dashes.

Then fill in the hand-authored sections of `facts.json`:

- **`published`**: every figure the docs will state, with a regex that finds it
  in prose. `value` may be a list so a figure written as a word and as a numeral
  both pass. This is what stops the same number disagreeing across documents.
- **`assertions`**: every `file:line` claim the prose makes about the tree
  (a header's location, what sits at a boundary). Verified against the source.
- **`spans`**: for each arc with published carve spans, the full tiling.
  Checked for rule-1 conformance (leads with a blank, never ends on one) and
  that the spans cover the arc exactly with no gap or overlap.
- **`required_strings`**: per document, strings that must survive. This is how
  a correction is proven to have landed in every sibling (G4).

### Phase 1: write

Author the set. Conventions, per-document rules, and what goes where are in
`conventions.md`. Under G1, if this is a correction round, change only the
reported items and stop.

### Phase 2: gate

```
python3 tools/turnover/check_docs.py --docs docs --src cartulary-src --facts docs/facts.json
```

Fix and re-run until `DOCS GREEN`. When a check fires, decide honestly whether
it is a document defect or a checker bug. Both happen. On the first run of the
current checker, all three failures were checker bugs (an unbaselined banned
list, a word-versus-numeral comparison, a too-loose anchor heuristic). If it is
a checker bug, fix the checker and go to phase 3.

### Phase 3: prove the gate still has teeth

```
python3 tools/turnover/prove_teeth.py --docs docs --src cartulary-src
```

Mandatory after any change to `check_docs.py` or `facts.json`. Eleven mutation
probes, each injecting one defect into a throwaway copy and asserting the gate
goes RED on the right check. Every probe must read `OK`, and the harness exits 1 if
any reads `MISS`. A `MISS` means a blind spot: fix the check, never the probe.

This phase is not optional and it is not ceremony. This project has shipped two
gates that scored a check they printed but excluded from the verdict: `byte_ok`
(wrong from v1.6's r004 to r023) and `raw_ok` (wrong from v1.6's r004 to r025). Both
were found by trying to fool the gate, not by reading it. The harness itself had the
same flaw until 2026-10-23: it printed `MISS` and exited 0, so CI's teeth step could not
fail.

### Phase 4: the adversarial read

The script covers what is mechanical. Read for what is not, against the tree,
not against the other documents:

1. **Every sentence that asserts a causal or directional claim.** "Chronometric
   inherits the orphan" was backwards and survived two rounds, because the
   orphan sits *above* the cut. The script cannot see a reversed preposition.
2. **Every hedge.** A hedge over a number that a rule already determines is an
   error report in disguise. "Sizes shift by one depending on which slice owns
   the boundary blank" was covering overlapping ranges; boundary rule 1 already
   decided ownership.
3. **Every count of a set you have edited.** Striking one item from a census
   does not update the prose that states its size.
4. **Every remedy whose failure mode is destructive.** A census listed thirteen
   sheared headers and proposed deleting one that was correct; it only looked
   wrong because the census tool paired headers with declarations and that one
   headed a call block. Check the tool's coverage before acting on its output.
5. **Every scope word.** "1,106 em dashes in the module tree" was 1,096 in the
   tree and 10 in the shell. Component figures right, scope wrong.

### Phase 5: deliver

Only after phases 2, 3, and 4 are clean. Commit the documents (one turnover commit,
the revision in the message written as its tag, `Turnover v1.7_r001`) and push; CI
runs phases 2 and 3 again. State what changed and its size from the commit stat; if a
correction round added more than it removed, say so and say why (G5). There is no zip
and no upload.

When CI is green on a cut's turnover, give Drak the three lines that tag it, because
the session's git credential can't push tags: `git pull` / `git tag v<version>_r### <sha>`
/ `git push origin v<version>_r###`. A line's first tag is its r001; the shipped tree
before it is r000 and is never tagged. A ship turnover gets the release tag instead,
`v<version>_Release` with a capital R, in the same three lines. The rule is under Tags
in `docs/handoff.md`.

## Marking deliberately superseded text

The checker treats every line as a live claim except:

- **`changelog.md`**: everything under a `### Session` header older than the
  newest. Append-only history, preserved verbatim.
- **`roadmap.md`**: everything above the newest `=== ADDED ... ===` block.
- **`journal.txt`**: every entry before the newest `=== ` line. The journal keeps
  every session's entry, oldest first, so only the newest is a live claim.
- **Any line carrying `[stale: reason]`**: the explicit escape hatch.

Use `[stale:]` when a document deliberately names something retired or wrong:
quoting an earlier edition, describing a known-stale artifact, or recording what
a superseded pass concluded. The marker forces the author to declare intent
instead of leaving a reviewer to guess whether a figure is history or a defect.

## What the checker does not cover

State this honestly rather than letting the green bar imply more than it means:

- Directional and causal claims in prose (phase 4).
- Whether a doctrine entry is *right*, only whether its numbers are.
- File placement. `check_docs.py` reads documents and the tree; it does not know
  which module a header *should* live in.
- Anything outside the six documents. The repository `README.md`, the files in
  `tools/turnover/`, and `docs/release-notes/` are never read, so sweep their added
  lines for em dashes and banned phrases by hand.
- Anything not listed in `facts.json`. The `published` and `assertions` sections
  are the coverage, and they are only as good as what gets put in them. When a
  review round finds a figure the gate missed, add it to `facts.json` in the
  same pass as the fix.
