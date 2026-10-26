
// ── Node-source registry (v1.5 r075) ────────────────────────────────────
// A "node source" is a class of first-class, linkable objects that live
// OUTSIDE state.entries — e.g. astronomical bodies in state.celestialBodies.
// Registering one makes it (1) graphable in Concordance and (2) targetable
// by entry-ref fields, by presenting it as a SYNTHETIC TEMPLATE that the
// existing templateId-keyed machinery can consume with minimal branching.
//
// Registration is a DATA CONTRACT, not a code API: each source supplies a
// descriptor. Core views satisfy it in code (an adapter over their slice);
// a future pack could satisfy the same descriptor by declaration once the
// Packs framework grows past templates-only. The descriptor shape is kept
// declarative on purpose so that door stays open at no cost now.
//
// r075 is FOUNDATION ONLY: the registry, the Astronomical Body registrant,
// and read helpers. NOTHING consumes it yet — Concordance read (r076),
// ref-target authoring (r077), Stemma/Cartographia (r078), and the
// Ephemeris-delete scrub (r079) wire it in after. Mirrors the r062 grid
// foundation: seam first, behavior after.
//
// Descriptor shape:
//   {
//     id,            // synthetic template id (stable, reserved, never user/builtin)
//     name,          // user-facing type name; the string packs target in refTemplates
//     color,         // default type/swatch color (per-NODE color comes from getColor)
//     icon,          // glyph for surfaces that show a template icon
//     refEligible,   // may entry-ref fields target this type?
//     getInstances(state) -> [{ id, name, kind }]   nodes / ref candidates
//     getColor(inst)      -> color string            per-instance (kind-based)
//     getEdges(state)     -> [{ source, target, label, kind }]  intra-source edges
//   }

// Reserved synthetic-template id. Unified onto the existing entry-ref body
// sentinel ("__bodies__") so refTemplatesId, the Concordance legend/toggle,
// node ids, and the ref-target choosers all share ONE identifier for the
// Astronomical Body type instead of two parallel ones.
const SYNTH_TPL_ASTROBODY = BODY_REF_SENTINEL;

// Glossopoeia ConLang sentinel. The synthetic-template id for the language
// container, shared by refTemplatesId, Concordance, node ids, and the
// ref-target choosers, exactly as SYNTH_TPL_ASTROBODY is for bodies. ConLang
// records live in state.glossopoeia.conlangs.
const SYNTH_TPL_CONLANG = "__conlangs__";
const CONLANG_REF_LABEL = "ConLang";
// Glossopoeia Lexeme sentinel. Lexeme records (words, phrases, idioms) live in
// state.glossopoeia.lexemes, each carrying a langId to its parent ConLang.
const SYNTH_TPL_LEXEME = "__lexemes__";
const LEXEME_REF_LABEL = "Lexeme";
// Glossopoeia Phoneme sentinel. Phoneme records (one per sound) live in
// state.glossopoeia.phonemes, each with a langId to its parent ConLang.
const SYNTH_TPL_PHONEME = "__phonemes__";
const PHONEME_REF_LABEL = "Phoneme";
// Glossopoeia Morphology sentinels (chunk 3b). The four toolbox entities all
// register as node types so refs resolve and they graph in Concordance.
// Records live in state.glossopoeia.{grammaticalValues, affixes,
// wordBuildingProcesses, inflectionClasses}, each carrying a langId.
const SYNTH_TPL_GRAMVALUE = "__gramvalues__";
const GRAMVALUE_REF_LABEL = "Grammatical Value";
const SYNTH_TPL_AFFIX = "__affixes__";
const AFFIX_REF_LABEL = "Affix";
const SYNTH_TPL_WBP = "__wordbuilding__";
const WBP_REF_LABEL = "Word-Building Process";
const SYNTH_TPL_INFLCLASS = "__inflclasses__";
const INFLCLASS_REF_LABEL = "Inflection Class";
// Orthography sentinel (chunk 3f). Writing System registers as a node so
// Grapheme.Belongs To resolves; Grapheme and Spelling Rule stay view-internal.
const SYNTH_TPL_WRITINGSYSTEM = "__writingsystems__";
const WRITINGSYSTEM_REF_LABEL = "Writing System";

// Cartographia Map sentinel (v1.6 r001). Maps live in state.cartographia, a
// flat slice (no langId, no parent). Registered as a node source so they stay
// graphable in Concordance with their outbound pin edges. Ref-eligible since
// v1.7 r003, on purpose (Drak, 2026-10-24): the template builder offered Map
// as a target all along, and since v1.6.1's r052 a reference to a map
// survives the load.
const SYNTH_TPL_MAP = "__maps__";
const MAP_REF_LABEL = "Map";

// Fabula's record kinds (v1.7 r006; docs/fabula-spec.md, section 3). Each
// has the array in state.fabula that holds its records (slice) and a sentinel
// id, the way Glossopoeia's kinds have theirs, so a reference field can name a
// kind of Fabula record. They joined the registry with the first cut that
// shows Fabula, v1.7's r007, as sources that aren't eligible as reference
// targets, together with Concordance's single Fabula toggle and a template
// builder that offers only eligible sources (Drak, 2026-10-25). label is the
// kind's own name, where name says it's Fabula's; color is its node's in
// Concordance; plural is the label in a sentence ("This story has no cast
// yet.", v1.7 r008).
const FABULA_KINDS = [
  { kind: "corpus",       slice: "corpora",       id: "__fabula_corpora__",       name: "Corpus (Fabula)",           label: "Corpus",           color: "#d9a066", plural: "corpora" },
  { kind: "story",        slice: "stories",       id: "__fabula_stories__",       name: "Story (Fabula)",            label: "Story",            color: "#e6c27a", plural: "stories" },
  { kind: "cast",         slice: "cast",          id: "__fabula_cast__",          name: "Cast (Fabula)",             label: "Cast",             color: "#d98f8f", plural: "cast" },
  { kind: "arc",          slice: "arcs",          id: "__fabula_arcs__",          name: "Arc (Fabula)",              label: "Arc",              color: "#c97b9b", plural: "arcs" },
  { kind: "relationship", slice: "relationships", id: "__fabula_relationships__", name: "Relationship (Fabula)",     label: "Relationship",     color: "#b98bc0", plural: "relationships" },
  { kind: "plotPoint",    slice: "plotPoints",    id: "__fabula_plotpoints__",    name: "Plot Point (Fabula)",       label: "Plot Point",       color: "#8fa8d9", plural: "plot points" },
  { kind: "promise",      slice: "promises",      id: "__fabula_promises__",      name: "Promise & Payoff (Fabula)", label: "Promise & Payoff", color: "#7fb8c2", plural: "promises and payoffs" },
  { kind: "part",         slice: "parts",         id: "__fabula_parts__",         name: "Part / Act (Fabula)",       label: "Part / Act",       color: "#a3b87f", plural: "parts" },
  { kind: "chapter",      slice: "chapters",      id: "__fabula_chapters__",      name: "Chapter (Fabula)",          label: "Chapter",          color: "#c2b47f", plural: "chapters" },
  { kind: "scene",        slice: "scenes",        id: "__fabula_scenes__",        name: "Scene (Fabula)",            label: "Scene",            color: "#d6a07a", plural: "scenes" },
  { kind: "research",     slice: "research",      id: "__fabula_research__",      name: "Research Note (Fabula)",    label: "Research Note",    color: "#a3a3ad", plural: "research notes" },
];

const NODE_SOURCE_REGISTRY = [
  {
    id: SYNTH_TPL_ASTROBODY,
    name: "Astronomical Body",
    color: "#5a8fb5",
    icon: "\u2609", // ☉
    refEligible: true,
    getInstances: (state) =>
      (Array.isArray(state.celestialBodies) ? state.celestialBodies : [])
        .filter(b => b && b.id)
        .map(b => ({ id: b.id, name: (b.name || "Unnamed Body"), kind: b.kind || "structure" })),
    getColor: (inst) => observeColorForKind(inst && inst.kind),
    // Orbital hierarchy as edges: each body with a resolvable parent draws
    // parent -> child, so the graph reads star -> planet -> moon (the sector
    // graph). Dangling parentBodyId (parent deleted) is dropped defensively.
    getEdges: (state) => {
      const bodies = Array.isArray(state.celestialBodies) ? state.celestialBodies : [];
      const ids = new Set(bodies.map(b => b && b.id).filter(Boolean));
      const edges = [];
      bodies.forEach(b => {
        if (b && b.parentBodyId && ids.has(b.parentBodyId)) {
          edges.push({ source: b.parentBodyId, target: b.id, label: "orbits", kind: "directed" });
        }
      });
      return edges;
    },
  },
  {
    id: SYNTH_TPL_CONLANG,
    name: CONLANG_REF_LABEL,
    color: "#6ea8c8",
    icon: "\u25eb", // ◫ (the language glyph, carried from Language / Glossary)
    refEligible: true,
    getInstances: (state) =>
      ((state.glossopoeia && Array.isArray(state.glossopoeia.conlangs)) ? state.glossopoeia.conlangs : [])
        .filter(c => c && c.id)
        .map(c => ({ id: c.id, name: (c.name || "Unnamed Language"), kind: "language" })),
    getColor: () => "#6ea8c8",
    // Dialect hierarchy as edges: a language whose Variety Of points at another
    // language draws parent -> child ("variety of"). Dangling refs are dropped.
    getEdges: (state) => {
      const langs = ((state.glossopoeia && Array.isArray(state.glossopoeia.conlangs)) ? state.glossopoeia.conlangs : []);
      const ids = new Set(langs.map(c => c && c.id).filter(Boolean));
      const edges = [];
      langs.forEach(c => {
        const vo = (c && c.fields) ? c.fields.varietyOf : null;
        const parent = typeof vo === "string" ? vo : (vo && vo.id ? vo.id : null);
        if (parent && parent !== c.id && ids.has(parent)) {
          edges.push({ source: parent, target: c.id, label: "variety of", kind: "directed" });
        }
        const df = (c && c.fields) ? c.fields.descendedFrom : null;
        const anc = typeof df === "string" ? df : (df && df.id ? df.id : null);
        if (anc && anc !== c.id && ids.has(anc)) {
          edges.push({ source: anc, target: c.id, label: "descended from", kind: "directed" });
        }
      });
      return edges;
    },
  },
  {
    id: SYNTH_TPL_LEXEME,
    name: LEXEME_REF_LABEL,
    color: "#8aa86e",
    icon: "\u2022", // •
    refEligible: true,
    getInstances: (state) =>
      ((state.glossopoeia && Array.isArray(state.glossopoeia.lexemes)) ? state.glossopoeia.lexemes : [])
        .filter(x => x && x.id)
        .map(x => ({ id: x.id, name: (x.name || "Unnamed Word"), kind: "lexeme" })),
    getColor: () => "#8aa86e",
    // Etymology edges: Derived From and Source Word draw source -> this word.
    getEdges: (state) => {
      const lex = ((state.glossopoeia && Array.isArray(state.glossopoeia.lexemes)) ? state.glossopoeia.lexemes : []);
      const ids = new Set(lex.map(x => x && x.id).filter(Boolean));
      const edges = [];
      const refIds = (v) => Array.isArray(v) ? v.map(it => (typeof it === "string" ? it : (it && it.id))).filter(Boolean) : [];
      lex.forEach(x => {
        if (!x || !x.fields) return;
        refIds(x.fields.derivedFrom).forEach(src => { if (ids.has(src) && src !== x.id) edges.push({ source: src, target: x.id, label: "derived from", kind: "directed" }); });
        refIds(x.fields.sourceWord).forEach(src => { if (ids.has(src) && src !== x.id) edges.push({ source: src, target: x.id, label: "source of", kind: "directed" }); });
        refIds(x.fields.descendedFrom).forEach(src => { if (ids.has(src) && src !== x.id) edges.push({ source: src, target: x.id, label: "descended from", kind: "directed" }); });
      });
      return edges;
    },
  },
  {
    id: SYNTH_TPL_PHONEME,
    name: PHONEME_REF_LABEL,
    color: "#c89a6e",
    icon: "\u03c6", // φ
    refEligible: true,
    getInstances: (state) =>
      ((state.glossopoeia && Array.isArray(state.glossopoeia.phonemes)) ? state.glossopoeia.phonemes : [])
        .filter(p => p && p.id)
        .map(p => ({ id: p.id, name: (p.name || "?"), kind: "phoneme" })),
    getColor: () => "#c89a6e",
    // Diphthong components as edges: a diphthong's Nucleus / Offglide draw the
    // vowel -> diphthong link.
    getEdges: (state) => {
      const ph = ((state.glossopoeia && Array.isArray(state.glossopoeia.phonemes)) ? state.glossopoeia.phonemes : []);
      const ids = new Set(ph.map(p => p && p.id).filter(Boolean));
      const edges = [];
      const oneId = (v) => (typeof v === "string" ? v : (v && v.id ? v.id : null));
      ph.forEach(p => {
        if (!p || !p.fields) return;
        [["nucleus", "nucleus of"], ["offglide", "offglide of"]].forEach(([k, label]) => {
          const src = oneId(p.fields[k]);
          if (src && ids.has(src) && src !== p.id) edges.push({ source: src, target: p.id, label, kind: "directed" });
        });
      });
      return edges;
    },
  },
  {
    id: SYNTH_TPL_GRAMVALUE,
    name: GRAMVALUE_REF_LABEL,
    color: "#9a8ec8",
    icon: "\u25c8", // ◈
    refEligible: true,
    getInstances: (state) =>
      ((state.glossopoeia && Array.isArray(state.glossopoeia.grammaticalValues)) ? state.glossopoeia.grammaticalValues : [])
        .filter(x => x && x.id)
        .map(x => ({ id: x.id, name: (x.name || "Unnamed Value"), kind: "grammatical-value" })),
    getColor: () => "#9a8ec8",
  },
  {
    id: SYNTH_TPL_AFFIX,
    name: AFFIX_REF_LABEL,
    color: "#c87e9a",
    icon: "\u2295", // ⊕
    refEligible: true,
    getInstances: (state) =>
      ((state.glossopoeia && Array.isArray(state.glossopoeia.affixes)) ? state.glossopoeia.affixes : [])
        .filter(x => x && x.id)
        .map(x => ({ id: x.id, name: (x.name || "Unnamed Affix"), kind: "affix" })),
    getColor: () => "#c87e9a",
  },
  {
    id: SYNTH_TPL_WBP,
    name: WBP_REF_LABEL,
    color: "#7ec8a8",
    icon: "\u2699", // ⚙
    refEligible: true,
    getInstances: (state) =>
      ((state.glossopoeia && Array.isArray(state.glossopoeia.wordBuildingProcesses)) ? state.glossopoeia.wordBuildingProcesses : [])
        .filter(x => x && x.id)
        .map(x => ({ id: x.id, name: (x.name || "Unnamed Process"), kind: "word-building" })),
    getColor: () => "#7ec8a8",
  },
  {
    id: SYNTH_TPL_INFLCLASS,
    name: INFLCLASS_REF_LABEL,
    color: "#c8b87e",
    icon: "\u25a6", // ▦
    refEligible: true,
    getInstances: (state) =>
      ((state.glossopoeia && Array.isArray(state.glossopoeia.inflectionClasses)) ? state.glossopoeia.inflectionClasses : [])
        .filter(x => x && x.id)
        .map(x => ({ id: x.id, name: (x.name || "Unnamed Class"), kind: "inflection-class" })),
    getColor: () => "#c8b87e",
  },
  {
    id: SYNTH_TPL_WRITINGSYSTEM,
    name: WRITINGSYSTEM_REF_LABEL,
    color: "#c8a86e",
    icon: "\u270e", // ✎
    refEligible: true,
    getInstances: (state) =>
      ((state.glossopoeia && Array.isArray(state.glossopoeia.writingSystems)) ? state.glossopoeia.writingSystems : [])
        .filter(x => x && x.id)
        .map(x => ({ id: x.id, name: (x.name || "Unnamed Script"), kind: "writing-system" })),
    getColor: () => "#c8a86e",
  },
  {
    id: SYNTH_TPL_MAP,
    name: MAP_REF_LABEL,
    color: "#7ec8c8",
    icon: "\u25a3", // ▣
    refEligible: true,
    getInstances: (state) =>
      (Array.isArray(state.cartographia) ? state.cartographia : [])
        .filter(m => m && m.id)
        .map(m => ({ id: m.id, name: (m.name || "Untitled Map"), kind: "map" })),
    getColor: () => "#7ec8c8",
    // Outbound pin edges: for each pin with a target entry, map -> entry, with
    // the same 📍-prefixed label rule the kind:"map" entry walk used in v1.5.
    // A field that references a map adds its own edge into the map, from the
    // field walk in Concordance.
    getEdges: (state) => {
      const maps = Array.isArray(state.cartographia) ? state.cartographia : [];
      const edges = [];
      maps.forEach(m => {
        const pins = (m && m.mapData && Array.isArray(m.mapData.pins)) ? m.mapData.pins : [];
        pins.forEach(pin => {
          if (pin && pin.entryId) {
            const label = (pin.label && pin.label.trim()) ? `\ud83d\udccd ${pin.label}` : "\ud83d\udccd pin";
            edges.push({ source: m.id, target: pin.entryId, label, kind: "directed" });
          }
        });
      });
      return edges;
    },
  },
  // v1.7 r007: Fabula's record kinds (FABULA_KINDS), one source each. Not
  // eligible: no template's field can point at one, and the template builder
  // offers eligible sources only. group puts all eleven behind one toggle in
  // Concordance's filter, named by groupName. Their records and edges are read
  // beside Fabula's view (fabulaRegistryInstances, fabulaRegistryEdges).
  ...FABULA_KINDS.map(k => ({
    id: k.id,
    name: k.name,
    color: k.color,
    icon: "\u2042", // ⁂
    refEligible: false,
    group: "fabula",
    groupName: "Fabula",
    getInstances: (state) => fabulaRegistryInstances(state, k),
    getColor: () => k.color,
    getEdges: (state) => fabulaRegistryEdges(state, k),
  })),
];

// Synthetic template objects, shaped like BUILTIN_TEMPLATES entries so the
// ref picker / coloring / name-resolution can treat them uniformly. The
// `synthetic` flag marks them as non-entry-backed: the migration framework
// and template editor must skip them (they have no editable field schema).
const getRegisteredSyntheticTemplates = () =>
  NODE_SOURCE_REGISTRY.map(src => ({
    id: src.id,
    name: src.name,
    icon: src.icon,
    color: src.color,
    kind: "synthetic",
    origin: TEMPLATE_ORIGIN.BUILTIN,
    synthetic: true,
    refEligible: !!src.refEligible,
    group: src.group || null,
    groupName: src.groupName || null,
    fields: [],
  }));

const getRegisteredSourceById = (id) =>
  NODE_SOURCE_REGISTRY.find(s => s.id === id) || null;

// True if `id` resolves to a registered (non-entry) node in current state.
const isRegisteredNodeId = (state, id) => {
  if (!id) return false;
  return NODE_SOURCE_REGISTRY.some(src => src.getInstances(state).some(inst => inst.id === id));
};

// Resolve a registered node id -> { id, name, kind, sourceId } or null.
const resolveRegisteredNode = (state, id) => {
  if (!id) return null;
  for (const src of NODE_SOURCE_REGISTRY) {
    const hit = src.getInstances(state).find(inst => inst.id === id);
    if (hit) return { ...hit, sourceId: src.id };
  }
  return null;
};

// All graph nodes contributed by registered sources, shaped like the
// entry-derived nodes GraphView builds (id, name, templateId, color).
const getRegisteredGraphNodes = (state) => {
  const nodes = [];
  NODE_SOURCE_REGISTRY.forEach(src => {
    src.getInstances(state).forEach(inst => {
      nodes.push({
        id: inst.id,
        name: inst.name,
        templateId: src.id,
        color: src.getColor(inst),
        synthetic: true,
      });
    });
  });
  return nodes;
};

// All intra-source edges contributed by registered sources.
const getRegisteredGraphEdges = (state) => {
  const edges = [];
  NODE_SOURCE_REGISTRY.forEach(src => {
    if (typeof src.getEdges === "function") edges.push(...src.getEdges(state));
  });
  return edges;
};

// Name -> id map for registered nodes (lowercased) for wiki-link resolution
// parity with entries. First writer wins on duplicate names, same as the
// entry nameToId.
const getRegisteredNameToId = (state) => {
  const map = {};
  getRegisteredGraphNodes(state).forEach(n => {
    const k = (n.name || "").trim().toLowerCase();
    if (k && !(k in map)) map[k] = n.id;
  });
  return map;
};