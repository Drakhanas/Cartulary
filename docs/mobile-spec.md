# Cartulary, Mobile Spec (v1.8)

> **The build sheet, settled 2026-11-03 (session 23).** Planned before v1.8 opened, from the roadmap's mobile row, one call per message, six calls, after a test of v1.7's final on Drak's Android phone in Brave and Chrome (section 2). Every decision below is Drak's unless it says otherwise; the dated calls are in section 1. Claude's defaults are marked as his.

---

## 0. One-sentence statement

Mobile support makes every view and every edit work on a phone and a tablet with one set of controls for every device: a sidebar that hides and slides over the page on small screens, Back in the browser's history, drags that take a finger, a visible control for every action that lives on a hover or a mouse button today, and, for iPhone and iPad, the same file served from cartulary.world.

## 1. Decisions (Drak, 2026-11-03)

- **Devices, call 1, option b** (14:54: "b"). Android from the downloaded file, and the same file hosted at cartulary.world for iPhone and iPad, added to the home screen (section 7). The other ways were Android only, and Android in v1.8 with the hosted copy to the backlog. Claude's default was b if Drak or someone near him can run the pass on an iPhone or iPad, c if not.
- **What a phone gets, call 2, option a** (18:36: "a / im choosing this to make less work - choosing b means we have to keep tracks for desktop, phone, and tablet."). Everything a tablet gets: every view and every edit. The other ways were b, Claude's default, tablets everything and phones the lists and forms with the canvases viewed, panned, and zoomed; and c, phones read and look up only.
- **Navigation, call 3, option a** (19:17: "a / the sidebar is not resizable in mobile currently."). One sidebar that hides at every width and slides over the page on small screens, and the app's pages in the browser's history (sections 3 and 4). The other ways were the same sidebar without the history, and a bar along the bottom on phones.
- **Touch, call 4, option a** (19:23: "a, as long as it doesnt interfere with current controls"). One set of controls for every device (sections 5 and 6). Claude reads the condition as: nothing that works today moves or stops working; every new control is an addition and every mouse shortcut stays. The other ways were touch gestures standing in (long-press, double-tap), and a with long-press for the view names' descriptions only.
- **Where the narrow layout starts, call 5, option a** (19:46: "a"). By the window's width and height, and by the page's width (section 3). The other ways were width only at 768 px, and the sliding sidebar under 1200 px.
- **The hosted copy, call 6, option a** (19:54: "a"). The site carries the service worker; the app file stays the download, byte for byte (section 7). The other ways were a third built file that registers the worker itself, and no worker.
- **The cut plan** (section 9), set out after call 6; Drak's next message, 2026-11-06 07:41, was "Ok, what's next on the planning blocks", taken as its approval.

## 2. What the check found

### The tree (r059, `3e3cfc1`)

- One media query in the whole app: the Home help's contents list collapsing at 760 px (`shell.html`).
- The sidebar is a fixed column, 236 px by default, resized from 200 to 500 by a mouse drag on its edge (`onMouseDown`; `12_trunk`), with the world's name, Home and Project pinned, the views, All entries, Templates, Lists, and Tags in one scrolling column, and four buttons at its foot. Nothing hides it.
- Browser history: only the Home help's topics push entries (`#section=`, `27_trunk`). Everything else is in-app state, so Android's back gesture leaves Cartulary, and an iPhone home-screen app has no browser back at all.
- Touch: the map editor and Rota's and Tabula's drags run on pointer events (`18_cartographia`, `21_stemma`); Concordance and Linea use d3's drag and zoom. Chronometric's drag edit, Ephemeris's views, and Fabula's timeline listen for the mouse only (`19_chronometric`, `24_ephemeris`, `28_fabula/10_timeline`). Reordering by drag (the sidebar's views, Fabula's index, outline, and plot) uses the browser's drag and drop, which the help calls mouse-only.
- Some controls show only on hover: the sidebar's drag handles, Tabula's grips.

### Drak's phone (Android; Brave and Chrome; 2026-11-03, 14:23)

His words: "2) opens, sidebar is too large, locked, only templates scroll, giving just a sliver of view if landscape, can't be collapsed / 3) entry persists, entry navigation is a brutal workflow / 4) browser storage is not supported due to being on brave, im not willing to enable the flag on my phone for that, but it gives the option as it should in chrome". Step 4 read Settings' Images folder row; Chrome for Android has had the folder API since version 132 (January 2025). His screenshots (19:21) showed:

- Portrait: the sidebar takes about 60% of the width, leaving the page a column a word or two wide.
- The new-entry form in portrait: half-width fields still pair in that column and run off its right edge, the header's buttons after Cancel with them.
- Landscape: the sidebar's head and its four foot buttons take the height, leaving its list a scroll window about two rows tall; the backup banner takes a third of the page.
- Landscape with the keyboard up: only the name field shows.
- Stemma's drag handle stays showing after a tap: hover sticks on touch.

### iPhone and iPad

Apple's built-in preview shows an HTML file without running its scripts, and Safari doesn't open files from the Files app, so the downloaded file can't run there. This workspace has Chromium and no WebKit, so every iPhone and iPad check is Drak's or someone's with the device.

## 3. The frame (cut 2)

- A button in the page header hides and shows the sidebar at every width.
- The sidebar starts hidden and slides over the page when the window is under 900 px wide or under 500 px tall; picking anything in it closes it. Its contents don't change.
- In the sliding sidebar the head, the list, and the foot scroll as one.
- Fields go full width, with no half-width pairs, when the page beside the sidebar is under 600 px.
- The entry page's header buttons wrap instead of running off.
- The backup and save-failure banners go compact on short screens.
- The field being typed in scrolls into view above the keyboard. Landscape typing on a phone still leaves room for the field and little else, which no layout fixes.
- Stepping between entries without the list stays out; nothing in the test asked for it.

## 4. Back in history (cut 3)

The app's pages go into the browser's history, so Android's back gesture and a desktop browser's Back step back as ← Back does. On desktop, the browser's Back moves through Cartulary's pages instead of leaving it. The unsaved-draft warnings answer a back gesture as they answer ← Back.

## 5. Drags (cuts 4 and 5)

- Reordering by drag (the sidebar's views; Fabula's index, outline, and plot) moves off the browser's drag and drop onto pointer events, which take a mouse, a pen, and a finger alike. The faded copy the browser draws under the cursor gives way to one the app draws; the drop lands the same.
- Handles and grips are always shown on touch screens.
- The sidebar's width takes a finger.
- Chronometric's drag edit, Ephemeris's views, Fabula's timeline, and Rota's mouse-only parts move to pointer events.
- Pinch zooms wherever Ctrl+wheel zooms and pinch doesn't yet.

## 6. Visible controls (cut 6) and each view at phone width (cut 7)

- Cut 6 inventories every action that lives only on a hover, a double-click, or a right-click, then gives each a button or a menu item, on desktop too. The mouse shortcuts stay.
- The hover descriptions for the view names (the roadmap's row) need a visible form on touch, decided at that row's cut.
- Cut 7 fits each view's toolbars, panels, and grids into a phone's width; how many cuts it takes comes from cut 6's inventory.

## 7. The hosted copy (cut 8)

- The app at an address such as `cartulary.world/app/`, the same file as the download, byte for byte.
- A short page on the site for iPhone and iPad registers a service worker that caches the app and says to open it and add it to the home screen; from then on it opens offline. Someone who goes straight to the app's address without that page gets a copy that opens online only.
- Each release bumps the worker's version so phones take the new file.
- Every world opened from cartulary.world shares one storage area for the site, as several worlds in one browser do today.
- To confirm on a real device when the cut is built: whether a home-screen app keeps its worker across a restart.
- A site edit, no r-number, shipped with the finals.

## 8. Help and site (cut 9)

After the walkthrough's plan, since that plan decides whether the reference stays in the help. What changes: the help's Mobile paragraph and its "drag reorder is mouse-only" line, Settings' "use Chrome or Edge" line for folders now that Chrome for Android counts, the itch page, and the site's iPhone and iPad page.

## 9. Cut plan

| # | Cut | What it does |
|---|---|---|
| 1 | r001, carry-in | The export's version literals and the stale Kalendarium comment |
| 2 | The frame | Section 3 |
| 3 | Back in history | Section 4 |
| 4 | Drags on pointer events | Reordering, handles, the sidebar's width (section 5) |
| 5 | Canvas drags and pinch | Section 5 |
| 6 | Visible controls | The inventory, then the controls (section 6) |
| 7 | Each view at phone width | Per view; its count comes from cut 6 |
| 8 | The hosted copy | Section 7 |
| 9 | Mobile's help cut | Section 8 |

The probe suite lands before cut 2. Cuts 2 to 6 get Drak's desktop pass as well, for call 4's condition.

## 10. Won't-have in v1.8

- A separate phone layout with its own features, or features held back by device (call 2).
- A bottom bar on phones (call 3).
- Long-press and double-tap standing in for mouse actions (call 4).
- A service worker or any request in the app file (call 6).
- Previous and next between entries (section 3).
