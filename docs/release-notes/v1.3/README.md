# Cartulary v1.3

A single-file worldbuilding tool. Two builds in this archive:

- **Cartulary_v1.3.html** — the build to run. ~1 MB. Open in any modern desktop browser.
- **Cartulary_v1.3_Readable.html** — the canonical source distribution. ~4 MB. Same application, JSX source preserved. Open in a text editor to read the code as authored.

## Getting started

1. Open `Cartulary_v1.3.html` in a recent version of Chrome, Firefox, Edge, Brave, or Safari.
2. Click the world name at the top-left of the sidebar to set up your calendar and world details.
3. Pick a template from the sidebar (Character, Location, Faction, etc.) and click **+ New Entry**.
4. Start building.

The full usage guide lives inside the application — click **◐ Home** in the sidebar after opening it.

## Backing up your world

The browser-stored copy is a working copy. Your canonical save is a .json file you export yourself:

- **Settings → Export .json** writes the entire world to a file. Save it anywhere outside your browser; back it up like any document.
- **Settings → Import .json** restores a world from one of those files.

If you clear your browser storage or switch devices, the only way to keep your work is from a recent JSON export. Get into the habit of exporting after substantial editing sessions.

## What's new in v1.3

- **Concordance positions persist** to your world file. Drag nodes to lay out a star map, faction diagram, or planar cosmology, and the arrangement stays through reload, export, and device transfer.
- **Template Preview popup** in the template builder — live render of your in-progress template as an entry form, in a separate window.
- **Every built-in template rebuilt** with structured Type/Status options, multi-template entry-ref scopes, sci-fi vocabulary additions, and canonical field-ordering.
- **Template engine primitives**: cascade-select, conditional fields (showWhen), multi-template entry-refs, reference filters, "Other" with custom text. Usable in your own templates.
- **Half-width pair layout** is now universal — adjacent half-eligible fields auto-pair in entry forms across both built-in and user templates.

Full release notes at drakhanas.itch.io/cartulary.

## License

MIT. Full text is embedded as a comment at the top of either HTML file. Bundled libraries (React, marked, d3, JSZip, Babel) are also MIT; bundled fonts (Cormorant Garamond, DM Sans) are SIL OFL 1.1.

## Updates and feedback

**drakhanas.itch.io/cartulary**

Cartulary is a hobby project with no formal support channel. Bug reports and suggestions go in the itch.io page comments.
