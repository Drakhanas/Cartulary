What it does
Cartulary is a worldbuilding application packaged as one HTML file you open in any modern browser. The feature surface:

Templates and the ecosystem
Twenty built-in templates cover the common ground — Character, Location, Faction, Religion, Magic System, and so on. Build your own when the defaults don't fit; Cartulary treats custom templates exactly like built-in ones. Entries reference other entries through typed fields, wiki-links inside long-text fields autocomplete and resolve, and every cross-reference renders downstream as graph nodes, family tree edges, timeline events, or map pins. The view layer reads the connections; you don't maintain them twice.

Template Builder
Templates can encode behavior: conditional reveal, cascade-select chains, half-width pair reflow, scoped and filtered entry-refs — all depending on which field values are filled in. Field types include text, numbers, selects, entry-refs, calendar dates, longform notes with Indent and Divider toolbar buttons, and a 2D grid type for paradigm tables, stat blocks, and ability matrices. The Preview window makes that behavior testable before you commit a template: edit a field and the preview updates; conditional fields appear and disappear, cascade chains constrain their child options. Test the full logic interactively. No scratch entries, no save-and-reload cycle.

Packs
Template bundles for specific genres and game systems, installable in a single import. A collision modal handles name conflicts. The Space Opera pack ships with Cartulary: 8 templates (Vessel, Technology, Cargo / Commodity, Colony / Station / Habitat, Route, AI / Synthetic, Crew, and Powers / Abilities) with entry-refs wired between them. Packs export individually for sharing.

Linea
Sosa-Stradonitz family tree with lifespan dates on every node, marriage dates with auto-reciprocity, parent-grouping descent geometry where siblings share a descent line, and configurable depth in both ancestor and descendant directions.

Stemma
Radial canvas for arbitrary tree-shaped data — manuscript stemmata, organizational charts, succession orders, religious lineages. Sixteen fixed slots clockwise around a focal node, drillable focal-and-children layout, freeform or entry-linked content, per-stemma JSON import/export.

Kalendarium
Define your own months (any name, any day count), eras (with short codes like AD/BC), and weekdays. Calendar dates throughout the application validate against your calendar definition; approximate dates carry a ~ flag so fuzzy timing renders correctly (~1370–1383). Define multiple calendars per world (Elven, Dwarven, dating systems your factions disagree about) anchored to a primary calendar by a single absolute-day reference, and bind entries to whichever calendar fits the culture they belong to. Each calendar gets a grid view with continuous-week math across month boundaries, seasonal color bands, moon phases per day cell, and a marker on the world's current moment.

Ephemeris
Astronomical body workspace with Keplerian orbital math. Define stars, planets, moons, asteroids, and other bodies — each with mass, radius, axial tilt, and full orbital elements. Compute finds conjunctions, oppositions, eclipses, transit windows, and nodal crossings across any date range. Habitable zone modeling with three thermal models and luminosity override. Observe gives a day-by-day sky view with bidirectional steppers. Forced Alignment lets you specify when a conjunction or eclipse occurs in your world and back-solves the orbital parameters to match — the sky fits your story rather than the other way around. Moon definitions live in Ephemeris; Kalendarium reads them for per-day phase display in the calendar grid. Astronomical bodies register as graph nodes in Concordance.

Cartographia
Maps you draw inside Cartulary. Start from an image, a blank vellum sheet, or both, then draw with Rect, Ellipse, Polygon, Line, Freehand, Fill, Text, and Stamp, paint with Brush and Eraser on raster layers, and label with text that can follow an arc. Named layers with show, hide, and lock; fifty steps of undo; Ctrl+scroll and pinch zoom. Stamps and brush tips come in packs, and the brushes you already own import as tips: Wonderdraft folders, Photoshop .abr, GIMP .gbr and .gih, Procreate .brush and .brushset. Pins link places on the map to entries, a time-mode scrubber filters pins by year, and labels are name-history-aware: a city pin in 1640 shows "New Amsterdam" even when the underlying entry is now "New York." Every map downloads as SVG or PNG.

Concordance
Force-directed graph of every cross-reference in your world. Drag nodes to lay out a star map, faction-power diagram, or planar cosmology — positions save alongside the world and survive reload, export, and device transfer. Conlang nodes (ConLangs, Lexemes, Phonemes, and more), astronomical body nodes, and maps (with their pins as edges to the entries they point at) appear in the graph alongside regular entries. Focus mode zooms in on any entry's neighborhood up to three hops away.

Chronometric
Timeline that lays events out proportionally, with era bands and parallel template lanes that resize to fit overlapping events. Zoom spans millennia down to single days with calendar-aware tick generation.

Glossopoeia
Dedicated conlang workspace. Organize multiple languages per world, each with its own phoneme inventory, syllable structure, stress patterns, phonotactic constraints, and morphology toolbox: grammatical values, affixes, word-building processes, and inflection classes with paradigm grids. Display workspaces for Noun Number and Verbs filter the toolbox by part of speech. Diachronic forking: clone a language into a daughter and run sound-change rules to derive the daughter's inventory from the parent. Per-language import and export. Language deletion cascades through all owned records. ConLang and Lexeme nodes register in Concordance and are targetable from Character, Location, Culture, and other entries.

Name history
First-class field type. Track what something was called when, with date ranges; the application uses those names contextually across maps, timelines, and exports.

Exports
Per-entry Markdown, per-Linea family tree Markdown, whole-world Markdown, ZIP archives with embedded images and painted map layers, per-map SVG and PNG, JSON as the canonical save format that's fully importable and scriptable, and a self-contained HTML export for sharing worlds with readers who don't have Cartulary, maps drawn in. Custom templates, Stemmas, and Calendars export individually with a Skip/Replace/Rename collision modal on import; stamp packs export as JSON or as a zip of PNGs.

What's new in v1.6
The map editor
A map is no longer an image with pins on it. It's a canvas you draw and paint on inside Cartulary: an image you bring, a blank sheet in landscape, portrait, square, or a custom size, or both. Tools are Rect, Ellipse, Polygon, Line, Freehand (simplified on release), Fill (floods an enclosed area; small gaps close on their own), Text, Stamp, Brush, Eraser, and Pan, with Pin still the default. A palette of eight plus None for fill and stroke, line widths from 1 to 32 (up to 64 typed), and Smooth for rounded corners and curved polygons. Labels take three sizes, an angle, and an arc from -180 to 180 degrees. Select moves a shape, reshapes it by its points, turns a label or stamp (Shift snaps to 15 degrees), nudges with the arrow keys, and deletes. Layers are a named, ordered stack with show, hide, and lock; a hidden layer stays out of the exports. Undo and redo run fifty steps, one per gesture, pins included; this is the first undo in Cartulary and it covers the map editor while you're in it. Zoom with Ctrl+scroll (Cmd on a Mac), a pinch, or the corner bar, from Fit to 8x; pan with the Pan tool, Space, the middle button, or two fingers. The tool strip's groups dim rather than disappear when they don't apply, Arrange reorders them, every tool has a letter, and every swatch carries its name for a screen reader.

Painting and brush packs
Brush and Eraser paint on raster layers; the first stroke on a drawing layer makes a Paint layer above it. Hard and soft round tips are built in, and any tintable tip a pack brings in works too. Load image fills a raster layer with a PNG, JPEG, or WebP scaled to the canvas. With an image folder connected, each painted layer is a file in the folder; without one, it embeds in the save. Pen, mouse, or finger; a pen's eraser end erases; pressure isn't read. Four stamps are built in (mountain, tree, settlement, compass rose) and the rest come from packs: a Cartulary pack is a .json of SVG symbols, PNG tips, or both, sanitized on import and on every load, with the import showing what it removed. Brushes you already own import as tips from PNG files or a zip (Wonderdraft names and tint modes are read), Photoshop .abr, GIMP .gbr and .gih, and Procreate .brush and .brushset. Packs export as JSON or as PNGs in the Wonderdraft layout that Inkarnate and Dungeondraft also take.

Maps are their own records
Maps are no longer entries of a Map template. Each is a record in Cartographia with Description, Scope / Region, and Notes, its canvas, and its pins. The Map template is gone from the sidebar and the map kind from the Template Builder. Cartographia indexes every map, most recently updated first, with the world's stamp packs in a panel above the list. Maps appear in Concordance as their own type. Worlds saved by v1.5 migrate on load: every map opens with its image and pins where they were and the drawing empty, and any extra field a custom map template had is kept in the record with a line in Notes naming it.

Getting a map out
Download SVG or PNG from a map's view, with the image and painted layers inlined, stamps resolved, hidden layers out, and the map font embedded; PNG is drawn at twice the canvas size. The HTML export renders every map through the same renderer, and the Markdown + images zip carries the painted layers.

Under the hood
Cartulary is still one HTML file and behaves the same whether you open v1.5 or v1.6. The source that used to be one 39,000-line script is now a tree of 44 module files that a build assembles into the file you download, checked on every change: the assembled file must parse, and a pure reorganization must reassemble byte for byte against a frozen reference. The repository is public at github.com/Drakhanas/Cartulary.

And more
The in-app help has three map topics (Cartographia; Map Editor; Stamps & Brushes) and a corrected JSON schema, and eight other topics were read against the application and corrected where they had drifted.
cartulary.world's Cartographia page is a hub with sub-pages for the editor and for stamps and brushes.
Designed for
Solo worldbuilders. Novelists with long-running fictional universes. GMs with home-brew settings that span multiple campaigns. Writers building story bibles for series fiction. Conlangers organizing vocabulary against the cultures and locations that produce it. Anyone whose worldbuilding is dense enough that hundreds of entries need to stay connected without losing their tangles.

Defaults work out of the box without a configuration phase. The schema flexibility handles unusual settings: sci-fi, urban fantasy, historical, planar cosmology, post-apocalyptic, whatever fits. Schema-flexible enough to model what's distinctive about your world; opinionated enough that you don't have to make every decision from scratch.

How it's built
Cartulary is one HTML file. The application is inside it: HTML structure, CSS, React for the UI, marked for Markdown rendering, d3 for graph layout, JSZip for ZIP exports, and the application source itself, all inlined. Every dependency is embedded, and nothing is loaded from the network at startup. Fonts (Cormorant Garamond and DM Sans) ride along as base64 woff2. The one network request in the application happens when you download a map as SVG or PNG while online: the file asks Google Fonts for the map's label font so the download carries it, the same request any web page makes when it loads a Google font. Offline, the download still works and the viewer's serif stands in. Nothing about your world is sent anywhere.

Two builds ship: a precompiled production build that runs faster, and a Readable build with the JSX source preserved alongside Babel-standalone so you can open it in a text editor and read the code as authored. The Readable build is the source as shipped. The source as worked on is the public repository at github.com/Drakhanas/Cartulary: the module tree the single file is assembled from, the build, the gates that check it, and the project's own documentation. Rebuild from the tree and you get the shipped file, byte for byte. Anyone skeptical of the AI disclosure or the architecture claims can inspect either.

Worlds are stored in IndexedDB and exported/imported as .json. Version-history snapshots live in IndexedDB alongside your active world. The full schema is documented in the in-app Help under JSON Save File Schema, so you can write your own importers, exporters, or bulk-transformation scripts.

The single-file architecture is deliberate. It makes Cartulary trivially portable (USB drive, NAS, email attachment), trivially auditable (read the source in a text editor), and trivially safe (delete the file, no state remains on your system). It also rules out certain things by construction. There's no server to add real-time collaboration to. No cloud surface to gate behind a subscription. No app store distribution path. The MIT license is irrevocable for shipped code, and the architecture has no paywall surface to monetize even if intent ever shifted. The structure makes Cartulary free in a way that doesn't depend on the author's continued goodwill. It's a property of how the application is built.

Scale
Cartulary has been tested past 10,000-entry worlds with no hard limits encountered. That's roughly double the most exhaustive single-author fictional universe in modern fantasy — full Cartulary catalogs of Shakespeare's complete works land around 1,500–2,000 entries, the complete Tolkien legendarium (LOTR + Hobbit + Silmarillion + History of Middle-earth) around 2,000–3,500, A Song of Ice and Fire across five books around 3,000–4,500. All comfortably under 5k. The slowest operation at 10k entries on aging-laptop CPU throttling was the HTML export at 29 seconds. Painful, but it finished. Most editing operations stay snappy well past the scales any realistic single-author worldbuilding hits.

Connecting a linked images folder (via the File System Access API in Chrome/Edge/Brave/Opera) keeps your world JSON tiny regardless of image count; painted map layers go in the folder too. Inline image mode is the fallback for browsers without folder access; world JSON grows with image bytes but stays workable up to a few hundred images.

Limitations to know about
Single-user, single-world-at-a-time per browser. No real-time collaboration, no shared editing, no permissions. Worlds move between people via JSON export/import.

No cloud sync. Your worlds live in IndexedDB on a single machine; back them up by exporting JSON. If you clear your browser storage without an export, the world is gone. Version history doesn't survive a storage clear either — it lives in the same IndexedDB.

Maps aren't a virtual tabletop. You can draw, paint, stamp, pin, and filter pins by year; there's no fog of war, no dice, no initiative tracking, and no player-facing session view. The map editor reads a pen's eraser end but not its pressure.

Not a manuscript editor. Entries have long-text fields with Markdown and wiki-links, but Cartulary isn't Scrivener or Campfire. No chapter module, no scene structure, no auto-linking from typed prose. Take notes inside entries; write your novel somewhere else.

Desktop-first. The UI is built for keyboard and mouse. Cartulary loads on mobile browsers but you'll need to force desktop-site mode and the experience is degraded. Phone-first design isn't planned.

Hobby pace. Bug fixes happen when bugs surface. New features happen when the author wants them. There's no release schedule and no support contract. If you need monthly updates and a support inbox, use a SaaS tool. That's what those are for.

AI disclosure (REAL Level 4)
Cartulary was built using Claude as an implementation partner. The author is not a programmer. Architecture, schema design, scope decisions, QA, and bug triage were human-led by a worldbuilder who'd spent years bouncing off other tools and knew exactly what was missing. All implementation code was AI-generated under direction. Without AI assistance, this project would not exist.

The application itself contains no AI features at runtime. It does not call any LLM, does not generate content for you, does not phone home to any AI service. Once the file is on your disk, it is a static, deterministic, fully offline application. Your worldbuilding stays your worldbuilding.

REAL Rating Level 4 is "AI generation of major components or ideas, where the content of the work would have been different if AI was not involved." That describes Cartulary accurately. The disclosure is structurally backed twice over: the Readable build ships the source inside the file, and the public repository holds the tree it's built from along with the project's working documents, so anyone curious about the human-vs-AI split can inspect what was built and how, and form their own judgment.

License
Cartulary is released under the MIT License. Use it, fork it, modify it, redistribute it. The bundled third-party libraries (React, Babel, marked, d3, JSZip) are also under MIT. The bundled fonts (Cormorant Garamond and DM Sans) are under the SIL Open Font License 1.1. Full license texts are embedded as a comment block at the top of the HTML file.

Inspiration and acknowledgments
Cartulary's design owes a substantial debt to Obsidian. The wiki-link syntax, the local-first ethos, the "your data is yours, in a format you can read without our software" principle, and the philosophical refusal to add features that compromise the local-first design — all came from years of using Obsidian. Cartulary's main divergence is shipping with worldbuilding-specific schema out of the box. Different point on the configuration-vs-immediacy axis; same underlying values.

Thanks also to the broader worldbuilding tools community: WorldAnvil, Kanka, LegendKeeper, Campfire, Fantasia Archive, and others. Cartulary's design choices are explicit responses to seeing what those tools do well and where they don't fit a particular kind of user.

And thanks to Anthropic's Claude, which wrote the implementation code. Used as a tool, not as a product. Credit where it's due.

Community
Full documentation and feature guides at cartulary.world. Source at github.com/Drakhanas/Cartulary. Join the Discord at discord.gg/zWMKXfZtcC.

Quick start
Download Cartulary_v1.6.zip from this page. Inside:

Cartulary_v1.6.html — the build to run
Cartulary_v1.6_Readable.html — the source build, JSX intact
README.md — getting-started
Then:

Open Cartulary_v1.6.html in any modern desktop browser (Chrome, Firefox, Edge, Safari, Brave).
Click the world name at the top-left of the sidebar to set up your world details, then open Kalendarium in the sidebar to configure your primary calendar.
Pick a template from the sidebar and click + New Entry. For a map, open Cartographia and click + New Map.
The full usage guide is inside the application. Click ◐ Home in the sidebar to open it. Full documentation is also at cartulary.world.

When you're ready to back up, go to Settings → Export .json. That .json file is your canonical save. The browser-stored copy is a working copy.

Found a bug or have a question? Email codex@cartulary.world, comment on this page, or join the Discord at discord.gg/zWMKXfZtcC. Bug reports can also be filed as issues at github.com/Drakhanas/Cartulary. Bug reports and suggestions are welcome; I read everything.
