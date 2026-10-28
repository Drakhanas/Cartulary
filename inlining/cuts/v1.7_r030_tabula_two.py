"""v1.7 r030: Tabula II, columns and sub-boards.

Stemma v2's fifth cut (docs/stemma-v2-spec.md, section 4's column and board
items, section 6's Columns and Sub-boards; the plan's item 5, approved
2026-10-27). The document already held both item types since r029 (coerced
at load, validated at import, counted for the index, a sub-board resolved
from focalNodeId at the render site), so this cut is the screen and five
transforms. The rail gains Column and Board. A column is a stack: a card
dragged over one shows an insertion line at the gap nearest the pointer and
drops into it, losing its position and taking the stack's order; dragged
out, it lands free at the drop with the column's width; reorder is a drag
inside; a column drags with its contents and never enters another column.
Deleting a column that holds anything asks, as Fabula's modal does: its
cards out onto the canvas where they stood (the default) or gone with it. A
board card shows its title, icon, color, and what it holds, everything below
it (the spec's section 13 choice, so the face and the index agree);
double-click opens it, the rota's breadcrumb names the way back, and Back
returns to the parent; its title is edited in the inspector, since the
double-click is taken. A column's title edits in place. The inspector takes
a column's title and color and a board's title, color, and icon, with what
each holds and Delete. The Delete key on a holder asks the same.

- 21_stemma: the document section gains tabulaCountBelow (tabulaCounts
  reads it), tabulaParentOf, tabulaBoardPath, tabulaMoveTo, and
  tabulaDeleteColumn; the canvas section's TabulaCard renders placed or in
  a column, a column's stack with its insertion line, and a board's face;
  TabulaInspector takes the two types; TabulaDeleteModal is new;
  TabulaCanvasView drags into, out of, and within columns, drills in, and
  shows the breadcrumb.
- 12_trunk: the render site passes onFocalChange to the tabula canvas.
- shell.html: the column's, the stack item's, the board face's, the
  insertion line's, the ghost's, and the modal's CSS.

Declared scope: 21_stemma, 12_trunk, shell.html.
Declarations added (21_stemma): tabulaCountBelow, tabulaParentOf,
tabulaBoardPath, tabulaMoveTo, tabulaDeleteColumn, TabulaDeleteModal.

String-anchored edits; every anchor must occur exactly once. The canvas
section from TabulaCard to the end of the file is replaced whole. Run from
anywhere inside the repository:
    python3 inlining/cuts/v1.7_r030_tabula_two.py
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
# 21_stemma: the document section
# ═══════════════════════════════════════════════════════════════════════════════

ICON_OLD = '  icon: "✦",                            // ✦\n'
ICON_NEW = '  icon: "✦",\n'

COUNTS_OLD = """// The index's count: cards (a note, a linked card, an image, a sub-board)
// and columns, everywhere below the root.
const tabulaCounts = (stemma) => {
  let cards = 0, columns = 0;
  tabulaWalk(stemma && stemma.root, (it) => { if (it.type === "column") columns++; else if (TABULA_ITEM_TYPES.includes(it.type)) cards++; });
  return { cards, columns };
};
"""
COUNTS_NEW = """// What a node holds, everywhere below it: cards (a note, a linked card, an
// image, a sub-board) and columns. The index reads it for the root and
// (r030) a board card's face for the sub-board, so the two agree.
const tabulaCountBelow = (node) => {
  let cards = 0, columns = 0;
  tabulaWalk(node, (it) => { if (it.type === "column") columns++; else if (TABULA_ITEM_TYPES.includes(it.type)) cards++; });
  return { cards, columns };
};
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
      else if (it.type === "column") { for (const c of (it.items || [])) { if (c.type === "board") { const r = walk(c, [...chain, c]); if (r) return r; } } }
    }
    return null;
  };
  return (root && walk(root, [root])) || [root];
};
"""

MOVE_OLD = """// A linked card becomes a note titled with the name it showed.
const tabulaConvertToNote = (doc, id, name) => tabulaUpdateItem(doc, id, (it) => {"""
MOVE_NEW = """// A move to a place (v1.7 r030): into a column at an index, where the item
// loses its position and takes the stack's order, or onto a board at x and
// y, where it takes them (and the width given, when it comes out of a
// column) and goes to the end. Refused: a column into a column, anything
// into itself or into what it holds. The index counts the column's items
// without the item itself, so a reorder inside the column reads as it looks.
const tabulaMoveTo = (doc, id, target) => {
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
  return placed ? { ...doc, root, updatedAt: isoNow() } : doc;
};
// A column deleted (v1.7 r030): with `placements` ([{ id, x, y }], where
// each card stood, measured by the view), its cards go out onto the board
// that held it, at the column's width, after everything else; without, they
// go with it. A card the placements don't name stacks under the last.
const tabulaDeleteColumn = (doc, id, placements) => {
  if (!doc || !doc.root) return doc;
  const col = tabulaFindItem(doc.root, id);
  if (!col || col.type !== "column") return doc;
  if (!placements) return tabulaDeleteItem(doc, id);
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
  return hit ? { ...doc, root, updatedAt: isoNow() } : doc;
};
// A linked card becomes a note titled with the name it showed.
const tabulaConvertToNote = (doc, id, name) => tabulaUpdateItem(doc, id, (it) => {"""

# ═══════════════════════════════════════════════════════════════════════════════
# 21_stemma: the canvas section, from TabulaCard to the end of the file
# ═══════════════════════════════════════════════════════════════════════════════

CANVAS_START = "// One card on the canvas. A note shows its title and its body as Markdown\n"

CANVAS_NEW = r"""// One card: placed on the canvas (absolute, at x and y, w wide, with the
// width handle) or in a column's stack (in flow, the column's width). A note
// shows its title and its body as Markdown (wiki-links resolve through the
// pool), or, edited in place, a title field and a body field that commit as
// they're typed, a run of typing one history step, the inspector's way; a
// linked card draws its record's icon and color and its source, orphaned
// when the record is gone; an image shows its picture and caption; a column
// (r030) shows its title, edited in place the same way, over its stack, with
// an insertion line at `insertAt` while something is dragged over it, each
// item rendered through `renderItem`; a board card (r030) shows its icon,
// its title, and what it holds. `ghost` is the copy that follows the
// pointer while a stack item is on the move; `over` marks a column a drag
// is over.
function TabulaCard({ item, placed, x, y, w, pool, templates, selected, dragging, ghost, over, editing, onEditChange, onEditDone, onPointerDown, onHandleDown, onDoubleClick, onOpenEntry, dirHandle, imageFolder, renderItem, insertAt }) {
  const editRef = useRef(null);
  const { url: imageUrl, errored: imageErrored } = useMapImageUrl(item.type === "image" ? item.image : null, dirHandle, imageFolder);
  useEffect(() => {
    if (editing && editRef.current) {
      const first = editRef.current.querySelector("input");
      if (first) { first.focus({ preventScroll: true }); first.select(); }
    }
  }, [!!editing]);
  const editBox = (fields) => (
    <div
      ref={editRef}
      className="tabula-card-edit tabula-ui"
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) onEditDone(); }}
      onKeyDown={(e) => {
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onEditDone(); return; }
        if (e.key === "Enter" && e.target.tagName === "INPUT") { e.preventDefault(); e.stopPropagation(); const ta = e.currentTarget.querySelector("textarea"); if (ta) ta.focus({ preventScroll: true }); else onEditDone(); return; }
        e.stopPropagation();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >{fields}</div>
  );
  let body = null;
  let accent = null;
  if (item.type === "note") {
    accent = item.color || TABULA.color;
    if (editing) {
      body = editBox(
        <>
          <input type="text" value={item.title || ""} placeholder="Title" onChange={(e) => onEditChange({ title: e.target.value }, "title")} />
          <textarea value={item.body || ""} placeholder="Markdown; [[wiki-links]] resolve" rows={Math.max(3, Math.min(14, (item.body || "").split("\n").length + 1))} onChange={(e) => onEditChange({ body: e.target.value }, "body")} />
        </>
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
  } else if (item.type === "column") {
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
        <div className="tabula-column-hdr" style={{ borderTop: `3px solid ${color}` }}>
          {editing ? editBox(<input type="text" value={item.title || ""} placeholder="Column" onChange={(e) => onEditChange({ title: e.target.value }, "title")} />) : (
            <div className="tabula-column-title" style={{ color: item.title ? "var(--text)" : "var(--text-dim)", fontStyle: item.title ? "normal" : "italic" }}>{item.title || "Untitled column"}</div>
          )}
        </div>
        <div className="tabula-column-body">
          {rows.length > 0 ? rows : <div className="tabula-column-empty">{over ? "" : "Drop cards here"}</div>}
        </div>
      </>
    );
  } else if (item.type === "board") {
    const color = item.color || TABULA.color;
    const held = tabulaCountBelow(item);
    const holds = held.cards === 0 && held.columns === 0 ? "empty" : [held.cards ? `${held.cards} ${held.cards === 1 ? "card" : "cards"}` : null, held.columns ? `${held.columns} ${held.columns === 1 ? "column" : "columns"}` : null].filter(Boolean).join(" · ");
    body = (
      <div className="tabula-board" title="Double-click to open">
        <div className="face" style={{ background: color }}>{item.icon || TABULA.icon}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          {editing ? editBox(<input type="text" value={item.title || ""} placeholder="Board" onChange={(e) => onEditChange({ title: e.target.value }, "title")} />) : (
            <div className="name" style={{ color: item.title ? "var(--text)" : "var(--text-dim)", fontStyle: item.title ? "normal" : "italic" }}>{item.title || "Untitled board"}</div>
          )}
          <div className="src">{holds}</div>
        </div>
      </div>
    );
  } else {
    return null;
  }
  const cls = `${placed ? "tabula-card" : "tabula-colitem"}${selected ? " selected" : ""}${dragging ? " dragging" : ""}${ghost ? " ghost" : ""}${over ? " over" : ""}`;
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
}

// The right-side inspector for the selected card, the rota's pattern: a
// note's title, body, and color; a linked card's record with Open where
// something opens, re-link, and convert to a note; an image's caption and
// its replacement; a column's title and color (r030); a board's title,
// color, and icon, with Open (r030); what a column or a board holds; Delete
// on every card. A run of typing in a field is one history step.
function TabulaInspector({ item, pool, templates, isLocked, onClose, onPatch, onDelete, onRelink, onConvertToNote, onOpenEntry, onReplaceImage, onOpenBoard }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  useEffect(() => { setPickerOpen(false); }, [item && item.id]);
  if (!item) return null;
  const field = (label, control) => (
    <div className="form-field">
      <label className="form-label">{label}</label>
      {control}
    </div>
  );
  const colorRow = (
    <div className="color-row">
      {COLORS.map(color => (
        <div key={color} className={`color-opt ${item.color === color ? "sel" : ""}`} style={{ background: color, ...(isLocked ? { opacity: 0.5, cursor: "default" } : {}) }} onClick={() => !isLocked && onPatch({ color })} />
      ))}
    </div>
  );
  const holdsLine = (node) => {
    const held = tabulaCountBelow(node);
    const parts = [held.cards ? `${held.cards} ${held.cards === 1 ? "card" : "cards"}` : null, held.columns ? `${held.columns} ${held.columns === 1 ? "column" : "columns"}` : null].filter(Boolean);
    return <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>{parts.length ? `Holds ${parts.join(" and ")}.` : "Holds nothing yet."}</div>;
  };
  let body = null;
  const kind = item.type === "note" ? "Note" : item.type === "linked" ? "Linked" : item.type === "image" ? "Image" : item.type === "column" ? "Column" : "Board";
  if (item.type === "note") {
    body = (
      <>
        {field("Title", <input className="input" type="text" value={item.title || ""} disabled={isLocked} placeholder="Untitled" onChange={(e) => onPatch({ title: e.target.value }, "title")} />)}
        {field("Body", <textarea className="input" value={item.body || ""} disabled={isLocked} placeholder="Markdown; [[wiki-links]] resolve" rows={8} style={{ overflow: "auto", minHeight: 120 }} onChange={(e) => onPatch({ body: e.target.value }, "body")} />)}
        {field("Color", colorRow)}
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
  } else if (item.type === "column") {
    body = (
      <>
        {field("Title", <input className="input" type="text" value={item.title || ""} disabled={isLocked} placeholder="Untitled column" onChange={(e) => onPatch({ title: e.target.value }, "title")} />)}
        {field("Color", colorRow)}
        {holdsLine(item)}
      </>
    );
  } else if (item.type === "board") {
    body = (
      <>
        {field("Title", <input className="input" type="text" value={item.title || ""} disabled={isLocked} placeholder="Untitled board" onChange={(e) => onPatch({ title: e.target.value }, "title")} />)}
        {field("Icon", (
          <div className="icon-grid">
            {ICONS.map(icon => (
              <div key={icon} className={`icon-opt ${item.icon === icon ? "sel" : ""}`} onClick={() => !isLocked && onPatch({ icon })} style={isLocked ? { opacity: 0.5, cursor: "default" } : {}}>{icon}</div>
            ))}
          </div>
        ))}
        {field("Color", colorRow)}
        {holdsLine(item)}
        <button className="btn btn-ghost" style={{ fontSize: 12, width: "100%", marginTop: 10 }} onClick={() => onOpenBoard(item.id)}>Open board →</button>
      </>
    );
  }
  return (
    <div className="tabula-ui" style={{ width: 320, flexShrink: 0, borderLeft: "1px solid var(--border)", background: "var(--surf)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg)" }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>
          Inspector
          <span style={{ marginLeft: 8, fontSize: 11, color: "var(--text-dim)", fontWeight: 400 }}>{kind}</span>
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
          <button className="btn" style={{ fontSize: 12, color: "var(--danger)", borderColor: "var(--danger)" }} onClick={onDelete}>{item.type === "column" ? "Delete column" : item.type === "board" ? "Delete board" : "Delete card"}</button>
        </div>
      )}
    </div>
  );
}

// Deleting a column or a board card that holds anything asks (v1.7 r030),
// Fabula's holds-delete modal's shape: a column's cards can go out onto the
// canvas where they stood, the default, or with it; a board's go with it,
// with the count. Esc cancels, as a click outside does.
function TabulaDeleteModal({ item, onMoveOut, onDeleteAll, onCancel }) {
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
}

// The canvas view. boardId names the board node shown: the root, or a
// sub-board opened by a double-click on its card (r030), with the rota's
// breadcrumb in the bar and Back to its parent. The pool and the templates
// are the rota's (App builds them).
function TabulaCanvasView({ stemma, boardId, entries, templates, isLocked, flash, onFocalChange, onBackToIndex, onReplace, onOpenEntry, onExport, viewPref, onViewPref, dirHandle, imageFolder }) {
  const board = tabulaBoardNode(stemma.root, boardId) || stemma.root;
  const history = useMapHistory(stemma, onReplace);
  const apply = (next, opts) => {
    if (isLocked || !next || next === stemma) return;
    history.commit(next, opts);
  };
  const paneRef = useRef(null);
  const surfaceRef = useRef(null);
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(null);     // the id of the note, column, or board edited in place
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [picker, setPicker] = useState(null);       // { x, y }: the Link tool's smart input, canvas units
  const [drag, setDrag] = useState(null);           // { id, x, y, w, ghost, over }: a card on the move, canvas units; over = { columnId, index }
  const [resize, setResize] = useState(null);       // { id, w }: a card on the resize
  const [placing, setPlacing] = useState(null);     // { kind }: a rail button on the drag
  const [asking, setAsking] = useState(null);       // the column or board card whose delete is being asked about
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
  };
  const fitAll = () => camera.fitTo(cardsBox());
  camera.cfg.current.onFit = fitAll;
  // a board opens where it was left, or at Fit the first time; the view
  // mounted on the first board's own pref, so only a change of board sets it
  const shownBoardRef = useRef(null);
  React.useLayoutEffect(() => {
    const first = shownBoardRef.current === null;
    shownBoardRef.current = board.id;
    if (viewPref) { if (!first) camera.setView(viewPref); }
    else fitAll();
    if (!first) { setSelectedId(null); setEditing(null); setPicker(null); setDrag(null); setAsking(null); }
  }, [board.id]);

  // a card that goes closes the inspector and the editor on it
  useEffect(() => {
    if (selectedId && !tabulaFindItem(board, selectedId)) setSelectedId(null);
    if (editing && !tabulaFindItem(board, editing)) setEditing(null);
    if (asking && !tabulaFindItem(board, asking.id)) setAsking(null);
  }, [board, selectedId, editing, asking]);
  useEffect(() => () => { if (prefTimer.current) clearTimeout(prefTimer.current); }, []);

  // The in-place editor's fields commit as they're typed, so ending the edit
  // only closes the fields; the ref lets the pane's press and the field's
  // blur both ask in one event.
  const editingRef = useRef(null);
  editingRef.current = editing;
  const endEdit = () => { if (!editingRef.current) return; editingRef.current = null; setEditing(null); };
  camera.cfg.current.onTap = () => { endEdit(); setSelectedId(null); setPicker(null); };
  const startEdit = (it) => { if (isLocked || (it.type !== "note" && it.type !== "column")) return; setSelectedId(it.id); setEditing(it.id); };

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
    else if (kind === "column") { const it = addAt({ id: `n-${genId()}`, type: "column", title: "", color: TABULA.color, items: [] }, cx, cy); setEditing(it.id); }
    else if (kind === "board") { const it = addAt({ id: `n-${genId()}`, type: "board", title: "", color: TABULA.color, icon: TABULA.icon, items: [], shapes: [] }, cx, cy); setEditing(it.id); }
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
  useEffect(() => () => { gestureRef.current = null; document.body.classList.remove("tabula-dragging"); window.removeEventListener("pointermove", handlersRef.current.move); window.removeEventListener("pointerup", handlersRef.current.up); window.removeEventListener("pointercancel", handlersRef.current.up); }, []);

  // The column under the pointer, for a drop, and the gap nearest the
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
    const box = e.currentTarget.getBoundingClientRect();
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

  // Deleting: a card goes; a column or a board card that holds anything
  // asks first (TabulaDeleteModal). A column's cards moved out land where
  // they stood, measured from the stack as drawn.
  const requestDelete = (it) => {
    if (!it || isLocked) return;
    const held = tabulaCountBelow(it);
    if ((it.type === "column" || it.type === "board") && (held.cards > 0 || held.columns > 0)) { setAsking(it); return; }
    apply(tabulaDeleteItem(stemma, it.id));
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
  const moveOut = () => { if (asking) apply(tabulaDeleteColumn(stemma, asking.id, columnPlacements(asking))); setAsking(null); };
  const deleteAll = () => { if (asking) apply(tabulaDeleteItem(stemma, asking.id)); setAsking(null); };

  // the selection's keys: Delete, the arrows by the grid on a placed card, Escape
  useEffect(() => {
    const typing = (t) => { const tag = t && t.tagName ? t.tagName.toUpperCase() : ""; return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !!(t && t.isContentEditable); };
    const down = (e) => {
      if (typing(e.target) || asking) return;
      if (e.key === "Escape") { if (picker) { setPicker(null); return; } if (editing) { endEdit(); return; } if (selectedId) setSelectedId(null); return; }
      if (!selected || isLocked || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); requestDelete(selected); return; }
      if (!selectedParent || selectedParent.type !== "board") return;
      const step = TABULA.grid;
      const d = e.key === "ArrowLeft" ? [-step, 0] : e.key === "ArrowRight" ? [step, 0] : e.key === "ArrowUp" ? [0, -step] : e.key === "ArrowDown" ? [0, step] : null;
      if (d) { e.preventDefault(); apply(tabulaMoveItem(stemma, selected.id, selected.x + d[0], selected.y + d[1]), { coalesce: `nudge:${selected.id}` }); }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [selected, selectedParent, selectedId, editing, picker, stemma, isLocked, asking]);

  const view = camera.view;
  const pool = entries || [];
  const screenOf = (cx, cy) => ({ x: (cx - view.x) * view.zoom, y: (cy - view.y) * view.zoom });
  const zoomPct = Math.round(view.zoom * 100);
  const path = tabulaBoardPath(stemma.root, board.id);
  const dragged = drag ? tabulaFindItem(board, drag.id) : null;

  // one card, placed or in a stack, wired to the view
  const cardFor = (it, parent) => {
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
        over={!!(drag && drag.over && drag.over.columnId === it.id)}
        insertAt={drag && drag.over && drag.over.columnId === it.id ? drag.over.index : null}
        editing={editing === it.id}
        onEditChange={(patch, key) => apply(tabulaUpdateItem(stemma, it.id, patch), { coalesce: `field:${it.id}:${key}` })}
        onEditDone={endEdit}
        onPointerDown={onCardPointerDown(it, parent)}
        onHandleDown={onHandlePointerDown(it)}
        onDoubleClick={(e) => { e.stopPropagation(); if (it.type === "board") drillIn(it.id); else startEdit(it); }}
        onOpenEntry={onOpenEntry}
        dirHandle={dirHandle}
        imageFolder={imageFolder}
        renderItem={it.type === "column" ? ((c) => cardFor(c, it)) : undefined}
      />
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* The top bar: back, the name (click to rename), the breadcrumb on a sub-board, undo and redo, export. */}
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
        {path.length > 1 && (
          <button className="btn btn-ghost" style={{ padding: "2px 8px", fontSize: 12 }} title="Back to the board that holds this one" onClick={() => drillIn(path[path.length - 2].id)}>Back</button>
        )}
        {path.length > 1 && path.map((node, i) => {
          const isCurrent = i === path.length - 1;
          const name = i === 0 ? stemma.name : (node.title || "Untitled board");
          const truncated = name.length > 28 ? name.slice(0, 27) + "…" : name;
          return (
            <React.Fragment key={node.id}>
              <span style={{ color: "var(--text-dim)", fontSize: 13 }}>›</span>
              {isCurrent ? (
                <span className="tabula-crumb" title={name} style={{ fontSize: 13, color: "var(--accent)", fontWeight: 500, padding: "2px 6px" }}>{truncated}</span>
              ) : (
                <button className="btn btn-ghost tabula-crumb" title={name} onClick={() => drillIn(node.id)} style={{ padding: "2px 8px", fontSize: 13 }}>{truncated}</button>
              )}
            </React.Fragment>
          );
        })}
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
            <button type="button" title="Column: a stack that cards drop into" onPointerDown={onRailPointerDown("column")}><span className="glyph">▥</span>Column</button>
            <button type="button" title="Board: a board inside this one; double-click its card to open it" onPointerDown={onRailPointerDown("board")}><span className="glyph">⊞</span>Board</button>
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
            {items.map(it => cardFor(it, board))}
            {drag && drag.ghost && dragged && (
              <TabulaCard item={dragged} placed ghost dragging x={drag.x} y={drag.y} w={drag.w} pool={pool} templates={templates} onOpenEntry={onOpenEntry} dirHandle={dirHandle} imageFolder={imageFolder} />
            )}
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
            <div className="tabula-empty tabula-ui">{path.length > 1 ? "An empty board. Add a note from the rail, or double-click the canvas." : "Nothing here yet. Add a note from the rail, or double-click the canvas."}</div>
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
            onDelete={() => requestDelete(selected)}
            onRelink={(entryId, name) => apply(tabulaRelink(stemma, selected.id, entryId, name))}
            onConvertToNote={() => { const rec = pool.find(e => e.id === selected.entryId); apply(tabulaConvertToNote(stemma, selected.id, rec ? rec.name : selected._cachedName)); }}
            onOpenEntry={onOpenEntry}
            onReplaceImage={() => replaceImage(selected)}
            onOpenBoard={drillIn}
          />
        )}
      </div>
      {asking && (
        <TabulaDeleteModal item={asking} onMoveOut={moveOut} onDeleteAll={deleteAll} onCancel={() => setAsking(null)} />
      )}
    </div>
  );
}"""

# ═══════════════════════════════════════════════════════════════════════════════
# 12_trunk: the render site
# ═══════════════════════════════════════════════════════════════════════════════

RENDER_OLD = """                  isLocked={isLocked}
                  flash={flash}
                  onBackToIndex={closeStemmaToIndex}
                  onReplace={(next) => replaceStemma(stem.id, next)}
                  onOpenEntry={openEntryFromAnywhere}
                  onExport={() => exportStemmaJson(stem)}
                  viewPref={(prefs.tabulaViews || {})[boardId] || null}"""
RENDER_NEW = """                  isLocked={isLocked}
                  flash={flash}
                  onFocalChange={setFocalNodeId}
                  onBackToIndex={closeStemmaToIndex}
                  onReplace={(next) => replaceStemma(stem.id, next)}
                  onOpenEntry={openEntryFromAnywhere}
                  onExport={() => exportStemmaJson(stem)}
                  viewPref={(prefs.tabulaViews || {})[boardId] || null}"""

# ═══════════════════════════════════════════════════════════════════════════════
# shell.html
# ═══════════════════════════════════════════════════════════════════════════════

CSS_OLD = ".tabula-linked.orphan .name{font-style:italic;color:var(--text-dim)}\n"
CSS_NEW = CSS_OLD + """.tabula-card.ghost{pointer-events:none;opacity:.85;z-index:2;box-shadow:0 10px 24px rgba(0,0,0,.45)}
body.tabula-dragging,body.tabula-dragging *{user-select:none!important}
.tabula-card.over{outline:2px dashed var(--accent);outline-offset:2px}
.tabula-column-hdr{padding:6px 10px 4px;border-radius:6px 6px 0 0}
.tabula-column-title{font-size:13px;font-weight:600;letter-spacing:.02em;word-break:break-word}
.tabula-column-body{display:flex;flex-direction:column;gap:6px;padding:4px 6px 8px;min-height:36px}
.tabula-column-empty{font-size:12px;color:var(--text-dim);font-style:italic;text-align:center;padding:8px 4px}
.tabula-colitem{position:relative;background:var(--surf2);border:1px solid var(--border);border-radius:5px;user-select:none;cursor:default}
.tabula-colitem.selected{outline:2px solid var(--accent);outline-offset:1px}
.tabula-insert{height:0;border-top:2px solid var(--accent);margin:-3px 2px;border-radius:1px}
.tabula-board{display:flex;align-items:center;gap:10px;padding:10px 10px}
.tabula-board .face{width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--bg);font-size:18px;flex-shrink:0;font-weight:600}
.tabula-board .name{font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tabula-board .src{font-size:11px;color:var(--text-dim)}
.tabula-holds-delete{max-width:460px}
"""


def main():
    stemma = MODULES / "21_stemma.jsx"
    edit(stemma, [
        (ICON_OLD, ICON_NEW),
        (COUNTS_OLD, COUNTS_NEW),
        (MOVE_OLD, MOVE_NEW),
    ])
    text = stemma.read_text(encoding="utf-8")
    assert text.count(CANVAS_START) == 1, "the canvas section's card comment must occur once"
    head = text[:text.index(CANVAS_START)]
    assert not head.endswith("\n\n\n")
    stemma.write_text(head + CANVAS_NEW, encoding="utf-8")
    edit(MODULES / "12_trunk.jsx", [(RENDER_OLD, RENDER_NEW)])
    edit(ROOT / "cartulary-src" / "shell.html", [(CSS_OLD, CSS_NEW)])
    print("r030 applied: columns and sub-boards on the tabula canvas; the five transforms; the modal; the breadcrumb")


if __name__ == "__main__":
    main()
