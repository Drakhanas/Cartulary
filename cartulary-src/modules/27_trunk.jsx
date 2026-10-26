
function HomeView({ state, onOpenEntry, dirHandle }) {
  // Resolve current section from URL hash, or default to first
  const resolveFromHash = () => {
    const hash = (typeof window !== "undefined" && window.location.hash) || "";
    const m = hash.match(/^#section=([\w-]+)$/);
    if (m) {
      const found = HOME_SECTIONS.find(s => s.id === m[1]);
      if (found) return found.id;
    }
    return HOME_SECTIONS[0].id;
  };

  const [currentId, setCurrentId] = useState(resolveFromHash);
  const [tocOpen, setTocOpen] = useState(false); // mobile drawer state
  const contentRef = useRef(null);

  // Listen for browser back/forward
  useEffect(() => {
    const onPop = () => setCurrentId(resolveFromHash());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Navigate to a section: update URL hash, reset scroll, close mobile drawer
  const goTo = (id) => {
    if (id === currentId) {
      setTocOpen(false);
      return;
    }
    if (HOME_SECTIONS.find(s => s.id === id)) {
      window.history.pushState(null, "", `#section=${id}`);
      setCurrentId(id);
      setTocOpen(false);
      if (contentRef.current) contentRef.current.scrollTop = 0;
    }
  };

  const currentIdx = Math.max(0, HOME_SECTIONS.findIndex(s => s.id === currentId));
  const current = HOME_SECTIONS[currentIdx];
  const prev = currentIdx > 0 ? HOME_SECTIONS[currentIdx - 1] : null;
  const next = currentIdx < HOME_SECTIONS.length - 1 ? HOME_SECTIONS[currentIdx + 1] : null;

  const renderPrevNext = () => (
    <div className="home-prevnext">
      <button
        type="button"
        className="home-prevnext-btn home-prevnext-prev"
        onClick={() => prev && goTo(prev.id)}
        disabled={!prev}
        aria-label={prev ? `Previous: ${prev.title}` : "No previous section"}
      >
        <span className="home-prevnext-label">← Previous</span>
        {prev && <span className="home-prevnext-title">{prev.title}</span>}
      </button>
      <button
        type="button"
        className="home-prevnext-btn home-prevnext-next"
        onClick={() => next && goTo(next.id)}
        disabled={!next}
        aria-label={next ? `Next: ${next.title}` : "No next section"}
      >
        <span className="home-prevnext-label">Next →</span>
        {next && <span className="home-prevnext-title">{next.title}</span>}
      </button>
    </div>
  );

  return (
    <div className={`home-view${tocOpen ? " home-view-toc-open" : ""}`}>
      <button
        type="button"
        className="home-toc-toggle"
        onClick={() => setTocOpen(o => !o)}
        aria-expanded={tocOpen}
        aria-label={tocOpen ? "Close table of contents" : "Open table of contents"}
      >
        {tocOpen ? "✕ Close" : "☰ Contents"}
      </button>
      <aside className="home-toc">
        {HOME_SECTIONS.map(s => (
          <React.Fragment key={s.id}>
            {s.band && <div className="home-toc-band">{s.band}</div>}
            <button
              type="button"
              className={`home-toc-item ${currentId === s.id ? "active" : ""}`}
              onClick={() => goTo(s.id)}
            >
              {s.title}
            </button>
          </React.Fragment>
        ))}
      </aside>
      <div className="home-content" ref={contentRef}>
        <h1 className="home-title">Cartulary</h1>
        {current.id === "intro" && (
          <div className="home-callout">
            <div className="home-callout-hdr">First time here?</div>
            Click your world's name (<strong>{state?.world?.name || "Untitled World"}</strong>) at the top-left of the sidebar to set its name, description, calendar, and other settings. Then pick any template from the sidebar and click <strong>+ New Entry</strong> to create your first entry.
          </div>
        )}
        {renderPrevNext()}
        <section className="home-section">
          <h2 className="home-section-title">{current.title}</h2>
          <div className="md-content">
            <MarkdownDisplay markdown={current.content} entries={state?.entries || []} templates={state?.templates || []} bodies={state?.celestialBodies || []} onOpenEntry={onOpenEntry} dirHandle={dirHandle} />
          </div>
        </section>
        {renderPrevNext()}
      </div>
    </div>
  );
}

// ─── Project view (current world landing) ──────────────────────────────────────

function ProjectView({ state, onOpenEntry, dirHandle, onSelectTemplate, onChangeView, onOpenHtmlExportModal }) {
  const world = state.world;
  const entries = state.entries;
  const templates = state.templates;

  const stats = useMemo(() => {
    const tplCounts = {};
    templates.forEach(t => { tplCounts[t.id] = 0; });
    entries.forEach(e => { tplCounts[e.templateId] = (tplCounts[e.templateId] || 0) + 1; });
    const allTags = new Set();
    entries.forEach(e => (e.tags || []).forEach(t => allTags.add(t)));
    const monthsCount = world.calendar?.months?.length || 0;
    const erasCount = world.calendar?.eras?.length || 0;
    return {
      totalEntries: entries.length,
      totalTemplates: templates.length,
      totalTags: allTags.size,
      monthsCount, erasCount,
      perTemplate: templates.map(t => ({ tpl: t, count: tplCounts[t.id] || 0 })).sort((a, b) => b.count - a.count),
    };
  }, [state]);

  // Recently updated entries
  const recent = useMemo(() => {
    return [...entries]
      .filter(e => e.updatedAt)
      .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
      .slice(0, 6);
  }, [entries]);

  const tplById = Object.fromEntries(templates.map(t => [t.id, t]));

  return (
    <div className="landing-view">
      <div className="landing-hdr">{world.name || "Untitled World"}</div>
      <div className="landing-sub">
        Created {fmtDate(world.createdAt) || "—"}
        {world.updatedAt && ` · Last updated ${fmtDate(world.updatedAt)}`}
      </div>

      {world.description && (
        <div className="md-content" style={{ marginBottom: 28 }}>
          <MarkdownDisplay markdown={world.description} entries={entries} templates={templates} bodies={state.celestialBodies || []} onOpenEntry={onOpenEntry} dirHandle={dirHandle} />
        </div>
      )}

      {entries.length === 0 && (Array.isArray(state.cartographia) ? state.cartographia : []).length === 0 ? (
        <div className="landing-empty-cta">
          <div className="landing-empty-cta-hdr">Your world is empty.</div>
          <div className="landing-empty-cta-body">
            Pick a template from the sidebar — Character, Location, Faction, or any other — and click <strong>+ New Entry</strong> to create your first entry. You can also edit existing templates or build new ones to match your world's needs.
            <br /><br />
            Need help? Click <strong>◐ Home</strong> in the sidebar for the full usage guide.
          </div>
        </div>
      ) : (
        <>
          <div className="landing-section">
            <div className="landing-section-hdr">Overview</div>
            <div className="landing-stats">
              <div className="landing-stat">
                <div className="landing-stat-num">{stats.totalEntries}</div>
                <div className="landing-stat-label">Entries</div>
              </div>
              <div className="landing-stat">
                <div className="landing-stat-num">{stats.totalTemplates}</div>
                <div className="landing-stat-label">Templates</div>
              </div>
              <div className="landing-stat">
                <div className="landing-stat-num">{stats.totalTags}</div>
                <div className="landing-stat-label">Unique Tags</div>
              </div>
              <div className="landing-stat">
                <div className="landing-stat-num">{stats.monthsCount}</div>
                <div className="landing-stat-label">Calendar Months</div>
              </div>
              {stats.erasCount > 0 && (
                <div className="landing-stat">
                  <div className="landing-stat-num">{stats.erasCount}</div>
                  <div className="landing-stat-label">Eras</div>
                </div>
              )}
            </div>
          </div>

          <div className="landing-section">
            <div className="landing-section-hdr">Entries by Template</div>
            <div className="landing-tpl-grid">
              {stats.perTemplate.map(({ tpl, count }) => (
                <div key={tpl.id} className="landing-tpl-row" onClick={() => onSelectTemplate(tpl.id)}>
                  <span className="landing-tpl-icon" style={{ color: tpl.color }}>{tpl.icon}</span>
                  <span className="landing-tpl-name">{tpl.name}</span>
                  <span className="landing-tpl-count">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {recent.length > 0 && (
            <div className="landing-section">
              <div className="landing-section-hdr">Recently Updated</div>
              <div className="landing-recent">
                {recent.map(e => {
                  const tpl = tplById[e.templateId];
                  return (
                    <div key={e.id} className="landing-recent-row" onClick={() => onOpenEntry(e.id)}>
                      <span className="landing-recent-icon" style={{ color: tpl?.color }}>{tpl?.icon || "·"}</span>
                      <span className="landing-recent-name">{e.name || "(unnamed)"}</span>
                      <span className="landing-recent-tpl">{tpl?.name || ""} · {fmtDate(e.updatedAt)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="landing-section">
            <div className="landing-section-hdr">Export</div>
            <div className="landing-export-block">
              <div className="landing-export-desc">
                Generate a shareable HTML file of this world. Single self-contained file that opens in any browser; cross-references between entries become anchor links and dates render through your calendar system. Read-only — for sharing with people who don't have Cartulary. (JSON and Markdown exports still live in Settings.)
              </div>
              <button className="btn btn-accent" onClick={onOpenHtmlExportModal}>
                Export as HTML
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Fabula: the slice and its seeded schemas (v1.7 r006) ──────────────────────
// Fabula is the view for planning a story down to its scenes and their beats
// (docs/fabula-spec.md). This cut lays down its data and nothing else: no
// screen, export, or Concordance node reads it yet. Its records live in
// state.fabula, one array per kind (FABULA_KINDS, beside the node-source
// registry), and each world keeps one schema per kind in
// state.fabula.schemas, seeded here from the field tables Drak passed on
// 2026-10-25 (spec, section 5). The code grows here until the view is in,
// then moves to a module of its own by a carve. The seed's number rises when
// the seed changes, so a world's unedited schemas follow it: 2 since v1.7's
// r009, when an arc's Cast took more than one (Drak, 2026-10-25, at r009's
// pass).
const FABULA_SCHEMA_SEED = 2;

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
    arc: schema("arc", "Name", "A name for the arc, such as \"Mira's fall\".", [
      kref("cast", "Cast", "Whose arc this is; there can be more than one.", "cast", { ...CORE, ...MANY }),
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
    relationship: schema("relationship", "Name", "A name for the pair, such as \"Mira and Tomas\".", [
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
// alone. A reference the replacing seed takes more than one of keeps what it
// held, as a list of one (seed 2: an arc's Cast). Idempotent: a second load
// changes nothing.
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
    const lists = seeded[k.kind].fields.filter(fl => fl.type === "entry-ref" && fl.multi).map(fl => fl.id);
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
    return edges;
  }
  // v1.7 r009: the links that exist so far (spec, section 9), each labeled as
  // its field is: a story to its threads and themes, a cast record to its
  // character, an arc to its cast, a relationship to its two. Concordance
  // drops an edge whose other end isn't drawn.
  const links = { story: ["threads", "themes"], cast: ["character"], arc: ["cast"], relationship: ["castA", "castB"] }[k.kind];
  if (!links) return edges;
  const fields = fabulaKindFields(state, k.kind);
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

function FabulaIndexView({ state, isLocked, onOpenCorpus, onCreateCorpus, onCreateStory, onRenameStory, onDeleteStory, onSetStoryCorpus, onOpenStory }) {
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
  { id: "plot", label: "Plot", built: false, holds: "the story's plot threads, plot points, and promises and payoffs" },
  { id: "outline", label: "Outline", built: false, holds: "the story's parts, chapters, and scenes, as one ordered tree" },
  { id: "meaning", label: "Meaning", built: false, holds: "the themes and motifs the Premise panel lists" },
  { id: "notes", label: "Notes", built: false, holds: "the story's research notes" },
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
// the kind (emptyNote).
const fabulaLiveFields = (fields, templates) => {
  const { byName } = refTargetIndex(templates, false);
  const live = new Set([...templates.map(t => t && t.id).filter(Boolean), ...NODE_SOURCE_REGISTRY.map(src => src.id)]);
  const builtinHere = new Set(templates.filter(t => t && t.origin === TEMPLATE_ORIGIN.BUILTIN).map(t => t.name));
  const walk = (list) => (Array.isArray(list) ? list : []).map(fl => {
    if (!fl || typeof fl !== "object") return fl;
    let out = fl;
    if (fl.type === "entry-ref" && fl.fabulaScope) {
      const k = FABULA_KINDS.find(x => (fl.refTemplatesId || []).includes(x.id));
      if (k) out = { ...fl, emptyNote: `This story has no ${k.plural} yet.` };
    } else if (fl.type === "entry-ref" && Array.isArray(fl.refTemplates) && fl.refTemplates.length > 0) {
      const kept = (Array.isArray(fl.refTemplatesId) ? fl.refTemplatesId : []).filter(id => live.has(id));
      const named = fl.refTemplates.map(n => byName[n]).filter(Boolean);
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
const fabulaStoryNodes = (state, storyId) => {
  const fab = state.fabula || {};
  const kindIds = new Set(FABULA_KINDS.map(k => k.id));
  const inStory = new Set();
  FABULA_KINDS.forEach(k => (Array.isArray(fab[k.slice]) ? fab[k.slice] : []).forEach(r => { if (r && r.id && r.storyId === storyId) inStory.add(r.id); }));
  return getRegisteredGraphNodes(state).filter(n => !kindIds.has(n.templateId) || inStory.has(n.id));
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
// since v1.7's r009 the People tab.
function FabulaStoryPage({ state, story, draft, onDraftChange, tab, onSelectTab, onOpenRecord, onNewRecord, isLocked, folds, onToggleFold, onRestoreTemplate, showSecrets, allTags, dirHandle, flash, onOpenEntry, onSelectTag, onUpdateViewPrefs }) {
  const template = fabulaTemplate(state, "story");
  const active = draft ? "story" : (tab || "story");
  const tabs = <FabulaStoryTabs active={active} onSelect={draft ? null : onSelectTab} />;
  if (!draft && active === "people") {
    return (
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
        canvasSlot={<>{tabs}<FabulaPeopleTab state={state} story={story} isLocked={isLocked} onOpenRecord={onOpenRecord} onNewRecord={onNewRecord} /></>}
      />
    );
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
  promise: { one: "promise and payoff", many: "promises and payoffs" },
  part: { one: "part", many: "parts" },
  chapter: { one: "chapter", many: "chapters" },
  scene: { one: "scene", many: "scenes" },
  research: { one: "research note", many: "research notes" },
};

// The kinds whose records have pages of their own, so a reference opens one.
const FABULA_PAGE_KINDS = ["cast", "arc", "relationship"];

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

// A cast record's, an arc's, or a relationship's page, over its story's: its
// fields in view or, with a draft, in edit, its pickers offering the story's
// own records. A cast record whose character was deleted says so.
function FabulaRecordPage({ state, kind, record, draft, onDraftChange, storyId, isLocked, onRestoreTemplate, showSecrets, allTags, dirHandle, flash, onOpenEntry, onSelectTag, onUpdateViewPrefs }) {
  const template = fabulaTemplate(state, kind, { storyId, recordId: record.id });
  const gone = kind === "cast" ? record.characterDeleted : null;
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
        registeredNodes={fabulaStoryNodes(state, storyId)}
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
        canvasSlot={note}
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
      canvasSlot={note}
    />
  );
}