"""v1.7 r032: Tabula III, the drawing layer.

Stemma v2's plan, item 7 (docs/stemma-v2-spec.md, section 4's shape and
section 6's Lines and strokes). Lines over the cards: the map's shape model
and renderer, vector only and with no layer UI, in an svg laid over the
board's surface in canvas units, inert to the pointer until a tool is up.
Line takes its points by click, a double-click, Enter, or right-click
finishes it, Esc discards; a first or last point put down within six screen
pixels of a card sticks to it (`anchors`, the card lit while the pending
point is over it) and is drawn from the card's measured box from then on,
so it follows the card across a drag and frees itself, at the point it was
drawn at, when the card leaves the board. Freehand is a drag, simplified on
release. Select moves a line, drags its points (an end dropped on a card
sticks, off one frees), nudges by the grid, and deletes; the panel on the
right holds the map's swatches, the width, Smooth, and the arrowheads.
`arrow` ("none", "end", "both") joins the shared stroke shape: ensureMapShape
learns it, the renderer draws an open chevron at the end or at both ends as
subpaths of the line's own path, and Cartographia's strip exposes the toggle
(Drak's call, 2026-10-28), so a map's lines can carry heads too. A stroke
with no arrow renders exactly as before; tools/stemma-parity/renderer.py
proves it over a generated set.

- 18_cartographia/00_model: `arrow` on a stroke.
- 18_cartographia/01_renderer: mapArrowHeads; the stroke case draws them.
- 18_cartographia/02_tools: the arrow default, the Arrow group in the strip,
  the draft previews with heads, the hints.
- 21_stemma: the document section's tabulaCoerceShape, tabulaVisibleIds,
  tabulaIdsBelow, tabulaHealAnchors, tabulaRewriteBoard, tabulaAddShape,
  tabulaUpdateShape, tabulaDeleteShape; the transforms that take a card off
  a board heal the anchors; regenerateStemmaIds carries anchors across;
  the canvas section's useTabulaGestures, useTabulaDrawing, TabulaDrawLayer,
  TabulaShapePanel, tabulaAttachPoint, tabulaDrawnPoints, TABULA_TOOLS; the
  view wires the rail, the layer, the panel, the keys, and the ends.
- shell.html: the layer, the lit card, the rail's tools, the panel's rows.

Declared scope: 18_cartographia/00_model.jsx, 18_cartographia/01_renderer.jsx,
18_cartographia/02_tools.jsx, 21_stemma.jsx, shell.html. Declarations added:
mapArrowHeads, tabulaCoerceShape, tabulaVisibleIds, tabulaIdsBelow,
tabulaHealAnchors, tabulaRewriteBoard, tabulaAddShape, tabulaUpdateShape,
tabulaDeleteShape, TABULA_TOOLS, tabulaAttachPoint, tabulaDrawnPoints,
useTabulaGestures, useTabulaDrawing, TabulaDrawLayer, TabulaShapePanel.

String-anchored edits; every anchor must occur exactly once. Run from
anywhere inside the repository:
    python3 inlining/cuts/v1.7_r032_tabula_drawing.py
"""
from pathlib import Path

ROOT = next(p for p in Path(__file__).resolve().parents if (p / 'cartulary-src').is_dir())
MODULES = ROOT / "cartulary-src" / "modules"


def edit(path, pairs):
    text = path.read_text(encoding="utf-8")
    for old, new in pairs:
        n = text.count(old)
        assert n == 1, f"{path.name}: anchor occurs {n} times, not 1:\n{old[:200]}"
        text = text.replace(old, new)
    path.write_text(text, encoding="utf-8")


# ═══════════════════════════════════════════════════════════════════════════════
# 18_cartographia/00_model: a stroke's arrow
# ═══════════════════════════════════════════════════════════════════════════════

MODEL_OLD = r"""  if (type === "polygon" || type === "stroke") {
    const pts = (Array.isArray(s.points) ? s.points : [])
      .filter(p => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]))
      .map(p => [p[0], p[1]]);
    if (pts.length < (type === "polygon" ? 3 : 2)) return null;
    out.points = pts;
  }
"""
MODEL_NEW = r"""  if (type === "polygon" || type === "stroke") {
    const pts = (Array.isArray(s.points) ? s.points : [])
      .filter(p => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]))
      .map(p => [p[0], p[1]]);
    if (pts.length < (type === "polygon" ? 3 : 2)) return null;
    out.points = pts;
  }
  if (type === "stroke") {
    // the heads (v1.7 r032): none, one at the end, or one at each end
    out.arrow = pick(s.arrow, ["none", "end", "both"], "none");
  }
"""

# ═══════════════════════════════════════════════════════════════════════════════
# 18_cartographia/01_renderer: the heads
# ═══════════════════════════════════════════════════════════════════════════════

RENDER_HEADS_OLD = r"""// One normalized shape to one node, or null for a stamp whose symbol is not
// known. ctx ({idBase, defs, stampsUsed, stamps, placeholder}) comes from"""
RENDER_HEADS_NEW = r"""// The heads of an arrowed stroke (v1.7 r032): an open chevron at the end
// (`arrow: "end"`) or at both ends (`"both"`), written as subpaths after the
// line's own so one path draws the whole and the line's cap and joins serve
// the heads. A head's tip is the line's end; its two legs run back from the
// tip at 28 degrees to the line's direction there, 3.5 widths long and 10
// units at least. The direction is taken from the nearest earlier point at
// least half a head away (a freehand line's last points sit close), else the
// adjacent one; a line whose points all coincide gets no head.
function mapArrowHeads(points, width, arrow) {
  const f = mapNum;
  const n = points.length;
  if (n < 2 || (arrow !== "end" && arrow !== "both")) return "";
  const len = Math.max(10, 3.5 * width);
  const head = (tip, back) => {
    let from = back[0];
    for (const q of back) { if (Math.hypot(tip[0] - q[0], tip[1] - q[1]) >= len / 2) { from = q; break; } }
    const dx = tip[0] - from[0], dy = tip[1] - from[1];
    const d = Math.hypot(dx, dy);
    if (d === 0) return "";
    const ux = dx / d, uy = dy / d;
    const a = 28 * Math.PI / 180;
    const c = Math.cos(a), s = Math.sin(a);
    const l1 = [tip[0] - len * (ux * c - uy * s), tip[1] - len * (uy * c + ux * s)];
    const l2 = [tip[0] - len * (ux * c + uy * s), tip[1] - len * (uy * c - ux * s)];
    return ` M${f(l1[0])} ${f(l1[1])} L${f(tip[0])} ${f(tip[1])} L${f(l2[0])} ${f(l2[1])}`;
  };
  let d = head(points[n - 1], points.slice(0, -1).reverse());
  if (arrow === "both") d += head(points[0], points.slice(1));
  return d;
}

// One normalized shape to one node, or null for a stamp whose symbol is not
// known. ctx ({idBase, defs, stampsUsed, stamps, placeholder}) comes from"""

RENDER_STROKE_OLD = r"""    case "stroke": {
      const linePaint = { ...paint, fill: "none" };
      if (s.smooth) return { tag: "path", attrs: { ...common, d: mapSmoothPath(s.points, false), ...linePaint } };
      return { tag: "polyline", attrs: { ...common, points: s.points.map(p => `${f(p[0])},${f(p[1])}`).join(" "), ...linePaint } };
    }"""
RENDER_STROKE_NEW = r"""    case "stroke": {
      const linePaint = { ...paint, fill: "none" };
      const arrow = s.arrow === "end" || s.arrow === "both" ? s.arrow : "none";
      if (arrow !== "none") {
        // an arrowed line (r032) is one path: the line, then its heads
        const line = s.smooth ? mapSmoothPath(s.points, false) : `M${s.points.map(p => `${f(p[0])} ${f(p[1])}`).join(" L")}`;
        return { tag: "path", attrs: { ...common, d: line + mapArrowHeads(s.points, s.strokeWidth, arrow), ...linePaint } };
      }
      if (s.smooth) return { tag: "path", attrs: { ...common, d: mapSmoothPath(s.points, false), ...linePaint } };
      return { tag: "polyline", attrs: { ...common, points: s.points.map(p => `${f(p[0])},${f(p[1])}`).join(" "), ...linePaint } };
    }"""

# ═══════════════════════════════════════════════════════════════════════════════
# 18_cartographia/02_tools: the strip's Arrow group
# ═══════════════════════════════════════════════════════════════════════════════

TOOLS_HINT_OLD = r"""  { id: "stroke",  label: "Line",    key: "l", hint: "Click to place the points of an open line · Done in the strip, a double-click, Enter, or right-click finishes it · Esc discards" },
  { id: "freehand", label: "Freehand", key: "f", hint: "Drag on the map to draw a line freehand · Esc while dragging discards it · Right-click when done" },"""
TOOLS_HINT_NEW = r"""  { id: "stroke",  label: "Line",    key: "l", hint: "Click to place the points of an open line · Done in the strip, a double-click, Enter, or right-click finishes it · Esc discards · Arrowheads in the strip" },
  { id: "freehand", label: "Freehand", key: "f", hint: "Drag on the map to draw a line freehand · Esc while dragging discards it · Arrowheads in the strip · Right-click when done" },"""

TOOLS_DESCRIBE_OLD = r"""    case "stroke": return `Line, ${s.points.length} points`;"""
TOOLS_DESCRIBE_NEW = r"""    case "stroke": return `Line, ${s.points.length} points${s.arrow === "both" ? ", arrows at both ends" : s.arrow === "end" ? ", an arrow" : ""}`;"""

TOOLS_STYLE_OLD = r"""  const [style, setStyle] = useState({ fill: "#8a8378", stroke: "#6b4e2e", strokeWidth: 4, smooth: true });"""
TOOLS_STYLE_NEW = r"""  const [style, setStyle] = useState({ fill: "#8a8378", stroke: "#6b4e2e", strokeWidth: 4, smooth: true, arrow: "none" });"""

TOOLS_CURRENT_OLD = r"""  const current = selectedShape
    ? { fill: selectedShape.fill, stroke: selectedShape.stroke, strokeWidth: selectedShape.strokeWidth, smooth: !!selectedShape.smooth }
    : style;"""
TOOLS_CURRENT_NEW = r"""  const current = selectedShape
    ? { fill: selectedShape.fill, stroke: selectedShape.stroke, strokeWidth: selectedShape.strokeWidth, smooth: !!selectedShape.smooth, arrow: selectedShape.type === "stroke" ? (selectedShape.arrow || "none") : "none" }
    : style;"""

TOOLS_FREEHAND_OLD = r"""        id = addShape({ type: "stroke", points: pts.map(p => [r2(p[0]), r2(p[1])]), fill: null, stroke: style.stroke, strokeWidth: style.strokeWidth, smooth: true });"""
TOOLS_FREEHAND_NEW = r"""        id = addShape({ type: "stroke", points: pts.map(p => [r2(p[0]), r2(p[1])]), fill: null, stroke: style.stroke, strokeWidth: style.strokeWidth, smooth: true, arrow: style.arrow });"""

TOOLS_DRAFT_OLD = r"""        id = addShape({ type: draft.type, points: pts, fill: draft.type === "stroke" ? null : style.fill, stroke: style.stroke, strokeWidth: style.strokeWidth, smooth: style.smooth });"""
TOOLS_DRAFT_NEW = r"""        id = addShape({ type: draft.type, points: pts, fill: draft.type === "stroke" ? null : style.fill, stroke: style.stroke, strokeWidth: style.strokeWidth, smooth: style.smooth, arrow: draft.type === "stroke" ? style.arrow : undefined });"""

TOOLS_GROUP_OLD = r"""      );
    }
    if ((tool === "brush" || tool === "eraser") && !selectedShape) {"""
TOOLS_GROUP_NEW = r"""      );
    }
    if (kind === "stroke" || kind === "freehand") {
      // The heads (r032): none, at the end, or at both ends; the selected
      // line's, or the next one's.
      parts.push(
        <React.Fragment key="arrow">
          <span className="map-tools-label">Arrow</span>
          {[["none", "None", "No arrowhead"], ["end", "End", "An arrowhead at the line's end"], ["both", "Both", "An arrowhead at each end"]].map(([v, label, title]) => (
            <button key={v} type="button" className={`btn btn-small ${current.arrow === v ? "btn-accent" : "btn-ghost"}`} aria-pressed={current.arrow === v} onClick={() => applyStyle({ arrow: v })} title={title}>{label}</button>
          ))}
        </React.Fragment>
      );
    }
    if ((tool === "brush" || tool === "eraser") && !selectedShape) {"""

TOOLS_OVERLAY_OLD = r"""  } else if (draft && draft.type === "freehand") {
    items.push(<polyline key="draft" points={draft.points.map(p => `${f(p[0])},${f(p[1])}`).join(" ")} fill="none" stroke={style.stroke || MAP_PALETTE[0].hex} strokeWidth={style.strokeWidth} strokeLinejoin="round" strokeLinecap="round" opacity={0.7} />);
  } else if (draft) {
    const pts = draft.points;
    const trail = cursor ? [...pts, cursor] : pts;
    items.push(<polyline key="draft" points={trail.map(p => `${f(p[0])},${f(p[1])}`).join(" ")} fill="none" stroke={style.stroke || MAP_PALETTE[0].hex} strokeWidth={style.strokeWidth} strokeLinejoin="round" strokeLinecap="round" opacity={0.7} />);"""
TOOLS_OVERLAY_NEW = r"""  } else if (draft && draft.type === "freehand") {
    // an arrowed draft (r032) previews as the path the renderer will draw, heads and all
    const arrowed = style.arrow === "end" || style.arrow === "both";
    if (arrowed) items.push(<path key="draft" d={`M${draft.points.map(p => `${f(p[0])} ${f(p[1])}`).join(" L")}${mapArrowHeads(draft.points, style.strokeWidth, style.arrow)}`} fill="none" stroke={style.stroke || MAP_PALETTE[0].hex} strokeWidth={style.strokeWidth} strokeLinejoin="round" strokeLinecap="round" opacity={0.7} />);
    else items.push(<polyline key="draft" points={draft.points.map(p => `${f(p[0])},${f(p[1])}`).join(" ")} fill="none" stroke={style.stroke || MAP_PALETTE[0].hex} strokeWidth={style.strokeWidth} strokeLinejoin="round" strokeLinecap="round" opacity={0.7} />);
  } else if (draft) {
    const pts = draft.points;
    const trail = cursor ? [...pts, cursor] : pts;
    const arrowed = draft.type === "stroke" && (style.arrow === "end" || style.arrow === "both");
    if (arrowed) items.push(<path key="draft" d={`M${trail.map(p => `${f(p[0])} ${f(p[1])}`).join(" L")}${mapArrowHeads(trail, style.strokeWidth, style.arrow)}`} fill="none" stroke={style.stroke || MAP_PALETTE[0].hex} strokeWidth={style.strokeWidth} strokeLinejoin="round" strokeLinecap="round" opacity={0.7} />);
    else items.push(<polyline key="draft" points={trail.map(p => `${f(p[0])},${f(p[1])}`).join(" ")} fill="none" stroke={style.stroke || MAP_PALETTE[0].hex} strokeWidth={style.strokeWidth} strokeLinejoin="round" strokeLinecap="round" opacity={0.7} />);"""

# ═══════════════════════════════════════════════════════════════════════════════
# 21_stemma: the document
# ═══════════════════════════════════════════════════════════════════════════════

DOC_HEAD_OLD = r"""// position, in z-order, and (from r031) a drawing layer. Items: a note (a"""
DOC_HEAD_NEW = r"""// position, in z-order, and (from r032) a drawing layer. Items: a note (a"""

CONST_OLD = r"""  color: "#c8a96e",
  icon: "✦",
};
const TABULA_ITEM_TYPES = ["note", "linked", "image", "column", "board"];"""
CONST_NEW = r"""  color: "#c8a96e",
  icon: "✦",
  // the drawing layer (r032): the next line's color and width, how far
  // past a card's box an end still sticks to it (screen pixels), a freehand
  // point every `spacing` screen pixels and its simplifier's tolerance
  draw: { color: "#e8dcc0", width: 3, stick: 6, spacing: 4, tolerance: 2 },
};
const TABULA_ITEM_TYPES = ["note", "linked", "image", "column", "board"];"""

SHAPE_HELPERS_OLD = r"""const tabulaClampWidth = (type, w) => Math.max(TABULA.minWidth[type] || 160, Math.min(TABULA.maxWidth, w));
"""
SHAPE_HELPERS_NEW = r"""const tabulaClampWidth = (type, w) => Math.max(TABULA.minWidth[type] || 160, Math.min(TABULA.maxWidth, w));

// A shape on a board (v1.7 r032): the map's vector model through
// ensureMapShape, so the renderer draws it as it draws a map's, and on a
// stroke `anchors`: the ids of the cards its first and its last point stick
// to, null where the end is free, cleared where the card isn't among `ids`
// (what the board holds, placed or in its columns; never a sub-board's). A
// shape of a type the model doesn't know is kept as it is and not drawn, as
// an item of an unknown type is; what the model can't draw at all (a line
// with one point) goes, as it would from a map.
const tabulaCoerceShape = (s, ids) => {
  if (!s || typeof s !== "object") return null;
  if (!MAP_SHAPE_TYPES.includes(s.type)) return { ...s, id: tabulaStr(s.id) || `shape-${genId().slice(-6)}` };
  const out = ensureMapShape(s);
  if (!out) return null;
  if (out.type === "stroke") {
    const a = s.anchors && typeof s.anchors === "object" ? s.anchors : {};
    const ok = (v) => (typeof v === "string" && ids && ids.has(v) ? v : null);
    out.anchors = { start: ok(a.start), end: ok(a.end) };
  }
  return out;
};
// The ids a line on a board can stick to: the board's items, placed or in
// its columns, not a sub-board's.
const tabulaVisibleIds = (board) => {
  const ids = new Set();
  const walk = (node) => (node.items || []).forEach(it => { ids.add(it.id); if (it.type === "column") walk(it); });
  walk(board);
  return ids;
};
// An item's id with every id below it, for the ends a transform frees.
const tabulaIdsBelow = (it) => {
  const ids = [it.id];
  tabulaWalk(it, (c) => ids.push(c.id));
  return ids;
};
// Every board's anchors checked against what the board holds, after a
// transform that may have taken a card away: an anchor on a card that is
// gone clears, and the freed end takes the point in `ends` ({ [shape id]:
// { start: [x, y], end: [x, y] } }, where the view measured the end as it
// was drawn) when one is given, else the point it kept. A node nothing
// changed in comes back as it was.
const tabulaHealAnchors = (node, ends) => {
  const ids = node.type === "board" ? tabulaVisibleIds(node) : null;
  let changed = false;
  const shapes = ids ? (node.shapes || []).map(s => {
    if (!s || s.type !== "stroke" || !s.anchors || !Array.isArray(s.points)) return s;
    let next = s;
    ["start", "end"].forEach(which => {
      const id = s.anchors[which];
      if (!id || ids.has(id)) return;
      const pts = next.points.slice();
      const e = ends && ends[s.id] && ends[s.id][which];
      if (Array.isArray(e) && Number.isFinite(e[0]) && Number.isFinite(e[1])) pts[which === "start" ? 0 : pts.length - 1] = [e[0], e[1]];
      next = { ...next, points: pts, anchors: { ...next.anchors, [which]: null } };
      changed = true;
    });
    return next;
  }) : null;
  const items = (node.items || []).map(it => {
    if (it.type !== "board" && it.type !== "column") return it;
    const r = tabulaHealAnchors(it, ends);
    if (r !== it) changed = true;
    return r;
  });
  if (!changed) return node;
  const out = { ...node, items };
  if (ids) out.shapes = shapes;
  return out;
};
"""

COERCE_BOARD_OLD = r"""    out.items = (Array.isArray(it.items) ? it.items : []).map(c => tabulaCoerceItem(c, true)).filter(Boolean);
    out.shapes = Array.isArray(it.shapes) ? it.shapes : [];"""
COERCE_BOARD_NEW = r"""    out.items = (Array.isArray(it.items) ? it.items : []).map(c => tabulaCoerceItem(c, true)).filter(Boolean);
    const ids = tabulaVisibleIds(out);
    out.shapes = (Array.isArray(it.shapes) ? it.shapes : []).map(s => tabulaCoerceShape(s, ids)).filter(Boolean);"""

DELETE_ITEM_OLD = r"""const tabulaDeleteItem = (doc, id) => {
  if (!doc || !doc.root) return doc;
  let hit = false;
  const root = tabulaRewrite(doc.root, it => { if (it.id === id) { hit = true; return null; } return it; });
  return hit ? { ...doc, root, updatedAt: isoNow() } : doc;
};"""
DELETE_ITEM_NEW = r"""// A delete, a move to a place, and a column's delete (below) end by
// healing the anchors (r032), with the ends the view measured.
const tabulaDeleteItem = (doc, id, ends) => {
  if (!doc || !doc.root) return doc;
  let hit = false;
  const root = tabulaRewrite(doc.root, it => { if (it.id === id) { hit = true; return null; } return it; });
  return hit ? { ...doc, root: tabulaHealAnchors(root, ends), updatedAt: isoNow() } : doc;
};"""

MOVETO_SIG_OLD = r"""const tabulaMoveTo = (doc, id, target) => {"""
MOVETO_SIG_NEW = r"""const tabulaMoveTo = (doc, id, target, ends) => {"""

MOVETO_END_OLD = r"""  const root = put(without);
  return placed ? { ...doc, root, updatedAt: isoNow() } : doc;
};"""
MOVETO_END_NEW = r"""  const root = put(without);
  return placed ? { ...doc, root: tabulaHealAnchors(root, ends), updatedAt: isoNow() } : doc;
};"""

DELETE_COLUMN_OLD = r"""const tabulaDeleteColumn = (doc, id, placements) => {
  if (!doc || !doc.root) return doc;
  const col = tabulaFindItem(doc.root, id);
  if (!col || col.type !== "column") return doc;
  if (!placements) return tabulaDeleteItem(doc, id);"""
DELETE_COLUMN_NEW = r"""const tabulaDeleteColumn = (doc, id, placements, ends) => {
  if (!doc || !doc.root) return doc;
  const col = tabulaFindItem(doc.root, id);
  if (!col || col.type !== "column") return doc;
  if (!placements) return tabulaDeleteItem(doc, id, ends);"""

DELETE_COLUMN_END_OLD = r"""  const root = cut(doc.root);
  return hit ? { ...doc, root, updatedAt: isoNow() } : doc;
};"""
DELETE_COLUMN_END_NEW = r"""  const root = cut(doc.root);
  return hit ? { ...doc, root: tabulaHealAnchors(root, ends), updatedAt: isoNow() } : doc;
};"""

SHAPE_TRANSFORMS_OLD = r"""const tabulaRelink = (doc, id, entryId, name) => tabulaUpdateItem(doc, id, { entryId, _cachedName: name || "" });
"""
SHAPE_TRANSFORMS_NEW = r"""const tabulaRelink = (doc, id, entryId, name) => tabulaUpdateItem(doc, id, { entryId, _cachedName: name || "" });

// The shapes' transforms (v1.7 r032), each on one board's `shapes`: a shape
// added at the top, one patched (an object merges, a function returns the
// shape to keep) and coerced again, one deleted. The board is found by id,
// the root or any sub-board, in a column's stack or not.
const tabulaRewriteBoard = (doc, boardId, fn) => {
  if (!doc || !doc.root) return doc;
  let hit = false;
  const visit = (node) => {
    if (node.id === boardId && node.type === "board") { const r = fn(node); if (r !== node) hit = true; return r; }
    if (node.type !== "board" && node.type !== "column") return node;
    return { ...node, items: (node.items || []).map(visit) };
  };
  const root = visit(doc.root);
  return hit ? { ...doc, root, updatedAt: isoNow() } : doc;
};
const tabulaAddShape = (doc, boardId, shape) => tabulaRewriteBoard(doc, boardId, (b) => {
  const s = tabulaCoerceShape(shape, tabulaVisibleIds(b));
  return s ? { ...b, shapes: [...(b.shapes || []), s] } : b;
});
const tabulaUpdateShape = (doc, boardId, id, patch) => tabulaRewriteBoard(doc, boardId, (b) => {
  const ids = tabulaVisibleIds(b);
  let hit = false;
  const shapes = (b.shapes || []).map(s => {
    if (s.id !== id) return s;
    const next = tabulaCoerceShape(typeof patch === "function" ? patch(s) : { ...s, ...patch }, ids);
    if (!next) return s;
    hit = true;
    return { ...next, id: s.id };
  });
  return hit ? { ...b, shapes } : b;
});
const tabulaDeleteShape = (doc, boardId, id) => tabulaRewriteBoard(doc, boardId, (b) => {
  const shapes = (b.shapes || []).filter(s => s.id !== id);
  return shapes.length === (b.shapes || []).length ? b : { ...b, shapes };
});
"""

REGEN_OLD = r"""  // v1.7 r029: a tabula's items, columns' and boards' included, each with a
  // fresh id; r031's shapes keep theirs, as a map's do.
  const walkItem = (it) => ({
    ...it,
    id: `n-${genId()}`,
    ...(Array.isArray(it.items) ? { items: it.items.map(walkItem) } : {}),
  });
  if (stemma.layout === "tabula") {
    return { ...stemma, id: `stem-${genId()}`, root: walkItem(stemma.root) };
  }"""
REGEN_NEW = r"""  // v1.7 r029: a tabula's items, columns' and boards' included, each with a
  // fresh id; r032's shapes keep theirs, as a map's do, and a line's anchors
  // follow the cards they name to their new ids.
  if (stemma.layout === "tabula") {
    const fresh = new Map();
    const mint = (it) => { fresh.set(it.id, `n-${genId()}`); if (Array.isArray(it.items)) it.items.forEach(mint); };
    mint(stemma.root);
    const walkItem = (it) => {
      const out = { ...it, id: fresh.get(it.id) };
      if (Array.isArray(it.items)) out.items = it.items.map(walkItem);
      if (it.type === "board" && Array.isArray(it.shapes)) out.shapes = it.shapes.map(s => (s && s.anchors && typeof s.anchors === "object" ? { ...s, anchors: { start: fresh.get(s.anchors.start) || null, end: fresh.get(s.anchors.end) || null } } : s));
      return out;
    };
    return { ...stemma, id: `stem-${genId()}`, root: walkItem(stemma.root) };
  }"""

# ═══════════════════════════════════════════════════════════════════════════════
# 21_stemma: the canvas
# ═══════════════════════════════════════════════════════════════════════════════

CARD_SIG_OLD = r"""// the body (`onPointerDown`) selects. A column's header is its grip.
function TabulaCard({ item, placed, x, y, w, pool, templates, selected, dragging, ghost, over, overEdge, editing, onEditChange, onEditDone, onPointerDown, onGripDown, onHandleDown, onDoubleClick, onOpenEntry, dirHandle, imageFolder, renderItem, insertAt }) {"""
CARD_SIG_NEW = r"""// the body (`onPointerDown`) selects. A column's header is its grip. `stick`
// (r032) lights the card a line's pending end is over.
function TabulaCard({ item, placed, x, y, w, pool, templates, selected, dragging, ghost, over, overEdge, stick, editing, onEditChange, onEditDone, onPointerDown, onGripDown, onHandleDown, onDoubleClick, onOpenEntry, dirHandle, imageFolder, renderItem, insertAt }) {"""

CARD_CLS_OLD = r"""  const cls = `${placed ? "tabula-card" : "tabula-colitem"}${selected ? " selected" : ""}${dragging ? " dragging" : ""}${ghost ? " ghost" : ""}${over ? " over" : ""}${item.type === "column" ? " is-column" : ""}`;"""
CARD_CLS_NEW = r"""  const cls = `${placed ? "tabula-card" : "tabula-colitem"}${selected ? " selected" : ""}${dragging ? " dragging" : ""}${ghost ? " ghost" : ""}${over ? " over" : ""}${stick ? " stick" : ""}${item.type === "column" ? " is-column" : ""}`;"""

# The drawing layer: inserted before TabulaCanvasView's comment block.
VIEW_INTRO_OLD = r"""// The board's screen (docs/stemma-v2-spec.md, section 6): HTML, not SVG, so a"""
VIEW_INTRO_NEW = r"""// The gestures (r032, out of the view): one window-level move and up pair
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

// The board's screen (docs/stemma-v2-spec.md, section 6): HTML, not SVG, so a"""

VIEW_STATE_OLD = r"""  const [asking, setAsking] = useState(null);       // the column or board card whose delete is being asked about
  const gestureRef = useRef(null);
  const prefTimer = useRef(null);"""
VIEW_STATE_NEW = r"""  const [asking, setAsking] = useState(null);       // the column or board card whose delete is being asked about
  const gestures = useTabulaGestures();
  const gestureRef = gestures.ref;
  const beginGesture = gestures.begin;
  const prefTimer = useRef(null);"""

VIEW_DRAWING_OLD = r"""  const items = board.items || [];
  // the selection may sit in a column's stack
  const selected = selectedId ? tabulaFindItem(board, selectedId) : null;
  const selectedParent = selected ? tabulaParentOf(board, selectedId) : null;
  const drillIn = (id) => { if (onFocalChange && tabulaBoardNode(stemma.root, id)) onFocalChange(id); };

  // the cards' boxes in canvas units, from the DOM, for Fit
  const cardsBox = () => {
    const el = surfaceRef.current;
    if (!el) return null;
    const cards = Array.from(el.querySelectorAll(".tabula-card:not(.ghost)"));
    if (cards.length === 0) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    cards.forEach(c => {
      const x = parseFloat(c.style.left) || 0, y = parseFloat(c.style.top) || 0;
      x0 = Math.min(x0, x); y0 = Math.min(y0, y);
      x1 = Math.max(x1, x + c.offsetWidth); y1 = Math.max(y1, y + c.offsetHeight);
    });
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  };"""
VIEW_DRAWING_NEW = r"""  const items = board.items || [];
  // the selection may sit in a column's stack
  const selected = selectedId ? tabulaFindItem(board, selectedId) : null;
  const selectedParent = selected ? tabulaParentOf(board, selectedId) : null;
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
  };"""

VIEW_BOARDCHANGE_OLD = r"""    if (!first) { setSelectedId(null); setEditing(null); setPicker(null); setDrag(null); setAsking(null); }
  }, [board.id]);"""
VIEW_BOARDCHANGE_NEW = r"""    if (!first) { setSelectedId(null); setEditing(null); setPicker(null); setDrag(null); setAsking(null); drawing.reset(); }
  }, [board.id]);"""

VIEW_EDITREF_OLD = r"""  // The in-place editor's fields commit as they're typed, so ending the edit
  // only closes the fields; the ref lets the pane's press and the field's
  // blur both ask in one event.
  const editingRef = useRef(null);
  editingRef.current = editing;
  const endEdit = () => { if (!editingRef.current) return; editingRef.current = null; setEditing(null); };
  camera.cfg.current.onTap = () => { endEdit(); setSelectedId(null); setPicker(null); };"""
VIEW_EDITREF_NEW = r"""  // The in-place editor's fields commit as they're typed, so ending the edit
  // only closes the fields; the ref (declared with the drawing layer above)
  // lets the pane's press and the field's blur both ask in one event.
  editingRef.current = editing;
  camera.cfg.current.onTap = () => { endEdit(); setSelectedId(null); setPicker(null); drawing.deselect(); };"""

VIEW_GESTURES_OLD = r"""  // the gestures: a card's move, a width handle, a rail button's drag
  const handlersRef = useRef(null);
  if (!handlersRef.current) handlersRef.current = {
    move: (e) => { const g = gestureRef.current; if (g && g.onMove) g.onMove(e); },
    up: (e) => { const g = gestureRef.current; if (!g) return; gestureRef.current = null; window.removeEventListener("pointermove", handlersRef.current.move); window.removeEventListener("pointerup", handlersRef.current.up); window.removeEventListener("pointercancel", handlersRef.current.up); if (g.onUp) g.onUp(e); },
  };
  const beginGesture = (g) => {
    gestureRef.current = g;
    window.addEventListener("pointermove", handlersRef.current.move);
    window.addEventListener("pointerup", handlersRef.current.up);
    window.addEventListener("pointercancel", handlersRef.current.up);
  };
  useEffect(() => () => { gestureRef.current = null; document.body.classList.remove("tabula-dragging"); window.removeEventListener("pointermove", handlersRef.current.move); window.removeEventListener("pointerup", handlersRef.current.up); window.removeEventListener("pointercancel", handlersRef.current.up); }, []);

"""
VIEW_GESTURES_NEW = r""""""

VIEW_SELECT_OLD = r"""  const selectCard = (it) => (e) => {
    if (e.button !== 0 || camera.spaceHeld) return;
    if (editing === it.id) return;
    e.stopPropagation();
    if (editing) endEdit();
    setSelectedId(it.id);
  };"""
VIEW_SELECT_NEW = r"""  const selectCard = (it) => (e) => {
    if (e.button !== 0 || camera.spaceHeld) return;
    if (editing === it.id) return;
    e.stopPropagation();
    if (editing) endEdit();
    drawing.deselect();
    setSelectedId(it.id);
  };"""

VIEW_BEGINDRAG_OLD = r"""    e.stopPropagation();
    if (editing) endEdit();
    setSelectedId(it.id);
    if (isLocked) return;
    const startX = e.clientX, startY = e.clientY;
    const box = (e.currentTarget.closest("[data-item]") || e.currentTarget).getBoundingClientRect();"""
VIEW_BEGINDRAG_NEW = r"""    e.stopPropagation();
    if (editing) endEdit();
    drawing.deselect();
    setSelectedId(it.id);
    if (isLocked) return;
    const startX = e.clientX, startY = e.clientY;
    const box = (e.currentTarget.closest("[data-item]") || e.currentTarget).getBoundingClientRect();"""

VIEW_DROP_OLD = r"""        const over = dropTarget(ev.clientX, ev.clientY, it);
        if (over && over.columnId) apply(tabulaMoveTo(stemma, it.id, { columnId: over.columnId, index: over.index }));
        else if (over && over.boardId) {
          const target = tabulaBoardNode(stemma.root, over.boardId);
          if (target) { const l = boardLanding(target, over.edge, w); apply(tabulaMoveTo(stemma, it.id, { boardId: over.boardId, x: l.x, y: l.y, w })); }
        }
        else { const p = at(ev); apply(tabulaMoveTo(stemma, it.id, { boardId: board.id, x: tabulaSnap(p.x), y: tabulaSnap(p.y), w })); }"""
VIEW_DROP_NEW = r"""        const over = dropTarget(ev.clientX, ev.clientY, it);
        // the ends stuck to the card as drawn before the press, for the day it leaves the board
        const ends = drawing.endsFor(tabulaIdsBelow(it));
        if (over && over.columnId) apply(tabulaMoveTo(stemma, it.id, { columnId: over.columnId, index: over.index }, ends));
        else if (over && over.boardId) {
          const target = tabulaBoardNode(stemma.root, over.boardId);
          if (target) { const l = boardLanding(target, over.edge, w); apply(tabulaMoveTo(stemma, it.id, { boardId: over.boardId, x: l.x, y: l.y, w }, ends)); }
        }
        else { const p = at(ev); apply(tabulaMoveTo(stemma, it.id, { boardId: board.id, x: tabulaSnap(p.x), y: tabulaSnap(p.y), w }, ends)); }"""

VIEW_PANE_OLD = r"""  const onPanePointerDown = (e) => {
    if (e.target && e.target.closest && e.target.closest(".tabula-card, .tabula-ui")) return;
    if (e.button !== 0) return;
    if (editing) endEdit();
    setSelectedId(null);
    if (picker) setPicker(null);
    if (paneRef.current) paneRef.current.focus();
  };
  const onPaneDoubleClick = (e) => {
    if (e.target && e.target.closest && e.target.closest(".tabula-card, .tabula-ui")) return;
    const p = camera.toCanvas(e.clientX, e.clientY);
    placeKind("note", p.x, p.y);
  };"""
VIEW_PANE_NEW = r"""  const onPanePointerDown = (e) => {
    if (e.target && e.target.closest && e.target.closest(".tabula-card, .tabula-ui")) return;
    if (e.button !== 0) return;
    if (editing) endEdit();
    setSelectedId(null);
    drawing.deselect();
    if (picker) setPicker(null);
    if (paneRef.current) paneRef.current.focus();
  };
  const onPaneDoubleClick = (e) => {
    if (e.target && e.target.closest && e.target.closest(".tabula-card, .tabula-ui")) return;
    if (drawing.tool !== "cards") return;  // a double-click finishes a line, or is nothing
    const p = camera.toCanvas(e.clientX, e.clientY);
    placeKind("note", p.x, p.y);
  };"""

VIEW_DELETE_OLD = r"""  const requestDelete = (it) => {
    if (!it || isLocked) return;
    const held = tabulaCountBelow(it);
    if ((it.type === "column" || it.type === "board") && (held.cards > 0 || held.columns > 0)) { setAsking(it); return; }
    apply(tabulaDeleteItem(stemma, it.id));
  };"""
VIEW_DELETE_NEW = r"""  const requestDelete = (it) => {
    if (!it || isLocked) return;
    const held = tabulaCountBelow(it);
    if ((it.type === "column" || it.type === "board") && (held.cards > 0 || held.columns > 0)) { setAsking(it); return; }
    apply(tabulaDeleteItem(stemma, it.id, drawing.endsFor(tabulaIdsBelow(it))));
  };"""

VIEW_MOVEOUT_OLD = r"""  const moveOut = () => { if (asking) apply(tabulaDeleteColumn(stemma, asking.id, columnPlacements(asking))); setAsking(null); };
  const deleteAll = () => { if (asking) apply(tabulaDeleteItem(stemma, asking.id)); setAsking(null); };

  // the selection's keys: Delete, the arrows by the grid on a placed card, Escape
  useEffect(() => {
    const typing = (t) => { const tag = t && t.tagName ? t.tagName.toUpperCase() : ""; return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !!(t && t.isContentEditable); };
    const down = (e) => {
      if (typing(e.target) || asking) return;
      if (e.key === "Escape") { if (picker) { setPicker(null); return; } if (editing) { endEdit(); return; } if (selectedId) setSelectedId(null); return; }"""
VIEW_MOVEOUT_NEW = r"""  const moveOut = () => { if (asking) apply(tabulaDeleteColumn(stemma, asking.id, columnPlacements(asking), drawing.endsFor([asking.id]))); setAsking(null); };
  const deleteAll = () => { if (asking) apply(tabulaDeleteItem(stemma, asking.id, drawing.endsFor(tabulaIdsBelow(asking)))); setAsking(null); };

  // the selection's keys: Delete, the arrows by the grid on a placed card,
  // Escape; the drawing layer's first (r032), through the latest render's
  // handler, since its state isn't among the effect's dependencies
  const latestRef = useRef(null);
  latestRef.current = { onDrawKey: drawing.onKey, requestDelete };
  useEffect(() => {
    const typing = (t) => { const tag = t && t.tagName ? t.tagName.toUpperCase() : ""; return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !!(t && t.isContentEditable); };
    const down = (e) => {
      if (typing(e.target) || asking) return;
      if (latestRef.current.onDrawKey(e)) return;
      if (e.key === "Escape") { if (picker) { setPicker(null); return; } if (editing) { endEdit(); return; } if (selectedId) setSelectedId(null); return; }"""

VIEW_KEYDELETE_OLD = r"""      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); requestDelete(selected); return; }"""
VIEW_KEYDELETE_NEW = r"""      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); latestRef.current.requestDelete(selected); return; }"""

VIEW_CARDFOR_OLD = r"""        overEdge={drag && drag.over && drag.over.boardId === it.id ? drag.over.edge : null}
        insertAt={drag && drag.over && drag.over.columnId === it.id ? drag.over.index : null}"""
VIEW_CARDFOR_NEW = r"""        overEdge={drag && drag.over && drag.over.boardId === it.id ? drag.over.edge : null}
        stick={drawing.stickId === it.id}
        insertAt={drag && drag.over && drag.over.columnId === it.id ? drag.over.index : null}"""

VIEW_RAIL_OLD = r"""            <button type="button" title="Board: a board inside this one; double-click its card to open it" onPointerDown={onRailPointerDown("board")}><span className="glyph">⊞</span>Board</button>
          </div>
        )}
        <div
          ref={paneRef}
          className={`tabula-pane${camera.dragging ? " grabbing" : (camera.spaceHeld || isLocked ? " grab" : "")}${placing ? " placing" : ""}`}"""
VIEW_RAIL_NEW = r"""            <button type="button" title="Board: a board inside this one; double-click its card to open it" onPointerDown={onRailPointerDown("board")}><span className="glyph">⊞</span>Board</button>
            <div className="tabula-rail-sep" aria-hidden="true" />
            {TABULA_TOOLS.map(t => (
              <button key={t.id} type="button" className={drawing.tool === t.id ? "active" : ""} aria-pressed={drawing.tool === t.id} title={`${t.label}: ${t.hint}`} onClick={() => pickTool(t.id)}><span className="glyph">{t.glyph}</span>{t.label}</button>
            ))}
          </div>
        )}
        <div
          ref={paneRef}
          className={`tabula-pane${camera.dragging ? " grabbing" : (camera.spaceHeld || isLocked ? " grab" : "")}${placing ? " placing" : ""}${drawing.drawTool ? " draw" : ""}`}"""

VIEW_SURFACE_OLD = r"""            {drag && drag.ghost && dragged && (
              <TabulaCard item={dragged} placed ghost dragging x={drag.x} y={drag.y} w={drag.w} pool={pool} templates={templates} onOpenEntry={onOpenEntry} dirHandle={dirHandle} imageFolder={imageFolder} />
            )}
          </div>"""
VIEW_SURFACE_NEW = r"""            {drag && drag.ghost && dragged && (
              <TabulaCard item={dragged} placed ghost dragging x={drag.x} y={drag.y} w={drag.w} pool={pool} templates={templates} onOpenEntry={onOpenEntry} dirHandle={dirHandle} imageFolder={imageFolder} />
            )}
            <TabulaDrawLayer d={drawing} view={view} boardId={board.id} />
          </div>"""

VIEW_EMPTY_OLD = r"""          {items.length === 0 && !isLocked && ("""
VIEW_EMPTY_NEW = r"""          {items.length === 0 && drawing.shapes.length === 0 && !isLocked && ("""

VIEW_PANEL_OLD = r"""            onReplaceImage={() => replaceImage(selected)}
            onOpenBoard={drillIn}
          />
        )}
      </div>"""
VIEW_PANEL_NEW = r"""            onReplaceImage={() => replaceImage(selected)}
            onOpenBoard={drillIn}
          />
        )}
        {!selected && !isLocked && drawing.panelOpen && (
          <TabulaShapePanel d={drawing} onClose={() => { if (drawing.selectedShape) drawing.deselect(); else drawing.setTool("cards"); }} />
        )}
      </div>"""

# ═══════════════════════════════════════════════════════════════════════════════
# shell.html
# ═══════════════════════════════════════════════════════════════════════════════

CSS_OLD = r""".tabula-edge-bottom{bottom:-4px;left:-2px;right:-2px;height:3px}
"""
CSS_NEW = r""".tabula-edge-bottom{bottom:-4px;left:-2px;right:-2px;height:3px}
.tabula-draw{position:absolute;pointer-events:none;overflow:visible;user-select:none}
.tabula-draw.draw{pointer-events:all;cursor:crosshair}
.tabula-draw.select [data-shape],.tabula-draw.select [data-hit]{pointer-events:auto;cursor:move}
.tabula-draw.select [data-vertex]{pointer-events:auto;cursor:crosshair}
.tabula-draw.live [data-hit],.tabula-draw.live [data-vertex]{pointer-events:none}
.tabula-pane.draw{cursor:crosshair}
.tabula-card.stick,.tabula-colitem.stick{outline:2px solid var(--accent);outline-offset:3px;box-shadow:0 0 0 6px var(--accent-glow)}
.tabula-rail-sep{width:28px;height:1px;background:var(--border2);margin:2px 0;flex-shrink:0}
.tabula-rail button.active{color:var(--accent);border-color:var(--accent);background:var(--accent-glow)}
.tabula-seg{display:flex;gap:4px;flex-wrap:wrap}
.tabula-range{flex:1;min-width:0}
"""


def main():
    edit(MODULES / "18_cartographia" / "00_model.jsx", [(MODEL_OLD, MODEL_NEW)])
    edit(MODULES / "18_cartographia" / "01_renderer.jsx", [
        (RENDER_HEADS_OLD, RENDER_HEADS_NEW),
        (RENDER_STROKE_OLD, RENDER_STROKE_NEW),
    ])
    edit(MODULES / "18_cartographia" / "02_tools.jsx", [
        (TOOLS_HINT_OLD, TOOLS_HINT_NEW),
        (TOOLS_DESCRIBE_OLD, TOOLS_DESCRIBE_NEW),
        (TOOLS_STYLE_OLD, TOOLS_STYLE_NEW),
        (TOOLS_CURRENT_OLD, TOOLS_CURRENT_NEW),
        (TOOLS_FREEHAND_OLD, TOOLS_FREEHAND_NEW),
        (TOOLS_DRAFT_OLD, TOOLS_DRAFT_NEW),
        (TOOLS_GROUP_OLD, TOOLS_GROUP_NEW),
        (TOOLS_OVERLAY_OLD, TOOLS_OVERLAY_NEW),
    ])
    edit(MODULES / "21_stemma.jsx", [
        (DOC_HEAD_OLD, DOC_HEAD_NEW),
        (CONST_OLD, CONST_NEW),
        (SHAPE_HELPERS_OLD, SHAPE_HELPERS_NEW),
        (COERCE_BOARD_OLD, COERCE_BOARD_NEW),
        (DELETE_ITEM_OLD, DELETE_ITEM_NEW),
        (MOVETO_SIG_OLD, MOVETO_SIG_NEW),
        (MOVETO_END_OLD, MOVETO_END_NEW),
        (DELETE_COLUMN_OLD, DELETE_COLUMN_NEW),
        (DELETE_COLUMN_END_OLD, DELETE_COLUMN_END_NEW),
        (SHAPE_TRANSFORMS_OLD, SHAPE_TRANSFORMS_NEW),
        (REGEN_OLD, REGEN_NEW),
        (CARD_SIG_OLD, CARD_SIG_NEW),
        (CARD_CLS_OLD, CARD_CLS_NEW),
        (VIEW_INTRO_OLD, VIEW_INTRO_NEW),
        (VIEW_STATE_OLD, VIEW_STATE_NEW),
        (VIEW_DRAWING_OLD, VIEW_DRAWING_NEW),
        (VIEW_BOARDCHANGE_OLD, VIEW_BOARDCHANGE_NEW),
        (VIEW_EDITREF_OLD, VIEW_EDITREF_NEW),
        (VIEW_GESTURES_OLD, VIEW_GESTURES_NEW),
        (VIEW_SELECT_OLD, VIEW_SELECT_NEW),
        (VIEW_BEGINDRAG_OLD, VIEW_BEGINDRAG_NEW),
        (VIEW_DROP_OLD, VIEW_DROP_NEW),
        (VIEW_PANE_OLD, VIEW_PANE_NEW),
        (VIEW_DELETE_OLD, VIEW_DELETE_NEW),
        (VIEW_MOVEOUT_OLD, VIEW_MOVEOUT_NEW),
        (VIEW_KEYDELETE_OLD, VIEW_KEYDELETE_NEW),
        (VIEW_CARDFOR_OLD, VIEW_CARDFOR_NEW),
        (VIEW_RAIL_OLD, VIEW_RAIL_NEW),
        (VIEW_SURFACE_OLD, VIEW_SURFACE_NEW),
        (VIEW_EMPTY_OLD, VIEW_EMPTY_NEW),
        (VIEW_PANEL_OLD, VIEW_PANEL_NEW),
    ])
    edit(ROOT / "cartulary-src" / "shell.html", [(CSS_OLD, CSS_NEW)])
    print("r032 applied: the drawing layer over the cards, sticky ends, arrowheads on the shared stroke")


if __name__ == "__main__":
    main()
