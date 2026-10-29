"""v1.7 r034: Rota's reorder and keyboard.

Stemma v2's plan, item 9 (docs/stemma-v2-spec.md, section 11; section 7,
Rota's own v2 items). Sibling reorder: a child dragged along the orbit
follows the pointer's angle and snaps to the nearest slot, drawn there as
it goes; dropped on an empty slot it moves, on an occupied one the two
swap, Esc cancels, a press that never moves drills in as a click did;
Alt+Left and Alt+Right move the focused child to the next free slot either
way round. No slot number anywhere. The keyboard: Left and Right walk a
focus ring around the children (clockwise and back, wrapping; the first
from 12 o'clock when none is focused), Enter drills into the focused
child, Backspace goes to the parent, Home to the root, Delete removes the
focused child with the inspector's confirmation, N opens the smart input
on the first empty slot, Esc cancels a drag, closes the inspector, or
clears the focus, and + - 0 zoom as the map editor's keys do (0 back to
1). A locked world keeps the view-only keys (the walk, Enter, Backspace,
Home, the zoom) and refuses the editing ones (Delete, N, Alt+arrows, the
drag; a press on a child drills in). The focus clears when the focal
changes or its node goes.

- 21_stemma: stemmaMoveChild and stemmaRotateChild among the transforms;
  StemmaNode's focused, dragging, swap, and onPointerDown; the canvas
  view's focus, drag, orbit geometry, keys, and zoom keys.

Declared scope: 21_stemma.jsx. Declarations added: stemmaMoveChild,
stemmaRotateChild.

String-anchored edits; every anchor must occur exactly once. Run from
anywhere inside the repository:
    python3 inlining/cuts/v1.7_r034_rota_keys.py
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
# the transforms
# ═══════════════════════════════════════════════════════════════════════════════

TRANSFORMS_OLD = r"""// Rename the document. Refused, returning the document, for a blank name.
const stemmaRename = (doc, newName) => {
  if (!doc) return doc;
  const trimmed = (newName || "").trim();
  if (!trimmed) return doc;
  return { ...doc, name: trimmed, updatedAt: isoNow() };
};
"""
TRANSFORMS_NEW = r"""// Rename the document. Refused, returning the document, for a blank name.
const stemmaRename = (doc, newName) => {
  if (!doc) return doc;
  const trimmed = (newName || "").trim();
  if (!trimmed) return doc;
  return { ...doc, name: trimmed, updatedAt: isoNow() };
};

// Sibling reorder (v1.7 r034, the spec's section 7): a child moves to a
// slot on its parent's orbit; a sibling in that slot takes the child's.
// Refused for the root, a slot out of range, or the child's own slot.
const stemmaMoveChild = (doc, nodeId, slot) => {
  if (!doc || !doc.root || typeof slot !== "number" || slot < 0 || slot >= STEMMA_SLOTS) return doc;
  const path = findStemmaNodePath(doc.root, nodeId);
  if (!path || path.length < 2) return doc;
  const node = path[path.length - 1], parent = path[path.length - 2];
  if (node.slot === slot) return doc;
  const other = (parent.children || []).find(c => c.slot === slot);
  const root = updateNodeInStemmaTree(doc.root, parent.id, (p) => ({
    ...p,
    children: (p.children || []).map(c => (c.id === nodeId ? { ...c, slot } : (other && c.id === other.id) ? { ...c, slot: node.slot } : c)),
  }));
  return { ...doc, root, updatedAt: isoNow() };
};
// The next free slot either way round (v1.7 r034): dir is 1 for clockwise,
// -1 for the other way, wrapping; refused when no slot is free.
const stemmaRotateChild = (doc, nodeId, dir) => {
  if (!doc || !doc.root) return doc;
  const path = findStemmaNodePath(doc.root, nodeId);
  if (!path || path.length < 2) return doc;
  const node = path[path.length - 1], parent = path[path.length - 2];
  if (typeof node.slot !== "number") return doc;
  const taken = new Set((parent.children || []).map(c => c.slot));
  const step = dir < 0 ? -1 : 1;
  for (let i = 1; i < STEMMA_SLOTS; i++) {
    const s = (node.slot + step * i + STEMMA_SLOTS * 2) % STEMMA_SLOTS;
    if (!taken.has(s)) return stemmaMoveChild(doc, nodeId, s);
  }
  return doc;
};
"""

# ═══════════════════════════════════════════════════════════════════════════════
# StemmaNode
# ═══════════════════════════════════════════════════════════════════════════════

NODE_SIG_OLD = r"""function StemmaNode({ node, entries, templates, cx, cy, radius, isFocal, onClick }) {"""
NODE_SIG_NEW = r"""// v1.7 r034: `focused` draws the keyboard's ring, `dragging` the child on
// the move along the orbit, `swap` the sibling it would trade places with;
// `onPointerDown` is the drag's start (the view tells a press from a drag).
function StemmaNode({ node, entries, templates, cx, cy, radius, isFocal, focused, dragging, swap, onClick, onPointerDown }) {"""

NODE_OUTER_OLD = r"""        cursor: "pointer",
        userSelect: "none",
      }}
      onClick={onClick}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          background: displayColor,
          opacity: isOrphan ? 0.55 : 1,
          filter: isOrphan ? "grayscale(0.85)" : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--bg)",
          fontSize: radius * 0.95,
          fontWeight: 600,
          boxShadow: isFocal
            ? "0 0 0 3px var(--accent), 0 4px 12px rgba(0,0,0,0.35)"
            : "0 2px 6px rgba(0,0,0,0.25)",
          position: "relative",
        }}
      >"""
NODE_OUTER_NEW = r"""        cursor: dragging ? "grabbing" : "pointer",
        userSelect: "none",
        zIndex: dragging ? 2 : undefined,
        opacity: dragging ? 0.9 : 1,
      }}
      data-node={node.id}
      data-focused={focused ? "true" : undefined}
      data-swap={swap ? "true" : undefined}
      onClick={onClick}
      onPointerDown={onPointerDown}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          background: displayColor,
          opacity: isOrphan ? 0.55 : 1,
          filter: isOrphan ? "grayscale(0.85)" : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--bg)",
          fontSize: radius * 0.95,
          fontWeight: 600,
          boxShadow: isFocal
            ? "0 0 0 3px var(--accent), 0 4px 12px rgba(0,0,0,0.35)"
            : dragging
              ? "0 0 0 3px var(--accent), 0 10px 24px rgba(0,0,0,0.45)"
              : "0 2px 6px rgba(0,0,0,0.25)",
          outline: focused ? "2px solid var(--accent)" : swap ? "2px dashed var(--accent)" : "none",
          outlineOffset: 4,
          position: "relative",
        }}
      >"""

# ═══════════════════════════════════════════════════════════════════════════════
# the canvas view
# ═══════════════════════════════════════════════════════════════════════════════

VIEW_STATE_OLD = r"""  const [editingSlot, setEditingSlot] = useState(null);  // which slot's + is in input mode
  const [inspectorNodeId, setInspectorNodeId] = useState(null);  // which node the inspector is open on
  const [editingName, setEditingName] = useState(false);  // stemma name inline-edit mode
  const [nameDraft, setNameDraft] = useState("");

  // Reset editingSlot AND inspector when focal changes — drilling into a child
  // mid-typing would commit to the wrong parent, and mid-inspect would be
  // confusing. Both clear cleanly.
  useEffect(() => {
    setEditingSlot(null);
    setInspectorNodeId(null);
  }, [focal.id]);"""
VIEW_STATE_NEW = r"""  const [editingSlot, setEditingSlot] = useState(null);  // which slot's + is in input mode
  const [inspectorNodeId, setInspectorNodeId] = useState(null);  // which node the inspector is open on
  const [editingName, setEditingName] = useState(false);  // stemma name inline-edit mode
  const [nameDraft, setNameDraft] = useState("");
  const [focusId, setFocusId] = useState(null);  // the keyboard's focused child (v1.7 r034)
  const [drag, setDrag] = useState(null);         // { id, slot }: a child on the move along the orbit, at the slot nearest the pointer (v1.7 r034)

  // Reset editingSlot AND inspector when focal changes — drilling into a child
  // mid-typing would commit to the wrong parent, and mid-inspect would be
  // confusing. Both clear cleanly. The keyboard's focus too (r034).
  useEffect(() => {
    setEditingSlot(null);
    setInspectorNodeId(null);
    setFocusId(null);
    setDrag(null);
  }, [focal.id]);
  // a focused child that goes (deleted, undone) takes the focus with it
  useEffect(() => {
    if (focusId && !(focal.children || []).some(c => c.id === focusId)) setFocusId(null);
  }, [focal, focusId]);"""

VIEW_ZOOM_OLD = r"""  const [zoom, setZoom] = useState(1);
  const canvasPaneRef = useRef(null);"""
VIEW_ZOOM_NEW = r"""  const [zoom, setZoom] = useState(1);
  const canvasPaneRef = useRef(null);
  const innerRef = useRef(null);  // the SIZE-by-SIZE square the nodes sit in, scaled (r034: the orbit's geometry reads its box)
  const zoomBy = (factor) => setZoom(z => Math.max(0.5, Math.min(2.5, z * factor)));"""

VIEW_SLOTS_OLD = r"""  // Index occupied slots so we can render either node or + at each position.
  const childrenBySlot = {};
  (focal.children || []).forEach(c => {
    if (typeof c.slot === "number" && c.slot >= 0 && c.slot < STEMMA_SLOTS) {
      childrenBySlot[c.slot] = c;
    }
  });
"""
VIEW_SLOTS_NEW = r"""  // Index occupied slots so we can render either node or + at each position.
  const childrenBySlot = {};
  (focal.children || []).forEach(c => {
    if (typeof c.slot === "number" && c.slot >= 0 && c.slot < STEMMA_SLOTS) {
      childrenBySlot[c.slot] = c;
    }
  });
  // the children in slot order, clockwise from 12 o'clock, for the keyboard's walk (r034)
  const ordered = Object.keys(childrenBySlot).map(Number).sort((a, b) => a - b).map(s => childrenBySlot[s]);

  // ── The orbit drag (v1.7 r034, the spec's section 7) ───────────────────────
  // A press on a child begins a drag that commits once on release: the child
  // follows the pointer's angle about the focal, snapped to the nearest
  // slot and drawn there as it goes; dropped on an empty slot it moves, on
  // a sibling's slot the two swap (stemmaMoveChild); Esc cancels; a press
  // that never moves past the slop drills in, as a click did. Locked, a
  // press drills in and nothing moves. The pointer's slot reads the scaled
  // square's box, so it holds at every zoom.
  const slotAt = (clientX, clientY) => {
    const el = innerRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const x = (clientX - r.left) / zoom - CENTER, y = (clientY - r.top) / zoom - CENTER;
    if (Math.hypot(x, y) < 1) return null;
    const turn = (Math.atan2(y, x) + Math.PI / 2) / (2 * Math.PI);  // slot 0 at 12 o'clock, clockwise
    return ((Math.round(turn * STEMMA_SLOTS) % STEMMA_SLOTS) + STEMMA_SLOTS) % STEMMA_SLOTS;
  };
  const dragRef = useRef(null);
  const beginOrbitDrag = (child) => (e) => {
    if (e.button !== 0 || isLocked) return;
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const g = { moved: false, cancelled: false, slot: child.slot };
    dragRef.current = g;
    const onMove = (ev) => {
      if (g.cancelled) return;
      if (!g.moved && Math.hypot(ev.clientX - startX, ev.clientY - startY) > 3) g.moved = true;
      if (!g.moved) return;
      const s = slotAt(ev.clientX, ev.clientY);
      if (s === null) return;
      g.slot = s;
      setDrag({ id: child.id, slot: s });
    };
    const finish = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKey, true);
      dragRef.current = null;
      setDrag(null);
    };
    const onUp = () => {
      const moved = g.moved, cancelled = g.cancelled, slot = g.slot;
      finish();
      if (cancelled) return;
      if (!moved) { onFocalChange(child.id); return; }
      if (slot !== child.slot) apply(stemmaMoveChild(stemma, child.id, slot));
    };
    const onKey = (ev) => { if (ev.key === "Escape") { ev.stopPropagation(); g.cancelled = true; finish(); } };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("keydown", onKey, true);
  };

  // ── The keys (v1.7 r034, the spec's section 7) ─────────────────────────────
  // Left and Right walk the focus around the children, clockwise and back,
  // wrapping, the first from 12 o'clock (or the last) when none is focused;
  // Enter drills into the focused child; Backspace goes to the parent; Home
  // to the root; Delete removes the focused child with the inspector's
  // confirmation; N opens the smart input on the first empty slot; Esc
  // closes the inspector or clears the focus; + - 0 zoom as the map
  // editor's keys do; Alt+Left and Alt+Right move the focused child to the
  // next free slot either way round. Nothing while typing, while the smart
  // input is open, or during a drag; locked, only the view's keys work.
  const latestRef = useRef(null);
  latestRef.current = {
    walk: (dir) => {
      if (!ordered.length) return;
      const i = ordered.findIndex(c => c.id === focusId);
      const next = i < 0 ? (dir > 0 ? 0 : ordered.length - 1) : (i + dir + ordered.length) % ordered.length;
      setFocusId(ordered[next].id);
    },
    drill: () => { if (focusId) onFocalChange(focusId); },
    up: () => { const path = findStemmaNodePath(stemma.root, focal.id); if (path && path.length > 1) onFocalChange(path[path.length - 2].id); },
    home: () => { if (focal.id !== stemma.root.id) onFocalChange(stemma.root.id); },
    remove: () => {
      const node = focusId ? (focal.children || []).find(c => c.id === focusId) : null;
      if (!node) return;
      const n = countStemmaDescendants(node);
      if (!confirm(n > 0 ? `Delete this node and its ${n} ${n === 1 ? "descendant" : "descendants"}?` : "Delete this node?")) return;
      apply(stemmaDeleteNode(stemma, node.id));
    },
    add: () => { for (let s = 0; s < STEMMA_SLOTS; s++) if (!childrenBySlot[s]) { setEditingSlot(s); return; } },
    rotate: (dir) => { if (focusId) apply(stemmaRotateChild(stemma, focusId, dir)); },
    escape: () => { if (inspectorNodeId) setInspectorNodeId(null); else if (focusId) setFocusId(null); },
  };
  useEffect(() => {
    const typing = (t) => { const tag = t && t.tagName ? t.tagName.toUpperCase() : ""; return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !!(t && t.isContentEditable); };
    const down = (e) => {
      if (typing(e.target) || editingSlot !== null || editingName || dragRef.current) return;
      if (e.ctrlKey || e.metaKey) return;  // undo and redo are the history's
      const k = latestRef.current;
      if (e.altKey) {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); if (!isLocked) k.rotate(e.key === "ArrowRight" ? 1 : -1); }
        return;
      }
      switch (e.key) {
        case "ArrowLeft": e.preventDefault(); k.walk(-1); return;
        case "ArrowRight": e.preventDefault(); k.walk(1); return;
        case "Enter": e.preventDefault(); k.drill(); return;
        case "Backspace": e.preventDefault(); k.up(); return;
        case "Home": e.preventDefault(); k.home(); return;
        case "Escape": k.escape(); return;
        case "Delete": e.preventDefault(); if (!isLocked) k.remove(); return;
        case "n": case "N": if (!isLocked) { e.preventDefault(); k.add(); } return;
        case "+": case "=": e.preventDefault(); zoomBy(1.15); return;
        case "-": case "_": e.preventDefault(); zoomBy(1 / 1.15); return;
        case "0": e.preventDefault(); setZoom(1); return;
        default: return;
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [editingSlot, editingName, isLocked]);
"""

VIEW_INNER_OLD = r"""          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: SIZE,
            height: SIZE,
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
          }}>"""
VIEW_INNER_NEW = r"""          <div ref={innerRef} style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: SIZE,
            height: SIZE,
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
          }}>"""

VIEW_CHILDREN_OLD = r"""          {/* 16 slots: occupied → child node, empty → + button (or smart input when activated) */}
          {Array.from({ length: STEMMA_SLOTS }).map((_, slot) => {
            const child = childrenBySlot[slot];
            const p = slotPos(slot);
            if (child) {
              return (
                <StemmaNode
                  key={`node-${child.id}`}
                  node={child}
                  entries={entries}
                  templates={templates}
                  cx={p.x}
                  cy={p.y}
                  radius={CHILD_R}
                  onClick={() => onFocalChange(child.id)}
                />
              );
            }"""
VIEW_CHILDREN_NEW = r"""          {/* 16 slots: occupied → child node, empty → + button (or smart input when activated).
              A child on the move (r034) is drawn at the slot nearest the pointer, after the rest; the
              sibling there, if any, is drawn in the moving child's own slot with a dashed ring, the
              swap as it would land. */}
          {Array.from({ length: STEMMA_SLOTS }).map((_, slot) => {
            const p = slotPos(slot);
            const dragged = drag ? childrenBySlot[Object.keys(childrenBySlot).find(s => childrenBySlot[s].id === drag.id)] : null;
            const occupant = drag && dragged && drag.slot !== dragged.slot ? childrenBySlot[drag.slot] : null;
            let child = childrenBySlot[slot];
            let swap = false;
            if (dragged && slot === dragged.slot) { child = occupant || null; swap = !!occupant; }
            else if (dragged && slot === drag.slot) child = null;  // the moving child is drawn here, below
            if (child) {
              return (
                <StemmaNode
                  key={`node-${child.id}`}
                  node={child}
                  entries={entries}
                  templates={templates}
                  cx={p.x}
                  cy={p.y}
                  radius={CHILD_R}
                  focused={focusId === child.id}
                  swap={swap}
                  onClick={isLocked ? () => onFocalChange(child.id) : undefined}
                  onPointerDown={isLocked ? undefined : beginOrbitDrag(child)}
                />
              );
            }
            if (dragged && (slot === dragged.slot || slot === drag.slot)) return null;"""

VIEW_PLUS_OLD = r"""            if (isLocked) return null;
            return (
              <StemmaPlusSlot
                key={`plus-${slot}`}
                cx={p.x}
                cy={p.y}
                radius={SLOT_R}
                onClick={() => setEditingSlot(slot)}
              />
            );
          })}"""
VIEW_PLUS_NEW = r"""            if (isLocked) return null;
            return (
              <StemmaPlusSlot
                key={`plus-${slot}`}
                cx={p.x}
                cy={p.y}
                radius={SLOT_R}
                onClick={() => setEditingSlot(slot)}
              />
            );
          })}
          {drag && (() => {
            const child = (focal.children || []).find(c => c.id === drag.id);
            if (!child) return null;
            const p = slotPos(drag.slot);
            return <StemmaNode key={`drag-${child.id}`} node={child} entries={entries} templates={templates} cx={p.x} cy={p.y} radius={CHILD_R} dragging />;
          })()}"""


def main():
    edit(MODULES / "21_stemma.jsx", [
        (TRANSFORMS_OLD, TRANSFORMS_NEW),
        (NODE_SIG_OLD, NODE_SIG_NEW),
        (NODE_OUTER_OLD, NODE_OUTER_NEW),
        (VIEW_STATE_OLD, VIEW_STATE_NEW),
        (VIEW_ZOOM_OLD, VIEW_ZOOM_NEW),
        (VIEW_SLOTS_OLD, VIEW_SLOTS_NEW),
        (VIEW_INNER_OLD, VIEW_INNER_NEW),
        (VIEW_CHILDREN_OLD, VIEW_CHILDREN_NEW),
        (VIEW_PLUS_OLD, VIEW_PLUS_NEW),
    ])
    print("r034 applied: Rota's reorder and keyboard")


if __name__ == "__main__":
    main()
