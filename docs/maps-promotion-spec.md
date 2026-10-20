# Cartulary, Maps Promotion Spec (v1.6, first build work)

> **FROZEN BUILD SHEET.** This is the authoritative, self-contained spec for promoting Maps from a hidden built-in template to a first-class state slice. It is the first product code work of the v1.6 line (`r001`). Load this document plus the working HTML and build against it directly. Find code by NAME, never line number. Locked 2026-06-28 (session 9, planning).
>
> **Revision 2 (2026-06-28, session 9):** a code audit against r000 surfaced six gaps in revision 1, all folded in below. (1) Users can mint `kind:"map"` templates via `TemplateBuilder`; that door is now closed and orphaned user map templates are handled (decision A1). (2) The markdown export path was unaddressed; a slice walk is added so maps survive markdown export (decision B1). (3) `HtmlExportModal.hasMaps` is repointed to the slice. (4) `RestoreBuiltinsModal` / `ResetTemplateModal` have no map-kind branches to remove (verify-absent only). (5) Two stale `kind:"map"` help/comment strings get fixed. (6) `renderMapHtml`'s call site is named precisely.

---

## 0. One-sentence statement

Maps stop being entries. They move to their own flat state slice (`state.cartographia`), modeled on how Stemma stores multiple stemmas, with their three fields rendered through the shared `EntryForm` the way Glossopoeia renders its entities, and the existing image+pins canvas unchanged. **The user must notice nothing.**

---

## 1. The hard constraint: invisibility

This is a pure architecture move. Existing image+pins behavior is preserved exactly. No drawing code, no editor changes beyond repointing reads, no carve, no UX redesign. The success test is the same as the modularization success test: *if a user notices anything different after the promotion, it overreached.*

**Acceptance test (run all before calling it done):**

- Load a shipped-v1.5 world containing at least one map. Each map appears in the Cartographia index, opens, and renders its background image and pins identically to before, with Description / Scope-Region / Notes shown beneath the canvas.
- Concordance shows the same map nodes with the same pin edges and the same edge labels as v1.5.
- **HTML export** produces the same maps output (a maps section equivalent to the v1.5 entry-walk output), including the per-map article and the map images in the manifest.
- **Markdown export** (`buildMarkdownExport`, whole-world) produces the same maps output: each map's body, its `**Pins:**` block, and its images. (Per B1: markdown keeps maps. This is a second export path the test must check; revision 1 only checked HTML and was blind to it.)
- The `HtmlExportModal` current-moment warning still fires for worlds that have maps (`hasMaps` reads the slice, not `state.entries`).
- The Map template no longer appears anywhere a user can reach it: gone from `BUILTIN_TEMPLATES`, absent from the `RestoreBuiltinsModal` restore list and `ResetTemplateModal`, and **no longer offerable in `TemplateBuilder`** (the `kind:"map"` option is removed, so a user cannot mint a new map template).
- Reload after migration is idempotent: no duplicate maps, no orphaned map entries left in `state.entries`, no leftover `kind:"map"` templates of any origin, canonical result.
- A world with zero maps loads to an empty Cartographia index with no errors.
- A world that contained a **user-created** `kind:"map"` template (with or without custom fields) migrates cleanly: its maps land in the slice, any custom field values are preserved in the record's `fields:{}`, a Notes line records the unrendered custom fields, and the now-empty template is removed.

---

## 2. Why this is the cheap version of a promote-to-view

Sized this session against the actual code. Maps are a **graph leaf with outbound-only edges and no inbound refs**, which is what makes this far cheaper than the Glossopoeia/lexeme promotion:

- **Nothing entry-refs to a Map.** There is no `refTemplate: "Map"` / `refTemplates: [... "Map" ...]` anywhere in `BUILTIN_TEMPLATES`. Severing maps from `state.entries` breaks zero ref fields. (Lexemes ARE ref targets and needed full ref-resolution through the registry; maps skip all of that.)
- **The only entry-graph coupling is outbound pin edges.** In `GraphView`, the graph builder walks `kind === "map"` entries and emits `addLink(map.id, pin.entryId)` per pin. Nothing points back at a map. So the registry only has to keep maps as Concordance *nodes* re-emitting their pin edges, node + outbound edges, not inbound ref-target resolution.
- **Maps are already presentation-isolated.** The Templates sidebar list already filters `kind !== "map"`; `EntryList` does not surface maps; they reach the user only through `CartographiaIndexView` and the export modal's map filter. Removing them from `state.entries` removes nothing a user currently sees in the general entry surfaces.

---

## 3. Current state (what exists in shipped v1.5 / r000)

- **Map is a `kind:"map"` entry in `BUILTIN_TEMPLATES`** with three real fields: `Description` (textarea), `Scope / Region` (text), `Notes` (textarea). It also carries `icon`, `color`, `name`.
- **Map entries live in `state.entries`** like any entry: `{ id, templateId, name, tags, fields, ... , mapData }`, where `mapData = { image, pins }`. Each pin is `{ entryId, label, x, y }` (x/y as render fractions).
- **`isMap` special-casing.** `const isMap = template.kind === "map"` appears in both `EntryView` and `EntryForm`. `isMap` ADDS the canvas (`<MapView>` in view, `<MapEditor>` in edit); it does NOT replace field rendering. The three fields still render beneath the canvas via the normal `buildFieldLayoutUnits` path. **This layout, canvas on top, the three fields below, is exactly what "works as it does now" means.**
- **`CartographiaIndexView`** filters `state.templates` for `kind:"map"` (supports N map templates via `mapTemplates` + a `selectedTemplateId` picker) and lists entries per selected map template.
- **`GraphView`** emits pin edges from the `kind:"map"` entry walk (the only graph coupling).
- **HTML export** renders maps via `renderMapHtml` inside `buildHtmlExport`'s entry walk; the image-collection helper adds `mapData.image` for `kind:"map"` entries.
- **Draft create/edit** (in `App`) sets a default `mapData` for `kind:"map"` and clones it on edit.
- **`RestoreBuiltinsModal` / `ResetTemplateModal`** have `kind:"map"` cases.

---

## 4. Target design

### 4.1 The slice (Stemma-shaped storage)

```
state.cartographia: []          // flat array, no per-template grouping
```

Each record:

```
{
  id,                    // stable unique id (preserve existing entry id on migration, saved worlds load forever)
  name,
  tags: [],
  fields: {},            // keyed by the cartographiaMapSchema field ids
  mapData: { image, pins },
  updatedAt              // mirror Stemma's record; the index row shows it
}
```

- `makeDefaultCartographiaState()` seeds `[]` (mirror `makeDefaultGlossopoeiaState`).
- `migrate()` backfills `state.cartographia` to `[]` if missing (mirror the Stemma `if (!Array.isArray(state.stemmas)) state.stemmas = []` guard).
- `makeInitialState()` stays wrapped in `migrate()`.

### 4.2 Per-map fields (Glossopoeia-style render through EntryForm)

Stemma is fully hand-built and has no fields surface; maps have one. So fields use the Glossopoeia pattern, not the Stemma pattern: render the three fields through the existing `EntryForm` / `EntryView` field machinery via a fixed schema.

- New `cartographiaMapSchema()` returns the three-field schema, IDs preserved from the current Map template fields so existing `fields:{}` values keep resolving:
  - `Description`: textarea
  - `Scope / Region`: text
  - `Notes`: textarea
- The Cartographia per-map view/editor composes the canvas above the schema-driven fields: `<MapView | MapEditor>` then `<EntryView | EntryForm>`-style field rendering driven by `cartographiaMapSchema()`. Reproduce today's order exactly (name, tags, canvas, then the three fields).

### 4.3 The index (Stemma-shaped)

Rewrite `CartographiaIndexView` to `StemmaIndexView`'s shape:

- Read the flat `state.cartographia` array. **Drop the per-template `mapTemplates` filter and the `selectedTemplateId` picker entirely.**
- Row per map, `onOpen(id)`, `onCreate` (the "+ New Map"), `onDelete`. Empty state mirroring "No stemmas yet."
- Subtitle per row mirroring Stemma's node-count line: pin count and an image-present indicator.
- `isLocked` gates create/delete the same way Stemma gates them.
- **Do NOT add per-map JSON import/export.** That is a Stemma affordance maps do not have today; adding it is a feature and breaks invisibility. Deferred to the later Cartographia work (see §6).

### 4.4 Registry (keep maps in Concordance)

- Register `state.cartographia` as a node-source through the existing registry seam (the same mechanism Astronomical Bodies and Glossopoeia node types use; `getRegisteredGraphNodes` gains a maps registrant).
- Re-emit pin edges from the slice: in `GraphView`, **remove** the `kind === "map"` entry-walk branch and **add** a slice walk (or, preferably, contribute the edges through the registrant so `GraphView` stays generic). For each map record, for each pin with an `entryId`, emit `addLink(map.id, pin.entryId, label)` with the same `📍`-prefixed label rule as today.
- Maps appear as Concordance nodes via the registrant; node identity is the map record id (= the old entry id, preserved).

### 4.5 Export (both paths)

There are two export paths and both walk `state.entries` today, so both drop maps after the promotion unless rewired. Revision 1 only covered HTML; the markdown path is added here per decision B1 (maps stay in markdown export).

**HTML path.**
- `buildHtmlExport` emits maps via `renderEntryArticleHtml` (the per-entry article renderer), which calls `renderMapHtml` for `kind:"map"` entries. After the promotion, add a dedicated slice walk that calls `renderMapHtml` against each `state.cartographia` record (it already reads `mapData`; point it at the record's `mapData`), producing a maps section equivalent to the v1.5 output. Remove the `kind:"map"` branch from the entry walk.
- Update the HTML image-collection helper (`collectImageRefsForHtmlExport`) to gather `mapData.image` from the slice instead of from `kind:"map"` entries.
- `HtmlExportModal.hasMaps` currently builds `mapTemplateIds` from `state.templates` and tests `state.entries`, driving the current-moment warning (`showCurrentMomentWarning`). Repoint it to test `state.cartographia` (non-empty), or the warning silently stops firing for worlds that have maps.

**Markdown path (B1).**
- `buildMarkdownExport` (whole-world) walks `state.entries` and calls `renderEntryBodyMarkdown`, whose `kind:"map"` branch emits the `**Pins:**` block. Add a slice walk to `buildMarkdownExport` that emits each map record's body and pins, repurposing `renderEntryBodyMarkdown`'s map branch for slice records (it reads `entry.mapData?.pins` and `ctx.entryById` for pin targets; point it at the record's `mapData`). Remove the `kind:"map"` branch from the entry walk.
- `buildMarkdownExport` runs its own image collection (its `collectImages` / `imageManifest`); include the slice's `mapData.image` there too, or map images vanish from the markdown export.
- `buildSingleEntryMarkdown` is single-entry and is only reachable from the entry list, which no longer contains maps, so it needs no map handling; leave its map branch dead or strip it (cosmetic, not load-bearing).

### 4.6 App wiring

- The "+ New Map" handler creates a `state.cartographia` record (not an entry draft). Map open/edit routes to the Cartographia per-map view, not `EntryView`/`EntryForm` as an entry.
- Move any per-map view prefs (e.g. zoom, the `onUpdateViewPrefs` path MapView used) onto the record or the Cartographia ui slice as appropriate; do not lose them.
- Remove the `kind:"map"` draft-default branch from the entry draft-create/edit code.

### 4.7 Remove the template, its special-casing, and the user-creation path

Land all of this in the same pass, no deferred TODOs (migration doctrine):

- After the migration consumes existing map entries (§5), remove the `kind:"map"` entry from `BUILTIN_TEMPLATES` and any `TEMPLATE_ORIGIN` mapping for it.
- Remove the `isMap` branches from the generic `EntryView` and `EntryForm` (maps no longer flow through the generic entry path at all; the canvas+fields composition now lives in the Cartographia per-map view). This LEAVES `EntryView`/`EntryForm` with no map special-casing, a simplification.
- **Close the user-creation door in `TemplateBuilder`.** Remove the `<option value="map">` from the kind `<select>` and the `{draft.kind === "map"}` hint block. Without this, a user can still mint a `kind:"map"` template after the promotion; those entries would get no canvas (the `isMap` branches are gone) and would not be swept (`migrate()` runs on load/import, not live create), leaving a dead entry until reload. Removing the option resolves this at the source: no new map templates, so no un-migrated map entries.
- **`RestoreBuiltinsModal` and `ResetTemplateModal` have NO `kind:"map"` branches** (verified against r000; they are generic `.map()` list renderers). There is nothing to remove. Just verify Map drops out of the restore/reset lists once it leaves `BUILTIN_TEMPLATES`. No code change in these modals. (Revision 1 wrongly said to "remove the kind:map cases.")
- **Fix the stale `kind:"map"` strings.** The template-kind comment ("A template can be `kind:\"map\", origin:\"builtin\"`") and the json-schema help text ("`kind: \"map\"` enables the map canvas in the entry editor and adds `mapData` to entries") both describe the now-removed concept. Fix both in r001. (The CartographiaIndexView-adjacent comment about maps "still entries" is rewritten when that view is rewritten, so it is already covered.)
- `MapView`, `MapEditor`, `MapPin`, `useMapImageUrl` stay; repoint their props from the entry to the map record. Behavior unchanged.

---

## 5. The migration

One-pass, idempotent, defensive, lands with everything else (no deferred migration TODO).

1. Ensure `state.cartographia` exists (backfill `[]`).
2. Build the set of map-kind template ids: every template with `kind === "map"` (collapse across all of them, a world may in principle have more than the one builtin; treat them all as the same flat slice, the way Stemma has no per-tree template concept).
3. For each entry in `state.entries` whose `templateId` is in that set:
   - Construct a record `{ id: entry.id, name: entry.name, tags: entry.tags || [], fields: entry.fields || {}, mapData: entry.mapData || { image: null, pins: [] }, updatedAt: entry.updatedAt || isoNow() }`.
   - **Custom-field preservation (A1).** A user-created map template may carry fields beyond the three builtins (Description / Scope-Region / Notes). Those values are already in `entry.fields` and carry over verbatim into the record's `fields`, so no value is lost. But `cartographiaMapSchema()` renders only the three builtins, so any extra fields are preserved-but-unrendered. Append a Notes line to the record naming the preserved-but-unrendered fields (nothing-destroyed doctrine: a field that stops rendering gets recorded in Notes), e.g. "Migrated from a custom map template; these fields are preserved but no longer shown: <labels>."
   - Push to `state.cartographia`.
   - Mark the entry for removal from `state.entries`.
4. Remove the marked entries from `state.entries`.
5. **Remove the `kind:"map"` template(s) from `state.templates` regardless of origin (A1)**, and remove Map from `BUILTIN_TEMPLATES` at the source level (§4.7). This deliberately departs from the usual builtin-only migration-matcher convention (the existing `origin === "builtin"` filter that spares user templates): a `kind:"map"` template is functionless after the promotion (its entries are swept, the kind does nothing, and `TemplateBuilder` can no longer create one), so a leftover user-origin map template would be an inert orphan that is worse UX than removal. Its entries' data is already preserved in the slice (step 3), so removing the empty template destroys nothing.
6. **Idempotency:** after one run there are no `kind:"map"` entries and no `kind:"map"` templates of any origin, so a second run finds an empty set and does nothing. Guard every step with `Array.isArray` / existence checks so partial or malformed state (an entry pointing at a deleted map template, malformed `mapData`) does not throw, skip and continue.
7. **Nothing destroyed:** the builtin three fields move intact into the record's `fields`; tags, name, id, and `mapData` carry verbatim; any custom fields from user map templates are preserved in `fields` with a Notes line recording that they no longer render.

---

## 6. Explicit exclusions (do NOT do these here)

- **No per-map JSON import/export.** Deferred to the later, larger Cartographia work. It is a feature, not part of the promotion, and it breaks invisibility.
- **No drawing / editor work.** Do not add `mapData.drawing`. The drawing engine is pillar 3 of v1.6, built after modularization.
- **No module carve.** Cartographia stays inline in the monolith. This whole spec is done in the 2 MB single file, before modularization. (It is a single contained, fully mapped multi-site edit, worth paying monolith context for once.)
- **No new fields, no field changes, no index redesign** beyond matching Stemma's flat-list shape.

---

## 7. Affected code, by name (the edit surface)

- `BUILTIN_TEMPLATES`, `TEMPLATE_ORIGIN`: remove Map.
- `makeInitialState`, `makeDefaultCartographiaState` (NEW), `migrate`: slice default, backfill, and the entry→slice migration (including custom-field Notes line and origin-agnostic map-template removal, A1).
- `cartographiaMapSchema` (NEW), the three-field schema for the per-map form.
- `EntryView`, `EntryForm`: remove the `isMap` branches.
- `TemplateBuilder`: remove the `<option value="map">` and the `{draft.kind === "map"}` hint block (close the user-creation door).
- `CartographiaIndexView`: rewrite to the flat-slice Stemma shape; drop the template picker.
- `MapView`, `MapEditor`, `MapPin`: repoint props from entry to record.
- `useMapImageUrl`: unchanged.
- `GraphView`: pin-edge source from entry walk → registrant/slice.
- the registry definition + `getRegisteredGraphNodes`: add the maps registrant.
- **HTML export:** `renderEntryArticleHtml` (drop its `kind:"map"` branch) + a new slice walk calling `renderMapHtml` against records; `collectImageRefsForHtmlExport` (slice images); `HtmlExportModal.hasMaps` (repoint to the slice).
- **Markdown export (B1):** `buildMarkdownExport` (drop the entry-walk map branch, add a slice walk + slice image collection); `renderEntryBodyMarkdown` (repurpose its `kind:"map"` Pins branch for records); `buildSingleEntryMarkdown` (map branch now dead, leave or strip).
- `App`: "+ New Map" handler, map open/edit routing, map view prefs, remove the `kind:"map"` draft default.
- `RestoreBuiltinsModal`, `ResetTemplateModal`: **no code change** (no map-kind branches exist); verify Map drops out of the lists.
- Stale strings: the template-kind comment and the json-schema `kind:"map"` help text, fixed.

---

## 8. Build discipline (unchanged project rules)

- Parse-gate (`cd /tmp/babelcheck && node check.js`, expect `PARSE OK`) is a hard gate after every change. Parse-green is not working; browser smoke is the only proof.
- This is `r001` of the v1.6 line. The two in-app/export version literals (`<meta name="generator" content="Cartulary v1.5">` and the "Generated by Cartulary v1.5" export footer) flip to v1.6 as part of `r001` (they move the r-counter, so they belong in the first code-changed cut, not the r000 rename baseline). `build_inline.py` `VERSION` is already bumped to `1.6` (output filenames only).
- Stage mid-iteration as `Cartulary_v1.6_Working_r###_(descriptor).html`; dual-build is release-prep only.
- Defensive validation before any state touch. All migration logic in one pass, schema, removals, registry registration, no deferred TODOs. "Done" only when a reload from any older world state produces the canonical result.
