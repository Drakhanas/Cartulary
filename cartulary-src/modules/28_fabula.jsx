
// ─── Fabula: the slice and its seeded schemas (v1.7 r006) ──────────────────────
// Fabula is the view for planning a story down to its scenes and their beats
// (docs/fabula-spec.md). Its records live in state.fabula, one array per
// kind (FABULA_KINDS, beside the node-source registry), and each world keeps
// one schema per kind in state.fabula.schemas, seeded here from the field
// tables Drak passed on 2026-10-25 (spec, section 5). Fabula's code grew at
// 27_trunk's tail until its view was in, and v1.7's r010 carved it into this
// file, which every Fabula cut edits until Fabula is finished and the file
// splits into a folder at its section headers (Drak, 2026-10-25). The seed's
// number rises when the seed changes, so a world's unedited schemas follow
// it: 2 at v1.7's r009, when an arc's Cast took more than one, 3 at r011,
// when a beat took What Happens and the fields the outline reads, a
// chapter's and a scene's Status and a scene's Beats, became core (Drak, at
// r009's pass, 2026-10-25, and r011's, 2026-10-26), and 4 since r017, when
// the core list caught up with what r007 through r015 read, a row's details
// included, each core field took the line the builder shows for what reads
// it, and the plot point's name help stopped saying a structure makes one
// (Drak, at r017's plan, 2026-10-26).
const FABULA_SCHEMA_SEED = 4;

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
// section 5.0), with reads, the line the builder shows for what reads it, and
// optionsLocked where a feature reads its options' names. Since v1.7's r017
// the builder lets a user relabel a core field and change its help line,
// Secret, and other options, and the seed keeps the rest (fabulaRefreshCore).
// panel puts a Story field in one of its four panels. A help line shows on
// its field's label, as Glossopoeia's do. Slot's options come from the
// story's structure, so its seed holds Other alone.
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
  const multiOther = (id, label, help, options, more = {}) => f(id, label, "multiselect", help, { options, otherTextField: true, ...more });
  const ref = (id, label, help, names, more = {}) => f(id, label, "entry-ref", help, { ...refsTo(names), ...more });
  const kref = (id, label, help, kind, more = {}) => f(id, label, "entry-ref", help, { ...kindRef(kind), ...more });
  const group = (id, label, help, subfields, more = {}) => f(id, label, "group", help, { subfields, ...more });
  const MANY = { multi: true };
  const core = (reads, more = {}) => ({ core: true, reads, ...more });
  const inPanel = (panel, fields) => fields.map(x => ({ ...x, panel }));
  const schema = (kind, nameLabel, nameHelp, fields) => ({ kind, seed: FABULA_SCHEMA_SEED, nameLabel, nameHelp, fields });
  const OUTLINE_STATUS = ["Idea", "Planned", "Outlined", "Drafted", "Revised", "Final", "Cut"];
  const PLACES = ["Location", "Cosmology / Plane", BODY_REF_LABEL, "Vehicle"];
  const BEINGS = ["Character", "Deity / Entity"];
  return {
    corpus: schema("corpus", "Name", "The corpus's name: a series title, or whatever ties these stories together.", [
      pickOther("kind", "Kind", "What holds these stories together.", ["Series", "Shared World", "Anthology", "Collection"], core("Fabula's index shows it.")),
      pick("status", "Status", "Where the corpus stands as a whole.", ["Planning", "Active", "Complete", "Shelved"], core("Fabula's index shows it.")),
      area("description", "Description", "What the corpus is, in a paragraph."),
      area("notes", "Notes", "Anything else about the corpus."),
    ]),
    story: schema("story", "Title", "The story's title, working or final.", [
      pick("status", "Status", "Where the story stands; Fabula's index shows it.", ["Idea", "Planning", "Drafting", "Revising", "Done", "Shelved"], core("Fabula's index shows it.")),
      pickOther("form", "Form", "What shape the finished work takes.", ["Novel", "Novella", "Short Story", "Serial", "Screenplay", "Campaign"]),
      pick("audience", "Audience", "Who it's written for.", ["Adult", "New Adult", "Young Adult", "Middle Grade", "Children's"]),
      f("targetLength", "Target Length", "number", "A planning number, in words."),
      pick("structure", "Structure", "The structure whose turning points seed this story's plot points.", ["Three-Act", "Freytag", "Hero's Journey", "Seven-Point", "Kishotenketsu", "Custom", "None"], core("Its turning points are the Plot tab's headings.", { optionsLocked: true })),
      group("customSlots", "Custom Slots", "Your own structure's turning points, one per row, in order.", [
        text("slot", "Slot", "One turning point's name."),
      ], core("A Custom structure's turning points, the Plot tab's headings.", { showWhen: { fieldId: "structure", values: ["Custom"] } })),
      ref("threads", "Threads", "The plot threads this story carries; one thread can run through several stories.", ["Plot Thread"], core("The Plot tab lists them.", MANY)),
      area("notes", "Notes", "Anything else about the story."),
      ...inPanel("premise", [
        area("why", "Why", "Why you're writing this story."),
        area("whatIf", "What If", "The idea, in a sentence or two."),
        text("logline", "Logline", "Who, what they want, and what's in the way, in one sentence."),
        area("themeStatement", "Theme Statement", "What the story argues.", core("The Meaning tab opens with it.")),
        ref("themes", "Themes", "The themes and motifs it works with; the Meaning tab lists them.", ["Theme / Motif"], core("The Meaning tab lists them.", MANY)),
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
      ref("character", "Character", "The world entry this cast record is for: a character, or a god or other being.", BEINGS, core("A cast record is this entry, in this story.", { required: true })),
      pick("importance", "Importance", "How large a part they play in this story.", ["Main", "Secondary", "Minor"], core("The People tab orders the cast by it.", { optionsLocked: true })),
      kref("firstAppears", "First Appears", "The scene they first turn up in.", "scene"),
      multiOther("role", "Role", "The parts they play in this story; there can be more than one.", ["Protagonist", "Antagonist", "Deuteragonist", "Tritagonist", "Confidant", "Mentor", "Love Interest", "Foil", "Antihero", "Supporting"], core("The People tab shows it.")),
      ref("beliefSystems", "Belief Systems", "The faiths and philosophies they hold.", ["Religion / Belief System"], MANY),
      area("motive", "Motive", "Why they act; for an antagonist, the aims."),
      area("fear", "Fear", "Their vulnerabilities."),
      area("voice", "Voice", "How they sound: diction, rhythm, tells."),
      area("beliefsIdeals", "Beliefs & Ideals", "What they believe and stand for, in their own terms."),
      area("secrets", "Secrets", "What the reader learns late, or never.", { secret: true }),
      area("notes", "Notes", "Anything else about them in this story."),
    ]),
    arc: schema("arc", "Name", "A name for the arc, such as \"Mira's fall\".", [
      kref("cast", "Cast", "Whose arc this is; there can be more than one.", "cast", core("The People tab names whose arc it is.", MANY)),
      pickOther("arcType", "Arc Type", "The shape of the change.", ["Positive Change", "Flat", "Negative Change", "Disillusionment", "Corruption", "Fall"], core("The People tab shows it.")),
      pick("status", "Status", "Where the arc stands in your plan.", ["Idea", "Planned", "Underway", "Resolved", "Abandoned"], core("The People tab shows it.")),
      area("want", "Want", "The external goal."),
      area("need", "Need", "The internal need."),
      area("lie", "Lie", "The misbelief standing in the need's way."),
      area("truth", "Truth", "What answers the lie."),
      area("startState", "Start State", "Who they are when the arc begins."),
      area("endState", "End State", "Who they are when it ends."),
      group("turningPoints", "Turning Points", "Where the arc turns, and how; one per row.", [
        kref("turnScene", "Scene", "The scene where it turns.", "scene"),
        text("turnShift", "Shift", "What shifts there."),
      ], core("The timeline will mark them.")),
      area("notes", "Notes", "Anything else about the arc."),
    ]),
    relationship: schema("relationship", "Name", "A name for the pair, such as \"Mira and Tomas\".", [
      kref("castA", "Cast A", "One side of the relationship.", "cast", core("The People tab names the pair from it.")),
      kref("castB", "Cast B", "The other side.", "cast", core("The People tab names the pair from it.")),
      multiOther("kind", "Kind", "What kind of bond it is; there can be more than one.", ["Alliance", "Rivalry", "Romance", "Friendship", "Mentorship", "Family", "Enmity"], core("The People tab shows it.")),
      area("startsAs", "Starts As", "Where the two stand at the start."),
      area("endsAs", "Ends As", "Where they stand at the end."),
      group("turningPoints", "Turning Points", "Where it turns, and how; one per row.", [
        kref("turnScene", "Scene", "The scene where it turns.", "scene"),
        text("turnShift", "Shift", "What shifts there."),
      ]),
      area("notes", "Notes", "Anything else about the two of them."),
    ]),
    plotPoint: schema("plotPoint", "Name", "Its name; one added under a slot without a title takes the slot's name.", [
      pickOther("slot", "Slot", "The turning point in the story's structure this plot point fills.", [], core("The Plot tab files the plot point under it.", { optionsFrom: "structure", optionsLocked: true })),
      kref("deliveredIn", "Delivered In", "The scene where it happens.", "scene", core("The Plot tab shows its scene.")),
      ref("threads", "Threads", "The threads it moves.", ["Plot Thread"], core("The Plot tab's marks and a thread's page read it.", MANY)),
      area("description", "Description", "What happens."),
      area("notes", "Notes", "Anything else about this plot point."),
    ]),
    promise: schema("promise", "Label", "A short label for what's promised.", [
      pickOther("kind", "Kind", "What kind of promise it is.", ["Foreshadowing", "Chekhov's Gun", "Open Question", "Red Herring", "Prophecy", "Callback", "Running Gag"], core("The Plot tab shows it.")),
      pick("status", "Status", "Where the promise stands.", ["Idea", "Planned", "Planted", "Paid Off", "Subverted", "Dropped"], core("The Plot tab shows it.")),
      kref("setupIn", "Setup In", "The scenes that make the promise.", "scene", core("The unpaid flag and the order of promises read it.", MANY)),
      kref("payoffIn", "Payoff In", "The scenes that keep it.", "scene", core("The unpaid flag reads it.", MANY)),
      ref("threads", "Threads", "The threads it belongs to.", ["Plot Thread"], core("The Plot tab's marks and a thread's page read it.", MANY)),
      area("promise", "Promise", "What the reader is owed."),
      area("notes", "Notes", "Anything else about the promise."),
    ]),
    part: schema("part", "Title", "The part's or act's title.", [
      area("purpose", "Purpose", "What this part does for the story."),
      area("summary", "Summary", "What happens in it."),
      area("notes", "Notes", "Anything else about the part."),
    ]),
    chapter: schema("chapter", "Title", "The chapter's title.", [
      kref("pov", "POV", "Whose point of view the chapter keeps; a scene with no POV of its own takes this one.", "cast", core("A scene with no POV of its own takes it.")),
      pick("status", "Status", "Where the chapter stands.", OUTLINE_STATUS, core("The outline shows it.")),
      f("targetLength", "Target Length", "number", "A planning number, in words."),
      area("purpose", "Purpose", "What the chapter does for the story."),
      area("summary", "Summary", "What happens in it."),
      area("notes", "Notes", "Anything else about the chapter."),
    ]),
    scene: schema("scene", "Title", "The scene's title.", [
      kref("pov", "POV", "Whose point of view the scene keeps; left empty, it takes the chapter's.", "cast", core("The outline shows it, and the timeline will lane scenes by it.")),
      ref("setting", "Setting", "Where the scene happens.", PLACES),
      text("goal", "Goal", "What the POV character wants here."),
      text("conflict", "Conflict", "What's in the way."),
      pickOther("outcome", "Outcome", "How the goal comes out.", ["Yes", "No", "Yes, but", "No, and"]),
      text("turn", "Turn", "What has changed by the end."),
      pick("status", "Status", "Where the scene stands.", OUTLINE_STATUS, core("The outline shows it.")),
      f("when", "When", "calendar-date-range", "When it happens in story time, in your calendar.", core("The timeline will place the scene by it.")),
      kref("participants", "Participants", "Who from the cast is in it.", "cast", MANY),
      ref("walkOns", "Walk-ons", "Anyone in it without a cast record.", BEINGS, MANY),
      ref("threads", "Threads", "The threads it moves.", ["Plot Thread"], core("The Plot tab's marks and a thread's page read it.", MANY)),
      ref("motifs", "Motifs", "The themes and motifs it carries.", ["Theme / Motif"], core("The Meaning tab's runs and a theme's page read it.", MANY)),
      group("beats", "Beats", "The scene's beats, one per row, in order.", [
        text("beat", "Beat", "The beat in a line."),
        area("whatHappens", "What Happens", "What needs to happen in the beat."),
      ], core("The outline lists and edits them.")),
      area("notes", "Notes", "What you're thinking about the scene; never the draft."),
    ]),
    research: schema("research", "Topic", "What the research is about.", [
      f("appliesTo", "Applies To", "entry-ref", "The world entries the research is about.", core("The Notes tab says what a note is about from it.", MANY)),
      kref("usedIn", "Used In", "The scenes that need it.", "scene", core("A scene's research list reads it.", MANY)),
      group("sources", "Sources", "Where the research came from, one source per row.", [
        text("sourceTitle", "Title", "The source's title."),
        f("sourceLink", "Link", "url", "Where to find it."),
      ]),
      area("findings", "Findings", "What you found."),
      area("openQuestions", "Open Questions", "What you still need to find out.", core("Any text in it flags the note open.")),
      area("notes", "Notes", "Anything else about the research."),
    ]),
  };
};

// Fabula's slice in a world. migrate() runs this last, so the templates the
// seeded schemas point at are final. Each kind gets an empty array where it
// has none, and a seeded schema where its schema is missing, malformed, or
// older than FABULA_SCHEMA_SEED, unless the schema is marked edited. A kind's
// schema that nobody has edited follows the seed (spec, section 3), so a
// later seed replaces it whole. Since v1.7's r017 the template builder marks
// a schema it changes edited, and each load brings an edited schema's core
// fields up to the seed (fabulaRefreshCore), leaving what the user owns. A
// schema from a newer seed is left alone. A reference the seed takes more
// than one of keeps what it held, as a list of one (seed 2: an arc's Cast),
// in an edited schema only where the field is core. Idempotent: a second
// load changes nothing.
const ensureFabulaSlice = (state) => {
  const isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
  if (!isObj(state.fabula)) state.fabula = {};
  const fab = state.fabula;
  FABULA_KINDS.forEach(k => { if (!Array.isArray(fab[k.slice])) fab[k.slice] = []; });
  if (!isObj(fab.schemas)) fab.schemas = {};
  let seeded = null;
  FABULA_KINDS.forEach(k => {
    const have = fab.schemas[k.kind];
    const kept = isObj(have) && Array.isArray(have.fields);
    const stamp = kept && typeof have.seed === "number" ? have.seed : 0;
    if (kept && stamp > FABULA_SCHEMA_SEED) return;
    const edited = kept && have.edited === true;
    if (kept && !edited && stamp === FABULA_SCHEMA_SEED) return;
    if (!seeded) seeded = fabulaSeedSchemas(Array.isArray(state.templates) ? state.templates : []);
    fab.schemas[k.kind] = edited ? fabulaRefreshCore(have, seeded[k.kind]) : seeded[k.kind];
    const lists = seeded[k.kind].fields.filter(fl => (!edited || fl.core) && fl.type === "entry-ref" && fl.multi).map(fl => fl.id);
    fab[k.slice].forEach(r => {
      if (!r || !isObj(r.fields)) return;
      lists.forEach(id => { if (typeof r.fields[id] === "string") r.fields[id] = r.fields[id] ? [r.fields[id]] : []; });
    });
  });
};

// ─── Fabula: the index and the corpus page (v1.7 r007) ─────────────────────────
// Fabula's first screen (docs/fabula-spec.md, section 4). The index lists
// every corpus with its stories in reading order, then the stories in no
// corpus, corpora and loose stories by name; a corpus opens on its page,
// where its reading order changes by drag or by the arrows. A story is a row
// until its page comes, in r008. App holds the state and the handlers, as it
// does for maps, and passes them down. What the node-source registry reads
// for Fabula's kinds lives here too: a kind's records as nodes, and each
// corpus's stories as its edges, so Concordance draws a corpus to its
// stories. Links inside a record's fields aren't edges yet.
const fabulaRegistryInstances = (state, k) =>
  ((state && state.fabula && Array.isArray(state.fabula[k.slice])) ? state.fabula[k.slice] : [])
    .filter(r => r && r.id)
    .map(r => ({ id: r.id, name: r.name || "(untitled)", kind: k.kind }));

const fabulaRegistryEdges = (state, k) => {
  const fab = (state && state.fabula) || {};
  const edges = [];
  if (k.kind === "corpus") {
    const storyIds = new Set((Array.isArray(fab.stories) ? fab.stories : []).map(st => st && st.id).filter(Boolean));
    (Array.isArray(fab.corpora) ? fab.corpora : []).forEach(c => {
      if (!c || !c.id || !Array.isArray(c.storyIds)) return;
      c.storyIds.forEach(id => { if (storyIds.has(id)) edges.push({ source: c.id, target: id, label: "includes", kind: "directed" }); });
    });
  }
  // v1.7 r009: the links that exist so far (spec, section 9), each labeled as
  // its field is: a story to its threads and themes, a cast record to its
  // character, an arc to its cast, a relationship to its two, since r011
  // a scene to its POV, participants, setting, and threads, and since r015
  // its motifs, since r013 a plot point to its scene and threads and a
  // promise to its setup and payoff scenes and its threads, and since r014 a
  // research note to the entries it applies to and the scenes it's used in.
  // Concordance drops an edge whose other end isn't drawn.
  const seeded = { story: ["threads", "themes"], cast: ["character"], arc: ["cast"], relationship: ["castA", "castB"], scene: ["pov", "participants", "setting", "threads", "motifs"], plotPoint: ["deliveredIn", "threads"], promise: ["setupIn", "payoffIn", "threads"], research: ["appliesTo", "usedIn"] }[k.kind] || [];
  // Since v1.7's r017 a link field of the user's own draws its edges too,
  // labeled as the field is (spec, section 9): any reference whose id no
  // seed uses, a corpus's included. A seeded link the user has deleted, or
  // made something other than a reference, draws none: its values stay in
  // the records unseen, as a template's deleted field's do.
  const fields = fabulaKindFields(state, k.kind);
  const seedIds = fabulaSeedIds(k.kind);
  const refIds = new Set(fields.filter(f => f && f.id && f.type === "entry-ref").map(f => f.id));
  const links = [...seeded.filter(id => refIds.has(id)), ...[...refIds].filter(id => !seedIds.has(id))];
  if (links.length === 0) return edges;
  (Array.isArray(fab[k.slice]) ? fab[k.slice] : []).forEach(r => {
    if (!r || !r.id) return;
    links.forEach(fid => {
      const f = fields.find(x => x.id === fid);
      const v = (r.fields || {})[fid];
      (Array.isArray(v) ? v : [v]).forEach(t => { if (typeof t === "string" && t) edges.push({ source: r.id, target: t, label: f ? f.label : fid, kind: "directed" }); });
    });
  });
  return edges;
};

// A kind's schema as the template EntryForm and EntryView take: the world's
// stored schema, or the seed when the world has none, its reference fields
// following their targets' names (fabulaLiveFields, v1.7 r008).
const fabulaTemplate = (state, kind, ctx) => {
  const k = FABULA_KINDS.find(x => x.kind === kind);
  const stored = state.fabula && state.fabula.schemas && state.fabula.schemas[kind];
  const s = stored && Array.isArray(stored.fields) ? stored : fabulaSeedSchemas(state.templates || [])[kind];
  let fields = fabulaLiveFields(s.fields, state.templates || []);
  // v1.7 r009: one cast record per character per story (spec, section 5.3),
  // so a cast record's Character leaves out the characters the story's other
  // cast records have (ctx: the story and the record).
  if (kind === "cast" && ctx && ctx.storyId) {
    const cast = (state.fabula && Array.isArray(state.fabula.cast)) ? state.fabula.cast : [];
    const taken = cast.filter(c => c && c.storyId === ctx.storyId && c.id !== ctx.recordId).map(c => (c.fields || {}).character).filter(v => typeof v === "string" && v);
    fields = fields.map(fl => fl.id === "character" ? { ...fl, excludeIds: taken } : fl);
  }
  // v1.7 r013: a scene's, a plot point's, or a promise's Threads lists the
  // story's own threads first, under a heading of their own (spec, section
  // 12, item 7), and a plot point's Slot offers its story's slots, with the
  // record's own slot kept when it's from another structure.
  if ((kind === "scene" || kind === "plotPoint" || kind === "promise") && ctx && ctx.storyId) {
    const story = fabulaStoryOf(state.fabula || {}, ctx.storyId);
    const own = fabulaStoryThreads(story);
    if (own.length > 0) fields = fields.map(fl => (fl.id === "threads" && fl.type === "entry-ref" ? { ...fl, firstIds: own, firstLabel: "This story's threads", restLabel: "Other threads" } : fl));
    // v1.7 r015: a scene's Motifs lists the story's own themes first, the
    // same way.
    const themes = kind === "scene" ? fabulaStoryThemes(story) : [];
    if (themes.length > 0) fields = fields.map(fl => (fl.id === "motifs" && fl.type === "entry-ref" ? { ...fl, firstIds: themes, firstLabel: "This story's themes", restLabel: "Other themes" } : fl));
    if (kind === "plotPoint") {
      const slots = fabulaStorySlots(story);
      const rec = fabulaArr(state.fabula || {}, "plotPoints").find(r => r && r.id === ctx.recordId);
      const mine = rec ? fabulaSlotOf(rec) : null;
      const options = mine && mine.name && !mine.typed && !slots.includes(mine.name) ? [...slots, mine.name] : slots;
      fields = fields.map(fl => (fl.optionsFrom === "structure" ? { ...fl, options } : fl));
    }
  }
  return { id: k.id, name: k.label, icon: "\u2042", color: k.color, kind: `fabula-${kind}`, fields, nameHelp: s.nameHelp };
};

// A story's cast and scenes, for its row.
const fabulaStoryCounts = (state, storyId) => {
  const fab = state.fabula || {};
  const count = (slice) => (Array.isArray(fab[slice]) ? fab[slice] : []).filter(r => r && r.storyId === storyId).length;
  return { cast: count("cast"), scenes: count("scenes") };
};

const fabulaCorpusDeleteMessage = (corpus) => {
  const n = Array.isArray(corpus.storyIds) ? corpus.storyIds.length : 0;
  const name = corpus.name || "this corpus";
  return n === 0
    ? `Delete the corpus "${name}"?`
    : `Delete the corpus "${name}"? Its ${n === 1 ? "story stays" : `${n} stories stay`} in Fabula, in no corpus.`;
};

function FabulaStoryLine({ state, story, onOpen }) {
  const counts = fabulaStoryCounts(state, story.id);
  const status = formatSelectDisplay((story.fields || {}).status);
  // v1.7 r008: a click on the line opens the story's page.
  const open = onOpen ? {
    role: "button",
    tabIndex: 0,
    title: "Open this story",
    onClick: () => onOpen(story.id),
    onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(story.id); } },
  } : {};
  return (
    <div className="fabula-story-line" {...open} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, cursor: onOpen ? "pointer" : undefined }}>
      <div style={{ fontSize: 15, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis" }}>{story.name || "(untitled story)"}</div>
      <div style={{ fontSize: 12, color: "var(--text-dim)", whiteSpace: "nowrap" }}>
        {status && <span>{status} · </span>}
        {counts.cast} cast · {counts.scenes} {counts.scenes === 1 ? "scene" : "scenes"}
        {story.updatedAt && <span> · updated {fmtDate(story.updatedAt)}</span>}
      </div>
    </div>
  );
}

// One story's row, with its title renamed in place. autoRename opens the
// title for typing, for a story just made, and onRenameEnd tells the parent
// the typing is over. leading comes before the title (the reading order's
// number), actions before Rename, trailing after it.
function FabulaStoryRow({ state, story, isLocked, autoRename, onRename, onRenameEnd, onOpen, leading, actions, trailing, rowProps }) {
  const [renaming, setRenaming] = useState(!!autoRename);
  const [text, setText] = useState(story.name || "");
  useEffect(() => { if (autoRename) { setText(story.name || ""); setRenaming(true); } }, [autoRename]);
  const commit = () => {
    const t = text.trim();
    if (t && t !== story.name) onRename(story.id, t);
    setRenaming(false);
    if (onRenameEnd) onRenameEnd();
  };
  const { style: rowStyle, ...rest } = rowProps || {};
  return (
    <div className="stemma-index-row" {...rest} style={{ padding: "10px 16px", background: "var(--surf)", display: "flex", alignItems: "center", gap: 12, ...(rowStyle || {}) }}>
      {leading}
      {renaming && !isLocked ? (
        <input
          className="input"
          autoFocus
          aria-label="Story title"
          value={text}
          onFocus={e => e.target.select()}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault(); commit(); }
            else if (e.key === "Escape") { e.preventDefault(); setText(story.name || ""); setRenaming(false); if (onRenameEnd) onRenameEnd(); }
          }}
          onBlur={commit}
          style={{ flex: 1 }}
        />
      ) : <FabulaStoryLine state={state} story={story} onOpen={onOpen} />}
      {!isLocked && !renaming && (
        <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
          {actions}
          <button className="btn" style={{ padding: "3px 8px", fontSize: 12 }} onClick={() => { setText(story.name || ""); setRenaming(true); }} title="Rename this story">Rename</button>
          {trailing}
        </div>
      )}
    </div>
  );
}

// v1.7 r016: the index ends with the world's plot threads and themes, two
// sections (FabulaTemplateSections) whose handlers App hands in as sections.
// Since r017 the Templates section comes after them (FabulaKindTemplates),
// and sections carries its Edit Template too (onEditKind).
function FabulaIndexView({ state, isLocked, onOpenCorpus, onCreateCorpus, onCreateStory, onRenameStory, onDeleteStory, onSetStoryCorpus, onOpenStory, sections }) {
  const [justMade, setJustMade] = useState(null);
  const fab = state.fabula || {};
  const byName = (a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
  const corpora = (Array.isArray(fab.corpora) ? fab.corpora : []).filter(c => c && c.id).slice().sort(byName);
  const stories = (Array.isArray(fab.stories) ? fab.stories : []).filter(st => st && st.id);
  const storyById = new Map(stories.map(st => [st.id, st]));
  const corpusOf = new Map();
  corpora.forEach(c => (c.storyIds || []).forEach(id => { if (storyById.has(id) && !corpusOf.has(id)) corpusOf.set(id, c.id); }));
  const loose = stories.filter(st => !corpusOf.has(st.id)).sort(byName);
  const newStory = () => { const id = onCreateStory(null); if (id) setJustMade(id); };
  const listBox = { display: "flex", flexDirection: "column", gap: 1, border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" };
  const smallBtn = { padding: "3px 8px", fontSize: 12 };
  const row = (st) => (
    <FabulaStoryRow
      key={st.id}
      state={state}
      story={st}
      isLocked={isLocked}
      autoRename={justMade === st.id}
      onRename={onRenameStory}
      onRenameEnd={() => setJustMade(null)}
      onOpen={onOpenStory}
      actions={
        <select className="input" value={corpusOf.get(st.id) || ""} onChange={e => onSetStoryCorpus(st.id, e.target.value || null)} title="The corpus this story belongs to" aria-label="Corpus" style={{ fontSize: 12, padding: "3px 28px 3px 8px", minWidth: 130, maxWidth: 220 }}>
          <option value="">No corpus</option>
          {corpora.map(c => <option key={c.id} value={c.id}>{c.name || "(untitled corpus)"}</option>)}
        </select>
      }
      trailing={
        <button className="btn" style={{ ...smallBtn, color: "var(--danger)", borderColor: "rgba(184,92,76,.35)" }} onClick={() => {
          if (confirm(fabulaStoryDeleteMessage(state, st))) onDeleteStory(st.id);
        }} title="Delete this story">Delete</button>
      }
    />
  );
  return (
    <div style={{ padding: "20px 24px", maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
        <div style={{ color: "var(--text-dim)", fontSize: 14, lineHeight: 1.5, maxWidth: 560 }}>
          The stories set in this world, planned down to their scenes and beats; the writing itself happens somewhere else. A corpus gathers stories, a series or a shared world, and a story belongs to one corpus at most.
        </div>
        {!isLocked && (
          <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
            <button className="btn" onClick={onCreateCorpus}>+ New Corpus</button>
            <button className="btn btn-accent" onClick={newStory}>+ New Story</button>
          </div>
        )}
      </div>

      {corpora.length === 0 && stories.length === 0 && (
        <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-dim)", fontStyle: "italic", border: "1px dashed var(--border)", borderRadius: 6, background: "var(--surf)" }}>
          No stories yet.{!isLocked && " Click + New Story or + New Corpus above to begin."}
        </div>
      )}

      {corpora.map(c => {
        const its = (c.storyIds || []).filter(id => corpusOf.get(id) === c.id).map(id => storyById.get(id));
        const kind = formatSelectDisplay((c.fields || {}).kind);
        const status = formatSelectDisplay((c.fields || {}).status);
        return (
          <div key={c.id} style={{ marginBottom: 20 }}>
            <div
              className="stemma-index-row"
              style={{ padding: "12px 16px", background: "var(--surf)", cursor: "pointer", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, border: "1px solid var(--border)", borderRadius: 4, marginBottom: 6 }}
              onClick={() => onOpenCorpus(c.id)}
              title="Open this corpus"
            >
              <div style={{ fontSize: 16, fontWeight: 500, display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ color: "#d9a066", fontSize: 13 }}>{"\u2042"}</span>
                <span>{c.name || "(untitled corpus)"}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", whiteSpace: "nowrap" }}>
                {[kind, status].filter(Boolean).join(" · ")}{(kind || status) ? " · " : ""}
                {its.length} {its.length === 1 ? "story" : "stories"}
                {c.updatedAt && <span> · updated {fmtDate(c.updatedAt)}</span>}
              </div>
            </div>
            {its.length > 0
              ? <div style={{ ...listBox, marginLeft: 18 }}>{its.map(row)}</div>
              : <div style={{ marginLeft: 18, fontSize: 13, color: "var(--text-dim)", fontStyle: "italic" }}>No stories in this corpus yet.</div>}
          </div>
        );
      })}

      {loose.length > 0 && (
        <div style={{ marginTop: corpora.length > 0 ? 28 : 0 }}>
          {corpora.length > 0 && <div className="field-label" style={{ marginBottom: 8 }}><span>Stories in no corpus</span></div>}
          <div style={listBox}>{loose.map(row)}</div>
        </div>
      )}

      {sections && <FabulaTemplateSections state={state} isLocked={isLocked} sections={sections} />}
      {sections && sections.onEditKind && <FabulaKindTemplates state={state} isLocked={isLocked} focus={sections.focus} onFocused={sections.onFocused} onEditKind={sections.onEditKind} />}
    </div>
  );
}

// A corpus's stories in reading order, on its page: drag a row to a new
// place, or move it with the arrows. A story made here starts at the end.
function FabulaReadingOrder({ state, corpus, isLocked, onMoveStory, onCreateStory, onRenameStory, onOpenStory }) {
  // The dragged story, in a ref as well as in state: a drop can arrive before
  // React has drawn the drag's start.
  const dragRef = useRef(null);
  const [dragId, setDragId] = useState(null);
  const [justMade, setJustMade] = useState(null);
  const fab = state.fabula || {};
  const storyById = new Map((Array.isArray(fab.stories) ? fab.stories : []).filter(st => st && st.id).map(st => [st.id, st]));
  const ids = (corpus.storyIds || []).filter(id => storyById.has(id));
  const arrow = { padding: "3px 8px", fontSize: 12, minWidth: 30 };
  return (
    <div style={{ margin: "4px 0 20px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
        <div className="field-label"><span>Reading order</span></div>
        {!isLocked && <button className="btn" style={{ padding: "3px 10px", fontSize: 12 }} onClick={() => { const id = onCreateStory(corpus.id); if (id) setJustMade(id); }}>+ New Story</button>}
      </div>
      {ids.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--text-dim)", fontStyle: "italic" }}>
          No stories in this corpus yet.{!isLocked && " Add one here, or pick this corpus in a story's Corpus dropdown on Fabula's index."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 1, border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
          {ids.map((id, i) => (
            <FabulaStoryRow
              key={id}
              state={state}
              story={storyById.get(id)}
              isLocked={isLocked}
              autoRename={justMade === id}
              onRename={onRenameStory}
              onRenameEnd={() => setJustMade(null)}
              onOpen={onOpenStory}
              rowProps={isLocked ? null : {
                draggable: true,
                onDragStart: (e) => { dragRef.current = id; setDragId(id); e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", id); } catch (_) {} },
                onDragOver: (e) => { const d = dragRef.current; if (d && d !== id) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; } },
                onDrop: (e) => { e.preventDefault(); const d = dragRef.current; if (d && d !== id) onMoveStory(corpus.id, d, i); dragRef.current = null; setDragId(null); },
                onDragEnd: () => { dragRef.current = null; setDragId(null); },
                style: { cursor: "grab", opacity: dragId === id ? 0.5 : 1 },
              }}
              leading={<span style={{ width: 22, flexShrink: 0, color: "var(--text-dim)", fontSize: 13, textAlign: "right" }}>{i + 1}.</span>}
              actions={<>
                <button className="btn" style={arrow} disabled={i === 0} onClick={() => onMoveStory(corpus.id, id, i - 1)} title="Earlier in the reading order" aria-label="Move earlier">{"\u2191"}</button>
                <button className="btn" style={arrow} disabled={i === ids.length - 1} onClick={() => onMoveStory(corpus.id, id, i + 1)} title="Later in the reading order" aria-label="Move later">{"\u2193"}</button>
              </>}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Fabula: the story page (v1.7 r008) ────────────────────────────────────────
// A story's page (docs/fabula-spec.md, section 4): its section tabs under its
// title and, on the Story tab, the Story record, its own fields first and then
// its four panels, each folding under its heading. The folds belong to the
// browser, one set for every story, so App keeps them with its other display
// settings (Drak, 2026-10-25). Every tab shows; one that isn't built yet is
// greyed out until the cut that builds it turns it on.
const FABULA_STORY_PANELS = [
  { id: "premise", label: "Premise" },
  { id: "genre", label: "Genre" },
  { id: "narration", label: "Narration" },
  { id: "setting", label: "Setting" },
];

// holds is what a tab will hold, which an unbuilt tab's tooltip says.
const FABULA_STORY_TABS = [
  { id: "story", label: "Story", built: true, holds: "the story's own fields and its four panels" },
  { id: "people", label: "People", built: true, holds: "the story's cast, their arcs, and their relationships" },
  { id: "plot", label: "Plot", built: true, holds: "the story's plot threads, plot points, and promises and payoffs" },
  { id: "outline", label: "Outline", built: true, holds: "the story's parts, chapters, and scenes, as one ordered tree" },
  { id: "meaning", label: "Meaning", built: true, holds: "the themes and motifs the Premise panel lists" },
  { id: "notes", label: "Notes", built: true, holds: "the story's research notes" },
  { id: "timeline", label: "Timeline", built: false, holds: "the story's own timeline, kept apart from Chronometric" },
];

// A schema's fields for a form, worked out each time one opens (Drak,
// 2026-10-25). A reference field to world templates follows their names:
// its targets are its stored ids that still exist plus whatever templates
// its names find now, the rule r002 gave templates, so a template deleted
// and brought back is found again, and nothing is written back to the
// schema. A field that finds none of its targets gets refMissing (its
// names) and refRestorable (the missing built-ins), for the picker to say so
// and offer the restore. A link to Fabula's own records keeps its kind's
// sentinel and gets the line its picker shows while the story has none of
// the kind (emptyNote). Since v1.7's r012 a link to acts, chapters, or
// scenes keeps the order its records come in (keepOrder), the outline's
// (fabulaStoryNodes), where other pickers sort by name. Since r016 a name of
// Plot Thread's or Theme / Motif's finds the template flagged for it, and
// finds by name only where no template carries the flag.
const fabulaLiveFields = (fields, templates) => {
  const { byName } = refTargetIndex(templates, false);
  const live = new Set([...templates.map(t => t && t.id).filter(Boolean), ...NODE_SOURCE_REGISTRY.map(src => src.id)]);
  const builtinHere = new Set(templates.filter(t => t && t.origin === TEMPLATE_ORIGIN.BUILTIN).map(t => t.name));
  const walk = (list) => (Array.isArray(list) ? list : []).map(fl => {
    if (!fl || typeof fl !== "object") return fl;
    let out = fl;
    if (fl.type === "entry-ref" && fl.fabulaScope) {
      const k = FABULA_KINDS.find(x => (fl.refTemplatesId || []).includes(x.id));
      if (k) out = { ...fl, emptyNote: `This story has no ${k.plural} yet.`, ...(FABULA_OUTLINE_KINDS.includes(k.kind) ? { keepOrder: true } : {}) };
    } else if (fl.type === "entry-ref" && Array.isArray(fl.refTemplates) && fl.refTemplates.length > 0) {
      const kept = (Array.isArray(fl.refTemplatesId) ? fl.refTemplatesId : []).filter(id => live.has(id));
      const named = fl.refTemplates.map(n => { const role = fabulaRoleOfName(n); const own = role ? fabulaRoleTemplate(templates, role) : null; return own ? own.id : byName[n]; }).filter(Boolean);
      const ids = [...new Set([...kept, ...named])];
      out = ids.length > 0
        ? { ...fl, refTemplatesId: ids }
        : { ...fl, refTemplatesId: [], refMissing: [...fl.refTemplates], refRestorable: fl.refTemplates.filter(n => BUILTIN_TEMPLATES.some(b => b.name === n) && !builtinHere.has(n)) };
    }
    if (Array.isArray(fl.subfields)) out = { ...out, subfields: walk(fl.subfields) };
    return out;
  });
  return walk(fields);
};

// The registered records a story's pickers may offer: everything that isn't
// Fabula's, and Fabula's own records from this story alone (spec, section 3).
// Since v1.7's r012 its pages' references read from it too, and its acts,
// chapters, and scenes come last, in the outline's order, each named with
// where it sits ("II.4.A The gate"), so a reference says where it points and
// a picker that keeps this order lists them as the outline does. Each keeps
// its position and its own name apart too (place), for a chip to draw the
// position quieter than the name, as the outline draws its numbers, so a
// scene at the story's own level doesn't read as "A Prologue".
const fabulaStoryNodes = (state, storyId) => {
  const fab = state.fabula || {};
  const kindIds = new Set(FABULA_KINDS.map(k => k.id));
  const inStory = new Set();
  FABULA_KINDS.forEach(k => (Array.isArray(fab[k.slice]) ? fab[k.slice] : []).forEach(r => { if (r && r.id && r.storyId === storyId) inStory.add(r.id); }));
  const nodes = getRegisteredGraphNodes(state).filter(n => !kindIds.has(n.templateId) || inStory.has(n.id));
  const places = fabulaOutlinePlaces(state, storyId);
  const placed = nodes.filter(n => places.has(n.id))
    .sort((a, b) => places.get(a.id).index - places.get(b.id).index)
    .map(n => { const path = places.get(n.id).path; return { ...n, name: `${path} ${n.name}`, place: { path, name: n.name } }; });
  return [...nodes.filter(n => !places.has(n.id)), ...placed];
};

// A built tab switches the page (v1.7 r009); while the Story record is in
// edit there's no onSelect, and the other tabs wait for Save or Cancel.
function FabulaStoryTabs({ active, onSelect }) {
  return (
    <div role="tablist" aria-label="Story sections" style={{ display: "flex", flexWrap: "wrap", borderBottom: "1px solid var(--border)", margin: "0 0 22px" }}>
      {FABULA_STORY_TABS.map(t => {
        const on = t.id === active;
        const usable = t.built && (on || !!onSelect);
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={on}
            aria-disabled={usable ? undefined : "true"}
            title={!t.built ? `Not built yet: ${t.holds}.` : !usable ? "Save or cancel the Story's edit first." : undefined}
            onClick={usable && !on ? () => onSelect(t.id) : undefined}
            style={{ padding: "8px 14px", border: "none", background: "transparent", fontFamily: "inherit", fontSize: 13, color: on ? "var(--text)" : "var(--text-dim)", fontWeight: on ? 600 : 400, borderBottom: on ? "2px solid var(--accent)" : "2px solid transparent", marginBottom: -1, cursor: usable && !on ? "pointer" : "default", opacity: usable ? 1 : 0.45 }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// The page itself: the Story record in view or, with a draft, in edit, and
// since v1.7's r009 the People tab, r011 the Outline tab, and r013 the Plot
// tab.
function FabulaStoryPage({ state, story, draft, onDraftChange, tab, onSelectTab, onOpenRecord, onNewRecord, isLocked, folds, onToggleFold, outlineFolds, onToggleOutlineFold, onUpdateFabula, onCreateThread, onCreateTheme, onRestoreTemplate, showSecrets, allTags, dirHandle, flash, onOpenEntry, onSelectTag, onUpdateViewPrefs }) {
  const template = fabulaTemplate(state, "story");
  const active = draft ? "story" : (tab || "story");
  const tabs = <FabulaStoryTabs active={active} onSelect={draft ? null : onSelectTab} />;
  // A tab other than Story: the story's title over the tabs and the tab's
  // own content, People's lists (v1.7 r009), the Outline (r011), Plot
  // (r013), Notes (r014), or Meaning (r015).
  const tabPage = (content) => (
    <EntryView
      entry={story}
      template={{ ...template, fields: [] }}
      templates={state.templates}
      entries={state.entries}
      onOpenEntry={onOpenEntry}
      onSelectTag={onSelectTag}
      showSecrets={showSecrets}
      imageFolder={state.world.imageFolder}
      dirHandle={dirHandle}
      calendar={getCalendar(state, null)}
      state={state}
      onUpdateViewPrefs={onUpdateViewPrefs}
      canvasSlot={<>{tabs}{content}</>}
    />
  );
  if (!draft && active === "people") {
    return tabPage(<FabulaPeopleTab state={state} story={story} isLocked={isLocked} onOpenRecord={onOpenRecord} onNewRecord={onNewRecord} />);
  }
  if (!draft && active === "outline") {
    return tabPage(<FabulaOutlineTab state={state} story={story} isLocked={isLocked} folds={outlineFolds} onToggleFold={onToggleOutlineFold} onOpenRecord={onOpenRecord} onUpdateFabula={onUpdateFabula} />);
  }
  if (!draft && active === "plot") {
    return tabPage(<FabulaPlotTab state={state} story={story} isLocked={isLocked} onOpenRecord={onOpenRecord} onNewRecord={onNewRecord} onOpenEntry={onOpenEntry} onUpdateFabula={onUpdateFabula} onCreateThread={onCreateThread} onRestoreTemplate={isLocked ? undefined : onRestoreTemplate} />);
  }
  if (!draft && active === "meaning") {
    return tabPage(<FabulaMeaningTab state={state} story={story} isLocked={isLocked} showSecrets={showSecrets} onOpenEntry={onOpenEntry} onUpdateFabula={onUpdateFabula} onCreateTheme={onCreateTheme} onRestoreTemplate={isLocked ? undefined : onRestoreTemplate} />);
  }
  if (!draft && active === "notes") {
    return tabPage(<FabulaNotesTab state={state} story={story} isLocked={isLocked} onOpenRecord={onOpenRecord} onNewRecord={onNewRecord} />);
  }
  const panelProps = { panels: FABULA_STORY_PANELS, foldedPanels: folds || {}, onTogglePanel: onToggleFold };
  if (draft) {
    return (
      <EntryForm
        draft={draft}
        template={template}
        entries={state.entries}
        templates={state.templates}
        bodies={state.celestialBodies}
        registeredNodes={fabulaStoryNodes(state, story.id)}
        onChange={onDraftChange}
        showSecrets={showSecrets}
        imageFolder={state.world.imageFolder}
        allTags={allTags}
        dirHandle={dirHandle}
        calendar={getCalendar(state, null)}
        primaryCalendar={state.world.calendar}
        additionalCalendars={[]}
        selfEntryId={draft.id}
        flash={flash}
        hideTags
        canvasSlot={tabs}
        onRestoreTemplate={isLocked ? undefined : onRestoreTemplate}
        {...panelProps}
      />
    );
  }
  return (
    <EntryView
      entry={story}
      template={template}
      templates={state.templates}
      entries={state.entries}
      onOpenEntry={onOpenEntry}
      onSelectTag={onSelectTag}
      showSecrets={showSecrets}
      imageFolder={state.world.imageFolder}
      dirHandle={dirHandle}
      calendar={getCalendar(state, null)}
      state={state}
      onUpdateViewPrefs={onUpdateViewPrefs}
      registeredNodes={fabulaStoryNodes(state, story.id)}
      canvasSlot={tabs}
      {...panelProps}
    />
  );
}

// ─── Fabula: People (v1.7 r009) ────────────────────────────────────────────────
// People (docs/fabula-spec.md, section 4, Drak's calls of 2026-10-25): the
// story's cast, arcs, and relationships, each opening on a page of its own
// over the story's page, a reference to one opening it as a reference to an
// entry opens the entry. A delete never takes another record with it: it
// counts what points at the record and clears those references. A deleted
// world entry is cleaned out of Fabula the way it's cleaned out of entries,
// and a cast record whose character it was stays, marked (spec, section 9).

// A kind's record in a sentence, one or many; add names its + New button.
const FABULA_NOUNS = {
  corpus: { one: "corpus", many: "corpora" },
  story: { one: "story", many: "stories" },
  cast: { one: "cast record", many: "cast records", add: "Cast" },
  arc: { one: "arc", many: "arcs", add: "Arc" },
  relationship: { one: "relationship", many: "relationships", add: "Relationship" },
  plotPoint: { one: "plot point", many: "plot points" },
  promise: { one: "promise and payoff", many: "promises and payoffs", add: "Promise" },
  part: { one: "part", many: "parts" },
  chapter: { one: "chapter", many: "chapters" },
  scene: { one: "scene", many: "scenes" },
  research: { one: "research note", many: "research notes", add: "Note" },
};

// The kinds whose records have pages of their own, so a reference opens one:
// People's since v1.7's r009, the Outline's since r011, since r013 the plot
// points and promises the Plot tab lists, and since r014 the research notes
// the Notes tab lists.
const FABULA_PAGE_KINDS = ["cast", "arc", "relationship", "part", "chapter", "scene", "plotPoint", "promise", "research"];

// A cast list's order: by Importance, then by name.
const FABULA_IMPORTANCE = ["Main", "Secondary", "Minor"];

const fabulaCount = (kind, n) => `${n} ${n === 1 ? FABULA_NOUNS[kind].one : FABULA_NOUNS[kind].many}`;

const fabulaJoin = (parts) => parts.length <= 1 ? (parts[0] || "")
  : parts.length === 2 ? `${parts[0]} and ${parts[1]}`
  : `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;

// A kind's fields as stored, or the seed's: what the cleaning and the
// counting walk. Neither needs the targets worked out.
const fabulaKindFields = (state, kind) => {
  const stored = state && state.fabula && state.fabula.schemas && state.fabula.schemas[kind];
  if (stored && Array.isArray(stored.fields)) return stored.fields;
  const seeded = fabulaSeedSchemas((state && state.templates) || [])[kind];
  return seeded ? seeded.fields : [];
};

// Fabula with every reference to deletedIds cleared, through the same walk
// scrubEntryRefs gives entries (groups and grids included). names maps a
// deleted entry's id to its name, for a cast record whose character it was:
// that record stays, its Character cleared and marked characterDeleted.
const scrubFabulaRefs = (state, deletedIds, names) => {
  const fab = state && state.fabula;
  if (!fab || !deletedIds || deletedIds.size === 0) return fab;
  const next = { ...fab };
  FABULA_KINDS.forEach(k => {
    const arr = Array.isArray(fab[k.slice]) ? fab[k.slice] : null;
    if (!arr || arr.length === 0) return;
    const tpl = { id: k.id, fields: fabulaKindFields(state, k.kind) };
    const marked = k.kind !== "cast" ? arr : arr.map(r => {
      const c = r && r.fields && r.fields.character;
      return typeof c === "string" && deletedIds.has(c) ? { ...r, characterDeleted: { name: (names && names.get(c)) || "" } } : r;
    });
    next[k.slice] = scrubEntryRefs(marked.map(r => ({ ...r, templateId: k.id })), [tpl], deletedIds).map(({ templateId, ...r }) => r);
  });
  return next;
};

// How many of each kind's records point at id: [[kind, n]], for a delete's
// confirmation.
const fabulaInboundCounts = (state, id) => {
  const fab = (state && state.fabula) || {};
  return FABULA_KINDS.map(k => {
    const arr = (Array.isArray(fab[k.slice]) ? fab[k.slice] : []).filter(r => r && r.id !== id);
    const tpl = { id: k.id, fields: fabulaKindFields(state, k.kind) };
    return [k.kind, countInboundEntryRefs(arr.map(r => ({ ...r, templateId: k.id })), [tpl], id)];
  }).filter(([, n]) => n > 0);
};

const fabulaRecordDeleteMessage = (state, kind, rec) => {
  const head = `Delete the ${FABULA_NOUNS[kind].one} "${rec.name || "untitled"}"?`;
  const counts = fabulaInboundCounts(state, rec.id);
  if (counts.length === 0) return head;
  const total = counts.reduce((a, [, n]) => a + n, 0);
  const said = fabulaJoin(counts.map(([kk, n]) => kk === "story" ? "the story" : fabulaCount(kk, n)));
  return `${head} ${said.charAt(0).toUpperCase()}${said.slice(1)} ${total === 1 ? "points" : "point"} at it; ${total === 1 ? "it stays" : "they stay"}, without it.`;
};

// What deleting a story takes with it: its own records, by kind.
const fabulaStoryDeleteMessage = (state, story) => {
  const fab = (state && state.fabula) || {};
  const counts = FABULA_KINDS.filter(k => k.kind !== "corpus" && k.kind !== "story")
    .map(k => [k.kind, (Array.isArray(fab[k.slice]) ? fab[k.slice] : []).filter(r => r && r.storyId === story.id).length])
    .filter(([, n]) => n > 0);
  const head = `Delete the story "${story.name || "untitled story"}"?`;
  if (counts.length === 0) return head;
  const one = counts.length === 1 && counts[0][1] === 1;
  return `${head} Its ${fabulaJoin(counts.map(([kk, n]) => fabulaCount(kk, n)))} ${one ? "goes" : "go"} with it.`;
};

// Fabula's slices below the story level without one story's records.
const fabulaDropStoryRecords = (fab, storyId) => Object.fromEntries(
  FABULA_KINDS.filter(k => k.kind !== "corpus" && k.kind !== "story")
    .map(k => [k.slice, (Array.isArray(fab[k.slice]) ? fab[k.slice] : []).filter(r => !r || r.storyId !== storyId)])
);

// A record with a page of its own, found by id: { kind, record } or null.
const fabulaFindRecord = (state, id) => {
  const fab = (state && state.fabula) || {};
  for (const kind of FABULA_PAGE_KINDS) {
    const k = FABULA_KINDS.find(x => x.kind === kind);
    const record = (Array.isArray(fab[k.slice]) ? fab[k.slice] : []).find(r => r && r.id === id);
    if (record) return { kind, record };
  }
  return null;
};

// Whether a reference to a record of this source opens it (resolveRefTarget).
const fabulaRecordOpens = (sourceId) => FABULA_KINDS.some(k => k.id === sourceId && FABULA_PAGE_KINDS.includes(k.kind));

// A cast record's name follows the character picked while it's still blank or
// still the last character's name; a name of the user's own stays.
const fabulaCastNameFill = (state, prev, next) => {
  const was = (prev.fields || {}).character, now = (next.fields || {}).character;
  if (!now || now === was) return next;
  const nameOf = (id) => { const e = (state.entries || []).find(x => x.id === id); return e ? e.name : ""; };
  const prevName = (prev.name || "").trim();
  if (prevName && prevName !== nameOf(was)) return next;
  return { ...next, name: nameOf(now) || next.name };
};

// The People tab: the story's cast, by importance and then name, its arcs,
// and its relationships, each list with its + New. A row's details sit to
// the right of its name and drop under it when the two don't fit, each dot
// kept with the detail before it.
function FabulaPeopleTab({ state, story, isLocked, onOpenRecord, onNewRecord }) {
  const fab = state.fabula || {};
  const mine = (slice) => (Array.isArray(fab[slice]) ? fab[slice] : []).filter(r => r && r.id && r.storyId === story.id);
  const byName = (a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
  const castById = new Map(mine("cast").map(c => [c.id, c]));
  const castName = (id) => { const c = typeof id === "string" && castById.get(id); return c ? (c.name || "(unnamed)") : null; };
  const rank = (c) => { const i = FABULA_IMPORTANCE.indexOf(formatSelectDisplay((c.fields || {}).importance)); return i === -1 ? FABULA_IMPORTANCE.length : i; };
  const many = (v) => (Array.isArray(v) ? v : []).filter(Boolean).join(", ");
  const cast = mine("cast").slice().sort((a, b) => rank(a) - rank(b) || byName(a, b));
  const arcs = mine("arcs").slice().sort(byName);
  const rels = mine("relationships").slice().sort(byName);
  const meta = {
    cast: (c) => [formatSelectDisplay((c.fields || {}).importance), many((c.fields || {}).role), c.characterDeleted ? "character deleted" : null],
    arc: (a) => {
      const f = a.fields || {};
      const names = (Array.isArray(f.cast) ? f.cast : []).map(castName).filter(Boolean);
      return [names.length ? fabulaJoin(names) : "no cast", formatSelectDisplay(f.arcType), formatSelectDisplay(f.status)];
    },
    relationship: (r) => {
      const f = r.fields || {};
      const a = castName(f.castA), b = castName(f.castB);
      return [a || b ? `${a || "?"} and ${b || "?"}` : "no cast", many(f.kind)];
    },
  };
  const section = (title, kind, items, empty) => (
    <div className="fabula-people-section" data-kind={kind} style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
        <div className="field-label"><span>{title}</span></div>
        {!isLocked && <button className="btn" style={{ padding: "3px 10px", fontSize: 12 }} onClick={() => onNewRecord(kind)}>+ New {FABULA_NOUNS[kind].add}</button>}
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--text-dim)", fontStyle: "italic" }}>{empty}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 1, border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
          {items.map(r => (
            <div
              key={r.id}
              className="stemma-index-row fabula-record-row"
              role="button"
              tabIndex={0}
              title={`Open this ${FABULA_NOUNS[kind].one}`}
              onClick={() => onOpenRecord(kind, r.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenRecord(kind, r.id); } }}
              style={{ padding: "10px 16px", background: "var(--surf)", display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 12, rowGap: 2, cursor: "pointer" }}
            >
              <div style={{ fontSize: 15, fontWeight: 500, minWidth: 0, overflowWrap: "anywhere" }}>{r.name || "(untitled)"}</div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginLeft: "auto", minWidth: 0, textAlign: "right", overflowWrap: "anywhere" }}>{meta[kind](r).filter(Boolean).join("\u00a0\u00b7 ")}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
  return (
    <div className="fabula-people">
      {section("Cast", "cast", cast, "No cast yet.")}
      {section("Arcs", "arc", arcs, "No arcs yet.")}
      {section("Relationships", "relationship", rels, "No relationships yet.")}
    </div>
  );
}

// A record's page, over its story's (a cast record's, an arc's, or a
// relationship's since v1.7's r009; an act's, a chapter's, or a scene's
// since r011; a plot point's or a promise's since r013): its fields in view
// or, with a draft, in edit, its pickers offering the story's own records.
// A cast record whose character was deleted says so. Since r012 an act's, a
// chapter's, or a scene's page says where it sits, between its kind and its
// date (SCENE · II.4.A · UPDATED), and a page's references read as its
// pickers offer them. Since r014 a scene's page lists, under its fields, the
// research notes used in it.
function FabulaRecordPage({ state, kind, record, draft, onDraftChange, storyId, isLocked, onRestoreTemplate, showSecrets, allTags, dirHandle, flash, onOpenEntry, onSelectTag, onUpdateViewPrefs }) {
  const template = fabulaTemplate(state, kind, { storyId, recordId: record.id });
  const gone = kind === "cast" ? record.characterDeleted : null;
  const nodes = fabulaStoryNodes(state, storyId);
  const place = FABULA_OUTLINE_KINDS.includes(kind) ? fabulaOutlinePlaces(state, storyId).get(record.id) : null;
  // v1.7 r011: a scene with no POV of its own takes its chapter's, and says so.
  const inherited = kind === "scene" ? fabulaInheritedPov(state, storyId, draft || record) : null;
  const povNote = inherited ? (
    <div className="fabula-pov-inherited" style={{ margin: "0 0 18px", padding: "8px 14px", border: "1px solid var(--border)", borderLeft: "2px solid var(--accent)", borderRadius: 3, fontSize: 13, color: "var(--text)" }}>
      No POV of its own, so it takes its chapter's: {inherited.name || "(unnamed)"}.
    </div>
  ) : null;
  // v1.7 r014: a scene's research, read-only, from the notes' Used In.
  const research = kind === "scene" ? <FabulaSceneResearch state={state} storyId={storyId} sceneId={record.id} editing={!!draft} onOpenEntry={onOpenEntry} /> : null;
  const note = gone ? (
    <div className="fabula-character-deleted" style={{ margin: "0 0 18px", padding: "10px 14px", border: "1px solid var(--border)", borderLeft: "2px solid var(--danger)", borderRadius: 3, fontSize: 13, color: "var(--text)" }}>
      Character deleted{gone.name ? ` (was ${gone.name})` : ""}. {draft ? "Pick another below, or cancel and delete this cast record." : "Edit to pick another, or delete this cast record."}
    </div>
  ) : null;
  if (draft) {
    return (
      <EntryForm
        draft={draft}
        template={template}
        entries={state.entries}
        templates={state.templates}
        bodies={state.celestialBodies}
        registeredNodes={nodes}
        onChange={(d) => onDraftChange(kind === "cast" ? fabulaCastNameFill(state, draft, d) : d)}
        showSecrets={showSecrets}
        imageFolder={state.world.imageFolder}
        allTags={allTags}
        dirHandle={dirHandle}
        calendar={getCalendar(state, null)}
        primaryCalendar={state.world.calendar}
        additionalCalendars={[]}
        selfEntryId={draft.id}
        flash={flash}
        hideTags
        canvasSlot={note || povNote}
        footSlot={research}
        onRestoreTemplate={isLocked ? undefined : onRestoreTemplate}
      />
    );
  }
  return (
    <EntryView
      entry={record}
      template={template}
      templates={state.templates}
      entries={state.entries}
      onOpenEntry={onOpenEntry}
      onSelectTag={onSelectTag}
      showSecrets={showSecrets}
      imageFolder={state.world.imageFolder}
      dirHandle={dirHandle}
      calendar={getCalendar(state, null)}
      state={state}
      onUpdateViewPrefs={onUpdateViewPrefs}
      canvasSlot={note || povNote}
      footSlot={research}
      registeredNodes={nodes}
      badgeExtra={place ? place.path : null}
    />
  );
}

// ─── Fabula: Outline (v1.7 r011) ───────────────────────────────────────────────
// The Outline tab (docs/fabula-spec.md, section 7): a story's acts, chapters,
// and scenes as one tree, each scene's beats under it. The tree lives in the
// story's `outline` as nested { id, children } nodes, so the order is in one
// place, and the records live in their slices. Drak's calls (2026-10-25):
// four arrows on every row, or Alt with the same arrow on a focused row, move
// a record up or down past its neighbor, out a level, or into the act or
// chapter above it, and drag does the same with a pointer; new records come
// in place, by title, from a + line at the end of each act and chapter and
// three at the top; acts are numbered I, II, III, chapters 1, 2, 3 through
// the whole story, scenes A, B, C within their chapter (or their act, or the
// story's own level), and beats i, ii, iii within their scene, all from
// position; acts, chapters, and scenes fold, the browser keeping each fold;
// and beats are edited where they sit. Acts, chapters, and scenes open on
// pages of their own, as People's records do. From Drak's pass (2026-10-26):
// a beat has its line and What Happens, what needs to happen in it, a click
// anywhere on a row opens its page, and beats sit in under their scene's
// title.

const FABULA_OUTLINE_KINDS = ["part", "chapter", "scene"];

// What a level can hold: the story's own level anything, an act chapters and
// scenes, a chapter scenes, and a scene nothing (its beats are a field).
const fabulaOutlineHolds = (parentKind, kind) => (
  parentKind === null ? FABULA_OUTLINE_KINDS.includes(kind)
    : parentKind === "part" ? kind === "chapter" || kind === "scene"
      : parentKind === "chapter" ? kind === "scene"
        : false
);

// The story page's tab that lists a kind's records.
const fabulaTabOf = (kind) => (FABULA_OUTLINE_KINDS.includes(kind) ? "outline" : kind === "plotPoint" || kind === "promise" ? "plot" : kind === "research" ? "notes" : "people");

// A story's outline as { id, kind, children } nodes: each stored node whose
// record is the story's own and may sit where it's stored, once, and then the
// story's acts, chapters, and scenes the stored tree doesn't place, at the
// story's own level in the order they were made. Nothing is written back
// until the tree changes.
const fabulaOutlineTree = (state, story) => {
  const fab = (state && state.fabula) || {};
  const recs = new Map();
  FABULA_OUTLINE_KINDS.forEach(kind => {
    const k = FABULA_KINDS.find(x => x.kind === kind);
    (Array.isArray(fab[k.slice]) ? fab[k.slice] : []).forEach(r => { if (r && r.id && story && r.storyId === story.id) recs.set(r.id, { kind, record: r }); });
  });
  const seen = new Set();
  const walk = (nodes, parentKind) => (Array.isArray(nodes) ? nodes : []).flatMap(n => {
    const id = n && typeof n === "object" ? n.id : null;
    const hit = typeof id === "string" ? recs.get(id) : null;
    if (!hit || seen.has(id) || !fabulaOutlineHolds(parentKind, hit.kind)) return [];
    seen.add(id);
    return [{ id, kind: hit.kind, children: hit.kind === "scene" ? [] : walk(n.children, hit.kind) }];
  });
  const placed = walk(story && story.outline, null);
  const loose = [...recs.entries()].filter(([id]) => !seen.has(id))
    .sort((a, b) => String(a[1].record.createdAt || "").localeCompare(String(b[1].record.createdAt || "")))
    .map(([id, x]) => ({ id, kind: x.kind, children: [] }));
  return [...placed, ...loose];
};

// The tree as the story stores it.
const fabulaOutlineStored = (tree) => tree.map(n => (n.kind === "scene" ? { id: n.id } : { id: n.id, children: fabulaOutlineStored(n.children) }));

const fabulaOutlineClone = (tree) => tree.map(n => ({ ...n, children: fabulaOutlineClone(n.children) }));

// Where a node sits: the list that holds it, its index there, and its parent
// node, null at the story's own level.
const fabulaOutlineFind = (tree, id, parent = null) => {
  for (let i = 0; i < tree.length; i++) {
    if (tree[i].id === id) return { list: tree, index: i, parent };
    const hit = fabulaOutlineFind(tree[i].children, id, tree[i]);
    if (hit) return hit;
  }
  return null;
};

// The four arrows: up and down swap a node with its neighbor, out puts it
// just after its parent at the parent's level, and in puts it at the end of
// the act or chapter just above it. The new tree, or null where the move
// isn't allowed.
const fabulaOutlineMove = (tree, id, dir) => {
  const t = fabulaOutlineClone(tree);
  const at = fabulaOutlineFind(t, id);
  if (!at) return null;
  const { list, index, parent } = at;
  const node = list[index];
  if (dir === "up" || dir === "down") {
    const j = dir === "up" ? index - 1 : index + 1;
    if (j < 0 || j >= list.length) return null;
    list[index] = list[j];
    list[j] = node;
    return t;
  }
  if (dir === "out") {
    if (!parent) return null;
    const up = fabulaOutlineFind(t, parent.id);
    if (!fabulaOutlineHolds(up.parent ? up.parent.kind : null, node.kind)) return null;
    list.splice(index, 1);
    up.list.splice(up.index + 1, 0, node);
    return t;
  }
  if (dir === "in") {
    const above = index > 0 ? list[index - 1] : null;
    if (!above || !fabulaOutlineHolds(above.kind, node.kind)) return null;
    list.splice(index, 1);
    above.children.push(node);
    return t;
  }
  return null;
};

// A drag's drop: before or after another node, or into an act or a chapter at
// its end. Null where it isn't allowed, onto itself or into what it holds
// included.
const fabulaOutlineDrop = (tree, dragId, targetId, where) => {
  if (dragId === targetId) return null;
  const t = fabulaOutlineClone(tree);
  const from = fabulaOutlineFind(t, dragId);
  if (!from) return null;
  const node = from.list[from.index];
  if (fabulaOutlineFind(node.children, targetId)) return null;
  from.list.splice(from.index, 1);
  const to = fabulaOutlineFind(t, targetId);
  if (!to) return null;
  if (where === "into") {
    const target = to.list[to.index];
    if (!fabulaOutlineHolds(target.kind, node.kind)) return null;
    target.children.push(node);
    return t;
  }
  if (!fabulaOutlineHolds(to.parent ? to.parent.kind : null, node.kind)) return null;
  to.list.splice(where === "before" ? to.index : to.index + 1, 0, node);
  return t;
};

// A new node at the end of an act or a chapter, or of the story's own level.
const fabulaOutlineAppend = (tree, parentId, node) => {
  const t = fabulaOutlineClone(tree);
  if (!parentId) return fabulaOutlineHolds(null, node.kind) ? [...t, node] : null;
  const at = fabulaOutlineFind(t, parentId);
  const parent = at ? at.list[at.index] : null;
  if (!parent || !fabulaOutlineHolds(parent.kind, node.kind)) return null;
  parent.children.push(node);
  return t;
};

// The tree without a node, what it held lifted into its place or gone with
// it, and the ids that went.
const fabulaOutlineRemove = (tree, id, lift) => {
  const t = fabulaOutlineClone(tree);
  const at = fabulaOutlineFind(t, id);
  if (!at) return { tree: t, gone: [] };
  const node = at.list[at.index];
  const ids = (n) => [n.id, ...n.children.flatMap(ids)];
  at.list.splice(at.index, 1, ...(lift ? node.children : []));
  return { tree: t, gone: lift ? [node.id] : ids(node) };
};

// Numbers from position, never stored (Drak, 2026-10-25): acts I, II, III
// through the story, chapters 1, 2, 3 through the whole story, and scenes A,
// B, C within their chapter, their act, or the story's own level. A scene's
// beats are numbered i, ii, iii where they're drawn (fabulaRoman, lowercased).
const fabulaRoman = (n) => {
  const steps = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let out = "", rest = n;
  steps.forEach(([v, r]) => { while (rest >= v) { out += r; rest -= v; } });
  return out;
};

const fabulaLetters = (n) => {
  let out = "", rest = n;
  while (rest > 0) { rest -= 1; out = String.fromCharCode(65 + (rest % 26)) + out; rest = Math.floor(rest / 26); }
  return out;
};

const fabulaOutlineNumbers = (tree) => {
  const numbers = new Map();
  let act = 0, chapter = 0;
  const walk = (nodes) => {
    let scene = 0;
    nodes.forEach(n => {
      if (n.kind === "part") { numbers.set(n.id, fabulaRoman(++act)); walk(n.children); }
      else if (n.kind === "chapter") { numbers.set(n.id, String(++chapter)); walk(n.children); }
      else numbers.set(n.id, fabulaLetters(++scene));
    });
  };
  walk(tree);
  return numbers;
};

// Where each of a story's acts, chapters, and scenes sits (Drak, 2026-10-26;
// v1.7 r012): its path, the act's number, then the chapter's, then the
// scene's letter, joined by dots, so a scene reads II.4.A, a chapter II.4,
// an act II, a scene straight under an act II.A, one at the story's own level
// A, and a chapter outside any act 4; and its index in the outline's order.
// Worked out from the outline each time, as the numbers are.
const fabulaOutlinePlaces = (state, storyId) => {
  const fab = (state && state.fabula) || {};
  const story = (Array.isArray(fab.stories) ? fab.stories : []).find(st => st && st.id === storyId);
  const places = new Map();
  if (!story) return places;
  const tree = fabulaOutlineTree(state, story);
  const numbers = fabulaOutlineNumbers(tree);
  const walk = (nodes, prefix) => nodes.forEach(n => {
    const path = prefix ? `${prefix}.${numbers.get(n.id)}` : numbers.get(n.id);
    places.set(n.id, { path, index: places.size });
    walk(n.children, path);
  });
  walk(tree, "");
  return places;
};

// Fabula with a story's outline written back.
const fabulaWithOutline = (fab, storyId, tree) => ({
  ...fab,
  stories: (Array.isArray(fab.stories) ? fab.stories : []).map(st => (st && st.id === storyId ? { ...st, outline: fabulaOutlineStored(tree), updatedAt: isoNow() } : st)),
});

// A change to a story's outline, made against Fabula as it stands: fn takes
// the tree and returns the new one, or null for no change.
const fabulaOutlineEdit = (fab, storyId, fn) => {
  const story = (Array.isArray(fab.stories) ? fab.stories : []).find(st => st && st.id === storyId);
  if (!story) return fab;
  const next = fn(fabulaOutlineTree({ fabula: fab }, story));
  return next ? fabulaWithOutline(fab, storyId, next) : fab;
};

// A new act, chapter, or scene with its title, at the end of its place,
// written at once (Drak, 2026-10-25: in place, by title).
const fabulaOutlineCreate = (fab, storyId, parentId, kind, name, id) => {
  const story = (Array.isArray(fab.stories) ? fab.stories : []).find(st => st && st.id === storyId);
  const k = FABULA_KINDS.find(x => x.kind === kind);
  if (!story || !k) return fab;
  const tree = fabulaOutlineAppend(fabulaOutlineTree({ fabula: fab }, story), parentId, { id, kind, children: [] });
  if (!tree) return fab;
  const now = isoNow();
  const rec = { id, storyId, name, fields: {}, createdAt: now, updatedAt: now };
  return fabulaWithOutline({ ...fab, [k.slice]: [...(Array.isArray(fab[k.slice]) ? fab[k.slice] : []), rec] }, storyId, tree);
};

// What an act or a chapter holds in its story's outline, all the way down.
const fabulaOutlineHolding = (state, kind, rec) => {
  if (!rec || (kind !== "part" && kind !== "chapter")) return [];
  const fab = (state && state.fabula) || {};
  const story = (Array.isArray(fab.stories) ? fab.stories : []).find(st => st && st.id === rec.storyId);
  const at = story ? fabulaOutlineFind(fabulaOutlineTree(state, story), rec.id) : null;
  const down = (n) => n.children.flatMap(c => [c, ...down(c)]);
  return at ? down(at.list[at.index]) : [];
};

// How many of each kind's records, outside what goes, point at any of the
// ids given: [[kind, n]], for what Delete everything would clear.
const fabulaInboundCountsAll = (state, ids, going) => {
  const fab = (state && state.fabula) || {};
  return FABULA_KINDS.map(k => {
    const tpl = { id: k.id, fields: fabulaKindFields(state, k.kind) };
    const arr = (Array.isArray(fab[k.slice]) ? fab[k.slice] : []).filter(r => r && !going.has(r.id));
    return [k.kind, arr.filter(r => ids.some(id => countInboundEntryRefs([{ ...r, templateId: k.id }], [tpl], id) > 0)).length];
  }).filter(([, n]) => n > 0);
};

// Fabula's records below the story level, without the ids given.
const fabulaDropRecords = (fab, ids) => ({
  ...fab,
  ...Object.fromEntries(FABULA_KINDS.filter(k => k.kind !== "corpus" && k.kind !== "story")
    .map(k => [k.slice, (Array.isArray(fab[k.slice]) ? fab[k.slice] : []).filter(r => !r || !ids.has(r.id))])),
});

// A record deleted: out of its slice and, for an act, a chapter, or a scene,
// out of its story's outline, what an act or a chapter held lifted into its
// place or gone with it. Fabula and the ids that went, for the cleaning.
const fabulaOutlineDelete = (fab, kind, rec, lift) => {
  let next = fab;
  let gone = [rec.id];
  const story = FABULA_OUTLINE_KINDS.includes(kind) ? (Array.isArray(fab.stories) ? fab.stories : []).find(st => st && st.id === rec.storyId) : null;
  if (story) {
    const out = fabulaOutlineRemove(fabulaOutlineTree({ fabula: fab }, story), rec.id, lift);
    next = fabulaWithOutline(fab, story.id, out.tree);
    if (out.gone.length) gone = out.gone;
  }
  const ids = new Set(gone);
  return { fab: fabulaDropRecords(next, ids), gone: ids };
};

// A scene's beats: its Beats field's rows, each { beat }.
const fabulaBeats = (scene) => (scene && scene.fields && Array.isArray(scene.fields.beats) ? scene.fields.beats : []);

const fabulaWithBeats = (fab, sceneId, fn) => ({
  ...fab,
  scenes: (Array.isArray(fab.scenes) ? fab.scenes : []).map(sc => (sc && sc.id === sceneId ? { ...sc, fields: { ...(sc.fields || {}), beats: fn(fabulaBeats(sc).slice()) }, updatedAt: isoNow() } : sc)),
});

// A beat moved within its scene or to another, to an index there, or to the
// end when the index is null.
const fabulaMoveBeat = (fab, fromId, fromIndex, toId, toIndex) => {
  const from = (Array.isArray(fab.scenes) ? fab.scenes : []).find(sc => sc && sc.id === fromId);
  const beat = fabulaBeats(from)[fromIndex];
  if (beat === undefined) return fab;
  let at = toIndex;
  if (fromId === toId && at != null && at > fromIndex) at -= 1;
  const without = fabulaWithBeats(fab, fromId, b => b.filter((_, i) => i !== fromIndex));
  return fabulaWithBeats(without, toId, b => { b.splice(at == null ? b.length : Math.max(0, Math.min(at, b.length)), 0, beat); return b; });
};

// A scene with no POV of its own takes its chapter's (spec, section 5.9):
// that cast record, or null.
const fabulaInheritedPov = (state, storyId, scene) => {
  if (!scene || (scene.fields || {}).pov) return null;
  const fab = (state && state.fabula) || {};
  const story = (Array.isArray(fab.stories) ? fab.stories : []).find(st => st && st.id === storyId);
  const at = story ? fabulaOutlineFind(fabulaOutlineTree(state, story), scene.id) : null;
  if (!at || !at.parent || at.parent.kind !== "chapter") return null;
  const chapter = (Array.isArray(fab.chapters) ? fab.chapters : []).find(c => c && c.id === at.parent.id);
  const pov = chapter && (chapter.fields || {}).pov;
  return (Array.isArray(fab.cast) ? fab.cast : []).find(c => c && c.id === pov && c.storyId === storyId) || null;
};

// The Outline tab: the tree with its numbers and folds, the arrows, the keys,
// and drag; the + lines, whose rows take their title in place, Enter keeping
// one and opening the next and Esc stopping; and the beats, in under their
// scene's title, each with its line and its What Happens, edited where they
// sit, a beat emptied of both going. A click anywhere on an act's, a
// chapter's, or a scene's row opens its page, and a click on a beat edits it
// (Drak's pass, 2026-10-26).
function FabulaOutlineTab({ state, story, isLocked, folds, onToggleFold, onOpenRecord, onUpdateFabula }) {
  const fab = state.fabula || {};
  const tree = fabulaOutlineTree(state, story);
  const numbers = fabulaOutlineNumbers(tree);
  const recs = new Map();
  FABULA_OUTLINE_KINDS.forEach(kind => {
    const k = FABULA_KINDS.find(x => x.kind === kind);
    (Array.isArray(fab[k.slice]) ? fab[k.slice] : []).forEach(r => { if (r && r.id) recs.set(r.id, r); });
  });
  const castById = new Map((Array.isArray(fab.cast) ? fab.cast : []).filter(c => c && c.id && c.storyId === story.id).map(c => [c.id, c]));
  const castName = (id) => { const c = typeof id === "string" && castById.get(id); return c ? (c.name || "(unnamed)") : null; };
  const [adding, setAdding] = useState(null);
  const [addText, setAddText] = useState("");
  const [editing, setEditing] = useState(null);
  const [editText, setEditText] = useState("");
  const [editHappens, setEditHappens] = useState("");
  const [focusKey, setFocusKey] = useState(null);
  const [drop, setDrop] = useState(null);
  const dragRef = useRef(null);
  const rootRef = useRef(null);
  const skipBlurRef = useRef(false);
  useEffect(() => {
    if (!focusKey || !rootRef.current) return;
    const el = [...rootRef.current.querySelectorAll("[data-outline-key]")].find(x => x.getAttribute("data-outline-key") === focusKey);
    if (el) el.focus();
    setFocusKey(null);
  }, [focusKey]);

  const write = (fn) => { if (!isLocked) onUpdateFabula(fn); };
  const move = (id, dir) => {
    if (isLocked || !fabulaOutlineMove(tree, id, dir)) return;
    write(f => fabulaOutlineEdit(f, story.id, t => fabulaOutlineMove(t, id, dir)));
    setFocusKey(id);
  };
  const beatsOf = (sceneId) => fabulaBeats(recs.get(sceneId));
  const setBeats = (sceneId, fn) => write(f => fabulaWithBeats(f, sceneId, fn));
  const moveBeat = (sceneId, i, j) => {
    if (isLocked || j < 0 || j >= beatsOf(sceneId).length) return;
    write(f => fabulaMoveBeat(f, sceneId, i, sceneId, j > i ? j + 1 : j));
    setFocusKey(`${sceneId}#${j}`);
  };
  const startAdd = (where) => { if (isLocked) return; skipBlurRef.current = false; setEditing(null); setAdding(where); setAddText(""); };
  const commitAdd = (keepOpen) => {
    const text = addText.trim();
    if (adding && text && !isLocked) {
      if (adding.beat) setBeats(adding.sceneId, b => [...b, { beat: text, whatHappens: "" }]);
      else {
        const id = `fab-${adding.kind}-${genId()}`;
        const { parentId, kind } = adding;
        write(f => fabulaOutlineCreate(f, story.id, parentId, kind, text, id));
      }
    }
    setAddText("");
    if (!keepOpen) setAdding(null);
  };
  // A beat in edit has its line and its What Happens open together; part
  // says which one has the focus.
  const startEdit = (sceneId, index, part) => {
    if (isLocked) return;
    skipBlurRef.current = false;
    setAdding(null);
    const b = beatsOf(sceneId)[index] || {};
    setEditing({ sceneId, index, part: part === "happens" ? "happens" : "beat" });
    setEditText(b.beat || "");
    setEditHappens(b.whatHappens || "");
  };
  const stopEdit = () => { setEditing(null); setEditText(""); setEditHappens(""); };
  const commitEdit = () => {
    if (!editing) return;
    const { sceneId, index } = editing;
    const line = editText.trim(), happens = editHappens.trim();
    const was = beatsOf(sceneId)[index] || {};
    if (!line && !happens) setBeats(sceneId, b => b.filter((_, i) => i !== index));
    else if (line !== (was.beat || "") || happens !== (was.whatHappens || "")) {
      setBeats(sceneId, b => b.map((x, i) => (i === index ? { ...(x || {}), beat: line, whatHappens: happens } : x)));
    }
    stopEdit();
  };

  const ARROWS = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "out", ArrowRight: "in" };
  const typing = (e) => { const tag = e.target && e.target.tagName; return tag === "INPUT" || tag === "TEXTAREA"; };
  const onNodeKey = (e, node) => {
    if (typing(e)) return;
    if (e.altKey && ARROWS[e.key]) { e.preventDefault(); move(node.id, ARROWS[e.key]); return; }
    if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); onOpenRecord(node.kind, node.id); }
  };
  const onBeatKey = (e, sceneId, i) => {
    if (typing(e)) return;
    if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) { e.preventDefault(); moveBeat(sceneId, i, e.key === "ArrowUp" ? i - 1 : i + 1); return; }
    if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); startEdit(sceneId, i, "beat"); }
  };
  // A click on a row's own space, not on one of its buttons or boxes.
  const onControl = (e) => !!(e.target && e.target.closest && e.target.closest("button, input, textarea"));

  // Drag: a row's top or bottom quarter puts the dragged record before or
  // after it, the middle into it where it can hold it; a beat goes before or
  // after another beat, or to the end of a scene dropped on.
  const whereOn = (e, into) => {
    const r = e.currentTarget.getBoundingClientRect();
    const y = (e.clientY - r.top) / Math.max(1, r.height);
    if (into && y > 0.25 && y < 0.75) return "into";
    return y < 0.5 ? "before" : "after";
  };
  const nodeWhere = (e, node) => {
    const d = dragRef.current;
    if (!d) return null;
    if (d.beat) return node.kind === "scene" ? "into" : null;
    const where = whereOn(e, fabulaOutlineHolds(node.kind, d.kind));
    return fabulaOutlineDrop(tree, d.id, node.id, where) ? where : null;
  };
  const beatWhere = (e) => (dragRef.current && dragRef.current.beat ? whereOn(e, false) : null);
  const dragProps = (key, payload, whereFn, onDropped) => (isLocked ? {} : {
    draggable: true,
    onDragStart: (e) => { e.stopPropagation(); dragRef.current = payload; e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", key); } catch (_) {} },
    onDragEnd: () => { dragRef.current = null; setDrop(null); },
    onDragOver: (e) => {
      const where = whereFn(e);
      if (!where) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (!drop || drop.key !== key || drop.where !== where) setDrop({ key, where });
    },
    onDrop: (e) => {
      e.preventDefault();
      const where = whereFn(e);
      const d = dragRef.current;
      dragRef.current = null;
      setDrop(null);
      if (where && d) onDropped(d, where);
    },
  });

  const dropMark = (key) => (drop && drop.key === key ? (drop.where === "before" ? "inset 0 2px 0 var(--accent)" : drop.where === "after" ? "inset 0 -2px 0 var(--accent)" : "inset 0 0 0 1px var(--accent)") : "none");
  const rowStyle = (depth, key) => ({
    padding: `6px 12px 6px ${12 + depth * 22}px`,
    background: "var(--surf)",
    display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 10, rowGap: 2,
    boxShadow: dropMark(key),
  });
  // Where a row's title starts: its indent, the fold, the number, and the
  // gaps between them. A scene's beats sit in from there, past a rule.
  const titleX = (depth) => 12 + depth * 22 + 14 + 10 + 28 + 10;
  const beatStyle = (key) => ({
    padding: "4px 12px 4px 10px",
    background: "var(--surf)",
    display: "flex", alignItems: "baseline", columnGap: 10,
    fontSize: 13,
    boxShadow: dropMark(key),
  });
  const plain = { background: "none", border: "none", padding: 0, color: "inherit", font: "inherit", cursor: "pointer", textAlign: "left" };
  const numStyle = { minWidth: 28, textAlign: "right", color: "var(--text-dim)", fontVariantNumeric: "tabular-nums", flexShrink: 0 };
  const beatNumStyle = { minWidth: 26, textAlign: "right", color: "var(--text-dim)", fontVariantNumeric: "tabular-nums", flexShrink: 0 };
  const arrowBtn = (label, sym, ok, onClick) => (
    <button className="btn btn-ghost" style={{ padding: "1px 6px", fontSize: 11, minWidth: 24 }} disabled={!ok} onClick={onClick} aria-label={label} title={label}>{sym}</button>
  );
  const plusLine = (pad, items) => (
    <div className="fabula-outline-add" style={{ padding: `3px 12px 5px ${pad}px`, background: "var(--surf)", display: "flex", gap: 14 }}>
      {items.map(([label, where]) => (
        <button key={label} style={{ ...plain, fontSize: 12, color: "var(--text-dim)" }} onClick={() => startAdd(where)}>{label}</button>
      ))}
    </div>
  );
  const PLACEHOLDER = { part: "The part's or act's title", chapter: "The chapter's title", scene: "The scene's title" };
  const addRow = (style, numSt, where) => (
    <div className="fabula-outline-row fabula-outline-adding" style={style}>
      <span style={numSt}>+</span>
      <input
        className="input"
        autoFocus
        aria-label={where.beat ? "New beat" : PLACEHOLDER[where.kind]}
        placeholder={where.beat ? "The beat, in a line" : PLACEHOLDER[where.kind]}
        value={addText}
        onChange={e => setAddText(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") { e.preventDefault(); commitAdd(true); }
          else if (e.key === "Escape") { e.preventDefault(); skipBlurRef.current = true; setAdding(null); setAddText(""); }
        }}
        onBlur={() => { if (skipBlurRef.current) { skipBlurRef.current = false; return; } commitAdd(false); }}
        style={{ flex: "1 1 220px", minWidth: 0, padding: "3px 8px", fontSize: 13 }}
      />
      <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Enter adds it; Esc stops</span>
    </div>
  );
  const addingHere = (pred) => adding && pred(adding);

  // What Happens grows with what it holds.
  const autoGrow = (el) => { if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight + 2}px`; } };
  const renderBeat = (scene, beat, i, depth) => {
    const key = `${scene.id}#${i}`;
    const b = beat || {};
    const isEditing = !!editing && editing.sceneId === scene.id && editing.index === i;
    const n = beatsOf(scene.id).length;
    // In the line Enter keeps the edit; in What Happens Enter starts a new
    // line and Ctrl+Enter keeps it; Esc drops it in either.
    const keys = (e, inLine) => {
      if (e.key === "Escape") { e.preventDefault(); skipBlurRef.current = true; stopEdit(); return; }
      if (e.key === "Enter" && (inLine || e.ctrlKey || e.metaKey)) { e.preventDefault(); skipBlurRef.current = true; commitEdit(); }
    };
    const focusOn = (part) => () => setEditing(x => (x && x.part !== part ? { ...x, part } : x));
    return (
      <div
        key={key}
        className={`${isLocked ? "" : "stemma-index-row "}fabula-outline-row fabula-outline-beat`}
        data-outline-key={key}
        role="treeitem"
        aria-level={depth + 1}
        tabIndex={0}
        title={isLocked || isEditing ? undefined : "Edit this beat"}
        onKeyDown={e => onBeatKey(e, scene.id, i)}
        onClick={e => {
          if (isLocked || isEditing || onControl(e)) return;
          startEdit(scene.id, i, e.target.closest && e.target.closest(".fabula-outline-beat-happens") ? "happens" : "beat");
        }}
        onBlur={isEditing ? (e) => {
          if (e.currentTarget.contains(e.relatedTarget)) return;
          if (skipBlurRef.current) { skipBlurRef.current = false; return; }
          commitEdit();
        } : undefined}
        {...(isEditing ? {} : dragProps(key, { beat: true, sceneId: scene.id, index: i }, beatWhere, (d, where) => write(f => fabulaMoveBeat(f, d.sceneId, d.index, scene.id, where === "after" ? i + 1 : i))))}
        style={{ ...beatStyle(key), cursor: isLocked ? "default" : "text" }}
      >
        <span style={beatNumStyle}>{fabulaRoman(i + 1).toLowerCase()}</span>
        <div style={{ flex: "1 1 0", minWidth: 0 }}>
          {isEditing ? (
            <>
              <input
                className="input"
                autoFocus={editing.part !== "happens"}
                aria-label="Beat"
                placeholder="The beat, in a line"
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onFocus={focusOn("beat")}
                onKeyDown={e => keys(e, true)}
                style={{ display: "block", width: "100%", boxSizing: "border-box", padding: "3px 8px", fontSize: 13 }}
              />
              <textarea
                className="input"
                ref={autoGrow}
                rows={2}
                autoFocus={editing.part === "happens"}
                aria-label="What Happens"
                placeholder="What needs to happen in the beat"
                value={editHappens}
                onChange={e => setEditHappens(e.target.value)}
                onFocus={focusOn("happens")}
                onKeyDown={e => keys(e, false)}
                style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 4, padding: "4px 8px", fontSize: 12.5, lineHeight: 1.45, fontFamily: "inherit", resize: "none", overflow: "hidden" }}
              />
              <div className="fabula-outline-beat-hint" style={{ marginTop: 3, fontSize: 11, color: "var(--text-dim)" }}>
                {editing.part === "happens" ? "Ctrl+Enter keeps it; Esc stops" : "Enter keeps it; Tab to What Happens; Esc stops"}
              </div>
            </>
          ) : (
            <>
              <div className="fabula-outline-beat-text" style={{ overflowWrap: "anywhere", color: b.beat ? "var(--text)" : "var(--text-dim)" }}>{b.beat || "(untitled beat)"}</div>
              {b.whatHappens && (
                <div className="fabula-outline-beat-happens" style={{ marginTop: 2, fontSize: 12.5, lineHeight: 1.45, color: "var(--text-dim)", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{b.whatHappens}</div>
              )}
            </>
          )}
        </div>
        {!isLocked && !isEditing && (
          <span style={{ marginLeft: "auto", display: "inline-flex", gap: 3, flexShrink: 0 }}>
            {arrowBtn("Move up", "\u2191", i > 0, () => moveBeat(scene.id, i, i - 1))}
            {arrowBtn("Move down", "\u2193", i < n - 1, () => moveBeat(scene.id, i, i + 1))}
            {arrowBtn("Delete this beat", "\u00d7", true, () => setBeats(scene.id, bs => bs.filter((_, j) => j !== i)))}
          </span>
        )}
      </div>
    );
  };
  // A scene's beats, its + Beat, and the row that takes a new beat's line, in
  // under the scene's title with a rule down their left side.
  const beatsBlock = (scene, rec, depth) => {
    const beats = fabulaBeats(rec);
    const addingBeat = addingHere(a => a.beat && a.sceneId === scene.id);
    if (beats.length === 0 && !addingBeat && isLocked) return null;
    return (
      <div className="fabula-outline-beats" style={{ background: "var(--surf)", padding: `2px 0 4px ${titleX(depth) - 2}px` }}>
        <div style={{ borderLeft: "2px solid var(--border)", display: "flex", flexDirection: "column" }}>
          {beats.map((bt, i) => renderBeat(scene, bt, i, depth + 1))}
          {addingBeat && addRow({ ...beatStyle("add"), flexWrap: "wrap", rowGap: 2 }, beatNumStyle, adding)}
          {!isLocked && plusLine(22, [["+ Beat", { sceneId: scene.id, beat: true }]])}
        </div>
      </div>
    );
  };

  const countIn = (node, kind) => node.children.reduce((a, c) => a + (c.kind === kind ? 1 : 0) + countIn(c, kind), 0);
  const metaOf = (node, rec, parent) => {
    const f = rec.fields || {};
    if (node.kind === "part") {
      const ch = countIn(node, "chapter"), sc = countIn(node, "scene");
      return [ch ? fabulaCount("chapter", ch) : null, sc ? fabulaCount("scene", sc) : null];
    }
    if (node.kind === "chapter") {
      return [castName(f.pov), formatSelectDisplay(f.status), node.children.length ? fabulaCount("scene", node.children.length) : null];
    }
    const own = castName(f.pov);
    const chapterPov = !own && parent && parent.kind === "chapter" ? castName(((recs.get(parent.id) || {}).fields || {}).pov) : null;
    const beats = fabulaBeats(rec).length;
    return [own || (chapterPov ? `${chapterPov} (chapter's)` : null), formatSelectDisplay(f.status), beats ? `${beats} ${beats === 1 ? "beat" : "beats"}` : null];
  };
  const TYPE = {
    part: { fontSize: 15, fontWeight: 600 },
    chapter: { fontSize: 15, fontWeight: 500 },
    scene: { fontSize: 14, fontWeight: 400 },
  };

  const renderNode = (node, depth, parent) => {
    const rec = recs.get(node.id) || {};
    const folded = !!(folds || {})[node.id];
    const can = isLocked ? null : ["up", "down", "out", "in"].reduce((a, d) => ({ ...a, [d]: !!fabulaOutlineMove(tree, node.id, d) }), {});
    const meta = metaOf(node, rec, parent).filter(Boolean).join("\u00a0\u00b7 ");
    const plus = node.kind === "part" ? [["+ Chapter", { parentId: node.id, kind: "chapter" }], ["+ Scene", { parentId: node.id, kind: "scene" }]]
      : [["+ Scene", { parentId: node.id, kind: "scene" }]];
    return (
      <div key={node.id} role="none" style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <div
          className="stemma-index-row fabula-outline-row"
          data-kind={node.kind}
          data-outline-key={node.id}
          role="treeitem"
          aria-level={depth + 1}
          aria-expanded={!folded}
          tabIndex={0}
          title={`Open this ${FABULA_NOUNS[node.kind].one}`}
          onKeyDown={e => onNodeKey(e, node)}
          onClick={e => { if (!onControl(e)) onOpenRecord(node.kind, node.id); }}
          {...dragProps(node.id, { id: node.id, kind: node.kind }, e => nodeWhere(e, node), (d, where) => {
            if (d.beat) { write(f => fabulaMoveBeat(f, d.sceneId, d.index, node.id, null)); return; }
            write(f => fabulaOutlineEdit(f, story.id, t => fabulaOutlineDrop(t, d.id, node.id, where)));
            setFocusKey(d.id);
          })}
          style={{ ...rowStyle(depth, node.id), ...TYPE[node.kind], cursor: "pointer" }}
        >
          <button className="fabula-outline-fold" style={{ ...plain, width: 14, flexShrink: 0, fontSize: 10, color: "var(--text-dim)" }} onClick={() => onToggleFold(node.id)} aria-label={folded ? "Unfold" : "Fold"} title={folded ? "Unfold" : "Fold"}>{folded ? "\u25b8" : "\u25be"}</button>
          <span className="fabula-outline-num" style={numStyle}>{numbers.get(node.id)}</span>
          <span className="fabula-outline-title" style={{ minWidth: 0, overflowWrap: "anywhere", color: "var(--text)" }}>{rec.name || "(untitled)"}</span>
          <span style={{ marginLeft: "auto", display: "inline-flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "flex-end", columnGap: 10, rowGap: 2 }}>
            {meta && <span className="fabula-outline-meta" style={{ fontSize: 12, fontWeight: 400, color: "var(--text-dim)", textAlign: "right" }}>{meta}</span>}
            {can && (
              <span style={{ display: "inline-flex", gap: 3 }}>
                {arrowBtn("Move up", "\u2191", can.up, () => move(node.id, "up"))}
                {arrowBtn("Move down", "\u2193", can.down, () => move(node.id, "down"))}
                {arrowBtn("Move out a level", "\u2190", can.out, () => move(node.id, "out"))}
                {arrowBtn("Move into the part or chapter above", "\u2192", can.in, () => move(node.id, "in"))}
              </span>
            )}
          </span>
        </div>
        {!folded && (
          <div role="group" style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {node.children.map(c => renderNode(c, depth + 1, node))}
            {node.kind === "scene" ? beatsBlock(node, rec, depth) : (
              <>
                {addingHere(a => !a.beat && a.parentId === node.id) && addRow(rowStyle(depth + 1, "add"), numStyle, adding)}
                {!isLocked && plusLine(12 + depth * 22 + 44, plus)}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const small = { padding: "3px 10px", fontSize: 12 };
  const topAdding = addingHere(a => !a.beat && !a.parentId);
  return (
    <div className="fabula-outline">
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
        <div className="field-label"><span>Outline</span></div>
        {!isLocked && (
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn" style={small} onClick={() => startAdd({ parentId: null, kind: "part" })}>+ Part / Act</button>
            <button className="btn" style={small} onClick={() => startAdd({ parentId: null, kind: "chapter" })}>+ Chapter</button>
            <button className="btn" style={small} onClick={() => startAdd({ parentId: null, kind: "scene" })}>+ Scene</button>
          </div>
        )}
      </div>
      {tree.length === 0 && !topAdding && (
        <div style={{ fontSize: 13, color: "var(--text-dim)", fontStyle: "italic" }}>No acts, chapters, or scenes yet.</div>
      )}
      {(tree.length > 0 || topAdding) && (
        <div ref={rootRef} role="tree" aria-label="Outline" style={{ display: "flex", flexDirection: "column", gap: 1, border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
          {tree.map(n => renderNode(n, 0, null))}
          {topAdding && addRow(rowStyle(0, "add"), numStyle, adding)}
        </div>
      )}
    </div>
  );
}

// Deleting an act or a chapter that holds anything asks whether what it holds
// moves up a level, the default, or goes with it (spec, section 7). Esc
// cancels, as a click outside the modal does.
function FabulaHoldsDeleteModal({ state, kind, record, onMoveUp, onDeleteAll, onCancel }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);
  const held = fabulaOutlineHolding(state, kind, record);
  const count = (k) => held.filter(n => n.kind === k).length;
  const holds = fabulaJoin([count("chapter") ? fabulaCount("chapter", count("chapter")) : null, count("scene") ? fabulaCount("scene", count("scene")) : null].filter(Boolean));
  const fab = state.fabula || {};
  const story = (Array.isArray(fab.stories) ? fab.stories : []).find(st => st && st.id === record.storyId);
  const at = story ? fabulaOutlineFind(fabulaOutlineTree(state, story), record.id) : null;
  const where = at && at.parent ? `in its ${FABULA_NOUNS[at.parent.kind].one}` : "at the story's own level";
  // What points at what it holds stays when everything goes, without the
  // reference, and says so, as Delete does for the record itself.
  const pointing = fabulaInboundCountsAll(state, held.map(n => n.id), new Set([record.id, ...held.map(n => n.id)]));
  const total = pointing.reduce((a, [, n]) => a + n, 0);
  const said = fabulaJoin(pointing.map(([kk, n]) => (kk === "story" ? "the story" : fabulaCount(kk, n))));
  const warn = total ? ` ${said.charAt(0).toUpperCase()}${said.slice(1)} ${total === 1 ? "points" : "point"} at what it holds; if everything goes, ${total === 1 ? "it stays, without the reference" : "they stay, without the references"}.` : "";
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal fabula-holds-delete" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">Delete the {FABULA_NOUNS[kind].one}</div>
        <div className="modal-body">
          <p style={{ margin: "0 0 10px" }}>{fabulaRecordDeleteMessage(state, kind, record)}</p>
          <p style={{ margin: 0 }}>It holds {holds}. Move up puts what it holds in its place, {where}; Delete everything deletes it all.{warn}</p>
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onDeleteAll}>Delete everything</button>
          <button className="btn btn-accent" onClick={onMoveUp} autoFocus>Move up</button>
        </div>
      </div>
    </div>
  );
}

// ─── Fabula: Plot (v1.7 r013) ──────────────────────────────────────────────────
// The Plot tab (docs/fabula-spec.md, sections 4, 6, and 12, Drak's calls of
// 2026-10-26): the story's threads, its plot points under its structure's
// slots, and its promises and payoffs. The thread list edits the Story's
// Threads in place, a picker adding any thread, × taking one off the story,
// and + New Thread making a Plot Thread entry by its title, and it marks any
// thread the story's records use that the Story doesn't list, with a button
// that adds it. A slot is a heading and a row to fill, not a record: a plot
// point is made when one is filled, named for the slot unless it's given a
// title, and a slot holds as many as you make, in the order the arrows or a
// drag set; moving one under another heading changes its Slot. A custom
// turn, a Slot typed through Other, is a heading of its own, moved among the
// slots; a slot from another structure stays, marked, at the end. Promises
// run in the outline's order of their first setup scene, and one set up and
// never paid off is flagged. The story keeps the tab's order in its `plot`:
// `order`, its plot points' ids in order, and `turns`, each custom turn's
// name and the slot it follows (`after`, null for the top).

// The structures' slots, in order (spec, section 6).
const FABULA_STRUCTURES = {
  "Three-Act": ["Setup", "Inciting Incident", "First Plot Point", "Rising Action", "Midpoint", "Second Plot Point", "Climax", "Resolution"],
  "Freytag": ["Exposition", "Inciting Incident", "Rising Action", "Climax", "Falling Action", "Resolution", "Denouement"],
  "Hero's Journey": ["Ordinary World", "Call to Adventure", "Refusal of the Call", "Meeting the Mentor", "Crossing the Threshold", "Tests and Allies", "Approach", "Ordeal", "Reward", "The Road Back", "Resurrection", "Return"],
  "Seven-Point": ["Hook", "First Plot Turn", "First Pinch", "Midpoint", "Second Pinch", "Second Plot Turn", "Resolution"],
  "Kishotenketsu": ["Introduction (ki)", "Development (sho)", "Twist (ten)", "Reconciliation (ketsu)"],
};

const fabulaArr = (fab, slice) => (fab && Array.isArray(fab[slice]) ? fab[slice] : []);
const fabulaStoryOf = (fab, storyId) => fabulaArr(fab, "stories").find(st => st && st.id === storyId) || null;

// A story's slots: its preset's, or for Custom its Custom Slots, a blank row
// skipped and a repeat kept once; none for None or no structure.
const fabulaStorySlots = (story) => {
  const f = (story && story.fields) || {};
  const structure = selectValueOnly(f.structure);
  if (structure !== "Custom") return FABULA_STRUCTURES[structure] ? FABULA_STRUCTURES[structure].slice() : [];
  const out = [];
  (Array.isArray(f.customSlots) ? f.customSlots : []).forEach(row => {
    const name = row && typeof row.slot === "string" ? row.slot.trim() : "";
    if (name && !out.includes(name)) out.push(name);
  });
  return out;
};

// A plot point's slot by name, and whether it was typed through Other.
const fabulaSlotOf = (rec) => {
  const v = ((rec && rec.fields) || {}).slot;
  return { name: formatSelectDisplay(v).trim(), typed: !!v && typeof v === "object" && v.value === "Other" };
};

// The story's plot, cleaned: order and turns.
const fabulaPlotOf = (story) => {
  const p = story && story.plot && typeof story.plot === "object" && !Array.isArray(story.plot) ? story.plot : {};
  return {
    order: (Array.isArray(p.order) ? p.order : []).filter(id => typeof id === "string" && id),
    turns: (Array.isArray(p.turns) ? p.turns : []).filter(t => t && typeof t.name === "string" && t.name).map(t => ({ name: t.name, after: typeof t.after === "string" ? t.after : null })),
  };
};

// The Plot tab's headings in order, each with its plot points in order: a
// custom turn whose slot is null at the top, then each slot of the
// structure followed by the turns that follow it, then any turn whose slot
// this structure lacks or that has none stored, then a slot from another
// structure, by name, and last the plot points with no slot. kind is slot,
// turn, other (not part of this structure), or none.
const fabulaPlotHeadings = (state, story) => {
  const fab = (state && state.fabula) || {};
  const slots = fabulaStorySlots(story);
  const slotSet = new Set(slots);
  const plot = fabulaPlotOf(story);
  const rank = new Map(plot.order.map((id, i) => [id, i]));
  const at = (r) => (rank.has(r.id) ? rank.get(r.id) : Infinity);
  const points = fabulaArr(fab, "plotPoints").filter(r => r && r.id && story && r.storyId === story.id).slice()
    .sort((a, b) => (at(a) - at(b)) || String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  const groups = new Map();
  points.forEach(r => {
    const { name, typed } = fabulaSlotOf(r);
    if (!groups.has(name)) groups.set(name, { name, typed: false, points: [] });
    const g = groups.get(name);
    g.points.push(r);
    if (typed) g.typed = true;
  });
  const isTurn = (g) => g.name && !slotSet.has(g.name) && g.typed;
  const turnSet = new Set([...groups.values()].filter(isTurn).map(g => g.name));
  const follow = new Map();
  const placed = new Set();
  const put = (anchor, name) => { if (!follow.has(anchor)) follow.set(anchor, []); follow.get(anchor).push(name); placed.add(name); };
  plot.turns.forEach(t => { if (turnSet.has(t.name) && !placed.has(t.name)) put(t.after === null ? "" : (slotSet.has(t.after) ? t.after : null), t.name); });
  turnSet.forEach(name => { if (!placed.has(name)) put(null, name); });
  const heading = (name, kind) => ({ name, kind, points: groups.has(name) ? groups.get(name).points : [] });
  const out = [];
  (follow.get("") || []).forEach(n => out.push(heading(n, "turn")));
  slots.forEach(s => { out.push(heading(s, "slot")); (follow.get(s) || []).forEach(n => out.push(heading(n, "turn"))); });
  (follow.get(null) || []).forEach(n => out.push(heading(n, "turn")));
  [...groups.values()].filter(g => g.name && !slotSet.has(g.name) && !g.typed).sort((a, b) => a.name.localeCompare(b.name)).forEach(g => out.push(heading(g.name, "other")));
  if (groups.has("")) out.push(heading("", "none"));
  return out;
};

// A heading takes plot points when it's a slot of the structure or a turn.
const fabulaPlotTakes = (h) => !!h && (h.kind === "slot" || h.kind === "turn");

// The plot a list of headings stores: the plot points' ids in order, and
// each turn with the slot it follows.
const fabulaPlotFrom = (headings) => {
  const order = [], turns = [];
  let lastSlot = null;
  headings.forEach(h => {
    h.points.forEach(r => order.push(r.id));
    if (h.kind === "slot") lastSlot = h.name;
    else if (h.kind === "turn") turns.push({ name: h.name, after: lastSlot });
  });
  return { order, turns };
};

const fabulaPlotClone = (headings) => headings.map(h => ({ ...h, points: h.points.slice() }));

// The arrows on a plot point: up or down past its neighbor in its heading,
// or from a heading's edge to the end of the heading above or the start of
// the one below that takes plot points. { headings, moved } where moved is
// { id, heading } when the plot point changes heading, or null where the
// move isn't allowed.
const fabulaPlotMove = (headings, id, dir) => {
  const hs = fabulaPlotClone(headings);
  const hi = hs.findIndex(h => h.points.some(r => r.id === id));
  if (hi === -1) return null;
  const pts = hs[hi].points;
  const pi = pts.findIndex(r => r.id === id);
  const j = dir === "up" ? pi - 1 : pi + 1;
  if (j >= 0 && j < pts.length) { [pts[pi], pts[j]] = [pts[j], pts[pi]]; return { headings: hs, moved: null }; }
  const step = dir === "up" ? -1 : 1;
  for (let k = hi + step; k >= 0 && k < hs.length; k += step) {
    if (!fabulaPlotTakes(hs[k])) continue;
    const [rec] = pts.splice(pi, 1);
    if (dir === "up") hs[k].points.push(rec); else hs[k].points.unshift(rec);
    return { headings: hs, moved: { id, heading: hs[k] } };
  }
  return null;
};

// A custom turn's arrows: up or down past the heading beside it, among the
// slots and the other turns.
const fabulaPlotMoveTurn = (headings, name, dir) => {
  const hs = fabulaPlotClone(headings);
  const i = hs.findIndex(h => h.kind === "turn" && h.name === name);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i === -1 || j < 0 || j >= hs.length || !fabulaPlotTakes(hs[j])) return null;
  [hs[i], hs[j]] = [hs[j], hs[i]];
  return { headings: hs, moved: null };
};

// A drag's drop. A plot point goes before or after another plot point, in
// that one's heading, or to the end of a heading dropped on; it can't go
// into a heading that doesn't take plot points, except where it already
// is. A turn goes before or after another slot or turn. Null where the drop
// isn't allowed.
const fabulaPlotDrop = (headings, drag, target, where) => {
  const hs = fabulaPlotClone(headings);
  if (drag.turn) {
    if (!target.heading || (target.heading === drag.turn && !target.point)) return null;
    const i = hs.findIndex(h => h.kind === "turn" && h.name === drag.turn);
    if (i === -1 || target.point) return null;
    const [h] = hs.splice(i, 1);
    const t = hs.findIndex(x => x.kind === target.kind && x.name === target.heading);
    if (t === -1 || !fabulaPlotTakes(hs[t])) return null;
    hs.splice(where === "before" ? t : t + 1, 0, h);
    return { headings: hs, moved: null };
  }
  const from = hs.findIndex(h => h.points.some(r => r.id === drag.id));
  if (from === -1 || drag.id === target.point) return null;
  const to = hs.findIndex(h => h.kind === target.kind && h.name === target.heading);
  if (to === -1 || (!fabulaPlotTakes(hs[to]) && to !== from)) return null;
  const pi = hs[from].points.findIndex(r => r.id === drag.id);
  const [rec] = hs[from].points.splice(pi, 1);
  const pts = hs[to].points;
  if (target.point) {
    const ti = pts.findIndex(r => r.id === target.point);
    if (ti === -1) return null;
    pts.splice(where === "before" ? ti : ti + 1, 0, rec);
  } else pts.push(rec);
  return { headings: hs, moved: to === from ? null : { id: drag.id, heading: hs[to] } };
};

// A plot point's Slot for a heading: a slot's name, or a turn's, typed
// through Other.
const fabulaSlotValue = (heading) => (heading.kind === "turn" ? { value: "Other", customText: heading.name } : { value: heading.name, customText: "" });

// Fabula with a story's plot written back from its headings, and the plot
// point that changed heading given that heading's Slot.
const fabulaPlotApply = (fab, storyId, result) => {
  const now = isoNow();
  const moved = result.moved;
  return {
    ...fab,
    stories: fabulaArr(fab, "stories").map(st => (st && st.id === storyId ? { ...st, plot: fabulaPlotFrom(result.headings), updatedAt: now } : st)),
    plotPoints: !moved ? fabulaArr(fab, "plotPoints") : fabulaArr(fab, "plotPoints").map(r => (r && r.id === moved.id ? { ...r, fields: { ...(r.fields || {}), slot: fabulaSlotValue(moved.heading) }, updatedAt: now } : r)),
  };
};

// A change to a story's plot made against Fabula as it stands: fn takes the
// headings and returns { headings, moved }, or null for no change.
const fabulaPlotEdit = (fab, storyId, fn) => {
  const story = fabulaStoryOf(fab, storyId);
  if (!story) return fab;
  const result = fn(fabulaPlotHeadings({ fabula: fab }, story));
  return result ? fabulaPlotApply(fab, storyId, result) : fab;
};

// A new plot point under a heading, by its title or, blank, the heading's
// name, written at once. A new turn's heading comes at the end, after the
// structure's last slot.
const fabulaPlotCreate = (fab, storyId, heading, title, id) => {
  const story = fabulaStoryOf(fab, storyId);
  if (!story || !heading || !heading.name) return fab;
  const now = isoNow();
  const rec = { id, storyId, name: title || heading.name, fields: { slot: fabulaSlotValue(heading) }, createdAt: now, updatedAt: now };
  const next = { ...fab, plotPoints: [...fabulaArr(fab, "plotPoints"), rec] };
  return fabulaPlotApply(next, storyId, { headings: fabulaPlotHeadings({ fabula: next }, fabulaStoryOf(next, storyId)), moved: null });
};

// The Story's Threads, and Fabula with them changed.
const fabulaStoryThreads = (story) => (story && story.fields && Array.isArray(story.fields.threads) ? story.fields.threads : []).filter(id => typeof id === "string" && id);

const fabulaWithStoryThreads = (fab, storyId, fn) => ({
  ...fab,
  stories: fabulaArr(fab, "stories").map(st => (st && st.id === storyId ? { ...st, fields: { ...(st.fields || {}), threads: fn(fabulaStoryThreads(st)) }, updatedAt: isoNow() } : st)),
});

// The template a new thread takes: the one flagged for threads (v1.7 r016),
// else the first of the Story's Threads targets the world has, or null.
const fabulaThreadTemplateId = (state) => {
  const own = fabulaRoleTemplate(state.templates, "threads");
  if (own) return own.id;
  const field = (fabulaTemplate(state, "story").fields || []).find(f => f.id === "threads");
  const ids = field && Array.isArray(field.refTemplatesId) ? field.refTemplatesId : [];
  return ids.find(id => (state.templates || []).some(t => t && t.id === id)) || null;
};

// The state with a Plot Thread entry made by its title and added to the
// story's Threads, in one change (+ New Thread).
const fabulaWithNewThread = (state, storyId, name) => {
  const title = (name || "").trim();
  const tplId = fabulaThreadTemplateId(state);
  if (!title || !tplId || !fabulaStoryOf(state.fabula || {}, storyId)) return state;
  const now = isoNow();
  const entry = { id: `ent-${slugify(title) || "thread"}-${genId().slice(-4)}`, templateId: tplId, name: title, calendarId: null, fields: {}, tags: [], createdAt: now, updatedAt: now };
  return { ...state, entries: [...(state.entries || []), entry], fabula: fabulaWithStoryThreads(state.fabula || {}, storyId, ids => [...ids, entry.id]) };
};

// Which of the story's scenes, plot points, and promises use each thread:
// thread id to { scene, plotPoint, promise } counts.
const fabulaThreadUse = (state, storyId) => {
  const fab = (state && state.fabula) || {};
  const use = new Map();
  [["scene", "scenes"], ["plotPoint", "plotPoints"], ["promise", "promises"]].forEach(([kind, slice]) => {
    fabulaArr(fab, slice).filter(r => r && r.storyId === storyId).forEach(r => {
      const ids = new Set((Array.isArray(r.fields && r.fields.threads) ? r.fields.threads : []).filter(x => typeof x === "string" && x));
      ids.forEach(t => {
        if (!use.has(t)) use.set(t, {});
        const u = use.get(t);
        u[kind] = (u[kind] || 0) + 1;
      });
    });
  });
  return use;
};

// A promise set up and never paid off, whatever its Status.
const fabulaUnpaid = (rec) => {
  const f = (rec && rec.fields) || {};
  const some = (v) => Array.isArray(v) && v.some(x => typeof x === "string" && x);
  return some(f.setupIn) && !some(f.payoffIn);
};

// The story's promises in the outline's order of their first setup scene,
// those with none after, by name.
const fabulaPromisesInOrder = (state, story) => {
  const places = fabulaOutlinePlaces(state, story.id);
  const first = (r) => Math.min(Infinity, ...(Array.isArray((r.fields || {}).setupIn) ? r.fields.setupIn : []).map(id => (places.has(id) ? places.get(id).index : Infinity)));
  const byName = (a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
  return fabulaArr(state.fabula || {}, "promises").filter(r => r && r.id && r.storyId === story.id).slice()
    .sort((a, b) => (first(a) - first(b)) || byName(a, b));
};

// The Plot tab.
function FabulaPlotTab({ state, story, isLocked, onOpenRecord, onNewRecord, onOpenEntry, onUpdateFabula, onCreateThread, onRestoreTemplate }) {
  const fab = state.fabula || {};
  const headings = fabulaPlotHeadings(state, story);
  const structure = selectValueOnly((story.fields || {}).structure);
  const slots = fabulaStorySlots(story);
  const places = fabulaOutlinePlaces(state, story.id);
  const entryById = new Map((state.entries || []).filter(e => e && e.id).map(e => [e.id, e]));
  const sceneById = new Map(fabulaArr(fab, "scenes").filter(s => s && s.id).map(s => [s.id, s]));
  const [adding, setAdding] = useState(null);
  const [addText, setAddText] = useState("");
  const [drop, setDrop] = useState(null);
  const [focusKey, setFocusKey] = useState(null);
  const dragRef = useRef(null);
  const rootRef = useRef(null);
  const skipBlurRef = useRef(false);
  useEffect(() => {
    if (!focusKey || !rootRef.current) return;
    const el = [...rootRef.current.querySelectorAll("[data-plot-key]")].find(x => x.getAttribute("data-plot-key") === focusKey);
    if (el) el.focus();
    setFocusKey(null);
  }, [focusKey]);
  const write = (fn) => { if (!isLocked) onUpdateFabula(fn); };

  // A scene as a row names it: its position, quieter, then its title.
  const sceneLabel = (id) => {
    const sc = sceneById.get(id);
    if (!sc || sc.storyId !== story.id) return null;
    const p = places.get(id);
    return <>{p && <span className="fabula-plot-position" style={{ opacity: 0.6 }}>{p.path} </span>}{sc.name || "(untitled)"}</>;
  };
  // A row's details, each kept with the dot before it, and a list of names.
  const dotted = (parts) => parts.filter(Boolean).map((p, i) => <span key={i}>{i > 0 ? "\u00a0\u00b7 " : ""}{p}</span>);
  const commas = (nodes) => nodes.map((n, i) => <span key={i}>{i > 0 ? ", " : ""}{n}</span>);
  const threadNames = (ids) => (Array.isArray(ids) ? ids : []).map(id => entryById.get(id)).filter(Boolean).map(e => e.name || "(unnamed)");

  // ---- adding in place: a plot point under a heading, a turn, a thread
  const startAdd = (where) => { if (isLocked) return; skipBlurRef.current = false; setAdding(where); setAddText(""); };
  const stopAdd = () => { setAdding(null); setAddText(""); };
  const commitAdd = (byEnter) => {
    const text = addText.trim();
    const a = adding;
    if (!a || isLocked) { stopAdd(); return; }
    // A thread's row: a title adds it and keeps the row open for the next.
    if (a.thread) {
      if (text) onCreateThread(text);
      if (byEnter) setAddText(""); else stopAdd();
      return;
    }
    // A turn's row: its name adds the turn, a heading of its own at the end,
    // with one plot point named for it.
    if (a.turn) {
      if (text) { write(f => fabulaPlotCreate(f, story.id, { name: text, kind: "turn" }, "", `fab-plotPoint-${genId()}`)); stopAdd(); }
      else if (!byEnter) stopAdd();
      return;
    }
    // A slot's row: a title adds a plot point and keeps the row open for the
    // next; Enter on an empty row adds one named for the slot and closes it.
    if (text || byEnter) write(f => fabulaPlotCreate(f, story.id, a.heading, text, `fab-plotPoint-${genId()}`));
    if (text && byEnter) setAddText(""); else stopAdd();
  };
  const addRow = (where, placeholder, hint, pad) => (
    <div className="fabula-plot-row fabula-plot-adding" style={{ padding: `5px 12px 5px ${pad}px`, background: "var(--surf)", display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 10, rowGap: 2 }}>
      <input
        className="input"
        autoFocus
        aria-label={placeholder}
        placeholder={placeholder}
        value={addText}
        onChange={e => setAddText(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") { e.preventDefault(); commitAdd(true); }
          else if (e.key === "Escape") { e.preventDefault(); skipBlurRef.current = true; stopAdd(); }
        }}
        onBlur={() => { if (skipBlurRef.current) { skipBlurRef.current = false; return; } commitAdd(false); }}
        style={{ flex: "1 1 220px", minWidth: 0, padding: "3px 8px", fontSize: 13 }}
      />
      <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{hint}</span>
    </div>
  );
  const isAdding = (pred) => !!adding && pred(adding);

  // ---- moves: the arrows, Alt with them on a focused row, and drag
  // A move is worked out against Fabula as it stands when it's written, as
  // the outline's are; key is the row that keeps the focus.
  const moveBy = (fn, key) => {
    if (isLocked || !fn(headings)) return;
    write(f => fabulaPlotEdit(f, story.id, fn));
    if (key) setFocusKey(key);
  };
  const movePoint = (id, dir) => moveBy(hs => fabulaPlotMove(hs, id, dir), id);
  const moveTurn = (name, dir) => moveBy(hs => fabulaPlotMoveTurn(hs, name, dir), `turn:${name}`);
  const whereOn = (e) => { const r = e.currentTarget.getBoundingClientRect(); return (e.clientY - r.top) / Math.max(1, r.height) < 0.5 ? "before" : "after"; };
  // A row that can be dragged, and a row that takes a drop: targetOf says
  // where on it, or null.
  const dragProps = (key, payload) => (isLocked ? {} : {
    draggable: true,
    onDragStart: (e) => { e.stopPropagation(); dragRef.current = payload; e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", key); } catch (_) {} },
    onDragEnd: () => { dragRef.current = null; setDrop(null); },
  });
  const dropProps = (key, targetOf) => (isLocked ? {} : {
    onDragOver: (e) => {
      const d = dragRef.current;
      if (!d) return;
      const t = targetOf(e);
      if (!t || !fabulaPlotDrop(headings, d, t, t.where)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (!drop || drop.key !== key || drop.where !== t.where) setDrop({ key, where: t.where });
    },
    onDrop: (e) => {
      e.preventDefault();
      const d = dragRef.current;
      const t = targetOf(e);
      dragRef.current = null;
      setDrop(null);
      if (!d || !t) return;
      moveBy(hs => fabulaPlotDrop(hs, d, t, t.where), d.turn ? `turn:${d.turn}` : d.id);
    },
  });
  const dropMark = (key) => (drop && drop.key === key ? (drop.where === "before" ? "inset 0 2px 0 var(--accent)" : drop.where === "after" ? "inset 0 -2px 0 var(--accent)" : "inset 0 0 0 1px var(--accent)") : "none");
  const typing = (e) => { const tag = e.target && e.target.tagName; return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"; };
  const onControl = (e) => !!(e.target && e.target.closest && e.target.closest("button, input, textarea, select"));
  const arrowBtn = (label, sym, ok, onClick) => (
    <button className="btn btn-ghost" style={{ padding: "1px 6px", fontSize: 11, minWidth: 24 }} disabled={!ok} onClick={onClick} aria-label={label} title={label}>{sym}</button>
  );
  const plain = { background: "none", border: "none", padding: 0, color: "inherit", font: "inherit", cursor: "pointer", textAlign: "left" };
  const plusLine = (pad, label, where) => (
    <div className="fabula-plot-add" style={{ padding: `3px 12px 6px ${pad}px`, background: "var(--surf)" }}>
      <button style={{ ...plain, fontSize: 12, color: "var(--text-dim)" }} onClick={() => startAdd(where)}>{label}</button>
    </div>
  );
  const small = { padding: "3px 10px", fontSize: 12 };
  // A row's details sit at its right while they fit beside its title, and
  // drop under it when they don't, flush left and wrapping; the row's buttons
  // keep to its right edge either way. Whatever comes last before the details
  // takes nearly all the slack on its line, so details on a line of their own
  // take that whole line.
  const metaStyle = { fontSize: 12, fontWeight: 400, color: "var(--text-dim)", marginLeft: "auto", minWidth: 0, textAlign: "left", overflowWrap: "anywhere" };
  const lead = (last) => ({ flex: last ? "1000 1 auto" : "0 1 auto", minWidth: 0 });
  const tail = { ...metaStyle, flex: "1 1 auto", display: "inline-flex", alignItems: "baseline", gap: 10, justifyContent: "flex-end", flexWrap: "nowrap" };
  const box = { display: "flex", flexDirection: "column", gap: 1, border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" };
  const sectionHead = (title, extra, buttons) => (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
      <div className="field-label"><span>{title}</span>{extra}</div>
      {!isLocked && buttons && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "baseline" }}>{buttons}</div>}
    </div>
  );
  const emptyNote = (text) => <div style={{ fontSize: 13, color: "var(--text-dim)", fontStyle: "italic" }}>{text}</div>;

  // ---- Threads
  const own = fabulaStoryThreads(story);
  const ownSet = new Set(own);
  const use = fabulaThreadUse(state, story.id);
  const USE_NOUNS = { scene: ["scene", "scenes"], plotPoint: ["plot point", "plot points"], promise: ["promise", "promises"] };
  const useOf = (id) => {
    const u = use.get(id) || {};
    return ["scene", "plotPoint", "promise"].filter(k => u[k]).map(k => `${u[k]} ${u[k] === 1 ? USE_NOUNS[k][0] : USE_NOUNS[k][1]}`).join("\u00a0\u00b7 ");
  };
  const usedElsewhere = [...use.keys()].filter(id => !ownSet.has(id) && entryById.has(id))
    .sort((a, b) => (entryById.get(a).name || "").localeCompare(entryById.get(b).name || ""));
  const threadField = (fabulaTemplate(state, "story").fields || []).find(f => f.id === "threads");
  const threadTpls = new Set(threadField && Array.isArray(threadField.refTemplatesId) ? threadField.refTemplatesId : []);
  const missing = threadField && Array.isArray(threadField.refMissing) && threadField.refMissing.length > 0 ? threadField : null;
  const pickable = (state.entries || []).filter(e => e && threadTpls.has(e.templateId) && !ownSet.has(e.id))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  const setThreads = (fn) => write(f => fabulaWithStoryThreads(f, story.id, fn));
  const threadRow = (id, marked) => {
    const e = entryById.get(id);
    const meta = useOf(id);
    return (
      <div
        key={id}
        className="stemma-index-row fabula-plot-row fabula-plot-thread"
        data-thread={id}
        data-marked={marked ? "true" : undefined}
        role="button"
        tabIndex={0}
        title="Open this thread"
        onClick={ev => { if (!onControl(ev)) onOpenEntry(id); }}
        onKeyDown={ev => { if ((ev.key === "Enter" || ev.key === " ") && ev.target === ev.currentTarget) { ev.preventDefault(); onOpenEntry(id); } }}
        style={{ padding: "9px 12px 9px 16px", background: "var(--surf)", display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 12, rowGap: 2, cursor: "pointer", borderLeft: marked ? "2px dashed var(--warn)" : "2px solid transparent" }}
      >
        <span className="fabula-plot-title" style={{ ...lead(!marked), fontSize: 14.5, fontWeight: 500, overflowWrap: "anywhere" }}>{e ? (e.name || "(unnamed)") : "(missing entry)"}</span>
        {marked && <span className="fabula-plot-mark" style={{ ...lead(true), fontSize: 12, color: "var(--warn)" }}>not in the Story's Threads</span>}
        <span style={tail}>
          {meta && <span className="fabula-plot-meta" style={{ flex: "1 1 auto", minWidth: 0 }}>{meta}</span>}
          {!isLocked && (marked
            ? <button className="btn btn-ghost" style={{ padding: "1px 8px", fontSize: 11 }} onClick={() => setThreads(ids => (ids.includes(id) ? ids : [...ids, id]))} title="Add this thread to the Story's Threads">Add to the story</button>
            : arrowBtn("Take this thread off the story", "\u00d7", true, () => setThreads(ids => ids.filter(x => x !== id))))}
        </span>
      </div>
    );
  };
  const threadsSection = (
    <div className="fabula-plot-section" data-section="threads" style={{ marginBottom: 28 }}>
      {sectionHead("Threads", null, missing ? null : [
        <select key="pick" className="input fabula-plot-thread-pick" value="" disabled={pickable.length === 0} title={pickable.length === 0 ? "Every thread the world has is on the story" : undefined} onChange={e => { const id = e.target.value; if (id) setThreads(ids => (ids.includes(id) ? ids : [...ids, id])); }} style={{ padding: "3px 28px 3px 8px", fontSize: 12, width: "auto", maxWidth: 240 }} aria-label="Add a thread to the story">
          <option value="">+ Add a thread...</option>
          {pickable.map(e => <option key={e.id} value={e.id}>{e.name || "(unnamed)"}</option>)}
        </select>,
        <button key="new" className="btn" style={small} onClick={() => startAdd({ thread: true })}>+ New Thread</button>,
      ])}
      {missing && !isLocked && (
        <div className="field-hint ref-missing-note" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span>This world has no {missing.refMissing[0]} template, so no thread can be added.</span>
          {onRestoreTemplate && (missing.refRestorable || []).map(name => (
            <button key={name} type="button" className="btn" style={{ padding: "2px 8px", fontSize: 12 }} onClick={() => onRestoreTemplate(name)}>Restore {name}</button>
          ))}
        </div>
      )}
      {own.length === 0 && usedElsewhere.length === 0 && !isAdding(a => a.thread) ? emptyNote("No threads yet.") : (
        <div style={box}>
          {own.map(id => threadRow(id, false))}
          {isAdding(a => a.thread) && addRow(adding, "The new thread's title", "Enter adds it; Esc stops", 16)}
          {usedElsewhere.map(id => threadRow(id, true))}
        </div>
      )}
    </div>
  );

  // ---- Plot Points
  // A plot point's details: its scene and its threads.
  const pointMeta = (r) => {
    const f = r.fields || {};
    const th = threadNames(f.threads);
    const parts = [typeof f.deliveredIn === "string" ? sceneLabel(f.deliveredIn) : null, th.length ? th.join(", ") : null].filter(Boolean);
    return parts.length ? dotted(parts) : null;
  };
  const headingRow = (h) => {
    const key = h.kind === "turn" ? `turn:${h.name}` : `${h.kind}:${h.name}`;
    const n = h.points.length;
    const turn = h.kind === "turn";
    const canUp = turn && !!fabulaPlotMoveTurn(headings, h.name, "up");
    const canDown = turn && !!fabulaPlotMoveTurn(headings, h.name, "down");
    const label = h.kind === "none" ? "No slot" : h.name;
    const note = h.kind === "turn" ? "your own turn" : h.kind === "other" ? "not part of this structure" : h.kind === "none" ? "no slot set" : null;
    // An empty slot fills from its own row: a click anywhere on it, or its
    // + Fill this slot, opens the row for a title under it.
    const fillable = h.kind === "slot" && n === 0 && !isLocked;
    const filling = isAdding(a => a.heading && a.heading.name === h.name && a.heading.kind === h.kind);
    const fill = () => startAdd({ heading: { name: h.name, kind: h.kind } });
    return (
      <div
        key={key}
        className={`${fillable ? "stemma-index-row " : ""}fabula-plot-heading`}
        data-plot-key={key}
        data-heading={h.name}
        data-kind={h.kind}
        title={fillable && !filling ? "Fill this slot" : undefined}
        onClick={fillable && !filling ? (e => { if (!onControl(e)) fill(); }) : undefined}
        tabIndex={turn && !isLocked ? 0 : undefined}
        onKeyDown={turn ? (e => { if (typing(e)) return; if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) { e.preventDefault(); moveTurn(h.name, e.key === "ArrowUp" ? "up" : "down"); } }) : undefined}
        {...(turn ? dragProps(key, { turn: h.name }) : {})}
        {...dropProps(key, (e) => {
          const d = dragRef.current;
          if (!d) return null;
          return d.turn ? { heading: h.name, kind: h.kind, where: whereOn(e) } : { heading: h.name, kind: h.kind, where: "into" };
        })}
        style={{ padding: "8px 12px 6px", background: "var(--bg)", display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 10, rowGap: 2, boxShadow: dropMark(key), cursor: turn && !isLocked ? "grab" : fillable && !filling ? "pointer" : "default" }}
      >
        <span className="fabula-plot-heading-name" style={{ fontSize: 11.5, letterSpacing: ".1em", textTransform: "uppercase", color: h.kind === "other" || h.kind === "none" ? "var(--text-dim)" : "var(--text)", minWidth: 0, overflowWrap: "anywhere" }}>{label}</span>
        {note && <span className="fabula-plot-heading-note" style={{ fontSize: 11.5, fontStyle: "italic", color: h.kind === "other" || h.kind === "none" ? "var(--warn)" : "var(--text-dim)" }}>{note}</span>}
        <span style={{ ...metaStyle, display: "inline-flex", gap: 10, alignItems: "baseline", justifyContent: "flex-end" }}>
          {fillable ? (!filling && <button className="fabula-plot-fill" style={{ ...plain, fontSize: 12, color: "var(--text-dim)" }} onClick={fill}>+ Fill this slot</button>)
            : <span className="fabula-plot-heading-count">{n === 0 ? "empty" : fabulaCount("plotPoint", n)}</span>}
          {turn && !isLocked && (
            <span style={{ display: "inline-flex", gap: 3 }}>
              {arrowBtn("Move this turn up", "\u2191", canUp, () => moveTurn(h.name, "up"))}
              {arrowBtn("Move this turn down", "\u2193", canDown, () => moveTurn(h.name, "down"))}
            </span>
          )}
        </span>
      </div>
    );
  };
  const pointRow = (r) => {
    const can = isLocked ? null : { up: !!fabulaPlotMove(headings, r.id, "up"), down: !!fabulaPlotMove(headings, r.id, "down") };
    const meta = pointMeta(r);
    return (
      <div
        key={r.id}
        className="stemma-index-row fabula-plot-row fabula-plot-point"
        data-plot-key={r.id}
        role="button"
        tabIndex={0}
        title="Open this plot point"
        onClick={e => { if (!onControl(e)) onOpenRecord("plotPoint", r.id); }}
        onKeyDown={e => {
          if (typing(e)) return;
          if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) { e.preventDefault(); movePoint(r.id, e.key === "ArrowUp" ? "up" : "down"); return; }
          if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); onOpenRecord("plotPoint", r.id); }
        }}
        {...dragProps(r.id, { id: r.id })}
        {...dropProps(r.id, (e) => {
          const d = dragRef.current;
          if (!d || d.turn) return null;
          const h = headings.find(x => x.points.some(p => p.id === r.id));
          return h ? { heading: h.name, kind: h.kind, point: r.id, where: whereOn(e) } : null;
        })}
        style={{ padding: "8px 12px 8px 28px", background: "var(--surf)", display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 12, rowGap: 2, cursor: "pointer", boxShadow: dropMark(r.id) }}
      >
        <span className="fabula-plot-title" style={{ ...lead(true), fontSize: 14.5, fontWeight: 500, overflowWrap: "anywhere" }}>{r.name || "(untitled)"}</span>
        <span style={tail}>
          {meta && <span className="fabula-plot-meta" style={{ flex: "1 1 auto", minWidth: 0 }}>{meta}</span>}
          {can && (
            <span style={{ display: "inline-flex", gap: 3 }}>
              {arrowBtn("Move up", "\u2191", can.up, () => movePoint(r.id, "up"))}
              {arrowBtn("Move down", "\u2193", can.down, () => movePoint(r.id, "down"))}
            </span>
          )}
        </span>
      </div>
    );
  };
  const noSlotsNote = !structure ? "No structure chosen yet. Pick one on the Story tab for its slots, or add a turn of your own."
    : structure === "None" ? "The structure is None: no slots, only turns of your own."
      : structure === "Custom" && slots.length === 0 ? "The structure is Custom, and its Custom Slots are empty. Add them on the Story tab, or add a turn of your own."
        : null;
  const pointsSection = (
    <div className="fabula-plot-section" data-section="points" style={{ marginBottom: 28 }}>
      {sectionHead("Plot Points", structure ? <span className="fabula-plot-structure" style={{ textTransform: "none", letterSpacing: 0, fontSize: 12, color: "var(--text-dim)" }}>{"\u00b7 "}{structure}</span> : null, [
        <button key="turn" className="btn" style={small} onClick={() => startAdd({ turn: true })}>+ Custom turn</button>,
      ])}
      {noSlotsNote && <div className="fabula-plot-note" style={{ fontSize: 13, color: "var(--text-dim)", fontStyle: "italic", marginBottom: headings.length || isAdding(a => a.turn) ? 8 : 0 }}>{noSlotsNote}</div>}
      {(headings.length > 0 || isAdding(a => a.turn)) && (
        <div ref={rootRef} style={box}>
          {headings.map(h => (
            <div key={`${h.kind}:${h.name}`} role="group" aria-label={h.kind === "none" ? "No slot" : h.name} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {headingRow(h)}
              {h.points.map(r => pointRow(r))}
              {isAdding(a => a.heading && a.heading.name === h.name && a.heading.kind === h.kind) && addRow(adding, `A title, or Enter for "${h.name}"`, "Enter adds it; Esc stops", 28)}
              {fabulaPlotTakes(h) && h.points.length > 0 && !isLocked && !isAdding(a => a.heading && a.heading.name === h.name && a.heading.kind === h.kind) && plusLine(28, "+ Plot point", { heading: { name: h.name, kind: h.kind } })}
            </div>
          ))}
          {isAdding(a => a.turn) && addRow(adding, "The turn's name", "Enter adds it as a heading of your own; Esc stops", 12)}
        </div>
      )}
    </div>
  );

  // ---- Promises & Payoffs
  const promises = fabulaPromisesInOrder(state, story);
  const unpaid = promises.filter(fabulaUnpaid).length;
  const scenesOf = (ids, word) => {
    const nodes = (Array.isArray(ids) ? ids : []).map(id => sceneLabel(id)).filter(Boolean);
    return nodes.length ? <>{word} {commas(nodes)}</> : null;
  };
  const promiseRow = (r) => {
    const f = r.fields || {};
    const parts = [formatSelectDisplay(f.kind), formatSelectDisplay(f.status), scenesOf(f.setupIn, "set up in"), scenesOf(f.payoffIn, "paid off in")].filter(Boolean);
    const flagged = fabulaUnpaid(r);
    return (
      <div
        key={r.id}
        className="stemma-index-row fabula-plot-row fabula-plot-promise"
        data-promise={r.id}
        data-unpaid={flagged ? "true" : undefined}
        role="button"
        tabIndex={0}
        title="Open this promise"
        onClick={() => onOpenRecord("promise", r.id)}
        onKeyDown={e => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); onOpenRecord("promise", r.id); } }}
        style={{ padding: "9px 12px 9px 16px", background: "var(--surf)", display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 12, rowGap: 2, cursor: "pointer" }}
      >
        <span className="fabula-plot-title" style={{ ...lead(!flagged), fontSize: 14.5, fontWeight: 500, overflowWrap: "anywhere" }}>{r.name || "(untitled)"}</span>
        {flagged && <span style={lead(true)}><span className="fabula-plot-unpaid" style={{ fontSize: 11, padding: "0 7px", border: "1px solid var(--danger)", borderRadius: 9, color: "var(--danger)", letterSpacing: ".04em" }}>unpaid</span></span>}
        {parts.length > 0 && <span className="fabula-plot-meta" style={{ ...metaStyle, flex: "1 1 auto" }}>{dotted(parts)}</span>}
      </div>
    );
  };
  const promisesSection = (
    <div className="fabula-plot-section" data-section="promises" style={{ marginBottom: 28 }}>
      {sectionHead("Promises & Payoffs", unpaid ? <span className="fabula-plot-unpaid-count" style={{ textTransform: "none", letterSpacing: 0, fontSize: 12, color: "var(--danger)" }}>{"\u00b7 "}{unpaid} unpaid</span> : null, [
        <button key="new" className="btn" style={small} onClick={() => onNewRecord("promise")}>+ New {FABULA_NOUNS.promise.add}</button>,
      ])}
      {promises.length === 0 ? emptyNote("No promises yet.") : <div style={box}>{promises.map(promiseRow)}</div>}
    </div>
  );

  return (
    <div className="fabula-plot">
      {threadsSection}
      {pointsSection}
      {promisesSection}
    </div>
  );
}

// ─── Fabula: Notes (v1.7 r014) ─────────────────────────────────────────────────
// The Notes tab (docs/fabula-spec.md, sections 4 and 5.11, Drak's calls of
// 2026-10-26): the story's research notes by topic, A to Z, each opening on
// a page of its own. A note whose Open Questions holds any text is flagged
// open wherever its row appears, in a color quieter than an unpaid promise's
// red, and the tab's heading counts them; emptying the field clears the
// flag. A scene's page lists, under its fields, the notes whose Used In
// names it: read-only, changed from the note's side, and worked out each
// time the page is drawn, so nothing is stored.

// A note with open questions: its Open Questions holds any text.
const fabulaNoteOpen = (rec) => {
  const q = rec && rec.fields ? rec.fields.openQuestions : null;
  return typeof q === "string" && q.trim() !== "";
};

// A story's research notes by topic, A to Z; given a scene, only the notes
// whose Used In names it.
const fabulaNotesOf = (state, storyId, sceneId) => {
  const byName = (a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
  const usedIn = (r) => Array.isArray((r.fields || {}).usedIn) && r.fields.usedIn.includes(sceneId);
  return fabulaArr((state && state.fabula) || {}, "research")
    .filter(r => r && r.id && r.storyId === storyId && (!sceneId || usedIn(r)))
    .slice().sort(byName);
};

// The open flag.
const fabulaOpenFlag = () => (
  <span className="fabula-note-open" title="This note has open questions" style={{ fontSize: 11, padding: "0 7px", border: "1px solid var(--accent)", borderRadius: 9, color: "var(--accent)", letterSpacing: ".04em" }}>open</span>
);

// The Notes tab.
function FabulaNotesTab({ state, story, isLocked, onOpenRecord, onNewRecord }) {
  const fab = state.fabula || {};
  const notes = fabulaNotesOf(state, story.id);
  const open = notes.filter(fabulaNoteOpen).length;
  const places = fabulaOutlinePlaces(state, story.id);
  const entryById = new Map((state.entries || []).filter(e => e && e.id).map(e => [e.id, e]));
  const sceneById = new Map(fabulaArr(fab, "scenes").filter(s => s && s.id && s.storyId === story.id).map(s => [s.id, s]));
  const ids = (v) => (Array.isArray(v) ? v : []).filter(x => typeof x === "string" && x);
  // A row's details, each kept with the dot before it, and a list of names
  // in the order the field holds them, as a promise's row lists its scenes;
  // a scene names itself by its position, quieter, then its title.
  const dotted = (parts) => parts.map((p, i) => <span key={i}>{i > 0 ? "\u00a0\u00b7 " : ""}{p}</span>);
  const commas = (nodes) => nodes.map((n, i) => <span key={i}>{i > 0 ? ", " : ""}{n}</span>);
  const about = (v) => ids(v).map(id => entryById.get(id)).filter(Boolean).map(e => e.name || "(unnamed)");
  const usedIn = (v) => ids(v).filter(id => sceneById.has(id)).map(id => {
    const p = places.get(id);
    return <>{p && <span className="fabula-note-position" style={{ opacity: 0.6 }}>{p.path} </span>}{sceneById.get(id).name || "(untitled)"}</>;
  });
  // The title, then the flag, take the slack on their line, so the details
  // sit at the right while they fit and drop under the title, flush left,
  // when they don't, as the Plot tab's rows do.
  const lead = (last) => ({ flex: last ? "1000 1 auto" : "0 1 auto", minWidth: 0 });
  const metaStyle = { flex: "1 1 auto", minWidth: 0, fontSize: 12, fontWeight: 400, color: "var(--text-dim)", textAlign: "left", overflowWrap: "anywhere" };
  const row = (r) => {
    const f = r.fields || {};
    const flagged = fabulaNoteOpen(r);
    const a = about(f.appliesTo), u = usedIn(f.usedIn);
    const parts = [a.length ? <>about {commas(a)}</> : null, u.length ? <>used in {commas(u)}</> : null].filter(Boolean);
    return (
      <div
        key={r.id}
        className="stemma-index-row fabula-note-row"
        data-note={r.id}
        data-open={flagged ? "true" : undefined}
        role="button"
        tabIndex={0}
        title="Open this research note"
        onClick={() => onOpenRecord("research", r.id)}
        onKeyDown={e => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); onOpenRecord("research", r.id); } }}
        style={{ padding: "9px 12px 9px 16px", background: "var(--surf)", display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 12, rowGap: 2, cursor: "pointer" }}
      >
        <span className="fabula-note-title" style={{ ...lead(!flagged), fontSize: 14.5, fontWeight: 500, overflowWrap: "anywhere" }}>{r.name || "(untitled)"}</span>
        {flagged && <span style={lead(true)}>{fabulaOpenFlag()}</span>}
        {parts.length > 0 && <span className="fabula-note-meta" style={metaStyle}>{dotted(parts)}</span>}
      </div>
    );
  };
  return (
    <div className="fabula-notes">
      <div className="fabula-notes-section" style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
          <div className="field-label">
            <span>Research Notes</span>
            {open > 0 && <span className="fabula-notes-open-count" style={{ textTransform: "none", letterSpacing: 0, fontSize: 12, color: "var(--accent)" }}>{"\u00b7 "}{open} open</span>}
          </div>
          {!isLocked && <button className="btn" style={{ padding: "3px 10px", fontSize: 12 }} onClick={() => onNewRecord("research")}>+ New {FABULA_NOUNS.research.add}</button>}
        </div>
        {notes.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--text-dim)", fontStyle: "italic" }}>No research notes yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 1, border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
            {notes.map(row)}
          </div>
        )}
      </div>
    </div>
  );
}

// A scene's research, under its fields: the notes whose Used In names it,
// by topic, each opening its note, and nothing at all when there are none.
// In edit it says where the list is changed.
function FabulaSceneResearch({ state, storyId, sceneId, editing, onOpenEntry }) {
  const notes = fabulaNotesOf(state, storyId, sceneId);
  if (notes.length === 0) return null;
  return (
    <div className="fabula-scene-research" style={{ marginTop: 26 }}>
      <div className="field-label">
        <span>Research</span>
        {editing && <span style={{ textTransform: "none", letterSpacing: 0, fontSize: 12, color: "var(--text-dim)" }}>set by each note's Used In</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1, border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
        {notes.map(r => (
          <div
            key={r.id}
            className="stemma-index-row fabula-scene-note"
            data-note={r.id}
            role="button"
            tabIndex={0}
            title="Open this research note"
            onClick={() => onOpenEntry(r.id)}
            onKeyDown={e => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); onOpenEntry(r.id); } }}
            style={{ padding: "8px 14px", background: "var(--surf)", display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 10, rowGap: 2, cursor: "pointer" }}
          >
            <span className="fabula-note-title" style={{ fontSize: 14, minWidth: 0, overflowWrap: "anywhere" }}>{r.name || "(untitled)"}</span>
            {fabulaNoteOpen(r) && fabulaOpenFlag()}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Fabula: Meaning (v1.7 r015) ───────────────────────────────────────────────
// The Meaning tab (docs/fabula-spec.md, section 4, Drak's calls of
// 2026-10-26): the story's themes and motifs, the entries its Themes lists.
// The list edits the Story's Themes in place, as Plot's thread list does: a
// picker adds any Theme / Motif entry, × takes one off the story while the
// entry stays in the world, and + New Theme makes an entry by its title and
// adds it; a theme the story's scenes carry in their Motifs that the Story
// doesn't list shows marked, with a button that adds it. A theme's row shows
// the positions of the scenes that carry it, in the outline's order, each
// opening its scene, and the themes group under their entries' Type. The
// Premise panel's Theme Statement heads the tab, read-only.

// The Story's Themes, and Fabula with them changed.
const fabulaStoryThemes = (story) => (story && story.fields && Array.isArray(story.fields.themes) ? story.fields.themes : []).filter(id => typeof id === "string" && id);

const fabulaWithStoryThemes = (fab, storyId, fn) => ({
  ...fab,
  stories: fabulaArr(fab, "stories").map(st => (st && st.id === storyId ? { ...st, fields: { ...(st.fields || {}), themes: fn(fabulaStoryThemes(st)) }, updatedAt: isoNow() } : st)),
});

// The template a new theme takes: the one flagged for themes (v1.7 r016),
// else the first of the Story's Themes targets the world has, or null.
const fabulaThemeTemplateId = (state) => {
  const own = fabulaRoleTemplate(state.templates, "themes");
  if (own) return own.id;
  const field = (fabulaTemplate(state, "story").fields || []).find(f => f.id === "themes");
  const ids = field && Array.isArray(field.refTemplatesId) ? field.refTemplatesId : [];
  return ids.find(id => (state.templates || []).some(t => t && t.id === id)) || null;
};

// The state with a Theme / Motif entry made by its title and added to the
// story's Themes, in one change (+ New Theme).
const fabulaWithNewTheme = (state, storyId, name) => {
  const title = (name || "").trim();
  const tplId = fabulaThemeTemplateId(state);
  if (!title || !tplId || !fabulaStoryOf(state.fabula || {}, storyId)) return state;
  const now = isoNow();
  const entry = { id: `ent-${slugify(title) || "theme"}-${genId().slice(-4)}`, templateId: tplId, name: title, calendarId: null, fields: {}, tags: [], createdAt: now, updatedAt: now };
  return { ...state, entries: [...(state.entries || []), entry], fabula: fabulaWithStoryThemes(state.fabula || {}, storyId, ids => [...ids, entry.id]) };
};

// The scenes that carry each theme in their Motifs: theme id to scene ids,
// in the outline's order.
const fabulaThemeScenes = (state, storyId) => {
  const places = fabulaOutlinePlaces(state, storyId);
  const at = (id) => (places.has(id) ? places.get(id).index : Number.MAX_SAFE_INTEGER);
  const out = new Map();
  fabulaArr((state && state.fabula) || {}, "scenes").filter(s => s && s.id && s.storyId === storyId).forEach(s => {
    new Set((Array.isArray((s.fields || {}).motifs) ? s.fields.motifs : []).filter(x => typeof x === "string" && x)).forEach(t => {
      if (!out.has(t)) out.set(t, []);
      out.get(t).push(s.id);
    });
  });
  out.forEach(ids => ids.sort((a, b) => at(a) - at(b)));
  return out;
};

// The Theme / Motif template's types, in its order, and their headings.
const FABULA_THEME_TYPES = [["Theme", "Themes"], ["Motif", "Motifs"], ["Symbol", "Symbols"], ["Leitmotif", "Leitmotifs"], ["Archetype", "Archetypes"]];

// An entry's Type, as its template's Type field holds it: the option, or
// what was typed through Other, or "" for none.
const fabulaThemeType = (state, entry) => {
  const tpl = entry ? (state.templates || []).find(t => t && t.id === entry.templateId) : null;
  const field = tpl ? (tpl.fields || []).find(f => f && f.label === "Type" && f.type === "select") : null;
  return field ? formatSelectDisplay((entry.fields || {})[field.id]).trim() : "";
};

// The Meaning tab.
function FabulaMeaningTab({ state, story, isLocked, showSecrets, onOpenEntry, onUpdateFabula, onCreateTheme, onRestoreTemplate }) {
  const [adding, setAdding] = useState(false);
  const [addText, setAddText] = useState("");
  const skipBlurRef = useRef(false);
  const write = (fn) => { if (!isLocked) onUpdateFabula(fn); };
  const entryById = new Map((state.entries || []).filter(e => e && e.id).map(e => [e.id, e]));
  const sceneById = new Map(fabulaArr(state.fabula || {}, "scenes").filter(s => s && s.id).map(s => [s.id, s]));
  const places = fabulaOutlinePlaces(state, story.id);
  const carried = fabulaThemeScenes(state, story.id);
  const own = fabulaStoryThemes(story);
  const ownSet = new Set(own);
  const byName = (a, b) => ((entryById.get(a) || {}).name || "").localeCompare((entryById.get(b) || {}).name || "", undefined, { sensitivity: "base" });
  const marked = [...carried.keys()].filter(id => !ownSet.has(id) && entryById.has(id));
  const storyFields = fabulaTemplate(state, "story").fields || [];
  const themeField = storyFields.find(f => f.id === "themes");
  const themeTpls = new Set(themeField && Array.isArray(themeField.refTemplatesId) ? themeField.refTemplatesId : []);
  const missing = themeField && Array.isArray(themeField.refMissing) && themeField.refMissing.length > 0 ? themeField : null;
  const pickable = (state.entries || []).filter(e => e && themeTpls.has(e.templateId) && !ownSet.has(e.id))
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }));
  const setThemes = (fn) => write(f => fabulaWithStoryThemes(f, story.id, fn));
  const onControl = (e) => !!(e.target && e.target.closest && e.target.closest("button, input, textarea, select"));
  const plain = { background: "none", border: "none", padding: 0, color: "inherit", font: "inherit", cursor: "pointer" };
  // The Theme Statement, when it holds text and isn't a secret kept hidden.
  const stmtField = storyFields.find(f => f.id === "themeStatement");
  const stmt = stmtField && !(stmtField.secret && !showSecrets) ? (story.fields || {}).themeStatement : "";
  const stmtText = typeof stmt === "string" ? stmt.trim() : "";

  // The groups: by Type, the template's five first in its order, then any
  // type of the writer's own by name, then none; inside each the Story's own
  // themes first and the marked after them, each by name.
  const groups = new Map();
  const place = (id, isMarked) => {
    const type = fabulaThemeType(state, entryById.get(id));
    const known = FABULA_THEME_TYPES.findIndex(([t]) => t.toLowerCase() === type.toLowerCase());
    const key = known >= 0 ? FABULA_THEME_TYPES[known][0] : type;
    if (!groups.has(key)) groups.set(key, { key, label: known >= 0 ? FABULA_THEME_TYPES[known][1] : (type || "No type"), rank: known >= 0 ? known : type ? 100 : 200, own: [], marked: [] });
    groups.get(key)[isMarked ? "marked" : "own"].push(id);
  };
  own.forEach(id => place(id, false));
  marked.forEach(id => place(id, true));
  const ordered = [...groups.values()].sort((a, b) => (a.rank - b.rank) || a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  ordered.forEach(g => { g.own.sort(byName); g.marked.sort(byName); });
  const headed = ordered.some(g => g.key !== "");

  // ---- adding a theme in place
  const stopAdd = () => { setAdding(false); setAddText(""); };
  const commitAdd = (byEnter) => {
    const text = addText.trim();
    if (isLocked) { stopAdd(); return; }
    if (text) onCreateTheme(text);
    if (byEnter) setAddText(""); else stopAdd();
  };

  // A row's details sit at its right while they fit beside its title, and
  // drop under it, flush left, when they don't, as the Plot tab's rows do; a
  // scene's position is underlined, dotted, since a click on it opens it.
  const lead = (last) => ({ flex: last ? "1000 1 auto" : "0 1 auto", minWidth: 0 });
  const tail = { flex: "1 1 auto", minWidth: 0, fontSize: 12, color: "var(--text-dim)", display: "inline-flex", alignItems: "baseline", gap: 10, justifyContent: "flex-end", flexWrap: "nowrap", textAlign: "left" };
  const row = (id, isMarked) => {
    const e = entryById.get(id);
    const scenes = (carried.get(id) || []).filter(sid => sceneById.has(sid));
    return (
      <div
        key={id}
        className="stemma-index-row fabula-meaning-row"
        data-theme={id}
        data-marked={isMarked ? "true" : undefined}
        role="button"
        tabIndex={0}
        title="Open this theme"
        onClick={ev => { if (!onControl(ev)) onOpenEntry(id); }}
        onKeyDown={ev => { if ((ev.key === "Enter" || ev.key === " ") && ev.target === ev.currentTarget) { ev.preventDefault(); onOpenEntry(id); } }}
        style={{ padding: "9px 12px 9px 16px", background: "var(--surf)", display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 12, rowGap: 2, cursor: "pointer", borderLeft: isMarked ? "2px dashed var(--warn)" : "2px solid transparent" }}
      >
        <span className="fabula-meaning-title" style={{ ...lead(!isMarked), fontSize: 14.5, fontWeight: 500, overflowWrap: "anywhere" }}>{e ? (e.name || "(unnamed)") : "(missing entry)"}</span>
        {isMarked && <span className="fabula-meaning-mark" style={{ ...lead(true), fontSize: 12, color: "var(--warn)" }}>not in the Story's Themes</span>}
        <span style={tail}>
          <span className="fabula-meaning-scenes" style={{ flex: "1 1 auto", minWidth: 0, overflowWrap: "anywhere" }}>
            {scenes.length === 0 ? "no scenes yet" : scenes.map((sid, i) => (
              <span key={sid}>{i > 0 ? ", " : ""}<button type="button" className="fabula-meaning-scene" style={{ ...plain, color: "var(--text)", textDecoration: "underline dotted", textDecorationColor: "var(--text-dim)", textUnderlineOffset: 3 }} title={sceneById.get(sid).name || "(untitled)"} onClick={() => onOpenEntry(sid)}>{places.has(sid) ? places.get(sid).path : "?"}</button></span>
            ))}
          </span>
          {!isLocked && (isMarked
            ? <button className="btn btn-ghost" style={{ padding: "1px 8px", fontSize: 11 }} onClick={() => setThemes(ids => (ids.includes(id) ? ids : [...ids, id]))} title="Add this theme to the Story's Themes">Add to the story</button>
            : <button className="btn btn-ghost" style={{ padding: "1px 6px", fontSize: 11, minWidth: 24 }} onClick={() => setThemes(ids => ids.filter(x => x !== id))} aria-label="Take this theme off the story" title="Take this theme off the story">{"\u00d7"}</button>)}
        </span>
      </div>
    );
  };
  const heading = (g) => (
    <div key={`h:${g.key}`} className="fabula-meaning-heading" data-type={g.key} style={{ padding: "8px 12px 6px", background: "var(--bg)", fontSize: 11.5, letterSpacing: ".1em", textTransform: "uppercase", color: g.key ? "var(--text)" : "var(--text-dim)" }}>{g.label}</div>
  );
  const addRow = (
    <div className="fabula-meaning-adding" style={{ padding: "5px 12px 5px 16px", background: "var(--surf)", display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 10, rowGap: 2 }}>
      <input
        className="input"
        autoFocus
        aria-label="The new theme's title"
        placeholder="The new theme's title"
        value={addText}
        onChange={e => setAddText(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") { e.preventDefault(); commitAdd(true); }
          else if (e.key === "Escape") { e.preventDefault(); skipBlurRef.current = true; stopAdd(); }
        }}
        onBlur={() => { if (skipBlurRef.current) { skipBlurRef.current = false; return; } commitAdd(false); }}
        style={{ flex: "1 1 220px", minWidth: 0, padding: "3px 8px", fontSize: 13 }}
      />
      <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Enter adds it; Esc stops</span>
    </div>
  );
  const empty = own.length === 0 && marked.length === 0 && !adding;
  return (
    <div className="fabula-meaning">
      {stmtText && (
        <div className="fabula-meaning-statement" style={{ marginBottom: 26 }}>
          <div className="field-label"><span>{stmtField.label || "Theme Statement"}</span></div>
          <MarkdownDisplay markdown={stmtText} entries={state.entries} templates={state.templates} bodies={state.celestialBodies} onOpenEntry={onOpenEntry} />
        </div>
      )}
      <div className="fabula-meaning-section" style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
          <div className="field-label"><span>{"Themes & Motifs"}</span></div>
          {!isLocked && !missing && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "baseline" }}>
              <select className="input fabula-meaning-pick" value="" disabled={pickable.length === 0} title={pickable.length === 0 ? "Every theme the world has is on the story" : undefined} onChange={e => { const id = e.target.value; if (id) setThemes(ids => (ids.includes(id) ? ids : [...ids, id])); }} style={{ padding: "3px 28px 3px 8px", fontSize: 12, width: "auto", maxWidth: 240 }} aria-label="Add a theme to the story">
                <option value="">+ Add a theme...</option>
                {pickable.map(e => <option key={e.id} value={e.id}>{e.name || "(unnamed)"}</option>)}
              </select>
              <button className="btn" style={{ padding: "3px 10px", fontSize: 12 }} onClick={() => { skipBlurRef.current = false; setAdding(true); setAddText(""); }}>+ New Theme</button>
            </div>
          )}
        </div>
        {missing && !isLocked && (
          <div className="field-hint ref-missing-note" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span>This world has no {missing.refMissing[0]} template, so no theme can be added.</span>
            {onRestoreTemplate && (missing.refRestorable || []).map(name => (
              <button key={name} type="button" className="btn" style={{ padding: "2px 8px", fontSize: 12 }} onClick={() => onRestoreTemplate(name)}>Restore {name}</button>
            ))}
          </div>
        )}
        {empty ? <div style={{ fontSize: 13, color: "var(--text-dim)", fontStyle: "italic" }}>No themes yet.</div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 1, border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
            {ordered.map(g => (
              <React.Fragment key={g.key}>
                {headed && heading(g)}
                {g.own.map(id => row(id, false))}
                {g.marked.map(id => row(id, true))}
              </React.Fragment>
            ))}
            {adding && addRow}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Fabula: threads and themes (v1.7 r016) ────────────────────────────────────
// Plot Thread and Theme / Motif under Fabula (docs/fabula-spec.md, section 4
// and 5.12, Drak's calls of 2026-10-26). The two stay entries and stay in
// BUILTIN_TEMPLATES, which seeds, upgrades, restores, and resets them; a flag
// on each world's copy, fabulaRole ("threads" or "themes"), keeps them out of
// the sidebar's Templates list and Restore Built-ins, and Fabula's index
// lists them in two sections after the stories. An entry of theirs keeps the
// ordinary entry page, which lists the stories that use it, and whatever
// would land on its template's list page lands on its section instead.

// The template a world keeps for one of the two, or null.
const fabulaRoleTemplate = (templates, role) =>
  (Array.isArray(templates) ? templates : []).find(t => t && t.fabulaRole === role) || null;

// The built-in a role belongs to, and the role a built-in's name carries.
const fabulaRoleBuiltin = (role) => BUILTIN_TEMPLATES.find(b => b.fabulaRole === role) || null;
const fabulaRoleOfName = (name) => (BUILTIN_TEMPLATES.find(b => b.fabulaRole && b.name === name) || {}).fabulaRole || null;

// migrate()'s flagging, every load. A world with no template flagged for one
// of the two flags one: the built-in, edited or not; failing that, the
// built-in under a name the user gave it, known by the id it was seeded with
// (tpl-<slug>- and four characters, which a rename leaves alone); failing
// that, a template of the user's own with the exact name that no pack holds,
// the one Fabula's pickers find by name where the built-in is gone. A world
// with two flagged for one keeps the first, the built-in if either is, and
// the others go back to the sidebar, and a flag that names neither goes. So
// the first load from r016 on flags them, and every later load changes
// nothing.
const fabulaFlagTemplates = (state) => {
  const templates = Array.isArray(state && state.templates) ? state.templates : [];
  const owners = BUILTIN_TEMPLATES.filter(b => b.fabulaRole);
  const roles = new Set(owners.map(b => b.fabulaRole));
  templates.forEach(t => { if (t && Object.prototype.hasOwnProperty.call(t, "fabulaRole") && !roles.has(t.fabulaRole)) delete t.fabulaRole; });
  const packed = new Set((Array.isArray(state.packs) ? state.packs : []).flatMap(p => (p && Array.isArray(p.templateIds) ? p.templateIds : [])));
  owners.forEach(b => {
    const flagged = templates.filter(t => t && t.fabulaRole === b.fabulaRole);
    if (flagged.length > 0) {
      const keep = flagged.find(t => t.origin === TEMPLATE_ORIGIN.BUILTIN) || flagged[0];
      flagged.forEach(t => { if (t !== keep) delete t.fabulaRole; });
      return;
    }
    const pre = `tpl-${slugify(b.name)}-`;
    const pick = templates.find(t => t && t.origin === TEMPLATE_ORIGIN.BUILTIN && t.name === b.name)
      || templates.find(t => t && t.origin === TEMPLATE_ORIGIN.BUILTIN && typeof t.id === "string" && t.id.startsWith(pre) && t.id.length === pre.length + 4)
      || templates.find(t => t && t.origin !== TEMPLATE_ORIGIN.BUILTIN && t.name === b.name && !packed.has(t.id));
    if (pick) pick.fabulaRole = b.fabulaRole;
  });
};

// The stories in the index's order: each corpus by name with its stories in
// reading order, then the stories in no corpus by name, as FabulaIndexView
// lists them, each story once.
const fabulaIndexStories = (state) => {
  const fab = (state && state.fabula) || {};
  const byName = (a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
  const corpora = fabulaArr(fab, "corpora").filter(c => c && c.id).slice().sort(byName);
  const stories = fabulaArr(fab, "stories").filter(st => st && st.id);
  const storyById = new Map(stories.map(st => [st.id, st]));
  const corpusOf = new Map();
  corpora.forEach(c => (c.storyIds || []).forEach(id => { if (storyById.has(id) && !corpusOf.has(id)) corpusOf.set(id, c.id); }));
  const out = [];
  const seen = new Set();
  const put = (st) => { if (st && !seen.has(st.id)) { seen.add(st.id); out.push(st); } };
  corpora.forEach(c => (c.storyIds || []).forEach(id => { if (corpusOf.get(id) === c.id) put(storyById.get(id)); }));
  stories.filter(st => !corpusOf.has(st.id)).sort(byName).forEach(put);
  return out;
};

// For one of the two, the stories that use each entry, in the index's order.
// A story uses an entry when its own Threads or Themes names it, or any of
// its records does: a scene's, a plot point's, or a promise's Threads, or a
// scene's Motifs (spec, 5.12). Entry id to stories.
const fabulaRoleStories = (state, role) => {
  const fab = (state && state.fabula) || {};
  const order = fabulaIndexStories(state);
  const rank = new Map(order.map((st, i) => [st.id, i]));
  const use = new Map();
  const add = (eid, sid) => {
    if (typeof eid !== "string" || !eid || !rank.has(sid)) return;
    if (!use.has(eid)) use.set(eid, new Set());
    use.get(eid).add(sid);
  };
  order.forEach(st => (role === "threads" ? fabulaStoryThreads(st) : fabulaStoryThemes(st)).forEach(eid => add(eid, st.id)));
  const fields = role === "threads" ? [["scenes", "threads"], ["plotPoints", "threads"], ["promises", "threads"]] : [["scenes", "motifs"]];
  fields.forEach(([slice, fid]) => fabulaArr(fab, slice).forEach(r => {
    const v = r && r.fields ? r.fields[fid] : null;
    if (Array.isArray(v)) v.forEach(eid => add(eid, r.storyId));
  }));
  const out = new Map();
  use.forEach((ids, eid) => out.set(eid, [...ids].sort((a, b) => rank.get(a) - rank.get(b)).map(id => order[rank.get(id)])));
  return out;
};

// One entry's run, story by story, for its page (spec, 5.12): each story that
// uses it, in the index's order, whether the story's own list names it, the
// scenes that name it in the outline's order, and for a thread the plot
// points and promises that name it, each in the Plot tab's order.
const fabulaEntryRuns = (state, entryId, role) => {
  const fab = (state && state.fabula) || {};
  const names = (r, fid) => { const v = r && r.fields ? r.fields[fid] : null; return Array.isArray(v) && v.includes(entryId); };
  const field = role === "threads" ? "threads" : "motifs";
  return fabulaIndexStories(state).map(story => {
    const own = (role === "threads" ? fabulaStoryThreads(story) : fabulaStoryThemes(story)).includes(entryId);
    const places = fabulaOutlinePlaces(state, story.id);
    const at = (id) => (places.has(id) ? places.get(id).index : Number.MAX_SAFE_INTEGER);
    const scenes = fabulaArr(fab, "scenes").filter(s => s && s.id && s.storyId === story.id && names(s, field)).sort((a, b) => at(a.id) - at(b.id));
    const plotPoints = role === "threads" ? fabulaPlotHeadings(state, story).flatMap(h => h.points).filter(r => names(r, "threads")) : [];
    const promises = role === "threads" ? fabulaPromisesInOrder(state, story).filter(r => names(r, "threads")) : [];
    return { story, own, places, scenes, plotPoints, promises };
  }).filter(u => u.own || u.scenes.length > 0 || u.plotPoints.length > 0 || u.promises.length > 0);
};

// The index's two sections, Plot Threads then Themes & Motifs (spec, section
// 4). sections carries what App hands them: the section to scroll to
// (focus), and the handlers for a row, + New Entry, Edit Template, Export,
// and Restore.
function FabulaTemplateSections({ state, isLocked, sections }) {
  return <>{["threads", "themes"].map(role => <FabulaTemplateSection key={role} state={state} isLocked={isLocked} role={role} {...sections} />)}</>;
}

// One section: its template's entries by name, each row naming the stories
// that use it, or saying none does; a click anywhere on a row opens the
// entry. A world without the template says so and offers Restore, and in Lock
// Mode no button shows.
function FabulaTemplateSection({ state, role, isLocked, focus, onFocused, onOpenEntry, onNewEntry, onEditTemplate, onExportTemplate, onRestoreTemplate }) {
  const ref = useRef(null);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    if (focus !== role) return;
    if (ref.current && ref.current.scrollIntoView) ref.current.scrollIntoView({ block: "start" });
    if (onFocused) onFocused();
  }, [focus]);
  const tpl = fabulaRoleTemplate(state.templates, role);
  const builtin = fabulaRoleBuiltin(role);
  const threads = role === "threads";
  const title = threads ? "Plot Threads" : "Themes & Motifs";
  const byName = (a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
  const entries = tpl ? (state.entries || []).filter(e => e && e.templateId === tpl.id).slice().sort(byName) : [];
  const stories = fabulaRoleStories(state, role);
  const small = { padding: "3px 10px", fontSize: 12 };
  // A row's details sit at its right while they fit beside its title, and
  // drop under it, flush left, when they don't, as the Plot tab's rows do.
  const tail = { fontSize: 12, fontWeight: 400, color: "var(--text-dim)", marginLeft: "auto", minWidth: 0, textAlign: "left", overflowWrap: "anywhere", flex: "1 1 auto", display: "inline-flex", alignItems: "baseline", justifyContent: "flex-end", flexWrap: "nowrap" };
  return (
    <div ref={ref} className="fabula-template-section" data-section={role} style={{ marginTop: 28 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
        <div className="field-label"><span>{title}</span></div>
        {!isLocked && tpl && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "baseline" }}>
            <div className="export-menu-wrap">
              <button className="btn btn-ghost" style={small} onClick={() => setMenu(o => !o)} title="Export this template as a portable file">Export ↓</button>
              {menu && <>
                <div className="menu-backdrop" onClick={() => setMenu(false)} />
                <div className="export-menu">
                  <button onClick={() => { onExportTemplate(tpl, "json"); setMenu(false); }}>Export as .template.json</button>
                  <button onClick={() => { onExportTemplate(tpl, "md"); setMenu(false); }}>Export as .template.md</button>
                </div>
              </>}
            </div>
            <button className="btn btn-ghost" style={small} onClick={() => onEditTemplate(tpl)}>Edit Template</button>
            <button className="btn" style={small} onClick={() => onNewEntry(tpl)}>+ New Entry</button>
          </div>
        )}
      </div>
      {!tpl ? (
        <div className="field-hint ref-missing-note fabula-template-missing" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <span>This world has no {builtin ? builtin.name : title} template.</span>
          {!isLocked && builtin && onRestoreTemplate && (
            <button type="button" className="btn" style={{ padding: "2px 8px", fontSize: 12 }} onClick={() => onRestoreTemplate(builtin.name)}>Restore {builtin.name}</button>
          )}
        </div>
      ) : entries.length === 0 ? (
        <div className="fabula-template-empty" style={{ fontSize: 13, color: "var(--text-dim)", fontStyle: "italic" }}>{threads ? "No plot threads yet." : "No themes or motifs yet."}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 1, border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
          {entries.map(e => {
            const sts = stories.get(e.id) || [];
            return (
              <div
                key={e.id}
                className="stemma-index-row fabula-template-row"
                data-entry={e.id}
                role="button"
                tabIndex={0}
                title={threads ? "Open this thread" : "Open this theme"}
                onClick={() => onOpenEntry(e.id)}
                onKeyDown={ev => { if ((ev.key === "Enter" || ev.key === " ") && ev.target === ev.currentTarget) { ev.preventDefault(); onOpenEntry(e.id); } }}
                style={{ padding: "9px 12px 9px 16px", background: "var(--surf)", display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 12, rowGap: 2, cursor: "pointer" }}
              >
                <span className="fabula-template-title" style={{ flex: "1000 1 auto", minWidth: 0, fontSize: 14.5, fontWeight: 500, overflowWrap: "anywhere" }}>{e.name || "(unnamed)"}</span>
                <span style={tail}>
                  <span className="fabula-template-stories" style={{ flex: "1 1 auto", minWidth: 0, fontStyle: sts.length === 0 ? "italic" : undefined }}>{sts.length === 0 ? "no story uses it" : sts.map(st => st.name || "(untitled story)").join(", ")}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// An entry's page, for one of the two: the stories that use it (spec, 5.12),
// read-only and worked out each time the page is drawn. A story's title opens
// it on the tab that lists the entry, Plot for a thread and Meaning for a
// theme, marked as that tab marks it when the story's own list leaves the
// entry out; under it, its scenes by position, each opening its scene with
// its title on hover, then a thread's plot points and promises by name, each
// opening its page. In edit the list shows as it is, noted as set in Fabula.
function FabulaEntryStories({ state, entry, role, editing, onOpenEntry, onOpenStory }) {
  if (!entry) return null;
  const threads = role === "threads";
  const runs = fabulaEntryRuns(state, entry.id, role);
  const plain = { background: "none", border: "none", padding: 0, color: "var(--text)", font: "inherit", cursor: "pointer", textAlign: "left", textDecoration: "underline dotted", textDecorationColor: "var(--text-dim)", textUnderlineOffset: 3 };
  const link = (key, label, title, onClick, cls) => (
    <button key={key} type="button" className={cls} style={plain} title={title} onClick={onClick}>{label}</button>
  );
  const commas = (nodes) => nodes.map((n, i) => <span key={i}>{i > 0 ? ", " : ""}{n}</span>);
  return (
    <div className="fabula-entry-stories" style={{ marginTop: 26 }}>
      <div className="field-label">
        <span>Stories</span>
        {editing && <span style={{ textTransform: "none", letterSpacing: 0, fontSize: 12, color: "var(--text-dim)" }}>set in Fabula</span>}
      </div>
      {runs.length === 0 ? (
        <div className="fabula-entry-stories-none" style={{ fontSize: 13, color: "var(--text-dim)", fontStyle: "italic" }}>No story uses this {threads ? "thread" : "theme"} yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 1, border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
          {runs.map(u => {
            const lines = [];
            if (u.scenes.length > 0) lines.push(["Scenes", u.scenes.map(s => link(s.id, u.places.has(s.id) ? u.places.get(s.id).path : "?", s.name || "(untitled)", () => onOpenEntry(s.id), "fabula-entry-scene"))]);
            if (u.plotPoints.length > 0) lines.push(["Plot points", u.plotPoints.map(r => link(r.id, r.name || "(untitled)", "Open this plot point", () => onOpenEntry(r.id), "fabula-entry-point"))]);
            if (u.promises.length > 0) lines.push(["Promises", u.promises.map(r => link(r.id, r.name || "(untitled)", "Open this promise", () => onOpenEntry(r.id), "fabula-entry-promise"))]);
            return (
              <div key={u.story.id} className="fabula-entry-story" data-story={u.story.id} data-marked={u.own ? undefined : "true"} style={{ padding: "9px 14px 9px 16px", background: "var(--surf)", borderLeft: u.own ? "2px solid transparent" : "2px dashed var(--warn)" }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 10, rowGap: 2 }}>
                  <button type="button" className="fabula-entry-story-title" style={{ ...plain, fontSize: 14.5, fontWeight: 500, overflowWrap: "anywhere" }} title={threads ? "Open this story's Plot tab" : "Open this story's Meaning tab"} onClick={() => onOpenStory(u.story.id, threads ? "plot" : "meaning")}>{u.story.name || "(untitled story)"}</button>
                  {!u.own && <span className="fabula-entry-story-mark" style={{ fontSize: 12, color: "var(--warn)" }}>{threads ? "not in the Story's Threads" : "not in the Story's Themes"}</span>}
                </div>
                {lines.length === 0
                  ? <div className="fabula-entry-story-line" style={{ fontSize: 12.5, color: "var(--text-dim)", marginTop: 3 }}>{threads ? "no scenes, plot points, or promises yet" : "no scenes yet"}</div>
                  : lines.map(([label, items]) => (
                    <div key={label} className="fabula-entry-story-line" data-line={label} style={{ fontSize: 12.5, color: "var(--text-dim)", marginTop: 3, overflowWrap: "anywhere" }}>
                      <span>{label}: </span>{commas(items)}
                    </div>
                  ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Fabula: templates (v1.7 r017) ─────────────────────────────────────────────
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
}