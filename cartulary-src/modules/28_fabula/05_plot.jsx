
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
  const entry = { id: freshNameId("ent", title, new Set((state.entries || []).map(e => e && e.id)), "thread"), templateId: tplId, name: title, calendarId: null, fields: {}, tags: [], createdAt: now, updatedAt: now };
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