"""
v1.7 r049: Import entries from CSV through the same screen, Pipes' eleventh
cut.

docs/pipes-spec.md, section 7, with the three details Drak settled at the
cut (2026-10-31, one per message: b, a, a), the three section 13 left for
r049, where r047 wrote the CSV for a reader rather than a parser:

1. A date read back from a cell. As its calendar writes it, in the
   calendar's own order, the month by its name or its abbreviation, case
   aside, "~" before an approximate one and the era's short name after it,
   as the export writes them; or as numbers, year-month-day, the month
   counted from 1 ("1203-2-4").
2. A dropdown's Other, which the CSV writes as its text alone. On a
   dropdown that keeps an Other text, a cell that names none of its options
   reads as Other with that text, and the preview lists it; on one that
   doesn't, it's counted with the values that didn't read.
3. Two calendars that share a name, which the Calendar column writes alike.
   A matched row whose Calendar cell names its entry's calendar reads its
   dates in that calendar; a new row takes the calendar picked for its
   cell's name.

With them, Claude's defaults, said in the plan and not stopped: Import
entries… takes a .csv beside a .json, and the same screen opens on it; d3's
parser reads it (`csvParseRows`, so a repeated header keeps its columns),
at semicolons where those split the header into more cells than commas do;
a byte-order mark is dropped, and the file's bytes are read as UTF-8, or as
Windows-1252 where they aren't UTF-8, as a spreadsheet may save them; the
header's first id, Name, Tags, and Calendar columns, case aside, are read
as the export writes them, and any other column, a later Name among them,
is a field; a CSV with no Name column is refused, and a blank row is left
out; each column's row on the screen shows its header and its first value,
with a picker of this template's fields but its groups and grids, a Date
Range's two halves picked apart, preset to the field whose label is the
header, case aside, a "Label · start" or "Label · end" header to that
range's half, and where several columns and as many fields share a header,
the columns take the fields in order; a cell reads by the picked field's
type, several values split at ";", options by their text, case aside, and
references by name, among the field's targets first; a Name History keeps
the dates of the names it had, and a relation the details of the partners
it had; the Calendar column's names are the screen's calendars, case aside,
a blank cell its own row on the primary; the Tags box shows only where the
file has a Tags column. The roadmap row r048's read filed rides along: a
dependent dropdown inside a group's row reads only where the row's parent
choice offers it, as the save and the load keep it.

Settled in the build, after the calls: an era after a date must be the one
its year falls in; a blank Calendar cell names the primary for call 3, as
the export writes it; a cell read as Other is listed only where the import
writes it, changing the entry's value, and not where a dependent dropdown's
rule then leaves it out; a range's half merges with the half the entry has,
and only the half from the file is moved to the entry's calendar; a value
the cell names twice is kept once; a Tag List whose tags are the entry's,
however its commas are spaced, is unchanged and isn't written; a column
with neither a header nor a value is left out; a skipped row is numbered as
a spreadsheet numbers it, the header row 1; and the screen's words for a
CSV: its name, its count of entries and of columns; "the Name column" in
the Entry name row; a column's header and its first value, on one line, in
quotes, or "empty"; a blank Calendar cell's row "Blank", or "Every row"
where the file has no Calendar column; and the preview's list "Read as
Other, with their text:".

- 08_export-layer: the reader, the picks, a date and a value read from a
  cell's text, and a reference found by name, under `Entries import from
  CSV (v1.7 r049)`, after the entries import; the plan reading a CSV's
  columns, call 3, and the group's dependent dropdowns.
- 29_modals: the mapping screen's rows for a CSV.
- 12_trunk: the picker taking a .csv, the bytes decoded, and a .csv read
  as one.

Declared scope: 08_export-layer, 12_trunk, 29_modals.
Declarations added: entriesImportReadCsv, entriesImportCsvPicks,
entriesImportDateText, entriesImportTagList, entriesImportFindByName,
entriesImportText. None removed. One header added: `Entries import from CSV
(v1.7 r049)` in 08_export-layer.

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given), and nothing is written unless every anchor in
every file holds. Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r049_csv_import.py
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
APPLY_END = B(r'''
  return { ...s, entries: order.map(id => byId.get(id)) };
};''')

CSV_LAYER = header("Entries import from CSV (v1.7 r049)") + "\n" + r'''// docs/pipes-spec.md, section 7, with Drak's calls at the cut: Import entries
// reads a CSV through the same mapping screen, one Export entries wrote
// (r047) or a spreadsheet's own, into the shape of an entries file whose
// columns are fields of a type of their own, "csv", their cells read as
// text by the picked field's type. A date reads as its calendar writes it,
// or as year-month-day numbers (call 1); a dropdown that keeps an Other text
// reads a cell naming none of its options as Other with that text, listed,
// and one that doesn't counts it as a value that didn't read (call 2); and a
// matched row whose Calendar cell names its entry's calendar reads its dates
// there (call 3, in entriesImportPlan).

// A CSV as an entries file, or the words for one this can't read: d3's
// parser, the rows split at commas, or at semicolons where those split the
// header into more cells, a blank row left out and each row numbered as a
// spreadsheet numbers it, the header row 1. The header's first id, Name,
// Tags, and Calendar, case aside, are read as the export writes them; any
// other column is a field keyed by its place, with its first value, on one
// line, as a sample, a "Label · start" or "Label · end" header naming a
// range's half, and one with neither a header nor a value left out. Its
// calendars are the Calendar column's names, case aside, after a blank one,
// the file's primary, where a row has a blank cell.
const entriesImportReadCsv = (text) => {
  const body = String(text == null ? "" : text);
  const line = (/^[^\r\n]*\S[^\r\n]*/m.exec(body) || [""])[0];
  const semi = d3.dsvFormat(";");
  const recs = ((semi.parseRows(line)[0] || []).length > (d3.csvParseRows(line)[0] || []).length ? semi.parseRows(body) : d3.csvParseRows(body))
    .map((r, k) => ({ r, n: k + 1 })).filter(x => x.r.some(c => typeof c === "string" && c.trim()));
  if (!recs.length) return { error: "That CSV is empty." };
  const head = recs[0].r.map(c => (typeof c === "string" ? c.trim() : ""));
  const lines = recs.slice(1);
  const first = (name) => head.findIndex(h => entriesImportNorm(h) === name);
  const at = { id: first("id"), name: first("name"), tags: first("tags"), calendar: first("calendar") };
  if (at.name < 0) return { error: "That CSV has no Name column, so its rows can't name entries." };
  const fixed = new Set(Object.values(at).filter(i => i >= 0));
  const cell = (r, i) => (i >= 0 && typeof r[i] === "string" ? r[i] : "");
  const fields = [];
  head.forEach((h, i) => {
    if (fixed.has(i)) return;
    const hit = lines.find(x => cell(x.r, i).trim());
    if (!h && !hit) return;
    const half = /^(.*\S) · (start|end)$/i.exec(h);
    fields.push({ label: h, key: `c${i}`, type: "csv", col: i, base: half ? half[1] : h, side: half ? half[2].toLowerCase() : null, sample: hit ? cell(hit.r, i).replace(/\s+/g, " ").trim() : "" });
  });
  const calendars = [], calKey = new Map();
  const entries = lines.map(({ r, n }) => {
    const c = cell(r, at.calendar).trim();
    if (c && !calKey.has(entriesImportNorm(c))) { calKey.set(entriesImportNorm(c), c); calendars.push({ name: c, key: c, id: `csv:${c}` }); }
    const values = {};
    fields.forEach(f => { values[f.key] = cell(r, f.col); });
    return { row: n, id: cell(r, at.id).trim() || null, name: cell(r, at.name), tags: cell(r, at.tags).split(";").map(x => x.trim()).filter(Boolean), calendar: c ? calKey.get(entriesImportNorm(c)) : null, fields: values };
  });
  if (entries.some(e => e.calendar == null)) calendars.unshift({ name: "", id: null, blank: true });
  return { file: { csv: true, columns: fixed.size + fields.length, tagsColumn: at.tags >= 0, calendarColumn: at.calendar >= 0, template: { name: "", fields }, calendars, entries } };
};

// Where each of a CSV's columns lands at first: the field here whose label
// is its header, case aside, never a group or a grid; a "Label · start" or
// "Label · end" header the half of the range with that label, and a plain
// header naming a range its start. Where several columns and as many fields
// here share a header, the columns take the fields in order. A header no
// field here has starts left out; one more or fewer fields here share than
// columns do, or whose field another column already has, starts left out,
// flagged. A range's half is picked as "start:" or "end:" before its id.
const entriesImportCsvPicks = (fields, fileFields) => {
  const list = (Array.isArray(fields) ? fields : []).filter(f => f && f.id && f.type !== "group" && f.type !== "grid");
  const cols = Array.isArray(fileFields) ? fileFields : [];
  const ranges = (c) => (c.side ? list.filter(f => f.type === "calendar-date-range" && entriesImportNorm(f.label) === entriesImportNorm(c.base)) : []);
  const used = new Set();
  return cols.map(c => {
    const halves = ranges(c);
    const mine = halves.length ? halves : list.filter(f => entriesImportNorm(f.label) === entriesImportNorm(c.label));
    const peers = cols.filter(x => entriesImportNorm(x.label) === entriesImportNorm(c.label));
    if (!mine.length) return { pick: null, flag: "none" };
    if (mine.length !== peers.length) return { pick: null, flag: mine.length > 1 ? "twice-here" : "twice-file" };
    const f = mine[peers.indexOf(c)];
    const side = f.type !== "calendar-date-range" ? null : halves.length ? c.side : "start";
    const key = side ? `${side}:${f.id}` : f.id;
    if (used.has(key)) return { pick: null, flag: "taken" };
    used.add(key);
    return { pick: key, flag: null };
  });
};

// A date as a CSV's cell writes it, in `cal` (call 1): in the calendar's
// own order, the month by its name or its abbreviation, case aside, commas
// anywhere; or as numbers, year-month-day, the month counted from 1. A "~"
// before it marks it approximate, and an era's short name after it must be
// the era its year falls in. null for anything else, or for a month or a
// day the calendar doesn't have.
const entriesImportDateText = (text, cal) => {
  if (typeof text !== "string" || !cal || !Array.isArray(cal.months)) return null;
  let t = text.trim();
  const approximate = t.startsWith("~");
  if (approximate) t = t.slice(1);
  t = t.trim().replace(/\s+/g, " ");
  let era = null;
  const eras = (Array.isArray(cal.eras) ? cal.eras : []).filter(e => e && typeof e.shortName === "string" && e.shortName.trim())
    .sort((a, b) => b.shortName.trim().length - a.shortName.trim().length);
  for (const e of eras) {
    const tail = ` ${e.shortName.trim().toLowerCase()}`;
    if (t.toLowerCase().endsWith(tail)) { era = e; t = t.slice(0, t.length - tail.length); break; }
  }
  t = t.replace(/,/g, " ").replace(/\s+/g, " ").trim();
  let d = null;
  const nums = /^(-?\d+)-(\d+)-(\d+)$/.exec(t);
  if (nums) d = { year: Number(nums[1]), monthIndex: Number(nums[2]) - 1, day: Number(nums[3]) };
  else {
    const fmt = cal.dateFormat;
    const m = (fmt === "name-month" ? /^(.+) (\d+) (-?\d+)$/ : fmt === "abbr-year-pad" ? /^(-?\d+) (.+) (\d+)$/ : /^(\d+) (.+) (-?\d+)$/).exec(t);
    if (!m) return null;
    const [word, day, year] = fmt === "name-month" ? [m[1], m[2], m[3]] : fmt === "abbr-year-pad" ? [m[2], m[3], m[1]] : [m[2], m[1], m[3]];
    const w = entriesImportNorm(word);
    let mi = cal.months.findIndex((mo, i) => entriesImportNorm(mo && mo.name ? mo.name : `Month ${i + 1}`) === w);
    if (mi < 0) mi = cal.months.findIndex((mo, i) => entriesImportNorm(mo && mo.abbreviation ? mo.abbreviation : mo && mo.name ? deriveMonthAbbreviation(mo.name) : `M${i + 1}`) === w);
    if (mi < 0) return null;
    d = { year: Number(year), monthIndex: mi, day: Number(day) };
  }
  if (era) {
    const at = findEra(d.year, cal.eras);
    if (!at || entriesImportNorm(at.shortName) !== entriesImportNorm(era.shortName)) return null;
  }
  return entriesImportDate(approximate ? { ...d, approximate: true } : d, cal);
};

// A Tag List's value as its tags: the text the field keeps ("a, b") split
// at its commas, or a list, each trimmed, the empty ones dropped.
const entriesImportTagList = (v) => (typeof v === "string" ? v.split(",") : Array.isArray(v) ? v : [])
  .map(x => (typeof x === "string" ? x.trim() : "")).filter(Boolean);

// The record a CSV's reference names: among the field's targets first, in
// their order, where a target that's this template finds the file's rows
// before its entries; then anywhere here, then among the file's rows. null
// when none has the name.
const entriesImportFindByName = (field, name, ctx) => {
  const n = entriesImportNorm(name);
  if (!n) return null;
  const targets = Array.isArray(field.refTemplatesId) && field.refTemplatesId.length > 0 ? field.refTemplatesId : field.refTemplateId ? [field.refTemplateId] : [];
  for (const t of targets) {
    if (t === ctx.templateId && ctx.rowNames.has(n)) return ctx.rowNames.get(n);
    const hit = ctx.bySourceName.get(JSON.stringify([t, n]));
    if (hit) return hit;
  }
  return ctx.byName.get(n) || ctx.nodeByName.get(n) || ctx.rowNames.get(n) || null;
};

// A CSV's cell as a field here reads its text, or why it doesn't: text as
// typed; an image's file name, a color as #rrggbb, a real-world date as
// YYYY-MM-DD, and a Number as a number, trimmed; a Tag List's, a
// Multi-select's, a reference field's, and a Name History's values split at
// ";"; a dropdown's option by its text, case aside, else Other with the
// text where the field keeps an Other text, listed in ctx.others (call 2);
// a date, or a range's half, as entriesImportDateText reads it in `cal`
// (call 1); a reference by its record's name (entriesImportFindByName),
// counted as entriesImportRefs counts one. `old` is the matched entry's
// value: its Name History keeps the dates of the names the cell names, and
// its relation the details of the partners the cell names.
const entriesImportText = (field, text, cal, ctx, where, old) => {
  const ok = (value) => ({ ok: true, value });
  const no = (why) => ({ ok: false, why });
  const t = String(text).trim();
  const parts = t.split(";").map(x => x.trim()).filter(Boolean);
  const calName = cal && cal.name ? cal.name : "its calendar";
  const opt = (x) => {
    const opts = entriesImportOptions(field);
    return opts.includes(x) ? x : opts.find(o => entriesImportNorm(o) === entriesImportNorm(x));
  };
  switch (field.type) {
    case "text": case "textarea": case "longform": case "url":
      return ok(String(text));
    case "image":
      return ok(t);
    case "color":
      return /^#[0-9a-f]{6}$/i.test(t) ? ok(t) : no(`"${t}" isn't a color written as #rrggbb`);
    case "date":
      return /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(t) ? ok(t) : no(`"${t}" isn't a date written as YYYY-MM-DD`);
    case "number":
      return fieldNumberValue(t) != null ? ok(t) : no(`"${t}" isn't a number`);
    case "tags":
      return parts.length ? ok(parts.join(", ")) : no(null);
    case "select": {
      const o = opt(t);
      if (o != null) return ok(field.otherTextField ? { value: o, customText: "" } : o);
      if (!field.otherTextField) return no(`"${t}" isn't one of its options`);
      ctx.others.push({ row: where.row, field: where.field, id: where.id, text: t });
      return ok({ value: "Other", customText: t });
    }
    case "multiselect": {
      const got = parts.map(opt);
      const bad = parts.filter((x, k) => got[k] == null);
      if (bad.length) return no(`${bad.map(x => `"${x}"`).join(", ")} ${bad.length === 1 ? "isn't one of its options" : "aren't among its options"}`);
      return got.length ? ok([...new Set(got)]) : no(null);
    }
    case "calendar-date": case "calendar-date-range": {
      const d = entriesImportDateText(t, cal);
      return d ? ok(d) : no(`"${t}" isn't a date in ${calName}`);
    }
    case "name-history": {
      const had = Array.isArray(old) ? old.filter(h => h && typeof h.name === "string") : [];
      const rows = [];
      parts.forEach(name => {
        if (rows.some(h => entriesImportNorm(h.name) === entriesImportNorm(name))) return;
        const h = had.find(x => entriesImportNorm(x.name) === entriesImportNorm(name));
        rows.push({ name, from: h && h.from ? h.from : null, to: h && h.to ? h.to : null });
      });
      return rows.length ? ok(rows) : no(null);
    }
    case "entry-ref": {
      const had = field.relationKind ? getRelationValues(old, field.multi) : [];
      const out = [];
      parts.forEach(name => {
        const id = entriesImportFindByName(field, name, ctx);
        const why = !id ? "none" : id === where.self ? "self" : !entriesImportRefAllowed(field, id, ctx) ? "barred" : null;
        if (why) { ctx.unresolved.push({ row: where.row, field: where.field, name, why }); return; }
        if (out.some(x => (field.relationKind ? x.id : x) === id)) return;
        const it = had.find(x => x.id === id);
        out.push(!field.relationKind ? id : it ? JSON.parse(JSON.stringify(it)) : { id });
      });
      if (!out.length) return no(null);
      if (field.multi) return ok(out);
      if (out.length > 1) ctx.unread.push({ row: where.row, field: where.field, why: `it holds one reference, so ${out.length - 1} more ${out.length === 2 ? "was" : "were"} left out` });
      return ok(out[0]);
    }
    default:
      return no("a CSV's cell can't hold this field's value");
  }
};'''

edit(MODULES / "08_export-layer.jsx", [
    # A CSV's blank Calendar cell starts on the primary, unflagged.
    (B('''
// name several here share, or none has, starts on the primary, flagged.
const entriesImportCalendarPicks = (state, fileCals) => {
  const here = entriesImportCalendarsHere(state);
  return (Array.isArray(fileCals) ? fileCals : []).map(fc => {
    if (fc && fc.id && here.some(h => h.id === fc.id)) return { pick: fc.id, flag: null };
'''), B('''
// name several here share, or none has, starts on the primary, flagged. A
// CSV's blank Calendar cell starts on the primary, unflagged (r049).
const entriesImportCalendarPicks = (state, fileCals) => {
  const here = entriesImportCalendarsHere(state);
  return (Array.isArray(fileCals) ? fileCals : []).map(fc => {
    if (fc && fc.blank) return { pick: null, flag: null };
    if (fc && fc.id && here.some(h => h.id === fc.id)) return { pick: fc.id, flag: null };
''')),
    # A CSV's columns pick their fields by entriesImportCsvPicks.
    (B('''
// The choices the screen starts from: a field here for each of the file's
// fields, a calendar here for each of its calendars, Tags on, matching on.
const entriesImportDefaults = (state, template, file) => ({
  fields: entriesImportFieldPicks(template.fields, file.template.fields).map(p => p.pick),
'''), B('''
// The choices the screen starts from: a field here for each of the file's
// fields, or a CSV's columns (r049), a calendar here for each of its
// calendars, Tags on, matching on.
const entriesImportDefaults = (state, template, file) => ({
  fields: (file.csv ? entriesImportCsvPicks : entriesImportFieldPicks)(template.fields, file.template.fields).map(p => p.pick),
''')),
    # The context finds a record by name under its template's or kind's id,
    # and holds the cells read as Other.
    (B('''
// What finding a reference's record takes: the entries here by id, by name,
// and by name in each template, the other records by id, by name, and by name
// of each kind, each name's first in the world's order, and the file's rows
// by their ids and names with the entry each makes or matches.
'''), B('''
// What finding a reference's record takes: the entries here by id, by name,
// and by name in each template, the other records by id, by name, and by name
// of each kind, every record by name under its template's or kind's id
// (r049), each name's first in the world's order, and the file's rows by
// their ids and names with the entry each makes or matches.
''')),
    ("  const entryById = {}, byName = new Map(), byTplName = new Map();\n",
     "  const entryById = {}, byName = new Map(), byTplName = new Map(), bySourceName = new Map();\n"),
    (B('''
    if (!byTplName.has(k)) byTplName.set(k, e.id);
  });
'''), B('''
    if (!byTplName.has(k)) byTplName.set(k, e.id);
    const s = JSON.stringify([e.templateId, n]);
    if (!bySourceName.has(s)) bySourceName.set(s, e.id);
  });
''')),
    (B('''
    if (!nodeByKindName.has(k)) nodeByKindName.set(k, nd.id);
  });
'''), B('''
    if (!nodeByKindName.has(k)) nodeByKindName.set(k, nd.id);
    const s = JSON.stringify([nd.templateId, n]);
    if (!bySourceName.has(s)) bySourceName.set(s, nd.id);
  });
''')),
    ("    entryById, byName, byTplName, nodeById, nodeByName, nodeByKindName, tplById,\n",
     "    entryById, byName, byTplName, bySourceName, nodeById, nodeByName, nodeByKindName, tplById,\n"),
    ("    templateId: template.id, unresolved: [], unread: [],\n  };\n",
     "    templateId: template.id, unresolved: [], unread: [], others: [],\n  };\n"),
    # The roadmap row r048's read filed: a group's dependent dropdowns.
    (B('''
// A group's rows from the file's, in their places, each row's subfields
// matched to the file's as fields are, by id then label, a value in one
// that matches none counted; a matched entry's rows are replaced whole
// (call 2). `carried` is every subfield the file fills, at any depth.
'''), B('''
// A group's rows from the file's, in their places, each row's subfields
// matched to the file's as fields are, by id then label, a value in one
// that matches none counted, and a dependent dropdown's choice read only
// where its row's parent choice offers it, as the save and the load keep it
// (r049); a matched entry's rows are replaced whole (call 2). `carried` is
// every subfield the file fills, at any depth.
''')),
    (B('''
      out[p.sub.id] = got.value;
      if (got.carried) got.carried.forEach(id => carried.add(id));
    });
    return out;
  });
'''), B('''
      out[p.sub.id] = got.value;
      if (got.carried) got.carried.forEach(id => carried.add(id));
    });
    for (let again = true; again;) {
      again = false;
      subs.forEach(sf => {
        if (sf.type !== "select" || !sf.dependsOn || !(sf.id in out)) return;
        const own = selectValueOnly(out[sf.id]), parent = selectValueOnly(out[sf.dependsOn]);
        if (!own || (parent && (((sf.optionsByParent || {})[parent]) || []).includes(own))) return;
        const ps = subs.find(x => x.id === sf.dependsOn);
        const pl = ps ? ps.label : "its parent";
        ctx.unread.push({ row: where.row, field: `${where.field} › ${sf.label}`, why: parent ? `"${own}" isn't offered under ${pl}'s "${parent}"` : `it needs a choice in ${pl} first` });
        delete out[sf.id];
        again = true;
      });
    }
    return out;
  });
''')),
    # The plan reads a CSV's columns, and call 3.
    (B('''
// leaves the field (call 2). choices as entriesImportDefaults makes them.
const entriesImportPlan = (state, template, file, choices) => {
'''), B('''
// leaves the field (call 2). choices as entriesImportDefaults makes them.
// A CSV (r049) reads each cell's text by the picked field's type
// (entriesImportText), a range's halves in columns of their own, and a
// matched row whose Calendar cell names its entry's calendar reads its
// dates there (call 3).
const entriesImportPlan = (state, template, file, choices) => {
''')),
    (B('''
  const pairs = fileFields.map((ff, i) => ({ ff, key: entriesImportKey(ff), field: tplFields.find(f => f.id === choices.fields[i]) || null })).filter(p => p.field);
  const picked = pairs.map(p => p.field.id);
'''), B('''
  const pairs = file.csv
    ? fileFields.map((ff, i) => {
        const half = /^(start|end):(.*)$/.exec(choices.fields[i] || "");
        const field = tplFields.find(f => f.id === (half ? half[2] : choices.fields[i])) || null;
        return { ff, key: ff.key, field, side: field && field.type === "calendar-date-range" ? (half ? half[1] : "start") : null };
      }).filter(p => p.field && p.field.type !== "group" && p.field.type !== "grid")
    : fileFields.map((ff, i) => ({ ff, key: entriesImportKey(ff), field: tplFields.find(f => f.id === choices.fields[i]) || null })).filter(p => p.field);
  const picked = pairs.map(p => (p.side ? `${p.side}:${p.field.id}` : p.field.id));
''')),
    (B('''
    const fileCal = getCalendar(state, calId);
    const entry = row.action === "match" ? mineById.get(row.entryId) : null;
    const entryCal = entry ? getCalendar(state, entry.calendarId) : fileCal;
'''), B('''
    const entry = row.action === "match" ? mineById.get(row.entryId) : null;
    const ownCal = entry ? getCalendar(state, entry.calendarId) : null;
    // A CSV's matched row whose Calendar cell names its entry's calendar, a
    // blank cell naming the primary, reads its dates there (call 3), since
    // the column writes two calendars that share a name alike.
    const named = !!(file.csv && ownCal && (r.calendar == null ? ownCal === getCalendar(state, null) : entriesImportNorm(ownCal.name) === entriesImportNorm(r.calendar)));
    const fileCal = named ? ownCal : getCalendar(state, calId);
    const entryCal = ownCal || fileCal;
''')),
    (B('''
    pairs.forEach(p => {
      const v = r.fields && typeof r.fields === "object" ? r.fields[p.key] : undefined;
      if (entriesImportEmpty(v)) return;
      const where = { row: row.name, field: p.field.label, self: row.entryId, top: true };
      const got = entriesImportValue(p.ff, p.field, v, fileCal, ctx, where);
      if (!got.ok) { if (got.why) ctx.unread.push({ row: where.row, field: where.field, why: got.why }); return; }
'''), B('''
    const mark = ctx.others.length;
    const halves = {};
    pairs.forEach(p => {
      const v = r.fields && typeof r.fields === "object" ? r.fields[p.key] : undefined;
      if (entriesImportEmpty(v)) return;
      const where = { row: row.name, field: p.side ? `${p.field.label} · ${p.side}` : p.field.label, self: row.entryId, top: true, id: p.field.id };
      const got = file.csv
        ? entriesImportText(p.field, v, fileCal, ctx, where, entry && entry.fields ? entry.fields[p.field.id] : null)
        : entriesImportValue(p.ff, p.field, v, fileCal, ctx, where);
      if (!got.ok) { if (got.why) ctx.unread.push({ row: where.row, field: where.field, why: got.why }); return; }
      if (file.csv) {
        // A Name History's and a relation's dates are the entry's own, kept.
        const value = entryCal !== fileCal && (p.side || p.field.type === "calendar-date") ? entriesImportMoveDate(got.value, fileCal, entryCal) : got.value;
        if (p.side) halves[p.field.id] = { ...(halves[p.field.id] || {}), [p.side]: value };
        else fields[p.field.id] = value;
        return;
      }
''')),
    (B('''
    // A dependent dropdown's choice reads where its parent's choice offers
'''), B('''
    Object.keys(halves).forEach(id => {
      const was = entry && entry.fields && entry.fields[id] && typeof entry.fields[id] === "object" ? entry.fields[id] : {};
      fields[id] = { ...was, start: "start" in halves[id] ? halves[id].start : was.start || null, end: "end" in halves[id] ? halves[id].end : was.end || null };
    });
    // A dependent dropdown's choice reads where its parent's choice offers
''')),
    ("    const val = (id) => selectValueOnly(id in fields ? fields[id] : entry && entry.fields ? entry.fields[id] : null);\n",
     "    const val = (id) => selectValueOnly(id in fields ? fields[id] : entry && entry.fields ? entry.fields[id] : null);\n"
     "    const shown = (id) => { const o = ctx.others.slice(mark).find(x => x.id === id && id in fields); return o ? o.text : val(id); };\n"),
    ("          ctx.unread.push({ row: row.name, field: f.label, why: parent ? `\"${own}\" isn't offered under ${pl}'s \"${parent}\"` : `it needs a choice in ${pl} first` });\n",
     "          ctx.unread.push({ row: row.name, field: f.label, why: parent ? `\"${shown(f.id)}\" isn't offered under ${pl}'s \"${shown(f.dependsOn)}\"` : `it needs a choice in ${pl} first` });\n"),
    ("          ctx.unread.push({ row: row.name, field: pl, why: `\"${parent}\" doesn't offer ${f.label}'s \"${own}\", which the file leaves as it is` });\n",
     "          ctx.unread.push({ row: row.name, field: pl, why: `\"${shown(f.dependsOn)}\" doesn't offer ${f.label}'s \"${shown(f.id)}\", which the file leaves as it is` });\n"),
    (B('''
    const tags = choices.tags && Array.isArray(r.tags) ? r.tags.filter(t => typeof t === "string" && t.trim()).map(t => t.trim()) : [];
'''), B('''
    // A cell read as Other is listed where the import writes it, changing
    // the entry's value (r049).
    const listed = ctx.others.splice(mark).filter(o => o.id in fields && !(entry && entriesImportSame(fields[o.id], (entry.fields || {})[o.id])));
    ctx.others.push(...listed);
    const tags = choices.tags && Array.isArray(r.tags) ? r.tags.filter(t => typeof t === "string" && t.trim()).map(t => t.trim()) : [];
''')),
    (B('''
      const changed = Object.keys(fields).some(id => !entriesImportSame(fields[id], (entry.fields || {})[id])) || (row.tags && !entriesImportSame(row.tags, entry.tags || []));
'''), B('''
      // A Tag List whose tags are the entry's, however its commas are
      // spaced, is the same, and isn't written (r049).
      tplFields.forEach(f => {
        if (f.type === "tags" && f.id in fields && entriesImportSame(entriesImportTagList(fields[f.id]), entriesImportTagList((entry.fields || {})[f.id]))) delete fields[f.id];
      });
      const changed = Object.keys(fields).some(id => !entriesImportSame(fields[id], (entry.fields || {})[id])) || (row.tags && !entriesImportSame(row.tags, entry.tags || []));
''')),
    ("  return { rows, counts, doubled, unresolved: ctx.unresolved, unread: ctx.unread, kept, taken: takenNames };\n",
     "  return { rows, counts, doubled, unresolved: ctx.unresolved, unread: ctx.unread, others: ctx.others, kept, taken: takenNames };\n"),
    # The CSV's section, after the write; the file still ends without a
    # newline.
    (APPLY_END, APPLY_END + "\n\n" + CSV_LAYER),
])


# ------------------------------------------------------------------ 29_modals
edit(MODULES / "29_modals.jsx", [
    (B('''
// Esc and a click outside cancel; while it's open the keys are its own and
// the focus stays in it, as the record modals'.

function EntriesImportModal('''), B('''
// Esc and a click outside cancel; while it's open the keys are its own and
// the focus stays in it, as the record modals'. Since r049 it opens on a CSV
// too (entriesImportReadCsv): a row per column, with its header and its
// first value, a range's halves picked apart, and the cells read as Other
// listed.

function EntriesImportModal(''')),
    ("  const fieldFlags = useMemo(() => entriesImportFieldPicks(template.fields, file.template.fields), [template, file]);\n",
     "  const fieldFlags = useMemo(() => (file.csv ? entriesImportCsvPicks : entriesImportFieldPicks)(template.fields, file.template.fields), [template, file]);\n"),
    ("  const here = (template.fields || []).filter(f => f && f.id);\n",
     "  const here = (template.fields || []).filter(f => f && f.id && !(file.csv && (f.type === \"group\" || f.type === \"grid\")));\n"),
    ("  const notes = !canImport || skipped.length + plan.unresolved.length + plan.unread.length + plan.kept.length + plan.taken.length > 0;\n",
     "  const notes = !canImport || skipped.length + plan.unresolved.length + plan.unread.length + plan.others.length + plan.kept.length + plan.taken.length > 0;\n"),
    (B('''
    "twice-file": "The file has this label twice; pick its field.",
    taken: "The field here with this label is matched to another of the file's fields by its id.",
'''), B('''
    "twice-file": file.csv ? "Another of the file's columns has this header; pick this one's field." : "The file has this label twice; pick its field.",
    taken: file.csv ? "The field here with this label is picked for another of the file's columns." : "The field here with this label is matched to another of the file's fields by its id.",
''')),
    (B('''
  const fromTpl = file.template && typeof file.template.name === "string" && file.template.name ? ` from "${file.template.name}"` : "";
'''), B('''
  const fromTpl = file.template && typeof file.template.name === "string" && file.template.name ? ` from "${file.template.name}"` : "";
  const about = file.csv
    ? `, ${file.columns === 1 ? "1 column" : `${file.columns} columns`}.`
    : `${fromTpl}. ${file.secrets === true ? "It holds secret fields." : "It holds no secret fields."}`;
  const sample = (s) => (s ? `"${s.length > 40 ? `${s.slice(0, 40)}…` : s}"` : "empty");
''')),
    ("            {fileName}: {n === 1 ? \"1 entry\" : `${n} entries`}{fromTpl}. {file.secrets === true ? \"It holds secret fields.\" : \"It holds no secret fields.\"}\n",
     "            {fileName}: {n === 1 ? \"1 entry\" : `${n} entries`}{about}\n"),
    ("<div style={dim}>Always used: it names new entries and, with matching on, finds existing ones.</div>",
     "<div style={dim}>{file.csv ? \"Always used: the Name column names new entries and, with matching on, finds existing ones.\" : \"Always used: it names new entries and, with matching on, finds existing ones.\"}</div>"),
    (B('''
              const target = here.find(f => f.id === pick);
              const flag = fieldFlags[i] && fieldFlags[i].flag;
              const note = pick
                ? (doubled.has(pick) ? { t: "Picked for another of the file's fields too.", w: true }
'''), B('''
              const target = file.csv ? null : here.find(f => f.id === pick);
              const flag = fieldFlags[i] && fieldFlags[i].flag;
              const note = pick
                ? (doubled.has(pick) ? { t: file.csv ? "Picked for another of the file's columns too." : "Picked for another of the file's fields too.", w: true }
''')),
    (B('''
                  <div style={{ minWidth: 0, overflowWrap: "anywhere" }}>{ff.label} <span style={dim}>{typeName(ff.type)}{ff.secret ? ", secret" : ""}</span></div>
                  <select className="input" value={pick || ""} aria-label={`The field for ${ff.label}`} onChange={e => setField(i, e.target.value)}>
                    <option value="">Leave out</option>
                    {here.map(f => <option key={f.id} value={f.id}>{f.label} ({typeName(f.type)})</option>)}
                  </select>
'''), B('''
                  <div style={{ minWidth: 0, overflowWrap: "anywhere" }}>{file.csv
                    ? <>{ff.label || "(no header)"} <span style={dim}>{sample(ff.sample)}</span></>
                    : <>{ff.label} <span style={dim}>{typeName(ff.type)}{ff.secret ? ", secret" : ""}</span></>}</div>
                  <select className="input" value={pick || ""} aria-label={`The field for ${ff.label || "this column"}`} onChange={e => setField(i, e.target.value)}>
                    <option value="">Leave out</option>
                    {here.map(f => (file.csv && f.type === "calendar-date-range"
                      ? ["start", "end"].map(sd => <option key={`${sd}:${f.id}`} value={`${sd}:${f.id}`}>{f.label} · {sd} ({typeName(f.type)})</option>)
                      : <option key={f.id} value={f.id}>{f.label} ({typeName(f.type)})</option>))}
                  </select>
''')),
    (B('''
            <label style={{ ...row, display: "flex", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" className="entries-import-tags" checked={choices.tags} onChange={e => setChoices(x => ({ ...x, tags: e.target.checked }))} />
              <span>Bring the file's tags (where a row has some, they replace a matched entry's)</span>
            </label>
'''), B('''
            {(!file.csv || file.tagsColumn) && <label style={{ ...row, display: "flex", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" className="entries-import-tags" checked={choices.tags} onChange={e => setChoices(x => ({ ...x, tags: e.target.checked }))} />
              <span>Bring the file's tags (where a row has some, they replace a matched entry's)</span>
            </label>}
''')),
    (B('''
                    <div style={{ minWidth: 0, overflowWrap: "anywhere" }}>{typeof fc.key === "string" ? fc.key : typeof fc.name === "string" && fc.name ? fc.name : "(no name)"} <span style={dim}>{fc.id == null ? "the file's primary, " : ""}{calRows[i] === 1 ? "1 entry" : `${calRows[i]} entries`}</span></div>
                    <select className="input" value={pick} aria-label={`The calendar for ${typeof fc.name === "string" && fc.name ? fc.name : "this calendar"}`} onChange={e => setCal(i, e.target.value)}>
'''), B('''
                    <div style={{ minWidth: 0, overflowWrap: "anywhere" }}>{fc.blank ? (file.calendarColumn ? "Blank" : "Every row") : typeof fc.key === "string" ? fc.key : typeof fc.name === "string" && fc.name ? fc.name : "(no name)"} <span style={dim}>{fc.blank && !file.calendarColumn ? "no Calendar column, " : fc.id == null ? "the file's primary, " : ""}{calRows[i] === 1 ? "1 entry" : `${calRows[i]} entries`}</span></div>
                    <select className="input" value={pick} aria-label={fc.blank ? "The calendar for rows that name none" : `The calendar for ${typeof fc.name === "string" && fc.name ? fc.name : "this calendar"}`} onChange={e => setCal(i, e.target.value)}>
''')),
    (B('''
            {few("entries-import-unread", "Values that didn't read:", plan.unread.map(u => `${u.row}'s ${u.field}: ${u.why}`))}
'''), B('''
            {few("entries-import-unread", "Values that didn't read:", plan.unread.map(u => `${u.row}'s ${u.field}: ${u.why}`))}
            {few("entries-import-other", "Read as Other, with their text:", plan.others.map(o => `${o.row}'s ${o.field}, "${o.text}"`))}
''')),
    ("A field here is picked for two of the file's fields; pick one for each before importing.</div>}",
     "A field here is picked for two of the file's {file.csv ? \"columns\" : \"fields\"}; pick one for each before importing.</div>}"),
    # A CSV's skipped row is numbered as the spreadsheet numbers it.
    ("  const skipWhy = (r) => (r.why === \"no name\" ? `row ${r.i + 1} has no name` : ",
     "  const rowNo = (r) => (file.csv && file.entries[r.i] && file.entries[r.i].row) || r.i + 1;\n"
     "  const skipWhy = (r) => (r.why === \"no name\" ? `row ${rowNo(r)} has no name` : "),
])


# ------------------------------------------------------------------ 12_trunk
edit(MODULES / "12_trunk.jsx", [
    (B('''
  // kind of its own whose newest three are kept, taken as rename's is,
  // without waiting on it. Not in Lock mode.
'''), B('''
  // kind of its own whose newest three are kept, taken as rename's is,
  // without waiting on it. Not in Lock mode. Since r049 a .csv is read as a
  // CSV (entriesImportReadCsv), and a file's bytes, past a UTF-8 byte-order
  // mark, as UTF-8, or as Windows-1252 where they aren't UTF-8, as a
  // spreadsheet may save them.
''')),
    (B('''
    reader.onload = () => {
      const got = entriesImportRead(String(reader.result));
      if (got.error) { flash(got.error, "error"); return; }
      setEntriesImport({ templateId: tplId, fileName: f.name, file: got.file });
    };
    reader.onerror = () => flash("Couldn't read that file.", "error");
    reader.readAsText(f);
'''), B('''
    reader.onload = () => {
      const all = new Uint8Array(reader.result);
      const bytes = all[0] === 0xEF && all[1] === 0xBB && all[2] === 0xBF ? all.subarray(3) : all;
      let text;
      try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch (e) { text = new TextDecoder("windows-1252").decode(bytes); }
      const csv = /\\.csv$/i.test(f.name || "") || /^text\\/csv$/i.test(f.type || "");
      const got = csv ? entriesImportReadCsv(text) : entriesImportRead(text);
      if (got.error) { flash(got.error, "error"); return; }
      setEntriesImport({ templateId: tplId, fileName: f.name, file: got.file });
    };
    reader.onerror = () => flash("Couldn't read that file.", "error");
    reader.readAsArrayBuffer(f);
''')),
    (B('''
        accept=".json,application/json"
        className="hidden-file-input entries-import-file-input"
'''), B('''
        accept=".json,.csv,application/json,text/csv"
        className="hidden-file-input entries-import-file-input"
''')),
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
    print(f"r049 applied to {len(staged)} files")


if __name__ == "__main__":
    main()
