"""
v1.7 r051: Fields kept and shown as entered, the Sweep's first cut.

docs/sweep-spec.md, section 3. The Sweep's plan (2026-10-31) leaves r051 no
open detail; Claude's plan for the cut, said to Drak and not stopped (18:56,
"go"):

1. A dependent dropdown's Other survives the save and every load. The
   editor offers Other under every parent where the field keeps an Other
   text (14_form-engine-edit, its v1.3 comment), but normalizeEntryFields
   kept a dependent choice only where its parent's options list it, so
   Other and its text were cleared at the next save, in an entry's fields
   and in a group's rows alike. The cleanup now lets Other through where
   the field keeps an Other text; a choice the parent doesn't offer is
   still cleared, and text already cleared doesn't come back. The entries
   import keeps its own check until r052.
2. A real-world Date field shows its own day. fmtDate handed a bare
   "2026-10-30" to new Date(), which reads one as midnight UTC, the day
   before anywhere west of it. A bare year-month-day is now built as that
   day where the reader is, years below 100 included; a timestamp, and a
   day no calendar has, read as before. The search reads a Date through
   fmtDate, so it follows; a filter's before, after, and between compare
   the stored day, and the exports write the stored text, as before.
3. The search reads a Long Text the way the page draws it: through the
   same marked, with the wiki-link extension 10_migrate gives it, the words
   shown kept and a line between blocks, so a link's address and the
   markup's characters no longer count and a word broken by markup is
   found. It's read in an element made once in a document of its own
   (createHTMLDocument), which loads nothing. A text with no character
   markdown reads, its [[links]] aside, and no line starting with a space
   or a number a list would take, is read without marked, line by line, as
   marked draws it, which keeps r045's first search on a 10,000-entry world under
   its 400 ms. Should marked fail, the text is read as before. Short Text
   and Longform, which the page shows as typed, are read as before.
4. The comment over celestialBodies stops naming the celestial-body
   template v1.5's r004 deleted and says what a body carries.

Added while checking the build before it went to Drak, and said in its
staging message:

5. With no parent choice a dependent dropdown is off and the save clears
   it, Other and its text included, as before (item 1). The editor went on
   showing an Other there, its text still open to typing, until the save
   took both; it now shows the dropdown empty, as it shows a choice the
   parent doesn't offer. The stored value waits for the save as before, so
   picking a parent again brings the Other and its text back.

- 02_trunk: fmtDate.
- 09_trunk: the celestialBodies comment.
- 10_migrate: normalizeEntryFields' rule for a dependent dropdown.
- 13_form-engine-display: queryMarkdownBox and queryMarkdownText, and
  queryShown reading a Long Text through it.
- 14_form-engine-edit: a dependent dropdown with no parent choice shown
  empty, its Other text with it.

Declared scope: 02_trunk, 09_trunk, 10_migrate, 13_form-engine-display,
14_form-engine-edit.
Declarations added: queryMarkdownBox, queryMarkdownText. None removed. No
header added.

String-anchored edits; every anchor must occur exactly the stated number of
times (once unless given), and nothing is written unless every anchor in
every file holds. Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r051_fields_kept.py
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


# ------------------------------------------------------------------ 02_trunk
edit(MODULES / "02_trunk.jsx", [
    (B('''
const fmtDate = (iso) => {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return ""; }
};
'''), B(r'''
// A date as the page shows it. A bare day, a Date field's "2026-10-30", is
// that day wherever the reader is: new Date() reads one as midnight UTC, the
// day before anywhere west of it, so it's built as a local day (v1.7 r051),
// years below 100 included. A timestamp, and a day no calendar has, read as
// before.
const fmtDate = (iso) => {
  if (!iso) return "";
  try {
    const m = typeof iso === "string" ? /^(\d{4,})-(\d{2})-(\d{2})$/.exec(iso) : null;
    let d = null;
    if (m) {
      const y = Number(m[1]), mo = Number(m[2]) - 1, day = Number(m[3]);
      d = new Date(2000, 0, 1);
      d.setFullYear(y, mo, day);
      if (d.getFullYear() !== y || d.getMonth() !== mo || d.getDate() !== day) d = null;
    }
    return (d || new Date(iso)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  catch { return ""; }
};
''')),
])

# ------------------------------------------------------------------ 09_trunk
edit(MODULES / "09_trunk.jsx", [
    (B('''
  // physical parameters; kind-aware fields layer on via the kind:celestial-
  // body system template. Empty on fresh worlds; existing v1.4 worlds get
'''), B('''
  // physical parameters, and the descriptive fields and tags that
  // makeNewCelestialBody writes. Empty on fresh worlds; existing v1.4 worlds get
''')),
])

# ---------------------------------------------------------------- 10_migrate
edit(MODULES / "10_migrate.jsx", [
    (B('''
      //    the defensive cleanup for hand-edited JSON, version-skewed worlds, or
      //    parent-option renames that left the child orphaned.
'''), B('''
      //    the defensive cleanup for hand-edited JSON, version-skewed worlds, or
      //    parent-option renames that left the child orphaned. Other, which the
      //    editor offers under every parent where the field keeps an Other text
      //    (14_form-engine-edit), stays with its text (v1.7 r051).
''')),
    ('''          if (!allowed.includes(ownVal)) {''',
     '''          if (!allowed.includes(ownVal) && !(f.otherTextField && ownVal === "Other")) {'''),
])

# ----------------------------------------------------- 13_form-engine-display
edit(MODULES / "13_form-engine-display.jsx", [
    (B('''
// A field's value as the entry page shows it (FieldValueDisplay), as text:
'''), B(r'''
// The element a Long Text's HTML is read in, made once, in a document of its
// own (createHTMLDocument), which loads nothing: no image, no script.
let queryMarkdownBox = null;

// A Long Text as the page draws it (MarkdownDisplay), as text: its markdown
// through the same marked, with the wiki-link extension 10_migrate gives it,
// the words shown kept and a line between blocks, so a link's address and
// the markup's characters don't count (v1.7 r051). A text with no character
// markdown reads, its [[links]] aside, and no line starting with a space or
// a number a list would take, is read without marked, line by line, as
// marked draws it, so the first search on a 10,000-entry world stays as
// quick as r045 made it. Should marked fail, the text is read as written, its
// [[links]] as their words.
const queryMarkdownText = (s) => {
  const plain = s.replace(/\r\n?/g, "\n").replace(/\[\[([^\]\n]+)\]\]/g, (w, inner) => {
    const t = inner.trim(), i = t.indexOf("|");
    return i >= 0 ? t.substring(i + 1).trim() : t;
  });
  if (!/[\\`*_[\]()<>#&|~=+\t-]/.test(plain) && !/^( |\d+[.)])/m.test(plain)) {
    // marked's way with such a text: each line's trailing spaces dropped, a
    // blank line closing a paragraph
    const out = [];
    plain.split("\n").forEach(l => { const k = l.replace(/ +$/, ""); if (k) out.push(k); });
    return out.join("\n").trim();
  }
  try {
    const html = marked.parse(s)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<hr\s*\/?>/gi, "\n")
      .replace(/<\/(p|h[1-6]|li|blockquote|pre|tr|th|td|ul|ol|table|div)>/gi, "$&\n");
    if (!queryMarkdownBox) queryMarkdownBox = document.implementation.createHTMLDocument("").createElement("div");
    queryMarkdownBox.innerHTML = html;
    return queryMarkdownBox.textContent.replace(/\n{2,}/g, "\n").trim();
  } catch (e) {
    return queryLinkWords(s);
  }
};

// A field's value as the entry page shows it (FieldValueDisplay), as text:
''')),
    ('''    case "text": case "textarea": return typeof v === "string" ? queryLinkWords(v) : "";''',
     '''    case "text": return typeof v === "string" ? queryLinkWords(v) : "";
    case "textarea": return typeof v === "string" ? queryMarkdownText(v) : "";'''),
])

# ------------------------------------------------------- 14_form-engine-edit
edit(MODULES / "14_form-engine-edit.jsx", [
    (B('''
    const visibleDropdownValue = availableOptions.includes(dropdownValue) ? dropdownValue : "";

    const cascadeDisabled = isCascadeChild && !parentValueStr;
'''), B('''
    // A dependent dropdown with no parent choice is off, and the save clears
    // it, an Other and its text included (10_migrate), so it shows empty too
    // (v1.7 r051).
    const cascadeDisabled = isCascadeChild && !parentValueStr;
    const visibleDropdownValue = !cascadeDisabled && availableOptions.includes(dropdownValue) ? dropdownValue : "";
''')),
    ('''        {hasOtherText && dropdownValue === "Other" && (''',
     '''        {hasOtherText && visibleDropdownValue === "Other" && ('''),
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
    print(f"r051 applied to {len(staged)} files")


if __name__ == "__main__":
    main()
