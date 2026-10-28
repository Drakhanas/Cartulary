"""v1.7 r031: Tabula II½, the grip, and the drop into a sub-board.

What Drak's pass of r030 asked for (2026-10-28, his calls 1A and 2; the
plan's item 6 since, docs/stemma-v2-spec.md, section 11). Every card, placed
or in a stack, and every board card gets a grip strip in its left margin,
the sidebar's ⋮⋮ shown on hover, cursor grab, a note's color accent its
tint; a column's header stays its handle, the glyph at its left. The grip is
the only drag surface: a press on the body selects, a double-click edits or
opens, and nothing moves unless the grip is taken, the sidebar's rule, so a
click into a note to follow a link never nudges it. A card dragged over a
board card marks it, the column's dashed mark, with a line on the nearest of
its four edges, and the line decides where it lands in the sub-board (Drak,
2026-10-28): left or right, beside the content's leftmost or rightmost item
at the content's top; above or below, over its topmost or under its lowest at
the content's left; the origin when the board is empty. Columns and boards
drop in too, never into themselves or what they hold, which tabulaMoveTo
already refuses.

- 21_stemma: TabulaCard takes onGripDown and overEdge, renders the grip
  and the edge line, and gives the column header the grip; TabulaCanvasView
  splits the press into selectCard and beginDrag, generalizes columnTarget
  to dropTarget with a board-card case, and adds boardLanding.
- shell.html: the grip, the body's room for it, the edge line.

Declared scope: 21_stemma, shell.html. Declarations added: none.

String-anchored edits; every anchor must occur exactly once. Run from
anywhere inside the repository:
    python3 inlining/cuts/v1.7_r031_tabula_grip.py
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
# 21_stemma: TabulaCard
# ═══════════════════════════════════════════════════════════════════════════════

CARD_DOC_OLD = """// item rendered through `renderItem`; a board card (r030) shows its icon,
// its title, and what it holds. `ghost` is the copy that follows the
// pointer while a stack item is on the move; `over` marks a column a drag
// is over.
function TabulaCard({ item, placed, x, y, w, pool, templates, selected, dragging, ghost, over, editing, onEditChange, onEditDone, onPointerDown, onHandleDown, onDoubleClick, onOpenEntry, dirHandle, imageFolder, renderItem, insertAt }) {"""
CARD_DOC_NEW = """// item rendered through `renderItem`; a board card (r030) shows its icon,
// its title, and what it holds. `ghost` is the copy that follows the
// pointer while a stack item is on the move; `over` marks a column or a
// board card a drag is over, and `overEdge` names the board card's edge
// nearest the pointer, where the line is drawn. Since r031 the grip strip in
// the left margin (`onGripDown`) is the only surface that drags; a press on
// the body (`onPointerDown`) selects. A column's header is its grip.
function TabulaCard({ item, placed, x, y, w, pool, templates, selected, dragging, ghost, over, overEdge, editing, onEditChange, onEditDone, onPointerDown, onGripDown, onHandleDown, onDoubleClick, onOpenEntry, dirHandle, imageFolder, renderItem, insertAt }) {"""

COLUMN_HDR_OLD = """        <div className="tabula-column-hdr" style={{ borderTop: `3px solid ${color}` }}>
          {editing ? editBox(<input type="text" value={item.title || ""} placeholder="Column" onChange={(e) => onEditChange({ title: e.target.value }, "title")} />) : (
            <div className="tabula-column-title" style={{ color: item.title ? "var(--text)" : "var(--text-dim)", fontStyle: item.title ? "normal" : "italic" }}>{item.title || "Untitled column"}</div>
          )}
        </div>"""
COLUMN_HDR_NEW = """        <div className="tabula-column-hdr" style={{ borderTop: `3px solid ${color}` }} title={editing ? undefined : "Drag to move the column"} onPointerDown={editing ? undefined : onGripDown}>
          {!editing && !ghost && <span className="tabula-grip tabula-grip-inline" aria-hidden="true">⋮⋮</span>}
          {editing ? editBox(<input type="text" value={item.title || ""} placeholder="Column" onChange={(e) => onEditChange({ title: e.target.value }, "title")} />) : (
            <div className="tabula-column-title" style={{ color: item.title ? "var(--text)" : "var(--text-dim)", fontStyle: item.title ? "normal" : "italic" }}>{item.title || "Untitled column"}</div>
          )}
        </div>"""

CARD_RETURN_OLD = """  const cls = `${placed ? "tabula-card" : "tabula-colitem"}${selected ? " selected" : ""}${dragging ? " dragging" : ""}${ghost ? " ghost" : ""}${over ? " over" : ""}`;
  return (
    <div
      className={cls}
      data-item={item.id}
      data-type={item.type}
      style={placed ? { left: x, top: y, width: w, borderLeft: accent ? `3px solid ${accent}` : undefined } : { borderLeft: accent ? `3px solid ${accent}` : undefined }}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
    >
      {body}
      {placed && !ghost && <div className="tabula-card-handle" title="Drag to resize" onPointerDown={onHandleDown} />}
    </div>
  );
}"""
CARD_RETURN_NEW = """  const cls = `${placed ? "tabula-card" : "tabula-colitem"}${selected ? " selected" : ""}${dragging ? " dragging" : ""}${ghost ? " ghost" : ""}${over ? " over" : ""}${item.type === "column" ? " is-column" : ""}`;
  const gripped = item.type !== "column";
  return (
    <div
      className={cls}
      data-item={item.id}
      data-type={item.type}
      style={placed ? { left: x, top: y, width: w, borderLeft: accent ? `3px solid ${accent}` : undefined } : { borderLeft: accent ? `3px solid ${accent}` : undefined }}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
    >
      {gripped && !ghost && (
        <div className="tabula-grip" title="Drag to move" style={accent ? { background: `${accent}22` } : undefined} onPointerDown={onGripDown} onDoubleClick={(e) => e.stopPropagation()}>⋮⋮</div>
      )}
      {gripped ? <div className="tabula-body">{body}</div> : body}
      {over && overEdge && <div className={`tabula-edge tabula-edge-${overEdge}`} />}
      {placed && !ghost && <div className="tabula-card-handle" title="Drag to resize" onPointerDown={onHandleDown} />}
    </div>
  );
}"""

# ═══════════════════════════════════════════════════════════════════════════════
# 21_stemma: TabulaCanvasView
# ═══════════════════════════════════════════════════════════════════════════════

TARGET_OLD = """  // The column under the pointer, for a drop, and the gap nearest the
  // pointer in its stack (the dragged item left out): from the DOM, so what
  // the line shows is where the card lands. A column never enters one.
  const columnTarget = (clientX, clientY, dragged) => {
    const el = surfaceRef.current;
    if (!el || !dragged || dragged.type === "column") return null;
    const cols = Array.from(el.querySelectorAll('.tabula-card[data-type="column"]'));
    for (const col of cols) {
      if (col.dataset.item === dragged.id) continue;
      const r = col.getBoundingClientRect();
      if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) continue;
      const kids = Array.from(col.querySelectorAll(":scope > .tabula-column-body > .tabula-colitem")).filter(k => k.dataset.item !== dragged.id);
      let index = 0;
      kids.forEach(k => { const kr = k.getBoundingClientRect(); if (kr.top + kr.height / 2 < clientY) index++; });
      return { columnId: col.dataset.item, index };
    }
    return null;
  };

  // a press on a card, placed or in a stack: select it, and begin the move
  // that commits on release, into a column at the gap, or onto the board at
  // the drop, raised
  const onCardPointerDown = (it, parent) => (e) => {
    if (e.button !== 0 || camera.spaceHeld) return;
    if (editing === it.id) return;
    e.stopPropagation();
    if (editing) endEdit();
    setSelectedId(it.id);
    if (isLocked) return;
    const startX = e.clientX, startY = e.clientY;
    const box = e.currentTarget.getBoundingClientRect();"""
TARGET_NEW = """  // What is under the pointer, for a drop: a column, with the gap nearest
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
    setSelectedId(it.id);
    if (isLocked) return;
    const startX = e.clientX, startY = e.clientY;
    const box = (e.currentTarget.closest("[data-item]") || e.currentTarget).getBoundingClientRect();"""

MOVE_OLD = """        if (!g || !g.moved) return;
        const p = at(ev);
        setDrag({ id: it.id, x: p.x, y: p.y, w, ghost: inStack, over: columnTarget(ev.clientX, ev.clientY, it) });
      },
      onUp: (ev) => {
        document.body.classList.remove("tabula-dragging");
        const moved = Math.hypot(ev.clientX - startX, ev.clientY - startY) > TABULA.dragSlop;
        setDrag(null);
        if (!moved) return;
        const over = columnTarget(ev.clientX, ev.clientY, it);
        if (over) apply(tabulaMoveTo(stemma, it.id, { columnId: over.columnId, index: over.index }));
        else { const p = at(ev); apply(tabulaMoveTo(stemma, it.id, { boardId: board.id, x: tabulaSnap(p.x), y: tabulaSnap(p.y), w })); }
      },
    });
  };"""
MOVE_NEW = """        if (!g || !g.moved) return;
        const p = at(ev);
        setDrag({ id: it.id, x: p.x, y: p.y, w, ghost: inStack, over: dropTarget(ev.clientX, ev.clientY, it) });
      },
      onUp: (ev) => {
        document.body.classList.remove("tabula-dragging");
        const moved = Math.hypot(ev.clientX - startX, ev.clientY - startY) > TABULA.dragSlop;
        setDrag(null);
        if (!moved) return;
        const over = dropTarget(ev.clientX, ev.clientY, it);
        if (over && over.columnId) apply(tabulaMoveTo(stemma, it.id, { columnId: over.columnId, index: over.index }));
        else if (over && over.boardId) {
          const target = tabulaBoardNode(stemma.root, over.boardId);
          if (target) { const l = boardLanding(target, over.edge, w); apply(tabulaMoveTo(stemma, it.id, { boardId: over.boardId, x: l.x, y: l.y, w })); }
        }
        else { const p = at(ev); apply(tabulaMoveTo(stemma, it.id, { boardId: board.id, x: tabulaSnap(p.x), y: tabulaSnap(p.y), w })); }
      },
    });
  };"""

CARDFOR_OLD = """        over={!!(drag && drag.over && drag.over.columnId === it.id)}
        insertAt={drag && drag.over && drag.over.columnId === it.id ? drag.over.index : null}
        editing={editing === it.id}
        onEditChange={(patch, key) => apply(tabulaUpdateItem(stemma, it.id, patch), { coalesce: `field:${it.id}:${key}` })}
        onEditDone={endEdit}
        onPointerDown={onCardPointerDown(it, parent)}
        onHandleDown={onHandlePointerDown(it)}"""
CARDFOR_NEW = """        over={!!(drag && drag.over && (drag.over.columnId === it.id || drag.over.boardId === it.id))}
        overEdge={drag && drag.over && drag.over.boardId === it.id ? drag.over.edge : null}
        insertAt={drag && drag.over && drag.over.columnId === it.id ? drag.over.index : null}
        editing={editing === it.id}
        onEditChange={(patch, key) => apply(tabulaUpdateItem(stemma, it.id, patch), { coalesce: `field:${it.id}:${key}` })}
        onEditDone={endEdit}
        onPointerDown={selectCard(it)}
        onGripDown={beginDrag(it, parent)}
        onHandleDown={onHandlePointerDown(it)}"""

# ═══════════════════════════════════════════════════════════════════════════════
# shell.html
# ═══════════════════════════════════════════════════════════════════════════════

CSS_OLD = ".tabula-holds-delete{max-width:460px}\n"
CSS_NEW = CSS_OLD + """.tabula-grip{position:absolute;left:0;top:0;bottom:0;width:14px;display:flex;align-items:center;justify-content:center;color:var(--text-dim);font-size:11px;letter-spacing:-2px;line-height:1;cursor:grab;user-select:none;opacity:0;transition:opacity .12s ease;border-radius:5px 0 0 5px;z-index:1}
.tabula-card:hover>.tabula-grip,.tabula-colitem:hover>.tabula-grip,.tabula-card.selected>.tabula-grip,.tabula-colitem.selected>.tabula-grip{opacity:1}
.tabula-grip:hover{color:var(--accent)}
.tabula-grip:active{cursor:grabbing}
.tabula-body{padding-left:14px;min-width:0}
.tabula-grip-inline{position:static;display:inline-flex;width:auto;margin-right:6px;opacity:1;vertical-align:middle;cursor:grab}
.tabula-column-hdr{cursor:grab}
.tabula-column-hdr:active{cursor:grabbing}
.tabula-column-hdr .tabula-card-edit{cursor:default}
.tabula-pane.grab .tabula-grip,.tabula-pane.grab .tabula-grip-inline{display:none}
.tabula-pane.grab .tabula-column-hdr{cursor:inherit}
.tabula-edge{position:absolute;background:var(--accent);pointer-events:none;border-radius:2px;z-index:2}
.tabula-edge-left{left:-4px;top:-2px;bottom:-2px;width:3px}
.tabula-edge-right{right:-4px;top:-2px;bottom:-2px;width:3px}
.tabula-edge-top{top:-4px;left:-2px;right:-2px;height:3px}
.tabula-edge-bottom{bottom:-4px;left:-2px;right:-2px;height:3px}
"""


def main():
    edit(MODULES / "21_stemma.jsx", [
        (CARD_DOC_OLD, CARD_DOC_NEW),
        (COLUMN_HDR_OLD, COLUMN_HDR_NEW),
        (CARD_RETURN_OLD, CARD_RETURN_NEW),
        (TARGET_OLD, TARGET_NEW),
        (MOVE_OLD, MOVE_NEW),
        (CARDFOR_OLD, CARDFOR_NEW),
    ])
    edit(ROOT / "cartulary-src" / "shell.html", [(CSS_OLD, CSS_NEW)])
    print("r031 applied: the grip is the only drag surface; a card drops into a sub-board by the edge its line was on")


if __name__ == "__main__":
    main()
