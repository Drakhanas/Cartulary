
const subfieldTypesAtDepth = (depth) =>
  depth >= MAX_GROUP_DEPTH
    ? FIELD_TYPES.filter(t => t.value !== "group" && t.value !== "grid")
    : FIELD_TYPES.filter(t => t.value !== "grid");

// ─── Grid field value (v1.5) ────────────────────────────────────────────────
// A grid (type "grid") stores its own axes per entry: row + column definitions,
// optional axis names, and a sparse cell map keyed by stable row/col ids (NOT
// labels or positions — rename/reorder must not disturb cell bindings, same as
// the "internal ids preserved on rename" rule everywhere else). Each cell picks
// its OWN type independently: { type, value } where type is one of the five
// GRID_CELL_TYPES and value is whatever that type stores (string / number /
// entry id / calendar-date / calendar-date-range). Ref cells target ANY entry
// or registered node (Lexeme, Phoneme, etc.); no per-grid or per-cell target
// config, so the picker is unfiltered. Cells default to text; an untouched
// cell isn't stored (text + empty is the implicit default).
//   { rowAxisLabel, colAxisLabel, rows:[{id,label}], cols:[{id,label}],
//     cells: { [rowId]: { [colId]: { type, value } } } }
const makeEmptyGrid = () => ({ rowAxisLabel: "", colAxisLabel: "", rows: [], cols: [], cells: {} });
const defaultGridCellValue = (type) =>
  (type === "calendar-date" || type === "calendar-date-range") ? null : "";
const makeGridCell = (type) => {
  const t = GRID_CELL_TYPE_SET.has(type) ? type : "text";
  return { type: t, value: defaultGridCellValue(t) };
};
// A cell is "empty" when it carries no meaningful value (so a text+empty cell is
// dropped on coerce, but a non-text type choice is preserved even when blank).
const gridCellIsEmpty = (c) => {
  if (!c || typeof c !== "object") return true;
  const v = c.value;
  if (v == null || v === "") return true;
  if (c.type === "calendar-date") return typeof v !== "object" || v.year == null;
  if (c.type === "calendar-date-range") return typeof v !== "object" || (v.start?.year == null && v.end?.year == null);
  return false;
};
// Defensive: turn any stored value (incl. hand-edited / malformed JSON, or a
// legacy bare-scalar cell from the pre-per-cell builds) into a well-formed grid.
const coerceGridCell = (raw) => {
  // Legacy / hand-edit: a bare scalar becomes a text cell.
  if (raw == null) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return { type: "text", value: raw };
  if (!("type" in raw) && !("value" in raw)) {
    // An object that isn't a cell wrapper (e.g. a raw calendar-date {year,...})
    // — treat as a calendar-date value if it looks like one, else drop.
    if (typeof raw.year === "number") return { type: "calendar-date", value: raw };
    if (raw.start || raw.end) return { type: "calendar-date-range", value: raw };
    return null;
  }
  const type = GRID_CELL_TYPE_SET.has(raw.type) ? raw.type : "text";
  return { type, value: raw.value };
};
const coerceGridValue = (v) => {
  if (!v || typeof v !== "object" || Array.isArray(v)) return makeEmptyGrid();
  const cleanAxis = (arr) => (Array.isArray(arr) ? arr : [])
    .filter(e => e && typeof e === "object")
    .map(e => ({ id: typeof e.id === "string" && e.id ? e.id : genId(), label: typeof e.label === "string" ? e.label : "" }));
  const rows = cleanAxis(v.rows);
  const cols = cleanAxis(v.cols);
  const rowIds = new Set(rows.map(r => r.id));
  const colIds = new Set(cols.map(c => c.id));
  const cells = {};
  const srcCells = (v.cells && typeof v.cells === "object" && !Array.isArray(v.cells)) ? v.cells : {};
  for (const rid of Object.keys(srcCells)) {
    if (!rowIds.has(rid)) continue;
    const rowCells = srcCells[rid];
    if (!rowCells || typeof rowCells !== "object" || Array.isArray(rowCells)) continue;
    for (const cid of Object.keys(rowCells)) {
      if (!colIds.has(cid)) continue;
      const cell = coerceGridCell(rowCells[cid]);
      if (!cell) continue;
      // Drop text+empty (implicit default); keep non-text type choices even if blank.
      if (cell.type === "text" && gridCellIsEmpty(cell)) continue;
      if (!cells[rid]) cells[rid] = {};
      cells[rid][cid] = cell;
    }
  }
  return {
    rowAxisLabel: typeof v.rowAxisLabel === "string" ? v.rowAxisLabel : "",
    colAxisLabel: typeof v.colAxisLabel === "string" ? v.colAxisLabel : "",
    rows, cols, cells,
  };
};
const gridIsEmpty = (g) => !g || ((g.rows || []).length === 0 && (g.cols || []).length === 0);
// Walk every entry-ref cell value in a grid (used by ref-integrity sweeps).
const forEachGridRefCell = (g, fn) => {
  if (!g || !g.cells) return;
  for (const rid of Object.keys(g.cells)) {
    for (const cid of Object.keys(g.cells[rid] || {})) {
      const cell = g.cells[rid][cid];
      if (cell && cell.type === "entry-ref") fn(rid, cid, cell);
    }
  }
};
// Map every calendar-date / -range cell value through a date transform,
// returning a new grid. Non-date cells pass through untouched. Used by the
// cross-calendar convert + same-calendar reframe passes so grid-cell dates
// stay in sync with calendar edits like every other date-bearing field.
const mapGridDateCells = (g, transformDate) => {
  if (!g || !g.cells || typeof g.cells !== "object") return g;
  const ng = { ...g, cells: {} };
  for (const rid of Object.keys(g.cells)) {
    const row = g.cells[rid]; if (!row) continue;
    ng.cells[rid] = {};
    for (const cid of Object.keys(row)) {
      const cell = row[cid];
      if (cell && cell.type === "calendar-date") {
        ng.cells[rid][cid] = { ...cell, value: cell.value ? transformDate(cell.value) : cell.value };
      } else if (cell && cell.type === "calendar-date-range" && cell.value && typeof cell.value === "object") {
        ng.cells[rid][cid] = { ...cell, value: { ...cell.value,
          start: cell.value.start ? transformDate(cell.value.start) : cell.value.start,
          end: cell.value.end ? transformDate(cell.value.end) : cell.value.end } };
      } else {
        ng.cells[rid][cid] = cell;
      }
    }
  }
  return ng;
};
// True if any date cell in the grid satisfies predicate(date).
const gridHasDateCellMatching = (g, predicate) => {
  if (!g || !g.cells) return false;
  for (const rid of Object.keys(g.cells)) {
    for (const cid of Object.keys(g.cells[rid] || {})) {
      const cell = g.cells[rid][cid];
      if (!cell) continue;
      if (cell.type === "calendar-date" && predicate(cell.value)) return true;
      if (cell.type === "calendar-date-range" && cell.value && (predicate(cell.value.start) || predicate(cell.value.end))) return true;
    }
  }
  return false;
};

// Strip the fix()-resolved cache keys (those derived at load time from a
// label/name source) so pack re-import conflict detection compares AUTHORED
// intent rather than resolved ids. Without this, a pack file that declares
// showWhen / dependsOn / refs by LABEL (e.g. a hand-authored pack, or any file
// exported before the world resolved them) re-imports as a false conflict on
// every member: the world resolved the cache keys on load, the file hasn't.
// Keeps the label sources (the real authored intent) and the meaningful
// id-based authored values (refTemplatesId without a names source, dependsOn
// without a label). Recurses into group subfields.
const canonicalTemplateForReconcile = (tpl) => {
  const cleanField = (f) => {
    const nf = { ...f };
    if (nf.showWhen && typeof nf.showWhen === "object" && nf.showWhen.fieldLabel) {
      const sw = { ...nf.showWhen }; delete sw.fieldId; nf.showWhen = sw;
    }
    if (nf.dependsOnLabel) delete nf.dependsOn;
    if (nf.refTemplate) delete nf.refTemplateId;
    if (Array.isArray(nf.refTemplates)) delete nf.refTemplatesId;
    if (nf.refFilters && typeof nf.refFilters === "object" && !Array.isArray(nf.refFilters)) {
      const rf = {};
      for (const k of Object.keys(nf.refFilters)) {
        const filt = nf.refFilters[k];
        if (filt && typeof filt === "object" && filt.fieldLabel) { const c = { ...filt }; delete c.fieldId; rf[k] = c; }
        else rf[k] = filt;
      }
      nf.refFilters = rf;
    }
    if (nf.type === "group" && Array.isArray(nf.subfields)) nf.subfields = nf.subfields.map(cleanField);
    return nf;
  };
  return { ...tpl, fields: (tpl.fields || []).map(cleanField) };
};

// ─── Relation value helpers ────────────────────────────────────────────────────
// For entry-ref fields with relationKind set, values are stored as {id, label?, status?} objects
// (or arrays of them when multi). For non-relationKind entry-refs, values stay as bare IDs.
//
// Spouse-relationKind items additionally carry optional marriedOn and endedOn calendar-date
// values. These are mirrored to the partner's spouse declaration at save time so the marriage
// is a property of the pair, not of either individual's record. See computeSpouseReciprocity.

const getRelationValues = (value, isMulti) => {
  if (value == null) return [];
  if (isMulti) {
    if (!Array.isArray(value)) return [];
    return value.map(v => typeof v === "string" ? { id: v } : v).filter(v => v && v.id);
  }
  if (typeof value === "string") return value ? [{ id: value }] : [];
  if (typeof value === "object" && value.id) return [value];
  return [];
};

const getEntryRefIds = (field, value) => {
  if (value == null) return [];
  if (field.relationKind) return getRelationValues(value, field.multi).map(v => v.id);
  if (field.multi) return Array.isArray(value) ? value.filter(Boolean) : [];
  return value ? [value] : [];
};

// Detects deceased state by reading any field labeled "Status" (case-insensitive)
// with value "Deceased". Uses selectValueOnly so this works for both legacy
// bare-string select values and v1.3+ otherTextField objects ({value, customText}).
// Character.Status is otherTextField:true, so v1.3+ deceased characters store
// {value: "Deceased"} — without selectValueOnly this returned false for the
// Linea opacity dim and the Concordance hover "Living/?" treatment.
const isEntryDeceased = (entry, template) => {
  if (!entry || !template) return false;
  const statusField = template.fields.find(f => f.type === "select" && /^status$/i.test(f.label || ""));
  if (!statusField) return false;
  const raw = (entry.fields || {})[statusField.id];
  return selectValueOnly(raw).trim().toLowerCase() === "deceased";
};

// Returns true when a template represents a person-like entry whose Lifespan
// (first calendar-date-range field) should get an age suffix in the entry view.
// The signal: the template has a Status field whose options include "Deceased".
// Stronger than "is this Character template by name?" — works for user-renamed
// character templates and for custom person-like templates the user authored.
// Faction.Status doesn't include Deceased ("Defunct" / "Disbanded" / etc.), so
// Active Period correctly doesn't get age suffix.
const templateSupportsDeceased = (template) => {
  if (!template?.fields) return false;
  const statusField = template.fields.find(f => f.type === "select" && /^status$/i.test(f.label || ""));
  if (!statusField || !Array.isArray(statusField.options)) return false;
  return statusField.options.some(o => typeof o === "string" && o.toLowerCase() === "deceased");
};

// ─── Spouse reciprocity ────────────────────────────────────────────────────────
// Marriage is a property of the pair (Alice and Bob), not of either record alone.
// To prevent the "both was and wasn't married" failure mode, when an entry is saved
// we diff its spouse declarations against the pre-save state and apply matching
// adds/removes/updates to the partner's entry. Status (active/former/estranged) and
// the marriedOn/endedOn dates are mirrored; the per-side override label ("Husband"/
// "Wife"/etc.) is NOT mirrored — it's speaker-relative.
//
// Constraints / known limits:
//   - Mirror lands on the FIRST spouse-relationKind field on the partner's template.
//     Templates with multiple spouse fields are unusual; first match wins.
//   - If the partner's template has NO spouse-relationKind field, the mirror is
//     skipped silently (logged to console). Cleanest defense: just don't write.
//   - Existing non-reciprocal data on world load is left as-is. We do not
//     aggressively normalize old saves.
//   - Locked-world guard lives at the call site (saveEntry).
//
// Returns Map<partnerId, updatedFieldsObject>. The caller merges these into state.

// For one entry's fields under a given template, returns Map<partnerId, {status, marriedOn, endedOn}>
// covering every spouse declared across all spouse-relationKind fields. If the same partner
// appears in multiple spouse fields (degenerate template), last write wins.
const getSpouseDeclMap = (template, fields) => {
  const map = new Map();
  if (!template || !Array.isArray(template.fields)) return map;
  for (const f of template.fields) {
    if (f.type !== "entry-ref" || f.relationKind !== SPOUSE_KIND) continue;
    const items = getRelationValues((fields || {})[f.id], f.multi);
    for (const it of items) {
      if (!it || !it.id) continue;
      map.set(it.id, {
        status: it.status || "active",
        marriedOn: it.marriedOn || null,
        endedOn: it.endedOn || null,
      });
    }
  }
  return map;
};

// Walk the partner's spouse-relationKind fields. Update every declaration whose id
// matches `selfId` to carry the new dates+status. Returns the cloned-and-edited
// fields object for the partner.
const mirrorUpdateOnPartner = (partner, partnerTpl, selfId, data) => {
  const cloned = JSON.parse(JSON.stringify(partner.fields || {}));
  let touched = false;
  for (const f of partnerTpl.fields) {
    if (f.type !== "entry-ref" || f.relationKind !== SPOUSE_KIND) continue;
    const items = getRelationValues(cloned[f.id], f.multi);
    let fieldTouched = false;
    const next = items.map(it => {
      if (it.id !== selfId) return it;
      fieldTouched = true;
      const updated = { ...it };
      // Carry status/marriedOn/endedOn from the new shape; leave label alone.
      updated.status = data.status || "active";
      if (data.marriedOn) updated.marriedOn = data.marriedOn; else delete updated.marriedOn;
      if (data.endedOn) updated.endedOn = data.endedOn; else delete updated.endedOn;
      return updated;
    });
    if (fieldTouched) {
      cloned[f.id] = f.multi ? next : (next[0] || null);
      touched = true;
    }
  }
  return touched ? cloned : null;
};

// Walk the partner's spouse-relationKind fields. Remove every declaration whose id
// matches `selfId`. Returns cloned-and-edited fields object, or null if nothing changed.
const mirrorRemoveOnPartner = (partner, partnerTpl, selfId) => {
  const cloned = JSON.parse(JSON.stringify(partner.fields || {}));
  let touched = false;
  for (const f of partnerTpl.fields) {
    if (f.type !== "entry-ref" || f.relationKind !== SPOUSE_KIND) continue;
    const items = getRelationValues(cloned[f.id], f.multi);
    const filtered = items.filter(it => it.id !== selfId);
    if (filtered.length !== items.length) {
      cloned[f.id] = f.multi ? filtered : null;
      touched = true;
    }
  }
  return touched ? cloned : null;
};

// Add a reciprocal spouse declaration. If the partner already has a declaration of
// `selfId` (somehow — perhaps from an earlier non-reciprocal world), update it.
// Otherwise append to the FIRST spouse-relationKind field. Single-value fields that
// are already occupied by a different spouse refuse the add (logged) — that's a
// data-conflict signal worth surfacing rather than silently overwriting.
const mirrorAddOnPartner = (partner, partnerTpl, selfId, data) => {
  // First try update path: if a declaration of selfId already exists, just update it.
  const updated = mirrorUpdateOnPartner(partner, partnerTpl, selfId, data);
  if (updated) return updated;

  // Otherwise, find the first spouse-relationKind field and append.
  const firstSpouseField = partnerTpl.fields.find(f =>
    f.type === "entry-ref" && f.relationKind === SPOUSE_KIND
  );
  if (!firstSpouseField) {
    console.warn(`[spouse reciprocity] partner ${partner.id} has no spouse field; skipping mirror add`);
    return null;
  }

  const cloned = JSON.parse(JSON.stringify(partner.fields || {}));
  const newItem = { id: selfId, status: data.status || "active" };
  if (data.marriedOn) newItem.marriedOn = data.marriedOn;
  if (data.endedOn) newItem.endedOn = data.endedOn;

  if (firstSpouseField.multi) {
    const items = getRelationValues(cloned[firstSpouseField.id], true);
    cloned[firstSpouseField.id] = [...items, newItem];
  } else {
    const existing = getRelationValues(cloned[firstSpouseField.id], false);
    if (existing.length > 0 && existing[0].id !== selfId) {
      console.warn(
        `[spouse reciprocity] partner ${partner.id} has single-value spouse field ` +
        `already pointing at ${existing[0].id}; refusing to overwrite with mirror to ${selfId}`
      );
      return null;
    }
    cloned[firstSpouseField.id] = newItem;
  }
  return cloned;
};

// Main reciprocity compute. Reconciles partner declarations on every save:
// for every currently-declared spouse, ensure the partner has a matching
// declaration (add or update as needed); for every spouse that was previously
// declared but isn't now, remove the partner's reciprocal. Idempotent — when
// the partner's record already matches what we'd write, we skip the update so
// updatedAt doesn't get spuriously bumped. This is what implements the
// doctrine principle "load is non-destructive but save reconciles": old
// asymmetric data (a spouse declared one-sidedly in a pre-v1.2 world) gets
// fixed the first time either side is saved.
const computeSpouseReciprocity = (selfId, prevFields, newFields, selfTpl, allEntries, allTemplates) => {
  const updates = new Map();
  if (!selfTpl) return updates;

  const prevMap = getSpouseDeclMap(selfTpl, prevFields);
  const newMap = getSpouseDeclMap(selfTpl, newFields);

  // Phase 1: removals — partners declared previously but not now.
  for (const pid of prevMap.keys()) {
    if (newMap.has(pid)) continue;
    if (pid === selfId) continue;
    const partner = allEntries.find(e => e.id === pid);
    if (!partner) continue;
    const partnerTpl = allTemplates.find(t => t.id === partner.templateId);
    if (!partnerTpl) continue;
    const removed = mirrorRemoveOnPartner(partner, partnerTpl, selfId);
    if (removed) updates.set(pid, removed);
  }

  // Phase 2: ensure reciprocal for every currently-declared spouse.
  // mirrorAddOnPartner does update-then-fall-back-to-add internally.
  for (const [pid, data] of newMap) {
    if (pid === selfId) continue;
    const partner = allEntries.find(e => e.id === pid);
    if (!partner) continue;
    const partnerTpl = allTemplates.find(t => t.id === partner.templateId);
    if (!partnerTpl) continue;
    const ensured = mirrorAddOnPartner(partner, partnerTpl, selfId, data);
    if (!ensured) continue;
    // No-op skip: if the partner already matches what we'd write, don't
    // touch them. Keeps non-edited partners' updatedAt stable.
    if (JSON.stringify(ensured) === JSON.stringify(partner.fields || {})) continue;
    updates.set(pid, ensured);
  }

  return updates;
};

// Validate spouse marriage dates: when both marriedOn and endedOn are set,
// endedOn must not precede marriedOn. Returns an array of human-readable
// error strings (empty if valid). Caller flashes these and aborts the save.
// Same-day end/start is allowed (e.g., same-day annulment).
const validateSpouseDates = (template, fields, entriesById) => {
  if (!template) return [];
  const errors = [];
  for (const f of template.fields) {
    if (f.type !== "entry-ref" || f.relationKind !== SPOUSE_KIND) continue;
    const items = getRelationValues(fields[f.id], f.multi);
    for (const it of items) {
      if (!it.marriedOn || !it.endedOn) continue;
      if (it.marriedOn.year == null || it.endedOn.year == null) continue;
      if (cmpCalendarDates(it.endedOn, it.marriedOn) < 0) {
        const partner = entriesById?.[it.id];
        const name = partner?.name || "(unknown spouse)";
        errors.push(`Marriage to ${name}: end date is before start date.`);
      }
    }
  }
  return errors;
};

// ─── Reference integrity ───────────────────────────────────────────────────────
// Sweep entry-ref values pointing at deleted IDs out of every entry's fields.
// Used when deleting an entry (Bug 4) and when deleting a template + its entries
// (Bug 5). Recurses into repeating-group subfields.
const scrubEntryRefs = (entries, templates, deletedIds) => {
  if (!deletedIds || deletedIds.size === 0) return entries;
  const tplById = Object.fromEntries(templates.map(t => [t.id, t]));
  const scrubFields = (fields, valueMap) => {
    if (!fields || !valueMap) return false;
    let changed = false;
    fields.forEach(f => {
      if (f.type === "entry-ref") {
        const v = valueMap[f.id];
        if (v == null || v === "") return;
        if (Array.isArray(v)) {
          const filtered = v.filter(item => {
            const id = typeof item === "string" ? item : item?.id;
            return id && !deletedIds.has(id);
          });
          if (filtered.length !== v.length) { valueMap[f.id] = filtered; changed = true; }
        } else if (typeof v === "object") {
          if (v.id && deletedIds.has(v.id)) { valueMap[f.id] = null; changed = true; }
        } else if (typeof v === "string") {
          if (deletedIds.has(v)) { valueMap[f.id] = ""; changed = true; }
        }
      } else if (f.type === "group" && Array.isArray(valueMap[f.id])) {
        valueMap[f.id].forEach(inst => {
          if (scrubFields(f.subfields || [], inst)) changed = true;
        });
      } else if (f.type === "grid") {
        forEachGridRefCell(valueMap[f.id], (rid, cid, cell) => {
          if (typeof cell.value === "string" && deletedIds.has(cell.value)) { cell.value = ""; changed = true; }
        });
      }
    });
    return changed;
  };
  return entries.map(e => {
    const tpl = tplById[e.templateId];
    if (!tpl || !e.fields) return e;
    const cleanFields = JSON.parse(JSON.stringify(e.fields));
    const changed = scrubFields(tpl.fields, cleanFields);
    if (!changed) return e;
    return { ...e, fields: cleanFields, updatedAt: isoNow() };
  });
};

// Strip self-references from all entry-ref fields. Self-refs are never
// legitimate (a person can't be their own parent, a faction can't be its own
// ally) and the editor now blocks them at input time. This pass cleans up
// any pre-existing self-refs in older world files. Called from the migrate
// path; safe to run on every load.
const scrubSelfRefs = (entries, templates) => {
  const tplById = Object.fromEntries(templates.map(t => [t.id, t]));
  const scrubFields = (fields, valueMap, selfId) => {
    if (!fields || !valueMap) return false;
    let changed = false;
    fields.forEach(f => {
      if (f.type === "entry-ref") {
        const v = valueMap[f.id];
        if (v == null || v === "") return;
        if (Array.isArray(v)) {
          const filtered = v.filter(item => {
            const id = typeof item === "string" ? item : item?.id;
            return id && id !== selfId;
          });
          if (filtered.length !== v.length) { valueMap[f.id] = filtered; changed = true; }
        } else if (typeof v === "object") {
          if (v.id && v.id === selfId) { valueMap[f.id] = null; changed = true; }
        } else if (typeof v === "string") {
          if (v === selfId) { valueMap[f.id] = ""; changed = true; }
        }
      } else if (f.type === "group" && Array.isArray(valueMap[f.id])) {
        valueMap[f.id].forEach(inst => {
          if (scrubFields(f.subfields || [], inst, selfId)) changed = true;
        });
      } else if (f.type === "grid") {
        forEachGridRefCell(valueMap[f.id], (rid, cid, cell) => {
          if (cell.value === selfId) { cell.value = ""; changed = true; }
        });
      }
    });
    return changed;
  };
  let anyChanged = false;
  const next = entries.map(e => {
    const tpl = tplById[e.templateId];
    if (!tpl || !e.fields) return e;
    const cleanFields = JSON.parse(JSON.stringify(e.fields));
    const changed = scrubFields(tpl.fields, cleanFields, e.id);
    if (!changed) return e;
    anyChanged = true;
    return { ...e, fields: cleanFields, updatedAt: isoNow() };
  });
  return anyChanged ? next : entries;
};

// ─── v1.3 select / cascade / required helpers ──────────────────────────────────

// Display helper for select field values. Handles three shapes:
//  - undefined / null / "" → ""
//  - bare string (legacy flat select OR otherTextField-disabled) → the string
//  - object {value, customText} (otherTextField enabled) → customText if non-empty, else value
// The "Other" string itself never reaches a display surface when customText is populated —
// the user's freeform classification replaces it everywhere.
const formatSelectDisplay = (v) => {
  if (v == null || v === "") return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    const ct = (v.customText || "").trim();
    if (ct) return ct;
    return v.value || "";
  }
  return "";
};

// Extract the dropdown-selection portion of a select value, ignoring any custom text.
// Used internally when checking option-membership / cascade-child option resolution.
const selectValueOnly = (v) => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") return v.value || "";
  return "";
};

// For a cascade child field, resolve the option list it should show, based on the
// current value of its parent field. Returns [] if parent has no value (caller
// disables the child dropdown), or if parent's value has no entry in optionsByParent.
const cascadeChildOptions = (field, allValues) => {
  if (!field.dependsOn || !field.optionsByParent) return field.options || [];
  const parentValRaw = allValues?.[field.dependsOn];
  const parentVal = selectValueOnly(parentValRaw);
  if (!parentVal) return [];
  return field.optionsByParent[parentVal] || [];
};

// Conditional visibility for a field, gated by another field's current value.
// Schema on the dependent field:
//   showWhen: { fieldLabel: "<parent field's label>", values: ["A", "B", ...] }
// resolveTemplateRefs converts fieldLabel → fieldId on the same template.
// When showWhen.fieldId is unresolved or the schema is malformed, the field is
// visible (fail-open so missing config doesn't silently hide data).
// Stored data on a hidden field is preserved — re-displaying happens automatically
// when the parent's value matches again. No data loss on parent-value oscillation.
const isFieldVisible = (field, allValues) => {
  if (!field.showWhen) return true;
  const cfg = field.showWhen;
  if (!cfg.fieldId || !Array.isArray(cfg.values)) return true;
  const raw = allValues?.[cfg.fieldId];
  // v1.5: a multi-select parent stores an array; the field shows when the
  // parent's picks overlap the showWhen values (any common option). Scalar
  // parents (select) keep the exact-match behavior.
  if (Array.isArray(raw)) return raw.some(v => cfg.values.includes(v));
  const parentVal = selectValueOnly(raw);
  return cfg.values.includes(parentVal);
};

// ─── Half-width pair layout (v1.3) ──────────────────────────────────────────
// Half-width fields render in pairs of two side-by-side, compressing visual
// scroll length on dense templates. The renderer groups consecutive
// half-width-eligible fields into side-by-side pairs; a lone half-eligible
// field with no half-eligible neighbor auto-expands to full width rather
// than sit at half with a permanent blank slot.
//
// Eligibility is purely type-based: text, number, date, calendar-date, color,
// url, tags, select, single entry-ref. Other types always render full-width
// because their internal layout doesn't fit in half a row — textarea needs
// horizontal prose room, name-history is a multi-column grid, group
// (repeating-group) has its own internal subfield layout, entry-ref with
// multi: true is a variable-length chip list that wraps unpredictably,
// calendar-date-range has two pickers side-by-side internally, and image
// previews are too tall to share a row.
//
// The legacy `halfWidth: true` flag on built-in fields is now inert (kept
// in place for migration stability; doesn't affect rendering anymore).
const HALF_WIDTH_ELIGIBLE_TYPES = new Set([
  "text", "number", "date", "calendar-date",
  "color", "url", "tags", "select", "entry-ref",
]);
const isFieldHalfWidthEligible = (field) => {
  if (!field) return false;
  if (!HALF_WIDTH_ELIGIBLE_TYPES.has(field.type)) return false;
  // entry-ref must be single-value; multi-value is a chip list and stays full
  if (field.type === "entry-ref" && field.multi) return false;
  return true;
};

// Walk template fields in declared order, emit layout units:
//   { kind: "pair", a, b }  — two adjacent half-width-eligible fields
//   { kind: "full", field } — single full-width row (also covers a half-width
//                              field with no half-width neighbor: auto-expand
//                              to full rather than sit at half with a permanent
//                              blank slot)
//
// Visibility filtering: pairing operates on the filtered visible field list,
// not the raw declared list. When a field is hidden (showWhen unmet, secret-
// gated, or empty-suppressed in display mode), it's skipped before pairing
// runs. The visible field that would have been its pair partner finds its
// new partner in the next visible half-eligible field, or auto-expands to
// full if it has no remaining half-eligible neighbor. Avoids the asymmetric
// blank-slot rendering problem when showWhen or empty-suppression takes one
// half of a structurally-declared pair out of the picture.
//
// Callers pass an `isVisible(field)` predicate that encodes mode-specific
// visibility (edit mode: secret + showWhen; display mode: same plus empty).
// Predicate defaults to "everything visible" when omitted.
const buildFieldLayoutUnits = (fields, isVisible) => {
  const filter = isVisible || (() => true);
  const arr = (fields || []).filter(filter);
  const units = [];
  let i = 0;
  while (i < arr.length) {
    const f = arr[i];
    const next = arr[i + 1];
    if (isFieldHalfWidthEligible(f) && isFieldHalfWidthEligible(next)) {
      units.push({ kind: "pair", a: f, b: next });
      i += 2;
    } else {
      // Either f is full-width, or f is half-width with no half-width neighbor.
      // Both cases render as a full-width row.
      units.push({ kind: "full", field: f });
      i += 1;
    }
  }
  return units;
};

// Visibility predicate helpers paired with buildFieldLayoutUnits.
const isFieldVisibleEdit = (field, fieldValues, showSecrets) => {
  if (field.secret && !showSecrets) return false;
  if (!isFieldVisible(field, fieldValues)) return false;
  return true;
};
const isFieldVisibleDisplay = (field, fieldValues, showSecrets) => {
  if (field.secret && !showSecrets) return false;
  if (!isFieldVisible(field, fieldValues)) return false;
  const val = fieldValues[field.id];
  if (val === "" || val == null) return false;
  if (Array.isArray(val) && val.length === 0) return false;
  return true;
};

// Validate required-field constraints on an entry's field values. Returns array of
// human-readable error strings (empty if valid). Caller flashes these and aborts save.
// Per spec: "non-empty value" rules vary by field type. Cascade-child fields that are
// disabled because their parent has no value count as "not required to fill" (since
// the user couldn't fill them anyway) — but a parent with no value will trigger its
// own required error if it's required, which is the right diagnostic.
const validateRequiredFields = (template, fields) => {
  if (!template) return [];
  const errors = [];
  const fieldVals = fields || {};
  for (const f of (template.fields || [])) {
    if (!f.required) continue;

    // Conditionally-visible fields: skip required check when hidden. The user
    // can't fill a field they can't see; required on a hidden field would block
    // saves with no actionable diagnostic.
    if (!isFieldVisible(f, fieldVals)) continue;

    // Cascade-child special case: if parent is empty, skip child (parent's required
    // error will fire instead, which is the actionable one).
    if (f.dependsOn) {
      const parentVal = selectValueOnly(fieldVals[f.dependsOn]);
      if (!parentVal) continue;
    }

    const v = fieldVals[f.id];
    let missing = false;
    if (v == null) missing = true;
    else if (typeof v === "string" && !v.trim()) missing = true;
    else if (Array.isArray(v) && v.length === 0) missing = true;
    else if (f.type === "select") {
      const sel = selectValueOnly(v);
      if (!sel) missing = true;
      // Other + otherTextField + empty customText: counts as missing — "Other" alone
      // isn't a real classification, the user must commit to either a real option or
      // a typed custom value.
      else if (f.otherTextField && sel === "Other") {
        const ct = (typeof v === "object" ? (v.customText || "") : "").trim();
        if (!ct) missing = true;
      }
    } else if (f.type === "entry-ref") {
      if (f.relationKind) {
        const items = getRelationValues(v, f.multi);
        if (items.length === 0) missing = true;
      } else if (f.multi) {
        if (!Array.isArray(v) || v.filter(Boolean).length === 0) missing = true;
      } else {
        if (!v) missing = true;
      }
    } else if (f.type === "number") {
      if (typeof v !== "number" || Number.isNaN(v)) missing = true;
    } else if (f.type === "calendar-date") {
      if (!v || v.year == null) missing = true;
    } else if (f.type === "calendar-date-range") {
      if (!v || (v.start?.year == null && v.end?.year == null)) missing = true;
    } else if (f.type === "name-history") {
      if (!Array.isArray(v) || v.filter(r => r && (r.name || "").trim()).length === 0) missing = true;
    } else if (f.type === "group") {
      if (!Array.isArray(v) || v.length === 0) missing = true;
    } else if (f.type === "grid") {
      if (gridIsEmpty(coerceGridValue(v))) missing = true;
    } else if (f.type === "tags") {
      // tags field type — string of comma-separated tags
      if (typeof v !== "string" || !v.trim()) missing = true;
    }

    if (missing) {
      const label = f.label || "(unnamed field)";
      // Special diagnostic for the Other-without-text case so the user knows what to do
      if (f.type === "select" && f.otherTextField && selectValueOnly(v) === "Other") {
        errors.push(`${label}: please type a custom value or pick another option.`);
      } else {
        errors.push(`${label}: required.`);
      }
    }
  }
  return errors;
};