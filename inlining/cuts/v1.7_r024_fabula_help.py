"""v1.7 r024: Fabula's help.

Drak's three calls at r024's plan (2026-10-27), recorded in
docs/fabula-spec.md section 9 before this cut (ea4d2bd): two topics,
"Fabula" and "Fabula's Timeline"; the JSON Save File Schema topic documents
state.fabula in full, every record kind's shape and every seeded field of
every kind, since the site's JSON Structure page is written from it and is
the complete reference; and the Fabula topic opens with a short walkthrough,
"Your first story". Claude's defaults for the rest are in the same section.

- 26_home-data: two entries in HOME_SECTIONS after Linea, where the sidebar
  puts Fabula, with the ids fabula and fabula-timeline; the Views & Pages
  topic's line for Fabula after Linea's; the Templates topic's two names
  marked as Fabula's, in its default set and under Restore Built-ins; Save &
  Share's paragraph on Fabula's export; Concordance's node sources with
  Fabula's records behind their one row; and the JSON Save File Schema
  topic's top-level shape, its list of optional keys, the template object's
  fabulaRole, and a fabula section of its own after mapStamps.

Declared scope: 26_home-data. No declaration added. The text is written
against the component, in the help's register, without em dashes.

String-anchored edits; every anchor must occur exactly once. Run from
anywhere inside the repository:
    python3 inlining/cuts/v1.7_r024_fabula_help.py
"""
from pathlib import Path

ROOT = next(p for p in Path(__file__).resolve().parents if (p / 'cartulary-src').is_dir())
HOME = ROOT / "cartulary-src" / "modules" / "26_home-data.jsx"


def edit(path, pairs):
    text = path.read_text(encoding="utf-8")
    for old, new in pairs:
        n = text.count(old)
        assert n == 1, f"{path.name}: {n} occurrences of {old[:80]!r}"
        text = text.replace(old, new)
    path.write_text(text, encoding="utf-8")


# ─── The two topics, after Linea ───────────────────────────────────────────────

LINEA_END = (
    "If an entry has more than two parents (e.g. biological + adoptive), the third and later parents are placed in "
    "their generation row beside the Sosa-positioned ones rather than dropped from the chart.` },\n\n"
    "  { id: \"stemma\", title: \"Stemma\", content: `"
)

FABULA = r'''  { id: "fabula", title: "Fabula", content: `**Fabula** is the view for planning the stories set in your world: each story's premise, cast, plot, outline down to the beats of every scene, themes, and research, with the writing itself done somewhere else. A world holds any number of stories, and a **corpus** gathers stories that belong together: a series, a shared setting, an anthology. Fabula's records aren't entries. They live in their own part of the world (\`fabula\` in the save file; see JSON Save File Schema), point outward at your entries, and travel with the world's \`.json\`. Two built-in templates belong to it: **Plot Thread** and **Theme / Motif** stay entries, but Fabula's index lists and edits them, not the sidebar.

**Your first story**

1. Click **Fabula** in the sidebar, then **+ New Story**. The new row opens on its title: type one and press Enter. Click the row to open the story's page.
2. On the **Story** tab, click **Edit** and pick a **Structure**: Three-Act, Freytag, Hero's Journey, Seven-Point, Kishotenketsu, Custom (your own slots, one per row), or None. Its turning points become the Plot tab's headings. Fill in what you know of the Premise, Genre, Narration, and Setting panels; every field is optional. Save.
3. On **People**, click **+ New Cast** for each character in the story. A cast record is an entry's part in this story: pick its **Character** (a Character or a Deity / Entity entry), its **Importance**, and its **Role**. One cast record per character per story.
4. On **Outline**, add acts with **+ Part / Act**, chapters inside an act with its **+ Chapter**, and scenes with **+ Scene**. Each takes its title in place; Enter adds it. Under a scene, **+ Beat** adds a beat: the beat in a line, Tab to What Happens, Enter keeps it. Positions (I, I.1, I.1.A) come from where things sit.
5. On **Plot**, fill your structure's slots with **+ Fill this slot**; each filled slot is a plot point. Add the story's threads with **+ Add a thread...** or **+ New Thread**, and its promises with **+ New Promise**.
6. Open a scene (click its row) and **Edit** it: its POV, Setting, When, Participants, Threads, and Motifs. Its When places it on the Timeline tab.
7. On **Meaning**, add the story's themes; on **Notes**, its research.
8. Click **Export ↓** at the top of the story's page for the story bible, as HTML or as Markdown.

**The index.** Clicking **Fabula** opens the index: every corpus with its stories in reading order, then the stories in no corpus, both by name. **+ New Story** adds a story and opens its title for typing; **+ New Corpus** opens a new corpus's page in edit. Each story's row has a **Corpus** dropdown (No corpus, or any corpus the world has), **Rename**, and **Delete**, which asks first and says what goes with the story: every cast record, arc, scene, and other record of its own. A click anywhere else on the row opens the story. Below the stories, the index lists the world's **Plot Threads** and its **Themes & Motifs**, each entry with the stories that use it, with **+ New Entry**, **Edit Template**, and **Export ↓** for the template; then **Templates**, Fabula's own eleven record kinds, each with **Edit Template** (see Templates, below).

**A corpus's page.** Its **Reading order** first: the stories in the order the corpus tells them, each with arrows to move it earlier or later, or drag a row; **+ New Story** adds a story to the corpus, **Rename** renames one in place. Under it, the corpus's fields (Kind, Status, Description, Notes). **Edit** opens the fields, **Delete** removes the corpus and leaves its stories in Fabula, in no corpus. **Export ↓** writes the corpus's bible (below). Deleting a corpus never deletes a story.

**The story page.** The story's title, then its tabs: **Story**, **People**, **Plot**, **Outline**, **Meaning**, **Notes**, and **Timeline** (see Fabula's Timeline). **Edit** and **Delete** sit in the header with **← Back**, and **Export ↓** beside the title on every tab. The Story tab is the story's own record: Status, Form, Audience, Target Length, Structure (with Custom Slots when the structure is Custom), Threads, and Notes, then four panels that fold under their headings, **Premise** (Why, What If, Logline, Theme Statement, Themes, Central Conflict, Conflict Kinds, Stakes, Synopsis), **Genre** (Genre, Subgenre, Tone, Reader Expectations, Expected Moments, Comparable Titles), **Narration** (Point of View, Tense, Narrative Distance, Reliability, Narrators, POV Plan, Voice & Style), and **Setting** (Time Period, Story Timespan, Places, Rules in Play, Arena, Sensory Palette). Which panels are folded is remembered by your browser, one set for every story, and doesn't travel with the world.

**People.** The story's **Cast**, ordered by Importance (Main, Secondary, Minor) and then by name, each row with its importance and roles; its **Arcs**, by name, each with whose arc it is, its type, and its status; and its **Relationships**, by name, each with the pair it joins and its kinds. **+ New Cast**, **+ New Arc**, and **+ New Relationship** make a record and open it for editing; a click on a row opens its page, where **Edit**, **Delete**, and **← Back** work as an entry's do. A reference to a cast record, from a chip on another record's page or from Concordance, opens it the same way. Deleting a record never takes another with it: Delete says what points at the record and clears those references. When a world entry is deleted, Fabula's references to it are cleared as entries' are, and a cast record whose character it was stays, marked **Character deleted**, with its roles, arcs, and relationships intact, for you to repoint with Edit or delete.

**Plot.** Three sections. **Threads** edits the Story's Threads in place: **+ Add a thread...** adds any Plot Thread entry, **+ New Thread** makes one by its title and adds it, and **×** takes one off the story (the entry stays in the world). Any thread the story's scenes, plot points, or promises use that the Story doesn't list shows below the listed ones, marked *not in the Story's Threads*, with **Add to the story**. **Plot Points** are the structure's slots, each a heading with the plot points under it: **+ Fill this slot** makes the first (named for the slot unless you give it a title), **+ Plot point** adds more, and **+ Custom turn** adds a heading of your own at the end, with its own arrows to move it among the slots. Move a plot point up or down with the arrows on its row, with Alt and the same arrow on a focused row, or by dragging; moving it under another heading changes its **Slot**. A plot point whose slot belongs to a structure the story no longer uses stays at the end, marked *not part of this structure*, and one with no slot under *No slot*. **Promises & Payoffs** lists the story's promises in the order their first **Setup In** scene comes in the outline, those with none after, and flags any set up and never paid off as **unpaid**, whatever its Status. **+ New Promise** adds one. Plot points and promises open on pages of their own, like cast records.

**Outline.** The story's acts, chapters, and scenes as one tree: the story's own level holds anything, an act holds chapters and scenes, a chapter holds scenes, and a scene holds its beats. **+ Part / Act**, **+ Chapter**, and **+ Scene** at the top add at the story's own level; each act ends with its own **+ Chapter** and **+ Scene**, and each chapter with **+ Scene**. Each takes a title in place: Enter adds it, Esc stops. Positions come from where records sit and update when they move: acts I, II, III; chapters 1, 2, 3 through the whole story; scenes A, B, C within their chapter, their act, or the story's own level; beats i, ii, iii within their scene. A record's position shows on its page, in every reference to it, and in the pickers that list scenes, which keep the outline's order. Every row has four arrows, move up, move down, move out a level, and move into the part or chapter above, and Alt with the same arrow does the same on a focused row; drag does it with a pointer. The small triangle at a row's left folds what it holds, an act's chapters, a chapter's scenes, or a scene's beats, and unfolds it again; your browser remembers the folds. A click anywhere else on a row opens the record's page. A scene's page also says whose POV it takes when it has none of its own (its chapter's), and lists the research notes whose **Used In** names it.

**Beats** sit under their scene, edited where they are: **+ Beat** adds one, a click on a beat opens it for typing, Enter keeps it, Tab moves to **What Happens** (what needs to happen in the beat; Ctrl+Enter keeps it from there), and Esc stops. Beats move with their arrows or by drag, within a scene or into another, and **×** deletes one. A beat with no line and no What Happens is dropped when you leave it.

**Deleting from the outline.** Deleting a scene clears the references to it, as any record's delete does. Deleting an act or a chapter that holds anything asks instead: **Move up** puts what it holds in its place, the default; **Delete everything** deletes it all.

**Meaning.** The Premise panel's **Theme Statement** heads the tab, read-only. Under it, the Story's Themes, edited in place as the Plot tab's threads are: **+ Add a theme...** adds any Theme / Motif entry, **+ New Theme** makes one by its title, **×** takes one off the story. Themes group under their entries' **Type** (Themes, Motifs, Symbols, Leitmotifs, Archetypes, then any type of your own, then those with none), and each row shows the positions of the scenes that carry it in their **Motifs**, in the outline's order, each opening its scene. A theme the story's scenes carry that the Story doesn't list shows marked *not in the Story's Themes*, with **Add to the story**.

**Notes.** The story's research notes by topic, A to Z, each opening on a page of its own; **+ New Note** adds one. A note whose **Open Questions** holds any text is flagged **open** wherever its row appears, and the tab's heading counts them; emptying the field clears the flag. A note's **Used In** names the scenes that need it, and each of those scenes lists the note on its page.

**Plot Threads and Themes & Motifs.** These two templates are Fabula's since v1.7, and they're still entries: wiki-links, search, tags, Chronometric, Concordance, and the world's exports read them as before. The sidebar's Templates list leaves them out, and so does **Restore Built-ins**; the index's two sections list their entries, with **+ New Entry**, **Edit Template** (the ordinary template builder), and **Export ↓** for the template, and a world missing one of the templates is told so, with a **Restore** button wherever it's needed. An entry of theirs keeps the ordinary entry page, with a **Stories** list at the end: every story that lists it or uses it, with the scenes that name it by position and, for a thread, its plot points and promises. A story uses a thread when its Threads or any of its scenes', plot points', or promises' Threads name it, and uses a theme when its Themes or any of its scenes' Motifs name it. No pack can take either template.

**Templates.** Fabula's eleven record kinds (Corpus, Story, Cast, Arc, Relationship, Plot Point, Promise & Payoff, Part / Act, Chapter, Scene, Research Note) each have a schema the template builder edits, from **Edit Template** in the index's Templates section. The fields Fabula itself reads are **core**, marked *Fabula reads this field* in the builder: their type, their place, and, where the seed locks them, their options stay as they are, and they can't be removed, but their label, help line, Secret flag, and panel are yours. Every other field is yours entirely: edit it, remove it, or add fields of your own, which can point at the story's own records (a scene, a cast record) as well as at entries. Saving marks the schema *edited* on the index. **Reset to Default** puts the seed back, with a confirmation that lists the seeded fields it brings back, the fields of yours it removes, and how many records hold data in them; that data is deleted with the fields. When a later version of Cartulary changes the seed, a schema nobody has edited follows it, and an edited schema's core fields are brought up to date on load while the rest is left alone.

**The story bible.** **Export ↓** on a story's page, on any tab, or on a corpus's opens a small modal: the format, **HTML** or **Markdown**, and **Include secret-marked fields**, off by default as the world's exports have it. The file is the story in the page's order: the Story's fields and panels, then People (cast, arcs, relationships), Plot (threads, plot points under their slots, promises and payoffs with the unpaid ones marked), Outline (acts, chapters, and scenes nested, each scene's fields and then its beats), Meaning (themes by type, each with the scenes that carry it), and Notes. A corpus's file opens with the corpus's fields and a Stories list, then each story in reading order. Every record renders through the same renderers as the world's exports, with its kind's schema as its template, so a secret field is left out unless included and marked [SECRET] when it is, and a hidden or empty field is left out. References to the world's entries are written as names; the Plot Thread and Theme / Motif entries the story lists are written with their fields. In the HTML, a reference to a record in the file links to it, and the file carries a table of contents of the sections and the scenes. The timeline isn't exported. Files download as \`<name>.story.html\`, \`<name>.story.md\`, \`<name>.corpus.html\`, or \`<name>.corpus.md\`. The world's own HTML and Markdown exports leave Fabula's records out.

**Elsewhere in Cartulary.** Concordance draws Fabula's records as nodes behind one **Fabula** row in its filter: a corpus to its stories, a story to its threads and themes, a cast record to its character, a scene to its POV, participants, setting, threads, and motifs, and so on. Lock Mode blocks Fabula's edits, and the secrets toggle hides its secret fields, as everywhere else. The entry list's search and the tags in the sidebar cover entries only. Fabula's own picks, the folded panels, the folded outline rows, and the Timeline tab's settings, stay in your browser and don't travel with the world.` },

  { id: "fabula-timeline", title: "Fabula's Timeline", content: `A story's **Timeline** tab draws its scenes on a chart of their own, kept apart from Chronometric: one story's scenes, or every scene of the stories in its corpus. It only shows. Nothing on it edits a scene; a click opens the scene's page, and **← Back** returns to the tab. The chart runs the full width of the pane.

**The controls.** **Showing** picks the scope, *This story* or *The whole corpus*, and shows only when the story is in a corpus. **Mode** picks what the axes mean: **Chrono**, **Narratio**, or **Anachronia**, below. **Lanes** picks the grouping, **By POV**, **By thread**, or **By arc**; it's hidden in Anachronia, which draws no lanes. **Display in** picks the calendar the story time is written in, the primary by default, or any additional calendar; it's hidden in Narratio, which has no story time. In Chrono, **Range** holds the years from and to that the chart shows; in the other two modes the same row is **Zoom**. **+**, **−**, and **Reset** zoom in, zoom out, and fit the chart to its scenes again; drag the chart to pan, and Ctrl+scroll (⌘+scroll on a Mac) zooms around the pointer. Your picks are kept per story in your browser. While secrets are hidden, a When field marked secret takes every scene off Chrono and Anachronia, which say so; Narratio still draws them, with no When in their hover.

**Chrono: story time.** Each scene sits where its **When** falls on the calendar's axis, in your calendar or the one picked under Display in. A When with one date, a start alone, an end alone, or the same day twice, is a point; any other is a span, drawn from its start to its end, open-ended when it has no end and open-started when it has no start. Lanes **By POV** give each cast record that's a scene's POV a lane, in People's order; a scene with no POV of its own takes its chapter's. **By thread** gives each thread the story's Plot tab lists a lane, in that order, with the thread's Timespan (its template's first date range) as a bar under the lane's scenes, and a click on the bar opens the thread's entry. **By arc** gives each of the story's arcs a lane, A to Z; a scene is in an arc's lane when the arc's Turning Points name it. A scene in two lanes is drawn in both. A scene shows its plot points as diamonds and its arcs' turns as rings on it, and hovering a scene names it with its position, its When, its POV, its plot points, and its turns. Scenes with no When wait in a tray under the chart, by story, each opening on a click. At the corpus's scope the stories' scenes share the chart, in reading order, and a character's cast records from different stories share one POV lane.

**Narratio: telling order.** Every scene of the scope gets an equal slot in the outline's order, dated or not, and is drawn as a block filling its slot in each lane it belongs to, with its marks at its start and its title past them once the slot is wide enough to hold it (zoom in for the titles). The acts are tinted bands over the chart, named on the axis's upper line; at the corpus's scope the stories are. Chapters are dashed lines named on the lower line. There's no tray and no calendar here.

**Anachronia: one order against the other.** Telling order runs across, as in Narratio, with its bands, and story time runs up the side, earliest at the bottom, with Chronometric's year ticks. A dated scene is a dot at its slot's middle at the height of its When, or a bar from its start up to its end, and the dated scenes are joined in telling order, one line per story. A book told in order climbs; every flashback drops the line, and every jump forward leaps it. Scenes with no When sit as hollow dots on a strip under the plot. No lanes here, and no Lanes picker.

**Not exported.** The story bible leaves the timeline out; Chronometric's PNG and SVG export is Chronometric's own.` },

'''

# ─── Views & Pages ─────────────────────────────────────────────────────────────

VIEWS_OLD = (
    "**Markdown export** of the focused person's tree from the Focal selector control panel.\n"
    "- **Stemma** — radial mind-map view"
)
VIEWS_NEW = (
    "**Markdown export** of the focused person's tree from the Focal selector control panel.\n"
    "- **Fabula**: the story-planning view. Every story set in the world, grouped into corpora, each with its cast, plot, "
    "outline down to the beats of every scene, themes, research, and a timeline of its own; Plot Thread and Theme / "
    "Motif live here. The story bible exports as HTML or Markdown. See Fabula and Fabula's Timeline.\n"
    "- **Stemma** — radial mind-map view"
)

# ─── Templates ─────────────────────────────────────────────────────────────────

TPL_PLOT_OLD = "- **Plot Thread** — story arcs with stakes and hooks\n"
TPL_PLOT_NEW = ("- **Plot Thread** — story arcs with stakes and hooks (Fabula's since v1.7: listed and edited from Fabula's index, "
                "not from the sidebar; see Fabula)\n")
TPL_THEME_OLD = "- **Theme / Motif** — recurring symbolic elements\n"
TPL_THEME_NEW = ("- **Theme / Motif** — recurring symbolic elements (Fabula's since v1.7, listed and edited from Fabula's index "
                 "as Plot Thread is)\n")
TPL_RESTORE_OLD = ("(Deleted **custom** templates are gone for good unless you have a JSON backup.)\n")
TPL_RESTORE_NEW = ("(Deleted **custom** templates are gone for good unless you have a JSON backup.) Plot Thread and Theme / "
                   "Motif aren't in this list: Fabula keeps them, and a world missing one is offered a **Restore** button in "
                   "Fabula wherever the template is needed.\n")

# ─── Save & Share ──────────────────────────────────────────────────────────────

SAVE_OLD = "The export uses the same parent-side rules as Linea (label hints first, ID-sort fallback). Descendant depth caps at 6 generations.\n"
SAVE_NEW = (SAVE_OLD +
            "\n**Fabula's export.** A story's page and a corpus's have an **Export ↓** button beside the title that downloads "
            "the story bible, as HTML or as Markdown, with its own include-secrets choice: the story's fields and panels, "
            "People, Plot, Outline with its beats, Meaning, and Notes, or a corpus's stories in reading order. Filename is "
            "the story's or corpus's slug plus \\`.story.html\\`, \\`.story.md\\`, \\`.corpus.html\\`, or \\`.corpus.md\\`. "
            "**Cannot be re-imported.** The world's own exports above leave Fabula's records out; the \\`.json\\` carries "
            "them. See Fabula.\n")

# ─── Concordance ───────────────────────────────────────────────────────────────

CONC_OLD = ("Inflection Classes, and Writing Systems, and Maps. Each of those is its own row in the Templates filter, and a "
            "reference to one from a field or a wiki-link is an edge like any other.")
CONC_NEW = ("Inflection Classes, and Writing Systems, Maps, and Fabula's records (corpora, stories, cast, arcs, relationships, "
            "plot points, promises, parts, chapters, scenes, and research notes), which share one **Fabula** row. Each of the "
            "others is its own row in the Templates filter, and a reference to one from a field or a wiki-link is an edge "
            "like any other; Fabula's edges run from a corpus to its stories, a story to its threads and themes, a cast "
            "record to its character, a scene to its POV, participants, setting, threads, and motifs, and so on.")

# ─── JSON Save File Schema ─────────────────────────────────────────────────────

SHAPE_OLD = ('  "mapStamps":    [ ...imported map stamps ],         // v1.6, stamps imported from stamp packs; empty array if none\n'
             '  "viewPrefs":    { ...per-view preferences }         // various per-view UI state\n')
SHAPE_NEW = ('  "mapStamps":    [ ...imported map stamps ],         // v1.6, stamps imported from stamp packs; empty array if none\n'
             '  "fabula":       { ...Fabula\'s records and schemas }, // v1.7, the stories (see below); empty slices if none\n'
             '  "viewPrefs":    { ...per-view preferences }         // various per-view UI state\n')
OPTIONAL_OLD = ("\\`stemmas\\`, \\`concordance\\`, \\`calendars\\`, \\`celestialBodies\\`, \\`ephemeris\\`, \\`glossopoeia\\`, \\`packs\\`, "
                "\\`cartographia\\`, \\`mapStamps\\`, and \\`viewPrefs\\` are all optional")
OPTIONAL_NEW = ("\\`stemmas\\`, \\`concordance\\`, \\`calendars\\`, \\`celestialBodies\\`, \\`ephemeris\\`, \\`glossopoeia\\`, \\`packs\\`, "
                "\\`cartographia\\`, \\`mapStamps\\`, \\`fabula\\`, and \\`viewPrefs\\` are all optional")
TPLOBJ_OLD = ('  "kind":   "standard",\n'
              '  "fields": [ ...field definitions ]\n'
              '}\n'
              '\\`\\`\\`\n\n---\n\n**Field definitions (within \\`templates[].fields\\`):**')
TPLOBJ_NEW = ('  "kind":   "standard",\n'
              '  "fields": [ ...field definitions ],\n'
              '  "fabulaRole": "threads" | "themes"       // v1.7, optional: the world\'s Plot Thread or Theme / Motif template, which Fabula keeps (see fabula, below)\n'
              '}\n'
              '\\`\\`\\`\n\n---\n\n**Field definitions (within \\`templates[].fields\\`):**')

STEMMAS_HEAD = "**\\`stemmas\\` array — each stemma document:**"

FABULA_SCHEMA = r'''**\`fabula\` object** (v1.7, Fabula's stories; every key present on a new export, each array empty when the world has none):

\`\`\`
{
  "corpora":       [ ...corpus records ],
  "stories":       [ ...story records ],
  "cast":          [ ...cast records ],
  "arcs":          [ ...arc records ],
  "relationships": [ ...relationship records ],
  "plotPoints":    [ ...plot point records ],
  "promises":      [ ...promise and payoff records ],
  "parts":         [ ...part / act records ],
  "chapters":      [ ...chapter records ],
  "scenes":        [ ...scene records ],
  "research":      [ ...research note records ],
  "schemas":       { [kind]: { ...schema } }        // one per kind, keyed by the kind's name
}
\`\`\`

The kinds, as \`schemas\` keys them and as each record's id names them: \`corpus\`, \`story\`, \`cast\`, \`arc\`, \`relationship\`, \`plotPoint\`, \`promise\`, \`part\`, \`chapter\`, \`scene\`, and \`research\`. Fabula's records aren't entries: nothing in \`entries\` or \`templates\` points at them, and they don't appear in the world's HTML or Markdown exports or in \`cartulary_entries_export\` files. Each kind's records follow the kind's **schema**, a field list shaped like a template's, by field id, the way entries follow their template. The ids are fixed (\`when\`, \`beats\`, \`threads\`) rather than generated, so a script can write them directly. Every record's date is reckoned in the primary calendar; Fabula's records carry no \`calendarId\`. The two templates Fabula keeps, Plot Thread and Theme / Motif, are ordinary entries in \`templates\` and \`entries\`, flagged \`fabulaRole\` on the template.

**A record** (every array but \`corpora\` and \`stories\`):

\`\`\`
{
  "id":        string,                            // "fab-<kind>-<id>"
  "storyId":   string,                            // references stories[].id; one story
  "name":      string,                            // its name, or title (the schema's nameLabel)
  "fields":    { [fieldId]: value, ... },         // value shapes as for entries, below
  "createdAt": ISO-8601 timestamp,
  "updatedAt": ISO-8601 timestamp,
  "characterDeleted": { "name": string }          // cast only, optional (below)
}
\`\`\`

A cast record's \`characterDeleted\` is written when the entry its Character pointed at is deleted, with the entry's name; the record stays, marked, until it's repointed or deleted.

**A story** (\`stories\`) has no \`storyId\` and adds the outline and the plot's order:

\`\`\`
{
  "id":        string,                            // "fab-story-<id>"
  "name":      string,
  "fields":    { [fieldId]: value, ... },
  "outline":   [ { "id": string, "children": [ ... ] }, ... ],
                                                  // parts, chapters, and scenes by record id, in telling order
  "plot":      { "order": [ string, ... ],        // plotPoints[].id in the Plot tab's order
                 "turns": [ { "name": string, "after": string | null }, ... ] },
                                                  // custom turns, each after the slot named (null: the top)
  "createdAt": ISO-8601 timestamp,
  "updatedAt": ISO-8601 timestamp
}
\`\`\`

\`outline\` holds what the Outline tab places. An act may hold chapters and scenes, a chapter scenes, and a scene nothing; a part, chapter, or scene of the story's that the tree doesn't place is read at the story's own level, in the order it was made, and written into the tree on the next change. A node whose record is missing, or belongs to another story, is skipped. Positions (I, I.1, I.1.A) are computed from the tree and never stored. \`plot\` may be absent on a story that has never ordered its plot points; a plot point not in \`order\` sorts after the ordered ones by creation.

**A corpus** (\`corpora\`) has no \`storyId\` and adds the reading order:

\`\`\`
{
  "id":        string,                            // "fab-corpus-<id>"
  "name":      string,
  "fields":    { [fieldId]: value, ... },
  "storyIds":  [ string, ... ],                   // stories[].id in reading order
  "createdAt": ISO-8601 timestamp,
  "updatedAt": ISO-8601 timestamp
}
\`\`\`

A story belongs to at most one corpus; when two list it, the first wins.

**A schema** (\`schemas[kind]\`):

\`\`\`
{
  "kind":      string,                            // the kind, as the key
  "seed":      number,                            // the seed version it follows; currently 4
  "nameLabel": string,                            // "Name", "Title", "Label", or "Topic"
  "nameHelp":  string,                            // the help line under the name
  "fields":    [ ...field definitions ],          // as templates[].fields, with the extras below
  "edited":    boolean                            // optional; true once the builder has saved it
}
\`\`\`

A schema's field definitions take the same keys as a template's (\`id\`, \`label\`, \`type\`, \`secret\`, \`options\`, \`otherTextField\`, \`multi\`, \`subfields\`, \`showWhen\`), plus: \`help\`, the line shown under the field; \`core\`, true on a field Fabula reads, which the builder locks in type and place; \`reads\`, what reads a core field; \`optionsLocked\`, true where a core select's options can't be edited; \`optionsFrom: "structure"\`, on a plot point's Slot, whose options are the story's structure's slots; \`panel\`, which of the Story's four panels (\`premise\`, \`genre\`, \`narration\`, \`setting\`) a field sits in; and for \`entry-ref\` fields \`refTemplates\`, the target templates by name, with \`refTemplatesId\` written at load for runtime use. A reference to one of Fabula's own kinds names the kind's registry name (\`Cast (Fabula)\`, \`Scene (Fabula)\`), carries its sentinel id (\`__fabula_cast__\`, \`__fabula_scenes__\`), and is marked \`fabulaScope: "story"\`, so it offers the story's own records only. On load, a schema nobody has edited is replaced by the current seed when the seed changes; an edited schema keeps its own fields and has its core fields brought up to the seed.

**Field values** in a record's \`fields\` take the shapes in the entries' table above, with these notes: an \`entry-ref\` to one of Fabula's kinds holds the record's id (\`fab-cast-...\`), or an array of them when \`multi\`; a \`select\` with Other holds \`{ value, customText }\` as an entry's does; a \`group\` is an array of rows keyed by subfield id; a \`calendar-date-range\` is in the primary calendar. The seeded fields of every kind, with \`[core]\` on the ones Fabula reads:

**\`corpus\`** (nameLabel "Name"): \`kind\` select [core] (Series, Shared World, Anthology, Collection; Other) · \`status\` select [core] (Planning, Active, Complete, Shelved) · \`description\` textarea · \`notes\` textarea.

**\`story\`** (nameLabel "Title"): \`status\` select [core] (Idea, Planning, Drafting, Revising, Done, Shelved) · \`form\` select (Novel, Novella, Short Story, Serial, Screenplay, Campaign; Other) · \`audience\` select (Adult, New Adult, Young Adult, Middle Grade, Children's) · \`targetLength\` number · \`structure\` select [core] (Three-Act, Freytag, Hero's Journey, Seven-Point, Kishotenketsu, Custom, None) · \`customSlots\` group [core], rows \`{ slot: text }\`, shown when \`structure\` is Custom · \`threads\` entry-ref multi [core], Plot Thread entries · \`notes\` textarea. Premise panel: \`why\` textarea · \`whatIf\` textarea · \`logline\` text · \`themeStatement\` textarea [core] · \`themes\` entry-ref multi [core], Theme / Motif entries · \`centralConflict\` textarea · \`conflictKinds\` multiselect (vs Character, vs Self, vs Society, vs Nature, vs Technology, vs the Supernatural, vs Fate; Other) · \`stakes\` textarea · \`synopsis\` textarea. Genre panel: \`genre\` select (Fantasy, Science Fiction, Sci-Fantasy, Mystery, Thriller, Romance, Horror, Historical, Literary, Adventure; Other) · \`subgenre\` text · \`tone\` multiselect (Bleak, Hopeful, Comic, Wry, Tense, Lyrical, Grim, Cozy; Other) · \`readerExpectations\` textarea · \`expectedMoments\` group, rows \`{ moment: text, momentScene: entry-ref to a scene }\` · \`comparableTitles\` group, rows \`{ comparableTitle: text, comparableWhy: text }\`. Narration panel: \`pointOfView\` select (First, Second, Third Limited, Third Omniscient, Third Objective, Multiple) · \`tense\` select (Past, Present, Mixed) · \`narrativeDistance\` select (Close, Medium, Distant, Varies) · \`reliability\` select (Reliable, Unreliable, Varies) · \`narrators\` entry-ref multi, cast records · \`povPlan\` textarea · \`voiceStyle\` textarea. Setting panel: \`timePeriod\` text · \`storyTimespan\` calendar-date-range · \`places\` entry-ref multi (Location, Cosmology / Plane, Astronomical Body, Vehicle) · \`rulesInPlay\` entry-ref multi (Magic / Tech System, Religion / Belief System, Faction / Government / Organization, Culture / People) · \`arena\` textarea · \`sensoryPalette\` textarea.

**\`cast\`** (nameLabel "Name"): \`character\` entry-ref [core] (Character, Deity / Entity), required · \`importance\` select [core] (Main, Secondary, Minor) · \`firstAppears\` entry-ref, a scene · \`role\` multiselect [core] (Protagonist, Antagonist, Deuteragonist, Tritagonist, Confidant, Mentor, Love Interest, Foil, Antihero, Supporting; Other) · \`beliefSystems\` entry-ref multi (Religion / Belief System) · \`motive\` textarea · \`fear\` textarea · \`voice\` textarea · \`beliefsIdeals\` textarea · \`secrets\` textarea, secret · \`notes\` textarea.

**\`arc\`** (nameLabel "Name"): \`cast\` entry-ref multi [core], cast records · \`arcType\` select [core] (Positive Change, Flat, Negative Change, Disillusionment, Corruption, Fall; Other) · \`status\` select [core] (Idea, Planned, Underway, Resolved, Abandoned) · \`want\` textarea · \`need\` textarea · \`lie\` textarea · \`truth\` textarea · \`startState\` textarea · \`endState\` textarea · \`turningPoints\` group [core], rows \`{ turnScene: entry-ref to a scene, turnShift: text }\` · \`notes\` textarea.

**\`relationship\`** (nameLabel "Name"): \`castA\` entry-ref [core], a cast record · \`castB\` entry-ref [core], a cast record · \`kind\` multiselect [core] (Alliance, Rivalry, Romance, Friendship, Mentorship, Family, Enmity; Other) · \`startsAs\` textarea · \`endsAs\` textarea · \`turningPoints\` group, rows \`{ turnScene: entry-ref to a scene, turnShift: text }\` · \`notes\` textarea.

**\`plotPoint\`** (nameLabel "Name"): \`slot\` select [core], the structure's slots with Other for a custom turn · \`deliveredIn\` entry-ref [core], a scene · \`threads\` entry-ref multi [core], Plot Thread entries · \`description\` textarea · \`notes\` textarea.

**\`promise\`** (nameLabel "Label"): \`kind\` select [core] (Foreshadowing, Chekhov's Gun, Open Question, Red Herring, Prophecy, Callback, Running Gag; Other) · \`status\` select [core] (Idea, Planned, Planted, Paid Off, Subverted, Dropped) · \`setupIn\` entry-ref multi [core], scenes · \`payoffIn\` entry-ref multi [core], scenes · \`threads\` entry-ref multi [core], Plot Thread entries · \`promise\` textarea · \`notes\` textarea.

**\`part\`** (nameLabel "Title"): \`purpose\` textarea · \`summary\` textarea · \`notes\` textarea.

**\`chapter\`** (nameLabel "Title"): \`pov\` entry-ref [core], a cast record · \`status\` select [core] (Idea, Planned, Outlined, Drafted, Revised, Final, Cut) · \`targetLength\` number · \`purpose\` textarea · \`summary\` textarea · \`notes\` textarea.

**\`scene\`** (nameLabel "Title"): \`pov\` entry-ref [core], a cast record · \`setting\` entry-ref (Location, Cosmology / Plane, Astronomical Body, Vehicle) · \`goal\` text · \`conflict\` text · \`outcome\` select (Yes, No, "Yes, but", "No, and"; Other) · \`turn\` text · \`status\` select [core] (Idea, Planned, Outlined, Drafted, Revised, Final, Cut) · \`when\` calendar-date-range [core] · \`participants\` entry-ref multi, cast records · \`walkOns\` entry-ref multi (Character, Deity / Entity) · \`threads\` entry-ref multi [core], Plot Thread entries · \`motifs\` entry-ref multi [core], Theme / Motif entries · \`beats\` group [core], rows \`{ beat: text, whatHappens: textarea }\` · \`notes\` textarea.

**\`research\`** (nameLabel "Topic"): \`appliesTo\` entry-ref multi [core], any entry · \`usedIn\` entry-ref multi [core], scenes · \`sources\` group, rows \`{ sourceTitle: text, sourceLink: url }\` · \`findings\` textarea · \`openQuestions\` textarea [core] · \`notes\` textarea.

Fabula's own display state, the folded panels, the folded outline rows, and the Timeline tab's picks, is kept in the browser with the appearance preferences and isn't part of the save file.

---

'''


def main():
    text = HOME.read_text(encoding="utf-8")
    assert text.count(LINEA_END) == 1, "Linea's end and Stemma's start"
    assert "fabula" not in text.lower(), "the help already names Fabula"
    pairs = [
        (LINEA_END, LINEA_END.replace("  { id: \"stemma\", title: \"Stemma\", content: `", FABULA + "  { id: \"stemma\", title: \"Stemma\", content: `")),
        (VIEWS_OLD, VIEWS_NEW),
        (TPL_PLOT_OLD, TPL_PLOT_NEW),
        (TPL_THEME_OLD, TPL_THEME_NEW),
        (TPL_RESTORE_OLD, TPL_RESTORE_NEW),
        (SAVE_OLD, SAVE_NEW),
        (CONC_OLD, CONC_NEW),
        (SHAPE_OLD, SHAPE_NEW),
        (OPTIONAL_OLD, OPTIONAL_NEW),
        (TPLOBJ_OLD, TPLOBJ_NEW),
        (STEMMAS_HEAD, FABULA_SCHEMA + STEMMAS_HEAD),
    ]
    edit(HOME, pairs)
    print("v1.7 r024 applied: 26_home-data")


if __name__ == "__main__":
    main()
