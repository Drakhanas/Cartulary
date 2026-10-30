"""
v1.7 r045: the filter builder, the search fix, and All entries, Pipes'
seventh cut.

docs/pipes-spec.md, section 6, with the three details Drak settled at the
cut (2026-10-30, one per message: a, a, a):

1. The condition rows' controls. One line per condition: a field dropdown,
   an operator dropdown, the value's control by type (a text box; the
   options as a dropdown, or as checkboxes for any of, has any, and has all;
   a number box, two for between; the date entry; a record picker by name),
   and x to remove it; + Condition under the rows, All / Any above them.
2. Entering a date in a condition. The entry form's own date control
   (year, month, day) in the world's primary calendar, with a calendar
   picker beside it when the world has others; both dates go to the day
   count Chronometric places dates by, so a date in one calendar compares
   with an entry's in another. Between shows two. A real-world Date field
   gets the browser's date box, as its editor has.
3. How the list shows which conditions are active. A row of chips above
   the list, one per condition, with and or or between them as the query
   matches all or any, and Clear at the end; the Filter button carries the
   count (Filter · 2); a chip opens the rows at its condition, and once the
   rows close the chips stay. Nothing matches these conditions. when the
   list comes up empty, and 12 of 48 beside the sort.

With them, Claude's defaults, said before the first call and not stopped:
All entries at the top of the sidebar's Templates, with the world's count,
its list showing each entry's template as a tag's does; picking any scope
clears the search and the conditions, as a pick clears the search, and
opening an entry and coming back keeps both; the conditions are page state,
as the search is, gone on reload until r046 saves lists; fields go by label,
case aside, across the scope's templates, a group's subfields under its
label holding when any row holds, a date range as two fields, its start and
its end, as Chronometric draws it, and Name, Tags, Linked with (to, from, or
either way, through the link index), and Template where the scope spans
templates; the spec's operators, a number read as a number and a date by
absoluteDay in each entry's own calendar, a reference is a record picked by
name and kept by id, or contains text in a linked name, every type with
is empty and isn't empty, an image with those alone, and text operators
where two templates give one label different types; the search and the
conditions read what the page shows, never a field's label, an id, or a
stored key, a field the page hides reading as empty and a link through a
secret field counting only while secrets show; the variant filter, the
scope, the conditions, the search, then the sort; and one roadmap row on a
file the cut edits rides along, closed: a required Number field couldn't
pass validation, the form storing the input's text and the check wanting a
number, and the check now reads the text as a number (fieldNumberValue),
the stored format unchanged. The Search help's line about deselecting the
active filter by clicking it again stays r051's.

Settled in the build: picking a scope closes the rows if they're open, the
list being drawn afresh for each scope; between chips All reads and, Any
or; a secret field isn't offered while secrets are hidden; a row without
its value goes when the rows close; a date's chip names its calendar when
it isn't the primary; and a tag's list offers the fields of the templates
its entries use, with Template when there's more than one.

- 13_form-engine-display: the queries under a header of their own, after
  EntryList (the fields a condition names, what an entry's page shows of
  each value, the conditions' tests, the search's text, the rows, the
  record picker, and the chips); EntryList's Filter, count, rows, chips,
  and empty line.
- 12_trunk: the list's scope (listScope), the fields a condition names in
  it (queryFields), the conditions and the search over it, the query's
  state, cleared with the search when a scope is picked; All entries in the
  sidebar and the header.
- 05_field-system: a Number field's value as a number (fieldNumberValue),
  which the required check reads.

Declared scope: 05_field-system, 12_trunk, 13_form-engine-display. No shell
change.
Declarations added: fieldNumberValue, QUERY_EMPTY, queryLower, QUERY_KINDS,
QUERY_OPS, queryFieldKey, queryParse, queryFieldsOf, queryValuesOf,
queryIsBlank, queryLinkWords, queryShown, QUERY_MEMO, queryContextOf,
queryEntryText, queryTextOf, queryPicks, queryTest, queryHolds,
queryValueSet, queryReady, queryReadyConditions, queryApply,
queryNewCondition, queryValueOptions, queryRecordCandidates, queryChipText,
EntryQueryRows, EntryQueryRow, EntryQueryValue, EntryQueryChecks,
EntryQueryRecordPicker, EntryQueryChips. None removed. One header added:
`Entry queries (v1.7 r045)`.

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given), and nothing is written unless every anchor in
every file holds. Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r045_filter_builder.py
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


ENTRY_VIEW = header("Entry view")
QUERIES = header("Entry queries (v1.7 r045)") + "\n" + r'''// docs/pipes-spec.md, section 6, with Drak's calls at the cut: the entry
// list's conditions and its search read what an entry's page shows, never a
// field's label, an id, or a stored key. A condition is a field, an
// operator, and a value on one line (call 1); a date in one is entered with
// the entry form's own control, in any of the world's calendars, and
// compared by absoluteDay, as Chronometric places dates (call 2); and the
// conditions in force show as chips above the list while their rows are
// closed (call 3). Every condition must hold, or any of them; they don't
// nest. A field goes by its label across templates, case aside, and a
// condition on it holds only for an entry whose template has it; a field the
// page hides, by its show-when or as a secret while secrets are hidden,
// reads as empty, and a link through a secret field counts only while
// secrets show.

// A query with nothing in it: every condition must hold, and there are none.
const QUERY_EMPTY = { mode: "all", conditions: [] };

// A string as a condition compares it: trimmed and lowercased.
const queryLower = (s) => (typeof s === "string" ? s.trim().toLowerCase() : "");

// What a field type's values are to a condition, which sets its operators;
// a type the page shows as text is text. A group isn't a field of its own:
// its subfields are, under its label.
const QUERY_KINDS = {
  text: "text", textarea: "text", longform: "text", url: "text", color: "text", "name-history": "text", grid: "text",
  select: "choice", multiselect: "multi", tags: "multi", number: "number", date: "day",
  "calendar-date": "date", "entry-ref": "ref", image: "image",
};

// Each kind's operators, [id, words], in the order a row offers them; every
// kind but a template and a link can ask for empty and for not empty.
const QUERY_OPS = {
  text: [["contains", "contains"], ["is", "is"], ["empty", "is empty"], ["filled", "isn't empty"]],
  choice: [["is", "is"], ["not", "is not"], ["anyOf", "is any of"], ["empty", "is empty"], ["filled", "isn't empty"]],
  multi: [["hasAny", "has any of"], ["hasAll", "has all of"], ["empty", "is empty"], ["filled", "isn't empty"]],
  number: [["eq", "is"], ["lt", "is less than"], ["gt", "is more than"], ["between", "is between"], ["empty", "is empty"], ["filled", "isn't empty"]],
  day: [["before", "is before"], ["after", "is after"], ["between", "is between"], ["empty", "is empty"], ["filled", "isn't empty"]],
  date: [["before", "is before"], ["after", "is after"], ["between", "is between"], ["empty", "is empty"], ["filled", "isn't empty"]],
  ref: [["is", "is"], ["contains", "contains"], ["empty", "is empty"], ["filled", "isn't empty"]],
  image: [["empty", "is empty"], ["filled", "isn't empty"]],
  template: [["is", "is"], ["not", "is not"], ["anyOf", "is any of"]],
  linked: [["either", "either way"], ["to", "to"], ["from", "from"]],
};

// A field's key: its label, a subfield's label under a group's, and a date
// range's end, each as a condition matches it.
const queryFieldKey = (label, sub, end) => JSON.stringify(["f", queryLower(label), sub ? queryLower(sub) : null, end || null]);

// A key read back: a pseudo-field's name (Name, Tags, Template, Linked
// with), or { label, sub, end }; null for anything else.
const queryParse = (key) => {
  if (key === "name" || key === "tags" || key === "template" || key === "linked") return { pseudo: key };
  if (typeof key !== "string") return null;
  try {
    const p = JSON.parse(key);
    return Array.isArray(p) && p[0] === "f" && typeof p[1] === "string" ? { label: p[1], sub: p[2] || null, end: p[3] || null } : null;
  } catch (e) { return null; }
};

// The fields a condition can name over a scope's templates, in their order:
// Name first; each label a template gives a field, case aside, with the kind
// its fields hold (text where two templates give it different kinds) and
// the options they offer; a group's subfields under the group's label; a
// date range's start and end as two, as Chronometric draws a range; then
// Tags, Template where the scope spans templates, and Linked with. A secret
// field is offered only while secrets show.
const queryFieldsOf = (templates, spans, showSecrets) => {
  const out = [{ key: "name", label: "Name", kind: "text", options: [] }];
  const byKey = new Map();
  const add = (key, label, kind, f) => {
    let x = byKey.get(key);
    if (!x) { x = { key, label, kind, options: [] }; byKey.set(key, x); out.push(x); }
    else if (x.kind !== kind) x.kind = "text";
    const opt = (o) => {
      const v = typeof o === "string" ? o : (o && typeof o.value === "string" ? o.value : "");
      if (v && !x.options.some(y => queryLower(y) === queryLower(v))) x.options.push(v);
    };
    (Array.isArray(f.options) ? f.options : []).forEach(opt);
    if (f.optionsByParent && typeof f.optionsByParent === "object") Object.values(f.optionsByParent).forEach(list => (Array.isArray(list) ? list : []).forEach(opt));
  };
  const one = (f, group) => {
    if (!f || typeof f.label !== "string" || !f.label.trim() || (f.secret && !showSecrets)) return;
    const label = group ? `${group.label} › ${f.label}` : f.label;
    const key = (end) => (group ? queryFieldKey(group.label, f.label, end) : queryFieldKey(f.label, null, end));
    if (f.type === "calendar-date-range") {
      add(key("start"), `${label} · start`, "date", f);
      add(key("end"), `${label} · end`, "date", f);
      return;
    }
    if (QUERY_KINDS[f.type]) add(key(null), label, QUERY_KINDS[f.type], f);
  };
  (Array.isArray(templates) ? templates : []).forEach(t => (t && Array.isArray(t.fields) ? t.fields : []).forEach(f => {
    if (f && f.type === "group") {
      if (typeof f.label === "string" && f.label.trim() && !(f.secret && !showSecrets)) (Array.isArray(f.subfields) ? f.subfields : []).forEach(s => one(s, f));
    } else one(f, null);
  }));
  out.push({ key: "tags", label: "Tags", kind: "multi", options: [] });
  if (spans) out.push({ key: "template", label: "Template", kind: "template", options: [] });
  out.push({ key: "linked", label: "Linked with", kind: "linked", options: [] });
  return out;
};

// An entry's values for a parsed field, each { field, value }: null when the
// entry's template has no such field, and otherwise the values the page
// would show, a field hidden by its show-when or as a secret while secrets
// are hidden left out, a group's rows each in turn, and a date range's end
// read as a date.
const queryValuesOf = (entry, tpl, p, showSecrets) => {
  const fields = tpl && Array.isArray(tpl.fields) ? tpl.fields : [];
  const vals = (entry && entry.fields) || {};
  const seen = (f) => !(f.secret && !showSecrets);
  const isRange = (f) => f.type === "calendar-date-range";
  let has = false;
  const out = [];
  const take = (f, v) => {
    if (!p.end) { out.push({ field: f, value: v }); return; }
    out.push({ field: { ...f, type: "calendar-date" }, value: v && typeof v === "object" ? v[p.end] : null });
  };
  fields.forEach(f => {
    if (!f || queryLower(f.label) !== p.label) return;
    if (p.sub) {
      if (f.type !== "group") return;
      const subs = (Array.isArray(f.subfields) ? f.subfields : []).filter(s => s && queryLower(s.label) === p.sub && (p.end ? isRange(s) : !isRange(s)));
      if (subs.length === 0) return;
      has = true;
      if (!seen(f) || !isFieldVisible(f, vals)) return;
      (Array.isArray(vals[f.id]) ? vals[f.id] : []).forEach(inst => {
        if (!inst || typeof inst !== "object") return;
        subs.forEach(s => { if (seen(s) && isFieldVisible(s, inst)) take(s, inst[s.id]); });
      });
      return;
    }
    if (f.type === "group" || (p.end ? !isRange(f) : isRange(f))) return;
    has = true;
    if (seen(f) && isFieldVisible(f, vals)) take(f, vals[f.id]);
  });
  return has ? out : null;
};

// Whether a value is empty as its field's type holds it.
const queryIsBlank = (f, v) => {
  if (v == null || v === "") return true;
  switch (f.type) {
    case "entry-ref": return getEntryRefIds(f, v).length === 0;
    case "multiselect": return !Array.isArray(v) || !v.some(x => x != null && String(x).trim() !== "");
    case "tags": return (Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : []).every(x => String(x == null ? "" : x).trim() === "");
    case "select": return formatSelectDisplay(v) === "";
    case "calendar-date": return typeof v !== "object" || v.year == null;
    case "calendar-date-range": return typeof v !== "object" || !((v.start && v.start.year != null) || (v.end && v.end.year != null));
    case "name-history": return !Array.isArray(v) || !v.some(it => it && typeof it.name === "string" && it.name.trim());
    case "grid": return gridIsEmpty(coerceGridValue(v));
    default: return typeof v === "string" ? v.trim() === "" : Array.isArray(v) ? v.length === 0 : false;
  }
};

// A text as the page shows it: each [[link]] as its words, a
// [[target|shown]] as what it shows.
const queryLinkWords = (s) => s.replace(/\[\[([^\]\n]+)\]\]/g, (whole, inner) => {
  const pipe = inner.indexOf("|");
  return pipe >= 0 ? inner.substring(pipe + 1).trim() : inner;
});

// A field's value as the entry page shows it (FieldValueDisplay), as text:
// a dropdown's choice, a date as written in the entry's calendar (ctx.cal),
// a reference's names, a grid's own labels and cells; an image shows none.
const queryShown = (f, v, ctx) => {
  if (v == null || v === "") return "";
  const day = (d) => (d && typeof d === "object" && d.year != null ? `${d.approximate ? "~" : ""}${formatCalendarDate(d, ctx.cal)}` : "");
  switch (f.type) {
    case "text": case "textarea": return typeof v === "string" ? queryLinkWords(v) : "";
    case "longform": return typeof v === "string" ? v.split("\f").join("\n") : "";
    case "date": return fmtDate(v) || String(v);
    case "select": return formatSelectDisplay(v);
    case "multiselect": return Array.isArray(v) ? v.filter(x => x != null && String(x).trim() !== "").map(x => String(x).trim()).join("\n") : "";
    case "tags": return (Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : []).map(x => String(x == null ? "" : x).trim()).filter(Boolean).join("\n");
    case "calendar-date": return day(v);
    case "calendar-date-range":
      if (typeof v !== "object" || (!v.start && !v.end)) return "";
      return `${v.start && v.start.year != null ? day(v.start) : "?"} → ${v.end && v.end.year != null ? day(v.end) : "ongoing"}`;
    case "name-history":
      return (Array.isArray(v) ? v : []).filter(it => it && it.name).map(it => [it.name, day(it.from), day(it.to)].filter(Boolean).join(" ")).join("\n");
    case "entry-ref": {
      const items = f.relationKind ? getRelationValues(v, f.multi) : getEntryRefIds(f, v).map(id => ({ id }));
      return items.map(it => {
        const r = ctx.ref(it.id);
        if (!r) return "";
        const parts = [r.name, it.label || ""];
        if (f.relationKind === SPOUSE_KIND) parts.push(it.status && it.status !== "active" ? it.status : "", day(it.marriedOn), day(it.endedOn));
        return parts.filter(Boolean).join(" ");
      }).filter(Boolean).join("\n");
    }
    case "grid": {
      const g = coerceGridValue(v);
      const parts = [g.rowAxisLabel, g.colAxisLabel, ...(g.rows || []).map(r => r && r.label), ...(g.cols || []).map(c => c && c.label)];
      (g.rows || []).forEach(r => (g.cols || []).forEach(c => {
        const cell = r && c && g.cells && g.cells[r.id] ? g.cells[r.id][c.id] : null;
        if (gridCellIsEmpty(cell)) return;
        parts.push(cell.type === "entry-ref" ? ((ctx.ref(cell.value) || {}).name || "") : queryShown({ type: cell.type }, cell.value, ctx));
      }));
      return parts.filter(x => typeof x === "string" && x).join("\n");
    }
    case "image": return "";
    default: return String(v);
  }
};

// What a query reads, built once and kept while the slices it reads and
// whether secrets show stay the same (QUERY_MEMO): the templates, a record's
// name by id as a reference chip finds it (resolveRefTarget's order), each
// calendar, the link index's links either way, and each entry's search
// text, made when first asked. ctx.cal is the calendar of the entry being
// read, set before each.
const QUERY_MEMO = { keys: null, ctx: null, texts: null };
const queryContextOf = (state, showSecrets) => {
  const st = state || {};
  const keys = [st.entries, st.templates, st.calendars, st.world ? st.world.calendar : null, st.world ? st.world.description : null, st.celestialBodies, st.cartographia, st.stemmas, st.fabula, st.glossopoeia, !!showSecrets];
  const m = QUERY_MEMO;
  if (m.ctx && m.keys.length === keys.length && m.keys.every((k, i) => k === keys[i])) return m.ctx;
  const byId = (list) => {
    const out = new Map();
    (Array.isArray(list) ? list : []).forEach(x => { if (x && x.id && !out.has(x.id)) out.set(x.id, x); });
    return out;
  };
  const entryById = byId(st.entries);
  const bodyById = byId(st.celestialBodies);
  const nodes = getRegisteredGraphNodes(st);
  const nodeById = byId(nodes);
  const cals = new Map();
  const calendarOf = (id) => {
    const k = id || "";
    if (!cals.has(k)) cals.set(k, getCalendar(st, id || null));
    return cals.get(k);
  };
  let index = null;
  const sets = new Map();
  const linkSets = (otherId) => {
    let s = sets.get(otherId);
    if (s) return s;
    if (!index) index = linkIndexOf(st);
    const shown = (l) => !(l.secret && !showSecrets);
    s = { to: new Set(), from: new Set() };
    (index.byTarget.get(otherId) || []).forEach(l => { if (l.src && shown(l)) s.to.add(l.src.id); });
    index.links.forEach((l, i) => { if (l.src && l.src.id === otherId && shown(l)) s.from.add(index.targets[i]); });
    sets.set(otherId, s);
    return s;
  };
  const ctx = {
    showSecrets: !!showSecrets,
    tplById: byId(st.templates),
    nodes,
    cal: null,
    calOf: (e) => calendarOf(e && e.calendarId),
    calendarOf,
    dayOf: (date, calendarId) => {
      if (!date || typeof date !== "object" || date.year == null) return null;
      const d = calendarDateToAbsoluteDay(calendarOf(calendarId), date);
      return Number.isFinite(d) ? d : null;
    },
    ref: (id) => {
      if (typeof id !== "string" || !id) return null;
      const r = entryById.get(id) || bodyById.get(id) || nodeById.get(id);
      return r ? { name: r.name || "" } : null;
    },
    // whether the entry links to the record (to), the record links to the
    // entry (from), or either
    linked: (entryId, otherId, dir) => {
      if (typeof otherId !== "string" || !otherId) return false;
      const s = linkSets(otherId);
      if (dir === "to") return s.to.has(entryId);
      if (dir === "from") return s.from.has(entryId);
      return s.to.has(entryId) || s.from.has(entryId);
    },
  };
  m.keys = keys;
  m.ctx = ctx;
  m.texts = new Map();
  return ctx;
};

// What the search reads of an entry, lowercased: its name, its tags, and
// each field its page draws, as it draws it.
const queryEntryText = (entry, tpl, ctx) => {
  const parts = [entry.name || "", ...(Array.isArray(entry.tags) ? entry.tags : [])];
  const walk = (fields, vals) => (Array.isArray(fields) ? fields : []).forEach(f => {
    if (!f || !f.id || (f.secret && !ctx.showSecrets) || !isFieldVisible(f, vals)) return;
    const v = vals[f.id];
    if (f.type === "group") {
      (Array.isArray(v) ? v : []).forEach(inst => { if (inst && typeof inst === "object") walk(f.subfields, inst); });
      return;
    }
    const s = queryShown(f, v, ctx);
    if (s) parts.push(s);
  });
  walk(tpl ? tpl.fields : [], entry.fields || {});
  return parts.join("\n").toLowerCase();
};

// An entry's search text, kept with the query's memo.
const queryTextOf = (state, entry, showSecrets) => {
  const ctx = queryContextOf(state, showSecrets);
  const texts = QUERY_MEMO.texts;
  let t = texts.get(entry.id);
  if (t === undefined) {
    ctx.cal = ctx.calOf(entry);
    t = queryEntryText(entry, ctx.tplById.get(entry.templateId) || null, ctx);
    texts.set(entry.id, t);
  }
  return t;
};

// A multi-select's or a tag list's picks, lowercased.
const queryPicks = (f, v) => {
  const list = f.type === "tags" ? (Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : []) : (Array.isArray(v) ? v : []);
  return list.map(x => queryLower(x == null ? "" : String(x))).filter(Boolean);
};

// Whether one value meets a condition, by the condition's kind.
const queryTest = (c, kind, it, ctx) => {
  const f = it.field, v = it.value;
  if (kind === "text") {
    const s = queryLower(queryShown(f, v, ctx));
    const want = queryLower(c.value);
    return c.op === "is" ? s === want : s.includes(want);
  }
  if (kind === "choice") {
    const o = queryLower(selectValueOnly(v));
    return c.op === "anyOf" ? (c.values || []).some(x => queryLower(x) === o) : o === queryLower(c.value);
  }
  if (kind === "multi") {
    const picks = queryPicks(f, v);
    const want = (c.values || []).map(queryLower).filter(Boolean);
    return c.op === "hasAll" ? want.every(w => picks.includes(w)) : want.some(w => picks.includes(w));
  }
  if (kind === "number") {
    const n = fieldNumberValue(v);
    const a = fieldNumberValue(c.value), b = fieldNumberValue(c.value2);
    if (n == null || a == null) return false;
    if (c.op === "eq") return n === a;
    if (c.op === "lt") return n < a;
    if (c.op === "gt") return n > a;
    return b != null && n >= Math.min(a, b) && n <= Math.max(a, b);
  }
  if (kind === "day") {
    const s = typeof v === "string" ? v.trim().slice(0, 10) : "";
    const a = typeof c.value === "string" ? c.value : "", b = typeof c.value2 === "string" ? c.value2 : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !a) return false;
    if (c.op === "before") return s < a;
    if (c.op === "after") return s > a;
    return !!b && s >= (a < b ? a : b) && s <= (a < b ? b : a);
  }
  if (kind === "date") {
    const d = v && typeof v === "object" && v.year != null ? calendarDateToAbsoluteDay(ctx.cal, v) : null;
    const a = ctx.dayOf(c.value, c.calendarId), b = ctx.dayOf(c.value2, c.calendarId);
    if (!Number.isFinite(d) || a == null) return false;
    if (c.op === "before") return d < a;
    if (c.op === "after") return d > a;
    return b != null && d >= Math.min(a, b) && d <= Math.max(a, b);
  }
  if (kind === "ref") {
    const ids = getEntryRefIds(f, v);
    if (c.op === "is") return ids.includes(c.value);
    const want = queryLower(c.value);
    return ids.some(id => { const r = ctx.ref(id); return !!r && queryLower(r.name).includes(want); });
  }
  return false;
};

// Whether an entry meets a condition. A field's condition holds only where
// the entry's template has the field, and over a group's rows when any row
// does; is empty when none of them holds a value, and is not when none of
// them is the choice.
const queryHolds = (c, kind, entry, tpl, ctx) => {
  const p = queryParse(c.key);
  if (!p) return false;
  if (p.pseudo === "linked") return ctx.linked(entry.id, c.value, c.op);
  if (p.pseudo === "template") {
    const t = entry.templateId;
    return c.op === "is" ? t === c.value : c.op === "not" ? t !== c.value : (c.values || []).includes(t);
  }
  const items = p.pseudo === "name" ? [{ field: { type: "text" }, value: entry.name || "" }]
    : p.pseudo === "tags" ? [{ field: { type: "multiselect" }, value: Array.isArray(entry.tags) ? entry.tags : [] }]
    : queryValuesOf(entry, tpl, p, ctx.showSecrets);
  if (!items) return false;
  const filled = items.filter(it => !queryIsBlank(it.field, it.value));
  if (c.op === "empty") return filled.length === 0;
  if (c.op === "filled") return filled.length > 0;
  if (c.op === "not") { const is = { ...c, op: "is" }; return !filled.some(it => queryTest(is, kind, it, ctx)); }
  return filled.some(it => queryTest(c, kind, it, ctx));
};

// Whether a condition has what its operator needs to be read: a value, two
// for between, a pick or more for any of, has any, and has all, and nothing
// for empty and not empty. One that doesn't is left out of the query.
const queryValueSet = (kind, v) => (kind === "date" ? !!(v && typeof v === "object" && v.year != null)
  : kind === "number" ? fieldNumberValue(v) != null
  : typeof v === "string" && v.trim() !== "");
const queryReady = (c, kind) => {
  if (!c || !(QUERY_OPS[kind] || []).some(o => o[0] === c.op)) return false;
  if (c.op === "empty" || c.op === "filled") return true;
  if (c.op === "anyOf" || c.op === "hasAny" || c.op === "hasAll") return Array.isArray(c.values) && c.values.length > 0;
  if (c.op === "between") return queryValueSet(kind, c.value) && queryValueSet(kind, c.value2);
  return queryValueSet(kind, c.value);
};

// A query's conditions in force, each { c, f } with the field it names in
// fields.
const queryReadyConditions = (query, fields) => {
  const byKey = new Map((Array.isArray(fields) ? fields : []).map(f => [f.key, f]));
  return (query && Array.isArray(query.conditions) ? query.conditions : [])
    .map(c => ({ c, f: c ? byKey.get(c.key) : null }))
    .filter(x => x.f && queryReady(x.c, x.f.kind));
};

// The entries a query keeps, in their order: all of them while no condition
// is in force.
const queryApply = (state, entries, query, fields, showSecrets) => {
  const ready = queryReadyConditions(query, fields);
  if (ready.length === 0) return entries;
  const ctx = queryContextOf(state, showSecrets);
  const any = query.mode === "any";
  return entries.filter(e => {
    if (!e) return false;
    ctx.cal = ctx.calOf(e);
    const tpl = ctx.tplById.get(e.templateId) || null;
    const hold = (x) => queryHolds(x.c, x.f.kind, e, tpl, ctx);
    return any ? ready.some(hold) : ready.every(hold);
  });
};

// A new condition on a field, its kind's first operator, nothing chosen.
const queryNewCondition = (field, id) => {
  const kind = field ? field.kind : "text";
  const ops = QUERY_OPS[kind] || QUERY_OPS.text;
  return { id: id || `qc-${genId()}`, key: field ? field.key : "name", op: ops[0][0], value: kind === "date" ? null : "", value2: kind === "date" ? null : "", values: [], calendarId: null };
};

// What a choice's or a multi-select's condition offers: its fields' options
// in their templates' order, then whatever the scope's entries hold that no
// option names (a tag list's words, or a pick whose option has since gone),
// those in alphabetical order.
const queryValueOptions = (state, entries, field, showSecrets) => {
  const out = [...(field.options || [])];
  const seen = new Set(out.map(queryLower));
  const more = [];
  const push = (v) => {
    const s = typeof v === "string" ? v.trim() : "";
    if (s && !seen.has(queryLower(s))) { seen.add(queryLower(s)); more.push(s); }
  };
  const p = queryParse(field.key);
  if (p) {
    const ctx = queryContextOf(state, showSecrets);
    (Array.isArray(entries) ? entries : []).forEach(e => {
      if (!e) return;
      if (p.pseudo === "tags") { (Array.isArray(e.tags) ? e.tags : []).forEach(push); return; }
      if (p.pseudo) return;
      (queryValuesOf(e, ctx.tplById.get(e.templateId) || null, p, showSecrets) || []).forEach(it => {
        const t = it.field.type, v = it.value;
        if (t === "select") push(selectValueOnly(v));
        else if (t === "multiselect") (Array.isArray(v) ? v : []).forEach(x => push(x == null ? "" : String(x)));
        else if (t === "tags") (Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : []).forEach(x => push(x == null ? "" : String(x)));
      });
    });
  }
  return [...out, ...more.sort((a, b) => a.localeCompare(b))];
};

// The records a picker offers for what's typed: every record whose name
// holds it, entries first, names that start with it ahead of the rest, each
// with its template or its kind, up to max.
const queryRecordCandidates = (state, text, max, showSecrets) => {
  const q = queryLower(text);
  if (!q) return [];
  const st = state || {};
  const ctx = queryContextOf(st, showSecrets);
  const out = [];
  const consider = (id, name, kind) => {
    const at = queryLower(name).indexOf(q);
    if (at >= 0) out.push({ id, name: name || "", kind, rank: at === 0 ? 0 : 1 });
  };
  (Array.isArray(st.entries) ? st.entries : []).forEach(e => {
    if (!e || !e.id) return;
    const t = ctx.tplById.get(e.templateId);
    consider(e.id, e.name, t ? t.name : "");
  });
  ctx.nodes.forEach(n => {
    const src = getRegisteredSourceById(n.templateId);
    consider(n.id, n.name, src ? src.name : "");
  });
  return out.sort((a, b) => a.rank - b.rank).slice(0, max);
};

// A condition in words, for its chip: "Status is Living", "Linked with
// House Vane, either way".
const queryChipText = (c, f, ctx) => {
  const words = ((QUERY_OPS[f.kind] || []).find(o => o[0] === c.op) || [null, c.op])[1];
  const name = (id) => { const r = ctx.ref(id); return r ? r.name : "(record not found)"; };
  const tname = (id) => { const t = ctx.tplById.get(id); return t ? t.name : "(template not found)"; };
  if (f.kind === "linked") {
    const n = name(c.value);
    return c.op === "to" ? `Linked to ${n}` : c.op === "from" ? `Linked from ${n}` : `Linked with ${n}, either way`;
  }
  if (c.op === "empty" || c.op === "filled") return `${f.label} ${words}`;
  const cal = ctx.calendarOf(c.calendarId);
  const day = (d) => (d && d.year != null ? formatCalendarDate(d, cal) : "");
  let v;
  if (f.kind === "template") v = c.op === "anyOf" ? (c.values || []).map(tname).join(", ") : tname(c.value);
  else if (f.kind === "ref" && c.op === "is") v = name(c.value);
  else if (c.op === "anyOf" || c.op === "hasAny" || c.op === "hasAll") v = (c.values || []).join(", ");
  else if (f.kind === "date") v = (c.op === "between" ? `${day(c.value)} and ${day(c.value2)}` : day(c.value)) + (c.calendarId && cal && cal.name ? ` (${cal.name})` : "");
  else if (c.op === "between") v = `${String(c.value).trim()} and ${String(c.value2).trim()}`;
  else if (f.kind === "text" || f.kind === "ref") v = `"${String(c.value).trim()}"`;
  else v = String(c.value).trim();
  return `${f.label} ${words} ${v}`;
};

// The conditions' rows, opened by the list's Filter (Drak's call 1): All or
// Any above them, a row each, + Condition under them, and Done, which
// closes them, a row still without its value going with it.
function EntryQueryRows({ query, fields, state, entries, templates, showSecrets, focusId, onQuery, onDone }) {
  const set = (patch) => onQuery({ ...query, ...patch });
  const setCond = (id, next) => set({ conditions: query.conditions.map(c => (c.id === id ? next : c)) });
  const mode = (m, words) => (
    <button type="button" className={`btn btn-small ${query.mode === m ? "btn-accent" : "btn-ghost"} entry-query-mode`} aria-pressed={query.mode === m} onClick={() => set({ mode: m })}>{words}</button>
  );
  return (
    <div style={{ padding: "10px 20px 0" }}>
      <div className="entry-query-rows" style={{ border: "1px solid var(--border)", borderRadius: 4, background: "var(--surf)", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-dim)", flexWrap: "wrap" }}>
          <span>Show entries matching</span>{mode("all", "All")}{mode("any", "Any")}<span>of these conditions</span>
        </div>
        {query.conditions.map(c => (
          <EntryQueryRow key={c.id} cond={c} fields={fields} state={state} entries={entries} templates={templates} showSecrets={showSecrets} focus={c.id === focusId}
            onChange={(next) => setCond(c.id, next)} onRemove={() => set({ conditions: query.conditions.filter(x => x.id !== c.id) })} />
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button type="button" className="btn btn-ghost btn-small entry-query-add" onClick={() => set({ conditions: [...query.conditions, queryNewCondition(fields[0])] })}>+ Condition</button>
          <span style={{ flex: 1 }} />
          {query.conditions.length > 0 && <button type="button" className="btn btn-ghost btn-small" onClick={() => set({ conditions: [] })}>Clear</button>}
          <button type="button" className="btn btn-small btn-accent entry-query-done" onClick={onDone}>Done</button>
        </div>
      </div>
    </div>
  );
}

// One condition's row: its field, its operator, the value's control by the
// field's kind, and × to remove it. A new field starts the row over.
function EntryQueryRow({ cond, fields, state, entries, templates, showSecrets, focus, onChange, onRemove }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!focus || !ref.current) return;
    const el = ref.current.querySelector(".entry-query-value input, .entry-query-value select") || ref.current.querySelector("select");
    if (el) el.focus();
  }, [focus]);
  const field = fields.find(f => f.key === cond.key) || null;
  const ops = field ? QUERY_OPS[field.kind] || [] : [];
  // the row's controls wrap among themselves, and its × keeps to the right
  return (
    <div ref={ref} className="entry-query-row" style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
      <div style={{ flex: "1 1 auto", minWidth: 0, display: "flex", alignItems: "flex-start", gap: 6, flexWrap: "wrap" }}>
        <select className="input sort-sel entry-query-field" value={field ? cond.key : ""} onChange={e => { const f = fields.find(x => x.key === e.target.value); if (f) onChange(queryNewCondition(f, cond.id)); }} style={{ maxWidth: 220 }}>
          {!field && <option value="">(field not found)</option>}
          {fields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
        {field && (
          <select className="input sort-sel entry-query-op" value={cond.op} onChange={e => onChange({ ...cond, op: e.target.value })} style={{ minWidth: 110 }}>
            {ops.map(([id, words]) => <option key={id} value={id}>{words}</option>)}
          </select>
        )}
        {field && <EntryQueryValue cond={cond} field={field} state={state} entries={entries} templates={templates} showSecrets={showSecrets} onChange={onChange} />}
      </div>
      <button type="button" className="btn btn-ghost btn-small entry-query-remove" title="Remove this condition" aria-label="Remove this condition" onClick={onRemove} style={{ flexShrink: 0, marginTop: 5 }}>×</button>
    </div>
  );
}

// A condition's value, by its field's kind: a text box; a dropdown's
// options, or checkboxes for any of, has any, and has all; a number box; the
// browser's date box for a real-world date; the entry form's date control,
// in a calendar of the world's (Drak's call 2); or a record picked by name.
// Two for between.
function EntryQueryValue({ cond, field, state, entries, templates, showSecrets, onChange }) {
  const kind = field.kind, op = cond.op;
  const set = (patch) => onChange({ ...cond, ...patch });
  const options = useMemo(() => (kind === "choice" || kind === "multi" ? queryValueOptions(state, entries, field, showSecrets) : []), [state, entries, field, showSecrets, kind]);
  if (op === "empty" || op === "filled") return null;
  const and = <span style={{ fontSize: 13, color: "var(--text-dim)" }}>and</span>;
  const pick = (list, placeholder) => (
    <select className="input sort-sel" value={cond.value || ""} onChange={e => set({ value: e.target.value })}>
      <option value="">{placeholder}</option>
      {list.map(([v, words]) => <option key={v} value={v}>{words}</option>)}
    </select>
  );
  let body;
  if (kind === "linked" || (kind === "ref" && op === "is")) {
    body = <EntryQueryRecordPicker state={state} value={cond.value} showSecrets={showSecrets} onChange={(id) => set({ value: id })} />;
  } else if (kind === "template") {
    const list = (Array.isArray(templates) ? templates : []).filter(t => t && t.id).map(t => [t.id, t.name || ""]);
    body = op === "anyOf" ? <EntryQueryChecks options={list} values={cond.values} onChange={(values) => set({ values })} /> : pick(list, "Choose a template");
  } else if (kind === "choice" || kind === "multi") {
    const list = options.map(o => [o, o]);
    body = op === "is" || op === "not" ? pick(list, "Choose") : <EntryQueryChecks options={list} values={cond.values} onChange={(values) => set({ values })} />;
  } else if (kind === "number") {
    const box = (k) => <input className="input" type="number" value={cond[k] == null ? "" : cond[k]} onChange={e => set({ [k]: e.target.value })} style={{ width: 110 }} />;
    body = op === "between" ? <>{box("value")}{and}{box("value2")}</> : box("value");
  } else if (kind === "day") {
    const box = (k) => <input className="input" type="date" value={cond[k] || ""} onChange={e => set({ [k]: e.target.value })} style={{ width: "auto" }} />;
    body = op === "between" ? <>{box("value")}{and}{box("value2")}</> : box("value");
  } else if (kind === "date") {
    const cal = getCalendar(state, cond.calendarId || null);
    const others = (Array.isArray(state && state.calendars) ? state.calendars : []).filter(c => c && c.id);
    const which = others.length > 0 && (
      <select className="input sort-sel entry-query-calendar" value={cond.calendarId || ""} title="The calendar this date is written in" onChange={e => set({ calendarId: e.target.value || null, value: null, value2: null })}>
        <option value="">{(state.world && state.world.calendar && state.world.calendar.name) || "Primary calendar"}</option>
        {others.map(c => <option key={c.id} value={c.id}>{c.name || "Calendar"}</option>)}
      </select>
    );
    const box = (k) => <CalendarDateEditor value={cond[k] || null} onChange={(v) => set({ [k]: v })} calendar={cal} allowApproximate={false} />;
    body = <>{which}{box("value")}{op === "between" && <>{and}{box("value2")}</>}</>;
  } else {
    body = <input className="input" value={cond.value || ""} onChange={e => set({ value: e.target.value })} placeholder={kind === "ref" ? "Part of a name" : "Text"} style={{ width: 200 }} />;
  }
  return <div className="entry-query-value" style={{ display: "flex", alignItems: "flex-start", gap: 6, flexWrap: "wrap" }}>{body}</div>;
}

// Checkboxes for a condition that takes several values.
function EntryQueryChecks({ options, values, onChange }) {
  const picked = Array.isArray(values) ? values : [];
  if (options.length === 0) return <span style={{ fontSize: 13, color: "var(--text-dim)", fontStyle: "italic", padding: "6px 0" }}>Nothing to choose</span>;
  return (
    <div className="entry-query-checks" style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", maxWidth: 460, padding: "6px 0" }}>
      {options.map(([v, words]) => (
        <label key={v} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={picked.includes(v)} onChange={e => onChange(e.target.checked ? [...picked, v] : picked.filter(x => x !== v))} />
          <span>{words}</span>
        </label>
      ))}
    </div>
  );
}

// A record for a condition to name, picked by name: what's typed matched
// against every record's (queryRecordCandidates), each offered with its
// template or its kind, so two of one name can be told apart. A pick keeps
// the record's id, and the box shows its name as it is now.
function EntryQueryRecordPicker({ state, value, showSecrets, onChange }) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const picked = value ? queryContextOf(state, showSecrets).ref(value) : null;
  const found = useMemo(() => (open && text.trim() ? queryRecordCandidates(state, text, 8, showSecrets) : []), [state, text, open, showSecrets]);
  const choose = (id) => { onChange(id); setOpen(false); setText(""); };
  return (
    <div className="entry-query-record" style={{ position: "relative" }}>
      <input
        className="input"
        value={open ? text : (picked ? picked.name : "")}
        placeholder={value && !picked ? "(record not found)" : "Type a name"}
        onFocus={() => { setText(""); setOpen(true); }}
        onBlur={() => setOpen(false)}
        onChange={e => { setText(e.target.value); setOpen(true); }}
        onKeyDown={e => {
          if (e.key === "Enter" && found.length > 0) { e.preventDefault(); choose(found[0].id); e.currentTarget.blur(); }
          else if (e.key === "Escape") { e.preventDefault(); setOpen(false); e.currentTarget.blur(); }
        }}
        style={{ width: 220 }}
      />
      {open && found.length > 0 && (
        <div className="entry-query-record-list" style={{ position: "absolute", zIndex: 30, top: "100%", left: 0, minWidth: "100%", marginTop: 2, background: "var(--surf2)", border: "1px solid var(--border)", borderRadius: 3, boxShadow: "0 6px 18px rgba(0,0,0,0.35)" }}>
          {found.map(r => (
            <button key={r.id} type="button" className="entry-query-record-pick" onMouseDown={e => { e.preventDefault(); choose(r.id); }}
              style={{ display: "flex", justifyContent: "space-between", gap: 14, width: "100%", padding: "5px 10px", background: "none", border: "none", color: "var(--text)", textAlign: "left", cursor: "pointer", fontSize: 13, whiteSpace: "nowrap" }}>
              <span>{r.name}</span><span style={{ color: "var(--text-dim)", fontSize: 12 }}>{r.kind}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// The conditions in force while their rows are closed, as chips (Drak's
// call 3), "and" or "or" between them as the query matches all or any: a
// chip opens the rows at its condition, its × removes it, and Clear removes
// them all.
function EntryQueryChips({ query, ready, state, showSecrets, onOpenAt, onQuery }) {
  const ctx = queryContextOf(state, showSecrets);
  const remove = (id) => onQuery({ ...query, conditions: query.conditions.filter(c => c.id !== id) });
  const plain = { background: "none", border: "none", cursor: "pointer", fontSize: "inherit", fontFamily: "inherit" };
  return (
    <div className="entry-query-chips" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, padding: "10px 20px 0" }}>
      {ready.map((x, i) => (
        <React.Fragment key={x.c.id}>
          {i > 0 && <span className="entry-query-join" style={{ fontSize: 12, color: "var(--text-dim)" }}>{query.mode === "any" ? "or" : "and"}</span>}
          <span className="entry-query-chip" style={{ display: "inline-flex", alignItems: "center", border: "1px solid var(--border)", borderRadius: 12, background: "var(--surf2)", fontSize: 12.5 }}>
            <button type="button" className="entry-query-chip-text" title="Change this condition" onClick={() => onOpenAt(x.c.id)} style={{ ...plain, color: "var(--text)", padding: "3px 4px 3px 10px" }}>{queryChipText(x.c, x.f, ctx)}</button>
            <button type="button" className="entry-query-chip-remove" title="Remove this condition" aria-label="Remove this condition" onClick={() => remove(x.c.id)} style={{ ...plain, color: "var(--text-dim)", padding: "3px 9px 3px 4px" }}>×</button>
          </span>
        </React.Fragment>
      ))}
      <button type="button" className="btn btn-ghost btn-small entry-query-clear" onClick={() => onQuery({ ...query, conditions: [] })}>Clear</button>
    </div>
  );
}
'''

# ===================================================== 05: a Number field's value
edit(MODULES / "05_field-system.jsx", [
    (
        B(r'''
// Validate required-field constraints on an entry's field values. Returns array of
'''),
        B(r'''
// A Number field's value as a number (v1.7 r045): the form stores the
// input's text, so text that reads as a number is one, and anything else,
// blank included, is none. The required check and the entry list's
// conditions read it.
const fieldNumberValue = (v) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

// Validate required-field constraints on an entry's field values. Returns array of
'''),
    ),
    (
        B(r'''
    } else if (f.type === "number") {
      if (typeof v !== "number" || Number.isNaN(v)) missing = true;
'''),
        B(r'''
    } else if (f.type === "number") {
      if (fieldNumberValue(v) == null) missing = true;
'''),
    ),
])

# ===================================================== 13: the queries and the list
edit(MODULES / "13_form-engine-display.jsx", [
    (
        "function EntryList({ entries, templates, search, onSearch, sortBy, onSort, onSelect, showTemplate, variantAxis, onSetVariant }) {\n",
        "function EntryList({ entries, templates, search, onSearch, sortBy, onSort, onSelect, showTemplate, variantAxis, onSetVariant, query, onQuery, queryFields, total, scopeEntries, state, showSecrets }) {\n",
    ),
    (
        B(r'''
  const showVariantPicker = variantAxis && (variantAxis.values.length > 0 || variantAxis.active);
'''),
        B(r'''
  const showVariantPicker = variantAxis && (variantAxis.values.length > 0 || variantAxis.active);
  // v1.7 r045: Filter opens the conditions' rows (EntryQueryRows), and while
  // they're closed the conditions in force show as chips (Drak's call 3), a
  // chip opening the rows at its condition; while anything narrows the list,
  // the count says how many of the scope's entries it shows.
  const [filterOpen, setFilterOpen] = useState(false);
  const [focusId, setFocusId] = useState(null);
  const q = query || QUERY_EMPTY;
  const ready = onQuery ? queryReadyConditions(q, queryFields) : [];
  const narrowed = ready.length > 0 || !!(search && search.trim());
  const openRows = (id) => {
    if (q.conditions.length === 0) onQuery({ ...q, conditions: [queryNewCondition((queryFields || [])[0])] });
    setFocusId(id || null);
    setFilterOpen(true);
  };
  const closeRows = () => {
    const keep = q.conditions.filter(c => ready.some(x => x.c === c));
    if (keep.length !== q.conditions.length) onQuery({ ...q, conditions: keep });
    setFilterOpen(false);
    setFocusId(null);
  };
'''),
    ),
    (
        B(r'''
        <input className="search-input" placeholder="Search entries..." value={search} onChange={e => onSearch(e.target.value)} />
'''),
        B(r'''
        <input className="search-input" placeholder="Search entries..." value={search} onChange={e => onSearch(e.target.value)} />
        {onQuery && (
          <button type="button" className={`btn ${filterOpen || ready.length > 0 ? "btn-accent" : "btn-ghost"} entry-filter-btn`} aria-expanded={filterOpen} title="Narrow this list by its fields" onClick={() => (filterOpen ? closeRows() : openRows(null))} style={{ flexShrink: 0 }}>
            {ready.length > 0 ? `Filter · ${ready.length}` : "Filter"}
          </button>
        )}
'''),
    ),
    (
        B(r'''
          <option value="created-asc">Oldest created</option>
        </select>
      </div>
      <div className="entry-list">
'''),
        B(r'''
          <option value="created-asc">Oldest created</option>
        </select>
        {onQuery && narrowed && <span className="entry-list-count" style={{ fontSize: 12.5, color: "var(--text-dim)", whiteSpace: "nowrap", flexShrink: 0 }}>{entries.length} of {total}</span>}
      </div>
      {onQuery && filterOpen && <EntryQueryRows query={q} fields={queryFields || []} state={state} entries={scopeEntries} templates={templates} showSecrets={showSecrets} focusId={focusId} onQuery={onQuery} onDone={closeRows} />}
      {onQuery && !filterOpen && ready.length > 0 && <EntryQueryChips query={q} ready={ready} state={state} showSecrets={showSecrets} onOpenAt={openRows} onQuery={onQuery} />}
      <div className="entry-list">
'''),
    ),
    (
        '<div className="empty-text">{search ? "Nothing matches that search." : "No entries yet."}</div>',
        '<div className="empty-text">{ready.length > 0 ? "Nothing matches these conditions." : search ? "Nothing matches that search." : "No entries yet."}</div>',
    ),
    (
        ENTRY_VIEW + "\n",
        QUERIES + "\n" + ENTRY_VIEW + "\n",
    ),
])

# ===================================================== 12: the scope, the query, All entries
edit(MODULES / "12_trunk.jsx", [
    (
        B(r'''
  const [sortBy, setSortBy] = useState("name-asc");
'''),
        B(r'''
  const [sortBy, setSortBy] = useState("name-asc");
  // v1.7 r045: the entry list's conditions, all or any (EntryList), page
  // state as the search is, and cleared with it when a scope is picked.
  const [entryQuery, setEntryQuery] = useState(QUERY_EMPTY);
'''),
    ),
    (
        B(r'''
  const filteredEntries = useMemo(() => {
    if (!state) return [];
    let entries = state.entries;
'''),
        B(r'''
  // v1.7 r045: the list's scope, a template, a tag, or All entries, after
  // the variant filter (listScope); the conditions and the search narrow it,
  // both reading what an entry's page shows, and the sort comes last.
  const listScope = useMemo(() => {
    if (!state || view !== "list") return [];
    let entries = state.entries;
'''),
    ),
    (
        B(r'''
    else if (activeTemplateId) entries = entries.filter(e => e.templateId === activeTemplateId);
    if (search.trim()) {
      const q = search.toLowerCase();
      entries = entries.filter(e =>
        e.name.toLowerCase().includes(q)
        || (e.tags || []).some(t => t.toLowerCase().includes(q))
        || JSON.stringify(e.fields || {}).toLowerCase().includes(q)
      );
    }
    const [k, dir] = sortBy.split("-");
'''),
        B(r'''
    else if (activeTemplateId) entries = entries.filter(e => e.templateId === activeTemplateId);
    return entries;
  }, [state, activeTagFilter, activeTemplateId, variantAxisInfo, view]);
  // The fields a condition can name: the scope's templates' (queryFieldsOf),
  // with Template among them where the scope spans more than one.
  const queryFields = useMemo(() => {
    if (!state || view !== "list") return [];
    const all = Array.isArray(state.templates) ? state.templates : [];
    const ids = activeTagFilter ? new Set(listScope.map(e => e.templateId)) : activeTemplateId ? new Set([activeTemplateId]) : null;
    const tpls = ids ? all.filter(t => t && ids.has(t.id)) : all;
    return queryFieldsOf(tpls, tpls.length > 1, showSecrets);
  }, [state, view, activeTemplateId, activeTagFilter, listScope, showSecrets]);
  const filteredEntries = useMemo(() => {
    let entries = queryApply(state, listScope, entryQuery, queryFields, showSecrets);
    const q = search.trim().toLowerCase();
    if (q) entries = entries.filter(e => queryTextOf(state, e, showSecrets).includes(q));
    const [k, dir] = sortBy.split("-");
'''),
    ),
    (
        "  }, [state, activeTagFilter, activeTemplateId, search, sortBy, variantAxisInfo]);\n",
        "  }, [state, listScope, entryQuery, queryFields, search, sortBy, showSecrets]);\n",
    ),
    (
        'clearDraftAndStorage(); setSearch(""); setView("list");',
        'clearDraftAndStorage(); setSearch(""); setEntryQuery(QUERY_EMPTY); setView("list");',
        2,
    ),
    (
        'clearDraftAndStorage(); setSearch(""); setView(v);',
        'clearDraftAndStorage(); setSearch(""); setEntryQuery(QUERY_EMPTY); setView(v);',
    ),
    (
        B(r'''
  const selectView = (v) => {
'''),
        B(r'''
  // v1.7 r045: the list over every entry in the world, whatever its template.
  const selectAllEntries = () => {
    if (!confirmDiscardDraft()) return;
    setActiveTemplateId(null); setActiveTagFilter(null); setActiveEntryId(null);
    clearDraftAndStorage(); setSearch(""); setEntryQuery(QUERY_EMPTY); setView("list");
  };

  const selectView = (v) => {
'''),
    ),
    (
        B(r'''
    else if (activeTemplate) { headerTitle = activeTemplate.name; headerIcon = activeTemplate; }
  } else if ((view === "entry" || view === "entry-edit") && activeEntry) {
'''),
        B(r'''
    else if (activeTemplate) { headerTitle = activeTemplate.name; headerIcon = activeTemplate; }
    else if (!activeTemplateId) headerTitle = "All entries";
  } else if ((view === "entry" || view === "entry-edit") && activeEntry) {
'''),
    ),
    (
        B(r'''
        onSelectTag={selectTag}
        onSelectView={selectView}
'''),
        B(r'''
        onSelectTag={selectTag}
        onSelectAllEntries={selectAllEntries}
        onSelectView={selectView}
'''),
    ),
    (
        B(r'''
              onSelect={openEntry}
              showTemplate={!!activeTagFilter}
              variantAxis={variantAxisInfo}
              onSetVariant={(v) => updateWorldMeta({ variantAxis: { ...state.world.variantAxis, active: v } })}
'''),
        B(r'''
              key={activeTagFilter ? `tag:${activeTagFilter}` : activeTemplateId ? `tpl:${activeTemplateId}` : "all"}
              onSelect={openEntry}
              showTemplate={!!activeTagFilter || !activeTemplateId}
              variantAxis={variantAxisInfo}
              onSetVariant={(v) => updateWorldMeta({ variantAxis: { ...state.world.variantAxis, active: v } })}
              query={entryQuery}
              onQuery={setEntryQuery}
              queryFields={queryFields}
              total={listScope.length}
              scopeEntries={listScope}
              state={state}
              showSecrets={showSecrets}
'''),
    ),
    (
        "function Sidebar({ state, activeTemplateId, activeTagFilter, activeView, templateCounts, tagCounts, allTags, onSelectTemplate, onSelectTag, ",
        "function Sidebar({ state, activeTemplateId, activeTagFilter, activeView, templateCounts, tagCounts, allTags, onSelectTemplate, onSelectTag, onSelectAllEntries, ",
    ),
    (
        B(r'''
          {!templatesCollapsed && displayedTemplates.length === 0 && <div style={{ padding: "5px 14px", fontSize: 12, color: "var(--text-dim)", fontStyle: "italic" }}>No templates yet</div>}
'''),
        B(r'''
          {/* v1.7 r045: the list over every entry, whatever its template */}
          {onSelectAllEntries && (() => {
            const isActive = activeView === "list" && !activeTemplateId && !activeTagFilter;
            const n = Array.isArray(state.entries) ? state.entries.length : 0;
            return (
              <button className={`nav-item nav-item-all ${isActive ? "active" : ""}`} onClick={onSelectAllEntries} title="Every entry in the world, whatever its template">
                <span className="nav-icon" style={isActive ? { color: "var(--accent)" } : {}}>≡</span>
                <span className="nav-name">All entries</span>
                {n ? <span className="nav-count">{n}</span> : null}
              </button>
            );
          })()}
          {!templatesCollapsed && displayedTemplates.length === 0 && <div style={{ padding: "5px 14px", fontSize: 12, color: "var(--text-dim)", fontStyle: "italic" }}>No templates yet</div>}
'''),
    ),
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
        staged.append((path, text))
    for path, text in staged:
        path.write_text(text, encoding="utf-8")
    print(f"r045 applied to {len(staged)} files")


if __name__ == "__main__":
    main()
