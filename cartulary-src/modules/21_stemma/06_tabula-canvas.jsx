
// ─── Tabula: the canvas (v1.7 r029) ────────────────────────────────────────────
// The board's screen (docs/stemma-v2-spec.md, section 6): HTML, not SVG, so a
// note wraps and renders Markdown; the surface is a div moved and scaled by
// one transform, cards absolutely positioned on it at their x and y, and the
// pane clips (overflow: clip, not hidden: a hidden pane is still a scroll
// container, and a field focused inside it scrolls the pane under the
// camera's feet). The camera is the map editor's grammar on an unbounded canvas.
// Edits are transforms (above) committed through useMapHistory and App's
// replaceStemma, the rota's path since r026, so Ctrl+Z and Ctrl+Y and the
// buttons walk them; a drag or a resize commits once, at its end.

// The gestures (r032, out of the view): one window-level move and up pair
// for whatever is on the pointer, a card's move, a width handle, a rail
// button's drag, a shape's move or point drag, or a freehand line.
function useTabulaGestures() {
  const gestureRef = useRef(null);
  const handlersRef = useRef(null);
  if (!handlersRef.current) handlersRef.current = {
    move: (e) => { const g = gestureRef.current; if (g && g.onMove) g.onMove(e); },
    up: (e) => { const g = gestureRef.current; if (!g) return; gestureRef.current = null; window.removeEventListener("pointermove", handlersRef.current.move); window.removeEventListener("pointerup", handlersRef.current.up); window.removeEventListener("pointercancel", handlersRef.current.up); if (g.onUp) g.onUp(e); },
  };
  const begin = (g) => {
    gestureRef.current = g;
    window.addEventListener("pointermove", handlersRef.current.move);
    window.addEventListener("pointerup", handlersRef.current.up);
    window.addEventListener("pointercancel", handlersRef.current.up);
  };
  useEffect(() => () => { gestureRef.current = null; document.body.classList.remove("tabula-dragging"); window.removeEventListener("pointermove", handlersRef.current.move); window.removeEventListener("pointerup", handlersRef.current.up); window.removeEventListener("pointercancel", handlersRef.current.up); }, []);
  return { ref: gestureRef, begin };
}

// The camera: the canvas point at the pane's top-left corner (x, y) and the
// zoom. Inputs: Ctrl+wheel about the pointer, a two-finger pinch, the keys
// + - 0 (0 fits the cards), a pan by the middle button or Space held, by
// the left button in a locked world, plain wheel (Shift for sideways).
function useTabulaCamera({ paneRef, isLocked, initial, onChange }) {
  const [view, setViewState] = useState(initial || { x: 0, y: 0, zoom: 1 });
  const viewRef = useRef(view);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [dragging, setDragging] = useState(false);
  const spaceRef = useRef(false);
  const panRef = useRef(null);
  const pinchRef = useRef(null);
  const touchRef = useRef(new Map());
  const attachedRef = useRef(false);
  const cfg = useRef({});
  cfg.current = { isLocked, onChange };
  const setView = (v) => { viewRef.current = v; setViewState(v); if (cfg.current.onChange) cfg.current.onChange(v); };
  const rectOf = () => (paneRef.current ? paneRef.current.getBoundingClientRect() : null);
  const clampZoom = (z) => Math.max(TABULA.zoomMin, Math.min(TABULA.zoomMax, z));
  const toCanvas = (clientX, clientY) => {
    const r = rectOf(); const v = viewRef.current;
    return r ? { x: v.x + (clientX - r.left) / v.zoom, y: v.y + (clientY - r.top) / v.zoom } : { x: v.x, y: v.y };
  };
  const zoomAt = (factor, clientX, clientY) => {
    const v = viewRef.current; const z = clampZoom(v.zoom * factor);
    const r = rectOf(); const px = r ? clientX - r.left : 0, py = r ? clientY - r.top : 0;
    setView({ x: v.x + px / v.zoom - px / z, y: v.y + py / v.zoom - py / z, zoom: z });
  };
  const zoomBy = (factor) => { const r = rectOf(); zoomAt(factor, r ? r.left + r.width / 2 : 0, r ? r.top + r.height / 2 : 0); };
  const panBy = (dx, dy) => { const v = viewRef.current; setView({ ...v, x: v.x + dx, y: v.y + dy }); };
  // fit a box in canvas units, or center the origin when there is nothing
  const fitTo = (box) => {
    const r = rectOf(); if (!r || !r.width || !r.height) return;
    if (!box) { setView({ x: -r.width / 2, y: -r.height / 2, zoom: 1 }); return; }
    const m = TABULA.fitMargin;
    const z = clampZoom(Math.min(r.width / Math.max(1, box.w + 2 * m), r.height / Math.max(1, box.h + 2 * m), 1));
    setView({ x: box.x + box.w / 2 - r.width / 2 / z, y: box.y + box.h / 2 - r.height / 2 / z, zoom: z });
  };
  const handlersRef = useRef(null);
  if (!handlersRef.current) handlersRef.current = { move: (e) => cfg.current.onMove(e), up: (e) => cfg.current.onUp(e) };
  const attach = () => { if (attachedRef.current) return; attachedRef.current = true; const h = handlersRef.current; window.addEventListener("pointermove", h.move); window.addEventListener("pointerup", h.up); window.addEventListener("pointercancel", h.up); };
  const detach = () => { if (!attachedRef.current) return; attachedRef.current = false; const h = handlersRef.current; window.removeEventListener("pointermove", h.move); window.removeEventListener("pointerup", h.up); window.removeEventListener("pointercancel", h.up); };
  cfg.current.onMove = (e) => {
    if (e.pointerType === "touch" && touchRef.current.has(e.pointerId)) touchRef.current.set(e.pointerId, [e.clientX, e.clientY]);
    const pinch = pinchRef.current;
    if (pinch) {
      const pts = Array.from(touchRef.current.values());
      if (pts.length < 2) return;
      const [a, b] = pts;
      const dist = Math.max(1, Math.hypot(a[0] - b[0], a[1] - b[1]));
      const z = clampZoom(pinch.zoom * dist / pinch.dist);
      const r = rectOf(); const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      const px = r ? mx - r.left : 0, py = r ? my - r.top : 0;
      setView({ x: pinch.anchor[0] - px / z, y: pinch.anchor[1] - py / z, zoom: z });
      return;
    }
    const pan = panRef.current;
    if (!pan || e.pointerId !== pan.pointerId) return;
    const dx = e.clientX - pan.startX, dy = e.clientY - pan.startY;
    if (!pan.moved && Math.hypot(dx, dy) > TABULA.dragSlop) pan.moved = true;
    if (!pan.moved) return;
    setView({ x: pan.view.x - dx / pan.view.zoom, y: pan.view.y - dy / pan.view.zoom, zoom: pan.view.zoom });
  };
  cfg.current.onUp = (e) => {
    if (e.pointerType === "touch") {
      touchRef.current.delete(e.pointerId);
      if (pinchRef.current && touchRef.current.size < 2) pinchRef.current = null;
    }
    if (panRef.current && e.pointerId === panRef.current.pointerId) {
      const tapped = !panRef.current.moved;
      panRef.current = null; setDragging(false);
      // a pan that never moved is a tap on the canvas; the view deselects
      if (tapped && cfg.current.onTap) cfg.current.onTap(e);
    }
    if (!panRef.current && !pinchRef.current && touchRef.current.size === 0) detach();
  };
  // The pane's capture-phase pointerdown: a pan or a pinch takes the pointer
  // before a card sees it. Returns true when it took the press.
  const onPointerDownCapture = (e) => {
    const t = e.target;
    if (t && t.closest && t.closest(".tabula-ui")) return false;
    if (e.pointerType === "touch") {
      touchRef.current.set(e.pointerId, [e.clientX, e.clientY]);
      attach();
      if (touchRef.current.size === 2) {
        if (panRef.current) { panRef.current = null; setDragging(false); }
        const [a, b] = Array.from(touchRef.current.values());
        const v = viewRef.current;
        const mid = toCanvas((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        pinchRef.current = { dist: Math.max(1, Math.hypot(a[0] - b[0], a[1] - b[1])), zoom: v.zoom, anchor: [mid.x, mid.y] };
        e.stopPropagation(); e.preventDefault();
        return true;
      }
      if (touchRef.current.size > 2) { e.stopPropagation(); e.preventDefault(); return true; }
    }
    if (pinchRef.current) { e.stopPropagation(); return true; }
    const onCard = !!(t && t.closest && t.closest(".tabula-card"));
    const pan = e.button === 1 || (e.button === 0 && (spaceRef.current || (cfg.current.isLocked && !onCard)));
    if (!pan) return false;
    e.stopPropagation(); e.preventDefault();
    panRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, view: viewRef.current, moved: false };
    setDragging(true);
    attach();
    return true;
  };
  // the wheel, bound natively so the page never zooms or scrolls instead
  useEffect(() => {
    const el = paneRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      if (pinchRef.current || panRef.current) return;
      if (e.ctrlKey || e.metaKey) { zoomAt(e.deltaY < 0 ? TABULA.zoomStep : 1 / TABULA.zoomStep, e.clientX, e.clientY); return; }
      const v = viewRef.current;
      let dx = e.deltaX, dy = e.deltaY;
      if (e.shiftKey && dx === 0) { dx = dy; dy = 0; }
      const k = e.deltaMode === 1 ? 16 : (e.deltaMode === 2 ? 400 : 1);
      panBy(dx * k / v.zoom, dy * k / v.zoom);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);
  // Space held, and the zoom keys, document-wide, typing fields excluded
  useEffect(() => {
    const typing = (t) => { const tag = t && t.tagName ? t.tagName.toUpperCase() : ""; return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !!(t && t.isContentEditable); };
    const down = (e) => {
      if (typing(e.target)) return;
      if (e.key === " ") {
        if (!spaceRef.current) { spaceRef.current = true; setSpaceHeld(true); }
        const el = paneRef.current;
        if (el && typeof el.matches === "function" && el.matches(":hover")) e.preventDefault();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "+" || e.key === "=") { e.preventDefault(); zoomBy(TABULA.zoomStep); }
      else if (e.key === "-" || e.key === "_") { e.preventDefault(); zoomBy(1 / TABULA.zoomStep); }
      else if (e.key === "0") { e.preventDefault(); if (cfg.current.onFit) cfg.current.onFit(); }
    };
    const up = (e) => { if (e.key === " ") { spaceRef.current = false; setSpaceHeld(false); } };
    const blur = () => { spaceRef.current = false; setSpaceHeld(false); };
    document.addEventListener("keydown", down);
    document.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => { document.removeEventListener("keydown", down); document.removeEventListener("keyup", up); window.removeEventListener("blur", blur); };
  }, []);
  useEffect(() => () => { panRef.current = null; pinchRef.current = null; touchRef.current.clear(); detach(); }, []);
  return { view, viewRef, setView, zoomAt, zoomBy, panBy, fitTo, toCanvas, rectOf, onPointerDownCapture, dragging, spaceHeld, cfg };
}

// One card: placed on the canvas (absolute, at x and y, w wide, with the
// width handle) or in a column's stack (in flow, the column's width). A note
// shows its title and its body as Markdown (wiki-links resolve through the
// pool), or, edited in place, a title field and a body field that commit as
// they're typed, a run of typing one history step, the inspector's way; a
// linked card draws its record's icon and color and its source, orphaned
// when the record is gone; an image shows its picture and caption; a column
// (r030) shows its title, edited in place the same way, over its stack, with
// an insertion line at `insertAt` while something is dragged over it, each
// item rendered through `renderItem`; a board card (r030) shows its icon,
// its title, and what it holds. `ghost` is the copy that follows the
// pointer while a stack item is on the move; `over` marks a column or a
// board card a drag is over, and `overEdge` names the board card's edge
// nearest the pointer, where the line is drawn. Since r031 the grip strip in
// the left margin (`onGripDown`) is the only surface that drags; a press on
// the body (`onPointerDown`) selects. A column's header is its grip. `stick`
// (r032) lights the card a line's pending end is over. A column holding
// lanes (r033) draws its header over a row of lanes, each a column that
// isn't placed, drawn as `.tabula-lane` with its own header and its stack
// or its own lanes through `renderItem`, at any depth; `laneInsertAt`
// draws the line where a column dragged over it would become a lane,
// before or after a plain column's stack, or between lanes.
// A column's `role` (r033) is what it is to what holds it: "column" on a
// board, "lane" in a column, "stack" under a card; the words follow it. A
// lane with a width of its own (`w`) is drawn at it unless it is the last
// (`lastLane`), which takes what's left; between lanes a divider
// (`onLaneDivider`, given the lane before it, its index, and the lanes)
// sets that width by a drag (r033). `fit` (r033) is what the item needs
// drawn, tabulaNeed: a placed card or column is drawn at the larger of
// its width and it, a lane never narrower, a card in a row (`inRow`) at
// it exactly.
function TabulaCard({ item, placed, x, y, w, role, lastLane, fit, inRow, pool, templates, selected, dragging, ghost, over, overEdge, stick, editing, onEditChange, onEditDone, onPointerDown, onGripDown, onHandleDown, onDoubleClick, onOpenEntry, dirHandle, imageFolder, renderItem, insertAt, laneInsertAt, onLaneDivider }) {
  const editRef = useRef(null);
  const { url: imageUrl, errored: imageErrored } = useMapImageUrl(item.type === "image" ? item.image : null, dirHandle, imageFolder);
  useEffect(() => {
    if (editing && editRef.current) {
      const first = editRef.current.querySelector("input");
      if (first) { first.focus({ preventScroll: true }); first.select(); }
    }
  }, [!!editing]);
  const editBox = (fields) => (
    <div
      ref={editRef}
      className="tabula-card-edit tabula-ui"
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) onEditDone(); }}
      onKeyDown={(e) => {
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onEditDone(); return; }
        if (e.key === "Enter" && e.target.tagName === "INPUT") { e.preventDefault(); e.stopPropagation(); const ta = e.currentTarget.querySelector("textarea"); if (ta) ta.focus({ preventScroll: true }); else onEditDone(); return; }
        e.stopPropagation();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >{fields}</div>
  );
  let body = null;
  let accent = null;
  if (item.type === "note") {
    accent = item.color || TABULA.color;
    if (editing) {
      body = editBox(
        <>
          <input type="text" value={item.title || ""} placeholder="Title" onChange={(e) => onEditChange({ title: e.target.value }, "title")} />
          <textarea value={item.body || ""} placeholder="Markdown; [[wiki-links]] resolve" rows={Math.max(3, Math.min(14, (item.body || "").split("\n").length + 1))} onChange={(e) => onEditChange({ body: e.target.value }, "body")} />
        </>
      );
    } else {
      body = (
        <>
          <div className="tabula-card-title" style={{ color: item.title ? "var(--text)" : "var(--text-dim)", fontStyle: item.title ? "normal" : "italic" }}>{item.title || "Untitled"}</div>
          {item.body ? (
            <div className="tabula-card-body"><MarkdownDisplay markdown={item.body} entries={pool} templates={templates} bodies={[]} onOpenEntry={onOpenEntry} dirHandle={dirHandle} /></div>
          ) : null}
        </>
      );
    }
  } else if (item.type === "linked") {
    const rec = (pool || []).find(e => e.id === item.entryId);
    const tpl = rec ? (templates || []).find(t => t.id === rec.templateId) : null;
    const orphan = !rec;
    const color = orphan ? "#666" : ((rec.synthetic && rec.color) || (tpl && tpl.color) || "#888");
    const icon = orphan ? "⚯" : ((tpl && tpl.icon) || "◈");
    const name = orphan ? (item._cachedName || "(unlinked)") : (rec.name || "(unnamed)");
    const src = orphan ? "unlinked" : (rec.synthetic ? stemmaSourceLabel(rec.templateId) : ((tpl && tpl.name) || "entry"));
    body = (
      <div className={`tabula-linked${orphan ? " orphan" : ""}`} title={orphan ? "The record this card was linked to no longer exists" : name}>
        <div className="face" style={{ background: color, opacity: orphan ? 0.55 : 1 }}>{icon}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="name">{name}</div>
          <div className="src">{src}</div>
        </div>
      </div>
    );
  } else if (item.type === "image") {
    body = (
      <>
        {imageUrl && !imageErrored ? (
          <img className="tabula-image" src={imageUrl} alt={item.caption || ""} draggable={false} />
        ) : (
          <div className="tabula-caption" style={{ padding: "18px 10px", fontStyle: "italic" }}>{imageErrored ? `Image not found: ${item.image}` : (item.image ? "Loading image…" : "No image")}</div>
        )}
        {item.caption ? <div className="tabula-caption">{item.caption}</div> : null}
      </>
    );
  } else if (item.type === "column") {
    const color = item.color || TABULA.color;
    const what = role || (placed || ghost ? "column" : "lane");  // a column that isn't placed is a lane, or a stack (r033)
    const lane = what !== "column";
    const lanes = tabulaIsLaned(item) ? item.items : null;
    const row = !lanes && item.flow === "row";  // the cards side by side (r033)
    const slim = what === "stack" && !item.title;  // an untitled stack under a card draws slim (r033)
    const stack = lanes ? [] : (item.items || []);
    const shown = !lanes && renderItem ? stack.map(renderItem).filter(Boolean) : [];  // the item on the move is left out, as the gap index is
    const rows = [];
    shown.forEach((el, i) => {
      if (insertAt === i) rows.push(<div key="ins" className="tabula-insert" />);
      if (el) rows.push(el);
    });
    if (insertAt !== null && insertAt !== undefined && insertAt >= shown.length) rows.push(<div key="ins" className="tabula-insert" />);
    const laneAt = laneInsertAt !== null && laneInsertAt !== undefined ? laneInsertAt : -1;
    body = (
      <>
        <div className="tabula-column-hdr" style={{ borderTop: `3px solid ${color}` }} title={editing ? undefined : `Drag to move the ${what}`} onPointerDown={editing ? undefined : onGripDown}>
          {!editing && !ghost && <span className="tabula-grip tabula-grip-inline" aria-hidden="true">⋮⋮</span>}
          {editing ? editBox(<input type="text" value={item.title || ""} placeholder={what === "lane" ? "Lane" : what === "stack" ? "Stack" : "Column"} onChange={(e) => onEditChange({ title: e.target.value }, "title")} />) : (
            <div className="tabula-column-title" style={{ color: item.title ? "var(--text)" : "var(--text-dim)", fontStyle: item.title ? "normal" : "italic" }}>{item.title || (slim ? "" : `Untitled ${what}`)}</div>
          )}
        </div>
        {lanes ? (
          <div className="tabula-lanes">
            {lanes.map((l, i) => (
              <React.Fragment key={l.id}>
                {laneAt === i && <div className="tabula-lane-insert" />}
                {renderItem ? renderItem(l, i === lanes.length - 1) : null}
                {onLaneDivider && i < lanes.length - 1 && <div className="tabula-lane-divider" title="Drag to set the lane's width" onPointerDown={onLaneDivider(l, i, lanes)} />}
              </React.Fragment>
            ))}
            {laneAt >= lanes.length && <div className="tabula-lane-insert" />}
          </div>
        ) : (
          <div className={`tabula-column-body${row ? " row" : ""}${laneAt === 0 ? " lane-before" : laneAt >= 1 ? " lane-after" : ""}`}>
            {rows.length > 0 ? rows : <div className="tabula-column-empty">{over ? "" : (lane ? "" : "Drop cards here")}</div>}
          </div>
        )}
      </>
    );
  } else if (item.type === "board") {
    const color = item.color || TABULA.color;
    const held = tabulaCountBelow(item);
    const holds = held.cards === 0 && held.columns === 0 ? "empty" : [held.cards ? `${held.cards} ${held.cards === 1 ? "card" : "cards"}` : null, held.columns ? `${held.columns} ${held.columns === 1 ? "column" : "columns"}` : null].filter(Boolean).join(" · ");
    body = (
      <div className="tabula-board" title="Double-click to open">
        <div className="face" style={{ background: color }}>{item.icon || TABULA.icon}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          {editing ? editBox(<input type="text" value={item.title || ""} placeholder="Board" onChange={(e) => onEditChange({ title: e.target.value }, "title")} />) : (
            <div className="name" style={{ color: item.title ? "var(--text)" : "var(--text-dim)", fontStyle: item.title ? "normal" : "italic" }}>{item.title || "Untitled board"}</div>
          )}
          <div className="src">{holds}</div>
        </div>
      </div>
    );
  } else {
    return null;
  }
  // the stacks under a card (r033), and the line where a column dragged
  // over it would go: among the stacks by x, or under the body when it has none
  const stacks = item.type !== "column" && item.type !== "board" && Array.isArray(item.items) ? item.items : [];
  const stackAt = laneInsertAt !== null && laneInsertAt !== undefined && item.type !== "column" ? laneInsertAt : -1;
  const under = stacks.length || stackAt >= 0 ? (
    <div className={`tabula-lanes tabula-under${stacks.length ? "" : " tabula-under-new"}`}>
      {stacks.map((l, i) => (
        <React.Fragment key={l.id}>
          {stackAt === i && <div className="tabula-lane-insert" />}
          {renderItem ? renderItem(l, i === stacks.length - 1) : null}
          {onLaneDivider && i < stacks.length - 1 && <div className="tabula-lane-divider" title="Drag to set the stack's width" onPointerDown={onLaneDivider(l, i, stacks)} />}
        </React.Fragment>
      ))}
      {stackAt >= stacks.length && <div className="tabula-lane-insert" />}
    </div>
  ) : null;
  const slimStack = item.type === "column" && role === "stack" && !item.title;
  const cls = `${placed ? "tabula-card" : (item.type === "column" ? "tabula-lane" : "tabula-colitem")}${selected ? " selected" : ""}${dragging ? " dragging" : ""}${ghost ? " ghost" : ""}${over ? " over" : ""}${stick ? " stick" : ""}${item.type === "column" ? " is-column" : ""}${stacks.length ? " has-stacks" : ""}${slimStack ? " untitled" : ""}`;
  const gripped = item.type !== "column";
  // the width (r033): a placed item at the larger of its own and its need, a
  // lane at its own or flexing but never under its need, a card in a row at its need
  const need = Number.isFinite(fit) ? fit : 0;
  const sizing = placed
    ? { width: Math.max(Number.isFinite(w) ? w : 0, need) }
    : item.type === "column" && !ghost
      ? { minWidth: need || undefined, ...(Number.isFinite(w) && !lastLane ? { flex: `0 1 ${Math.max(w, need)}px` } : {}) }
      : inRow ? { flex: `0 0 ${need}px`, width: need } : {};
  return (
    <div
      className={cls}
      data-item={item.id}
      data-type={item.type}
      data-flow={item.type === "column" && item.flow === "row" ? "row" : undefined}
      style={placed ? { left: x, top: y, ...sizing, borderLeft: accent ? `3px solid ${accent}` : undefined } : { borderLeft: accent ? `3px solid ${accent}` : undefined, ...sizing }}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
    >
      {gripped && !ghost && (
        <div className="tabula-grip" title="Drag to move" style={accent ? { background: `${accent}22` } : undefined} onPointerDown={onGripDown} onDoubleClick={(e) => e.stopPropagation()}>⋮⋮</div>
      )}
      {gripped ? <div className="tabula-body">{body}</div> : body}
      {under}
      {over && overEdge && <div className={`tabula-edge tabula-edge-${overEdge}`} />}
      {placed && !ghost && <div className="tabula-card-handle" title="Drag to resize" onPointerDown={onHandleDown} />}
    </div>
  );
}

// The right-side inspector for the selected card, the rota's pattern: a
// note's title, body, and color; a linked card's record with Open where
// something opens, re-link, and convert to a note; an image's caption and
// its replacement; a column's title and color (r030); a board's title,
// color, and icon, with Open (r030); what a column or a board holds; Delete
// on every card. A run of typing in a field is one history step. A column
// (r033) has Cards per row, the lanes it holds, 1 to TABULA.maxLanes
// (`onLanes`), and so has a lane (`isLane`), whose lanes are lanes of its
// own, and a stack under a card (`isStack`); a card has its stacks (r033),
// Add a stack when it has none and their count when it has some, through
// `onLanes` too; every card has Duplicate (`onDuplicate`).
function TabulaInspector({ item, isLane, isStack, pool, templates, isLocked, onClose, onPatch, onDelete, onRelink, onConvertToNote, onOpenEntry, onReplaceImage, onOpenBoard, onLanes, onDuplicate }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  useEffect(() => { setPickerOpen(false); }, [item && item.id]);
  if (!item) return null;
  const field = (label, control) => (
    <div className="form-field">
      <label className="form-label">{label}</label>
      {control}
    </div>
  );
  const colorRow = (
    <div className="color-row">
      {COLORS.map(color => (
        <div key={color} className={`color-opt ${item.color === color ? "sel" : ""}`} style={{ background: color, ...(isLocked ? { opacity: 0.5, cursor: "default" } : {}) }} onClick={() => !isLocked && onPatch({ color })} />
      ))}
    </div>
  );
  const holdsLine = (node) => {
    const held = tabulaCountBelow(node);
    const parts = [held.cards ? `${held.cards} ${held.cards === 1 ? "card" : "cards"}` : null, held.columns ? `${held.columns} ${held.columns === 1 ? "column" : "columns"}` : null].filter(Boolean);
    const stacks = tabulaStacked(node) ? ` in ${node.items.length} ${node.items.length === 1 ? "stack" : "stacks"}` : "";
    return <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>{parts.length ? `Holds ${parts.join(" and ")}${stacks}.` : (stacks ? `Holds nothing yet${stacks}.` : "Holds nothing yet.")}</div>;
  };
  // the stacks under a card (r033): Add a stack, or their count, as a column's lanes
  const stacksField = () => {
    const count = tabulaStacked(item) ? item.items.length : 0;
    return field("Stacks under it", count === 0 ? (
      <button type="button" className="btn btn-ghost btn-small" disabled={isLocked} title="A column under the card, its cards stacked below it; a column dropped on the card does the same" onClick={() => onLanes && onLanes(1)}>Add a stack</button>
    ) : (
      <div className="tabula-seg tabula-seg-lanes" title="Stacks side by side under the card, each its own column with its own title; the cards keep their places when the count changes">
        {Array.from({ length: TABULA.maxLanes }, (_, i) => i + 1).map(n => (
          <button key={n} type="button" className={`btn btn-small ${count === n ? "btn-accent" : "btn-ghost"}`} aria-pressed={count === n} disabled={isLocked} onClick={() => onLanes && onLanes(n)}>{n}</button>
        ))}
      </div>
    ));
  };
  let body = null;
  const kind = item.type === "note" ? "Note" : item.type === "linked" ? "Linked" : item.type === "image" ? "Image" : item.type === "column" ? (isLane ? "Lane" : isStack ? "Stack" : "Column") : "Board";
  if (item.type === "note") {
    body = (
      <>
        {field("Title", <input className="input" type="text" value={item.title || ""} disabled={isLocked} placeholder="Untitled" onChange={(e) => onPatch({ title: e.target.value }, "title")} />)}
        {field("Body", <textarea className="input" value={item.body || ""} disabled={isLocked} placeholder="Markdown; [[wiki-links]] resolve" rows={8} style={{ overflow: "auto", minHeight: 120 }} onChange={(e) => onPatch({ body: e.target.value }, "body")} />)}
        {field("Color", colorRow)}
        {stacksField()}
        {tabulaStacked(item) && holdsLine(item)}
      </>
    );
  } else if (item.type === "linked") {
    const rec = (pool || []).find(e => e.id === item.entryId);
    const tpl = rec ? (templates || []).find(t => t.id === rec.templateId) : null;
    const orphan = !rec;
    const label = rec && rec.synthetic ? stemmaSourceLabel(rec.templateId) : "entry";
    body = (
      <>
        <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 4 }}>{orphan ? "Linked record (missing)" : `Linked to ${label}`}</div>
        {orphan ? (
          <div style={{ fontSize: 14, fontStyle: "italic", color: "var(--danger)", marginBottom: 10 }}>{item._cachedName || "(unlinked)"}</div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, marginBottom: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: (rec.synthetic && rec.color) || (tpl && tpl.color) || "#888", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--bg)", fontSize: 14, flexShrink: 0 }}>{(tpl && tpl.icon) || "◈"}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rec.name || "(unnamed)"}</div>
              <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{(tpl && tpl.name) || "(no template)"}</div>
            </div>
          </div>
        )}
        {!orphan && (stemmaTargetOpens(rec) ? (
          <button className="btn btn-ghost" style={{ fontSize: 12, width: "100%", marginBottom: 6 }} onClick={() => onOpenEntry(rec.id)}>Open {rec.synthetic ? label : "entry"} →</button>
        ) : (
          <div style={{ fontSize: 11, color: "var(--text-dim)", fontStyle: "italic", marginBottom: 6 }}>Nothing opens a {label} yet.</div>
        ))}
        {pickerOpen && (
          <StemmaInspectorEntryPicker entries={pool} label="Re-link to a different record" onPick={(id, name) => { onRelink(id, name); setPickerOpen(false); }} onCancel={() => setPickerOpen(false)} />
        )}
        {!pickerOpen && stacksField()}
        {!pickerOpen && tabulaStacked(item) && holdsLine(item)}
      </>
    );
  } else if (item.type === "image") {
    body = (
      <>
        {field("Caption", <input className="input" type="text" value={item.caption || ""} disabled={isLocked} placeholder="A caption, shown under the picture" onChange={(e) => onPatch({ caption: e.target.value }, "caption")} />)}
        <div style={{ fontSize: 11, color: "var(--text-dim)", wordBreak: "break-all", marginBottom: 10 }}>{item.image && item.image.startsWith("data:") ? "Stored inside the save file" : `Images folder: ${item.image}`}</div>
        {stacksField()}
        {tabulaStacked(item) && holdsLine(item)}
      </>
    );
  } else if (item.type === "column") {
    const laneCount = tabulaIsLaned(item) ? item.items.length : 1;
    const word = isLane ? "lane" : isStack ? "stack" : "column";
    body = (
      <>
        {field("Title", <input className="input" type="text" value={item.title || ""} disabled={isLocked} placeholder={`Untitled ${word}`} onChange={(e) => onPatch({ title: e.target.value }, "title")} />)}
        {field("Color", colorRow)}
        {!tabulaIsLaned(item) && field("Lay out", (
          <div className="tabula-seg tabula-seg-flow" title="Stack lays the cards under each other; Row lays them side by side, each as wide as what it holds, and what holds the row grows to fit">
            {[["stack", "Stack"], ["row", "Row"]].map(([v, label]) => (
              <button key={v} type="button" className={`btn btn-small ${(item.flow === "row" ? "row" : "stack") === v ? "btn-accent" : "btn-ghost"}`} aria-pressed={(item.flow === "row" ? "row" : "stack") === v} disabled={isLocked} onClick={() => onPatch(it => { const { flow, ...rest } = it; return v === "row" ? { ...rest, flow: "row" } : rest; })}>{label}</button>
            ))}
          </div>
        ))}
        {field("Cards per row", (
          <div className="tabula-seg tabula-seg-lanes" title={`Lanes side by side${word === "column" ? "" : ` inside this ${word}`}, each its own stack with its own title; the cards keep their places when the count changes`}>
            {Array.from({ length: TABULA.maxLanes }, (_, i) => i + 1).map(n => (
              <button key={n} type="button" className={`btn btn-small ${laneCount === n ? "btn-accent" : "btn-ghost"}`} aria-pressed={laneCount === n} disabled={isLocked} onClick={() => onLanes && onLanes(n)}>{n}</button>
            ))}
          </div>
        ))}
        {holdsLine(item)}
      </>
    );
  } else if (item.type === "board") {
    body = (
      <>
        {field("Title", <input className="input" type="text" value={item.title || ""} disabled={isLocked} placeholder="Untitled board" onChange={(e) => onPatch({ title: e.target.value }, "title")} />)}
        {field("Icon", (
          <div className="icon-grid">
            {ICONS.map(icon => (
              <div key={icon} className={`icon-opt ${item.icon === icon ? "sel" : ""}`} onClick={() => !isLocked && onPatch({ icon })} style={isLocked ? { opacity: 0.5, cursor: "default" } : {}}>{icon}</div>
            ))}
          </div>
        ))}
        {field("Color", colorRow)}
        {holdsLine(item)}
        <button className="btn btn-ghost" style={{ fontSize: 12, width: "100%", marginTop: 10 }} onClick={() => onOpenBoard(item.id)}>Open board →</button>
      </>
    );
  }
  return (
    <div className="tabula-ui" style={{ width: 320, flexShrink: 0, borderLeft: "1px solid var(--border)", background: "var(--surf)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg)" }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>
          Inspector
          <span style={{ marginLeft: 8, fontSize: 11, color: "var(--text-dim)", fontWeight: 400 }}>{kind}</span>
        </div>
        <button className="btn btn-ghost" onClick={onClose} style={{ fontSize: 16, padding: "0 8px", lineHeight: 1 }} title="Close inspector">×</button>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 14 }}>{body}</div>
      {!isLocked && !pickerOpen && (
        <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", background: "var(--bg)", display: "flex", flexDirection: "column", gap: 6 }}>
          {item.type === "linked" && (
            <>
              <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setPickerOpen(true)}>Re-link to a different record</button>
              <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={onConvertToNote} title="Keep the name as a note's title">Convert to note</button>
            </>
          )}
          {item.type === "image" && (
            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={onReplaceImage}>Replace image…</button>
          )}
          {onDuplicate && <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={onDuplicate} title="A copy beside it (Ctrl+D)">Duplicate</button>}
          <button className="btn" style={{ fontSize: 12, color: "var(--danger)", borderColor: "var(--danger)" }} onClick={onDelete}>{item.type === "column" ? (isLane ? "Delete lane" : isStack ? "Delete stack" : "Delete column") : item.type === "board" ? "Delete board" : "Delete card"}</button>
        </div>
      )}
    </div>
  );
}

// Deleting a column or a board card that holds anything asks (v1.7 r030),
// Fabula's holds-delete modal's shape: a column's cards can go out onto the
// canvas where they stood, the default, or with it; a board's go with it,
// with the count. A card with stacks (r033) asks too: Move out puts its
// stacks on the canvas whole, where they stood. Esc cancels, as a click
// outside does.
function TabulaDeleteModal({ items, isLane, isStack, onMoveOut, onDeleteAll, onCancel }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); onCancel(); } };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onCancel]);
  const list = Array.isArray(items) ? items : [items];
  const held = list.reduce((acc, it) => { const h = tabulaCountBelow(it); return { cards: acc.cards + h.cards, columns: acc.columns + h.columns }; }, { cards: 0, columns: 0 });
  const parts = [held.cards ? `${held.cards} ${held.cards === 1 ? "card" : "cards"}` : null, held.columns ? `${held.columns} ${held.columns === 1 ? "column" : "columns"}` : null].filter(Boolean).join(" and ");
  const hasColumn = list.some(it => it.type === "column" || tabulaStacked(it));
  const many = list.length > 1;
  const item = list[0];
  const isColumn = item.type === "column";
  const stacked = tabulaStacked(item);
  const word = isColumn ? (isLane ? "lane" : isStack ? "stack" : "column") : item.type === "board" ? "board" : "card";
  const name = isColumn || item.type === "board" ? (item.title || `Untitled ${word}`) : item.type === "note" ? (item.title || "Untitled") : item.type === "linked" ? (item._cachedName || "a linked card") : (item.caption || "an image");
  const stacksWord = stacked ? (item.items.length === 1 ? "its stack" : `its ${item.items.length} stacks`) : "";
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal tabula-holds-delete" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">{many ? `Delete ${list.length} items` : `Delete the ${word}`}</div>
        <div className="modal-body">
          <p style={{ margin: "0 0 10px" }}>{many ? `Delete the ${list.length} selected items?` : `Delete ${word} "${name}"?`}</p>
          {many ? (
            <p style={{ margin: 0 }}>Together they hold {parts}.{hasColumn ? " Move out puts the columns' cards, and the stacks under cards, on the canvas where they stood (a board's go with it); Delete everything deletes it all." : " Everything inside goes with them."}</p>
          ) : isColumn ? (
            <p style={{ margin: 0 }}>It holds {parts}. Move out puts {held.cards === 1 ? "it" : "them"} on the canvas where {held.cards === 1 ? "it" : "they"} stood; Delete everything deletes it all.</p>
          ) : stacked ? (
            <p style={{ margin: 0 }}>It holds {parts || "nothing"} in {stacksWord}. Move out puts {item.items.length === 1 ? "the stack" : "the stacks"} on the canvas where {item.items.length === 1 ? "it" : "they"} stood, whole; Delete everything deletes it all.</p>
          ) : (
            <p style={{ margin: 0 }}>It holds {parts}, and everything inside it goes with it.</p>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onDeleteAll} autoFocus={!hasColumn}>Delete everything</button>
          {hasColumn && <button className="btn btn-accent" onClick={onMoveOut} autoFocus>Move out</button>}
        </div>
      </div>
    </div>
  );
}

// The panel on the right while more than one card is selected (r033), in
// the inspector's place: the count, what a group can do, Duplicate, Delete.
function TabulaSelectionPanel({ count, isLocked, onDuplicate, onDelete, onClose }) {
  return (
    <div className="tabula-ui tabula-selection-panel" style={{ width: 320, flexShrink: 0, borderLeft: "1px solid var(--border)", background: "var(--surf)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg)" }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>
          Selection
          <span style={{ marginLeft: 8, fontSize: 11, color: "var(--text-dim)", fontWeight: 400 }}>{count} cards</span>
        </div>
        <button className="btn btn-ghost" onClick={onClose} style={{ fontSize: 16, padding: "0 8px", lineHeight: 1 }} title="Deselect (Esc)">×</button>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 14, fontSize: 12, color: "var(--text-dim)", lineHeight: 1.5 }}>
        <p style={{ margin: "0 0 8px" }}>{count} cards selected. Shift+click adds or removes one; a drag on empty canvas selects what it encloses.</p>
        <p style={{ margin: "0 0 8px" }}>Drag any grip to move the placed ones together, onto the board, into a column in their order, or into a sub-board as they sit. The arrows nudge them by the grid.</p>
        <p style={{ margin: 0 }}>Ctrl+C copies, Ctrl+V pastes around the view's center, Ctrl+D duplicates beside, Delete deletes.</p>
      </div>
      {!isLocked && (
        <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", background: "var(--bg)", display: "flex", flexDirection: "column", gap: 6 }}>
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={onDuplicate} title="Copies beside the originals (Ctrl+D)">Duplicate {count} cards</button>
          <button className="btn" style={{ fontSize: 12, color: "var(--danger)", borderColor: "var(--danger)" }} onClick={onDelete}>Delete {count} cards</button>
        </div>
      )}
    </div>
  );
}

// The canvas view. boardId names the board node shown: the root, or a
// sub-board opened by a double-click on its card (r030), with the rota's
// breadcrumb in the bar and Back to its parent. The pool and the templates
// are the rota's (App builds them).
function TabulaCanvasView({ stemma, boardId, entries, templates, isLocked, flash, onFocalChange, onBackToIndex, onReplace, onOpenEntry, onExport, onExportMarkdown, viewPref, onViewPref, dirHandle, imageFolder }) {
  const board = tabulaBoardNode(stemma.root, boardId) || stemma.root;
  const history = useMapHistory(stemma, onReplace);
  const apply = (next, opts) => {
    if (isLocked || !next || next === stemma) return;
    history.commit(next, opts);
  };
  const paneRef = useRef(null);
  const surfaceRef = useRef(null);
  const [selection, setSelection] = useState([]);   // the selected cards' ids in the order picked, the last the primary (r033)
  const selectedId = selection.length ? selection[selection.length - 1] : null;
  const setSelectedId = (id) => setSelection(id ? [id] : []);
  const toggleSelected = (id) => setSelection(sel => (sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]));
  const [marquee, setMarquee] = useState(null);     // { x0, y0, x1, y1 }, canvas units, while a drag on empty canvas draws one (r033)
  const [editing, setEditing] = useState(null);     // the id of the note, column, or board edited in place
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [picker, setPicker] = useState(null);       // { x, y }: the Link tool's smart input, canvas units
  const [drag, setDrag] = useState(null);           // { id, x, y, w, ghost, over, group }: a card on the move, canvas units; over = { columnId, index } | { laneOf, index } | { boardId, edge }; group = the other selected placed cards, each at its offset (r033)
  const [resize, setResize] = useState(null);       // { id, w }: a card on the resize
  const [laneResize, setLaneResize] = useState(null);  // { widths: { [lane id]: w } }: the lanes on the resize while a divider is dragged (r033)
  const [placing, setPlacing] = useState(null);     // { kind }: a rail button on the drag
  const [asking, setAsking] = useState(null);       // the items whose delete is being asked about, columns or board cards that hold things among them
  const gestures = useTabulaGestures();
  const gestureRef = gestures.ref;
  const beginGesture = gestures.begin;
  const prefTimer = useRef(null);
  const camera = useTabulaCamera({
    paneRef, isLocked, initial: viewPref || null,
    onChange: (v) => {
      if (!onViewPref) return;
      if (prefTimer.current) clearTimeout(prefTimer.current);
      prefTimer.current = setTimeout(() => onViewPref(board.id, v), 400);
    },
  });
  const items = board.items || [];
  // the selection may sit in a column's stack; several cards may be selected (r033)
  const selected = selectedId ? tabulaFindItem(board, selectedId) : null;
  const selectedParent = selected ? tabulaParentOf(board, selectedId) : null;
  const selectedItems = selection.map(id => tabulaFindItem(board, id)).filter(Boolean);
  const multi = selectedItems.length > 1;
  const isLane = (it) => { const p = it ? tabulaParentOf(board, it.id) : null; return !!(it && it.type === "column" && p && p.type === "column"); };
  const isStack = (it) => { const p = it ? tabulaParentOf(board, it.id) : null; return !!(it && it.type === "column" && p && p.type !== "column" && p.type !== "board"); };  // a column under a card (r033)
  const roleOf = (it, p) => (it.type !== "column" ? undefined : p.type === "board" ? "column" : p.type === "column" ? "lane" : "stack");
  const drillIn = (id) => { if (onFocalChange && tabulaBoardNode(stemma.root, id)) onFocalChange(id); };
  // the drawing layer (r032); a line selected takes the card's selection
  const editingRef = useRef(null);
  const endEdit = () => { if (!editingRef.current) return; editingRef.current = null; setEditing(null); };
  const drawing = useTabulaDrawing({ stemma, board, apply, camera, surfaceRef, paneRef, isLocked, gestures, onSelectShape: () => { endEdit(); setSelectedId(null); setPicker(null); } });
  const pickTool = (t) => { endEdit(); setSelectedId(null); setPicker(null); drawing.setTool(drawing.tool === t ? "cards" : t); };

  // the cards' boxes in canvas units, from the DOM, and the lines' points, for Fit
  const cardsBox = () => {
    const el = surfaceRef.current;
    if (!el) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    Array.from(el.querySelectorAll(".tabula-card:not(.ghost)")).forEach(c => {
      const x = parseFloat(c.style.left) || 0, y = parseFloat(c.style.top) || 0;
      x0 = Math.min(x0, x); y0 = Math.min(y0, y);
      x1 = Math.max(x1, x + c.offsetWidth); y1 = Math.max(y1, y + c.offsetHeight);
    });
    (board.shapes || []).forEach(s => (Array.isArray(s.points) ? s.points : []).forEach(p => {
      x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]);
    }));
    if (!Number.isFinite(x0)) return null;
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  };
  const fitAll = () => camera.fitTo(cardsBox());
  camera.cfg.current.onFit = fitAll;
  // a board opens where it was left, or at Fit the first time; the view
  // mounted on the first board's own pref, so only a change of board sets it
  const shownBoardRef = useRef(null);
  React.useLayoutEffect(() => {
    const first = shownBoardRef.current === null;
    shownBoardRef.current = board.id;
    if (viewPref) { if (!first) camera.setView(viewPref); }
    else fitAll();
    if (!first) { setSelectedId(null); setEditing(null); setPicker(null); setDrag(null); setAsking(null); drawing.reset(); }
  }, [board.id]);

  // a card that goes closes the inspector and the editor on it
  useEffect(() => {
    const live = selection.filter(id => tabulaFindItem(board, id));
    if (live.length !== selection.length) setSelection(live);
    if (editing && !tabulaFindItem(board, editing)) setEditing(null);
    if (asking && !asking.every(it => tabulaFindItem(board, it.id))) setAsking(null);
  }, [board, selection, editing, asking]);
  useEffect(() => () => { if (prefTimer.current) clearTimeout(prefTimer.current); }, []);

  // The in-place editor's fields commit as they're typed, so ending the edit
  // only closes the fields; the ref (declared with the drawing layer above)
  // lets the pane's press and the field's blur both ask in one event.
  editingRef.current = editing;
  camera.cfg.current.onTap = () => { endEdit(); setSelectedId(null); setPicker(null); drawing.deselect(); };
  const startEdit = (it) => { if (isLocked || (it.type !== "note" && it.type !== "column")) return; setSelectedId(it.id); setEditing(it.id); };

  // placing: a new card at a canvas point, centered on it sideways
  const addAt = (item, cx, cy) => {
    const w = TABULA.width[item.type];
    const full = { ...item, x: tabulaSnap(cx - w / 2), y: tabulaSnap(cy), w };
    apply(tabulaAddItem(stemma, board.id, full));
    setSelectedId(full.id);
    return full;
  };
  // An image file stored the map's way: in the images folder as
  // <stemma id>-<item id>.<ext>, or a data URL under the map's byte cap.
  const readImageFile = async (file, itemId) => {
    if (!file || !file.type || !file.type.startsWith("image/")) { flash && flash("That isn't an image file", "error"); return null; }
    if (dirHandle) {
      const ok = await verifyHandlePermission(dirHandle);
      if (ok) {
        try {
          const ext = (file.name.match(/\.[A-Za-z0-9]+$/) || [".png"])[0];
          const filename = await generateUniqueFilename(dirHandle, `${stemma.id}-${itemId}${ext}`);
          const fh = await dirHandle.getFileHandle(filename, { create: true });
          const writable = await fh.createWritable();
          await writable.write(file);
          await writable.close();
          return filename;
        } catch (err) {
          console.error("FSAA write failed", err);
        }
      }
    }
    if (file.size > MAP_RASTER_LAYER.maxBytes) { flash && flash("That image is too large to store inside the save file; set up an images folder first", "error"); return null; }
    if (file.size > MAP_RASTER_LAYER.inlineWarn) {
      const proceed = confirm(`This image is ${(file.size / 1024 / 1024).toFixed(1)} MB. Without an images folder set up, it will be embedded directly in your save file. Continue?`);
      if (!proceed) return null;
    }
    try { return await fileToDataUrl(file); } catch (err) { flash && flash("Failed to read image", "error"); return null; }
  };
  const addImageFile = async (file, cx, cy) => {
    const id = `n-${genId()}`;
    const stored = await readImageFile(file, id);
    if (!stored) return;
    addAt({ id, type: "image", image: stored, caption: "" }, cx, cy);
  };
  const pickImageFile = (cx, cy) => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = (e) => { const f = e.target.files && e.target.files[0]; if (f) addImageFile(f, cx, cy); };
    input.click();
  };
  const replaceImage = (it) => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = async (e) => { const f = e.target.files && e.target.files[0]; if (!f) return; const stored = await readImageFile(f, it.id); if (stored) apply(tabulaUpdateItem(stemma, it.id, { image: stored })); };
    input.click();
  };
  const placeKind = (kind, cx, cy) => {
    if (isLocked) return;
    if (kind === "note") { const it = addAt({ id: `n-${genId()}`, type: "note", title: "", body: "", color: TABULA.color }, cx, cy); setEditing(it.id); }
    else if (kind === "linked") { endEdit(); setPicker({ x: cx, y: cy }); }
    else if (kind === "image") pickImageFile(cx, cy);
    else if (kind === "column") { const it = addAt({ id: `n-${genId()}`, type: "column", title: "", color: TABULA.color, items: [] }, cx, cy); setEditing(it.id); }
    else if (kind === "board") { const it = addAt({ id: `n-${genId()}`, type: "board", title: "", color: TABULA.color, icon: TABULA.icon, items: [], shapes: [] }, cx, cy); setEditing(it.id); }
  };
  const paneCenter = () => { const r = camera.rectOf(); return camera.toCanvas(r ? r.left + r.width / 2 : 0, r ? r.top + r.height / 2 : 0); };

  // What is under the pointer, for a drop: a board card (r031) first,
  // placed or in a stack, with the nearest of its four edges, where the line
  // is drawn and which decides where the card lands inside; then a column:
  // for a card, its stack, or (r033) the innermost lane under the pointer
  // when it holds lanes, and the gap nearest the pointer there, the dragged
  // items left out; for a column (r033), the lane whose middle the pointer
  // is over, down the lanes, which it joins as a lane of that lane at the
  // gap by x (before or after the stack when the lane has none), or, over
  // a lane's edge, the outer header, or the gaps, the host above at the gap
  // by x; or (r033) a card, placed or in a stack: for a column, under the
  // card as its stack, among its stacks by x when it has some, the pointer
  // well inside a card in a stack taking the card over the gap; for a
  // card, down the stacks under a card as down the lanes. From the DOM, so
  // what the line shows is where the card lands. Nothing enters itself or
  // anything moving with it (`moving`, the group's ids).
  const dropTarget = (clientX, clientY, dragged, moving) => {
    const el = surfaceRef.current;
    if (!el || !dragged) return null;
    const ids = moving || new Set([dragged.id]);
    const inside = (r) => !(clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom);
    for (const b of Array.from(el.querySelectorAll('[data-type="board"]'))) {
      if (ids.has(b.dataset.item) || b.classList.contains("ghost")) continue;
      const r = b.getBoundingClientRect();
      if (!inside(r)) continue;
      const fromLeft = (clientX - r.left) / Math.max(1, r.width), fromTop = (clientY - r.top) / Math.max(1, r.height);
      const dists = [["left", fromLeft], ["right", 1 - fromLeft], ["top", fromTop], ["bottom", 1 - fromTop]];
      dists.sort((p, q) => p[1] - q[1]);
      return { boardId: b.dataset.item, edge: dists[0][0] };
    }
    const lanesOf = (node) => Array.from(node.querySelectorAll(":scope > .tabula-lanes > .tabula-lane")).filter(l => !ids.has(l.dataset.item));
    const kidsOf = (node) => Array.from(node.querySelectorAll(":scope > .tabula-column-body > .tabula-colitem")).filter(k => !ids.has(k.dataset.item));
    for (const col of Array.from(el.querySelectorAll('.tabula-card:not([data-type="board"])'))) {
      if (ids.has(col.dataset.item) || col.classList.contains("ghost")) continue;
      const r = col.getBoundingClientRect();
      if (!inside(r)) continue;
      if (dragged.type === "column") {
        // down the lanes while the pointer is well inside one (12 screen
        // pixels from its edges), and into a card in a stack the pointer is
        // well inside, where it goes under the card
        let host = col;
        for (;;) {
          const lanes = lanesOf(host);
          const inner = lanes.find(l => { const lr = l.getBoundingClientRect(); return clientX >= lr.left + 12 && clientX <= lr.right - 12 && clientY >= lr.top; });
          if (inner) { host = inner; continue; }
          if (lanes.length) break;
          const kid = kidsOf(host).find(k => { const kr = k.getBoundingClientRect(); return clientX >= kr.left + 12 && clientX <= kr.right - 12 && clientY >= kr.top + 10 && clientY <= kr.bottom - 10; });
          if (!kid) break;
          host = kid;
        }
        const lanes = lanesOf(host);
        const hr = host.getBoundingClientRect();
        let index = 0;
        if (lanes.length) lanes.forEach(l => { const lr = l.getBoundingClientRect(); if (lr.left + lr.width / 2 < clientX) index++; });
        else if (host.dataset.type === "column") index = clientX > hr.left + hr.width / 2 ? 1 : 0;
        return { laneOf: host.dataset.item, index };
      }
      // a card: the innermost lane under the pointer, by x at each level,
      // and down into the stacks under a card in a stack when the pointer
      // is over them; a plain card isn't a target
      let stack = col;
      for (;;) {
        const lanes = lanesOf(stack);
        if (lanes.length) {
          stack = lanes.find(l => { const lr = l.getBoundingClientRect(); return clientX >= lr.left && clientX <= lr.right; }) || lanes.reduce((best, l) => { const lr = l.getBoundingClientRect(); const d = Math.min(Math.abs(clientX - lr.left), Math.abs(clientX - lr.right)); return !best || d < best.d ? { l, d } : best; }, null).l;
          continue;
        }
        if (stack.dataset.type !== "column") break;
        const kid = kidsOf(stack).find(k => { const b = k.querySelector(":scope > .tabula-lanes"); if (!b) return false; const br = b.getBoundingClientRect(); return clientY >= br.top && clientY <= br.bottom && clientX >= br.left && clientX <= br.right; });
        if (!kid) break;
        stack = kid;
      }
      if (stack.dataset.type !== "column") continue;
      const kids = kidsOf(stack);
      let index = 0;
      const byX = stack.dataset.flow === "row";  // a row's gaps run by x (r033)
      kids.forEach(k => { const kr = k.getBoundingClientRect(); if (byX ? kr.left + kr.width / 2 < clientX : kr.top + kr.height / 2 < clientY) index++; });
      return { columnId: stack.dataset.item, index };
    }
    return null;
  };
  // Where a card lands in a sub-board, by the edge the line was on: beside
  // the content's leftmost or rightmost item at the content's top, or over
  // its topmost or under its lowest at the content's left; the origin when
  // the board holds nothing placed. Heights aren't stored, so above and
  // below allow a nominal card's worth.
  const boardLanding = (node, edge, w) => {
    const placed = (node.items || []).filter(it => Number.isFinite(it.x) && Number.isFinite(it.y));
    if (placed.length === 0) return { x: 0, y: 0 };
    const x0 = Math.min(...placed.map(it => it.x)), x1 = Math.max(...placed.map(it => it.x + (Number.isFinite(it.w) ? it.w : TABULA.width[it.type] || 280)));
    const y0 = Math.min(...placed.map(it => it.y)), y1 = Math.max(...placed.map(it => it.y));
    const gap = 20, nominal = 80;
    if (edge === "left") return { x: tabulaSnap(x0 - w - gap), y: tabulaSnap(y0) };
    if (edge === "right") return { x: tabulaSnap(x1 + gap), y: tabulaSnap(y0) };
    if (edge === "top") return { x: tabulaSnap(x0), y: tabulaSnap(y0 - nominal - gap) };
    return { x: tabulaSnap(x0), y: tabulaSnap(y1 + nominal + gap) };
  };

  // a press on a card's body, placed or in a stack, selects it and ends an
  // edit elsewhere; nothing moves (r031)
  const selectCard = (it) => (e) => {
    if (e.button !== 0 || camera.spaceHeld) return;
    if (editing === it.id) return;
    e.stopPropagation();
    if (editing) endEdit();
    drawing.deselect();
    if (e.shiftKey) toggleSelected(it.id);  // r033: Shift extends the selection or takes the card out of it
    else setSelectedId(it.id);
  };
  // a press on a card's grip (a column's header, a lane's) selects it and
  // begins the move that commits on release: into a column at the gap, as
  // a lane of a column or of a lane (r033), into a board card by its edge, or onto the
  // board at the drop, raised. A grip in a selection of several (r033)
  // moves the selected cards placed on this board together: onto the
  // board by the same delta, into a column in their order top to bottom,
  // or into a sub-board as they sit; a stack item drags alone.
  const beginDrag = (it, parent) => (e) => {
    if (e.button !== 0 || camera.spaceHeld) return;
    if (editing === it.id) return;
    e.stopPropagation();
    if (editing) endEdit();
    drawing.deselect();
    if (e.shiftKey) { toggleSelected(it.id); return; }
    const inStack = parent && parent.type !== "board";  // in a column's stack, a lane, or (r033) a stack under a card
    const inGroup = !inStack && selection.includes(it.id) && selection.length > 1;
    if (!inGroup) setSelectedId(it.id);
    if (isLocked) return;
    const startX = e.clientX, startY = e.clientY;
    const box = (e.currentTarget.closest("[data-item]") || e.currentTarget).getBoundingClientRect();
    const z0 = camera.viewRef.current.zoom;
    const grab = { dx: (e.clientX - box.left) / z0, dy: (e.clientY - box.top) / z0 };
    const w = inStack ? tabulaClampWidth(it.type, Number.isFinite(it.w) ? it.w : parent.w) : it.w;  // a lane with a width of its own keeps it (r033)
    const at = (ev) => { const p = camera.toCanvas(ev.clientX, ev.clientY); return { x: p.x - grab.dx, y: p.y - grab.dy }; };
    const group = inGroup ? items.filter(o => o.id !== it.id && selection.includes(o.id)).map(o => ({ id: o.id, dx: o.x - it.x, dy: o.y - it.y })) : [];
    const moving = new Set([it.id, ...group.map(g => g.id)]);
    beginGesture({
      moved: false,
      onMove: (ev) => {
        const g = gestureRef.current;
        if (g && !g.moved && Math.hypot(ev.clientX - startX, ev.clientY - startY) > TABULA.dragSlop) {
          g.moved = true;
          // a stack item leaves the DOM for its ghost, and the browser's text
          // selection, anchored in it, would spill over the page
          document.body.classList.add("tabula-dragging");
          const sel = window.getSelection(); if (sel) sel.removeAllRanges();
        }
        if (!g || !g.moved) return;
        const p = at(ev);
        setDrag({ id: it.id, x: p.x, y: p.y, w, ghost: inStack, over: dropTarget(ev.clientX, ev.clientY, it, moving), group });
      },
      onUp: (ev) => {
        document.body.classList.remove("tabula-dragging");
        const moved = Math.hypot(ev.clientX - startX, ev.clientY - startY) > TABULA.dragSlop;
        setDrag(null);
        if (!moved) return;
        const over = dropTarget(ev.clientX, ev.clientY, it, moving);
        const members = [it, ...group.map(g => tabulaFindItem(board, g.id))].filter(Boolean);
        // the ends stuck to the cards as drawn before the press, for the day they leave the board
        const ends = drawing.endsFor(members.flatMap(tabulaIdsBelow));
        const p = at(ev);
        if (group.length) {
          const inOrder = members.slice().sort((a, b) => (a.y - b.y) || (a.x - b.x));
          const inZ = items.filter(o => moving.has(o.id));
          if (over && over.columnId) apply(tabulaMoveMany(stemma, inOrder.map((m, i) => [m.id, { columnId: over.columnId, index: over.index + i }]), ends));
          else if (over && over.boardId) {
            const target = tabulaBoardNode(stemma.root, over.boardId);
            if (!target) return;
            const ox = Math.min(...members.map(m => m.x)), oy = Math.min(...members.map(m => m.y));
            const bw = Math.max(...members.map(m => m.x + m.w)) - ox;
            const l = boardLanding(target, over.edge, bw);
            apply(tabulaMoveMany(stemma, inZ.map(m => [m.id, { boardId: over.boardId, x: tabulaSnap(l.x + (m.x - ox)), y: tabulaSnap(l.y + (m.y - oy)), w: m.w }]), ends));
          }
          else { const dx = tabulaSnap(p.x) - it.x, dy = tabulaSnap(p.y) - it.y; apply(tabulaMoveMany(stemma, inZ.map(m => [m.id, { boardId: board.id, x: m.x + dx, y: m.y + dy, w: m.w }]), ends)); }
          return;
        }
        if (over && over.columnId) apply(tabulaMoveTo(stemma, it.id, { columnId: over.columnId, index: over.index }, ends));
        else if (over && over.laneOf) apply(tabulaMoveTo(stemma, it.id, { laneOf: over.laneOf, index: over.index }, ends));
        else if (over && over.boardId) {
          const target = tabulaBoardNode(stemma.root, over.boardId);
          if (target) { const l = boardLanding(target, over.edge, w); apply(tabulaMoveTo(stemma, it.id, { boardId: over.boardId, x: l.x, y: l.y, w }, ends)); }
        }
        else apply(tabulaMoveTo(stemma, it.id, { boardId: board.id, x: tabulaSnap(p.x), y: tabulaSnap(p.y), w }, ends));
      },
    });
  };
  const onHandlePointerDown = (it) => (e) => {
    if (e.button !== 0 || isLocked) return;
    e.stopPropagation(); e.preventDefault();
    setSelectedId(it.id);
    const startX = e.clientX, w0 = it.w;
    beginGesture({
      onMove: (ev) => { const z = camera.viewRef.current.zoom; setResize({ id: it.id, w: tabulaClampWidth(it.type, tabulaSnap(w0 + (ev.clientX - startX) / z), tabulaStacked(it)) }); },
      onUp: (ev) => { setResize(null); const z = camera.viewRef.current.zoom; const w = tabulaClampWidth(it.type, tabulaSnap(w0 + (ev.clientX - startX) / z), tabulaStacked(it)); if (w !== it.w) apply(tabulaUpdateItem(stemma, it.id, { w })); },
    });
  };
  // a divider between lanes, or between stacks under a card (r033): the
  // lane before it takes the width it's dragged to, snapped, the lanes
  // after it keep the widths they're drawn at, and the last lane takes
  // what's left, never less than the floor; the widths are the lanes',
  // stored on them, one history step
  const onDividerPointerDown = (lane, index, lanes) => (e) => {
    if (e.button !== 0 || isLocked) return;
    e.stopPropagation(); e.preventDefault();
    const surf = surfaceRef.current;
    const rectOf = (id) => { const el = surf && surf.querySelector(`[data-item="${String(id).replace(/["\\]/g, "")}"]:not(.ghost)`); return el ? el.getBoundingClientRect() : null; };
    const z = camera.viewRef.current.zoom;
    const r0 = rectOf(lane.id), rl = rectOf(lanes[lanes.length - 1].id);
    if (!r0 || !rl) return;
    const w0 = r0.width / z;
    const most = w0 + rl.width / z - TABULA.minLaneWidth;
    const kept = lanes.slice(index + 1, -1).map(l => { const r = rectOf(l.id); return [l.id, tabulaClampLaneWidth(r ? Math.round(r.width / z) : (Number.isFinite(l.w) ? l.w : TABULA.minLaneWidth))]; });
    const startX = e.clientX;
    const at = (ev) => tabulaClampLaneWidth(Math.min(most, tabulaSnap(w0 + (ev.clientX - startX) / z)));
    beginGesture({
      onMove: (ev) => setLaneResize({ widths: Object.fromEntries([[lane.id, at(ev)], ...kept]) }),
      onUp: (ev) => { setLaneResize(null); const w = at(ev); if (w === lane.w && kept.every(([id, lw]) => { const l = lanes.find(o => o.id === id); return l && l.w === lw; })) return; apply([[lane.id, w], ...kept].reduce((d, [id, lw]) => tabulaUpdateItem(d, id, { w: lw }), stemma)); },
    });
  };
  const onRailPointerDown = (kind) => (e) => {
    if (e.button !== 0 || isLocked) return;
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    beginGesture({
      moved: false,
      onMove: (ev) => { const g = gestureRef.current; if (g && !g.moved && Math.hypot(ev.clientX - startX, ev.clientY - startY) > TABULA.dragSlop) { g.moved = true; setPlacing({ kind }); } },
      onUp: (ev) => {
        const wasMoved = Math.hypot(ev.clientX - startX, ev.clientY - startY) > TABULA.dragSlop;
        setPlacing(null);
        const r = camera.rectOf();
        const inside = r && ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
        if (wasMoved) { if (inside) { const p = camera.toCanvas(ev.clientX, ev.clientY); placeKind(kind, p.x, p.y); } }
        else { const c = paneCenter(); placeKind(kind, c.x, c.y); }
      },
    });
  };

  // the pane: a press on empty canvas deselects (or pans, through the
  // camera); a double-click there makes a note; a dropped image file
  // becomes a card
  const onPanePointerDownCapture = (e) => { if (camera.onPointerDownCapture(e)) return; };
  const onPanePointerDown = (e) => {
    if (e.target && e.target.closest && e.target.closest(".tabula-card, .tabula-ui")) return;
    if (e.button !== 0) return;
    if (editing) endEdit();
    drawing.deselect();
    if (picker) setPicker(null);
    if (paneRef.current) paneRef.current.focus();
    if (isLocked || drawing.tool !== "cards" || camera.spaceHeld) { setSelectedId(null); return; }
    // r033: a drag on empty canvas draws a marquee and selects the placed
    // cards it encloses, Shift adding them to the selection; a press that
    // never moves deselects
    const shift = e.shiftKey;
    const startX = e.clientX, startY = e.clientY;
    const p0 = camera.toCanvas(startX, startY);
    const boxOf = (p, q) => ({ x0: Math.min(p.x, q.x), y0: Math.min(p.y, q.y), x1: Math.max(p.x, q.x), y1: Math.max(p.y, q.y) });
    beginGesture({
      moved: false,
      onMove: (ev) => {
        const g = gestureRef.current;
        if (g && !g.moved && Math.hypot(ev.clientX - startX, ev.clientY - startY) > TABULA.dragSlop) g.moved = true;
        if (!g || !g.moved) return;
        setMarquee(boxOf(p0, camera.toCanvas(ev.clientX, ev.clientY)));
      },
      onUp: (ev) => {
        const moved = Math.hypot(ev.clientX - startX, ev.clientY - startY) > TABULA.dragSlop;
        setMarquee(null);
        if (!moved) { if (!shift) setSelectedId(null); return; }
        const m = boxOf(p0, camera.toCanvas(ev.clientX, ev.clientY));
        const el = surfaceRef.current;
        const hit = el ? Array.from(el.querySelectorAll(".tabula-card:not(.ghost)")).filter(c => {
          const x = parseFloat(c.style.left) || 0, y = parseFloat(c.style.top) || 0;
          return x >= m.x0 && y >= m.y0 && x + c.offsetWidth <= m.x1 && y + c.offsetHeight <= m.y1;
        }).map(c => c.dataset.item) : [];
        setSelection(sel => (shift ? [...sel.filter(id => !hit.includes(id)), ...hit] : hit));
      },
    });
  };
  const onPaneDoubleClick = (e) => {
    if (e.target && e.target.closest && e.target.closest(".tabula-card, .tabula-ui")) return;
    if (drawing.tool !== "cards") return;  // a double-click finishes a line, or is nothing
    const p = camera.toCanvas(e.clientX, e.clientY);
    placeKind("note", p.x, p.y);
  };
  const onPaneDrop = (e) => {
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f) return;
    e.preventDefault();
    if (isLocked) return;
    const p = camera.toCanvas(e.clientX, e.clientY);
    addImageFile(f, p.x, p.y);
  };

  // Deleting: a card goes; a column or a board card that holds anything
  // asks first (TabulaDeleteModal), one modal for a selection of several
  // (r033), and so does a card with stacks under it (r033). A column's
  // cards moved out land where they stood, measured from the stack as
  // drawn, a lane's cards too (r033); a card's stacks go out whole (r033).
  const requestDelete = (what) => {
    const list = (Array.isArray(what) ? what : [what]).filter(Boolean);
    if (!list.length || isLocked) return;
    const holding = list.filter(it => { if (it.type !== "column" && it.type !== "board" && !tabulaStacked(it)) return false; const held = tabulaCountBelow(it); return held.cards > 0 || held.columns > 0; });
    if (holding.length) { setAsking(list); return; }
    apply(tabulaDeleteItems(stemma, list.map(it => it.id), drawing.endsFor(list.flatMap(tabulaIdsBelow))));
  };
  // where a column's or a lane's cards stand, every card in it as drawn,
  // or (r033) where a card's stacks stand, in canvas units from the surface
  const columnPlacements = (col) => {
    const surf = surfaceRef.current;
    const el = surf && surf.querySelector(`[data-item="${String(col.id).replace(/["\\]/g, "")}"]:not(.ghost)`);
    if (!el) return [];
    const s = surf.getBoundingClientRect();
    const z = camera.viewRef.current.zoom;
    const kids = col.type === "column" ? el.querySelectorAll(".tabula-colitem") : el.querySelectorAll(":scope > .tabula-lanes > .tabula-lane");
    return Array.from(kids).filter(k => k.dataset.item).map(k => {
      const kr = k.getBoundingClientRect();
      return { id: k.dataset.item, x: Math.round((kr.left - s.left) / z), y: Math.round((kr.top - s.top) / z), w: Math.round(kr.width / z) };
    });
  };
  const moveOut = () => {
    if (asking) {
      const placements = new Map(asking.filter(it => it.type === "column" || tabulaStacked(it)).map(it => [it.id, columnPlacements(it)]));
      const ends = drawing.endsFor(asking.flatMap(tabulaIdsBelow));
      let next = stemma;
      asking.forEach(it => { next = placements.has(it.id) ? tabulaDeleteColumn(next, it.id, placements.get(it.id), ends) : tabulaDeleteItem(next, it.id, ends); });
      apply(next);
    }
    setAsking(null);
  };
  const deleteAll = () => { if (asking) apply(tabulaDeleteItems(stemma, asking.map(it => it.id), drawing.endsFor(asking.flatMap(tabulaIdsBelow)))); setAsking(null); };
  // Duplicate, copy, and paste (r033). A copy carries where its original
  // stood, a stack item's measured, so a paste keeps the group's shape,
  // laid around the view's center with fresh ids and selected.
  const duplicateSelection = () => {
    if (isLocked || !selection.length) return;
    const r = tabulaDuplicate(stemma, board.id, selection);
    if (r.doc === stemma) return;
    apply(r.doc);
    setSelection(r.ids);
  };
  const copySelection = () => {
    if (!selectedItems.length) return;
    const surf = surfaceRef.current;
    const s = surf ? surf.getBoundingClientRect() : null;
    const z = camera.viewRef.current.zoom;
    const placedOf = (it) => {
      if (Number.isFinite(it.x) && Number.isFinite(it.y)) return it;
      // a stack item: where it stands, at its column's width as a drag out gives it, a lane's at the lane's
      const holder = tabulaParentOf(board, it.id);
      const el = surf && surf.querySelector(`[data-item="${String(it.id).replace(/["\\]/g, "")}"]:not(.ghost)`);
      if (!el || !s) return { ...it, x: 0, y: 0, w: TABULA.width[it.type] };
      const r = el.getBoundingClientRect();
      const w = Number.isFinite(it.w) ? it.w : holder && Number.isFinite(holder.w) ? holder.w : Math.round(r.width / z);
      return { ...it, x: Math.round((r.left - s.left) / z), y: Math.round((r.top - s.top) / z), w: tabulaClampWidth(it.type, w, tabulaStacked(it)) };
    };
    // the selected items in document order, one inside another selected one left to its holder
    const set = new Set(selection);
    const picked = [];
    const walk = (node, under) => (node.items || []).forEach(it => { const sel = set.has(it.id); if (sel && !under) picked.push(it); if (tabulaHolds(it)) walk(it, under || sel); });
    walk(board, false);
    tabulaClipboard = { items: JSON.parse(JSON.stringify(picked.map(placedOf))), pastes: 0 };
  };
  const pasteClipboard = () => {
    if (isLocked || !tabulaClipboard.items.length) return;
    const copies = tabulaReid(JSON.parse(JSON.stringify(tabulaClipboard.items)));
    const ox = Math.min(...copies.map(c => c.x)), oy = Math.min(...copies.map(c => c.y));
    const bw = Math.max(...copies.map(c => c.x + (c.w || TABULA.width[c.type] || 280))) - ox;
    const c = paneCenter();
    const step = 20 * tabulaClipboard.pastes++;
    const dx = tabulaSnap(c.x - bw / 2) - ox + step, dy = tabulaSnap(c.y) - oy + step;
    const placed = copies.map(it => ({ ...it, x: it.x + dx, y: it.y + dy }));
    apply(tabulaAddItems(stemma, board.id, placed));
    setSelection(placed.map(it => it.id));
  };
  const selectAll = () => setSelection(items.map(it => it.id));

  // the selection's keys: Delete, the arrows by the grid on a placed card,
  // Escape; the drawing layer's first (r032), through the latest render's
  // handler, since its state isn't among the effect's dependencies
  const latestRef = useRef(null);
  latestRef.current = { onDrawKey: drawing.onKey, requestDelete, duplicateSelection, copySelection, pasteClipboard, selectAll };
  useEffect(() => {
    const typing = (t) => { const tag = t && t.tagName ? t.tagName.toUpperCase() : ""; return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !!(t && t.isContentEditable); };
    const down = (e) => {
      if (typing(e.target) || asking) return;
      if (latestRef.current.onDrawKey(e)) return;
      if (e.key === "Escape") { if (picker) { setPicker(null); return; } if (editing) { endEdit(); return; } if (selectedId) setSelectedId(null); return; }
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        // r033: copy, paste, duplicate, select all; undo and redo are the history's
        const k = typeof e.key === "string" ? e.key.toLowerCase() : "";
        if (k === "c" && selectedItems.length) { e.preventDefault(); latestRef.current.copySelection(); }
        else if (k === "v" && !isLocked && tabulaClipboard.items.length) { e.preventDefault(); latestRef.current.pasteClipboard(); }
        else if (k === "d" && !isLocked && selectedItems.length) { e.preventDefault(); latestRef.current.duplicateSelection(); }
        else if (k === "a" && !isLocked) { e.preventDefault(); latestRef.current.selectAll(); }
        return;
      }
      if (!selectedItems.length || isLocked || e.altKey) return;
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); latestRef.current.requestDelete(selectedItems); return; }
      const placed = selectedItems.filter(it => items.some(o => o.id === it.id));
      if (!placed.length) return;
      const step = TABULA.grid;
      const d = e.key === "ArrowLeft" ? [-step, 0] : e.key === "ArrowRight" ? [step, 0] : e.key === "ArrowUp" ? [0, -step] : e.key === "ArrowDown" ? [0, step] : null;
      if (d) {
        e.preventDefault();
        // every selected placed card by the grid, in z-order, one coalesced run
        const inZ = items.filter(o => placed.some(it => it.id === o.id));
        apply(inZ.reduce((doc, it) => tabulaMoveItem(doc, it.id, it.x + d[0], it.y + d[1]), stemma), { coalesce: `nudge:${inZ.map(it => it.id).join(",")}` });
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [selectedItems, selectedId, editing, picker, stemma, isLocked, asking, items]);

  const view = camera.view;
  const pool = entries || [];
  const screenOf = (cx, cy) => ({ x: (cx - view.x) * view.zoom, y: (cy - view.y) * view.zoom });
  const zoomPct = Math.round(view.zoom * 100);
  const path = tabulaBoardPath(stemma.root, board.id);
  const dragged = drag ? tabulaFindItem(board, drag.id) : null;

  // one card, placed or in a stack, wired to the view
  const cardFor = (it, parent, lastLane) => {
    const placed = parent.type === "board";
    const inRow = parent.type === "column" && parent.flow === "row" && !tabulaIsLaned(parent);  // a card in a row (r033)
    const fit = tabulaNeed(it, inRow);
    const inGroup = drag && drag.group ? drag.group.find(g => g.id === it.id) : null;
    const isDragged = drag && (drag.id === it.id || !!inGroup);
    if (isDragged && drag.ghost) return null;  // the ghost stands in for a stack item on the move
    const x = isDragged ? drag.x + (inGroup ? inGroup.dx : 0) : it.x;
    const y = isDragged ? drag.y + (inGroup ? inGroup.dy : 0) : it.y;
    const w = resize && resize.id === it.id ? resize.w : laneResize && laneResize.widths[it.id] !== undefined ? laneResize.widths[it.id] : it.w;
    return (
      <TabulaCard
        key={it.id}
        item={it}
        placed={placed}
        x={x} y={y} w={w}
        role={roleOf(it, parent)}
        lastLane={!!lastLane}
        fit={fit}
        inRow={inRow}
        onLaneDivider={isLocked ? undefined : onDividerPointerDown}
        pool={pool}
        templates={templates}
        selected={selection.includes(it.id)}
        dragging={!!isDragged}
        over={!!(drag && drag.over && (drag.over.columnId === it.id || drag.over.boardId === it.id || drag.over.laneOf === it.id))}
        overEdge={drag && drag.over && drag.over.boardId === it.id ? drag.over.edge : null}
        stick={drawing.stickId === it.id}
        insertAt={drag && drag.over && drag.over.columnId === it.id ? drag.over.index : null}
        laneInsertAt={drag && drag.over && drag.over.laneOf === it.id ? drag.over.index : null}
        editing={editing === it.id}
        onEditChange={(patch, key) => apply(tabulaUpdateItem(stemma, it.id, patch), { coalesce: `field:${it.id}:${key}` })}
        onEditDone={endEdit}
        onPointerDown={selectCard(it)}
        onGripDown={beginDrag(it, parent)}
        onHandleDown={onHandlePointerDown(it)}
        onDoubleClick={(e) => { e.stopPropagation(); if (it.type === "board") drillIn(it.id); else startEdit(it); }}
        onOpenEntry={onOpenEntry}
        dirHandle={dirHandle}
        imageFolder={imageFolder}
        renderItem={it.type === "column" || tabulaStacked(it) ? ((c, last) => cardFor(c, it, last)) : undefined}
      />
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* The top bar: back, the name (click to rename), the breadcrumb on a sub-board, undo and redo, export. */}
      <div className="tabula-ui" style={{ padding: "10px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
        <button onClick={onBackToIndex} className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 13 }}>← Stemmas</button>
        <span style={{ color: "var(--text-dim)", fontSize: 13 }}>·</span>
        {editingName ? (
          <input
            type="text"
            value={nameDraft}
            autoFocus
            onChange={e => setNameDraft(e.target.value)}
            onBlur={() => { const trimmed = nameDraft.trim(); if (trimmed && trimmed !== stemma.name) apply(stemmaRename(stemma, trimmed)); setEditingName(false); }}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } else if (e.key === "Escape") { e.preventDefault(); setNameDraft(stemma.name); setEditingName(false); } }}
            style={{ fontSize: 14, fontWeight: 500, padding: "2px 8px", border: "1px solid var(--accent)", borderRadius: 3, background: "var(--surf2)", color: "var(--text)", outline: "none", minWidth: 200 }}
          />
        ) : (
          <span
            style={{ fontSize: 14, fontWeight: 500, cursor: isLocked ? "default" : "pointer", padding: "2px 6px", borderRadius: 3 }}
            onClick={() => { if (isLocked) return; setNameDraft(stemma.name); setEditingName(true); }}
            title={isLocked ? null : "Click to rename"}
          >{stemma.name}</span>
        )}
        <span className="tabula-badge" title="A board">Tabula</span>
        {path.length > 1 && (
          <button className="btn btn-ghost" style={{ padding: "2px 8px", fontSize: 12 }} title="Back to the board that holds this one" onClick={() => drillIn(path[path.length - 2].id)}>Back</button>
        )}
        {path.length > 1 && path.map((node, i) => {
          const isCurrent = i === path.length - 1;
          const name = i === 0 ? stemma.name : (node.title || "Untitled board");
          const truncated = name.length > 28 ? name.slice(0, 27) + "…" : name;
          return (
            <React.Fragment key={node.id}>
              <span style={{ color: "var(--text-dim)", fontSize: 13 }}>›</span>
              {isCurrent ? (
                <span className="tabula-crumb" title={name} style={{ fontSize: 13, color: "var(--accent)", fontWeight: 500, padding: "2px 6px" }}>{truncated}</span>
              ) : (
                <button className="btn btn-ghost tabula-crumb" title={name} onClick={() => drillIn(node.id)} style={{ padding: "2px 8px", fontSize: 13 }}>{truncated}</button>
              )}
            </React.Fragment>
          );
        })}
        <div style={{ marginLeft: "auto", display: "flex", gap: 4, alignItems: "center" }}>
          {!isLocked && (
            <button className="btn btn-ghost" onClick={history.undo} disabled={!history.canUndo} style={{ padding: "4px 10px", fontSize: 13, opacity: history.canUndo ? 1 : 0.45 }} title="Undo (Ctrl+Z)">Undo</button>
          )}
          {!isLocked && (
            <button className="btn btn-ghost" onClick={history.redo} disabled={!history.canRedo} style={{ padding: "4px 10px", fontSize: 13, opacity: history.canRedo ? 1 : 0.45 }} title="Redo (Ctrl+Y)">Redo</button>
          )}
          <button className="btn btn-ghost" onClick={onExport} style={{ padding: "4px 10px", fontSize: 13 }} title="Export this tabula as JSON">Export</button>
          <button className="btn btn-ghost" onClick={onExportMarkdown} style={{ padding: "4px 10px", fontSize: 13 }} title="Export this tabula as Markdown">Markdown</button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {!isLocked && (
          <div className="tabula-rail tabula-ui">
            <button type="button" title="Note: click to add one at the center, drag to place it, or double-click the canvas" onPointerDown={onRailPointerDown("note")}><span className="glyph">▭</span>Note</button>
            <button type="button" title="Link: a card for an entry or any record of the world" onPointerDown={onRailPointerDown("linked")}><span className="glyph">⛓</span>Link</button>
            <button type="button" title="Image: a picture from a file, or drop one on the canvas" onPointerDown={onRailPointerDown("image")}><span className="glyph">▣</span>Image</button>
            <button type="button" title="Column: a stack that cards drop into" onPointerDown={onRailPointerDown("column")}><span className="glyph">▥</span>Column</button>
            <button type="button" title="Board: a board inside this one; double-click its card to open it" onPointerDown={onRailPointerDown("board")}><span className="glyph">⊞</span>Board</button>
            <div className="tabula-rail-sep" aria-hidden="true" />
            {TABULA_TOOLS.map(t => (
              <button key={t.id} type="button" className={drawing.tool === t.id ? "active" : ""} aria-pressed={drawing.tool === t.id} title={`${t.label}: ${t.hint}`} onClick={() => pickTool(t.id)}><span className="glyph">{t.glyph}</span>{t.label}</button>
            ))}
          </div>
        )}
        <div
          ref={paneRef}
          className={`tabula-pane${camera.dragging ? " grabbing" : (camera.spaceHeld || isLocked ? " grab" : "")}${placing ? " placing" : ""}${drawing.drawTool ? " draw" : ""}`}
          tabIndex={0}
          onPointerDownCapture={onPanePointerDownCapture}
          onPointerDown={onPanePointerDown}
          onDoubleClick={isLocked ? undefined : onPaneDoubleClick}
          onDragOver={(e) => { if (!isLocked && e.dataTransfer && Array.from(e.dataTransfer.types || []).includes("Files")) e.preventDefault(); }}
          onDrop={onPaneDrop}
        >
          <div ref={surfaceRef} className="tabula-surface" style={{ transform: `translate(${-view.x * view.zoom}px, ${-view.y * view.zoom}px) scale(${view.zoom})` }}>
            {items.map(it => cardFor(it, board))}
            {drag && drag.ghost && dragged && (
              <TabulaCard item={dragged} placed ghost dragging x={drag.x} y={drag.y} w={drag.w} pool={pool} templates={templates} onOpenEntry={onOpenEntry} dirHandle={dirHandle} imageFolder={imageFolder} />
            )}
            <TabulaDrawLayer d={drawing} view={view} boardId={board.id} />
            {marquee && <div className="tabula-marquee" style={{ left: marquee.x0, top: marquee.y0, width: marquee.x1 - marquee.x0, height: marquee.y1 - marquee.y0 }} />}
          </div>
          {picker && (() => {
            const p = screenOf(picker.x, picker.y);
            return (
              <div className="tabula-ui" style={{ position: "absolute", left: 0, top: 0 }}>
                <StemmaSmartInput
                  cx={p.x}
                  cy={p.y}
                  entries={pool}
                  freeform={{ long: "a note", short: "note" }}
                  onCommitFreeform={(label) => { addAt({ id: `n-${genId()}`, type: "note", title: label, body: "", color: TABULA.color }, picker.x, picker.y); setPicker(null); }}
                  onCommitLinked={(entryId, cachedName) => { addAt({ id: `n-${genId()}`, type: "linked", entryId, _cachedName: cachedName || "" }, picker.x, picker.y); setPicker(null); }}
                  onCancel={() => setPicker(null)}
                />
              </div>
            );
          })()}
          <div className="tabula-zoom tabula-ui">
            <button type="button" className="btn btn-ghost" style={{ padding: "0 6px", fontSize: 12 }} onClick={() => camera.zoomBy(1 / TABULA.zoomStep)} title="Zoom out (-)">−</button>
            <span style={{ minWidth: 38, textAlign: "center" }}>{zoomPct}%</span>
            <button type="button" className="btn btn-ghost" style={{ padding: "0 6px", fontSize: 12 }} onClick={() => camera.zoomBy(TABULA.zoomStep)} title="Zoom in (+)">+</button>
            <button type="button" className="btn btn-ghost" style={{ padding: "0 8px", fontSize: 12 }} onClick={fitAll} title="Fit the cards (0)">Fit</button>
          </div>
          {items.length === 0 && drawing.shapes.length === 0 && !isLocked && (
            <div className="tabula-empty tabula-ui">{path.length > 1 ? "An empty board. Add a note from the rail, or double-click the canvas." : "Nothing here yet. Add a note from the rail, or double-click the canvas."}</div>
          )}
        </div>
        {selected && !multi && (
          <TabulaInspector
            item={selected}
            isLane={isLane(selected)}
            isStack={isStack(selected)}
            pool={pool}
            templates={templates}
            isLocked={isLocked}
            onClose={() => setSelectedId(null)}
            onPatch={(patch, key) => apply(tabulaUpdateItem(stemma, selected.id, patch), key ? { coalesce: `field:${selected.id}:${key}` } : undefined)}
            onDelete={() => requestDelete(selected)}
            onRelink={(entryId, name) => apply(tabulaRelink(stemma, selected.id, entryId, name))}
            onConvertToNote={() => { const rec = pool.find(e => e.id === selected.entryId); apply(tabulaConvertToNote(stemma, selected.id, rec ? rec.name : selected._cachedName)); }}
            onOpenEntry={onOpenEntry}
            onReplaceImage={() => replaceImage(selected)}
            onOpenBoard={drillIn}
            onLanes={(n) => apply(tabulaSetLanes(stemma, selected.id, n))}
            onDuplicate={isLocked ? undefined : duplicateSelection}
          />
        )}
        {multi && (
          <TabulaSelectionPanel count={selectedItems.length} isLocked={isLocked} onDuplicate={duplicateSelection} onDelete={() => requestDelete(selectedItems)} onClose={() => setSelectedId(null)} />
        )}
        {!selected && !isLocked && drawing.panelOpen && (
          <TabulaShapePanel d={drawing} onClose={() => { if (drawing.selectedShape) drawing.deselect(); else drawing.setTool("cards"); }} />
        )}
      </div>
      {asking && (
        <TabulaDeleteModal items={asking} isLane={asking.length === 1 && isLane(asking[0])} isStack={asking.length === 1 && isStack(asking[0])} onMoveOut={moveOut} onDeleteAll={deleteAll} onCancel={() => setAsking(null)} />
      )}
    </div>
  );
}