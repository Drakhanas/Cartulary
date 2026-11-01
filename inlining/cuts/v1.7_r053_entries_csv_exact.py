r"""
v1.7 r053: Entries CSVs read back exactly, the Sweep's third cut.

Drak's call (2026-11-01, option a of two, after the read of r052's turnover
found that r052's join runs on the export's own files): the CSV reader joins
nothing back. The other was to keep the join as r052 left it, the help
describing both cases. His reason: Cartulary ships only at full versions, so
no entries export written before r052 is out in the world; the files that escape
nothing are a spreadsheet's, and a join there costs the export's own files
their exactness. Claude's plan, said to Drak and not stopped:

1. The CSV reader splits a cell at each bare ";", undoes "\;" and "\\", and
   joins nothing back: a Multi-select's, a reference's, and a Name History's
   values read as the cell lists them, so the export's own file reads back
   exactly where r052 ran values together (an own "Salt" with an own or an
   option "Pepper" as the option "Salt; Pepper"; a missing "Ash" with "Elm"
   as a record "Ash; Elm"). A spreadsheet's cell keeps a ";" inside a value
   by writing "\;"; one that doesn't is split, and the preview lists the
   pieces as it lists any value that didn't read, or read as Other.
2. A Multi-select's Other box doesn't make Other one of its options on
   import, from JSON or from a CSV: an own value spelled "other" comes back
   as typed, as the editor keeps it. A dropdown's Other is as before.
3. The comments that described the join say what the code does.
4. Default: the Export entries dialog's CSV note says that a semicolon or a
   backslash inside a value has a backslash written before it.
5. Default: this cut is r053, and the Sweep's later cuts move up one: r054,
   renames say where the links go; r055, Chronometric fits its frame, after
   its tooling commit; r056, Fabula's screens; r057, a grid's starting
   shape; r058, the help. The documents follow in r053's turnover.

- 08_export-layer: the dialog's note; entriesImportOptions; entriesImportCsvList
  and its callers in entriesImportReadCsv and entriesImportText, with the
  comments.

Declared scope: 08_export-layer. No declaration added or removed; no header
added. entriesImportCsvList takes the cell's text alone.

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given), and nothing is written unless every anchor holds.
Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r053_entries_csv_exact.py
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


# ------------------------------------------------------------ 08_export-layer
edit(MODULES / "08_export-layer.jsx", [
    # the dialog's CSV note names the escape
    ('''and several values in one cell are joined by semicolons."''',
     '''and several values in one cell are joined by semicolons, with a backslash before any semicolon or backslash inside a value."'''),
    # a Multi-select's Other box is no option called Other
    (B('''
// A dropdown's options: its own, a dependent dropdown's under every parent's
// choice, and Other where the field keeps an Other text.
const entriesImportOptions = (field) => {
  const own = Array.isArray(field.options) ? field.options : [];
  const by = field.optionsByParent && typeof field.optionsByParent === "object" ? Object.values(field.optionsByParent).flat() : [];
  return [...own, ...by, ...(field.otherTextField ? ["Other"] : [])].filter(o => typeof o === "string");
};
'''), B('''
// A dropdown's or a Multi-select's options: its own, a dependent dropdown's
// under every parent's choice, and a dropdown's Other where it keeps an Other
// text. A Multi-select's Other box keeps values of the user's own, not an
// option called Other, so an own "other" reads as typed (v1.7 r053).
const entriesImportOptions = (field) => {
  const own = Array.isArray(field.options) ? field.options : [];
  const by = field.optionsByParent && typeof field.optionsByParent === "object" ? Object.values(field.optionsByParent).flat() : [];
  return [...own, ...by, ...(field.otherTextField && field.type !== "multiselect" ? ["Other"] : [])].filter(o => typeof o === "string");
};
''')),
    # the Tags column
    ('''tags: entriesImportCsvList(cell(r, at.tags), null),''',
     '''tags: entriesImportCsvList(cell(r, at.tags)),'''),
    # the split, which joins nothing back
    (B(r'''
// A CSV cell's several values (v1.7 r052, Drak's call c): split at each ";"
// the export didn't escape, "\;" read as a ";" inside a value and "\\" as a
// backslash (entriesCsvEscape), each trimmed, the empty ones dropped. Where
// `known` is given, a piece it doesn't take alone is joined with the pieces
// after it, the longest run it takes reading as one value, so a file written
// before r052, which escaped nothing, reads an option or a name holding a
// ";"; a piece it takes alone stays alone, as the export meant it.
const entriesImportCsvList = (text, known) => {
  const s = String(text == null ? "" : text);
  const pieces = [];
  let cur = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "\\" && (s[i + 1] === ";" || s[i + 1] === "\\")) { cur += s[i + 1]; i++; }
    else if (c === ";") { pieces.push(cur); cur = ""; }
    else cur += c;
  }
  pieces.push(cur);
  const out = [];
  for (let i = 0; i < pieces.length; i++) {
    const one = pieces[i].trim();
    if (known && one && !known(one)) {
      let k = pieces.length - 1;
      for (; k > i; k--) if (known(pieces.slice(i, k + 1).join(";").trim())) break;
      if (k > i) { out.push(pieces.slice(i, k + 1).join(";").trim()); i = k; continue; }
    }
    if (one) out.push(one);
  }
  return out;
};
'''), B(r'''
// A CSV cell's several values (v1.7 r052, Drak's call c): split at each ";"
// the export didn't escape, "\;" read as a ";" inside a value and "\\" as a
// backslash (entriesCsvEscape), each trimmed, the empty ones dropped. Since
// r053 nothing is joined back (Drak's call): a file doesn't say what wrote
// it, so a join meant for a file that escaped nothing ran the export's own
// values together; a spreadsheet's cell keeps a ";" inside a value as "\;".
const entriesImportCsvList = (text) => {
  const s = String(text == null ? "" : text);
  const pieces = [];
  let cur = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "\\" && (s[i + 1] === ";" || s[i + 1] === "\\")) { cur += s[i + 1]; i++; }
    else if (c === ";") { pieces.push(cur); cur = ""; }
    else cur += c;
  }
  pieces.push(cur);
  return pieces.map(x => x.trim()).filter(Boolean);
};
''')),
    # entriesImportText's comment
    (B('''
// trimmed; a Tag List's, a Multi-select's, a reference field's, and a Name
// History's values as entriesImportCsvList reads them, a Multi-select's
// rejoined by its options, a reference's by the names here, and a Name
// History's by the entry's own names, and a Multi-select's other values,
// where it keeps values of its own, read as those and listed in ctx.others
// (v1.7 r052); a dropdown's option by its text, case aside, else Other with the
// text where the field keeps an Other text, listed in ctx.others (call 2);'''), B('''
// trimmed; a Tag List's, a Multi-select's, a reference field's, and a Name
// History's values as entriesImportCsvList reads them, and a Multi-select's
// other values, where it keeps values of its own, read as those and listed
// in ctx.others (v1.7 r052); a dropdown's option by its text, case aside,
// else Other with the text where the field keeps an Other text, listed in
// ctx.others (call 2);''')),
    # entriesImportText's callers
    ('''  const parts = entriesImportCsvList(t, null);''',
     '''  const parts = entriesImportCsvList(t);'''),
    ('''      const list = entriesImportCsvList(t, (x) => opt(x) != null);''',
     '''      const list = parts;'''),
    ('''      entriesImportCsvList(t, (x) => had.some(h => entriesImportNorm(h.name) === entriesImportNorm(x))).forEach(name => {''',
     '''      parts.forEach(name => {'''),
    ('''      entriesImportCsvList(t, (x) => !!entriesImportFindByName(field, x, ctx)).forEach(name => {''',
     '''      parts.forEach(name => {'''),
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
    print(f"r053 applied to {len(staged)} files")


if __name__ == "__main__":
    main()
