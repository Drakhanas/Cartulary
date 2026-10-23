# Cartulary

A single-file worldbuilding tool. Open it in your browser, build worlds.

Cartulary is a desktop-oriented tool for long-form fiction, RPG settings, conlangs, story bibles, and anything else where you'd otherwise be drowning in scattered Word docs and notebook scraps. The whole application is one HTML file. No installation, no account, no telemetry. Your worlds save locally and export to JSON at any time.

## Quick start

1. Open `Cartulary_v1.2.html` in your browser. Any modern browser works: Chrome, Firefox, Edge, Safari, Brave, Opera, Vivaldi, Arc.
2. Click **New world** in the top-left.

That's the entire setup. The file is fully self-contained — fonts, libraries, code, all inlined. No internet required after download.

## Which file do I run?

Two builds ship together:

- **`Cartulary_v1.2.html`** (~1.4 MB) — the one you actually run. JSX precompiled, faster startup, smaller download.
- **`Cartulary_v1.2_Readable.html`** (~4.4 MB) — same app, but the source code is preserved as JSX. Open it in a text editor if you want to read or modify the source. Works identically in the browser, just larger.

If you don't know what JSX is, you want `Cartulary_v1.2.html`. If you're a developer who wants to read or fork the source, `Cartulary_v1.2_Readable.html` is the source — there's no separate repository, the readable build is the canonical source distribution.

## How saves work

Cartulary uses your browser's IndexedDB to persist worlds:

- Worlds autosave every 500ms after edits.
- They survive browser restarts.
- They live on the *specific browser* on the *specific device* you're using — there is no sync server.
- They're tied to the file's origin in your filesystem. If you move the file to a different folder, your saves stay with the original location.

**You should export to JSON regularly.** Settings → Export → JSON. The exported `.world.json` file is your real backup. Re-import on any device, any browser, any time.

## Browser compatibility

Cartulary works in any browser that supports IndexedDB and modern ES2020+ JavaScript. That's every browser made in roughly the last five years. There's a small "save to disk" feature that uses the File System Access API, which only Chromium-based browsers support; everywhere else, falls back gracefully to download-and-pick-folder. Everything else works identically across browsers.

Mobile browsers technically run Cartulary but the UI is desktop-first; expect cramped layouts and inconsistent touch behavior.

## Reporting bugs

Cartulary is a one-person project. Drop bugs and feedback on the itch.io comments page.

## License

Cartulary is MIT licensed. The full source ships as `Cartulary_v1.2_Readable.html` — that file is the canonical source code, with the JSX preserved as written. Open it in a text editor to read, fork, or modify it.

Bundled third-party software:

- React 18.2.0 (MIT) — Meta Platforms
- React-DOM 18.2.0 (MIT) — Meta Platforms
- @babel/standalone 7.29.4 (MIT) — Sebastian McKenzie and contributors (readable build only)
- marked 4.3.0 (MIT) — Christopher Jeffrey
- d3 7.9.0 (BSD-3) — Mike Bostock
- JSZip 3.10.1 (MIT) — Stuart Knightley and contributors
- Cormorant Garamond (OFL-1.1) — The Cormorant Project Authors
- DM Sans (OFL-1.1) — The DM Sans Project Authors

Full license texts are in the preamble at the top of each HTML file.

## On monetization

Cartulary is free, MIT-licensed, ad-free, and stays that way. There is no paid tier, no ads, no analytics, no server, no premium feature being held back. The MIT license already makes that irrevocable for code that's shipped — anyone can fork what's been released. The architecture (single file, local data, no remote anything) means there's nothing to gate behind a paywall even if I wanted to. I don't.
