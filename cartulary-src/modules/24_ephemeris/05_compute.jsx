
// ─── Compute mode (r010) ─────────────────────────────────────────────────────
//
// Targeted alignment query workspace. Three-tab layout per CM.1:
//   - Query: full-pane parameter form
//   - Split: query above, results below (fixed 40/60 in r010 — draggable
//            divider lands in r013)
//   - Results: full-pane result list
//
// r010 implements only Phase alignment math (CM.2 alignment type
// selector shows others disabled). Conjunction, eclipse, nodal land
// progressively in r011-r013 alongside their math.
//
// State plumbing all goes through state.ephemeris.compute (shape locked
// at scoping). Body picker reads currentQuery.bodyIds; multi-select
// checkbox list in the query form. The body tree's per-mode selection
// for Compute is wired but defers to the form-side picker as the
// primary surface (form changes write to bodyIds; tree click could mirror
// in a later pass).
//
// Run handler resolves the chosen body set, looks up their common parent,
// calls findPhaseAlignments, stores results. Empty results array means
// either the query was unsatisfiable (no shared parent, missing orbital
// data) or no alignments occurred in the date range.

const ALIGNMENT_TYPES = [
  { id: "phase",       label: "Phase alignment",       enabled: true,  hint: "Finds moments when every picked body is at the same point in its cycle. Example: all moons full at once." },
  { id: "conjunction", label: "Conjunction",           enabled: true,  hint: "Finds moments when bodies line up in the sky as seen from the central star — the classic 'planetary alignment' look." },
  { id: "eclipse",     label: "Eclipse",               enabled: true,  hint: "Finds moments when one body passes between the observer and another body, blocking it. Used for eclipse hunts." },
  { id: "nodal",       label: "Nodal alignment",       enabled: true,  hint: "Finds moments when multiple bodies sit at the points where their tilted orbits cross the reference plane — where eclipses can happen." },
];

// Default tolerance per alignment type (CM.6 locked values). Phase: 5% of
// cycle = 18°. Others: shown for completeness, gated by alignmentType.
const DEFAULT_TOLERANCE = {
  phase:       18,    // degrees (5% of 360)
  conjunction: 1,     // degrees
  eclipse:     0.5,   // magnitude
  nodal:       1,     // degrees
};

// CM.5 quality score (1-5) per result. Tolerance band divided into 5
// equal slices. For phase/conjunction/nodal where the metric is "smaller
// is better" (spread, separation, node distance), quality 1 = smallest
// band (closest to perfect). For eclipse where magnitude is "larger is
// better" (more coverage), quality 1 = largest band (closest to total).
// Returns null on invalid input.
const computeQualityScore = (alignmentType, value, tolerance) => {
  if (!Number.isFinite(value) || !Number.isFinite(tolerance) || tolerance <= 0) return null;
  if (alignmentType === "eclipse") {
    // Magnitude bands: tolerance to (effective max). Values above max
    // (total eclipse with overlap) cap to quality 1.
    if (value >= 1) return 1;
    const range = 1 - tolerance;
    if (range <= 0) return 1;
    const normalized = (value - tolerance) / range; // 0 at threshold, 1 at total
    if (normalized < 0) return null; // shouldn't happen since results filter on tolerance
    const band = Math.floor((1 - normalized) * 5);
    return Math.max(1, Math.min(5, band + 1));
  }
  if (value < 0 || value > tolerance) return null;
  const band = Math.floor(value / tolerance * 5);
  return Math.max(1, Math.min(5, band + 1));
};

function ComputeModeContent({ state, updateState, bodies, isLocked }) {
  const eph = state.ephemeris || makeDefaultEphemerisState();
  const compute = eph.compute || makeDefaultEphemerisState().compute;
  const q = compute.currentQuery || {};
  const calendar = state.world?.calendar;

  // v1.5 r041: user-adjustable split between Query (top) and Results (bottom)
  // in the Split view. Local state during drag for responsiveness; committed
  // to compute.querySplitRatio on mouseup so it persists across mode switches
  // and reloads. Clamped 0.15..0.85 so neither pane can collapse entirely.
  const [liveSplit, setLiveSplit] = useState(Number.isFinite(compute.querySplitRatio) ? compute.querySplitRatio : 0.4);
  useEffect(() => {
    const stored = Number.isFinite(compute.querySplitRatio) ? compute.querySplitRatio : 0.4;
    setLiveSplit(stored);
  }, [compute.querySplitRatio]);

  // State mutators. r029: all Compute writes target query setup, view mode,
  // saved-query bookmarks, and the session result cache — none of these
  // touch body data. Allowed in locked mode.
  const updateCompute = (patch) => {
    updateState(s => {
      const cur = s.ephemeris || makeDefaultEphemerisState();
      return {
        ...s,
        ephemeris: {
          ...cur,
          compute: { ...(cur.compute || makeDefaultEphemerisState().compute), ...patch },
        },
      };
    });
  };
  const updateQuery = (patch) => {
    updateState(s => {
      const cur = s.ephemeris || makeDefaultEphemerisState();
      const curCompute = cur.compute || makeDefaultEphemerisState().compute;
      return {
        ...s,
        ephemeris: {
          ...cur,
          compute: {
            ...curCompute,
            currentQuery: { ...(curCompute.currentQuery || {}), ...patch },
          },
        },
      };
    });
  };

  const setViewMode = (mode) => updateCompute({ viewMode: mode });

  // CM.7 saved queries (r015). Save = clone current query with a user-
  // provided name + generated id. Load = replace currentQuery with the
  // saved one (preserves alignmentType, bodyIds, dates, tolerance, limit).
  // Delete = remove by id. State persists via the normal updateState path.
  const saveCurrentQuery = (name) => {
    // r029: query bookmarks, not body data. Allowed in locked mode.
    const trimmed = (name || "").trim();
    if (!trimmed) return;
    updateState(s => {
      const cur = s.ephemeris || makeDefaultEphemerisState();
      const curCompute = cur.compute || makeDefaultEphemerisState().compute;
      const newEntry = {
        id: `sq-${genId()}`,
        name: trimmed,
        query: {
          alignmentType: curCompute.currentQuery?.alignmentType || "phase",
          bodyIds: [...(curCompute.currentQuery?.bodyIds || [])],
          dateRangeStart: curCompute.currentQuery?.dateRangeStart ?? null,
          dateRangeEnd: curCompute.currentQuery?.dateRangeEnd ?? null,
          tolerance: curCompute.currentQuery?.tolerance ?? null,
          resultLimit: curCompute.currentQuery?.resultLimit || 500,
        },
      };
      return {
        ...s,
        ephemeris: {
          ...cur,
          compute: {
            ...curCompute,
            savedQueries: [...(curCompute.savedQueries || []), newEntry],
          },
        },
      };
    });
  };
  const loadSavedQuery = (savedId) => {
    // r029: loads a query bookmark, allowed in locked mode.
    updateState(s => {
      const cur = s.ephemeris || makeDefaultEphemerisState();
      const curCompute = cur.compute || makeDefaultEphemerisState().compute;
      const found = (curCompute.savedQueries || []).find(q => q.id === savedId);
      if (!found) return s;
      return {
        ...s,
        ephemeris: {
          ...cur,
          compute: {
            ...curCompute,
            currentQuery: { ...found.query },
            results: [], // clear stale results — they're for the old query
            selectedResultId: null,
          },
        },
      };
    });
  };
  const deleteSavedQuery = (savedId) => {
    // r029: removes a query bookmark, allowed in locked mode.
    updateState(s => {
      const cur = s.ephemeris || makeDefaultEphemerisState();
      const curCompute = cur.compute || makeDefaultEphemerisState().compute;
      return {
        ...s,
        ephemeris: {
          ...cur,
          compute: {
            ...curCompute,
            savedQueries: (curCompute.savedQueries || []).filter(q => q.id !== savedId),
          },
        },
      };
    });
  };

  // Run: resolve bodies, determine common parent, dispatch by alignment
  // type. r010 dispatched only Phase; r011 adds Conjunction. Other types
  // remain gated in the UI.
  const runCompute = () => {
    // r029: read-only computation that writes to a session result cache.
    // No side effects on body data. Allowed in locked mode.
    const selectedBodies = (q.bodyIds || [])
      .map(id => bodies.find(b => b.id === id))
      .filter(Boolean);
    if (selectedBodies.length < 2) {
      updateCompute({ results: [], selectedResultId: null });
      return;
    }

    let results = [];
    if (q.alignmentType === "phase") {
      // Phase: bodies must share an immediate parent. Take first body's
      // parent and use its mass for the orbital-period scaling.
      const parent = bodies.find(b => b.id === selectedBodies[0].parentBodyId);
      const parentMass = parent?.physicalParams?.mass;
      results = findPhaseAlignments({
        bodies: selectedBodies,
        parentMass,
        dateRangeStart: q.dateRangeStart,
        dateRangeEnd: q.dateRangeEnd,
        toleranceDegrees: Number.isFinite(q.tolerance) ? q.tolerance : DEFAULT_TOLERANCE.phase,
        resultLimit: q.resultLimit || 500,
      });
    } else if (q.alignmentType === "conjunction") {
      // Conjunction: bodies can be at different levels of the chain but
      // must share a root ancestor. Math handles multi-level via
      // computeRootRelativePosition. Build a bodiesById map for the
      // chain-walking.
      const bodiesById = {};
      bodies.forEach(b => { bodiesById[b.id] = b; });
      results = findConjunctionAlignments({
        bodies: selectedBodies,
        bodiesById,
        dateRangeStart: q.dateRangeStart,
        dateRangeEnd: q.dateRangeEnd,
        toleranceDegrees: Number.isFinite(q.tolerance) ? q.tolerance : DEFAULT_TOLERANCE.conjunction,
        resultLimit: q.resultLimit || 500,
      });
    } else if (q.alignmentType === "eclipse") {
      // Eclipse: positional roles — first picked = eclipsing, second =
      // eclipsed. Tolerance is in eclipse magnitude (fraction of eclipsed
      // disk covered). Eligibility (CM.9) ensures exactly 2 bodies sharing
      // a root with valid radii.
      const bodiesById = {};
      bodies.forEach(b => { bodiesById[b.id] = b; });
      results = findEclipseAlignments({
        bodies: selectedBodies,
        bodiesById,
        dateRangeStart: q.dateRangeStart,
        dateRangeEnd: q.dateRangeEnd,
        minMagnitude: Number.isFinite(q.tolerance) ? q.tolerance : DEFAULT_TOLERANCE.eclipse,
        resultLimit: q.resultLimit || 500,
      });
    } else if (q.alignmentType === "nodal") {
      // Nodal: bodies share immediate parent (nodes defined in parent's
      // reference frame). Each body must have inclination > 0. Tolerance
      // is in degrees (max body-to-nearest-node distance allowed).
      const bodiesById = {};
      bodies.forEach(b => { bodiesById[b.id] = b; });
      results = findNodalAlignments({
        bodies: selectedBodies,
        bodiesById,
        dateRangeStart: q.dateRangeStart,
        dateRangeEnd: q.dateRangeEnd,
        toleranceDegrees: Number.isFinite(q.tolerance) ? q.tolerance : DEFAULT_TOLERANCE.nodal,
        resultLimit: q.resultLimit || 500,
      });
    }

    // Auto-switch to Split on Run from Query. Stamp `alignmentType` onto
    // every result row so downstream consumers (Event mode, future
    // promote-to-entry) can label them correctly even if the user later
    // changes the alignment type in the query form without re-running.
    const stampedResults = (results || []).map(r => ({
      ...r,
      alignmentType: q.alignmentType,
    }));
    updateCompute({
      results: stampedResults,
      selectedResultId: null,
      viewMode: compute.viewMode === "query" ? "split" : compute.viewMode,
    });
  };

  // Find the selected result by its composite key (matches the key used
  // in the results panel rows). Used to feed the detail drawer.
  const selectedResult = useMemo(() => {
    if (!compute.selectedResultId) return null;
    return (compute.results || []).find(r => {
      const key = r.absoluteDay + ":" + (r.bodyIds || []).join(",");
      return key === compute.selectedResultId;
    }) || null;
  }, [compute.selectedResultId, compute.results]);

  // bodiesById for the drawer's chain walking. Same shape as the
  // EphemerisView-level memo but local here so the drawer doesn't depend
  // on EphemerisView's render scope.
  const drawerBodiesById = useMemo(() => {
    const m = {};
    bodies.forEach(b => { if (b && b.id) m[b.id] = b; });
    return m;
  }, [bodies]);

  const setSelectedResult = (resultKey) => updateCompute({ selectedResultId: resultKey });
  const clearResults = () => updateCompute({ results: [], selectedResultId: null });

  // Renders the results-side area: list + drawer side-by-side when a
  // result is selected, list-only otherwise. Used in both Split and
  // Results-only view modes.
  const resultsArea = (
    <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
      <div style={{ flex: 1, overflow: "auto", padding: 16, minWidth: 0 }}>
        <ComputeResultsPanel
          results={compute.results || []}
          bodies={bodies}
          calendar={calendar}
          alignmentType={q.alignmentType}
          tolerance={Number.isFinite(q.tolerance) ? q.tolerance : DEFAULT_TOLERANCE[q.alignmentType] || 1}
          selectedResultId={compute.selectedResultId}
          onSelectResult={setSelectedResult}
          onClearResults={clearResults}
        />
      </div>
      {selectedResult && (
        <div style={{ flex: "0 0 38%", minWidth: 280, borderLeft: "1px solid var(--border)", overflow: "hidden" }}>
          <ComputeDetailDrawer
            result={selectedResult}
            query={q}
            bodies={bodies}
            bodiesById={drawerBodiesById}
            calendar={calendar}
            onClose={() => setSelectedResult(null)}
          />
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <ComputeTabSwitcher
        viewMode={compute.viewMode || "split"}
        onChange={setViewMode}
      />
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {compute.viewMode === "query" && (
          <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
            <ComputeQueryPanel
              query={q}
              bodies={bodies}
              calendar={calendar}
              isLocked={isLocked}
              onChange={updateQuery}
              onRun={runCompute}
              savedQueries={compute.savedQueries || []}
              onSaveQuery={saveCurrentQuery}
              onLoadQuery={loadSavedQuery}
              onDeleteQuery={deleteSavedQuery}
            />
          </div>
        )}
        {compute.viewMode === "results" && resultsArea}
        {(!compute.viewMode || compute.viewMode === "split") && (
          <>
            <div style={{ flex: `0 0 ${(liveSplit * 100).toFixed(2)}%`, overflow: "auto", padding: 16 }}>
              <ComputeQueryPanel
                query={q}
                bodies={bodies}
                calendar={calendar}
                isLocked={isLocked}
                onChange={updateQuery}
                onRun={runCompute}
                savedQueries={compute.savedQueries || []}
                onSaveQuery={saveCurrentQuery}
                onLoadQuery={loadSavedQuery}
                onDeleteQuery={deleteSavedQuery}
              />
            </div>
            <div
              role="separator"
              aria-orientation="horizontal"
              title="Drag to resize the Query / Results split"
              onMouseDown={(e) => {
                e.preventDefault();
                const container = e.currentTarget.parentElement;
                const rect = container.getBoundingClientRect();
                const move = (ev) => {
                  const r = (ev.clientY - rect.top) / rect.height;
                  setLiveSplit(Math.max(0.15, Math.min(0.85, r)));
                };
                const up = () => {
                  window.removeEventListener("mousemove", move);
                  window.removeEventListener("mouseup", up);
                  // Commit final position to compute state — use the latest
                  // local value via the setter's functional form.
                  setLiveSplit(curr => {
                    updateCompute({ querySplitRatio: curr });
                    return curr;
                  });
                };
                window.addEventListener("mousemove", move);
                window.addEventListener("mouseup", up);
              }}
              style={{
                flex: "0 0 6px",
                cursor: "row-resize",
                background: "var(--border)",
                borderTop: "1px solid var(--surf2)",
                borderBottom: "1px solid var(--surf2)",
              }}
            />
            {resultsArea}
          </>
        )}
      </div>
    </div>
  );
}

function ComputeTabSwitcher({ viewMode, onChange }) {
  const tabs = [
    { id: "query",   label: "Query" },
    { id: "split",   label: "Split" },
    { id: "results", label: "Results" },
  ];
  return (
    <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--surf2)", flexShrink: 0 }}>
      {tabs.map(t => {
        const active = viewMode === t.id || (!viewMode && t.id === "split");
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              padding: "8px 16px",
              border: "none",
              background: "transparent",
              color: active ? "var(--text)" : "var(--text-dim)",
              fontFamily: "inherit",
              fontSize: 12,
              fontWeight: active ? 600 : 400,
              cursor: "pointer",
              borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function ComputeQueryPanel({ query, bodies, calendar, isLocked, onChange, onRun, savedQueries, onSaveQuery, onLoadQuery, onDeleteQuery }) {
  const alignmentType = query.alignmentType || "phase";
  const bodyIds = query.bodyIds || [];
  const toleranceVal = Number.isFinite(query.tolerance) ? query.tolerance : DEFAULT_TOLERANCE[alignmentType];

  // Inline flash for auto-deselect on alignment-type change (CM.9 Sub-C).
  // Local-to-panel state; auto-dismisses after 5 seconds. Lost on tab
  // switch — acceptable since the panel is the surface displaying it.
  const [flash, setFlash] = useState(null);
  useEffect(() => {
    if (!flash) return;
    const handle = setTimeout(() => setFlash(null), 5000);
    return () => clearTimeout(handle);
  }, [flash]);

  // CM.7 saved-queries dropdown state + new-query name input.
  const [savedOpen, setSavedOpen] = useState(false);
  const [newSavedName, setNewSavedName] = useState("");
  const handleSaveCurrent = () => {
    const name = newSavedName.trim();
    if (!name) return;
    onSaveQuery?.(name);
    setNewSavedName("");
  };

  // Cmd/Ctrl+Enter shortcut per CM.3. Bound at the panel level so the
  // shortcut works from any field inside the form.
  const onKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onRun();
    }
  };

  const toggleBody = (id) => {
    // r029: body picker for query setup. Allowed in locked mode.
    const has = bodyIds.includes(id);
    onChange({ bodyIds: has ? bodyIds.filter(x => x !== id) : [...bodyIds, id] });
  };

  // Alignment-type change handler. Computes which bodies in the current
  // pick-set become invalid under the new type (CM.9 auto-deselect rule),
  // removes them, resets tolerance to the new type's default, and surfaces
  // an inline flash with the removed count. Locked-aware via the outer
  // onChange routing (which gates on isLocked at the state-mutation layer).
  const handleAlignmentTypeChange = (newType) => {
    if (newType === alignmentType) return;
    const bodiesById = {};
    bodies.forEach(b => { if (b && b.id) bodiesById[b.id] = b; });
    const invalid = findInvalidBodiesForType(bodyIds, newType, bodiesById);
    const nextIds = invalid.length > 0
      ? bodyIds.filter(id => !invalid.includes(id))
      : bodyIds;
    onChange({
      alignmentType: newType,
      tolerance: DEFAULT_TOLERANCE[newType],
      bodyIds: nextIds,
    });
    if (invalid.length > 0) {
      const labelForType = ALIGNMENT_TYPES.find(t => t.id === newType)?.label || newType;
      setFlash({
        count: invalid.length,
        message: `${invalid.length} ${invalid.length === 1 ? "body" : "bodies"} removed — not valid for ${labelForType} queries`,
      });
    } else {
      setFlash(null);
    }
  };

  // r012: picker moved to the tree (CM.9). Form-side body section is now
  // a chip strip showing the current selection; eligibility / dim / sort
  // happens in the tree, not here.

  const tolUnit = alignmentType === "eclipse" ? "magnitude" : "°";
  const tolHint = alignmentType === "phase"       ? "How spread out the bodies can be in their cycles and still count as aligned. 18° ≈ 5% of a full cycle."
                : alignmentType === "conjunction" ? "How far apart in the sky (as seen from the central star) the bodies can be and still count as a conjunction, in degrees."
                : alignmentType === "eclipse"     ? "How much of the eclipsed body must be covered to count. 0.5 = half-covered; 1.0 = fully covered (total eclipse)."
                : alignmentType === "nodal"       ? "How close to the orbital crossing point a body must be, measured along its orbit in degrees."
                : "";

  return (
    <div onKeyDown={onKeyDown}>
      {onSaveQuery && (
        <div style={{ marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <button
            onClick={() => setSavedOpen(v => !v)}
            style={{
              padding: "5px 10px",
              border: "1px solid var(--border)",
              background: savedOpen ? "rgba(200,169,110,0.18)" : "transparent",
              color: "var(--text)",
              fontSize: 12,
              fontFamily: "inherit",
              cursor: "pointer",
              borderRadius: 3,
            }}
            title="Saved queries"
          >
            Saved queries ({savedQueries?.length || 0}) {savedOpen ? "▴" : "▾"}
          </button>
        </div>
      )}
      {savedOpen && onSaveQuery && (
        <div style={{ marginBottom: 14, padding: 10, background: "var(--surf2)", border: "1px solid var(--border)", borderRadius: 3 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <input
              type="text"
              value={newSavedName}
              onChange={e => setNewSavedName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); handleSaveCurrent(); } }}
              placeholder="Name for current query"
              style={{
                flex: 1,
                padding: "4px 8px",
                border: "1px solid var(--border)",
                borderRadius: 3,
                background: "var(--surf)",
                color: "var(--text)",
                fontSize: 12,
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={handleSaveCurrent}
              disabled={!newSavedName.trim()}
              style={{
                padding: "4px 12px",
                border: "1px solid var(--border)",
                background: newSavedName.trim() ? "var(--accent)" : "transparent",
                color: newSavedName.trim() ? "var(--bg)" : "var(--text-dim)",
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "inherit",
                cursor: newSavedName.trim() ? "pointer" : "not-allowed",
                borderRadius: 3,
              }}
            >Save current</button>
          </div>
          {(!savedQueries || savedQueries.length === 0) ? (
            <div style={{ fontSize: 11, color: "var(--text-dim)", fontStyle: "italic", padding: 4 }}>
              No saved queries yet. Configure a query above, name it, and save.
            </div>
          ) : (
            <div style={{ maxHeight: 160, overflowY: "auto" }}>
              {savedQueries.map(sq => {
                const at = ALIGNMENT_TYPES.find(t => t.id === sq.query?.alignmentType);
                return (
                  <div key={sq.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sq.name}</div>
                      <div style={{ fontSize: 10, color: "var(--text-dim)" }}>
                        {at?.label || sq.query?.alignmentType || "—"} · {(sq.query?.bodyIds || []).length} bodies
                      </div>
                    </div>
                    <button
                      onClick={() => { onLoadQuery?.(sq.id); setSavedOpen(false); }}
                      style={{
                        padding: "3px 8px",
                        border: "1px solid var(--border)",
                        background: "transparent",
                        color: "var(--text)",
                        fontSize: 10,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        borderRadius: 3,
                      }}
                    >Load</button>
                    <button
                      onClick={() => onDeleteQuery?.(sq.id)}
                      title="Delete"
                      style={{
                        padding: 0,
                        width: 20,
                        height: 20,
                        border: "1px solid var(--border)",
                        background: "transparent",
                        color: "var(--text-dim)",
                        fontSize: 13,
                        cursor: "pointer",
                        borderRadius: "50%",
                        lineHeight: 1,
                      }}
                    >×</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <label style={asboLabelStyle()}>
          <span title="What kind of celestial arrangement to look for. Each type asks a different question about how bodies line up." style={{ borderBottom: "1px dotted var(--text-dim)", cursor: "help" }}>Alignment type</span>
        </label>
        <select
          value={alignmentType}
          onChange={e => handleAlignmentTypeChange(e.target.value)}
          style={asboInputStyle()}
        >
          {ALIGNMENT_TYPES.map(t => (
            <option key={t.id} value={t.id} disabled={!t.enabled}>
              {t.label}{!t.enabled ? " — disabled" : ""}
            </option>
          ))}
        </select>
        <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4, fontStyle: "italic" }}>
          {ALIGNMENT_TYPES.find(t => t.id === alignmentType)?.hint}
        </div>
      </div>

      {flash && (
        <div
          style={{
            margin: "0 0 12px 0",
            padding: "6px 10px",
            background: "rgba(200,169,110,0.12)",
            border: "1px solid var(--border)",
            borderLeft: "3px solid var(--accent)",
            borderRadius: 3,
            fontSize: 12,
            color: "var(--text)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span>{flash.message}</span>
          <button
            onClick={() => setFlash(null)}
            style={{
              padding: 0,
              width: 18,
              height: 18,
              border: "none",
              background: "transparent",
              color: "var(--text-dim)",
              fontSize: 14,
              cursor: "pointer",
              lineHeight: 1,
            }}
            title="Dismiss"
          >×</button>
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <label style={asboLabelStyle()}>Bodies ({bodyIds.length} selected)</label>
        {bodyIds.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--text-dim)", fontStyle: "italic", padding: "8px 0" }}>
            {alignmentType === "eclipse"
              ? "Pick 2 bodies from the tree. First pick = eclipsing body; second pick = eclipsed body."
              : "Pick bodies from the tree on the left. At least 2 needed to run a query."}
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "2px 0" }}>
            {bodyIds.map((id, idx) => {
              const b = bodies.find(x => x.id === id);
              const label = b?.name || "(unknown)";
              const rolePrefix = alignmentType === "eclipse"
                ? (idx === 0 ? "Eclipsing: " : idx === 1 ? "Eclipsed: " : "")
                : "";
              return (
                <span
                  key={id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "3px 4px 3px 10px",
                    background: "rgba(200,169,110,0.18)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                    color: "var(--text)",
                    maxWidth: "100%",
                  }}
                  title={b ? `${b.name}${b.parentBodyId ? ` · child of ${bodies.find(p => p.id === b.parentBodyId)?.name || "?"}` : ""}` : "Unknown body"}
                >
                  {rolePrefix && <span style={{ color: "var(--text-dim)", fontSize: 11, fontStyle: "italic" }}>{rolePrefix}</span>}
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>{label}</span>
                  <button
                    onClick={() => toggleBody(id)}
                    title="Remove"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 18,
                      height: 18,
                      padding: 0,
                      border: "none",
                      background: "transparent",
                      color: "var(--text-dim)",
                      fontSize: 14,
                      cursor: "pointer",
                      borderRadius: "50%",
                      lineHeight: 1,
                    }}
                  >×</button>
                </span>
              );
            })}
            {bodyIds.length >= 2 && (
              <button
                onClick={() => onChange({ bodyIds: [] })}
                style={{
                  padding: "3px 10px",
                  background: "transparent",
                  border: "1px dashed var(--border)",
                  borderRadius: 12,
                  fontSize: 11,
                  color: "var(--text-dim)",
                  fontFamily: "inherit",
                  cursor: "pointer",
                }}
              >Clear all</button>
            )}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <div>
          <label style={asboLabelStyle()}>Start date</label>
          <ComputeAbsoluteDayInput
            value={query.dateRangeStart}
            calendar={calendar}
            onChange={v => onChange({ dateRangeStart: v })}
          />
        </div>
        <div>
          <label style={asboLabelStyle()}>End date</label>
          <ComputeAbsoluteDayInput
            value={query.dateRangeEnd}
            calendar={calendar}
            onChange={v => onChange({ dateRangeEnd: v })}
          />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={asboLabelStyle()}>
          <span title="How close counts as a hit. A smaller tolerance finds only near-perfect alignments; a larger tolerance includes loose ones too." style={{ borderBottom: "1px dotted var(--text-dim)", cursor: "help" }}>Tolerance ({tolUnit})</span>
        </label>
        <input
          type="number"
          value={toleranceVal}
          onChange={e => {
            const v = e.target.value;
            onChange({ tolerance: v === "" ? null : parseFloat(v) });
          }}
          style={asboInputStyle()}
          step="any"
          min="0"
        />
        {tolHint && (
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4, fontStyle: "italic" }}>{tolHint}</div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button
          onClick={onRun}
          disabled={bodyIds.length < 2}
          style={{
            padding: "8px 18px",
            background: bodyIds.length >= 2 ? "var(--accent)" : "var(--surf2)",
            color: bodyIds.length >= 2 ? "var(--bg)" : "var(--text-dim)",
            border: "1px solid var(--border)",
            borderRadius: 3,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: bodyIds.length >= 2 ? "pointer" : "not-allowed",
          }}
        >
          Run
        </button>
        <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
          {bodyIds.length < 2 ? "Select at least 2 bodies" : "Cmd/Ctrl+Enter to run"}
        </span>
      </div>
    </div>
  );
}

// Calendar-date input wrapper for Compute's date-range fields. Stores the
// underlying value as an absoluteDay (an integer) — the math operates in
// absolute-day space. UI shows a CalendarDateEditor for human-readable
// entry and converts on save.
// r029: not lock-gated. Compute query setup is view-state.
function ComputeAbsoluteDayInput({ value, calendar, onChange }) {
  // Round-trip absoluteDay ↔ calendar-date. value (absoluteDay) → calendar
  // date for display; user edits → calendar date back to absoluteDay.
  const calendarDate = useMemo(() => {
    if (!Number.isFinite(value)) return null;
    return absoluteDayToCalendarDate(calendar, value);
  }, [calendar, value]);

  return (
    <CalendarDateEditor
      value={calendarDate}
      onChange={cd => {
        if (!cd) return onChange(null);
        const absDay = calendarDateToAbsoluteDay(calendar, cd);
        onChange(Number.isFinite(absDay) ? absDay : null);
      }}
      calendar={calendar}
      allowApproximate={false}
    />
  );
}

function ComputeResultsPanel({ results, bodies, calendar, alignmentType, tolerance, selectedResultId, onSelectResult, onClearResults }) {
  // Column heading and value field differ by alignment type. Phase uses
  // spread (angular spread of mean anomalies); conjunction uses separation
  // (max pairwise angular separation between position vectors); eclipse
  // uses magnitude (fraction of eclipsed disk covered); nodal uses
  // max-distance-to-nearest-node.
  //
  // r030 Bug 2 fix: derive the effective alignmentType from the first
  // result row when available, falling back to the prop (current query).
  // r023 stamps alignmentType into each row at run-time, so this picks up
  // the type that was actually used for the computation. Prevents the
  // drift bug where changing alignment type in the query form without
  // re-running mislabels the column AND points getValue at fields the
  // results don't have (everything would render as "—").
  const effectiveAlignmentType =
    (results && results[0] && results[0].alignmentType) || alignmentType;
  const valueCol = effectiveAlignmentType === "conjunction" ? "Separation"
                 : effectiveAlignmentType === "eclipse"     ? "Magnitude"
                 : effectiveAlignmentType === "nodal"       ? "Node dist."
                                                            : "Spread";
  const getValue = (r) =>
      effectiveAlignmentType === "conjunction" ? r.separationDegrees
    : effectiveAlignmentType === "eclipse"     ? r.magnitude
    : effectiveAlignmentType === "nodal"       ? r.maxNodeDistanceDegrees
                                               : r.spreadDegrees;
  const formatValue = (val) => {
    if (!Number.isFinite(val)) return "—";
    return effectiveAlignmentType === "eclipse" ? val.toFixed(3) : `${val.toFixed(2)}°`;
  };

  if (!results || results.length === 0) {
    return (
      <div style={{ color: "var(--text-dim)", fontSize: 13, padding: 24, textAlign: "center" }}>
        No results yet. Configure a query above and click Run.
      </div>
    );
  }
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", padding: "6px 10px", borderBottom: "1px solid var(--border)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--text-dim)", fontWeight: 600 }}>
        <div style={{ width: 150 }}>Date</div>
        <div style={{ flex: 1 }}>Bodies</div>
        <div style={{ width: 50, textAlign: "center" }}>Q</div>
        <div style={{ width: 90, textAlign: "right" }}>{valueCol}</div>
        <button
          onClick={onClearResults}
          title="Clear results"
          style={{
            marginLeft: 10,
            padding: "2px 8px",
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--text-dim)",
            fontSize: 10,
            cursor: "pointer",
            borderRadius: 3,
            fontFamily: "inherit",
            textTransform: "none",
            letterSpacing: 0,
          }}
        >Clear</button>
      </div>
      {results.map((r, i) => {
        const cd = absoluteDayToCalendarDate(calendar, r.absoluteDay);
        const dateStr = cd ? formatCalendarDate(cd, calendar) : `day ${r.absoluteDay}`;
        const bodyNames = (r.bodyIds || [])
          .map(id => bodies.find(b => b.id === id)?.name || "(unknown)")
          .join(" · ");
        const val = getValue(r);
        const quality = computeQualityScore(effectiveAlignmentType, val, tolerance);
        const resultKey = r.absoluteDay + ":" + (r.bodyIds || []).join(",");
        const isSelected = selectedResultId === resultKey;
        return (
          <div
            key={i}
            onClick={() => onSelectResult?.(isSelected ? null : resultKey)}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 10px",
              borderBottom: "1px solid var(--border)",
              fontSize: 13,
              cursor: "pointer",
              background: isSelected ? "rgba(200,169,110,0.18)" : "transparent",
            }}
          >
            <div style={{ width: 150, fontFamily: "'Cormorant Garamond', serif", fontSize: 14 }}>{dateStr}</div>
            <div style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{bodyNames}</div>
            <div style={{ width: 50, textAlign: "center" }}>
              {Number.isFinite(quality) ? <QualityBadge score={quality} /> : null}
            </div>
            <div style={{ width: 90, textAlign: "right", color: "var(--text-dim)", fontVariantNumeric: "tabular-nums" }}>
              {formatValue(val)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// CM.5 quality badge for results table. Score 1 = best (brightest); 5 =
// edge of tolerance (dimmest but still in-range).
function QualityBadge({ score }) {
  const opacities = [1, 0.85, 0.7, 0.55, 0.4];
  const opacity = opacities[score - 1] ?? 0.4;
  return (
    <span
      style={{
        display: "inline-block",
        minWidth: 18,
        padding: "1px 5px",
        background: `rgba(200,169,110,${opacity * 0.4})`,
        border: `1px solid rgba(200,169,110,${opacity})`,
        color: "var(--text)",
        fontSize: 11,
        fontWeight: 600,
        borderRadius: 9,
        fontVariantNumeric: "tabular-nums",
      }}
      title={`Quality ${score} of 5`}
    >{score}</span>
  );
}

// CM.4 detail drawer. Slides next to the results list when a result is
// selected. Shows full-precision values, full body context (parent
// chain), and alignment-specific details (e.g., each body's mean anomaly
// for phase, angular separations for conjunction, observer info for
// eclipse, per-body node distance for nodal).
//
// State source: state.ephemeris.compute.selectedResultId. Set by row
// click in the results panel; cleared by × on the drawer or by clicking
// the same row again.
function ComputeDetailDrawer({ result, query, bodies, bodiesById, calendar, onClose }) {
  if (!result) return null;
  // r030 Bug 2 fix: prefer the result row's stamped alignmentType (r023)
  // over the live query's, so a stale query.alignmentType doesn't
  // mislabel the drawer or mis-key the tolerance default.
  const alignmentType = result.alignmentType || query?.alignmentType || "phase";
  const tolerance = Number.isFinite(query?.tolerance) ? query.tolerance : DEFAULT_TOLERANCE[alignmentType];
  const cd = absoluteDayToCalendarDate(calendar, result.absoluteDay);
  const dateStr = cd ? formatCalendarDate(cd, calendar) : `day ${result.absoluteDay}`;
  const resultBodies = (result.bodyIds || []).map(id => bodiesById[id]).filter(Boolean);

  // Per-body context: name + parent name (one level up, more if useful).
  const bodyContext = (b, idx) => {
    if (!b) return null;
    const parent = b.parentBodyId ? bodiesById[b.parentBodyId] : null;
    const root = getRootAncestorId(b.id, bodiesById);
    const rootBody = root && root !== b.id ? bodiesById[root] : null;
    const rolePrefix = alignmentType === "eclipse"
      ? (idx === 0 ? "Eclipsing: " : idx === 1 ? "Eclipsed: " : "")
      : "";
    return (
      <div key={b.id} style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          {rolePrefix && <span style={{ color: "var(--text-dim)", fontSize: 11, fontWeight: 400, fontStyle: "italic" }}>{rolePrefix}</span>}
          {b.name || "(unnamed)"}
        </div>
        {parent && (
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
            child of {parent.name}
            {rootBody && rootBody.id !== parent.id && <span> · root {rootBody.name}</span>}
          </div>
        )}
      </div>
    );
  };

  // Alignment-specific metric block. Re-derives values from positions at
  // event time for the more detailed views (per-body angles, distances).
  // The result object only stores the aggregate value; per-body values
  // are computed fresh here.
  const renderMetricBlock = () => {
    if (alignmentType === "phase") {
      // Each body's mean anomaly at event time.
      const t = result.absoluteDay;
      return (
        <>
          <div style={asboLabelStyle()}>Mean anomalies at event</div>
          {resultBodies.map(b => {
            const parent = bodiesById[b.parentBodyId];
            const T = computeOrbitalPeriodDays(b.orbitalElements?.semiMajorAxis, parent?.physicalParams?.mass);
            const M0 = b.orbitalElements?.meanAnomalyAtEpoch || 0;
            const M = T > 0 ? ((M0 + 360 * t / T) % 360 + 360) % 360 : NaN;
            return (
              <div key={b.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0" }}>
                <span style={{ color: "var(--text-dim)" }}>{b.name}</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{Number.isFinite(M) ? `${M.toFixed(2)}°` : "—"}</span>
              </div>
            );
          })}
          <div style={{ marginTop: 10, fontSize: 12 }}>
            <div style={{ color: "var(--text-dim)" }}>Spread</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18 }}>
              {result.spreadDegrees?.toFixed(3)}° <span style={{ fontSize: 12, color: "var(--text-dim)" }}>of {tolerance.toFixed(2)}° tolerance</span>
            </div>
          </div>
        </>
      );
    }
    if (alignmentType === "conjunction") {
      const t = result.absoluteDay;
      const positions = resultBodies.map(b => ({ b, pos: computeRootRelativePosition(b, t, bodiesById) }));
      return (
        <>
          <div style={asboLabelStyle()}>Root-relative positions (AU)</div>
          {positions.map(({ b, pos }) => (
            <div key={b.id} style={{ fontSize: 11, padding: "2px 0", fontVariantNumeric: "tabular-nums" }}>
              <span style={{ color: "var(--text-dim)" }}>{b.name}: </span>
              {pos
                ? <span>({pos.x.toFixed(4)}, {pos.y.toFixed(4)}, {pos.z.toFixed(4)})</span>
                : <span style={{ fontStyle: "italic" }}>(position unavailable)</span>}
            </div>
          ))}
          <div style={{ marginTop: 10, fontSize: 12 }}>
            <div style={{ color: "var(--text-dim)" }}>Max pairwise separation</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18 }}>
              {result.separationDegrees?.toFixed(4)}° <span style={{ fontSize: 12, color: "var(--text-dim)" }}>of {tolerance.toFixed(2)}° tolerance</span>
            </div>
          </div>
        </>
      );
    }
    if (alignmentType === "eclipse") {
      const t = result.absoluteDay;
      const [eclipsing, eclipsed] = resultBodies;
      const observer = bodiesById[eclipsing?.parentBodyId];
      return (
        <>
          <div style={asboLabelStyle()}>Observer</div>
          <div style={{ fontSize: 13, marginBottom: 10 }}>{observer?.name || "(unknown)"}</div>
          <div style={asboLabelStyle()}>Eclipse magnitude</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, marginBottom: 4 }}>
            {result.magnitude?.toFixed(4)}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 10 }}>
            {result.magnitude >= 1 ? "Total eclipse (eclipsing disk fully covers eclipsed)" : `${(result.magnitude * 100).toFixed(1)}% of eclipsed disk covered`}
          </div>
        </>
      );
    }
    if (alignmentType === "nodal") {
      const t = result.absoluteDay;
      return (
        <>
          <div style={asboLabelStyle()}>Per-body distance to nearest node</div>
          {resultBodies.map(b => {
            const oe = b.orbitalElements || {};
            const parent = bodiesById[b.parentBodyId];
            const T = computeOrbitalPeriodDays(oe.semiMajorAxis, parent?.physicalParams?.mass);
            const M0 = oe.meanAnomalyAtEpoch || 0;
            const M = T > 0 ? ((M0 + 360 * t / T) % 360 + 360) % 360 : NaN;
            const nu = meanToTrueAnomaly(M, oe.eccentricity || 0);
            const u = ((oe.argumentOfPeriapsis || 0) + nu) % 360;
            const uMod = ((u % 180) + 180) % 180;
            const distance = Math.min(uMod, 180 - uMod);
            const nodeType = uMod < 90 ? "ascending" : "descending";
            return (
              <div key={b.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0" }}>
                <span style={{ color: "var(--text-dim)" }}>{b.name}</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{distance.toFixed(3)}° ({nodeType})</span>
              </div>
            );
          })}
          <div style={{ marginTop: 10, fontSize: 12 }}>
            <div style={{ color: "var(--text-dim)" }}>Max distance</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18 }}>
              {result.maxNodeDistanceDegrees?.toFixed(4)}° <span style={{ fontSize: 12, color: "var(--text-dim)" }}>of {tolerance.toFixed(2)}° tolerance</span>
            </div>
          </div>
        </>
      );
    }
    return null;
  };

  return (
    <div style={{ width: "100%", height: "100%", overflow: "auto", padding: 16, background: "var(--surf)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: "var(--text-dim)", fontWeight: 600 }}>Event detail</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, marginTop: 2 }}>{dateStr}</div>
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>absolute day {result.absoluteDay}</div>
        </div>
        <button
          onClick={onClose}
          title="Close"
          style={{
            padding: 0,
            width: 24,
            height: 24,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--text-dim)",
            fontSize: 16,
            cursor: "pointer",
            borderRadius: "50%",
            lineHeight: 1,
            flexShrink: 0,
          }}
        >×</button>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={asboLabelStyle()}>Bodies</div>
        {resultBodies.map(bodyContext)}
      </div>
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
        {renderMetricBlock()}
      </div>
    </div>
  );
}