"""r046: editor polish (Cartographia+ cut 16 of the amendment, usability items
3 through 7, the pen's eraser end, Cancel and the folder, and the strip's
arrangement).

The strip is built from named groups in rows: the tools; the canvas size,
Undo and Redo, Layers, and Arrange; then Fill, Stroke, Width, and Smooth,
always present and dimmed when the tool or the selection has no use for
them, so nothing moves under the mouse; then the tool's own group (Done and
Cancel with the point count while a polygon or line draft is open, the
stamp picks, the tip and size and opacity, the text controls, the angle,
the shape's layer, Delete). The rows, the order of the groups, and the
order of the tool buttons are a layout the person can edit in an Arrange
modal, kept in the app's preferences and normalized on every read.

The stamp picker gains a filter (names and pack names, focused on open,
with a count) and an Import button; the Stamps panel's import flow (the
file dialog, the reading state, the report modal, the apply) is lifted into
MapStampImportButton, which both use; the world-stamps setter reaches the
editor from 12_trunk. One letter per tool (V N R E P L F G T S B X H), the
arrows nudging the selected shape by a unit (ten with Shift) as one undo
step per run, never in a field or with a modifier. Every swatch carries an
aria-label and aria-pressed; a visually hidden live region names the tool
when it changes and the selection when it changes. A pen's eraser end
(pointerdown with button 5) starts an Eraser stroke with the Eraser's own
settings whatever drawing tool is active; the tool and the strip stay.
Cancel on the map editor puts the folder back to what it held when the
draft opened: 12_trunk calls the editor's restoreOriginals, which rewrites
every file the session overwrote and removes every file it created.

Decided (Drak, 2026-10-22): fixed slots as three rows with the layout
editable (groups, rows, tool order, in a modal); Done in the tool group;
the filter on names and pack names; the import flow as a component; the
letter set V N R E P L F G T S B X H; one step per nudge run; the live
region naming the tool and the selection; the eraser end as a stroke with
the tool unchanged; Cancel restoring the folder.

Declared scope: 16_trunk (+MAP_STRIP_GROUPS, +MAP_STRIP_DEFAULT,
+mapStripLayout, +MapStripArrangeModal, +MapStampImportButton,
+mapDescribeShape), 12_trunk (the preference, the setter, the Cancel
hook), shell.html (the groups, the dimmed state, the hidden span, the
filter, the Arrange modal).

String-anchored edits; every anchor must occur exactly once. Run from the
repository root against the r045 tree: python3 inlining/cuts/r046_editor_polish.py
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


def replace_span(path, start, end, new):
    s = path.read_text(encoding="utf-8")
    assert s.count(start) == 1, f"{path.name}: start anchor occurs {s.count(start)} times: {start[:60]!r}"
    assert s.count(end) == 1, f"{path.name}: end anchor occurs {s.count(end)} times: {end[:60]!r}"
    a = s.index(start)
    b = s.index(end) + len(end)
    assert a < b
    path.write_text(s[:a] + new + s[b:], encoding="utf-8")


TRUNK = MOD / "16_trunk.jsx"
TRUNK12 = MOD / "12_trunk.jsx"

# ─── 1. the tools carry their keys ───────────────────────────────────────────

edit(TRUNK, [
    ('''const MAP_TOOLS = [
  { id: "pin",     label: "Pin",     hint: "Click on map to add pin · Click pin to edit · Drag pin to move" },
  { id: "select",  label: "Select",  hint: "Click a shape to select it · Drag to move · Drag a point or a corner to reshape · Drag the knob above to turn (Shift snaps) · Delete removes it · Right-click returns to Pin" },
  { id: "rect",    label: "Rect",    hint: "Drag on the map to draw a rectangle · Right-click when done" },
  { id: "ellipse", label: "Ellipse", hint: "Drag on the map to draw an ellipse · Right-click when done" },
  { id: "polygon", label: "Polygon", hint: "Click to place the corners of a closed, filled area · First corner, double-click, Enter, or right-click closes it · Esc discards" },
  { id: "stroke",  label: "Line",    hint: "Click to place the points of an open line · Double-click, Enter, or right-click finishes it · Esc discards" },
  { id: "freehand", label: "Freehand", hint: "Drag on the map to draw a line freehand · Esc while dragging discards it · Right-click when done" },
  { id: "fill",    label: "Fill",    hint: "Click inside an area to fill it with the Fill color · The fill goes under the lines around it, and small gaps in them close · Right-click when done" },
  { id: "text",    label: "Text",    hint: "Click on the map to place a label · Edit it, its size, its angle, and its arc in the strip · Right-click when done" },
  { id: "stamp",   label: "Stamp",   hint: "Pick a stamp in the strip, then click to place it or drag to size it · Right-click when done" },
  { id: "brush",   label: "Brush",   hint: "Drag on the map to paint on the active raster layer (with a vector layer active, the stroke lands in a new raster layer named Paint above it) · Tip, size, opacity, and the Fill color are in the strip · Right-click when done" },
  { id: "eraser",  label: "Eraser",  hint: "Drag on the map to erase from the active raster layer · Tip, size, and opacity are in the strip · Right-click when done" },
  { id: "pan",     label: "Pan",     hint: "Drag to move the view · Ctrl+wheel, a pinch, the corner buttons, or + and - zoom; 0 fits · From any tool, hold Space or drag with the middle button · Right-click when done" },
];''',
     '''// Each tool has a key (r046): one letter, pressed with no modifier and no
// field focused, picks it.
const MAP_TOOLS = [
  { id: "pin",     label: "Pin",     key: "n", hint: "Click on map to add pin · Click pin to edit · Drag pin to move" },
  { id: "select",  label: "Select",  key: "v", hint: "Click a shape to select it · Drag to move · Corners and points reshape it, the knob turns it · Arrows nudge it · Delete removes it · Right-click returns to Pin" },
  { id: "rect",    label: "Rect",    key: "r", hint: "Drag on the map to draw a rectangle · Right-click when done" },
  { id: "ellipse", label: "Ellipse", key: "e", hint: "Drag on the map to draw an ellipse · Right-click when done" },
  { id: "polygon", label: "Polygon", key: "p", hint: "Click to place the corners of a closed, filled area · Done in the strip, the first corner, a double-click, Enter, or right-click closes it · Esc discards" },
  { id: "stroke",  label: "Line",    key: "l", hint: "Click to place the points of an open line · Done in the strip, a double-click, Enter, or right-click finishes it · Esc discards" },
  { id: "freehand", label: "Freehand", key: "f", hint: "Drag on the map to draw a line freehand · Esc while dragging discards it · Right-click when done" },
  { id: "fill",    label: "Fill",    key: "g", hint: "Click inside an area to fill it with the Fill color · The fill goes under the lines around it, and small gaps in them close · Right-click when done" },
  { id: "text",    label: "Text",    key: "t", hint: "Click on the map to place a label · Edit it, its size, its angle, and its arc in the strip · Right-click when done" },
  { id: "stamp",   label: "Stamp",   key: "s", hint: "Pick a stamp in the strip, then click to place it or drag to size it · Right-click when done" },
  { id: "brush",   label: "Brush",   key: "b", hint: "Drag on the map to paint on the active raster layer (a vector layer active gets a Paint layer above it) · Tip, size, opacity, and Fill in the strip · Right-click when done" },
  { id: "eraser",  label: "Eraser",  key: "x", hint: "Drag on the map to erase from the active raster layer · Tip, size, and opacity are in the strip · A pen's eraser end erases from any drawing tool · Right-click when done" },
  { id: "pan",     label: "Pan",     key: "h", hint: "Drag to move the view · Ctrl+wheel, a pinch, the corner buttons, or + and - zoom; 0 fits · Space or the middle button pans from any tool · Right-click when done" },
];

// The strip's layout (r046): the groups it is built from, in rows, and the
// order of the tool buttons. The default is what the editor ships with; a
// person's own, kept in the app's preferences through the Arrange modal, is
// normalized on every read so each group and each tool appears exactly once
// whatever was stored, and anything unknown is dropped.
const MAP_STRIP_GROUPS = [
  { id: "tools",   label: "Tools" },
  { id: "canvas",  label: "Canvas size (image-less maps)" },
  { id: "history", label: "Undo and Redo" },
  { id: "layers",  label: "Layers and the active layer" },
  { id: "arrange", label: "Arrange" },
  { id: "fill",    label: "Fill swatches" },
  { id: "stroke",  label: "Stroke swatches" },
  { id: "width",   label: "Width" },
  { id: "smooth",  label: "Smooth" },
  { id: "tool",    label: "The tool's own controls" },
];
const MAP_STRIP_DEFAULT = {
  rows: [["tools"], ["canvas", "history", "layers", "arrange"], ["fill", "stroke", "width", "smooth", "tool"]],
  tools: MAP_TOOLS.map(t => t.id),
};
function mapStripLayout(raw) {
  const known = MAP_STRIP_GROUPS.map(g => g.id);
  const src = raw && typeof raw === "object" ? raw : {};
  const seen = new Set();
  const rows = (Array.isArray(src.rows) ? src.rows : [])
    .map(r => (Array.isArray(r) ? r : []).filter(g => typeof g === "string" && known.includes(g) && !seen.has(g) && seen.add(g)))
    .filter(r => r.length > 0);
  const missing = known.filter(g => !seen.has(g));
  if (rows.length === 0) MAP_STRIP_DEFAULT.rows.forEach(r => rows.push(r.slice()));
  else if (missing.length) rows[rows.length - 1].push(...missing);
  const ids = MAP_TOOLS.map(t => t.id);
  const tools = (Array.isArray(src.tools) ? src.tools : []).filter((id, i, a) => typeof id === "string" && ids.includes(id) && a.indexOf(id) === i);
  ids.forEach(id => { if (!tools.includes(id)) tools.push(id); });
  return { rows, tools };
}

// The selection, said in words, for the strip's live region.
function mapDescribeShape(s, stamps) {
  if (!s) return "Nothing selected";
  const n = (v) => Math.round(v);
  switch (s.type) {
    case "rect": return `Rectangle, ${n(s.w)} by ${n(s.h)}`;
    case "ellipse": return `Ellipse, ${n(s.w)} by ${n(s.h)}`;
    case "polygon": return `Polygon, ${s.points.length} points`;
    case "stroke": return `Line, ${s.points.length} points`;
    case "region": return "Filled region";
    case "text": return `Label "${s.text}"`;
    case "stamp": { const d = mapStampDef(s.stampId, stamps); return `Stamp ${d ? d.name : s.stampId}`; }
    default: return String(s.type);
  }
}'''),
])

# ─── 2. the tool hook: the keys, the nudge, the eraser end ──────────────────

edit(TRUNK, [
    # pointerdown: the pen's eraser end
    ('''  const onSvgPointerDown = (e) => {
    if (e.button !== 0 || e.isPrimary === false) return;
    if (canvasRef.current && canvasRef.current.focus) canvasRef.current.focus({ preventScroll: true });
    if (tool === "pan") return; // the camera takes the press in the capture phase''',
     '''  const onSvgPointerDown = (e) => {
    if (e.pointerType === "pen" && e.button === 5 && e.isPrimary !== false) {
      // the pen's eraser end (r046): an Eraser stroke whatever the tool; the tool and the strip stay
      e.preventDefault();
      if (canvasRef.current && canvasRef.current.focus) canvasRef.current.focus({ preventScroll: true });
      beginStroke(e, "eraser");
      return;
    }
    if (e.button !== 0 || e.isPrimary === false) return;
    if (canvasRef.current && canvasRef.current.focus) canvasRef.current.focus({ preventScroll: true });
    if (tool === "pan") return; // the camera takes the press in the capture phase'''),
    # beginStroke takes the mode
    ('''  const beginStroke = (e) => {
    if (strokeRef.current) return; // a second finger
    const al = activeLayer;''',
     '''  const beginStroke = (e, forced) => {
    if (strokeRef.current) return; // a second finger
    const mode = forced || tool; // "brush" or "eraser"; the pen's eraser end forces the latter
    const al = activeLayer;'''),
    ('''    if (al.kind !== "raster") {
      if (tool === "eraser") return; // the hint asks for a raster layer''',
     '''    if (al.kind !== "raster") {
      if (mode === "eraser") return; // the hint asks for a raster layer'''),
    ('''    } else if (tool === "eraser" && !layer.image) {
      setFillNote(`Nothing to erase on "${layer.name}"`);
      return;''',
     '''    } else if (mode === "eraser" && !layer.image) {
      setFillNote(`Nothing to erase on "${layer.name}"`);
      return;'''),
    ('''    const settings = paintSettings;
    const tip = mapTipDef(settings.tipId, stamps) || mapBuiltinTips()[0];''',
     '''    const settings = paint[mode === "eraser" ? "eraser" : "brush"];
    const tip = mapTipDef(settings.tipId, stamps) || mapBuiltinTips()[0];'''),
    ('''      seq: ++strokeSeqRef.current, pointerId: e.pointerId, tool, key, newLayer,
      layerId: layer.id, layerName: layer.name, units: { w: layer.width, h: layer.height },
      tip, size: settings.size, opacity: settings.opacity, color: tool === "eraser" ? "#000000" : (style.fill || MAP_PALETTE[0].hex),''',
     '''      seq: ++strokeSeqRef.current, pointerId: e.pointerId, tool: mode, key, newLayer,
      layerId: layer.id, layerName: layer.name, units: { w: layer.width, h: layer.height },
      tip, size: settings.size, opacity: settings.opacity, color: mode === "eraser" ? "#000000" : (style.fill || MAP_PALETTE[0].hex),'''),
    # the keys and the nudge, before the Escape/Enter/Delete effect
    ('''  // Keys are document-wide while a drawing tool is active, because the strip's
  // buttons take focus when clicked and a Delete that only worked with the
  // canvas focused would fail right after picking a swatch. Typing targets are
  // left alone, and Enter on a focused button is the button's.
  useEffect(() => {
    if (tool === "pin") return;''',
     '''  // The keyboard (r046): one letter per tool, and the arrows nudging the
  // selected shape by a unit (ten with Shift) as one undo step per run.
  // Document-wide in every tool, never while a field has focus or a modifier
  // is down (the zoom keys and Space are the camera's, Ctrl+Z the history's).
  useEffect(() => {
    const handler = (e) => {
      const t = e.target;
      const tag = t && t.tagName ? t.tagName.toUpperCase() : "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown") {
        if (!selectedShape || !(tool === "select" || tool === "text" || tool === "stamp")) return;
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        updateShape(selectedShape.id, translateMapShape(selectedShape, dx, dy), { coalesce: `nudge-${selectedShape.id}` });
        return;
      }
      if (e.shiftKey) return;
      const k = typeof e.key === "string" ? e.key.toLowerCase() : "";
      const def = MAP_TOOLS.find(x => x.key === k);
      if (!def || def.id === tool) return;
      e.preventDefault();
      setTool(def.id);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [tool, selectedShape, layers]);
  // Keys are document-wide while a drawing tool is active, because the strip's
  // buttons take focus when clicked and a Delete that only worked with the
  // canvas focused would fail right after picking a swatch. Typing targets are
  // left alone, and Enter on a focused button is the button's.
  useEffect(() => {
    if (tool === "pin") return;'''),
    # the hook returns the draft's finish and cancel for the strip's Done and Cancel
    ('''    draft, cursor, selBox, style, selectable,
    layers, activeLayerId: activeLayer ? activeLayer.id : null, setActiveLayerId,''',
     '''    draft, cursor, selBox, style, selectable, finishDraft, cancelDraft,
    layers, activeLayerId: activeLayer ? activeLayer.id : null, setActiveLayerId,'''),
])

# ─── 3. the strip, rebuilt from groups; the picker with a filter and Import ─

STRIP = r'''// The strip under the editor toolbar (r046): built from named groups in
// rows, the layout a person can edit. The tools; the canvas presets on an
// image-less map, Undo and Redo, the Layers toggle and the active layer,
// Arrange; Fill, Stroke, Width, and Smooth, always in place and dimmed when
// the tool or the selection has no use for them, so nothing moves under the
// mouse; and the tool's own group, which changes with the tool: Done and
// Cancel with the point count while a polygon or line draft is open, the
// stamp picks, the tip and size and opacity, the text controls, the angle,
// the shape's layer, Delete. A visually hidden live region names the tool
// when it changes and the selection when it changes.
function MapToolStrip({ drawing, history, showPresets, presetValue, onPreset, canvasSize, onCustomSize, layersOpen, onToggleLayers, stamps, onStampsChange, layout, onLayout, flash }) {
  const { tool, setTool, current, applyStyle, editSelected, selectedShape, deleteSelected, layers, activeLayerId, setActiveLayerId, moveShapeToLayer, focusTextId, consumeFocusText, draft, finishDraft, cancelDraft } = drawing;
  const worldStamps = Array.isArray(stamps) ? stamps : [];
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tipPickerOpen, setTipPickerOpen] = useState(false);
  const [arrangeOpen, setArrangeOpen] = useState(false);
  const strip = mapStripLayout(layout);
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
  const setCustomSize = () => { if (onCustomSize) onCustomSize(parseFloat(customW), parseFloat(customH)); };
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
  const styleOn = tool !== "pin" && tool !== "pan" && (tool !== "select" || !!selectedShape);
  const fillOn = styleOn && kind !== "stroke" && kind !== "freehand" && kind !== "eraser";
  const strokeOn = styleOn && kind !== "fill" && kind !== "brush" && kind !== "eraser"; // a bucket fill lands with no stroke; give it one in Select
  const widthOn = styleOn && kind !== "stamp" && kind !== "fill" && kind !== "brush" && kind !== "eraser"; // a stamp's line weight is the symbol's own
  const smoothOn = styleOn && (kind === "rect" || kind === "polygon" || kind === "stroke" || kind === "freehand" || kind === "region");
  const isText = !!selectedShape && selectedShape.type === "text";
  const hasAngle = !!selectedShape && (selectedShape.type === "text" || selectedShape.type === "stamp");
  const draftOpen = !!draft && (draft.type === "polygon" || draft.type === "stroke");
  const { stampId, setStampId, paintSettings, setPaint } = drawing;
  const shapeLayer = selectedShape ? layers.find(l => l.shapes.some(s => s.id === selectedShape.id)) : null;
  const vectorLayers = layers.filter(l => l.kind !== "raster");
  // the live region: the tool when it changes, the selection when it changes; nothing on mount
  const [live, setLive] = useState("");
  const mountedRef = useRef(false);
  useEffect(() => { if (!mountedRef.current) return; const t = MAP_TOOLS.find(x => x.id === tool); setLive(`${t ? t.label : tool} tool`); }, [tool]);
  useEffect(() => { if (!mountedRef.current) { mountedRef.current = true; return; } setLive(mapDescribeShape(selectedShape, worldStamps)); }, [selectedShape ? selectedShape.id : null]);
  const swatches = (which, value, onPick, on) => (
    <span className="map-swatches" role="group" aria-label={which}>
      {MAP_PALETTE.map(c => (
        <button
          key={c.id}
          type="button"
          className={`map-swatch ${value === c.hex ? "active" : ""}`}
          style={{ background: c.hex }}
          title={c.label}
          aria-label={`${which}: ${c.label}`}
          aria-pressed={value === c.hex}
          disabled={!on}
          onClick={() => onPick(c.hex)}
        />
      ))}
      <button type="button" className={`map-swatch map-swatch-none ${value == null ? "active" : ""}`} title="None" aria-label={`${which}: none`} aria-pressed={value == null} disabled={!on} onClick={() => onPick(null)} />
    </span>
  );
  // The tool's own group, in order: the open draft, the brush, the stamp,
  // the label, the angle, the shape's layer, Delete.
  const toolGroup = () => {
    const parts = [];
    if (draftOpen) {
      const need = draft.type === "polygon" ? 3 : 2;
      parts.push(
        <React.Fragment key="draft">
          <span className="map-tools-label">{draft.type === "polygon" ? "Polygon" : "Line"}</span>
          <span className="map-tools-value">{draft.points.length} {draft.points.length === 1 ? "point" : "points"}</span>
          <button type="button" className="btn btn-small btn-accent" disabled={draft.points.length < need} onClick={() => finishDraft()} title={`Finish it (Enter, a double-click, or right-click); it needs ${need} points`}>Done</button>
          <button type="button" className="btn btn-small btn-ghost" onClick={cancelDraft} title="Discard it (Esc)">Cancel</button>
        </React.Fragment>
      );
    }
    if ((tool === "brush" || tool === "eraser") && !selectedShape) {
      // The tip: the built-in two inline, an armed imported tip first,
      // More... for the rest; then the size (the slider to 256, the field to
      // 1024) and the opacity. The Brush's color is the Fill.
      const tips = mapBuiltinTips();
      const alphaStamps = worldStamps.filter(s => s.kind === "alpha");
      const armed = alphaStamps.find(s => s.id === paintSettings.tipId) || null;
      const glyphFill = tool === "eraser" ? MAP_PALETTE[0].hex : current.fill;
      parts.push(
        <React.Fragment key="brush">
          <span className="map-tools-label">Tip</span>
          {armed && (
            <button type="button" className="map-stamp-pick active" title={`${armed.name} (${armed.pack || "imported"})`} onClick={() => setTipPickerOpen(true)}>
              <MapStampGlyph def={armed} fill={glyphFill} stroke={null} size={22} />
            </button>
          )}
          {tips.map(t => (
            <button key={t.id} type="button" className={`map-stamp-pick ${paintSettings.tipId === t.id ? "active" : ""}`} title={t.name} onClick={() => setPaint({ tipId: t.id })}>
              <MapStampGlyph def={t} fill={glyphFill} stroke={null} size={22} />
            </button>
          ))}
          <button type="button" className="btn btn-small btn-ghost" onClick={() => setTipPickerOpen(true)} title="Every tip: the built-in two and the imported alpha stamps; import more there">More{"…"}</button>
          {tipPickerOpen && <MapStampPicker stamps={alphaStamps} importInto={worldStamps} onImport={onStampsChange} flash={flash} builtins={tips} title="Choose a tip" current={paintSettings.tipId} fill={glyphFill} stroke={null} onPick={(id) => { setPaint({ tipId: id }); setTipPickerOpen(false); }} onClose={() => setTipPickerOpen(false)} />}
          <span className="map-tools-label">Size</span>
          <input
            className="map-tools-range"
            type="range"
            min={MAP_PAINT.sizeMin} max={MAP_PAINT.sizeMax} step="1"
            value={Math.min(MAP_PAINT.sizeMax, paintSettings.size)}
            onChange={e => setPaint({ size: parseInt(e.target.value, 10) || MAP_PAINT.sizeMin })}
            title={`${tool === "eraser" ? "Eraser" : "Brush"} size, in drawing units`}
          />
          <input
            className="input map-tools-num"
            type="number"
            min={MAP_PAINT.sizeMin} max={MAP_PAINT.sizeLimit} step="1"
            value={paintSettings.size}
            onChange={e => { const v = parseInt(e.target.value, 10); if (Number.isFinite(v)) setPaint({ size: Math.max(MAP_PAINT.sizeMin, Math.min(MAP_PAINT.sizeLimit, v)) }); }}
            onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") e.target.blur(); }}
            title={`${tool === "eraser" ? "Eraser" : "Brush"} size, ${MAP_PAINT.sizeMin} to ${MAP_PAINT.sizeLimit}`}
          />
          <span className="map-tools-label">Opacity</span>
          <input
            className="map-tools-range"
            type="range"
            min="5" max="100" step="5"
            value={Math.round(paintSettings.opacity * 100)}
            onChange={e => setPaint({ opacity: Math.max(0.05, Math.min(1, (parseInt(e.target.value, 10) || 100) / 100)) })}
            title={tool === "eraser" ? "How much one stroke takes away; strokes over each other add up" : "How strongly one stroke lands; strokes over each other add up"}
          />
          <span className="map-tools-value">{Math.round(paintSettings.opacity * 100)}%</span>
        </React.Fragment>
      );
    }
    if (tool === "stamp" || (selectedShape && selectedShape.type === "stamp")) {
      // Pick arms the stamp for the next placement and swaps the selected
      // stamp's symbol, which is also how a missing stamp is re-pointed.
      const pick = (id) => { setStampId(id); if (selectedShape && selectedShape.type === "stamp") editSelected({ stampId: id }); };
      const armed = worldStamps.find(s => s.id === stampId) || null;
      const missing = selectedShape && selectedShape.type === "stamp" && !mapStampDef(selectedShape.stampId, worldStamps) ? selectedShape.stampId : null;
      parts.push(
        <React.Fragment key="stamp">
          <span className="map-tools-label">Stamp</span>
          {armed && (
            <button type="button" className="map-stamp-pick active" title={`${armed.name} (${armed.pack || "imported"})`} onClick={() => setPickerOpen(true)}>
              <MapStampGlyph def={armed} fill={current.fill} stroke={current.stroke} size={22} />
            </button>
          )}
          {MAP_BUILTIN_STAMPS.map(st => (
            <button
              key={st.id}
              type="button"
              className={`map-stamp-pick ${stampId === st.id ? "active" : ""}`}
              title={st.name}
              onClick={() => pick(st.id)}
            >
              <MapStampGlyph def={st} fill={current.fill} stroke={current.stroke} size={22} />
            </button>
          ))}
          <button type="button" className="btn btn-small btn-ghost" onClick={() => setPickerOpen(true)} title="Every stamp, built in and imported; import more there">More{"…"}</button>
          {missing && <span className="map-tools-missing" title="This stamp's pack is not in the world; pick another symbol or delete the shape">missing: {missing}</span>}
          {pickerOpen && <MapStampPicker stamps={worldStamps} onImport={onStampsChange} flash={flash} current={stampId} fill={current.fill} stroke={current.stroke} onPick={(id) => { pick(id); setPickerOpen(false); }} onClose={() => setPickerOpen(false)} />}
        </React.Fragment>
      );
    }
    if (isText) {
      parts.push(
        <React.Fragment key="text">
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
        </React.Fragment>
      );
    }
    if (hasAngle) {
      parts.push(
        <React.Fragment key="angle">
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
        </React.Fragment>
      );
    }
    if (selectedShape && vectorLayers.length > 1) {
      parts.push(
        <React.Fragment key="layer">
          <span className="map-tools-label">Layer</span>
          <select className="input map-tools-select" value={shapeLayer ? shapeLayer.id : ""} onChange={e => moveShapeToLayer(selectedShape.id, e.target.value)} title="Move this shape to another vector layer">
            {vectorLayers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </React.Fragment>
      );
    }
    if (selectedShape) parts.push(<button key="delete" type="button" className="btn btn-small btn-danger" onClick={deleteSelected} title="Delete the selected shape (Delete)">Delete shape</button>);
    return parts;
  };
  const group = (id) => {
    switch (id) {
      case "tools":
        return strip.tools.map(tid => MAP_TOOLS.find(t => t.id === tid)).filter(Boolean).map(t => (
          <button key={t.id} type="button" className={`btn btn-small ${tool === t.id ? "btn-accent" : "btn-ghost"}`} onClick={() => setTool(t.id)} title={`${t.label} (${t.key.toUpperCase()}) · ${t.hint}`}>{t.label}</button>
        ));
      case "canvas":
        return showPresets ? (
          <>
            <span className="map-tools-label">Canvas</span>
            <select className="input map-tools-select" value={presetValue} onChange={e => onPreset(e.target.value)} title="Canvas size, in drawing units">
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
            )}
          </>
        ) : null;
      case "history":
        return (
          <>
            <button type="button" className="btn btn-small btn-ghost" disabled={!history.canUndo} onClick={history.undo} title="Undo (Ctrl+Z)">Undo</button>
            <button type="button" className="btn btn-small btn-ghost" disabled={!history.canRedo} onClick={history.redo} title="Redo (Ctrl+Shift+Z or Ctrl+Y)">Redo</button>
          </>
        );
      case "layers":
        return (
          <>
            <button type="button" className={`btn btn-small ${layersOpen ? "btn-accent" : "btn-ghost"}`} onClick={onToggleLayers} title="Show or hide the layer list">Layers</button>
            <span className="map-tools-label">Layer</span>
            <select className="input map-tools-select" value={activeLayerId || ""} onChange={e => setActiveLayerId(e.target.value)} title="The layer new shapes go to">
              {layers.map(l => <option key={l.id} value={l.id}>{l.name}{l.kind === "raster" ? " (raster)" : ""}{l.visible ? "" : " (hidden)"}{l.locked ? " (locked)" : ""}</option>)}
            </select>
          </>
        );
      case "arrange":
        return <button type="button" className="btn btn-small btn-ghost" onClick={() => setArrangeOpen(true)} title="Arrange the strip: its rows, the order of its groups, and the order of the tools">Arrange{"…"}</button>;
      case "fill":
        return <><span className="map-tools-label">Fill</span>{swatches("Fill", current.fill, v => applyStyle({ fill: v }), fillOn)}</>;
      case "stroke":
        return <><span className="map-tools-label">Stroke</span>{swatches("Stroke", current.stroke, v => applyStyle({ stroke: v }), strokeOn)}</>;
      case "width":
        return (
          <>
            <span className="map-tools-label">Width</span>
            <input
              className="map-tools-range"
              type="range"
              min={MAP_STROKE_WIDTH_RANGE.min} max={MAP_STROKE_WIDTH_RANGE.max} step="1"
              value={Math.min(MAP_STROKE_WIDTH_RANGE.max, current.strokeWidth)}
              disabled={!widthOn}
              onChange={e => applyStyle({ strokeWidth: parseInt(e.target.value, 10) || MAP_STROKE_WIDTH_RANGE.min }, "width")}
              title="Line width, in drawing units"
            />
            <input
              className="input map-tools-num"
              type="number"
              min={MAP_STROKE_WIDTH_RANGE.min} max={MAP_STROKE_WIDTH_RANGE.limit} step="1"
              value={current.strokeWidth}
              disabled={!widthOn}
              onChange={e => { const v = parseInt(e.target.value, 10); if (Number.isFinite(v)) applyStyle({ strokeWidth: Math.max(MAP_STROKE_WIDTH_RANGE.min, Math.min(MAP_STROKE_WIDTH_RANGE.limit, v)) }, "width"); }}
              onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") e.target.blur(); }}
              title="Line width, 1 to 64"
            />
          </>
        );
      case "smooth":
        return <button type="button" className={`btn btn-small ${current.smooth && smoothOn ? "btn-accent" : "btn-ghost"}`} disabled={!smoothOn} aria-pressed={!!current.smooth} onClick={() => applyStyle({ smooth: !current.smooth })} title="Round the corners and curve the path through its points">Smooth</button>;
      case "tool":
        return toolGroup();
      default:
        return null;
    }
  };
  const groupOn = { fill: fillOn, stroke: strokeOn, width: widthOn, smooth: smoothOn };
  return (
    <div className="map-tools">
      {strip.rows.map((row, i) => (
        <div key={i} className="map-tools-row">
          {row.map(id => {
            const off = id in groupOn && !groupOn[id];
            return <span key={id} className={`map-tools-group${off ? " off" : ""}`} data-group={id} aria-disabled={off ? "true" : undefined}>{group(id)}</span>;
          })}
        </div>
      ))}
      <span className="sr-only" role="status" aria-live="polite">{live}</span>
      {arrangeOpen && <MapStripArrangeModal layout={strip} onChange={onLayout} onClose={() => setArrangeOpen(false)} />}
    </div>
  );
}

// The Arrange modal (r046): the strip's groups in their rows, each movable
// up or down, a row break before any position but the first (the breaks
// stay where they are when a group moves through them, so the rows keep
// their shape), and the tool buttons in their order. Every change lands in
// the strip behind the modal at once; Reset puts the shipped layout back.
function MapStripArrangeModal({ layout, onChange, onClose }) {
  const strip = mapStripLayout(layout);
  const label = (id) => { const g = MAP_STRIP_GROUPS.find(x => x.id === id); return g ? g.label : id; };
  const items = [];
  const breaks = new Set();
  strip.rows.forEach((row, ri) => row.forEach((id, i) => { if (ri > 0 && i === 0) breaks.add(items.length); items.push(id); }));
  const rowsOf = (list, br) => { const rows = []; list.forEach((id, i) => { if (i === 0 || br.has(i)) rows.push([]); rows[rows.length - 1].push(id); }); return rows; };
  const emit = (list, br, tools) => { if (onChange) onChange({ rows: rowsOf(list, br), tools: tools || strip.tools }); };
  const moveGroup = (i, dir) => { const j = i + dir; if (j < 0 || j >= items.length) return; const next = items.slice(); const [it] = next.splice(i, 1); next.splice(j, 0, it); emit(next, breaks); };
  const toggleBreak = (i) => { if (i === 0) return; const br = new Set(breaks); if (br.has(i)) br.delete(i); else br.add(i); emit(items, br); };
  const moveTool = (i, dir) => { const j = i + dir; if (j < 0 || j >= strip.tools.length) return; const next = strip.tools.slice(); const [t] = next.splice(i, 1); next.splice(j, 0, t); emit(items, breaks, next); };
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  let rowNo = 0;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">Arrange the strip</div>
        <div className="modal-body">
          <div className="map-arrange">
            <div className="map-arrange-col">
              <div className="modal-section-hdr">Groups and rows</div>
              {items.map((id, i) => {
                const start = i === 0 || breaks.has(i);
                if (start) rowNo += 1;
                return (
                  <React.Fragment key={id}>
                    {start && <div className="map-arrange-row">Row {rowNo}</div>}
                    <div className="map-arrange-item">
                      <button type="button" className="btn btn-small btn-ghost" disabled={i === 0} onClick={() => moveGroup(i, -1)} title="Move earlier" aria-label={`Move ${label(id)} earlier`}>▲</button>
                      <button type="button" className="btn btn-small btn-ghost" disabled={i === items.length - 1} onClick={() => moveGroup(i, 1)} title="Move later" aria-label={`Move ${label(id)} later`}>▼</button>
                      <span className="name">{label(id)}</span>
                      {i > 0 && <label className="map-arrange-break" title="Start a new row here"><input type="checkbox" checked={breaks.has(i)} onChange={() => toggleBreak(i)} /> new row</label>}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
            <div className="map-arrange-col">
              <div className="modal-section-hdr">Tools</div>
              {strip.tools.map((id, i) => {
                const t = MAP_TOOLS.find(x => x.id === id);
                return (
                  <div key={id} className="map-arrange-item">
                    <button type="button" className="btn btn-small btn-ghost" disabled={i === 0} onClick={() => moveTool(i, -1)} title="Move earlier" aria-label={`Move ${t ? t.label : id} earlier`}>▲</button>
                    <button type="button" className="btn btn-small btn-ghost" disabled={i === strip.tools.length - 1} onClick={() => moveTool(i, 1)} title="Move later" aria-label={`Move ${t ? t.label : id} later`}>▼</button>
                    <span className="name">{t ? t.label : id}</span>
                    {t && <span className="map-tools-value">{t.key.toUpperCase()}</span>}
                  </div>
                );
              })}
            </div>
          </div>
          <p className="map-stamps-note">The layout is yours, kept in this browser with the theme and the font size; it is not part of the world file.</p>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" style={{ marginRight: "auto" }} onClick={() => { if (onChange) onChange(null); }} title="The layout the editor ships with">Reset</button>
          <button type="button" className="btn btn-accent" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

// The grid the strip's More... button opens: every stamp, built in and
// imported, grouped by pack, with a filter on names and pack names (r046)
// and an Import button when the editor hands it the world's setter; a click
// arms a stamp (and swaps the selected stamp's symbol, as the inline buttons
// do) and closes. Escape clears the filter first, then closes.
function MapStampPicker({ stamps, current, fill, stroke, onPick, onClose, builtins, title, onImport, importInto, flash }) {
  const all = [{ id: "builtin", name: "Built in", stamps: builtins || MAP_BUILTIN_STAMPS }, ...mapStampGroups(stamps)];
  const [q, setQ] = useState("");
  const qRef = useRef("");
  qRef.current = q;
  const inputRef = useRef(null);
  useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") { if (qRef.current) setQ(""); else onClose(); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  const needle = q.trim().toLowerCase();
  const matches = (s, g) => !needle || String(s.name || "").toLowerCase().includes(needle) || String(g.name || "").toLowerCase().includes(needle);
  const groups = all.map(g => ({ ...g, stamps: g.stamps.filter(s => matches(s, g)) })).filter(g => g.stamps.length > 0);
  const total = all.reduce((n, g) => n + g.stamps.length, 0);
  const shown = groups.reduce((n, g) => n + g.stamps.length, 0);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">{title || "Choose a stamp"}</div>
        <div className="modal-body">
          <div className="map-stamp-filter">
            <input ref={inputRef} className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="Filter by name or pack" aria-label="Filter stamps by name or pack" />
            <span className="map-stamps-note map-stamp-count">{needle ? `${shown} of ${total}` : `${total} ${total === 1 ? "stamp" : "stamps"}`}</span>
          </div>
          {groups.length === 0 && <div className="map-stamps-empty">Nothing is named like "{q.trim()}".</div>}
          {groups.map(g => (
            <div key={g.id} className="modal-section">
              <div className="modal-section-hdr">{g.name}</div>
              <div className="map-stamp-grid">
                {g.stamps.map(s => (
                  <button key={s.id} type="button" className={`map-stamp-tile ${current === s.id ? "active" : ""}`} title={s.id} onClick={() => onPick(s.id)}>
                    <MapStampGlyph def={s} fill={fill} stroke={stroke} size={40} />
                    <span className="map-stamp-tile-name">{s.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          {onImport
            ? <MapStampImportButton stamps={importInto || stamps} onChange={onImport} flash={flash} className="btn btn-ghost" style={{ marginRight: "auto" }} label="Import pack or brushes" />
            : <span className="map-stamps-note" style={{ marginRight: "auto" }}>Import packs and brush files from the Stamps panel at the top of Cartographia.</span>}
          <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
'''

replace_span(TRUNK,
             '''// The strip under the editor toolbar: tools, the size presets on an image-less
// map, Undo and Redo, the Layers toggle and the active layer, and (for the
// drawing tools, or while a shape is selected) the fill and stroke swatches,
// the width, Smooth, the text controls for a label, the shape's layer, and
// Delete.
function MapToolStrip({''',
             '''          <span className="map-stamps-note" style={{ marginRight: "auto" }}>Import packs and brush files from the Stamps panel at the top of Cartographia.</span>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
''',
             STRIP)

# ─── 4. the import flow, lifted out of the Stamps panel ─────────────────────

IMPORT_BUTTON = r'''// The import flow (r046, lifted from the Stamps panel so the picker has it
// too): a button that opens the file dialog, reads the files through
// mapReadStampFiles, and either applies the packs quietly or walks the
// report modal, one pack at a time. A read pack becomes stored stamps: the
// pack's id (a slug of its name when the name is editable) namespaces every
// stamp id; a stamp this pack imported before is replaced in place, the
// rest are appended.
function MapStampImportButton({ stamps, onChange, flash, className, label, title, style }) {
  const current = Array.isArray(stamps) ? stamps : [];
  const [pending, setPending] = useState(null); // the packs read from the import, waiting on the report modal: { packs, index }
  const [pendingName, setPendingName] = useState(""); // the editable name of the pack being shown
  const [reading, setReading] = useState(false); // an import being decoded; the button says so
  const say = (text, type) => { if (flash) flash(text, type); };
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const fmtBytes = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
  const listMore = (items, max) => (items.length > max ? [...items.slice(0, max), `and ${items.length - max} more`] : items);
  const applyPacks = (packs) => {
    let next = current.slice();
    const said = [];
    const used = new Set();
    packs.forEach(p => {
      const typed = (p.pack.editable && typeof p.pack.nameOverride === "string") ? p.pack.nameOverride.trim().slice(0, 80) : "";
      const name = typed || p.pack.name;
      // a pack's id is the one it was read with unless its name was changed here; unique within the batch
      const base = (typed && typed !== p.pack.name) ? (mapStampSlug(typed) || p.pack.id) : p.pack.id;
      let packId = base, n = 2;
      while (used.has(packId)) packId = `${base}-${n++}`;
      used.add(packId);
      const stored = ensureMapStamps(p.stamps.map(s => ({ ...s, id: `${packId}__${s.sid}`, packId, pack: name })));
      const incoming = new Map(stored.map(s => [s.id, s]));
      let updated = 0;
      next = next.map(s => { if (incoming.has(s.id)) { updated += 1; return incoming.get(s.id); } return s; });
      stored.forEach(s => { if (!next.some(e => e.id === s.id)) next.push(s); });
      said.push(`"${name}": ${plural(stored.length - updated, "new stamp", "new stamps")}, ${updated} updated${p.report.dropped.length ? `, ${p.report.dropped.length} dropped` : ""}`);
    });
    onChange(next);
    say(`Imported ${said.join("; ")}.`);
  };
  const importPack = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json,.png,image/png,.zip,application/zip,.abr,.gbr,.gih,.brush,.brushset";
    input.multiple = true;
    input.onchange = async (e) => {
      const files = e.target.files;
      if (!files || !files.length) return;
      setReading(true);
      let read;
      try { read = await mapReadStampFiles(files, current); } finally { setReading(false); }
      if (!read.ok) { say(read.error, "error"); return; }
      const quiet = read.packs.every(p => !p.pack.editable && !p.report.removed.length && !p.report.dropped.length && p.stamps.length > 0);
      if (quiet) { applyPacks(read.packs); return; }
      setPendingName(read.packs[0].pack.name);
      setPending({ packs: read.packs, index: 0 });
    };
    input.click();
  };
  return (
    <>
      <button type="button" className={className || "btn btn-small btn-accent"} style={style} onClick={importPack} disabled={reading} title={title || "Import a stamp pack: a .json pack, a .zip of PNGs, PNG files, a Photoshop .abr, GIMP .gbr or .gih files, or Procreate .brush or .brushset files"}>{reading ? "Reading…" : (label || "+ Import pack or brushes")}</button>
      {pending && (() => {
        // one modal per pack read; a zip of several folders steps through them
        const cur = pending.packs[pending.index];
        const last = pending.index === pending.packs.length - 1;
        const commit = () => {
          cur.pack.nameOverride = pendingName;
          if (last) { applyPacks(pending.packs); setPending(null); return; }
          setPendingName(pending.packs[pending.index + 1].pack.name);
          setPending({ ...pending, index: pending.index + 1 });
        };
        const skip = () => {
          if (last) { const rest = pending.packs.filter((p, i) => i !== pending.index); if (rest.length) applyPacks(rest); setPending(null); return; }
          setPendingName(pending.packs[pending.index + 1].pack.name);
          setPending({ packs: pending.packs.filter((p, i) => i !== pending.index), index: pending.index });
        };
        return (
          <div className="modal-backdrop" onClick={() => setPending(null)}>
            <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
              <div className="modal-hdr">Import stamp pack "{cur.pack.editable ? pendingName : cur.pack.name}"{pending.packs.length > 1 ? ` (${pending.index + 1} of ${pending.packs.length})` : ""}</div>
              <div className="modal-body">
                {cur.pack.editable && (
                  <div className="form-field">
                    <label className="form-label">Pack name</label>
                    <input className="input" value={pendingName} onChange={e => setPendingName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") commit(); }} placeholder="Pack name" />
                  </div>
                )}
                <p>
                  {cur.stamps.length === 0
                    ? "Nothing in this pack can be imported."
                    : `${plural(cur.stamps.length, "stamp", "stamps")} will import: ${cur.report.added} new${cur.report.updated ? `, ${cur.report.updated} replacing ${cur.report.updated === 1 ? "a stamp" : "stamps"} this pack imported before` : ""}${cur.stamps.some(s => s.image) ? `, ${fmtBytes(cur.report.bytes)} in the world file` : ""}.`}
                </p>
                {cur.report.removed.length > 0 && (
                  <div className="modal-notice modal-notice-warning">
                    <strong>Changed on import:</strong>
                    <ul>{listMore(cur.report.removed, 12).map((r, i) => (typeof r === "string" ? <li key={i}>{r}</li> : <li key={i}><code>{r.id}</code>: {r.items.join(", ")}</li>))}</ul>
                  </div>
                )}
                {cur.report.dropped.length > 0 && (
                  <div className="modal-notice modal-notice-warning">
                    <strong>Dropped:</strong>
                    <ul>{listMore(cur.report.dropped, 12).map((r, i) => (typeof r === "string" ? <li key={i}>{r}</li> : <li key={i}><code>{r.id}</code>: {r.reason}</li>))}</ul>
                  </div>
                )}
                <p className="map-stamps-note">An svg stamp body may hold only g, path, circle, ellipse, rect, polygon, polyline, and line, with geometry, paint, opacity, and transform attributes; everything else is removed on import and again whenever the world loads. A PNG tip is decoded and re-encoded here, at most 1024 pixels on its long side; one with any color is placed as is, one without is tinted by the map's Fill. A Photoshop .abr, a GIMP .gbr or .gih, and a Procreate shape import as tinted tips.</p>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setPending(null)}>Cancel</button>
                {pending.packs.length > 1 && <button type="button" className="btn btn-ghost" onClick={skip}>Skip this pack</button>}
                <button type="button" className="btn btn-accent" disabled={cur.stamps.length === 0} onClick={commit}>{last ? `Import ${plural(cur.stamps.length, "stamp", "stamps")}` : "Next"}</button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}

'''

edit(TRUNK, [
    ('''function MapStampsPanel({ state, isLocked, onChange, flash }) {
  const stamps = Array.isArray(state.mapStamps) ? state.mapStamps : [];
  const [pending, setPending] = useState(null); // the packs read from the import, waiting on the report modal: { packs, index }
  const [pendingName, setPendingName] = useState(""); // the editable name of the pack being shown
  const [reading, setReading] = useState(false); // an import being decoded; the button says so
  const [writing, setWriting] = useState(false); // a PNG zip being built; its buttons wait''',
     '''function MapStampsPanel({ state, isLocked, onChange, flash }) {
  const stamps = Array.isArray(state.mapStamps) ? state.mapStamps : [];
  const [writing, setWriting] = useState(false); // a PNG zip being built; its buttons wait'''),
])
# the panel's own copies of the flow go; the button takes their place
replace_span(TRUNK,
             '''  // A read pack becomes stored stamps: the pack's id (a slug of its name when
  // the name is editable) namespaces every stamp id; a stamp this pack
  // imported before is replaced in place, the rest are appended.
  const applyPacks = (packs, current) => {''',
             '''      setPendingName(read.packs[0].pack.name);
      setPending({ packs: read.packs, index: 0 });
    };
    input.click();
  };
''',
             '')
edit(TRUNK, [
    ('''        {!isLocked && <button type="button" className="btn btn-small btn-accent" onClick={importPack} disabled={reading} title="Import a stamp pack: a .json pack, a .zip of PNGs, PNG files, a Photoshop .abr, GIMP .gbr or .gih files, or Procreate .brush or .brushset files">{reading ? "Reading\\u2026" : "+ Import pack or brushes"}</button>}''',
     '''        {!isLocked && <MapStampImportButton stamps={stamps} onChange={onChange} flash={flash} />}'''),
])
replace_span(TRUNK,
             '''      {pending && (() => {
        // one modal per pack read; a zip of several folders steps through them
        const cur = pending.packs[pending.index];
        const last = pending.index === pending.packs.length - 1;
        const commit = () => {
          cur.pack.nameOverride = pendingName;
          if (last) { applyPacks(pending.packs, stamps); setPending(null); return; }''',
             '''                <button type="button" className="btn btn-accent" disabled={cur.stamps.length === 0} onClick={commit}>{last ? `Import ${plural(cur.stamps.length, "stamp", "stamps")}` : "Next"}</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}''',
             '''    </div>
  );
}''')
# listMore is the modal's; the panel no longer needs it
edit(TRUNK, [
    ('''  const listMore = (items, max) => (items.length > max ? [...items.slice(0, max), `and ${items.length - max} more`] : items);
  return (
    <div className="map-stamps">''',
     '''  return (
    <div className="map-stamps">'''),
])
# and the lifted flow goes in front of the panel, once the panel's own copy is gone
edit(TRUNK, [
    ('''function MapStampsPanel({ state, isLocked, onChange, flash }) {''',
     IMPORT_BUTTON + '''function MapStampsPanel({ state, isLocked, onChange, flash }) {'''),
])

# ─── 5. the editor: the strip's props, Cancel's restore ─────────────────────

edit(TRUNK, [
    ('''function MapEditor({ mapData, onChange, dirHandle, imageFolder, entries, bodies, flash, stamps, recordId }) {''',
     '''function MapEditor({ mapData, onChange, dirHandle, imageFolder, entries, bodies, flash, stamps, recordId, onStampsChange, stripLayout, onStripLayout, api }) {'''),
    ('''  // What the paint engine starts a stroke from: the layer's bitmap as a data
  // URL (inline as it is; a folder file read once through the fill cache).''',
     '''  // Cancel (r046): 12_trunk calls this through `api` before dropping the
  // draft, so the folder holds what it held when the draft opened: every
  // file the session overwrote goes back to what it held, every file the
  // session made goes. Save leaves the files as they are.
  const restoreOriginals = async () => {
    if (!dirHandle) return;
    const names = Object.keys(diskRef.current);
    const held = { ...originalRef.current }, now = { ...diskRef.current };
    diskRef.current = {};
    originalRef.current = {};
    for (const name of names) {
      try {
        if (held[name]) { if (now[name] !== held[name]) await writeLayerFile(name, held[name]); }
        else if (typeof dirHandle.removeEntry === "function") await dirHandle.removeEntry(name);
      } catch (err) {
        console.warn("Cancel could not put back", name, err);
      }
    }
  };
  useEffect(() => {
    if (!api) return undefined;
    api.current = { restoreOriginals };
    return () => { api.current = null; };
  });
  // What the paint engine starts a stroke from: the layer's bitmap as a data
  // URL (inline as it is; a folder file read once through the fill cache).'''),
    ('''      <MapToolStrip drawing={drawing} history={history} showPresets={showPresets} presetValue={presetValue} onPreset={applyPreset} canvasSize={{ width: data.drawing.width, height: data.drawing.height }} onCustomSize={applyCustomSize} layersOpen={layersOpen} onToggleLayers={() => setLayersOpen(o => !o)} stamps={stamps} />''',
     '''      <MapToolStrip drawing={drawing} history={history} showPresets={showPresets} presetValue={presetValue} onPreset={applyPreset} canvasSize={{ width: data.drawing.width, height: data.drawing.height }} onCustomSize={applyCustomSize} layersOpen={layersOpen} onToggleLayers={() => setLayersOpen(o => !o)} stamps={stamps} onStampsChange={onStampsChange} layout={stripLayout} onLayout={onStripLayout} flash={flash} />'''),
])

# ─── 6. 12_trunk: the preference, the setter, the Cancel hook ───────────────

edit(TRUNK12, [
    # The close warning's handler was captured during the loading renders,
    # which return before isDraftDirty is declared, and the effect's deps
    # never refreshed it, so a reload with the editor open threw a TDZ error
    # (found by probe16). The handler reads the latest check through a ref.
    ('''  useEffect(() => {
    const handler = (e) => {
      if (isDraftDirty()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [entryDraft, tplDraft]);''',
     '''  const draftDirtyRef = useRef(() => false); // the latest isDraftDirty, declared further down; the loading renders never reach it
  useEffect(() => {
    const handler = (e) => {
      if (draftDirtyRef.current()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);'''),
    ('''  const confirmDiscardDraft = () => {
    if (!isDraftDirty()) return true;''',
     '''  draftDirtyRef.current = isDraftDirty;
  const confirmDiscardDraft = () => {
    if (!isDraftDirty()) return true;'''),
    ('''    templatesCollapsed: false,
    sidebarWidth: 236,
  });''',
     '''    templatesCollapsed: false,
    sidebarWidth: 236,
    mapStrip: null, // the map editor's strip layout (r046), normalized where it is read
  });'''),
    ('''            sidebarWidth: typeof stored.sidebarWidth === "number"
              ? Math.max(200, Math.min(500, stored.sidebarWidth))
              : 236,
          });''',
     '''            sidebarWidth: typeof stored.sidebarWidth === "number"
              ? Math.max(200, Math.min(500, stored.sidebarWidth))
              : 236,
            mapStrip: stored.mapStrip && typeof stored.mapStrip === "object" ? stored.mapStrip : null,
          });'''),
    ('''  const [mapDraft, setMapDraft] = useState(null);''',
     '''  const [mapDraft, setMapDraft] = useState(null);
  const mapEditorApiRef = useRef(null); // what the open map editor lets this component call (r046: Cancel's restore)'''),
    ('''  const cancelMapEdit = () => {
    if (!confirmDiscardDraft()) return;
    const existed = (state.cartographia || []).some(m => m.id === activeMapId);
    setMapDraft(null); initialMapDraftRef.current = null;''',
     '''  const cancelMapEdit = () => {
    if (!confirmDiscardDraft()) return;
    const existed = (state.cartographia || []).some(m => m.id === activeMapId);
    // the folder back to what it held when the draft opened (r046); the editor keeps the originals
    if (mapEditorApiRef.current && typeof mapEditorApiRef.current.restoreOriginals === "function") mapEditorApiRef.current.restoreOriginals();
    setMapDraft(null); initialMapDraftRef.current = null;'''),
    ('''                  flash={flash}
                  stamps={state.mapStamps}
                />
              }
            />''',
     '''                  flash={flash}
                  stamps={state.mapStamps}
                  onStampsChange={(next) => updateState(s => ({ ...s, mapStamps: next }))}
                  stripLayout={prefs.mapStrip}
                  onStripLayout={(v) => setPrefs(p => ({ ...p, mapStrip: v }))}
                  api={mapEditorApiRef}
                />
              }
            />'''),
])

# ─── 7. the shell ────────────────────────────────────────────────────────────

edit(SHELL, [
    # the hint keeps two lines of height whatever it says, so the strip and the canvas never move when the tool changes
    ('''.map-editor-hint{font-size:calc(11px * var(--font-scale));color:var(--text-dim);font-style:italic}''',
     '''.map-editor-hint{font-size:calc(11px * var(--font-scale));color:var(--text-dim);font-style:italic;line-height:1.35;min-height:2.7em;display:block;flex:1 1 100%;min-width:0}'''),
    ('''.map-tools-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}''',
     '''.map-tools-row{display:flex;align-items:flex-start;gap:6px;flex-wrap:wrap;min-height:32px}
.map-tools-group{display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;min-height:32px}
.map-tools-group:empty{display:none}
.map-tools-group + .map-tools-group::before{content:"";width:1px;height:18px;background:var(--border);margin:0 2px}
.map-tools-group.off{opacity:.35}
.map-tools-group.off .map-swatch,.map-tools-group.off input,.map-tools-group.off button{cursor:default}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.map-stamp-filter{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.map-stamp-filter .input{flex:1;max-width:320px}
.map-stamp-count{white-space:nowrap}
.map-arrange{display:flex;gap:24px;flex-wrap:wrap}
.map-arrange-col{flex:1;min-width:240px}
.map-arrange-row{font-family:'DM Sans',sans-serif;font-size:calc(10px * var(--font-scale));letter-spacing:.08em;text-transform:uppercase;color:var(--text-dim);margin:10px 0 4px}
.map-arrange-item{display:flex;align-items:center;gap:6px;padding:3px 6px;border:1px solid var(--border);border-radius:3px;margin-bottom:4px}
.map-arrange-item .name{flex:1}
.map-arrange-break{font-size:calc(11px * var(--font-scale));color:var(--text-dim);display:inline-flex;align-items:center;gap:4px;white-space:nowrap}'''),
])

print("r046 applied")
