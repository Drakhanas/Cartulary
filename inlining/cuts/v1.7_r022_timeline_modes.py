"""v1.7 r022: the Fabula timeline's two other modes, Narratio and Anachronia.

Drak's three calls at r022's plan (2026-10-27), recorded in
docs/fabula-spec.md section 8 before this cut (8a743c1): the third mode
plots telling order across and story time up the side, each scene a point
at its slot at the height of its When, joined in telling order, so a book
told in order climbs and a flashback drops; it draws one line, the book's,
with the Lanes picker hidden; and the modes are named Chrono (story time,
r020's), Narratio (telling order, the outline's), and Anachronia (the
plot), after the house's Latin. Claude's defaults for the rest are in the
same section.

- 28_fabula, the timeline's data: every scene of the scope carries its slot
  in telling order, a When marked secret leaves every scene with none while
  secrets are hidden instead of leaving the scenes out, and the stories,
  acts, and chapters that hold scenes come back as bands, each with its
  label and its first and last slot.
- 28_fabula, the tab: a Mode picker beside Lanes, kept per story; Narratio's
  axis of equal slots, its scenes as blocks in Chrono's lanes, one row a
  lane, the acts (or the stories at the corpus's scope) tinted and named on
  the axis band's upper line and the chapters as dashed lines named on the
  lower; Anachronia's 300-pixel plot, story time up the side with
  Chronometric's year ticks across it, a dot or a bar a dated scene, hollow
  dots on a strip for the undated, and the dated scenes joined in telling
  order, a line a story; the Lanes picker hidden in Anachronia, the Display
  in picker in Narratio, the From and To boxes in both, and the tray in
  both, since they draw the undated scenes. Chrono draws as r020 did.
- Drak's call at r022's first pass (2026-10-27, 9d4d07e): the Timeline
  tab's controls, chart, and tray run the full width of the pane, where
  r020's staging had them in the story page's 760-pixel reading column,
  and the story's title and its tabs stay in the column. In
  13_form-engine-display, EntryView takes wide, which widens its column
  to the pane and keeps each child but one marked full in the reading
  width; in shell.html, the two rules for that; in 28_fabula, the story
  page asks for it on the Timeline tab, the tabs center themselves in it,
  and the timeline's root is the child that fills it.

Declared scope: 28_fabula, 13_form-engine-display, and shell.html.
Declarations added: FABULA_TIMELINE_MODES. Nothing in 19_chronometric
changes.

String-anchored edits; every anchor must occur exactly once. The tab is
replaced whole, from its doc comment to the end of the file. Run from
anywhere inside the repository:
    python3 inlining/cuts/v1.7_r022_timeline_modes.py
"""
from pathlib import Path

ROOT = next(p for p in Path(__file__).resolve().parents if (p / 'cartulary-src').is_dir())
FAB = ROOT / "cartulary-src" / "modules" / "28_fabula.jsx"
DISPLAY = ROOT / "cartulary-src" / "modules" / "13_form-engine-display.jsx"
SHELL = ROOT / "cartulary-src" / "shell.html"


def edit(path, pairs):
    text = path.read_text(encoding="utf-8")
    for old, new in pairs:
        n = text.count(old)
        assert n == 1, f"{path.name}: {n} occurrences of {old[:80]!r}"
        text = text.replace(old, new)
    path.write_text(text, encoding="utf-8")


HEADER_OLD = """// are Chronometric's. It only shows: a click opens a scene's page or a
// thread's entry, and nothing on it edits. Telling order, with chapters and
// parts as bands, and the third mode come at r022.
"""
HEADER_NEW = """// are Chronometric's. It only shows: a click opens a scene's page or a
// thread's entry, and nothing on it edits. Since r022 (Drak's calls of
// 2026-10-27) it has three modes: Chrono, that story time; Narratio, the
// telling order, every scene of the scope in an equal slot in the outline's
// order, with acts and chapters as bands; and Anachronia, telling order
// across against story time up the side, the scenes joined in telling order,
// so a book told in order climbs and every flashback or jump breaks the line.
"""

LANES_OLD = """// The groupings, in the picker's order.
const FABULA_TIMELINE_LANES = [["pov", "By POV"], ["thread", "By thread"], ["arc", "By arc"]];
"""
LANES_NEW = LANES_OLD + """
// The modes, in their picker's order, each with the hover that says what it
// draws (v1.7 r022).
const FABULA_TIMELINE_MODES = [
  ["chrono", "Chrono", "Story time: each scene placed by its When in your calendar"],
  ["narratio", "Narratio", "Telling order: each scene in its place in the outline, with acts and chapters as bands"],
  ["anachronia", "Anachronia", "Telling order across, story time up the side: a book told in order climbs, and every flashback or jump breaks the line"],
];
"""

DATA_DOC_OLD = """// scenes: each scene, story by story in the outline's order, with its
// position, its POV (its own, or its chapter's when it has none), its threads,
// the arcs that turn in it and how, the plot points delivered in it, its
// When on the axis or none, and the lanes it belongs to under each grouping.
// While secrets are hidden, a When marked secret leaves every scene out.
"""
DATA_DOC_NEW = """// scenes: each scene, story by story in the outline's order, which is the
// telling order, with its slot in it, its position, its POV (its own, or its
// chapter's when it has none), its threads, the arcs that turn in it and how,
// the plot points delivered in it, its When on the axis or none, and the
// lanes it belongs to under each grouping. While secrets are hidden, a When
// marked secret leaves every scene with none (whenHidden). bands (v1.7
// r022): the stories, the acts, and the chapters that hold scenes, each with
// its label and the slots of its first and last scene.
"""

WALK_OLD = """  const scenes = [];
  if (!whenHidden) stories.forEach(st => {
    const places = fabulaOutlinePlaces(state, st.id);
    const chapterOf = new Map();
    const walk = (nodes, parent) => nodes.forEach(n => {
      if (n.kind === "scene") chapterOf.set(n.id, parent && parent.kind === "chapter" ? parent.id : null);
      else walk(n.children, n);
    });
    walk(fabulaOutlineTree(state, st), null);
"""
WALK_NEW = """  const scenes = [];
  const bands = { stories: [], acts: [], chapters: [] };
  const band = (kind, list, id, label, slot) => {
    const b = list.find(x => x.id === id);
    if (b) b.last = slot;
    else list.push({ kind, id, label, first: slot, last: slot });
  };
  const partById = new Map(fabulaArr(fab, "parts").filter(x => x && x.id).map(x => [x.id, x]));
  stories.forEach(st => {
    const places = fabulaOutlinePlaces(state, st.id);
    const above = new Map();
    const walk = (nodes, act, chapter) => nodes.forEach(n => {
      if (n.kind === "scene") above.set(n.id, { act, chapter });
      else walk(n.children, n.kind === "part" ? n.id : act, n.kind === "chapter" ? n.id : chapter);
    });
    walk(fabulaOutlineTree(state, st), null, null);
"""

SCENE_OLD = """      .forEach(({ sc, place }) => {
        const f = sc.fields || {};
        const chapter = chapterById.get(chapterOf.get(sc.id));
        const pov = f.pov ? castOf(f.pov) : castOf(chapter && (chapter.fields || {}).pov);
        const threads = [...new Set((Array.isArray(f.threads) ? f.threads : []).filter(id => typeof id === "string" && id))];
        const turns = turnsByScene.get(sc.id) || [];
        scenes.push({
          id: sc.id, storyId: st.id, storyName: st.name || "(untitled)", name: sc.name || "(untitled)", path: place.path,
          when: fabulaTimelineWhen(f.when, primary, axisCal, true),
"""
SCENE_NEW = """      .forEach(({ sc, place }) => {
        const f = sc.fields || {};
        const over = above.get(sc.id) || { act: null, chapter: null };
        const chapter = chapterById.get(over.chapter);
        const act = partById.get(over.act);
        const pov = f.pov ? castOf(f.pov) : castOf(chapter && (chapter.fields || {}).pov);
        const threads = [...new Set((Array.isArray(f.threads) ? f.threads : []).filter(id => typeof id === "string" && id))];
        const turns = turnsByScene.get(sc.id) || [];
        const slot = scenes.length;
        const named = (r) => `${(places.get(r.id) || {}).path || ""} ${r.name || "(untitled)"}`.trim();
        band("story", bands.stories, st.id, st.name || "(untitled)", slot);
        if (act) band("act", bands.acts, act.id, named(act), slot);
        if (chapter) band("chapter", bands.chapters, chapter.id, named(chapter), slot);
        scenes.push({
          id: sc.id, storyId: st.id, storyName: st.name || "(untitled)", name: sc.name || "(untitled)", path: place.path, slot,
          when: whenHidden ? null : fabulaTimelineWhen(f.when, primary, axisCal, true),
"""

RETURN_OLD = """  return { corpus, wide, stories, scenes, whenHidden, lanes: { pov: povLanes, thread: threadLanes, arc: arcLanes } };
"""
RETURN_NEW = """  return { corpus, wide, stories, scenes, bands, whenHidden, lanes: { pov: povLanes, thread: threadLanes, arc: arcLanes } };
"""

# The story page: the Timeline tab fills the pane (Drak's call at r022's
# first pass), the tabs centering themselves in the reading width.
TABS_OLD = """    <div role="tablist" aria-label="Story sections" style={{ display: "flex", flexWrap: "wrap", borderBottom: "1px solid var(--border)", margin: "0 0 22px" }}>
"""
TABS_NEW = """    <div role="tablist" aria-label="Story sections" style={{ display: "flex", flexWrap: "wrap", borderBottom: "1px solid var(--border)", margin: "0 auto 22px" }}>
"""
PAGE_OLD = """  // A tab other than Story: the story's title over the tabs and the tab's
  // own content, People's lists (v1.7 r009), the Outline (r011), Plot
  // (r013), Notes (r014), Meaning (r015), or the Timeline (r020).
  const tabPage = (content) => (
    <EntryView
"""
PAGE_NEW = """  // A tab other than Story: the story's title over the tabs and the tab's
  // own content, People's lists (v1.7 r009), the Outline (r011), Plot
  // (r013), Notes (r014), Meaning (r015), or the Timeline (r020), which
  // since r022 fills the pane's width while the title and the tabs stay in
  // the reading column (wide).
  const tabPage = (content, wide) => (
    <EntryView
      wide={wide}
"""
TIMELINE_OLD = """    return tabPage(<FabulaTimelineTab state={state} story={story} showSecrets={showSecrets} prefs={timelinePrefs} onSetPrefs={onSetTimelinePrefs || (() => {})}
      onOpenScene={(s) => (onOpenRecordIn ? onOpenRecordIn("scene", s.id, s.storyId) : onOpenRecord("scene", s.id))} onOpenEntry={onOpenEntry} />);
"""
TIMELINE_NEW = """    return tabPage(<FabulaTimelineTab state={state} story={story} showSecrets={showSecrets} prefs={timelinePrefs} onSetPrefs={onSetTimelinePrefs || (() => {})}
      onOpenScene={(s) => (onOpenRecordIn ? onOpenRecordIn("scene", s.id, s.storyId) : onOpenRecord("scene", s.id))} onOpenEntry={onOpenEntry} />, true);
"""

# EntryView's wide: the column widened to the pane, every child but one
# marked entry-view-full kept in the reading width.
VIEW_OLD = """registeredNodes: nodesGiven, badgeExtra, footSlot }) {
  if (!template) return <div className="entry-view"><div className="empty">Template not found.</div></div>;
"""
VIEW_NEW = """registeredNodes: nodesGiven, badgeExtra, footSlot, wide }) {
  if (!template) return <div className="entry-view"><div className="empty">Template not found.</div></div>;
"""
VIEW_ROOT_OLD = """  const registeredNodes = nodesGiven || (state ? getRegisteredGraphNodes(state) : []);
  return (
    <div className="entry-view">
"""
VIEW_ROOT_NEW = """  const registeredNodes = nodesGiven || (state ? getRegisteredGraphNodes(state) : []);
  // v1.7 r022: wide widens the column to the pane, for Fabula's Timeline
  // tab; every child but one marked entry-view-full stays in the reading
  // width, centered as before.
  return (
    <div className={wide ? "entry-view entry-view-wide" : "entry-view"}>
"""
CSS_OLD = """.entry-view{max-width:760px;margin:0 auto;padding:26px 30px 56px}
"""
CSS_NEW = """.entry-view{max-width:760px;margin:0 auto;padding:26px 30px 56px}
.entry-view-wide{max-width:none}
.entry-view-wide>*:not(.entry-view-full){max-width:700px;margin-left:auto;margin-right:auto}
"""

TAB_START = "// The tab. prefs are its kept picks, { scope, lanes, calendarId }, which\n"

TAB_NEW = r'''// The tab. prefs are its kept picks, { scope, lanes, calendarId, mode }, which
// onSetPrefs changes; a pick that no longer applies falls back to the
// default, this story, lanes by POV, the primary calendar, Chrono. The modes
// (v1.7 r022, Drak's calls of 2026-10-27): Chrono places each scene by its
// When on a calendar's axis, r020's story time; Narratio gives each scene of
// the scope an equal slot in telling order, the outline's, in Chrono's
// lanes, with acts and chapters as bands over the chart; and Anachronia
// plots the two against each other, telling order across and story time up
// the side, the dated scenes joined in telling order, so a book told in
// order climbs and every flashback or jump breaks the line.
function FabulaTimelineTab({ state, story, showSecrets, prefs, onSetPrefs, onOpenScene, onOpenEntry }) {
  const { LEFT_GUTTER, TOP_GUTTER, LANE_HEIGHT } = CHRONO_LAYOUT;
  const PLOT_HEIGHT = 300, STRIP_HEIGHT = 24;
  const p = prefs && typeof prefs === "object" ? prefs : {};
  const calendars = Array.isArray(state.calendars) ? state.calendars.filter(c => c && c.id) : [];
  const calendarId = p.calendarId && calendars.some(c => c.id === p.calendarId) ? p.calendarId : null;
  const axisCal = getCalendar(state, calendarId);
  const lanesBy = FABULA_TIMELINE_LANES.some(([id]) => id === p.lanes) ? p.lanes : "pov";
  const mode = FABULA_TIMELINE_MODES.some(([id]) => id === p.mode) ? p.mode : "chrono";
  const chrono = mode === "chrono", narratio = mode === "narratio", anachronia = mode === "anachronia";
  const data = useMemo(() => fabulaTimelineData(state, story, p.scope === "corpus", axisCal, showSecrets), [state, story, p.scope, axisCal, showSecrets]);
  const corpusScope = data.wide;
  const SCENE = fabulaKindColor("scene"), PLOT = fabulaKindColor("plotPoint"), ARC = fabulaKindColor("arc");
  const NONE = "__none__";

  // The scenes the mode draws: while a secret When is hidden, Chrono and
  // Anachronia draw none, and Narratio draws them all with no When.
  const scenes = data.whenHidden && !narratio ? [] : data.scenes;
  const dated = scenes.filter(s => s.when);
  const undated = scenes.filter(s => !s.when);
  // The lanes, and which of them each drawn scene is in: the dated scenes in
  // Chrono, every scene of the scope in Narratio, and none in Anachronia.
  const laneScenes = narratio ? scenes : dated;
  const memberOf = (s) => (s.lanes[lanesBy].length ? s.lanes[lanesBy] : [NONE]);
  const noneName = lanesBy === "pov" ? "No POV" : lanesBy === "thread" ? "No thread" : "No arc";
  const lanes = anachronia ? [] : [...data.lanes[lanesBy], ...(laneScenes.some(s => memberOf(s)[0] === NONE) ? [{ id: NONE, name: noneName, icon: "", color: "var(--text-dim)" }] : [])];
  const bars = chrono && lanesBy === "thread";

  // The axis. Chrono's fits the dated scenes, the same under every grouping,
  // and with none, lanes by thread fit the threads' Timespans. Narratio's and
  // Anachronia's count the scope's scenes, a slot each in telling order, and
  // fit them all.
  const fit = dated.length ? dated.map(s => s.when) : (bars ? data.lanes.thread.filter(l => l.span).map(l => l.span) : []);
  const nothing = chrono ? fit.length === 0 : narratio ? scenes.length === 0 : dated.length === 0;
  const dataBounds = chrono ? chronoDataBounds(fit) : { min: 0, max: Math.max(1, scenes.length) };
  const [viewStart, setViewStart] = useState(null);
  const [viewEnd, setViewEnd] = useState(null);
  const [pan, setPan] = useState(0);
  const [zoom, setZoom] = useState(1);
  const resetView = () => { setPan(0); setZoom(1); setViewStart(null); setViewEnd(null); };
  // Changing the scope, the calendar, or the mode fits the axis again;
  // changing the grouping keeps the zoom.
  useEffect(() => { resetView(); }, [story.id, corpusScope, calendarId, mode]);
  const effStart = viewStart ?? dataBounds.min;
  const effEnd = viewEnd ?? dataBounds.max;
  const baseRange = effEnd - effStart;
  const visibleRange = baseRange / zoom;
  const visStart = effStart + pan;
  const visEnd = visStart + visibleRange;

  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(1000);
  useEffect(() => {
    const el = containerRef.current;
    const update = () => setContainerWidth((containerRef.current && containerRef.current.clientWidth) || 1000);
    update();
    if (typeof ResizeObserver === "function" && el) {
      const ro = new ResizeObserver(update);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Text widths, measured as Chronometric measures them: on a canvas in the
  // chart's fonts, and again once the page's fonts finish loading, since
  // v1.7's r021 in italic too, for the era names.
  const [fontsLoaded, setFontsLoaded] = useState(0);
  useEffect(() => {
    const fonts = document.fonts;
    if (!fonts) return undefined;
    let live = true;
    const bump = () => { if (live) setFontsLoaded(n => n + 1); };
    if (fonts.ready) fonts.ready.then(bump);
    if (fonts.addEventListener) fonts.addEventListener("loadingdone", bump);
    return () => { live = false; if (fonts.removeEventListener) fonts.removeEventListener("loadingdone", bump); };
  }, []);
  const measureText = useMemo(() => {
    const ctx = document.createElement("canvas").getContext("2d");
    const widths = new Map();
    return (text, size, italic) => {
      const key = (italic ? "i" : "") + size + "|" + text;
      if (!widths.has(key)) {
        if (ctx) ctx.font = `${italic ? "italic " : ""}${size}px "DM Sans", sans-serif`;
        widths.set(key, ctx ? ctx.measureText(text).width : text.length * size * 0.55);
      }
      return widths.get(key);
    };
  }, [fontsLoaded]);

  const chartWidth = chronoChartWidth(containerWidth);
  // The scale across: years to pixels in Chrono, slots to pixels in the others.
  const { yearsPerPx, yearToX, xToYear } = chronoScale(visStart, visibleRange, chartWidth);

  // What a scene draws, in pixels. In Chrono: a point's circle, or its
  // diamond when a plot point is delivered in it, and its name, which a
  // turn's ring moves right; a span's bar, its ~, its marks at its start, and
  // its name inside, past the marks; and where the drawing starts and ends,
  // for the rows. In Narratio: a block filling the scene's slot, inset 2
  // pixels, its marks inside it at its start and its name past them.
  const geometry = (s) => {
    const turn = s.turns.length > 0, plot = s.plotPoints.length > 0;
    if (narratio) {
      const x1 = yearToX(s.slot) + 2, x2 = yearToX(s.slot + 1) - 2;
      const bw = Math.max(2, x2 - x1);
      const inset = turn || plot ? 20 : 5;
      const room = bw - (inset - 5);
      const label = room > 50 ? chronoSpanLabel(s.name, room) : "";
      const nameWidth = label ? measureText(label, 11) : 0;
      return { kind: "block", x1, x2: x1 + bw, bw, markX: x1 + 9, nameX: x1 + inset, label, nameWidth, left: x1, right: x1 + bw };
    }
    const w = s.when;
    const x1 = yearToX(w.startYear), x2 = yearToX(w.endYear);
    if (w.kind === "point") {
      const nameX = x1 + (turn ? 12 : 8);
      const label = (w.startApprox ? "~" : "") + s.name;
      const nameWidth = measureText(label, 11);
      return { kind: "point", x1, x2: x1, markX: x1, nameX, label, nameWidth, left: x1 - (turn ? 10 : plot ? 7 : 5), right: nameX + nameWidth };
    }
    const bw = Math.max(2, x2 - x1);
    const inset = turn || plot ? 10 : 5;
    const room = bw - (inset - 5);
    const label = room > 50 ? chronoSpanLabel(s.name, room) : "";
    const nameWidth = label ? measureText(label, 11) : 0;
    let left = w.startApprox ? x1 - 8 : x1;
    if (turn) left = Math.min(left, x1 - 10); else if (plot) left = Math.min(left, x1 - 7);
    const right = Math.max(x1 + bw, nameWidth > 0 ? x1 + inset + nameWidth : -Infinity);
    return { kind: "span", x1, x2: x1 + bw, bw, markX: x1, nameX: x1 + inset, label, nameWidth, left, right };
  };

  // Each lane's scenes in the visible span, their drawings, and their rows:
  // stacked by what they draw in Chrono, under the thread's bar when it has
  // one; one row in Narratio, since no two scenes share a slot.
  const laneDraw = new Map();
  const rowsByLane = {};
  lanes.forEach(lane => {
    const evs = laneScenes.filter(s => (narratio ? !(s.slot + 1 < visStart || s.slot > visEnd) : !(s.when.endYear < visStart || s.when.startYear > visEnd)) && memberOf(s).includes(lane.id));
    const geoms = evs.map(geometry);
    const bar = bars && lane.span ? lane.span : null;
    let rows;
    if (narratio) rows = evs.map(() => 0);
    else {
      const order = geoms.map((g, i) => i).sort((a, b) => (geoms[a].left - geoms[b].left) || (a - b));
      const stacked = chronoStackRows(order.map(i => ({ left: geoms[i].left, right: geoms[i].right })), CHRONO_LAYOUT.EVENT_GAP);
      rows = new Array(evs.length);
      order.forEach((i, k) => { rows[i] = stacked[k] + (bar ? 1 : 0); });
    }
    laneDraw.set(lane.id, { evs, geoms, rows, bar });
    rowsByLane[lane.id] = bar ? [0, ...rows] : rows;
  });
  const titleText = (lane) => (lane.icon ? `${lane.icon} ${lane.name}` : lane.name);
  const titleLines = {};
  lanes.forEach(lane => { titleLines[lane.id] = chronoTitleLines(titleText(lane), (t) => measureText(t, 13), CHRONO_LAYOUT.TITLE_WIDTH, !!lane.icon); });
  const layout = chronoLaneLayout(lanes.map(l => l.id), rowsByLane, Object.fromEntries(lanes.map(l => [l.id, titleLines[l.id].length])));

  // The axis band. Chrono's: year ticks, and the era bands. Narratio's and
  // Anachronia's: the acts, or the stories at the corpus's scope, tinted as
  // eras are and named on the upper line, and the chapters as dashed lines
  // named on the lower line, each band from its first scene's slot to its
  // last's.
  const ticks = chrono ? chronoTicks(visStart, visEnd, chartWidth, axisCal) : [];
  const eraBands = chrono ? chronoEraBands(axisCal) : [];
  const upperBands = chrono ? [] : (corpusScope ? data.bands.stories : data.bands.acts);
  const chapterBands = chrono ? [] : data.bands.chapters;
  const bandX = (b) => [Math.max(LEFT_GUTTER, yearToX(Math.max(b.first, visStart))), Math.min(LEFT_GUTTER + chartWidth, yearToX(Math.min(b.last + 1, visEnd)))];

  // Anachronia's plot: story time up the side, fitted to the dated scenes'
  // Whens as Chrono's axis is, earliest at the bottom, with Chronometric's
  // year ticks across it, and the undated scenes on a strip under it.
  const yBounds = anachronia ? chronoDataBounds(dated.map(s => s.when)) : { min: 0, max: 1 };
  const yearToY = (y) => TOP_GUTTER + PLOT_HEIGHT - ((y - yBounds.min) / (yBounds.max - yBounds.min)) * PLOT_HEIGHT;
  const yTicks = anachronia ? chronoTicks(yBounds.min, yBounds.max, PLOT_HEIGHT, axisCal) : [];
  const stripY = TOP_GUTTER + PLOT_HEIGHT + 4;
  const totalHeight = anachronia ? stripY + (undated.length ? STRIP_HEIGHT : 0) + 10 : layout.totalHeight;

  // Pan by drag, as Chronometric does.
  const dragRef = useRef(null);
  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    dragRef.current = { startX: e.clientX, startPan: pan };
  };
  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current) return;
      setPan(dragRef.current.startPan - (e.clientX - dragRef.current.startX) * yearsPerPx);
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  });
  // Ctrl or Cmd and the wheel zoom around the pointer, bound natively so the
  // page's own zoom doesn't take it.
  const wheelRef = useRef({});
  wheelRef.current = { zoom, xToYear, chartWidth, baseRange, effStart };
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const handler = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const next = chronoZoomAround({ ...wheelRef.current, factor: e.deltaY < 0 ? 1.2 : 1 / 1.2, x: e.clientX - rect.left });
      setZoom(next.zoom);
      setPan(next.pan);
    };
    svg.addEventListener("wheel", handler, { passive: false });
    return () => svg.removeEventListener("wheel", handler);
  }, [nothing]);

  // The pointer over a scene lights it in every lane it's drawn in.
  const [lit, setLit] = useState(null);
  const fmt = (y) => formatCalendarDate(chronoFractionalYearToDate(y, axisCal), axisCal);
  const dateText = (w) => (w.kind === "point" ? (w.startApprox ? "~" : "") + fmt(w.startYear)
    : (w.openStarted ? "?" : (w.startApprox ? "~" : "") + fmt(w.startYear)) + " → " + (w.openEnded ? "ongoing" : (w.endApprox ? "~" : "") + fmt(w.endYear)));
  const sceneTip = (s) => [
    `${s.path ? s.path + " " : ""}${s.name}${corpusScope ? ` (${s.storyName})` : ""}`,
    s.when ? dateText(s.when) : data.whenHidden ? null : "No When",
    s.pov ? `POV: ${s.pov.name || "(unnamed)"}` : null,
    ...s.plotPoints.map(pp => `Plot point: ${pp.name}`),
    ...s.turns.map(t => `Turn, ${t.arcName}${t.shift ? `: ${t.shift}` : ""}`),
  ].filter(Boolean).join("\n");
  const open = (s) => (e) => { e.stopPropagation(); onOpenScene(s); };
  const hooks = (s) => ({
    className: "fabula-tl-event", "data-scene": s.id, "data-story": s.storyId,
    onMouseDown: open(s), onMouseEnter: () => setLit(s.id), onMouseLeave: () => setLit(x => (x === s.id ? null : x)),
    style: { cursor: "pointer" },
  });

  const sceneMark = (s, g, cy, key) => {
    const turn = s.turns.length > 0, plot = s.plotPoints.length > 0, on = lit === s.id;
    if (g.kind === "point") {
      return (
        <g key={key} {...hooks(s)} data-kind="point" data-x={g.x1}>
          {on && <circle cx={g.x1} cy={cy} r={turn ? 12 : 9} fill="none" stroke="var(--accent)" strokeWidth={2} />}
          {turn && <circle className="fabula-tl-turn" cx={g.x1} cy={cy} r={9} fill="none" stroke={ARC} strokeWidth={1.5} />}
          {plot
            ? <polygon className="fabula-tl-plot" points={fabulaDiamond(g.x1, cy, 7)} fill={PLOT} stroke="var(--bg)" strokeWidth={1.5} />
            : <circle cx={g.x1} cy={cy} r={5} fill={SCENE} stroke="var(--bg)" strokeWidth={1.5} />}
          {g.nameX + g.nameWidth <= LEFT_GUTTER + chartWidth && (
            <text x={g.nameX} y={cy + 3} fill="var(--text)" fontSize={11} fontFamily="DM Sans, sans-serif" style={{ pointerEvents: "none" }}>{g.label}</text>
          )}
          <title>{sceneTip(s)}</title>
        </g>
      );
    }
    return (
      <g key={key} {...hooks(s)} data-kind={g.kind} data-x={g.x1} data-x2={g.x2} data-slot={g.kind === "block" ? s.slot : undefined}>
        {on && <rect x={g.x1 - 3} y={cy - 10} width={g.bw + 6} height={20} fill="none" stroke="var(--accent)" strokeWidth={2} rx={3} />}
        <rect x={g.x1} y={cy - 7} width={g.bw} height={14} fill={SCENE} fillOpacity={0.65} stroke={SCENE} strokeWidth={1} rx={2} />
        {g.kind === "span" && s.when.startApprox && (
          <text x={g.x1 - 8} y={cy + 4} fill={SCENE} fontSize={11} fontFamily="DM Sans, sans-serif" style={{ pointerEvents: "none" }}>~</text>
        )}
        {turn && <circle className="fabula-tl-turn" cx={g.markX} cy={cy} r={9} fill="none" stroke={ARC} strokeWidth={1.5} />}
        {plot && <polygon className="fabula-tl-plot" points={fabulaDiamond(g.markX, cy, 7)} fill={PLOT} stroke="var(--bg)" strokeWidth={1.5} />}
        {g.label && (
          <text x={g.nameX} y={cy + 4} fill="var(--text-bright)" fontSize={11} fontFamily="DM Sans, sans-serif" style={{ pointerEvents: "none" }}>{g.label}</text>
        )}
        <title>{sceneTip(s)}</title>
      </g>
    );
  };

  const threadBar = (lane, bar, cy) => {
    if (bar.endYear < visStart || bar.startYear > visEnd) return null;
    const x1 = yearToX(bar.startYear), x2 = yearToX(bar.endYear);
    const w = Math.max(2, x2 - x1);
    return (
      <g className="fabula-tl-thread" data-thread={lane.id} data-x={x1} data-x2={x1 + w} onMouseDown={(e) => { e.stopPropagation(); onOpenEntry(lane.id); }} style={{ cursor: "pointer" }}>
        <rect x={x1} y={cy - 7} width={w} height={14} fill={lane.color} fillOpacity={0.65} stroke={lane.color} strokeWidth={1} rx={2} />
        {bar.openEnded && <text x={x2 + 2} y={cy + 4} fill={lane.color} fontSize={12} fontFamily="DM Sans, sans-serif" style={{ pointerEvents: "none" }}>→</text>}
        {bar.startApprox && <text x={x1 - 8} y={cy + 4} fill={lane.color} fontSize={11} fontFamily="DM Sans, sans-serif" style={{ pointerEvents: "none" }}>~</text>}
        <title>{lane.name}{"\n"}{lane.spanLabel}: {dateText(bar)}</title>
      </g>
    );
  };

  // Anachronia's marks: a dated scene is a dot at its slot's middle at its
  // When's height, or a bar from its start up to its end with its marks at
  // the start; an undated one a hollow dot on the strip.
  const plotMark = (s) => {
    const cx = yearToX(s.slot + 0.5);
    const turn = s.turns.length > 0, plot = s.plotPoints.length > 0, on = lit === s.id;
    if (!s.when) {
      const cy = stripY + STRIP_HEIGHT / 2;
      return (
        <g key={s.id} {...hooks(s)} data-kind="undated" data-x={cx} data-y={cy}>
          {on && <circle cx={cx} cy={cy} r={9} fill="none" stroke="var(--accent)" strokeWidth={2} />}
          <circle cx={cx} cy={cy} r={4} fill="var(--surf)" stroke={SCENE} strokeWidth={1.5} />
          <title>{sceneTip(s)}</title>
        </g>
      );
    }
    const span = s.when.kind === "span";
    const y1 = yearToY(s.when.startYear), y2 = yearToY(s.when.endYear);
    return (
      <g key={s.id} {...hooks(s)} data-kind={span ? "vbar" : "dot"} data-x={cx} data-y={y1} data-y2={span ? y2 : undefined}>
        {span && <rect x={cx - 3} y={Math.min(y1, y2)} width={6} height={Math.max(2, Math.abs(y1 - y2))} fill={SCENE} fillOpacity={0.65} stroke={SCENE} strokeWidth={1} rx={2} />}
        {on && <circle cx={cx} cy={y1} r={turn ? 12 : 9} fill="none" stroke="var(--accent)" strokeWidth={2} />}
        {turn && <circle className="fabula-tl-turn" cx={cx} cy={y1} r={9} fill="none" stroke={ARC} strokeWidth={1.5} />}
        {plot
          ? <polygon className="fabula-tl-plot" points={fabulaDiamond(cx, y1, 7)} fill={PLOT} stroke="var(--bg)" strokeWidth={1.5} />
          : <circle cx={cx} cy={y1} r={5} fill={SCENE} stroke="var(--bg)" strokeWidth={1.5} />}
        <title>{sceneTip(s)}</title>
      </g>
    );
  };
  // The line: the dated scenes joined in telling order, entering a span's
  // bar at its start and leaving at its end, with no vertex at an undated
  // scene's slot, and each story its own line at the corpus's scope.
  const lines = anachronia ? data.stories.map(st => ({
    id: st.id,
    points: dated.filter(s => s.storyId === st.id).flatMap(s => {
      const cx = yearToX(s.slot + 0.5);
      return s.when.kind === "span" ? [[cx, yearToY(s.when.startYear)], [cx, yearToY(s.when.endYear)]] : [[cx, yearToY(s.when.startYear)]];
    }),
  })).filter(l => l.points.length > 1) : [];

  const empty = narratio
    ? (corpusScope ? "No scenes in the corpus yet." : "No scenes yet.")
    : data.whenHidden ? "Every scene's When is secret, and secrets are hidden."
      : data.scenes.length === 0 ? (corpusScope ? "No scenes in the corpus yet." : "No scenes yet.")
        : (corpusScope ? "No scene in the corpus has a When yet." : "No scene has a When yet.");
  // The tray is Chrono's; the other modes draw the undated scenes.
  const trayGroups = chrono ? data.stories.map(st => ({ st, scenes: undated.filter(s => s.storyId === st.id) })).filter(g => g.scenes.length > 0) : [];
  const hues = ["rgba(200,169,110,.06)", "rgba(160,110,200,.06)", "rgba(110,158,200,.06)", "rgba(200,110,110,.06)"];

  return (
    <div className="fabula-timeline entry-view-full" ref={containerRef} style={{ marginTop: 4 }}>
      <div className="chrono-controls fabula-tl-controls">
        <div className="chrono-controls-row" style={{ rowGap: 8, columnGap: 18 }}>
          {data.corpus && (
            <span className="fabula-tl-group" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span className="chrono-controls-label">Showing</span>
              <select className="input fabula-tl-scope" aria-label="Showing" value={corpusScope ? "corpus" : "story"} onChange={e => onSetPrefs({ scope: e.target.value })} style={{ width: "auto", padding: "4px 28px 4px 8px" }}>
                <option value="story">This story</option>
                <option value="corpus">The whole corpus: {data.corpus.name || "(untitled)"}</option>
              </select>
            </span>
          )}
          <span className="fabula-tl-group" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span className="chrono-controls-label">Mode</span>
            {FABULA_TIMELINE_MODES.map(([id, label, hint]) => (
              <button key={id} type="button" className={`btn btn-small ${mode === id ? "btn-accent" : "btn-ghost"} fabula-tl-mode`} aria-pressed={mode === id} title={hint} onClick={() => onSetPrefs({ mode: id })}>{label}</button>
            ))}
          </span>
          {!anachronia && (
            <span className="fabula-tl-group" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span className="chrono-controls-label">Lanes</span>
              {FABULA_TIMELINE_LANES.map(([id, label]) => (
                <button key={id} type="button" className={`btn btn-small ${lanesBy === id ? "btn-accent" : "btn-ghost"} fabula-tl-lanes`} aria-pressed={lanesBy === id} onClick={() => onSetPrefs({ lanes: id })}>{label}</button>
              ))}
            </span>
          )}
          {calendars.length > 0 && !narratio && (
            <span className="fabula-tl-group" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
              <span className="chrono-controls-label">Display in</span>
              <select className="input fabula-tl-calendar" aria-label="Display in" value={calendarId || ""} onChange={e => onSetPrefs({ calendarId: e.target.value || null })} style={{ width: "auto", minWidth: 200, padding: "4px 28px 4px 8px" }}>
                <option value="">{(state.world.calendar && state.world.calendar.name) || "Primary"} (default)</option>
                {calendars.map(c => <option key={c.id} value={c.id}>{c.name || "(unnamed)"}</option>)}
              </select>
            </span>
          )}
        </div>
        {!nothing && (
          <div className="chrono-controls-row" style={{ borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 4 }}>
            {chrono ? (
              <>
                <span className="chrono-controls-label">Range:</span>
                <input className="input chrono-bound-input" type="number" placeholder="From year" value={viewStart ?? ""} onChange={e => setViewStart(e.target.value === "" ? null : parseInt(e.target.value))} />
                <span style={{ color: "var(--text-dim)" }}>→</span>
                <input className="input chrono-bound-input" type="number" placeholder="To year" value={viewEnd ?? ""} onChange={e => setViewEnd(e.target.value === "" ? null : parseInt(e.target.value))} />
              </>
            ) : <span className="chrono-controls-label">Zoom:</span>}
            <span style={{ flex: 1 }} />
            <button className="btn btn-ghost btn-small" onClick={() => setZoom(z => Math.min(1000, z * 1.5))}>+</button>
            <button className="btn btn-ghost btn-small" onClick={() => setZoom(z => Math.max(0.1, z / 1.5))}>−</button>
            <button className="btn btn-ghost btn-small" onClick={resetView}>Reset</button>
          </div>
        )}
      </div>

      {nothing ? (
        <div className="fabula-tl-empty" style={{ padding: "28px 16px", textAlign: "center", color: "var(--text-dim)", fontStyle: "italic", background: "var(--surf)", borderRadius: 3 }}>{empty}</div>
      ) : (
        <>
          <div className="chrono-svg-wrap fabula-tl-chart">
            <svg ref={svgRef} width={containerWidth} height={totalHeight} onMouseDown={onMouseDown} style={{ cursor: dragRef.current ? "grabbing" : "grab", userSelect: "none" }}>
              <defs>
                <clipPath id="fabula-tl-clip">
                  <rect x={LEFT_GUTTER} y={0} width={chartWidth} height={totalHeight} />
                </clipPath>
              </defs>
              {/* Chrono's era bands, their names on a line of their own above
                  the year labels, each cut to fit its band (v1.7 r021) */}
              {eraBands.map((b, i) => {
                const x1 = Math.max(LEFT_GUTTER, yearToX(Math.max(b.start, visStart)));
                const x2 = Math.min(LEFT_GUTTER + chartWidth, yearToX(Math.min(b.end, visEnd)));
                if (x2 <= x1) return null;
                return (
                  <g key={i}>
                    <rect x={x1} y={TOP_GUTTER - 36} width={x2 - x1} height={totalHeight - TOP_GUTTER + 36} fill={hues[i % hues.length]} />
                    {(x2 - x1) > 50 && (() => {
                      const full = b.era.shortName || b.era.name || "";
                      const label = chronoEraLabel(full, x2 - x1, (s) => measureText(s, 10, true));
                      return label && (
                        <text className="fabula-tl-era" x={x1 + 6} y={TOP_GUTTER - 24} fill="var(--accent-dim)" fontSize={10} fontFamily="DM Sans, sans-serif" fontStyle="italic">
                          {label}
                          {label !== full && <title>{full}</title>}
                        </text>
                      );
                    })()}
                  </g>
                );
              })}
              {/* Narratio's and Anachronia's bands (v1.7 r022): the acts, or
                  the stories at the corpus's scope, on the upper line, and
                  the chapters on the lower */}
              {upperBands.map((b, i) => {
                const [x1, x2] = bandX(b);
                if (x2 <= x1) return null;
                const label = (x2 - x1) > 50 ? chronoEraLabel(b.label, x2 - x1, (s) => measureText(s, 10, true)) : "";
                return (
                  <g key={b.id} className="fabula-tl-band" data-band={b.kind} data-id={b.id} data-first={b.first} data-last={b.last}>
                    <rect x={x1} y={TOP_GUTTER - 36} width={x2 - x1} height={totalHeight - TOP_GUTTER + 36} fill={hues[i % hues.length]} />
                    {label && (
                      <text className="fabula-tl-band-name" x={x1 + 6} y={TOP_GUTTER - 24} fill="var(--accent-dim)" fontSize={10} fontFamily="DM Sans, sans-serif" fontStyle="italic">
                        {label}
                        {label !== b.label && <title>{b.label}</title>}
                      </text>
                    )}
                  </g>
                );
              })}
              {chapterBands.map(b => {
                const [x1, x2] = bandX(b);
                if (x2 <= x1) return null;
                const lineX = yearToX(b.first);
                const label = (x2 - x1) > 50 ? chronoEraLabel(b.label, x2 - x1, (s) => measureText(s, 10)) : "";
                return (
                  <g key={b.id} className="fabula-tl-chapter" data-id={b.id} data-first={b.first} data-last={b.last}>
                    {lineX >= LEFT_GUTTER && lineX <= LEFT_GUTTER + chartWidth && (
                      <line x1={lineX} y1={TOP_GUTTER - 4} x2={lineX} y2={totalHeight - 10} stroke="var(--border2)" strokeWidth={0.7} strokeDasharray="2 4" />
                    )}
                    {label && (
                      <text className="fabula-tl-chapter-name" x={x1 + 6} y={TOP_GUTTER - 8} fill="var(--text-dim)" fontSize={10} fontFamily="DM Sans, sans-serif">
                        {label}
                        {label !== b.label && <title>{b.label}</title>}
                      </text>
                    )}
                  </g>
                );
              })}
              {/* The axis */}
              <line x1={LEFT_GUTTER} y1={TOP_GUTTER} x2={LEFT_GUTTER + chartWidth} y2={TOP_GUTTER} stroke="var(--border2)" strokeWidth={1} />
              {ticks.map((t, i) => (
                <g key={i}>
                  <line x1={yearToX(t.value)} y1={TOP_GUTTER - 4} x2={yearToX(t.value)} y2={totalHeight - 10}
                    stroke={t.major ? "var(--border2)" : "var(--border)"} strokeWidth={t.major ? 0.7 : 0.4} strokeDasharray={t.major ? "2 4" : "1 5"} />
                  <text className="fabula-tl-tick" x={yearToX(t.value)} y={TOP_GUTTER - 8} fill={t.major ? "var(--text-dim)" : "var(--text-faint, var(--text-dim))"}
                    fontSize={t.major ? 10 : 9} fontFamily="DM Sans, sans-serif" textAnchor="middle" opacity={t.major ? 1 : 0.75}>
                    {t.label}
                  </text>
                </g>
              ))}
              {/* Anachronia's axis up the side: Chronometric's year ticks
                  across the plot, labeled in the title column */}
              {yTicks.map((t, i) => (
                <g key={i} className="fabula-tl-ytick" data-value={t.value} data-y={yearToY(t.value)}>
                  <line x1={LEFT_GUTTER} y1={yearToY(t.value)} x2={LEFT_GUTTER + chartWidth} y2={yearToY(t.value)}
                    stroke={t.major ? "var(--border2)" : "var(--border)"} strokeWidth={t.major ? 0.7 : 0.4} strokeDasharray={t.major ? "2 4" : "1 5"} />
                  <text x={LEFT_GUTTER - 10} y={yearToY(t.value) + 3} fill={t.major ? "var(--text-dim)" : "var(--text-faint, var(--text-dim))"}
                    fontSize={t.major ? 10 : 9} fontFamily="DM Sans, sans-serif" textAnchor="end" opacity={t.major ? 1 : 0.75}>
                    {t.label}
                  </text>
                </g>
              ))}
              {/* The lanes */}
              {lanes.map((lane, laneIdx) => {
                const laneY = layout.offsets[lane.id];
                const h = layout.heights[lane.id] || LANE_HEIGHT;
                const d = laneDraw.get(lane.id);
                const full = titleText(lane);
                const lines = titleLines[lane.id] || [full];
                const firstY = laneY + h / 2 + 4 - (lines.length - 1) * CHRONO_LAYOUT.TITLE_LINE / 2;
                return (
                  <g key={lane.id} className="fabula-tl-lane" data-lane={lane.id} data-top={laneY} data-height={h}>
                    {laneIdx % 2 === 1 && <rect x={LEFT_GUTTER} y={laneY} width={chartWidth} height={h} fill="rgba(255,255,255,0.012)" />}
                    <text className="fabula-tl-title" x={LEFT_GUTTER - 10} y={firstY} fill={lane.color} fontSize={13} fontFamily="DM Sans, sans-serif" textAnchor="end" style={{ fontVariantEmoji: "text" }}>
                      {lines.length === 1 ? lines[0] : lines.map((line, i) => (
                        <tspan key={i} x={LEFT_GUTTER - 10} dy={i === 0 ? 0 : CHRONO_LAYOUT.TITLE_LINE}>{line}</tspan>
                      ))}
                      {lines.some(line => line.endsWith("…")) && <title>{full}</title>}
                    </text>
                    <g clipPath="url(#fabula-tl-clip)">
                      {d.bar && threadBar(lane, d.bar, chronoRowY(laneY, 0))}
                      {d.evs.map((s, i) => sceneMark(s, d.geoms[i], chronoRowY(laneY, d.rows[i]), s.id))}
                    </g>
                  </g>
                );
              })}
              {/* Anachronia's plot: the lines, then the scenes */}
              {anachronia && (
                <g className="fabula-tl-graph" clipPath="url(#fabula-tl-clip)">
                  {lines.map(l => (
                    <polyline key={l.id} className="fabula-tl-line" data-story={l.id} points={l.points.map(pt => pt.join(",")).join(" ")} fill="none" stroke={SCENE} strokeWidth={1.5} strokeLinejoin="round" style={{ pointerEvents: "none" }} />
                  ))}
                  {dated.map(plotMark)}
                  {undated.map(plotMark)}
                </g>
              )}
              {anachronia && undated.length > 0 && (
                <g className="fabula-tl-strip" data-y={stripY}>
                  <line x1={LEFT_GUTTER} y1={stripY} x2={LEFT_GUTTER + chartWidth} y2={stripY} stroke="var(--border)" strokeWidth={0.7} />
                  <text x={LEFT_GUTTER - 10} y={stripY + STRIP_HEIGHT / 2 + 4} fill="var(--text-dim)" fontSize={11} fontFamily="DM Sans, sans-serif" textAnchor="end">Undated</text>
                </g>
              )}
            </svg>
          </div>
          <div className="chrono-hint">{bars
            ? "Drag to pan · Ctrl+scroll to zoom around the cursor · Click a scene or a thread to open it"
            : "Drag to pan · Ctrl+scroll to zoom around the cursor · Click a scene to open it"}</div>
        </>
      )}

      {trayGroups.length > 0 && (
        <div className="fabula-tl-tray" style={{ marginTop: 10, padding: "10px 12px", background: "var(--surf2)", borderRadius: 3 }}>
          <div className="chrono-controls-label" style={{ marginBottom: 8 }}>Undated</div>
          {trayGroups.map(g => (
            <div key={g.st.id} className="fabula-tl-tray-story" style={{ marginBottom: 6 }}>
              {corpusScope && <div className="fabula-tl-tray-name" style={{ fontSize: 12, color: "var(--text-dim)", margin: "2px 0 6px" }}>{g.st.name || "(untitled)"}</div>}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {g.scenes.map(s => (
                  <button key={s.id} type="button" className="btn btn-ghost btn-small fabula-tl-tray-scene" data-scene={s.id} title={sceneTip(s)} onClick={() => onOpenScene(s)}>
                    {s.path && <span style={{ opacity: 0.6 }}>{s.path} </span>}{s.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}'''


def main():
    text = FAB.read_text(encoding="utf-8")
    assert text.count(TAB_START) == 1, "the tab's doc comment"
    assert not text.endswith("\n"), "28_fabula ends without a newline"
    tab_old = text[text.index(TAB_START):]
    assert tab_old.count("function FabulaTimelineTab(") == 1
    edit(FAB, [
        (HEADER_OLD, HEADER_NEW),
        (LANES_OLD, LANES_NEW),
        (DATA_DOC_OLD, DATA_DOC_NEW),
        (WALK_OLD, WALK_NEW),
        (SCENE_OLD, SCENE_NEW),
        (RETURN_OLD, RETURN_NEW),
        (TABS_OLD, TABS_NEW),
        (PAGE_OLD, PAGE_NEW),
        (TIMELINE_OLD, TIMELINE_NEW),
        (tab_old, TAB_NEW),
    ])
    edit(DISPLAY, [(VIEW_OLD, VIEW_NEW), (VIEW_ROOT_OLD, VIEW_ROOT_NEW)])
    edit(SHELL, [(CSS_OLD, CSS_NEW)])
    print("v1.7 r022 applied: 28_fabula, 13_form-engine-display, shell.html")


if __name__ == "__main__":
    main()
