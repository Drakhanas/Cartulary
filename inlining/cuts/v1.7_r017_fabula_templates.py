"""v1.7 r017: the template builder learns Fabula's kinds and the core lock.

Drak's calls (2026-10-26), one per message, recorded in docs/fabula-spec.md
sections 3, 4, and 5.0 before this cut (61df82c). A Templates section at the
end of Fabula's index lists the eleven kinds, Corpus through Research Note,
each with Edit Template, marked when the world's fields differ from the seed.
The seed owns every part of a core field a feature reads (its type, its
targets, one or many, Structure's names, a core group's rows), which the
builder locks, and each load brings an edited kind's core fields up to the
current seed; a core field's label, help line, Secret, and options other than
Structure's are the user's. Reset to Default works as a built-in template's.
A field of the user's own on any kind but Corpus can point at its story's own
records, one Fabula kind to a field. Forced by the rule that a field is core
when a feature reads it: a cast record's Importance, a plot point's and a
promise's Threads, a scene's Motifs, a note's Used In and Open Questions, and
the Story's Theme Statement become core, and so, by the census corrected
before the cut (ededabe), do the fields a row's details show: a corpus's Kind
and Status, a cast record's Role, an arc's Arc Type and Status, a
relationship's Kind, a promise's Kind and Status, and a note's Applies To;
Importance's options are locked, since the People tab orders by their names.
The seed goes to 4, with the plot point's name help. Claude's defaults for
the rest are in section 4.

- 12_trunk: App keeps the kind open in the builder (schemaDraft) with its
  draft guards, opens it from the index, saves it, cancels it, and resets it
  through a confirmation; the header shows Reset to Default, Cancel, and Save
  Template over Fabula, lit in the sidebar; Cancel, Save, and a reset land on
  the index at the Templates section.
- 15_template-builder: the builder's Fabula mode: the name's help line in
  place of a template's name, icon, color, and type; a help line on every
  field; a Panel picker on the Story; no family role and no preview; a core
  field's Core tag and its locks; the story's kinds among a reference's
  targets; and the page's top when it opens.
- 28_fabula: seed 4; each load refreshes an edited schema's core fields;
  Concordance draws a link of the user's own, and none for a seeded link the
  user deleted; the index's Templates section; and the helpers and
  components at the file's tail under a tenth header.

Declared scope: 12_trunk, 15_template-builder, 28_fabula.
Declarations added: FabulaBuilderHead, FabulaLockedRows, fabulaSeedIds,
fabulaRefreshCore, fabulaSchemaOf, fabulaSchemaDraft, fabulaSchemaSave,
fabulaResetAnalysis, fabulaResetSchema, fabulaStoryKinds, fabulaRefKindOf,
fabulaTargetPatch, fabulaCoreTitle, fabulaShowWhenText, FabulaKindTemplates,
FabulaResetModal.

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given). Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r017_fabula_templates.py
"""
from pathlib import Path

ROOT = next(p for p in Path(__file__).resolve().parents if (p / 'cartulary-src').is_dir())
MODULES = ROOT / "cartulary-src" / "modules"


def edit(path, pairs):
    text = path.read_text(encoding="utf-8")
    for pair in pairs:
        old, new = pair[0], pair[1]
        count = pair[2] if len(pair) > 2 else 1
        n = text.count(old)
        assert n == count, f"{path.name}: anchor occurs {n} times, not {count}:\n{old[:200]}"
        text = text.replace(old, new)
    path.write_text(text, encoding="utf-8")


def header(title):
    line = f"// ─── {title} "
    return line + "─" * (82 - len(line))


# ------------------------------------------------------ 28: seed 4 and loads
edit(MODULES / "28_fabula.jsx", [
    (r"""// splits into a folder at its section headers (Drak, 2026-10-25). The seed's
// number rises when the seed changes, so a world's unedited schemas follow
// it: 2 at v1.7's r009, when an arc's Cast took more than one, and 3 since
// r011, when a beat took What Happens and the fields the outline reads, a
// chapter's and a scene's Status and a scene's Beats, became core (Drak, at
// r009's pass, 2026-10-25, and r011's, 2026-10-26).
const FABULA_SCHEMA_SEED = 3;""",
     r"""// splits into a folder at its section headers (Drak, 2026-10-25). The seed's
// number rises when the seed changes, so a world's unedited schemas follow
// it: 2 at v1.7's r009, when an arc's Cast took more than one, 3 at r011,
// when a beat took What Happens and the fields the outline reads, a
// chapter's and a scene's Status and a scene's Beats, became core (Drak, at
// r009's pass, 2026-10-25, and r011's, 2026-10-26), and 4 since r017, when
// the core list caught up with what r007 through r015 read, a row's details
// included, each core field took the line the builder shows for what reads
// it, and the plot point's name help stopped saying a structure makes one
// (Drak, at r017's plan, 2026-10-26).
const FABULA_SCHEMA_SEED = 4;"""),
    (r"""// the record's own story only. core marks a field a feature reads (spec,
// section 5.0), which the builder will let a user relabel but not delete or
// retype; panel puts a Story field in one of its four panels. A help line
// shows on its field's label, as Glossopoeia's do. Slot's options come from
// the story's structure, so its seed holds Other alone.""",
     r"""// the record's own story only. core marks a field a feature reads (spec,
// section 5.0), with reads, the line the builder shows for what reads it, and
// optionsLocked where a feature reads its options' names. Since v1.7's r017
// the builder lets a user relabel a core field and change its help line,
// Secret, and other options, and the seed keeps the rest (fabulaRefreshCore).
// panel puts a Story field in one of its four panels. A help line shows on
// its field's label, as Glossopoeia's do. Slot's options come from the
// story's structure, so its seed holds Other alone."""),
    (r"""  const CORE = { core: true };""",
     r"""  const core = (reads, more = {}) => ({ core: true, reads, ...more });"""),
    (r"""  const multiOther = (id, label, help, options) => f(id, label, "multiselect", help, { options, otherTextField: true });""",
     r"""  const multiOther = (id, label, help, options, more = {}) => f(id, label, "multiselect", help, { options, otherTextField: true, ...more });"""),
    # The corpus: the index shows its Kind and Status.
    (r"""      pickOther("kind", "Kind", "What holds these stories together.", ["Series", "Shared World", "Anthology", "Collection"]),""",
     r"""      pickOther("kind", "Kind", "What holds these stories together.", ["Series", "Shared World", "Anthology", "Collection"], core("Fabula's index shows it.")),"""),
    (r"""      pick("status", "Status", "Where the corpus stands as a whole.", ["Planning", "Active", "Complete", "Shelved"]),""",
     r"""      pick("status", "Status", "Where the corpus stands as a whole.", ["Planning", "Active", "Complete", "Shelved"], core("Fabula's index shows it.")),"""),
    # The Story
    (r"""["Idea", "Planning", "Drafting", "Revising", "Done", "Shelved"], CORE),""",
     r"""["Idea", "Planning", "Drafting", "Revising", "Done", "Shelved"], core("Fabula's index shows it.")),"""),
    (r"""["Three-Act", "Freytag", "Hero's Journey", "Seven-Point", "Kishotenketsu", "Custom", "None"], CORE),""",
     r"""["Three-Act", "Freytag", "Hero's Journey", "Seven-Point", "Kishotenketsu", "Custom", "None"], core("Its turning points are the Plot tab's headings.", { optionsLocked: true })),"""),
    (r"""      ], { core: true, showWhen: { fieldId: "structure", values: ["Custom"] } }),""",
     r"""      ], core("A Custom structure's turning points, the Plot tab's headings.", { showWhen: { fieldId: "structure", values: ["Custom"] } })),"""),
    (r"""one thread can run through several stories.", ["Plot Thread"], { multi: true, core: true }),""",
     r"""one thread can run through several stories.", ["Plot Thread"], core("The Plot tab lists them.", MANY)),"""),
    (r"""        area("themeStatement", "Theme Statement", "What the story argues."),""",
     r"""        area("themeStatement", "Theme Statement", "What the story argues.", core("The Meaning tab opens with it.")),"""),
    (r"""the Meaning tab lists them.", ["Theme / Motif"], { multi: true, core: true }),""",
     r"""the Meaning tab lists them.", ["Theme / Motif"], core("The Meaning tab lists them.", MANY)),"""),
    # Cast, arcs, relationships
    (r"""a character, or a god or other being.", BEINGS, { core: true, required: true }),""",
     r"""a character, or a god or other being.", BEINGS, core("A cast record is this entry, in this story.", { required: true })),"""),
    (r"""      pick("importance", "Importance", "How large a part they play in this story.", ["Main", "Secondary", "Minor"]),""",
     r"""      pick("importance", "Importance", "How large a part they play in this story.", ["Main", "Secondary", "Minor"], core("The People tab orders the cast by it.", { optionsLocked: true })),"""),
    (r"""      multiOther("role", "Role", "The parts they play in this story; there can be more than one.", ["Protagonist", "Antagonist", "Deuteragonist", "Tritagonist", "Confidant", "Mentor", "Love Interest", "Foil", "Antihero", "Supporting"]),""",
     r"""      multiOther("role", "Role", "The parts they play in this story; there can be more than one.", ["Protagonist", "Antagonist", "Deuteragonist", "Tritagonist", "Confidant", "Mentor", "Love Interest", "Foil", "Antihero", "Supporting"], core("The People tab shows it.")),"""),
    (r"""      pickOther("arcType", "Arc Type", "The shape of the change.", ["Positive Change", "Flat", "Negative Change", "Disillusionment", "Corruption", "Fall"]),""",
     r"""      pickOther("arcType", "Arc Type", "The shape of the change.", ["Positive Change", "Flat", "Negative Change", "Disillusionment", "Corruption", "Fall"], core("The People tab shows it.")),"""),
    (r"""      pick("status", "Status", "Where the arc stands in your plan.", ["Idea", "Planned", "Underway", "Resolved", "Abandoned"]),""",
     r"""      pick("status", "Status", "Where the arc stands in your plan.", ["Idea", "Planned", "Underway", "Resolved", "Abandoned"], core("The People tab shows it.")),"""),
    (r"""      multiOther("kind", "Kind", "What kind of bond it is; there can be more than one.", ["Alliance", "Rivalry", "Romance", "Friendship", "Mentorship", "Family", "Enmity"]),""",
     r"""      multiOther("kind", "Kind", "What kind of bond it is; there can be more than one.", ["Alliance", "Rivalry", "Romance", "Friendship", "Mentorship", "Family", "Enmity"], core("The People tab shows it.")),"""),
    (r"""      kref("cast", "Cast", "Whose arc this is; there can be more than one.", "cast", { ...CORE, ...MANY }),""",
     r"""      kref("cast", "Cast", "Whose arc this is; there can be more than one.", "cast", core("The People tab names whose arc it is.", MANY)),"""),
    (r"""        text("turnShift", "Shift", "What shifts there."),
      ], CORE),""",
     r"""        text("turnShift", "Shift", "What shifts there."),
      ], core("The timeline will mark them.")),"""),
    (r"""      kref("castA", "Cast A", "One side of the relationship.", "cast", CORE),""",
     r"""      kref("castA", "Cast A", "One side of the relationship.", "cast", core("The People tab names the pair from it.")),"""),
    (r"""      kref("castB", "Cast B", "The other side.", "cast", CORE),""",
     r"""      kref("castB", "Cast B", "The other side.", "cast", core("The People tab names the pair from it.")),"""),
    # Plot points and promises
    (r"""    plotPoint: schema("plotPoint", "Name", "The slot's name when a structure made this plot point, or your own.", [""",
     r"""    plotPoint: schema("plotPoint", "Name", "Its name; one added under a slot without a title takes the slot's name.", ["""),
    (r"""this plot point fills.", [], { core: true, optionsFrom: "structure" }),""",
     r"""this plot point fills.", [], core("The Plot tab files the plot point under it.", { optionsFrom: "structure", optionsLocked: true })),"""),
    (r"""      kref("deliveredIn", "Delivered In", "The scene where it happens.", "scene", CORE),""",
     r"""      kref("deliveredIn", "Delivered In", "The scene where it happens.", "scene", core("The Plot tab shows its scene.")),"""),
    (r"""      ref("threads", "Threads", "The threads it moves.", ["Plot Thread"], MANY),""",
     r"""      ref("threads", "Threads", "The threads it moves.", ["Plot Thread"], core("The Plot tab's marks and a thread's page read it.", MANY)),"""),
    (r"""      pickOther("kind", "Kind", "What kind of promise it is.", ["Foreshadowing", "Chekhov's Gun", "Open Question", "Red Herring", "Prophecy", "Callback", "Running Gag"]),""",
     r"""      pickOther("kind", "Kind", "What kind of promise it is.", ["Foreshadowing", "Chekhov's Gun", "Open Question", "Red Herring", "Prophecy", "Callback", "Running Gag"], core("The Plot tab shows it.")),"""),
    (r"""      pick("status", "Status", "Where the promise stands.", ["Idea", "Planned", "Planted", "Paid Off", "Subverted", "Dropped"]),""",
     r"""      pick("status", "Status", "Where the promise stands.", ["Idea", "Planned", "Planted", "Paid Off", "Subverted", "Dropped"], core("The Plot tab shows it.")),"""),
    (r"""      kref("setupIn", "Setup In", "The scenes that make the promise.", "scene", { multi: true, core: true }),""",
     r"""      kref("setupIn", "Setup In", "The scenes that make the promise.", "scene", core("The unpaid flag and the order of promises read it.", MANY)),"""),
    (r"""      kref("payoffIn", "Payoff In", "The scenes that keep it.", "scene", { multi: true, core: true }),""",
     r"""      kref("payoffIn", "Payoff In", "The scenes that keep it.", "scene", core("The unpaid flag reads it.", MANY)),"""),
    (r"""      ref("threads", "Threads", "The threads it belongs to.", ["Plot Thread"], MANY),""",
     r"""      ref("threads", "Threads", "The threads it belongs to.", ["Plot Thread"], core("The Plot tab's marks and a thread's page read it.", MANY)),"""),
    # Chapters and scenes
    (r"""a scene with no POV of its own takes this one.", "cast", CORE),""",
     r"""a scene with no POV of its own takes this one.", "cast", core("A scene with no POV of its own takes it.")),"""),
    (r"""      pick("status", "Status", "Where the chapter stands.", OUTLINE_STATUS, CORE),""",
     r"""      pick("status", "Status", "Where the chapter stands.", OUTLINE_STATUS, core("The outline shows it.")),"""),
    (r"""left empty, it takes the chapter's.", "cast", CORE),""",
     r"""left empty, it takes the chapter's.", "cast", core("The outline shows it, and the timeline will lane scenes by it.")),"""),
    (r"""      pick("status", "Status", "Where the scene stands.", OUTLINE_STATUS, CORE),""",
     r"""      pick("status", "Status", "Where the scene stands.", OUTLINE_STATUS, core("The outline shows it.")),"""),
    (r"""      f("when", "When", "calendar-date-range", "When it happens in story time, in your calendar.", CORE),""",
     r"""      f("when", "When", "calendar-date-range", "When it happens in story time, in your calendar.", core("The timeline will place the scene by it.")),"""),
    (r"""      ref("threads", "Threads", "The threads it moves.", ["Plot Thread"], { multi: true, core: true }),""",
     r"""      ref("threads", "Threads", "The threads it moves.", ["Plot Thread"], core("The Plot tab's marks and a thread's page read it.", MANY)),"""),
    (r"""      ref("motifs", "Motifs", "The themes and motifs it carries.", ["Theme / Motif"], MANY),""",
     r"""      ref("motifs", "Motifs", "The themes and motifs it carries.", ["Theme / Motif"], core("The Meaning tab's runs and a theme's page read it.", MANY)),"""),
    (r"""        area("whatHappens", "What Happens", "What needs to happen in the beat."),
      ], CORE),""",
     r"""        area("whatHappens", "What Happens", "What needs to happen in the beat."),
      ], core("The outline lists and edits them.")),"""),
    # Research notes
    (r"""      f("appliesTo", "Applies To", "entry-ref", "The world entries the research is about.", MANY),""",
     r"""      f("appliesTo", "Applies To", "entry-ref", "The world entries the research is about.", core("The Notes tab says what a note is about from it.", MANY)),"""),
    (r"""      kref("usedIn", "Used In", "The scenes that need it.", "scene", MANY),""",
     r"""      kref("usedIn", "Used In", "The scenes that need it.", "scene", core("A scene's research list reads it.", MANY)),"""),
    (r"""      area("openQuestions", "Open Questions", "What you still need to find out."),""",
     r"""      area("openQuestions", "Open Questions", "What you still need to find out.", core("Any text in it flags the note open.")),"""),
    # The load: an edited schema's core fields follow the seed.
    (r"""// older than FABULA_SCHEMA_SEED, unless the schema is marked edited. A kind's
// schema that nobody has edited follows the seed (spec, section 3): until the
// template builder learns Fabula nothing can mark one, so a later seed
// replaces it whole, and the cut that teaches the builder adds the rule for
// giving an edited schema new core fields. A schema from a newer seed is left
// alone. A reference the replacing seed takes more than one of keeps what it
// held, as a list of one (seed 2: an arc's Cast). Idempotent: a second load
// changes nothing.""",
     r"""// older than FABULA_SCHEMA_SEED, unless the schema is marked edited. A kind's
// schema that nobody has edited follows the seed (spec, section 3), so a
// later seed replaces it whole. Since v1.7's r017 the template builder marks
// a schema it changes edited, and each load brings an edited schema's core
// fields up to the seed (fabulaRefreshCore), leaving what the user owns. A
// schema from a newer seed is left alone. A reference the seed takes more
// than one of keeps what it held, as a list of one (seed 2: an arc's Cast),
// in an edited schema only where the field is core. Idempotent: a second
// load changes nothing."""),
    (r"""    const have = fab.schemas[k.kind];
    if (isObj(have) && Array.isArray(have.fields)
      && (have.edited === true || (typeof have.seed === "number" && have.seed >= FABULA_SCHEMA_SEED))) return;
    if (!seeded) seeded = fabulaSeedSchemas(Array.isArray(state.templates) ? state.templates : []);
    fab.schemas[k.kind] = seeded[k.kind];
    const lists = seeded[k.kind].fields.filter(fl => fl.type === "entry-ref" && fl.multi).map(fl => fl.id);""",
     r"""    const have = fab.schemas[k.kind];
    const kept = isObj(have) && Array.isArray(have.fields);
    const stamp = kept && typeof have.seed === "number" ? have.seed : 0;
    if (kept && stamp > FABULA_SCHEMA_SEED) return;
    const edited = kept && have.edited === true;
    if (kept && !edited && stamp === FABULA_SCHEMA_SEED) return;
    if (!seeded) seeded = fabulaSeedSchemas(Array.isArray(state.templates) ? state.templates : []);
    fab.schemas[k.kind] = edited ? fabulaRefreshCore(have, seeded[k.kind]) : seeded[k.kind];
    const lists = seeded[k.kind].fields.filter(fl => (!edited || fl.core) && fl.type === "entry-ref" && fl.multi).map(fl => fl.id);"""),
    # Concordance: a link of the user's own draws its edges.
    (r"""    return edges;
  }
  // v1.7 r009: the links that exist so far (spec, section 9), each labeled as""",
     r"""  }
  // v1.7 r009: the links that exist so far (spec, section 9), each labeled as"""),
    (r"""  const links = { story: ["threads", "themes"],""",
     r"""  const seeded = { story: ["threads", "themes"],"""),
    (r"""research: ["appliesTo", "usedIn"] }[k.kind];
  if (!links) return edges;
  const fields = fabulaKindFields(state, k.kind);""",
     r"""research: ["appliesTo", "usedIn"] }[k.kind] || [];
  // Since v1.7's r017 a link field of the user's own draws its edges too,
  // labeled as the field is (spec, section 9): any reference whose id no
  // seed uses, a corpus's included. A seeded link the user has deleted, or
  // made something other than a reference, draws none: its values stay in
  // the records unseen, as a template's deleted field's do.
  const fields = fabulaKindFields(state, k.kind);
  const seedIds = fabulaSeedIds(k.kind);
  const refIds = new Set(fields.filter(f => f && f.id && f.type === "entry-ref").map(f => f.id));
  const links = [...seeded.filter(id => refIds.has(id)), ...[...refIds].filter(id => !seedIds.has(id))];
  if (links.length === 0) return edges;"""),
    # The index: the Templates section last.
    (r"""// v1.7 r016: the index ends with the world's plot threads and themes, two
// sections (FabulaTemplateSections) whose handlers App hands in as sections.""",
     r"""// v1.7 r016: the index ends with the world's plot threads and themes, two
// sections (FabulaTemplateSections) whose handlers App hands in as sections.
// Since r017 the Templates section comes after them (FabulaKindTemplates),
// and sections carries its Edit Template too (onEditKind)."""),
    (r"""      {sections && <FabulaTemplateSections state={state} isLocked={isLocked} sections={sections} />}""",
     r"""      {sections && <FabulaTemplateSections state={state} isLocked={isLocked} sections={sections} />}
      {sections && sections.onEditKind && <FabulaKindTemplates state={state} isLocked={isLocked} focus={sections.focus} onFocused={sections.onFocused} onEditKind={sections.onEditKind} />}"""),
])

TAIL = r'''

''' + header("Fabula: templates (v1.7 r017)") + r'''
// Fabula's kinds in the template builder (docs/fabula-spec.md, sections 3,
// 4, and 5.0, Drak's calls of 2026-10-26). The index's Templates section
// lists the eleven kinds, each with Edit Template, which opens the builder on
// a copy of the kind's schema. The seed owns every part of a core field a
// feature reads, which the builder locks and each load brings up to the seed
// (fabulaRefreshCore); a core field's label, help line, Secret, and panel are
// the user's, and its options unless the seed locks them, and every other
// field is the user's whole. Save marks a schema edited; Reset to Default
// puts the seed back and clears the values the seed has no field for.

// The ids a kind's seed uses at its top level, which a field of the user's
// own never takes. They don't depend on the world's templates.
const fabulaSeedIds = (() => {
  let cache = null;
  return (kind) => {
    if (!cache) {
      const all = fabulaSeedSchemas([]);
      cache = {};
      Object.keys(all).forEach(kk => { cache[kk] = new Set(all[kk].fields.map(f => f.id)); });
    }
    return cache[kind] || new Set();
  };
})();

// An edited schema's core fields brought up to the seed (spec, section 3).
// Each takes the seed's field with the user's label, help line, Secret, and
// panel, and the user's options and Other unless the seed locks them
// (optionsLocked); a blank label keeps the seed's. A core field the schema
// lacks comes back where the seed puts it, after the nearest field before it
// that the schema has, and a field the seed doesn't count core loses the
// mark. The rest is the user's and stays as it is. Idempotent.
const fabulaRefreshCore = (stored, seed) => {
  const coreSeed = seed.fields.filter(f => f && f.core);
  const byId = new Map(coreSeed.map(f => [f.id, f]));
  const mine = (sf, f) => {
    const out = { ...sf };
    if (typeof f.label === "string" && f.label.trim()) out.label = f.label;
    const keys = sf.optionsLocked ? ["help", "secret", "panel"] : ["help", "secret", "panel", "options", "otherTextField"];
    keys.forEach(key => { if (f[key] !== undefined) out[key] = f[key]; else delete out[key]; });
    return out;
  };
  const fields = [];
  (Array.isArray(stored.fields) ? stored.fields : []).forEach(f => {
    if (!f || typeof f !== "object") return;
    if (byId.has(f.id)) { if (!fields.some(x => x.id === f.id)) fields.push(mine(byId.get(f.id), f)); return; }
    if ("core" in f || "reads" in f || "optionsLocked" in f) {
      const { core, reads, optionsLocked, ...rest } = f;
      fields.push(rest);
      return;
    }
    fields.push(f);
  });
  coreSeed.forEach(sf => {
    if (fields.some(f => f.id === sf.id)) return;
    const idx = seed.fields.findIndex(x => x.id === sf.id);
    let at = 0;
    for (let i = idx - 1; i >= 0; i--) {
      const j = fields.findIndex(x => x.id === seed.fields[i].id);
      if (j !== -1) { at = j + 1; break; }
    }
    fields.splice(at, 0, sf);
  });
  return { ...stored, kind: seed.kind, seed: FABULA_SCHEMA_SEED, nameHelp: typeof stored.nameHelp === "string" ? stored.nameHelp : seed.nameHelp, fields };
};

// A kind's schema as the world keeps it, or the seed's where it has none.
const fabulaSchemaOf = (state, kind) => {
  const stored = state.fabula && state.fabula.schemas && state.fabula.schemas[kind];
  return stored && Array.isArray(stored.fields) ? stored : fabulaSeedSchemas(state.templates || [])[kind];
};

// What the builder edits for one of Fabula's kinds: a copy of its fields and
// the help line of its records' names, with the kind they belong to.
const fabulaSchemaDraft = (state, kind) => {
  const s = fabulaSchemaOf(state, kind);
  return JSON.parse(JSON.stringify({ kind, nameHelp: typeof s.nameHelp === "string" ? s.nameHelp : "", fields: s.fields }));
};

// The builder's Save for one of Fabula's kinds (spec, section 4). A field
// with no label is dropped, as a template's is, except a core field, which
// takes its seeded label back; a field of the user's own gets an id no seed
// uses; and a reference's target names follow its ids, as a template's do.
// The schema is marked edited, unless the Save changes nothing. Returns
// Fabula.
const fabulaSchemaSave = (state, kind, draft) => {
  const fab = state.fabula || {};
  const base = fabulaSchemaOf(state, kind);
  const seeded = new Map(fabulaSeedSchemas(state.templates || [])[kind].fields.map(f => [f.id, f.label]));
  const named = (f) => typeof f.label === "string" && f.label.trim() !== "";
  const clean = (list, top) => (Array.isArray(list) ? list : []).filter(f => f && typeof f === "object" && ((top && f.core) || named(f))).map(f => {
    const out = { ...f };
    if (top && out.core && !named(out)) out.label = seeded.get(out.id) || out.label || "";
    if (!out.id) out.id = genId();
    if (out.type === "group" && Array.isArray(out.subfields)) out.subfields = clean(out.subfields, false);
    return out;
  });
  const fields = clean(JSON.parse(JSON.stringify((draft && draft.fields) || [])), true);
  const nameHelp = draft && typeof draft.nameHelp === "string" ? draft.nameHelp : "";
  if (JSON.stringify(fields) === JSON.stringify(base.fields) && nameHelp === (base.nameHelp || "")) return fab;
  syncRefTargetNames(state.templates || [], [{ fields }]);
  return { ...fab, schemas: { ...(fab.schemas || {}), [kind]: { ...base, kind, nameHelp, fields, edited: true } } };
};

// What Reset to Default would do to one of Fabula's kinds, for its
// confirmation: the seeded fields it brings back, the user's own it removes,
// the labels that go back, and how many of the kind's records hold values
// under fields the seed doesn't have, fields deleted earlier included.
const fabulaResetAnalysis = (state, kind) => {
  const k = FABULA_KINDS.find(x => x.kind === kind);
  const fab = state.fabula || {};
  const have = fabulaSchemaOf(state, kind);
  const seed = fabulaSeedSchemas(state.templates || [])[kind];
  const seedIds = new Set(seed.fields.map(f => f.id));
  const haveById = new Map(have.fields.filter(f => f && f.id).map(f => [f.id, f]));
  const filled = (v) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0);
  const records = fabulaArr(fab, k.slice).filter(r => r && r.id);
  return {
    kind,
    label: k.label,
    color: k.color,
    edited: have.edited === true,
    missing: seed.fields.filter(f => !haveById.has(f.id)).map(f => f.label),
    custom: have.fields.filter(f => f && !seedIds.has(f.id)).map(f => f.label || "(unnamed)"),
    relabeled: seed.fields.filter(f => haveById.has(f.id) && haveById.get(f.id).label !== f.label).map(f => ({ from: haveById.get(f.id).label, to: f.label })),
    total: records.length,
    affected: records.filter(r => Object.keys(r.fields || {}).some(fid => !seedIds.has(fid) && filled(r.fields[fid]))).length,
  };
};

// Reset to Default for one of Fabula's kinds: the seed's schema, unedited,
// and every value its records hold under a field the seed doesn't have
// cleared, as a built-in template's reset clears its entries'. A reference
// the seed takes more than one of keeps what it held, as a list of one.
// Returns Fabula.
const fabulaResetSchema = (state, kind) => {
  const k = FABULA_KINDS.find(x => x.kind === kind);
  const fab = state.fabula || {};
  const seed = fabulaSeedSchemas(state.templates || [])[kind];
  const seedIds = new Set(seed.fields.map(f => f.id));
  const lists = new Set(seed.fields.filter(f => f.type === "entry-ref" && f.multi).map(f => f.id));
  const now = isoNow();
  const records = fabulaArr(fab, k.slice).map(r => {
    if (!r || !r.fields || typeof r.fields !== "object") return r;
    const fields = {};
    let changed = false;
    Object.keys(r.fields).forEach(fid => {
      const v = r.fields[fid];
      if (!seedIds.has(fid)) { changed = true; return; }
      if (lists.has(fid) && typeof v === "string") { fields[fid] = v ? [v] : []; changed = true; return; }
      fields[fid] = v;
    });
    return changed ? { ...r, fields, updatedAt: now } : r;
  });
  return { ...fab, [k.slice]: records, schemas: { ...(fab.schemas || {}), [kind]: seed } };
};

// Fabula's kinds a field on kind can point at, as the seeded links do: the
// nine a story holds, from any kind but a corpus, which has no story.
const fabulaStoryKinds = (kind) => (kind && kind !== "corpus" ? FABULA_KINDS.filter(k => k.kind !== "corpus" && k.kind !== "story") : []);

// The Fabula kind a reference field points at within its story, or null.
const fabulaRefKindOf = (f) => (f && f.fabulaScope ? FABULA_KINDS.find(k => (Array.isArray(f.refTemplatesId) ? f.refTemplatesId : []).includes(k.id)) || null : null);

// A target picked in the builder on one of Fabula's kinds: one of the
// story's kinds makes the field a link to its story's records, one kind to a
// field, and anything else is a template's target, as on any template.
const fabulaTargetPatch = (v) => {
  const k = FABULA_KINDS.find(x => x.id === v);
  return k
    ? { refTemplateId: null, refTemplatesId: [k.id], refTemplates: [k.name], refFilters: null, fabulaScope: "story" }
    : { refTemplateId: v || null, refTemplatesId: null, refTemplates: undefined, refFilters: null, fabulaScope: undefined };
};

// A core field's tag, on its tooltip: what reads it, and what the builder
// locks.
const fabulaCoreTitle = (f) => {
  const locked = ["its type", f.type === "entry-ref" ? "what it points at" : null, f.optionsLocked ? "its options" : null, f.type === "group" ? "its subfields" : null].filter(Boolean);
  return `${f.reads || "Fabula reads this field."} You can rename it and change its help line; ${fabulaJoin(locked)} ${locked.length === 1 ? "is" : "are"} locked.`;
};

// A core field's Show only when, as the builder shows it, locked.
const fabulaShowWhenText = (f, fields) => {
  const sw = f.showWhen || {};
  const p = (fields || []).find(x => x && x.id === sw.fieldId);
  return `Shows only when ${p ? p.label : "another field"} is ${(sw.values || []).join(" or ")}; that stays as it is.`;
};

// The index's Templates section (spec, section 4, Drak's call at r017's
// plan): Fabula's eleven kinds in order, each with how many records of it the
// world holds, marked edited when its schema is, and Edit Template, which
// opens the builder. Scrolled into view when the builder closes back to it;
// in Lock Mode it shows no buttons.
function FabulaKindTemplates({ state, isLocked, focus, onFocused, onEditKind }) {
  const ref = useRef(null);
  useEffect(() => {
    if (focus !== "templates") return;
    if (ref.current && ref.current.scrollIntoView) ref.current.scrollIntoView({ block: "start" });
    if (onFocused) onFocused();
  }, [focus]);
  const fab = state.fabula || {};
  return (
    <div ref={ref} className="fabula-kind-templates" style={{ marginTop: 28 }}>
      <div className="field-label" style={{ marginBottom: 8 }}><span>Templates</span></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1, border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
        {FABULA_KINDS.map(k => {
          const n = fabulaArr(fab, k.slice).filter(r => r && r.id).length;
          const edited = !!(fab.schemas && fab.schemas[k.kind] && fab.schemas[k.kind].edited === true);
          return (
            <div key={k.kind} className="fabula-kind-row" data-kind={k.kind} style={{ padding: "7px 12px 7px 16px", background: "var(--surf)", display: "flex", alignItems: "center", flexWrap: "wrap", columnGap: 12, rowGap: 4 }}>
              <span className="fabula-kind-name" style={{ flex: "1 1 auto", minWidth: 0, fontSize: 14.5, fontWeight: 500 }}>{k.label}</span>
              <span className="fabula-kind-meta" style={{ fontSize: 12, color: "var(--text-dim)", whiteSpace: "nowrap" }}>
                {fabulaCount(k.kind, n)}
                {edited && <span className="fabula-kind-edited" style={{ color: "var(--accent)" }}> · edited</span>}
              </span>
              {!isLocked && onEditKind && <button className="btn btn-ghost" style={{ padding: "3px 10px", fontSize: 12 }} onClick={() => onEditKind(k.kind)}>Edit Template</button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Reset to Default's confirmation for one of Fabula's kinds, as a built-in
// template's: what comes back, what goes, and the records whose values in
// the fields that go are cleared, with the same acknowledgment before it
// runs. A kind that follows the seed has nothing to reset.
function FabulaResetModal({ analysis, onCancel, onConfirm }) {
  const [ack, setAck] = useState(false);
  const { kind, label, color, edited, missing, custom, relabeled, total, affected } = analysis;
  const nothing = !edited && affected === 0 && missing.length === 0 && custom.length === 0 && relabeled.length === 0;
  const s = (n) => (n === 1 ? "" : "s");
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal modal-wide fabula-reset-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-hdr"><span style={{ color }}>{label}</span>: reset to default?</div>
        <div className="modal-body">
          {nothing ? (
            <div className="modal-notice modal-notice-info">This template already follows the seed. Nothing would change.</div>
          ) : (
            <>
              <div className="modal-notice modal-notice-warning">
                <strong>This action cannot be undone.</strong> Make sure you've exported your world (.json) recently if you want a backup.
              </div>
              <div className="modal-section">
                <div className="modal-section-hdr">Changes that will happen:</div>
                <ul className="modal-list">
                  {missing.length > 0 && (
                    <li><strong>{missing.length}</strong> field{s(missing.length)} will be added back:
                      <ul className="modal-list-nested">{missing.map((m, i) => <li key={i}>{m}</li>)}</ul>
                    </li>
                  )}
                  {custom.length > 0 && (
                    <li className="modal-list-warn"><strong>{custom.length}</strong> field{s(custom.length)} of your own will be removed:
                      <ul className="modal-list-nested">{custom.map((m, i) => <li key={i}>{m}</li>)}</ul>
                    </li>
                  )}
                  {relabeled.length > 0 && (
                    <li><strong>{relabeled.length}</strong> label{s(relabeled.length)} will go back:
                      <ul className="modal-list-nested">{relabeled.map((r, i) => <li key={i}>{r.from} → {r.to}</li>)}</ul>
                    </li>
                  )}
                  <li>Every seeded field's type, help line, options, and place will go back to the seed's</li>
                </ul>
              </div>
              {total > 0 && (
                <div className="modal-section">
                  <div className="modal-section-hdr">Impact on existing records:</div>
                  {affected > 0 ? (
                    <div className="modal-notice modal-notice-warning">
                      <strong>{affected}</strong> of <strong>{fabulaCount(kind, total)}</strong> {affected === 1 ? "holds" : "hold"} data in fields the seed doesn't have. <strong>That data will be permanently deleted.</strong> Their other fields are kept.
                    </div>
                  ) : (
                    <div className="modal-notice modal-notice-info">
                      {fabulaCount(kind, total)} {total === 1 ? "exists, but it holds no data" : "exist, but none holds data"} in fields the seed doesn't have, so no record data will be lost.
                    </div>
                  )}
                </div>
              )}
              <label className="modal-ack">
                <input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} />
                <span>I understand this will permanently remove the changes listed above and cannot be undone.</span>
              </label>
            </>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          {!nothing && <button className="btn btn-danger" onClick={onConfirm} disabled={!ack}>Reset Template</button>}
        </div>
      </div>
    </div>
  );
}'''

p28 = MODULES / "28_fabula.jsx"
t28 = p28.read_text(encoding="utf-8")
end = "              </div>\n            );\n          })}\n        </div>\n      )}\n    </div>\n  );\n}"
assert not t28.endswith("\n") and t28.endswith(end), "28_fabula.jsx no longer ends the way this cut expects"
p28.write_text(t28 + TAIL, encoding="utf-8")


# ------------------------------------------------- 15: the builder's Fabula mode
edit(MODULES / "15_template-builder.jsx", [
    # SubfieldList: help lines, the story's kinds as targets, no family role.
    (r"""function SubfieldList({ subfields, parentPath, depth, templates, onAdd, onUpdate, onRemove, packs }) {""",
     r"""function SubfieldList({ subfields, parentPath, depth, templates, onAdd, onUpdate, onRemove, packs, fabula }) {"""),
    (r"""        const isMultiRef = Array.isArray(sf.refTemplatesId) && sf.refTemplatesId.length > 0;""",
     r"""        // v1.7 r017: on one of Fabula's kinds a subfield can point at one of
        // the story's kinds, which isn't a multi-template target.
        const sfKind = fabula ? fabulaRefKindOf(sf) : null;
        const isMultiRef = !sfKind && Array.isArray(sf.refTemplatesId) && sf.refTemplatesId.length > 0;"""),
    (r"""                <button className="del-field-btn" onClick={() => onRemove(parentPath, sf.id)}>×</button>
              </div>
""",
     r"""                <button className="del-field-btn" onClick={() => onRemove(parentPath, sf.id)}>×</button>
              </div>
              {fabula && (
                <input className="input tpl-field-help" style={{ marginTop: 4, fontSize: 12 }} placeholder="Help line: what goes in this subfield..." value={sf.help || ""} onChange={e => onUpdate(parentPath, sf.id, { help: e.target.value })} />
              )}
"""),
    (r"""                      checked={isMultiRef}
""",
     r"""                      checked={isMultiRef}
                      disabled={!!sfKind}
"""),
    (r"""                    <select className="input" style={{ flex: 1, fontSize: 11, padding: "3px 8px" }} value={sf.refTemplateId || ""} onChange={e => onUpdate(parentPath, sf.id, { refTemplateId: e.target.value || null })}>""",
     r"""                    <select className="input" style={{ flex: 1, fontSize: 11, padding: "3px 8px" }} value={sfKind ? sfKind.id : (sf.refTemplateId || "")} onChange={e => onUpdate(parentPath, sf.id, fabula ? fabulaTargetPatch(e.target.value) : { refTemplateId: e.target.value || null })}>"""),
    (r"""                      {getRegisteredSyntheticTemplates().filter(t => t.refEligible).map(t => <option key={t.id} value={t.id}>{t.icon} {t.name} only</option>)}
                    </select>
                  )}
                  <select className="input" style={{ flex: "0 0 130px", fontSize: 11, padding: "3px 8px" }} value={sf.relationKind || ""}""",
     r"""                      {getRegisteredSyntheticTemplates().filter(t => t.refEligible).map(t => <option key={t.id} value={t.id}>{t.icon} {t.name} only</option>)}
                      {fabula && fabulaStoryKinds(fabula.kind).length > 0 && (
                        <optgroup label="This story's records">
                          {fabulaStoryKinds(fabula.kind).map(k => <option key={k.id} value={k.id}>{k.label} (this story)</option>)}
                        </optgroup>
                      )}
                    </select>
                  )}
                  {!fabula && <select className="input" style={{ flex: "0 0 130px", fontSize: 11, padding: "3px 8px" }} value={sf.relationKind || ""}"""),
    (r"""                    <option value="spouse">Spouse of this</option>
                  </select>
                </>}""",
     r"""                    <option value="spouse">Spouse of this</option>
                  </select>}
                </>}"""),
    (r"""                  onRemove={onRemove}
                  packs={packs}
                />""",
     r"""                  onRemove={onRemove}
                  packs={packs}
                  fabula={fabula}
                />"""),
    # Two pieces of the Fabula mode, ahead of the builder.
    (r"""function TemplateBuilder({ draft, templates, onChange, flash, entries, calendar, imageFolder, dirHandle, allTags, packs }) {""",
     r"""// v1.7 r017: the head of the builder on one of Fabula's kinds, in place of a
// template's name, icon, color, and type, which are Fabula's: the help line
// of the records' name, the user's to change (docs/fabula-spec.md, section
// 4).
function FabulaBuilderHead({ draft, onChange, fabula }) {
  return (
    <div className="form-field fabula-builder-head">
      <label className="form-label">Help line for the name</label>
      <input className="input" placeholder="What the name holds..." value={draft.nameHelp || ""} onChange={e => onChange({ ...draft, nameHelp: e.target.value })} />
      <div className="tpl-cascade-hint" style={{ marginTop: 8 }}>
        These are the fields of every {(FABULA_NOUNS[fabula.kind] || { one: fabula.label }).one} in this world. Fabula reads the fields marked Core, so what it reads of each is locked; the rest of them, and every other field, is yours to change. A Core tag's tooltip says what reads its field.
      </div>
    </div>
  );
}

// v1.7 r017: a core group's subfields on one of Fabula's kinds, which Fabula
// reads, shown as they are and not editable.
function FabulaLockedRows({ field }) {
  const typeLabel = (t) => (FIELD_TYPES.find(ft => ft.value === t) || {}).label || t;
  return (
    <div className="tpl-subfields fabula-locked-rows">
      <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 6 }}>Subfields, locked</div>
      {(field.subfields || []).map(sf => (
        <div key={sf.id} className="tpl-subfield-row" style={{ color: "var(--text-dim)", fontSize: "calc(13px * var(--font-scale))" }}>
          <span style={{ flex: 2 }}>{sf.label}</span>
          <span style={{ flex: 1.4 }}>{typeLabel(sf.type)}</span>
        </div>
      ))}
    </div>
  );
}

// v1.7 r017: fabula, when set ({ kind, label }), puts the builder in its
// mode for one of Fabula's kinds (docs/fabula-spec.md, section 4).
function TemplateBuilder({ draft, templates, onChange, flash, entries, calendar, imageFolder, dirHandle, allTags, packs, fabula }) {"""),
    # One of Fabula's kinds opens at the top of its page.
    (r"""  const fieldDrag = useDragReorder(reorderField);
""",
     r"""  const fieldDrag = useDragReorder(reorderField);
  // v1.7 r017: one of Fabula's kinds opens at the top of its page, wherever
  // Fabula's index stood when its Edit Template was clicked.
  const builderRef = useRef(null);
  React.useLayoutEffect(() => {
    if (!fabula) return;
    for (let el = builderRef.current && builderRef.current.parentElement; el; el = el.parentElement) {
      if (el.scrollHeight > el.clientHeight && /(auto|scroll)/.test(getComputedStyle(el).overflowY)) { el.scrollTop = 0; break; }
    }
  }, [fabula && fabula.kind]);
"""),
    # The toolbar's preview: templates only.
    (r"""      <div className="tpl-builder-toolbar">
""",
     r"""      {!fabula && <div className="tpl-builder-toolbar">
"""),
    (r"""        </button>
      </div>
      <div className="tpl-builder">
        <div className="form-field">
          <label className="form-label">Template Name</label>""",
     r"""        </button>
      </div>}
      <div className="tpl-builder" ref={builderRef}>
        {fabula ? <FabulaBuilderHead draft={draft} onChange={onChange} fabula={fabula} /> : <>
        <div className="form-field">
          <label className="form-label">Template Name</label>"""),
    (r"""        </select>
      </div>

      <div className="section-hdr">Fields</div>""",
     r"""        </select>
      </div>
        </>}

      <div className="section-hdr">Fields</div>"""),
    # A field's row.
    (r"""        const showAfter = isOver && fieldDrag.dropPosition === "after" && !isDragged;
        return (
        <div
          key={field.id}""",
     r"""        const showAfter = isOver && fieldDrag.dropPosition === "after" && !isDragged;
        // v1.7 r017: on one of Fabula's kinds a core field keeps what Fabula
        // reads (docs/fabula-spec.md, section 3): its label, help line,
        // Secret, and options, unless the seed locks them, are the user's.
        const core = !!(fabula && field.core);
        const fabKind = fabula ? fabulaRefKindOf(field) : null;
        const multiTpl = !fabKind && Array.isArray(field.refTemplatesId) && field.refTemplatesId.length > 0;
        const optionsLocked = core && !!field.optionsLocked;
        return (
        <div
          key={field.id}"""),
    (r"""            <input className="input tpl-field-lbl" placeholder="Field name..." value={field.label} onChange={e => updateField(field.id, { label: e.target.value })} />
            <select className="input tpl-field-type" value={field.type} onChange={e => {""",
     r"""            <input className="input tpl-field-lbl" placeholder="Field name..." value={field.label} onChange={e => updateField(field.id, { label: e.target.value })} />
            {core && <span className="fabula-core-tag" title={fabulaCoreTitle(field)} style={{ fontSize: "calc(10px * var(--font-scale))", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--accent)", border: "1px solid var(--accent-dim)", borderRadius: 3, padding: "1px 6px", whiteSpace: "nowrap", cursor: "help" }}>Core</span>}
            <select className="input tpl-field-type" value={field.type} disabled={core} onChange={e => {"""),
    (r"""            <button className="del-field-btn" onClick={() => removeField(field.id)} title="Remove field">×</button>
          </div>
""",
     r"""            {!core && <button className="del-field-btn" onClick={() => removeField(field.id)} title="Remove field">×</button>}
          </div>
          {fabula && (
            <input className="input tpl-field-help" style={{ marginTop: 5, fontSize: 12 }} placeholder="Help line: what goes in this field..." value={field.help || ""} onChange={e => updateField(field.id, { help: e.target.value })} />
          )}
"""),
    (r"""              <input type="checkbox" checked={!!field.required} onChange={e => updateField(field.id, { required: e.target.checked })} />""",
     r"""              <input type="checkbox" checked={!!field.required} disabled={core} onChange={e => updateField(field.id, { required: e.target.checked })} />"""),
    (r"""                <input type="checkbox" checked={!!field.otherTextField} onChange={e => updateField(field.id, { otherTextField: e.target.checked })} />""",
     r"""                <input type="checkbox" checked={!!field.otherTextField} disabled={optionsLocked} onChange={e => updateField(field.id, { otherTextField: e.target.checked })} />"""),
    (r"""                <input type="checkbox" checked={!!field.multi} onChange={e => updateField(field.id, { multi: e.target.checked })} />""",
     r"""                <input type="checkbox" checked={!!field.multi} disabled={core} onChange={e => updateField(field.id, { multi: e.target.checked })} />"""),
    (r"""                  checked={Array.isArray(field.refTemplatesId) && field.refTemplatesId.length > 0}
""",
     r"""                  checked={multiTpl}
                  disabled={core || !!fabKind}
"""),
    (r"""              {!(Array.isArray(field.refTemplatesId) && field.refTemplatesId.length > 0) && (
                <select className="input" style={{ flex: 1, fontSize: 11, padding: "3px 8px" }} value={field.refTemplateId || ""} onChange={e => updateField(field.id, { refTemplateId: e.target.value || null })}>""",
     r"""              {!multiTpl && (
                <select className="input" style={{ flex: 1, fontSize: 11, padding: "3px 8px" }} value={fabKind ? fabKind.id : (field.refTemplateId || "")} disabled={core} onChange={e => updateField(field.id, fabula ? fabulaTargetPatch(e.target.value) : { refTemplateId: e.target.value || null })}>"""),
    (r"""                  {getRegisteredSyntheticTemplates().filter(t => t.refEligible).map(t => <option key={t.id} value={t.id}>{t.icon} {t.name} only</option>)}
                </select>
              )}
              <select className="input" style={{ flex: "0 0 130px", fontSize: 11, padding: "3px 8px" }} value={field.relationKind || ""}""",
     r"""                  {getRegisteredSyntheticTemplates().filter(t => t.refEligible).map(t => <option key={t.id} value={t.id}>{t.icon} {t.name} only</option>)}
                  {fabula && fabulaStoryKinds(fabula.kind).length > 0 && (
                    <optgroup label="This story's records">
                      {fabulaStoryKinds(fabula.kind).map(k => <option key={k.id} value={k.id}>{k.label} (this story)</option>)}
                    </optgroup>
                  )}
                </select>
              )}
              {!fabula && <select className="input" style={{ flex: "0 0 130px", fontSize: 11, padding: "3px 8px" }} value={field.relationKind || ""}"""),
    (r"""                <option value="spouse">Spouse of this</option>
              </select>
            </>}
          </div>
""",
     r"""                <option value="spouse">Spouse of this</option>
              </select>}
            </>}
            {fabula && fabula.kind === "story" && (
              <select className="input fabula-panel-pick" style={{ flex: "0 0 150px", fontSize: 11, padding: "3px 8px", marginLeft: "auto" }} value={field.panel || ""} onChange={e => updateField(field.id, { panel: e.target.value || undefined })} title="Which panel of the Story tab the field sits in">
                <option value="">No panel</option>
                {FABULA_STORY_PANELS.map(p => <option key={p.id} value={p.id}>{p.label} panel</option>)}
              </select>
            )}
          </div>
"""),
    (r"""          {field.type === "entry-ref" && Array.isArray(field.refTemplatesId) && field.refTemplatesId.length >= 0 && (""",
     r"""          {field.type === "entry-ref" && !fabKind && Array.isArray(field.refTemplatesId) && field.refTemplatesId.length >= 0 && ("""),
    (r"""            Array.isArray(field.refTemplatesId) && (
              <MultiTemplateRefConfig
                field={field}
                templates={templates}
                onChange={(patch) => updateField(field.id, patch)}
                packs={packs}
              />
            )
          )}""",
     r"""            Array.isArray(field.refTemplatesId) && (core ? (
              <div className="tpl-cascade-hint fabula-locked-targets" style={{ marginLeft: 0 }}>
                Points at {(field.refTemplates || []).join(", ") || "any template"}; that stays as it is.
              </div>
            ) : (
              <MultiTemplateRefConfig
                field={field}
                templates={templates}
                onChange={(patch) => updateField(field.id, patch)}
                packs={packs}
              />
            ))
          )}"""),
    (r"""          {field.type === "select" && field.otherTextField && (
            <div className="tpl-cascade-hint" style={{ marginLeft: 0 }}>
              "Other" will be auto-added to the dropdown at runtime.""",
     r"""          {field.type === "select" && field.otherTextField && !optionsLocked && (
            <div className="tpl-cascade-hint" style={{ marginLeft: 0 }}>
              "Other" will be auto-added to the dropdown at runtime."""),
    (r"""          {field.type === "select" && (
            <>
              {/* Cascade-select:""",
     r"""          {field.type === "select" && (optionsLocked ? (
            <div className="tpl-cascade-hint fabula-locked-options" style={{ marginLeft: 0 }}>
              {field.optionsFrom ? `Its options come from the story's structure${field.otherTextField ? ", with Other after them" : ""}.` : `Options: ${(field.options || []).join(" | ")}. Fabula reads these names, so they stay as they are.`}
            </div>
          ) : (
            <>
              {/* Cascade-select:"""),
    (r"""              {(() => {
                const candidateParents = draft.fields.filter(f =>""",
     r"""              {!core && (() => {
                const candidateParents = draft.fields.filter(f =>"""),
    (r"""                <SelectOptionsInput
                  value={field.options}
                  onCommit={(opts) => updateField(field.id, { options: opts })}
                  placeholder="Options: A | B | C"
                />
              )}
            </>
          )}""",
     r"""                <SelectOptionsInput
                  value={field.options}
                  onCommit={(opts) => updateField(field.id, { options: opts })}
                  placeholder="Options: A | B | C"
                />
              )}
            </>
          ))}"""),
    (r"""          {field.type === "group" && (
            <SubfieldList
              subfields={field.subfields || []}
              parentPath={[field.id]}
              depth={1}
              templates={templates}
              onAdd={addSubfieldAt}
              onUpdate={updateSubfieldAt}
              onRemove={removeSubfieldAt}
              packs={packs}
            />
          )}""",
     r"""          {field.type === "group" && (core ? (
            <FabulaLockedRows field={field} />
          ) : (
            <SubfieldList
              subfields={field.subfields || []}
              parentPath={[field.id]}
              depth={1}
              templates={templates}
              onAdd={addSubfieldAt}
              onUpdate={updateSubfieldAt}
              onRemove={removeSubfieldAt}
              packs={packs}
              fabula={fabula}
            />
          ))}"""),
    (r"""          {(() => {
            const showWhenCandidates = draft.fields.filter(f =>""",
     r"""          {core ? (field.showWhen ? (
            <div className="tpl-cascade-hint fabula-locked-when" style={{ marginLeft: 0 }}>{fabulaShowWhenText(field, draft.fields)}</div>
          ) : null) : (() => {
            const showWhenCandidates = draft.fields.filter(f =>"""),
])


# ----------------------------------------------------------- 12: App's side
edit(MODULES / "12_trunk.jsx", [
    (r"""  const [fabulaFocus, setFabulaFocus] = useState(null);""",
     r"""  const [fabulaFocus, setFabulaFocus] = useState(null);
  // v1.7 r017: one of Fabula's kinds open in the template builder (its
  // schema's draft), and the kind whose Reset to Default asks first.
  const [schemaDraft, setSchemaDraft] = useState(null);
  const [resetSchemaKind, setResetSchemaKind] = useState(null);"""),
    (r"""  const initialTplDraftRef = useRef(null);""",
     r"""  const initialTplDraftRef = useRef(null);
  const initialSchemaDraftRef = useRef(null);"""),
    (r"""    if (recordDraft && JSON.stringify(recordDraft) !== initialRecordDraftRef.current) return true;
    return false;""",
     r"""    if (recordDraft && JSON.stringify(recordDraft) !== initialRecordDraftRef.current) return true;
    if (schemaDraft && JSON.stringify(schemaDraft) !== initialSchemaDraftRef.current) return true;
    return false;"""),
    (r"""    setEntryDraft(null); setTplDraft(null); setMapDraft(null); setCorpusDraft(null); setStoryDraft(null); setRecordDraft(null);""",
     r"""    setEntryDraft(null); setTplDraft(null); setMapDraft(null); setCorpusDraft(null); setStoryDraft(null); setRecordDraft(null); setSchemaDraft(null);"""),
    (r"""    initialRecordDraftRef.current = null;
    clearTimeout(draftSaveTimerRef.current);""",
     r"""    initialRecordDraftRef.current = null;
    initialSchemaDraftRef.current = null;
    clearTimeout(draftSaveTimerRef.current);"""),
    (r"""  const newFabulaEntry = (tpl) => {
    if (isLocked || !tpl) return;
    setEntryNavStack([{ view: "fabula", entryId: null }]);
    openNewEntry(tpl);
  };""",
     r"""  const newFabulaEntry = (tpl) => {
    if (isLocked || !tpl) return;
    setEntryNavStack([{ view: "fabula", entryId: null }]);
    openNewEntry(tpl);
  };

  // v1.7 r017: one of Fabula's kinds in the template builder (docs/fabula-
  // spec.md, section 4). Edit Template on the index's Templates section opens
  // a copy of the kind's schema over Fabula; Cancel, Save, and a confirmed
  // Reset to Default return to the index at that section.
  const openFabulaSchema = (kind) => {
    if (isLocked) return;
    if (!confirmDiscardDraft()) return;
    clearDraftAndStorage();
    setActiveCorpusId(null); setActiveStoryId(null); setActiveRecord(null); setFabulaBack([]);
    const draft = fabulaSchemaDraft(state, kind);
    setSchemaDraft(draft);
    initialSchemaDraftRef.current = JSON.stringify(draft);
    setView("fabula");
  };

  const saveFabulaSchema = () => {
    if (!schemaDraft || isLocked) return;
    const draft = schemaDraft;
    updateState(s => ({ ...s, fabula: fabulaSchemaSave(s, draft.kind, draft) }));
    clearDraftAndStorage();
    setFabulaFocus("templates");
    flash("Template saved");
  };

  const cancelFabulaSchema = () => {
    if (!confirmDiscardDraft()) return;
    clearDraftAndStorage();
    setFabulaFocus("templates");
  };

  const confirmFabulaReset = () => {
    const kind = resetSchemaKind;
    setResetSchemaKind(null);
    if (!kind || isLocked) return;
    updateState(s => ({ ...s, fabula: fabulaResetSchema(s, kind) }));
    clearDraftAndStorage();
    setFabulaFocus("templates");
    flash("Template reset to default");
  };"""),
    (r"""  else if (view === "fabula") {
    if (activeStoryId && activeRecord) {""",
     r"""  else if (view === "fabula") {
    if (schemaDraft) {
      const k = FABULA_KINDS.find(x => x.kind === schemaDraft.kind);
      headerTitle = `Edit: ${k ? k.label : "Template"}`;
      headerIcon = { icon: fabulaTemplate(state, schemaDraft.kind).icon, color: k ? k.color : undefined };
    }
    else if (activeStoryId && activeRecord) {"""),
    (r"""              {view === "fabula" && activeRecord && recordDraft && <>""",
     r"""              {view === "fabula" && schemaDraft && <>
                {!isLocked && <button className="btn btn-ghost" onClick={() => setResetSchemaKind(schemaDraft.kind)} title="Put back this template's seeded fields, labels, help lines, options, and order">Reset to Default</button>}
                <button className="btn btn-ghost" onClick={cancelFabulaSchema}>Cancel</button>
                <button className="btn btn-accent" onClick={saveFabulaSchema} disabled={isLocked}>Save Template</button>
              </>}
              {view === "fabula" && activeRecord && recordDraft && <>"""),
    (r"""          {view === "fabula" && !activeCorpusId && !corpusDraft && !activeStoryId && (""",
     r"""          {view === "fabula" && !schemaDraft && !activeCorpusId && !corpusDraft && !activeStoryId && ("""),
    (r"""                onRestoreTemplate: (name) => restoreBuiltinTemplates([name]),
              }}""",
     r"""                onRestoreTemplate: (name) => restoreBuiltinTemplates([name]),
                onEditKind: openFabulaSchema,
              }}"""),
    (r"""          {view === "fabula" && corpusDraft && (
            <EntryForm""",
     r"""          {view === "fabula" && schemaDraft && (
            <TemplateBuilder
              draft={schemaDraft}
              templates={state.templates}
              onChange={setSchemaDraft}
              flash={flash}
              entries={state.entries}
              calendar={state.world.calendar}
              imageFolder={state.world.imageFolder}
              dirHandle={dirHandle}
              allTags={allTags}
              packs={state.packs}
              fabula={{ kind: schemaDraft.kind, label: (FABULA_KINDS.find(x => x.kind === schemaDraft.kind) || {}).label || "record" }}
            />
          )}
          {view === "fabula" && corpusDraft && (
            <EntryForm"""),
    (r"""      {restoreModalOpen && (
        <RestoreBuiltinsModal""",
     r"""      {resetSchemaKind && (
        <FabulaResetModal
          analysis={fabulaResetAnalysis(state, resetSchemaKind)}
          onCancel={() => setResetSchemaKind(null)}
          onConfirm={confirmFabulaReset}
        />
      )}

      {restoreModalOpen && (
        <RestoreBuiltinsModal"""),
])

print("v1.7 r017 applied: 12_trunk, 15_template-builder, 28_fabula")
