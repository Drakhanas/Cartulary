
// ─── Tabula: the document (v1.7 r029) ──────────────────────────────────────────
// Stemma's second kind of document (docs/stemma-v2-spec.md, sections 3 and
// 4): a board in Milanote's structure, a document in state.stemmas with
// layout "tabula" whose root is a board node holding items placed by
// position, in z-order, and (from r032) a drawing layer. Items: a note (a
// title and a Markdown body), a linked card (the rota's linked node, pointed
// at any registered record), an image (a file in the images folder or a data
// URL), and, from r030, a column (laned from r033: a column holding
// columns, at any depth, laid side by side) and a sub-board; from r033 a
// card may hold columns too, its stacks, drawn under it. x, y, w are integers in
// canvas pixels at zoom 1, unbounded; heights are never stored; a lane or a
// stack may carry w alone (r033), its width, the last taking what's left; a
// column may be a row (r033), `flow: "row"`, its cards side by side. Absent
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
  maxColumnWidth: 2400,                      // a column's own ceiling (r033), room for lanes within lanes
  maxLanes: 6,                               // "Cards per row" (r033): the most lanes a column takes
  minLaneWidth: 80,                          // a lane's floor (r033) when the divider beside it is dragged
  rowWidth: 200,                             // a card's width in a row (r033), grown to what its stacks need
  color: "#c8a96e",
  icon: "✦",
  // the drawing layer (r032): the next line's color and width, how far
  // past a card's box an end still sticks to it (screen pixels), a freehand
  // point every `spacing` screen pixels and its simplifier's tolerance
  draw: { color: "#e8dcc0", width: 3, stick: 6, spacing: 4, tolerance: 2 },
};
const TABULA_ITEM_TYPES = ["note", "linked", "image", "column", "board"];

const tabulaInt = (v, d) => (Number.isFinite(v) ? Math.round(v) : d);
const tabulaHex = (v, d) => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : d);
const tabulaStr = (v, d = "") => (typeof v === "string" ? v : d);
const tabulaSnap = (v) => Math.round(v / TABULA.grid) * TABULA.grid;
// a column, or (r033) a card holding stacks (`wide`), takes the column's ceiling
const tabulaClampWidth = (type, w, wide) => Math.max(TABULA.minWidth[type] || 160, Math.min(type === "column" || wide ? TABULA.maxColumnWidth : TABULA.maxWidth, w));
// What holds items the walkers go down into: a board, a column, or (r033)
// a card with stacks under it. A card's `items` are columns only, and a
// card with none has no `items` at all.
const tabulaHolds = (it) => !!it && (it.type === "board" || it.type === "column" || Array.isArray(it.items));
const tabulaStacked = (it) => !!it && it.type !== "board" && it.type !== "column" && Array.isArray(it.items) && it.items.length > 0;
// a lane's own width (r033), between the lane floor and the column ceiling
const tabulaClampLaneWidth = (w) => Math.max(TABULA.minLaneWidth, Math.min(TABULA.maxColumnWidth, w));
// The width an item needs drawn (r033), from the bottom up: a card in a row
// its row width, grown to what its stacks need; a card in a stack what its
// stacks need, or nothing, since it fills its stack; a stack its widest
// card plus its padding, a row the sum of its cards plus the gaps, a laned
// column or a card's stacks the sum of the lanes, each at least its own
// width, plus the gaps and the padding. A holder on the board is drawn at
// the larger of its width and its need, so nothing below it is squeezed;
// a lane is never narrower than its need. The last lane's own width
// doesn't count, since it takes what's left; where the others are fixed
// it counts at the lane floor.
const tabulaNeed = (it, inRow) => {
  if (!it) return 0;
  const lanesNeed = (lanes, gap, pad) => {
    const last = lanes.length - 1, fixed = lanes.some((l, i) => i < last && Number.isFinite(l.w));
    return lanes.reduce((s, l, i) => s + Math.max(i < last && Number.isFinite(l.w) ? l.w : (i === last && fixed ? TABULA.minLaneWidth : 0), tabulaNeed(l, false)), 0) + gap * Math.max(0, lanes.length - 1) + pad;
  };
  if (it.type === "column") {
    const kids = it.items || [];
    if (tabulaIsLaned(it)) return lanesNeed(kids, 4, 10);
    if (it.flow === "row") return kids.reduce((s, c) => s + tabulaNeed(c, true), 0) + 6 * Math.max(0, kids.length - 1) + 14;
    return kids.reduce((m, c) => Math.max(m, tabulaNeed(c, false)), 0) + (kids.length ? 14 : 0);
  }
  const base = inRow ? TABULA.rowWidth : 0;
  return tabulaStacked(it) ? Math.max(base, lanesNeed(it.items, 4, 24)) : base;
};

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
  const walk = (node) => (node.items || []).forEach(it => { ids.add(it.id); if (it.type !== "board" && tabulaHolds(it)) walk(it); });
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
    if (!tabulaHolds(it)) return it;
    const r = tabulaHealAnchors(it, ends);
    if (r !== it) changed = true;
    return r;
  });
  if (!changed) return node;
  const out = { ...node, items };
  if (ids) out.shapes = shapes;
  return out;
};

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
    delete out.x; delete out.y;
    // a lane, or a stack under a card, may carry its width (r033); a card in a stack has none
    if (type === "column" && Number.isFinite(it.w)) out.w = tabulaClampLaneWidth(tabulaInt(it.w, TABULA.minLaneWidth)); else delete out.w;
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
    if (it.flow === "row") out.flow = "row"; else delete out.flow;  // a row (r033): the cards side by side
    // A column may hold lanes (r033), columns laid side by side, at any
    // depth: a lane may hold lanes of its own. A column holds cards or
    // lanes, never both, so a card loose among lanes goes to the first
    // lane, into its first lane when that one has lanes. Nothing is dropped.
    const kids = (Array.isArray(it.items) ? it.items : []).map(c => tabulaCoerceItem(c, false)).filter(Boolean);
    const lanes = kids.filter(c => c.type === "column");
    if (lanes.length === 0) out.items = kids;
    else {
      const loose = kids.filter(c => c.type !== "column");
      if (loose.length) lanes[0] = tabulaPrependCards(lanes[0], loose);
      out.items = lanes;
    }
  } else if (type === "board") {
    out.title = tabulaStr(it.title);
    out.color = tabulaHex(it.color, TABULA.color);
    out.icon = tabulaStr(it.icon, TABULA.icon) || TABULA.icon;
    out.items = (Array.isArray(it.items) ? it.items : []).map(c => tabulaCoerceItem(c, true)).filter(Boolean);
    const ids = tabulaVisibleIds(out);
    out.shapes = (Array.isArray(it.shapes) ? it.shapes : []).map(s => tabulaCoerceShape(s, ids)).filter(Boolean);
  }
  if (type !== "column" && type !== "board") {
    // A card may hold stacks (r033): columns, drawn under it. Anything else
    // under it goes into the first stack, into one made for it when there
    // is none; a card with nothing under it has no `items` at all.
    const kids = (Array.isArray(it.items) ? it.items : []).map(c => tabulaCoerceItem(c, false)).filter(Boolean);
    const stacks = kids.filter(c => c.type === "column");
    const loose = kids.filter(c => c.type !== "column");
    if (loose.length) {
      if (stacks.length) stacks[0] = tabulaPrependCards(stacks[0], loose);
      else stacks.push({ id: `n-${genId()}`, type: "column", title: "", color: TABULA.color, items: loose });
    }
    if (stacks.length) out.items = stacks; else delete out.items;
    if (placed && stacks.length) out.w = tabulaClampWidth(type, tabulaInt(it.w, TABULA.width[type]), true);
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
    if (it.type !== "board") {
      // a column inside a column is a lane (r033), at any depth, and a
      // column under a card is its stack (r033); each holds what a column holds
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
    if (tabulaHolds(it)) tabulaWalk(it, fn);
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
    items.push(tabulaHolds(r) ? tabulaRewrite(r, fn) : r);
  });
  return { ...node, items };
};
// What a node holds, everywhere below it: cards (a note, a linked card, an
// image, a sub-board) and columns. The index reads it for the root and
// (r030) a board card's face for the sub-board, so the two agree.
const tabulaCountBelow = (node) => {
  let cards = 0, columns = 0;
  // a lane (r033) is its column's and a stack (r033) its card's, not a column of its own
  tabulaWalk(node, (it, holder) => { if (it.type === "column") { if (holder.type === "board") columns++; } else if (TABULA_ITEM_TYPES.includes(it.type)) cards++; });
  return { cards, columns };
};
// A column holding lanes (r033): one that holds columns, at any depth.
const tabulaIsLaned = (col) => !!col && col.type === "column" && (col.items || []).some(c => c && c.type === "column");
// The cards below a column at any depth, in lane order, each with the
// stacks under it (r033); cards put before or after them, into the first
// or the last lane down the lanes when the column has lanes.
const tabulaCardsBelow = (col) => (col.items || []).flatMap(c => (c.type === "column" ? tabulaCardsBelow(c) : [c]));
const tabulaPrependCards = (col, cards) => (tabulaIsLaned(col)
  ? { ...col, items: col.items.map((l, i) => (i === 0 ? tabulaPrependCards(l, cards) : l)) }
  : { ...col, items: [...cards, ...(col.items || [])] });
const tabulaAppendCards = (col, cards) => (tabulaIsLaned(col)
  ? { ...col, items: col.items.map((l, i) => (i === col.items.length - 1 ? tabulaAppendCards(l, cards) : l)) }
  : { ...col, items: [...(col.items || []), ...cards] });
const tabulaCounts = (stemma) => tabulaCountBelow(stemma && stemma.root);
// The node (a board or a column) that holds an item.
const tabulaParentOf = (root, id) => {
  let parent = null;
  tabulaWalk(root, (it, holder) => { if (!parent && it.id === id) parent = holder; });
  return parent;
};
// The boards from the root down to a board, for the breadcrumb; the root
// alone when the id names nothing.
const tabulaBoardPath = (root, boardId) => {
  const walk = (node, chain) => {
    if (node.id === boardId) return chain;
    for (const it of (node.items || [])) {
      if (it.type === "board") { const r = walk(it, [...chain, it]); if (r) return r; }
      else if (it.type === "column") { const r = walkColumn(it, chain); if (r) return r; }
    }
    return null;
  };
  // a board in a column's stack, in a lane's (r033), or in a stack under a card (r033)
  const walkColumn = (col, chain) => {
    for (const c of (col.items || [])) {
      if (c.type === "board") { const r = walk(c, [...chain, c]); if (r) return r; }
      else if (tabulaHolds(c)) { const r = walkColumn(c, chain); if (r) return r; }
    }
    return null;
  };
  return (root && walk(root, [root])) || [root];
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
    return { ...node, items: (node.items || []).map(it => (tabulaHolds(it) ? put(it) : it)) };
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
// A laned column settled (r033): one lane left, after a lane was dragged
// out or deleted, collapses into the column holding what that lane held,
// its cards or its lanes, the column's title taking the lane's when it has
// none; at any depth. A card whose last stack left is a plain card again
// (r033), with no `items`. Nodes nothing changed in come back as they were.
const tabulaSettleLanes = (node) => {
  let changed = false;
  const items = (node.items || []).map(it => {
    if (!tabulaHolds(it)) return it;
    let next = it;
    if (tabulaIsLaned(next) && next.items.length === 1) {
      const lane = next.items[0];
      const { flow: _flow, ...base } = next;  // the lane's flow is the column's now (r033)
      next = { ...base, title: next.title || lane.title || "", items: lane.items || [], ...(lane.flow === "row" ? { flow: "row" } : {}) };
      changed = true;
    }
    if (next.type !== "board" && next.type !== "column" && next.items.length === 0) {
      const { items: _none, ...plain } = next;
      changed = true;
      return plain;
    }
    const r = tabulaSettleLanes(next);
    if (r !== next) changed = true;
    return r;
  });
  return changed ? { ...node, items } : node;
};
// Every transform that can take a card off a board or a lane out of its
// column ends here (r032, r033): the lanes settled, then the anchors
// healed with the ends the view measured.
const tabulaSettle = (root, ends) => tabulaHealAnchors(tabulaSettleLanes(root), ends);
// A delete, a move to a place, and a column's delete (below) end by
// settling (r032, r033), with the ends the view measured. Several items go
// in one step (r033), a group selected together.
const tabulaDeleteItems = (doc, ids, ends) => {
  if (!doc || !doc.root) return doc;
  const set = new Set(ids);
  let hit = false;
  const root = tabulaRewrite(doc.root, it => { if (set.has(it.id)) { hit = true; return null; } return it; });
  return hit ? { ...doc, root: tabulaSettle(root, ends), updatedAt: isoNow() } : doc;
};
const tabulaDeleteItem = (doc, id, ends) => tabulaDeleteItems(doc, [id], ends);
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
    return { ...node, items: items.map(it => (tabulaHolds(it) ? move(it) : it)) };
  };
  const root = move(doc.root);
  return hit ? { ...doc, root, updatedAt: isoNow() } : doc;
};
// A move to a place (v1.7 r030): into a column at an index, where the item
// loses its position and takes the stack's order (a laned column's first
// lane, down the lanes, when the column itself is named, r033), onto a
// board at x and y, where it takes them (and the width given, when it
// comes out of a column) and goes to the end, or (r033) as a lane of a
// column at an index among its lanes, a lane's lanes included, the host's
// own stack becoming its first lane when it had none, a laned column
// dropped keeping its lanes, or (r033) as a stack under a card, `laneOf`
// naming the card, at an index among the stacks it has. A lane dropped
// among its own column's lanes is reordered. Refused: a column into a
// stack, anything into itself or into what it holds. The index counts the
// items without the item itself, so a reorder reads as it looks.
const tabulaMoveTo = (doc, id, target, ends) => {
  if (!doc || !doc.root || !target) return doc;
  const item = tabulaFindItem(doc.root, id);
  if (!item) return doc;
  if (target.columnId) {
    if (item.type === "column") return doc;
    if (target.columnId === id || tabulaFindItem(item, target.columnId)) return doc;
    let host = tabulaFindItem(doc.root, target.columnId);
    if (!host || host.type !== "column") return doc;
    while (tabulaIsLaned(host)) host = host.items[0];
    if (host.id !== target.columnId) target = { columnId: host.id, index: target.index };
  } else if (target.laneOf) {
    if (item.type !== "column") return doc;
    if (target.laneOf === id || tabulaFindItem(item, target.laneOf)) return doc;
    const host = tabulaFindItem(doc.root, target.laneOf);
    if (!host || host.type === "board") return doc;
  } else if (target.boardId) {
    if (target.boardId === id || tabulaFindItem(item, target.boardId)) return doc;
  } else return doc;
  if (target.columnId || target.laneOf) {
    const hostId = target.columnId || target.laneOf;
    const parent = tabulaParentOf(doc.root, id);
    if (parent && parent.id === hostId) {
      const rest = (parent.items || []).filter(it => it.id !== id);
      const orig = (parent.items || []).findIndex(it => it.id === id);
      const idx = Math.max(0, Math.min(rest.length, tabulaInt(target.index, rest.length)));
      if (orig === idx) return doc;  // the same place in the stack, or among the lanes
    }
  }
  const without = tabulaRewrite(doc.root, it => (it.id === id ? null : it));
  let placed = false;
  const put = (node) => {
    if (target.columnId && node.id === target.columnId && node.type === "column") {
      placed = true;
      const { x, y, w, ...rest } = item;
      const items = [...(node.items || [])];
      const idx = Math.max(0, Math.min(items.length, tabulaInt(target.index, items.length)));
      items.splice(idx, 0, rest);
      return { ...node, items };
    }
    if (target.laneOf && node.id === target.laneOf && node.type !== "board") {
      placed = true;
      // a column from the board loses its place and its width; a lane keeps its width (r033)
      const { x, y, w, ...rest } = item;
      const lane = Number.isFinite(x) ? rest : item;
      // a column's lanes, its stack as the first when it has none; a card's stacks (r033)
      const lanes = node.type !== "column" ? [...(node.items || [])] : tabulaIsLaned(node) ? [...node.items] : [{ id: `n-${genId()}`, type: "column", title: "", color: node.color, items: node.items || [] }];
      const idx = Math.max(0, Math.min(lanes.length, tabulaInt(target.index, lanes.length)));
      lanes.splice(idx, 0, lane);
      return { ...node, items: lanes };
    }
    if (target.boardId && node.id === target.boardId && node.type === "board") {
      placed = true;
      const w = tabulaClampWidth(item.type, tabulaInt(target.w, Number.isFinite(item.w) ? item.w : TABULA.width[item.type]), tabulaStacked(item));
      return { ...node, items: [...(node.items || []), { ...item, x: tabulaInt(target.x, 0), y: tabulaInt(target.y, 0), w }] };
    }
    // every item is visited, since a plain card may be the target; one that holds nothing comes back as it is
    if (!Array.isArray(node.items)) return node;
    return { ...node, items: node.items.map(put) };
  };
  const root = put(without);
  return placed ? { ...doc, root: tabulaSettle(root, ends), updatedAt: isoNow() } : doc;
};
// Several moves as one step (r033): a group dropped together, each to its
// place in turn.
const tabulaMoveMany = (doc, moves, ends) => (moves || []).reduce((d, m) => tabulaMoveTo(d, m[0], m[1], ends), doc);
// Cards per row (r033): a column, or a lane, with `n` lanes, 1 to
// TABULA.maxLanes. From one to more, the cards go to the first lane and
// the rest start empty; from more to fewer, the cards of the lanes past
// the count, at any depth, merge into the last kept, down its lanes; to
// one, every card below merges into the column in lane order. Nothing is
// lost, and the column keeps its id, title, and color. On a card (r033)
// the count is its stacks: from none, `n` empty ones; from more to fewer
// the stacks past the count merge into the last kept as lanes do, down to
// one stack holding every card below.
const tabulaSetLanes = (doc, id, n) => {
  if (!doc || !doc.root) return doc;
  const col = tabulaFindItem(doc.root, id);
  if (!col || col.type === "board") return doc;
  const card = col.type !== "column";
  const count = Math.max(1, Math.min(TABULA.maxLanes, tabulaInt(n, 1)));
  const lanes = card ? (tabulaStacked(col) ? col.items : null) : (tabulaIsLaned(col) ? col.items : null);
  if ((lanes ? lanes.length : (card ? 0 : 1)) === count) return doc;
  const newLane = (items) => ({ id: `n-${genId()}`, type: "column", title: "", color: card ? TABULA.color : col.color, items: items || [] });
  let next;
  // a column's flow (r033) goes to its first lane when lanes are made and comes back from it at one
  const { flow: _flow, ...colBase } = col;
  if (count === 1 && !card) next = { ...colBase, items: tabulaCardsBelow(col), ...(lanes && lanes[0].flow === "row" ? { flow: "row" } : {}) };
  else {
    let ls = lanes ? lanes.slice() : (card ? [] : [{ ...newLane(col.items), ...(col.flow === "row" ? { flow: "row" } : {}) }]);
    if (ls.length > count) {
      const keep = ls.slice(0, count), extra = ls.slice(count);
      keep[count - 1] = tabulaAppendCards(keep[count - 1], extra.flatMap(tabulaCardsBelow));
      ls = keep;
    }
    while (ls.length < count) ls.push(newLane());
    next = { ...(card ? col : colBase), items: ls };
  }
  const root = tabulaRewrite(doc.root, it => (it.id === id ? next : it));
  return { ...doc, root: tabulaHealAnchors(root), updatedAt: isoNow() };
};
// A column deleted (v1.7 r030): with `placements` ([{ id, x, y, w }], where
// each card stood and how wide, measured by the view), its cards go out
// onto the board that holds it, after everything else; without, they go
// with it. A card the placements don't name stacks under the last at the
// column's width. A laned column's lanes all give their cards out (r033),
// at any depth; a lane's, or a stack's under a card (r033), go out onto the
// board above it, and the column it leaves collapses when one lane is
// left. A card with stacks (r033) gives its stacks out whole, each a
// column on the board where it stood, its lanes kept.
const tabulaDeleteColumn = (doc, id, placements, ends) => {
  if (!doc || !doc.root) return doc;
  const col = tabulaFindItem(doc.root, id);
  if (!col || col.type === "board") return doc;
  if (!placements) return tabulaDeleteItem(doc, id, ends);
  const holder = tabulaParentOf(doc.root, id);
  let boardNode = holder, frame = Number.isFinite(col.x) ? col : holder;
  while (boardNode && boardNode.type !== "board") { if (!Number.isFinite(frame.x)) frame = boardNode; boardNode = tabulaParentOf(doc.root, boardNode.id); }
  if (!boardNode || boardNode.type !== "board") return doc;
  const at = new Map(placements.map(p => [p.id, p]));
  let nextY = tabulaInt(frame.y, 0);
  const cards = col.type === "column" ? tabulaCardsBelow(col) : (col.items || []);
  const freed = cards.map(it => {
    const p = at.get(it.id);
    const x = p ? tabulaInt(p.x, frame.x) : tabulaInt(frame.x, 0);
    const y = p ? tabulaInt(p.y, nextY) : nextY;
    nextY = y + 60;
    const w = tabulaClampWidth(it.type, tabulaInt(p ? p.w : undefined, tabulaInt(frame.w, TABULA.width[it.type])), tabulaStacked(it));
    return { ...it, x, y, w };
  });
  const without = tabulaRewrite(doc.root, it => (it.id === id ? null : it));
  let hit = false;
  const put = (node) => {
    if (node.id === boardNode.id && node.type === "board") { hit = true; return { ...node, items: [...(node.items || []), ...freed] }; }
    return { ...node, items: (node.items || []).map(it => (tabulaHolds(it) ? put(it) : it)) };
  };
  const root = put(without);
  return hit ? { ...doc, root: tabulaSettle(root, ends), updatedAt: isoNow() } : doc;
};
// A linked card becomes a note titled with the name it showed.
const tabulaConvertToNote = (doc, id, name) => tabulaUpdateItem(doc, id, (it) => {
  const { entryId, _cachedName, ...rest } = it;
  return { ...rest, type: "note", title: name || _cachedName || "(empty)", body: "", color: TABULA.color };
});
const tabulaRelink = (doc, id, entryId, name) => tabulaUpdateItem(doc, id, { entryId, _cachedName: name || "" });

// Copies of items with fresh ids throughout (r033), a sub-board's shapes'
// anchors following its cards to their new ids; shape ids stay, as a map's.
const tabulaReid = (items) => {
  const fresh = new Map();
  const mint = (it) => { fresh.set(it.id, `n-${genId()}`); if (Array.isArray(it.items)) it.items.forEach(mint); };
  items.forEach(mint);
  const walk = (it) => {
    const out = { ...it, id: fresh.get(it.id) };
    if (Array.isArray(it.items)) out.items = it.items.map(walk);
    if (it.type === "board" && Array.isArray(it.shapes)) out.shapes = it.shapes.map(s => (s && s.anchors && typeof s.anchors === "object" ? { ...s, anchors: { start: fresh.get(s.anchors.start) || null, end: fresh.get(s.anchors.end) || null } } : s));
    return out;
  };
  return items.map(walk);
};
// Several items placed on a board at once (r033), coerced as placed, at
// the top in their order.
const tabulaAddItems = (doc, boardId, items) => {
  if (!doc || !doc.root || !Array.isArray(items) || !items.length) return doc;
  const coerced = items.map(it => tabulaCoerceItem(it, true)).filter(Boolean);
  let placed = false;
  const put = (node) => {
    if (node.id === boardId && node.type === "board") { placed = true; return { ...node, items: [...(node.items || []), ...coerced] }; }
    return { ...node, items: (node.items || []).map(it => (tabulaHolds(it) ? put(it) : it)) };
  };
  const root = put(doc.root);
  return placed ? { ...doc, root, updatedAt: isoNow() } : doc;
};
// Duplicates (r033): copies with fresh ids, a placed one 20 pixels down
// and right of its original at the top of its board, one in a stack right
// after its original; an item inside another selected one isn't copied
// twice. Returns { doc, ids }, the copies' ids in the order made.
const tabulaDuplicate = (doc, boardId, ids) => {
  const none = { doc, ids: [] };
  if (!doc || !doc.root) return none;
  const board = tabulaBoardNode(doc.root, boardId);
  if (!board) return none;
  const set = new Set(ids);
  const picked = [];
  const walk = (node, under) => (node.items || []).forEach(it => {
    const sel = set.has(it.id);
    if (sel && !under) picked.push([it, node]);
    if (tabulaHolds(it)) walk(it, under || sel);
  });
  walk(board, false);
  if (!picked.length) return none;
  const copies = tabulaReid(picked.map(([it]) => it));
  let root = doc.root;
  const out = [];
  picked.forEach(([it, holder], i) => {
    const copy = holder.type === "board" ? { ...copies[i], x: tabulaInt(it.x, 0) + 20, y: tabulaInt(it.y, 0) + 20 } : copies[i];
    out.push(copy.id);
    const put = (node) => {
      if (node.id === holder.id && node.type === holder.type) {
        if (holder.type === "board") return { ...node, items: [...(node.items || []), copy] };
        const items = [];
        (node.items || []).forEach(c => { items.push(c); if (c.id === it.id) items.push(copy); });
        return { ...node, items };
      }
      return { ...node, items: (node.items || []).map(c => (tabulaHolds(c) ? put(c) : c)) };
    };
    root = put(root);
  });
  return { doc: { ...doc, root, updatedAt: isoNow() }, ids: out };
};
// The clipboard (r033): what Ctrl+C last copied, kept for the session
// across boards and documents, each item with the place it was copied
// from (x, y, w; a stack item's as measured), so a paste keeps the group's
// shape, and the count of pastes since, each laid 20 pixels further down
// and right so they never sit on each other. Ids are fresh at the paste.
let tabulaClipboard = { items: [], pastes: 0 };

// The shapes' transforms (v1.7 r032), each on one board's `shapes`: a shape
// added at the top, one patched (an object merges, a function returns the
// shape to keep) and coerced again, one deleted. The board is found by id,
// the root or any sub-board, in a column's stack or not.
const tabulaRewriteBoard = (doc, boardId, fn) => {
  if (!doc || !doc.root) return doc;
  let hit = false;
  const visit = (node) => {
    if (node.id === boardId && node.type === "board") { const r = fn(node); if (r !== node) hit = true; return r; }
    if (!tabulaHolds(node)) return node;
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