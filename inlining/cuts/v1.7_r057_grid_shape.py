r"""
v1.7 r057: a grid's starting shape, the Sweep's seventh cut.

docs/sweep-spec.md, section 3, the Sweep's call 1, option a: a starting
shape on the template's Grid field, row and column labels and a cell type
per column, which each new entry's grid copies and can change, and an empty
grid with no shape asks for rows by columns. Claude's plan went to Drak with
the two details section 9 left open at the cut, and his calls, one per
message, were a and a:

1. The builder's controls: two lines, as the builder takes a dropdown's
   options, "Rows: Nominative | Accusative | Genitive" and "Columns:
   Singular | Plural", with a cell-type dropdown for each column under them,
   a column's type following its place in the line.
2. The prompt's limits: up to 20 rows by 20 columns. Claude's defaults with
   it: the boxes start at 2 by 2, a number above the limit is lowered to it
   with a line saying so, and the template's shape has no limit.

The plan's defaults: either of the shape's lists can be empty, and the axis
names stay per entry; a shape in a hand-edited file that doesn't read is
cleaned on import; a new Fabula record does as a new entry where its kind
has a Grid field; an older entry's empty grid, where its field has a shape
now, offers the shape with a button; entries an import makes keep what the
file gives. And one the plan didn't state: a row added to a grid takes, in a
column its field's shape names, the type the shape gives that column, so a
shape of columns alone keeps its types as rows are added.

- 05_field-system: GRID_PROMPT_MAX, gridShapeOf, gridFromShape,
  gridsFromShapes, and withGridShape, new, after gridIsEmpty; withGridShape
  takes the key off a field whose shape is cleared, which r057's probe found
  left behind as undefined in its first run.
- 14_form-engine-edit: GridEditor's empty grid offers its field's shape or
  asks for rows by columns, where it said "Add a row and a column to start
  the grid", and + Row types a new row's cells by the shape.
- 15_template-builder: GridShapeInput, new, in a Grid field's row of the
  builder, where its hint said rows and columns are set per entry.
- 12_trunk: startNewEntry's grid starts as its field's shape;
  newFabulaRecord's and createCorpus's drafts start with their kind's shaped
  grids; normalizeImportedTemplate cleans a Grid field's shape, for a
  template file and a pack.

Declared scope: 05_field-system, 12_trunk, 14_form-engine-edit,
15_template-builder. Declarations added: GRID_PROMPT_MAX, gridShapeOf,
gridFromShape, gridsFromShapes, withGridShape, GridShapeInput; none removed. No header
added.

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given), and nothing is written unless every anchor holds.
Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r057_grid_shape.py
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


# ------------------------------------------------------------ 05_field-system
edit(MODULES / "05_field-system.jsx", [
    (B('''
const gridIsEmpty = (g) => !g || ((g.rows || []).length === 0 && (g.cols || []).length === 0);
'''), B('''
const gridIsEmpty = (g) => !g || ((g.rows || []).length === 0 && (g.cols || []).length === 0);
// v1.7 r057: a Grid field's starting shape (gridShape on the field,
// docs/sweep-spec.md, section 3): its row labels, and its column labels each
// with the type the column's cells start as; either list can be empty.
// gridShapeOf reads a stored or hand-edited shape into that form, or null
// for none; gridFromShape makes a new grid from it, with fresh ids for its
// rows and columns; gridsFromShapes gives a new record's grids, by field id,
// for the shaped Grid fields among fields. GRID_PROMPT_MAX is the most rows
// and columns an empty grid's prompt makes (Drak's call at the cut, a).
const GRID_PROMPT_MAX = 20;
const gridShapeOf = (field) => {
  const s = field && field.gridShape;
  if (!s || typeof s !== "object" || Array.isArray(s)) return null;
  const label = (x) => (typeof x === "string" ? x.trim() : "");
  const rows = (Array.isArray(s.rows) ? s.rows : []).map(label).filter(Boolean);
  const cols = (Array.isArray(s.cols) ? s.cols : [])
    .map(c => (c && typeof c === "object" ? { label: label(c.label), type: GRID_CELL_TYPE_SET.has(c.type) ? c.type : "text" } : { label: label(c), type: "text" }))
    .filter(c => c.label);
  return rows.length > 0 || cols.length > 0 ? { rows, cols } : null;
};
const gridFromShape = (shape) => {
  const g = makeEmptyGrid();
  if (!shape) return g;
  g.rows = shape.rows.map(label => ({ id: genId(), label }));
  g.cols = shape.cols.map(c => ({ id: genId(), label: c.label }));
  g.rows.forEach(r => shape.cols.forEach((c, i) => {
    if (c.type === "text") return;
    if (!g.cells[r.id]) g.cells[r.id] = {};
    g.cells[r.id][g.cols[i].id] = makeGridCell(c.type);
  }));
  return g;
};
const gridsFromShapes = (fields) => Object.fromEntries((Array.isArray(fields) ? fields : [])
  .filter(f => f && f.type === "grid" && gridShapeOf(f))
  .map(f => [f.id, gridFromShape(gridShapeOf(f))]));
// A field with its shape set, or without the key when shape is none, so a
// cleared shape leaves no gridShape behind.
const withGridShape = (f, shape) => {
  const { gridShape, ...rest } = f;
  return shape ? { ...rest, gridShape: shape } : rest;
};
''')),
])


# ------------------------------------------------------------ 14_form-engine-edit
edit(MODULES / "14_form-engine-edit.jsx", [
    (B('''
function GridEditor({ field, value, onChange, entries, templates, bodies, registeredNodes, selfEntryId, calendar }) {
  const g = coerceGridValue(value);
'''), B('''
function GridEditor({ field, value, onChange, entries, templates, bodies, registeredNodes, selfEntryId, calendar }) {
  const g = coerceGridValue(value);
  // v1.7 r057: the field's starting shape, if it has one, and the empty
  // grid's prompt, rows by columns.
  const shape = gridShapeOf(field);
  const [askRows, setAskRows] = useState("2");
  const [askCols, setAskCols] = useState("2");
''')),
    (B('''
  const addRow = () => { const n = clone(); n.rows.push({ id: genId(), label: "" }); commit(n); };
'''), B('''
  // A row added takes, in a column the field's shape names, the type the
  // shape gives that column's cells (v1.7 r057).
  const addRow = () => {
    const n = clone();
    const id = genId();
    n.rows.push({ id, label: "" });
    if (shape) n.cols.forEach(c => {
      const sc = shape.cols.find(x => x.label === (c.label || "").trim());
      if (!sc || sc.type === "text") return;
      if (!n.cells[id]) n.cells[id] = {};
      n.cells[id][c.id] = makeGridCell(sc.type);
    });
    commit(n);
  };
''')),
    (B('''
  const miniBtn = { background: "none", border: "1px solid var(--border)", color: "var(--text-dim)", cursor: "pointer", borderRadius: 3, padding: "0 5px", lineHeight: 1.6, fontSize: "0.8em" };
'''), B('''
  // v1.7 r057: an empty grid starts from its field's shape with a button, or,
  // with no shape, asks for rows by columns, at most GRID_PROMPT_MAX of each,
  // a number above it lowered to it, as the line under the boxes says. The
  // axis names typed before stay.
  const count = (n, one) => `${n} ${n === 1 ? one : `${one}s`}`;
  const shapeText = shape
    ? `The template's grid starts with ${[shape.rows.length > 0 ? count(shape.rows.length, "row") : null, shape.cols.length > 0 ? count(shape.cols.length, "column") : null].filter(Boolean).join(" and ")}.`
    : "";
  const startShape = () => commit({ ...gridFromShape(shape), rowAxisLabel: g.rowAxisLabel, colAxisLabel: g.colAxisLabel });
  const askSize = (s) => Math.min(GRID_PROMPT_MAX, Math.max(1, Math.floor(Number(s)) || 1));
  const askOver = Number(askRows) > GRID_PROMPT_MAX || Number(askCols) > GRID_PROMPT_MAX;
  const makeAsked = () => {
    const n = clone();
    n.rows = Array.from({ length: askSize(askRows) }, () => ({ id: genId(), label: "" }));
    n.cols = Array.from({ length: askSize(askCols) }, () => ({ id: genId(), label: "" }));
    n.cells = {};
    commit(n);
  };

  const miniBtn = { background: "none", border: "1px solid var(--border)", color: "var(--text-dim)", cursor: "pointer", borderRadius: 3, padding: "0 5px", lineHeight: 1.6, fontSize: "0.8em" };
''')),
    (B('''
      {g.rows.length === 0 && g.cols.length === 0 ? (
        <div className="field-hint" style={{ marginBottom: 8 }}>Add a row and a column to start the grid.</div>
      ) : (
'''), B('''
      {g.rows.length === 0 && g.cols.length === 0 ? (shape ? (
        <div className="grid-shape-start" style={{ marginBottom: 8, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <span className="field-hint" style={{ margin: 0 }}>{shapeText}</span>
          <button className="btn btn-ghost" onClick={startShape}>Start from the template's shape</button>
        </div>
      ) : (
        <div className="grid-size-prompt" style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, fontSize: "0.9em" }}>
            <span>Start with</span>
            <input className="input" type="number" min={1} max={GRID_PROMPT_MAX} aria-label="Rows" value={askRows} onChange={e => setAskRows(e.target.value)} style={{ width: 64 }} />
            <span>rows by</span>
            <input className="input" type="number" min={1} max={GRID_PROMPT_MAX} aria-label="Columns" value={askCols} onChange={e => setAskCols(e.target.value)} style={{ width: 64 }} />
            <span>columns</span>
            <button className="btn btn-ghost" onClick={makeAsked}>Make grid</button>
          </div>
          {askOver && <div className="field-hint grid-size-over" style={{ marginTop: 4 }}>The prompt makes at most {GRID_PROMPT_MAX} rows and {GRID_PROMPT_MAX} columns, so this makes {askSize(askRows)} by {askSize(askCols)}; + Row and + Column add more after.</div>}
        </div>
      )) : (
''')),
])


# ------------------------------------------------------------ 15_template-builder
edit(MODULES / "15_template-builder.jsx", [
    (B('''
// Per-parent-value options matrix for a cascade-select child field.
'''), B('''
// v1.7 r057: a Grid field's starting shape in the builder (docs/sweep-spec.md,
// section 3, and Drak's call at the cut, a): its rows and its columns each as
// a line split by "|", as a dropdown's options are, and under them a cell
// type for each column, which follows the column's place in its line. Both
// lines empty leave the field without a shape, a grid each entry shapes
// itself.
function GridShapeInput({ field, onChange }) {
  const shape = gridShapeOf(field) || { rows: [], cols: [] };
  const put = (rows, cols) => onChange(rows.length > 0 || cols.length > 0 ? { rows, cols } : undefined);
  const name = { fontSize: 12, color: "var(--text-dim)", minWidth: 62 };
  return (
    <div className="tpl-grid-shape" style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 5 }}>
      <div className="tpl-cascade-label">Starting shape</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={name}>Rows</span>
        <SelectOptionsInput value={shape.rows} onCommit={rows => put(rows, shape.cols)} placeholder="Nominative | Accusative | Genitive" style={{ flex: 1 }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={name}>Columns</span>
        <SelectOptionsInput value={shape.cols.map(c => c.label)} onCommit={labels => put(shape.rows, labels.map((label, i) => ({ label, type: shape.cols[i] ? shape.cols[i].type : "text" })))} placeholder="Singular | Plural" style={{ flex: 1 }} />
      </div>
      {shape.cols.length > 0 && (
        <div className="tpl-grid-shape-types" style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
          {shape.cols.map((c, i) => (
            <label key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
              <span>{c.label}</span>
              <select className="input" aria-label={`${c.label}: cell type`} value={c.type} onChange={e => put(shape.rows, shape.cols.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)))} style={{ fontSize: 12, padding: "1px 4px" }}>
                {GRID_CELL_TYPES.map(t => <option key={t} value={t}>{GRID_CELL_TYPE_LABELS[t]}</option>)}
              </select>
            </label>
          ))}
        </div>
      )}
      <div className="tpl-cascade-hint" style={{ marginLeft: 0 }}>
        Each new entry's grid starts with these rows and columns, each column's cells of its type, and the entry can change them. Leave both lines empty for a grid each entry shapes itself. Reference cells can point at any entry.
      </div>
    </div>
  );
}

// Per-parent-value options matrix for a cascade-select child field.
''')),
    (B('''
          {field.type === "grid" && (
            <div className="tpl-cascade-hint" style={{ marginLeft: 0 }}>
              Rows, columns, and each cell's type (text, number, entry reference, calendar date, or calendar date range) are set per entry. Reference cells can point at any entry.
            </div>
          )}
'''), B('''
          {field.type === "grid" && (
            <GridShapeInput field={field} onChange={gridShape => onChange({ ...draft, fields: draft.fields.map(f => (f.id === field.id ? withGridShape(f, gridShape) : f)) })} />
          )}
''')),
])


# ------------------------------------------------------------ 12_trunk
edit(MODULES / "12_trunk.jsx", [
    (B('''
      else if (f.type === "grid") draft.fields[f.id] = makeEmptyGrid();
      else draft.fields[f.id] = "";
    });
    if (validOverride) setActiveTemplateId(validOverride.id);
'''), B('''
      else if (f.type === "grid") draft.fields[f.id] = gridFromShape(gridShapeOf(f));  // v1.7 r057: as its shape, or empty
      else draft.fields[f.id] = "";
    });
    if (validOverride) setActiveTemplateId(validOverride.id);
''')),
    (B('''
    const id = `fab-corpus-${genId()}`;
    const draft = { id, name: "", fields: {} };
'''), B('''
    const id = `fab-corpus-${genId()}`;
    const draft = { id, name: "", fields: gridsFromShapes(fabulaKindFields(state, "corpus")) };  // v1.7 r057
''')),
    (B('''
    const id = `fab-${kind}-${genId()}`;
    const draft = { id, name: "", fields: {} };
'''), B('''
    const id = `fab-${kind}-${genId()}`;
    // v1.7 r057: a Grid field with a starting shape starts as it.
    const draft = { id, name: "", fields: gridsFromShapes(fabulaKindFields(state, kind)) };
''')),
    (B('''
      // De-dupe field ids: if a hand-edit duplicates an id, regenerate the dup,
'''), B('''
      // v1.7 r057: a Grid field's starting shape as it reads (gridShapeOf),
      // or none, for a template file and a pack.
      if (f.type === "grid" && "gridShape" in f) {
        const shape = gridShapeOf(f);
        if (shape) f.gridShape = shape;
        else delete f.gridShape;
      }
      // De-dupe field ids: if a hand-edit duplicates an id, regenerate the dup,
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
    print(f"r057 applied to {len(staged)} files")


if __name__ == "__main__":
    main()
