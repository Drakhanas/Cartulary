"""r033: the drawing tools (Cartographia+ cut 3).

A tool strip on the map editor. Pin is a tool in it and the default, so a map
opens exactly as before; Select, Rect, Ellipse, Polygon, and Line hand pointer
events to the svg canvas and make pins inert until Pin is picked again. Rect
and ellipse are press-drag-release; polygon and line are click-placed
vertices (polygon closes on its first vertex, double-click, or Enter; line
ends on double-click or Enter; Escape cancels). Select clicks a shape (through a 14-pixel invisible hit stroke, so a thin
line is easy to catch), drags it, drags the points of a polygon or line to
reshape it, and Delete/Backspace or the strip's button removes it. Right-click
finishes the shape in progress and switches to Select with it selected; in
Select, right-click returns to Pin. Fill and stroke
swatches (the eight palette colors plus none), width 2/4/8, and a Smooth
toggle set the defaults for new shapes and edit the selected one. A canvas
size preset picker sits on every image-less map and asks before changing a
canvas that already has shapes or pins (nothing is transformed: shapes keep
their coordinates, pins their 0-1 positions). Overlays (selection box, the shape in progress, the rubber line) live in
a second svg the editor owns, over the canvas, with no pointer events, so the
one tree stays the drawing and the export never sees them.

Declared scope: 16_trunk, shell.html.

String-anchored edits; every anchor must occur exactly once. Run from the
repository root: python3 inlining/cuts/r033_drawing_tools.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
MOD = ROOT / "cartulary-src" / "modules"
SHELL = ROOT / "cartulary-src" / "shell.html"


def header(title):
    line = "// \u2500\u2500\u2500 " + title + " "
    return line + "\u2500" * (82 - len(line))


def edit(path, pairs):
    s = path.read_text(encoding="utf-8")
    for old, new in pairs:
        c = s.count(old)
        assert c == 1, f"{path.name}: anchor occurs {c} times: {old[:80]!r}"
        s = s.replace(old, new)
    path.write_text(s, encoding="utf-8")


TOOLS = header("Map drawing tools (v1.6 pillar 3)") + r"""
// The editor's tools. Pin is a tool in the strip and the default, so a map
// opens exactly as it did before there was a strip; the drawing tools hand
// pointer events to the svg and make the pins inert until Pin is picked again.
// Tool state is local to the editor and never persisted. The drawing changes
// only through onChange, one new mapData each time, the same as pins do.
// Overlays (the selection box, the shape in progress, the rubber line) live in
// a second svg the editor owns, over the canvas, with no pointer events, so
// the one tree stays the drawing and the export cannot pick an overlay up.
// Coordinates convert the way pins do: a fraction of the svg's rect times the
// viewBox, so a pin and a vertex placed at the same cursor agree.

const MAP_TOOLS = [
  { id: "pin",     label: "Pin",     hint: "Click on map to add pin \u00b7 Click pin to edit \u00b7 Drag pin to move" },
  { id: "select",  label: "Select",  hint: "Click a shape to select it \u00b7 Drag to move \u00b7 Drag a point to reshape \u00b7 Delete removes it \u00b7 Right-click returns to Pin" },
  { id: "rect",    label: "Rect",    hint: "Drag on the map to draw a rectangle \u00b7 Right-click when done" },
  { id: "ellipse", label: "Ellipse", hint: "Drag on the map to draw an ellipse \u00b7 Right-click when done" },
  { id: "polygon", label: "Polygon", hint: "Click to place the corners of a closed, filled area \u00b7 First corner, double-click, Enter, or right-click closes it \u00b7 Esc discards" },
  { id: "stroke",  label: "Line",    hint: "Click to place the points of an open line \u00b7 Double-click, Enter, or right-click finishes it \u00b7 Esc discards" },
];

// Canvas sizes offered on image-less maps (an image map's canvas is the image).
const MAP_CANVAS_PRESETS = [
  { id: "landscape", label: "Landscape 1600 \u00d7 1000", width: 1600, height: 1000 },
  { id: "portrait",  label: "Portrait 1000 \u00d7 1600",  width: 1000, height: 1600 },
  { id: "square",    label: "Square 1200 \u00d7 1200",    width: 1200, height: 1200 },
];

// Shift a normalized shape by (dx, dy) viewBox units, rounded to two decimals
// so stored coordinates stay short.
function translateMapShape(s, dx, dy) {
  const r = (v) => Math.round(v * 100) / 100;
  if (s.type === "polygon" || s.type === "stroke") return { ...s, points: s.points.map(p => [r(p[0] + dx), r(p[1] + dy)]) };
  return { ...s, x: r(s.x + dx), y: r(s.y + dy) };
}

// All of the tool interaction, as a hook so MapEditor's render stays readable.
// Takes the normalized mapData and the editor's onChange, the svg ref (the
// canvas, for coordinates and hit tests), the canvas div ref (focused on
// mousedown so the browser's own keyboard scrolling stays on the canvas), and
// the canvas size the tree rendered at.
function useMapDrawing({ data, onChange, svgRef, canvasRef, width, height }) {
  const [tool, setToolState] = useState("pin");
  // Defaults for the first shape: stone fill, sepia stroke. Stone because a
  // fill has to be visibly a fill on white, vellum, and parchment alike;
  // parchment on vellum read as an outline.
  const [style, setStyle] = useState({ fill: "#8a8378", stroke: "#6b4e2e", strokeWidth: 4, smooth: true });
  const [selectedShapeId, setSelectedShapeId] = useState(null);
  const [draft, setDraft] = useState(null);     // rect/ellipse: {type, x0, y0, x1, y1}; polygon/stroke: {type, points}
  const [cursor, setCursor] = useState(null);   // [x, y] while a polygon or line is in progress
  const [moving, setMoving] = useState(null);   // {id, startX, startY, origin} while Select drags a whole shape
  const [vertexDrag, setVertexDrag] = useState(null); // {id, index} while Select drags one point of a polygon or line
  const [selBox, setSelBox] = useState(null);   // selection box in viewBox units, measured from the DOM

  const drawing = data.drawing;
  const layers = drawing.layers;
  const targetLayer = layers.find(l => l.visible && !l.locked) || null;
  const allShapes = layers.flatMap(l => l.shapes);
  const selectable = layers.filter(l => l.visible && !l.locked).flatMap(l => l.shapes);
  const selectedShape = selectedShapeId ? (allShapes.find(s => s.id === selectedShapeId) || null) : null;

  const r2 = (v) => Math.round(v * 100) / 100;
  const toPoint = (e) => {
    const el = svgRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const fx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const fy = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return [r2(fx * width), r2(fy * height)];
  };
  // viewBox units per screen pixel, for click tolerances that should feel the same at any zoom
  const unitsPerPx = () => {
    const el = svgRef.current;
    const rect = el ? el.getBoundingClientRect() : null;
    return rect && rect.width ? width / rect.width : 1;
  };

  const setLayers = (next) => onChange({ ...data, drawing: { ...drawing, layers: next } });
  const addShape = (raw) => {
    if (!targetLayer) return null;
    const shape = ensureMapShape({ id: `shape-${genId().slice(-6)}`, ...raw });
    if (!shape) return null;
    setLayers(layers.map(l => l.id === targetLayer.id ? { ...l, shapes: [...l.shapes, shape] } : l));
    return shape.id;
  };
  const updateShape = (id, patch) => {
    setLayers(layers.map(l => ({ ...l, shapes: l.shapes.map(s => s.id === id ? (ensureMapShape({ ...s, ...patch }) || s) : s) })));
  };
  const deleteShape = (id) => {
    setLayers(layers.map(l => ({ ...l, shapes: l.shapes.filter(s => s.id !== id) })));
    if (selectedShapeId === id) setSelectedShapeId(null);
  };

  const setTool = (t) => {
    setToolState(t);
    setDraft(null);
    setCursor(null);
    setMoving(null);
    setVertexDrag(null);
    if (t !== "select") setSelectedShapeId(null);
  };

  // The strip shows the selected shape's style when there is one, else the
  // defaults; a change edits the selected shape and becomes the default too.
  const current = selectedShape
    ? { fill: selectedShape.fill, stroke: selectedShape.stroke, strokeWidth: selectedShape.strokeWidth, smooth: !!selectedShape.smooth }
    : style;
  const applyStyle = (patch) => {
    setStyle(st => ({ ...st, ...patch }));
    if (selectedShape) updateShape(selectedShape.id, patch);
  };

  // Commits the polygon or line in progress (a rect or ellipse commits on
  // mouseup instead) and returns the new shape's id, or null.
  const finishDraft = (pointsOverride) => {
    if (!draft) return null;
    let id = null;
    if (draft.type === "polygon" || draft.type === "stroke") {
      const pts = pointsOverride || draft.points;
      if (pts.length >= (draft.type === "polygon" ? 3 : 2)) {
        id = addShape({ type: draft.type, points: pts, fill: draft.type === "stroke" ? null : style.fill, stroke: style.stroke, strokeWidth: style.strokeWidth, smooth: style.smooth });
      }
    }
    setDraft(null);
    setCursor(null);
    return id;
  };
  const cancelDraft = () => { setDraft(null); setCursor(null); };

  const onSvgMouseDown = (e) => {
    if (e.button !== 0) return;
    if (canvasRef.current && canvasRef.current.focus) canvasRef.current.focus({ preventScroll: true });
    const p = toPoint(e);
    if (!p) return;
    if (tool === "rect" || tool === "ellipse") {
      if (!targetLayer) return;
      e.preventDefault();
      setDraft({ type: tool, x0: p[0], y0: p[1], x1: p[0], y1: p[1] });
      return;
    }
    if (tool === "select") {
      // In Select the overlay takes the events: its hit copies carry data-shape
      // and the selected polygon's or line's handles carry data-vertex.
      const vertex = e.target && e.target.closest ? e.target.closest("[data-vertex]") : null;
      if (vertex && selectedShape) {
        e.preventDefault();
        setVertexDrag({ id: selectedShape.id, index: parseInt(vertex.getAttribute("data-vertex"), 10) });
        return;
      }
      const hit = e.target && e.target.closest ? e.target.closest("[data-shape]") : null;
      const id = hit ? hit.getAttribute("data-shape") : null;
      const shape = id ? selectable.find(s => s.id === id) : null;
      if (!shape) { setSelectedShapeId(null); return; }
      e.preventDefault();
      setSelectedShapeId(shape.id);
      setMoving({ id: shape.id, startX: p[0], startY: p[1], origin: shape });
    }
  };
  // Right-click: in a drawing tool, finish what is in progress and go to Select
  // with it selected; in Select, back to Pin. Never the browser's menu.
  const onSvgContextMenu = (e) => {
    e.preventDefault();
    if (tool === "pin") return;
    if (tool === "select") { setTool("pin"); return; }
    const id = finishDraft();
    setToolState("select");
    setMoving(null);
    setVertexDrag(null);
    setSelectedShapeId(id);
  };
  const onSvgClick = (e) => {
    if (tool !== "polygon" && tool !== "stroke") return;
    if (!targetLayer) return;
    const p = toPoint(e);
    if (!p) return;
    if (!draft) { setDraft({ type: tool, points: [p] }); setCursor(p); return; }
    if (tool === "polygon" && draft.points.length >= 3) {
      const first = draft.points[0];
      if (Math.hypot(p[0] - first[0], p[1] - first[1]) <= 10 * unitsPerPx()) { finishDraft(); return; }
    }
    setDraft({ ...draft, points: [...draft.points, p] });
  };
  const onSvgDoubleClick = (e) => {
    if (!draft || (draft.type !== "polygon" && draft.type !== "stroke")) return;
    e.preventDefault();
    // the double-click's two clicks each placed a vertex at the same spot; drop the duplicate
    let pts = draft.points;
    if (pts.length >= 2) {
      const a = pts[pts.length - 1], b = pts[pts.length - 2];
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) <= 3 * unitsPerPx()) pts = pts.slice(0, -1);
    }
    finishDraft(pts);
  };
  const onSvgMouseMove = (e) => {
    if (!draft || (draft.type !== "polygon" && draft.type !== "stroke")) return;
    const p = toPoint(e);
    if (p) setCursor(p);
  };
  // Keys are document-wide while a drawing tool is active, because the strip's
  // buttons take focus when clicked and a Delete that only worked with the
  // canvas focused would fail right after picking a swatch. Typing targets are
  // left alone, and Enter on a focused button is the button's.
  useEffect(() => {
    if (tool === "pin") return;
    const handler = (e) => {
      const t = e.target;
      const tag = t && t.tagName ? t.tagName.toUpperCase() : "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable)) return;
      if (e.key === "Escape") {
        if (draft) cancelDraft();
        else if (selectedShapeId) setSelectedShapeId(null);
        else return;
        e.preventDefault();
        return;
      }
      if (e.key === "Enter" && tag !== "BUTTON" && draft && (draft.type === "polygon" || draft.type === "stroke")) {
        e.preventDefault();
        finishDraft();
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedShape && tool === "select") {
        e.preventDefault();
        deleteShape(selectedShape.id);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [tool, draft, selectedShapeId, layers]);

  // Press-drag-release for rect and ellipse: window listeners so a drag that
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
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [draft]);

  // Select-tool drag: the shape follows the cursor from its origin, so the
  // offset is always measured from where the drag began, never accumulated.
  useEffect(() => {
    if (!moving) return;
    const move = (e) => {
      const p = toPoint(e);
      if (!p) return;
      const dx = p[0] - moving.startX, dy = p[1] - moving.startY;
      setLayers(layers.map(l => ({ ...l, shapes: l.shapes.map(s => s.id === moving.id ? translateMapShape(moving.origin, dx, dy) : s) })));
    };
    const up = () => setMoving(null);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [moving, layers]);

  // Vertex drag: one point of the selected polygon or line follows the cursor.
  useEffect(() => {
    if (!vertexDrag) return;
    const move = (e) => {
      const p = toPoint(e);
      if (!p) return;
      setLayers(layers.map(l => ({ ...l, shapes: l.shapes.map(s => (s.id === vertexDrag.id && Array.isArray(s.points))
        ? { ...s, points: s.points.map((q, i) => (i === vertexDrag.index ? p : q)) }
        : s) })));
    };
    const up = () => setVertexDrag(null);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [vertexDrag, layers]);

  // The selection box comes from the rendered element's bbox, which covers
  // every shape type the same way (text and stamps included, later), padded
  // by half the stroke the bbox leaves out.
  useEffect(() => {
    if (!selectedShape || !svgRef.current) { setSelBox(null); return; }
    const el = svgRef.current.querySelector(`[data-shape="${selectedShape.id.replace(/["\\]/g, "")}"]`);
    if (!el || typeof el.getBBox !== "function") { setSelBox(null); return; }
    try {
      const b = el.getBBox();
      const pad = (selectedShape.stroke ? selectedShape.strokeWidth / 2 : 0) + 2;
      setSelBox({ x: b.x - pad, y: b.y - pad, w: b.width + 2 * pad, h: b.height + 2 * pad });
    } catch (err) {
      setSelBox(null);
    }
  }, [selectedShape, data]);

  const toolDef = MAP_TOOLS.find(t => t.id === tool) || MAP_TOOLS[0];
  const hint = (tool !== "pin" && !targetLayer) ? "No visible, unlocked layer to draw on" : toolDef.hint;

  return {
    tool, setTool, hint, current, applyStyle,
    selectedShape, deleteSelected: () => { if (selectedShape) deleteShape(selectedShape.id); },
    draft, cursor, selBox, style, selectable,
    onSvgMouseDown, onSvgClick, onSvgDoubleClick, onSvgMouseMove, onSvgContextMenu,
  };
}

// The strip under the editor toolbar: tools, the size presets on an image-less
// map, and (for the drawing tools, or while a shape is selected) the fill and
// stroke swatches, the width, Smooth, and Delete.
function MapToolStrip({ drawing, showPresets, presetValue, onPreset }) {
  const { tool, setTool, current, applyStyle, selectedShape, deleteSelected } = drawing;
  const kind = selectedShape ? selectedShape.type : tool;
  const showStyle = tool !== "pin" && (tool !== "select" || !!selectedShape);
  const showFill = kind !== "stroke";
  const showSmooth = kind === "rect" || kind === "polygon" || kind === "stroke";
  const swatches = (value, onPick) => (
    <span className="map-swatches">
      {MAP_PALETTE.map(c => (
        <button
          key={c.id}
          type="button"
          className={`map-swatch ${value === c.hex ? "active" : ""}`}
          style={{ background: c.hex }}
          title={c.label}
          onClick={() => onPick(c.hex)}
        />
      ))}
      <button type="button" className={`map-swatch map-swatch-none ${value == null ? "active" : ""}`} title="None" onClick={() => onPick(null)} />
    </span>
  );
  return (
    <div className="map-tools">
      <div className="map-tools-row">
        {MAP_TOOLS.map(t => (
          <button key={t.id} type="button" className={`btn btn-small ${tool === t.id ? "btn-accent" : "btn-ghost"}`} onClick={() => setTool(t.id)} title={t.hint}>{t.label}</button>
        ))}
        {showPresets && (
          <>
            <span className="map-tools-sep" />
            <span className="map-tools-label">Canvas</span>
            <select className="input map-tools-select" value={presetValue} onChange={e => onPreset(e.target.value)}>
              {MAP_CANVAS_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              {presetValue === "custom" && <option value="custom">Current size</option>}
            </select>
          </>
        )}
      </div>
      {showStyle && (
        <div className="map-tools-row">
          {showFill && <><span className="map-tools-label">Fill</span>{swatches(current.fill, v => applyStyle({ fill: v }))}</>}
          <span className="map-tools-label">Stroke</span>{swatches(current.stroke, v => applyStyle({ stroke: v }))}
          <span className="map-tools-label">Width</span>
          {MAP_STROKE_WIDTHS.map(w => (
            <button key={w} type="button" className={`btn btn-small ${current.strokeWidth === w ? "btn-accent" : "btn-ghost"}`} onClick={() => applyStyle({ strokeWidth: w })}>{w}</button>
          ))}
          {showSmooth && (
            <button type="button" className={`btn btn-small ${current.smooth ? "btn-accent" : "btn-ghost"}`} onClick={() => applyStyle({ smooth: !current.smooth })} title="Round the corners and curve the path through its points">Smooth</button>
          )}
          {selectedShape && <button type="button" className="btn btn-small btn-danger" onClick={deleteSelected}>Delete shape</button>}
        </div>
      )}
    </div>
  );
}

// The editor's overlay svg, same viewBox as the canvas. In the drawing tools
// it has no pointer events and draws the shape in progress in the current
// style, the rubber line to the cursor and the closing line for a polygon,
// the placed vertices (the first one larger, since clicking it closes the
// polygon), and the selection box. In Select it takes the pointer events and
// also carries an invisible hit copy of every selectable shape with a
// 14-pixel stroke that does not scale with zoom (a 4-unit line is under two
// screen pixels wide, and nobody should have to hit that), plus draggable
// point handles for the selected polygon or line.
function MapEditorOverlay({ width, height, drawing }) {
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
  if (draft && (draft.type === "rect" || draft.type === "ellipse")) {
    const x = Math.min(draft.x0, draft.x1), y = Math.min(draft.y0, draft.y1);
    const w = Math.abs(draft.x1 - draft.x0), h = Math.abs(draft.y1 - draft.y0);
    const paint = { fill: style.fill || "none", stroke: style.stroke || "none", strokeWidth: style.strokeWidth, opacity: 0.6 };
    if (draft.type === "rect") {
      const r = style.smooth ? Math.min(w, h) / 8 : 0;
      items.push(<rect key="draft" x={f(x)} y={f(y)} width={f(w)} height={f(h)} rx={f(r)} ry={f(r)} {...paint} />);
    } else {
      items.push(<ellipse key="draft" cx={f(x + w / 2)} cy={f(y + h / 2)} rx={f(w / 2)} ry={f(h / 2)} {...paint} />);
    }
  } else if (draft) {
    const pts = draft.points;
    const trail = cursor ? [...pts, cursor] : pts;
    items.push(<polyline key="draft" points={trail.map(p => `${f(p[0])},${f(p[1])}`).join(" ")} fill="none" stroke={style.stroke || MAP_PALETTE[0].hex} strokeWidth={style.strokeWidth} strokeLinejoin="round" strokeLinecap="round" opacity={0.7} />);
    if (draft.type === "polygon" && cursor && pts.length >= 2) {
      items.push(<line key="close" x1={f(cursor[0])} y1={f(cursor[1])} x2={f(pts[0][0])} y2={f(pts[0][1])} stroke={style.stroke || MAP_PALETTE[0].hex} strokeWidth={1} strokeDasharray="6 6" vectorEffect="non-scaling-stroke" opacity={0.6} />);
    }
    pts.forEach((p, i) => {
      const first = i === 0 && draft.type === "polygon";
      items.push(<circle key={`v${i}`} cx={f(p[0])} cy={f(p[1])} r={f(first ? vertexR * 1.6 : vertexR)} fill={first ? "#c8a96e" : "#f4efe4"} stroke={MAP_PALETTE[0].hex} strokeWidth={1} vectorEffect="non-scaling-stroke" />);
    });
  }
  if (selBox) {
    items.push(<rect key="sel" x={f(selBox.x)} y={f(selBox.y)} width={f(selBox.w)} height={f(selBox.h)} fill="none" stroke="#c8a96e" strokeWidth={1} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" pointerEvents="none" />);
  }
  if (selectMode && selectedShape && Array.isArray(selectedShape.points)) {
    // A visible dot, then its hit target on top: a transparent disk (the
    // stroke ring alone leaves the centre of a small circle unhittable in
    // Chromium) plus a transparent 16-pixel non-scaling stroke around it.
    const hr = Math.max(4, width / 130);
    selectedShape.points.forEach((p, i) => {
      items.push(<circle key={`h${i}`} cx={f(p[0])} cy={f(p[1])} r={f(hr)} fill="#f4efe4" stroke="#2b2420" strokeWidth={1} vectorEffect="non-scaling-stroke" pointerEvents="none" />);
      items.push(<circle key={`hh${i}`} cx={f(p[0])} cy={f(p[1])} r={f(hr)} fill="transparent" stroke="transparent" strokeWidth={16} vectorEffect="non-scaling-stroke" data-vertex={i} />);
    });
  }
  return (
    <svg
      className="map-overlay"
      viewBox={`0 0 ${f(width)} ${f(height)}`}
      aria-hidden="true"
      onMouseDown={selectMode ? onSvgMouseDown : undefined}
      onContextMenu={selectMode ? onSvgContextMenu : undefined}
    >
      {items}
    </svg>
  );
}
"""

# the source carries the characters themselves, as the rest of the file does
TOOLS = TOOLS.replace("\\u00b7", "\u00b7").replace("\\u00d7", "\u00d7")

MAP_VIEW_HEADER = "\n" + header("Map view") + "\n"

edit(MOD / "16_trunk.jsx", [
    # 1. the tools block, between the renderer and the Map view header
    (MAP_VIEW_HEADER, "\n" + TOOLS + MAP_VIEW_HEADER),

    # 2. MapEditor: the hook, after the canvas tree
    ("""  }), [data, imageUrl, imageSize]);
""",
     """  }), [data, imageUrl, imageSize]);
  const drawing = useMapDrawing({ data, onChange, svgRef: imgRef, canvasRef, width: canvasTree.width, height: canvasTree.height });
  // Canvas size presets for image-less maps. With shapes or pins on the map
  // the switch warns first, because nothing is transformed: shapes keep their
  // coordinates (anything beyond the new edges is cut off) and pins keep their
  // 0-1 positions, so they shift against the drawing. An image map's canvas is
  // the image's size and has no picker.
  const showPresets = !data.image;
  const presetValue = (MAP_CANVAS_PRESETS.find(p => p.width === data.drawing.width && p.height === data.drawing.height) || { id: "custom" }).id;
  const applyPreset = (id) => {
    const p = MAP_CANVAS_PRESETS.find(x => x.id === id);
    if (!p || (p.width === data.drawing.width && p.height === data.drawing.height)) return;
    const hasWork = pins.length > 0 || mapDrawingHasContent(data.drawing);
    if (hasWork && !confirm(`Change the canvas to ${p.label}? Shapes keep their coordinates and anything beyond the new edges is cut off; pins keep their relative positions and will shift against the drawing. There is no undo yet.`)) return;
    onChange({ ...data, drawing: { ...data.drawing, width: p.width, height: p.height } });
  };
"""),

    # 3. pin placement only under the Pin tool
    ("""  const handleCanvasClick = (e) => {
    if (draggingPinId) return;""",
     """  const handleCanvasClick = (e) => {
    if (drawing.tool !== "pin") return;
    if (draggingPinId) return;"""),

    # 4. the hint follows the tool; the strip sits under the toolbar
    ("""        <span className="map-editor-hint">
          Click on map to add pin \u00b7 Click pin to edit \u00b7 Drag pin to move
        </span>
      </div>

      {data.image && errored ? (""",
     """        <span className="map-editor-hint">{drawing.hint}</span>
      </div>
      <MapToolStrip drawing={drawing} showPresets={showPresets} presetValue={presetValue} onPreset={applyPreset} />

      {data.image && errored ? ("""),

    # 5. the canvas div carries the mode, takes focus, and routes keys
    ("""          <div className="map-canvas" ref={canvasRef} onClick={handleCanvasClick} style={{ borderRadius: "0 0 3px 3px", width: `${sizePct}%` }}>
            <div style={{ position: "relative", width: `${mapZoom * 100}%`, transition: "width 100ms ease" }}>
              {mapTreeToReact(canvasTree, "canvas", { ref: imgRef })}""",
     """          <div
            className={`map-canvas tool-${drawing.tool} ${drawing.tool !== "pin" ? "draw-mode" : ""}`}
            ref={canvasRef}
            onClick={handleCanvasClick}
            tabIndex={0}
            style={{ borderRadius: "0 0 3px 3px", width: `${sizePct}%` }}
          >
            <div style={{ position: "relative", width: `${mapZoom * 100}%`, transition: "width 100ms ease" }}>
              {mapTreeToReact(canvasTree, "canvas", {
                ref: imgRef,
                onMouseDown: drawing.onSvgMouseDown,
                onMouseMove: drawing.onSvgMouseMove,
                onClick: drawing.onSvgClick,
                onDoubleClick: drawing.onSvgDoubleClick,
                onContextMenu: drawing.onSvgContextMenu,
              })}"""),

    # 6. the overlay, above the pins
    ("""                  onMouseDown={(e) => handlePinMouseDown(e, pin.id)}
                />
              ))}
            </div>
            {sizePct < 100 && <div className="map-size-indicator">{Math.round(sizePct)}%</div>}""",
     """                  onMouseDown={(e) => handlePinMouseDown(e, pin.id)}
                />
              ))}
              <MapEditorOverlay width={canvasTree.width} height={canvasTree.height} drawing={drawing} />
            </div>
            {sizePct < 100 && <div className="map-size-indicator">{Math.round(sizePct)}%</div>}"""),
])

edit(SHELL, [
    (""".map-pin-faded{opacity:.28;transition:opacity .15s}
.map-pin-faded:hover{opacity:.7}
""",
     """.map-pin-faded{opacity:.28;transition:opacity .15s}
.map-pin-faded:hover{opacity:.7}

/* Map drawing tools (v1.6 pillar 3) */
.map-tools{
  display:flex;flex-direction:column;gap:6px;padding:8px 10px;
  background:var(--surf2);border:1px solid var(--border);border-bottom:none;
}
.map-tools-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.map-tools-label{
  font-family:'DM Sans',sans-serif;font-size:calc(10px * var(--font-scale));
  letter-spacing:.08em;text-transform:uppercase;color:var(--text-dim);margin-left:6px;
}
.map-tools-label:first-child{margin-left:0}
.map-tools-sep{width:1px;height:18px;background:var(--border);margin:0 4px}
.map-tools-select{width:auto;padding:3px 8px;font-size:calc(11px * var(--font-scale))}
.map-swatches{display:inline-flex;align-items:center;gap:4px}
.map-swatch{
  width:18px;height:18px;border-radius:50%;padding:0;cursor:pointer;
  border:1px solid var(--border2);box-shadow:inset 0 0 0 1px rgba(0,0,0,.25);
}
.map-swatch.active{outline:2px solid var(--accent);outline-offset:1px}
.map-swatch-none{
  background:transparent;position:relative;overflow:hidden;
}
.map-swatch-none::after{
  content:"";position:absolute;left:50%;top:-3px;bottom:-3px;width:1.5px;
  background:var(--danger);transform:rotate(45deg);transform-origin:center;
}
.map-canvas:focus{outline:none}
.map-canvas.draw-mode .map-image{pointer-events:auto}
.map-canvas.draw-mode .map-pin{pointer-events:none;opacity:.5}
.map-canvas.tool-select{cursor:default}
.map-canvas.tool-rect,.map-canvas.tool-ellipse,.map-canvas.tool-polygon,.map-canvas.tool-stroke{cursor:crosshair}
.map-overlay{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:6}
.map-canvas.tool-select .map-overlay{pointer-events:auto}
.map-canvas.tool-select .map-overlay [data-shape]{cursor:move}
.map-canvas.tool-select .map-overlay [data-vertex]{cursor:crosshair}
"""),
])

print("r033 applied")
