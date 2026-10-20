# GLOSSOPOEIA: PHASE TWO

The parity list and the ambition list in one place, deduplicated. Where an ambitious item is an evolution of a parity item, the parity item is folded in as that build's first milestone rather than listed twice. Two merges happened: the plain export became the first stage of the auto-grammar, and the readout-display fix became the first stage of auto-paradigms.

Each item carries four things: a plain description, what the field already does (fact), a verdict on whether it impresses or is merely expected (opinion), and the effort plus dependency. Everything here is client-side. None of it needs a server, so all of it fits the single-file local model. Your time is the only limit.

---

## STATUS (as of r122, 2026-06-23)

All four substrates are built, every Tier 2 feature is built, most of Tier 1 is built, and the apex (Tier 3) is built and browser-verified through r122. Phase 2 is complete. Four Tier 1 items were never built (still optional). (r121 shipped a render crash that r122 fixed; the apex browser pass completed on r122.)

Done:
- **Substrates:** syllabifier (r109, rewritten sonority-based at r112), IPA rule engine (r115), morpheme matcher (r118, browser-verified r122), rendering layer (r113–r114). The separate paradigm rule mechanism is also done (r117).
- **Tier 1:** IPA input helper (r107), filtered grid pickers (r116), singleton enforcement (r116), paradigm readouts show their grids (r116), plain dictionary/grammar export (r113–r114, which became the full grammar export).
- **Tier 2:** word generator (r112), phonotactic validation (r110–r111), allophony/surface-form derivation (r115), auto-paradigms (r117), auto-generated reference grammar (r113–r114, see caveat), assisted interlinear glossing (r118).
- **Tier 3 (the apex):** integrated diachronics (r119–r122, browser-verified). Fork a parent (lexicon + inventory), author Diachronic sound rules on the child, run them to derive daughter forms; Descended From links populate at word and language level and the family tree draws in Concordance.

Not built:
- **Lexicon import (CSV/wordlist) + Swadesh starter** (Tier 1). The r104 import is whole-language `.conlang.json`, the bulk-population path, not a new-user door. Still the small-door problem.
- **Concordance cross-type edges** (Tier 1). Still intra-type only.
- **Romanization → IPA transliteration** (Tier 1). Deferred by choice; the languages use clean IPA.
- **Lexicon statistics** (Tier 1). Never built.
- **Apex polish** (Tier 3 follow-ons, optional). Auto-prune the child's inventory of eliminated sounds; per-word exclusion in the run diff; stem-level (not just headword) paradigms after a fork. The MVP shipped without these.

Caveat on the reference grammar: it shipped plain-but-readable, not the typeset "published-grammar-quality" the Tier 2 verdict promised. Grammatical values and constraints render as definition lists, not compact tables. The artifact exists and covers every section; the typeset polish is a later pass.

Two decisions from the Gutter Elf rebuild, both resolved 2026-06-23 (handoff/annex §9): apocope narrowed to {e, a} (two rules); the parent-inventory fallback declined (per-file inventory copy stands).

---

## KEYS

Effort:
- **S**: a session or less, self-contained.
- **M**: a focused build, one feature or one substrate.
- **L**: multi-session, real design and build.
- **XL**: weeks of directed work.

Verdict:
- **Differentiator**: doing something the field does badly or not at all. This is where the reaction lives.
- **Table stakes**: the field has it and expects it. Its absence costs you; its presence impresses no one.
- **Hygiene**: internal correctness. Not a competitor comparison, just a fix that should exist.

---

## SUBSTRATES

Shared infrastructure. Several Tier 2 features are downstream of these. All four are now built; the dependency notes below are kept as the record of what rode on what.

- **Syllabifier and phonotactic model.** DONE. The syllabifier shipped r109 and was rewritten sonority-based at r112 (it keeps the rising-sonority run as the onset, sonority read from each Phoneme's Manner, replacing the count-based rule that over-pulled). The phonotactic model shipped as the validator (r110–r111). Together they unlocked the word generator and phonotactic validation.
- **Ordered IPA rule engine.** DONE (r115). `glossApplyRules` applies the Phonological Rule records in Order to a phoneme string, slot notation for the environment, regular rules only. One engine, two uses: allophony now (the surface line), diachronic evolution later (the apex).
- **Morpheme matcher and glosser.** DONE (r118, browser-verified r122). Longest-match against Lexeme and Affix forms, human-in-the-loop, corrections persist as corpus memory. Full automatic segmentation of fusional morphology was treated as the trap it is.
- **Rendering layer.** DONE (r113–r114). Walks the structured fields plus the lexicon and corpus, emits themed HTML and Markdown, print-to-PDF. The plain export and the full grammar were one build.

Separate note, not a substrate: **paradigm generation needed its own morphological rule mechanism** (stem plus affix per cell, with stem alternations), not the IPA rule engine. DONE (r117): the cell-as-affix builder over the headword stem, with documentary stem-alternation cells and Irregular Forms overriding. As predicted, the sound-change engine bought nothing toward it; they were different rewrites over different data.

---

## TIER 1: SHIP WITHOUT NEW INFRASTRUCTURE

The attainable floor. Mostly S to M, no substrate required. This is the set that stops Glossopoeia reading as unfinished.

**Lexicon import (CSV / wordlist) plus a Swadesh starter.**
Status: NOT BUILT. The r104 whole-language `.conlang.json` import is the bulk-population path, not a CSV/Swadesh new-user door.
Ingest an existing lexicon from a spreadsheet, and hand new users a Swadesh list to fill.
Field has: PolyGlot and CWS both ship Swadesh lists and lexicon import; PolyGlot also imports from Excel and CSV.
Verdict: Table stakes. Without it, old-template migration is the only way in, so your only users are people starting from zero inside Cartulary. That is a small door.
Effort: S to M. Needs: nothing.

**IPA input helper.**
Status: DONE (r107). The IPA palette: a chart that inserts at the cursor, with the active language's phonemes shown first.
A clickable chart that inserts symbols, ideally narrowed to your defined inventory.
Field has: PolyGlot ships an interactive IPA chart with click-to-clipboard.
Verdict: Table stakes. Commodity, expected, a papercut by its absence.
Effort: S to M. Needs: nothing.

**Filtered grid reference pickers.**
Status: DONE (r116). The Corpus interlinear cells are scoped to lexemes via a field flag. It's cross-language, not active-language-only (that scope needs langId filtering on registered nodes, deferred).
Constrain grid reference cells by target type, starting with the Corpus word-to-Lexeme row (limit it to Lexemes of the active language).
Field has: not applicable; this is your own picker.
Verdict: Hygiene. Rescues your best existing feature from forcing a pick out of every node in the world. Already on your known-limits list.
Effort: S. Needs: nothing.

**Singleton enforcement on per-language specs.**
Status: DONE (r116). The New button hides once one exists per language; existing data untouched.
Stop allowing two Syllable Structures (or Stress, Phrase Order, Sentence Marking, Relativization) per language.
Field has: not applicable.
Verdict: Hygiene. Cheap correctness. Already on your known-limits list.
Effort: S. Needs: nothing.

**Paradigm readouts show their grids.**
Status: DONE (r116). Verbs and Noun Number render each inflection class's endings grid as a read-only table.
Make the Verbs and Noun Number readouts display the manually entered Inflection Class grids instead of linking to record cards.
Field has: PolyGlot and CWS both show actual conjugation and declension tables in their grammar views.
Verdict: Hygiene, and the first milestone of a differentiator. A user who clicks "Verbs" expects forms, not a list of links. Cheap fix to an expectation your own naming creates.
Effort: S. Needs: nothing. Full version: auto-paradigms, Tier 2.

**Plain dictionary and grammar export.**
Status: DONE (r113-r114). Built straight to the full grammar export (the Tier 2 item below), not a plain stub. Caveat: plain-but-readable, not typeset.
A Markdown or HTML dump of the lexicon and the grammar fields. Not pretty, but readable and shareable.
Field has: PolyGlot exports PDF, Excel, CSV, and an etymology tree; CWS generates grammar articles and exports the lexicon; Vulgar emits a formatted grammar and dictionary.
Verdict: Table stakes, and the first milestone of a differentiator. JSON-only is the hardest absence to defend for a tool whose pitch is documentation.
Effort: M. Needs: nothing. Full version: auto-generated reference grammar, Tier 2.

**Concordance cross-type edges.**
Status: NOT BUILT. Still intra-type only; on the known-limits list.
Draw the edges between different node types (affix to value, grapheme to phoneme, word to class) that currently go unrendered.
Field has: nothing comparable. Standalone conlang tools have no world to connect a language into; this only exists because Glossopoeia lives inside Cartulary.
Verdict: Differentiator. Your real edge currently lives in the data and not on the screen. This puts it on the screen. Connects to your existing Concordance edge-labeling backlog item.
Effort: M. Needs: nothing; it is rendering work on references you already resolve.

**Romanization to IPA transliteration.**
Status: NOT BUILT (deferred by choice). The languages use clean IPA, so the romanization->IPA parser was parked.
Define the mapping once, convert between your romanization and IPA automatically.
Field has: PolyGlot auto-generates pronunciation from orthography rules (regex-compatible for deep orthographies).
Verdict: Minor differentiator. Turns the romanization key from a reference note into a working tool and cuts hand-typing across the lexicon.
Effort: M. Needs: nothing.

**Lexicon statistics.**
Status: NOT BUILT.
Phoneme frequency, syllable-shape distribution, a Zipf sanity check.
Field has: PolyGlot has a language-statistics window.
Verdict: Table stakes with mild charm. Helps naturalism-minded users spot when a language looks fake.
Effort: S to M. Needs: nothing.

---

## TIER 2: RIDES ON A SUBSTRATE

Build the named substrate first, then these. Effort listed is the feature on top of the substrate, not counting the substrate itself.

**Word generator, frequency-weighted, into the dictionary.**
Status: DONE (r112). Review-list panel atop the Lexicon, the phonotactic check run backward, weighted by lexicon frequency, deduped within the language.
Generate candidate words that obey your Syllable Structure, respect your Phonotactic Constraints, weight by phoneme frequency and existing word shapes, and land directly in the Lexicon rather than a copy-paste box.
Field has: PolyGlot bundles the Zompist generator; CWS, Awkwords, and others generate from rule definitions.
Verdict: Table stakes, but the most-expected feature you currently lack, and the one that serves the namer and the worldbuilder rather than only the linguist. Generating into the dictionary instead of a text box is the part most standalone tools skip.
Effort: M. Needs: Syllabifier.

**Phonotactic validation, warn and override.**
Status: DONE (r110-r111). Reads the Phonemes link as set-membership with an Applies-When cluster flag; warns inline, never blocks.
On Lexeme save, warn if the word violates a constraint or won't parse under the syllable structure. Warning, not block, with an override per your nothing-destroyed doctrine.
Field has: PolyGlot runs a lexical-consistency check against defined patterns and an Override Lexical Rules escape hatch.
Verdict: Table stakes. Turns inert constraint records into a live check. Build the syllabifier once and you get this plus the generator.
Effort: M. Needs: Syllabifier.

**Allophony and surface-form derivation.**
Status: DONE (r115). glossApplyRules runs the rules in order; a surface line with a fired-rules toggle shows on the word.
Define a rule like /k/ becomes [tʃ] before front vowels, and the tool shows the surface pronunciation of every affected word automatically. Phonemic entries start yielding phonetic forms instead of being typed twice.
Field has: Lexurgy and other sound-change appliers do the rule math, but to a disconnected wordlist, not your live dictionary.
Verdict: Differentiator. Integrated allophony, where your phonemic lexicon auto-yields phonetic forms, is rare. Smaller payoff than diachronics, same engine, so it is the sensible first use of that engine.
Effort: M. Needs: IPA rule engine.

**Auto-generated paradigms.**
Status: DONE (r117). Stem + ending from the class grid, Irregular Forms overriding, stem-alternation cells documentary. The promised win (a rule builder over regex-per-dimension) is the grid itself.
Pick a word, pick its Inflection Class, see the full table generated live from the class rules with irregular overrides layered on top, and feed those tables into the readouts and the export.
Field has: PolyGlot auto-generates declension and conjugation via regex rules per dimension, with a debug window you will need; CWS grammar tables auto-decline straight from the dictionary.
Verdict: Table stakes for serious morphology, and the most expensive of the parity items. The win over PolyGlot is a rule builder a human enjoys using instead of regex-per-dimension.
Effort: L. Needs: its own morphological rule mechanism. First milestone already in Tier 1 (readouts display the manual grids).

**Auto-generated reference grammar.**
Status: DONE (r113-r114), with a caveat: plain-but-readable, not the typeset published-grammar quality this verdict described. Definition lists, not compact tables. Covers every section; typeset polish is a later pass.
One button produces a browsable, published-grammar-quality document: phonology, morphology with generated paradigm tables, syntax prose assembled from the fields, a formatted dictionary, and glossed example texts. HTML, printable to PDF.
Field has: PolyGlot's PDF export exists and is utilitarian; no tool in the field produces a published-grammar-quality auto-render from structured data.
Verdict: Differentiator on quality, table stakes on existence, and the best reaction-per-effort item on the list. This is the moment the 176 fields stop being homework and become a descriptive grammar someone can read.
Effort: L. Needs: Rendering layer. First milestone already in Tier 1 (plain export). Better with paradigms and glossing; ships without them.

**Assisted interlinear glossing.**
Status: DONE (r118, browser-verified r122). Corpus-memory -> lexicon -> stem+ending -> blank fallback; the guess tier is unreliable on fusional words by design, the value is fix-once.
Paste a sentence in the conlang. The tool segments each word against your lexicon and affixes, proposes a Leipzig gloss, and you correct what it missed; corrections persist and improve later guesses.
Field has: SIL's FLEx auto-glosses against its lexicon and is the only comparable thing. It is a field-linguistics install with a brutal learning curve. No hobby conlang tool does this.
Verdict: Differentiator. Smaller audience than diachronics, but that audience has no good option and will talk about it.
Effort: L (assisted, not fully automatic). Needs: Morpheme matcher and glosser, helped by the Syllabifier.

---

## TIER 3: THE APEX

**Integrated diachronics (language forking).**
Status: BUILT and browser-verified through r122 (r119–r121 shipped it, r121 had a render crash fixed at r122). Fork a parent (lexicon + inventory), author Diachronic sound rules on the child, run them to derive daughter forms; Descended From links populate at both word and language level and the family tree draws in Concordance. The IPA engine prerequisite (r115) was the only one and is done. Optional polish (inventory auto-prune, per-word diff exclusion, stem-level paradigms) deferred.
Evolve a parent language into a child. Define ordered sound changes, run them across the lexicon, and the tool produces a new child ConLang in the same world: every word's daughter form generated, a Descended From link set from each daughter word to its parent etymon (and from the child language to the parent language), the family relationship drawn in Concordance. The fork sets Descended From only; Cognates and Source Word are left untouched and pass through unchanged. There is no auto-cognate linking. A daughter form is the parent word evolved, not a cognate of it; cognates are sibling links, a separate unbuilt operation.
Field has: Lexurgy is the dominant sound-change applier (Turing-complete, free, web and CLI); CWS has PhoMo; Vulgar has a sound-change tool for descendants. None produce a populated child language living inside the world that speaks it.
Verdict: Differentiator, the biggest one available, and the biggest build. Lexurgy does the sound-change math better than you will; the thing nobody has is evolution that outputs a real language with the family tree intact. That is the screenshot people share.
Effort: XL. Needs: IPA rule engine. Build it for allophony first, then extend it here.

---

## SKIP

- **A full Turing-complete sound change applier.** Lexurgy exists, is free, and won. Build a regular ordered-rule engine, not a programming language.
- **Custom glyphs and fonts.** Defensible to defer for a single-file tool. Calligraphr and FontStruct cover it next door.
- **The "generate the whole language" audience.** That is Vulgar's product and the opposite philosophy to your deep-documentation design.
- **Community and sharing platform features.** Against the local single-file model. Whole-language export already covers handing someone a file.
- **Mobile.** Already deferred. Stay there until the desktop feature set is what people want on a phone.

---

## SEQUENCING

The original plan ran syllabifier → IPA engine → rendering layer → paradigms/glossing, with the apex last. That order held and is now spent: all four substrates and every Tier 2 feature shipped r109–r118, then the apex shipped r119–r121, in roughly that sequence. What the original plan called the order of dependencies is now the order of what got built.

What's left, and how it sequences:

1. **The apex (diachronics).** BUILT and browser-verified through r122. Three slices: engine split + Diachronic flag (r119), fork clone + descent links (r120), run + review diff (r121); r121 had a render crash, fixed at r122. Its one prerequisite, the IPA rule engine, was done (r115). What remains is only the optional polish above (none blocking).
2. **The four unbuilt Tier 1 items, independent and optional.** None block the apex. CSV/Swadesh import is the only one with adoption stakes (the new-user door); Concordance cross-type edges is a differentiator that's pure rendering on refs already resolved; romanization→IPA is parked by choice; lexicon statistics is minor. Sweep any of them whenever, or never.
3. **Reference-grammar typeset pass, optional.** The grammar export exists and is readable; turning its definition lists into compact tables is the gap between "readable" and the "published-grammar quality" the verdict named.

Outside this doc, the remaining v1.5 work is the Ephemeris BA rows and cartulary.world.
