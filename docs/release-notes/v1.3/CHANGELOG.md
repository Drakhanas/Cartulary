# Cartulary Changelog

Version-by-version list of changes. Patch-notes style. Newest at the top.

---

## v1.3 — May 2026

### New Features

- **Concordance positions persist** — drag a node and it stays through reload, export / re-import, and device transfer. Use it as a star map, faction-power diagram, planar cosmology, or any spatial diagram where arrangement carries meaning.
- **Template Preview popup** — new 👁 button at the top-left of the template builder opens a live-render of your in-progress template in a separate window. Tests cascade-select chains, conditional fields, "Other" reveals, and half-width layout as you edit. Ephemeral popup state — nothing saves to your world. Designed for use on a second monitor.
- **Cascade-select fields** — Type → Subtype hierarchies where Subtype options filter based on Type value (Location's Type/Subtype is the canonical example).
- **Conditional fields (showWhen)** — fields can render only when another field has a specific value (Character's Cause of Death only shows for deceased entries).
- **Multi-template entry-refs** — a single entry-ref field can reference any of several template types (a Plot Thread's antagonist can be a Character, Creature, Faction, Location, or any defined scope).
- **Reference filters** — entry-ref pickers can filter candidates by field+value on the target template (a Knight's Allegiance field can show only factions whose Type is "Knightly Order").
- **"Other" with custom text** — select fields can auto-inject "Other" as the last option and reveal a free-text input when picked.

### Templates

- **21 of 22 built-in templates rebuilt** with v1.3 schema. Each got: appropriate Other Names / Former Names opener, structured Type and Status fields with curated alphabetized options + "Other" escape valve, multi-template entry-ref scope expansions, canonical field-order arc, and half-width pair layout.
- **Document / Text renamed** to **Book / Document / Text / Tome**.
- **Faction renamed** to **Faction / Government / Organization**.
- **Sci-fi vocabulary added** across Creature, Artifact, Book/Doc, Cosmology, and Deity Type lists, plus Location Subtype branches (Environmental, Settlement, Fortification, Domain, Structure). Spaceport, Datacenter, Arcology, Robot / Android, AI / Machine Intelligence, Data Crystal / Drive, Hyperspace / Subspace, and many more.

### Improvements

- **Half-width pair layout is now universal.** Adjacent half-eligible fields (text, number, date, calendar-date, color, url, tags, dropdown, single entry-ref) auto-pair into side-by-side rows in entry forms. Lone half-eligibles auto-expand to full. Works on user-created templates, not just built-ins. No flag or setting — adjacency in the field order determines pairing.
- **Concordance filter toggles preserve layout.** Toggling templates on/off no longer re-cooks the simulation; visible nodes hold positions, hidden ones don't render.
- **Concordance zoom and viewport persist** across filter toggles within a session.
- **Concordance focus combobox** now only suggests entries from currently-visible templates. No more typing a match and ending up on an empty graph because the entry's template was hidden.
- **New Concordance entries auto-place** around the pinned majority via single-pass force layout. After their first render, their positions get saved too.
- **Defensive validation** strips Concordance positions for deleted entry IDs on load. Delete-then-export doesn't carry stale data.

### Bug Fixes

- **Fixed: Duplicate entry IDs** when creating multiple entries with the same name in rapid succession. The four-character ID suffix now draws from the random portion of the generator instead of the timestamp prefix, closing a collision window that could affect entries, templates, fields, and pins.
- **Fixed: Lock mode race conditions** on Template Import (`handleImportTemplateFile` and `insertImportedTemplate`) — toggling lock on after opening the file picker no longer permits state mutation through the async FileReader callback.
- **Fixed: Lock mode bypass** on Concordance node-drag — drag-end now respects lock mode and refuses to write positions.
- **Fixed: Warning notice styling** in template import and Stemma import collision modals. Class name was `modal-notice-warn`, CSS rule defined `modal-notice-warning`. Warnings now render with the correct border-left and background tint.
- **Fixed: Missing `--warn` CSS variable** in both default and high-contrast themes. Cascade-hint warnings now render in the correct color per theme instead of falling back to a hardcoded value.
- **Fixed: Native alert() calls** in StemmaInspector's root-delete path and RichTextEditor's image-insert error path. Replaced with the standard flash() notification.

### Templates — Built-in Cleanup

- **Location Type doctrine fixed.** Added "Other" + custom-text to the Type field (the only outlier across all 22 built-ins missing the universal pattern). Subtype's `optionsByParent` cascade matrix gained an "Other" branch.

### Mostly Invisible Plumbing

- **Template origin protection.** Templates now carry an `origin` flag distinguishing built-in templates from user-created/imported ones. The migration framework filters all built-in-targeted operations on this flag, so user-created templates with built-in names (your custom "Character" that's nothing like the canonical one) don't get force-merged with canonical fields or have their option lists rewritten on load. Reset to Default is gated on origin; Restore Built-ins coexists with user-origin same-named templates instead of blocking on them.
- **Migration framework additions.** Several patterns formalized: `FIELD_TYPE_CONVERSIONS` for category-like text→select conversions that preserve data, `FIELD_VALUE_REMAPS` for moving values between fields, `SHOWWHEN_UPDATES` for re-asserting conditional visibility on built-in fields, per-rev re-versioning for in-place migration corrections, `OPTIONS_UPDATES` cascade-aware. Non-destructive doctrine: nothing destroyed silently — removed field content goes to Notes with a labeled prefix.

### Documentation

- **In-app Home docs updated.** Six sections rewritten to match v1.3 behavior: Concordance (substantial rewrite around persistence and stability), Views & Pages (Concordance one-liner), Template Usage (Template Preview popup paragraph), Field Types (half-width pair layout note), Browser Compatibility (Template Preview popup compat note), JSON Save File Schema (top-level shape now includes `stemmas` and `concordance`).

### Browser Compatibility

- **Template Preview popup tested** in Chrome, Edge, Firefox, and Brave. Safari is currently untested — please report any issues if you use it. Browsers with aggressive popup blockers may interfere; everything else in Cartulary works without the popup.
- **Firefox compatibility fix** in the Template Preview popup setup — explicit `doc.open() / write() / close()` claims the popup document synchronously, defeating Firefox's async about:blank loader that was wiping the popup contents on first open.

### Known Issues

- **Template Preview on Safari** is untested. May not work; may work fine. Bug reports welcome.
- **Pre-v1.3 worlds with a user-created template sharing a built-in name** get classified as built-in at the one-time origin backfill on first load. There's no way to retroactively distinguish them. If this affects you, recovery is either: delete the misclassified template + use Restore Built-ins (loses your custom data; gets canonical back), or Reset to Default (same outcome). From v1.3 forward, new user templates created via the template builder get clean `origin: "user"` and the protection works fully.

---

## v1.2 — May 2026

### New Features

- **Marriage feature with auto-reciprocity.** Spouse declarations carry optional Married and Ended dates plus a status field (Active / Former / Estranged). Declaring a spouse on one entry automatically creates a matching declaration on the partner's entry. Status, marriedOn, and endedOn mirror across both sides; per-side label override doesn't (it's speaker-relative). Reconciliation runs on every save, idempotent.
- **Marriages lane on Timeline; Chronometric.** Marriage spans render on a dedicated synthetic lane below the template lanes. One bar per pair, deduped across the two reciprocal declarations, labeled with both spouses' names. Read-only on timeline (edit dates from the entry editor).
- **Variable lane heights on Timeline; Chronometric.** All lanes — template lanes included — grow vertically to fit their row count. Sparse lanes stay at the previous minimum; busy lanes expand. Solves the crowded-lane label problem at default zoom.

### Improvements

- **Linea overhaul** with junction-style descent geometry (parent-pair branches from a shared junction down to children), lifespan dates on every node (`1903–2003` / `1980–Living` / `1980–?` / `~1742–1751`), user-selectable depth limits (1–10 each direction, default 5/5), hover-tooltip on truncated long names. Mother/Father per-parent labels dropped (the geometry communicates the relationship). Spouse line dropped (pairing implied by shared-children descent).
- **Concordance edge labels** now rotate to follow the line, sit on the visually-upper side, stay right-side-up regardless of line angle. Multiple same-direction relationships between the same node pair concatenate into a single edge with `//`-joined labels. Reciprocal relationships offset toward their respective target nodes so labels don't collide at the midpoint. Long labels truncate with `...`.
- **Concordance suppresses "Description" and "Notes" labels** on edges. Those wiki-link sources don't carry useful relationship semantics, just noise.
- **Concordance focus depth** changed from a 3-button segmented control (1, 2, 3) to a number input clamped 1–15.
- **Concordance nodes pin in place** after initial settle. Dragging one node moves only that node — no graph-wide jello from re-energized force simulation.
- **Linea ancestor depth fix.** Setting "Generations up" above the default now actually affects the rendered tree (was previously hardcoded internally to 8 regardless).
- **Linea spouse labels dropped.** The horizontal warm-gold line between spouses wasn't wide enough to fit a meaningful label; the line itself communicates active/former/estranged via styling. Status and label info still live in the entry view.
- **Linea node names auto-truncate** by measured pixel width with hover-tooltip for the full untruncated name (long names no longer overflow the node box).
- **Entry-view back button** uses browser-history semantics. Walking through wiki-link or spouse-chip chains takes you back through each prior entry one click at a time.

### Bug Fixes

- **Fixed: Linea parent-child connection lines** were invisible (referenced a CSS variable that was never defined). The arrow markers were faintly drawing while the lines themselves were missing.
- **Fixed: Chronometric horizontal scrollbar** at the bottom of the timeline (vestigial, no functional purpose).
- **Fixed: Chronometric events overflowing the chart area** when panning left far enough to push events into the lane-label gutter. Events now clip cleanly at the chart boundary.

---

## v1.1 — April 2026

### New Features

- **Stemma view.** Radial mind-map for tree-shaped content that doesn't fit a single entry. 16 fixed slots arranged clockwise from 12 o'clock around a focal node. Drillable focal-and-children, freeform or entry-linked nodes, smart input on the `+` slots, inspector panel with picker, JSON import/export with Skip/Replace/Rename collision modal, Ctrl+scroll zoom.
- **Per-Stemma JSON export.** Stemmas can be saved as portable single-file documents.

### Improvements

- **Cartulary is now fully offline.** All dependencies (React, Babel, marked, d3, JSZip, fonts) inlined into the HTML file. Zero network requests after load. Two builds ship: precompiled production build (~1.4 MB) and JSX-preserved readable build (~4.4 MB).
- **Favicon shipped.** Cartulary's gold-on-warm-dark book icon, inline data URI in the working copy.

### Bug Fixes

- **Fixed: Stemma has-children indicator** at slot 8 was occluded by the slot's own rendering.
- **Fixed: Stemma JSON import** lacked a lock-mode guard.

---

## v1.0 — March 2026

Initial public release. 22 built-in templates, custom template builder, custom calendars, wiki-link autocomplete, tag pool, Linea (family tree), Concordance (cross-reference graph), Timeline (Vertical and Chronometric), interactive Maps with pin time-filtering, Name History (former names with date ranges), JSON / ZIP / Markdown exports, focus mode, lock mode, multiple themes including high-contrast.
