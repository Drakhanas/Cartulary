

// ─── Tabula: the drawing layer (v1.7 r032) ─────────────────────────────────────
// Lines over the cards (docs/stemma-v2-spec.md, section 6, Lines and
// strokes): the map's shape model and renderer, vector only and with no
// layer UI, in an svg laid over the surface in canvas units, so a line drawn
// around a card stays around it through pan and zoom. The svg is inert to
// the pointer until a tool is up: with Line or Freehand it takes every
// press; with Select its hit copies and handles do, and the cards and the
// canvas keep theirs. Line takes its points by click, a double-click, Enter,
// or right-click finishes it, Esc discards; a first or last point put down
// within TABULA.draw.stick screen pixels of a card sticks to it (`anchors`,
// the card lit while the pending point is over it) and is drawn from the
// card's measured box from then on, at the box's border where the line
// toward its next point leaves it, so it follows the card; the point it was
// put down at stays in `points` for the day the card goes. Freehand is a
// drag, simplified on release, its ends free. Select moves a line (its
// stuck ends stay stuck), drags its points (an end dropped on a card sticks,
// off one frees), nudges by the grid, and deletes; the panel on the right
// holds the map's swatches, the width, Smooth, and the arrowheads, editing
// the selected line or the next one's defaults, as the map strip does. The
// tools' pointer handling is ported from useMapDrawing, which assumes a
// map's fixed canvas and its layers; the model and the renderer come over
// whole. Every write is a transform through `apply`, a gesture committing
// once at its end, as a card's does.
const TABULA_TOOLS = [
  { id: "select",   label: "Select",   glyph: "↖", hint: "Click a line to select it, drag to move it. Drag a point to reshape it; an end dropped on a card sticks to it, off a card it comes free. Arrows nudge, Delete removes, Esc leaves." },
  { id: "stroke",   label: "Line",     glyph: "╱", hint: "Click to place the points of a line. A double-click, Enter, or right-click finishes it; Esc discards it. An end put down on a card sticks to it." },
  { id: "freehand", label: "Freehand", glyph: "∿", hint: "Drag to draw a line freehand. Esc while dragging discards it." },
];
// The point on a card's box a stuck end is drawn at: on the border, where
// the line from the box's center toward the next point leaves it.
const tabulaAttachPoint = (box, from) => {
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  const dx = from[0] - cx, dy = from[1] - cy;
  if (!dx && !dy) return [cx, cy];
  const t = Math.min(dx ? box.w / 2 / Math.abs(dx) : Infinity, dy ? box.h / 2 / Math.abs(dy) : Infinity);
  const r = (v) => Math.round(v * 100) / 100;
  return [r(cx + dx * t), r(cy + dy * t)];
};
// A stroke's points as drawn: a stuck end from its card's measured box
// (`boxes`, by item id; a card not measured yet draws from the point kept),
// a free end as stored. `live` ({ index, p }) puts one point at the pointer
// during a point drag, its anchor set aside until the drop.
const tabulaDrawnPoints = (shape, boxes, live) => {
  const pts = shape.points.map(p => [p[0], p[1]]);
  const n = pts.length;
  const dragging = live && Number.isInteger(live.index) && live.index >= 0 && live.index < n ? live.index : -1;
  if (dragging >= 0) pts[dragging] = live.p;
  const a = shape.anchors || {};
  const endBox = a.end && dragging !== n - 1 && boxes ? boxes[a.end] : null;
  const startBox = a.start && dragging !== 0 && boxes ? boxes[a.start] : null;
  if (endBox) {
    const from = n > 2 ? pts[n - 2] : (startBox ? [startBox.x + startBox.w / 2, startBox.y + startBox.h / 2] : pts[0]);
    pts[n - 1] = tabulaAttachPoint(endBox, from);
  }
  if (startBox) pts[0] = tabulaAttachPoint(startBox, pts[1]);
  return pts;
};

function useTabulaDrawing({ stemma, board, apply, camera, surfaceRef, paneRef, isLocked, gestures, onSelectShape }) {
  const [tool, setToolState] = useState("cards");
  const [style, setStyle] = useState({ stroke: TABULA.draw.color, strokeWidth: TABULA.draw.width, smooth: true, arrow: "none" });
  const [selectedShapeId, setSelectedShapeId] = useState(null);
  const [draft, setDraft] = useState(null);   // { type: "stroke", points, start, over } | { type: "freehand", points }
  const [cursor, setCursor] = useState(null); // { p: [x, y], over: item id | null }: the pending point, or an end on the drag
  const [live, setLive] = useState(null);     // { id, points } or { id, index, p }: a line as a move or a point drag shows it
  const [boxes, setBoxes] = useState({});     // item id -> { x, y, w, h }, canvas units, measured from the DOM
  const [paneSize, setPaneSize] = useState({ w: 0, h: 0 });
  const flightRef = useRef(null);             // the freehand or the drag in flight: { cancelled }
  const shapes = board.shapes || [];
  const selectedShape = selectedShapeId ? (shapes.find(s => s.id === selectedShapeId) || null) : null;
  const r2 = (v) => Math.round(v * 100) / 100;
  const zoom = () => camera.viewRef.current.zoom || 1;
  const toP = (e) => { const p = camera.toCanvas(e.clientX, e.clientY); return [r2(p.x), r2(p.y)]; };

  // the pane's size, for the svg's box
  React.useLayoutEffect(() => {
    const el = paneRef.current;
    if (!el) return undefined;
    const read = () => { const r = el.getBoundingClientRect(); setPaneSize(s => (s.w === r.width && s.h === r.height ? s : { w: r.width, h: r.height })); };
    read();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The boxes of the cards lines stick to, measured after every render (a
  // no-op when nothing moved) and when one of them changes size on its own,
  // as an image card does when its picture loads. A card on the move as a
  // ghost is measured where its ghost is.
  const anchored = new Set();
  shapes.forEach(s => { const a = s.anchors; if (a) { if (a.start) anchored.add(a.start); if (a.end) anchored.add(a.end); } });
  if (draft && draft.type === "stroke" && draft.start) anchored.add(draft.start);
  const anchoredKey = Array.from(anchored).sort().join(",");
  const sel = (id) => `[data-item="${String(id).replace(/["\\]/g, "")}"]`;
  const measure = () => {
    const el = surfaceRef.current;
    if (!el) return;
    const z = zoom();
    const s = el.getBoundingClientRect();
    const next = {};
    anchored.forEach(id => {
      const node = el.querySelector(`${sel(id)}:not(.ghost)`) || el.querySelector(sel(id));
      if (!node) return;
      const r = node.getBoundingClientRect();
      const q = (v) => Math.round(v / z * 10) / 10;
      next[id] = { x: q(r.left - s.left), y: q(r.top - s.top), w: q(r.width), h: q(r.height) };
    });
    setBoxes(prev => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
  };
  const measureRef = useRef(measure);
  measureRef.current = measure;
  React.useLayoutEffect(() => { measureRef.current(); });
  useEffect(() => {
    const el = surfaceRef.current;
    if (!el || typeof ResizeObserver === "undefined" || !anchoredKey) return undefined;
    const ro = new ResizeObserver(() => measureRef.current());
    anchored.forEach(id => { const node = el.querySelector(sel(id)); if (node) ro.observe(node); });
    return () => ro.disconnect();
  }, [anchoredKey, board]);

  // The card under a point, for an end to stick to: the topmost whose box,
  // grown by TABULA.draw.stick screen pixels, holds it; a column's item over
  // the column, as it is drawn over it.
  const cardAt = (clientX, clientY) => {
    const el = surfaceRef.current;
    if (!el) return null;
    const g = TABULA.draw.stick;
    let hit = null;
    el.querySelectorAll("[data-item]:not(.ghost)").forEach(node => {
      const r = node.getBoundingClientRect();
      if (clientX >= r.left - g && clientX <= r.right + g && clientY >= r.top - g && clientY <= r.bottom + g) hit = node.dataset.item;
    });
    return hit;
  };
  // a line's points as drawn now, a move or a point drag in progress shown
  const drawn = (s) => {
    const l = live && live.id === s.id ? live : null;
    const base = l && l.points ? { ...s, points: l.points } : s;
    return tabulaDrawnPoints(base, boxes, l && Number.isInteger(l.index) ? l : null);
  };
  // Where the ends stuck to these cards are drawn now, for a transform that
  // takes the cards off the board (tabulaHealAnchors writes them into the
  // ends it frees).
  const endsFor = (ids) => {
    const set = ids instanceof Set ? ids : new Set(ids);
    const ends = {};
    shapes.forEach(s => {
      const a = s.anchors;
      if (!a || !Array.isArray(s.points) || !((a.start && set.has(a.start)) || (a.end && set.has(a.end)))) return;
      const pts = drawn(s);
      ends[s.id] = {};
      if (a.start && set.has(a.start)) ends[s.id].start = pts[0];
      if (a.end && set.has(a.end)) ends[s.id].end = pts[pts.length - 1];
    });
    return ends;
  };

  const select = (id) => { setSelectedShapeId(id); if (id && onSelectShape) onSelectShape(); };
  const deselect = () => { if (selectedShapeId) setSelectedShapeId(null); };
  const cancelFlight = () => { if (flightRef.current) flightRef.current.cancelled = true; flightRef.current = null; };
  const setTool = (t) => {
    cancelFlight();
    setToolState(t);
    setDraft(null); setCursor(null); setLive(null);
    if (t !== "select") setSelectedShapeId(null);
  };
  const reset = () => setTool("cards");
  // the panel's style: the selected line's, else the next one's; a change
  // edits the selected line and becomes the default too
  const current = selectedShape ? { stroke: selectedShape.stroke, strokeWidth: selectedShape.strokeWidth, smooth: !!selectedShape.smooth, arrow: selectedShape.arrow || "none" } : style;
  const applyStyle = (patch, key) => {
    setStyle(st => ({ ...st, ...patch }));
    if (selectedShape) apply(tabulaUpdateShape(stemma, board.id, selectedShape.id, patch), key ? { coalesce: `shape:${selectedShape.id}:${key}` } : undefined);
  };
  const deleteSelected = () => { if (selectedShape) { apply(tabulaDeleteShape(stemma, board.id, selectedShape.id)); setSelectedShapeId(null); } };
  const nudge = (dx, dy) => { if (selectedShape) apply(tabulaUpdateShape(stemma, board.id, selectedShape.id, translateMapShape(selectedShape, dx, dy)), { coalesce: `shape-nudge:${selectedShape.id}` }); };

  // the line in progress commits with its ends' anchors; a freehand line is
  // simplified at the tolerance in screen pixels, raised until it fits
  const newShape = (points, extra) => ({ id: `shape-${genId().slice(-6)}`, type: "stroke", points, fill: null, stroke: style.stroke, strokeWidth: style.strokeWidth, smooth: style.smooth, arrow: style.arrow, ...extra });
  const finishDraft = (pointsOverride) => {
    if (!draft || draft.type !== "stroke") return null;
    const pts = pointsOverride || draft.points;
    let id = null;
    if (pts.length >= 2) {
      const s = newShape(pts, { anchors: { start: draft.start, end: draft.over } });
      id = s.id;
      apply(tabulaAddShape(stemma, board.id, s));
    }
    setDraft(null); setCursor(null);
    return id;
  };
  const finishFreehand = (points) => {
    let tol = TABULA.draw.tolerance / zoom();
    let pts = mapSimplifyPoints(points, tol);
    while (pts.length > MAP_FREEHAND.maxPoints) { tol *= 1.5; pts = mapSimplifyPoints(points, tol); }
    if (pts.length >= 2) apply(tabulaAddShape(stemma, board.id, newShape(pts.map(p => [r2(p[0]), r2(p[1])]), { anchors: { start: null, end: null } })));
    setDraft(null); setCursor(null);
  };
  const cancelDraft = () => { cancelFlight(); setDraft(null); setCursor(null); };

  const onSvgPointerDown = (e) => {
    if (e.button !== 0 || isLocked || camera.spaceHeld) return;
    if (paneRef.current) paneRef.current.focus({ preventScroll: true });
    if (tool === "freehand") {
      e.preventDefault(); e.stopPropagation();
      const gap = TABULA.draw.spacing / zoom();
      const flight = { cancelled: false, points: [toP(e)] };
      flightRef.current = flight;
      setDraft({ type: "freehand", points: flight.points });
      gestures.begin({
        onMove: (ev) => {
          if (flight.cancelled) return;
          const q = toP(ev);
          const last = flight.points[flight.points.length - 1];
          if (Math.hypot(q[0] - last[0], q[1] - last[1]) < gap) return;
          flight.points = [...flight.points, q];
          setDraft({ type: "freehand", points: flight.points });
        },
        onUp: () => {
          if (flightRef.current === flight) flightRef.current = null;
          if (flight.cancelled) return;
          finishFreehand(flight.points);
        },
      });
      return;
    }
    if (tool !== "select") return;
    const t = e.target;
    const vertex = t && t.closest ? t.closest("[data-vertex]") : null;
    if (vertex && selectedShape) {
      // a point follows the pointer; an end dropped on a card sticks there, off one is freed
      e.preventDefault(); e.stopPropagation();
      const index = parseInt(vertex.getAttribute("data-vertex"), 10);
      const s = selectedShape;
      const isEnd = index === 0 || index === s.points.length - 1;
      const flight = { cancelled: false, last: null };
      flightRef.current = flight;
      gestures.begin({
        onMove: (ev) => {
          if (flight.cancelled) return;
          const p = toP(ev);
          const over = isEnd ? cardAt(ev.clientX, ev.clientY) : null;
          flight.last = { p, over };
          setLive({ id: s.id, index, p });
          setCursor(isEnd ? { p, over } : null);
        },
        onUp: () => {
          if (flightRef.current === flight) flightRef.current = null;
          setLive(null); setCursor(null);
          if (flight.cancelled || !flight.last) return;
          const points = s.points.map((q, i) => (i === index ? flight.last.p : q));
          const anchors = { ...(s.anchors || { start: null, end: null }) };
          if (index === 0) anchors.start = flight.last.over;
          if (index === s.points.length - 1) anchors.end = flight.last.over;
          apply(tabulaUpdateShape(stemma, board.id, s.id, { points, anchors }));
        },
      });
      return;
    }
    const hit = t && t.closest ? t.closest("[data-shape]") : null;
    const id = hit ? hit.getAttribute("data-shape") : null;
    const s = id ? shapes.find(x => x.id === id) : null;
    if (!s) return;
    e.preventDefault(); e.stopPropagation();
    select(s.id);
    if (!Array.isArray(s.points)) return;
    const start = toP(e);
    const flight = { cancelled: false, points: null };
    flightRef.current = flight;
    gestures.begin({
      onMove: (ev) => {
        if (flight.cancelled) return;
        const p = toP(ev);
        flight.points = translateMapShape(s, p[0] - start[0], p[1] - start[1]).points;
        setLive({ id: s.id, points: flight.points });
      },
      onUp: () => {
        if (flightRef.current === flight) flightRef.current = null;
        setLive(null);
        if (flight.cancelled || !flight.points) return;
        apply(tabulaUpdateShape(stemma, board.id, s.id, { points: flight.points }));
      },
    });
  };
  const onSvgClick = (e) => {
    if (tool !== "stroke" || isLocked || camera.spaceHeld) return;
    const p = toP(e);
    const over = cardAt(e.clientX, e.clientY);
    if (!draft) { setDraft({ type: "stroke", points: [p], start: over, over }); setCursor({ p, over }); return; }
    setDraft({ ...draft, points: [...draft.points, p], over });
  };
  const onSvgDoubleClick = (e) => {
    if (tool === "cards") return;
    e.preventDefault(); e.stopPropagation();
    if (!draft || draft.type !== "stroke") return;
    // the double-click's two clicks each placed a point at the same spot; drop the duplicate
    let pts = draft.points;
    if (pts.length >= 2) {
      const a = pts[pts.length - 1], b = pts[pts.length - 2];
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) <= 3 / zoom()) pts = pts.slice(0, -1);
    }
    finishDraft(pts);
  };
  const onSvgPointerMove = (e) => {
    if (tool !== "stroke" || isLocked) return;
    setCursor({ p: toP(e), over: cardAt(e.clientX, e.clientY) });
  };
  const onSvgPointerLeave = () => { if (tool === "stroke" && !draft) setCursor(null); };
  // right-click: in a drawing tool, finish what is in progress and go to
  // Select with it selected; in Select, back to the cards; never the menu
  const onSvgContextMenu = (e) => {
    if (tool === "cards" || isLocked) return;
    e.preventDefault();
    if (flightRef.current) return; // a long press on a touch screen is not a right-click mid-drag
    if (tool === "select") { setTool("cards"); return; }
    const id = finishDraft();
    setToolState("select"); setLive(null); setCursor(null);
    setSelectedShapeId(id);
  };
  // the keys, from the view's handler: true when the layer took the key
  const onKey = (e) => {
    if (e.key === "Escape") {
      if (draft) { cancelDraft(); return true; }
      if (selectedShapeId) { setSelectedShapeId(null); return true; }
      if (tool !== "cards") { setTool("cards"); return true; }
      return false;
    }
    if (e.key === "Enter" && draft && draft.type === "stroke") { e.preventDefault(); finishDraft(); return true; }
    if (!selectedShape || isLocked || e.ctrlKey || e.metaKey || e.altKey) return false;
    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); deleteSelected(); return true; }
    const step = TABULA.grid;
    const d = e.key === "ArrowLeft" ? [-step, 0] : e.key === "ArrowRight" ? [step, 0] : e.key === "ArrowUp" ? [0, -step] : e.key === "ArrowDown" ? [0, step] : null;
    if (d) { e.preventDefault(); nudge(d[0], d[1]); return true; }
    return false;
  };

  const drawTool = tool === "stroke" || tool === "freehand";
  return {
    tool, setTool, reset, drawTool, style: current, applyStyle,
    shapes, selectedShape, selectedShapeId, select, deselect, deleteSelected,
    draft, cursor, live, boxes, paneSize, drawn, endsFor, onKey,
    stickId: cursor && (tool === "stroke" || live) ? cursor.over : null,
    panelOpen: tool !== "cards" || !!selectedShape,
    onSvgPointerDown, onSvgClick, onSvgDoubleClick, onSvgPointerMove, onSvgPointerLeave, onSvgContextMenu,
  };
}

// The svg over the surface: the board's shapes through the map's renderer,
// each line at its drawn points; in Select, a transparent copy of each
// shape fourteen screen pixels wide to press, the selected line's halo and
// its point handles (none past the map's cap); the line in progress with
// its pending point. The box is the pane's visible rect in canvas units
// with a margin of a quarter, moved and sized with the view, so nothing of
// it is ever clipped and the hit copies never reach past where they're
// seen.
function TabulaDrawLayer({ d, view, boardId }) {
  const { paneSize, tool, selectedShape, draft, cursor, style, shapes, drawn, live } = d;
  if (!paneSize.w || !paneSize.h) return null;
  const f = mapNum;
  const z = view.zoom || 1;
  const vw = paneSize.w / z, vh = paneSize.h / z;
  const m = Math.max(vw, vh) / 4;
  const vx = view.x - m, vy = view.y - m, w = vw + 2 * m, h = vh + 2 * m;
  const mode = d.drawTool ? "draw" : tool === "select" ? "select" : "cards";
  const ctx = { idBase: `tabula-${String(boardId).replace(/[^A-Za-z0-9_-]/g, "")}`, defs: [], stampsUsed: new Map(), tints: new Map(), stamps: [], placeholder: false };
  const items = [];
  const withPoints = (s) => (s.type === "stroke" && Array.isArray(s.points) ? { ...s, points: drawn(s) } : s);
  shapes.forEach(s => {
    const node = mapShapeNode(withPoints(s), ctx);
    if (node) items.push(mapTreeToReact(node, s.id));
  });
  if (selectedShape) {
    const node = mapShapeNode(withPoints(selectedShape), { ...ctx, defs: [] });
    if (node) {
      const attrs = { ...node.attrs, fill: "none", stroke: "#c8a96e", "stroke-width": f((selectedShape.stroke ? selectedShape.strokeWidth : 1) + 6 / z), opacity: "0.35", "pointer-events": "none", "data-shape": null, "data-halo": selectedShape.id };
      items.push(mapTreeToReact({ ...node, attrs }, `halo-${selectedShape.id}`));
    }
  }
  if (tool === "select") {
    const hitCtx = { ...ctx, idBase: "tabula-hit", defs: [] };
    shapes.forEach(s => {
      const node = mapShapeNode(withPoints(s), hitCtx);
      if (!node) return;
      const attrs = { ...node.attrs, fill: s.type === "stroke" || !s.fill ? "none" : "transparent", stroke: "transparent", "stroke-width": "14", "vector-effect": "non-scaling-stroke", "data-hit": "shape" };
      delete attrs.filter;
      items.push(mapTreeToReact({ ...node, attrs }, `hit-${s.id}`));
    });
  }
  if (draft) {
    const trail = draft.type === "stroke" && cursor ? [...draft.points, cursor.p] : draft.points;
    if (trail.length >= 2) {
      const preview = { id: "draft", type: "stroke", points: tabulaDrawnPoints({ points: trail, anchors: { start: draft.type === "stroke" ? draft.start : null, end: null } }, d.boxes, null), fill: null, stroke: style.stroke, strokeWidth: style.strokeWidth, smooth: draft.type === "freehand" ? true : style.smooth, arrow: style.arrow };
      const node = mapShapeNode(preview, { ...ctx, defs: [] });
      if (node) items.push(mapTreeToReact({ ...node, attrs: { ...node.attrs, opacity: "0.7", "pointer-events": "none", "data-shape": null, "data-draft": "line" } }, "draft"));
    }
    if (draft.type === "stroke") {
      const hr = 4 / z;
      draft.points.forEach((p, i) => items.push(<circle key={`dp${i}`} cx={f(p[0])} cy={f(p[1])} r={f(hr)} fill="#f4efe4" stroke="#2b2420" strokeWidth={1} vectorEffect="non-scaling-stroke" pointerEvents="none" />));
    }
  }
  if (selectedShape && Array.isArray(selectedShape.points) && selectedShape.points.length <= MAP_FREEHAND.handleCap) {
    // a visible dot, then its hit target on top: a transparent disk and a
    // transparent sixteen-pixel ring around it, the map overlay's way
    const hr = 5 / z;
    drawn(selectedShape).forEach((p, i) => {
      items.push(<circle key={`h${i}`} cx={f(p[0])} cy={f(p[1])} r={f(hr)} fill="#f4efe4" stroke="#2b2420" strokeWidth={1} vectorEffect="non-scaling-stroke" pointerEvents="none" />);
      if (tool === "select") items.push(<circle key={`hh${i}`} cx={f(p[0])} cy={f(p[1])} r={f(hr)} fill="transparent" stroke="transparent" strokeWidth={16} vectorEffect="non-scaling-stroke" data-vertex={i} />);
    });
  }
  return (
    <svg
      className={`tabula-draw ${mode}${live ? " live" : ""}`}
      style={{ left: vx, top: vy, width: w, height: h }}
      viewBox={`${f(vx)} ${f(vy)} ${f(w)} ${f(h)}`}
      aria-hidden="true"
      onPointerDown={d.onSvgPointerDown}
      onClick={d.onSvgClick}
      onDoubleClick={d.onSvgDoubleClick}
      onPointerMove={d.onSvgPointerMove}
      onPointerLeave={d.onSvgPointerLeave}
      onContextMenu={d.onSvgContextMenu}
    >
      {ctx.defs.length > 0 ? mapTreeToReact({ tag: "defs", children: ctx.defs }, "defs") : null}
      {items}
    </svg>
  );
}

// The panel on the right while a tool is up or a line is selected, in the
// inspector's place and shape: what the tool does, the map's swatches for
// the stroke, the width (the slider to 32, the field to 64, the map's
// range), Smooth, the arrowheads, and Delete for a selected line. A change
// edits the selected line and becomes the next one's default.
function TabulaShapePanel({ d, onClose }) {
  const def = TABULA_TOOLS.find(t => t.id === d.tool);
  const shape = d.selectedShape;
  const cur = d.style;
  const field = (label, control) => (
    <div className="form-field">
      <label className="form-label">{label}</label>
      {control}
    </div>
  );
  const seg = (options, value, onPick, title) => (
    <div className="tabula-seg" title={title}>
      {options.map(([v, label]) => (
        <button key={String(v)} type="button" className={`btn btn-small ${value === v ? "btn-accent" : "btn-ghost"}`} aria-pressed={value === v} onClick={() => onPick(v)}>{label}</button>
      ))}
    </div>
  );
  return (
    <div className="tabula-ui tabula-shape-panel" style={{ width: 320, flexShrink: 0, borderLeft: "1px solid var(--border)", background: "var(--surf)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg)" }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>
          Drawing
          <span style={{ marginLeft: 8, fontSize: 11, color: "var(--text-dim)", fontWeight: 400 }}>{shape ? `Line, ${shape.points.length} points` : (def ? def.label : "")}</span>
        </div>
        <button className="btn btn-ghost" onClick={onClose} style={{ fontSize: 16, padding: "0 8px", lineHeight: 1 }} title={shape ? "Deselect the line (Esc)" : "Back to the cards (Esc)"}>×</button>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 14 }}>
        <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 12, lineHeight: 1.45 }}>{shape ? "A line on the board. Drag its points on the canvas; an end dropped on a card sticks to it and follows the card." : (def ? def.hint : "")}</div>
        {field("Stroke", (
          <div className="color-row">
            {MAP_PALETTE.map(c => (
              <div key={c.id} className={`color-opt ${cur.stroke === c.hex ? "sel" : ""}`} title={c.label} style={{ background: c.hex }} onClick={() => d.applyStyle({ stroke: c.hex })} />
            ))}
          </div>
        ))}
        {field("Width", (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input className="tabula-range" type="range" min={MAP_STROKE_WIDTH_RANGE.min} max={MAP_STROKE_WIDTH_RANGE.max} step="1" value={Math.min(MAP_STROKE_WIDTH_RANGE.max, cur.strokeWidth)} onChange={e => d.applyStyle({ strokeWidth: parseInt(e.target.value, 10) || MAP_STROKE_WIDTH_RANGE.min }, "width")} title="Line width, in canvas pixels at 100%" />
            <input className="input" type="number" style={{ width: 64 }} min={MAP_STROKE_WIDTH_RANGE.min} max={MAP_STROKE_WIDTH_RANGE.limit} step="1" value={cur.strokeWidth} onChange={e => { const v = parseInt(e.target.value, 10); if (Number.isFinite(v)) d.applyStyle({ strokeWidth: Math.max(MAP_STROKE_WIDTH_RANGE.min, Math.min(MAP_STROKE_WIDTH_RANGE.limit, v)) }, "width"); }} onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") e.target.blur(); }} title={`Line width, ${MAP_STROKE_WIDTH_RANGE.min} to ${MAP_STROKE_WIDTH_RANGE.limit}`} />
          </div>
        ))}
        {field("Smooth", seg([[true, "On"], [false, "Off"]], !!cur.smooth, (v) => d.applyStyle({ smooth: v }), "Curve the line through its points"))}
        {field("Arrowheads", seg([["none", "None"], ["end", "End"], ["both", "Both"]], cur.arrow || "none", (v) => d.applyStyle({ arrow: v }), "An arrowhead at the line's end, at both ends, or none"))}
      </div>
      {shape && (
        <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", background: "var(--bg)", display: "flex", flexDirection: "column", gap: 6 }}>
          <button className="btn" style={{ fontSize: 12, color: "var(--danger)", borderColor: "var(--danger)" }} onClick={d.deleteSelected} title="Delete the line (Delete)">Delete line</button>
        </div>
      )}
    </div>
  );
}