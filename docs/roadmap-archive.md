# Cartulary roadmap -- shipped-release retrospectives (FROZEN ARCHIVE)

> Verbatim "Done -- vX.Y release" sections carved out of `roadmap.md` so the active roadmap stays forward-looking. Nothing reworded; read for shipped-release history.

---

## Done — v1.4 release

### Calendar grid view + seasons + moons (post-modularization-descope pull-forward)

Three features pulled forward from post-1.7 backlog after modularization was re-slotted to v1.7. All three consume the existing Kalendarium absoluteDay primitives without expanding the schema axis further than necessary. Shipped this session in six staged passes (infra rebuild → schema → editor UI → grid skeleton → season bands → moon glyphs), each with parse-gate verification.

**Calendar schema extensions (per-calendar, not world-scoped):**
- `calendar.week = { daysPerWeek, dayNames }` — daysPerWeek positive integer (default 7); dayNames either empty (no header row in grid) or exactly daysPerWeek long. All-blank arrays collapse to empty on save.
- `calendar.celestials = [{ id, name, cycleDays, offsetDays, color, icon }]` — moons / celestial bodies with regular cycles. Cap at 5 per calendar. Phase math is modulo on absoluteDay; per-moon `color` drives tooltip badge, `icon` is editor-and-tooltip metadata.
- `calendar.seasons = [{ id, name, startDay, endDay, color }]` — 1-indexed dayOfYear bands. `endDay < startDay` = wraparound through year-end. Overlaps allowed (first-defined wins); gaps allowed.

**`ensureCalendarShape` helper** as the canonical seam — `migrate()`, `normalizeImportedCalendar`, and `createCalendar` all route through it. Pure-additive, idempotent, defensive against malformed input. Adding a new calendar-scoped field means editing one place.

**Calendar editor UI:**
- New Week section between Eras and Celestials in the existing CalendarEditor — daysPerWeek input + dynamic Day-N name inputs that resize with the cycle length.
- New Celestials section with up to 5 rows; each row has name, cycle, offset, color picker, icon. Add button hides at 5.
- New Seasons section unbounded; each row has name, startDay, endDay (both clamped to year length), color. Wraparound notice renders inline when endDay < startDay. New seasons default to quarter-spaced spans.

**Calendar grid view (`CalendarGridView` component):**
- "Show grid" / "Hide grid" toggle button on each calendar row in Kalendarium index, between Edit and Export. One expanded at a time.
- Inline expansion below the row.
- Year stepper: `−` / `+` arrows, Jump-to-N input, `↺ Current` button (only when currentMoment is set).
- Initial year = currentMoment year projected into this calendar's frame, else year 1.
- Year persists per-calendar in `state.viewPrefs.kalendariumGridYear[rowKey]`.
- Each month renders as its own sub-grid with continuous-week layout — leading-blank cells before Day 1's weekday column maintain alignment across month boundaries.
- Three-column layout at standard widths via `minmax(max(320px, dpw*42), 1fr)`; collapses to 2 then 1 on narrower viewports.
- `dayNames` header row renders only when all are non-empty.
- Cell click → popover anchored below grid listing entries with any date matching that absoluteDay. Cross-calendar matching is automatic via the `collectEntryDatesAsAbsoluteDays` helper, which walks every date-bearing surface (calendar-date, range start/end, name-history from/to, spouse marriedOn/endedOn, group subfields).
- Click entry in popover → navigates to entry view, grid auto-collapses.
- Outside-click and Escape dismiss; clicks on other cells re-target without flicker.

**Season rendering:**
- `getSeasonForDayOfYear(doy, seasons)` handles both normal and wraparound bands in one helper.
- `hexToRgba(hex, alpha)` for cell tinting at ~0.3 alpha; defensive against malformed hex (returns "transparent").
- Has-entries indicator changed from background-swap to 2px accent border so it composes with season tint instead of fighting it.
- Season legend strip at top of grid panel — color swatches + names, with wraparound notice in swatch tooltip.

**Moon phase rendering:**
- `computeMoonPhase(absDay, cycleDays, offsetDays)` returns a 0-4 phase index. Defensive double-modulo for negative absoluteDay; float-drift defense on the bucket-8-rollover edge.
- `MOON_GLYPHS = ["🌑", "🌒", "🌓", "🌔", "🌕"]` and `MOON_PHASE_NAMES = ["New", "Crescent", "Half", "Gibbous", "Full"]` at module scope.
- `BUCKET_TO_PHASE = [0, 1, 2, 3, 4, 3, 2, 1]` — eight cycle buckets folded symmetrically onto five phase glyphs. Waxing crescent and waning crescent collapse to 🌒; same for half (🌓) and gibbous (🌔).
- Day cell layout: flex column with day number top, moon-emoji row bottom when celestials exist. Five moons fit per cell via flex-wrap.
- Multi-line cell tooltip composes from base info + optional season + per-moon "Name: Phase" lines.

**Locked decisions** (see doctrine for full text): calendar extensions on the calendar object (not world scope); `ensureCalendarShape` as the canonical seam; continuous-week math; five-phase glyph taxonomy with symmetric collapse; 1-indexed dayOfYear with explicit wraparound; cell visual state layering (background / border / fill); multi-line tooltip composition; OS-color emoji over custom SVG for phase glyphs; inline expansion in Kalendarium index (not separate top-level view).

**QA artifact:** `cartulary-v1.4-calendar-grid-qa.xlsx` — 98 test cases across 6 tabs (Schema-Migration, Editor-UI, Grid-View, Seasons, Moons, JSON-IO), severity-coded P0/P1/P2 with conditional formatting on Status. Run pending.

### HTML export pipeline

Single-file self-contained HTML export per world. Read-only artifact for sharing with non-Cartulary users. Shipped this session in four staged passes (scaffold → core builder → maps + async images → polish).

What's in the export:
- Single `.html` file, fully offline, inlined CSS, base64 images, pre-rendered markdown
- Theme inheritance — CSS variables extracted via `getComputedStyle` at build time; exported file inherits the user's currently-active theme
- ToC grouped by template, alphabetical within group, two-column on wide viewports, 25%-centered HR between template groups
- Articles with title + template badge + obituary line (for deceased person-like entries) + tags + map block (for map entries) + inline fields (`<dl>`) + block sections (`<section>` per textarea/group/name-history)
- Cross-references: wiki-links and entry-refs resolve to `<a href="#entry-{id}">` anchor links; broken targets render as styled spans with tooltip
- Section breaks: `※※※※※` between entries within same template, `⁂⁂⁂⁂⁂` between template sections (flex `space-between` full-width distribution)
- Map rendering: image + numbered pin overlay + hover labels + numbered legend below; currentMoment-aware filtering when set, all-pins-rendered fallback when null (with pre-export warning)
- Async FSAA image embedding via image manifest pre-resolution pattern
- Skip-to-content link, back-to-top affordance, `@page` print margins, `<meta name="description">`, world last-edited date alongside export date
- Export button on the Project page (not Home — Drak's call)

Locked design decisions (see doctrine for full text):
- Anchor IDs use `entry.id` (internal-ID stability)
- Image manifest pattern (async pre-resolution before render)
- Section break design (5-glyph flex space-between at full content width)
- HTML export trust model (URL protocol sanitization for export, not in-app)
- Auto-age obituary respects field-level secret status (both surfaces)
- Map rendering hybrid (numbered pins + hover labels + legend)

### Auto-age obituary line

Header band below the entry-badge for deceased person-like entries. Shared `computeLifespanAge` primitive (returns `{age, isDeceased, approximate, suffix}`) feeds two display surfaces: inline Lifespan field suffix + obituary line. Living characters get only the inline surface. CoD enrichment explicitly declined (header bands render derived primitives, not user-authored prose).

### Bug audit fixes (final session pass)

- **openNewEntry regression fix** (latent since Cartographia ship). Refactor took an optional `templateOverride` parameter; existing `+ New Entry` onClick still passed function reference directly, so React's SyntheticEvent became the override. Every "+ New Entry" button silently broke. Two-part fix: wrap call site + shape-check guard in handler. Doctrine code-watch entry added.
- **URL field XSS in HTML export.** `case "url"` was emitting user-supplied URL into href without protocol sanitization. `javascript:`, `vbscript:`, `data:`, `file:` URLs would execute on click. Fixed: protocol-allowlist with dangerous URLs rendering as struck-through `.field-link-blocked` plain text.
- **Obituary line leaks secret data.** When the lifespan field was marked secret and secrets were excluded, the obituary line still rendered "Died at age N" — leaking the data the secret flag was supposed to hide. Fixed in both HTML export and in-app EntryView.
- **Pin coordinate NaN defense in renderMapHtml.** Malformed `pin.x`/`pin.y` would emit `"NaN%"` in style attributes; defaults to center (0.5) when not finite.

### Cartographia + view order (earlier this session)

Cartographia top-level view promoted from Templates sidebar; Map filtered out. Canonical view order updated. Migration uplifts prior canonical defaults so existing default users get the reorder.

### Kalendarium (prior session, included for v1.4 completeness)

Multi-calendar schema, per-entry binding, per-view selectors, Chronometric drag-edit reverse projection, era band rebinding, calendar JSON I/O, pre-deletion conversion modal. 90 active QA TCs passed at GOLD. Two-invariants doctrine pinned (absoluteDay for cross-calendar, calendar-position for same-calendar structural edits).

### Other Kalendarium-cluster items

Image field drag/paste/picker with FSAA-or-base64 branching. Vertical Timeline three-level zoom (year/month/day, Ctrl+scroll, persists in viewPrefs). Chronometric zoom 50x→1000x with calendar-aware sub-year tick generation. `makeInitialState()` wrapped in `migrate()` so fresh worlds carry all tracker markers from creation.

### Version history / undo recovery

Snapshot-based undo for catastrophic state changes (Reset, Import, Restore). Auto-snapshots fire on content change throttled to one per five minutes, capped at 10 FIFO; period-interval check runs every 30 seconds and keys on `world.updatedAt` so idle time doesn't accumulate snapshots. Manual snapshots are user-created and pinned by default (never auto-evicted from the 10-slot pool). Pre-op safety snapshots fire on every world-replacement operation — World Reset, World Import, and Snapshot Restore each pin a snapshot of the current world before swapping state, labeled "Before reset" / "Before import" / "Before restore from \<ts\>". Reset and Import wipe prior history first since the new world's history would be irrelevant; Restore preserves history so the rollback is itself reversible. Pre-restore pinned snapshots cap at `SNAPSHOT_PRE_RESTORE_CAP = 3` via `kind: "pre-restore"` tagging and `snapshotEvictPreRestore()` — pre-reset and pre-import don't accumulate because their wipe-first semantics mean only one of each ever exists. Snapshot keys use `snap-{timestamp}-{rand4}` format. `DestructiveOpModal` replaces native `confirm()` for Reset and Import (catastrophic operations get the heavyweight modal; medium-stakes operations keep native confirm per codebase convention). Pre-op safety snapshot failure surfaces a confirm before proceeding ("Snapshot couldn't be created — proceed without undo path?"). Restore UI lives on the Project page with chronological listing, pin/unpin per snapshot, kind badge, restore-from-this button.

### Visual design pass

Eleven surfaces audited and brought to a unified visual register. Inline CSS only, single HTML file (no external stylesheets). Cormorant Garamond + DM Sans typography locked; scriptorium register; never modern SaaS aesthetic. 15 design tokens in `:root`:

- Radius scale: `--r-sm`, `--r-md`, `--r-lg`, `--r-pill`
- Spacing scale: `--s-1` through `--s-5`
- Shadow scale: `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-xl`
- Timing: `--t-fast`, `--t-base`

High-contrast theme inherits HC-flat doctrine: all four shadow tokens nullified for accessibility (depth-via-luminance fails for HC). Pin shadow on map pins is the documented exception — content-level elevation, not chrome, so it survives HC. Input chrome unified: idle `var(--border)`, focus `var(--accent)`; luminance shift 40% → 70% survives colorblindness (state cue combines luminance with hue, not hue-only). Illumination whitelist established for ornament-level accents: slot #2 modal headers (gold-leaf header band, activated), slot #3 sidebar scrolls divider (activated, uses royalty-free Noun Project scrolls icon 8015583 in the `.nav-section-sep`), slot #1 world name (deferred). `--bg-panel` token added during the pass for consistent inner-panel surface; resolved several spot-rendered hardcoded panel backgrounds.

Behavioral additions folded into the pass:

- **Ctrl+scroll zoom on Kalendarium grid.** Three discrete zoom levels (compact / standard / expanded), persists in viewPrefs, native wheel handler with `passive: false` so browser page-zoom doesn't fire.
- **Ctrl+scroll zoom on Cartographia map.** Continuous fractional zoom with native wheel handler; pairs with the existing pan affordance.

Closing-out item: **CalendarGridView restructure** — outer card stripped; controls container (year stepper + season legend) sits at top with `marginTop: -4` overlap merge; months grid free-floating below; day-cell substrate uses `var(--surf)` for quiet tonal step over `var(--surf2)` month card. Cell popover stays sibling to the grid (anchored below).

### v1.4 final bug audit (six fixes)

Comprehensive pass through the working copy at the close of v1.4 work. Eight findings, six fixed:

01. **Map zoom wheel listener never attached when image loaded after mount.** Both `MapView` and `MapEditor` had `useEffect(() => { ... }, [])` for the wheel listener; their `if (!imageUrl) return <map-empty>` early return meant a fresh map (no image yet) never bound the wheel listener even after the image loaded. Fixed by changing deps to `[imageUrl]` in both components; `MapEditor` required reordering so `imageUrl` was declared before the effect. New doctrine code-watch entry pins the invariant.
02. **`collectCalendarDateUsages` undercounted vs `reframeDateAcrossStructure`.** Walker missed name-history entries, spouse marriedOn/endedOn, and world-level currentMoment — meaning the pre-deletion warning told users fewer surfaces would be affected than actually were. Walker extended to match the reframe surface set; `currentMoment` threaded through `App → KalendariumEditorView → CalendarEditor` (only passed when editing primary, since currentMoment is primary-bound by doctrine). New doctrine entry "Date-surface walkers must stay in lockstep" + matching code-watch pattern.
03. **Pre-restore safety snapshot failure was silent.** `snapshotCreate` could return null (storage full, structured-clone failure) and restore would proceed without an undo path. Now checks the return value and prompts user via native confirm with a cancel option.
04. **`viewPrefs` keys scrubbed silently on calendar delete.** Cartographia, Timeline, Vertical Timeline, Chronometric, and Linea all carry per-calendar viewPref entries; calendar deletion cleared them silently. Now collects affected view names and surfaces them via flash so the user knows what was reset.
05. **Pre-restore pinned snapshots accumulated forever.** Repeated restores would pin a new "Before restore from \<ts\>" each time without an evict path. Added `SNAPSHOT_PRE_RESTORE_CAP = 3` + `snapshotEvictPreRestore()`. `snapshotCreate` now takes a `kind` param; pre-restore snapshots tagged `kind: "pre-restore"` for evict targeting. Pre-reset and pre-import don't need a cap because they wipe history first.
06. **CalendarGridView day-name row and day-grid lacked shared substrate.** Cosmetic: the weekday header row was rendering against the page background while the day grid had its own surface, creating a visual seam. Merged into a single `var(--surf)` wrapper.

Two findings audited and not fixed with documented reasoning:

- **IndexedDB quota exceeded silent fail** — punted. Quota near-impossible to hit on realistic Cartulary worlds; surface cost not justified.
- **Native `confirm()` on calendar delete** — on reflection consistent with codebase pattern. DestructiveOpModal is reserved for world-replacement operations (Reset, Import); calendar delete is medium-stakes and matches the native-confirm convention used elsewhere.

A third item flagged during the audit — **HC theme stronger seasonal tints** — was determined to be feature-aligned with HC purpose rather than a bug.

### Moon phase math switched to centered-bucket convention

`computeMoonPhase` updated from `floor(fraction * 8)` to `floor((fraction + 1/16) * 8) % 8` so phase events sit at bucket **centers** rather than starts. Pre-fix, displayed phases were ~half a bucket late (~1.3 days late on a 21-day cycle, ~1.8 days on a 29.5-day cycle). For a 21-day cycle starting at offsetDays=1, the first Full now lands on Day 11 (was Day 12). One-line code change plus inline comment block documenting rationale for future Ephemeris work where computed phase event times must align with bucket centers. Math verified: bucket-perfect for the 21-day reference case. Pre-stable feature surface; no migration concern.

### Tenths-precision cycleDays for celestial bodies

`cycleDays` for moons now accepts tenths (29.5-day synodic month, 27.3-day sidereal, etc.). UI: `step="0.1"` + `parseFloat` + clamp `>= 1` + `Math.round(x * 10) / 10` enforce the invariant on writes. Migration: `Math.floor` replaced with the same tenths rounding (preserves integers as identity, normalizes out-of-spec precision like 29.5499 → 29.5). `offsetDays` stays integer because it's a snap-to-day anchor. `computeMoonPhase` math needed no changes — modulo and division were already float-safe.

### Home Usage/Workflow documentation refresh

Five topic updates to the in-app Home documentation reflecting the v1.4 feature surface:

- `save-share` — added paragraph on Shareable HTML export, accessed from the Project page.
- `backup-strategy` — added Version History paragraph: five-minute throttle, ten-slot FIFO for auto-snapshots, manually-pinned snapshots that don't auto-evict, doesn't substitute for `.json` export to disk.
- `calendars` → renamed to `kalendarium` and rewritten end-to-end: multi-calendar via anchor.absoluteDay, per-entry binding, grid zoom, celestials with tenths-precision cycle and centered phase math, Current Moment, per-entry calendar binding workflow.
- `maps` + `map-usage` → merged into single `cartographia` topic: covers the view-level promotion, ctrl+scroll zoom, time-aware pin filtering.
- `templates` + `template-usage` → merged: expanded Template Builder coverage for the v1.3 surface (show-when, half-width pairs, other-text reveal, cascade chains, entry-ref scope/filters).

---

## Done — v1.3 release

### Template engine

- **Cascade-select** with `optionsByParent` matrix — Type→Subtype hierarchies where Subtype options filter based on Type value
- **showWhen** — fields render conditionally based on another field's current value
- **Multi-template entry-ref** — `refTemplatesId` array allows references to any of several template types
- **refFilters** — per-template field+value filter on entry-ref pickers
- **otherTextField** — auto-injects "Other" into select options and reveals a customText input when selected
- Subfield parity in `SubfieldList`; candidates scoped to siblings only
- `isFieldVisible` wired into `FieldEditor`, `FieldValueDisplay`, `renderFieldForMd` including group-subfield surfaces

### Built-in template uplift pass — 21/22 templates

Every built-in template went through structural review and got the v1.3 schema treatment (Other Names or Former Names opener as appropriate, Type/Status fields with curated alphabetized options + Other + otherTextField, multi-template scope expansions on entry-refs, canonical field-order arc, halfWidth tagging in-line).

The 21 uplifted: Character, Location, Astronomical Body, Artifact / Object / Currency, Cosmology / Plane, Creature, Culture / People, Deity / Entity, Book / Document / Text / Tome (renamed from Document / Text), Faction / Government / Organization (renamed from Faction), Festival / Holiday, Historical Event, Language / Glossary, Magic / Tech System, Plot Thread, Race / Species / Ancestry, Religion / Belief System, Substance / Material, Theme / Motif, Vehicle, Weapon / Armor.

Excluded: Map (system template, `kind: "map"`).

Cross-template **sci-fi vocabulary audit** also done: expanded 5 Type lists (Creature, Artifact, Book-Doc, Cosmology, Deity) and 5 Location Subtype branches (Environmental, Settlement, Fortification, Domain, Structure) with sci-fi/modern vocabulary.

### Half-width auto-pair (universal rule + visibility-aware re-pairing)

Adjacent half-eligible fields (text, number, date, calendar-date, color, url, tags, select, single entry-ref) auto-pair into side-by-side rows in entry forms. Multi entry-refs, textareas, name-history, repeating-group, calendar-date-range, and image are not half-eligible — always full-width. Lone half-eligible fields auto-expand to full. Universal across built-in and user templates; no flag required. Legacy `halfWidth: true` markers on built-in fields are now inert metadata.

Pairing is visibility-aware (post-build hotfix landed before itch.io upload). Hidden fields — showWhen unmet, secret-gated when secrets hidden, empty-suppressed in display mode — are filtered before pairing runs. A visible field whose declared pair partner is hidden re-pairs with the next visible half-eligible field, or auto-expands to full if no remaining half-eligible neighbor exists. No blank placeholder slots; layout reflows as values change. The old "stable layout doesn't reflow" stance produced asymmetric blank slots in display mode (Character entries with empty Aliases left Title alone on the left of every entry) and edit mode (Status's showWhen-controlled Cause of Death partner left Status alone whenever Status ≠ Deceased). The trade against the prior stance is intentional.

### Origin protection

Distinguishes built-in templates from user-created templates so migrations don't damage user templates that share built-in names.

- `TEMPLATE_ORIGIN = { BUILTIN, USER }` constant; orthogonal to existing `kind` field
- Every built-in template carries `origin: "builtin"` via `makeTemplateFromBuiltin`
- `saveTemplate` new-template branch sets `origin: "user"`; `insertImportedTemplate` always sets `origin: "user"`
- Migration backfill at top of `migrate()` classifies pre-existing templates by name match against `BUILTIN_TEMPLATES` ∪ `TEMPLATE_RENAMES.from`
- All 13 migration name-matchers in `migrate()` filter `&& t.origin === TEMPLATE_ORIGIN.BUILTIN`
- Dedup pass keyed on `(name, origin)` — user-origin and built-in-origin same-name templates coexist
- Reset to Default button gated on origin; `analyzeReset` / `resetTemplate` bail on user-origin (defense in depth)
- `deletedBuiltinNames` filters by origin; `restoreBuiltinTemplates` only blocked by built-in-origin same-name templates

### Template Preview popup

Live render of in-progress template as an entry form in a separate browser window. 👁 button at the top-left of the builder. Cross-window React root via `ReactDOM.createRoot` into the popup document's `#preview-root` mount point. Parent owns draft template state; popup owns ephemeral entry state (popup-local, nothing saved to world). Auto-closes on builder exit, page reload, parent tab close (session-token watchdog poll). Tests cascade-select chains, showWhen conditionals, otherTextField reveals, half-width auto-pair behavior live as the user edits the template. Firefox compatibility fix: explicit `doc.open() / write() / close()` defeats async about:blank loader. Tested in Chrome / Edge / Firefox / Brave; Safari untested.

### Concordance persistence (Level 1 + Level 2)

- **Level 1 — within-session stability.** Filter toggles and focus mode no longer re-cook the layout. Visible nodes hold positions; hidden ones simply don't render.
- **Level 2 — world JSON persistence.** New state surface `state.concordance = { positions: { [entryId]: {x, y} } }` saved with the world. Drag-end writes positions to state. Force layout runs only for entries without saved positions. Defensive validation on load strips positions for non-existent entry IDs.
- Zoom transform persists across simulation rebuilds within session.
- Focus combobox autocomplete filtered by visible templates.
- New entries auto-place around the pinned majority via single-pass force layout; their settled positions get saved too.

### genId hardening

`genId().slice(0, 4)` → `genId().slice(-4)` at all 10 call sites. Effective ID space per slug grows from ~1 (timestamp prefix dominates) to ~1.7M (4 of 6 random base36 chars). Eliminates duplicate-ID failures for entries created in rapid succession with matching slugs. Old IDs in saved worlds remain valid (opaque strings).

### Migration framework additions

Several patterns established during the uplift work:
- `FIELD_TYPE_CONVERSIONS` preferred over DEPRECATED+Notes-prepend for category-like text→select (preserves data as customText under Other)
- DEPRECATED+Notes-prepend as fallback for non-categorical text or true field removal
- DEPRECATED for unshipped-but-leaked QA cleanup (Plot Thread Other Names precedent)
- Per-rev re-versioning for in-place migration corrections (Settlement subtype alphabetization precedent)
- `runFieldAddPass()` called twice in `migrate()` enabling same-label text→typed replacement in one pass
- `OPTIONS_UPDATES` extended with optional `parentValue` parameter for cascade-select option lists
- `FIELD_VALUE_REMAPS` framework for value-moved-between-fields scenarios
- `SHOWWHEN_UPDATES` re-asserts showWhen on built-in fields where fieldId stale or missing
- Non-destructive migration doctrine: nothing destroyed, removed field content goes to Notes with labeled prefix

### Doctrine refinements

Captured in `cartulary-doctrine.md`. New Standing principles tagged `(v1.3.)`:
- Other Names is not universal — applies only to entries with plausible in-world aliases
- Status fields get Other + otherTextField universally
- v1.3 field-order arc — identity → anchors → quantitative → identity refs → cultural axes → temporal narrative → Notes
- Type + Scope split when axes are orthogonal
- POV Character single-template entry-ref pattern
- Half-width auto-pair (universal, type-based eligibility, adjacency-driven)
- Half-width pairing is visibility-aware (post-build hotfix; hidden / empty / secret-gated fields filtered before pairing)
- Concordance positions persist to world JSON
- Template origin doctrine
- Template-pass doctrine: new schema IS canonical, all migrations land in same pass
- Non-destructive migration doctrine: nothing destroyed silently

### v1.3 audit cleanup

Eleven fixes across two audit passes:

Pass 1 (pre-Template-Preview, 8 fixes):
1. Template import lock guards (`handleImportTemplateFile` + `insertImportedTemplate` race-condition protection)
2. Concordance lock guard on `saveConcordancePositions`
3. `modal-notice-warning` className typo fixed in template + stemma import collision modals
4. Location Type doctrine cleanup — added Other + otherTextField, Subtype `Other: ["Other"]` cascade branch
5. `--warn` CSS variable defined in both default and high-contrast themes
6. Stale comment cleanup
7. Stemma alert→flash (`StemmaInspector.handleDelete` — defense in depth)
8. RichTextEditor alert→flash with `console.error` fallback

Pass 2 (post-Template-Preview, 3 fixes):
9. try/catch wrapper around popup render useEffect (defensive error boundary for cross-window React rendering)
10. Optional chain in `TemplatePreviewBody` dep array
11. Indentation correction in `EntryForm` wrapped tags-bar block

### Home docs sync

Six sections updated to reflect v1.3 behavior: Concordance (major rewrite), Views & Pages (Concordance one-liner), Template Usage (preview popup paragraph), Field Types (half-width auto-pair note), Browser Compatibility (preview popup compat note), JSON Save File Schema (top-level shape includes `stemmas` and `concordance`).

---

## Done — v1.2 release

### Marriage feature with auto-reciprocity
- Spouse declarations carry `{id, label?, status?, marriedOn?, endedOn?}` shape
- Status (active / former / estranged) mirrors across reciprocity; per-side label does not
- Reconcile-on-every-save (idempotent, JSON-equality-skip prevents spurious `updatedAt` bumps)

### Linea overhaul
- Junction-style descent geometry (parent-pair branches from shared junction)
- Lifespan dates on every node (`1903–2003` / `1980–Living` / `1980–?` / `~1742–1751`)
- User-selectable depth limits (1–10 each direction, default 5/5)
- Hover-tooltip on truncated long names
- Spouse line dropped; pairing implied by shared-children descent
- Status bar: `N ancestors · N on focal row · N descendants`

### Concordance polish
- Edge labels rotate to follow lines, concatenate by direction
- Description / Notes labels suppressed
- Focus depth as number input (1–15)
- Nodes pin in place after initial settle

### Chronometric Marriages lane
- Dedicated synthetic lane below template lanes
- One bar per pair (deduped across reciprocal declarations)
- Read-only on timeline (edit dates from entry editor)
- Variable lane heights for overlapping events

---

## Done — v1.1 release

### Stemma feature (full build)
- Migration backfill (`state.stemmas = []`)
- Sidebar entry between Linea and Concordance with ❋ icon
- Radial canvas: 16 fixed slots clockwise from 12 o'clock, focal at center
- Smart input on + slots (entry suggestions + freeform fallback)
- Inspector with freeform/linked bodies + entry picker
- Drill-down with breadcrumb + back-to-root button
- JSON import/export with Skip/Replace/Rename collision modal
- 125-test QA pass cleared at sign-off

### Pre-1.1 bug audit (4 fixes)
- Has-children indicator at slot 8 occlusion fix
- `handleImportStemmaFile` isLocked guard added
- Stemma docs updated
- Accessibility doc updated

### Favicon design + wiring
- Iterative design through visualizer — landed on leafing-curves variant
- Inline data URI wired into the working copy `<head>`
- Standalone `cartulary-favicon.svg` produced for separate distribution

### Dual-build inlining pass
- `build_inline.py` refactored from single-output to dual-build
- `compile_jsx.js` Node helper added
- Both fully offline (zero network requests after load)
- License preamble (MIT + BSD-3 + OFL-1.1) bundled at top of each output

### Release-prep documentation
- `README.md`, `itch-page-full.md`, `devlog-1.1.md`

---


---

## Done — v1.5 release (SHIPPED 2026-06-26)

**v1.5 is shipped.** Released to itch.io 2026-06-26. Two major top-level views (Glossopoeia, the constructed-language workspace; Ephemeris, the celestial-mechanics workspace), the Packs framework with the Space Opera flagship pack, the native grid and longform-note field types, the node-source registry, the House/Dynasty/Clan/Bloodline built-in, the per-calendar date-format presets, and a full cartulary.world documentation/landing site shipped live alongside. Devlog: "Lingua per aspera ducit ad astra." Full r-by-r history (r001–r134) in the changelog and the prior handoffs.

**What changed vs the v1.5 plan above.** The plan as written carried two flagship packs (Space Opera + Game Mechanics) and treated cartulary.world as the last in-line item. As shipped: Game Mechanics was shelved to post-v1.5 (design-only, frozen at `game-mechanics-pack-reference.md`); Space Opera was the sole flagship pack. ConLang, originally a deferred pack, was promoted mid-cycle to the Glossopoeia core view and became the larger of the two headline features. The in-app-help sweep (r133) and a Concordance empty-default UX change (r134) landed into the open line after feature-complete, before the upload. cartulary.world shipped live before the product finals (it was the active workstream through session 6–7; the product finals shipped session 8).

**Theme note (continued).** v1.5 returns to the view-level pattern in force — two new top-level views (Glossopoeia, Ephemeris) — while also shipping the Packs framework (a reusable distribution surface) and the external-artifact work of the cartulary.world site. v1.6 ships the Cartographia+ map creator full feature. v1.7 ships code modularization standalone.

