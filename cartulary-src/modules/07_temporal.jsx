
// Map time-mode helpers ────────────────────────────────────────────────────────
// Compute the temporal "footprint" of an entry — the year-span over which a
// pin linked to this entry should be visible in time mode. Reads the first
// calendar-date-range field (treated as the entry's lifetime claim) AND the
// first name-history field (treated as naming claims that imply existence).
// Returns { startYear, endYear } where either side may be null (open-ended);
// returns null if the entry has no temporal data at all.
//
// Combining rules:
//  - calendar-date-range bounds are authoritative for lifetime when present.
//  - name-history rows with at least one date contribute via union: the entry
//    existed at least when it had those names.
//  - When ONLY name-history supplies data (no calendar-date-range), the
//    primary name (entry.name) is presumed to cover any year not claimed by
//    a name-history row. The union of "primary name covers everything else"
//    plus any number of finite name-history ranges always equals "fully
//    open." So in this branch we collapse to {null, null}. Users who want
//    strict bounding from name-history alone should add a calendar-date-range
//    field (e.g. Active Period / Lifespan) to explicitly bound the entity.
//  - Open-ended sources (start=null with end set, or end=null with start set)
//    propagate openness on that side.
//
// Point dates (calendar-date) are intentionally ignored — they don't have
// meaningful "from / to" semantics for a pin's lifespan.
const getEntryTemporalRange = (entry, template) => {
  if (!entry || !template) return null;

  const years = [];  // finite year hints from any source — used for scrubber sizing
  let apMin = Infinity, apMax = -Infinity, apOpenStart = false, apOpenEnd = false, hasAP = false;
  let hasNH = false;

  for (const f of template.fields) {
    if (f.type !== "calendar-date-range") continue;
    const v = entry.fields?.[f.id];
    if (!v) continue;
    const sy = v.start && v.start.year != null ? v.start.year : null;
    const ey = v.end && v.end.year != null ? v.end.year : null;
    if (sy == null && ey == null) continue;
    if (sy != null) { apMin = Math.min(apMin, sy); years.push(sy); }
    else if (ey != null) apOpenStart = true;
    if (ey != null) { apMax = Math.max(apMax, ey); years.push(ey); }
    else if (sy != null) apOpenEnd = true;
    hasAP = true;
    break;
  }

  // Walk name-history rows. We accumulate min/max bounds and openness flags
  // separately from AP because the "primary fills gaps" rule only fires when
  // AP is absent — if AP claims the lifetime, NH is just naming detail
  // and contributes via straight union.
  let nhMin = Infinity, nhMax = -Infinity, nhOpenStart = false, nhOpenEnd = false;
  for (const f of template.fields) {
    if (f.type !== "name-history") continue;
    const history = entry.fields?.[f.id];
    if (!Array.isArray(history)) continue;
    for (const h of history) {
      if (!h || !h.name) continue;
      const fy = h.from && h.from.year != null ? h.from.year : null;
      const ty = h.to && h.to.year != null ? h.to.year : null;
      if (fy == null && ty == null) continue;
      if (fy != null) { nhMin = Math.min(nhMin, fy); years.push(fy); }
      else if (ty != null) nhOpenStart = true;
      if (ty != null) { nhMax = Math.max(nhMax, ty); years.push(ty); }
      else if (fy != null) nhOpenEnd = true;
      hasNH = true;
    }
    break;
  }

  if (!hasAP && !hasNH) return null;

  if (hasAP) {
    // AP authoritative; NH extends bounds via union when its rows go beyond.
    const minStart = hasNH ? Math.min(apMin, nhMin) : apMin;
    const maxEnd = hasNH ? Math.max(apMax, nhMax) : apMax;
    const openStart = apOpenStart || (hasNH && nhOpenStart);
    const openEnd = apOpenEnd || (hasNH && nhOpenEnd);
    return {
      startYear: openStart ? null : (minStart === Infinity ? null : minStart),
      endYear: openEnd ? null : (maxEnd === -Infinity ? null : maxEnd),
      years,
    };
  }

  // Only name-history supplied data → primary name fills everything else,
  // making the footprint fully open. Pin visible at any year; label resolves
  // by year via resolveEntryNameAtYear. The years[] hints still drive the
  // scrubber's year range so it sits around the named periods.
  return { startYear: null, endYear: null, years };
};

const isPinVisibleAtYear = (pin, entriesById, templatesById, year) => {
  // Permanent flag wins over everything else. A user who marks a pin permanent
  // is making an explicit cartographic claim ("this place is always on this
  // map") that overrides any temporal data on the linked entry. Useful for
  // geological features where a Location entry might track temporary
  // occupancy or naming, but the place itself exists across the whole timeline.
  if (pin.permanent) return true;
  // Unlinked pins stay always-visible: there's no entry whose data could
  // constrain them, and there's no editor UI to mark them as time-filtered.
  if (!pin.entryId) return true;
  const entry = entriesById[pin.entryId];
  if (!entry) return true;
  const tpl = templatesById[entry.templateId];
  if (!tpl) return true;
  const bounds = getEntryTemporalRange(entry, tpl);
  // Linked but no date data, not permanent: HIDE. Previously this case was
  // treated as "always visible" because no-data and unconstrained looked the
  // same to the filter. They're not — no-data usually means "user hasn't filled
  // in dates yet" rather than "this exists across all time," and a pin that's
  // genuinely permanent should be flagged as such.
  if (!bounds) return false;
  if (bounds.startYear != null && year < bounds.startYear) return false;
  if (bounds.endYear != null && year > bounds.endYear) return false;
  return true;
};

// Absolute-day variant of getEntryTemporalRange. Returns the same shape
// (startAbsDay / endAbsDay / absoluteDays[]) but with values projected
// through the entry's bound calendar via the universal absoluteDay axis,
// so comparisons across entries from different calendars are coherent.
// Year-level resolution (Y1M0D1 of the bound calendar) matches the original
// helper's precision — temporal range filtering is annual-grained.
const getEntryTemporalRangeAbsDay = (entry, template, state) => {
  const r = getEntryTemporalRange(entry, template);
  if (!r) return null;
  const entryCal = getCalendar(state, entry.calendarId);
  if (!entryCal) return null;
  const yearToAbsDay = (y) => calendarDateToAbsoluteDay(entryCal, { year: y, monthIndex: 0, day: 1 });
  return {
    startAbsDay: r.startYear != null ? yearToAbsDay(r.startYear) : null,
    endAbsDay: r.endYear != null ? yearToAbsDay(r.endYear) : null,
    absoluteDays: (r.years || []).map(yearToAbsDay).filter(v => v != null),
  };
};

// Pin visibility on the absoluteDay axis. Caller supplies the current
// absoluteDay (typically derived from the scrubber's view-frame year via
// calendarDateToAbsoluteDay(viewCalendar, {year, monthIndex:0, day:1})).
// Identical visibility semantics to isPinVisibleAtYear — permanent flag
// trumps everything, unlinked stays visible, linked-with-no-data hides.
const isPinVisibleAtAbsDay = (pin, entriesById, templatesById, state, absDay) => {
  if (pin.permanent) return true;
  if (!pin.entryId) return true;
  const entry = entriesById[pin.entryId];
  if (!entry) return true;
  const tpl = templatesById[entry.templateId];
  if (!tpl) return true;
  const bounds = getEntryTemporalRangeAbsDay(entry, tpl, state);
  if (!bounds) return false;
  if (bounds.startAbsDay != null && absDay < bounds.startAbsDay) return false;
  if (bounds.endAbsDay != null && absDay > bounds.endAbsDay) return false;
  return true;
};

// Resolve what an entry was called at a particular year. Reads the FIRST
// name-history field on the entry's template (in field order). If no year is
// provided, no name-history field exists, or no entry in the history covers
// the year, falls back to the entry's primary name.
//
// History entry shape: { name: string, from?: {year, monthIndex, day}, to?: same }
// from/to can both be null/missing — null from means "since forever",
// null to means "still current". A history entry whose neither bound covers
// the year is filtered out; ties are resolved by storage order (first wins).
const resolveEntryNameAtYear = (entry, template, year) => {
  if (!entry) return "";
  if (year == null || !template) return entry.name;
  const histField = (template.fields || []).find(f => f.type === "name-history");
  if (!histField) return entry.name;
  const history = entry.fields?.[histField.id];
  if (!Array.isArray(history) || history.length === 0) return entry.name;
  const yearInRange = (h) => {
    const fromY = h.from?.year;
    const toY = h.to?.year;
    if (fromY != null && year < fromY) return false;
    if (toY != null && year > toY) return false;
    return true;
  };
  const match = history.find(h => h && h.name && yearInRange(h));
  return match ? match.name : entry.name;
};

// Collect all name-history alternative names for an entry, regardless of dates.
// Used by wiki-link resolution and autocomplete to find an entry by any of
// its historical names.
const getEntryNameHistory = (entry, template) => {
  if (!entry || !template) return [];
  const histField = (template.fields || []).find(f => f.type === "name-history");
  if (!histField) return [];
  const history = entry.fields?.[histField.id];
  if (!Array.isArray(history)) return [];
  return history.map(h => h?.name).filter(n => typeof n === "string" && n.trim() !== "");
};

// ─── Markdown export ───────────────────────────────────────────────────────────
// Generates a human-readable export with all IDs resolved to names, wiki-links
// resolved, and content rendered as flowing Markdown. Companion to JSON export.
// Useful as AI reference, player handouts, printed documentation, etc.

// v1.7 r043: through the world's one resolver (wikiResolverOf), so a former
// name, a body, a map, a stemma, a Fabula record, and a language write their
// names too. A link whose words aren't its record's name says which record
// it means.
const resolveWikiLinksForMd = (text, wiki) => {
  if (!text || typeof text !== "string") return text || "";
  return text.replace(/\[\[([^\]\n]+)\]\]/g, (match, inner) => {
    const pipe = inner.indexOf("|");
    const target = pipe >= 0 ? inner.substring(0, pipe).trim() : inner.trim();
    const display = pipe >= 0 ? inner.substring(pipe + 1).trim() : null;
    const rec = wiki ? wiki.find(target.toLowerCase()) : null;
    if (!rec) return match;
    const shown = display || target;
    if (shown.toLowerCase() !== rec.name.trim().toLowerCase()) {
      return `${shown} (referring to ${rec.name})`;
    }
    return rec.name;
  });
};

// Wiki-link resolver for HTML export. Replaces [[Name]] with an anchor href
// pointing at the entry's article. Broken links (target doesn't exist OR
// target is filtered out by secret-exclusion / template-filter) render as a
// styled span so the reader can see "something was meant to be here."
// The `escape` callback HTML-escapes the inner text — passed in to avoid
// circular dependency on the escape helper that lives in buildHtmlExport.
// v1.7 r023: given articleIds, the ids of what the file holds (a Fabula
// bible's), a link to an entry the file doesn't hold is the entry's name in
// an entry-ref-record span instead of an anchor.
// v1.7 r043: through the world's one resolver (wikiResolverOf), by Drak's
// call 1 at the cut: an entry, or a map, whose article the world's export
// carries, is a link to its article; a body, a stemma, a Fabula record, or a
// language is its name in an entry-ref-record span titled with its kind, as
// a reference to one is (refLinkHtml); and given articleIds, whatever the
// file holds links to its article, and anything else is its name.
const resolveWikiLinksForHtml = (text, wiki, escape, articleIds) => {
  if (!text || typeof text !== "string") return escape(text || "");
  // Process wiki-links FIRST, before escaping, to find anchor targets.
  // Then escape the surrounding text but leave our generated anchors alone.
  // Strategy: split on wiki-link matches, escape the non-link segments,
  // emit anchor HTML for the matched segments.
  const parts = [];
  let cursor = 0;
  const re = /\[\[([^\]\n]+)\]\]/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    // Text before this match
    parts.push(escape(text.substring(cursor, m.index)));
    const inner = m[1];
    const pipe = inner.indexOf("|");
    const target = pipe >= 0 ? inner.substring(0, pipe).trim() : inner.trim();
    const display = pipe >= 0 ? inner.substring(pipe + 1).trim() : target;
    const rec = wiki ? wiki.find(target.toLowerCase()) : null;
    const linked = rec && (articleIds ? articleIds.has(rec.id) : (rec.kind === "entry" || rec.kind === "map"));
    if (linked) {
      parts.push(`<a class="wiki-link" href="#entry-${escape(rec.id)}">${escape(display)}</a>`);
    } else if (rec) {
      parts.push(`<span class="entry-ref-record" title="${escape(rec.kind === "entry" ? "World entry" : wikiRecordKind(rec))}">${escape(display)}</span>`);
    } else {
      parts.push(`<span class="broken-link" title="No entry named '${escape(target)}'">${escape(display)}</span>`);
    }
    cursor = m.index + m[0].length;
  }
  parts.push(escape(text.substring(cursor)));
  return parts.join("");
};