# Cartulary, CSV Lexicon Spec (v1.8)

> **The build sheet, settled 2026-11-07 (session 23).** Planned before v1.8 opened, from the roadmap's CSV lexicon import row and its June plan (`roadmap-principles.md`, the 2026-06-23 (deferred) block), one call per message, two calls. Every decision below is Drak's unless it says otherwise; the dated calls are in section 1. Claude's defaults are marked as his.

---

## 0. One-sentence statement

The lexicon gets a CSV export and a CSV import through v1.7's entries importer: the active language's words with their plain fields and their first sense, matched by id only, so a file from anywhere else only adds.

## 1. Decisions (Drak, 2026-11-07)

- **Into v1.8** (00:46: "add, since we're touching a few different modules in this"); **its place** (10:48, option a: after computed fields, before the walkthrough); **the June plan reviewed** (15:02: "let's look at the CSV plan").
- **What a column can map to, call 1, option a** (15:17: "a"). June's fields and the other plain ones: headword, pronunciation, part of speech, unit, status, origin, and the first sense's gloss, definition, register, and example. The list Claude gave left out four plain fields, Name Type and Name Meaning (shown for proper nouns), Notes, and the sense's own Part of Speech; they're in, as the option's "the other plain ones" reads (found 2026-11-10). One row is one word. The other ways were June's fields exactly (headword, pronunciation, part of speech, gloss, definition), and a with rows sharing a headword grouped into one word's senses.
- **How rows match, call 2, option a** (15:19: "a"). The entries importer, reused, matching by id only (section 4). The other ways were the importer reused add-only always, and a separate lexicon importer as June planned.
- **The cut plan** (section 6; 15:25: "looks good").

## 2. What the plan found

- June's plan (2026-06-23): a column-mapping step rather than a fixed header, aimed so a Vulgarlang export lines up without hard-coding its columns; add-only, never merge, with an optional skip-existing-headword switch; the relational fields (inflection class, cognates, word pieces, descent links) out of a flat file; a matching CSV export optional; a Swadesh starter list separate and weaker, never built alongside.
- v1.7's Import entries already is a mapping importer (`entriesImportReadCsv` and `entriesImportCsvPicks`, `08_export-layer`; `EntriesImportModal`, `29_modals`): it reads a spreadsheet's own CSV, split at commas or at semicolons, picks each column's field by its header with a dropdown per column to change it, and reads a value outside a dropdown's options as its Other text where the field keeps one. It matches a row to an existing record by id, else by name, and updates what it matches (`entriesImportPlan`).
- A word is shaped as an entry is (`id`, `langId`, `name`, `tags`, `fields`; `04_view`), and the lexicon's schema is a template's (`00_schemas`).
- The CSV export leaves out groups and grids (`entriesCsvColumns`), and the CSV import shuts them out in three places (`entriesImportCsvPicks` and `entriesImportPlan`, `08_export-layer`; the modal's field list, `29_modals`), while the JSON entries import takes them. Gloss, definition, the sense's part of speech, register, and example are in the Senses group.
- Of the plain fields, part of speech, status, origin, name type, and the sense's part of speech and register keep an Other; unit (word, phrase, idiom) doesn't.
- June's "small inline parser" isn't needed: the build carries d3 7.9.0, whose parser handles quoted fields (checked 2026-10-23).
- Vulgarlang's CSV layout isn't documented anywhere a search found (2026-11-07); a real export is the test that matters.

## 3. The export (cut X1)

- Export CSV in the Lexicon workspace's own bar, beside its word count and + New (`04_view`), since it acts on the lexicon alone; the `.conlang` export and import sit in the language bar every workspace shares. It writes the active language's words, ids in the first column, the plain fields, and the first sense's five columns, "Senses · Gloss" and the rest.
- CSV only: the language's full file is the `.conlang` export, which carries everything a flat file can't.
- No other template's CSV changes.

## 4. The import (cut X2)

- Import CSV beside it: the entries importer's modal, pointed at the active language's lexicon, the first sense's five columns among the fields a column can take, which the three places in section 2 that shut out groups have to allow.
- Rows match a word by id only, and only a word in the active language. Re-importing the lexicon's own export updates those words in place; a row with no id, or an id from another language, is a new word, so words spelled the same never merge and a file from anywhere else only adds, June's rule.
- A switch skips a row whose headword the language already has, for re-importing a foreign file without doubling it.
- A value outside a list lands in its Other where the field keeps one, and is listed as a value that didn't read where it doesn't (unit).
- New words take `lex-` ids, as the Lexicon's own New Word does.
- Matching by id only is a third way the importer matches; entries keep matching by id or name.

## 5. Probes

A file with no ids adds every row; the lexicon's own export imports back unchanged; two words spelled the same stay two; a value outside a list lands in Other, or is listed where the list has none; the switch skips an existing headword.

## 6. Cut plan

After computed fields and before the walkthrough, per the order in the roadmap's v1.8 section.

| # | Cut | What it does |
|---|---|---|
| X1 | Lexicon CSV export | Section 3 |
| X2 | Lexicon CSV import | Section 4; a real Vulgarlang export asked for at its pass |
| X3 | Probes and site text | Section 5; the site text a site edit |

## 7. Won't-have in v1.8

- Rows grouped into one word's senses (call 1).
- Matching words by headword (call 2).
- The relational fields in a flat file, and the Swadesh starter list (June's plan).
