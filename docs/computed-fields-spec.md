# Cartulary, Computed Fields Spec (v1.8)

> **The build sheet, settled 2026-11-06 (session 23).** Planned before v1.8 opened, from the roadmap's computed fields row, one call per message, four calls. Every decision below is Drak's unless it says otherwise; the dated calls are in section 1. Claude's defaults are marked as his.

---

## 0. One-sentence statement

A computed field type, worked out when read and never stored: built-ins first (age, a duration, two reference counts), then formulas with numbers, dates, text, and conditions, each filterable, sortable, and exported as a read-only CSV column, with auto-age turned into an Age field.

## 1. Decisions (Drak, 2026-11-06)

- **What computed fields add, call 1, option c** (15:04: "c"). Both: built-in computed fields first and user-written formulas later in the line, on the same read-only field, filter kind, CSV column, and sort. The other ways were a, Claude's default, the built-ins and sort by any field; and b, formulas alone.
- **What a computed value reads, call 2, option a** (15:52: "a"). The entry's own fields, and counts across links: how many entries reference this one, and how many one of its reference fields points to. No value is pulled from another entry, so nothing loops across entries. The other ways were values one link away as well, and the entry's own fields with no counts.
- **Auto-age, call 3, option b** (15:53: "b"). Auto-age becomes a computed Age field (section 4). The other ways were a, Claude's default, auto-age kept as it is and Age opt-in; and c, auto-age removed and Age opt-in.
- **What a formula does, call 4, option b** (15:59: "b"). Numbers and dates in, numbers or text out, with conditions (section 5). The other ways were a, Claude's default, numbers out and numbers and dates in; and c, numbers only.
- **The cut plan** (section 7; 16:01: "ok, next").

## 2. What the plan found

- The entry list sorts by name, updated, and created only (`12_trunk`, the `sortBy` menu in `13_form-engine-display`); no field of any type sorts. So sortable means sort by field first, for every field.
- The filter (`queryTest`, `13_form-engine-display`) tests fields by kind: numbers, dates, references, text.
- The entries exports, JSON and CSV, write stored field values; age isn't stored, so neither carries it.
- Seventeen field types (`FIELD_TYPES`, `00_trunk`), none derived. Age is display-side (`computeLifespanAge`, `06_calendar-engine`, since v1.4): the suffix on the first date range of a template whose Status offers Deceased, and the entry view's and the HTML export's Died at age line, counting days and dividing by the calendar's fixed year length.

## 3. The computed field

- A field type a template adds in the builder, read-only on the entry, worked out when read and never stored: the JSON world file carries the field's definition and never its value.
- The filter tests it by the kind it produces. The sort menu offers it with every other field (cut C1). The CSV export writes it as a read-only column, which import skips.
- An edit recomputes the edited entry, and the counts on the entries it links to.
- Built-ins (cut C2): age, from a date range, to Kalendarium's current moment or to the range's end, through `computeLifespanAge`; the duration between two dates on the entry; how many entries reference this one; how many entries one of its reference fields points to.
- Dates: in-world Calendar Dates count through Kalendarium's absolute days, real-world Dates as calendar days. The leap rules change how age counts years, which is why the line puts them first.

## 4. Auto-age becomes Age (cut C3)

- A migration adds an Age field, once, to each template whose Status offers Deceased, counting from its first date range, the field the suffix uses today. It marks each template done, so a user who deletes the field doesn't get it back on the next load.
- The suffix goes. The field shows what auto-age showed, "~N" and "died at N", and the Died at age line in the entry view and the HTML export comes from the field.
- Those templates' CSV exports gain an Age column, read-only.

## 5. Formulas (cut C4)

- Arithmetic with brackets; fields by label, `{Lifespan}`, number, date, text, and computed fields alike; `year()`, `month()`, `day()`; `days(a, b)`; `round()` and `floor()`; `ifblank(x, y)`; `if(cond, a, b)` with comparisons; and text joined.
- A parser of its own, with no `eval`.
- A blank input gives a blank result. A bad formula shows its error in the template builder, never on the entry.
- A formula can read another computed field on the same entry; the builder rejects a loop.

## 6. Probes

Each cut adds its probes to `tools/probes/`: sorting by a field; a computed value in the filter and in the CSV, and the column skipped on import; the migration adding Age once and not again after a delete; formulas giving known answers, blanks, and builder errors.

## 7. Cut plan

After the leap rules, per the order in the roadmap's v1.8 section.

| # | Cut | What it does |
|---|---|---|
| C1 | Sort by any field | The sort menu gains every field on the template, every type |
| C2 | The computed field type | The built-ins, the filter kind, the read-only CSV column (section 3) |
| C3 | Auto-age becomes Age | The migration (section 4) |
| C4 | Formulas | Section 5 |
| C5 | Site text | A site edit, no r-number |

## 8. Won't-have in v1.8

- Values pulled from another entry (call 2).
- A computed value stored in the save file.
