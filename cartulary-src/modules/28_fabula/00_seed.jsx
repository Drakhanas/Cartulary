
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
// (Drak, at r017's plan, 2026-10-26), and 5 since r028, when the Story took
// Brainstorm, the stemmas behind it, once stemmas were a registered source
// (r027), and three core fields' lines stopped saying the timeline will,
// r020 having built it (Drak's plan for Stemma v2, 2026-10-27).
const FABULA_SCHEMA_SEED = 5;

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
      // v1.7 r028: the stemmas behind the story, a registered source since
      // r027, named and id'd directly since the seed's target() resolves
      // templates and the two older sources alone. Not core: nothing reads it.
      f("brainstorm", "Brainstorm", "entry-ref", "The stemmas behind this story, rota or tabula; a chip opens one on its canvas.", { refTemplates: [STEMMA_REF_LABEL], refTemplatesId: [SYNTH_TPL_STEMMA], ...MANY }),
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
      ], core("The timeline marks them.")),
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
      kref("pov", "POV", "Whose point of view the scene keeps; left empty, it takes the chapter's.", "cast", core("The outline shows it, and the timeline lanes scenes by it.")),
      ref("setting", "Setting", "Where the scene happens.", PLACES),
      text("goal", "Goal", "What the POV character wants here."),
      text("conflict", "Conflict", "What's in the way."),
      pickOther("outcome", "Outcome", "How the goal comes out.", ["Yes", "No", "Yes, but", "No, and"]),
      text("turn", "Turn", "What has changed by the end."),
      pick("status", "Status", "Where the scene stands.", OUTLINE_STATUS, core("The outline shows it.")),
      f("when", "When", "calendar-date-range", "When it happens in story time, in your calendar.", core("The timeline places the scene by it.")),
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