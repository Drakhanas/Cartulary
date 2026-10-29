
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