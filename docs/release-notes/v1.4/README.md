# Cartulary v1.4

A single-file worldbuilding tool. Two builds in this archive:

- **Cartulary_v1.4.html** — the build to run. ~2 MB. Open in any modern desktop browser.
- **Cartulary_v1.4_Readable.html** — the canonical source distribution. ~5 MB. Same application, JSX source preserved. Open in a text editor to read the code as authored.

## Getting started

1. Open `Cartulary_v1.4.html` in a recent version of Chrome, Firefox, Edge, Brave, or Safari.
2. Click the world name at the top-left of the sidebar to set up your world details, then open **Kalendarium** in the sidebar to configure your primary calendar.
3. Pick a template from the sidebar (Character, Location, Faction, etc.) and click **+ New Entry**.
4. Start building.

The full usage guide lives inside the application — click **◐ Home** in the sidebar after opening it.

## Backing up your world

The browser-stored copy is a working copy. Your canonical save is a .json file you export yourself:

- **Settings → Export .json** writes the entire world to a file. Save it anywhere outside your browser; back it up like any document.
- **Settings → Import .json** restores a world from one of those files.
- **Project → Version History** keeps in-app snapshots (auto every five minutes, plus manual ones you pin). Useful for undo on large changes, but it lives in browser storage and doesn't survive clearing it. Treat it as a session safety net, not your backup strategy.

If you clear your browser storage or switch devices, the only way to keep your work is from a recent JSON export. Get into the habit of exporting after substantial editing sessions.

## What's new in v1.4

- **Kalendarium** — a new top-level view for multi-calendar worlds. Define additional calendars (Elven, Dwarven, dating systems your factions disagree about) anchored to your primary calendar via a single absolute-day reference. Date-bearing entries can bind to a specific calendar; cross-entry views (timelines, maps, family trees) carry per-view calendar selectors so you can see the same data through whichever frame fits the moment. Single-calendar worlds see no change. Each calendar gets a grid view with seasons (color bands across the year), moon phases per day cell for any moons you define, and a marker on whatever day you've set as the world's current moment.
- **HTML export** — produces a single self-contained `.html` file per world for sharing with non-Cartulary users. Inlined CSS, base64 images, pre-rendered markdown, working cross-references between entries. Read-only artifact; no install required to view.
- **Version History** — snapshot-based undo for catastrophic state changes. Auto-snapshots every five minutes (capped at ten), plus pinned manual ones you keep around. Reset, Import, and Restore each pin a safety snapshot first, so an accidental wipe is recoverable.
- **Cartographia** — the Maps view promoted to its own top-level sidebar entry. Time-aware pins now consult the world's current moment, so entries that exist in the present render and entries from other eras stay hidden until you scrub time. Ctrl+scroll zoom and richer hover behavior on the map canvas itself.


Plus auto-age on character lifespans, deeper Chronometric zoom with calendar-aware ticks, three-level Vertical Timeline zoom, drag/paste image input, a small visual pass, and a long tail of bug fixes and polish.

Full release notes at drakhanas.itch.io/cartulary.

## Scale

Cartulary has been tested past 10,000-entry worlds with no hard limits encountered. That's roughly double the most exhaustive single-author fictional universe in modern fantasy — full Cartulary catalogs of Shakespeare's complete works, Tolkien's complete legendarium, or A Song of Ice and Fire all sit comfortably under 5,000 entries.

## License

MIT. Full text is embedded as a comment at the top of either HTML file. Bundled libraries (React, marked, d3, JSZip, Babel) are also MIT; bundled fonts (Cormorant Garamond, DM Sans) are SIL OFL 1.1.

## Updates and feedback

**drakhanas.itch.io/cartulary**

Cartulary is a hobby project with no formal support channel. Bug reports and suggestions go in the itch.io page comments.
