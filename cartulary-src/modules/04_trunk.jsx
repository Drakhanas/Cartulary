
const SPOUSE_KIND = "spouse";

// Sentinel value used in entry-ref refTemplatesId arrays to indicate "this
// field can reference celestial bodies from state.celestialBodies." Template
// definitions use the string "Celestial Body" in their refTemplates list;
// resolveTemplateRefs maps that to BODY_REF_SENTINEL in the runtime
// refTemplatesId array. EntryRefEditor recognizes the sentinel and adds
// bodies to its candidate pool. The ref-display side recognizes body IDs
// (which don't appear in state.entries) and falls through to state.
// celestialBodies for the name/icon lookup.
const BODY_REF_SENTINEL = "__bodies__";
// v1.5 r077: user-facing label unified with the Ephemeris workspace name
// ("Astronomical Body"). The internal sentinel id is unchanged, so saved
// worlds/packs that stored the resolved id keep working; the legacy "Celestial
// Body" label still resolves via the alias in resolveTemplateRefs.
const BODY_REF_LABEL = "Astronomical Body";

// Synthetic lane ids for Chronometric. Events use these in place of a
// templateId on `laneId` when they belong to a category-based lane rather
// than the entry's template lane. Naming convention: "synth:<category>".
const MARRIAGES_LANE_ID = "synth:marriages";
const SYNTHETIC_LANES = [
  { id: MARRIAGES_LANE_ID, name: "Marriages", icon: "♾", color: "#c8a96e" },
];
