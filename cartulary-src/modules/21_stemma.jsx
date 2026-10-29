
// ─── Stemma helpers and canvas ──────────────────────────────────────────────
//
// A stemma is a tree of nodes (freeform or linked) stored in stem.root.children
// recursively. Each child carries its own `slot` (0–15) telling the canvas where
// to draw it on the focal node's orbit. This whole feature is laid out in the
// design doc (`stemma-design.md`).

const STEMMA_SLOTS = 16;

// Slot index → angle in radians, with slot 0 at 12 o'clock and the rest going
// clockwise. The -π/2 shift puts slot 0 at the top instead of at 3 o'clock.
const stemmaSlotAngle = (slot) => (slot / STEMMA_SLOTS) * 2 * Math.PI - Math.PI / 2;

// Recursively find a node by id within a stemma tree. Returns null if not found.
const findStemmaNode = (root, id) => {
  if (!root) return null;
  if (root.id === id) return root;
  for (const c of (root.children || [])) {
    const r = findStemmaNode(c, id);
    if (r) return r;
  }
  return null;
};

// Recursively find the path (root → ... → node) for a given node id. Returns
// an array of nodes ending with the target, or null if the id isn't in the
// tree. Used by the breadcrumb in StemmaCanvasView to render the ancestor
// chain so the user can jump to any level.
const findStemmaNodePath = (root, id, prefix = []) => {
  if (!root) return null;
  const path = [...prefix, root];
  if (root.id === id) return path;
  for (const c of (root.children || [])) {
    const r = findStemmaNodePath(c, id, path);
    if (r) return r;
  }
  return null;
};

// Regenerate the stemma id and every node id in the tree. Used at import
// time to guarantee no collisions with anything already in the destination
// world (per design doc §5.2 — "Regenerates the stemma `id` and **all node
// `id`s** to avoid collision with anything existing").
const regenerateStemmaIds = (stemma) => {
  const walkNode = (node) => ({
    ...node,
    id: `n-${genId()}`,
    children: Array.isArray(node.children) ? node.children.map(walkNode) : [],
  });
  // v1.7 r029: a tabula's items, columns' and boards' included, each with a
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
  }
  return {
    ...stemma,
    id: `stem-${genId()}`,
    root: walkNode(stemma.root),
  };
};

// Validate and normalize an imported stemma. Mirrors the shape of
// normalizeImportedTemplate: defensive against hand-edited JSON, returns
// `{ ok: true, stemma }` or `{ ok: false, error }`. Mutates a deep clone of
// the input — does not touch the caller's object.
//
// Rules:
//   - name must be a non-empty string
//   - root must exist and be a valid node
//   - every node's type must be "freeform" or "linked"
//   - non-root nodes must have a numeric slot in [0, STEMMA_SLOTS)
//   - duplicate slots within a parent's children are dropped (keep first)
//   - linked nodes must have a non-empty entryId
//   - missing optional fields are defaulted (description "", tags [], etc.)
//   - type-irrelevant fields are stripped (linked node carrying a label, etc.)
const normalizeImportedStemma = (raw) => {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Empty or invalid stemma payload." };
  }
  const cloned = JSON.parse(JSON.stringify(raw));

  if (!cloned.name || typeof cloned.name !== "string" || !cloned.name.trim()) {
    return { ok: false, error: "Imported stemma is missing a name." };
  }
  cloned.name = cloned.name.trim();
  if (!cloned.root || typeof cloned.root !== "object") {
    return { ok: false, error: "Imported stemma is missing a root node." };
  }

  if (typeof cloned.description !== "string") cloned.description = "";
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

  // Validate the tree recursively. Returns null on success, error string on
  // first detected problem. Also normalizes each node in place.
  const validateNode = (node, isRoot, path) => {
    if (!node || typeof node !== "object") {
      return `Invalid node at ${path} (not an object).`;
    }
    if (node.type !== "freeform" && node.type !== "linked") {
      return `Node at ${path} has invalid type "${node.type}" (expected "freeform" or "linked").`;
    }
    // Slot: root's slot is meaningless but normalize to 0; children must be 0–15.
    if (isRoot) {
      node.slot = 0;
    } else {
      if (typeof node.slot !== "number" || node.slot < 0 || node.slot >= STEMMA_SLOTS || !Number.isInteger(node.slot)) {
        return `Node at ${path} has invalid slot ${node.slot} (must be integer 0–${STEMMA_SLOTS - 1}).`;
      }
    }
    // Type-specific normalization
    if (node.type === "freeform") {
      if (typeof node.label !== "string") node.label = "(empty)";
      if (typeof node.color !== "string") node.color = "#c8a96e";
      if (typeof node.icon !== "string") node.icon = "✦";
      delete node.entryId;
      delete node._cachedName;
    } else {
      if (typeof node.entryId !== "string" || !node.entryId.trim()) {
        return `Linked node at ${path} is missing entryId.`;
      }
      if (typeof node._cachedName !== "string") node._cachedName = "";
      delete node.label;
      delete node.color;
      delete node.icon;
    }
    // Children — array, dedupe slots
    if (!Array.isArray(node.children)) node.children = [];
    const seenSlots = new Set();
    node.children = node.children.filter(c => {
      if (!c || typeof c !== "object") return false;
      if (typeof c.slot !== "number") return false;
      if (seenSlots.has(c.slot)) return false;  // drop duplicate-slot children silently
      seenSlots.add(c.slot);
      return true;
    });
    // Recurse
    for (let i = 0; i < node.children.length; i++) {
      const err = validateNode(node.children[i], false, `${path}.children[${i}]`);
      if (err) return err;
    }
    return null;
  };

  const err = validateNode(cloned.root, true, "root");
  if (err) return { ok: false, error: err };

  return { ok: true, stemma: cloned };
};

// Collect linked-node entryIds in a stemma that don't exist in the target
// entries list. Returns an array of { entryId, cachedName } for each
// orphan-to-be. Used at import time to warn the user how many linked nodes
// will land orphaned in the destination world.
const collectStemmaMissingRefs = (stemma, entries) => {
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

// Count every node in a stemma tree (root included). Used by the index page.
const countStemmaNodes = (stemma) => {
  if (!stemma?.root) return 0;
  const walk = (n) => 1 + (n.children || []).reduce((acc, c) => acc + walk(c), 0);
  return walk(stemma.root);
};

// Count descendants of a node (excluding the node itself). Used by the
// inspector's delete-confirmation prompt.
const countStemmaDescendants = (node) => {
  if (!node || !Array.isArray(node.children)) return 0;
  return node.children.reduce((acc, c) => acc + 1 + countStemmaDescendants(c), 0);
};

// The ids every linked node of a document points at, each once (v1.7 r027).
// The registry's stemma source reads it for Concordance's edges, and the
// delete message for the nodes elsewhere that would orphan. Walks the radial
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

// A registered source's label for a picker's hit or the inspector: the
// source's own label where it has one (a Fabula kind's), else its name.
const stemmaSourceLabel = (sourceId) => {
  const src = getRegisteredSourceById(sourceId);
  return src ? (src.label || src.name) : "";
};

// Whether a click can open what a linked node points at: an entry always;
// a registered record where the app has a page for it (a body, a map, a
// stemma, a Fabula record with a page), the rule resolveRefTarget applies to
// a reference chip. A Glossopoeia record resolves but opens nowhere yet.
const stemmaTargetOpens = (record) => {
  if (!record) return false;
  if (!record.synthetic) return true;
  const t = record.templateId;
  return t === SYNTH_TPL_MAP || t === BODY_REF_SENTINEL || t === SYNTH_TPL_STEMMA || fabulaRecordOpens(t);
};

// The index's delete confirmation (v1.7 r027), the map's pattern: it counts
// the references to the stemma from entries and from Fabula's records, which
// the delete clears, and the linked nodes in other stemmas, which orphan.
const stemmaDeleteMessage = (stemma, state) => {
  const entries = countInboundEntryRefs(state.entries, state.templates, stemma.id);
  const fab = fabulaInboundCounts(state, stemma.id).reduce((n, [, c]) => n + c, 0);
  const nodes = (state.stemmas || []).reduce((n, s) => (s && s.id !== stemma.id && stemmaLinkedTargets(s).has(stemma.id) ? n + 1 : n), 0);
  const parts = [];
  if (entries > 0) parts.push(`${entries} ${entries === 1 ? "entry" : "entries"}`);
  if (fab > 0) parts.push(`${fab} Fabula ${fab === 1 ? "record" : "records"}`);
  let refs = "";
  if (parts.length > 0) refs += ` Referenced by ${parts.join(" and ")}. Deleting this stemma removes ${entries + fab === 1 ? "that reference" : "those references"}; ${entries + fab === 1 ? "the record stays" : "the records stay"} intact.`;
  if (nodes > 0) refs += ` ${nodes} other ${nodes === 1 ? "stemma links" : "stemmas link"} to it; ${nodes === 1 ? "its node becomes an orphan" : "their nodes become orphans"}.`;
  return `Delete stemma "${stemma.name}"?${refs} This cannot be undone.`;
};

// Render a single stemma node — focal or child, freeform or linked. Resolves
// display data based on type: freeform pulls from the node itself, linked
// pulls live from the referenced entry's template (orphaned linked nodes use
// `_cachedName` and a muted/italic visual per design doc §6.5).
// v1.7 r034: `focused` draws the keyboard's ring, `dragging` the child on
// the move along the orbit, `swap` the sibling it would trade places with;
// `onPointerDown` is the drag's start (the view tells a press from a drag).
function StemmaNode({ node, entries, templates, cx, cy, radius, isFocal, focused, dragging, swap, onClick, onPointerDown }) {
  let displayLabel, displayColor, displayIcon;
  let isOrphan = false;

  if (node.type === "linked") {
    const entry = (entries || []).find(e => e.id === node.entryId);
    if (entry) {
      const tpl = (templates || []).find(t => t.id === entry.templateId);
      displayLabel = entry.name || "(unnamed)";
      // v1.7 r027: a registered record carries its own color (a body's by its
      // kind); its source's synthetic template gives the icon and the rest.
      displayColor = (entry.synthetic && entry.color) || tpl?.color || "#888";
      displayIcon = tpl?.icon || "◈";
    } else {
      isOrphan = true;
      displayLabel = node._cachedName || "(unlinked)";
      displayColor = "#666";
      displayIcon = "⚯";  // broken-link-ish glyph; revisit at orphan polish pass
    }
  } else {
    // Freeform — defaults if user hasn't picked yet
    displayLabel = node.label || "(empty)";
    displayColor = node.color || "#c8a96e";
    displayIcon = node.icon || "✦";
  }

  return (
    <div
      style={{
        position: "absolute",
        left: cx - radius,
        top: cy - radius,
        width: radius * 2,
        height: radius * 2,
        cursor: dragging ? "grabbing" : "pointer",
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
      >
        {displayIcon}
        {/* Chain badge for linked nodes (per §6.5). Hidden when orphaned. */}
        {node.type === "linked" && !isOrphan && (
          <div style={{
            position: "absolute",
            bottom: -3,
            right: -3,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "var(--bg)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 9,
            color: "var(--text-dim)",
          }}>⛓</div>
        )}
      </div>
      <div
        style={{
          position: "absolute",
          top: radius * 2 + 6,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 12,
          color: "var(--text)",
          fontStyle: isOrphan ? "italic" : "normal",
          whiteSpace: "nowrap",
          maxWidth: 160,
          overflow: "hidden",
          textOverflow: "ellipsis",
          background: "var(--bg)",
          padding: "1px 5px",
          borderRadius: 3,
          textAlign: "center",
        }}
      >
        {displayLabel}
      </div>
    </div>
  );
}

// Empty + slot. Always visible, clearly present (per §6.5 — "clearly present and
// easily seen, not subtle, not loud"). Stub onClick — step 4 wires the smart
// input typeahead.
function StemmaPlusSlot({ cx, cy, radius, onClick }) {
  return (
    <button
      onClick={onClick}
      title="Add child node"
      style={{
        position: "absolute",
        left: cx - radius,
        top: cy - radius,
        width: radius * 2,
        height: radius * 2,
        borderRadius: "50%",
        border: "1.5px dashed var(--border)",
        background: "var(--surf)",
        color: "var(--text-dim)",
        fontSize: radius * 1.1,
        fontWeight: 300,
        lineHeight: 1,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        opacity: 0.75,
        transition: "all 0.12s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = "1";
        e.currentTarget.style.borderColor = "var(--accent)";
        e.currentTarget.style.color = "var(--accent)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = "0.75";
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.color = "var(--text-dim)";
      }}
    >+</button>
  );
}

// Smart input that replaces a `+` slot when activated. Single text field with
// typeahead suggestions: typing matches existing entry names; selecting one
// creates a linked node, ignoring suggestions and pressing Enter creates a
// freeform node with the typed label. Esc cancels. Default activeIdx is -1 so
// the user must explicitly arrow into the suggestion list to pick — Enter
// without arrowing always means "create freeform with what I typed."
function StemmaSmartInput({ cx, cy, entries, onCommitFreeform, onCommitLinked, onCancel, freeform }) {
  // v1.7 r029: what Enter alone makes, in the caller's words; the rota's
  // freeform node by default, the tabula's note.
  const freeformName = (freeform && freeform.long) || "a freeform node";
  const freeformShort = (freeform && freeform.short) || "freeform";
  const [text, setText] = useState("");
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef(null);
  const cancelTimerRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    return () => { if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current); };
  }, []);

  const query = text.trim().toLowerCase();
  const suggestions = query.length === 0 ? [] : (
    (entries || [])
      .filter(e => e.name && e.name.toLowerCase().includes(query))
      .sort((a, b) => {
        // Prefix matches first, then alphabetical.
        const aPrefix = a.name.toLowerCase().startsWith(query);
        const bPrefix = b.name.toLowerCase().startsWith(query);
        if (aPrefix && !bPrefix) return -1;
        if (!aPrefix && bPrefix) return 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 8)
  );

  // Reset highlight when text changes — stale highlight after typing is
  // confusing. -1 means "no suggestion selected; Enter creates freeform."
  useEffect(() => { setActiveIdx(-1); }, [text]);

  const commit = () => {
    if (activeIdx >= 0 && activeIdx < suggestions.length) {
      const e = suggestions[activeIdx];
      onCommitLinked(e.id, e.name);
    } else if (text.trim().length > 0) {
      onCommitFreeform(text.trim());
    } else {
      onCancel();
    }
  };

  const handleKeyDown = (ev) => {
    if (ev.key === "Escape") {
      ev.preventDefault();
      onCancel();
    } else if (ev.key === "Enter") {
      ev.preventDefault();
      commit();
    } else if (ev.key === "ArrowDown") {
      ev.preventDefault();
      setActiveIdx(i => Math.min(suggestions.length - 1, i + 1));
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault();
      setActiveIdx(i => Math.max(-1, i - 1));
    }
  };

  const W = 200;
  const H = 32;

  return (
    <div
      style={{
        position: "absolute",
        left: cx - W / 2,
        top: cy - H / 2,
        width: W,
        zIndex: 10,
      }}
      onMouseDown={ev => ev.stopPropagation()}
    >
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          // Delay so a click on a suggestion (which fires onMouseDown before
          // blur) gets to run its commit before we cancel.
          cancelTimerRef.current = setTimeout(() => onCancel(), 150);
        }}
        onFocus={() => {
          // If focus comes back (e.g. user clicked back into the input after
          // clicking a suggestion that didn't fire), kill the pending cancel.
          if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current);
        }}
        placeholder="Type a name…"
        style={{
          width: "100%",
          padding: "6px 10px",
          fontSize: 13,
          background: "var(--surf2)",
          color: "var(--text)",
          border: "2px solid var(--accent)",
          borderRadius: 4,
          outline: "none",
          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        }}
      />

      {suggestions.length > 0 && (
        <div style={{
          position: "absolute",
          top: H + 4,
          left: 0,
          width: "100%",
          background: "var(--surf2)",
          border: "1px solid var(--border)",
          borderRadius: 4,
          maxHeight: 220,
          overflow: "auto",
          boxShadow: "0 4px 12px rgba(0,0,0,0.45)",
        }}>
          {suggestions.map((e, i) => (
            <div
              key={e.id}
              onMouseDown={ev => {
                ev.preventDefault();
                if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current);
                onCommitLinked(e.id, e.name);
              }}
              onMouseEnter={() => setActiveIdx(i)}
              style={{
                padding: "6px 10px",
                background: i === activeIdx ? "var(--surf3)" : "transparent",
                color: "var(--text)",
                fontSize: 13,
                cursor: "pointer",
                borderBottom: i < suggestions.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <span style={{ marginRight: 8, opacity: 0.7 }}>⛓</span>
              {e.name}
              {e.synthetic && <span style={{ color: "var(--text-dim)" }}>{` (${stemmaSourceLabel(e.templateId)})`}</span>}
            </div>
          ))}
          <div style={{
            padding: "5px 10px",
            background: "var(--bg)",
            fontSize: 11,
            color: "var(--text-dim)",
            fontStyle: "italic",
            borderTop: "1px solid var(--border)",
          }}>
            ↑↓ pick · Enter alone = {freeformShort} · Esc cancels
          </div>
        </div>
      )}

      {text.trim().length > 0 && suggestions.length === 0 && (
        <div style={{
          position: "absolute",
          top: H + 4,
          left: 0,
          padding: "6px 10px",
          background: "var(--surf2)",
          border: "1px solid var(--border)",
          borderRadius: 4,
          fontSize: 12,
          color: "var(--text-dim)",
          fontStyle: "italic",
          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        }}>
          Press Enter to add "{text.trim()}" as {freeformName}
        </div>
      )}
    </div>
  );
}

// Inline entry picker used inside the inspector for "Convert to linked" and
// "Re-link" flows. Same matching logic as StemmaSmartInput but rendered inline
// (no absolute positioning) since the inspector itself is a fixed-width panel.
function StemmaInspectorEntryPicker({ entries, onPick, onCancel, label }) {
  const [text, setText] = useState("");
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const query = text.trim().toLowerCase();
  const suggestions = query.length === 0 ? [] : (
    (entries || [])
      .filter(e => e.name && e.name.toLowerCase().includes(query))
      .sort((a, b) => {
        const aPrefix = a.name.toLowerCase().startsWith(query);
        const bPrefix = b.name.toLowerCase().startsWith(query);
        if (aPrefix && !bPrefix) return -1;
        if (!aPrefix && bPrefix) return 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 8)
  );

  useEffect(() => { setActiveIdx(-1); }, [text]);

  const handleKeyDown = (ev) => {
    if (ev.key === "Escape") {
      ev.preventDefault();
      onCancel();
    } else if (ev.key === "Enter") {
      ev.preventDefault();
      if (activeIdx >= 0 && activeIdx < suggestions.length) {
        const e = suggestions[activeIdx];
        onPick(e.id, e.name);
      }
      // Enter without a highlighted suggestion is a no-op here — convert/relink
      // requires picking an actual entry, unlike the canvas + smart input.
    } else if (ev.key === "ArrowDown") {
      ev.preventDefault();
      setActiveIdx(i => Math.min(suggestions.length - 1, i + 1));
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault();
      setActiveIdx(i => Math.max(-1, i - 1));
    }
  };

  return (
    <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border)", background: "var(--surf2)" }}>
      <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 6 }}>{label || "Pick an entry"}</div>
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a name…"
        style={{
          width: "100%",
          padding: "6px 10px",
          fontSize: 13,
          background: "var(--surf2)",
          color: "var(--text)",
          border: "1px solid var(--accent)",
          borderRadius: 4,
          outline: "none",
        }}
      />
      {suggestions.length > 0 && (
        <div style={{
          marginTop: 6,
          background: "var(--surf2)",
          border: "1px solid var(--border)",
          borderRadius: 4,
          maxHeight: 220,
          overflow: "auto",
        }}>
          {suggestions.map((e, i) => (
            <div
              key={e.id}
              onMouseDown={ev => { ev.preventDefault(); onPick(e.id, e.name); }}
              onMouseEnter={() => setActiveIdx(i)}
              style={{
                padding: "6px 10px",
                background: i === activeIdx ? "var(--surf3)" : "transparent",
                color: "var(--text)",
                fontSize: 13,
                cursor: "pointer",
                borderBottom: i < suggestions.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <span style={{ marginRight: 8, opacity: 0.7 }}>⛓</span>
              {e.name}
              {e.synthetic && <span style={{ color: "var(--text-dim)" }}>{` (${stemmaSourceLabel(e.templateId)})`}</span>}
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
        <button className="btn btn-ghost" style={{ fontSize: 12, padding: "4px 10px" }} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// The right-side inspector panel. Per design doc §4.5 / §6.1 — pushes the
// canvas left, persistent until explicitly dismissed, controls vary by node
// type. Click focal opens it on the focal; click X closes it. Drilling into a
// child closes it (focal change → reset).
function StemmaInspector({ node, isRoot, entries, templates, isLocked, flash, onClose, onUpdateNode, onDeleteNode, onConvertToLinked, onConvertToFreeform, onRelink, onOpenEntry }) {
  // pickerMode: null | "convert-to-linked" | "relink"
  const [pickerMode, setPickerMode] = useState(null);

  // Reset picker when the inspected node changes (e.g. user closed and
  // reopened on a different node).
  useEffect(() => { setPickerMode(null); }, [node?.id]);

  if (!node) return null;

  const descendantCount = countStemmaDescendants(node);

  const handleDelete = () => {
    if (isRoot) {
      flash("Can't delete the root node — delete the whole stemma from the Stemmas index page instead.", "warn");
      return;
    }
    if (descendantCount > 0) {
      const word = descendantCount === 1 ? "descendant" : "descendants";
      if (!confirm(`Delete this node and its ${descendantCount} ${word}?`)) return;
    } else {
      if (!confirm("Delete this node?")) return;
    }
    onDeleteNode();
    onClose();
  };

  // Resolve entry preview for linked nodes.
  let linkedEntry = null, linkedTemplate = null, isOrphan = false;
  if (node.type === "linked") {
    linkedEntry = (entries || []).find(e => e.id === node.entryId) || null;
    if (linkedEntry) {
      linkedTemplate = (templates || []).find(t => t.id === linkedEntry.templateId) || null;
    } else {
      isOrphan = true;
    }
  }

  return (
    <div style={{
      width: 320,
      flexShrink: 0,
      borderLeft: "1px solid var(--border)",
      background: "var(--surf)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 14px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "var(--bg)",
      }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>
          Inspector
          <span style={{ marginLeft: 8, fontSize: 11, color: "var(--text-dim)", fontWeight: 400 }}>
            {node.type === "linked" ? "Linked" : "Freeform"}{isRoot && " · root"}
          </span>
        </div>
        <button
          className="btn btn-ghost"
          onClick={onClose}
          style={{ fontSize: 16, padding: "0 8px", lineHeight: 1 }}
          title="Close inspector"
        >×</button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {node.type === "freeform" ? (
          <FreeformInspectorBody
            node={node}
            isLocked={isLocked}
            onUpdateNode={onUpdateNode}
          />
        ) : (
          <LinkedInspectorBody
            node={node}
            entry={linkedEntry}
            template={linkedTemplate}
            isOrphan={isOrphan}
            onOpenEntry={onOpenEntry}
          />
        )}

        {/* Picker mode renders inline below the type-specific body */}
        {pickerMode === "convert-to-linked" && (
          <StemmaInspectorEntryPicker
            entries={entries}
            label="Bind this freeform node to an existing entry"
            onPick={(entryId, name) => {
              onConvertToLinked(entryId, name);
              setPickerMode(null);
            }}
            onCancel={() => setPickerMode(null)}
          />
        )}
        {pickerMode === "relink" && (
          <StemmaInspectorEntryPicker
            entries={entries}
            label="Re-link to a different entry"
            onPick={(entryId, name) => {
              onRelink(entryId, name);
              setPickerMode(null);
            }}
            onCancel={() => setPickerMode(null)}
          />
        )}
      </div>

      {/* Action footer */}
      {!isLocked && pickerMode === null && (
        <div style={{
          padding: "10px 14px",
          borderTop: "1px solid var(--border)",
          background: "var(--bg)",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}>
          {node.type === "freeform" ? (
            <button
              className="btn btn-ghost"
              style={{ fontSize: 12 }}
              onClick={() => setPickerMode("convert-to-linked")}
            >Convert to linked entry</button>
          ) : (
            <>
              <button
                className="btn btn-ghost"
                style={{ fontSize: 12 }}
                onClick={() => setPickerMode("relink")}
              >Re-link to different entry</button>
              <button
                className="btn btn-ghost"
                style={{ fontSize: 12 }}
                onClick={() => onConvertToFreeform()}
                title={isOrphan
                  ? `Convert to a freeform node labeled "${node._cachedName || "(empty)"}"`
                  : "Strip the entry binding; keep the cached name as a freeform label"}
              >Convert to freeform</button>
            </>
          )}
          {!isRoot && (
            <button
              className="btn"
              style={{ fontSize: 12, color: "var(--danger)", borderColor: "var(--danger)" }}
              onClick={handleDelete}
            >Delete node</button>
          )}
          {isRoot && (
            <div style={{ fontSize: 11, color: "var(--text-dim)", fontStyle: "italic", padding: "4px 0" }}>
              Root node can't be deleted individually. Delete the whole stemma from the Stemmas index page instead.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Freeform-node inspector body: editable label, color picker, icon picker.
function FreeformInspectorBody({ node, isLocked, onUpdateNode }) {
  return (
    <div style={{ padding: "14px" }}>
      <div className="form-field">
        <label className="form-label">Label</label>
        <input
          className="input"
          type="text"
          value={node.label || ""}
          onChange={e => onUpdateNode({ label: e.target.value })}
          disabled={isLocked}
          placeholder="(no label)"
        />
      </div>

      <div className="form-field">
        <label className="form-label">Icon</label>
        <div className="icon-grid">
          {ICONS.map(icon => (
            <div
              key={icon}
              className={`icon-opt ${node.icon === icon ? "sel" : ""}`}
              onClick={() => !isLocked && onUpdateNode({ icon })}
              style={isLocked ? { opacity: 0.5, cursor: "default" } : {}}
            >{icon}</div>
          ))}
        </div>
      </div>

      <div className="form-field">
        <label className="form-label">Color</label>
        <div className="color-row">
          {COLORS.map(color => (
            <div
              key={color}
              className={`color-opt ${node.color === color ? "sel" : ""}`}
              style={{ background: color, ...(isLocked ? { opacity: 0.5, cursor: "default" } : {}) }}
              onClick={() => !isLocked && onUpdateNode({ color })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Linked-node inspector body: entry preview (live name and template), with
// an open-entry jump button. Orphan state shows the cached name + a hint.
function LinkedInspectorBody({ node, entry, template, isOrphan, onOpenEntry }) {
  return (
    <div style={{ padding: "14px" }}>
      {isOrphan ? (
        <div>
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 4 }}>Linked entry (missing)</div>
          <div style={{ fontSize: 14, fontStyle: "italic", color: "var(--danger)", marginBottom: 6 }}>
            {node._cachedName || "(unlinked)"}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
            The entry this node was linked to no longer exists. Re-link to a different entry, or convert to freeform to keep the cached name as a label.
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 4 }}>Linked to {entry && entry.synthetic ? stemmaSourceLabel(entry.templateId) : "entry"}</div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 10px",
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: 4,
            marginBottom: 10,
          }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: template?.color || "#888",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--bg)",
              fontSize: 14,
              flexShrink: 0,
            }}>{template?.icon || "◈"}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {entry?.name || "(unnamed)"}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                {template?.name || "(no template)"}
              </div>
            </div>
          </div>
          {stemmaTargetOpens(entry) ? (
            <button
              className="btn btn-ghost"
              style={{ fontSize: 12, width: "100%" }}
              onClick={() => entry && onOpenEntry(entry.id)}
            >Open {entry && entry.synthetic ? stemmaSourceLabel(entry.templateId) : "entry"} →</button>
          ) : (
            <div style={{ fontSize: 11, color: "var(--text-dim)", fontStyle: "italic" }}>
              Nothing opens a {stemmaSourceLabel(entry.templateId)} yet.
            </div>
          )}
        </>
      )}
    </div>
  );
}

// The radial canvas. SVG layer carries the orbit ring and connection lines;
// HTML layer carries the interactive nodes (clickable, hoverable, accessible).
// Click a child → drills in (re-centers focal on that child). Click focal →
// inspector opens for that node. Click + → smart input typeahead (entry match
// or freeform fallback). Top bar carries the back-to-index button, click-to-
// rename stemma name, optional back-to-root jump, ancestor breadcrumb (each
// segment clickable to re-focal up the tree), and right-aligned export.
function StemmaCanvasView({ stemma, focalNodeId, entries, templates, isLocked, flash, onFocalChange, onBackToIndex, onReplace, onOpenEntry, onExport, onExportMarkdown }) {
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
  const [editingSlot, setEditingSlot] = useState(null);  // which slot's + is in input mode
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
  }, [focal, focusId]);

  // Reset inspector when stemma itself changes (e.g. user opened a different
  // stemma without going through the index).
  useEffect(() => {
    setInspectorNodeId(null);
    setEditingName(false);
  }, [stemma.id]);

  // Resolve the inspected node from the tree. If the node ID points to a node
  // that no longer exists (e.g. just deleted), close the inspector.
  const inspectedNode = inspectorNodeId ? findStemmaNode(stemma.root, inspectorNodeId) : null;
  useEffect(() => {
    if (inspectorNodeId && !inspectedNode) setInspectorNodeId(null);
  }, [inspectorNodeId, inspectedNode]);

  // ── Wheel zoom (Ctrl+scroll) ──────────────────────────────────────────────
  // Mirrors the Chronometric timeline's zoom pattern. Bound natively rather
  // than via React's onWheel because React attaches wheel events as passive
  // by default, which silently kills preventDefault — Brave/Chrome would then
  // treat Ctrl+wheel as page zoom and the in-app zoom would never fire. Using
  // addEventListener with passive:false fixes that.
  //
  // Bounds (0.5–2.5) and step (1.15) are deliberately tighter than the
  // Chronometric timeline because Stemma renders a single radial canvas per
  // focal — there's nothing useful to see outside that range.
  const [zoom, setZoom] = useState(1);
  const canvasPaneRef = useRef(null);
  const innerRef = useRef(null);  // the SIZE-by-SIZE square the nodes sit in, scaled (r034: the orbit's geometry reads its box)
  const zoomBy = (factor) => setZoom(z => Math.max(0.5, Math.min(2.5, z * factor)));
  useEffect(() => {
    const pane = canvasPaneRef.current;
    if (!pane) return;
    const handler = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom(z => {
        const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
        return Math.max(0.5, Math.min(2.5, z * factor));
      });
    };
    pane.addEventListener("wheel", handler, { passive: false });
    return () => pane.removeEventListener("wheel", handler);
  }, []);

  // Layout constants. Tuned for desktop; revisit if mobile gets attention later.
  const SIZE = 720;
  const CENTER = SIZE / 2;
  const ORBIT_R = 260;
  const FOCAL_R = 38;
  const CHILD_R = 30;
  const SLOT_R = 14;

  const slotPos = (slot) => {
    const a = stemmaSlotAngle(slot);
    return { x: CENTER + ORBIT_R * Math.cos(a), y: CENTER + ORBIT_R * Math.sin(a) };
  };

  // Index occupied slots so we can render either node or + at each position.
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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Top bar — breadcrumb showing ancestor path from root to current
          focal. Stemma name is click-to-edit (commits on Enter or blur,
          reverts on Esc). Path segments are clickable to jump focal up the
          tree; the current focal segment is accent-colored and non-clickable. */}
      <div style={{
        padding: "10px 24px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexShrink: 0,
        flexWrap: "wrap",
      }}>
        <button
          onClick={onBackToIndex}
          className="btn btn-ghost"
          style={{ padding: "4px 10px", fontSize: 13 }}
        >← Stemmas</button>
        <span style={{ color: "var(--text-dim)", fontSize: 13 }}>·</span>
        {editingName ? (
          <input
            type="text"
            value={nameDraft}
            autoFocus
            onChange={e => setNameDraft(e.target.value)}
            onBlur={() => {
              const trimmed = nameDraft.trim();
              if (trimmed && trimmed !== stemma.name) apply(stemmaRename(stemma, trimmed));
              setEditingName(false);
            }}
            onKeyDown={e => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.target.blur();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setNameDraft(stemma.name);
                setEditingName(false);
              }
            }}
            style={{
              fontSize: 14,
              fontWeight: 500,
              padding: "2px 8px",
              border: "1px solid var(--accent)",
              borderRadius: 3,
              background: "var(--surf2)",
              color: "var(--text)",
              outline: "none",
              minWidth: 200,
            }}
          />
        ) : (
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              cursor: isLocked ? "default" : "pointer",
              padding: "2px 6px",
              borderRadius: 3,
            }}
            onClick={() => {
              if (isLocked) return;
              setNameDraft(stemma.name);
              setEditingName(true);
            }}
            title={isLocked ? null : "Click to rename"}
          >{stemma.name}</span>
        )}
        {focal.id !== stemma.root.id && (
          <button
            onClick={() => onFocalChange(stemma.root.id)}
            className="btn btn-ghost"
            style={{ padding: "2px 8px", fontSize: 12 }}
            title="Jump back to the root node"
          >Back to root</button>
        )}
        {/* Breadcrumb: ancestor path from root to current focal. Each segment
            clickable to jump focal back up the tree (per design doc §4.3).
            The last segment (current focal) is non-clickable, accent-colored. */}
        {(() => {
          const path = findStemmaNodePath(stemma.root, focal.id) || [stemma.root];
          const getName = (node) => {
            if (node.type === "linked") {
              const e = (entries || []).find(en => en.id === node.entryId);
              if (e) return e.name || "(unnamed)";
              return node._cachedName || "(unlinked)";
            }
            return node.label || "(empty)";
          };
          return path.flatMap((node, i) => {
            const isCurrent = i === path.length - 1;
            const isOrphan = node.type === "linked"
              && !(entries || []).find(en => en.id === node.entryId);
            const name = getName(node);
            const truncated = name.length > 28 ? name.slice(0, 27) + "…" : name;
            return [
              <span
                key={`sep-${node.id}`}
                style={{ color: "var(--text-dim)", fontSize: 13 }}
              >›</span>,
              isCurrent ? (
                <span
                  key={node.id}
                  title={name}
                  style={{
                    fontSize: 13,
                    color: "var(--accent)",
                    fontWeight: 500,
                    padding: "2px 6px",
                    fontStyle: isOrphan ? "italic" : "normal",
                  }}
                >{truncated}</span>
              ) : (
                <button
                  key={node.id}
                  className="btn btn-ghost"
                  title={name}
                  onClick={() => onFocalChange(node.id)}
                  style={{
                    padding: "2px 8px",
                    fontSize: 13,
                    fontStyle: isOrphan ? "italic" : "normal",
                  }}
                >{truncated}</button>
              ),
            ];
          });
        })()}
        {/* Right-aligned actions: undo and redo (v1.7 r026; hidden when the
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
          <button
            className="btn btn-ghost"
            onClick={onExportMarkdown}
            style={{ padding: "4px 10px", fontSize: 13 }}
            title="Export this stemma as Markdown"
          >Markdown</button>
        </div>
      </div>

      {/* Canvas + Inspector horizontal flex. Inspector pushes canvas left
          when open (per design doc §4.5). */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div
          ref={canvasPaneRef}
          style={{ flex: 1, position: "relative", overflow: "auto", background: "var(--bg)" }}
        >
          {/* Outer wrapper carries the scaled dimensions so layout/scroll see
              the zoomed footprint correctly. Inner wrapper applies the actual
              CSS transform; existing children render at their original
              coordinates and the transform handles visual scaling. SVG content
              stays vector-sharp at any zoom level. */}
          <div style={{
            position: "relative",
            width: SIZE * zoom,
            height: SIZE * zoom,
            margin: "20px auto",
          }}>
          <div ref={innerRef} style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: SIZE,
            height: SIZE,
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
          }}>
            {/* SVG layer: orbit ring + connection lines from focal to occupied
                children. pointerEvents none so clicks fall through to HTML nodes. */}
            <svg
              width={SIZE}
            height={SIZE}
            style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
          >
            <circle
              cx={CENTER}
              cy={CENTER}
              r={ORBIT_R}
              fill="none"
              stroke="var(--border)"
              strokeOpacity="0.55"
              strokeWidth="1"
            />
            {(focal.children || []).map(c => {
              if (typeof c.slot !== "number") return null;
              const p = slotPos(c.slot);
              return (
                <line
                  key={`line-${c.id}`}
                  x1={CENTER}
                  y1={CENTER}
                  x2={p.x}
                  y2={p.y}
                  stroke="var(--border)"
                  strokeOpacity="0.55"
                  strokeWidth="1"
                />
              );
            })}
          </svg>

          {/* Focal node (centered) */}
          <StemmaNode
            node={focal}
            entries={entries}
            templates={templates}
            cx={CENTER}
            cy={CENTER}
            radius={FOCAL_R}
            isFocal
            onClick={() => setInspectorNodeId(focal.id)}
          />

          {/* 16 slots: occupied → child node, empty → + button (or smart input when activated).
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
            if (dragged && (slot === dragged.slot || slot === drag.slot)) return null;
            // Empty slot: render the smart input if this is the slot being
            // edited; otherwise the + button. Locked worlds skip the +
            // entirely (read-only mode).
            if (editingSlot === slot) {
              return (
                <StemmaSmartInput
                  key={`input-${slot}`}
                  cx={p.x}
                  cy={p.y}
                  entries={entries}
                  onCommitFreeform={(label) => {
                    apply(stemmaAddChild(stemma, focal.id, slot, { type: "freeform", label }));
                    setEditingSlot(null);
                  }}
                  onCommitLinked={(entryId, cachedName) => {
                    apply(stemmaAddChild(stemma, focal.id, slot, { type: "linked", entryId, cachedName }));
                    setEditingSlot(null);
                  }}
                  onCancel={() => setEditingSlot(null)}
                />
              );
            }
            if (isLocked) return null;
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
          })()}
          {/* Has-children indicator: small line radiating outward (away from
              focal) on any child that has its own children. Visual cue that
              the node is drillable.
              
              Lives in its OWN SVG layer rendered AFTER all StemmaNodes so it
              paints on top of node labels — otherwise the indicator at slot 8
              (6 o'clock) gets occluded by the bottom child's label background.
              Pure visual; layer is pointer-events-none so the underlying
              child node remains the click target for drilling. */}
          <svg
            width={SIZE}
            height={SIZE}
            style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
          >
            {(focal.children || []).map(c => {
              if (typeof c.slot !== "number") return null;
              if (!Array.isArray(c.children) || c.children.length === 0) return null;
              const a = stemmaSlotAngle(c.slot);
              const startR = ORBIT_R + CHILD_R + 5;   // 5px gap from node edge
              const endR = startR + 12;                // 12px line length
              return (
                <line
                  key={`hasChildren-${c.id}`}
                  x1={CENTER + startR * Math.cos(a)}
                  y1={CENTER + startR * Math.sin(a)}
                  x2={CENTER + endR * Math.cos(a)}
                  y2={CENTER + endR * Math.sin(a)}
                  stroke="var(--text-dim)"
                  strokeOpacity="0.75"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              );
            })}
          </svg>
          </div>
        </div>
      </div>

      {inspectedNode && (
        <StemmaInspector
          node={inspectedNode}
          isRoot={inspectedNode.id === stemma.root.id}
          entries={entries}
          templates={templates}
          isLocked={isLocked}
          flash={flash}
          onClose={() => setInspectorNodeId(null)}
          onUpdateNode={(patch) => apply(
            stemmaUpdateNode(stemma, inspectedNode.id, patch),
            patch && patch.label !== undefined ? { coalesce: `label:${inspectedNode.id}` } : undefined
          )}
          onDeleteNode={() => apply(stemmaDeleteNode(stemma, inspectedNode.id))}
          onConvertToLinked={(entryId, name) => apply(stemmaConvertToLinked(stemma, inspectedNode.id, entryId, name))}
          onConvertToFreeform={() => apply(stemmaConvertToFreeform(stemma, inspectedNode.id))}
          onRelink={(entryId, name) => apply(stemmaRelinkNode(stemma, inspectedNode.id, entryId, name))}
          onOpenEntry={onOpenEntry}
        />
      )}
      </div>
    </div>
  );
}

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

// ─── Stemma Markdown (v1.7 r035) ──────────────────────────────────────────────
// The Markdown export (docs/stemma-v2-spec.md, section 9), one text for
// either layout, pure, lines ending in "\n": the name as a heading, the
// description, then a rota's tree as a nested list in slot order from 12
// o'clock, the root the first item (a freeform node its label, a linked
// node a [[wiki-link]] to the record's name in the pool, so a paste into a
// longform field links, an orphan its cached name marked unlinked), or a
// tabula's board: its free cards in reading order (top to bottom, then
// left to right) as a list, each column a heading with its cards as a
// list, a laned column (r033) its lanes as headings below it, a sub-board
// a nested section, its own content a heading deeper, headings capped at
// six; a note its title with its body indented under it, an image its file
// name with its caption, a board card in a list its title marked as a
// board with its section following its holder's; a card's stacks (r033)
// nested lists under the card, a titled stack an item of its own, an
// untitled one its cards directly, a row the same; shapes don't export.
const stemmaMarkdown = (stemma, pool) => {
  const lines = [];
  const name = (stemma && stemma.name) || "Untitled";
  lines.push(`# ${name}`, "");
  const desc = typeof stemma.description === "string" ? stemma.description.trim() : "";
  if (desc) lines.push(desc, "");
  const nameOf = (entryId, cached) => {
    const rec = (pool || []).find(e => e.id === entryId);
    return rec ? `[[${rec.name || "(unnamed)"}]]` : `${cached || "(unlinked)"} (unlinked)`;
  };
  if (stemma.layout !== "tabula") {
    const walk = (node, depth) => {
      const text = node.type === "linked" ? nameOf(node.entryId, node._cachedName) : (node.label || "(empty)");
      lines.push(`${"  ".repeat(depth)}- ${text}`);
      (node.children || []).slice().sort((a, b) => (a.slot || 0) - (b.slot || 0)).forEach(c => walk(c, depth + 1));
    };
    if (stemma.root) walk(stemma.root, 0);
    return lines.join("\n") + "\n";
  }
  const heading = (level, text) => `${"#".repeat(Math.min(6, level))} ${text}`;
  const indent = (depth) => "  ".repeat(depth);
  const laned = (col) => (col.items || []).some(c => c && c.type === "column");
  // one card as list lines at a depth, its stacks nested under it
  const cardLines = (it, depth) => {
    const out = [];
    if (it.type === "note") {
      out.push(`${indent(depth)}- ${it.title || "Untitled"}`);
      const body = (it.body || "").replace(/\s+$/, "");
      if (body) { out.push(""); body.split("\n").forEach(l => out.push(l ? `${indent(depth + 1)}${l}` : "")); out.push(""); }
    } else if (it.type === "linked") out.push(`${indent(depth)}- ${nameOf(it.entryId, it._cachedName)}`);
    else if (it.type === "image") out.push(`${indent(depth)}- ${it.image && !/^data:/.test(it.image) ? it.image : "(embedded image)"}${it.caption ? `: ${it.caption}` : ""}`);
    else if (it.type === "board") out.push(`${indent(depth)}- ${it.title || "Untitled board"} (board)`);
    else if (it.type === "column") { out.push(`${indent(depth)}- ${it.title || "Untitled column"}`); out.push(...stackLines(it, depth + 1)); return out; }
    else return out;
    if (it.type !== "board" && Array.isArray(it.items)) it.items.forEach(st => {
      if (st.title) { out.push(`${indent(depth + 1)}- ${st.title}`); out.push(...stackLines(st, depth + 2)); }
      else out.push(...stackLines(st, depth + 1));
    });
    return out;
  };
  // a stack's or a lane's cards as list lines; lanes within it as items of their own
  const stackLines = (col, depth) => {
    const out = [];
    (col.items || []).forEach(c => {
      if (c.type === "column") { out.push(`${indent(depth)}- ${c.title || "Untitled lane"}`); out.push(...stackLines(c, depth + 1)); }
      else out.push(...cardLines(c, depth));
    });
    return out;
  };
  const tidy = (arr) => { const out = []; arr.forEach(l => { if (l === "" && (out.length === 0 || out[out.length - 1] === "")) return; out.push(l); }); while (out.length && out[out.length - 1] === "") out.pop(); return out; };
  // the sub-boards below a board, in reading order where placed and in stack order inside columns and stacks, never a sub-board's own
  const boardsBelow = (node) => { const out = []; const walk = (n, sort) => (sort ? (n.items || []).slice().sort((a, b) => (a.y - b.y) || (a.x - b.x)) : (n.items || [])).forEach(it => { if (it.type === "board") out.push(it); else if (Array.isArray(it.items)) walk(it, false); }); walk(node, true); return out; };
  const column = (col, level) => {
    lines.push(heading(level, col.title || "Untitled column"), "");
    if (laned(col)) { col.items.forEach(l => column(l, level + 1)); return; }
    const body = tidy(col.items.flatMap(c => cardLines(c, 0)));
    lines.push(...(body.length ? body : ["_(empty)_"]), "");
  };
  const section = (board, level) => {
    const placed = (board.items || []).slice().sort((a, b) => (a.y - b.y) || (a.x - b.x));
    const free = tidy(placed.filter(it => it.type !== "column" && it.type !== "board").flatMap(c => cardLines(c, 0)));
    if (free.length) lines.push(...free, "");
    placed.filter(it => it.type === "column").forEach(col => column(col, level));
    boardsBelow(board).forEach(b => { lines.push(heading(level, b.title || "Untitled board"), ""); section(b, level + 1); });
  };
  if (stemma.root) section(stemma.root, 2);
  const out = tidy(lines);
  return out.join("\n") + "\n";
};

// ─── Stemma index view ───────────────────────────────────────────────────────
// The Views-section landing page when the user clicks "Stemma" in the sidebar.
// Lists every stemma in the world; click into a row opens its canvas. Per-row
// Export and Delete actions stop propagation so they don't trigger row-click
// open. Header has Import (file picker) and, since v1.7's r029, + New Rota and
// + New Tabula; all gated on !isLocked. Empty state suggests both creation
// paths. Each row is marked with its layout and counted in its own terms:
// nodes for a rota, cards (and columns, from r030) for a tabula.

function StemmaIndexView({ state, isLocked, onOpen, onCreate, onImport, onExport, onExportMarkdown, onDelete }) {
  const stemmas = Array.isArray(state.stemmas) ? state.stemmas : [];
  const importInputRef = useRef(null);

  return (
    <div style={{ padding: "20px 24px", maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
        <div style={{ color: "var(--text-dim)", fontSize: 14, lineHeight: 1.5, maxWidth: 560 }}>
          Freeform mind maps for plot threads, theme webs, organizational hierarchies — anything tree-shaped. A rota is a radial tree with a focal node at the center; click into any node to drill in and re-center on it. A tabula is a board: cards where you put them, for the thinking that doesn't fit a tree.
        </div>
        {!isLocked && (
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <input
              ref={importInputRef}
              type="file"
              accept=".json,application/json"
              style={{ display: "none" }}
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) onImport(f);
                e.target.value = "";  // reset so re-importing the same file fires onChange
              }}
            />
            <button
              className="btn btn-ghost"
              onClick={() => importInputRef.current?.click()}
              title="Import a stemma from JSON"
            >Import</button>
            <button className="btn btn-accent" onClick={() => onCreate("rota")}>+ New Rota</button>
            <button className="btn btn-accent" onClick={() => onCreate("tabula")}>+ New Tabula</button>
          </div>
        )}
      </div>

      {stemmas.length === 0 ? (
        <div style={{
          padding: "60px 20px",
          textAlign: "center",
          color: "var(--text-dim)",
          fontStyle: "italic",
          border: "1px dashed var(--border)",
          borderRadius: 6,
          background: "var(--surf)"
        }}>
          No stemmas yet.{!isLocked && " Click + New Rota or + New Tabula above to create one, or Import an existing stemma JSON."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 1, border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
          {stemmas.map(s => {
            const isTabula = s.layout === "tabula";
            const nodeCount = isTabula ? 0 : countStemmaNodes(s);
            const counts = isTabula ? tabulaCounts(s) : null;
            const countText = isTabula
              ? `${counts.cards} ${counts.cards === 1 ? "card" : "cards"}${counts.columns > 0 ? ` · ${counts.columns} ${counts.columns === 1 ? "column" : "columns"}` : ""}`
              : `${nodeCount} ${nodeCount === 1 ? "node" : "nodes"}`;
            return (
              <div
                key={s.id}
                className="stemma-index-row"
                style={{ padding: "12px 16px", background: "var(--surf)", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 12 }}
                onClick={() => onOpen(s.id)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name || "(unnamed stemma)"}</span>
                      <span className="tabula-badge" title={isTabula ? "A board" : "A radial tree"}>{isTabula ? "Tabula" : "Rota"}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-dim)", whiteSpace: "nowrap" }}>
                      {countText}
                      {s.updatedAt && <span> · updated {fmtDate(s.updatedAt)}</span>}
                    </div>
                  </div>
                  {s.description && (
                    <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 4 }}>
                      {s.description}
                    </div>
                  )}
                  {Array.isArray(s.tags) && s.tags.length > 0 && (
                    <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {s.tags.map(t => (
                        <span key={t} style={{ fontSize: 11, padding: "2px 8px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-dim)" }}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
                {/* Per-row actions. Click handlers stop propagation so they
                    don't trigger the row's onOpen. */}
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: "3px 8px", fontSize: 12 }}
                    onClick={ev => { ev.stopPropagation(); onExport(s); }}
                    title="Export this stemma as JSON"
                  >Export</button>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: "3px 8px", fontSize: 12 }}
                    onClick={ev => { ev.stopPropagation(); onExportMarkdown && onExportMarkdown(s); }}
                    title="Export this stemma as Markdown"
                  >Markdown</button>
                  {!isLocked && (
                    <button
                      className="btn"
                      style={{ padding: "3px 8px", fontSize: 12, color: "var(--danger)", borderColor: "rgba(184,92,76,.35)" }}
                      onClick={ev => {
                        ev.stopPropagation();
                        if (confirm(stemmaDeleteMessage(s, state))) {
                          onDelete(s.id);
                        }
                      }}
                      title="Delete this stemma"
                    >Delete</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

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

// ─── Tabula: the canvas (v1.7 r029) ────────────────────────────────────────────
// The board's screen (docs/stemma-v2-spec.md, section 6): HTML, not SVG, so a
// note wraps and renders Markdown; the surface is a div moved and scaled by
// one transform, cards absolutely positioned on it at their x and y, and the
// pane clips (overflow: clip, not hidden: a hidden pane is still a scroll
// container, and a field focused inside it scrolls the pane under the
// camera's feet). The camera is the map editor's grammar on an unbounded canvas.
// Edits are transforms (above) committed through useMapHistory and App's
// replaceStemma, the rota's path since r026, so Ctrl+Z and Ctrl+Y and the
// buttons walk them; a drag or a resize commits once, at its end.

// The gestures (r032, out of the view): one window-level move and up pair
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

// One card: placed on the canvas (absolute, at x and y, w wide, with the
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
// pointer while a stack item is on the move; `over` marks a column or a
// board card a drag is over, and `overEdge` names the board card's edge
// nearest the pointer, where the line is drawn. Since r031 the grip strip in
// the left margin (`onGripDown`) is the only surface that drags; a press on
// the body (`onPointerDown`) selects. A column's header is its grip. `stick`
// (r032) lights the card a line's pending end is over. A column holding
// lanes (r033) draws its header over a row of lanes, each a column that
// isn't placed, drawn as `.tabula-lane` with its own header and its stack
// or its own lanes through `renderItem`, at any depth; `laneInsertAt`
// draws the line where a column dragged over it would become a lane,
// before or after a plain column's stack, or between lanes.
// A column's `role` (r033) is what it is to what holds it: "column" on a
// board, "lane" in a column, "stack" under a card; the words follow it. A
// lane with a width of its own (`w`) is drawn at it unless it is the last
// (`lastLane`), which takes what's left; between lanes a divider
// (`onLaneDivider`, given the lane before it, its index, and the lanes)
// sets that width by a drag (r033). `fit` (r033) is what the item needs
// drawn, tabulaNeed: a placed card or column is drawn at the larger of
// its width and it, a lane never narrower, a card in a row (`inRow`) at
// it exactly.
function TabulaCard({ item, placed, x, y, w, role, lastLane, fit, inRow, pool, templates, selected, dragging, ghost, over, overEdge, stick, editing, onEditChange, onEditDone, onPointerDown, onGripDown, onHandleDown, onDoubleClick, onOpenEntry, dirHandle, imageFolder, renderItem, insertAt, laneInsertAt, onLaneDivider }) {
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
    const what = role || (placed || ghost ? "column" : "lane");  // a column that isn't placed is a lane, or a stack (r033)
    const lane = what !== "column";
    const lanes = tabulaIsLaned(item) ? item.items : null;
    const row = !lanes && item.flow === "row";  // the cards side by side (r033)
    const slim = what === "stack" && !item.title;  // an untitled stack under a card draws slim (r033)
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
        <div className="tabula-column-hdr" style={{ borderTop: `3px solid ${color}` }} title={editing ? undefined : `Drag to move the ${what}`} onPointerDown={editing ? undefined : onGripDown}>
          {!editing && !ghost && <span className="tabula-grip tabula-grip-inline" aria-hidden="true">⋮⋮</span>}
          {editing ? editBox(<input type="text" value={item.title || ""} placeholder={what === "lane" ? "Lane" : what === "stack" ? "Stack" : "Column"} onChange={(e) => onEditChange({ title: e.target.value }, "title")} />) : (
            <div className="tabula-column-title" style={{ color: item.title ? "var(--text)" : "var(--text-dim)", fontStyle: item.title ? "normal" : "italic" }}>{item.title || (slim ? "" : `Untitled ${what}`)}</div>
          )}
        </div>
        {lanes ? (
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
        ) : (
          <div className={`tabula-column-body${row ? " row" : ""}${laneAt === 0 ? " lane-before" : laneAt >= 1 ? " lane-after" : ""}`}>
            {rows.length > 0 ? rows : <div className="tabula-column-empty">{over ? "" : (lane ? "" : "Drop cards here")}</div>}
          </div>
        )}
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
  // the stacks under a card (r033), and the line where a column dragged
  // over it would go: among the stacks by x, or under the body when it has none
  const stacks = item.type !== "column" && item.type !== "board" && Array.isArray(item.items) ? item.items : [];
  const stackAt = laneInsertAt !== null && laneInsertAt !== undefined && item.type !== "column" ? laneInsertAt : -1;
  const under = stacks.length || stackAt >= 0 ? (
    <div className={`tabula-lanes tabula-under${stacks.length ? "" : " tabula-under-new"}`}>
      {stacks.map((l, i) => (
        <React.Fragment key={l.id}>
          {stackAt === i && <div className="tabula-lane-insert" />}
          {renderItem ? renderItem(l, i === stacks.length - 1) : null}
          {onLaneDivider && i < stacks.length - 1 && <div className="tabula-lane-divider" title="Drag to set the stack's width" onPointerDown={onLaneDivider(l, i, stacks)} />}
        </React.Fragment>
      ))}
      {stackAt >= stacks.length && <div className="tabula-lane-insert" />}
    </div>
  ) : null;
  const slimStack = item.type === "column" && role === "stack" && !item.title;
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
      style={placed ? { left: x, top: y, ...sizing, borderLeft: accent ? `3px solid ${accent}` : undefined } : { borderLeft: accent ? `3px solid ${accent}` : undefined, ...sizing }}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
    >
      {gripped && !ghost && (
        <div className="tabula-grip" title="Drag to move" style={accent ? { background: `${accent}22` } : undefined} onPointerDown={onGripDown} onDoubleClick={(e) => e.stopPropagation()}>⋮⋮</div>
      )}
      {gripped ? <div className="tabula-body">{body}</div> : body}
      {under}
      {over && overEdge && <div className={`tabula-edge tabula-edge-${overEdge}`} />}
      {placed && !ghost && <div className="tabula-card-handle" title="Drag to resize" onPointerDown={onHandleDown} />}
    </div>
  );
}

// The right-side inspector for the selected card, the rota's pattern: a
// note's title, body, and color; a linked card's record with Open where
// something opens, re-link, and convert to a note; an image's caption and
// its replacement; a column's title and color (r030); a board's title,
// color, and icon, with Open (r030); what a column or a board holds; Delete
// on every card. A run of typing in a field is one history step. A column
// (r033) has Cards per row, the lanes it holds, 1 to TABULA.maxLanes
// (`onLanes`), and so has a lane (`isLane`), whose lanes are lanes of its
// own, and a stack under a card (`isStack`); a card has its stacks (r033),
// Add a stack when it has none and their count when it has some, through
// `onLanes` too; every card has Duplicate (`onDuplicate`).
function TabulaInspector({ item, isLane, isStack, pool, templates, isLocked, onClose, onPatch, onDelete, onRelink, onConvertToNote, onOpenEntry, onReplaceImage, onOpenBoard, onLanes, onDuplicate }) {
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
    const stacks = tabulaStacked(node) ? ` in ${node.items.length} ${node.items.length === 1 ? "stack" : "stacks"}` : "";
    return <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>{parts.length ? `Holds ${parts.join(" and ")}${stacks}.` : (stacks ? `Holds nothing yet${stacks}.` : "Holds nothing yet.")}</div>;
  };
  // the stacks under a card (r033): Add a stack, or their count, as a column's lanes
  const stacksField = () => {
    const count = tabulaStacked(item) ? item.items.length : 0;
    return field("Stacks under it", count === 0 ? (
      <button type="button" className="btn btn-ghost btn-small" disabled={isLocked} title="A column under the card, its cards stacked below it; a column dropped on the card does the same" onClick={() => onLanes && onLanes(1)}>Add a stack</button>
    ) : (
      <div className="tabula-seg tabula-seg-lanes" title="Stacks side by side under the card, each its own column with its own title; the cards keep their places when the count changes">
        {Array.from({ length: TABULA.maxLanes }, (_, i) => i + 1).map(n => (
          <button key={n} type="button" className={`btn btn-small ${count === n ? "btn-accent" : "btn-ghost"}`} aria-pressed={count === n} disabled={isLocked} onClick={() => onLanes && onLanes(n)}>{n}</button>
        ))}
      </div>
    ));
  };
  let body = null;
  const kind = item.type === "note" ? "Note" : item.type === "linked" ? "Linked" : item.type === "image" ? "Image" : item.type === "column" ? (isLane ? "Lane" : isStack ? "Stack" : "Column") : "Board";
  if (item.type === "note") {
    body = (
      <>
        {field("Title", <input className="input" type="text" value={item.title || ""} disabled={isLocked} placeholder="Untitled" onChange={(e) => onPatch({ title: e.target.value }, "title")} />)}
        {field("Body", <textarea className="input" value={item.body || ""} disabled={isLocked} placeholder="Markdown; [[wiki-links]] resolve" rows={8} style={{ overflow: "auto", minHeight: 120 }} onChange={(e) => onPatch({ body: e.target.value }, "body")} />)}
        {field("Color", colorRow)}
        {stacksField()}
        {tabulaStacked(item) && holdsLine(item)}
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
        {!tabulaIsLaned(item) && field("Lay out", (
          <div className="tabula-seg tabula-seg-flow" title="Stack lays the cards under each other; Row lays them side by side, each as wide as what it holds, and what holds the row grows to fit">
            {[["stack", "Stack"], ["row", "Row"]].map(([v, label]) => (
              <button key={v} type="button" className={`btn btn-small ${(item.flow === "row" ? "row" : "stack") === v ? "btn-accent" : "btn-ghost"}`} aria-pressed={(item.flow === "row" ? "row" : "stack") === v} disabled={isLocked} onClick={() => onPatch(it => { const { flow, ...rest } = it; return v === "row" ? { ...rest, flow: "row" } : rest; })}>{label}</button>
            ))}
          </div>
        ))}
        {field("Cards per row", (
          <div className="tabula-seg tabula-seg-lanes" title={`Lanes side by side${word === "column" ? "" : ` inside this ${word}`}, each its own stack with its own title; the cards keep their places when the count changes`}>
            {Array.from({ length: TABULA.maxLanes }, (_, i) => i + 1).map(n => (
              <button key={n} type="button" className={`btn btn-small ${laneCount === n ? "btn-accent" : "btn-ghost"}`} aria-pressed={laneCount === n} disabled={isLocked} onClick={() => onLanes && onLanes(n)}>{n}</button>
            ))}
          </div>
        ))}
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
          {onDuplicate && <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={onDuplicate} title="A copy beside it (Ctrl+D)">Duplicate</button>}
          <button className="btn" style={{ fontSize: 12, color: "var(--danger)", borderColor: "var(--danger)" }} onClick={onDelete}>{item.type === "column" ? (isLane ? "Delete lane" : isStack ? "Delete stack" : "Delete column") : item.type === "board" ? "Delete board" : "Delete card"}</button>
        </div>
      )}
    </div>
  );
}

// Deleting a column or a board card that holds anything asks (v1.7 r030),
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
}

// The canvas view. boardId names the board node shown: the root, or a
// sub-board opened by a double-click on its card (r030), with the rota's
// breadcrumb in the bar and Back to its parent. The pool and the templates
// are the rota's (App builds them).
function TabulaCanvasView({ stemma, boardId, entries, templates, isLocked, flash, onFocalChange, onBackToIndex, onReplace, onOpenEntry, onExport, onExportMarkdown, viewPref, onViewPref, dirHandle, imageFolder }) {
  const board = tabulaBoardNode(stemma.root, boardId) || stemma.root;
  const history = useMapHistory(stemma, onReplace);
  const apply = (next, opts) => {
    if (isLocked || !next || next === stemma) return;
    history.commit(next, opts);
  };
  const paneRef = useRef(null);
  const surfaceRef = useRef(null);
  const [selection, setSelection] = useState([]);   // the selected cards' ids in the order picked, the last the primary (r033)
  const selectedId = selection.length ? selection[selection.length - 1] : null;
  const setSelectedId = (id) => setSelection(id ? [id] : []);
  const toggleSelected = (id) => setSelection(sel => (sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]));
  const [marquee, setMarquee] = useState(null);     // { x0, y0, x1, y1 }, canvas units, while a drag on empty canvas draws one (r033)
  const [editing, setEditing] = useState(null);     // the id of the note, column, or board edited in place
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [picker, setPicker] = useState(null);       // { x, y }: the Link tool's smart input, canvas units
  const [drag, setDrag] = useState(null);           // { id, x, y, w, ghost, over, group }: a card on the move, canvas units; over = { columnId, index } | { laneOf, index } | { boardId, edge }; group = the other selected placed cards, each at its offset (r033)
  const [resize, setResize] = useState(null);       // { id, w }: a card on the resize
  const [laneResize, setLaneResize] = useState(null);  // { widths: { [lane id]: w } }: the lanes on the resize while a divider is dragged (r033)
  const [placing, setPlacing] = useState(null);     // { kind }: a rail button on the drag
  const [asking, setAsking] = useState(null);       // the items whose delete is being asked about, columns or board cards that hold things among them
  const gestures = useTabulaGestures();
  const gestureRef = gestures.ref;
  const beginGesture = gestures.begin;
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
  // the selection may sit in a column's stack; several cards may be selected (r033)
  const selected = selectedId ? tabulaFindItem(board, selectedId) : null;
  const selectedParent = selected ? tabulaParentOf(board, selectedId) : null;
  const selectedItems = selection.map(id => tabulaFindItem(board, id)).filter(Boolean);
  const multi = selectedItems.length > 1;
  const isLane = (it) => { const p = it ? tabulaParentOf(board, it.id) : null; return !!(it && it.type === "column" && p && p.type === "column"); };
  const isStack = (it) => { const p = it ? tabulaParentOf(board, it.id) : null; return !!(it && it.type === "column" && p && p.type !== "column" && p.type !== "board"); };  // a column under a card (r033)
  const roleOf = (it, p) => (it.type !== "column" ? undefined : p.type === "board" ? "column" : p.type === "column" ? "lane" : "stack");
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
    if (!first) { setSelectedId(null); setEditing(null); setPicker(null); setDrag(null); setAsking(null); drawing.reset(); }
  }, [board.id]);

  // a card that goes closes the inspector and the editor on it
  useEffect(() => {
    const live = selection.filter(id => tabulaFindItem(board, id));
    if (live.length !== selection.length) setSelection(live);
    if (editing && !tabulaFindItem(board, editing)) setEditing(null);
    if (asking && !asking.every(it => tabulaFindItem(board, it.id))) setAsking(null);
  }, [board, selection, editing, asking]);
  useEffect(() => () => { if (prefTimer.current) clearTimeout(prefTimer.current); }, []);

  // The in-place editor's fields commit as they're typed, so ending the edit
  // only closes the fields; the ref (declared with the drawing layer above)
  // lets the pane's press and the field's blur both ask in one event.
  editingRef.current = editing;
  camera.cfg.current.onTap = () => { endEdit(); setSelectedId(null); setPicker(null); drawing.deselect(); };
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

  // What is under the pointer, for a drop: a board card (r031) first,
  // placed or in a stack, with the nearest of its four edges, where the line
  // is drawn and which decides where the card lands inside; then a column:
  // for a card, its stack, or (r033) the innermost lane under the pointer
  // when it holds lanes, and the gap nearest the pointer there, the dragged
  // items left out; for a column (r033), the lane whose middle the pointer
  // is over, down the lanes, which it joins as a lane of that lane at the
  // gap by x (before or after the stack when the lane has none), or, over
  // a lane's edge, the outer header, or the gaps, the host above at the gap
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
      const byX = stack.dataset.flow === "row";  // a row's gaps run by x (r033)
      kids.forEach(k => { const kr = k.getBoundingClientRect(); if (byX ? kr.left + kr.width / 2 < clientX : kr.top + kr.height / 2 < clientY) index++; });
      return { columnId: stack.dataset.item, index };
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
    const inStack = parent && parent.type !== "board";  // in a column's stack, a lane, or (r033) a stack under a card
    const inGroup = !inStack && selection.includes(it.id) && selection.length > 1;
    if (!inGroup) setSelectedId(it.id);
    if (isLocked) return;
    const startX = e.clientX, startY = e.clientY;
    const box = (e.currentTarget.closest("[data-item]") || e.currentTarget).getBoundingClientRect();
    const z0 = camera.viewRef.current.zoom;
    const grab = { dx: (e.clientX - box.left) / z0, dy: (e.clientY - box.top) / z0 };
    const w = inStack ? tabulaClampWidth(it.type, Number.isFinite(it.w) ? it.w : parent.w) : it.w;  // a lane with a width of its own keeps it (r033)
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
  };
  const onHandlePointerDown = (it) => (e) => {
    if (e.button !== 0 || isLocked) return;
    e.stopPropagation(); e.preventDefault();
    setSelectedId(it.id);
    const startX = e.clientX, w0 = it.w;
    beginGesture({
      onMove: (ev) => { const z = camera.viewRef.current.zoom; setResize({ id: it.id, w: tabulaClampWidth(it.type, tabulaSnap(w0 + (ev.clientX - startX) / z), tabulaStacked(it)) }); },
      onUp: (ev) => { setResize(null); const z = camera.viewRef.current.zoom; const w = tabulaClampWidth(it.type, tabulaSnap(w0 + (ev.clientX - startX) / z), tabulaStacked(it)); if (w !== it.w) apply(tabulaUpdateItem(stemma, it.id, { w })); },
    });
  };
  // a divider between lanes, or between stacks under a card (r033): the
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
  };
  const onPaneDoubleClick = (e) => {
    if (e.target && e.target.closest && e.target.closest(".tabula-card, .tabula-ui")) return;
    if (drawing.tool !== "cards") return;  // a double-click finishes a line, or is nothing
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
      const w = Number.isFinite(it.w) ? it.w : holder && Number.isFinite(holder.w) ? holder.w : Math.round(r.width / z);
      return { ...it, x: Math.round((r.left - s.left) / z), y: Math.round((r.top - s.top) / z), w: tabulaClampWidth(it.type, w, tabulaStacked(it)) };
    };
    // the selected items in document order, one inside another selected one left to its holder
    const set = new Set(selection);
    const picked = [];
    const walk = (node, under) => (node.items || []).forEach(it => { const sel = set.has(it.id); if (sel && !under) picked.push(it); if (tabulaHolds(it)) walk(it, under || sel); });
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
  const selectAll = () => setSelection(items.map(it => it.id));

  // the selection's keys: Delete, the arrows by the grid on a placed card,
  // Escape; the drawing layer's first (r032), through the latest render's
  // handler, since its state isn't among the effect's dependencies
  const latestRef = useRef(null);
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
  }, [selectedItems, selectedId, editing, picker, stemma, isLocked, asking, items]);

  const view = camera.view;
  const pool = entries || [];
  const screenOf = (cx, cy) => ({ x: (cx - view.x) * view.zoom, y: (cy - view.y) * view.zoom });
  const zoomPct = Math.round(view.zoom * 100);
  const path = tabulaBoardPath(stemma.root, board.id);
  const dragged = drag ? tabulaFindItem(board, drag.id) : null;

  // one card, placed or in a stack, wired to the view
  const cardFor = (it, parent, lastLane) => {
    const placed = parent.type === "board";
    const inRow = parent.type === "column" && parent.flow === "row" && !tabulaIsLaned(parent);  // a card in a row (r033)
    const fit = tabulaNeed(it, inRow);
    const inGroup = drag && drag.group ? drag.group.find(g => g.id === it.id) : null;
    const isDragged = drag && (drag.id === it.id || !!inGroup);
    if (isDragged && drag.ghost) return null;  // the ghost stands in for a stack item on the move
    const x = isDragged ? drag.x + (inGroup ? inGroup.dx : 0) : it.x;
    const y = isDragged ? drag.y + (inGroup ? inGroup.dy : 0) : it.y;
    const w = resize && resize.id === it.id ? resize.w : laneResize && laneResize.widths[it.id] !== undefined ? laneResize.widths[it.id] : it.w;
    return (
      <TabulaCard
        key={it.id}
        item={it}
        placed={placed}
        x={x} y={y} w={w}
        role={roleOf(it, parent)}
        lastLane={!!lastLane}
        fit={fit}
        inRow={inRow}
        onLaneDivider={isLocked ? undefined : onDividerPointerDown}
        pool={pool}
        templates={templates}
        selected={selection.includes(it.id)}
        dragging={!!isDragged}
        over={!!(drag && drag.over && (drag.over.columnId === it.id || drag.over.boardId === it.id || drag.over.laneOf === it.id))}
        overEdge={drag && drag.over && drag.over.boardId === it.id ? drag.over.edge : null}
        stick={drawing.stickId === it.id}
        insertAt={drag && drag.over && drag.over.columnId === it.id ? drag.over.index : null}
        laneInsertAt={drag && drag.over && drag.over.laneOf === it.id ? drag.over.index : null}
        editing={editing === it.id}
        onEditChange={(patch, key) => apply(tabulaUpdateItem(stemma, it.id, patch), { coalesce: `field:${it.id}:${key}` })}
        onEditDone={endEdit}
        onPointerDown={selectCard(it)}
        onGripDown={beginDrag(it, parent)}
        onHandleDown={onHandlePointerDown(it)}
        onDoubleClick={(e) => { e.stopPropagation(); if (it.type === "board") drillIn(it.id); else startEdit(it); }}
        onOpenEntry={onOpenEntry}
        dirHandle={dirHandle}
        imageFolder={imageFolder}
        renderItem={it.type === "column" || tabulaStacked(it) ? ((c, last) => cardFor(c, it, last)) : undefined}
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
          <button className="btn btn-ghost" onClick={onExportMarkdown} style={{ padding: "4px 10px", fontSize: 13 }} title="Export this tabula as Markdown">Markdown</button>
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
            <div className="tabula-rail-sep" aria-hidden="true" />
            {TABULA_TOOLS.map(t => (
              <button key={t.id} type="button" className={drawing.tool === t.id ? "active" : ""} aria-pressed={drawing.tool === t.id} title={`${t.label}: ${t.hint}`} onClick={() => pickTool(t.id)}><span className="glyph">{t.glyph}</span>{t.label}</button>
            ))}
          </div>
        )}
        <div
          ref={paneRef}
          className={`tabula-pane${camera.dragging ? " grabbing" : (camera.spaceHeld || isLocked ? " grab" : "")}${placing ? " placing" : ""}${drawing.drawTool ? " draw" : ""}`}
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
            <TabulaDrawLayer d={drawing} view={view} boardId={board.id} />
            {marquee && <div className="tabula-marquee" style={{ left: marquee.x0, top: marquee.y0, width: marquee.x1 - marquee.x0, height: marquee.y1 - marquee.y0 }} />}
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
          {items.length === 0 && drawing.shapes.length === 0 && !isLocked && (
            <div className="tabula-empty tabula-ui">{path.length > 1 ? "An empty board. Add a note from the rail, or double-click the canvas." : "Nothing here yet. Add a note from the rail, or double-click the canvas."}</div>
          )}
        </div>
        {selected && !multi && (
          <TabulaInspector
            item={selected}
            isLane={isLane(selected)}
            isStack={isStack(selected)}
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
        {!selected && !isLocked && drawing.panelOpen && (
          <TabulaShapePanel d={drawing} onClose={() => { if (drawing.selectedShape) drawing.deselect(); else drawing.setTool("cards"); }} />
        )}
      </div>
      {asking && (
        <TabulaDeleteModal items={asking} isLane={asking.length === 1 && isLane(asking[0])} isStack={asking.length === 1 && isStack(asking[0])} onMoveOut={moveOut} onDeleteAll={deleteAll} onCancel={() => setAsking(null)} />
      )}
    </div>
  );
}