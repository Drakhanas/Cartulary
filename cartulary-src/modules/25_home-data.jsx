
// ─── Home view (app instructions) ─────────────────────────────────────────────

const HOME_SECTIONS = [
  // ─── Reference ───────────────────────────────────────────────────────────────
  { id: "intro", band: "Reference", title: "About", content: `Cartulary is a worldbuilding tool packaged as one HTML file. The basic unit is an **entry** — a Character, a Location, a Faction, a Historical Event, etc. Entries are grouped by **templates**, which define what fields each kind of entry has.

The name comes from the medieval term for a book of records — a registry kept by a monastery or chancery to remember its lands, charters, and decrees. This is yours: a registry for the world you're building.` },

  { id: "getting-started", title: "Getting Started", content: `To create your first entry:

1. Pick a template from the sidebar (e.g. "Character")
2. Click **+ New Entry**
3. Fill in the fields and save

Templates ship pre-configured but you can edit any of them or create your own. New worlds open on the **Project** page (current world dashboard). Click **Home** in the sidebar to return here anytime.

A few basics worth knowing up front:

- **Search.** The entry list for any template has a search bar at the top that filters by name and content as you type.
- **Delete.** Open any entry and click **Delete** in the editor toolbar to remove it. Templates can be deleted from the template editor (this also removes all entries that use the template — there's a confirmation step).
- **No undo, except in the map editor.** Cartulary doesn't have undo/redo outside the map editor's own Undo and Redo. If you delete an entry or a template, it's gone from the working save. The recovery paths are a restore point in Version History (Settings) or a recent .json backup, which is why backups matter (see Back Up Your World).
- **Auto-save.** Edits are persisted to your browser's storage shortly after each change (debounced). You don't need to "save" manually. Auto-save is for not losing your in-progress work between sessions; it isn't a backup against data loss.` },

  { id: "save-share", title: "Save & Share", content: `Your world auto-saves to your browser's local storage as you work — both committed changes (every edit you've saved) and in-progress drafts in the entry editor or template builder. If you close the tab mid-edit, your draft is restored when you reopen Cartulary, with a notice telling you so.

Drafts are abandoned only when you explicitly Save, or when you confirm "Discard unsaved changes?" on Cancel or navigation. Closing the tab with a freshly-typed change still pending the 500ms auto-save debounce will trigger a browser warning before unload.

To make a portable copy, click your world's name at the top-left of the sidebar to open settings, then use one of:

- **Export .json** downloads a \`.json\` file. **This is the only format that can be re-imported. Treat it as your canonical save.**
- **Export .md** downloads a human-readable Markdown version of the entire world with references resolved to names. For sharing, printing, or feeding to an AI assistant. **Cannot be re-imported.**
- **Export .zip** downloads a Markdown bundle with all referenced images in an \`images/\` subfolder. Same content as .md but self-contained. **Cannot be re-imported.**
- **Import .json** loads a JSON save back. JSON only.

**Shareable HTML.** A fourth export format lives on the **Project** view (not in Settings): a single self-contained \`.html\` file with the world's content rendered as a static reference. Cross-references between entries become anchor links, maps render as they do in the app (image, drawing, painted layers, and pins), and dates resolve through your calendar system. Read-only — for sharing with people who don't have Cartulary. Configurable per-export: include secret fields, pick which calendar to render dates in (when you have additional calendars). **Cannot be re-imported.** JSON remains your canonical save format.

**Per-entry markdown export.** Each entry's view has an **Export ↓** button next to the title that downloads just that one entry as Markdown. Filename is the entry's slug, e.g. \`aria.md\`. Useful when you want to share a single character or location without dumping the whole world. Whether secret fields are included follows the current state of the secrets visibility toggle in the top right: if it's on (◉), secrets are in the export.

**Family tree markdown export.** The Family view has an **Export tree as Markdown ↓** button below the Focal selector. Downloads a markdown file representing the focal person's family tree: ancestors numbered by Sosa-Stradonitz (focal=1, parents=2/3, grandparents=4–7, etc.), spouses with status, siblings, and descendants in nested bullets. Filename is the focal person's slug plus \`.family.md\`, e.g. \`aria.family.md\`. The export uses the same parent-side rules as the Family view (label hints first, ID-sort fallback). Descendant depth caps at 6 generations.

If you treat the Markdown export as a backup, you will lose data when you try to restore: there is no .md → world conversion. Markdown is for sharing and reading. JSON is for saving and restoring.

Markdown exports omit secret-marked fields by default. There's a separate "with secrets" button if you want a complete personal copy.

Your appearance preferences (theme, font size) are stored separately and don't travel with exported worlds.` },

  { id: "templates", title: "Templates", content: `Templates are blueprints — each one defines the fields that entries of its kind will have. The default set covers common worldbuilding territory:

- **Artifact / Object / Currency** — items of significance, including coinage and currencies
- **Character** — people with personality, history, family
- **Cosmology / Plane** — planes of existence, dimensions
- **Creature** — fauna, monsters (non-civilized)
- **Culture / People** — anthropological: customs, daily life, art, values
- **Deity / Entity** — gods, primordials, archfiends, spirits
- **Book / Document / Text / Tome** — books, codices, letters, scrolls, prophecies, inscriptions
- **Faction / Government / Organization** — organizations, governments, guilds, courts, religious orders
- **Festival / Holiday** — recurring observances
- **Historical Event** — one-time events with causes and consequences
- **House / Dynasty / Clan / Bloodline**: noble houses, dynasties, clans, bloodlines, and other kin-groups
- **Location** — places, regions, geography
- **Magic / Tech System** — rules of magic or technology
- **Plot Thread** — story arcs with stakes and hooks
- **Race / Species / Ancestry** — sentient peoples (elves, kitsune, robots)
- **Religion / Belief System** — doctrine, practices, hierarchy
- **Substance / Material** — metals, gems, drugs, poisons, magical reagents
- **Theme / Motif** — recurring symbolic elements
- **Vehicle** — ships, aircraft, mounts, mecha, spacecraft
- **Weapon / Armor** — combat equipment with damage, reach, weight, and handedness

**Creating a new template.** Click **+ New Template** in the sidebar. Pick a name, an icon glyph, and an accent color. Then add fields via the Template Builder.

**Editing an existing template.** Pick the template in the sidebar and click **Edit Template** at the top right of its entry list. The Template Builder opens in place of the entry list.

**The Template Builder.** Each field has a label, a type, and any type-specific options. Add fields with **+ Add Field**. Remove with the × button on the row. Drag the handle to reorder. (See **Field Types** for the full per-type reference: text, long-text, select, multiselect, cascade-select, entry-ref, calendar-date, calendar-date-range, name-history, repeating-group, and the rest.)

Beyond per-field configuration, the builder has structural options:

- **Show-when conditions.** A field can be set to render only when another field has a specific value — e.g. a "Manner of Death" field that appears only when Status is "Deceased." Conditions chain (A shows if B equals X; C shows if A is non-empty). The layout engine respects this when laying out half-width pairs so you don't get a stranded empty slot.
- **Half-width pair layout.** Eligible field types can be marked half-width. The builder auto-pairs contiguous half-width fields onto the same row in the rendered entry form. Pairing happens after show-when evaluation, so dynamically-hidden fields don't disrupt pairing.
- **Other-text reveal on select.** A select field can be configured so picking "Other" reveals a free-text input for the actual value. Useful for fields where you want canonical options plus an escape hatch.
- **Cascade chains.** Two select fields can be chained so the second's options depend on the first's value (e.g. Type → Subtype). Define the chain in the Template Builder; the entry form filters the second dropdown based on what's picked in the first.
- **Entry-ref scope and filters.** An entry-ref field can be restricted to one or more templates' entries. Filter further via field-value criteria if needed (e.g. an entry-ref to Characters where Status is "Living").

**Template Preview.** Click the **👁 Template Preview** button at the top-left of the builder to open a separate browser window showing your in-progress template rendered as an entry form. Type values into the preview to test cascade chains, show-when conditions, the "Other" text-input reveal, and the half-width auto-pair layout — everything renders live as you edit the template. Values you type are popup-local and ephemeral; nothing gets saved to your world. The popup auto-closes when you navigate away from the template builder, reload the page, or close the parent tab. Drag the popup to a second monitor if you have one.

**Maps are not templates.** As of v1.6, maps are first-class records managed entirely in Cartographia, not template-backed entries. There is no map template to edit and no map kind in the Template Builder.

**Self-references are blocked.** An entry-ref field can't point at the entry it lives on — a person can't be their own father, a faction can't be its own ally, Earth can't point at Earth. The dropdown excludes the current entry from its candidate list, and any pre-existing self-references in older world files are stripped on load.

**Delete Template.** Removes the template AND all entries that use it. Confirm carefully — there's no automatic snapshot before this operation (unlike World Reset and Import, which auto-snapshot). Take a manual Restore Point in Version History before delete if you want a recovery path within the session, or export to .json beforehand.

**Reset to Default** (built-in templates only). Restores factory fields, name, icon, and color. The reset is gated by a confirmation modal that lists exactly what will change.

Reset behavior, in detail:

- **Factory fields you've edited** keep their entry data. Field matching is by label — if your edited "Description" field has the same name as the factory "Description" field, your existing data on that field is preserved across the reset.
- **Factory fields you've deleted** are added back. Empty values for new entries; nothing imported retroactively for old entries (those fields will simply be blank on existing entries).
- **Custom fields you've added** (fields not in the factory definition) are removed, along with all entry data stored in them. The modal lists these explicitly so you know what's about to be lost.
- **Field type changes** — if you've changed a field's type (e.g. text to number), Reset restores the factory type. Existing values that don't fit the restored type may render as blank, depending on the type combo.

The modal also warns if the reset has no effect (your template already matches the factory default). Reset cannot be undone — take a Restore Point first, or export your .json beforehand.

**Restore Built-ins.** If you've deleted one or more **built-in** templates outright, the sidebar shows a **Restore Built-ins** button below "+ New Template" with a count of how many are available to restore. Clicking it opens a checklist of the missing built-ins, all selected by default. Restored templates come back with their factory fields, icon, and color, and slot back into their canonical position in the sidebar order. (Deleted **custom** templates are gone for good unless you have a JSON backup.)

**Sidebar behavior.**

- **Collapse:** Click the **Templates ▾** header to fold the Templates section to just its title. Useful when you have many templates and want the Tags section below to have more breathing room. Collapse state is remembered between sessions.
- **Resize:** Drag the sidebar's right edge to widen or narrow it (between 200px and 500px). Double-click the edge to snap back to the default width. Useful when long template names (like "Artifact / Object / Currency") get clipped, or when you want a tighter sidebar to give the main view more room. Width persists between sessions.
- **Reorder:** Hover any template to see a drag handle (⋮⋮) on the left. Drag to reorder. The default list ships in alphabetical order; whatever order you set is what the sidebar uses. (See also Reordering Templates & Fields.)

You're not limited to the built-in set. See **Example Template** for a fully-worked custom template that handles workflows the built-ins don't cover directly.` },

  { id: "fields", title: "Field Types", content: `When building or editing a template, fields can be:

- **Short Text / Long Text** — names, descriptions
- **Longform Note**: plain-text prose with **Indent** and **Divider** buttons for light structure; no Markdown. For long passages where you want paragraph indents and section breaks without wiki-links or formatting.
- **Tag List** — comma-separated labels
- **Dropdown** — predefined options (e.g. Status: Living/Deceased)
- **Multi-select** — pick any number of options from a fixed set (like Dropdown, but many at once). Always full-width.
- **Number** — quantitative
- **Date** — real-world date
- **Calendar Date (in-world)** — single point in time using your custom calendar (see Calendars & Dates)
- **Calendar Date Range (in-world)** — start + optional end, with approximate (~) flag per date. Drives duration display in Timeline; Chronometric.
- **URL / Color / Image** — self-explanatory
- **Entry Reference** — link to another entry (single or multi). Deleting the referenced entry (or the template that owns it) automatically clears the reference from any entry that pointed at it; you won't be left with broken links pointing at nothing.
- **Name History** — list of former names with optional from/to dates. Drives time-aware label rendering on maps and timelines (a pin or event in 1640 can show "New Amsterdam" even if the entry's current name is "New York"). See Name History (former names) for details.
- **Repeating Group** — list of structured sub-records
- **Grid / Table**: a labeled table. Name the rows and columns, choose a cell type, and fill the cells. Cells can hold text, numbers, or entry references. Top-level only (can't nest inside a Repeating Group).

Long text fields support **Markdown** and **wiki-links**.

Calendar Date Range supports the **~** approximate flag for fuzzy historical dates. Both ends of the range can be marked individually. Examples:

- \`1370 – 1383\` — exact start, exact end
- \`~1370 – 1383\` — approximate start, exact end
- \`~1370 – ~1383\` — both approximate
- \`1370 – \` — start known, no end (renders as ongoing with an open-ended arrow on Timeline; Chronometric)

**Half-width pair layout.** Adjacent half-eligible fields (Short Text, Number, Date, Calendar Date, Color, URL, Tags, Dropdown, single-value Entry Reference) automatically pair into side-by-side rows in the entry form. Multi-value entry refs, Multi-select fields, Long Text fields, Name History, Repeating Groups, Calendar Date Ranges, and Image fields always render full-width. A lone half-eligible field with no half-eligible neighbor auto-expands to full. No flag or setting needed — adjacency in your template's field order determines pairing. To get two fields paired, place them next to each other and ensure both are half-eligible types.` },

  { id: "name-history", title: "Name History (former names)", content: `The **Former Names** field on Character, Location, and Faction / Government / Organization templates records what an entry was called over time. Each entry in the field is a name plus optional from/to dates. Empty dates mean "since forever" (no \`from\`) or "still current" (no \`to\`).

Use it for:

- Locations that got renamed: New Amsterdam (1626 – 1664) → New York (1664 – present)
- Characters who changed names: maiden names, regnal names, taken names on marriage, alias-to-real-name reveals
- Factions that rebranded: Holy Roman Empire → Austrian Empire → Austria-Hungary

The entry's primary name (the **Name** at the top of the entry) is whatever the entity is called *now* — usually the most recent. Former Names tracks the history.

**What uses Former Names data:**

- **Wiki-links.** Writing \`[[New Amsterdam]]\` resolves to the New York entry if "New Amsterdam" is in its Former Names. Primary names always win over former names if there's a conflict — an entry literally named "New Amsterdam" beats one that just has it as a former name.
- **Wiki-link autocomplete.** Typing \`[[New A\` in a textarea suggests former-name matches alongside primary-name matches. Former-name suggestions show "→ Current Name" so you know what you're really linking to.
- **Map time mode.** When the map's time scrubber is on, pin labels render the name that was active at the scrubber year. So with the year set to 1640, a pin linked to the New York entry shows "New Amsterdam" if Former Names says it was called that in 1640.
- **Chronometric timeline.** Each event renders the entry's name as it was at that event's year. A 1640 event linked to the New York entry shows "New Amsterdam" on the timeline.
- **Vertical timeline.** Same — each event uses the entry's year-appropriate name.

**What does NOT use Former Names data:**

- The **entry view title** always shows the primary name. If you're looking at the New York entry, the title says "New York" regardless of when you're viewing.
- The **Concordance** shows current names. It's not temporally scoped.
- The **Linea** shows current names. Family trees are inherently a "now-looking-back" view; readers usually want to see relatives by the names they're remembered as. (If you specifically want time-aware family-tree names, that's a future feature.)
- **Sidebar entry lists** show current names.
- **Search results** match against current names primarily; whether they also match former names is currently best-effort and may change.

**Marriage example.** Sarah Jones marries John Smith in 1850 and takes his surname. Both spouses optionally update their Former Names:

- On Sarah's entry: add "Sarah Jones" with To: 1850. Sarah's primary name is "Sarah Smith". (If you also want a row for "Sarah Smith" with From: 1850, you can — it's redundant but documents the change explicitly.)
- On John's entry: nothing changes (he didn't change his name in this culture).

In a culture where the husband takes the wife's name instead, swap the changes. In a culture where neither changes, leave both Former Names empty. In hyphenation, both spouses get a Former Names entry for their pre-marriage name with To: marriage date, and primary name becomes the hyphenated form.

The schema doesn't model the cause of a name change (marriage vs ascension vs adoption vs choice). It just records what the name became and when. The narrative context goes in the relevant entry's description or in a Historical Event entry.

**Multiple marriages, divorce reverts, title acquisitions.** All representable as more rows. A widow remarrying twice would have a sequence: birth name → first married name → maiden name (after first widowhood) → second married name. Same shape as the simple case, just more rows. Same goes for queens whose names changed on ascension and again on abdication, or for characters whose adoptive parents retroactively changed their surname.

**Editor.** Click "+ Add former name" to add a row. Each row has a name input plus optional From and To date pickers. Remove a row with the × button. Order doesn't matter — the system picks the right row based on date ranges, not list position.

**No date is fine.** If you don't know when a name change happened, leave both From and To blank for that row. The name will appear in autocomplete and resolve in wiki-links, but won't be selected for time-aware rendering since it has no temporal claim.

**Overlapping ranges.** If two rows both claim to cover the same year (probably a mistake), the first row wins. The system doesn't warn you about this — if you spot odd timeline labels, check Former Names for overlaps.` },

  { id: "kalendarium", title: "Kalendarium", content: `**Kalendarium** is the sidebar view that holds every calendar in your world. The default world ships with a 12-month Gregorian calendar as the **primary**; you can replace it freely and add **additional** calendars alongside it for parallel reckonings — a faerie calendar, a dwarven calendar, an old empire's calendar that still gets cited in historical entries, whatever.

**The primary calendar** is the world's spine. Every absolute date is stored in primary's frame, and any additional calendars convert to and from primary through absolute-day math. Rename primary's months freely; existing dates re-display under the new names. Reordering and deletion are more fragile — see the warning at the bottom of this section.

**Creating an additional calendar.** Click **+ New Calendar** in the Kalendarium header. The new calendar's structure (months, eras, week, seasons, celestials) is fully independent of primary's. Its only tie to primary is the **anchor**: a single date that says "Day X of this calendar = Day Y of primary." Set the anchor once from the calendar's editor; all other dates in that calendar resolve through absolute-day conversion against the anchor. Re-anchoring re-displays every date in that calendar but doesn't move them on the absolute-day axis.

**Months.** Each month has a name and a day count. Click **+ Add Month** to add. Drag the handle to reorder. Day counts can be any number — no requirement that they total 365. Months can be removed unless only one remains.

**Eras.** Optional. Each era has a full name (e.g. "After Binding"), a short name (e.g. "AB"), and a start year. Eras are display-only labels appended to year numbers — a year falls into the era with the highest start-year that's ≤ the year. So with eras Before Binding (start: −∞) and After Binding (start: 0), year 5 displays as "5 AB" and year −3 displays as "−3 BB".

**Week structure.** Set days-per-week and (optionally) a name per weekday. Weekday columns derive from \`(absoluteDay) mod daysPerWeek\`, so Day 1 of a month doesn't always land in column 0; the grid renders blank cells before Day 1's column to keep the alignment.

**Seasons.** Optional bands across the year by day-of-year. Each season has a name, color, and start/end day. End < start wraps through year-end (e.g. Winter startDay 335 endDay 59). Seasons render as background tints on the calendar grid cells and as swatches on the season legend.

**Moons and phases.** A calendar can show up to five **moons** as phase glyphs across its grid. Moons are defined once in **Ephemeris** — any celestial body of kind *Moon* — and the calendar references them by id rather than carrying its own cycle data, so a moon shared across several calendars stays in sync. In the calendar editor's Celestials section, toggle which Ephemeris moons this calendar displays, or click **+ New moon** to quick-create one: a fresh moon starts parentless in cycle-only mode with a seeded synodic cycle so it renders a glyph straight away; add real orbital geometry later in the Astronomical Body workspace if you want geometric phase.

Phase resolves in order. **Geometric** first — if the moon has orbital elements and a parent, the phase comes from the actual star–planet–moon elongation angle on that absolute day. Otherwise it falls back to the moon's **synodic cycle** (its cycle length in days plus the day it was last New). If neither is available, no glyph. Either way the result buckets into five tiers (New / Crescent / Half / Gibbous / Full) shown as glyphs on each day cell, with waxing and waning crescents sharing a glyph (likewise half and gibbous). A moon's color comes from its Ephemeris kind color — there's no calendar-side override. The tooltip on each cell lists every selected moon's phase name for that day.

(Worlds built before v1.5 stored per-calendar moons with inline cycle and offset values; migration moved those into Ephemeris as parentless cycle-only moons and rewired the calendar to reference them, preserving cycle and anchor. Nothing was lost.)

**Calendar grid.** Each row in Kalendarium has an expand toggle that opens an inline year-grid below the row — every month side by side, every day a clickable cell. Cells with dated entries show an accent border; clicking opens a popover listing those entries. Year stepper, seasons legend, and a Jump-to-year input live in the controls above the grid.

**Ctrl+scroll on the grid** zooms (range 0.5–2.5×, factor 1.15). Ephemeral — closing and reopening the grid resets to 1×.

**Comparison strip and reference calendar.** When you have additional calendars, each Kalendarium row shows a small strip displaying that calendar's date for the same absolute moment as every other row. The moment that drives the strip comes from the **currently-pinned reference calendar** (literal-edit pins it automatically; the explicit pin button overrides). Pin primary to anchor against the world's spine; pin an additional calendar to compare every other calendar to that one's reckoning instead.

**Current moment.** The world's "story now" anchor. A panel at the top of Kalendarium lets you set or clear it. When set, character entries with a Lifespan field auto-compute age suffixes from current moment minus birth date (deceased characters use their explicit end date regardless). Stored in primary's frame; conversion to additional calendars happens at display time.

**Per-entry calendar binding.** When the world has additional calendars, entry editors gain a **Dates reckon in…** selector. Pick a calendar there and every Calendar Date and Calendar Date Range field on that entry interprets its values in the chosen calendar. The underlying absolute day stays stable; only the displayed Y/M/D changes. Leave it on primary if you don't care.

**Import / Export.** The Kalendarium header has Import / Export buttons (per-row Export, top-level Import). Calendars travel as \`.calendar.json\` files. Useful for moving a calendar between worlds, or sharing one as a setting reference.

**What dates look like.** Calendar Date and Calendar Date Range fields use a year + month-dropdown + day picker, bounded by the selected month's day count. A small ~ checkbox marks dates as approximate. Dates display through whichever calendar the containing entry is bound to (primary by default).

**Where dates appear.** Anything with a Calendar Date appears as a point on Timeline; Vertical. Anything with a Calendar Date Range appears as a duration bar on Timeline; Chronometric. Eras render as colored bands across both views' time axes.

**Reordering and deletion warning.** Dates are stored as \`{ year, monthIndex, day }\`. Durable across renames; **fragile across month reorder and deletion**. If you delete month index 3, existing dates that used month index 3 now point at whatever moved to index 3 — the date data doesn't move with the deleted month. Same applies to drag-reorder. The Calendar editor warns before either operation when existing dates would be affected, with a count of the affected references. You can still proceed — it's a warning, not a block — but the audit responsibility shifts to you. Lock Mode disables the editor entirely (see Secrets & Lock Mode). **Set up your calendars before entering significant date data**, or be ready to audit after a structural change.` },

  { id: "ephemeris", title: "Ephemeris", content: `**Ephemeris** is the celestial-mechanics view: define a world's stars, planets, moons, and other bodies, then compute where they sit on any date and what alignments those positions produce — conjunctions, eclipses, moon phases, festivals pinned to a real sky. It's a *worldbuilding* tool, not a physics sandbox: the aim is a calendar of meaningful sky events you can hang lore on, not n-body simulation. Bodies move on fixed Keplerian orbits around their parent; mutual gravity, orbital decay, and collisions are deliberately out of scope.

Ephemeris has five workspaces, switched from the tabs at the top.

**Astronomical Body** is where you build the system. Each body has a **kind** — Star, Planet, Moon, Dwarf Planet, Asteroid, Comet, Rogue Planet, Black Hole, or Meteor Shower — and, for the computable kinds, the six classical orbital elements plus physical parameters like mass and radius. Bodies nest: a moon's parent is a planet, a planet's parent is a star, a top-level star has no parent. The tree on the left mirrors that hierarchy. A few **narrative** kinds (galaxies, wormholes, and similar) exist purely for organization — they carry no orbit and take no part in the math below. New bodies start with sample orbital values so they're never blank; replace them with your own.

**Compute** takes a body and a moment — or a date range — and solves the body's position for that absolute day. Over a range it scans for alignment events between bodies: conjunctions, eclipses, nodal crossings, and moon-phase alignments. Only bodies with a complete orbit-and-parent chain up to the root are eligible; a body missing its parent's mass, or with a broken chain, is flagged rather than quietly producing nonsense. Pick the bodies and an alignment type, then run it with the **Run** button or Cmd/Ctrl+Enter. Switching the alignment type drops any selected bodies that can't take part in the new type, with a note saying how many.

**Forced Alignment** runs Compute backwards: instead of "where are these bodies on this date," you pick the bodies and the alignment you want, and Ephemeris searches for the days that produce it — for when the story needs a triple conjunction and you need to know when it falls. A result can be verified back in Compute, and reverted.

**Observe** draws a top-down orbital diagram of the system at the current moment — orbits optionally to scale, bodies colored by kind, the whole chain from the root star outward. Bodies whose orbit chain is broken are left out of the diagram with a note, rather than drawn at a meaningless spot. Step the shown moment backward or forward with the date steppers (a day, a week, a month, or a year each way), or jump to the world's "story now" with **Now** — which stays disabled, with a banner, until a current moment is set.

**Event** turns a computed alignment into a real Cartulary entry — a festival, holiday, or portent — so the sky event joins your world's record, dateable on the timeline and linkable like anything else. It's the bridge from "the math says these align on day 8,420" to "the Convergence, observed whenever the three moons meet."

**Habitable zone.** On a star, Ephemeris can show the habitable-zone band using three standard models, with a luminosity override if you'd rather set the star's output directly than derive it.

**Moons feed calendars.** A body of kind *Moon* is the same moon a calendar tracks for phase glyphs (see Kalendarium → Moons and phases). Define it once here; reference it from as many calendars as you like, or quick-create one from a calendar's Celestials section and flesh out its orbit later.

**Current moment.** Compute and Observe read the world's "story now" — the same anchor Kalendarium sets. Move it and the whole sky moves with it.

Lock Mode disables editing here as everywhere. Bodies persist in the world file under \`celestialBodies\`; the view's own UI state lives under \`ephemeris\` (see JSON Save File Schema).` },

  { id: "glossopoeia", title: "Glossopoeia", content: `**Glossopoeia** is the constructed-language view: a workbench for documenting a world's invented languages, from sound inventory up through grammar, dictionary, writing system, and glossed example texts. It is organized as eleven workspaces *per language* — pick the language from the selector at the top and every workspace shows that language's data. A world can hold as many languages as you like, and a language can be marked a dialect of another.

Glossopoeia replaces the old built-in **Language / Glossary** template. Worlds upgraded from an earlier version have their language entries migrated automatically: entries typed **Language Overview**, **Dialect**, or **Naming Convention** become **ConLang** containers, and everything else (Word / Term, Phrase, Idiom / Proverb / Slang, and anything custom) becomes a **Lexeme** dictionary entry. Nothing is lost, and the five templates that referenced Language / Glossary (Character, Location, Culture / People, Document, Race) re-point to ConLang.

Each language and several of its pieces register as nodes, so they show up in **Concordance** and can be pointed at by reference fields the same way entries can.

The workspaces, switched from the grouped nav on the left:

- **Overview** — the language container: name, autonym, morphological type, alignment, basic word order, who speaks it, where, and a free-form write-up. A dialect points at its parent here.
- **Phonology: Inventory** — the sound system. One entry per phoneme; the Class field (consonant, vowel, diphthong, tone) drives which articulatory fields appear, so you only fill in what's relevant. A collapsible box at the top holds the romanization and pronunciation key.
- **Phonology: Phonotactics** — how sounds combine: a syllable-structure spec, a stress spec, and lists of phonotactic constraints and phonological rules. Constraints and rules point at the phonemes they concern.
- **Morphology** — the grammar toolbox, four entity types under sub-tabs: Grammatical Value (features like Plural or Accusative), Affix (the prefixes and endings that mark them or build new words), Word-Building Process (non-affix formation like compounding), and Inflection Class (optional ending-groups). Affixes mark grammatical values; dictionary words draw on all four.
- **Noun Number**: a read-only digest. It owns no data; it filters the Morphology toolbox down to the number values and noun morphology and lays them out, each card linking back to its record in Morphology.
- **Pronouns** — pronoun sets, each with a grid of forms you label and fill yourself.
- **Verbs**: a read-only digest like Noun Number, filtering the Morphology toolbox down to everything verbal, each card linking back to its record in Morphology.
- **Grammatica: Syntax** — single-clause grammar: a phrase-order spec, a sentence-marking spec, and a list of set constructions (negation, questions, commands, comparison, and the like).
- **Grammatica: Complex Structures** — multi-clause grammar: a relative-clause spec and a list of clause-linking patterns (coordination, complement clauses, conditionals, serial verbs, reported speech).
- **Lexicon** — the dictionary. One Lexeme per word or fixed phrase, with structured senses, etymology that links words to each other across languages, optional name fields for proper nouns, and the Morphology hookups (inflection class, inherent features, what built the word). Orphan words with no language land in an Unassigned bucket you can re-home from.
- **Orthography** — the writing system, text-only in this version: one or more Writing System entries, the Graphemes (signs) that make them up, and optional spelling rules. Graphemes spell phonemes. Custom glyph images and fonts are out of scope for now; signs are documented in words and by their romanization.
- **Corpus** — glossed example texts, Leipzig-style. Each entry is one example laid out as an interlinear grid: a row per tier (the words, their gloss, an optional pronunciation line), plus an optional row whose cells link each word to its dictionary entry.

Every field label carries a tooltip — hover the dotted-underlined label for a one-line note on what goes there.

Lock Mode disables editing here as everywhere. All of a world's Glossopoeia data persists in the world file under \`glossopoeia\` (see JSON Save File Schema).` },

  { id: "timeline-editing", title: "Editing Dates From the Timeline", content: `The Chronometric timeline supports in-place date editing. Click the **Edit** button in the controls row to switch on edit mode; it reads **Editing** while it's on. Click it again to leave. Escape only deselects the current event, and closing the selection panel doesn't leave edit mode.

**While edit mode is on:**

- Click an event (a dot or a bar) to select it. A panel opens at the bottom of the view with that event's date controls.
- The panel has a Year input with **−/+** buttons, a Month dropdown, and a Day input with **−/+** buttons. For range events, you get the same controls twice — once for the start, once for the end. A small ~ checkbox marks dates as approximate.
- Numeric inputs commit when you tab out, click elsewhere, or press Enter. Type "147" and the timeline doesn't jump to 14 → 147 mid-keystroke.
- The **−/+** buttons commit immediately. Useful when the mouse keeps fighting you between 146 and 148.
- Drag any event sideways to move it. Drag the middle of a range bar to shift both ends together. Drag the small accent-colored handles on either end of a range bar to move just that side.
- Drag commits on mouse release. Sub-day movements are ignored as noise.

**Selection panel.** The panel header shows the entry's name (click it to jump to the entry view), the template, and the field this date came from. Click the × to close the panel without leaving edit mode. Press Escape to deselect.

**What edit mode doesn't do:**

- It doesn't create new events. To add a new dated event, go to the entry's editor and add a value to a Calendar Date field there.
- It doesn't delete events. To remove an event, clear its date in the entry editor.
- It doesn't show up when the world is locked. The Edit button is hidden in Lock Mode (the same logic that gates the Calendar editor — preventing accidental destructive edits).
- It doesn't apply to marriage spans. Marriages render on their own dedicated **Marriages** lane (one bar per pair, deduped across the two reciprocal declarations, labeled with both spouses' names) but are read-only on the timeline — no drag handles, no panel editor. To change a marriage's dates, open either spouse's entry and edit the date pickers next to the spouse declaration. Click the bar to jump to the alphabetically-first spouse's entry.

**Variable lane heights.** Every lane (template lanes and the Marriages lane alike) sizes itself to fit its busiest stack of overlapping events at the current zoom. Sparse lanes stay compact; dense lanes grow vertically so every event gets its own visible row instead of getting buried.` },

  { id: "timeline-export", title: "Exporting the Timeline as an Image", content: `The Chronometric timeline has two export buttons — **PNG** and **SVG** — in the controls row, next to the zoom and reset buttons.

**How to use it.** Whatever you can see is what gets exported. Pan, zoom, and toggle lanes on or off until the timeline looks the way you want, then click PNG or SVG. The image downloads to your usual downloads folder. To export the whole history of your world in one image, click Reset first to fit everything to the screen, then export.

**PNG or SVG?**

- **PNG** is a regular image, like a screenshot. Use this for posting on social media, dropping into a Discord message, embedding in a session-prep doc, or anywhere you'd normally use a picture. Works everywhere images work.
- **SVG** is a vector format, which means it stays sharp at any size. Use this for printing the timeline at poster size, opening it in a design tool to edit, or putting it in a document where the size might change later.

If you don't know which to pick, pick PNG.

**Limitations.**

- Only the Chronometric timeline exports. The vertical Timeline view doesn't have an export option right now.
- Every exported image carries a small "Made with Cartulary" mark in the corner. There's no way to remove it.
- The export shows what's visible. Lanes you've turned off don't appear, and dates outside the visible range get cropped.
- Very long timelines at high zoom can produce huge files. If a PNG export silently fails to download, try the SVG export instead — SVG handles large dimensions better — or zoom out before exporting.` },

  { id: "cartographia", title: "Cartographia", content: `Maps in Cartulary are canvases: an image you bring, a blank sheet, or both, with a drawing on it (shapes, labels, stamps, and painted layers, in a layer stack) and clickable pins over it. Pins tie places to entries; the drawing is the map itself. Regional maps, dungeon layouts, star charts, floor plans, anything where points of interest cross-reference other entries. **Cartographia** is the sidebar view that indexes every map in the world, with the world's stamps and brushes in a panel above the list. This topic covers maps, pins, time mode, and the downloads; the drawing and painting tools are under **Map Editor**, and stamp packs and brush imports under **Stamps & Brushes**.

**The index.** Click Cartographia in the sidebar for the map list, most recently updated first: the name, the pin count, "no image" for a blank canvas, the last update, a preview of the Description, and the tags. Click a row to open the map; Delete on the row removes the map with its drawing and its pins (the entries the pins linked to are untouched). Maps are their own records, not template entries: there is no map template and no map kind in the Template Builder, and every map carries the same three fields, Description, Scope / Region, and Notes. A world saved by v1.5 is migrated on load: each map entry becomes a map record, the map-kind templates are dropped, and any extra fields a custom map template had are kept in the record (not shown) with a line in Notes naming them.

**Creating a map.** Click **+ New Map**. The editor shows the name and tags, the canvas, then the three fields; **Save** needs a name, and **Cancel** discards the draft (in folder mode it also puts back any layer files the session wrote). **Edit** on a saved map brings the editor back. **Set Image** brings an image in: with an image folder connected the file stays on disk and only its name is saved, otherwise it embeds in the save file, with a confirmation for anything over 1 MB. **Change Image** swaps the image and keeps the drawing and the pins; **Remove Image** clears it and leaves them on the canvas. An image map's canvas is the image's own size. Without an image the canvas is a blank vellum sheet, and a **Canvas** picker in the strip offers Landscape 1600 × 1000, Portrait 1000 × 1600, Square 1200 × 1200, or **Custom…** (whole units, 100 to 10000 a side; type the size, then **Set** or Enter). Changing the size of a map that already has work on it asks first, because nothing is transformed: shapes keep their coordinates and anything past the new edges is cut off, a painted layer is clipped, and pins keep their relative positions and shift against the drawing. Undo restores it. Sizes are drawing units, not screen pixels.

**Pins.** Pin is the editor's default tool: click the map to add a pin, click a pin to edit it, drag a pin to move it, with a mouse, a pen, or a finger. A selected pin shows its editor below the canvas: Label (its first letter is the marker), Linked Entry (any entry in the world, or an Astronomical Body), Always visible (for time mode), Color, Notes, and Delete Pin; Done closes it. Pins are stored as fractions of the canvas, not pixels, so they stay on the same spot at any size and zoom. A linked pin is an edge in Concordance, from the map to the entry; in the map's view, clicking a linked pin opens the entry (a drag pans the map instead), and a pin whose entry was deleted says so. Pins go through undo like everything else and are left out of the SVG and PNG downloads.

**Looking at a map.** In a map's view the canvas pans when you drag it, and zooms with Ctrl+scroll (Cmd+scroll on a Mac), a pinch, the − and + buttons in the canvas's corner, or the keys + and −; 0 or the corner's **Fit** shows the whole canvas, which is as far out as it goes, and the range runs to 8x. Drag the canvas's bottom-right corner to resize the box on the page, from 25% to 150% of the column (past 100% it grows from the center); double-click the corner to snap back. Neither the zoom nor the size persists. The editor has the same controls and a Pan tool besides; see Map Editor.

**Map fields.** Every map carries the same three fields (Description, Scope / Region, Notes) above its canvas. Custom per-map field sets are not part of v1.6; maps are a uniform record type.

**Time mode (chronicles).** When pins on a map link to entries that have a calendar-date-range field with data, a **Time** button appears in the controls above the canvas. Toggling it on adds a year scrubber, +/− buttons, a numeric year input, and one button per defined era. The map then filters pins by whether the current year falls within their linked entry's range.

Three pin states in time mode:

- **Permanent pins.** Marked with the "Always visible (ignore time mode)" toggle in the pin editor. These show on the map regardless of the year, even if their linked entry has a date range. Use this for places that exist across the entire timeline of your world — geological features, ancient ruins, anything that pre-dates your records. A small ◇ marker next to the pin label indicates permanent status when time mode is on.
- **Temporal pins.** Linked to an entry with a calendar-date-range. Visible only when the scrubber year falls within the range.
- **Undated pins.** Linked to an entry with no range data, and not marked permanent. Hidden when time mode is on. The interpretation is "you haven't filled in dates yet" — if a pin should be visible across all time, mark it permanent explicitly.

**Permanent overrides range.** If a pin is marked permanent AND its linked entry has a date range, the permanent flag wins — the pin shows always. Useful for places where the location exists permanently but its occupancy is temporal: a cave that's only inhabited some of the time, a ruin that has periods of activity. The pin always shows the cave's location; the linked Location entry's date range describes when something interesting was happening there.

The rules:

- The first \`calendar-date-range\` field on the linked entry's template (in field order, from top) is what's read. Other range fields are ignored.
- Point-date fields (\`calendar-date\`, not range) don't constrain visibility.
- Unlinked pins (no linked entry at all) are always visible — there's no entry data to filter against.
- Open-ended ranges work as expected: a range with start=1370 and no end is visible from 1370 onward. A range with end=1395 and no start is visible up to 1395.
- Pins out of range are hidden by default. Toggle **show faded** to render them dimmed instead, so you can see "there used to be something here" without clutter.
- The scrubber's bounds come from the actual data — min and max years across all pinned entries' ranges. Permanent pins don't contribute to the bounds. Era buttons jump the scrubber to that era's start year (clamped to the bounds).
- Clearing both halves of a range (× on start AND × on end) reverts the field to "no temporal data" — the pin will then be hidden in time mode unless it's marked permanent.

If no pins on the map have temporal data (no ranges anywhere), the Time button doesn't appear — the feature stays out of the way for non-historical maps. Permanent flags alone don't make the button appear, since there's nothing to scrub through.

**Downloading a map.** In a map's view (not the editor), a **Download** row above the canvas writes the saved map as a file named after the map. **SVG** is the map as a standalone file: the drawing with the image and every painted layer inlined when they can be read, the stamps and tips it uses resolved into the file (each once), hidden layers left out, the map font embedded when it can be fetched, and no pins (pins are app data with their own renderer). **PNG** is the same drawn at twice the canvas size, scaled down to fit sixteen million pixels when the canvas is huge. A note beside the buttons says what was written, and says so when the image or a painted layer could not be read (a folder file with no folder connected): the file then has the rest of the drawing. The world's HTML export draws every map through the same renderer, image, drawing, painted layers, and pins together.

**Limitations.** No pen pressure: a stroke is the width you set however hard you press. No colors beyond the palette of eight for shapes, labels, and paint (a stamp pack can carry its own colors, and a color tip paints as it is). No grid or snapping beyond the rotation knob's Shift snap, no fog of war, no measurement or scale tools, no layer opacity or blend modes, and no placing a shape or a stroke from the keyboard. Cartulary's map support is reference-grade, not VTT-grade: a drawn, painted, or imported map with clickable, cross-referenced, time-aware pins. If you need a virtual tabletop experience, this isn't that.` },

  { id: "map-editor", title: "Map Editor", content: `The map editor opens from **+ New Map** or **Edit** on a map. Above the canvas sit the image buttons and the hint, a fixed two-line space that says what the active tool does, or why it can't when the active layer is hidden, locked, or the wrong kind; then the strip: the tools, the canvas controls, and the style of the next shape or the selected one. Everything here works with a mouse, a pen, or a finger, and most of it from the keyboard too. Save and Cancel are the map's own buttons; the drawing is saved with the map.

**The strip.** The strip is built from named groups laid out in rows. As shipped: row one, the thirteen **tools**; row two, the **Canvas** picker (image-less maps only), **Undo** and **Redo**, **Layers** with the **Layer** select naming the layer new shapes go to, and **Arrange…**; row three, the **Fill** and **Stroke** swatches, **Width**, **Smooth**, and the active tool's own controls (the point count with **Done** and **Cancel** while a polygon or line is open; tip, size, and opacity for the Brush and Eraser; the stamp picks; a label's text, size, and arc; the angle of a label or stamp; the selected shape's layer; **Delete shape**). Groups that don't apply to the current tool or selection dim rather than disappear, so nothing moves under the pointer when the tool changes. **Arrange…** opens a modal where every group can be moved earlier or later, a "new row" checkbox starts a row before any group but the first, and the tool buttons can be reordered; each change lands in the strip behind the modal at once, **Reset** restores the shipped layout, and the layout is kept in this browser with the theme and the font size, not in the world file.

**The tools.** Each has a letter that selects it when no text field has focus, shown in its button's tooltip with the hint. In the shipped order:

- **Pin (N)**, the default: click the map to add a pin, click a pin to edit it, drag a pin to move it. The drawing is inert under this tool.
- **Select (V)**: click a shape to select it, drag it to move it, drag a point (polygon, line) or a corner (rectangle, ellipse, stamp) to reshape it, drag the knob above a label or a stamp to turn it (Shift snaps to 15°); the arrow keys nudge it by one unit, ten with Shift; Delete or Backspace removes it; Esc clears the selection; a right-click returns to Pin. A stamp keeps its proportions, nothing goes under 8 units, a line or polygon with more than forty points moves as a whole, and a filled region (from the Fill tool) has no handles. Shapes on hidden or locked layers can't be selected.
- **Rect (R)** and **Ellipse (E)**: drag. A drag under two units in either direction places nothing.
- **Polygon (P)**: click the corners of a closed, filled area. The first corner, a double-click, Enter, **Done** in the strip (from three points), or a right-click closes it; Esc or **Cancel** discards it.
- **Line (L)**: click the points of an open line. A double-click, Enter, **Done** (from two points), or a right-click finishes it; Esc or **Cancel** discards it.
- **Freehand (F)**: drag to draw a line in one motion. On release the line is simplified to the points it needs (a long coastline lands at a few dozen), it keeps **Smooth** on, and the tool stays so the next drag starts at once. Esc while dragging discards it. A freehand line of forty points or fewer reshapes by its points in Select; a longer one moves as a whole.
- **Fill (G)**: click inside an enclosed area to fill it with the Fill color. The drawing as it stands is traced, so lines, shapes, the image, and painted layers all bound the fill; small gaps in the outline close on their own, and the fill lands just under the lines around it, above the topmost filled shape under the click in the active layer. A click too close to a line is refused with a note, as is an area too narrow to fill. The result is a region shape: selectable, movable, restyled by the swatches (it lands with no stroke; give it one in Select), with **Smooth** off because a traced edge is already true.
- **Text (T)**: click to place a label; the strip's text field takes focus so typing replaces "Label", and Enter or Esc leaves the field. Size (24, 36, 56), **Arc** (a slider from −180° to 180°; right arches it up, left bends it down; **Straight** flattens it), and **Angle** (−15 and +15 buttons, or a typed value) are in the strip. A label is Ink until the Fill swatches restyle it.
- **Stamp (S)**: pick a symbol in the strip (the four built-ins are always there; **More…** opens every stamp in the world, with a filter), then click to place it 120 units across or drag to size it. An svg symbol places square; a raster tip keeps its own proportions. The placed stamp is selected, so the angle controls and the handles apply to it at once.
- **Brush (B)** and **Eraser (X)**: paint on and erase from a raster layer; see Painting below.
- **Pan (H)**: drag to move the view; see The view below.

In any drawing tool a right-click finishes the shape in progress and switches to Select with it selected; in Select a right-click returns to Pin. Esc discards a shape or a stroke in progress before it clears a selection.

**Style.** **Fill** and **Stroke** come from a fixed palette of eight (Ink, Sepia, Parchment, Forest, Water, Stone, Blood, Chalk) plus None, each swatch named for a screen reader; **Width** is a slider from 1 to 32 drawing units with a number field that goes to 64; **Smooth** rounds a rectangle's corners and curves a polygon, line, or region through its points. New shapes start with a stone fill, a sepia stroke, width 4, and Smooth on. With nothing selected the controls set the style for the next shape; with a shape selected they restyle it, and that becomes the default too. A line has no fill, a bucket fill has no stroke until you give it one, a stamp has no width (its line weight is the symbol's own), and the Brush's color is the Fill swatch (Ink when Fill is None).

**Painting.** A map's layers are vector (shapes) or raster (one bitmap). **Brush** paints on the active raster layer; with a vector layer active, the first stroke makes a raster layer named Paint just above it, which becomes the active layer. **Eraser** erases from the active raster layer and never makes one. The tool's controls sit in the strip: the **Tip** (the built-in Round and Soft round, plus any tintable tip the world's packs brought in; **More…** opens them all, with Import), the **Size** in drawing units (a slider from 4 to 256, a field to 1024; the ring on the canvas shows it), and the **Opacity** (5% to 100%; one stroke is flat at that strength however many times it crosses itself, and strokes over each other add up). The Brush paints in the Fill color; the Eraser's opacity is how much one stroke takes away. A pen's eraser end erases with the Eraser's settings from any drawing tool, and the tool stays. There is no pressure: a stroke is the tip at the size you set.

A painted layer's bitmap is a PNG at the canvas's size, capped at 4096 pixels on the long side; a loaded image keeps its own format and size under the same cap. Where it lives follows the map image: with an image folder connected, each painted or loaded layer is a file in the folder named after the map and the layer (\`map-a3f2c1-layer-b7c9d2.png\`), rewritten by every stroke and by undo; without one, it embeds in the save file, with a warning past 1 MB when you load an image and a hard stop at 48 MB. Cancel on the map puts the folder back to what it held when the editor opened; Save leaves the files as they are. In **Layers**, **+ Add raster layer** makes an empty one, **Load image…** fills it with a PNG, JPEG, or WebP scaled to cover the canvas width (what runs past the bottom is clipped; a JPEG stays a JPEG unless the cap resizes it), and **Clear** empties it. The shape tools don't draw on a raster layer and the paint tools don't paint on a vector one; the hint says which layer to pick. Painted layers travel with the map into the HTML export and the downloads.

**Layers.** **Layers** in the strip opens the layer list, top of the stack first, one row per layer with its shape count (a raster layer shows "image", "empty", or "file missing" instead). Pick the active layer (new shapes and strokes go there; the strip's **Layer** select does the same, marking raster, hidden, and locked layers), rename it in place, **Hide** it (a hidden layer stays out of the HTML export and the downloads too), **Lock** it (nothing on it can be selected, drawn, or painted), move it up or down, delete it (asks when it has shapes or an image; undo brings it back; the last layer stays), or add one on top with **+ Add layer** or **+ Add raster layer**. Every map starts with one vector layer named Drawing. A hidden or locked active layer refuses to draw, and the hint says so rather than drawing somewhere else. A selected shape can be moved between vector layers from the strip when the map has more than one.

**Undo and redo.** **Undo** and **Redo** in the strip, or Ctrl+Z and Ctrl+Shift+Z (Ctrl+Y also redoes), step through the last fifty changes, one step per gesture: a drag of any length, a run of typing in one field, a run of arrow nudges, or one paint stroke undoes in one go. Pins and layer changes are included. Painted bitmaps are kept for undo up to 64 MB across the history, the oldest steps dropped first when they pass it; in folder mode undo rewrites the layer's file. The history belongs to the editing session and is gone once you Save or Cancel. The rest of Cartulary still has no undo.

**The view.** The canvas is a camera over the drawing. Ctrl+scroll (Cmd+scroll on a Mac) zooms about the pointer, a pinch does the same, the bar in the canvas's corner has − and + buttons, the zoom, and **Fit**, and the keys + and − zoom while 0 fits. The range is Fit (the whole canvas) to 8x, in steps of 1.25; nothing goes below Fit. To pan, use the **Pan** tool, hold Space and drag from any tool, drag with the middle button, or drag with two fingers; two fingers anywhere also pinch, and cancel whatever one finger was doing. The zoom and the keys wait while a stroke, a shape, or a drag is in progress. The grip at the canvas's bottom-right corner sets the box's width on the page, 25% to 150% of the column (past 100% it grows from the center; the bar says "NN% wide" when it isn't 100%); double-click it to snap back. The zoom lives inside the box, handles and pins keep their screen size at any zoom, and nothing here is stored: a map opens at Fit.

**Keys and pointers.** Letters select tools (above) when no field has focus. Otherwise:

- **Arrows** nudge the selected shape by a unit; **Shift+arrows** by ten.
- **Delete** or **Backspace** removes the selected shape; **Esc** discards a stroke or shape in progress, then clears the selection; **Enter** finishes a polygon or line.
- **Ctrl+Z**, **Ctrl+Shift+Z**, **Ctrl+Y**: undo and redo.
- **+**, **−**, **0**: zoom in, zoom out, fit. **Ctrl+scroll** zooms about the pointer. **Space** held turns any drag into a pan; so does the **middle button**.
- **Right-click**: finishes the shape in progress and goes to Select; in Select, goes to Pin. The browser's menu never opens on the canvas.
- **Pen**: draws, paints, selects, and drags like a mouse, without pressure; its eraser end erases.
- **Touch**: one finger does what the tool does (in Pan, it pans); two fingers pinch and pan from any tool and cancel the one-finger gesture they land on; a long press mid-stroke is not a right-click. In a map's view (not the editor), a finger's up-and-down swipe scrolls the page and a sideways drag pans the map.
- **Screen readers**: every swatch is named ("Fill: Water"), every tool button says its letter and what it does, and a live region names the tool and the selected shape ("Rectangle, 200 by 100"). The canvas itself is a drawing surface and can't be driven from the keyboard.` },

  { id: "map-stamps", title: "Stamps & Brushes", content: `A stamp is a symbol the map editor's **Stamp** tool places and sizes; a tintable stamp is also a tip the **Brush** paints with. Four symbols are built in (mountain, tree, settlement, compass rose) and two tips (Round, Soft round); everything else comes in through the **Stamps** panel at the top of the Cartographia index, or through **Import pack or brushes** inside the editor's stamp and tip pickers. Stamps are world data: they travel in the world's .json and are listed under JSON Save File Schema.

**The panel.** The Stamps panel lists every imported stamp grouped by pack, with a preview (a tip's tooltip gives its kind and pixel size), and offers **+ Import pack or brushes**, **Export built-ins as a pack** (a correct pack file with the four symbols, to start your own from), **Built-ins as PNG zip**, and on each pack **Export**, **PNG zip**, and **Delete pack**, with × on each stamp. Deleting asks first and, when the stamps are placed on maps, says how many placements will go missing.

**What imports.** One button reads them all; pick one file or several of one kind:

- A Cartulary pack, a .json holding svg symbols, PNG tips, or both (the format is below).
- PNG files, as a pack named Imported stamps (you can rename it in the report). A PNG with any transparency uses its alpha as the shape; a fully opaque one is read as a mask with black as ink. Any colored pixel makes it a color stamp, placed as it is; without one it is a tintable tip, drawn in the map's Fill color.
- A zip: every folder of PNGs inside becomes a pack named after the folder, and a Wonderdraft \`.wonderdraft_symbols\` file beside them supplies the names and whether each is tinted (\`custom_colors\`) or placed as is (\`normal\`). Every .abr, .brush, and .brushset inside is its own pack, and .gbr and .gih files make a pack per folder, so a brush set's download zip imports as it came.
- A Photoshop .abr: every sampled tip, with its name and spacing where the file records them. Versions 1, 2, and 6 read whole; 7 and 10 read where their layout matches. A computed brush has no bitmap and is skipped with a note, and a file with no sampled tip is refused with what it found.
- GIMP brushes: a .gbr is one tip, a .gih is one tip per cell. A color brush imports as a color stamp.
- Procreate .brush and .brushset files: each brush's Shape.png is the tip, read by brightness (white is the shape), and Grain.png is ignored; the name comes from the brush's own archive, else its folder, and a brushset is named from its plist.

Tips are scaled down to 1024 pixels on the long side (the report says when), capped at 4 MB each, and a pack holds at most 500 stamps. An import with nothing to report lands at once with a flash; otherwise a report shows first, with the pack's name (editable for brush and PNG imports), what will import and what it replaces, what changed, what was dropped and why, and Cancel; a zip of several packs steps through them with Skip. A brush or image file handed to World settings' Import .json is refused with a pointer back here.

**Tips and symbols.** An svg symbol takes the map's Fill and Stroke like any shape. A tintable tip (the pack file calls it \`alpha\`) is drawn in the Fill color, Ink when Fill is None, and is what the Brush paints with; a color stamp (\`color\`) is placed as it is and never paints. A raster stamp's placement box keeps the tip's proportions at 120 units on its long side; an svg symbol's is square. A used tip goes into a map's file once, however many times it is placed.

**The pickers.** **More…** in the strip opens every stamp in the world (or, for the Brush and Eraser, every tip), grouped by pack with the built-ins first: type to filter by name or pack name, with a count; a click arms the stamp (and swaps the selected stamp's symbol, which is also how a missing one is re-pointed); Escape clears the filter, then closes. **Import pack or brushes** at the bottom imports without leaving the editor.

**A pack file.** A pack looks like this:

\`\`\`
{
  "cartulary_mapstamp_pack": 1,
  "id":     "forest",                   // optional; lower-case letters, digits, underscore, dash. Defaults to a slug of the name
  "name":   "Forest",
  "stamps": [
    {                                   // an svg symbol
      "id":      "pine",                // required; same characters as the pack id
      "name":    "Pine",
      "viewBox": "0 0 64 64",           // the box the body is drawn in
      "body":    "<path d=\\"M32 4 L19 26 L45 26 Z\\" stroke-width=\\"3\\"/><path d=\\"M29 58 V63 H35 V58\\" fill=\\"none\\"/>"
    },
    {                                   // a raster tip
      "id":      "moss",
      "name":    "Moss",
      "kind":    "alpha",               // alpha: tinted by the map's Fill, and a Brush tip; color: placed as it is
      "image":   "data:image/png;base64,...",   // a PNG, at most 1024 pixels on the long side and 4 MB
      "width":   256,                   // pixels
      "height":  256,
      "spacing": 25                     // the gap between dabs when it paints, as a percentage of the size
    },
    ...
  ]
}
\`\`\`

The \`body\` is SVG inner markup. Parts with no \`fill\` or \`stroke\` of their own take the colors the map gives the stamp, so leave those off wherever the stamp should follow the palette, and put \`fill="none"\` on parts that must stay hollow. Line weight is the stamp's own and scales with it. A body holds at most 200 KB. A raster entry's \`image\` is decoded and re-encoded on import (any colored pixel makes it \`color\` whatever \`kind\` says) and only checked for its shape on load, never decoded there.

Only these elements survive import: \`g\`, \`path\`, \`circle\`, \`ellipse\`, \`rect\`, \`polygon\`, \`polyline\`, \`line\`. Only these attributes: \`d\`, \`points\`, \`cx\`, \`cy\`, \`r\`, \`rx\`, \`ry\`, \`x\`, \`y\`, \`x1\`, \`y1\`, \`x2\`, \`y2\`, \`width\`, \`height\`, \`fill\`, \`fill-rule\`, \`fill-opacity\`, \`stroke\`, \`stroke-width\`, \`stroke-linecap\`, \`stroke-linejoin\`, \`stroke-dasharray\`, \`stroke-opacity\`, \`stroke-miterlimit\`, \`opacity\`, \`transform\`; values are plain numbers, path data, transforms, and colors, never \`url(...)\`. Everything else (scripts, event handlers, \`style\`, \`href\`, text, images, \`use\`) is removed, on import and again whenever the world loads, and the import shows what it removed before anything lands. Stamp ids are namespaced by the pack (\`forest__pine\`; pack and stamp ids are at most forty characters each), so two packs can each have a \`tree\` and neither touches the built-in one; re-importing a pack replaces its own stamps in place, and every placed stamp keeps pointing at the right symbol. Deleting a stamp that is placed on a map leaves a dashed box in the editor, and the strip names the missing stamp, until a pack with it is imported again or another symbol is picked for it.

**Exports.** **Export** on a pack writes it back out as a \`.cartulary-stamps.json\` with its own ids, so a re-import replaces its own stamps. **PNG zip** writes it as PNGs in the Wonderdraft folder layout (\`<pack>/sprites/symbols/<pack>/\` with a \`.wonderdraft_symbols\` beside them), svg symbols rasterized at 512 pixels white on transparent, so the zip unpacks into Wonderdraft's assets folder and Inkarnate and Dungeondraft take the PNGs inside. The built-ins export both ways too.` },

  { id: "views-pages", title: "Views & Pages", content: `The sidebar Views section holds these entries (drag-reorderable except Home and Project):

- **Home** — this page
- **Project** — current world dashboard with stats and recent activity
- **Concordance** — force-directed graph of every reference, wiki-link, and map pin. Node positions persist across reload, export / re-import, and device transfer — drag to lay out a star map, faction diagram, or planar cosmology and the arrangement sticks.
- **Timeline; Vertical** — chronological list grouped by year and month
- **Timeline; Chronometric** — horizontal timeline with proportional duration. Multiple parallel lanes (one per template), era bands, span events showing how long things lasted. Drag to pan, Ctrl+scroll to zoom. **Edit mode** for in-place date editing; **PNG / SVG export** of the current viewport, with a small "Made with Cartulary" watermark.
- **Linea** — pedigree view (parents → children with junction descent for shared parents, spouses adjacent on the focal row). Sosa-Stradonitz layout for ancestors, lifespan dates on each node, configurable depth up and down. **Markdown export** of the focused person's tree from the Focal selector control panel.
- **Stemma** — radial mind-map view for tree-shaped content that doesn't fit into a single entry: plot threads, theme webs, organizational hierarchies, decision branches. Freeform or entry-linked nodes; click any child to drill in. Each stemma is a portable document, with single-file JSON import/export.
- **Kalendarium** — the bound collection of calendars. Edit primary and additional calendars side by side, pin a calendar to drive the comparison strip, set the world's current moment for auto-age on living characters.
- **Cartographia** — the bound collection of maps. Indexes every map in the world, with the world's stamps and brushes above the list. Click a map to open it (canvas, drawing and painted layers, pins, time-mode chronicle filtering); use + New Map to create one.
- **Ephemeris** — the celestial-mechanics view. Define a world's stars, planets, and moons, compute their positions on any date, search for alignments, and turn sky events into entries. See Ephemeris.
- **Glossopoeia** — the constructed-language view. Eleven workspaces per language covering phonology, grammar, the dictionary, the writing system, and glossed texts. See Glossopoeia.

Home and Project stay anchored at the top of the list. Everything else can be dragged into any order you prefer. View order is a personal preference and doesn't travel with exported worlds.` },

  { id: "linea", title: "Linea", content: `Linea (formerly known as Family Tree) builds itself from entry-ref fields whose family-role dropdown is set to **Parent of this** or **Spouse of this** in the template editor. The default Character template ships with Father, Mother, and Spouse pre-configured.

**Navigating the canvas.** Click a node to refocus the tree on that person; **Shift+click** opens that entry instead. Scroll to zoom (or use the **+ / − / ⊙** buttons in the corner), and drag empty space to pan. In a world with more than one calendar, a calendar selector at the top sets which reckoning the node lifespan dates read in.

When you set a Father / Mother / Spouse on a Character, you can type an **override label** next to the picker — "Adoptive Father", "Stepmother", "Estranged Wife", etc. The override appears in entry chips and per-entry markdown export. Linea itself doesn't print the override on the canvas (the geometry communicates the relationship — see Layout below).

Spouse rows on Character templates include a **status** dropdown — Active / Former / Estranged — and two optional date pickers, **Married** and **Ended**. Status and dates surface in the entry view, in markdown export, and feed the Marriages lane on the Chronometric timeline.

The Status field on Character (Living / Deceased / Unknown) drives the deceased indicator. Setting Status to "Deceased" dims the node, italicizes the name, and prefixes ✝. "Living" and "Unknown" both render as normal — only "Deceased" triggers the marker. The deceased indicator is independent of relationship status: a deceased spouse can also be marked Former, Estranged, etc., and both render simultaneously.

**Auto-reciprocity.** When you declare A's Spouse as B and save, B automatically gets a matching declaration of A — same status and dates, your override label is *not* mirrored (since each side's label is speaker-relative). Same goes for changes: editing dates or status on one side propagates to the other on save. Removing a spouse on one side removes the partner's declaration too. The "both was and wasn't married during 1746" failure mode can't happen — the data can't disagree across the pair, because save-time reconciliation guarantees they match.

**Layout.** Ancestors stack above the focal person using Sosa-Stradonitz (also called *ahnentafel*) positioning: each generation has slots that double in count as you go up, so a paternal grandparent sits above and to the left of the father, a maternal grandparent above and to the right of the mother, and so on. The focal person is centered between ancestor and descendant rows. The "father" / "mother" sides are determined by parent labels — if a parent's label includes "Father" or "Mother" they take the corresponding side; otherwise sides are assigned alphabetically by the parent entry's ID, which is deterministic but arbitrary. Add explicit Father / Mother labels to your entries if you want to control which side they land on.

Descendants are positioned below their parents. When a child has two or more visible parents, the descent line branches from a junction between the parent row and the child row — each parent drops to a shared horizontal at the junction, runs across to the parents' midpoint, and a single line continues down to a "siblings bar" just above the child row, then branches into each child. This mirrors the visual convention used by genealogy tools (Ancestry, MyHeritage, etc.) and reads more naturally than per-parent independent lines. Single-parent cases use a simple L-line.

Spouses sit adjacent to the focal on the same row. There's no explicit line between them — when they share children, the parent-grouping descent makes the pairing visually obvious; childless spouses appear as adjacent floating nodes.

**Node text.** The big line on each node is the entry's name. Long names truncate by measured width and append "…"; hover any node to see the full name in a browser tooltip. The smaller italic line below the name shows lifespan dates, pulled from the first calendar-date-range field on the entry's template:

- \`1903–2003\` when both ends are set
- \`1980–Living\` when there's no end and the entry isn't marked Deceased
- \`1980–?\` when marked Deceased without a death year
- \`~1742–1751\` when either end is approximate (the \`~\` prepends per end independently)

Entries without a lifespan field, or with the field empty, fall back to showing the template name in that slot.

**Depth controls.** The focal toolbar has two number inputs — **Generations up** and **Generations down** — each clamped 1–10, default 5. Walks deeper than 5 in either direction can produce wide trees (a fully-populated 10-gen ancestor tree allocates 1024 theoretical Sosa slots), but the option's there if your data goes that deep.

If an entry has more than two parents (e.g. biological + adoptive), the third and later parents are placed in their generation row beside the Sosa-positioned ones rather than dropped from the chart.` },

  { id: "stemma", title: "Stemma", content: `Stemma is a radial mind-map view for tree-shaped content that doesn't fit cleanly into a single entry: plot threads, theme webs, organizational hierarchies, decision branches, classification systems. Each stemma is its own document in your world, listed on the Stemmas index page when you click **Stemma** in the sidebar.

A stemma has one **focal node** at the center, surrounded by 16 fixed slots arranged clockwise from 12 o'clock. Each slot can hold a child node or stay empty. Click a child to **drill in** — that child becomes the new focal, with its own children radiating around it. The breadcrumb at the top of the canvas shows the ancestor path; click any segment to jump back up, or use **Back to root** to return to the top of the tree. The stemma's own name (top-left of the canvas, just right of **← Stemmas**) is click-to-edit.

**Drillable indicator.** Children that have their own children show a small line radiating outward from the node — visual cue that clicking will drill in to a non-empty subtree. Children without descendants render plain. Doesn't change interaction; clicking the node itself remains the way to drill in.

**Zoom.** Ctrl+scroll (or Cmd+scroll on Mac) over the canvas zooms in or out, range 0.5×–2.5×. Plain scroll pans the visible area when you're zoomed in past 1.0× and the content overflows the pane. Mirrors the Chronometric timeline's zoom pattern; mouse-only, no keyboard shortcut.

**Two node kinds.** *Freeform* nodes have an editable label, color, and icon — useful for ad-hoc concepts that don't have an entry to anchor to ("Act II climax", "morality theme", "the missing letter"). *Linked* nodes bind to an existing entry and pull their display from that entry's template (the template's icon and color appear on the node), with a small chain badge ⛓ marking them. The label shows the entry's *current* name — rename the entry and the node updates automatically.

**Adding nodes.** Empty slots show a faint **+** button. Click it for a smart input: type a name, and matching entries from your world appear as suggestions below the input. Pick a suggestion (mouse or arrow keys + Enter) to create a linked node; ignore the suggestions and press Enter alone to create a freeform node with the typed text as its label. Esc cancels.

**Inspector.** Click any node to open the right-side inspector. For freeform nodes you can edit the label, color, and icon. For linked nodes you get a preview card and a jump-to-entry link. Any node can be **converted** between freeform and linked from the inspector footer; converting linked → freeform promotes the cached entry name to the new freeform label so nothing is lost. The inspector footer also carries a **Delete node** button on any non-root node; it removes that node and its whole subtree, with a confirmation when the node has children. The root node can be edited like any other but cannot be individually deleted — to remove an entire stemma, use **Delete** on its row in the Stemmas index page.

**Orphans.** If a linked node's entry is later deleted, the node becomes an **orphan**: desaturated fill, italic label, broken-link icon. The cached name from when the link was first created is shown so you remember what it was. Use the inspector to **re-link** the node to a different entry, or **convert to freeform** with the cached name as the new label.

**Import / export.** Each stemma exports as a single \`.stemma.json\` file via the **Export** button on the canvas top bar (right side) or the per-row Export button on the index page. Import via the **Import** button on the index. On import: every node id is regenerated to avoid colliding with existing data, name collisions prompt a Skip / Replace / Rename modal, and linked nodes whose entry IDs don't exist in the destination world land as orphans (you'll get a count in the import flash). Cross-world transfers use strict entry-ID matching only — there's no fuzzy name matching, so linked nodes usually need manual re-linking after a cross-world import.

**What's not in v1:**

- **Sibling reordering** — slot is fixed at the moment of creation; no drag-between-slots
- **Maximum depth cap** — deep trees just keep working, no enforced ceiling
- **Undo / redo**: Stemma has none (the map editor has its own)
- **Markdown export** — JSON only for now
- **World-tag pool integration** — stemma tags display on the index but don't auto-merge into the world's tag autocomplete
- **Mobile UX** — desktop-first; the radial canvas isn't tuned for narrow viewports yet` },

  { id: "concordance", title: "Concordance", content: `Concordance (formerly known as the Relationships graph) renders every entry as a node and every cross-reference as an edge. It's force-directed — nodes find their own positions based on connection density, with related entries clustering together — but those positions stick. Drag nodes around to lay out a star map, a faction-power diagram, a planar cosmology, anything where spatial arrangement encodes meaning.

**What feeds the graph:**

- **Entry-ref fields**, including those with relation kinds (parent, spouse). Family-role refs are drawn the same as any other ref, just with the override label if you've set one.
- **Wiki-links** in long-text fields. Every \`[[Name]]\` becomes an edge from the entry containing the link to the entry it resolves to.
- **Map pins** that link to other entries. The map entry connects to whatever its pins point at.
- **Grid cells** that are entry references. Each ref cell becomes a directed edge labeled by the grid field.
- **Repeating Group subfields.** The graph walks into every group instance, so entry-ref subfields (and wiki-links in text subfields) inside a repeating group feed edges the same as top-level fields.

**Templates filter.** The right-side panel has a Templates section with one checkbox per template, plus all/none links at the top. Untick a template to hide its entries (and any edges that touched them) from the graph. The selection is per-session — refresh the page and all templates are visible again. **Filter changes preserve positions** — toggling templates on and off doesn't reset the layout you've built. Hidden nodes simply don't render; their saved positions wait. Zoom level and viewport position also persist across filter toggles within a session.

**Focus mode.** Type an entry name into the Focus combobox at the top of the side panel. Once it matches an existing entry exactly (the field autocompletes from your world, suggesting only entries from currently-visible templates), the graph collapses to just that entry's neighborhood. The **Hops** number input next to the matched name picks how far out to walk: 1 hop = direct connections only; 2 hops = friends-of-friends; higher values widen the included subgraph. Caps at 15, but in practice anything past 3-4 in a connected world tends to include nearly everything. Click **clear** to return to the full graph.

Focus mode treats links as undirected — a hop from A to B counts the same whether the reference points A→B or B→A. If the focused entry is hidden by the Templates filter, the graph falls back to "show everything" so you don't end up staring at an empty canvas.

**Hover and click.** Hovering a node highlights it and dims unrelated nodes. Clicking a node opens that entry. Edges aren't clickable.

**Edge labels.** Where an edge has a meaningful label (the field name driving the connection — Father, Mother, Affiliations, Members, etc.), the label rotates to follow the line and sits on the visually-upper side, staying right-side-up regardless of which direction the line angles. When two entries have multiple relationships in the same direction, those labels concatenate with \` // \` into a single edge ("Members // Council Members"). When a relationship is reciprocal across the same node pair (each side declaring the other), each direction gets its own label and they offset toward their respective target nodes so they don't collide at the midpoint. Long labels truncate with "…" if they don't fit. Labels for **Description** and **Notes** fields are suppressed — those wiki-link sources don't carry useful relationship semantics, just noise.

**Node positions persist.** Drag a node to a position and it stays — through reload, export / re-import, and device transfer. Layouts you build become part of your world file. Use the dragging freedom for star maps, faction-power diagrams, planar cosmologies, anything where spatial arrangement carries meaning beyond where the force algorithm happened to converge.

New entries — ones you haven't dragged yet — auto-place via single-pass force layout around the pinned majority when they first appear. After their first render, their settled positions get saved too. You don't have to lay out every new arrival; the simulation handles new entries while preserving everything you've built.

Positions for deleted entries get stripped on load (defensive validation), so a delete-then-export cycle doesn't carry stale position data.

**Performance note.** A few thousand entries with dense cross-references is where the initial layout simulation starts to feel slow on first render. Once positions are saved, subsequent loads restore the arrangement without re-cooking. The Templates filter and focus mode also help — narrow the scope and the layout converges faster on new entries.` },

  { id: "search", title: "Search", content: `The search input at the top of the entry list filters as you type. It looks at:

- **Entry name** — case-insensitive substring
- **Tags** — case-insensitive substring
- **Field content** — anything inside any field on the entry, including text fields, long-text (markdown) fields, tag fields, dropdown values, and so on

Search interacts with the active filters. If you've selected a template or tag in the sidebar, search filters within that scope. To search across the whole world, deselect the active filter first by clicking it again.

**Useful patterns:**

- Search for **\`[[Aria]]\`** to find every entry that wiki-links to Aria. The search treats markdown literally, so the brackets are part of the query.
- Search for a tag value to find every entry with that tag without using the tag filter — useful when you want results across multiple tags.

**What search doesn't cover:**

- **Template definitions** (template names, field labels). Search operates on entries, not on the templates that describe them.
- **Map pin labels.** These live on \`mapData\`, not in fields.
- **Wiki-link resolution.** A search for "the warden" finds entries containing the literal text "the warden" — it doesn't follow custom-label syntax like \`[[Aria|the warden]]\` to also return Aria's entry.
- **Former-name resolution.** A search for "New Amsterdam" finds entries with that text in any field (including name-history rows), but doesn't apply the temporal "this entity used to be called X" mapping that the rest of the application uses.

There's no advanced query syntax, no regex, no field-specific search. If you need more complex queries, export to JSON and use a script.` },

  { id: "wiki-links", title: "Wiki-Links", content: `Inside any text or long-text field, type \`[[Entry Name]]\` to link to another entry. Autocomplete suggests entries as you type. Supports custom labels:

- \`[[Aria]]\` — link displays as "Aria"
- \`[[Aria|the warden]]\` — link displays as "the warden"

These render as clickable chips in the entry view, and they feed the Concordance.

**Duplicate names.** Cartulary doesn't block you from creating two entries with the same name, but it warns you on save. Wiki-links resolve to whichever entry sorts first by storage order (earliest-created), so subsequent same-named entries become unreachable by \`[[Name]]\` syntax. Either rename or use a unique disambiguator like \`[[Aria (Eastwatch)]]\` if you need both.` },

  { id: "editor-shortcuts", title: "Editor Shortcuts", content: `Long-text fields use a markdown editor with a small toolbar and a few keyboard shortcuts.

**Toolbar buttons:**

- **B** — wrap selection in \`**\` for bold
- **I** — wrap selection in \`*\` for italic
- **↗** — insert \`[text](url)\` for an external link
- **[[ ]]** — insert empty wiki-link brackets and place the cursor between them, ready for the autocomplete

**Keyboard shortcuts (focus must be in a long-text field):**

- **Ctrl+B** — bold (same as toolbar B)
- **Ctrl+I** — italic (same as toolbar I)
- **Ctrl+K** — insert external-link template (same as toolbar ↗)

**Wiki-link autocomplete navigation:**

- Type \`[[\` and the popup appears with suggestions
- **↑ / ↓** — move through suggestions
- **Enter** or **Tab** — accept the highlighted suggestion
- **Escape** — dismiss the popup without accepting

There are no shortcuts for headings, lists, code blocks, or other markdown constructs — type the markdown directly. There's no rich preview while editing; switch to view mode to see rendered output.` },

  { id: "tags", title: "Tags", content: `Tags are cross-cutting categories that span templates. A "warden" tag could appear on Characters, Locations, and Plot Threads alike. They're stored per-entry and shown in the sidebar grouped by frequency.

**Adding tags.** Open any entry. The tag input sits at the top of the editor, right under the entry name. Type tags separated by commas — they auto-tokenize as chips. Existing tags in the world autocomplete as you type.

**Browsing by tag.** The sidebar has a Tags section listing every tag in the world. Clicking any tag opens a filtered view of entries with that tag, across all templates.

**Renaming or deleting.** There's no separate tag management screen. To rename a tag globally, you'll need to edit each entry that uses it. To delete a tag, remove it from every entry. This is a known gap — bulk tag operations are deferred work.

**Case sensitivity.** Tags are case-sensitive as stored. "Warden" and "warden" are two different tags. Be consistent when you create them.` },

  { id: "reordering", title: "Reordering Templates & Fields", content: `**Templates**: Hover any template in the sidebar to see a drag handle (⋮⋮) on the left. Drag to reorder. Click anywhere else on the row navigates to that template's entry list.

**Fields**: When editing a template, each field row has a drag handle on the left. Drag to reorder. Backfilled fields from app updates land at the bottom — use the handle to move them where they belong.

**Calendar months**: same drag pattern. Click your world's name at the top-left of the sidebar to open settings, then go to the Calendar section.

**Views**: the four reorderable views (Linea, Concordance, Timeline; Vertical, Timeline; Chronometric) can be dragged. Home and Project stay anchored at the top. View order is stored as a personal preference and doesn't travel with exported worlds.

Drag-and-drop is mouse-only — there's no keyboard equivalent for reorder operations. See Accessibility for details.` },

  { id: "secrets-lock", title: "Secrets & Lock Mode", content: `Mark any field "secret" in the template builder. Secret fields hide unless the **secrets visibility toggle** in the top right is on — a small dot icon (◎ when off, ◉ when on; tooltip reads "Show secret fields" / "Hide secret fields"). Useful for spoilers and player-hidden info inside the same entries as public content.

The default Plot Thread template ships with a "Hidden Truth" secret field for plot info hidden from players.

**Lock Mode** hides edit surfaces. Click your world's name at the top-left of the sidebar to open settings, then enable the Lock toggle:

- Edit / Delete / + New buttons disappear on entries, templates, and the sidebar
- The Calendar editor in Settings is replaced with a read-only summary (because reordering or deleting months can corrupt existing in-world dates)
- The Lock toggle itself requires a confirmation to unlock, so a misclick won't drop you out of view-only mode

What stays editable while locked: World name, World description, Appearance preferences (theme, font size), Image folder connection. None of these can damage entry data.

**What Cartulary does NOT protect against:** both Lock Mode and the secrets visibility toggle are UI conveniences, not security. They protect against accidental edits and accidental spoilers, not against motivated users.

- Lock Mode is friction, not a barrier. Anyone with the .html file can unlock it (one confirm), and anyone editing the .json directly bypasses it entirely.
- Secret fields are hidden in the UI but written in plain text in the JSON file. Anyone with the .json can read them.
- Cartulary does not encrypt anything. There is no password protection anywhere in the app.

If you need actual confidentiality (real read-only sharing, encrypted storage, password gates), Cartulary won't give you that. Use the Markdown export with secrets excluded for genuine read-only sharing — there's no editing surface and no secret fields to expose.` },

  { id: "images", title: "Images", content: `Two ways to attach images:

1. **Folder mode** — connect a local folder once, type filenames into image fields. Files stay on disk, the world JSON stays small.
2. **Inline mode** — images embed as base64 inside the world JSON. Simpler, but the file size balloons quickly: a world that would otherwise be 200KB of JSON can easily reach 50MB once you add a few dozen full-resolution images.

Folder mode requires the File System Access API, which not all browsers expose by default — see Browser Compatibility for the per-browser breakdown. Cartulary detects what your browser supports automatically; if folder mode isn't available, image fields fall back to inline mode without you needing to do anything.

A map's painted or loaded layers follow the same two modes: in folder mode each layer's bitmap is a PNG in the image folder named after the map and the layer, rewritten as you paint; inline, it embeds in the save file. See Map Editor, Painting.` },

  // ─── Workflows ───────────────────────────────────────────────────────────────
  { id: "backup-strategy", band: "Workflows", title: "Back Up Your World", content: `Auto-save protects you from accidental data loss within Cartulary — both committed entries and in-progress drafts persist across tab close and refresh. It does **not** protect you from browser-level data loss.

Cartulary's working data lives in your browser's IndexedDB storage. That storage can be wiped by:

- Clearing browser cache or "site data"
- Browser profile corruption or reinstall
- Switching browsers entirely
- Some privacy extensions or settings (Brave's "shields" or Firefox's strict tracking protection in some configurations)
- Running Cartulary in private/incognito mode (the data is discarded when you close the window)

**Version history (in-browser recovery).** Settings → Version History keeps a rolling history of recent changes so you can step back without leaving Cartulary.

- **Automatic snapshots** are taken after editing pauses, throttled to one every 5 minutes. The last 10 are kept; older ones get evicted FIFO.
- **Manual restore points** (the **Create restore point** button) are pinned and never auto-evicted. Useful before a risky operation — template restructure, large delete, calendar reordering. You can label them, e.g. "Before deity rename pass."
- Each row offers **Restore** (replaces the current world after confirmation), **Export** (downloads that snapshot as a standalone .json), and **Delete**.

Version history is in-session safety. It does **not** protect against IndexedDB loss — the snapshots live in the same IndexedDB as your active world, so anything that wipes that storage takes the history with it. Treat .json export as your real backup.

**What to do:** export your world to .json regularly. Treat the JSON file as your real save. The IndexedDB version is a working copy. (See Save & Share — Markdown exports do not round-trip; only JSON can be re-imported.)

A reasonable cadence:

- After any significant editing session, export and save the .json somewhere outside the browser
- Keep multiple dated copies (\`myworld-2026-04-01.json\`, etc.) so you can recover from accidental corruption or a bad change
- Store backups outside your browser's control: a folder on disk, a cloud drive, a thumb drive, your NAS

Cartulary prompts you to back up after two hours of unsaved changes — a banner appears at the top of the app with Export and Snooze 1h buttons. The reminder anchors on JSON exports specifically (Markdown and Markdown ZIP don't count, because they can't be re-imported). You can turn the reminder off entirely if you have your own backup workflow. Click your world's name at the top-left of the sidebar to open settings, then go to the Reminders section.

Especially back up before:

- Importing another world (which replaces the current one)
- Resetting templates to default
- Major structural changes (deleting templates, mass-editing entries)

If your IndexedDB ever gets wiped, your .json backup is the only way to get your world back.` },

  { id: "sharing-players", title: "Sharing With Players", content: `Game masters often want to give players access to world information without the ability to edit. A few patterns:

**Locked-world handout.** Export the .json, then on a copy of the .html file, import that .json and turn on Lock Mode. Players can browse all your worldbuilding but won't see edit controls. Caveat: Lock Mode is friction, not security. The toggle is two clicks away. Any player who decides to edit, can. (See Secrets & Lock Mode for the full caveat list.)

**Markdown handout.** Export to .md (without secrets). Send the player the file. They get a readable reference of the public information with no editing surface at all. Best option for genuinely read-only sharing.

**Markdown + images zip.** Same as above but with maps, portraits, and location art included.

**Split-world approach.** For long campaigns, some GMs maintain two worlds: the GM master world with secrets and the player-facing world with only what players know. Update both as the campaign progresses. More work, but the player's copy literally doesn't contain the GM's secrets — there's nothing to leak.

For interactive browsing, use locked-world handouts and trust that your players won't flip the toggle. For genuine read-only sharing, use Markdown export.

For switching between multiple worlds yourself rather than sharing, see Working With Multiple Worlds.` },

  { id: "import-strategies", title: "Importing From Other Tools", content: `Cartulary doesn't have direct import from any other worldbuilding tool. There are no WorldAnvil, Notion, Obsidian, or Google Docs importers. The only import format is Cartulary's own JSON.

That said, importing manually is straightforward because long-text fields support **standard Markdown.** Most worldbuilding tools either export Markdown or can have their content copy-pasted as Markdown. The workflow:

1. Decide which Cartulary template fits the source content (or create a custom one)
2. Create a new entry
3. Copy text from the source tool into the appropriate fields

For tools that export bulk Markdown files (Obsidian vaults, for example), there's no automated workflow. For very large existing worlds, this is a time investment. Two ways to make it more bearable:

- **Selective port.** Bring over the entries you actually need for your current project. Decide deliberately rather than trying to bring everything.
- **Direct JSON construction.** If you can write a script, you can construct Cartulary JSON programmatically. See JSON Save File Schema for the documented structure — top-level shape, field types, value formats, ID conventions, validation rules, and a minimal worked example.

Building importers for every other tool is unsustainable; they break when the source tool changes its export format. Markdown copy-paste is a stable lowest-common-denominator that handles most cases.` },

  { id: "multi-world", title: "Working With Multiple Worlds", content: `Cartulary holds one world per browser at a time. The IndexedDB stores a single active world. To work with multiple worlds, you'll be exporting and importing JSON files.

**One world per browser profile.** If you use Chrome profiles (or Firefox containers), each profile maintains its own IndexedDB. One profile holds your campaign world, another holds your novel world. Switch profiles to switch worlds. More setup overhead, but reliable separation.

**Export-import workflow.** For light multi-world use, keep .json files for each world somewhere organized. Click your world's name at the top-left of the sidebar to open settings, then use Export .json for the current world and Import .json for the other. Takes about ten seconds.

**Multiple Cartulary copies under different filenames.** Save the .html file as \`cartulary-campaign.html\`, \`cartulary-novel.html\`, etc. Whether each gets its own IndexedDB depends on the browser: when opened from \`file://\`, some browsers treat each path as a separate origin (separate storage), others lump them together. Behavior is browser-dependent. Don't rely on it without testing your specific browser. The safer assumption is shared storage; combine with browser profiles for guaranteed separation.

There's no tab-style world switcher. Cartulary is one-world-at-a-time. Multi-world support would change the architecture significantly and isn't planned.

For sharing a world with someone else rather than switching worlds yourself, see Sharing With Players or On Collaboration.` },

  { id: "example-template", title: "Example Template", content: `Custom templates handle workflows the built-in set doesn't cover directly. Here's one fully worked example to model your own from.

**D&D 5e statblock template.**

Create a new template called "Statblock (5e)" with these fields:

- *Name* — Short Text
- *Linked Creature* — Entry Reference (multi: false), refTemplate: Creature
- *Size* — Dropdown: Tiny / Small / Medium / Large / Huge / Gargantuan
- *Type* — Short Text (e.g. "humanoid (elf)")
- *Alignment* — Short Text
- *Armor Class* — Number
- *Hit Points* — Short Text (lets you write "78 (12d8 + 24)")
- *Speed* — Short Text
- *STR / DEX / CON / INT / WIS / CHA* — six Number fields
- *STR Mod / DEX Mod / CON Mod / INT Mod / WIS Mod / CHA Mod* — six Number fields (e.g. STR 8 → −1, STR 16 → +3)
- *Saving Throws* — Short Text
- *Skills* — Short Text
- *Damage Resistances / Immunities / Vulnerabilities* — three Short Text fields
- *Senses* — Short Text
- *Languages* — Short Text
- *Challenge Rating* — Short Text (lets you write "5 (1,800 XP)")
- *Traits* — Long Text (Markdown, list one per paragraph)
- *Actions* — Long Text
- *Reactions* — Long Text
- *Legendary Actions* — Long Text
- *Source / Page* — Short Text

Each Statblock entry pairs with a Creature or Character entry via the Linked Creature field — narrative info on the Creature, mechanical info on the Statblock. Different game systems get their own templates with their own field shapes.

The general principle: if you're entering the same kind of structured data into Notes fields repeatedly across multiple entries, that's the cue to template it. Fields you'd want to filter, sort, or display consistently are good candidates. Fields you only ever read as flowing prose belong in Long Text instead.` },

  // ─── Limitations & Architecture ──────────────────────────────────────────────
  { id: "scaling", band: "Limitations & Architecture", title: "How Big Can My World Get?", content: `Practical scaling expectations for a single author working on one world. These are estimates from light testing rather than formal benchmarks — your machine, browser, and content shape will affect the numbers.

**A few hundred entries** — no performance issues anywhere.

**A thousand or so entries** — generally fine. Lists scroll smoothly, search is fast, all views render quickly.

**A few thousand entries** — most operations stay smooth. Some views (Concordance, Chronometric timeline at full zoom-out) may slow down with many simultaneous events. Tag and template filters help.

**Tens of thousands of entries** — past the point of routine testing. The browser will handle it but performance varies by view. List views and entry editing remain fine. Visualization views may need filtering.

**Image storage matters.** Inline (base64) images inflate the JSON file and the IndexedDB record substantially. A world with text-only entries might be 200KB of JSON; the same world with a few dozen full-resolution images can easily reach 50MB. Folder mode keeps images on disk and the JSON tiny — strongly recommended for image-heavy worlds.

**Painted map layers weigh more than shapes.** A painted layer is a PNG at the canvas's size, up to 4096 pixels on the long side (a loaded image keeps its own size under the same cap); inline, each one embeds in the save file (a warning past 1 MB on load, a hard stop at 48 MB per layer), and the editor keeps up to 64 MB of them for undo while a map is open. Folder mode keeps them as files beside your images, which is the right place for a map with more than a layer or two of paint.

**JSON file size.** No ceiling imposed by Cartulary, but most browsers struggle to load .json files over 100MB through the import interface.

**Architectural costs at scale:**

- *Auto-save serializes the world JSON shortly after each edit (debounced).* For very large worlds, this introduces noticeable save latency. The save model is simple at the cost of fine-grained efficiency.
- *Initial page load transforms JSX in the browser.* For very large worlds, this contributes to first-load time. Inlining (deferred work) will replace this with pre-compiled JS.

Cartulary is single-user (see On Collaboration). The numbers above assume one author; concurrent multi-user editing isn't supported in this tool.` },

  { id: "collaboration", title: "On Collaboration", content: `Cartulary is single-user.

Two people can't edit the same world simultaneously. There is no merge resolution, no real-time sync, no comments-and-suggestions workflow. If you and a co-creator both edit the same world's JSON file at the same time, whoever saves last wins — the other person's changes are gone.

What works for collaboration with this constraint:

- **Sequential editing.** One person works on the world at a time. Pass the .json file back and forth like an old-school document. Slow, but no risk of conflicting edits. (Same mechanic as the export-import workflow described in Working With Multiple Worlds.)
- **Read-only sharing.** Locked .html or Markdown export. See Sharing With Players for the patterns.
- **Domain partitioning.** Each collaborator works on their own world file covering their area, then references each other's exports. Brittle, but it works for very loose collaboration.

If you need real-time collaboration with multiple editors, use a cloud-based tool. WorldAnvil, Kanka, and Notion all support this in different ways. Cartulary's single-file portability is fundamentally incompatible with multi-user editing.` },

  { id: "accessibility", title: "Accessibility", content: `An honest read on where Cartulary is and isn't usable for users with accessibility needs.

**What's missing or unverified:**

- **Screen reader compatibility has not been audited.** Semantic HTML is used throughout, headings are nested correctly, form labels are associated with inputs, and aria-label attributes exist on icon-only buttons — all of which give screen readers a reasonable starting point. But this hasn't been tested with NVDA, JAWS, or VoiceOver. Don't assume it works until someone tries.
- **Drag-and-drop reorder is mouse-only.** Templates, fields, calendar months, and the four reorderable views all reorder via mouse drag. There is no keyboard equivalent. This is a regression from the previous ↑↓ button system — the change made the UI better for mouse users at the cost of keyboard users. If keyboard reorder matters to you, reorder operations are currently inaccessible.
- **Chronometric and Stemma pan/zoom are mouse-only.** Both views use Ctrl+scroll (or Cmd+scroll on Mac) for zoom; Chronometric also uses drag-to-pan. No keyboard equivalents.
- **A map's drawing needs a pointer.** The map editor's canvas takes a mouse, a pen, or a finger; a shape, a paint stroke, or a pin can't be placed from the keyboard, and the canvas isn't navigable by a screen reader. The controls around it are (see below).
- **Contrast ratios are eyeballed, not measured.** The High Contrast theme is intended to be high-contrast — bright white text on near-black, bright yellow accents — but no formal WCAG audit has been done. If you need verified WCAG AA or AAA compliance, you'll need to measure it yourself.

**What does work:**

- **High Contrast theme.** Click your world's name at the top-left of the sidebar to open settings, then go to Appearance → Theme. Switches from the default warm-dark scholarly palette to a high-contrast palette designed for low-vision users and bright-environment readability.
- **Font size scaling.** Same Appearance section of settings, Font Size control. Four levels: Small, Medium, Large, Extra Large. Scales the entire UI proportionally.
- **Keyboard navigation** for most operations: Tab moves focus, Enter activates, Escape closes modals. Form fields are reachable.
- **The map editor from the keyboard.** One letter per tool (each tool button's tooltip shows it), the arrow keys nudge the selected shape, + − 0 zoom and fit, Space turns a drag into a pan, Ctrl+Z undoes, every color swatch carries its name ("Fill: Water"), and a live region names the tool and the selected shape for a screen reader. See Map Editor, Keys and pointers.
- **No animation or motion-heavy effects.** Transitions are subtle. Should be comfortable for users with vestibular sensitivities.

If you have accessibility needs Cartulary doesn't currently meet, the source file is human-readable and modifiable — that's a fact about the architecture rather than a recommended path. Real fixes belong in the upstream tool, not in user forks.` },

  { id: "browser-support", title: "Browser Compatibility", content: `Cartulary works in any modern browser — Chrome, Firefox, Edge, Safari, Brave, Opera, Vivaldi, Arc. There's no installer, no service worker requirement, no special browser configuration needed.

A few features have browser-specific behavior:

**Folder-mode images** require the File System Access API. Whether a browser exposes this API depends on the vendor's choice, not just whether the browser is Chromium-based:

- **Enabled by default**: Chrome, Edge, Opera, Vivaldi, Arc
- **Disabled by default, opt-in via flag**: Brave (set \`brave://flags/#file-system-access-api\` to "Enabled" and restart)
- **Not supported**: Firefox, Safari

On any browser without the API, image fields automatically fall back to inline base64 mode. Same functionality, different storage approach.

Cartulary doesn't hardcode browser names — it checks at runtime whether \`window.showDirectoryPicker\` exists. Less common browsers work correctly based on what they actually expose.

**Icon rendering.** A modern CSS rule keeps icons monochrome on browsers that support it. On older browsers, some icons may render as colored emoji glyphs. Functionality is unaffected.

**Drag-and-drop reorder** is mouse-only. It doesn't work reliably on touch devices regardless of any other setting.

**Template Preview popup** opens a separate browser window via \`window.open\`. Tested in Chrome, Edge, Firefox, and Brave; Safari is currently untested — please report any issues if you use it. Browsers with aggressive popup blockers (or Brave with Shields cranked beyond defaults) may block the popup; allow popups for the page if the toggle button doesn't open a window. Everything else in Cartulary works without the popup; this only affects live template-design preview.

**Mobile.** Cartulary loads on phones and tablets, but the UI is desktop-shaped. On most mobile browsers you'll need to enable desktop-site mode (sometimes called "request desktop site") for menus and controls to behave correctly — and even then, expect a degraded experience compared to a real keyboard and mouse. This is desktop-first by design; mobile is not the target audience.

**IndexedDB** and **JSZip** (Markdown + images export) are universal across modern browsers.

If you're using a browser that's more than two years old, things may break in subtle ways. Stay current.` },

  { id: "offline-use", title: "Offline Use", content: `Cartulary's interactivity is fully local — no network calls, ever. The page contains every dependency it needs (React, Babel, marked, d3, JSZip, fonts) inlined directly into the .html file. Once you have the file, you have everything.

This means:

- First load works offline as long as you've already downloaded the file
- Cache eviction doesn't matter — there's nothing to cache from a server
- Private/incognito mode works fine
- Switching browsers works fine
- The file is fully self-contained at roughly 4MB

Save cartulary.html anywhere — desktop, USB drive, NAS, whatever. Open it in any modern browser. It works. No internet required at any point after the initial download.` },

  { id: "your-data", title: "Your Data, Your File", content: `Cartulary stores everything locally. Your world data lives in your browser's IndexedDB and in any .json files you've exported. There is no Cartulary backend, no account system, and no telemetry built into the application.

After the page loads, no network traffic is generated by Cartulary itself. Your worlds, edits, and exports stay on your machine.

What this means in practice:

- Your world data lives where you keep it: your browser's IndexedDB, your .json export files, and nowhere else
- Nothing about your world content is transmitted anywhere unless you explicitly send it (email, share, upload)
- No account to lock you out, no service that can shut down and lose your data
- No subscription, no terms of service that can change retroactively

The cost: no automatic sync between devices, no real-time collaboration, no public sharing built into the tool.

The benefit: your worldbuilding stays local. The .html file plus your .json exports are sufficient — there's no third party in the loop for the content itself.` },

  { id: "architecture", title: "Why a Single HTML File?", content: `Cartulary is one HTML file because that architecture matches the constraints of the tool: local-first, offline-capable, no install, no account. It also explains why several features don't and won't exist.

**Properties of the single-file model:**

- **No installer.** You save the file. To uninstall, you delete it.
- **No update system.** The file you have is the version you have. New versions don't replace your copy.
- **Cross-platform by default.** Works on any device with a modern browser.
- **Inspectable.** The whole program is human-readable text in a text editor.

**Things this rules out:**

- Real-time collaboration (single-user — see On Collaboration)
- Cloud sync between devices (move via .json export/import)
- Mobile-app UX. Cartulary loads on phones and tablets, but the UI is desktop-shaped — on most mobile browsers you'll need to enable desktop-site mode for controls to work properly. Even then, expect a worse experience than on a real keyboard and mouse. This isn't getting fixed; phones aren't the target.
- App store distribution

If you want a SaaS worldbuilding tool with collaboration, sync, and a mobile app, several exist. Cartulary is for the file-on-disk model — and the limitations above are direct consequences of that choice, not oversights waiting to be fixed.` },

  { id: "non-features", title: "Things That Aren't Features", content: `Some things you might expect from worldbuilding software that Cartulary deliberately doesn't have. Listed here so you don't waste time hunting for them.

**No undo outside the map editor.** Already covered in Getting Started. The map editor has Undo and Redo while you're in it; nothing else has Ctrl+Z. Restore points and JSON exports are your safety net.

**No version history beyond the browser.** Settings → Version History keeps recent snapshots and your restore points, but they live in the same browser storage as the world and go with it. Dated JSON files are your real version history: make them.

**No PDF export.** Markdown export exists; PDFs do not. Pipe the markdown through Pandoc or your text editor's export if you need PDF.

**No batch edit.** You can't select 30 entries and change a field on all of them at once. Edit one at a time, or write a script against the JSON export and re-import.

**No global find-and-replace.** Search finds entries; it doesn't replace text inside them. Same workaround — JSON edit and reimport.

**No spell check.** Use what your browser provides.

**No print stylesheet.** Browser print will work but won't be formatted nicely. Markdown export is the better path to printable output.

**No real-time sync between tabs.** Open Cartulary in two browser tabs at once and you'll get conflicts — the last tab to save wins. Use one tab.

**No template versioning.** When you edit a template, the change applies immediately to all existing entries of that type. There's no way to keep "old format" entries on the old template while new ones use the new template. Plan template structure before you have many entries, or be ready to manually update existing ones after a template change.

**No cross-world references.** An entry in World A can't reference an entry in World B. Worlds are isolated; cross-references work only within a single world.

**No search-within-Home.** The docs you're reading don't have their own search. Use your browser's Ctrl+F to find a topic by keyword.

**No autosave indicator.** Cartulary autosaves silently every 500ms after edits. You'll see a "Saved" toast briefly when you commit an explicit Save, but background autosave is invisible. If you want confidence that recent edits persisted, check the entry's timestamp on the Project view.

These aren't oversights. Most are direct consequences of the single-file local-first architecture (see Why a Single HTML File?). The rest are scope decisions — Cartulary tries to do worldbuilding well, not everything adjacent to it.

**To start over from scratch:** Click your world's name at the top-left of the sidebar to open settings, then use Reset. It wipes the current world (with confirmation) and gives you a fresh empty one. Export your JSON first if there's anything worth keeping. There's no "previous worlds" history — Reset is permanent.` },

  { id: "json-schema", title: "JSON Save File Schema", content: `For users who want to script imports, debug a corrupt save, or run bulk transformations on a world's data, this section describes the structure of an exported \`.world.json\` file. Reverse-engineering from a known-good export is also viable; this is the documented version.

**Top-level shape:**

\`\`\`
{
  "schemaVersion": 1,
  "world":        { ...world metadata, including the primary calendar },
  "templates":    [ ...template definitions ],
  "entries":      [ ...entry records ],
  "stemmas":      [ ...stemma documents ],            // empty array if none
  "concordance":  { "positions": { ... } },           // manual Concordance node positions
  "calendars":    [ ...non-primary calendars ],       // v1.4 Kalendarium — empty array if single-calendar world
  "celestialBodies": [ ...body definitions ],         // v1.5 Ephemeris — stars/planets/moons/etc; empty array if none
  "ephemeris":    { ...Ephemeris view UI state },     // v1.5 — per-mode UI substate; rebuilt to default if absent
  "glossopoeia":  { ...Glossopoeia view data + UI state },  // v1.5 — the conlang core view; empty default if absent
  "packs":        [ ...template packs ],              // v1.5 — named reference-sets over templates; empty array if none
  "cartographia": [ ...map records ],                 // v1.6, maps as their own records (see below); empty array if none
  "mapStamps":    [ ...imported map stamps ],         // v1.6, stamps imported from stamp packs; empty array if none
  "viewPrefs":    { ...per-view preferences }         // various per-view UI state
}
\`\`\`

\`schemaVersion\` is currently always \`1\`. A higher number means the file was written by a newer build than the one trying to load it; loading is refused with a recovery prompt. A lower or missing number is treated as 1.

\`stemmas\`, \`concordance\`, \`calendars\`, \`celestialBodies\`, \`ephemeris\`, \`glossopoeia\`, \`packs\`, \`cartographia\`, \`mapStamps\`, and \`viewPrefs\` are all optional — older worlds without them load fine; the migration step initializes each to its empty default shape. New exports always include them.

Version-history snapshots are **not** part of the JSON save file. They live in a separate IndexedDB store inside the browser and don't survive clearing browser storage or transferring the world to another machine. The exported \`.world.json\` is the canonical save; snapshots are a session safety net only.

---

**\`world\` object:**

\`\`\`
{
  "name":          string,
  "description":   string,
  "imageFolder":   string,             // suggested folder name for FSAA images
  "locked":        boolean,            // Lock Mode state
  "calendar":      { ...calendar },    // the primary calendar (additional calendars live in top-level "calendars")
  "currentMoment": { "year": number, "monthIndex": number, "day": number } | null,
                                       // v1.4 — world's "now" in primary's frame; drives time-aware pin filtering, calendar grid marker, deceased-character obituary lines
  "createdAt":     ISO-8601 timestamp,
  "updatedAt":     ISO-8601 timestamp,
  "seededBuiltins":  [ string, ... ],
  "seededFields":    { [tplName]: [fieldLabel, ...] },
  "iconMigrations":  { [migrationKey]: true },
  "fieldRenames":    { [migrationKey]: true },
  "templateRenames": { [migrationKey]: true }
                                       // ...plus additional per-feature migration tracker maps populated by migrate()
}
\`\`\`

The migration-tracking maps prevent re-seeding work that's already been done (built-in templates the user deleted on purpose, fields renamed by upgrades, templates renamed by upgrades, etc.). Safe to leave them out when constructing JSON from scratch — the load-time migration will populate them.

\`currentMoment\` is stored in primary's frame (year + month index into primary's months + day-of-month), not as an absoluteDay. Calendar-position invariance applies: if you rename or reorder primary's months, the stored \`{year, monthIndex, day}\` rebinds positionally so "15 Mistfall 480 IA" stays "15 Mistfall 480 IA" rather than floating to a different absolute day. Consumers derive absoluteDay at read time via \`calendarDateToAbsoluteDay\`.

---

**\`calendar\` object** (the primary at \`world.calendar\` and each entry in top-level \`calendars\`):

\`\`\`
{
  "name":        string,
  "months":      [ { "name": string, "days": number, "abbreviation": string }, ... ],   // 1+ entries; abbreviation optional, up to 3 chars (used by the abbreviated dateFormat presets)
  "eras":        [ { "name": string, "shortName": string, "startYear": number }, ... ],
  "notes":       string,                                          // optional
  "description": string,                                          // optional
  "dateFormat":  string,                                          // v1.5 -- one of "name-day" (default) | "abbr-day-pad" | "abbr-day" | "name-month" | "abbr-year-pad"; controls date display for dates reckoned in this calendar
  "week": {
    "daysPerWeek": number,                                        // positive integer; default 7
    "dayNames":    [ string, ... ]                                // either empty (no header row) or exactly daysPerWeek long
  },
  "celestials":  [ string, ... ],                                 // v1.5 — moon-body id refs into top-level "celestialBodies" (kind "moon"); cap 5 per calendar. (Pre-v1.5 worlds stored inline {name, cycleDays, offsetDays} objects here; migration moved those into celestialBodies and rewrote this to id refs.)
  "seasons":     [
    {
      "id":       string,                                          // e.g. "sea-{4-char-suffix}"
      "name":     string,
      "startDay": number,                                          // 1-indexed dayOfYear
      "endDay":   number,                                          // 1-indexed dayOfYear; endDay < startDay = wraparound through year-end
      "color":    string                                           // hex
    },
    ...
  ],
  "anchor": { "absoluteDay": number }                              // v1.4 Kalendarium — REQUIRED on non-primary calendars; the absoluteDay (in primary's frame) on which this calendar's Y1M1D1 falls. The primary calendar has no anchor — it IS the absolute frame.
}
\`\`\`

\`months\` is an ordered array. \`monthIndex\` references in date values point into this array. Reordering or deleting a month invalidates existing dates that reference it (the editor warns before doing this, and the conversion modal walks all date-bearing surfaces).

The v1.4 extensions (\`week\`, \`celestials\`, \`seasons\`) are pure-additive on existing worlds — pre-v1.4 calendars get default-shape extensions backfilled by migration. Since v1.5, \`celestials\` holds moon-body id refs (see \`celestialBodies\` below) rather than inline cycle data — a moon's cycle and phase anchor live on the body. Season \`endDay < startDay\` denotes a wraparound season (e.g. winter spanning Dec → Feb). Overlapping seasons are allowed (first-defined wins at the day cell); gaps are allowed.

---

**\`calendars\` array** (v1.4 — non-primary calendars; empty array on single-calendar worlds):

\`\`\`
[
  {
    "id":          string,                       // e.g. "cal-{4-char-suffix}"
    ...all the fields from the calendar object above, including a REQUIRED "anchor"
  },
  ...
]
\`\`\`

Each non-primary calendar has the same shape as the primary at \`world.calendar\` plus a required \`anchor.absoluteDay\` integer. Conversion math between calendars runs through absoluteDay space: \`absoluteDay = (year - 1) * daysPerCalendarYear(cal) + dayOfYear(cal, monthIndex, day) + anchor.absoluteDay - 1\`. The primary calendar's frame defines absoluteDay 1 as Y1M1D1; non-primary anchors are interpreted in that primary frame.

Entries with a \`calendarId\` field reckon their date values in the corresponding calendar. Entries without a \`calendarId\` reckon in primary.

Calendars are first-class objects with their own JSON export/import path via the \`cartulary_calendar_export: 1\` envelope, parallel to the templates and stemmas patterns. The collision modal on import allows Skip/Replace/Rename; Replace is disabled when colliding with primary (primary swap would re-frame every entry's stored dates).

---

**\`celestialBodies\` array** (v1.5 Ephemeris — stars, planets, moons, and other bodies; empty array on worlds with no Ephemeris data):

\`\`\`
[
  {
    "id":               string,                  // e.g. "cel-{suffix}"
    "name":             string,
    "kind":             // 9 computable kinds (participate in orbital math):
                        "star" | "planet" | "moon" | "dwarf-planet" | "asteroid" |
                        "comet" | "rogue-planet" | "black-hole" | "meteor-shower" |
                        // 22 narrative kinds (no orbital math): a "narrative-" mirror of each
                        // computable kind (e.g. "narrative-star" ... "narrative-meteor-shower"),
                        // plus "galaxy" | "nebula" | "star-system" | "constellation" | "sector" |
                        // "asteroid-belt" | "ring-system" | "supernova-remnant" | "quasar" |
                        // "wormhole" | "megastructure" | "anomaly" | "structure",
    "parentBodyId":     string | null,           // the body this one orbits; null for a top-level star
    "orbitalElements": {                          // the six classical elements (computable kinds)
      "semiMajorAxis":       number,              // AU
      "eccentricity":        number,
      "inclination":         number,              // degrees
      "ascendingNode":       number,              // degrees (longitude of ascending node, Ω)
      "argumentOfPeriapsis": number,              // degrees (ω)
      "meanAnomalyAtEpoch":  number               // degrees
    },
    "physicalParams": {
      "mass":      number | null,                 // Earth masses
      "radius":    number | null,                 // Earth radii
      "axialTilt": number | null                  // degrees
    },
    // moon-phase fields (used when a calendar references this body as a moon):
    "synodicCycleDays": number | null,           // synodic period in days
    "phaseAnchorDay":   number | null            // absolute day on which the moon was New
    // ...plus kind-specific fields layered on via the celestial-body system template
  },
  ...
]
\`\`\`

Bodies form a tree through \`parentBodyId\` (moon → planet → star → null). Compute and Observe require a complete orbit-and-parent chain to the root; a body missing its parent's mass or with a broken chain is flagged, not silently computed. A body of kind \`moon\` is what a calendar references in its \`celestials\` array — define the moon once here, reference it from any calendar. Geometric phase uses the orbital elements when present; otherwise phase falls back to \`synodicCycleDays\` / \`phaseAnchorDay\`.

---

**\`ephemeris\` object** (v1.5 — the Ephemeris view's own UI state, not world data):

\`\`\`
{
  "currentMode": "asbo" | "compute" | "force-align" | "observe" | "event",
  "treeUI":      { "searchText": string, "expandedNodeIds": [ string, ... ], "scrollY": number }
  // ...plus per-mode substate (Compute range, Observe scale toggle, Force-Align inputs, etc.)
}
\`\`\`

Safe to omit when constructing JSON from scratch — migration rebuilds it to the default shape. It carries no world data; dropping it loses only remembered UI positions.

---

**\`glossopoeia\` object** (v1.5 — the constructed-language view's world data plus its UI state):

\`\`\`
{
  "conlangs":               [ ...ConLang container records ],   // the languages themselves
  "lexemes":                [ ...dictionary words ],
  "phonemes":               [ ...sounds ],
  "syllableStructures":     [ ... ],  "stressPatterns":  [ ... ],
  "phonotacticConstraints": [ ... ],  "phonologicalRules": [ ... ],
  "grammaticalValues":      [ ... ],  "affixes":         [ ... ],
  "wordBuildingProcesses":  [ ... ],  "inflectionClasses": [ ... ],
  "pronounSets":            [ ... ],
  "phraseOrders":           [ ... ],  "sentenceMarkings": [ ... ],  "constructions": [ ... ],
  "relativizations":        [ ... ],  "clauseLinkings":  [ ... ],
  "writingSystems":         [ ... ],  "graphemes":       [ ... ],  "spellingRules": [ ... ],
  "corpusEntries":          [ ... ],
  "workspaceNotes":         { [langId]: { [workspaceId]: string } },  // per-workspace overview longforms (e.g. the Inventory romanization key)
  "ui":                     { "activeLangId": string | null, "workspace": string }  // which language and workspace are open; UI only
}
\`\`\`

Every array is optional. Older worlds with no Glossopoeia data, and worlds from an earlier r-build that predate a given workspace, load fine — migration backfills each missing array to \`[]\` and \`workspaceNotes\` / \`ui\` to their defaults.

**Each record** in the per-language arrays shares one base shape, the same one used for entries:

\`\`\`
{
  "id":     string,                 // e.g. "syl-{suffix}", "afx-{suffix}", "wsy-{suffix}"
  "langId": string | null,          // the ConLang this record belongs to (null only for an orphan Lexeme in the Unassigned bucket)
  "name":   string,                 // the headword: phonemic symbol, word, affix, script name, etc.
  "tags":   [ string, ... ],
  "fields": { [fieldId]: value }    // value shapes per field type, exactly as in template entries (see Field values by type)
}
\`\`\`

ConLang container records (\`conlangs\`) use the same shape minus \`langId\` — a ConLang is the language, not a member of one. The keys inside each record's \`fields\` are the schema field ids for that record type (the in-app field tooltips name what each holds).

\`conlangs\`, \`lexemes\`, \`phonemes\`, \`grammaticalValues\`, \`affixes\`, \`wordBuildingProcesses\`, \`inflectionClasses\`, and \`writingSystems\` register as **node types**: their records appear in Concordance and are valid reference targets. A Lexeme's etymology points at other Lexemes; an Affix's Marks points at Grammatical Values; a Grapheme's Belongs To points at a Writing System and its Spells at Phonemes. The remaining arrays are view-internal — nothing references them. \`ui\` carries no world data; dropping it loses only which language and workspace were last open.

---

**\`templates\` array — each template:**

\`\`\`
{
  "id":     string,                           // e.g. "tpl-character-a3f2"
  "name":   string,
  "icon":   string,                           // single character, e.g. "◈"
  "color":  string,                           // hex, e.g. "#c8a96e"
  "kind":   "standard",
  "fields": [ ...field definitions ]
}
\`\`\`

---

**Field definitions (within \`templates[].fields\`):**

\`\`\`
{
  "id":       string,                          // e.g. "fld-description-71b4"
  "label":    string,
  "type":     one of:
              "text" | "textarea" | "tags" | "select" | "multiselect" |
              "number" | "date" | "calendar-date" | "calendar-date-range" |
              "url" | "color" | "image" | "entry-ref" | "name-history" | "group",
  "secret":   boolean                          // optional, default false

  // type-specific:
  "options":      [ string, ... ],             // type "select" — dropdown options
  "refTemplate":  string,                      // type "entry-ref" — by template NAME (not id)
  "multi":        boolean,                     // type "entry-ref" — single vs multi-select
  "relationKind": "parent" | "spouse",         // type "entry-ref" — drives Linea
  "subfields":    [ ...field definitions ]     // type "group" — nestable up to 3 levels deep (group→group→group; level-3 subfields cannot be groups)
}
\`\`\`

\`refTemplate\` references a template by its \`name\` (case-sensitive), not by ID. The \`resolveTemplateRefs\` step at load time also writes a \`refTemplateId\` for runtime use, but the canonical reference in your JSON is the name.

---

**\`packs\` array** (v1.5 — named reference-sets over templates; empty array if none):

\`\`\`
[
  {
    "id":          string,                       // file-stable pack id
    "name":        string,
    "description": string,
    "templateIds": [ string, ... ]               // references templates[].id; built-ins are never members
  },
  ...
]
\`\`\`

A pack groups templates by id for display and sharing — it never owns or copies them. Packs export/import through their own \`cartulary_pack_export: 1\` envelope (which carries the full member template definitions); on import each member template is given a world id namespaced under the pack id (form: packId__originalId), so same-named templates from different packs coexist without collision.

---

**\`entries\` array — each entry:**

\`\`\`
{
  "id":         string,                        // e.g. "ent-aria-a3f2"
  "templateId": string,                        // references templates[].id
  "name":       string,
  "tags":       [ string, ... ],
  "fields":     { [fieldId]: value, ... },     // value shape depends on field type
  "calendarId": string | null,                 // v1.4 — bind this entry's date fields to a non-primary calendar; null/missing = primary
  "createdAt":  ISO-8601 timestamp,
  "updatedAt":  ISO-8601 timestamp
}
\`\`\`

\`calendarId\` references an entry in the top-level \`calendars\` array. When set, all of the entry's date-bearing fields (\`calendar-date\`, \`calendar-date-range\`, \`name-history\` rows, spouse \`marriedOn\`/\`endedOn\`, and group subfields recursively) reckon in that calendar. When null or absent, those fields reckon in primary. Per-field overrides aren't supported in v1.4.

---

**Field values by type** (the value at \`entries[].fields[fieldId]\`):

| Type | Value shape |
|---|---|
| \`text\`, \`textarea\` | string |
| \`tags\` | array of strings |
| \`select\` | string (one of the field's \`options\`) |
| \`multiselect\` | array of strings (a subset of the field's \`options\`) |
| \`number\` | number |
| \`date\` | ISO-8601 date string |
| \`url\`, \`color\` | string |
| \`image\` | string — either a filename (folder mode) or a \`data:image/...;base64,...\` URL (inline mode) |
| \`calendar-date\` | \`{ year: number, monthIndex: number, day: number, approximate?: boolean }\` |
| \`calendar-date-range\` | \`{ start: calendar-date \\| null, end: calendar-date \\| null }\` |
| \`name-history\` | array of \`{ name: string, from: calendar-date \\| null, to: calendar-date \\| null }\` |
| \`entry-ref\` (no relationKind, single) | string — the referenced entry's id |
| \`entry-ref\` (no relationKind, multi) | array of entry id strings |
| \`entry-ref\` (with relationKind, single) | \`{ id: string, label?: string, status?: "active" \\| "former" \\| "estranged", marriedOn?: calendar-date, endedOn?: calendar-date }\` |
| \`entry-ref\` (with relationKind, multi) | array of the above objects |
| \`group\` | array of objects, one per instance — each object keyed by the group's subfield IDs, with values of the corresponding subfield types |

\`status\`, \`marriedOn\`, and \`endedOn\` only apply to \`relationKind: "spouse"\`. \`label\` is the user-typed override (per-side, not mirrored). \`status\`, \`marriedOn\`, and \`endedOn\` mirror to the partner on save.

---

**\`cartographia\` array (v1.6), one record per map:**

\`\`\`
[
  {
    "id":        string,                       // e.g. "map-a3f2c1"
    "name":      string,
    "tags":      [ string, ... ],
    "fields":    {                             // the three fixed fields, by id
      "cart-fld-description":  string,
      "cart-fld-scope-region": string,
      "cart-fld-notes":        string
    },
    "mapData":   { ...map data, below },
    "updatedAt": ISO-8601 timestamp
  },
  ...
]
\`\`\`

Maps were template entries (\`kind: "map"\`) through v1.5; a world saved by v1.5 is migrated on load: each map entry becomes a record here, its map-kind template is dropped, and any extra fields a custom map template had are kept in \`fields\` under their old ids (not shown in the app) with a line in Notes naming them.

**\`mapData\` (on cartographia map records):**

\`\`\`
{
  "image": string | null,                      // filename or data URL, like an image field
  "pins":  [
    {
      "id":        string,                     // e.g. "pin-a3f2c1"
      "x":         number,                     // 0..1, fraction of canvas width
      "y":         number,                     // 0..1, fraction of canvas height
      "label":     string,
      "entryId":   string | null,              // optional cross-reference to another entry
      "color":     string | null,              // hex override, otherwise inherit pin color
      "notes":     string,
      "permanent": boolean                     // optional; default false. true = always visible in time mode
    },
    ...
  ],
  "drawing": {                                 // v1.6, the drawing under the pins
    "width":  number,                          // canvas units; with an image, its natural pixel size
    "height": number,
    "background": { "fill": hex, "grain": number },   // grain 0..1; not drawn under an image
    "layers": [
      { "id": string, "name": string, "visible": boolean, "locked": boolean, "kind": "vector", "shapes": [ ...shapes ] },
      ...
    ]
  }
}
\`\`\`

A raster layer (v1.6, painted with the Brush or filled by Load image) holds one bitmap instead of shapes:

\`\`\`
{
  "id":      string,
  "name":    string,                           // "Paint" when the Brush made it
  "visible": boolean,
  "locked":  boolean,
  "kind":    "raster",
  "image":   string | null,                    // a filename in the image folder ("<map id>-<layer id>.png") or a PNG, JPEG, or WebP data URL; null when empty
  "width":   number,                           // the canvas units the bitmap covers; a canvas resize clips it
  "height":  number,
  "shapes":  []
}
\`\`\`

Each shape carries \`id\`, \`type\` (\`rect\`, \`ellipse\`, \`polygon\`, \`stroke\`, \`region\`, \`text\`, or \`stamp\`), \`fill\` and \`stroke\` (hex or null), and \`strokeWidth\` (1 to 64), then by type: \`x\`, \`y\`, \`w\`, \`h\` for rect, ellipse, and stamp; \`points\` ([[x, y], ...]) for polygon and stroke; \`rings\` ([[[x, y], ...], ...], drawn even-odd, so a ring inside another is a hole) for region, which the Fill tool makes; \`smooth\` for rect, polygon, stroke, and region; \`text\`, \`fontSize\` (24, 36, or 56), \`rotation\`, and \`arc\` (degrees, -180..180) for text; \`stampId\` and \`rotation\` for stamp. Layers draw in array order, so the last one is on top; a layer without \`kind\` is vector. A malformed drawing is coerced on load rather than refused: a shape that can't be rendered is dropped, and a raster layer whose image fails the check loads empty.

The canvas size shown in the UI (\`sizePct\`) and the zoom are session UI state and **not** persisted in the save file.

**\`mapStamps\` array (v1.6), stamps imported from packs and brush files, world-scoped:**

\`\`\`
[
  {                                            // an svg symbol
    "id":      string,                         // namespaced by pack: "<packId>__<stamp id>"
    "name":    string,
    "kind":    "svg",
    "viewBox": string,                         // "minx miny width height"
    "body":    string,                         // sanitized SVG inner markup; see Stamps & Brushes
    "packId":  string,                         // the pack's slug; "" for a stamp from no pack
    "pack":    string                          // the pack's display name
  },
  {                                            // a raster tip
    "id":      string,
    "name":    string,
    "kind":    "alpha" | "color",              // alpha: tinted by the map's Fill, and a Brush tip; color: placed as it is
    "image":   string,                         // a PNG data URL, at most 1024 pixels on the long side and 4 MB
    "width":   number,                         // pixels
    "height":  number,
    "spacing": number,                         // the gap between dabs when it paints, percent of the size
    "packId":  string,
    "pack":    string
  },
  ...
]
\`\`\`

Built-in stamps and tips are never stored; a map's stamp shape references a built-in by id (\`mountain\`, \`tree\`, \`settlement\`, \`compass\`). Every svg body is run through the sanitizer again on load, and every tip image is checked for its shape (a PNG data URL under the cap) and never decoded there, so editing this array by hand cannot bring in markup the import would have refused.

---

**\`stemmas\` array — each stemma document:**

\`\`\`
{
  "id":          string,                       // e.g. "stem-{4-char-suffix}"
  "name":        string,
  "description": string,
  "tags":        [ string, ... ],
  "root":        { ...stemma node, recursive },
  "createdAt":   ISO-8601 timestamp,
  "updatedAt":   ISO-8601 timestamp
}
\`\`\`

A **stemma node** is one of:

\`\`\`
// Freeform node (user-typed content, not tied to any entry)
{
  "id":       string,                          // e.g. "n-{4-char-suffix}"
  "slot":     number,                          // 0..15 (sixteen radial slots clockwise from 12 o'clock)
  "type":     "freeform",
  "label":    string,
  "color":    string,                          // hex
  "icon":     string,                          // single character or symbol
  "children": [ ...stemma nodes ]
}

// Linked node (references an existing entry)
{
  "id":          string,
  "slot":        number,
  "type":        "linked",
  "entryId":     string,                       // references entries[].id
  "_cachedName": string,                       // optional fallback label if the entry is missing on load
  "children":    [ ...stemma nodes ]
}
\`\`\`

The root node has \`slot: 0\` by convention. Child slots are unique within their parent's children (the editor enforces this; defensive imports skip duplicate slots). Nesting is unbounded but the UI only renders meaningful drill-down for the focal node and its immediate children.

---

**\`concordance\` object — manually-arranged Concordance graph positions:**

\`\`\`
{
  "positions": {
    [entryId]: { "x": number, "y": number },
    ...
  }
}
\`\`\`

Coordinates are in the simulation's local space (the force-directed graph's coordinate system, not screen pixels — zoom and pan are session UI state). Entries without a saved position get auto-placed via single-pass force layout when first rendered, then their settled positions get written back to this map on next save. Stale entries (positions whose \`entryId\` no longer exists) are silently scrubbed on load.

---

**\`viewPrefs\` object — per-view UI state that persists with the world:**

\`\`\`
{
  // v1.3+
  "timelineZoomLevel":           "year" | "month" | "day",       // Vertical Timeline three-level zoom; default "day"

  // v1.4 Kalendarium -- per-view calendar selectors. Four fixed keys, one per view:
  "mapCalendarId":               string | null,                  // Cartographia; calendar id from top-level "calendars", or null for primary
  "timelineCalendarId":          string | null,                  // Timeline views
  "chronometricsCalendarId":     string | null,                  // Chronometrics
  "familyCalendarId":            string | null,                  // Stemma / family views

  // v1.4 Kalendarium grid view -- per-row year displayed in the grid. A nested
  // map keyed by row: the primary row's key is the literal string "__primary__";
  // each non-primary calendar uses its own id.
  "kalendariumGridYear":         { "__primary__": number, "<calendarId>": number },

  // ...other per-view preferences land here as features are added
}
\`\`\`

\`viewPrefs\` is the umbrella for any per-world preferences that aren't view-mode (which is session-scoped). Hand-edited JSONs can omit the whole object; the load-time migration initializes it to \`{}\` and individual views read with \`?? null\` defaults.

---

**ID conventions.**

IDs are arbitrary strings, but Cartulary's own generators follow:

- Templates: \`tpl-{slug}-{4-char-suffix}\`
- Entries: \`ent-{slug}-{4-char-suffix}\`
- Fields: \`fld-{slug}-{4-char-suffix}\`
- Pins: \`pin-{6-char-suffix}\`
- Stemmas: \`stem-{4-char-suffix}\`
- Stemma nodes: \`n-{4-char-suffix}\`
- Calendars (non-primary): \`cal-{4-char-suffix}\`
- Celestial bodies: \`cel-{4-char-suffix}\`
- Seasons: \`sea-{4-char-suffix}\`

The slug is derived from the name, the suffix is randomized to avoid collisions. You can use any string format as long as you maintain uniqueness within scope.

---

**Validation rules (enforced on load and import):**

- \`schemaVersion\` ≤ current build's schema version
- \`world\`, \`templates\` (array), \`entries\` (array) all present
- Template IDs unique across the world
- Field IDs unique within each template (including subfields recursively)
- Entry IDs unique across the world
- Every entry's \`templateId\` references an existing template

A file failing any of these rules is rejected with a specific error message rather than partially loaded.

---

**Migration.**

When the load handler reads a file written by an older build (lower \`schemaVersion\`, or a build that didn't have certain template/field defaults), \`migrate()\` runs and:

- Backfills new built-in templates that didn't exist when the world was created (unless their name is in \`seededBuiltins\` — i.e., the user previously deleted them)
- Backfills new fields on existing built-in templates (similar logic via \`seededFields\`)
- Renames built-in templates when the \`TEMPLATE_RENAMES\` table specifies a rename, preserving entries by keeping the template's id stable
- Renames fields when the \`FIELD_RENAMES\` table specifies a rename, preserving values by keeping the field's id stable
- Migrates icons listed in \`ICON_MIGRATIONS\`
- Strips self-references from any entry-ref field (an entry can't reference itself)
- Normalizes legacy \`relationKind\` field values from bare ID strings into the \`{id, label?, status?}\` object shape

Migration mutates a defensive clone of the input — your original file is never written through.

---

**Worked example: minimal valid world**

\`\`\`json
{
  "schemaVersion": 1,
  "world": {
    "name": "Test World",
    "description": "",
    "imageFolder": "world-images",
    "locked": false,
    "calendar": {
      "name": "Gregorian",
      "months": [
        { "name": "January", "days": 31 },
        { "name": "February", "days": 28 }
      ]
    },
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  },
  "templates": [
    {
      "id": "tpl-character-0001",
      "name": "Character",
      "icon": "◈",
      "color": "#c8a96e",
      "kind": "standard",
      "fields": [
        { "id": "fld-description-0001", "label": "Description", "type": "textarea" }
      ]
    }
  ],
  "entries": [
    {
      "id": "ent-aria-0001",
      "templateId": "tpl-character-0001",
      "name": "Aria",
      "tags": ["warden"],
      "fields": {
        "fld-description-0001": "Captain of the Eastwatch."
      },
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
\`\`\`

This loads, migrates (the migration step will backfill built-in templates and fields you didn't include), validates, and renders.` },
];