"""v1.7 r029: Tabula I, the board's document, index, and canvas.

Stemma v2's fourth cut (docs/stemma-v2-spec.md, sections 3, 4, and 6; the
plan's item 4, approved 2026-10-27). Stemma's second kind of document: a
tabula is a document in state.stemmas with layout "tabula" whose root is a
board node holding items placed by position, in z-order. This cut brings the
document shape with load-time normalization for both layouts, the version-2
export envelope and the import of both, the index with two buttons (+ New
Rota, + New Tabula), a layout badge and a count in each layout's own terms,
and the canvas: an unbounded surface with the map editor's camera grammar
(Ctrl+wheel about the pointer, pinch, + - 0, middle button or Space to pan,
plain wheel pans), a tool rail with Note, Link, and Image (click places at
the view's center, drag places at the drop, double-click on empty canvas
makes a note, an image file dropped on the canvas becomes an image card),
single selection with the inspector, in-place editing of a note, drag to
move (the dragged card comes to the top), a width handle, the 10-pixel
snap, undo through the r026 path, the locked view, and pan and zoom
remembered per board in the display settings. Columns, sub-boards, the
drawing layer, and multi-select are the next three cuts.

What the cut decides, of the spec's section 13: default widths 280 (note,
linked, board), 320 (image), 300 (column), a floor of 160 (80 for an image)
and a ceiling of 800; the card's color control is the rota's swatches
(COLORS), default the gold; the zoom step is the rota's 1.15; the snap ships
on; a new tabula opens empty.

- 21_stemma: two sections, "Tabula: the document" (constants, the
  load-time and import normalizers, walkers, counts, transforms) and
  "Tabula: the canvas" (the camera hook, the card, the inspector, the
  canvas view); the shared helpers (id regeneration, missing links, linked
  targets, the import normalizer) learn a board; the smart input says what
  Enter alone makes in the caller's words; the index.
- 12_trunk: createStemma takes the layout; the render site chooses the
  canvas by layout; export writes envelope 2 for a tabula; import takes 1
  and 2 and names a newer version, and its orphan flashes count cards for a
  tabula; prefs gain tabulaViews, and a tabula's delete drops its boards'
  entries there.
- 10_migrate: ensureStemmas on every load, before Fabula's slice.
- shell.html: the board's CSS.

Declared scope: 21_stemma, 12_trunk, 10_migrate, shell.html.
Declarations added (21_stemma): TABULA, TABULA_ITEM_TYPES, tabulaInt,
tabulaHex, tabulaStr, tabulaCoerceItem, tabulaEnsureDocument,
ensureStemmas, tabulaNormalizeImported, tabulaWalk, tabulaFindItem,
tabulaBoardNode, tabulaRewrite, tabulaCounts, tabulaNewDocument,
tabulaAddItem, tabulaUpdateItem, tabulaDeleteItem, tabulaMoveItem,
tabulaConvertToNote, tabulaRelink, tabulaSnap, tabulaClampWidth,
useTabulaCamera, TabulaCard, TabulaInspector, TabulaCanvasView.

String-anchored edits; every anchor must occur exactly once. Run from
anywhere inside the repository:
    python3 inlining/cuts/v1.7_r029_tabula_one.py
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


def header(title):
    line = f"// ─── {title} "
    return line + "─" * (82 - len(line))


# ═══════════════════════════════════════════════════════════════════════════════
# 21_stemma: the shared helpers learn a board
# ═══════════════════════════════════════════════════════════════════════════════

REGEN_OLD = """const regenerateStemmaIds = (stemma) => {
  const walkNode = (node) => ({
    ...node,
    id: `n-${genId()}`,
    children: Array.isArray(node.children) ? node.children.map(walkNode) : [],
  });
  return {
    ...stemma,
    id: `stem-${genId()}`,
    root: walkNode(stemma.root),
  };
};
"""
REGEN_NEW = """const regenerateStemmaIds = (stemma) => {
  const walkNode = (node) => ({
    ...node,
    id: `n-${genId()}`,
    children: Array.isArray(node.children) ? node.children.map(walkNode) : [],
  });
  // v1.7 r029: a tabula's items, columns' and boards' included, each with a
  // fresh id; r031's shapes keep theirs, as a map's do.
  const walkItem = (it) => ({
    ...it,
    id: `n-${genId()}`,
    ...(Array.isArray(it.items) ? { items: it.items.map(walkItem) } : {}),
  });
  if (stemma.layout === "tabula") {
    return { ...stemma, id: `stem-${genId()}`, root: walkItem(stemma.root) };
  }
  return {
    ...stemma,
    id: `stem-${genId()}`,
    root: walkNode(stemma.root),
  };
};
"""

IMPORT_HEAD_OLD = """  if (typeof cloned.description !== "string") cloned.description = "";
  if (!Array.isArray(cloned.tags)) cloned.tags = [];
  else cloned.tags = cloned.tags.filter(t => typeof t === "string" && t.trim()).map(t => t.trim());
  if (typeof cloned.createdAt !== "string") cloned.createdAt = isoNow();
  if (typeof cloned.updatedAt !== "string") cloned.updatedAt = isoNow();

  // Validate the tree recursively. Returns null on success, error string on"""
IMPORT_HEAD_NEW = """  if (typeof cloned.description !== "string") cloned.description = "";
  if (!Array.isArray(cloned.tags)) cloned.tags = [];
  else cloned.tags = cloned.tags.filter(t => typeof t === "string" && t.trim()).map(t => t.trim());
  if (typeof cloned.createdAt !== "string") cloned.createdAt = isoNow();
  if (typeof cloned.updatedAt !== "string") cloned.updatedAt = isoNow();

  // v1.7 r029: a tabula has its own shape and its own normalizer, as strict
  // as this one; a layout that isn't a rota's or a tabula's is refused.
  if (cloned.layout === "tabula") return tabulaNormalizeImported(cloned);
  if (cloned.layout !== undefined && cloned.layout !== null && cloned.layout !== "rota") {
    return { ok: false, error: `Imported stemma has an unknown layout "${cloned.layout}".` };
  }
  delete cloned.layout;

  // Validate the tree recursively. Returns null on success, error string on"""

MISSING_OLD = """const collectStemmaMissingRefs = (stemma, entries) => {
  const known = new Set((entries || []).map(e => e.id));
  const missing = [];
  const walk = (node) => {
    if (!node) return;
    if (node.type === "linked" && node.entryId && !known.has(node.entryId)) {
      missing.push({ entryId: node.entryId, cachedName: node._cachedName || "(unknown)" });
    }
    (node.children || []).forEach(walk);
  };
  walk(stemma.root);
  return missing;
};
"""
MISSING_NEW = """const collectStemmaMissingRefs = (stemma, entries) => {
  const known = new Set((entries || []).map(e => e.id));
  const missing = [];
  const walk = (node) => {
    if (!node) return;
    if (node.type === "linked" && node.entryId && !known.has(node.entryId)) {
      missing.push({ entryId: node.entryId, cachedName: node._cachedName || "(unknown)" });
    }
    (node.children || []).forEach(walk);
  };
  if (stemma.layout === "tabula") {
    tabulaWalk(stemma.root, (it) => { if (it.type === "linked" && it.entryId && !known.has(it.entryId)) missing.push({ entryId: it.entryId, cachedName: it._cachedName || "(unknown)" }); });
    return missing;
  }
  walk(stemma.root);
  return missing;
};
"""

TARGETS_OLD = """// delete message for the nodes elsewhere that would orphan. Walks the radial
// tree; r029 teaches it a board's items.
const stemmaLinkedTargets = (stemma) => {
  const out = new Set();
  const walk = (node) => {
    if (!node) return;
    if (node.type === "linked" && node.entryId) out.add(node.entryId);
    (node.children || []).forEach(walk);
  };
  walk(stemma && stemma.root);
  return out;
};
"""
TARGETS_NEW = """// delete message for the nodes elsewhere that would orphan. Walks the radial
// tree, or a board's items (r029).
const stemmaLinkedTargets = (stemma) => {
  const out = new Set();
  const walk = (node) => {
    if (!node) return;
    if (node.type === "linked" && node.entryId) out.add(node.entryId);
    (node.children || []).forEach(walk);
  };
  if (stemma && stemma.layout === "tabula") tabulaWalk(stemma.root, (it) => { if (it.type === "linked" && it.entryId) out.add(it.entryId); });
  else walk(stemma && stemma.root);
  return out;
};
"""

SMART_SIG_OLD = """function StemmaSmartInput({ cx, cy, entries, onCommitFreeform, onCommitLinked, onCancel }) {
  const [text, setText] = useState("");"""
SMART_SIG_NEW = """function StemmaSmartInput({ cx, cy, entries, onCommitFreeform, onCommitLinked, onCancel, freeform }) {
  // v1.7 r029: what Enter alone makes, in the caller's words; the rota's
  // freeform node by default, the tabula's note.
  const freeformName = (freeform && freeform.long) || "a freeform node";
  const freeformShort = (freeform && freeform.short) || "freeform";
  const [text, setText] = useState("");"""
SMART_FOOT_OLD = """            ↑↓ pick · Enter alone = freeform · Esc cancels"""
SMART_FOOT_NEW = """            ↑↓ pick · Enter alone = {freeformShort} · Esc cancels"""
SMART_HINT_OLD = """          Press Enter to add "{text.trim()}" as a freeform node"""
SMART_HINT_NEW = """          Press Enter to add "{text.trim()}" as {freeformName}"""

# ═══════════════════════════════════════════════════════════════════════════════
# 21_stemma: the index
# ═══════════════════════════════════════════════════════════════════════════════

INDEX_SIG_OLD = """// open. Header has Import (file picker) and + New Stemma; both gated on
// !isLocked. Empty state suggests both creation paths.

function StemmaIndexView({ state, isLocked, onOpen, onCreate, onImport, onExport, onDelete }) {"""
INDEX_SIG_NEW = """// open. Header has Import (file picker) and, since v1.7's r029, + New Rota and
// + New Tabula; all gated on !isLocked. Empty state suggests both creation
// paths. Each row is marked with its layout and counted in its own terms:
// nodes for a rota, cards (and columns, from r030) for a tabula.

function StemmaIndexView({ state, isLocked, onOpen, onCreate, onImport, onExport, onDelete }) {"""

INDEX_LEAD_OLD = """          Freeform mind maps for plot threads, theme webs, organizational hierarchies — anything tree-shaped. A stemma is a radial tree with a focal node at the center; click into any node to drill in and re-center on it."""
INDEX_LEAD_NEW = """          Freeform mind maps for plot threads, theme webs, organizational hierarchies — anything tree-shaped. A rota is a radial tree with a focal node at the center; click into any node to drill in and re-center on it. A tabula is a board: cards where you put them, for the thinking that doesn't fit a tree."""

INDEX_BUTTONS_OLD = """            <button className="btn btn-accent" onClick={onCreate}>+ New Stemma</button>"""
INDEX_BUTTONS_NEW = """            <button className="btn btn-accent" onClick={() => onCreate("rota")}>+ New Rota</button>
            <button className="btn btn-accent" onClick={() => onCreate("tabula")}>+ New Tabula</button>"""

INDEX_EMPTY_OLD = """          No stemmas yet.{!isLocked && " Click + New Stemma above to create one, or Import an existing stemma JSON."}"""
INDEX_EMPTY_NEW = """          No stemmas yet.{!isLocked && " Click + New Rota or + New Tabula above to create one, or Import an existing stemma JSON."}"""

INDEX_ROW_OLD = """            const nodeCount = countStemmaNodes(s);
            return ("""
INDEX_ROW_NEW = """            const isTabula = s.layout === "tabula";
            const nodeCount = isTabula ? 0 : countStemmaNodes(s);
            const counts = isTabula ? tabulaCounts(s) : null;
            const countText = isTabula
              ? `${counts.cards} ${counts.cards === 1 ? "card" : "cards"}${counts.columns > 0 ? ` · ${counts.columns} ${counts.columns === 1 ? "column" : "columns"}` : ""}`
              : `${nodeCount} ${nodeCount === 1 ? "node" : "nodes"}`;
            return ("""

INDEX_NAME_OLD = """                    <div style={{ fontSize: 15, fontWeight: 500 }}>{s.name || "(unnamed stemma)"}</div>
                    <div style={{ fontSize: 12, color: "var(--text-dim)", whiteSpace: "nowrap" }}>
                      {nodeCount} {nodeCount === 1 ? "node" : "nodes"}
                      {s.updatedAt && <span> · updated {fmtDate(s.updatedAt)}</span>}"""
INDEX_NAME_NEW = """                    <div style={{ fontSize: 15, fontWeight: 500, display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name || "(unnamed stemma)"}</span>
                      <span className="tabula-badge" title={isTabula ? "A board" : "A radial tree"}>{isTabula ? "Tabula" : "Rota"}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-dim)", whiteSpace: "nowrap" }}>
                      {countText}
                      {s.updatedAt && <span> · updated {fmtDate(s.updatedAt)}</span>}"""

# ═══════════════════════════════════════════════════════════════════════════════
# 21_stemma: the two Tabula sections, appended after the index
# ═══════════════════════════════════════════════════════════════════════════════

TABULA_DOCUMENT = "\n\n" + header("Tabula: the document (v1.7 r029)") + r"""
// Stemma's second kind of document (docs/stemma-v2-spec.md, sections 3 and
// 4): a board in Milanote's structure, a document in state.stemmas with
// layout "tabula" whose root is a board node holding items placed by
// position, in z-order, and (from r031) a drawing layer. Items: a note (a
// title and a Markdown body), a linked card (the rota's linked node, pointed
// at any registered record), an image (a file in the images folder or a data
// URL), and, from r030, a column and a sub-board. x, y, w are integers in
// canvas pixels at zoom 1, unbounded; heights are never stored. Absent
// `layout` is a rota, so nothing migrates. This section holds the shape's
// constants, the load-time normalizer (coerce, never throw, as ensureMapData
// does for a map), the import normalizer (strict, as the rota's), the
// walkers, the counts, and the transforms the canvas commits through
// useMapHistory, as the rota's canvas does since r026.

const TABULA = {
  grid: 10,                                  // the snap, in canvas pixels, at a drop or a resize
  zoomMin: 0.25, zoomMax: 2, zoomStep: 1.15, // the camera's range and its step, the rota's
  fitMargin: 80,                             // around the cards when the view fits them
  dragSlop: 3,                               // pixels before a press is a drag
  width: { note: 280, linked: 280, image: 320, column: 300, board: 280 },
  minWidth: { note: 160, linked: 160, image: 80, column: 160, board: 160 },
  maxWidth: 800,
  color: "#c8a96e",
  icon: "✦",                            // ✦
};
const TABULA_ITEM_TYPES = ["note", "linked", "image", "column", "board"];

const tabulaInt = (v, d) => (Number.isFinite(v) ? Math.round(v) : d);
const tabulaHex = (v, d) => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : d);
const tabulaStr = (v, d = "") => (typeof v === "string" ? v : d);
const tabulaSnap = (v) => Math.round(v / TABULA.grid) * TABULA.grid;
const tabulaClampWidth = (type, w) => Math.max(TABULA.minWidth[type] || 160, Math.min(TABULA.maxWidth, w));

// One item coerced to its type's field set, a new object. `placed` says the
// item sits on a canvas (x, y, w matter); inside a column it keeps none.
// An item of a type this build doesn't know is kept as it is and not drawn,
// so a file from a newer build loses nothing here; null is returned only for
// something that isn't an object at all.
const tabulaCoerceItem = (it, placed) => {
  if (!it || typeof it !== "object") return null;
  const type = typeof it.type === "string" ? it.type : "note";
  if (!TABULA_ITEM_TYPES.includes(type)) return { ...it, id: tabulaStr(it.id) || `n-${genId()}` };
  const out = { ...it, id: tabulaStr(it.id) || `n-${genId()}`, type };
  if (placed) {
    out.x = tabulaInt(it.x, 0);
    out.y = tabulaInt(it.y, 0);
    out.w = tabulaClampWidth(type, tabulaInt(it.w, TABULA.width[type]));
  } else {
    delete out.x; delete out.y; delete out.w;
  }
  if (type === "note") {
    out.title = tabulaStr(it.title);
    out.body = tabulaStr(it.body);
    out.color = tabulaHex(it.color, TABULA.color);
  } else if (type === "linked") {
    out.entryId = tabulaStr(it.entryId);
    out._cachedName = tabulaStr(it._cachedName);
  } else if (type === "image") {
    out.image = tabulaStr(it.image);
    out.caption = tabulaStr(it.caption);
  } else if (type === "column") {
    out.title = tabulaStr(it.title);
    out.color = tabulaHex(it.color, TABULA.color);
    out.items = (Array.isArray(it.items) ? it.items : []).map(c => tabulaCoerceItem(c, false)).filter(Boolean);
  } else if (type === "board") {
    out.title = tabulaStr(it.title);
    out.color = tabulaHex(it.color, TABULA.color);
    out.icon = tabulaStr(it.icon, TABULA.icon) || TABULA.icon;
    out.items = (Array.isArray(it.items) ? it.items : []).map(c => tabulaCoerceItem(c, true)).filter(Boolean);
    out.shapes = Array.isArray(it.shapes) ? it.shapes : [];
  }
  return out;
};

// A tabula document coerced on load: the root is a board node, or becomes
// one with whatever it held. A well-formed document comes back equal in
// content.
const tabulaEnsureDocument = (doc) => {
  const name = typeof doc.name === "string" && doc.name.trim() ? doc.name : "Untitled Tabula";
  const raw = doc.root && typeof doc.root === "object" ? doc.root : {};
  const root = { ...raw, type: "board", title: typeof raw.title === "string" ? raw.title : name };
  const coerced = tabulaCoerceItem(root, false);
  delete coerced.x; delete coerced.y; delete coerced.w;
  return {
    ...doc,
    id: typeof doc.id === "string" && doc.id ? doc.id : `stem-${genId()}`,
    name,
    description: tabulaStr(doc.description),
    tags: Array.isArray(doc.tags) ? doc.tags.filter(x => typeof x === "string") : [],
    layout: "tabula",
    root: coerced,
    createdAt: typeof doc.createdAt === "string" ? doc.createdAt : isoNow(),
    updatedAt: typeof doc.updatedAt === "string" ? doc.updatedAt : isoNow(),
  };
};

// Every load (migrate() runs it before Fabula's slice): each tabula is
// coerced; a rota is left as it is, since its shape has normalized at import
// alone since v1.4 and a load must not move its bytes.
const ensureStemmas = (state) => {
  if (!Array.isArray(state.stemmas)) { state.stemmas = []; return; }
  state.stemmas = state.stemmas.map(s => (s && typeof s === "object" && s.layout === "tabula") ? tabulaEnsureDocument(s) : s);
};

// An imported tabula, validated and normalized: strict where the rota's
// import is strict. Returns { ok, stemma } or { ok: false, error }.
const tabulaNormalizeImported = (cloned) => {
  const check = (it, placed, path) => {
    if (!it || typeof it !== "object") return `Invalid item at ${path} (not an object).`;
    if (!TABULA_ITEM_TYPES.includes(it.type)) return `Item at ${path} has an unknown type "${it.type}".`;
    if (it.type === "linked" && (typeof it.entryId !== "string" || !it.entryId.trim())) return `Linked card at ${path} is missing entryId.`;
    if (it.type === "image" && (typeof it.image !== "string" || !it.image.trim())) return `Image card at ${path} has no image.`;
    if (it.type === "column") {
      if (!placed) return `Column at ${path} sits inside a column; a column holds any item but a column.`;
      for (let i = 0; i < (Array.isArray(it.items) ? it.items.length : 0); i++) { const e = check(it.items[i], false, `${path}.items[${i}]`); if (e) return e; }
    }
    if (it.type === "board") {
      for (let i = 0; i < (Array.isArray(it.items) ? it.items.length : 0); i++) { const e = check(it.items[i], true, `${path}.items[${i}]`); if (e) return e; }
    }
    return null;
  };
  if (!cloned.root || typeof cloned.root !== "object" || cloned.root.type !== "board") return { ok: false, error: "Imported tabula is missing its board." };
  for (let i = 0; i < (Array.isArray(cloned.root.items) ? cloned.root.items.length : 0); i++) {
    const e = check(cloned.root.items[i], true, `root.items[${i}]`);
    if (e) return { ok: false, error: e };
  }
  return { ok: true, stemma: tabulaEnsureDocument(cloned) };
};

// Every item below a node, depth first, with the node that holds it.
const tabulaWalk = (node, fn) => {
  if (!node) return;
  (node.items || []).forEach(it => {
    fn(it, node);
    if (it.type === "column" || it.type === "board") tabulaWalk(it, fn);
  });
};
const tabulaFindItem = (node, id) => {
  let found = null;
  tabulaWalk(node, (it) => { if (!found && it.id === id) found = it; });
  return found;
};
// A board node by id: the root, or a sub-board anywhere below it.
const tabulaBoardNode = (root, id) => {
  if (!root) return null;
  if (root.id === id) return root;
  const it = tabulaFindItem(root, id);
  return it && it.type === "board" ? it : null;
};
// A node rebuilt with fn applied to every item below it: fn returns the item
// to keep (the same or a new one) or null to drop it; containers recurse.
const tabulaRewrite = (node, fn) => {
  const items = [];
  (node.items || []).forEach(it => {
    const r = fn(it);
    if (!r) return;
    items.push((r.type === "column" || r.type === "board") ? tabulaRewrite(r, fn) : r);
  });
  return { ...node, items };
};
// The index's count: cards (a note, a linked card, an image, a sub-board)
// and columns, everywhere below the root.
const tabulaCounts = (stemma) => {
  let cards = 0, columns = 0;
  tabulaWalk(stemma && stemma.root, (it) => { if (it.type === "column") columns++; else if (TABULA_ITEM_TYPES.includes(it.type)) cards++; });
  return { cards, columns };
};

const tabulaNewDocument = (name) => {
  const now = isoNow();
  return {
    id: `stem-${genId()}`,
    name,
    description: "",
    tags: [],
    layout: "tabula",
    root: { id: `n-${genId()}`, type: "board", title: name, color: TABULA.color, icon: TABULA.icon, items: [], shapes: [] },
    createdAt: now,
    updatedAt: now,
  };
};

// The transforms: each takes the document and returns a new one, or the
// document it was given when the edit is refused.
const tabulaAddItem = (doc, boardId, item) => {
  if (!doc || !doc.root || !item) return doc;
  let placed = false;
  const put = (node) => {
    if (node.id === boardId && node.type === "board") { placed = true; return { ...node, items: [...(node.items || []), item] }; }
    return { ...node, items: (node.items || []).map(it => (it.type === "board" || it.type === "column") ? put(it) : it) };
  };
  const root = put(doc.root);
  return placed ? { ...doc, root, updatedAt: isoNow() } : doc;
};
// A patch object merges into the item; a patch function returns the whole
// item to keep (so it can drop fields, as a conversion does).
const tabulaUpdateItem = (doc, id, patch) => {
  if (!doc || !doc.root) return doc;
  let hit = false;
  const root = tabulaRewrite(doc.root, it => {
    if (it.id !== id) return it;
    hit = true;
    return typeof patch === "function" ? patch(it) : { ...it, ...patch };
  });
  return hit ? { ...doc, root, updatedAt: isoNow() } : doc;
};
const tabulaDeleteItem = (doc, id) => {
  if (!doc || !doc.root) return doc;
  let hit = false;
  const root = tabulaRewrite(doc.root, it => { if (it.id === id) { hit = true; return null; } return it; });
  return hit ? { ...doc, root, updatedAt: isoNow() } : doc;
};
// A move: the item takes x and y and comes to the top of its container.
const tabulaMoveItem = (doc, id, x, y) => {
  if (!doc || !doc.root) return doc;
  let hit = false;
  const move = (node) => {
    const items = node.items || [];
    const idx = items.findIndex(it => it.id === id);
    if (idx >= 0) {
      hit = true;
      const moved = { ...items[idx], x: tabulaInt(x, items[idx].x), y: tabulaInt(y, items[idx].y) };
      return { ...node, items: [...items.slice(0, idx), ...items.slice(idx + 1), moved] };
    }
    return { ...node, items: items.map(it => (it.type === "board" || it.type === "column") ? move(it) : it) };
  };
  const root = move(doc.root);
  return hit ? { ...doc, root, updatedAt: isoNow() } : doc;
};
// A linked card becomes a note titled with the name it showed.
const tabulaConvertToNote = (doc, id, name) => tabulaUpdateItem(doc, id, (it) => {
  const { entryId, _cachedName, ...rest } = it;
  return { ...rest, type: "note", title: name || _cachedName || "(empty)", body: "", color: TABULA.color };
});
const tabulaRelink = (doc, id, entryId, name) => tabulaUpdateItem(doc, id, { entryId, _cachedName: name || "" });
"""

TABULA_CANVAS = "\n\n" + header("Tabula: the canvas (v1.7 r029)") + r"""
// The board's screen (docs/stemma-v2-spec.md, section 6): HTML, not SVG, so a
// note wraps and renders Markdown; the surface is a div moved and scaled by
// one transform, cards absolutely positioned on it at their x and y, and the
// pane clips (overflow: clip, not hidden: a hidden pane is still a scroll
// container, and a field focused inside it scrolls the pane under the
// camera's feet). The camera is the map editor's grammar on an unbounded canvas.
// Edits are transforms (above) committed through useMapHistory and App's
// replaceStemma, the rota's path since r026, so Ctrl+Z and Ctrl+Y and the
// buttons walk them; a drag or a resize commits once, at its end.

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

// One card on the canvas. A note shows its title and its body as Markdown
// (wiki-links resolve through the pool), or, edited in place, a title field
// and a body field that commit as they're typed, a run of typing one history
// step, the inspector's way; a linked card draws its record's icon and color
// and its source, orphaned when the record is gone; an image shows its
// picture and caption. The right edge is the width handle.
function TabulaCard({ item, pool, templates, selected, dragging, editing, onEditChange, onEditDone, onPointerDown, onHandleDown, onDoubleClick, onOpenEntry, dirHandle, imageFolder, x, y, w }) {
  const editRef = useRef(null);
  const { url: imageUrl, errored: imageErrored } = useMapImageUrl(item.type === "image" ? item.image : null, dirHandle, imageFolder);
  useEffect(() => {
    if (editing && editRef.current) {
      const first = editRef.current.querySelector("input");
      if (first) { first.focus({ preventScroll: true }); first.select(); }
    }
  }, [!!editing]);
  let body = null;
  if (item.type === "note") {
    if (editing) {
      body = (
        <div
          ref={editRef}
          className="tabula-card-edit tabula-ui"
          onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) onEditDone(); }}
          onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onEditDone(); } e.stopPropagation(); }}
          onPointerDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <input type="text" value={item.title || ""} placeholder="Title" onChange={(e) => onEditChange({ title: e.target.value }, "title")} />
          <textarea value={item.body || ""} placeholder="Markdown; [[wiki-links]] resolve" rows={Math.max(3, Math.min(14, (item.body || "").split("\n").length + 1))} onChange={(e) => onEditChange({ body: e.target.value }, "body")} />
        </div>
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
  } else {
    return null;
  }
  const accent = item.type === "note" ? (item.color || TABULA.color) : null;
  return (
    <div
      className={`tabula-card${selected ? " selected" : ""}${dragging ? " dragging" : ""}`}
      data-item={item.id}
      data-type={item.type}
      style={{ left: x, top: y, width: w, borderLeft: accent ? `3px solid ${accent}` : undefined }}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
    >
      {body}
      <div className="tabula-card-handle" title="Drag to resize" onPointerDown={onHandleDown} />
    </div>
  );
}

// The right-side inspector for the selected card, the rota's pattern: a
// note's title, body, and color; a linked card's record with Open where
// something opens, re-link, and convert to a note; an image's caption and
// its replacement; Delete on every card. A run of typing in a field is one
// history step.
function TabulaInspector({ item, pool, templates, isLocked, onClose, onPatch, onDelete, onRelink, onConvertToNote, onOpenEntry, onReplaceImage }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  useEffect(() => { setPickerOpen(false); }, [item && item.id]);
  if (!item) return null;
  const field = (label, control) => (
    <div className="form-field">
      <label className="form-label">{label}</label>
      {control}
    </div>
  );
  let body = null;
  if (item.type === "note") {
    body = (
      <>
        {field("Title", <input className="input" type="text" value={item.title || ""} disabled={isLocked} placeholder="Untitled" onChange={(e) => onPatch({ title: e.target.value }, "title")} />)}
        {field("Body", <textarea className="input" value={item.body || ""} disabled={isLocked} placeholder="Markdown; [[wiki-links]] resolve" rows={8} style={{ overflow: "auto", minHeight: 120 }} onChange={(e) => onPatch({ body: e.target.value }, "body")} />)}
        {field("Color", (
          <div className="color-row">
            {COLORS.map(color => (
              <div key={color} className={`color-opt ${item.color === color ? "sel" : ""}`} style={{ background: color, ...(isLocked ? { opacity: 0.5, cursor: "default" } : {}) }} onClick={() => !isLocked && onPatch({ color })} />
            ))}
          </div>
        ))}
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
      </>
    );
  } else if (item.type === "image") {
    body = (
      <>
        {field("Caption", <input className="input" type="text" value={item.caption || ""} disabled={isLocked} placeholder="A caption, shown under the picture" onChange={(e) => onPatch({ caption: e.target.value }, "caption")} />)}
        <div style={{ fontSize: 11, color: "var(--text-dim)", wordBreak: "break-all" }}>{item.image && item.image.startsWith("data:") ? "Stored inside the save file" : `Images folder: ${item.image}`}</div>
      </>
    );
  }
  return (
    <div className="tabula-ui" style={{ width: 320, flexShrink: 0, borderLeft: "1px solid var(--border)", background: "var(--surf)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg)" }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>
          Inspector
          <span style={{ marginLeft: 8, fontSize: 11, color: "var(--text-dim)", fontWeight: 400 }}>{item.type === "note" ? "Note" : item.type === "linked" ? "Linked" : "Image"}</span>
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
          <button className="btn" style={{ fontSize: 12, color: "var(--danger)", borderColor: "var(--danger)" }} onClick={onDelete}>Delete card</button>
        </div>
      )}
    </div>
  );
}

// The canvas view. boardId names the board node shown, the root until r030's
// sub-boards. The pool and the templates are the rota's (App builds them).
function TabulaCanvasView({ stemma, boardId, entries, templates, isLocked, flash, onBackToIndex, onReplace, onOpenEntry, onExport, viewPref, onViewPref, dirHandle, imageFolder }) {
  const board = tabulaBoardNode(stemma.root, boardId) || stemma.root;
  const history = useMapHistory(stemma, onReplace);
  const apply = (next, opts) => {
    if (isLocked || !next || next === stemma) return;
    history.commit(next, opts);
  };
  const paneRef = useRef(null);
  const surfaceRef = useRef(null);
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(null);     // the id of the note edited in place
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [picker, setPicker] = useState(null);       // { x, y }: the Link tool's smart input, canvas units
  const [drag, setDrag] = useState(null);           // { id, dx, dy }: a card on the move, canvas units
  const [resize, setResize] = useState(null);       // { id, w }: a card on the resize
  const [placing, setPlacing] = useState(null);     // { kind }: a rail button on the drag
  const gestureRef = useRef(null);
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
  const selected = selectedId ? items.find(it => it.id === selectedId) : null;

  // the cards' boxes in canvas units, from the DOM, for Fit
  const cardsBox = () => {
    const el = surfaceRef.current;
    if (!el) return null;
    const cards = Array.from(el.querySelectorAll(".tabula-card"));
    if (cards.length === 0) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    cards.forEach(c => {
      const x = parseFloat(c.style.left) || 0, y = parseFloat(c.style.top) || 0;
      x0 = Math.min(x0, x); y0 = Math.min(y0, y);
      x1 = Math.max(x1, x + c.offsetWidth); y1 = Math.max(y1, y + c.offsetHeight);
    });
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  };
  const fitAll = () => camera.fitTo(cardsBox());
  camera.cfg.current.onFit = fitAll;
  React.useLayoutEffect(() => { if (!viewPref) fitAll(); }, [board.id]);

  // a card that goes closes the inspector and the editor on it
  useEffect(() => {
    if (selectedId && !items.some(it => it.id === selectedId)) setSelectedId(null);
    if (editing && !items.some(it => it.id === editing)) setEditing(null);
  }, [items, selectedId, editing]);
  useEffect(() => () => { if (prefTimer.current) clearTimeout(prefTimer.current); }, []);

  // The in-place editor's fields commit as they're typed, so ending the edit
  // only closes the fields; the ref lets the pane's press and the field's
  // blur both ask in one event.
  const editingRef = useRef(null);
  editingRef.current = editing;
  const endEdit = () => { if (!editingRef.current) return; editingRef.current = null; setEditing(null); };
  camera.cfg.current.onTap = () => { endEdit(); setSelectedId(null); setPicker(null); };
  const startEdit = (it) => { if (isLocked || it.type !== "note") return; setSelectedId(it.id); setEditing(it.id); };

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
  };
  const paneCenter = () => { const r = camera.rectOf(); return camera.toCanvas(r ? r.left + r.width / 2 : 0, r ? r.top + r.height / 2 : 0); };

  // the gestures: a card's move, a width handle, a rail button's drag
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
  useEffect(() => () => { gestureRef.current = null; window.removeEventListener("pointermove", handlersRef.current.move); window.removeEventListener("pointerup", handlersRef.current.up); window.removeEventListener("pointercancel", handlersRef.current.up); }, []);

  const onCardPointerDown = (it) => (e) => {
    if (e.button !== 0 || camera.spaceHeld) return;
    if (editing === it.id) return;
    e.stopPropagation();
    if (editing) endEdit();
    setSelectedId(it.id);
    if (isLocked) return;
    const startX = e.clientX, startY = e.clientY;
    beginGesture({
      moved: false,
      onMove: (ev) => {
        const z = camera.viewRef.current.zoom;
        const dx = (ev.clientX - startX) / z, dy = (ev.clientY - startY) / z;
        const g = gestureRef.current;
        if (g && !g.moved && Math.hypot(ev.clientX - startX, ev.clientY - startY) > TABULA.dragSlop) g.moved = true;
        if (g && g.moved) setDrag({ id: it.id, dx, dy });
      },
      onUp: (ev) => {
        setDrag(null);
        const z = camera.viewRef.current.zoom;
        const dx = (ev.clientX - startX) / z, dy = (ev.clientY - startY) / z;
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > TABULA.dragSlop) {
          apply(tabulaMoveItem(stemma, it.id, tabulaSnap(it.x + dx), tabulaSnap(it.y + dy)));
        }
      },
    });
  };
  const onHandlePointerDown = (it) => (e) => {
    if (e.button !== 0 || isLocked) return;
    e.stopPropagation(); e.preventDefault();
    setSelectedId(it.id);
    const startX = e.clientX, w0 = it.w;
    beginGesture({
      onMove: (ev) => { const z = camera.viewRef.current.zoom; setResize({ id: it.id, w: tabulaClampWidth(it.type, tabulaSnap(w0 + (ev.clientX - startX) / z)) }); },
      onUp: (ev) => { setResize(null); const z = camera.viewRef.current.zoom; const w = tabulaClampWidth(it.type, tabulaSnap(w0 + (ev.clientX - startX) / z)); if (w !== it.w) apply(tabulaUpdateItem(stemma, it.id, { w })); },
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
    setSelectedId(null);
    if (picker) setPicker(null);
    if (paneRef.current) paneRef.current.focus();
  };
  const onPaneDoubleClick = (e) => {
    if (e.target && e.target.closest && e.target.closest(".tabula-card, .tabula-ui")) return;
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

  // the selection's keys: Delete, the arrows by the grid, Escape
  useEffect(() => {
    const typing = (t) => { const tag = t && t.tagName ? t.tagName.toUpperCase() : ""; return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !!(t && t.isContentEditable); };
    const down = (e) => {
      if (typing(e.target)) return;
      if (e.key === "Escape") { if (picker) { setPicker(null); return; } if (editing) { endEdit(); return; } if (selectedId) setSelectedId(null); return; }
      if (!selected || isLocked || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); apply(tabulaDeleteItem(stemma, selected.id)); return; }
      const step = TABULA.grid;
      const d = e.key === "ArrowLeft" ? [-step, 0] : e.key === "ArrowRight" ? [step, 0] : e.key === "ArrowUp" ? [0, -step] : e.key === "ArrowDown" ? [0, step] : null;
      if (d) { e.preventDefault(); apply(tabulaMoveItem(stemma, selected.id, selected.x + d[0], selected.y + d[1]), { coalesce: `nudge:${selected.id}` }); }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [selected, selectedId, editing, picker, stemma, isLocked]);

  const view = camera.view;
  const pool = entries || [];
  const screenOf = (cx, cy) => ({ x: (cx - view.x) * view.zoom, y: (cy - view.y) * view.zoom });
  const zoomPct = Math.round(view.zoom * 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* The top bar: back, the name (click to rename), undo and redo, export. */}
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
        <div style={{ marginLeft: "auto", display: "flex", gap: 4, alignItems: "center" }}>
          {!isLocked && (
            <button className="btn btn-ghost" onClick={history.undo} disabled={!history.canUndo} style={{ padding: "4px 10px", fontSize: 13, opacity: history.canUndo ? 1 : 0.45 }} title="Undo (Ctrl+Z)">Undo</button>
          )}
          {!isLocked && (
            <button className="btn btn-ghost" onClick={history.redo} disabled={!history.canRedo} style={{ padding: "4px 10px", fontSize: 13, opacity: history.canRedo ? 1 : 0.45 }} title="Redo (Ctrl+Y)">Redo</button>
          )}
          <button className="btn btn-ghost" onClick={onExport} style={{ padding: "4px 10px", fontSize: 13 }} title="Export this tabula as JSON">Export</button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {!isLocked && (
          <div className="tabula-rail tabula-ui">
            <button type="button" title="Note: click to add one at the center, drag to place it, or double-click the canvas" onPointerDown={onRailPointerDown("note")}><span className="glyph">▭</span>Note</button>
            <button type="button" title="Link: a card for an entry or any record of the world" onPointerDown={onRailPointerDown("linked")}><span className="glyph">⛓</span>Link</button>
            <button type="button" title="Image: a picture from a file, or drop one on the canvas" onPointerDown={onRailPointerDown("image")}><span className="glyph">▣</span>Image</button>
          </div>
        )}
        <div
          ref={paneRef}
          className={`tabula-pane${camera.dragging ? " grabbing" : (camera.spaceHeld || isLocked ? " grab" : "")}${placing ? " placing" : ""}`}
          tabIndex={0}
          onPointerDownCapture={onPanePointerDownCapture}
          onPointerDown={onPanePointerDown}
          onDoubleClick={isLocked ? undefined : onPaneDoubleClick}
          onDragOver={(e) => { if (!isLocked && e.dataTransfer && Array.from(e.dataTransfer.types || []).includes("Files")) e.preventDefault(); }}
          onDrop={onPaneDrop}
        >
          <div ref={surfaceRef} className="tabula-surface" style={{ transform: `translate(${-view.x * view.zoom}px, ${-view.y * view.zoom}px) scale(${view.zoom})` }}>
            {items.map(it => {
              const isDragged = drag && drag.id === it.id;
              const x = isDragged ? it.x + drag.dx : it.x;
              const y = isDragged ? it.y + drag.dy : it.y;
              const w = resize && resize.id === it.id ? resize.w : it.w;
              return (
                <TabulaCard
                  key={it.id}
                  item={it}
                  x={x} y={y} w={w}
                  pool={pool}
                  templates={templates}
                  selected={selectedId === it.id}
                  dragging={!!isDragged}
                  editing={editing === it.id}
                  onEditChange={(patch, key) => apply(tabulaUpdateItem(stemma, it.id, patch), { coalesce: `field:${it.id}:${key}` })}
                  onEditDone={endEdit}
                  onPointerDown={onCardPointerDown(it)}
                  onHandleDown={onHandlePointerDown(it)}
                  onDoubleClick={(e) => { e.stopPropagation(); startEdit(it); }}
                  onOpenEntry={onOpenEntry}
                  dirHandle={dirHandle}
                  imageFolder={imageFolder}
                />
              );
            })}
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
          {items.length === 0 && !isLocked && (
            <div className="tabula-empty tabula-ui">Nothing here yet. Add a note from the rail, or double-click the canvas.</div>
          )}
        </div>
        {selected && (
          <TabulaInspector
            item={selected}
            pool={pool}
            templates={templates}
            isLocked={isLocked}
            onClose={() => setSelectedId(null)}
            onPatch={(patch, key) => apply(tabulaUpdateItem(stemma, selected.id, patch), key ? { coalesce: `field:${selected.id}:${key}` } : undefined)}
            onDelete={() => apply(tabulaDeleteItem(stemma, selected.id))}
            onRelink={(entryId, name) => apply(tabulaRelink(stemma, selected.id, entryId, name))}
            onConvertToNote={() => { const rec = pool.find(e => e.id === selected.entryId); apply(tabulaConvertToNote(stemma, selected.id, rec ? rec.name : selected._cachedName)); }}
            onOpenEntry={onOpenEntry}
            onReplaceImage={() => replaceImage(selected)}
          />
        )}
      </div>
    </div>
  );
}"""

# ═══════════════════════════════════════════════════════════════════════════════
# 12_trunk: App
# ═══════════════════════════════════════════════════════════════════════════════

PREFS_INIT_OLD = """    fabulaTimeline: {}, // v1.7 r020: the Timeline tab's scope, lanes, and calendar, by story
  });
"""
PREFS_INIT_NEW = """    fabulaTimeline: {}, // v1.7 r020: the Timeline tab's scope, lanes, and calendar, by story
    tabulaViews: {}, // v1.7 r029: a tabula's pan and zoom, by board node id
  });
"""
PREFS_LOAD_OLD = """            fabulaTimeline: stored.fabulaTimeline && typeof stored.fabulaTimeline === "object" && !Array.isArray(stored.fabulaTimeline) ? stored.fabulaTimeline : {},
          });"""
PREFS_LOAD_NEW = """            fabulaTimeline: stored.fabulaTimeline && typeof stored.fabulaTimeline === "object" && !Array.isArray(stored.fabulaTimeline) ? stored.fabulaTimeline : {},
            tabulaViews: stored.tabulaViews && typeof stored.tabulaViews === "object" && !Array.isArray(stored.tabulaViews) ? stored.tabulaViews : {},
          });"""

CREATE_OLD = """  const createStemma = () => {
    if (isLocked) return;
    const stemId = `stem-${genId()}`;
    const rootId = `n-${genId()}`;
    const newStemma = {
      id: stemId,
      name: "Untitled Stemma",
      description: "",
      tags: [],
      root: {
        id: rootId,
        slot: 0,
        type: "freeform",
        label: "Root",
        color: "#c8a96e",
        icon: "✦",
        children: [],
      },
      createdAt: isoNow(),
      updatedAt: isoNow(),
    };
    updateState(s => ({ ...s, stemmas: [...(s.stemmas || []), newStemma] }));
    setActiveStemmaId(stemId);
    setFocalNodeId(rootId);
    flash("Stemma created");
  };
"""
CREATE_NEW = """  // v1.7 r029: the layout is "rota" or "tabula"; a tabula opens on its empty
  // board (tabulaNewDocument).
  const createStemma = (layout) => {
    if (isLocked) return;
    if (layout === "tabula") {
      const doc = tabulaNewDocument("Untitled Tabula");
      updateState(s => ({ ...s, stemmas: [...(s.stemmas || []), doc] }));
      setActiveStemmaId(doc.id);
      setFocalNodeId(doc.root.id);
      flash("Tabula created");
      return;
    }
    const stemId = `stem-${genId()}`;
    const rootId = `n-${genId()}`;
    const newStemma = {
      id: stemId,
      name: "Untitled Rota",
      description: "",
      tags: [],
      root: {
        id: rootId,
        slot: 0,
        type: "freeform",
        label: "Root",
        color: "#c8a96e",
        icon: "✦",
        children: [],
      },
      createdAt: isoNow(),
      updatedAt: isoNow(),
    };
    updateState(s => ({ ...s, stemmas: [...(s.stemmas || []), newStemma] }));
    setActiveStemmaId(stemId);
    setFocalNodeId(rootId);
    flash("Rota created");
  };

  // v1.7 r029: a tabula's pan and zoom, kept with the display settings by
  // board node id, so a board opens where it was left.
  const setTabulaView = (boardId, view) => setPrefs(p => ({ ...p, tabulaViews: { ...(p.tabulaViews || {}), [boardId]: view } }));
"""

EXPORT_OLD = """    const payload = {
      cartulary_stemma_export: 1,
      exported_at: new Date().toISOString(),
      stemma,
    };"""
EXPORT_NEW = """    // v1.7 r029: a tabula writes envelope 2, which every build before it
    // refuses outright, where a version-1 board would import into one as its
    // root alone; a rota stays at 1, so older builds keep importing it.
    const payload = {
      cartulary_stemma_export: stemma.layout === "tabula" ? 2 : 1,
      exported_at: new Date().toISOString(),
      stemma,
    };"""

IMPORT_OLD = """      if (!parsed || parsed.cartulary_stemma_export !== 1 || !parsed.stemma) {
        flash("That doesn't look like a Cartulary stemma export.", "error");
        return;
      }"""
IMPORT_NEW = """      if (!parsed || typeof parsed.cartulary_stemma_export !== "number" || !parsed.stemma) {
        flash("That doesn't look like a Cartulary stemma export.", "error");
        return;
      }
      // v1.7 r029: 1 is a rota's envelope, 2 a tabula's; anything higher
      // came from a newer Cartulary than this one.
      if (parsed.cartulary_stemma_export > 2) {
        flash("That stemma was exported by a newer Cartulary than this one; update Cartulary to import it.", "error");
        return;
      }"""

IMPORT_FLASH_OLD = """      if (missingRefs.length > 0) {
        flash(`Imported "${regenerated.name}". ${missingRefs.length} linked node${missingRefs.length === 1 ? "" : "s"} became orphans (entry not in this world).`, "warn");
      } else {"""
IMPORT_FLASH_NEW = """      if (missingRefs.length > 0) {
        const unit = regenerated.layout === "tabula" ? "linked card" : "linked node";
        flash(`Imported "${regenerated.name}". ${missingRefs.length} ${unit}${missingRefs.length === 1 ? "" : "s"} became orphans (record not in this world).`, "warn");
      } else {"""
COLLIDE_REPLACE_OLD = """                      flash(`Replaced "${stemmaImportCollision.existing.name}". ${missing} linked node${missing === 1 ? "" : "s"} became orphans.`, "warn");"""
COLLIDE_REPLACE_NEW = """                      flash(`Replaced "${stemmaImportCollision.existing.name}". ${missing} linked ${stemmaImportCollision.imported.layout === "tabula" ? "card" : "node"}${missing === 1 ? "" : "s"} became orphans.`, "warn");"""
COLLIDE_RENAME_OLD = """                    flash(`Imported as "${newName}". ${missing} linked node${missing === 1 ? "" : "s"} became orphans.`, "warn");"""
COLLIDE_RENAME_NEW = """                    flash(`Imported as "${newName}". ${missing} linked ${stemmaImportCollision.imported.layout === "tabula" ? "card" : "node"}${missing === 1 ? "" : "s"} became orphans.`, "warn");"""

DELETE_OLD = """      fabula: scrubFabulaRefs(s, new Set([stemmaId])),
    }));
    // If the canvas was open on this stemma, close it
    if (activeStemmaId === stemmaId) {"""
DELETE_NEW = """      fabula: scrubFabulaRefs(s, new Set([stemmaId])),
    }));
    // v1.7 r029: a tabula's remembered views go with it
    const gone = (state.stemmas || []).find(st => st.id === stemmaId);
    if (gone && gone.layout === "tabula") {
      const boards = [];
      const walk = (n) => { if (!n) return; if (n.type === "board") boards.push(n.id); (n.items || []).forEach(walk); };
      walk(gone.root);
      setPrefs(p => { const tv = { ...(p.tabulaViews || {}) }; boards.forEach(id => { delete tv[id]; }); return { ...p, tabulaViews: tv }; });
    }
    // If the canvas was open on this stemma, close it
    if (activeStemmaId === stemmaId) {"""

RENDER_OLD = """            return (
              <StemmaCanvasView
                key={`${stem.id}:${isLocked ? "locked" : "open"}`}
                stemma={stem}
                focalNodeId={focalNodeId}
                entries={stemmaPool}
                templates={stemmaTemplates}
                isLocked={isLocked}
                flash={flash}
                onFocalChange={setFocalNodeId}
                onBackToIndex={closeStemmaToIndex}
                onReplace={(next) => replaceStemma(stem.id, next)}
                onOpenEntry={openEntryFromAnywhere}
                onExport={() => exportStemmaJson(stem)}
              />
            );"""
RENDER_NEW = """            // v1.7 r029: a tabula draws on its own canvas, the rota's path
            // for the pool, the templates, the history, and the opens.
            if (stem.layout === "tabula") {
              const boardId = focalNodeId && tabulaBoardNode(stem.root, focalNodeId) ? focalNodeId : stem.root.id;
              return (
                <TabulaCanvasView
                  key={`${stem.id}:${isLocked ? "locked" : "open"}`}
                  stemma={stem}
                  boardId={boardId}
                  entries={stemmaPool}
                  templates={stemmaTemplates}
                  isLocked={isLocked}
                  flash={flash}
                  onBackToIndex={closeStemmaToIndex}
                  onReplace={(next) => replaceStemma(stem.id, next)}
                  onOpenEntry={openEntryFromAnywhere}
                  onExport={() => exportStemmaJson(stem)}
                  viewPref={(prefs.tabulaViews || {})[boardId] || null}
                  onViewPref={setTabulaView}
                  dirHandle={dirHandle}
                  imageFolder={state.world.imageFolder}
                />
              );
            }
            return (
              <StemmaCanvasView
                key={`${stem.id}:${isLocked ? "locked" : "open"}`}
                stemma={stem}
                focalNodeId={focalNodeId}
                entries={stemmaPool}
                templates={stemmaTemplates}
                isLocked={isLocked}
                flash={flash}
                onFocalChange={setFocalNodeId}
                onBackToIndex={closeStemmaToIndex}
                onReplace={(next) => replaceStemma(stem.id, next)}
                onOpenEntry={openEntryFromAnywhere}
                onExport={() => exportStemmaJson(stem)}
              />
            );"""

# ═══════════════════════════════════════════════════════════════════════════════
# 10_migrate
# ═══════════════════════════════════════════════════════════════════════════════

MIGRATE_OLD = """  // v1.7 r006: Fabula's slice and its seeded schemas (docs/fabula-spec.md,
  // section 3). Last, so the templates the schemas point at are final.
  ensureFabulaSlice(state);
"""
MIGRATE_NEW = """  // v1.7 r029: every tabula coerced to its shape on every load, as a map is
  // by ensureMapData (docs/stemma-v2-spec.md, section 3); a rota is left as
  // it is.
  ensureStemmas(state);

  // v1.7 r006: Fabula's slice and its seeded schemas (docs/fabula-spec.md,
  // section 3). Last, so the templates the schemas point at are final.
  ensureFabulaSlice(state);
"""

# ═══════════════════════════════════════════════════════════════════════════════
# shell.html: the board's CSS
# ═══════════════════════════════════════════════════════════════════════════════

CSS_OLD = ".stemma-index-row{transition:background 0.12s ease}\n.stemma-index-row:hover{background:var(--surf2)!important}\n"
CSS_NEW = CSS_OLD + """.tabula-badge{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-dim);border:1px solid var(--border2);border-radius:3px;padding:1px 6px;font-weight:500;flex-shrink:0}
.tabula-pane{position:relative;flex:1;overflow:clip;background:var(--bg);outline:none;touch-action:none}
.tabula-pane.grab{cursor:grab}
.tabula-pane.grabbing{cursor:grabbing}
.tabula-pane.placing{cursor:crosshair}
.tabula-surface{position:absolute;left:0;top:0;width:0;height:0;transform-origin:0 0}
.tabula-card{position:absolute;background:var(--surf);border:1px solid var(--border);border-radius:6px;box-shadow:0 2px 6px rgba(0,0,0,.25);user-select:none;cursor:default}
.tabula-card.selected{outline:2px solid var(--accent);outline-offset:1px}
.tabula-card.dragging{opacity:.9;box-shadow:0 10px 24px rgba(0,0,0,.45);z-index:1}
.tabula-card-title{font-size:14px;font-weight:600;padding:8px 10px 4px;color:var(--text);word-break:break-word;line-height:1.3}
.tabula-card-body{font-size:13px;padding:0 10px 8px;color:var(--text);line-height:1.45;word-break:break-word}
.tabula-card-body .md-content{font-size:13px;line-height:1.45}
.tabula-card-body .md-content p{margin:0 0 .5em 0}
.tabula-card-body .md-content ul,.tabula-card-body .md-content ol{margin:.3em 0;padding-left:1.3em}
.tabula-card-body .md-content h1,.tabula-card-body .md-content h2,.tabula-card-body .md-content h3,.tabula-card-body .md-content h4{margin:.5em 0 .3em;font-size:1.15em}
.tabula-card-handle{position:absolute;top:0;right:-4px;width:8px;height:100%;cursor:ew-resize;border-radius:4px}
.tabula-card:hover .tabula-card-handle,.tabula-card.selected .tabula-card-handle{background:var(--accent-glow)}
.tabula-card-edit{padding:6px 8px;display:flex;flex-direction:column;gap:4px}
.tabula-card-edit input,.tabula-card-edit textarea{width:100%;box-sizing:border-box;background:var(--surf2);color:var(--text);border:1px solid var(--accent);border-radius:3px;font:inherit;font-size:13px;padding:4px 6px;outline:none;resize:none}
.tabula-card-edit input{font-weight:600;font-size:14px}
.tabula-rail{width:54px;flex-shrink:0;border-right:1px solid var(--border);display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px 0;background:var(--surf)}
.tabula-rail button{width:44px;height:44px;border-radius:6px;border:1px solid var(--border2);background:transparent;color:var(--text-dim);font-size:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;cursor:pointer;touch-action:none}
.tabula-rail button:hover{color:var(--accent);border-color:var(--accent)}
.tabula-rail button .glyph{font-size:16px;line-height:1}
.tabula-zoom{position:absolute;right:10px;bottom:10px;display:flex;gap:2px;align-items:center;font-size:11px;color:var(--text-dim);background:var(--surf);border:1px solid var(--border);border-radius:4px;padding:2px 4px}
.tabula-empty{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:var(--text-dim);font-style:italic;font-size:13px;pointer-events:none;text-align:center;max-width:320px}
.tabula-image{display:block;width:100%;border-radius:5px 5px 0 0;pointer-events:none}
.tabula-caption{font-size:12px;color:var(--text-dim);padding:6px 10px;word-break:break-word}
.tabula-linked{display:flex;align-items:center;gap:8px;padding:8px 10px}
.tabula-linked .face{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--bg);font-size:14px;flex-shrink:0;font-weight:600}
.tabula-linked .name{font-size:14px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tabula-linked .src{font-size:11px;color:var(--text-dim)}
.tabula-linked.orphan .name{font-style:italic;color:var(--text-dim)}
"""


def main():
    stemma = MODULES / "21_stemma.jsx"
    edit(stemma, [
        (REGEN_OLD, REGEN_NEW),
        (IMPORT_HEAD_OLD, IMPORT_HEAD_NEW),
        (MISSING_OLD, MISSING_NEW),
        (TARGETS_OLD, TARGETS_NEW),
        (SMART_SIG_OLD, SMART_SIG_NEW),
        (SMART_FOOT_OLD, SMART_FOOT_NEW),
        (SMART_HINT_OLD, SMART_HINT_NEW),
        (INDEX_SIG_OLD, INDEX_SIG_NEW),
        (INDEX_LEAD_OLD, INDEX_LEAD_NEW),
        (INDEX_BUTTONS_OLD, INDEX_BUTTONS_NEW),
        (INDEX_EMPTY_OLD, INDEX_EMPTY_NEW),
        (INDEX_ROW_OLD, INDEX_ROW_NEW),
        (INDEX_NAME_OLD, INDEX_NAME_NEW),
    ])
    text = stemma.read_text(encoding="utf-8")
    assert not text.endswith("\n"), "21_stemma ends on a newline; the assembler expects none"
    stemma.write_text(text + TABULA_DOCUMENT + TABULA_CANVAS, encoding="utf-8")
    edit(MODULES / "12_trunk.jsx", [
        (PREFS_INIT_OLD, PREFS_INIT_NEW),
        (PREFS_LOAD_OLD, PREFS_LOAD_NEW),
        (CREATE_OLD, CREATE_NEW),
        (EXPORT_OLD, EXPORT_NEW),
        (IMPORT_OLD, IMPORT_NEW),
        (IMPORT_FLASH_OLD, IMPORT_FLASH_NEW),
        (COLLIDE_REPLACE_OLD, COLLIDE_REPLACE_NEW),
        (COLLIDE_RENAME_OLD, COLLIDE_RENAME_NEW),
        (DELETE_OLD, DELETE_NEW),
        (RENDER_OLD, RENDER_NEW),
    ])
    edit(MODULES / "10_migrate.jsx", [(MIGRATE_OLD, MIGRATE_NEW)])
    edit(ROOT / "cartulary-src" / "shell.html", [(CSS_OLD, CSS_NEW)])
    print("r029 applied: the tabula's document, index, and canvas; the layout-aware create, export, import, prefs, and load")


if __name__ == "__main__":
    main()
