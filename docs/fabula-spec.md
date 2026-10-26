# Cartulary, Fabula Spec (v1.7, Letters)

> **The build sheet, settled 2026-10-25.** Started 2026-10-23 (session 19) from Drak's calls that night; the field tables passed his review on 2026-10-25 (session 20), one table per message, and section 12's decisions are made, the last of them at the Plot cut's plan (2026-10-26). The cuts work from this file, the way v1.6's first cut worked from `maps-promotion-spec.md`, and a change to a decision here is Drak's call and lands here before the cut that makes it. v1.7's r006 built the slice and the seeded schemas, r007 the index and a corpus's page, r008 the story page, r009 People, r010 carved the code into `28_fabula.jsx`, r011 built the Outline, r012 gave its records their positions, r013 built Plot, and r014 built Notes.

---

## 0. One-sentence statement

Fabula is a new view, a peer of Linea, Stemma, and Kalendarium, for planning the stories set in a world down to their scenes and beats, with the writing itself done somewhere else.

## 1. Decisions so far (Drak, from 2026-10-23)

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
- **Other on multi-selects, for every template** (Drak, 2026-10-25). The four multi-selects whose lists end in Other get a real one, built into the field system rather than worked around. It went in as v1.7's r005, which saves each typed value as one more string in the same list.
- **Brainstorm waits for Stemma v2** (Drak, 2026-10-25). No field can point at a stemma yet, so the Story's link to the trees behind it is settled with Stemma v2, which follows Fabula.
- **Fabula's record types join the registry with its first screen** (Drak, 2026-10-25). The registry makes a source a reference target in every template builder and a toggle in Concordance, so the first cut seeds the slice and the schemas only, and the registry entries come with the first cut that shows Fabula, together with Concordance's single Fabula toggle and a builder that offers only sources marked eligible.
- **The field lists are settled** (Drak, 2026-10-25), reviewed one table per message in his table format, his call. What the review changed: the Story gains Threads, and the Premise panel's Themes is core, since the Plot and Meaning tabs list them; the Premise panel puts the theme pair under the Logline and the conflict fields under that; Genre gains Sci-Fantasy and Point of View Third Objective; the Setting panel's Places and a scene's Setting take Location, Cosmology / Plane, Astronomical Body, and Vehicle, since a big enough carrier can be a setting; a cast record's character can be a Deity / Entity, as can a scene's walk-ons, and Role loses Narrator, which the Narration panel's Narrators already says; Arc's and Promise & Payoff's statuses start at Idea; a scene with no POV of its own takes its chapter's, and chapters and scenes share one status list; and a research note gains Used In and stays with one story.
- **An arc can be more than one person's** (Drak, 2026-10-25, at r009's pass): an arc's Cast takes more than one cast record, as friends to lovers does. It came in at the pass, so it reached this file with r009's turnover, after the cut. The seed went to 2 with it (section 3).
- **A beat says what needs to happen** (Drak, 2026-10-26, at r011's pass): each beat keeps its line and takes What Happens, a longer text, and both are edited in place in the outline, the text under its line. The seed goes to 3 with it (section 3), and in the same change the fields the outline reads become core: a chapter's and a scene's Status, and a scene's Beats (section 5.0), where r011's staging had them wait for the builder. The same pass found two things in the outline itself: nothing showed that a row opens, and beats read as scenes. So a click anywhere on an act's, a chapter's, or a scene's row opens its page, as People's rows do, a click on a beat edits it, and the beats sit in under their scene's title with a rule down their left side (section 7).
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
  stories:       [ { id, name, fields, outline } ],
  cast:          [ { id, storyId, name, fields } ],
  arcs:          [ ... ],   relationships: [ ... ],
  plotPoints:    [ ... ],   promises:      [ ... ],
  parts:         [ ... ],   chapters:      [ ... ],
  scenes:        [ ... ],   research:      [ ... ]
}
```

  A story's `outline` is its ordered tree of part, chapter, and scene ids (section 7), so the order lives in one place. A story's corpus is the corpus whose `storyIds` lists it, stored nowhere else (2026-10-25: a `corpusId` beside the list would be the same fact twice).
- **`migrate()` adds an empty slice** when it's missing, as it does for `cartographia`. A world from v1.6.1 loads with an empty Fabula and nothing else changes. `SCHEMA_VERSION` stays 1, because the change only adds.
- **Schemas seeded from code, then the world's to edit.** Each kind's schema starts the way Glossopoeia's are built (`23_glossopoeia/00_schemas.jsx`): stable field ids, a help line on every field, and entry-ref fields that find the world's template ids by name, since every world seeds its built-ins with ids of its own. Fabula then stores the schemas per world, in `state.fabula.schemas`, one per kind, out of every template list, and the Template Builder edits them. Core fields (section 5.0) can be relabeled but not deleted or retyped; every other field is editable, and every kind takes the user's own fields. A kind's schema follows the seed until someone edits it (Drak, 2026-10-25): a later seed replaces an unedited schema whole, and an edited one keeps the user's version and only gains core fields by id, so no upgrade ever merges with a user's edits. When a later seed replaces a schema, a reference the new seed takes more than one of keeps what it held, as a list of one: the seed went to 2 at v1.7's r009, when an arc's Cast took more than one, and goes to 3 at r011, when a beat takes What Happens and the fields the outline reads become core (section 1). The seeded reference fields keep names and ids as a template's do, but nothing that re-resolves templates' fields (`resolveTemplateRefs`, `syncRefTargetNames`, v1.7 r004's retarget repair) reaches them yet: a migration that renames or retires a template has to treat Fabula's schemas itself. A reference field to world templates follows their names (Drak, 2026-10-25, for the story page): whenever a form opens, its targets are its stored ids that still exist plus whatever templates its names find now, the rule r002 gave templates, so a template deleted and brought back is found again. A field that finds none of its targets offers nothing, where an empty id list would otherwise read as any template, and says which template the world lacks, with a Restore button that brings a missing built-in back as the sidebar's Restore Built-ins does. Records render through the shared `EntryForm`, so every field type behaves as it does in an entry and no form code is new.
- **Links between Fabula records** (a scene's POV pointing at a cast record) go through the node-source registry (`22_trunk`) with a sentinel id per kind, like Glossopoeia's `__conlangs__`, so `EntryForm`'s pickers can offer them. Registering a kind also makes it a Concordance node and a reference target in every template builder. Each registered kind is its own toggle in Concordance's filter today, and Fabula would add eleven, so Fabula's kinds sit behind one Fabula toggle, off until selected like everything in that filter. The registry entries, the toggle, and a builder that offers only sources marked eligible landed together, with the first cut that shows Fabula, v1.7's r007 (section 1). A link picker offers only records from the record's own story, and until the story has any of the kind it says so ("This story has no cast yet."); such a field shows from the first cut that renders it, before its kind's records can be made (Drak, 2026-10-25). A link to a Fabula record opens that record's page, as a link to an entry opens the entry, and Back returns to the page it was clicked from; a click on one in Concordance opens it too, and a link to a scene stays plain until Outline gives scenes pages (Drak, 2026-10-25, for People).
- **Downgrade.** `migrate()` deep-clones the state and keeps keys it doesn't know, so a v1.7 world opened in v1.6.1 should keep `state.fabula` untouched through a save. Section 11 tests it rather than assuming it.

## 4. The view

- **Sidebar:** "Fabula", after Linea in the default order (Drak, 2026-10-25). The same call moves Kalendarium below Ephemeris, so the default runs Linea, Fabula, Stemma, Ephemeris, Kalendarium, Glossopoeia, Cartographia, Concordance, and the two timelines; a sidebar the user has rearranged keeps its order and gains Fabula after Linea.
- **Index:** each corpus with its stories in reading order, then the stories in no corpus, corpora and the stories in no corpus sorted by name. A row shows the title, status, its counts of cast and scenes, and when it was last updated. A story's row has a Corpus dropdown, no corpus or any corpus, which puts the story at the end of that corpus's reading order (Drak, 2026-10-25); a story made from a corpus's page starts in it. Deleting a corpus leaves its stories in no corpus.
- **A story** opens on its Story record, with section tabs across the top:
  - **Story:** the Story's own fields and its four panels (Premise, Genre, Narration, Setting).
  - **People:** Cast, Arcs, Relationships.
  - **Plot:** Plot Threads (entries, the ones the Story's Threads lists), Plot Points, Promises & Payoffs (v1.7's r013, done 2026-10-26). Its thread list edits the Story's Threads in place (Drak, 2026-10-26): a picker adds any existing thread, × takes one off the story while the thread stays in the world, and + New Thread makes a Plot Thread entry by its title, in place, and adds it to the story. It also lists, marked, any other thread the story's scenes, plot points, or promises use, each with a button that adds it to the Story's Threads (section 12, item 7). A thread opens its entry until r016 moves threads under Fabula (section 10, item 8).
  - **Outline:** Parts, Chapters, and Scenes as one ordered tree (v1.7's r011, done 2026-10-26; section 7).
  - **Meaning:** Themes & Motifs (entries, the ones the Premise panel's Themes lists).
  - **Notes:** Research Notes (v1.7's r014, done 2026-10-26), by topic, A to Z, as People lists its arcs and relationships (Drak, 2026-10-26). A note whose Open Questions holds any text is flagged open, on its row wherever the row appears, in a color quieter than an unpaid promise's red, since an open question isn't a mistake, and the tab's heading counts them; emptying the field clears the flag, so a note that says "None" stays flagged until it's emptied (Drak, 2026-10-26). A scene's page lists, under its fields, the notes whose Used In names it, by topic, each opening its note: read-only, changed from the note's side, and worked out each time the page is drawn, so nothing is stored (Drak, 2026-10-26). Everything else that points at a scene waits for backlinks (section 10), which the spec builds once over entries and Fabula together.
  - **Timeline:** section 8.

  Every tab shows from the story page's first cut, v1.7's r008; one that isn't built yet is greyed out and can't be opened, and its tooltip says what it will hold, until the cut that builds it turns it on (Drak, 2026-10-25). On the Story tab the Story's own fields come first, then each panel under a heading that folds it. The folds belong to the browser, kept with the app's other display settings, one set for every story and the same in view and edit mode, so they never reach the world file (Drak, 2026-10-25). In view an empty field doesn't show, as on an entry's page, so an open panel with nothing filled in says so.
- **People** (v1.7's r009, done 2026-10-25): the tab lists the story's cast, arcs, and relationships, each with its own + New, and each record opens on a page of its own over the story's page, with Edit, Save, Cancel, and Delete, and Back to the page it was opened from (Drak, 2026-10-25). Deleting a cast record counts in its confirmation what points at it, then clears those references; the arcs and relationships stay, without it, so deleting a cast record takes no other record with it (Drak, 2026-10-25). The cast is listed by importance and then name, arcs and relationships by name. Deleting a story takes its own records with it, its confirmation counting them, a default r009's staging named and Drak passed (2026-10-25).
- **A corpus** opens on its own page: its fields, edited the way an entry's are, its stories in reading order, reordered by drag or by arrow buttons with no edit step, and the corpus timeline.
- **Plot Thread and Theme / Motif** leave the sidebar's template list through a flag on the template that the sidebar honors. They stay in `BUILTIN_TEMPLATES`, Restore Built-ins and Reset Template keep working, and they open inside Fabula in the normal entry form. Which stories use a thread is recorded on the Story (its Threads field), not on the thread, so one thread can run through several books.

## 5. Record types and fields

The tables are in Drak's format: Label / Type / Notes, one line per field. Type is the field system's type, with `otherTextField` appended where it's set. Notes says `half-eligible` where the type is (half width goes by type: neighboring half-eligible fields pair, a lone one runs full, so the order sets the pairs), `Other +` where otherTextField is set, `core` on the fields a feature reads (section 5.0), and `-> X (Fabula), this story` for a reference to Fabula's own records, limited to the record's story. Every record also has its name, given under each heading. Every type ends with a Notes field unless its table says otherwise.

### 5.0 Core fields

A field is core when a feature reads it by meaning, not just by being a field. Concordance's edges, backlinks, and the export read any link or field generically, so they don't make a field core. Core fields can be relabeled but not deleted or retyped:

- **Corpus:** the reading order, which is the corpus's `storyIds` and not a field.
- **Story:** Status (the index shows it), Structure and Custom Slots (they give the Plot tab its headings), Threads (the Plot tab lists them), and the Premise panel's Themes (the Meaning tab lists them).
- **Cast:** Character.
- **Arc:** Cast, Turning Points (the timeline marks them).
- **Relationship:** Cast A, Cast B.
- **Plot Point:** Slot, Delivered In.
- **Promise & Payoff:** Setup In, Payoff In (the unpaid-promise flag).
- **Chapter:** POV (a scene with no POV of its own takes it), Status (the outline shows it).
- **Scene:** POV, When, Threads (the timeline's lanes and placement), Status (the outline shows it), Beats (the outline lists and edits them).

Every record's name is core by construction. Part / Act and Research Note have no core fields beyond it.

### 5.1 Corpus

Name: the corpus's name.

```
Label                 Type                         Notes
Kind                  select otherTextField        half-eligible · Other + · {Series, Shared World, Anthology, Collection}
Status                select                       half-eligible · {Planning, Active, Complete, Shelved}

Description           textarea
Notes                 textarea
```

The reading order isn't a field: it's the corpus's `storyIds`, set by drag on the corpus page, and it's where a story's corpus is stored (section 3).

### 5.2 Story

The Story's own fields:

Name: the title.

```
Label                 Type                         Notes
Status                select                       half-eligible · core · {Idea, Planning, Drafting, Revising, Done, Shelved}
Form                  select otherTextField        half-eligible · Other + · {Novel, Novella, Short Story, Serial, Screenplay, Campaign}
Audience              select                       half-eligible · {Adult, New Adult, Young Adult, Middle Grade, Children's}
Target Length         number                       half-eligible · words; a planning number
Structure             select                       half-eligible · core · {Three-Act, Freytag, Hero's Journey, Seven-Point, Kishotenketsu, Custom, None}; seeds the plot points

Custom Slots          group                        core · showWhen Structure = Custom; one slot per row, in order
    · Slot            text
Threads               entry-ref multi              core · -> Plot Thread; the threads this story carries
Notes                 textarea
```

Threads is where the story records the threads it carries, so one thread can run through several books (section 4). Brainstorm, a link to the Stemma trees behind the story, is out until Stemma v2 (section 1).

**Premise** panel (Gilbo 1 and 2):

```
Label                 Type                         Notes
Why                   textarea                     why you're writing it
What If               textarea                     the idea in a sentence or two
Logline               text                         half-eligible · who, what they want, what's in the way
Theme Statement       textarea                     what the story argues
Themes                entry-ref multi              core · -> Theme / Motif; the Meaning tab lists them
Central Conflict      textarea
Conflict Kinds        multiselect otherTextField   Other + · {vs Character, vs Self, vs Society, vs Nature, vs Technology, vs the Supernatural, vs Fate}
Stakes                textarea                     what's lost if they fail
Synopsis              textarea                     a summary of the plot, for planning
```

**Genre** panel (Gilbo 3):

```
Label                 Type                         Notes
Genre                 select otherTextField        half-eligible · Other + · {Fantasy, Science Fiction, Sci-Fantasy, Mystery, Thriller, Romance, Horror, Historical, Literary, Adventure}
Subgenre              text                         half-eligible

Tone                  multiselect otherTextField   Other + · {Bleak, Hopeful, Comic, Wry, Tense, Lyrical, Grim, Cozy}
Reader Expectations   textarea                     what the genre promises its readers
Expected Moments      group                        the scenes readers of the genre wait for, and where they land; one per row
    · Moment          text
    · Scene           entry-ref                    -> Scene (Fabula), this story
Comparable Titles     group                        one per row
    · Title           text
    · Why             text
```

**Narration** panel (Gilbo 4):

```
Label                 Type                         Notes
Point of View         select                       half-eligible · {First, Second, Third Limited, Third Omniscient, Third Objective, Multiple}
Tense                 select                       half-eligible · {Past, Present, Mixed}
Narrative Distance    select                       half-eligible · {Close, Medium, Distant, Varies}
Reliability           select                       half-eligible · {Reliable, Unreliable, Varies}

Narrators             entry-ref multi              -> Cast (Fabula), this story; whose eyes the story uses
POV Plan              textarea                     how a multi-POV book divides between its narrators
Voice & Style         textarea                     diction, rhythm, the rules you're keeping
```

**Setting** panel (Gilbo 6):

```
Label                 Type                         Notes
Time Period           text                         half-eligible · as the story names it
Story Timespan        calendar-date-range          when it happens, in your calendar

Places                entry-ref multi              -> Location, Cosmology / Plane, Astronomical Body, Vehicle
Rules in Play         entry-ref multi              -> Magic / Tech System, Religion / Belief System, Faction / Government / Organization, Culture / People

Arena                 textarea                     how the setting makes or limits trouble
Sensory Palette       textarea                     the sights, sounds, and smells to keep returning to
```

### 5.3 Cast

One record per character per story; the same entry can have a cast record in each book with a different role. The character can be a Character entry or a Deity / Entity entry, so a god or a ship's AI can be cast.

Name: the character as this story knows them; filled from the entry picked, and following a new pick until it's renamed.

```
Label                 Type                         Notes
Character             entry-ref                    half-eligible · core · required · -> Character, Deity / Entity
Importance            select                       half-eligible · {Main, Secondary, Minor}
First Appears         entry-ref                    half-eligible · -> Scene (Fabula), this story

Role                  multiselect otherTextField   Other + · {Protagonist, Antagonist, Deuteragonist, Tritagonist, Confidant, Mentor, Love Interest, Foil, Antihero, Supporting}
Belief Systems        entry-ref multi              -> Religion / Belief System

Motive                textarea                     why they act; for an antagonist, the aims
Fear                  textarea                     their vulnerabilities
Voice                 textarea                     how they sound: diction, rhythm, tells
Beliefs & Ideals      textarea
Secrets               textarea                     secret · what the reader learns late, or never
Notes                 textarea
```

Role is multi-select because one character often holds two roles, a protagonist who's also the love interest, say. Who narrates is the Narration panel's Narrators, so Role has no Narrator. Secrets uses the existing secret flag, so it hides with the secrets toggle like every other secret field.

### 5.4 Arc

Out of Cast so one character can carry more than one arc, and with a Cast that takes more than one, so one arc can be several characters', as friends to lovers is (Drak, 2026-10-25, at r009's pass).

Name: the arc's name, such as "Mira's fall".

```
Label                 Type                         Notes
Cast                  entry-ref multi              core · -> Cast (Fabula), this story; whose arc, one or more
Arc Type              select otherTextField        half-eligible · Other + · {Positive Change, Flat, Negative Change, Disillusionment, Corruption, Fall}
Status                select                       half-eligible · {Idea, Planned, Underway, Resolved, Abandoned}

Want                  textarea                     the external goal (Gilbo 5)
Need                  textarea                     the internal need
Lie                   textarea                     the misbelief in the need's way
Truth                 textarea                     what answers the lie
Start State           textarea
End State             textarea
Turning Points        group                        core · where it turns, and how; one per row
    · Scene           entry-ref                    -> Scene (Fabula), this story
    · Shift           text
Notes                 textarea
```

### 5.5 Relationship

Name: the pair's name, such as "Mira and Tomas".

```
Label                 Type                         Notes
Cast A                entry-ref                    half-eligible · core · -> Cast (Fabula), this story
Cast B                entry-ref                    half-eligible · core · -> Cast (Fabula), this story

Kind                  multiselect otherTextField   Other + · {Alliance, Rivalry, Romance, Friendship, Mentorship, Family, Enmity}
Starts As             textarea
Ends As               textarea
Turning Points        group                        where it turns, and how; one per row
    · Scene           entry-ref                    -> Scene (Fabula), this story
    · Shift           text
Notes                 textarea
```

### 5.6 Plot Point

Name: the slot's name when a slot is filled without a title, or your own. The seed's help line still says a structure made it, left as it was at r013 so the seed held (`docs/roadmap.md`, v1.7).

```
Label                 Type                         Notes
Slot                  select otherTextField        half-eligible · Other + · core · options from the story's Structure, filled in per story
Delivered In          entry-ref                    half-eligible · core · -> Scene (Fabula), this story; where it happens

Threads               entry-ref multi              -> Plot Thread
Description           textarea
Notes                 textarea
```

Slot's options come from the story's Structure (section 6), filled in by the view per story. Plot points sit under their slots in their structure's order, and a custom turn goes where it's dragged (section 6 has how).

### 5.7 Promise & Payoff

Name: a short label for what's promised.

```
Label                 Type                         Notes
Kind                  select otherTextField        half-eligible · Other + · {Foreshadowing, Chekhov's Gun, Open Question, Red Herring, Prophecy, Callback, Running Gag}
Status                select                       half-eligible · {Idea, Planned, Planted, Paid Off, Subverted, Dropped}

Setup In              entry-ref multi              core · -> Scene (Fabula), this story
Payoff In             entry-ref multi              core · -> Scene (Fabula), this story
Threads               entry-ref multi              -> Plot Thread

Promise               textarea                     what the reader is owed
Notes                 textarea
```

Plot Thread's Story Function field (Setup, Payoff, Red Herring, Mystery Box, Callback) labels a whole thread; this tracks each setup. The list flags every promise with a setup scene and no payoff scene.

### 5.8 Part / Act

Name: the part's title.

```
Label                 Type                         Notes
Purpose               textarea                     what this part does for the story
Summary               textarea
Notes                 textarea
```

### 5.9 Chapter

Name: the chapter's title.

```
Label                 Type                         Notes
POV                   entry-ref                    half-eligible · core · -> Cast (Fabula), this story; a scene with no POV of its own takes this one
Status                select                       half-eligible · core · {Idea, Planned, Outlined, Drafted, Revised, Final, Cut}
Target Length         number                       half-eligible · words; a planning number

Purpose               textarea
Summary               textarea
Notes                 textarea
```

A scene with no POV of its own takes its chapter's, so a book with one POV per chapter sets it once, and only a scene that differs sets its own. Chapters and scenes share one status list.

### 5.10 Scene

Name: the scene's title.

```
Label                 Type                         Notes
POV                   entry-ref                    half-eligible · core · -> Cast (Fabula), this story; empty takes the chapter's
Setting               entry-ref                    half-eligible · -> Location, Cosmology / Plane, Astronomical Body, Vehicle
Goal                  text                         half-eligible · what the POV character wants here
Conflict              text                         half-eligible · what's in the way
Outcome               select otherTextField        half-eligible · Other + · {Yes; No; Yes, but; No, and}
Turn                  text                         half-eligible · what has changed by the end
Status                select                       half-eligible · core · {Idea, Planned, Outlined, Drafted, Revised, Final, Cut}

When                  calendar-date-range          core · story time, in your calendar

Participants          entry-ref multi              -> Cast (Fabula), this story
Walk-ons              entry-ref multi              -> Character, Deity / Entity; anyone without a cast record
Threads               entry-ref multi              core · -> Plot Thread; the threads it moves
Motifs                entry-ref multi              -> Theme / Motif

Beats                 group                        core · one beat per row, in order; the outline lists and edits them
    · Beat            text                         the beat in a line
    · What Happens    textarea                     what needs to happen in the beat
Notes                 textarea                     what you're thinking about the scene; never the draft
```

### 5.11 Research Note

Name: the topic.

```
Label                 Type                         Notes
Applies To            entry-ref multi              -> any template
Used In               entry-ref multi              -> Scene (Fabula), this story; where the research lands
Sources               group                        one source per row
    · Title           text
    · Link            url
Findings              textarea
Open Questions        textarea
Notes                 textarea
```

Applies To is set to any template, which offers world entries and nothing else: no bodies, maps, Glossopoeia records, or Fabula records. Used In is what ties a note to the scenes that need it. A note belongs to one story, so research a series shares lives in one story's notes or in a world entry; a note that belongs to a corpus is on the roadmap (Drak, 2026-10-25: per story for now).

**The rest of the Notes tab** (Claude's defaults, named before the cut, 2026-10-26): + New Note opens a new note in edit on a page of its own, as + New Promise does; a row shows the topic, the open flag, and its details, the entries it applies to and then the scenes it's used in, each scene with its position; an empty tab says so; a note opens on a page of its own over the Notes tab, with Edit, Save, Cancel, and Delete, and Back to where it was opened from, and its delete asks first; Used In offers the story's scenes in the outline's order with their positions, as every scene picker has since r012, and Applies To the world's entries by name; a scene's research list shows in view and in edit, and not at all when no note names the scene; Concordance draws a note to the entries it applies to and the scenes it's used in (section 9); deleting a scene or an entry takes it out of the notes that name it, as every Fabula reference is cleaned, and deleting the story takes its notes; and in Lock Mode nothing adds, and every note still opens.

**What r014's staging chose, passed by Drak** (2026-10-26): the open flag in the accent color, gold, the color of the active tab and of a reference's chip; a row's details reading "about" its entries and then "used in" its scenes, each list in the order the note holds it, as a promise's row lists its scenes; the scene's list headed Research, its heading adding "set by each note's Used In" in edit; and a new note's title box naming its kind, "Research Note name...", as every Fabula record's form does.

### 5.12 Plot Thread and Theme / Motif

Their fields don't change. Each gains a read-only list of the stories and scenes that use it, derived from Fabula's links the way backlinks are derived from references.

## 6. Structures

A story's structure gives the Plot tab's Plot Points its headings, one per slot, in order (Drak, 2026-10-26, for v1.7's r013, where this section had choosing a structure seed one empty plot point per slot). A slot is a row to fill, not a record: a plot point is made when you fill one, named for its slot unless you give it a title, so Concordance and the delete counts see only the plot points you've written. Each plot point sits under its slot's heading, and a slot holds as many as you make, in an order the arrows or a drag set; moving a plot point under another heading changes its Slot to that heading's. A custom turn, a plot point whose Slot you type yourself through Other, is a heading of its own, dragged anywhere among the structure's slots. Choosing another structure shows its slots and deletes nothing: a plot point whose slot the new structure lacks keeps it, as a heading at the end, marked as not part of this structure, until you move it. A story whose Structure was set before r013 shows its slots the first time its Plot tab opens.

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

**The rest of the Plot tab** (Claude's defaults, named before the cut, 2026-10-26): it runs Threads, then Plot Points, then Promises & Payoffs; an empty slot fills by a title typed in place, a blank title taking the slot's name; a + under a filled slot adds another plot point to it, and + Custom turn adds a heading of your own at the end; with Custom the headings are the Story's Custom Slots, and with None only the plot points made, under their slots; a plot point's row shows its scene and threads, and a promise's its kind, status, and setup and payoff scenes; promises are listed in the outline's order of their first setup scene, those with none after, by name; the unpaid flag goes on every promise with a setup scene and no payoff scene, whatever its Status, and the section's heading counts them; plot points and promises open on pages of their own; Concordance draws a plot point to its scene and threads, and a promise to its setup and payoff scenes and its threads; and in Lock Mode nothing adds or moves.

**Done as r013** (2026-10-26). The story keeps the tab's order in its `plot`: `order`, its plot points' ids, and `turns`, each custom turn's name and the slot it follows (`after`, null for the top). Nothing else about a plot point's place is stored, since its heading is its Slot. **What r013's staging chose, passed by Drak** (2026-10-26): the Threads pickers' groups read "This story's threads" and "Other threads"; an empty slot fills from its heading, by a click on the row or its + Fill this slot, and a filled one takes + Plot point under its last; in the row that adds one, a title and Enter adds it and keeps the row open for the next, Enter on an empty row adds one named for the slot and closes the row, and a click away with a title adds it; the arrows carry a plot point past its heading's edge into the next slot or turn, changing its Slot, and skip the marked headings, which take none by arrow or drag; a turn whose slot is gone, after a structure change, goes after the last slot; plot points with no Slot sit under a No slot heading, last; the unpaid flag is the tab's alone, not shown on the promise's own page; the plot point's name help stays as seeded, so the seed holds at 3; and a row's details sit at its right while they fit beside its title, and drop under it, flush left, when they don't.

## 7. The outline

- Each story's outline is one tree: parts, then chapters, then scenes. Parts and chapters are optional, so a scene can sit under a chapter, under a part, or directly under the story.
- Reordered by drag and by keyboard, so the outline isn't one more pointer-only surface like the canvas views.
- Telling order is the tree flattened; story time is each scene's When.
- Moving a chapter moves its scenes with it.
- Deleting a part or a chapter asks whether its children move up a level (the default) or go with it. No delete takes scenes silently.
- **Reordering** (Drak, 2026-10-25, for v1.7's r011): four arrows on every row. ↑ and ↓ swap a record with its neighbor; ← moves it out to its part's or chapter's level, just after that part or chapter; → moves it into the part or chapter directly above it, at the end. An arrow is greyed where the move isn't allowed: parts never go inside anything, and chapters only inside parts. Alt and the same arrow do the same on a focused row, and drag does it with a pointer.
- **New records** (Drak, 2026-10-25): in place, by title. Each part and chapter ends with its own + line, + Scene at the end of a chapter and + Chapter and + Scene at the end of a part, and the tab's top has + Part / Act, + Chapter, and + Scene for the story's own level. A + adds a row there with its title box open; Enter keeps it, and the details wait for its page.
- **Numbering** (Drak, 2026-10-25): acts I, II, III through the story; chapters 1, 2, 3 through the whole story, not starting over in each act; scenes A, B, C within their chapter, or within their act or the story when they sit outside a chapter; beats i, ii, iii within their scene. Every number is worked out from the position and never stored, so a move renumbers what follows.
- **Folding** (Drak, 2026-10-25): acts, chapters, and scenes fold, a scene folding away its beats, and a folded row keeps its number and counts. The browser keeps each fold with the app's display settings, and view and edit share them.
- **Beats in the outline** (Drak, 2026-10-25): each scene's beats are rows under it, edited where they sit. + Beat at the end of each scene adds one with its text box open, ↑ and ↓ move a beat within its scene, and drag can move it to another scene. The scene's page shows the same beats in its Beats field. At r011's pass (Drak, 2026-10-26) a beat took What Happens, what needs to happen in it: the outline shows it under the beat's line, and a click on a beat opens both for editing in place. Beats sit in under their scene's title, with a rule down their left side, so they don't read as scenes.
- **A row opens its record** (r011's pass, 2026-10-26): a click anywhere on an act's, a chapter's, or a scene's row, outside its fold and its arrows, opens the record's page, as a click on People's rows does, and Enter or Space does the same on a focused row.
- Parts, chapters, and scenes open on pages of their own over the story's page, as People's records do, so a reference to a scene opens it (section 3).
- **A record's position** (Drak, 2026-10-26, for v1.7's r012): an act's, a chapter's, or a scene's page says where it sits, between its kind and its updated date (SCENE · II.4.A · UPDATED), the act in Roman numerals, then the chapter, then the scene's letter, joined by dots. A chapter reads II.4 and an act II; a scene straight under an act reads II.A, one at the story's own level A, and a chapter outside any act 4. A reference to one reads the same way ("II.4.A dddd"), and a picker that offers scenes lists them in the outline's order, each with its position, where it listed them by name. The position is worked out from the outline each time it's drawn, as every number is. Done as r012 (2026-10-26), with one call of the cut's own that Drak passed: a chip draws the position quieter than the name, as the outline draws its numbers, since a story-level scene's chip read "A Prologue" without it; a picker's options are plain text, so there the position and the title share one weight.
- **What r011's staging chose, passed by Drak** (2026-10-26): the story-level button reads + Part / Act, and the delete's messages call the record a part; a row shows its details to the right of its title, an act its chapters and scenes, a chapter its POV, status, and scenes, and a scene its POV, status, and beats, with a POV taken from the chapter marked (chapter's); a beat's × and a beat emptied of both its line and its What Happens delete it at once, with no question; a record comes in by its title alone, with no draft, and its details wait for its page; deleting an act or a chapter that holds anything also says what points at what it holds, which Delete everything clears; Esc and a click outside cancel that question, and Enter takes Move up; in What Happens Enter starts a new line and Ctrl+Enter keeps the edit; and a scene with no beats still shows its + Beat.

## 8. The Fabula timeline

- **Scope:** one story, or a whole corpus, picked at the top.
- **Modes:** story time places scenes by their When in your calendar; telling order places them by their position in the outline; a third mode plots one order against the other, where a straight-told book draws a straight line and every flashback or jump breaks it. Fabula is narratology's word for the events in the order they happened, as against the order they're told, so the view's name is this mode's subject.
- **Lanes:** by POV (a scene's own, or its chapter's when it has none), by thread, or by arc.
- **Marks:** plot points as markers, chapters and parts as bands in telling order, threads' Timespans as spans.
- **Undated scenes** appear in the telling-order modes and wait in a tray in story-time mode.
- **Kept apart:** it shows only Fabula's records and Fabula's threads, and nothing it adds appears on Chronometric.
- **The cost.** Chronometric's tick, lane, and band math lives inside `ChronometricsView` (`19_chronometric`), one component of about a thousand lines. Reusing it means first pulling that math out into functions that take events from any source, a refactor that keeps behavior but not bytes, so the parity gate can't check it; it needs its own check that Chronometric draws the same world identically before and after, at every zoom level. Skipping the extraction makes Fabula's timeline a second engine to keep alive.

## 9. Where Fabula meets the rest of the app

- **Wiki-links** resolve to entries and celestial bodies (`InlineWikiLinkText`), so Fabula's records aren't wiki-link targets in v1.7. Threads and motifs, as entries, are.
- **Backlinks** (Pipes item 1): an entry's Referenced by list includes the Fabula records that point at it, so a character shows its cast records and scenes.
- **Search and the query layer** cover entries. Fabula filters its own lists by status, POV, thread, and the like.
- **Concordance:** behind one Fabula toggle in its filter (section 3), with edges for the links: a story to its threads and themes, a cast record to its character, a scene to its POV, participants, setting, and threads, an arc or a relationship to its cast, a plot point or a promise to its scenes, a research note to what it applies to and the scenes it's used in. Since v1.7's r009 a story's, a cast record's, an arc's, and a relationship's edges are drawn, and since r011 a scene's; the rest come with their records.
- **A deleted entry:** the delete confirmation first says what the delete will remove, counted by the same scan as backlinks, across entries and Fabula alike ("removes her from 4 entries, 2 cast records, and 9 scenes"); today it's a bare `Delete "Aria"?` prompt. Then Fabula's references to the entry are cleaned out the way entries' are (`scrubEntryRefs`), with one exception: a cast record whose character is deleted stays, marked "character deleted", with its role, voice, arcs, and relationships intact, to relink or delete by hand. Stemma's linked nodes still turn orphan as they do now. The cleaning and the kept cast record came with People, v1.7's r009, and cover deleting a template with its entries as well (Drak, 2026-10-25), and a deleted body leaves Fabula's fields the same way; the count waits for backlinks.
- **Exports:** the world JSON carries `state.fabula`, as the save file must. Fabula's records stay out of the world's HTML and Markdown exports. Fabula has its own export instead, in HTML and in Markdown, for one story or a whole corpus, with the include-secrets choice the other exports offer: the panels, cast, arcs, relationships, outline with its beats, plot points, and promises. The Markdown version is the story bible.
- **Entry import and export** (Pipes item 9) moves entries only; Fabula's records don't ride in `cartulary_entries_export`.
- **Lock and secrets:** Lock Mode blocks Fabula's edits, and the secrets toggle hides its secret fields, as everywhere else.
- **Help and site:** a Fabula topic in the in-app help and a Fabula page on cartulary.world, and the JSON Save File Schema topic and the site's JSON Structure page document `state.fabula`, written against the component.

## 10. Cut plan (an estimate)

Other on multi-selects went in first, as v1.7's r005 (2026-10-25), since four of the field lists use it.

1. The slice, `migrate()`'s empty default, and the seeded schemas, with no UI and no registry entries: done in v1.7's r006 (2026-10-25). The code grows inside `27_trunk` until the view is in, then a carve gives Fabula a module of its own (Drak's call), since the edit gate refuses a cut that adds a file. The view has been in since r008, and r009 went into `27_trunk` too. The carve, done as v1.7's r010 (2026-10-25), made it one file, `28_fabula.jsx`, which every later Fabula cut edits, to be split into a folder at its section headers once Fabula is finished (Drak, 2026-10-25).
2. The view, before the builder (Drak, 2026-10-25: the help lines get reviewed in place while every schema still follows the seed), in two cuts. v1.7's r007, done (2026-10-25): the registry entries, Concordance's single Fabula toggle, and a builder that offers only sources marked eligible (section 1), with the sidebar entry, the index, and the corpus page. v1.7's r008, done (2026-10-25): the story page, its section tabs, and the Story tab's own fields and four panels (the calls are in sections 3 and 4).
3. People: cast, arcs, relationships, ahead of the builder (Drak, 2026-10-25: the fields get some use first, and People's help lines are read in place while its schemas follow the seed). v1.7's r009, done (2026-10-25), with section 9's cleaning for a deleted entry (the calls are in sections 3, 4, and 9; the arc's Cast came in at its pass, section 1).
4. Outline: parts, chapters, and scenes with their beats, ordered by drag and keyboard. v1.7's r011, done (2026-10-26; the calls are in section 7, and its pass's in section 1). A record's position, on its page, in a reference, and in a picker, came next as v1.7's r012, done (Drak's addition, 2026-10-26; section 7).
5. Plot: plot points and structures; promises and payoffs with the unpaid-promise flag. v1.7's r013, done (2026-10-26; the calls are in sections 4, 6, and 12, and its staging's in section 6).
6. Notes: the story's research notes. v1.7's r014, done (2026-10-26; the calls are in section 4, and the defaults and its staging's in 5.11). This item held Plot Thread's and Theme / Motif's move under Fabula as well until the plan split it out (Drak, 2026-10-26).
7. Meaning: the themes and motifs the Premise panel lists, a cut of its own (Drak, 2026-10-26), v1.7's r015.
8. Plot Thread and Theme / Motif moved under Fabula, with a plan of its own, v1.7's r016 (Drak, 2026-10-26). Until then a thread opens on the entry page, and Back returns to the Plot tab.
9. The Template Builder learns Fabula's kinds and the core lock, once every kind's records have had some use (Drak, 2026-10-25: after Outline, Plot, and Notes, so no schema can be edited before its form has been used, r009's lesson).
10. Chronometric's math extracted, checked unchanged.
11. The Fabula timeline.
12. The kept cast records, Fabula's HTML and Markdown export, the help, and the site.

Letters comes before Pipes in v1.7 (Drak, 2026-10-24), so the two pieces of this spec that ride on backlinks' scan of incoming references, an entry's Referenced by list showing its Fabula records and the delete confirmation's count, land with backlinks (Pipes item 1), which is then built once over entries and Fabula together. Until then a delete cleans Fabula's references and keeps cast records as section 9 says, without the count.

About ten cuts, the first estimate; r006 through r014 took nine, with r012's addition and the carve among them, and r015 and r016 are planned. The extraction and the timeline are the least certain.

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
6. **The field lists:** decided (Drak, 2026-10-25), all fifteen tables passed one per message, in his format; section 1 has what the review changed. Five calls came first (section 1): Other on multi-selects, built for every template; built first, as r005; typed values saved as more strings in the same list; Brainstorm out until Stemma v2; and the registry entries with the first screen.
7. **Thread pickers:** decided (Drak, 2026-10-26, for the Plot cut). A scene's, a plot point's, and a promise's Threads offer every Plot Thread, the story's own listed first, and the Plot tab lists, marked, any thread the story's records use that the Story's Threads doesn't, with a button that adds it there, so nothing changes the Story without a click. The other ways were only the story's threads; every one, with a pick from outside the story's list added to it, Claude's first lean, which has a scene's save write to the Story; and every one as before, which leaves the Plot tab short of what the story uses.

## Sources

- Savannah Gilbo, "First Draft Roadmap: 10 Steps to Writing A Novel For Beginners": https://www.savannahgilbo.com/blog/how-to-write-a-novel
- Reedsy Studio, character templates: https://reedsy.com/studio/templates/category/characters
- Reedsy Studio, protagonist template: https://reedsy.com/studio/templates/protagonist
- Reedsy, "How to Outline a Book": https://reedsy.com/blog/how-to-outline-a-book/
