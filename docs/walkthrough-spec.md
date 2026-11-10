# Cartulary, Walkthrough Spec (v1.8)

> **The build sheet, settled 2026-11-06 (session 23).** Planned before v1.8 opened, from the roadmap's onboarding walkthrough and sample world rows, one call per message, four calls. Every decision below is Drak's unless it says otherwise; the dated calls are in section 1. Claude's defaults are marked as his.

---

## 0. One-sentence statement

A Start here list on Home replaces the in-app help: step cards that take a new user to each part of Cartulary, a sample world built into the app to show them on, and the full reference on cartulary.world alone.

## 1. Decisions (Drak, 2026-11-06)

- **Planning before building** (10:34: "we're still in planning"; 10:35: "a", the walkthrough's plan next, against the leap rules, computed fields, and the hover descriptions).
- **What the app keeps, call 1, option a** (10:43: "A"). The walkthrough and a link; the full reference lives on the site alone. The other ways were the walkthrough plus a short offline core of help in the app, and the walkthrough added with the full help kept behind a Reference button. The row's direction was already his (2026-11-02): the site is "much better suited for the exhaustive workup of everything than it being in the app".
- **The walkthrough's form, call 2, option a** (10:44: "a"). A Start here list on Home (section 3). The other ways were a guided overlay tour pinned to the controls, and the sample world as the walkthrough, with notes in its entries.
- **How the sample world loads, call 3, option a** (10:54: "a"). Built into the app file, opened the way Import opens a world (section 4). The other ways were a view-only world held in memory beside the user's, and a download on the site.
- **What the sample world holds, call 4, option a** (10:55: "a"). Small, something in every view, drafted by Claude and edited by Drak (section 4). The other ways were the review's four things only, and a world of Drak's own.
- **The cut plan** (section 6; 12:16: "looks good'").

## 2. What the plan found

- The help is 42 topics, about 219,000 characters of source (`26_home-data`); the site's reference was written from it at r059 (`04cdb60`), and the save file's schema lives in its JSON Save File Schema topic.
- `site/helloworld.html` is one file, about 620 KB at `2d467c7`, and two commits this week document the twenty built-in templates in full, a format pass pending.
- One line elsewhere in the app points into the help: Settings' Browser storage row ends "(Help: Working With Multiple Worlds)" when the page is opened from a file (`16_trunk`). W4 points it at the site.
- Cartulary makes no request, so a link from the app to the site works only online. The site's page is one HTML file, so saving it beside Cartulary is the offline answer; on iPhone and iPad the hosted copy's service worker can cache it with the app (`docs/mobile-spec.md`, section 7).
- The app keeps one world per browser profile; opening another replaces it, which Import does today behind a warning that offers Export world first when the world has entries.
- The only example data in the app is Ephemeris's Sol, Terra, and Luna.

## 3. Start here (cut W4)

- Home shows a list of step cards in place of the help. Each card says what the step is, has a Show me button that takes the user there, and ticks once they've been.
- Show me can open Settings, a template's list, the sample world's entry whose name changes over time, its map, Chronometric, and the other views the sample world fills.
- The list can be dismissed and brought back from Home.
- The same on desktop and on touch: nothing is pinned to a control's position, so mobile's layout doesn't change it.
- A link to cartulary.world for the full reference, with the advice to save the site's page beside Cartulary for offline use.
- The cloud-drive guidance (the roadmap's row) and the one-file wording, "One HTML file runs the application. One JSON file carries your world.", go in here and on the site.

## 4. The sample world (cuts W2 and W3)

- Claude drafts it as `docs/sample-world.md` for Drak's edit before anything is built: about a dozen entries across Character, Location, Faction, and Historical Event; one place renamed over time through Name History; a family line for Linea, and a rota or tabula of its own for Stemma, which reads no family links; a map with pins; dated events for both timelines; a story with a few scenes for Fabula; a short conlang for Glossopoeia; and Ephemeris's Sol, Terra, and Luna.
- Built into the app file. An Open the sample world step in Start here loads it as Import does: straight away on a world with no entries, through Import's warning, with Export world first, on one with entries. Leaving it is Reset, or importing the user's own world.
- A map needs its image inside the file; the image is kept small, and W3 reports what the sample world adds to the file's size.

## 5. Where the reference goes from here

From 2026-11-06, a cut's reference text goes to the site, not the in-app help, which stays as v1.7 left it until W4 replaces it. The help goes stale on v1.8's features in between, which no user sees, since v1.8 ships with Start here. Mobile's cut 9 becomes a site edit (`docs/mobile-spec.md`, section 8).

## 6. Cut plan

Last in the line, per the order in the roadmap's v1.8 section.

| # | Cut | What it does |
|---|---|---|
| W1 | The site carries the reference | Everything the help says, and v1.8's features as their cuts land; the schema topic copied into `docs/`. A site edit, no r-number |
| W2 | The sample world, drafted | `docs/sample-world.md`, for Drak's edit (section 4) |
| W3 | The sample world, built | In the app file, with its Open step; the size it adds, image included |
| W4 | Start here | The help leaves Home; the step cards, the link, the cloud-drive guidance, and the one-file wording (section 3); Settings' pointer into the help points at the site |
| W5 | Probes | The suite gains opening the sample world and each Show me step |

## 7. Won't-have in v1.8

- Help text in the app beyond the walkthrough (call 1).
- A guided overlay tour (call 2).
- A world held in memory that never saves (call 3).
