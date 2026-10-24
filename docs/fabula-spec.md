# Cartulary, Fabula Spec (v1.7, Letters)

> **DRAFT for Drak's review.** Started 2026-10-23 (session 19) from Drak's calls that night. Nothing here is built. Once the open decisions in section 12 are settled and the field tables pass his review, this freezes as the build sheet the cuts work from, the way `maps-promotion-spec.md` did for v1.6's first cut. Until then every table is a proposal.

---

## 0. One-sentence statement

Fabula is a new view, a peer of Linea, Stemma, and Kalendarium, for planning the stories set in a world down to their scenes and beats, with the writing itself done somewhere else.

## 1. Decisions so far (Drak, 2026-10-23)

- **Everything but the writing.** Fabula goes as far as scene beats or scenes and never holds the prose. The doctrine's scope line is now "Not a prose tool".
- **Names.** The view is **Fabula**. A group of stories is a **Corpus**, because a corpus covers works set in the same world that aren't linked as well as those that are.
- **Several stories per world**, grouped into corpora, and **several corpora per world** with each story in at most one, so a world can keep different series apart (Drak, 2026-10-24).
- **Plot Thread and Theme / Motif stay entries** and move under Fabula. Promoting them to records the way maps went would break their wiki-links, take threads off Chronometric, and retire a template id that two built-in fields target, the shape of the v1.4 upgrade bug.
- **The breakdown in section 5**, accepted as a first draft.
- **A timeline of Fabula's own** for a story or a corpus, kept apart from Chronometric (section 8).
- **Concordance shows Fabula's records when Fabula is selected** in its filter (Drak, 2026-10-24).
- **Fabula has an export of its own**, HTML and Markdown, separate from the world's (Drak, 2026-10-24).
- **Editable schemas with locked core fields** (Drak took Claude's middle path, 2026-10-24): the fields a feature reads can be relabeled but not deleted or retyped, every other field is editable, and every type takes the user's own fields (sections 3 and 5.0).
- **A deleted entry is cleaned out of Fabula**, with a count first and cast records kept (Drak took Claude's middle path, 2026-10-24; section 9).
- **Stemma v2** ships alongside as the brainstorm engine and stays its own view.
- **Models:** Reedsy's writing guides and Studio templates, and Savannah Gilbo's First Draft Roadmap. Gilbo's steps 1 to 4 and 6 are the Story's panels, step 5 is People, steps 7 and 8 are Plot and Outline, and steps 9 and 10 (the writing routine and the draft) stay out.

## 2. The boundary

**In:** planning material. Premise, genre, narration, setting, cast, arcs, relationships, plot points, promises and payoffs, the outline down to each scene's beats, research, and notes on any of it. Summaries and notes are planning: a scene's notes are where the author writes down what they're thinking about the scene.

**Out:** drafting. No field meant to hold a chapter's or a scene's text, no prose editor, no manuscript compile or export, no tracking of a draft's word count, and no writing-routine tracker. Target lengths are planning numbers.

**The test for any field or feature:** if it would hold the story's prose or manage the act of writing it, it doesn't belong.

## 3. Where it lives

- **A new slice, `state.fabula`,** beside `state.cartographia` and `state.glossopoeia`. One array per record type; every record carries `id`, `name`, `fields: {}`, `createdAt`, and `updatedAt`, and every record below the story level carries its `storyId`. Proposed shape:

```
fabula: {
  corpora:       [ { id, name, fields, storyIds: [ in reading order ] } ],
  stories:       [ { id, name, corpusId, fields, outline } ],
  cast:          [ { id, storyId, name, fields } ],
  arcs:          [ ... ],   relationships: [ ... ],
  plotPoints:    [ ... ],   promises:      [ ... ],
  parts:         [ ... ],   chapters:      [ ... ],
  scenes:        [ ... ],   research:      [ ... ]
}
```

  A story's `outline` is its ordered tree of part, chapter, and scene ids (section 7), so the order lives in one place.
- **`migrate()` adds an empty slice** when it's missing, as it does for `cartographia`. A world from v1.6.1 loads with an empty Fabula and nothing else changes. `SCHEMA_VERSION` stays 1, because the change only adds.
- **Schemas seeded from code, then the world's to edit.** Each kind's schema starts the way Glossopoeia's are built (`23_glossopoeia/00_schemas.jsx`): stable field ids, a help line on every field, and entry-ref fields that find the world's template ids by name, since every world seeds its built-ins with ids of its own. Fabula then stores the schemas per world, in `state.fabula.schemas`, one per kind, out of every template list, and the Template Builder edits them. Core fields (section 5.0) can be relabeled but not deleted or retyped; every other field is editable, and every kind takes the user's own fields. A later version's schema change only adds core fields by id, so it never has to merge with a user's edits. Records render through the shared `EntryForm`, so every field type behaves as it does in an entry and no form code is new.
- **Links between Fabula records** (a scene's POV pointing at a cast record) go through the node-source registry (`22_trunk`) with a sentinel id per kind, like Glossopoeia's `__conlangs__`, so `EntryForm`'s pickers can offer them. Registering a kind also makes it a Concordance node. Each registered kind is its own toggle in Concordance's filter today, and Fabula would add eleven, so Fabula's kinds sit behind one Fabula toggle, off until selected like everything in that filter.
- **Downgrade.** `migrate()` deep-clones the state and keeps keys it doesn't know, so a v1.7 world opened in v1.6.1 should keep `state.fabula` untouched through a save. Section 11 tests it rather than assuming it.

## 4. The view

- **Sidebar:** "Fabula", beside the other views.
- **Index:** each corpus with its stories in reading order, then the stories in no corpus. A row shows the title, status, its counts of cast and scenes, and when it was last updated.
- **A story** opens on its Story record, with section tabs across the top:
  - **Story:** the Story's own fields and its four panels (Premise, Genre, Narration, Setting).
  - **People:** Cast, Arcs, Relationships.
  - **Plot:** Plot Threads (entries), Plot Points, Promises & Payoffs.
  - **Outline:** Parts, Chapters, and Scenes as one ordered tree.
  - **Meaning:** Themes & Motifs (entries).
  - **Notes:** Research Notes.
  - **Timeline:** section 8.
- **A corpus** opens on its own page: its stories in reading order, reordered by drag, its notes, and the corpus timeline.
- **Plot Thread and Theme / Motif** leave the sidebar's template list through a flag on the template that the sidebar honors. They stay in `BUILTIN_TEMPLATES`, Restore Built-ins and Reset Template keep working, and they open inside Fabula in the normal entry form. Which stories use a thread is recorded on the Story (its Threads field), not on the thread, so one thread can run through several books.

## 5. Record types and fields

`½` marks a half-width field. `link: X` is a link to a Fabula record of kind X in the same story; `entry-ref: X` is a reference to world entries of template X. Every type ends with a Notes field unless its table says otherwise.

### 5.0 Core fields

A field is core when a feature reads it by meaning, not just by being a field. Concordance's edges, backlinks, and the export read any link or field generically, so they don't make a field core. Core fields can be relabeled but not deleted or retyped:

- **Corpus:** Stories (the reading order).
- **Story:** Corpus, Status (the index shows it), Structure and Custom Slots (they seed plot points).
- **Cast:** Character.
- **Arc:** Cast, Turning Points (the timeline marks them).
- **Relationship:** Cast A, Cast B.
- **Plot Point:** Slot, Delivered In.
- **Promise & Payoff:** Setup In, Payoff In (the unpaid-promise flag).
- **Scene:** POV, When, Threads (the timeline's lanes and placement).

Every record's name is core by construction. Part / Act, Chapter, and Research Note have no core fields beyond it.

### 5.1 Corpus

```
Label         Type                 Notes
Name          text
Kind          select + other ½     Series, Shared World, Anthology, Collection
Status        select ½             Planning, Active, Complete, Shelved
Stories       ordered list         the stories in reading order, set by drag
Description   textarea
Notes         textarea
```

### 5.2 Story

The Story's own fields:

```
Label          Type                 Notes
Title          text
Corpus         link: Corpus ½       optional
Status         select ½             Idea, Planning, Drafting, Revising, Done, Shelved
Form           select + other ½     Novel, Novella, Short Story, Serial, Screenplay, Campaign
Audience       select ½             Adult, New Adult, Young Adult, Middle Grade, Children's
Target Length  number ½             words; a planning number
Structure      select ½             section 6
Custom Slots   group                shown when Structure is Custom: one slot name per row
Brainstorm     link: Stemma, multi  the Stemma trees behind it
Notes          textarea
```

**Premise** panel (Gilbo 1 and 2):

```
Label             Type                  Notes
Why               textarea              why you're writing it
What If           textarea              the idea in a sentence or two
Logline           text                  who, what they want, what's in the way
Central Conflict  textarea
Conflict Kinds    multiselect + other   vs Character, Self, Society, Nature, Technology,
                                        the Supernatural, Fate
Stakes            textarea              what's lost if they fail
Theme Statement   textarea              what the story argues
Themes            entry-ref, multi      Theme / Motif
Synopsis          textarea              a summary of the plot, for planning
```

**Genre** panel (Gilbo 3):

```
Label                Type                   Notes
Genre                select + other ½       Fantasy, Science Fiction, Mystery, Thriller, Romance,
                                            Horror, Historical, Literary, Adventure
Subgenre             text ½
Tone                 multiselect + other    Bleak, Hopeful, Comic, Wry, Tense, Lyrical, Grim, Cozy
Reader Expectations  textarea               what the genre promises its readers
Expected Moments     group                  Moment (text), Scene (link: Scene): the scenes
                                            readers of the genre wait for, and where they land
Comparable Titles    group                  Title (text), Why (text)
```

**Narration** panel (Gilbo 4):

```
Label               Type                Notes
Point of View       select ½            First, Second, Third Limited, Third Omniscient, Multiple
Tense               select ½            Past, Present, Mixed
Narrative Distance  select ½            Close, Medium, Distant, Varies
Reliability         select ½            Reliable, Unreliable, Varies
Narrators           link: Cast, multi   whose eyes the story uses
POV Plan            textarea            how a multi-POV book divides between its narrators
Voice & Style       textarea            diction, rhythm, the rules you're keeping
```

**Setting** panel (Gilbo 6):

```
Label            Type                     Notes
Time Period      text ½                   as the story names it
Story Timespan   calendar-date-range ½    when it happens, in your calendar
Places           entry-ref, multi         Location, Cosmology / Plane
Rules in Play    entry-ref, multi         Magic / Tech System, Religion / Belief System,
                                          Faction / Government / Organization, Culture / People
Arena            textarea                 how the setting makes or limits trouble
Sensory Palette  textarea                 the sights, sounds, and smells to keep returning to
```

### 5.3 Cast

One record per character per story; the same Character entry can have a cast record in each book with a different role.

```
Label             Type                   Notes
Character         entry-ref ½            Character; required
Importance        select ½               Main, Secondary, Minor
Role              multiselect + other    Protagonist, Antagonist, Deuteragonist, Tritagonist,
                                         Confidant, Mentor, Love Interest, Foil, Antihero,
                                         Narrator, Supporting
First Appears     link: Scene ½
Motive            textarea               why they act; for an antagonist, the aims
Fear              textarea               their vulnerabilities
Voice             textarea               how they sound: diction, rhythm, tells
Beliefs & Ideals  textarea
Belief Systems    entry-ref, multi       Religion / Belief System
Secrets           textarea, secret       what the reader learns late, or never
Notes             textarea
```

Role is multi-select because a protagonist is often the narrator too. Secrets uses the existing secret flag, so it hides with the secrets toggle like every other secret field.

### 5.4 Arc

Out of Cast so one character can carry more than one arc.

```
Label           Type                Notes
Cast            link: Cast ½        whose arc
Arc Type        select + other ½    Positive Change, Flat, Negative Change, Disillusionment,
                                    Corruption, Fall
Status          select ½            Planned, Underway, Resolved, Abandoned
Want            textarea            the external goal (Gilbo 5)
Need            textarea            the internal need
Lie             textarea            the misbelief in the need's way
Truth           textarea            what answers the lie
Start State     textarea
End State       textarea
Turning Points  group               Scene (link: Scene), Shift (text): where it turns, and how
Notes           textarea
```

### 5.5 Relationship

```
Label           Type                   Notes
Cast A          link: Cast ½
Cast B          link: Cast ½
Kind            multiselect + other    Alliance, Rivalry, Romance, Friendship, Mentorship,
                                       Family, Enmity
Starts As       textarea
Ends As         textarea
Turning Points  group                  Scene (link: Scene), Shift (text)
Notes           textarea
```

### 5.6 Plot Point

```
Label          Type                     Notes
Slot           select + other ½         a slot from the story's structure (section 6), or Other
Delivered In   link: Scene ½            the scene where it happens
Description    textarea
Threads        entry-ref, multi         Plot Thread
Notes          textarea
```

Plot points sit in their structure's order; a custom turn goes where it's dragged.

### 5.7 Promise & Payoff

```
Label       Type                  Notes
Kind        select + other ½      Foreshadowing, Chekhov's Gun, Open Question, Red Herring,
                                  Prophecy, Callback, Running Gag
Status      select ½              Planned, Planted, Paid Off, Subverted, Dropped
Promise     textarea              what the reader is owed
Setup In    link: Scene, multi
Payoff In   link: Scene, multi
Threads     entry-ref, multi      Plot Thread
Notes       textarea
```

Plot Thread's Story Function field (Setup, Payoff, Red Herring, Mystery Box, Callback) labels a whole thread; this tracks each setup. The list flags every promise with a setup scene and no payoff scene.

### 5.8 Part / Act

```
Label     Type       Notes
Title     text
Purpose   textarea   what this part does for the story
Summary   textarea
Notes     textarea
```

### 5.9 Chapter

```
Label          Type             Notes
Title          text
POV            link: Cast ½
Status         select ½         Planned, Outlined, Drafted, Revised, Final
Target Length  number ½         words; a planning number
Purpose        textarea
Summary        textarea
Notes          textarea
```

### 5.10 Scene

```
Label          Type                     Notes
Title          text
POV            link: Cast ½
Status         select ½                 Idea, Outlined, Drafted, Revised, Cut
Setting        entry-ref ½              Location
When           calendar-date-range ½    story time, in your calendar
Participants   link: Cast, multi
Walk-ons       entry-ref, multi         Character: anyone without a cast record
Goal           text                     what the POV character wants here
Conflict       text                     what's in the way
Outcome        select + other ½         Yes; No; Yes, but; No, and
Turn           text ½                   what has changed by the end
Beats          group                    Beat (text), one per row, in order
Threads        entry-ref, multi         Plot Thread: the threads it moves
Motifs         entry-ref, multi         Theme / Motif
Notes          textarea                 what you're thinking about the scene; never the draft
```

### 5.11 Research Note

```
Label           Type               Notes
Topic           text
Sources         group              Title (text), Link (url)
Findings        textarea
Open Questions  textarea
Applies To      entry-ref, multi   entries of any template
Notes           textarea
```

### 5.12 Plot Thread and Theme / Motif

Their fields don't change. Each gains a read-only list of the stories and scenes that use it, derived from Fabula's links the way backlinks are derived from references.

## 6. Structures

Choosing a structure on a story seeds one empty plot point per slot, in order. Choosing another later adds the new structure's slots and keeps every existing plot point under its old slot name: a structure change deletes nothing.

```
Structure        Slots
Three-Act        Setup, Inciting Incident, First Plot Point, Rising Action, Midpoint,
                 Second Plot Point, Climax, Resolution
Freytag          Exposition, Inciting Incident, Rising Action, Climax, Falling Action,
                 Resolution, Denouement
Hero's Journey   Ordinary World, Call to Adventure, Refusal of the Call, Meeting the Mentor,
                 Crossing the Threshold, Tests and Allies, Approach, Ordeal, Reward,
                 The Road Back, Resurrection, Return
Seven-Point      Hook, First Plot Turn, First Pinch, Midpoint, Second Pinch, Second Plot Turn,
                 Resolution
Kishotenketsu    Introduction (ki), Development (sho), Twist (ten), Reconciliation (ketsu)
Custom           the story's Custom Slots, in order
None             no seeded slots
```

Methods sold under a trademarked name (Save the Cat!) don't ship as presets; Custom covers them.

## 7. The outline

- Each story's outline is one tree: parts, then chapters, then scenes. Parts and chapters are optional, so a scene can sit under a chapter, under a part, or directly under the story.
- Reordered by drag and by keyboard, so the outline isn't one more pointer-only surface like the canvas views.
- Telling order is the tree flattened; story time is each scene's When.
- Moving a chapter moves its scenes with it.
- Deleting a part or a chapter asks whether its children move up a level (the default) or go with it. No delete takes scenes silently.

## 8. The Fabula timeline

- **Scope:** one story, or a whole corpus, picked at the top.
- **Modes:** story time places scenes by their When in your calendar; telling order places them by their position in the outline; a third mode plots one order against the other, where a straight-told book draws a straight line and every flashback or jump breaks it. Fabula is narratology's word for the events in the order they happened, as against the order they're told, so the view's name is this mode's subject.
- **Lanes:** by POV, by thread, or by arc.
- **Marks:** plot points as markers, chapters and parts as bands in telling order, threads' Timespans as spans.
- **Undated scenes** appear in the telling-order modes and wait in a tray in story-time mode.
- **Kept apart:** it shows only Fabula's records and Fabula's threads, and nothing it adds appears on Chronometric.
- **The cost.** Chronometric's tick, lane, and band math lives inside `ChronometricsView` (`19_chronometric`), one component of about a thousand lines. Reusing it means first pulling that math out into functions that take events from any source, a refactor that keeps behavior but not bytes, so the parity gate can't check it; it needs its own check that Chronometric draws the same world identically before and after, at every zoom level. Skipping the extraction makes Fabula's timeline a second engine to keep alive.

## 9. Where Fabula meets the rest of the app

- **Wiki-links** resolve to entries and celestial bodies (`InlineWikiLinkText`), so Fabula's records aren't wiki-link targets in v1.7. Threads and motifs, as entries, are.
- **Backlinks** (Pipes item 1): an entry's Referenced by list includes the Fabula records that point at it, so a character shows its cast records and scenes.
- **Search and the query layer** cover entries. Fabula filters its own lists by status, POV, thread, and the like.
- **Concordance:** behind one Fabula toggle in its filter (section 3), with edges for the links: a cast record to its Character, a scene to its POV, participants, setting, and threads, an arc or a relationship to its cast, a plot point or a promise to its scenes.
- **A deleted entry:** the delete confirmation first says what the delete will remove, counted by the same scan as backlinks, across entries and Fabula alike ("removes her from 4 entries, 2 cast records, and 9 scenes"); today it's a bare `Delete "Aria"?` prompt. Then Fabula's references to the entry are cleaned out the way entries' are (`scrubEntryRefs`), with one exception: a cast record whose character is deleted stays, marked "character deleted", with its role, voice, arcs, and relationships intact, to relink or delete by hand. Stemma's linked nodes still turn orphan as they do now.
- **Exports:** the world JSON carries `state.fabula`, as the save file must. Fabula's records stay out of the world's HTML and Markdown exports. Fabula has its own export instead, in HTML and in Markdown, for one story or a whole corpus, with the include-secrets choice the other exports offer: the panels, cast, arcs, relationships, outline with its beats, plot points, and promises. The Markdown version is the story bible.
- **Entry import and export** (Pipes item 9) moves entries only; Fabula's records don't ride in `cartulary_entries_export`.
- **Lock and secrets:** Lock Mode blocks Fabula's edits, and the secrets toggle hides its secret fields, as everywhere else.
- **Help and site:** a Fabula topic in the in-app help and a Fabula page on cartulary.world, and the JSON Save File Schema topic and the site's JSON Structure page document `state.fabula`, written against the component.

## 10. Cut plan (an estimate)

1. The slice, `migrate()`'s empty default, the seeded schemas, and the registry entries, with no UI.
2. The Template Builder learns Fabula's kinds and the core lock.
3. The view: sidebar entry, index, corpus and story records with the Story panels.
4. People: cast, arcs, relationships.
5. Outline: parts, chapters, and scenes with their beats, ordered by drag and keyboard.
6. Plot: plot points and structures; promises and payoffs with the unpaid-promise flag.
7. Notes, and Plot Thread and Theme / Motif moved under Fabula.
8. Chronometric's math extracted, checked unchanged.
9. The Fabula timeline.
10. The kept cast records, the Concordance toggle, Fabula's HTML and Markdown export, the help, and the site.

Letters comes before Pipes in v1.7 (Drak, 2026-10-24), so the two pieces of this spec that ride on backlinks' scan of incoming references, an entry's Referenced by list showing its Fabula records and the delete confirmation's count, land with backlinks (Pipes item 1), which is then built once over entries and Fabula together. Until then a delete cleans Fabula's references and keeps cast records as section 9 says, without the count.

About ten cuts. The extraction and the timeline are the least certain.

## 11. Acceptance tests

- A v1.6.1 world loads with an empty Fabula, and its entries, templates, and every other slice come through unchanged.
- After the sidebar move, Plot Thread and Theme / Motif entries still resolve as wiki-links, threads still draw on Chronometric, and search, Concordance, and both exports still include them.
- A world with Fabula data survives a JSON export and re-import unchanged, and `migrate()` is idempotent on it.
- Deleting a Character entry that has cast records and scenes: the confirmation counts what it will remove; afterward no scene lists the entry, and its cast records remain, marked "character deleted", with every other field intact.
- A core field can be relabeled but not deleted or retyped, and a user's own field survives an upgrade that adds a core field.
- A v1.7 world opened in v1.6.1 and saved still has its `state.fabula`.
- Changing a story's structure deletes no plot point, and deleting a chapter never takes its scenes without asking.
- The view makes no network requests, like the rest of the file.

## 12. Open decisions (Drak)

1. **Corpora:** decided, several per world (section 1).
2. **Schemas:** Drak leans editable (2026-10-24). Claude's case against fully editable: Fabula's features read particular fields (the timeline reads a scene's When, POV, and Threads; the unpaid-promise flag reads Setup In and Payoff In; a cast record is defined by its Character link; plot points carry their structure's slots; the export walks known fields), so every one of them would need a branch for a field that's gone or retyped, and a later version's schema change would have to merge with each user's edits, the machinery built-in templates already carry. Claude's middle path: the fields a feature reads are core, relabelable but not deletable or retypable; every other field is editable, and every type takes the user's own added fields. That costs a cut: the schemas are stored per world and the Template Builder learns Fabula's kinds and the core lock. Drak took the middle path (2026-10-24); sections 3 and 5.0.
3. **Concordance:** decided, one Fabula toggle (section 3).
4. **A deleted entry:** Drak leans toward cleaning the references out (2026-10-24). Claude's case against cleaning everything: a cast record is defined by its Character link, so cleaning it leaves a husk with a role, a voice, and arcs but no character, or deletes the record and the arcs, relationships, and scene POVs that hang off it; and today's entry delete is a bare confirmation that already cleans entries' references without a count. Claude's middle path: clean, but the delete confirmation first says what it will clean ("removes her from 2 cast records and 9 scenes"), counted by the same scan as backlinks, and a cast record whose character is deleted stays, marked as such, so its story work can be relinked or deleted by hand. Drak took the middle path (2026-10-24); section 9.
5. **Exports:** decided, Fabula's own, HTML and Markdown (section 9).
6. **The field lists:** to be decided (Drak, 2026-10-24).

## Sources

- Savannah Gilbo, "First Draft Roadmap: 10 Steps to Writing A Novel For Beginners": https://www.savannahgilbo.com/blog/how-to-write-a-novel
- Reedsy Studio, character templates: https://reedsy.com/studio/templates/category/characters
- Reedsy Studio, protagonist template: https://reedsy.com/studio/templates/protagonist
- Reedsy, "How to Outline a Book": https://reedsy.com/blog/how-to-outline-a-book/
