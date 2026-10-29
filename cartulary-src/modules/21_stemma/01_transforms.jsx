
// ─── Stemma transforms ─────────────────────────────────────────────────────────
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