
const DEFAULT_CALENDAR = {
  name: "Gregorian",
  months: [
    { name: "January", days: 31 },
    { name: "February", days: 28 },
    { name: "March", days: 31 },
    { name: "April", days: 30 },
    { name: "May", days: 31 },
    { name: "June", days: 30 },
    { name: "July", days: 31 },
    { name: "August", days: 31 },
    { name: "September", days: 30 },
    { name: "October", days: 31 },
    { name: "November", days: 30 },
    { name: "December", days: 31 },
  ],
  eras: [],
  // v1.4 (post-Kalendarium) calendar extensions:
  //
  //   week:       weekday cycle for grid view. daysPerWeek is a positive
  //               integer (default 7). dayNames is either an empty array
  //               (grid renders no header row) or an array of exactly
  //               daysPerWeek strings (header row of named weekdays).
  //               Continuous-week math: weekday of any (year, month, day) =
  //               (absoluteDay of that day) mod daysPerWeek. Each month
  //               grid renders with leading-blank cells before Day 1's
  //               weekday column, so Day 1 of a new month doesn't always
  //               land in column 0.
  //
  //   celestials: array of {id, name, cycleDays, offsetDays, color, icon}.
  //               cycleDays is tenths-precision (e.g. 29.5 for a near-lunar
  //               synodic month); offsetDays remains integer (the absDay on
  //               which the body was at phase zero / New). Phase math is
  //               trivial modulo on absoluteDay:
  //                 phaseFraction = ((absDay - offsetDays) mod cycleDays) / cycleDays
  //               Bucketed into five phases (New, Crescent, Half, Gibbous,
  //               Full) waxing/waning collapsed to same bucket per the
  //               5-phase taxonomy. Empty by default — most calendars have
  //               no celestials.
  //
  //   seasons:    array of {id, name, startDay, endDay, color} where
  //               startDay/endDay are 1-indexed dayOfYear values. When
  //               endDay < startDay the season wraps through year-end
  //               (e.g. Winter startDay 335 endDay 59). Auto-derivation
  //               handles wraparound. Seasons may overlap or leave gaps —
  //               not enforced. Empty by default.
  week: { daysPerWeek: 7, dayNames: [] },
  celestials: [],
  seasons: [],
  notes: "",
};

// === Kalendarium (v1.4) foundation ===
//
// Worlds have a primary calendar at state.world.calendar (always present;
// backfilled to DEFAULT_CALENDAR by migrate()). Worlds may also define
// additional calendars at state.calendars[] — first-class objects parallel to
// templates and stemmas. Each additional calendar carries:
//   - id: genId()-style unique identifier
//   - name, months, eras, notes: same shape as primary
//   - anchor: { absoluteDay: <int> } — where this calendar's year 1 month 0
//     day 1 sits on the primary-calendar absoluteDay axis.
//
// AbsoluteDay is the universal time coordinate: primary year 1 month 0 day 1
// equals absoluteDay 0. Every date in the world maps to an absoluteDay
// regardless of which calendar it was declared in. Sort, filter, and
// comparison happen on absoluteDay; display happens in whichever calendar is
// contextually appropriate (entry-bound, view-selected, or primary fallback).
//
// Anchor is stored as absoluteDay rather than as primary Y/M/D so edits to
// primary calendar structure don't shift the absolute moment a secondary
// calendar begins. The anchor's displayed Y/M/D in primary frame is computed
// on demand. If a user wants the displayed Y/M/D to be preserved across
// primary edits, they re-pin the anchor explicitly through the calendar editor.
//
// Entries reference their bound calendar via an optional calendarId field on
// the entry. Null/undefined means primary; otherwise the id must resolve in
// state.calendars[]. getCalendar() handles both cases and falls back to
// primary on unknown ids (defensive against orphaned references).

const daysPerCalendarYear = (calendar) => {
  if (!calendar || !Array.isArray(calendar.months) || calendar.months.length === 0) return 365;
  const sum = calendar.months.reduce((s, m) => s + (m && m.days ? m.days : 0), 0);
  return sum > 0 ? sum : 365;
};

// Convert a date in the calendar's own frame to an absoluteDay in primary
// coords. Date shape: { year: int, monthIndex: 0-based, day: 1-based }. Year
// is the integer as the user wrote it; no year-0-skip (matches the continuous
// integer-axis convention already used by formatYear and findEra). Returns
// null for malformed input.
const calendarDateToAbsoluteDay = (calendar, date) => {
  if (!calendar || !date || date.year == null) return null;
  const dpy = daysPerCalendarYear(calendar);
  const yearOffset = (date.year - 1) * dpy;
  let dayOfYear = 0;
  const mi = date.monthIndex || 0;
  for (let i = 0; i < mi && i < calendar.months.length; i++) {
    dayOfYear += calendar.months[i].days || 0;
  }
  dayOfYear += (date.day || 1) - 1;
  const localDays = yearOffset + dayOfYear;
  const anchorOffset = calendar.anchor ? calendar.anchor.absoluteDay : 0;
  return anchorOffset + localDays;
};

// Inverse of calendarDateToAbsoluteDay. Takes an absoluteDay (primary coords)
// and returns { year, monthIndex, day } in the supplied calendar's own frame.
// Negative years are intentional — dates before a calendar's epoch produce
// year 0 or negative years (continuous axis). Defensive on the dayOfYear
// boundary in case Math.floor and integer arithmetic disagree on edges.
const absoluteDayToCalendarDate = (calendar, absoluteDay) => {
  if (!calendar || absoluteDay == null || !isFinite(absoluteDay)) return null;
  const dpy = daysPerCalendarYear(calendar);
  const anchorOffset = calendar.anchor ? calendar.anchor.absoluteDay : 0;
  const localDays = absoluteDay - anchorOffset;
  const year = Math.floor(localDays / dpy) + 1;
  let dayOfYear = localDays - (year - 1) * dpy;
  if (dayOfYear < 0) dayOfYear += dpy;
  if (dayOfYear >= dpy) dayOfYear -= dpy;
  let monthIndex = 0;
  let day = dayOfYear;
  for (let i = 0; i < calendar.months.length; i++) {
    const md = calendar.months[i].days || 0;
    if (day < md) { monthIndex = i; break; }
    day -= md;
    if (i === calendar.months.length - 1) { monthIndex = i; day = md - 1; }
  }
  return { year, monthIndex, day: day + 1 };
};

// Resolve a calendarId reference to its calendar object. Null/undefined
// returns the world's primary calendar. Unknown ids fall back to primary —
// defensive safety net, though pre-deletion conversion should prevent
// orphaned references in practice. Returns undefined only if state.world is
// missing entirely (which would mean a corrupt state, caller's problem).
const getCalendar = (state, calendarId) => {
  if (!calendarId) return state && state.world && state.world.calendar;
  const found = (state && Array.isArray(state.calendars) ? state.calendars : []).find(c => c && c.id === calendarId);
  return found || (state && state.world && state.world.calendar);
};

// Compute lifespan age for a calendar-date-range value. Returns a structured
// result so both the inline field suffix and the entry-view obituary line can
// share one source of truth.
//
// Returns:
//   { age, isDeceased, approximate, suffix } when computable
//   null when no age should render
//
// Rules:
//   - No start year → null (can't anchor)
//   - End present → isDeceased=true, age computed start→end
//   - End absent + entry is deceased (Thalwen case) → null (unknown death date,
//       refuse to guess against currentMoment)
//   - End absent + not deceased + currentMoment set → isDeceased=false, age
//       computed start→currentMoment
//   - End absent + not deceased + no currentMoment → null (no anchor)
//   - Negative age (forward-dated birth relative to anchor) → null
//   - approximate=true when either endpoint is approximate; the suffix string
//       prefixes the number with "~" in that case
// The "first calendar-date-range field on template" gating is the caller's job;
// this helper trusts that the field passed in IS the lifespan field.
const computeLifespanAge = (value, calendar, entry, template, currentMomentDay) => {
  if (!value || !value.start || value.start.year == null) return null;
  if (!calendar) return null;
  const startDay = calendarDateToAbsoluteDay(calendar, value.start);
  if (startDay == null) return null;

  let endDay = null;
  let isDeceased = false;
  let endApprox = false;
  if (value.end && value.end.year != null) {
    endDay = calendarDateToAbsoluteDay(calendar, value.end);
    isDeceased = true;
    endApprox = !!value.end.approximate;
  } else if (isEntryDeceased(entry, template)) {
    // Deceased status but no death date — refuse to compute age against
    // currentMoment (we'd be making one up). The caller already renders
    // "→ ongoing" / "→ ?"; leaving the age off is the honest move.
    return null;
  } else if (currentMomentDay != null) {
    endDay = currentMomentDay;
  } else {
    return null;
  }
  if (endDay == null) return null;

  const ageDays = endDay - startDay;
  if (ageDays < 0) return null;
  const dpy = daysPerCalendarYear(calendar);
  if (!dpy || dpy <= 0) return null;
  const age = Math.floor(ageDays / dpy);

  const approximate = !!value.start.approximate || endApprox;
  const prefix = approximate ? "~" : "";
  const suffix = isDeceased
    ? ` (died at age ${prefix}${age})`
    : ` (age ${prefix}${age})`;
  return { age, isDeceased, approximate, suffix };
};

// Convert all date-bearing fields on an entry from one calendar's frame to
// another via the universal absoluteDay axis. Preserves the absolute moment
// of each date — only the stored Y/M/D representation changes. Used by the
// pre-deletion conversion flow when a calendar is being removed and its
// bound entries need to be re-anchored.
//
// Walks (recursively for group subfields):
//   - calendar-date fields: convert the value
//   - calendar-date-range fields: convert start and end if present
//   - name-history fields: convert each row's from/to
//   - entry-ref fields with relationKind=spouse: convert marriedOn/endedOn
//     on each spouse ref item
//   - group fields: recurse into subfields for each instance
//
// Returns a new entry object with the converted fields and updated
// calendarId. Preserves approximate flags and other date metadata.
// newCalendarId may be null (meaning "rebind to primary"); the function
// stores null in that case so the entry resolves through primary via
// getCalendar's defensive path.
const convertEntryDatesAcrossCalendars = (entry, template, sourceCal, targetCal, newCalendarId) => {
  if (!entry || !template || !sourceCal || !targetCal) return entry;
  const convertDate = (date) => {
    if (!date || date.year == null) return date;
    const absDay = calendarDateToAbsoluteDay(sourceCal, date);
    if (absDay == null) return date;
    const targetDate = absoluteDayToCalendarDate(targetCal, absDay);
    if (!targetDate) return date;
    // Preserve approximate flag and any other metadata on the original date
    return { ...date, year: targetDate.year, monthIndex: targetDate.monthIndex, day: targetDate.day };
  };
  const convertFieldsObject = (fieldValues, fieldDefs) => {
    const out = { ...(fieldValues || {}) };
    (fieldDefs || []).forEach(f => {
      const v = out[f.id];
      if (v == null) return;
      if (f.type === "calendar-date") {
        out[f.id] = convertDate(v);
      } else if (f.type === "calendar-date-range") {
        out[f.id] = {
          ...v,
          start: v.start ? convertDate(v.start) : v.start,
          end: v.end ? convertDate(v.end) : v.end,
        };
      } else if (f.type === "name-history" && Array.isArray(v)) {
        out[f.id] = v.map(h => ({
          ...h,
          from: h && h.from ? convertDate(h.from) : (h && h.from) || null,
          to: h && h.to ? convertDate(h.to) : (h && h.to) || null,
        }));
      } else if (f.type === "entry-ref" && f.relationKind === SPOUSE_KIND) {
        const items = Array.isArray(v) ? v : [v];
        const converted = items.filter(it => it && typeof it === "object").map(it => ({
          ...it,
          marriedOn: it.marriedOn ? convertDate(it.marriedOn) : it.marriedOn,
          endedOn: it.endedOn ? convertDate(it.endedOn) : it.endedOn,
        }));
        out[f.id] = f.multi ? converted : (converted[0] || null);
      } else if (f.type === "group" && Array.isArray(v)) {
        out[f.id] = v.map(inst => convertFieldsObject(inst, f.subfields || []));
      } else if (f.type === "grid") {
        out[f.id] = mapGridDateCells(v, convertDate);
      }
    });
    return out;
  };
  return {
    ...entry,
    fields: convertFieldsObject(entry.fields || {}, template.fields || []),
    calendarId: newCalendarId || null,
  };
};

// Walks an entry's field values looking for any calendar-date whose stored
// {monthIndex, day} doesn't fit the supplied calendar's structure. Used at
// the entry-rebind boundary to decide whether to run conversion: in-range
// values are left alone (preserving the "fix a mistaken binding" workflow);
// out-of-range values get converted through absoluteDay so the absolute
// moment is preserved while the Y/M/D representation gets rewritten to fit.
//
// Covers all date-bearing surfaces: calendar-date, calendar-date-range,
// name-history (from/to), spouse relations (marriedOn/endedOn), and
// recursively into group subfields.
const hasOutOfRangeDates = (template, fields, calendar) => {
  if (!template || !fields || !calendar || !Array.isArray(calendar.months) || calendar.months.length === 0) return false;
  const months = calendar.months;
  const monthCount = months.length;
  const isOutOfRange = (date) => {
    if (!date || date.year == null) return false;
    const mi = date.monthIndex || 0;
    if (mi < 0 || mi >= monthCount) return true;
    const day = date.day || 1;
    const md = months[mi].days || 30;
    if (day < 1 || day > md) return true;
    return false;
  };
  const visit = (tplFields, valueMap) => {
    if (!Array.isArray(tplFields) || !valueMap) return false;
    for (const f of tplFields) {
      const v = valueMap[f.id];
      if (v == null) continue;
      if (f.type === "calendar-date") {
        if (isOutOfRange(v)) return true;
      } else if (f.type === "calendar-date-range" && typeof v === "object") {
        if (isOutOfRange(v.start) || isOutOfRange(v.end)) return true;
      } else if (f.type === "name-history" && Array.isArray(v)) {
        for (const row of v) {
          if (row && (isOutOfRange(row.from) || isOutOfRange(row.to))) return true;
        }
      } else if (f.type === "entry-ref" && f.relationKind === SPOUSE_KIND) {
        const items = Array.isArray(v) ? v : [v];
        for (const sp of items) {
          if (sp && typeof sp === "object" && (isOutOfRange(sp.marriedOn) || isOutOfRange(sp.endedOn))) return true;
        }
      } else if (f.type === "group" && Array.isArray(v)) {
        for (const inst of v) {
          if (visit(f.subfields || [], inst)) return true;
        }
      } else if (f.type === "grid") {
        if (gridHasDateCellMatching(v, isOutOfRange)) return true;
      }
    }
    return false;
  };
  return visit(template.fields, fields);
};

// Detects whether two calendars differ in any way that affects date semantics:
// month count changes, per-month day count changes, or month reordering (by
// name). Rename-only changes (same length, same per-index days, same per-index
// name) report no structural change. Used at the calendar-structural-edit
// boundary to decide whether to recompute entries' dates through absoluteDay.
const monthsStructurallyChanged = (oldCal, newCal) => {
  const oldMonths = (oldCal && oldCal.months) || [];
  const newMonths = (newCal && newCal.months) || [];
  if (oldMonths.length !== newMonths.length) return true;
  for (let i = 0; i < oldMonths.length; i++) {
    const a = oldMonths[i] || {};
    const b = newMonths[i] || {};
    if ((a.days || 0) !== (b.days || 0)) return true;
    // Name comparison catches reorder cases (two months that swapped positions).
    // Pure renames at unchanged positions also trip this — but conversion
    // through absoluteDay is a no-op in that case (round-trip preserves Y/M/D
    // when month structure at each index is the same days-wise), so a spurious
    // conversion costs nothing.
    if ((a.name || "") !== (b.name || "")) return true;
  }
  return false;
};

// Reframe an entry's dates across a same-calendar structural edit (month
// added, removed, reordered, or day-count changed). Different invariant from
// convertEntryDatesAcrossCalendars: that one preserves the absolute moment
// (used when rebinding to a genuinely different calendar). This one preserves
// the user's intent — month name + day — and rolls forward when the named
// month no longer exists or the day value doesn't fit.
//
// Rules per date:
//   1. Look up the date's month by NAME in the new calendar.
//      - If found and the day fits: update monthIndex to the new position
//        (handles reorder + insertion cases trivially).
//      - If found but the day exceeds the new month's day count: clamp day
//        to the last day of that month.
//   2. If the named month no longer exists (deletion):
//      - Walk forward through the OLD month order, looking for the next
//        month that DOES still exist in the new calendar AND has enough
//        days to hold the original day value (Drak's "skip to D if C has
//        fewer days than the original month" rule).
//   3. If no later month qualifies (deleted month was last, or all later
//      months were also deleted, or none have enough days): roll to next
//      year, first month, clamp day to that month's day count.
//
// Out-of-range stored monthIndex (against old calendar): return date
// unchanged. Defensive; shouldn't happen in normal flow but defends against
// pre-existing corruption.
const reframeDateAcrossStructure = (date, oldCal, newCal) => {
  if (!date || date.year == null) return date;
  if (!oldCal || !newCal) return date;
  const oldMonths = oldCal.months || [];
  const newMonths = newCal.months || [];
  if (oldMonths.length === 0 || newMonths.length === 0) return date;
  const mi = date.monthIndex || 0;
  if (mi < 0 || mi >= oldMonths.length) return date;  // defensive
  const day = date.day || 1;
  const oldName = oldMonths[mi].name || "";

  // Same-name match in new calendar.
  const sameNameIdx = newMonths.findIndex(m => (m.name || "") === oldName);
  if (sameNameIdx >= 0) {
    const newDays = newMonths[sameNameIdx].days || 30;
    return { ...date, monthIndex: sameNameIdx, day: Math.min(day, newDays) };
  }

  // Positional fallback for length-match case: if the calendars have the
  // same total month count, the missing name is more likely a rename than a
  // deletion. Keep monthIndex unchanged; the user just renamed the month.
  // Day still gets clamped if the new month's day count is shorter.
  if (oldMonths.length === newMonths.length && mi < newMonths.length) {
    const fallbackDays = newMonths[mi].days || 30;
    return { ...date, monthIndex: mi, day: Math.min(day, fallbackDays) };
  }

  // Length changed AND named month missing → treat as deletion. Roll forward
  // through old order looking for a month that still exists in new AND can
  // hold our day value.
  for (let i = mi + 1; i < oldMonths.length; i++) {
    const candidateName = oldMonths[i].name || "";
    const candidateIdx = newMonths.findIndex(m => (m.name || "") === candidateName);
    if (candidateIdx >= 0 && (newMonths[candidateIdx].days || 30) >= day) {
      return { ...date, monthIndex: candidateIdx, day };
    }
  }

  // No later month qualifies. Roll to next year, first month. Clamp day
  // if first month is shorter than the original day value.
  const firstMonthDays = newMonths[0].days || 30;
  return { ...date, year: (date.year || 1) + 1, monthIndex: 0, day: Math.min(day, firstMonthDays) };
};

// Walks an entry's field values and reframes every date-bearing surface
// (calendar-date, calendar-date-range, name-history from/to, spouse
// marriedOn/endedOn, recursively into group subfields) through
// reframeDateAcrossStructure. Used by updateCalendarStructured to recompute
// all bound entries' dates atomically with the calendar structural change.
const reframeEntryDatesAcrossStructure = (entry, template, oldCal, newCal) => {
  if (!entry || !template || !oldCal || !newCal) return entry;
  const visit = (fieldDefs, valueMap) => {
    const out = { ...(valueMap || {}) };
    (fieldDefs || []).forEach(f => {
      const v = out[f.id];
      if (v == null) return;
      if (f.type === "calendar-date") {
        out[f.id] = reframeDateAcrossStructure(v, oldCal, newCal);
      } else if (f.type === "calendar-date-range" && typeof v === "object") {
        out[f.id] = {
          ...v,
          start: v.start ? reframeDateAcrossStructure(v.start, oldCal, newCal) : v.start,
          end: v.end ? reframeDateAcrossStructure(v.end, oldCal, newCal) : v.end,
        };
      } else if (f.type === "name-history" && Array.isArray(v)) {
        out[f.id] = v.map(h => ({
          ...h,
          from: h && h.from ? reframeDateAcrossStructure(h.from, oldCal, newCal) : (h && h.from) || null,
          to: h && h.to ? reframeDateAcrossStructure(h.to, oldCal, newCal) : (h && h.to) || null,
        }));
      } else if (f.type === "entry-ref" && f.relationKind === SPOUSE_KIND) {
        const items = Array.isArray(v) ? v : [v];
        const converted = items.filter(it => it && typeof it === "object").map(it => ({
          ...it,
          marriedOn: it.marriedOn ? reframeDateAcrossStructure(it.marriedOn, oldCal, newCal) : it.marriedOn,
          endedOn: it.endedOn ? reframeDateAcrossStructure(it.endedOn, oldCal, newCal) : it.endedOn,
        }));
        out[f.id] = f.multi ? converted : (converted[0] || null);
      } else if (f.type === "group" && Array.isArray(v)) {
        out[f.id] = v.map(inst => visit(f.subfields || [], inst));
      } else if (f.type === "grid") {
        out[f.id] = mapGridDateCells(v, (d) => reframeDateAcrossStructure(d, oldCal, newCal));
      }
    });
    return out;
  };
  return { ...entry, fields: visit(template.fields || [], entry.fields || {}) };
};

// Walk every date-bearing surface on an entry and project each date through
// the entry's bound calendar to an absoluteDay. Returns an array of
// { absDay, fieldLabel, role } records, where role classifies the surface:
//   "date"           - single calendar-date field
//   "range-start"    - calendar-date-range start
//   "range-end"      - calendar-date-range end
//   "name-from"      - name-history row's from-date (took on this name)
//   "name-to"        - name-history row's to-date (left this name)
//   "spouse-married" - spouse declaration marriedOn
//   "spouse-ended"   - spouse declaration endedOn
// Recurses into group subfields. Dates with missing year are skipped.
// Used by the calendar grid cell-click popover to surface entries on any
// clicked day, regardless of which calendar the entry is bound to — the
// projection via absoluteDay handles cross-calendar correctly.
const collectEntryDatesAsAbsoluteDays = (entry, template, state) => {
  if (!entry || !template) return [];
  const cal = getCalendar(state, entry.calendarId);
  if (!cal) return [];
  const results = [];
  const push = (date, fieldLabel, role) => {
    if (!date || date.year == null) return;
    const ab = calendarDateToAbsoluteDay(cal, date);
    if (ab == null) return;
    results.push({ absDay: ab, fieldLabel, role });
  };
  const visit = (fieldDefs, valueMap) => {
    (fieldDefs || []).forEach(f => {
      const v = valueMap[f.id];
      if (v == null) return;
      if (f.type === "calendar-date") {
        push(v, f.label, "date");
      } else if (f.type === "calendar-date-range" && typeof v === "object") {
        push(v.start, f.label, "range-start");
        push(v.end, f.label, "range-end");
      } else if (f.type === "name-history" && Array.isArray(v)) {
        v.forEach(row => {
          if (!row) return;
          const nameLabel = row.name ? `${f.label} → "${row.name}"` : f.label;
          push(row.from, nameLabel, "name-from");
          push(row.to, nameLabel, "name-to");
        });
      } else if (f.type === "entry-ref" && f.relationKind === SPOUSE_KIND) {
        const items = Array.isArray(v) ? v : [v];
        items.forEach(it => {
          if (!it || typeof it !== "object") return;
          push(it.marriedOn, "Marriage", "spouse-married");
          push(it.endedOn, "Marriage", "spouse-ended");
        });
      } else if (f.type === "group" && Array.isArray(v)) {
        v.forEach(inst => visit(f.subfields || [], inst));
      }
    });
  };
  visit(template.fields || [], entry.fields || {});
  return results;
};

// View-level calendar context for cross-entry date-rendering views
// (TimelineView, ChronometricsView, FamilyView, MapView). Each view owns a
// per-view selector value at state.viewPrefs[<prefKey>] — null means primary.
// Returns the resolved calendar plus a Selector component the view renders
// in its header. Hidden when no additional calendars exist (single-calendar
// worlds see zero change). The view supplies prefKey (e.g. "timelineCalendarId")
// and the updateViewPrefs handler it received as a prop.
const getViewCalendarContext = (state, prefKey, onUpdateViewPrefs) => {
  const selectedId = state.viewPrefs?.[prefKey] || null;
  const calendar = getCalendar(state, selectedId);
  const hasAdditional = (state.calendars || []).length > 0;
  const Selector = () => {
    if (!hasAdditional) return null;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <label style={{
          fontSize: 11,
          letterSpacing: "0.13em",
          textTransform: "uppercase",
          color: "var(--text-dim)",
          fontWeight: 600,
        }}>
          Display in
        </label>
        <select
          className="input"
          value={selectedId || ""}
          onChange={(e) => onUpdateViewPrefs({ [prefKey]: e.target.value || null })}
          style={{ minWidth: 200, padding: "4px 8px" }}
        >
          <option value="">{state.world.calendar?.name || "Primary"} (default)</option>
          {(state.calendars || []).map(c => (
            <option key={c.id} value={c.id}>{c.name || "(unnamed)"}</option>
          ))}
        </select>
      </div>
    );
  };
  return { calendar, Selector, selectedId, hasAdditional };
};

const findEra = (year, eras) => {
  if (!Array.isArray(eras) || eras.length === 0) return null;
  if (year == null) return null;
  const sorted = [...eras].sort((a, b) => (b.startYear ?? -Infinity) - (a.startYear ?? -Infinity));
  return sorted.find(e => year >= (e.startYear ?? -Infinity)) || null;
};

const cmpCalendarDates = (a, b) => {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  if ((a.year ?? 0) !== (b.year ?? 0)) return (a.year ?? 0) - (b.year ?? 0);
  if ((a.monthIndex ?? 0) !== (b.monthIndex ?? 0)) return (a.monthIndex ?? 0) - (b.monthIndex ?? 0);
  return (a.day ?? 1) - (b.day ?? 1);
};

// Per-calendar date display formats. The id is stored on calendar.dateFormat;
// the label is the menu sample (standard convention, not the user's real month
// names). "name-day" is the historical default, so existing calendars render
// unchanged. The abbreviated forms pull each month's `abbreviation` field.
const DATE_FORMAT_PRESETS = [
  { id: "name-day", label: "3 January, 2026" },
  { id: "abbr-day-pad", label: "03 JAN 2026" },
  { id: "abbr-day", label: "3 JAN 2026" },
  { id: "name-month", label: "January 3, 2026" },
  { id: "abbr-year-pad", label: "2026 JAN 03" },
];
const DATE_FORMAT_IDS = DATE_FORMAT_PRESETS.map(p => p.id);

const formatCalendarDate = (date, calendar) => {
  if (!date || date.year == null) return "";
  const cal = calendar || DEFAULT_CALENDAR;
  const month = cal.months[date.monthIndex];
  const monthName = month?.name || `Month ${(date.monthIndex ?? 0) + 1}`;
  const abbr = month?.abbreviation
    || (month?.name ? deriveMonthAbbreviation(month.name) : `M${(date.monthIndex ?? 0) + 1}`);
  const era = findEra(date.year, cal.eras);
  const eraSuffix = era?.shortName ? ` ${era.shortName}` : "";
  const day = date.day;
  const pad = (n) => String(n).padStart(2, "0");
  switch (cal.dateFormat) {
    case "abbr-day-pad": return `${pad(day)} ${abbr} ${date.year}${eraSuffix}`;
    case "abbr-day": return `${day} ${abbr} ${date.year}${eraSuffix}`;
    case "name-month": return `${monthName} ${day}, ${date.year}${eraSuffix}`;
    case "abbr-year-pad": return `${date.year} ${abbr} ${pad(day)}${eraSuffix}`;
    case "name-day":
    default: return `${day} ${monthName}, ${date.year}${eraSuffix}`;
  }
};

// Derive a 3-letter month abbreviation from a month name. Used by
// ensureCalendarShape to backfill the abbreviation field on existing
// calendars and by formatCalendarDate as a defensive fallback if a month
// object somehow lacks an abbreviation. Takes the first 3 Unicode letters
// (script-agnostic), uppercased. Non-Latin scripts where uppercase is a
// no-op (kanji, hiragana) pass through unchanged. Numeric-only or
// punctuation-only names fall back to the first 3 trimmed characters.
const deriveMonthAbbreviation = (name) => {
  if (typeof name !== "string") return "";
  const letters = name.match(/\p{L}/gu);
  if (letters && letters.length >= 1) {
    return letters.slice(0, 3).join("").toUpperCase();
  }
  const trimmed = name.trim();
  return trimmed.slice(0, 3).toUpperCase();
};

const formatYear = (year, calendar) => {
  const cal = calendar || DEFAULT_CALENDAR;
  const era = findEra(year, cal.eras);
  return era?.shortName ? `${year} ${era.shortName}` : `${year}`;
};

// Find the first season covering a given 1-indexed day-of-year. Returns null
// if no season matches. Wraparound semantics: a season with endDay < startDay
// is interpreted as spanning the year-end boundary (e.g. Winter startDay 335
// endDay 59 covers days 335..yearLen AND 1..59 every year). Normal seasons
// (endDay >= startDay) match doy within [startDay, endDay] inclusive.
// First-match-wins iteration order; if seasons overlap, the array order
// determines which one "wins" the cell — caller responsibility to order
// seasons sensibly if they overlap.
const getSeasonForDayOfYear = (doy, seasons) => {
  if (!Number.isFinite(doy) || !Array.isArray(seasons) || seasons.length === 0) return null;
  for (let i = 0; i < seasons.length; i++) {
    const s = seasons[i];
    if (!s || !Number.isFinite(s.startDay) || !Number.isFinite(s.endDay)) continue;
    const wraps = s.endDay < s.startDay;
    const inSeason = wraps
      ? (doy >= s.startDay || doy <= s.endDay)
      : (doy >= s.startDay && doy <= s.endDay);
    if (inSeason) return s;
  }
  return null;
};

// Convert a hex color string to an rgba() string at the given alpha. Used
// to tint calendar grid cells with season colors while keeping text legible.
// Accepts both 6-digit and 3-digit hex forms (with or without leading #).
// Returns "transparent" for malformed input — safer than throwing.
const hexToRgba = (hex, alpha) => {
  if (!hex || typeof hex !== "string") return "transparent";
  const m = hex.match(/^#?([0-9a-f]{6})$/i) || hex.match(/^#?([0-9a-f]{3})$/i);
  if (!m) return "transparent";
  let h = m[1];
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = Number.isFinite(alpha) ? Math.max(0, Math.min(1, alpha)) : 1;
  return `rgba(${r},${g},${b},${a})`;
};

// Moon phase glyphs — five-phase taxonomy with waxing/waning collapsed to the
// same glyph per phase. Five indices:
//   0 = New     🌑
//   1 = Crescent🌒 (used for both waxing and waning crescent buckets)
//   2 = Half    🌓 (used for both first and third quarter buckets)
//   3 = Gibbous 🌔 (used for both waxing and waning gibbous buckets)
//   4 = Full    🌕
const MOON_GLYPHS = ["🌑", "🌒", "🌓", "🌔", "🌕"];
const MOON_PHASE_NAMES = ["New", "Crescent", "Half", "Gibbous", "Full"];
// 8 buckets per cycle → 5 phase indices. Buckets are CENTERED on their phase
// events (Convention A): bucket 0 is centered on fraction 0 (New), bucket 4
// is centered on fraction 0.5 (Full), and so on. Each bucket covers
// fraction [k/8 - 1/16, k/8 + 1/16) — half a bucket on either side of the
// phase event. Buckets 5-7 mirror 3-1, so the same glyph renders during
// waxing and waning phases of the same name.
//
// Why centered (vs. the simpler floor(fraction*8) "Convention B" which puts
// phase events at bucket START): astronomical Full lands at fraction 0.5
// regardless of cycle length. Under bucket-start convention, the displayed
// Full window begins AT the astronomical peak and extends past it — biasing
// the displayed phase ~half a bucket late (≈1.3 days for a 21-day cycle).
// Under centered convention, the astronomical peak sits at the midpoint of
// the displayed window. This matters for future Ephemeris work where
// computed phase event times must align with bucket centers, not edges.
const BUCKET_TO_PHASE = [0, 1, 2, 3, 4, 3, 2, 1];

// Compute the 5-phase moon phase index for a given absoluteDay against a
// celestial body with the given cycleDays and offsetDays. offsetDays is the
// absoluteDay on which the body was at phase zero (new). Math:
//   phaseFraction = ((absDay - offsetDays) mod cycleDays) / cycleDays
//   bucket        = floor((phaseFraction + 1/16) * 8) mod 8
// The +1/16 rotates buckets back by half their width so phase events sit at
// bucket centers (see Convention A note above). The outer mod 8 handles the
// wrap case where fraction is near 1.0 and the offset pushes the result to
// bucket 8 — which should fold back to bucket 0 (next cycle's New).
// Defensive modulo on (diff % cycleDays) handles negative phase positions
// (an event 100 days BEFORE the offset still resolves to a positive
// fraction). Returns 0 if cycleDays is invalid (defensive — shouldn't
// happen post-migrate).
// Map a phase fraction to one of the five glyph indices via centered
// eighth-buckets. Pulled out of computeMoonPhase so the geometric phase path
// (computeMoonPhaseGeometric) buckets identically — single source of truth for
// fraction -> glyph, so the cycle-based and geometry-based grids never drift.
// The +1/16 rotates buckets back half a width (events at bucket centers); the
// outer mod 8 folds the near-1.0 wrap into bucket 0 (next cycle's New).
// Callers pass a finite fraction; the cycle path keeps it in [0,1) via modulo,
// the geometric path in [0,0.5] via elongation/360. NaN guard preserves the
// old "return 0 on garbage" behavior.
const fractionToPhaseIndex = (fraction) => {
  if (!Number.isFinite(fraction)) return 0;
  const bucket = Math.floor((fraction + 1/16) * 8) % 8;
  // Defensive clamp: the % 8 above already constrains output to [0, 7], but
  // belt-and-suspenders against any pathological float input.
  return BUCKET_TO_PHASE[Math.min(7, Math.max(0, bucket))];
};

const computeMoonPhase = (absDay, cycleDays, offsetDays) => {
  if (!Number.isFinite(absDay) || !Number.isFinite(cycleDays) || cycleDays <= 0) return 0;
  const off = Number.isFinite(offsetDays) ? offsetDays : 0;
  const diff = absDay - off;
  const mod = ((diff % cycleDays) + cycleDays) % cycleDays;
  return fractionToPhaseIndex(mod / cycleDays);
};

// Regenerate the calendar's id at import time. Calendars have a flat
// structure (no nested ids like stemma nodes), so this is just a one-liner.
// Always called before the calendar touches state.calendars — never reuse
// a foreign id, even if the file was exported from the same world.
const regenerateCalendarId = (cal) => ({ ...cal, id: `cal-${genId()}` });

// Pure-additive calendar shape normalization. Walks the v1.4-post-Kalendarium
// extension fields (week / celestials / seasons) and ensures each exists with
// validated shape on the passed-in calendar. Mutates in place. Idempotent —
// calling repeatedly produces the same result.
//
// Used by migrate() against primary (state.world.calendar) and every
// additional (state.calendars[]) to backfill the new fields on existing
// worlds. Also used by normalizeImportedCalendar after strict validation of
// the v1.4-core fields (name, months, eras, anchor).
//
// Defensive: malformed entries get defaulted, never reject — preserves the
// "load is non-destructive" doctrine. cycleDays defaults to 28 for missing
// values (real-world lunar cycle); seasons missing startDay/endDay default
// to dayOfYear 1; week defaults to 7-day cycle with no header row.
const ensureCalendarShape = (cal) => {
  if (!cal || typeof cal !== "object") return;
  // Months — backfill abbreviation field (v1.5). Non-destructive: only
  // touches abbreviation; name and days untouched. Existing calendars get
  // first-3-letters-of-name as the default; user can edit in the calendar
  // editor. Imports that brought a stored abbreviation are preserved
  // (normalizeImportedCalendar lets it through; this branch validates
  // and re-derives if missing or empty after normalization).
  if (Array.isArray(cal.months)) {
    cal.months = cal.months.map(m => {
      if (!m || typeof m !== "object") return m;
      // Preserve a user-set abbreviation's case (full autonomy); only the
      // auto-derived default uppercases (deriveMonthAbbreviation).
      let abbr = typeof m.abbreviation === "string" ? m.abbreviation.trim().slice(0, 3) : "";
      if (!abbr) abbr = deriveMonthAbbreviation(m.name || "");
      return { ...m, abbreviation: abbr };
    });
  }
  // Date display format (v1.5). Default to the historical full-name day-first
  // form so existing calendars render unchanged.
  if (typeof cal.dateFormat !== "string" || DATE_FORMAT_IDS.indexOf(cal.dateFormat) === -1) {
    cal.dateFormat = "name-day";
  }
  // Week
  if (!cal.week || typeof cal.week !== "object") {
    cal.week = { daysPerWeek: 7, dayNames: [] };
  } else {
    const days = Number.isFinite(cal.week.daysPerWeek) && cal.week.daysPerWeek > 0
      ? Math.floor(cal.week.daysPerWeek) : 7;
    const rawNames = Array.isArray(cal.week.dayNames)
      ? cal.week.dayNames.filter(n => typeof n === "string")
      : [];
    // dayNames must either be empty (no header row) or exactly daysPerWeek
    // long. A mid-edit array of the wrong length gets coerced to empty
    // rather than partially rendered — keeps the header-row invariant
    // simple at render time. Additionally: an all-blank array collapses
    // to empty so the grid doesn't render a row of empty header cells.
    const aligned = rawNames.length === days ? rawNames : [];
    const allBlank = aligned.every(n => !n || !n.trim());
    cal.week = { daysPerWeek: days, dayNames: allBlank ? [] : aligned };
  }
  // Celestials — v1.5 moon-unification shape change. Current shape is an
  // array of moon-body id refs (strings); a calendar references world bodies
  // and renders their phase. Legacy shape is an array of {id,name,cycleDays,
  // offsetDays,...} objects — transient within a single migrate() pass: the
  // celestials->body backfill and the ref rewrite (both in migrate, below)
  // consume the objects and convert the array to refs, so leave object arrays
  // intact here rather than coercing them to the ref shape prematurely (which
  // would strip the backfill's source data). Idempotent on the ref shape.
  if (!Array.isArray(cal.celestials)) {
    cal.celestials = [];
  } else if (cal.celestials.every(c => typeof c === "string")) {
    // Ref shape (current). Empty array also lands here (every() on [] is
    // true). Keep non-empty strings, dedupe, preserve order.
    const seen = new Set();
    cal.celestials = cal.celestials.filter(c => {
      if (!c || seen.has(c)) return false;
      seen.add(c);
      return true;
    });
  } else {
    // Legacy object shape (pre-rewrite). Validate defensively so the body
    // backfill reads clean values; the ref rewrite later in the same
    // migrate() pass replaces this with string refs.
    cal.celestials = cal.celestials
      .filter(c => c && typeof c === "object")
      .map(c => ({
        id: typeof c.id === "string" && c.id ? c.id : `cel-${genId()}`,
        name: typeof c.name === "string" && c.name.trim() ? c.name.trim() : "(unnamed moon)",
        cycleDays: Number.isFinite(c.cycleDays) && c.cycleDays > 0 ? Math.round(c.cycleDays * 10) / 10 : 28,
        offsetDays: Number.isFinite(c.offsetDays) ? Math.floor(c.offsetDays) : 0,
        color: typeof c.color === "string" ? c.color : "",
        icon: typeof c.icon === "string" ? c.icon : "",
      }));
  }
  // Seasons
  if (!Array.isArray(cal.seasons)) cal.seasons = [];
  cal.seasons = cal.seasons
    .filter(s => s && typeof s === "object")
    .map(s => ({
      id: typeof s.id === "string" && s.id ? s.id : `sea-${genId()}`,
      name: typeof s.name === "string" && s.name.trim() ? s.name.trim() : "(unnamed season)",
      startDay: Number.isFinite(s.startDay) && s.startDay >= 1 ? Math.floor(s.startDay) : 1,
      endDay: Number.isFinite(s.endDay) && s.endDay >= 1 ? Math.floor(s.endDay) : 1,
      color: typeof s.color === "string" ? s.color : "",
    }));
};

// Validate and normalize an imported calendar. Defensive against
// hand-edited JSON; returns `{ ok: true, calendar }` or `{ ok: false, error }`.
// Mutates a deep clone — does not touch the caller's object.
//
// Rules:
//   - name must be a non-empty string
//   - months must be a non-empty array of { name: string, days: positive int }
//   - eras (optional) must be an array of { name, startYear?, shortName? }
//   - anchor (optional) must be { absoluteDay: number } — defaulted to
//     { absoluteDay: 0 } if missing. Anchor's absoluteDay is interpreted in
//     whatever frame the source world's primary used, so destination users
//     may want to re-pin via the editor after import (flash hint in caller).
//   - notes/description fields defaulted to empty strings if missing
//   - v1.4 extensions (week / celestials / seasons) pass through
//     ensureCalendarShape for validation. Calendars exported pre-extension
//     get defaults applied as if they were existing worlds being migrated.
const normalizeImportedCalendar = (raw) => {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Empty or invalid calendar payload." };
  }
  const cloned = JSON.parse(JSON.stringify(raw));

  if (!cloned.name || typeof cloned.name !== "string" || !cloned.name.trim()) {
    return { ok: false, error: "Imported calendar is missing a name." };
  }
  cloned.name = cloned.name.trim();

  if (!Array.isArray(cloned.months) || cloned.months.length === 0) {
    return { ok: false, error: "Imported calendar has no months." };
  }
  // Normalize each month: name string, days positive integer. Drop invalid
  // entries silently rather than rejecting the whole import — partially-valid
  // calendars still load most of their structure that way. Abbreviation
  // (v1.5) is passed through if present; ensureCalendarShape downstream
  // backfills from name when missing.
  cloned.months = cloned.months
    .filter(m => m && typeof m === "object")
    .map(m => {
      const out = {
        name: typeof m.name === "string" && m.name.trim() ? m.name.trim() : "(unnamed)",
        days: Number.isFinite(m.days) && m.days > 0 ? Math.floor(m.days) : 30,
      };
      if (typeof m.abbreviation === "string") out.abbreviation = m.abbreviation;
      return out;
    });
  if (cloned.months.length === 0) {
    return { ok: false, error: "Imported calendar has no valid months after validation." };
  }

  if (!Array.isArray(cloned.eras)) cloned.eras = [];
  else {
    cloned.eras = cloned.eras
      .filter(e => e && typeof e === "object" && typeof e.name === "string" && e.name.trim())
      .map(e => ({
        name: e.name.trim(),
        startYear: Number.isFinite(e.startYear) ? Math.floor(e.startYear) : null,
        shortName: typeof e.shortName === "string" ? e.shortName.trim() : "",
      }));
  }

  // Anchor: backfill to absoluteDay 0 if missing or malformed.
  if (!cloned.anchor || typeof cloned.anchor !== "object" || cloned.anchor.absoluteDay == null) {
    cloned.anchor = { absoluteDay: 0 };
  } else {
    cloned.anchor = { absoluteDay: Number.isFinite(cloned.anchor.absoluteDay) ? cloned.anchor.absoluteDay : 0 };
  }

  if (typeof cloned.notes !== "string") cloned.notes = "";
  if (typeof cloned.description !== "string") cloned.description = "";

  // v1.5 moon-unification: extract embedded moons before ensureCalendarShape
  // normalizes celestials. A single-calendar export embeds each moon's synodic
  // data as {name, synodicCycleDays, phaseAnchorDay}; pre-v1.5 exports used
  // {name, cycleDays, offsetDays}. Bare string entries are foreign-world body
  // refs that can't resolve here, so drop them. The destination refs are
  // decided by import reconciliation (caller), so clear celestials to [] and
  // hand the embedded list back separately.
  let embeddedMoons = [];
  if (Array.isArray(cloned.celestials)) {
    embeddedMoons = cloned.celestials
      .filter(c => c && typeof c === "object")
      .map(c => {
        const name = typeof c.name === "string" && c.name.trim() ? c.name.trim() : "(unnamed moon)";
        const cyc = Number.isFinite(c.synodicCycleDays) ? c.synodicCycleDays
                  : (Number.isFinite(c.cycleDays) ? c.cycleDays : null);
        const anc = Number.isFinite(c.phaseAnchorDay) ? c.phaseAnchorDay
                  : (Number.isFinite(c.offsetDays) ? c.offsetDays : null);
        return {
          name,
          synodicCycleDays: (Number.isFinite(cyc) && cyc > 0) ? Math.max(1, Math.round(cyc * 10) / 10) : null,
          phaseAnchorDay: Number.isFinite(anc) ? Math.floor(anc) : null,
        };
      });
  }
  cloned.celestials = [];

  // v1.4 extensions — apply shape normalization to whatever the import
  // brought (or didn't bring) for week / celestials / seasons. Mutates cloned
  // in place.
  ensureCalendarShape(cloned);

  // Strip any unexpected top-level keys so foreign extensions don't leak in.
  const out = {
    id: typeof cloned.id === "string" ? cloned.id : `cal-${genId()}`,
    name: cloned.name,
    months: cloned.months,
    eras: cloned.eras,
    anchor: cloned.anchor,
    notes: cloned.notes,
    description: cloned.description,
    week: cloned.week,
    celestials: cloned.celestials,
    seasons: cloned.seasons,
  };

  return { ok: true, calendar: out, embeddedMoons };
};

function CalendarEditor({ calendar, onChange, entries, templates, currentMoment, moonBodies, onCreateMoon, isLocked }) {
  const cal = calendar || DEFAULT_CALENDAR;

  // Bug 15: scan dates so we can warn before removing/reordering months.
  // Scope: only count usages on entries bound to the calendar currently being
  // edited. A fresh additional calendar with no bindings produces zero usages
  // even if other calendars (primary included) have many. Primary calendar
  // (no id) counts entries with calendarId null or unset, plus the world-level
  // currentMoment if set (caller passes currentMoment only when editing primary).
  const editingCalId = cal.id || null;
  const dateUsages = useMemo(
    () => {
      const relevantEntries = (entries || []).filter(e => (e.calendarId || null) === editingCalId);
      return collectCalendarDateUsages(relevantEntries, templates || [], { currentMoment: currentMoment || null });
    },
    [entries, templates, editingCalId, currentMoment]
  );
  const monthUsageCount = (monthIdx) => dateUsages.filter(u => u.monthIndex === monthIdx).length;
  const totalUsageCount = dateUsages.length;

  const updateMonth = (i, patch) => {
    onChange({ ...cal, months: cal.months.map((m, idx) => idx === i ? { ...m, ...patch } : m) });
  };
  const removeMonth = (i) => {
    if (cal.months.length <= 1) return;
    const count = monthUsageCount(i);
    if (count > 0) {
      const monthName = cal.months[i]?.name || `Month ${i + 1}`;
      if (!confirm(`Remove "${monthName}"? ${count} date${count === 1 ? "" : "s"} reference this month. They'll roll forward to the next still-existing month (or to next year's first month if no later month qualifies). Day values will clamp if the destination month is shorter. Continue?`)) return;
    }
    onChange({ ...cal, months: cal.months.filter((_, idx) => idx !== i) });
  };
  const addMonth = () => {
    onChange({ ...cal, months: [...cal.months, { name: `Month ${cal.months.length + 1}`, days: 30 }] });
  };
  const reorderMonth = (fromIdx, toIdx) => {
    if (fromIdx < 0 || fromIdx >= cal.months.length) return;
    if (toIdx < 0 || toIdx > cal.months.length) return;
    if (fromIdx === toIdx) return;
    if (totalUsageCount > 0) {
      if (!confirm(`Reordering months will update ${totalUsageCount} date reference${totalUsageCount === 1 ? "" : "s"} bound to this calendar — each date keeps its month name and moves to wherever that month now sits. Continue?`)) return;
    }
    const next = [...cal.months];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    onChange({ ...cal, months: next });
  };
  const monthDrag = useDragReorder(reorderMonth);

  const eras = cal.eras || [];
  const updateEra = (i, patch) => {
    onChange({ ...cal, eras: eras.map((e, idx) => idx === i ? { ...e, ...patch } : e) });
  };
  const removeEra = (i) => {
    onChange({ ...cal, eras: eras.filter((_, idx) => idx !== i) });
  };
  const addEra = () => {
    onChange({ ...cal, eras: [...eras, { name: "New Era", shortName: "NE", startYear: 0 }] });
  };

  // === v1.4 post-Kalendarium extensions ===
  // Defensive reads — calendars on older saves might not have these yet if the
  // editor renders before migrate() lands (shouldn't happen via normal load
  // paths, but ensureCalendarShape is idempotent so re-applying it is free).
  const week = cal.week || { daysPerWeek: 7, dayNames: [] };
  // calendar.celestials is an array of moon-body id refs (v1.5 unification).
  const celestials = Array.isArray(cal.celestials) ? cal.celestials : [];
  const seasons = Array.isArray(cal.seasons) ? cal.seasons : [];

  const allMoons = Array.isArray(moonBodies) ? moonBodies : [];
  const MOON_CAP = 5; // per-calendar display cap (cell density — doctrine)
  const isSelected = (bodyId) => celestials.includes(bodyId);
  const toggleMoon = (bodyId) => {
    if (isLocked) return;
    if (isSelected(bodyId)) {
      onChange({ ...cal, celestials: celestials.filter(id => id !== bodyId) });
    } else {
      if (celestials.length >= MOON_CAP) return;
      onChange({ ...cal, celestials: [...celestials, bodyId] });
    }
  };
  const quickCreateMoon = () => {
    if (isLocked || celestials.length >= MOON_CAP || typeof onCreateMoon !== "function") return;
    const newId = onCreateMoon();
    if (newId) onChange({ ...cal, celestials: [...celestials, newId] });
  };

  const updateSeason = (i, patch) => {
    onChange({ ...cal, seasons: seasons.map((s, idx) => idx === i ? { ...s, ...patch } : s) });
  };
  const removeSeason = (i) => {
    onChange({ ...cal, seasons: seasons.filter((_, idx) => idx !== i) });
  };
  const addSeason = () => {
    const yearLen = cal.months.reduce((a, m) => a + (m.days || 0), 0);
    // Default new seasons to a quarter-year span starting partway through
    // the year, so consecutive Adds don't all stack on day 1.
    const quarter = Math.max(1, Math.floor(yearLen / 4));
    const start = Math.min(yearLen, 1 + seasons.length * quarter);
    const end = Math.min(yearLen, start + quarter - 1);
    onChange({
      ...cal,
      seasons: [...seasons, {
        id: `sea-${genId()}`,
        name: `Season ${seasons.length + 1}`,
        startDay: start,
        endDay: end,
        color: "#cccccc",
      }],
    });
  };

  const totalDays = cal.months.reduce((s, m) => s + (m.days || 0), 0);

  return (
    <div className="cal-editor">
      <div className="form-field">
        <label className="form-label">Calendar Name</label>
        <input className="input" value={cal.name || ""} onChange={e => onChange({ ...cal, name: e.target.value })} placeholder="e.g. Gregorian, Julian, Islamic, Hebrew" />
      </div>

      <div className="section-hdr" style={{ marginTop: 18 }}>Months <span style={{ fontWeight: 400, letterSpacing: 0, color: "var(--text-dim)", textTransform: "none", marginLeft: 8 }}>{cal.months.length} months · {totalDays} days/year</span></div>
      <div className="cal-section-help">Set the name and number of days for each month. Months can have any day count.</div>
      {cal.months.map((m, i) => {
        const isDragged = monthDrag.draggedIdx === i;
        const isOver = monthDrag.overIdx === i;
        const showBefore = isOver && monthDrag.dropPosition === "before" && !isDragged;
        const showAfter = isOver && monthDrag.dropPosition === "after" && !isDragged;
        return (
        <div
          key={i}
          className={`cal-row ${isDragged ? "dragging" : ""} ${showBefore ? "drop-before" : ""} ${showAfter ? "drop-after" : ""}`}
          {...monthDrag.rowProps(i)}
        >
          <span className="cal-drag-handle" title="Drag to reorder month" {...monthDrag.handleProps(i)}>⋮⋮</span>
          <span style={{ fontSize: 11, color: "var(--text-dim)", width: 22, textAlign: "right" }}>{i + 1}.</span>
          <input className="input cal-month-name" value={m.name} onChange={e => updateMonth(i, { name: e.target.value })} placeholder="Month name" />
          <input className="input cal-month-abbr" maxLength={3} value={m.abbreviation || ""} onChange={e => updateMonth(i, { abbreviation: e.target.value })} placeholder="Abbr" title="Short form (up to 3 characters) used by the abbreviated date formats" style={{ width: 56, flex: "0 0 auto", textAlign: "center" }} />
          <input className="input cal-month-days" type="number" min="1" max="999" value={m.days} onChange={e => updateMonth(i, { days: parseInt(e.target.value) || 1 })} />
          <span className="cal-month-days-suffix">days</span>
          <button className="del-field-btn" onClick={() => removeMonth(i)} disabled={cal.months.length <= 1} title="Remove">×</button>
        </div>
        );
      })}
      <button className="add-field-btn" onClick={addMonth}>+ Add Month</button>

      <div className="section-hdr" style={{ marginTop: 18 }}>Date Format</div>
      <div className="cal-section-help">
        How dates display across the app for this calendar. The abbreviated forms use each month's short form set above.
      </div>
      <select className="input" value={cal.dateFormat || "name-day"} onChange={e => onChange({ ...cal, dateFormat: e.target.value })} style={{ maxWidth: 260 }}>
        {DATE_FORMAT_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select>

      <div className="section-hdr" style={{ marginTop: 18 }}>Eras <span style={{ fontWeight: 400, letterSpacing: 0, color: "var(--text-dim)", textTransform: "none", marginLeft: 8 }}>optional</span></div>
      <div className="cal-section-help">
        Eras are display-only labels appended to year numbers. A year falls into the era with the highest start-year that's ≤ the year. Examples: "Before Binding" (start: -∞ or low number) and "After Binding" (start year: 0). Year 5 → "5 AB". Year -3 → "-3 BB".
      </div>
      {eras.map((e, i) => (
        <div key={i} className="cal-row">
          <input className="input cal-era-name" value={e.name || ""} onChange={ev => updateEra(i, { name: ev.target.value })} placeholder="Era name (e.g. After Binding)" />
          <input className="input cal-era-short" value={e.shortName || ""} onChange={ev => updateEra(i, { shortName: ev.target.value })} placeholder="Short (AB)" />
          <input className="input cal-era-year" type="number" value={e.startYear ?? ""} onChange={ev => updateEra(i, { startYear: ev.target.value === "" ? null : parseInt(ev.target.value) })} placeholder="Start year" />
          <button className="del-field-btn" onClick={() => removeEra(i)} title="Remove">×</button>
        </div>
      ))}
      <button className="add-field-btn" onClick={addEra}>+ Add Era</button>

      {/* === Week (v1.4 post-Kalendarium) =================================== */}
      {/* Week cycle drives the calendar-grid weekday layout. Continuous across
          month boundaries — Day 1 of any month lands in whatever weekday
          column the math says, with leading blanks for offset. */}
      <div className="section-hdr" style={{ marginTop: 18 }}>Week <span style={{ fontWeight: 400, letterSpacing: 0, color: "var(--text-dim)", textTransform: "none", marginLeft: 8 }}>{week.daysPerWeek} day{week.daysPerWeek === 1 ? "" : "s"} per week</span></div>
      <div className="cal-section-help">
        Sets the number of days in a week for the calendar grid view. The week is continuous — Day 1 of a new month falls on whichever weekday follows the previous month's last day. Day names are optional; leave them all blank for an unlabeled grid.
      </div>
      <div className="cal-row" style={{ alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "var(--text-dim)", width: 100 }}>Days per week</span>
        <input
          className="input cal-month-days"
          type="number"
          min="1"
          max="99"
          value={week.daysPerWeek}
          onChange={e => {
            const n = Math.max(1, Math.min(99, parseInt(e.target.value) || 1));
            // Resize dayNames to match; preserve existing entries up to new length
            const nextNames = Array(n).fill("").map((_, i) => week.dayNames[i] || "");
            onChange({ ...cal, week: { daysPerWeek: n, dayNames: nextNames } });
          }}
        />
        <span className="cal-month-days-suffix">days</span>
      </div>
      <div style={{ marginTop: 8, marginBottom: 4, fontSize: 12, color: "var(--text-dim)" }}>Day names (optional)</div>
      {Array(week.daysPerWeek).fill(0).map((_, i) => (
        <div key={i} className="cal-row" style={{ marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: "var(--text-dim)", width: 60, textAlign: "right" }}>Day {i + 1}.</span>
          <input
            className="input"
            style={{ flex: 1 }}
            value={week.dayNames[i] || ""}
            placeholder={`Day ${i + 1}`}
            onChange={e => {
              const nextNames = Array(week.daysPerWeek).fill("").map((_, j) => j === i ? e.target.value : (week.dayNames[j] || ""));
              onChange({ ...cal, week: { daysPerWeek: week.daysPerWeek, dayNames: nextNames } });
            }}
          />
        </div>
      ))}

      {/* === Celestials (v1.5 moon-unification: ref picker) ================ */}
      {/* Moons are world bodies (defined in Ephemeris / Astronomical Body).
          A calendar references which moons it shows and renders their phase.
          Cap at five per calendar for day-cell readability. */}
      <div className="section-hdr" style={{ marginTop: 18 }}>Celestials <span style={{ fontWeight: 400, letterSpacing: 0, color: "var(--text-dim)", textTransform: "none", marginLeft: 8 }}>{celestials.length} of {MOON_CAP}</span></div>
      <div className="cal-section-help">
        Moons are defined once in the Ephemeris workspace (Astronomical Body). Pick which of this world's moons this calendar shows — the grid renders each one's phase per day, up to {MOON_CAP} per calendar to keep cells readable. A moon's phase is computed from its orbit when it has one, otherwise from its synodic cycle (both set on the moon in Astronomical Body).
      </div>
      {allMoons.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--text-dim)", fontStyle: "italic", padding: "4px 0" }}>
          No moons in this world yet. Create one below (or in the Ephemeris workspace) to show its phase here.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {allMoons.map(m => {
            const selected = isSelected(m.id);
            const atCap = !selected && celestials.length >= MOON_CAP;
            const cyc = Number.isFinite(m.synodicCycleDays) ? `${m.synodicCycleDays}d cycle` : "no cycle set";
            return (
              <label key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px", borderRadius: 4, cursor: (isLocked || atCap) ? "default" : "pointer", opacity: atCap ? 0.5 : 1 }}>
                <input type="checkbox" checked={selected} disabled={isLocked || atCap} onChange={() => toggleMoon(m.id)} />
                <span style={{ color: "var(--text-dim)" }}>◐</span>
                <span style={{ flex: 1 }}>{m.name || "(unnamed moon)"}</span>
                <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{cyc}</span>
              </label>
            );
          })}
        </div>
      )}
      {(() => {
        // Defensive cleanup affordance for refs whose body was deleted in
        // Ephemeris (step-6 deleteBody also sweeps these; this lets the user
        // clear any they encounter in the picker meanwhile).
        const orphans = celestials.filter(id => !allMoons.some(m => m.id === id));
        if (orphans.length === 0) return null;
        return (
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 6, fontStyle: "italic", display: "flex", alignItems: "center", gap: 8 }}>
            <span>{orphans.length} selected moon{orphans.length > 1 ? "s" : ""} no longer exist{orphans.length > 1 ? "" : "s"}.</span>
            {!isLocked && (
              <button className="del-field-btn" style={{ width: "auto", padding: "2px 8px" }} onClick={() => onChange({ ...cal, celestials: celestials.filter(id => allMoons.some(m => m.id === id)) })}>Remove</button>
            )}
          </div>
        );
      })()}
      {!isLocked && celestials.length < MOON_CAP && (
        <button className="add-field-btn" onClick={quickCreateMoon}>+ New moon</button>
      )}
      {celestials.length >= MOON_CAP && (
        <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 6, fontStyle: "italic" }}>Maximum {MOON_CAP} moons shown per calendar — uncheck one to add another.</div>
      )}

      {/* === Seasons (v1.4 post-Kalendarium) ================================ */}
      {/* Seasons by dayOfYear range. Wraparound (endDay < startDay) is allowed
          and interpreted as crossing the year-end boundary — e.g. Winter
          startDay 335 endDay 59 covers the year's tail and head. Auto-derivation
          handles the wrap. Seasons may overlap or leave gaps. */}
      <div className="section-hdr" style={{ marginTop: 18 }}>Seasons <span style={{ fontWeight: 400, letterSpacing: 0, color: "var(--text-dim)", textTransform: "none", marginLeft: 8 }}>{seasons.length} defined · year is {totalDays} days</span></div>
      <div className="cal-section-help">
        Seasonal bands by day-of-year (1–{totalDays}). The calendar grid view tints each season's days with the chosen color. To make a season wrap through year-end (like Earth-Winter from December through February), set the end day before the start day — both halves will tint correctly. Overlaps and gaps are allowed.
      </div>
      {seasons.map((s, i) => {
        const wraps = s.endDay < s.startDay;
        return (
          <div key={s.id} className="cal-row" style={{ flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <input
              className="input"
              style={{ flex: "1 1 140px" }}
              value={s.name}
              placeholder="Season name (e.g. Spring)"
              onChange={e => updateSeason(i, { name: e.target.value })}
            />
            <input
              className="input"
              type="number"
              min="1"
              max={totalDays}
              style={{ width: 70 }}
              value={s.startDay}
              title={`Day of year (1–${totalDays})`}
              onChange={e => updateSeason(i, { startDay: Math.max(1, Math.min(totalDays, parseInt(e.target.value) || 1)) })}
            />
            <span style={{ fontSize: 11, color: "var(--text-dim)" }}>→</span>
            <input
              className="input"
              type="number"
              min="1"
              max={totalDays}
              style={{ width: 70 }}
              value={s.endDay}
              title={`Day of year (1–${totalDays})`}
              onChange={e => updateSeason(i, { endDay: Math.max(1, Math.min(totalDays, parseInt(e.target.value) || 1)) })}
            />
            <input
              type="color"
              style={{ width: 30, height: 28, padding: 0, border: "1px solid var(--border)", borderRadius: 4, cursor: "pointer" }}
              value={s.color || "#cccccc"}
              title="Band color in calendar grid"
              onChange={e => updateSeason(i, { color: e.target.value })}
            />
            {wraps && (
              <span style={{ fontSize: 11, color: "var(--text-dim)", fontStyle: "italic" }} title="endDay < startDay — this season covers the year's tail and head">wraps year-end</span>
            )}
            <button className="del-field-btn" onClick={() => removeSeason(i)} title="Remove">×</button>
          </div>
        );
      })}
      <button className="add-field-btn" onClick={addSeason}>+ Add Season</button>

      <div className="form-field" style={{ marginTop: 18 }}>
        <label className="form-label">Notes</label>
        <textarea className="input" rows={2} value={cal.notes || ""} onChange={e => onChange({ ...cal, notes: e.target.value })} placeholder="Optional notes about this calendar system..." style={{ minHeight: 50, resize: "vertical" }} />
      </div>
    </div>
  );
}