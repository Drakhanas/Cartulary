
// ─── Entry list ────────────────────────────────────────────────────────────────

function EntryList({ entries, templates, search, onSearch, sortBy, onSort, onSelect, showTemplate, variantAxis, onSetVariant, query, onQuery, queryFields, queryAllFields, total, scopeEntries, state, showSecrets, list, listChanged, onSaveList, onUpdateList, scopeNote }) {
  // Variant picker renders only when the axis is configured AND there's
  // something to pick (derived values exist, or a stale active needs to be
  // visible so the user can switch back to All). A stale active — a value no
  // longer present in any template's axis options — is injected as an option
  // rather than blanked, so the select never silently misrepresents state.
  const showVariantPicker = variantAxis && (variantAxis.values.length > 0 || variantAxis.active);
  // v1.7 r045: Filter opens the conditions' rows (EntryQueryRows), and while
  // they're closed the conditions in force show as chips (Drak's call 3), a
  // chip opening the rows at its condition; while anything narrows the list,
  // the count says how many of the scope's entries it shows. Since r046 the
  // rows' Save keeps the query in a list (onSaveList, or onUpdateList for
  // the open one), and a condition the scope can't read stays in force.
  const [filterOpen, setFilterOpen] = useState(false);
  const [focusId, setFocusId] = useState(null);
  const q = query || QUERY_EMPTY;
  const ready = onQuery ? queryReadyConditions(q, queryFields, queryAllFields) : [];
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
  return (
    <>
      <div className="list-controls">
        <input className="search-input" placeholder="Search entries..." value={search} onChange={e => onSearch(e.target.value)} />
        {onQuery && (
          <button type="button" className={`btn ${filterOpen || ready.length > 0 ? "btn-accent" : "btn-ghost"} entry-filter-btn`} aria-expanded={filterOpen} title="Narrow this list by its fields" onClick={() => (filterOpen ? closeRows() : openRows(null))} style={{ flexShrink: 0 }}>
            {ready.length > 0 ? `Filter · ${ready.length}` : "Filter"}
          </button>
        )}
        {showVariantPicker && (
          <select className="input sort-sel" value={variantAxis.active} onChange={e => onSetVariant(e.target.value)} title="Variant filter">
            <option value="">All</option>
            {variantAxis.values.map(v => <option key={v} value={v}>{v}</option>)}
            {variantAxis.active && !variantAxis.values.includes(variantAxis.active) && (
              <option value={variantAxis.active}>{variantAxis.active}</option>
            )}
          </select>
        )}
        <select className="input sort-sel" value={sortBy} onChange={e => onSort(e.target.value)}>
          <option value="name-asc">Name A → Z</option>
          <option value="name-desc">Name Z → A</option>
          <option value="updated-desc">Recently updated</option>
          <option value="updated-asc">Oldest updated</option>
          <option value="created-desc">Recently created</option>
          <option value="created-asc">Oldest created</option>
        </select>
        {onQuery && narrowed && <span className="entry-list-count" style={{ fontSize: 12.5, color: "var(--text-dim)", whiteSpace: "nowrap", flexShrink: 0 }}>{entries.length} of {total}</span>}
      </div>
      {scopeNote && <div className="entry-list-note" style={{ padding: "10px 20px 0", fontSize: 13, color: "var(--text-dim)", fontStyle: "italic" }}>{scopeNote}</div>}
      {onQuery && filterOpen && <EntryQueryRows query={q} fields={queryFields || []} allFields={queryAllFields || queryFields || []} state={state} entries={scopeEntries} templates={templates} showSecrets={showSecrets} focusId={focusId} onQuery={onQuery} onDone={closeRows} list={list} listChanged={listChanged} onSaveList={onSaveList} onUpdateList={onUpdateList} />}
      {onQuery && !filterOpen && ready.length > 0 && <EntryQueryChips query={q} ready={ready} state={state} showSecrets={showSecrets} onOpenAt={openRows} onQuery={onQuery} />}
      <div className="entry-list">
        {entries.length === 0
          ? <div className="empty">
              <div className="empty-glyph">◈</div>
              <div className="empty-text">{ready.length > 0 ? "Nothing matches these conditions." : search ? "Nothing matches that search." : "No entries yet."}</div>
            </div>
          : entries.map(e => {
              const t = templates.find(tt => tt.id === e.templateId);
              return (
                <div key={e.id} className="entry-card" onClick={() => onSelect(e.id)}>
                  <div className="entry-card-main">
                    <div className="entry-card-name">{e.name}</div>
                    <div className="entry-card-meta">
                      {showTemplate && t && <span style={{ color: t.color, fontVariantEmoji: "text" }}>{t.icon} {t.name}</span>}
                      <span>{fmtDate(e.updatedAt)}</span>
                    </div>
                    {(e.tags || []).length > 0 && (
                      <div className="entry-card-tags">
                        {e.tags.map(tag => <span key={tag} className="entry-card-tag">#{tag}</span>)}
                      </div>
                    )}
                  </div>
                  <span className="entry-card-arrow">→</span>
                </div>
              );
            })
        }
      </div>
    </>
  );
}

// ─── Entry queries (v1.7 r045) ─────────────────────────────────────────────────
// docs/pipes-spec.md, section 6, with Drak's calls at the cut: the entry
// list's search reads what an entry's page shows, and its conditions a
// field by its label, never an id or a stored key. A condition is a field, an
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
    else if (x.kind !== kind) x.kind = "text";
    const opt = (o) => {
      const v = typeof o === "string" ? o : (o && typeof o.value === "string" ? o.value : "");
      if (v && !x.options.some(y => queryLower(y) === queryLower(v))) x.options.push(v);
    };
    (Array.isArray(f.options) ? f.options : []).forEach(opt);
    if (f.optionsByParent && typeof f.optionsByParent === "object") Object.values(f.optionsByParent).forEach(list => (Array.isArray(list) ? list : []).forEach(opt));
  };
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
    // the option picked, or since v1.7 r046 an Other's text, as the page shows it
    const o = queryLower(selectValueOnly(v)), d = queryLower(formatSelectDisplay(v));
    const is = (x) => { const w = queryLower(x); return w !== "" && (w === o || w === d); };
    return c.op === "anyOf" ? (c.values || []).some(is) : is(c.value);
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

// The entries a query keeps, in their order: all of them while no condition
// is in force. A condition on a field not found holds for none (r046).
const queryApply = (state, entries, query, fields, showSecrets, all) => {
  const ready = queryReadyConditions(query, fields, all);
  if (ready.length === 0) return entries;
  const ctx = queryContextOf(state, showSecrets);
  const any = query.mode === "any";
  return entries.filter(e => {
    if (!e) return false;
    ctx.cal = ctx.calOf(e);
    const tpl = ctx.tplById.get(e.templateId) || null;
    const hold = (x) => !x.missing && queryHolds(x.c, x.f.kind, e, tpl, ctx);
    return any ? ready.some(hold) : ready.every(hold);
  });
};

// A new condition on a field, its kind's first operator, nothing chosen.
const queryNewCondition = (field, id) => {
  const kind = field ? field.kind : "text";
  const ops = QUERY_OPS[kind] || QUERY_OPS.text;
  return { id: id || `qc-${genId()}`, key: field ? field.key : "name", field: field ? field.field : "name", label: field ? field.label : "Name", op: ops[0][0], value: kind === "date" ? null : "", value2: kind === "date" ? null : "", values: [], calendarId: null };
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
        // since v1.7 r046 an Other's text too, as the page shows it
        if (t === "select") { push(selectValueOnly(v)); push(formatSelectDisplay(v)); }
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
          <EntryQueryRow key={c.id} cond={c} fields={fields} allFields={allFields} state={state} entries={entries} templates={templates} showSecrets={showSecrets} focus={c.id === focusId}
            onChange={(next) => setCond(c.id, next)} onRemove={() => set({ conditions: query.conditions.filter(x => x.id !== c.id) })} />
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-ghost btn-small entry-query-add" onClick={() => set({ conditions: [...query.conditions, queryNewCondition(fields[0])] })}>+ Condition</button>
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
          <button type="button" className="btn btn-small btn-accent entry-query-done" onClick={onDone}>Done</button>
        </div>
      </div>
    </div>
  );
}

// One condition's row: its field, its operator, the value's control by the
// field's kind, and × to remove it. A new field starts the row over.
function EntryQueryRow({ cond, fields, allFields, state, entries, templates, showSecrets, focus, onChange, onRemove }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!focus || !ref.current) return;
    const el = ref.current.querySelector(".entry-query-value input, .entry-query-value select") || ref.current.querySelector("select");
    if (el) el.focus();
  }, [focus]);
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
  // the row's controls wrap among themselves, and its × keeps to the right
  return (
    <div ref={ref} className="entry-query-row" style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
      <div style={{ flex: "1 1 auto", minWidth: 0, display: "flex", alignItems: "flex-start", gap: 6, flexWrap: "wrap" }}>
        <select className="input sort-sel entry-query-field" value={field ? cond.key : ""} onChange={e => { const f = fields.find(x => x.key === e.target.value); if (f) onChange(queryNewCondition(f, cond.id)); }} style={{ maxWidth: 220 }}>
          {!field && <option value="">{cond.label ? `${cond.label} (field not found)` : "(field not found)"}</option>}
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
            <button type="button" className={`entry-query-chip-text${x.missing ? " entry-query-chip-missing" : ""}`} title="Change this condition" onClick={() => onOpenAt(x.c.id)} style={{ ...plain, color: x.missing ? "var(--danger)" : "var(--text)", padding: "3px 4px 3px 10px" }}>{x.secret ? "A condition on a secret field" : x.missing ? `${x.c.label || "A field"}: field not found` : queryChipText(x.c, x.f, ctx)}</button>
            <button type="button" className="entry-query-chip-remove" title="Remove this condition" aria-label="Remove this condition" onClick={() => remove(x.c.id)} style={{ ...plain, color: "var(--text-dim)", padding: "3px 9px 3px 4px" }}>×</button>
          </span>
        </React.Fragment>
      ))}
      <button type="button" className="btn btn-ghost btn-small entry-query-clear" onClick={() => onQuery({ ...query, conditions: [] })}>Clear</button>
    </div>
  );
}

// ─── Saved lists (v1.7 r046) ───────────────────────────────────────────────────
// docs/pipes-spec.md, section 6, with Drak's calls at the cut: the Filter's
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
};

// ─── Entry view ────────────────────────────────────────────────────────────────

function EntryView({ entry, template, templates, entries, onOpenEntry, onSelectTag, showSecrets, imageFolder, dirHandle, calendar, onExportEntry, exportTitle, state, onUpdateViewPrefs, canvasSlot, panels, foldedPanels, onTogglePanel, registeredNodes: nodesGiven, badgeExtra, footSlot, wide }) {
  if (!template) return <div className="entry-view"><div className="empty">Template not found.</div></div>;
  // currentMoment is stored as { year, monthIndex, day } in primary's frame
  // (calendar-position invariant under primary structural edits). Derive
  // absoluteDay on read so FieldValueDisplay can do raw integer math against
  // entry lifespan start.absoluteDay. Null when no current moment is set.
  const currentMomentDay = (() => {
    const cm = state?.world?.currentMoment;
    if (!cm || cm.year == null) return null;
    return calendarDateToAbsoluteDay(state.world.calendar, cm);
  })();
  // v1.7 r003: the records that aren't entries (bodies, Glossopoeia records,
  // maps), so a reference to one shows its name (resolveRefTarget). Since
  // r012 a caller can give its own, named as its form names them, as a
  // Fabula page gives its story's (fabulaStoryNodes).
  const registeredNodes = nodesGiven || (state ? getRegisteredGraphNodes(state) : []);
  // v1.7 r022: wide widens the column to the pane, for Fabula's Timeline
  // tab; every child but one marked entry-view-full stays in the reading
  // width, centered as before.
  return (
    <div className={wide ? "entry-view entry-view-wide" : "entry-view"}>
      <div className="entry-header-row">
        <div className="entry-title">{entry.name}</div>
        {onExportEntry && (
          <button
            className="btn btn-ghost btn-small entry-export-btn"
            onClick={() => onExportEntry(entry.id)}
            title={exportTitle || (showSecrets ? "Download this entry as Markdown (.md). Secret fields included." : "Download this entry as Markdown (.md). Secret fields excluded.")}
          >
            Export ↓
          </button>
        )}
      </div>
      <div className="entry-badge">
        <span style={{ color: template.color, fontVariantEmoji: "text" }}>{template.icon}</span>
        {template.name}
        {/* v1.7 r012: a word between the kind and the date, as an act's, a chapter's, or a scene's place in its outline (II.4.A). */}
        {badgeExtra && <><span style={{ color: "var(--border2)" }}>·</span><span className="entry-badge-position">{badgeExtra}</span></>}
        <span style={{ color: "var(--border2)" }}>·</span>
        <span>Updated {fmtDate(entry.updatedAt)}</span>
      </div>
      {(() => {
        // Obituary line: biographical summary for deceased person-like entries.
        // Same gate as the inline lifespan-field suffix (templateSupportsDeceased
        // + first calendar-date-range field). Renders only when result is a
        // deceased computation (has both start and end dates).
        // Respect secret status: if the lifespan field is marked secret and
        // secrets are hidden, suppress the obituary line — otherwise the age
        // would leak the hidden death dates.
        if (!templateSupportsDeceased(template)) return null;
        const firstRange = (template.fields || []).find(f => f.type === "calendar-date-range");
        if (!firstRange) return null;
        if (firstRange.secret && !showSecrets) return null;
        const value = (entry.fields || {})[firstRange.id];
        const ageResult = computeLifespanAge(value, calendar, entry, template, currentMomentDay);
        if (!ageResult || !ageResult.isDeceased) return null;
        const prefix = ageResult.approximate ? "~" : "";
        return <div className="entry-obituary">Died at age {prefix}{ageResult.age}</div>;
      })()}
      {(entry.tags || []).length > 0 && (
        <div className="entry-tags-bar">
          {entry.tags.map(tag => <span key={tag} className="entry-tag" onClick={() => onSelectTag(tag)}>#{tag}</span>)}
        </div>
      )}
      <div className="divider" />
      {canvasSlot}
      {fieldPanelSegments(template.fields, panels).map(seg => {
        // v1.7 r008: fields under panels, each heading folding its own; a
        // template without panels is one segment, drawn as before.
        const units = buildFieldLayoutUnits(
        seg.fields,
        (f) => isFieldVisibleDisplay(f, entry.fields || {}, showSecrets)
      ).map(unit => {
        if (unit.kind === "full") {
          const field = unit.field;
          const val = (entry.fields || {})[field.id];
          return (
            <div key={field.id} className={`field-group ${field.secret ? "secret" : ""}`}>
              <div className="field-label">
                <span>{field.label}</span>
                {field.secret && <span className="secret-tag">SECRET</span>}
              </div>
              <FieldValueDisplay field={field} value={val} entries={entries} templates={templates} bodies={state?.celestialBodies} registeredNodes={registeredNodes} onOpenEntry={onOpenEntry} imageFolder={imageFolder} dirHandle={dirHandle} calendar={calendar} entry={entry} template={template} currentMomentDay={currentMomentDay} showSecrets={showSecrets} />
            </div>
          );
        }
        // unit.kind === "pair" — both halves guaranteed visible by predicate filter.
        const { a, b } = unit;
        const aFields = entry.fields || {};
        const aVal = aFields[a.id];
        const bVal = aFields[b.id];
        return (
          <div key={`pair-${a.id}-${b.id}`} className="field-row">
            <div className={`field-group ${a.secret ? "secret" : ""}`}>
              <div className="field-label" title={a.label}>
                <span>{a.label}</span>
                {a.secret && <span className="secret-tag">SECRET</span>}
              </div>
              <FieldValueDisplay field={a} value={aVal} entries={entries} templates={templates} bodies={state?.celestialBodies} registeredNodes={registeredNodes} onOpenEntry={onOpenEntry} imageFolder={imageFolder} dirHandle={dirHandle} calendar={calendar} entry={entry} template={template} currentMomentDay={currentMomentDay} showSecrets={showSecrets} />
            </div>
            <div className={`field-group ${b.secret ? "secret" : ""}`}>
              <div className="field-label" title={b.label}>
                <span>{b.label}</span>
                {b.secret && <span className="secret-tag">SECRET</span>}
              </div>
              <FieldValueDisplay field={b} value={bVal} entries={entries} templates={templates} bodies={state?.celestialBodies} registeredNodes={registeredNodes} onOpenEntry={onOpenEntry} imageFolder={imageFolder} dirHandle={dirHandle} calendar={calendar} entry={entry} template={template} currentMomentDay={currentMomentDay} showSecrets={showSecrets} />
            </div>
          </div>
        );
      });
        if (!seg.panel) return <React.Fragment key="fields">{units}</React.Fragment>;
        const folded = !!(foldedPanels && foldedPanels[seg.panel.id]);
        // An empty field doesn't show here, so an open panel with none filled
        // in says so rather than leaving its heading bare.
        return (
          <React.Fragment key={`panel-${seg.panel.id}`}>
            <FieldPanelHeading panel={seg.panel} folded={folded} onToggle={onTogglePanel} />
            {!folded && (units.length > 0 ? units : <div className="field-hint field-panel-empty" style={{ marginTop: -8, marginBottom: 22 }}>Nothing in {seg.panel.label} yet.</div>)}
          </React.Fragment>
        );
      })}
      {/* v1.7 r014: what the caller draws under the fields, as a scene's page draws its research. */}
      {footSlot}
    </div>
  );
}

// v1.7 r008: a template's fields as segments for drawing, the fields that
// belong to no panel first and then each panel's own, in the panels' order,
// so a half-width pair never straddles a heading. Without panels the whole
// list is one segment, drawn as it always was. A field names its panel by id
// (field.panel); panels are [{ id, label }], given by the caller.
const fieldPanelSegments = (fields, panels) => {
  const all = Array.isArray(fields) ? fields : [];
  if (!Array.isArray(panels) || panels.length === 0) return [{ panel: null, fields: all }];
  const known = new Set(panels.map(p => p.id));
  return [
    { panel: null, fields: all.filter(f => !(f && known.has(f.panel))) },
    ...panels.map(p => ({ panel: p, fields: all.filter(f => f && f.panel === p.id) })),
  ];
};

// A panel's heading, which folds the panel away and back (v1.7 r008). The
// folds are the caller's to keep.
function FieldPanelHeading({ panel, folded, onToggle }) {
  return (
    <button
      type="button"
      className="field-panel-heading"
      aria-expanded={!folded}
      onClick={() => { if (onToggle) onToggle(panel.id); }}
      title={folded ? `Show the ${panel.label} panel` : `Fold the ${panel.label} panel away`}
      style={{ display: "flex", alignItems: "baseline", gap: 10, width: "100%", margin: "30px 0 18px", padding: "0 0 8px", background: "transparent", border: "none", borderBottom: "1px solid var(--border)", color: "var(--text-bright)", fontFamily: "'Cormorant Garamond', serif", fontSize: "calc(22px * var(--font-scale))", fontWeight: 500, textAlign: "left", cursor: "pointer" }}
    >
      <span aria-hidden="true" style={{ color: "var(--accent)", fontFamily: "'DM Sans', sans-serif", fontSize: "calc(12px * var(--font-scale))", width: 12, flexShrink: 0 }}>{folded ? "\u25B8" : "\u25BE"}</span>
      <span>{panel.label}</span>
    </button>
  );
}

// Renders a single-line text value with `[[Name]]` and `[[Name|display]]` wiki-link
// syntax resolved to clickable cross-references. Display-side only — text-input edit
// surfaces remain plain (autocomplete for `[[` in text inputs is a separate task).
//
// Since v1.7's r043 a [[link]] resolves through the world's one resolver
// (useWikiResolver), as MarkdownDisplay's do; a language is drawn found and
// opens nothing, and a broken link keeps the .wiki-link-broken affordance.
//
// Reuses the broadened .wiki-link CSS so visual treatment matches markdown rendering.
function InlineWikiLinkText({ value, entries, templates, bodies, onOpenEntry }) {
  const wiki = useWikiResolver(entries, templates, bodies);

  if (!value || typeof value !== "string" || !value.includes("[[")) {
    return <>{value || ""}</>;
  }

  const nodes = [];
  let lastIdx = 0;
  let key = 0;
  // Same pattern as the marked wikiLink tokenizer: [[<target>]] or [[<target>|<display>]],
  // no newline inside brackets, target can contain anything except ] or newline.
  const regex = /\[\[([^\]\n]+)\]\]/g;
  let m;
  while ((m = regex.exec(value)) !== null) {
    if (m.index > lastIdx) {
      nodes.push(value.substring(lastIdx, m.index));
    }
    const inner = m[1].trim();
    const pipe = inner.indexOf("|");
    const target = pipe >= 0 ? inner.substring(0, pipe).trim() : inner;
    const display = pipe >= 0 ? inner.substring(pipe + 1).trim() : inner;
    const found = wiki.find(target.toLowerCase());
    if (found && !found.opens) {
      nodes.push(
        <span key={`wl-${key++}`} className="wiki-link wiki-link-found wiki-link-record" style={WIKI_LINK_RECORD_STYLE} title={wikiRecordKind(found)}>{display}</span>
      );
    } else if (found) {
      const id = found.id;
      nodes.push(
        <a key={`wl-${key++}`} className="wiki-link wiki-link-found" href="#"
          onClick={(e) => { e.preventDefault(); onOpenEntry && onOpenEntry(id); }}
        >{display}</a>
      );
    } else {
      nodes.push(
        <a key={`wl-${key++}`} className="wiki-link wiki-link-broken" href="#"
          title="No entry with that name"
          onClick={(e) => e.preventDefault()}
        >{display}</a>
      );
    }
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < value.length) {
    nodes.push(value.substring(lastIdx));
  }
  return <>{nodes}</>;
}

// A [[link]] to a record that opens nothing (since v1.7's r043, a language,
// Drak's call 2): drawn found, and still on hover, as a reference chip to one.
const WIKI_LINK_RECORD_STYLE = { cursor: "default", background: "var(--accent-glow)", color: "var(--accent)" };

// ─── Referenced by (v1.7 r041) ─────────────────────────────────────────────────
// docs/pipes-spec.md, section 4, with Drak's calls at the cut: on a record's
// page, after its fields and its page's own lists, what links to it, from the
// link index (linksTo, 22_trunk). One row per source, naming it and every
// field it links through, grouped by kind: entries by template in the
// templates' order, then Fabula's kinds in Fabula's order, then maps,
// stemmas, bodies, ConLangs, and the world description (Drak's call 2). Rows
// run A to Z, numbers in order (Kin 2 before Kin 10), but acts, chapters,
// and scenes by their place in their story's outline, and a Fabula record
// below the story names its story. A row opens its source, but a ConLang's,
// which has no page yet, as its chips open nowhere. A link through a secret
// field shows only while secrets are shown, and a page nothing links to
// shows no list. A group past REFERENCED_BY_SHOWN rows shows that many and a
// Show all button, until the page is left (Drak's call 4).

const REFERENCED_BY_SHOWN = 10;

// The links the thread, theme, and scene pages' own lists show, which their
// Referenced by leaves out so nothing shows twice (Drak's call 1): a story's,
// a scene's, a plot point's, or a promise's Threads on a Plot Thread's page,
// a story's Themes or a scene's Motifs on a Theme's, and a research note's
// Used In on a scene's (fabulaRoleStories, fabulaNotesOf).
const REFERENCED_BY_LISTED = {
  threads: [["story", "threads"], ["scene", "threads"], ["plotPoint", "threads"], ["promise", "threads"]],
  themes: [["story", "themes"], ["scene", "motifs"]],
  scene: [["research", "usedIn"]],
};

// A target's rows in their groups, in the list's order: [{ key, title, icon,
// color, rows }], each row { src, labels, place, story }.
const referencedByGroups = (state, targetId, showSecrets, exclude) => {
  const rows = new Map();
  const shown = linksTo(state, targetId).filter(l => !(l.secret && !showSecrets)
    && !(exclude && l.src.kind === "fabula" && exclude.some(([kind, field]) => kind === l.src.group && field === l.field)));
  shown.forEach(l => { if (!rows.has(l.src.id)) rows.set(l.src.id, { src: l.src, labels: [] }); });
  // A row names the fields of its stored links first, then those of its
  // [[links]], each in its record's order, as at r041; since r042 the index
  // keeps a record's links in one list in its record's order, for
  // Concordance's labels.
  [false, true].forEach(wiki => shown.forEach(l => {
    if ((l.kind === "wiki") !== wiki) return;
    const r = rows.get(l.src.id);
    if (l.label && !r.labels.includes(l.label)) r.labels.push(l.label);
  }));
  if (rows.size === 0) return [];
  const fab = (state && state.fabula) || {};
  const storyNames = new Map((Array.isArray(fab.stories) ? fab.stories : []).filter(st => st && st.id).map(st => [st.id, st.name || "(untitled story)"]));
  const storyRank = new Map(fabulaIndexStories(state).map((st, i) => [st.id, i]));
  const outlines = new Map();
  const placeOf = (src) => {
    if (src.kind !== "fabula" || !src.storyId || !["part", "chapter", "scene"].includes(src.group)) return null;
    if (!outlines.has(src.storyId)) outlines.set(src.storyId, fabulaOutlinePlaces(state, src.storyId));
    return outlines.get(src.storyId).get(src.id) || null;
  };
  const byKey = new Map();
  rows.forEach(r => {
    const key = `${r.src.kind}:${r.src.group}`;
    const place = placeOf(r.src);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push({ ...r, place: place ? place.path : null, at: place ? place.index : null, story: r.src.storyId ? (storyNames.get(r.src.storyId) || null) : null });
  });
  const source = (id) => getRegisteredSourceById(id) || {};
  const order = [
    ...((state && state.templates) || []).filter(t => t && t.id).map(t => ({ key: `entry:${t.id}`, title: t.name || "(untitled template)", icon: t.icon, color: t.color })),
    ...FABULA_KINDS.map(k => ({ key: `fabula:${k.kind}`, title: k.label, icon: source(k.id).icon, color: k.color })),
    ...[["map", SYNTH_TPL_MAP], ["stemma", SYNTH_TPL_STEMMA], ["body", BODY_REF_SENTINEL], ["conlang", SYNTH_TPL_CONLANG]]
      .map(([kind, id]) => ({ key: `${kind}:${kind}`, title: source(id).name || kind, icon: source(id).icon, color: source(id).color })),
    { key: "world:world", title: "World", icon: null, color: null },
  ];
  const byName = (a, b) => (a.src.name || "").localeCompare(b.src.name || "", undefined, { sensitivity: "base", numeric: true });
  const last = Number.MAX_SAFE_INTEGER;
  const rank = (r) => (storyRank.has(r.src.storyId) ? storyRank.get(r.src.storyId) : last);
  const byPlace = (a, b) => (rank(a) - rank(b)) || ((a.at == null ? last : a.at) - (b.at == null ? last : b.at)) || byName(a, b);
  const groups = [];
  const take = (g, list) => groups.push({ ...g, rows: list.sort(/^fabula:(part|chapter|scene)$/.test(g.key) ? byPlace : byName) });
  order.forEach(g => {
    const list = byKey.get(g.key);
    if (!list) return;
    byKey.delete(g.key);
    take(g, list);
  });
  // Entries whose template is gone, last.
  byKey.forEach((list, key) => take({ key, title: "(template deleted)", icon: null, color: null }, list));
  return groups;
};

// The list, keyed by its target where it's drawn, so a Show all lasts while
// the page does.
function ReferencedBy({ state, targetId, showSecrets, onOpenEntry, exclude }) {
  const [opened, setOpened] = useState(() => new Set());
  const groups = useMemo(() => referencedByGroups(state, targetId, showSecrets, exclude), [state, targetId, showSecrets, exclude]);
  if (groups.length === 0) return null;
  return (
    <div className="referenced-by" style={{ marginTop: 26 }}>
      <div className="field-label"><span>Referenced by</span></div>
      {groups.map(g => {
        const all = opened.has(g.key) || g.rows.length <= REFERENCED_BY_SHOWN;
        return (
          <div key={g.key} className="referenced-by-group" data-group={g.key} style={{ marginBottom: 16 }}>
            <div className="referenced-by-heading" style={{ display: "flex", alignItems: "baseline", gap: 7, margin: "0 0 6px", fontSize: 12.5, color: "var(--text-dim)" }}>
              {g.icon && <span style={{ color: g.color || "var(--text-dim)", fontVariantEmoji: "text" }}>{g.icon}</span>}
              <span className="referenced-by-title" style={{ color: "var(--text)" }}>{g.title}</span>
              <span className="referenced-by-count">{g.rows.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1, border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
              {(all ? g.rows : g.rows.slice(0, REFERENCED_BY_SHOWN)).map(r => {
                const opens = !!onOpenEntry && r.src.kind !== "conlang";
                const open = () => onOpenEntry(r.src.id);
                const tail = [r.story, r.labels.join(", ")].filter(Boolean).join(" · ");
                return (
                  <div
                    key={r.src.id}
                    className="referenced-by-row"
                    data-source={r.src.id}
                    role={opens ? "button" : undefined}
                    tabIndex={opens ? 0 : undefined}
                    title={opens ? `Open ${r.src.name || "this"}` : undefined}
                    onClick={opens ? open : undefined}
                    onKeyDown={opens ? (e => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); open(); } }) : undefined}
                    style={{ padding: "8px 14px", background: "var(--surf)", display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 10, rowGap: 2, cursor: opens ? "pointer" : "default" }}
                  >
                    <span className="referenced-by-name" style={{ fontSize: 14, minWidth: 0, overflowWrap: "anywhere" }}>
                      {r.place && <span className="referenced-by-place" style={{ color: "var(--text-dim)", marginRight: 6 }}>{r.place}</span>}
                      {r.src.name || "(untitled)"}
                    </span>
                    {tail && <span className="referenced-by-fields" style={{ fontSize: 12.5, color: "var(--text-dim)", minWidth: 0, overflowWrap: "anywhere" }}>{tail}</span>}
                  </div>
                );
              })}
            </div>
            {!all && (
              <button type="button" className="btn btn-ghost btn-small referenced-by-more" style={{ marginTop: 6 }} onClick={() => setOpened(s => new Set([...s, g.key]))}>
                Show all {g.rows.length}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Longform + markdown display ───────────────────────────────────────────────

function LongformDisplay({ value }) {
  const segs = String(value || "").split("\f");
  return (
    <div className="field-val longform-display">
      {segs.map((seg, i) => (
        <React.Fragment key={i}>
          {i > 0 && <hr className="longform-break" />}
          <div className="longform-seg">{seg}</div>
        </React.Fragment>
      ))}
    </div>
  );
}

function MarkdownDisplay({ markdown, entries, templates, bodies, onOpenEntry, dirHandle }) {
  const containerRef = useRef(null);
  const wiki = useWikiResolver(entries, templates, bodies);

  const html = useMemo(() => {
    if (!markdown) return "";
    let h;
    try { h = marked.parse(markdown); }
    catch (e) { console.error("md parse failed", e); return `<p>${markdown}</p>`; }

    // Post-process wiki-links. Since v1.7's r043 each resolves through the
    // world's one resolver (wikiResolverOf, 22_trunk): an entry by its
    // primary name or its Name History, a body by its name or another name,
    // a map, a stemma, or a Fabula record by its name, all of which open, and
    // a language, which is drawn found and opens nothing (Drak's call 2).
    const tmp = document.createElement("div");
    tmp.innerHTML = h;
    tmp.querySelectorAll(".wiki-link").forEach(link => {
      const name = (link.dataset.name || "").trim().toLowerCase();
      const found = wiki.find(name);
      if (found && !found.opens) {
        const span = document.createElement("span");
        span.className = "wiki-link wiki-link-found wiki-link-record";
        span.title = wikiRecordKind(found);
        Object.assign(span.style, WIKI_LINK_RECORD_STYLE);
        span.textContent = link.textContent;
        link.replaceWith(span);
      } else if (found) {
        link.dataset.entryId = found.id;
        link.classList.add("wiki-link-found");
      } else {
        link.classList.add("wiki-link-broken");
        link.title = "No entry with that name";
      }
    });
    return tmp.innerHTML;
  }, [markdown, wiki]);

  // Wiki-link click handler
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e) => {
      const link = e.target.closest(".wiki-link-found");
      if (link && link.dataset.entryId) {
        e.preventDefault();
        onOpenEntry && onOpenEntry(link.dataset.entryId);
      }
    };
    el.addEventListener("click", handler);
    return () => el.removeEventListener("click", handler);
  }, [onOpenEntry, html]);

  // Resolve folder-based images via FSAA
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const objectUrls = [];
    const imgs = el.querySelectorAll("img.md-img-folder");
    if (imgs.length === 0) return;

    if (!dirHandle) {
      imgs.forEach(img => {
        img.classList.add("md-img-missing");
        img.alt = `Set up image folder to display: ${img.dataset.filename}`;
      });
      return;
    }

    imgs.forEach(async (img) => {
      const filename = img.dataset.filename;
      try {
        const fh = await dirHandle.getFileHandle(filename);
        const file = await fh.getFile();
        const url = URL.createObjectURL(file);
        objectUrls.push(url);
        img.src = url;
        img.classList.remove("md-img-missing");
      } catch (err) {
        img.classList.add("md-img-missing");
        img.alt = `Image not found: ${filename}`;
      }
    });

    return () => { objectUrls.forEach(u => URL.revokeObjectURL(u)); };
  }, [html, dirHandle]);

  return <div ref={containerRef} className="md-content" dangerouslySetInnerHTML={{ __html: html }} />;
}

// v1.7 r003: what a reference value points at, for display: an entry, a body,
// or another registered record (a Glossopoeia record, a map, and since r007 a
// Fabula record), or null when nothing has its id. `open` says whether a
// click can take you there: entries, maps, and bodies open; a Glossopoeia
// record has no route yet, so it shows as a plain chip (Drak, 2026-10-24),
// and since v1.7's r009 a Fabula record with a page of its own opens too
// (fabulaRecordOpens; Drak, 2026-10-25), and since r011 an act, a chapter,
// or a scene does as well. `kind` names the record's type for a chip that
// can't be opened. Since r012 `place` is an act's, a chapter's, or a scene's
// position and its own name, apart, when the nodes given carry them
// (fabulaStoryNodes), for a chip to draw the position quieter than the name.
const resolveRefTarget = (id, entries, bodies, registeredNodes) => {
  if (!id) return null;
  const e = (entries || []).find(x => x && x.id === id);
  if (e) return { name: e.name, open: true };
  const b = (bodies || []).find(x => x && x.id === id);
  if (b) return { name: b.name, open: true };
  const n = (registeredNodes || []).find(x => x && x.id === id);
  if (!n) return null;
  const src = getRegisteredSourceById(n.templateId);
  return { name: n.name, place: n.place || null, open: n.templateId === SYNTH_TPL_MAP || n.templateId === BODY_REF_SENTINEL || n.templateId === SYNTH_TPL_STEMMA || fabulaRecordOpens(n.templateId), kind: src ? src.name : "" };
};

function FieldValueDisplay({ field, value, entries, templates, bodies, registeredNodes, onOpenEntry, imageFolder, dirHandle, calendar, entry, template, currentMomentDay, showSecrets }) {
  const ftype = field.type;
  if (ftype === "textarea") return <MarkdownDisplay markdown={value || ""} entries={entries} templates={templates} bodies={bodies} onOpenEntry={onOpenEntry} dirHandle={dirHandle} />;
  if (ftype === "longform") return <LongformDisplay value={value || ""} />;
  if (ftype === "text") return <div className="field-val"><InlineWikiLinkText value={value} entries={entries} templates={templates} bodies={bodies} onOpenEntry={onOpenEntry} /></div>;
  if (ftype === "number") return <div className="field-val">{value}</div>;
  if (ftype === "date") return <div className="field-val">{fmtDate(value) || value}</div>;
  if (ftype === "calendar-date") {
    if (!value || value.year == null) return <span className="field-empty">—</span>;
    return <div className="field-val cal-date-display">{`${value.approximate ? "~" : ""}${formatCalendarDate(value, calendar)}`}</div>;
  }
  if (ftype === "calendar-date-range") {
    if (!value || (!value.start && !value.end)) return <span className="field-empty">—</span>;
    const startStr = value.start && value.start.year != null ? formatCalendarDate(value.start, calendar) : "?";
    const endStr = value.end && value.end.year != null ? formatCalendarDate(value.end, calendar) : "ongoing";
    const approxStart = value.start?.approximate ? "~" : "";
    const approxEnd = value.end?.approximate ? "~" : "";
    // Auto-age suffix: fires only when (a) entry+template are in scope (top-
    // level field display, not a group subfield), (b) the template is person-
    // like (has a Status field that includes "Deceased" as an option), and
    // (c) this field is the FIRST calendar-date-range field on the template —
    // matches the lifespan convention used by Linea, Stemma, Concordance hover.
    let ageSuffix = null;
    if (entry && template && templateSupportsDeceased(template)) {
      const firstRange = (template.fields || []).find(f => f.type === "calendar-date-range");
      if (firstRange && firstRange.id === field.id) {
        const ageResult = computeLifespanAge(value, calendar, entry, template, currentMomentDay);
        ageSuffix = ageResult ? ageResult.suffix : null;
      }
    }
    return <div className="field-val cal-date-display">{approxStart}{startStr} → {approxEnd}{endStr}{ageSuffix && <span className="cal-date-age">{ageSuffix}</span>}</div>;
  }
  if (ftype === "name-history") {
    const items = Array.isArray(value) ? value.filter(it => it && it.name) : [];
    if (items.length === 0) return <span className="field-empty">—</span>;
    const fmt = (d) => d && d.year != null ? `${d.approximate ? "~" : ""}${formatCalendarDate(d, calendar)}` : null;
    return (
      <ul className="name-history-display">
        {items.map((it, i) => {
          const fromStr = fmt(it.from);
          const toStr = fmt(it.to);
          let dateStr = "";
          if (fromStr && toStr) dateStr = `${fromStr} – ${toStr}`;
          else if (fromStr) dateStr = `from ${fromStr}`;
          else if (toStr) dateStr = `until ${toStr}`;
          return (
            <li key={i}>
              <span className="name-history-display-name">{it.name}</span>
              {dateStr && <span className="name-history-display-date"> ({dateStr})</span>}
            </li>
          );
        })}
      </ul>
    );
  }
  if (ftype === "url") return <a className="field-link" href={value} target="_blank" rel="noopener noreferrer">{value}</a>;
  if (ftype === "color") return (
    <div className="field-color-swatch">
      <div className="field-color-swatch-box" style={{ background: value }} />
      <span style={{ fontSize: 13, color: "var(--text)" }}>{value}</span>
    </div>
  );
  if (ftype === "image") return <ImagePreview filename={value} imageFolder={imageFolder} dirHandle={dirHandle} />;
  if (ftype === "select") {
    // v1.3: handle both bare-string and {value, customText} storage shapes.
    // For otherTextField with "Other" + customText, displays customText (the
    // user's freeform choice). Entry-view stays non-combined — Type and
    // Subtype show as their own labeled fields here, since the entry-view
    // is the full detail surface. Combining lives in hover panes and md export.
    const display = formatSelectDisplay(value);
    return <div className="field-val">{display}</div>;
  }
  if (ftype === "multiselect") {
    // v1.5: array of chosen option strings, shown as static chips (the
    // tag-list look). Stale values (option later removed from the set) still
    // show, so the entry view never silently hides a recorded pick.
    const picks = Array.isArray(value)
      ? value.filter(v => v != null && String(v).trim() !== "").map(v => String(v).trim())
      : [];
    if (picks.length === 0) return <div className="field-empty">—</div>;
    return <div className="tags-display">{picks.map((p, i) => <span key={i} className="tag">{p}</span>)}</div>;
  }
  if (ftype === "tags") {
    // Accept both the canonical comma-separated string AND arrays (in case
    // imported data was constructed with arrays — the renderer shouldn't
    // crash on shape mismatches that the editor would never produce).
    let tags = [];
    if (Array.isArray(value)) {
      tags = value.filter(t => t != null && String(t).trim() !== "").map(t => String(t).trim());
    } else if (typeof value === "string") {
      tags = value.split(",").map(s => s.trim()).filter(Boolean);
    }
    return <div className="tags-display">{tags.map((t, i) => <span key={i} className="tag">{t}</span>)}</div>;
  }
  if (ftype === "entry-ref") {
    const isRelation = !!field.relationKind;
    const isSpouse = field.relationKind === SPOUSE_KIND;
    const items = isRelation
      ? getRelationValues(value, field.multi)
      : (field.multi ? (Array.isArray(value) ? value.filter(Boolean) : []) : (value ? [value] : [])).map(id => ({ id }));
    const fmt = (d) => d && d.year != null ? `${d.approximate ? "~" : ""}${formatCalendarDate(d, calendar)}` : null;
    return (
      <div className="refs-display">
        {items.map((it, i) => {
          // v1.5 r004: entry-ref values may target either state.entries or
          // state.celestialBodies (when a field's refTemplates includes
          // "Celestial Body"). Bodies retain their id from before migration,
          // so the lookup falls through naturally for legacy refs too.
          // v1.7 r003: so does any other registered record (resolveRefTarget).
          const ref = resolveRefTarget(it.id, entries, bodies, registeredNodes);
          if (!ref) return <span key={i} className="entry-ref-chip" style={{ opacity: 0.5 }}>(missing entry)</span>;
          if (!ref.open) return <span key={i} className="entry-ref-chip" style={{ cursor: "default", background: "var(--accent-glow)", color: "var(--accent)" }} title={ref.kind}>{ref.name}</span>;
          // Spouse-only narrative: status (when non-active) and marriage dates.
          let spouseMeta = null;
          if (isSpouse) {
            const statusStr = it.status && it.status !== "active" ? `[${it.status}]` : "";
            const mStr = fmt(it.marriedOn);
            const eStr = fmt(it.endedOn);
            let dateStr = "";
            if (mStr && eStr) dateStr = `married ${mStr}, ended ${eStr}`;
            else if (mStr) dateStr = `married ${mStr}`;
            else if (eStr) dateStr = `ended ${eStr}`;
            const parts = [statusStr, dateStr].filter(Boolean);
            if (parts.length > 0) spouseMeta = parts.join(" · ");
          }
          return (
            <a key={i} className="entry-ref-chip" onClick={(e) => { e.preventDefault(); onOpenEntry(it.id); }} href="#">
              <span className="entry-ref-chip-icon">→</span>{ref.place ? <><span className="entry-ref-chip-position" style={{ opacity: 0.6 }}>{ref.place.path}</span>{" "}{ref.place.name}</> : ref.name}
              {it.label && <span className="entry-ref-chip-label"> ({it.label})</span>}
              {spouseMeta && <span className="entry-ref-chip-spouse-meta"> — {spouseMeta}</span>}
            </a>
          );
        })}
      </div>
    );
  }
  if (ftype === "group") {
    const instances = Array.isArray(value) ? value : [];
    return (
      <div className="group-instances">
        {instances.map((inst, i) => (
          <div key={i} className="group-instance group-instance-readonly">
            {(field.subfields || []).map(sub => {
              // v1.3: showWhen evaluated against this instance's values
              if (!isFieldVisible(sub, inst)) return null;
              // v1.7 r043: a secret subfield shows only while secrets do, as
              // both exports have it, and is marked as a secret field is.
              if (sub.secret && !showSecrets) return null;
              const subval = inst[sub.id];
              if (subval === "" || subval == null || (Array.isArray(subval) && subval.length === 0)) return null;
              return (
                <div key={sub.id} className={`field-group ${sub.secret ? "secret" : ""}`} style={{ marginBottom: 12 }}>
                  <div className="field-label">{sub.label}{sub.secret && <span className="secret-tag">SECRET</span>}</div>
                  <FieldValueDisplay field={sub} value={subval} entries={entries} templates={templates} bodies={bodies} registeredNodes={registeredNodes} onOpenEntry={onOpenEntry} imageFolder={imageFolder} dirHandle={dirHandle} calendar={calendar} showSecrets={showSecrets} />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }
  if (ftype === "grid") {
    const g = coerceGridValue(value);
    if (gridIsEmpty(g)) return <span className="field-empty">—</span>;
    const renderCellVal = (rid, cid) => {
      const cell = g.cells[rid]?.[cid];
      if (gridCellIsEmpty(cell)) return null;
      const { type, value: cv } = cell;
      if (type === "entry-ref") {
        const ref = resolveRefTarget(cv, entries, bodies, registeredNodes);
        if (!ref) return <span className="entry-ref-chip" style={{ opacity: 0.5 }}>(missing)</span>;
        if (!ref.open) return <span className="entry-ref-chip" style={{ cursor: "default", background: "var(--accent-glow)", color: "var(--accent)" }} title={ref.kind}>{ref.name}</span>;
        return (
          <a className="entry-ref-chip" href="#" onClick={(e) => { e.preventDefault(); onOpenEntry(cv); }}>
            <span className="entry-ref-chip-icon">→</span>{ref.place ? <><span className="entry-ref-chip-position" style={{ opacity: 0.6 }}>{ref.place.path}</span>{" "}{ref.place.name}</> : ref.name}
          </a>
        );
      }
      if (type === "calendar-date") {
        return cv && cv.year != null ? `${cv.approximate ? "~" : ""}${formatCalendarDate(cv, calendar)}` : null;
      }
      if (type === "calendar-date-range") {
        const s = cv.start && cv.start.year != null ? `${cv.start.approximate ? "~" : ""}${formatCalendarDate(cv.start, calendar)}` : "?";
        const e2 = cv.end && cv.end.year != null ? `${cv.end.approximate ? "~" : ""}${formatCalendarDate(cv.end, calendar)}` : "ongoing";
        return `${s} → ${e2}`;
      }
      return String(cv);
    };
    const cellTd = { border: "1px solid var(--border)", padding: "4px 8px", verticalAlign: "top" };
    const hdrTh = { ...cellTd, background: "var(--surf2)", fontWeight: 600, textAlign: "left" };
    return (
      <div className="field-val grid-field-display" style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...hdrTh, color: "var(--text-dim)", fontSize: "0.85em" }}>
                {g.colAxisLabel && <div>{g.colAxisLabel} →</div>}
                {g.rowAxisLabel && <div>↓ {g.rowAxisLabel}</div>}
              </th>
              {g.cols.map(c => <th key={c.id} style={hdrTh}>{c.label || "—"}</th>)}
            </tr>
          </thead>
          <tbody>
            {g.rows.map(r => (
              <tr key={r.id}>
                <th style={hdrTh}>{r.label || "—"}</th>
                {g.cols.map(c => <td key={c.id} style={cellTd}>{renderCellVal(r.id, c.id)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return <div className="field-val">{String(value)}</div>;
}

function ImagePreview({ filename, imageFolder, dirHandle }) {
  const [src, setSrc] = useState(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setErrored(false);
    setSrc(null);
    if (!filename) return;

    // Inline data URL (base64 fallback from no-FSAA worlds) — use directly.
    // Must be checked before FSAA path or we'd attempt to look up a giant
    // data URL string as if it were a filename.
    if (filename.startsWith("data:")) {
      setSrc(filename);
      return;
    }

    // FSAA path
    if (dirHandle) {
      let objectUrl = null;
      (async () => {
        try {
          const fh = await dirHandle.getFileHandle(filename);
          const file = await fh.getFile();
          objectUrl = URL.createObjectURL(file);
          setSrc(objectUrl);
        } catch (e) {
          setErrored(true);
        }
      })();
      return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }

    // Fallback: try static path next to HTML
    setSrc(`${imageFolder || "world-images"}/${filename}`);
  }, [filename, imageFolder, dirHandle]);

  if (!filename) return null;
  if (errored) return <div className="field-image-missing">Image not found: <code>{filename}</code></div>;
  if (!src) return null;
  return <img className="field-image-preview" src={src} alt={filename.startsWith("data:") ? "inline image" : filename} onError={() => setErrored(true)} />;
}
