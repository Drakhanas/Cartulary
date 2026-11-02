r"""
v1.7 r059: the help, after the Sweep's eight cuts.

docs/pipes-spec.md, section 9, and docs/sweep-spec.md, section 4: every topic
Pipes changed, what r051 through r058 changed where the help describes it,
the errors Pipes' check found, and the roadmap's rows on what each cut left
for the help. Claude's plan went to Drak, whose call at it, a, set how the
help is held to the build. Its defaults: one cut; plain additions where a
line is right but incomplete, rewrites only where it's wrong; the help says
which choice to make in Chrome's prompt on Reconnect; the site follows as
its own commit.

- 26_home-data: Getting Started (deletes, the undo note); Save & Share
  (saving, a failing save, the browser's storage, a template's entries); a
  new topic, Import & Export Entries, after it; Templates (the sidebar, All
  entries, Lists, Plot Thread and Theme / Motif, a dependent dropdown's
  Other, a grid's starting shape); Field Types (Entry Reference, Grid /
  Table); Name History (the templates that carry it, renames); Cartographia
  (the index's delete, pins, the canvas's size, snapping); the Map Editor
  (Select, Line, Freehand); Fabula (the index's buttons, the outline's keys,
  the pickers); Stemma's Markdown line; Concordance (wiki-links); Search,
  rewritten; Wiki-Links (what a link reaches, renames, Referenced by);
  Back Up Your World (folder backups, the reminder); Importing From Other
  Tools; Accessibility (Fabula's outline); Browser Compatibility (the
  folder); What Cartulary Doesn't Do (the autosave line, Reset); the JSON
  Save File Schema (lists, Tags and Number, gridShape, a line's anchors, the
  entries file).
- 21_stemma/02_markdown: the comment's "longform field".

Declared scope: 21_stemma/02_markdown, 26_home-data. No declaration added or
removed. No header added.

String-anchored edits; every anchor must occur exactly once, and nothing is
written unless every anchor holds. An em dash in an anchor is written <EM>.
Run from anywhere inside the repository:
    python3 inlining/cuts/v1.7_r059_help.py
"""
from pathlib import Path

ROOT = next(p for p in Path(__file__).resolve().parents if (p / 'cartulary-src').is_dir())
MODULES = ROOT / "cartulary-src" / "modules"
EM = chr(0x2014)
PLAN = []


def edit(path, steps):
    PLAN.append((path, steps))


H = MODULES / "26_home-data.jsx"
STEPS = []


def rep(old, new):
    STEPS.append((old.replace("<EM>", EM), new))


# ------------------------------------------------------------ Getting Started
rep(r"""- **Delete.** Open any entry and click **Delete** in the editor toolbar to remove it. Templates can be deleted from the template editor (this also removes all entries that use the template <EM> there's a confirmation step).""",
    r"""- **Delete.** Open any entry and click **Delete** in the editor toolbar to remove it. Templates can be deleted from the template editor, which also removes all entries that use the template. Every delete of a record a link can point at asks first, in one window that names what goes with it and counts what the delete does to what links there: the records it's removed from, the map pins that lose their link (each keeps its label, or takes the record's name if it had none), the Stemma nodes and cards left unlinked, and the places whose \`[[links]]\` stay as typed. Then it clears those stored links; the \`[[links]]\` stay as typed, broken or leading to another record by the same name.""")
rep(r"""The recovery paths are a restore point in Version History (Settings) or a recent .json backup, which is why backups matter (see Back Up Your World).""",
    r"""The recovery paths are a restore point in Version History (Settings) or a recent .json backup, which is why backups matter (see Back Up Your World). A rename that updates \`[[links]]\` saves a **Before rename** restore point first, and a Stemma canvas's Undo stops there.""")

# ------------------------------------------------------------ Save & Share
SAVING = "\n\n".join([
    r"""**How saving works.** A change is written 250 ms after you stop, and a Save that closes an editor writes at once. When the page is hidden (another tab, a minimized window, or closing it), whatever is still waiting is written then instead of after the wait. The browser asks before you leave only when something exists on screen alone: an editor with unsaved changes, or a world whose saves are failing.""",
    r"""**When a save fails.** A **Not saved.** banner comes up at the top with the reason, and Cartulary tries again after 2, 5, 15, 30, and then every 60 seconds, and with your next edit. **Try now** tries at once; **Export now** downloads the world as it is on screen. When a try lands, the banner goes and a **Saved** notice says so. A full storage says so in the banner, and deleting old snapshots in Version History makes room.""",
    r"""**The browser's storage.** Cartulary asks the browser to keep its storage instead of clearing it when space runs low, and Settings' **Browser storage** row says what it answered: **Kept by this browser**, **May be cleared**, or **No answer from this browser**. Kept or not, clearing the browser's site data erases it, so an exported .json is the copy that lasts.""",
])
rep(r""" Closing the tab with a freshly-typed change still pending the 500ms auto-save debounce will trigger a browser warning before unload.""",
    "\n\n" + SAVING)
rep(r"""- **Import .json** loads a JSON save back. JSON only.""",
    r"""- **Import .json** loads a JSON save back. JSON only.

**A template's entries.** A template's **Export ↓** also has **Export entries…**, and its page has **Import entries…**: its entries alone, as JSON or as a CSV a spreadsheet opens, and read back through a mapping screen. See Import & Export Entries.""")

# ------------------------------------------------------------ Import & Export Entries, a new topic after Save & Share
ENTRIES = "\n\n".join([
    r"""A template's entries can leave and come back on their own, without the rest of the world: to work on them in a spreadsheet, to move them between worlds, or to bring in rows from somewhere else.""",
    r"""**Export entries…** is in a template's **Export ↓**, after the two template files, and on Fabula's index for Plot Threads and Themes & Motifs. It writes every entry the template has, whatever the list shows, as one file: pick **JSON** or **CSV**, and, where the template has secret fields, **Include secret-marked fields**, off by default. An image kept inside the world, with no file in an images folder, is written as empty, and the window says so.""",
    r"""**The JSON** (\`cartulary_entries_export: 1\`) holds the template's fields and each entry's id, name, tags, calendar, and values, each value in the shape the world file keeps it (see JSON Save File Schema), and a reference written as its record's name and template, or its kind for a record that isn't an entry, beside its id. Import .json refuses it, and Import entries… refuses a world file.""",
    r"""**The CSV** is for a spreadsheet: a row per entry, and the columns id, Name, Tags, and Calendar (blank for the primary), then each top-level field by its label, in the template's order. Several values in a cell are joined by "; ", and a ";" inside a value is written \`\\;\`, a backslash \`\\\\\`. A date on your calendars is written as the entry's calendar writes it, "~" before an approximate one; a range takes two columns, "Label · start" and "Label · end"; a real-world Date is written as stored, a Name History as its names, a reference as its record's name, an Other as its text, and an image as its file name. Groups and grids are left out. The file is UTF-8 with a byte-order mark.""",
    r"""**Import entries…** on a template's page reads an entries file, JSON or CSV, through one mapping screen. Each of the file's fields, or each of a CSV's columns, picks a field here, by id and then by label, or **Leave out**, and each of the file's calendars a calendar here, by id and then by a name only one calendar here has; a flag marks any pick to look at. **Bring the file's tags** and **Match existing entries, by id, then by name** start on. The **Preview** counts what **Import** will do (new, updated, unchanged, skipped) and lists what needs a look: values that didn't read, values read as Other, references that found no record, and new entries taking a name an entry here has. Import saves a pinned **Before importing entries** restore point first. A matched entry keeps its name and calendar, and an empty value in the file leaves its field as it is, so an import never empties a field; a group or a grid the file holds replaces the entry's whole.""",
    r"""**Reading a CSV.** A date reads as its calendar writes it, its month by name or abbreviation, case aside, with "~" before an approximate one and the era's short name after it, or as numbers, year-month-day, the month counted from 1. A matched row whose Calendar cell names its entry's calendar reads its dates in that calendar. On a dropdown that keeps an Other text, a cell naming none of its options reads as Other with that text, and a dependent dropdown's Other imports under any of its parent's choices. A cell that can hold several values splits at each bare ";", \`\\;\` and \`\\\\\` undone, so a spreadsheet keeps a ";" inside such a value by writing \`\\;\`; each piece naming an option, a record, or a name is taken as it is, and one read as a value of the field's own, or not read, is listed. A dropdown's or a text's cell is read whole. A Multi-select's own values make the round trip. A real-world Date imports only on a day its month has. The file may be UTF-8, Windows-1252, or UTF-16 with its byte-order mark.""",
])
rep(r"""Your appearance preferences (theme, font size) are stored separately and don't travel with exported worlds.` },""",
    r"""Your appearance preferences (theme, font size) are stored separately and don't travel with exported worlds.` },

  { id: "entries-files", title: "Import & Export Entries", content: `""" + ENTRIES + r"""` },""")

# ------------------------------------------------------------ Templates
rep(r"""- **Plot Thread** <EM> story arcs with stakes and hooks (Fabula's since v1.7: listed and edited from Fabula's index, not from the sidebar; see Fabula)""",
    r"""- **Plot Thread** <EM> story arcs with stakes and hooks (Fabula's since v1.7: listed and edited from Fabula's index, not from the sidebar's Templates list, though All entries lists its entries too; see Fabula)""".replace("<EM>", EM))
rep(r"""- **Theme / Motif** <EM> recurring symbolic elements (Fabula's since v1.7, listed and edited from Fabula's index as Plot Thread is)""",
    r"""- **Theme / Motif** <EM> recurring symbolic elements (Fabula's since v1.7, listed and edited from Fabula's index as Plot Thread is, and in All entries)""".replace("<EM>", EM))
rep(r"""the entry form filters the second dropdown based on what's picked in the first.""",
    r"""the entry form filters the second dropdown based on what's picked in the first. A dependent dropdown that keeps an Other text offers Other under every choice of its parent and keeps it there, and clearing the parent empties it, its Other text with it.
- **A grid's starting shape.** A Grid field takes a **Rows** line and a **Columns** line, labels split by "|" as a dropdown's options are, with a cell type for each column under them (a column's type follows its place in the line). Each new entry's grid starts as that shape, and so does a new Fabula record's where one of Fabula's kinds has a shaped Grid field; the entry changes it as any grid. Either line can be left empty, and clearing both takes the shape off.""")
rep(r"""- **Collapse:** Click the **Templates ▾** header to fold the Templates section to just its title.""",
    r"""- **All entries** heads the Templates list: every entry in the world, each with its template, and the way to search the whole world (see Search).
- **Lists:** once you save a list (see Search), a **Lists** section sits right after Templates, its lists opening the entry list as saved, and moving by the same drag handle as a template.
- **Collapse:** Click the **Templates ▾** header to fold the Templates section to its title and All entries, which stays.""")

# ------------------------------------------------------------ Field Types
rep(r"""Deleting the referenced entry, body, map, or stemma, or the template an entry belongs to, automatically clears the reference""",
    r"""Deleting the referenced entry, body, Glossopoeia record, map, or stemma, or the template an entry belongs to, automatically clears the reference""")
rep(r"""each cell picks its own type: text, a number, an entry reference, a calendar date, or a calendar date range. Top-level only (can't nest inside a Repeating Group).""",
    r"""each cell picks its own type: text, a number, an entry reference, a calendar date, or a calendar date range. A template can give the field a starting shape (see Templates), which each new entry's grid starts as; an older entry's empty grid then offers **Start from the template's shape**. An empty grid with no shape asks **Start with** rows **by** columns, two boxes starting at 2 by 2, and **Make grid**, up to 20 by 20; **+ Row** and **+ Column** add more, a row taking its cells' types from the shape's columns. Top-level only (can't nest inside a Repeating Group).""")

# ------------------------------------------------------------ Name History
rep(r"""The **Former Names** field on Character, Location, and Faction / Government / Organization templates records what an entry was called over time.""",
    r"""The **Former Names** field on the Character, Location, Faction / Government / Organization, and House / Dynasty / Clan / Bloodline templates records what an entry was called over time.""")
rep(r"""- **Wiki-links.** Writing \`[[New Amsterdam]]\` resolves to the New York entry if "New Amsterdam" is in its Former Names. Primary names always win over former names if there's a conflict <EM> an entry literally named "New Amsterdam" beats one that just has it as a former name.""",
    r"""- **Wiki-links.** Writing \`[[New Amsterdam]]\` resolves to the New York entry if "New Amsterdam" is in its Former Names. Primary names always win over former names if there's a conflict <EM> an entry literally named "New Amsterdam" beats one that just has it as a former name.
- **Renames.** Renaming an entry that \`[[links]]\` reach by its old name asks first, with **Add "Old Name" to its Former Names** among the choices (see Wiki-Links).""".replace("<EM>", EM))

# ------------------------------------------------------------ Cartographia
rep(r"""when entries reference the map, the confirmation says how many, and the references are cleared.""",
    r"""the confirmation counts what links to the map, by kind, and the delete clears those links.""")
rep(r"""and pins keep their relative positions and shift against the drawing. Undo restores it.""",
    r"""and pins keep their relative positions and shift against the drawing, a line's end stuck to a pin going with it. Undo restores it.""")
rep(r"""clicking a linked pin opens the entry (a drag pans the map instead), and a pin whose entry was deleted says so.""",
    r"""clicking a linked pin opens the entry (a drag pans the map instead). Deleting the entry a pin links to unlinks the pin, which keeps its label, or takes the entry's name if it had none.""")
rep(r"""No grid or snapping beyond the rotation knob's Shift snap, no fog of war,""",
    r"""No grid, and no snapping beyond the rotation knob's Shift snap and a line's end sticking to a pin or a stamp it's put down on, no fog of war,""")

# ------------------------------------------------------------ Map Editor
rep(r"""nothing goes under 8 units, a line or polygon with more than forty points moves as a whole, and a filled region""",
    r"""nothing goes under 8 units, a polygon with more than 40 points moves as a whole, a line with more than 40 has handles at its two ends only, so they can still be stuck and freed, and a filled region""")
rep(r"""- **Line (L)**: click the points of an open line. A double-click, Enter, **Done** (from two points), or a right-click finishes it; Esc or **Cancel** discards it.""",
    r"""- **Line (L)**: click the points of an open line. A double-click, Enter, **Done** (from two points), or a right-click finishes it; Esc or **Cancel** discards it. An end put down on a pin, or on a stamp on a shown layer (within 6 screen pixels of the pin's marker or the stamp's box), sticks to it and follows it however it moves, in the map's view and its downloads too; an end dragged in Select sticks the same way, and put down elsewhere it comes free. Deleting the pin or the stamp frees the end where it was drawn.""")
rep(r"""A freehand line of forty points or fewer reshapes by its points in Select; a longer one moves as a whole.""",
    r"""A freehand line of 40 points or fewer reshapes by its points in Select; a longer one has handles at its two ends only.""")

# ------------------------------------------------------------ Fabula
rep(r"""Below the stories, the index lists the world's **Plot Threads** and its **Themes & Motifs**, each entry with the stories that use it, with **+ New Entry**, **Edit Template**, and **Export ↓** for the template;""",
    r"""Below the stories, the index lists the world's **Plot Threads** and its **Themes & Motifs**, each entry with the stories that use it, with **+ New Entry**, **Edit Template**, **Export ↓** (the template, or its entries with **Export entries…**), and **Import entries…** after it, and in Lock mode **Export ↓** alone;""")
rep(r"""the index's two sections list their entries, with **+ New Entry**, **Edit Template** (the ordinary template builder), and **Export ↓** for the template, and a world missing""",
    r"""the index's two sections list their entries, with **+ New Entry**, **Edit Template** (the ordinary template builder), **Export ↓** for the template or its entries, and **Import entries…** (in Lock mode **Export ↓** alone), and a world missing""")
rep(r"""A record's position shows on its page, in every reference to it, and in the pickers that list scenes, which keep the outline's order.""",
    r"""A record's position shows on its page, in every reference to it, and in the pickers that list acts, chapters, and scenes, its place and its name split by a middle dot ("I.1.A · Crossing") and in the outline's order.""")
rep(r"""and Alt with the same arrow does the same on a focused row; drag does it with a pointer.""",
    r"""and Alt with the same arrow does the same on a focused row; drag does it with a pointer. The plain arrows move the focus, as a tree's do: Up and Down to the row above and below, Home and End to the first and last in sight, Right unfolding a folded row or stepping into it, and Left folding an open row or stepping out to the row it sits in.""")

# ------------------------------------------------------------ Stemma
rep(r"""a linked node a \`[[wiki-link]]\` to its record's name, which a longform field resolves when the record is an entry or a body;""",
    r"""a linked node a \`[[wiki-link]]\` to its record's name, which a Short or Long Text resolves to that record when it's an entry, a body, a map, a stemma, a Fabula record, or a language;""")

# ------------------------------------------------------------ Concordance
rep(r"""- **Wiki-links** in long-text fields. Every \`[[Name]]\` becomes an edge from the entry containing the link to the entry it resolves to.""",
    r"""- **Wiki-links** in an entry's or a Fabula record's Short Text and Long Text, a map's and a body's text fields, a tabula's notes, and the world description. Every \`[[Name]]\` becomes an edge from the record holding it to whatever it resolves to (see Wiki-Links), from the same link index the Referenced by lists read.""")

# ------------------------------------------------------------ Search
rep(r"""The search input at the top of the entry list filters as you type. It looks at:

- **Entry name** <EM> case-insensitive substring
- **Tags** <EM> case-insensitive substring
- **Field content** <EM> anything inside any field on the entry, including text fields, long-text (markdown) fields, tag fields, dropdown values, and so on

Search interacts with the active filters. If you've selected a template or tag in the sidebar, search filters within that scope. To search across the whole world, deselect the active filter first by clicking it again.

**Useful patterns:**

- Search for **\`[[Aria]]\`** to find every entry that wiki-links to Aria. The search treats markdown literally, so the brackets are part of the query.
- Search for a tag value""",
    "\n\n".join([
        r"""The search input at the top of the entry list filters as you type, case aside. It reads what an entry's page shows: its name, its tags, and every field as the page displays it, a dropdown's choice, a reference by its record's name, a date as it reads on your calendar, a real-world Date as the page shows it. A Long Text is read as the page draws it: a \`[[link]]\` by the words it shows, a link's address and the Markdown's own characters left out, and a word broken by formatting found whole. A Short Text and a Longform are read as typed. Field labels, ids, and stored keys aren't searched.""",
        r"""The search works within what the list shows: a template's entries, a tag's, or a saved list's. To search the whole world, open **All entries** at the top of the sidebar's Templates list.""",
        r"""**Filter.** **Filter** on the entry list opens its conditions: each a field, by its label across templates, an operator for its type, and a value, with × to remove it, **+ Condition** for another, and **All** or **Any** above them. **Linked with** reads the link index either way, so it finds the entries that link to a record and those it links to. The conditions in force show as chips above the list, a chip opening its condition, **Clear** at the end, and the button counting them (**Filter · 2**); a list with no match says **Nothing matches these conditions.**""",
        r"""**Saved lists.** **Save list…** in the Filter names the query in force and keeps it in the world, in the sidebar's **Lists**; with a list open, **Save** keeps a change and **Save as new…** makes another. An open list's header has **Rename** and **Delete list**, which asks first and leaves the entries. A list keeps a field by its label and a record by its id, so a field gone reads as **field not found**, and lists travel with the world's .json.""",
        r"""**Useful patterns:**

- Search for a tag value""",
    ]))
rep(r"""- **Wiki-link resolution.** A search for "the warden" finds entries containing the literal text "the warden" <EM> it doesn't follow custom-label syntax like \`[[Aria|the warden]]\` to also return Aria's entry.""",
    r"""- **Wiki-link resolution.** A search for "the warden" finds the entries whose text shows those words, a \`[[Aria|the warden]]\` among them, but not Aria's own entry. To find what links to Aria, use the Filter's **Linked with**, or the Referenced by list on Aria's page.""")
rep(r"""There's no advanced query syntax, no regex, no field-specific search. If you need more complex queries, export to JSON and use a script.""",
    r"""There's no query syntax and no regex; the Filter is the way to narrow by field. If you need more complex queries, export to JSON and use a script.""")

# ------------------------------------------------------------ Wiki-Links
rep(r"""Inside any text or long-text field, type \`[[Entry Name]]\` to link to another entry. Autocomplete suggests entries as you type. Supports custom labels:""",
    r"""Inside any Short Text or Long Text field, type \`[[Name]]\` to link to a record by its name: an entry, an Astronomical Body, a map, a stemma, one of Fabula's records, or a language. Autocomplete suggests them as you type, each name once, marked with its kind. Supports custom labels:""")
rep(r"""**Duplicate names.** Cartulary doesn't block you from creating two entries with the same name, but it warns you on save.""",
    "\n\n".join([
        r"""**What a name reaches.** An entry's primary name comes first, the first stored winning a tie; then its Former Names (see Name History); then a body's name and other names; then maps, stemmas, and Fabula's records by name; then languages. A name a record claimed first is no one else's, so a \`[[link]]\` by it, and the autocomplete, reach that record.""",
        r"""**Renaming.** Renaming a record that \`[[links]]\` reach by its old name asks first, in one window: how many places link by the old name, what **Rename only** leaves them doing (still reaching it through its former names, leading to another record, or broken), and **Rename and update links**, which saves a **Before rename** restore point and rewrites each link, a \`|label\` part kept. Where the template has Former Names, **Add "Old Name" to its Former Names** is a box in the window, unticked. If the new name already leads to another record, the window says so, offers **Rename only**, and says whether the links by the new name will lead here after the rename or stay with the other record. It asks at an entry's, a map's, a corpus's, a story's, a Fabula record's, and a body's Save, at a story's **Rename** on Fabula's index, at a stemma's name in its bar, and when a language's name is left.""",
        r"""**Referenced by.** At the end of an entry's page, a map's, a corpus's, a Fabula record's, and a body's, and on a story's Story tab, a **Referenced by** list gives a row per record that links there, naming each field it links through, grouped by kind: reference fields at any depth, pins, Stemma nodes and cards, and \`[[links]]\` alike. A group past 10 rows shows 10 and **Show all**; a link through a secret field shows only while secrets do; and a page nothing links to shows no list.""",
        r"""**Duplicate names.** Cartulary doesn't block you from creating two entries with the same name, but it warns you on save.""",
    ]))

# ------------------------------------------------------------ Back Up Your World
rep(r"""Cartulary prompts you to back up after two hours of unsaved changes""",
    r"""**Folder backups.** With an images folder connected (Settings, **Image Folder**), Cartulary also writes the world into a \`cartulary-backups\` folder inside it as you edit: the same .json file Export writes, at most every 10 minutes while the world changes and 2 seconds after the last change, each named for the world and the time, and this world's newest 10 kept. Connecting the folder writes one at once unless the folder already holds the world's last change, and Settings' **Back up now** writes one whenever you ask. Import reads them back like any export. When the browser wants your OK again before Cartulary can use the folder, a banner says **Images folder not connected.**, with **Reconnect** and **Not now**, and backups stop until you reconnect; for a page opened from a file, choose **Allow on every visit** in Chrome's prompt, so it doesn't ask each time.

Cartulary prompts you to back up after two hours of unsaved changes""")
rep(r"""The reminder anchors on JSON exports specifically (Markdown and Markdown ZIP don't count, because they can't be re-imported).""",
    r"""The reminder counts from your last JSON export or folder backup (Markdown and Markdown ZIP don't count, because they can't be re-imported).""")

# ------------------------------------------------------------ Importing From Other Tools
rep(r"""There are no WorldAnvil, Notion, Obsidian, or Google Docs importers. The only import format is Cartulary's own JSON.""",
    r"""There are no WorldAnvil, Notion, Obsidian, or Google Docs importers. A world imports only from Cartulary's own JSON, but a template's entries also read from a CSV, through **Import entries…** on its page (see Import & Export Entries): the way in for rows you have in a spreadsheet, or can get into one.""")

# ------------------------------------------------------------ Accessibility
rep(r"""Panning a tabula (Space held with a drag, the middle button, or scroll), placing a card, drawing a line, or moving a card into a column still needs a pointer, and a screen reader can't walk either canvas. See Stemma.""",
    r"""Panning a tabula (Space held with a drag, the middle button, or scroll), placing a card, drawing a line, or moving a card into a column still needs a pointer, and a screen reader can't walk either canvas. See Stemma. Fabula's outline is walked with the arrow keys, Home, and End, and its rows move with Alt and the arrows (see Fabula).""")

# ------------------------------------------------------------ Browser Compatibility
rep(r"""**Folder-mode images** require the File System Access API.""",
    r"""**Folder-mode images and folder backups** require the File System Access API.""")
rep(r"""On any browser without the API, image fields automatically fall back to inline base64 mode. Same functionality, different storage approach.""",
    r"""On any browser without the API, image fields automatically fall back to inline base64 mode. Same functionality, different storage approach. Folder backups need the folder, so there Settings says so, and an exported .json is the copy outside the browser.""")

# ------------------------------------------------------------ What Cartulary Doesn't Do
rep(r"""**No autosave indicator.** Cartulary autosaves silently every 500ms after edits. You'll see a "Saved" toast briefly when you commit an explicit Save, but background autosave is invisible.""",
    r"""**No autosave indicator.** Cartulary autosaves silently 250 ms after edits. You'll see a "Saved" toast briefly when you commit an explicit Save, but background autosave is invisible while it works; a failing one shows the **Not saved.** banner (see Save & Share).""")
rep(r"""There's no "previous worlds" history <EM> Reset is permanent.""",
    r"""There's no "previous worlds" history, but a world with entries is kept first as a pinned **Before reset** snapshot in Version History, its newest 3 kept, and your own restore points stay, so a restore brings it back.""")

# ------------------------------------------------------------ JSON Save File Schema
rep(r"""  "fabula":       { ...Fabula's records and schemas }, // v1.7, the stories (see below); empty slices if none""",
    r"""  "fabula":       { ...Fabula's records and schemas }, // v1.7, the stories (see below); empty slices if none
  "lists":        [ ...saved lists ],                 // v1.7, the entry list's saved queries (see below); empty array if none""")
rep(r"""\`stemmas\`, \`concordance\`, \`calendars\`, \`celestialBodies\`, \`ephemeris\`, \`glossopoeia\`, \`packs\`, \`cartographia\`, \`mapStamps\`, \`fabula\`, and \`viewPrefs\` are all optional""",
    r"""\`stemmas\`, \`concordance\`, \`calendars\`, \`celestialBodies\`, \`ephemeris\`, \`glossopoeia\`, \`packs\`, \`cartographia\`, \`mapStamps\`, \`fabula\`, \`lists\`, and \`viewPrefs\` are all optional""")
rep(r"""| \`tags\` | array of strings |""",
    r"""| \`tags\` | string: the tags as typed, comma-separated |""")
rep(r"""| \`number\` | number |""",
    r"""| \`number\` | string: the number as typed |""")
rep(r"""  "subfields":       [ ...field definitions ],""",
    r"""  "gridShape":       { "rows": [ string, ... ], "cols": [ { "label": string, "type": string }, ... ] },
                                               // "grid": the starting shape each new
                                               //   record's grid copies, a column's
                                               //   type one a cell takes
  "subfields":       [ ...field definitions ],""")
rep(r"""\`arrow\` (\`none\`, \`end\`, or \`both\`, the arrowheads) for stroke;""",
    r"""\`arrow\` (\`none\`, \`end\`, or \`both\`, the arrowheads) and \`anchors\` (\`{ start, end }\`, each a pin's id or a stamp's shape id that end sticks to, or null; absent when both are free) for stroke;""")
rep(r"""A \`grid\` keeps its rows, columns, and axis names on each entry,""",
    r"""**Saved lists (\`lists\`, v1.7).** Each is \`{ id, name, scope, mode, conditions }\`: \`scope\` is \`{ kind: "all" }\`, \`{ kind: "template", templateId }\`, or \`{ kind: "tag", tag }\`; \`mode\` is \`all\` or \`any\`; a condition is \`{ id, field, op, value, value2, values, calendarId }\`, its \`field\` \`name\`, \`tags\`, \`template\`, \`linked\`, or \`{ labels, end }\`, the labels from a template's field down through its groups. A list without an id, or on one an earlier list has, takes a new one on load, and a condition that can't be read is dropped.

**Entries files.** Export entries… writes \`{ cartulary_entries_export: 1, exported_at, secrets, template: { name, fields }, calendars, entries }\`, each entry \`{ id, name, tags, calendar, fields }\` with its values keyed by field label (see Import & Export Entries). It isn't a world file, and Import .json refuses it.

A \`grid\` keeps its rows, columns, and axis names on each entry,""")

edit(H, STEPS)

# ------------------------------------------------------------ 21_stemma/02_markdown
edit(MODULES / "21_stemma" / "02_markdown.jsx", [
    ("// node a [[wiki-link]] to the record's name in the pool, so a paste into a\n// longform field links, an orphan its cached name marked unlinked), or a\n",
     "// node a [[wiki-link]] to the record's name in the pool, so a paste into a\n// Short or Long Text links, an orphan its cached name marked unlinked), or a\n"),
])


def main():
    staged = []
    for path, steps in PLAN:
        text = path.read_text(encoding="utf-8")
        for old, new in steps:
            n = text.count(old)
            assert n == 1, f"{path.name}: anchor occurs {n} times:\n{old[:300]}"
            text = text.replace(old, new)
        if chr(0xFEFF) in text:
            raise SystemExit(f"{path.name}: a byte-order mark would be written")
        staged.append((path, text))
    for path, text in staged:
        path.write_text(text, encoding="utf-8")
    print(f"r059 applied to {len(staged)} files")


if __name__ == "__main__":
    main()
