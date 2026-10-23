# v1.1 — Stemma

Cartulary 1.1 ships a new view: **Stemma**. A radial canvas for hierarchical structures — genealogies, lineages, succession orders, organizational reporting lines, manuscript stemmata, anything tree-shaped.

## What it does

A focal node sits at the center, surrounded by 16 fixed slots arranged clockwise from 12 o'clock. Each slot can hold a child node or stay empty. Click a child to drill in — that child becomes the new focal, with its own children radiating out around it. The breadcrumb at the top of the canvas tracks where you are in the tree; click any segment to jump back up, or use **Back to root** to return to the top.

Two kinds of nodes:

- **Freeform** — editable label, color, icon. Useful for ad-hoc concepts that don't have an entry to anchor to. "Founders' generation". "The lost lineage". "Pre-schism faction".
- **Linked** — bound to an existing entry, displays the entry's icon and current name, marked with a small chain badge. Rename the entry and the node updates everywhere.

Every node can be converted between the two kinds from the inspector. Linked nodes whose entries get deleted later become orphans (desaturated, italic, broken-link icon) — the cached name from when the link was first created stays visible so you remember what they were.

Stemmas import and export as `.stemma.json` files for sharing or individual backup. Cross-world transfers preserve linked nodes via strict entry-ID matching; nodes whose entries don't exist in the destination world land as orphans and prompt you to re-link.

## Why this view, why now

Cartulary's other views all handle a kind of relationship: Linea handles relations as a graph, Concordance handles cross-references as a list, Chronometric handles temporal relationships. None of them cleanly handle pure hierarchy. Drawing a six-generation succession order in Linea is technically possible and visually unreadable. Stemma exists for cases where the *shape* of the data is a tree, not a graph.

## Other changes in 1.1

- **Has-children indicator** on Stemma — child nodes with their own descendants show a small line radiating outward, so you know at a glance which subtrees have content
- **Ctrl+scroll zoom** on the Stemma canvas, mirroring Chronometric
- **Inline favicon** for browser tabs and bookmarks (warm-dark book on black, gold outline)
- **Dual-build distribution** — releases now ship two files. `cartulary.html` is JSX-precompiled and around 1.4 MB. `cartulary-readable.html` preserves the JSX as written and is around 4.4 MB. Same app, different distribution. Both fully offline. The readable build is for developers and the curious — open it in a text editor and read the source as it was written.

## Process

The Stemma feature went through a 125-test QA pass covering 20 surface areas (migration, sidebar, canvas rendering, drill-down, smart input, inspector, all CRUD, import/export, cross-feature interactions, edge cases). Pre-release bug audit caught and fixed four issues including a label-occlusion bug at the bottom slot and a missing isLocked guard on import.

## What's next

Working on **Packs** — a top-level abstraction for bundling related templates as importable units. The first pack will be **Conlang Tools** (Lexeme, Phoneme, Morpheme, Language, Compound, Paradigm) — built specifically to exercise the framework but useful for anyone with serious linguistic worldbuilding ambitions. Targeted as v1.5.

No timeline. It ships when it ships.
