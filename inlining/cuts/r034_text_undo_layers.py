"""r034: text labels, undo/redo, and the layer list (Cartographia+ cut 4).

Text: a Text tool; a click places a label at that point ("Label",
pre-selected), the strip grows a text field (focused, so typing replaces it),
size 24/36/56, and rotation (-15/+15 steppers and a number box); Fill is the
text color and Stroke an outline; Select moves and deletes it like any shape.

Undo/redo: one history of mapData snapshots, pins included (this overrides the
build sheet's drawing-only scope, by decision at session 19: the snapshot is
the record either way, so pins ride along for free). One step per completed
gesture: a drag is one step however long it lasts, typing in a field coalesces
into one step per edit; 50 deep; Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y document-wide
while the editor is open, typing fields excluded, plus Undo and Redo buttons;
the image-size heal is not a step; the history dies with the editor.

Layers: a Layers button in the strip toggles a panel under it, one row per
layer (top first) with the active marker, the name (editable), Show/Hide,
Lock/Unlock, Up/Down, Delete (asks when the layer has shapes), plus Add layer.
The active layer is explicit, picked in the panel or the strip's Layer select,
and a hidden or locked active layer refuses drawing with the hint saying why.
A selected shape can be moved to another layer from the strip.

Declared scope: 16_trunk, shell.html.

String-anchored edits; every anchor must occur exactly once. Run from the
repository root against the r033 tree: python3 inlining/cuts/r034_text_undo_layers.py
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


HISTORY = r"""
// Undo/redo over the whole mapData, pins included: one history of snapshots,
// editor-local, gone when the editor closes. commit(next, opts) is what every
// write goes through; a snapshot of the current record is pushed before each
// step. opts.coalesce names a gesture (a drag, a run of typing in one field):
// consecutive commits under the same name are one step, so a drag of any
// length undoes in one go and the first keystroke's snapshot is the one that
// comes back. opts.silent writes through with no step (the image-size heal).
// Keys are document-wide while the editor is mounted, typing fields excluded,
// so a text field keeps the browser's own undo.
function useMapHistory(data, onChange, limit) {
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const keyRef = useRef(null);
  const [, bump] = useState(0);
  const max = limit || 50;
  const commit = (next, opts) => {
    const o = opts || {};
    if (!o.silent) {
      const key = o.coalesce || null;
      if (!(key && keyRef.current === key)) {
        pastRef.current.push(data);
        if (pastRef.current.length > max) pastRef.current.shift();
      }
      futureRef.current = [];
      keyRef.current = key;
      bump(n => n + 1);
    }
    onChange(next);
  };
  const undo = () => {
    if (pastRef.current.length === 0) return;
    const prev = pastRef.current.pop();
    futureRef.current.push(data);
    keyRef.current = null;
    bump(n => n + 1);
    onChange(prev);
  };
  const redo = () => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current.pop();
    pastRef.current.push(data);
    keyRef.current = null;
    bump(n => n + 1);
    onChange(next);
  };
  useEffect(() => {
    const handler = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const t = e.target;
      const tag = t && t.tagName ? t.tagName.toUpperCase() : "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable)) return;
      const k = typeof e.key === "string" ? e.key.toLowerCase() : "";
      if (k === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((k === "z" && e.shiftKey) || k === "y") { e.preventDefault(); redo(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [data]);
  return { commit, undo, redo, canUndo: pastRef.current.length > 0, canRedo: futureRef.current.length > 0 };
}
"""

LAYER_PANEL = r"""
// The layer panel under the strip: one row per layer, top-most first (the
// last layer in the array draws on top). Pick the active layer, rename it in
// place, show or hide, lock or unlock, move it up or down the stack, delete
// it (asks when it has shapes; undo brings it back), or add one on top.
function MapLayerPanel({ drawing }) {
  const { layers, activeLayerId, setActiveLayerId, addLayer, renameLayer, toggleLayerVisible, toggleLayerLocked, moveLayer, deleteLayer } = drawing;
  const rows = [...layers].reverse();
  return (
    <div className="map-layers">
      <div className="map-layers-head">
        <span className="map-tools-label">Layers</span>
        <span className="map-layers-note">Top of the stack first. Shapes go to the active layer.</span>
        <span style={{ flex: 1 }} />
        <button type="button" className="btn btn-small btn-ghost" onClick={addLayer}>+ Add layer</button>
      </div>
      {rows.map((l, i) => {
        const idx = layers.length - 1 - i;
        const active = l.id === activeLayerId;
        return (
          <div key={l.id} className={`map-layer-row ${active ? "active" : ""} ${l.visible ? "" : "hidden-layer"}`}>
            <button type="button" className={`map-layer-pick ${active ? "active" : ""}`} title={active ? "Active layer" : "Make this the active layer"} onClick={() => setActiveLayerId(l.id)}>{active ? "◉" : "○"}</button>
            <input
              className="input map-layer-name"
              value={l.name}
              onChange={e => renameLayer(l.id, e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") e.target.blur(); }}
              title="Layer name"
            />
            <span className="map-layer-count">{l.shapes.length} {l.shapes.length === 1 ? "shape" : "shapes"}</span>
            <button type="button" className={`btn btn-small ${l.visible ? "btn-ghost" : "btn-accent"}`} onClick={() => toggleLayerVisible(l.id)} title={l.visible ? "Hide this layer (it stays out of the export too)" : "Show this layer"}>{l.visible ? "Hide" : "Hidden"}</button>
            <button type="button" className={`btn btn-small ${l.locked ? "btn-accent" : "btn-ghost"}`} onClick={() => toggleLayerLocked(l.id)} title={l.locked ? "Unlock this layer" : "Lock this layer (nothing on it can be selected or drawn)"}>{l.locked ? "Locked" : "Lock"}</button>
            <button type="button" className="btn btn-small btn-ghost" disabled={idx === layers.length - 1} onClick={() => moveLayer(l.id, 1)} title="Move up the stack">↑</button>
            <button type="button" className="btn btn-small btn-ghost" disabled={idx === 0} onClick={() => moveLayer(l.id, -1)} title="Move down the stack">↓</button>
            <button type="button" className="btn btn-small btn-danger" disabled={layers.length === 1} onClick={() => deleteLayer(l.id)} title={layers.length === 1 ? "The last layer stays" : "Delete this layer"}>×</button>
          </div>
        );
      })}
    </div>
  );
}
"""

# JSX text takes characters, not escapes; the source carries the characters.
for _esc in ("\\u25c9", "\\u25cb", "\\u2191", "\\u2193", "\\u00d7"):
    LAYER_PANEL = LAYER_PANEL.replace(_esc, _esc.encode().decode("unicode_escape"))

edit(MOD / "16_trunk.jsx", [
    # ---- the section comment and the tool list
    ("""// Coordinates convert the way pins do: a fraction of the svg's rect times the
// viewBox, so a pin and a vertex placed at the same cursor agree.

const MAP_TOOLS = [""",
     """// Coordinates convert the way pins do: a fraction of the svg's rect times the
// viewBox, so a pin and a vertex placed at the same cursor agree. Since r034
// every write goes through the editor's history (useMapHistory), one step
// per completed gesture, and shapes go to an explicit active layer.

const MAP_TOOLS = ["""),
    ("""  { id: "stroke",  label: "Line",    hint: "Click to place the points of an open line · Double-click, Enter, or right-click finishes it · Esc discards" },
];""",
     """  { id: "stroke",  label: "Line",    hint: "Click to place the points of an open line · Double-click, Enter, or right-click finishes it · Esc discards" },
  { id: "text",    label: "Text",    hint: "Click on the map to place a label · Edit it, its size, and its angle in the strip · Right-click when done" },
];"""),

    # ---- the hook: history-aware writes, active layer, layer ops, text
    ("""// All of the tool interaction, as a hook so MapEditor's render stays readable.
// Takes the normalized mapData and the editor's onChange, the svg ref (the
// canvas, for coordinates and hit tests), the canvas div ref (focused on
// mousedown so the browser's own keyboard scrolling stays on the canvas), and
// the canvas size the tree rendered at.
function useMapDrawing({ data, onChange, svgRef, canvasRef, width, height }) {""",
     """// All of the tool interaction, as a hook so MapEditor's render stays readable.
// Takes the normalized mapData and the editor's commit (useMapHistory's, which
// takes an options object after the record), the svg ref (the canvas, for
// coordinates and hit tests), the canvas div ref (focused on mousedown so the
// browser's own keyboard scrolling stays on the canvas), and the canvas size
// the tree rendered at.
function useMapDrawing({ data, onChange, svgRef, canvasRef, width, height }) {"""),
    ("""  const [selBox, setSelBox] = useState(null);   // selection box in viewBox units, measured from the DOM

  const drawing = data.drawing;
  const layers = drawing.layers;
  const targetLayer = layers.find(l => l.visible && !l.locked) || null;
  const allShapes = layers.flatMap(l => l.shapes);""",
     """  const [selBox, setSelBox] = useState(null);   // selection box in viewBox units, measured from the DOM
  const [activeLayerId, setActiveLayerId] = useState(null); // explicit; falls back to the first visible unlocked layer
  const [focusTextId, setFocusTextId] = useState(null); // a label just placed: the strip's field takes focus once, then forgets

  const drawing = data.drawing;
  const layers = drawing.layers;
  // The active layer is the one picked in the panel (or the strip's Layer
  // select); until one is picked, or if it was deleted, the first visible
  // unlocked layer. A hidden or locked active layer refuses drawing, and the
  // hint says which, rather than quietly drawing somewhere else.
  const activeLayer = layers.find(l => l.id === activeLayerId) || layers.find(l => l.visible && !l.locked) || layers[0] || null;
  const targetLayer = activeLayer && activeLayer.visible && !activeLayer.locked ? activeLayer : null;
  const allShapes = layers.flatMap(l => l.shapes);"""),
    ("""  const setLayers = (next) => onChange({ ...data, drawing: { ...drawing, layers: next } });
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
  };""",
     """  // Every write: one new mapData through the history. opts.coalesce names a
  // gesture so its many commits are one undo step.
  const setLayers = (next, opts) => onChange({ ...data, drawing: { ...drawing, layers: next } }, opts);
  const addShape = (raw) => {
    if (!targetLayer) return null;
    const shape = ensureMapShape({ id: `shape-${genId().slice(-6)}`, ...raw });
    if (!shape) return null;
    setLayers(layers.map(l => l.id === targetLayer.id ? { ...l, shapes: [...l.shapes, shape] } : l));
    return shape.id;
  };
  const updateShape = (id, patch, opts) => {
    setLayers(layers.map(l => ({ ...l, shapes: l.shapes.map(s => s.id === id ? (ensureMapShape({ ...s, ...patch }) || s) : s) })), opts);
  };
  const deleteShape = (id) => {
    setLayers(layers.map(l => ({ ...l, shapes: l.shapes.filter(s => s.id !== id) })));
    if (selectedShapeId === id) setSelectedShapeId(null);
  };

  // Layer operations. Layers draw in array order, so "up" is toward the end.
  const addLayer = () => {
    const layer = makeDefaultMapLayer(`Layer ${layers.length + 1}`);
    setLayers([...layers, layer]);
    setActiveLayerId(layer.id);
  };
  const renameLayer = (id, name) => setLayers(layers.map(l => l.id === id ? { ...l, name } : l), { coalesce: `rename-${id}` });
  const toggleLayerVisible = (id) => {
    setLayers(layers.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
    if (selectedShape && layers.some(l => l.id === id && l.visible && l.shapes.some(s => s.id === selectedShape.id))) setSelectedShapeId(null);
  };
  const toggleLayerLocked = (id) => {
    setLayers(layers.map(l => l.id === id ? { ...l, locked: !l.locked } : l));
    if (selectedShape && layers.some(l => l.id === id && !l.locked && l.shapes.some(s => s.id === selectedShape.id))) setSelectedShapeId(null);
  };
  const moveLayer = (id, dir) => {
    const i = layers.findIndex(l => l.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= layers.length) return;
    const next = layers.slice();
    const [l] = next.splice(i, 1);
    next.splice(j, 0, l);
    setLayers(next);
  };
  const deleteLayer = (id) => {
    if (layers.length <= 1) return;
    const l = layers.find(x => x.id === id);
    if (!l) return;
    if (l.shapes.length > 0 && !confirm(`Delete layer "${l.name}" and its ${l.shapes.length} ${l.shapes.length === 1 ? "shape" : "shapes"}? Undo brings it back.`)) return;
    setLayers(layers.filter(x => x.id !== id));
    if (selectedShape && l.shapes.some(s => s.id === selectedShape.id)) setSelectedShapeId(null);
  };
  const moveShapeToLayer = (shapeId, layerId) => {
    const from = layers.find(l => l.shapes.some(s => s.id === shapeId));
    const shape = from ? from.shapes.find(s => s.id === shapeId) : null;
    if (!shape || !layers.some(l => l.id === layerId) || from.id === layerId) return;
    setLayers(layers.map(l => {
      if (l.id === from.id) return { ...l, shapes: l.shapes.filter(s => s.id !== shapeId) };
      if (l.id === layerId) return { ...l, shapes: [...l.shapes, shape] };
      return l;
    }));
    const to = layers.find(l => l.id === layerId);
    if (selectedShapeId === shapeId && to && (!to.visible || to.locked)) setSelectedShapeId(null);
  };"""),
    ("""  const applyStyle = (patch) => {
    setStyle(st => ({ ...st, ...patch }));
    if (selectedShape) updateShape(selectedShape.id, patch);
  };""",
     """  const applyStyle = (patch) => {
    setStyle(st => ({ ...st, ...patch }));
    if (selectedShape) updateShape(selectedShape.id, patch);
  };
  // Text content, size, and angle edit the selected shape only, never the
  // defaults; typing coalesces into one undo step per field.
  const editSelected = (patch, coalesceKey) => {
    if (!selectedShape) return;
    updateShape(selectedShape.id, patch, coalesceKey ? { coalesce: `${coalesceKey}-${selectedShape.id}` } : undefined);
  };"""),
    ("""      e.preventDefault();
      setSelectedShapeId(shape.id);
      setMoving({ id: shape.id, startX: p[0], startY: p[1], origin: shape });
    }
  };""",
     """      e.preventDefault();
      setSelectedShapeId(shape.id);
      setMoving({ id: shape.id, startX: p[0], startY: p[1], origin: shape, seq: Date.now() });
    }
  };"""),
    ("""        setVertexDrag({ id: selectedShape.id, index: parseInt(vertex.getAttribute("data-vertex"), 10) });""",
     """        setVertexDrag({ id: selectedShape.id, index: parseInt(vertex.getAttribute("data-vertex"), 10), seq: Date.now() });"""),
    ("""    const id = finishDraft();
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
    if (!draft) { setDraft({ type: tool, points: [p] }); setCursor(p); return; }""",
     """    const id = finishDraft();
    setToolState("select");
    setMoving(null);
    setVertexDrag(null);
    setSelectedShapeId(id || (tool === "text" ? selectedShapeId : null));
  };
  const onSvgClick = (e) => {
    if (tool === "text") {
      // A label at the click, in ink, selected so the strip's field takes it.
      if (!targetLayer) return;
      const p = toPoint(e);
      if (!p) return;
      const id = addShape({ type: "text", x: p[0], y: p[1], text: "Label", fontSize: style.fontSize || 36, rotation: 0, fill: MAP_PALETTE[0].hex, stroke: null, strokeWidth: style.strokeWidth });
      if (id) { setSelectedShapeId(id); setFocusTextId(id); }
      return;
    }
    if (tool !== "polygon" && tool !== "stroke") return;
    if (!targetLayer) return;
    const p = toPoint(e);
    if (!p) return;
    if (!draft) { setDraft({ type: tool, points: [p] }); setCursor(p); return; }"""),
    ("""      if ((e.key === "Delete" || e.key === "Backspace") && selectedShape && tool === "select") {
        e.preventDefault();
        deleteShape(selectedShape.id);
      }""",
     """      if ((e.key === "Delete" || e.key === "Backspace") && selectedShape && (tool === "select" || tool === "text")) {
        e.preventDefault();
        deleteShape(selectedShape.id);
      }"""),
    ("""      const dx = p[0] - moving.startX, dy = p[1] - moving.startY;
      setLayers(layers.map(l => ({ ...l, shapes: l.shapes.map(s => s.id === moving.id ? translateMapShape(moving.origin, dx, dy) : s) })));
    };""",
     """      const dx = p[0] - moving.startX, dy = p[1] - moving.startY;
      setLayers(layers.map(l => ({ ...l, shapes: l.shapes.map(s => s.id === moving.id ? translateMapShape(moving.origin, dx, dy) : s) })), { coalesce: `move-${moving.id}-${moving.seq}` });
    };"""),
    ("""      setLayers(layers.map(l => ({ ...l, shapes: l.shapes.map(s => (s.id === vertexDrag.id && Array.isArray(s.points))
        ? { ...s, points: s.points.map((q, i) => (i === vertexDrag.index ? p : q)) }
        : s) })));
    };""",
     """      setLayers(layers.map(l => ({ ...l, shapes: l.shapes.map(s => (s.id === vertexDrag.id && Array.isArray(s.points))
        ? { ...s, points: s.points.map((q, i) => (i === vertexDrag.index ? p : q)) }
        : s) })), { coalesce: `vertex-${vertexDrag.id}-${vertexDrag.index}-${vertexDrag.seq}` });
    };"""),
    ("""  const toolDef = MAP_TOOLS.find(t => t.id === tool) || MAP_TOOLS[0];
  const hint = (tool !== "pin" && !targetLayer) ? "No visible, unlocked layer to draw on" : toolDef.hint;

  return {
    tool, setTool, hint, current, applyStyle,
    selectedShape, deleteSelected: () => { if (selectedShape) deleteShape(selectedShape.id); },
    draft, cursor, selBox, style, selectable,
    onSvgMouseDown, onSvgClick, onSvgDoubleClick, onSvgMouseMove, onSvgContextMenu,
  };
}""",
     """  const toolDef = MAP_TOOLS.find(t => t.id === tool) || MAP_TOOLS[0];
  let hint = toolDef.hint;
  if (tool !== "pin" && !targetLayer) {
    hint = activeLayer
      ? `The active layer "${activeLayer.name}" is ${activeLayer.visible ? "locked" : "hidden"}; pick another in Layers, or ${activeLayer.visible ? "unlock" : "show"} it`
      : "No layer to draw on; add one in Layers";
  }

  return {
    tool, setTool, hint, current, applyStyle, editSelected,
    selectedShape, deleteSelected: () => { if (selectedShape) deleteShape(selectedShape.id); },
    draft, cursor, selBox, style, selectable,
    layers, activeLayerId: activeLayer ? activeLayer.id : null, setActiveLayerId,
    focusTextId, consumeFocusText: () => setFocusTextId(null),
    addLayer, renameLayer, toggleLayerVisible, toggleLayerLocked, moveLayer, deleteLayer, moveShapeToLayer,
    onSvgMouseDown, onSvgClick, onSvgDoubleClick, onSvgMouseMove, onSvgContextMenu,
  };
}""" + HISTORY),

    # ---- the strip: undo/redo, layers, text controls, shape layer
    ("""// The strip under the editor toolbar: tools, the size presets on an image-less
// map, and (for the drawing tools, or while a shape is selected) the fill and
// stroke swatches, the width, Smooth, and Delete.
function MapToolStrip({ drawing, showPresets, presetValue, onPreset }) {
  const { tool, setTool, current, applyStyle, selectedShape, deleteSelected } = drawing;
  const kind = selectedShape ? selectedShape.type : tool;
  const showStyle = tool !== "pin" && (tool !== "select" || !!selectedShape);
  const showFill = kind !== "stroke";
  const showSmooth = kind === "rect" || kind === "polygon" || kind === "stroke";""",
     """// The strip under the editor toolbar: tools, the size presets on an image-less
// map, Undo and Redo, the Layers toggle and the active layer, and (for the
// drawing tools, or while a shape is selected) the fill and stroke swatches,
// the width, Smooth, the text controls for a label, the shape's layer, and
// Delete.
function MapToolStrip({ drawing, history, showPresets, presetValue, onPreset, layersOpen, onToggleLayers }) {
  const { tool, setTool, current, applyStyle, editSelected, selectedShape, deleteSelected, layers, activeLayerId, setActiveLayerId, moveShapeToLayer, focusTextId, consumeFocusText } = drawing;
  const kind = selectedShape ? selectedShape.type : tool;
  // The text field takes focus once, for the label that was just placed, so
  // typing replaces "Label". Not on any other mount: a label reselected or
  // brought back by undo would otherwise steal the next keyboard shortcut.
  const textRef = useRef(null);
  useEffect(() => {
    if (focusTextId && selectedShape && selectedShape.id === focusTextId && textRef.current) {
      textRef.current.focus();
      textRef.current.select();
      consumeFocusText();
    }
  }, [focusTextId, selectedShape]);
  const showStyle = tool !== "pin" && (tool !== "select" || !!selectedShape);
  const showFill = kind !== "stroke";
  const showSmooth = kind === "rect" || kind === "polygon" || kind === "stroke";
  const isText = !!selectedShape && selectedShape.type === "text";
  const shapeLayer = selectedShape ? layers.find(l => l.shapes.some(s => s.id === selectedShape.id)) : null;"""),
    ("""              {presetValue === "custom" && <option value="custom">Current size</option>}
            </select>
          </>
        )}
      </div>
      {showStyle && (
        <div className="map-tools-row">""",
     """              {presetValue === "custom" && <option value="custom">Current size</option>}
            </select>
          </>
        )}
        <span className="map-tools-sep" />
        <button type="button" className="btn btn-small btn-ghost" disabled={!history.canUndo} onClick={history.undo} title="Undo (Ctrl+Z)">Undo</button>
        <button type="button" className="btn btn-small btn-ghost" disabled={!history.canRedo} onClick={history.redo} title="Redo (Ctrl+Shift+Z or Ctrl+Y)">Redo</button>
        <span className="map-tools-sep" />
        <button type="button" className={`btn btn-small ${layersOpen ? "btn-accent" : "btn-ghost"}`} onClick={onToggleLayers} title="Show or hide the layer list">Layers</button>
        <span className="map-tools-label">Layer</span>
        <select className="input map-tools-select" value={activeLayerId || ""} onChange={e => setActiveLayerId(e.target.value)} title="The layer new shapes go to">
          {layers.map(l => <option key={l.id} value={l.id}>{l.name}{l.visible ? "" : " (hidden)"}{l.locked ? " (locked)" : ""}</option>)}
        </select>
      </div>
      {showStyle && (
        <div className="map-tools-row">"""),
    ("""          {selectedShape && <button type="button" className="btn btn-small btn-danger" onClick={deleteSelected}>Delete shape</button>}
        </div>
      )}
    </div>
  );
}""",
     """          {isText && (
            <>
              <span className="map-tools-label">Text</span>
              <input
                ref={textRef}
                className="input map-tools-text"
                value={selectedShape.text}
                onChange={e => editSelected({ text: e.target.value }, "text")}
                onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") e.target.blur(); }}
                placeholder="Label"
              />
              <span className="map-tools-label">Size</span>
              {MAP_TEXT_SIZES.map(sz => (
                <button key={sz} type="button" className={`btn btn-small ${selectedShape.fontSize === sz ? "btn-accent" : "btn-ghost"}`} onClick={() => editSelected({ fontSize: sz })}>{sz}</button>
              ))}
              <span className="map-tools-label">Angle</span>
              <button type="button" className="btn btn-small btn-ghost" onClick={() => editSelected({ rotation: Math.round(((selectedShape.rotation || 0) - 15) * 100) / 100 })} title="Rotate 15 degrees counter-clockwise">−15</button>
              <input
                className="input map-tools-num"
                type="number"
                step="1"
                value={Math.round((selectedShape.rotation || 0) * 100) / 100}
                onChange={e => { const v = parseFloat(e.target.value); if (Number.isFinite(v)) editSelected({ rotation: v }, "rotation"); }}
                title="Angle in degrees"
              />
              <button type="button" className="btn btn-small btn-ghost" onClick={() => editSelected({ rotation: Math.round(((selectedShape.rotation || 0) + 15) * 100) / 100 })} title="Rotate 15 degrees clockwise">+15</button>
            </>
          )}
          {selectedShape && layers.length > 1 && (
            <>
              <span className="map-tools-label">Layer</span>
              <select className="input map-tools-select" value={shapeLayer ? shapeLayer.id : ""} onChange={e => moveShapeToLayer(selectedShape.id, e.target.value)} title="Move this shape to another layer">
                {layers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </>
          )}
          {selectedShape && <button type="button" className="btn btn-small btn-danger" onClick={deleteSelected}>Delete shape</button>}
        </div>
      )}
    </div>
  );
}""" + LAYER_PANEL),

    # ---- MapEditor: the history, the panel, every write through commit
    ("""  const drawing = useMapDrawing({ data, onChange, svgRef: imgRef, canvasRef, width: canvasTree.width, height: canvasTree.height });""",
     """  // Every write to the record goes through the history (one step per gesture;
  // pins included, by decision at session 19). The hook writes through it too.
  const history = useMapHistory(data, onChange);
  const commit = history.commit;
  const [layersOpen, setLayersOpen] = useState(false);
  const drawing = useMapDrawing({ data, onChange: commit, svgRef: imgRef, canvasRef, width: canvasTree.width, height: canvasTree.height });"""),
    ("""    if (hasWork && !confirm(`Change the canvas to ${p.label}? Shapes keep their coordinates and anything beyond the new edges is cut off; pins keep their relative positions and will shift against the drawing. There is no undo yet.`)) return;
    onChange({ ...data, drawing: { ...data.drawing, width: p.width, height: p.height } });
  };""",
     """    if (hasWork && !confirm(`Change the canvas to ${p.label}? Shapes keep their coordinates and anything beyond the new edges is cut off; pins keep their relative positions and will shift against the drawing. Undo restores it.`)) return;
    commit({ ...data, drawing: { ...data.drawing, width: p.width, height: p.height } });
  };"""),
    ("""    if (d.width === imageSize.width && d.height === imageSize.height) return;
    onChange({ ...data, drawing: { ...d, width: imageSize.width, height: imageSize.height } });
  }, [data, imageSize, onChange]);""",
     """    if (d.width === imageSize.width && d.height === imageSize.height) return;
    commit({ ...data, drawing: { ...d, width: imageSize.width, height: imageSize.height } }, { silent: true });
  }, [data, imageSize, onChange]);"""),
    ("""            await writable.close();
            onChange({ ...data, image: filename });
            return;""",
     """            await writable.close();
            commit({ ...data, image: filename });
            return;"""),
    ("""        const dataUrl = await fileToDataUrl(file);
        onChange({ ...data, image: dataUrl });""",
     """        const dataUrl = await fileToDataUrl(file);
        commit({ ...data, image: dataUrl });"""),
    ("""    if (!confirm("Remove the map image? The drawing and the pins stay on the canvas.")) return;
    onChange({ ...data, image: null });
  };""",
     """    if (!confirm("Remove the map image? The drawing and the pins stay on the canvas.")) return;
    commit({ ...data, image: null });
  };"""),
    ("""    onChange({ ...data, pins: [...pins, newPin] });
    setSelectedPinId(newPin.id);
  };

  const handlePinMouseDown = (e, pinId) => {
    e.stopPropagation();
    setDraggingPinId(pinId);
    setDragMoved(false);
  };""",
     """    commit({ ...data, pins: [...pins, newPin] });
    setSelectedPinId(newPin.id);
  };

  const pinDragSeq = useRef(0);
  const handlePinMouseDown = (e, pinId) => {
    e.stopPropagation();
    pinDragSeq.current += 1;
    setDraggingPinId(pinId);
    setDragMoved(false);
  };"""),
    ("""      onChange({ ...data, pins: pins.map(p => p.id === draggingPinId ? { ...p, x, y } : p) });
    };
    const handleUp = () => {""",
     """      commit({ ...data, pins: pins.map(p => p.id === draggingPinId ? { ...p, x, y } : p) }, { coalesce: `pin-drag-${draggingPinId}-${pinDragSeq.current}` });
    };
    const handleUp = () => {"""),
    ("""  const updatePin = (pinId, patch) => {
    onChange({ ...data, pins: pins.map(p => p.id === pinId ? { ...p, ...patch } : p) });
  };
  const deletePin = (pinId) => {
    onChange({ ...data, pins: pins.filter(p => p.id !== pinId) });
    setSelectedPinId(null);
  };""",
     """  // Pin field edits coalesce per field, so a label typed in one go is one
  // undo step; a different field, or a drag in between, starts a new one.
  const updatePin = (pinId, patch) => {
    const field = Object.keys(patch)[0] || "field";
    commit({ ...data, pins: pins.map(p => p.id === pinId ? { ...p, ...patch } : p) }, { coalesce: `pin-${pinId}-${field}` });
  };
  const deletePin = (pinId) => {
    commit({ ...data, pins: pins.filter(p => p.id !== pinId) });
    setSelectedPinId(null);
  };"""),
    ("""      <MapToolStrip drawing={drawing} showPresets={showPresets} presetValue={presetValue} onPreset={applyPreset} />
""",
     """      <MapToolStrip drawing={drawing} history={history} showPresets={showPresets} presetValue={presetValue} onPreset={applyPreset} layersOpen={layersOpen} onToggleLayers={() => setLayersOpen(o => !o)} />
      {layersOpen && <MapLayerPanel drawing={drawing} />}
"""),
])

edit(SHELL, [
    (""".map-canvas.tool-select .map-overlay [data-vertex]{cursor:crosshair}
""",
     """.map-canvas.tool-select .map-overlay [data-vertex]{cursor:crosshair}
.map-canvas.tool-text{cursor:text}
.map-tools-text{width:180px;padding:3px 8px;font-size:calc(12px * var(--font-scale))}
.map-tools-num{width:64px;padding:3px 6px;font-size:calc(12px * var(--font-scale));text-align:center}
.map-layers{
  display:flex;flex-direction:column;gap:4px;padding:8px 10px;
  background:var(--surf2);border:1px solid var(--border);border-top:1px dashed var(--border);border-bottom:none;
}
.map-layers-head{display:flex;align-items:center;gap:8px;margin-bottom:2px}
.map-layers-note{font-size:calc(11px * var(--font-scale));color:var(--text-dim);font-style:italic}
.map-layer-row{display:flex;align-items:center;gap:6px;padding:3px 4px;border-radius:3px}
.map-layer-row.active{background:var(--surf3)}
.map-layer-row.hidden-layer .map-layer-name{color:var(--text-dim);font-style:italic}
.map-layer-pick{
  width:22px;height:22px;padding:0;border:none;background:transparent;cursor:pointer;
  color:var(--text-dim);font-size:calc(14px * var(--font-scale));line-height:1;
}
.map-layer-pick.active{color:var(--accent)}
.map-layer-name{width:180px;padding:3px 8px;font-size:calc(12px * var(--font-scale))}
.map-layer-count{font-size:calc(11px * var(--font-scale));color:var(--text-dim);min-width:60px}
"""),
])

print("r034 applied")
