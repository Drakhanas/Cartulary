"""v1.7 r020: the Fabula timeline in story time.

Drak's calls at r020's plan (2026-10-26), one per message, recorded in
docs/fabula-spec.md section 8 before this cut (d8889d9): the timeline opens
on a story's Timeline tab, with a picker at its top for this story or its
whole corpus, and a corpus's page has none of its own; its axis takes its
calendar from a Display in picker of its own, starting on the primary
calendar and kept apart from Chronometric's; it only shows, a click opening
a scene's page or a thread's entry; story time comes first, as this cut, and
telling order with the third mode as r022; a scene that belongs to more than
one lane is drawn in each, at one x, the pointer over one lighting the
others; an arc's lane holds the scenes its Turning Points name and no
others, with a No arc lane for the rest; the axis band draws era names on a
line of their own above the year labels, Chronometric's moving there in a
cut of their own, r021, so this cut leaves Chronometric's drawing alone; and
a thread's Timespan is a bar in the top row of its lane, under lanes by
thread only. Claude's defaults for the rest are in the same section.

- 28_fabula: the timeline (FabulaTimelineTab) and its helpers, at the file's
  tail under a header of its own; the Timeline tab is built and the story
  page shows it, handing it the tab's kept picks.
- 12_trunk: the display settings keep the tab's picks per story
  (fabulaTimeline); a scene of another of the corpus's stories opens over
  its own story's page, and Back returns to the timeline (a Back frame can
  carry the story it was left on).
- 19_chronometric, the Chronometric math: chronoTitleLines takes a title
  with no icon, whose first word then stands alone. Chronometric's own call
  passes none of it, so what Chronometric draws doesn't change.

Declared scope: 12_trunk, 19_chronometric, 28_fabula. Declarations added:
FABULA_TIMELINE_LANES, fabulaKindColor, fabulaDiamond, fabulaTimelineWhen,
fabulaTimelineData, FabulaTimelineTab.

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given). Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r020_fabula_timeline.py
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


# ------------------------------------------------- 19: a title with no icon
edit(MODULES / "19_chronometric.jsx", [
    (r"""// is too wide; and a word too wide alone cut short with an ellipsis. A slash
// stays with the word before it and the icon with the word after it. widthOf
// measures a line. A title that fits is one line.
const chronoTitleLines = (title, widthOf, maxWidth) => {
  if (widthOf(title) <= maxWidth) return [title];
  const words = [];
  title.split(" ").forEach((word, i) => {
    if (words.length && (word === "/" || i === 1)) words[words.length - 1] += " " + word;""",
     r"""// is too wide; and a word too wide alone cut short with an ellipsis. A slash
// stays with the word before it and the icon with the word after it. widthOf
// measures a line. A title that fits is one line. Since r020 a title can come
// without an icon (hasIcon false, Fabula's timeline), and its first word then
// stands alone.
const chronoTitleLines = (title, widthOf, maxWidth, hasIcon = true) => {
  if (widthOf(title) <= maxWidth) return [title];
  const words = [];
  title.split(" ").forEach((word, i) => {
    if (words.length && (word === "/" || (hasIcon && i === 1))) words[words.length - 1] += " " + word;"""),
])

# ------------------------------------------------- 12: the tab's picks, Back
edit(MODULES / "12_trunk.jsx", [
    (r"""    fabulaOutlineFolds: {}, // v1.7 r011: the Outline tab's folded acts, chapters, and scenes, by id
  });""",
     r"""    fabulaOutlineFolds: {}, // v1.7 r011: the Outline tab's folded acts, chapters, and scenes, by id
    fabulaTimeline: {}, // v1.7 r020: the Timeline tab's scope, lanes, and calendar, by story
  });"""),
    (r"""            fabulaOutlineFolds: stored.fabulaOutlineFolds && typeof stored.fabulaOutlineFolds === "object" && !Array.isArray(stored.fabulaOutlineFolds) ? stored.fabulaOutlineFolds : {},
          });""",
     r"""            fabulaOutlineFolds: stored.fabulaOutlineFolds && typeof stored.fabulaOutlineFolds === "object" && !Array.isArray(stored.fabulaOutlineFolds) ? stored.fabulaOutlineFolds : {},
            fabulaTimeline: stored.fabulaTimeline && typeof stored.fabulaTimeline === "object" && !Array.isArray(stored.fabulaTimeline) ? stored.fabulaTimeline : {},
          });"""),
    (r"""    if (folds[id]) delete folds[id]; else folds[id] = true;
    return { ...p, fabulaOutlineFolds: folds };
  });""",
     r"""    if (folds[id]) delete folds[id]; else folds[id] = true;
    return { ...p, fabulaOutlineFolds: folds };
  });

  // v1.7 r020: and so do the Timeline tab's picks, its scope, its lanes, and
  // its calendar, one set per story (docs/fabula-spec.md, section 8).
  const setFabulaTimeline = (storyId, patch) => setPrefs(p => {
    const all = p.fabulaTimeline && typeof p.fabulaTimeline === "object" ? p.fabulaTimeline : {};
    return { ...p, fabulaTimeline: { ...all, [storyId]: { ...(all[storyId] || {}), ...patch } } };
  });"""),
    (r"""    setFabulaBack(b => [...b, fabulaHere()]);
    setActiveRecord({ kind, id });
  };

  const newFabulaRecord = (kind) => {""",
     r"""    setFabulaBack(b => [...b, fabulaHere()]);
    setActiveRecord({ kind, id });
  };

  // v1.7 r020: a record of another of the corpus's stories, from the
  // timeline at the corpus's scope, opens over its own story's page, and Back
  // returns to this story's page as it was left.
  const openFabulaRecordIn = (kind, id, storyId) => {
    if (!storyId || storyId === activeStoryId) { openFabulaRecord(kind, id); return; }
    if (!confirmDiscardDraft()) return;
    setStoryDraft(null); initialStoryDraftRef.current = null;
    setRecordDraft(null); initialRecordDraftRef.current = null;
    setFabulaBack(b => [...b, { ...fabulaHere(), storyId: activeStoryId }]);
    setActiveStoryId(storyId);
    setActiveRecord({ kind, id });
  };

  const newFabulaRecord = (kind) => {"""),
    (r"""    if (frame && frame.kind === "entry") { returnToEntry(frame.id); return; }
    if (frame && frame.kind !== "story") { setActiveRecord({ kind: frame.kind, id: frame.id }); return; }""",
     r"""    if (frame && frame.kind === "entry") { returnToEntry(frame.id); return; }
    // v1.7 r020: a frame left on another story's page returns to that story.
    if (frame && frame.storyId) setActiveStoryId(frame.storyId);
    if (frame && frame.kind !== "story") { setActiveRecord({ kind: frame.kind, id: frame.id }); return; }"""),
    (r"""                outlineFolds={prefs.fabulaOutlineFolds}
                onToggleOutlineFold={toggleOutlineFold}""",
     r"""                outlineFolds={prefs.fabulaOutlineFolds}
                onToggleOutlineFold={toggleOutlineFold}
                timelinePrefs={(prefs.fabulaTimeline || {})[rec.id]}
                onSetTimelinePrefs={(patch) => setFabulaTimeline(rec.id, patch)}
                onOpenRecordIn={openFabulaRecordIn}"""),
])

# ------------------------------------------------- 28: the tab, the story page
edit(MODULES / "28_fabula.jsx", [
    (r"""  { id: "timeline", label: "Timeline", built: false, holds: "the story's own timeline, kept apart from Chronometric" },""",
     r"""  { id: "timeline", label: "Timeline", built: true, holds: "the story's own timeline, kept apart from Chronometric" },"""),
    (r"""// The page itself: the Story record in view or, with a draft, in edit, and
// since v1.7's r009 the People tab, r011 the Outline tab, and r013 the Plot
// tab.
function FabulaStoryPage({ state, story, draft, onDraftChange, tab, onSelectTab, onOpenRecord, onNewRecord, isLocked, folds, onToggleFold, outlineFolds, onToggleOutlineFold, onUpdateFabula, onCreateThread, onCreateTheme, onRestoreTemplate, showSecrets, allTags, dirHandle, flash, onOpenEntry, onSelectTag, onUpdateViewPrefs }) {""",
     r"""// The page itself: the Story record in view or, with a draft, in edit, and
// since v1.7's r009 the People tab, r011 the Outline tab, r013 the Plot tab,
// and r020 the Timeline tab.
function FabulaStoryPage({ state, story, draft, onDraftChange, tab, onSelectTab, onOpenRecord, onNewRecord, isLocked, folds, onToggleFold, outlineFolds, onToggleOutlineFold, onUpdateFabula, onCreateThread, onCreateTheme, onRestoreTemplate, showSecrets, allTags, dirHandle, flash, onOpenEntry, onSelectTag, onUpdateViewPrefs, timelinePrefs, onSetTimelinePrefs, onOpenRecordIn }) {"""),
    (r"""  // own content, People's lists (v1.7 r009), the Outline (r011), Plot
  // (r013), Notes (r014), or Meaning (r015).""",
     r"""  // own content, People's lists (v1.7 r009), the Outline (r011), Plot
  // (r013), Notes (r014), Meaning (r015), or the Timeline (r020)."""),
    (r"""  if (!draft && active === "notes") {
    return tabPage(<FabulaNotesTab state={state} story={story} isLocked={isLocked} onOpenRecord={onOpenRecord} onNewRecord={onNewRecord} />);
  }""",
     r"""  if (!draft && active === "notes") {
    return tabPage(<FabulaNotesTab state={state} story={story} isLocked={isLocked} onOpenRecord={onOpenRecord} onNewRecord={onNewRecord} />);
  }
  if (!draft && active === "timeline") {
    return tabPage(<FabulaTimelineTab state={state} story={story} showSecrets={showSecrets} prefs={timelinePrefs} onSetPrefs={onSetTimelinePrefs || (() => {})}
      onOpenScene={(s) => (onOpenRecordIn ? onOpenRecordIn("scene", s.id, s.storyId) : onOpenRecord("scene", s.id))} onOpenEntry={onOpenEntry} />);
  }"""),
])

TAIL = r'''

''' + header("Fabula: the timeline (v1.7 r020)") + r'''
// The Timeline tab in story time (docs/fabula-spec.md, section 8, Drak's
// calls of 2026-10-26): a story's scenes, or at the corpus's scope every
// scene of the stories in its corpus, placed by their When on a calendar's
// axis, in lanes by POV, by thread, or by arc, and drawn with the
// Chronometric math in 19_chronometric, so its lanes, rows, titles, and ticks
// are Chronometric's. It only shows: a click opens a scene's page or a
// thread's entry, and nothing on it edits. Telling order, with chapters and
// parts as bands, and the third mode come at r022.

// The groupings, in the picker's order.
const FABULA_TIMELINE_LANES = [["pov", "By POV"], ["thread", "By thread"], ["arc", "By arc"]];

// A kind's color, from the registry.
const fabulaKindColor = (kind) => (FABULA_KINDS.find(k => k.kind === kind) || {}).color || "#a3a3ad";

// A diamond's points, centered on x, y, r from its middle to each corner.
const fabulaDiamond = (x, y, r) => `${x},${y - r} ${x + r},${y} ${x},${y + r} ${x - r},${y}`;

// A calendar-date-range written in dateCal, placed on axisCal's axis, or null
// when it holds no year: { kind, startYear, endYear, startApprox, endApprox,
// openEnded, openStarted }. A scene's (moment) is a point when it holds one
// date, a start alone, an end alone, or the same day twice, since a scene
// with no end is a moment; anything else reads as Chronometric reads a range,
// a start alone running open-ended and an end alone open-started.
const fabulaTimelineWhen = (range, dateCal, axisCal, moment) => {
  if (!range || typeof range !== "object") return null;
  const s = range.start && range.start.year != null ? range.start : null;
  const e = range.end && range.end.year != null ? range.end : null;
  const sy = s ? chronoAxisYear(s, dateCal, axisCal) : null;
  const ey = e ? chronoAxisYear(e, dateCal, axisCal) : null;
  if (sy == null && ey == null) return null;
  const sameDay = !!s && !!e && s.year === e.year && (s.monthIndex || 0) === (e.monthIndex || 0) && (s.day || 1) === (e.day || 1);
  if (moment && (sy == null || ey == null || sameDay)) {
    const at = sy != null ? s : e;
    const y = sy != null ? sy : ey;
    return { kind: "point", startYear: y, endYear: y, startApprox: !!at.approximate, endApprox: !!at.approximate, openEnded: false, openStarted: false };
  }
  return {
    kind: "span", startYear: sy ?? ey, endYear: ey ?? sy,
    startApprox: !!(s && s.approximate), endApprox: !!(e && e.approximate),
    openEnded: sy != null && ey == null, openStarted: sy == null && ey != null,
  };
};

// What the timeline shows of a story, or at the corpus's scope of every
// story in its corpus, in reading order, every date on axisCal's axis.
// scenes: each scene, story by story in the outline's order, with its
// position, its POV (its own, or its chapter's when it has none), its threads,
// the arcs that turn in it and how, the plot points delivered in it, its
// When on the axis or none, and the lanes it belongs to under each grouping.
// While secrets are hidden, a When marked secret leaves every scene out.
// povLanes: a lane for each cast record that's a scene's POV, in People's
// order, Importance and then name; at the corpus's scope a character's cast
// records from each story share one, named for their entry and ranked by the
// highest Importance among them. threadLanes: the threads each story's Plot
// tab lists, story by story, each once, with its Timespan, its template's
// first date range, unless that's secret and secrets are hidden. arcLanes:
// each story's arcs, A to Z, story by story, at the corpus's scope titled
// with their story.
const fabulaTimelineData = (state, story, corpusScope, axisCal, showSecrets) => {
  const fab = (state && state.fabula) || {};
  const corpus = fabulaArr(fab, "corpora").find(c => c && Array.isArray(c.storyIds) && c.storyIds.includes(story.id)) || null;
  const wide = !!(corpusScope && corpus);
  const stories = wide ? corpus.storyIds.map(id => fabulaStoryOf(fab, id)).filter(Boolean) : [story];
  const inScope = new Set(stories.map(st => st.id));
  const primary = getCalendar(state, null);
  const entryById = new Map((state.entries || []).filter(e => e && e.id).map(e => [e.id, e]));
  const tplById = new Map((state.templates || []).filter(t => t && t.id).map(t => [t.id, t]));
  const castById = new Map(fabulaArr(fab, "cast").filter(c => c && c.id).map(c => [c.id, c]));
  const chapterById = new Map(fabulaArr(fab, "chapters").filter(c => c && c.id).map(c => [c.id, c]));
  const whenField = fabulaKindFields(state, "scene").find(f => f && f.id === "when");
  const whenHidden = !!(whenField && whenField.secret) && !showSecrets;
  const byName = (a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });

  // The arcs, and the turns each scene holds.
  const arcLanes = [];
  const turnsByScene = new Map();
  stories.forEach(st => {
    fabulaArr(fab, "arcs").filter(a => a && a.id && a.storyId === st.id).slice().sort(byName).forEach(arc => {
      const name = arc.name || "(untitled)";
      arcLanes.push({ id: arc.id, name: wide ? `${name} / ${st.name || "(untitled)"}` : name, icon: "", color: fabulaKindColor("arc") });
      (Array.isArray((arc.fields || {}).turningPoints) ? arc.fields.turningPoints : []).forEach(row => {
        const sid = row && typeof row.turnScene === "string" && row.turnScene ? row.turnScene : null;
        if (!sid) return;
        if (!turnsByScene.has(sid)) turnsByScene.set(sid, []);
        turnsByScene.get(sid).push({ arcId: arc.id, arcName: name, shift: row && typeof row.turnShift === "string" ? row.turnShift : "" });
      });
    });
  });
  // The plot points delivered in each scene.
  const pointsByScene = new Map();
  fabulaArr(fab, "plotPoints").filter(p => p && p.id && inScope.has(p.storyId)).forEach(p => {
    const sid = (p.fields || {}).deliveredIn;
    if (typeof sid !== "string" || !sid) return;
    if (!pointsByScene.has(sid)) pointsByScene.set(sid, []);
    pointsByScene.get(sid).push({ id: p.id, name: p.name || "(untitled)" });
  });

  // The threads, in each story's Plot order.
  const threadLanes = [];
  const threadSet = new Set();
  stories.forEach(st => {
    const own = fabulaStoryThreads(st).filter(id => entryById.has(id));
    const ownSet = new Set(own);
    const elsewhere = [...fabulaThreadUse(state, st.id).keys()].filter(id => !ownSet.has(id) && entryById.has(id))
      .sort((a, b) => (entryById.get(a).name || "").localeCompare(entryById.get(b).name || ""));
    [...own, ...elsewhere].forEach(id => {
      if (threadSet.has(id)) return;
      threadSet.add(id);
      const ent = entryById.get(id);
      const tpl = tplById.get(ent.templateId);
      const field = ((tpl && tpl.fields) || []).find(f => f && f.type === "calendar-date-range");
      const hidden = !!(field && field.secret) && !showSecrets;
      threadLanes.push({
        id, name: ent.name || "(unnamed)", icon: (tpl && tpl.icon) || "", color: (tpl && tpl.color) || "#c86ea8",
        spanLabel: field ? (field.label || "Timespan") : "",
        span: field && !hidden ? fabulaTimelineWhen((ent.fields || {})[field.id], getCalendar(state, ent.calendarId), axisCal, false) : null,
      });
    });
  });

  // The scenes, and the POV lanes they make.
  const rank = (c) => { const i = FABULA_IMPORTANCE.indexOf(formatSelectDisplay((c.fields || {}).importance)); return i === -1 ? FABULA_IMPORTANCE.length : i; };
  const povLaneMap = new Map();
  const povLaneOf = (c) => {
    const ch = (c.fields || {}).character;
    const ent = typeof ch === "string" ? entryById.get(ch) : null;
    const key = wide && ent ? `entry:${ent.id}` : `cast:${c.id}`;
    const lane = povLaneMap.get(key);
    if (lane) { lane.rank = Math.min(lane.rank, rank(c)); return key; }
    const tpl = ent ? tplById.get(ent.templateId) : null;
    povLaneMap.set(key, {
      id: key, name: (wide && ent ? ent.name : c.name) || "(unnamed)",
      icon: (tpl && tpl.icon) || "", color: (tpl && tpl.color) || fabulaKindColor("cast"), rank: rank(c),
    });
    return key;
  };
  const scenes = [];
  if (!whenHidden) stories.forEach(st => {
    const places = fabulaOutlinePlaces(state, st.id);
    const chapterOf = new Map();
    const walk = (nodes, parent) => nodes.forEach(n => {
      if (n.kind === "scene") chapterOf.set(n.id, parent && parent.kind === "chapter" ? parent.id : null);
      else walk(n.children, n);
    });
    walk(fabulaOutlineTree(state, st), null);
    const castOf = (id) => { const c = typeof id === "string" && id ? castById.get(id) : null; return c && c.storyId === st.id ? c : null; };
    fabulaArr(fab, "scenes").filter(sc => sc && sc.id && sc.storyId === st.id)
      .map(sc => ({ sc, place: places.get(sc.id) || { path: "", index: Infinity } }))
      .sort((a, b) => a.place.index - b.place.index)
      .forEach(({ sc, place }) => {
        const f = sc.fields || {};
        const chapter = chapterById.get(chapterOf.get(sc.id));
        const pov = f.pov ? castOf(f.pov) : castOf(chapter && (chapter.fields || {}).pov);
        const threads = [...new Set((Array.isArray(f.threads) ? f.threads : []).filter(id => typeof id === "string" && id))];
        const turns = turnsByScene.get(sc.id) || [];
        scenes.push({
          id: sc.id, storyId: st.id, storyName: st.name || "(untitled)", name: sc.name || "(untitled)", path: place.path,
          when: fabulaTimelineWhen(f.when, primary, axisCal, true),
          pov, turns, plotPoints: pointsByScene.get(sc.id) || [],
          lanes: {
            pov: pov ? [povLaneOf(pov)] : [],
            thread: threads.filter(id => threadSet.has(id)),
            arc: [...new Set(turns.map(t => t.arcId))],
          },
        });
      });
  });
  const povLanes = [...povLaneMap.values()].sort((a, b) => a.rank - b.rank || byName(a, b));
  return { corpus, wide, stories, scenes, whenHidden, lanes: { pov: povLanes, thread: threadLanes, arc: arcLanes } };
};

// The tab. prefs are its kept picks, { scope, lanes, calendarId }, which
// onSetPrefs changes; a pick that no longer applies falls back to the
// default, this story, lanes by POV, the primary calendar.
function FabulaTimelineTab({ state, story, showSecrets, prefs, onSetPrefs, onOpenScene, onOpenEntry }) {
  const { LEFT_GUTTER, TOP_GUTTER, LANE_HEIGHT } = CHRONO_LAYOUT;
  const p = prefs && typeof prefs === "object" ? prefs : {};
  const calendars = Array.isArray(state.calendars) ? state.calendars.filter(c => c && c.id) : [];
  const calendarId = p.calendarId && calendars.some(c => c.id === p.calendarId) ? p.calendarId : null;
  const axisCal = getCalendar(state, calendarId);
  const lanesBy = FABULA_TIMELINE_LANES.some(([id]) => id === p.lanes) ? p.lanes : "pov";
  const data = useMemo(() => fabulaTimelineData(state, story, p.scope === "corpus", axisCal, showSecrets), [state, story, p.scope, axisCal, showSecrets]);
  const corpusScope = data.wide;
  const SCENE = fabulaKindColor("scene"), PLOT = fabulaKindColor("plotPoint"), ARC = fabulaKindColor("arc");
  const NONE = "__none__";

  // The lanes, and which of them each dated scene is drawn in.
  const dated = data.scenes.filter(s => s.when);
  const undated = data.scenes.filter(s => !s.when);
  const memberOf = (s) => (s.lanes[lanesBy].length ? s.lanes[lanesBy] : [NONE]);
  const noneName = lanesBy === "pov" ? "No POV" : lanesBy === "thread" ? "No thread" : "No arc";
  const lanes = [...data.lanes[lanesBy], ...(dated.some(s => memberOf(s)[0] === NONE) ? [{ id: NONE, name: noneName, icon: "", color: "var(--text-dim)" }] : [])];
  const bars = lanesBy === "thread";

  // The axis fits the dated scenes, the same under every grouping; with none,
  // lanes by thread fit the threads' Timespans.
  const fit = dated.length ? dated.map(s => s.when) : (bars ? data.lanes.thread.filter(l => l.span).map(l => l.span) : []);
  const nothing = fit.length === 0;
  const dataBounds = chronoDataBounds(fit);
  const [viewStart, setViewStart] = useState(null);
  const [viewEnd, setViewEnd] = useState(null);
  const [pan, setPan] = useState(0);
  const [zoom, setZoom] = useState(1);
  const resetView = () => { setPan(0); setZoom(1); setViewStart(null); setViewEnd(null); };
  // Changing the scope or the calendar fits the axis again; changing the
  // grouping keeps the zoom.
  useEffect(() => { resetView(); }, [story.id, corpusScope, calendarId]);
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
  // chart's fonts, and again once the page's fonts finish loading.
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
    return (text, size) => {
      const key = size + "|" + text;
      if (!widths.has(key)) {
        if (ctx) ctx.font = `${size}px "DM Sans", sans-serif`;
        widths.set(key, ctx ? ctx.measureText(text).width : text.length * size * 0.55);
      }
      return widths.get(key);
    };
  }, [fontsLoaded]);

  const chartWidth = chronoChartWidth(containerWidth);
  const { yearsPerPx, yearToX, xToYear } = chronoScale(visStart, visibleRange, chartWidth);

  // What a scene draws, in pixels: a point's circle, or its diamond when a
  // plot point is delivered in it, and its name, which a turn's ring moves
  // right; a span's bar, its ~, its marks at its start, and its name inside,
  // past the marks; and where the drawing starts and ends, for the rows.
  const geometry = (s) => {
    const w = s.when;
    const turn = s.turns.length > 0, plot = s.plotPoints.length > 0;
    const x1 = yearToX(w.startYear), x2 = yearToX(w.endYear);
    if (w.kind === "point") {
      const nameX = x1 + (turn ? 12 : 8);
      const label = (w.startApprox ? "~" : "") + s.name;
      const nameWidth = measureText(label, 11);
      return { x1, x2: x1, nameX, label, nameWidth, left: x1 - (turn ? 10 : plot ? 7 : 5), right: nameX + nameWidth };
    }
    const bw = Math.max(2, x2 - x1);
    const inset = turn || plot ? 10 : 5;
    const room = bw - (inset - 5);
    const label = room > 50 ? chronoSpanLabel(s.name, room) : "";
    const nameWidth = label ? measureText(label, 11) : 0;
    let left = w.startApprox ? x1 - 8 : x1;
    if (turn) left = Math.min(left, x1 - 10); else if (plot) left = Math.min(left, x1 - 7);
    const right = Math.max(x1 + bw, nameWidth > 0 ? x1 + inset + nameWidth : -Infinity);
    return { x1, x2: x1 + bw, bw, nameX: x1 + inset, label, nameWidth, left, right };
  };

  // Each lane's scenes in the visible span, their drawings, and their rows:
  // stacked by what they draw, under the thread's bar when it has one.
  const laneDraw = new Map();
  const rowsByLane = {};
  lanes.forEach(lane => {
    const evs = dated.filter(s => !(s.when.endYear < visStart || s.when.startYear > visEnd) && memberOf(s).includes(lane.id));
    const geoms = evs.map(geometry);
    const order = geoms.map((g, i) => i).sort((a, b) => (geoms[a].left - geoms[b].left) || (a - b));
    const stacked = chronoStackRows(order.map(i => ({ left: geoms[i].left, right: geoms[i].right })), CHRONO_LAYOUT.EVENT_GAP);
    const bar = bars && lane.span ? lane.span : null;
    const rows = new Array(evs.length);
    order.forEach((i, k) => { rows[i] = stacked[k] + (bar ? 1 : 0); });
    laneDraw.set(lane.id, { evs, geoms, rows, bar });
    rowsByLane[lane.id] = bar ? [0, ...rows] : rows;
  });
  const titleText = (lane) => (lane.icon ? `${lane.icon} ${lane.name}` : lane.name);
  const titleLines = {};
  lanes.forEach(lane => { titleLines[lane.id] = chronoTitleLines(titleText(lane), (t) => measureText(t, 13), CHRONO_LAYOUT.TITLE_WIDTH, !!lane.icon); });
  const layout = chronoLaneLayout(lanes.map(l => l.id), rowsByLane, Object.fromEntries(lanes.map(l => [l.id, titleLines[l.id].length])));
  const totalHeight = layout.totalHeight;
  const ticks = chronoTicks(visStart, visEnd, chartWidth, axisCal);
  const eraBands = chronoEraBands(axisCal);

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
    s.when ? dateText(s.when) : "No When",
    s.pov ? `POV: ${s.pov.name || "(unnamed)"}` : null,
    ...s.plotPoints.map(pp => `Plot point: ${pp.name}`),
    ...s.turns.map(t => `Turn, ${t.arcName}${t.shift ? `: ${t.shift}` : ""}`),
  ].filter(Boolean).join("\n");
  const open = (s) => (e) => { e.stopPropagation(); onOpenScene(s); };

  const sceneMark = (s, g, cy, key) => {
    const turn = s.turns.length > 0, plot = s.plotPoints.length > 0, on = lit === s.id;
    const common = {
      className: "fabula-tl-event", "data-scene": s.id, "data-story": s.storyId,
      onMouseDown: open(s), onMouseEnter: () => setLit(s.id), onMouseLeave: () => setLit(x => (x === s.id ? null : x)),
      style: { cursor: "pointer" },
    };
    if (s.when.kind === "point") {
      return (
        <g key={key} {...common} data-kind="point" data-x={g.x1}>
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
      <g key={key} {...common} data-kind="span" data-x={g.x1} data-x2={g.x2}>
        {on && <rect x={g.x1 - 3} y={cy - 10} width={g.bw + 6} height={20} fill="none" stroke="var(--accent)" strokeWidth={2} rx={3} />}
        <rect x={g.x1} y={cy - 7} width={g.bw} height={14} fill={SCENE} fillOpacity={0.65} stroke={SCENE} strokeWidth={1} rx={2} />
        {s.when.startApprox && (
          <text x={g.x1 - 8} y={cy + 4} fill={SCENE} fontSize={11} fontFamily="DM Sans, sans-serif" style={{ pointerEvents: "none" }}>~</text>
        )}
        {turn && <circle className="fabula-tl-turn" cx={g.x1} cy={cy} r={9} fill="none" stroke={ARC} strokeWidth={1.5} />}
        {plot && <polygon className="fabula-tl-plot" points={fabulaDiamond(g.x1, cy, 7)} fill={PLOT} stroke="var(--bg)" strokeWidth={1.5} />}
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

  const empty = data.whenHidden ? "Every scene's When is secret, and secrets are hidden."
    : data.scenes.length === 0 ? (corpusScope ? "No scenes in the corpus yet." : "No scenes yet.")
    : (corpusScope ? "No scene in the corpus has a When yet." : "No scene has a When yet.");
  const trayGroups = data.stories.map(st => ({ st, scenes: undated.filter(s => s.storyId === st.id) })).filter(g => g.scenes.length > 0);

  return (
    <div className="fabula-timeline" ref={containerRef} style={{ marginTop: 4 }}>
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
            <span className="chrono-controls-label">Lanes</span>
            {FABULA_TIMELINE_LANES.map(([id, label]) => (
              <button key={id} type="button" className={`btn btn-small ${lanesBy === id ? "btn-accent" : "btn-ghost"} fabula-tl-lanes`} aria-pressed={lanesBy === id} onClick={() => onSetPrefs({ lanes: id })}>{label}</button>
            ))}
          </span>
          {calendars.length > 0 && (
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
            <span className="chrono-controls-label">Range:</span>
            <input className="input chrono-bound-input" type="number" placeholder="From year" value={viewStart ?? ""} onChange={e => setViewStart(e.target.value === "" ? null : parseInt(e.target.value))} />
            <span style={{ color: "var(--text-dim)" }}>→</span>
            <input className="input chrono-bound-input" type="number" placeholder="To year" value={viewEnd ?? ""} onChange={e => setViewEnd(e.target.value === "" ? null : parseInt(e.target.value))} />
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
              {/* Era bands, their names on a line of their own above the year labels */}
              {eraBands.map((b, i) => {
                const x1 = Math.max(LEFT_GUTTER, yearToX(Math.max(b.start, visStart)));
                const x2 = Math.min(LEFT_GUTTER + chartWidth, yearToX(Math.min(b.end, visEnd)));
                if (x2 <= x1) return null;
                const hues = ["rgba(200,169,110,.06)", "rgba(160,110,200,.06)", "rgba(110,158,200,.06)", "rgba(200,110,110,.06)"];
                return (
                  <g key={i}>
                    <rect x={x1} y={TOP_GUTTER - 36} width={x2 - x1} height={totalHeight - TOP_GUTTER + 36} fill={hues[i % hues.length]} />
                    {(x2 - x1) > 50 && (
                      <text className="fabula-tl-era" x={x1 + 6} y={TOP_GUTTER - 24} fill="var(--accent-dim)" fontSize={10} fontFamily="DM Sans, sans-serif" fontStyle="italic">
                        {b.era.shortName || b.era.name}
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

p28 = MODULES / "28_fabula.jsx"
t28 = p28.read_text(encoding="utf-8")
end = "          {!nothing && <button className=\"btn btn-danger\" onClick={onConfirm} disabled={!ack}>Reset Template</button>}\n        </div>\n      </div>\n    </div>\n  );\n}"
assert not t28.endswith("\n") and t28.endswith(end), "28_fabula.jsx no longer ends the way this cut expects"
p28.write_text(t28 + TAIL, encoding="utf-8")
print("v1.7 r020 applied: 12_trunk, 19_chronometric, 28_fabula")
