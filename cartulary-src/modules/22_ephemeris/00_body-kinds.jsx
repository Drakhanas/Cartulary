
// Full default shape for a new celestial body. Single source of truth so every
// creation path (AsBo createBody, calendar-editor moon quick-create) produces
// an identically-shaped record — no field drift that would break AsBo display
// or downstream assumptions. Caller generates the id and may override fields
// (kind, parentBodyId, seeded synodic cycle, etc.). Function declaration so it
// hoists for all call sites regardless of source position.
function makeNewCelestialBody(id, overrides = {}) {
  return {
    id,
    name: "New Body",
    kind: "structure",
    parentBodyId: null,
    otherNames: "",
    type: "",
    status: null,
    discoveredFounded: null,
    orbitalElements: {
      semiMajorAxis: null,
      eccentricity: 0,
      inclination: 0,
      ascendingNode: 0,
      argumentOfPeriapsis: 0,
      meanAnomalyAtEpoch: 0,
    },
    physicalParams: { mass: null, radius: null, axialTilt: null },
    rotationPeriod: null,
    atmosphere: "",
    gravity: "",
    visibleFrom: [],
    notableLocations: [],
    inhabitedBy: [],
    sacredTo: [],
    physicalProperties: "",
    climateConditions: "",
    mythologicalSignificance: "",
    description: "",
    history: "",
    notes: "",
    tags: "",
    ...overrides,
  };
}

// Build a parent → children Map from the bodies array. Top-level bodies
// (parentBodyId null / missing) live under the null key. Used by the tree
// renderer to walk recursively. Defensive against missing parentBodyId
// fields (treats them as top-level).
const buildBodyTree = (bodies) => {
  const byParent = new Map();
  bodies.forEach(b => {
    if (!b || !b.id) return;
    const key = b.parentBodyId || null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(b);
  });
  // Sort each sibling list. Top-level bodies (key null): alphabetical by
  // name. Bodies with parents: by semi-major axis ascending, falling back
  // to alphabetical when the element is missing or non-numeric. Matches
  // AB.10 — closest-to-parent first for orbiters, alphabetical for stars
  // and rogue bodies at the root.
  byParent.forEach((siblings, parentKey) => {
    if (parentKey === null) {
      siblings.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else {
      siblings.sort((a, b) => {
        const aa = a?.orbitalElements?.semiMajorAxis;
        const bb = b?.orbitalElements?.semiMajorAxis;
        const aNum = Number.isFinite(aa) ? aa : null;
        const bNum = Number.isFinite(bb) ? bb : null;
        if (aNum != null && bNum != null) return aNum - bNum;
        if (aNum != null) return -1;
        if (bNum != null) return 1;
        return (a.name || "").localeCompare(b.name || "");
      });
    }
  });
  return byParent;
};

// Computable body kinds — the 9 that participate in orbital math and the
// Compute / Observe / Event surfaces. Locked at scoping. Used by the kind
// label in the tree, the editor kind selector, and per-kind defaults.
// Order roughly matches the cross-cutting decision listing in the handoff.
const BODY_KINDS = [
  { id: "star",          label: "Star",          symbol: "☉" },
  { id: "planet",        label: "Planet",        symbol: "●" },
  { id: "moon",          label: "Moon",          symbol: "◐" },
  { id: "dwarf-planet",  label: "Dwarf Planet",  symbol: "·" },
  { id: "asteroid",      label: "Asteroid",      symbol: "◇" },
  { id: "comet",         label: "Comet",         symbol: "☄" },
  { id: "rogue-planet",  label: "Rogue Planet",  symbol: "○" },
  { id: "black-hole",    label: "Black Hole",    symbol: "●" },
  { id: "meteor-shower", label: "Meteor Shower", symbol: "✦" },
];

// Narrative body kinds — added in v1.5 r007. Exist for worldbuilding
// organization. Do not participate in orbital math, Compute / Observe /
// Event eligibility. Cover the v1.4 Astronomical Body Type options that
// don't map to a coherent single-body orbital model (galaxies don't have
// a single gravitational center; wormholes aren't bound by Keplerian
// orbits; sectors are organizational containers, etc.). The "structure"
// entry is the generic fallback for the v1.4 "Other" case and for users
// who want a body that isn't pre-categorized.
const NARRATIVE_BODY_KINDS = [
  // v1.5 r041: narrative mirrors of every computable kind, for users who want
  // to label a body conceptually ("a star," "a moon") without invoking orbital
  // math. Symbols match the computable counterparts; "(narrative)" suffix
  // disambiguates in surfaces that show kinds flat (closed select, body
  // headers). The optgroup heading in the AsBo dropdown also groups them.
  { id: "narrative-star",          label: "Star (narrative)",          symbol: "☉" },
  { id: "narrative-planet",        label: "Planet (narrative)",        symbol: "●" },
  { id: "narrative-moon",          label: "Moon (narrative)",          symbol: "◐" },
  { id: "narrative-dwarf-planet",  label: "Dwarf Planet (narrative)",  symbol: "·" },
  { id: "narrative-asteroid",      label: "Asteroid (narrative)",      symbol: "◇" },
  { id: "narrative-comet",         label: "Comet (narrative)",         symbol: "☄" },
  { id: "narrative-rogue-planet",  label: "Rogue Planet (narrative)",  symbol: "○" },
  { id: "narrative-black-hole",    label: "Black Hole (narrative)",    symbol: "●" },
  { id: "narrative-meteor-shower", label: "Meteor Shower (narrative)", symbol: "✦" },
  { id: "galaxy",            label: "Galaxy",            symbol: "⊛" },
  { id: "nebula",             label: "Nebula",             symbol: "☁" },
  { id: "star-system",        label: "Star System",        symbol: "⊙" },
  { id: "constellation",      label: "Constellation",      symbol: "✧" },
  { id: "sector",             label: "Sector",             symbol: "▢" },
  { id: "asteroid-belt",      label: "Asteroid Belt",      symbol: "◌" },
  { id: "ring-system",        label: "Ring System",        symbol: "◯" },
  { id: "supernova-remnant",  label: "Supernova Remnant",  symbol: "✶" },
  { id: "quasar",             label: "Quasar",             symbol: "✺" },
  { id: "wormhole",           label: "Wormhole",           symbol: "∞" },
  { id: "megastructure",      label: "Megastructure",      symbol: "⬛" },
  { id: "anomaly",            label: "Anomaly",            symbol: "⁂" },
  { id: "structure",          label: "Structure (other)",  symbol: "◇" },
];

// Merged lookup table. Each entry carries the `computable` flag so callers
// can filter at runtime without needing to consult both lists separately.
const BODY_KIND_BY_ID = Object.fromEntries(
  [
    ...BODY_KINDS.map(k => ({ ...k, computable: true })),
    ...NARRATIVE_BODY_KINDS.map(k => ({ ...k, computable: false })),
  ].map(k => [k.id, k])
);

// v1.5 r019: default kind→color palette for Observe rendering. Used by
// the top-down view to color bodies and their orbital paths. Per OM.1.5
// the layered color resolution is kindColors → elementColors →
// bodyColorOverrides; r019 implements only the kind layer with these
// defaults. r020 wires the override layers + customization UI. Palette
// chosen for distinct hues at low saturation that read well on the
// dark surface substrate.
const BODY_KIND_COLORS_DEFAULT = {
  // Computable
  "star":           "#f0c060",  // warm gold
  "planet":         "#5a8fb5",  // muted blue
  "moon":           "#a0a0a8",  // silver-grey
  "dwarf-planet":   "#c89070",  // soft terracotta
  "asteroid":       "#8a7050",  // dim umber
  "comet":          "#a8d0d8",  // pale cyan
  "rogue-planet":   "#7060a0",  // dim purple
  "black-hole":     "#404048",  // very dark slate (rendered with outline)
  "meteor-shower":  "#c0c0d0",  // pale silver
  // Narrative
  "galaxy":             "#806890",  // dim violet
  "nebula":             "#b07090",  // dim rose
  "star-system":        "#90b0c0",  // pale blue-grey
  "constellation":      "#d0d0a0",  // pale yellow
  "sector":             "#708090",  // slate grey
  "asteroid-belt":      "#988060",  // dim brown-gold
  "ring-system":        "#9890b0",  // dim lavender
  "supernova-remnant":  "#d09060",  // dim orange
  "quasar":             "#e0d090",  // dim bright yellow
  "wormhole":           "#7090a0",  // dim teal
  "megastructure":      "#a0a0a0",  // neutral grey
  "anomaly":            "#c0a0d0",  // pale violet
  "structure":          "#909090",  // mid grey (generic fallback)
};
const observeColorForKind = (kindId) => BODY_KIND_COLORS_DEFAULT[kindId] || "#909090";

// True for kinds that participate in orbital math (Compute / Observe /
// Event). False for narrative-only kinds. Unknown kind id (legacy data,
// future expansion) is treated as non-computable — defensive default
// against surfacing junk in computation pipelines.
const isComputableKind = (kindId) => {
  if (!kindId) return false;
  const k = BODY_KIND_BY_ID[kindId];
  return !!(k && k.computable);
};