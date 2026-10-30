
const EPHEMERIS_MODES = [
  { id: "asbo",        label: "Astronomical Body" },
  { id: "compute",     label: "Compute" },
  { id: "force-align", label: "Forced Alignment" },
  { id: "observe",     label: "Observe" },
  { id: "event",       label: "Event" },
];

// ─── Ephemeris view (v1.5) ───────────────────────────────────────────────────
//
// Top-level celestial-mechanics view. Four workspace modes: Astronomical
// Body (AsBo), Compute, Observe, Event/Festival/Holiday. Modes are
// first-class navigation, not tabs within a single view — they share the
// body tree on the left but each owns its own working surface.
//
// r002 shipped the schema, migration, and view shell with a placeholder
// body-count panel. r003 wires the workspace shell: mode switcher tabs,
// the body tree (with search and proper hierarchy), per-mode selection,
// and an AsBo placeholder that shows the selected body's identity. The
// actual AsBo editor (orbital element widget, kind-aware defaults, derived
// values) lands in r004. Compute / Observe / Event modes stub to "coming
// in a later pass" panels.
//
// State plumbing:
//   - state.ephemeris.currentMode persists the active mode across reloads
//   - state.ephemeris.treeUI.{searchText, expandedNodeIds, scrollY} is
//     shared across modes
//   - state.ephemeris.{asbo, compute, observe, event}.selectedBodyId is
//     per-mode — clicking a tree row sets the current mode's selection
//
// Empty state (AB.13): when state.celestialBodies is empty, the tree
// renders an empty pane and the AsBo workspace shows an illustration-plus-
// intro panel. Create flow stubbed until r004.

function EphemerisView({ state, updateState, isLocked, onOpenEntry, onPromoteEvent, showSecrets }) {
  const eph = state.ephemeris || makeDefaultEphemerisState();
  const bodies = Array.isArray(state.celestialBodies) ? state.celestialBodies : [];
  const currentMode = eph.currentMode || "asbo";
  const treeUI = eph.treeUI || { searchText: "", expandedNodeIds: [], scrollY: 0 };

  // Per-mode selection lookup. Compute mode uses bodyIds (multi-select) so
  // its tree selection state is the currentQuery.bodyIds array, not a
  // singular selectedBodyId; r003 doesn't yet wire Compute selection so the
  // lookup falls back to undefined for that mode.
  const selectedBodyId =
    currentMode === "asbo"    ? eph.asbo?.selectedBodyId
  : currentMode === "observe" ? eph.observe?.selectedBodyId
  : currentMode === "event"   ? eph.event?.selectedEventId
                              : null;

  const setMode = (mode) => {
    // r029: mode switch is navigation, not a data write. Allowed in locked mode.
    updateState(s => ({
      ...s,
      ephemeris: { ...(s.ephemeris || makeDefaultEphemerisState()), currentMode: mode }
    }));
  };

  const setTreeSearch = (text) => {
    // r029: tree search is navigation. Allowed in locked mode.
    updateState(s => {
      const cur = s.ephemeris || makeDefaultEphemerisState();
      return {
        ...s,
        ephemeris: { ...cur, treeUI: { ...(cur.treeUI || {}), searchText: text } }
      };
    });
  };

  const selectBody = (bodyId) => {
    // r029: selection is navigation (AsBo/Observe) or query setup (Compute
    // multi-select). Neither writes body data; both allowed in locked mode.
    updateState(s => {
      const cur = s.ephemeris || makeDefaultEphemerisState();
      const modeKey = cur.currentMode || "asbo";
      // AsBo and Observe single-select on the body tree (per cross-cutting
      // decision "selection state is per-mode"). Compute uses multi-select
      // via currentQuery.bodyIds — handled by toggleBodyInQuery below.
      // Event uses event row selection in the result table; r003 ignores
      // tree clicks for that mode.
      if (modeKey === "compute") {
        // Tree click in Compute mode toggles membership in the query's
        // bodyIds set. CM.9 dim/sort/block on the tree handles eligibility
        // at the click-handler level (ineligible bodies don't reach this
        // path because the tree blocks their clicks).
        const compute = cur.compute || makeDefaultEphemerisState().compute;
        const curQuery = compute.currentQuery || {};
        const curIds = Array.isArray(curQuery.bodyIds) ? curQuery.bodyIds : [];
        const nextIds = curIds.includes(bodyId)
          ? curIds.filter(x => x !== bodyId)
          : [...curIds, bodyId];
        return {
          ...s,
          ephemeris: {
            ...cur,
            compute: {
              ...compute,
              currentQuery: { ...curQuery, bodyIds: nextIds },
            },
          },
        };
      }
      if (modeKey === "force-align") {
        // v1.5 r045: Forced Alignment multi-select mirrors Compute exactly,
        // but stores into forceAlign.bodyIds — selections don't cross
        // workspaces. Tree-level dim/block guards ineligible bodies (no
        // parent, no parent mass, no sma) from ever reaching this handler.
        const fa = cur.forceAlign || makeDefaultEphemerisState().forceAlign;
        const curIds = Array.isArray(fa.bodyIds) ? fa.bodyIds : [];
        const nextIds = curIds.includes(bodyId)
          ? curIds.filter(x => x !== bodyId)
          : [...curIds, bodyId];
        return {
          ...s,
          ephemeris: {
            ...cur,
            forceAlign: { ...fa, bodyIds: nextIds },
          },
        };
      }
      if (modeKey !== "asbo" && modeKey !== "observe") return s;
      return {
        ...s,
        ephemeris: {
          ...cur,
          [modeKey]: { ...(cur[modeKey] || {}), selectedBodyId: bodyId }
        }
      };
    });
  };

  // v1.5 r007: body creation. Adds a new body with default values, picks
  // it as the current selection so AsBo opens it in edit mode, and stays
  // in AsBo mode. Default kind is "structure" — the generic narrative
  // catch-all — so freshly-created bodies land in the narrative section
  // of the tree until the user picks something more specific. The user
  // can promote a body to a computable kind (star/planet/moon/etc.) via
  // the kind picker in the AsBo editor.
  const createBody = (parentBodyId = null) => {
    if (isLocked) return;
    // Shape-check guard: createBody is wired to `onClick` in two places.
    // React fills `onClick` handlers with a SyntheticEvent, which would
    // become a truthy non-string parentBodyId without this guard. Only
    // accept a string starting with "cel-"; coerce anything else to null.
    // (Doctrine: "Adding a parameter to an existing handler requires
    // auditing every call site" — guard is the durable defense.)
    const safeParentId = (typeof parentBodyId === "string" && parentBodyId.startsWith("cel-"))
      ? parentBodyId
      : null;
    const newId = `cel-${genId()}`;
    updateState(s => {
      const cur = s.ephemeris || makeDefaultEphemerisState();
      return {
        ...s,
        celestialBodies: [
          ...(s.celestialBodies || []),
          makeNewCelestialBody(newId, { parentBodyId: safeParentId }),
        ],
        ephemeris: {
          ...cur,
          currentMode: "asbo",
          asbo: { ...(cur.asbo || {}), selectedBodyId: newId, editingNewBody: true },
        },
      };
    });
  };

  // v1.5 r043: tutorial seed. Adds a working Sol / Terra / Luna chain so
  // an explorer has something orbiting before they pick any numbers. Bodies
  // are regular celestialBodies entries — editable and deletable like any
  // others. Confirms first; selects the star afterward so the tree opens to
  // the top of the chain. Lock-guarded.
  const loadTutorial = () => {
    if (isLocked) return;
    if (!window.confirm("Add the example Sol / Terra / Luna system (3 bodies: a star, a planet orbiting it, and a moon orbiting the planet)? These are regular bodies you can edit or delete like any others.")) return;
    const sunId    = `cel-${genId()}`;
    const planetId = `cel-${genId()}`;
    const moonId   = `cel-${genId()}`;
    updateState(s => {
      const cur = s.ephemeris || makeDefaultEphemerisState();
      const sol = makeNewCelestialBody(sunId, {
        name: "Sol", kind: "star",
        physicalParams: { mass: 332946, radius: 109, axialTilt: 7.25 },
      });
      const terra = makeNewCelestialBody(planetId, {
        name: "Terra", kind: "planet", parentBodyId: sunId,
        physicalParams: { mass: 1, radius: 1, axialTilt: 23.5 },
        orbitalElements: { semiMajorAxis: 1, eccentricity: 0.017, inclination: 0, ascendingNode: 0, argumentOfPeriapsis: 0, meanAnomalyAtEpoch: 0 },
      });
      const luna = makeNewCelestialBody(moonId, {
        name: "Luna", kind: "moon", parentBodyId: planetId,
        physicalParams: { mass: 0.012, radius: 0.273, axialTilt: 6.68 },
        orbitalElements: { semiMajorAxis: 0.00257, eccentricity: 0.0549, inclination: 5.145, ascendingNode: 0, argumentOfPeriapsis: 0, meanAnomalyAtEpoch: 0 },
      });
      return {
        ...s,
        celestialBodies: [...(s.celestialBodies || []), sol, terra, luna],
        ephemeris: {
          ...cur,
          currentMode: "asbo",
          asbo: { ...(cur.asbo || {}), selectedBodyId: sunId, editingNewBody: false },
        },
      };
    });
  };

  // v1.5 r007: body deletion. Removes a body, re-points orphaned children
  // to null (top-level) so the tree stays connected, clears selection.
  // Caller is responsible for confirming with the user — this just acts.
  //
  // r030 Bug 1 fix: re-parenting uses .map() instead of in-place mutation
  // so state object references stay immutable. Previously `b.parentBodyId
  // = null` modified the actual state object in the array; React's
  // reference-equality checks elsewhere could then miss the update.
  //
  // r030 Bug 3 fix: clean up dangling references to the deleted body
  // across observe.selectedBodyId, observe.bodyColorOverrides,
  // observe.savedViewpoints[].snapshot.selectedBodyId, and
  // compute.savedQueries[].query.bodyIds. event.selectedEventId is
  // event-keyed (not body-keyed), so it's untouched.
  const deleteBody = (bodyId) => {
    if (isLocked) return;
    updateState(s0 => {
      // v1.7 r042: every link the index reads into the body goes first,
      // entries' and Fabula's references among them, as v1.5's r080 and
      // v1.7's r009 cleared them here (clearLinksTo).
      const s = clearLinksTo(s0, new Set([bodyId]));
      const cur = s.ephemeris || makeDefaultEphemerisState();
      const remaining = (s.celestialBodies || [])
        .filter(b => b && b.id !== bodyId)
        .map(b => b.parentBodyId === bodyId ? { ...b, parentBodyId: null } : b);

      // Clean up references to the deleted body in the observe slice.
      const curObserve = cur.observe || makeDefaultEphemerisState().observe;
      const obsOverrides = (curObserve.bodyColorOverrides && typeof curObserve.bodyColorOverrides === "object")
        ? { ...curObserve.bodyColorOverrides }
        : {};
      if (Object.prototype.hasOwnProperty.call(obsOverrides, bodyId)) {
        delete obsOverrides[bodyId];
      }
      const obsViewpoints = Array.isArray(curObserve.savedViewpoints)
        ? curObserve.savedViewpoints.map(vp =>
            (vp && vp.snapshot && vp.snapshot.selectedBodyId === bodyId)
              ? { ...vp, snapshot: { ...vp.snapshot, selectedBodyId: null } }
              : vp
          )
        : [];
      const nextObserve = {
        ...curObserve,
        selectedBodyId: curObserve.selectedBodyId === bodyId ? null : curObserve.selectedBodyId,
        bodyColorOverrides: obsOverrides,
        savedViewpoints: obsViewpoints,
      };

      // Clean up references to the deleted body in the compute slice's
      // saved queries. Live currentQuery.bodyIds is left alone here — the
      // user may want to know why a body disappeared mid-query setup,
      // and the runCompute path already filters out unresolved ids.
      const curCompute = cur.compute || makeDefaultEphemerisState().compute;
      const compSavedQueries = Array.isArray(curCompute.savedQueries)
        ? curCompute.savedQueries.map(sq => {
            if (!sq || !sq.query || !Array.isArray(sq.query.bodyIds)) return sq;
            if (!sq.query.bodyIds.includes(bodyId)) return sq;
            return {
              ...sq,
              query: { ...sq.query, bodyIds: sq.query.bodyIds.filter(id => id !== bodyId) },
            };
          })
        : [];
      const nextCompute = { ...curCompute, savedQueries: compSavedQueries };

      // r052: sweep Force-Align references. bodyIds drops the deleted id;
      // lastApply.snapshots either drops the id (others remain) or, if it
      // was the only snapshotted body, the whole lastApply record clears.
      const curForceAlign = cur.forceAlign || makeDefaultEphemerisState().forceAlign;
      const faBodyIds = Array.isArray(curForceAlign.bodyIds)
        ? curForceAlign.bodyIds.filter(id => id !== bodyId)
        : [];
      let faLastApply = curForceAlign.lastApply;
      if (faLastApply && Array.isArray(faLastApply.snapshots)) {
        const filtered = faLastApply.snapshots.filter(sn => sn.id !== bodyId);
        faLastApply = filtered.length > 0
          ? { ...faLastApply, snapshots: filtered }
          : null;
      }
      const nextForceAlign = { ...curForceAlign, bodyIds: faBodyIds, lastApply: faLastApply };
      // v1.5 moon-unification: strip the deleted body from every calendar's
      // celestials ref list. Moons are world bodies; a calendar that showed
      // this moon must drop the now-dangling ref so the grid stops trying to
      // resolve it (the picker's orphan-cleanup is the manual counterpart).
      const stripCelestial = (cal) =>
        (cal && Array.isArray(cal.celestials) && cal.celestials.includes(bodyId))
          ? { ...cal, celestials: cal.celestials.filter(id => id !== bodyId) }
          : cal;
      const nextWorld = { ...s.world, calendar: stripCelestial(s.world && s.world.calendar) };
      const nextCalendars = Array.isArray(s.calendars) ? s.calendars.map(stripCelestial) : s.calendars;

      return {
        ...s,
        celestialBodies: remaining,
        world: nextWorld,
        calendars: nextCalendars,
        ephemeris: {
          ...cur,
          asbo: { ...(cur.asbo || {}), selectedBodyId: null, editingNewBody: false },
          observe: nextObserve,
          compute: nextCompute,
          forceAlign: nextForceAlign,
        },
      };
    });
  };

  // v1.5 r007: in-place body update. Replaces the targeted body's fields
  // with the merged version. Doesn't clear selection. Used by the AsBo
  // edit-mode Save button.
  const updateBody = (bodyId, patch) => {
    if (isLocked) return;
    updateState(s => ({
      ...s,
      celestialBodies: (s.celestialBodies || []).map(b =>
        b && b.id === bodyId ? { ...b, ...patch } : b
      ),
      ephemeris: {
        ...(s.ephemeris || makeDefaultEphemerisState()),
        asbo: {
          ...((s.ephemeris && s.ephemeris.asbo) || {}),
          editingNewBody: false,
        },
      },
    }));
  };

  // v1.5 r021: per-body color override writer. Lives at EphemerisView
  // level (not inside ObserveModeContent) because AsBoEditForm's
  // Display block also needs to write it. Pass `null` for hex to remove
  // the override and fall back to the kind layer.
  const setBodyColorOverride = (bodyId, hex) => {
    // r029: per-body color override is a view preference (lives in
    // observe.bodyColorOverrides, doesn't touch the body itself).
    // Allowed in locked mode.
    if (!bodyId) return;
    updateState(prev => {
      const cur = prev.ephemeris || makeDefaultEphemerisState();
      const curObserve = cur.observe || makeDefaultEphemerisState().observe;
      const overrides = (curObserve.bodyColorOverrides && typeof curObserve.bodyColorOverrides === "object")
        ? { ...curObserve.bodyColorOverrides }
        : {};
      if (hex == null) delete overrides[bodyId];
      else overrides[bodyId] = hex;
      return {
        ...prev,
        ephemeris: {
          ...cur,
          observe: { ...curObserve, bodyColorOverrides: overrides },
        },
      };
    });
  };

  // Compute-mode tree props (r012). Built up once per render so the tree
  // gets a stable eligibility function and a Set for fast .has() checks.
  // useMemo avoids reconstructing on every render when nothing changed.
  const computeBodiesById = useMemo(() => {
    const m = {};
    bodies.forEach(b => { if (b && b.id) m[b.id] = b; });
    return m;
  }, [bodies]);
  const computeSelectedSet = useMemo(() => {
    const ids = eph.compute?.currentQuery?.bodyIds || [];
    return new Set(ids);
  }, [eph.compute?.currentQuery?.bodyIds]);
  const computeEligibility = useMemo(() => {
    const alignmentType = eph.compute?.currentQuery?.alignmentType || "phase";
    return (body) => isBodyEligibleForAlignment(body, alignmentType, computeSelectedSet, computeBodiesById);
  }, [eph.compute?.currentQuery?.alignmentType, computeSelectedSet, computeBodiesById]);

  // v1.5 r045: Forced Alignment uses the same multi-select tree pattern as
  // Compute, but stores into forceAlign.bodyIds and applies a different
  // eligibility rule: a body can participate in forced alignment iff it has
  // a parent with finite positive mass AND its own semi-major axis is set
  // (we need to be able to rewrite M₀, and optionally sma — both require
  // existing orbital math to bootstrap from).
  const forceAlignSelectedSet = useMemo(() => {
    const ids = eph.forceAlign?.bodyIds || [];
    return new Set(ids);
  }, [eph.forceAlign?.bodyIds]);
  const forceAlignEligibility = useMemo(() => {
    return (body) => isBodyEligibleForForceAlign(body, computeBodiesById);
  }, [computeBodiesById]);

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <EphemerisBodyTree
        bodies={bodies}
        searchText={treeUI.searchText || ""}
        onSearch={setTreeSearch}
        selectedBodyId={selectedBodyId}
        onSelect={selectBody}
        onCreate={createBody}
        isLocked={isLocked}
        currentMode={currentMode}
        selectedBodyIdSet={
          currentMode === "compute"     ? computeSelectedSet
        : currentMode === "force-align" ? forceAlignSelectedSet
        :                                 null
        }
        eligibilityFn={
          currentMode === "compute"     ? computeEligibility
        : currentMode === "force-align" ? forceAlignEligibility
        :                                 null
        }
        onToggleBody={
          currentMode === "compute" || currentMode === "force-align" ? selectBody : null
        }
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <EphemerisModeTabs currentMode={currentMode} onChange={setMode} />
        <div style={
          // Compute mode owns its own padding/scroll (split-view internal
          // scrolling needs an unconstrained parent). Other modes get the
          // standard padded container.
          currentMode === "compute"
            ? { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }
            : { flex: 1, padding: 24, overflow: "auto" }
        }>
          {currentMode === "asbo" && (
            <AsBoModeContent
              state={state}
              showSecrets={showSecrets}
              bodies={bodies}
              selectedBodyId={selectedBodyId}
              onOpenEntry={onOpenEntry}
              onSaveBody={updateBody}
              onDeleteBody={deleteBody}
              onCreateBody={createBody}
              onSelectBody={selectBody}
              onCreateChildBody={(parentId) => createBody(parentId)}
              onSetBodyColor={setBodyColorOverride}
              onLoadTutorial={loadTutorial}
              isLocked={isLocked}
              startInEditMode={!!eph.asbo?.editingNewBody}
            />
          )}
          {currentMode === "compute" && (
            <ComputeModeContent
              state={state}
              updateState={updateState}
              bodies={bodies}
              isLocked={isLocked}
            />
          )}
          {currentMode === "force-align" && (
            <ForceAlignModeContent
              state={state}
              updateState={updateState}
              bodies={bodies}
              isLocked={isLocked}
            />
          )}
          {currentMode === "observe" && (
            <ObserveModeContent
              state={state}
              updateState={updateState}
              bodies={bodies}
              selectedBodyId={selectedBodyId}
              onSelectBody={selectBody}
              isLocked={isLocked}
            />
          )}
          {currentMode === "event" && (
            <EventModeContent
              state={state}
              updateState={updateState}
              bodies={bodies}
              onOpenEntry={onOpenEntry}
              onPromoteEvent={onPromoteEvent}
              isLocked={isLocked}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function EphemerisModeTabs({ currentMode, onChange }) {
  return (
    <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--surf)" }}>
      {EPHEMERIS_MODES.map(m => {
        const active = currentMode === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            style={{
              padding: "10px 18px",
              border: "none",
              background: "transparent",
              color: active ? "var(--text)" : "var(--text-dim)",
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: active ? 600 : 400,
              cursor: "pointer",
              borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
              marginBottom: -1,
              transition: "color 120ms",
            }}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

function EphemerisBodyTree({
  bodies, searchText, onSearch,
  selectedBodyId, onSelect, onCreate, isLocked,
  // Compute-mode props (r012). When currentMode === "compute", tree
  // operates as a multi-select picker driven by selectedBodyIdSet and
  // onToggleBody. eligibilityFn(body) returns boolean — ineligible
  // bodies render dimmed and block clicks. Eligible bodies sort to the
  // top of each tree level.
  currentMode,
  selectedBodyIdSet,
  eligibilityFn,
  onToggleBody,
}) {
  // r030 Finding D: memoize the parent-keyed sibling map. buildBodyTree
  // is O(N log N) (per-level sort); at large body counts (target: 10k+)
  // rebuilding on every render — including renders triggered by search
  // keystrokes or selection clicks — adds up. Cache against the bodies
  // array reference.
  const tree = useMemo(() => buildBodyTree(bodies), [bodies]);
  const search = (searchText || "").trim().toLowerCase();
  const matchesSearch = (body) => {
    if (!search) return true;
    if ((body.name || "").toLowerCase().includes(search)) return true;
    // r030 Bug 7 fix: include otherNames in tree search (matches the
    // wiki-link resolver's resolution layer). otherNames is stored as
    // a comma-separated string; split, trim, case-fold, match.
    if (typeof body.otherNames === "string" && body.otherNames) {
      const aliases = body.otherNames.split(",");
      for (const alias of aliases) {
        if (alias.trim().toLowerCase().includes(search)) return true;
      }
    }
    return false;
  };
  const isMultiSelect = currentMode === "compute" || currentMode === "force-align";

  // Compute-mode helpers. When inactive these fall through to existing
  // single-select behavior.
  const isSelected = (body) => isMultiSelect
    ? !!selectedBodyIdSet?.has?.(body.id)
    : body.id === selectedBodyId;
  const isEligible = (body) => isMultiSelect
    ? (eligibilityFn ? !!eligibilityFn(body) : true)
    : true; // non-Compute modes: eligibility doesn't apply
  const handleClick = (body) => {
    // r029: selection / toggleBody are navigation, not data writes.
    if (isMultiSelect) {
      if (!isEligible(body)) return; // block clicks on ineligible
      onToggleBody?.(body.id);
    } else {
      onSelect(body.id);
    }
  };

  // Sort children: in Compute mode, eligible-first within each level.
  // Otherwise return as-is (caller-determined order).
  const sortForCompute = (arr) => {
    if (!isMultiSelect || !eligibilityFn) return arr;
    // Stable partition: eligible first, then ineligible. Within each
    // partition, keep existing order (which is already by semi-major axis
    // for orbiters or alphabetical for top-level, per AB.10).
    const eligible = [];
    const ineligible = [];
    for (const b of arr) {
      if (isEligible(b)) eligible.push(b);
      else ineligible.push(b);
    }
    return [...eligible, ...ineligible];
  };

  const renderNode = (body, depth) => {
    const children = sortForCompute(tree.get(body.id) || []);
    const kind = BODY_KIND_BY_ID[body.kind] || { label: body.kind || "?", symbol: "?" };
    const selected = isSelected(body);
    const eligible = isEligible(body);
    const isMatch = matchesSearch(body);
    // Dim if: search non-match OR (Compute mode AND ineligible).
    const dimmed = (search && !isMatch) || (isMultiSelect && !eligible);
    const opacity = dimmed ? 0.35 : 1;
    // r029: selection is navigation, allowed in locked mode. Compute
    // eligibility still gates clicks (ineligible bodies aren't selectable
    // for a query that can't include them).
    const clickable = !isMultiSelect || eligible;
    return (
      <div key={body.id}>
        <div
          onClick={() => handleClick(body)}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "4px 8px",
            paddingLeft: 8 + depth * 16,
            cursor: clickable ? "pointer" : "default",
            background: selected ? "rgba(200,169,110,0.18)" : "transparent",
            color: "var(--text)",
            fontWeight: selected ? 600 : 400,
            opacity,
            fontSize: 13,
            borderRadius: 2,
          }}
          title={`${kind.label}${body.parentBodyId ? "" : " · top-level"}`}
        >
          <span style={{ width: 16, color: "var(--text-dim)", fontSize: 11, flexShrink: 0 }}>{kind.symbol}</span>
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{body.name || "(unnamed)"}</span>
        </div>
        {children.map(c => renderNode(c, depth + 1))}
      </div>
    );
  };

  const topLevelAll = tree.get(null) || [];
  const knownIds = new Set(bodies.map(b => b && b.id).filter(Boolean));
  const orphans = bodies.filter(b => b && b.parentBodyId && !knownIds.has(b.parentBodyId));
  const topLevel = [...topLevelAll, ...orphans];
  const computableTopRaw = topLevel.filter(b => isComputableKind(b.kind));
  const narrativeTopRaw  = topLevel.filter(b => !isComputableKind(b.kind));
  const computableTop = sortForCompute(computableTopRaw);
  const narrativeTop  = sortForCompute(narrativeTopRaw);

  const sectionHeader = (label) => (
    <div style={{
      padding: "10px 10px 4px",
      fontSize: 10,
      letterSpacing: 1,
      textTransform: "uppercase",
      color: "var(--text-dim)",
      fontWeight: 600,
    }}>{label}</div>
  );

  return (
    <div style={{ width: 260, minWidth: 260, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", background: "var(--bg-panel, var(--surf))" }}>
      <div style={{ padding: 10, borderBottom: "1px solid var(--border)", display: "flex", gap: 6 }}>
        <input
          type="text"
          value={searchText || ""}
          onChange={e => onSearch(e.target.value)}
          placeholder="Search bodies…"
          style={{
            flex: 1,
            minWidth: 0,
            padding: "6px 8px",
            border: "1px solid var(--border)",
            borderRadius: 3,
            background: "var(--surf)",
            color: "var(--text)",
            fontSize: 12,
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        />
        <button
          onClick={() => onCreate()}
          disabled={isLocked}
          title="Create a new body"
          style={{
            padding: "6px 10px",
            border: "1px solid var(--border)",
            borderRadius: 3,
            background: "var(--accent-glow)",
            color: "var(--accent)",
            fontSize: 13,
            cursor: isLocked ? "default" : "pointer",
            flexShrink: 0,
          }}
        >+</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 4px 8px" }}>
        {bodies.length === 0 && (
          <div style={{ padding: 12, color: "var(--text-dim)", fontSize: 12, fontStyle: "italic" }}>
            No bodies yet.
          </div>
        )}
        {computableTop.length > 0 && (
          <>
            {sectionHeader("Computable")}
            {computableTop.map(b => renderNode(b, 0))}
          </>
        )}
        {narrativeTop.length > 0 && (
          <>
            {sectionHeader("Narrative")}
            {narrativeTop.map(b => renderNode(b, 0))}
          </>
        )}
      </div>
      <div style={{ padding: 8, borderTop: "1px solid var(--border)", color: "var(--text-dim)", fontSize: 11, textAlign: "center" }}>
        {isMultiSelect && selectedBodyIdSet
          ? `${selectedBodyIdSet.size} selected · ${bodies.length} ${bodies.length === 1 ? "body" : "bodies"}`
          : `${bodies.length} ${bodies.length === 1 ? "body" : "bodies"}`}
      </div>
    </div>
  );
}

function EphemerisPlaceholderPane({ title, body }) {
  return (
    <div style={{ color: "var(--text-dim)", maxWidth: 560 }}>
      <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: 22, margin: "0 0 12px 0", color: "var(--text)" }}>{title}</h3>
      <p style={{ lineHeight: 1.6 }}>{body}</p>
    </div>
  );
}