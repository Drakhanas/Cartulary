
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

// Stemma sentinel (v1.7 r027; docs/stemma-v2-spec.md, section 5). A stemma is
// a document in state.stemmas, radial (a rota) or, from r029, a board (a
// tabula). Registered, a stemma is a reference target in every template
// builder, a node in Concordance with an edge to each record its linked nodes
// point at, and what a linked node in another stemma can open.
const SYNTH_TPL_STEMMA = "__stemmas__";
const STEMMA_REF_LABEL = "Stemma";

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
    // Its pins are links the link index reads (v1.7 r041), and Concordance
    // draws them from there since r042, as it does a field's link to a map.
  },
  // v1.7 r027: stemmas, both layouts (docs/stemma-v2-spec.md, section 5).
  // Eligible on purpose, as maps are: a field can point at a stemma, a linked
  // node in another stemma can, and Fabula's Brainstorm field will (r028).
  // The kind is the document's layout. Its linked nodes, cards, and notes are
  // links the link index reads (v1.7 r041), and Concordance draws them from
  // there since r042.
  {
    id: SYNTH_TPL_STEMMA,
    name: STEMMA_REF_LABEL,
    color: "#c8a96e",
    icon: "\u274b", // ❋
    refEligible: true,
    getInstances: (state) =>
      (Array.isArray(state.stemmas) ? state.stemmas : [])
        .filter(s => s && s.id)
        .map(s => ({ id: s.id, name: (s.name || "Untitled Stemma"), kind: s.layout === "tabula" ? "tabula" : "rota" })),
    getColor: () => "#c8a96e",
  },
  // v1.7 r007: Fabula's record kinds (FABULA_KINDS), one source each. Not
  // eligible: no template's field can point at one, and the template builder
  // offers eligible sources only. group puts all eleven behind one toggle in
  // Concordance's filter, named by groupName. Their records are read beside
  // Fabula's view (fabulaRegistryInstances), and their links by the link
  // index, which Concordance draws from since v1.7's r042.
  ...FABULA_KINDS.map(k => ({
    id: k.id,
    name: k.name,
    label: k.label,
    color: k.color,
    icon: "\u2042", // ⁂
    refEligible: false,
    group: "fabula",
    groupName: "Fabula",
    getInstances: (state) => fabulaRegistryInstances(state, k),
    getColor: () => k.color,
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

// ─── The [[link]] resolver (v1.7 r043) ─────────────────────────────────────────
// docs/pipes-spec.md, section 5, with Drak's calls at the cut: one function
// finds what a [[name]] names, for the entry view, Tabula notes, the link
// index (and through it Referenced by, Concordance, and the delete counts),
// the world's HTML and Markdown exports, Fabula's export, and the [[
// autocomplete. An entry's primary name first, the first stored winning a
// tie; then its template's Name History; then a body's name and other
// names; then maps, stemmas, and Fabula's records by name, Fabula's in its
// order of kinds; then languages (Drak's call 2), which a [[link]] reaches
// without opening anything, as a reference chip to one has since r003.
// Glossopoeia's other records stay out. A name a record claimed first is no
// one else's, so a [[link]] by it, and the autocomplete, reach that record.

// The last resolver built, the slices it was built from, and the names
// outside entries it read, so that an edit renaming nothing (a map's
// drawing, a tabula's typing, a body's orbit) keeps it.
const WIKI_RESOLVER_MEMO = { keys: null, others: null, resolver: null };

// Every id and name the resolver reads outside entries, as one string.
const wikiOtherNames = (st) => {
  const out = [];
  const add = (list, other) => (Array.isArray(list) ? list : []).forEach(r => {
    if (r && r.id) out.push(r.id, typeof r.name === "string" ? r.name : "", other && typeof r.otherNames === "string" ? r.otherNames : "");
  });
  const fab = st.fabula || {};
  add(st.celestialBodies, true);
  add(st.cartographia);
  add(st.stemmas);
  FABULA_KINDS.forEach(k => add(fab[k.slice]));
  add(st.glossopoeia && st.glossopoeia.conlangs);
  return JSON.stringify(out);
};

// A resolver for the world in st, leaving out the records whose ids skip
// holds (a delete's count asks where the names will lead once they're gone).
// find(name) gives the record a trimmed, lowercased name reaches, as
// { id, kind, source, name, opens }, kind entry, body, map, stemma, fabula,
// or conlang, source its template or its registry source; resolve(name) its
// id; and names every name that reaches a record, in the order above, for
// the autocomplete.
const wikiResolverBuild = (st, skip) => {
  const byKey = new Map();
  const names = [];
  const claim = (raw, rec, via) => {
    if (typeof raw !== "string") return;
    const name = raw.trim();
    const key = name.toLowerCase();
    if (!key || byKey.has(key)) return;
    byKey.set(key, rec);
    names.push({ name, key, rec, via });
  };
  const kept = (list) => (Array.isArray(list) ? list : []).filter(r => r && typeof r.id === "string" && r.id && !(skip && skip.has(r.id)));
  const record = (r, kind, source) => ({ id: r.id, kind, source, name: typeof r.name === "string" ? r.name : "", opens: kind !== "conlang" });
  const ents = kept(st.entries).map(e => [e, record(e, "entry", e.templateId)]);
  ents.forEach(([e, rec]) => claim(e.name, rec, "name"));
  const tplById = new Map((Array.isArray(st.templates) ? st.templates : []).filter(t => t && t.id).map(t => [t.id, t]));
  ents.forEach(([e, rec]) => getEntryNameHistory(e, tplById.get(e.templateId)).forEach(n => claim(n, rec, "history")));
  kept(st.celestialBodies).forEach(b => {
    if (typeof b.name !== "string" || !b.name) return;
    const rec = record(b, "body", BODY_REF_SENTINEL);
    claim(b.name, rec, "name");
    if (typeof b.otherNames === "string") b.otherNames.split(",").forEach(n => claim(n, rec, "other"));
  });
  kept(st.cartographia).forEach(m => claim(m.name, record(m, "map", SYNTH_TPL_MAP), "name"));
  kept(st.stemmas).forEach(s => claim(s.name, record(s, "stemma", SYNTH_TPL_STEMMA), "name"));
  const fab = st.fabula || {};
  FABULA_KINDS.forEach(k => kept(fab[k.slice]).forEach(r => claim(r.name, record(r, "fabula", k.id), "name")));
  kept(st.glossopoeia && st.glossopoeia.conlangs).forEach(c => claim(c.name, record(c, "conlang", SYNTH_TPL_CONLANG), "name"));
  const find = (key) => byKey.get(key) || null;
  const resolve = (key) => { const rec = byKey.get(key); return rec ? rec.id : null; };
  return { find, resolve, names };
};

// The world's resolver, built once and kept while what it reads is the same
// (WIKI_RESOLVER_MEMO).
const wikiResolverOf = (state) => {
  const st = state || {};
  const fab = st.fabula || {};
  const keys = [st.entries, st.templates, st.celestialBodies, st.cartographia, st.stemmas, ...FABULA_KINDS.map(k => fab[k.slice]), st.glossopoeia && st.glossopoeia.conlangs];
  const m = WIKI_RESOLVER_MEMO;
  if (m.resolver && m.keys.every((k, i) => k === keys[i])) return m.resolver;
  const others = wikiOtherNames(st);
  if (m.resolver && m.keys[0] === keys[0] && m.keys[1] === keys[1] && m.others === others) {
    m.keys = keys;
    return m.resolver;
  }
  m.keys = keys;
  m.others = others;
  m.resolver = wikiResolverBuild(st, null);
  return m.resolver;
};

// The resolver App draws with, for whatever below it reads a [[link]].
const WikiResolverContext = React.createContext(null);

// A component's resolver: App's, or, drawn where nothing provides one, one
// built from the entries, templates, and bodies it was given.
const useWikiResolver = (entries, templates, bodies) => {
  const given = React.useContext(WikiResolverContext);
  const own = useMemo(() => (given ? null : wikiResolverBuild({ entries, templates, celestialBodies: bodies }, null)), [given, entries, templates, bodies]);
  return given || own;
};

// What the [[ autocomplete offers for a lowercased query: up to max names
// that hold it, each once, for the record it reaches, in the resolver's
// order, shaped as the popups read them.
const wikiLinkCandidates = (wiki, query, max) => {
  const q = typeof query === "string" ? query : "";
  const names = wiki ? wiki.names : [];
  const out = [];
  for (let i = 0; i < names.length && out.length < max; i++) {
    const n = names[i];
    if (!n.key.includes(q)) continue;
    out.push({ entry: { id: n.rec.id, name: n.rec.name }, displayName: n.name, insertName: n.name, viaHistory: n.via !== "name", isBody: n.rec.kind === "body", rec: n.rec });
  }
  return out;
};

// What a record a [[link]] reaches is called beside its name: its source's
// name ("Astronomical Body", "Map", "Scene (Fabula)", "ConLang"), as a
// reference chip's title has it, or nothing for an entry.
const wikiRecordKind = (rec) => {
  const src = rec && rec.kind !== "entry" ? getRegisteredSourceById(rec.source) : null;
  return src ? src.name : "";
};
// ─── Link index (v1.7 r041) ────────────────────────────────────────────────────
// docs/pipes-spec.md, section 4, with Drak's calls at the cut: every link in
// the world, each with the record it's in (its source), the record it points
// at (its target), the field it runs through, and whether that field is
// secret. Stored links: entries' reference fields at any depth (group
// subfields, grid cells, parent and spouse declarations), Fabula records'
// through each kind's schema and a corpus's reading order, bodies' and
// ConLangs' reference fields, map pins, a rota's linked nodes, and a tabula's
// linked cards. [[links]]: in the Short Text and Long Text of entries and
// Fabula records at any depth, a map's three fields, a body's six narrative
// fields, a tabula's notes, and the world description, read since r043 by
// the one resolver (wikiResolverOf), and by the entry view's rules before
// it. A record's links are read once and kept until the
// record, or the schema it's read through, changes (Drak's call 3), and the
// index is put together again from what's kept when anything changes, when a
// page first asks for it (linksTo). A record's link to itself doesn't count,
// and a scene's belonging to its story isn't a link. Since r042 a link also
// carries a parent or spouse declaration's relation, its field's own label,
// and its own words, for Concordance, which draws from the index too, and a
// delete counts and clears through it (linkDeleteCounts, clearLinksTo).

// The world description as a source: its row in Referenced by opens the
// Project page, where the description is drawn (Drak's call 2).
const LINK_SOURCE_WORLD = "__world_description__";

// What the index keeps between builds: the last build and the slices it was
// built from, each record's links (by the record, with what they were read
// through), and the fields read for Fabula's kinds and ConLangs while the
// world keeps no schema of its own. The names are the resolver's own
// (WIKI_RESOLVER_MEMO) since r043.
const LINK_INDEX_MEMO = { keys: null, index: null, records: new WeakMap(), schemas: new Map(), mapFields: null };

// A link as the index keeps it, made once when its record is read (r042): the
// record it's in (src); what it points at (to), a stored link's id or a
// [[link]]'s name, trimmed and lowercased, for the name resolver; its kind,
// "ref" or "wiki"; the field it runs through, by the top-level field's id,
// which a page's own list is matched by (field), and by label, a group's
// subfield under its group (label) and alone (leaf); whether that field is
// secret; a parent or spouse declaration's relation (rel); and the link's own
// words (text): a declaration's label, a [[link|shown]]'s shown part, or a
// pin's label. The index hands these out as they are.
const linkPush = (x, to, kind, field, label, leaf, secret, rel, text) => {
  x.links.push({ src: x.src, to, kind, field, label, leaf, secret, rel: rel || null, text: text || null });
};

// The [[links]] in a text, each by its target's name, trimmed and lowercased,
// [[target|shown]] by its target, as the entry view reads it.
const linkWikiNames = (text, fid, label, leaf, secret, x) => {
  if (typeof text !== "string" || text.indexOf("[[") < 0) return;
  const re = /\[\[([^\]\n]+)\]\]/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const inner = m[1].trim();
    const pipe = inner.indexOf("|");
    const name = (pipe >= 0 ? inner.substring(0, pipe) : inner).trim().toLowerCase();
    if (name) linkPush(x, name, "wiki", fid, label, leaf, secret, null, pipe >= 0 ? inner.substring(pipe + 1).trim() : null);
  }
};

// A record's links through a template's fields: a reference's ids and the
// [[links]] in Short Text and Long Text, down through groups (a subfield
// labeled under its group, and secret when either is) and a grid's reference
// cells. A parent or spouse declaration keeps its relation and its label.
const linkFieldWalk = (fields, values, x, up) => {
  if (!values || typeof values !== "object") return;
  (Array.isArray(fields) ? fields : []).forEach(f => {
    if (!f || !f.id) return;
    const v = values[f.id];
    if (v == null || v === "") return;
    const fid = up ? up.fid : f.id;
    const leaf = f.label || "";
    const label = up ? `${up.label} › ${leaf}` : leaf;
    const secret = (up ? up.secret : false) || !!f.secret;
    if (f.type === "entry-ref") {
      const rel = f.relationKind === "parent" || f.relationKind === "spouse" ? f.relationKind : null;
      (Array.isArray(v) ? v : [v]).forEach(it => {
        const id = typeof it === "string" ? it : (it && typeof it === "object" ? it.id : null);
        if (typeof id !== "string" || !id) return;
        const said = rel && it && typeof it === "object" && typeof it.label === "string" ? it.label.trim() : null;
        linkPush(x, id, "ref", fid, label, leaf, secret, rel, said);
      });
    } else if (f.type === "text" || f.type === "textarea") {
      linkWikiNames(v, fid, label, leaf, secret, x);
    } else if (f.type === "group" && Array.isArray(v)) {
      v.forEach(inst => linkFieldWalk(f.subfields, inst, x, { fid, label, secret }));
    } else if (f.type === "grid") {
      forEachGridRefCell(coerceGridValue(v), (rid, cid, cell) => {
        if (typeof cell.value === "string" && cell.value) linkPush(x, cell.value, "ref", fid, label, leaf, secret, null, null);
      });
    }
  });
};

// One record's links, read by read(x) into x.src and x.links, or kept from
// an earlier build when the record and what it was read through (deps) are
// the same objects.
const linkRecordLinks = (rec, deps, read) => {
  const hit = LINK_INDEX_MEMO.records.get(rec);
  if (hit && hit.deps === deps) return hit;
  const x = { deps, src: null, links: [] };
  read(x);
  LINK_INDEX_MEMO.records.set(rec, x);
  return x;
};

// The fields a Fabula kind's records are read through, the kind's stored
// schema or the seed's while the world has none, and for "conlang" the
// ConLang schema's reference fields; built ones are kept while the
// templates they're built from are the same.
const linkKindFields = (state, kind) => {
  const stored = kind !== "conlang" && state.fabula && state.fabula.schemas ? state.fabula.schemas[kind] : null;
  if (stored && Array.isArray(stored.fields)) return stored.fields;
  const kept = LINK_INDEX_MEMO.schemas.get(kind);
  if (kept && kept.templates === state.templates) return kept.fields;
  const fields = kind === "conlang"
    ? glossopoeiaConlangSchema(state).fields.filter(f => f && f.type === "entry-ref")
    : fabulaKindFields(state, kind);
  LINK_INDEX_MEMO.schemas.set(kind, { templates: state.templates, fields });
  return fields;
};

// The index, { byTarget, links, targets }: each target's links as linkPush
// makes them, src the source as { id, kind, group, name, storyId }, its kind
// entry, fabula, map, stemma, body, conlang, or world, and its group its
// template, its Fabula kind, or its kind again; and since r043 every link in
// the order its record was read (links), beside its target (targets), which
// Concordance draws in. Put together again only when a slice it reads has
// changed.
const linkIndexOf = (state) => {
  const st = state || {};
  const fab = st.fabula || {};
  const glo = st.glossopoeia || {};
  const desc = st.world && typeof st.world.description === "string" ? st.world.description : "";
  const keys = [st.entries, st.templates, st.fabula, st.cartographia, st.stemmas, st.celestialBodies, glo.conlangs, desc];
  const memo = LINK_INDEX_MEMO;
  if (memo.index && memo.keys.every((k, i) => k === keys[i])) return memo.index;
  const wiki = wikiResolverOf(st);
  const byTarget = new Map();
  const links = [], targets = [];
  // A kept link goes into its target's list as it is; a [[link]]'s target is
  // found by name at every build, since names change without the link.
  const add = (x) => {
    const ls = x.links;
    for (let i = 0; i < ls.length; i++) {
      const l = ls[i];
      const target = l.kind === "wiki" ? wiki.resolve(l.to) : l.to;
      if (typeof target !== "string" || !target || target === l.src.id) continue;
      let list = byTarget.get(target);
      if (!list) { list = []; byTarget.set(target, list); }
      list.push(l);
      links.push(l);
      targets.push(target);
    }
  };
  // Entries, through their templates.
  const tplById = new Map((Array.isArray(st.templates) ? st.templates : []).filter(t => t && t.id).map(t => [t.id, t]));
  (Array.isArray(st.entries) ? st.entries : []).forEach(e => {
    if (!e || !e.id) return;
    const tpl = tplById.get(e.templateId) || null;
    add(linkRecordLinks(e, tpl, (x) => {
      x.src = { id: e.id, kind: "entry", group: e.templateId, name: e.name || "", storyId: null };
      linkFieldWalk(tpl ? tpl.fields : [], e.fields, x, null);
    }));
  });
  // Fabula's records, through their kinds' schemas, and a corpus's stories.
  FABULA_KINDS.forEach(k => {
    const recs = Array.isArray(fab[k.slice]) ? fab[k.slice] : [];
    if (recs.length === 0) return;
    const fields = linkKindFields(st, k.kind);
    recs.forEach(r => {
      if (!r || !r.id) return;
      add(linkRecordLinks(r, fields, (x) => {
        x.src = { id: r.id, kind: "fabula", group: k.kind, name: r.name || "", storyId: k.kind === "corpus" || k.kind === "story" ? null : (r.storyId || null) };
        linkFieldWalk(fields, r.fields, x, null);
        if (k.kind === "corpus" && Array.isArray(r.storyIds)) {
          r.storyIds.forEach(id => { if (typeof id === "string" && id) linkPush(x, id, "ref", "storyIds", "Reading order", "Reading order", false, null, null); });
        }
      }));
    });
  });
  // Maps: their pins, then their three fields, so in Concordance a pin's
  // label leads its edge's, as when the registry drew the pins alone (r042).
  if (!memo.mapFields) memo.mapFields = cartographiaMapSchema().fields;
  (Array.isArray(st.cartographia) ? st.cartographia : []).forEach(m => {
    if (!m || !m.id) return;
    add(linkRecordLinks(m, memo.mapFields, (x) => {
      x.src = { id: m.id, kind: "map", group: "map", name: m.name || "", storyId: null };
      const pins = m.mapData && Array.isArray(m.mapData.pins) ? m.mapData.pins : [];
      pins.forEach(pin => {
        if (!pin || typeof pin.entryId !== "string" || !pin.entryId) return;
        const named = typeof pin.label === "string" ? pin.label.trim() : "";
        linkPush(x, pin.entryId, "ref", "pins", named ? `Pin: ${named}` : "Pin", "Pin", false, null, named);
      });
      linkFieldWalk(memo.mapFields, m.fields, x, null);
    }));
  });
  // Stemmas: a rota's linked nodes, a tabula's linked cards and notes.
  (Array.isArray(st.stemmas) ? st.stemmas : []).forEach(s => {
    if (!s || !s.id) return;
    add(linkRecordLinks(s, null, (x) => {
      x.src = { id: s.id, kind: "stemma", group: "stemma", name: s.name || "", storyId: null };
      if (s.layout === "tabula") {
        tabulaWalk(s.root, (it) => {
          if (it.type === "linked" && typeof it.entryId === "string" && it.entryId) linkPush(x, it.entryId, "ref", "card", "card", "card", false, null, null);
          else if (it.type === "note") linkWikiNames(it.body, "note", "note", "note", false, x);
        });
      } else {
        const walk = (node) => {
          if (!node) return;
          if (node.type === "linked" && typeof node.entryId === "string" && node.entryId) linkPush(x, node.entryId, "ref", "node", "linked node", "linked node", false, null, null);
          (node.children || []).forEach(walk);
        };
        walk(s.root);
      }
    }));
  });
  // Bodies: their four reference lists and six narrative fields, labeled as
  // their page labels them.
  (Array.isArray(st.celestialBodies) ? st.celestialBodies : []).forEach(b => {
    if (!b || !b.id) return;
    add(linkRecordLinks(b, null, (x) => {
      x.src = { id: b.id, kind: "body", group: "body", name: b.name || "", storyId: null };
      [["visibleFrom", "Visible From"], ["notableLocations", "Notable Locations"], ["inhabitedBy", "Inhabited By"], ["sacredTo", "Sacred to"]].forEach(([k, label]) => {
        (Array.isArray(b[k]) ? b[k] : []).forEach(it => {
          const id = typeof it === "string" ? it : (it && typeof it === "object" ? it.id : null);
          if (typeof id === "string" && id) linkPush(x, id, "ref", k, label, label, false, null, null);
        });
      });
      [["physicalProperties", "Physical Properties"], ["climateConditions", "Climate / Conditions"], ["mythologicalSignificance", "Mythological Significance"], ["description", "Description"], ["history", "History"], ["notes", "Notes"]]
        .forEach(([k, label]) => linkWikiNames(b[k], k, label, label, false, x));
    }));
  });
  // ConLangs, through the ConLang schema's reference fields.
  const conlangs = Array.isArray(glo.conlangs) ? glo.conlangs : [];
  if (conlangs.length > 0) {
    const fields = linkKindFields(st, "conlang");
    conlangs.forEach(c => {
      if (!c || !c.id) return;
      add(linkRecordLinks(c, fields, (x) => {
        x.src = { id: c.id, kind: "conlang", group: "conlang", name: c.name || "", storyId: null };
        linkFieldWalk(fields, c.fields, x, null);
      }));
    });
  }
  // The world description.
  if (desc) {
    const x = { src: { id: LINK_SOURCE_WORLD, kind: "world", group: "world", name: "World description", storyId: null }, links: [] };
    linkWikiNames(desc, "description", "", "", false, x);
    add(x);
  }
  memo.keys = keys;
  memo.index = { byTarget, links, targets };
  return memo.index;
};

// What links to one record: its links in the index, or none.
const linksTo = (state, id) => (typeof id === "string" && id ? (linkIndexOf(state).byTarget.get(id) || []) : []);

// What a delete of the records in ids reaches, from the index (r042, Drak's
// call 1 at the cut), counting only links from records outside going (ids,
// unless a delete counts part of what goes, as the holding modal does): the
// records whose stored links to them it clears, by kind (refs: entry,
// fabula:<kind>, body, or conlang, each a set of source ids); the map pins it
// unlinks, those with a label (pins) and those without (pinsBare); the stemma
// nodes and cards it leaves orphaned and the stemmas they're in; and the
// places whose [[links]] to them stay as typed, broken (wiki) or, where
// another record answers to the name once what goes is gone, leading there
// (wikiMoved). A link through a secret field counts, since the delete clears
// it either way.
const linkDeleteCounts = (state, ids, going) => {
  const out = { refs: new Map(), pins: 0, pinsBare: 0, nodes: 0, cards: 0, stemmas: new Set(), wiki: new Set(), wikiMoved: new Set() };
  const list = Array.isArray(ids) ? ids : [...(ids || [])];
  const outside = going instanceof Set ? going : new Set(list);
  // The names as they'll resolve after the delete, built once, when a
  // [[link]] asks, without what goes, and apart from the world's resolver.
  let after = null;
  const resolvesAfter = (name) => {
    if (!after) after = wikiResolverBuild(state || {}, outside);
    return after.resolve(name);
  };
  list.forEach(id => linksTo(state, id).forEach(l => {
    if (outside.has(l.src.id)) return;
    if (l.kind === "wiki") { (resolvesAfter(l.to) ? out.wikiMoved : out.wiki).add(l.src.id); return; }
    if (l.src.kind === "stemma") { out.stemmas.add(l.src.id); if (l.field === "card") out.cards += 1; else out.nodes += 1; return; }
    if (l.src.kind === "map") { if (l.text) out.pins += 1; else out.pinsBare += 1; return; }
    const key = l.src.kind === "fabula" ? `fabula:${l.src.group}` : l.src.kind;
    if (!out.refs.has(key)) out.refs.set(key, new Set());
    out.refs.get(key).add(l.src.id);
  }));
  return out;
};

// The world without the stored links into ids, as every delete leaves it
// (r042, Drak's call 1 at the cut): entries', Fabula records', bodies', and
// ConLangs' references cleared, a cast record whose character goes kept and
// marked (scrubFabulaRefs), and a corpus's reading order without them; a map
// pin unlinked, keeping its label or taking the record's name if it had
// none; a stemma's nodes and cards left orphaned, as Stemma v2 has them; and
// [[links]] left as typed. A slice or a record it doesn't change keeps its
// identity, so what's kept from the last build of the index stays kept. The
// records themselves are the caller's to remove, after this, so their names
// are still there to read.
const clearLinksTo = (state, ids) => {
  const going = ids instanceof Set ? ids : new Set(ids || []);
  if (!state || going.size === 0) return state;
  const keep = (was, now) => (now.length === was.length && now.every((x, i) => x === was[i]) ? was : now);
  const names = new Map();
  (Array.isArray(state.entries) ? state.entries : []).forEach(e => { if (e && going.has(e.id)) names.set(e.id, e.name || ""); });
  if (names.size < going.size) getRegisteredGraphNodes(state).forEach(n => { if (going.has(n.id) && !names.has(n.id)) names.set(n.id, n.name || ""); });
  const now = isoNow();
  const ents = Array.isArray(state.entries) ? state.entries : [];
  const next = { ...state, entries: keep(ents, scrubEntryRefs(ents, Array.isArray(state.templates) ? state.templates : [], going)) };
  let fab = scrubFabulaRefs(state, going, names);
  if (fab && Array.isArray(fab.corpora) && fab.corpora.some(c => c && Array.isArray(c.storyIds) && c.storyIds.some(id => going.has(id)))) {
    fab = { ...fab, corpora: fab.corpora.map(c => (c && Array.isArray(c.storyIds) && c.storyIds.some(id => going.has(id)) ? { ...c, storyIds: c.storyIds.filter(id => !going.has(id)), updatedAt: now } : c)) };
  }
  next.fabula = fab;
  const refId = (it) => (typeof it === "string" ? it : (it && typeof it === "object" ? it.id : null));
  if (Array.isArray(state.celestialBodies)) {
    next.celestialBodies = keep(state.celestialBodies, state.celestialBodies.map(b => {
      if (!b) return b;
      let out = b;
      ["visibleFrom", "notableLocations", "inhabitedBy", "sacredTo"].forEach(k => {
        if (Array.isArray(b[k]) && b[k].some(it => going.has(refId(it)))) out = { ...out, [k]: b[k].filter(it => !going.has(refId(it))) };
      });
      return out;
    }));
  }
  const glo = state.glossopoeia;
  if (glo && Array.isArray(glo.conlangs) && glo.conlangs.length > 0) {
    const tpl = { id: SYNTH_TPL_CONLANG, fields: linkKindFields(state, "conlang") };
    const tagged = glo.conlangs.map(c => (c && typeof c === "object" ? { ...c, templateId: tpl.id } : { templateId: null }));
    const scrubbed = scrubEntryRefs(tagged, [tpl], going);
    if (scrubbed.some((c, i) => c !== tagged[i])) {
      next.glossopoeia = { ...glo, conlangs: scrubbed.map((c, i) => {
        if (c === tagged[i]) return glo.conlangs[i];
        const { templateId, ...rest } = c;
        return rest;
      }) };
    }
  }
  if (Array.isArray(state.cartographia)) {
    next.cartographia = keep(state.cartographia, state.cartographia.map(m => {
      const pins = m && m.mapData && Array.isArray(m.mapData.pins) ? m.mapData.pins : null;
      if (!pins || !pins.some(p => p && going.has(p.entryId))) return m;
      return { ...m, mapData: { ...m.mapData, pins: pins.map(p => (p && going.has(p.entryId)
        ? { ...p, entryId: null, label: (typeof p.label === "string" && p.label.trim()) ? p.label : (names.get(p.entryId) || "") }
        : p)) }, updatedAt: now };
    }));
  }
  return next;
};