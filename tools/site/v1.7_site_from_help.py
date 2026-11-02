r"""
v1.7's site step: site/helloworld.html written from the help r059 brought
level (docs/pipes-spec.md, section 9; docs/sweep-spec.md, section 4), the
roadmap's rows on what each cut left for the site step naming its lines. A
commit without an r-number; the tree is untouched. Claude's plan went to
Drak, whose call at it, a, set how the site is checked. Its defaults: the
entries files take a section on the Import & Export page, not a tile of
their own; lines are edited where they stand; the site goes live with
v1.7's finals.

String-anchored edits; every anchor must occur exactly once, and nothing is
written unless every anchor holds. Run from anywhere inside the repository:
    python3 tools/site/v1.7_site_from_help.py
"""
from pathlib import Path

ROOT = next(p for p in Path(__file__).resolve().parents if (p / 'site').is_dir() and (p / 'cartulary-src').is_dir())
SITE = ROOT / 'site' / 'helloworld.html'
STEPS = []


def rep(old, new):
    STEPS.append((old, new))


def after(anchor, block):
    STEPS.append((anchor, anchor + block))


# ------------------------------------------------------------ Your world, and how you keep it
after("""    <h3>Save File</h3>
    <p>This is the part that matters most, because it's how you keep your work at all.</p>
""", """    <p>First, what happens without you doing anything. Cartulary writes each change to the browser's own storage 250 ms after you stop, and a Save that closes an editor writes at once. Hide the page, by switching tabs or closing it, and whatever is still waiting is written then. The browser asks before you leave only when something exists on screen alone: an editor with unsaved changes, or a world whose saves are failing. If a save does fail, a <strong>Not saved.</strong> banner says why and Cartulary keeps trying, after 2, 5, 15, 30, and then every 60 seconds, and with your next edit; <strong>Try now</strong> tries at once, and <strong>Export now</strong> downloads the world as it is on screen.</p>
    <p>The <strong>Browser storage</strong> row says whether the browser agreed to keep Cartulary's storage instead of clearing it when space runs low: <strong>Kept by this browser</strong>, <strong>May be cleared</strong>, or <strong>No answer from this browser</strong>. Kept or not, clearing the browser's site data erases it, which is why the rest of this section exists.</p>
    <p><strong>Folder backups</strong> come with a connected image folder. Cartulary writes the world into a <code>cartulary-backups</code> folder inside it as you edit, the same <code>.json</code> Export writes, at most every 10 minutes while things change and 2 seconds after the last change, and keeps this world's newest 10. <strong>Back up now</strong> writes one when you ask, and Import world reads them like any export. When the browser wants your OK again before Cartulary can use the folder, a banner says <strong>Images folder not connected.</strong>, with <strong>Reconnect</strong>, and backups wait until you click it. On a page opened from a file, pick <strong>Allow on every visit</strong> in Chrome's prompt and it stops asking.</p>
""")
rep("Whole worlds aside, individual templates, packs, conlangs, stemmas, and calendars each export and import on their own;",
    "Whole worlds aside, individual templates, a template's entries, packs, conlangs, stemmas, and calendars each export and import on their own;")
rep("once it's been more than two hours since your last JSON export and you've made changes since, nudging you to save. It tracks JSON exports specifically; a Markdown or zip export doesn't reset it,",
    "once it's been more than two hours since your last JSON export or folder backup and you've made changes since, nudging you to save. It counts only those; a Markdown or zip export doesn't reset it,")
rep("so a fresh start is reversible within the session; but it also clears the rest of that history, and none of it survives losing the browser copy.",
    "so a fresh start is reversible within the session, and your own restore points stay through it; none of it survives losing the browser copy.")

# ------------------------------------------------------------ Templates and fields
rep("""opens a small menu with two formats: <strong>.template.json</strong>, the portable file you hand to someone or carry to another world, and <strong>.template.md</strong>, a readable reference copy.""",
    """opens a small menu: two formats, <strong>.template.json</strong>, the portable file you hand to someone or carry to another world, and <strong>.template.md</strong>, a readable reference copy, and then <strong>Export entries…</strong>, which writes the template's entries alone, as JSON or CSV (see <a href="#import-export">Import &amp; Export</a>).""")
rep("but listed and edited from <a href=\"#fabula-meaning\">Fabula's index</a>, not from the sidebar's Templates list.</p></li>",
    "but listed and edited from <a href=\"#fabula-meaning\">Fabula's index</a>, not from the sidebar's Templates list, though All entries lists their entries with the rest.</p></li>")
rep("""delete an entry that something else points at, the whole template it belonged to, or a body, a map, or a stemma, and Cartulary clears the dangling links automatically. You're never left with a reference pointing at nothing.</p>""",
    """delete an entry that something else points at, the whole template it belonged to, a body, a map, a stemma, a story or another Fabula record, or a language or one of its records, and Cartulary asks first, in one window that counts what links there, then clears those stored links. A map pin that pointed at it keeps its label, or takes the record's name; a Stemma node or card stays as an unlinked orphan; and a <code>[[link]]</code> stays as typed, broken or leading to another record of the same name.</p>""")
rep("""Both timelines do the same, rendering each event under the name the entry carried in that event's year.</p>""",
    """Both timelines do the same, rendering each event under the name the entry carried in that event's year.</p>
    <p>Renaming an entry that <code>[[links]]</code> reach by its old name asks first: how many places link by it, <strong>Rename only</strong>, which leaves them as typed, or <strong>Rename and update links</strong>, which saves a <strong>Before rename</strong> restore point and rewrites them, with a box to add the old name to its Former Names. If the new name already leads somewhere else, the window says so, and says where the links by the new name will lead after.</p>""")
rep("""You define the branches once on the template; every entry of it inherits the filtered behavior.</p></li>""",
    """You define the branches once on the template; every entry of it inherits the filtered behavior. A dependent dropdown that keeps an Other text offers Other under every choice of its parent and keeps it there, and clearing the parent empties it, Other text and all.</p></li>""")
rep("""    <p>Grids are top-level only: a template can carry as many as you like, but a grid can't sit inside a Repeating Group.""",
    """    <p>A template can give a Grid field a starting shape: a line of row labels and a line of column labels, split by "|", with a cell type for each column. Every new entry's grid starts that way, as does a new Fabula record's where its kind has one, and the entry changes it as any grid. An older entry's empty grid offers <strong>Start from the template's shape</strong>; a grid with no shape asks <strong>Start with</strong> rows <strong>by</strong> columns, 2 by 2 to begin and up to 20 by 20, with <strong>Make grid</strong>, and + Row and + Column still add more.</p>
    <p>Grids are top-level only: a template can carry as many as you like, but a grid can't sit inside a Repeating Group.""")
rep("""The search input at the top of each template's entry list filters as you type. It looks at the entry's name, its tags, and the content of every field -- text, long-text, tag fields, dropdowns, all of it. It's scoped to the active template filter, so searching while a template is selected searches within that template only. Deselect the active template first to search across the whole world.</p>""",
    """The search input at the top of the entry list filters as you type. It reads what an entry's page shows: the name, the tags, and every field as the page displays it, a dropdown's choice, a reference by its record's name, a date as it reads on your calendar. A Long Text is read as drawn, a <code>[[link]]</code> by the words it shows and the Markdown's own characters left out, while a Short Text and a Longform are read as typed. It works within what the list shows, a template's entries, a tag's, or a saved list's; to search the whole world, open <strong>All entries</strong> at the top of the sidebar's Templates list.</p>
    <p><strong>Filter</strong> narrows by field. Each condition is a field, by its label across templates, an operator for its type, and a value; <strong>+ Condition</strong> adds another, <strong>All</strong> or <strong>Any</strong> joins them, and <strong>Linked with</strong> finds what links to a record or what it links to. The conditions show as chips above the list, with <strong>Clear</strong>, and the button counts them. <strong>Save list…</strong> keeps the query in the world as a list in the sidebar's <strong>Lists</strong> section, right after Templates, where <strong>Rename</strong> and <strong>Delete list</strong> sit in an open list's header and its row moves by its handle; lists travel with the world's file.</p>""")
rep("There's no regex, no advanced query syntax, no field-specific scoping.</p>", "There's no regex and no query syntax; the Filter is the way to narrow by field.</p>")

# ------------------------------------------------------------ Fabula
rep("""with <strong>+ New Entry</strong>, <strong>Edit Template</strong>, and <strong>Export &darr;</strong> for the template (see <a href="#fabula-meaning">""",
    """with <strong>+ New Entry</strong>, <strong>Edit Template</strong>, <strong>Export &darr;</strong> for the template or its entries, and <strong>Import entries…</strong>, Lock mode leaving <strong>Export &darr;</strong> alone (see <a href="#fabula-meaning">""")
rep("""<strong>Edit Template</strong> (the ordinary template builder), and <strong>Export &darr;</strong> for the template, and a world missing""",
    """<strong>Edit Template</strong> (the ordinary template builder), <strong>Export &darr;</strong> for the template or its entries, and <strong>Import entries…</strong> (in Lock mode <strong>Export &darr;</strong> alone), and a world missing""")
rep("and in the pickers that list scenes, which keep the outline's order.</p>",
    "and in the pickers that list acts, chapters, and scenes, its place and its name split by a middle dot, I.1.A · Crossing, in the outline's order.</p>")
rep("and Alt with the same arrow does the same on a focused row; drag does it with a pointer. The small triangle",
    "and Alt with the same arrow does the same on a focused row; drag does it with a pointer. The plain arrows move the focus as a tree's do: Up and Down to the row above and below, Home and End to the first and last in sight, Right unfolding a folded row or stepping into it, Left folding an open row or stepping out. The small triangle")

# ------------------------------------------------------------ Stemma, Concordance, Ephemeris, Glossopoeia
rep("(pasted into a longform field, it links when the record is an entry or a body)",
    "(pasted into a Short or Long Text, it links to that record, an entry, a body, a map, a stemma, a Fabula record, or a language)")
rep("""<li><span class="term">Wiki-links</span><p>Every <code>[[Name]]</code> in any text field becomes an edge from the entry you wrote it in to the entry it resolves to.</p></li>""",
    """<li><span class="term">Wiki-links</span><p>Every <code>[[Name]]</code> in a Short or Long Text, a map's or a body's text fields, a tabula's notes, or the world description becomes an edge from the record you wrote it in to whatever it resolves to: an entry, a body, a map, a stemma, a Fabula record, or a language.</p></li>""")
rep("Wiki-links to entry names and body names resolve in view mode.</p>",
    "Wiki-links resolve in view mode to whatever a name reaches: an entry, a body, a map, a stemma, a Fabula record, or a language.</p>")
rep("""Removes the language and every record that belongs to it across its child arrays, after a confirm. It also scrubs any reference a surviving language held to one of the deleted sounds, so nothing dangles.</p>""",
    """Removes the language and every record that belongs to it across its child arrays, after the delete window counts what links to them. It also clears the stored links that pointed at them, an entry's or another language's.</p>""")

# ------------------------------------------------------------ Maps
rep("and pins keep their relative positions and shift against the drawing. Undo restores it. Sizes are drawing units",
    "and pins keep their relative positions and shift against the drawing, a line's end stuck to a pin going with it. Undo restores it. Sizes are drawing units")
rep("No grid, no snapping beyond the rotation knob's Shift snap, no fog of war,",
    "No grid, and no snapping beyond the rotation knob's Shift snap and a line's end sticking to a pin or a stamp it's put down on, no fog of war,")
rep("A line or polygon with more than forty points moves as a whole, a filled region has no handles,",
    "A polygon with more than 40 points moves as a whole, a line with more than 40 has handles at its two ends only, so they can still be stuck and freed, a filled region has no handles,")
rep("""A double-click, Enter, <strong>Done</strong> (from two points), or a right-click finishes it; Esc or <strong>Cancel</strong> discards it.</p></li>
      <li><span class="term">Freehand (F)</span>""",
    """A double-click, Enter, <strong>Done</strong> (from two points), or a right-click finishes it; Esc or <strong>Cancel</strong> discards it. An end put down on a pin, or on a stamp on a shown layer (within 6 screen pixels of the pin's marker or the stamp's box), sticks to it and follows it however it moves, in the map's view and its downloads too; drag an end in Select and it sticks the same way, or comes free where you put it down. Deleting the pin or the stamp frees the end where it was drawn.</p></li>
      <li><span class="term">Freehand (F)</span>""")
rep("A freehand line of forty points or fewer reshapes by its points in Select; a longer one moves as a whole.</p>",
    "A freehand line of 40 points or fewer reshapes by its points in Select; a longer one has handles at its two ends only.</p>")

# ------------------------------------------------------------ Import & Export
rep("a whole world, a single template, a pack of them, a constructed language,", "a whole world, a single template, a pack of them, a template's entries, a constructed language,")
rep("The JSON is always the real backup; everything else is a copy for reading, not a save.</p>",
    "The world's JSON is always the real backup; everything else is a copy for reading, not a save, except that a template's entries, JSON or CSV, read back into a template.</p>")
rep("""<p>On any template, the <strong>Export</strong> button opens a menu with two formats: <strong>.template.json</strong>, the portable file another world can import, and <strong>.template.md</strong>, a readable reference copy.""",
    """<p>On any template, the <strong>Export</strong> button opens a menu: two formats, <strong>.template.json</strong>, the portable file another world can import, and <strong>.template.md</strong>, a readable reference copy, and then <strong>Export entries…</strong>, below.""")
after("""The fuller treatment is on the <a href="#templates">Templates</a> page.</p>
""", """    <h3>A template's entries</h3>
    <p><strong>Export entries…</strong> writes every entry a template has as one file, whatever its list shows, for a spreadsheet, another world, or a script. Pick <strong>JSON</strong> or <strong>CSV</strong>, and, where the template has secret fields, <strong>Include secret-marked fields</strong>, off by default. Fabula's index has the same for Plot Threads and Themes &amp; Motifs.</p>
    <p>The JSON (<code>cartulary_entries_export: 1</code>) keeps each value in the shape the world file does, a reference written as its record's name and template beside its id; Import world refuses it, since it isn't a world. The CSV is a row per entry, its columns id, Name, Tags, and Calendar, then each top-level field by its label. Several values in a cell are joined by "; ", a ";" inside a value written <code>\\;</code> and a backslash <code>\\\\</code>; a date is written as the entry's calendar writes it, a range in two columns, a reference as its record's name, and groups and grids are left out. It's UTF-8 with a byte-order mark.</p>
    <p><strong>Import entries…</strong> on a template's page reads either one back through a mapping screen. Each of the file's fields or columns picks a field here, by id and then by label, or <strong>Leave out</strong>, and each calendar a calendar here; <strong>Bring the file's tags</strong> and <strong>Match existing entries, by id, then by name</strong> start on. The <strong>Preview</strong> counts what it will do, new, updated, unchanged, and skipped, and lists what needs a look before you click <strong>Import</strong>, which saves a <strong>Before importing entries</strong> restore point first. An empty value leaves a matched entry's field as it is, so an import never empties one.</p>
    <p>A CSV from somewhere else reads as well: a date as its calendar writes it, by month name or as year-month-day numbers; a cell naming none of a dropdown's options as Other, where the dropdown keeps an Other text; a cell of several values split at each bare ";", <code>\\;</code> keeping one inside a value; and the file in UTF-8, Windows-1252, or UTF-16 with its byte-order mark.</p>
""")

# ------------------------------------------------------------ The JSON page
rep("""  "fabula":         { ...Fabula's records and schemas },
  "viewPrefs":""",
    """  "fabula":         { ...Fabula's records and schemas },
  "lists":          [ ...saved lists ],
  "viewPrefs":""")
rep("""  "subfields":       [ ...field definitions ],   // "group": nestable up to 3 levels deep""",
    """  "gridShape":       { "rows": [ string, ... ], "cols": [ { "label": string, "type": string }, ... ] },
                                           // "grid": the starting shape each new record's grid copies
  "subfields":       [ ...field definitions ],   // "group": nestable up to 3 levels deep""")
rep("""<code>arrow</code> (<code>none</code>, <code>end</code>, or <code>both</code>, the arrowheads) for stroke;""",
    """<code>arrow</code> (<code>none</code>, <code>end</code>, or <code>both</code>, the arrowheads) and <code>anchors</code> (<code>{ start, end }</code>, each a pin's id or a stamp's shape id that end sticks to, or null; absent when both ends are free) for stroke;""")
rep(""">tags</td><td style="padding:.35em .8em;border-bottom:1px solid var(--border)">array of strings</td></tr>""",
    """>tags</td><td style="padding:.35em .8em;border-bottom:1px solid var(--border)">string: the tags as typed, comma-separated</td></tr>""")
rep(""">number</td><td style="padding:.35em .8em;border-bottom:1px solid var(--border)">number</td></tr>""",
    """>number</td><td style="padding:.35em .8em;border-bottom:1px solid var(--border)">string: the number as typed</td></tr>""")
rep("""<p>A note on <code>tags</code>: the field type named "tags" stores an array of strings. The top-level <code>tags</code> property on entries is also an array of strings. Neither is ever a comma-separated string, regardless of how the UI renders them.</p>""",
    """<p>A note on <code>tags</code>: the field type named "tags" stores one string, the tags as typed with commas between them, which the page splits to show them. The top-level <code>tags</code> property on entries is an array of strings.</p>
    <p><strong>Saved lists</strong> (<code>lists</code>, v1.7) are each <code>{ id, name, scope, mode, conditions }</code>: <code>scope</code> is <code>{ kind: "all" }</code>, <code>{ kind: "template", templateId }</code>, or <code>{ kind: "tag", tag }</code>; <code>mode</code> is <code>all</code> or <code>any</code>; a condition is <code>{ id, field, op, value, value2, values, calendarId }</code>, its field <code>name</code>, <code>tags</code>, <code>template</code>, <code>linked</code>, or <code>{ labels, end }</code>. <strong>Entries files</strong>, which Export entries… writes, are <code>{ cartulary_entries_export: 1, exported_at, secrets, template: { name, fields }, calendars, entries }</code>, each entry <code>{ id, name, tags, calendar, fields }</code> with its values keyed by field label; they aren't world files.</p>""")


def main():
    text = SITE.read_text(encoding='utf-8')
    for old, new in STEPS:
        n = text.count(old)
        assert n == 1, f"anchor occurs {n} times:\n{old[:300]}"
        text = text.replace(old, new)
    SITE.write_text(text, encoding='utf-8')
    print(f"site: {len(STEPS)} edits")


if __name__ == "__main__":
    main()
