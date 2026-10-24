# Cartulary, Fabula Spec (v1.7, Letters)

> **DRAFT for Drak's review.** Started 2026-10-23 (session 19) from Drak's calls that night. Nothing here is built. Once the open decisions in section 12 are settled and the field tables pass his review, this freezes as the build sheet the cuts work from, the way `maps-promotion-spec.md` did for v1.6's first cut. Until then every table is a proposal.

---

## 0. One-sentence statement

Fabula is a new view, a peer of Linea, Stemma, and Kalendarium, for planning the stories set in a world down to their scenes and beats, with the writing itself done somewhere else.

## 1. Decisions so far (Drak, 2026-10-23)

- **Everything but the writing.** Fabula goes as far as scene beats or scenes and never holds the prose. The doctrine's scope line is now "Not a prose tool".
- **Names.** The view is **Fabula**. A group of stories is a **Corpus**, because a corpus covers works set in the same world that aren't linked as well as those that are.
- **Several stories per world**, grouped into corpora.
- **Plot Thread and Theme / Motif stay entries** and move under Fabula. Promoting them to records the way maps went would break their wiki-links, take threads off Chronometric, and retire a template id that two built-in fields target, the shape of the v1.4 upgrade bug.
- **The breakdown in section 5**, accepted as a first draft.
- **A timeline of Fabula's own** for a story or a corpus, kept apart from Chronometric (section 8).
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
- **Fixed schemas in code, built per world,** the way Glossopoeia's are (`23_glossopoeia/00_schemas.jsx`): stable field ids, a help line on every field, and entry-ref fields that find the world's template ids by name, since every world seeds its built-ins with ids of its own. Records render through the shared `EntryForm`, so every field type behaves as it does in an entry and no form code is new.
- **Links between Fabula records** (a scene's POV pointing at a cast record) go through the node-source registry (`22_trunk`) with a sentinel id per kind, like Glossopoeia's `__conlangs__`, so `EntryForm`'s pickers can offer them. Registering a kind also makes it a Concordance node today; whether Fabula's kinds should be is decision 12.3.
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
- **Concordance:** decision 12.3.
- **A deleted entry:** Fabula keeps the dead link and shows it as missing, the way Stemma shows an orphaned node, so the author can relink it, and nothing in Fabula is deleted with the entry. Entries' own references are scrubbed on delete (`scrubEntryRefs`); decision 12.4 is whether Fabula should match that instead.
- **Exports:** the world JSON carries `state.fabula`. A story exports as Markdown: its panels, cast, arcs, outline with beats, and promises, which is the story bible. Whether the HTML export includes stories is decision 12.5.
- **Entry import and export** (Pipes item 9) moves entries only; Fabula's records don't ride in `cartulary_entries_export`.
- **Lock and secrets:** Lock Mode blocks Fabula's edits, and the secrets toggle hides its secret fields, as everywhere else.
- **Help and site:** a Fabula topic in the in-app help and a Fabula page on cartulary.world, and the JSON Save File Schema topic and the site's JSON Structure page document `state.fabula`, written against the component.

## 10. Cut plan (an estimate)

1. The slice, `migrate()`'s empty default, the fixed schemas, and the registry entries, with no UI.
2. The view: sidebar entry, index, corpus and story records with the Story panels.
3. People: cast, arcs, relationships.
4. Outline: parts, chapters, and scenes with their beats, ordered by drag and keyboard.
5. Plot: plot points and structures; promises and payoffs with the unpaid-promise flag.
6. Notes, and Plot Thread and Theme / Motif moved under Fabula.
7. Chronometric's math extracted, checked unchanged.
8. The Fabula timeline.
9. Backlinks, the story Markdown export, the help, and the site.

About nine cuts. The extraction and the timeline are the least certain.

## 11. Acceptance tests

- A v1.6.1 world loads with an empty Fabula, and its entries, templates, and every other slice come through unchanged.
- After the sidebar move, Plot Thread and Theme / Motif entries still resolve as wiki-links, threads still draw on Chronometric, and search, Concordance, and both exports still include them.
- A world with Fabula data survives a JSON export and re-import unchanged, and `migrate()` is idempotent on it.
- Deleting a Character entry that has cast records leaves those records with a visible missing link, not an empty field.
- A v1.7 world opened in v1.6.1 and saved still has its `state.fabula`.
- Changing a story's structure deletes no plot point, and deleting a chapter never takes its scenes without asking.
- The view makes no network requests, like the rest of the file.

## 12. Open decisions (Drak)

1. **Corpora:** several per world with each story in at most one, as drafted, or one corpus per world?
2. **Schemas:** fixed, as drafted (the Glossopoeia way, and far cheaper), or editable like templates? Custom fields could come in a later version either way.
3. **Concordance:** should Fabula's records be graph nodes? Claude's recommendation is no for v1.7, which takes a small registry flag so a registered kind can stay off the graph; threads and motifs are on it already.
4. **A deleted entry:** a visible missing link, as drafted, or scrubbed the way entries' references are?
5. **HTML export:** include stories, or keep them out of the reader-facing export?
6. **The field lists:** cuts, additions, renames.

## Sources

- Savannah Gilbo, "First Draft Roadmap: 10 Steps to Writing A Novel For Beginners": https://www.savannahgilbo.com/blog/how-to-write-a-novel
- Reedsy Studio, character templates: https://reedsy.com/studio/templates/category/characters
- Reedsy Studio, protagonist template: https://reedsy.com/studio/templates/protagonist
- Reedsy, "How to Outline a Book": https://reedsy.com/blog/how-to-outline-a-book/
