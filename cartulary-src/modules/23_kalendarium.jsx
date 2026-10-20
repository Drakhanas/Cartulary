
// ─── Kalendarium views (v1.4) ────────────────────────────────────────────────
//
// KalendariumIndexView: the list-of-calendars surface for the Kalendarium
// sidebar slot when no specific calendar is active. Shows primary + every
// additional calendar with a comparison strip — the date that drives the
// strip is the anchor moment of the currently-pinned calendar (literal-edit
// auto-pins; explicit pin button overrides). Click a row's Edit button or
// the row itself to drill into KalendariumEditorView for that calendar.
//
// KalendariumEditorView: the per-calendar editor — back button, anchor
// section (additional-only), then the existing CalendarEditor for months /
// eras / name / notes. The anchor section shows the current anchor's
// displayed Y/M/D in primary frame (recalculated from current primary
// structure on every render — so primary edits show through without
// changing the underlying absoluteDay) and a Re-pin Anchor button that
// opens an inline CalendarDateEditor in primary frame.
//
// Pre-deletion conversion (Drak's decision #4) is stubbed for now — the
// modal-with-preview ships when entry-level calendarId binding lands in
// piece F. Until then, delete is blocked if any entry references the
// calendar via calendarId, with an explanatory alert.

function KalendariumIndexView({ state, isLocked, referenceCalendarId, onOpenCalendar, onCreateCalendar, onDeleteCalendar, onPinReference, onExportCalendar, onImportCalendar, onRequestDeletionModal, onSetCurrentMoment, onOpenEntry, onUpdateViewPrefs }) {
  const primary = state.world.calendar;
  const additional = state.calendars || [];
  const importFileRef = useRef(null);

  // v1.4 post-Kalendarium: which calendar's grid is currently expanded inline.
  // null = none expanded. rowKey is "__primary__" or cal.id, matching the
  // pattern used by onOpenCalendar and the viewPrefs grid-year storage.
  // Local UI state — not persisted; reopening the view always lands with no
  // grid expanded.
  const [expandedGridFor, setExpandedGridFor] = useState(null);
  const toggleGrid = (rowKey) => {
    setExpandedGridFor(prev => prev === rowKey ? null : rowKey);
  };

  // Current moment editor: ephemeral state for the inline date picker. When
  // null, the panel shows the stored value (or "not set"); when populated,
  // the CalendarDateEditor is mounted with this as its value. Save commits
  // through onSetCurrentMoment, which writes state.world.currentMoment as
  // { year, monthIndex, day } in primary's frame (no absoluteDay conversion —
  // calendar-position invariance applies to primary-bound dates).
  const currentMoment = state.world?.currentMoment || null;
  const [cmDraft, setCmDraft] = useState(null);  // { year, monthIndex, day } | null
  const [cmEditing, setCmEditing] = useState(false);
  const startCmEdit = () => {
    setCmDraft(currentMoment ? { ...currentMoment } : null);
    setCmEditing(true);
  };
  const cancelCmEdit = () => { setCmDraft(null); setCmEditing(false); };
  const saveCmEdit = () => {
    if (!cmDraft || cmDraft.year == null) { cancelCmEdit(); return; }
    // Pass the picker output through verbatim — Y/M/D in primary's frame.
    // Strip approximate flag if the picker happened to include one (we set
    // allowApproximate=false but be defensive).
    onSetCurrentMoment({
      year: cmDraft.year,
      monthIndex: cmDraft.monthIndex ?? 0,
      day: cmDraft.day ?? 1,
    });
    cancelCmEdit();
  };
  const clearCm = () => {
    onSetCurrentMoment(null);
    cancelCmEdit();
  };
  const currentMomentDisplay = currentMoment
    ? formatCalendarDate(currentMoment, primary)
    : null;

  // Reference moment: the absoluteDay that drives the comparison strip per row.
  // null referenceCalendarId means primary, whose anchor is absoluteDay 0 by
  // definition. Any other id resolves to that calendar's anchor.absoluteDay.
  const refAbsoluteDay = (() => {
    if (!referenceCalendarId) return 0;
    const cal = additional.find(c => c.id === referenceCalendarId);
    return cal?.anchor?.absoluteDay ?? 0;
  })();

  const displayInCalendar = (cal) => {
    const date = absoluteDayToCalendarDate(cal, refAbsoluteDay);
    if (!date) return "—";
    return formatCalendarDate(date, cal);
  };

  const entriesReferencing = (calId) => {
    return state.entries.filter(e => e.calendarId === calId).length;
  };

  const handleDelete = (cal) => {
    const count = entriesReferencing(cal.id);
    if (count > 0) {
      // Pre-deletion conversion modal: hand off to App so it can show the
      // target picker and run the atomic conversion-then-delete operation.
      // App owns the modal because the conversion needs access to the full
      // template list and updateState.
      onRequestDeletionModal(cal, count);
      return;
    }
    if (!confirm(`Delete calendar "${cal.name}"? No entries reference it, so no data will be affected.`)) return;
    onDeleteCalendar(cal.id);
  };

  const renderRow = (cal, opts) => {
    const { isPrimary, isReference } = opts;
    const rowKey = isPrimary ? "__primary__" : cal.id;
    return (
      <div
        key={rowKey}
        style={{
          display: "flex",
          gap: 16,
          padding: "14px 16px",
          border: `1px solid ${isReference ? "var(--accent)" : "var(--border)"}`,
          borderRadius: 6,
          marginBottom: 8,
          background: isReference ? "var(--bg-accent-subtle, rgba(200,169,110,0.05))" : "var(--bg-panel)",
        }}
      >
        <div
          style={{ flex: 1, cursor: "pointer", display: "flex", flexDirection: "column", gap: 6 }}
          onClick={() => onOpenCalendar(rowKey)}
          title="Click to edit this calendar"
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 16 }}>{cal.name || "(unnamed)"}</span>
            {isPrimary && (
              <span style={{ fontSize: 10, letterSpacing: "0.13em", textTransform: "uppercase", color: "var(--accent)", fontWeight: 600 }}>
                PRIMARY
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
            {cal.months?.length || 0} month{(cal.months?.length || 0) === 1 ? "" : "s"}
            {" · "}
            {(cal.eras || []).length} era{((cal.eras || []).length) === 1 ? "" : "s"}
          </div>
          <div style={{ fontSize: 13, color: "var(--text)" }}>
            <span style={{ color: "var(--text-dim)", marginRight: 8 }}>Reference moment:</span>
            <span style={{ fontFamily: "'DM Sans', sans-serif" }}>{displayInCalendar(cal)}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
          <button
            className="btn btn-ghost"
            onClick={(e) => { e.stopPropagation(); onPinReference(isPrimary ? null : cal.id); }}
            title={isReference ? "This calendar drives the reference moment" : "Pin this calendar as the reference"}
            style={isReference ? { color: "var(--accent)", fontWeight: 600 } : {}}
          >
            {isReference ? "📌 Pinned" : "Pin"}
          </button>
          <button
            className="btn btn-ghost"
            onClick={(e) => { e.stopPropagation(); onOpenCalendar(rowKey); }}
          >
            Edit
          </button>
          <button
            className="btn btn-ghost"
            onClick={(e) => { e.stopPropagation(); toggleGrid(rowKey); }}
            title="Show or hide a year-at-a-glance grid for this calendar"
            style={expandedGridFor === rowKey ? { color: "var(--accent)", fontWeight: 600 } : {}}
          >
            {expandedGridFor === rowKey ? "Hide grid" : "Show grid"}
          </button>
          <button
            className="btn btn-ghost"
            onClick={(e) => { e.stopPropagation(); onExportCalendar(cal); }}
            title="Export this calendar as JSON for import into another world"
          >
            Export
          </button>
          {!isPrimary && (
            <button
              className="btn btn-ghost"
              onClick={(e) => { e.stopPropagation(); handleDelete(cal); }}
              disabled={isLocked}
              style={{ color: "var(--danger, #c8836e)" }}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 24 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: "0 0 8px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 400 }}>
            Calendars
          </h2>
          <p style={{ margin: 0, color: "var(--text-dim)", fontSize: 13, maxWidth: 720 }}>
            Every world has a primary calendar — the canonical reference frame for all dates. Additional calendars project onto the primary via an anchor date, letting you reckon time in multiple cultural systems while comparisons stay consistent under the hood. The reference moment in the strip below comes from whichever calendar was most recently edited or pinned. The Current Moment panel below is separate — it pins the story's "now" so the entry view can compute ages for living character entries with a lifespan.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            ref={importFileRef}
            type="file"
            accept=".json,application/json"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f && onImportCalendar) onImportCalendar(f);
              e.target.value = "";  // allow re-picking the same file
            }}
          />
          <button
            className="btn btn-ghost"
            onClick={() => importFileRef.current?.click()}
            disabled={isLocked}
            title="Import a calendar from a .calendar.json file"
          >
            Import
          </button>
          <button className="btn btn-accent" onClick={onCreateCalendar} disabled={isLocked}>
            + New Calendar
          </button>
        </div>
      </div>

      {/* Current Moment panel — the world-level "story now" anchor. When set,
          the entry view auto-computes age suffixes for living character-template
          entries with a Lifespan field. When null, no age suffix renders for
          living characters (deceased characters use their explicit end date and
          render age regardless). Stored as state.world.currentMoment.absoluteDay
          in primary's frame. */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        marginBottom: 16,
        border: "1px solid var(--border)",
        borderRadius: 6,
        background: "var(--surf2)",
        fontSize: 13,
      }}>
        <strong style={{ color: "var(--text-dim)", fontWeight: 500 }}>Current moment:</strong>
        {cmEditing ? (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <CalendarDateEditor
                value={cmDraft}
                onChange={setCmDraft}
                calendar={primary}
                allowApproximate={false}
              />
            </div>
            <button className="btn btn-accent btn-small" onClick={saveCmEdit} disabled={!cmDraft || cmDraft.year == null || isLocked}>Save</button>
            <button className="btn btn-ghost btn-small" onClick={cancelCmEdit}>Cancel</button>
          </>
        ) : currentMomentDisplay ? (
          <>
            <span className="cal-date-display" style={{ flex: 1 }}>{currentMomentDisplay}</span>
            <button className="btn btn-ghost btn-small" onClick={startCmEdit} disabled={isLocked}>Edit</button>
            <button className="btn btn-ghost btn-small" onClick={clearCm} disabled={isLocked}>Clear</button>
          </>
        ) : (
          <>
            <span style={{ flex: 1, color: "var(--text-dim)", fontStyle: "italic" }}>not set — living character entries will not display an age suffix</span>
            <button className="btn btn-ghost btn-small" onClick={startCmEdit} disabled={isLocked}>Set</button>
          </>
        )}
      </div>

      <div>
        {[{ cal: primary, isPrimary: true }, ...additional.map(c => ({ cal: c, isPrimary: false }))].map(({ cal, isPrimary }) => {
          const rowKey = isPrimary ? "__primary__" : cal.id;
          const isReference = isPrimary ? !referenceCalendarId : (referenceCalendarId === cal.id);
          return (
            <React.Fragment key={rowKey}>
              {renderRow(cal, { isPrimary, isReference })}
              {expandedGridFor === rowKey && (
                <CalendarGridView
                  calendar={cal}
                  rowKey={rowKey}
                  state={state}
                  onOpenEntry={(eid) => { setExpandedGridFor(null); onOpenEntry && onOpenEntry(eid); }}
                  onUpdateViewPrefs={onUpdateViewPrefs}
                />
              )}
            </React.Fragment>
          );
        })}
        {additional.length === 0 && (
          <div style={{
            padding: "24px 16px",
            color: "var(--text-dim)",
            fontStyle: "italic",
            textAlign: "center",
            border: "1px dashed var(--border)",
            borderRadius: 6,
            fontSize: 13,
          }}>
            No additional calendars yet. Click <strong>+ New Calendar</strong> to define one — useful when characters from different cultures should reckon dates in their own systems, or for planar/cosmological reckoning that runs parallel to the world calendar.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CalendarGridView (v1.4 post-Kalendarium) ─────────────────────────────────
// Year-at-a-glance grid rendered inline below a Kalendarium index row when the
// user clicks Show grid. One sub-grid per month, day cells laid out in a
// continuous weekday cycle so Day 1 of any month lands in whichever column
// follows the previous month's last day. Click a cell to surface entries with
// dates on that day across all calendars (projected through absoluteDay).
//
// Year selection: initial year is currentMoment-primary-year projected into
// this calendar's frame if set, else year 1. The stepper persists the user's
// navigation per-calendar in state.viewPrefs.kalendariumGridYear[rowKey] so
// re-expanding the same calendar's grid lands on the year you last viewed.
// Jump-to-current button only appears when currentMoment is set.
//
// Phase 4 scope: skeleton + cell-click popover surfacing entries.
// Season bands and moon glyphs land in Phases 5 and 6.
function CalendarGridView({ calendar, rowKey, state, onOpenEntry, onUpdateViewPrefs }) {
  const dpy = daysPerCalendarYear(calendar);
  const week = calendar.week || { daysPerWeek: 7, dayNames: [] };
  const dpw = week.daysPerWeek || 7;
  const dayNames = Array.isArray(week.dayNames) && week.dayNames.length === dpw ? week.dayNames : [];

  // v1.5 moon-unification: calendar.celestials is an array of moon-body id
  // refs. Build the lookup once per render so the per-cell phase resolver can
  // resolve each ref to its body (and pass the full map to
  // computeMoonPhaseGeometric for the parent-chain walk).
  const bodiesById = useMemo(() => {
    const m = {};
    (state.celestialBodies || []).forEach(b => { if (b && b.id) m[b.id] = b; });
    return m;
  }, [state.celestialBodies]);

  // Currently-displayed year. Initial value: viewPrefs override → currentMoment
  // year projected into this calendar → year 1. Persisted to viewPrefs on
  // every stepper interaction so re-expansion remembers.
  const initialYear = (() => {
    const stored = state.viewPrefs?.kalendariumGridYear?.[rowKey];
    if (Number.isFinite(stored)) return stored;
    const cm = state.world?.currentMoment;
    if (cm && cm.year != null) {
      const primary = state.world.calendar;
      const absDay = calendarDateToAbsoluteDay(primary, cm);
      if (absDay != null) {
        const projected = absoluteDayToCalendarDate(calendar, absDay);
        if (projected) return projected.year;
      }
    }
    return 1;
  })();
  const [year, setYear] = useState(initialYear);
  const [jumpDraft, setJumpDraft] = useState("");

  // Ctrl+scroll zoom on the month sub-grids. Simple scale (Stemma pattern);
  // range 0.5–2.5, factor 1.15. Listener bound natively with passive:false so
  // Ctrl+wheel doesn't trigger browser page zoom instead. Ephemeral state —
  // not persisted across grid open/close. Transform-origin top-left so zoomed
  // content extends down and right rather than overflowing all four sides.
  const [gridZoom, setGridZoom] = useState(1);
  const gridZoomRef = useRef(null);
  useEffect(() => {
    const el = gridZoomRef.current;
    if (!el) return;
    const handler = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setGridZoom(z => {
        const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
        return Math.max(0.5, Math.min(2.5, z * factor));
      });
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  // Persist year navigation to viewPrefs via useEffect on [year]. Decouples
  // pref write from the stepper handlers so rapid clicks can't race against
  // each other through a stale closure — each setYear call goes through React's
  // update queue, and the effect fires once per committed year change with the
  // up-to-date value. Skip-if-equal guard prevents redundant writes when
  // viewPrefs already matches (e.g. on first mount when initialYear came from
  // viewPrefs).
  useEffect(() => {
    if (!onUpdateViewPrefs) return;
    const stored = state.viewPrefs?.kalendariumGridYear?.[rowKey];
    if (stored === year) return;
    const prev = state.viewPrefs?.kalendariumGridYear || {};
    onUpdateViewPrefs({ kalendariumGridYear: { ...prev, [rowKey]: year } });
  }, [year]);

  // Currently-clicked cell for popover. Cleared on outside click or escape.
  // Shape: { absDay, monthIdx, day } or null. The popover anchors to the
  // grid panel rather than the cell — simpler than floating positioning,
  // and the cell stays visually highlighted via selectedAbsDay equality.
  const [selectedAbsDay, setSelectedAbsDay] = useState(null);
  const popoverRef = useRef(null);
  useEffect(() => {
    if (selectedAbsDay == null) return;
    const onClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        // Don't dismiss when clicking a day cell — the cell's own onClick
        // will update selectedAbsDay. Detect via data attribute.
        const hitCell = e.target.closest("[data-cal-grid-cell]");
        if (!hitCell) setSelectedAbsDay(null);
      }
    };
    const onEsc = (e) => { if (e.key === "Escape") setSelectedAbsDay(null); };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [selectedAbsDay]);

  // Year-navigation handlers. All use functional setState so rapid clicks
  // don't race through a stale closure — React queues each updater in order
  // and the useEffect on [year] picks up the final committed value and writes
  // viewPrefs once per change. jumpToCurrent / jumpToYear set absolute targets
  // (not relative), so the functional form is for consistency rather than
  // correctness on those two.
  const stepYear = (delta) => setYear(prev => prev + delta);
  const jumpToYear = () => {
    const parsed = parseInt(jumpDraft, 10);
    if (!Number.isFinite(parsed)) return;
    setYear(parsed);
    setJumpDraft("");
  };
  const jumpToCurrent = () => {
    const cm = state.world?.currentMoment;
    if (!cm || cm.year == null) return;
    const primary = state.world.calendar;
    const absDay = calendarDateToAbsoluteDay(primary, cm);
    if (absDay == null) return;
    const projected = absoluteDayToCalendarDate(calendar, absDay);
    if (!projected) return;
    setYear(projected.year);
  };
  const hasCurrentMoment = !!(state.world?.currentMoment && state.world.currentMoment.year != null);

  // Pre-compute absoluteDay of Year start (year, monthIndex 0, day 1). All
  // cell absoluteDays derive from this + offset, avoiding repeated full
  // multiplication.
  const yearStartAbsDay = calendarDateToAbsoluteDay(calendar, { year, monthIndex: 0, day: 1 });

  // Build entry-by-absDay index ONCE per year+state change so cell clicks
  // resolve to entries in O(1). Each entry → all its dates → flatten into
  // a Map keyed by absDay. Indexed entries include cross-calendar matches
  // because collectEntryDatesAsAbsoluteDays projects through each entry's
  // bound calendar to absoluteDay.
  const dateIndex = useMemo(() => {
    const map = new Map();
    const tplById = Object.fromEntries((state.templates || []).map(t => [t.id, t]));
    (state.entries || []).forEach(entry => {
      const tpl = tplById[entry.templateId];
      if (!tpl) return;
      const dates = collectEntryDatesAsAbsoluteDays(entry, tpl, state);
      dates.forEach(d => {
        if (!map.has(d.absDay)) map.set(d.absDay, []);
        map.get(d.absDay).push({ ...d, entry, template: tpl });
      });
    });
    return map;
  }, [state.entries, state.templates, state.calendars, state.world?.calendar]);

  // Modulo defensive against negative absoluteDay (years before the
  // calendar's epoch). JS % returns negative for negative operands; this
  // coerces back to [0, dpw).
  const weekdayOf = (absDay) => ((absDay % dpw) + dpw) % dpw;

  // Compose the cells for one month: leading-blank slots (continuous-week)
  // followed by numbered day cells. Returns an array of { kind, day?, absDay? }
  // where kind is "blank" or "day".
  const buildMonthCells = (monthIdx) => {
    const month = calendar.months[monthIdx];
    if (!month) return [];
    // absDay of Day 1 of this month within the rendered year
    let absDayOfMonthStart = yearStartAbsDay;
    for (let i = 0; i < monthIdx; i++) absDayOfMonthStart += (calendar.months[i].days || 0);
    const wd = weekdayOf(absDayOfMonthStart);
    const cells = [];
    for (let i = 0; i < wd; i++) cells.push({ kind: "blank" });
    for (let d = 0; d < (month.days || 0); d++) {
      cells.push({ kind: "day", day: d + 1, absDay: absDayOfMonthStart + d });
    }
    return cells;
  };

  // Popover data: entries with any date matching the selected cell.
  const popoverEntries = selectedAbsDay != null ? (dateIndex.get(selectedAbsDay) || []) : [];

  // Format the selected cell's date for the popover header. Project from
  // absDay back into the grid's calendar (round-trip identity in practice).
  const selectedDateDisplay = (() => {
    if (selectedAbsDay == null) return "";
    const d = absoluteDayToCalendarDate(calendar, selectedAbsDay);
    if (!d) return "";
    return formatCalendarDate(d, calendar);
  })();

  return (
    <>
      {/* Controls container — year stepper + season legend. marginTop -4
          merges with the calendar header row above. The months grid sits
          free-floating below so zoom-in overflow has no card boundary to
          breach. */}
      <div
        style={{
          marginBottom: 12,
          marginTop: -4,
          padding: "12px 16px",
          border: "1px solid var(--border)",
          borderTop: "none",
          borderRadius: "0 0 6px 6px",
          background: "var(--surf2)",
        }}
      >
        {/* Year stepper */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, letterSpacing: "0.13em", textTransform: "uppercase", color: "var(--text-dim)", fontWeight: 600 }}>Year</span>
        <button className="btn btn-ghost btn-small" onClick={() => stepYear(-1)} title="Previous year">−</button>
        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 500, minWidth: 60, textAlign: "center" }}>
          {formatYear(year, calendar)}
        </span>
        <button className="btn btn-ghost btn-small" onClick={() => stepYear(1)} title="Next year">+</button>
        <input
          type="number"
          className="input"
          style={{ width: 150 }}
          placeholder="Jump to…"
          value={jumpDraft}
          onChange={e => setJumpDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") jumpToYear(); }}
        />
        <button className="btn btn-ghost btn-small" onClick={jumpToYear} disabled={!jumpDraft}>Go</button>
        {hasCurrentMoment && (
          <button className="btn btn-ghost btn-small" onClick={jumpToCurrent} title="Jump to year of current moment">↺ Current</button>
        )}
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{dpy} days · {calendar.months.length} months · {dpw}-day week</span>
      </div>

      {/* Season legend strip — only renders when seasons are defined. Each
          swatch shows the season's color and name; clicking a swatch jumps
          the grid to highlight that season (sets a temporary marker via
          selectedAbsDay on the season's startDay). Skipped for v1; the
          legend is read-only for now. */}
      {Array.isArray(calendar.seasons) && calendar.seasons.length > 0 && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "6px 10px",
          background: "var(--surf2, var(--bg-panel))",
          border: "1px solid var(--border)",
          borderRadius: 4,
          flexWrap: "wrap",
          fontSize: 12,
        }}>
          <span style={{ fontSize: 10, letterSpacing: "0.13em", textTransform: "uppercase", color: "var(--text-dim)", fontWeight: 600 }}>Seasons</span>
          {calendar.seasons.map(s => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6 }} title={`Day ${s.startDay} → ${s.endDay}${s.endDay < s.startDay ? " (wraps year-end)" : ""}`}>
              <span style={{
                display: "inline-block",
                width: 14,
                height: 14,
                background: hexToRgba(s.color, 0.7),
                border: "1px solid var(--border)",
                borderRadius: 3,
              }} />
              <span>{s.name}</span>
            </div>
          ))}
        </div>
      )}
      </div>

      {/* Month sub-grids */}
      <div ref={gridZoomRef} style={{
        display: "grid",
        // minmax floor sized so a standard ~1050px content area lays out at
        // 3 columns. Narrower viewports collapse to 2 then 1; wider ones
        // (rare given the index's maxWidth) can fit 4. The wider cells give
        // moon-emoji rows enough room to render at their OS-native size
        // without crowding the day number.
        gridTemplateColumns: `repeat(auto-fill, minmax(${Math.max(320, dpw * 42)}px, 1fr))`,
        gap: 14,
        transform: `scale(${gridZoom})`,
        transformOrigin: "top left",
        transition: "transform 100ms ease",
      }}>
        {calendar.months.map((month, mi) => {
          const cells = buildMonthCells(mi);
          return (
            <div key={mi} style={{
              border: "1px solid var(--border)",
              borderRadius: 4,
              padding: "8px 10px",
              background: "var(--bg-panel)",
            }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, marginBottom: 6, fontWeight: 500 }}>
                {month.name || `Month ${mi + 1}`} <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "'DM Sans', sans-serif" }}>· {month.days} days</span>
              </div>
              <div style={{ background: "var(--surf)", padding: 4, borderRadius: 3 }}>
                {dayNames.length === dpw && (
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${dpw}, 1fr)`, gap: 2, marginBottom: 2 }}>
                    {dayNames.map((dn, i) => (
                      <div key={i} style={{ fontSize: 9, textAlign: "center", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {dn.slice(0, 3) || ""}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${dpw}, 1fr)`, gap: 2 }}>
                {cells.map((c, ci) => {
                  if (c.kind === "blank") {
                    return <div key={ci} style={{ aspectRatio: "1 / 1", minHeight: 18 }} />;
                  }
                  const hasEntries = dateIndex.has(c.absDay);
                  const isSelected = selectedAbsDay === c.absDay;
                  // Day-of-year for season lookup: cell's absDay relative to the
                  // year's start, plus 1 to make it 1-indexed (Day 1 → doy 1).
                  const doy = c.absDay - yearStartAbsDay + 1;
                  const season = getSeasonForDayOfYear(doy, calendar.seasons);
                  // Per-moon phase for this cell. calendar.celestials is now
                  // an array of moon-body id refs. Resolution per moon:
                  //   geometric (computeMoonPhaseGeometric) → synodic-cycle
                  //   (synodicCycleDays/phaseAnchorDay) → no glyph. Dangling
                  //   refs (body deleted in Ephemeris) are skipped.
                  const moonPhases = (calendar.celestials || []).reduce((acc, ref) => {
                    const body = bodiesById[ref];
                    if (!body) return acc; // dangling ref → skip
                    let phase = computeMoonPhaseGeometric(body, c.absDay, bodiesById);
                    if (phase == null) {
                      if (!Number.isFinite(body.synodicCycleDays) || body.synodicCycleDays <= 0) return acc; // no geometry, no cycle → no phase
                      const anchor = Number.isFinite(body.phaseAnchorDay) ? body.phaseAnchorDay : 0;
                      phase = computeMoonPhase(c.absDay, body.synodicCycleDays, anchor);
                    }
                    acc.push({ name: body.name, glyph: MOON_GLYPHS[phase], phaseName: MOON_PHASE_NAMES[phase] });
                    return acc;
                  }, []);
                  // Color stack: selected overrides everything. Otherwise season
                  // tint at 0.3 alpha fills the background; "has entries" gets
                  // signaled by accent border (so it composes with season tint
                  // rather than replacing it).
                  const cellBg = isSelected
                    ? "var(--accent)"
                    : (season ? hexToRgba(season.color, 0.3) : "transparent");
                  const cellBorder = isSelected
                    ? "var(--accent)"
                    : (hasEntries ? "var(--accent)" : "var(--border)");
                  const cellBorderWidth = (hasEntries && !isSelected) ? 2 : 1;
                  // Compose multi-line tooltip: cell baseline + season +
                  // per-moon phase. \n renders as a line break in title
                  // attributes in modern browsers.
                  const tooltipLines = [
                    hasEntries
                      ? `${(dateIndex.get(c.absDay) || []).length} dated entr${(dateIndex.get(c.absDay) || []).length === 1 ? "y" : "ies"}`
                      : `Day ${c.day}`,
                  ];
                  if (season) tooltipLines.push(season.name);
                  moonPhases.forEach(mp => tooltipLines.push(`${mp.name}: ${mp.phaseName}`));
                  return (
                    <button
                      key={ci}
                      data-cal-grid-cell="1"
                      onClick={() => setSelectedAbsDay(c.absDay)}
                      title={tooltipLines.join("\n")}
                      style={{
                        aspectRatio: "1 / 1",
                        minHeight: 18,
                        padding: 1,
                        fontSize: 11,
                        fontFamily: "'DM Sans', sans-serif",
                        background: cellBg,
                        color: isSelected ? "var(--bg-panel)" : "var(--text)",
                        border: `${cellBorderWidth}px solid ${cellBorder}`,
                        borderRadius: 3,
                        cursor: "pointer",
                        fontWeight: hasEntries ? 600 : 400,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: moonPhases.length > 0 ? "space-between" : "center",
                        lineHeight: 1,
                      }}
                    >
                      <span>{c.day}</span>
                      {moonPhases.length > 0 && (
                        <span style={{
                          display: "flex",
                          flexWrap: "wrap",
                          justifyContent: "center",
                          fontSize: 8,
                          lineHeight: 1,
                          gap: 0,
                        }}>
                          {moonPhases.map((mp, i) => (
                            <span key={i} aria-label={`${mp.name} ${mp.phaseName}`}>{mp.glyph}</span>
                          ))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Popover with entries on the selected day */}
      {selectedAbsDay != null && (
        <div
          ref={popoverRef}
          style={{
            marginTop: 14,
            padding: "10px 14px",
            border: "1px solid var(--accent)",
            borderRadius: 6,
            background: "var(--bg-panel)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 500 }}>{selectedDateDisplay}</span>
            <button className="btn btn-ghost btn-small" onClick={() => setSelectedAbsDay(null)}>Close</button>
          </div>
          {popoverEntries.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-dim)", fontStyle: "italic" }}>No dated entries on this day.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 280, overflowY: "auto" }}>
              {popoverEntries.map((m, i) => (
                <button
                  key={`${m.entry.id}-${m.role}-${i}`}
                  className="btn btn-ghost"
                  onClick={() => onOpenEntry(m.entry.id)}
                  style={{
                    textAlign: "left",
                    padding: "6px 8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: 12,
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{m.entry.name || "(untitled)"}</span>
                  <span style={{ fontSize: 11, color: "var(--text-dim)", fontStyle: "italic" }}>{m.fieldLabel}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function KalendariumEditorView({ calendar, primaryCalendar, isPrimary, isLocked, entries, templates, currentMoment, moonBodies, onCreateMoon, onBack, onChange }) {
  const [repinMode, setRepinMode] = useState(false);
  const [pendingAnchor, setPendingAnchor] = useState(null);

  // Anchor display: recompute on every render from current primary structure
  // so primary edits show through. Falls back to "(unset)" if math fails.
  const anchorDisplay = (() => {
    if (isPrimary || !calendar.anchor) return null;
    const date = absoluteDayToCalendarDate(primaryCalendar, calendar.anchor.absoluteDay);
    if (!date) return null;
    return formatCalendarDate(date, primaryCalendar);
  })();

  const startRepin = () => {
    if (isPrimary || isLocked) return;
    const date = absoluteDayToCalendarDate(primaryCalendar, calendar.anchor?.absoluteDay ?? 0);
    setPendingAnchor(date);
    setRepinMode(true);
  };

  const commitRepin = () => {
    if (!pendingAnchor || pendingAnchor.year == null) {
      setRepinMode(false);
      setPendingAnchor(null);
      return;
    }
    const newAbsDay = calendarDateToAbsoluteDay(primaryCalendar, pendingAnchor);
    if (newAbsDay == null) {
      setRepinMode(false);
      setPendingAnchor(null);
      return;
    }
    onChange({ ...calendar, anchor: { absoluteDay: newAbsDay } });
    setRepinMode(false);
    setPendingAnchor(null);
  };

  const cancelRepin = () => {
    setRepinMode(false);
    setPendingAnchor(null);
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1100 }}>
      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-ghost" onClick={onBack}>← Back to Kalendarium</button>
      </div>

      {!isPrimary && (
        <div style={{
          padding: "16px 20px",
          border: "1px solid var(--border)",
          borderRadius: 6,
          background: "var(--bg-panel)",
          marginBottom: 20,
        }}>
          <h3 style={{ margin: "0 0 6px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: 20 }}>
            Anchor
          </h3>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--text-dim)" }}>
            This calendar's Year 1, Month 1, Day 1 occurs at the moment defined below, expressed in <strong>{primaryCalendar?.name || "the primary calendar"}</strong>. Stored internally as absoluteDay so the underlying moment stays stable when primary structure changes — only the displayed Y/M/D drifts. Re-pin to reset.
          </p>

          {!repinMode && (
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 11, letterSpacing: "0.13em", textTransform: "uppercase", color: "var(--text-dim)" }}>
                  Currently
                </span>
                <span style={{ fontSize: 15 }}>{anchorDisplay || "(unset)"}</span>
                <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
                  absoluteDay {calendar.anchor?.absoluteDay ?? 0}
                </span>
              </div>
              <button className="btn btn-ghost" onClick={startRepin} disabled={isLocked}>
                Re-pin Anchor
              </button>
            </div>
          )}

          {repinMode && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 13 }}>
                Set the date in <strong>{primaryCalendar?.name || "primary"}</strong> when this calendar's Year 1 begins:
              </div>
              <CalendarDateEditor
                value={pendingAnchor}
                onChange={setPendingAnchor}
                calendar={primaryCalendar}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-accent" onClick={commitRepin}>Save Anchor</button>
                <button className="btn btn-ghost" onClick={cancelRepin}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      <CalendarEditor
        calendar={calendar}
        onChange={onChange}
        entries={entries}
        templates={templates}
        currentMoment={currentMoment}
        moonBodies={moonBodies}
        onCreateMoon={onCreateMoon}
        isLocked={isLocked}
      />
    </div>
  );
}