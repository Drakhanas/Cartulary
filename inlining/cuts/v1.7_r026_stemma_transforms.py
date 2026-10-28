"""v1.7 r026: Rota's edit path as pure transforms, with undo.

Stemma v2's first cut (docs/stemma-v2-spec.md, section 11, item 1; Drak's
plan approved 2026-10-27). The seven closures in App that wrote a stemma's
nodes and name into state.stemmas (addStemmaChild, updateStemmaNode,
deleteStemmaNode, convertStemmaNodeToLinked, convertStemmaNodeToFreeform,
relinkStemmaNode, renameStemma) become pure functions of the document in
21_stemma, under a section header of their own, each taking the document and
returning a new one, or the document it was given when the edit is refused;
the three tree walkers they used move with them. App keeps one closure,
replaceStemma, which puts the document the canvas hands it into the world.
The canvas commits every edit through useMapHistory, the map editor's history
hook, so Stemma has undo and redo (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z, and two
buttons in the top bar), each edit one step, a run of typing in the
inspector's label one step, the history gone when the canvas goes; App keys
the canvas by document and by lock so neither change carries a stack across.
Tabula's canvas will commit through the same path (spec, section 6).

Nothing else changes on screen. tools/stemma-parity drives one scripted edit
sequence through the last passed build and this one and compares what each
saved and showed after every step; its undo walk, run on this build alone,
checks that undo and redo retrace the sequence.

- 21_stemma: a section, "Stemma transforms", above StemmaNode: the three
  tree walkers and seven transforms; StemmaCanvasView takes onReplace in
  place of seven callbacks, wraps the document in useMapHistory, commits each
  edit through it, and shows Undo and Redo beside Export.
- 12_trunk: the three walkers and seven closures go; replaceStemma comes;
  the canvas's render site passes onReplace and a key.

Declared scope: 21_stemma, 12_trunk.
Declarations added (21_stemma): addChildToStemmaTree, updateNodeInStemmaTree,
removeNodeFromStemmaTree, stemmaAddChild, stemmaUpdateNode, stemmaDeleteNode,
stemmaConvertToLinked, stemmaConvertToFreeform, stemmaRelinkNode,
stemmaRename.

String-anchored edits; every anchor must occur exactly once. Run from
anywhere inside the repository:
    python3 inlining/cuts/v1.7_r026_stemma_transforms.py
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


def cut_span(path, start, end, replacement, must_hold):
    """Replace the text from the start anchor up to (not including) the end
    anchor. Both anchors must occur exactly once, in that order, and the span
    must contain each string in must_hold exactly once."""
    text = path.read_text(encoding="utf-8")
    for anchor in (start, end):
        n = text.count(anchor)
        assert n == 1, f"{path.name}: anchor occurs {n} times, not 1:\n{anchor[:200]}"
    a, b = text.index(start), text.index(end)
    assert a < b, f"{path.name}: span anchors out of order"
    span = text[a:b]
    for s in must_hold:
        n = span.count(s)
        assert n == 1, f"{path.name}: span holds {s!r} {n} times, not 1"
    path.write_text(text[:a] + replacement + text[b:], encoding="utf-8")
    return span


def header(title):
    line = f"// ─── {title} "
    return line + "─" * (82 - len(line))


# ─── 21_stemma: the transforms ────────────────────────────────────────────────

NODE_RENDER_COMMENT = """// Render a single stemma node — focal or child, freeform or linked. Resolves
// display data based on type: freeform pulls from the node itself, linked
// pulls live from the referenced entry's template (orphaned linked nodes use
// `_cachedName` and a muted/italic visual per design doc §6.5).
function StemmaNode({ node, entries, templates, cx, cy, radius, isFocal, onClick }) {"""

TRANSFORMS = header("Stemma transforms") + r"""
// Every edit to a stemma document is a pure function of the document (v1.7
// r026): it takes the document and returns a new one, or the very document it
// was given when the edit is refused, and reads no state, no React, and no
// page. The canvas commits what a transform returns through its history
// (useMapHistory, the map editor's hook) and App's replaceStemma, which is
// how Stemma has undo; Tabula's canvas commits through the same path. Until
// r026 these were closures in App writing state.stemmas directly. The three
// tree walkers were App's too and moved here with the edits that use them.

// Immutable tree update: returns a new root with `child` appended to the
// children array of the node whose id === parentId. Walks recursively;
// returns the original root unchanged if parentId isn't found.
const addChildToStemmaTree = (root, parentId, child) => {
  if (!root) return root;
  if (root.id === parentId) {
    return { ...root, children: [...(root.children || []), child] };
  }
  if (!Array.isArray(root.children) || root.children.length === 0) return root;
  return {
    ...root,
    children: root.children.map(c => addChildToStemmaTree(c, parentId, child)),
  };
};

// Immutable tree update: applies `updater(node)` to the node whose id matches.
// updater takes the node and returns the patched node. Tree is rebuilt.
const updateNodeInStemmaTree = (root, nodeId, updater) => {
  if (!root) return root;
  if (root.id === nodeId) return updater(root);
  if (!Array.isArray(root.children) || root.children.length === 0) return root;
  return {
    ...root,
    children: root.children.map(c => updateNodeInStemmaTree(c, nodeId, updater)),
  };
};

// Immutable tree mutation: removes the node whose id matches and returns a
// new tree. Returns null if the root itself matches (caller should refuse to
// delete the root). Otherwise prunes the matching subtree from its parent.
const removeNodeFromStemmaTree = (root, nodeId) => {
  if (!root) return root;
  if (root.id === nodeId) return null;  // root deletion handled by caller
  if (!Array.isArray(root.children) || root.children.length === 0) return root;
  return {
    ...root,
    children: root.children
      .filter(c => c.id !== nodeId)
      .map(c => removeNodeFromStemmaTree(c, nodeId)),
  };
};

// Add a child node (freeform or linked) under a node of the document, in a
// slot. Refused, returning the document, when the slot is out of range, the
// parent isn't in the tree, or the slot is taken. payload shape:
//   { type: "freeform", label, color?, icon? }
//   { type: "linked", entryId, cachedName }
const stemmaAddChild = (doc, parentNodeId, slot, payload) => {
  if (!doc || typeof slot !== "number" || slot < 0 || slot >= STEMMA_SLOTS) return doc;
  const parent = findStemmaNode(doc.root, parentNodeId);
  if (!parent) return doc;
  if ((parent.children || []).some(c => c.slot === slot)) return doc;
  let newChild;
  if (payload.type === "linked") {
    newChild = {
      id: `n-${genId()}`,
      slot,
      type: "linked",
      entryId: payload.entryId,
      _cachedName: payload.cachedName || "",
      children: [],
    };
  } else {
    newChild = {
      id: `n-${genId()}`,
      slot,
      type: "freeform",
      label: payload.label || "(empty)",
      color: payload.color || "#c8a96e",
      icon: payload.icon || "✦",
      children: [],
    };
  }
  return { ...doc, root: addChildToStemmaTree(doc.root, parentNodeId, newChild), updatedAt: isoNow() };
};

// Patch a node's display fields (label/color/icon for freeform; nothing
// editable on linked aside from convert/relink which have their own paths).
// patch is a partial of the node; only specified keys overwrite.
const stemmaUpdateNode = (doc, nodeId, patch) => {
  if (!doc) return doc;
  return { ...doc, root: updateNodeInStemmaTree(doc.root, nodeId, (n) => ({ ...n, ...patch })), updatedAt: isoNow() };
};

// Delete a node and all its descendants. Refuses the root, returning the
// document: the whole stemma is deleted from the index instead.
const stemmaDeleteNode = (doc, nodeId) => {
  if (!doc || !doc.root || doc.root.id === nodeId) return doc;
  return { ...doc, root: removeNodeFromStemmaTree(doc.root, nodeId), updatedAt: isoNow() };
};

// Convert a freeform node to a linked node, binding it to an existing entry.
// Drops freeform-only fields (label/color/icon) since linked nodes pull
// display from the entry's template; keeps children, slot, and id.
const stemmaConvertToLinked = (doc, nodeId, entryId, cachedName) => {
  if (!doc) return doc;
  return {
    ...doc,
    root: updateNodeInStemmaTree(doc.root, nodeId, (n) => {
      const { label, color, icon, ...rest } = n;
      return { ...rest, type: "linked", entryId, _cachedName: cachedName || "" };
    }),
    updatedAt: isoNow(),
  };
};

// Convert a linked node to freeform. Promotes _cachedName to be the new
// label (per design doc §6.1). Drops entryId / _cachedName.
const stemmaConvertToFreeform = (doc, nodeId) => {
  if (!doc) return doc;
  return {
    ...doc,
    root: updateNodeInStemmaTree(doc.root, nodeId, (n) => {
      const { entryId, _cachedName, ...rest } = n;
      return { ...rest, type: "freeform", label: _cachedName || "(empty)", color: "#c8a96e", icon: "✦" };
    }),
    updatedAt: isoNow(),
  };
};

// Re-link a linked node to a different entry. Stays type "linked"; just
// swaps entryId and _cachedName. If the node was orphaned, this fixes it.
const stemmaRelinkNode = (doc, nodeId, newEntryId, newCachedName) => {
  if (!doc) return doc;
  return {
    ...doc,
    root: updateNodeInStemmaTree(doc.root, nodeId, (n) => ({ ...n, entryId: newEntryId, _cachedName: newCachedName || "" })),
    updatedAt: isoNow(),
  };
};

// Rename the document. Refused, returning the document, for a blank name.
const stemmaRename = (doc, newName) => {
  if (!doc) return doc;
  const trimmed = (newName || "").trim();
  if (!trimmed) return doc;
  return { ...doc, name: trimmed, updatedAt: isoNow() };
};

""" + NODE_RENDER_COMMENT

# ─── 21_stemma: the canvas ────────────────────────────────────────────────────

CANVAS_SIG_OLD = "function StemmaCanvasView({ stemma, focalNodeId, entries, templates, isLocked, flash, onFocalChange, onBackToIndex, onAddChild, onUpdateNode, onDeleteNode, onConvertToLinked, onConvertToFreeform, onRelink, onRename, onOpenEntry, onExport }) {\n  const focal = findStemmaNode(stemma.root, focalNodeId) || stemma.root;\n"
CANVAS_SIG_NEW = """function StemmaCanvasView({ stemma, focalNodeId, entries, templates, isLocked, flash, onFocalChange, onBackToIndex, onReplace, onOpenEntry, onExport }) {
  const focal = findStemmaNode(stemma.root, focalNodeId) || stemma.root;
  // Every edit is a transform of the document (Stemma transforms, above),
  // committed through the history and App's onReplace (v1.7 r026): one step
  // each, a run of typing in the inspector's label one step, and nothing when
  // the world is locked or the transform refused (it returns the document it
  // was given). The history is this canvas's alone and goes when the canvas
  // does; App keys the canvas by document and by lock so neither change
  // carries a stack across. The hook binds Ctrl+Z, Ctrl+Y, and Ctrl+Shift+Z
  // outside inputs.
  const history = useMapHistory(stemma, onReplace);
  const apply = (next, opts) => {
    if (isLocked || !next || next === stemma) return;
    history.commit(next, opts);
  };
"""

RENAME_OLD = "              if (trimmed && trimmed !== stemma.name) onRename(trimmed);\n"
RENAME_NEW = "              if (trimmed && trimmed !== stemma.name) apply(stemmaRename(stemma, trimmed));\n"

ADD_FREEFORM_OLD = """                  onCommitFreeform={(label) => {
                    onAddChild(slot, { type: "freeform", label });
                    setEditingSlot(null);
                  }}
                  onCommitLinked={(entryId, cachedName) => {
                    onAddChild(slot, { type: "linked", entryId, cachedName });
                    setEditingSlot(null);
                  }}"""
ADD_FREEFORM_NEW = """                  onCommitFreeform={(label) => {
                    apply(stemmaAddChild(stemma, focal.id, slot, { type: "freeform", label }));
                    setEditingSlot(null);
                  }}
                  onCommitLinked={(entryId, cachedName) => {
                    apply(stemmaAddChild(stemma, focal.id, slot, { type: "linked", entryId, cachedName }));
                    setEditingSlot(null);
                  }}"""

EXPORT_OLD = """        {/* Right-aligned actions: export this stemma. (Delete lives on the
            index page row.) */}
        <button
          className="btn btn-ghost"
          onClick={onExport}
          style={{ padding: "4px 10px", fontSize: 13, marginLeft: "auto" }}
          title="Export this stemma as JSON"
        >Export</button>
      </div>
"""
EXPORT_NEW = """        {/* Right-aligned actions: undo and redo (v1.7 r026; hidden when the
            world is locked, since nothing can be edited then), and export.
            (Delete lives on the index page row.) */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 4, alignItems: "center" }}>
          {!isLocked && (
            <button
              className="btn btn-ghost"
              onClick={history.undo}
              disabled={!history.canUndo}
              style={{ padding: "4px 10px", fontSize: 13, opacity: history.canUndo ? 1 : 0.45 }}
              title="Undo (Ctrl+Z)"
            >Undo</button>
          )}
          {!isLocked && (
            <button
              className="btn btn-ghost"
              onClick={history.redo}
              disabled={!history.canRedo}
              style={{ padding: "4px 10px", fontSize: 13, opacity: history.canRedo ? 1 : 0.45 }}
              title="Redo (Ctrl+Y)"
            >Redo</button>
          )}
          <button
            className="btn btn-ghost"
            onClick={onExport}
            style={{ padding: "4px 10px", fontSize: 13 }}
            title="Export this stemma as JSON"
          >Export</button>
        </div>
      </div>
"""

INSPECTOR_OLD = """          onUpdateNode={(patch) => onUpdateNode(inspectedNode.id, patch)}
          onDeleteNode={() => onDeleteNode(inspectedNode.id)}
          onConvertToLinked={(entryId, name) => onConvertToLinked(inspectedNode.id, entryId, name)}
          onConvertToFreeform={() => onConvertToFreeform(inspectedNode.id)}
          onRelink={(entryId, name) => onRelink(inspectedNode.id, entryId, name)}
"""
INSPECTOR_NEW = """          onUpdateNode={(patch) => apply(
            stemmaUpdateNode(stemma, inspectedNode.id, patch),
            patch && patch.label !== undefined ? { coalesce: `label:${inspectedNode.id}` } : undefined
          )}
          onDeleteNode={() => apply(stemmaDeleteNode(stemma, inspectedNode.id))}
          onConvertToLinked={(entryId, name) => apply(stemmaConvertToLinked(stemma, inspectedNode.id, entryId, name))}
          onConvertToFreeform={() => apply(stemmaConvertToFreeform(stemma, inspectedNode.id))}
          onRelink={(entryId, name) => apply(stemmaRelinkNode(stemma, inspectedNode.id, entryId, name))}
"""

# ─── 12_trunk: App ────────────────────────────────────────────────────────────

TRUNK_SPAN_START = """  // Immutable tree update: returns a new root with `child` appended to the
  // children array of the node whose id === parentId. Walks recursively;
  // returns the original root unchanged if parentId isn't found.
  const addChildToStemmaTree = (root, parentId, child) => {
"""
TRUNK_SPAN_END = """  // Delete a stemma entirely. Used by the index-page row's delete action.
  const deleteStemma = (stemmaId) => {
"""
TRUNK_REPLACEMENT = """  // Put the document the canvas hands back into the world (v1.7 r026). The
  // edits themselves are pure transforms in 21_stemma (Stemma transforms),
  // committed through the canvas's history, which is how Stemma has undo;
  // this is the one write. Refuses when the world is locked, as the canvas
  // does before it.
  const replaceStemma = (stemmaId, next) => {
    if (isLocked || !next) return;
    updateState(s => ({ ...s, stemmas: (s.stemmas || []).map(st => (st.id === stemmaId ? next : st)) }));
  };

"""
TRUNK_SPAN_HOLDS = [
    "const addChildToStemmaTree = ", "const updateNodeInStemmaTree = ", "const removeNodeFromStemmaTree = ",
    "const addStemmaChild = ", "const updateStemmaNode = ", "const deleteStemmaNode = ",
    "const convertStemmaNodeToLinked = ", "const convertStemmaNodeToFreeform = ",
    "const relinkStemmaNode = ", "const renameStemma = ",
]

RENDER_OLD = """              <StemmaCanvasView
                stemma={stem}
                focalNodeId={focalNodeId}
                entries={stemmaEntriesWithBodies}
                templates={state.templates}
                isLocked={isLocked}
                flash={flash}
                onFocalChange={setFocalNodeId}
                onBackToIndex={closeStemmaToIndex}
                onAddChild={(slot, payload) => addStemmaChild(stem.id, focalNodeId, slot, payload)}
                onUpdateNode={(nodeId, patch) => updateStemmaNode(stem.id, nodeId, patch)}
                onDeleteNode={(nodeId) => deleteStemmaNode(stem.id, nodeId)}
                onConvertToLinked={(nodeId, entryId, name) => convertStemmaNodeToLinked(stem.id, nodeId, entryId, name)}
                onConvertToFreeform={(nodeId) => convertStemmaNodeToFreeform(stem.id, nodeId)}
                onRelink={(nodeId, entryId, name) => relinkStemmaNode(stem.id, nodeId, entryId, name)}
                onRename={(newName) => renameStemma(stem.id, newName)}
                onOpenEntry={openEntryFromAnywhere}
                onExport={() => exportStemmaJson(stem)}
              />
"""
RENDER_NEW = """              <StemmaCanvasView
                key={`${stem.id}:${isLocked ? "locked" : "open"}`}
                stemma={stem}
                focalNodeId={focalNodeId}
                entries={stemmaEntriesWithBodies}
                templates={state.templates}
                isLocked={isLocked}
                flash={flash}
                onFocalChange={setFocalNodeId}
                onBackToIndex={closeStemmaToIndex}
                onReplace={(next) => replaceStemma(stem.id, next)}
                onOpenEntry={openEntryFromAnywhere}
                onExport={() => exportStemmaJson(stem)}
              />
"""


def main():
    stemma = MODULES / "21_stemma.jsx"
    trunk = MODULES / "12_trunk.jsx"
    edit(stemma, [
        (NODE_RENDER_COMMENT, TRANSFORMS),
        (CANVAS_SIG_OLD, CANVAS_SIG_NEW),
        (RENAME_OLD, RENAME_NEW),
        (ADD_FREEFORM_OLD, ADD_FREEFORM_NEW),
        (EXPORT_OLD, EXPORT_NEW),
        (INSPECTOR_OLD, INSPECTOR_NEW),
    ])
    span = cut_span(trunk, TRUNK_SPAN_START, TRUNK_SPAN_END, TRUNK_REPLACEMENT, TRUNK_SPAN_HOLDS)
    edit(trunk, [(RENDER_OLD, RENDER_NEW)])
    text = trunk.read_text(encoding="utf-8")
    for name in ("addStemmaChild", "updateStemmaNode", "deleteStemmaNode", "convertStemmaNodeToLinked",
                 "convertStemmaNodeToFreeform", "relinkStemmaNode", "renameStemma",
                 "addChildToStemmaTree", "updateNodeInStemmaTree", "removeNodeFromStemmaTree"):
        assert name not in text, f"12_trunk still names {name}"
    canvas = stemma.read_text(encoding="utf-8").split("function StemmaCanvasView")[1].split("// ─── Stemma index view")[0]
    for name in ("onAddChild", "onRename"):
        assert name not in canvas, f"the canvas still calls {name}"
    n = canvas.count("apply(")
    assert n == 8, f"the canvas commits through apply {n} times, not 8"
    print(f"r026 applied: 21_stemma gains the transforms and the history; 12_trunk loses {len(span.splitlines())} lines of closures and gains replaceStemma")


if __name__ == "__main__":
    main()
