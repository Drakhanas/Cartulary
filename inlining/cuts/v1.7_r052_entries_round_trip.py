r"""
v1.7 r052: Entries files make the round trip, the Sweep's second cut.

docs/sweep-spec.md, section 3, with Drak's call at the cut on the one detail
section 9 left open (2026-11-01, option c of three: the export escapes a ";"
inside a value and the reader rejoins pieces, both, since re-exports will
retire the files that escaped nothing), and his call on what the read of
r051's turnover found (2026-11-01, option a: the filter's reading into this
cut). Claude's plan, said to Drak and not stopped:

1. An entries file whose bytes start with a UTF-16 byte-order mark reads as
   UTF-16 in that order, as readAsText read it through r048; any other file
   reads as since r049, UTF-8 or Windows-1252.
2. A Multi-select that keeps values of its own (its Other box, r005) reads
   a value that isn't one of its options as one of those, from JSON and from
   a CSV, a CSV's listed as an Other's text is; a value matching an option,
   case aside, is that option, as the editor takes one. A Multi-select that
   keeps none refuses such a value, as before.
3. A CSV's date reads a month whose name or abbreviation holds a comma: the
   month is matched with its commas gone, as the date's text is.
4. A dependent dropdown's Other, where the field keeps an Other text, reads
   under any parent's choice, at the top and in a group's rows, by r051's
   rule; with no parent choice it's still listed as not read.
5. A real-world Date reads only on a day its month has, February's 29th in
   a leap year by the Gregorian rule, from JSON and from a CSV.
6. The filter's reading of a Long Text is kept with the query's memo, so a
   filter reads each Long Text once while the world stays the same, as the
   search reads its texts.
7. Call c: in a cell that holds several values (a Multi-select's, a Tag
   List's, the Tags column, a reference's names, a Name History's names)
   the export writes each ";" inside a value as "\;" and each backslash
   as "\\"; a cell that holds one value is written as before. The reader
   splits at a bare ";" only, undoes the escapes, and where a piece doesn't
   read alone joins it with the pieces after it, the longest run that reads
   as one value, so a file written before r052 reads an option or a name
   holding a ";". A Multi-select's run is one of its options, a reference's
   a name here, a Name History's one of the entry's names; a tag has no
   list to match, so only the escape keeps its ";".

- 08_export-layer: entriesCsvEscape and the CSV's writing; entriesImportRealDay
  and the JSON reader's Date and Multi-select; entriesImportCsvList and the
  CSV reader's lists, Date, and Multi-select; the date reader's months; the
  dependent dropdown's check at the top and in a group's rows.
- 12_trunk: readEntriesFile's UTF-16.
- 13_form-engine-display: the query's memo keeps each Long Text's reading.

Declared scope: 08_export-layer, 12_trunk, 13_form-engine-display.
Declarations added: entriesCsvEscape, entriesImportCsvList,
entriesImportRealDay. None removed. No header added.

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given), and nothing is written unless every anchor in
every file holds. Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r052_entries_round_trip.py
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
    # the escape, after the cell writer
    (B(r'''
const entriesCsvCell = (s) => {
  const t = s == null ? "" : String(s);
  return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};
'''), B(r'''
const entriesCsvCell = (s) => {
  const t = s == null ? "" : String(s);
  return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

// A value in a cell that holds several, as the CSV writes it: each backslash
// doubled and each ";" written "\;", so the reader tells a ";" inside a value
// from the one between values (v1.7 r052, Drak's call c).
const entriesCsvEscape = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;");
''')),
    (B('''
// reference's names, a Name History's names) joined by "; "; an image's
// file name, and one kept inside the world as empty.
'''), B('''
// reference's names, a Name History's names) joined by "; ", each escaped
// (entriesCsvEscape, v1.7 r052); an image's file name, and one kept inside
// the world as empty.
''')),
    ('''  const words = (list) => list.map(x => String(x == null ? "" : x).trim()).filter(Boolean).join("; ");''',
     '''  const words = (list) => list.map(x => String(x == null ? "" : x).trim()).filter(Boolean).map(entriesCsvEscape).join("; ");'''),
    ('''    rows.push([e.id, e.name || "", Array.isArray(e.tags) ? e.tags.join("; ") : "", cals.nameOf(e),''',
     '''    rows.push([e.id, e.name || "", Array.isArray(e.tags) ? e.tags.map(entriesCsvEscape).join("; ") : "", cals.nameOf(e),'''),
    # the JSON reader: a real-world day, and a Multi-select's own values
    (B('''
// A file's value as a field here reads it, or why it doesn't: the value the
// export writes for the field's type, a text between the text-like types and
// a number into one, a dropdown's option by its text, a date in `cal` whose
// month and day it has, and references found by entriesImportFindRef.
'''), B('''
// Whether a real-world date's text, YYYY-MM-DD, names a day its month has,
// February's 29th in a leap year by the Gregorian rule, as the browser's
// date box counts them (v1.7 r052).
const entriesImportRealDay = (t) => {
  const m = /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(typeof t === "string" ? t : "");
  if (!m) return false;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1];
  return !!days && d >= 1 && d <= days;
};

// A file's value as a field here reads it, or why it doesn't: the value the
// export writes for the field's type, a text between the text-like types and
// a number into one, a dropdown's option by its text, a date in `cal` whose
// month and day it has, and references found by entriesImportFindRef; since
// v1.7 r052 a Multi-select's values of its own where it keeps them, and a
// real-world date only on a day its month has.
''')),
    ('''      return typeof v === "string" && /^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$/.test(v.trim()) ? ok(v.trim()) : no("it isn't a date written as YYYY-MM-DD");''',
     '''      if (typeof v !== "string" || !/^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$/.test(v.trim())) return no("it isn't a date written as YYYY-MM-DD");
      return entriesImportRealDay(v.trim()) ? ok(v.trim()) : no(`"${v.trim()}" names a day its month doesn't have`);'''),
    (B('''
      const bad = v.filter(x => !opts.includes(x));
      if (bad.length) return no(`${bad.map(x => `"${x}"`).join(", ")} ${bad.length === 1 ? "isn't one of its options" : "aren't among its options"}`);
      return ok([...v]);
'''), B('''
      const bad = v.filter(x => !opts.includes(x));
      if (bad.length && !field.otherTextField) return no(`${bad.map(x => `"${x}"`).join(", ")} ${bad.length === 1 ? "isn't one of its options" : "aren't among its options"}`);
      if (!field.otherTextField) return ok([...v]);
      // where the field keeps values of its own, its Other box's (r005), one
      // that isn't an option is one of those, and one matching an option,
      // case aside, is the option, as the editor takes it (v1.7 r052)
      const out = [];
      v.forEach(x => {
        const t = x.trim();
        if (!t) return;
        const o = opts.find(y => entriesImportNorm(y) === entriesImportNorm(t)) || t;
        if (!out.some(y => entriesImportNorm(y) === entriesImportNorm(o))) out.push(o);
      });
      return ok(out);
''')),
    # the dependent dropdown's Other, in a group's rows and at the top
    ('''        if (!own || (parent && (((sf.optionsByParent || {})[parent]) || []).includes(own))) return;''',
     '''        if (!own || (parent && ((((sf.optionsByParent || {})[parent]) || []).includes(own) || (sf.otherTextField && own === "Other")))) return;'''),
    (B('''
    // A dependent dropdown's choice reads where its parent's choice offers
    // it, as a load keeps it (migrate's cleanup), and a parent's new choice
    // isn't written where it would leave the entry's own choice below it
    // without a place, since the load would clear that choice (call 2).
'''), B('''
    // A dependent dropdown's choice reads where its parent's choice offers
    // it, or, where the field keeps an Other text, as Other under any
    // parent's choice (v1.7 r052), as a load keeps it (migrate's cleanup),
    // and a parent's new choice isn't written where it would leave the
    // entry's own choice below it without a place, since the load would
    // clear that choice (call 2). In a group's rows, the same.
''')),
    ('''        if (!own || (parent && (((f.optionsByParent || {})[parent]) || []).includes(own))) return;''',
     '''        if (!own || (parent && ((((f.optionsByParent || {})[parent]) || []).includes(own) || (f.otherTextField && own === "Other")))) return;'''),
    # the CSV date reader's months
    (B('''
// anywhere; or as numbers, year-month-day, the month counted from 1. A "~"
'''), B('''
// anywhere, a month's own name among them (v1.7 r052); or as numbers,
// year-month-day, the month counted from 1. A "~"
''')),
    (B('''
    const w = entriesImportNorm(word);
    let mi = cal.months.findIndex((mo, i) => entriesImportNorm(mo && mo.name ? mo.name : `Month ${i + 1}`) === w);
    if (mi < 0) mi = cal.months.findIndex((mo, i) => entriesImportNorm(mo && mo.abbreviation ? mo.abbreviation : mo && mo.name ? deriveMonthAbbreviation(mo.name) : `M${i + 1}`) === w);
'''), B('''
    // a month's name or abbreviation read as the date's text is, its commas
    // gone, so a month whose name holds one reads too (v1.7 r052)
    const flat = (s) => entriesImportNorm(String(s).replace(/,/g, " ").replace(/\\s+/g, " "));
    const w = flat(word);
    let mi = cal.months.findIndex((mo, i) => flat(mo && mo.name ? mo.name : `Month ${i + 1}`) === w);
    if (mi < 0) mi = cal.months.findIndex((mo, i) => flat(mo && mo.abbreviation ? mo.abbreviation : mo && mo.name ? deriveMonthAbbreviation(mo.name) : `M${i + 1}`) === w);
''')),
    # the CSV reader's lists
    (B('''
// A CSV's cell as a field here reads its text, or why it doesn't: text as
// typed; an image's file name, a color as #rrggbb, a real-world date as
// YYYY-MM-DD, and a Number as a number, trimmed; a Tag List's, a
// Multi-select's, a reference field's, and a Name History's values split at
// ";"; a dropdown's option by its text, case aside, else Other with the
'''), B(r'''
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

// A CSV's cell as a field here reads its text, or why it doesn't: text as
// typed; an image's file name, a color as #rrggbb, a real-world date as
// YYYY-MM-DD on a day its month has (v1.7 r052), and a Number as a number,
// trimmed; a Tag List's, a Multi-select's, a reference field's, and a Name
// History's values as entriesImportCsvList reads them, a Multi-select's
// rejoined by its options, a reference's by the names here, and a Name
// History's by the entry's own names, and a Multi-select's other values,
// where it keeps values of its own, read as those and listed in ctx.others
// (v1.7 r052); a dropdown's option by its text, case aside, else Other with the
''')),
    ('''  const parts = t.split(";").map(x => x.trim()).filter(Boolean);''',
     '''  const parts = entriesImportCsvList(t, null);'''),
    ('''      return /^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$/.test(t) ? ok(t) : no(`"${t}" isn't a date written as YYYY-MM-DD`);''',
     '''      if (!/^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$/.test(t)) return no(`"${t}" isn't a date written as YYYY-MM-DD`);
      return entriesImportRealDay(t) ? ok(t) : no(`"${t}" names a day its month doesn't have`);'''),
    (B('''
    case "multiselect": {
      const got = parts.map(opt);
      const bad = parts.filter((x, k) => got[k] == null);
      if (bad.length) return no(`${bad.map(x => `"${x}"`).join(", ")} ${bad.length === 1 ? "isn't one of its options" : "aren't among its options"}`);
      return got.length ? ok([...new Set(got)]) : no(null);
    }
'''), B('''
    case "multiselect": {
      const list = entriesImportCsvList(t, (x) => opt(x) != null);
      const got = list.map(opt);
      const bad = list.filter((x, k) => got[k] == null);
      if (bad.length && !field.otherTextField) return no(`${bad.map(x => `"${x}"`).join(", ")} ${bad.length === 1 ? "isn't one of its options" : "aren't among its options"}`);
      // a value that isn't an option, where the field keeps values of its
      // own, is one of those, listed as an Other's text is (v1.7 r052)
      const out = [];
      list.forEach((x, k) => {
        const v = got[k] != null ? got[k] : x;
        if (out.some(y => entriesImportNorm(y) === entriesImportNorm(v))) return;
        if (got[k] == null) ctx.others.push({ row: where.row, field: where.field, id: where.id, text: x });
        out.push(v);
      });
      return out.length ? ok(out) : no(null);
    }
''')),
    (B('''
      const rows = [];
      parts.forEach(name => {
'''), B('''
      const rows = [];
      entriesImportCsvList(t, (x) => had.some(h => entriesImportNorm(h.name) === entriesImportNorm(x))).forEach(name => {
''')),
    (B('''
      const out = [];
      parts.forEach(name => {
'''), B('''
      const out = [];
      entriesImportCsvList(t, (x) => !!entriesImportFindByName(field, x, ctx)).forEach(name => {
''')),
    ('''    return { row: n, id: cell(r, at.id).trim() || null, name: cell(r, at.name), tags: cell(r, at.tags).split(";").map(x => x.trim()).filter(Boolean),''',
     '''    return { row: n, id: cell(r, at.id).trim() || null, name: cell(r, at.name), tags: entriesImportCsvList(cell(r, at.tags), null),'''),
])

# ------------------------------------------------------------------ 12_trunk
edit(MODULES / "12_trunk.jsx", [
    (B('''
  // spreadsheet may save them.
  const pickEntriesFile = (tplId) => {
'''), B('''
  // spreadsheet may save them; since v1.7 r052 one whose bytes start with a
  // UTF-16 byte-order mark as UTF-16 in that order, as readAsText read it
  // through r048.
  const pickEntriesFile = (tplId) => {
''')),
    (B('''
      const bytes = all[0] === 0xEF && all[1] === 0xBB && all[2] === 0xBF ? all.subarray(3) : all;
      let text;
      try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch (e) { text = new TextDecoder("windows-1252").decode(bytes); }
'''), B('''
      const utf16 = all[0] === 0xFF && all[1] === 0xFE ? "utf-16le" : all[0] === 0xFE && all[1] === 0xFF ? "utf-16be" : null;
      const bytes = utf16 ? all.subarray(2) : all[0] === 0xEF && all[1] === 0xBB && all[2] === 0xBF ? all.subarray(3) : all;
      let text;
      if (utf16) text = new TextDecoder(utf16).decode(bytes);
      else {
        try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch (e) { text = new TextDecoder("windows-1252").decode(bytes); }
      }
''')),
])

# ----------------------------------------------------- 13_form-engine-display
edit(MODULES / "13_form-engine-display.jsx", [
    (B('''
// calendar, the link index's links either way, and each entry's search
// text, made when first asked. ctx.cal is the calendar of the entry being
// read, set before each.
'''), B('''
// calendar, the link index's links either way, each Long Text's reading
// (v1.7 r052), and each entry's search text, made when first asked. ctx.cal
// is the calendar of the entry being read, set before each.
''')),
    (B('''
  const ctx = {
    showSecrets: !!showSecrets,
'''), B('''
  const ctx = {
    showSecrets: !!showSecrets,
    longTexts: new Map(),
''')),
    ('''    case "textarea": return typeof v === "string" ? queryMarkdownText(v) : "";''',
     B('''
    case "textarea": {
      // kept with the query's memo, so a filter reads each Long Text once
      // while the world stays the same, as the search does (v1.7 r052)
      if (typeof v !== "string") return "";
      const kept = ctx && ctx.longTexts;
      if (!kept) return queryMarkdownText(v);
      let s = kept.get(v);
      if (s === undefined) { s = queryMarkdownText(v); kept.set(v, s); }
      return s;
    }''')),
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
    print(f"r052 applied to {len(staged)} files")


if __name__ == "__main__":
    main()
