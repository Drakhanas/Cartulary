# Cartulary roadmap -- shipped-release plans and retrospectives (FROZEN ARCHIVE)

> Verbatim "Done -- vX.Y release" sections carved out of `roadmap.md` so the active roadmap stays forward-looking. Nothing reworded; read for shipped-release history. Since 2026-10-23 it also holds the plans and session blocks of shipped versions, moved from `roadmap.md` verbatim when the version shipped (the v1.5 plan, and the v1.6 plan and record).

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

## Plan — v1.5 (moved verbatim from `roadmap.md` 2026-10-23)

> The v1.5 plan as it sat under "Active / Next Up" in `roadmap.md` from before the v1.5 ship until the v1.6 ship. Verbatim. The retrospective below calls it "the v1.5 plan above".

### v1.5 — Ephemeris view + Packs framework + Space Opera pack + ConLang core view

Solo project, no schedule pressure; release ships when the pieces are done.

Two major surfaces in one release. Sequencing rationale: v1.4 carried four headline pieces and is the heaviest release in the line; v1.5 as Packs-only would have been underweight by comparison; v1.6 with the Cartographia+ creator alone is already a 60-100 hour build. Adding Ephemeris to v1.5 balances the cadence without overloading any single release.

**Status:** Ephemeris **feature-complete and QA-clean** (working copy at iteration r032; full 59-test QA pass closed 2026-05-24). All four original workspaces built: Astronomical Body, Compute, Observe, Event-Festival-Holiday. **Fifth workspace Forced Alignment shipped 2026-05-31 (r045–r047, polished r048, extended with verify+revert r051).** Moon unification built + QA-closed clean (r033–r040). Explorer-polish pass shipped (r041–r044). **Habitable zone three-model + luminosity override (r049).** **Apsides terminology + chain-break warnings (r050).** **Structured Ephemeris bug audit with seven fixes (r052).** **QA fixes: Compute single-day scan (r053), Observe banner copy (r054).** Discord community server launched 2026-05-21. Build order within v1.5: Ephemeris → moon unification → explorer polish → Forced Alignment → HZ overrides → terminology + diagnostics → verify+revert → bug audit → r048–r052 QA pass → Packs framework. **r048–r052 QA pass run and closed 2026-05-31 (37 PASS / 0 FAIL on run rows; two fixes — r053 Compute single-day scan, r054 Observe banner copy).** Remaining (as of 2026-06-20): the rest of the Glossopoeia core view (Phonotactics onward; built through r094), then three unrun Bug Audit rows (BA-01 trail composition, BA-02 tooltip copy, BA-04 reload-canonical; BA-03 N/A), then cartulary.world. cartulary.world deferred to post-v1.5 — the site will carry full feature guides rather than the scoped quick-help shipped inside the app, which requires the final v1.5 feature surface to be locked first. **Packs framework BUILT (r055–r060, 2026-06-01)** — parse-gated, browser-unverified *at build time*; the Space Opera pack was the QA vehicle (now closed, see the current-status block later in this paragraph). **Native `grid` field type BUILT + browser-QA-clean (r062–r074, 2026-06-02)** — an engine field type added ahead of the Conlang pack because Paradigm needs a 2D inflection table; per-entry axes, per-cell types, refs-any-entry. Source audit on Packs + grid fixed two real bugs (r071 pack re-import false-conflict, r072 grid-cell refs in Concordance) plus a walker-lockstep drift the audit missed (r074); footer button order swapped (r073). Grid QA full pass. Build order amended: Ephemeris → … → Packs framework → **grid field type**. **Node-source registry BUILT (r075–r081, 2026-06-02)** — parse-gated + source-audited, browser-unverified *at build time* (browser pass closed r087, see current-status block below in this paragraph). A registry of first-class linkable node types presenting as synthetic templates, so non-entry state slices (Ephemeris bodies now, ConLang later) become graphable in Concordance and targetable by entry-ref fields. Astronomical Bodies are the first registrant. Built pre-ConLang because the promote-to-view pattern (own state slice) severs objects from the entry-graph; the registry is the seam they register through. **Pack roadmap (current, 2026-06-17):** **Space Opera is the SOLE flagship pack** for v1.5. **Game Mechanics (D&D 5.1/5.2.1 SRD) is SHELVED to post-v1.5** — design-only, no code shipped, frozen at `game-mechanics-pack-reference.md`. **ConLang is promoted from a deferred pack to the next active workstream**, built as a core view (own state slice, registers through the registry). **Current build order: Ephemeris → … → Packs framework → grid field type → node-source registry → Space Opera pack (DONE, browser-verified r087) → registry QA (DONE, browser-verified r087) → Glossopoeia core view (BUILD IN PROGRESS — ConLang/Lexicon/L-G supersede/Inventory built through r094) → Ephemeris BA rows → cartulary.world.** **Space Opera pack DONE + FULLY BROWSER-VERIFIED (designed/authored r082–r085 2026-06-05; final re-test r087 2026-06-17, 13/13 PASS):** 8 templates, hand-authored single-file JSON; the framework's first browser pass surfaced and fixed three import bugs (r082 resolve-on-import + double-namespace guard, r083 world-import envelope guard) and added editor ref-field hints (r084–r085); r087 re-test cleared every path including the cascade-child otherTextField and user-template ref hints. **Registry DONE + BROWSER-VERIFIED (built r075–r081; QA full pass r087 2026-06-17).** **Variant filter SHIPPED + BROWSER-VERIFIED (r087):** core primitive, ships dormant on unconfigured worlds (see the r087 block below). **Glossopoeia core view COMPLETE + BROWSER-VERIFIED (r095–r104, 2026-06-21):** all eleven workspaces, field tooltips, in-app docs, per-language import/export; Drak confirmed at the r106 gate and re-exercised the import path on a real file 2026-06-22. **Glossopoeia Phase 2 DEFINED + STARTED (r105–r109, 2026-06-21):** the all-in-one direction (build compute substrates in-tool) was chosen over the Lexurgy round-trip integration layer; r105 (registry comment + lock guard), r106 (Lexeme **Word Pieces** group — a sanctioned second built-in group, one-group doctrine waived), r107 (IPA palette on every IPA field), r108 (small-wins: Duplicate / ready-to-name / palette close / list filter / list subtitles), r109 (the **syllabifier** engine + readout — the keystone substrate; one morpheme-aware maximal-onset rule with coda retention at seams reproduces both Ethlinde and Ân-lâna). r106–r109 were **browser-verified 2026-06-22** (Drak loaded the full Ethlinde file through the r104 import, which drove Word Pieces / the IPA fields / the list affordances and put the syllabifier readout through dense real data — `ae.θi.ran` AUTO confirmed; gate closed). **Phase 2 sequencing (2026-06-22): harvest first** — the word generator + phonotactic validation pair, both riding the syllabifier r109 already bought, ahead of the IPA rule engine. **The phonotactic validator shipped across r110–r111 (2026-06-22):** r110 added the check (`glossPhonotacticCheck`) and a warning block in the Lexicon Syllables card — onset/coda vs Max Onset/Max Coda, missing-onset-if-required, prohibited constraints warn, permitted documentary, unreadable patterns "not auto-checked," warn-only. Loading it against the Ethlinde import showed every word "not auto-checked"; cause was a build-time miss in the import (the prohibited constraints stored their real data in the Phonemes link and used Pattern as prose). **r111** rewired the check to read the **Phonemes link as set-membership** (fallback order: link → Pattern-as-sequence → not-auto-checked) and added a new closed-select **Applies When** field on the Phonotactic Constraint ("Anywhere at this position" / "Only in a cluster," shown only on Onset/Coda, no migration) so "velars never cluster" is modeled as data rather than guessed from wording. Node-tested against the real Ethlinde file and **browser-confirmed** by Drak. Canonical `Ethlinde.conlang.json` re-issued with the cluster flag pre-set. **r112 then shipped the word generator together with a sonority rewrite of the syllabifier** (the generator needed it): maximal onset now keeps only the rising-sonority run as the onset and drops the rest into the coda, sonority read from each Phoneme's Manner, which replaces the r109 count rule that over-pulled (`ranfir`→`ra.nfir`). 114 of the 599 Ethlinde words display a changed split as a result. The generator is a review-list panel in the Lexicon, the check run backward, weighted by lexicon frequency, deduped within the language. Both confirmed. **r113 then shipped the grammar/dictionary export** (the rendering layer: a whole-language reference document in Markdown and HTML, a new builder walking the 21 Glossopoeia arrays rather than `state.entries`), and **r114 keyed that export to the live theme** after the first cut exported plain black-on-white (it now reuses the entry export's `extractThemeVars()` path). Both confirmed ("renderer is good"). **r115 then shipped the IPA rule engine** (`glossApplyRules` runs the Phonological Rules in Order against a phoneme string, producing a per-word surface line with a fired-rules trace; slot notation for the environment), Node-validated against the real Gutter Elf rules; the Gutter Elf import was rebuilt to 177 records with its own inventory and notation rules to exercise it (data artifact, no r-bump). **r116 shipped the three-item cleanup batch** (inline paradigm tables, the Corpus picker scoped to lexemes, singleton enforcement), clearing the phase-two known-limits list. **r117 shipped auto-paradigms** (a word with an inflection class set shows its generated table in the Lexicon) and is confirmed. **r118 shipped the morpheme matcher / assisted glossing** (a "Gloss a sentence" panel atop the Corpus workspace that creates a pre-filled interlinear Example via a corpus-memory → lexicon → stem+ending → blank fallback); it's staged and Node-tested, browser pass open at the time. **r-counter now r122 (browser-verified).** The matcher (r118) plus the **diachronics apex** (r119–r121: engine split, fork clone, run) shipped; the r118–r121 browser pass ran 2026-06-23, r121 surfaced a full render crash (a deleted ternary opener in GlossopoeiaView) that r122 fixed with a one-line restore, and the whole set is now browser-verified. See the two 2026-06-23 blocks below. Both decisions from the Gutter Elf rebuild are now resolved (apocope narrowed to {e, a}; parent-inventory fallback declined) — see the 2026-06-23 (decisions) block below. **Ethlinde + Gutter Elf import artifacts delivered (2026-06-22, no r-bump):** two finished `.conlang.json` files (Ethlinde 745 records; Gutter Elf 178 (the canonical r115 rebuild at 177, +1 from the §9 apocope split; 145/146-record original superseded), a `varietyOf`) built and Node-tested through the r104 import — data files, not HTML. **Current build order: … → Glossopoeia core view (DONE, browser-verified r095–r104) → Glossopoeia Phase 2 substrates (syllabifier DONE, rewritten sonority-based at r112; phonotactic validator r110–r111 DONE; word generator r112 DONE; grammar/dictionary export r113–r114 DONE; IPA rule engine r115 DONE; cleanup batch r116 DONE; auto-paradigms r117 DONE; morpheme matcher r118 DONE; diachronics apex r119–r121 DONE, browser-verified r122) → optional apex polish (none blocking, unscheduled) → Ephemeris BA rows → cartulary.world.**

#### Ephemeris view

**Top-level view for celestial mechanics.** Parallel to Linea / Stemma / Concordance / Kalendarium / Cartographia in the sidebar register. Name: Ephemeris (Greek-rooted scholarly term for tabulated astronomical positions/events over time). Locked.

**Naming history.** Stellarium considered and rejected — direct collision with established open-source planetarium software (stellarium.org, ~25 years of name recognition in the exact adjacent domain). Astrarium considered and rejected — phonetically awkward (`astr-AR-i-um` consonant cluster), even though it would have matched the `-arium` suffix of Kalendarium. Ephemeris won on phonetic flow and semantic accuracy: an ephemeris IS a table of computed positions over time, which is exactly what the view produces.

**Feature surface (locked at planning, may narrow during build):**

- Body list (sidebar within the view, filterable by kind)
- Per-body editor: orbital elements (semi-major axis or period, eccentricity, inclination, ascending node, argument of periapsis, mean anomaly at epoch), physical parameters (mass or proxy, radius or apparent size), parent body picker, axial tilt for non-moons
- Alignment finder: phase alignment (all moons at same fractional cycle position), ecliptic conjunction (same sky angle from parent), eclipse alignment (moon crosses parent-star line), nodal alignment (multiple moons at their nodes simultaneously)
- Export of computed alignment dates to Festival/Holiday entries via existing date-field flows
- Visualization: top-down orbital diagram (Observe mode). Sky-from-surface cut from v1.5 — half-feature without body rotation, time-of-day, and lat/long precision; deferred indefinitely.

**Hard constraint v1 (load-bearing won't-have list):**

- No real-star catalogs (Yale Bright Star, Hipparcos, etc.)
- No real-world ephemeris data import (JPL, NASA, Skyfield)
- No observation simulation (light pollution, atmospheric refraction, twilight phases)
- No weather, no tides, no astrology
- No precession, nutation, or other long-period dynamics
- No N-body simulation — purely 2-body Keplerian per moon

These are the rabbit-hole edges. The same pattern Cartographia+ uses for its won't-have list (no freehand brush, no custom color picker, no layers) applies here.

**Schema rework — non-trivial:**

The current `calendar.celestials` scoping is structurally wrong for Ephemeris. Moons belong to physical bodies (planets), which belong to systems (stars). The calendar relationship is derivative — a calendar's months often derive from a moon's cycle, not the other way around. New state surface: `state.celestialBodies = [{id, name, kind, parentBodyId, orbitalElements, physicalParams, axialTilt}]`. Calendar grid view's celestial render keeps working via a lookup that pulls cycle/offset from the moon's orbital period — derived display rather than stored duplicate. Migration backfills bodies for any existing `calendar.celestials`, sets parentBodyId to null (user pairs them up in Ephemeris), and either deletes or shadows the duplicate.

> **Superseded by what shipped (note 2026-05-24).** What actually shipped did NOT make calendar render a derived display. Migration backfilled bodies but left `calendar.celestials` reading its own `cycleDays`/`offsetDays` directly (preserved as `legacyCycle` on the body), so the two surfaces stayed decoupled — a moon ends up defined in BOTH stores with the id-link broken. That decoupling is the friction the moon-unification work (below) now closes, circling back toward this paragraph's original "derived display" intent but with an explicit geometric→cycle fallback.

**Moon unification (Kalendarium ↔ Ephemeris) — BUILT and QA-CLOSED CLEAN (r033–r040, 2026-05-28 build / 2026-05-31 QA):**

A moon is defined once, in Ephemeris; calendars reference moon bodies by id and render phase resolved geometric → synodic-cycle → "no phase". Built across seven steps: shared `fractionToPhaseIndex` extract + `computeMoonPhaseGeometric` (unsigned elongation/360, reuses the bucketing) → `calendar.celestials` object→id-ref migration (id-then-name resolution across the merge/dedup passes) + `CalendarGridView` resolver + shape-tolerant `ensureCalendarShape` → first-class `synodicCycleDays`/`phaseAnchorDay` in AsBo (inert when geometry available) → eager `legacyCycle` promotion at migration (wrapper retired) → calendar moon-ref picker + quick-create → `deleteBody` ref sweep + single-calendar export embedding → single-calendar import reconciliation modal (option c). r040 followed QA: reconciliation dropdown options carry an `orbits <parent>` / `Nd cycle` / `no phase data` descriptor so same-named moons disambiguate. Two decisions diverged from the written spec, both recorded in `cartulary-doctrine.md`: (1) **eager** `legacyCycle` promotion instead of lazy keep-as-fallback (values are copied, nothing reads the wrapper after, so it was vestigial); (2) **unguarded** `+ New moon` quick-create instead of the parent-guard (the guard locked out the cycle-only users the fallback is built for). Single-calendar import is option (c): export embeds each moon's synodic data, import rebinds-by-name-or-creates via a per-moon reconciliation modal, bodies created atomically with the calendar. QA pass: 33/34 PASS, 1 SKIP (MU-21, the orphan-cleanup affordance, unreachable post delete-sweep).

**Ephemeris explorer-polish (r041–r044, shipped 2026-05-31):**

After moon unification closed, manual Ephemeris use surfaced UX gaps for non-astronomer users. Sanity-check audit produced seven candidate items; six shipped (the seventh — a louder visual cue for tooltip discoverability — held back as a tradeoff call). r041: narrative mirror kinds for every Computable kind (9 new entries with `(narrative)` suffix), `FIELD_TOOLTIPS` constant + dotted-underline `tooltip` prop on AsBoEditRow / AsBoFieldRow with 12+12 wired rows across edit and view modes, draggable Compute split divider persisted to `compute.querySplitRatio`. r042: dimmed explainer where the Orbital Elements block hides for computable + no-parent bodies. r043: Kind row context hint (Computable vs Narrative), conditional Parent Body empty-state hint, Mass field hint extended to flag the satellites requirement, Compute panel tooltip pass + jargon-to-plain rewrites of `ALIGNMENT_TYPES` hints and `tolHint`, "Use sample values" button in AsBoOrbitalEditBlock with `SAMPLE_SMA_BY_KIND` map and confirm-if-edited safety, Tutorial seed button in AsBo empty state adding Sol/Terra/Luna with realistic values. r044: tutorial button tooltip notes the empty-world-only availability so the disappearance after first use isn't a surprise.

**Forced Alignment workspace — BUILT (r045–r047, shipped 2026-05-31; QA-passed 2026-05-31):**

Fifth Ephemeris workspace slotted between Compute and Observe. Inverse of Compute: pick bodies + target date + alignment type + optional recurrence, and the workspace shows what edits force that alignment and (on confirm) writes them. r045: state shape extended with `state.ephemeris.forceAlign` (per-workspace selection, separate from Compute), math helpers added (`computeSmaFromPeriod` inverse Kepler, `targetMeanAnomalyForBody`, `computeForceAlignPreview`, `isBodyEligibleForForceAlign`), `ForceAlignModeContent` component built with live preview (no separate "compute" button), apply pipeline with confirm dialog. Tree generalized `isComputeMode` → `isMultiSelect` so Compute and Forced Alignment share the multi-select infrastructure with separate selection state. r046: eclipse caveat banner corrected (multi-body syzygy was already supported; the r045 banner inaccurately said "first two picks"). r047: **full-3D eclipse forcing.** New `meanAnomalyFromTrueAnomaly` inverse-Kepler helper; eclipse type rewrites `ascendingNode = 0` (orbital plane contains shared eclipse direction) and `meanAnomalyAtEpoch` via ν = -ω inverse; preview gains Ω column for eclipse mode; apply pipeline writes Ω only when `omegaRewritten` is set (other alignment types still leave Ω alone). Inclination preserved across all alignment types — tilted planes that contain the shared line still work. Math validated end-to-end: three bodies with inclinations 2°/25°/60° and eccentricities 0.05/0.1/0.2 all forced to land exactly on +x at the target day (unit direction `(1.000000, 0, 0)` for all three). Recurring intervals supported on all types: `sma` rewritten per body to make each period divide N evenly (k auto-picked to minimize disruption); warning glyph on rows with > 50% sma change. Eclipse caveat that remains: pick the WHOLE chain (unpicked ancestors don't get rewritten, so a chain with gaps doesn't line up).

**Forced Alignment gap+polish pass (r048, shipped 2026-05-31; QA-passed 2026-05-31):**

Closed seven items from a gap audit. Gaps (3 of 4): nodal eligibility now requires `inclination > 0` (mirrors Compute's existing filter); `migrate()` backfills `forceAlign` substate for pre-r045 worlds; eclipse chain-completeness check walks each picked body's parent chain and surfaces unpicked non-root ancestors as warnings in a new `warnings[]` preview array. Polishes (4 of 4): phase reference fraction input with four preset buttons (0/¼/½/¾), new state field `phaseReferenceFraction` default 0; preview sorts eligible bodies by sma ascending; empty-world bridge ("Go to Astronomical Body →" button) when no bodies exist; calendar dropdown change auto-clears `targetDate` to avoid silent reinterpretation. G4 (structured QA pass) still pending.

**Habitable zone three-model + luminosity override (r049, shipped 2026-05-31; QA-passed 2026-05-31):**

`computeHabitableZoneAU(pp)` rewritten with three-model precedence: manual > optimistic > conservative (default). Conservative = Kasting (1993) 0.95/1.37; optimistic = Kopparapu (2013) 0.75/1.77; manual = direct `hzInnerAU` / `hzOuterAU` bypassing physics. Luminosity override (`pp.luminosity` in L☉) decouples L from M, applies to conservative and optimistic models. Star-only edit sub-block in Physical Parameters. Derived display caveat shows active model. No migration needed.

**Apsides terminology + chain-break warnings (r050, shipped 2026-05-31; QA-passed 2026-05-31, banner copy fixed at r054):**

Three independent cleanups. (1) "Perihelion"/"Aphelion" → "Periapsis"/"Apoapsis" — generic terms correct for any parent; perihelion/aphelion specifically mean "around the sun". (2) `FIELD_TOOLTIPS` rewritten for `semiMajorAxis`, `eccentricity`, `inclination` with both planet-scale and moon-scale references. (3) Chain-break warnings: AsBo orbital elements block shows accent warning when parent has no mass; Observe diagram shows banner listing affected bodies.

**Force-Align verify-in-Compute + revert (r051, shipped 2026-05-31; QA-passed 2026-05-31, verify fixed at r053):**

State extension `forceAlign.lastApply` captures per-body before/after snapshot of only the fields the apply actually touched (M₀ always, sma if recurring, Ω if eclipse). Snapshot persists across mode switches and the empty-world bridge. Three buttons in the lastApply UI block: **Verify in Compute →** switches mode + pre-fills currentQuery with the applied bodies/type/day; **Revert** restores each snapshotted body's pre-apply field values (locked-mode disabled); **Dismiss** clears the record. Only most recent apply revertable.

**Ephemeris bug audit + fixes (r052, shipped 2026-05-31; QA-passed except BA-01 trail / BA-02 tooltip-copy still unrun, BA-03 N/A):**

Structured audit identified 3 real bugs + 4 polish items, all fixed. (1) Trail rendering now uses `computeRootRelativePosition` at each sample time so moon trails follow the parent's wake instead of drawing as stationary ellipses around the planet's now-position. (2) `deleteBody` sweeps `forceAlign.bodyIds` + `lastApply.snapshots` (clears lastApply if empty). (3) Observe skips broken-chain bodies entirely (orbit rings, trails, body dots all gated on `brokenChainIdSet`). (4) Compute eligibility requires parent mass when body has a parent — dim in picker instead of silently producing zero results. (5) Force-Align target date shows resolved absolute day as inline italic helper. (6) `computeOrbitalPosition` guards `argumentOfPeriapsisDeg` defensively. (7) Phase fraction tooltip rewritten to make orbit-position-vs-lunar-phase disconnect prominent. v2-deferred items from the audit: calendar-edit drift warning, moon-wrapper retirement audit.

**r048–r052 QA pass + two fixes (r053–r054, 2026-05-31):**

First browser QA of the r048–r052 work. Engineered fixture world (`Cartulary_QA_ForceAlign_World.json` — 12 bodies, one star system, bodies deliberately un-aligned so Force-Align produces visible deltas, every eligibility/exclusion branch represented) + 41-case sheet (`Cartulary_v1.5_Ephemeris_r048-r052_QA.xlsx`, four tabs, doctrine yellow/black-moat frame). 37 PASS / 0 FAIL on run rows; two bugs found and fixed. **r053 — Compute single-day scan:** all four `find*Alignments` finders bailed on `dateRangeEnd <= dateRangeStart`, so the zero-width range Verify-in-Compute writes (`start == end == targetDayAbs`) returned nothing; guard relaxed to `<` so a single-day scan runs (also closes the manual start==end footgun). **r054 — Observe banner copy:** broken-chain banner still read "drawn at the system root as a fallback", but r052 stopped drawing those bodies; reworded to "left out of the diagram". Unrun: BA-01 (trail composition — the headline r052 fix), BA-02 (tooltip copy), BA-04 (reload-canonical); BA-03 (ω guard) is N/A.

**Orbital math depth — full Keplerian (2-body):**

Orbital positions computed via iterative Newton-Raphson solve of Kepler's equation (`M = E - e·sin(E)`, 5-10 iterations to convergence for e < 0.9), true anomaly derived from eccentric anomaly, three-rotation chain (Ω about Z, i about X, ω about Z) to inertial position. Simplified-Keplerian alternative (mean longitude as position, coplanar-circular assumption) rejected because eclipse alignment requires real 3D positions — without them, the finder produces phantom eclipses on inclined moons and misses real eclipses at non-zero ascending nodes. Eccentric orbits (comets, elongated moons) also deviate significantly from mean longitude near periapsis. Cost delta vs simplified: ~50-80 lines of math, ~10-20× more floating-point ops per evaluation, negligible at worldbuilder scales. Eccentricity capped at e < 1 (elliptical only); parabolic and hyperbolic orbits out of scope.

**Astronomical Body template — resolved (option a, locked):**

Astronomical Body promotes to the view-object pattern Map → Cartographia established in v1.4. The `kind: "celestial-body"` system template is hidden from the sidebar Templates section (parallel to the Map filter); body data lives in `state.celestialBodies`. Edit Template access stays available through the Astronomical Body workspace overflow menu. Locked via two doctrine entries: "Ephemeris uses `state.celestialBodies`, not calendar-scoped celestials" and "System templates can be hidden from the sidebar template list while their data is exposed through a workspace UI." Two-layer (b) and full-migration (c) were considered and rejected — (b) introduces a dual-representation pattern Cartulary doesn't have elsewhere, (c) loses the "worldbuilding entry like any other" affordance for cultural/narrative fields.

**Open design questions (UI design pass, not scoping):**

Resolved during scoping: Observe mode locked as top-down orbital diagram only (sky-from-surface cut — see Visualization in the Feature surface above); alignment finder ships all four types (phase, conjunction, eclipse, nodal). Both confirmed in the cross-cutting decisions and per-workspace locks.

Still open, design-pass territory:

- Sidebar icon: ☉ ☆ ★ ⊙ ✦ ✧ ☽ candidates.
- Sidebar order: probable placement between Kalendarium and Cartographia.

**Estimated code cost (per the part-3 breakdown, updated for full Keplerian):** ~1050 new lines (all four alignment types plus full Keplerian solver and 3D rotation chain) plus 7-8 new schema fields, migration pass, ~70-80 QA test cases. Shared sidebar infrastructure for v1.5's new sidebar entries lands in Ephemeris as the first piece of the sequence, then Packs picks up the already-modified sidebar.

**Trade accepted:** Putting a new top-level view into the monolith two releases before modularization adds incremental scope to v1.7. Not a fire — modularization always has to deal with whatever views exist when it lands — but stated cleanly so the trade is conscious.

#### Packs framework

**Templates-only top-level abstraction.** Separate sidebar section between Templates and Tags. Multi-collision import modal. State shape: `state.packs = [{id, name, description, templateIds: [...]}]`. Hard constraint v1: templates only, no entries/assets/fonts/CSS expansion.

Packs is the pressure-relief mechanism for genre-shaped feature requests. The doctrine principle "small default set, unlimited user extension" has been implemented at the single-template level via custom template builder + JSON import; Packs scales the pattern to bundle-shaped expansion. A Sci-Fi Pack with FTL Route / Fleet / Tech / Climate / CivilizationStage templates does the same job a built-in "complete sci-fi workbench" feature would, but without the maintenance burden landing on Cartulary core. Same for Mystery, Court Intrigue, procgen-driven settings, anything else genre-bound. The polite-no answer to "Cartulary should support [feature for genre X]" is: build a pack.

**Edge case worth surfacing in v1.5 docs:** Packs in v1 cannot add fields to *existing built-in templates* — the v1.4 origin-protection doctrine deliberately prevents external sources from modifying built-in templates. Pack authors who want to extend (e.g.) Faction with a Tech Level concept have two clean paths: create a separate TechLevel template referenced from Faction via entry-ref (relationship visible in Concordance), or create a custom Faction-like template (e.g. "Stellar Faction") that replaces the built-in for worlds using the pack. Field-additions to built-ins would require a "pack v2" extension; backlog candidate only if real demand emerges, since the entry-ref path handles the same cases.

**Build (r055–r060, 2026-06-01).** Shipped end-to-end: `state.packs` reference-sets (r055 foundation — state/migrate/sidebar/create/detail-pane/rename/delete), membership (r056 — add/remove + sidebar grouping + Templates-list filtering), export (r057 — `cartulary_pack_export` envelope, keeps template ids), import (r058 — deterministic per-pack id namespace + entry-ref remap + three pack-id branches + dedup), re-import reconciliation modal (r059 — stable-diff → per-template Replace/Keep), pack-qualified entry-ref labels (r060). In-app help for Ephemeris, Kalendarium (moon unification), and the JSON Save File Schema (new top-level keys) updated at r061. Each parse-gated; the pack runtime is validated via real-world import/export of the Space Opera pack. Locked scope decisions: reference-set not container; built-ins never members; a template may belong to multiple packs; pack id file-stable; per-pack id namespacing so same-named templates across packs coexist; pack delete never cascades.

#### Grid field type (engine, v1.5 — BUILT 2026-06-02)

Native `grid` field type (2D tables) added to the template engine ahead of the ConLang core view, because the Paradigm template needs an inflection table and no existing field type holds a 2D grid. Justified as general-purpose infrastructure, not a Paradigm one-off — relationship matrices, stat blocks, comparison tables, and script/orthography charts all want one; Paradigm is just the first consumer. Will also serve the eventual script/orthography work (sound-to-glyph and romanization tables) and any future pack.

Locked design (full rationale in `cartulary-doctrine.md`): axes are **per-entry** (each entry defines its own rows/columns — required because paradigms vary in shape, and the strict superset of fixed-axis); each **cell is independently typed** via `{type, value}`, five cell types (text / number / entry-ref / calendar-date / calendar-date-range); **ref cells target any entry** (no per-grid or per-cell target config — which also means a packed grid-bearing template needs no ref remapping). Cells default to text, switch-clears-value, sparse storage. Stable row/col ids so rename/reorder never disturbs cell bindings.

Built r062–r070 (foundation → editor → builder → display → per-cell rework → export → composition), audited and fixed r071 (pack re-import false-conflict) + r072 (grid refs in Concordance) + r074 (date-walker lockstep), footer swap r073. Browser-QA full pass (17-case sheet, `Cartulary_v1.5_Grid_QA.xlsx`, fixture `Cartulary_QA_Grid_World.json`). Documented v1 limitations: grid-cell refs show in Concordance but not Linea (family roles aren't cells); grid date cells aren't in the calendar-day-click popover (discovery-only walker, scoped out); number cells store strings; empty non-text cells persist.

#### Node-source registry (engine, v1.5 — BUILT 2026-06-02)

A registry of **first-class linkable node types**, added because Ephemeris Astronomical Bodies live in `state.celestialBodies` (not `state.entries`) and were therefore invisible to Concordance and un-targetable by entry-ref fields — and the same wall would hit ConLang the moment it becomes a core view with its own state slice. Built pre-ConLang as the seam future view-slices register through.

Registering a type buys two things: it's **graphable** (contributes nodes + intra-type edges to Concordance) and **ref-targetable** (entry-ref fields can point at it). **Registration is a data contract, not an API** — a source supplies a descriptor `{id, name, color, icon, refEligible, getInstances(state), getColor(inst), getEdges(state)}` and presents as a **synthetic template** so the existing templateId-keyed machinery (picker, coloring, name→id, legend) reuses with minimal branching. Core views satisfy the descriptor in code; a future pack could satisfy the same descriptor by declaration once Packs grows past templates-only (the descriptor is kept declarative so that door stays open at no cost now). Packs as they exist need nothing — their instances are entries, already first-class — but a pack **can target a registered type by name** in `refTemplates`, resolved via the same `fix()` name→id path, which makes the registered-type names a **published allow-list** that's part of the pack-authoring contract.

Astronomical Body is the first registrant. Built r075–r081: foundation (r075) → Concordance reads bodies as kind-colored nodes with orbital "orbits" edges, the sector hierarchy for free (r076) → "Astronomical Body" becomes an authorable entry-ref target, the id unified onto the existing `__bodies__` sentinel, `BODY_REF_LABEL` renamed "Celestial Body" → "Astronomical Body" with the old label kept as a resolving alias (r077) → bodies as Stemma nodes (r078) → bodies as Cartographia pins (r079) → Ephemeris delete silently scrubs inbound entry refs with a "referenced by N entries" warning before confirm (r080) → bug-audit fix for a body-label/template-name collision the rename introduced (r081). Parse-gated and source-audited; **browser-verified r087 (2026-06-17, full QA pass)** — the five net-new behaviors (r076 graph read, legend toggle coupling, r081 sentinel guard surviving reload, synthetic-template exclusion) all cleared. Also a stale-comment note: the sentinel comment near the top of the registry block still says "Celestial Body" while the constant resolves to "Astronomical Body" — harmless, one-line fix when next in that region. View triage that scoped it: Concordance (read) + the entry-ref picker (author) were the real gaps; Linea and Chronometric are correct-by-design; Stemma and Cartographia were soft manual-surface gaps brought in scope.

#### Two flagship packs (post-registry) — replace the single ConLang pack

Under-promise/over-deliver originally aimed for two flagship packs; **revised 2026-06-17 to one (Space Opera).** Game Mechanics shelved to post-v1.5 (design-only, no code shipped; frozen at `game-mechanics-pack-reference.md`). The Packs framework is fully validated by the single Space Opera pass — the second pack was for over-delivery, not framework coverage, so shelving it costs no verification.

**Pack A — Space Opera (system-agnostic), built FIRST as the Packs-framework browser-QA vehicle. DESIGNED + AUTHORED + PARTIALLY BROWSER-VALIDATED (2026-06-05, r082–r085).** It hits every framework code path self-contained — Type-gated `showWhen`, two `optionsByParent` cascades, `refFilters`, intra-pack single + multi refs, multi-template refs, refs into Faction/Character/Location/Race/Magic-Tech built-ins, a ship-spec grid, `otherTextField` — with no SRD/attribution confounds. **Locked roster (8, the 4–7 target held fluid):** Vessel, Technology, Cargo / Commodity, Colony / Station / Habitat, Route, AI / Synthetic, Crew, Powers / Abilities. Designed via full proposal-review (halfwidth tables, Drak reordered each); hand-authored as a single-file `.cartulary-pack.json` by `build_pack.py` (self-validating, 0 errors). Doctrine settled here: **packs aren't gated by the built-in high bar** (overlap expected), **specialized-slice over self-contained** (ship the genre slices, lean on genre-neutral built-ins), **single-JSON format** for templates-only packs. Stays off celestial bodies and does NOT depend on the registry — the QA vehicle stays self-contained. The browser pass surfaced three framework bugs (r082 import-resolve + double-namespace guard, r083 world-import envelope guard) and prompted a new editor feature (r084–r085 ref-field hints); **final re-test on r087 (2026-06-17) cleared 13/13** including the cascade-child otherTextField and user-template ref hints.

**Pack B — Game Mechanics on the D&D 5.1/5.2.1 SRD (CC-BY 4.0). SHELVED to post-v1.5 (2026-06-17) — design-only, zero code shipped; authoritative frozen design at `game-mechanics-pack-reference.md`. The text below is the historical sketch as of mid-design and is NOT the current plan; the reference doc supersedes it (8 locked schemas, the {2014,2024}+flag edition model, Species/Race proposal, seven open decisions).** Templates (sketch): **Stat Block / Ability / Item / Encounter**. **Ships the stat-block SHAPE, not SRD content** — Packs v1 is templates-only, so no SRD creatures/spells/items as entries. This keeps licensing light: game *mechanics* aren't copyrightable (six abilities, AC, HP, CR, the d20 structure are free to model); CC-BY only bites on reproduced *expression* or verbatim curated lists (conditions, damage types, schools). The 5.1 SRD is mostly the reference for getting the shape right; the standard CC-BY attribution slots into the existing license preamble (MIT + BSD-3 + OFL) as cheap insurance for any enumerations copied. (Not legal advice — verify any specific verbatim list before release.) Heavier grid showcase, which is why it's second, not the test rig. Attaches stat blocks to existing Creature/Character entries rather than duplicating them.

> **Licensing research findings (2026-06-02).** Targets checked for a free, MIT/itch.io-distributable mechanics pack. **Legend in the Mist** (Son of Oak / Mist Engine) — RULED OUT: the "Cauldron of Mist" third-party program is a closed DriveThruRPG storefront, platform-exclusive (content can't be listed elsewhere), 50% royalty, no open SRD, and excludes universal systems based on its games; also tag/narrative-based (no stat-block showcase). **Mongoose Traveller** — RULED OUT for the brand: 1e (2008) was OGL with a public SRD; 2e (2016+) is closed; the 2023 "Traveller Open Content" promise delivered only a gated Compatibility Licence (royalty-free private contract, established publishers only, SRD behind closed doors) + the TAS DriveThru storefront. Escape hatch: **Cepheus Engine** (the OGL "2d6 SF SRD" forked from MgT1e) is fully open/reproducible/free, mechanically Traveller-feel, minus the trademark. **Clean open targets:** PF2e (ORC), D&D 5.1 SRD (CC-BY), and OGL survivors like Cepheus. Daggerheart carries a third-party VTT restriction; system-agnostic stays viable at the cost of mechanical fidelity. Drak picked the 5.1 SRD for pack B.

**Authoring workflow (resolved 2026-06-02):** a pack is normally authored in-app and exported, but the assistant can't drive the UI, so the assistant **hand-writes the `.cartulary-pack.json`** directly (it knows the template schema and the `cartulary_pack_export: 1` envelope); Drak imports and validates. Each template goes through the proposal-review cycle (halfwidth tables, sign-off) before any JSON is generated.

#### Glossopoeia: the ConLang core view (COMPLETE r088–r104; Phase 2 COMPLETE r105–r122, browser-verified; apex polish r123, browser-verified)

The ConLang core view is named **Glossopoeia**. The core view is **complete and browser-verified (r095–r104)** and **Phase 2 is complete and browser-verified through r122** (the diachronics apex shipped and verified). Glossopoeia is closed as a workstream; its two dedicated docs (`glossopoeia-design-handover.md`, `glossopoeia-phase-two.md`) are retired and frozen as of 2026-06-23, with status consolidated into this roadmap, the handoff, and the changelog. **Architecture (locked, built):** Glossopoeia is a VIEW with its own state slice (`state.glossopoeia` — 21 record arrays + workspaceNotes + ui), exactly like Ephemeris — NOT templates in `BUILTIN_TEMPLATES` (an early attempt was reverted, r089–r090). Entities render through the existing `EntryForm` with per-type schemas built in code; node types register through the node-source registry. Full schema reference: `glossopoeia-design-handover.md`; state in handoff §1.

**Core view DONE (r088–r104, browser-verified):** r088 multi-select prerequisite; r091 view shell + ConLang container + EntryRefEditor generalization; r092 Lexeme + Lexicon (Senses group); r093 the destructive Language/Glossary supersede-and-migrate; r094 Phonology: Inventory + `GlossEntityList`; r095 Phonotactics + Inventory longform; r096 the Morphology four-entity toolbox (four node types + the three deferred Lexeme refs); r097 Noun Number + Verbs display digests; r098 Pronouns; r099 Syntax + Complex Structures + Lexeme reorder; r100 Orthography + Corpus (eleven workspaces complete); r101 grid-cell ref threading audit fix; r102 field tooltips (176 fields); r103 in-app usage + JSON-schema docs; r104 per-language import/export. **Eight node types register:** ConLang, Lexeme, Phoneme, Grammatical Value, Affix, Word-Building Process, Inflection Class, Writing System.

**Phase 2 DEFINED — all-in-one** (2026-06-21). Build the compute substrates in-tool; the discarded alternative was the integration layer (round-trip to Lexurgy). Substrate spine: substrate-zero (word as phonemes + morpheme seams) is partially done — clean-IPA Pronunciation + the **Word Pieces** group (r106); the **syllabifier** is the keystone and is DONE (r109); the **IPA rule engine** (r115), **morpheme matcher** (r118), and **rendering layer** (r113–r114) followed, then the diachronics apex (r119–r122). Tier features the substrates unlock: word generator, phonotactic validation on save, paradigm autogeneration, sound-change applier, auto reference grammar.

**Phase 2 BUILT + BROWSER-VERIFIED (r105–r122):** all compute substrates, every tier feature, and the diachronics apex. Per-build:
- r105 — registry comment fix (Astronomical Body) + `onConlangFile` lock guard (no-op / unreachable).
- r106 — Lexeme **Word Pieces** group (Sounds / Role / Affix), the **second** sanctioned built-in group; the one-group doctrine was waived deliberately.
- r107 — **IPA palette** on every IPA field in Glossopoeia (a "This language" row from the inventory + the full chart).
- r108 — small-wins: Duplicate, ready-to-name, palette close on Esc/click-outside, list filter past 6 items, list subtitles.
- r109 — the **syllabifier** engine `glossSyllabify` + per-word Syllables readout/override; one morpheme-aware maximal-onset rule (coda retention at seams) proven on Ethlinde + Ân-lâna; engine Node-tested. Rewritten sonority-based at r112.
- r110–r111 — **phonotactic validator** `glossPhonotacticCheck`; onset/coda vs Max Onset/Max Coda, missing-onset-if-required, prohibited constraints by Phonemes-link set-membership (r111 fix), new **Applies When** field; warn-only.
- r112 — **word generator** (the check run backward, weighted by lexicon frequency, review-list panel) plus the sonority rewrite of the syllabifier the generator needed. 114 of 599 Ethlinde splits changed.
- r113–r114 — **grammar/dictionary export**; a slice-walking builder over the 21 arrays, Markdown + HTML, r114 keyed it to the live theme.
- r115 — **IPA rule engine** `glossApplyRules`; runs Phonological Rules in Order against a phoneme string, per-word surface line, slot notation. Gutter Elf import rebuilt to 177 records to exercise it.
- r116 — cleanup batch (inline paradigm tables, Corpus picker scoped to lexemes, singleton enforcement).
- r117 — **auto-paradigms**; a word with an inflection class shows its generated table in the Lexicon.
- r118 — **morpheme matcher / assisted glossing** `glossGlossSentence`; "Gloss a sentence" panel, corpus-memory → lexicon → stem+ending → blank fallback.
- r119–r121 — the **diachronics apex**: engine split into `glossRunRules` + the Diachronic-filtering wrapper plus the Diachronic flag (r119); `glossForkLanguage` clone + Descended From on ConLang and Lexeme + "descended from" Concordance edges (r120); `glossDeriveDaughters` / `glossRomanize` / `glossApplyDaughters` run + review-diff modal (r121).
- r122 — fixed the r121 render crash (restored the deleted ternary opener in GlossopoeiaView); completed the apex browser pass.

**Next:** the apex-polish bucket is empty — #1 unused-sound prune and #4 Source Word help shipped (r123, browser-verified), #2 per-word run exclusion and #3 stem-level paradigms declined on scope (see the 2026-06-23 (later) block at the tail and the doctrine block of the same date). Also shipped this session: r124 delete-language cascade (bug fix, browser-verified) and r125 per-calendar date format + single-formatter consolidation (browser-verified). Next real work: Ephemeris BA rows (BA-01/02/04), then cartulary.world. Both Gutter Elf decisions resolved (apocope -> {e, a}, file updated 2026-06-23; parent-inventory fallback declined). CSV/Swadesh import is scoped and deferred (see the 2026-06-23 (deferred) block at the tail; CSV-with-mapping is the priority half, Swadesh optional or skip). The other Tier 1 items (Concordance cross-type edges, romanization→IPA, lexicon statistics) remain optional. Open gap: deleting a PARENT language leaves children's Descended From dangling (non-blocking; downstream skips dead pointers).

**Deferred (carry forward):** visual script assets (Scrap's glyph chart + images; the world-scoped asset subsystem stays out of v1, Scrap migration gated on it — note PolyGlot ships a logographic engine, so this is a single-file-architecture call, not a nobody-does-it call); structured root-and-pattern as a first-class type; the romanization→IPA parser (the languages use clean IPA, so deferred). Limits cleanup: cross-type Concordance edges (intra-type only), unfiltered grid ref cells + cross-boundary refs inside grid cells not relinking on import, the duplicable per-language specs (r108 gave them a label but didn't block a second create).

**Import artifacts (2026-06-22, no r-bump):** `Ethlinde.conlang.json` (745 records) and `Gutter_Elf.conlang.json` (178 records — 177 at the r115 rebuild plus one from the §9 apocope split to {e, a}; its own inventory and notation rules; the 145/146-record original is superseded, do not re-import it; a `varietyOf` Ethlinde) — built and Node-tested through the r104 import to bulk-populate Glossopoeia from Drak's DPE source docs. Data files in `/mnt/user-data/outputs/`, not part of cartulary.html. Import order: Ethlinde first, then Gutter Elf.

---

## Done — v1.5 release (SHIPPED 2026-06-26)

**v1.5 is shipped.** Released to itch.io 2026-06-26. Two major top-level views (Glossopoeia, the constructed-language workspace; Ephemeris, the celestial-mechanics workspace), the Packs framework with the Space Opera flagship pack, the native grid and longform-note field types, the node-source registry, the House/Dynasty/Clan/Bloodline built-in, the per-calendar date-format presets, and a full cartulary.world documentation/landing site shipped live alongside. Devlog: "Lingua per aspera ducit ad astra." Full r-by-r history (r001–r134) in the changelog and the prior handoffs.

**What changed vs the v1.5 plan above.** The plan as written carried two flagship packs (Space Opera + Game Mechanics) and treated cartulary.world as the last in-line item. As shipped: Game Mechanics was shelved to post-v1.5 (design-only, frozen at `game-mechanics-pack-reference.md`); Space Opera was the sole flagship pack. ConLang, originally a deferred pack, was promoted mid-cycle to the Glossopoeia core view and became the larger of the two headline features. The in-app-help sweep (r133) and a Concordance empty-default UX change (r134) landed into the open line after feature-complete, before the upload. cartulary.world shipped live before the product finals (it was the active workstream through session 6–7; the product finals shipped session 8).

**Theme note (continued).** v1.5 returns to the view-level pattern in force — two new top-level views (Glossopoeia, Ephemeris) — while also shipping the Packs framework (a reusable distribution surface) and the external-artifact work of the cartulary.world site. v1.6 ships the Cartographia+ map creator full feature. v1.7 ships code modularization standalone.

---

## Plan and record — v1.6 (moved verbatim from `roadmap.md` 2026-10-23)

> Everything `roadmap.md` carried at the v1.6 ship, except the v1.5 plan above and the pointer stubs, in the order the file had it: the status lines and the version theme note from the top of the file; the original v1.6 Cartographia+ section; the v1.7 modularization section (modularization shipped inside v1.6); the backlog and the deferred list as they stood; the post-v1.5 backlog v1.6 was planned from; and the v1.6 section with its session blocks. Verbatim. The live roadmap was rewritten from these on 2026-10-23.

### The top of the file, as it stood

**v1.3 is shipped.** Released to itch.io May 14 2026. All template work, all migration framework additions, origin protection, half-width auto-pair (universal rule + visibility-aware re-pairing), Template Preview popup, and Concordance persistence (Level 1 + Level 2) live in the public release. Six Home doc sections updated. Pre-release audit cleanup landed. Post-build hotfix for half-width pair-layout blank slots caught by Drak during staging QA; fixed, rebuilt, re-uploaded before broken zip was in the wild beyond Drak's household. Devlog posted to itch.io release-announcements board (title: "These are the templates you're looking for").

**v1.4 is shipped.** Released to itch.io 2026-05-18. Multi-calendar support (Kalendarium), HTML export, snapshot-based version history, Cartographia (Maps view promoted to top-level), the calendar grid + seasons + moons polish cluster pulled forward from post-1.7 backlog, and a visual design pass across the application. Code modularization originally slated as the fourth v1.4 piece was pushed to v1.7 once it became clear v1.4 isn't the stable surface modularization wants. Devlog: "Getting stuck in time. So it goes." Details in the Done — v1.4 release section below.

**Version theme note.** Each minor through v1.2 carried a view-level change (Stemma in 1.1, Linea overhaul in 1.2). v1.3 broke that pattern by going deep on schema + Concordance + builder UX. v1.4 returns to view-level features (Kalendarium is a new top-level view; Cartographia is the bound collection of maps, also a top-level view) and adds external-artifact work (HTML export) alongside, plus the visual-richness cluster (calendar grid + seasons + moons) inline with Kalendarium. v1.5 ships the Packs framework + one flagship pack (Space Opera) + ConLang promoted to its own core view + Ephemeris view (top-level celestial-mechanics surface). [Game Mechanics, originally the second flagship pack, was shelved to post-v1.5 on 2026-06-17 — design-only, no code shipped; see the v1.5 section and the 2026-06-17 block below.] v1.6 ships the Cartographia+ map creator full feature. v1.7 ships code modularization standalone, with no competing user-facing feature to obscure the structural work. User-facing surface area grows steadily release-over-release; foundation underneath gets the modularization treatment once the foreseen features are stable.

## v1.6 — Cartographia+ map creator (Excalidraw-for-maps)

Primitive map creator inside Cartographia. Currently Maps requires the user to bring their own background image (Inkarnate / Wonderdraft / Dungeondraft / Azgaar / hand-drawn scan). For users without those tools and without artistic skill, that's a real onboarding barrier — one of Cartulary's headline views is gated behind external software ownership. A primitive editor lets a new user produce a serviceable rough map in twenty minutes, place pins, exercise the time-aware filtering and name-history rendering — actually use Maps instead of staring at an empty canvas.

**Frame: Excalidraw-for-maps, NOT Inkarnate-lite.** Excalidraw shipped wildly popular by leaning into a single aesthetic constraint (everything looks hand-sketched on graph paper) and refusing to be a real diagramming tool. The constraint is the feature. Cartulary's map editor picks one aesthetic — parchment-and-ink as default, with stamp packs extending to other styles — and stays inside it.

**Why this is borderline doctrine and how it stays inside.** Drawing tools categorically don't have a defined feature edge — every drawing app gets requests forever ("can you add a brush, fill, forest texture, hex overlay, measurement, elevation tints"). Each individual request is small. None individually break doctrine. Cumulatively they turn Cartulary into a bad Wonderdraft. The architectural answer is the small-default-set + user-extension pattern (see doctrine): ship a small built-in set that meets the high bar, support unlimited user extension via an importable spec, and the polite-no answer to feature requests becomes "the spec supports it, build your own." This makes the feature defensible inside doctrine; without the extensibility hook, it isn't.

**Why Packs lands first.** Packs v1.5 validates the small-default-set + user-extension pattern at the more familiar Templates surface. Map editor is the second instance applied to a creative-content tool. Shipping Packs first means the import collision modal, JSON envelope conventions, and user mental model are already established before the Map editor relies on them for stamp pack import.

**v1 scope (locked from Chat 08):**
- Drawing primitives: filled shapes (polygon, circle, rectangle) with smoothed corners; strokes (lines, paths) with a small set of widths
- Text labels in Cormorant Garamond
- A small fixed palette tuned to the chosen aesthetic — 6–8 colors, not a picker
- A starter built-in stamp set: mountain, tree, settlement marker, compass rose
- Undo/redo
- Save as SVG embedded in the Map entry (data stays inside the world JSON)
- Stamp pack import via `cartulary_mapstamp_pack: 1` envelope, Skip/Replace/Rename collision modal mirroring Templates and Packs

**v1 explicit won't-have list (the load-bearing artifact):**
- Freehand brush tools
- Custom color picker
- Layers beyond a named, ordered, show/hide, lock list: no opacity, no blend modes, no per-layer export. (The list itself was added by decision at session 19; this line originally read "Layers".)
- Procedural generation
- Image import as drawable surface *(struck 2026-10-22: r043's raster layers load a bitmap as a layer, and the paint engine of cut 14 paints on it)*
- Image export beyond SVG/PNG

**Estimated scope:** Larger than Concordance overhaul, smaller than Stemma. 60–100 hours equivalent depending on undo/redo depth and stamp manager polish. Realistic ship ~1–2 weeks of focused work plus QA.


## v1.7 — Code modularization

Internal refactor splitting the working source into a modular set of source files, with the dual-build pipeline assembling them into the shipping artifacts. Standalone release with no competing user-facing feature, so the structural work is visible for what it is. Originally slated for v1.4; pushed to v1.7 once it became clear the "stable feature surface" criterion applies more honestly here than there. By v1.7, Kalendarium, Cartographia, HTML export, Packs, the ConLang view, and the Cartographia+ creator have all landed and stabilized. Module boundaries get carved against the full picture.

Cartulary's distribution model is non-negotiable: users download one HTML file and it works. The build pipeline already supports this — `build_inline.py` reads source, inlines dependencies, emits the precompiled production build and the JSX-preserved readable build. Modularization extends that pipeline to read multiple source modules instead of one monolithic file.

**Scope to be defined.** Drak owns the architectural plan; specific module boundaries, build flow changes, and Readable-distribution shape get pinned down when the work starts.

Candidate axes for the split (any subset may apply):

- Built-in templates definition (`BUILTIN_TEMPLATES`) out into its own module — dominates working-copy size and changes frequently
- Migration framework (rename tables, conversion tables, field-add pass, etc) out into its own module
- View components (`GraphView`, `FamilyView`, `StemmaCanvasView`, `ChronometricsView`, `MapView`, `KalendariumIndexView`, `KalendariumEditorView`, `CartographiaIndexView`, plus the v1.6 Cartographia+ creator subsystem) into per-view modules
- Editor components (`EntryForm`, `FieldEditor`, `TemplateBuilder`, `RichTextEditor`) into per-editor modules
- Core state plumbing (`updateState`, normalize/migrate, IndexedDB persistence) stays in the entry point

**Origin protection enables this.** With `origin: "builtin" | "user"` on every template, the migration framework filters built-in operations safely. A split where built-in template definitions live in a module imported by `seedBuiltinTemplates` doesn't risk a user template sharing a built-in name being subject to canonical-schema force-merge.

**Monolith pain signal.** v1.4–v1.6 ship with the monolith intact. Currently 1.17 MB; v1.6 working copy could be ~1.5 MB. If at any point through v1.5/v1.6 the monolith starts costing real navigation or AI-assistance time (both have a curve that gets noticeable past some threshold), that's the signal to slide modularization forward rather than wait. Worth keeping a finger on, not blocking.

**No user-visible features.** If anyone notices anything different after the refactor, it failed. Functional parity verified by running the v1.3 + v1.4 + v1.5 + v1.6 QA test sheets against modularized outputs.


## Backlog (post-1.7, non-blocking)

### Kalendarium polish / visual richness — pulled forward to v1.4

The three originally-backlogged items (calendar grid view, moons / celestial bodies, seasons) shipped in v1.4 once modularization was de-scoped to v1.7. See "Done — v1.4 release" below for the full feature surface. The deferred sub-cluster (weather, holidays as recurring entities, auto-advancing current date) remains deferred — those were Kanka-feature-spam calls and the reasoning hasn't changed.

Still deferred from the original cluster (not pulled forward):
- **Weather per-day grid data** — fantasy worldbuilders define weather narratively, not as grid data. Kanka feature-spam.
- **Holidays as recurring first-class entities** — Festival / Holiday template already covers this through prose. Auto-recurrence rendering would clutter Chronometric without adding worldbuilding value.
- **Auto-advancing "current date"** — Kanka does this; not relevant to typical worldbuilder workflows (writers and GMs advance time narratively, not via wall-clock ticks).

### Concordance polish

Level 1 and Level 2 of the Concordance persistence overhaul shipped in v1.3. Remaining items are pure polish:

- **Edge labeling** — minor visual improvements to edge-label placement and truncation, ship anytime without ceremony.
- **Per-node reset action** ("auto-place this") — fallback when a manual position becomes wrong and the user wants the simulation to re-place a single node around its connections. Implementation is local: clear `state.concordance.positions[entryId]`, trigger a re-cook for that node only.

### Concordance sector graph (stars from Ephemeris as graph nodes)

*(Surfaced post-v1.5 Ephemeris scoping. Unknown target version.)* **PARTIALLY DELIVERED (r075–r081):** the node-source registry already puts stars/planets/moons in Concordance as nodes and draws the orbital hierarchy (`parentBodyId`) as "orbits" edges — the star→planet→moon sector view falls out for free. What remains open is the rest of this entry's scope below: user-defined inter-system connections with per-edge distance metadata, and a star-only filter mode. per the v1.3 doctrine entry on manual positioning ("abstract-graph and spatial-diagram use cases — star maps, faction-power diagrams, planar cosmologies — without requiring a separate Star Map view"). This entry captures a specific extension: stars from Ephemeris auto-populate as Concordance nodes, with user-defined inter-system connections carrying per-edge distance metadata.

Key design move that keeps scope bounded: **topological positioning, not coordinate-accurate.** The graph doesn't simulate real distances in space; node positions are wherever force layout places them (or wherever the user manually drags them), and "distance" is metadata on the edge (light-years as user-entered value), not derived from positions. This skips the entire coordinate-accuracy / 3D-projection rabbit hole and treats the sector as a relationship graph that happens to be about stars.

Sketch:

- **Star auto-population.** Bodies with `kind: "star"` and `parentBodyId: null` (top-level stars, one per system) appear as Concordance-eligible entities. Hidden from the standard template list per the v1.5 Astronomical Body workspace doctrine, but visible as graph nodes — different surface.
- **Inter-system connections.** Either a new field on star bodies (`connectedSystems` multi entry-ref with per-row distance metadata, extending the `relationKind`-with-extra-fields pattern already used for spouse marriedOn/endedOn) or a standalone "System Connection" entity type. Entry-ref pattern is lighter and reuses existing plumbing.
- **Edge labels.** Distance value shown on the edge. Promotes the existing "Edge labeling" polish item above from polish to load-bearing.
- **Hover popup.** Star info via existing Concordance hover: name, kind, planets in the system (derivable from the star's children in Ephemeris's body tree), worldbuilding entries set in that system via faction/location backlinks.
- **Filtering mode.** Concordance grows a "filter to star nodes" mode so the sector view shows only stars + inter-system connections, hiding all other entries. Toggleable.

Open design questions deferred to scoping when the work is actually targeted:

- Binary star handling — does the secondary appear as a separate node, or just surface via hover on the primary?
- 2D vs 3D rendering — topological positioning works in both; 3D would feel more sci-fi and use depth as a layout axis to reduce edge crossings, but 2D is a much smaller addition. The originating idea was 3D; worth revisiting against actual scope budget when targeted.
- Empty-state handling — single-system worlds (most fantasy) don't benefit from a sector graph; UX should explain rather than show one floating node.
- Whether this is Concordance-with-star-mode or a separate view (e.g., "Astrography"). Concordance extension is lightest for v1; separate view is more discoverable but adds a new top-level sidebar slot.

**Generalization.** The same pattern (entity-kind-aware filtering + per-edge metadata) extends beyond sci-fi. Faction connection graphs, trade route maps, explicit planar cosmology links — same shape, different entity type. Once Concordance supports these two primitives, the star-sector use case is one application of many; the implementation effort amortizes across multiple worldbuilding domains.

**Competitive context.** Fills the in-game-tool gap currently held loosely by AstroSynthesis (Windows-only, paid, feature-frozen since 2013). The integration story is what's new vs AstroSynthesis: graph nodes ARE worldbuilding entries with all the existing Cartulary plumbing — templates, entry-refs, time-aware filtering, name-history, faction backlinks — not a separate star-mapping silo.

Not committed to any release. Lands when it's the right size of next thing to ship or when worldbuilder demand surfaces.

### Marriage feature followup

`marriedOn` / `endedOn` dates on spouse `relationKind` value shape. v1.2 marriage feature shipped with the basics; expanding to capture start/end dates is the natural next step.

### Data shapes reference doc

Add to project docs (`cartulary-doctrine.md` or new `docs/data-shapes.md`). Cover entry shape (tags is ARRAY not string, fields object keyed by field id), template field shape, key field value shapes. Prevents assumption bugs like the v1.3 hover-pane tags-as-string crash.

### Entry-ref correctness audit

Verify `refTemplate` / `refTemplates` point to correct templates across all 20 built-in templates. Template renames during the v1.3 uplift may have left stale references. Check both single (`refTemplate`) and multi-template (`refTemplates`) fields.

### Native recurrence support on calendar-date field type (D.4)

*(Surfaced from v1.5 Ephemeris scoping. v1.6+ candidate.)* When v1.5 Ephemeris promotes a recurring computed event (e.g. a phase alignment that recurs every 30.4 days) to a Festival/Holiday entry, recurrence information lands as plain text in the entry's notes. The shipped v1.5 entry is a single Festival with first occurrence as the date and recurrence info described in prose. D.4 would make recurrence a structural property of the `calendar-date` field type itself.

Sketch (subject to design pass): field value shape becomes `{absoluteDay, recurrence: {periodDays, count?, until?} | null}`. Consumers (Chronometric ticks, Kalendarium grid cells, Festival/Holiday entry rendering, Concordance edges where applicable) expand a single stored field into multiple display occurrences.

Scope considerations:

- **Calendar-position invariance.** Period in days is calendar-agnostic and stable across primary structural edits. Period in months or years would drift under primary structural edits the same way `currentMoment` would if stored as absoluteDay — likely just days for v1.
- **Render expansion bounds.** Cap on displayed occurrences (worldbuilder-tunable per view? hard cap on storage shape?). A "recurs every day for 10,000 years" pathological case needs a story.
- **Storage compactness vs query simplicity.** One field with recurrence is more compact than N expanded events at storage time, but every date-walking helper (`reframeDateAcrossStructure`, `collectCalendarDateUsages`, etc.) needs to learn about recurrence expansion.
- **Migration story.** Existing date fields without recurrence are unaffected — the new field is an additive optional sub-shape on the existing `calendar-date` value envelope.

**Distinct from the deferred "Holidays as recurring first-class entities" item** (in the Kalendarium polish backlog above). That was about entity-level recurrence — a "recurring festival" entity type — and was rejected as Kanka feature-spam. D.4 is field-level recurrence — a `calendar-date` field that represents a recurring date — driven by an actual concrete v1.5 use case (computed event promotion). Different layer, different motivation, different scope.

Triggered by v1.5 Ephemeris work but doesn't block v1.5 ship. The plain-text-in-notes fallback is acceptable for v1.5 release. D.4 lands when worldbuilder feedback indicates the prose-only model is the friction point worth fixing.

---

## Deferred indefinitely

- Stemma v2 features (sibling reorder, mention tracking, keyboard shortcuts, undo/redo, depth cap, MD export)
- World-scoped custom assets (gates Scrap conlang migration)
- Mobile UX
- Markdown export for Stemma (separate from JSON export which exists)
- Per-filter-state Concordance position storage (current behavior is global per world)
- "Star Map" as a separate sidebar view (Concordance with persistent positions IS the star map)


## Post-v1.5 backlog (carry-forward into v1.6 planning)

- **Game Mechanics pack** — shelved, design-complete, frozen at `game-mechanics-pack-reference.md`. The full-SRD-seed decision turned it into a 12–18 session pipeline; reversible to templates-first/seed-later if the grind warrants. Reconsider as a post-v1.5 standalone effort, not necessarily bundled with v1.6.
- **Data-shapes reference doc** — still owed in product docs. Entry shape, template field shape, key field value shapes (entry-ref with relationKind, calendar-date, calendar-date-range, name-history, repeating-group, spouse decl). Prevents assumption bugs like the v1.3 tags-as-string crash. Separate deliverable, not a product edit.
- **Ephemeris Bug Audit rows** — BA-01 (trail composition), BA-02 (phase-fraction tooltip copy), BA-04 (reload-canonical) remain unrun. BA-03 N/A. Low priority; none blocking.
- **Parent-delete dangling Descended From** (Glossopoeia) — tolerated, skip-on-dead-pointer. Not blocking.
- **PATCHNOTES.txt format decision** — accumulate per-release vs replace each release. Decide before v1.6 ships so the format is consistent.
- **Concordance size-threshold variant** — the full-graph-for-small-worlds / empty-only-past-N-nodes option was declined for blanket-empty at r134. On record in case it resurfaces.
- **Deferred indefinitely:** Stemma v2 features, world-scoped custom assets (gates Scrap conlang migration), mobile UX, Ephemeris sky-from-surface view.

## v1.6 — Cartographia+ map creator (SHIPPED 2026-10-23)

Per the long-standing plan: the full map-creation feature, ~60–100 hour build, shipped standalone with no competing headline feature. Reset the line at session start (`build_inline.py` VERSION 1.5 -> 1.6, r-counter -> r001). Planning not yet started as of the v1.5 ship.

---

=== ADDED 2026-06-28, v1.6 reshaped to three pillars; maps-promotion pulled to first; line opened ===

**v1.6 line is OPEN.** r000 (`Cartulary_v1.6_Working_r000.html`) is the shipped v1.5 code renamed to the new minor to show status (byte-identical, no r-move). `build_inline.py` `VERSION` bumped 1.5 -> 1.6 this session. Next product code edit is r001.

**v1.6 is now a three-pillar release, not the standalone Cartographia+ creator.** Full architecture and the carve-list live in the frozen `cartulary-modularization-plan.md`; the immediate build sheet is the frozen `maps-promotion-spec.md`. The pillars, in build order:

1. **Maps promotion (FIRST, r001+).** Promote Maps from a hidden built-in template to a `state.cartographia` slice. Monolith work against the shipped baseline, before modularization. Invisible to users if successful. This is the next build.
2. **Modularization.** Pulled forward from its v1.7 slot. The "monolith pain signal" flagged in the v1.7 section below tripped during the back half of Glossopoeia (the heaviest subsystem, edited in a 2 MB+ file). Carve the monolith into per-view + shared modules assembled by `build_inline.py`. Invisible if successful.
3. **Drawing editor (Cartographia+).** The map-creation feature described in the "## v1.6, Cartographia+ map creator" section below; scope and won't-have list unchanged. Built into the now-sliced, now-modular Cartographia. The only user-visible pillar.

**Sequencing.** maps-promotion -> modularization infra -> carve the map-independent modules -> build the editor -> carve Concordance + Cartographia last. Maps-promotion goes absolutely first (Drak: "get maps sorted before we do anything else") because it is the highest-uncertainty change in the release (a live-data migration severing a slice from the entry-graph); doing it against a known-good codebase isolates the risk and makes promoted maps part of the parity baseline the refactor verifies against. The editor and the promotion both touch Cartographia, and the promotion's pin-edge rewire touches Concordance, so those two modules carve last against their final shapes to avoid a re-carve. QA attribution stays at two clean levels: modularization parity (against the existing v1.3/v1.4/v1.5 sheets) vs the new Cartographia view+editor (a fresh test plan, Cartographia QA'd as one workstream).

**Maps-promotion scope (locked).** Sized as the cheap version of a promote-to-view: maps are a graph leaf with outbound-only pin edges and no inbound refs, already isolated from the general entry surfaces. Storage/index mirror Stemma (flat `state.cartographia`, no per-template grouping); the three fields render through `EntryForm` via `cartographiaMapSchema()` (the Glossopoeia pattern); the canvas is unchanged. Multiple maps behave like multiple stemmas (flat, no grouping). Explicit exclusions: no per-map import/export (deferred to the later, larger Cartographia work), no drawing, no carve, no UX redesign. Full detail in `maps-promotion-spec.md`.

**The v1.6 "next active" stub below (and the detailed "## v1.6, Cartographia+ map creator" design section) remain as authored**: the editor scope did not change, only its position in the release sequence. This block supersedes the "Planning not yet started" note in the stub.

**Still owed in v1.6, separate from the three pillars:** the in-app-help backlog (help-vs-code mismatches accumulated during the site-grounding sessions; code correct in every case). Decide whether it rides along with a pillar or gets its own pass before v1.6 ships. *(Resolved at r050: the backlog was already clear in the tree; a targeted read of eight topics fixed six other things.)*

=== ADDED 2026-06-29, v1.6 r001 shipped: pillar 1 (maps promotion) BUILT + browser-verified ===

**Pillar 1 (maps promotion) is done.** r000 -> r001. Built against the frozen `maps-promotion-spec.md` rev 2, in the monolith, against the shipped v1.5 baseline; **browser-verified by Drak (all green, including oldest imports with map data and time-aware pins).** Maps are now first-class records in `state.cartographia` (flat, Stemma-shaped) instead of `kind:"map"` entries. The promotion is invisible to users, which was the acceptance test. Full per-area detail in the changelog session-10 block.

**Pillar status now:**
1. Maps promotion -- **DONE (r001, browser-verified).**
2. Modularization -- **NEXT.** Reinforced this session: the r001 source crossed 2 MB (2,101,533 bytes). The promotion was net-additive (migration + registrant + routing + export slice-walks outweigh the removed `isMap` branches and the old multi-template index), so the monolith pain signal is now past threshold by byte count, not just by feel.
3. Drawing editor (Cartographia+) -- unchanged, last.

**Backlog deltas from r001:**
- **Per-map JSON import/export** -- still deferred to the later, larger Cartographia work; explicitly out of the promotion.
- **Data-shapes reference doc** -- now also needs the Cartographia record shape `{ id, name, tags:[], fields:{}, mapData:{image,pins}, updatedAt }` and the fixed map-field ids (`cart-fld-description` / `cart-fld-scope-region` / `cart-fld-notes`).
- **cartulary.world Cartographia page** -- its copy frames maps as template-backed entries; that framing is now wrong. Not owed until convenient (the in-app behavior is invisible), but flag for the post-feature site sweep alongside the editor.
- **In-app-help backlog** -- the r001 stale-string fixes cleared the map-specific lies (template-kind comment, json-schema help, the "maps are entries/templates" help prose). The rest of the help backlog stands.

**Doctrine added this batch (2026-06-29):** origin-agnostic removal of a retired system-template kind; field-id remap-by-label when literal id preservation is impossible; the canvasSlot generalization for de-coupling a feature from a shared component; the migration runtime-harness practice; invisible-promotion is net-additive.



=== ADDED 2026-06-30, v1.6 pillar 2 phase-1 underway: spine manifest + relief sizing + gathers (r002, r003) ===

**Pillar 2 (modularization) phase-1 started.** No carve yet. This session produced the architecture artifact the carves run against and did the pre-carve relocation passes. Two product cuts (r002, r003), both pure relocation, both browser-verified.

**Pillar status now:**
1. Maps promotion -- DONE (r001, browser-verified).
2. Modularization -- **IN PROGRESS (phase-1).** Spine manifest authored; boundary decisions locked; spine sized to relief; gather relocations done and verified. Build-pipeline rework + gate tooling next, then the carves.
3. Drawing editor (Cartographia+) -- unchanged, last.

**What phase-1 produced:**
- **Spine manifest** (`cartulary-spine-manifest.md`, NEW): the module map, grounded in the actual r001 source (39,336-line babel body, 419 declarations). It is the oracle both modularization gates check against, updated in the same pass as every split/combine. This is the live architecture reference; it supersedes the frozen plan's "decide at carve time" placeholders.
- **Spine sized to relief** (Drak: minimize the spine, more smaller modules beat fewer large ones for AI-assisted editing): old ~12,800-line spine reduced to a ~6,000-line core. `migrate` (5,511) became a load-on-demand companion; `HOME_SECTIONS` (1,328) became a `home-data` module; `App` (4,532) stays core with its hooks-extraction deferred to a separate risk tier.
- **Gathers resolved** (r002 + r003): five scattered modules made into contiguous decl runs so each carve is a clean slice (calendar-engine, export-layer, persistence, cartographia at r002; entry-ops folded into field-system and io-utils stood up standalone at r003). Two ownership questions closed by caller-trace: the "stemma" calendar helpers are calendar-engine, and the pre-`App` orphan block split cleanly into io-utils (own module) + entry-ops (field-system).

**Backlog deltas:**
- **App hooks-extraction** -- new deferred item. The core is ~75% `App`; shrinking it further needs a behavior-preserving refactor that the invisible-carve gate cannot verify byte-for-byte. Out of phase-1; revisit after the clean carves land and parity is established.
- **io-utils / entry-ops micro-gather** -- resolved at r003 (was surfaced and held at r002).
- **Glossopoeia-as-directory** -- a derived decision this session (not in the frozen plan's three boundary calls); vetoable before the carve reaches it.

**Doctrine added this batch (2026-06-30):** spine manifest as step-1 oracle; spine-relief sizing (companion for load-once-central functions, data-module for static content behind a sole consumer); module ownership by caller-trace; gather discipline (pure relocation to contiguous runs, normalized-diff + parse + browser, hand-verified eval-order); data-consolidation vs code-layout-consolidation.





=== ADDED 2026-06-30 (session 12, v1.6 pillar 2 phase-1: build pipeline + gate tooling landed, first three carves) ===

**Pillar 2 (modularization) infra is built and the carves have started.** The pipeline rework and the reconstitution gate landed; three shared/data modules are carved and browser-verified. Three product cuts (r004, r005, r006).

**Pillar status now:**
1. Maps promotion -- DONE (r001, browser-verified).
2. Modularization -- **IN PROGRESS.** Phase-1 infra done (pipeline assembles from a module tree; canonicalizer + reconstitution gate built and proven). Carving underway: home-data (r004), modals (r005), io-utils (r006) done. Remaining shared modules, then map-independent views, then concordance/cartographia last.
3. Drawing editor (Cartographia+) -- unchanged, last.

**What landed:**
- **Build pipeline reworked.** Source is no longer one HTML; it's `cartulary-src/shell.html` + `cartulary-src/modules/NN_name.jsx` (assembly-order prefix + module name), assembled by ordered concatenation. `build_inline.py` gained `working` / `verify` / `finals` modes; `canonicalize.py` (new) is the reconstitution-gate normal form. Frozen `reference-r003-body.jsx` is the parity anchor.
- **First three carves, all pure splits, all browser-verified.** home-data (`HOME_SECTIONS` behind `HomeView`), modals (the three destructive-op dialogs), io-utils (the four FSAA helpers). Each reassembles to r003 byte-for-byte; the carve is invisible at the byte level.

**r-counter policy changed:** one r-bump per full carve, not per HTML edit. A pure carve produces byte-identical output, so the old rule would never advance through modularization. r004 = pipeline rework + home-data; r005 = modals; r006 = io-utils.

**Backlog deltas:**
- **First-step context-completeness gate** -- not built; lower-priority until editing goes module-scoped. The end-step reconstitution gate is what the carves run against for now.
- **App hooks-extraction** -- still deferred (separate risk tier, post-clean-carves).

**Doctrine added this batch (2026-06-30, session 12):** ordered-concatenation assembly (not dependency resolution); shell + module-tree source split; one r-bump per full carve; the two gate normal forms (sequence for splits, multiset for gathers) against a frozen anchor; carve boundary discipline; prove a gate has teeth with a negative test; validate a pipeline against a real split; bare-trunk residue naming.

=== ADDED 2026-07-03 (session 13, v1.6 pillar 2: four more carves, gather-free shared set complete) ===

**Pillar 2 (modularization) progress.** Four pure-split carves (r007-r010): temporal, persistence, calendar-engine, export-layer. All browser-verified. The tree is now 13 arcs and the whole gather-free shared-module set is carved. No behavior change (pure splits, byte-identical output through r003-r010).

Pillar status unchanged in shape:
1. Maps promotion -- DONE (r001, browser-verified).
2. Modularization -- **IN PROGRESS.** Infra done. Carved: home-data (r004), modals (r005), io-utils (r006), temporal (r007), persistence (r008), calendar-engine (r009), export-layer (r010). Remaining shared modules each need a gather or relocation cut first (`builtin-templates` scattered, `field-system` two base zones, `form-engine/edit` + `template-builder` builder-component relocation, `migrate` companion tail check), then map-independent views, then concordance/cartographia last.
3. Drawing editor (Cartographia+) -- pending pillar 2.

**What changed the remaining work.** The easy carves are spent. Everything left in the shared tier needs a pure-relocation gather before it slices, so the per-carve cost goes up from here (a gather cut, then the carve, two verified steps instead of one). Not a fire, just the expected shape once the pre-gathered set is exhausted.

**Manifest hygiene note (carried into doctrine).** The section-4 ownership table had gone stale against section 10 (pre-r002 "gather on carve" flags on modules already gathered). Corrected in place this session. The lesson: adding an authoritative section does not retire a stale note elsewhere in the same file; strike the stale text where it lives.

=== ADDED 2026-07-15 (session 14, v1.6 pillar 2: two more carves, free-split set exhausted, carve path settled) ===

**Pillar 2 (modularization) progress.** Two pure-split carves (r011 template-builder, r012 migrate), both browser-verified. Both were free (no gather needed), which contradicts last session's "everything left needs a gather." Tree now 16 arcs. No behavior change (byte-identical output through r003-r012).

Pillar status unchanged in shape:
1. Maps promotion -- DONE (r001, browser-verified).
2. Modularization -- **IN PROGRESS.** Infra done. Carved: home-data (r004), modals (r005), io-utils (r006), temporal (r007), persistence (r008), calendar-engine (r009), export-layer (r010), template-builder (r011), migrate (r012). Every zero-gather target in the shared/companion tier is now spent. Remaining shared work is three gathers (form-engine display/edit as one cut, builtin-templates, field-system), then map-independent views, then concordance/cartographia last.
3. Drawing editor (Cartographia+) -- pending pillar 2.

**What changed the plan.** The remaining shared carves were mapped end-to-end this session and priced honestly:
- Two targets the manifest flagged as gather-first turned out free (template-builder, migrate). Their manifest flags were stale and have been struck at source.
- One target the manifest flagged as probably-free turned out split (form-engine/display: two members stranded in the edit block). Its "likely contiguous" note was wrong and is corrected.
- Net: three real gathers remain, not the four-plus implied before. The display/edit pair collapses to one gather that frees both modules.

**Carve path (settled).** Free splits done. Then, in order: display/edit gather -> carve display + edit; builtin-templates gather -> carve; field-system gather -> carve; map-independent views; concordance + cartographia last. Each gather rotates the parity anchor (re-freeze `reference-r0NN-body.jsx`, repoint `REFERENCE_BODY`); the display/edit gather is the first rotation since r003. Rejected the single-big-relayout shortcut: fewer anchor rotations but no bisectability if a browser check fails.

**Backlog deltas:** none new. App hooks-extraction still deferred (separate risk tier). First-step context-completeness gate still not built (lower-priority until editing goes module-scoped).

**Doctrine added this batch (2026-07-15, session 14):** manifest flags are stale until re-checked by name (a flag from an old range survives real gathers and lies in both directions -- template-builder/migrate were flagged gather-first but were free, form-engine/display was flagged free but is split); one gather can free two carves when the scattered members interleave (display stragglers in the edit block); assembly-order inversion is safe for runtime-only const-arrow callees (makeInitialState -> migrate); sequence the remaining work as gather-episodes with per-cut re-anchoring rather than one grand relayout.

=== ADDED 2026-09-05 (session 15, v1.6 pillar 2: three gathers + four carves, shared/companion tier COMPLETE) ===

**Pillar 2 (modularization) progress.** Seven r-bumps (r013-r019), all browser-verified: three gather episodes (r013 display/edit, r016 builtin-templates, r018 field-system) and four pure-split carves (r014 display, r015 edit, r017 builtin-templates, r019 field-system). **The entire shared/companion tier is now carved.** Tree is 21 arcs: 13 named modules + 8 trunk residue. No behavior change. The parity anchor rotated three times, the first rotations since r003; active anchor is `reference-r018-body.jsx`.

Pillar status:
1. Maps promotion -- DONE (r001, browser-verified).
2. Modularization -- **IN PROGRESS, shared tier done.** Infra done. All 13 shared/companion/data modules carved (r004-r019). Remaining: map-independent views, then concordance + cartographia last (after pillar 3).
3. Drawing editor (Cartographia+) -- pending pillar 2.

**What the three gathers cost, versus the estimate.** The session-14 plan called for three relocation cuts and three anchor rotations, and that held. Two surprises, neither expensive:
- The display/edit split point is `ImageFieldEditor`, not `EntryForm`. Caught before cutting; no rework.
- field-system's zone A was internally split as well as separated from zone B, so r018 was TWO relocations in one cut rather than one. Surfaced before cutting, Drak picked the placement (grid constants move up, spine ownership preserved).

**Next phase: map-independent views.** `glossopoeia/`, `ephemeris/`, `chronometric`, `linea`, `stemma`, `kalendarium`. Two things to settle BEFORE that phase starts, neither urgent:
- Contiguity is unchecked for all six. Expect most to be contiguous (views tend to be written as blocks) but that is exactly the assumption that was wrong for form-engine/display. Budget for a gather on any of them.
- `glossopoeia/` and `ephemeris/` are proposed as DIRECTORIES rather than single modules. That proposal is vetoable and should be settled before the carve, not mid-cut, since it changes the slice shape. Drak's call.

**Backlog deltas:** one new optional item, non-blocking. The r017 carve left a 42-line residue arc holding only the util wedge (`genId`, `fmtDate`, `isoNow`, `slugify`, and the two snapshot formatters). Correct as anonymous residue; a clean pure split if a named `utils` module is ever wanted. Not scheduled.

**Doctrine added this batch (2026-09-05, session 15):** byte-identity is a distinct check that catches what canonical-sequence cannot (the r014 dropped-blank); a gather's anchor freeze must wait for the browser pass; scattered-module surveys understate the work when a zone is internally split; carved-module filenames go stale as `NN` prefixes reflow, so find modules by name and sweep filename references on every doc pass.


=== ADDED 2026-09-05 (session 16, v1.6 pillar 2: r020-r024, first directory carves, gate bug fixed) ===

**Pillar 2 (modularization) progress.** Five r-bumps (r020-r024): three gather episodes (r020 ephemeris three-zone unify, r021 ephemeris sub-modules, r022 glossopoeia sub-modules) and two directory carves (r023 glossopoeia, r024 ephemeris). The first two VIEW modules are on the board, and both are real subdirectories rather than single files. Tree is 34 files, 39,335 lines. No behavior change: the two carves emit bytes identical to r022. The anchor rotated three more times; active anchor is `reference-r022-body.jsx`, the sixth.

**Pillar status now:**
1. Maps promotion -- DONE (r001, browser-verified).
2. Modularization -- **IN PROGRESS, shared tier done, view phase started.** All 13 shared/companion/data modules carved (r004-r019), plus `glossopoeia/` (r023, 5 parts) and `ephemeris/` (r024, 7 parts). Remaining map-independent views: `chronometric`, `linea`, `stemma`, `kalendarium`, all four confirmed contiguous, all four pure splits, no gathers owed anywhere in the phase. Then concordance + cartographia last, after pillar 3.
3. Drawing editor (Cartographia+) -- pending pillar 2.

**Contiguity for the entire map-independent phase is now settled**, which had been carried as an open unknown since session 15. One pass classifying every declaration in the trunk arc answered all six views at once plus the two held-for-last ones. Five were already contiguous; ephemeris was in three zones and needed a gather, then needed a second gather because its intended sub-modules were interleaved with each other.

**Gate defect found and fixed.** The reconstitution gate had been scoring its verdict from two of its three checks since r004, excluding byte-identity, which is the only one that can see a dropped blank line. It therefore reported GREEN on the exact combination the doctrine calls a RED. Nothing slipped through, but the safety net had a hole for twenty r-numbers. Fixed and re-proven at r023. See doctrine, this batch.

**Backlog deltas:**
- **In-app help / user-visible em dashes.** The em-dash audit this session counted 283 U+2014 in `17_home-data` (now `20_home-data`), which is in-app help content the user reads. Not a defect and not scheduled; recorded so the number is known if a copy pass ever happens.
- **Named `utils` module** -- unchanged, still optional, still the 43-line `02_trunk` residue arc.
- **Data-shapes reference doc** -- unchanged, still owed.
- **`/mnt/project/` re-sync** -- genuinely owed now. `build_inline.py` there is two anchor generations and one structural change behind (it names the long-retired `reference-r003-body.jsx` [stale: deliberate, describing the stale project copy] and has the flat `glob` enumeration plus the unfixed gate verdict).

**Doctrine added this batch (2026-09-05, session 16):** a printed-but-unscored gate check is worse than no check, and teeth must be re-proven after any gate or assembler change; a contiguous view says nothing about whether its sub-modules are contiguous; sub-module groupings are proposals and content overrules tidiness; boundary rule 5, doc comments can sit behind a blank line and defeat a walk-back, so read the seams before slicing; a pure split that changes no product bytes needs no browser pass but a gather always does; prefer the smaller relocation except where it costs a TDZ argument; write the assembly ordering rule down explicitly and keep exactly one assembly path; an audit that only checks the artifact is half an audit.

=== ADDED 2026-09-05 (session 16 post-turnover audit: r025 header integrity becomes the next work) ===

**The next modularization work is NOT a carve.** An audit of the r024 bundle found twelve sheared section headers across the module tree [thirteen as first counted; corrected in the second-pass block below]: headers labelling a block that lives elsewhere. Nothing behavioral. The problem is that the carve procedure treats seam lines as ground truth, and at those thirteen seams the evidence is wrong. The mechanism is live rather than inherited: the r013 gather created one of them and nothing noticed.

**r025, two parts, part 1 first.**
1. Add `header_pairs()` to `canonicalize.py` as a fourth gate invariant. Hard gate on pure splits, reported-diff on gathers. A sheared header is invisible to all three existing checks by construction.
2. A comment-only sweep gather resolving all twelve, giving the invariant a clean baseline. Ten have a determined destination; two need a decision rather than a move. [Corrected 2026-09-05 second pass: the census is twelve, not thirteen; `10_migrate:5803` was wrongly accused.]

Then the four remaining map-independent view carves. Two of them are entangled with r025. [Corrected 2026-09-05: the original wording here said chronometric "inherits" the orphan, which is backwards.] The 25-line orphaned Ephemeris header at `16_trunk` 2055-2079 sits ABOVE the chronometric span (2080-3605), so carving first leaves it in the HEAD arc and makes that arc end on line 2079, a comment, producing a third file that ends on a comment. Kalendarium carved first leaves a TWO-line trunk arc (boundary blank plus the next module's header), not one line; a one-line arc would require kalendarium to end on a blank, which rule 1 forbids.

**Pillar status is unchanged** (1 done, 2 in progress with 15 modules carved, 3 pending). r025 is a correctness pass inside pillar 2, not new scope.

**Doctrine added this batch:** a section header is a separate block and does not travel with a relocation, so every relocation must decide explicitly whether it goes; and when an audit finds N instances of a defect, build the check that would have caught the first one before fixing the N, or the count regrows.

=== ADDED 2026-09-05 (session 16 second-pass audit: r025 scope corrected) ===

**The census is twelve, not thirteen.** `10_migrate:5803` "Marked configuration" correctly heads a live `marked.use({...})` block; it read as a shear only because the census tool pairs headers with the next top-level declaration and a call expression is not one. The proposed remedy had included deleting it.

**r025 part 1 gained three specification requirements**, all of which decide the baseline count and none of which can be left to whoever writes the regex: which comment forms count as headers (the old census of 64 was itself regex drift: it required dashes on both sides at column 0 and dropped two real headers. Under one stated rule the tree holds 108 header-shaped comments, 66 of them column-0 box-drawing, and the shear census is twelve of those 66), how call-block headers are handled, and the fact that file placement is out of scope because the gate runs on the assembled body. One of the twelve, `19_trunk:878`, pairs correctly in assembled order and is a file-placement defect the invariant structurally cannot see, so part 1 cannot validate part 2's fix for that item.

**Carve spans corrected again, in the opposite direction.** Rule-1 conformant and tiling both arcs exactly: chronometric `16_trunk` 2080-3605 (1,526), linea 3606-4251 (646), stemma 4252-5661 (1,410), kalendarium `19_trunk` 1-876 (876). Residue in `16_trunk` after all three is 2,433.

**Doctrine added this batch:** a hedge in a spec document is usually a defect in disguise, so when a document hedges a number ask whether a rule already determines it; do not accuse a correct artifact during a defect sweep, because a sweep's tool defines what it can see; and state an invariant's scope limit at the same time as the invariant, since a check whose coverage gap is undocumented is read as covering everything it is named after.

=== ADDED 2026-09-06 (session 17, v1.6 pillar 2: r025 header integrity closed, r026 specced) ===

**Header integrity is closed.** r025 landed as one r-bump in two parts: the invariant first, then the sweep. Eleven sheared section headers went to the blocks they name; two new gate checks (`header pairs`, `header placement`) stop the next one accumulating. The gate now scores five conditions on a pure split and four on a gather.

**Next: r026, then the four view carves.** r026 replaces one header with two, because the block it named split across two modules at r013. It is specced in manifest section 11 with its expected signals written down in advance, and it needs the two replacement strings locked before it runs. It cannot return a green verdict from either gate mode, which is stated rather than discovered.

**Then chronometric, linea, stemma, kalendarium.** All four pure splits, all four confirmed contiguous, no gathers owed. Both prior entanglements are gone: the `16_trunk` head arc ends on code, and `19_trunk` is kalendarium end to end. Spans re-derived post-r025 and published in the handoff and manifest section 11.

**Then pillar 3, the drawing editor**, and `concordance` + `cartographia` carved last against their final shapes.

**New roadmap item, small.** Pillar 3 is entirely content edits rather than relocations or splits, and r026 is the first taste: neither `verify` nor `gather` can return a verdict on a cut that adds or changes lines on purpose. Whether that earns a third mode is a pillar-3 planning question, not an r026 one, but it should be decided before the editor work starts rather than during it.

**Deferred unchanged:** `App` hooks-extraction, the first-step context-completeness gate, a named `utils` module for the 43-line `02_trunk` residue.


=== ADDED 2026-10-19 (session 18, v1.6 pillar 2: r026-r030, map-independent phase COMPLETE; pillar 3 is next) ===

**Pillar 2's map-independent phase is closed.** r026 replaced the last sheared header with two correct ones and rotated the anchor to `reference-r026-body.jsx`. r027-r030 carved stemma, linea, chronometric, and kalendarium as pure splits against it, all byte-identical to the r026 artifact. Nineteen named modules; what remains in the trunk arcs is residue plus the two carves held for last.

**Next: pillar 3, the drawing editor (Cartographia+).** The v1 scope and the won't-have list above are still the plan. Cartographia is a single contiguous run of 758 lines at the tail of `16_trunk` (span and tiling in the handoff and manifest section 10), behind concordance and `SettingsView`; the editor builds into that run. **First decision, before any editor code lands: the verification mode for content edits.** r026 proved the point at three lines. Neither `verify` nor `gather` can return a verdict on a cut that adds or changes lines on purpose, so it was gated on a written delta table matching the `gather` report line for line, plus parse and a browser pass. A feature cannot be gated that way. The candidates are a third mode that checks what a content edit must preserve (every declaration name, every header pair, every file's rule-1 shape, the raw count outside the edited span) and reports the edited span as a diff, or dropping the parity gate for pillar 3 and leaning on parse plus browser passes the way v1.5 did. Drak's call; the trade is tooling time against the only pillar whose bugs a user would see.

**Then concordance and cartographia carve last**, against their final shapes, and pillar 2 closes. Each is a pure split today (1,028 and 758 lines); the editor will change cartographia's figures and may change the seam, so the spans get re-derived at that point rather than trusted.

**Tooling carried into pillar 3.** The source bundle is the only durable copy of the tree between sessions, and session 18 showed it can be the only durable copy within one: the sandbox was wiped between two turns, and the state came back because every cut was a script and the artifact hash said when the replay was right. Keep every change a script, re-bundle before any pause, and treat the rotation procedure's last step as the recovery check.

**Deferred unchanged:** `App` hooks-extraction, the first-step context-completeness gate, a named `utils` module for the 43-line `02_trunk` residue. **Doc debt unchanged:** the doctrine's v1.4 feature-surface section.

=== ADDED 2026-10-19 (session 19: verification mode for content edits DECIDED and BUILT; source and docs in GitHub; pillar 3 next) ===

**The open tooling question from session 18 is closed.** Drak chose the scoped-edit mode over the r026 procedure and over dropping the parity gate for pillar 3. It is built, probed (eighteen probes), and in the repository; the content-cut procedure is in the handoff. Pillar 3 can start.

**The project lives in `github.com/Drakhanas/Cartulary` (public since the v1.6 ship on 2026-10-23; private before).** Cold start is a clone; turnover is a commit; CI runs every gate on every push. The bundle zips, the turnover zips, and the Project's per-session documents are gone. Drak clones locally at `D:\Git\_Cartulary` and pushes tags from there.

**Pillar 3, the drawing editor (Cartographia+), is under way.** The v1 scope and won't-have list above are unchanged except for layers (below). The build order is the build sheet; cuts go under the edit procedure, each browser-passed and rotated with `freeze`. Expect the editor to touch `16_trunk` (cartographia), `12_trunk` (App routing and handlers), `08_export-layer` (SVG in exports), `10_migrate` (any new `mapData` shape), `26_home-data` (help), and `shell.html` (CSS); every one of those is a declared scope on the cut that touches it.

**Build sheet locked (session 19, after proposal-review): `docs/cartographia-plus-spec.md`.** Eight cuts with declared scope, the data model, the one-renderer rule, the stamp-pack sanitizer, and one recorded scope change: layers (named, ordered, show/hide, lock; nothing more) are in, overriding the v1 won't-have list above. **Cuts 1-3 landed, browser-passed 2026-10-20: the data model at r031, the SVG canvas (one tree, two serializers; image-less maps on their background; the export through the same renderer) at r032, and the drawing tools at r033 (a strip with Pin as the default tool; Select, Rect, Ellipse, Polygon, Line; palette, width, Smooth; right-click to finish; point handles on polygons and lines; the canvas picker with a warning)**, text labels, undo/redo over the whole record (pins included, overriding the sheet by decision), and the layer panel at r034, and at r035 the four built-in stamps, the frame handles (corners on rect, ellipse, and stamp; a knob on stamp and text), labels on an arc, and from the pass the canvas chrome (the resize grip to 150%, no inner scrolling unzoomed with the strip sticky, Custom size), and at r036 stamp packs (the envelope with ids namespaced by pack, the sanitizer on import with a report and again on load, the Stamps panel at the head of the index with Export per pack and Export built-ins as a pack, the grid picker, placeholders for missing stamps, the help, and the Project view no longer reading a maps-only world as empty), and at r037 the per-map download (SVG standalone with the image inlined, stamps resolved, no pins, the map font embedded; PNG at 2x capped at sixteen million pixels)**; and at r038 cut 8, the help and the site (the Cartographia help section rewritten around the editor as shipped, the stale lines elsewhere in the help fixed, the index's lead sentence, and cartulary.world's Cartographia, Import & Export, and JSON Structure panels rewritten for v1.6 under `site/`, ahead of the live v1.5 site until launch). The locked sheet's eight cuts are done. Point handles came in at r033 on Drak's review; the arc deformer at r035 on his reply to the forks; namespaced stamp ids in place of a collision modal at r036 on his.

**Scope change, 2026-10-22 (the second recorded one, after layers): raster brushes go into v1.6.** Reading the new Limitations paragraph ("no freehand brush"), Drak judged freehand with brush support "massively wanted" and, after the costs were laid out, decided: raster brushes, in this line (he wrote 1.9 first and corrected it to 1.6); **no pressure support**, not within any scope he will support currently; tip-level import of existing brush packs, `.abr` as the primary target because brush sites distribute in it (the free fantasy-map sets ship as a Photoshop ABR plus a PNG pack for Wonderdraft), PNG as the native pack format, `.gbr`/`.gih` and Procreate `.brushset` behind, tips and spacing only, dynamics never; the SVG download becomes a mixed file with raster layers and raster tips as `<image>` rather than going away (he was willing to lose it; he does not have to). Estimated at seven to eight cuts: tip import and raster stamps (two; the downloaded brush sets are mostly symbols, so this half is where they land and it leaves the one-renderer rule untouched), a `vector`/`raster` layer kind with the migration (one to two), the paint engine with Brush and Eraser and bitmap undo (two), vector freehand as a drag-drawn Line with simplification (one, optional), help and site again (one). Answered the same day, every recommendation taken: both halves in 1.6, stamps-and-import first; vector freehand in; and, by research on what the tools accept (map tools take PNG only, art apps converge on `.abr` and import tips only), importers for PNG, `.abr`, `.gbr`/`.gih`, and Procreate packs, with a PNG-zip export in the Wonderdraft layout so Cartulary is the converter in the middle. The won't-have list's first line ("Freehand brush tools") is struck for v1.6; the amendment is section 9 of the build sheet. **Landed: cut 9 at r039** (Freehand as its own tool, a drag simplified into an ordinary stroke; and from the pass a width slider, 1-32 with a field to 64, in place of the three widths) **and cut 10 at r040** (the bucket fill, Drak's ask on the r039 pass, inserted ahead of the amendment's cuts, which renumber 11-15: a Fill tool that traces the enclosed area off-screen into a `region` shape with holes, seals gaps up to ten trace pixels, and places the fill just above the painted shape under the click; four revisions on the pass, among them the trace svg's intrinsic size, without which Brave drew it blank) **and cut 11 at r041** (raster tips: a stamp may be a PNG, tinted by the Fill or placed as is, imported as a `.json` pack, PNG files, or a zip in the Wonderdraft layout with its symbols file honored, drawn once per map as a symbol with a use per placement; and from the pass, with an official Wonderdraft pack, a fix to r036's forty-character cap on stored stamp ids, which had folded 484 stamps onto two). **And cut 12 at r042** (the importers: Photoshop `.abr`, GIMP `.gbr` and `.gih`, Procreate `.brush` and `.brushset`, and a zip holding any of them, every tip landing as a stamp; a pack or the built-ins written out as a PNG zip in the Wonderdraft layout; from the pass, the wording that says where brushes import and the zip walker that takes a set's download as it is). **And cut 13 at r043** (raster layers: a layer `kind`, a raster layer one bitmap with the canvas units it covers, stored like a map image, drawn as one `<image>` in stack order so the export, the downloads, and the fill carry it; Add raster layer, Load image scaled to the canvas width and capped at 4096, Clear; the shape tools refusing on it). **And cut 14 at r044** (the paint engine: Brush and Eraser laying dabs of a built-in or imported tip along the pointer's path, composited at the stroke's opacity onto the active raster layer, a Paint layer inserted above a vector one by the first stroke, a live stroke on a canvas over the svg, storage shared with Load image with the history rewriting folder files on undo, a byte cap; and pointer events throughout the editor, so a pen or a finger draws, paints, selects, and drags). **And cut 15 at r045** (zoom and pan: a camera over the svg's viewBox, 1x to 8x, Ctrl+wheel about the pointer, a pinch, the keys and a corner bar; a Pan tool, Space, the middle button, two fingers; the wheel and the keys waiting mid-gesture; handles at screen size; the view on the same camera). **And cut 16 at r046** (editor polish: the strip as named groups in rows with the style groups dimmed rather than removed, the layout editable in an Arrange modal and kept in the app's preferences; Done and Cancel for an open draft; the picker's filter and Import, the import flow shared; one letter per tool, arrow nudging; swatch labels and a live region; the pen's eraser end; Cancel putting the folder back; a reload error fixed). **And cut 17 at r047** (help and the site, again: the help's one Cartographia topic split into Cartographia, Map Editor, and Stamps & Brushes, describing the editor as it stands; the schema's raster shapes; five lines elsewhere; the site's panel a hub with two sub-panels). **The amendment is complete and so is pillar 3.** The two carves followed the same day: cartographia at r048 (`18_cartographia/`, five parts at its section headers) and concordance at r049 (`17_concordance`), both pure splits, byte-identical, no browser pass. **Pillar 2's carve list is complete; `App` hooks-extraction stays deferred.** Release prep, in Drak's order (2026-10-22): the help read at r050 (DONE; the v1.5 in-app-help backlog was already clear; eight topics read, six fixed), the release notes (DONE; one file per version in `docs/release-notes/`, accumulating; `Cartulary_v1.6_PatchNotes.txt`), the dual-build finals with Drak's pass on the precompiled build by checklist plus the headless probes run against it (DONE at r050; rebuilt and re-passed on the download path at r051), the public copy (DONE; `docs/release-notes/v1.6/`: the itch page and the devlog in the live pages' HTML, the zip README, and the repository README), and r051 (DONE; the application's one network request, the download's font fetch, cut; zero is the rule). Remaining: the flip (the itch upload with page and devlog, the site deploy, the repository public with issues after the `docs/` decision, the `v1.6` tag) and the ship turnover. **Amended after cut 13, on Drak's ask:** seven usability findings on the editor folded into the table rather than deferred: pointer events into cut 14, zoom and pan as cut 15, an editor-polish cut 16 (a Done button, fixed strip slots, a picker filter, import from the picker, keyboard shortcuts and nudging, swatch labels, a live region), help and site moving to 17. The two carves waited for pillar 3's final shape, which r047 completed; they landed at r048 and r049.

**Then concordance and cartographia carve last**, against their final shapes, and pillar 2 closes.

**Follow-ups opened this session, none blocking:** master `journal.txt` into `docs/` with a checker change; the `cartulary-turnover` skill package refreshed to point at `tools/turnover/`; the v1.4 patch notes and the itch README into `docs/release-notes/`; tag pushes from Drak's clone.

**Deferred unchanged:** `App` hooks-extraction, the first-step context-completeness gate, a named `utils` module for the 43-line `02_trunk` residue. **Doc debt unchanged:** the doctrine's v1.4 feature-surface section.

=== ADDED 2026-10-23 (session 19: v1.6 SHIPPED; line closed at r051) ===

**v1.6 shipped 2026-10-23 from the r051 tree:** maps as records (pillar 1, r001), the module tree (pillar 2, r002-r030 and the two carves r048-r049), the map editor with painting, stamps, and brush packs (pillar 3 and its amendment, r031-r047), the help and the site read against the app (r038, r047, r050), the download's font from the file itself (r051). Finals `Cartulary_v1.6.html` sha256 `b99381a041153d9d` and `Cartulary_v1.6_Readable.html` sha256 `e748142eadb3e1aa`, regenerable from the tagged tree. On itch with the rewritten page and the devlog; the repository public with issues enabled, cartulary.world deployed, the live file byte-identical to `main`'s.

**Nothing else is owed on v1.6.** `App` hooks-extraction stays deferred (its own risk tier); the optional `utils` split of `02_trunk` stays optional. Known and accepted at ship: no pen pressure, the palette of eight, no grid or snapping beyond the knob's Shift snap, the Readable build's slower start.

**The v1.7 line opens with the `VERSION` bump in `build_inline.py`** (r-counter to r001, `changelog.md` frozen to `changelog-v1.6.md`, a fresh one started). What goes in it is Drak's call, from the post-v1.5 backlog carried above, the post-pillar backlog in the handoff, and whatever the v1.6 release teaches. Carry forward from release prep: `docs/cartulary-build.md` is stale throughout (it describes the single-file workflow from before modularization) and sits in a public repository; delete it or rewrite it against `inlining/build_inline.py`'s docstring and the README. Screenshots for the itch page were not refreshed for v1.6.

---

## v1.7 record (SHIPPED 2026-11-02, line closed at r059)

> Moved verbatim from `roadmap.md` at v1.7's close, as it stood at `346bb63`: the v1.7 section (its rows, Pipes' ten items checked against the tree, and the document-debt item), then every dated block from the roadmap's cut-back after the v1.6 ship (2026-10-23) to v1.7's ship (2026-11-02). The v1.8 section and the standing backlog stayed in `roadmap.md`.

## v1.7: the Letters and Pipes update

Named by Drak on 2026-10-23. Open from 2026-10-24 (`VERSION` in `inlining/build_inline.py` reads `'1.7'`) to the ship, 2026-11-02, with r001 through r059 in.

- **The data-loss bug went to a patch, v1.6.1** (Drak, 2026-10-23). `migrate()` kept an entry-ref value only if it was an entry's id, so references to astronomical bodies, Glossopoeia records, and maps vanished from top-level fields with a target list at every load, import, and snapshot restore; it shipped in v1.5 and v1.6 (`docs/entry-ref-audit.md`). v1.6.1's r052 keeps such a reference when its source is among the field's targets, and v1.6.1 shipped with it the same day. **What it left for v1.7:** a world upgraded from v1.4 lost these references at the upgrade, because the v1.5 conversion left its fields listing the retired Astronomical Body template's id, which the cleanup didn't recognize, and those fields stopped offering bodies at all, since they listed the dead id instead of the body source; the template builder can't show a target that no longer exists, so it ticked their other targets alone (Drak's own world, begun in v1.4 or earlier, had Location › Parent that way, found at r003's pass); and the template builder offered Map as a reference target though the registry marked maps not eligible, so the call was whether to stop offering it or to make it eligible on purpose. **Drak's call (2026-10-24): eligible on purpose**, so maps appear in the reference pickers the builder already points at. Maps went in at r003. **The v1.4 path: done in r004** (Drak's calls, 2026-10-24; passed 2026-10-25). The conversion retargets the fields now, and a once-per-world repair gives every field an earlier upgrade left listing the retired template, built-in or user-made, the body source in its place. With it went a leftover found reading the code at r002, the v1.5 Language / Glossary supersede's multi-target id lists set to null, which took any template until a resolve ran, and the dead map-template ids v1.6's map promotion left the same way as the conversion, found during the cut and folded in at Drak's call. References a load already deleted don't come back; two edges the repair can't reach are under Tolerated.
- **Entry-ref targets: done in r002** (2026-10-24). Flags 1 to 5 of `docs/entry-ref-audit.md` went in as one cut, in the built-in definitions and by a once-per-world migration that only adds targets; 6 is skipped because it would rewrite stored values, and 7 and 8 as low value. Planning the cut found the template builder's target edits undone whenever `resolveTemplateRefs` ran, with `migrate()`'s cleanup then deleting the references to a target that had dropped out; r002 fixed that first (Drak's call), since a migration that re-resolved the world would have set it off in every world with a customized built-in field.
- **References to records that aren't entries display: done in r003** (2026-10-24). They showed "(missing entry)" (found 2026-10-24, shown headless on r001's build). The entry view resolves a reference among entries and bodies only, so a ConLang in the built-in language fields, any other Glossopoeia record, and any map show "(missing entry)"; the HTML export resolves among entries only, so bodies do too, and from the code the Markdown exports share its lookup. It has shipped since v1.5, and the stored values are fine. r003 (Drak's calls, 2026-10-24) fixed the entry view, group subfields, grids, both exports, and Concordance's hover pane, which dropped them; a map reference links to the map's article in the HTML export; a Glossopoeia reference is a plain chip that links nowhere yet, since a way into Glossopoeia would be a feature of its own; maps are eligible targets; and deleting a map counts the references to it and removes them, as deleting a body does.
- **Letters: everything but the writing** (Drak, 2026-10-23). A new view beside Linea, Stemma, Kalendarium, and the rest, for planning a story down to its scenes and their beats; the writing itself happens elsewhere. Plot Thread and Theme / Motif leave the general template list for the view and stay entries (Drak's call), so wiki-links, Chronometric, search, Concordance, and the exports keep reading them: promoting them the way maps went would have broken all of those, and retiring their template ids would have repeated the v1.4 upgrade bug. The view's own records point outward at entries, the cheap kind of promotion: each story's setting specifics (the why, the genre, POV and tense, the setting), a cast of story-oriented records each linked to a Character entry (a role such as protagonist, antagonist, deuteragonist, tritagonist, or confidant; voice; beliefs and ideals, with a link to Religion / Belief System), and scenes with beats and a notes block for what the author is thinking, never a draft. The models are Reedsy's writing guides and templates and Savannah Gilbo's First Draft Roadmap. The view is **Fabula** (Drak, locked 2026-10-23). Drak accepted a first breakdown the same night: a story record with four panels (premise, genre, narration, setting) and record types for cast, arcs, relationships, plot points, promises and payoffs, parts, chapters, scenes, and research notes, beside Plot Thread and Theme / Motif. A world holds several stories, grouped into a **Corpus** (Drak: the word covers works set in the same world that aren't linked, too), and Fabula gets a timeline of its own for one story or a whole corpus, kept apart from Chronometric. The draft spec, with every record type's fields, the structures, the timeline, and the decisions made and still open, is `docs/fabula-spec.md`. Its field lists are settled (Drak, 2026-10-25), reviewed one table per message in his table format (one line per field, `otherTextField` named in the Type column, the half-eligible types noted); the spec's section 1 says what the review changed. Fabula's first cut is in: r006 laid down `state.fabula` and the seeded schemas, with nothing on screen (2026-10-25). So are its view's two cuts: r007 put Fabula in the sidebar, with its index and a corpus's page, and r008 the story page, its tabs, and the Story tab's folding panels (both 2026-10-25). So is People: r009 put in the story's cast, arcs, and relationships (2026-10-25). r010 carved Fabula's code out of `27_trunk` into a file of its own, `28_fabula` (2026-10-25). So is Outline: r011 put in a story's acts, chapters, and scenes as one tree, with each scene's beats, each a line and a What Happens, and r012 gave each act, chapter, and scene its position, II.4.A, on its page and in every reference to it (both 2026-10-26). So is Plot: r013 put in a story's threads, edited in place, its plot points under its structure's slots, and its promises and payoffs, with those never paid off flagged (2026-10-26). So is Notes: r014 put in a story's research notes, with a scene's research on its page (2026-10-26). So is Meaning: r015 put in a story's themes and motifs, each with the scenes that carry it, in the outline's order (2026-10-26). So are Plot Thread and Theme / Motif, under Fabula: r016 took them out of the sidebar's template list with a flag on each world's copy, left them entries, and listed their entries in two sections of Fabula's index, each entry's page naming the stories that use it (2026-10-26). So is the template builder for Fabula's kinds: r017 opens each kind in the builder from a Templates section on the index, its core fields locked to what Fabula reads and kept current by the seed, with fields of the user's own and Reset to Default (2026-10-26). So is Chronometric's math, pulled out of its view by r018 so Fabula's timeline can share it, and checked unchanged against r017's drawing (2026-10-26). So are Chronometric's lanes: r019 gives them room for what their events draw and wraps a long lane title, its lane grown to fit (2026-10-26). So is Fabula's timeline in story time: r020 puts a story's scenes, or its whole corpus's, on a calendar's axis in lanes by POV, by thread, or by arc (2026-10-26). So are Chronometric's era names: r021 puts them on a line of their own above the year labels, as Fabula's timeline has drawn its own since r020, and cuts a name too long for its band to fit it, with the full name on hover, in both timelines (2026-10-27). So are the timeline's two other modes: r022 gives it Narratio, the telling order with acts and chapters as bands, and Anachronia, telling order plotted against story time, and at Drak's pass sends the Timeline tab to the pane's full width (2026-10-27). So is Fabula's export: r023 writes a story's bible, or a corpus's with its stories in reading order, as one HTML file or one Markdown file in the story page's order, references to the world's entries as names and the threads and themes the story lists with their fields, from an Export button on the story's page and the corpus's (2026-10-27). So is Fabula's help: r024 gives the in-app help two topics after Linea's, "Fabula", a walkthrough and then the view's reference, and "Fabula's Timeline", and has the JSON Save File Schema topic document `state.fabula` in full, every kind's shape and every seeded field, the text the site's Fabula page and JSON Structure sections are written from (2026-10-27). So is the site's page: a sixteenth tile, a panel with six sub-tiles, the JSON Structure page's `fabula` sections with every seeded field of every kind, and its field-definition block completed from the code (`56874e0`, 2026-10-27, no r-number). With it Fabula's cut plan is done; what Fabula leaves for later is under the timeline's entry below, and r025 split it into a folder of twelve parts at its section headers, the pure carve Drak's call of 2026-10-25 owed (2026-10-27).
- **Stemma v2, all of it** (Drak, 2026-10-23, out of Deferred indefinitely): sibling reorder, mention tracking, keyboard shortcuts, undo/redo, a depth cap, and Markdown export. Stemma is Letters' brainstorm engine but stays its own view. **Planned 2026-10-27 (session 21), the build sheet is `docs/stemma-v2-spec.md`.** Stemma gets a second kind of document, **Tabula**, a freeform board in Milanote's structure with none of its social feel, beside the radial tree, named **Rota**; the kanban board the entry carried at r025, a tree two deep drawn as columns, was rejected at the plan's first call as the radial's own recursion in different clothes. A tabula is a document in `state.stemmas` with `layout: "tabula"` (absent is a rota, so nothing migrates): a root board node holding items placed by position (note, linked, image, column, board, in z-order) and a drawing layer in the map's shape model, with the Line tool's endpoints sticking to cards and arrowheads added to the shared stroke shape. A linked card points at entries and every registered record, and stemmas join the registry as a source, which gives Fabula's parked Brainstorm field its target (`docs/fabula-spec.md`), lets any template's field point at a stemma, and gives Concordance and Pipes' backlinks the stemma mentions from `getEdges`: that is the mention-tracking item, paid for there (Pipes' backlinks read them from the link index since v1.7's r041 and Concordance since r042, when the stemma source's `getEdges` went). Undo is `useMapHistory` over the open document for both layouts; reorder on a rota is a drag along the orbit; the depth cap is dropped (Drak, 2026-10-27), for rotas and for sub-boards alike. Fourteen cuts in the spec's section 11 (twelve at the plan; r030's pass inserted one, and the carve's plan a gather), r026 to r038 with two commits without an r-number; Tabula grows inside `21_stemma` and is carved at the end, Fabula's path. r026 is in (2026-10-27): Rota's seven edits are pure transforms of the document, committed through `useMapHistory`, so Stemma has undo and redo, and `tools/stemma-parity` holds the edit path to the last passed build. r027 is in (2026-10-27): a linked node points at entries and every registered record, each hit named with its source, and stemmas are a registered source themselves, eligible, with an edge per linked target, opening from a chip or Concordance, and counting and clearing the references to them when deleted. r028 is in (2026-10-27): the Story seed has Brainstorm, the stemmas behind a story, at seed 5. r029 is in (2026-10-28): Tabula I, the board's document (coerced on every load, strict on import, envelope 2), the index's two buttons with a badge and a count per row, and the canvas with notes, linked cards, and images, the map editor's camera, in-place editing, drag, resize, snap, undo, the locked view, and pan and zoom remembered per board. r030 is in (2026-10-28): Tabula II, columns (drop in at the gap nearest the pointer, drag out, reorder inside, a column dragging with its contents, the holds-delete modal with Move out where the cards stood) and sub-boards (a board card counting everything below it, double-click to open, the breadcrumb and Back, a view per board). Drak's pass of r030 asked for three things, which reshaped the plan from there: a drag grip that is the only drag surface and the drop into a sub-board, as r031 of their own (in, 2026-10-28: the grip in every card's left margin, the only thing that drags, and the drop into a sub-board by the edge its line is on); and table-like columns, lanes, into Tabula IV (r033): a column may hold columns, one level deep, laid side by side, each its own stack with its own title, a card dropped in a lane staying in that lane, "Cards per row" in the inspector making and removing them (in, 2026-10-28, at any depth, with stacks under cards, lane widths, and rows beside). r032 is in (2026-10-28): Tabula III, the drawing layer, lines over the cards in the map's shape model and renderer, an end put down on a card sticking to it and following it, Freehand, Select with the map's swatches, the width, Smooth, and the arrowheads in a panel, and `arrow` on the shared stroke shape, so a map's lines carry heads too, from the strip; Drak's one ask at its pass is Pipes' tenth item, the end-sticking logic for Cartographia. r033 is in (2026-10-28): Tabula IV, lanes at any depth, stacks under cards, lane widths on a divider, rows with widths that grow to fit (the apprenticeship tree as an org chart), and the multi-selection with Duplicate, copy, and paste; it grew at its review from four asks of Drak's in one evening, each folded in before his pass. r034 is in (2026-10-28): Rota's reorder and keyboard, a child dragged along the orbit to the nearest slot or swapped with the sibling there, the walk, Enter, Backspace, Home, Delete, N, Alt+arrows to the next free slot, and the zoom keys. r035 is in (2026-10-28): the Markdown export, `<slug>.stemma.md` from the index row and both canvas bars, a rota as a nested list with wiki-links, a tabula as lists and headings down through lanes, stacks, rows, and sub-boards. r036 is in (2026-10-28): the help, the Stemma topic for both layouts with its "not in v1" list retired, the schema topic's stemma block, and the three filed help lines. The site's page is in (2026-10-28, `130d2b4`, no r-number): the Stemma page as a hub and three sub-tiles, the rota, the tabula, and import and export, and the JSON page's stemma section. r037 is in (2026-10-29): a gather, Drak's two calls at the carve's plan, the rota's transforms moved below its canvas and the tabula's canvas header down to its canvas, so every member reads under the header that names it; nothing changed on screen. r038 is in (2026-10-29): the carve, `21_stemma` split into a folder of seven parts at its section headers, pure, byte for byte, which ends the plan; Stemma v2 is done. The won't-have list is the spec's section 12: nothing social, nothing that fires from a file, no URL previews, no layout switching, no links into a document's nodes, no auto-layout.
- **Pipes: the deficiencies a new adversarial review raised**, brought in 2026-10-23 and checked against the tree below. All eight hold, and Drak added a ninth the same day, template-level entry import. **The calls are made** (Drak, 2026-10-23): v1.7 takes durability (6), backlinks (1), renames (3), the query layer (4), and entry import with its export (9, carrying 7's CSV), in that order (the query layer's place settled 2026-10-24); r001 took item 5's Gregorian rename (done 2026-10-24); the free-forever argument (8) was a site edit, made the same evening. **Planned 2026-10-29 (session 21), the build sheet is `docs/pipes-spec.md`**: eight calls, one per message, after the items below were checked again against the r038 tree, which found three of their claims wrong and a world-stopping defect none of them named (duplicate entry ids refuse to load). Durability in two cuts, saving and then backups into the images folder (r039, r040); one link index for the whole app, with a Referenced by list on every page that has one and then the delete warnings and Concordance drawn from it (r041, r042); one resolver for every `[[link]]`, then renames that offer to rewrite the links naming the old name (r043, r044); a filter builder on the entry list over what the page shows, then saved lists in the world (r045, r046); Export entries in JSON and CSV, then import through one mapping screen that adds or updates, JSON then CSV (r047 to r049); sticky line ends on maps, the pin-id fix first (r050); the help (r051 at the plan, r059 since the Sweep's cuts went ahead of it); and the site, without an r-number. r039 is in (2026-10-29): a Save writes at once, a pending save goes out when the page is hidden, a failed save shows a banner and retries until one lands, the browser is asked to keep the storage and Settings says what it answered, every id built from a name is checked against the world's, a world holding shared ids loads repaired instead of refusing, and an import or a reset keeps the restore points. r040 is in (2026-10-29): with the images folder connected, the world is written as Export's file into a `cartulary-backups` folder inside it, at most every ten minutes while it changes and two seconds after the last change, each world's newest ten kept; a connect writes one at once unless the folder already holds the world's last change; a folder whose permission has lapsed is kept, with Reconnect in a banner and in Settings, where it used to be dropped; Back up now writes one at once; a backup resets the reminder; and a browser without the folder says backups need one. r041 is in (2026-10-29): one index lists every link in the world, stored links and `[[links]]` alike, and at the end of an entry's, a map's, a corpus's, a Fabula record's, and a body's page, and on a story's Story tab, a Referenced by list names each record that links there and the fields it links through, grouped by kind, a secret field's links only while secrets show; the thread, theme, and scene pages keep their own lists. r042 is in (2026-10-29): one modal asks before every delete of a record a link can point at, counting from the index what the delete does to what links to it, and every delete clears the stored links it counts, a Glossopoeia record's included; Concordance draws its links from the index, with the fields and `[[links]]` it didn't read before. r043 is in (2026-10-29): one resolver finds what a `[[name]]` names everywhere a link is read, a map, a stemma, a Fabula record, or a language included, and the exports resolve as the entry view does. r044 is in (2026-10-30): renaming a record that `[[links]]` reach by its old name asks first, in one modal, with the count, an update rewriting each such link after a restore point and Rename only leaving them, with a box for either that adds the old name to the record's former names, and the names copied from the record following it; a template's rename carries other templates' filters and target names; and a word's delete clears the words that name it, as do the deletes of the other Glossopoeia records a word names. r045 is in (2026-10-30): All entries lists every entry, and a Filter on the entry list narrows it by conditions, a field by its label across templates, an operator by its type, and a value, all or any of them, Linked with reading the link index either way; the conditions show as chips while their rows are closed; the search reads what each entry's page shows; and a required Number field saves. r046 is in (2026-10-30): a query saves as a named list in the world, kept in the sidebar's Lists after Templates, renamed and deleted from its header and moved by its handle, a field kept by its label and a record by its id, so a field gone shows as not found and a record's delete empties what names it; and the lists travel with the world file. r047 is in (2026-10-30): Export entries on each template writes every entry it has as one file, JSON in `cartulary_entries_export: 1`, each value in the world file's shape and a reference as its record's name and template beside its id, or CSV for a spreadsheet, a row per entry and a column per top-level field, groups and grids left out and a date range taking two; secret fields stay out unless asked for; and a world import refuses the file. r048 is in (2026-10-31): Import entries on each template reads an entries file through a mapping screen, its fields picked by id, then label, and its calendars by id, then name, a preview counting what it adds, updates, leaves, and skips before it writes, after a pinned restore point; a matched entry keeps its name and calendar, and an empty value leaves a field as it is. r049 is in (2026-10-31): Import entries reads a CSV through the same screen, its columns picked by header, a date read as its calendar writes it or as year-month-day numbers, a word no option is read as Other where the dropdown keeps an Other text, and a matched row's dates read in its entry's calendar where its Calendar cell names it. r050 is in (2026-10-31): a new pin's id takes the random part of `genId()`, and a load tells apart two pins that share one; a map line's end put down by the Line tool or a drag in Select on a pin, or on a stamp on a shown layer, sticks to it and follows it however it moves, in every view and file, and a delete frees it where it was drawn.
- **Letters before Pipes** (Drak, 2026-10-24), because backlinks, renames, and the query layer reach into Fabula's records and are better built once with those records in place; durability and entry import don't depend on either. The one dependency running the other way, the delete confirmation's count, which uses backlinks' scan, moves to the backlinks cut (`docs/fabula-spec.md`, section 10). **The order, locked** (Drak, 2026-10-24): r001 (done the same day); the small data fixes, three cuts by Drak's later call (r002 the target lists, done the same day; r003 the display of references to records that aren't entries, with maps as targets, done the same day; r004 the v1.4 upgrade path, done 2026-10-25); Fabula, with Other on multi-selects ahead of it as r005 (Drak's call in the field-list review, 2026-10-25, done the same day) its first cut as r006, its view's two cuts as r007 and r008, and People as r009 (all four done the same day), its carve as r010 (done the same day), Outline as r011 (done 2026-10-26), the outline's positions as r012, Drak's addition ahead of Plot (done the same day), Plot as r013, Notes as r014, and Meaning as r015 (all done the same day), then Plot Thread's and Theme / Motif's move under Fabula as r016 (Drak, 2026-10-26, done the same day), and the rest of the spec's cut plan after it, the template builder first, as r017 (done the same day), then Chronometric's math extracted, as r018 (done the same day), and Chronometric's lanes made roomier with long lane titles wrapped, as r019 (Drak's addition, 2026-10-26, done the same day), then Fabula's timeline, in story time as r020 (done the same day), Chronometric's era names moved clear of its year labels, each cut to its band, as r021 (done 2026-10-27), and telling order with the third mode as r022 (Drak, 2026-10-26; done 2026-10-27, the modes named Chrono, Narratio, and Anachronia), and Fabula's export as r023 (done 2026-10-27), its help as r024 (done 2026-10-27), and its page on the site as a commit of its own after that, with no r-number (Drak, 2026-10-27; done the same day), and its split into a folder as r025 (Drak, 2026-10-27; done the same day); Stemma v2 as its spec's cuts, r026 to r038 with two commits without an r-number (planned 2026-10-27, session 21, twelve at the plan, one inserted at r030's pass and a gather at the carve's plan; `docs/stemma-v2-spec.md`, section 11; done 2026-10-29); then Pipes in its order, with backlinks also covering Fabula's records, stemma mentions, and the delete count, and renames rewriting `[[links]]` in Fabula's text as well as entries' (planned 2026-10-29 as thirteen cuts, r039 to r051, then the site; `docs/pipes-spec.md`, section 11; r039 through r043 done the same day, r044 through r047 the next, and r048 through r050 the day after); then the Sweep's cuts ahead of the help, r051 to r056 at its plan (Drak, 2026-10-31; `docs/sweep-spec.md`) and r051 to r057 since r053 went in ahead of the rest (Drak's call a, 2026-11-01, its place Claude's default), the help moving to r058, and to r059 since r058 went in after r057 (Drak's call a, 2026-11-02). Claude's estimate is about 32 cuts, between 28 and 40, the least certain being Fabula's timeline, the query layer, and Stemma's undo. Typed relations (2) went to the backlog and the leap rules (5) to v1.8, each with its check.
- **The Sweep: v1.7's open items cleared before the help** (Drak, 2026-10-31). Before the help cut, Drak asked whether anything in v1.7 was still open, tabled issues or decisions or bugs not fixed, and then to clear it out. **Planned 2026-10-31 (session 22), the build sheet is `docs/sweep-spec.md`**: Claude's plan with its defaults, and Drak's three calls on it, one per message, a, a, and a: a grid's starting shape goes in as a cut of its own, Fabula's five tabled features go to the backlog until using Fabula shows they're wanted, and the spine manifest's record through r050 is frozen. Six cuts at the plan, then the help, and two since: r051, fields kept and shown as entered; r052, entries files make the round trip; r053, entries CSVs read back exactly, added at Drak's call of 2026-11-01 after writing r052's turnover found the join running on the export's own files; r054, renames say where the links go; r055, Chronometric fits its frame, after a tooling commit; r056, Fabula's screens; r057, a grid's starting shape; r058, the rest of Fabula's new records start from their shapes, added at Drak's call of 2026-11-02 after r057's turnover read found them starting empty; then r059, the help, Pipes' r051 moved; and the site without an r-number. Each open row below names the cut that takes it; of v1.7's tolerated rows, two go to r056 and four stay. r051 through r059, the help, are in (2026-10-31 to 11-02), and the site after them.
- **Carry-in fixes: done in r001** (2026-10-24). The three product-text defects (the Concordance help's reload line, the schema topic's missing `longform` and `grid` with the site's wrong `grid`, the Ephemeris note that named v1.5), the export's two version literals, and Pipes item 5's cheap half, the default calendar renamed Common Year; with them, five more stale strings found while reading for the cut and a sixth from Drak's pass. `docs/changelog-v1.7.md` has the list.
- **Other on multi-selects: done in r005** (Drak's calls, 2026-10-25, in the Fabula field-list review). Four of Fabula's draft lists ended in Other on a multi-select, which the field system couldn't do; Drak's call was to build it for every template, ahead of Fabula, with each value typed under it saved as one more string in the same list, so the stored shape doesn't change. The template builder offers it on multi-selects, and the help and the site say what such a field holds.
- **A stale help line: done in r036** (2026-10-28). The Templates topic's "Half-width pair layout" bullet, in its list of the builder's options (`26_home-data`), said eligible field types "can be marked half-width" and that the builder pairs "contiguous half-width fields" (found 2026-10-25, reading for r005). Nothing is marked: since v1.3 half width goes by type and order (`isFieldHalfWidthEligible`, `05_field-system`). r036 rewrote the bullet to say so, naming the half-eligible types as the Field Types topic's paragraph does.
- **The JSON schema topic named a template that doesn't exist: the help's line done in r036, the code comment in r051** (2026-10-28). The JSON Save File Schema topic's body shape ended "...plus kind-specific fields layered on via the celestial-body system template" (`26_home-data`; found 2026-10-26, planning r016). No such template exists: v1.5's r004 converted Astronomical Body entries into bodies and deleted the template. r036 replaced the line with the body's real tail, `tags` and the descriptive fields `makeNewCelestialBody` writes. The comment over `celestialBodies` in `09_trunk` said the same until r051, which says what a body carries.
- **The help's JSON Save File Schema topic was behind the site's JSON Structure page: done in r036** (2026-10-28; found 2026-10-27, planning the site's Fabula page, Drak's call there, option a). Its field-definition block listed nine keys where the builder writes eighteen, its ID conventions lacked Fabula's and the maps' prefixes, its Migration list lacked v1.5's, v1.6's, and v1.7's lines, and r024's `fabula` section put a field's `help` and a schema's `nameHelp` under the field, where the form shows each on hover. r036 brought all of it level with the site's, and the stemma block with it.
- **Fabula's spec says Fabula filters its own lists by status, POV, and thread** (`docs/fabula-spec.md`, section 9; found 2026-10-29). Its lists have no filters; the tabs order their records. A line of the spec, corrected the next time it's opened. Corrected 2026-10-31, with the Sweep's plan.
- **Everything else in the backlog stays unscheduled** unless planning Letters, Pipes, or the Sweep pulls it in.
- **Names on the line** (decided 2026-10-23; the rules are under Tags and Content cut in `handoff.md`): the v1.6.1 tree as shipped is r000 and isn't tagged; each passed revision is tagged from `v1.7_r001` on; the release is `v1.7_Release`, on the ship-turnover commit; and each cut's script is `inlining/cuts/v1.7_r###_description.py`.

### Pipes: the review's eight and Drak's ninth and tenth, checked against the tree (2026-10-23; the tenth filed 2026-10-28)

Checked again against the r038 tree for Pipes' plan (2026-10-29): where this section and `docs/pipes-spec.md`, section 2, disagree, the spec is right. Three claims below were wrong and are corrected in place; each item says which cuts take it.

1. **Backlinks.** The entry view listed nothing that points at an entry before v1.7's r041; only Concordance showed inbound links, as a graph (its focus mode walks both directions). Until v1.7's r045 the entry list's search (`12_trunk`) matched names, tags, and `JSON.stringify(fields)`, and an entry-ref is stored as the target's id, which is built from its name at creation (`ent-<slug>-xxxx`): searching a one-word form of a house's name found its members by accident, a query with a space missed them, and a rename left the old slug behind, while "year" matched every entry with a date; since r045 it reads what each entry's page shows (item 4). `countInboundEntryRefs` (`05_field-system`) had one caller when this was written, the Ephemeris body-delete confirmation; it has five at r038, the body, map, and stemma delete warnings and Fabula's two delete counts. A "Referenced by" list on the entry view is derived at render time and needs no schema change; counting `[[links]]` as well as reference fields, as Concordance's edges do, gives item 3 the scan it needs. **v1.7** (Drak, 2026-10-23). **Planned:** r041 and r042 (`docs/pipes-spec.md`, section 4). **r041 is in** (2026-10-29): one index in the registry of every link, stored links and `[[links]]` alike, and a Referenced by list at the end of an entry's, a map's, a corpus's, a Fabula record's, and a body's page, and on a story's Story tab; r042 moves the five callers of `countInboundEntryRefs` and Concordance onto it. **r042 is in** (2026-10-29): one delete modal counts from the index, every delete clears the stored links it counts, `countInboundEntryRefs` is gone, and Concordance draws from the index, so the graph, the lists, and the delete counts come from one index.
2. **Relations beyond family carry nothing.** **The backlog** (Drak, 2026-10-23); the check moved there, under Typed relations.
3. **Renames break wiki-links.** Wiki-links resolve by primary name, then by Name History (since v1.7's r043 through one resolver in `22_trunk`, before it in `13_form-engine-display`), so `[[Old Name]]` survives only if the old name is in the entry's Name History field. **Wiki-links reached entries and bodies only until v1.7's r043** (found 2026-10-27, probing v1.7's r027): the entry view's `MarkdownDisplay` resolved a `[[name]]` against entries, their Name History, and bodies, and the exports' `entryByLowerName` against entries' primary names alone, the last same-named entry winning (corrected at Pipes' plan, 2026-10-29), so a wiki-link to a map, a Glossopoeia record, a Fabula record, or a stemma was a broken link in the entry view and the exports, though Concordance built its own name index with the registered records and drew the edge until v1.7's r042, which resolved its `[[links]]` by the entry view's rules; `getRegisteredNameToId` (`22_trunk`), written at v1.5's r076 "for wiki-link resolution parity with entries", never had a caller, and r043 took it out. Until v1.7's r044 nothing put an old name in Name History: saving a renamed entry recorded and rewrote nothing; only 4 of the 20 built-in templates have a Name History field. Concordance's wiki-link edges resolved by primary name only until r042 (`17_concordance`), so a renamed target lost its edge even with the old name in Name History; since r042 they resolve as the entry view's do, Name History included. **r043 is in** (2026-10-29): one resolver finds what a `[[name]]` names for every place a link is read, the exports and Concordance included, by primary name, Name History, and a body's names, then maps, stemmas, Fabula records, and languages, and `getRegisteredNameToId` is gone; r044's rename modal was what was left of the item. **r044 is in** (2026-10-30), and the item is done: renaming a record that `[[links]]` reach by its old name asks first, with the count, and offers both of the choices below, Rename and update links, which rewrites them across the world after a restore point, and Rename only, with a box for either, unticked, that adds the old name to the record's Name History or a body's Other Names. The choices: rewrite the links across the world on rename, with a count shown first, or add the old name to Name History where the template has one. **v1.7** (Drak, 2026-10-23). **Planned:** r043 and r044 (`docs/pipes-spec.md`, section 5).
4. **No query layer.** Until v1.7's r045 the entry list filtered by one variant axis, then by a tag or a template, then by the search above; nothing filtered on arbitrary field values (the variant axis is one select field), so "every living member of House X" couldn't be asked. The review expected it to fail the 10-years filter, and so did Claude. **v1.7** (Drak, 2026-10-23): it's his filter, and he doesn't think an internal query and search system is hard enough to fail it. Two calls in its spec set what it costs to keep: whether a query is built fresh each time or saved in the world, which would make its shape part of the save format, and which of the seventeen field types it reads (groups and grids nest their values). Matching what an entry shows, a referenced entry's name or a date as written, rather than the stored ids would also end the accidental matches item 1 describes. Variant filter v2 (backlog) plans filtering across the specialty views, so the spec also says where one stops and the other starts. **Planned:** r045 and r046 (`docs/pipes-spec.md`, section 6). **r045 is in** (2026-10-30): an All entries scope, and a Filter on the entry list whose conditions are each a field by its label, an operator by its type, and a value, all or any of them, Linked with reading the link index to, from, or either way, so every living member of House X is two conditions, and a search that reads what each entry's page shows. **r046 is in** (2026-10-30): a query saves as a named list in the world, its scope, All or Any, and its conditions, a field by its label and a record by its id, and the item is done.
5. **Leap years.** **The cheap half done in r001, the leap rules in v1.8** (Drak, 2026-10-23); the check of the tree moved to the v1.8 section below. `DEFAULT_CALENDAR` (`06_calendar-engine`) was named Gregorian but has a 28-day February and no leap rule, and the calendar-name placeholder suggested Gregorian, Julian, Islamic, and Hebrew, none of which Kalendarium can express. The cheap half, done in v1.7's r001: the default is Common Year (Drak's name, 2026-10-24), and the placeholder, the Kalendarium help, the schema examples in the help and on the site, and `16_trunk`'s fallback label follow it. Worlds saved before keep the name they stored (Drak's call: no load-time rename).
6. **World durability.** Nothing called `navigator.storage.persist()` before v1.7's r039, and Version History keeps its snapshots in the same IndexedDB store as the world, so an eviction or a cleared site takes both. The images-folder handle (kept in IndexedDB, re-permissioned in `11_io-utils`) already writes image files, so a rolling world JSON beside them needs no new permission flow. The limits: the folder exists only where `showDirectoryPicker` does (Chromium browsers), a write without a click can only happen while the permission still holds, and whether a browser grants persistence to a page opened from a file has to be tested in each one. **v1.7** (Drak, 2026-10-23). **Planned:** r039 and r040 (`docs/pipes-spec.md`, section 3). **r039 is in** (2026-10-29): the app asks for persistence after the session's first edit and Settings shows the answer, and at Drak's pass Chrome and Brave answered no for a page opened from a file and Firefox asked with its own prompt, so the copy outside the browser is r040's to make. **r040 is in** (2026-10-29): the world is written into a `cartulary-backups` folder inside the images folder, at most every ten minutes while it changes, each world's newest ten kept, a lapsed folder is kept for Reconnect, and a browser without the folder is told backups need one.
7. **No CSV import.** Until v1.7's r049, nothing in the application read CSV, but the release build bundles all of d3 7.9.0, whose `d3.csvParse` handles quoted fields, so there was no parser to write; the deferred plan's premise that none is bundled (`roadmap-principles.md`) is wrong. That plan in the backlog below (a column-mapping step, add-only) is the same door; the field-mapped importer for entries (item 9) came first, and the lexicon's import may borrow its screen (`docs/pipes-spec.md`, section 12). A parser for one generator's format fails the 10-years filter; a generic mapper doesn't. **Drak's call (2026-10-23):** CSV comes in through item 9, one template at a time. **Planned:** r049 (`docs/pipes-spec.md`, section 7). **r049 is in** (2026-10-31): a template's entries come in from a CSV through r048's mapping screen, read by d3's parser, `csvParseRows`, or `dsvFormat(";").parseRows` for a file split by semicolons.
8. **The free-forever argument answers the wrong question.** cartulary.world's "Free, and not as a pricing decision" and "Free by construction" sections argue from the MIT license and the architecture, which guarantee the price but not that fixes keep coming. The answer the project has now is the public repository and its deterministic build: anyone can rebuild the shipped file byte for byte and carry on. It's a site edit with no r-bump; the itch page and the zip README already name the repository, and the site's stale line about having no repository is in the product-text defects below. **Done and live** (Drak's go and upload, 2026-10-23), with the repository line in the same edit (`site/helloworld.html`); the itch page's version of the argument is his to replace (the changelog has both).
9. **Template-level entry import** (Drak's, 2026-10-23; not from the review). Until v1.7's r048, only one importable file carried entries: a world file, whose import replaces the whole world after a confirmation (`importWorld`, `12_trunk`). Template and pack files carry definitions only, and the Markdown exports aren't read back. Importing entries into one template from any source needs a mapping onto its fields, new ids, a rule for names already taken (wiki-links resolve to the first same-named entry in storage order), spouse declarations mirrored onto the partner as the editor does, and references resolved against this world: a value is an entry id, and `migrate()`'s cleanup drops one that matches nothing at the next load (in top-level fields with a target list; elsewhere it dangles), so the import has to report them itself. A file from another world adds three problems. Field ids won't match even on built-ins, which every world seeds with random suffixes (`makeTemplateFromBuiltin`, `01_builtin-templates`); they match only where a template came from the other world's template or pack file, or both came from the same one. Entries name their calendar by a world-scoped id, and `getCalendar` (`06_calendar-engine`) falls back to the primary calendar for an unknown one without a word, so their dates, stored as year, month, and day, would be read in the wrong calendar. And image fields name files in the other world's images folder. **Drak's call (2026-10-23): both JSON and CSV**, through one mapping screen; the CSV half is item 7 with the destination fixed to one template. The reset-to-built-in path already matches fields by label (`12_trunk`), but no rule makes labels unique within a template, so the mapping has to flag a repeated one. **The JSON half reads a format of its own** (Drak, the same evening), written by a new Export entries action on each template: a `cartulary_entries_export: 1` envelope, like the template, pack, and calendar files, naming fields by label with the id alongside, and references and calendars by name. Entries move between worlds as an export and an import, with field matching and calendars settled at the export, where the ids are known; world files aren't read. Images still travel as file names only, and secret fields should follow the other exports, left out unless asked for (`08_export-layer`). **v1.7** (Drak, 2026-10-23). By Claude's estimate it was about three cuts: the export and its format, JSON import through the mapping screen, then CSV through the same screen, splitting before the CSV cut if v1.7 ran long; it took the three, all in v1.7. **Planned:** r047 to r049 (`docs/pipes-spec.md`, section 7). **r047 is in** (2026-10-30): the export and its format, JSON and CSV, by Drak's two calls at the cut. **r048 is in** (2026-10-31): the JSON import through the mapping screen, by two more. **r049 is in** (2026-10-31): the CSV through the same screen, by three more; the item is done.
10. **Sticky line ends on maps** (Drak's, 2026-10-28, at r032's pass; not from the review). Tabula's r032 gave a line's end the habit of sticking to a card it's put down on, drawn from the card's measured box and following the card from then on, freed where it was drawn when the card goes (`tabulaCoerceShape` and `tabulaHealAnchors` in `21_stemma/04_tabula-document`, `tabulaDrawnPoints` in `05_tabula-drawing`); the map's stroke got the arrowheads at the same cut but not the sticking. Drak asked for "that arrow logic" in Cartographia when Pipes comes, read as this: a map line's end sticking to a pin or a stamp, following it when it's dragged, freed when it's deleted; the reading was confirmed at Pipes' plan. The map's `useMapDrawing` keeps its shapes in canvas units already, a pin is a 0-1 fraction of the canvas rect and a stamp a box in canvas units, so the attachment is a point to compute rather than a box to measure, and an `anchors` field on the map shape, which `ensureMapShape` dropped before r050, can carry a pin's id or a stamp's shape id (not its `stampId`, which every copy shares) as a card's (corrected at Pipes' plan, 2026-10-29). **Planned:** r050, the pin-id fix first (`docs/pipes-spec.md`, section 8). **r050 is in** (2026-10-31): a line's end sticks to a pin or a stamp, drawn from it through Tabula's `tabulaDrawnPoints`, whose `tabulaAttachPoint` learned a stamp's rotation, and freed where it was drawn when the pin or the stamp goes. The item is done.

### Document debt

One item, optional, now done. It edits no application code, so it takes no r-number. Claude's suggestion (2026-10-24) was to do it at Fabula's first cut, on the belief that the cut would add modules; it didn't, since the edit gate refuses a cut that adds a file, and Fabula was to grow inside `27_trunk` until its view was in (Drak's call, 2026-10-25). The suggestion moved to the carve that gave Fabula a module, since that has to touch the module map anyway; the carve came at r010 without it, and the item stayed optional until the Sweep's plan did it (2026-10-31). None is open.

1. **The spine manifest's freeze: done 2026-10-31** (the Sweep, Drak's call 3). At 212 KB it was mostly pillar 2's finished carve record, every cut's row and verification note, and the anchor history; that record through r050 is frozen in `docs/cartulary-spine-manifest-v1.7-r050.md`, as the handoff froze at v1.6, and the live manifest keeps the module map, the gate design, the current tree with line counts, the active anchor, and the header census. A turnover adds no manifest row or verification note per cut; the changelog carries both.

---

=== ADDED 2026-10-23 (session 19, after the v1.6 ship: the roadmap cut back to what is ahead) ===

**v1.6 shipped 2026-10-23** from the r051 tree: maps as records, the module tree, the map editor with painting, stamps, and brush packs, and the help and the site read against the application. The finals are `Cartulary_v1.6.html` (sha256 `b99381a041153d9d`) and `Cartulary_v1.6_Readable.html` (sha256 `e748142eadb3e1aa`), regenerable from the tagged tree, and the repository has been public since the same day. **No line is open.**

**v1.7 is not scoped.** It opens with the `VERSION` bump in `inlining/build_inline.py`, and the first product edit after that is r001. What goes in it is Drak's call. The three shapes on the table: a feature headline (the sector graph, variant filter v2, or the Game Mechanics pack), a consolidation release (hooks-extraction and the remaining housekeeping), or waiting to see what the first public issues ask for.

**What changed in this file.** The v1.5 plan, filed under "Active / Next Up" since before v1.5 shipped, and everything about v1.6 moved verbatim to `roadmap-archive.md`, where the v1.5 retrospective's "the v1.5 plan above" is now true. The backlog above was rewritten from the old backlog, the post-v1.5 carry-forward list, the handoff's post-pillar list (the handoff now points here instead of keeping a copy), and two deferred plans that lived only in `roadmap-principles.md` (CSV import, variant filter v2). Three rows were struck as already done, each checked against the tree or the record first, and a fourth was struck and then reopened:

- **Marriage dates on spouse declarations** shipped in v1.2 (the Married and Ended pickers); `marriedOn` and `endedOn` appear on 59 lines of the tree.
- **The data-shapes reference doc** was struck as covered by the in-app JSON Save File Schema topic and the site's JSON Structure page, and reopened the same night by the independent read: neither documents `longform`, and the site's `grid` shape is wrong. It's now a product-text defect above. The repository README points at both documents as the reference and says they're incomplete.
- **Ephemeris bug-audit rows BA-01, BA-02, and BA-04** were run and passed on 2026-06-23 against Drak's Dul Pantra world (`changelog-v1.5.md`, "Ephemeris Bug Audit closed"). The handoff and this file carried them as unrun for four months afterward.
- **The patch-notes format** was decided on 2026-10-22: one file per version in `docs/release-notes/`.

**Corrected the same night.** An independent read of the rewritten handoff and this file against the tree found the struck data-shapes row, the Concordance edge-label half of the polish row, the Game Mechanics row's "design done", the sector graph as the only headline-sized item, and this file's account of what the doc gate reads all wrong. Each is fixed above, and three product-text defects it found are now on the backlog.

**The journal row is done.** There was never a master `journal.txt` to import: the journal began as a turnover aid against context compaction, and Drak never collected the entries. Drak's call (2026-10-23): the repository is the master. `docs/journal.txt` replaces `journal-entry.txt`, keeps every entry oldest first, starts with the two entries the repository's history held (sessions 18 and 19), and the doc gate reads only its newest entry.

=== ADDED 2026-10-23 (session 19, later: v1.7 named) ===

**v1.7 is the Letters and Pipes update** (Drak, 2026-10-23): Letters is writing tools, with its scope held open until work on the app begins, and Pipes is the deficiencies a new adversarial review raised, addressed when code work is planned. The v1.7 section at the top of this file holds the carry-in fixes and the before-code list. **No line is open** until the `VERSION` bump; v1.6 stays shipped from the r051 tree (finals `b99381a041153d9d` and `e748142eadb3e1aa`). The entry-ref audit and Drak's files moved from the housekeeping backlog into the before-code list, which is now their one place.

**The cut-script names are settled** (Drak, 2026-10-23), closing the before-code item that asked how v1.7's would be named: from v1.7 a script is `inlining/cuts/v<version>_r###_description.py`, the tag plus a description, and v1.6's 27 stay where they are. A new script finds the repository by walking up to the folder that holds `cartulary-src/`. Checking the item found r025 through r030 pointing at folders that haven't existed since the move into the repository; r031 through r051 each reproduce their tag exactly when replayed (the changelog has the method).

**Re-checked before presenting** (2026-10-23, at Drak's ask). Every standing row that makes a claim about the tree was read against the r051 source, and all of them hold: `VERSION` reads `'1.6'` and the export's two version literals read v1.6; the three product-text defects are still in `26_home-data`, `site/helloworld.html`, and `12_trunk`; `makeEmptyGrid` is in `05_field-system`; Concordance has `truncateLabels` and `labelPosFor` and no auto-place; `prove_gate_teeth.py` still names `11_io-utils.jsx` and `02_trunk.jsx`, `finals` still writes to `/tmp`, and `02_trunk` is 43 lines; the manifest is 91 KB; and `docs/release-notes/` still lacks the v1.4 notes and the v1.5 README. What changed: the v1.7 section gains the line's names, the skill refresh says what the installed copy is missing, v1.5's r087 says which line it's from, and r025 through r030's scripts are filed under Tolerated.

**The release notes are filled in** from Drak's archive of every release (2026-10-23): the v1.4 patch notes, the text in the v1.0 through v1.4 zips byte for byte, and an index with every release's finals hashes (`docs/release-notes/README.md`), which the repository had never recorded. That takes the release-notes half off before-code item 2. The row also asked for the v1.5 zip's README, but that zip held none.

**The v1.6 itch screenshots are up** (Drak, 2026-10-23), which leaves item 2 as the skill refresh: `tools/turnover/SKILL.md` was brought current first, and the card that replaces the installed copy with it waits on Drak.

=== ADDED 2026-10-23 (session 19, later: the review's list and the entry-ref read) ===

**The review's list is in**, all eight items checked against the tree and every one holding; they sit in the v1.7 section with what each would take, and none is scheduled until Drak's call. **The entry-ref read is done** (`docs/entry-ref-audit.md`): eight flags for Drak, and on the way a data-loss bug that shipped in v1.5 and v1.6, now the first item in the v1.7 section. **Pen pressure is on the feature backlog** (Drak), out of Decided no. **The refreshed turnover skill is saved**, so the installed copy is `tools/turnover/SKILL.md`; the package still holds the old script copies, which that file tells every session to ignore. The before-code list is rewritten around Drak's three calls. **No line is open.**

=== ADDED 2026-10-23 (session 19, later: v1.6.1) ===

**v1.6.1 is open**, the project's first patch (Drak, 2026-10-23): one cut, r052, which keeps references to bodies, Glossopoeia records, and maps through `migrate()`, passed by Drak and frozen. It continues v1.6's count, so its tag is `v1.6.1_r052`, the first in the new form, and the release will be `v1.6.1_Release`. **The fact-check is in**: an independent agent read the Pipes list, the audit, and the handoff against the source and reproduced the bug through the picker. Its corrections are made above (search finds members through an id's slug, Concordance shows inbound links, the bug covers maps and spares group subfields, v1.4 upgrades lost these references at the upgrade, d3 already parses CSV, and the pen-pressure details), and the first session-19 block's "neither documents `longform`" is wrong for the site, left there as written. The before-code list loses the bug's route. v1.6 stays shipped from the r051 tree.

=== ADDED 2026-10-23 (session 19, later: v1.6.1 shipped) ===

**v1.6.1 shipped 2026-10-23** from the r052 tree: `Cartulary_v1.6.1.html` (sha256 `d9125ed013be5641`) and `Cartulary_v1.6.1_Readable.html` (`c10c693bbacbe9e6`), with its devlog, patch notes, zip README, and finals checklist filed in `docs/release-notes/`. It's tagged `v1.6.1_r052` (`956fd03`) and `v1.6.1_Release`. **No line is open**; v1.7 is next, from the before-code list above.

=== ADDED 2026-10-23 (session 19, later: a ninth Pipes item) ===

**Pipes has a ninth item**, template-level entry import (Drak), checked against the r052 tree and filed after the review's eight. **Its sources are decided** (Drak, the same evening): CSV, so item 7's CSV import comes in through it, and JSON in a format of its own, written by a new Export entries action on each template. Pushing found GitHub's tags and the local ones disagreeing, which makes one README line false; it's before-code item 5. The check also found the v1.7 section still saying `VERSION` reads `'1.6'`, stale since v1.6.1 opened; `inlining/build_inline.py` reads `'1.6.1'`. **No line is open.**

=== ADDED 2026-10-23 (session 19, later: the Pipes calls) ===

**The Pipes calls are made** (Drak). v1.7 takes durability, backlinks, renames, and entry import with its export, in that order, and the query layer, which Drak put in against Claude's call to drop it; where it falls in the order is open. r001 takes the Gregorian rename, and the free-forever argument is a site edit. Typed relations went to the features backlog and the leap rules to a new v1.8 section, which also holds Kalendarium and Ephemeris work Drak hasn't written down yet; each took its check with it. Before-code item 1, the Pipes calls, is struck as done, so the tag mismatch is now item 4. **No line is open.**

=== ADDED 2026-10-23 (session 19, later: the free-forever argument) ===

**Pipes item 8 is done and live** (Drak's go): `site/helloworld.html` answers the continuity question in the Overview's tenet and the colophon, and the product-text row about the site's repository line is struck, fixed in the same edit. Drak uploaded the page the same evening and the served bytes match the repository; the itch page's paragraph is his to replace. **No line is open.**

=== ADDED 2026-10-23 (session 19, later: Letters defined) ===

**Letters is defined** (Drak): Fabula, a new view for planning stories, everything but the writing, with Plot Thread and Theme / Motif kept as entries the view owns; the v1.7 section has the shape and what's open. **Stemma v2 moves into v1.7** from Deferred indefinitely, all six items. The doctrine's "Not a writing tool" becomes "Not a prose tool", and its virtual-tabletop line stops saying maps can't be drawn on, stale since v1.6. Later the same night Drak named the view and accepted a first breakdown of its record types, with several stories per world grouped into corpora and a timeline of Fabula's own; the draft spec is `docs/fabula-spec.md`. **No line is open.**

=== ADDED 2026-10-24 (session 19, past midnight: Fabula's first decisions) ===

**The spec has its first decisions** (Drak): several corpora per world, Fabula's records in Concordance behind one Fabula toggle, and an export of Fabula's own in HTML and Markdown, apart from the world's. Then Drak took Claude's middle paths on the other two: schemas the world can edit, with the fields a feature reads locked as core, and a deleted entry cleaned out of Fabula after a confirmation that counts what goes, with cast records kept. The field lists are still to be decided. **No line is open.**

=== ADDED 2026-10-24 (session 19, morning: the last calls and the tooling) ===

**Drak took every recommendation** (2026-10-24): entry-ref flags 1 to 5 as one v1.7 cut with 6 to 8 skipped (recorded in `docs/entry-ref-audit.md`), maps made eligible as reference targets on purpose, the query layer between renames and entry import, and GitHub's tags kept with the text corrected. **The tooling is done:** `inlining/prove_gate_teeth.py` resolves its targets by role and still bites on all eighteen probes with the three files it used to name renamed; `finals` writes its JSX through a temporary directory instead of `/tmp`, with every read and write of the build pinned to UTF-8 and exact bytes, and rebuilds v1.6.1's finals unchanged; and the doc gate's retired-anchor check wants its history marker in the anchor's own sentence, with an eleventh probe in `tools/turnover/prove_teeth.py` that the old rule missed. **The tag mismatch is closed:** the four scripts replay exactly from and against their corrected commits, and the README, the handoff, and the changelog say so. That strikes before-code items 1, 2, and 4, leaving the optional manifest freeze. **No line is open.**

=== ADDED 2026-10-24 (session 19, later: the line's order) ===

**Letters goes before Pipes** (Drak), so the features that reach into every kind of record are built after Fabula's records exist; the delete confirmation's count moves from Fabula's last cut to the backlinks cut. Claude's proposed order for the whole line sits in the v1.7 section, waiting on Drak. **No line is open.**

=== ADDED 2026-10-24 (session 19, close: v1.7 goes to a fresh session) ===

**The order is locked** (Drak): r001, the small data fixes, Fabula, Stemma v2, then Pipes, about 32 cuts by Claude's estimate. Drak starts v1.7 in a fresh session, which opens the line with the `VERSION` bump in `inlining/build_inline.py` and then makes r001. Fabula's field lists get settled before its first cut. The before-code list holds only the optional manifest freeze. **No line is open.**

=== ADDED 2026-10-24 (session 20: v1.7 opens, and r001) ===

**v1.7 is open.** The `VERSION` bump to `'1.7'` opened the line (`46abb5b`), and r001, the carry-in cut, is passed by Drak and frozen; its tag, `v1.7_r001`, goes on its turnover. **What r001 struck from this file:** the product-text defects section, all three rows fixed and checked in the tree and headlessly (the Concordance help and its site page say the filter opens empty; the schema topic lists `longform` and `grid`, with `grid`'s real shape from `makeEmptyGrid`, and so does the site; the promoted Ephemeris event note no longer names a version), and Pipes item 5's cheap half: the default calendar is Common Year, Drak's pick over Default Calendar and Standard, and worlds saved before keep their stored name, his call over a rename on load. Six more strings went in at his call: the site's claim that Longform is top-level only (the builder offers it inside groups), the grid cell types in Field Types, its "Calendars & Dates" pointer, two version stamps in the help, and, after his first pass, the builder's grid hint. **New on the backlog:** a grid's starting shape, Drak's question from the pass, undecided. The before-code list is now the document-debt list, one optional item. Next: the small data fixes.

=== ADDED 2026-10-24 (session 20, later: r002) ===

**r002 is in**, passed by Drak and frozen; its tag, `v1.7_r002`, goes on its turnover. **What it struck from this file:** the entry-ref targets, flags 1 to 5, now in the built-in definitions and added to existing worlds once per field, and the bug planning them found: the template builder's target edits were undone whenever `resolveTemplateRefs` ran, and `migrate()`'s cleanup then deleted the references to a target that had dropped out. **What it filed:** the display finding for r003, references to records that aren't entries showing "(missing entry)", with Drak's calls on it; the Language / Glossary supersede's null id lists, found reading the code, for r004; and the dead-id gap under Tolerated. **The small data fixes are three cuts** (Drak, 2026-10-24): r002, r003, and r004, in that order. Next: r003.

=== ADDED 2026-10-24 (session 20, later: r003) ===

**r003 is in**, passed by Drak and frozen; its tag, `v1.7_r003`, goes on its turnover. **What it struck from this file:** the display of references to records that aren't entries, now right in the entry view, its groups and grids, Concordance's hover pane, and both exports, and maps as targets, with the map delete's count and scrub. **What it changed:** Drak's pass found the v1.4 gap in his own world, a Location › Parent that doesn't offer bodies, so the v1.4 path's entry says so, and r004 repairs every field that still lists the retired template. **What it filed:** the Glossopoeia delete gap, on the features backlog. Next: r004.

=== ADDED 2026-10-25 (session 20, past midnight: r004) ===

**r004 is in**, passed by Drak and frozen; its tag, `v1.7_r004`, goes on its turnover. **What it struck from this file:** the v1.4 upgrade path, the conversion fixed and worlds already upgraded repaired, with the Language / Glossary supersede's leftover and, by Drak's call at the first staging, the map promotion's. **What it changed:** the dead-id row under Tolerated says the repair has taken what it was kept for. **What it filed under Tolerated:** a map template of the user's own promoted before r004, and the switched Language / Glossary field in a world saved before r002. The small data fixes are done. Next: Fabula, its field lists first.

=== ADDED 2026-10-25 (session 20, later: r005, and Fabula's field lists in review) ===

**r005 is in**, passed by Drak and frozen; its tag, `v1.7_r005`, goes on its turnover. **What it struck from this file:** nothing that was on it. Other on multi-selects came out of the Fabula field-list review the same morning, built for every template by Drak's call, and went in as done. **What it changed:** the Letters entry says the field tables are redone in Drak's format and in review, one per message, his call, and the line's order has r005 ahead of Fabula. **What it filed:** the Templates help's stale half-width line, under v1.7, and CI's two warnings, under engineering. Next: Fabula's field tables, the Corpus first, then r006.

=== ADDED 2026-10-25 (session 20, later: Fabula's field lists settled) ===

**Fabula's field lists are settled**: Drak passed all fifteen tables, one per message, and `docs/fabula-spec.md` is the build sheet now, its section 1 saying what the review changed. **What it changed here:** the Letters entry. **What it filed:** corpus-level research notes on the features backlog, Drak's "per story for now". The spec's section 12 keeps one question for the Plot cut, what a scene's thread picker offers. Next: r006, its plan to Drak first.

=== ADDED 2026-10-25 (session 20, later: r006) ===

**r006 is in**, passed by Drak and frozen; its tag, `v1.7_r006`, goes on its turnover. **What it struck from this file:** nothing; Fabula's first cut is in, and its entry says so. **What it changed:** the document-debt item, which assumed Fabula's first cut would add modules; Fabula grows inside `27_trunk` until its view is in, by Drak's call, so the suggestion moves to the carve that gives it a module. Next: Fabula's second cut, its plan to Drak first.

=== ADDED 2026-10-25 (session 20, later: r007) ===

**r007 is in**, passed by Drak in its second staging and frozen; its tag, `v1.7_r007`, goes on its turnover. **What it struck from this file:** nothing; the Letters entry says the view's first cut is in. **What it filed:** nothing new; the questions r006 left for the cut that renders Fabula's reference fields go to r008's plan, and the handoff's NEXT banner names them. Next: r008, the story page, its plan to Drak first.

=== ADDED 2026-10-25 (session 20, later: r008) ===

**r008 is in**, passed by Drak and frozen; its tag, `v1.7_r008`, goes on its turnover. **What it struck from this file:** nothing; the Letters entry says the view's two cuts are in. **What it filed:** nothing; the two defects it found on the way, a group's reference subfields without the registered records and half-width labels hiding their help underline, went into the cut. Next: Fabula's next cut, the template builder or People, its plan to Drak first.

=== ADDED 2026-10-25 (session 20, later: r009) ===

**r009 is in**, passed by Drak in its second staging and frozen; its tag, `v1.7_r009`, goes on its turnover. **What it struck from this file:** nothing; the Letters entry says People is in. **What it filed:** the header's long titles, under v1.7, found in its screenshots and older than Fabula. **What it changed:** the document-debt note, since Fabula's view has been in since r008 and the carve that gives it a module is due. Next: Fabula's next cut, the carve or the template builder, its plan to Drak first.

=== ADDED 2026-10-25 (session 20, later: r010) ===

**r010 is in**, a pure carve that owes no pass; its tag, `v1.7_r010`, goes on its turnover. **What it struck from this file:** nothing. **What it filed:** the stale comment at the head of `28_fabula`, under v1.7. **What it changed:** the document-debt note, since the carve it waited for came without it. Next: r011, Fabula's next cut, the template builder's place its plan's first question.

=== ADDED 2026-10-26 (session 20, later: r011) ===

**r011 is in**, passed by Drak in its second staging and frozen; its tag, `v1.7_r011`, goes on its turnover. **What it struck from this file:** the stale comment at the head of `28_fabula`, which r011's cut rewrote. **What it filed:** the outline's keyboard, under v1.7, and a change lost in the auto-save's last 250 ms, under Tolerated, both found during the cut. **What it changed:** the Letters entry and the line's order say Outline is in. Next: r012, Plot, whose plan starts with the Threads pickers the spec left open.

=== ADDED 2026-10-26 (session 20, later: r012) ===

**r012 is in**, passed by Drak and frozen; its tag, `v1.7_r012`, goes on its turnover. **What it struck from this file:** nothing. **What it filed:** a scene picker's plain-text position, under Tolerated, found in its screenshots. **What it changed:** the Letters entry and the line's order say the positions are in, as r012, ahead of Plot. Next: r013, Plot, its calls made and in the spec.

=== ADDED 2026-10-26 (session 20, later: r013) ===

**r013 is in**, passed by Drak and frozen; its tag, `v1.7_r013`, goes on its turnover. **What it struck from this file:** nothing. **What it filed:** the plot point's name help, left as seeded so the seed held, and a comment that says which Fabula records open and stops at r011, both under v1.7. **What it changed:** the Letters entry and the line's order say Plot is in. Next: r014, Notes, then r015, Meaning, and r016, Plot Thread and Theme / Motif moved under Fabula, as Drak split them at the Notes plan (the spec's section 10).

=== ADDED 2026-10-26 (session 20, later: r014) ===

**r014 is in**, passed by Drak and frozen; its tag, `v1.7_r014`, goes on its turnover. **What it struck from this file:** the comment in `openEntryFromAnywhere` that stopped at r011, which r014's cut rewrote. **What it filed:** nothing. **What it changed:** the Letters entry and the line's order say Notes is in, with Meaning and the two templates' move after it. Next: r015, Meaning, its calls made at its plan and in the spec.

=== ADDED 2026-10-26 (session 20, later: r015) ===

**r015 is in**, passed by Drak and frozen; its tag, `v1.7_r015`, goes on its turnover. **What it struck from this file:** nothing. **What it filed:** nothing. **What it changed:** the Letters entry and the line's order say Meaning is in. Next: r016, Plot Thread's and Theme / Motif's move under Fabula, its calls made at its plan and in the spec.

=== ADDED 2026-10-26 (session 20, later: r016) ===

**r016 is in**, passed by Drak and frozen; its tag, `v1.7_r016`, goes on its turnover. **What it struck from this file:** nothing. **What it filed:** the index's story rows squeezing a long title at 900 pixels wide, found in r016's screenshots and older than the cut, under v1.7. **What it changed:** the Letters entry and the line's order say the move is in, and the order names the rest of the spec's cut plan after it. Next: r017, the template builder for Fabula's kinds and the core lock (the spec's section 10, item 9), its calls made at its plan and in the spec.

=== ADDED 2026-10-26 (session 20, later: r017) ===

**r017 is in**, passed by Drak and frozen; its tag, `v1.7_r017`, goes on its turnover. **What it struck from this file:** the plot point's name help, which seed 4 changed to "Its name; one added under a slot without a title takes the slot's name." **What it filed:** a disabled Reset Template looking like an enabled one, found in r017's screenshots and older than the cut, under v1.7; and a deleted field's hidden values outliving what they point at, found writing its turnover, under Tolerated. **What it changed:** the Letters entry and the line's order say the builder is in, and the order names the rest of the spec's cut plan. Next: r018, Chronometric's math extracted (the spec's section 10, item 10), its calls made at its plan and in the spec, then r019, Drak's roomier lanes and wrapped lane titles.

=== ADDED 2026-10-26 (session 20, later: r018) ===

**r018 is in**, passed by Drak and frozen; its tag, `v1.7_r018`, goes on its turnover. **What it struck from this file:** nothing. **What it filed:** the year ticks' 1.6-year step, found writing r018's check and older than the cut, under v1.7. **What it changed:** the Letters entry and the line's order say the extraction is in, and the lanes item names the functions r019 works through. Next: r019, Chronometric's lanes given room for their events and long titles wrapped, its calls made at its plan and in the spec.

=== ADDED 2026-10-26 (session 20, later: r019) ===

**r019 is in**, passed by Drak and frozen; its tag, `v1.7_r019`, goes on its turnover. **What it struck from this file:** Chronometric's lanes, given room for what their events draw and their long titles wrapped, and the year ticks' 1.6-year step, which rounds to 2 now. **What it filed:** a drag let go the instant after its last move landing short, found checking r019, and an era's name printing over a tick's label, found in its screenshots, both older than the cut, under v1.7. **What it changed:** the Letters entry and the line's order say the lanes are in. Next: r020, the Fabula timeline in story time (the spec's section 10, item 11), its calls made at its plan and in the spec.

=== ADDED 2026-10-26 (session 20, later: r020) ===

**r020 is in**, passed by Drak and frozen; its tag, `v1.7_r020`, goes on its turnover. **What it struck from this file:** nothing. **What it filed:** what Fabula's timeline leaves for later, an image export and editing on the timeline, at its plan. **What it changed:** the era-name item takes Drak's call at the plan, a cut of its own as r021, and the Letters entry and the line's order say the timeline's story time is in. Next: r021, Chronometric's era names on a line of their own above the year labels, its plan first, then r022, the timeline's telling order and the third mode.

=== ADDED 2026-10-27 (session 20, past midnight: r021) ===

**r021 is in**, passed by Drak and frozen; its tag, `v1.7_r021`, goes on its turnover. **What it struck from this file:** an era's name printing over a tick's label: Chronometric's era names sit on a line of their own above the year labels now, as Fabula's timeline's have since r020, and a name too long for its band is cut to fit it in both timelines, which r021's probe held at every state it reached, 1,735 checks. **What it filed:** Chronometric's chart drawn 36 pixels wider than its frame, found measuring a year label its screenshots showed cut off, older than the cut, under v1.7. **What it changed:** the Letters entry and the line's order say the era names are in. Next: r022, the timeline's telling order, with chapters and parts as bands, and the third mode, its plan first.

=== ADDED 2026-10-27 (session 20, later: r022) ===

**r022 is in**, passed by Drak after one revision and frozen; its tag, `v1.7_r022`, goes on its turnover. **What it struck from this file:** nothing. **What it filed:** Anachronia's lines per lane, at its plan, under what Fabula's timeline leaves for later. **What it changed:** the Letters entry and the line's order say the modes are in, and the Timeline tab fills the pane's width, Drak's call at the pass, where r020's staging had it in the reading column. Next: r023, Fabula's export, its help topic, and its page on the site, its plan first.

=== ADDED 2026-10-27 (session 20, later: r023) ===

**r023 is in**, passed by Drak and frozen; its tag, `v1.7_r023`, goes on its turnover. **What it struck from this file:** nothing. **What it filed:** nothing new; the timeline's image export stays under what the timeline leaves for later, r023's export having left it out by its plan's default. **What it changed:** the Letters entry and the line's order say the export is in. Next: r024, Fabula's help, the Fabula topic and the Views, JSON Save File Schema, and Templates topics, its plan first; then the site's Fabula page as a commit of its own.

=== ADDED 2026-10-27 (session 20, later: r024) ===

**r024 is in**, passed by Drak and frozen; its tag, `v1.7_r024`, goes on its turnover. **What it struck from this file:** nothing. **What it filed:** nothing new. **What it changed:** the Letters entry and the line's order say the help is in, and the two stale help lines above, the Templates topic's half-width bullet and the schema topic's celestial-body template, each filed for the next cut that touches the help, say that r024 touched the help and left them: its plan scoped it to Fabula's topics and the schema's `fabula` section, the scope was written from the spec's item and not against this file's rows on `26_home-data`, and neither line was raised to Drak. Both stand for the next cut that touches the help, and the doctrine has the lesson. Next: the site's Fabula page as a commit of its own, with no r-number, written from the help's text; then Stemma v2, its plan first.

=== ADDED 2026-10-27 (session 20, later: the site's Fabula page) ===

**The site's Fabula page is in** (`56874e0`, no r-number), passed by Drak; with it item 12 and Fabula's cut plan are done. **What it struck from this file:** nothing. **What it filed:** the seed's three "will" sentences, above, and `nameHelp` into the help's debt. **What it changed:** the Letters entry and the line's order say the page is in; the nav bar's overflow between 860 and 1,155 pixels, found in the page's screenshots and older than it, is fixed in the same commit (the hamburger takes over at 1,160 and under, Drak's call). Next: Fabula's split into a folder at its section headers, a pure carve, which Drak's call of 2026-10-25 owes now that Fabula is finished, as r025 ahead of Stemma v2 (his call, 2026-10-27); then Stemma v2, its plan first.

=== ADDED 2026-10-27 (session 20, later: r025) ===

**r025 is in**, a pure carve, which owes no pass; its tag, `v1.7_r025`, goes on its turnover. **What it struck from this file:** nothing. **What it filed:** nothing. **What it changed:** the Letters entry and the line's order say the split is in; Fabula is finished, its code in `28_fabula/` in twelve parts. Next: Stemma v2, its plan first.

=== ADDED 2026-10-27 (session 21: Stemma v2 planned) ===

**Stemma v2 is planned**, no r-number; the build sheet is `docs/stemma-v2-spec.md`, settled in a fresh chat one call per message, five calls and a name, every recommendation taken but one (the lines: Drak took the sticky-endpoint Line tool over separate connectors and a drawing layer). **What it struck from this file:** the kanban board as a second stemma layout, carried at r025 from the other chat's review; rejected at the plan's first call as the radial's own recursion drawn as columns. **What it filed:** nothing new; the to-do card and free text on a board are additive and wait in the spec's section 1, and the won't-have list is its section 12. **What it changed:** the Stemma entry is rewritten to the plan (Tabula, the board, beside Rota, the radial; the shape, the links, the manners, the cuts), and the line's order names the twelve cuts. Next: r026, Rota's edit path as pure transforms with `replaceStemma` and undo.

=== ADDED 2026-10-27 (session 21, later: r026) ===

**r026 is in**, passed by Drak and frozen; its tag, `v1.7_r026`, goes on its turnover. **What it struck from this file:** nothing. **What it filed:** nothing new. **What it changed:** the v1.7 section's count of cuts, and the Stemma entry says r026 is in, with `tools/stemma-parity` as the edit path's check. Next: r027, links past entries, the spec's section 5.

=== ADDED 2026-10-27 (session 21, later: r027) ===

**r027 is in**, passed by Drak and frozen; its tag, `v1.7_r027`, goes on its turnover. **What it struck from this file:** nothing. **What it filed:** wiki-links reaching entries and bodies only, under Pipes item 3, found by r027's probe. **What it changed:** the v1.7 section's count of cuts, and the Stemma entry says r027 is in. Next: r028, Fabula's Brainstorm, the Story seed's parked field pointed at `__stemmas__` with the seed to 5 and the three "will" sentences riding the bump.

=== ADDED 2026-10-27 (session 21, later: r028) ===

**r028 is in**, passed by Drak and frozen; its tag, `v1.7_r028`, goes on its turnover. **What it struck from this file:** the three seed sentences saying the timeline "will", which rode the seed's bump to 5 as filed. **What it filed:** nothing. **What it changed:** the v1.7 section's count of cuts, and the Stemma entry says r028 is in. Next: r029, Tabula I, the spec's sections 3, 4, and 6.

=== ADDED 2026-10-28 (session 21, past midnight: r029) ===

**r029 is in**, passed by Drak and frozen; its tag, `v1.7_r029`, goes on its turnover. **What it struck from this file:** nothing. **What it filed:** nothing new; the site's Stemma page and the help's Stemma topic are behind the cut (+ New Stemma, node counts, "Stemma has no undo", no tabula), by the plan, until the help cut (r036, r035 at the plan) and the site step after it. **What it changed:** the v1.7 section's count of cuts, and the Stemma entry says r029 is in. Decided at the cut, of the spec's section 13: default widths 280, 320 for an image, 300 for a column, a floor of 160 and a ceiling of 800; the rota's swatches for a note's color; the zoom step 1.15; the snap on; a new tabula opens empty. Two things the probe found and the cut took: the pane is `overflow: clip`, since a hidden pane is still a scroll container and a focused field inside it scrolled the pane under the camera; and the in-place editor commits as it's typed, a run one undo step, so the inspector beside it stays in step, where the spec said blur. Next: r030, Tabula II, columns and sub-boards, the spec's plan item 5.

=== ADDED 2026-10-28 (session 21, morning: r030) ===

**r030 is in**, passed by Drak and frozen; its tag, `v1.7_r030`, goes on its turnover. **What it struck from this file:** nothing. **What it filed:** nothing new. **What it changed:** the v1.7 section's count of cuts, and the Stemma entry says r030 is in and carries what Drak's pass asked for (2026-10-28): a drag grip, the sidebar's ⋮⋮ in a card's left margin and the only surface that drags (his 1A), and the drop into a sub-board (his 2), pulled forward as r031 of their own; and table-like columns (his 3B, with the card going to the lane it's dragged to), into Tabula IV, now r033, as lanes: inner columns side by side, each its own stack and title. The spec's plan shifts by one from r031 (the drawing layer r032, Rota's reorder r034, the Markdown export r035, the help r036, the carve r037), and its acceptance tests with it. Decided at the cut, of the spec's section 13: a board card counts everything below it, so the face and the index agree. One departure from the spec's section 6: a board card's title is edited in the inspector, since its double-click opens it. Found by the probe and taken into the cut: a stack item leaving the DOM for its ghost spilled the browser's text selection over the page, so a drag clears and holds off selection until release. Next: r031, the grip and the drop into a sub-board.

=== ADDED 2026-10-28 (session 21, later: r031) ===

**r031 is in**, passed by Drak and frozen; its tag, `v1.7_r031`, goes on its turnover. **What it struck from this file:** nothing. **What it filed:** nothing new. **What it changed:** the v1.7 section's count of cuts, and the Stemma entry says r031 is in. Decided at the cut, from Drak's answer to its one call (2026-10-28): the line decides where a card dropped on a board card lands, left or right beside the content, above or below it, the origin when the board is empty; and image cards give the grip its 14 pixels like every other card, with the overlay offered if he'd rather. Next: r032, the drawing layer, the spec's plan item 7, with the map parity check and the arrowhead-toggle call.

=== ADDED 2026-10-28 (session 21, later: r032) ===

**r032 is in**, passed by Drak and frozen; its tag, `v1.7_r032`, goes on its turnover. **What it struck from this file:** nothing. **What it filed:** Pipes' tenth item, from Drak's one ask at the pass ("make a note to add that arrow logic to Cartographia when we get to Pipes"): the end-sticking logic Tabula got at r032, a line's end put down on a card sticking to it and following it, brought to Cartographia with pins and stamps as the things an end sticks to. That reading is Claude's, since the arrowheads themselves reached the map's strip at r032 by Drak's own call; it's to be confirmed at Pipes' plan. **What it changed:** the v1.7 section's count of cuts, and the Stemma entry says r032 is in. Decided at the cut, of the spec's section 13: the strip exposes the arrowhead toggle (Drak, 2026-10-28); the sticky end's hit test is the card's box grown by six screen pixels (Drak's 6px, taken as screen pixels so the reach is the same at every zoom); a stuck end is drawn at the card's border toward the line's next point; a move keeps the stuck ends stuck, a point drag being how an end comes off; Freehand's ends are free, as the spec has it; the next line's defaults are parchment, three wide, smooth, no head. One wrinkle for the carve: the drawing-layer section's header sits between the canvas section's gestures hook and `TabulaCanvasView`, so the view reads under it; r037 can reorder. Next: r033, Tabula IV, lanes first.

=== ADDED 2026-10-28 (session 21, later: r033) ===

**r033 is in**, passed by Drak and frozen; its tag, `v1.7_r033`, goes on its turnover. **What it struck from this file:** nothing. **What it filed:** nothing new; the Markdown export (r035) now has a card's stacks and a row to write as nested lists under their card, noted in the handoff's banner for the cut. **What it changed:** the v1.7 section's count of cuts, and the Stemma entry says r033 is in. The cut grew at its review: Drak's four asks on 2026-10-28, each folded in before his pass (lanes inside lanes; stacks under cards, "columns inside columns" and "a column under a card" for an apprenticeship line under a named character; lane widths dragged on the divider between lanes, stored on the lane, the last taking what's left; rows with widths that grow to fit, so the apprenticeship tree draws as an org chart, vertical where his text tree was horizontal). Decided at the cut, of the spec's section 13: a column dropped on a plain column keeps that column's identity, its stack becoming an untitled first lane; a laned column dropped anywhere keeps its lanes; a lane left alone collapses; a group moves only the selected cards placed on the board it's dragged on, a stack item dragging alone; a copied stack item takes its column's width; Cards per row applies to the lanes directly below; cards don't nest by a card-on-card drop; a stacked card's Move out frees its stacks whole; a column under a card is a stack in the words; a divider drag stores the widths of the lanes between it and the last, and never widens the column; a lane's floor is 80; a card in a row is 200 wide and grows only for its own stacks; the need is drawn, never stored. Not done, said at the delivery: connector lines between a card and the cards in its stacks (the tray under the card carries the relation); Drak hasn't asked for them.

=== ADDED 2026-10-28 (session 21, later: r034) ===

**r034 is in**, passed by Drak and frozen; its tag, `v1.7_r034`, goes on its turnover. **What it struck from this file:** nothing. **What it filed:** nothing new. **What it changed:** the v1.7 section's count of cuts, and the Stemma entry says r034 is in. Decided at the cut, of the spec's section 7 and 14: in a locked world the view's keys (the walk, Enter, Backspace, Home, the zoom) and a press on a child still move the view, since section 6 allows pan, zoom, and drill in there, and the editing keys and the drag do nothing; the drag's slop is three screen pixels. Drak passed it with no asks.

=== ADDED 2026-10-28 (session 21, later: r035) ===

**r035 is in**, passed by Drak and frozen; its tag, `v1.7_r035`, goes on its turnover. **What it struck from this file:** nothing. **What it filed:** nothing new. **What it changed:** the v1.7 section's count of cuts, and the Stemma entry says r035 is in. Decided at the cut, of the spec's section 9: the root is the first list item under the document's heading; a sub-board's heading sits at its holder's level with its content one deeper; a board card in a column is marked in the list and its section follows the columns; a titled stack is a nested item, an untitled one is its cards; an empty column or lane writes `_(empty)_`. Drak passed it with no asks.

=== ADDED 2026-10-28 (session 21, later: r036) ===

**r036 is in**, passed by Drak and frozen; its tag, `v1.7_r036`, goes on its turnover. **What it struck from this file:** the three help lines filed since r005, r016, and the site's Fabula page: the Templates topic's half-width bullet, the schema topic's celestial-body template, and the schema topic's lag behind the site's JSON Structure page, each marked done above; the comment over `celestialBodies` in `09_trunk` that says the same as the second stays filed, since r036 touched the help alone. **What it filed:** two pins placed within about a second of each other sharing an id, found checking the ID conventions, above, for the next cut that touches pins. **What it changed:** the v1.7 section's count of cuts, and the Stemma entry says r036 is in. Decided at the cut: the help says the rota's inspector opens on the focal, since a click on a child drills in; the Markdown export's wiki-link is said to resolve in a longform field when its record is an entry or a body, since Pipes item 3 hasn't widened the resolver; pins are written `pin-{6-char}`, as the site has them. Next: the site's Stemma page, no r-number, then r037, the carve.

=== ADDED 2026-10-28 (session 21, later: the site's Stemma page) ===

**The site's Stemma page is in** (`130d2b4`, no r-number), passed by Drak. **What it struck from this file:** nothing. **What it filed:** nothing; the sideways overflow it found on the site, the JSON page under 1,270 pixels and Stamps and brushes and the colophon under 1,000, older than it, went into the commit, code blocks and the JSON page's narrow tables scrolling inside themselves. **What it changed:** the Stemma entry says the page is in. Next: r037, the carve, the plan's last; its plan settles the parts' names and whether `TabulaCanvasView` moves to the canvas's part.

=== ADDED 2026-10-29 (session 21, later: r037) ===

**r037 is in**, passed by Drak and frozen; its tag, `v1.7_r037`, goes on its turnover. **What it struck from this file:** nothing. **What it filed:** nothing. **What it changed:** the v1.7 section's count of cuts, and the Stemma entry says r037 is in and counts the spec's cuts at fourteen. r037 is a gather, from Drak's two calls at the carve's plan (2026-10-28): reading the seams found two of `21_stemma`'s seven headers away from their blocks, r026's transforms over the rota's canvas and r032's drawing layer over the tabula's, so (b) the tabula's canvas header went down to its canvas and (a) the rota's transforms below its canvas, position only, and the carve became r038. Next: r038, the carve, no pass owed, its parts named for their headers.

=== ADDED 2026-10-29 (session 21, later: r038) ===

**r038 is in**, a pure carve that owes no pass; its tag, `v1.7_r038`, goes on its turnover. **What it struck from this file:** nothing. **What it filed:** nothing. **What it changed:** the v1.7 section's count of cuts and the line's order, the Stemma entry says the plan is done, and Pipes' tenth item names the parts its helpers sit in now. Stemma v2 is finished, and with it Letters. The tags `v1.7_r033` through `v1.7_r036` sat on their cuts' commits, against the rule under Tags in the handoff; the lines that move each to its turnover commit went to Drak with r037's. Next: Pipes, its plan first.

=== ADDED 2026-10-29 (session 21, later: Pipes planned) ===

**Pipes is planned**, the build sheet `docs/pipes-spec.md`, in the session that finished Stemma v2: eight calls, one per message, each Drak's (option a every time), after the Pipes section's items were checked again against the r038 tree. Thirteen r-numbers, r039 to r051, then the site; Letters is finished. **What it struck from this file:** nothing. **What it filed:** five rows found by the check, above, each for the next cut that touches its file: a required Number field that can't validate, the Markdown export's Name History and its dates, the entry view's approximate date, Fabula's spec on filters, and the inline d3's version comment. **What it changed:** the Pipes entry says Pipes is planned; the Pipes section corrects three claims the check found wrong (item 1's one caller of `countInboundEntryRefs` is five; item 3's exports read entries' primary names only, not Name History and bodies; item 10's `anchors` has to be added to the map shape model) and says which cuts take each item; the auto-save row and the pin row say which cuts take them. Next: r039, saving.

=== ADDED 2026-10-29 (session 22: r039) ===

**r039 is in**, passed by Drak and frozen; its tag, `v1.7_r039`, goes on its turnover. **What it struck from this file:** two rows. Under Tolerated, a change made in the auto-save's last 250 ms lost to a reload or a closed tab, which a Save that writes at once and the write on a hidden page end: r039's probe reloaded and closed the tab straight after an edit, and the change held. Under v1.7, "A disabled danger button looks like an enabled one", which one rule in the shell's CSS ends (`.btn-danger:disabled`, dimmed, as its screenshot shows). **What it filed:** two lines r039 left stale, the help's 500ms warning and the site's reset that clears the history, above, for r051 and the site step. **What it changed:** the v1.7 section's count of cuts, the Pipes entry and the line's order say r039 is in, item 6 says what the browsers answered, and the `02_trunk` row's count. Its five details, Drak's calls at the cut (option a on the first four and b on the fifth), are in `docs/pipes-spec.md`, section 11, and the changelog. Next: r040, backups into the images folder, its plan first, with the rows on its files in view.

=== ADDED 2026-10-29 (session 22: r040) ===

**r040 is in**, passed by Drak and frozen; its tag, `v1.7_r040`, goes on its turnover. **What it struck from this file:** one row under v1.7, "A long title is cut off in the header bar", which the title's text in a span of its own ends (`.page-title-text`, `shell.html`), the ellipsis and the whole title on hover checked by r040's probe (H1) and in its screenshots. **What it filed:** what r040 left for r051 and the site step, above: the help's Back Up Your World and Browser Compatibility topics and the site's Settings page say nothing of the folder backups, and two of them say the reminder counts JSON exports only. **What it changed:** the v1.7 section's count of cuts, the Pipes entry and the line's order say r040 is in, and item 6 says what it does. Its four details, Drak's calls at the cut (option a on the first three and b on the fourth), are in `docs/pipes-spec.md`, section 11, and the changelog. Next: r041, the link index and the Referenced by lists, its plan first, with the rows on its files in view.

=== ADDED 2026-10-29 (session 22: r041) ===

**r041 is in**, passed by Drak and frozen; its tag, `v1.7_r041`, goes on its turnover. **What it struck from this file:** one row under v1.7, the entry view's single date leaving out an approximate date's "~", which r041 drew as a ride-along, checked by its probe (E7) and a planted copy. **What it filed:** a secret subfield of a group that isn't secret drawn on an entry's page while secrets are hidden, found checking r041's lists and older than them. **What it changed:** the v1.7 section's count of cuts, the Pipes entry and the line's order say r041 is in, and item 1 says what it does. Its four details, Drak's calls at the cut (option a on all four), are in `docs/pipes-spec.md`, section 11, and the changelog. Next: r042, the delete warnings and Concordance drawn from the index, its plan first, with the rows on its files in view.

=== ADDED 2026-10-29 (session 22: r042) ===

**r042 is in**, passed by Drak and frozen; its tag, `v1.7_r042`, goes on its turnover. **What it struck from this file:** two rows it closed, each checked by its probe: under Backlog: features, "Deleting a Glossopoeia record leaves entry references to it", since every delete now clears the stored links it counts; and under Tolerated, "A deleted parent language leaves its children's Descended From dangling", since a language's delete clears another language's Variety Of and Descended From. **What it filed:** a word's delete leaving the words that name it holding its id, in the first row's place; a merged edge's labels in Concordance ordered otherwise than r041's, found reading this turnover; and what r042 left for r051 and the site step. **What it changed:** the v1.7 section's count of cuts, the Pipes entry, the line's order, and item 1 say r042 is in; item 3 says how Concordance resolves a `[[link]]` since r042; and the Stemma v2 entry says where a stemma's links are read now. Its two details, Drak's calls at the cut (option a on both), are in `docs/pipes-spec.md`, section 11, and the changelog. Next: r043, one resolver for every `[[link]]`, its plan first, with the rows on its files in view and the question of Concordance's edges to Glossopoeia records.

=== ADDED 2026-10-30 (session 22: r043) ===

**r043 is in**, passed by Drak and frozen; its tag, `v1.7_r043`, goes on its turnover. **What it struck from this file:** three rows it closed, each checked by its probe: "The world's Markdown export writes a Name History field as "[object Object]"", whose Markdown now gives names and dates, and whose dates for an entry bound to another calendar are in that calendar (E3); "A secret subfield shows on an entry's page while secrets are hidden", which now hides with them and is marked SECRET when they show (S1, S2); and "Concordance can order a merged edge's labels otherwise than r041", whose labels come in their records' order again (C3). **What it filed:** what r043 left for r051 and the site step. **What it changed:** the v1.7 section's count of cuts, the Pipes entry, and the line's order say r043 is in, and item 3 says what a `[[link]]` reaches since r043 and tells its finding on what wiki-links reached as history. Its two details, Drak's calls at the cut (option a on both), are in `docs/pipes-spec.md`, section 11, and the changelog. Next: r044, the rename modal, its plan first, with the rows on its files in view and one more question: whether renaming a language, which a `[[link]]` names since r043, opens the modal as well.

=== ADDED 2026-10-30 (session 22: r044) ===

**r044 is in**, passed by Drak and frozen; its tag, `v1.7_r044`, goes on its turnover. **What it struck from this file:** one row it closed, checked by its probe: "Deleting a word leaves the words that name it holding its id", since the link index reads words' reference fields, so a word's delete counts and clears the words that name it (W1), as do the deletes of the other Glossopoeia records a word names (checked after the turnover's read), and a language's delete clears a daughter language's words that descend from its words (W3); and item 3, done. **What it filed:** a rename to a name another record answers to taking that record's `[[links]]`, in the struck row's place; a map record having no createdAt, under Tolerated, said with the staging as a defect and found writing this turnover to be the save format's; what r044 left for r051 and the site step; and the rename modal not holding the focus, found checking this turnover's independent read. **What it changed:** the v1.7 section's count of cuts, the Pipes entry, the line's order, and item 3 say r044 is in. Its three details, Drak's calls at the cut (option a on all three), are in `docs/pipes-spec.md`, section 11, and the changelog. Next: r045, the filter builder, the search fix, and All entries, its plan first, with the rows on its files in view.

=== ADDED 2026-10-30 (session 22: r045) ===

**r045 is in**, passed by Drak and frozen; its tag, `v1.7_r045`, goes on its turnover. **What it struck from this file:** one row it closed, checked by its probe: "A required Number field can never pass validation", since the required check reads a Number field's text as a number (`fieldNumberValue`), so a field holding 12 saves and an emptied one says it's required (N1). **What it filed:** a real-world Date field shown a day early west of UTC, in the struck row's place, older than the repository; the search reading a Long Text's markdown as typed, after it, a limit of r045's own search; the Date field said with the staging; two gaps the turnover's independent read found in the build, filed after those by Drak's call: a condition that can't name a subfield of a group inside a group, and a dropdown's Other text read as Other; and what r045 left for r051 and the site step. **What it changed:** the v1.7 section's count of cuts, the Pipes entry, the line's order, and item 4 say r045 is in, and items 1 and 4 tell how the entry list searched and filtered before it as history; and a blank line inside the Tolerated list is gone. Its three details, Drak's calls at the cut (option a on all three), are in `docs/pipes-spec.md`, section 11, and the changelog. Next: r046, saved lists in the world, its plan first, with the rows on its files in view.

=== ADDED 2026-10-30 (session 22: r046) ===

**r046 is in**, passed by Drak and frozen; its tag, `v1.7_r046`, goes on its turnover. **What it struck from this file:** three rows it closed, each checked by its probe: "A condition can't name a subfield of a group inside a group", since a condition offers a nested group's subfields under every label down to them and reads every row at every level (G1 to G3); "A dropdown's Other text reads as Other to a condition", since the typed text is among the dropdown's values and a condition finds it, Other still finding every entry with Other picked (G4a, G4, G5); and "The rename modal doesn't hold the focus", since Tab and Shift+Tab go round each record modal's own controls and the delete modal takes the keys at the window (G6 to G8). **What it filed:** what r046 left for r051 and the site step. **What it changed:** the v1.7 section's count of cuts, the Pipes entry, the line's order, and item 4 say r046 is in, and item 4 is done. Its two calls, Drak's at the cut (a and A), are in `docs/pipes-spec.md`, section 11, and the changelog. Next: r047, Export entries in JSON and CSV, its plan first, with the rows on its files in view.

=== ADDED 2026-10-30 (session 22: r047) ===

**r047 is in**, passed by Drak and frozen; its tag, `v1.7_r047`, goes on its turnover. **What it struck from this file:** nothing; no row on its files rode along. **What it filed:** Fabula's index hiding Export ↓ in Lock mode, where a template's page keeps it, which r047's Export entries… shares on Plot Thread and Theme / Motif; and what r047 left for r051 and the site step, found by the read of its turnover. **What it changed:** the v1.7 section's count of cuts, the Pipes entry, the line's order, and item 9 say r047 is in. Its two calls, Drak's at the cut (a and a), are in `docs/pipes-spec.md`, section 11, and the changelog. Next: r048, Import entries from JSON through the mapping screen, its plan first, with the rows on its files in view.

=== ADDED 2026-10-31 (session 22: r048) ===

**r048 is in**, passed by Drak and frozen; its tag, `v1.7_r048`, goes on its turnover. **What it struck from this file:** "Fabula's index hides Export ↓ in Lock mode, where a template's page keeps it", which rode along: in Lock mode Fabula's two sections keep Export ↓, its menu whole, and hide the rest (L2). **What it filed:** a dependent dropdown's Other, which its editor offers and the save and every load clear, found building it; and what r048 left for r051 and the site step. **What it changed:** the v1.7 section's count of cuts, the Pipes entry, the line's order, and item 9 say r048 is in. Its two calls, Drak's at the cut (a and a), are in `docs/pipes-spec.md`, section 11, and the changelog. Next: r049, Import entries from CSV through the same screen, its plan first, with the rows on its files in view.

=== ADDED 2026-10-31 (session 22: r049) ===

**r049 is in**, passed by Drak and frozen; its tag, `v1.7_r049`, goes on its turnover. **What it struck from this file:** "The entries import doesn't check a group's dependent dropdowns", which rode along: in a group's rows a dependent dropdown's choice now reads only where the row's parent choice offers it, the rest counted (G1, G2). **What it filed:** what r049 left for r051 and the site step. **What it changed:** the v1.7 section's count of cuts, the Pipes entry, the line's order, item 7, and item 9 say r049 is in, and the row on a dependent dropdown's Other says the import reads a group's rows by the cleanup too. Its three calls, Drak's at the cut (b, a, and a), are in `docs/pipes-spec.md`, section 11, and the changelog. Next: r050, sticky line ends on maps, the pin-id fix first, its plan first, with the rows on its files in view.

=== ADDED 2026-10-31 (session 22: r050) ===

**r050 is in**, passed by Drak and frozen; its tag, `v1.7_r050`, goes on its turnover. **What it struck from this file:** "Two pins placed within about a second of each other can share an id", which was its first part: a new pin's id takes the random part of `genId()`, and a load gives a pin whose id an earlier pin has, or that has none, a new one. **What it filed:** what r050 left for r051 and the site step. **What it changed:** the v1.7 section's count of cuts, the Pipes entry, the line's order, and item 10 say r050 is in. Its three calls, Drak's at the cut (a, a, and a), are in `docs/pipes-spec.md`, section 11, and the changelog. Next: r051, the help, its plan first, with the rows on its files in view.

=== ADDED 2026-10-31 (session 22: the Sweep planned, the spine manifest frozen) ===

**The Sweep is planned**, the build sheet `docs/sweep-spec.md`, after Drak asked before the help cut whether anything in v1.7 was still open and then to clear it out. Three calls, one per message, a, a, and a: a grid's starting shape as a cut of its own, Fabula's five tabled features to the backlog, and the spine manifest frozen through r050. **What it struck from this file:** nothing; it moved rows instead, the grid's row and the rename row from Backlog: features into v1.7, each with its cut, and Fabula's timeline row from v1.7 to the backlog. **What it filed:** the Meaning tab's grid of themes against scenes, in the backlog. **What it changed:** the v1.7 section has the Sweep's entry and its order; every open v1.7 row names the cut that takes it, r051 to r056 or the tooling commit; the rows on what r039 through r050 left say r057, where the help moved; Tolerated marks two of v1.7's rows for r055 and keeps four; the document-debt item is done; Fabula's spec line is corrected. Next: r051, fields kept and shown as entered, its plan first, with the rows on its files in view.

=== ADDED 2026-10-31 (session 22: r051) ===

**r051 is in**, passed by Drak and frozen; its tag, `v1.7_r051`, goes on its turnover. **What it struck from this file:** two rows it closed, each checked by its probe: "A real-world Date field shows the day before its date anywhere west of UTC", since `fmtDate` reads a bare date as the reader's own day (D1 to D6), and "The search reads a Long Text's markdown as typed", since the search reads a Long Text from the HTML the page draws for it (S1 to S11); and the save's half of "A dependent dropdown's Other is cleared by the save and every load" (O1 to O6), whose row now holds the import's half for r052 under a title of its own; and the JSON schema row's comment, now done. **What it filed:** the import's check on a real-world Date, which takes a day its month doesn't have, for r052; what r051 left for r057 and the site step; and, found by the read of its turnover, a filter on a Long Text reading every entry's text afresh at each apply, for r052 by Drak's call. **What it changed:** the v1.7 section's count of cuts and the Sweep entry. Drak's call on which earlier probes a cut runs is in the handoff's Content cut. Next: r052, entries files make the round trip, its plan first, with the rows on its files in view and its one open detail, a value holding a semicolon.

=== ADDED 2026-11-01 (session 22: r052) ===

**r052 is in**, passed by Drak and frozen; its tag, `v1.7_r052`, goes on its turnover. **What it struck from this file:** six rows it closed, each checked by its probe: "The entries import counts a dependent dropdown's Other as a value that didn't read" (O1, O2), "The entries import can't take a Multi-select's own values" (M1 to M3), "An entries file saved as UTF-16 no longer reads" (U2, U3), "A filter on a Long Text reads every entry's text afresh at each apply" (F1), "A few things the CSV export writes don't read back", the month holding a comma and the semicolon by Drak's call c (X1, X2, C1, S1, S2), and "The entries import takes a real-world Date on a day its month doesn't have" (D1, D2). **What it filed:** that a CSV written by r052's export can read several values back as one, and what r052 left for r057 and the site step. **What it changed:** the v1.7 section's count of cuts and the Sweep entry. Drak's call at the cut, c of three, is in `docs/sweep-spec.md`, section 9, and the changelog. Next: r053, renames say where the links go, its plan first, with the rows on its files in view and its one open detail, warn and allow or refuse the name.

=== ADDED 2026-11-01 (session 22: r053) ===

**r053 is in**, passed by Drak and frozen; its tag, `v1.7_r053`, goes on its turnover. It went into the Sweep at Drak's call a (2026-11-01), after writing r052's turnover found the join running on the export's own files and its read found it reached further. **What it struck from this file:** the row it closed, "A CSV written by r052's export can read several values back as one", checked by its probe's E1 to E4 and U1. **What it changed:** the v1.7 section's count of cuts; Pipes' entry, which moves the help to r058, and the order's entry and the Sweep's entry, which take r053 and move the later cuts up one; every row naming a later Sweep cut or the help, each moved up one, the help's rows now r058's; and what r052 left for the help, retitled for r052 and r053, with the import's split and the escape a spreadsheet writes. Drak's call is in `docs/sweep-spec.md`, section 3, and the changelog. Next: r054, renames say where the links go, its plan first, with the rows on its files in view and its one open detail, warn and allow or refuse the name.

=== ADDED 2026-11-01 (session 22: r054) ===

**r054 is in**, passed by Drak and frozen; its tag, `v1.7_r054`, goes on its turnover. Its open detail was decided at the cut, Drak's call a, warn and allow, and his call a after r053's turnover brought in r041's P2, the link index's time after an edit, which had no row here. **What it struck from this file:** the row it closed, "A rename to a name another record answers to takes that record's `[[links]]`", checked by its probe's R1 to R7 and U1 to U7. **What it changed:** the v1.7 section's count of cuts, and what r044 left for the help, retitled for r044 and r054 with the modal's new case. The calls and the index's time are in `docs/sweep-spec.md`, section 3, and the changelog. Next: the Sweep's tooling commit, then r055, Chronometric fits its frame, its plan first, with the rows on its files in view.

=== ADDED 2026-11-01 (session 22: the Sweep's tooling commit) ===

**The Sweep's tooling commit is in** (`2e6f88d`, no r-number, no tag). **What it struck from this file:** the row it closed, "The release build's inline d3 comment says 7.8.5", the comment now reading 7.9.0. **What it changed:** "CI's two warnings", whose first is done, the three actions at v7, and whose second stays as it was. `tools/chrono-parity` takes `--narrower`, which the Chronometric row's check for r055 needs. Next: r055, Chronometric fits its frame, its plan first, with the rows on its files in view.

=== ADDED 2026-11-01 (session 22: r055) ===

**r055 is in**, passed by Drak and frozen; its tag, `v1.7_r055`, goes on its turnover. **What it struck from this file:** the two rows it closed, "A drag let go the instant after its last move can land short", checked by its probe's D1 to D3, and "Chronometric's chart is drawn 36 pixels wider than its frame", checked by W1, W2, and E1 and by Chronometric's parity against r054 drawn 36 pixels narrower, identical at every step. **What it changed:** the v1.7 section's count of cuts. Next: r056, Fabula's screens, its plan first, with the rows on its files in view.

=== ADDED 2026-11-01 (session 22: r056) ===

**r056 is in**, passed by Drak and frozen; its tag, `v1.7_r056`, goes on its turnover. **What it struck from this file:** the four rows it closed: "The outline's keyboard moves rows, not the focus", checked by its probe's K1 to K6, and "Fabula's index squeezes a long story title at 900 pixels wide", checked by I1 to I5; and, from Tolerated, "A scene picker's option reads its position as plain text", checked by P1 and P2, and "A field deleted from one of Fabula's kinds keeps its values, and deleting what they point at doesn't clear them", closed by its plan's fix, a field Reset to Default brings back dropping its links to records that are gone, checked by R0 to R4; the values themselves stay while a field is gone, as a deleted template field's do. **What it filed:** in Tolerated, a built-in template's Reset to Default keeping a field's values through a change of its type, found planning r056 and filed by Claude's default in its plan. **What it changed:** the v1.7 section's count of cuts. Next: r057, a grid's starting shape, its plan first, with the rows on its files in view.

=== ADDED 2026-11-02 (session 22: r057) ===

**r057 is in**, passed by Drak and frozen; its tag, `v1.7_r057`, goes on its turnover. **What it struck from this file:** the row it closed, "A grid's starting shape", Drak's question at r001's pass, built as the Sweep's call 1 has it, a starting shape on the template's Grid field and a rows-by-columns prompt for a grid with none, and checked by its probe's fourteen checks. **What it filed:** what it left for r059 and the site step, the help's three topics and the site's two pages that don't yet say a grid can start from its template's shape; and the new Fabula records its turnover's read found starting empty, planned as r058 at Drak's call, the help moving to r059. **What it changed:** the v1.7 section's count of cuts. Next: r058, those records, its plan first; then r059, the help.

=== ADDED 2026-11-02 (session 22: r058) ===

**r058 is in**, passed by Drak and frozen; its tag, `v1.7_r058`, goes on its turnover. **What it struck from this file:** the row it closed, "A new story, act, chapter, scene, or plot point starts its grids empty, and so does a thread or theme made from a story's page", filed by r057's turnover, checked by its probe's nine checks. **What it filed:** nothing. **What it changed:** the v1.7 section's count of cuts. Next: r059, the help, its plan first, with the rows on what each cut left for it in view.

=== ADDED 2026-11-02 (session 22: r059) ===

**r059 is in**, the help, passed by Drak and frozen; its tag, `v1.7_r059`, goes on its turnover. **What it changed in this file:** the fourteen rows on what each cut left for the help and the site step now name the site step alone, their help lines done, each row's text unchanged; and the v1.7 section's count of cuts. **What it struck or filed:** nothing. Next: the site, without an r-number, written from the help, those rows naming its lines; then v1.7's finals.

=== ADDED 2026-11-02 (session 22: the site) ===

**The site is in**, `site/helloworld.html` written from the help r059 brought level, a commit without an r-number (`04cdb60`), passed by Drak; it goes live with v1.7's finals. **What it struck from this file:** the fourteen rows on what each cut left for the site step, each answered in the commit by a line rewritten or a paragraph beside it, r046's naming no site line. **What it filed:** nothing. Next: v1.7's finals.

=== ADDED 2026-11-02 (session 22, later: v1.7 shipped) ===

**v1.7 shipped 2026-11-02** from the r059 tree, the Letters and Pipes update: `Cartulary_v1.7.html` (sha256 `9b495ef338ab33dd`) and `Cartulary_v1.7_Readable.html` (`5cdf993176cb4d8e`), with the patch notes, the zip README, the itch page, the devlog, and the finals checklist filed in `docs/release-notes/`, and cartulary.world up with it. It's tagged `v1.7_r059` (`1c4c623`) and `v1.7_Release`. **No line is open.** **What it changed in this file:** the v1.7 section's opening line, which says the line shipped. Next: the close, which moves the v1.7 section and this file's v1.7 blocks to `roadmap-archive.md`; then v1.8, from the backlog above.
