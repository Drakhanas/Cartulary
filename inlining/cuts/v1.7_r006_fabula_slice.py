"""v1.7 r006: Fabula's slice and its seeded schemas, with nothing on screen.

Fabula's first cut (docs/fabula-spec.md, section 10, cut 1). Drak passed the
fifteen field tables on 2026-10-25, one per message, and made three calls for
this cut the same evening: no registry entries until the first cut that shows
Fabula (fork C, a); the code grows inside 27_trunk and moves to a module of its
own by a pure carve once the view is in, because the edit gate refuses a cut
that adds or renames a file (a); and every field gets a help line, written here
and reviewed in place once the view shows them, with a kind's schema following
the seed until someone edits it (a).

- 22_trunk: FABULA_KINDS, Fabula's eleven record kinds, each with the array in
  state.fabula that holds its records and a sentinel id, the way Glossopoeia's
  kinds have theirs. Nothing registers them.
- 27_trunk, at its tail: FABULA_SCHEMA_SEED, fabulaSeedSchemas (the fifteen
  tables as one schema per kind, the Story's four panels inside the Story's,
  resolved against the world's templates), and ensureFabulaSlice.
- 10_migrate: migrate() calls ensureFabulaSlice last, so the templates the
  schemas point at are final. A world without Fabula gets the empty slice and
  the schemas; SCHEMA_VERSION stays 1, since the change only adds.

Nothing reads state.fabula yet: no view, no export, no Concordance node.

Declared scope: 10_migrate, 22_trunk, 27_trunk. Declarations added:
FABULA_KINDS, FABULA_SCHEMA_SEED, fabulaSeedSchemas, ensureFabulaSlice.

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given). Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r006_fabula_slice.py
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


# ---------------------------------------------------------------- 22: the kinds
KINDS = '''// Fabula's record kinds (v1.7 r006; docs/fabula-spec.md, section 3). Each
// has the array in state.fabula that holds its records (slice) and a sentinel
// id, the way Glossopoeia's kinds have theirs, so a reference field can name a
// kind of Fabula record. None is registered: the registry entries come with
// the first cut that shows Fabula, together with Concordance's single Fabula
// toggle and a template builder that offers only sources marked eligible
// (Drak, 2026-10-25). Until then the ids appear only in Fabula's seeded
// schemas (fabulaSeedSchemas).
const FABULA_KINDS = [
  { kind: "corpus",       slice: "corpora",       id: "__fabula_corpora__",       name: "Corpus (Fabula)" },
  { kind: "story",        slice: "stories",       id: "__fabula_stories__",       name: "Story (Fabula)" },
  { kind: "cast",         slice: "cast",          id: "__fabula_cast__",          name: "Cast (Fabula)" },
  { kind: "arc",          slice: "arcs",          id: "__fabula_arcs__",          name: "Arc (Fabula)" },
  { kind: "relationship", slice: "relationships", id: "__fabula_relationships__", name: "Relationship (Fabula)" },
  { kind: "plotPoint",    slice: "plotPoints",    id: "__fabula_plotpoints__",    name: "Plot Point (Fabula)" },
  { kind: "promise",      slice: "promises",      id: "__fabula_promises__",      name: "Promise & Payoff (Fabula)" },
  { kind: "part",         slice: "parts",         id: "__fabula_parts__",         name: "Part / Act (Fabula)" },
  { kind: "chapter",      slice: "chapters",      id: "__fabula_chapters__",      name: "Chapter (Fabula)" },
  { kind: "scene",        slice: "scenes",        id: "__fabula_scenes__",        name: "Scene (Fabula)" },
  { kind: "research",     slice: "research",      id: "__fabula_research__",      name: "Research Note (Fabula)" },
];'''

edit(MODULES / "22_trunk.jsx", [
    (
        'const MAP_REF_LABEL = "Map";\n\nconst NODE_SOURCE_REGISTRY = [',
        'const MAP_REF_LABEL = "Map";\n\n' + KINDS + '\n\nconst NODE_SOURCE_REGISTRY = [',
    ),
])

# ---------------------------------------------------------------- 27: schemas and the slice
FABULA = header("Fabula: the slice and its seeded schemas (v1.7 r006)") + '''
// Fabula is the view for planning a story down to its scenes and their beats
// (docs/fabula-spec.md). This cut lays down its data and nothing else: no
// screen, export, or Concordance node reads it yet. Its records live in
// state.fabula, one array per kind (FABULA_KINDS, beside the node-source
// registry), and each world keeps one schema per kind in
// state.fabula.schemas, seeded here from the field tables Drak passed on
// 2026-10-25 (spec, section 5). The code grows here until the view is in,
// then moves to a module of its own by a carve.
const FABULA_SCHEMA_SEED = 1;

// The seeded schemas, one per kind, resolved against this world's templates.
// Field ids are stable and unique within a kind, subfields included, as
// validateMigrated requires of a template. A reference keeps its targets
// twice, as a template's field does: names (refTemplates) and ids
// (refTemplatesId). A target is found by name, or, for a built-in template
// the user renamed, by the shape of its id (`tpl-<slug>-` and four
// characters, which a rename leaves alone); a template the world doesn't have
// keeps its name and gets no id. A reference to Fabula's own records carries
// its kind's sentinel and fabulaScope "story", for a picker that will offer
// the record's own story only. core marks a field a feature reads (spec,
// section 5.0), which the builder will let a user relabel but not delete or
// retype; panel puts a Story field in one of its four panels. A help line
// shows on its field's label, as Glossopoeia's do. Slot's options come from
// the story's structure, so its seed holds Other alone.
const fabulaSeedSchemas = (templates) => {
  const { byName } = refTargetIndex(templates, false);
  const target = (name) => {
    if (byName[name]) return { id: byName[name], name };
    const pre = `tpl-${slugify(name)}-`;
    const renamed = templates.find(t => t && t.origin === TEMPLATE_ORIGIN.BUILTIN && typeof t.id === "string"
      && t.id.startsWith(pre) && t.id.length === pre.length + 4);
    return renamed ? { id: renamed.id, name: renamed.name } : { id: null, name };
  };
  const refsTo = (names) => {
    const found = names.map(target);
    return { refTemplates: found.map(x => x.name), refTemplatesId: found.map(x => x.id).filter(Boolean) };
  };
  const kindRef = (kind) => {
    const k = FABULA_KINDS.find(x => x.kind === kind);
    return { refTemplates: [k.name], refTemplatesId: [k.id], fabulaScope: "story" };
  };
  const f = (id, label, type, help, more = {}) => ({ id, label, type, help, ...more });
  const text = (id, label, help, more) => f(id, label, "text", help, more);
  const area = (id, label, help, more) => f(id, label, "textarea", help, more);
  const pick = (id, label, help, options, more = {}) => f(id, label, "select", help, { options, ...more });
  const pickOther = (id, label, help, options, more = {}) => pick(id, label, help, [...options, "Other"], { otherTextField: true, ...more });
  const multiOther = (id, label, help, options) => f(id, label, "multiselect", help, { options, otherTextField: true });
  const ref = (id, label, help, names, more = {}) => f(id, label, "entry-ref", help, { ...refsTo(names), ...more });
  const kref = (id, label, help, kind, more = {}) => f(id, label, "entry-ref", help, { ...kindRef(kind), ...more });
  const group = (id, label, help, subfields, more = {}) => f(id, label, "group", help, { subfields, ...more });
  const MANY = { multi: true };
  const CORE = { core: true };
  const inPanel = (panel, fields) => fields.map(x => ({ ...x, panel }));
  const schema = (kind, nameLabel, nameHelp, fields) => ({ kind, seed: FABULA_SCHEMA_SEED, nameLabel, nameHelp, fields });
  const OUTLINE_STATUS = ["Idea", "Planned", "Outlined", "Drafted", "Revised", "Final", "Cut"];
  const PLACES = ["Location", "Cosmology / Plane", BODY_REF_LABEL, "Vehicle"];
  const BEINGS = ["Character", "Deity / Entity"];
  return {
    corpus: schema("corpus", "Name", "The corpus's name: a series title, or whatever ties these stories together.", [
      pickOther("kind", "Kind", "What holds these stories together.", ["Series", "Shared World", "Anthology", "Collection"]),
      pick("status", "Status", "Where the corpus stands as a whole.", ["Planning", "Active", "Complete", "Shelved"]),
      area("description", "Description", "What the corpus is, in a paragraph."),
      area("notes", "Notes", "Anything else about the corpus."),
    ]),
    story: schema("story", "Title", "The story's title, working or final.", [
      pick("status", "Status", "Where the story stands; Fabula's index shows it.", ["Idea", "Planning", "Drafting", "Revising", "Done", "Shelved"], CORE),
      pickOther("form", "Form", "What shape the finished work takes.", ["Novel", "Novella", "Short Story", "Serial", "Screenplay", "Campaign"]),
      pick("audience", "Audience", "Who it's written for.", ["Adult", "New Adult", "Young Adult", "Middle Grade", "Children's"]),
      f("targetLength", "Target Length", "number", "A planning number, in words."),
      pick("structure", "Structure", "The structure whose turning points seed this story's plot points.", ["Three-Act", "Freytag", "Hero's Journey", "Seven-Point", "Kishotenketsu", "Custom", "None"], CORE),
      group("customSlots", "Custom Slots", "Your own structure's turning points, one per row, in order.", [
        text("slot", "Slot", "One turning point's name."),
      ], { core: true, showWhen: { fieldId: "structure", values: ["Custom"] } }),
      ref("threads", "Threads", "The plot threads this story carries; one thread can run through several stories.", ["Plot Thread"], { multi: true, core: true }),
      area("notes", "Notes", "Anything else about the story."),
      ...inPanel("premise", [
        area("why", "Why", "Why you're writing this story."),
        area("whatIf", "What If", "The idea, in a sentence or two."),
        text("logline", "Logline", "Who, what they want, and what's in the way, in one sentence."),
        area("themeStatement", "Theme Statement", "What the story argues."),
        ref("themes", "Themes", "The themes and motifs it works with; the Meaning tab lists them.", ["Theme / Motif"], { multi: true, core: true }),
        area("centralConflict", "Central Conflict", "The struggle the story turns on."),
        multiOther("conflictKinds", "Conflict Kinds", "What the conflict sets its people against.", ["vs Character", "vs Self", "vs Society", "vs Nature", "vs Technology", "vs the Supernatural", "vs Fate"]),
        area("stakes", "Stakes", "What's lost if they fail."),
        area("synopsis", "Synopsis", "A summary of the plot, for planning."),
      ]),
      ...inPanel("genre", [
        pickOther("genre", "Genre", "The story's main genre.", ["Fantasy", "Science Fiction", "Sci-Fantasy", "Mystery", "Thriller", "Romance", "Horror", "Historical", "Literary", "Adventure"]),
        text("subgenre", "Subgenre", "Narrower than the genre, in your words."),
        multiOther("tone", "Tone", "The feel you're aiming for.", ["Bleak", "Hopeful", "Comic", "Wry", "Tense", "Lyrical", "Grim", "Cozy"]),
        area("readerExpectations", "Reader Expectations", "What the genre promises its readers."),
        group("expectedMoments", "Expected Moments", "The scenes readers of the genre wait for, and where they land; one per row.", [
          text("moment", "Moment", "A scene readers of the genre wait for."),
          kref("momentScene", "Scene", "The scene where it lands.", "scene"),
        ]),
        group("comparableTitles", "Comparable Titles", "Works like this one, one per row.", [
          text("comparableTitle", "Title", "A book, film, or game like this story."),
          text("comparableWhy", "Why", "What it shares with this story."),
        ]),
      ]),
      ...inPanel("narration", [
        pick("pointOfView", "Point of View", "The point of view the story is told from.", ["First", "Second", "Third Limited", "Third Omniscient", "Third Objective", "Multiple"]),
        pick("tense", "Tense", "The tense it's told in.", ["Past", "Present", "Mixed"]),
        pick("narrativeDistance", "Narrative Distance", "How close the telling stays to a character's thoughts.", ["Close", "Medium", "Distant", "Varies"]),
        pick("reliability", "Reliability", "Whether the narration can be trusted.", ["Reliable", "Unreliable", "Varies"]),
        kref("narrators", "Narrators", "Whose eyes the story uses.", "cast", MANY),
        area("povPlan", "POV Plan", "How a story with several narrators divides between them."),
        area("voiceStyle", "Voice & Style", "Diction, rhythm, and the rules you're keeping."),
      ]),
      ...inPanel("setting", [
        text("timePeriod", "Time Period", "When it's set, as the story names it."),
        f("storyTimespan", "Story Timespan", "calendar-date-range", "When it happens, in your calendar."),
        ref("places", "Places", "Where it happens.", PLACES, MANY),
        ref("rulesInPlay", "Rules in Play", "The systems and powers that shape what can happen.", ["Magic / Tech System", "Religion / Belief System", "Faction / Government / Organization", "Culture / People"], MANY),
        area("arena", "Arena", "How the setting makes or limits trouble."),
        area("sensoryPalette", "Sensory Palette", "The sights, sounds, and smells to keep coming back to."),
      ]),
    ]),
    cast: schema("cast", "Name", "The character as this story knows them; filled from the entry you pick.", [
      ref("character", "Character", "The world entry this cast record is for: a character, or a god or other being.", BEINGS, { core: true, required: true }),
      pick("importance", "Importance", "How large a part they play in this story.", ["Main", "Secondary", "Minor"]),
      kref("firstAppears", "First Appears", "The scene they first turn up in.", "scene"),
      multiOther("role", "Role", "The parts they play in this story; there can be more than one.", ["Protagonist", "Antagonist", "Deuteragonist", "Tritagonist", "Confidant", "Mentor", "Love Interest", "Foil", "Antihero", "Supporting"]),
      ref("beliefSystems", "Belief Systems", "The faiths and philosophies they hold.", ["Religion / Belief System"], MANY),
      area("motive", "Motive", "Why they act; for an antagonist, the aims."),
      area("fear", "Fear", "Their vulnerabilities."),
      area("voice", "Voice", "How they sound: diction, rhythm, tells."),
      area("beliefsIdeals", "Beliefs & Ideals", "What they believe and stand for, in their own terms."),
      area("secrets", "Secrets", "What the reader learns late, or never.", { secret: true }),
      area("notes", "Notes", "Anything else about them in this story."),
    ]),
    arc: schema("arc", "Name", "A name for the arc, such as \\"Mira's fall\\".", [
      kref("cast", "Cast", "Whose arc this is.", "cast", CORE),
      pickOther("arcType", "Arc Type", "The shape of the change.", ["Positive Change", "Flat", "Negative Change", "Disillusionment", "Corruption", "Fall"]),
      pick("status", "Status", "Where the arc stands in your plan.", ["Idea", "Planned", "Underway", "Resolved", "Abandoned"]),
      area("want", "Want", "The external goal."),
      area("need", "Need", "The internal need."),
      area("lie", "Lie", "The misbelief standing in the need's way."),
      area("truth", "Truth", "What answers the lie."),
      area("startState", "Start State", "Who they are when the arc begins."),
      area("endState", "End State", "Who they are when it ends."),
      group("turningPoints", "Turning Points", "Where the arc turns, and how; one per row.", [
        kref("turnScene", "Scene", "The scene where it turns.", "scene"),
        text("turnShift", "Shift", "What shifts there."),
      ], CORE),
      area("notes", "Notes", "Anything else about the arc."),
    ]),
    relationship: schema("relationship", "Name", "A name for the pair, such as \\"Mira and Tomas\\".", [
      kref("castA", "Cast A", "One side of the relationship.", "cast", CORE),
      kref("castB", "Cast B", "The other side.", "cast", CORE),
      multiOther("kind", "Kind", "What kind of bond it is; there can be more than one.", ["Alliance", "Rivalry", "Romance", "Friendship", "Mentorship", "Family", "Enmity"]),
      area("startsAs", "Starts As", "Where the two stand at the start."),
      area("endsAs", "Ends As", "Where they stand at the end."),
      group("turningPoints", "Turning Points", "Where it turns, and how; one per row.", [
        kref("turnScene", "Scene", "The scene where it turns.", "scene"),
        text("turnShift", "Shift", "What shifts there."),
      ]),
      area("notes", "Notes", "Anything else about the two of them."),
    ]),
    plotPoint: schema("plotPoint", "Name", "The slot's name when a structure made this plot point, or your own.", [
      pickOther("slot", "Slot", "The turning point in the story's structure this plot point fills.", [], { core: true, optionsFrom: "structure" }),
      kref("deliveredIn", "Delivered In", "The scene where it happens.", "scene", CORE),
      ref("threads", "Threads", "The threads it moves.", ["Plot Thread"], MANY),
      area("description", "Description", "What happens."),
      area("notes", "Notes", "Anything else about this plot point."),
    ]),
    promise: schema("promise", "Label", "A short label for what's promised.", [
      pickOther("kind", "Kind", "What kind of promise it is.", ["Foreshadowing", "Chekhov's Gun", "Open Question", "Red Herring", "Prophecy", "Callback", "Running Gag"]),
      pick("status", "Status", "Where the promise stands.", ["Idea", "Planned", "Planted", "Paid Off", "Subverted", "Dropped"]),
      kref("setupIn", "Setup In", "The scenes that make the promise.", "scene", { multi: true, core: true }),
      kref("payoffIn", "Payoff In", "The scenes that keep it.", "scene", { multi: true, core: true }),
      ref("threads", "Threads", "The threads it belongs to.", ["Plot Thread"], MANY),
      area("promise", "Promise", "What the reader is owed."),
      area("notes", "Notes", "Anything else about the promise."),
    ]),
    part: schema("part", "Title", "The part's or act's title.", [
      area("purpose", "Purpose", "What this part does for the story."),
      area("summary", "Summary", "What happens in it."),
      area("notes", "Notes", "Anything else about the part."),
    ]),
    chapter: schema("chapter", "Title", "The chapter's title.", [
      kref("pov", "POV", "Whose point of view the chapter keeps; a scene with no POV of its own takes this one.", "cast", CORE),
      pick("status", "Status", "Where the chapter stands.", OUTLINE_STATUS),
      f("targetLength", "Target Length", "number", "A planning number, in words."),
      area("purpose", "Purpose", "What the chapter does for the story."),
      area("summary", "Summary", "What happens in it."),
      area("notes", "Notes", "Anything else about the chapter."),
    ]),
    scene: schema("scene", "Title", "The scene's title.", [
      kref("pov", "POV", "Whose point of view the scene keeps; left empty, it takes the chapter's.", "cast", CORE),
      ref("setting", "Setting", "Where the scene happens.", PLACES),
      text("goal", "Goal", "What the POV character wants here."),
      text("conflict", "Conflict", "What's in the way."),
      pickOther("outcome", "Outcome", "How the goal comes out.", ["Yes", "No", "Yes, but", "No, and"]),
      text("turn", "Turn", "What has changed by the end."),
      pick("status", "Status", "Where the scene stands.", OUTLINE_STATUS),
      f("when", "When", "calendar-date-range", "When it happens in story time, in your calendar.", CORE),
      kref("participants", "Participants", "Who from the cast is in it.", "cast", MANY),
      ref("walkOns", "Walk-ons", "Anyone in it without a cast record.", BEINGS, MANY),
      ref("threads", "Threads", "The threads it moves.", ["Plot Thread"], { multi: true, core: true }),
      ref("motifs", "Motifs", "The themes and motifs it carries.", ["Theme / Motif"], MANY),
      group("beats", "Beats", "The scene's beats, one per row, in order.", [
        text("beat", "Beat", "One beat."),
      ]),
      area("notes", "Notes", "What you're thinking about the scene; never the draft."),
    ]),
    research: schema("research", "Topic", "What the research is about.", [
      f("appliesTo", "Applies To", "entry-ref", "The world entries the research is about.", MANY),
      kref("usedIn", "Used In", "The scenes that need it.", "scene", MANY),
      group("sources", "Sources", "Where the research came from, one source per row.", [
        text("sourceTitle", "Title", "The source's title."),
        f("sourceLink", "Link", "url", "Where to find it."),
      ]),
      area("findings", "Findings", "What you found."),
      area("openQuestions", "Open Questions", "What you still need to find out."),
      area("notes", "Notes", "Anything else about the research."),
    ]),
  };
};

// Fabula's slice in a world. migrate() runs this last, so the templates the
// seeded schemas point at are final. Each kind gets an empty array where it
// has none, and a seeded schema where its schema is missing, malformed, or
// older than FABULA_SCHEMA_SEED, unless the schema is marked edited. A kind's
// schema that nobody has edited follows the seed (spec, section 3): until the
// template builder learns Fabula nothing can mark one, so a later seed
// replaces it whole, and the cut that teaches the builder adds the rule for
// giving an edited schema new core fields. A schema from a newer seed is left
// alone. Idempotent: a second load changes nothing.
const ensureFabulaSlice = (state) => {
  const isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
  if (!isObj(state.fabula)) state.fabula = {};
  const fab = state.fabula;
  FABULA_KINDS.forEach(k => { if (!Array.isArray(fab[k.slice])) fab[k.slice] = []; });
  if (!isObj(fab.schemas)) fab.schemas = {};
  let seeded = null;
  FABULA_KINDS.forEach(k => {
    const have = fab.schemas[k.kind];
    if (isObj(have) && Array.isArray(have.fields)
      && (have.edited === true || (typeof have.seed === "number" && have.seed >= FABULA_SCHEMA_SEED))) return;
    if (!seeded) seeded = fabulaSeedSchemas(Array.isArray(state.templates) ? state.templates : []);
    fab.schemas[k.kind] = seeded[k.kind];
  });
};'''

p27 = MODULES / "27_trunk.jsx"
t27 = p27.read_text(encoding="utf-8")
assert not t27.endswith("\n") and t27.endswith("\n  );\n}"), "27_trunk.jsx no longer ends the way this cut expects"
p27.write_text(t27 + "\n\n" + FABULA, encoding="utf-8")

# ---------------------------------------------------------------- 10: the call
edit(MODULES / "10_migrate.jsx", [
    (
        "  state.entries = scrubSelfRefs(state.entries, state.templates);\n\n  return state;\n};",
        "  state.entries = scrubSelfRefs(state.entries, state.templates);\n\n"
        "  // v1.7 r006: Fabula's slice and its seeded schemas (docs/fabula-spec.md,\n"
        "  // section 3). Last, so the templates the schemas point at are final.\n"
        "  ensureFabulaSlice(state);\n\n"
        "  return state;\n};",
    ),
])

print("v1.7 r006 applied: 10, 22, 27")
