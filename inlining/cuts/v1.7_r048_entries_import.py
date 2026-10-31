"""
v1.7 r048: Import entries from JSON through the mapping screen, Pipes' tenth
cut.

docs/pipes-spec.md, section 7, with the two details Drak settled at the cut
(2026-10-30, one per message: a, a):

1. Calendars whose names repeat (the open detail section 13 left for the
   import). Each calendar in the file matches one here by its id, then by a
   name only one calendar here has; a name several calendars here share, or
   one none has, starts on the primary and is flagged; and every calendar's
   row on the mapping screen has a picker of the calendars here.
2. What an empty value in the file does to a matched entry: it leaves the
   field as it is, so an import never clears anything; clearing stays a job
   for the entry's page (the export writes an image kept inside the world as
   empty, which a clearing import would wipe). A group or a grid the file
   does hold is replaced whole.

With them, Claude's defaults, said in the plan and not stopped: Import
entries… on a template's page after Export ↓, and in Fabula's Plot Threads
and Themes & Motifs sections after theirs, hidden in Lock mode, opening the
file picker for a .json, a file that isn't an entries file refused with a
word on what it is; the mapping screen, a wide dialog: the file's name, its
count, the template it came from, and whether it holds secret fields; a row
per field in the file, its label and type, with a picker of this template's
fields, preset to the field with its id, then its label, case aside, else
Leave out, a label used twice here or in the file flagged until picked, a
field picked twice flagged, a group matched whole with its subfields by id
then label; Name always used, Tags a row of its own, on; a row per calendar
(call 1); Match existing entries, on, by id then by name, case aside, off
making every row new and flagging a new name an entry here has; and a
preview recounted with each change, new, updated, unchanged, and skipped
rows, references that found no record, and values that didn't read, each
naming its first rows; Import and Cancel, Esc and a click outside
cancelling, the keys and the focus held as the record modals hold them. A
matched row updates only the fields picked, keeps its name, so no [[link]]
changes and a differing name is listed, and keeps its entry's calendar, its
dates moved to the same moments there; a new row takes its mapped calendar
and a new id checked as r039 checks ids; a row with no name, or whose name
two entries of the template share, is skipped and counted; a value reads by
the picked field's type, text between the text-like fields and a Number
into them, a dropdown by its option's text, and a date only where its month
and day exist; references by id, then by name in their template or kind,
then anywhere, a row of the file finding the entry that row makes or
matches; the write after a pinned restore point, Before importing entries,
whose newest three are kept, spouse declarations mirrored as a save mirrors
them; then a notice. The row r047 filed rides along: Fabula's index keeps
Export ↓ in Lock mode, as a template's page does.

Settled in the build, after the calls: a reference the field can't point
at, outside its target list or filter, is counted with the ones that found
no record, since the next load would drop it (migrate's cleanup, which
reads the top-level fields, as this does), and so is one to the entry
itself, at any depth, which the load scrubs; a dependent dropdown's choice
reads only where its parent's choice offers it, and a parent's new choice
isn't written where it would leave the entry's own choice below it without
a place, since the load clears that choice; a multi-select reads only when
every option it names is one of the field's; a color reads as #rrggbb and a
real-world date as YYYY-MM-DD; a spouse's ended date before its married
date is left out; a reference finds a row of the file by the row's id before
anything here, and by the row's name where it names the file's template,
else after every record here; a field that holds one reference takes the
first and counts the rest; a value in a subfield of the file's that matches
none here, which no picker shows, is counted with the values that didn't
read; a matched entry's group isn't replaced, and is
counted, where replacing it whole would lose a value the file can't carry:
one in a subfield the file doesn't have (a secret one left out of the
export, say), or an image kept inside the world, which the export writes as
empty, where the file's row in its place has none; a grid's reference cell
that finds no record, or that names the entry itself, is emptied; an
unchanged row is one whose picked values and tags are the entry's already,
blanks and key order aside; a new row's name an entry anywhere in the world
has is flagged with the switch on as well as off; a label whose one field
here another of the file's fields has by its id starts left out, flagged; a
row's flag shows until its picker is changed; the preview's counts sit
beside the buttons, in sight however far the fields scroll; a file's
calendar is named by the key its entries use, with how many do, and a
calendar here whose name another shares is told apart in the picker by its
first month; Cancel holds the focus when the screen opens, so Enter
cancels; the restore point is a kind of its own,
`pre-entries-import`, among the capped kinds (03_persistence), taken as
rename's is, without waiting on it; the import stays on the page it was
opened from; and the button's tooltip reads "Add or update this template's
entries from an entries file".

- 08_export-layer: the reader and the planner under `Entries import (v1.7
  r048)`, after the entries export: the file read and refused, the picks'
  defaults, a value read by its field's type, references found, dates
  moved, the plan, and the write.
- 29_modals: the mapping screen, `EntriesImportModal`, under a header of its
  own after the rename modal.
- 12_trunk: Import entries… on the template page, the file picked and read,
  the screen's state and mount, the restore point and the write, and
  Fabula's button routed to them.
- 28_fabula/08_threads: Import entries… in a Fabula template's section, and
  Export ↓ kept in Lock mode.
- 03_persistence: `pre-entries-import` among the capped kinds.

Declared scope: 03_persistence, 08_export-layer, 12_trunk,
28_fabula/08_threads, 29_modals.
Declarations added: entriesImportRead, entriesImportNorm, entriesImportKey,
entriesImportEmpty, entriesImportFieldPicks, entriesImportCalendarsHere,
entriesImportCalendarPicks, entriesImportDefaults, entriesImportCalendarOf,
entriesImportOptions, entriesImportDate, entriesImportMoveDate,
entriesImportMoveDates, entriesImportContext, entriesImportFindRef,
entriesImportRefAllowed, entriesImportRefs, entriesImportGroup,
entriesImportGroupLoses, entriesImportGrid, entriesImportValue,
entriesImportSame, entriesImportPlan, entriesImportApply,
EntriesImportModal. None removed. Two headers added: `Entries import (v1.7
r048)` in 08_export-layer and in 29_modals.

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given), and nothing is written unless every anchor in
every file holds. Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r048_entries_import.py
"""
from pathlib import Path

ROOT = next(p for p in Path(__file__).resolve().parents if (p / 'cartulary-src').is_dir())
MODULES = ROOT / "cartulary-src" / "modules"

PLAN = []


def B(s):
    """A block written with its opening newline, which isn't part of it."""
    return s[1:] if s.startswith("\n") else s


def edit(path, steps):
    PLAN.append((path, steps))


def header(title):
    """A section header at column 0, padded to the tree's 82 characters."""
    head = "// " + "─" * 3 + " " + title + " "
    return head + "─" * (82 - len(head))


# ------------------------------------------------------------ 08_export-layer
EXPORT_MODAL_END = B(r'''
          <button className="btn btn-accent entries-export-go" autoFocus onClick={() => onConfirm({ format, includeSecrets: withSecrets })}>Export</button>
        </div>
      </div>
    </div>
  );
}''')

IMPORT_LAYER = header("Entries import (v1.7 r048)") + "\n" + r'''// docs/pipes-spec.md, section 7, with Drak's calls at the cut: Import entries
// on a template reads a file Export entries wrote (r047) and, through the
// mapping screen (EntriesImportModal, 29_modals), adds its rows as entries or
// updates the entries they match. A file's calendar lands on one here by its
// id, then by a name only one calendar here has, a picker on each calendar's
// row changing it (call 1); an empty value leaves a matched entry's field as
// it is, so an import never clears (call 2). These read and plan; App writes
// (12_trunk).

// The file, when it's an entries file this build reads, or the words for one
// that isn't; its lists of fields and calendars kept to their objects.
const entriesImportRead = (text) => {
  let parsed;
  try { parsed = JSON.parse(text); } catch (e) { return { error: "That file isn't JSON, so it isn't an entries file." }; }
  const tail = "Export entries… on a template writes one.";
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { error: `That isn't an entries file. ${tail}` };
  const v = parsed.cartulary_entries_export;
  if (v == null) {
    const what = parsed.cartulary_template_export != null ? "a single-template file"
      : parsed.cartulary_pack_export != null ? "a pack file"
      : parsed.cartulary_calendar_export != null ? "a calendar file"
      : parsed.cartulary_stemma_export != null ? "a stemma file"
      : parsed.cartulary_conlang_export != null ? "a language file"
      : parsed.cartulary_mapstamp_pack != null ? "a stamp pack"
      : ("world" in parsed || "templates" in parsed || "entries" in parsed || "schemaVersion" in parsed) ? "a world file" : null;
    return { error: `${what ? `That's ${what}, not an entries file.` : "That isn't an entries file."} ${tail}` };
  }
  if (v !== 1) return { error: typeof v === "number" && v > 1 ? "That entries file comes from a newer Cartulary than this one." : "That entries file isn't one this Cartulary can read." };
  if (!parsed.template || typeof parsed.template !== "object" || !Array.isArray(parsed.template.fields) || !Array.isArray(parsed.entries)) return { error: "That entries file has no list of fields or of entries." };
  const clean = (fields) => (Array.isArray(fields) ? fields : [])
    .filter(f => f && typeof f === "object" && !Array.isArray(f))
    .map(f => ({ ...f, label: typeof f.label === "string" ? f.label : "", ...(Array.isArray(f.subfields) ? { subfields: clean(f.subfields) } : {}) }));
  return { file: {
    ...parsed,
    template: { ...parsed.template, fields: clean(parsed.template.fields) },
    calendars: (Array.isArray(parsed.calendars) ? parsed.calendars : []).filter(c => c && typeof c === "object" && !Array.isArray(c)),
  } };
};

// A label or a name as matching reads it: trimmed, case aside.
const entriesImportNorm = (s) => (typeof s === "string" ? s.trim().toLowerCase() : "");

// The key a file's field's values are written under: r047's `key`, else the
// label.
const entriesImportKey = (f) => (f && typeof f.key === "string" ? f.key : f && typeof f.label === "string" ? f.label : "");

// A value with nothing in it: none, a blank text, an empty list, or an object
// whose every part is none or blank (an empty range, an empty choice).
const entriesImportEmpty = (v) => v == null
  || (typeof v === "string" && v.trim() === "")
  || (Array.isArray(v) && v.length === 0)
  || (typeof v === "object" && !Array.isArray(v) && Object.values(v).every(x => x == null || (typeof x === "string" && x.trim() === "")));

// Where each of the file's fields lands at first: the field here with its
// id, else the one field here with its label, case aside. A label no field
// here has starts left out; one two fields here share, one the file has
// twice, or one whose field another of the file's fields has by its id
// starts left out and flagged.
const entriesImportFieldPicks = (fields, fileFields) => {
  const list = (Array.isArray(fields) ? fields : []).filter(f => f && f.id);
  const files = Array.isArray(fileFields) ? fileFields : [];
  const count = (xs) => { const m = new Map(); xs.forEach(f => { const k = entriesImportNorm(f && f.label); m.set(k, (m.get(k) || 0) + 1); }); return m; };
  const here = count(list), there = count(files);
  const used = new Set();
  const byId = files.map(ff => {
    const f = ff && ff.id ? list.find(x => x.id === ff.id) : null;
    if (!f || used.has(f.id)) return null;
    used.add(f.id);
    return { pick: f.id, flag: null };
  });
  return byId.map((p, i) => {
    if (p) return p;
    const k = entriesImportNorm(files[i] && files[i].label);
    const n = here.get(k) || 0;
    if (n === 0) return { pick: null, flag: "none" };
    if (n > 1) return { pick: null, flag: "twice-here" };
    if ((there.get(k) || 0) > 1) return { pick: null, flag: "twice-file" };
    const f = list.find(x => entriesImportNorm(x.label) === k);
    if (used.has(f.id)) return { pick: null, flag: "taken" };
    used.add(f.id);
    return { pick: f.id, flag: null };
  });
};

// The calendars here a file's calendar can land on, the primary first, its
// id null.
const entriesImportCalendarsHere = (state) => [
  { id: null, name: (state.world && state.world.calendar && state.world.calendar.name) || "" },
  ...(Array.isArray(state.calendars) ? state.calendars : []).filter(c => c && c.id).map(c => ({ id: c.id, name: c.name || "" })),
];

// Where each of the file's calendars lands at first (call 1): the calendar
// here with its id, else the one calendar here with its name, case aside; a
// name several here share, or none has, starts on the primary, flagged.
const entriesImportCalendarPicks = (state, fileCals) => {
  const here = entriesImportCalendarsHere(state);
  return (Array.isArray(fileCals) ? fileCals : []).map(fc => {
    if (fc && fc.id && here.some(h => h.id === fc.id)) return { pick: fc.id, flag: null };
    const same = here.filter(h => entriesImportNorm(h.name) === entriesImportNorm(fc && fc.name));
    if (same.length === 1) return { pick: same[0].id, flag: null };
    return { pick: null, flag: same.length > 1 ? "shared" : "none" };
  });
};

// The choices the screen starts from: a field here for each of the file's
// fields, a calendar here for each of its calendars, Tags on, matching on.
const entriesImportDefaults = (state, template, file) => ({
  fields: entriesImportFieldPicks(template.fields, file.template.fields).map(p => p.pick),
  calendars: entriesImportCalendarPicks(state, file.calendars).map(p => p.pick),
  tags: true,
  match: true,
});

// Which of the file's calendars a row is on: its calendar null names the
// primary of the world the file came from, a text a calendar's key or name;
// -1 for one the file doesn't list.
const entriesImportCalendarOf = (file, entry) => {
  const cals = Array.isArray(file.calendars) ? file.calendars : [];
  const c = entry ? entry.calendar : null;
  return c == null ? cals.findIndex(x => x && x.id == null) : cals.findIndex(x => x && (typeof x.key === "string" ? x.key : x.name) === c);
};

// A dropdown's options: its own, a dependent dropdown's under every parent's
// choice, and Other where the field keeps an Other text.
const entriesImportOptions = (field) => {
  const own = Array.isArray(field.options) ? field.options : [];
  const by = field.optionsByParent && typeof field.optionsByParent === "object" ? Object.values(field.optionsByParent).flat() : [];
  return [...own, ...by, ...(field.otherTextField ? ["Other"] : [])].filter(o => typeof o === "string");
};

// A date as a calendar here reads it: whole numbers, a month the calendar
// has, a day that month has; null otherwise.
const entriesImportDate = (d, cal) => {
  if (!d || typeof d !== "object" || !cal || !Array.isArray(cal.months)) return null;
  const { year, monthIndex, day } = d;
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || !Number.isInteger(day)) return null;
  const m = cal.months[monthIndex];
  if (!m || day < 1 || day > (m.days || 0)) return null;
  return d.approximate ? { year, monthIndex, day, approximate: true } : { year, monthIndex, day };
};

// A date moved to the same moment in another calendar.
const entriesImportMoveDate = (d, from, to) => {
  if (!d || d.year == null || from === to) return d;
  const abs = calendarDateToAbsoluteDay(from, d);
  const t = abs == null ? null : absoluteDayToCalendarDate(to, abs);
  return t ? { ...d, year: t.year, monthIndex: t.monthIndex, day: t.day } : d;
};

// A value's dates moved to the same moments in another calendar, by its
// field's type, through a group's rows and a grid's cells.
const entriesImportMoveDates = (field, v, from, to) => {
  if (v == null || from === to) return v;
  const mv = (d) => (d ? entriesImportMoveDate(d, from, to) : d);
  switch (field.type) {
    case "calendar-date": return mv(v);
    case "calendar-date-range": return { ...v, start: mv(v.start), end: mv(v.end) };
    case "name-history": return Array.isArray(v) ? v.map(h => (h ? { ...h, from: mv(h.from), to: mv(h.to) } : h)) : v;
    case "entry-ref": {
      if (!field.relationKind) return v;
      const one = (it) => (it && typeof it === "object" ? { ...it, ...(it.marriedOn ? { marriedOn: mv(it.marriedOn) } : {}), ...(it.endedOn ? { endedOn: mv(it.endedOn) } : {}) } : it);
      return Array.isArray(v) ? v.map(one) : one(v);
    }
    case "group": return Array.isArray(v) ? v.map(row => {
      const out = { ...row };
      (field.subfields || []).forEach(sf => { if (out[sf.id] != null) out[sf.id] = entriesImportMoveDates(sf, out[sf.id], from, to); });
      return out;
    }) : v;
    case "grid": {
      const g = JSON.parse(JSON.stringify(v));
      Object.values(g.cells || {}).forEach(row => Object.values(row || {}).forEach(cell => {
        if (!cell || cell.value == null) return;
        if (cell.type === "calendar-date") cell.value = mv(cell.value);
        else if (cell.type === "calendar-date-range") cell.value = { ...cell.value, start: mv(cell.value.start), end: mv(cell.value.end) };
      }));
      return g;
    }
    default: return v;
  }
};

// What finding a reference's record takes: the entries here by id, by name,
// and by name in each template, the other records by id, by name, and by name
// of each kind, each name's first in the world's order, and the file's rows
// by their ids and names with the entry each makes or matches.
const entriesImportContext = (state, template, file, rowTargets, rowNames, newIds) => {
  const tplName = {}, tplById = {};
  (state.templates || []).forEach(t => { if (t && t.id) { tplName[t.id] = t.name || ""; tplById[t.id] = t; } });
  const entryById = {}, byName = new Map(), byTplName = new Map();
  (state.entries || []).forEach(e => {
    if (!e || !e.id) return;
    entryById[e.id] = e;
    const n = entriesImportNorm(e.name);
    if (!byName.has(n)) byName.set(n, e.id);
    const k = JSON.stringify([entriesImportNorm(tplName[e.templateId]), n]);
    if (!byTplName.has(k)) byTplName.set(k, e.id);
  });
  const nodeById = registeredNodeIndex(state);
  const nodeByName = new Map(), nodeByKindName = new Map();
  Object.values(nodeById).forEach(nd => {
    const n = entriesImportNorm(nd.name);
    const src = getRegisteredSourceById(nd.templateId);
    const k = JSON.stringify([entriesImportNorm(src ? src.name : ""), n]);
    if (!nodeByName.has(n)) nodeByName.set(n, nd.id);
    if (!nodeByKindName.has(k)) nodeByKindName.set(k, nd.id);
  });
  return {
    entryById, byName, byTplName, nodeById, nodeByName, nodeByKindName, tplById,
    fileTemplate: entriesImportNorm(file.template && file.template.name), rowTargets, rowNames, newIds,
    templateId: template.id, unresolved: [], unread: [],
  };
};

// The record a reference names, r047's { name, template, id } or { name,
// kind, id } or a bare id or name: the entry a row of the file with its id
// makes or matches, a record here with its id, then by name: a row of the
// file's where it names the file's template, then in its template or kind,
// anywhere here, and among the file's rows; null when none has it.
const entriesImportFindRef = (ref, ctx) => {
  const obj = ref && typeof ref === "object" ? ref : null;
  const id = typeof ref === "string" ? ref : obj && typeof obj.id === "string" ? obj.id : "";
  if (id && ctx.rowTargets.has(id)) return ctx.rowTargets.get(id);
  if (id && (ctx.entryById[id] || ctx.nodeById[id])) return id;
  const name = entriesImportNorm(typeof ref === "string" ? ref : obj ? obj.name : "");
  if (!name) return null;
  if (obj && typeof obj.template === "string") {
    if (ctx.fileTemplate && entriesImportNorm(obj.template) === ctx.fileTemplate && ctx.rowNames.has(name)) return ctx.rowNames.get(name);
    const hit = ctx.byTplName.get(JSON.stringify([entriesImportNorm(obj.template), name]));
    if (hit) return hit;
  }
  if (obj && typeof obj.kind === "string") { const hit = ctx.nodeByKindName.get(JSON.stringify([entriesImportNorm(obj.kind), name])); if (hit) return hit; }
  return ctx.byName.get(name) || ctx.nodeByName.get(name) || ctx.rowNames.get(name) || null;
};

// Whether a field can hold a reference to a record, by the rule a load keeps
// (migrate's cleanup): a field with a target list or filters takes an entry
// of a template on the list that passes its filter, or another record whose
// kind is on the list; any other field takes any record. An entry the import
// makes is of the import's template; its filter isn't checked, since its
// values are still being read.
const entriesImportRefAllowed = (field, id, ctx) => {
  if (!Array.isArray(field.refTemplatesId) && !field.refFilters) return true;
  const made = ctx.newIds.has(id);
  const target = made ? { templateId: ctx.templateId, fields: {} } : ctx.entryById[id];
  if (!target) {
    const node = ctx.nodeById[id];
    if (!node) return false;
    const allowed = Array.isArray(field.refTemplatesId) && field.refTemplatesId.length > 0 ? field.refTemplatesId : (field.refTemplateId ? [field.refTemplateId] : []);
    return allowed.includes(node.templateId);
  }
  if (Array.isArray(field.refTemplatesId) && field.refTemplatesId.length > 0 && !field.refTemplatesId.includes(target.templateId)) return false;
  if (field.refFilters && !made) {
    const t = ctx.tplById[target.templateId];
    if (!t) return false;
    const cfg = field.refFilters[t.name];
    if (cfg && cfg.fieldId && Array.isArray(cfg.allowedValues) && !cfg.allowedValues.includes(selectValueOnly(target.fields && target.fields[cfg.fieldId]))) return false;
  }
  return true;
};

// A reference field's value from the file's: each reference found, one that
// finds nothing, one to the entry itself, or, in a top-level field, one the
// field can't point at counted in ctx.unresolved; a relation keeping its own
// keys, its dates read in `cal`; a field that holds one reference taking the
// first.
const entriesImportRefs = (field, v, cal, ctx, where) => {
  const list = Array.isArray(v) ? v : [v];
  const out = [];
  list.forEach(ref => {
    if (entriesImportEmpty(ref)) return;
    const name = typeof ref === "string" ? ref : ref && typeof ref.name === "string" ? ref.name : "";
    const id = entriesImportFindRef(ref, ctx);
    if (!id) { ctx.unresolved.push({ row: where.row, field: where.field, name, why: "none" }); return; }
    if (id === where.self) { ctx.unresolved.push({ row: where.row, field: where.field, name, why: "self" }); return; }
    if (where.top && !entriesImportRefAllowed(field, id, ctx)) { ctx.unresolved.push({ row: where.row, field: where.field, name, why: "barred" }); return; }
    if (!field.relationKind) { out.push(id); return; }
    const item = { id };
    if (ref && typeof ref === "object") {
      Object.keys(ref).forEach(k => { if (!["name", "template", "kind", "id"].includes(k) && ref[k] != null) item[k] = ref[k]; });
      ["marriedOn", "endedOn"].forEach(k => {
        if (item[k] == null) return;
        const d = entriesImportDate(item[k], cal);
        if (d) item[k] = d;
        else { delete item[k]; ctx.unread.push({ row: where.row, field: where.field, why: `its ${k === "marriedOn" ? "married" : "ended"} date for "${name}" isn't a date in ${cal && cal.name ? cal.name : "its calendar"}` }); }
      });
      if (item.marriedOn && item.endedOn && cmpCalendarDates(item.endedOn, item.marriedOn) < 0) {
        delete item.endedOn;
        ctx.unread.push({ row: where.row, field: where.field, why: `its ended date for "${name}" comes before its married date` });
      }
    }
    out.push(item);
  });
  if (!out.length) return { ok: false, why: null };
  if (field.multi) return { ok: true, value: out };
  if (out.length > 1) ctx.unread.push({ row: where.row, field: where.field, why: `it holds one reference, so ${out.length - 1} more ${out.length === 2 ? "was" : "were"} left out` });
  return { ok: true, value: out[0] };
};

// A group's rows from the file's, in their places, each row's subfields
// matched to the file's as fields are, by id then label, a value in one
// that matches none counted; a matched entry's rows are replaced whole
// (call 2). `carried` is every subfield the file fills, at any depth.
const entriesImportGroup = (ff, field, v, cal, ctx, where) => {
  if (!ff || ff.type !== "group" || !Array.isArray(v)) return { ok: false, why: "it isn't a group's rows" };
  const subs = (Array.isArray(field.subfields) ? field.subfields : []).filter(s => s && s.id);
  const fileSubs = Array.isArray(ff.subfields) ? ff.subfields : [];
  const picks = entriesImportFieldPicks(subs, fileSubs);
  const pairs = fileSubs.map((fs, i) => ({ fs, key: entriesImportKey(fs), sub: subs.find(s => s.id === picks[i].pick), flag: picks[i].flag }));
  if (!pairs.some(p => p.sub)) return { ok: false, why: "none of its subfields matches one here" };
  const carried = new Set(pairs.filter(p => p.sub).map(p => p.sub.id));
  const lost = {
    none: "no subfield here has its label",
    "twice-here": "two subfields here have its label",
    "twice-file": "the file has its label twice",
    taken: "the subfield here with its label is matched to another by its id",
  };
  const rows = v.map(row => {
    const out = {};
    pairs.forEach(p => {
      const x = row && typeof row === "object" ? row[p.key] : null;
      if (entriesImportEmpty(x)) return;
      if (!p.sub) { ctx.unread.push({ row: where.row, field: `${where.field} › ${p.fs.label}`, why: `${lost[p.flag] || "it matches no subfield here"}, so it's left out` }); return; }
      const w = { ...where, field: `${where.field} › ${p.sub.label}`, top: false };
      const got = entriesImportValue(p.fs, p.sub, x, cal, ctx, w);
      if (!got.ok) { if (got.why) ctx.unread.push({ row: w.row, field: w.field, why: got.why }); return; }
      out[p.sub.id] = got.value;
      if (got.carried) got.carried.forEach(id => carried.add(id));
    });
    return out;
  });
  return { ok: true, value: rows, carried };
};

// Whether replacing a group whole would lose a value the file can't carry:
// one in a subfield the file doesn't fill, or an image kept inside the
// world, which the export writes as empty, where the file's row in its
// place holds none; at any depth.
const entriesImportGroupLoses = (field, rows, carried, fileRows) => (Array.isArray(rows) ? rows : []).some((row, k) => {
  if (!row || typeof row !== "object") return false;
  const there = Array.isArray(fileRows) && fileRows[k] && typeof fileRows[k] === "object" ? fileRows[k] : {};
  return (field.subfields || []).some(sf => {
    const v = sf ? row[sf.id] : null;
    if (!sf || entriesImportEmpty(v)) return false;
    if (!carried.has(sf.id)) return true;
    if (sf.type === "image" && typeof v === "string" && v.startsWith("data:") && entriesImportEmpty(there[sf.id])) return true;
    return sf.type === "group" && entriesImportGroupLoses(sf, v, carried, there[sf.id]);
  });
});

// A grid from the file's, in the shape a load keeps (coerceGridValue), each
// reference cell's record found, and a cell whose record isn't, or that
// names the entry itself, emptied.
const entriesImportGrid = (field, v, ctx, where) => {
  if (!v || typeof v !== "object" || Array.isArray(v) || !Array.isArray(v.rows) || !Array.isArray(v.cols)) return { ok: false, why: "it isn't a grid" };
  const g = JSON.parse(JSON.stringify(v));
  Object.keys(g.cells && typeof g.cells === "object" ? g.cells : {}).forEach(rid => {
    const row = g.cells[rid];
    if (!row || typeof row !== "object") return;
    Object.keys(row).forEach(cid => {
      const cell = row[cid];
      if (!cell || cell.type !== "entry-ref" || entriesImportEmpty(cell.value)) return;
      const name = typeof cell.value === "string" ? cell.value : cell.value.name || "";
      const id = entriesImportFindRef(cell.value, ctx);
      if (id && id !== where.self) { cell.value = id; return; }
      ctx.unresolved.push({ row: where.row, field: where.field, name, why: id ? "self" : "none" });
      cell.value = "";
    });
  });
  return { ok: true, value: coerceGridValue(g) };
};

// A file's value as a field here reads it, or why it doesn't: the value the
// export writes for the field's type, a text between the text-like types and
// a number into one, a dropdown's option by its text, a date in `cal` whose
// month and day it has, and references found by entriesImportFindRef.
const entriesImportValue = (ff, field, v, cal, ctx, where) => {
  const ok = (value) => ({ ok: true, value });
  const no = (why) => ({ ok: false, why });
  const calName = cal && cal.name ? cal.name : "its calendar";
  switch (field.type) {
    case "text": case "textarea": case "longform": case "url":
      if (typeof v === "string") return ok(v);
      if (typeof v === "number" && Number.isFinite(v)) return ok(String(v));
      if (v && typeof v === "object" && !Array.isArray(v) && typeof v.value === "string") return ok(formatSelectDisplay(v));
      return no("it isn't text");
    case "image":
      return typeof v === "string" ? ok(v) : no("it isn't an image's file name");
    case "color":
      return typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v.trim()) ? ok(v.trim()) : no("it isn't a color written as #rrggbb");
    case "date":
      return typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v.trim()) ? ok(v.trim()) : no("it isn't a date written as YYYY-MM-DD");
    case "number":
      if (typeof v === "number" && Number.isFinite(v)) return ok(String(v));
      return typeof v === "string" && fieldNumberValue(v) != null ? ok(v.trim()) : no("it isn't a number");
    case "tags":
      if (typeof v === "string") return ok(v);
      if (Array.isArray(v) && v.every(x => typeof x === "string")) return ok(v.map(x => x.trim()).filter(Boolean).join(", "));
      return no("it isn't a list of tags");
    case "select": {
      const pick = typeof v === "string" ? v : v && typeof v === "object" && typeof v.value === "string" ? v.value : null;
      if (pick == null) return no("it isn't an option");
      if (!entriesImportOptions(field).includes(pick)) return no(`"${pick}" isn't one of its options`);
      if (!field.otherTextField) return ok(pick);
      return ok({ value: pick, customText: pick === "Other" && v && typeof v === "object" && typeof v.customText === "string" ? v.customText : "" });
    }
    case "multiselect": {
      if (!Array.isArray(v) || !v.every(x => typeof x === "string")) return no("it isn't a list of options");
      const opts = entriesImportOptions(field);
      const bad = v.filter(x => !opts.includes(x));
      if (bad.length) return no(`${bad.map(x => `"${x}"`).join(", ")} ${bad.length === 1 ? "isn't one of its options" : "aren't among its options"}`);
      return ok([...v]);
    }
    case "calendar-date": {
      const d = entriesImportDate(v, cal);
      return d ? ok(d) : no(`it isn't a date in ${calName}`);
    }
    case "calendar-date-range": {
      if (!v || typeof v !== "object" || Array.isArray(v)) return no("it isn't a range");
      const s = v.start == null ? null : entriesImportDate(v.start, cal);
      const e = v.end == null ? null : entriesImportDate(v.end, cal);
      if ((v.start != null && !s) || (v.end != null && !e) || (!s && !e)) return no(`it isn't a range of dates in ${calName}`);
      return ok({ start: s, end: e });
    }
    case "name-history": {
      if (!Array.isArray(v)) return no("it isn't a list of names");
      const rows = [];
      for (const it of v) {
        if (!it || typeof it.name !== "string" || !it.name.trim()) continue;
        const from = it.from == null ? null : entriesImportDate(it.from, cal);
        const to = it.to == null ? null : entriesImportDate(it.to, cal);
        if ((it.from != null && !from) || (it.to != null && !to)) return no(`a date in it isn't one in ${calName}`);
        rows.push({ name: it.name.trim(), from, to });
      }
      return rows.length ? ok(rows) : no(null);
    }
    case "entry-ref": return entriesImportRefs(field, v, cal, ctx, where);
    case "group": return entriesImportGroup(ff, field, v, cal, ctx, where);
    case "grid": return entriesImportGrid(field, v, ctx, where);
    default: return no("it isn't a value this field keeps");
  }
};

// Two values the same for the preview's count: a blank part (none, a blank
// text, an empty list) as good as a missing one, keys in any order.
const entriesImportSame = (a, b) => {
  const canon = (x) => {
    if (Array.isArray(x)) return x.map(canon);
    if (x && typeof x === "object") {
      const o = {};
      Object.keys(x).sort().forEach(k => { const c = canon(x[k]); if (!entriesImportEmpty(c)) o[k] = c; });
      return o;
    }
    return x;
  };
  const ca = canon(a), cb = canon(b);
  return JSON.stringify(entriesImportEmpty(ca) ? null : ca) === JSON.stringify(entriesImportEmpty(cb) ? null : cb);
};

// The import the screen previews and App writes: each row of the file new,
// an update, unchanged, or skipped (no name, a name two entries of the
// template share, or an entry another row matched first), with the fields it
// writes, and what the preview counts. A matched row keeps its entry's name
// and calendar, its dates moved to the same moments there; an empty value
// leaves the field (call 2). choices as entriesImportDefaults makes them.
const entriesImportPlan = (state, template, file, choices) => {
  const tplFields = (template.fields || []).filter(f => f && f.id);
  const fileFields = Array.isArray(file.template.fields) ? file.template.fields : [];
  const pairs = fileFields.map((ff, i) => ({ ff, key: entriesImportKey(ff), field: tplFields.find(f => f.id === choices.fields[i]) || null })).filter(p => p.field);
  const picked = pairs.map(p => p.field.id);
  const doubled = [...new Set(picked.filter((id, i) => picked.indexOf(id) !== i))];
  const all = state.entries || [];
  const mine = all.filter(e => e && e.templateId === template.id);
  const mineById = new Map(mine.map(e => [e.id, e]));
  const mineByName = new Map();
  mine.forEach(e => { const k = entriesImportNorm(e.name); mineByName.set(k, [...(mineByName.get(k) || []), e]); });
  const ids = new Set(all.map(e => e && e.id));
  const claimed = new Set();
  const rows = [], rowTargets = new Map(), rowNames = new Map();
  (Array.isArray(file.entries) ? file.entries : []).forEach((r, i) => {
    const name = r && typeof r.name === "string" ? r.name.trim() : "";
    const row = { i, name, fileId: r && typeof r.id === "string" ? r.id : null };
    if (!name) { rows.push({ ...row, action: "skip", why: "no name" }); return; }
    let hit = null;
    if (choices.match) {
      if (row.fileId && mineById.has(row.fileId)) hit = mineById.get(row.fileId);
      else {
        const same = mineByName.get(entriesImportNorm(name)) || [];
        if (same.length > 1) { rows.push({ ...row, action: "skip", why: "shared", n: same.length }); return; }
        hit = same[0] || null;
      }
      if (hit && claimed.has(hit.id)) { rows.push({ ...row, action: "skip", why: "claimed" }); return; }
    }
    let entryId;
    if (hit) { claimed.add(hit.id); entryId = hit.id; rows.push({ ...row, action: "match", entryId, byId: row.fileId === hit.id }); }
    else { entryId = freshNameId("ent", name, ids); ids.add(entryId); rows.push({ ...row, action: "new", entryId }); }
    if (row.fileId && !rowTargets.has(row.fileId)) rowTargets.set(row.fileId, entryId);
    if (!rowNames.has(entriesImportNorm(name))) rowNames.set(entriesImportNorm(name), entryId);
  });
  const ctx = entriesImportContext(state, template, file, rowTargets, rowNames, new Set(rows.filter(r => r.action === "new").map(r => r.entryId)));
  const taken = new Set(all.map(e => entriesImportNorm(e && e.name)));
  const kept = [], takenNames = [];
  rows.forEach(row => {
    if (row.action === "skip") return;
    const r = file.entries[row.i] || {};
    const ci = entriesImportCalendarOf(file, r);
    const calId = ci >= 0 && choices.calendars[ci] != null ? choices.calendars[ci] : null;
    const fileCal = getCalendar(state, calId);
    const entry = row.action === "match" ? mineById.get(row.entryId) : null;
    const entryCal = entry ? getCalendar(state, entry.calendarId) : fileCal;
    const fields = {};
    pairs.forEach(p => {
      const v = r.fields && typeof r.fields === "object" ? r.fields[p.key] : undefined;
      if (entriesImportEmpty(v)) return;
      const where = { row: row.name, field: p.field.label, self: row.entryId, top: true };
      const got = entriesImportValue(p.ff, p.field, v, fileCal, ctx, where);
      if (!got.ok) { if (got.why) ctx.unread.push({ row: where.row, field: where.field, why: got.why }); return; }
      if (entry && p.field.type === "group" && entriesImportGroupLoses(p.field, (entry.fields || {})[p.field.id], got.carried, got.value)) {
        ctx.unread.push({ row: where.row, field: where.field, why: "the file leaves out a value this entry's group holds (a subfield it doesn't have, or an image kept inside the world), so the group stays as it is" });
        return;
      }
      fields[p.field.id] = entryCal !== fileCal ? entriesImportMoveDates(p.field, got.value, fileCal, entryCal) : got.value;
    });
    // A dependent dropdown's choice reads where its parent's choice offers
    // it, as a load keeps it (migrate's cleanup), and a parent's new choice
    // isn't written where it would leave the entry's own choice below it
    // without a place, since the load would clear that choice (call 2).
    const val = (id) => selectValueOnly(id in fields ? fields[id] : entry && entry.fields ? entry.fields[id] : null);
    for (let again = true; again;) {
      again = false;
      tplFields.forEach(f => {
        if (f.type !== "select" || !f.dependsOn || !(f.id in fields || f.dependsOn in fields)) return;
        const own = val(f.id), parent = val(f.dependsOn);
        if (!own || (parent && (((f.optionsByParent || {})[parent]) || []).includes(own))) return;
        const pf = tplFields.find(x => x.id === f.dependsOn);
        const pl = pf ? pf.label : "its parent";
        if (f.id in fields) {
          ctx.unread.push({ row: row.name, field: f.label, why: parent ? `"${own}" isn't offered under ${pl}'s "${parent}"` : `it needs a choice in ${pl} first` });
          delete fields[f.id];
        } else {
          ctx.unread.push({ row: row.name, field: pl, why: `"${parent}" doesn't offer ${f.label}'s "${own}", which the file leaves as it is` });
          delete fields[f.dependsOn];
        }
        again = true;
      });
    }
    const tags = choices.tags && Array.isArray(r.tags) ? r.tags.filter(t => typeof t === "string" && t.trim()).map(t => t.trim()) : [];
    row.fields = fields;
    row.tags = tags.length ? tags : null;
    if (entry) {
      const changed = Object.keys(fields).some(id => !entriesImportSame(fields[id], (entry.fields || {})[id])) || (row.tags && !entriesImportSame(row.tags, entry.tags || []));
      row.action = changed ? "update" : "unchanged";
      if ((entry.name || "").trim() !== row.name) kept.push({ name: entry.name || "", fileName: row.name });
    } else {
      row.calendarId = calId;
      const k = entriesImportNorm(row.name);
      if (taken.has(k)) takenNames.push(row.name);
      taken.add(k);
    }
  });
  const counts = { new: 0, update: 0, unchanged: 0, skip: 0 };
  rows.forEach(r => { counts[r.action] = (counts[r.action] || 0) + 1; });
  return { rows, counts, doubled, unresolved: ctx.unresolved, unread: ctx.unread, kept, taken: takenNames };
};

// The world with a plan written: each update's fields merged into its
// entry's, its tags replaced where the file has some, each new entry added
// after the others in the file's order, then each spouse declaration that
// came or went mirrored onto its partner, as a save mirrors it
// (computeSpouseReciprocity).
const entriesImportApply = (s, template, plan) => {
  const now = isoNow();
  const tpl = (s.templates || []).find(t => t && t.id === template.id) || template;
  const byId = new Map((s.entries || []).map(e => [e.id, e]));
  const order = (s.entries || []).map(e => e.id);
  const before = new Map();
  plan.rows.forEach(r => {
    if (r.action === "update") {
      const e = byId.get(r.entryId);
      if (!e) return;
      before.set(e.id, e.fields || {});
      byId.set(e.id, { ...e, fields: { ...(e.fields || {}), ...r.fields }, ...(r.tags ? { tags: r.tags } : {}), updatedAt: now });
    } else if (r.action === "new") {
      before.set(r.entryId, {});
      byId.set(r.entryId, { id: r.entryId, templateId: template.id, name: r.name, calendarId: r.calendarId || null, fields: r.fields || {}, tags: r.tags || [], createdAt: now, updatedAt: now });
      order.push(r.entryId);
    }
  });
  before.forEach((prev, id) => {
    const e = byId.get(id);
    const partners = new Set([...getSpouseDeclMap(tpl, prev).keys(), ...getSpouseDeclMap(tpl, e.fields).keys()]);
    if (!partners.size) return;
    const near = [...partners].map(p => byId.get(p)).filter(Boolean);
    computeSpouseReciprocity(id, prev, e.fields, tpl, near, s.templates || []).forEach((fields, pid) => {
      const p = byId.get(pid);
      if (p) byId.set(pid, { ...p, fields, updatedAt: now });
    });
  });
  return { ...s, entries: order.map(id => byId.get(id)) };
};'''

edit(MODULES / "08_export-layer.jsx", [
    (EXPORT_MODAL_END, EXPORT_MODAL_END + "\n\n" + IMPORT_LAYER),
])


# ------------------------------------------------------------------ 29_modals
RENAME_MODAL_END = B(r'''
          {!p.taken && <button className="btn btn-accent record-rename-update" onClick={() => done(true)} autoFocus>Rename and update links</button>}
        </div>
      </div>
    </div>
  );
}''')

IMPORT_MODAL = header("Entries import (v1.7 r048)") + "\n" + r'''// docs/pipes-spec.md, section 7, with Drak's calls at the cut: the mapping
// screen Import entries opens on a file entriesImportRead has read. Each of
// the file's fields picks a field here, each of its calendars a calendar
// here (call 1), Tags and the matching switch start on, and the preview
// says what entriesImportPlan makes of the choices, its counts beside the
// buttons, where they stay in sight; Import hands the plan to App, which
// writes it. A row's flag shows until its picker is changed, and a name two
// calendars here share is told apart in their picker by the first month.
// Esc and a click outside cancel; while it's open the keys are its own and
// the focus stays in it, as the record modals'.

function EntriesImportModal({ state, template, fileName, file, onCancel, onConfirm }) {
  const [choices, setChoices] = useState(() => entriesImportDefaults(state, template, file));
  const [touched, setTouched] = useState({});
  const box = useRef(null);
  const cancel = useRef(onCancel);
  cancel.current = onCancel;
  useEffect(() => {
    const onKey = (e) => {
      e.stopPropagation();
      if (e.key === "Escape") { e.preventDefault(); cancel.current(); }
      else modalTabCycle(e, box.current);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);
  const fieldFlags = useMemo(() => entriesImportFieldPicks(template.fields, file.template.fields), [template, file]);
  const calFlags = useMemo(() => entriesImportCalendarPicks(state, file.calendars), [state, file]);
  const plan = useMemo(() => entriesImportPlan(state, template, file, choices), [state, template, file, choices]);
  const calRows = useMemo(() => file.calendars.map((_, i) => file.entries.filter(r => entriesImportCalendarOf(file, r) === i).length), [file]);
  const here = (template.fields || []).filter(f => f && f.id);
  const calsHere = entriesImportCalendarsHere(state);
  const typeName = (t) => (FIELD_TYPES.find(x => x.value === t) || {}).label || t || "";
  // A calendar here as its picker names it: a name two calendars here share
  // told apart by its first month.
  const calLabel = (h) => {
    const same = calsHere.filter(x => entriesImportNorm(x.name) === entriesImportNorm(h.name));
    const cal = same.length > 1 ? getCalendar(state, h.id) : null;
    const first = cal && Array.isArray(cal.months) && cal.months[0] && cal.months[0].name;
    const apart = same.length < 2 ? "" : first ? `, first month ${first}` : `, ${same.indexOf(h) + 1} of ${same.length}`;
    return `${h.name || "(no name)"}${h.id == null ? " (primary)" : ""}${apart}`;
  };
  const setField = (i, id) => {
    setTouched(t => ({ ...t, [`f${i}`]: true }));
    setChoices(c => ({ ...c, fields: c.fields.map((x, j) => (j === i ? (id || null) : x)) }));
  };
  const setCal = (i, id) => {
    setTouched(t => ({ ...t, [`c${i}`]: true }));
    setChoices(c => ({ ...c, calendars: c.calendars.map((x, j) => (j === i ? (id || null) : x)) }));
  };
  const doubled = new Set(plan.doubled);
  const c = plan.counts;
  const n = file.entries.length;
  const canImport = plan.doubled.length === 0 && c.new + c.update > 0;
  const skipped = plan.rows.filter(r => r.action === "skip");
  const notes = !canImport || skipped.length + plan.unresolved.length + plan.unread.length + plan.kept.length + plan.taken.length > 0;
  const dim ={ color: "var(--text-dim)", fontSize: "calc(13px * var(--font-scale))" };
  const warn = { ...dim, color: "var(--warn)" };
  const row = { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10, alignItems: "center", padding: "5px 0", borderBottom: "1px solid var(--border2)" };
  const flagText = {
    "twice-here": "Two fields here have this label; pick one.",
    "twice-file": "The file has this label twice; pick its field.",
    taken: "The field here with this label is matched to another of the file's fields by its id.",
    none: "No field here has this label.",
  };
  const calFlagText = {
    shared: "Several calendars here have this name. Until you pick one, the primary reads its dates and takes its new entries.",
    none: "No calendar here has this name. Until you pick one, the primary reads its dates and takes its new entries.",
  };
  const few = (cls, title, items) => (items.length ? (
    <div className={`entries-import-note ${cls}`} style={{ marginTop: 6 }}>
      <span style={{ fontWeight: 600 }}>{title}</span> {items.slice(0, 5).join("; ")}{items.length > 5 ? `; and ${items.length - 5} more` : ""}.
    </div>
  ) : null);
  const skipWhy = (r) => (r.why === "no name" ? `row ${r.i + 1} has no name` : r.why === "shared" ? `"${r.name}", whose name ${r.n} entries here share` : `"${r.name}", whose entry another row matched first`);
  const refWhy = { none: "", self: " (the entry itself)", barred: " (not one this field can point at)" };
  const fromTpl = file.template && typeof file.template.name === "string" && file.template.name ? ` from "${file.template.name}"` : "";
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal modal-wide entries-import" ref={box} role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">Import entries into "{template.name || "Untitled"}"</div>
        <div className="modal-body">
          <p className="entries-import-file" style={{ margin: "0 0 14px", overflowWrap: "anywhere" }}>
            {fileName}: {n === 1 ? "1 entry" : `${n} entries`}{fromTpl}. {file.secrets === true ? "It holds secret fields." : "It holds no secret fields."}
          </p>
          <div className="modal-section-hdr">Fields</div>
          <div className="entries-import-fields" style={{ marginBottom: 14 }}>
            <div className="entries-import-name" style={row}><div>Entry name</div><div style={dim}>Always used: it names new entries and, with matching on, finds existing ones.</div></div>
            {file.template.fields.map((ff, i) => {
              const pick = choices.fields[i] || null;
              const target = here.find(f => f.id === pick);
              const flag = fieldFlags[i] && fieldFlags[i].flag;
              const note = pick
                ? (doubled.has(pick) ? { t: "Picked for another of the file's fields too.", w: true }
                  : target && target.type !== ff.type ? { t: `${typeName(ff.type)} into ${typeName(target.type)}: values read as this field's type.`, w: false } : null)
                : flag && !touched[`f${i}`] ? { t: flagText[flag], w: flag !== "none" } : null;
              return (
                <div key={i} className="entries-import-field" style={row}>
                  <div style={{ minWidth: 0, overflowWrap: "anywhere" }}>{ff.label} <span style={dim}>{typeName(ff.type)}{ff.secret ? ", secret" : ""}</span></div>
                  <select className="input" value={pick || ""} aria-label={`The field for ${ff.label}`} onChange={e => setField(i, e.target.value)}>
                    <option value="">Leave out</option>
                    {here.map(f => <option key={f.id} value={f.id}>{f.label} ({typeName(f.type)})</option>)}
                  </select>
                  {note && <div className="entries-import-field-note" style={{ gridColumn: "1 / -1", ...(note.w ? warn : dim) }}>{note.t}</div>}
                </div>
              );
            })}
            <label style={{ ...row, display: "flex", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" className="entries-import-tags" checked={choices.tags} onChange={e => setChoices(x => ({ ...x, tags: e.target.checked }))} />
              <span>Bring the file's tags (where a row has some, they replace a matched entry's)</span>
            </label>
          </div>
          {file.calendars.length > 0 && <>
            <div className="modal-section-hdr">Calendars</div>
            <div className="entries-import-calendars" style={{ marginBottom: 14 }}>
              {file.calendars.map((fc, i) => {
                const pick = choices.calendars[i] == null ? "" : choices.calendars[i];
                const flag = calFlags[i] && calFlags[i].flag;
                return (
                  <div key={i} className="entries-import-calendar" style={row}>
                    <div style={{ minWidth: 0, overflowWrap: "anywhere" }}>{typeof fc.key === "string" ? fc.key : typeof fc.name === "string" && fc.name ? fc.name : "(no name)"} <span style={dim}>{fc.id == null ? "the file's primary, " : ""}{calRows[i] === 1 ? "1 entry" : `${calRows[i]} entries`}</span></div>
                    <select className="input" value={pick} aria-label={`The calendar for ${typeof fc.name === "string" && fc.name ? fc.name : "this calendar"}`} onChange={e => setCal(i, e.target.value)}>
                      {calsHere.map(h => <option key={h.id || ""} value={h.id || ""}>{calLabel(h)}</option>)}
                    </select>
                    {flag && !touched[`c${i}`] && <div className="entries-import-calendar-note" style={{ gridColumn: "1 / -1", ...warn }}>{calFlagText[flag]}</div>}
                  </div>
                );
              })}
            </div>
          </>}
          <div className="modal-section-hdr">Rows</div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" className="entries-import-match" checked={choices.match} onChange={e => setChoices(x => ({ ...x, match: e.target.checked }))} />
              <span>Match existing entries, by id, then by name</span>
            </label>
            <div className="entries-import-match-about" style={{ ...dim, marginTop: 4 }}>
              {choices.match ? "A row updates this template's entry with its id, else the one with its name, case aside." : "Every row makes a new entry."}
            </div>
          </div>
          {notes && <div className="modal-section-hdr">Preview</div>}
          <div className="entries-import-preview">
            {few("entries-import-skipped", "Skipped:", skipped.map(skipWhy))}
            {few("entries-import-unresolved", "References that found no record:", plan.unresolved.map(u => `${u.row}'s ${u.field}, "${u.name}"${refWhy[u.why] || ""}`))}
            {few("entries-import-unread", "Values that didn't read:", plan.unread.map(u => `${u.row}'s ${u.field}: ${u.why}`))}
            {few("entries-import-kept", "Matched, keeping their names:", plan.kept.map(k => `"${k.name}", which the file calls "${k.fileName}"`))}
            {few("entries-import-taken", "New entries taking a name an entry here has:", plan.taken.map(t => `"${t}"`))}
            {plan.doubled.length > 0 && <div className="entries-import-doubled" style={{ ...warn, marginTop: 6 }}>A field here is picked for two of the file's fields; pick one for each before importing.</div>}
            {plan.doubled.length === 0 && !canImport && <div className="entries-import-nothing" style={{ ...dim, marginTop: 6 }}>Nothing to import: no row makes or changes an entry.</div>}
          </div>
        </div>
        <div className="modal-actions">
          <div className="entries-import-counts" style={{ ...dim, marginRight: "auto", alignSelf: "center" }}>{c.new} new · {c.update} updated · {c.unchanged} unchanged · {c.skip} skipped</div>
          <button className="btn btn-ghost" onClick={onCancel} autoFocus>Cancel</button>
          <button className="btn btn-accent entries-import-go" disabled={!canImport} onClick={() => onConfirm(plan)}>Import</button>
        </div>
      </div>
    </div>
  );
}'''

edit(MODULES / "29_modals.jsx", [
    (RENAME_MODAL_END, RENAME_MODAL_END + "\n\n" + IMPORT_MODAL),
])


# ------------------------------------------------------------------ 12_trunk
edit(MODULES / "12_trunk.jsx", [
    # The screen's state: the template, the file's name, and the file.
    ("  const [entriesExport, setEntriesExport] = useState(null);  // v1.7 r047: the entries export dialog's template, by id\n",
     "  const [entriesExport, setEntriesExport] = useState(null);  // v1.7 r047: the entries export dialog's template, by id\n"
     "  const [entriesImport, setEntriesImport] = useState(null);  // v1.7 r048: the mapping screen, { templateId, fileName, file }\n"
     "  const entriesImportFileRef = useRef(null);  // v1.7 r048: Import entries…'s file picker\n"
     "  const entriesImportFor = useRef(null);  // v1.7 r048: the template the picker was opened for, by id\n"),
    # Pick a file, read it, write the plan.
    ("  // Import (Bug 9 + 10: distinguish version-too-new from shape-invalid; validate)\n"
     "  const importWorld = (file) => {\n",
     "  // v1.7 r048: Import entries (docs/pipes-spec.md, section 7). The picker\n"
     "  // opens for a template, the file is read (entriesImportRead) and refused\n"
     "  // with a word on what it is, or the mapping screen opens on it; its plan\n"
     "  // is written after a pinned restore point, Before importing entries, a\n"
     "  // kind of its own whose newest three are kept, taken as rename's is,\n"
     "  // without waiting on it. Not in Lock mode.\n"
     "  const pickEntriesFile = (tplId) => {\n"
     "    if (isLocked || !tplId) return;\n"
     "    entriesImportFor.current = tplId;\n"
     "    if (entriesImportFileRef.current) entriesImportFileRef.current.click();\n"
     "  };\n"
     "  const readEntriesFile = (f) => {\n"
     "    const tplId = entriesImportFor.current;\n"
     "    if (!f || !tplId || isLocked) return;\n"
     "    const reader = new FileReader();\n"
     "    reader.onload = () => {\n"
     "      const got = entriesImportRead(String(reader.result));\n"
     "      if (got.error) { flash(got.error, \"error\"); return; }\n"
     "      setEntriesImport({ templateId: tplId, fileName: f.name, file: got.file });\n"
     "    };\n"
     "    reader.onerror = () => flash(\"Couldn't read that file.\", \"error\");\n"
     "    reader.readAsText(f);\n"
     "  };\n"
     "  const finishEntriesImport = (tpl, plan) => {\n"
     "    setEntriesImport(null);\n"
     "    if (isLocked || !tpl || !plan) return;\n"
     "    snapshotCreate({ state, trigger: \"manual\", pinned: true, kind: \"pre-entries-import\", label: \"Before importing entries\" })\n"
     "      .catch(e => console.error(\"Before importing entries snapshot failed:\", e));\n"
     "    updateState(s => entriesImportApply(s, tpl, plan));\n"
     "    flash(`Imported into \"${tpl.name || \"Untitled\"}\": ${plan.counts.new} new, ${plan.counts.update} updated.`);\n"
     "  };\n"
     "\n"
     "  // Import (Bug 9 + 10: distinguish version-too-new from shape-invalid; validate)\n"
     "  const importWorld = (file) => {\n"),
    # Import entries… on the template's page, after Export ↓.
    ("                {activeTemplate && !activeList && !isLocked && <button className=\"btn btn-ghost\" onClick={openEditTemplate}>Edit Template</button>}\n",
     "                {activeTemplate && !activeList && !isLocked && <button className=\"btn btn-ghost entries-import-btn\" onClick={() => pickEntriesFile(activeTemplate.id)} title=\"Add or update this template's entries from an entries file\">Import entries…</button>}\n"
     "                {activeTemplate && !activeList && !isLocked && <button className=\"btn btn-ghost\" onClick={openEditTemplate}>Edit Template</button>}\n"),
    # Fabula's Import entries… opens the same picker.
    ("                onExportTemplate: (tpl, fmt) => (fmt === \"entries\" ? setEntriesExport(tpl.id) : fmt === \"md\" ? exportTemplateMarkdown(tpl) : exportTemplateJson(tpl)),\n",
     "                onExportTemplate: (tpl, fmt) => (fmt === \"entries\" ? setEntriesExport(tpl.id) : fmt === \"md\" ? exportTemplateMarkdown(tpl) : exportTemplateJson(tpl)),\n"
     "                onImportEntries: (tpl) => pickEntriesFile(tpl.id),\n"),
    # The screen, and the picker it opens from.
    ("              flash(`Exported ${n === 1 ? \"1 entry\" : `${n} entries`} of \"${tpl.name}\" as ${options.format === \"csv\" ? \"CSV\" : \"JSON\"}${options.includeSecrets ? \", secret fields included\" : \"\"}.`);\n"
     "            }}\n"
     "          />\n"
     "        );\n"
     "      })()}\n",
     "              flash(`Exported ${n === 1 ? \"1 entry\" : `${n} entries`} of \"${tpl.name}\" as ${options.format === \"csv\" ? \"CSV\" : \"JSON\"}${options.includeSecrets ? \", secret fields included\" : \"\"}.`);\n"
     "            }}\n"
     "          />\n"
     "        );\n"
     "      })()}\n"
     "\n"
     "      <input\n"
     "        ref={entriesImportFileRef}\n"
     "        type=\"file\"\n"
     "        accept=\".json,application/json\"\n"
     "        className=\"hidden-file-input entries-import-file-input\"\n"
     "        onChange={(e) => {\n"
     "          const f = e.target.files?.[0];\n"
     "          if (f) readEntriesFile(f);\n"
     "          e.target.value = \"\";\n"
     "        }}\n"
     "      />\n"
     "      {entriesImport && !isLocked && (() => {\n"
     "        const tpl = state.templates.find(t => t && t.id === entriesImport.templateId);\n"
     "        if (!tpl) return null;\n"
     "        return (\n"
     "          <EntriesImportModal\n"
     "            state={state}\n"
     "            template={tpl}\n"
     "            fileName={entriesImport.fileName}\n"
     "            file={entriesImport.file}\n"
     "            onCancel={() => setEntriesImport(null)}\n"
     "            onConfirm={(plan) => finishEntriesImport(tpl, plan)}\n"
     "          />\n"
     "        );\n"
     "      })()}\n"),
])


# ------------------------------------------------------- 28_fabula/08_threads
edit(MODULES / "28_fabula" / "08_threads.jsx", [
    ("// entry. A world without the template says so and offers Restore, and in Lock\n"
     "// Mode no button shows.\n"
     "function FabulaTemplateSection({ state, role, isLocked, focus, onFocused, onOpenEntry, onNewEntry, onEditTemplate, onExportTemplate, onRestoreTemplate }) {\n",
     "// entry. A world without the template says so and offers Restore, and in Lock\n"
     "// Mode only Export ↓ shows, as on a template's page (since v1.7's r048, which\n"
     "// added Import entries…).\n"
     "function FabulaTemplateSection({ state, role, isLocked, focus, onFocused, onOpenEntry, onNewEntry, onEditTemplate, onExportTemplate, onImportEntries, onRestoreTemplate }) {\n"),
    ("        {!isLocked && tpl && (\n"
     "          <div style={{ display: \"flex\", gap: 6, flexWrap: \"wrap\", alignItems: \"baseline\" }}>\n",
     "        {tpl && (\n"
     "          <div style={{ display: \"flex\", gap: 6, flexWrap: \"wrap\", alignItems: \"baseline\" }}>\n"),
    ("            <button className=\"btn btn-ghost\" style={small} onClick={() => onEditTemplate(tpl)}>Edit Template</button>\n"
     "            <button className=\"btn\" style={small} onClick={() => onNewEntry(tpl)}>+ New Entry</button>\n",
     "            {!isLocked && onImportEntries && <button className=\"btn btn-ghost entries-import-btn\" style={small} onClick={() => onImportEntries(tpl)} title=\"Add or update this template's entries from an entries file\">Import entries…</button>}\n"
     "            {!isLocked && <button className=\"btn btn-ghost\" style={small} onClick={() => onEditTemplate(tpl)}>Edit Template</button>}\n"
     "            {!isLocked && <button className=\"btn\" style={small} onClick={() => onNewEntry(tpl)}>+ New Entry</button>}\n"),
])


# ------------------------------------------------------------ 03_persistence
edit(MODULES / "03_persistence.jsx", [
    ("// an import or a reset no longer clears the pinned snapshots. Since r044 so\n"
     "// does the one a rename that updates [[links]] keeps first, Before rename.\n"
     "const SNAPSHOT_KIND_CAP = 3;\n"
     "const SNAPSHOT_CAPPED_KINDS = [\"pre-restore\", \"pre-import\", \"pre-reset\", \"pre-rename\"];\n",
     "// an import or a reset no longer clears the pinned snapshots. Since r044 so\n"
     "// does the one a rename that updates [[links]] keeps first, Before rename,\n"
     "// and since r048 the one an entries import keeps, Before importing entries.\n"
     "const SNAPSHOT_KIND_CAP = 3;\n"
     "const SNAPSHOT_CAPPED_KINDS = [\"pre-restore\", \"pre-import\", \"pre-reset\", \"pre-rename\", \"pre-entries-import\"];\n"),
    ("//     kind: null|'pre-restore'|'pre-import'|'pre-reset'|'pre-rename', sizeBytes: number,\n",
     "//     kind: null|'pre-restore'|'pre-import'|'pre-reset'|'pre-rename'|'pre-entries-import', sizeBytes: number,\n"),
])


def main():
    staged = []
    for path, steps in PLAN:
        text = path.read_text(encoding="utf-8")
        for step in steps:
            old, new = step[0], step[1]
            count = step[2] if len(step) > 2 else 1
            n = text.count(old)
            assert n == count, f"{path.name}: anchor occurs {n} times, not {count}:\n{old[:300]}"
            text = text.replace(old, new)
        if chr(0xFEFF) in text:
            raise SystemExit(f"{path.name}: a byte-order mark would be written")
        staged.append((path, text))
    for path, text in staged:
        path.write_text(text, encoding="utf-8")
    print(f"r048 applied to {len(staged)} files")


if __name__ == "__main__":
    main()
