# Cartulary, Leap Rules Spec (v1.8)

> **The build sheet, settled 2026-11-06 (session 23).** Planned before v1.8 opened, from the roadmap's leap rules row and Drak's two Kalendarium and Ephemeris ideas (seasons from Ephemeris; waxing and waning moons), one call per message, four calls. Every decision below is Drak's unless it says otherwise; the dated calls are in section 1. Claude's defaults are marked as his.

---

## 0. One-sentence statement

Leap rules that stack on any calendar (extra days with exceptions, and inserted named periods, each from an optional first year) with a preview of what they move, plus two opt-ins: seasons worked out from Ephemeris per year, and moons that show waxing and waning.

## 1. Decisions (Drak, 2026-11-06)

- **The ideas** (18:12: "Kalendarium's seasons. Currently this is set manually, by the user. I'd like an opt-in - Season's calculated via Ephemeris data, then the user can select what day marks Spring. my first question; is this possible? / Second question: Is it possible to extrapolate moon phases based on positioning?"; 19:42: "add both in. seasons via Ephemeris would be an "opt in" thing as well"; 20:18: "there was something but i cant remember. move on to leap rules"). Phases from position already existed; Claude read "both" as seasons from Ephemeris and waxing and waning moons.
- **What a rule says, call 1, option a** (20:23: "a"). Rules that stack, of two kinds: extra days ("every N years, add D days to month M", with exceptions, "except every N2 years, unless every N3", which states the Gregorian 4/100/400 exactly) and inserted periods ("every N years, insert a period named X of D days after month M", a leap week or month). The other ways were extra days alone without exceptions, and presets only (Gregorian, Julian).
- **What moves when a rule meets existing dates, call 2, option a** (20:24: "a"). Written dates stay and absolute days move; pins set as dates are re-pinned; Ephemeris's orbits stay on absolute days; a preview before saving; an optional first year per rule (section 4). The other ways were absolute days fixed and the written dates rewritten, and a without the first year.
- **Computed seasons, call 3, option a** (20:30: "a"). Worked out per year, from where the planet is that year (section 5). The other ways were worked out once and stored as fixed ranges, and per year with a drift warning.
- **Waxing and waning, call 4, option a** (20:47: "a"). An opt-in per calendar, eight glyphs on both kinds of moon (section 6). The other ways were eight glyphs for everyone, and eight for geometric moons only.
- **Dul Pantra** (20:50: "i just didnt enter it, in DP"). The leap week isn't in Drak's world in any form, so nothing converts; adding the rule goes through call 2's preview.
- **The cut plan** (section 8; 20:55: "looks good").

## 2. What the plan found

- A calendar is months with fixed day counts (`DEFAULT_CALENDAR`, `06_calendar-engine`); its year length is their sum (`daysPerCalendarYear`), every year alike.
- `daysPerCalendarYear` has eight callers: seven multiply or divide by it, the two conversions (`calendarDateToAbsoluteDay`, `absoluteDayToCalendarDate`) and age (`computeLifespanAge`) in `06_calendar-engine` and four in Chronometric's axis and steps (`19_chronometric`), and Kalendarium only prints it (`25_kalendarium`). Three places work the year out without it: Force Align (`24_ephemeris/04_forcealign`), the season editor (`06_calendar-engine`), and Observe's step buttons (`24_ephemeris/03_observe`), which sum a `daysPerMonth` no month has, so ±1y always steps 365 days and ±1mo 365 over the month count, a bug in v1.7 as shipped (found 2026-11-10). Month lengths are read directly by the grid, date validation, the in-world date picker (`14_form-engine-edit`), and Chronometric's axis and day steps.
- Dates are stored as year, month index, and day. A calendar other than the primary carries `anchor.absoluteDay`; a moon on a hand-set cycle carries `phaseAnchorDay`.
- Seasons are hand-set day-of-year ranges (`getSeasonForDayOfYear`). Ephemeris propagates every body by absolute day (`computeRootRelativePosition`, `24_ephemeris/06_orbital-math`) and stores a planet's axial tilt. A calendar links moons (`celestials`), not its planet.
- Phases: `computeMoonPhaseGeometric` reads the star, planet, and moon angle, unsigned, into five glyphs (`MOON_GLYPHS`, `BUCKET_TO_PHASE`, waxing and waning folded); the hand-set cycle keeps the full fraction and folds it the same way.

## 3. Rules (cuts L1 and L3)

- Stored on the calendar; any number per calendar; each of one of the two kinds in section 1, with an optional first year.
- Year length and month lengths per year; the conversions work out leap years arithmetically, not by walking year by year, so a date thousands of years out costs the same as one nearby.
- The eight callers and the three places that work the year out themselves switch to the per-year length, which fixes Observe's step buttons.
- An inserted period appears in leap years in the grid, the date pickers, and every date display. A date inside one is stored as the year, the period's id, and the day; L1 fixes the shape and what an older version makes of it.
- Age counts birthdays: whole years by date, not days divided by one year length (`computeLifespanAge`, which auto-age and computed fields' Age both use).

## 4. Adding a rule to a calendar with dates (cut L2)

- What's written stays: March 1, 1200 still reads March 1, 1200, its absolute day moved by the leap days before it.
- A pin set as a date is re-pinned so it still means that date, and no pin records how it was entered, so it goes by kind (checked 2026-11-10): a calendar's anchor is only ever set from a date in the primary calendar (Re-pin, `25_kalendarium`) and stored as an absolute day, so a rule on the primary re-pins every anchor to the same primary date and a rule on any other calendar leaves anchors alone; a moon's phase anchor is only ever entered as an absolute day (`24_ephemeris/02_asbo`, or migrated from `offsetDays`, `10_migrate`), so it stays.
- Ephemeris's orbits stay on absolute days: a body's position on a day doesn't change, only the calendar's name for the day.
- Before the rule saves, a preview says how many dates it moves, from which year, and by up to how many days.

## 5. Seasons from Ephemeris (cut L4)

- An opt-in per calendar. The calendar gains a planet setting, filled by default with the parent of its linked moons where it has any.
- The user picks the day that marks Spring; the planet's position on it is the spring point, and summer, autumn, and winter begin where the planet has gone a quarter, a half, and three quarters of its orbit on, uneven on an eccentric orbit.
- Worked out per year: where the calendar's average year runs off its orbit, the seasons drift through the calendar, and leap rules pull them back. The grid and the season lookup take a year with the day; hand-set seasons stay fixed ranges.
- A tilt of 0 degrees gives no seasons, and the opt-in says so.

## 6. Waxing and waning (cut L5)

- An opt-in per calendar, "Show waxing and waning": eight glyphs, on moons on a hand-set cycle and on geometric moons alike. Calendars that don't turn it on keep five.
- The geometric phase reads the angle's direction, which side of the planet and star line the moon is on.

## 7. Probes

With each cut: the Gregorian rule's known leap years; dates to absolute days and back across leap years; a rule added to a world with dates, its written dates unmoved and its date-entered pins re-pinned; computed seasons in two different years; a waxing and a waning moon told apart.

## 8. Cut plan

After mobile and before computed fields, per the order in the roadmap's v1.8 section.

| # | Cut | What it does |
|---|---|---|
| L1 | The rule engine | Section 3, without the screens |
| L2 | The rule editor | Section 4 and the editor in Kalendarium |
| L3 | Inserted periods on screen | Grid, pickers, every date display |
| L4 | Seasons from Ephemeris | Section 5 |
| L5 | Waxing and waning | Section 6 |
| L6 | Site text | A site edit, no r-number |

## 9. Won't-have in v1.8

- Rewriting written dates to hold absolute days (call 2).
- Seasons stored as fixed ranges from one reference year (call 3).
- Eight glyphs on calendars that didn't ask for them (call 4).
