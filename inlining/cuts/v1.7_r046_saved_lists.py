"""
v1.7 r046: saved lists in the world, Pipes' eighth cut.

docs/pipes-spec.md, section 6, with the two details Drak settled at the cut
(2026-10-30, one per message: a, A):

1. Where Lists sits in the sidebar. A section of its own right after
   Templates, before Packs and Tags, shown once a list exists, as Packs and
   Tags are.
2. How a list is renamed, reordered, and deleted. From the open list's
   header: Rename turns the title into a box, as a story's Rename does on
   Fabula's index (Enter or leaving keeps the name, Esc puts the old one
   back), and Delete list asks in the delete modal, which says the entries
   stay. A list's row in the sidebar moves by its handle, as a template's
   does.

With them, Claude's defaults, said before the first call and not stopped: a
list keeps its name, its scope (a template, a tag, or All entries), All or
Any, and the conditions in force, a row without its value left out as Done
leaves it, and not the search; an open list's header is its name and the
sidebar marks it rather than its template, a change to its conditions
leaving the saved list as it is until Save, Save as new making another, and
picking another scope leaving it as saved; the save format, for good, is
state.lists, each { id, name, scope, mode, conditions }, a condition naming
its field by label (matched case aside), a group's subfield by the labels
down to it, a date range by its end, and a record or a template by id,
normalized at every load by migrate(), so it travels with the world file,
snapshots, backups, and import, and a world from before it loads with none;
a condition whose label no template of the scope has shows as a chip marked
field not found and holds for no entry until its row picks a field, a list
whose template was deleted opens marked template not found and empty, and a
tag no entry carries opens empty; a record's delete empties the value of a
condition that names it, the condition kept, and the delete modal counts
it, and a template's delete clears it from Template conditions; while
secrets are hidden a condition on a secret field reads the field as empty,
as the page does, and its chip doesn't say what it asks; in Lock mode Save,
rename, reorder, and delete wait, and opening a list doesn't; the rows in
Lists carry no count; and three roadmap rows on the files the cut edits
ride along, closed: a condition reaches a group inside a group (Group ›
Sub › Sub, any row at any level), a dropdown's Other text is a value a
condition can ask for, and each record modal keeps the focus, Tab and
Shift+Tab going round its own controls, the delete modal taking the keys at
the window as the rename modal does. With a list open, the header keeps
+ New Entry where its scope is a template; the template's Export and Edit
Template stay on the template's own page.

Settled in the build, after the calls: a disabled ghost button dims, as a
disabled accent or danger button does, since the rows' Save waits disabled
until the page differs from the open list; the one rule in the shell dims
every disabled ghost button in the app that its own style didn't already.
And the conditions and an open list keep to their scope on the ways onto
the entry list that don't pick one: ← Back from an entry comes back on the
scope the list was left on, a tag or every entry as well as a template (it
came back on the last entry's template), so a list open there is open
again; a template picked on a pack's page or the Project page is picked as
the sidebar picks it, clearing the search, the conditions, and a tag; and
a template saved new opens on its own page, clean. Each was older than the
cut, which made it show: a condition the scope can't read now holds for no
entry, where it was dropped. A fourth, found by the read of r046's turnover
after Drak's first pass and fixed by his call: an entry deleted after a link
followed from a list's entry, or deleted from under Back, lands on the list
the chain of entries started from, on its own scope, as Back does, where it
landed on the deleted entry's template.

- 13_form-engine-display: the queries reach nested groups (queryFieldKey,
  queryParse, queryFieldsOf, queryHasPath, queryValuesOf) and an Other's
  text (queryTest, queryValueOptions); a condition on a secret field while
  secrets are hidden, or on a field not found, stays in force
  (queryReadyAnyKind, queryReadyConditions, queryApply), with its row and
  chip; the rows' Save list, Save, and Save as new; and the lists under a
  header of their own after the queries: a list's query and back, whether
  the page's differs, its scope, and what a delete does to it.
- 12_trunk: the open list, its Save, Rename, Delete, and order; the Lists
  section in the sidebar, which marks an open list rather than its scope;
  the header's title and buttons; a template's delete, which tells and
  clears the lists that name it; and the scope a Back returns to, a pick
  on a pack's page or the Project page, a template saved new, and the list
  an entry's delete lands on.
- 10_migrate: normalizeEntryLists, run at every load.
- 09_trunk: a new world starts with no lists.
- 22_trunk: a delete counts the lists whose conditions name what goes
  (linkDeleteCounts) and empties those values (clearLinksTo).
- 29_modals: the delete modal's line for the lists; both record modals keep
  the focus (modalTabCycle), and the delete modal takes the keys at the
  window.
- shell.html: `.btn-ghost:disabled`, dimmed.

Declared scope: 09_trunk, 10_migrate, 12_trunk, 13_form-engine-display,
22_trunk, 29_modals, and one rule in the shell's CSS.
Declarations added: queryHasPath, queryReadyAnyKind, LIST_PSEUDO_LABELS,
listFieldKey, listFieldLabel, listValueOf, queryFromList, listConditionsOf,
listDiffers, listScopeOf, listScopeMatches, listNames, listWithout,
listTemplateGoes, normalizeEntryLists, modalTabCycle. None removed. One
header added: `Saved lists (v1.7 r046)`.

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given), and nothing is written unless every anchor in
every file holds. Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r046_saved_lists.py
"""
from pathlib import Path

ROOT = next(p for p in Path(__file__).resolve().parents if (p / 'cartulary-src').is_dir())
MODULES = ROOT / "cartulary-src" / "modules"
SHELL = ROOT / "cartulary-src" / "shell.html"

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
LISTS = header("Saved lists (v1.7 r046)") + "\n" + r'''// docs/pipes-spec.md, section 6, with Drak's calls at the cut: the Filter's
// Save names the query in force, and the world keeps it (state.lists,
// normalized at every load by normalizeEntryLists, 10_migrate): its name,
// its scope (every entry, a template by id, or a tag), all or any, and its
// conditions. A condition keeps its field by the labels down to it (with a
// date range's end), so a field renamed or gone shows as not found until
// its row picks another, and a record or a template by id, so a rename
// leaves it and a delete empties it (clearLinksTo, 22_trunk). The sidebar
// lists them after Templates (call 1); an open list is renamed and deleted
// from its header, and its row in the sidebar moves by its handle (call 2).

// A pseudo-field's label, as a row and a chip name it.
const LIST_PSEUDO_LABELS = { name: "Name", tags: "Tags", template: "Template", linked: "Linked with" };

// A kept field's key, as the query's fields carry it, and its label, as a
// row names it.
const listFieldKey = (field) => (typeof field === "string" ? field
  : field && Array.isArray(field.labels) ? queryFieldKey(field.labels, field.end || null) : "");
const listFieldLabel = (field) => (typeof field === "string" ? (LIST_PSEUDO_LABELS[field] || field)
  : field && Array.isArray(field.labels) ? `${field.labels.join(" › ")}${field.end ? ` · ${field.end}` : ""}` : "");

// A condition's value as a list keeps it: text as typed, a date as its
// year, month, and day, and anything else as nothing.
const listValueOf = (v) => (typeof v === "string" ? v
  : typeof v === "number" && Number.isFinite(v) ? String(v)
  : v && typeof v === "object" && v.year != null ? { year: v.year, monthIndex: v.monthIndex || 0, day: v.day || 1 } : "");

// A list's query, as the entry list holds it: each condition with its
// field's key and its label.
const queryFromList = (list) => ({
  mode: list && list.mode === "any" ? "any" : "all",
  conditions: (list && Array.isArray(list.conditions) ? list.conditions : []).filter(c => c && c.field).map(c => ({
    id: c.id || `qc-${genId()}`, key: listFieldKey(c.field), field: c.field, label: listFieldLabel(c.field), op: c.op,
    value: c.value == null ? "" : c.value, value2: c.value2 == null ? "" : c.value2,
    values: Array.isArray(c.values) ? [...c.values] : [], calendarId: c.calendarId || null,
  })),
});

// The conditions a list keeps of a query: those in force, each as kept.
const listConditionsOf = (query, fields, all) => queryReadyConditions(query, fields, all).map(({ c, f }) => ({
  id: c.id, field: f ? f.field : c.field, op: c.op, value: listValueOf(c.value), value2: listValueOf(c.value2),
  values: Array.isArray(c.values) ? c.values.filter(v => typeof v === "string") : [], calendarId: c.calendarId || null,
}));

// Whether the page's query differs from what a list keeps.
const listDiffers = (list, query, fields, all) => {
  if (!list) return false;
  const now = { mode: query && query.mode === "any" ? "any" : "all", conditions: listConditionsOf(query, fields, all) };
  const was = { mode: list.mode === "any" ? "any" : "all", conditions: listConditionsOf(queryFromList(list), fields, all) };
  return JSON.stringify(now) !== JSON.stringify(was);
};

// The page's scope as a list keeps it, and whether a list's is the page's.
const listScopeOf = (templateId, tag) => (tag ? { kind: "tag", tag } : templateId ? { kind: "template", templateId } : { kind: "all" });
const listScopeMatches = (scope, templateId, tag) => {
  const s = scope || { kind: "all" };
  if (s.kind === "tag") return tag === s.tag;
  if (s.kind === "template") return !tag && templateId === s.templateId;
  return !tag && !templateId;
};

// Whether a list's conditions name any of ids, and the list with those
// values emptied, each condition kept in its place.
const listNames = (list, ids) => !!list && Array.isArray(list.conditions) && list.conditions.some(c => c && (
  (typeof c.value === "string" && ids.has(c.value)) || (typeof c.value2 === "string" && ids.has(c.value2))
  || (Array.isArray(c.values) && c.values.some(v => ids.has(v)))));
const listWithout = (list, ids) => ({
  ...list,
  conditions: list.conditions.map(c => (c && listNames({ conditions: [c] }, ids) ? {
    ...c,
    value: typeof c.value === "string" && ids.has(c.value) ? "" : c.value,
    value2: typeof c.value2 === "string" && ids.has(c.value2) ? "" : c.value2,
    values: Array.isArray(c.values) ? c.values.filter(v => !ids.has(v)) : c.values,
  } : c)),
});

// What a template's delete does to the saved lists, a line for its modal,
// or none: a list scoped to it stays and shows no entries, and a Template
// condition naming it loses it.
const listTemplateGoes = (state, tid) => {
  const ls = state && Array.isArray(state.lists) ? state.lists : [];
  const ids = new Set([tid]);
  const scoped = ls.filter(l => l && l.scope && l.scope.kind === "template" && l.scope.templateId === tid).length;
  const named = ls.filter(l => listNames(l, ids)).length;
  const lines = [];
  if (scoped) lines.push(scoped === 1 ? "A saved list scoped to it stays and will show no entries." : `${scoped} saved lists scoped to it stay and will show no entries.`);
  if (named) lines.push(named === 1 ? "A saved list's conditions lose it; the list stays." : `${named} saved lists' conditions lose it; the lists stay.`);
  return lines.length ? lines.join(" ") : null;
};'''


edit(MODULES / "13_form-engine-display.jsx", [
    # EntryList takes the open list, the fields secrets included, and the Save.
    ("function EntryList({ entries, templates, search, onSearch, sortBy, onSort, onSelect, showTemplate, variantAxis, onSetVariant, query, onQuery, queryFields, total, scopeEntries, state, showSecrets }) {",
     "function EntryList({ entries, templates, search, onSearch, sortBy, onSort, onSelect, showTemplate, variantAxis, onSetVariant, query, onQuery, queryFields, queryAllFields, total, scopeEntries, state, showSecrets, list, listChanged, onSaveList, onUpdateList, scopeNote }) {"),
    ("  // the count says how many of the scope's entries it shows.\n",
     "  // the count says how many of the scope's entries it shows. Since r046 the\n"
     "  // rows' Save keeps the query in a list (onSaveList, or onUpdateList for\n"
     "  // the open one), and a condition the scope can't read stays in force.\n"),
    ("  const ready = onQuery ? queryReadyConditions(q, queryFields) : [];",
     "  const ready = onQuery ? queryReadyConditions(q, queryFields, queryAllFields) : [];"),
    ("      {onQuery && filterOpen && <EntryQueryRows query={q} fields={queryFields || []} state={state} entries={scopeEntries} templates={templates} showSecrets={showSecrets} focusId={focusId} onQuery={onQuery} onDone={closeRows} />}",
     "      {scopeNote && <div className=\"entry-list-note\" style={{ padding: \"10px 20px 0\", fontSize: 13, color: \"var(--text-dim)\", fontStyle: \"italic\" }}>{scopeNote}</div>}\n"
     "      {onQuery && filterOpen && <EntryQueryRows query={q} fields={queryFields || []} allFields={queryAllFields || queryFields || []} state={state} entries={scopeEntries} templates={templates} showSecrets={showSecrets} focusId={focusId} onQuery={onQuery} onDone={closeRows} list={list} listChanged={listChanged} onSaveList={onSaveList} onUpdateList={onUpdateList} />}"),
    # The queries' opening comment, as the turnover's read had it right.
    ("// list's conditions and its search read what an entry's page shows, never a\n"
     "// field's label, an id, or a stored key. A condition is a field, an\n",
     "// list's search reads what an entry's page shows, and its conditions a\n"
     "// field by its label, never an id or a stored key. A condition is a field, an\n"),
    # Keys and fields reach a group inside a group.
    ("// A field's key: its label, a subfield's label under a group's, and a date\n"
     "// range's end, each as a condition matches it.\n"
     "const queryFieldKey = (label, sub, end) => JSON.stringify([\"f\", queryLower(label), sub ? queryLower(sub) : null, end || null]);\n"
     "\n"
     "// A key read back: a pseudo-field's name (Name, Tags, Template, Linked\n"
     "// with), or { label, sub, end }; null for anything else.\n"
     "const queryParse = (key) => {\n"
     "  if (key === \"name\" || key === \"tags\" || key === \"template\" || key === \"linked\") return { pseudo: key };\n"
     "  if (typeof key !== \"string\") return null;\n"
     "  try {\n"
     "    const p = JSON.parse(key);\n"
     "    return Array.isArray(p) && p[0] === \"f\" && typeof p[1] === \"string\" ? { label: p[1], sub: p[2] || null, end: p[3] || null } : null;\n"
     "  } catch (e) { return null; }\n"
     "};\n",
     B(r'''
// A field's key: the labels down to it, from its template's field through
// the groups that hold it (since v1.7 r046, where a group's subfield had
// one level), and a date range's end, each as a condition matches it.
const queryFieldKey = (labels, end) => JSON.stringify(["f", (Array.isArray(labels) ? labels : [labels]).map(queryLower), end || null]);

// A key read back: a pseudo-field's name (Name, Tags, Template, Linked
// with), or { labels, end }; null for anything else.
const queryParse = (key) => {
  if (key === "name" || key === "tags" || key === "template" || key === "linked") return { pseudo: key };
  if (typeof key !== "string") return null;
  try {
    const p = JSON.parse(key);
    return Array.isArray(p) && p[0] === "f" && Array.isArray(p[1]) && p[1].length > 0 && p[1].every(x => typeof x === "string") ? { labels: p[1], end: p[2] || null } : null;
  } catch (e) { return null; }
};
''')),
    ("// The fields a condition can name over a scope's templates, in their order:\n"
     "// Name first; each label a template gives a field, case aside, with the kind\n"
     "// its fields hold (text where two templates give it different kinds) and\n"
     "// the options they offer; a group's subfields under the group's label; a\n"
     "// date range's start and end as two, as Chronometric draws a range; then\n"
     "// Tags, Template where the scope spans templates, and Linked with. A secret\n"
     "// field is offered only while secrets show.\n"
     "const queryFieldsOf = (templates, spans, showSecrets) => {\n"
     "  const out = [{ key: \"name\", label: \"Name\", kind: \"text\", options: [] }];\n"
     "  const byKey = new Map();\n"
     "  const add = (key, label, kind, f) => {\n"
     "    let x = byKey.get(key);\n"
     "    if (!x) { x = { key, label, kind, options: [] }; byKey.set(key, x); out.push(x); }\n",
     B(r'''
// The fields a condition can name over a scope's templates, in their order:
// Name first; each label a template gives a field, case aside, with the kind
// its fields hold (text where two templates give it different kinds) and
// the options they offer; a group's subfields under the group's label, and
// since v1.7 r046 a group's inside it under both, at any depth; a date
// range's start and end as two, as Chronometric draws a range; then Tags,
// Template where the scope spans templates, and Linked with. A secret field
// is offered only while secrets show. Each carries its key, its label as a
// row names it, and its field as a saved list keeps it, the labels as the
// first template to give them has them.
const queryFieldsOf = (templates, spans, showSecrets) => {
  const out = [{ key: "name", field: "name", label: "Name", kind: "text", options: [] }];
  const byKey = new Map();
  const add = (labels, end, label, kind, f) => {
    const key = queryFieldKey(labels, end);
    let x = byKey.get(key);
    if (!x) { x = { key, field: end ? { labels, end } : { labels }, label, kind, options: [] }; byKey.set(key, x); out.push(x); }
''')),
    ("  const one = (f, group) => {\n"
     "    if (!f || typeof f.label !== \"string\" || !f.label.trim() || (f.secret && !showSecrets)) return;\n"
     "    const label = group ? `${group.label} › ${f.label}` : f.label;\n"
     "    const key = (end) => (group ? queryFieldKey(group.label, f.label, end) : queryFieldKey(f.label, null, end));\n"
     "    if (f.type === \"calendar-date-range\") {\n"
     "      add(key(\"start\"), `${label} · start`, \"date\", f);\n"
     "      add(key(\"end\"), `${label} · end`, \"date\", f);\n"
     "      return;\n"
     "    }\n"
     "    if (QUERY_KINDS[f.type]) add(key(null), label, QUERY_KINDS[f.type], f);\n"
     "  };\n"
     "  (Array.isArray(templates) ? templates : []).forEach(t => (t && Array.isArray(t.fields) ? t.fields : []).forEach(f => {\n"
     "    if (f && f.type === \"group\") {\n"
     "      if (typeof f.label === \"string\" && f.label.trim() && !(f.secret && !showSecrets)) (Array.isArray(f.subfields) ? f.subfields : []).forEach(s => one(s, f));\n"
     "    } else one(f, null);\n"
     "  }));\n"
     "  out.push({ key: \"tags\", label: \"Tags\", kind: \"multi\", options: [] });\n"
     "  if (spans) out.push({ key: \"template\", label: \"Template\", kind: \"template\", options: [] });\n"
     "  out.push({ key: \"linked\", label: \"Linked with\", kind: \"linked\", options: [] });\n"
     "  return out;\n"
     "};\n",
     B(r'''
  const walk = (fields, above) => (Array.isArray(fields) ? fields : []).forEach(f => {
    if (!f || typeof f.label !== "string" || !f.label.trim() || (f.secret && !showSecrets)) return;
    const labels = [...above, f.label];
    if (f.type === "group") { walk(f.subfields, labels); return; }
    const label = labels.join(" › ");
    if (f.type === "calendar-date-range") {
      add(labels, "start", `${label} · start`, "date", f);
      add(labels, "end", `${label} · end`, "date", f);
      return;
    }
    if (QUERY_KINDS[f.type]) add(labels, null, label, QUERY_KINDS[f.type], f);
  });
  (Array.isArray(templates) ? templates : []).forEach(t => walk(t && t.fields, []));
  out.push({ key: "tags", field: "tags", label: "Tags", kind: "multi", options: [] });
  if (spans) out.push({ key: "template", field: "template", label: "Template", kind: "template", options: [] });
  out.push({ key: "linked", field: "linked", label: "Linked with", kind: "linked", options: [] });
  return out;
};
''')),
    ("// An entry's values for a parsed field, each { field, value }: null when the\n"
     "// entry's template has no such field, and otherwise the values the page\n"
     "// would show, a field hidden by its show-when or as a secret while secrets\n"
     "// are hidden left out, a group's rows each in turn, and a date range's end\n"
     "// read as a date.\n"
     "const queryValuesOf = (entry, tpl, p, showSecrets) => {\n"
     "  const fields = tpl && Array.isArray(tpl.fields) ? tpl.fields : [];\n"
     "  const vals = (entry && entry.fields) || {};\n"
     "  const seen = (f) => !(f.secret && !showSecrets);\n"
     "  const isRange = (f) => f.type === \"calendar-date-range\";\n"
     "  let has = false;\n"
     "  const out = [];\n"
     "  const take = (f, v) => {\n"
     "    if (!p.end) { out.push({ field: f, value: v }); return; }\n"
     "    out.push({ field: { ...f, type: \"calendar-date\" }, value: v && typeof v === \"object\" ? v[p.end] : null });\n"
     "  };\n"
     "  fields.forEach(f => {\n"
     "    if (!f || queryLower(f.label) !== p.label) return;\n"
     "    if (p.sub) {\n"
     "      if (f.type !== \"group\") return;\n"
     "      const subs = (Array.isArray(f.subfields) ? f.subfields : []).filter(s => s && queryLower(s.label) === p.sub && (p.end ? isRange(s) : !isRange(s)));\n"
     "      if (subs.length === 0) return;\n"
     "      has = true;\n"
     "      if (!seen(f) || !isFieldVisible(f, vals)) return;\n"
     "      (Array.isArray(vals[f.id]) ? vals[f.id] : []).forEach(inst => {\n"
     "        if (!inst || typeof inst !== \"object\") return;\n"
     "        subs.forEach(s => { if (seen(s) && isFieldVisible(s, inst)) take(s, inst[s.id]); });\n"
     "      });\n"
     "      return;\n"
     "    }\n"
     "    if (f.type === \"group\" || (p.end ? !isRange(f) : isRange(f))) return;\n"
     "    has = true;\n"
     "    if (seen(f) && isFieldVisible(f, vals)) take(f, vals[f.id]);\n"
     "  });\n"
     "  return has ? out : null;\n"
     "};\n",
     B(r'''
// Whether a template's fields hold the labels from i down, ending at a field
// a condition reads: a date range where end is set, never a group.
const queryHasPath = (fields, labels, i, end) => (Array.isArray(fields) ? fields : []).some(f => {
  if (!f || queryLower(f.label) !== labels[i]) return false;
  if (i < labels.length - 1) return f.type === "group" && queryHasPath(f.subfields, labels, i + 1, end);
  return f.type !== "group" && (end ? f.type === "calendar-date-range" : f.type !== "calendar-date-range");
});

// An entry's values for a parsed field, each { field, value }: null when the
// entry's template has no such field, and otherwise the values the page
// would show, a field hidden by its show-when or as a secret while secrets
// are hidden left out, a group's rows each in turn, at every depth since
// v1.7 r046, and a date range's end read as a date.
const queryValuesOf = (entry, tpl, p, showSecrets) => {
  const fields = tpl && Array.isArray(tpl.fields) ? tpl.fields : [];
  if (!p || !Array.isArray(p.labels) || !queryHasPath(fields, p.labels, 0, p.end)) return null;
  const seen = (f) => !(f.secret && !showSecrets);
  const last = p.labels.length - 1;
  const out = [];
  const walk = (list, vals, i) => (Array.isArray(list) ? list : []).forEach(f => {
    if (!f || queryLower(f.label) !== p.labels[i] || !seen(f) || !isFieldVisible(f, vals)) return;
    if (i < last) {
      if (f.type !== "group") return;
      (Array.isArray(vals[f.id]) ? vals[f.id] : []).forEach(inst => { if (inst && typeof inst === "object") walk(f.subfields, inst, i + 1); });
      return;
    }
    if (f.type === "group" || (p.end ? f.type !== "calendar-date-range" : f.type === "calendar-date-range")) return;
    const v = vals[f.id];
    out.push(p.end ? { field: { ...f, type: "calendar-date" }, value: v && typeof v === "object" ? v[p.end] : null } : { field: f, value: v });
  });
  walk(fields, (entry && entry.fields) || {}, 0);
  return out;
};
''')),
    # A dropdown's Other text is a value a condition can ask for.
    ("  if (kind === \"choice\") {\n"
     "    const o = queryLower(selectValueOnly(v));\n"
     "    return c.op === \"anyOf\" ? (c.values || []).some(x => queryLower(x) === o) : o === queryLower(c.value);\n"
     "  }\n",
     B(r'''
  if (kind === "choice") {
    // the option picked, or since v1.7 r046 an Other's text, as the page shows it
    const o = queryLower(selectValueOnly(v)), d = queryLower(formatSelectDisplay(v));
    const is = (x) => { const w = queryLower(x); return w !== "" && (w === o || w === d); };
    return c.op === "anyOf" ? (c.values || []).some(is) : is(c.value);
  }
''')),
    ("// A query's conditions in force, each { c, f } with the field it names in\n"
     "// fields.\n"
     "const queryReadyConditions = (query, fields) => {\n"
     "  const byKey = new Map((Array.isArray(fields) ? fields : []).map(f => [f.key, f]));\n"
     "  return (query && Array.isArray(query.conditions) ? query.conditions : [])\n"
     "    .map(c => ({ c, f: c ? byKey.get(c.key) : null }))\n"
     "    .filter(x => x.f && queryReady(x.c, x.f.kind));\n"
     "};\n",
     B(r'''
// Whether a condition whose field isn't found has what its operator would
// need, whatever the field's kind (v1.7 r046).
const queryReadyAnyKind = (c) => {
  if (!c || typeof c.op !== "string") return false;
  const set = (v) => (typeof v === "string" ? v.trim() !== "" : !!(v && typeof v === "object" && v.year != null));
  if (c.op === "empty" || c.op === "filled") return true;
  if (c.op === "anyOf" || c.op === "hasAny" || c.op === "hasAll") return Array.isArray(c.values) && c.values.length > 0;
  if (c.op === "between") return set(c.value) && set(c.value2);
  return set(c.value);
};

// A query's conditions in force, each { c, f, missing, secret }: a condition
// with what its operator needs on a field of fields; and since v1.7 r046 one
// on a secret field while secrets are hidden (f from all, the fields with
// secrets), which reads the field as empty, as the page does, and one on a
// field no template of the scope has (missing), which holds for no entry.
const queryReadyConditions = (query, fields, all) => {
  const byKey = new Map((Array.isArray(fields) ? fields : []).map(f => [f.key, f]));
  const allByKey = Array.isArray(all) ? new Map(all.map(f => [f.key, f])) : byKey;
  return (query && Array.isArray(query.conditions) ? query.conditions : []).map(c => {
    if (!c) return null;
    const f = byKey.get(c.key);
    if (f) return queryReady(c, f.kind) ? { c, f, missing: false, secret: false } : null;
    const h = allByKey.get(c.key);
    if (h) return queryReady(c, h.kind) ? { c, f: h, missing: false, secret: true } : null;
    return queryReadyAnyKind(c) ? { c, f: null, missing: true, secret: false } : null;
  }).filter(Boolean);
};
''')),
    ("// The entries a query keeps, in their order: all of them while no condition\n"
     "// is in force.\n"
     "const queryApply = (state, entries, query, fields, showSecrets) => {\n"
     "  const ready = queryReadyConditions(query, fields);\n",
     "// The entries a query keeps, in their order: all of them while no condition\n"
     "// is in force. A condition on a field not found holds for none (r046).\n"
     "const queryApply = (state, entries, query, fields, showSecrets, all) => {\n"
     "  const ready = queryReadyConditions(query, fields, all);\n"),
    ("    const hold = (x) => queryHolds(x.c, x.f.kind, e, tpl, ctx);\n",
     "    const hold = (x) => !x.missing && queryHolds(x.c, x.f.kind, e, tpl, ctx);\n"),
    ("  return { id: id || `qc-${genId()}`, key: field ? field.key : \"name\", op: ops[0][0],",
     "  return { id: id || `qc-${genId()}`, key: field ? field.key : \"name\", field: field ? field.field : \"name\", label: field ? field.label : \"Name\", op: ops[0][0],"),
    ("        if (t === \"select\") push(selectValueOnly(v));\n",
     "        // since v1.7 r046 an Other's text too, as the page shows it\n"
     "        if (t === \"select\") { push(selectValueOnly(v)); push(formatSelectDisplay(v)); }\n"),
    # The rows: Save list, Save, and Save as new.
    ("// closes them, a row still without its value going with it.\n"
     "function EntryQueryRows({ query, fields, state, entries, templates, showSecrets, focusId, onQuery, onDone }) {\n"
     "  const set = (patch) => onQuery({ ...query, ...patch });\n",
     B(r'''
// closes them, a row still without its value going with it. Since v1.7
// r046, Save list keeps the query in force as a new list under a name; with
// a list open, Save keeps it in that list and Save as new makes another.
function EntryQueryRows({ query, fields, allFields, state, entries, templates, showSecrets, focusId, onQuery, onDone, list, listChanged, onSaveList, onUpdateList }) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const saveNew = () => {
    const n = name.trim();
    if (!n || !onSaveList) return;
    onSaveList(n);
    setNaming(false);
    setName("");
  };
  const set = (patch) => onQuery({ ...query, ...patch });
''')),
    ("          <EntryQueryRow key={c.id} cond={c} fields={fields} state={state}",
     "          <EntryQueryRow key={c.id} cond={c} fields={fields} allFields={allFields} state={state}"),
    ("        <div style={{ display: \"flex\", alignItems: \"center\", gap: 6 }}>\n"
     "          <button type=\"button\" className=\"btn btn-ghost btn-small entry-query-add\"",
     "        <div style={{ display: \"flex\", alignItems: \"center\", gap: 6, flexWrap: \"wrap\" }}>\n"
     "          <button type=\"button\" className=\"btn btn-ghost btn-small entry-query-add\""),
    ("          <span style={{ flex: 1 }} />\n"
     "          {query.conditions.length > 0 && <button type=\"button\" className=\"btn btn-ghost btn-small\" onClick={() => set({ conditions: [] })}>Clear</button>}\n",
     B(r'''
          <span style={{ flex: 1 }} />
          {onSaveList && (naming ? (
            <>
              <input className="input entry-list-name" autoFocus aria-label="List name" placeholder="List name" value={name} onChange={e => setName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") { e.preventDefault(); saveNew(); }
                  else if (e.key === "Escape") { e.preventDefault(); setNaming(false); setName(""); }
                }} style={{ width: 200 }} />
              <button type="button" className="btn btn-accent btn-small entry-list-save-new" disabled={!name.trim()} onClick={saveNew}>Save</button>
              <button type="button" className="btn btn-ghost btn-small entry-list-name-cancel" onClick={() => { setNaming(false); setName(""); }}>Cancel</button>
            </>
          ) : (
            <>
              {list && <button type="button" className="btn btn-ghost btn-small entry-list-save" disabled={!listChanged} title="Keep these conditions in the list" onClick={() => onUpdateList && onUpdateList()}>Save</button>}
              <button type="button" className="btn btn-ghost btn-small entry-list-save-as" onClick={() => setNaming(true)}>{list ? "Save as new…" : "Save list…"}</button>
            </>
          ))}
          {query.conditions.length > 0 && <button type="button" className="btn btn-ghost btn-small" onClick={() => set({ conditions: [] })}>Clear</button>}
''')),
    # A row on a secret field while secrets are hidden, or on a field gone.
    ("function EntryQueryRow({ cond, fields, state, entries, templates, showSecrets, focus, onChange, onRemove }) {",
     "function EntryQueryRow({ cond, fields, allFields, state, entries, templates, showSecrets, focus, onChange, onRemove }) {"),
    ("  const field = fields.find(f => f.key === cond.key) || null;\n"
     "  const ops = field ? QUERY_OPS[field.kind] || [] : [];\n",
     B(r'''
  const field = fields.find(f => f.key === cond.key) || null;
  // v1.7 r046: a condition on a secret field while secrets are hidden keeps
  // its place, saying no more than that, and goes only by its ×.
  if (!field && (allFields || []).some(f => f.key === cond.key)) {
    return (
      <div ref={ref} className="entry-query-row entry-query-row-secret" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ flex: "1 1 auto", fontSize: 13, color: "var(--text-dim)", fontStyle: "italic", padding: "6px 0" }}>A condition on a secret field, shown while secrets show</span>
        <button type="button" className="btn btn-ghost btn-small entry-query-remove" title="Remove this condition" aria-label="Remove this condition" onClick={onRemove} style={{ flexShrink: 0 }}>×</button>
      </div>
    );
  }
  const ops = field ? QUERY_OPS[field.kind] || [] : [];
''')),
    ("          {!field && <option value=\"\">(field not found)</option>}",
     "          {!field && <option value=\"\">{cond.label ? `${cond.label} (field not found)` : \"(field not found)\"}</option>}"),
    # The chips: a field not found, and a secret field's while hidden.
    ("            <button type=\"button\" className=\"entry-query-chip-text\" title=\"Change this condition\" onClick={() => onOpenAt(x.c.id)} style={{ ...plain, color: \"var(--text)\", padding: \"3px 4px 3px 10px\" }}>{queryChipText(x.c, x.f, ctx)}</button>",
     "            <button type=\"button\" className={`entry-query-chip-text${x.missing ? \" entry-query-chip-missing\" : \"\"}`} title=\"Change this condition\" onClick={() => onOpenAt(x.c.id)} style={{ ...plain, color: x.missing ? \"var(--danger)\" : \"var(--text)\", padding: \"3px 4px 3px 10px\" }}>{x.secret ? \"A condition on a secret field\" : x.missing ? `${x.c.label || \"A field\"}: field not found` : queryChipText(x.c, x.f, ctx)}</button>"),
    # The lists, under a header of their own after the queries.
    (ENTRY_VIEW + "\n\nfunction EntryView(",
     LISTS + "\n\n" + ENTRY_VIEW + "\n\nfunction EntryView("),
])

edit(MODULES / "12_trunk.jsx", [
    ("  const [entryQuery, setEntryQuery] = useState(QUERY_EMPTY);\n",
     B(r'''
  const [entryQuery, setEntryQuery] = useState(QUERY_EMPTY);
  // v1.7 r046: the saved list open on the entry list, and its name while
  // the header renames it (listRenameRef holds the list being renamed).
  const [activeListId, setActiveListId] = useState(null);
  const [listRenaming, setListRenaming] = useState(false);
  const [listNameText, setListNameText] = useState("");
  const listRenameRef = useRef(null);
''')),
    ("  // The fields a condition can name: the scope's templates' (queryFieldsOf),\n"
     "  // with Template among them where the scope spans more than one.\n"
     "  const queryFields = useMemo(() => {\n"
     "    if (!state || view !== \"list\") return [];\n"
     "    const all = Array.isArray(state.templates) ? state.templates : [];\n"
     "    const ids = activeTagFilter ? new Set(listScope.map(e => e.templateId)) : activeTemplateId ? new Set([activeTemplateId]) : null;\n"
     "    const tpls = ids ? all.filter(t => t && ids.has(t.id)) : all;\n"
     "    return queryFieldsOf(tpls, tpls.length > 1, showSecrets);\n"
     "  }, [state, view, activeTemplateId, activeTagFilter, listScope, showSecrets]);\n",
     B(r'''
  // The fields a condition can name: the scope's templates' (queryFieldsOf),
  // with Template among them where the scope spans more than one; and since
  // v1.7 r046 every field they hold, secrets included (queryAllFields), so a
  // saved list's condition on a secret field is told from one whose field
  // is gone.
  const queryTemplates = useMemo(() => {
    if (!state || view !== "list") return null;
    const all = Array.isArray(state.templates) ? state.templates : [];
    const ids = activeTagFilter ? new Set(listScope.map(e => e.templateId)) : activeTemplateId ? new Set([activeTemplateId]) : null;
    return ids ? all.filter(t => t && ids.has(t.id)) : all;
  }, [state, view, activeTemplateId, activeTagFilter, listScope]);
  const queryFields = useMemo(() => (queryTemplates ? queryFieldsOf(queryTemplates, queryTemplates.length > 1, showSecrets) : []), [queryTemplates, showSecrets]);
  const queryAllFields = useMemo(() => (!queryTemplates ? [] : showSecrets ? queryFields : queryFieldsOf(queryTemplates, queryTemplates.length > 1, true)), [queryTemplates, queryFields, showSecrets]);
''')),
    ("    let entries = queryApply(state, listScope, entryQuery, queryFields, showSecrets);\n",
     "    let entries = queryApply(state, listScope, entryQuery, queryFields, showSecrets, queryAllFields);\n"),
    ("  }, [state, listScope, entryQuery, queryFields, search, sortBy, showSecrets]);\n",
     "  }, [state, listScope, entryQuery, queryFields, queryAllFields, search, sortBy, showSecrets]);\n"),
    ("  const activeTemplate = state.templates.find(t => t.id === activeTemplateId);\n",
     B(r'''
  const activeTemplate = state.templates.find(t => t.id === activeTemplateId);
  // v1.7 r046: the saved list open on the entry list, while the page's scope
  // is still the list's.
  const activeList = (() => {
    if (view !== "list" || !activeListId) return null;
    const l = (Array.isArray(state.lists) ? state.lists : []).find(x => x && x.id === activeListId);
    return l && listScopeMatches(l.scope, activeTemplateId, activeTagFilter) ? l : null;
  })();
''')),
    # Picking a scope or a view leaves the open list as saved.
    ("setEntryQuery(QUERY_EMPTY);", "setEntryQuery(QUERY_EMPTY); setActiveListId(null); setListRenaming(false);", 4),
    ("  const selectView = (v) => {\n",
     B(r'''
  // v1.7 r046: a saved list opens the entry list in its scope with its
  // conditions, under its own name; picking a scope leaves it as saved.
  const openList = (id) => {
    const list = (Array.isArray(state.lists) ? state.lists : []).find(l => l && l.id === id);
    if (!list || !confirmDiscardDraft()) return;
    const sc = list.scope || { kind: "all" };
    setActiveTemplateId(sc.kind === "template" ? sc.templateId : null);
    setActiveTagFilter(sc.kind === "tag" ? sc.tag : null);
    setActiveEntryId(null);
    clearDraftAndStorage(); setSearch(""); setEntryQuery(queryFromList(list)); setActiveListId(id); setListRenaming(false); setView("list");
  };

  // The Filter's Save: a new list keeps the page's scope, all or any, and
  // the conditions in force; an open list's Save keeps the conditions in
  // it, its name and scope as they were.
  const saveListAs = (name) => {
    const n = (name || "").trim();
    if (isLocked || !n) return;
    const id = `list-${genId()}`;
    const list = { id, name: n, scope: listScopeOf(activeTemplateId, activeTagFilter), mode: entryQuery.mode === "any" ? "any" : "all", conditions: listConditionsOf(entryQuery, queryFields, queryAllFields) };
    updateState(s => ({ ...s, lists: [...(Array.isArray(s.lists) ? s.lists : []), list] }));
    setActiveListId(id);
    flash("List saved");
  };
  const updateActiveList = () => {
    if (isLocked || !activeList) return;
    const id = activeList.id;
    const mode = entryQuery.mode === "any" ? "any" : "all";
    const conditions = listConditionsOf(entryQuery, queryFields, queryAllFields);
    updateState(s => ({ ...s, lists: (Array.isArray(s.lists) ? s.lists : []).map(l => (l && l.id === id ? { ...l, mode, conditions } : l)) }));
    flash("List saved");
  };

  // Rename and Delete list sit in an open list's header (Drak's call 2 at
  // the cut): Rename turns the title into a box, Enter or leaving it keeping
  // the name and Esc putting the old one back; Delete asks in the delete
  // modal, which says the entries stay.
  const renameList = (id, name) => {
    const n = (name || "").trim();
    const list = (Array.isArray(state.lists) ? state.lists : []).find(l => l && l.id === id);
    if (isLocked || !n || !list || list.name === n) return;
    updateState(s => ({ ...s, lists: (Array.isArray(s.lists) ? s.lists : []).map(l => (l && l.id === id ? { ...l, name: n } : l)) }));
    flash("Renamed");
  };
  const startRenameList = () => {
    if (!activeList || isLocked) return;
    listRenameRef.current = activeList.id;
    setListNameText(activeList.name);
    setListRenaming(true);
  };
  const endRenameList = (keep) => {
    const id = listRenameRef.current;
    listRenameRef.current = null;
    if (id && keep) renameList(id, listNameText);
    setListRenaming(false);
  };
  const deleteList = (id) => {
    if (isLocked) return;
    const list = (Array.isArray(state.lists) ? state.lists : []).find(l => l && l.id === id);
    if (!list) return;
    askRecordDelete({
      state, ids: [id], title: `Delete the list "${list.name}"?`, goes: "Its entries stay; only the list goes.",
      onConfirm: () => {
        updateState(s => ({ ...s, lists: (Array.isArray(s.lists) ? s.lists : []).filter(l => l && l.id !== id) }));
        setActiveListId(null); setListRenaming(false); setEntryQuery(QUERY_EMPTY);
        flash("List deleted");
      },
    });
  };

  // A list's row moves by its handle in the sidebar, as a template's does.
  const reorderLists = (fromIdx, toIdx) => {
    if (isLocked) return;
    updateState(s => {
      const ls = Array.isArray(s.lists) ? s.lists : [];
      if (fromIdx < 0 || fromIdx >= ls.length || toIdx < 0 || toIdx > ls.length) return s;
      const next = [...ls];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return { ...s, lists: next };
    });
  };

  const selectView = (v) => {
''')),
    # A template's delete tells the lists that name it, and clears them.
    ("      state, ids: state.entries.filter(e => e.templateId === tid).map(e => e.id), title: msg,\n"
     "      onConfirm: () => {\n"
     "        updateState(s => {\n"
     "          const cleared = clearLinksTo(s, new Set(s.entries.filter(e => e.templateId === tid).map(e => e.id)));\n"
     "          return { ...cleared, templates: cleared.templates.filter(t => t.id !== tid), entries: cleared.entries.filter(e => e.templateId !== tid) };\n",
     B(r'''
      state, ids: state.entries.filter(e => e.templateId === tid).map(e => e.id), title: msg,
      // v1.7 r046: a saved list scoped to it stays, showing no entries, and
      // a Template condition naming it loses it.
      goes: listTemplateGoes(state, tid) || undefined,
      onConfirm: () => {
        updateState(s => {
          const cleared = clearLinksTo(s, new Set(s.entries.filter(e => e.templateId === tid).map(e => e.id)));
          const tset = new Set([tid]);
          const lists = Array.isArray(cleared.lists) && cleared.lists.some(l => listNames(l, tset)) ? cleared.lists.map(l => (listNames(l, tset) ? listWithout(l, tset) : l)) : cleared.lists;
          return { ...cleared, ...(lists !== cleared.lists ? { lists } : {}), templates: cleared.templates.filter(t => t.id !== tid), entries: cleared.entries.filter(e => e.templateId !== tid) };
''')),
    # The header: an open list's name, its Rename and Delete list.
    ("  if (view === \"list\") {\n"
     "    if (activeTagFilter) headerTitle = `# ${activeTagFilter}`;\n",
     "  if (view === \"list\") {\n"
     "    if (activeList) { headerTitle = activeList.name; headerIcon = { icon: \"☰\", color: \"var(--accent)\" }; }\n"
     "    else if (activeTagFilter) headerTitle = `# ${activeTagFilter}`;\n"),
    ("              <span className=\"page-title-text\" title={headerTitle}>{headerTitle}</span>\n",
     B(r'''
              {listRenaming && activeList && !isLocked
                ? <input className="input page-title-input" autoFocus aria-label="List name" value={listNameText}
                    onFocus={e => e.target.select()} onChange={e => setListNameText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") { e.preventDefault(); endRenameList(true); }
                      else if (e.key === "Escape") { e.preventDefault(); endRenameList(false); }
                    }}
                    onBlur={() => endRenameList(true)} style={{ fontSize: "inherit", fontFamily: "inherit", padding: "0 8px", minWidth: 240 }} />
                : <span className="page-title-text" title={headerTitle}>{headerTitle}</span>}
''')),
    ("              {view === \"list\" && <>\n"
     "                {activeTemplate && (\n"
     "                  <div className=\"export-menu-wrap\">\n",
     "              {view === \"list\" && <>\n"
     "                {activeList && !isLocked && <button className=\"btn btn-ghost entry-list-rename\" onClick={startRenameList} title=\"Rename this list\">Rename</button>}\n"
     "                {activeList && !isLocked && <button className=\"btn btn-danger entry-list-delete\" onClick={() => deleteList(activeList.id)} title=\"Delete this list; its entries stay\">Delete list</button>}\n"
     "                {activeTemplate && !activeList && (\n"
     "                  <div className=\"export-menu-wrap\">\n"),
    ("                {activeTemplate && !isLocked && <button className=\"btn btn-ghost\" onClick={openEditTemplate}>Edit Template</button>}\n",
     "                {activeTemplate && !activeList && !isLocked && <button className=\"btn btn-ghost\" onClick={openEditTemplate}>Edit Template</button>}\n"),
    # The sidebar's lists, and the entry list's.
    ("        onSelectAllEntries={selectAllEntries}\n",
     "        onSelectAllEntries={selectAllEntries}\n"
     "        activeListId={activeList ? activeList.id : null}\n"
     "        onOpenList={openList}\n"
     "        onReorderLists={isLocked ? null : reorderLists}\n"),
    ("              key={activeTagFilter ? `tag:${activeTagFilter}` : activeTemplateId ? `tpl:${activeTemplateId}` : \"all\"}\n",
     "              key={activeList ? `list:${activeList.id}` : activeTagFilter ? `tag:${activeTagFilter}` : activeTemplateId ? `tpl:${activeTemplateId}` : \"all\"}\n"),
    ("              queryFields={queryFields}\n",
     B(r'''
              queryFields={queryFields}
              queryAllFields={queryAllFields}
              list={activeList}
              listChanged={activeList ? listDiffers(activeList, entryQuery, queryFields, queryAllFields) : false}
              onSaveList={isLocked ? null : saveListAs}
              onUpdateList={updateActiveList}
              scopeNote={activeList && activeList.scope && activeList.scope.kind === "template" && !activeTemplate ? "This list's template is gone (template not found), so it shows no entries." : null}
''')),
    ("function Sidebar({ state, activeTemplateId, activeTagFilter, activeView, templateCounts, tagCounts, allTags, onSelectTemplate, onSelectTag, onSelectAllEntries, onClickWorldName,",
     "function Sidebar({ state, activeTemplateId, activeTagFilter, activeView, templateCounts, tagCounts, allTags, onSelectTemplate, onSelectTag, onSelectAllEntries, activeListId, onOpenList, onReorderLists, onClickWorldName,"),
    ("  const viewDrag = useDragReorder(onReorderViews || (() => {}));\n",
     "  const viewDrag = useDragReorder(onReorderViews || (() => {}));\n"
     "  const listDrag = useDragReorder(onReorderLists || (() => {}));\n"),
    # An open list is marked, not its scope.
    ("            const isActive = activeView === \"list\" && !activeTemplateId && !activeTagFilter;\n",
     "            const isActive = activeView === \"list\" && !activeTemplateId && !activeTagFilter && !activeListId;\n"),
    ("            const isActive = activeView === \"list\" && activeTemplateId === t.id;\n",
     "            const isActive = activeView === \"list\" && activeTemplateId === t.id && !activeListId;\n"),
    ("className={`nav-item ${activeTemplateId === t.id && activeView === \"list\" ? \"active\" : \"\"}`}",
     "className={`nav-item ${activeTemplateId === t.id && activeView === \"list\" && !activeListId ? \"active\" : \"\"}`}"),
    ("activeTagFilter === tag ?", "activeTagFilter === tag && !activeListId ?", 2),
    ("          })}\n"
     "        </div>\n"
     "\n"
     "        {Array.isArray(packs) && packs.length > 0 && (\n",
     B(r'''
          })}
        </div>

        {/* v1.7 r046: the saved lists, after Templates (Drak's call 1 at the cut) */}
        {Array.isArray(state.lists) && state.lists.length > 0 && (
          <div className="nav-section nav-lists" style={{ marginTop: 12 }}>
            <div className="nav-label"><span>Lists</span></div>
            {state.lists.map((l, idx) => {
              if (!l) return null;
              const isActive = activeView === "list" && activeListId === l.id;
              const canDrag = !isLocked && !!onReorderLists;
              const isDragged = listDrag.draggedIdx === idx;
              const isOver = listDrag.overIdx === idx;
              const before = isOver && listDrag.dropPosition === "before" && !isDragged;
              const after = isOver && listDrag.dropPosition === "after" && !isDragged;
              return (
                <div
                  key={l.id}
                  className={`nav-item-wrap ${isActive ? "active" : ""} ${isDragged ? "dragging" : ""} ${before ? "drop-before" : ""} ${after ? "drop-after" : ""}`}
                  {...(canDrag ? listDrag.rowProps(idx) : {})}
                >
                  {canDrag && <span className="nav-drag-handle" title="Drag to reorder" {...listDrag.handleProps(idx)}>⋮⋮</span>}
                  <button className={`nav-item nav-item-list ${isActive ? "active" : ""}`} onClick={() => onOpenList && onOpenList(l.id)} title={l.name}>
                    <span className="nav-icon" style={isActive ? { color: "var(--accent)" } : {}}>☰</span>
                    <span className="nav-name">{l.name}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {Array.isArray(packs) && packs.length > 0 && (
''')),
    # A list's scope comes back with it on ← Back, a tag or every entry as
    # well as a template, so a list left open on it is open again.
    ("      } else {\n"
     "        setEntryNavStack([{ view, entryId: null }]);\n"
     "      }\n"
     "      setActiveTemplateId(entry.templateId); setActiveTagFilter(null);\n",
     "      } else {\n"
     "        // v1.7 r046: a list frame keeps the scope it was left on\n"
     "        setEntryNavStack([{ view, entryId: null, scope: view === \"list\" ? { templateId: activeTemplateId || null, tag: activeTagFilter || null } : null }]);\n"
     "      }\n"
     "      setActiveTemplateId(entry.templateId); setActiveTagFilter(null);\n"),
    ("    } else {\n"
     "      setEntryNavStack([{ view, entryId: null }]);\n"
     "    }\n"
     "    setActiveEntryId(id); setView(\"entry\");\n",
     "    } else {\n"
     "      setEntryNavStack([{ view, entryId: null, scope: view === \"list\" ? { templateId: activeTemplateId || null, tag: activeTagFilter || null } : null }]);\n"
     "    }\n"
     "    setActiveEntryId(id); setView(\"entry\");\n"),
    ("    } else {\n"
     "      setView(top.view);\n"
     "    }\n"
     "    setEntryNavStack(s => s.slice(0, -1));\n",
     "    } else {\n"
     "      // v1.7 r046: back on a list's own scope, which an entry followed\n"
     "      // from it may have changed\n"
     "      if (top.view === \"list\" && top.scope) { setActiveTemplateId(top.scope.templateId); setActiveTagFilter(top.scope.tag); }\n"
     "      setView(top.view);\n"
     "    }\n"
     "    setEntryNavStack(s => s.slice(0, -1));\n"),
    # An entry gone from under the page lands on the list the chain of
    # entries started from, on its own scope, as Back does: the entry's
    # delete, and Back to an entry deleted on the way (found by the read of
    # r046's turnover, after Drak's first pass, and fixed by his call).
    ("  // Back button on entry view. Pops the top of the nav stack and restores\n",
     "  // v1.7 r046: an entry gone from under the page lands on the list the\n"
     "  // chain of entries started from, on its own scope, as Back does.\n"
     "  const landOnListScope = () => {\n"
     "    const base = entryNavStack[0];\n"
     "    if (base && base.view === \"list\" && base.scope) { setActiveTemplateId(base.scope.templateId); setActiveTagFilter(base.scope.tag); }\n"
     "    setView(\"list\");\n"
     "  };\n"
     "\n"
     "  // Back button on entry view. Pops the top of the nav stack and restores\n"),
    ("        // Entry was deleted while we were navigating away. Fall through\n"
     "        // to list rather than landing on a dead entry id.\n"
     "        setView(\"list\");\n",
     "        // Entry was deleted while we were navigating away. Fall through\n"
     "        // to list rather than landing on a dead entry id.\n"
     "        landOnListScope();\n"),
    ("        setActiveEntryId(null); clearDraftAndStorage(); setView(\"list\");\n",
     "        setActiveEntryId(null); clearDraftAndStorage(); landOnListScope();\n"),
    # A template picked on a pack's page or the Project page is picked as
    # the sidebar picks it: its own page, the search, the conditions, and
    # any open list cleared.
    ("onSelectTemplate={(tid) => { setActiveTemplateId(tid); setView(\"list\"); }}",
     "onSelectTemplate={selectTemplate}", 2),
    # A template saved new opens on its own page, clean.
    ("      setActiveTemplateId(cleaned.id);\n"
     "    } else {\n",
     "      setActiveTemplateId(cleaned.id);\n"
     "      // v1.7 r046: on its own page, as a pick in the sidebar leaves it\n"
     "      setActiveTagFilter(null); setSearch(\"\"); setEntryQuery(QUERY_EMPTY); setActiveListId(null); setListRenaming(false);\n"
     "    } else {\n"),
])

edit(MODULES / "10_migrate.jsx", [
    ("};\n\nconst migrate = (state) => {",
     B(r'''
};

// v1.7 r046: the saved lists as the entry list reads them (docs/pipes-spec.md,
// section 6). Each is { id, name, scope, mode, conditions }: a scope is
// { kind: "all" }, { kind: "template", templateId }, or { kind: "tag", tag };
// mode is "all" or "any"; a condition is { id, field, op, value, value2,
// values, calendarId }, its field "name", "tags", "template", "linked", or
// { labels, end }, the labels from a template's field down through the
// groups to the one it reads, end "start" or "end" for a date range. A value
// is text, or a date as { year, monthIndex, day }; values, a list of text.
// A list without an id, or on one an earlier list has, takes a new one; a
// condition whose field or operator can't be read goes. Nothing else is
// dropped.
const normalizeEntryLists = (raw) => {
  const PSEUDO = ["name", "tags", "template", "linked"];
  const date = (d) => (d && typeof d === "object" && Number.isFinite(d.year)
    ? { year: Math.floor(d.year), monthIndex: Number.isFinite(d.monthIndex) ? Math.max(0, Math.floor(d.monthIndex)) : 0, day: Number.isFinite(d.day) ? Math.max(1, Math.floor(d.day)) : 1 }
    : null);
  const value = (v) => (typeof v === "string" ? v : typeof v === "number" && Number.isFinite(v) ? String(v) : (date(v) || ""));
  const field = (f) => {
    if (typeof f === "string") return PSEUDO.includes(f) ? f : null;
    if (!f || typeof f !== "object" || !Array.isArray(f.labels) || f.labels.length === 0) return null;
    if (!f.labels.every(x => typeof x === "string" && x.trim())) return null;
    const labels = f.labels.map(x => x.trim());
    return f.end === "start" || f.end === "end" ? { labels, end: f.end } : { labels };
  };
  const ids = new Set();
  return (Array.isArray(raw) ? raw : []).filter(l => l && typeof l === "object").map(l => {
    let id = typeof l.id === "string" && l.id ? l.id : "";
    if (!id || ids.has(id)) id = `list-${genId()}`;
    ids.add(id);
    const s = l.scope && typeof l.scope === "object" ? l.scope : {};
    const scope = s.kind === "template" && typeof s.templateId === "string" && s.templateId ? { kind: "template", templateId: s.templateId }
      : s.kind === "tag" && typeof s.tag === "string" && s.tag ? { kind: "tag", tag: s.tag }
      : { kind: "all" };
    const cids = new Set();
    const conditions = (Array.isArray(l.conditions) ? l.conditions : []).map(c => {
      if (!c || typeof c !== "object" || typeof c.op !== "string" || !c.op) return null;
      const f = field(c.field);
      if (!f) return null;
      let cid = typeof c.id === "string" && c.id ? c.id : "";
      if (!cid || cids.has(cid)) cid = `qc-${genId()}`;
      cids.add(cid);
      return {
        id: cid, field: f, op: c.op, value: value(c.value), value2: value(c.value2),
        values: Array.isArray(c.values) ? c.values.filter(v => typeof v === "string") : [],
        calendarId: typeof c.calendarId === "string" && c.calendarId ? c.calendarId : null,
      };
    }).filter(Boolean);
    return { id, name: typeof l.name === "string" && l.name.trim() ? l.name : "Untitled list", scope, mode: l.mode === "any" ? "any" : "all", conditions };
  });
};

const migrate = (state) => {''')),
    ("      templateIds: Array.isArray(p.templateIds) ? p.templateIds.filter(id => typeof id === \"string\") : [],\n"
     "    }));\n",
     "      templateIds: Array.isArray(p.templateIds) ? p.templateIds.filter(id => typeof id === \"string\") : [],\n"
     "    }));\n"
     "  // Saved lists (v1.7 r046): backfilled for worlds from before them, and\n"
     "  // each list's shape made what the entry list reads (normalizeEntryLists).\n"
     "  state.lists = normalizeEntryLists(state.lists);\n"),
])

edit(MODULES / "09_trunk.jsx", [
    ("  mapStamps: [],\n});",
     "  mapStamps: [],\n"
     "  // Saved lists (v1.7 r046), an entry list's query with a name; see\n"
     "  // normalizeEntryLists in 10_migrate.\n"
     "  lists: [],\n"
     "});"),
])

edit(MODULES / "22_trunk.jsx", [
    ("// (wikiMoved). A link through a secret field counts, since the delete clears\n"
     "// it either way.\n",
     "// (wikiMoved); and since v1.7 r046 the saved lists whose conditions name\n"
     "// them (lists). A link through a secret field counts, since the delete\n"
     "// clears it either way.\n"),
    ("  const out = { refs: new Map(), pins: 0, pinsBare: 0, nodes: 0, cards: 0, stemmas: new Set(), wiki: new Set(), wikiMoved: new Set() };",
     "  const out = { refs: new Map(), pins: 0, pinsBare: 0, nodes: 0, cards: 0, stemmas: new Set(), wiki: new Set(), wikiMoved: new Set(), lists: new Set() };"),
    ("    out.refs.get(key).add(l.src.id);\n"
     "  }));\n"
     "  return out;\n"
     "};",
     "    out.refs.get(key).add(l.src.id);\n"
     "  }));\n"
     "  const named = new Set(list);\n"
     "  (state && Array.isArray(state.lists) ? state.lists : []).forEach(l => { if (l && listNames(l, named)) out.lists.add(l.id); });\n"
     "  return out;\n"
     "};"),
    ("// none; a stemma's nodes and cards left orphaned, as Stemma v2 has them; and\n"
     "// [[links]] left as typed. A slice or a record it doesn't change keeps its\n"
     "// identity, so what's kept from the last build of the index stays kept. The\n"
     "// records themselves are the caller's to remove, after this, so their names\n"
     "// are still there to read.\n",
     "// none; a stemma's nodes and cards left orphaned, as Stemma v2 has them;\n"
     "// since v1.7 r046 a saved list's conditions naming them emptied, kept in\n"
     "// their places; and [[links]] left as typed. A slice or a record it doesn't\n"
     "// change keeps its identity, so what's kept from the last build of the\n"
     "// index stays kept. The records themselves are the caller's to remove,\n"
     "// after this, so their names are still there to read.\n"),
    ("        : p)) }, updatedAt: now };\n"
     "    }));\n"
     "  }\n"
     "  return next;\n"
     "};",
     "        : p)) }, updatedAt: now };\n"
     "    }));\n"
     "  }\n"
     "  if (Array.isArray(state.lists) && state.lists.some(l => listNames(l, going))) {\n"
     "    next.lists = state.lists.map(l => (listNames(l, going) ? listWithout(l, going) : l));\n"
     "  }\n"
     "  return next;\n"
     "};"),
])

edit(MODULES / "29_modals.jsx", [
    ("  if (c.wiki.size > 0) lines.push(",
     "  // v1.7 r046: a saved list that names what goes keeps its conditions, emptied.\n"
     "  if (c.lists && c.lists.size > 0) lines.push(c.lists.size === 1 ? `A saved list's conditions lose ${it}; the list stays.` : `${c.lists.size} saved lists' conditions lose ${it}; the lists stay.`);\n"
     "  if (c.wiki.size > 0) lines.push("),
    ("// The modal, drawn once by App; askRecordDelete opens it. Esc and a click\n"
     "// outside cancel, as Cancel does.\n"
     "function RecordDeleteModal() {\n"
     "  const [ask, setAsk] = useState(null);\n",
     B(r'''
// Tab and Shift+Tab go round a modal's own controls while it's open (v1.7
// r046), so the focus never reaches the page under it, where Enter would
// press whatever it landed on.
const modalTabCycle = (e, box) => {
  if (e.key !== "Tab" || !box) return;
  const items = [...box.querySelectorAll("button, input, select, textarea, [tabindex]")].filter(el => !el.disabled && el.tabIndex >= 0 && el.offsetParent !== null);
  e.preventDefault();
  if (items.length === 0) return;
  const at = items.indexOf(document.activeElement);
  const next = e.shiftKey ? (at <= 0 ? items.length - 1 : at - 1) : (at < 0 || at >= items.length - 1 ? 0 : at + 1);
  items[next].focus();
};

// The modal, drawn once by App; askRecordDelete opens it. Esc and a click
// outside cancel, as Cancel does. Since v1.7 r046 the keys are its own while
// it's open, as the rename modal's are, so a map's or a board's keys under
// it hear none, and the focus stays in it.
function RecordDeleteModal() {
  const [ask, setAsk] = useState(null);
  const box = useRef(null);
''')),
    ("    const onKey = (e) => { if (e.key === \"Escape\") setAsk(null); };\n"
     "    document.addEventListener(\"keydown\", onKey);\n"
     "    return () => document.removeEventListener(\"keydown\", onKey);\n",
     "    const onKey = (e) => {\n"
     "      e.stopPropagation();\n"
     "      if (e.key === \"Escape\") { e.preventDefault(); setAsk(null); }\n"
     "      else modalTabCycle(e, box.current);\n"
     "    };\n"
     "    window.addEventListener(\"keydown\", onKey, true);\n"
     "    return () => window.removeEventListener(\"keydown\", onKey, true);\n"),
    ("<div className=\"modal record-delete\" role=\"dialog\" aria-modal=\"true\" onClick={e => e.stopPropagation()}>",
     "<div className=\"modal record-delete\" ref={box} role=\"dialog\" aria-modal=\"true\" onClick={e => e.stopPropagation()}>"),
    ("function RecordRenameModal() {\n"
     "  const [ask, setAsk] = useState(null);\n"
     "  const [former, setFormer] = useState(false);\n",
     "function RecordRenameModal() {\n"
     "  const [ask, setAsk] = useState(null);\n"
     "  const [former, setFormer] = useState(false);\n"
     "  const box = useRef(null);\n"),
    ("    const onKey = (e) => {\n"
     "      e.stopPropagation();\n"
     "      if (e.key === \"Escape\") { e.preventDefault(); cancel(); }\n"
     "    };\n",
     "    const onKey = (e) => {\n"
     "      e.stopPropagation();\n"
     "      if (e.key === \"Escape\") { e.preventDefault(); cancel(); }\n"
     "      else modalTabCycle(e, box.current);\n"
     "    };\n"),
    ("<div className=\"modal record-rename\" role=\"dialog\" aria-modal=\"true\" onClick={e => e.stopPropagation()}>",
     "<div className=\"modal record-rename\" ref={box} role=\"dialog\" aria-modal=\"true\" onClick={e => e.stopPropagation()}>"),
])


# ---------------------------------------------------------------- shell: CSS
# A disabled ghost button dims, as a disabled accent or danger button does.
edit(SHELL, [
    (".btn-ghost:hover:not(:disabled){background:var(--surf2);color:var(--text)}\n",
     ".btn-ghost:hover:not(:disabled){background:var(--surf2);color:var(--text)}\n"
     ".btn-ghost:disabled{opacity:.35}\n"),
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
    print(f"r046 applied to {len(staged)} files")


if __name__ == "__main__":
    main()
