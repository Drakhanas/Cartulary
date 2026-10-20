"""r035: built-in stamps, scale and rotate handles, labels on an arc
(Cartographia+ cut 5).

Stamps: four built-ins (mountain, tree, settlement, compass rose) as SVG
symbols drawn in code, line art in a 64 x 64 box whose parts inherit the
shape's Fill and Stroke from the <use>; a Stamp tool with a picker in the
strip's second row; a click places the chosen stamp at 120 units centred on
the click, a drag places it square at the drag's larger side; the renderer
emits a <symbol> in <defs> for every stamp a map uses, ids prefixed by the
map, and a <use> per stamp. Only built-ins render at this cut: imported
stamps wait for the sanitizer (cut 6).

Handles: the selection frame of a rect, ellipse, stamp, or label turns with
the shape. Corner handles scale a rect or ellipse freely and a stamp with its
aspect kept, anchored at the opposite corner, never under 8 units. A knob
above the frame turns a stamp around its centre or a label around its pivot,
Shift snapping to 15 degrees. Both drags apply the cursor's movement since
the press, so nothing jumps on the first move. The strip's angle controls
serve stamps as well as labels.

Arc: a label gains `arc` (-180..180 degrees, 0 straight). The renderer puts a
bent label on a circular arc through <textPath>, centred, its apex where the
straight label's middle would be, arching up for positive values and down
for negative; the path runs past both ends so a label wider than the
estimate is never cut off. A slider in the strip sets it. Drak's addition at
the cut-5 fork, for labels that follow coasts and ranges.

Also, from the browser pass: the canvas resize grip's ceiling rises from
100% to 150% of the column (centred growth, capped at the scroll pane), in
the view and the editor; a click on the grip no longer places a pin; the
canvas never scrolls inside itself unless zoomed in (the 75vh cap applies
only then; otherwise the page scrolls and the strip sticks to its top); and
the canvas size picker gains Custom, with width and height typed in (100 to
10000 units).

Declared scope: 16_trunk, shell.html.

String-anchored edits; every anchor must occur exactly once. Run from the
repository root against the r034 tree: python3 inlining/cuts/r035_stamps_handles.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
MOD = ROOT / "cartulary-src" / "modules"
SHELL = ROOT / "cartulary-src" / "shell.html"


def edit(path, pairs):
    s = path.read_text(encoding="utf-8")
    for old, new in pairs:
        c = s.count(old)
        assert c == 1, f"{path.name}: anchor occurs {c} times: {old[:80]!r}"
        s = s.replace(old, new)
    path.write_text(s, encoding="utf-8")


STAMPS = r"""
// The four built-in stamps: line art in a 64 x 64 box. Parts carry no fill or
// stroke of their own so they inherit the shape's from the <use>; parts that
// must stay hollow say fill="none". Line weight is the symbol's own and scales
// with the stamp. Bodies are markup written as markup (the `raw` node below);
// these are code, so nothing unsanitized reaches a page. Imported stamps
// (state.mapStamps) have the same shape and render once the sanitizer lands
// (cut 6); until then mapStampDef knows only these.
const MAP_BUILTIN_STAMPS = [
  { id: "mountain", name: "Mountain", viewBox: "0 0 64 64",
    body: '<path d="M3 56 L23 18 L33 34 L41 24 L61 56 Z" stroke-width="3" stroke-linejoin="round"/><path d="M23 18 L27 28 L22 33 L27 39 L21 45" fill="none" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/><path d="M41 24 L44 31 L40 35 L44 40" fill="none" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' },
  { id: "tree", name: "Tree", viewBox: "0 0 64 64",
    body: '<path d="M32 4 L19 26 L26 26 L15 42 L25 42 L12 58 L52 58 L39 42 L49 42 L38 26 L45 26 Z" stroke-width="3" stroke-linejoin="round"/><path d="M29 58 V63 H35 V58" fill="none" stroke-width="3" stroke-linejoin="round"/>' },
  { id: "settlement", name: "Settlement", viewBox: "0 0 64 64",
    body: '<path d="M6 58 V36 L16 26 L26 36 V58 Z" stroke-width="3" stroke-linejoin="round"/><path d="M26 58 V30 L39 16 L52 30 V58 Z" stroke-width="3" stroke-linejoin="round"/><path d="M52 58 V40 L58 34 V58 Z" stroke-width="3" stroke-linejoin="round"/><path d="M35 58 V44 H43 V58" fill="none" stroke-width="2.5" stroke-linejoin="round"/><path d="M39 16 V8 L46 10 L39 12" fill="none" stroke-width="2.5" stroke-linejoin="round"/>' },
  { id: "compass", name: "Compass rose", viewBox: "0 0 64 64",
    body: '<circle cx="32" cy="32" r="25" fill="none" stroke-width="2.5"/><path d="M32 3 L37 32 L32 61 L27 32 Z" stroke-width="2.5" stroke-linejoin="round"/><path d="M9 32 L32 27 L55 32 L32 37 Z" stroke-width="2.5" stroke-linejoin="round"/><path d="M12 12 L32 28 L52 12" fill="none" stroke-width="1.5"/><path d="M12 52 L32 36 L52 52" fill="none" stroke-width="1.5"/><circle cx="32" cy="32" r="3" fill="none" stroke-width="2"/>' },
];

function mapStampDef(id) {
  return MAP_BUILTIN_STAMPS.find(s => s.id === id) || null;
}

// A label's width, estimated from its characters: the renderer has no DOM to
// measure with, and the export runs where there is none. Cormorant Garamond
// capitals run about 0.68 em, lower case about 0.45, a space a quarter. Only
// a bent label depends on this, and only for where its apex sits.
function mapTextWidthEstimate(text, fontSize) {
  let w = 0;
  for (const ch of String(text || "")) {
    if (ch === " ") w += 0.25;
    else if (/[A-Z]/.test(ch)) w += 0.68;
    else if (/[0-9]/.test(ch)) w += 0.5;
    else if (/[ilj.,:;'!|]/.test(ch)) w += 0.25;
    else if (/[mwMW]/.test(ch)) w += 0.85;
    else w += 0.45;
  }
  return Math.max(fontSize * 0.5, w * fontSize);
}

// Where a label turns: its anchor when straight, the apex of its arc when bent.
function mapTextPivot(s) {
  if (Math.abs(s.arc || 0) >= 1) return [s.x + mapTextWidthEstimate(s.text, s.fontSize) / 2, s.y];
  return [s.x, s.y];
}

// The path a bent label runs along: a circular arc whose apex is the label's
// middle, bending through `arc` degrees over the label's estimated width,
// arching up for positive values and down for negative. The path runs well
// past both ends of the label so a wider-than-estimated label is never cut
// off; the label is centred on it, so the spare path is invisible.
function mapTextArcPath(s) {
  const f = mapNum;
  const theta = Math.min(180, Math.max(1, Math.abs(s.arc))) * Math.PI / 180;
  const wc = mapTextWidthEstimate(s.text, s.fontSize);
  const R = wc / (2 * Math.sin(theta / 2));
  const half = Math.min(170 * Math.PI / 180, (wc * 0.85 + s.fontSize) / R); // half the path's angle, in radians
  const [ax, ay] = mapTextPivot(s);
  const up = s.arc > 0;
  const cy = up ? ay + R : ay - R;
  const base = up ? -Math.PI / 2 : Math.PI / 2;
  const a1 = up ? base - half : base + half; // the left end
  const a2 = up ? base + half : base - half; // the right end
  const p1 = [ax + R * Math.cos(a1), cy + R * Math.sin(a1)];
  const p2 = [ax + R * Math.cos(a2), cy + R * Math.sin(a2)];
  const large = half > Math.PI / 2 ? 1 : 0;
  const sweep = up ? 1 : 0;
  return `M${f(p1[0])} ${f(p1[1])} A${f(R)} ${f(R)} 0 ${large} ${sweep} ${f(p2[0])} ${f(p2[1])}`;
}
"""

edit(MOD / "16_trunk.jsx", [
    # ---- model: a label gains arc
    ("""  if (type === "text") {
    out.text = typeof s.text === "string" ? s.text : "";
    out.fontSize = pick(s.fontSize, MAP_TEXT_SIZES, 36);
    out.rotation = num(s.rotation, 0);
  }""",
     """  if (type === "text") {
    out.text = typeof s.text === "string" ? s.text : "";
    out.fontSize = pick(s.fontSize, MAP_TEXT_SIZES, 36);
    out.rotation = num(s.rotation, 0);
    out.arc = Math.max(-180, Math.min(180, num(s.arc, 0))); // degrees of bend; 0 is a straight label
  }"""),

    # ---- renderer: stamps, arcs, defs, raw nodes
    ("""// One normalized shape to one node, or null for a type nothing renders yet
// (stamps arrive at cut 5).
function mapShapeNode(s) {
  const f = mapNum;""",
     STAMPS + """
// One normalized shape to one node, or null for a stamp whose symbol is not
// known. ctx ({idBase, defs, stampsUsed}) comes from buildMapDrawingTree: a
// bent label's path goes into the defs, and a stamp's symbol is recorded so
// the tree can emit it once. Without ctx a bent label renders straight and a
// stamp renders nothing.
function mapShapeNode(s, ctx) {
  const f = mapNum;"""),
    ("""      if (s.rotation) attrs.transform = `rotate(${f(s.rotation)} ${f(s.x)} ${f(s.y)})`;
      return { tag: "text", attrs, children: [s.text] };
    }
    default:
      return null;
  }
}""",
     """      if (s.rotation) {
        const [px, py] = mapTextPivot(s);
        attrs.transform = `rotate(${f(s.rotation)} ${f(px)} ${f(py)})`;
      }
      if (ctx && Math.abs(s.arc || 0) >= 1) {
        const pid = `${ctx.idBase}-arc-${String(s.id).replace(/[^A-Za-z0-9_-]/g, "")}`;
        ctx.defs.push({ tag: "path", attrs: { id: pid, d: mapTextArcPath(s), fill: "none" } });
        delete attrs.x;
        delete attrs.y;
        return { tag: "text", attrs, children: [{ tag: "textPath", attrs: { href: `#${pid}`, startOffset: "50%", "text-anchor": "middle" }, children: [s.text] }] };
      }
      return { tag: "text", attrs, children: [s.text] };
    }
    case "stamp": {
      if (!ctx) return null;
      const def = mapStampDef(s.stampId);
      if (!def) return null;
      ctx.stampsUsed.set(def.id, def);
      const attrs = { ...common, href: `#${ctx.idBase}-stamp-${String(def.id).replace(/[^A-Za-z0-9_-]/g, "")}`, x: f(s.x), y: f(s.y), width: f(s.w), height: f(s.h), fill: s.fill || "none", stroke: s.stroke || "none" };
      if (s.rotation) attrs.transform = `rotate(${f(s.rotation)} ${f(s.x + s.w / 2)} ${f(s.y + s.h / 2)})`;
      return { tag: "use", attrs };
    }
    default:
      return null;
  }
}"""),
    ("""// opts: { id, className, label, imageHref, imageWidth, imageHeight }. With an
// image the canvas is the image's natural size and the background is not
// drawn; without one the background rect (and its grain) comes first. Then one
// <g> per visible layer, in order. The returned root also carries width and
// height so a caller can read the canvas size it rendered at.
function buildMapDrawingTree(drawing, opts) {""",
     """// opts: { id, className, label, imageHref, imageWidth, imageHeight }. With an
// image the canvas is the image's natural size and the background is not
// drawn; without one the background rect (and its grain) comes first. Then one
// <g> per visible layer, in order. <defs> carries the grain filter, the path
// of every bent label, and a <symbol> for every stamp the map uses, all with
// ids prefixed by the map so several maps on one exported page never collide.
// The returned root also carries width and height so a caller can read the
// canvas size it rendered at.
function buildMapDrawingTree(drawing, opts) {"""),
    ("""  d.layers.forEach(layer => {
    if (!layer.visible) return;
    children.push({ tag: "g", attrs: { "data-layer": layer.id }, children: layer.shapes.map(mapShapeNode).filter(Boolean) });
  });
  const attrs = { xmlns: "http://www.w3.org/2000/svg", viewBox: `0 0 ${f(width)} ${f(height)}`, role: "img" };""",
     """  const ctx = { idBase, defs, stampsUsed: new Map() };
  d.layers.forEach(layer => {
    if (!layer.visible) return;
    children.push({ tag: "g", attrs: { "data-layer": layer.id }, children: layer.shapes.map(s => mapShapeNode(s, ctx)).filter(Boolean) });
  });
  ctx.stampsUsed.forEach(def => {
    defs.push({ tag: "symbol", attrs: { id: `${idBase}-stamp-${String(def.id).replace(/[^A-Za-z0-9_-]/g, "")}`, viewBox: def.viewBox, overflow: "visible" }, raw: def.body });
  });
  const attrs = { xmlns: "http://www.w3.org/2000/svg", viewBox: `0 0 ${f(width)} ${f(height)}`, role: "img" };"""),
    ("""// Static markup for the HTML export. Text and attribute values are escaped;
// empty elements self-close, which HTML's parser honors for SVG content.
function mapTreeToString(node) {
  if (node == null) return "";
  if (typeof node === "string") return mapEscapeXml(node);
  const attrs = Object.entries(node.attrs || {})
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => ` ${k}="${mapEscapeXml(v)}"`)
    .join("");
  const kids = (node.children || []).map(mapTreeToString).join("");
  return kids ? `<${node.tag}${attrs}>${kids}</${node.tag}>` : `<${node.tag}${attrs}/>`;
}""",
     """// Static markup for the HTML export. Text and attribute values are escaped;
// empty elements self-close, which HTML's parser honors for SVG content. A
// node with `raw` is a stamp symbol: its body is markup written as markup.
function mapTreeToString(node) {
  if (node == null) return "";
  if (typeof node === "string") return mapEscapeXml(node);
  const attrs = Object.entries(node.attrs || {})
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => ` ${k}="${mapEscapeXml(v)}"`)
    .join("");
  const kids = node.raw != null ? String(node.raw) : (node.children || []).map(mapTreeToString).join("");
  return kids ? `<${node.tag}${attrs}>${kids}</${node.tag}>` : `<${node.tag}${attrs}/>`;
}"""),
    ("""  if (extra) Object.assign(props, extra);
  const children = (node.children || []).map((c, i) => mapTreeToReact(c, i));
  return React.createElement(node.tag, props, ...children);
}""",
     """  if (extra) Object.assign(props, extra);
  if (node.raw != null) {
    props.dangerouslySetInnerHTML = { __html: String(node.raw) };
    return React.createElement(node.tag, props);
  }
  const children = (node.children || []).map((c, i) => mapTreeToReact(c, i));
  return React.createElement(node.tag, props, ...children);
}"""),

    # ---- tools: the Stamp tool and the handle hints
    ("""  { id: "select",  label: "Select",  hint: "Click a shape to select it · Drag to move · Drag a point to reshape · Delete removes it · Right-click returns to Pin" },""",
     """  { id: "select",  label: "Select",  hint: "Click a shape to select it · Drag to move · Drag a point or a corner to reshape · Drag the knob above to turn (Shift snaps) · Delete removes it · Right-click returns to Pin" },"""),
    ("""  { id: "text",    label: "Text",    hint: "Click on the map to place a label · Edit it, its size, and its angle in the strip · Right-click when done" },
];""",
     """  { id: "text",    label: "Text",    hint: "Click on the map to place a label · Edit it, its size, its angle, and its arc in the strip · Right-click when done" },
  { id: "stamp",   label: "Stamp",   hint: "Pick a stamp in the strip, then click to place it or drag to size it · Right-click when done" },
];"""),
    # the frame helper, before the hook
    ("""// All of the tool interaction, as a hook so MapEditor's render stays readable.""",
     """// A shape's frame in its own coordinates, before its rotation, padded the way
// the selection box is: the box the handles sit on, and the point the shape
// turns around (a stamp its middle, a label its pivot). A rect, ellipse, or
// stamp carries its box; a label's is the measured selection box the hook
// keeps, so a label has no frame until it is selected. Null for a polygon or
// line, which have points instead.
function mapShapeFrame(s, selBox) {
  if (!s) return null;
  if (s.type === "rect" || s.type === "ellipse" || s.type === "stamp") {
    const pad = (s.type !== "stamp" && s.stroke ? s.strokeWidth / 2 : 0) + 2;
    return { x: s.x - pad, y: s.y - pad, w: s.w + 2 * pad, h: s.h + 2 * pad, cx: s.x + s.w / 2, cy: s.y + s.h / 2 };
  }
  if (s.type === "text") {
    if (!selBox) return null;
    const [cx, cy] = mapTextPivot(s);
    return { x: selBox.x, y: selBox.y, w: selBox.w, h: selBox.h, cx, cy };
  }
  return null;
}

// All of the tool interaction, as a hook so MapEditor's render stays readable."""),
    # hook state
    ("""  const [focusTextId, setFocusTextId] = useState(null); // a label just placed: the strip's field takes focus once, then forgets
""",
     """  const [focusTextId, setFocusTextId] = useState(null); // a label just placed: the strip's field takes focus once, then forgets
  const [stampId, setStampId] = useState(MAP_BUILTIN_STAMPS[0].id); // the stamp the Stamp tool places next
  const [handleDrag, setHandleDrag] = useState(null); // {kind: "scale"|"rotate", id, handle, origin, start, seq} while Select drags a frame handle
"""),
    ("""    setMoving(null);
    setVertexDrag(null);
    if (t !== "select") setSelectedShapeId(null);
  };""",
     """    setMoving(null);
    setVertexDrag(null);
    setHandleDrag(null);
    if (t !== "select") setSelectedShapeId(null);
  };"""),
    ("""    if (tool === "rect" || tool === "ellipse") {
      if (!targetLayer) return;
      e.preventDefault();
      setDraft({ type: tool, x0: p[0], y0: p[1], x1: p[0], y1: p[1] });
      return;
    }
    if (tool === "select") {
      // In Select the overlay takes the events: its hit copies carry data-shape
      // and the selected polygon's or line's handles carry data-vertex.
      const vertex = e.target && e.target.closest ? e.target.closest("[data-vertex]") : null;""",
     """    if (tool === "rect" || tool === "ellipse" || tool === "stamp") {
      if (!targetLayer) return;
      e.preventDefault();
      setDraft({ type: tool, x0: p[0], y0: p[1], x1: p[0], y1: p[1] });
      return;
    }
    if (tool === "select") {
      // In Select the overlay takes the events: its hit copies carry data-shape,
      // the selected polygon's or line's point handles carry data-vertex, and
      // the selected frame's corners and knob carry data-handle.
      const handle = e.target && e.target.closest ? e.target.closest("[data-handle]") : null;
      if (handle && selectedShape) {
        e.preventDefault();
        const h = handle.getAttribute("data-handle");
        setHandleDrag({ kind: h === "rotate" ? "rotate" : "scale", id: selectedShape.id, handle: h, origin: selectedShape, start: p, seq: Date.now() });
        return;
      }
      const vertex = e.target && e.target.closest ? e.target.closest("[data-vertex]") : null;"""),
    ("""    const id = finishDraft();
    setToolState("select");
    setMoving(null);
    setVertexDrag(null);
    setSelectedShapeId(id || (tool === "text" ? selectedShapeId : null));
  };""",
     """    const id = finishDraft();
    setToolState("select");
    setMoving(null);
    setVertexDrag(null);
    setHandleDrag(null);
    setSelectedShapeId(id || ((tool === "text" || tool === "stamp") ? selectedShapeId : null));
  };"""),
    ("""      if ((e.key === "Delete" || e.key === "Backspace") && selectedShape && (tool === "select" || tool === "text")) {""",
     """      if ((e.key === "Delete" || e.key === "Backspace") && selectedShape && (tool === "select" || tool === "text" || tool === "stamp")) {"""),
    ("""  // Press-drag-release for rect and ellipse: window listeners so a drag that
  // leaves the canvas still ends cleanly. A drag under two units each way is
  // a click, and places nothing.
  useEffect(() => {
    if (!draft || (draft.type !== "rect" && draft.type !== "ellipse")) return;
    const move = (e) => { const p = toPoint(e); if (p) setDraft(d => (d ? { ...d, x1: p[0], y1: p[1] } : d)); };
    const up = () => {
      const d = draft;
      const x = Math.min(d.x0, d.x1), y = Math.min(d.y0, d.y1);
      const w = Math.abs(d.x1 - d.x0), h = Math.abs(d.y1 - d.y0);
      if (w >= 2 && h >= 2) {
        addShape({ type: d.type, x: r2(x), y: r2(y), w: r2(w), h: r2(h), fill: style.fill, stroke: style.stroke, strokeWidth: style.strokeWidth, smooth: d.type === "rect" ? style.smooth : undefined });
      }
      setDraft(null);
    };""",
     """  // Press-drag-release for rect, ellipse, and stamp: window listeners so a
  // drag that leaves the canvas still ends cleanly. For a rect or ellipse a
  // drag under two units each way is a click and places nothing; for a stamp
  // a click places the chosen stamp at 120 units centred on it, and a drag
  // places it square at the drag's larger side. A placed stamp is selected,
  // so the strip's angle controls and the frame's handles apply to it.
  useEffect(() => {
    if (!draft || (draft.type !== "rect" && draft.type !== "ellipse" && draft.type !== "stamp")) return;
    const move = (e) => { const p = toPoint(e); if (p) setDraft(d => (d ? { ...d, x1: p[0], y1: p[1] } : d)); };
    const up = () => {
      const d = draft;
      const x = Math.min(d.x0, d.x1), y = Math.min(d.y0, d.y1);
      const w = Math.abs(d.x1 - d.x0), h = Math.abs(d.y1 - d.y0);
      if (d.type === "stamp") {
        const size = Math.max(w, h);
        const box = size >= 8
          ? { x: r2(x), y: r2(y), w: r2(size), h: r2(size) }
          : { x: r2(d.x0 - 60), y: r2(d.y0 - 60), w: 120, h: 120 };
        const id = addShape({ type: "stamp", stampId, ...box, rotation: 0, fill: style.fill, stroke: style.stroke, strokeWidth: style.strokeWidth });
        if (id) setSelectedShapeId(id);
      } else if (w >= 2 && h >= 2) {
        addShape({ type: d.type, x: r2(x), y: r2(y), w: r2(w), h: r2(h), fill: style.fill, stroke: style.stroke, strokeWidth: style.strokeWidth, smooth: d.type === "rect" ? style.smooth : undefined });
      }
      setDraft(null);
    };"""),
    ("""    const up = () => setVertexDrag(null);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [vertexDrag, layers]);
""",
     """    const up = () => setVertexDrag(null);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [vertexDrag, layers]);

  // Frame handles. Both drags apply the cursor's movement since the press to
  // the shape as it was at the press, so nothing jumps on the first move and
  // nothing accumulates. A corner moves in the shape's own frame (the
  // movement is turned back by the shape's angle); the opposite corner stays
  // where it is on the canvas, which for a turned stamp means its centre
  // moves. A stamp keeps its aspect, a rect or ellipse does not; nothing goes
  // under 8 units. The knob adds the angle the cursor has swept around the
  // frame's pivot; Shift snaps the result to 15 degrees.
  useEffect(() => {
    if (!handleDrag) return;
    const o = handleDrag.origin;
    const frame = mapShapeFrame(o, selBox);
    if (!frame) { setHandleDrag(null); return; }
    const move = (e) => {
      const p = toPoint(e);
      if (!p) return;
      const start = handleDrag.start;
      if (handleDrag.kind === "rotate") {
        const a0 = Math.atan2(start[1] - frame.cy, start[0] - frame.cx);
        const a1 = Math.atan2(p[1] - frame.cy, p[0] - frame.cx);
        let deg = (o.rotation || 0) + (a1 - a0) * 180 / Math.PI;
        if (e.shiftKey) deg = Math.round(deg / 15) * 15;
        deg = ((deg + 180) % 360 + 360) % 360 - 180;
        updateShape(o.id, { rotation: r2(deg) }, { coalesce: `rotate-${o.id}-${handleDrag.seq}` });
        return;
      }
      if (o.type !== "rect" && o.type !== "ellipse" && o.type !== "stamp") return;
      const th = (o.rotation || 0) * Math.PI / 180;
      const cos = Math.cos(th), sin = Math.sin(th);
      const turn = (dx, dy) => [dx * cos - dy * sin, dx * sin + dy * cos];
      const unturn = (dx, dy) => [dx * cos + dy * sin, -dx * sin + dy * cos];
      const [dlx, dly] = unturn(p[0] - start[0], p[1] - start[1]);
      const h = handleDrag.handle;
      const sx = h.includes("w") ? 1 : -1; // the anchor corner's side of the centre
      const sy = h.includes("n") ? 1 : -1;
      const ax = sx * o.w / 2, ay = sy * o.h / 2;   // the anchor, from the old centre
      const gx = -ax + dlx, gy = -ay + dly;         // the dragged corner, moved
      let w = Math.max(8, sx * (ax - gx));          // a corner dragged past its anchor stops at 8
      let hh = Math.max(8, sy * (ay - gy));
      if (o.type === "stamp") {
        const k = Math.max(w / o.w, hh / o.h);
        w = Math.max(8, o.w * k);
        hh = Math.max(8, o.h * k);
      }
      const [awx, awy] = turn(ax, ay);
      const [nax, nay] = turn(sx * w / 2, sy * hh / 2);
      const ncx = frame.cx + awx - nax, ncy = frame.cy + awy - nay;
      updateShape(o.id, { x: r2(ncx - w / 2), y: r2(ncy - hh / 2), w: r2(w), h: r2(hh) }, { coalesce: `scale-${o.id}-${handleDrag.seq}` });
    };
    const up = () => setHandleDrag(null);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [handleDrag, layers]);
"""),
    ("""  return {
    tool, setTool, hint, current, applyStyle, editSelected,""",
     """  return {
    tool, setTool, hint, current, applyStyle, editSelected,
    stampId, setStampId,"""),

    # ---- strip: stamp picker, no Width for a stamp, Arc for a label, Angle for both
    ("""  const isText = !!selectedShape && selectedShape.type === "text";
  const shapeLayer = selectedShape ? layers.find(l => l.shapes.some(s => s.id === selectedShape.id)) : null;""",
     """  const isText = !!selectedShape && selectedShape.type === "text";
  const hasAngle = !!selectedShape && (selectedShape.type === "text" || selectedShape.type === "stamp");
  const showWidth = kind !== "stamp"; // a stamp's line weight is the symbol's own
  const { stampId, setStampId } = drawing;
  const shapeLayer = selectedShape ? layers.find(l => l.shapes.some(s => s.id === selectedShape.id)) : null;"""),
    ("""      {showStyle && (
        <div className="map-tools-row">
          {showFill && <><span className="map-tools-label">Fill</span>{swatches(current.fill, v => applyStyle({ fill: v }))}</>}
          <span className="map-tools-label">Stroke</span>{swatches(current.stroke, v => applyStyle({ stroke: v }))}
          <span className="map-tools-label">Width</span>
          {MAP_STROKE_WIDTHS.map(w => (
            <button key={w} type="button" className={`btn btn-small ${current.strokeWidth === w ? "btn-accent" : "btn-ghost"}`} onClick={() => applyStyle({ strokeWidth: w })}>{w}</button>
          ))}""",
     """      {showStyle && (
        <div className="map-tools-row">
          {tool === "stamp" && (
            <>
              <span className="map-tools-label">Stamp</span>
              {MAP_BUILTIN_STAMPS.map(st => (
                <button
                  key={st.id}
                  type="button"
                  className={`map-stamp-pick ${stampId === st.id ? "active" : ""}`}
                  title={st.name}
                  onClick={() => { setStampId(st.id); if (selectedShape && selectedShape.type === "stamp") editSelected({ stampId: st.id }); }}
                >
                  <svg viewBox={st.viewBox} width="22" height="22" fill={current.fill || "none"} stroke={current.stroke || "none"} aria-hidden="true" dangerouslySetInnerHTML={{ __html: st.body }} />
                </button>
              ))}
            </>
          )}
          {showFill && <><span className="map-tools-label">Fill</span>{swatches(current.fill, v => applyStyle({ fill: v }))}</>}
          <span className="map-tools-label">Stroke</span>{swatches(current.stroke, v => applyStyle({ stroke: v }))}
          {showWidth && <><span className="map-tools-label">Width</span>
          {MAP_STROKE_WIDTHS.map(w => (
            <button key={w} type="button" className={`btn btn-small ${current.strokeWidth === w ? "btn-accent" : "btn-ghost"}`} onClick={() => applyStyle({ strokeWidth: w })}>{w}</button>
          ))}</>}"""),
    ("""              <span className="map-tools-label">Size</span>
              {MAP_TEXT_SIZES.map(sz => (
                <button key={sz} type="button" className={`btn btn-small ${selectedShape.fontSize === sz ? "btn-accent" : "btn-ghost"}`} onClick={() => editSelected({ fontSize: sz })}>{sz}</button>
              ))}
              <span className="map-tools-label">Angle</span>""",
     """              <span className="map-tools-label">Size</span>
              {MAP_TEXT_SIZES.map(sz => (
                <button key={sz} type="button" className={`btn btn-small ${selectedShape.fontSize === sz ? "btn-accent" : "btn-ghost"}`} onClick={() => editSelected({ fontSize: sz })}>{sz}</button>
              ))}
              <span className="map-tools-label">Arc</span>
              <input
                className="map-tools-range"
                type="range"
                min="-180" max="180" step="5"
                value={selectedShape.arc || 0}
                onChange={e => editSelected({ arc: parseInt(e.target.value, 10) || 0 }, "arc")}
                title="Bend the label along an arc: right arches it up, left bends it down"
              />
              <span className="map-tools-value">{selectedShape.arc || 0}°</span>
              {!!selectedShape.arc && <button type="button" className="btn btn-small btn-ghost" onClick={() => editSelected({ arc: 0 })} title="Straighten the label">Straight</button>}
            </>
          )}
          {hasAngle && (
            <>
              <span className="map-tools-label">Angle</span>"""),

    # ---- overlay: frames for labels and stamps, the stamp draft, corner and rotate handles
    ("""function MapEditorOverlay({ width, height, drawing }) {
  const { tool, draft, cursor, selBox, style, selectable, selectedShape, onSvgMouseDown, onSvgContextMenu } = drawing;
  const f = mapNum;
  const items = [];
  const vertexR = Math.max(3, width / 220);
  const selectMode = tool === "select";
  if (selectMode) {
    selectable.forEach(s => {
      const node = mapShapeNode(s);
      if (!node) return;
      const attrs = { ...node.attrs, fill: s.type === "stroke" ? "none" : "transparent", stroke: "transparent", "stroke-width": "14", "vector-effect": "non-scaling-stroke", "data-hit": "shape" };
      delete attrs.filter;
      items.push(mapTreeToReact({ ...node, attrs }, `hit-${s.id}`));
    });
  }
  if (draft && (draft.type === "rect" || draft.type === "ellipse")) {""",
     """function MapEditorOverlay({ width, height, drawing }) {
  const { tool, draft, cursor, selBox, style, selectable, selectedShape, onSvgMouseDown, onSvgContextMenu } = drawing;
  const f = mapNum;
  const items = [];
  const vertexR = Math.max(3, width / 220);
  const selectMode = tool === "select";
  if (selectMode) {
    // A stamp is hit through its whole box, turned with it; a label through a
    // copy of its text (bent the same way, so the hit copies need their own
    // arc paths); everything else through a copy of its outline.
    const hitCtx = { idBase: "hit", defs: [], stampsUsed: new Map() };
    selectable.forEach(s => {
      if (s.type === "stamp") {
        const attrs = { "data-shape": s.id, "data-hit": "shape", x: f(s.x), y: f(s.y), width: f(s.w), height: f(s.h), fill: "transparent", stroke: "transparent", "stroke-width": "14", "vector-effect": "non-scaling-stroke" };
        if (s.rotation) attrs.transform = `rotate(${f(s.rotation)} ${f(s.x + s.w / 2)} ${f(s.y + s.h / 2)})`;
        items.push(mapTreeToReact({ tag: "rect", attrs }, `hit-${s.id}`));
        return;
      }
      const node = mapShapeNode(s, hitCtx);
      if (!node) return;
      const attrs = { ...node.attrs, fill: s.type === "stroke" ? "none" : "transparent", stroke: "transparent", "stroke-width": "14", "vector-effect": "non-scaling-stroke", "data-hit": "shape" };
      delete attrs.filter;
      items.push(mapTreeToReact({ ...node, attrs }, `hit-${s.id}`));
    });
    if (hitCtx.defs.length > 0) items.unshift(mapTreeToReact({ tag: "defs", children: hitCtx.defs }, "hit-defs"));
  }
  if (draft && draft.type === "stamp") {
    const x = Math.min(draft.x0, draft.x1), y = Math.min(draft.y0, draft.y1);
    const size = Math.max(Math.abs(draft.x1 - draft.x0), Math.abs(draft.y1 - draft.y0));
    if (size >= 8) items.push(<rect key="draft" x={f(x)} y={f(y)} width={f(size)} height={f(size)} fill="none" stroke={style.stroke || MAP_PALETTE[0].hex} strokeWidth={1} strokeDasharray="6 6" vectorEffect="non-scaling-stroke" opacity={0.7} />);
  } else if (draft && (draft.type === "rect" || draft.type === "ellipse")) {"""),
    ("""  if (selBox) {
    items.push(<rect key="sel" x={f(selBox.x)} y={f(selBox.y)} width={f(selBox.w)} height={f(selBox.h)} fill="none" stroke="#c8a96e" strokeWidth={1} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" pointerEvents="none" />);
  }""",
     """  const frame = selectedShape ? mapShapeFrame(selectedShape, selBox) : null;
  if (frame) {
    // The frame turns with the shape. In Select its corners scale (not a
    // label's: its sizes are the fixed three) and, for a stamp or a label, a
    // knob above the top edge turns it. Each handle is a visible mark with a
    // transparent hit target on top, as the point handles are.
    const rot = selectedShape.rotation || 0;
    const hr = Math.max(4, width / 130);
    const g = [];
    g.push(<rect key="frame" x={f(frame.x)} y={f(frame.y)} width={f(frame.w)} height={f(frame.h)} fill="none" stroke="#c8a96e" strokeWidth={1} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" pointerEvents="none" />);
    if (selectMode && selectedShape.type !== "text") {
      [["nw", frame.x, frame.y], ["ne", frame.x + frame.w, frame.y], ["sw", frame.x, frame.y + frame.h], ["se", frame.x + frame.w, frame.y + frame.h]].forEach(([h, hx, hy]) => {
        g.push(<rect key={`c${h}`} x={f(hx - hr)} y={f(hy - hr)} width={f(hr * 2)} height={f(hr * 2)} fill="#f4efe4" stroke="#2b2420" strokeWidth={1} vectorEffect="non-scaling-stroke" pointerEvents="none" />);
        g.push(<rect key={`ch${h}`} x={f(hx - hr)} y={f(hy - hr)} width={f(hr * 2)} height={f(hr * 2)} fill="transparent" stroke="transparent" strokeWidth={14} vectorEffect="non-scaling-stroke" data-handle={h} />);
      });
    }
    if (selectMode && (selectedShape.type === "stamp" || selectedShape.type === "text")) {
      const kx = frame.x + frame.w / 2, ky = frame.y - Math.max(16, width / 60);
      g.push(<line key="kl" x1={f(kx)} y1={f(frame.y)} x2={f(kx)} y2={f(ky)} stroke="#c8a96e" strokeWidth={1} vectorEffect="non-scaling-stroke" pointerEvents="none" />);
      g.push(<circle key="kc" cx={f(kx)} cy={f(ky)} r={f(hr)} fill="#c8a96e" stroke="#2b2420" strokeWidth={1} vectorEffect="non-scaling-stroke" pointerEvents="none" />);
      g.push(<circle key="kh" cx={f(kx)} cy={f(ky)} r={f(hr)} fill="transparent" stroke="transparent" strokeWidth={16} vectorEffect="non-scaling-stroke" data-handle="rotate" />);
    }
    items.push(<g key="frame-g" transform={rot ? `rotate(${f(rot)} ${f(frame.cx)} ${f(frame.cy)})` : undefined}>{g}</g>);
  } else if (selBox) {
    items.push(<rect key="sel" x={f(selBox.x)} y={f(selBox.y)} width={f(selBox.w)} height={f(selBox.h)} fill="none" stroke="#c8a96e" strokeWidth={1} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" pointerEvents="none" />);
  }"""),
])

# ---- Drak's note during the r035 browser pass: the canvas resize grip stopped
# at 100% of its column, which read as "not functioning" on a wide screen. The
# ceiling is now 150%: past 100% the canvas grows out of its column on both
# sides (centred with a negative margin), capped so it never leaves the scroll
# pane, which clips sideways and would take the grip with it. The grip stays
# under the cursor either way. Both the view and the editor.
edit(MOD / "16_trunk.jsx", [
    ("""// Shared resize handler for the map canvas. Returns a mousedown handler that the
// caller wires onto a resize-handle element. Drags the canvas width as a percentage
// of its parent. Pin positions are 0-1 normalized so they track the canvas size.
function useResizeHandler(canvasRef, sizePct, setSizePct) {""",
     """// Shared resize handler for the map canvas. Returns a mousedown handler that the
// caller wires onto a resize-handle element. Drags the canvas width as a percentage
// of its parent, 25% to 150%. Past 100% the canvas grows out of its column on
// both sides (the caller centres it with a negative margin), but never past the
// scroll pane, which clips sideways and would take the handle with it; the
// handle stays under the cursor either way. Pin positions are 0-1 normalized so
// they track the canvas size.
function useResizeHandler(canvasRef, sizePct, setSizePct) {"""),
    ("""    const startX = e.clientX;
    const startSize = sizePct;
    const parentWidth = parent.clientWidth;

    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const deltaPct = (dx / parentWidth) * 100;
      const next = Math.max(25, Math.min(100, startSize + deltaPct));
      setSizePct(next);
    };""",
     """    const startX = e.clientX;
    const startSize = sizePct;
    // The column's content width, from the canvas itself: the parent's
    // clientWidth includes its padding, which the percentage does not.
    const parentWidth = canvas.getBoundingClientRect().width * 100 / startSize || parent.clientWidth;
    const pane = canvas.closest(".body") || canvas.closest(".main");
    const room = pane ? pane.clientWidth - 48 : parentWidth;
    const maxPct = Math.max(100, Math.min(150, (room / parentWidth) * 100));
    // The handle rides the right edge, which moves 1:1 with the cursor below
    // 100% and at half the width change above it (the growth is centred).
    const edgeOf = (pct) => (pct <= 100 ? pct - 100 : (pct - 100) / 2);
    const pctOf = (edge) => (edge <= 0 ? 100 + edge : 100 + edge * 2);
    const startEdge = edgeOf(startSize);

    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const deltaPct = (dx / parentWidth) * 100;
      const next = Math.max(25, Math.min(maxPct, pctOf(startEdge + deltaPct)));
      setSizePct(next);
    };"""),
    ("""      <div className="map-canvas view-mode" ref={canvasRef} style={{ width: `${sizePct}%` }}>""",
     """      <div className="map-canvas view-mode" ref={canvasRef} style={{ width: `${sizePct}%`, marginLeft: sizePct > 100 ? `${(100 - sizePct) / 2}%` : undefined }}>"""),
    ("""          })}
        </div>
        {sizePct < 100 && <div className="map-size-indicator">{Math.round(sizePct)}%</div>}""",
     """          })}
        </div>
        {Math.round(sizePct) !== 100 && <div className="map-size-indicator">{Math.round(sizePct)}%</div>}"""),
    ("""            style={{ borderRadius: "0 0 3px 3px", width: `${sizePct}%` }}""",
     """            style={{ borderRadius: "0 0 3px 3px", width: `${sizePct}%`, marginLeft: sizePct > 100 ? `${(100 - sizePct) / 2}%` : undefined }}"""),
    ("""              <MapEditorOverlay width={canvasTree.width} height={canvasTree.height} drawing={drawing} />
            </div>
            {sizePct < 100 && <div className="map-size-indicator">{Math.round(sizePct)}%</div>}""",
     """              <MapEditorOverlay width={canvasTree.width} height={canvasTree.height} drawing={drawing} />
            </div>
            {Math.round(sizePct) !== 100 && <div className="map-size-indicator">{Math.round(sizePct)}%</div>}"""),
])

# ---- Drak's second note during the pass: a click on the resize grip (no drag)
# placed a pin at the corner, whose marker overflowed the canvas and gave it
# scrollbars. The click no longer places a pin, and the canvas never scrolls
# sideways unless it is zoomed in (a tall canvas still scrolls down, as it
# must under its max-height). And a fourth canvas size: Custom, typed in.
edit(MOD / "16_trunk.jsx", [
    ("""  const handleCanvasClick = (e) => {
    if (drawing.tool !== "pin") return;""",
     """  const handleCanvasClick = (e) => {
    if (drawing.tool !== "pin") return;
    if (e.target && e.target.closest && e.target.closest(".map-resize-handle")) return; // a click on the resize grip is not a pin"""),
    ("""            className={`map-canvas tool-${drawing.tool} ${drawing.tool !== "pin" ? "draw-mode" : ""}`}""",
     """            className={`map-canvas tool-${drawing.tool} ${drawing.tool !== "pin" ? "draw-mode" : ""} ${mapZoom > 1 ? "zoomed" : ""}`}"""),
    ("""      <div className="map-canvas view-mode" ref={canvasRef} style={{ width: `${sizePct}%`, marginLeft: sizePct > 100 ? `${(100 - sizePct) / 2}%` : undefined }}>""",
     """      <div className={`map-canvas view-mode ${mapZoom > 1 ? "zoomed" : ""}`} ref={canvasRef} style={{ width: `${sizePct}%`, marginLeft: sizePct > 100 ? `${(100 - sizePct) / 2}%` : undefined }}>"""),
    # the custom canvas size
    ("""  const showPresets = !data.image;
  const presetValue = (MAP_CANVAS_PRESETS.find(p => p.width === data.drawing.width && p.height === data.drawing.height) || { id: "custom" }).id;
  const applyPreset = (id) => {
    const p = MAP_CANVAS_PRESETS.find(x => x.id === id);
    if (!p || (p.width === data.drawing.width && p.height === data.drawing.height)) return;
    const hasWork = pins.length > 0 || mapDrawingHasContent(data.drawing);
    if (hasWork && !confirm(`Change the canvas to ${p.label}? Shapes keep their coordinates and anything beyond the new edges is cut off; pins keep their relative positions and will shift against the drawing. Undo restores it.`)) return;
    commit({ ...data, drawing: { ...data.drawing, width: p.width, height: p.height } });
  };""",
     """  const showPresets = !data.image;
  const [customSizeOpen, setCustomSizeOpen] = useState(false); // Custom picked while the size still matches a preset
  const presetValue = customSizeOpen ? "custom" : (MAP_CANVAS_PRESETS.find(p => p.width === data.drawing.width && p.height === data.drawing.height) || { id: "custom" }).id;
  const applyCanvasSize = (width, height, label) => {
    if (width === data.drawing.width && height === data.drawing.height) return;
    const hasWork = pins.length > 0 || mapDrawingHasContent(data.drawing);
    if (hasWork && !confirm(`Change the canvas to ${label}? Shapes keep their coordinates and anything beyond the new edges is cut off; pins keep their relative positions and will shift against the drawing. Undo restores it.`)) return;
    commit({ ...data, drawing: { ...data.drawing, width, height } });
  };
  const applyPreset = (id) => {
    if (id === "custom") { setCustomSizeOpen(true); return; }
    setCustomSizeOpen(false);
    const p = MAP_CANVAS_PRESETS.find(x => x.id === id);
    if (p) applyCanvasSize(p.width, p.height, p.label);
  };
  // Custom: whole units, 100 to 10000 a side; out-of-range entries are clamped.
  const applyCustomSize = (w, h) => {
    const clamp = (v, d) => (Number.isFinite(v) ? Math.max(100, Math.min(10000, Math.round(v))) : d);
    const width = clamp(w, data.drawing.width), height = clamp(h, data.drawing.height);
    setCustomSizeOpen(false);
    applyCanvasSize(width, height, `${width} × ${height}`);
  };"""),
    ("""      <MapToolStrip drawing={drawing} history={history} showPresets={showPresets} presetValue={presetValue} onPreset={applyPreset} layersOpen={layersOpen} onToggleLayers={() => setLayersOpen(o => !o)} />""",
     """      <MapToolStrip drawing={drawing} history={history} showPresets={showPresets} presetValue={presetValue} onPreset={applyPreset} canvasSize={{ width: data.drawing.width, height: data.drawing.height }} onCustomSize={applyCustomSize} layersOpen={layersOpen} onToggleLayers={() => setLayersOpen(o => !o)} />"""),
    ("""function MapToolStrip({ drawing, history, showPresets, presetValue, onPreset, layersOpen, onToggleLayers }) {
  const { tool, setTool, current, applyStyle, editSelected, selectedShape, deleteSelected, layers, activeLayerId, setActiveLayerId, moveShapeToLayer, focusTextId, consumeFocusText } = drawing;
  const kind = selectedShape ? selectedShape.type : tool;""",
     """function MapToolStrip({ drawing, history, showPresets, presetValue, onPreset, canvasSize, onCustomSize, layersOpen, onToggleLayers }) {
  const { tool, setTool, current, applyStyle, editSelected, selectedShape, deleteSelected, layers, activeLayerId, setActiveLayerId, moveShapeToLayer, focusTextId, consumeFocusText } = drawing;
  const kind = selectedShape ? selectedShape.type : tool;
  // The Custom canvas size fields: seeded from the canvas whenever Custom
  // opens or the size changes under them, applied by Set or Enter.
  const [customW, setCustomW] = useState(canvasSize ? String(canvasSize.width) : "");
  const [customH, setCustomH] = useState(canvasSize ? String(canvasSize.height) : "");
  useEffect(() => {
    if (!canvasSize) return;
    setCustomW(String(canvasSize.width));
    setCustomH(String(canvasSize.height));
  }, [presetValue === "custom", canvasSize ? canvasSize.width : 0, canvasSize ? canvasSize.height : 0]);
  const setCustomSize = () => { if (onCustomSize) onCustomSize(parseFloat(customW), parseFloat(customH)); };"""),
    ("""            <select className="input map-tools-select" value={presetValue} onChange={e => onPreset(e.target.value)}>
              {MAP_CANVAS_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              {presetValue === "custom" && <option value="custom">Current size</option>}
            </select>""",
     """            <select className="input map-tools-select" value={presetValue} onChange={e => onPreset(e.target.value)} title="Canvas size, in drawing units">
              {MAP_CANVAS_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              <option value="custom">Custom…</option>
            </select>
            {presetValue === "custom" && canvasSize && (
              <>
                <input className="input map-tools-num" type="number" min="100" max="10000" step="1" value={customW} onChange={e => setCustomW(e.target.value)} onKeyDown={e => { if (e.key === "Enter") setCustomSize(); }} title="Canvas width, 100 to 10000" />
                <span className="map-tools-label">×</span>
                <input className="input map-tools-num" type="number" min="100" max="10000" step="1" value={customH} onChange={e => setCustomH(e.target.value)} onKeyDown={e => { if (e.key === "Enter") setCustomSize(); }} title="Canvas height, 100 to 10000" />
                <button type="button" className="btn btn-small btn-accent" onClick={setCustomSize} title="Apply this canvas size">Set</button>
              </>
            )}"""),
])

edit(SHELL, [
    # No scrolling inside the canvas unless it is zoomed in: the box is as
    # tall as the drawing and the page scrolls instead (the 75vh cap applied
    # only while zoomed, where the box is a window onto a larger canvas). The
    # strip sticks to the top of the page while a tall canvas scrolls by.
    ("""  overflow:auto;max-height:75vh;cursor:crosshair;user-select:none;
""",
     """  overflow:hidden;cursor:crosshair;user-select:none;
"""),
    (""".map-canvas.view-mode{cursor:default}
""",
     """.map-canvas.zoomed{overflow:auto;max-height:75vh}
.map-canvas.view-mode{cursor:default}
"""),
    (""".map-tools{
  display:flex;flex-direction:column;gap:6px;padding:8px 10px;
  background:var(--surf2);border:1px solid var(--border);border-bottom:none;
}
""",
     """.map-tools{
  display:flex;flex-direction:column;gap:6px;padding:8px 10px;
  background:var(--surf2);border:1px solid var(--border);border-bottom:none;
  position:sticky;top:0;z-index:25;
}
"""),
    (""".map-canvas.tool-text{cursor:text}
""",
     """.map-canvas.tool-text{cursor:text}
.map-canvas.tool-stamp{cursor:copy}
.map-canvas.tool-select .map-overlay [data-handle="nw"],.map-canvas.tool-select .map-overlay [data-handle="se"]{cursor:nwse-resize}
.map-canvas.tool-select .map-overlay [data-handle="ne"],.map-canvas.tool-select .map-overlay [data-handle="sw"]{cursor:nesw-resize}
.map-canvas.tool-select .map-overlay [data-handle="rotate"]{cursor:grab}
.map-stamp-pick{
  width:30px;height:30px;padding:3px;border-radius:3px;cursor:pointer;
  background:var(--surf);border:1px solid var(--border2);display:inline-flex;align-items:center;justify-content:center;
}
.map-stamp-pick.active{outline:2px solid var(--accent);outline-offset:1px}
.map-tools-range{width:140px;accent-color:var(--accent)}
.map-tools-value{font-size:calc(11px * var(--font-scale));color:var(--text-dim);min-width:34px}
"""),
])

print("r035 applied")
