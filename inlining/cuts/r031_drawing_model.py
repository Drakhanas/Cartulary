#!/usr/bin/env python3
"""
r031: the map drawing data model (v1.6 pillar 3, cut 1 of docs/cartographia-plus-spec.md).

A content edit, gated by `build_inline.py edit`. Declared scope:
  16_trunk      the model block (constants, factories, normalizers) at the head of the
                cartographia run, under its own section header
  10_migrate    backfill mapData.drawing on every map record; backfill state.mapStamps
  12_trunk      createMap seeds the drawing; saveMap normalizes
  09_trunk      record-shape comment; mapStamps on fresh worlds
Declared declaration additions: MAP_PALETTE, MAP_BACKGROUND_PRESETS, MAP_STROKE_WIDTHS,
MAP_TEXT_SIZES, MAP_SHAPE_TYPES, MAP_DRAWING_DEFAULT_SIZE, makeDefaultMapLayer,
makeDefaultDrawing, ensureMapShape, ensureDrawingShape, ensureMapData,
makeDefaultMapData, ensureMapStamps.

Every edit is string-anchored (each anchor must occur exactly once) and replaces inside
the text, so no file's trailing-newline state changes. Refuses to run twice.
"""
import sys
from pathlib import Path

M = Path(__file__).resolve().parent.parent.parent / 'cartulary-src' / 'modules'


def edit(name, old, new):
    p = M / name
    t = p.read_text(encoding='utf-8')
    n = t.count(old)
    if n != 1:
        raise SystemExit(f"{name}: anchor occurs {n} times, expected 1:\n{old[:120]!r}")
    p.write_text(t.replace(old, new), encoding='utf-8')
    print(f"  {name}: edited")


t16 = (M / '16_trunk.jsx').read_text(encoding='utf-8')
if 'function ensureDrawingShape' in t16:
    raise SystemExit('already applied')

# ---------------------------------------------------------------- 16_trunk
MODEL = r'''
// ─── Map drawing model (v1.6 pillar 3) ─────────────────────────────────────────
// The vector drawing under a map's pins. Pure data: mapData.drawing is a
// viewBox-sized canvas with a background and ordered layers of shapes. The
// renderer (cut 2) and the editor (cuts 3+) consume it, migrate() backfills it
// on load, and ensureMapData() coerces anything malformed to defaults on read
// rather than throwing (defensive validation before state touches). Pins stay
// 0-1 normalized to the canvas rect and are NOT part of the drawing. Build
// sheet: docs/cartographia-plus-spec.md.

// The fixed palette the editor offers. Stored as hex on each shape, so a stamp
// pack can carry colors outside it; the palette constrains authoring, not data.
const MAP_PALETTE = [
  { id: "ink",       label: "Ink",       hex: "#2b2420" },
  { id: "sepia",     label: "Sepia",     hex: "#6b4e2e" },
  { id: "parchment", label: "Parchment", hex: "#e8dcc0" },
  { id: "forest",    label: "Forest",    hex: "#4f6b3a" },
  { id: "water",     label: "Water",     hex: "#5b7f99" },
  { id: "stone",     label: "Stone",     hex: "#8a8378" },
  { id: "blood",     label: "Blood",     hex: "#8c3b2e" },
  { id: "chalk",     label: "Chalk",     hex: "#f4efe4" },
];

// Background presets for image-less maps: a fill plus a grain amount (0-1) for
// the feTurbulence texture the renderer lays over it. Not drawn under an image.
const MAP_BACKGROUND_PRESETS = [
  { id: "white",     label: "White",     fill: "#ffffff", grain: 0 },
  { id: "vellum",    label: "Vellum",    fill: "#f1e9d6", grain: 0.25 },
  { id: "parchment", label: "Parchment", fill: "#e8dcc0", grain: 0.45 },
];
const MAP_STROKE_WIDTHS = [2, 4, 8];        // viewBox units
const MAP_TEXT_SIZES = [24, 36, 56];        // viewBox units, Cormorant Garamond
const MAP_SHAPE_TYPES = ["rect", "ellipse", "polygon", "stroke", "text", "stamp"];
// Default canvas for a map with no image. With an image, the renderer sets the
// drawing's size to the image's natural pixel size the first time it loads
// while the drawing is still empty (cut 2); after that the size is fixed,
// because pins are normalized to the canvas rect and would move otherwise.
const MAP_DRAWING_DEFAULT_SIZE = { width: 1600, height: 1000 };

function makeDefaultMapLayer(name) {
  return { id: `layer-${genId().slice(-6)}`, name: name || "Drawing", visible: true, locked: false, shapes: [] };
}

function makeDefaultDrawing(width, height) {
  const preset = MAP_BACKGROUND_PRESETS[1]; // vellum
  return {
    width: Number.isFinite(width) && width > 0 ? Math.round(width) : MAP_DRAWING_DEFAULT_SIZE.width,
    height: Number.isFinite(height) && height > 0 ? Math.round(height) : MAP_DRAWING_DEFAULT_SIZE.height,
    background: { fill: preset.fill, grain: preset.grain },
    layers: [makeDefaultMapLayer("Drawing")],
  };
}

// One shape, coerced to its type's field set. Returns null for a shape that
// cannot be rendered (unknown type, a polygon with fewer than three points, a
// stamp with no stamp id); the caller drops those. Everything else lands on a
// default rather than failing, and a well-formed shape round-trips unchanged.
function ensureMapShape(s) {
  if (!s || typeof s !== "object") return null;
  const type = MAP_SHAPE_TYPES.includes(s.type) ? s.type : null;
  if (!type) return null;
  const num = (v, d) => (Number.isFinite(v) ? v : d);
  const hex = (v) => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : null);
  const pick = (v, list, d) => (list.includes(v) ? v : d);
  const out = {
    id: (typeof s.id === "string" && s.id) ? s.id : `shape-${genId().slice(-6)}`,
    type,
    fill: hex(s.fill),
    stroke: hex(s.stroke),
    strokeWidth: pick(s.strokeWidth, MAP_STROKE_WIDTHS, 4),
  };
  if (type === "rect" || type === "ellipse" || type === "text" || type === "stamp") {
    out.x = num(s.x, 0);
    out.y = num(s.y, 0);
  }
  if (type === "rect" || type === "ellipse" || type === "stamp") {
    out.w = Math.max(1, num(s.w, 100));
    out.h = Math.max(1, num(s.h, 100));
  }
  if (type === "rect" || type === "polygon" || type === "stroke") {
    out.smooth = s.smooth === true;
  }
  if (type === "polygon" || type === "stroke") {
    const pts = (Array.isArray(s.points) ? s.points : [])
      .filter(p => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]))
      .map(p => [p[0], p[1]]);
    if (pts.length < (type === "polygon" ? 3 : 2)) return null;
    out.points = pts;
  }
  if (type === "text") {
    out.text = typeof s.text === "string" ? s.text : "";
    out.fontSize = pick(s.fontSize, MAP_TEXT_SIZES, 36);
    out.rotation = num(s.rotation, 0);
  }
  if (type === "stamp") {
    if (typeof s.stampId !== "string" || !s.stampId) return null;
    out.stampId = s.stampId;
    out.rotation = num(s.rotation, 0);
  }
  return out;
}

// The whole drawing, coerced. Ids are preserved where present and minted where
// absent, so a second pass over the result changes nothing; migrate() relies
// on that.
function ensureDrawingShape(drawing) {
  const src = (drawing && typeof drawing === "object") ? drawing : {};
  const num = (v, d) => (Number.isFinite(v) ? v : d);
  const hex = (v) => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : null);
  const preset = MAP_BACKGROUND_PRESETS[1];
  const bg = (src.background && typeof src.background === "object") ? src.background : {};
  const layersSrc = (Array.isArray(src.layers) ? src.layers : []).filter(l => l && typeof l === "object");
  const layers = layersSrc.map((l, i) => ({
    id: (typeof l.id === "string" && l.id) ? l.id : `layer-${genId().slice(-6)}`,
    name: (typeof l.name === "string" && l.name.trim()) ? l.name : `Layer ${i + 1}`,
    visible: l.visible !== false,
    locked: l.locked === true,
    shapes: (Array.isArray(l.shapes) ? l.shapes : []).map(ensureMapShape).filter(Boolean),
  }));
  if (layers.length === 0) layers.push(makeDefaultMapLayer("Drawing"));
  return {
    width: Math.max(1, Math.round(num(src.width, MAP_DRAWING_DEFAULT_SIZE.width))),
    height: Math.max(1, Math.round(num(src.height, MAP_DRAWING_DEFAULT_SIZE.height))),
    background: {
      fill: hex(bg.fill) || preset.fill,
      grain: Math.max(0, Math.min(1, num(bg.grain, preset.grain))),
    },
    layers,
  };
}

// mapData as every consumer may assume it: image (string or null, as the r001
// migration kept it), pins (array, untouched here), drawing (normalized).
function ensureMapData(md) {
  const src = (md && typeof md === "object") ? md : {};
  return {
    image: typeof src.image === "string" ? src.image : null,
    pins: Array.isArray(src.pins) ? src.pins : [],
    drawing: ensureDrawingShape(src.drawing),
  };
}

function makeDefaultMapData() {
  return ensureMapData(null);
}

// state.mapStamps: stamps imported from stamp packs, world-scoped. Shape-checked
// here; the import sanitizer (allowlisted elements and attributes) arrives with
// stamp packs (cut 6) and runs on import and on load. Until then nothing renders
// a stamp, so an unsanitized body cannot reach a page.
function ensureMapStamps(list) {
  return (Array.isArray(list) ? list : [])
    .filter(s => s && typeof s === "object" && typeof s.id === "string" && s.id)
    .map(s => ({
      id: s.id,
      name: (typeof s.name === "string" && s.name.trim()) ? s.name : s.id,
      viewBox: typeof s.viewBox === "string" ? s.viewBox : "0 0 64 64",
      body: typeof s.body === "string" ? s.body : "",
    }));
}
'''

edit('16_trunk.jsx',
     "\n// ─── Map view ──────────────────────────────────────────────────────────────────\n\nfunction useMapImageUrl(",
     MODEL + "\n// ─── Map view ──────────────────────────────────────────────────────────────────\n\nfunction useMapImageUrl(")

# --------------------------------------------------------------- 10_migrate
edit('10_migrate.jsx',
     "      state.templates = state.templates.filter(t => !(t && t.kind === \"map\"));\n    }\n  }\n",
     "      state.templates = state.templates.filter(t => !(t && t.kind === \"map\"));\n    }\n  }\n"
     "  // Map drawing model (v1.6 pillar 3, r031): every map record carries\n"
     "  // mapData.drawing. Backfilled through ensureMapData so a pre-pillar-3 world\n"
     "  // loads with an empty default drawing (one layer, vellum background) and a\n"
     "  // malformed drawing coerces to defaults rather than throwing. Idempotent:\n"
     "  // a normalized record passes through unchanged. Null entries in the slice\n"
     "  // are dropped; records are never dropped.\n"
     "  state.cartographia = state.cartographia\n"
     "    .filter(m => m && typeof m === \"object\")\n"
     "    .map(m => ({ ...m, mapData: ensureMapData(m.mapData) }));\n"
     "  // Imported map stamps (v1.6 pillar 3). Empty until stamp packs land.\n"
     "  state.mapStamps = ensureMapStamps(state.mapStamps);\n")

# ----------------------------------------------------------------- 12_trunk
edit('12_trunk.jsx',
     "    const draft = { id, name: \"\", tags: [], fields: {}, mapData: { image: null, pins: [] } };\n",
     "    const draft = { id, name: \"\", tags: [], fields: {}, mapData: makeDefaultMapData() };\n")
edit('12_trunk.jsx',
     "      mapData: mapDraft.mapData || { image: null, pins: [] },\n",
     "      mapData: ensureMapData(mapDraft.mapData),\n")

# ----------------------------------------------------------------- 09_trunk
edit('09_trunk.jsx',
     "//   { id, name, tags:[], fields:{}, mapData:{image,pins}, updatedAt }\n",
     "//   { id, name, tags:[], fields:{}, mapData:{image,pins,drawing}, updatedAt }\n"
     "// mapData.drawing (v1.6 pillar 3) is the vector drawing under the pins; its\n"
     "// shape and normalizers live with the Cartographia view (ensureMapData).\n")
edit('09_trunk.jsx',
     "  // Cartographia map slice (v1.6 r001). See makeDefaultCartographiaState.\n  cartographia: makeDefaultCartographiaState(),\n});",
     "  // Cartographia map slice (v1.6 r001). See makeDefaultCartographiaState.\n  cartographia: makeDefaultCartographiaState(),\n"
     "  // Map stamps imported from stamp packs (v1.6 pillar 3). World-scoped,\n"
     "  // [{id, name, viewBox, body}]. Empty on fresh worlds; see ensureMapStamps.\n"
     "  mapStamps: [],\n});")

print('r031 applied')
