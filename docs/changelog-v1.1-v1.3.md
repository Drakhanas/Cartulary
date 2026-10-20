# Cartulary changelog -- v1.1 through v1.3 (FROZEN)

> Frozen per-version archive for the early releases (v1.3 2026-05-14, v1.2 early May 2026, v1.1 late April 2026). Bundled because each entry is short. Verbatim from the original single-file changelog.

---

## v1.3 — released 2026-05-14

Template engine deep refactor + Concordance persistence + builder UX. See roadmap "Done — v1.3 release" section for the full feature list. Key items:

- Cascade-select with `optionsByParent` matrix, showWhen conditional visibility, multi-template entry-ref via `refTemplatesId`, refFilters, otherTextField with customText reveal
- 21/22 built-in template uplift pass (Map excluded as system template kind:map)
- Half-width auto-pair (universal rule + visibility-aware re-pairing, no flag required)
- Origin protection (`origin: "builtin" | "user"` on templates; migration framework filters on origin)
- Template Preview popup (live render in separate browser window)
- Concordance position persistence (drag-stick across reload/export/device, Level 1 stability within session)
- genId hardening (4-char trailing entropy instead of leading, +1.7M ID space per slug)
- Migration framework: FIELD_TYPE_CONVERSIONS, FIELD_VALUE_REMAPS, SHOWWHEN_UPDATES frameworks; OPTIONS_UPDATES extended for cascade-select with parentValue parameter
- 11 audit cleanup fixes
- 6 Home doc sections updated

## v1.2 — released early May 2026

- Marriage feature with auto-reciprocity (status/dates mirror across both partners; per-side label speaker-relative)
- Linea overhaul (junction-style descent geometry, lifespan dates, user-selectable depth limits, hover-tooltip on truncated names)
- Concordance polish (rotating edge labels, focus depth input)
- Chronometric Marriages lane (dedicated synthetic lane for marriage spans)

## v1.1 — released late April 2026

- Stemma feature (radial canvas, 16 fixed slots, drill-down, JSON I/O with collision modal)
- Pre-1.1 bug audit (4 fixes)
- Favicon design + inline wiring
- Dual-build inlining pass (precompiled + readable outputs, fully offline)
- Release-prep documentation

