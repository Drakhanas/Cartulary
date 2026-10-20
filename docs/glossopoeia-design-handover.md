# Cartulary v1.5: Glossopoeia Schema Reference (core view complete; Phase 2 complete and browser-verified through r122, diachronics apex shipped, 2026-06-23)

This is the schema source of truth for the Glossopoeia view: every workspace's field/type table, with a BUILT vs LOCKED-NOT-BUILT marker on each. The handoff (`handoff.md`) holds the state, architecture, verified engine contracts, and next steps; this doc holds the schemas.

**Terminology in these tables.** "Longform" means a big text box; as built it maps to the **`textarea`** field type (rich text: wiki-links + images), NOT the r086 `longform` plain-text type. "Dropdown" = `select`; "· Other+" = `otherTextField: true` (auto-injects an Other option + a custom-text input); "Multi-select" = the `multiselect` type; "Entry Reference" = single `entry-ref`; "Entry Reference multi" = multi `entry-ref`; "Grid" = the `grid` type. "half" is documentary only — width is type-based at render, the authored flag is inert.

## 0. One-paragraph state

The core view is COMPLETE and **Phase 2 is complete and browser-verified**: every compute substrate and tier feature is built and confirmed in-browser, including the diachronics apex. **All eleven workspaces are BUILT (r095–r104)** and browser-verified. On top of them, Phase 2 shipped through r122: the **Word Pieces** group on the Lexeme (§4.0, a sanctioned second built-in group), the **IPA palette** (§4.10), a small-wins batch (§4.11), the **syllabifier** rewritten sonority-based at r112 (§4.9), the **phonotactic validator** (§4.12, r110–r111), the **word generator** (§4.13, r112), the **grammar/dictionary export** (§4.14, r113–r114), the **IPA rule engine** (§4.15, r115), a cleanup batch (§4.16, r116), **auto-paradigms** (§4.17, r117), the **morpheme matcher / assisted glossing** (§4.18, r118), and the **diachronics apex** (§4.19–4.20, r119–r121): engine split + Diachronic flag, fork clone, run + review diff. Eight node types register: ConLang, Lexeme, Phoneme, Grammatical Value, Affix, Word-Building Process, Inflection Class, Writing System. **Current build r122**, browser-verified. The r118–r121 browser pass ran 2026-06-23: r118/r119/r120 clean; r121 loaded to a black screen (a deleted ternary opener in GlossopoeiaView's render — see handoff §8), fixed at **r122** (one line restored), which browser-confirmed good and completed the apex pass. So r118–r121 are verified, r121 via the r122 fix. Outside Glossopoeia: Ephemeris BA rows, then cartulary.world. Two whole-language **import artifacts** were delivered (Ethlinde; Gutter Elf as a `varietyOf`, rebuilt to 177 records at r115, now 178 after the §9 apocope split) — §14; they are data files, not part of the HTML. Both decisions from the Gutter Elf rebuild are resolved (§9): apocope narrowed to {e, a}; parent-inventory fallback declined.

---

## 1. Standing principles (apply to all remaining workspaces)

1. **Maximalist scope.** Drak's three conlangs are the floor, not the ceiling. Support anything that exists in linguistics whether or not his languages use it. "If it exists, add it."
2. **Professional accuracy.** IPA for phonology, standard typological terms, Leipzig glossing in the Corpus.
3. **Typology fields are closed sets with no reflexive Other+.** Opposite of Cartulary's in-world Type/Status fields, which keep Other+. Genuinely open categories (phonological process types, grammatical-feature category names, pronoun types, word-building methods) may keep Other+; fixed typological inventories (places of articulation, alignment, word order) do not.
4. **`tags` and `group` field types stay user-only — with two sanctioned exceptions.** The Lexeme **Senses** group (§4.0) was the first; **r106 added the Lexeme Word Pieces group** (§4.0) as a deliberate second exception (the one-group doctrine was waived by Drak with the cost weighed — see §4.0). Their subfields are frozen on ship. This does NOT generalize further — no other view or built-in template may use `group` or `tags`. The `multiselect` type is the built-in-safe stand-in for fixed-set multi-pick; `tags` is never used in a view.
5. **Rules execute where the fields can carry them; the rest stay documentary** (updated r115). The original principle was "rules are documentary, not executed," with the engine deferred. r115 built the engine: Phonological Rule records run via slot notation (§4.15). The documentary half still holds for what the fields can't express. A phonological rule the notation can't carry (stress-keyed, lexical truncation) stays a prose note the engine skips; a phonotactic constraint whose pattern isn't machine-readable shows "not auto-checked" (§4.12); a paradigm cell that's a stem change rather than an affix shows its instruction text (§4.17). So "documentary for what can't be executed" is now the consistent rule across constraints, sound rules, and paradigms, not a blanket deferral.
6. **Workflow.** Schemas are proposed as halfwidth-monospace three-column tables (Label / Type / Notes). Drak returns a reordered version; pairing is re-verified; then locked. "Proceed"/"go"/"yes" is a one-word execute signal. Every Glossopoeia entity except ConLang carries a `langId` to its parent ConLang, assigned by the selector, so it is not listed per-schema below.

---

## 2. The view: Glossopoeia

**Architecture.** A VIEW with its own state slice (`state.glossopoeia`), like Ephemeris — NOT templates in `BUILTIN_TEMPLATES`. Entities render through the existing `EntryForm` with per-type schemas built in code. Node types register through `NODE_SOURCE_REGISTRY`. See handoff §1.

**Shape.** A flagship core view, multi-workspace, grouped collapsible nav (group labels above short child names), a language selector at the top scoping the view to one ConLang. Cross-language references (cognates, descended-from) deliberately cross that scope.

**Workspaces (11).** Group headers Phonology and Grammatica are NOT workspaces.

```
Overview                    BUILT       ConLang container editor
Phonology: Inventory        BUILT       data-entry (Phoneme)
Phonology: Phonotactics     BUILT       data-entry (4 documentary components)
Morphology                  BUILT       data-entry (4-entity toolbox)
Noun Number                 BUILT       display (number side of the toolbox)
Pronouns                    BUILT       data-entry (Pronoun Set)
Verbs                       BUILT       display (verb side of the toolbox)
Grammatica: Syntax          BUILT       data-entry (documentary)
Grammatica: Complex Structures   BUILT   data-entry (documentary)
Lexicon                     BUILT       data-entry (Lexeme); folds in naming/onomastics
Orthography                 BUILT       data-entry (Writing System / Grapheme / Spelling Rule), text-only
Corpus                      BUILT       data-entry (interlinear glosses)
```

- The nav glyph for the view is **"α"** (LOCKED, not a placeholder).
- The "Grammatica:" prefix scopes only Syntax and Complex Structures.
- Naming / onomastics folds into Lexicon, not its own workspace.
- Orthography ships text-only. Visual script assets (Scrap's glyph chart and TTF) are the single deferred carve-out; the world-scoped asset subsystem stays out of v1.

---

## 3. The container: ConLang (BUILT — supersedes Language / Glossary)

ConLang replaces the built-in **Language / Glossary** template by **supersede-and-migrate** (shipped r093, DESTRUCTIVE). Registers as a node type (`SYNTH_TPL_CONLANG="__conlangs__"`, label "ConLang"). Records live in `state.glossopoeia.conlangs`. Entry name = the language's display name.

**Migration** (`state.migrations.languageGlossarySupersededV15`, idempotent, lossless, IDs preserved) routes old entries by Entry Type: language-overview/dialect/naming-convention → ConLang (a dialect's parent goes in **Variety Of**); word/term/phrase/idiom → Lexeme; glossary-term/Other/missing → Lexeme. Single-language worlds auto-assign all words a langId; multi/zero → Unassigned bucket. Five external templates re-point their language refs to ConLang (Character, Location, Culture/People, Document, Race). See handoff §3 for the field-carry and the singular-refTemplateId gotcha.

**ConLang schema (locked, as shipped — 13 fields).**

```
Other Names          Short Text          half
Status               Dropdown · Other+   half · option list carried verbatim from the old Language/Glossary template
Autonym              Short Text          half · the language's name for itself
Autonym Meaning      Short Text          half
Morphological Type   Dropdown            half · closed {Isolating, Agglutinative, Fusional, Polysynthetic, Templatic/Nonconcatenative, Mixed}
Alignment            Dropdown            half · closed {Nominative-Accusative, Ergative-Absolutive, Tripartite, Active-Stative, Mixed}
Basic Word Order     Dropdown            half · closed {SOV, SVO, VSO, VOS, OVS, OSV, Free}
Variety Of           Entry Reference     half · -> ConLang (the dialect hook)
Descended From       Entry Reference     half · ADDED r120; -> ConLang; the ancestry edge (evolved-from), set by a fork; distinct from Variety Of (dialect/register at the same time depth); draws parent -> child in Concordance
Cultural Position    Dropdown · Other+   half · option list verbatim from old template
Cultural Reach       Dropdown · Other+   half · option list verbatim from old template
Spoken By            Entry Reference multi   full · -> Culture/People, Race, Faction
Region               Entry Reference multi   full · -> Location
Overview             Longform (textarea)    full
```

Status / Cultural Position / Cultural Reach reuse the verbatim option lists from the old Language/Glossary template (carried into the schema at build; identical sets are what let the supersede carry those values direct). **Overview is `textarea` (rich longform), NOT `longform`** — corrected during chunk 1.

---

## 4. Locked schemas

### 4.0 Lexicon (Lexeme) — BUILT

The Lexicon workspace is a hand-rolled list-detail (NOT `GlossEntityList`) because it carries the **Unassigned bucket** (orphan Lexemes with `langId` null from the supersede; selector option "Unassigned (N)", per-word "Move to language" control, New disabled in Unassigned). Lexeme registers as a node (`SYNTH_TPL_LEXEME="__lexemes__"`, label "Lexeme"); records in `state.glossopoeia.lexemes`. Entry name = the word/headword.

```
Pronunciation    Short Text          half
Part of Speech   Dropdown · Other+   half · {noun, verb, adjective, adverb, pronoun, adposition, conjunction, particle, numeral, determiner, interjection, classifier, proper noun (name)}
Unit             Dropdown            half · closed {word, phrase, idiom}
Status           Dropdown · Other+   half · {in use, archaic, coined, reconstructed, proposed}
Senses           Group               full · repeating; the sanctioned built-in group (subfields frozen):
    · Gloss          Short Text
    · Definition     Longform (textarea)
    · Part of Speech Dropdown · Other+   (POS list, per-sense)
    · Register       Dropdown · Other+   {neutral, formal, informal, slang, archaic, poetic, taboo, technical}
    · Example        Short Text
Name Type        Dropdown · Other+   half · showWhen Part of Speech = proper noun (name); {given, family, place, divine, title/epithet, people-group}
Name Meaning     Short Text          half · showWhen Part of Speech = proper noun (name)
Name Elements    Entry Reference multi   full · showWhen Part of Speech = proper noun (name); -> Lexeme
Irregular Forms  Grid                full
Origin           Dropdown · Other+   half · {native, derived, borrowed, coined, onomatopoeic, unknown}
Derived From     Entry Reference multi   full · -> Lexeme
Source Word      Entry Reference multi   full · -> Lexeme (loan source)
Cognates         Entry Reference multi   full · -> Lexeme (cross-language; the supersede maps old Related Terms here)
Descended From   Entry Reference multi   full · ADDED r120; -> Lexeme (cross-language); the parent word a daughter form evolved from, set by a fork; usually one etymon (multi only for a merger); distinct from Source Word (borrowing) and Derived From (within-language); draws source -> daughter in Concordance
Built By         Entry Reference     full · -> Word-Building Process / Affix (LANDED r096)
Word Pieces      Group               full · BUILT r106; the SECOND sanctioned built-in group (one-group doctrine waived). Empty = single-piece root (most words). Subfields:
    · Sounds         Short Text          ipa · the piece's IPA (nu / rawt / el)
    · Role           Dropdown · Other+   {linker, prefix, root, suffix}; Root = where stress lands
    · Affix          Entry Reference     -> Affix; optional, fill only on an affix piece
Notes            Longform (textarea)    full
```

**Word Pieces (r106)** stores how a built/compound word splits into its pieces, in order, so the syllabifier can see the seams (it won't pull a consonant across one) and which piece is the root (Ân-lâna stress + Fire-stop weight ride the root). It is the **second** built-in `group` after Senses — the one-group rule was waived deliberately (precedent: built-in views get groups when warranted; cost: per-word entry friction vs. the per-piece Affix edges into Concordance + clean syllabifier input). All three ref walkers (Concordance graph, delete-scrub, the r104 import relink `glossDeepRemap`) descend into group subfields, so the Affix subfield produces a Lexeme → Affix edge and remaps on language reimport; a *cross-language* Affix ref in a piece dangles on reimport (same limit as grid cells). When Word Pieces is filled, the plain Pronunciation is the pieces joined with seams dropped. The **syllabifier readout** (§4.9) shows above the form, computed from Word Pieces (or Pronunciation); its per-word override is saved on the record but is NOT a schema field and is not exported.

**Computed readouts stacked on the Lexicon word (none are schema fields, none export).** As Phase 2 landed, the Lexicon word card grew several computed lines, all derived live and none stored on the schema: the **Syllables** split (§4.9, with its override), the **Surface form** after sound rules with a fired-rules toggle (§4.15, shown only when a rule changes the word), and the generated **Paradigm** table when an inflection class is set (§4.17). A collapsible **Generate words** panel sits atop the Lexicon list (§4.13). These are read-side features over the schema above, not additions to it.

**Three refs LANDED at r096** when the Morphology toolbox registered their targets: **Inflection Class** (-> Inflection Class), **Features** (multi -> Grammatical Value, inherent features like gender), and **Built By** (-> Word-Building Process / Affix) are in place at their locked positions. The Lexeme field order was reconciled to the signed-off order at r099 (the ref insertion had drifted; data-safe, keyed by id).

### 4.1 Phonology: Inventory (Phoneme) — BUILT

A **Phoneme** node type (`SYNTH_TPL_PHONEME="__phonemes__"`, label "Phoneme"; records in `state.glossopoeia.phonemes`). Entry name = the phonemic symbol. The **Class** field drives showWhen so only the relevant articulatory fields appear. A workspace-level romanization/pronunciation-key Longform is **BUILT (r095)**, stored per language at `state.glossopoeia.workspaceNotes[langId][workspaceId]` and rendered by the reusable `GlossWorkspaceNote` component at the workspace top.

```
Romanization     Short Text          half
Class            Dropdown            half · closed {Consonant, Vowel, Diphthong, Tone}; drives the rest

# Consonant (showWhen Class = Consonant)
Airstream        Dropdown            closed {Pulmonic, Ejective, Implosive, Click}
Manner           Dropdown            closed {Plosive, Affricate, Nasal, Trill, Tap/Flap, Fricative, Lateral Fricative, Approximant, Lateral Approximant}
Place            Dropdown            closed {Bilabial, Labiodental, Linguolabial, Dental, Alveolar, Postalveolar, Retroflex, Palatal, Velar, Uvular, Pharyngeal, Epiglottal, Glottal, Labial-velar, Labial-palatal}
Voicing          Dropdown            closed {Voiceless, Voiced}
Laminality       Dropdown            closed {Apical, Laminal}
Secondary Articulation   Multi-select   {Aspirated, Labialized, Palatalized, Velarized, Pharyngealized, Nasalized, Prenasalized, Glottalized, Rhotacized}
Release          Dropdown            showWhen Manner in {Plosive, Affricate}; closed {Released, Unreleased, Nasal release, Lateral release}
Syllabicity      Dropdown            closed {Non-syllabic, Syllabic}

# Vowel (showWhen Class = Vowel)
Height           Dropdown            closed {Close, Near-close, Close-mid, Mid, Open-mid, Near-open, Open}
Backness         Dropdown            closed {Front, Central, Back}
Roundedness      Dropdown            closed {Unrounded, Rounded}
Nasalization     Dropdown            closed {Oral, Nasal}
Tongue Root      Dropdown            closed {Neutral, Advanced (ATR), Retracted (RTR)}
Rhoticity        Dropdown            closed {Non-rhotic, Rhotic}

# Diphthong (showWhen Class = Diphthong)
Nucleus          Entry Reference     -> Phoneme (pick the vowel)
Offglide         Entry Reference     -> Phoneme (pick the vowel)
Diphthong Type   Dropdown            closed {Falling, Rising, Centering, Opening, Closing}

# Tone (showWhen Class = Tone)
Register         Dropdown            closed {Extra-high, High, Mid, Low, Extra-low}
Contour          Dropdown            closed {Level, Rising, Falling, Peaking, Dipping}

# Shared Consonant + Vowel (showWhen Class in {Consonant, Vowel})
Phonation        Dropdown            closed {Modal, Breathy/Murmured, Creaky/Laryngealized, Whispery}
Length           Dropdown            closed {Short, Half-long, Long}

# Always
Status           Dropdown · Other+   {Attested, Marginal, Reserved, Excluded}
Reason           Short Text          showWhen Status = Excluded
Examples         Short Text          freeform
Notes            Longform (textarea)
```

Note: Nucleus/Offglide reference Phoneme (the picker lists all phonemes; the user picks the vowel ones). A refFilter to Class = Vowel is a nice-to-have, not built.

### 4.2 Phonology: Phonotactics — BUILT (r095)

Four documentary components, each its own slice array + `GlossEntityList`. None register as nodes. Constraint and Rule reference Phoneme.

**Syllable Structure** (per-language spec)
```
Template            Short Text          half · e.g. (C)(C)V(C)
Onset Requirement   Dropdown            half · closed {Optional, Required}
Max Onset           Number              half
Max Coda            Number              half
Nucleus Types       Multi-select        full · {Vowel, Long Vowel, Diphthong, Syllabic Consonant}
Notes               Longform (textarea) full
```

**Stress** (per-language spec)
```
Type               Dropdown            half · closed {Fixed, Weight-sensitive, Lexical, Morphological, None}
Default Position   Dropdown            half · showWhen Type = Fixed; closed {Initial, Peninitial, Antepenultimate, Penultimate, Final}
Weight Criteria    Multi-select        full · showWhen Type = Weight-sensitive; {Long Vowel, Diphthong, Coda Consonant}
Secondary Stress   Dropdown            half · closed {None, Present}
Notes              Longform (textarea) full
```

**Phonotactic Constraint** (list)
```
Polarity      Dropdown            half · closed {Permitted, Prohibited}
Position      Dropdown            half · closed {Onset, Nucleus, Coda, Word-initial, Word-final, Word-medial, Any}
Applies When  Dropdown            half · ADDED r111; closed {Anywhere at this position, Only in a cluster}; showWhen Position in {Onset, Coda}; blank/default reads as "anywhere", no migration
Pattern       Short Text          half
Phonemes      Entry Reference multi   full · -> Phoneme
Notes         Longform (textarea) full
```

**How the validator (§4.12, r110–r111) reads this.** A **Prohibited** constraint is checked by reading the **Phonemes** link as set-membership: none of those linked sounds may sit at the Position, narrowed to a cluster (2+ consonants in that position) when **Applies When** = "Only in a cluster". If there's no link but the **Pattern** reads back as a literal run of defined sounds (`tl`, `θr`), it falls back to a sequence match. Resolution order: Phonemes link -> Pattern-as-sequence -> "not auto-checked". **Permitted** constraints are documentary (a lone Permitted record isn't a closed whitelist). The **Applies When** field exists because "k/g banned only in a cluster" couldn't be expressed otherwise; it was modeled as a field rather than inferred from the description wording.

**Phonological Rule** (list — diachronics reuses THIS schema with the Diachronic flag, r119; there is no separate Sound Change entity)
```
Rule Type           Dropdown · Other+   half · {Allophony, Assimilation, Dissimilation, Lenition, Fortition, Epenthesis, Deletion, Metathesis, Hiatus resolution}
Input               Short Text          half · the changing sound (executable spec, r115)
Output              Short Text          half · what it becomes; empty or ∅ = deletion
Environment         Short Text          half · slot notation (r115): _ the sound's spot, # a word edge, V/C any vowel/consonant, a letter a specific sound; blank = everywhere
Order               Number              half · rules apply in this order, each rewriting the string before the next (feeding/bleeding)
Application         Dropdown            half · closed {Obligatory, Optional, Variable}
Diachronic          Dropdown            half · ADDED r119; closed {Synchronic, Diachronic}; a Diachronic rule is a historical change a fork runs over a parent's words, SKIPPED by the synchronic surface-form readout; blank = synchronic, no migration
Affected Phonemes   Entry Reference multi   full · -> Phoneme
Notes               Longform (textarea) full
```

**These fields are now EXECUTABLE (r115, §4.15).** Unlike the phonotactic constraints, a rule's own Input -> Output / Environment fields are the machine-readable spec, so there's nothing to scavenge. `glossApplyRules` runs them in Order and shows a surface line on the Lexicon word. Scope: regular sound->sound or sound->∅ rewrites in a sound/V/C/# context. Insertion (empty Input / epenthesis), stress-conditioned, and lexical-truncation rules don't execute and stay documentary. The field help spells out the notation; the IPA palette is wired onto Input/Output/Environment. **r119 (apex):** the new Diachronic flag splits the two lifecycles — synchronic rules (living allophony) show on the surface line; diachronic rules (historical changes) are filtered out of it and are what a language fork runs (§4.19–4.20). `glossApplyRules` became a thin wrapper over a new core `glossRunRules(pron, rules, phonemes)` taking explicit args so the fork can run a child's diachronic rules over a parent's words against the parent's inventory.

### 4.3 Morphology: the four-entity toolbox — BUILT (r096)

Shared plumbing for grammatical features, the pieces that mark them, the non-affix word-builders, and the optional ending-groups. **No separate Grammatical Category entity** — Category is a field on the value. **All four register as nodes** (Built By makes Affix + Word-Building Process ref targets; Marks + the deferred Lexeme Features point at Grammatical Value; the deferred Lexeme Inflection Class points at Inflection Class). When these register, add the three deferred Lexeme refs (§4.0).

**Grammatical Value** (one entry per value: Nominative, Feminine, Plural). Entry name = the value.
```
Category     Dropdown · Other+   half · the feature it belongs to: case, gender, number, tense...
Short Tag    Short Text          half · gloss abbreviation: ACC, PL, F
Function     Short Text          half · one line on what it does
Word Class   Multi-select        full · parts of speech it applies to: noun, verb, adjective, pronoun
Notes        Longform (textarea) full
```
Word Class lets the Verbs display workspace gather everything verbal across categories.

**Affix** (one entry per attached piece). Entry name = the affix, like `-im` or `ka-`.
```
Position       Dropdown            half · closed {prefix (front), suffix (back), infix (inside), circumfix (wrapping)}
Job            Dropdown            half · closed {grammar ending (inflectional), builds a new word (derivational)}
Marks          Entry Reference multi   full · grammar endings: value(s) it expresses -> Grammatical Value
Adds Meaning   Short Text          full · word-builders: what it adds
Attaches To    Multi-select        full · which words it goes on: nouns, verbs, adjectives...
Notes          Longform (textarea) full
```
Marks and Adds Meaning are mutually exclusive on Job (showWhen). Marks is multi (a fusional ending can carry several values).

**Word-Building Process** (one entry per non-affix way of making words). Entry name = the pattern, like "Noun Compounding".
```
Method        Dropdown · Other+   half · {compounding, repeating (reduplication), reuse-as-is (conversion), stem change, root-and-pattern, blending, clipping}
How It Works  Longform (textarea) full · the recipe in plain words
Takes         Multi-select        full · kinds of words that feed in
Makes         Multi-select        full · kinds of words that come out
Example       Short Text          half · "fire + mountain = volcano"
Notes         Longform (textarea) full
```

**Inflection Class** (the optional ending-group). Entry name = the class, like "Class II Nouns".
```
Applies To   Multi-select        full · which words belong here
Endings      Grid                full · the table of forms; user labels rows/columns and fills endings
Example      Short Text          half · a sample member
Notes        Longform (textarea) full
```

### 4.4 Pronouns (Pronoun Set) — BUILT (r098)

Data-entry; pronouns are words. One entry per pronoun set, forms in a grid. No registration. Entry name = the set's name, like "Personal Pronouns".
```
Type           Dropdown · Other+   half · {personal, possessive, reflexive, reciprocal, demonstrative, interrogative, relative, indefinite}
Distinguishes  Multi-select        full · axes this set tracks: person, number, gender/class, case, clusivity, formality, animacy
Forms          Grid                full · the table of pronouns; user labels rows/columns and fills forms
Notes          Longform (textarea) full
```
Extra distinctions stack into grid rows (3sg-ensouled / 3sg-unensouled become two rows) and get flagged under Distinguishes.

### 4.5 Grammatica: Syntax — BUILT (r099)

Documentary. No registration. Field-level locked (full option lists in transcript 2026-06-19-22-02-43 §4; transcribe at build).

**Phrase Order** (per-language spec): Adjective Placement, Numeral Placement, Demonstrative Placement, Article Placement, Possessor, Relative Clause, Adposition Type, Notes — placement fields are dropdowns (before/after the noun, etc.).

**Sentence Marking** (per-language spec): Marks Core Roles By (dropdown), Verb Agrees With (multi-select), Agreement Features (multi-select), Word Order Rigidity (dropdown), Dropped Subject OK (dropdown), Dummy Subject (dropdown), Notes.

**Construction** (list): a generic per-pattern entry for marked sentence types (questions, negation, etc.); shape finalized at build from the transcript.

### 4.6 Grammatica: Complex Structures — BUILT (r099)

Documentary. No registration. Field-level locked (full option lists in transcript §4).

**Relativization** (per-language spec): Strategy, Relativizer, Gap or Resumptive, Verb Form, Roles You Can Relativize (multi-select), Restrictive vs Non-restrictive, Example, Notes.

**Clause Linking** (list): how clauses join (coordination, subordination types); per-entry, shape finalized at build.

### 4.7 Orthography — BUILT (r100, text-only)

Ships text-only (no glyph assets in v1). Writing System registers as a node; Grapheme and Spelling Rule do not. Grapheme and Spelling Rule reference Phoneme; Grapheme references Writing System. Full option lists in transcript §4.

**Writing System** (per-language): Type · Other+, Status · Other+, Direction · Other+, Word Separation · Other+, Letter Case, Numerals · Other+, Sentence End, Punctuation, Notes.

**Grapheme** (list): Belongs To (-> Writing System), Role · Other+, Romanization, Spells (multi -> Phoneme), Shape Note, Notes.

**Spelling Rule** (list): Sounds (multi -> Phoneme), Written As, When, Example, Notes.

### 4.8 Corpus — BUILT (r100)

Interlinear glossed example texts (Leipzig glossing). References Lexemes. No registration. The interlinear-gloss grid layout is the flagged construct to design carefully at build. Full shape in transcript §4.

**Corpus Entry** (list): Source/Text, Line/Order, Genre · Other+, Interlinear (Grid), Free Translation, Literal Gloss, Notes.

**Interlinear cell scoping (r116).** The Interlinear grid's reference cells are scoped to lexemes via a `cellRefTemplatesId` flag on the field, which `GridEditor` reads, so the picker offers words instead of every node in the world. It's the lexeme set across all languages, not active-language-only; active-language scoping needs `langId` filtering on registered nodes, which doesn't exist yet (deferred).

**Assisted glossing (r118, §4.18).** A "Gloss a sentence" panel sits atop the Corpus workspace: paste a sentence, gloss, and it creates a pre-filled Word / Parts / Gloss Example. It runs at the workspace level (it needs the lexicon, affixes, class endings, and existing corpus) and produces a new record rather than editing an open grid. Note: the matcher writes three tiers, while the hand-built Gutter Elf corpus examples use two (Form / Gloss), so new glosses look different from the old ones.

### 4.9 Syllabifier — BUILT r109, REWRITTEN sonority-based r112 (keystone substrate)

`glossSyllabify(rec, g)` is a pure function; the generator and the phonotactic validator both ride it. **The rule (r112):** maximal onset keeps only the largest *rising-sonority* run as the onset and drops the rest into the coda, with sonority read from each Phoneme's **Manner** field; a consonant never crosses a Word-Piece seam. So `ranfir` splits `ran.fir` (n is a nasal, more sonorous than the following f, so it can't sit in that onset) and `atra` stays `a.tra` (a stop rising to a liquid is a legal cluster). **This replaced the original r109 rule** — plain count-based maximal onset, capped by `maxOnset`, with a coda held back only at a seam — which over-pulled on every non-seam case (`ranfir` -> `ra.nfir`) and seeded the lexicon with invented onsets. The over-pull was the cause of the generator's illegal output (§4.13), so the rule was reopened and reproved spike-first before the verified function changed. No per-language flag; both Ethlinde and Ân-lâna obey the one rule. Reads Word Pieces when present (the seams) else the plain Pronunciation; vowels/diphthongs are the centers (read off `class`/`syllabicity`); tokenization is longest-first against the Phoneme inventory so a two-symbol sound (`aɪ`, `t͡ʃ`) counts as one **only if defined as a phoneme**. UI: a read-only **Syllables** line in the Lexicon, tagged **auto**/**manual**, with an **override** box (type the split, it wins; Reset -> auto). The override **saves on the record but is NOT a schema field and is not exported**. Validated before the rewrite committed (r109 spikes preserved: `nu.rawt.el`, `te.rawt.el` at seams, `resto`/`verli`/`atra` unchanged; 114 of 599 Ethlinde splits corrected; the attested onset set collapsed from ~60 junk clusters to ~16 real ones). Browser-confirmed. **Effect on loaded worlds:** 114/599 Ethlinde words display a different split than before — that's the fix landing, not a regression. Limits: sonority is a general principle, not a language's exact cluster list, so a rising cluster the language forbids (`nr`, `nw`) can still appear (the deferred exact-cluster refinement would pin it by parsing the Permitted onset-cluster rule); readout is Lexicon-only; vowel clusters split until defined as a Diphthong phoneme; the lone Celeban-class inside-root miss (`ke.le.ban` vs `kel.e.ban`) needs the override.

### 4.10 IPA palette — BUILT (r107)

A `field.ipa` flag (text fields) and `schema.ipaName` flag (the symbol-as-name schemas) light up an "IPA" button that opens a palette: a **"This language"** row of the active language's phonemes first, then the full chart (consonants, other consonants, vowels, suprasegmentals, diacritics). Click to insert at the cursor; focus stays for chaining; combining diacritics show on ◌ but insert bare. Lives in `FieldEditor` ahead of `WikiLinkInput`, so **IPA fields drop wiki-link autocomplete**; the symbol list is computed once per active language and threaded through `GlossEntityList` / `GlossopoeiaView`. Flagged: Lexeme Pronunciation, Word Pieces → Sounds, Phonological Rule Input/Output/Environment, Phonotactic Constraint Pattern, Construction Marker, Clause Linking Marker, Relativization Relativizer; and the names of Phoneme and Affix. Not flagged: romanization fields, examples, Spelling Rule "Written As", the syllable template, grid cells.

### 4.11 Small-wins batch — BUILT (r108)

Five ergonomics fixes on the shared paths: **Duplicate** (deep-copy + "(copy)" + select, on every entity; in `sliceWriters` + the two hand-rolled writers), **ready-to-name** (empty create name; the five one-per-language cards keep their label), **palette close** on Esc/click-outside, a **filter box** on lists past 6 items (clears on language change), and **list subtitles** (phoneme romanization under the symbol, Lexeme pronunciation under the headword).

### 4.12 Phonotactic validator — BUILT (r110–r111)

`glossPhonotacticCheck` is a pure function next to the syllabifier. Against the selected word it reads the syllable split in effect (the override else the auto split), checks each syllable's consonants-before / consonants-after against the Syllable Structure's `maxOnset` / `maxCoda`, and flags a missing onset only when Onset Required is set (the coda check is the part the syllabifier didn't do). It runs **Prohibited** constraints by the resolution order in §4.2 (Phonemes link as membership -> Pattern-as-sequence -> "not auto-checked"), honoring the **Applies When** cluster flag; **Permitted** constraints are documentary. Output is a warning under the Syllables line in the Lexicon. **Warn only** — it never blocks a save and never edits the word. r110 shipped the check reading Pattern only and went silent on the whole Ethlinde import (the constraints stored their checkable data in the Phonemes link, not the prose Pattern); r111 fixed it to read the link as membership and added the Applies When field. Browser-confirmed.

### 4.13 Word generator — BUILT (r112)

The phonotactic check run backward: build a candidate from the language's phoneme inventory (weighted by lexeme frequency, uniform fallback when the lexicon is thin), syllabify and check it, keep it only if it's clean and novel. A generated word can't break an enforced rule. It lives in a collapsible **Generate words** panel atop the Lexicon list. Design (locked a/a): a **review list** (generate a batch, tick the ones to keep, kept become real Lexemes, the rest vanish) and a **user-set syllable range + count**. Each candidate carries an editable Pronunciation and an editable Name (best-effort romanization from each sound's romanization field). Dedup is on pronunciation within the active language, against existing words and the current batch, at generate time (not on Add, not across sibling languages, not on the romanized name). It depends on the r112 sonority syllabifier; on the old count rule it produced illegal clusters. Because a1 leaves the legal-cluster rules documentary, the generator can't read them, so it leans on the sonority syllabifier as a proxy and a sonority-legal-but-forbidden cluster can still slip through.

### 4.14 Grammar / dictionary export — BUILT (r113–r114)

A whole-language reference document, the rendering layer. Two buttons by the language selector, "Grammar .md" and "Grammar .html", each walking the active language in document order: container facts and overview, phonology (an inventory table from manner/place/voicing, plus syllable structure, stress, constraints, rules), morphology (values, affixes, word-builders, inflection-class tables), pronouns, syntax, complex structures, orthography, the lexicon as a formatted dictionary, the corpus as aligned interlinears. One block list rendered to either format; empty fields skipped, grids as tables, refs resolved to names, dictionary entries carrying pronunciation, the syllable split, senses, etymology, irregular forms. It's a **new builder**: the app's `buildMarkdownExport` / `buildHtmlExport` walk `state.entries`, so this reuses the field-render and grid helpers but iterates the 21 language arrays itself. The HTML reuses the entry export's theme path (`extractThemeVars()` into a var-driven `:root`), so the document carries the live theme (gold on near-black by default) and print flips to light (r114 fixed a first cut that exported plain black-on-white). Limits: plain-but-readable, not typeset (grammatical values and constraints are definition lists, not compact tables); inheritance isn't resolved, so a `varietyOf` child shows only its own records, not the parent's. Confirmed ("renderer is good").

### 4.15 IPA rule engine — BUILT (r115)

`glossApplyRules` runs a language's Phonological Rule records (§4.2) in Order against a word's phonemic string and produces the surface form, each rule rewriting the string before the next so feeding works (`keθare` -> `ketare` -> `ketar`). A "Surface form (after sound rules)" line shows on each Lexicon word with an "N rules fired" toggle tracing the chain; it appears only when a rule actually changes the word, so a language with no rules (Ethlinde) shows nothing. Environment is slot notation (`_ # V C ∅` + literal IPA, blank = everywhere), wired into the field help and reusing the IPA palette. Scope: regular sound->sound or sound->∅ rewrites in a sound/V/C/# context. Of Gutter Elf's seven rule records, five are executable — θ->t, the two diphthong collapses, and apocope (split into an /e/ rule and an /a/ rule, §9); vowel reduction (stress-keyed, and stress isn't in a bare phoneme string) and clipping (lexical truncation) stay documentary. Limits: insertion/epenthesis rules (empty Input) don't run yet; the grammar export doesn't show surface forms yet (Lexicon-only, like the syllabifier started). Node-validated against the real Gutter Elf rules and accepted. **r119 (apex):** split into a core `glossRunRules(pron, rules, phonemes)` taking explicit args plus this wrapper, which now filters out Diachronic-flagged rules so they don't show on the surface line; the fork (§4.19–4.20) calls the core directly.

### 4.16 Cleanup batch — BUILT (r116)

The three phase-two known-limits items, one r-bump: **inline paradigm tables** (Verbs and Noun Number render each inflection class's endings grid as a read-only table under its name, the name still a button to the Morphology card; this is the read-side step before §4.17); the **Corpus picker scoped to lexemes** (§4.8, the `cellRefTemplatesId` flag); and **singleton enforcement** (the `GlossEntityList` "+ New" button hides once a Syllable Structure / Stress / Phrase Order / Sentence Marking / Relativization exists for the language — it blocks a second create only, existing data untouched). This clears the known-limits list from §8.

### 4.17 Auto-paradigms — BUILT (r117)

Generate a word's full inflection table from its class's endings grid, the follow-on to r116's inline tables. The grids hold endings, so generation is stem + ending. Design (locked A/b1/C/D/E): **A** a grid cell is read as an affix (plain text appends, leading `-` stripped, trailing `-` prefixes, (base)/=/blank is the bare stem); **B->b1** a stem-alternation cell (parenthesized, not (base)) is a stem change, not an affix, and stays documentary, showing its instruction in dim italic to be overridden per-word, the same handling as the rule engine's prose rules (rejected b2, a stem-op notation); **C** the stem is the word's romanized headword (a separate stem field is a later add); **D** the lexeme's Irregular Forms grid layers on top of the generated table matched by row/column label and renders in the accent color, so a word that breaks its class wins; **E** shown on the Lexicon word under the surface line when it has an inflection class set, export deferred. Builder Node-tested against the real data (428 lexemes carry a class). Confirmed ("confirmed good"). Limit: the one stem-change cell type shows its instruction not a form; generated on the romanized headword, so no pronunciation-level paradigm.

### 4.18 Morpheme matcher / assisted glossing — BUILT r118 (browser-verified on r122)

`glossGlossSentence`, the last Glossopoeia build before the apex. A "Gloss a sentence" panel atop the Corpus workspace (§4.8): paste a sentence, gloss, and it creates a new Example with the interlinear pre-filled and auto-selected. It runs at the workspace level and produces a record rather than editing an open grid, because it needs the lexicon, affixes, class endings, and existing corpus (same architectural shape as the generator). Per-word fallback, in order: (1) a gloss already given to that exact word in another Example (the corpus is its own memory, no new state field, corrections carry forward); (2) a whole-word lexicon match on the first sense; (3) stem + ending, the longest lexeme headword the word starts with plus the remainder matched against inflection-class endings (from the row/column labels) and affix records; (4) blank. Output is three tiers, Word / Parts / Gloss (locked fork a, over a two-tier Word / Gloss). Honest limit: memory and whole-word matches are reliable; the stem+ending guess is wrong often on fusional words (`drevaen` could split `drevae+n` or `drev+aen`), which is the trap the phase-two doc names. The point isn't a correct auto-segmenter; it's that you fix each word once and the memory never re-asks. Node-tested across all four tiers; browser-verified on r122 (memory hits on the Gutter Elf corpus incl. the hyphenated street-on, whole-word hits on Ethlinde, the guess path on noronis aersar, blank on an unmatched word, new Example created and auto-selected).

### 4.19 Language fork — BUILT r120 (clone half, browser-verified on r122)

`glossForkLanguage(state, updateState, parentLangId, childName, flash)`, the first half of the diachronics apex. Clones a parent into a descendant: a new ConLang in the same world with the parent's phonemes and lexemes copied at fresh ids (lexicon + inventory only, the locked scope), the child's **Descended From** set to the parent and each daughter word's **Descended From** set to its parent etymon, the parent's typology carried as an editable starting point, and the parent-specific container fields (Variety Of, Spoken By, Region, Overview) cleared. The child starts phonetically identical to the parent; the run step (§4.20) derives the daughter forms. Internal word-to-word links (Derived From, Name Elements) remap to the child copies via `glossDeepRemap`; cross-language links to a third language (Cognates, Source Word) pass through unchanged; morphology annotations (Inflection Class, Features, Built By) are dropped, since the child has no morphology yet and they would otherwise dangle into the parent's toolbox and drive cross-language paradigm output. UI: a "Fork" button in the language bar (gated unlocked + active language), native prompt for the child name (the way Delete uses confirm). Both new `getEdges` (ConLang, Lexeme) emit a "descended from" edge, so the language family tree and word ancestry draw in Concordance with the existing intra-type machinery (no cross-type-edge work needed). Node-tested 31/31.

### 4.20 Diachronics run — BUILT r121 (browser-verified on r122; r121 had a render crash, fixed at r122 — handoff §8)

`glossDeriveDaughters(state, childLangId)` + `glossRomanize(ipaStr, phonemes)` + `glossApplyDaughters(updateState, childLangId, rows, flash)`, the second half. For each child word it finds the parent etymon via Descended From, runs the child's **Diachronic**-flagged rules over the PARENT's pronunciation through the r119 core `glossRunRules` (parent inventory as the input phonology), and romanizes the surface into a daughter headword (each phoneme's Romanization field; a phoneme with no romanization falls back to its symbol; a sound that isn't a defined phoneme passes through as raw IPA and flags the headword). It always derives from the stored parent form, so re-running never compounds — fix the rules, re-run, clean result. Rules that can't run automatically (blank Input — insertion, or a prose-only change) are listed and left out; words with zero or multiple parent words (a hand-set merger) aren't derived and are listed. UI: a "Run sound changes" button (shown only when the active language has a Descended From parent) opens a review modal (counts, an unrunnable-changes notice, a not-derived notice, a scrollable parent -> daughter list with changed rows highlighted and romanization-break rows flagged) with Apply or Cancel; Apply rewrites each derivable word's pronunciation and headword. Node-tested 18/18 and browser-verified on r122 (the regression reproduced the hand-built Gutter Elf daughter forms; feeding `keθare -> ketare -> ketar`, blank-input rules skipped, synchronic rules not run by the fork, idempotent re-run reading the parent). Note: r121 had a render crash (a deleted ternary opener in GlossopoeiaView), fixed at r122 — handoff §8. Limits: the child keeps the parent's full inventory (eliminated sounds sit unused until pruned by hand); re-running overwrites manual daughter-form edits by design (fix the rules, not the words); grammar/syntax/orthography aren't copied.

---


## 5. Display workspaces (Noun Number, Verbs) — BUILT (r097)

Both own no entries; they filter and lay out the Morphology toolbox by part of speech. Same nav and feel as a data-entry workspace; they only arrange data that lives elsewhere.

- **Noun Number.** Kept standalone at Drak's call ("vital importance") rather than a general "Nouns" workspace. Filters the toolbox by **Category = Number** and lays out the number system. Case and gender get no dedicated display; they live in the toolbox and are read there.
- **Verbs.** Gathers everything verbal via the **Word Class** tag on values, plus verb affixes (Attaches To) and verb inflection classes (Applies To).

Detailed layout is a build-time concern; design is settled.

**Updated r116/r117.** Both display workspaces now render each inflection class's endings grid as a read-only table under the class name (r116, §4.16), instead of only a link to the Morphology card. The name stays a button to the card. Separately, a word's full generated paradigm shows on the Lexicon word itself (r117, §4.17), not in these display workspaces.

---

## 6. Remaining build work

The core view is done and Phase 2 is done and browser-verified. Built and verified through r122: the syllabifier (§4.9, rewritten r112), the phonotactic validator (§4.12), the word generator (§4.13), the grammar export (§4.14), the IPA rule engine (§4.15), the cleanup batch (§4.16), auto-paradigms (§4.17), the matcher (§4.18), and the diachronics apex (§4.19–4.20), with the r122 render-crash fix. What's left, in order: **optional apex polish** (§8), then **Ephemeris BA rows** (BA-01/02/04), then **cartulary.world**. Both decisions are resolved (§9): apocope narrowed to {e, a} on the Gutter Elf import (two rules), and the parent-inventory fallback is declined. The morpheme matcher's own refinements (a stricter dedup, the active-language ref scope) are optional follow-ups, not blockers.

---

## 7. Build prerequisites (both satisfied)

- **Multi-select field type** — DONE. The `multiselect` type exists (full-width, array value with defensive validation, standard render/builder/migration/export). It is the built-in-safe fixed-set multi-pick (`tags`/`group` stay user-only, except the sanctioned Lexeme Senses group).
- **Language / Glossary supersede-and-migrate** — DONE (r093, §3).

---

## 8. Glossopoeia Phase 2 — BUILT (all-in-one), apex done as MVP

The candidate menu is settled. The direction, decided 2026-06-21, is **all-in-one**: build the compute substrates inside Cartulary. The discarded alternative was the **integration layer** (own the in-world graph, round-trip to Lexurgy for the sound-change math, import the result back as a child language) — the stronger argument on paper (Lexurgy is free and Turing-complete; the in-world population + family tree is the real moat, not the rule math), but Drak chose all-in-one and accepted the per-language QA burden a homegrown engine carries ("nobody escapes writing down a book's worth of data when conlanging").

**Substrate spine (everything rides this):**
- **Substrate-zero — word as phonemes + morpheme seams.** PARTIALLY DONE. Clean-IPA path satisfied (type IPA into Pronunciation; the romanization→IPA parser is deferred since the languages use clean IPA), and the seams are the **Word Pieces** group (§4.0, r106).
- **Syllabifier — DONE (§4.9), rewritten sonority-based at r112.** The keystone. Maximal onset keeps the rising-sonority run as the onset (sonority from Manner), drops the rest into the coda; the r109 count rule it replaced over-pulled. Both Ethlinde and Ân-lâna obey it, no per-language flag.
- **IPA rule engine — DONE (§4.15, r115).** Executes the phonological rules (allophony now, sound change for the apex). Slot notation; runs in Order; surface line on the word.
- **Rendering layer — DONE (§4.14, r113–r114).** Whole-language grammar/dictionary export, Markdown + HTML, themed.
- **Morpheme matcher — DONE (§4.18, r118).** Assisted interlinear glossing, corpus-memory + lexicon + stem-ending fallback. Browser-verified on r122.

**Tier features the substrates unlock — all built except the apex:** word generator into the dictionary (§4.13, the namer's tool), phonotactic validation (§4.12, warn not block), paradigm autogeneration (§4.17), auto-generated reference grammar (§4.14). The **sound-change applier across a whole language is the apex** (diachronics): BUILT r119–r121 (§4.19–4.20). It reuses the r119 engine core to fork a parent into a child language (lexicon + inventory scope) and derive daughter forms across the lexicon, with Descended From links at word and language level and the family tree in Concordance. Browser-verified on r122 (r121 had a render crash, fixed at r122 — handoff §8); optional polish (inventory auto-prune, per-word diff exclusion, stem-level paradigms) deferred.

**Competitive note (the architecture call that stays):** keep the paradigm rule mechanism and the IPA rule engine as separate rewrites over different data — the sound engine buys nothing toward paradigms. The in-world plays (cross-type Concordance edges; the apex diachronics that outputs a child language living in the same world with ancestry links auto-populated via Descended From and the family tree drawn — cognates are sibling links, not ancestor-descendant, so a single fork does not auto-create them) are the differentiator, true almost by construction since no standalone tool has a world to embed into.

**Limits cleanup (carry forward; two were fixed at r116):** cross-type Concordance edges are still not drawn (intra-type only); a cross-boundary ref inside a grid cell still does not relink on import. **Fixed r116 (§4.16):** the per-language specs no longer accept a second create (the New button hides once one exists), and the Corpus interlinear ref cells are now scoped to lexemes (cross-language, not active-language-only, which is the one remaining grid-picker refinement). Visual script assets / glyph images stay deferred (the world-scoped asset subsystem; gates Scrap; PolyGlot ships a logographic engine, so this is a single-file-architecture call, not a nobody-does-it call). New since r112: the syllabifier's sonority rule is a general principle, not a language's exact cluster set, so a forbidden-but-rising cluster can appear (the deferred exact-cluster refinement, §4.9).

---

## 9. Adversarial audit (read before trusting this doc)

- **r095–r122 are browser-verified.** r095–r109 confirmed via the full Ethlinde import; r110–r112, r113–r114, r117 confirmed; r115 and r116 were accepted on move-on (weaker than a reported click-through), then re-eyeballed clean during the r118–r122 pass. r118 (matcher), r119 (Diachronic flag), r120 (fork + descent edges), and r121 (run + diff) all browser-verified 2026-06-23 — r121 by way of the r122 fix.
- **r121 shipped a render crash; fixed at r122 (handoff §8).** r121 loaded to a black screen: a ternary opener was deleted from GlossopoeiaView's render, so the view threw on mount. Parse gate green, Node 18/18 green — neither catches a render break, because the Node harness runs the apex functions and never mounts the tree. Lesson on record: parse-green ≠ working, AND Node-green ≠ rendering; a structural JSX edit needs a browser load before handover. r122 restored the one line and browser-confirmed.
- **Apex regression hit its target (r122).** Forking Ethlinde and authoring the Gutter Elf changes (θ→t, ae→e, eɪ→e, apocope) as Diachronic rules reproduced the hand-built Gutter Elf daughter forms (keθare → ketar, moni → mon). Caveat: the match proves the engine runs the authored rules consistently and idempotently, not that the linguistics is right against the source — the hand-built file and the authored rules share the same apocope-breadth assumption (now resolved to {e, a}, §9, verified by a zero-result orphan scan; the broader engine-consistency-vs-source-correctness caveat still stands).
- **Cognates are sibling links, not ancestor-descendant (doc correction, r120).** Earlier phase-two/handoff text implied a fork would auto-link parent and child as cognates; that's wrong (the child IS the parent evolved). The fork sets **Descended From** (ancestry) only. Sibling cognates between two daughters of one parent are a separate, unbuilt operation.
- **The r109 syllabifier rule was reopened and replaced at r112.** A settled decision turned out to be the cause of the generator's illegal output, so it was reproved spike-first and swapped for the sonority rule (§4.9). Consequence: 114 of 599 Ethlinde words display a different split, so a loaded world looks different in the lexicon. That's the fix, not a regression.
- **TWO DECISIONS from the Gutter Elf rebuild, both RESOLVED 2026-06-23 (§14).** Apocope breadth: narrowed from broad `V -> ∅ / _ #` to `{e, a}` — two records (`e -> ∅ / _ #`, `a -> ∅ / _ #`), NOT one edit, because the rule Input takes one sound or a V/C class, not a vowel subset. {e, a} over {e, a, o} follows the rule's own note ("especially /e/ and /a/") and was verified safe: an orphan scan found zero hand-built Gutter Elf forms depending on broad dropping i/u/o, and the apex regression still reproduces the daughter set (10 of 126 GE words change under the narrow rules, was 15). Inheritance fallback: DECLINED — the per-file inventory copy stands; rather than make the four phonology functions walk a parent at runtime, any future hand-authored variety gets a one-shot copy-parent-inventory action that keeps the child self-contained.
- **The annex was caught up to r118 in this pass.** §4.0–4.8 schema tables and §2/§3 architecture are as-built; §4.9–4.18 cover the Phase 2 compute; the detailed engine contracts live in `handoff.md` §6/§7, which this annex points to rather than duplicates.
- **§4.5–4.8 (Syntax, Complex Structures, Orthography, Corpus) are now BUILT.** Their exact option lists live in the shipped code (pulled from transcript 2026-06-19-22-02-43 §4 at build time). The tables here remain the design reference; the code is the as-built source if they ever disagree.
- **"Locked schema" is fields and types, not final order.** Drak reorders before each build; re-verify pairing after.
- **Grid axes are free-text and cannot reference entries; only cells can.** Paradigm/pronoun/Corpus table row/column labels are typed by hand and do not pull from Grammatical Value entries. Accepted by design.
- **There are now TWO built-in groups: Senses and Word Pieces (r106).** The one-group rule was waived deliberately for Word Pieces. Do not generalize further into permission to use `group`/`tags` elsewhere in a view.

---

## 10. Communication note (do not skip)

Drak does not read linguistics or data-modeling jargon and was once lost entirely by a jargon-heavy reply. Present every Glossopoeia decision in plain words with examples from his conlangs (Ân-lâna agglutinative with evidentiality and no tense; Ethlinde/DPE fusional with four cases and an ensouled/unensouled split; Scrap glyph script). Avoid morpheme/exponence/paradigm/inflectional/derivational and entity/node/ref-able unless glossed. Standing style: candid, no praise, snark fine, no em dashes, banned adjectives.

---

## 11. Re-orient sequence (fresh chat)

1. Read `handoff.md` (state, architecture, verified contracts, setup, next steps), then this annex (schemas).
2. Set up per handoff §11 (copy the latest uploaded build — highest `Cartulary_v1*Working_r*.html`, currently r122 — rebuild the parse-gate, confirm PARSE OK, then load it in a browser before trusting it — see handoff §8).
3. The core view is complete and Phase 2 is built and browser-verified through r122, including the diachronics apex. Next action is **optional apex polish** (§8), then Ephemeris BA rows, then cartulary.world. Both decisions are resolved (§9): apocope narrowed to {e, a}, parent-inventory fallback declined.

## 12. Immediate next step

Phase 2 is browser-verified through r122; the apex is shipped. No verification work outstanding. Next is **optional apex polish** (§8: inventory auto-prune, per-word diff exclusion, stem-level paradigms, Source Word help text), the **two Gutter Elf decisions, both resolved** (§9: apocope -> {e, a}; fallback declined), then **Ephemeris BA rows** and **cartulary.world**. None of these is a prerequisite for the others.

---

## 13. Per-language import/export — BUILT (r104)

A language exports as a whole and imports as a new, independent language. Not a schema; recorded here because it's part of the view.

- **Export** (`exportConlangFile`): the ConLang plus every record across the 21 slice arrays carrying that `langId` plus `workspaceNotes[langId]`, written as `{slug}.conlang.json` (envelope `cartulary_conlang_export: 1`). `importWorld` refuses the envelope.
- **Import** (`importConlangPayload`): adds a new language with **fresh ids**; internal refs are rewritten by `glossDeepRemap`, a recursive walk that also fixes ids inside grid cells. **Cross-boundary refs** (Cognates / Source Word to another language, a dialect's Variety Of parent, a ConLang's Spoken By / Region to world entries) export as name pointers and **re-link by name** on import, dropping with a count if unmatched. **Always-new** on name collision (duplicates coexist; nothing existing is touched).
- **Locked calls** (Drak, 2026-06-21): fresh ids; name-relink for cross-boundary refs; always-new on collision.
- **Limits:** a cross-boundary ref inside a grid cell is not relinked (the within-language case survives via the deep walk); relink is only as good as the names.
- **Verification:** the DATA logic passed a Node round-trip of the extracted functions (fresh-world drop, same-world name-relink, grid-cell remap). The UI wiring (buttons, file picker, flash, locked gating) is browser-UNVERIFIED.
- **Field tooltips (r102):** every field across all 21 schemas (including the Senses subfields) carries a one-line `help` string shown as a dotted-underline tooltip, surfaced through the shared `FieldLabelText` (used by both `EntryForm` and `GroupEditor`). Edit a field's meaning here, update its `help` in the schema.


---

## 14. Ethlinde + Gutter Elf import artifacts (2026-06-22, no r-bump)

Two finished `.conlang.json` files were built from Drak's Dul Pantran Elven source docs to bulk-populate Glossopoeia via the **r104 import** rather than hand entry. **Data deliverables, not a change to cartulary.html**; they live in `/mnt/user-data/outputs/`. Each was tested through the real `importConlangPayload` in a Node harness (counts, ref integrity post-remap, grids intact, no placeholder-id leak) before delivery.

- **`Ethlinde.conlang.json` — 1 conlang + 744 records.** 29 phonemes / 1 syllable structure / 8 constraints / 1 weight-sensitive stress; 25 grammatical values / **19 affixes** (13 derivational + 6 archaic naming elements: tal-, -ion, -ien, -eas, -ynn, -eya) / 3 word-building / 4 inflection classes; **599 lexemes** (content roots part-of-speech-blank for lability, derivation wired); 5 pronoun sets (52-form paradigm); phrase order + sentence marking + 9 constructions + coordination; relativization + 4 clause-linkings + comparison + causative; 1 writing system + 29 graphemes (each linked to its phoneme) + 4 spelling rules. Baked-in modeling calls: /e/,/o/ Close-mid, /r/ Trill, /eɪ/ offglide → /i/, long vowels + diphthongs are own phonemes, case endings are inflection-class grids not affixes. Naming elements wire `builtBy` for Cuthalion/Mithion/Andyrion/Darien/Firreas/Esselynn/Aireya (`-lynn`→`-ynn`, `tal`→`tal-` aliased).
- **`Gutter_Elf_conlang.json` — 1 conlang + 178 records, a `varietyOf` Ethlinde (REBUILT r115 at 177 records; apocope split to {e, a} 2026-06-23 brought it to 178; supersedes the 145-record original).** Originally a lean sociolect holding only what diverges, with the `varietyOf` link saying the rest is inherited — but that left it with zero phonemes, and a `varietyOf` is self-contained after import (no live inheritance), so the syllabifier, validator, generator, and rule engine all did nothing on it. The rebuild copied Ethlinde's 29 phonemes plus /p/ (loanwords use it) into Gutter Elf as its own inventory (30 phonemes), and rewrote the executable rules in slot notation (θ→t, ae→e, eɪ→e, apocope; the diphthong collapse and, later 2026-06-23, apocope each split into two rules since one rule takes one input — 7 rule records, 5 executable) with `affectedPhonemes` now on its own copied phonemes. Vowel reduction and clipping stay prose, documentary. 15 of the 126 slang lexemes change under the rules; the rest were already stored as reduced surface forms. Still carries the 2 relaxed constraints, 1 leveled pronoun set, 1 phrase order, 1 sentence marking, 1 word-building, 1 construction, 8 Corpus entries. In-world vocabulary kept verbatim. **Do not re-import the 145-record original.** Both decisions from this rebuild (apocope breadth, the general inheritance fallback) are resolved in §9.
- **Import order: Ethlinde FIRST, then Gutter Elf.** The sociolect's `varietyOf` and phoneme refs resolve by name against Ethlinde; into a world without it they drop silently. Scratch world first (the importer only ADDS, can't overwrite).
