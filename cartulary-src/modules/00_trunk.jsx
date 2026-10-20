
const { useState, useEffect, useRef, useCallback, useMemo } = React;

// ─── Drag-reorder hook ─────────────────────────────────────────────────────────
// Generic helper for click-and-drag list reordering using HTML5 native DnD.
// Returns props you spread onto each item plus state values for rendering
// drop indicators. The items are identified by index in the source array.

const useDragReorder = (onReorder) => {
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const [dropPosition, setDropPosition] = useState(null); // "before" | "after"

  const reset = () => { setDraggedIdx(null); setOverIdx(null); setDropPosition(null); };

  // Props for the drag handle element (small grip icon)
  const handleProps = (idx) => ({
    draggable: true,
    onDragStart: (e) => {
      setDraggedIdx(idx);
      // Some browsers require a dataTransfer to start the drag
      try { e.dataTransfer.setData("text/plain", String(idx)); } catch (_) {}
      e.dataTransfer.effectAllowed = "move";
    },
    onDragEnd: () => reset(),
  });

  // Props for the row (drop target)
  const rowProps = (idx) => ({
    onDragOver: (e) => {
      if (draggedIdx === null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      // Decide before/after based on cursor position in the row
      const rect = e.currentTarget.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      const pos = e.clientY < midpoint ? "before" : "after";
      if (overIdx !== idx || dropPosition !== pos) {
        setOverIdx(idx);
        setDropPosition(pos);
      }
    },
    onDragLeave: (e) => {
      // Only clear if we've actually left this row, not crossed into a child
      if (e.currentTarget === e.target && overIdx === idx) {
        setOverIdx(null);
        setDropPosition(null);
      }
    },
    onDrop: (e) => {
      if (draggedIdx === null) { reset(); return; }
      e.preventDefault();
      let targetIdx = idx + (dropPosition === "after" ? 1 : 0);
      // Adjust if dragging downward through the same list
      if (draggedIdx < targetIdx) targetIdx -= 1;
      if (targetIdx !== draggedIdx) onReorder(draggedIdx, targetIdx);
      reset();
    },
  });

  return { draggedIdx, overIdx, dropPosition, handleProps, rowProps, reset };
};

// ─── Constants ─────────────────────────────────────────────────────────────────

const SCHEMA_VERSION = 1;

const FIELD_TYPES = [
  { value: "text",          label: "Short Text" },
  { value: "textarea",      label: "Long Text" },
  { value: "longform",      label: "Longform Note" },
  { value: "tags",          label: "Tag List" },
  { value: "select",        label: "Dropdown" },
  { value: "multiselect",   label: "Multi-select" },
  { value: "number",        label: "Number" },
  { value: "date",          label: "Date (real-world)" },
  { value: "calendar-date", label: "Calendar Date (in-world)" },
  { value: "calendar-date-range", label: "Calendar Date Range (in-world)" },
  { value: "url",           label: "URL" },
  { value: "color",         label: "Color" },
  { value: "image",         label: "Image" },
  { value: "entry-ref",     label: "Entry Reference" },
  { value: "name-history",  label: "Name History (former names with dates)" },
  { value: "group",         label: "Repeating Group" },
  { value: "grid",          label: "Grid / Table" },
];
// Grid is top-level only in v1 (like group, it's structurally heavy and nesting
// it inside a repeating group multiplies edit complexity for no current use).
// Excluded from every subfield dropdown at every depth.
const SUBFIELD_TYPES = FIELD_TYPES.filter(t => t.value !== "group" && t.value !== "grid");

const GRID_CELL_TYPES = ["text", "number", "entry-ref", "calendar-date", "calendar-date-range"];
const GRID_CELL_TYPE_SET = new Set(GRID_CELL_TYPES);
const GRID_CELL_TYPE_LABELS = {
  "text": "Text", "number": "Number", "entry-ref": "Entry Reference",
  "calendar-date": "Calendar Date", "calendar-date-range": "Calendar Date Range",
};

// Maximum nesting depth for repeating groups. A top-level field is depth 0.
// Its direct subfields are depth 1. A group at depth 1 contains subfields at
// depth 2. A group at depth 2 contains subfields at depth 3. At depth 3,
// "group" is no longer offered as a subfield type — three levels of nesting
// is enough for org-chart-style hierarchies without runaway complexity.
const MAX_GROUP_DEPTH = 3;

const ICONS = ["◈","◎","◆","◇","◉","◯","◐","◑","◒","◓","◫","◪","⬡","⬢","▣","◧","◨","❧","✦","✧","⚙","⚔","⚜","☽","☿","♦","✺","❂","◬","◭"];
const COLORS = ["#c8a96e","#c86e6e","#6e9ec8","#9ec86e","#a06ec8","#c86ea8","#c8c06e","#6ec8a0","#c8836e","#6ea8c8","#b0a8c8","#c8b8a0","#7ec8c8","#dcc78a"];

// Distinguishes templates that originated from BUILTIN_TEMPLATES (subject to
// the canonical migration framework — field uplifts, option strips, type
// conversions, rename passes) from templates the user created themselves
// (left alone by migrations regardless of name collision with a built-in).
//
// Orthogonal to the `kind` field. As of v1.6 every user-reachable template is
// `kind:"standard"` (the retired `kind:"map"` was promoted to the cartographia
// slice in r001). Templates are `origin:"builtin"` (Character, Location, etc.)
// or `origin:"user"` (anything the user creates or imports).
//
// Migration matchers filter to origin === "builtin" so a user-created template
// that happens to share a built-in name (e.g. a custom "Character" with
// fundamentally different schema) does NOT get force-merged with canonical
// schema, force-renamed by TEMPLATE_RENAMES, or have its options/types
// rewritten by OPTIONS_UPDATES / FIELD_TYPE_CONVERSIONS / etc.
//
// Upgrade backfill (early in migrate(), one-time): templates without an
// origin field get classified by name — names in BUILTIN_TEMPLATES or in any
// TEMPLATE_RENAMES.from slot are marked "builtin"; everything else "user".
// This preserves historical behavior for pre-this-version worlds (where
// migrations have been treating same-named user templates as built-ins) while
// closing the door for new template creations going forward.
const TEMPLATE_ORIGIN = {
  BUILTIN: "builtin",
  USER: "user",
};
