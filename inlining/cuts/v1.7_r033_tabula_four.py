"""v1.7 r033: Tabula IV, lanes, stacks under cards, lane widths, rows, and the multi-selection.

Stemma v2's plan, item 8 (docs/stemma-v2-spec.md, section 11; sections 4
and 6). Lanes first, Drak's 3B at r030's pass, and at this cut's review his
ask for sub-lanes (2026-10-28): a column may hold columns, at any depth,
and a column that holds columns lays them side by side as lanes, each its
own stack with its own title and color, so three short lanes read as a
table with its headers, and a column dropped into a lane makes it lanes of
its own. A card dropped in a laned column goes to the innermost lane under
the pointer, at the gap nearest it there, and stays in that lane; the
inspector's "Cards per row" (1 to 6), on a column or a lane, makes and
removes lanes with nothing lost (the cards go to the first lane when lanes
are made, the cards of the lanes past the count merge into the last kept,
and to one every card below merges into the column, in lane order); a
column dropped on a column becomes a lane beside its content, at the gap
by x, and dropped into a lane a lane of that lane, its own lanes kept; a
lane dragged out by its header is a column again, and the column it left
collapses when one lane remains. The load puts a card loose among lanes
into the first lane. Then the multi-selection: Shift+click
extends it, a drag on empty canvas draws a marquee that selects the placed
cards it encloses (Shift adds); a grip in the selection drags the selected
placed cards together, onto the board by the same delta, into a column in
their order top to bottom, or into a sub-board keeping their offsets; the
arrows nudge them; Delete deletes them, one modal for the lot when any holds
things; Duplicate (the inspector, Ctrl+D) copies with fresh ids, a placed
copy 20 pixels down and right, a stack copy after its original; Ctrl+C and
Ctrl+V copy and paste through a clipboard kept for the session, the paste
landing around the view's center with fresh ids, selected; Ctrl+A selects
every placed card. Then, his second ask at the review (2026-10-28), stacks
under cards: a card (a note, a linked card, an image) may hold columns,
drawn under its body, one as a stack and several side by side as lanes
are, at any depth, so a named character's card holds a stack of its
apprentices and each of theirs a stack of their own. A column dropped on a
card goes under it, among its stacks by x when it has some, the pointer
well inside a card in a stack taking the card over the gap; a card drops
down the stacks as down the lanes; the inspector's Stacks under it adds
one or sets their count; a stack dragged out by its header is a column
again and the card is plain again; a card with stacks deleted asks, Move
out putting its stacks on the board whole where they stood; the index
counts only the columns on a board; the load puts anything loose under a
card into its first stack, one made for it when there is none; a card
holding stacks takes the column's width ceiling. Then his third ask
(2026-10-28), lane widths: a lane, or a stack under a card, may carry
`w`, its width, dragged on the divider between it and the next; the
lanes after it keep the widths they're drawn at, stored on them too, and
the last lane takes what's left, never less than its floor; the load
keeps a lane's width and the import carries it; a lane keeps its width
when it moves and takes it to the board as a column's. Then his fourth
ask (2026-10-28), the apprenticeship tree as an org chart: a column, a
lane, or a stack may be a row (`flow: "row"`, the inspector's Lay out),
its cards side by side, each at its row width of 200, grown to what its
own stacks need; a holder is drawn at the larger of its width and what
it holds needs, from the bottom up (tabulaNeed), so a tree of rows under
a card never squeezes; a drop in a row goes by x; a column's flow goes to
its first lane when lanes are made and comes back at one; an untitled
stack under a card draws slim.

- 21_stemma: the document section's lane coercion, the import taking a
  lane at any depth, the count that skips lanes, the breadcrumb through
  lanes, tabulaIsLaned, tabulaCardsBelow, tabulaPrependCards,
  tabulaAppendCards, tabulaSettleLanes, tabulaSettle, tabulaSetLanes, the lane
  target in tabulaMoveTo, tabulaDeleteColumn for a lane and a laned column,
  tabulaDeleteItems, tabulaMoveMany, tabulaReid, tabulaAddItems,
  tabulaDuplicate, tabulaClipboard; TabulaCard's lanes and the lane insert
  line; TabulaInspector's Cards per row, Duplicate, and the lane's words;
  TabulaDeleteModal over a list; TabulaSelectionPanel; the view's selection,
  marquee, group drag, batch delete, duplicate, copy and paste, and keys;
  then, for the stacks, tabulaHolds and tabulaStacked, the walkers and the
  transforms going down into a card's items, the card's coercion, the
  import, the count, tabulaSetLanes and tabulaDeleteColumn on a card,
  TabulaCard's stacks and its `role`, TabulaInspector's Stacks under it
  and the stack's words, TabulaDeleteModal for a stacked card, the drop
  target through cards, the delete flow's placements of a card's stacks;
  then, for the widths, TABULA.minLaneWidth, tabulaClampLaneWidth, the
  lane's width kept by the coercion and by a move, TabulaCard's `lastLane`
  and the dividers, the view's laneResize and onDividerPointerDown; then,
  for the rows, TABULA.rowWidth, tabulaNeed, the column's flow in the
  coercion, the settle, and tabulaSetLanes, TabulaCard's `fit` and
  `inRow`, the row body, the slim stack, TabulaInspector's Lay out, the
  drop by x, the view's need per card.
- shell.html: the lanes, the lane insert line, the marquee; the stacks
  under a card and the line under a plain card; the lane divider; the row
  and its standing insert line; the slim stack header.

Declared scope: 21_stemma.jsx, shell.html. Declarations added:
tabulaIsLaned, tabulaCardsBelow, tabulaPrependCards, tabulaAppendCards,
tabulaSettleLanes, tabulaSettle, tabulaSetLanes, tabulaDeleteItems,
tabulaMoveMany, tabulaReid, tabulaAddItems, tabulaDuplicate,
tabulaClipboard, TabulaSelectionPanel, tabulaHolds, tabulaStacked,
tabulaClampLaneWidth, tabulaNeed.

String-anchored edits in four passes, the lanes and the multi-selection
first, the stacks under cards on the tree they leave, the lane widths on
that, and the rows on that; every anchor must occur exactly once at its
turn. Run from anywhere inside the
repository:
    python3 inlining/cuts/v1.7_r033_tabula_four.py
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
# 21_stemma: the document
# ═══════════════════════════════════════════════════════════════════════════════

DOC_HEAD_OLD = r"""// URL), and, from r030, a column and a sub-board. x, y, w are integers in"""
DOC_HEAD_NEW = r"""// URL), and, from r030, a column (laned from r033: a column holding
// columns, one level deep, laid side by side) and a sub-board. x, y, w are integers in"""

CONST_OLD = r"""  maxWidth: 800,
  color: "#c8a96e","""
CONST_NEW = r"""  maxWidth: 800,
  maxColumnWidth: 2400,                      // a column's own ceiling (r033), room for lanes within lanes
  maxLanes: 6,                               // "Cards per row" (r033): the most lanes a column takes
  color: "#c8a96e","""

CLAMP_OLD = r"""const tabulaClampWidth = (type, w) => Math.max(TABULA.minWidth[type] || 160, Math.min(TABULA.maxWidth, w));"""
CLAMP_NEW = r"""const tabulaClampWidth = (type, w) => Math.max(TABULA.minWidth[type] || 160, Math.min(type === "column" ? TABULA.maxColumnWidth : TABULA.maxWidth, w));"""

COERCE_COLUMN_OLD = r"""  } else if (type === "column") {
    out.title = tabulaStr(it.title);
    out.color = tabulaHex(it.color, TABULA.color);
    out.items = (Array.isArray(it.items) ? it.items : []).map(c => tabulaCoerceItem(c, false)).filter(Boolean);
  } else if (type === "board") {"""
COERCE_COLUMN_NEW = r"""  } else if (type === "column") {
    out.title = tabulaStr(it.title);
    out.color = tabulaHex(it.color, TABULA.color);
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
  } else if (type === "board") {"""

IMPORT_CHECK_OLD = r"""  const check = (it, placed, path) => {
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
  };"""
IMPORT_CHECK_NEW = r"""  const check = (it, placed, path) => {
    if (!it || typeof it !== "object") return `Invalid item at ${path} (not an object).`;
    if (!TABULA_ITEM_TYPES.includes(it.type)) return `Item at ${path} has an unknown type "${it.type}".`;
    if (it.type === "linked" && (typeof it.entryId !== "string" || !it.entryId.trim())) return `Linked card at ${path} is missing entryId.`;
    if (it.type === "image" && (typeof it.image !== "string" || !it.image.trim())) return `Image card at ${path} has no image.`;
    if (it.type === "column") {
      // a column inside a column is a lane (r033), at any depth
      for (let i = 0; i < (Array.isArray(it.items) ? it.items.length : 0); i++) { const e = check(it.items[i], false, `${path}.items[${i}]`); if (e) return e; }
    }
    if (it.type === "board") {
      for (let i = 0; i < (Array.isArray(it.items) ? it.items.length : 0); i++) { const e = check(it.items[i], true, `${path}.items[${i}]`); if (e) return e; }
    }
    return null;
  };"""

COUNT_OLD = r"""const tabulaCountBelow = (node) => {
  let cards = 0, columns = 0;
  tabulaWalk(node, (it) => { if (it.type === "column") columns++; else if (TABULA_ITEM_TYPES.includes(it.type)) cards++; });
  return { cards, columns };
};"""
COUNT_NEW = r"""const tabulaCountBelow = (node) => {
  let cards = 0, columns = 0;
  // a lane (r033) is its column's, not a column of its own
  tabulaWalk(node, (it, holder) => { if (it.type === "column") { if (holder.type !== "column") columns++; } else if (TABULA_ITEM_TYPES.includes(it.type)) cards++; });
  return { cards, columns };
};
// A column holding lanes (r033): one that holds columns, at any depth.
const tabulaIsLaned = (col) => !!col && col.type === "column" && (col.items || []).some(c => c && c.type === "column");
// The cards below a column at any depth, in lane order; cards put before
// or after them, into the first or the last lane down the lanes when the
// column has lanes.
const tabulaCardsBelow = (col) => (col.items || []).flatMap(c => (c.type === "column" ? tabulaCardsBelow(c) : [c]));
const tabulaPrependCards = (col, cards) => (tabulaIsLaned(col)
  ? { ...col, items: col.items.map((l, i) => (i === 0 ? tabulaPrependCards(l, cards) : l)) }
  : { ...col, items: [...cards, ...(col.items || [])] });
const tabulaAppendCards = (col, cards) => (tabulaIsLaned(col)
  ? { ...col, items: col.items.map((l, i) => (i === col.items.length - 1 ? tabulaAppendCards(l, cards) : l)) }
  : { ...col, items: [...(col.items || []), ...cards] });"""

PATH_OLD = r"""      else if (it.type === "column") { for (const c of (it.items || [])) { if (c.type === "board") { const r = walk(c, [...chain, c]); if (r) return r; } } }
    }
    return null;
  };
  return (root && walk(root, [root])) || [root];
};"""
PATH_NEW = r"""      else if (it.type === "column") { const r = walkColumn(it, chain); if (r) return r; }
    }
    return null;
  };
  // a board in a column's stack, or in a lane's (r033)
  const walkColumn = (col, chain) => {
    for (const c of (col.items || [])) {
      if (c.type === "board") { const r = walk(c, [...chain, c]); if (r) return r; }
      else if (c.type === "column") { const r = walkColumn(c, chain); if (r) return r; }
    }
    return null;
  };
  return (root && walk(root, [root])) || [root];
};"""

DELETE_ITEM_OLD = r"""// A delete, a move to a place, and a column's delete (below) end by
// healing the anchors (r032), with the ends the view measured.
const tabulaDeleteItem = (doc, id, ends) => {
  if (!doc || !doc.root) return doc;
  let hit = false;
  const root = tabulaRewrite(doc.root, it => { if (it.id === id) { hit = true; return null; } return it; });
  return hit ? { ...doc, root: tabulaHealAnchors(root, ends), updatedAt: isoNow() } : doc;
};"""
DELETE_ITEM_NEW = r"""// A laned column settled (r033): one lane left, after a lane was dragged
// out or deleted, collapses into the column holding what that lane held,
// its cards or its lanes, the column's title taking the lane's when it has
// none; at any depth. Nodes nothing changed in come back as they were.
const tabulaSettleLanes = (node) => {
  let changed = false;
  const items = (node.items || []).map(it => {
    if (it.type !== "board" && it.type !== "column") return it;
    let next = it;
    if (tabulaIsLaned(next) && next.items.length === 1) {
      const lane = next.items[0];
      next = { ...next, title: next.title || lane.title || "", items: lane.items || [] };
      changed = true;
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
const tabulaDeleteItem = (doc, id, ends) => tabulaDeleteItems(doc, [id], ends);"""

MOVETO_OLD = r"""// A move to a place (v1.7 r030): into a column at an index, where the item
// loses its position and takes the stack's order, or onto a board at x and
// y, where it takes them (and the width given, when it comes out of a
// column) and goes to the end. Refused: a column into a column, anything
// into itself or into what it holds. The index counts the column's items
// without the item itself, so a reorder inside the column reads as it looks.
const tabulaMoveTo = (doc, id, target, ends) => {
  if (!doc || !doc.root || !target) return doc;
  const item = tabulaFindItem(doc.root, id);
  if (!item) return doc;
  if (target.columnId) {
    if (item.type === "column") return doc;
    if (target.columnId === id || tabulaFindItem(item, target.columnId)) return doc;
  } else if (target.boardId) {
    if (target.boardId === id || tabulaFindItem(item, target.boardId)) return doc;
  } else return doc;
  if (target.columnId) {
    const parent = tabulaParentOf(doc.root, id);
    if (parent && parent.id === target.columnId) {
      const rest = (parent.items || []).filter(it => it.id !== id);
      const orig = (parent.items || []).findIndex(it => it.id === id);
      const idx = Math.max(0, Math.min(rest.length, tabulaInt(target.index, rest.length)));
      if (orig === idx) return doc;  // the same place in the stack
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
    if (target.boardId && node.id === target.boardId && node.type === "board") {
      placed = true;
      const w = tabulaClampWidth(item.type, tabulaInt(target.w, Number.isFinite(item.w) ? item.w : TABULA.width[item.type]));
      return { ...node, items: [...(node.items || []), { ...item, x: tabulaInt(target.x, 0), y: tabulaInt(target.y, 0), w }] };
    }
    return { ...node, items: (node.items || []).map(it => (it.type === "board" || it.type === "column") ? put(it) : it) };
  };
  const root = put(without);
  return placed ? { ...doc, root: tabulaHealAnchors(root, ends), updatedAt: isoNow() } : doc;
};"""
MOVETO_NEW = r"""// A move to a place (v1.7 r030): into a column at an index, where the item
// loses its position and takes the stack's order (a laned column's first
// lane, down the lanes, when the column itself is named, r033), onto a
// board at x and y, where it takes them (and the width given, when it
// comes out of a column) and goes to the end, or (r033) as a lane of a
// column at an index among its lanes, a lane's lanes included, the host's
// own stack becoming its first lane when it had none, a laned column
// dropped keeping its lanes. A lane dropped among its own column's lanes
// is reordered. Refused: a column into a stack, anything into itself or
// into what it holds. The index counts the items without the item itself,
// so a reorder reads as it looks.
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
    if (!host || host.type !== "column") return doc;
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
    if (target.laneOf && node.id === target.laneOf && node.type === "column") {
      placed = true;
      const { x, y, w, ...lane } = item;
      const lanes = tabulaIsLaned(node) ? [...node.items] : [{ id: `n-${genId()}`, type: "column", title: "", color: node.color, items: node.items || [] }];
      const idx = Math.max(0, Math.min(lanes.length, tabulaInt(target.index, lanes.length)));
      lanes.splice(idx, 0, lane);
      return { ...node, items: lanes };
    }
    if (target.boardId && node.id === target.boardId && node.type === "board") {
      placed = true;
      const w = tabulaClampWidth(item.type, tabulaInt(target.w, Number.isFinite(item.w) ? item.w : TABULA.width[item.type]));
      return { ...node, items: [...(node.items || []), { ...item, x: tabulaInt(target.x, 0), y: tabulaInt(target.y, 0), w }] };
    }
    return { ...node, items: (node.items || []).map(it => (it.type === "board" || it.type === "column") ? put(it) : it) };
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
// lost, and the column keeps its id, title, and color.
const tabulaSetLanes = (doc, id, n) => {
  if (!doc || !doc.root) return doc;
  const col = tabulaFindItem(doc.root, id);
  if (!col || col.type !== "column") return doc;
  const count = Math.max(1, Math.min(TABULA.maxLanes, tabulaInt(n, 1)));
  const lanes = tabulaIsLaned(col) ? col.items : null;
  if ((lanes ? lanes.length : 1) === count) return doc;
  const newLane = (items) => ({ id: `n-${genId()}`, type: "column", title: "", color: col.color, items: items || [] });
  let next;
  if (count === 1) next = { ...col, items: tabulaCardsBelow(col) };
  else {
    let ls = lanes ? lanes.slice() : [newLane(col.items)];
    if (ls.length > count) {
      const keep = ls.slice(0, count), extra = ls.slice(count);
      keep[count - 1] = tabulaAppendCards(keep[count - 1], extra.flatMap(tabulaCardsBelow));
      ls = keep;
    }
    while (ls.length < count) ls.push(newLane());
    next = { ...col, items: ls };
  }
  const root = tabulaRewrite(doc.root, it => (it.id === id ? next : it));
  return { ...doc, root: tabulaHealAnchors(root), updatedAt: isoNow() };
};"""

DELETE_COLUMN_OLD = r"""// A column deleted (v1.7 r030): with `placements` ([{ id, x, y }], where
// each card stood, measured by the view), its cards go out onto the board
// that held it, at the column's width, after everything else; without, they
// go with it. A card the placements don't name stacks under the last.
const tabulaDeleteColumn = (doc, id, placements, ends) => {
  if (!doc || !doc.root) return doc;
  const col = tabulaFindItem(doc.root, id);
  if (!col || col.type !== "column") return doc;
  if (!placements) return tabulaDeleteItem(doc, id, ends);
  const at = new Map(placements.map(p => [p.id, p]));
  let nextY = tabulaInt(col.y, 0);
  const freed = (col.items || []).map(it => {
    const p = at.get(it.id);
    const x = p ? tabulaInt(p.x, col.x) : tabulaInt(col.x, 0);
    const y = p ? tabulaInt(p.y, nextY) : nextY;
    nextY = y + 60;
    return { ...it, x, y, w: tabulaClampWidth(it.type, tabulaInt(col.w, TABULA.width[it.type])) };
  });
  let hit = false;
  const cut = (node) => {
    const items = node.items || [];
    if (items.some(it => it.id === id)) { hit = true; return { ...node, items: [...items.filter(it => it.id !== id), ...freed] }; }
    return { ...node, items: items.map(it => (it.type === "board" || it.type === "column") ? cut(it) : it) };
  };
  const root = cut(doc.root);
  return hit ? { ...doc, root: tabulaHealAnchors(root, ends), updatedAt: isoNow() } : doc;
};"""
DELETE_COLUMN_NEW = r"""// A column deleted (v1.7 r030): with `placements` ([{ id, x, y, w }], where
// each card stood and how wide, measured by the view), its cards go out
// onto the board that holds it, after everything else; without, they go
// with it. A card the placements don't name stacks under the last at the
// column's width. A laned column's lanes all give their cards out (r033),
// at any depth; a lane's go out onto the board above it, and the column
// it leaves collapses when one lane is left.
const tabulaDeleteColumn = (doc, id, placements, ends) => {
  if (!doc || !doc.root) return doc;
  const col = tabulaFindItem(doc.root, id);
  if (!col || col.type !== "column") return doc;
  if (!placements) return tabulaDeleteItem(doc, id, ends);
  const holder = tabulaParentOf(doc.root, id);
  let boardNode = holder, frame = Number.isFinite(col.x) ? col : holder;
  while (boardNode && boardNode.type === "column") { if (!Number.isFinite(frame.x)) frame = boardNode; boardNode = tabulaParentOf(doc.root, boardNode.id); }
  if (!boardNode || boardNode.type !== "board") return doc;
  const at = new Map(placements.map(p => [p.id, p]));
  let nextY = tabulaInt(frame.y, 0);
  const cards = tabulaCardsBelow(col);
  const freed = cards.map(it => {
    const p = at.get(it.id);
    const x = p ? tabulaInt(p.x, frame.x) : tabulaInt(frame.x, 0);
    const y = p ? tabulaInt(p.y, nextY) : nextY;
    nextY = y + 60;
    const w = tabulaClampWidth(it.type, tabulaInt(p ? p.w : undefined, tabulaInt(frame.w, TABULA.width[it.type])));
    return { ...it, x, y, w };
  });
  const without = tabulaRewrite(doc.root, it => (it.id === id ? null : it));
  let hit = false;
  const put = (node) => {
    if (node.id === boardNode.id && node.type === "board") { hit = true; return { ...node, items: [...(node.items || []), ...freed] }; }
    return { ...node, items: (node.items || []).map(it => (it.type === "board" || it.type === "column") ? put(it) : it) };
  };
  const root = put(without);
  return hit ? { ...doc, root: tabulaSettle(root, ends), updatedAt: isoNow() } : doc;
};"""

RELINK_OLD = r"""const tabulaRelink = (doc, id, entryId, name) => tabulaUpdateItem(doc, id, { entryId, _cachedName: name || "" });
"""
RELINK_NEW = r"""const tabulaRelink = (doc, id, entryId, name) => tabulaUpdateItem(doc, id, { entryId, _cachedName: name || "" });

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
    return { ...node, items: (node.items || []).map(it => (it.type === "board" || it.type === "column") ? put(it) : it) };
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
    if (it.type === "column" || it.type === "board") walk(it, under || sel);
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
      return { ...node, items: (node.items || []).map(c => (c.type === "board" || c.type === "column") ? put(c) : c) };
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
"""

# ═══════════════════════════════════════════════════════════════════════════════
# 21_stemma: TabulaCard
# ═══════════════════════════════════════════════════════════════════════════════

CARD_SIG_OLD = r"""// the body (`onPointerDown`) selects. A column's header is its grip. `stick`
// (r032) lights the card a line's pending end is over.
function TabulaCard({ item, placed, x, y, w, pool, templates, selected, dragging, ghost, over, overEdge, stick, editing, onEditChange, onEditDone, onPointerDown, onGripDown, onHandleDown, onDoubleClick, onOpenEntry, dirHandle, imageFolder, renderItem, insertAt }) {"""
CARD_SIG_NEW = r"""// the body (`onPointerDown`) selects. A column's header is its grip. `stick`
// (r032) lights the card a line's pending end is over. A column holding
// lanes (r033) draws its header over a row of lanes, each a column that
// isn't placed, drawn as `.tabula-lane` with its own header and its stack
// or its own lanes through `renderItem`, at any depth; `laneInsertAt`
// draws the line where a column dragged over it would become a lane,
// before or after a plain column's stack, or between lanes.
function TabulaCard({ item, placed, x, y, w, pool, templates, selected, dragging, ghost, over, overEdge, stick, editing, onEditChange, onEditDone, onPointerDown, onGripDown, onHandleDown, onDoubleClick, onOpenEntry, dirHandle, imageFolder, renderItem, insertAt, laneInsertAt }) {"""

CARD_COLUMN_OLD = r"""  } else if (item.type === "column") {
    const color = item.color || TABULA.color;
    const stack = item.items || [];
    const shown = renderItem ? stack.map(renderItem).filter(Boolean) : [];  // the item on the move is left out, as the gap index is
    const rows = [];
    shown.forEach((el, i) => {
      if (insertAt === i) rows.push(<div key="ins" className="tabula-insert" />);
      if (el) rows.push(el);
    });
    if (insertAt !== null && insertAt !== undefined && insertAt >= shown.length) rows.push(<div key="ins" className="tabula-insert" />);
    body = (
      <>
        <div className="tabula-column-hdr" style={{ borderTop: `3px solid ${color}` }} title={editing ? undefined : "Drag to move the column"} onPointerDown={editing ? undefined : onGripDown}>
          {!editing && !ghost && <span className="tabula-grip tabula-grip-inline" aria-hidden="true">⋮⋮</span>}
          {editing ? editBox(<input type="text" value={item.title || ""} placeholder="Column" onChange={(e) => onEditChange({ title: e.target.value }, "title")} />) : (
            <div className="tabula-column-title" style={{ color: item.title ? "var(--text)" : "var(--text-dim)", fontStyle: item.title ? "normal" : "italic" }}>{item.title || "Untitled column"}</div>
          )}
        </div>
        <div className="tabula-column-body">
          {rows.length > 0 ? rows : <div className="tabula-column-empty">{over ? "" : "Drop cards here"}</div>}
        </div>
      </>
    );
  } else if (item.type === "board") {"""
CARD_COLUMN_NEW = r"""  } else if (item.type === "column") {
    const color = item.color || TABULA.color;
    const lane = !placed && !ghost;  // a column that isn't placed is a lane (r033)
    const lanes = tabulaIsLaned(item) ? item.items : null;
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
        <div className="tabula-column-hdr" style={{ borderTop: `3px solid ${color}` }} title={editing ? undefined : (lane ? "Drag to move the lane" : "Drag to move the column")} onPointerDown={editing ? undefined : onGripDown}>
          {!editing && !ghost && <span className="tabula-grip tabula-grip-inline" aria-hidden="true">⋮⋮</span>}
          {editing ? editBox(<input type="text" value={item.title || ""} placeholder={lane ? "Lane" : "Column"} onChange={(e) => onEditChange({ title: e.target.value }, "title")} />) : (
            <div className="tabula-column-title" style={{ color: item.title ? "var(--text)" : "var(--text-dim)", fontStyle: item.title ? "normal" : "italic" }}>{item.title || (lane ? "Untitled lane" : "Untitled column")}</div>
          )}
        </div>
        {lanes ? (
          <div className="tabula-lanes">
            {lanes.map((l, i) => (
              <React.Fragment key={l.id}>
                {laneAt === i && <div className="tabula-lane-insert" />}
                {renderItem ? renderItem(l) : null}
              </React.Fragment>
            ))}
            {laneAt >= lanes.length && <div className="tabula-lane-insert" />}
          </div>
        ) : (
          <div className={`tabula-column-body${laneAt === 0 ? " lane-before" : laneAt >= 1 ? " lane-after" : ""}`}>
            {rows.length > 0 ? rows : <div className="tabula-column-empty">{over ? "" : (lane ? "" : "Drop cards here")}</div>}
          </div>
        )}
      </>
    );
  } else if (item.type === "board") {"""

CARD_CLS_OLD = r"""  const cls = `${placed ? "tabula-card" : "tabula-colitem"}${selected ? " selected" : ""}${dragging ? " dragging" : ""}${ghost ? " ghost" : ""}${over ? " over" : ""}${stick ? " stick" : ""}${item.type === "column" ? " is-column" : ""}`;"""
CARD_CLS_NEW = r"""  const cls = `${placed ? "tabula-card" : (item.type === "column" ? "tabula-lane" : "tabula-colitem")}${selected ? " selected" : ""}${dragging ? " dragging" : ""}${ghost ? " ghost" : ""}${over ? " over" : ""}${stick ? " stick" : ""}${item.type === "column" ? " is-column" : ""}`;"""

# ═══════════════════════════════════════════════════════════════════════════════
# 21_stemma: TabulaInspector, TabulaDeleteModal, TabulaSelectionPanel
# ═══════════════════════════════════════════════════════════════════════════════

INSP_SIG_OLD = r"""// on every card. A run of typing in a field is one history step.
function TabulaInspector({ item, pool, templates, isLocked, onClose, onPatch, onDelete, onRelink, onConvertToNote, onOpenEntry, onReplaceImage, onOpenBoard }) {"""
INSP_SIG_NEW = r"""// on every card. A run of typing in a field is one history step. A column
// (r033) has Cards per row, the lanes it holds, 1 to TABULA.maxLanes
// (`onLanes`), and so has a lane (`isLane`), whose lanes are lanes of its
// own; every card has Duplicate (`onDuplicate`).
function TabulaInspector({ item, isLane, pool, templates, isLocked, onClose, onPatch, onDelete, onRelink, onConvertToNote, onOpenEntry, onReplaceImage, onOpenBoard, onLanes, onDuplicate }) {"""

INSP_KIND_OLD = r"""  const kind = item.type === "note" ? "Note" : item.type === "linked" ? "Linked" : item.type === "image" ? "Image" : item.type === "column" ? "Column" : "Board";"""
INSP_KIND_NEW = r"""  const kind = item.type === "note" ? "Note" : item.type === "linked" ? "Linked" : item.type === "image" ? "Image" : item.type === "column" ? (isLane ? "Lane" : "Column") : "Board";"""

INSP_COLUMN_OLD = r"""  } else if (item.type === "column") {
    body = (
      <>
        {field("Title", <input className="input" type="text" value={item.title || ""} disabled={isLocked} placeholder="Untitled column" onChange={(e) => onPatch({ title: e.target.value }, "title")} />)}
        {field("Color", colorRow)}
        {holdsLine(item)}
      </>
    );
  } else if (item.type === "board") {"""
INSP_COLUMN_NEW = r"""  } else if (item.type === "column") {
    const laneCount = tabulaIsLaned(item) ? item.items.length : 1;
    body = (
      <>
        {field("Title", <input className="input" type="text" value={item.title || ""} disabled={isLocked} placeholder={isLane ? "Untitled lane" : "Untitled column"} onChange={(e) => onPatch({ title: e.target.value }, "title")} />)}
        {field("Color", colorRow)}
        {field("Cards per row", (
          <div className="tabula-seg" title={`Lanes side by side${isLane ? " inside this lane" : ""}, each its own stack with its own title; the cards keep their places when the count changes`}>
            {Array.from({ length: TABULA.maxLanes }, (_, i) => i + 1).map(n => (
              <button key={n} type="button" className={`btn btn-small ${laneCount === n ? "btn-accent" : "btn-ghost"}`} aria-pressed={laneCount === n} disabled={isLocked} onClick={() => onLanes && onLanes(n)}>{n}</button>
            ))}
          </div>
        ))}
        {holdsLine(item)}
      </>
    );
  } else if (item.type === "board") {"""

INSP_FOOT_OLD = r"""          {item.type === "image" && (
            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={onReplaceImage}>Replace image…</button>
          )}
          <button className="btn" style={{ fontSize: 12, color: "var(--danger)", borderColor: "var(--danger)" }} onClick={onDelete}>{item.type === "column" ? "Delete column" : item.type === "board" ? "Delete board" : "Delete card"}</button>"""
INSP_FOOT_NEW = r"""          {item.type === "image" && (
            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={onReplaceImage}>Replace image…</button>
          )}
          {onDuplicate && <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={onDuplicate} title="A copy beside it (Ctrl+D)">Duplicate</button>}
          <button className="btn" style={{ fontSize: 12, color: "var(--danger)", borderColor: "var(--danger)" }} onClick={onDelete}>{item.type === "column" ? (isLane ? "Delete lane" : "Delete column") : item.type === "board" ? "Delete board" : "Delete card"}</button>"""

MODAL_OLD = r"""function TabulaDeleteModal({ item, onMoveOut, onDeleteAll, onCancel }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); onCancel(); } };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onCancel]);
  const held = tabulaCountBelow(item);
  const parts = [held.cards ? `${held.cards} ${held.cards === 1 ? "card" : "cards"}` : null, held.columns ? `${held.columns} ${held.columns === 1 ? "column" : "columns"}` : null].filter(Boolean).join(" and ");
  const isColumn = item.type === "column";
  const name = item.title || (isColumn ? "Untitled column" : "Untitled board");
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal tabula-holds-delete" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">Delete the {isColumn ? "column" : "board"}</div>
        <div className="modal-body">
          <p style={{ margin: "0 0 10px" }}>Delete {isColumn ? "column" : "board"} "{name}"?</p>
          {isColumn ? (
            <p style={{ margin: 0 }}>It holds {parts}. Move out puts {held.cards === 1 ? "it" : "them"} on the canvas where {held.cards === 1 ? "it" : "they"} stood; Delete everything deletes it all.</p>
          ) : (
            <p style={{ margin: 0 }}>It holds {parts}, and everything inside it goes with it.</p>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onDeleteAll} autoFocus={!isColumn}>Delete everything</button>
          {isColumn && <button className="btn btn-accent" onClick={onMoveOut} autoFocus>Move out</button>}
        </div>
      </div>
    </div>
  );
}"""
MODAL_NEW = r"""function TabulaDeleteModal({ items, isLane, onMoveOut, onDeleteAll, onCancel }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); onCancel(); } };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onCancel]);
  const list = Array.isArray(items) ? items : [items];
  const held = list.reduce((acc, it) => { const h = tabulaCountBelow(it); return { cards: acc.cards + h.cards, columns: acc.columns + h.columns }; }, { cards: 0, columns: 0 });
  const parts = [held.cards ? `${held.cards} ${held.cards === 1 ? "card" : "cards"}` : null, held.columns ? `${held.columns} ${held.columns === 1 ? "column" : "columns"}` : null].filter(Boolean).join(" and ");
  const hasColumn = list.some(it => it.type === "column");
  const many = list.length > 1;
  const item = list[0];
  const isColumn = item.type === "column";
  const word = isColumn ? (isLane ? "lane" : "column") : "board";
  const name = item.title || (isColumn ? (isLane ? "Untitled lane" : "Untitled column") : "Untitled board");
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal tabula-holds-delete" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">{many ? `Delete ${list.length} items` : `Delete the ${word}`}</div>
        <div className="modal-body">
          <p style={{ margin: "0 0 10px" }}>{many ? `Delete the ${list.length} selected items?` : `Delete ${word} "${name}"?`}</p>
          {many ? (
            <p style={{ margin: 0 }}>Together they hold {parts}.{hasColumn ? " Move out puts the columns' cards on the canvas where they stood (a board's go with it); Delete everything deletes it all." : " Everything inside goes with them."}</p>
          ) : isColumn ? (
            <p style={{ margin: 0 }}>It holds {parts}. Move out puts {held.cards === 1 ? "it" : "them"} on the canvas where {held.cards === 1 ? "it" : "they"} stood; Delete everything deletes it all.</p>
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
}"""

# ═══════════════════════════════════════════════════════════════════════════════
# 21_stemma: the view
# ═══════════════════════════════════════════════════════════════════════════════

VIEW_STATE_OLD = r"""  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(null);     // the id of the note, column, or board edited in place"""
VIEW_STATE_NEW = r"""  const [selection, setSelection] = useState([]);   // the selected cards' ids in the order picked, the last the primary (r033)
  const selectedId = selection.length ? selection[selection.length - 1] : null;
  const setSelectedId = (id) => setSelection(id ? [id] : []);
  const toggleSelected = (id) => setSelection(sel => (sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]));
  const [marquee, setMarquee] = useState(null);     // { x0, y0, x1, y1 }, canvas units, while a drag on empty canvas draws one (r033)
  const [editing, setEditing] = useState(null);     // the id of the note, column, or board edited in place"""

VIEW_STATE2_OLD = r"""  const [drag, setDrag] = useState(null);           // { id, x, y, w, ghost, over }: a card on the move, canvas units; over = { columnId, index }
  const [resize, setResize] = useState(null);       // { id, w }: a card on the resize
  const [placing, setPlacing] = useState(null);     // { kind }: a rail button on the drag
  const [asking, setAsking] = useState(null);       // the column or board card whose delete is being asked about"""
VIEW_STATE2_NEW = r"""  const [drag, setDrag] = useState(null);           // { id, x, y, w, ghost, over, group }: a card on the move, canvas units; over = { columnId, index } | { laneOf, index } | { boardId, edge }; group = the other selected placed cards, each at its offset (r033)
  const [resize, setResize] = useState(null);       // { id, w }: a card on the resize
  const [placing, setPlacing] = useState(null);     // { kind }: a rail button on the drag
  const [asking, setAsking] = useState(null);       // the items whose delete is being asked about, columns or board cards that hold things among them"""

VIEW_SELECTED_OLD = r"""  const items = board.items || [];
  // the selection may sit in a column's stack
  const selected = selectedId ? tabulaFindItem(board, selectedId) : null;
  const selectedParent = selected ? tabulaParentOf(board, selectedId) : null;"""
VIEW_SELECTED_NEW = r"""  const items = board.items || [];
  // the selection may sit in a column's stack; several cards may be selected (r033)
  const selected = selectedId ? tabulaFindItem(board, selectedId) : null;
  const selectedParent = selected ? tabulaParentOf(board, selectedId) : null;
  const selectedItems = selection.map(id => tabulaFindItem(board, id)).filter(Boolean);
  const multi = selectedItems.length > 1;
  const isLane = (it) => { const p = it ? tabulaParentOf(board, it.id) : null; return !!(it && it.type === "column" && p && p.type === "column"); };"""

VIEW_PRUNE_OLD = r"""  useEffect(() => {
    if (selectedId && !tabulaFindItem(board, selectedId)) setSelectedId(null);
    if (editing && !tabulaFindItem(board, editing)) setEditing(null);
    if (asking && !tabulaFindItem(board, asking.id)) setAsking(null);
  }, [board, selectedId, editing, asking]);"""
VIEW_PRUNE_NEW = r"""  useEffect(() => {
    const live = selection.filter(id => tabulaFindItem(board, id));
    if (live.length !== selection.length) setSelection(live);
    if (editing && !tabulaFindItem(board, editing)) setEditing(null);
    if (asking && !asking.every(it => tabulaFindItem(board, it.id))) setAsking(null);
  }, [board, selection, editing, asking]);"""

VIEW_DROPTARGET_OLD = r"""  // What is under the pointer, for a drop: a column, with the gap nearest
  // the pointer in its stack (the dragged item left out), or a board card
  // (r031), with the nearest of its four edges, where the line is drawn and
  // which decides where the card lands inside. From the DOM, so what the
  // line shows is where the card lands. A column never enters one; nothing
  // enters itself.
  const dropTarget = (clientX, clientY, dragged) => {
    const el = surfaceRef.current;
    if (!el || !dragged) return null;
    const inside = (r) => !(clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom);
    // a board card first, placed or in a stack, since one in a stack sits
    // inside its column's box and is the nearer intent
    for (const b of Array.from(el.querySelectorAll('[data-type="board"]'))) {
      if (b.dataset.item === dragged.id || b.classList.contains("ghost")) continue;
      const r = b.getBoundingClientRect();
      if (!inside(r)) continue;
      const fromLeft = (clientX - r.left) / Math.max(1, r.width), fromTop = (clientY - r.top) / Math.max(1, r.height);
      const dists = [["left", fromLeft], ["right", 1 - fromLeft], ["top", fromTop], ["bottom", 1 - fromTop]];
      dists.sort((p, q) => p[1] - q[1]);
      return { boardId: b.dataset.item, edge: dists[0][0] };
    }
    if (dragged.type !== "column") {
      for (const col of Array.from(el.querySelectorAll('.tabula-card[data-type="column"]'))) {
        if (col.dataset.item === dragged.id) continue;
        const r = col.getBoundingClientRect();
        if (!inside(r)) continue;
        const kids = Array.from(col.querySelectorAll(":scope > .tabula-column-body > .tabula-colitem")).filter(k => k.dataset.item !== dragged.id);
        let index = 0;
        kids.forEach(k => { const kr = k.getBoundingClientRect(); if (kr.top + kr.height / 2 < clientY) index++; });
        return { columnId: col.dataset.item, index };
      }
    }
    return null;
  };"""
VIEW_DROPTARGET_NEW = r"""  // What is under the pointer, for a drop: a board card (r031) first,
  // placed or in a stack, with the nearest of its four edges, where the line
  // is drawn and which decides where the card lands inside; then a column:
  // for a card, its stack, or (r033) the innermost lane under the pointer
  // when it holds lanes, and the gap nearest the pointer there, the dragged
  // items left out; for a column (r033), the lane whose middle the pointer
  // is over, down the lanes, which it joins as a lane of that lane at the
  // gap by x (before or after the stack when the lane has none), or, over
  // a lane's edge, the outer header, or the gaps, the host above at the gap
  // by x. From the DOM, so what the line shows is where the card lands.
  // Nothing enters itself or anything moving with it (`moving`, the group's
  // ids).
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
    for (const col of Array.from(el.querySelectorAll('.tabula-card[data-type="column"]'))) {
      if (ids.has(col.dataset.item)) continue;
      const r = col.getBoundingClientRect();
      if (!inside(r)) continue;
      const lanesOf = (node) => Array.from(node.querySelectorAll(":scope > .tabula-lanes > .tabula-lane")).filter(l => !ids.has(l.dataset.item));
      if (dragged.type === "column") {
        // down the lanes while the pointer is well inside one (12 screen pixels from its edges)
        let host = col;
        for (;;) {
          const lanes = lanesOf(host);
          const inner = lanes.find(l => { const lr = l.getBoundingClientRect(); return clientX >= lr.left + 12 && clientX <= lr.right - 12 && clientY >= lr.top; });
          if (!inner) break;
          host = inner;
        }
        const lanes = lanesOf(host);
        const hr = host.getBoundingClientRect();
        let index = 0;
        if (lanes.length) lanes.forEach(l => { const lr = l.getBoundingClientRect(); if (lr.left + lr.width / 2 < clientX) index++; });
        else index = clientX > hr.left + hr.width / 2 ? 1 : 0;
        return { laneOf: host.dataset.item, index };
      }
      // a card: the innermost lane under the pointer, by x at each level
      let stack = col;
      for (;;) {
        const lanes = lanesOf(stack);
        if (!lanes.length) break;
        stack = lanes.find(l => { const lr = l.getBoundingClientRect(); return clientX >= lr.left && clientX <= lr.right; }) || lanes.reduce((best, l) => { const lr = l.getBoundingClientRect(); const d = Math.min(Math.abs(clientX - lr.left), Math.abs(clientX - lr.right)); return !best || d < best.d ? { l, d } : best; }, null).l;
      }
      const kids = Array.from(stack.querySelectorAll(":scope > .tabula-column-body > .tabula-colitem")).filter(k => !ids.has(k.dataset.item));
      let index = 0;
      kids.forEach(k => { const kr = k.getBoundingClientRect(); if (kr.top + kr.height / 2 < clientY) index++; });
      return { columnId: stack.dataset.item, index };
    }
    return null;
  };"""

VIEW_SELECTCARD_OLD = r"""  const selectCard = (it) => (e) => {
    if (e.button !== 0 || camera.spaceHeld) return;
    if (editing === it.id) return;
    e.stopPropagation();
    if (editing) endEdit();
    drawing.deselect();
    setSelectedId(it.id);
  };
  // a press on a card's grip (a column's header) selects it and begins the
  // move that commits on release: into a column at the gap, into a board
  // card by its edge, or onto the board at the drop, raised
  const beginDrag = (it, parent) => (e) => {
    if (e.button !== 0 || camera.spaceHeld) return;
    if (editing === it.id) return;
    e.stopPropagation();
    if (editing) endEdit();
    drawing.deselect();
    setSelectedId(it.id);
    if (isLocked) return;
    const startX = e.clientX, startY = e.clientY;
    const box = (e.currentTarget.closest("[data-item]") || e.currentTarget).getBoundingClientRect();
    const z0 = camera.viewRef.current.zoom;
    const grab = { dx: (e.clientX - box.left) / z0, dy: (e.clientY - box.top) / z0 };
    const inStack = parent && parent.type === "column";
    const w = inStack ? tabulaClampWidth(it.type, parent.w) : it.w;
    const at = (ev) => { const p = camera.toCanvas(ev.clientX, ev.clientY); return { x: p.x - grab.dx, y: p.y - grab.dy }; };
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
        setDrag({ id: it.id, x: p.x, y: p.y, w, ghost: inStack, over: dropTarget(ev.clientX, ev.clientY, it) });
      },
      onUp: (ev) => {
        document.body.classList.remove("tabula-dragging");
        const moved = Math.hypot(ev.clientX - startX, ev.clientY - startY) > TABULA.dragSlop;
        setDrag(null);
        if (!moved) return;
        const over = dropTarget(ev.clientX, ev.clientY, it);
        // the ends stuck to the card as drawn before the press, for the day it leaves the board
        const ends = drawing.endsFor(tabulaIdsBelow(it));
        if (over && over.columnId) apply(tabulaMoveTo(stemma, it.id, { columnId: over.columnId, index: over.index }, ends));
        else if (over && over.boardId) {
          const target = tabulaBoardNode(stemma.root, over.boardId);
          if (target) { const l = boardLanding(target, over.edge, w); apply(tabulaMoveTo(stemma, it.id, { boardId: over.boardId, x: l.x, y: l.y, w }, ends)); }
        }
        else { const p = at(ev); apply(tabulaMoveTo(stemma, it.id, { boardId: board.id, x: tabulaSnap(p.x), y: tabulaSnap(p.y), w }, ends)); }
      },
    });
  };"""
VIEW_SELECTCARD_NEW = r"""  const selectCard = (it) => (e) => {
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
    const inStack = parent && parent.type === "column";
    const inGroup = !inStack && selection.includes(it.id) && selection.length > 1;
    if (!inGroup) setSelectedId(it.id);
    if (isLocked) return;
    const startX = e.clientX, startY = e.clientY;
    const box = (e.currentTarget.closest("[data-item]") || e.currentTarget).getBoundingClientRect();
    const z0 = camera.viewRef.current.zoom;
    const grab = { dx: (e.clientX - box.left) / z0, dy: (e.clientY - box.top) / z0 };
    const w = inStack ? tabulaClampWidth(it.type, parent.w) : it.w;
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
  };"""

VIEW_PANE_OLD = r"""  const onPanePointerDown = (e) => {
    if (e.target && e.target.closest && e.target.closest(".tabula-card, .tabula-ui")) return;
    if (e.button !== 0) return;
    if (editing) endEdit();
    setSelectedId(null);
    drawing.deselect();
    if (picker) setPicker(null);
    if (paneRef.current) paneRef.current.focus();
  };"""
VIEW_PANE_NEW = r"""  const onPanePointerDown = (e) => {
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
  };"""

VIEW_DELETE_OLD = r"""  // Deleting: a card goes; a column or a board card that holds anything
  // asks first (TabulaDeleteModal). A column's cards moved out land where
  // they stood, measured from the stack as drawn.
  const requestDelete = (it) => {
    if (!it || isLocked) return;
    const held = tabulaCountBelow(it);
    if ((it.type === "column" || it.type === "board") && (held.cards > 0 || held.columns > 0)) { setAsking(it); return; }
    apply(tabulaDeleteItem(stemma, it.id, drawing.endsFor(tabulaIdsBelow(it))));
  };
  const columnPlacements = (col) => {
    const el = surfaceRef.current && surfaceRef.current.querySelector(`.tabula-card[data-item="${col.id}"]`);
    if (!el) return [];
    const r = el.getBoundingClientRect();
    const z = camera.viewRef.current.zoom;
    return Array.from(el.querySelectorAll(":scope > .tabula-column-body > .tabula-colitem")).map(k => {
      const kr = k.getBoundingClientRect();
      return { id: k.dataset.item, x: col.x, y: Math.round(col.y + (kr.top - r.top) / z) };
    });
  };
  const moveOut = () => { if (asking) apply(tabulaDeleteColumn(stemma, asking.id, columnPlacements(asking), drawing.endsFor([asking.id]))); setAsking(null); };
  const deleteAll = () => { if (asking) apply(tabulaDeleteItem(stemma, asking.id, drawing.endsFor(tabulaIdsBelow(asking)))); setAsking(null); };"""
VIEW_DELETE_NEW = r"""  // Deleting: a card goes; a column or a board card that holds anything
  // asks first (TabulaDeleteModal), one modal for a selection of several
  // (r033). A column's cards moved out land where they stood, measured from
  // the stack as drawn, a lane's cards too (r033).
  const requestDelete = (what) => {
    const list = (Array.isArray(what) ? what : [what]).filter(Boolean);
    if (!list.length || isLocked) return;
    const holding = list.filter(it => { if (it.type !== "column" && it.type !== "board") return false; const held = tabulaCountBelow(it); return held.cards > 0 || held.columns > 0; });
    if (holding.length) { setAsking(list); return; }
    apply(tabulaDeleteItems(stemma, list.map(it => it.id), drawing.endsFor(list.flatMap(tabulaIdsBelow))));
  };
  // where a column's or a lane's cards stand, every card in it as drawn,
  // in canvas units from the surface
  const columnPlacements = (col) => {
    const surf = surfaceRef.current;
    const el = surf && surf.querySelector(`[data-item="${String(col.id).replace(/["\\]/g, "")}"]:not(.ghost)`);
    if (!el) return [];
    const s = surf.getBoundingClientRect();
    const z = camera.viewRef.current.zoom;
    return Array.from(el.querySelectorAll(".tabula-colitem")).filter(k => k.dataset.item).map(k => {
      const kr = k.getBoundingClientRect();
      return { id: k.dataset.item, x: Math.round((kr.left - s.left) / z), y: Math.round((kr.top - s.top) / z), w: Math.round(kr.width / z) };
    });
  };
  const moveOut = () => {
    if (asking) {
      const placements = new Map(asking.filter(it => it.type === "column").map(it => [it.id, columnPlacements(it)]));
      const ends = drawing.endsFor(asking.flatMap(tabulaIdsBelow));
      let next = stemma;
      asking.forEach(it => { next = it.type === "column" ? tabulaDeleteColumn(next, it.id, placements.get(it.id), ends) : tabulaDeleteItem(next, it.id, ends); });
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
      const w = holder && Number.isFinite(holder.w) ? holder.w : Math.round(r.width / z);
      return { ...it, x: Math.round((r.left - s.left) / z), y: Math.round((r.top - s.top) / z), w: tabulaClampWidth(it.type, w) };
    };
    // the selected items in document order, one inside another selected one left to its holder
    const set = new Set(selection);
    const picked = [];
    const walk = (node, under) => (node.items || []).forEach(it => { const sel = set.has(it.id); if (sel && !under) picked.push(it); if (it.type === "column" || it.type === "board") walk(it, under || sel); });
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
  const selectAll = () => setSelection(items.map(it => it.id));"""

VIEW_KEYS_OLD = r"""  const latestRef = useRef(null);
  latestRef.current = { onDrawKey: drawing.onKey, requestDelete };
  useEffect(() => {
    const typing = (t) => { const tag = t && t.tagName ? t.tagName.toUpperCase() : ""; return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !!(t && t.isContentEditable); };
    const down = (e) => {
      if (typing(e.target) || asking) return;
      if (latestRef.current.onDrawKey(e)) return;
      if (e.key === "Escape") { if (picker) { setPicker(null); return; } if (editing) { endEdit(); return; } if (selectedId) setSelectedId(null); return; }
      if (!selected || isLocked || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); latestRef.current.requestDelete(selected); return; }
      if (!selectedParent || selectedParent.type !== "board") return;
      const step = TABULA.grid;
      const d = e.key === "ArrowLeft" ? [-step, 0] : e.key === "ArrowRight" ? [step, 0] : e.key === "ArrowUp" ? [0, -step] : e.key === "ArrowDown" ? [0, step] : null;
      if (d) { e.preventDefault(); apply(tabulaMoveItem(stemma, selected.id, selected.x + d[0], selected.y + d[1]), { coalesce: `nudge:${selected.id}` }); }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [selected, selectedParent, selectedId, editing, picker, stemma, isLocked, asking]);"""
VIEW_KEYS_NEW = r"""  const latestRef = useRef(null);
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
  }, [selectedItems, selectedId, editing, picker, stemma, isLocked, asking, items]);"""

VIEW_CARDFOR_OLD = r"""  const cardFor = (it, parent) => {
    const placed = parent.type === "board";
    const isDragged = drag && drag.id === it.id;
    if (isDragged && drag.ghost) return null;  // the ghost stands in for a stack item on the move
    const x = isDragged ? drag.x : it.x;
    const y = isDragged ? drag.y : it.y;
    const w = resize && resize.id === it.id ? resize.w : it.w;
    return (
      <TabulaCard
        key={it.id}
        item={it}
        placed={placed}
        x={x} y={y} w={w}
        pool={pool}
        templates={templates}
        selected={selectedId === it.id}
        dragging={!!isDragged}
        over={!!(drag && drag.over && (drag.over.columnId === it.id || drag.over.boardId === it.id))}
        overEdge={drag && drag.over && drag.over.boardId === it.id ? drag.over.edge : null}
        stick={drawing.stickId === it.id}
        insertAt={drag && drag.over && drag.over.columnId === it.id ? drag.over.index : null}"""
VIEW_CARDFOR_NEW = r"""  const cardFor = (it, parent) => {
    const placed = parent.type === "board";
    const inGroup = drag && drag.group ? drag.group.find(g => g.id === it.id) : null;
    const isDragged = drag && (drag.id === it.id || !!inGroup);
    if (isDragged && drag.ghost) return null;  // the ghost stands in for a stack item on the move
    const x = isDragged ? drag.x + (inGroup ? inGroup.dx : 0) : it.x;
    const y = isDragged ? drag.y + (inGroup ? inGroup.dy : 0) : it.y;
    const w = resize && resize.id === it.id ? resize.w : it.w;
    return (
      <TabulaCard
        key={it.id}
        item={it}
        placed={placed}
        x={x} y={y} w={w}
        pool={pool}
        templates={templates}
        selected={selection.includes(it.id)}
        dragging={!!isDragged}
        over={!!(drag && drag.over && (drag.over.columnId === it.id || drag.over.boardId === it.id || drag.over.laneOf === it.id))}
        overEdge={drag && drag.over && drag.over.boardId === it.id ? drag.over.edge : null}
        stick={drawing.stickId === it.id}
        insertAt={drag && drag.over && drag.over.columnId === it.id ? drag.over.index : null}
        laneInsertAt={drag && drag.over && drag.over.laneOf === it.id ? drag.over.index : null}"""

VIEW_SURFACE_OLD = r"""            <TabulaDrawLayer d={drawing} view={view} boardId={board.id} />
          </div>"""
VIEW_SURFACE_NEW = r"""            <TabulaDrawLayer d={drawing} view={view} boardId={board.id} />
            {marquee && <div className="tabula-marquee" style={{ left: marquee.x0, top: marquee.y0, width: marquee.x1 - marquee.x0, height: marquee.y1 - marquee.y0 }} />}
          </div>"""

VIEW_PANEL_OLD = r"""        {selected && (
          <TabulaInspector
            item={selected}
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
          />
        )}
        {!selected && !isLocked && drawing.panelOpen && ("""
VIEW_PANEL_NEW = r"""        {selected && !multi && (
          <TabulaInspector
            item={selected}
            isLane={isLane(selected)}
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
        {!selected && !isLocked && drawing.panelOpen && ("""

VIEW_MODAL_OLD = r"""      {asking && (
        <TabulaDeleteModal item={asking} onMoveOut={moveOut} onDeleteAll={deleteAll} onCancel={() => setAsking(null)} />
      )}"""
VIEW_MODAL_NEW = r"""      {asking && (
        <TabulaDeleteModal items={asking} isLane={asking.length === 1 && isLane(asking[0])} onMoveOut={moveOut} onDeleteAll={deleteAll} onCancel={() => setAsking(null)} />
      )}"""

# ═══════════════════════════════════════════════════════════════════════════════
# shell.html
# ═══════════════════════════════════════════════════════════════════════════════

CSS_OLD = r""".tabula-seg{display:flex;gap:4px;flex-wrap:wrap}
"""
CSS_NEW = r""".tabula-seg{display:flex;gap:4px;flex-wrap:wrap}
.tabula-lanes{display:flex;align-items:flex-start;gap:4px;padding:4px 4px 6px}
.tabula-lane{flex:1 1 0;min-width:0;position:relative;background:var(--surf);border:1px solid var(--border);border-radius:5px;user-select:none;cursor:default}
.tabula-lane.selected{outline:2px solid var(--accent);outline-offset:1px}
.tabula-lane.over{outline:2px dashed var(--accent);outline-offset:2px}
.tabula-lane.stick{outline:2px solid var(--accent);outline-offset:3px;box-shadow:0 0 0 6px var(--accent-glow)}
.tabula-lane>.tabula-column-hdr{padding:4px 8px 3px;border-radius:5px 5px 0 0}
.tabula-lane .tabula-column-title{font-size:12px}
.tabula-lane>.tabula-column-body{padding:4px 4px 6px;min-height:28px}
.tabula-lane>.tabula-lanes{padding:3px 3px 4px;gap:3px}
.tabula-lane-insert{width:0;border-left:2px solid var(--accent);margin:0 -3px;border-radius:1px;align-self:stretch;min-height:36px}
.tabula-column-body.lane-before,.tabula-column-body.lane-after{position:relative}
.tabula-column-body.lane-before::before,.tabula-column-body.lane-after::after{content:"";position:absolute;top:4px;bottom:4px;width:2px;background:var(--accent);border-radius:1px}
.tabula-column-body.lane-before::before{left:1px}
.tabula-column-body.lane-after::after{right:1px}
.tabula-marquee{position:absolute;border:1px dashed var(--accent);background:var(--accent-glow);pointer-events:none;z-index:3}
"""


# ═══════════════════════════════════════════════════════════════════════════════
# Stacks under cards (Drak's ask at the review of the amended build,
# 2026-10-28): a card (a note, a linked card, an image) may hold columns, its
# stacks, drawn under its body, one as a stack and several side by side as
# lanes are, at any depth, so a named character's card holds a stack of its
# apprentices and each of theirs a stack of their own. Applied after the
# lanes and the multi-selection above, on the tree they leave.
# ═══════════════════════════════════════════════════════════════════════════════

S_DOC_HEAD_OLD = r"""// URL), and, from r030, a column (laned from r033: a column holding
// columns, one level deep, laid side by side) and a sub-board. x, y, w are integers in
// canvas pixels at zoom 1, unbounded; heights are never stored. Absent"""
S_DOC_HEAD_NEW = r"""// URL), and, from r030, a column (laned from r033: a column holding
// columns, at any depth, laid side by side) and a sub-board; from r033 a
// card may hold columns too, its stacks, drawn under it. x, y, w are integers in
// canvas pixels at zoom 1, unbounded; heights are never stored. Absent"""

S_CLAMP_OLD = r"""const tabulaClampWidth = (type, w) => Math.max(TABULA.minWidth[type] || 160, Math.min(type === "column" ? TABULA.maxColumnWidth : TABULA.maxWidth, w));"""
S_CLAMP_NEW = r"""// a column, or (r033) a card holding stacks (`wide`), takes the column's ceiling
const tabulaClampWidth = (type, w, wide) => Math.max(TABULA.minWidth[type] || 160, Math.min(type === "column" || wide ? TABULA.maxColumnWidth : TABULA.maxWidth, w));
// What holds items the walkers go down into: a board, a column, or (r033)
// a card with stacks under it. A card's `items` are columns only, and a
// card with none has no `items` at all.
const tabulaHolds = (it) => !!it && (it.type === "board" || it.type === "column" || Array.isArray(it.items));
const tabulaStacked = (it) => !!it && it.type !== "board" && it.type !== "column" && Array.isArray(it.items) && it.items.length > 0;"""

S_VISIBLE_OLD = r"""  const walk = (node) => (node.items || []).forEach(it => { ids.add(it.id); if (it.type === "column") walk(it); });"""
S_VISIBLE_NEW = r"""  const walk = (node) => (node.items || []).forEach(it => { ids.add(it.id); if (it.type !== "board" && tabulaHolds(it)) walk(it); });"""

S_HEAL_OLD = r"""  const items = (node.items || []).map(it => {
    if (it.type !== "board" && it.type !== "column") return it;
    const r = tabulaHealAnchors(it, ends);"""
S_HEAL_NEW = r"""  const items = (node.items || []).map(it => {
    if (!tabulaHolds(it)) return it;
    const r = tabulaHealAnchors(it, ends);"""

S_COERCE_OLD = r"""  } else if (type === "board") {
    out.title = tabulaStr(it.title);
    out.color = tabulaHex(it.color, TABULA.color);
    out.icon = tabulaStr(it.icon, TABULA.icon) || TABULA.icon;
    out.items = (Array.isArray(it.items) ? it.items : []).map(c => tabulaCoerceItem(c, true)).filter(Boolean);
    const ids = tabulaVisibleIds(out);
    out.shapes = (Array.isArray(it.shapes) ? it.shapes : []).map(s => tabulaCoerceShape(s, ids)).filter(Boolean);
  }
  return out;
};"""
S_COERCE_NEW = r"""  } else if (type === "board") {
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
};"""

S_IMPORT_OLD = r"""    if (it.type === "column") {
      // a column inside a column is a lane (r033), at any depth
      for (let i = 0; i < (Array.isArray(it.items) ? it.items.length : 0); i++) { const e = check(it.items[i], false, `${path}.items[${i}]`); if (e) return e; }
    }"""
S_IMPORT_NEW = r"""    if (it.type !== "board") {
      // a column inside a column is a lane (r033), at any depth, and a
      // column under a card is its stack (r033); each holds what a column holds
      for (let i = 0; i < (Array.isArray(it.items) ? it.items.length : 0); i++) { const e = check(it.items[i], false, `${path}.items[${i}]`); if (e) return e; }
    }"""

S_WALK_OLD = r"""  (node.items || []).forEach(it => {
    fn(it, node);
    if (it.type === "column" || it.type === "board") tabulaWalk(it, fn);
  });"""
S_WALK_NEW = r"""  (node.items || []).forEach(it => {
    fn(it, node);
    if (tabulaHolds(it)) tabulaWalk(it, fn);
  });"""

S_REWRITE_OLD = r"""    items.push((r.type === "column" || r.type === "board") ? tabulaRewrite(r, fn) : r);"""
S_REWRITE_NEW = r"""    items.push(tabulaHolds(r) ? tabulaRewrite(r, fn) : r);"""

S_COUNT_OLD = r"""  // a lane (r033) is its column's, not a column of its own
  tabulaWalk(node, (it, holder) => { if (it.type === "column") { if (holder.type !== "column") columns++; } else if (TABULA_ITEM_TYPES.includes(it.type)) cards++; });"""
S_COUNT_NEW = r"""  // a lane (r033) is its column's and a stack (r033) its card's, not a column of its own
  tabulaWalk(node, (it, holder) => { if (it.type === "column") { if (holder.type === "board") columns++; } else if (TABULA_ITEM_TYPES.includes(it.type)) cards++; });"""

S_CARDS_BELOW_OLD = r"""// The cards below a column at any depth, in lane order; cards put before
// or after them, into the first or the last lane down the lanes when the
// column has lanes.
const tabulaCardsBelow"""
S_CARDS_BELOW_NEW = r"""// The cards below a column at any depth, in lane order, each with the
// stacks under it (r033); cards put before or after them, into the first
// or the last lane down the lanes when the column has lanes.
const tabulaCardsBelow"""

S_PATH_OLD = r"""  // a board in a column's stack, or in a lane's (r033)
  const walkColumn = (col, chain) => {
    for (const c of (col.items || [])) {
      if (c.type === "board") { const r = walk(c, [...chain, c]); if (r) return r; }
      else if (c.type === "column") { const r = walkColumn(c, chain); if (r) return r; }
    }
    return null;
  };"""
S_PATH_NEW = r"""  // a board in a column's stack, in a lane's (r033), or in a stack under a card (r033)
  const walkColumn = (col, chain) => {
    for (const c of (col.items || [])) {
      if (c.type === "board") { const r = walk(c, [...chain, c]); if (r) return r; }
      else if (tabulaHolds(c)) { const r = walkColumn(c, chain); if (r) return r; }
    }
    return null;
  };"""

S_ADD_OLD = r"""    if (node.id === boardId && node.type === "board") { placed = true; return { ...node, items: [...(node.items || []), item] }; }
    return { ...node, items: (node.items || []).map(it => (it.type === "board" || it.type === "column") ? put(it) : it) };
  };
  const root = put(doc.root);
  return placed ? { ...doc, root, updatedAt: isoNow() } : doc;
};
// A patch object merges into the item; a patch function returns the whole"""
S_ADD_NEW = r"""    if (node.id === boardId && node.type === "board") { placed = true; return { ...node, items: [...(node.items || []), item] }; }
    return { ...node, items: (node.items || []).map(it => (tabulaHolds(it) ? put(it) : it)) };
  };
  const root = put(doc.root);
  return placed ? { ...doc, root, updatedAt: isoNow() } : doc;
};
// A patch object merges into the item; a patch function returns the whole"""

S_SETTLE_OLD = r"""// none; at any depth. Nodes nothing changed in come back as they were.
const tabulaSettleLanes = (node) => {
  let changed = false;
  const items = (node.items || []).map(it => {
    if (it.type !== "board" && it.type !== "column") return it;
    let next = it;
    if (tabulaIsLaned(next) && next.items.length === 1) {
      const lane = next.items[0];
      next = { ...next, title: next.title || lane.title || "", items: lane.items || [] };
      changed = true;
    }"""
S_SETTLE_NEW = r"""// none; at any depth. A card whose last stack left is a plain card again
// (r033), with no `items`. Nodes nothing changed in come back as they were.
const tabulaSettleLanes = (node) => {
  let changed = false;
  const items = (node.items || []).map(it => {
    if (!tabulaHolds(it)) return it;
    let next = it;
    if (tabulaIsLaned(next) && next.items.length === 1) {
      const lane = next.items[0];
      next = { ...next, title: next.title || lane.title || "", items: lane.items || [] };
      changed = true;
    }
    if (next.type !== "board" && next.type !== "column" && next.items.length === 0) {
      const { items: _none, ...plain } = next;
      changed = true;
      return plain;
    }"""

S_MOVEITEM_OLD = r"""    return { ...node, items: items.map(it => (it.type === "board" || it.type === "column") ? move(it) : it) };"""
S_MOVEITEM_NEW = r"""    return { ...node, items: items.map(it => (tabulaHolds(it) ? move(it) : it)) };"""

S_MOVETO_DOC_OLD = r"""// comes out of a column) and goes to the end, or (r033) as a lane of a
// column at an index among its lanes, a lane's lanes included, the host's
// own stack becoming its first lane when it had none, a laned column
// dropped keeping its lanes. A lane dropped among its own column's lanes
// is reordered. Refused: a column into a stack, anything into itself or
// into what it holds. The index counts the items without the item itself,
// so a reorder reads as it looks."""
S_MOVETO_DOC_NEW = r"""// comes out of a column) and goes to the end, or (r033) as a lane of a
// column at an index among its lanes, a lane's lanes included, the host's
// own stack becoming its first lane when it had none, a laned column
// dropped keeping its lanes, or (r033) as a stack under a card, `laneOf`
// naming the card, at an index among the stacks it has. A lane dropped
// among its own column's lanes is reordered. Refused: a column into a
// stack, anything into itself or into what it holds. The index counts the
// items without the item itself, so a reorder reads as it looks."""

S_MOVETO_LANEOF_OLD = r"""    const host = tabulaFindItem(doc.root, target.laneOf);
    if (!host || host.type !== "column") return doc;
  } else if (target.boardId) {"""
S_MOVETO_LANEOF_NEW = r"""    const host = tabulaFindItem(doc.root, target.laneOf);
    if (!host || host.type === "board") return doc;
  } else if (target.boardId) {"""

S_MOVETO_PUT_OLD = r"""    if (target.laneOf && node.id === target.laneOf && node.type === "column") {
      placed = true;
      const { x, y, w, ...lane } = item;
      const lanes = tabulaIsLaned(node) ? [...node.items] : [{ id: `n-${genId()}`, type: "column", title: "", color: node.color, items: node.items || [] }];
      const idx = Math.max(0, Math.min(lanes.length, tabulaInt(target.index, lanes.length)));
      lanes.splice(idx, 0, lane);
      return { ...node, items: lanes };
    }
    if (target.boardId && node.id === target.boardId && node.type === "board") {
      placed = true;
      const w = tabulaClampWidth(item.type, tabulaInt(target.w, Number.isFinite(item.w) ? item.w : TABULA.width[item.type]));
      return { ...node, items: [...(node.items || []), { ...item, x: tabulaInt(target.x, 0), y: tabulaInt(target.y, 0), w }] };
    }
    return { ...node, items: (node.items || []).map(it => (it.type === "board" || it.type === "column") ? put(it) : it) };
  };"""
S_MOVETO_PUT_NEW = r"""    if (target.laneOf && node.id === target.laneOf && node.type !== "board") {
      placed = true;
      const { x, y, w, ...lane } = item;
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
  };"""

S_SETLANES_OLD = r"""// Cards per row (r033): a column, or a lane, with `n` lanes, 1 to
// TABULA.maxLanes. From one to more, the cards go to the first lane and
// the rest start empty; from more to fewer, the cards of the lanes past
// the count, at any depth, merge into the last kept, down its lanes; to
// one, every card below merges into the column in lane order. Nothing is
// lost, and the column keeps its id, title, and color.
const tabulaSetLanes = (doc, id, n) => {
  if (!doc || !doc.root) return doc;
  const col = tabulaFindItem(doc.root, id);
  if (!col || col.type !== "column") return doc;
  const count = Math.max(1, Math.min(TABULA.maxLanes, tabulaInt(n, 1)));
  const lanes = tabulaIsLaned(col) ? col.items : null;
  if ((lanes ? lanes.length : 1) === count) return doc;
  const newLane = (items) => ({ id: `n-${genId()}`, type: "column", title: "", color: col.color, items: items || [] });
  let next;
  if (count === 1) next = { ...col, items: tabulaCardsBelow(col) };
  else {
    let ls = lanes ? lanes.slice() : [newLane(col.items)];"""
S_SETLANES_NEW = r"""// Cards per row (r033): a column, or a lane, with `n` lanes, 1 to
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
  if (count === 1 && !card) next = { ...col, items: tabulaCardsBelow(col) };
  else {
    let ls = lanes ? lanes.slice() : (card ? [] : [newLane(col.items)]);"""

S_DELCOL_OLD = r"""// column's width. A laned column's lanes all give their cards out (r033),
// at any depth; a lane's go out onto the board above it, and the column
// it leaves collapses when one lane is left.
const tabulaDeleteColumn = (doc, id, placements, ends) => {
  if (!doc || !doc.root) return doc;
  const col = tabulaFindItem(doc.root, id);
  if (!col || col.type !== "column") return doc;
  if (!placements) return tabulaDeleteItem(doc, id, ends);
  const holder = tabulaParentOf(doc.root, id);
  let boardNode = holder, frame = Number.isFinite(col.x) ? col : holder;
  while (boardNode && boardNode.type === "column") { if (!Number.isFinite(frame.x)) frame = boardNode; boardNode = tabulaParentOf(doc.root, boardNode.id); }
  if (!boardNode || boardNode.type !== "board") return doc;
  const at = new Map(placements.map(p => [p.id, p]));
  let nextY = tabulaInt(frame.y, 0);
  const cards = tabulaCardsBelow(col);
  const freed = cards.map(it => {
    const p = at.get(it.id);
    const x = p ? tabulaInt(p.x, frame.x) : tabulaInt(frame.x, 0);
    const y = p ? tabulaInt(p.y, nextY) : nextY;
    nextY = y + 60;
    const w = tabulaClampWidth(it.type, tabulaInt(p ? p.w : undefined, tabulaInt(frame.w, TABULA.width[it.type])));
    return { ...it, x, y, w };
  });
  const without = tabulaRewrite(doc.root, it => (it.id === id ? null : it));
  let hit = false;
  const put = (node) => {
    if (node.id === boardNode.id && node.type === "board") { hit = true; return { ...node, items: [...(node.items || []), ...freed] }; }
    return { ...node, items: (node.items || []).map(it => (it.type === "board" || it.type === "column") ? put(it) : it) };
  };"""
S_DELCOL_NEW = r"""// column's width. A laned column's lanes all give their cards out (r033),
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
  };"""

S_ADDITEMS_OLD = r"""    if (node.id === boardId && node.type === "board") { placed = true; return { ...node, items: [...(node.items || []), ...coerced] }; }
    return { ...node, items: (node.items || []).map(it => (it.type === "board" || it.type === "column") ? put(it) : it) };"""
S_ADDITEMS_NEW = r"""    if (node.id === boardId && node.type === "board") { placed = true; return { ...node, items: [...(node.items || []), ...coerced] }; }
    return { ...node, items: (node.items || []).map(it => (tabulaHolds(it) ? put(it) : it)) };"""

S_DUP_OLD = r"""    if (sel && !under) picked.push([it, node]);
    if (it.type === "column" || it.type === "board") walk(it, under || sel);
  });"""
S_DUP_NEW = r"""    if (sel && !under) picked.push([it, node]);
    if (tabulaHolds(it)) walk(it, under || sel);
  });"""

S_DUP_PUT_OLD = r"""      return { ...node, items: (node.items || []).map(c => (c.type === "board" || c.type === "column") ? put(c) : c) };
    };
    root = put(root);"""
S_DUP_PUT_NEW = r"""      return { ...node, items: (node.items || []).map(c => (tabulaHolds(c) ? put(c) : c)) };
    };
    root = put(root);"""

S_REWRITEBOARD_OLD = r"""    if (node.type !== "board" && node.type !== "column") return node;
    return { ...node, items: (node.items || []).map(visit) };"""
S_REWRITEBOARD_NEW = r"""    if (!tabulaHolds(node)) return node;
    return { ...node, items: (node.items || []).map(visit) };"""

# ─── the canvas ───────────────────────────────────────────────────────────────

S_CARD_SIG_OLD = r"""function TabulaCard({ item, placed, x, y, w, pool, templates, selected, dragging, ghost, over, overEdge, stick, editing, onEditChange, onEditDone, onPointerDown, onGripDown, onHandleDown, onDoubleClick, onOpenEntry, dirHandle, imageFolder, renderItem, insertAt, laneInsertAt }) {"""
S_CARD_SIG_NEW = r"""// A column's `role` (r033) is what it is to what holds it: "column" on a
// board, "lane" in a column, "stack" under a card; the words follow it.
function TabulaCard({ item, placed, x, y, w, role, pool, templates, selected, dragging, ghost, over, overEdge, stick, editing, onEditChange, onEditDone, onPointerDown, onGripDown, onHandleDown, onDoubleClick, onOpenEntry, dirHandle, imageFolder, renderItem, insertAt, laneInsertAt }) {"""

S_CARD_COLUMN_OLD = r"""    const color = item.color || TABULA.color;
    const lane = !placed && !ghost;  // a column that isn't placed is a lane (r033)
    const lanes = tabulaIsLaned(item) ? item.items : null;"""
S_CARD_COLUMN_NEW = r"""    const color = item.color || TABULA.color;
    const what = role || (placed || ghost ? "column" : "lane");  // a column that isn't placed is a lane, or a stack (r033)
    const lane = what !== "column";
    const lanes = tabulaIsLaned(item) ? item.items : null;"""

S_CARD_HDR_OLD = r"""        <div className="tabula-column-hdr" style={{ borderTop: `3px solid ${color}` }} title={editing ? undefined : (lane ? "Drag to move the lane" : "Drag to move the column")} onPointerDown={editing ? undefined : onGripDown}>
          {!editing && !ghost && <span className="tabula-grip tabula-grip-inline" aria-hidden="true">⋮⋮</span>}
          {editing ? editBox(<input type="text" value={item.title || ""} placeholder={lane ? "Lane" : "Column"} onChange={(e) => onEditChange({ title: e.target.value }, "title")} />) : (
            <div className="tabula-column-title" style={{ color: item.title ? "var(--text)" : "var(--text-dim)", fontStyle: item.title ? "normal" : "italic" }}>{item.title || (lane ? "Untitled lane" : "Untitled column")}</div>
          )}
        </div>"""
S_CARD_HDR_NEW = r"""        <div className="tabula-column-hdr" style={{ borderTop: `3px solid ${color}` }} title={editing ? undefined : `Drag to move the ${what}`} onPointerDown={editing ? undefined : onGripDown}>
          {!editing && !ghost && <span className="tabula-grip tabula-grip-inline" aria-hidden="true">⋮⋮</span>}
          {editing ? editBox(<input type="text" value={item.title || ""} placeholder={what === "lane" ? "Lane" : what === "stack" ? "Stack" : "Column"} onChange={(e) => onEditChange({ title: e.target.value }, "title")} />) : (
            <div className="tabula-column-title" style={{ color: item.title ? "var(--text)" : "var(--text-dim)", fontStyle: item.title ? "normal" : "italic" }}>{item.title || `Untitled ${what}`}</div>
          )}
        </div>"""

S_CARD_TAIL_OLD = r"""  const cls = `${placed ? "tabula-card" : (item.type === "column" ? "tabula-lane" : "tabula-colitem")}${selected ? " selected" : ""}${dragging ? " dragging" : ""}${ghost ? " ghost" : ""}${over ? " over" : ""}${stick ? " stick" : ""}${item.type === "column" ? " is-column" : ""}`;
  const gripped = item.type !== "column";
  return ("""
S_CARD_TAIL_NEW = r"""  // the stacks under a card (r033), and the line where a column dragged
  // over it would go: among the stacks by x, or under the body when it has none
  const stacks = item.type !== "column" && item.type !== "board" && Array.isArray(item.items) ? item.items : [];
  const stackAt = laneInsertAt !== null && laneInsertAt !== undefined && item.type !== "column" ? laneInsertAt : -1;
  const under = stacks.length || stackAt >= 0 ? (
    <div className={`tabula-lanes tabula-under${stacks.length ? "" : " tabula-under-new"}`}>
      {stacks.map((l, i) => (
        <React.Fragment key={l.id}>
          {stackAt === i && <div className="tabula-lane-insert" />}
          {renderItem ? renderItem(l) : null}
        </React.Fragment>
      ))}
      {stackAt >= stacks.length && <div className="tabula-lane-insert" />}
    </div>
  ) : null;
  const cls = `${placed ? "tabula-card" : (item.type === "column" ? "tabula-lane" : "tabula-colitem")}${selected ? " selected" : ""}${dragging ? " dragging" : ""}${ghost ? " ghost" : ""}${over ? " over" : ""}${stick ? " stick" : ""}${item.type === "column" ? " is-column" : ""}${stacks.length ? " has-stacks" : ""}`;
  const gripped = item.type !== "column";
  return ("""

S_CARD_BODY_OLD = r"""      {gripped ? <div className="tabula-body">{body}</div> : body}
      {over && overEdge && <div className={`tabula-edge tabula-edge-${overEdge}`} />}"""
S_CARD_BODY_NEW = r"""      {gripped ? <div className="tabula-body">{body}</div> : body}
      {under}
      {over && overEdge && <div className={`tabula-edge tabula-edge-${overEdge}`} />}"""

S_INSP_DOC_OLD = r"""// (`onLanes`), and so has a lane (`isLane`), whose lanes are lanes of its
// own; every card has Duplicate (`onDuplicate`).
function TabulaInspector({ item, isLane, pool, templates, isLocked, onClose, onPatch, onDelete, onRelink, onConvertToNote, onOpenEntry, onReplaceImage, onOpenBoard, onLanes, onDuplicate }) {"""
S_INSP_DOC_NEW = r"""// (`onLanes`), and so has a lane (`isLane`), whose lanes are lanes of its
// own, and a stack under a card (`isStack`); a card has its stacks (r033),
// Add a stack when it has none and their count when it has some, through
// `onLanes` too; every card has Duplicate (`onDuplicate`).
function TabulaInspector({ item, isLane, isStack, pool, templates, isLocked, onClose, onPatch, onDelete, onRelink, onConvertToNote, onOpenEntry, onReplaceImage, onOpenBoard, onLanes, onDuplicate }) {"""

S_INSP_HOLDS_OLD = r"""  const holdsLine = (node) => {
    const held = tabulaCountBelow(node);
    const parts = [held.cards ? `${held.cards} ${held.cards === 1 ? "card" : "cards"}` : null, held.columns ? `${held.columns} ${held.columns === 1 ? "column" : "columns"}` : null].filter(Boolean);
    return <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>{parts.length ? `Holds ${parts.join(" and ")}.` : "Holds nothing yet."}</div>;
  };
  let body = null;
  const kind = item.type === "note" ? "Note" : item.type === "linked" ? "Linked" : item.type === "image" ? "Image" : item.type === "column" ? (isLane ? "Lane" : "Column") : "Board";"""
S_INSP_HOLDS_NEW = r"""  const holdsLine = (node) => {
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
      <div className="tabula-seg" title="Stacks side by side under the card, each its own column with its own title; the cards keep their places when the count changes">
        {Array.from({ length: TABULA.maxLanes }, (_, i) => i + 1).map(n => (
          <button key={n} type="button" className={`btn btn-small ${count === n ? "btn-accent" : "btn-ghost"}`} aria-pressed={count === n} disabled={isLocked} onClick={() => onLanes && onLanes(n)}>{n}</button>
        ))}
      </div>
    ));
  };
  let body = null;
  const kind = item.type === "note" ? "Note" : item.type === "linked" ? "Linked" : item.type === "image" ? "Image" : item.type === "column" ? (isLane ? "Lane" : isStack ? "Stack" : "Column") : "Board";"""

S_INSP_NOTE_OLD = r"""        {field("Color", colorRow)}
      </>
    );
  } else if (item.type === "linked") {"""
S_INSP_NOTE_NEW = r"""        {field("Color", colorRow)}
        {stacksField()}
        {tabulaStacked(item) && holdsLine(item)}
      </>
    );
  } else if (item.type === "linked") {"""

S_INSP_LINKED_OLD = r"""        {pickerOpen && (
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
  } else if (item.type === "column") {
    const laneCount = tabulaIsLaned(item) ? item.items.length : 1;
    body = (
      <>
        {field("Title", <input className="input" type="text" value={item.title || ""} disabled={isLocked} placeholder={isLane ? "Untitled lane" : "Untitled column"} onChange={(e) => onPatch({ title: e.target.value }, "title")} />)}
        {field("Color", colorRow)}
        {field("Cards per row", (
          <div className="tabula-seg" title={`Lanes side by side${isLane ? " inside this lane" : ""}, each its own stack with its own title; the cards keep their places when the count changes`}>"""
S_INSP_LINKED_NEW = r"""        {pickerOpen && (
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
        {field("Cards per row", (
          <div className="tabula-seg" title={`Lanes side by side${word === "column" ? "" : ` inside this ${word}`}, each its own stack with its own title; the cards keep their places when the count changes`}>"""

S_INSP_DELETE_OLD = r"""          <button className="btn" style={{ fontSize: 12, color: "var(--danger)", borderColor: "var(--danger)" }} onClick={onDelete}>{item.type === "column" ? (isLane ? "Delete lane" : "Delete column") : item.type === "board" ? "Delete board" : "Delete card"}</button>"""
S_INSP_DELETE_NEW = r"""          <button className="btn" style={{ fontSize: 12, color: "var(--danger)", borderColor: "var(--danger)" }} onClick={onDelete}>{item.type === "column" ? (isLane ? "Delete lane" : isStack ? "Delete stack" : "Delete column") : item.type === "board" ? "Delete board" : "Delete card"}</button>"""

S_MODAL_OLD = r"""// Deleting a column or a board card that holds anything asks (v1.7 r030),
// Fabula's holds-delete modal's shape: a column's cards can go out onto the
// canvas where they stood, the default, or with it; a board's go with it,
// with the count. Esc cancels, as a click outside does.
function TabulaDeleteModal({ items, isLane, onMoveOut, onDeleteAll, onCancel }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); onCancel(); } };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onCancel]);
  const list = Array.isArray(items) ? items : [items];
  const held = list.reduce((acc, it) => { const h = tabulaCountBelow(it); return { cards: acc.cards + h.cards, columns: acc.columns + h.columns }; }, { cards: 0, columns: 0 });
  const parts = [held.cards ? `${held.cards} ${held.cards === 1 ? "card" : "cards"}` : null, held.columns ? `${held.columns} ${held.columns === 1 ? "column" : "columns"}` : null].filter(Boolean).join(" and ");
  const hasColumn = list.some(it => it.type === "column");
  const many = list.length > 1;
  const item = list[0];
  const isColumn = item.type === "column";
  const word = isColumn ? (isLane ? "lane" : "column") : "board";
  const name = item.title || (isColumn ? (isLane ? "Untitled lane" : "Untitled column") : "Untitled board");
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal tabula-holds-delete" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">{many ? `Delete ${list.length} items` : `Delete the ${word}`}</div>
        <div className="modal-body">
          <p style={{ margin: "0 0 10px" }}>{many ? `Delete the ${list.length} selected items?` : `Delete ${word} "${name}"?`}</p>
          {many ? (
            <p style={{ margin: 0 }}>Together they hold {parts}.{hasColumn ? " Move out puts the columns' cards on the canvas where they stood (a board's go with it); Delete everything deletes it all." : " Everything inside goes with them."}</p>
          ) : isColumn ? (
            <p style={{ margin: 0 }}>It holds {parts}. Move out puts {held.cards === 1 ? "it" : "them"} on the canvas where {held.cards === 1 ? "it" : "they"} stood; Delete everything deletes it all.</p>
          ) : (
            <p style={{ margin: 0 }}>It holds {parts}, and everything inside it goes with it.</p>
          )}
        </div>"""
S_MODAL_NEW = r"""// Deleting a column or a board card that holds anything asks (v1.7 r030),
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
        </div>"""

S_VIEW_ISLANE_OLD = r"""  const isLane = (it) => { const p = it ? tabulaParentOf(board, it.id) : null; return !!(it && it.type === "column" && p && p.type === "column"); };"""
S_VIEW_ISLANE_NEW = r"""  const isLane = (it) => { const p = it ? tabulaParentOf(board, it.id) : null; return !!(it && it.type === "column" && p && p.type === "column"); };
  const isStack = (it) => { const p = it ? tabulaParentOf(board, it.id) : null; return !!(it && it.type === "column" && p && p.type !== "column" && p.type !== "board"); };  // a column under a card (r033)
  const roleOf = (it, p) => (it.type !== "column" ? undefined : p.type === "board" ? "column" : p.type === "column" ? "lane" : "stack");"""

S_VIEW_DROP_DOC_OLD = r"""  // a lane's edge, the outer header, or the gaps, the host above at the gap
  // by x. From the DOM, so what the line shows is where the card lands.
  // Nothing enters itself or anything moving with it (`moving`, the group's
  // ids).
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
    for (const col of Array.from(el.querySelectorAll('.tabula-card[data-type="column"]'))) {
      if (ids.has(col.dataset.item)) continue;
      const r = col.getBoundingClientRect();
      if (!inside(r)) continue;
      const lanesOf = (node) => Array.from(node.querySelectorAll(":scope > .tabula-lanes > .tabula-lane")).filter(l => !ids.has(l.dataset.item));
      if (dragged.type === "column") {
        // down the lanes while the pointer is well inside one (12 screen pixels from its edges)
        let host = col;
        for (;;) {
          const lanes = lanesOf(host);
          const inner = lanes.find(l => { const lr = l.getBoundingClientRect(); return clientX >= lr.left + 12 && clientX <= lr.right - 12 && clientY >= lr.top; });
          if (!inner) break;
          host = inner;
        }
        const lanes = lanesOf(host);
        const hr = host.getBoundingClientRect();
        let index = 0;
        if (lanes.length) lanes.forEach(l => { const lr = l.getBoundingClientRect(); if (lr.left + lr.width / 2 < clientX) index++; });
        else index = clientX > hr.left + hr.width / 2 ? 1 : 0;
        return { laneOf: host.dataset.item, index };
      }
      // a card: the innermost lane under the pointer, by x at each level
      let stack = col;
      for (;;) {
        const lanes = lanesOf(stack);
        if (!lanes.length) break;
        stack = lanes.find(l => { const lr = l.getBoundingClientRect(); return clientX >= lr.left && clientX <= lr.right; }) || lanes.reduce((best, l) => { const lr = l.getBoundingClientRect(); const d = Math.min(Math.abs(clientX - lr.left), Math.abs(clientX - lr.right)); return !best || d < best.d ? { l, d } : best; }, null).l;
      }
      const kids = Array.from(stack.querySelectorAll(":scope > .tabula-column-body > .tabula-colitem")).filter(k => !ids.has(k.dataset.item));
      let index = 0;
      kids.forEach(k => { const kr = k.getBoundingClientRect(); if (kr.top + kr.height / 2 < clientY) index++; });
      return { columnId: stack.dataset.item, index };
    }
    return null;
  };"""
S_VIEW_DROP_DOC_NEW = r"""  // a lane's edge, the outer header, or the gaps, the host above at the gap
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
      kids.forEach(k => { const kr = k.getBoundingClientRect(); if (kr.top + kr.height / 2 < clientY) index++; });
      return { columnId: stack.dataset.item, index };
    }
    return null;
  };"""

S_VIEW_DRAG_OLD = r"""    const inStack = parent && parent.type === "column";
    const inGroup = !inStack && selection.includes(it.id) && selection.length > 1;"""
S_VIEW_DRAG_NEW = r"""    const inStack = parent && parent.type !== "board";  // in a column's stack, a lane, or (r033) a stack under a card
    const inGroup = !inStack && selection.includes(it.id) && selection.length > 1;"""

S_VIEW_RESIZE_OLD = r"""      onMove: (ev) => { const z = camera.viewRef.current.zoom; setResize({ id: it.id, w: tabulaClampWidth(it.type, tabulaSnap(w0 + (ev.clientX - startX) / z)) }); },
      onUp: (ev) => { setResize(null); const z = camera.viewRef.current.zoom; const w = tabulaClampWidth(it.type, tabulaSnap(w0 + (ev.clientX - startX) / z)); if (w !== it.w) apply(tabulaUpdateItem(stemma, it.id, { w })); },"""
S_VIEW_RESIZE_NEW = r"""      onMove: (ev) => { const z = camera.viewRef.current.zoom; setResize({ id: it.id, w: tabulaClampWidth(it.type, tabulaSnap(w0 + (ev.clientX - startX) / z), tabulaStacked(it)) }); },
      onUp: (ev) => { setResize(null); const z = camera.viewRef.current.zoom; const w = tabulaClampWidth(it.type, tabulaSnap(w0 + (ev.clientX - startX) / z), tabulaStacked(it)); if (w !== it.w) apply(tabulaUpdateItem(stemma, it.id, { w })); },"""

S_VIEW_DELETE_OLD = r"""  // Deleting: a card goes; a column or a board card that holds anything
  // asks first (TabulaDeleteModal), one modal for a selection of several
  // (r033). A column's cards moved out land where they stood, measured from
  // the stack as drawn, a lane's cards too (r033).
  const requestDelete = (what) => {
    const list = (Array.isArray(what) ? what : [what]).filter(Boolean);
    if (!list.length || isLocked) return;
    const holding = list.filter(it => { if (it.type !== "column" && it.type !== "board") return false; const held = tabulaCountBelow(it); return held.cards > 0 || held.columns > 0; });
    if (holding.length) { setAsking(list); return; }
    apply(tabulaDeleteItems(stemma, list.map(it => it.id), drawing.endsFor(list.flatMap(tabulaIdsBelow))));
  };
  // where a column's or a lane's cards stand, every card in it as drawn,
  // in canvas units from the surface
  const columnPlacements = (col) => {
    const surf = surfaceRef.current;
    const el = surf && surf.querySelector(`[data-item="${String(col.id).replace(/["\\]/g, "")}"]:not(.ghost)`);
    if (!el) return [];
    const s = surf.getBoundingClientRect();
    const z = camera.viewRef.current.zoom;
    return Array.from(el.querySelectorAll(".tabula-colitem")).filter(k => k.dataset.item).map(k => {
      const kr = k.getBoundingClientRect();
      return { id: k.dataset.item, x: Math.round((kr.left - s.left) / z), y: Math.round((kr.top - s.top) / z), w: Math.round(kr.width / z) };
    });
  };
  const moveOut = () => {
    if (asking) {
      const placements = new Map(asking.filter(it => it.type === "column").map(it => [it.id, columnPlacements(it)]));
      const ends = drawing.endsFor(asking.flatMap(tabulaIdsBelow));
      let next = stemma;
      asking.forEach(it => { next = it.type === "column" ? tabulaDeleteColumn(next, it.id, placements.get(it.id), ends) : tabulaDeleteItem(next, it.id, ends); });
      apply(next);
    }
    setAsking(null);
  };"""
S_VIEW_DELETE_NEW = r"""  // Deleting: a card goes; a column or a board card that holds anything
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
  };"""

S_VIEW_COPY_OLD = r"""      const w = holder && Number.isFinite(holder.w) ? holder.w : Math.round(r.width / z);
      return { ...it, x: Math.round((r.left - s.left) / z), y: Math.round((r.top - s.top) / z), w: tabulaClampWidth(it.type, w) };
    };
    // the selected items in document order, one inside another selected one left to its holder
    const set = new Set(selection);
    const picked = [];
    const walk = (node, under) => (node.items || []).forEach(it => { const sel = set.has(it.id); if (sel && !under) picked.push(it); if (it.type === "column" || it.type === "board") walk(it, under || sel); });"""
S_VIEW_COPY_NEW = r"""      const w = holder && Number.isFinite(holder.w) ? holder.w : Math.round(r.width / z);
      return { ...it, x: Math.round((r.left - s.left) / z), y: Math.round((r.top - s.top) / z), w: tabulaClampWidth(it.type, w, tabulaStacked(it)) };
    };
    // the selected items in document order, one inside another selected one left to its holder
    const set = new Set(selection);
    const picked = [];
    const walk = (node, under) => (node.items || []).forEach(it => { const sel = set.has(it.id); if (sel && !under) picked.push(it); if (tabulaHolds(it)) walk(it, under || sel); });"""

S_VIEW_CARDFOR_OLD = r"""        x={x} y={y} w={w}
        pool={pool}
        templates={templates}
        selected={selection.includes(it.id)}"""
S_VIEW_CARDFOR_NEW = r"""        x={x} y={y} w={w}
        role={roleOf(it, parent)}
        pool={pool}
        templates={templates}
        selected={selection.includes(it.id)}"""

S_VIEW_RENDERITEM_OLD = r"""        renderItem={it.type === "column" ? ((c) => cardFor(c, it)) : undefined}"""
S_VIEW_RENDERITEM_NEW = r"""        renderItem={it.type === "column" || tabulaStacked(it) ? ((c) => cardFor(c, it)) : undefined}"""

S_VIEW_INSP_OLD = r"""            isLane={isLane(selected)}
            pool={pool}"""
S_VIEW_INSP_NEW = r"""            isLane={isLane(selected)}
            isStack={isStack(selected)}
            pool={pool}"""

S_VIEW_MODAL_OLD = r"""        <TabulaDeleteModal items={asking} isLane={asking.length === 1 && isLane(asking[0])} onMoveOut={moveOut} onDeleteAll={deleteAll} onCancel={() => setAsking(null)} />"""
S_VIEW_MODAL_NEW = r"""        <TabulaDeleteModal items={asking} isLane={asking.length === 1 && isLane(asking[0])} isStack={asking.length === 1 && isStack(asking[0])} onMoveOut={moveOut} onDeleteAll={deleteAll} onCancel={() => setAsking(null)} />"""

S_CSS_OLD = r""".tabula-lane>.tabula-lanes{padding:3px 3px 4px;gap:3px}"""
S_CSS_NEW = r""".tabula-lane>.tabula-lanes{padding:3px 3px 4px;gap:3px}
.tabula-under{padding:0 5px 5px 17px}
.tabula-colitem>.tabula-under{padding:0 4px 4px 16px;gap:3px}
.tabula-under-new{padding:0 8px 6px 17px}
.tabula-under-new>.tabula-lane-insert{flex:1;width:auto;min-height:0;height:0;border-left:0;border-top:2px solid var(--accent);margin:0}"""

STACK_PAIRS = [
    (S_DOC_HEAD_OLD, S_DOC_HEAD_NEW),
    (S_CLAMP_OLD, S_CLAMP_NEW),
    (S_VISIBLE_OLD, S_VISIBLE_NEW),
    (S_HEAL_OLD, S_HEAL_NEW),
    (S_COERCE_OLD, S_COERCE_NEW),
    (S_IMPORT_OLD, S_IMPORT_NEW),
    (S_WALK_OLD, S_WALK_NEW),
    (S_REWRITE_OLD, S_REWRITE_NEW),
    (S_COUNT_OLD, S_COUNT_NEW),
    (S_CARDS_BELOW_OLD, S_CARDS_BELOW_NEW),
    (S_PATH_OLD, S_PATH_NEW),
    (S_ADD_OLD, S_ADD_NEW),
    (S_SETTLE_OLD, S_SETTLE_NEW),
    (S_MOVEITEM_OLD, S_MOVEITEM_NEW),
    (S_MOVETO_DOC_OLD, S_MOVETO_DOC_NEW),
    (S_MOVETO_LANEOF_OLD, S_MOVETO_LANEOF_NEW),
    (S_MOVETO_PUT_OLD, S_MOVETO_PUT_NEW),
    (S_SETLANES_OLD, S_SETLANES_NEW),
    (S_DELCOL_OLD, S_DELCOL_NEW),
    (S_ADDITEMS_OLD, S_ADDITEMS_NEW),
    (S_DUP_OLD, S_DUP_NEW),
    (S_DUP_PUT_OLD, S_DUP_PUT_NEW),
    (S_REWRITEBOARD_OLD, S_REWRITEBOARD_NEW),
    (S_CARD_SIG_OLD, S_CARD_SIG_NEW),
    (S_CARD_COLUMN_OLD, S_CARD_COLUMN_NEW),
    (S_CARD_HDR_OLD, S_CARD_HDR_NEW),
    (S_CARD_TAIL_OLD, S_CARD_TAIL_NEW),
    (S_CARD_BODY_OLD, S_CARD_BODY_NEW),
    (S_INSP_DOC_OLD, S_INSP_DOC_NEW),
    (S_INSP_HOLDS_OLD, S_INSP_HOLDS_NEW),
    (S_INSP_NOTE_OLD, S_INSP_NOTE_NEW),
    (S_INSP_LINKED_OLD, S_INSP_LINKED_NEW),
    (S_INSP_DELETE_OLD, S_INSP_DELETE_NEW),
    (S_MODAL_OLD, S_MODAL_NEW),
    (S_VIEW_ISLANE_OLD, S_VIEW_ISLANE_NEW),
    (S_VIEW_DROP_DOC_OLD, S_VIEW_DROP_DOC_NEW),
    (S_VIEW_DRAG_OLD, S_VIEW_DRAG_NEW),
    (S_VIEW_RESIZE_OLD, S_VIEW_RESIZE_NEW),
    (S_VIEW_DELETE_OLD, S_VIEW_DELETE_NEW),
    (S_VIEW_COPY_OLD, S_VIEW_COPY_NEW),
    (S_VIEW_CARDFOR_OLD, S_VIEW_CARDFOR_NEW),
    (S_VIEW_RENDERITEM_OLD, S_VIEW_RENDERITEM_NEW),
    (S_VIEW_INSP_OLD, S_VIEW_INSP_NEW),
    (S_VIEW_MODAL_OLD, S_VIEW_MODAL_NEW),
]
STACK_CSS = [(S_CSS_OLD, S_CSS_NEW)]


# ═══════════════════════════════════════════════════════════════════════════════
# Lane widths (Drak's ask at the review, 2026-10-28): a lane, or a stack
# under a card, may carry `w`, its width, dragged on the divider between it
# and the next; the lanes after it keep the widths they're drawn at, the
# last lane taking what's left. Applied after the stacks under cards above.
# ═══════════════════════════════════════════════════════════════════════════════

W_DOC_HEAD_OLD = r"""// card may hold columns too, its stacks, drawn under it. x, y, w are integers in
// canvas pixels at zoom 1, unbounded; heights are never stored. Absent"""
W_DOC_HEAD_NEW = r"""// card may hold columns too, its stacks, drawn under it. x, y, w are integers in
// canvas pixels at zoom 1, unbounded; heights are never stored; a lane or a
// stack may carry w alone (r033), its width, the last taking what's left. Absent"""

W_CONST_OLD = r"""  maxLanes: 6,                               // "Cards per row" (r033): the most lanes a column takes"""
W_CONST_NEW = r"""  maxLanes: 6,                               // "Cards per row" (r033): the most lanes a column takes
  minLaneWidth: 80,                          // a lane's floor (r033) when the divider beside it is dragged"""

W_CLAMP_OLD = r"""const tabulaStacked = (it) => !!it && it.type !== "board" && it.type !== "column" && Array.isArray(it.items) && it.items.length > 0;"""
W_CLAMP_NEW = r"""const tabulaStacked = (it) => !!it && it.type !== "board" && it.type !== "column" && Array.isArray(it.items) && it.items.length > 0;
// a lane's own width (r033), between the lane floor and the column ceiling
const tabulaClampLaneWidth = (w) => Math.max(TABULA.minLaneWidth, Math.min(TABULA.maxColumnWidth, w));"""

W_COERCE_OLD = r"""  } else {
    delete out.x; delete out.y; delete out.w;
  }
  if (type === "note") {"""
W_COERCE_NEW = r"""  } else {
    delete out.x; delete out.y;
    // a lane, or a stack under a card, may carry its width (r033); a card in a stack has none
    if (type === "column" && Number.isFinite(it.w)) out.w = tabulaClampLaneWidth(tabulaInt(it.w, TABULA.minLaneWidth)); else delete out.w;
  }
  if (type === "note") {"""

W_MOVETO_OLD = r"""      const { x, y, w, ...lane } = item;
      // a column's lanes, its stack as the first when it has none; a card's stacks (r033)"""
W_MOVETO_NEW = r"""      // a column from the board loses its place and its width; a lane keeps its width (r033)
      const { x, y, w, ...rest } = item;
      const lane = Number.isFinite(x) ? rest : item;
      // a column's lanes, its stack as the first when it has none; a card's stacks (r033)"""

W_CARD_SIG_OLD = r"""// A column's `role` (r033) is what it is to what holds it: "column" on a
// board, "lane" in a column, "stack" under a card; the words follow it.
function TabulaCard({ item, placed, x, y, w, role, pool, templates, selected, dragging, ghost, over, overEdge, stick, editing, onEditChange, onEditDone, onPointerDown, onGripDown, onHandleDown, onDoubleClick, onOpenEntry, dirHandle, imageFolder, renderItem, insertAt, laneInsertAt }) {"""
W_CARD_SIG_NEW = r"""// A column's `role` (r033) is what it is to what holds it: "column" on a
// board, "lane" in a column, "stack" under a card; the words follow it. A
// lane with a width of its own (`w`) is drawn at it unless it is the last
// (`lastLane`), which takes what's left; between lanes a divider
// (`onLaneDivider`, given the lane before it, its index, and the lanes)
// sets that width by a drag (r033).
function TabulaCard({ item, placed, x, y, w, role, lastLane, pool, templates, selected, dragging, ghost, over, overEdge, stick, editing, onEditChange, onEditDone, onPointerDown, onGripDown, onHandleDown, onDoubleClick, onOpenEntry, dirHandle, imageFolder, renderItem, insertAt, laneInsertAt, onLaneDivider }) {"""

W_CARD_LANES_OLD = r"""        {lanes ? (
          <div className="tabula-lanes">
            {lanes.map((l, i) => (
              <React.Fragment key={l.id}>
                {laneAt === i && <div className="tabula-lane-insert" />}
                {renderItem ? renderItem(l) : null}
              </React.Fragment>
            ))}
            {laneAt >= lanes.length && <div className="tabula-lane-insert" />}
          </div>
        ) : ("""
W_CARD_LANES_NEW = r"""        {lanes ? (
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
        ) : ("""

W_CARD_STACKS_OLD = r"""      {stacks.map((l, i) => (
        <React.Fragment key={l.id}>
          {stackAt === i && <div className="tabula-lane-insert" />}
          {renderItem ? renderItem(l) : null}
        </React.Fragment>
      ))}"""
W_CARD_STACKS_NEW = r"""      {stacks.map((l, i) => (
        <React.Fragment key={l.id}>
          {stackAt === i && <div className="tabula-lane-insert" />}
          {renderItem ? renderItem(l, i === stacks.length - 1) : null}
          {onLaneDivider && i < stacks.length - 1 && <div className="tabula-lane-divider" title="Drag to set the stack's width" onPointerDown={onLaneDivider(l, i, stacks)} />}
        </React.Fragment>
      ))}"""

W_CARD_STYLE_OLD = r"""      style={placed ? { left: x, top: y, width: w, borderLeft: accent ? `3px solid ${accent}` : undefined } : { borderLeft: accent ? `3px solid ${accent}` : undefined }}"""
W_CARD_STYLE_NEW = r"""      style={placed ? { left: x, top: y, width: w, borderLeft: accent ? `3px solid ${accent}` : undefined } : { borderLeft: accent ? `3px solid ${accent}` : undefined, ...(item.type === "column" && !ghost && Number.isFinite(w) && !lastLane ? { flex: `0 1 ${w}px` } : {}) }}"""

W_VIEW_STATE_OLD = r"""  const [resize, setResize] = useState(null);       // { id, w }: a card on the resize"""
W_VIEW_STATE_NEW = r"""  const [resize, setResize] = useState(null);       // { id, w }: a card on the resize
  const [laneResize, setLaneResize] = useState(null);  // { widths: { [lane id]: w } }: the lanes on the resize while a divider is dragged (r033)"""

W_VIEW_DRAG_OLD = r"""    const w = inStack ? tabulaClampWidth(it.type, parent.w) : it.w;"""
W_VIEW_DRAG_NEW = r"""    const w = inStack ? tabulaClampWidth(it.type, Number.isFinite(it.w) ? it.w : parent.w) : it.w;  // a lane with a width of its own keeps it (r033)"""

W_VIEW_HANDLE_OLD = r"""  const onRailPointerDown = (kind) => (e) => {"""
W_VIEW_HANDLE_NEW = r"""  // a divider between lanes, or between stacks under a card (r033): the
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
  const onRailPointerDown = (kind) => (e) => {"""

W_VIEW_COPY_OLD = r"""      const w = holder && Number.isFinite(holder.w) ? holder.w : Math.round(r.width / z);"""
W_VIEW_COPY_NEW = r"""      const w = Number.isFinite(it.w) ? it.w : holder && Number.isFinite(holder.w) ? holder.w : Math.round(r.width / z);"""

W_VIEW_CARDFOR_OLD = r"""  const cardFor = (it, parent) => {
    const placed = parent.type === "board";"""
W_VIEW_CARDFOR_NEW = r"""  const cardFor = (it, parent, lastLane) => {
    const placed = parent.type === "board";"""

W_VIEW_CARDFOR_W_OLD = r"""    const w = resize && resize.id === it.id ? resize.w : it.w;
    return (
      <TabulaCard
        key={it.id}
        item={it}
        placed={placed}
        x={x} y={y} w={w}
        role={roleOf(it, parent)}"""
W_VIEW_CARDFOR_W_NEW = r"""    const w = resize && resize.id === it.id ? resize.w : laneResize && laneResize.widths[it.id] !== undefined ? laneResize.widths[it.id] : it.w;
    return (
      <TabulaCard
        key={it.id}
        item={it}
        placed={placed}
        x={x} y={y} w={w}
        role={roleOf(it, parent)}
        lastLane={!!lastLane}
        onLaneDivider={isLocked ? undefined : onDividerPointerDown}"""

W_VIEW_RENDERITEM_OLD = r"""        renderItem={it.type === "column" || tabulaStacked(it) ? ((c) => cardFor(c, it)) : undefined}"""
W_VIEW_RENDERITEM_NEW = r"""        renderItem={it.type === "column" || tabulaStacked(it) ? ((c, last) => cardFor(c, it, last)) : undefined}"""

W_CSS_OLD = r""".tabula-lane-insert{width:0;border-left:2px solid var(--accent);margin:0 -3px;border-radius:1px;align-self:stretch;min-height:36px}"""
W_CSS_NEW = r""".tabula-lane-insert{width:0;border-left:2px solid var(--accent);margin:0 -3px;border-radius:1px;align-self:stretch;min-height:36px}
.tabula-lane-divider{flex:0 0 0;width:0;margin:0 -2px;position:relative;align-self:stretch;z-index:1}
.tabula-lane-divider::before{content:"";position:absolute;left:-5px;top:0;bottom:0;width:10px;cursor:col-resize;border-radius:2px}
.tabula-lane-divider:hover::before{background:var(--accent-glow)}"""

WIDTH_PAIRS = [
    (W_DOC_HEAD_OLD, W_DOC_HEAD_NEW),
    (W_CONST_OLD, W_CONST_NEW),
    (W_CLAMP_OLD, W_CLAMP_NEW),
    (W_COERCE_OLD, W_COERCE_NEW),
    (W_MOVETO_OLD, W_MOVETO_NEW),
    (W_CARD_SIG_OLD, W_CARD_SIG_NEW),
    (W_CARD_LANES_OLD, W_CARD_LANES_NEW),
    (W_CARD_STACKS_OLD, W_CARD_STACKS_NEW),
    (W_CARD_STYLE_OLD, W_CARD_STYLE_NEW),
    (W_VIEW_STATE_OLD, W_VIEW_STATE_NEW),
    (W_VIEW_DRAG_OLD, W_VIEW_DRAG_NEW),
    (W_VIEW_HANDLE_OLD, W_VIEW_HANDLE_NEW),
    (W_VIEW_COPY_OLD, W_VIEW_COPY_NEW),
    (W_VIEW_CARDFOR_OLD, W_VIEW_CARDFOR_NEW),
    (W_VIEW_CARDFOR_W_OLD, W_VIEW_CARDFOR_W_NEW),
    (W_VIEW_RENDERITEM_OLD, W_VIEW_RENDERITEM_NEW),
]
WIDTH_CSS = [(W_CSS_OLD, W_CSS_NEW)]


# ═══════════════════════════════════════════════════════════════════════════════
# Rows, and widths that grow to fit (Drak's ask at the review, 2026-10-28,
# for the apprenticeship tree drawn as an org chart): a column, a lane, or a
# stack may be a row (`flow: "row"`), its cards laid side by side, each at
# its row width, grown to what its own stacks need; a holder is drawn at the
# larger of its width and what it holds needs, from the bottom up, so a
# tree of rows under a card never squeezes. An untitled stack under a card
# draws slim. Applied after the lane widths above.
# ═══════════════════════════════════════════════════════════════════════════════

R_DOC_HEAD_OLD = r"""// canvas pixels at zoom 1, unbounded; heights are never stored; a lane or a
// stack may carry w alone (r033), its width, the last taking what's left. Absent"""
R_DOC_HEAD_NEW = r"""// canvas pixels at zoom 1, unbounded; heights are never stored; a lane or a
// stack may carry w alone (r033), its width, the last taking what's left; a
// column may be a row (r033), `flow: "row"`, its cards side by side. Absent"""

R_CONST_OLD = r"""  minLaneWidth: 80,                          // a lane's floor (r033) when the divider beside it is dragged"""
R_CONST_NEW = r"""  minLaneWidth: 80,                          // a lane's floor (r033) when the divider beside it is dragged
  rowWidth: 200,                             // a card's width in a row (r033), grown to what its stacks need"""

R_NEED_OLD = r"""// a lane's own width (r033), between the lane floor and the column ceiling
const tabulaClampLaneWidth = (w) => Math.max(TABULA.minLaneWidth, Math.min(TABULA.maxColumnWidth, w));"""
R_NEED_NEW = r"""// a lane's own width (r033), between the lane floor and the column ceiling
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
};"""

R_COERCE_OLD = r"""  } else if (type === "column") {
    out.title = tabulaStr(it.title);
    out.color = tabulaHex(it.color, TABULA.color);
    // A column may hold lanes (r033), columns laid side by side, at any"""
R_COERCE_NEW = r"""  } else if (type === "column") {
    out.title = tabulaStr(it.title);
    out.color = tabulaHex(it.color, TABULA.color);
    if (it.flow === "row") out.flow = "row"; else delete out.flow;  // a row (r033): the cards side by side
    // A column may hold lanes (r033), columns laid side by side, at any"""

R_SETTLE_OLD = r"""    if (tabulaIsLaned(next) && next.items.length === 1) {
      const lane = next.items[0];
      next = { ...next, title: next.title || lane.title || "", items: lane.items || [] };
      changed = true;
    }"""
R_SETTLE_NEW = r"""    if (tabulaIsLaned(next) && next.items.length === 1) {
      const lane = next.items[0];
      const { flow: _flow, ...base } = next;  // the lane's flow is the column's now (r033)
      next = { ...base, title: next.title || lane.title || "", items: lane.items || [], ...(lane.flow === "row" ? { flow: "row" } : {}) };
      changed = true;
    }"""

R_SETLANES_OLD = r"""  let next;
  if (count === 1 && !card) next = { ...col, items: tabulaCardsBelow(col) };
  else {
    let ls = lanes ? lanes.slice() : (card ? [] : [newLane(col.items)]);
    if (ls.length > count) {
      const keep = ls.slice(0, count), extra = ls.slice(count);
      keep[count - 1] = tabulaAppendCards(keep[count - 1], extra.flatMap(tabulaCardsBelow));
      ls = keep;
    }
    while (ls.length < count) ls.push(newLane());
    next = { ...col, items: ls };
  }"""
R_SETLANES_NEW = r"""  let next;
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
  }"""

R_CARD_SIG_OLD = r"""// sets that width by a drag (r033).
function TabulaCard({ item, placed, x, y, w, role, lastLane, pool, templates, selected, dragging, ghost, over, overEdge, stick, editing, onEditChange, onEditDone, onPointerDown, onGripDown, onHandleDown, onDoubleClick, onOpenEntry, dirHandle, imageFolder, renderItem, insertAt, laneInsertAt, onLaneDivider }) {"""
R_CARD_SIG_NEW = r"""// sets that width by a drag (r033). `fit` (r033) is what the item needs
// drawn, tabulaNeed: a placed card or column is drawn at the larger of
// its width and it, a lane never narrower, a card in a row (`inRow`) at
// it exactly.
function TabulaCard({ item, placed, x, y, w, role, lastLane, fit, inRow, pool, templates, selected, dragging, ghost, over, overEdge, stick, editing, onEditChange, onEditDone, onPointerDown, onGripDown, onHandleDown, onDoubleClick, onOpenEntry, dirHandle, imageFolder, renderItem, insertAt, laneInsertAt, onLaneDivider }) {"""

R_CARD_COLUMN_OLD = r"""    const lane = what !== "column";
    const lanes = tabulaIsLaned(item) ? item.items : null;"""
R_CARD_COLUMN_NEW = r"""    const lane = what !== "column";
    const lanes = tabulaIsLaned(item) ? item.items : null;
    const row = !lanes && item.flow === "row";  // the cards side by side (r033)
    const slim = what === "stack" && !item.title;  // an untitled stack under a card draws slim (r033)"""

R_CARD_HDR_OLD = r"""            <div className="tabula-column-title" style={{ color: item.title ? "var(--text)" : "var(--text-dim)", fontStyle: item.title ? "normal" : "italic" }}>{item.title || `Untitled ${what}`}</div>"""
R_CARD_HDR_NEW = r"""            <div className="tabula-column-title" style={{ color: item.title ? "var(--text)" : "var(--text-dim)", fontStyle: item.title ? "normal" : "italic" }}>{item.title || (slim ? "" : `Untitled ${what}`)}</div>"""

R_CARD_BODY_OLD = r"""          <div className={`tabula-column-body${laneAt === 0 ? " lane-before" : laneAt >= 1 ? " lane-after" : ""}`}>"""
R_CARD_BODY_NEW = r"""          <div className={`tabula-column-body${row ? " row" : ""}${laneAt === 0 ? " lane-before" : laneAt >= 1 ? " lane-after" : ""}`}>"""

R_CARD_CLS_OLD = r"""  const cls = `${placed ? "tabula-card" : (item.type === "column" ? "tabula-lane" : "tabula-colitem")}${selected ? " selected" : ""}${dragging ? " dragging" : ""}${ghost ? " ghost" : ""}${over ? " over" : ""}${stick ? " stick" : ""}${item.type === "column" ? " is-column" : ""}${stacks.length ? " has-stacks" : ""}`;
  const gripped = item.type !== "column";
  return (
    <div
      className={cls}
      data-item={item.id}
      data-type={item.type}
      style={placed ? { left: x, top: y, width: w, borderLeft: accent ? `3px solid ${accent}` : undefined } : { borderLeft: accent ? `3px solid ${accent}` : undefined, ...(item.type === "column" && !ghost && Number.isFinite(w) && !lastLane ? { flex: `0 1 ${w}px` } : {}) }}"""
R_CARD_CLS_NEW = r"""  const slimStack = item.type === "column" && role === "stack" && !item.title;
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
      style={placed ? { left: x, top: y, ...sizing, borderLeft: accent ? `3px solid ${accent}` : undefined } : { borderLeft: accent ? `3px solid ${accent}` : undefined, ...sizing }}"""

R_INSP_OLD = r"""        {field("Cards per row", (
          <div className="tabula-seg" title={`Lanes side by side${word === "column" ? "" : ` inside this ${word}`}, each its own stack with its own title; the cards keep their places when the count changes`}>"""
R_INSP_NEW = r"""        {!tabulaIsLaned(item) && field("Lay out", (
          <div className="tabula-seg tabula-seg-flow" title="Stack lays the cards under each other; Row lays them side by side, each as wide as what it holds, and what holds the row grows to fit">
            {[["stack", "Stack"], ["row", "Row"]].map(([v, label]) => (
              <button key={v} type="button" className={`btn btn-small ${(item.flow === "row" ? "row" : "stack") === v ? "btn-accent" : "btn-ghost"}`} aria-pressed={(item.flow === "row" ? "row" : "stack") === v} disabled={isLocked} onClick={() => onPatch(it => { const { flow, ...rest } = it; return v === "row" ? { ...rest, flow: "row" } : rest; })}>{label}</button>
            ))}
          </div>
        ))}
        {field("Cards per row", (
          <div className="tabula-seg tabula-seg-lanes" title={`Lanes side by side${word === "column" ? "" : ` inside this ${word}`}, each its own stack with its own title; the cards keep their places when the count changes`}>"""

R_INSP_STACKS_OLD = r"""      <div className="tabula-seg" title="Stacks side by side under the card, each its own column with its own title; the cards keep their places when the count changes">"""
R_INSP_STACKS_NEW = r"""      <div className="tabula-seg tabula-seg-lanes" title="Stacks side by side under the card, each its own column with its own title; the cards keep their places when the count changes">"""

R_VIEW_DROP_OLD = r"""      kids.forEach(k => { const kr = k.getBoundingClientRect(); if (kr.top + kr.height / 2 < clientY) index++; });"""
R_VIEW_DROP_NEW = r"""      const byX = stack.dataset.flow === "row";  // a row's gaps run by x (r033)
      kids.forEach(k => { const kr = k.getBoundingClientRect(); if (byX ? kr.left + kr.width / 2 < clientX : kr.top + kr.height / 2 < clientY) index++; });"""

R_VIEW_CARDFOR_OLD = r"""  const cardFor = (it, parent, lastLane) => {
    const placed = parent.type === "board";"""
R_VIEW_CARDFOR_NEW = r"""  const cardFor = (it, parent, lastLane) => {
    const placed = parent.type === "board";
    const inRow = parent.type === "column" && parent.flow === "row" && !tabulaIsLaned(parent);  // a card in a row (r033)
    const fit = tabulaNeed(it, inRow);"""

R_VIEW_CARDFOR_PROPS_OLD = r"""        lastLane={!!lastLane}"""
R_VIEW_CARDFOR_PROPS_NEW = r"""        lastLane={!!lastLane}
        fit={fit}
        inRow={inRow}"""

R_CSS_OLD = r""".tabula-lane-divider:hover::before{background:var(--accent-glow)}"""
R_CSS_NEW = r""".tabula-lane-divider:hover::before{background:var(--accent-glow)}
.tabula-column-body.row{flex-direction:row;align-items:flex-start;gap:6px}
.tabula-column-body.row>.tabula-colitem{flex:0 0 auto}
.tabula-column-body.row>.tabula-insert{width:0;height:auto;align-self:stretch;min-height:36px;border-top:0;border-left:2px solid var(--accent);margin:0 -4px}
.tabula-lane.untitled>.tabula-column-hdr{padding:2px 8px 1px}"""

ROW_PAIRS = [
    (R_DOC_HEAD_OLD, R_DOC_HEAD_NEW),
    (R_CONST_OLD, R_CONST_NEW),
    (R_NEED_OLD, R_NEED_NEW),
    (R_COERCE_OLD, R_COERCE_NEW),
    (R_SETTLE_OLD, R_SETTLE_NEW),
    (R_SETLANES_OLD, R_SETLANES_NEW),
    (R_CARD_SIG_OLD, R_CARD_SIG_NEW),
    (R_CARD_COLUMN_OLD, R_CARD_COLUMN_NEW),
    (R_CARD_HDR_OLD, R_CARD_HDR_NEW),
    (R_CARD_BODY_OLD, R_CARD_BODY_NEW),
    (R_CARD_CLS_OLD, R_CARD_CLS_NEW),
    (R_INSP_OLD, R_INSP_NEW),
    (R_INSP_STACKS_OLD, R_INSP_STACKS_NEW),
    (R_VIEW_DROP_OLD, R_VIEW_DROP_NEW),
    (R_VIEW_CARDFOR_OLD, R_VIEW_CARDFOR_NEW),
    (R_VIEW_CARDFOR_PROPS_OLD, R_VIEW_CARDFOR_PROPS_NEW),
]
ROW_CSS = [(R_CSS_OLD, R_CSS_NEW)]


def main():
    edit(MODULES / "21_stemma.jsx", [
        (DOC_HEAD_OLD, DOC_HEAD_NEW),
        (CONST_OLD, CONST_NEW),
        (CLAMP_OLD, CLAMP_NEW),
        (COERCE_COLUMN_OLD, COERCE_COLUMN_NEW),
        (IMPORT_CHECK_OLD, IMPORT_CHECK_NEW),
        (COUNT_OLD, COUNT_NEW),
        (PATH_OLD, PATH_NEW),
        (DELETE_ITEM_OLD, DELETE_ITEM_NEW),
        (MOVETO_OLD, MOVETO_NEW),
        (DELETE_COLUMN_OLD, DELETE_COLUMN_NEW),
        (RELINK_OLD, RELINK_NEW),
        (CARD_SIG_OLD, CARD_SIG_NEW),
        (CARD_COLUMN_OLD, CARD_COLUMN_NEW),
        (CARD_CLS_OLD, CARD_CLS_NEW),
        (INSP_SIG_OLD, INSP_SIG_NEW),
        (INSP_KIND_OLD, INSP_KIND_NEW),
        (INSP_COLUMN_OLD, INSP_COLUMN_NEW),
        (INSP_FOOT_OLD, INSP_FOOT_NEW),
        (MODAL_OLD, MODAL_NEW),
        (VIEW_STATE_OLD, VIEW_STATE_NEW),
        (VIEW_STATE2_OLD, VIEW_STATE2_NEW),
        (VIEW_SELECTED_OLD, VIEW_SELECTED_NEW),
        (VIEW_PRUNE_OLD, VIEW_PRUNE_NEW),
        (VIEW_DROPTARGET_OLD, VIEW_DROPTARGET_NEW),
        (VIEW_SELECTCARD_OLD, VIEW_SELECTCARD_NEW),
        (VIEW_PANE_OLD, VIEW_PANE_NEW),
        (VIEW_DELETE_OLD, VIEW_DELETE_NEW),
        (VIEW_KEYS_OLD, VIEW_KEYS_NEW),
        (VIEW_CARDFOR_OLD, VIEW_CARDFOR_NEW),
        (VIEW_SURFACE_OLD, VIEW_SURFACE_NEW),
        (VIEW_PANEL_OLD, VIEW_PANEL_NEW),
        (VIEW_MODAL_OLD, VIEW_MODAL_NEW),
    ])
    edit(ROOT / "cartulary-src" / "shell.html", [(CSS_OLD, CSS_NEW)])
    # the second pass: stacks under cards, on the tree the first leaves
    edit(MODULES / "21_stemma.jsx", STACK_PAIRS)
    edit(ROOT / "cartulary-src" / "shell.html", STACK_CSS)
    # the third pass: lane widths, on the tree the second leaves
    edit(MODULES / "21_stemma.jsx", WIDTH_PAIRS)
    edit(ROOT / "cartulary-src" / "shell.html", WIDTH_CSS)
    # the fourth pass: rows, on the tree the third leaves
    edit(MODULES / "21_stemma.jsx", ROW_PAIRS)
    edit(ROOT / "cartulary-src" / "shell.html", ROW_CSS)
    print("r033 applied: lanes, stacks under cards, lane widths, rows, and the multi-selection")


if __name__ == "__main__":
    main()
