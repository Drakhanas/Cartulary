# Cartulary

A worldbuilding tool that's just a single HTML file. Open it. Build a world. Save it.

![SCREENSHOT: Hero shot — main entry view with sidebar showing templates, an entry open in the editor, possibly with the Ashfall test world loaded so it doesn't look empty]

## What is this

Cartulary is a single-file worldbuilding application. You download `cartulary.html` (about 4MB), open it in any modern browser, and you have a worldbuilding tool. No installer, no account, no subscription, no cloud, no telemetry. Your world lives in your browser's local storage and in `.json` files you export. When you close the tab, your work is still there. When you delete the file, it's gone.

It comes with twenty-two pre-built templates covering common worldbuilding ground (Character, Location, Faction, Religion, Magic System, Calendar, Map, and so on), but the more interesting feature is that you can define your own. Every built-in template is just a starting point — you can edit the fields, change the icon, delete it, or build something completely different alongside it. The application treats your custom templates exactly like the built-in ones.

It has a custom calendar system, a graph view of cross-references, a vertical and horizontal timeline, a family tree with full Sosa-Stradonitz layout for ancestors, an interactive map with time-aware pins, and a name-history system for tracking what things were called over time. The schema-flexible design means none of these features are bolted-on modules — they're all consequences of how the core data model works.

## Why this exists

Most worldbuilding tools fall into one of two camps. On one side, polished SaaS platforms like WorldAnvil, Kanka, LegendKeeper, and Campfire — they're feature-rich, but your data lives on someone else's servers, and you pay monthly to access it. On the other side, general-purpose tools like Notion and Obsidian — flexible, but they don't *understand* worldbuilding, so you spend weeks configuring templates and plugins before you actually start building anything.

Cartulary sits between those two camps. It's local-first like Obsidian (your data is on your disk, not in someone's database), but it ships with a worldbuilding-specific schema like the SaaS platforms (so you're not configuring it for two weeks before you start). The schema is flexible enough that you can build your own templates when the defaults don't fit, but opinionated enough that you don't have to.

It's built by a worldbuilder who needs the tool, not by someone trying to sell you a subscription. The biases reflect that.

## Features

- **Twenty-two pre-built templates** with sensible default fields, all of which you can edit, extend, replace, or delete
- **Custom templates** with arbitrary field schemas — text, long text (markdown), tags, dropdowns, numbers, dates, in-world calendar dates, ranges, URLs, colors, images, entry references, name histories, and nestable repeating groups
- **Custom calendars** with user-defined months (any name, any day count) and eras (with short codes like AD/BC). Calendar dates throughout the application validate against your calendar definition.
- **Graph view** of every cross-reference, wiki-link, and map pin in your world, with focus mode to zoom in on any entry's neighborhood up to three hops away
- **Two timeline views** — vertical for chronological browsing, chronometric for proportional duration with era bands and parallel template lanes
- **Interactive maps** with clickable pins that link to other entries and a time-mode scrubber that filters pins by year so you can see what existed at any given point in your timeline
- **Family tree** with Sosa-Stradonitz ancestor layout, spouse status (active/former/estranged), two-sided spouse declarations with deterministic reconciliation, and per-edge override labels
- **Name history** as a first-class field type — entries can have former names with date ranges, and the application uses those names contextually (a city pin in 1640 shows "New Amsterdam" if the underlying entry is now "New York")
- **Wiki-links** with autocomplete, broken-link detection, and former-name resolution
- **Markdown export** per entry, per family tree, or whole world, plus zip exports with embedded images
- **JSON export** as the canonical save format — fully importable, fully scriptable
- **Dark theme**, custom font scale, secrets/lock mode for spoiler-safe sharing

[SCREENSHOT: Template editor showing custom field types and a nested group structure]

[SCREENSHOT: Chronometric timeline with era bands and parallel template lanes]

[SCREENSHOT: Map with pins in time mode showing the year scrubber]

[SCREENSHOT: Family tree showing Sosa-Stradonitz ancestor layout]

[SCREENSHOT: Relationships graph in focus mode showing one entry's neighborhood]

## Quick start

1. Download `cartulary.html` from this page
2. Open it in any modern desktop browser (Chrome, Firefox, Edge, Safari, Brave, etc.)
3. Click the world name at the top-left of the sidebar to set up your calendar and world details
4. Pick a template from the sidebar and click **+ New Entry**
5. Build your world

When you're ready to back up, go to **Settings → Export .json** and save the file somewhere outside your browser. That `.json` file is your canonical save — back it up like you would any document. The browser-stored copy is a working copy.

The full usage guide lives inside the application — click **◐ Home** in the sidebar.

## What Cartulary is

- A local-first single-author worldbuilding tool with a worldbuilding-specific schema
- Designed for solo writers, GMs, and worldbuilders who want their data on their own machine
- Opinionated enough to be useful out of the box, flexible enough to model unusual settings
- Free, MIT-licensed, and self-contained in one file you can read in a text editor

## What Cartulary isn't

- **Not multiplayer.** No real-time collaboration, no shared editing, no permissions system. One person, one world, at a time.
- **Not a cloud service.** No accounts, no sync between devices. Move worlds via JSON export/import.
- **Not a virtual tabletop.** Maps support pinning and time-aware filtering, not fog of war, drawing, dice, or initiative tracking.
- **Not a writing tool.** No manuscript module, no chapter-by-chapter prose editor, no auto-linking from typed text. (You can write notes inside entries, but it's not Scrivener or Campfire.)
- **Not a phone app.** Cartulary loads on mobile but the UI is desktop-shaped and most controls require forcing desktop-site mode in your mobile browser. Even then, expect a degraded experience. This isn't getting fixed.
- **Not under active monthly development.** Cartulary is a hobby project. Bug fixes happen when bugs surface. New features happen when the author wants them. There's no roadmap, no release schedule, and no support contract. If you need any of those, use a SaaS tool.

## Tech and architecture

Cartulary is one HTML file containing the entire application: HTML structure, CSS styles, React 18 for the UI, in-browser Babel for JSX transformation, marked for Markdown rendering, d3 for the graph layout, JSZip for ZIP exports, and the application source itself. Every dependency is inlined; the file makes zero network requests after it loads. Fonts (Cormorant Garamond and DM Sans) are embedded as base64 woff2.

Worlds are stored in IndexedDB and exported/imported as `.json`. The full schema is documented in the in-app Help under JSON Save File Schema, so you can write your own importers, exporters, or bulk-transformation scripts.

The single-file architecture is a deliberate choice. It makes Cartulary trivially portable (USB drive, NAS, email attachment, whatever), trivially auditable (open the file in a text editor and read the source), and trivially safe (delete the file and there's no leftover state on your system). It also rules out features that require server infrastructure: no real-time multiplayer, no cloud sync, no app store distribution. Those aren't oversights; they're consequences.

## AI disclosure (REAL Level 4)

Cartulary was built in four days using Claude as an implementation partner. The author is not a programmer. Architecture, schema design, scope decisions, QA, and bug triage were human-led — by a worldbuilder who'd spent years bouncing off Notion, Obsidian, and SaaS worldbuilding tools and knew exactly what was missing. All implementation code was AI-generated under direction. Without AI assistance, this project would not exist — period.

The application itself contains **no AI features at runtime**. It does not call any LLM, does not generate content for you, does not phone home to any AI service. Once the file is on your disk, it is a static, deterministic, fully offline application. Your worldbuilding stays your worldbuilding.

[REAL Rating Level 4](https://www.realgoodai.org/real-rating) is "AI generation of major components or ideas, where the content of the work would have been different if AI was not involved." That describes Cartulary accurately.

## License

Cartulary is released under the [MIT License](https://opensource.org/licenses/MIT). You can use it, fork it, modify it, redistribute it. The bundled third-party libraries (React, Babel, marked, d3, JSZip) are also under MIT. The bundled fonts (Cormorant Garamond and DM Sans) are under the SIL Open Font License 1.1. Full license texts are embedded as a comment block at the top of the HTML file.

## Inspiration and acknowledgments

Cartulary's design owes a substantial debt to **Obsidian**. The wiki-link syntax, the local-first ethos, the "your data is yours, in a format you can read without our software" principle, and the philosophical refusal to add features that compromise the local-first design — those all came from years of using Obsidian and learning what works. Cartulary's main divergence is that it ships with worldbuilding-specific schema instead of asking the user to build their own — different point on the configuration-vs-immediacy axis, same underlying values.

Thanks also to the broader worldbuilding tools community — WorldAnvil, Kanka, LegendKeeper, Campfire, Fantasia Archive, and others. Cartulary's design choices are explicit responses to seeing what those tools do well and where they don't fit a particular kind of user.

And thanks to Anthropic's Claude, which wrote the implementation code. Used as a tool, not as a product. Credit where it's due.

---

*Found a bug? Have a question? Cartulary doesn't have a support channel — it's a hobby project with no maintenance contract. Try the in-app Help (◐ Home in the sidebar) first; most usage questions are answered there. If you find an actual bug, the source is in the HTML file you downloaded — read it, fix it, and consider sharing the fix.*
