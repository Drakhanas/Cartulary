
// ─── Glossopoeia (conlang core view, v1.5) ──────────────────────────────────
// The ConLang container schema, built per-world so its entry-ref fields resolve
// to live template ids (built-ins get per-world ids at seed). Field ids are
// stable: ConLang records key off them, and the supersede migration maps old
// Language / Glossary data onto them. Closed typological dropdowns carry no
// Other; in-world Status / Cultural fields keep Other, options carried verbatim
// from the Language / Glossary template.
const glossopoeiaConlangSchema = (state) => {
  const byName = {};
  (state.templates || []).forEach(t => { if (t && t.name) byName[t.name] = t.id; });
  const idsFor = (names) => names.map(n => byName[n]).filter(Boolean);
  return {
    name: CONLANG_REF_LABEL,
    icon: "\u25eb",
    color: "#6ea8c8",
    kind: "glossopoeia-conlang",
    fields: [
      { id: "otherNames", label: "Other Names", help: "Alternate names this language goes by.", type: "text", halfWidth: true },
      { id: "status", label: "Status", help: "Where the language stands in use or history.", type: "select", otherTextField: true, halfWidth: true,
        options: ["Active","Archaic","Dead","Endangered","Forgotten","Liturgical","Lost","Reconstructed","Revived","Sacred","Secret","Unknown","Other"] },
      { id: "autonym", label: "Autonym", help: "The language's own name for itself.", type: "text", halfWidth: true },
      { id: "autonymMeaning", label: "Autonym Meaning", help: "What that self-name means, if anything.", type: "text", halfWidth: true },
      { id: "morphologicalType", label: "Morphological Type", help: "How words are built: isolating, agglutinative, fusional, and so on.", type: "select", halfWidth: true,
        options: ["Isolating","Agglutinative","Fusional","Polysynthetic","Templatic/Nonconcatenative","Mixed"] },
      { id: "alignment", label: "Alignment", help: "How the language marks who did what to whom.", type: "select", halfWidth: true,
        options: ["Nominative-Accusative","Ergative-Absolutive","Tripartite","Active-Stative","Mixed"] },
      { id: "basicWordOrder", label: "Basic Word Order", help: "The default order of subject, verb, and object.", type: "select", halfWidth: true,
        options: ["SOV","SVO","VSO","VOS","OVS","OSV","Free"] },
      { id: "varietyOf", label: "Variety Of", help: "The parent language this one is a dialect of.", type: "entry-ref", halfWidth: true, refTemplatesId: [SYNTH_TPL_CONLANG] },
      { id: "descendedFrom", label: "Descended From", help: "The parent language this one evolved from, by sound change. Set by a language fork. Separate from Variety Of, which marks a dialect or register at the same time depth.", type: "entry-ref", halfWidth: true, refTemplatesId: [SYNTH_TPL_CONLANG] },
      { id: "culturalPosition", label: "Cultural Position", help: "The language's standing within its culture.", type: "select", otherTextField: true, halfWidth: true,
        options: ["Common","Feared","Forbidden","Regulated","Restricted","Revered","Sacred","Suppressed","Tolerated","Unknown","Other"] },
      { id: "culturalReach", label: "Cultural Reach", help: "How widely the language is spoken or known.", type: "select", otherTextField: true, halfWidth: true,
        options: ["Local","Regional","Continental","Global","Cosmic","Variable","Unknown","Other"] },
      { id: "spokenBy", label: "Spoken By", help: "The peoples, races, or factions that speak it.", type: "entry-ref", multi: true,
        refTemplatesId: idsFor(["Culture / People","Race / Species / Ancestry","Faction / Government / Organization"]) },
      { id: "region", label: "Region", help: "Where the language is spoken.", type: "entry-ref", multi: true,
        refTemplatesId: idsFor(["Location"]) },
      { id: "overview", label: "Overview", help: "Free-form notes on the language as a whole.", type: "textarea" },
    ],
  };
};

// The Lexeme (dictionary word) schema, built per-world so the self-referential
// picks resolve to live Lexeme records. The three Morphology-toolbox hookups
// (Features -> Grammatical Value, Inflection Class -> Inflection Class, Built By
// -> Word-Building Process / Affix) landed in r096 once those types registered.
// Field ids are stable; the supersede migration maps old Language / Glossary
// word entries onto them.
const glossopoeiaLexemeSchema = (state) => {
  const POS_OPTIONS = ["noun","verb","adjective","adverb","pronoun","adposition","conjunction","particle","numeral","determiner","interjection","classifier","proper noun (name)"];
  const REGISTER_OPTIONS = ["neutral","formal","informal","slang","archaic","poetic","taboo","technical"];
  const nameShow = { fieldId: "partOfSpeech", values: ["proper noun (name)"] };
  return {
    name: LEXEME_REF_LABEL,
    icon: "\u2022",
    color: "#8aa86e",
    kind: "glossopoeia-lexeme",
    fields: [
      { id: "pronunciation", label: "Pronunciation", help: "How the word actually sounds, in IPA.", type: "text", halfWidth: true, ipa: true },
      { id: "partOfSpeech", label: "Part of Speech", help: "The headword's main part of speech; also drives the name block.", type: "select", otherTextField: true, halfWidth: true, options: POS_OPTIONS },
      { id: "unit", label: "Unit", help: "Whether this is a single word or a fixed expression.", type: "select", halfWidth: true, options: ["word","phrase","idiom"] },
      { id: "status", label: "Status", help: "The word's lifecycle stage.", type: "select", otherTextField: true, halfWidth: true, options: ["in use","archaic","coined","reconstructed","proposed"] },
      { id: "senses", label: "Senses", help: "One or more meanings; each row below is one meaning.", type: "group", subfields: [
        { id: "gloss", label: "Gloss", help: "A quick one-word equivalent for this sense.", type: "text" },
        { id: "definition", label: "Definition", help: "The full meaning of this sense.", type: "textarea" },
        { id: "sensePos", label: "Part of Speech", help: "Set this only if the sense differs from the headword's part of speech.", type: "select", otherTextField: true, options: POS_OPTIONS },
        { id: "register", label: "Register", help: "How or when this sense is used.", type: "select", otherTextField: true, options: REGISTER_OPTIONS },
        { id: "example", label: "Example", help: "A sentence using this sense.", type: "text" },
      ] },
      { id: "nameType", label: "Name Type", help: "What kind of name this is.", type: "select", otherTextField: true, halfWidth: true, options: ["given","family","place","divine","title/epithet","people/group"], showWhen: nameShow },
      { id: "nameMeaning", label: "Name Meaning", help: "What the name means.", type: "text", halfWidth: true, showWhen: nameShow },
      { id: "nameElements", label: "Name Elements", help: "The meaningful pieces the name is built from.", type: "entry-ref", multi: true, refTemplatesId: [SYNTH_TPL_LEXEME], showWhen: nameShow },
      { id: "inflectionClass", label: "Inflection Class", help: "Which ending-group the word follows; blank if regular.", type: "entry-ref", halfWidth: true, refTemplatesId: [SYNTH_TPL_INFLCLASS] },
      { id: "features", label: "Features", help: "Built-in traits the word always carries, like gender or animacy.", type: "entry-ref", multi: true, refTemplatesId: [SYNTH_TPL_GRAMVALUE] },
      { id: "irregularForms", label: "Irregular Forms", help: "Forms that break the word's class pattern.", type: "grid" },
      { id: "origin", label: "Origin", help: "Where the word comes from.", type: "select", otherTextField: true, halfWidth: true, options: ["native","derived","borrowed","coined","onomatopoeic","unknown"] },
      { id: "derivedFrom", label: "Derived From", help: "Word(s) this one is built from.", type: "entry-ref", multi: true, refTemplatesId: [SYNTH_TPL_LEXEME] },
      { id: "sourceWord", label: "Source Word", help: "A loanword source, or an older form you're tracking by hand. For a parent in a forked language, use Descended From instead; that's the one the sound-change engine reads.", type: "entry-ref", multi: true, refTemplatesId: [SYNTH_TPL_LEXEME] },
      { id: "cognates", label: "Cognates", help: "Sister words in related languages.", type: "entry-ref", multi: true, refTemplatesId: [SYNTH_TPL_LEXEME] },
      { id: "descendedFrom", label: "Descended From", help: "The parent-language word this one evolved from. Set by a language fork. Usually one word; more than one only for a merger of two parent words.", type: "entry-ref", multi: true, refTemplatesId: [SYNTH_TPL_LEXEME] },
      { id: "builtBy", label: "Built By", help: "The process or affix that made this word.", type: "entry-ref", halfWidth: true, refTemplatesId: [SYNTH_TPL_WBP, SYNTH_TPL_AFFIX] },
      { id: "wordPieces", label: "Word Pieces", help: "The word broken into its building pieces, in order; leave empty for a single-piece root word.", type: "group", subfields: [
        { id: "sounds", label: "Sounds", help: "The sounds in this piece, in IPA.", type: "text", ipa: true },
        { id: "role", label: "Role", help: "What this piece does in the word.", type: "select", otherTextField: true, options: ["linker","prefix","root","suffix"] },
        { id: "affix", label: "Affix", help: "The matching Affix entry, if this piece is an affix.", type: "entry-ref", refTemplatesId: [SYNTH_TPL_AFFIX] },
      ] },
      { id: "notes", label: "Notes", help: "Anything else about this word.", type: "textarea" },
    ],
  };
};

// The Phoneme schema (one entry per sound). Class drives showWhen so only the
// articulatory fields for that class appear. Entry name = the phonemic symbol.
// Nucleus / Offglide point at other Phonemes (the vowels a diphthong is built
// from). Static (no per-world ref resolution).
const glossopoeiaPhonemeSchema = () => {
  const cls = (...vals) => ({ fieldId: "class", values: vals });
  return {
    name: PHONEME_REF_LABEL,
    icon: "\u03c6",
    color: "#c89a6e",
    kind: "glossopoeia-phoneme",
    ipaName: true,
    fields: [
      { id: "romanization", label: "Romanization", help: "How this sound is written in the Latin alphabet.", type: "text", halfWidth: true },
      { id: "class", label: "Class", help: "The kind of sound; sets which fields below apply.", type: "select", halfWidth: true, options: ["Consonant","Vowel","Diphthong","Tone"] },
      { id: "airstream", label: "Airstream", help: "The airstream mechanism behind the consonant.", type: "select", options: ["Pulmonic","Ejective","Implosive","Click"], showWhen: cls("Consonant") },
      { id: "manner", label: "Manner", help: "How the airflow is obstructed (plosive, fricative, nasal, etc.).", type: "select", options: ["Plosive","Affricate","Nasal","Trill","Tap/Flap","Fricative","Lateral Fricative","Approximant","Lateral Approximant"], showWhen: cls("Consonant") },
      { id: "place", label: "Place", help: "Where in the vocal tract the consonant is articulated.", type: "select", options: ["Bilabial","Labiodental","Linguolabial","Dental","Alveolar","Postalveolar","Retroflex","Palatal","Velar","Uvular","Pharyngeal","Epiglottal","Glottal","Labial-velar","Labial-palatal"], showWhen: cls("Consonant") },
      { id: "voicing", label: "Voicing", help: "Whether the vocal folds vibrate.", type: "select", options: ["Voiceless","Voiced"], showWhen: cls("Consonant") },
      { id: "laminality", label: "Laminality", help: "Whether the tongue tip or blade makes the contact.", type: "select", options: ["Apical","Laminal"], showWhen: cls("Consonant") },
      { id: "secondaryArticulation", label: "Secondary Articulation", help: "Extra articulations layered on the consonant.", type: "multiselect", options: ["Aspirated","Labialized","Palatalized","Velarized","Pharyngealized","Nasalized","Prenasalized","Glottalized","Rhotacized"], showWhen: cls("Consonant") },
      { id: "release", label: "Release", help: "How a stop or affricate is released.", type: "select", options: ["Released","Unreleased","Nasal release","Lateral release"], showWhen: { fieldId: "manner", values: ["Plosive","Affricate"] } },
      { id: "syllabicity", label: "Syllabicity", help: "Whether the consonant can form a syllable on its own.", type: "select", options: ["Non-syllabic","Syllabic"], showWhen: cls("Consonant") },
      { id: "height", label: "Height", help: "How high the tongue sits for the vowel.", type: "select", options: ["Close","Near-close","Close-mid","Mid","Open-mid","Near-open","Open"], showWhen: cls("Vowel") },
      { id: "backness", label: "Backness", help: "How far forward or back the tongue sits.", type: "select", options: ["Front","Central","Back"], showWhen: cls("Vowel") },
      { id: "roundedness", label: "Roundedness", help: "Whether the lips are rounded.", type: "select", options: ["Unrounded","Rounded"], showWhen: cls("Vowel") },
      { id: "nasalization", label: "Nasalization", help: "Whether air flows through the nose.", type: "select", options: ["Oral","Nasal"], showWhen: cls("Vowel") },
      { id: "tongueRoot", label: "Tongue Root", help: "Tongue-root position (ATR or RTR).", type: "select", options: ["Neutral","Advanced (ATR)","Retracted (RTR)"], showWhen: cls("Vowel") },
      { id: "rhoticity", label: "Rhoticity", help: "Whether the vowel is r-colored.", type: "select", options: ["Non-rhotic","Rhotic"], showWhen: cls("Vowel") },
      { id: "nucleus", label: "Nucleus", help: "The vowel the diphthong starts on.", type: "entry-ref", refTemplatesId: [SYNTH_TPL_PHONEME], showWhen: cls("Diphthong") },
      { id: "offglide", label: "Offglide", help: "The vowel the diphthong glides toward.", type: "entry-ref", refTemplatesId: [SYNTH_TPL_PHONEME], showWhen: cls("Diphthong") },
      { id: "diphthongType", label: "Diphthong Type", help: "The shape of the glide.", type: "select", options: ["Falling","Rising","Centering","Opening","Closing"], showWhen: cls("Diphthong") },
      { id: "toneRegister", label: "Register", help: "The pitch level of the tone.", type: "select", options: ["Extra-high","High","Mid","Low","Extra-low"], showWhen: cls("Tone") },
      { id: "toneContour", label: "Contour", help: "The pitch movement of the tone.", type: "select", options: ["Level","Rising","Falling","Peaking","Dipping"], showWhen: cls("Tone") },
      { id: "phonation", label: "Phonation", help: "The voice quality (modal, breathy, creaky, etc.).", type: "select", options: ["Modal","Breathy/Murmured","Creaky/Laryngealized","Whispery"], showWhen: cls("Consonant","Vowel") },
      { id: "length", label: "Length", help: "How long the sound is held.", type: "select", options: ["Short","Half-long","Long"], showWhen: cls("Consonant","Vowel") },
      { id: "status", label: "Status", help: "How established this sound is in the inventory.", type: "select", otherTextField: true, halfWidth: true, options: ["Attested","Marginal","Reserved","Excluded"] },
      { id: "reason", label: "Reason", help: "Why this sound is excluded.", type: "text", halfWidth: true, showWhen: { fieldId: "status", values: ["Excluded"] } },
      { id: "examples", label: "Examples", help: "Words that use this sound.", type: "text", halfWidth: true },
      { id: "notes", label: "Notes", help: "Anything else about this sound.", type: "textarea" },
    ],
  };
};

// --- Phonotactics (chunk 3 piece 2). Four documentary components, each its own
// slice array rendered through GlossEntityList. None register as node types.
// Phonotactic Constraint and Phonological Rule point at Phoneme. Static (no
// per-world ref resolution; the Phoneme sentinel is a constant). Syllable
// Structure and Stress are one-per-language specs in practice but use the same
// list-detail component as the lists (one item each). ---
const glossopoeiaSyllableStructureSchema = () => ({
  name: "Syllable Structure",
  icon: "\u03c3",
  color: "#c89a6e",
  kind: "glossopoeia-syllable-structure",
  fields: [
    { id: "template", label: "Template", help: "The syllable shape, e.g. (C)(C)V(C).", type: "text", halfWidth: true },
    { id: "onsetRequirement", label: "Onset Requirement", help: "Whether a syllable must start with a consonant.", type: "select", halfWidth: true, options: ["Optional","Required"] },
    { id: "maxOnset", label: "Max Onset", help: "Most consonants allowed before the vowel.", type: "number", halfWidth: true },
    { id: "maxCoda", label: "Max Coda", help: "Most consonants allowed after the vowel.", type: "number", halfWidth: true },
    { id: "nucleusTypes", label: "Nucleus Types", help: "What can serve as the syllable core.", type: "multiselect", options: ["Vowel","Long Vowel","Diphthong","Syllabic Consonant"] },
    { id: "notes", label: "Notes", help: "Anything else about syllable structure.", type: "textarea" },
  ],
});

const glossopoeiaStressSchema = () => ({
  name: "Stress",
  icon: "\u02c8",
  color: "#c8a96e",
  kind: "glossopoeia-stress",
  fields: [
    { id: "type", label: "Type", help: "How stress is assigned in the language.", type: "select", halfWidth: true, options: ["Fixed","Weight-sensitive","Lexical","Morphological","None"] },
    { id: "defaultPosition", label: "Default Position", help: "Which syllable takes stress when it is fixed.", type: "select", halfWidth: true, options: ["Initial","Peninitial","Antepenultimate","Penultimate","Final"], showWhen: { fieldId: "type", values: ["Fixed"] } },
    { id: "weightCriteria", label: "Weight Criteria", help: "What makes a syllable heavy, for weight-sensitive stress.", type: "multiselect", options: ["Long Vowel","Diphthong","Coda Consonant"], showWhen: { fieldId: "type", values: ["Weight-sensitive"] } },
    { id: "secondaryStress", label: "Secondary Stress", help: "Whether the language also has secondary stress.", type: "select", halfWidth: true, options: ["None","Present"] },
    { id: "notes", label: "Notes", help: "Anything else about stress.", type: "textarea" },
  ],
});

const glossopoeiaConstraintSchema = () => ({
  name: "Phonotactic Constraint",
  icon: "\u2298",
  color: "#b89a8e",
  kind: "glossopoeia-phonotactic-constraint",
  fields: [
    { id: "polarity", label: "Polarity", help: "Whether the pattern is allowed or forbidden.", type: "select", halfWidth: true, options: ["Permitted","Prohibited"] },
    { id: "position", label: "Position", help: "Where in the word the constraint applies.", type: "select", halfWidth: true, options: ["Onset","Nucleus","Coda","Word-initial","Word-final","Word-medial","Any"] },
    { id: "appliesWhen", label: "Applies When", help: "Whether the rule covers these sounds anywhere at this position, or only when the position holds two or more consonants (a cluster).", type: "select", halfWidth: true, options: ["Anywhere at this position","Only in a cluster"], showWhen: { fieldId: "position", values: ["Onset","Coda"] } },
    { id: "pattern", label: "Pattern", help: "The sound sequence the constraint is about.", type: "text", halfWidth: true, ipa: true },
    { id: "phonemes", label: "Phonemes", help: "The specific phonemes this constraint involves.", type: "entry-ref", multi: true, refTemplatesId: [SYNTH_TPL_PHONEME] },
    { id: "notes", label: "Notes", help: "Anything else about this constraint.", type: "textarea" },
  ],
});

const glossopoeiaRuleSchema = () => ({
  name: "Phonological Rule",
  icon: "\u2192",
  color: "#a8c86e",
  kind: "glossopoeia-phonological-rule",
  fields: [
    { id: "ruleType", label: "Rule Type", help: "The kind of sound process.", type: "select", otherTextField: true, halfWidth: true, options: ["Allophony","Assimilation","Dissimilation","Lenition","Fortition","Epenthesis","Deletion","Metathesis","Hiatus resolution"] },
    { id: "input", label: "Input", help: "The sound before the rule applies. One sound, or V / C for any vowel / consonant.", type: "text", halfWidth: true, ipa: true },
    { id: "output", label: "Output", help: "The sound after the rule applies. Leave empty (or \u2205) to delete it.", type: "text", halfWidth: true, ipa: true },
    { id: "environment", label: "Environment", help: "When it applies, in slot notation: _ is the sound's spot, # a word edge, V / C any vowel / consonant, a letter a specific sound. Blank means everywhere. E.g. _ # is word-final, V _ V is between vowels.", type: "text", halfWidth: true, ipa: true },
    { id: "order", label: "Order", help: "Where this rule falls in the sequence, if order matters.", type: "number", halfWidth: true },
    { id: "application", label: "Application", help: "Whether the rule always, sometimes, or optionally applies.", type: "select", halfWidth: true, options: ["Obligatory","Optional","Variable"] },
    { id: "diachronic", label: "Diachronic", help: "Synchronic is a living sound process and shows in the surface-form readout. Diachronic is a historical change a language fork ran over the parent's words to derive this language; it is skipped by the readout so it never reads as a sound the language still makes. Blank means synchronic.", type: "select", halfWidth: true, options: ["Synchronic","Diachronic"] },
    { id: "affectedPhonemes", label: "Affected Phonemes", help: "The phonemes this rule acts on.", type: "entry-ref", multi: true, refTemplatesId: [SYNTH_TPL_PHONEME] },
    { id: "notes", label: "Notes", help: "Anything else about this rule.", type: "textarea" },
  ],
});

// --- Morphology (chunk 3b): the four-entity toolbox. Grammatical Value, Affix,
// Word-Building Process, and Inflection Class. All four register as node types
// (see the registry block); Affix.Marks and the Lexeme Features ref point at
// Grammatical Value, Built By points at Word-Building Process / Affix, the
// Lexeme Inflection Class ref points at Inflection Class. Static schemas. The
// shared word-class list (which parts of speech a thing applies to) and the
// Grammatical Value Category list are proposed sets confirmed by Drak; Category
// keeps Other+ so anything missing is still recordable. ---
const GLOSS_WORD_CLASS_OPTIONS = ["noun","verb","adjective","adverb","pronoun","adposition","conjunction","particle","numeral","determiner","interjection","classifier"];
const GLOSS_GRAMVALUE_CATEGORY_OPTIONS = ["case","gender / class","number","person","tense","aspect","mood","voice","definiteness","polarity","evidentiality","animacy","clusivity","degree","possession"];

const glossopoeiaGrammaticalValueSchema = () => ({
  name: GRAMVALUE_REF_LABEL,
  icon: "\u25c8",
  color: "#9a8ec8",
  kind: "glossopoeia-grammatical-value",
  fields: [
    { id: "category", label: "Category", help: "The grammatical feature this value belongs to (case, gender, number, tense...).", type: "select", otherTextField: true, halfWidth: true, options: GLOSS_GRAMVALUE_CATEGORY_OPTIONS },
    { id: "shortTag", label: "Short Tag", help: "The gloss abbreviation, like ACC, PL, or F.", type: "text", halfWidth: true },
    { id: "function", label: "Function", help: "One line on what this value does.", type: "text", halfWidth: true },
    { id: "wordClass", label: "Word Class", help: "Parts of speech this value applies to.", type: "multiselect", options: GLOSS_WORD_CLASS_OPTIONS },
    { id: "notes", label: "Notes", help: "Anything else about this value.", type: "textarea" },
  ],
});

const glossopoeiaAffixSchema = () => ({
  name: AFFIX_REF_LABEL,
  icon: "\u2295",
  color: "#c87e9a",
  kind: "glossopoeia-affix",
  ipaName: true,
  fields: [
    { id: "position", label: "Position", help: "Where the affix attaches to the stem.", type: "select", halfWidth: true, options: ["prefix (front)","suffix (back)","infix (inside)","circumfix (wrapping)"] },
    { id: "job", label: "Job", help: "Whether it marks grammar or builds a new word.", type: "select", halfWidth: true, options: ["grammar ending (inflectional)","builds a new word (derivational)"] },
    { id: "marks", label: "Marks", help: "The grammatical value(s) this ending expresses.", type: "entry-ref", multi: true, refTemplatesId: [SYNTH_TPL_GRAMVALUE], showWhen: { fieldId: "job", values: ["grammar ending (inflectional)"] } },
    { id: "addsMeaning", label: "Adds Meaning", help: "What meaning this word-builder adds.", type: "text", showWhen: { fieldId: "job", values: ["builds a new word (derivational)"] } },
    { id: "attachesTo", label: "Attaches To", help: "Which parts of speech it attaches to.", type: "multiselect", options: GLOSS_WORD_CLASS_OPTIONS },
    { id: "notes", label: "Notes", help: "Anything else about this affix.", type: "textarea" },
  ],
});

const glossopoeiaWordBuildingSchema = () => ({
  name: WBP_REF_LABEL,
  icon: "\u2699",
  color: "#7ec8a8",
  kind: "glossopoeia-word-building",
  fields: [
    { id: "method", label: "Method", help: "The word-building strategy.", type: "select", otherTextField: true, halfWidth: true, options: ["compounding","repeating (reduplication)","reuse-as-is (conversion)","stem change","root-and-pattern","blending","clipping"] },
    { id: "howItWorks", label: "How It Works", help: "The recipe in plain words.", type: "textarea" },
    { id: "takes", label: "Takes", help: "The kinds of words that feed in.", type: "multiselect", options: GLOSS_WORD_CLASS_OPTIONS },
    { id: "makes", label: "Makes", help: "The kinds of words that come out.", type: "multiselect", options: GLOSS_WORD_CLASS_OPTIONS },
    { id: "example", label: "Example", help: "A worked example, like fire plus mountain equals volcano.", type: "text", halfWidth: true },
    { id: "notes", label: "Notes", help: "Anything else about this process.", type: "textarea" },
  ],
});

const glossopoeiaInflectionClassSchema = () => ({
  name: INFLCLASS_REF_LABEL,
  icon: "\u25a6",
  color: "#c8b87e",
  kind: "glossopoeia-inflection-class",
  fields: [
    { id: "appliesTo", label: "Applies To", help: "Which parts of speech belong to this class.", type: "multiselect", options: GLOSS_WORD_CLASS_OPTIONS },
    { id: "endings", label: "Endings", help: "The table of forms; label the rows and columns and fill the endings.", type: "grid" },
    { id: "example", label: "Example", help: "A sample word in this class.", type: "text", halfWidth: true },
    { id: "notes", label: "Notes", help: "Anything else about this class.", type: "textarea" },
  ],
});

// --- Pronouns (chunk 3d): Pronoun Set. Data-entry, one entry per set, forms in
// a freeform grid. No registration; nothing refs a pronoun set. Static schema. ---
const glossopoeiaPronounSetSchema = () => ({
  name: "Pronoun Set",
  icon: "\u24c5",
  color: "#8ec8c0",
  kind: "glossopoeia-pronoun-set",
  fields: [
    { id: "type", label: "Type", help: "The kind of pronoun set.", type: "select", otherTextField: true, halfWidth: true, options: ["personal","possessive","reflexive","reciprocal","demonstrative","interrogative","relative","indefinite"] },
    { id: "distinguishes", label: "Distinguishes", help: "The axes this set tracks (person, number, case...).", type: "multiselect", options: ["person","number","gender / class","case","clusivity","formality","animacy"] },
    { id: "forms", label: "Forms", help: "The table of pronouns; label the rows and columns and fill the forms.", type: "grid" },
    { id: "notes", label: "Notes", help: "Anything else about this set.", type: "textarea" },
  ],
});

// --- Grammatica: Syntax (chunk 3e). Two per-language cards (Phrase Order,
// Sentence Marking) plus one list (Construction). No registration, no new field
// type. Field orders are the signed-off natural-order pass. ---
const glossopoeiaPhraseOrderSchema = () => ({
  name: "Phrase Order",
  icon: "\u2194",
  color: "#b0a06e",
  kind: "glossopoeia-phrase-order",
  fields: [
    { id: "adjectiveOrder", label: "Adjective Order", help: "Where adjectives sit relative to the noun.", type: "select", halfWidth: true, options: ["before noun","after noun","both"] },
    { id: "numeralOrder", label: "Numeral Order", help: "Where numerals sit relative to the noun.", type: "select", halfWidth: true, options: ["before noun","after noun"] },
    { id: "demonstrativeOrder", label: "Demonstrative Order", help: "Where this and that words sit relative to the noun.", type: "select", halfWidth: true, options: ["before noun","after noun"] },
    { id: "articlePlacement", label: "Article Placement", help: "Whether there is a the or a word, and where it goes.", type: "select", halfWidth: true, options: ["none","prefix","suffix","word before","word after"] },
    { id: "possessorOrder", label: "Possessor Order", help: "Whether the possessor comes before or after the thing owned.", type: "select", halfWidth: true, options: ["possessor first","possessor last"] },
    { id: "relativeClauseOrder", label: "Relative Clause Order", help: "Where a who or that clause sits relative to its noun.", type: "select", halfWidth: true, options: ["before noun","after noun"] },
    { id: "adpositionType", label: "Adposition Type", help: "Prepositions, postpositions, both, or neither.", type: "select", halfWidth: true, options: ["prepositions","postpositions","both","none"] },
    { id: "notes", label: "Notes", help: "Anything else about phrase order.", type: "textarea" },
  ],
});

const glossopoeiaSentenceMarkingSchema = () => ({
  name: "Sentence Marking",
  icon: "\u22a2",
  color: "#b0866e",
  kind: "glossopoeia-sentence-marking",
  fields: [
    { id: "marksCoreRolesBy", label: "Marks Core Roles By", help: "How the sentence shows subject and object.", type: "multiselect", options: ["case endings","word order","verb agreement","particles"] },
    { id: "verbAgreesWith", label: "Verb Agrees With", help: "What the verb changes shape to match.", type: "multiselect", options: ["nothing","subject","object","both"] },
    { id: "agreementFeatures", label: "Agreement Features", help: "The features the verb agrees in.", type: "multiselect", options: ["person","number","gender / class","case"], showWhen: { fieldId: "verbAgreesWith", values: ["subject","object","both"] } },
    { id: "wordOrderRigidity", label: "Word Order Rigidity", help: "How fixed or free the word order is.", type: "select", halfWidth: true, options: ["rigid","mostly fixed","flexible","free"] },
    { id: "droppedSubjectOk", label: "Dropped Subject OK", help: "Whether the subject can be left out.", type: "select", halfWidth: true, options: ["yes","no","sometimes"] },
    { id: "dummySubject", label: "Dummy Subject", help: "Whether a placeholder subject is needed, as in 'it rains'.", type: "select", halfWidth: true, options: ["required","not used","sometimes"] },
    { id: "notes", label: "Notes", help: "Anything else about sentence marking.", type: "textarea" },
  ],
});

const glossopoeiaConstructionSchema = () => ({
  name: "Construction",
  icon: "\u25c9",
  color: "#6eb0a0",
  kind: "glossopoeia-construction",
  fields: [
    { id: "construction", label: "Construction", help: "The sentence pattern this entry documents.", type: "select", otherTextField: true, halfWidth: true, options: ["Negation","Yes/No Question","Content Question","Command","Predication (to-be)","Comparison","Possession","Existential","Topic/Focus fronting"] },
    { id: "howFormed", label: "How It's Formed", help: "How the construction is built.", type: "select", otherTextField: true, halfWidth: true, options: ["separate word","affix/ending","helper verb","word-order change","intonation only","special verb form","zero"] },
    { id: "marker", label: "Marker", help: "The actual word or ending it uses, if any.", type: "text", halfWidth: true, ipa: true },
    { id: "position", label: "Position", help: "Where the marker goes in the clause.", type: "select", otherTextField: true, halfWidth: true, options: ["clause-initial","clause-final","before verb","after verb","on the verb","before the questioned word","varies"] },
    { id: "wordOrderEffect", label: "Word Order Effect", help: "Whether building it shifts the word order.", type: "text", halfWidth: true },
    { id: "example", label: "Example", help: "One worked sentence with a gloss.", type: "text", halfWidth: true },
    { id: "notes", label: "Notes", help: "Anything else about this construction.", type: "textarea" },
  ],
});

// --- Grammatica: Complex Structures (chunk 3e). One per-language card
// (Relativization) plus one list (Clause Linking). No registration, no new field
// type. Clause Linking is a single list with a Type dropdown, per the sign-off. ---
const glossopoeiaRelativizationSchema = () => ({
  name: "Relativization",
  icon: "\u21b1",
  color: "#8e9ec8",
  kind: "glossopoeia-relativization",
  fields: [
    { id: "strategy", label: "Strategy", help: "How relative clauses are formed; pick all that apply.", type: "multiselect", options: ["relative pronoun (who/which)","invariant marker","gap (bare clause, no marker)","resumptive pronoun (a copy pronoun inside)","participle/special verb form","correlative (which man... that man)"] },
    { id: "relativizer", label: "Relativizer", help: "The actual relative word or marker, if there is one.", type: "text", halfWidth: true, ipa: true },
    { id: "gapOrResumptive", label: "Gap or Resumptive", help: "Whether the shared noun leaves a gap or a copy pronoun inside.", type: "select", halfWidth: true, options: ["gap","resumptive pronoun","either"] },
    { id: "verbForm", label: "Verb Form", help: "Whether the verb changes shape inside the clause.", type: "select", halfWidth: true, options: ["normal finite verb","special participle/relative form","nonfinite"] },
    { id: "rolesYouCanRelativize", label: "Roles You Can Relativize", help: "Which roles a relative clause can target.", type: "multiselect", options: ["subject","object","indirect object","possessor","object of adposition","comparison"] },
    { id: "restrictiveVsNon", label: "Restrictive vs Non-restrictive", help: "Whether defining and aside clauses are marked differently.", type: "select", halfWidth: true, options: ["not distinguished","marked differently"] },
    { id: "example", label: "Example", help: "One worked relative clause with a gloss.", type: "text", halfWidth: true },
    { id: "notes", label: "Notes", help: "Anything else about relative clauses.", type: "textarea" },
  ],
});

const glossopoeiaClauseLinkingSchema = () => ({
  name: "Clause Linking",
  icon: "\u29c9",
  color: "#8ec89e",
  kind: "glossopoeia-clause-linking",
  fields: [
    { id: "type", label: "Type", help: "The kind of clause-joining this entry documents.", type: "select", otherTextField: true, halfWidth: true, options: ["Coordination (and/but/or)","Complement clause (I think that...)","Adverbial clause (when/because/if...)","Conditional (if...then)","Serial verbs (go buy bread)","Switch-reference (same/different subject marking)","Clause chaining (long verb strings, one finite at the end)","Reported speech (quoting)"] },
    { id: "relationUse", label: "Relation/Use", help: "The specific sense, like 'but' or 'because'.", type: "text", halfWidth: true },
    { id: "howJoined", label: "How It's Joined", help: "How the clauses are joined.", type: "select", otherTextField: true, halfWidth: true, options: ["conjunction word","particle/clitic","special verb form","juxtaposition (just placed together)","case-marked verb form","verb agreement"] },
    { id: "marker", label: "Marker", help: "The actual conjunction or marker, if any.", type: "text", halfWidth: true, ipa: true },
    { id: "clauseForm", label: "Clause Form", help: "The shape of the joined clause.", type: "select", halfWidth: true, options: ["both full finite","joined clause is nonfinite","special dependent verb form"] },
    { id: "distinctions", label: "Distinctions", help: "Sub-types it splits into.", type: "text", halfWidth: true },
    { id: "example", label: "Example", help: "One worked sentence with a gloss.", type: "text", halfWidth: true },
    { id: "notes", label: "Notes", help: "Anything else about this link.", type: "textarea" },
  ],
});

// --- Orthography (chunk 3f): text-only writing systems. A workspace overview
// longform plus three lists. Writing System registers as a node; Grapheme and
// Spelling Rule are view-internal. Grapheme.BelongsTo -> Writing System;
// Grapheme.Spells and Spelling Rule.Sounds -> Phoneme. No new field type. ---
const glossopoeiaWritingSystemSchema = () => ({
  name: WRITINGSYSTEM_REF_LABEL,
  icon: "\u270e",
  color: "#c8a86e",
  kind: "glossopoeia-writing-system",
  fields: [
    { id: "type", label: "Type", help: "The kind of script.", type: "select", otherTextField: true, halfWidth: true, options: ["alphabet","abjad (consonants written, vowels optional)","abugida (each sign is a consonant with a vowel mark)","syllabary (one sign per syllable)","logographic (signs stand for whole words)","featural (sign shapes show sound features)","mixed"] },
    { id: "status", label: "Status", help: "Whether the script is current, historical, or a romanization.", type: "select", otherTextField: true, halfWidth: true, options: ["current","historical","ceremonial","romanization"] },
    { id: "direction", label: "Direction", help: "Which way the writing runs.", type: "select", otherTextField: true, halfWidth: true, options: ["left-to-right","right-to-left","top-to-bottom","boustrophedon (alternating lines)"] },
    { id: "wordSeparation", label: "Word Separation", help: "How words are separated, if at all.", type: "select", otherTextField: true, halfWidth: true, options: ["spaces","none (runs together)","dots/marks"] },
    { id: "letterCase", label: "Letter Case", help: "Whether the script distinguishes capital and small letters.", type: "select", halfWidth: true, options: ["no","yes (capital vs small)"] },
    { id: "numerals", label: "Numerals", help: "How numbers are written.", type: "select", otherTextField: true, halfWidth: true, options: ["own number signs","borrowed digits","spelled out as words"] },
    { id: "sentenceEnd", label: "Sentence End", help: "What marks the end of a sentence.", type: "text", halfWidth: true },
    { id: "punctuation", label: "Punctuation", help: "Commas, quotes, question marks, and the like, in words.", type: "textarea" },
    { id: "notes", label: "Notes", help: "Anything else about this script; describe glyphs here until assets land.", type: "textarea" },
  ],
});

const glossopoeiaGraphemeSchema = () => ({
  name: "Grapheme",
  icon: "\u2712",
  color: "#c8966e",
  kind: "glossopoeia-grapheme",
  fields: [
    { id: "belongsTo", label: "Belongs To", help: "Which script this sign is part of.", type: "entry-ref", halfWidth: true, refTemplatesId: [SYNTH_TPL_WRITINGSYSTEM] },
    { id: "role", label: "Role", help: "What kind of sign this is.", type: "select", otherTextField: true, halfWidth: true, options: ["consonant letter","vowel letter","diacritic (accent mark)","digraph (two signs, one sound)","ligature (two letters joined)","numeral","punctuation","logogram (a sign for a whole word)"] },
    { id: "romanization", label: "Romanization", help: "How this sign is written in Latin letters.", type: "text", halfWidth: true },
    { id: "spells", label: "Spells", help: "The sound(s) this sign represents.", type: "entry-ref", multi: true, refTemplatesId: [SYNTH_TPL_PHONEME] },
    { id: "shapeNote", label: "Shape Note", help: "The sign described in words (no glyph image in v1).", type: "text", halfWidth: true },
    { id: "notes", label: "Notes", help: "Anything else about this sign.", type: "textarea" },
  ],
});

const glossopoeiaSpellingRuleSchema = () => ({
  name: "Spelling Rule",
  icon: "\u270d",
  color: "#c8a07e",
  kind: "glossopoeia-spelling-rule",
  fields: [
    { id: "sounds", label: "Sounds", help: "The sound(s) the rule is about.", type: "entry-ref", multi: true, refTemplatesId: [SYNTH_TPL_PHONEME] },
    { id: "writtenAs", label: "Written As", help: "How they are spelled.", type: "text", halfWidth: true },
    { id: "when", label: "When", help: "The context the rule applies in.", type: "text", halfWidth: true },
    { id: "example", label: "Example", help: "A worked case.", type: "text", halfWidth: true },
    { id: "notes", label: "Notes", help: "Anything else about this rule.", type: "textarea" },
  ],
});

// --- Corpus (chunk 3f): glossed example texts, Leipzig-style. One glossed
// example per entry; the aligned interlinear is a grid (one column per word,
// rows for the tiers). References Lexemes via the optional Entry row's cells;
// view-internal otherwise. No new field type. ---
const glossopoeiaCorpusSchema = () => ({
  name: "Example",
  icon: "\u201c",
  color: "#6ec8b0",
  kind: "glossopoeia-corpus",
  fields: [
    { id: "source", label: "Source / Text", help: "Where the example is from; shared across the lines of one text.", type: "text", halfWidth: true },
    { id: "lineOrder", label: "Line / Order", help: "Position within a multi-line text, for ordering.", type: "number", halfWidth: true },
    { id: "genreType", label: "Genre / Type", help: "What kind of text this is.", type: "select", otherTextField: true, halfWidth: true, options: ["sentence","proverb","narrative line","dialogue","poem line","elicited example"] },
    { id: "interlinear", label: "Interlinear", help: "The aligned block: one column per word, rows for object, gloss, and other tiers.", type: "grid", cellRefTemplatesId: [SYNTH_TPL_LEXEME] },
    { id: "freeTranslation", label: "Free Translation", help: "The natural English translation.", type: "text", halfWidth: true },
    { id: "literalGloss", label: "Literal Gloss", help: "An optional word-for-word English line.", type: "text", halfWidth: true },
    { id: "notes", label: "Notes", help: "Commentary, or the grammar points this example shows.", type: "textarea" },
  ],
});

// Grouped, collapsible workspace nav. Overview is the ConLang container editor;
// the eleven workspaces below it land in later build steps.
const GLOSSOPOEIA_NAV = [
  { kind: "item", id: "overview", label: "Overview" },
  { kind: "group", label: "Phonology", items: [
    { id: "inventory", label: "Inventory" },
    { id: "phonotactics", label: "Phonotactics" },
  ] },
  { kind: "item", id: "morphology", label: "Morphology" },
  { kind: "item", id: "nounNumber", label: "Noun Number" },
  { kind: "item", id: "pronouns", label: "Pronouns" },
  { kind: "item", id: "verbs", label: "Verbs" },
  { kind: "group", label: "Grammatica", items: [
    { id: "syntax", label: "Syntax" },
    { id: "complexStructures", label: "Complex Structures" },
  ] },
  { kind: "item", id: "lexicon", label: "Lexicon" },
  { kind: "item", id: "orthography", label: "Orthography" },
  { kind: "item", id: "corpus", label: "Corpus" },
];

const GLOSSOPOEIA_WORKSPACE_LABEL = {
  inventory: "Phonology: Inventory", phonotactics: "Phonology: Phonotactics",
  morphology: "Morphology", nounNumber: "Noun Number", pronouns: "Pronouns",
  verbs: "Verbs", syntax: "Grammatica: Syntax", complexStructures: "Grammatica: Complex Structures",
  lexicon: "Lexicon", orthography: "Orthography", corpus: "Corpus",
};