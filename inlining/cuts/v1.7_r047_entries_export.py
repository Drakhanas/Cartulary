"""
v1.7 r047: Export entries in JSON and CSV, Pipes' ninth cut.

docs/pipes-spec.md, section 7, with the two details Drak settled at the cut
(2026-10-30, one per message: a, a):

1. The JSON's values. Each is written in the shape the world file keeps it:
   a date as its year, month (from 0), and day, approximate where it is, a
   range as its start and end, a Name History row as its name, from, and
   to, a dropdown's Other as its value and its text, and a grid as stored;
   a reference is turned into its record's name and template, or its kind
   for a record that isn't an entry, beside its id.
2. The CSV's values, for a spreadsheet. The columns are id, Name, Tags, and
   Calendar (blank for the primary), then the fields in the template's
   order. Several values in one cell are joined by "; ". A date in the
   world's calendars is written as the entry's calendar writes it, "~"
   before an approximate one, and a range takes two columns, "Label ·
   start" and "Label · end"; a real-world date is written as stored. A Name
   History is its names; a reference is its record's name, its relation's
   label, status, and dates left out; a dropdown's Other is its text; a
   Number and Long Text as typed, line breaks kept; an image is its file
   name. The file is UTF-8 with a byte-order mark and CRLF line ends, a
   cell quoted only where it holds a comma, a quote, or a line break.
   Groups and grids are left out.

With them, Claude's defaults, said in the plan and not stopped: Export
entries… in a template's Export ↓ opens a dialog with the count, JSON or
CSV, Include secret-marked fields (off), and Export, and each Export writes
one file, <template>.entries.json or <template>.entries.csv; it writes
every entry the template has, whatever its list shows, and Lock mode
doesn't stop it. The JSON is { cartulary_entries_export: 1, exported_at,
secrets, template: { name, fields: [{ label, id, type, subfields }] },
calendars: [{ name, id }], entries: [{ id, name, tags, calendar, fields }] },
an entry's calendar null for the primary and a calendar's name otherwise,
its fields by label in the template's order, empty as null, and a group's
rows by their subfields' labels; a label used twice in one list of fields
is written the second time as "Label (2)", the field list keeping the real
labels, and in the CSV heads a second column. A secret field, at any depth,
stays out unless the box is ticked, and `secrets` says whether the file
holds them; a field hidden by its show-when is written as stored. An image
kept inside the world (a data URL) has no file name, so it's written as
empty, and the dialog counts them. A Number is written as a number where
it reads as one. A world import refuses the file and says to use a
template's Import entries. The writers sit in 08_export-layer under a
header of their own, and the menu item and the refusal in 12_trunk; no file
is added.

Settled in the build, after the calls: a reference inside a group or a
grid's cell is turned the same way, and one to a record the world no longer
has is left out (a grid's cell with it); a repeated label's number skips
one a label already holds, so beside a field labelled "Notes (2)" the
second Notes is "Notes (3)"; the field list gives a field its `key` where
that isn't its label, and marks a secret one `secret` where it's written;
the secrets box shows only where the template has a secret field; two
calendars with one name are told apart as labels are, the second's
entries naming it by its `key` in the JSON (the CSV names it, as it heads
a repeated label twice), and an entry whose calendar id names no calendar
is written on the primary, as its dates are read; a
Number is a number only where its text is that number's own (12, -3.5), so
007, 1.50, and 1e3 stay as typed; the entries go in the order the world
keeps them; a Longform Note goes as stored, its page breaks kept; a
template with no entries writes its fields alone, the CSV a header row;
and the world import refuses an entries file of any version. The dialog
sits in 08_export-layer beside the HTML export's, its precedent, App
opening it, and takes the keys and keeps the focus as the record modals
do. Plot Thread and Theme / Motif have no list page, Fabula's index being
theirs, so Export entries… sits in their Export ↓ there too, in
28_fabula/08_threads, which the plan didn't name; Fabula's index hides its
buttons in Lock mode, Export ↓ with them, as it did.

- 08_export-layer: the writers under `Entries export (v1.7 r047)`: the
  keys, the fields written, the field list, the calendars, a reference, a
  value for each file, the two files, the count of inline images, the
  download, and the dialog.
- 12_trunk: Export entries… in the template page's Export ↓, the dialog's
  state and mount, Fabula's Export entries routed to it, and the world
  import's refusal.
- 28_fabula/08_threads: Export entries… in a Fabula template's Export ↓.

Declared scope: 08_export-layer, 12_trunk, 28_fabula/08_threads.
Declarations added: entriesExportKeys, entriesExportFields,
entriesExportHasSecret, entriesExportFieldList, entriesExportEntries,
entriesExportContext, entriesExportRef, entriesExportCalendars,
entriesExportJsonValue, buildEntriesExportJson, entriesCsvCell,
entriesCsvColumns, entriesCsvValue, buildEntriesExportCsv,
entriesExportInlineImages, downloadEntriesExport, EntriesExportModal. None
removed. One header added: `Entries export (v1.7 r047)`.

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given), and nothing is written unless every anchor in
every file holds. Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r047_entries_export.py
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
# The writers and the dialog, after the HTML export's modal, which ends the
# file (with no newline after it, as before).
HTML_MODAL_END = B(r'''
          <button className="btn btn-accent" onClick={submit}>Export</button>
        </div>
      </div>
    </div>
  );
}''')

ENTRIES_EXPORT = header("Entries export (v1.7 r047)") + "\n" + r'''// docs/pipes-spec.md, section 7, with Drak's calls at the cut: Export entries
// on a template writes every entry it has, whatever its list shows, as one
// file at a click, JSON or CSV. The JSON, `cartulary_entries_export: 1`,
// keeps each value in the shape the world file does (call 1), a reference
// written as its record's name and template, or kind, beside its id; the CSV
// writes what a spreadsheet reads, a row per entry and a column per field
// (call 2). Secret fields stay out unless asked for, at every depth, and an
// image goes as its file name. A world import refuses the file (12_trunk).

// The keys a list of fields is written under: each one's label, and a label
// used already as "Label (2)", "Label (3)", with the first number no label
// in the list holds, so no two keys are one.
const entriesExportKeys = (fields) => {
  const label = (f) => (f && typeof f.label === "string" ? f.label : "");
  const used = new Set(fields.map(label));
  const seen = new Set();
  return fields.map(f => {
    const l = label(f);
    if (!seen.has(l)) { seen.add(l); return l; }
    let n = 2;
    while (used.has(`${l} (${n})`)) n++;
    used.add(`${l} (${n})`);
    return `${l} (${n})`;
  });
};

// The fields the file writes, at any depth: every one, or with secrets left
// out, those not marked secret.
const entriesExportFields = (fields, includeSecrets) =>
  (Array.isArray(fields) ? fields : []).filter(f => f && (includeSecrets || !f.secret));

// Whether a template has a field marked secret, at any depth.
const entriesExportHasSecret = (fields) =>
  (Array.isArray(fields) ? fields : []).some(f => f && (f.secret || (f.type === "group" && entriesExportHasSecret(f.subfields))));

// The template's fields as the JSON lists them: each one's label, id, and
// type, the key its values are written under where that isn't its label, a
// secret one marked so, and a group's subfields the same way.
const entriesExportFieldList = (fields, includeSecrets) => {
  const kept = entriesExportFields(fields, includeSecrets);
  const keys = entriesExportKeys(kept);
  return kept.map((f, i) => {
    const d = { label: f.label, id: f.id, type: f.type };
    if (keys[i] !== f.label) d.key = keys[i];
    if (f.secret) d.secret = true;
    if (f.type === "group") d.subfields = entriesExportFieldList(f.subfields, includeSecrets);
    return d;
  });
};

// A template's entries, every one, in the order the world keeps them.
const entriesExportEntries = (state, template) =>
  (state && Array.isArray(state.entries) ? state.entries : []).filter(e => e && template && e.templateId === template.id);

// What naming a reference's record takes: every entry by id, each
// template's name, and the other records a field can point at.
const entriesExportContext = (state, includeSecrets) => {
  const entryById = {};
  (state.entries || []).forEach(e => { if (e && e.id) entryById[e.id] = e; });
  const tplName = {};
  (state.templates || []).forEach(t => { if (t && t.id) tplName[t.id] = t.name || ""; });
  return { entryById, tplName, nodeById: registeredNodeIndex(state), includeSecrets: !!includeSecrets };
};

// A reference as the file writes it: its record's name, and the entry's
// template or the other record's kind, beside its id; null for an id no
// record in the world has.
const entriesExportRef = (id, ctx) => {
  if (typeof id !== "string" || !id) return null;
  const e = ctx.entryById[id];
  if (e) return { name: e.name || "", template: ctx.tplName[e.templateId] || "", id };
  const n = ctx.nodeById[id];
  if (!n) return null;
  const src = getRegisteredSourceById(n.templateId);
  return { name: n.name || "", kind: src ? src.name : "", id };
};

// The calendars the entries are written in, as the JSON lists them, the
// primary first: each one's name and id, the primary's id null, and the key
// a name used already is written under, as a label's is. An entry's
// calendar is read as its dates are: an id no calendar has reads as the
// primary (getCalendar).
const entriesExportCalendars = (state, entries) => {
  const extra = (Array.isArray(state.calendars) ? state.calendars : []).filter(c => c && c.id);
  const byId = Object.fromEntries(extra.map(c => [c.id, c]));
  const idOf = (e) => (e && e.calendarId && byId[e.calendarId] ? e.calendarId : null);
  const used = new Set(entries.map(idOf));
  const list = [];
  if (used.has(null)) list.push({ name: (state.world && state.world.calendar && state.world.calendar.name) || "", id: null });
  const named = extra.filter(c => used.has(c.id));
  const keys = entriesExportKeys(named.map(c => ({ label: c.name || "" })));
  const keyById = {};
  named.forEach((c, i) => {
    keyById[c.id] = keys[i];
    list.push(keys[i] !== (c.name || "") ? { name: c.name || "", id: c.id, key: keys[i] } : { name: c.name || "", id: c.id });
  });
  return {
    list,
    keyOf: (e) => { const id = idOf(e); return id ? keyById[id] : null; },
    nameOf: (e) => { const id = idOf(e); return id ? (byId[id].name || "") : ""; },
    calOf: (e) => getCalendar(state, idOf(e)),
  };
};

// A value as the JSON writes it: the shape the world file keeps, copied, a
// reference turned into entriesExportRef's and one to nothing left out, at
// any depth; a group's rows keyed by their subfields' keys; a Number as a
// number where its text is that number's own (12, -3.5), and as typed where
// it isn't (007, 1.50); an image kept inside the world, with no file name,
// as empty; and anything empty as null.
const entriesExportJsonValue = (field, v, ctx) => {
  if (queryIsBlank(field, v)) return null;
  const copy = (x) => JSON.parse(JSON.stringify(x));
  switch (field.type) {
    case "entry-ref": {
      const items = field.relationKind
        ? getRelationValues(v, field.multi).map(it => {
            const r = entriesExportRef(it.id, ctx);
            if (!r) return null;
            const { id, ...rest } = it;
            return { ...r, ...copy(rest) };
          })
        : getEntryRefIds(field, v).map(id => entriesExportRef(id, ctx));
      const kept = items.filter(Boolean);
      return field.multi ? (kept.length ? kept : null) : (kept[0] || null);
    }
    case "group": {
      if (!Array.isArray(v)) return null;
      const subs = entriesExportFields(field.subfields, ctx.includeSecrets);
      const keys = entriesExportKeys(subs);
      return v.map(row => {
        const out = {};
        subs.forEach((sf, i) => { out[keys[i]] = entriesExportJsonValue(sf, row && typeof row === "object" ? row[sf.id] : null, ctx); });
        return out;
      });
    }
    case "grid": {
      const g = copy(v);
      const cells = g && g.cells && typeof g.cells === "object" ? g.cells : {};
      Object.keys(cells).forEach(rid => {
        const row = cells[rid];
        if (!row || typeof row !== "object") return;
        Object.keys(row).forEach(cid => {
          const cell = row[cid];
          if (!cell || cell.type !== "entry-ref" || typeof cell.value !== "string" || !cell.value) return;
          const r = entriesExportRef(cell.value, ctx);
          if (r) cell.value = r; else delete row[cid];
        });
      });
      return g;
    }
    case "number": {
      const n = fieldNumberValue(v);
      return n != null && String(n) === String(v).trim() ? n : copy(v);
    }
    case "image":
      return typeof v === "string" && v.startsWith("data:") ? null : copy(v);
    default:
      return copy(v);
  }
};

// The JSON file: the template's name and fields, the calendars its entries
// use, and each entry with its id, name, tags, calendar (null for the
// primary), and fields by key, in the template's order.
const buildEntriesExportJson = (state, template, options) => {
  const includeSecrets = !!(options && options.includeSecrets);
  const ctx = entriesExportContext(state, includeSecrets);
  const fields = entriesExportFields(template.fields, includeSecrets);
  const keys = entriesExportKeys(fields);
  const entries = entriesExportEntries(state, template);
  const cals = entriesExportCalendars(state, entries);
  return {
    cartulary_entries_export: 1,
    exported_at: new Date().toISOString(),
    secrets: includeSecrets && entriesExportHasSecret(template.fields),
    template: { name: template.name || "", fields: entriesExportFieldList(template.fields, includeSecrets) },
    calendars: cals.list,
    entries: entries.map(e => {
      const values = e.fields || {};
      const out = {};
      fields.forEach((f, i) => { out[keys[i]] = entriesExportJsonValue(f, values[f.id], ctx); });
      return { id: e.id, name: e.name || "", tags: Array.isArray(e.tags) ? [...e.tags] : [], calendar: cals.keyOf(e), fields: out };
    }),
  };
};

// A CSV cell: quoted, its quotes doubled, only where it holds a comma, a
// quote, or a line break.
const entriesCsvCell = (s) => {
  const t = s == null ? "" : String(s);
  return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

// The CSV's columns after id, Name, Tags, and Calendar: one for each field
// the file writes at the top level, in the template's order, a date range
// two, its start and its end; groups and grids are left out, and a label
// used twice heads two columns.
const entriesCsvColumns = (template, includeSecrets) => {
  const cols = [];
  entriesExportFields(template.fields, includeSecrets).forEach(f => {
    if (f.type === "group" || f.type === "grid") return;
    if (f.type === "calendar-date-range") {
      cols.push({ field: f, side: "start", head: `${f.label} · start` });
      cols.push({ field: f, side: "end", head: `${f.label} · end` });
    } else cols.push({ field: f, head: f.label });
  });
  return cols;
};

// A value as the CSV writes it: text and a Number as typed, line breaks
// kept; a date in the entry's calendar as the page writes it, "~" before an
// approximate one, and a real-world date as stored; a dropdown's choice, an
// Other as its text; several values (a Multi-select's, a Tag List's, a
// reference's names, a Name History's names) joined by "; "; an image's
// file name, and one kept inside the world as empty.
const entriesCsvValue = (col, v, cal, ctx) => {
  const f = col.field;
  if (queryIsBlank(f, v)) return "";
  const day = (d) => (d && typeof d === "object" && d.year != null ? `${d.approximate ? "~" : ""}${formatCalendarDate(d, cal)}` : "");
  const words = (list) => list.map(x => String(x == null ? "" : x).trim()).filter(Boolean).join("; ");
  switch (f.type) {
    case "calendar-date": return day(v);
    case "calendar-date-range": return v && typeof v === "object" ? day(v[col.side]) : "";
    case "select": return formatSelectDisplay(v);
    case "multiselect": return Array.isArray(v) ? words(v) : "";
    case "tags": return words(Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : []);
    case "name-history": return Array.isArray(v) ? words(v.filter(it => it && typeof it.name === "string").map(it => it.name)) : "";
    case "entry-ref": return words(getEntryRefIds(f, v).map(id => entriesExportRef(id, ctx)).filter(Boolean).map(r => r.name));
    case "image": return typeof v === "string" && !v.startsWith("data:") ? v : "";
    default: return typeof v === "string" || typeof v === "number" ? String(v) : "";
  }
};

// The CSV file: UTF-8 with a byte-order mark, a header row, and a row for
// each entry, its lines ended CRLF, as a spreadsheet opens it.
const buildEntriesExportCsv = (state, template, options) => {
  const includeSecrets = !!(options && options.includeSecrets);
  const ctx = entriesExportContext(state, includeSecrets);
  const cols = entriesCsvColumns(template, includeSecrets);
  const entries = entriesExportEntries(state, template);
  const cals = entriesExportCalendars(state, entries);
  const rows = [["id", "Name", "Tags", "Calendar", ...cols.map(c => c.head)]];
  entries.forEach(e => {
    const values = e.fields || {};
    const cal = cals.calOf(e);
    rows.push([e.id, e.name || "", Array.isArray(e.tags) ? e.tags.join("; ") : "", cals.nameOf(e),
      ...cols.map(c => entriesCsvValue(c, values[c.field.id], cal, ctx))]);
  });
  return "\uFEFF" + rows.map(r => r.map(entriesCsvCell).join(",")).join("\r\n") + "\r\n";
};

// How many images the file writes as empty, kept inside the world with no
// file name: in the fields the JSON writes, or in the CSV's columns.
const entriesExportInlineImages = (state, template, options) => {
  const includeSecrets = !!(options && options.includeSecrets);
  const csv = !!(options && options.format === "csv");
  const count = (fields, values) => entriesExportFields(fields, includeSecrets).reduce((n, f) => {
    const v = values && typeof values === "object" ? values[f.id] : null;
    if (f.type === "image") return n + (typeof v === "string" && v.startsWith("data:") ? 1 : 0);
    if (f.type === "group" && !csv && Array.isArray(v)) return v.reduce((m, row) => m + count(f.subfields, row), n);
    return n;
  }, 0);
  return entriesExportEntries(state, template).reduce((n, e) => n + count(template.fields, e.fields), 0);
};

// Writes the file, named for the template, .entries.json or .entries.csv,
// and says how many entries it holds.
const downloadEntriesExport = (state, template, options) => {
  const csv = !!(options && options.format === "csv");
  const text = csv ? buildEntriesExportCsv(state, template, options) : JSON.stringify(buildEntriesExportJson(state, template, options), null, 2);
  const blob = new Blob([text], { type: csv ? "text/csv;charset=utf-8" : "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(template.name) || "template"}.entries.${csv ? "csv" : "json"}`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return entriesExportEntries(state, template).length;
};

// The dialog Export entries opens: how many entries, JSON or CSV, the
// secret fields where the template has any, a word on the images the file
// can't name, and Export, which writes the one file. Esc and a click
// outside cancel; while it's open the keys are its own and the focus stays
// in it, as the record modals' do.
function EntriesExportModal({ state, template, onCancel, onConfirm }) {
  const [format, setFormat] = useState("json");
  const [includeSecrets, setIncludeSecrets] = useState(false);
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
  const count = useMemo(() => entriesExportEntries(state, template).length, [state, template]);
  const secret = useMemo(() => entriesExportHasSecret(template.fields), [template]);
  const withSecrets = secret && includeSecrets;
  const inline = useMemo(() => entriesExportInlineImages(state, template, { format, includeSecrets: withSecrets }), [state, template, format, withSecrets]);
  const dim = { color: "var(--text-dim)", fontSize: "calc(13px * var(--font-scale))" };
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal entries-export" ref={box} role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">Export the entries of "{template.name || "Untitled"}"</div>
        <div className="modal-body">
          <p className="entries-export-count" style={{ margin: "0 0 14px" }}>
            {count === 0 ? "This template has no entries yet, so the file holds its fields alone."
              : count === 1 ? "1 entry, this template's only one."
              : `${count} entries, every one this template has, whatever its list shows.`}
          </p>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", marginBottom: 6, ...dim }}>Format</label>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className={`btn btn-small ${format === "json" ? "btn-accent" : "btn-ghost"} entries-export-format`} data-format="json" aria-pressed={format === "json"} onClick={() => setFormat("json")}>JSON</button>
              <button type="button" className={`btn btn-small ${format === "csv" ? "btn-accent" : "btn-ghost"} entries-export-format`} data-format="csv" aria-pressed={format === "csv"} onClick={() => setFormat("csv")}>CSV</button>
            </div>
            <div className="entries-export-about" style={{ marginTop: 8, ...dim }}>
              {format === "csv"
                ? "A row for each entry and a column for each field, for a spreadsheet. Groups and grids are left out, a reference is written as its record's name, and several values in one cell are joined by semicolons."
                : "Every field as the world keeps it, a reference written as its record's name and template beside its id."}
            </div>
          </div>
          {secret && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" className="entries-export-secrets" checked={includeSecrets} onChange={e => setIncludeSecrets(e.target.checked)} />
                Include secret-marked fields
              </label>
            </div>
          )}
          {inline > 0 && (
            <div className="modal-notice modal-notice-info entries-export-inline" style={{ marginBottom: 0 }}>
              {inline === 1
                ? "1 image here is kept inside the world, with no file in its images folder, so the file writes it as empty."
                : `${inline} images here are kept inside the world, with no file in its images folder, so the file writes them as empty.`}
            </div>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-accent entries-export-go" autoFocus onClick={() => onConfirm({ format, includeSecrets: withSecrets })}>Export</button>
        </div>
      </div>
    </div>
  );
}'''

edit(MODULES / "08_export-layer.jsx", [
    (HTML_MODAL_END, HTML_MODAL_END + "\n\n" + ENTRIES_EXPORT),
])


# ------------------------------------------------------------------ 12_trunk
EXPORT_TITLE_OLD = 'title="Export this template as a portable file"'
EXPORT_TITLE_NEW = 'title="Export this template, or its entries, as a file"'

edit(MODULES / "12_trunk.jsx", [
    # The dialog's state: the template whose entries it exports, by id.
    ("  const [fabulaExport, setFabulaExport] = useState(null);  // v1.7 r023: Fabula's export modal, { kind: \"story\" | \"corpus\", id }\n",
     "  const [fabulaExport, setFabulaExport] = useState(null);  // v1.7 r023: Fabula's export modal, { kind: \"story\" | \"corpus\", id }\n"
     "  const [entriesExport, setEntriesExport] = useState(null);  // v1.7 r047: the entries export dialog's template, by id\n"),
    # The world import refuses an entries file, whatever its version.
    ("      if (parsed && parsed.cartulary_mapstamp_pack === 1) {\n"
     "        flash(\"That's a stamp pack. Import it from the Stamps panel at the top of Cartographia, not as a world.\", \"error\");\n"
     "        return;\n"
     "      }\n",
     "      if (parsed && parsed.cartulary_mapstamp_pack === 1) {\n"
     "        flash(\"That's a stamp pack. Import it from the Stamps panel at the top of Cartographia, not as a world.\", \"error\");\n"
     "        return;\n"
     "      }\n"
     "      // v1.7 r047: an entries file holds an \"entries\" list, so the shape\n"
     "      // check below would take it for a world's; it goes to a template's\n"
     "      // Import entries, whatever its version.\n"
     "      if (parsed && parsed.cartulary_entries_export != null) {\n"
     "        flash(\"That's an entries file. Import it from a template's Import entries, not as a world.\", \"error\");\n"
     "        return;\n"
     "      }\n"),
    # Export entries… in the template page's Export ↓.
    ("                      onClick={() => setExportMenuOpen(o => !o)}\n"
     "                      " + EXPORT_TITLE_OLD + "\n",
     "                      onClick={() => setExportMenuOpen(o => !o)}\n"
     "                      " + EXPORT_TITLE_NEW + "\n"),
    ("                        <button onClick={() => { exportTemplateMarkdown(activeTemplate); setExportMenuOpen(false); }}>\n"
     "                          Export as .template.md\n"
     "                        </button>\n",
     "                        <button onClick={() => { exportTemplateMarkdown(activeTemplate); setExportMenuOpen(false); }}>\n"
     "                          Export as .template.md\n"
     "                        </button>\n"
     "                        <button className=\"export-entries\" onClick={() => { setEntriesExport(activeTemplate.id); setExportMenuOpen(false); }}>\n"
     "                          Export entries…\n"
     "                        </button>\n"),
    # Fabula's Export entries… opens the same dialog.
    ("                onExportTemplate: (tpl, fmt) => (fmt === \"md\" ? exportTemplateMarkdown(tpl) : exportTemplateJson(tpl)),\n",
     "                onExportTemplate: (tpl, fmt) => (fmt === \"entries\" ? setEntriesExport(tpl.id) : fmt === \"md\" ? exportTemplateMarkdown(tpl) : exportTemplateJson(tpl)),\n"),
    # The dialog, drawn by App while a template's entries are being exported.
    ("      {showHtmlExportModal && (\n"
     "        <HtmlExportModal\n"
     "          state={state}\n"
     "          onCancel={() => setShowHtmlExportModal(false)}\n"
     "          onConfirm={(options) => {\n"
     "            setShowHtmlExportModal(false);\n"
     "            exportHtml(options);\n"
     "          }}\n"
     "        />\n"
     "      )}\n",
     "      {showHtmlExportModal && (\n"
     "        <HtmlExportModal\n"
     "          state={state}\n"
     "          onCancel={() => setShowHtmlExportModal(false)}\n"
     "          onConfirm={(options) => {\n"
     "            setShowHtmlExportModal(false);\n"
     "            exportHtml(options);\n"
     "          }}\n"
     "        />\n"
     "      )}\n"
     "\n"
     "      {entriesExport && (() => {\n"
     "        const tpl = state.templates.find(t => t && t.id === entriesExport);\n"
     "        if (!tpl) return null;\n"
     "        return (\n"
     "          <EntriesExportModal\n"
     "            state={state}\n"
     "            template={tpl}\n"
     "            onCancel={() => setEntriesExport(null)}\n"
     "            onConfirm={(options) => {\n"
     "              setEntriesExport(null);\n"
     "              const n = downloadEntriesExport(state, tpl, options);\n"
     "              flash(`Exported ${n === 1 ? \"1 entry\" : `${n} entries`} of \"${tpl.name}\" as ${options.format === \"csv\" ? \"CSV\" : \"JSON\"}${options.includeSecrets ? \", secret fields included\" : \"\"}.`);\n"
     "            }}\n"
     "          />\n"
     "        );\n"
     "      })()}\n"),
])


# ------------------------------------------------------- 28_fabula/08_threads
edit(MODULES / "28_fabula" / "08_threads.jsx", [
    ("onClick={() => setMenu(o => !o)} " + EXPORT_TITLE_OLD + ">Export ↓</button>",
     "onClick={() => setMenu(o => !o)} " + EXPORT_TITLE_NEW + ">Export ↓</button>"),
    ("                  <button onClick={() => { onExportTemplate(tpl, \"md\"); setMenu(false); }}>Export as .template.md</button>\n",
     "                  <button onClick={() => { onExportTemplate(tpl, \"md\"); setMenu(false); }}>Export as .template.md</button>\n"
     "                  <button className=\"export-entries\" onClick={() => { onExportTemplate(tpl, \"entries\"); setMenu(false); }}>Export entries…</button>\n"),
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
    print(f"r047 applied to {len(staged)} files")


if __name__ == "__main__":
    main()
