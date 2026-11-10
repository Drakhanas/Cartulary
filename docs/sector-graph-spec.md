# Cartulary, Sector Graph Spec (v1.8)

> **The build sheet, settled 2026-11-07 (session 23).** Planned before v1.8 opened, from the roadmap's Concordance sector graph row (its full sketch in `roadmap-archive.md`, the v1.6 record's copy of the backlog) and, folded in, the typed relations row. One call per message, four calls. Every decision below is Drak's unless it says otherwise; the dated calls are in section 1. Claude's defaults are marked as his.

---

## 0. One-sentence statement

Reference fields can become link fields, each with a name, a line style, a color, and values each link carries; Ephemeris bodies get them too; Concordance draws them in their styles with a legend and a Stars mode; and a Binary star kind makes a circumbinary pair one body.

## 1. Decisions (Drak, 2026-11-07)

- **Into v1.8** (00:46: "add, since we're touching a few different modules in this"); **its place** (10:48, option a: after computed fields, before the walkthrough).
- **Where it lives, call 1, option a** (13:49: "a for now, put Astrographia on the backlog"). A Stars mode in Concordance. The other ways were its own view, Astrographia, which goes to the backlog; and a tab inside Ephemeris.
- **Where links and their values are stored, call 2, option b** (13:50: "b, as long as we're doing this, we may as well do it right. trade routes and faction ties will need a different type of line connection to indicate difference"). A value on any reference link, stars one use of it. The other ways were a, Claude's default, a Connections list on the stars alone; and a Connection record of its own. This is the typed relations row's ground, so that row folds in here.
- **Where a relation's name, style, and color are set, call 3, option a** (14:21, on Claude's first framing: "reading a and i think id like a different route here. color picker w/ user editable relation name, not just hyperlane/traderoute/faction"; 14:32, on the reframed fork: "a"). Per field, with a name the user types and a color from a full picker. The other ways were a world list of relations picked per link, and a name and color typed per link.
- **Binary and multiple stars, call 4, a with c** (14:36: "could we mark a new star type - binary?"; 14:38: "a with c"). A Binary star kind for circumbinary pairs, and companions kept as children of their primary for wide pairs (section 5). The other ways for the kind were a narrative Binary with no physics; the first fork's ways were every star its own node (Claude's default), only top-level stars as nodes, and systems marked by hand.
- **The cut plan** (section 7; 14:39: "looks good").

## 2. What the plan found

- Concordance has drawn Ephemeris's stars, planets, and moons as nodes since v1.5, through the node-source registry, with `parentBodyId` as "orbits" edges. Nothing made for it links one system to another, though a body's Visible From pick of another body, or a [[link]] in a body's text, draws an edge between systems today. It saves node positions (`state.concordance.positions`).
- Ephemeris bodies aren't entries and have no template, but each carries four reference lists, Visible From, Notable Locations, Inhabited By, and Sacred to (`24_ephemeris/00_body-kinds`), edited with `EntryRefEditor` (`02_asbo`), read by the link index (`22_trunk`), and drawn by Concordance (`17_concordance`); Visible From can name another body. Link fields on bodies are lists of the same kind, defined once for the world. Narrative kinds carry no orbital math. A body's orbit is around one parent's mass.
- `relationKind` has two values, parent and spouse; spouse links carry Married and Ended dates and mirror to the partner (since v1.2), and parent links carry a label (the typed relations row).
- The browser's own color input is already in five places: the Color field type's editor, a map pin's color, season colors, a body's Observe color, and Observe's per-kind colors (`14_form-engine-edit`, `18_cartographia/03_view`, `06_calendar-engine`, `24_ephemeris/02_asbo`, `24_ephemeris/03_observe`); the preset palette `COLORS` (`00_trunk`) feeds template colors and Stemma. A link field's color uses the same input.

## 3. Link fields (cuts S1 and S2)

- In the template builder a reference field can be made a link field: a name the user types, a line style (solid, dashed, dotted, double), a color from the full picker, and the attributes each link can carry: a number with a unit, a label, start and end dates.
- S1 fixes how a link's attributes sit beside the stored ids so that saves from before read unchanged, and the CSV columns they export as.
- Ephemeris bodies get link fields of the same kind, defined once for the world (a Hyperlanes field with a distance in light-years, say), edited on a body's page. A link between two stars draws once, whichever side holds it.
- Parent and spouse keep working as they do; existing worlds' family links draw as now.

## 4. Concordance (cut S3)

- Links draw in their field's style and color, their values as labels.
- A legend: a row per link field, its name, line, and color, and a switch to hide or show it.
- 2D: Concordance is a 2D graph, and call 1 put the sector graph in it; 3D goes with Astrographia to the backlog.
- A Stars switch shows only stars and the links between them. On a world with one star system it says that's what it found, and that links between systems are made on a star's page.

## 5. Binary star (cut S4)

- A new body kind: one body, one node, with two named members and each one's share of the mass.
- Its planets orbit the combined mass at the pair's shared center, the usual approximation for planets circling both stars from well outside the pair.
- Observe draws it as one sun; moon phases and seasons from Ephemeris read it as one light source. The hover and the body's page list both members.
- A planet orbiting one star of a pair is the existing way: the companion a child of its primary, its own node beside the primary in Stars mode.

## 6. Probes

A link's attributes saved, exported, and imported back; a link drawn in its field's style; Stars mode's nodes and links; a planet's orbit around a binary against a known answer.

## 7. Cut plan

After computed fields and before the walkthrough, per the order in the roadmap's v1.8 section.

| # | Cut | What it does |
|---|---|---|
| S1 | Link fields | Section 3, on entries |
| S2 | Links on bodies | Section 3, on Ephemeris bodies |
| S3 | Concordance | Section 4 |
| S4 | Binary star | Section 5 |
| S5 | Probes and site text | Section 6; the site text a site edit |

## 8. Won't-have in v1.8

- Astrographia, a view of its own (call 1; the backlog).
- 3D.
- A world list of relations, or relations typed per link (call 3).
