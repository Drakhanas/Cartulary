
// ─── Field normalization ───────────────────────────────────────────────────────
// Single source of truth for "what does a clean entry's fields look like." Used
// both by migrate (to scrub data on load/import) and by saveEntry (to scrub
// data before persisting an edit). Operates on a single entry's value map in
// place; recurses into repeating groups.
//
// Cleans:
//  - entry-ref values: legacy string IDs → {id} objects, drop dangling refs
//  - tags arrays → canonical comma-separated strings
//  - name-history arrays: drop empty-name rows, coerce from/to dates
//  - calendar-date / calendar-date-range zombies ({year:null,...} → null)
//  - group instance values (recursive)
//
// Idempotent: running on already-clean data is a no-op.
const isCalendarDateZombie = (d) => d != null && typeof d === "object" && d.year == null;
const cleanCalendarDate = (d) => isCalendarDateZombie(d) ? null : d;

const normalizeEntryFields = (fields, valueMap) => {
  if (!Array.isArray(fields) || !valueMap || typeof valueMap !== "object") return;
  fields.forEach(f => {
    if (f.type === "entry-ref" && f.relationKind) {
      const v = valueMap[f.id];
      if (v == null) return;
      const cleanSpouseItem = (item) => {
        if (f.relationKind !== SPOUSE_KIND) return item;
        const out = { ...item };
        // marriedOn/endedOn are calendar-date shaped. Strip {year:null,...} zombies
        // and drop the keys entirely when null so saves stay tidy.
        if ("marriedOn" in out) {
          const c = cleanCalendarDate(out.marriedOn);
          if (c == null) delete out.marriedOn; else out.marriedOn = c;
        }
        if ("endedOn" in out) {
          const c = cleanCalendarDate(out.endedOn);
          if (c == null) delete out.endedOn; else out.endedOn = c;
        }
        return out;
      };
      if (f.multi) {
        if (Array.isArray(v)) {
          valueMap[f.id] = v
            .map(item => typeof item === "string" ? { id: item } : item)
            .filter(item => item && item.id)
            .map(cleanSpouseItem);
        }
      } else {
        if (typeof v === "string" && v) valueMap[f.id] = { id: v };
        else if (typeof v === "object" && !v.id) valueMap[f.id] = null;
        else if (typeof v === "object" && v.id) valueMap[f.id] = cleanSpouseItem(v);
      }
    } else if (f.type === "tags" && Array.isArray(valueMap[f.id])) {
      // Editor and renderer expect comma-separated strings. Imports and older
      // data sometimes use arrays; canonicalize on read.
      valueMap[f.id] = valueMap[f.id]
        .filter(t => t != null && String(t).trim() !== "")
        .map(t => String(t).trim())
        .join(", ");
    } else if (f.type === "calendar-date") {
      // Strip zombies: {year:null,...} from old saves where the picker leaked
      // partial state. Year is the only "is set" signal; without it, drop.
      if (isCalendarDateZombie(valueMap[f.id])) valueMap[f.id] = null;
    } else if (f.type === "calendar-date-range") {
      const v = valueMap[f.id];
      if (v == null) return;
      const start = cleanCalendarDate(v.start);
      const end = cleanCalendarDate(v.end);
      // Both halves null → collapse the whole range to null. Otherwise keep
      // the range with cleaned halves.
      if (start == null && end == null) valueMap[f.id] = null;
      else valueMap[f.id] = { ...v, start, end };
    } else if (f.type === "name-history") {
      const v = valueMap[f.id];
      if (v == null) return;
      if (!Array.isArray(v)) {
        valueMap[f.id] = [];
        return;
      }
      // Drop rows with empty/missing names (the "I added a row but never typed
      // anything" case). Coerce from/to to null when year is missing — even if
      // an older save leaked a {year:null,monthIndex:0,day:1} zombie.
      valueMap[f.id] = v
        .filter(item => item && typeof item === "object" && typeof item.name === "string" && item.name.trim() !== "")
        .map(item => ({
          name: item.name.trim(),
          from: (item.from && typeof item.from === "object" && item.from.year != null) ? item.from : null,
          to: (item.to && typeof item.to === "object" && item.to.year != null) ? item.to : null,
        }));
    } else if (f.type === "group" && Array.isArray(valueMap[f.id])) {
      valueMap[f.id].forEach(inst => normalizeEntryFields(f.subfields || [], inst));
    } else if (f.type === "multiselect") {
      // v1.5: array of chosen option strings. Coerce non-arrays (import / shape
      // drift); tolerate a comma-separated string. Unknown values are kept (an
      // option later removed from the set shouldn't silently drop the pick,
      // same posture as the variant filter's stale values).
      const v = valueMap[f.id];
      if (v == null) valueMap[f.id] = [];
      else if (Array.isArray(v)) valueMap[f.id] = v.filter(x => x != null && String(x).trim() !== "").map(x => String(x).trim());
      else if (typeof v === "string") valueMap[f.id] = v.split(",").map(s => s.trim()).filter(Boolean);
      else valueMap[f.id] = [];
    } else if (f.type === "select") {
      // v1.3: select fields can have two new behaviors that require normalization.
      //
      // 1. otherTextField: storage shape is {value, customText} when enabled.
      //    Legacy bare-string values (from worlds saved before otherTextField was
      //    enabled on this field) coerce to the object shape with empty customText.
      //    Switching the dropdown away from "Other" clears customText (handled in
      //    editor, but defensive-redo here in case it leaked).
      if (f.otherTextField) {
        const v = valueMap[f.id];
        if (v == null) {
          valueMap[f.id] = null;
        } else if (typeof v === "string") {
          valueMap[f.id] = { value: v, customText: "" };
        } else if (typeof v === "object") {
          const value = v.value || "";
          const customText = (v.customText || "").toString();
          // Sanity: customText only meaningful when value is "Other".
          // If the dropdown isn't on Other, drop customText to keep storage tidy.
          if (value !== "Other") {
            valueMap[f.id] = { value, customText: "" };
          } else {
            valueMap[f.id] = { value, customText };
          }
        }
      }
      // 2. Cascade child (dependsOn): if the stored dropdown value isn't in the
      //    current optionsByParent[parentValue] list, clear it silently. This is
      //    the defensive cleanup for hand-edited JSON, version-skewed worlds, or
      //    parent-option renames that left the child orphaned.
      if (f.dependsOn) {
        const parentVal = selectValueOnly(valueMap[f.dependsOn]);
        const ownVal = selectValueOnly(valueMap[f.id]);
        if (parentVal && ownVal) {
          const allowed = (f.optionsByParent || {})[parentVal] || [];
          if (!allowed.includes(ownVal)) {
            // Orphan — clear. Preserve object shape if otherTextField is enabled.
            if (f.otherTextField) {
              valueMap[f.id] = { value: "", customText: "" };
            } else {
              valueMap[f.id] = "";
            }
          }
        } else if (!parentVal && ownVal) {
          // Parent has no value — child can't be valid either. Clear.
          if (f.otherTextField) {
            valueMap[f.id] = { value: "", customText: "" };
          } else {
            valueMap[f.id] = "";
          }
        }
      }
    }
  });
};

// ─── Migration ─────────────────────────────────────────────────────────────────

// v1.7 r004: point a reference field that lists a retired template at the
// source the template's records moved to, names and ids together.
// `retired.isId` says which ids are the retired template's; `single` and
// `singleName` replace it in a single-target field, `multi` and
// `multiNames` in a multi-target one, which can take more than one. In the
// name list the retired template's names (`names`) give way to the new
// ones, a new name missing from it is added, and none is listed twice.
// Group subfields are the caller's to walk.
const retargetRetired = (f, retired) => {
  if (!f || f.type !== "entry-ref") return;
  if (f.refTemplateId && retired.isId(f.refTemplateId)) {
    f.refTemplateId = retired.single;
    f.refTemplate = retired.singleName;
  }
  if (Array.isArray(f.refTemplatesId) && f.refTemplatesId.some(retired.isId)) {
    const ids = [];
    f.refTemplatesId.forEach(id => (retired.isId(id) ? retired.multi : [id]).forEach(x => {
      if (!ids.includes(x)) ids.push(x);
    }));
    f.refTemplatesId = ids;
    if (Array.isArray(f.refTemplates)) {
      const names = [];
      const add = (n) => { if (!names.includes(n)) names.push(n); };
      f.refTemplates.forEach(n => (retired.names.includes(n) ? retired.multiNames : [n]).forEach(add));
      retired.multiNames.forEach(add);
      f.refTemplates = names;
    }
  }
};

const migrate = (state) => {
  // Currently only schemaVersion 1 exists. Future migrations go here.
  if (!state || typeof state !== "object") return null;
  // Defensive clone: migrate is allowed to mutate freely without touching the caller's object (Bug 11)
  state = JSON.parse(JSON.stringify(state));
  if (!state.schemaVersion) state.schemaVersion = SCHEMA_VERSION;
  if (state.schemaVersion > SCHEMA_VERSION) return null; // can't downgrade
  // Ensure required shape
  if (!state.world) state.world = { name: "Untitled World", description: "", imageFolder: "world-images", locked: false };
  if (!Array.isArray(state.templates)) state.templates = [];
  if (!Array.isArray(state.entries)) state.entries = [];
  if (!Array.isArray(state.stemmas)) state.stemmas = [];
  // Cartographia maps slice (v1.6 r001): promote kind:"map" entries to a flat
  // slice. One pass, idempotent, defensive. Runs BEFORE the concordance-position
  // validation below so getRegisteredGraphNodes there already sees migrated maps
  // (their preserved entry ids stay valid graph-node ids). Nothing destroyed:
  // the three built-in fields remap by label onto the fixed schema ids; tags,
  // name, id, mapData carry verbatim; any custom field from a user-made map
  // template is preserved under its original id and recorded in Notes.
  if (!Array.isArray(state.cartographia)) state.cartographia = [];
  // v1.7 r004: the map templates this load retires, noted before the block
  // below removes them, for the repair after r002's name sync to point the
  // reference fields that list them at the maps. Pointed there before that
  // sync, a field would come out of it with Map listed twice.
  const promotedMapTemplates = state.templates
    .filter(t => t && t.kind === "map")
    .map(t => ({ id: t.id, name: t.name }));
  {
    const mapTpls = state.templates.filter(t => t && t.kind === "map");
    const mapTplIds = new Set(mapTpls.map(t => t.id));
    if (mapTplIds.size > 0 && Array.isArray(state.entries)) {
      // per-template fieldId -> label, to translate the random-suffixed seed ids
      const labelOf = {}; // `${tplId}::${fieldId}` -> label
      mapTpls.forEach(t => (Array.isArray(t.fields) ? t.fields : []).forEach(f => {
        if (f && typeof f.id === "string") labelOf[`${t.id}::${f.id}`] = (f.label || "");
      }));
      const schemaIdByLabel = {}; // lowercased label -> fixed schema id
      cartographiaMapSchema().fields.forEach(f => { schemaIdByLabel[(f.label || "").toLowerCase()] = f.id; });
      const notesId = schemaIdByLabel["notes"] || CART_FIELD_NOTES;
      const already = new Set(state.cartographia.map(m => m && m.id).filter(Boolean));
      const moveIds = new Set();
      state.entries.forEach(e => {
        if (!e || !mapTplIds.has(e.templateId)) return;
        moveIds.add(e.id);
        if (already.has(e.id)) return; // idempotency: already migrated, just drop the stray entry
        const srcFields = (e.fields && typeof e.fields === "object") ? e.fields : {};
        const newFields = {};
        const preservedExtra = [];
        Object.keys(srcFields).forEach(fid => {
          const label = labelOf[`${e.templateId}::${fid}`];
          const mapped = (typeof label === "string") ? schemaIdByLabel[label.toLowerCase()] : undefined;
          if (mapped) {
            newFields[mapped] = srcFields[fid];
          } else {
            newFields[fid] = srcFields[fid]; // custom field: preserved-but-unrendered
            const v = srcFields[fid];
            const hasVal = v != null && !(typeof v === "string" && v.trim() === "") && !(Array.isArray(v) && v.length === 0);
            if (hasVal && label) preservedExtra.push(label);
          }
        });
        if (preservedExtra.length > 0) {
          const note = `Migrated from a custom map template; these fields are preserved but no longer shown: ${preservedExtra.join(", ")}.`;
          const existing = (typeof newFields[notesId] === "string") ? newFields[notesId] : "";
          newFields[notesId] = existing ? `${existing}\n\n${note}` : note;
        }
        const md = (e.mapData && typeof e.mapData === "object") ? e.mapData : null;
        state.cartographia.push({
          id: e.id,
          name: e.name || "Untitled Map",
          tags: Array.isArray(e.tags) ? e.tags : [],
          fields: newFields,
          mapData: {
            image: md && typeof md.image === "string" ? md.image : null,
            pins: md && Array.isArray(md.pins) ? md.pins : [],
          },
          updatedAt: e.updatedAt || isoNow(),
        });
      });
      if (moveIds.size > 0) state.entries = state.entries.filter(e => e && !moveIds.has(e.id));
      // Remove the kind:"map" template(s) regardless of origin: post-promotion a
      // map-kind template is inert (entries swept, kind does nothing, the builder
      // can no longer create one), so a leftover user-origin one would be an
      // orphan. Its data is already preserved in the slice above.
      state.templates = state.templates.filter(t => !(t && t.kind === "map"));
    }
  }
  // Map drawing model (v1.6 pillar 3, r031): every map record carries
  // mapData.drawing. Backfilled through ensureMapData so a pre-pillar-3 world
  // loads with an empty default drawing (one layer, vellum background) and a
  // malformed drawing coerces to defaults rather than throwing. Idempotent:
  // a normalized record passes through unchanged. Null entries in the slice
  // are dropped; records are never dropped.
  state.cartographia = state.cartographia
    .filter(m => m && typeof m === "object")
    .map(m => ({ ...m, mapData: ensureMapData(m.mapData) }));
  // Imported map stamps (v1.6 pillar 3). Empty until stamp packs land.
  state.mapStamps = ensureMapStamps(state.mapStamps);
  // Packs (v1.5): backfill the slice for pre-pack worlds, and defensively
  // normalize each pack's shape so downstream reads can assume {id, name,
  // description, templateIds:[...]}. Dangling ids (templates since deleted) are
  // left in place — they resolve to nothing and the sidebar simply skips them;
  // removing them here would be a silent destroy of user grouping intent.
  if (!Array.isArray(state.packs)) state.packs = [];
  state.packs = state.packs
    .filter(p => p && typeof p === "object" && typeof p.id === "string")
    .map(p => ({
      id: p.id,
      name: typeof p.name === "string" && p.name.trim() ? p.name : "Untitled Pack",
      description: typeof p.description === "string" ? p.description : "",
      templateIds: Array.isArray(p.templateIds) ? p.templateIds.filter(id => typeof id === "string") : [],
    }));
  // currentMoment: world-level "story now" anchor used by auto-age computation
  // on character-template entries. Shape: { year, monthIndex, day } in primary's
  // frame, or null. Stored Y/M/D (not absoluteDay) so it follows the calendar-
  // position invariance doctrine — under primary structural edits the displayed
  // moment stays "15 Mistfall 480 IA" rather than the absoluteDay floating to a
  // different Y/M/D. Consumers derive absoluteDay via calendarDateToAbsoluteDay
  // at read time. Older worlds (pre-v1.4-auto-age) have no field — default to
  // null. Defensive: wrong shape resets to null.
  if (state.world.currentMoment !== undefined) {
    const cm = state.world.currentMoment;
    if (cm === null) {
      // explicit null is fine
    } else if (typeof cm === "object" && Number.isFinite(cm.year)) {
      // Coerce monthIndex/day into safe ints, default to 0/1
      const monthIndex = Number.isFinite(cm.monthIndex) ? Math.max(0, Math.floor(cm.monthIndex)) : 0;
      const day = Number.isFinite(cm.day) ? Math.max(1, Math.floor(cm.day)) : 1;
      state.world.currentMoment = { year: Math.floor(cm.year), monthIndex, day };
    } else {
      state.world.currentMoment = null;
    }
  } else {
    state.world.currentMoment = null;
  }
  // Variant filter axis (v1.5): world-level config naming a per-template
  // select field (by LABEL, since field ids differ per template) as the
  // world's "variant axis" — e.g. "Edition" for the Game Mechanics pack's
  // 2014/2024 split, or "Era" for world-age splits — plus an optional
  // all-variants flag field (a Yes/No select; "Yes" = entry belongs to every
  // variant). Shape: null | { fieldLabel, flagLabel, active }. null = feature
  // dormant (no UI, no filtering) — every pre-existing world lands here.
  // `active` is the currently selected variant value ("" = show all),
  // persisted so a world stays in its chosen variant across reloads.
  // Defensive: wrong shape or empty fieldLabel resets to null.
  {
    const va = state.world.variantAxis;
    if (va && typeof va === "object" && typeof va.fieldLabel === "string" && va.fieldLabel.trim()) {
      state.world.variantAxis = {
        fieldLabel: va.fieldLabel,
        flagLabel: typeof va.flagLabel === "string" ? va.flagLabel : "",
        active: typeof va.active === "string" ? va.active : "",
      };
    } else {
      state.world.variantAxis = null;
    }
  }
  // Concordance positions: ensure shape, strip stale node IDs (entries OR
  // registered graph nodes deleted between sessions), strip malformed values.
  // Registered nodes (Astronomical Bodies, Glossopoeia node types) are draggable
  // in Concordance and persist their dropped positions the same as entries, so
  // their ids must count as valid here — otherwise every reload silently strips
  // a hand-laid star map / language graph back to a force pass. The registry's
  // getInstances accessors are defensive (Array.isArray guards), so this is safe
  // to call before the celestialBodies / glossopoeia backfills later in migrate.
  if (!state.concordance || typeof state.concordance !== "object") state.concordance = { positions: {} };
  if (!state.concordance.positions || typeof state.concordance.positions !== "object") state.concordance.positions = {};
  {
    const validIds = new Set([
      ...state.entries.map(e => e.id),
      ...getRegisteredGraphNodes(state).map(n => n.id),
    ]);
    Object.keys(state.concordance.positions).forEach(id => {
      const p = state.concordance.positions[id];
      const valid = validIds.has(id) && p && typeof p.x === "number" && typeof p.y === "number" && isFinite(p.x) && isFinite(p.y);
      if (!valid) delete state.concordance.positions[id];
    });
    // v1.5 r132 one-time reset: before r131 the graph stripped synthetic-node
    // (Astronomical Body / Glossopoeia) positions on every load, so they were
    // never reliably persisted — every saved value for them is a throwaway
    // force-settled coordinate from an uncontained layout, not an intentional
    // placement. r131 started keeping those values, which froze that scatter in
    // place. Drop them ONCE so they re-lay-out under the r132 containment force
    // (forceX/forceY), then commit cleanly from there on. Entry positions, which
    // users do place by hand, are left untouched. Idempotent via the flag.
    if (!state.concordance.synthPositionsResetR132) {
      const synthIds = new Set(getRegisteredGraphNodes(state).map(n => n.id));
      Object.keys(state.concordance.positions).forEach(id => {
        if (synthIds.has(id)) delete state.concordance.positions[id];
      });
      state.concordance.synthPositionsResetR132 = true;
    }
  }
  // Ensure templates have kind property
  state.templates.forEach(t => { if (!t.kind) t.kind = "standard"; });

  // One-time template-rename migration: rename built-in templates without losing
  // their entries. Updates the template name AND any seededBuiltins / seededFields
  // bookkeeping that referenced the old name. Entry templateIds are unaffected
  // (they reference id, not name). Tracked per-rename so it runs once.
  // CRITICAL: this MUST run before the template-backfill section below, otherwise
  // backfill sees the new name as missing and creates a duplicate template.
  const TEMPLATE_RENAMES = [
    { from: "Artifact / Object", to: "Artifact / Object / Currency" },
    { from: "Document / Text", to: "Book / Document / Text / Tome" },
    { from: "Faction", to: "Faction / Government / Organization" },
  ];

  // Origin backfill: classify each template as "builtin" or "user" so the
  // rest of the migration framework can filter out user-created templates
  // that happen to share a built-in name. Built-in classification matches a
  // template whose name appears in BUILTIN_TEMPLATES or is the `from` slot
  // of any TEMPLATE_RENAMES entry (so a v1.2 "Document / Text" still gets
  // identified as the built-in for the rename pass that's about to run).
  //
  // Pre-this-version worlds have no origin field; their built-ins have been
  // implicitly identified by name-match throughout history. This backfill
  // reifies that classification once so future migrations can be precise.
  // After this runs, every template carries origin and the rest of migrate()
  // can target builtins specifically.
  const _builtinNameSet = new Set([
    ...BUILTIN_TEMPLATES.map(b => b.name),
    ...TEMPLATE_RENAMES.map(r => r.from),
  ]);
  state.templates.forEach(t => {
    if (!t.origin) {
      t.origin = _builtinNameSet.has(t.name) ? TEMPLATE_ORIGIN.BUILTIN : TEMPLATE_ORIGIN.USER;
    }
  });

  if (!state.world.templateRenames || typeof state.world.templateRenames !== "object") {
    state.world.templateRenames = {};
  }
  TEMPLATE_RENAMES.forEach(({ from, to }) => {
    const migKey = `${from}->${to}`;
    if (state.world.templateRenames[migKey]) return;
    const tpl = state.templates.find(t => t.name === from && t.origin === TEMPLATE_ORIGIN.BUILTIN);
    if (tpl) tpl.name = to;
    if (Array.isArray(state.world.seededBuiltins)) {
      // Translate an existing claim under the old name into a claim under the
      // new name. We do NOT add a fresh claim under the new name when no old
      // claim exists — that would suppress the legitimate seededBuiltins
      // backfill below from creating the template for worlds that never had
      // either form. Original code added `to` unconditionally when neither
      // was present, which broke fresh imports of fixtures that use the new
      // name without claiming it.
      const idx = state.world.seededBuiltins.indexOf(from);
      if (idx >= 0) state.world.seededBuiltins[idx] = to;
    }
    if (state.world.seededFields && state.world.seededFields[from]) {
      state.world.seededFields[to] = state.world.seededFields[from];
      delete state.world.seededFields[from];
    }
    ["iconMigrations", "fieldRenames"].forEach(mapKey => {
      const map = state.world[mapKey];
      if (!map || typeof map !== "object") return;
      Object.keys(map).forEach(k => {
        if (k.startsWith(`${from}:`)) {
          const newK = k.replace(`${from}:`, `${to}:`);
          map[newK] = map[k];
          delete map[k];
        }
      });
    });
    state.world.templateRenames[migKey] = true;
  });

  // v1.7 r002: each reference field's target names brought into line with its
  // ids, once per world, before anything below re-resolves them (the
  // duplicate merge, the built-in backfills, the showWhen repair). A world
  // saved before r002 holds the template builder's target edits in the ids
  // alone, and resolving the stale names would undo them. After the template
  // renames, so the names come out current. Names resolve as they did before
  // r002, when the stored ids were derived: a name only r002 resolves (Lexeme,
  // Map) dropped out then and reads as a name that resolves to nothing, kept
  // for the next resolve to pick up. See syncRefTargetNames.
  if (!state.migrations || typeof state.migrations !== "object") state.migrations = {};
  if (!state.migrations.refTargetNamesSyncedV17) {
    syncRefTargetNames(state.templates, null, true);
    state.migrations.refTargetNamesSyncedV17 = true;
  }

  // v1.7 r004: the templates that v1.5's conversions and v1.6's map
  // promotion retired, and the sources their records moved to
  // (retargetRetired). The Astronomical Body names include "Celestial
  // Body", the body label a v1.5 build before r077 wrote in their place;
  // the map entry carries the map templates this load promotes, of the
  // user's own as well as the built-in, by id and name. The conversions
  // below use the first two with the template's own id.
  const RETIRED_TEMPLATE_TARGETS = [
    {
      slug: "astronomical-body", names: ["Astronomical Body", "Celestial Body"],
      single: BODY_REF_SENTINEL, singleName: BODY_REF_LABEL,
      multi: [BODY_REF_SENTINEL], multiNames: [BODY_REF_LABEL],
    },
    {
      slug: "language-glossary", names: ["Language / Glossary"],
      single: SYNTH_TPL_CONLANG, singleName: CONLANG_REF_LABEL,
      multi: [SYNTH_TPL_CONLANG, SYNTH_TPL_LEXEME], multiNames: [CONLANG_REF_LABEL, LEXEME_REF_LABEL],
    },
    {
      slug: "map", names: [MAP_REF_LABEL, ...promotedMapTemplates.map(t => t.name)],
      ids: promotedMapTemplates.map(t => t.id),
      single: SYNTH_TPL_MAP, singleName: MAP_REF_LABEL,
      multi: [SYNTH_TPL_MAP], multiNames: [MAP_REF_LABEL],
    },
  ];

  // v1.7 r004: repair the reference fields of a world upgraded before
  // r004, once per world. Two things were left behind. (1) A retired
  // template's id, wherever a field listed it: the Astronomical Body
  // conversion and the map promotion left every one, and the Language /
  // Glossary supersede one it couldn't find by name (an id the template
  // builder had added alone). Matching nothing, it gave the field a picker
  // with none of the records that had moved, and the cleanup at the end of
  // migrate() deleted every reference to one from a multi-target field
  // (Location › Parent, Historical Event › Location). The id is
  // retargeted. A built-in template's id is tpl-<slug of its name>-<four
  // characters>, and none of the three was ever renamed, so a retired one
  // is known by that shape once nothing has it; a map template of the
  // user's own is known only in the load that promotes it, so one promoted
  // before r004 keeps its id. (2) A multi-target field
  // that targeted Language / Glossary: the supersede renamed it to ConLang
  // in the names and cleared the id list, so the field has taken any
  // template since. Its list is rebuilt from its names, with Lexeme added
  // for the words that became lexemes, and with every template or source
  // the field already points at, so the cleanup deletes nothing; a field
  // set to one target since keeps it, and its stale names go. This runs
  // after r002's name sync, which resolves names as they resolved before
  // r002, when Lexeme and Map didn't, and so would list either twice in a
  // list mended here; and before the duplicate merge and the backfills,
  // whose resolves would rebuild a cleared list without Lexeme. A
  // reference the cleanup already deleted doesn't come back.
  if (!state.migrations.retiredTargetsRepairedV17) {
    const { byName, nameById } = refTargetIndex(state.templates);
    const retired = RETIRED_TEMPLATE_TARGETS.map(r => {
      const prefix = `tpl-${r.slug}-`;
      const isId = (id) => typeof id === "string" && !nameById.has(id)
        && ((r.ids || []).includes(id) || (id.length === prefix.length + 4 && id.startsWith(prefix)));
      return { ...r, isId };
    });
    const entryById = new Map(state.entries.filter(e => e && e.id).map(e => [e.id, e]));
    const sourceById = new Map(getRegisteredGraphNodes(state).map(n => [n.id, n.templateId]));
    // What the field's references point at, across the template's entries:
    // an entry's template, or a record's source.
    const heldTargets = (tpl, f) => {
      const out = [];
      state.entries.forEach(e => {
        if (!e || e.templateId !== tpl.id || !e.fields) return;
        const v = e.fields[f.id];
        (Array.isArray(v) ? v : [v]).forEach(x => {
          const id = typeof x === "string" ? x : (x && typeof x === "object" && typeof x.id === "string" ? x.id : null);
          if (!id) return;
          const target = entryById.get(id);
          const src = target ? target.templateId : sourceById.get(id);
          if (src && nameById.has(src) && !out.includes(src)) out.push(src);
        });
      });
      return out;
    };
    // topLevel: the cleanup judges only top-level fields, so only they need
    // the held targets.
    const repair = (tpl, f, topLevel) => {
      if (!f || typeof f !== "object") return;
      if (f.type === "group" && Array.isArray(f.subfields)) f.subfields.forEach(sf => repair(tpl, sf, false));
      if (f.type !== "entry-ref") return;
      retired.forEach(r => retargetRetired(f, r));
      if (f.refTemplatesId !== null || !Array.isArray(f.refTemplates) || !f.refTemplates.includes(CONLANG_REF_LABEL)) return;
      if (f.refTemplateId) { delete f.refTemplates; return; }
      const ids = [];
      const add = (id) => { if (id && !ids.includes(id)) ids.push(id); };
      f.refTemplates.forEach(n => { add(byName[n]); if (n === CONLANG_REF_LABEL) add(SYNTH_TPL_LEXEME); });
      if (topLevel) heldTargets(tpl, f).forEach(add);
      const names = [...f.refTemplates];
      ids.forEach(id => { if (!names.some(n => byName[n] === id)) names.push(nameById.get(id)); });
      f.refTemplatesId = ids;
      f.refTemplates = names;
      if ("refTemplateId" in f) f.refTemplateId = null;
      if ("refTemplate" in f) delete f.refTemplate;
    };
    state.templates.forEach(t => { if (t && Array.isArray(t.fields)) t.fields.forEach(f => repair(t, f, true)); });
    state.migrations.retiredTargetsRepairedV17 = true;
  }

  // Deduplication pass: heal worlds that already received the duplicate from
  // the buggy migration order (rename ran AFTER backfill, producing two templates
  // with the same name). For each duplicate name, keep the template that has
  // the most entries (likely the user's original); reassign entries from the
  // discarded one(s) to the keeper. Field-merge: any fields present on the
  // discarded duplicate that the keeper is missing get copied over (this matters
  // because in the buggy state, the freshly-created duplicate had the newest
  // fields while the renamed-original had the old field set).
  //
  // Keyed on (name, origin) so a user-created template that happens to share a
  // built-in name (e.g. user's custom "Character" alongside the canonical
  // built-in Character) is NOT considered a duplicate and stays separate.
  // Only same-origin same-name pairs collapse — those are the genuine
  // historical bug-state duplicates.
  {
    const groupsSeen = new Map();
    state.templates.forEach(t => {
      const key = `${t.name}::${t.origin}`;
      if (!groupsSeen.has(key)) groupsSeen.set(key, []);
      groupsSeen.get(key).push(t);
    });
    const toRemove = new Set();
    const idRedirect = {};
    groupsSeen.forEach((dupes, key) => {
      if (dupes.length < 2) return;
      const counts = dupes.map(t => state.entries.filter(e => e.templateId === t.id).length);
      let keepIdx = 0;
      let bestCount = -1;
      counts.forEach((c, i) => { if (c > bestCount) { bestCount = c; keepIdx = i; } });
      const keeper = dupes[keepIdx];
      // Merge fields from each non-keeper duplicate into the keeper.
      const keeperLabels = new Set(keeper.fields.map(f => f.label));
      dupes.forEach((t, i) => {
        if (i === keepIdx) return;
        // Pull missing fields from the discarded duplicate (matched by label).
        t.fields.forEach(f => {
          if (!keeperLabels.has(f.label)) {
            keeper.fields.push(JSON.parse(JSON.stringify(f)));
            keeperLabels.add(f.label);
          }
        });
        toRemove.add(t.id);
        idRedirect[t.id] = keeper.id;
      });
    });
    if (toRemove.size > 0) {
      state.templates = state.templates.filter(t => !toRemove.has(t.id));
      state.entries = state.entries.map(e => {
        if (idRedirect[e.templateId]) return { ...e, templateId: idRedirect[e.templateId] };
        return e;
      });
      // After dedup with field-merge, refresh ref resolution since field
      // identities may have changed.
      resolveTemplateRefs(state.templates);
    }
  }

  // Backfill any new built-in templates that didn't exist when this world was created.
  // We track which built-ins have been seeded so users who deliberately deleted one
  // don't see it return on load. Templates that already exist (by name) are marked
  // as seeded without adding a duplicate. New built-ins are inserted at their
  // canonical position relative to other built-ins (so e.g. Deity / Entity slots
  // in next to Cosmology / Plane rather than getting appended to the end).
  if (!Array.isArray(state.world.seededBuiltins)) state.world.seededBuiltins = [];
  let templatesAdded = false;

  const insertAtCanonicalPosition = (newTpl, builtinIndex) => {
    // Walk backwards through the canonical order looking for a built-in that
    // exists in the user's templates. Insert just after it.
    for (let i = builtinIndex - 1; i >= 0; i--) {
      const prevName = BUILTIN_TEMPLATES[i].name;
      const idx = state.templates.findIndex(t => t.name === prevName);
      if (idx !== -1) {
        state.templates.splice(idx + 1, 0, newTpl);
        return;
      }
    }
    // No earlier built-in found — try later ones, insert before
    for (let i = builtinIndex + 1; i < BUILTIN_TEMPLATES.length; i++) {
      const nextName = BUILTIN_TEMPLATES[i].name;
      const idx = state.templates.findIndex(t => t.name === nextName);
      if (idx !== -1) {
        state.templates.splice(idx, 0, newTpl);
        return;
      }
    }
    // Fallback: no built-ins exist at all in the user's templates, just append
    state.templates.push(newTpl);
  };

  BUILTIN_TEMPLATES.forEach((bt, builtinIndex) => {
    if (state.world.seededBuiltins.includes(bt.name)) return;
    const exists = state.templates.some(t => t.name === bt.name);
    if (!exists) {
      insertAtCanonicalPosition(makeTemplateFromBuiltin(bt), builtinIndex);
      templatesAdded = true;
    }
    state.world.seededBuiltins.push(bt.name);
  });
  if (templatesAdded) resolveTemplateRefs(state.templates);

  // One-time field-rename migration: rename fields on built-in templates without
  // losing their existing data. Renames the field's label in the template AND
  // the seededFields tracker, leaving the field's id (and thus saved values) intact.
  // Runs BEFORE the field-add backfill so the renamed field's new label is already
  // present in seededFields — otherwise field-add would see the new label as
  // unseeded, fail to find it on the user's template (still labeled "from"), and
  // push a duplicate fresh field.
  const FIELD_RENAMES = [
    { template: "Plot Thread", from: "Secret Truth", to: "Hidden Truth" },
    { template: "Location", from: "Founded", to: "Founded / Discovered" },
    { template: "Astronomical Body", from: "History / Discovery", to: "History" },
    { template: "Astronomical Body", from: "Aliases / Other Names", to: "Other Names" },
    { template: "Artifact / Object / Currency", from: "Object Type", to: "Type" },
    { template: "Artifact / Object / Currency", from: "History / Ownership", to: "History" },
    { template: "Artifact / Object / Currency", from: "Aliases / Other Names", to: "Other Names" },
    { template: "Character", from: "Heritage / Ancestry", to: "Lineage / Bloodline" },
    { template: "Culture / People", from: "Aliases / Other Names", to: "Other Names" },
    { template: "Culture / People", from: "Population / Range", to: "Population & Distribution" },
    { template: "Deity / Entity", from: "Aliases", to: "Aliases / Other Names" },
    { template: "Deity / Entity", from: "Aliases / Other Names", to: "Other Names" },
    { template: "Deity / Entity", from: "Worshipping Factions", to: "Worshippers" },
    { template: "Deity / Entity", from: "Allied", to: "Allied Powers" },
    { template: "Deity / Entity", from: "Opposing", to: "Opposing Powers" },
    { template: "Deity / Entity", from: "Origin", to: "Origin / History" },
    { template: "Book / Document / Text / Tome", from: "Owner", to: "Current Owner" },
    { template: "Book / Document / Text / Tome", from: "Current Owner", to: "Current Owner(s)" },
    { template: "Faction / Government / Organization", from: "History", to: "Origin / History" },
    { template: "Magic / Tech System", from: "System Type", to: "Type" },
    { template: "Magic / Tech System", from: "Who Can Use It", to: "Access Prerequisites" },
    { template: "Plot Thread", from: "Active Period", to: "Timespan" },
    // v1.3-halfwidth Race / Species / Ancestry: complete schema overhaul with
    // 3-level cascade chain (BroadType → Type → Subtype). Two renames here:
    //   - "Aliases / Other Names" → "Other Names" (per template-rename doctrine
    //     — "Aliases" implies sentient; this template covers non-sentient
    //     species too, so the broader "Other Names" fits).
    //   - "Type" → "BroadType". The old Type field had 9 broad biological
    //     categories (Humanoid, Beastfolk, Fey, etc.); we're repositioning
    //     that field as the top of a 3-level cascade chain. The new "Type"
    //     field added by runFieldAddPass post-rename is a cascade-select
    //     child of BroadType (e.g. BroadType=Humanoid → Type options include
    //     Human, Elf, Dwarf, etc.). Subtype is the cascade grandchild.
    { template: "Race / Species / Ancestry", from: "Aliases / Other Names", to: "Other Names" },
    { template: "Race / Species / Ancestry", from: "Type", to: "BroadType" },
    { template: "House / Dynasty / Clan / Bloodline", from: "Dynasty Span", to: "Active Span" },
    // v1.3-halfwidth Creature: Lifespan / Reproduction textarea conflated
    // two distinct concerns (lifespan duration as structured data, and
    // reproductive cycle as prose). Renamed to "Reproduction / Lifecycle"
    // (matching Race / Species / Ancestry's analogous field) and a new
    // half-eligible Lifespan text field added via runFieldAddPass. Existing
    // entries: lifespan-specific prose stays in Reproduction / Lifecycle
    // (non-destructive); user manually extracts to the new Lifespan field
    // if desired.
    { template: "Creature", from: "Lifespan / Reproduction", to: "Reproduction / Lifecycle" },
    // v1.3-halfwidth Substance / Material: standard "Aliases / Other Names"
    // → "Other Names" rename per doctrine (substances are aggregates, not
    // sentient; "Other Names" is the broader canonical label).
    { template: "Substance / Material", from: "Aliases / Other Names", to: "Other Names" },
    // v1.3-halfwidth Vehicle: "Aliases / Designation" → "Other Names" per
    // doctrine. The old label combined two distinct concepts (aliases =
    // alternate names; designation = official identifier). "Other Names" is
    // the canonical aggregate label across all templates; designation info
    // can live alongside aliases in the same text field, or in a user-added
    // custom Designation field.
    { template: "Vehicle", from: "Aliases / Designation", to: "Other Names" },
    // v1.3-halfwidth Weapon / Armor — four renames:
    // 1. "Aliases / Designation" → "Other Names" per doctrine (canonical
    //    aggregate label; designation info can live in the same field).
    // 2. "Category" → "Type" for consistency across all 22 templates'
    //    classification field. Weapon / Armor was the lone outlier using
    //    "Category"; every other template uses "Type" as the broad
    //    classification field. Cascade pair (Type | Subtype) reads cleaner.
    // 3. "Appearance" → "Appearance / Description". Original label was
    //    physical-only; the new combined label allows users to describe
    //    both appearance (looks) and function (what it does in narrative)
    //    in the same textarea, avoiding a separate empty Description field.
    // 4. "History / Ownership" → "History". Previous Owners (new entry-ref
    //    multi field) now handles structured ownership tracking; History
    //    becomes pure narrative prose about what happened to the item.
    { template: "Weapon / Armor", from: "Aliases / Designation", to: "Other Names" },
    { template: "Weapon / Armor", from: "Category", to: "Type" },
    { template: "Weapon / Armor", from: "Appearance", to: "Appearance / Description" },
    { template: "Weapon / Armor", from: "History / Ownership", to: "History" },
  ];
  if (!state.world.fieldRenames || typeof state.world.fieldRenames !== "object") {
    state.world.fieldRenames = {};
  }
  FIELD_RENAMES.forEach(({ template: tplName, from, to }) => {
    const migKey = `${tplName}:${from}->${to}`;
    if (state.world.fieldRenames[migKey]) return;
    const tpl = state.templates.find(t => t.name === tplName && t.origin === TEMPLATE_ORIGIN.BUILTIN);
    if (tpl) {
      const f = tpl.fields.find(f => f.label === from);
      const conflict = tpl.fields.find(f => f.label === to);
      if (f && !conflict) {
        f.label = to;
        // Update seededFields tracker so the field doesn't get re-added under
        // either the old name or get duplicated under the new name.
        const seeded = state.world.seededFields?.[tplName];
        if (Array.isArray(seeded)) {
          const idx = seeded.indexOf(from);
          if (idx >= 0) seeded[idx] = to;
          if (!seeded.includes(to)) seeded.push(to);
        }
      }
    }
    state.world.fieldRenames[migKey] = true;
  });

  // Field-level backfill: for each built-in template that exists in the user's
  // templates, add any new fields that haven't been seeded before. Tracks per
  // (template name, field label) so each field is only ever seeded once. If a
  // user deletes a field after seeding, it stays gone — we don't re-add it.
  //
  // Extracted into a helper so it can run a second time after
  // DEPRECATED_BUILTIN_FIELDS — which can strip a label out of seededFields to
  // make room for a same-named-but-different-typed replacement (e.g. v1.3
  // Deity / Entity Pantheon: text → entry-ref). On the post-DEPRECATED pass,
  // the now-unseeded label gets re-added with the new built-in schema, in the
  // same migration pass (no save+reload required to land the new field).
  if (!state.world.seededFields || typeof state.world.seededFields !== "object") {
    state.world.seededFields = {};
  }
  const runFieldAddPass = () => {
    let fieldsAdded = false;
    BUILTIN_TEMPLATES.forEach(bt => {
      const userTpl = state.templates.find(t => t.name === bt.name && t.origin === TEMPLATE_ORIGIN.BUILTIN);
      if (!userTpl) return;
      if (!Array.isArray(state.world.seededFields[bt.name])) {
        state.world.seededFields[bt.name] = [];
      }
      bt.fields.forEach(bf => {
        if (state.world.seededFields[bt.name].includes(bf.label)) return;
        state.world.seededFields[bt.name].push(bf.label);
        const alreadyPresent = userTpl.fields.some(f => f.label === bf.label);
        if (!alreadyPresent) {
          userTpl.fields.push({
            id: `fld-${slugify(bf.label)}-${genId().slice(-4)}`,
            ...bf,
          });
          fieldsAdded = true;
        }
      });
    });
    if (fieldsAdded) resolveTemplateRefs(state.templates);
    return fieldsAdded;
  };
  runFieldAddPass();

  // One-time icon migration: swap old emoji-rendering icons to text-rendering equivalents.
  // Tracks per-template names that have been migrated so this runs once.
  const ICON_MIGRATIONS = {
    "Vehicle": { from: "⛵", to: "▷" },
  };
  if (!state.world.iconMigrations || typeof state.world.iconMigrations !== "object") {
    state.world.iconMigrations = {};
  }
  Object.entries(ICON_MIGRATIONS).forEach(([tplName, { from, to }]) => {
    const migKey = `${tplName}:${from}->${to}`;
    if (state.world.iconMigrations[migKey]) return;
    const tpl = state.templates.find(t => t.name === tplName && t.origin === TEMPLATE_ORIGIN.BUILTIN);
    if (tpl && tpl.icon === from) {
      tpl.icon = to;
    }
    state.world.iconMigrations[migKey] = true;
  });

  // v1.3: one-time options-update migration — when the canonical options list
  // for a built-in select field grows (or reorders), propagate the change to
  // existing worlds without trampling user customizations.
  //
  // Each entry declares: template, field label, rev (a manual version tag —
  // bump it when you want the migration to re-run on already-migrated worlds),
  // oldOptions (the canonical list before this update), newOptions (the
  // canonical list after).
  //
  // Two paths, decided per-world:
  //   1. User's options == oldOptions (set equality, order-agnostic) — the user
  //      hasn't customized; replace with newOptions wholesale, picking up the
  //      new canonical order. This is the "fresh re-seed" path for worlds where
  //      the user never touched the field.
  //   2. User's options differ from oldOptions — the user added, removed, or
  //      reordered options. Append only the TRULY-NEW options (those in
  //      newOptions but NOT in oldOptions). This preserves user additions and
  //      respects user removals (a removed option from oldOptions never gets
  //      restored — it's already gone from oldOptions before this migration
  //      considers it).
  //
  // Tracked per-world (state.world.optionsUpdates) so each (template, field,
  // rev) tuple runs once. Bumping rev re-runs the migration; useful when a
  // later update further expands the canonical list.
  const OPTIONS_UPDATES = [
    {
      template: "Astronomical Body",
      field: "Type",
      rev: "v1.3",
      oldOptions: ["Star", "Planet", "Moon / Satellite", "Asteroid", "Comet", "Nebula", "Galaxy", "Star System", "Constellation", "Black Hole", "Pulsar", "Anomaly", "Other"],
      newOptions: ["Galaxy", "Constellation", "Quasar", "Nebula", "Supernova Remnant", "Sector", "Star System", "Asteroid Belt", "Star", "Black Hole", "Pulsar", "Brown Dwarf", "Planet", "Dwarf Planet", "Rogue Planet", "Ring System", "Moon / Satellite", "Asteroid", "Comet", "Megastructure", "Wormhole", "Anomaly", "Other"],
    },
    {
      template: "Artifact / Object / Currency",
      field: "Type",
      rev: "v1.3",
      oldOptions: ["Artifact", "Mundane Object", "Currency / Coin", "Relic", "Heirloom", "Tool", "Container", "Other"],
      newOptions: ["Artifact", "Container", "Currency / Coin", "Furniture", "Garment / Clothing", "Heirloom", "Idol / Icon", "Insignia / Crest", "Jewelry", "Key", "Mundane Object", "Relic", "Tool", "Trinket / Token", "Other"],
    },
    {
      template: "Artifact / Object / Currency",
      field: "Status",
      rev: "v1.3",
      oldOptions: ["In Use", "Held", "Lost", "Destroyed", "Sealed", "Hidden", "Unknown"],
      newOptions: ["Corrupted", "Damaged", "Destroyed", "Held", "Hidden", "In Use", "Lost", "Sealed", "Shattered", "Unknown"],
    },
    {
      template: "Character",
      field: "Status",
      rev: "v1.3",
      oldOptions: ["Living", "Deceased", "Unknown"],
      newOptions: ["Altered / Cursed", "Ascended", "Deceased", "Exiled", "Imprisoned", "In Stasis", "Living", "Missing", "Transformed", "Unknown"],
    },
    {
      // v1.3 Creature: existing Sentience Level field gets an "Other" option
      // appended and gains the otherTextField flag so the runtime auto-injects
      // Other + reveals customText input. Order stays spectrum (Mindless →
      // Sapient → Unknown → Other).
      template: "Creature",
      field: "Sentience Level",
      rev: "v1.3",
      oldOptions: ["Mindless", "Feral", "Cunning", "Sapient", "Unknown"],
      newOptions: ["Mindless", "Feral", "Cunning", "Sapient", "Unknown", "Other"],
      otherTextField: true,
    },
    {
      // v1.3 Deity / Entity: Type list expanded from 8 to 19 (+ Other),
      // alphabetized, with otherTextField flag for runtime customText input.
      // Adds Ancestor Spirit, Angel, Avatar / Aspect, Demon, Egregore, Fiend,
      // Genius Loci, High God, Overgod, Personification, Tulpa; merges
      // Primordial+Titan; keeps existing entries. Old "Other" stays in the
      // list (the runtime auto-injects when missing, but explicit is fine).
      template: "Deity / Entity",
      field: "Type",
      rev: "v1.3",
      oldOptions: ["Deity", "Demigod", "Primordial", "Archfiend", "Archangel", "Spirit", "Eidolon", "Ascended Mortal", "Other"],
      newOptions: ["Ancestor Spirit", "Angel", "Archangel", "Archfiend", "Ascended Mortal", "Avatar / Aspect", "Deity", "Demigod", "Demon", "Egregore", "Eidolon", "Fiend", "Genius Loci", "High God", "Overgod", "Personification", "Primordial / Titan", "Spirit", "Tulpa", "Other"],
      otherTextField: true,
    },
    {
      // v1.3 Deity / Entity: Status list expanded from 8 (no Other) to 12 +
      // Other, alphabetized, with otherTextField flag. Adds Ascendant,
      // Banished, Diminished, Imprisoned; keeps existing entries.
      template: "Deity / Entity",
      field: "Status",
      rev: "v1.3",
      oldOptions: ["Active", "Dormant", "Sealed", "Slain", "Lost", "Forgotten", "Risen", "Unknown"],
      newOptions: ["Active", "Ascendant", "Banished", "Diminished", "Dormant", "Forgotten", "Imprisoned", "Lost", "Risen", "Sealed", "Slain", "Unknown", "Other"],
      otherTextField: true,
    },
    {
      // v1.3 Book / Document / Text / Tome: Type list expanded from 10 to 22 +
      // Other, alphabetized, with otherTextField flag. Drops "Map" (duplicates
      // the Map template). Splits merged categories (Book/Codex, Decree/Edict,
      // Diary/Journal). Adds Charter, Contract, Ledger, Manuscript, Newspaper,
      // Pamphlet, Scripture / Sacred Text, Translation, Treatise, Treaty,
      // Will / Testament. Template-name keyed under the post-rename name since
      // TEMPLATE_RENAMES runs before OPTIONS_UPDATES.
      template: "Book / Document / Text / Tome",
      field: "Type",
      rev: "v1.3",
      oldOptions: ["Book", "Scroll", "Letter", "Decree", "Prophecy", "Inscription", "Tablet", "Journal", "Map", "Other"],
      newOptions: ["Book", "Charter", "Codex", "Contract", "Decree", "Diary", "Edict", "Inscription", "Journal", "Ledger", "Letter", "Manuscript", "Newspaper", "Pamphlet", "Prophecy", "Scripture / Sacred Text", "Scroll", "Tablet", "Translation", "Treatise", "Treaty", "Will / Testament", "Other"],
      otherTextField: true,
    },
    {
      // v1.3 Book / Document / Text / Tome: Status list expanded from 6 (no
      // Other) to 13 + Other, alphabetized, with otherTextField flag. Adds
      // Censored, Corrupted, Encoded, Forged, Sealed, Unfinished, Unknown.
      template: "Book / Document / Text / Tome",
      field: "Status",
      rev: "v1.3",
      oldOptions: ["Extant", "Lost", "Destroyed", "Hidden", "Forbidden", "Fragmentary"],
      newOptions: ["Censored", "Corrupted", "Destroyed", "Encoded", "Extant", "Forbidden", "Forged", "Fragmentary", "Hidden", "Lost", "Sealed", "Unfinished", "Unknown", "Other"],
      otherTextField: true,
    },
    {
      // v1.3 Faction / Government / Organization: Status list expanded from 6
      // (no Other) to 12 + Other, alphabetized, with otherTextField flag.
      // Adds Defunct, Exiled, Fragmented, Reformed, Splintered, Suppressed.
      // Keyed under post-rename template name since TEMPLATE_RENAMES runs
      // before OPTIONS_UPDATES. The Type field is converted text → select via
      // FIELD_TYPE_CONVERSIONS below — not handled by OPTIONS_UPDATES.
      template: "Faction / Government / Organization",
      field: "Status",
      rev: "v1.3",
      oldOptions: ["Active", "Disbanded", "Underground", "Dormant", "Banned", "Unknown"],
      newOptions: ["Active", "Banned", "Defunct", "Disbanded", "Dormant", "Exiled", "Fragmented", "Reformed", "Splintered", "Suppressed", "Underground", "Unknown", "Other"],
      otherTextField: true,
    },
    {
      // v1.3 Festival / Holiday: Type list expanded from 8 + Other to 16 +
      // Other, alphabetized, with otherTextField flag. Kept the original 8
      // categories (Religious, Civic, Seasonal, Cultural, Secret, Mourning,
      // Fertility, Harvest) and added Commemorative, Dynastic / Royal,
      // Founding Day, Martial, New Year, Pilgrimage, Rite of Passage,
      // Wedding / Marriage. Status is a new field (added via field-add) so
      // it ships with the v1.3 schema natively — no OPTIONS_UPDATES needed.
      // Frequency converts text → select via the DEPRECATED → re-seed pattern
      // (old text values prepended to Notes); see DEPRECATED_BUILTIN_FIELDS.
      template: "Festival / Holiday",
      field: "Type",
      rev: "v1.3",
      oldOptions: ["Religious", "Civic", "Seasonal", "Cultural", "Secret", "Mourning", "Fertility", "Harvest", "Other"],
      newOptions: ["Civic", "Commemorative", "Cultural", "Dynastic / Royal", "Fertility", "Founding Day", "Harvest", "Martial", "Mourning", "New Year", "Pilgrimage", "Religious", "Rite of Passage", "Seasonal", "Secret", "Wedding / Marriage", "Other"],
      otherTextField: true,
    },
    // v1.3 batch: Status fields across uplifted templates standardized to
    // include "Other" + the otherTextField flag. Three patterns:
    //   1. Existing template Status that already had a prior v1.3 OPTIONS
    //      update (Artifact, Character) — uses a distinct rev so the bump
    //      runs even for users who already applied "v1.3".
    //   2. Existing template Status with no prior update (Astronomical Body)
    //      — same rev tag for consistency; first time running for this field.
    //   3. Newly-added Status (Cosmology / Plane, Creature) where Other was
    //      in the option list but otherTextField wasn't set — options stay
    //      identical, the entry exists purely to flip the flag on existing
    //      worlds where field-add already ran without the flag.
    {
      template: "Artifact / Object / Currency",
      field: "Status",
      rev: "v1.3-other",
      oldOptions: ["Corrupted", "Damaged", "Destroyed", "Held", "Hidden", "In Use", "Lost", "Sealed", "Shattered", "Unknown"],
      newOptions: ["Corrupted", "Damaged", "Destroyed", "Held", "Hidden", "In Use", "Lost", "Sealed", "Shattered", "Unknown", "Other"],
      otherTextField: true,
    },
    {
      template: "Astronomical Body",
      field: "Status",
      rev: "v1.3-other",
      oldOptions: ["Active", "Dead", "Dormant", "Destroyed", "Extinct", "Mythical", "Unknown"],
      newOptions: ["Active", "Dead", "Dormant", "Destroyed", "Extinct", "Mythical", "Unknown", "Other"],
      otherTextField: true,
    },
    {
      template: "Character",
      field: "Status",
      rev: "v1.3-other",
      oldOptions: ["Altered / Cursed", "Ascended", "Deceased", "Exiled", "Imprisoned", "In Stasis", "Living", "Missing", "Transformed", "Unknown"],
      newOptions: ["Altered / Cursed", "Ascended", "Deceased", "Exiled", "Imprisoned", "In Stasis", "Living", "Missing", "Transformed", "Unknown", "Other"],
      otherTextField: true,
    },
    {
      template: "Cosmology / Plane",
      field: "Status",
      rev: "v1.3-other",
      oldOptions: ["Active", "Destroyed", "Forbidden", "Forgotten", "Lost", "Sealed", "Unknown", "Unstable", "Other"],
      newOptions: ["Active", "Destroyed", "Forbidden", "Forgotten", "Lost", "Sealed", "Unknown", "Unstable", "Other"],
      otherTextField: true,
    },
    {
      template: "Creature",
      field: "Status",
      rev: "v1.3-other",
      oldOptions: ["Common", "Cryptid", "Domesticated", "Endangered", "Extinct", "Extraplanar", "Mythical", "Rare", "Unknown", "Other"],
      newOptions: ["Common", "Cryptid", "Domesticated", "Endangered", "Extinct", "Extraplanar", "Mythical", "Rare", "Unknown", "Other"],
      otherTextField: true,
    },
    // v1.3-other Type backfills: Astronomical Body and Artifact / Object /
    // Currency had their Type options expanded in v1.3 but the otherTextField
    // flag was missed in that pass. The built-in definition now sets it; these
    // entries flip the flag on existing worlds where field-add already ran
    // without it. Options stay identical between old/new — the entry exists
    // purely to patch the flag.
    {
      template: "Astronomical Body",
      field: "Type",
      rev: "v1.3-other",
      oldOptions: ["Galaxy", "Constellation", "Quasar", "Nebula", "Supernova Remnant", "Sector", "Star System", "Asteroid Belt", "Star", "Black Hole", "Pulsar", "Brown Dwarf", "Planet", "Dwarf Planet", "Rogue Planet", "Ring System", "Moon / Satellite", "Asteroid", "Comet", "Megastructure", "Wormhole", "Anomaly", "Other"],
      newOptions: ["Galaxy", "Constellation", "Quasar", "Nebula", "Supernova Remnant", "Sector", "Star System", "Asteroid Belt", "Star", "Black Hole", "Pulsar", "Brown Dwarf", "Planet", "Dwarf Planet", "Rogue Planet", "Ring System", "Moon / Satellite", "Asteroid", "Comet", "Megastructure", "Wormhole", "Anomaly", "Other"],
      otherTextField: true,
    },
    {
      template: "Artifact / Object / Currency",
      field: "Type",
      rev: "v1.3-other",
      oldOptions: ["Artifact", "Container", "Currency / Coin", "Furniture", "Garment / Clothing", "Heirloom", "Idol / Icon", "Insignia / Crest", "Jewelry", "Key", "Mundane Object", "Relic", "Tool", "Trinket / Token", "Other"],
      newOptions: ["Artifact", "Container", "Currency / Coin", "Furniture", "Garment / Clothing", "Heirloom", "Idol / Icon", "Insignia / Crest", "Jewelry", "Key", "Mundane Object", "Relic", "Tool", "Trinket / Token", "Other"],
      otherTextField: true,
    },
    // v1.3-other Location Type backfill: Location Type was the only built-in
    // Type that missed the universal-Other doctrine during the v1.3 uplift
    // (six options, no Other, no otherTextField). Caught during the v1.3
    // bug audit. Adds Other to the option list and flips the flag on
    // existing worlds. Paired with a Subtype.optionsByParent.Other seeder
    // immediately below so the cascade terminates cleanly when a user picks
    // Type=Other (the Subtype slot gets Other available; otherTextField on
    // Subtype handles long-tail values regardless).
    {
      template: "Location",
      field: "Type",
      rev: "v1.3-other",
      oldOptions: ["Environmental", "Settlement", "Fortification", "Domain", "Structure", "Site"],
      newOptions: ["Environmental", "Settlement", "Fortification", "Domain", "Structure", "Site", "Other"],
      otherTextField: true,
    },
    {
      template: "Location",
      field: "Subtype",
      parentValue: "Other",
      rev: "v1.3-other",
      oldOptions: [],
      newOptions: ["Other"],
    },
    // ─── v1.3-scifi: cross-genre Type expansions ─────────────────────────────
    // After the initial v1.3 uplift pass, an audit surfaced that several
    // built-in Type lists were genre-tilted (mostly toward medieval fantasy)
    // and lacked sci-fi / modern / industrial vocabulary. This batch expands
    // the affected Type lists. Each entry uses rev "v1.3-scifi" so the
    // migration runs even on worlds that already applied "v1.3". Same set-
    // equality logic applies: unmodified user lists get wholesale-replaced
    // with the new alphabetized list, customized lists get the truly-new
    // sci-fi options appended without trampling customizations.
    {
      // Creature: add Alien / Extraterrestrial, Cybernetic Organism / Cyborg,
      // Genetic Mutant / Hybrid, Robot / Android, Synthetic Lifeform.
      // Construct was already present (covers magical automatons); the new
      // Robot / Android slot is for technological constructs.
      template: "Creature",
      field: "Type",
      rev: "v1.3-scifi",
      oldOptions: ["Aberration", "Beast", "Construct", "Dragon", "Elemental", "Fey", "Insect / Swarm", "Magical Beast", "Ooze", "Outsider / Extraplanar", "Plant", "Spirit", "Undead", "Vermin", "Other"],
      newOptions: ["Aberration", "Alien / Extraterrestrial", "Beast", "Construct", "Cybernetic Organism / Cyborg", "Dragon", "Elemental", "Fey", "Genetic Mutant / Hybrid", "Insect / Swarm", "Magical Beast", "Ooze", "Outsider / Extraplanar", "Plant", "Robot / Android", "Spirit", "Synthetic Lifeform", "Undead", "Vermin", "Other"],
    },
    {
      // Artifact / Object / Currency: add Component / Module, Data Storage,
      // Device / Gadget, Implant / Cybernetic, Power Source / Battery.
      template: "Artifact / Object / Currency",
      field: "Type",
      rev: "v1.3-scifi",
      oldOptions: ["Artifact", "Container", "Currency / Coin", "Furniture", "Garment / Clothing", "Heirloom", "Idol / Icon", "Insignia / Crest", "Jewelry", "Key", "Mundane Object", "Relic", "Tool", "Trinket / Token", "Other"],
      newOptions: ["Artifact", "Component / Module", "Container", "Currency / Coin", "Data Storage", "Device / Gadget", "Furniture", "Garment / Clothing", "Heirloom", "Idol / Icon", "Implant / Cybernetic", "Insignia / Crest", "Jewelry", "Key", "Mundane Object", "Power Source / Battery", "Relic", "Tool", "Trinket / Token", "Other"],
    },
    {
      // Book / Document / Text / Tome: add Data Crystal / Drive, Database
      // Entry, Digital Manuscript / E-Book, Holographic Record, Transmission
      // / Broadcast. "Tablet" stays ambiguous (covers both stone and digital
      // — user disambiguates via Description or customText). Keyed under the
      // post-rename template name.
      template: "Book / Document / Text / Tome",
      field: "Type",
      rev: "v1.3-scifi",
      oldOptions: ["Book", "Charter", "Codex", "Contract", "Decree", "Diary", "Edict", "Inscription", "Journal", "Ledger", "Letter", "Manuscript", "Newspaper", "Pamphlet", "Prophecy", "Scripture / Sacred Text", "Scroll", "Tablet", "Translation", "Treatise", "Treaty", "Will / Testament", "Other"],
      newOptions: ["Book", "Charter", "Codex", "Contract", "Data Crystal / Drive", "Database Entry", "Decree", "Diary", "Digital Manuscript / E-Book", "Edict", "Holographic Record", "Inscription", "Journal", "Ledger", "Letter", "Manuscript", "Newspaper", "Pamphlet", "Prophecy", "Scripture / Sacred Text", "Scroll", "Tablet", "Translation", "Transmission / Broadcast", "Treatise", "Treaty", "Will / Testament", "Other"],
    },
    {
      // Cosmology / Plane: add Hyperspace / Subspace, Parallel Universe,
      // Simulation / Virtual Space. The existing Anomaly / Pocket Dimension /
      // Temporal serve sci-fi roughly but lack the explicit FTL-travel and
      // simulated-reality categories.
      template: "Cosmology / Plane",
      field: "Type",
      rev: "v1.3-scifi",
      oldOptions: ["Anomaly", "Astral", "Demi-plane", "Elemental", "Ethereal", "Inner", "Material", "Mirror", "Outer", "Pocket Dimension", "Temporal", "Other"],
      newOptions: ["Anomaly", "Astral", "Demi-plane", "Elemental", "Ethereal", "Hyperspace / Subspace", "Inner", "Material", "Mirror", "Outer", "Parallel Universe", "Pocket Dimension", "Simulation / Virtual Space", "Temporal", "Other"],
    },
    {
      // Deity / Entity: add AI / Machine Intelligence (machine apotheosis,
      // Singularity-grade entities) and Cosmic Entity / Outer God (sufficient
      // technology indistinguishable from godhood, Lovecraftian elder gods,
      // Brahman-tier cosmic consciousness). Cosmic Entity was dropped in the
      // initial v1.3 Deity pass; restoring on audit-driven feedback.
      template: "Deity / Entity",
      field: "Type",
      rev: "v1.3-scifi",
      oldOptions: ["Ancestor Spirit", "Angel", "Archangel", "Archfiend", "Ascended Mortal", "Avatar / Aspect", "Deity", "Demigod", "Demon", "Egregore", "Eidolon", "Fiend", "Genius Loci", "High God", "Overgod", "Personification", "Primordial / Titan", "Spirit", "Tulpa", "Other"],
      newOptions: ["AI / Machine Intelligence", "Ancestor Spirit", "Angel", "Archangel", "Archfiend", "Ascended Mortal", "Avatar / Aspect", "Cosmic Entity / Outer God", "Deity", "Demigod", "Demon", "Egregore", "Eidolon", "Fiend", "Genius Loci", "High God", "Overgod", "Personification", "Primordial / Titan", "Spirit", "Tulpa", "Other"],
    },
    // Location Subtype cascade — five branches expanded for genre breadth.
    // Each uses parentValue to target the appropriate optionsByParent slot.
    // Environmental alphabetized + added Crater, Glacier / Ice Sheet, Reef /
    // Atoll, Steppe / Savanna, Volcano, Wetlands. Settlement kept size-
    // spectrum order, added Domed City, Megacity, Arcology, Orbital
    // Settlement. Fortification alphabetized + added Bastion, Bunker,
    // Defense Platform, Garrison. Domain alphabetized + added Confederation,
    // Dominion, Federation, Hegemony, Nation, Republic, Sector. Structure
    // alphabetized + added Apartment Block, Communication Array, Datacenter,
    // Factory, Greenhouse / Hydroponics, Hangar, Observatory, Power Plant /
    // Reactor, Refinery, Spaceport, Warehouse, Workshop / Garage.
    {
      template: "Location",
      field: "Subtype",
      parentValue: "Environmental",
      rev: "v1.3-scifi",
      oldOptions: ["Spring", "Grove", "Cave", "Cavern", "Stream", "Pond", "Hill", "River", "Lake", "Marsh", "Valley", "Canyon", "Forest", "Plains", "Coastline", "Desert", "Tundra", "Jungle", "Mountain", "Mountain Range", "Sea", "Ocean", "Subcontinent", "Continent", "Other"],
      newOptions: ["Canyon", "Cave", "Cavern", "Coastline", "Continent", "Crater", "Desert", "Forest", "Glacier / Ice Sheet", "Grove", "Hill", "Jungle", "Lake", "Marsh", "Mountain", "Mountain Range", "Ocean", "Plains", "Pond", "Reef / Atoll", "River", "Sea", "Spring", "Steppe / Savanna", "Stream", "Subcontinent", "Tundra", "Valley", "Volcano", "Wetlands", "Other"],
    },
    {
      template: "Location",
      field: "Subtype",
      parentValue: "Settlement",
      rev: "v1.3-scifi",
      oldOptions: ["Camp", "Encampment", "Outpost", "Trading Post", "Thorp", "Hamlet", "Village", "Town", "City", "Metropolis", "Colony", "Other"],
      newOptions: ["Arcology", "Camp", "City", "Colony", "Domed City", "Encampment", "Hamlet", "Megacity", "Metropolis", "Orbital Settlement", "Outpost", "Thorp", "Town", "Trading Post", "Village", "Other"],
    },
    {
      // v1.3-scifi.1 Settlement realphabetization: an earlier in-flight v1.3
      // build shipped Settlement with size-spectrum order preserved (Camp,
      // Encampment, ... Town, Domed City, City, Metropolis, Megacity,
      // Arcology, Colony, Orbital Settlement). Subsequent feedback was to
      // alphabetize since the new sci-fi entries broke the size spectrum
      // anyway. The v1.3-scifi entry above now declares alphabetized
      // newOptions, but worlds that already ran the spectrum-order version
      // have optionsUpdates[...v1.3-scifi] = true and won't re-trigger.
      // This follow-up uses a fresh rev so the migration re-runs; oldOptions
      // is the spectrum list (what those worlds currently have), newOptions
      // is the alphabetized list. Users coming directly from v1.2 (who get
      // the alphabetized list from v1.3-scifi above) hit this entry with
      // userOpts already alphabetized → set-equality vs spectrum oldOptions
      // fails → append-only path → noop.
      template: "Location",
      field: "Subtype",
      parentValue: "Settlement",
      rev: "v1.3-scifi.1",
      oldOptions: ["Camp", "Encampment", "Outpost", "Trading Post", "Thorp", "Hamlet", "Village", "Town", "Domed City", "City", "Metropolis", "Megacity", "Arcology", "Colony", "Orbital Settlement", "Other"],
      newOptions: ["Arcology", "Camp", "City", "Colony", "Domed City", "Encampment", "Hamlet", "Megacity", "Metropolis", "Orbital Settlement", "Outpost", "Thorp", "Town", "Trading Post", "Village", "Other"],
    },
    {
      template: "Location",
      field: "Subtype",
      parentValue: "Fortification",
      rev: "v1.3-scifi",
      oldOptions: ["Watchpost", "Beacon", "Tower", "Gate", "Wall", "Fort", "Keep", "Castle", "Citadel", "Fortress", "Other"],
      newOptions: ["Bastion", "Beacon", "Bunker", "Castle", "Citadel", "Defense Platform", "Fort", "Fortress", "Garrison", "Gate", "Keep", "Tower", "Wall", "Watchpost", "Other"],
    },
    {
      template: "Location",
      field: "Subtype",
      parentValue: "Domain",
      rev: "v1.3-scifi",
      oldOptions: ["Ward", "Borough", "District", "Estate", "Fief", "Lordship", "Barony", "County", "March", "Duchy", "Principality", "Province", "City-State", "Region", "Reach", "Land", "Realm", "Kingdom", "Empire", "Other"],
      newOptions: ["Barony", "Borough", "City-State", "Confederation", "County", "District", "Dominion", "Duchy", "Empire", "Estate", "Federation", "Fief", "Hegemony", "Kingdom", "Land", "Lordship", "March", "Nation", "Principality", "Province", "Reach", "Realm", "Region", "Republic", "Sector", "Ward", "Other"],
    },
    {
      template: "Location",
      field: "Subtype",
      parentValue: "Structure",
      rev: "v1.3-scifi",
      oldOptions: ["Aqueduct", "Arena", "Bakery", "Bank", "Bathhouse", "Brewery", "Bridge", "Brothel", "Court", "Dam", "Dungeon", "Forge", "Granary", "Habitat", "Hermitage", "Hospital", "Inn", "Laboratory", "Library", "Lighthouse", "Manor", "Market", "Mausoleum", "Mill", "Mine", "Monastery", "Office", "Prison", "Quarry", "Ruin", "School", "Shop", "Shrine", "Stable", "Tavern", "Temple", "Theater", "Tower", "Other"],
      newOptions: ["Apartment Block", "Aqueduct", "Arena", "Bakery", "Bank", "Bathhouse", "Brewery", "Bridge", "Brothel", "Communication Array", "Court", "Dam", "Datacenter", "Dungeon", "Factory", "Forge", "Granary", "Greenhouse / Hydroponics", "Habitat", "Hangar", "Hermitage", "Hospital", "Inn", "Laboratory", "Library", "Lighthouse", "Manor", "Market", "Mausoleum", "Mill", "Mine", "Monastery", "Observatory", "Office", "Power Plant / Reactor", "Prison", "Quarry", "Refinery", "Ruin", "School", "Shop", "Shrine", "Spaceport", "Stable", "Tavern", "Temple", "Theater", "Tower", "Warehouse", "Workshop / Garage", "Other"],
    },
    // ─── v1.3 Language / Glossary uplift ─────────────────────────────────────
    // Entry Type list expanded and alphabetized. Adds: Dialect, Idiom /
    // Proverb / Slang, Other. Drops: Script System (existing entries with
    // that value keep displaying it but can't be re-selected — by design,
    // since Script System modeling is pushed to the future Conlang pack).
    // otherTextField:true added for the universal Other escape-valve pattern.
    {
      template: "Language / Glossary",
      field: "Entry Type",
      rev: "v1.3",
      oldOptions: ["Word / Term", "Phrase", "Language Overview", "Script System", "Naming Convention"],
      newOptions: ["Dialect", "Idiom / Proverb / Slang", "Language Overview", "Naming Convention", "Phrase", "Word / Term", "Other"],
      otherTextField: true,
    },
    // ─── v1.3 Magic / Tech System uplift ─────────────────────────────────────
    // Cultural Position list expanded. Drops Forgotten (overlapped Status,
    // which is the new home for "system no longer exists" axis). Adds
    // Regulated, Restricted, Sacred, Suppressed, Tolerated. Alphabetized.
    // otherTextField:true added.
    {
      template: "Magic / Tech System",
      field: "Cultural Position",
      rev: "v1.3",
      oldOptions: ["Revered", "Common", "Feared", "Forbidden", "Forgotten", "Unknown"],
      newOptions: ["Common", "Feared", "Forbidden", "Regulated", "Restricted", "Revered", "Sacred", "Suppressed", "Tolerated", "Unknown", "Other"],
      otherTextField: true,
    },
    // ─── v1.3 Plot Thread uplift ────────────────────────────────────────────
    // Status list expanded with three lifecycle distinctions:
    //   Brewing  — early setup, not yet active
    //   Failed   — came to a bad end (distinct from Abandoned, which is
    //              writer-dropped not in-world failure)
    //   Stalled  — no progress, stuck (unintentional vs. Dormant which is
    //              latent / expected to resume)
    //   Suspended — active but explicitly paused (vs. Dormant / Stalled)
    // Alphabetized. otherTextField:true added.
    {
      template: "Plot Thread",
      field: "Status",
      rev: "v1.3",
      oldOptions: ["Active", "Dormant", "Resolved", "Abandoned", "Potential"],
      newOptions: ["Abandoned", "Active", "Brewing", "Dormant", "Failed", "Potential", "Resolved", "Stalled", "Suspended", "Other"],
      otherTextField: true,
    },
    // v1.3-halfwidth Deity / Entity Status strip: "Forgotten" removed in
    // favor of the new Cultural Position field, which now carries
    // "Forgotten" as its proper home. Status retains pure metaphysical-state
    // semantics (Active / Dormant / Slain / etc.). Existing entries with
    // Status="Forgotten" will display as stale-value fallback on non-
    // customized templates (otherTextField is true, so the value renders
    // as customText) — user can manually migrate to Cultural Position.
    // Customized templates (path 2) keep their option list untouched, so
    // user-customized worlds retain "Forgotten" in Status if they had it.
    {
      template: "Deity / Entity",
      field: "Status",
      rev: "v1.3-halfwidth",
      oldOptions: ["Active", "Ascendant", "Banished", "Diminished", "Dormant", "Forgotten", "Imprisoned", "Lost", "Risen", "Sealed", "Slain", "Unknown", "Other"],
      newOptions: ["Active", "Ascendant", "Banished", "Diminished", "Dormant", "Imprisoned", "Lost", "Risen", "Sealed", "Slain", "Unknown", "Other"],
      otherTextField: true,
    },
    // v1.3-halfwidth Deity / Entity Type strip: four tier-flavored entries
    // (Archangel, Archfiend, High God, Overgod) removed in favor of the new
    // Power Tier field. Type now carries pure "kind of being" semantics
    // (Angel / Demon / Spirit / AI / etc.). Demigod and Primordial / Titan
    // kept in Type because they describe a kind of being (half-mortal divine,
    // primal cosmic being) more than a tier rank. Both High God and Overgod
    // moved to Power Tier — High God = apex of pantheon (Zeus, Odin), Overgod
    // = ruler-over-pantheon (D&D's Ao); both function as tier ranks above
    // Greater rather than distinct kinds of being. Existing entries with
    // stripped Type values display as stale-value fallback; users can
    // manually re-classify using Type + Power Tier together.
    {
      template: "Deity / Entity",
      field: "Type",
      rev: "v1.3-halfwidth",
      oldOptions: ["AI / Machine Intelligence", "Ancestor Spirit", "Angel", "Archangel", "Archfiend", "Ascended Mortal", "Avatar / Aspect", "Cosmic Entity / Outer God", "Deity", "Demigod", "Demon", "Egregore", "Eidolon", "Fiend", "Genius Loci", "High God", "Overgod", "Personification", "Primordial / Titan", "Spirit", "Tulpa", "Other"],
      newOptions: ["AI / Machine Intelligence", "Ancestor Spirit", "Angel", "Ascended Mortal", "Avatar / Aspect", "Cosmic Entity / Outer God", "Deity", "Demigod", "Demon", "Egregore", "Eidolon", "Fiend", "Genius Loci", "Personification", "Primordial / Titan", "Spirit", "Tulpa", "Other"],
      otherTextField: true,
    },
    // v1.3-halfwidth Deity / Entity Power Tier addition: High God added to
    // the canonical Power Tier spectrum between Greater and Overgod. High God
    // = apex of a pantheon (structural top); Overgod = ruler-over-pantheon
    // (meta-divine); both above Greater in tier rank, with High God below
    // Overgod since High God leads a pantheon while Overgod oversees gods.
    // The Power Tier field was introduced in v1.3-halfwidth without High God
    // (it lived in Type at that point); this entry brings existing worlds'
    // Power Tier options in line with the corrected canonical schema. New
    // worlds get the 10-option list natively via BUILTIN_TEMPLATES seeding.
    {
      template: "Deity / Entity",
      field: "Power Tier",
      rev: "v1.3-halfwidth",
      oldOptions: ["Petty / Minor", "Lesser", "Intermediate", "Greater", "Overgod", "Cosmic / Outer", "Variable", "Unknown", "Other"],
      newOptions: ["Petty / Minor", "Lesser", "Intermediate", "Greater", "High God", "Overgod", "Cosmic / Outer", "Variable", "Unknown", "Other"],
      otherTextField: true,
    },
    // v1.3-halfwidth.2 strip re-runs: same canonical strips as v1.3-halfwidth,
    // re-keyed to a fresh rev so they execute again against worlds that
    // already tracked v1.3-halfwidth as applied. Pairs with the corrected
    // OPTIONS_UPDATES else-branch logic (which now strips oldOptions-
    // newOptions in append-only mode too). The .1 follow-ups previously
    // here targeted specific shapes (e.g., 18 canonical + High God orphan);
    // these .2 entries replace them with the canonical oldOptions →
    // newOptions shape, relying on the new strip-also-in-append-only logic
    // to clean up any messy intermediate state regardless of how the user's
    // options drifted (v1.2 imports, hand-edits, mid-cycle re-adds).
    {
      template: "Deity / Entity",
      field: "Type",
      rev: "v1.3-halfwidth.2",
      oldOptions: ["AI / Machine Intelligence", "Ancestor Spirit", "Angel", "Archangel", "Archfiend", "Ascended Mortal", "Avatar / Aspect", "Cosmic Entity / Outer God", "Deity", "Demigod", "Demon", "Egregore", "Eidolon", "Fiend", "Genius Loci", "High God", "Overgod", "Personification", "Primordial / Titan", "Spirit", "Tulpa", "Other"],
      newOptions: ["AI / Machine Intelligence", "Ancestor Spirit", "Angel", "Ascended Mortal", "Avatar / Aspect", "Cosmic Entity / Outer God", "Deity", "Demigod", "Demon", "Egregore", "Eidolon", "Fiend", "Genius Loci", "Personification", "Primordial / Titan", "Spirit", "Tulpa", "Other"],
      otherTextField: true,
    },
    {
      template: "Book / Document / Text / Tome",
      field: "Status",
      rev: "v1.3-halfwidth.2",
      oldOptions: ["Censored", "Corrupted", "Destroyed", "Encoded", "Extant", "Forbidden", "Forged", "Fragmentary", "Hidden", "Lost", "Sealed", "Unfinished", "Unknown", "Other"],
      newOptions: ["Corrupted", "Destroyed", "Encoded", "Extant", "Forged", "Fragmentary", "Hidden", "Lost", "Sealed", "Unfinished", "Unknown", "Other"],
      otherTextField: true,
    },
    {
      template: "Faction / Government / Organization",
      field: "Status",
      rev: "v1.3-halfwidth.2",
      oldOptions: ["Active", "Banned", "Defunct", "Disbanded", "Dormant", "Exiled", "Fragmented", "Reformed", "Splintered", "Suppressed", "Underground", "Unknown", "Other"],
      newOptions: ["Active", "Defunct", "Disbanded", "Dormant", "Exiled", "Fragmented", "Reformed", "Splintered", "Underground", "Unknown", "Other"],
      otherTextField: true,
    },
    // v1.3-halfwidth Book / Document / Text / Tome Status strip: "Forbidden"
    // and "Censored" removed in favor of the new Cultural Position field,
    // which carries Forbidden as a canonical value and Suppressed as the
    // closest synonym for Censored. Status retains pure physical/access-state
    // semantics (Extant / Corrupted / Destroyed / Forged / Hidden / Lost /
    // Sealed / etc.) — what the document is, not how society regards it.
    // Existing entries with Status="Forbidden" or "Censored" get auto-
    // migrated to Cultural Position via the FIELD_VALUE_REMAPS entries
    // below (Forbidden → Cultural Position:Forbidden; Censored → Cultural
    // Position:Suppressed). Same pattern as the Deity / Entity Power Tier
    // restructure (Archangel/Archfiend → Type+Power Tier in the same
    // FIELD_VALUE_REMAPS block).
    {
      template: "Book / Document / Text / Tome",
      field: "Status",
      rev: "v1.3-halfwidth",
      oldOptions: ["Censored", "Corrupted", "Destroyed", "Encoded", "Extant", "Forbidden", "Forged", "Fragmentary", "Hidden", "Lost", "Sealed", "Unfinished", "Unknown", "Other"],
      newOptions: ["Corrupted", "Destroyed", "Encoded", "Extant", "Forged", "Fragmentary", "Hidden", "Lost", "Sealed", "Unfinished", "Unknown", "Other"],
      otherTextField: true,
    },
    // v1.3-halfwidth Faction / Government / Organization Status strip:
    // "Banned" and "Suppressed" removed in favor of the new Cultural Position
    // field. Banned maps cleanly to Cultural Position:Forbidden; Suppressed
    // is already an option on Cultural Position (and is the more honest term
    // for the authority-imposed-disapproval semantic Banned was carrying).
    // Status retains pure operational/existence semantics (Active / Defunct /
    // Disbanded / Dormant / Fragmented / Reformed / Splintered / Underground /
    // Exiled / Unknown). Underground and Exiled kept — they describe where
    // the faction is operating, not how society regards them. Same precedent
    // pattern as the Book / Document / Text / Tome Status strip and the
    // Deity / Entity Type/Status restructure.
    {
      template: "Faction / Government / Organization",
      field: "Status",
      rev: "v1.3-halfwidth",
      oldOptions: ["Active", "Banned", "Defunct", "Disbanded", "Dormant", "Exiled", "Fragmented", "Reformed", "Splintered", "Suppressed", "Underground", "Unknown", "Other"],
      newOptions: ["Active", "Defunct", "Disbanded", "Dormant", "Exiled", "Fragmented", "Reformed", "Splintered", "Underground", "Unknown", "Other"],
      otherTextField: true,
    },
    // v1.3-halfwidth Festival / Holiday Status strip: "Banned / Outlawed"
    // and "Suppressed" removed in favor of the new Cultural Position field.
    // "Banned / Outlawed" maps to Cultural Position:Forbidden (cleaner term
    // for authority-imposed-prohibition); Suppressed is already a canonical
    // CP option. Status retains pure operational/existence semantics for
    // festivals (Active / Defunct / Dormant / Forgotten / Modernized /
    // Revived / Suspended / Abolished / Unknown). Forgotten kept in Status
    // — it describes the festival fading from collective memory, not a
    // current cultural stance toward it. Strip-in-append-only logic in the
    // OPTIONS_UPDATES else-branch handles v1.2 imports cleanly without
    // needing a follow-up .2 rev.
    {
      template: "Festival / Holiday",
      field: "Status",
      rev: "v1.3-halfwidth",
      oldOptions: ["Abolished", "Active", "Banned / Outlawed", "Defunct", "Dormant", "Forgotten", "Modernized", "Revived", "Suppressed", "Suspended", "Unknown", "Other"],
      newOptions: ["Abolished", "Active", "Defunct", "Dormant", "Forgotten", "Modernized", "Revived", "Suspended", "Unknown", "Other"],
      otherTextField: true,
    },
    // v1.3-halfwidth Historical Event Status strip: "Suppressed" removed in
    // favor of the new Cultural Position field, which carries Suppressed as
    // a canonical option. Status retains pure historical-verification
    // semantics (Apocryphal / Confirmed Historical / Disputed / Forgotten /
    // Misattributed / Mythologized / Unknown) — how we know about the event,
    // not how society regards it. Forgotten / Misattributed / Mythologized
    // kept in Status — they're memory/verification states, not current
    // cultural stance.
    {
      template: "Historical Event",
      field: "Status",
      rev: "v1.3-halfwidth",
      oldOptions: ["Apocryphal", "Confirmed Historical", "Disputed", "Forgotten", "Misattributed", "Mythologized", "Suppressed", "Unknown", "Other"],
      newOptions: ["Apocryphal", "Confirmed Historical", "Disputed", "Forgotten", "Misattributed", "Mythologized", "Unknown", "Other"],
      otherTextField: true,
    },
    // v1.3-halfwidth Language / Glossary Status strip: "Suppressed" removed
    // in favor of the new Cultural Position field. Status retains linguistic
    // operational/usage semantics (Active / Archaic / Dead / Endangered /
    // Forgotten / Liturgical / Lost / Reconstructed / Revived / Sacred /
    // Secret / Unknown). Liturgical, Sacred, Secret kept in Status — they
    // describe language-specific usage states (used in ritual, used in
    // secret) rather than pure cultural-regard. Status:Sacred and Cultural
    // Position:Sacred can both be true independently (a language used in
    // sacred contexts AND revered by society).
    {
      template: "Language / Glossary",
      field: "Status",
      rev: "v1.3-halfwidth",
      oldOptions: ["Active","Archaic","Dead","Endangered","Forgotten","Liturgical","Lost","Reconstructed","Revived","Sacred","Secret","Suppressed","Unknown","Other"],
      newOptions: ["Active","Archaic","Dead","Endangered","Forgotten","Liturgical","Lost","Reconstructed","Revived","Sacred","Secret","Unknown","Other"],
      otherTextField: true,
    },
    // v1.3-halfwidth Magic / Tech System Status strip: "Suppressed" removed
    // in favor of the new Cultural Position field. Status retains operational
    // semantics (Active / Declining / Discovered / Forgotten / Lost /
    // Reconstructed / Speculative / Theoretical / Unknown). Cultural Position
    // already shipped on this template in an earlier v1.3 pass; the strip
    // removes the now-redundant Suppressed from Status.
    {
      template: "Magic / Tech System",
      field: "Status",
      rev: "v1.3-halfwidth",
      oldOptions: ["Active","Declining","Discovered","Forgotten","Lost","Reconstructed","Speculative / Theoretical","Suppressed","Unknown","Other"],
      newOptions: ["Active","Declining","Discovered","Forgotten","Lost","Reconstructed","Speculative / Theoretical","Unknown","Other"],
      otherTextField: true,
    },
    // v1.3-halfwidth Race / Species / Ancestry — BroadType options
    // replacement. The post-FIELD_RENAMES field is named "BroadType" but
    // still has the old 9 broad-category options. New options are the
    // 18-entry alphabetized list spanning all genres (fantasy, sci-fi,
    // horror, cross-genre). Several old names get renamed in the new list
    // (Aberration → Aberration / Eldritch, Beastfolk → Beastfolk /
    // Anthropomorphic, Construct → Construct / Automaton) — FIELD_VALUE_REMAPS
    // below catches the orphan values and remaps to canonical names.
    {
      template: "Race / Species / Ancestry",
      field: "BroadType",
      rev: "v1.3-halfwidth",
      oldOptions: ["Humanoid", "Beastfolk", "Fey", "Construct", "Undead", "Elemental", "Aberration", "Outsider / Extraplanar", "Other"],
      newOptions: ["Aberration / Eldritch", "Alien / Extraterrestrial", "Beast / Animal", "Beastfolk / Anthropomorphic", "Construct / Automaton", "Cursed / Transformed", "Elemental", "Fey", "Humanoid", "Hybrid / Crossbreed", "Mutant / Augmented", "Mythic / Legendary", "Outsider / Extraplanar", "Plant / Vegetal", "Spirit / Incorporeal", "Synthetic / AI", "Undead", "Other"],
      otherTextField: true,
    },
    // v1.3-halfwidth Race / Species Status uplift: original 6 options
    // mixed population-frequency (Common, Rare, Endangered, Extinct) with
    // origin-plane categorization (Extraplanar) and verification-state
    // (Mythical). New options keep population-frequency + verification, add
    // Uncommon and Critically Endangered for spectrum cleanup, add Other +
    // Unknown for canonical escape valves. "Extraplanar" stripped — it's an
    // origin-plane attribute that the new BroadType field captures via
    // BroadType=Outsider / Extraplanar. FIELD_VALUE_REMAPS below preserves
    // Status=Extraplanar via Notes append per doctrine (non-destructive).
    {
      template: "Race / Species / Ancestry",
      field: "Status",
      rev: "v1.3-halfwidth",
      oldOptions: ["Common", "Rare", "Endangered", "Extinct", "Mythical", "Extraplanar"],
      newOptions: ["Common", "Uncommon", "Rare", "Endangered", "Critically Endangered", "Extinct", "Mythical", "Unknown", "Other"],
      otherTextField: true,
    },
    // v1.3-halfwidth Religion / Belief System — Type otherTextField patch.
    // Options list unchanged (was already curated and ends with "Other");
    // this entry only adds the otherTextField flag so users can customize
    // when picking "Other". oldOptions === newOptions short-circuits the
    // strip logic; only the flag patch applies.
    {
      template: "Religion / Belief System",
      field: "Type",
      rev: "v1.3-halfwidth",
      oldOptions: ["Monotheistic", "Polytheistic", "Pantheistic", "Animistic", "Ancestor Worship", "Cult", "Mystery Religion", "Philosophy", "Other"],
      newOptions: ["Monotheistic", "Polytheistic", "Pantheistic", "Animistic", "Ancestor Worship", "Cult", "Mystery Religion", "Philosophy", "Other"],
      otherTextField: true,
    },
    // v1.3-halfwidth Religion / Belief System Status uplift: strip
    // "Suppressed" (cultural-action overlap with Cultural Position; see
    // FIELD_VALUE_REMAPS below). Add "Unknown" + otherTextField. Keep
    // Heretical in Status — religion-specific operational/usage state
    // (parallels Language's Liturgical/Sacred/Secret). Active, Underground,
    // Extinct describe operational state; Heretical describes
    // doctrine-relative-to-orthodoxy. Suppressed is the cultural-action
    // outlier that gets the move to CP.
    {
      template: "Religion / Belief System",
      field: "Status",
      rev: "v1.3-halfwidth",
      oldOptions: ["Active", "Suppressed", "Underground", "Extinct", "Heretical", "Other"],
      newOptions: ["Active", "Underground", "Extinct", "Heretical", "Unknown", "Other"],
      otherTextField: true,
    },
    // v1.3-halfwidth Substance / Material — Type otherTextField patch.
    // Options list unchanged (was already curated and ends with "Other");
    // this entry only adds the otherTextField flag for customization.
    {
      template: "Substance / Material",
      field: "Type",
      rev: "v1.3-halfwidth",
      oldOptions: ["Metal / Alloy", "Mineral / Stone", "Organic", "Liquid / Fluid", "Gas / Vapor", "Crystal / Gem", "Compound", "Drug / Medicine", "Poison / Toxin", "Magical / Reagent", "Fictional Element", "Other"],
      newOptions: ["Metal / Alloy", "Mineral / Stone", "Organic", "Liquid / Fluid", "Gas / Vapor", "Crystal / Gem", "Compound", "Drug / Medicine", "Poison / Toxin", "Magical / Reagent", "Fictional Element", "Other"],
      otherTextField: true,
    },
    // v1.3-halfwidth Substance / Material — Rarity uplift: original options
    // were spectrum-ordered (Common → Mythical) but missing "Unknown" and
    // "Other" escape valves and lacked otherTextField. Add both to the end
    // of the spectrum (after Mythical to preserve order); add otherTextField
    // flag.
    {
      template: "Substance / Material",
      field: "Rarity",
      rev: "v1.3-halfwidth",
      oldOptions: ["Common", "Uncommon", "Rare", "Very Rare", "Legendary", "Unique", "Mythical"],
      newOptions: ["Common", "Uncommon", "Rare", "Very Rare", "Legendary", "Unique", "Mythical", "Unknown", "Other"],
      otherTextField: true,
    },
    // v1.3-halfwidth Theme / Motif — Type uplift: original options
    // (Theme, Motif, Symbol, Leitmotif, Archetype) were missing "Other"
    // escape valve. Add "Other" + otherTextField so users can extend with
    // template-specific narrative-element categories not in the curated 5.
    {
      template: "Theme / Motif",
      field: "Type",
      rev: "v1.3-halfwidth",
      oldOptions: ["Theme", "Motif", "Symbol", "Leitmotif", "Archetype"],
      newOptions: ["Theme", "Motif", "Symbol", "Leitmotif", "Archetype", "Other"],
      otherTextField: true,
    },
    // v1.3-halfwidth Vehicle — Type otherTextField patch. Options list
    // unchanged (already ends with "Other"); flag-only patch.
    {
      template: "Vehicle",
      field: "Type",
      rev: "v1.3-halfwidth",
      oldOptions: ["Ship / Vessel", "Aircraft", "Spacecraft", "Ground Vehicle", "Mount / Beast", "Mecha / Construct", "Submersible", "Mythic / Magical", "Other"],
      newOptions: ["Ship / Vessel", "Aircraft", "Spacecraft", "Ground Vehicle", "Mount / Beast", "Mecha / Construct", "Submersible", "Mythic / Magical", "Other"],
      otherTextField: true,
    },
    // v1.3-halfwidth Vehicle — Status uplift: add "Other" escape valve and
    // otherTextField flag. Original options already had Unknown so no need
    // to add that. Active and In Service are intentionally separate (Active
    // = operational; In Service = officially commissioned/in-fleet) — naval
    // and military doctrine distinguishes these states.
    {
      template: "Vehicle",
      field: "Status",
      rev: "v1.3-halfwidth",
      oldOptions: ["Active", "In Service", "Decommissioned", "Lost", "Destroyed", "Captured", "Under Repair", "Unknown"],
      newOptions: ["Active", "In Service", "Decommissioned", "Lost", "Destroyed", "Captured", "Under Repair", "Unknown", "Other"],
      otherTextField: true,
    },
    // v1.3-halfwidth Weapon / Armor — Type extension. FIELD_RENAMES above
    // already moved the field label from "Category" to "Type"; this entry
    // patches the options list to add sci-fi coverage and the otherTextField
    // flag. The four new top-level categories (Powered Armor / Exosuit,
    // Environment Suit, Cybernetic / Implant, Biological Weapon) cover gaps
    // where sci-fi subtypes didn't map cleanly to the original 12 categories
    // — powered exosuits aren't really Heavy Armor; cybernetic implants
    // aren't worn weapons; biological weapons don't fit Firearm or Energy.
    {
      template: "Weapon / Armor",
      field: "Type",
      rev: "v1.3-halfwidth",
      oldOptions: ["Melee Weapon", "Ranged Weapon", "Thrown Weapon", "Firearm", "Energy Weapon", "Siege Weapon", "Light Armor", "Medium Armor", "Heavy Armor", "Shield", "Helm / Headgear", "Other"],
      newOptions: ["Melee Weapon", "Ranged Weapon", "Thrown Weapon", "Firearm", "Energy Weapon", "Siege Weapon", "Light Armor", "Medium Armor", "Heavy Armor", "Powered Armor / Exosuit", "Shield", "Helm / Headgear", "Environment Suit", "Cybernetic / Implant", "Biological Weapon", "Other"],
      otherTextField: true,
    },
    // v1.3-halfwidth Weapon / Armor — Status uplift: add Other +
    // otherTextField. Original had Unknown but no Other; this is a pure
    // additive uplift.
    {
      template: "Weapon / Armor",
      field: "Status",
      rev: "v1.3-halfwidth",
      oldOptions: ["In Use", "Held", "Stored", "Lost", "Destroyed", "Sealed", "Hidden", "Unknown"],
      newOptions: ["In Use", "Held", "Stored", "Lost", "Destroyed", "Sealed", "Hidden", "Unknown", "Other"],
      otherTextField: true,
    },
    // v1.3-halfwidth Weapon / Armor — Weight Class uplift: add Unknown +
    // Other escape valves and otherTextField. Spectrum order preserved
    // (Light → Heavy with Variable/Negligible after); Unknown and Other
    // tagged on after the spectrum.
    {
      template: "Weapon / Armor",
      field: "Weight Class",
      rev: "v1.3-halfwidth",
      oldOptions: ["Light", "Medium", "Heavy", "Variable", "Negligible"],
      newOptions: ["Light", "Medium", "Heavy", "Variable", "Negligible", "Unknown", "Other"],
      otherTextField: true,
    },
    // v1.3-halfwidth Weapon / Armor — Handedness uplift: strip "N/A" (a
    // non-canonical placeholder; replace with the standard Unknown / Other
    // pattern). FIELD_VALUE_REMAPS below handles the existing-value
    // migration: any entry with Handedness="N/A" gets the value cleared,
    // since "not applicable" semantically means the field is irrelevant
    // (armor pieces, environment suits, etc.) — empty conveys that
    // naturally. Add Unknown + Other + otherTextField.
    {
      template: "Weapon / Armor",
      field: "Handedness",
      rev: "v1.3-halfwidth",
      oldOptions: ["One-Handed", "Two-Handed", "Versatile", "Worn / Equipped", "Mounted", "N/A"],
      newOptions: ["One-Handed", "Two-Handed", "Versatile", "Worn / Equipped", "Mounted", "Unknown", "Other"],
      otherTextField: true,
    },
  ];
  if (!state.world.optionsUpdates || typeof state.world.optionsUpdates !== "object") {
    state.world.optionsUpdates = {};
  }
  OPTIONS_UPDATES.forEach(({ template: tplName, field: fieldLabel, rev, oldOptions, newOptions, otherTextField, parentValue }) => {
    // parentValue (optional) targets cascade-select fields: when set, the
    // migration operates on field.optionsByParent[parentValue] instead of
    // field.options. Used for Location.Subtype where each parent Type value
    // (Environmental, Settlement, etc.) has its own option list. The
    // migration key includes parentValue so multiple cascade-slot updates on
    // the same field tracked independently.
    const migKey = parentValue !== undefined
      ? `${tplName}:${fieldLabel}:opts:${parentValue}:${rev}`
      : `${tplName}:${fieldLabel}:opts:${rev}`;
    if (state.world.optionsUpdates[migKey]) return;
    const tpl = state.templates.find(t => t.name === tplName && t.origin === TEMPLATE_ORIGIN.BUILTIN);
    if (tpl) {
      const field = tpl.fields.find(f => f.label === fieldLabel && f.type === "select");
      if (field) {
        // Read the user's current options from either the cascade matrix slot
        // or the flat options array.
        let userOpts;
        if (parentValue !== undefined) {
          if (!field.optionsByParent || typeof field.optionsByParent !== "object") {
            field.optionsByParent = {};
          }
          userOpts = Array.isArray(field.optionsByParent[parentValue])
            ? field.optionsByParent[parentValue]
            : [];
        } else {
          userOpts = Array.isArray(field.options) ? field.options : [];
        }
        const userSet = new Set(userOpts);
        const oldSet = new Set(oldOptions);
        // Order-agnostic set equality between user's options and oldOptions.
        const isUnmodified =
          userSet.size === oldSet.size && [...userSet].every(o => oldSet.has(o));
        // Write back to the same storage location we read from.
        if (isUnmodified) {
          if (parentValue !== undefined) {
            field.optionsByParent[parentValue] = [...newOptions];
          } else {
            field.options = [...newOptions];
          }
        } else {
          // Append-only path for worlds where the user's options don't
          // exactly match oldOptions (set inequality). Two sub-passes:
          //
          //   1. Add truly-new options (in newOptions, not in oldOptions),
          //      pushed to the end of user's options array unless already
          //      present. Preserves user additions in their positions.
          //
          //   2. Strip canonical-removed options (in oldOptions, not in
          //      newOptions). This is the v1.3-halfwidth.2+ behavior — older
          //      revs of OPTIONS_UPDATES only added in this path, which
          //      meant strip migrations silently no-op'd on customized or
          //      v1.2-imported worlds whose options had drifted from
          //      oldOptions exactness. Now the strip set is applied even
          //      when isUnmodified=false, matching canonical intent: "these
          //      values are no longer part of the schema." Doesn't touch
          //      user customizations outside the strip set.
          const trulyNew = newOptions.filter(o => !oldSet.has(o));
          const stripped = oldOptions.filter(o => !newOptions.includes(o));
          if (parentValue !== undefined) {
            if (!Array.isArray(field.optionsByParent[parentValue])) {
              field.optionsByParent[parentValue] = [];
            }
            for (const opt of trulyNew) {
              if (!userSet.has(opt)) field.optionsByParent[parentValue].push(opt);
            }
            for (const opt of stripped) {
              const idx = field.optionsByParent[parentValue].indexOf(opt);
              if (idx >= 0) field.optionsByParent[parentValue].splice(idx, 1);
            }
          } else {
            for (const opt of trulyNew) {
              if (!userSet.has(opt)) field.options.push(opt);
            }
            for (const opt of stripped) {
              const idx = field.options.indexOf(opt);
              if (idx >= 0) field.options.splice(idx, 1);
            }
          }
        }
        // v1.3: otherTextField is set alongside options when the new built-in
        // definition gains the flag. Only flips false→true (never strips a
        // user's manual on-flag). The runtime auto-injects "Other" so the
        // options list doesn't need to include it explicitly. Cascade option
        // updates also touch this flag (it sits on the field, not on the
        // cascade slot).
        if (otherTextField === true && !field.otherTextField) {
          field.otherTextField = true;
        }
      }
    }
    state.world.optionsUpdates[migKey] = true;
  });

  // v1.3: SHOWWHEN_UPDATES — repairs broken showWhen config on built-in fields.
  // Same shape problem as OPTIONS_UPDATES: built-in template definition evolved,
  // existing user templates need to catch up, but field-add's seededFields gate
  // prevents re-touching once a field has been added. So showWhen added to a
  // builtin field AFTER the field was first seeded never reaches existing worlds.
  //
  // This migration patches showWhen on an existing field independently of the
  // field-add gate. Conservative: only re-asserts when current showWhen is
  // missing OR its fieldId is stale (points at a field that no longer exists
  // in the template). If the user has a working customized showWhen, leave it.
  // Tracked per (template:fieldLabel) with applied rev list, same pattern as
  // OPTIONS_UPDATES, so the migration runs once per rev per field.
  const SHOWWHEN_UPDATES = [
    {
      template: "Character",
      fieldLabel: "Cause of Death",
      rev: "v1.3",
      showWhen: { fieldLabel: "Status", values: ["Deceased"] },
    },
    // v1.3-halfwidth Artifact pass: Issuing Faction and Currency Details
    // become currency-only via showWhen. Both existed before as universally-
    // visible fields; on existing worlds they need showWhen retroactively
    // added so the conditional layout works. The fail-open behavior in
    // isFieldVisible (returns true when fieldId is unresolved) means worlds
    // that haven't run this migration yet just keep showing the fields as
    // always-visible — no data loss, no broken render.
    {
      template: "Artifact / Object / Currency",
      fieldLabel: "Issuing Faction",
      rev: "v1.3-halfwidth",
      showWhen: { fieldLabel: "Type", values: ["Currency / Coin"] },
    },
    {
      template: "Artifact / Object / Currency",
      fieldLabel: "Currency Details",
      rev: "v1.3-halfwidth",
      showWhen: { fieldLabel: "Type", values: ["Currency / Coin"] },
    },
  ];
  if (!state.world.showWhenUpdates || typeof state.world.showWhenUpdates !== "object") {
    state.world.showWhenUpdates = {};
  }
  let showWhenUpdated = false;
  SHOWWHEN_UPDATES.forEach(({ template: tplName, fieldLabel, rev, showWhen }) => {
    const key = `${tplName}:${fieldLabel}`;
    const appliedRevs = state.world.showWhenUpdates[key] || [];
    if (appliedRevs.includes(rev)) return;
    const markApplied = () => {
      state.world.showWhenUpdates[key] = [...appliedRevs, rev];
    };
    const userTpl = state.templates.find(t => t.name === tplName && t.origin === TEMPLATE_ORIGIN.BUILTIN);
    if (!userTpl) { markApplied(); return; }
    const field = (userTpl.fields || []).find(f =>
      (f.label || "").toLowerCase() === fieldLabel.toLowerCase()
    );
    if (!field) { markApplied(); return; }
    // Preserve working user customization: showWhen present AND fieldId resolves
    // to an existing field counts as healthy — don't stomp on it.
    const cur = field.showWhen;
    const fieldIdResolves = cur?.fieldId &&
      (userTpl.fields || []).some(f => f.id === cur.fieldId);
    if (cur && fieldIdResolves) { markApplied(); return; }
    // Either no showWhen, or fieldId is stale. Re-assert canonical.
    // resolveTemplateRefs at the end converts fieldLabel → fieldId.
    field.showWhen = { fieldLabel: showWhen.fieldLabel, values: [...showWhen.values] };
    showWhenUpdated = true;
    markApplied();
  });
  if (showWhenUpdated) resolveTemplateRefs(state.templates);

  // v1.3: HALFWIDTH_UPDATES — sets the legacy halfWidth=true flag on built-in
  // fields in existing user worlds.
  //
  // **As of the universal half-width auto-pair rule (v1.3), this flag is inert
  // at render time.** Pair layout is determined by adjacency in the field order
  // plus type eligibility, not by this flag. The migration is preserved for
  // save-file stability (the flag's presence in older world JSONs doesn't
  // break anything; its absence is also fine), and the per-template comments
  // below still serve as documentation of the canonical pair layout the
  // built-ins were originally designed around. The "tagged for pair layout"
  // wording in those comments is historical — under the universal rule, the
  // listed pairs land because the fields are adjacent and half-eligible, not
  // because the migration set the flag.
  //
  // Conservative: only sets halfWidth when the field's current value is
  // undefined (never been touched). If the user has explicitly set halfWidth
  // to true OR false — through hand-edit or any future builder UI — that's a
  // working customization and the migration leaves it alone.
  //
  // Field identification by label (same as SHOWWHEN_UPDATES) — if the user has
  // renamed Father to "Sire" or deleted it entirely, the entry is silently
  // skipped and marked applied. Pair-grouping is per-template-author intent:
  // if either half of an intended pair is missing or untagged, the surviving
  // tagged field auto-expands to full-width gracefully (no broken layout).
  //
  // Tracked per (template:fieldLabel) with applied rev list, same as
  // SHOWWHEN_UPDATES, so the migration runs once per rev per field.
  const HALFWIDTH_UPDATES = [
    { template: "Character", fieldLabel: "Father", rev: "v1.3", halfWidth: true },
    { template: "Character", fieldLabel: "Mother", rev: "v1.3", halfWidth: true },
    // v1.3-halfwidth Character pass: 8 additional fields tagged for pair layout.
    // Pairs after reorder: Title|Aliases, Status|Cause of Death (showWhen reserves
    // the slot when Status≠Deceased), Species/Race|Gender/Pronouns, Religion|
    // Current Whereabouts. Father|Mother already tagged at rev "v1.3" above.
    // Cause of Death is tagged here even though its type at this point in the
    // migration is still textarea — FIELD_TYPE_CONVERSIONS below converts it to
    // text. The tag survives the conversion (FIELD_TYPE_CONVERSIONS only
    // patches type/options/otherTextField, leaves halfWidth alone). At render
    // time CoD is text + halfWidth → pair-eligible.
    { template: "Character", fieldLabel: "Title", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Character", fieldLabel: "Aliases", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Character", fieldLabel: "Status", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Character", fieldLabel: "Cause of Death", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Character", fieldLabel: "Species / Race", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Character", fieldLabel: "Gender / Pronouns", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Character", fieldLabel: "Religion", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Character", fieldLabel: "Current Whereabouts", rev: "v1.3-halfwidth", halfWidth: true },
    // v1.3-halfwidth Location pass: 8 fields tagged for pair layout. Pairs
    // after reorder: Parent|Status, Type|Subtype (cascade, indent suppressed),
    // Climate/Weather|Founded/Discovered, Government/Authority|Population.
    // Status is a new field (seeded via runFieldAddPass on existing worlds) —
    // its halfWidth tag is baked into BUILTIN_TEMPLATES so newly-seeded copies
    // get it directly. The HALFWIDTH_UPDATES entry below catches worlds that
    // had Status added under an earlier definition that didn't have halfWidth
    // set (defensive — shouldn't happen in practice since Status is new this
    // session, but cheap insurance for in-flight build state).
    { template: "Location", fieldLabel: "Parent", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Location", fieldLabel: "Status", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Location", fieldLabel: "Type", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Location", fieldLabel: "Subtype", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Location", fieldLabel: "Climate / Weather", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Location", fieldLabel: "Founded / Discovered", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Location", fieldLabel: "Government / Authority", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Location", fieldLabel: "Population", rev: "v1.3-halfwidth", halfWidth: true },
    // v1.3-halfwidth Astronomical Body pass: 10 fields tagged. Pairs after
    // reorder: Other Names|Discovered/Founded, Type|Status, Parent Body|
    // Distance from Parent, Atmosphere|Gravity, Orbital Period|Rotation Period.
    // Discovered / Founded is new this session (seeded via runFieldAddPass);
    // the HALFWIDTH_UPDATES entry below catches in-flight build state where a
    // world might have absorbed the new field under a definition that didn't
    // yet have the halfWidth tag baked into BUILTIN_TEMPLATES.
    { template: "Astronomical Body", fieldLabel: "Other Names", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Astronomical Body", fieldLabel: "Discovered / Founded", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Astronomical Body", fieldLabel: "Type", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Astronomical Body", fieldLabel: "Status", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Astronomical Body", fieldLabel: "Parent Body", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Astronomical Body", fieldLabel: "Distance from Parent", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Astronomical Body", fieldLabel: "Atmosphere", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Astronomical Body", fieldLabel: "Gravity", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Astronomical Body", fieldLabel: "Orbital Period", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Astronomical Body", fieldLabel: "Rotation Period", rev: "v1.3-halfwidth", halfWidth: true },
    // v1.3-halfwidth Artifact / Object / Currency pass: 10 fields tagged.
    // Pairs after reorder: Other Names|Type, Status|Cultural Position,
    // Material|Rarity, Issuing Faction|Currency Details (both currency-only
    // via showWhen), Current Owner|Current Location. Cultural Position,
    // Material, Rarity are new fields seeded via runFieldAddPass on existing
    // worlds — their halfWidth tags ship via BUILTIN_TEMPLATES. The
    // HALFWIDTH_UPDATES entries below are belt-and-suspenders for in-flight
    // build state edge cases where a new field might land without its
    // halfWidth tag baked in.
    { template: "Artifact / Object / Currency", fieldLabel: "Other Names", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Artifact / Object / Currency", fieldLabel: "Type", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Artifact / Object / Currency", fieldLabel: "Status", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Artifact / Object / Currency", fieldLabel: "Cultural Position", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Artifact / Object / Currency", fieldLabel: "Material", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Artifact / Object / Currency", fieldLabel: "Rarity", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Artifact / Object / Currency", fieldLabel: "Issuing Faction", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Artifact / Object / Currency", fieldLabel: "Currency Details", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Artifact / Object / Currency", fieldLabel: "Current Owner", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Artifact / Object / Currency", fieldLabel: "Current Location", rev: "v1.3-halfwidth", halfWidth: true },
    // v1.3-halfwidth Cosmology / Plane pass: 6 fields tagged. Pairs after
    // reorder: Other Names|Discovered/Charted, Type|Status, Time Flow|Ambient
    // Magic / Energy Level. Three new fields (Discovered / Charted, Ambient
    // Magic / Energy Level, Reality Coherence) seeded via runFieldAddPass on
    // existing worlds; their halfWidth tags ship via BUILTIN_TEMPLATES. The
    // HALFWIDTH_UPDATES entries below cover the existing fields (Other Names,
    // Type, Status, Time Flow) that need retroactive halfWidth tagging on
    // worlds that pre-date this rev.
    { template: "Cosmology / Plane", fieldLabel: "Other Names", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Cosmology / Plane", fieldLabel: "Discovered / Charted", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Cosmology / Plane", fieldLabel: "Type", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Cosmology / Plane", fieldLabel: "Status", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Cosmology / Plane", fieldLabel: "Time Flow", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Cosmology / Plane", fieldLabel: "Ambient Magic / Energy Level", rev: "v1.3-halfwidth", halfWidth: true },
    // v1.3-halfwidth Creature pass: 6 fields tagged. Pairs after reorder:
    // Other Names|Type, Status|Sentience Level, Habitat|Diet. Habitat is
    // type-converted text → select via FIELD_TYPE_CONVERSIONS; Diet is a new
    // field seeded via runFieldAddPass. Both ship with halfWidth=true in
    // BUILTIN_TEMPLATES; the HALFWIDTH_UPDATES entries here are
    // belt-and-suspenders for in-flight edge cases plus retroactive tagging
    // for the four existing fields (Other Names, Type, Status, Sentience
    // Level) on worlds that pre-date this rev.
    { template: "Creature", fieldLabel: "Other Names", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Creature", fieldLabel: "Type", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Creature", fieldLabel: "Status", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Creature", fieldLabel: "Sentience Level", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Creature", fieldLabel: "Habitat", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Creature", fieldLabel: "Diet", rev: "v1.3-halfwidth", halfWidth: true },
    // v1.3-halfwidth Culture / People pass: 6 fields tagged. Pairs after
    // reorder: Other Names|Status, Type|Subtype (cascade, indent suppressed),
    // Founded/Established|Population & Distribution. Status moved up from
    // position 3 so Other Names pairs with state rather than classification.
    // Subtype is new this rev (cascade child of Type, seeded via runFieldAddPass
    // with optionsByParent matrix in BUILTIN_TEMPLATES). Founded / Established
    // is new (seeded via runFieldAddPass). Population & Distribution pulled up
    // from the middle of the entry-ref multi cluster into the leading run so
    // it pairs with Founded/Established AND the entry-ref multi cluster becomes
    // uninterrupted (Races, Locations, Languages, Religions, Members).
    { template: "Culture / People", fieldLabel: "Other Names", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Culture / People", fieldLabel: "Status", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Culture / People", fieldLabel: "Type", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Culture / People", fieldLabel: "Subtype", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Culture / People", fieldLabel: "Founded / Established", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Culture / People", fieldLabel: "Population & Distribution", rev: "v1.3-halfwidth", halfWidth: true },
    // v1.3-halfwidth Deity / Entity pass: 8 fields tagged. Pairs after reorder:
    // Other Names|Status, Type|Power Tier, Cultural Position|Cultural Reach,
    // Domains / Portfolio|Alignment / Disposition. Four new fields (Power Tier,
    // Cultural Position, Cultural Reach, plus Domains / Portfolio type-converted
    // from tags) seeded via runFieldAddPass / FIELD_TYPE_CONVERSIONS. Type and
    // Status both have options stripped (via OPTIONS_UPDATES) of tier-flavored
    // and culture-flavored entries respectively, in favor of the new dedicated
    // structured fields. Symbol / Iconography moved down to the textarea
    // cluster so the entry-ref multi cluster (Pantheon → Opposing Powers)
    // becomes uninterrupted.
    { template: "Deity / Entity", fieldLabel: "Other Names", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Deity / Entity", fieldLabel: "Status", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Deity / Entity", fieldLabel: "Type", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Deity / Entity", fieldLabel: "Power Tier", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Deity / Entity", fieldLabel: "Cultural Position", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Deity / Entity", fieldLabel: "Cultural Reach", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Deity / Entity", fieldLabel: "Domains / Portfolio", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Deity / Entity", fieldLabel: "Alignment / Disposition", rev: "v1.3-halfwidth", halfWidth: true },
    // v1.3-halfwidth Book / Document / Text / Tome pass: 8 fields tagged.
    // Pairs after reorder: Other Names|Date Written, Author|Language, Type|
    // Status, Cultural Position|Current Location. Cultural Position is a new
    // field (seeded via runFieldAddPass) — its halfWidth tag is baked into
    // BUILTIN_TEMPLATES. Author and Language are type-converted from multi
    // entry-ref to single via MULTI_TO_SINGLE_CONVERSIONS below — without the
    // multi flag, they become half-eligible. The HALFWIDTH_UPDATES entries
    // here are belt-and-suspenders for in-flight build state plus retroactive
    // tagging for the four pre-existing fields (Other Names, Date Written,
    // Type, Status, Current Location) on worlds that pre-date this rev.
    { template: "Book / Document / Text / Tome", fieldLabel: "Other Names", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Book / Document / Text / Tome", fieldLabel: "Date Written", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Book / Document / Text / Tome", fieldLabel: "Author", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Book / Document / Text / Tome", fieldLabel: "Language", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Book / Document / Text / Tome", fieldLabel: "Type", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Book / Document / Text / Tome", fieldLabel: "Status", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Book / Document / Text / Tome", fieldLabel: "Cultural Position", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Book / Document / Text / Tome", fieldLabel: "Current Location", rev: "v1.3-halfwidth", halfWidth: true },
    // v1.3-halfwidth Faction / Government / Organization pass: 10 fields
    // tagged. Pairs after reorder: Other Names|Founded, Type|Status, Parent
    // Organization|Alignment / Ideology, Headquarters|Membership Size,
    // Cultural Position|Cultural Reach. Cultural Position and Cultural Reach
    // are new fields (seeded via runFieldAddPass) — their halfWidth tags ride
    // in BUILTIN_TEMPLATES. The eight pre-existing fields get retroactive
    // halfWidth tagging via these entries.
    { template: "Faction / Government / Organization", fieldLabel: "Other Names", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Faction / Government / Organization", fieldLabel: "Founded", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Faction / Government / Organization", fieldLabel: "Type", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Faction / Government / Organization", fieldLabel: "Status", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Faction / Government / Organization", fieldLabel: "Parent Organization", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Faction / Government / Organization", fieldLabel: "Alignment / Ideology", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Faction / Government / Organization", fieldLabel: "Headquarters", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Faction / Government / Organization", fieldLabel: "Membership Size", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Faction / Government / Organization", fieldLabel: "Cultural Position", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Faction / Government / Organization", fieldLabel: "Cultural Reach", rev: "v1.3-halfwidth", halfWidth: true },
    // v1.3-halfwidth Festival / Holiday pass: 8 fields tagged. Pairs after
    // reorder: Other Names|Calendar Date, Type|Status, Frequency|Duration,
    // Cultural Position|Cultural Reach. Cultural Position and Cultural Reach
    // are new fields (seeded via runFieldAddPass) — their halfWidth tags
    // ride in BUILTIN_TEMPLATES. The six pre-existing fields get retroactive
    // halfWidth tagging via these entries.
    { template: "Festival / Holiday", fieldLabel: "Other Names", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Festival / Holiday", fieldLabel: "Calendar Date", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Festival / Holiday", fieldLabel: "Type", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Festival / Holiday", fieldLabel: "Status", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Festival / Holiday", fieldLabel: "Frequency", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Festival / Holiday", fieldLabel: "Duration", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Festival / Holiday", fieldLabel: "Cultural Position", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Festival / Holiday", fieldLabel: "Cultural Reach", rev: "v1.3-halfwidth", halfWidth: true },
    // v1.3-halfwidth Historical Event pass: 6 fields tagged. Pairs after
    // reorder: Other Names|Calendar Date, Type|Status, Cultural Position|
    // Cultural Reach. Duration (calendar-date-range, always full-width) sits
    // between Preceded By and Followed By, forming a "before → duration →
    // after" temporal sequence cluster before the spatial/participant
    // entry-ref multi cluster.
    { template: "Historical Event", fieldLabel: "Other Names", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Historical Event", fieldLabel: "Calendar Date", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Historical Event", fieldLabel: "Type", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Historical Event", fieldLabel: "Status", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Historical Event", fieldLabel: "Cultural Position", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Historical Event", fieldLabel: "Cultural Reach", rev: "v1.3-halfwidth", halfWidth: true },
    // v1.3-halfwidth Language / Glossary pass: 6 fields tagged. Pairs after
    // reorder: Other Names|Pronunciation (name | sound), Entry Type|Status,
    // Cultural Position|Cultural Reach. Cultural Position and Cultural
    // Reach are new fields seeded via runFieldAddPass — halfWidth tags ride
    // in BUILTIN_TEMPLATES.
    { template: "Language / Glossary", fieldLabel: "Other Names", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Language / Glossary", fieldLabel: "Pronunciation", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Language / Glossary", fieldLabel: "Entry Type", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Language / Glossary", fieldLabel: "Status", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Language / Glossary", fieldLabel: "Cultural Position", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Language / Glossary", fieldLabel: "Cultural Reach", rev: "v1.3-halfwidth", halfWidth: true },
    // v1.3-halfwidth Magic / Tech System pass: 6 fields tagged. Pairs after
    // reorder: Other Names|Magnitude / Scale, Type|Status, Cultural Position|
    // Cultural Reach. Magnitude / Scale and Cultural Reach are new fields
    // seeded via runFieldAddPass — halfWidth tags ride in BUILTIN_TEMPLATES.
    // Cultural Position was added in an earlier v1.3 pass without halfWidth;
    // gets retroactive tagging here.
    { template: "Magic / Tech System", fieldLabel: "Other Names", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Magic / Tech System", fieldLabel: "Magnitude / Scale", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Magic / Tech System", fieldLabel: "Type", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Magic / Tech System", fieldLabel: "Status", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Magic / Tech System", fieldLabel: "Cultural Position", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Magic / Tech System", fieldLabel: "Cultural Reach", rev: "v1.3-halfwidth", halfWidth: true },
    // v1.3-halfwidth Plot Thread pass: 6 fields tagged. Pairs after reorder:
    // POV Character|Genre (who | genre), Scope|Story Function (size | role),
    // Status|Resolution Type (current state | outcome shape). Story Function
    // and Resolution Type are new fields seeded via runFieldAddPass —
    // halfWidth tags ride in BUILTIN_TEMPLATES. Plot Thread is a meta-
    // narrative template, so no Cultural Position / Cultural Reach (those
    // describe in-world entity reception; plot threads are authorial
    // organization tools).
    { template: "Plot Thread", fieldLabel: "POV Character", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Plot Thread", fieldLabel: "Genre", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Plot Thread", fieldLabel: "Scope", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Plot Thread", fieldLabel: "Story Function", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Plot Thread", fieldLabel: "Status", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Plot Thread", fieldLabel: "Resolution Type", rev: "v1.3-halfwidth", halfWidth: true },
    // v1.3-halfwidth Race / Species / Ancestry pass: 8 fields tagged. Pairs
    // after reorder: Other Names|Lifespan (identity + biological),
    // BroadType|Type (cascade pair 1), Subtype|Status (cascade L3 paired
    // with state), Cultural Position|Cultural Reach (societal axes). The
    // cascade-chain fields BroadType, Type, Subtype are all half-width to
    // form a continuous tight cascade row visually. Lifespan kept as half
    // (paired with Other Names) — biological identity descriptor.
    { template: "Race / Species / Ancestry", fieldLabel: "Other Names", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Race / Species / Ancestry", fieldLabel: "Lifespan", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Race / Species / Ancestry", fieldLabel: "BroadType", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Race / Species / Ancestry", fieldLabel: "Type", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Race / Species / Ancestry", fieldLabel: "Subtype", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Race / Species / Ancestry", fieldLabel: "Status", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Race / Species / Ancestry", fieldLabel: "Cultural Position", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Race / Species / Ancestry", fieldLabel: "Cultural Reach", rev: "v1.3-halfwidth", halfWidth: true },
    // v1.3-halfwidth Religion / Belief System pass: 8 fields tagged. Pairs
    // after reorder: Other Names|Status, Founder|Founded / Established,
    // Type|Subtype (cascade pair), Cultural Position|Cultural Reach. All
    // eight are new/uplifted in this pass — halfWidth tags ride in
    // BUILTIN_TEMPLATES for the new fields (Other Names, Founder,
    // Founded / Established, Subtype, Cultural Position, Cultural Reach);
    // existing fields (Type, Status) get retroactive tagging here.
    { template: "Religion / Belief System", fieldLabel: "Other Names", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Religion / Belief System", fieldLabel: "Status", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Religion / Belief System", fieldLabel: "Founder", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Religion / Belief System", fieldLabel: "Founded / Established", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Religion / Belief System", fieldLabel: "Type", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Religion / Belief System", fieldLabel: "Subtype", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Religion / Belief System", fieldLabel: "Cultural Position", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Religion / Belief System", fieldLabel: "Cultural Reach", rev: "v1.3-halfwidth", halfWidth: true },
    // v1.3-halfwidth Substance / Material pass: 8 fields tagged. Pairs after
    // reorder: Other Names|Status, Type|Subtype (cascade pair), Trade Value|
    // Rarity (economic | scarcity), Cultural Position|Cultural Reach
    // (societal axes). Status, Subtype, Cultural Position, Cultural Reach
    // are new fields seeded via runFieldAddPass — halfWidth tags ride in
    // BUILTIN_TEMPLATES. Other Names (renamed from Aliases / Other Names),
    // Type, Trade Value, Rarity get retroactive tagging here.
    { template: "Substance / Material", fieldLabel: "Other Names", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Substance / Material", fieldLabel: "Status", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Substance / Material", fieldLabel: "Type", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Substance / Material", fieldLabel: "Subtype", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Substance / Material", fieldLabel: "Trade Value", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Substance / Material", fieldLabel: "Rarity", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Substance / Material", fieldLabel: "Cultural Position", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Substance / Material", fieldLabel: "Cultural Reach", rev: "v1.3-halfwidth", halfWidth: true },
    // v1.3-halfwidth Theme / Motif pass: 6 fields tagged. Pairs after
    // reorder: Other Names|Tone / Mood (identity + atmospheric register),
    // Type|Subtype (cascade pair), Prevalence|Universality (narrative-weight
    // axes). All six are new or uplifted in this pass — Other Names,
    // Tone / Mood, Subtype, Prevalence, Universality auto-seed via
    // runFieldAddPass; Type gets retroactive tagging. Theme / Motif is a
    // meta-narrative template (like Plot Thread), so no Cultural Position /
    // Cultural Reach (those describe in-world entity reception).
    { template: "Theme / Motif", fieldLabel: "Other Names", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Theme / Motif", fieldLabel: "Tone / Mood", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Theme / Motif", fieldLabel: "Type", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Theme / Motif", fieldLabel: "Subtype", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Theme / Motif", fieldLabel: "Prevalence", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Theme / Motif", fieldLabel: "Universality", rev: "v1.3-halfwidth", halfWidth: true },
    // v1.3-halfwidth Vehicle pass: 14 fields tagged. Pairs after reorder:
    // Other Names|Classification / Class (identity + class designation),
    // Status|Built / Launched (current state + origin date), Type|Subtype
    // (cascade pair), Owner / Faction|Captain / Commander (ownership +
    // command), Propulsion / Power|Passenger / Cargo Capacity (mechanical
    // descriptors), Crew Capacity|Home Port / Base (operational), Cultural
    // Position|Cultural Reach (societal axes). Most fields are new or
    // uplifted — Other Names (renamed from Aliases / Designation), Built /
    // Launched, Subtype, Cultural Position, Cultural Reach auto-seed via
    // runFieldAddPass; Classification / Class, Status, Type, Owner /
    // Faction, Captain / Commander, Propulsion / Power, Passenger / Cargo
    // Capacity, Crew Capacity, Home Port / Base get retroactive tagging.
    { template: "Vehicle", fieldLabel: "Other Names", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Vehicle", fieldLabel: "Classification / Class", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Vehicle", fieldLabel: "Status", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Vehicle", fieldLabel: "Built / Launched", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Vehicle", fieldLabel: "Type", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Vehicle", fieldLabel: "Subtype", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Vehicle", fieldLabel: "Owner / Faction", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Vehicle", fieldLabel: "Captain / Commander", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Vehicle", fieldLabel: "Propulsion / Power", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Vehicle", fieldLabel: "Passenger / Cargo Capacity", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Vehicle", fieldLabel: "Crew Capacity", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Vehicle", fieldLabel: "Home Port / Base", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Vehicle", fieldLabel: "Cultural Position", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Vehicle", fieldLabel: "Cultural Reach", rev: "v1.3-halfwidth", halfWidth: true },
    // v1.3-halfwidth Weapon / Armor pass: 12 fields tagged. Pairs after
    // reorder: Other Names|Status, Type|Subtype (cascade pair),
    // Damage / Protection|Reach / Range (combat specs), Weight Class|
    // Handedness (physical specs), Built / Forged|Current Wielder / Wearer
    // (temporal anchors), Cultural Position|Cultural Reach (societal axes).
    // Other Names (renamed), Subtype, Built / Forged, Cultural Position,
    // Cultural Reach auto-seed via runFieldAddPass; Status, Type (renamed
    // from Category), Damage / Protection, Reach / Range, Weight Class,
    // Handedness, Current Wielder / Wearer get retroactive tagging.
    { template: "Weapon / Armor", fieldLabel: "Other Names", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Weapon / Armor", fieldLabel: "Status", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Weapon / Armor", fieldLabel: "Type", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Weapon / Armor", fieldLabel: "Subtype", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Weapon / Armor", fieldLabel: "Damage / Protection", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Weapon / Armor", fieldLabel: "Reach / Range", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Weapon / Armor", fieldLabel: "Weight Class", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Weapon / Armor", fieldLabel: "Handedness", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Weapon / Armor", fieldLabel: "Built / Forged", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Weapon / Armor", fieldLabel: "Current Wielder / Wearer", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Weapon / Armor", fieldLabel: "Cultural Position", rev: "v1.3-halfwidth", halfWidth: true },
    { template: "Weapon / Armor", fieldLabel: "Cultural Reach", rev: "v1.3-halfwidth", halfWidth: true },
    // v1.3-halfwidth Creature second pass: 6 new half-eligible fields tagged.
    // Lifespan (split from Lifespan / Reproduction textarea), Subtype
    // (cascade child of Type), Threat Level / Danger Rating (RPG-style
    // danger axis), Size / Scale (canonical creature-size spectrum),
    // Cultural Position + Cultural Reach (societal axes). The pre-existing
    // half-eligible fields (Other Names, Type, Status, Sentience Level,
    // Habitat, Diet) were tagged in Creature's first halfwidth pass earlier
    // this session — not re-tagged here.
    { template: "Creature", fieldLabel: "Lifespan", rev: "v1.3-halfwidth-2", halfWidth: true },
    { template: "Creature", fieldLabel: "Subtype", rev: "v1.3-halfwidth-2", halfWidth: true },
    { template: "Creature", fieldLabel: "Threat Level / Danger Rating", rev: "v1.3-halfwidth-2", halfWidth: true },
    { template: "Creature", fieldLabel: "Size / Scale", rev: "v1.3-halfwidth-2", halfWidth: true },
    { template: "Creature", fieldLabel: "Cultural Position", rev: "v1.3-halfwidth-2", halfWidth: true },
    { template: "Creature", fieldLabel: "Cultural Reach", rev: "v1.3-halfwidth-2", halfWidth: true },
  ];
  if (!state.world.halfWidthUpdates || typeof state.world.halfWidthUpdates !== "object") {
    state.world.halfWidthUpdates = {};
  }
  HALFWIDTH_UPDATES.forEach(({ template: tplName, fieldLabel, rev, halfWidth }) => {
    const key = `${tplName}:${fieldLabel}`;
    const appliedRevs = state.world.halfWidthUpdates[key] || [];
    if (appliedRevs.includes(rev)) return;
    const markApplied = () => {
      state.world.halfWidthUpdates[key] = [...appliedRevs, rev];
    };
    const userTpl = state.templates.find(t => t.name === tplName && t.origin === TEMPLATE_ORIGIN.BUILTIN);
    if (!userTpl) { markApplied(); return; }
    const field = (userTpl.fields || []).find(f =>
      (f.label || "").toLowerCase() === fieldLabel.toLowerCase()
    );
    if (!field) { markApplied(); return; }
    // Preserve user customization: only set when current halfWidth is undefined.
    // Explicit true or false on the field counts as a working choice — leave it.
    if (typeof field.halfWidth === "undefined") {
      field.halfWidth = halfWidth;
    }
    markApplied();
  });

  // v1.3: FIELD_TYPE_CONVERSIONS — converts an existing built-in field's
  // underlying TYPE in place, migrating each entry's value through the
  // provided convertValue callback. Different from FIELD_RENAMES (label-only)
  // and from FIELD_ADDS (new field with new label). Required when:
  //   - the field's label stays the same
  //   - the type changes (e.g. text → select)
  //   - so field-add's "label-exists, skip" gate would prevent the new schema
  //     from reaching existing worlds
  // The conversion patches the field's type, options, otherTextField in place
  // and rewrites entry values through convertValue. Returning null/undefined
  // from convertValue clears the field on that entry. Tracked per (template,
  // field, rev) so each conversion runs once.
  const FIELD_TYPE_CONVERSIONS = [
    {
      template: "Cosmology / Plane",
      fieldLabel: "Time Flow",
      rev: "v1.3",
      from: "text",
      to: "select",
      options: ["Normal", "Relative to Material: Faster", "Relative to Material: Slower", "Reversed", "Static / Frozen", "Unknown", "Variable", "Other"],
      otherTextField: true,
      // Old text values aren't in the new options list; preserve them as
      // customText under the "Other" pseudo-value so the user can re-classify
      // (or leave as-is) without data loss.
      convertValue: (oldVal) => {
        const t = (oldVal == null) ? "" : String(oldVal).trim();
        if (!t) return null;
        return { value: "Other", customText: t };
      },
    },
    {
      // v1.3 Faction / Government / Organization: Type was freeform text in
      // v1.2 ("Guild", "Royal Court", "Pirates of the southern islands", etc).
      // v1.3 converts it to a structured select with curated options +
      // otherTextField. Old text values preserved under value="Other" as
      // customText so nothing is lost — user can re-classify to a canonical
      // option afterward. Template name keyed under post-rename name since
      // TEMPLATE_RENAMES runs before FIELD_TYPE_CONVERSIONS.
      template: "Faction / Government / Organization",
      fieldLabel: "Type",
      rev: "v1.3",
      from: "text",
      to: "select",
      options: ["Academic Society", "Cabal / Coven", "City State", "Clan / Tribe", "Corporation", "Council", "Court", "Criminal Syndicate", "Cult", "Government / State", "Guild", "Intelligence Agency", "Knightly Order", "Mercenary Company", "Military Unit", "Movement", "Noble House", "Religious Order", "Resistance / Rebellion", "Secret Society / Lodge", "Tribunal", "Other"],
      otherTextField: true,
      convertValue: (oldVal) => {
        const t = (oldVal == null) ? "" : String(oldVal).trim();
        if (!t) return null;
        return { value: "Other", customText: t };
      },
    },
    {
      // v1.3 Magic / Tech System: System Type (text) was renamed to Type via
      // FIELD_RENAMES, then converted to a structured select. Old text values
      // ("Wild magic", "Steampunk machinery", "Innate sorcery", etc.) preserved
      // under value="Other" as customText so nothing is lost — user can
      // re-classify to a canonical option afterward. Keyed under the renamed
      // label "Type" since FIELD_RENAMES (step 3) runs before
      // FIELD_TYPE_CONVERSIONS (step 8).
      template: "Magic / Tech System",
      fieldLabel: "Type",
      rev: "v1.3",
      from: "text",
      to: "select",
      options: ["Aerospace / Space-faring","Alchemy","Arcane / Wizardry","Bardic / Sonic","Biotechnology / Genetic","Blood / Hemomancy","Clockwork / Mechanical","Conceptual","Cybernetic","Divine / Theurgy","Druidic / Nature","Elemental","Enchantment / Imbuement","Industrial","Information / Computing","Innate / Sorcerous","Magitech","Nanotechnology","Necromancy","Psionic / Mental","Ritual / Ceremonial","Robotics / AI","Rune / Sigil","Shamanic / Spirit","Steampunk / Steam","Summoning / Binding","Other"],
      otherTextField: true,
      convertValue: (oldVal) => {
        const t = (oldVal == null) ? "" : String(oldVal).trim();
        if (!t) return null;
        return { value: "Other", customText: t };
      },
    },
    {
      // v1.3-halfwidth Character: Cause of Death converted textarea → text so
      // it can pair half-width with Status (textareas are always full-width
      // per the layout rules). showWhen on CoD survives unchanged — when
      // Status≠Deceased, the pair's right slot stays empty (designed pair
      // with hidden partner). When Status===Deceased, the pair renders
      // complete. Pass-through convertValue preserves the user's content
      // verbatim — text content stays intact, but multi-paragraph prose and
      // markdown formatting (bold/italic/headers) stop rendering since text
      // fields are single-line plain. Users with long-prose CoD values can
      // move that prose to Description or Background before/after upgrading.
      template: "Character",
      fieldLabel: "Cause of Death",
      rev: "v1.3-halfwidth",
      from: "textarea",
      to: "text",
      convertValue: (oldVal) => {
        if (oldVal == null) return null;
        const t = String(oldVal);
        return t.length > 0 ? t : null;
      },
    },
    {
      // v1.3-halfwidth Character: Lineage / Bloodline converted text → textarea.
      // Opposite direction from the standard v1.3 conversions — this widens
      // the field so users can write structured prose about ancestry and
      // bloodline rather than fitting it on a single line. Pass-through
      // convertValue; the string is preserved as-is. Text values that were
      // short single-line strings still display fine inside the textarea
      // (they just gain markdown rendering and multi-line support).
      template: "Character",
      fieldLabel: "Lineage / Bloodline",
      rev: "v1.3-halfwidth",
      from: "text",
      to: "textarea",
      convertValue: (oldVal) => {
        if (oldVal == null) return null;
        const t = String(oldVal);
        return t.length > 0 ? t : null;
      },
    },
    {
      // v1.3-halfwidth Artifact: Currency Details narrows textarea → text.
      // Was a multi-line free-form description ("denomination, exchange rate,
      // composition") — in practice users wrote a sentence or two, never
      // paragraphs. Combined with the new Type=Currency/Coin showWhen gate
      // and halfWidth pair with Issuing Faction, single-line text is the
      // honest shape. Pass-through convertValue: long strings still fit in
      // a text input (it scrolls horizontally), short ones are unchanged.
      template: "Artifact / Object / Currency",
      fieldLabel: "Currency Details",
      rev: "v1.3-halfwidth",
      from: "textarea",
      to: "text",
      convertValue: (oldVal) => {
        if (oldVal == null) return null;
        const t = String(oldVal);
        return t.length > 0 ? t : null;
      },
    },
    {
      // v1.3-halfwidth Creature: Habitat narrows text → select with curated
      // ecological-biome options + otherTextField. Was freeform text in v1.2
      // ("Northern temperate forests", "swamp edges", etc.) — converted to a
      // structured select so Habitat | Diet can render as a coherent paired
      // ecological-axis. Old text values preserved under value="Other" with
      // customText so nothing is lost; user can re-classify to a canonical
      // habitat afterward. Same pattern as the v1.3 Faction Type and
      // Cosmology Time Flow conversions.
      template: "Creature",
      fieldLabel: "Habitat",
      rev: "v1.3-halfwidth",
      from: "text",
      to: "select",
      options: ["Aerial", "Aquatic", "Coastal", "Desert", "Extraplanar", "Forest / Woodland", "Grassland / Plains", "Jungle / Rainforest", "Mountain", "Polar / Tundra", "Subterranean / Cave", "Swamp / Wetland", "Urban", "Volcanic", "Variable", "Unknown", "Other"],
      otherTextField: true,
      convertValue: (oldVal) => {
        const t = (oldVal == null) ? "" : String(oldVal).trim();
        if (!t) return null;
        return { value: "Other", customText: t };
      },
    },
    {
      // v1.3-halfwidth Deity / Entity: Domains / Portfolio converted from tags
      // (free-form comma-separated multi-value) to select (single-value with
      // otherTextField). Per doctrine, multi-value semantic identification
      // lives on the universal tags axis at the top of every entry; the
      // structured Domains / Portfolio field captures the canonical PRIMARY
      // domain. Multi-domain deities (Athena: Wisdom+War+Weaving) put the
      // primary domain here, additional domains go on the entry's tags axis
      // and/or in Boons / Powers / Description textareas.
      //
      // Existing tags values are comma-separated strings ("Death, Knowledge,
      // Sun"). convertValue preserves the full string under
      // value="Other", customText=<original> so no data is lost; user
      // manually picks the primary domain from the new select options after
      // migration.
      template: "Deity / Entity",
      fieldLabel: "Domains / Portfolio",
      rev: "v1.3-halfwidth",
      from: "tags",
      to: "select",
      options: ["Agriculture / Harvest", "Beauty / Love", "Commerce / Trade", "Corruption / Decay", "Craft / Smithing", "Creation", "Death / Underworld", "Destruction", "Earth / Land", "Fate / Prophecy", "Fear / Terror", "Fertility", "Fire / Forge", "Forest / Wild", "Healing / Medicine", "Hunt", "Justice / Law", "Knowledge / Wisdom", "Life", "Light / Sun", "Madness / Insanity", "Magic", "Murder / Bloodshed", "Music / Arts", "Night / Moon", "Plague / Disease", "Psionics", "Sea / Water", "Sky / Air", "Storm / Weather", "Suffering / Pain", "Time", "Travel", "Trickery / Deception", "Tyranny", "War", "Other"],
      otherTextField: true,
      convertValue: (oldVal) => {
        const t = (oldVal == null) ? "" : String(oldVal).trim();
        if (!t) return null;
        return { value: "Other", customText: t };
      },
    },
    {
      // v1.3-halfwidth Religion / Belief System: Sacred Texts / Scriptures
      // converted textarea → entry-ref multi. Sacred texts deserve to be
      // first-class entries (each text gets its own Book / Document / Text /
      // Tome entry with author, date, status, cultural position, etc.)
      // rather than a prose list in a textarea on the parent religion. The
      // entry-ref multi field lets users link existing Book entries
      // structurally; Concordance shows reverse-refs from the religion back.
      //
      // Migration: prose can't auto-convert to entry IDs (the textarea may
      // list "The Bible, Quran, Torah" while user has no matching Book
      // entries, or arbitrary names that don't map to entries). convertValue
      // returns null to clear the field (new shape is array of refs, starts
      // empty). appendToNotes preserves the original prose under a labeled
      // header in Notes per non-destructive-migration doctrine; user reads
      // it and creates Book entries to link, or leaves as Notes prose.
      template: "Religion / Belief System",
      fieldLabel: "Sacred Texts / Scriptures",
      rev: "v1.3-halfwidth",
      from: "textarea",
      to: "entry-ref",
      multi: true,
      refTemplate: "Book / Document / Text / Tome",
      convertValue: () => null,
      appendToNotes: "Sacred Texts / Scriptures (was prose, now structured — create Book / Document entries to link):",
    },
    {
      // v1.3-halfwidth Weapon / Armor: Materials converted tags → entry-ref
      // multi (Substance / Material). Materials become first-class entries
      // — each material is its own Substance entry with type, rarity, trade
      // value, cultural reception, etc. Concordance shows reverse-refs from
      // material entries back to weapons / armor that use them. This is the
      // first tags → entry-ref conversion in the framework; appendToNotes
      // was extended to handle array oldVal (joins with comma + space).
      //
      // Tag strings can't auto-convert to entry IDs (the array might contain
      // "Steel, Wood, Leather" but the user may have no matching Substance
      // entries, or have entries with different names). convertValue returns
      // null to clear the field (new shape is array of refs, starts empty).
      // appendToNotes preserves the original tag list in Notes per non-
      // destructive doctrine; user reads it and creates Substance entries
      // to link.
      template: "Weapon / Armor",
      fieldLabel: "Materials",
      rev: "v1.3-halfwidth",
      from: "tags",
      to: "entry-ref",
      multi: true,
      refTemplate: "Substance / Material",
      convertValue: () => null,
      appendToNotes: "Materials (was free-form tags, now structured — create Substance / Material entries to link):",
    },
  ];
  if (!state.world.fieldTypeConversions || typeof state.world.fieldTypeConversions !== "object") {
    state.world.fieldTypeConversions = {};
  }
  FIELD_TYPE_CONVERSIONS.forEach(({ template: tplName, fieldLabel, rev, from, to, options, otherTextField, multi, refTemplate, convertValue, appendToNotes }) => {
    const key = `${tplName}:${fieldLabel}`;
    const appliedRevs = state.world.fieldTypeConversions[key] || [];
    if (appliedRevs.includes(rev)) return;
    const markApplied = () => {
      state.world.fieldTypeConversions[key] = [...appliedRevs, rev];
    };
    const userTpl = state.templates.find(t => t.name === tplName && t.origin === TEMPLATE_ORIGIN.BUILTIN);
    if (!userTpl) { markApplied(); return; }
    const field = (userTpl.fields || []).find(f =>
      (f.label || "").toLowerCase() === fieldLabel.toLowerCase()
    );
    if (!field) { markApplied(); return; }
    // Already converted (defensive): if type is already the target, skip.
    if (field.type === to) { markApplied(); return; }
    // Unexpected source type — leave the field alone, mark applied so we don't
    // keep trying. User might have already hand-edited; don't stomp.
    if (field.type !== from) { markApplied(); return; }

    // appendToNotes resolution (v1.3-halfwidth doctrine: non-destructive
    // migration — when converting a textarea to a non-prose field type,
    // preserve the original prose content in Notes). Resolved up front to
    // avoid the per-entry find() cost.
    const notesField = appendToNotes
      ? (userTpl.fields || []).find(f => (f.label || "").toLowerCase() === "notes" && f.type === "textarea")
      : null;

    // Convert each entry's value via the callback. Operate on a per-entry basis
    // so a malformed value on one entry doesn't break the whole migration.
    state.entries.forEach(e => {
      if (e.templateId !== userTpl.id) return;
      if (!e.fields || !(field.id in e.fields)) return;
      try {
        const oldVal = e.fields[field.id];
        const newVal = convertValue(oldVal);
        if (newVal == null) {
          delete e.fields[field.id];
        } else {
          e.fields[field.id] = newVal;
        }
        // appendToNotes — preserve the original value under the header
        // label in Notes. Handles both string oldVal (textarea conversions)
        // and array oldVal (tags conversions — joined with commas). Only
        // fires when appendToNotes is requested AND there's non-empty
        // content AND Notes field exists. No-op for other unexpected
        // shapes (defensive).
        let preservedText = "";
        if (typeof oldVal === "string") {
          preservedText = oldVal.trim();
        } else if (Array.isArray(oldVal)) {
          preservedText = oldVal
            .filter(v => v != null && String(v).trim())
            .map(String)
            .join(", ");
        }
        if (appendToNotes && notesField && preservedText) {
          const existing = e.fields[notesField.id];
          const block = `${appendToNotes}\n${preservedText}`;
          if (typeof existing === "string" && existing.trim()) {
            e.fields[notesField.id] = `${block}\n\n${existing}`;
          } else {
            e.fields[notesField.id] = block;
          }
        }
      } catch (err) {
        // Don't lose the rest of the migration if one entry's convert blows up.
        console.warn(`FIELD_TYPE_CONVERSIONS: convertValue failed on entry ${e.id} field ${field.id}:`, err);
      }
    });

    // Patch the field's schema in place.
    field.type = to;
    if (Array.isArray(options)) field.options = options;
    if (otherTextField) field.otherTextField = true;
    if (multi === true) field.multi = true;
    if (typeof refTemplate === "string" && refTemplate) field.refTemplate = refTemplate;
    markApplied();
  });

  // v1.3-halfwidth: MULTI_TO_SINGLE_CONVERSIONS — converts a built-in
  // entry-ref field from multi to single. Patches the field's `multi` flag
  // (sets to false) and migrates each entry's value: arrays of refs collapse
  // to the first non-null element, the rest are dropped. Lossy by design.
  //
  // Required when an existing built-in field's `multi: true` flag is removed
  // in the canonical schema (commonly to make the field half-eligible — multi
  // entry-refs are full-width chip lists by the layout rules). FIELD_TYPE_-
  // CONVERSIONS doesn't apply because the type stays "entry-ref"; HALFWIDTH_-
  // UPDATES doesn't touch the multi flag. This framework is the only path
  // that aligns existing-world field shape with the new single-ref schema.
  //
  // Tracked per (template, field, rev) with applied rev list, same shape as
  // FIELD_TYPE_CONVERSIONS. Defensive: if the field is already single, or
  // not an entry-ref, the entry is silently skipped and marked applied so
  // it never retries.
  const MULTI_TO_SINGLE_CONVERSIONS = [
    {
      template: "Book / Document / Text / Tome",
      fieldLabel: "Author",
      rev: "v1.3-halfwidth",
    },
    {
      template: "Book / Document / Text / Tome",
      fieldLabel: "Language",
      rev: "v1.3-halfwidth",
    },
  ];
  if (!state.world.multiToSingleConversions || typeof state.world.multiToSingleConversions !== "object") {
    state.world.multiToSingleConversions = {};
  }
  MULTI_TO_SINGLE_CONVERSIONS.forEach(({ template: tplName, fieldLabel, rev }) => {
    const key = `${tplName}:${fieldLabel}`;
    const appliedRevs = state.world.multiToSingleConversions[key] || [];
    if (appliedRevs.includes(rev)) return;
    const markApplied = () => {
      state.world.multiToSingleConversions[key] = [...appliedRevs, rev];
    };
    const userTpl = state.templates.find(t => t.name === tplName && t.origin === TEMPLATE_ORIGIN.BUILTIN);
    if (!userTpl) { markApplied(); return; }
    const field = (userTpl.fields || []).find(f =>
      (f.label || "").toLowerCase() === fieldLabel.toLowerCase()
    );
    if (!field) { markApplied(); return; }
    if (field.type !== "entry-ref") { markApplied(); return; }
    // Already single — user may have hand-edited or the schema was already
    // aligned. Mark applied and move on.
    if (!field.multi) { markApplied(); return; }

    // Collapse each entry's array to its first non-null element. Defensive
    // against unexpected shapes — if the value isn't an array, leave it alone.
    state.entries.forEach(e => {
      if (e.templateId !== userTpl.id) return;
      if (!e.fields || !(field.id in e.fields)) return;
      const v = e.fields[field.id];
      if (Array.isArray(v)) {
        const first = v.find(x => x != null);
        if (first == null) {
          delete e.fields[field.id];
        } else {
          e.fields[field.id] = first;
        }
      }
    });

    // Patch the field's schema: drop the multi flag.
    field.multi = false;
    markApplied();
  });

  // v1.3-halfwidth: FIELD_VALUE_REMAPS — remaps an entry's stored value from
  // one field/value to one or more field/value writes. The canonical use
  // case is "value moved from FieldA to FieldB during a schema restructure"
  // — e.g., Deity Type=Archfiend (tier-flavored) → Type=Fiend + Power Tier=
  // Greater after the orthogonality split, or Book Status=Forbidden →
  // Cultural Position=Forbidden after the cultural-axis separation.
  //
  // Shape: `when` declares the trigger condition (field label + value to
  // match); `then` declares the writes as an object map of {field label:
  // new value}. A null value in `then` means delete that field's value
  // entirely. Bare strings are written raw — normalizeEntryFields (which
  // runs at the end of migrate) coerces them to the right shape for
  // otherTextField select fields ({value, customText: ""}).
  //
  // Match logic handles both legacy bare-string select values ("Forbidden")
  // and the modern otherTextField shape ({value: "Forbidden", customText:
  // ""}). Won't match {value: "Other", customText: "Forbidden"} — that's
  // the user explicitly typing the value into the customText escape, and
  // their intent overrides the remap.
  //
  // Tracked per (template, fromField, fromValue) with applied rev list,
  // same as FIELD_TYPE_CONVERSIONS / MULTI_TO_SINGLE_CONVERSIONS. Idempotent.
  const FIELD_VALUE_REMAPS = [
    // Deity / Entity Type → Type + Power Tier remap (Power Tier orthogonality
    // split, see v1.3-halfwidth Type strip and Power Tier addition above).
    {
      template: "Deity / Entity",
      when: { field: "Type", value: "Archangel" },
      then: { "Type": "Angel", "Power Tier": "Greater" },
      rev: "v1.3-halfwidth",
    },
    {
      template: "Deity / Entity",
      when: { field: "Type", value: "Archfiend" },
      then: { "Type": "Fiend", "Power Tier": "Greater" },
      rev: "v1.3-halfwidth",
    },
    {
      template: "Deity / Entity",
      when: { field: "Type", value: "High God" },
      then: { "Type": "Deity", "Power Tier": "High God" },
      rev: "v1.3-halfwidth",
    },
    {
      template: "Deity / Entity",
      when: { field: "Type", value: "Overgod" },
      then: { "Type": "Deity", "Power Tier": "Overgod" },
      rev: "v1.3-halfwidth",
    },
    // Book / Document / Text / Tome Status → Cultural Position remap
    // (cultural-axis separation, see v1.3-halfwidth Book Status strip and
    // Cultural Position addition above).
    {
      template: "Book / Document / Text / Tome",
      when: { field: "Status", value: "Forbidden" },
      then: { "Status": null, "Cultural Position": "Forbidden" },
      rev: "v1.3-halfwidth",
    },
    {
      template: "Book / Document / Text / Tome",
      when: { field: "Status", value: "Censored" },
      then: { "Status": null, "Cultural Position": "Suppressed" },
      rev: "v1.3-halfwidth",
    },
    // Faction / Government / Organization Status → Cultural Position remap
    // (cultural-axis separation, see v1.3-halfwidth Faction Status strip
    // and Cultural Position addition above).
    {
      template: "Faction / Government / Organization",
      when: { field: "Status", value: "Banned" },
      then: { "Status": null, "Cultural Position": "Forbidden" },
      rev: "v1.3-halfwidth",
    },
    {
      template: "Faction / Government / Organization",
      when: { field: "Status", value: "Suppressed" },
      then: { "Status": null, "Cultural Position": "Suppressed" },
      rev: "v1.3-halfwidth",
    },
    // Festival / Holiday Status → Cultural Position remap (cultural-axis
    // separation, see v1.3-halfwidth Festival Status strip and Cultural
    // Position addition above).
    {
      template: "Festival / Holiday",
      when: { field: "Status", value: "Banned / Outlawed" },
      then: { "Status": null, "Cultural Position": "Forbidden" },
      rev: "v1.3-halfwidth",
    },
    {
      template: "Festival / Holiday",
      when: { field: "Status", value: "Suppressed" },
      then: { "Status": null, "Cultural Position": "Suppressed" },
      rev: "v1.3-halfwidth",
    },
    // Historical Event Status → Cultural Position remap (cultural-axis
    // separation, see v1.3-halfwidth Historical Event Status strip and
    // Cultural Position addition above).
    {
      template: "Historical Event",
      when: { field: "Status", value: "Suppressed" },
      then: { "Status": null, "Cultural Position": "Suppressed" },
      rev: "v1.3-halfwidth",
    },
    // Language / Glossary Status → Cultural Position remap (cultural-axis
    // separation, see v1.3-halfwidth Language Status strip and Cultural
    // Position addition above).
    {
      template: "Language / Glossary",
      when: { field: "Status", value: "Suppressed" },
      then: { "Status": null, "Cultural Position": "Suppressed" },
      rev: "v1.3-halfwidth",
    },
    // Magic / Tech System Status → Cultural Position remap (cultural-axis
    // separation, see v1.3-halfwidth Magic / Tech Status strip above).
    {
      template: "Magic / Tech System",
      when: { field: "Status", value: "Suppressed" },
      then: { "Status": null, "Cultural Position": "Suppressed" },
      rev: "v1.3-halfwidth",
    },
    // v1.3-halfwidth Race / Species / Ancestry — BroadType option-rename
    // remaps. The OPTIONS_UPDATES strip above removed the old short names
    // (Aberration, Beastfolk, Construct) from the BroadType options list;
    // these FIELD_VALUE_REMAPS catch entries whose stored BroadType value
    // matches the stripped short name and remap to the canonical new name.
    // Fey, Humanoid, Undead, Elemental, Outsider / Extraplanar, Other are
    // unchanged in the new list (no remap needed).
    {
      template: "Race / Species / Ancestry",
      when: { field: "BroadType", value: "Aberration" },
      then: { "BroadType": "Aberration / Eldritch" },
      rev: "v1.3-halfwidth",
    },
    {
      template: "Race / Species / Ancestry",
      when: { field: "BroadType", value: "Beastfolk" },
      then: { "BroadType": "Beastfolk / Anthropomorphic" },
      rev: "v1.3-halfwidth",
    },
    {
      template: "Race / Species / Ancestry",
      when: { field: "BroadType", value: "Construct" },
      then: { "BroadType": "Construct / Automaton" },
      rev: "v1.3-halfwidth",
    },
    // v1.3-halfwidth Race / Species Status=Extraplanar preservation.
    // OPTIONS_UPDATES stripped "Extraplanar" from Status options above.
    // Under non-destructive-migration doctrine: clear the orphan Status
    // value AND append a Notes entry recording the original classification.
    // Doesn't auto-remap to BroadType=Outsider / Extraplanar because the
    // user may have already set BroadType to a more specific Type (e.g.
    // Humanoid with Status:Extraplanar = "a humanoid race from another
    // plane") — auto-overwriting BroadType would lose that distinction.
    // User can manually re-classify based on the Notes annotation.
    {
      template: "Race / Species / Ancestry",
      when: { field: "Status", value: "Extraplanar" },
      then: { "Status": null },
      rev: "v1.3-halfwidth",
      appendToNotes: "Race was originally classified with Status: Extraplanar (consider setting BroadType: Outsider / Extraplanar).",
    },
    // Religion / Belief System Status → Cultural Position remap
    // (cultural-axis separation, see v1.3-halfwidth Religion Status strip
    // above). Standard Suppressed-clears-Status-sets-CP pattern matching
    // Book, Faction, Festival, Historical Event, Language, Magic / Tech.
    {
      template: "Religion / Belief System",
      when: { field: "Status", value: "Suppressed" },
      then: { "Status": null, "Cultural Position": "Suppressed" },
      rev: "v1.3-halfwidth",
    },
    // v1.3-halfwidth Weapon / Armor Handedness "N/A" → clear. OPTIONS_UPDATES
    // above strips "N/A" from the options list (replaced with the standard
    // Unknown / Other pattern). "Not Applicable" as a Handedness value
    // semantically means the field doesn't apply to this item (armor pieces,
    // environment suits, helms, cybernetic implants don't have handedness).
    // Empty value conveys that naturally — clearing is the correct migration
    // rather than remapping to Unknown (Unknown implies the data exists but
    // we don't know it; N/A meant the data category is irrelevant).
    {
      template: "Weapon / Armor",
      when: { field: "Handedness", value: "N/A" },
      then: { "Handedness": null },
      rev: "v1.3-halfwidth",
    },
  ];
  if (!state.world.fieldValueRemaps || typeof state.world.fieldValueRemaps !== "object") {
    state.world.fieldValueRemaps = {};
  }
  FIELD_VALUE_REMAPS.forEach(({ template: tplName, when, then, rev, appendToNotes }) => {
    const key = `${tplName}:${when.field}:${when.value}`;
    const appliedRevs = state.world.fieldValueRemaps[key] || [];
    if (appliedRevs.includes(rev)) return;
    const markApplied = () => {
      state.world.fieldValueRemaps[key] = [...appliedRevs, rev];
    };
    const tpl = state.templates.find(t => t.name === tplName && t.origin === TEMPLATE_ORIGIN.BUILTIN);
    if (!tpl) { markApplied(); return; }
    const whenField = (tpl.fields || []).find(f =>
      (f.label || "").toLowerCase() === when.field.toLowerCase()
    );
    if (!whenField) { markApplied(); return; }
    // Resolve all `then` target fields up front. Skip any missing fields
    // silently — defensive against templates where the user removed a
    // built-in target field (the partial remap still runs for fields that
    // exist; the missing one is just not written).
    const writes = [];
    for (const [label, value] of Object.entries(then)) {
      const f = (tpl.fields || []).find(ff =>
        (ff.label || "").toLowerCase() === label.toLowerCase()
      );
      if (f) writes.push({ field: f, value });
    }
    // appendToNotes resolution (v1.3-halfwidth doctrine: non-destructive
    // migration — when stripping a value that can't be cleanly mapped to a
    // structured target, preserve the value as a prose annotation in Notes).
    // Resolved up front so the per-entry loop doesn't pay the find() cost.
    const notesField = appendToNotes
      ? (tpl.fields || []).find(f => (f.label || "").toLowerCase() === "notes" && f.type === "textarea")
      : null;
    // Iterate entries of this template; match the when condition handling
    // both bare-string and otherTextField object shapes.
    state.entries.forEach(e => {
      if (e.templateId !== tpl.id) return;
      if (!e.fields) return;
      const rawVal = e.fields[whenField.id];
      const matchVal = (rawVal && typeof rawVal === "object" && !Array.isArray(rawVal))
        ? rawVal.value : rawVal;
      if (matchVal !== when.value) return;
      // Apply writes. null clears the field; non-null sets the value
      // (normalizer coerces shape for otherTextField fields).
      for (const { field, value } of writes) {
        if (value === null) {
          delete e.fields[field.id];
        } else {
          e.fields[field.id] = value;
        }
      }
      // appendToNotes — non-destructive preservation per doctrine. Resolved
      // notesField may be null if the template has no Notes textarea or
      // appendToNotes wasn't requested; in that case skip silently.
      if (appendToNotes && notesField) {
        const existing = e.fields[notesField.id];
        if (typeof existing === "string" && existing.trim()) {
          e.fields[notesField.id] = `${appendToNotes}\n\n${existing}`;
        } else {
          e.fields[notesField.id] = appendToNotes;
        }
      }
    });
    markApplied();
  });

  // v1.3: one-time deprecated-field migration — remove built-in fields that
  // were dropped from current built-in definitions, but FIRST migrate any
  // entry data that lives in those fields so the doctrine "saved worlds load
  // forever" is honored. Each entry rewrites its own data per the field's
  // migrateEntry callback before the field is spliced out of the template.
  // Tracked per-world (via state.world.deprecatedFields) so each migration
  // runs once.
  //
  // Notable Tags (tags-type field stored as comma-separated string): split
  // into individual tags, append to entry.tags deduped case-insensitively.
  // The main tags surface is the canonical "tags" axis; Notable Tags was
  // always redundant with it.
  //
  // Region (text-type field stored as plain string): each populated Region
  // value is treated as a reference to a *separate* place (a Domain entry
  // named after the region text). For each unique region name across all
  // Location entries: find or create a Location entry with Type=Domain,
  // Subtype=Region matching that name, then set the original entries'
  // Parent field to point at it. The original entries' Type/Subtype stay
  // blank — load is non-destructive; the required-field validation surfaces
  // only when the user actively saves. The Region text itself is preserved
  // on the entry under the now-orphan field id — JSON-loadable forever.
  //
  // Hooks: migrateEntry (per-entry) for simple cases; migrateBatch (whole-
  // template) for cases that need cross-entry coordination, like the Region
  // migration where multiple entries can share a region name and should
  // share the same auto-created Domain entry. migrateBatch receives
  // (entries, oldFieldId, tpl, state) and may push new entries onto
  // state.entries.
  const DEPRECATED_BUILTIN_FIELDS = [
    {
      template: "Location",
      label: "Region",
      type: "text",
      migrateBatch: (entries, oldFieldId, tpl, state) => {
        const typeField = tpl.fields.find(f => f.label === "Type" && f.type === "select");
        const subtypeField = tpl.fields.find(f => f.label === "Subtype" && f.type === "select");
        const parentField = tpl.fields.find(f => f.label === "Parent" && f.type === "entry-ref");
        // Need all three. If any is missing, the template is in an unexpected shape;
        // bail rather than guess.
        if (!typeField || !subtypeField || !parentField) return;

        // Collect unique region names from entries that had populated Region text.
        // Dedup case-insensitively, keep the first-encountered casing for display.
        const byFolded = new Map(); // foldedName → originalName
        entries.forEach(e => {
          const oldVal = e.fields?.[oldFieldId];
          if (typeof oldVal !== "string" || !oldVal.trim()) return;
          const trimmed = oldVal.trim();
          const folded = trimmed.toLowerCase();
          if (!byFolded.has(folded)) byFolded.set(folded, trimmed);
        });
        if (byFolded.size === 0) return;

        // For each unique region name: find or create the Domain entry.
        // Collision rules:
        //   - existing Location with same name AND Type=Domain, Subtype=Region → reuse
        //   - existing Location with same name but different classification → create
        //     a new entry with " (Region)" suffix
        //   - no existing entry with that name → create a new entry with the bare name
        const foldedToDomainId = new Map();
        byFolded.forEach((originalName, folded) => {
          const exact = state.entries.find(e => {
            if (e.templateId !== tpl.id) return false;
            if ((e.name || "").toLowerCase() !== folded) return false;
            const typeVal = selectValueOnly(e.fields?.[typeField.id]);
            const subVal = selectValueOnly(e.fields?.[subtypeField.id]);
            return typeVal === "Domain" && subVal === "Region";
          });
          if (exact) {
            foldedToDomainId.set(folded, exact.id);
            return;
          }
          const nameCollision = state.entries.some(e =>
            e.templateId === tpl.id && (e.name || "").toLowerCase() === folded
          );
          const newName = nameCollision ? `${originalName} (Region)` : originalName;
          const newId = `ent-${slugify(newName)}-${genId().slice(-4)}`;
          state.entries.push({
            id: newId,
            templateId: tpl.id,
            name: newName,
            tags: [],
            fields: {
              [typeField.id]: "Domain",
              [subtypeField.id]: { value: "Region", customText: "" },
            },
            createdAt: isoNow(),
            updatedAt: isoNow(),
          });
          foldedToDomainId.set(folded, newId);
        });

        // Link original entries to their Domain parent. Don't trample an existing
        // Parent value if one's already set (defensive against partial prior runs).
        entries.forEach(e => {
          const oldVal = e.fields?.[oldFieldId];
          if (typeof oldVal !== "string" || !oldVal.trim()) return;
          const folded = oldVal.trim().toLowerCase();
          const domainId = foldedToDomainId.get(folded);
          if (!domainId || e.id === domainId) return;
          if (!e.fields[parentField.id]) {
            e.fields[parentField.id] = domainId;
          }
        });
      },
    },
    {
      template: "Location",
      label: "Notable Tags",
      type: "tags",
      migrateEntry: (entry, oldFieldId, _tpl) => {
        const oldVal = entry.fields?.[oldFieldId];
        // Tags field stores values as comma-separated string; tolerate array shape
        // in case any imported data was constructed differently.
        let oldTags = [];
        if (typeof oldVal === "string" && oldVal.trim()) {
          oldTags = oldVal.split(",").map(t => t.trim()).filter(Boolean);
        } else if (Array.isArray(oldVal)) {
          oldTags = oldVal.filter(t => typeof t === "string" && t.trim()).map(t => t.trim());
        }
        if (oldTags.length === 0) return;
        if (!Array.isArray(entry.tags)) entry.tags = [];
        const existing = new Set(entry.tags.map(t => String(t).toLowerCase()));
        for (const t of oldTags) {
          if (!existing.has(t.toLowerCase())) {
            entry.tags.push(t);
            existing.add(t.toLowerCase());
          }
        }
      },
    },
    {
      // Character Role / Function (text) — deprecated as TTRPG-adjacent; the field
      // belongs in a future TTRPG pack, not the default Character template. To
      // comply with the do-not-damage doctrine, populated values are appended to
      // the entry's Notes field with a "Role / Function:" prefix so the data
      // survives the deprecation visibly (not just as orphaned JSON).
      template: "Character",
      label: "Role / Function",
      type: "text",
      migrateEntry: (entry, oldFieldId, tpl) => {
        const oldVal = entry.fields?.[oldFieldId];
        if (typeof oldVal !== "string" || !oldVal.trim()) return;
        const notesField = tpl.fields.find(f => f.label === "Notes" && f.type === "textarea");
        if (!notesField) return;
        const trimmed = oldVal.trim();
        const existing = entry.fields[notesField.id];
        const block = `Role / Function: ${trimmed}`;
        if (typeof existing === "string" && existing.trim()) {
          // Prepend so the migrated data is visible on next load (user can move
          // it elsewhere or strip the prefix afterward).
          entry.fields[notesField.id] = `${block}\n\n${existing}`;
        } else {
          entry.fields[notesField.id] = block;
        }
      },
    },
    {
      // v1.3 Cosmology / Plane: old freeform "Plane Type" text field is replaced
      // by structured "Type" select (with otherTextField). Push old text into
      // the new field's customText slot under value="Other" so the data is
      // preserved and visible — the user can re-classify it to a concrete
      // Type option afterward without losing their original wording.
      template: "Cosmology / Plane",
      label: "Plane Type",
      type: "text",
      migrateEntry: (entry, oldFieldId, tpl) => {
        const oldVal = entry.fields?.[oldFieldId];
        const trimmed = (typeof oldVal === "string") ? oldVal.trim() : "";
        if (!trimmed) return;
        const typeField = tpl.fields.find(f => f.label === "Type" && f.type === "select");
        if (!typeField) return;
        // Don't clobber if user has already set Type via the new field.
        if (entry.fields[typeField.id]) return;
        entry.fields[typeField.id] = { value: "Other", customText: trimmed };
      },
    },
    {
      // v1.3 Creature: old freeform "Creature Type" text replaced by structured
      // "Type" select (with otherTextField). Same pattern as Plane Type.
      template: "Creature",
      label: "Creature Type",
      type: "text",
      migrateEntry: (entry, oldFieldId, tpl) => {
        const oldVal = entry.fields?.[oldFieldId];
        const trimmed = (typeof oldVal === "string") ? oldVal.trim() : "";
        if (!trimmed) return;
        const typeField = tpl.fields.find(f => f.label === "Type" && f.type === "select");
        if (!typeField) return;
        if (entry.fields[typeField.id]) return;
        entry.fields[typeField.id] = { value: "Other", customText: trimmed };
      },
    },
    {
      // v1.3 Deity / Entity: old freeform "Pantheon" text field is replaced by
      // an entry-ref to Religion / Belief System (multi). Old text values can't
      // auto-resolve to entry IDs, so populated values get appended to the
      // entry's Notes with a "Pantheon:" prefix to preserve the data visibly.
      // After this hook runs, the text field is removed and stripped from
      // seededFields; the post-DEPRECATED field-add pass below re-seeds
      // Pantheon with the new entry-ref schema in the same migration pass.
      template: "Deity / Entity",
      label: "Pantheon",
      type: "text",
      migrateEntry: (entry, oldFieldId, tpl) => {
        const oldVal = entry.fields?.[oldFieldId];
        if (typeof oldVal !== "string" || !oldVal.trim()) return;
        const notesField = tpl.fields.find(f => f.label === "Notes" && f.type === "textarea");
        if (!notesField) return;
        const trimmed = oldVal.trim();
        const existing = entry.fields[notesField.id];
        const block = `Pantheon: ${trimmed}`;
        if (typeof existing === "string" && existing.trim()) {
          // Prepend so the migrated data is visible on next load (user can move
          // it elsewhere or strip the prefix afterward).
          entry.fields[notesField.id] = `${block}\n\n${existing}`;
        } else {
          entry.fields[notesField.id] = block;
        }
      },
    },
    {
      // v1.3 Book / Document / Text / Tome: drop the "Hidden Truth" secret
      // textarea. Consistency pass — only Plot Thread retains this field in
      // the default template set. Populated values get prepended to Notes
      // with a "Hidden Truth:" prefix so the data survives visibly. Note that
      // the secret-field affordance is lost on these values (they land in
      // Notes which has no secret flag); user can move to their own custom
      // secret field if they want the visibility-toggle behavior back.
      // Template name keyed under post-rename name since TEMPLATE_RENAMES
      // runs first.
      template: "Book / Document / Text / Tome",
      label: "Hidden Truth",
      type: "textarea",
      migrateEntry: (entry, oldFieldId, tpl) => {
        const oldVal = entry.fields?.[oldFieldId];
        if (typeof oldVal !== "string" || !oldVal.trim()) return;
        const notesField = tpl.fields.find(f => f.label === "Notes" && f.type === "textarea");
        if (!notesField) return;
        const trimmed = oldVal.trim();
        const existing = entry.fields[notesField.id];
        const block = `Hidden Truth: ${trimmed}`;
        if (typeof existing === "string" && existing.trim()) {
          entry.fields[notesField.id] = `${block}\n\n${existing}`;
        } else {
          entry.fields[notesField.id] = block;
        }
      },
    },
    {
      // v1.3 Festival / Holiday: Frequency was freeform text in v1.2
      // ("annually", "every spring equinox", "once per generation", etc).
      // v1.3 converts it to a structured select. Same DEPRECATED → re-seed
      // pattern as Deity Pantheon: old text values prepended to Notes with
      // "Frequency:" prefix so the data survives visibly; the post-DEPRECATED
      // field-add pass below re-seeds Frequency with the new select schema
      // in the same migration run. User repopulates from canonical options
      // afterward.
      template: "Festival / Holiday",
      label: "Frequency",
      type: "text",
      migrateEntry: (entry, oldFieldId, tpl) => {
        const oldVal = entry.fields?.[oldFieldId];
        if (typeof oldVal !== "string" || !oldVal.trim()) return;
        const notesField = tpl.fields.find(f => f.label === "Notes" && f.type === "textarea");
        if (!notesField) return;
        const trimmed = oldVal.trim();
        const existing = entry.fields[notesField.id];
        const block = `Frequency: ${trimmed}`;
        if (typeof existing === "string" && existing.trim()) {
          entry.fields[notesField.id] = `${block}\n\n${existing}`;
        } else {
          entry.fields[notesField.id] = block;
        }
      },
    },
    {
      // v1.3 Plot Thread cleanup: Other Names was added to Plot Thread in an
      // earlier in-progress v1.3 build via BUILTIN_TEMPLATES field-add, then
      // removed after a doctrine call — Plot Thread is an authorial-tracking
      // artifact and doesn't have in-world aliases the way Characters or
      // Locations do. This DEPRECATED entry strips the orphan field from any
      // QA test world that loaded the field-add build. Any populated text
      // gets prepended to Notes for safety (almost certainly empty, since
      // the field was only on test worlds and only briefly).
      template: "Plot Thread",
      label: "Other Names",
      type: "text",
      migrateEntry: (entry, oldFieldId, tpl) => {
        const oldVal = entry.fields?.[oldFieldId];
        if (typeof oldVal !== "string" || !oldVal.trim()) return;
        const notesField = tpl.fields.find(f => f.label === "Notes" && f.type === "textarea");
        if (!notesField) return;
        const trimmed = oldVal.trim();
        const existing = entry.fields[notesField.id];
        const block = `Other Names: ${trimmed}`;
        if (typeof existing === "string" && existing.trim()) {
          entry.fields[notesField.id] = `${block}\n\n${existing}`;
        } else {
          entry.fields[notesField.id] = block;
        }
      },
    },
    {
      // v1.3-halfwidth Cosmology / Plane: Former Names removed. Use case is
      // covered by Other Names (multiple in-world aliases) + Origin / History
      // (narrative renames). Fill rate was approximately zero — planes are
      // metaphysical constants in most cosmologies and rarely get renamed.
      // Clean strip: no migration hook means any populated Former Names data
      // on existing plane entries lingers as orphan field values on
      // entry.fields[oldFieldId] (JSON-loadable for forward recovery) but
      // the field is removed from user templates and the UI. The data loss
      // is bounded — name-history rows can be reconstructed by hand from the
      // JSON if needed.
      template: "Cosmology / Plane",
      label: "Former Names",
      type: "name-history",
    },
    {
      // v1.3-halfwidth Race / Species / Ancestry: Subraces / Variants
      // textarea removed. Under the new schema, race-variants are first-class
      // entries (each variant has its own Race / Species entry; the cascade
      // chain BroadType → Type → Subtype captures the variant's
      // classification). The Subraces / Variants textarea was a prose
      // workaround for not having structured links between race entries —
      // redundant in the cascade-driven model.
      //
      // Per non-destructive-migration doctrine: any populated Subraces /
      // Variants prose is appended to Notes before the field is stripped,
      // so the data survives visibly. Prefix marks the migrated content for
      // user review.
      template: "Race / Species / Ancestry",
      label: "Subraces / Variants",
      type: "textarea",
      migrateEntry: (entry, oldFieldId, tpl) => {
        const oldVal = entry.fields?.[oldFieldId];
        if (typeof oldVal !== "string" || !oldVal.trim()) return;
        const notesField = tpl.fields.find(f => f.label === "Notes" && f.type === "textarea");
        if (!notesField) return;
        const trimmed = oldVal.trim();
        const existing = entry.fields[notesField.id];
        const block = `Subraces / Variants (migrated from removed field):\n${trimmed}`;
        if (typeof existing === "string" && existing.trim()) {
          entry.fields[notesField.id] = `${block}\n\n${existing}`;
        } else {
          entry.fields[notesField.id] = block;
        }
      },
    },
    {
      // v1.3-halfwidth Vehicle: Current Location (entry-ref single → Location)
      // removed. Vehicles are mobile by definition — pinning a "current
      // location" assumes a static snapshot that goes stale fast and conflicts
      // with timeline-aware tracking (a vehicle's location at any narrative
      // moment is better tracked via map pins with time spans or via
      // Notable Voyages / Incidents prose). Home Port / Base remains as the
      // anchor location.
      //
      // Non-destructive migration: use migrateBatch (gets state) to resolve
      // the linked Location entry's name and preserve it in Notes. Without
      // state access, the raw entry ID would be useless to the user. If the
      // linked entry no longer exists (orphaned ref), record "(unknown —
      // entry deleted)" rather than dropping silently.
      template: "Vehicle",
      label: "Current Location",
      type: "entry-ref",
      migrateBatch: (entries, oldFieldId, tpl, state) => {
        const notesField = tpl.fields.find(f => f.label === "Notes" && f.type === "textarea");
        if (!notesField) return;
        entries.forEach(entry => {
          const oldVal = entry.fields?.[oldFieldId];
          if (!oldVal) return;
          const refId = (typeof oldVal === "string") ? oldVal : null;
          if (!refId) return;
          const linkedEntry = state.entries.find(e => e.id === refId);
          const linkedName = linkedEntry?.name || "(unknown — entry deleted)";
          const existing = entry.fields[notesField.id];
          const block = `Current Location (removed field, mobile vehicles tracked via map pins or Notable Voyages): ${linkedName}`;
          if (typeof existing === "string" && existing.trim()) {
            entry.fields[notesField.id] = `${block}\n\n${existing}`;
          } else {
            entry.fields[notesField.id] = block;
          }
        });
      },
    },
    {
      // v1.3-halfwidth Vehicle: Origin / Builder (textarea) removed.
      // Builder / origin info is better captured as: Built / Launched
      // (new calendar-date field for manufacture date) + Notable Voyages /
      // Incidents (narrative prose about provenance) + an entry-ref to the
      // builder via Owner / Faction or via a user-added Builder field.
      // Standard non-destructive prose preservation to Notes.
      template: "Vehicle",
      label: "Origin / Builder",
      type: "textarea",
      migrateEntry: (entry, oldFieldId, tpl) => {
        const oldVal = entry.fields?.[oldFieldId];
        if (typeof oldVal !== "string" || !oldVal.trim()) return;
        const notesField = tpl.fields.find(f => f.label === "Notes" && f.type === "textarea");
        if (!notesField) return;
        const trimmed = oldVal.trim();
        const existing = entry.fields[notesField.id];
        const block = `Origin / Builder (migrated from removed field):\n${trimmed}`;
        if (typeof existing === "string" && existing.trim()) {
          entry.fields[notesField.id] = `${block}\n\n${existing}`;
        } else {
          entry.fields[notesField.id] = block;
        }
      },
    },
    {
      // v1.3-halfwidth Weapon / Armor: Current Location (entry-ref single →
      // Location) removed. Same reasoning as Vehicle's Current Location
      // removal — weapons / armor are mobile (handheld, frequently change
      // hands), so a static "current location" snapshot goes stale fast
      // and conflicts with timeline-aware tracking via map pins or History
      // prose. Current Wielder / Wearer kept since the wielder is a defining
      // narrative anchor (Excalibur → Arthur, Mjolnir → Thor) — different
      // semantic weight than location.
      //
      // Non-destructive migration via migrateBatch: resolve linked Location
      // entry name to Notes (raw entry ID is useless without state access).
      template: "Weapon / Armor",
      label: "Current Location",
      type: "entry-ref",
      migrateBatch: (entries, oldFieldId, tpl, state) => {
        const notesField = tpl.fields.find(f => f.label === "Notes" && f.type === "textarea");
        if (!notesField) return;
        entries.forEach(entry => {
          const oldVal = entry.fields?.[oldFieldId];
          if (!oldVal) return;
          const refId = (typeof oldVal === "string") ? oldVal : null;
          if (!refId) return;
          const linkedEntry = state.entries.find(e => e.id === refId);
          const linkedName = linkedEntry?.name || "(unknown — entry deleted)";
          const existing = entry.fields[notesField.id];
          const block = `Current Location (removed field, mobile items tracked via History or map pins): ${linkedName}`;
          if (typeof existing === "string" && existing.trim()) {
            entry.fields[notesField.id] = `${block}\n\n${existing}`;
          } else {
            entry.fields[notesField.id] = block;
          }
        });
      },
    },
  ];
  if (!state.world.deprecatedFields || typeof state.world.deprecatedFields !== "object") {
    state.world.deprecatedFields = {};
  }
  DEPRECATED_BUILTIN_FIELDS.forEach(({ template: tplName, label, type, migrateEntry, migrateBatch }) => {
    const migKey = `${tplName}:${label}:${type}`;
    if (state.world.deprecatedFields[migKey]) return;
    const tpl = state.templates.find(t => t.name === tplName && t.origin === TEMPLATE_ORIGIN.BUILTIN);
    if (tpl) {
      const oldField = tpl.fields.find(f => f.label === label && f.type === type);
      if (oldField) {
        // Migrate entry data BEFORE removing the field from the template, so
        // the hook can still look up the old field's id on the entry.
        const ownEntries = state.entries.filter(e => e.templateId === tpl.id);
        if (migrateBatch) {
          migrateBatch(ownEntries, oldField.id, tpl, state);
        } else if (migrateEntry) {
          ownEntries.forEach(e => migrateEntry(e, oldField.id, tpl));
        }
        const idx = tpl.fields.findIndex(f => f.id === oldField.id);
        if (idx >= 0) tpl.fields.splice(idx, 1);
      }
      // Strip from seededFields so the field-add migration doesn't re-add it.
      const seeded = state.world.seededFields?.[tplName];
      if (Array.isArray(seeded)) {
        const sIdx = seeded.indexOf(label);
        if (sIdx >= 0) seeded.splice(sIdx, 1);
      }
    }
    state.world.deprecatedFields[migKey] = true;
  });

  // v1.3: post-DEPRECATED field-add re-run. DEPRECATED hooks may strip a label
  // out of seededFields when the field is being replaced by a same-named field
  // of a different type (e.g. Deity / Entity Pantheon: text → entry-ref). The
  // first runFieldAddPass() call above couldn't add the new field because the
  // label was still in seededFields at that point. After DEPRECATED runs, the
  // label is gone — run field-add again to seed the replacement in the same
  // migration pass, so the user sees the new field on the next render rather
  // than after a save+reload cycle. Idempotent — if no deprecation stripped
  // anything, this pass is a no-op.
  runFieldAddPass();

  // v1.3: one-time field-reorder migration — for templates whose built-in
  // definition was reordered, move specific fields on existing worlds to
  // match the new canonical order. New worlds get the right order natively
  // from the built-in definition; this only catches existing worlds where the
  // field-add migration appended new fields at the end.
  //
  // Conservative — only the listed move runs. Doesn't reshuffle fields the
  // user may have intentionally placed elsewhere. Each move is keyed
  // {template, labelToMove, before} and tracked once per world.
  const FIELD_REORDERS = [
    { template: "Location", labelToMove: "Parent", before: "Type" },
  ];
  if (!state.world.fieldReorders || typeof state.world.fieldReorders !== "object") {
    state.world.fieldReorders = {};
  }
  FIELD_REORDERS.forEach(({ template: tplName, labelToMove, before }) => {
    const migKey = `${tplName}:${labelToMove}->before:${before}`;
    if (state.world.fieldReorders[migKey]) return;
    const tpl = state.templates.find(t => t.name === tplName && t.origin === TEMPLATE_ORIGIN.BUILTIN);
    if (tpl) {
      const movingIdx = tpl.fields.findIndex(f => f.label === labelToMove);
      const beforeIdx = tpl.fields.findIndex(f => f.label === before);
      // Only move when moving field is currently AFTER the before-anchor —
      // i.e., we need to pull it earlier. If it's already before, leave it.
      if (movingIdx >= 0 && beforeIdx >= 0 && movingIdx > beforeIdx) {
        const [moved] = tpl.fields.splice(movingIdx, 1);
        // beforeIdx is unchanged after the splice above since movingIdx > beforeIdx
        tpl.fields.splice(beforeIdx, 0, moved);
      }
    }
    state.world.fieldReorders[migKey] = true;
  });

  // v1.3: one-time whole-template field-order update — when the canonical built-in
  // template field order changes substantially, propagate the new order to
  // existing worlds. Same protective pattern as OPTIONS_UPDATES: only applies
  // when the user's set of field labels matches the canonical set exactly
  // (order-agnostic). If the user has added custom fields or deleted built-in
  // fields, the migration skips to preserve their customization.
  //
  // Tracked per-world (state.world.fieldOrderUpdates) keyed by (template, rev).
  // Bump rev to re-run on already-migrated worlds when canonical order changes
  // again.
  //
  // Existing field IDs are preserved through the reorder (we look up each
  // canonical-label field by label and rebuild the fields array in canonical
  // order), so saved entry data continues to bind correctly.
  const FIELD_ORDER_UPDATES = [
    {
      template: "Location",
      rev: "v1.3",
      canonicalOrder: [
        "Former Names",
        "Parent",
        "Type",
        "Subtype",
        "Climate / Weather",
        "Founded / Discovered",
        "Government / Authority",
        "Languages Spoken",
        "Population",
        "Notable Inhabitants",
        "Description",
        "Significance",
        "Atmosphere / Mood",
        "Economy / Trade",
        "Defenses / Threats",
        "History",
        "Notes",
      ],
    },
    {
      // v1.3-halfwidth Location reorder: Status inserted at position 3 (new
      // field seeded via runFieldAddPass + halfWidth-tagged in BUILTIN_TEMPLATES);
      // Population moved up to position 9 so it pairs with Government/Authority.
      // Pairs: Parent|Status, Type|Subtype (cascade — indent suppressed),
      // Climate/Weather|Founded/Discovered, Government/Authority|Population.
      // All built-in fields paired cleanly under the new layout. The relaxed
      // FIELD_ORDER_UPDATES loop logic (introduced in this session) handles
      // user-customized templates by reordering the built-in subset and
      // appending user-added fields at the end, so customized Location
      // templates still get the new pair layout for their built-in fields.
      template: "Location",
      rev: "v1.3-halfwidth",
      canonicalOrder: [
        "Former Names",
        "Parent",
        "Status",
        "Type",
        "Subtype",
        "Climate / Weather",
        "Founded / Discovered",
        "Government / Authority",
        "Population",
        "Languages Spoken",
        "Notable Inhabitants",
        "Description",
        "Significance",
        "Atmosphere / Mood",
        "Economy / Trade",
        "Defenses / Threats",
        "History",
        "Notes",
      ],
    },
    {
      template: "Astronomical Body",
      rev: "v1.3",
      canonicalOrder: [
        "Aliases / Other Names",
        "Parent Body",
        "Type",
        "Status",
        "Physical Properties",
        "Atmosphere",
        "Gravity",
        "Climate / Conditions",
        "Orbital Period",
        "Rotation Period",
        "Distance from Parent",
        "Satellites / Children",
        "Visible From",
        "Notable Locations",
        "Inhabited By",
        "Sacred to",
        "Mythological Significance",
        "Description",
        "History",
        "Notes",
      ],
    },
    {
      // v1.3-halfwidth Astronomical Body reorder: Other Names (renamed from
      // Aliases / Other Names via FIELD_RENAMES) at position 1. New Discovered /
      // Founded calendar-date at position 2 (seeded via runFieldAddPass).
      // Distance from Parent moved up adjacent to Parent Body so they pair as
      // "what it orbits | how far away." Physical Properties and Climate /
      // Conditions pushed down past the entry-ref multi cluster to positions
      // 16–17 so they don't interrupt the half-eligible runs. Resulting pairs:
      // Other Names|Discovered/Founded, Type|Status, Parent Body|Distance from
      // Parent, Atmosphere|Gravity, Orbital Period|Rotation Period. Five
      // semantically-coherent pairs, no orphans, no trailing.
      template: "Astronomical Body",
      rev: "v1.3-halfwidth",
      canonicalOrder: [
        "Other Names",
        "Discovered / Founded",
        "Type",
        "Status",
        "Parent Body",
        "Distance from Parent",
        "Atmosphere",
        "Gravity",
        "Orbital Period",
        "Rotation Period",
        "Satellites / Children",
        "Visible From",
        "Notable Locations",
        "Inhabited By",
        "Sacred to",
        "Physical Properties",
        "Climate / Conditions",
        "Mythological Significance",
        "Description",
        "History",
        "Notes",
      ],
    },
    {
      template: "Artifact / Object / Currency",
      rev: "v1.3",
      canonicalOrder: [
        "Aliases / Other Names",
        "Type",
        "Status",
        "Appearance",
        "Properties / Effects",
        "Curse / Drawback",
        "Currency Details",
        "Origin / Creator",
        "Issuing Faction",
        "Current Owner",
        "Current Location",
        "Description",
        "History",
        "Notes",
      ],
    },
    {
      // v1.3-halfwidth Artifact / Object / Currency reorder: Other Names
      // (renamed from Aliases / Other Names via FIELD_RENAMES). Three new
      // structured fields added — Cultural Position (mirrors Magic / Tech),
      // Material (entry-ref to Substance / Material), Rarity (select with
      // Mundane → Unique spectrum). Issuing Faction and Currency Details
      // become currency-only via showWhen and are pulled into adjacent
      // positions so they pair-vanish together. Ownership / location cluster
      // (Current Owner, Current Location) moves above the descriptive
      // textareas. Resulting half-eligible run: 10 contiguous fields → 5
      // semantically-coherent pairs: Other Names|Type, Status|Cultural
      // Position, Material|Rarity, Issuing Faction|Currency Details (both
      // gated by Type=Currency/Coin), Current Owner|Current Location.
      template: "Artifact / Object / Currency",
      rev: "v1.3-halfwidth",
      canonicalOrder: [
        "Other Names",
        "Type",
        "Status",
        "Cultural Position",
        "Material",
        "Rarity",
        "Issuing Faction",
        "Currency Details",
        "Current Owner",
        "Current Location",
        "Appearance",
        "Properties / Effects",
        "Curse / Drawback",
        "Origin / Creator",
        "Description",
        "History",
        "Notes",
      ],
    },
    {
      template: "Character",
      rev: "v1.3",
      canonicalOrder: [
        "Title",
        "Former Names",
        "Aliases",
        "Status",
        "Cause of Death",
        "Lifespan",
        "Gender / Pronouns",
        "Species / Race",
        "Lineage / Bloodline",
        "Father",
        "Mother",
        "Spouse",
        "Languages Spoken",
        "Religion",
        "Affiliations",
        "Ally / Mentor",
        "Enemies",
        "Current Whereabouts",
        "Appearance",
        "Description",
        "Background",
        "Personality",
        "Voice / Speech Pattern",
        "Goals / Motivations",
        "Abilities / Skills",
        "Possessions",
        "Notes",
      ],
    },
    {
      // v1.3-halfwidth Character reorder: same 27 fields as the original v1.3
      // entry above, regrouped so half-width-eligible fields cluster into clean
      // adjacent pairs (Title|Aliases, Status|Cause of Death, Species/Race|
      // Gender/Pronouns, Father|Mother, Religion|Current Whereabouts). Former
      // Names moved to position 1 (lifespan-context field above identity);
      // Lineage / Bloodline kept full-width between cascade-eligible identity
      // pair and parent pair; Current Whereabouts moved up adjacent to Religion
      // to form its pair. Fresh-from-v1.2 worlds will apply v1.3 first (gets
      // the original order) then v1.3-halfwidth (overwrites to the new order)
      // — wasteful but correct; the end state is identical to applying only
      // v1.3-halfwidth. FIELD_ORDER_UPDATES skips reordering on templates the
      // user has customized (added or removed fields), so this only lands on
      // clean built-in templates.
      template: "Character",
      rev: "v1.3-halfwidth",
      canonicalOrder: [
        "Former Names",
        "Title",
        "Aliases",
        "Status",
        "Cause of Death",
        "Lifespan",
        "Species / Race",
        "Gender / Pronouns",
        "Lineage / Bloodline",
        "Father",
        "Mother",
        "Spouse",
        "Languages Spoken",
        "Religion",
        "Current Whereabouts",
        "Affiliations",
        "Ally / Mentor",
        "Enemies",
        "Appearance",
        "Description",
        "Background",
        "Personality",
        "Voice / Speech Pattern",
        "Goals / Motivations",
        "Abilities / Skills",
        "Possessions",
        "Notes",
      ],
    },
    {
      // v1.3-halfwidth.1 follow-up: same canonical order as v1.3-halfwidth
      // above. The bump exists because FIELD_ORDER_UPDATES previously bailed
      // entirely on any template the user had customized (added or removed a
      // field), which silently disabled the half-width pair layout — pairs
      // depend on adjacency, and the original v1.3 + v1.3-halfwidth revs got
      // marked applied (no-op) on customized templates rather than retried.
      // The loop logic was relaxed in this rev to reorder the built-in subset
      // and append user-added fields at the end. This entry re-triggers the
      // reorder on worlds that already absorbed v1.3-halfwidth under the old
      // logic. New worlds will apply v1.3 → v1.3-halfwidth → v1.3-halfwidth.1
      // in sequence, all under the relaxed logic, converging on this order.
      template: "Character",
      rev: "v1.3-halfwidth.1",
      canonicalOrder: [
        "Former Names",
        "Title",
        "Aliases",
        "Status",
        "Cause of Death",
        "Lifespan",
        "Species / Race",
        "Gender / Pronouns",
        "Lineage / Bloodline",
        "Father",
        "Mother",
        "Spouse",
        "Languages Spoken",
        "Religion",
        "Current Whereabouts",
        "Affiliations",
        "Ally / Mentor",
        "Enemies",
        "Appearance",
        "Description",
        "Background",
        "Personality",
        "Voice / Speech Pattern",
        "Goals / Motivations",
        "Abilities / Skills",
        "Possessions",
        "Notes",
      ],
    },
    {
      template: "Cosmology / Plane",
      rev: "v1.3",
      canonicalOrder: [
        "Other Names",
        "Former Names",
        "Type",
        "Status",
        "Connected Planes",
        "Access / Entry Points",
        "Physical Laws",
        "Time Flow",
        "Ruling Powers",
        "Notable Locations",
        "Resident Factions",
        "Typical Inhabitants",
        "Description",
        "Origin / History",
        "Notes",
      ],
    },
    {
      // v1.3-halfwidth Cosmology / Plane reorder: Former Names removed (see
      // DEPRECATED_BUILTIN_FIELDS). Three new fields seeded via runFieldAddPass:
      // Discovered / Charted (calendar-date), Ambient Magic / Energy Level
      // (select), Reality Coherence (textarea). Time Flow pulled up from the
      // physics-laws cluster into the leading half-eligible run so it can pair
      // with Ambient Magic. Entry-ref multi cluster consolidated (Connected
      // Planes through Typical Inhabitants). Resulting pairs: Other Names|
      // Discovered/Charted, Type|Status, Time Flow|Ambient Magic — three clean
      // pairs in a contiguous 6-field run. Three-zone structure: half-eligible
      // → entry-ref multi cluster → textarea cluster.
      template: "Cosmology / Plane",
      rev: "v1.3-halfwidth",
      canonicalOrder: [
        "Other Names",
        "Discovered / Charted",
        "Type",
        "Status",
        "Time Flow",
        "Ambient Magic / Energy Level",
        "Connected Planes",
        "Ruling Powers",
        "Notable Locations",
        "Resident Factions",
        "Typical Inhabitants",
        "Access / Entry Points",
        "Physical Laws",
        "Reality Coherence",
        "Description",
        "Origin / History",
        "Notes",
      ],
    },
    {
      template: "Creature",
      rev: "v1.3",
      canonicalOrder: [
        "Other Names",
        "Type",
        "Status",
        "Sentience Level",
        "Variants / Subspecies",
        "Lifespan / Reproduction",
        "Abilities / Traits",
        "Weaknesses",
        "Lore / Cultural Significance",
        "Habitat",
        "Description",
        "Behavior",
        "Origin / History",
        "Notes",
      ],
    },
    {
      // v1.3-halfwidth Creature reorder: Habitat pulled up from the
      // descriptive textarea cluster (post-Lore/Cultural Significance) into
      // the leading half-eligible run. Diet is new this rev (seeded via
      // runFieldAddPass) and slots adjacent to Habitat for an ecological-axis
      // pair. Habitat type-converted text → select in FIELD_TYPE_CONVERSIONS.
      // Resulting pairs: Other Names|Type, Status|Sentience Level,
      // Habitat|Diet — three semantically-coherent pairs in a contiguous
      // 6-field run at the top. Descriptive textareas (Variants, Lifespan,
      // Abilities, Weaknesses, Lore) follow, then narrative closers
      // (Description, Behavior, Origin/History, Notes).
      template: "Creature",
      rev: "v1.3-halfwidth",
      canonicalOrder: [
        "Other Names",
        "Type",
        "Status",
        "Sentience Level",
        "Habitat",
        "Diet",
        "Variants / Subspecies",
        "Lifespan / Reproduction",
        "Abilities / Traits",
        "Weaknesses",
        "Lore / Cultural Significance",
        "Description",
        "Behavior",
        "Origin / History",
        "Notes",
      ],
    },
    {
      // v1.3-halfwidth-2 Creature second pass: 21 fields (was 15 in
      // v1.3-halfwidth + 6 new seeded via runFieldAddPass — Lifespan, Subtype,
      // Threat Level / Danger Rating, Size / Scale, Cultural Position,
      // Cultural Reach). Lifespan / Reproduction renamed to Reproduction /
      // Lifecycle (FIELD_RENAMES preserves data; new Lifespan field starts
      // blank). Subtype is cascade-select child of Type — 2-level cascade
      // (vs. Race / Species's 3-level). Pairs: Other Names|Lifespan
      // (identity + biological), Type|Subtype (cascade pair), Status|
      // Sentience Level (state + cognition), Threat Level|Size / Scale
      // (danger + scale), Cultural Position|Cultural Reach (societal axes),
      // Habitat|Diet (ecological axes). Six clean pairs. Variants /
      // Subspecies textarea kept intentionally as a free-form local-variant
      // surface complementing the structured Subtype field (creatures have
      // more granular variation than races).
      template: "Creature",
      rev: "v1.3-halfwidth-2",
      canonicalOrder: [
        "Other Names",
        "Lifespan",
        "Type",
        "Subtype",
        "Status",
        "Sentience Level",
        "Threat Level / Danger Rating",
        "Size / Scale",
        "Cultural Position",
        "Cultural Reach",
        "Habitat",
        "Diet",
        "Variants / Subspecies",
        "Reproduction / Lifecycle",
        "Abilities / Traits",
        "Weaknesses",
        "Lore / Cultural Significance",
        "Description",
        "Behavior",
        "Origin / History",
        "Notes",
      ],
    },
    {
      template: "Culture / People",
      rev: "v1.3",
      canonicalOrder: [
        "Other Names",
        "Type",
        "Status",
        "Associated Races",
        "Associated Locations",
        "Population & Distribution",
        "Languages",
        "Religions",
        "Notable Members",
        "Values / Ethos",
        "Customs & Traditions",
        "Family / Social Structure",
        "Daily Life",
        "Dress & Cuisine",
        "Art & Architecture",
        "Origin / History",
        "Notes",
      ],
    },
    {
      // v1.3-halfwidth Culture / People reorder: Status pulled up to position 2
      // so Other Names pairs with state. Two new fields seeded via
      // runFieldAddPass — Subtype (cascade child of Type, optionsByParent
      // matrix per Type branch) and Founded / Established (calendar-date).
      // Population & Distribution pulled up from the middle of the entry-ref
      // multi cluster into the leading run (position 6) so it pairs with
      // Founded/Established and the entry-ref multi cluster (Associated Races,
      // Associated Locations, Languages, Religions, Notable Members) becomes
      // contiguous. Three pairs: Other Names|Status, Type|Subtype (cascade),
      // Founded/Established|Population & Distribution. Three-zone structure
      // (half-eligible → entry-ref multi → textarea) preserved.
      template: "Culture / People",
      rev: "v1.3-halfwidth",
      canonicalOrder: [
        "Other Names",
        "Status",
        "Type",
        "Subtype",
        "Founded / Established",
        "Population & Distribution",
        "Associated Races",
        "Associated Locations",
        "Languages",
        "Religions",
        "Notable Members",
        "Values / Ethos",
        "Customs & Traditions",
        "Family / Social Structure",
        "Daily Life",
        "Dress & Cuisine",
        "Art & Architecture",
        "Origin / History",
        "Notes",
      ],
    },
    {
      template: "Deity / Entity",
      rev: "v1.3",
      canonicalOrder: [
        "Aliases / Other Names",
        "Type",
        "Status",
        "Pantheon",
        "Domains / Portfolio",
        "Alignment / Disposition",
        "Holy Sites",
        "Worshippers",
        "Symbol / Iconography",
        "Allied Powers",
        "Opposing Powers",
        "Appearance / Manifestation",
        "Description",
        "Boons / Powers",
        "Origin / History",
        "Notes",
      ],
    },
    {
      // v1.3-halfwidth Deity / Entity reorder: Aliases / Other Names renamed
      // to Other Names. Status moved up to position 2 so Other Names pairs
      // with state. Three new structured fields added — Power Tier (the
      // canonical home for tier-flavored entries that previously lurked in
      // Type), Cultural Position (mirrors Magic / Tech / Artifact pattern,
      // canonical home for "Forgotten" previously in Status), Cultural Reach
      // (geographic / scope axis). Domains / Portfolio converted from tags
      // (free-form multi) to select (single-value with otherTextField);
      // multi-domain identification lives on the universal tags axis.
      // Alignment / Disposition stays as text for flexibility. Symbol /
      // Iconography moved down to the textarea cluster so the entry-ref
      // multi cluster (Pantheon, Holy Sites, Worshippers, Allied Powers,
      // Opposing Powers) becomes contiguous. Four clean pairs in a
      // contiguous 8-field half-eligible run.
      template: "Deity / Entity",
      rev: "v1.3-halfwidth",
      canonicalOrder: [
        "Other Names",
        "Status",
        "Type",
        "Power Tier",
        "Cultural Position",
        "Cultural Reach",
        "Domains / Portfolio",
        "Alignment / Disposition",
        "Pantheon",
        "Holy Sites",
        "Worshippers",
        "Allied Powers",
        "Opposing Powers",
        "Symbol / Iconography",
        "Appearance / Manifestation",
        "Description",
        "Boons / Powers",
        "Origin / History",
        "Notes",
      ],
    },
    {
      template: "Book / Document / Text / Tome",
      rev: "v1.3",
      canonicalOrder: [
        "Other Names",
        "Type",
        "Status",
        "Author",
        "Date Written",
        "Language",
        "Current Owner",
        "Previous Owner(s)",
        "Current Location",
        "Subject / Summary",
        "Contents / Excerpt",
        "Significance",
        "Notes",
      ],
    },
    {
      // v1.3-halfwidth Book / Document / Text / Tome reorder: 14 fields (was
      // 13 in v1.3 + new Cultural Position seeded via runFieldAddPass). Date
      // Written moved up to position 2 to pair with Other Names per the
      // canonical "identity | event" pattern shared with Astronomical Body,
      // Cosmology / Plane, Culture / People. Author and Language pulled up
      // adjacent so they pair (creator | tongue); both type-converted from
      // multi entry-ref to single via MULTI_TO_SINGLE_CONVERSIONS, making them
      // half-eligible. Cultural Position inserted between Status and Current
      // Location so the trailing pair becomes "societal regard | physical
      // location." Current Owner renamed to Current Owner(s) via FIELD_RENAMES
      // (stays multi). Resulting pairs: Other Names|Date Written, Author|
      // Language, Type|Status, Cultural Position|Current Location. Four clean
      // pairs, three-zone structure: half-eligible run → entry-ref multi
      // cluster (Current Owner(s), Previous Owner(s)) → textarea cluster.
      template: "Book / Document / Text / Tome",
      rev: "v1.3-halfwidth",
      canonicalOrder: [
        "Other Names",
        "Date Written",
        "Author",
        "Language",
        "Type",
        "Status",
        "Cultural Position",
        "Current Location",
        "Current Owner(s)",
        "Previous Owner(s)",
        "Subject / Summary",
        "Contents / Excerpt",
        "Significance",
        "Notes",
      ],
    },
    {
      template: "Faction / Government / Organization",
      rev: "v1.3",
      canonicalOrder: [
        "Other Names",
        "Former Names",
        "Type",
        "Status",
        "Founded",
        "Active Period",
        "Parent Organization",
        "Headquarters",
        "Leadership",
        "Membership Size",
        "Notable Members",
        "Allies",
        "Enemies",
        "Alignment / Ideology",
        "Goals",
        "Methods / Tactics",
        "Symbol / Insignia",
        "Description",
        "Public Perception",
        "Origin / History",
        "Notes",
      ],
    },
    {
      // v1.3-halfwidth Faction / Government / Organization reorder: 23 fields
      // (was 21 in v1.3 + Cultural Position + Cultural Reach seeded via
      // runFieldAddPass). Former Names stays at top as the full-width
      // name-history anchor (matches Character + Location pattern). Half-
      // eligible run runs Other Names → Membership Size (8 pre-existing) plus
      // Cultural Position + Cultural Reach for the two new closing pairs.
      // Pairs: Other Names|Founded (identity|event), Type|Status (classification|
      // state), Parent Organization|Alignment / Ideology (structural|qualitative),
      // Headquarters|Membership Size (place|quantitative), Cultural Position|
      // Cultural Reach (societal axes). Active Period (calendar-date-range,
      // full-width) sits between the half-eligible run and the multi-ref
      // cluster — mirrors Character's Lifespan placement. Symbol / Insignia
      // moved up to lead the textarea cluster (visual identity stays near
      // top-of-template).
      template: "Faction / Government / Organization",
      rev: "v1.3-halfwidth",
      canonicalOrder: [
        "Former Names",
        "Other Names",
        "Founded",
        "Type",
        "Status",
        "Parent Organization",
        "Alignment / Ideology",
        "Headquarters",
        "Membership Size",
        "Cultural Position",
        "Cultural Reach",
        "Active Period",
        "Leadership",
        "Notable Members",
        "Allies",
        "Enemies",
        "Symbol / Insignia",
        "Goals",
        "Methods / Tactics",
        "Description",
        "Public Perception",
        "Origin / History",
        "Notes",
      ],
    },
    {
      template: "Festival / Holiday",
      rev: "v1.3",
      canonicalOrder: [
        "Other Names",
        "Type",
        "Status",
        "Calendar Date",
        "Frequency",
        "Duration",
        "Observed By",
        "Sacred to",
        "Symbol / Iconography",
        "Associated Religion",
        "Associated Locations",
        "Description",
        "Activities / Practices",
        "Origin / Mythology",
        "Notes",
      ],
    },
    {
      // v1.3-halfwidth Festival / Holiday reorder: 17 fields (was 15 in v1.3
      // + Cultural Position + Cultural Reach seeded via runFieldAddPass).
      // Calendar Date moved up to position 2 to pair with Other Names per
      // the canonical "identity | event" pattern. Cultural Position +
      // Cultural Reach pair as the closing societal-axis pair. Symbol /
      // Iconography moved out of the entry-ref multi cluster down to the
      // textarea cluster (matches Faction pattern). Resulting pairs: Other
      // Names|Calendar Date, Type|Status, Frequency|Duration, Cultural
      // Position|Cultural Reach. Three-zone structure: half-eligible run
      // (8) → entry-ref multi cluster (4) → textarea cluster (5).
      template: "Festival / Holiday",
      rev: "v1.3-halfwidth",
      canonicalOrder: [
        "Other Names",
        "Calendar Date",
        "Type",
        "Status",
        "Frequency",
        "Duration",
        "Cultural Position",
        "Cultural Reach",
        "Observed By",
        "Sacred to",
        "Associated Religion",
        "Associated Locations",
        "Symbol / Iconography",
        "Description",
        "Activities / Practices",
        "Origin / Mythology",
        "Notes",
      ],
    },
    {
      template: "Historical Event",
      rev: "v1.3",
      canonicalOrder: [
        "Other Names",
        "Type",
        "Status",
        "Preceded By",
        "Calendar Date",
        "Followed By",
        "Duration",
        "Location",
        "Key Participants",
        "Description",
        "Causes",
        "Consequences",
        "Notable Quotes",
        "Notes",
      ],
    },
    {
      // v1.3-halfwidth Historical Event reorder: 16 fields (was 14 in v1.3
      // + Cultural Position + Cultural Reach seeded via runFieldAddPass).
      // Calendar Date pulled up to position 2 to pair with Other Names per
      // the canonical "identity | event" pattern. Cultural Position +
      // Cultural Reach pair as the closing societal-axis pair. Duration
      // (calendar-date-range, full-width) sits between Preceded By and
      // Followed By, forming a "before → duration → after" temporal sequence
      // cluster before the spatial/participant entry-ref multi cluster.
      // Resulting pairs: Other Names|Calendar Date, Type|Status, Cultural
      // Position|Cultural Reach. Three-zone structure: half-eligible run
      // (6) → temporal sequence cluster (3) → spatial/participant entry-ref
      // multi cluster (2) → textarea cluster (5).
      template: "Historical Event",
      rev: "v1.3-halfwidth",
      canonicalOrder: [
        "Other Names",
        "Calendar Date",
        "Type",
        "Status",
        "Cultural Position",
        "Cultural Reach",
        "Preceded By",
        "Duration",
        "Followed By",
        "Location",
        "Key Participants",
        "Description",
        "Causes",
        "Consequences",
        "Notable Quotes",
        "Notes",
      ],
    },
    {
      template: "Language / Glossary",
      rev: "v1.3",
      canonicalOrder: [
        "Other Names",
        "Entry Type",
        "Status",
        "Pronunciation",
        "Spoken By",
        "Region",
        "Definition / Meaning",
        "Usage / Context",
        "Etymology / Origin",
        "Related Terms",
        "Notes",
      ],
    },
    {
      // v1.3-halfwidth Language / Glossary reorder: 13 fields (was 11 in
      // v1.3 + Cultural Position + Cultural Reach seeded via runFieldAddPass).
      // Pronunciation pulled up to pair with Other Names ("name | sound"
      // pairing — both describe how the word is rendered). Cultural Position
      // + Cultural Reach pair as the closing societal-axis pair. Related
      // Terms (entry-ref multi, no showWhen, applies to all Entry Types)
      // pulled up to lead the entry-ref multi cluster; Spoken By and Region
      // (gated by showWhen for Dialect/Idiom/Language Overview/Naming
      // Convention) sit after. Resulting pairs: Other Names|Pronunciation,
      // Entry Type|Status, Cultural Position|Cultural Reach. Three-zone
      // structure: half-eligible run (6) → entry-ref multi cluster (3,
      // 2 gated) → textarea cluster (4).
      template: "Language / Glossary",
      rev: "v1.3-halfwidth",
      canonicalOrder: [
        "Other Names",
        "Pronunciation",
        "Entry Type",
        "Status",
        "Cultural Position",
        "Cultural Reach",
        "Spoken By",
        "Region",
        "Related Terms",
        "Definition / Meaning",
        "Usage / Context",
        "Etymology / Origin",
        "Notes",
      ],
    },
    {
      template: "Magic / Tech System",
      rev: "v1.3",
      canonicalOrder: [
        "Other Names",
        "Type",
        "Status",
        "Cultural Position",
        "Description",
        "Source of Power",
        "Rules / Mechanics",
        "Cost / Limitations",
        "Components / Tools",
        "Access Prerequisites",
        "Notable Practitioners",
        "Counter-magic / Defenses",
        "Origin / History",
        "Notes",
      ],
    },
    {
      // v1.3-halfwidth Magic / Tech System reorder: 16 fields (was 14 in
      // v1.3 + Magnitude / Scale + Cultural Reach seeded via runFieldAddPass).
      // Magnitude / Scale (select, spectrum order: Cantrip / Trivial →
      // Cosmic / Reality-altering) pulled in as the 6th half-eligible to
      // produce 3 clean pairs. Cultural Reach added per doctrine pattern
      // candidate (Magic / Tech systems benefit from geographic/scope axis).
      // Notable Practitioners (the lone entry-ref multi) moved up to sit
      // between half-eligible run and textarea cluster, where it belongs
      // structurally. Resulting pairs: Other Names|Magnitude / Scale,
      // Type|Status, Cultural Position|Cultural Reach.
      template: "Magic / Tech System",
      rev: "v1.3-halfwidth",
      canonicalOrder: [
        "Other Names",
        "Magnitude / Scale",
        "Type",
        "Status",
        "Cultural Position",
        "Cultural Reach",
        "Notable Practitioners",
        "Description",
        "Source of Power",
        "Rules / Mechanics",
        "Cost / Limitations",
        "Components / Tools",
        "Access Prerequisites",
        "Counter-magic / Defenses",
        "Origin / History",
        "Notes",
      ],
    },
    {
      template: "Plot Thread",
      rev: "v1.3",
      canonicalOrder: [
        "Scope",
        "Genre",
        "Status",
        "Timespan",
        "POV Character",
        "Key Participants",
        "Antagonists",
        "Related Locations",
        "Connected Threads",
        "Stakes",
        "Hooks / Entry Points",
        "Description",
        "Possible Resolutions",
        "Hidden Truth",
        "Notes",
      ],
    },
    {
      // v1.3-halfwidth Plot Thread reorder: 17 fields (was 15 in v1.3 +
      // Story Function + Resolution Type seeded via runFieldAddPass). POV
      // Character pulled to position 1 to pair with Genre at the top of the
      // half-eligible run ("who | genre"). Story Function added after Scope
      // ("size | role" pair). Resolution Type added after Status ("current
      // state | outcome shape" pair). Timespan (calendar-date-range, full)
      // sits as the full-width bridge between half-eligible run and
      // entry-ref multi cluster. Resulting pairs: POV Character|Genre,
      // Scope|Story Function, Status|Resolution Type.
      template: "Plot Thread",
      rev: "v1.3-halfwidth",
      canonicalOrder: [
        "POV Character",
        "Genre",
        "Scope",
        "Story Function",
        "Status",
        "Resolution Type",
        "Timespan",
        "Key Participants",
        "Antagonists",
        "Related Locations",
        "Connected Threads",
        "Stakes",
        "Hooks / Entry Points",
        "Description",
        "Possible Resolutions",
        "Hidden Truth",
        "Notes",
      ],
    },
    {
      // v1.3-halfwidth Race / Species / Ancestry reorder: 17 fields (full
      // schema overhaul — Aliases / Other Names renamed to Other Names; Type
      // renamed to BroadType; Type and Subtype added as new cascade-select
      // fields seeded via runFieldAddPass; Cultural Position and Cultural
      // Reach added; Subraces / Variants removed via DEPRECATED_BUILTIN_FIELDS
      // with content appended to Notes). Pairs: Other Names|Lifespan
      // (identity + biological), BroadType|Type (cascade pair 1),
      // Subtype|Status (cascade L3 paired with state), Cultural Position|
      // Cultural Reach (societal axes). 3-level cascade chain (BroadType →
      // Type → Subtype) is the first multi-level cascade in any template.
      template: "Race / Species / Ancestry",
      rev: "v1.3-halfwidth",
      canonicalOrder: [
        "Other Names",
        "Lifespan",
        "BroadType",
        "Type",
        "Subtype",
        "Status",
        "Cultural Position",
        "Cultural Reach",
        "Native Habitat",
        "Cultures",
        "Languages",
        "Notable Individuals",
        "Physical Traits",
        "Special Abilities",
        "Reproduction / Lifecycle",
        "Origin / Creation",
        "Notes",
      ],
    },
    {
      // v1.3-halfwidth Religion / Belief System reorder: 22 fields (was 16
      // in v1.2 + 6 new seeded via runFieldAddPass / FIELD_TYPE_CONVERSIONS:
      // Other Names, Founder, Founded / Established, Subtype, Cultural
      // Position, Cultural Reach). Sacred Texts / Scriptures type-converted
      // textarea → entry-ref multi (refTemplate: Book / Document) with prose
      // preserved to Notes per non-destructive-migration doctrine. Pairs:
      // Other Names|Status, Founder|Founded / Established (who | when),
      // Type|Subtype (cascade pair), Cultural Position|Cultural Reach
      // (societal axes). Three-zone structure: half-eligible run (8) →
      // entry-ref multi cluster (6) → textarea cluster (8). Symbol /
      // Iconography pulled up to second position in textarea cluster (after
      // Description) — visual identity belongs near the top of the narrative
      // surface.
      template: "Religion / Belief System",
      rev: "v1.3-halfwidth",
      canonicalOrder: [
        "Other Names",
        "Status",
        "Founder",
        "Founded / Established",
        "Type",
        "Subtype",
        "Cultural Position",
        "Cultural Reach",
        "Worshipped Deities",
        "Notable Figures",
        "Sacred Texts / Scriptures",
        "Holy Sites",
        "Holy Days",
        "Affiliated Factions",
        "Description",
        "Symbol / Iconography",
        "Core Doctrine / Tenets",
        "Practices / Rites",
        "Hierarchy / Structure",
        "Schisms / Sects",
        "Origin / History",
        "Notes",
      ],
    },
    {
      // v1.3-halfwidth Substance / Material reorder: 17 fields (was 13 in
      // v1.2 + 4 new seeded via runFieldAddPass: Status, Subtype, Cultural
      // Position, Cultural Reach). Aliases / Other Names renamed to Other
      // Names. Pairs: Other Names|Status, Type|Subtype (cascade pair),
      // Trade Value|Rarity (economic | scarcity), Cultural Position|
      // Cultural Reach (societal axes). Three-zone structure: half-eligible
      // run (8) → entry-ref multi cluster (2) → textarea cluster (7).
      template: "Substance / Material",
      rev: "v1.3-halfwidth",
      canonicalOrder: [
        "Other Names",
        "Status",
        "Type",
        "Subtype",
        "Trade Value",
        "Rarity",
        "Cultural Position",
        "Cultural Reach",
        "Source / Where Found",
        "Counter / Antidote",
        "Description / Appearance",
        "Properties",
        "Effects / Uses",
        "Side Effects / Dangers",
        "Extraction / Production",
        "Cultural Significance",
        "Notes",
      ],
    },
    {
      // v1.3-halfwidth Theme / Motif reorder: 13 fields (was 6 in v1.2 + 7
      // new seeded via runFieldAddPass: Other Names, Tone / Mood, Subtype,
      // Prevalence, Universality, Associated Objects, Associated Plot
      // Threads). Pairs: Other Names|Tone / Mood (identity + register),
      // Type|Subtype (cascade pair), Prevalence|Universality (narrative-
      // weight axes). Three-zone structure: half-eligible run (6) →
      // entry-ref multi cluster (4) → textarea cluster (3). Smallest
      // template in the system; meta-narrative (no Cultural Position /
      // Cultural Reach).
      template: "Theme / Motif",
      rev: "v1.3-halfwidth",
      canonicalOrder: [
        "Other Names",
        "Tone / Mood",
        "Type",
        "Subtype",
        "Prevalence",
        "Universality",
        "Associated Characters",
        "Associated Locations",
        "Associated Objects",
        "Associated Plot Threads",
        "Description",
        "How It Appears",
        "Notes",
      ],
    },
    {
      // v1.3-halfwidth Vehicle reorder: 21 fields. Was 17 in v1.2 minus
      // 2 deprecated (Current Location, Origin / Builder) plus 6 new
      // (Other Names renamed from Aliases / Designation, Built / Launched,
      // Subtype, Cultural Position, Cultural Reach, Description, Notes).
      // Net: 17 - 2 + 6 = 21. Description and Notes auto-seed via runField-
      // AddPass; the rest via the rename + add framework. Pairs: Other
      // Names|Classification / Class, Status|Built / Launched, Type|Subtype
      // (cascade pair), Owner / Faction|Captain / Commander, Propulsion /
      // Power|Passenger / Cargo Capacity, Crew Capacity|Home Port / Base,
      // Cultural Position|Cultural Reach. Three-zone structure: half-
      // eligible run (14, longest in any template) → entry-ref multi
      // cluster (1: Crew) → textarea cluster (6: Description, Appearance,
      // Armament, Defenses, Notable Voyages / Incidents, Notes).
      template: "Vehicle",
      rev: "v1.3-halfwidth",
      canonicalOrder: [
        "Other Names",
        "Classification / Class",
        "Status",
        "Built / Launched",
        "Type",
        "Subtype",
        "Owner / Faction",
        "Captain / Commander",
        "Propulsion / Power",
        "Passenger / Cargo Capacity",
        "Crew Capacity",
        "Home Port / Base",
        "Cultural Position",
        "Cultural Reach",
        "Crew",
        "Description",
        "Appearance",
        "Armament",
        "Defenses",
        "Notable Voyages / Incidents",
        "Notes",
      ],
    },
    {
      // v1.3-halfwidth Weapon / Armor reorder: 20 fields. Was 16 in v1.2
      // minus 1 deprecated (Current Location) plus 5 new (Subtype, Built /
      // Forged, Cultural Position, Cultural Reach, Previous Owners). Net:
      // 16 - 1 + 5 = 20. Renames-without-content-change: Aliases /
      // Designation → Other Names, Category → Type, Appearance →
      // Appearance / Description, History / Ownership → History. Materials
      // type-converted tags → entry-ref multi (Substance / Material) with
      // tag list preserved to Notes.
      //
      // Pairs: Other Names|Status, Type|Subtype (cascade pair),
      // Damage / Protection|Reach / Range, Weight Class|Handedness, Built /
      // Forged|Current Wielder / Wearer, Cultural Position|Cultural Reach.
      // Three-zone structure: half-eligible run (12) → entry-ref multi
      // cluster (2: Materials, Previous Owners) → textarea cluster (6).
      template: "Weapon / Armor",
      rev: "v1.3-halfwidth",
      canonicalOrder: [
        "Other Names",
        "Status",
        "Type",
        "Subtype",
        "Damage / Protection",
        "Reach / Range",
        "Weight Class",
        "Handedness",
        "Built / Forged",
        "Current Wielder / Wearer",
        "Cultural Position",
        "Cultural Reach",
        "Materials",
        "Previous Owners",
        "Origin / Smith / Maker",
        "Appearance / Description",
        "Properties / Enchantments",
        "Drawback / Curse",
        "History",
        "Notes",
      ],
    },
    // ═══════════════════════════════════════════════════════════════════════
    // v1.3-mtsys pass: Magic / Tech System cross-reference rollout. Adds
    // entry-ref multi fields linking 11 templates to Magic / Tech System
    // entries. Pure additive — no schema breakage, no value migrations, no
    // halfWidth changes (entry-ref multi isn't half-eligible). Field labels
    // are role-specific per template (not uniform "Magic / Tech Systems")
    // following the doctrine pattern of semantic labels for relational fields
    // (Habitat not Location, Notable Members not Characters, etc.).
    //
    // 11 templates uplifted:
    //   Artifact / Object / Currency: "Enchanted / Enhanced With"
    //   Character: "Practitioner / Wielder of"
    //   Creature: "Innate Magic / Technology"
    //   Culture / People: "Cultural Magic / Technology"
    //   Deity / Entity: "Known Grantable Magic / Technology"
    //   Faction / Government / Organization: "Known Magic / Technology Used"
    //   Magic / Tech System: "Related Magic / Technology Systems" (self-ref)
    //   Race / Species / Ancestry: "Innate Magic / Technology"
    //   Religion / Belief System: "Known Magic / Technology Used"
    //   Vehicle: "Power Source"
    //   Weapon / Armor: "Enchanted / Enhanced With"
    //
    // Skipped (marginal fit — most instances wouldn't fill the field):
    //   Astronomical Body, Book / Document / Text / Tome, Festival / Holiday,
    //   Historical Event, Language / Glossary, Location, Plot Thread,
    //   Substance / Material, Theme / Motif. Users can add custom fields for
    //   worlds where these intersections matter.
    {
      template: "Artifact / Object / Currency",
      rev: "v1.3-mtsys",
      canonicalOrder: [
        "Other Names",
        "Type",
        "Status",
        "Cultural Position",
        "Material",
        "Rarity",
        "Issuing Faction",
        "Currency Details",
        "Current Owner",
        "Current Location",
        "Enchanted / Enhanced With",
        "Appearance",
        "Properties / Effects",
        "Curse / Drawback",
        "Origin / Creator",
        "Description",
        "History",
        "Notes",
      ],
    },
    {
      template: "Character",
      rev: "v1.3-mtsys",
      canonicalOrder: [
        "Former Names",
        "Title",
        "Aliases",
        "Status",
        "Cause of Death",
        "Lifespan",
        "Species / Race",
        "Gender / Pronouns",
        "Lineage / Bloodline",
        "Father",
        "Mother",
        "Spouse",
        "Languages Spoken",
        "Religion",
        "Current Whereabouts",
        "Practitioner / Wielder of",
        "Affiliations",
        "Ally / Mentor",
        "Enemies",
        "Appearance",
        "Description",
        "Background",
        "Personality",
        "Voice / Speech Pattern",
        "Goals / Motivations",
        "Abilities / Skills",
        "Possessions",
        "Notes",
      ],
    },
    {
      template: "Creature",
      rev: "v1.3-mtsys",
      canonicalOrder: [
        "Other Names",
        "Lifespan",
        "Type",
        "Subtype",
        "Status",
        "Sentience Level",
        "Threat Level / Danger Rating",
        "Size / Scale",
        "Cultural Position",
        "Cultural Reach",
        "Habitat",
        "Diet",
        "Innate Magic / Technology",
        "Variants / Subspecies",
        "Reproduction / Lifecycle",
        "Abilities / Traits",
        "Weaknesses",
        "Lore / Cultural Significance",
        "Description",
        "Behavior",
        "Origin / History",
        "Notes",
      ],
    },
    {
      template: "Culture / People",
      rev: "v1.3-mtsys",
      canonicalOrder: [
        "Other Names",
        "Status",
        "Type",
        "Subtype",
        "Founded / Established",
        "Population & Distribution",
        "Cultural Magic / Technology",
        "Associated Races",
        "Associated Locations",
        "Languages",
        "Religions",
        "Notable Members",
        "Values / Ethos",
        "Customs & Traditions",
        "Family / Social Structure",
        "Daily Life",
        "Dress & Cuisine",
        "Art & Architecture",
        "Origin / History",
        "Notes",
      ],
    },
    {
      template: "Deity / Entity",
      rev: "v1.3-mtsys",
      canonicalOrder: [
        "Other Names",
        "Status",
        "Type",
        "Power Tier",
        "Cultural Position",
        "Cultural Reach",
        "Domains / Portfolio",
        "Alignment / Disposition",
        "Known Grantable Magic / Technology",
        "Pantheon",
        "Holy Sites",
        "Worshippers",
        "Allied Powers",
        "Opposing Powers",
        "Symbol / Iconography",
        "Appearance / Manifestation",
        "Description",
        "Boons / Powers",
        "Origin / History",
        "Notes",
      ],
    },
    {
      template: "Faction / Government / Organization",
      rev: "v1.3-mtsys",
      canonicalOrder: [
        "Former Names",
        "Other Names",
        "Founded",
        "Type",
        "Status",
        "Parent Organization",
        "Alignment / Ideology",
        "Headquarters",
        "Membership Size",
        "Cultural Position",
        "Cultural Reach",
        "Active Period",
        "Known Magic / Technology Used",
        "Leadership",
        "Notable Members",
        "Allies",
        "Enemies",
        "Symbol / Insignia",
        "Goals",
        "Methods / Tactics",
        "Description",
        "Public Perception",
        "Origin / History",
        "Notes",
      ],
    },
    {
      template: "Magic / Tech System",
      rev: "v1.3-mtsys",
      canonicalOrder: [
        "Other Names",
        "Magnitude / Scale",
        "Type",
        "Status",
        "Cultural Position",
        "Cultural Reach",
        "Related Magic / Technology Systems",
        "Notable Practitioners",
        "Description",
        "Source of Power",
        "Rules / Mechanics",
        "Cost / Limitations",
        "Components / Tools",
        "Access Prerequisites",
        "Counter-magic / Defenses",
        "Origin / History",
        "Notes",
      ],
    },
    {
      template: "Race / Species / Ancestry",
      rev: "v1.3-mtsys",
      canonicalOrder: [
        "Other Names",
        "Lifespan",
        "BroadType",
        "Type",
        "Subtype",
        "Status",
        "Cultural Position",
        "Cultural Reach",
        "Innate Magic / Technology",
        "Native Habitat",
        "Cultures",
        "Languages",
        "Notable Individuals",
        "Physical Traits",
        "Special Abilities",
        "Reproduction / Lifecycle",
        "Origin / Creation",
        "Notes",
      ],
    },
    {
      template: "Religion / Belief System",
      rev: "v1.3-mtsys",
      canonicalOrder: [
        "Other Names",
        "Status",
        "Founder",
        "Founded / Established",
        "Type",
        "Subtype",
        "Cultural Position",
        "Cultural Reach",
        "Known Magic / Technology Used",
        "Worshipped Deities",
        "Notable Figures",
        "Sacred Texts / Scriptures",
        "Holy Sites",
        "Holy Days",
        "Affiliated Factions",
        "Description",
        "Symbol / Iconography",
        "Core Doctrine / Tenets",
        "Practices / Rites",
        "Hierarchy / Structure",
        "Schisms / Sects",
        "Origin / History",
        "Notes",
      ],
    },
    {
      template: "Vehicle",
      rev: "v1.3-mtsys",
      canonicalOrder: [
        "Other Names",
        "Classification / Class",
        "Status",
        "Built / Launched",
        "Type",
        "Subtype",
        "Owner / Faction",
        "Captain / Commander",
        "Propulsion / Power",
        "Passenger / Cargo Capacity",
        "Crew Capacity",
        "Home Port / Base",
        "Cultural Position",
        "Cultural Reach",
        "Power Source",
        "Crew",
        "Description",
        "Appearance",
        "Armament",
        "Defenses",
        "Notable Voyages / Incidents",
        "Notes",
      ],
    },
    {
      template: "Weapon / Armor",
      rev: "v1.3-mtsys",
      canonicalOrder: [
        "Other Names",
        "Status",
        "Type",
        "Subtype",
        "Damage / Protection",
        "Reach / Range",
        "Weight Class",
        "Handedness",
        "Built / Forged",
        "Current Wielder / Wearer",
        "Cultural Position",
        "Cultural Reach",
        "Enchanted / Enhanced With",
        "Materials",
        "Previous Owners",
        "Origin / Smith / Maker",
        "Appearance / Description",
        "Properties / Enchantments",
        "Drawback / Curse",
        "History",
        "Notes",
      ],
    },
    {
      // v1.3-character-reorder: top-load the 10 half-width fields so they pair
      // cleanly into 5 rows in render. Former Names sits at #1 as the identity
      // opener (name-history of THIS character — its evolution over time);
      // Lifespan is the non-half identity tail right after the half-width
      // block. All entry-ref multi fields cluster as a relational block
      // (Spouse adjacent to Father/Mother for semantic continuity, despite
      // landing in the full-width section due to multi:true). Lineage /
      // Bloodline moved to the descriptive textarea block where it fits
      // semantically. Possessions remains in the multi-ref cluster (objects
      // bound to this character) rather than orphaned just before Notes.
      template: "Character",
      rev: "v1.3-character-reorder",
      canonicalOrder: [
        "Former Names",
        "Title",
        "Aliases",
        "Status",
        "Cause of Death",
        "Species / Race",
        "Gender / Pronouns",
        "Father",
        "Mother",
        "Religion",
        "Current Whereabouts",
        "Lifespan",
        "Spouse",
        "Languages Spoken",
        "Practitioner / Wielder of",
        "Affiliations",
        "Ally / Mentor",
        "Enemies",
        "Possessions",
        "Lineage / Bloodline",
        "Appearance",
        "Description",
        "Background",
        "Personality",
        "Voice / Speech Pattern",
        "Goals / Motivations",
        "Abilities / Skills",
        "Notes",
      ],
    },
  ];
  if (!state.world.fieldOrderUpdates || typeof state.world.fieldOrderUpdates !== "object") {
    state.world.fieldOrderUpdates = {};
  }
  FIELD_ORDER_UPDATES.forEach(({ template: tplName, rev, canonicalOrder }) => {
    const migKey = `${tplName}:order:${rev}`;
    if (state.world.fieldOrderUpdates[migKey]) return;
    const tpl = state.templates.find(t => t.name === tplName && t.origin === TEMPLATE_ORIGIN.BUILTIN);
    if (tpl) {
      // Reorder built-in fields per the canonical sequence. User-added fields
      // (labels not in canonicalOrder) get appended at the end in their
      // original relative order. This preserves user customization at the
      // "field still here with content intact" level — custom fields don't
      // get deleted or duplicated — but they lose any position they may have
      // had relative to built-ins. The trade-off matters for half-width
      // pair layouts: pairs depend on adjacency, so the strict skip-on-any-
      // customization rule that preceded this would silently disable the
      // pair feature on any template the user had touched.
      //
      // canonicalOrder labels that don't exist on the user's template (user
      // removed a built-in) are filtered out — the field stays removed.
      const byLabel = Object.fromEntries(tpl.fields.map(f => [f.label, f]));
      const canonicalSet = new Set(canonicalOrder);
      const reorderedBuiltins = canonicalOrder.map(label => byLabel[label]).filter(Boolean);
      const userAdded = tpl.fields.filter(f => !canonicalSet.has(f.label));
      tpl.fields = [...reorderedBuiltins, ...userAdded];
    }
    state.world.fieldOrderUpdates[migKey] = true;
  });

  // Ensure calendar exists
  if (!state.world.calendar) state.world.calendar = JSON.parse(JSON.stringify(DEFAULT_CALENDAR));

  // v1.4 Kalendarium: backfill the secondary-calendars array. Empty on
  // existing worlds (pre-v1.4 worlds only had a single primary calendar at
  // world.calendar). No entry migration needed — entries without a
  // calendarId field resolve to primary via getCalendar(state, null).
  if (!Array.isArray(state.calendars)) state.calendars = [];

  // v1.4 (post-Kalendarium) calendar extensions: backfill week / celestials /
  // seasons on primary and every additional calendar. Pure-additive — existing
  // calendars get default-shape extensions; calendars that already have them
  // get their shapes validated. Idempotent. See ensureCalendarShape for
  // per-field validation rules.
  ensureCalendarShape(state.world.calendar);
  state.calendars.forEach(ensureCalendarShape);

  // v1.5 Ephemeris: backfill state.celestialBodies and state.ephemeris.
  //
  // celestialBodies is the new top-level slice for stars / planets / moons /
  // dwarf planets / asteroids / comets / rogue planets / black holes / meteor
  // showers. Each body carries the six classical orbital elements
  // (semiMajorAxis, eccentricity, inclination, ascendingNode,
  // argumentOfPeriapsis, meanAnomalyAtEpoch), physical parameters
  // (mass, radius, axialTilt), and a parentBodyId pointing at the body it
  // orbits (or null for stars / rogue planets / unhomed migrated moons).
  //
  // Migration from v1.4 calendar.celestials → v1.5 state.celestialBodies:
  // walk every calendar's celestials and add bodies for any whose id is not
  // already in state.celestialBodies. Additive only (idempotent on id), so
  // re-running migrate doesn't clobber subsequent Ephemeris-side edits to a
  // migrated body. parentBodyId starts null on every migrated moon — the
  // calendar/parent relationship in v1.4 was anchored to a calendar, not a
  // physical body, so users re-home migrated moons to their planets in the
  // Ephemeris workspace once it's wired up. Original cycleDays / offsetDays
  // are preserved on the body as legacyCycle so the data survives until the
  // user reconciles them into real orbital elements (parentBodyId + parent
  // mass + semiMajorAxis); calendar grid view continues to read from
  // calendar.celestials directly in r002 (sync gap acceptable while Ephemeris
  // edit UI doesn't exist; addressed when AsBo wires up).
  if (!Array.isArray(state.celestialBodies)) state.celestialBodies = [];
  // v1.5 Glossopoeia: ensure the view slice exists and is well-shaped on every
  // load. Fresh worlds get it from the default; older worlds and partial saves
  // get it backfilled. Additive and idempotent — never clobbers existing data.
  if (!state.glossopoeia || typeof state.glossopoeia !== "object") {
    state.glossopoeia = makeDefaultGlossopoeiaState();
  } else {
    const g = state.glossopoeia;
    if (!Array.isArray(g.conlangs)) g.conlangs = [];
    if (!Array.isArray(g.lexemes)) g.lexemes = [];
    if (!Array.isArray(g.phonemes)) g.phonemes = [];
    if (!Array.isArray(g.syllableStructures)) g.syllableStructures = [];
    if (!Array.isArray(g.stressPatterns)) g.stressPatterns = [];
    if (!Array.isArray(g.phonotacticConstraints)) g.phonotacticConstraints = [];
    if (!Array.isArray(g.phonologicalRules)) g.phonologicalRules = [];
    if (!Array.isArray(g.grammaticalValues)) g.grammaticalValues = [];
    if (!Array.isArray(g.affixes)) g.affixes = [];
    if (!Array.isArray(g.wordBuildingProcesses)) g.wordBuildingProcesses = [];
    if (!Array.isArray(g.inflectionClasses)) g.inflectionClasses = [];
    if (!Array.isArray(g.pronounSets)) g.pronounSets = [];
    if (!Array.isArray(g.phraseOrders)) g.phraseOrders = [];
    if (!Array.isArray(g.sentenceMarkings)) g.sentenceMarkings = [];
    if (!Array.isArray(g.constructions)) g.constructions = [];
    if (!Array.isArray(g.relativizations)) g.relativizations = [];
    if (!Array.isArray(g.clauseLinkings)) g.clauseLinkings = [];
    if (!Array.isArray(g.writingSystems)) g.writingSystems = [];
    if (!Array.isArray(g.graphemes)) g.graphemes = [];
    if (!Array.isArray(g.spellingRules)) g.spellingRules = [];
    if (!Array.isArray(g.corpusEntries)) g.corpusEntries = [];
    if (!g.workspaceNotes || typeof g.workspaceNotes !== "object") g.workspaceNotes = {};
    if (!g.ui || typeof g.ui !== "object") {
      g.ui = { activeLangId: null, workspace: "overview" };
    } else {
      if (typeof g.ui.activeLangId === "undefined") g.ui.activeLangId = null;
      if (typeof g.ui.workspace !== "string") g.ui.workspace = "overview";
    }
  }
  {
    const existingIds = new Set(state.celestialBodies.map(b => b && b.id).filter(Boolean));
    // v1.5 r004 idempotency hardening: also key on trimmed-lowercase name.
    // The r004 entry→body migration renames cel- ids to ent- on the body
    // when it merges narrative onto a name-matched existing body, but
    // calendar.celestials retains the original cel- id (no schema change
    // to the calendar slice — moon-phase rendering reads from there
    // directly). Without the name check, the next r002 pass after a merge
    // would re-add the cel- body because its id is no longer in
    // existingIds, doubling every merged body. The name check catches
    // that and keeps r002 properly idempotent across the merge.
    const existingNames = new Set(
      state.celestialBodies
        .map(b => b && (b.name || "").trim().toLowerCase())
        .filter(Boolean)
    );
    const calsToWalk = [state.world.calendar, ...(state.calendars || [])].filter(c => c && Array.isArray(c.celestials));
    calsToWalk.forEach(cal => {
      cal.celestials.forEach(cel => {
        if (!cel || typeof cel !== "object" || !cel.id) return;
        if (existingIds.has(cel.id)) return;
        const celName = (typeof cel.name === "string" ? cel.name : "").trim().toLowerCase();
        if (celName && existingNames.has(celName)) return;
        existingIds.add(cel.id);
        if (celName) existingNames.add(celName);
        state.celestialBodies.push({
          id: cel.id,
          name: typeof cel.name === "string" && cel.name.trim() ? cel.name.trim() : "(unnamed moon)",
          kind: "moon",
          parentBodyId: null,
          orbitalElements: {
            semiMajorAxis: null,
            eccentricity: 0,
            inclination: 0,
            ascendingNode: 0,
            argumentOfPeriapsis: 0,
            meanAnomalyAtEpoch: 0,
          },
          physicalParams: {
            mass: null,
            radius: null,
            axialTilt: null,
          },
          legacyCycle: {
            cycleDays: Number.isFinite(cel.cycleDays) && cel.cycleDays > 0 ? cel.cycleDays : 28,
            offsetDays: Number.isFinite(cel.offsetDays) ? Math.floor(cel.offsetDays) : 0,
          },
          color: typeof cel.color === "string" ? cel.color : "",
          icon: typeof cel.icon === "string" ? cel.icon : "",
          notes: "",
          tags: [],
        });
      });
    });
  }

  // ephemeris: per-mode view-state plus shared tree-UI. Whole-object default
  // when missing or malformed; per-substate validation can be tightened later
  // as each workspace lands. Defensive enough to accept old-shape stored
  // state without crashing, but doesn't try to merge partial substates —
  // worth-the-effort tuning happens during AsBo / Compute / Observe / Event
  // build. Each missing substate falls back to its default block.
  if (!state.ephemeris || typeof state.ephemeris !== "object") {
    state.ephemeris = makeDefaultEphemerisState();
  } else {
    const defaults = makeDefaultEphemerisState();
    if (!state.ephemeris.asbo || typeof state.ephemeris.asbo !== "object") state.ephemeris.asbo = defaults.asbo;
    if (!state.ephemeris.compute || typeof state.ephemeris.compute !== "object") state.ephemeris.compute = defaults.compute;
    if (!state.ephemeris.observe || typeof state.ephemeris.observe !== "object") state.ephemeris.observe = defaults.observe;
    if (!state.ephemeris.event || typeof state.ephemeris.event !== "object") state.ephemeris.event = defaults.event;
    if (!state.ephemeris.treeUI || typeof state.ephemeris.treeUI !== "object") state.ephemeris.treeUI = defaults.treeUI;
    // r048 G2: backfill Forced Alignment substate for pre-r045 worlds.
    if (!state.ephemeris.forceAlign || typeof state.ephemeris.forceAlign !== "object") state.ephemeris.forceAlign = defaults.forceAlign;
    if (typeof state.ephemeris.currentMode !== "string") state.ephemeris.currentMode = defaults.currentMode;
  }

  // v1.5 r004: Astronomical Body template → state.celestialBodies migration.
  //
  // Walks state.entries for entries whose templateId matches the v1.4
  // built-in Astronomical Body template, creates a body per entry preserving
  // the entry's id (so existing entry-refs from other templates continue to
  // resolve via the resolver fallback), deletes the source entries, removes
  // the template from state.templates, and rewrites refTemplates references
  // in surviving templates from "Astronomical Body" to "Celestial Body"
  // (BODY_REF_LABEL sentinel).
  //
  // Tracker: state.migrations.astrobodyMigratedV15 set after completion.
  // Subsequent loads skip this work. Idempotent — when the tracker is
  // missing and there's no AstroBody template (fresh world or already-
  // migrated world that lost its tracker), the pass is a no-op except for
  // setting the flag.
  //
  // Name-based template lookup filters origin === BUILTIN to avoid touching
  // a user-authored template that happens to share the "Astronomical Body"
  // name. Per doctrine: name-based matchers inside migrate() must origin-
  // filter.
  if (!state.migrations || typeof state.migrations !== "object") state.migrations = {};
  if (!state.migrations.astrobodyMigratedV15) {
    const ASTROBODY_TYPE_TO_KIND = {
      // Computable kinds — preserve orbital-math eligibility.
      "Star": "star",
      "Planet": "planet",
      "Moon / Satellite": "moon",
      "Dwarf Planet": "dwarf-planet",
      "Rogue Planet": "rogue-planet",
      "Asteroid": "asteroid",
      "Comet": "comet",
      "Black Hole": "black-hole",
      "Meteor Shower": "meteor-shower",
      // Plausible-stretch mappings to existing computable kinds.
      // Preserved verbatim in body.type for narrative.
      "Pulsar": "star",
      "Brown Dwarf": "star",
      // Narrative kinds — added in r007. These get their own first-class
      // kind ids with computable=false, so they participate in the body
      // tree and the AsBo workspace but stay out of Compute / Observe /
      // Event eligibility.
      "Galaxy": "galaxy",
      "Constellation": "constellation",
      "Quasar": "quasar",
      "Nebula": "nebula",
      "Supernova Remnant": "supernova-remnant",
      "Sector": "sector",
      "Star System": "star-system",
      "Asteroid Belt": "asteroid-belt",
      "Ring System": "ring-system",
      "Megastructure": "megastructure",
      "Wormhole": "wormhole",
      "Anomaly": "anomaly",
    };
    // Generic narrative fallback for v1.4 "Other" or any unmappable Type
    // value (free-text from otherTextField). "structure" is the catch-all
    // narrative kind — explicitly non-computable. Pre-r007 builds defaulted
    // to "planet" here, which silently misclassified non-physical entries
    // as orbital bodies.
    const ASTROBODY_DEFAULT_KIND = "structure";

    const astroTemplate = state.templates.find(t =>
      t && t.name === "Astronomical Body" && t.origin === TEMPLATE_ORIGIN.BUILTIN
    );

    if (astroTemplate) {
      const fieldByLabel = {};
      (astroTemplate.fields || []).forEach(f => { fieldByLabel[f.label] = f; });
      const fid = (label) => fieldByLabel[label] ? fieldByLabel[label].id : null;
      const flexParseNumeric = (v) => {
        if (v == null || v === "") return null;
        if (Number.isFinite(v)) return v;
        const m = String(v).match(/[-+]?[\d.]+/);
        return m ? parseFloat(m[0]) : null;
      };
      const refSingleId = (raw) => {
        if (typeof raw === "string" && raw) return raw;
        if (raw && typeof raw === "object" && raw.id) return raw.id;
        return null;
      };
      const refMultiIds = (raw) => {
        if (!Array.isArray(raw)) return [];
        return raw.map(refSingleId).filter(Boolean);
      };
      const stringField = (raw) => typeof raw === "string" ? raw : "";

      const existingBodyIds = new Set(state.celestialBodies.map(b => b && b.id).filter(Boolean));
      const migratedEntryIds = new Set();

      state.entries.forEach(entry => {
        if (!entry || entry.templateId !== astroTemplate.id) return;
        if (existingBodyIds.has(entry.id)) return;
        const fields = entry.fields || {};

        const typeRaw = fields[fid("Type")];
        const typeValue = (selectValueOnly(typeRaw) || "").trim();
        const kind = ASTROBODY_TYPE_TO_KIND[typeValue] || ASTROBODY_DEFAULT_KIND;

        // Build the per-entry narrative payload first. It's the same shape
        // whether we end up creating a new body or merging onto an existing
        // one (e.g., a body the r002 calendar.celestials pass already added
        // under the same name).
        const narrative = {
          name: entry.name || "(unnamed)",
          otherNames: stringField(fields[fid("Other Names")]),
          // Preserve v1.4 narrative type verbatim — covers Galaxy / Nebula /
          // Constellation / Sector / etc. that don't map to the 9-kind enum.
          type: typeValue,
          status: fields[fid("Status")] || null,
          discoveredFounded: fields[fid("Discovered / Founded")] || null,
          rotationPeriod: flexParseNumeric(fields[fid("Rotation Period")]),
          atmosphere: stringField(fields[fid("Atmosphere")]),
          gravity: stringField(fields[fid("Gravity")]),
          visibleFrom: refMultiIds(fields[fid("Visible From")]),
          notableLocations: refMultiIds(fields[fid("Notable Locations")]),
          inhabitedBy: refMultiIds(fields[fid("Inhabited By")]),
          sacredTo: refMultiIds(fields[fid("Sacred to")]),
          physicalProperties: stringField(fields[fid("Physical Properties")]),
          climateConditions: stringField(fields[fid("Climate / Conditions")]),
          mythologicalSignificance: stringField(fields[fid("Mythological Significance")]),
          description: stringField(fields[fid("Description")]),
          history: stringField(fields[fid("History")]),
          notes: stringField(fields[fid("Notes")]),
          tags: typeof entry.tags === "string" ? entry.tags : "",
        };

        // v1.4 had Distance from Parent and Orbital Period as free-text.
        // These don't fit the structured orbital-element shape, but the user
        // may have written meaningful text there. Per migration doctrine
        // (nothing destroyed), append to notes when present.
        const distance = fields[fid("Distance from Parent")];
        const orbPer = fields[fid("Orbital Period")];
        const extras = [];
        if (typeof distance === "string" && distance.trim()) {
          extras.push(`Distance from Parent (v1.4): ${distance.trim()}`);
        }
        if (typeof orbPer === "string" && orbPer.trim()) {
          extras.push(`Orbital Period (v1.4): ${orbPer.trim()}`);
        }
        if (extras.length > 0) {
          narrative.notes = narrative.notes
            ? `${narrative.notes}\n\n${extras.join("\n")}`
            : extras.join("\n");
        }

        // Name-match merge guard. If a body with the same trimmed lowercase
        // name already exists in state.celestialBodies (almost always from
        // the r002 calendar.celestials migration of the same conceptual
        // body), MERGE the narrative payload onto that body and adopt the
        // entry's id so existing entry-refs resolve. This avoids the
        // doubling that happens when a v1.4 world defined the same body
        // both as a calendar.celestials entry (moon-phase tracking) and as
        // an Astronomical Body entry (narrative detail).
        //
        // Trade-off: the calendar.celestials slot retains its old id, so the
        // body's id-link to calendar.celestials breaks. Calendar grid view
        // reads from calendar.celestials directly (cycleDays / offsetDays
        // unchanged) so moon-phase rendering keeps working. Reconciling the
        // legacy cycle into real orbital math (parentBodyId + semiMajorAxis)
        // in the AsBo editor decouples the two surfaces by design, so this
        // disconnect is the expected end-state.
        //
        // Edge case: two unrelated entries sharing a name. The merge would
        // conflate them. Worldbuilder can edit kind / parent / narrative in
        // the AsBo editor after migration, but the original separation is
        // lost. Acceptable risk — name collisions across kinds (e.g., a
        // sword "Sol" and a star "Sol") are rare.
        const targetName = (entry.name || "").trim().toLowerCase();
        const matchIdx = targetName
          ? state.celestialBodies.findIndex(b => b && (b.name || "").trim().toLowerCase() === targetName)
          : -1;

        if (matchIdx !== -1) {
          const existing = state.celestialBodies[matchIdx];
          // Adopt entry id — drops the old id from existingBodyIds and
          // adds the new one so subsequent entries see the right state.
          existingBodyIds.delete(existing.id);
          existing.id = entry.id;
          existingBodyIds.add(entry.id);
          // Take entry name (likely more curated on entry side).
          existing.name = narrative.name;
          // parentBodyId comes from the entry's Parent Body field. The r002
          // calendar.celestials body started with parentBodyId = null (no
          // parent concept at the calendar layer), so this is purely
          // additive when the entry had a parent ref. Without this step the
          // merged body loses the entry's "orbits X" relationship and
          // becomes a top-level body in the AsBo tree.
          const parentFromEntry = refSingleId(fields[fid("Parent Body")]);
          if (parentFromEntry) existing.parentBodyId = parentFromEntry;
          // Layer narrative — r002 bodies started with empty narrative fields
          // so this is purely additive; no preexisting narrative gets clobbered.
          existing.otherNames = narrative.otherNames;
          existing.type = narrative.type;
          existing.status = narrative.status;
          existing.discoveredFounded = narrative.discoveredFounded;
          if (narrative.rotationPeriod != null) existing.rotationPeriod = narrative.rotationPeriod;
          existing.atmosphere = narrative.atmosphere;
          existing.gravity = narrative.gravity;
          existing.visibleFrom = narrative.visibleFrom;
          existing.notableLocations = narrative.notableLocations;
          existing.inhabitedBy = narrative.inhabitedBy;
          existing.sacredTo = narrative.sacredTo;
          existing.physicalProperties = narrative.physicalProperties;
          existing.climateConditions = narrative.climateConditions;
          existing.mythologicalSignificance = narrative.mythologicalSignificance;
          existing.description = narrative.description;
          existing.history = narrative.history;
          existing.notes = narrative.notes;
          existing.tags = narrative.tags;
          // Promote kind from the entry's Type only when the entry mapped
          // to something more specific than the default fallback. r002
          // bodies all start as "moon" (calendar.celestials are moons by
          // convention), so an entry mapped to "star" / "planet" / etc.
          // should win. An entry mapped via ASTROBODY_DEFAULT_KIND
          // (unmappable type like "Galaxy") leaves the existing kind alone.
          if (kind !== ASTROBODY_DEFAULT_KIND) existing.kind = kind;
          existing.originalSource = "entry-merged";
          migratedEntryIds.add(entry.id);
          return;
        }

        const body = {
          id: entry.id,
          name: narrative.name,
          kind,
          parentBodyId: refSingleId(fields[fid("Parent Body")]),
          otherNames: narrative.otherNames,
          type: narrative.type,
          status: narrative.status,
          discoveredFounded: narrative.discoveredFounded,
          orbitalElements: {
            semiMajorAxis: null,
            eccentricity: 0,
            inclination: 0,
            ascendingNode: 0,
            argumentOfPeriapsis: 0,
            meanAnomalyAtEpoch: 0,
          },
          physicalParams: {
            mass: null,
            radius: null,
            axialTilt: null,
          },
          rotationPeriod: narrative.rotationPeriod,
          atmosphere: narrative.atmosphere,
          gravity: narrative.gravity,
          visibleFrom: narrative.visibleFrom,
          notableLocations: narrative.notableLocations,
          inhabitedBy: narrative.inhabitedBy,
          sacredTo: narrative.sacredTo,
          physicalProperties: narrative.physicalProperties,
          climateConditions: narrative.climateConditions,
          mythologicalSignificance: narrative.mythologicalSignificance,
          description: narrative.description,
          history: narrative.history,
          notes: narrative.notes,
          tags: narrative.tags,
          // Provenance marker — distinguishes from calendar.celestials
          // migration (which sets legacyCycle instead). Lets AsBo display
          // appropriate hints for either origin.
          originalSource: "entry",
        };

        state.celestialBodies.push(body);
        existingBodyIds.add(body.id);
        migratedEntryIds.add(entry.id);
      });

      if (migratedEntryIds.size > 0) {
        state.entries = state.entries.filter(e => !migratedEntryIds.has(e.id));
      }
      state.templates = state.templates.filter(t => t !== astroTemplate);
    }

    // Rewrite refTemplates / refTemplate / refFilters across surviving
    // templates: "Astronomical Body" → BODY_REF_LABEL ("Celestial Body"
    // when this was written, "Astronomical Body" again since r077).
    // Drops refFilters keyed by "Astronomical Body" — the v1.4 Type-field
    // filter doesn't map to v1.5's body kind enum, so per-kind ref filtering
    // is deferred to v1.6 if it's ever needed. User templates with the same
    // name string get the same rewrite — author-friendly: existing refs
    // continue to resolve to bodies; the picker switches behavior on the
    // sentinel.
    //
    // v1.7 r004: the template's id goes too, wherever a field lists it
    // (retargetRetired). Before r004 the ids were left for
    // resolveTemplateRefs, which runs only when a later pass needs it, so a
    // field kept an id that matched nothing once the template was gone: its
    // picker offered no bodies, and the cleanup at the end of migrate()
    // deleted every reference to one (Location › Parent, Historical Event ›
    // Location). The repair pass after the template renames mends a world
    // converted before r004.
    const astroRetired = astroTemplate
      ? { ...RETIRED_TEMPLATE_TARGETS.find(r => r.slug === "astronomical-body"), isId: (id) => id === astroTemplate.id }
      : null;
    const rewriteRefsOnFields = (fields) => {
      if (!Array.isArray(fields)) return;
      fields.forEach(f => {
        if (!f) return;
        if (f.type === "entry-ref") {
          if (astroRetired) retargetRetired(f, astroRetired);
          if (f.refTemplate === "Astronomical Body") f.refTemplate = BODY_REF_LABEL;
          if (Array.isArray(f.refTemplates)) {
            f.refTemplates = f.refTemplates.map(n => n === "Astronomical Body" ? BODY_REF_LABEL : n);
          }
          if (f.refFilters && f.refFilters["Astronomical Body"]) {
            const next = { ...f.refFilters };
            delete next["Astronomical Body"];
            f.refFilters = next;
          }
        }
        if (f.subfields) rewriteRefsOnFields(f.subfields);
      });
    };
    state.templates.forEach(t => rewriteRefsOnFields(t.fields));

    state.migrations.astrobodyMigratedV15 = true;
  }

  // v1.5: Language / Glossary supersede-and-migrate.
  //
  // The built-in Language / Glossary template is replaced by Glossopoeia's
  // ConLang container (state.glossopoeia.conlangs) and the Lexicon's Lexeme
  // (state.glossopoeia.lexemes). Existing worlds' L/G entries move into the
  // slice with ids preserved (so surviving entry-refs resolve via the ConLang
  // node-source), the L/G template copy is removed, and ref fields that pointed
  // at it re-point to "ConLang". Routing is by old Entry Type:
  //   Language Overview / Dialect / Naming Convention -> ConLang
  //   Word / Term / Phrase / Idiom / Proverb / Slang  -> Lexeme
  //   Other / custom / missing                        -> Lexeme (type into Notes)
  // Lossless: unmapped text folds into Overview (container) or Notes (lexeme), a
  // definition becomes one Sense, Related Terms carry into Cognates by id with a
  // re-sort note, stale-scope refs (e.g. a Character in Spoken By) stay by id.
  // Words get a parent language only when the world has exactly one; otherwise
  // langId stays null (the Lexicon's Unassigned bucket). Idempotent via tracker
  // plus id guards; origin-filtered so a user template named "Language /
  // Glossary" is never touched. Mirrors the Astronomical Body migration.
  if (!state.migrations.languageGlossarySupersededV15) {
    const lgTemplate = state.templates.find(t =>
      t && t.name === "Language / Glossary" && t.origin === TEMPLATE_ORIGIN.BUILTIN
    );
    if (lgTemplate) {
      const g = state.glossopoeia;
      const fieldByLabel = {};
      (lgTemplate.fields || []).forEach(f => { if (f) fieldByLabel[f.label] = f; });
      const fid = (label) => fieldByLabel[label] ? fieldByLabel[label].id : null;
      const str = (raw) => typeof raw === "string" ? raw : "";
      const refSingleId = (raw) => (typeof raw === "string" && raw) ? raw : (raw && typeof raw === "object" && raw.id ? raw.id : null);
      const refMultiIds = (raw) => Array.isArray(raw) ? raw.map(refSingleId).filter(Boolean) : [];

      const CONTAINER_TYPES = new Set(["Language Overview", "Dialect", "Naming Convention"]);
      const UNIT_BY_TYPE = { "Word / Term": "word", "Phrase": "phrase", "Idiom / Proverb / Slang": "idiom" };

      const existingConlangIds = new Set((g.conlangs || []).map(c => c && c.id).filter(Boolean));
      const existingLexemeIds = new Set((g.lexemes || []).map(x => x && x.id).filter(Boolean));
      const movedIds = new Set();
      const newConlangs = [];
      const newLexemes = [];

      (state.entries || []).forEach(entry => {
        if (!entry || entry.templateId !== lgTemplate.id) return;
        if (existingConlangIds.has(entry.id) || existingLexemeIds.has(entry.id)) return;
        const f = entry.fields || {};
        const tags = Array.isArray(entry.tags) ? entry.tags : [];
        const entryTypeRaw = f[fid("Entry Type")];
        const entryType = (selectValueOnly(entryTypeRaw) || "").trim();
        const entryTypeText = (entryTypeRaw && typeof entryTypeRaw === "object" && entryTypeRaw.value === "Other")
          ? (entryTypeRaw.customText || "").trim() : entryType;
        const relatedIds = refMultiIds(f[fid("Related Terms")]);

        if (CONTAINER_TYPES.has(entryType)) {
          const parts = [];
          const add = (label, val) => { const s = str(val).trim(); if (s) parts.push(label + ": " + s); };
          add("Pronunciation", f[fid("Pronunciation")]);
          add("Definition / Meaning", f[fid("Definition / Meaning")]);
          add("Usage / Context", f[fid("Usage / Context")]);
          add("Etymology / Origin", f[fid("Etymology / Origin")]);
          add("Notes", f[fid("Notes")]);
          if (relatedIds.length) parts.push("Related terms (from old data, by id): " + relatedIds.join(", "));
          newConlangs.push({
            id: entry.id,
            name: entry.name || "Unnamed Language",
            tags,
            fields: {
              otherNames: str(f[fid("Other Names")]),
              status: f[fid("Status")] || "",
              culturalPosition: f[fid("Cultural Position")] || "",
              culturalReach: f[fid("Cultural Reach")] || "",
              spokenBy: refMultiIds(f[fid("Spoken By")]),
              region: refMultiIds(f[fid("Region")]),
              overview: parts.join("\n\n"),
            },
          });
        } else {
          const rawStatus = f[fid("Status")];
          const sv = selectValueOnly(rawStatus);
          let lexStatus = "";
          if (sv === "Active") lexStatus = "in use";
          else if (sv === "Archaic") lexStatus = "archaic";
          else if (sv === "Reconstructed") lexStatus = "reconstructed";
          else if (sv === "Other") {
            const ct = (rawStatus && typeof rawStatus === "object") ? (rawStatus.customText || "") : "";
            lexStatus = ct ? { value: "Other", customText: ct } : "";
          } else if (sv) lexStatus = { value: "Other", customText: sv };

          const def = str(f[fid("Definition / Meaning")]).trim();
          const senses = def ? [{ gloss: "", definition: def, sensePos: "", register: "", example: "" }] : [];

          const parts = [];
          const add = (label, val) => { const s = str(val).trim(); if (s) parts.push(label + ": " + s); };
          add("Usage / Context", f[fid("Usage / Context")]);
          add("Etymology / Origin", f[fid("Etymology / Origin")]);
          add("Other Names", f[fid("Other Names")]);
          add("Notes", f[fid("Notes")]);
          if (entryType === "Other" && entryTypeText) parts.push("Original entry type: " + entryTypeText);
          if (relatedIds.length) parts.push("Migrated from Related Terms into Cognates; re-sort into Derived From / Source Word as needed.");

          newLexemes.push({
            id: entry.id,
            langId: null,
            name: entry.name || "Unnamed Word",
            tags,
            fields: {
              pronunciation: str(f[fid("Pronunciation")]),
              unit: UNIT_BY_TYPE[entryType] || "",
              status: lexStatus,
              senses,
              cognates: relatedIds,
              notes: parts.join("\n\n"),
            },
          });
        }
        movedIds.add(entry.id);
      });

      // Parent language: assign only when the world has exactly one language
      // (existing + just-migrated). Otherwise words stay langId-null and land in
      // the Lexicon's Unassigned bucket for manual re-homing.
      const allLangIds = [...existingConlangIds, ...newConlangs.map(c => c.id)];
      if (allLangIds.length === 1) {
        const only = allLangIds[0];
        newLexemes.forEach(x => { if (x.langId == null) x.langId = only; });
      }

      if (newConlangs.length) g.conlangs = [...(g.conlangs || []), ...newConlangs];
      if (newLexemes.length) g.lexemes = [...(g.lexemes || []), ...newLexemes];
      if (movedIds.size) state.entries = (state.entries || []).filter(e => e && !movedIds.has(e.id));
      state.templates = state.templates.filter(t => t !== lgTemplate);
    }

    // Re-point ref fields naming the retired template: "Language / Glossary" ->
    // "ConLang". resolveTemplateRefs maps the name to SYNTH_TPL_CONLANG when it
    // runs; existing ref values keep resolving via the ConLang node-source (ids
    // kept).
    const lgRetired = lgTemplate
      ? { ...RETIRED_TEMPLATE_TARGETS.find(r => r.slug === "language-glossary"), isId: (id) => id === lgTemplate.id }
      : null;
    const repoint = (fields) => {
      if (!Array.isArray(fields)) return;
      fields.forEach(f => {
        if (!f) return;
        if (f.type === "entry-ref") {
          // Singular ref: set the name AND the resolved id. resolveTemplateRefs
          // only fills refTemplateId when it's absent, so the stale id from the
          // retired template would otherwise survive and leave a dead picker.
          if (f.refTemplate === "Language / Glossary") { f.refTemplate = CONLANG_REF_LABEL; f.refTemplateId = SYNTH_TPL_CONLANG; }
          // v1.7 r004: by id as well, and a multi-target field keeps its ids:
          // the template's id becomes ConLang and Lexeme, since its words
          // became lexemes (retargetRetired). Before r004 the id list was
          // cleared for resolveTemplateRefs to rebuild from the names, which
          // happens only when a later pass needs it: the field took any
          // template meanwhile, and the rebuilt list would have left out
          // Lexeme, so the cleanup would have deleted the references to the
          // words. A name the ids don't back is still renamed. The repair
          // pass after the template renames mends a world converted before
          // r004.
          if (lgRetired) retargetRetired(f, lgRetired);
          if (Array.isArray(f.refTemplates) && f.refTemplates.includes("Language / Glossary")) {
            f.refTemplates = f.refTemplates.map(n => n === "Language / Glossary" ? CONLANG_REF_LABEL : n);
          }
        }
        if (f.subfields) repoint(f.subfields);
      });
    };
    state.templates.forEach(t => repoint(t.fields));

    state.migrations.languageGlossarySupersededV15 = true;
  }

  // v1.5 r004/r005 fix-up: one-shot dedup of state.celestialBodies. Pre-fix
  // r004 builds didn't name-merge during the AstroBody→body migration, so
  // worlds that had the same conceptual body defined in BOTH
  // calendar.celestials and as an Astronomical Body entry ended up with
  // two distinct body records (one from each migration path).
  //
  // Tracker rev bumped to *V15r005namefix* with the r002 name-key
  // idempotency fix. Earlier rev *V15r004fix* could set on a first-load
  // state that LOOKED clean (3 ent-merged + 3 ent-original bodies; no
  // visible dups) but the r004 merge had silently renamed cel- bodies to
  // ent-, so the NEXT load's r002 pass re-added the cel- bodies under
  // their original ids, doubling the moons after the tracker was already
  // set. The new tracker fires on already-affected worlds to clean up.
  //
  // Recovery caveat: parentBodyId data lost during the broken pre-r005
  // merge is NOT recoverable here — both the ent-merged loser and the
  // cel- winner have parentBodyId = null, so dedup can't restore the
  // "orbits X" linkage. Users on already-affected worlds need to
  // re-import their pre-migration v1.4 export to recover that data.
  //
  // This pass consolidates by trimmed-lowercase name, merging fields onto
  // the most narratively-complete record and dropping the others.
  // Idempotent: re-running on a clean world is a no-op since findIndex
  // returns the same record every time. Combined with the r002 name-key
  // check, dups should no longer arise on fresh loads.
  //
  // Edge case: legitimate name collisions across kinds (a star "Sol" and a
  // ship "Sol" — if Drak ever defined a ship-as-body) would get conflated.
  // Such collisions in the body table specifically are vanishingly rare and
  // the user can split them in the AsBo editor after the fact.
  if (!state.migrations.astrobodyDedupedV15r005namefix) {
    const seen = new Map();  // lowercased name → index in state.celestialBodies
    const dropIndexes = new Set();
    state.celestialBodies.forEach((b, i) => {
      if (!b || !b.id) return;
      const key = (b.name || "").trim().toLowerCase();
      if (!key) return;
      if (!seen.has(key)) {
        seen.set(key, i);
        return;
      }
      // Pick which record wins: prefer the one with provenance "entry" or
      // "entry-merged" (richer narrative), then the one with more populated
      // fields. The loser merges fields onto the winner and gets dropped.
      const keeperIdx = seen.get(key);
      const keeper = state.celestialBodies[keeperIdx];
      const narrativeWeight = (b) => {
        if (!b) return -1;
        let w = 0;
        if (b.originalSource === "entry" || b.originalSource === "entry-merged") w += 100;
        ["otherNames", "atmosphere", "gravity", "physicalProperties", "climateConditions", "mythologicalSignificance", "description", "history", "notes"].forEach(k => {
          if (typeof b[k] === "string" && b[k].trim()) w += 1;
        });
        ["visibleFrom", "notableLocations", "inhabitedBy", "sacredTo"].forEach(k => {
          if (Array.isArray(b[k]) && b[k].length > 0) w += 1;
        });
        return w;
      };
      const winner = narrativeWeight(b) > narrativeWeight(keeper) ? b : keeper;
      const loser  = winner === b ? keeper : b;
      const winnerIdx = winner === b ? i : keeperIdx;
      const loserIdx  = winner === b ? keeperIdx : i;

      // Layer: winner wins on every populated narrative field; loser fills
      // anything the winner left empty. Astronomical data (orbitalElements,
      // physicalParams, legacyCycle) merges field-by-field with non-null
      // winner-side beating non-null loser-side.
      const mergeStr = (a, b) => (typeof a === "string" && a.trim()) ? a : (typeof b === "string" ? b : "");
      const mergeList = (a, b) => (Array.isArray(a) && a.length > 0) ? a : (Array.isArray(b) ? b : []);
      winner.otherNames = mergeStr(winner.otherNames, loser.otherNames);
      winner.type = winner.type || loser.type || "";
      winner.status = winner.status || loser.status || null;
      winner.discoveredFounded = winner.discoveredFounded || loser.discoveredFounded || null;
      winner.atmosphere = mergeStr(winner.atmosphere, loser.atmosphere);
      winner.gravity = mergeStr(winner.gravity, loser.gravity);
      if (winner.rotationPeriod == null && Number.isFinite(loser.rotationPeriod)) {
        winner.rotationPeriod = loser.rotationPeriod;
      }
      winner.visibleFrom = mergeList(winner.visibleFrom, loser.visibleFrom);
      winner.notableLocations = mergeList(winner.notableLocations, loser.notableLocations);
      winner.inhabitedBy = mergeList(winner.inhabitedBy, loser.inhabitedBy);
      winner.sacredTo = mergeList(winner.sacredTo, loser.sacredTo);
      winner.physicalProperties = mergeStr(winner.physicalProperties, loser.physicalProperties);
      winner.climateConditions = mergeStr(winner.climateConditions, loser.climateConditions);
      winner.mythologicalSignificance = mergeStr(winner.mythologicalSignificance, loser.mythologicalSignificance);
      winner.description = mergeStr(winner.description, loser.description);
      winner.history = mergeStr(winner.history, loser.history);
      winner.notes = mergeStr(winner.notes, loser.notes);
      winner.tags = mergeStr(winner.tags, loser.tags);
      // Take legacyCycle from whichever side has it; winner first.
      if (!winner.legacyCycle && loser.legacyCycle) winner.legacyCycle = loser.legacyCycle;
      // Take the more-specific kind. The migration's default-kind fallback
      // ("structure" — narrative catch-all) loses to anything else since it
      // means "we couldn't tell what this body is."
      if (winner.kind === "structure" && loser.kind && loser.kind !== "structure") {
        winner.kind = loser.kind;
      }
      // Take whichever parentBodyId is set; winner first.
      if (!winner.parentBodyId && loser.parentBodyId) winner.parentBodyId = loser.parentBodyId;
      // Orbital elements / physical params: winner wins for any non-null value.
      const we = winner.orbitalElements || {};
      const le = loser.orbitalElements || {};
      ["semiMajorAxis", "eccentricity", "inclination", "ascendingNode", "argumentOfPeriapsis", "meanAnomalyAtEpoch"].forEach(k => {
        if (we[k] == null && le[k] != null) we[k] = le[k];
      });
      winner.orbitalElements = we;
      const wp = winner.physicalParams || {};
      const lp = loser.physicalParams || {};
      ["mass", "radius", "axialTilt"].forEach(k => {
        if (wp[k] == null && lp[k] != null) wp[k] = lp[k];
      });
      winner.physicalParams = wp;
      winner.originalSource = "entry-merged";

      // Re-point any body that had the loser as parent so the tree stays
      // connected.
      state.celestialBodies.forEach(child => {
        if (child && child.parentBodyId === loser.id) child.parentBodyId = winner.id;
      });

      dropIndexes.add(loserIdx);
      seen.set(key, winnerIdx);
    });

    if (dropIndexes.size > 0) {
      state.celestialBodies = state.celestialBodies.filter((_, i) => !dropIndexes.has(i));
    }
    state.migrations.astrobodyDedupedV15r005namefix = true;
  }

  // v1.5 moon-unification: rewrite calendar.celestials from the legacy object
  // array [{id,name,cycleDays,offsetDays,...}] into an array of moon-body id
  // refs (strings). MUST run after every body create / merge / dedup pass
  // above so body ids are final. Resolution per celestial:
  //   1. body whose id === cel.id            (no-merge case; id survived)
  //   2. else body whose name === cel.name   (the r004 merge adopts the entry
  //      id and r005 dedup can drop a record, so the cel- id may no longer
  //      exist — trimmed-lowercase NAME is the only key stable across both)
  // Stores the resolved body's FINAL id. Dangling celestials (no resolvable
  // body — shouldn't happen post-backfill, defensive) are dropped. Result
  // deduped, order preserved. Idempotent: a calendar already in ref shape
  // (every entry a string) is skipped, so a fresh world's picker-written refs
  // are never disturbed.
  {
    const moonBodiesById = {};
    const moonBodiesByName = new Map();
    state.celestialBodies.forEach(b => {
      if (!b || !b.id) return;
      moonBodiesById[b.id] = b;
      const nm = (b.name || "").trim().toLowerCase();
      if (nm && !moonBodiesByName.has(nm)) moonBodiesByName.set(nm, b);
    });
    const rewriteCelestialsToRefs = (cal) => {
      if (!cal || !Array.isArray(cal.celestials) || cal.celestials.length === 0) return;
      if (cal.celestials.every(c => typeof c === "string")) return; // already refs
      const refs = [];
      const seen = new Set();
      cal.celestials.forEach(cel => {
        if (!cel || typeof cel !== "object") return;
        let body = cel.id ? moonBodiesById[cel.id] : null;
        if (!body) {
          const nm = (typeof cel.name === "string" ? cel.name : "").trim().toLowerCase();
          if (nm) body = moonBodiesByName.get(nm) || null;
        }
        if (body && body.id && !seen.has(body.id)) {
          seen.add(body.id);
          refs.push(body.id);
        }
      });
      cal.celestials = refs;
    };
    [state.world.calendar, ...(state.calendars || [])].forEach(rewriteCelestialsToRefs);
  }

  // v1.5 moon-unification: promote each body's migration-only legacyCycle into
  // the first-class, user-editable synodicCycleDays / phaseAnchorDay, then drop
  // legacyCycle. legacyCycle exists only as a transient carrier during this
  // migrate() pass (the celestials->body backfill and the dedup merge populate
  // it); by the time migrate() returns there is one canonical home for the
  // simple-cycle values. Per-field copy-if-missing so a moon the user already
  // partly edited under the lazy build keeps their values and only fills the
  // gaps. Idempotent: a body with no legacyCycle is untouched.
  state.celestialBodies.forEach(b => {
    if (!b || !b.legacyCycle) return;
    const lc = b.legacyCycle;
    if (!Number.isFinite(b.synodicCycleDays) && Number.isFinite(lc.cycleDays) && lc.cycleDays > 0) {
      b.synodicCycleDays = Math.max(1, Math.round(lc.cycleDays * 10) / 10);
    }
    if (!Number.isFinite(b.phaseAnchorDay) && Number.isFinite(lc.offsetDays)) {
      b.phaseAnchorDay = Math.floor(lc.offsetDays);
    }
    delete b.legacyCycle;
  });

  // v1.4 Kalendarium: backfill viewPrefs for per-view calendar selectors.
  // Empty object on existing worlds — every view's selector defaults to
  // primary via the `?? null` read pattern in getViewCalendarContext.
  // Future per-world view preferences (default sort, disabled-template
  // toggles, etc.) land in the same object as additional keys.
  if (!state.viewPrefs || typeof state.viewPrefs !== "object") state.viewPrefs = {};

  // v1.7 r002: the entry-ref audit's flags 1 to 5 (docs/entry-ref-audit.md;
  // Drak, 2026-10-24). Eleven built-in fields gain targets in worlds made
  // before r002 (BUILTIN_TEMPLATES carries them for new worlds), once per world
  // and field, names and ids together, never removing one. A single-target
  // field becomes multi-target, as the builder's toggle makes it; a field open
  // to every template stays open; a field holding an id that resolves to
  // nothing is left alone, as syncRefTargetNames leaves it; a target template
  // the user deleted isn't added, nor one whose name a template of the user's
  // own holds; a field the user relabelled isn't found. The lists are edited
  // here directly, because calling resolveTemplateRefs would re-derive every
  // field in the world. After the v1.5 conversions, so the body target is the
  // body source and not a v1.4 template about to be removed. Tracked per world
  // (state.world.refTargetUpdates), as OPTIONS_UPDATES is.
  {
    const FAC = "Faction / Government / Organization";
    const HOUSE = "House / Dynasty / Clan / Bloodline";
    const REF_TARGET_ADDITIONS = [
      { template: "Artifact / Object / Currency", field: "Current Owner", rev: "v1.7-r002", add: [FAC, HOUSE] },
      { template: "Character", field: "Ally / Mentor", rev: "v1.7-r002", add: [FAC, "Culture / People", "Deity / Entity"] },
      { template: "Character", field: "Enemies", rev: "v1.7-r002", add: [FAC, "Culture / People", "Deity / Entity"] },
      { template: "Character", field: "Possessions", rev: "v1.7-r002", add: ["Weapon / Armor", "Vehicle"] },
      { template: HOUSE, field: "Heirlooms", rev: "v1.7-r002", add: ["Weapon / Armor"] },
      { template: "Religion / Belief System", field: "Founder", rev: "v1.7-r002", add: ["Deity / Entity"] },
      { template: "Substance / Material", field: "Source / Where Found", rev: "v1.7-r002", add: ["Creature", BODY_REF_LABEL] },
      { template: "Theme / Motif", field: "Associated Objects", rev: "v1.7-r002", add: ["Weapon / Armor", "Vehicle"] },
      { template: "Vehicle", field: "Owner / Faction", rev: "v1.7-r002", add: ["Character", HOUSE] },
      { template: "Vehicle", field: "Power Source", rev: "v1.7-r002", add: ["Substance / Material"] },
      { template: "Weapon / Armor", field: "Previous Owners", rev: "v1.7-r002", add: [FAC, HOUSE] },
    ];
    if (!state.world.refTargetUpdates || typeof state.world.refTargetUpdates !== "object") {
      state.world.refTargetUpdates = {};
    }
    const { byName, nameById } = refTargetIndex(state.templates);
    const targetIdFor = (name) => {
      const builtin = state.templates.find(t => t.name === name && t.origin === TEMPLATE_ORIGIN.BUILTIN);
      if (builtin) return builtin.id;
      if (state.templates.some(t => t.name === name)) return null;
      const src = NODE_SOURCE_REGISTRY.find(s => s.name === name);
      return src ? src.id : null;
    };
    REF_TARGET_ADDITIONS.forEach(({ template: tplName, field: fieldLabel, rev, add }) => {
      const migKey = `${tplName}:${fieldLabel}:targets:${rev}`;
      if (state.world.refTargetUpdates[migKey]) return;
      state.world.refTargetUpdates[migKey] = true;
      const tpl = state.templates.find(t => t.name === tplName && t.origin === TEMPLATE_ORIGIN.BUILTIN);
      const f = tpl && (tpl.fields || []).find(x => x && x.label === fieldLabel && x.type === "entry-ref");
      if (!f) return;
      const multi = Array.isArray(f.refTemplatesId) && f.refTemplatesId.length > 0;
      // A single target never resolved yet (no id key at all) counts by its name.
      const single = f.refTemplateId
        || ((f.refTemplate && !("refTemplateId" in f)) ? byName[f.refTemplate] : undefined);
      const ids = multi ? [...f.refTemplatesId] : (single ? [single] : []);
      if (ids.length === 0) return;
      if (ids.some(id => !nameById.has(id))) return;
      const names = (multi && Array.isArray(f.refTemplates)) ? [...f.refTemplates] : ids.map(id => nameById.get(id));
      add.forEach(name => {
        const id = targetIdFor(name);
        if (!id || ids.includes(id)) return;
        ids.push(id);
        names.push(name);
      });
      f.refTemplatesId = ids;
      f.refTemplates = names;
      if (!multi) {
        f.refTemplateId = null;
        if ("refTemplate" in f) delete f.refTemplate;
      }
    });
  }

  // Normalize each entry's field values via the shared helper. This catches
  // legacy entry-ref shapes, array-shaped tags fields, malformed name-history
  // rows, and calendar-date zombies — all in one pass.
  const tplById = Object.fromEntries(state.templates.map(t => [t.id, t]));
  state.entries.forEach(e => {
    const tpl = tplById[e.templateId];
    if (!tpl) return;
    if (e.fields) normalizeEntryFields(tpl.fields, e.fields);
  });

  // v1.3: Clean entry-ref values that violate multi-template + filter constraints.
  // For each entry-ref field with refTemplatesId or refFilters, validate that
  // each stored reference (a) points at an existing entry, (b) the entry's
  // template is in refTemplatesId (if set), and (c) for templates in refFilters,
  // the target's filter-field value is in allowedValues. Invalid refs are
  // silently dropped. Defensive against hand-edited JSON, deleted target
  // entries, and version-skewed worlds.
  //
  // v1.6.1 r052: astronomical bodies and Glossopoeia records are valid targets
  // that aren't entries. Until this cut the entry lookup missed them, so every
  // reference to one was dropped here on each load, import, and restore (v1.5
  // and v1.6). A registered record now counts when its source is among the
  // field's targets, the rule the picker offers it by; refFilters don't apply
  // to it, as in the picker. Entry references are judged as before.
  const entryById = Object.fromEntries(state.entries.map(e => [e.id, e]));
  const registeredSourceById = new Map(getRegisteredGraphNodes(state).map(n => [n.id, n.templateId]));
  state.entries.forEach(e => {
    const tpl = tplById[e.templateId];
    if (!tpl || !e.fields) return;
    for (const f of (tpl.fields || [])) {
      if (f.type !== "entry-ref") continue;
      if (!Array.isArray(f.refTemplatesId) && !f.refFilters) continue;
      const v = e.fields[f.id];
      if (v == null) continue;
      const isValid = (refId) => {
        if (!refId) return false;
        const target = entryById[refId];
        if (!target) {
          const sourceId = registeredSourceById.get(refId);
          if (!sourceId) return false;
          const allowed = (Array.isArray(f.refTemplatesId) && f.refTemplatesId.length > 0)
            ? f.refTemplatesId
            : (f.refTemplateId ? [f.refTemplateId] : []);
          return allowed.includes(sourceId);
        }
        if (Array.isArray(f.refTemplatesId) && f.refTemplatesId.length > 0) {
          if (!f.refTemplatesId.includes(target.templateId)) return false;
        }
        if (f.refFilters) {
          const targetTpl = tplById[target.templateId];
          if (!targetTpl) return false;
          const filterCfg = f.refFilters[targetTpl.name];
          if (filterCfg && filterCfg.fieldId && Array.isArray(filterCfg.allowedValues)) {
            const targetVal = selectValueOnly(target.fields?.[filterCfg.fieldId]);
            if (!filterCfg.allowedValues.includes(targetVal)) return false;
          }
        }
        return true;
      };
      if (f.relationKind) {
        const items = getRelationValues(v, f.multi);
        const valid = items.filter(it => isValid(it.id));
        if (valid.length !== items.length) {
          e.fields[f.id] = f.multi ? valid : (valid[0] || null);
        }
      } else if (f.multi) {
        if (Array.isArray(v)) {
          const valid = v.filter(refId => isValid(refId));
          if (valid.length !== v.length) e.fields[f.id] = valid;
        }
      } else {
        if (typeof v === "string" && !isValid(v)) {
          e.fields[f.id] = null;
        }
      }
    }
  });

  // Strip any pre-existing self-references from entry-ref fields. The editor
  // now blocks self-refs at input time; this catches anything from older world
  // files where they were previously allowed.
  state.entries = scrubSelfRefs(state.entries, state.templates);

  return state;
};

// ─── Migration validation ──────────────────────────────────────────────────────
// Run after migrate() to catch corrupt input that the migration didn't reject.
// Returns null on success, an error string describing the first violation on failure (Bug 10).
const validateMigrated = (state) => {
  if (!state || typeof state !== "object") return "State is not an object";
  if (!state.world || typeof state.world !== "object") return "Missing world metadata";
  if (!Array.isArray(state.templates)) return "Templates is not an array";
  if (!Array.isArray(state.entries)) return "Entries is not an array";

  const tplIds = new Set();
  for (const t of state.templates) {
    if (!t || typeof t !== "object") return "A template entry is not an object";
    if (!t.id) return `Template "${t.name || '(unnamed)'}" is missing an ID`;
    if (tplIds.has(t.id)) return `Duplicate template ID: ${t.id}`;
    tplIds.add(t.id);
    if (!Array.isArray(t.fields)) return `Template "${t.name}" has invalid fields list`;

    const fieldIds = new Set();
    const checkField = (f) => {
      if (!f || typeof f !== "object") return `A field in template "${t.name}" is not an object`;
      if (!f.id) return `Field "${f.label || '(unlabeled)'}" in template "${t.name}" is missing an ID`;
      if (fieldIds.has(f.id)) return `Duplicate field ID "${f.id}" in template "${t.name}"`;
      fieldIds.add(f.id);
      if (f.subfields) {
        if (!Array.isArray(f.subfields)) return `Subfields in template "${t.name}" is not an array`;
        for (const sf of f.subfields) {
          const err = checkField(sf);
          if (err) return err;
        }
      }
      return null;
    };
    for (const f of t.fields) {
      const err = checkField(f);
      if (err) return err;
    }
  }

  const entryIds = new Set();
  for (const e of state.entries) {
    if (!e || typeof e !== "object") return "An entry is not an object";
    if (!e.id) return `Entry "${e.name || '(unnamed)'}" is missing an ID`;
    if (entryIds.has(e.id)) return `Duplicate entry ID: ${e.id}`;
    entryIds.add(e.id);
    if (!e.templateId) return `Entry "${e.name}" is missing templateId`;
    if (!tplIds.has(e.templateId)) return `Entry "${e.name}" references missing template ${e.templateId}`;
  }

  return null;
};

// ─── Calendar date usage scan ──────────────────────────────────────────────────
// Walks every monthIndex-bearing surface on the supplied entries and returns a
// flat list of usages. The destructive-month-op warning in CalendarEditor uses
// the count from this scan to tell the user how many date references would be
// affected before they proceed.
//
// Surfaces walked:
//   - calendar-date fields (direct + inside repeating groups)
//   - calendar-date-range start/end (direct + inside repeating groups)
//   - name-history rows' from/to dates
//   - entry-ref fields with relationKind=SPOUSE_KIND: marriedOn/endedOn
//   - opts.currentMoment if supplied (world-level — caller passes this only
//     when editing the primary calendar, since currentMoment is stored in
//     primary's frame).
//
// Every surface that gets reframed by reframeDateAcrossStructure should also
// be counted here; the two functions need to stay in sync or the warning
// undercount silently drifts date references on month structural changes.
const collectCalendarDateUsages = (entries, templates, opts = {}) => {
  const tplById = Object.fromEntries(templates.map(t => [t.id, t]));
  const usages = [];
  const pushDate = (d, entryName, fieldLabel) => {
    if (d && typeof d === "object" && d.monthIndex != null) {
      usages.push({ entryName, fieldLabel, monthIndex: d.monthIndex });
    }
  };
  const visit = (fields, valueMap, entryName) => {
    if (!fields || !valueMap) return;
    fields.forEach(f => {
      const v = valueMap[f.id];
      if (v == null) return;
      if (f.type === "calendar-date") {
        pushDate(v, entryName, f.label);
      } else if (f.type === "calendar-date-range") {
        if (typeof v === "object") {
          pushDate(v.start, entryName, f.label + " (start)");
          pushDate(v.end, entryName, f.label + " (end)");
        }
      } else if (f.type === "name-history" && Array.isArray(v)) {
        v.forEach((row, idx) => {
          if (!row || typeof row !== "object") return;
          const rowName = row.name ? `"${row.name}"` : `row ${idx + 1}`;
          pushDate(row.from, entryName, `${f.label} ${rowName} (from)`);
          pushDate(row.to, entryName, `${f.label} ${rowName} (to)`);
        });
      } else if (f.type === "entry-ref" && f.relationKind === SPOUSE_KIND) {
        const items = Array.isArray(v) ? v : [v];
        items.forEach(it => {
          if (!it || typeof it !== "object") return;
          pushDate(it.marriedOn, entryName, `${f.label} (married)`);
          pushDate(it.endedOn, entryName, `${f.label} (ended)`);
        });
      } else if (f.type === "group" && Array.isArray(v)) {
        v.forEach(inst => visit(f.subfields || [], inst, entryName));
      } else if (f.type === "grid") {
        const g = coerceGridValue(v);
        const rl = Object.fromEntries(g.rows.map(r => [r.id, r.label]));
        const cl = Object.fromEntries(g.cols.map(c => [c.id, c.label]));
        for (const rid of Object.keys(g.cells)) {
          for (const cid of Object.keys(g.cells[rid] || {})) {
            const cell = g.cells[rid][cid];
            if (!cell) continue;
            const loc = `${f.label} [${rl[rid] || "?"} × ${cl[cid] || "?"}]`;
            if (cell.type === "calendar-date") {
              pushDate(cell.value, entryName, loc);
            } else if (cell.type === "calendar-date-range" && cell.value && typeof cell.value === "object") {
              pushDate(cell.value.start, entryName, loc + " (start)");
              pushDate(cell.value.end, entryName, loc + " (end)");
            }
          }
        }
      }
    });
  };
  entries.forEach(e => {
    const tpl = tplById[e.templateId];
    if (!tpl || !e.fields) return;
    visit(tpl.fields, e.fields, e.name);
  });
  if (opts.currentMoment) {
    pushDate(opts.currentMoment, "(world current moment)", "currentMoment");
  }
  return usages;
};

// ─── Marked configuration ──────────────────────────────────────────────────────

marked.use({
  breaks: true,
  gfm: true,
  extensions: [{
    name: "wikiLink",
    level: "inline",
    start(src) { const i = src.indexOf("[["); return i < 0 ? undefined : i; },
    tokenizer(src) {
      const m = src.match(/^\[\[([^\]\n]+)\]\]/);
      if (m) {
        const inner = m[1].trim();
        const pipe = inner.indexOf("|");
        const target = pipe >= 0 ? inner.substring(0, pipe).trim() : inner;
        const display = pipe >= 0 ? inner.substring(pipe + 1).trim() : inner;
        return { type: "wikiLink", raw: m[0], target, display };
      }
    },
    renderer(token) {
      const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return `<a class="wiki-link" data-name="${esc(token.target)}" href="#">${esc(token.display)}</a>`;
    }
  }],
  renderer: {
    image(href, title, text) {
      const safeText = (text || "").replace(/"/g, "&quot;");
      const safeHref = (href || "").replace(/"/g, "&quot;");
      if (!href) return `<span class="md-img md-img-missing">missing image</span>`;
      if (href.startsWith("data:") || href.startsWith("http://") || href.startsWith("https://")) {
        return `<img class="md-img" src="${safeHref}" alt="${safeText}" />`;
      }
      // Folder-relative reference - resolved via FSAA at render time
      return `<img class="md-img md-img-folder" data-filename="${safeHref}" alt="${safeText}" src="data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'/%3E" />`;
    }
  }
});