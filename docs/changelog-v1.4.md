# Cartulary changelog -- v1.4 (FROZEN)

> Frozen per-version archive. v1.4 released 2026-05-18. Verbatim from the original single-file changelog.

---

## v1.4 — released 2026-05-18

Major release built around multi-calendar support. Kalendarium core shipped to GOLD on 2026-05-15. Cartographia, HTML export, and the Kalendarium polish cluster (calendar grid + moons + seasons, pulled forward from post-1.7 backlog after modularization was re-slotted) all landed in the working copy. Release artifacts (dual-build, README, itch page, devlog, zip) shipped 2026-05-18.

### Session 2026-05-18 (JSON Save File Schema documentation pass — last-minute catch)

Pre-upload audit caught that the in-app Home "JSON Save File Schema" section had drifted significantly — the schema doc was last meaningfully updated in v1.3 (when `stemmas` and `concordance` got mentioned at the top level without detailed shapes), and the v1.4 feature surface piled new state on top of that gap without addressing it. Drak's call: rebuild before any upload, no version bump.

Schema doc additions:

- **Top-level shape** — added `calendars` (v1.4 Kalendarium non-primary calendars) and `viewPrefs` (per-view UI state) as top-level keys. Reframed the optional/empty-default prose to cover all four optional top-level fields. Added a note that version-history snapshots live in IndexedDB and are NOT part of the JSON export.
- **`world` object** — added `currentMoment` field with full Y/M/D shape spec. Added prose paragraph on the calendar-position invariance rationale (stored in primary's frame; rebinds positionally on month structural edits). Reworded the migration-tracker-maps paragraph to acknowledge there are more than five trackers ("...plus additional per-feature migration tracker maps populated by migrate()").
- **`calendar` object** — added `week`, `celestials`, `seasons`, and `anchor` fields with full type specs. Mentioned `description` (was undocumented). Added prose paragraph on v1.4 additive nature, tenths-precision cycleDays, season wraparound semantics, overlap and gap rules.
- **NEW section: `calendars` array** — detailed schema for v1.4 non-primary calendars, including the absoluteDay conversion math and the `cartulary_calendar_export: 1` envelope pattern with Skip/Replace/Rename collision modal.
- **`entries` array** — added `calendarId` field with prose paragraph covering which surfaces it binds (calendar-date, calendar-date-range, name-history rows, spouse marriedOn/endedOn, group subfields recursively). Noted per-field overrides aren't supported in v1.4.
- **NEW section: `stemmas` array** — full detailed schema for stemma documents (v1.1 feature, never documented in detail). Covers freeform vs linked node variants, slot semantics, drill-down behavior. Closes a deferred v1.3 backlog item.
- **NEW section: `concordance` object** — full detailed schema (v1.3 feature, never documented in detail). Coordinate-space note, stale-entry scrubbing behavior. Closes a deferred v1.3 backlog item.
- **NEW section: `viewPrefs` object** — full detailed schema covering `timelineZoomLevel` (v1.3+), per-view calendar selectors (v1.4 Kalendarium), per-calendar grid year (v1.4 Kalendarium grid view). Notes the umbrella nature for future per-world view preferences.
- **ID conventions** — added stemmas (`stem-`), stemma nodes (`n-`), non-primary calendars (`cal-`), celestials (`cel-`), seasons (`sea-`) to the prefix list.

Schema doc completeness audit (a roadmap backlog item deferred since v1.3) effectively closed by this pass — both v1.3 and v1.4 gaps addressed.

Working-copy size after the schema additions: 1,341,241 bytes (+8,827 bytes vs pre-schema-doc working copy). Parse-gate green. Dual-build re-run; new precompiled artifact 1,982,518 bytes, new readable artifact 5,300,651 bytes. Both validate. All three artifacts restaged at `/mnt/user-data/outputs/`.

No version bump. v1.4 ships with the corrected schema docs; itch upload had not yet happened when the gap was caught.



Final-pass session before release prep. Closed out the visual pass's last outstanding item, corrected moon-phase math to a centered-bucket convention for downstream Ephemeris alignment, added tenths-precision to celestial cycle inputs, refreshed five Home Usage/Workflow topics to reflect the v1.4 feature surface, and ran a comprehensive bug audit (eight findings; six fixed, two punted with documented reasoning).

#### CalendarGridView restructure (closing out the visual pass)

Closing-out item from the visual pass's "where we left off" list. Outer card removed; return wrapped in a React Fragment. Controls container (year stepper + season legend) sits at top with `marginTop: -4` overlap merge so it visually joins the calendar row above. Months grid free-floating below — no outer container constraining the zoom transform, so ctrl+scroll zoom no longer breaches a card boundary. Day-container substrate uses `var(--surf)` for a quiet tonal step over the `var(--surf2)` month card (confirmed with Drak before applying). Cell popover stays sibling, anchored below the grid.

#### Moon phase math switched to centered-bucket convention

`computeMoonPhase` updated from `floor(fraction * 8)` to `floor((fraction + 1/16) * 8) % 8` so phase events sit at bucket **centers** rather than starts. Pre-fix, displayed phases were ~half a bucket late (~1.3 days late on a 21-day cycle, ~1.8 days on a 29.5-day cycle). For a 21-day cycle starting at offsetDays=1, the first Full now lands on Day 11 (was Day 12). One-line code change plus inline comment block documenting rationale for future Ephemeris work where computed phase event times must align with bucket centers. Math verified: bucket-perfect for the 21-day reference case. Pre-stable feature surface; no migration concern. New doctrine entry: "Centered-bucket convention for quantized continuous celestial values."

#### Tenths-precision cycleDays for celestial bodies

`cycleDays` for moons now accepts tenths (29.5-day synodic month, 27.3-day sidereal, etc.). UI: `step="0.1"` + `parseFloat` + clamp `>= 1` + `Math.round(x * 10) / 10` enforce the invariant on writes. Migration: `Math.floor` replaced with the same tenths rounding (preserves integers as identity, normalizes out-of-spec precision like 29.5499 → 29.5). `offsetDays` stays integer because it's a snap-to-day anchor. `computeMoonPhase` math needed no changes — modulo and division were already float-safe. New doctrine entry: "Cycle-length fields take tenths precision; phase-offset fields stay integer."

#### Home Usage/Workflow documentation refresh — five topics

- `save-share` — added paragraph on Shareable HTML export (accessed from the Project page).
- `backup-strategy` — added Version History paragraph: 5-minute throttle, 10-slot FIFO for auto-snapshots, manually-pinned snapshots that don't auto-evict, doesn't substitute for `.json` export to disk.
- `calendars` → renamed to `kalendarium` (id rename) and rewritten end-to-end: multi-calendar via anchor.absoluteDay, per-entry binding, grid zoom, celestials with tenths-precision cycle and centered phase math, Current Moment, per-entry calendar binding workflow.
- `maps` + `map-usage` → merged into single `cartographia` topic. Covers the view-level promotion, ctrl+scroll zoom (added this session in the visual pass), time-aware pin filtering.
- `templates` + `template-usage` → merged. Expanded Template Builder coverage for the v1.3 surface (show-when, half-width pairs, other-text reveal, cascade chains, entry-ref scope/filters).

#### v1.4 final bug audit — six fixes

Eight findings flagged during the comprehensive audit pass. Six landed; two punted with documented reasoning.

Fixed:

01. **Map zoom wheel listener never attached when image loaded after mount.** Both `MapView` and `MapEditor` had `useEffect(..., [])` for the wheel listener; their `if (!imageUrl) return <map-empty>` early return meant a fresh map (no image yet) never bound the wheel listener even after the image loaded. Fixed by changing deps to `[imageUrl]` in both components; `MapEditor` required reordering so `imageUrl` was declared before the effect. New code-watch entry pinned: "Wheel-listener useEffect deps must include the ref's gating value."
02. **`collectCalendarDateUsages` undercounted vs `reframeDateAcrossStructure`.** Walker missed name-history entries, spouse marriedOn/endedOn, and world-level currentMoment — meaning the pre-deletion warning told users fewer surfaces would be affected than actually were. Walker extended to match the reframe surface set; `currentMoment` threaded through `App → KalendariumEditorView → CalendarEditor` (only passed when editing primary, since currentMoment is primary-bound by doctrine). New doctrine entry "Date-surface walkers must stay in lockstep" + matching code-watch pattern.
03. **Pre-restore safety snapshot failure was silent.** `snapshotCreate` could return null (storage full, structured-clone failure) and restore would proceed without an undo path. Now checks the return value and prompts user via native confirm with a cancel option.
04. **`viewPrefs` keys scrubbed silently on calendar delete.** Cartographia, Timeline, Vertical Timeline, Chronometric, and Linea all carry per-calendar viewPref entries; calendar deletion cleared them silently. Now collects affected view names and surfaces them via flash so the user knows what was reset.
05. **Pre-restore pinned snapshots accumulated forever.** Repeated restores would pin a new "Before restore from \<ts\>" each time without an evict path. Added `SNAPSHOT_PRE_RESTORE_CAP = 3` + `snapshotEvictPreRestore()`. `snapshotCreate` now takes a `kind` param; pre-restore snapshots tagged `kind: "pre-restore"` for evict targeting. Pre-reset and pre-import don't need a cap because they wipe history first.
06. **CalendarGridView day-name row and day-grid lacked shared substrate.** Cosmetic: the weekday header row was rendering against the page background while the day grid had its own surface, creating a visual seam. Merged into a single `var(--surf)` wrapper.

Punted with reasoning:

- **IndexedDB quota exceeded silent fail.** Quota near-impossible to hit on realistic Cartulary worlds; surface cost not justified.
- **Native `confirm()` on calendar delete.** On reflection consistent with codebase pattern. DestructiveOpModal is reserved for world-replacement operations (Reset, Import, Restore); calendar delete is medium-stakes and matches the native-confirm convention used elsewhere.

A third flagged item — HC theme stronger seasonal tints — was determined to be feature-aligned with HC purpose rather than a bug.

#### Doctrine additions

Four new principles + two new code-watch patterns (see doctrine doc):

- **Centered-bucket convention for quantized continuous celestial values.**
- **Cycle-length fields take tenths precision; phase-offset fields stay integer.**
- **World-replacement operations fire pre-op pinned safety snapshots.** Reset, Import, Restore each pin a snapshot before swapping state. Reset and Import wipe prior history; Restore preserves it. Pre-restore caps at 3 via `kind: "pre-restore"` tagging + evict helper.
- **Date-surface walkers must stay in lockstep.** `reframeDateAcrossStructure` and `collectCalendarDateUsages` must walk the same surface set.

Code-watch patterns: **date-surface walker drift** (grep both walkers when adding a new date-bearing field), **wheel-listener useEffect deps must include the ref's gating value** (early-returns past a ref make `[]` deps fail forever).

#### Status

Working-copy size: 1,332,414 bytes. Parse-gate green. Staged at `/mnt/user-data/outputs/Cartulary_v1.4_Working.html`. **v1.4 is feature-complete. All release blockers resolved.** Next session: release prep (dual-build, README, itch.io page text, devlog 1.4, changelog promotion to released date, zip).

### Sessions 2026-05-17 (continued) and 2026-05-18 (early) — visual design pass

Audit-and-implement pass across eleven Cartulary surfaces in response to the LegendKeeper critique ("looks like a 2014 hobbyist project"). Cormorant Garamond + DM Sans typography pairing was acknowledged as competent — the issue was the chrome around it. Sequenced chrome-first / tokens-first; one surface per session per "scope per session" framing.

#### Framing — five decisions resolved 2026-05-17

1. **Rubric:** every proposed change passes two gates — (a) does this reinforce the scriptorium register, or chase contemporary SaaS? (b) is this executable from CSS-level spec without bespoke illustration or motion design?
2. **Illumination ceiling: restraint + whitelisted illumination.** Pure restraint as baseline; decorative touches allowed only on a fixed whitelist (three slots).
3. **Sequencing chrome-first / tokens-first.** Order: design tokens → sidebar → entry form → modals → template builder → Linea + Concordance → Stemma → Chronometric → Cartographia → Kalendarium.
4. **Per-surface output format default:** brief diagnosis (1–3 bullets), 2–3 prioritized fixes with concrete CSS targets, implementation order. Mockups by request only.
5. **Scope per session:** audit-implement per surface; one surface per session.

#### Design token system

Fifteen tokens defined in `:root` — radius scale (`--r-sm/md/lg/pill`), spacing scale (`--s-1` through `--s-5`), shadow scale (`--shadow-sm/md/lg/xl`), timing (`--t-fast/base`). Plus `--bg-panel` added later in the pass to resolve transparent-rendering at six spot-styled panel sites. Under `[data-theme="high-contrast"]`, all four shadow tokens nullified to `none` — **HC=flat doctrine** locked on accessibility grounds. Pin shadows exempt from HC=flat (content-level elevation over user images, not chrome elevation; documented decision).

#### Surface-by-surface implementation (eleven surfaces)

01. Design tokens — shipped (above).
02. Sidebar — tokens applied; scrolls-icon ornamental divider (Noun Project asset 8015583, royalty-free, applied at 20px with `--text-dim` color via CSS mask); structural split into `.sidebar-pinned` + `.sidebar-scroll`; `.world-hdr` border-bottom removed; `.nav-item:focus-visible` gets `--accent-dim` left border for keyboard nav. Whitelist slot #3 activated.
03. Entry form — tokens applied; idle/focus border pattern (idle `--border`, focus `--accent`; luminance shift 40%→70% survives all colorblindness types); `.form-title-input` excluded to preserve its ruled-line affordance (manuscript-evocative, deliberate).
04. Modal dialogs — border tokenized to `--border`, box-shadow `var(--shadow-xl)`. `.modal-actions` border-top removed (cumulative padding handles region break). `.modal-hdr` border-bottom uses `--accent-dim` for the gold-leaf hairline header band. Whitelist slot #2 activated.
05. Template builder — `.tpl-field-row` border removed; `.section-hdr` underline restored after a global removal had cross-cutting consequences.
06. Linea (FamilyView) — `.family-controls` + `.family-stats` shadows/padding tokenized. Note: Linea uses FamilyView with `.family-*` classes (correction from earlier handoff that misidentified Linea as using GraphView).
07. Stemma — **skipped.** Uses inline styles; no meaningful chrome surface to audit without markup overhaul. Documented as conscious skip.
08. Concordance (GraphView) — `.graph-controls` + `.graph-hover-pane` shadows/padding tokenized.
09. Chronometric — borders removed, `.chrono-filter-row` radius tokenized.
10. Cartographia — `.map-time-controls` border removed. Pin shadows left hardcoded (content-level elevation, HC-flat exempt).
11. Kalendarium index — `--bg-panel` token added (repairs the six transparent-rendering sites); CalendarGridView restructure attempted and reverted mid-refactor for clean handoff. **CalendarGridView restructure landed in the following session** (see 2026-05-18 entry above).

#### Behavioral additions folded into the pass

- **Ctrl+scroll zoom on Kalendarium CalendarGridView** (range 0.5–2.5, factor 1.15, simple transform-scale).
- **Ctrl+scroll zoom on Cartographia MapView + MapEditor** (range 0.5–4, factor 1.15, wrapper-width approach to play nicely with `.map-canvas` `overflow:auto`).

Both ephemeral — not persisted in viewPrefs.

#### Whitelist activation count: 2/3

Slot #1 (world name area — illuminated initial or display-face flourish) remains unactivated. Deferred for a future pass.

#### Status

Visual pass substantially complete by end of 2026-05-17 continued session; CalendarGridView restructure closed out 2026-05-18. Working-copy size at end of pass: 1,316,781 bytes.

### Sessions 2026-05-17 (continued) — version history / undo recovery

Major feature shipped as one of the two pre-release blockers identified at the end of the scale-ceiling session. Snapshot-based undo for catastrophic state changes.

#### Feature surface

- **Auto-snapshots** fire on content change throttled to one per five minutes, capped at 10 FIFO. Period-interval check runs every 30 seconds and keys on `world.updatedAt` so idle time doesn't accumulate snapshots.
- **Manual snapshots** are user-created and pinned by default — never auto-evicted from the 10-slot pool. Restore UI on the Project page lists chronologically; pin/unpin per snapshot; restore-from-this button.
- **Pre-op safety snapshots** fire on every world-replacement operation. World Reset, World Import, and Snapshot Restore each pin a snapshot before swapping state, labeled "Before reset" / "Before import" / "Before restore from \<ts\>". Reset and Import wipe prior history first (the new world's history would be irrelevant); Restore preserves history so the rollback is itself reversible.
- **`DestructiveOpModal`** replaces native `confirm()` for Reset and Import. Catastrophic operations get the heavyweight modal; medium-stakes operations keep native confirm per codebase convention.
- **Snapshot key format:** `snap-{timestamp}-{rand4}`.

#### Doctrine additions

- **Manual snapshots are pinned by default; auto-snapshots cap at 10 FIFO; throttle is 5 minutes; period interval is 30s; content-change detector keyed on world.updatedAt.**
- **Pre-op safety snapshots on world-replacement operations** — Reset, Import, Restore.
- **`DestructiveOpModal` replaces native `confirm()` for world-replacement ops.** Medium-stakes operations keep native confirm.
- **Migration pipeline must run on restore.** Snapshots stored at one schema version may load against newer code; restore path runs the migration framework before swapping state.

### Session 2026-05-17 (scale-ceiling measurement)

Validation activity, not a code feature. Built measurement infrastructure on a smoketest branch, ran four sweeps + variance study, drafted itch.io claim text. No changes to canonical working copy or shipping code; all instrumentation is STRESS_MODE-gated and lives in the smoketest branch source.

#### Measurement infrastructure

Synthetic world generator (`build_world.py`) with four archetypes (worldbuilder, genealogist, gm, collector), preferential-attachment ref-graph construction honoring template refTemplate constraints, random-noise PNG image generator with controlled size distribution. Playwright-driven harness with perf marks injected at five sites (cold-boot, world-import, export-json, export-html, plus harness-side longtask observer via PerformanceObserver). CDP `Emulation.setCPUThrottlingRate` at 1×/4×/6× tiers approximating modern desktop / mid-tier laptop / aging hardware. World content delivered to the harness via local HTTP server + symlink (bypasses Playwright's CDP message-size limit for image-heavy 200MB+ worlds).

#### Smoketest branch additions to working copy

Instrumentation added to `/home/claude/cartulary.html`, all gated behind a `STRESS_MODE` flag with four activation paths (`window.__CARTULARY_STRESS` global, `?stress` query param, `#stress` URL hash, `localStorage.cartulary.stress`). Production behavior unchanged when flag off.

- **`stressMark` / `stressMeasure` helpers** — zero-cost no-ops when STRESS_MODE off.
- **Perf-mark sites:** cold-boot wrapping the mount effect; world-import wrapping importWorld's load+state path; export-json wrapping exportWorld; export-html wrapping the HTML export pipeline.
- **`window.__cartularyStress` harness API** exposed via plain conditional (not useEffect — see doctrine). Surface: importWorld, exportWorld, exportHtml, setupImageFolder, populateImageFolder (writes to OPFS), clearImageFolder, getMarks, lastHtmlExportBytes, appReady. Methods runs only when STRESS_MODE is on.
- **OPFS shim for headless FSAA testing.** `setupImageFolder` branches on STRESS_MODE — uses `navigator.storage.getDirectory()` (origin-private FS) instead of `showDirectoryPicker()` (which needs user gesture and would fail headless). Returns a FileSystemDirectoryHandle with the same shape, so downstream code is unchanged.
- **`verifyHandlePermission` updated** to treat permission-less handles (OPFS) as implicitly granted — OPFS handles don't expose queryPermission/requestPermission.
- **`dbSetExtra(DB_HANDLE_KEY, handle)` wrapped in try/catch** under STRESS_MODE to tolerate structured-clone failures with OPFS handles. Production path unchanged.

#### Sweeps executed

- **Sweep 1: entries × throttle, no images, inline mode.** 6 entry counts (100 to 10,000) × 3 throttle tiers = 18 cells. World-import scales sublinearly with entry count; HTML export near-linear (~7.4KB per entry output). At 10k/6×: 29-second HTML export, 39 seconds cumulative main-thread blocking. Painful but completes.
- **Sweep 2: image axis × throttle, fixed 1k entries, inline mode.** 4 image counts (0/25/100/250) × 3 throttle tiers = 12 cells. World.json scales linearly with image bytes; inline 250-image world is 240MB. At 250/6×: 18s import + 18s JSON export + 21s HTML export.
- **Sweep 3: cold-boot with preloaded IDB.** User flow simulated: import a world (writes to IDB via normal save path) → reload → measure cold-boot on second load. 4 entry counts × 2 throttle tiers = 8 cells. 10k entries adds ~1.4s to startup at 1×, ~4.8s at 4×.
- **Sweep 4: FSAA-mode image axis × throttle.** Mirrors sweep 2 conditions through the OPFS shim. World.json stays tiny (5-7MB) regardless of image count. World-import and export-JSON dramatically faster than inline (25× and 127× respectively at 250 images / 1×). HTML export slightly slower in FSAA (1.3-1.6× under throttle) — fetch-and-encode cost on demand. HTML output bytes identical between modes.
- **Variance study.** Two cells (1000e and 10000e at 1×), each measured 5 times across three seeds (s=0 r1-3 + s=1 r1 + s=2 r1). Coefficient of variation 1.5-3% for the main metrics; cold-boot noisier at ~15% CV because absolute values are small. Single-seed estimates valid for the headline numbers.

#### Itch.io claim language

Three forms drafted: one-bullet (feature list), paragraph (page description), FAQ pair (folder-mode tradeoff explained). All anchored to literary scale comparisons rather than benchmark scores. Full Cartulary catalogs: Shakespeare's complete works ~1500-2000 entries, Tolkien's complete legendarium (LOTR + Hobbit + Silmarillion + History of Middle-earth) ~2000-3500, A Song of Ice and Fire across five books ~3000-4500. All under 5k; the 10k test ceiling is roughly double the most exhaustive single-author fictional universe in modern fantasy.

Speedometer 3 calibration scrapped. Drak (NOC engineer) hadn't heard of it; reasonable inference that itch.io browsers won't either, so anchoring to it adds no clarity.

#### Doctrine additions

Two new entries (see doctrine doc):
- **Stress instrumentation must be flag-gated and not hook-bound.** Plain conditional blocks past any early-return, never useEffect that captures variables declared after an early-return (TDZ on the early-return path). Hooks before early-returns also violate React's hook-order invariant.
- **Performance claims use scope comparisons, not hardware anchors.** Anchor to recognizable scale references (literary universes, real-world entity counts) rather than benchmark scores the audience doesn't recognize.

#### Status

Working copy size: 1,271,636 bytes (up from 1,266,020 at start of session). All instrumentation gated. Parse-gate green. Smoketest build staged at `/mnt/user-data/outputs/Cartulary_v1.4_Smoketest.html`.

Outstanding decision: keep instrumentation as gated debug surface in shipping v1.4, vs strip the working copy back to canonical before release. Drak's call. Strip cost is moderate (revert the additions documented above); keep cost is minor source bloat with zero runtime impact under flag-off. *Resolved as RIP in the version-history session — working copy never carried the instrumentation through to v1.4.*

Deliverables staged in `/mnt/user-data/outputs/stresstest/results/`: SUMMARY.md, final-writeup.md, handoff.md, per-sweep CSV/JSONL files, variance_runs.csv. Generator and harness Python code in `/mnt/user-data/outputs/stresstest/{generator,harness}/`.

### Session 2026-05-16 (continued — Kalendarium bug audit, QA consolidation, moon-phase correction)

Bug audit, QA-sheet consolidation, visual-format pinning, and a moon-phase QA correction. No new features; pure polish on the v1.4 cluster ahead of release prep.

#### Kalendarium bug audit — 3 bugs found and fixed

01. **`stepYear` stale closure (regression risk).** Multiple rapid +/- clicks in CalendarGridView's year stepper used the same closure-captured `year` value, collapsing increments. Fixed via functional setState (`setYear(prev => prev + delta)`) and a separate `useEffect` on `[year]` to handle the viewPrefs persistence write — decouples pref-write from the stepper handlers and makes each year change reactive. New QA test GV-007 verifies rapid clicks register each increment.

02. **`viewPrefs.kalendariumGridYear` stale-key cleanup on calendar delete.** The existing per-view selector cleanup logic (`Object.keys(viewPrefs).forEach(k => { if (viewPrefs[k] === calendarId) viewPrefs[k] = null; })`) handles flat id-valued keys (familyCalendarId, timelineCalendarId, etc.) but doesn't touch the kalendariumGridYear MAP keyed by calendar id. Stale entries accumulated indefinitely after deletes. Fixed in both `deleteCalendar` and `convertAndDeleteCalendar` with explicit `delete nextMap[calendarId]`. New QA test SM-011 verifies cleanup invariant.

03. **`currentMoment` not reframed on primary structural edits.** Per doctrine, `state.world.currentMoment` lives in primary's Y/M/D frame and follows calendar-position invariance — same rules as entry-stored dates. But `updateCalendarStructured` only reframed entry dates via `reframeEntryDatesAcrossStructure`, never touched currentMoment. Result: after a primary structural edit (month add/remove/reorder), currentMoment's stored monthIndex/day could reference a position that no longer exists, producing semantically-wrong output in consumers (auto-age calculation, grid-view initial year). Fixed by calling `reframeDateAcrossStructure(s.world.currentMoment, oldCal, newCal)` when `calId == null && structural` within `updateCalendarStructured`. Non-structural primary edits (name, era, week/celestials/seasons changes) intentionally leave currentMoment alone. Additional-calendar structural edits don't affect currentMoment. New QA test SM-012 verifies the reframe via rename + delete-month flow.

Two pre-existing edge cases reported but not fixed: (a) `absoluteDayToCalendarDate` with empty months returns `{monthIndex: 0, day: dayOfYear+1}` — practically unreachable since editor prevents deleting last month, confirmed by Drak; (b) collision-modal `confirmInFlight` ref doesn't unlock in skip/replace/rename success paths but the next modal opening resets it, so latent only.

#### Moon phase QA correction — code right, QA wrong

Drak ran moon QA tests during this session and reported phases were "off" with image evidence. Investigation: the code was implementing 1-indexed lunar tradition correctly (Day 1 = phase 0 new, Day 15 = full when cycleDays=28). The QA test expectations I had written used folk-math intuition ("Day 14 is half of 28 so it must be full") which doesn't hold — Day 1 is at phase 0 and Day 29 at next-cycle's phase 0, so the midpoint between them lands on Day 15, not Day 14.

Fixed MR-001, MR-002, MR-003 expectations to match actual bucket math computed explicitly. MR-001 now tests transitions at each bucket boundary (Days 4/5, 7/8, 11/12, 14/15, 18/19, 21/22, 25/26) rather than asserting wrong midpoint values. MR-002's awkward "moon was new 14 days BEFORE absoluteDay 0" wording replaced with clearer "with offset=14, the moon is new on Day 15; Day 1 sits half a cycle before that new moon, so it shows full." MR-003 (cycleDays=10) corrected — Day 5 isn't full, Days 6-7 are.

New doctrine entry: "Moon phase day boundaries follow 1-indexed lunar tradition" pinned alongside the existing 5-phase taxonomy entry. Documents the formula, the bucket transitions for cycleDays=28, and explicitly directs future QA-writing to compute bucket positions from the formula rather than rely on symmetric-midpoint intuition. Real-world ~29.5-day synodic cycle context noted so the convention has historical grounding.

#### QA sheet consolidation — 98 → 72 tests (26 cuts)

Drak called out that the original redundancy-removal pass missed real duplicates. Second pass identified 26 cuts across all 6 tabs:

- **Schema-Migration (14 → 12):** Merged 4 defensive-import tests (bad daysPerWeek, mismatched dayNames length, bad cycleDays, all-blank dayNames) into 2 omnibus tests; cut "export contains fields" (covered by expanded round-trip test).
- **Editor-UI (19 → 14):** Merged 3 "section visible" presence checks into 1; merged upper/lower clamp pairs for daysPerWeek and startDay/endDay; combined celestial-persistence + day-name-persistence into "all calendar-extension inputs persist."
- **Grid-View (33 → 24):** Merged toggle expand/collapse, initial-year tests, stepper + Jump-to-N, ↺ Current visibility + jump; folded leading-blanks into continuous-week; folded date-index re-cook into cell-click-opens-popover; merged 3 date-role popover tests into 1.
- **Seasons (12 → 9):** Merged legend present/absent; merged single-day + full-year boundary; cut gap-days-no-tint (absence case covered by basic tint test).
- **Moons (11 → 9):** Merged offsetDays positive + negative; merged add-moon + remove-moon re-render.
- **JSON-IO (9 → 4):** Once Schema-Migration absorbed single-calendar round-trip and defensive-import family, JSON-IO duplicated multiple tests. Kept only import-without-fields-applies-defaults, world-level round-trip, id-stripping, replace-on-collision.

Three net-new tests added during consolidation, paid for by the cuts: SM-012 (currentMoment reframe), GV-007 (rapid stepper clicks), CE-014 (locked-world editor non-mutation). All three filled real coverage gaps the original sheet missed.

P0 sign-off subset is 20 tests across all tabs — clean single-sitting size. Full 72-test sheet is the regression archive.

#### QA sheet visual frame

Drak provided an example xlsx showing the formatting he uses to keep focus during long QA runs. Pattern reverse-engineered and codified into `apply_frame_fills(ws, n_data_rows)`:

- Header row: cols 1-7 warm-dark header fill (`FF3D3835`); cols 8-67 solid black (`FF000000`)
- Yellow data rows (first, third, fifth, ...): cols 1-7 solid yellow (`FFFFFF00`); cols 8-67 solid black
- Clear data rows: cols 1-7 unfilled; cols 8-67 solid black
- Below last data row: 60 rows of full-width black (cols 1-67)

Forms an L-shaped black moat wrapping the test data into the upper-left corner. Drak's stated reason: alternating yellow + large black surround help keep place and prevent attention drift on row-after-row of similar-looking test items.

**Critical implementation gotcha documented in doctrine:** all fill colors must use 8-char hex with explicit `FF` alpha prefix. Without it, openpyxl serializes with `00` alpha and Excel reads `00000000` as the "no fill" sentinel — black silently disappears.

New doctrine entry: "QA sheet visual frame" under Presentation Conventions, with full specs + reuse instructions for future builder scripts. Pattern is the standing visual format for every Cartulary QA sheet from this point forward, not specific to the calendar-grid sheet.

#### Status

Working copy size: 1,266,020 bytes (was 1,265,005 at start of session). Parse-gate green. All 72 QA tests passing per Drak's confirmation.

Release prep deferred to next session per handoff doctrine — context use approaching the ~60% trigger after a session this long, and remaining release-prep work involves significant prose generation (README, itch page, devlog 1.4 with its literary/film inversion title) plus the mechanical dual-build + zip steps. Handoff package staged.

#### Addendum — handoff rewrite

Initial handoff produced at the session-wrap point had four operational defects caught on review: a stale roadmap v1.4 status block (still read "98-test... run pending" after the consolidation+pass landed), release-prep validate/stage commands referencing wrong filenames (`cartulary.html` lowercase vs the build script's `Cartulary_v1.4.html` output, broken `cp` glob), an unnamed "three smaller items" gate carried as routine procedure rather than concrete next-session work, and README + itch-page paths unspecified despite `cartulary-build.md` having canonical answers. Handoff rewritten from scratch with mechanical cross-check against `build_inline.py` VERSION constant before any prose. New doctrine verification rule added under "Handoff procedure": cross-check every release-prep command against the build script's current output filenames before producing the handoff.

Three pending items enumerated by Drak: **version history / undo recovery**, **scale ceiling measurement**, **visual design**. These gate v1.4 release prep. Listed concretely in the new handoff rather than as a TBD placeholder.

### Session 2026-05-16 (continued — v1.5 scope expansion planning)

Planning-only entry; no working-copy changes. v1.5 scope grew from "Packs framework + Conlang Tools pack" to add a third major piece: the Ephemeris view (top-level celestial-mechanics surface).

Sequencing rationale: v1.4 is the heaviest release in the line (four headline pieces); v1.5 as Packs-only was underweight by comparison; v1.6 with Cartographia+ alone is a 60-100 hour build. Adding Ephemeris to v1.5 balances the cadence.

Naming decisions locked:
- **Ephemeris** picked as view name. Greek-rooted scholarly term for tabulated astronomical positions/events over time — describes exactly what the view produces. Phonetic flow strong, matches sidebar register (Linea / Stemma / Concordance / Kalendarium / Cartographia / Ephemeris).
- **Stellarium** considered and rejected. Direct collision with stellarium.org, the established open-source planetarium application in the exact adjacent domain. Documented as a new naming failure mode in doctrine: "direct-collision variant — worse than Tiffany."
- **Astrarium** considered and rejected on phonetic grounds. The `astr-AR-i-um` consonant cluster doesn't flow well even though it matches the `-arium` suffix of Kalendarium.

Architectural decisions locked:
- **`state.celestialBodies` top-level state surface.** New shape `{id, name, kind, parentBodyId, orbitalElements, physicalParams, axialTilt}`. The v1.4 `calendar.celestials` schema is structurally wrong for celestial mechanics (moons belong to physical bodies, not calendars). Calendar grid view's celestial render keeps working via derived-display lookup.
- **Migration path:** backfill `state.celestialBodies` entries from existing `calendar.celestials`, set parentBodyId to null (user pairs them up in Ephemeris later), shadow or delete the duplicate.

Open design questions tabled for resolution before v1.5 code starts:
- Astronomical Body template handling: (a) promote to view-object pattern like Map→Cartographia, (b) two-layer with template-for-prose + state.celestialBodies-for-math, or (c) full migration retiring the template. Option (a) is the strongest candidate.
- Sky-render scope: visualization in or out for v1.
- Alignment type final scope: all four (phase, ecliptic conjunction, eclipse, nodal) or a subset.
- Sidebar icon and order.

Estimated build cost per the part-3 conversation: ~980 new lines for all four alignment types + 7-8 new schema fields + migration pass + ~70-80 QA test cases. Plus Packs framework (~500 lines, new state surface) + Conlang Tools pack (6 templates, ~300 lines of config) for total v1.5 of roughly 1700-2000 lines. Heavier than originally-scoped v1.5 but lighter than v1.4.

Doctrine updates this session: view naming register expanded to include Ephemeris; new naming failure mode documented ("direct-collision variant — worse than Tiffany"); locked decisions list gains Ephemeris naming + state.celestialBodies schema direction.

Roadmap update: v1.5 section rewritten to include Ephemeris with feature surface, hard constraint won't-have list, schema rework explanation, and open-questions tabling.

### Session 2026-05-16 (continued — Calendar grid view, seasons, moons)

Three features pulled forward from post-1.7 backlog after modularization de-scope freed v1.4 capacity. All three consume Kalendarium's existing absoluteDay primitives; the schema extensions live on each calendar (not at world scope), and the rendering is calendar-grid-substrate-driven (one grid per calendar, expandable inline from Kalendarium index). Shipped in six staged passes (infra rebuild → schema → editor UI → grid skeleton → season bands → moon glyphs), parse-gate green throughout.

#### Schema additions and migration

**`calendar.week = { daysPerWeek, dayNames }`** added to every calendar. Default 7-day cycle with empty dayNames. dayNames either empty (no header row in grid view) or exactly daysPerWeek long. All-blank arrays collapse to empty on save so the grid never renders a row of empty header cells.

**`calendar.celestials = []`** with shape `{ id, name, cycleDays, offsetDays, color, icon }`. id auto-generated as `cel-{genId()}`. cycleDays defaults to 28 (real-world lunar) when missing/invalid. offsetDays defaults to 0 (the absoluteDay at which the body was at phase zero / new). Per-moon color drives tooltip badge; icon is editor-and-tooltip metadata only.

**`calendar.seasons = []`** with shape `{ id, name, startDay, endDay, color }`. 1-indexed dayOfYear values. `endDay < startDay` interpreted as wrapping through year-end. Overlaps allowed (first-defined wins); gaps allowed.

**`ensureCalendarShape(cal)`** helper near `regenerateCalendarId`. Pure-additive (never rejects valid existing data), idempotent (re-running produces the same result), defensive against malformed input. Three call sites use it: `migrate()` walks primary + every additional calendar; `normalizeImportedCalendar` runs it after the strict v1.4-core validation block; `createCalendar` runs it on freshly-constructed additional calendars. Adding a future calendar-scoped field means editing one helper, not three call sites. `normalizeImportedCalendar`'s `out` object construction explicitly includes `week / celestials / seasons` (the unknown-key strip would otherwise silently drop them).

#### Calendar editor UI

Three new sections inserted into `CalendarEditor` between Eras and Notes:

- **Week section** — `Days per week` numeric input (1-99 clamp) with dynamic Day-N name inputs that resize when daysPerWeek changes. Day-name inputs preserve their values up to the new length when shrinking; new slots default to empty when growing.
- **Celestials section** — header shows `{N} of 5`. Each row: name, cycleDays, offsetDays, color picker (default `#cccccc`), icon string. Add button hides at 5. Bad numeric input falls back to safe defaults (`Math.max` guards) rather than crashing.
- **Seasons section** — header shows `{N} defined · year is {totalDays} days`. Each row: name, startDay/endDay (both clamped to `[1, totalDays]` via min/max on the number inputs), color picker. New seasons default to quarter-spaced spans so consecutive Adds don't all stack on day 1. Wraparound notice (`wraps year-end`, italic) renders inline when endDay < startDay.

#### Calendar grid view

**`CalendarGridView` component** rendered inline below each calendar row in Kalendarium index. `KalendariumIndexView` got three new props (`onOpenEntry`, `templates`, `onUpdateViewPrefs` — `templates` was already accessible via `state`, kept the prop for explicitness) and local `expandedGridFor` state tracking which calendar's grid is currently open. One grid expanded at a time; toggle button between Edit and Export on each row.

**Year stepper** at top of grid panel: `−`/`+` arrows, year display in Cormorant Garamond with era short-name suffix when applicable, Jump-to-N input + Go button, `↺ Current` button (only when state.world.currentMoment is set). Initial year: `state.viewPrefs.kalendariumGridYear[rowKey]` if set, else currentMoment year projected into this calendar's frame via absoluteDay round-trip, else year 1. Stepping persists per-calendar.

**Month sub-grids** in a CSS grid with `gridTemplateColumns: repeat(auto-fill, minmax(max(320px, dpw*42), 1fr))`. Each month: name + day-count header (Cormorant Garamond), optional weekday header row (only when all dayNames non-empty), then day cells in a `repeat(dpw, 1fr)` sub-grid. Initial layout was 4 columns; bumped minmax floor from `dpw*30` to `max(320, dpw*42)` to favor 3 columns at standard widths after Drak observed the 5-moon emoji clusters crowded the original cell sizes.

**Continuous-week math:** weekday of any absoluteDay = `((absDay % dpw) + dpw) % dpw`. Defensive double-modulo handles negative absoluteDay values. Each month's first day's weekday determines the count of leading-blank cells.

**Cell click → popover.** `collectEntryDatesAsAbsoluteDays(entry, template, state)` near `reframeEntryDatesAcrossStructure` walks every date-bearing surface on an entry (calendar-date, range start/end, name-history from/to, spouse marriedOn/endedOn, group subfields recursively) and projects through the entry's bound calendar to absoluteDay. The grid pre-computes a `Map<absDay, [matches]>` via `useMemo` keyed on entries/templates/calendars/primary. Cell click looks up matches in O(1). Popover renders below the grid with entries listed by name + field label. Click navigates to entry (grid auto-collapses on navigation). Click outside the popover dismisses; Escape dismisses; clicks on other day cells re-target without closing first (`data-cal-grid-cell` attribute distinguishes from outside-clicks).

Cross-calendar matching is automatic via absoluteDay — an entry bound to Imperial with date Y1024/M3/D5 surfaces on the Elven grid at whatever cell the same absoluteDay maps to in the Elven frame.

#### Season rendering

**`getSeasonForDayOfYear(doy, seasons)`** near `formatYear`. Handles wraparound (`endDay < startDay` → matches when `doy >= startDay || doy <= endDay`); normal containment (`doy >= startDay && doy <= endDay`) otherwise. First-match-wins iteration order.

**`hexToRgba(hex, alpha)`** for cell background tinting. Accepts 3- or 6-digit hex with/without leading `#`. Returns `"transparent"` on malformed input rather than throwing. Cells tint at 0.3 alpha when a season covers the day.

**Cell layering refactor.** Has-entries indicator changed from background-swap (which fought with season tint) to 2px accent border. Selected state still overrides with solid accent + inverted text. Three orthogonal visual channels — background, border, weight — communicate three independent states (season, entries, selected) without interference.

**Season legend strip** at top of grid panel between year stepper and month sub-grids. Color swatches + season names. Tooltip on each swatch shows day range + wraparound notice when applicable. Hidden when calendar has no seasons defined.

**Cell tooltip** appends season name as an additional line when applicable.

#### Moon phase rendering

**`computeMoonPhase(absDay, cycleDays, offsetDays)`** returns a 0-4 phase index. Phase math: `((absDay - offsetDays) mod cycleDays) / cycleDays`, defensive double-modulo for negative phase positions. Bucket-8 via `Math.floor(fraction * 8)` clamped to [0, 7] for float-drift defense at fraction=1.0 edge.

**Glyph maps at module scope:**
- `MOON_GLYPHS = ["🌑", "🌒", "🌓", "🌔", "🌕"]`
- `MOON_PHASE_NAMES = ["New", "Crescent", "Half", "Gibbous", "Full"]`
- `BUCKET_TO_PHASE = [0, 1, 2, 3, 4, 3, 2, 1]` — symmetric eight-to-five mapping. Waxing crescent (bucket 1) and waning crescent (bucket 7) both render 🌒; same pattern for half (🌓) and gibbous (🌔).

**Day cell layout** changed from centered text to flex-column with day number top, optional moon-row bottom when `calendar.celestials.length > 0`. Cells without celestials stay center-aligned. Moon row uses `font-size: 8` with `flex-wrap: wrap` so 5-moon cells don't overflow narrow columns.

**Multi-line tooltip composition** — base info on line 1 (`Day N` or `N dated entries`), optional season on line 2, then one line per moon as `Name: Phase`. Browsers render `\n` as line breaks in `title` attributes.

#### Iteration: grid sizing

First pass laid out at 4 columns (`minmax(dpw*30, 1fr)`) which Drak flagged as crowding the 5-moon cells. Bumped to `minmax(max(320, dpw*42), 1fr)` → 3 columns at standard widths → cells are roughly 45×45 instead of 30×30 → moon clusters fit cleanly.

#### QA artifact

`cartulary-v1.4-calendar-grid-qa.xlsx` — 98 test cases across 6 tabs:

- **Schema-Migration** (14): backfill on existing worlds, fresh-world defaults, ensureCalendarShape defensive coverage, viewPrefs persistence
- **Editor-UI** (19): Week / Celestials / Seasons sections, all input clamps and persistence flows
- **Grid-View** (33): toggle behavior, year stepper, continuous-week layout, cell-click popover, cross-calendar matching, dismiss flows
- **Seasons** (12): tint coverage, wraparound, legend, overlap handling
- **Moons** (11): phase progression at cycle 28, offset shift, non-standard cycles, negative offset, multi-moon layout
- **JSON-IO** (9): calendar-level round-trip, world-level round-trip, hand-edited malformed input handling, replace-on-collision

Severity-coded P0/P1/P2. Two tests cut from original 100 — one as duplicate of MR-001 expected behavior, one as dev-tools-required (float drift verification). Status column has conditional formatting (PASS green, FAIL red, BLOCKED brown, N/A gray). Run pending.

#### Doctrine

New entries added this session:
- **Calendar extensions live on the calendar object** (not world scope)
- **`ensureCalendarShape` is the canonical seam for adding calendar schema extensions**
- **Continuous-week calendar math** (defensive double-modulo)
- **Five-phase moon glyph taxonomy with symmetric collapse** (8-to-5 bucket mapping)
- **Seasons use 1-indexed dayOfYear with explicit wraparound**
- **Calendar grid year initialization** (currentMoment-projected default, viewPrefs persistence)
- **Calendar grid cell-click projects through absoluteDay** (cross-calendar matching free)
- **Cell visual state layering pattern** (background / border / weight as three independent channels)
- **Multi-line tooltip composition for cell-level affordances**

New locked decisions:
- **Five moon phases, not eight** — Drak's call. Cap five moons per calendar.
- **Calendar grid is inline-expanded per row, not separate top-level view**
- **Phase emoji as OS color emoji, not custom SVG** — Drak's call
- **Continuous weeks across month boundaries** — real-world semantics over simpler per-month reset
- **Three-column month layout at standard widths** — `minmax(max(320px, dpw*42), 1fr)`

New code-watch pattern:
- **Cell-substrate visual conflicts** — when a new cell-level feature wants a visual channel already in use, pick a different channel rather than fold both into the same one

### Session 2026-05-16 (continued — HTML export, bug audit fixes)

#### HTML export pipeline (shipped end-to-end)

Single-file self-contained HTML export per world. Read-only artifact for sharing with non-Cartulary users. Shipped in four staged passes with Drak QA-approving each stage. Project page gains an Export section with an "Export as HTML" button opening `HtmlExportModal`. Modal exposes include-secrets toggle + render-dates-in dropdown (hidden when world has only primary calendar); currentMoment-null warning banner when world contains maps but currentMoment isn't set.

**Stage 01 (scaffold).** Modal scaffolding, Project page button, state plumbing, stub builder confirming end-to-end pipeline before fleshing out the rendering.

**Stage 02 (core builder).** `resolveWikiLinksForHtml` (wiki-links → `#entry-{id}` anchors; broken targets render as styled spans). `renderFieldForHtml` parallels `renderFieldForMd` with full type coverage including name-history (which markdown export was silently dropping). `renderEntryArticleHtml` produces `<article>` per entry with title + badge + obituary + tags + inline `<dl>` + block `<section>`s for textarea/group/name-history. Theme inheritance via `extractThemeVars` reading the live document's CSS variables. ToC grouped by template, alphabetical within group, two-column on wide, single column on print/mobile. Calendar projection via `projectDateForExport` for the forced-calendar mode. Print + responsive CSS.

**Stage 03 (maps + async images).** Image manifest pre-resolution pattern: `collectImageRefsForHtmlExport` walks all entries' field trees (including group subfields) plus `mapData.image`, returning deduped Set of source refs. `resolveImageManifestForHtmlExport` async-fetches each — data URLs pass through, FSAA filenames fetch via `dirHandle.getFileHandle` + `fileToDataUrl`, missing files resolve to null. `renderMapHtml` produces `.map-container` with embedded image + numbered absolute-positioned pin anchors + numbered `<ol class="map-legend">` below. CurrentMoment-aware pin filtering via `isPinVisibleAtAbsDay`; permanent pins always visible; null currentMoment → all pins render. Filter-note line below map when filtering hides pins. `buildHtmlExport` and `exportHtml` became async.

**Stage 04 (polish).** Skip-to-content link, `<meta name="description">` from world description, `<meta name="generator">`, world last-edited date alongside export date, date-rendering note in meta line for multi-calendar worlds, empty-world fallback, back-to-top affordance at end of `<main>`, `@page { margin: 1.5cm; }` for print.

#### Section break design (mid-stage 02, refined twice)

Inter-entry separator within same template: `※※※※※` (five reference marks), 18px, flex `justify-content: space-between` for full-width edge-to-edge distribution. Inter-template separator between sections: `⁂⁂⁂⁂⁂` (five asterisms), 24px (larger weight), same flex pattern. Each glyph is a `<span>` inside `.entry-separator` or `.template-separator`; first glyph flush with content left margin, last with right, equal gaps between. Template articles wrap in `<section class="template-section">`; separators interleaved at HTML generation rather than CSS pseudo-elements (pseudo-elements can't flex). Initial iteration used `••※••` then `❦` fleuron-on-rule; Drak's full-width-distribution requirement drove the final design.

#### ToC HR between template groups

25%-centered horizontal rule between template groups in the ToC, via `::before` pseudo-element on each non-first `.toc-template-group` with `margin: 0 auto 24px`.

#### openNewEntry regression fix (latent bug from prior session)

`openNewEntry` was refactored in prior session for Cartographia to take an optional `templateOverride` parameter, but the existing `+ New Entry` button at the template list view continued passing the function reference directly to `onClick`. React fills the first parameter with its SyntheticEvent on raw handler references — the event is truthy and an object, so the `templateOverride || activeTemplate` fallback never fired, and `tmpl.fields.forEach` crashed on the SyntheticEvent (no `fields` array). Result: every "+ New Entry" button silently broke from Cartographia ship through end-of-HTML-export. Two-part fix: wrap the call site as `onClick={() => openNewEntry()}` AND add a shape-check guard inside the handler that requires the override to be an object with string `id` + array `fields`. Doctrine code-watch entry added: "Refactoring an existing handler to take a parameter requires auditing every call site."

#### Bug audit fixes

Final pre-handoff audit pass found three real bugs in the freshly-shipped HTML export plus a regression fix to the in-app obituary:

- **URL field XSS in HTML export.** `case "url"` was emitting user-supplied URL directly into `href` after html-escaping. html-escape doesn't sanitize protocol — `javascript:alert(1)` would execute on click when a third party opens the exported HTML. Fixed: protocol-allowlist sanitization. `javascript:`, `vbscript:`, `data:`, `file:` URLs render as `.field-link-blocked` struck-through plain text. In-app `<a href={value}>` has the same vulnerability but was left alone — the in-app trust model is "user trusts their own content," while the export trust model is "reader trusts the document author."

- **Obituary line leaks secret data.** When the first calendar-date-range field on a person-like template is marked `secret` AND secrets are excluded from the view/export, the obituary line still rendered "Died at age N," defeating the field's secret marking. Fixed in both HTML export (`renderEntryArticleHtml`) and in-app (`EntryView`). When `firstRange.secret && !includeSecrets`/`!showSecrets`, the obituary suppresses.

- **Pin coordinate NaN defense in renderMapHtml.** Malformed mapData with non-numeric `pin.x`/`pin.y` would produce `style="left:NaN%;top:NaN%"` (CSS ignores → pin renders at top-left corner). Defensive `Number.isFinite(v) ? v : 0.5` fallback (center).

#### Doctrine

New entries added this session:
- **Auto-age has two display surfaces** (extended from earlier this session)
- **Refactoring an existing handler to take a parameter requires auditing every call site** (code-watch)
- **Anchor IDs use entry.id, not slugified names** (HTML export design)
- **Image manifest pattern — async pre-resolution before render** (HTML export design)
- **Section break design** (HTML export design — five-glyph flex space-between full-width)
- **HTML export trust model** (URL protocol sanitization for export, not in-app)
- **Auto-age obituary respects field-level secret status** (both surfaces)
- **HTML export modal lives on the Project page** (locked decision)
- **Map rendering uses image + numbered pin overlay + numbered legend** (locked design)

### Session 2026-05-16 (Cartographia + view order + obituary line + roadmap restructure)

#### Cartographia — top-level view promotion

Map-template entries promoted from the Templates sidebar into a dedicated top-level view, `Cartographia`. Sidebar icon `▦` (U+25A6) distinct from the Map template's `▣`. Sits in the canonical view order between Stemma and Concordance (post-reorder, see below).

New `CartographiaIndexView` component renders map entries sorted by `updatedAt` desc, each row showing template icon + name + pin count + optional "no image yet" marker + updatedAt + optional description preview + tag chips + delete-with-confirm. "+ New Map" button uses a native-select picker when multiple map-kind templates exist, falls back to direct create on single template. Zero-templates fallback hint when no map-kind templates exist (offers Restore Built-ins).

`openNewEntry` refactored to take optional `templateOverride` parameter — sets `activeTemplateId` before opening so post-save lands cleanly in Cartographia rather than the previous active template. New `createMapEntry(templateId)` validates `kind: "map"` and routes through.

Map filtered from the Templates sidebar section: `displayedTemplates` computed via `state.templates.map((t, originalIdx) => ({ t, originalIdx })).filter(({ t }) => t.kind !== "map")` so drag handlers continue to pass real `state.templates` indices to `reorderTemplate`. Template count badge reflects filtered count.

Map-template editing reachable via Edit Template button in any open map entry's header (this was already a feature; just confirmed it stays the only access path now that Map is hidden from the sidebar). New map-template creation still flows through standard "+ New Template" with `kind: "map"` — newly-created map templates auto-route to Cartographia.

Home docs updated: Views & Pages now lists 8 entries; "Maps" section retitled "Cartographia" (id="maps" kept for bookmark stability); Template Usage notes the map-template editing path; Templates listing notes Map is accessed via Cartographia.

#### View order canonical reorder

New canonical sidebar order: `family, stemma, kalendarium, cartographia, graph, timeline, chronometrics`. Concordance moves from position 3 to 5; Kalendarium and Cartographia move up to positions 3 and 4. Updated both `DEFAULT_VIEW_ORDER` and the Sidebar fallback constant.

Migration handling: new `PRIOR_CANONICAL_VIEW_ORDERS` constant lists pre-Cartographia 6-item canonical and post-Cartographia-pre-reorder 7-item canonical. If a user's stored `viewOrder` deep-equals any prior canonical, replace entirely with current `DEFAULT_VIEW_ORDER` — existing default users get the reorder. Customized orders (no prior-canonical match) preserve their arrangement; missing-default items splice at canonical position relative to neighbors (walks back through `DEFAULT_VIEW_ORDER` to find the nearest preceding anchor in stored, splices after it).

#### Obituary line for deceased characters

New EntryView header surface: italic Cormorant Garamond line below `entry-badge`, above `entry-tags-bar`. Renders `Died at age N` (or `Died at age ~N` when approximate) for entries that satisfy the same gate as the inline lifespan-field suffix: `templateSupportsDeceased(template)` AND first `calendar-date-range` field on template AND `computeLifespanAge` returns an `isDeceased: true` result. Living characters get no obituary line — their inline `(age N)` suffix already covers the case and is dynamic with currentMoment.

Helper refactor: `computeLifespanAgeSuffix` → `computeLifespanAge`. Returns structured `{age, isDeceased, approximate, suffix}` object instead of a bare suffix string. Existing `FieldValueDisplay` call site reads `.suffix`; new obituary-line consumer reads `{age, isDeceased, approximate}` to format its own text. Single primitive, two display surfaces.

Typography deliberately distinct from `entry-badge`: badge is uppercase letter-spaced for system metadata (template + updated date); obituary line is mixed-case Cormorant Garamond italic for biographical fact. `margin-top: -10px` pulls the two together so they read as a single header band.

New CSS: `.entry-obituary{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:calc(15px * var(--font-scale));color:var(--text-dim);margin-top:-10px;margin-bottom:18px}`.

No cause-of-death enrichment for v1; held off pending real-world usage feedback.

#### Roadmap restructuring

Code modularization moved out of v1.4 to its own v1.7 release. Doctrine logic: "stable feature surface" applies more honestly to v1.6+ than v1.4 with foreseen Cartographia+ map creator and Packs framework plus unforeseens.

New release sequence:
- **v1.4** — Kalendarium + Cartographia + auto-age + HTML export (HTML export remains)
- **v1.5** — Packs framework + Conlang Tools pack
- **v1.6** — Cartographia+ map creator (Excalidraw-for-maps, locked v1 scope: primitives + strokes + text + 6-8 palette + starter stamps + undo/redo + SVG save + stamp pack import via `cartulary_mapstamp_pack: 1` envelope)
- **v1.7** — Code modularization, standalone

v1.4 thesis rewritten to reflect 3 pieces (Kalendarium + Cartographia + HTML export) instead of 4. Backlog header retitled to "post-1.7". Monolith pain signal flagged in v1.7 section so the work doesn't slip indefinitely.

#### Doctrine

- **Auto-age has two display surfaces.** Inline Lifespan field suffix + obituary line below entry-badge (deceased-only). Shared `computeLifespanAge` primitive. Surfaces reinforce rather than duplicate. Living-character header symmetry deferred.
- **Map-kind templates hidden from Templates sidebar.** Access through Cartographia; editing through Edit Template in open map entries.
- **View order migration uplifts prior canonical defaults.** Maintain `PRIOR_CANONICAL_VIEW_ORDERS` list whenever default order changes.

### Session 2026-05-15 (continuation — auto-age + isEntryDeceased fix)

#### Auto-age on character lifespans

Entry view now suffixes the lifespan field on character-template entries with "(age N)" or "(died at age N)". Triggers when (a) the entry's template has a Status field whose options include "Deceased" — gates against Factions, Historical Events, etc. that also have `calendar-date-range` fields but aren't person-like, (b) this is the first `calendar-date-range` field on the template (matches Linea / Stemma / Concordance hover lifespan convention), and (c) lifespan.start has a year. Display rules:

- Has end date → "(died at age N)" computed start→end
- No end + entry has Status "Deceased" (Thalwen case, unknown death date) → no suffix; refuses to guess against currentMoment
- No end + not deceased + currentMoment set → "(age N)" computed start→currentMoment
- No end + not deceased + currentMoment null → no suffix
- Negative age (forward-dated relative to anchor) → no suffix
- Approximate flag on either endpoint → "~" prefix on the number

New `state.world.currentMoment` schema: `{year, monthIndex, day} | null` in primary's frame. Stored Y/M/D (not absoluteDay) so calendar-position invariance applies under primary structural edits — re-shaping primary's months doesn't drift the displayed "current moment" to a different Y/M/D. Consumers derive absoluteDay at read via `calendarDateToAbsoluteDay(primary, currentMoment)`. Defensive migration validates shape, resets bad values to null. Default null on fresh worlds and on import of older worlds.

New Current Moment panel at the top of Kalendarium index, above the calendar list. Shows the moment formatted in primary, with Edit / Clear buttons when set or a Set button when null. Inline `CalendarDateEditor` with Save / Cancel; `allowApproximate=false` (current moment is a literal anchor, not a fuzzy date). Locked-world disabled.

New helpers near the calendar math: `computeLifespanAgeSuffix(value, calendar, entry, template, currentMomentDay)` returns the suffix string or null; `templateSupportsDeceased(template)` is the person-like gate (Status field includes "Deceased" option).

`FieldValueDisplay` signature extended with `entry`, `template`, `currentMomentDay` props. EntryView passes them at all three call sites (full-width, half-width left, half-width right). Group-subfield recursion intentionally doesn't pass them — the "first range field on template" gate prevents subfield false-positives anyway; passing was visible noise.

#### isEntryDeceased fix (pre-existing v1.3 regression)

`isEntryDeceased` only checked string-shape Status values via `typeof v === "string"`. v1.3 made all built-in Status fields `otherTextField: true`, which stores values as `{value: "Deceased", customText: ""}` objects via `handleDropdownChange`. Result: `isEntryDeceased` returned false for every v1.3+ deceased character, breaking the Linea opacity dim (0.7 → 1.0 for nodes that should have been dimmed) and the Concordance hover "Living/?" treatment (always rendered "Living" instead of "?" for deceased-no-end characters). Fixed by routing through `selectValueOnly(raw).trim().toLowerCase()` — handles both legacy string shape and v1.3+ object shape. Surfaced during auto-age implementation because the same primitive gates the "deceased but no death date" suffix-skip branch.

#### Doctrine

- **currentMoment is stored as Y/M/D in primary's frame, not absoluteDay.** Calendar-position invariance applies to primary-bound dates under primary structural edits, same as entry-stored dates. Consumers derive absoluteDay at read.
- **Auto-age person-likeness gate.** A template is person-like for age-suffix purposes when its Status field options include "Deceased". Cleaner than name-matching "Character" and works for user-renamed character templates and custom person-like templates.

### Session 2026-05-15 (continued from 2026-05-14)

#### Kalendarium (90 active TCs passing)

- **Multi-calendar schema.** `state.calendars[]` for additional calendars (each with `anchor.absoluteDay` projecting onto the universal time axis); `state.viewPrefs{}` for per-view calendar selection; `entry.calendarId` for per-entry binding (null = primary).
- **Conversion math.** `daysPerCalendarYear`, `calendarDateToAbsoluteDay`, `absoluteDayToCalendarDate`, `getCalendar`. AbsoluteDay is the universal coordinate; per-calendar Y/M/D is the display frame.
- **Kalendarium top-level view.** Sidebar entry between Concordance and the Timeline views. List of all calendars (primary + additional), each with editor, export, delete. Reference moment pin (literal-edit auto-pin + explicit pin button hybrid) drives the comparison strip that shows the same moment in all defined calendars.
- **Per-entry calendar binding.** EntryForm Calendar dropdown below Tags row when world has additional calendars. Switching binding via the dropdown auto-converts date fields through absoluteDay so the absolute moment is preserved exactly across the rebind.
- **Per-view Display in selectors.** TimelineView, ChronometricsView, FamilyView (Linea), MapView each carry their own `state.viewPrefs.<viewKey>CalendarId`. Each view sorts on absoluteDay (calendar-agnostic) and displays through the selected viewCalendar.
- **Chronometric drag-edit reverse projection.** When a user drags an event in the view-calendar's frame, the new position reverse-projects through absoluteDay back to the entry's bound calendar before writing. Absolute moment preserved exactly across the round-trip.
- **Era bands rebind to viewCalendar.** Chronometric and MapView era buttons reflect the selected view-calendar's era structure, not the Map-entry's or any pinned entry's bound calendar.
- **Calendar JSON I/O.** `cartulary_calendar_export: 1` envelope. Per-row Export, top-of-index Import. Skip / Replace / Rename collision modal; Replace explicitly hidden on primary-name collision (primary swap would re-frame every entry's dates, intentionally unsupported via import).
- **Pre-deletion conversion modal.** When deleting a calendar with bound entries, modal shows count and target picker. `convertEntryDatesAcrossCalendars` walks every date-bearing surface (calendar-date, range, name-history rows, spouse marriedOn/endedOn, recursive group subfields) and rewrites through absoluteDay. Atomic single state update.
- **Two-invariants doctrine.** AbsoluteDay invariance for cross-calendar work (anchors, entry rebinds, pre-deletion conversion, cross-calendar sort/projection). Calendar-position invariance (month name + day, roll forward when month removed, skip past months that can't hold the day, roll to next year if no later month qualifies) for same-calendar structural edits. Documented in doctrine.

#### Migration framework regression fix

`makeInitialState()` now wraps its return value in `migrate()` so every per-rev tracker (`state.world.fieldOrderUpdates`, `.optionsUpdates`, `.seededFields`, `.iconMigrations`, plus ten more — fourteen trackers total) gets populated with "this migration has run" markers on fresh worlds. Without this, fresh worlds exported with empty tracker maps, and on reimport `migrate()` saw no markers and re-imposed canonical schema, silently wiping user customizations made between creation and any reload. Fix is single-source-of-truth: `migrate()` owns canonical knowledge of which markers exist, any future migration framework added later auto-applies its marker on fresh worlds.

#### Vertical Timeline (TC-023 / TC-082 fix + zoom)

- **Calendar-date-range support.** TimelineView was only walking `calendar-date` field types, silently dropping every `calendar-date-range`. Lirien, Aldric, Valeria, The Long Twilight — basically every lifespan-bound entry — was invisible. Now emits start and end as two separate events with " · start" / " · end" suffixed onto the field label. Missing endpoint (Living, ongoing, unknown) skips that side cleanly.
- **Three-level zoom.** New `state.viewPrefs.timelineZoomLevel`: `"year" | "month" | "day"` (default "day"). Ctrl+scroll cycles between levels (throttled to ~5 flips/sec). Discoverable button row at the top of the controls bar. Year-level flattens months into a chronological event list under the year header with a compact "Mon D" date in the row's date slot. Month-level keeps year/month/event hierarchy without per-event "Day N" prefix. Day-level is the original v1.3 layout. Native wheel handler with `passive: false` so the browser's page-zoom doesn't fire instead.

#### Chronometric (deeper zoom + calendar-aware ticks)

- **Max zoom 50x → 1000x.** Both scroll handler and ± buttons. Day-level visibility now reachable for any world size.
- **Three-mode tick generation.** Visible range ≥ 5y → year ticks (original decimal-step logic). 0.4y–5y → month ticks at `viewCalendar.months` boundaries; year-start months get the year label and major-tick styling. < 0.4y → day ticks decimated to target count; month-start days get "Mon Y" label and major styling, other days show day number. Tick objects carry `{value, label, major}` so major/minor render with distinct stroke widths and opacity.

#### Image field drag-and-drop / paste / picker

The image field editor now accepts files via three input methods:
- **Drag-and-drop** onto the field zone (with visual feedback)
- **Paste** from clipboard while the filename input is focused
- **Picker** button next to the input (📁) opens native file dialog

Ingestion branches on FSAA availability:
- **FSAA dirHandle connected:** writes file to linked world-images folder via `dirHandle.getFileHandle(name, {create:true})`, uses existing `generateUniqueFilename` for collision avoidance. Field stores filename.
- **No FSAA / write failed:** reads file via `fileToDataUrl`, stores inline as `data:image/...;base64,...` URL. Flash warning explains world JSON bloat and points at World Settings for the folder-linking remedy.

Field value shape is a single string in either mode. Downstream consumers (`ImagePreview`, `imageManifestEntry`, the zip-export writer at line 10754) already branched on `.startsWith("data:")` so both shapes flowed through the existing pipeline without parallel code paths. `ImagePreview` updated to recognize `data:` prefix and route around the file-lookup path.

#### Other v1.4 deltas

- **TC-048 fix.** Calendar export was leaking the `id` field. Stripped — imports regenerate ids anyway.
- **TC-078 UX.** Initial month label on new calendars is "Month 1" (matching `addMonth`'s pattern) instead of "New Month."

#### QA artifacts

- 90 active test cases (96 numbered, 6 marked CUT) across 4 tabs in `cartulary-v1.4-qa-tests.xlsx`. All 90 GREEN at session end.
- Test world (`Cartulary_v1_4_Kalendarium-Test-World.json`): Imperial primary (12×30, 2 eras), Elven additional (4×100, 1 era, anchor −36000), Dwarven additional (14×21, 0 eras, anchor +18000). 13 entries spanning all 3 calendars including characters with marriages and lifespan dates, historical events (point and span), factions with founding dates, and one map (Realms of the Tri-Cultures) with mixed-calendar pins, one permanent pin, one unlinked pin.

### Session 2026-05-14 (Kalendarium implementation)

Captured in prior session's transcripts; summarized in the handoff for that session.

---

