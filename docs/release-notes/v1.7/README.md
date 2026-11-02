# Cartulary v1.7

Cartulary is a worldbuilding application in one HTML file. Open it in a browser, build a world. No account, no cloud, no subscription, no telemetry. Your world lives on your disk in a .json file you can read in a text editor.

## What's in this zip

- `Cartulary_v1.7.html`: the build to run.
- `Cartulary_v1.7_Readable.html`: the same application with the JSX source left intact and Babel inside to compile it. Larger and slower to open; it exists so you can read the code as written. If you aren't here to read code, ignore it.
- `README.md`: this file.

Put the .html file wherever you like. It works from a USB stick, a NAS, or a folder on your desktop.

## Getting started

1. Open `Cartulary_v1.7.html` in a modern desktop browser: Chrome, Firefox, Edge, Safari, or Brave.
2. Click the world name at the top-left of the sidebar to set up your world details, then open Kalendarium in the sidebar to configure your primary calendar.
3. Pick a template from the sidebar and click + New Entry.
4. For a story, open Fabula in the sidebar and click + New Story. For a map, open Cartographia and click + New Map. For loose thinking, open Stemma and make a rota or a tabula.

The full usage guide is inside the application: click ◐ Home in the sidebar. The same documentation is at cartulary.world.

## Saving and backing up

Your world is stored in the browser's own storage (IndexedDB) as you work, a quarter second after each change. That copy is a working copy. The canonical save is the .json file you get from Settings → Export .json. Export when you finish a session and keep dated copies.

New in v1.7: with an image folder connected (Settings), Cartulary also writes backups of the world into a `cartulary-backups` folder inside it as you edit, keeping the newest 10. If the browser's storage is cleared, an export or a backup is the only way back, because Version History lives in the same storage.

## Upgrading from an earlier version

Export your world to .json from the version you've been using before you open v1.7. Then open `Cartulary_v1.7.html` in the same browser. Depending on the browser, v1.7 may find the world the old file left in storage and migrate it in place; if it opens empty, import the .json from Settings.

Worlds from v1.6.1 and earlier load as they are. Plot Thread and Theme / Motif move under Fabula, still entries; nothing is lost, and the save stays plain JSON.

## Images and painted maps

Entry images, painted map layers, and the folder backups can live in a folder on your disk instead of inside the save. Connect one from Settings. This uses the File System Access API: on by default in Chrome, Edge, Opera, Vivaldi, and Arc, behind a flag in Brave, and absent in Firefox and Safari. Without a folder, images embed in the save, which works but grows the .json, and there are no folder backups.

## Help, bugs, questions

- The in-app help (◐ Home) answers most usage questions.
- Documentation and feature guides: cartulary.world
- Comments on the itch.io page: drakhanas.itch.io/cartulary
- Discord: discord.gg/zWMKXfZtcC
- Bug reports as GitHub issues: github.com/Drakhanas/Cartulary
- Email: codex@cartulary.world

Cartulary is a hobby project. There's no support contract and no release schedule, but everything sent gets read.

## Source

The source is public at github.com/Drakhanas/Cartulary: the module tree the single file is built from, the build, the checks that gate it, and the project's own documentation. The Readable build in this zip is the same source as shipped.

## License and AI disclosure

Cartulary is MIT licensed. The bundled libraries (React, Babel, marked, d3, JSZip) are MIT; the bundled fonts (Cormorant Garamond and DM Sans) are under the SIL Open Font License 1.1. The full license texts are in a comment block at the top of each HTML file.

Cartulary was built with Claude as the implementation partner, under human direction, and is disclosed as REAL Rating Level 4. The application contains no AI features at runtime: it calls no model, generates nothing, and makes no network requests at all. The long version is on the itch.io page.
