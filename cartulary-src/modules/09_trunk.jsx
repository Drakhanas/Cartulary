
// Fresh worlds are run through migrate() before being returned. The fresh
// state's templates are already canonical (straight from seedBuiltinTemplates
// → BUILTIN_TEMPLATES), so every migration is a no-op for content — but the
// trackers (state.world.fieldOrderUpdates, .optionsUpdates, .seededFields,
// .iconMigrations, .templateRenames, all the rest) get populated as if each
// migration had just applied. This matters because if the user customizes
// their fresh world (reorder a field, remove a built-in field, edit options)
// and then exports+reimports BEFORE any reload-from-IDB cycle that would have
// run migrate(), the export carries an empty tracker map. On reimport
// migrate() sees no rev markers and re-imposes canonical schema, silently
// wiping the user's customization. Pre-seeding via migrate() closes that gap:
// fresh worlds carry "everything is canonical and already applied" markers
// from creation, so subsequent user customizations are preserved through
// any number of export/reimport cycles.
//
// Forward-compatibility note: any future migration added to migrate() will
// automatically be pre-seeded on fresh worlds without requiring a parallel
// edit here. Don't manually pre-seed individual trackers — let migrate()
// own the canonical knowledge of which markers exist.
// Default Ephemeris view-state (v1.5). Per-mode substate plus shared tree-UI.
// Used by makeInitialState for fresh worlds and by migrate() to backfill
// existing worlds. Sets serialize awkwardly to JSON, so set-like substates
// (expandedRecurring, treeUI.expandedNodeIds) use arrays. Reasonable defaults
// per mode — empty queries, default view modes, no saved viewpoints. Per-
// mode decisions trace to the v1.5 Ephemeris scoping (EVT/AB/CM/OM lock set).
const makeDefaultEphemerisState = () => ({
  currentMode: "asbo",
  asbo: {
    selectedBodyId: null,
  },
  compute: {
    viewMode: "split",
    splitRatio: 0.4,
    currentQuery: {
      alignmentType: "phase",
      bodyIds: [],
      dateRangeStart: null,
      dateRangeEnd: null,
      tolerance: null,
      resultLimit: 500,
    },
    results: [],
    selectedResultId: null,
    savedQueries: [],
  },
  observe: {
    viewMode: "top-down",
    date: null,
    zoom: 1,
    panX: 0,
    panY: 0,
    selectedBodyId: null,
    displayToggles: {
      orbitalPaths: true,
      bodyLabels: true,
      grid: false,
      sizeScaling: "visual",
      trails: false,
    },
    kindColors: {},
    elementColors: {},
    bodyColorOverrides: {},
    savedViewpoints: [],
  },
  event: {
    selectedEventId: null,
    viewMode: "list",
    filters: {},
    sort: { column: "date", direction: "asc" },
    expandedRecurring: [],
    drawer: { isOpen: false, eventId: null },
  },
  // v1.5 r045 Forced Alignment workspace. Inverse of Compute: user picks
  // bodies + target date + alignment type + optional recurrence, then the
  // workspace shows what edits force that alignment and (on confirm) writes
  // them. Math model: adjust mean anomaly at epoch for one-shot, and
  // additionally rewrite semi-major axis to lock period commensurate with
  // recurrence interval for recurring. Picker state is per-workspace
  // (separate from compute.currentQuery.bodyIds so switching modes doesn't
  // wipe selection).
  forceAlign: {
    alignmentType: "phase",
    bodyIds: [],
    targetDate: null,         // { year, monthIndex, day } in targetCalendarId frame
    targetCalendarId: null,   // null = primary world calendar
    recurInterval: null,      // null = one-shot; positive int = days between recurrences
    phaseReferenceFraction: 0, // r048: 0 = periapsis, 0.5 = apoapsis, etc.
    lastApply: null,           // r051: snapshot of most recent apply, for revert + verify-in-Compute
  },
  treeUI: {
    expandedNodeIds: [],
    scrollY: 0,
    searchText: "",
  },
});

// Glossopoeia (the conlang core view, v1.5). Its own world-scoped state slice,
// surfaced through the node-source registry the same way Ephemeris surfaces
// celestialBodies. ConLang is the language container; the other entities
// (lexemes, and the phonology / morphology / etc. workspaces added in later
// build steps) hang off a parent language by id. `ui` holds view-local state
// (active language, current workspace). Empty on fresh worlds. Existing
// Language / Glossary entries migrate into here at load — the supersede, a
// separate build step.
const makeDefaultGlossopoeiaState = () => ({
  conlangs: [],
  lexemes: [],
  phonemes: [],
  syllableStructures: [],
  stressPatterns: [],
  phonotacticConstraints: [],
  phonologicalRules: [],
  grammaticalValues: [],
  affixes: [],
  wordBuildingProcesses: [],
  inflectionClasses: [],
  pronounSets: [],
  phraseOrders: [],
  sentenceMarkings: [],
  constructions: [],
  relativizations: [],
  clauseLinkings: [],
  writingSystems: [],
  graphemes: [],
  spellingRules: [],
  corpusEntries: [],
  // Per-workspace free-text notes, outside the entity schemas:
  // workspaceNotes[langId][workspaceId] = string (rich textarea). The
  // Inventory romanization/pronunciation key lives here; Orthography reuses it.
  workspaceNotes: {},
  ui: { activeLangId: null, workspace: "overview" },
});

// Cartographia map slice (v1.6 r001). Maps were promoted from kind:"map"
// entries to a flat, Stemma-shaped state slice. Each record:
//   { id, name, tags:[], fields:{}, mapData:{image,pins}, updatedAt }
// The three fields render through the shared EntryForm via cartographiaMapSchema
// (the Glossopoeia pattern); the canvas (MapView/MapEditor) composes above them
// in the Cartographia per-map view. Empty on fresh worlds; existing kind:"map"
// entries migrate into here in migrate().
const makeDefaultCartographiaState = () => [];

// Fixed schema field ids for the three built-in map fields. Built-in template
// fields are seeded with random-suffixed ids (fld-<slug>-<rand>), so every
// world's Map template had DIFFERENT field ids. The migration therefore remaps
// existing map-entry field values from those per-world ids onto these stable
// ids by LABEL, so a fixed schema can resolve them. (The spec's "preserve ids"
// is satisfied by value-preservation via remap, not by literal id identity,
// which was never possible.)
const CART_FIELD_DESCRIPTION = "cart-fld-description";
const CART_FIELD_SCOPE = "cart-fld-scope-region";
const CART_FIELD_NOTES = "cart-fld-notes";

// The per-map field schema, shaped like a template so EntryForm/EntryView render
// it uniformly. kind is "standard": the canvas is composed by the Cartographia
// view, not by the retired isMap special-casing.
const cartographiaMapSchema = () => ({
  id: SYNTH_TPL_MAP,
  name: "Map",
  icon: "\u25a3", // ▣
  color: "#7ec8c8",
  kind: "standard",
  origin: TEMPLATE_ORIGIN.BUILTIN,
  fields: [
    { id: CART_FIELD_DESCRIPTION, label: "Description", type: "textarea" },
    { id: CART_FIELD_SCOPE, label: "Scope / Region", type: "text" },
    { id: CART_FIELD_NOTES, label: "Notes", type: "textarea" },
  ],
});

// ─── Initial state ─────────────────────────────────────────────────────────────

const makeInitialState = () => migrate({
  schemaVersion: SCHEMA_VERSION,
  world: {
    name: "Untitled World",
    description: "",
    imageFolder: "world-images",
    locked: false,
    calendar: JSON.parse(JSON.stringify(DEFAULT_CALENDAR)),
    createdAt: isoNow(),
    updatedAt: isoNow(),
  },
  templates: seedBuiltinTemplates(),
  entries: [],
  stemmas: [],
  // Template packs (v1.5). Named reference-sets over state.templates — a pack
  // groups template ids for display + sharing; it never owns or copies the
  // templates themselves. Shape: [{id, name, description, templateIds:[...]}].
  // Built-in templates are never members. Empty on fresh worlds.
  packs: [],
  // Concordance graph layout persistence (v1.3+).
  // positions: { [entryId]: {x, y} } — manually-dragged or settled positions
  // for Concordance nodes. Persists across reloads, export/import, and device
  // transfer. Nodes without saved positions get auto-placed via single-pass
  // force layout when first rendered, then their settled positions get
  // written back here for next time.
  concordance: { positions: {} },
  // Ephemeris celestial bodies (v1.5). Top-level state slice for stars,
  // planets, moons, and other body kinds. Stored at world scope (persisted to
  // JSON save). Each body carries the six classical orbital elements plus
  // physical parameters; kind-aware fields layer on via the kind:celestial-
  // body system template. Empty on fresh worlds; existing v1.4 worlds get
  // their `calendar.celestials` data migrated into here during migrate() with
  // parentBodyId: null (user re-homes the bodies in Ephemeris).
  celestialBodies: [],
  // Ephemeris view-state (v1.5). Per-mode UI substate plus shared tree-UI.
  // See cartulary-doctrine "Ephemeris math depth" and the v1.5 handoff for
  // the full per-mode decision set.
  ephemeris: makeDefaultEphemerisState(),
  // Glossopoeia view slice (v1.5). See makeDefaultGlossopoeiaState.
  glossopoeia: makeDefaultGlossopoeiaState(),
  // Cartographia map slice (v1.6 r001). See makeDefaultCartographiaState.
  cartographia: makeDefaultCartographiaState(),
});
