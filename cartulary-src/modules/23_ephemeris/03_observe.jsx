
// ─── Observe mode (r018 skeleton + r019 polish + r020 viewpoints/grid + r021 colors/trails) ─
//
// Top-down 2D SVG render of a body system at a given moment in time.
//
// r018: bodies as flat dots, drag-pan + ctrl-scroll zoom, click to focus.
// r019: orbital path traces, body labels, visual / actual size scaling,
//       kind-based colors, date stepper (1d / 1w / 1mo / 1y), inline
//       display toggles (Orbit paths / Labels / Size), currentMoment
//       null suggestion banner (session-dismissible).
// r020: saved viewpoints CRUD (capture date + zoom + pan + selection +
//       display toggles → restore with one click), AU grid overlay
//       (adaptive ring spacing).
// r021: kindColors override layer + bodyColorOverrides layer (custom
//       palette per kind / per body), trails (time-based, dashed for
//       moons), moon = dashed line styling extends to orbit paths for
//       consistency, auto-reset zoom/pan on root change (ref-skipped
//       when load was via viewpoint to preserve loaded zoom/pan).
//       elementColors layer cut from v1.5 — no spec, no use case.
//
// Sky-from-surface was cut from v1.5 per the half-feature framing in
// doctrine. viewMode field stays in state for forward-compat but the
// toggle UI never renders here.
//
// Position math reuses computeRootRelativePosition + computeOrbitalPosition
// from r011 directly. No new math infrastructure — Observe consumes what
// Compute already exposed top-level.

function ObserveModeContent({ state, updateState, bodies, selectedBodyId, onSelectBody, isLocked }) {
  // ── All hooks first (React hook-order invariant; conditional returns
  //    come after).

  const eph = state.ephemeris || makeDefaultEphemerisState();
  const observe = eph.observe || makeDefaultEphemerisState().observe;
  const zoom = Number.isFinite(observe.zoom) ? observe.zoom : 1;
  const panX = Number.isFinite(observe.panX) ? observe.panX : 0;
  const panY = Number.isFinite(observe.panY) ? observe.panY : 0;

  // r021: color override layers. kindColors maps kind id → custom hex
  // (user override of BODY_KIND_COLORS_DEFAULT). bodyColorOverrides maps
  // body id → custom hex (per-body override of the kind layer).
  // Resolution priority: bodyColorOverrides[id] → kindColors[kind] →
  // BODY_KIND_COLORS_DEFAULT[kind]. Each layer is sparse — missing keys
  // fall through.
  const kindColorsMap = (observe.kindColors && typeof observe.kindColors === "object") ? observe.kindColors : {};
  const bodyColorOverridesMap = (observe.bodyColorOverrides && typeof observe.bodyColorOverrides === "object") ? observe.bodyColorOverrides : {};
  const resolveBodyColor = (b) => {
    if (!b) return "#909090";
    const override = bodyColorOverridesMap[b.id];
    if (typeof override === "string" && override) return override;
    const kindOverride = kindColorsMap[b.kind];
    if (typeof kindOverride === "string" && kindOverride) return kindOverride;
    return observeColorForKind(b.kind);
  };

  // r021: trail window in days. Default 365; user-adjustable via input
  // next to the Trails toggle. Per-body cap = min(trailDays, period*0.95)
  // applied at render time so fast bodies never re-trace their orbit.
  const trailDays = Number.isFinite(observe.trailDays) && observe.trailDays > 0
    ? observe.trailDays
    : 365;

  // Lookup table: body id → body.
  const bodiesById = useMemo(() => {
    const m = {};
    (bodies || []).forEach(b => { if (b && b.id) m[b.id] = b; });
    return m;
  }, [bodies]);

  // Determine the focal body and walk up to its root ancestor. Falls back
  // to the first computable top-level body, then any top-level body.
  const rootBody = useMemo(() => {
    const start = selectedBodyId ? bodiesById[selectedBodyId] : null;
    if (start) {
      let b = start;
      let safety = 0;
      while (b && b.parentBodyId && bodiesById[b.parentBodyId] && safety < 100) {
        b = bodiesById[b.parentBodyId];
        safety++;
      }
      return b;
    }
    return (bodies || []).find(b => b && !b.parentBodyId && isComputableKind(b.kind))
        || (bodies || []).find(b => b && !b.parentBodyId)
        || null;
  }, [selectedBodyId, bodies, bodiesById]);

  // All descendants of root (root included), via parentBodyId scan. Skips
  // narrative-kind bodies — they don't have orbital positions so they
  // can't render meaningfully in this view. They still appear in the tree
  // for selection / editing.
  const systemBodies = useMemo(() => {
    if (!rootBody) return [];
    const out = [];
    const seenIds = new Set();
    const queue = [rootBody.id];
    while (queue.length) {
      const id = queue.shift();
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      const b = bodiesById[id];
      if (!b) continue;
      // Root always included regardless of computable status (so a
      // narrative root like a star-system can still render its
      // computable descendants).
      if (id === rootBody.id || isComputableKind(b.kind)) {
        out.push(b);
      }
      (bodies || []).forEach(child => {
        if (child && child.parentBodyId === id && !seenIds.has(child.id)) {
          queue.push(child.id);
        }
      });
    }
    return out;
  }, [rootBody, bodies, bodiesById]);

  // currentMoment → absoluteDay for default render time. Null moment
  // falls back to absoluteDay 0 (calendar epoch).
  const calendar = state?.world?.calendar;
  const currentMomentDay = useMemo(() => {
    const cm = state?.world?.currentMoment;
    if (!cm || cm.year == null || !calendar) return null;
    try {
      return calendarDateToAbsoluteDay(calendar, cm);
    } catch (e) {
      return null;
    }
  }, [state, calendar]);
  const displayDay = observe.date != null && Number.isFinite(observe.date)
    ? observe.date
    : (currentMomentDay != null ? currentMomentDay : 0);

  // Compute positions for every body in the system at displayDay. Root
  // sits at origin; descendants get computeRootRelativePosition. Track
  // bodies whose chain composition failed (e.g., a parent has no mass set)
  // so the renderer can surface them — they get drawn at root origin as
  // a fallback, but a silent teleport is confusing UX.
  const positionsResult = useMemo(() => {
    const out = new Map();
    const broken = [];
    if (!rootBody) return { positions: out, broken };
    out.set(rootBody.id, { x: 0, y: 0, z: 0 });
    systemBodies.forEach(b => {
      if (b.id === rootBody.id) return;
      try {
        const pos = computeRootRelativePosition(b, displayDay, bodiesById);
        if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
          out.set(b.id, pos);
        } else {
          out.set(b.id, { x: 0, y: 0, z: 0 });
          broken.push(b);
        }
      } catch (e) {
        out.set(b.id, { x: 0, y: 0, z: 0 });
        broken.push(b);
      }
    });
    return { positions: out, broken };
  }, [systemBodies, displayDay, bodiesById, rootBody]);
  const positions = positionsResult.positions;
  const brokenChainBodies = positionsResult.broken;
  const brokenChainIdSet = useMemo(() => new Set(brokenChainBodies.map(b => b.id)), [brokenChainBodies]);

  // r019: orbital path traces. For each body with a parent, sample one
  // full orbit (mean anomaly 0..2π) and capture the locus of positions.
  // Parent treated as fixed at its current position — standard textbook
  // convention; the moon-over-moving-planet epicycle is not what the
  // user expects to see in a system diagram.
  const ORBIT_SAMPLE_COUNT = 96;
  const orbitPaths = useMemo(() => {
    const out = new Map();
    if (!rootBody) return out;
    systemBodies.forEach(b => {
      if (b.id === rootBody.id) return;
      // r052: skip broken-chain bodies — banner warns about them, drawing
      // their orbit ring at origin is just clutter at the star.
      if (brokenChainIdSet.has(b.id)) return;
      const parent = b.parentBodyId ? bodiesById[b.parentBodyId] : null;
      if (!parent) return;
      const oe = b.orbitalElements;
      if (!oe || !Number.isFinite(oe.semiMajorAxis) || oe.semiMajorAxis <= 0) return;
      let parentPos = { x: 0, y: 0, z: 0 };
      try {
        const pp = computeRootRelativePosition(parent, displayDay, bodiesById);
        if (pp && Number.isFinite(pp.x) && Number.isFinite(pp.y)) parentPos = pp;
      } catch (e) { /* fall back to origin */ }
      const a     = oe.semiMajorAxis;
      const e     = Number.isFinite(oe.eccentricity)        ? oe.eccentricity        : 0;
      const inc   = Number.isFinite(oe.inclination)         ? oe.inclination         : 0;
      const Omega = Number.isFinite(oe.ascendingNode)       ? oe.ascendingNode       : 0;
      const omega = Number.isFinite(oe.argumentOfPeriapsis) ? oe.argumentOfPeriapsis : 0;
      const pts = [];
      for (let k = 0; k <= ORBIT_SAMPLE_COUNT; k++) {
        // computeOrbitalPosition takes ALL angles in degrees (not radians).
        // Sweep mean anomaly across the full orbit 0..360°.
        const M = (360 * k) / ORBIT_SAMPLE_COUNT;
        try {
          const rel = computeOrbitalPosition(a, e, M, omega, inc, Omega);
          if (rel && Number.isFinite(rel.x) && Number.isFinite(rel.y)) {
            pts.push({ x: parentPos.x + rel.x, y: parentPos.y + rel.y });
          }
        } catch (err) { /* skip bad sample */ }
      }
      if (pts.length > 2) out.set(b.id, pts);
    });
    return out;
  }, [systemBodies, displayDay, bodiesById, rootBody, brokenChainIdSet]);

  // r021: trail points per body. Trail = body's recent positions over the
  // last `trailDays` (capped at 95% of the body's orbital period so fast
  // bodies don't wrap and re-trace). Parent treated as fixed at its
  // current displayDay position — same convention as orbit paths so the
  // trail is a recent arc OF the orbit ellipse, not an inertial-frame
  // epicycle. Skipped for bodies with missing orbital elements or missing
  // parent mass.
  const TRAIL_SAMPLE_COUNT = 48;
  const trailPaths = useMemo(() => {
    const out = new Map();
    if (!rootBody) return out;
    systemBodies.forEach(b => {
      if (b.id === rootBody.id) return;
      // r052: skip broken-chain bodies (banner already surfaces them).
      if (brokenChainIdSet.has(b.id)) return;
      const parent = b.parentBodyId ? bodiesById[b.parentBodyId] : null;
      if (!parent) return;
      const oe = b.orbitalElements;
      if (!oe || !Number.isFinite(oe.semiMajorAxis) || oe.semiMajorAxis <= 0) return;
      const parentMass = parent.physicalParams && Number(parent.physicalParams.mass);
      if (!Number.isFinite(parentMass) || parentMass <= 0) return;
      // Period cap so fast bodies don't wrap their orbit.
      const T = computeOrbitalPeriodDays(oe.semiMajorAxis, parentMass);
      if (!Number.isFinite(T) || T <= 0) return;
      const effectiveWindow = Math.min(trailDays, T * 0.95);
      if (effectiveWindow <= 0) return;
      const pts = [];
      for (let k = 0; k <= TRAIL_SAMPLE_COUNT; k++) {
        // k=0 is the oldest sample (displayDay - window), k=N is current
        // (displayDay). Path renders from oldest → newest. r052: position
        // composed through the chain at EACH sample time, so trails follow
        // the parent's actual wake (a moon trails along its planet's path
        // through the system, not a static ellipse around the planet's now-
        // position). Equivalent cost — chain walk is O(depth) per sample,
        // depth is small for typical worldbuilding worlds.
        const t = displayDay - effectiveWindow * (1 - k / TRAIL_SAMPLE_COUNT);
        try {
          const pos = computeRootRelativePosition(b, t, bodiesById);
          if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
            pts.push({ x: pos.x, y: pos.y });
          }
        } catch (err) { /* skip bad sample */ }
      }
      if (pts.length > 2) out.set(b.id, pts);
    });
    return out;
  }, [systemBodies, displayDay, bodiesById, rootBody, trailDays, brokenChainIdSet]);

  // Session-dismissible banner for null currentMoment. Local state — comes
  // back on next mount if the user navigates away and back, matching the
  // doctrine note "session-local".
  const [momentBannerDismissed, setMomentBannerDismissed] = useState(false);

  // Auto-fit base scale: pick a scale that puts the farthest body at ~85%
  // of the viewport. zoom multiplies this for user adjustment.
  const VIEWPORT_SIZE = 700;
  const halfViewport = VIEWPORT_SIZE / 2;
  const maxDist = useMemo(() => {
    let m = 0.1; // never zero — prevents divide-by-zero on single-body system
    positions.forEach(p => {
      m = Math.max(m, Math.abs(p.x), Math.abs(p.y));
    });
    return m;
  }, [positions]);
  const baseScale = (halfViewport * 0.85) / maxDist;
  const effectiveScale = baseScale * zoom;

  const svgRef = useRef(null);

  // Wheel handler for ctrl+scroll zoom. Native listener via useEffect
  // because React's onWheel is passive (preventDefault is silently
  // blocked). Pattern matches Chronometric / Vertical Timeline per
  // doctrine entry "Sub-view zoom uses Ctrl+scroll with a native handler."
  // Deps include rootBody.id because the SVG element is render-gated on
  // having a root — without that dep, mount-time bind would capture
  // ref.current === null and never re-run.
  const wheelStateRef = useRef({});
  wheelStateRef.current = { zoom };
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      // r030 Finding F: zero-delta wheel events (touchpad gestures,
      // certain peripherals) would otherwise take the false branch of
      // the ternary below and zoom out unintentionally. Bail early.
      if (e.deltaY === 0) return;
      const s = wheelStateRef.current;
      // r029: zoom is view-state, allowed in locked mode.
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const newZoom = Math.max(0.1, Math.min(20, s.zoom * factor));
      updateState(prev => ({
        ...prev,
        ephemeris: {
          ...(prev.ephemeris || makeDefaultEphemerisState()),
          observe: {
            ...((prev.ephemeris && prev.ephemeris.observe) || {}),
            zoom: newZoom,
          },
        },
      }));
    };
    svg.addEventListener("wheel", handler, { passive: false });
    return () => svg.removeEventListener("wheel", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootBody && rootBody.id]);

  // r021: auto-reset zoom/pan when the root ancestor changes (e.g., user
  // selects a body in a different system via the tree). Date stays —
  // it's not tied to the root system. Skips on initial mount (no prior
  // root) and skips when a viewpoint load triggered the root change
  // (so the loaded zoom/pan survive).
  const prevRootIdRef = useRef(null);
  const skipResetOnRootChangeRef = useRef(false);
  useEffect(() => {
    const curId = rootBody && rootBody.id;
    const prev = prevRootIdRef.current;
    prevRootIdRef.current = curId;
    if (curId == null) return;
    if (prev == null || prev === curId) return; // first mount or no change
    if (skipResetOnRootChangeRef.current) {
      // Pending viewpoint load — skip the reset. Cleanup effect below
      // clears the ref unconditionally after this render cycle.
      return;
    }
    if (zoom !== 1 || panX !== 0 || panY !== 0) {
      writeObserve({ zoom: 1, panX: 0, panY: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootBody && rootBody.id]);

  // r030 Bug 4 fix: the skip-reset flag is set by loadSavedViewpoint
  // and consumed by the root-change effect above. But the root-change
  // effect only fires when rootBody.id actually changes. If a viewpoint
  // load doesn't change the root (e.g., targets a different body within
  // the same system, or the same selectedBodyId), the flag would persist
  // indefinitely — and the NEXT genuine root change would incorrectly
  // skip its reset. This cleanup effect runs on every render after the
  // root-change effect, ensuring the flag spans at most one render
  // cycle. Declaration order matters: this must come after the
  // root-change effect so the check happens first.
  useEffect(() => {
    skipResetOnRootChangeRef.current = false;
  });

  // Drag-to-pan. Document-level listeners during drag so the pan
  // continues even when the cursor leaves the SVG bounds. Pan writes
  // through to global state directly — for r018 simplicity. If perf
  // becomes a concern at high body counts, refactor to local state
  // during drag with commit-on-mouseup.
  const onPanStart = (e) => {
    // r029: pan is view-state, allowed in locked mode.
    if (e.button !== 0) return;
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startPanX = panX;
    const startPanY = panY;
    const onMove = (ev) => {
      const nextX = startPanX + (ev.clientX - startClientX);
      const nextY = startPanY + (ev.clientY - startClientY);
      updateState(prev => ({
        ...prev,
        ephemeris: {
          ...(prev.ephemeris || makeDefaultEphemerisState()),
          observe: {
            ...((prev.ephemeris && prev.ephemeris.observe) || {}),
            panX: nextX,
            panY: nextY,
          },
        },
      }));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // Zoom / reset controls.
  // r029: writeObserve gates view state (zoom, pan, displayToggles,
  // kindColors, bodyColorOverrides, trailDays, date, savedViewpoints).
  // None of these touch state.celestialBodies, so all are allowed in
  // locked mode.
  const writeObserve = (patch) => {
    updateState(prev => ({
      ...prev,
      ephemeris: {
        ...(prev.ephemeris || makeDefaultEphemerisState()),
        observe: {
          ...((prev.ephemeris && prev.ephemeris.observe) || {}),
          ...patch,
        },
      },
    }));
  };
  const zoomIn  = () => writeObserve({ zoom: Math.min(20, zoom * 1.25) });
  const zoomOut = () => writeObserve({ zoom: Math.max(0.1, zoom / 1.25) });
  const resetView = () => writeObserve({ zoom: 1, panX: 0, panY: 0 });

  // r021: kind-color override writers. Setting null deletes the override
  // so the resolver falls through to BODY_KIND_COLORS_DEFAULT.
  // r029: view-state writes, not lock-gated.
  const setKindColor = (kindId, hex) => {
    const next = { ...kindColorsMap };
    if (hex == null) delete next[kindId];
    else next[kindId] = hex;
    writeObserve({ kindColors: next });
  };
  const resetAllKindColors = () => {
    writeObserve({ kindColors: {} });
  };

  // r021: per-body color override is set from AsBoEditForm's Display
  // block via the App-level setBodyColorOverride (prop-drilled), not
  // from any control inside ObserveModeContent itself. The local writer
  // that previously lived here was dead code — removed in r030.

  // r021: trail-days writer. Clamp 1..1e6 — sane lower bound and
  // upper bound that prevents pathological per-frame sample counts.
  // r029: view-state write, not lock-gated.
  const setTrailDays = (n) => {
    const v = Math.max(1, Math.min(1000000, Math.round(Number(n) || 365)));
    writeObserve({ trailDays: v });
  };

  // r020: saved viewpoints CRUD. Captures the full observe view state so
  // a worldbuilder can pin "Sol at year 1000 zoomed into inner planets"
  // and snap back to it later. Snapshot covers date, zoom, pan,
  // selection, and all display toggles — load replaces all of them
  // atomically. Pattern mirrors Compute's savedQueries.
  const savedViewpoints = Array.isArray(observe.savedViewpoints) ? observe.savedViewpoints : [];
  const saveCurrentViewpoint = (name) => {
    // r029: viewpoints are view bookmarks, not body data. Allowed in locked mode.
    const trimmed = (name || "").trim();
    if (!trimmed) return;
    const snapshot = {
      date: observe.date ?? null,
      zoom, panX, panY,
      selectedBodyId: selectedBodyId ?? null,
      displayToggles: { ...(observe.displayToggles || {}) },
    };
    updateState(prev => {
      const cur = prev.ephemeris || makeDefaultEphemerisState();
      const curObserve = cur.observe || makeDefaultEphemerisState().observe;
      return {
        ...prev,
        ephemeris: {
          ...cur,
          observe: {
            ...curObserve,
            savedViewpoints: [...(curObserve.savedViewpoints || []), {
              id: `vp-${genId()}`,
              name: trimmed,
              snapshot,
            }],
          },
        },
      };
    });
  };
  const loadSavedViewpoint = (vpId) => {
    // r029: load is a view-state restore, allowed in locked mode.
    // r021: when loading a viewpoint may change the rootBody (different
    // selectedBodyId → different root), signal the auto-reset useEffect
    // to skip its reset so the loaded zoom/pan survive. Ref is one-shot.
    skipResetOnRootChangeRef.current = true;
    updateState(prev => {
      const cur = prev.ephemeris || makeDefaultEphemerisState();
      const curObserve = cur.observe || makeDefaultEphemerisState().observe;
      const found = (curObserve.savedViewpoints || []).find(v => v.id === vpId);
      if (!found || !found.snapshot) return prev;
      const snap = found.snapshot;
      return {
        ...prev,
        ephemeris: {
          ...cur,
          observe: {
            ...curObserve,
            date: snap.date ?? null,
            zoom: Number.isFinite(snap.zoom) ? snap.zoom : 1,
            panX: Number.isFinite(snap.panX) ? snap.panX : 0,
            panY: Number.isFinite(snap.panY) ? snap.panY : 0,
            selectedBodyId: snap.selectedBodyId ?? null,
            displayToggles: { ...(curObserve.displayToggles || {}), ...(snap.displayToggles || {}) },
          },
        },
      };
    });
  };
  const deleteSavedViewpoint = (vpId) => {
    // r029: viewpoint deletion removes a bookmark, not body data. Allowed in locked mode.
    updateState(prev => {
      const cur = prev.ephemeris || makeDefaultEphemerisState();
      const curObserve = cur.observe || makeDefaultEphemerisState().observe;
      return {
        ...prev,
        ephemeris: {
          ...cur,
          observe: {
            ...curObserve,
            savedViewpoints: (curObserve.savedViewpoints || []).filter(v => v.id !== vpId),
          },
        },
      };
    });
  };

  // r020: grid step in AU. Adaptive — picks a 10ⁿ interval that yields
  // a handful of rings within the auto-fit window. Re-derives whenever
  // maxDist changes (different system, different zoom-out extent).
  const gridStepAU = useMemo(() => {
    if (!Number.isFinite(maxDist) || maxDist <= 0) return 1;
    const order = Math.floor(Math.log10(maxDist));
    return Math.pow(10, order);
  }, [maxDist]);
  const gridRings = useMemo(() => {
    const out = [];
    if (!Number.isFinite(gridStepAU) || gridStepAU <= 0) return out;
    // Render rings up to 1.5× maxDist so panning a little past auto-fit
    // still has reference circles.
    const limit = maxDist * 1.5;
    for (let r = gridStepAU; r <= limit + 1e-9; r += gridStepAU) {
      out.push(r);
      if (out.length > 12) break; // sanity cap
    }
    return out;
  }, [gridStepAU, maxDist]);

  // r020: local UI state for the viewpoints widget. Collapsed by
  // default so it doesn't take chrome when unused.
  const [viewpointsOpen, setViewpointsOpen] = useState(false);
  const [newViewpointName, setNewViewpointName] = useState("");
  const handleSaveViewpoint = () => {
    const trimmed = newViewpointName.trim();
    if (!trimmed) return;
    saveCurrentViewpoint(trimmed);
    setNewViewpointName("");
  };

  // r021: local UI state for the kind-colors widget. Collapsed by default.
  const [kindColorsOpen, setKindColorsOpen] = useState(false);
  const customizedKindCount = Object.keys(kindColorsMap).filter(k => kindColorsMap[k]).length;

  // r019: date stepper. Writes through to observe.date (absoluteDay).
  // Null observe.date means "follow currentMoment"; once the user steps,
  // it pins to a concrete absoluteDay.
  // r029: date / step / now / displayToggles are view-state. Not lock-gated.
  const setDateAbsoluteDay = (newDay) => {
    writeObserve({ date: newDay });
  };
  const stepDate = (deltaDays) => {
    const cur = Number.isFinite(observe.date) ? observe.date : displayDay;
    setDateAbsoluteDay(cur + deltaDays);
  };
  const goToNow = () => {
    if (currentMomentDay == null) return;
    setDateAbsoluteDay(null);
  };
  const isFollowingMoment = observe.date == null;

  // Average days per primary-calendar month / year, for stepper labels.
  // Defensive — calendar may be missing on degenerate worlds.
  const daysPerYear = useMemo(() => {
    if (!calendar || !Array.isArray(calendar.months)) return 365;
    let sum = 0;
    calendar.months.forEach(m => { sum += Number(m && m.daysPerMonth) || 0; });
    return sum > 0 ? sum : 365;
  }, [calendar]);
  const daysPerMonth = useMemo(() => {
    if (!calendar || !Array.isArray(calendar.months) || calendar.months.length === 0) return 30;
    return Math.round(daysPerYear / calendar.months.length);
  }, [calendar, daysPerYear]);

  // Display-toggle writer. Toggles individual flags inside
  // observe.displayToggles. r019 surfaces orbitalPaths, bodyLabels,
  // sizeScaling. grid and trails are in state but no UI yet — those
  // arrive in r020 alongside saved viewpoints.
  const toggles = observe.displayToggles || makeDefaultEphemerisState().observe.displayToggles;
  const writeToggles = (patch) => {
    writeObserve({ displayToggles: { ...toggles, ...patch } });
  };

  // r019: per-body radius resolver. "visual" = flat r018 sizes;
  // "actual" = log-scaled physical radius (R⊕), falling back to flat
  // for bodies missing radius data.
  const getBodyRadius = (b, isRoot) => {
    const baseFlat = isRoot ? 5 : 3.5;
    if (toggles.sizeScaling !== "actual") return baseFlat;
    const r = b && b.physicalParams && Number(b.physicalParams.radius);
    if (!Number.isFinite(r) || r <= 0) return baseFlat;
    // 1 R⊕ → ~3.5 px, 10 R⊕ → ~5.5 px, 100 R⊕ → ~7.5 px. Log-bounded so
    // stars don't overwhelm planets at the same canvas zoom.
    return Math.max(2.5, 3 * (1 + Math.log10(1 + r)));
  };

  // ── Conditional returns after all hooks. ────────────────────────────────

  if (!bodies || bodies.length === 0) {
    return (
      <div style={{ color: "var(--text-dim)", maxWidth: 560 }}>
        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: 22, margin: "0 0 12px 0", color: "var(--text)" }}>Observe</h3>
        <p style={{ lineHeight: 1.6 }}>No bodies in this world yet. Create some in the Astronomical Body workspace, then come back here to see them at their positions.</p>
      </div>
    );
  }

  if (!rootBody) {
    return (
      <div style={{ color: "var(--text-dim)", maxWidth: 560 }}>
        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: 22, margin: "0 0 12px 0", color: "var(--text)" }}>Observe</h3>
        <p style={{ lineHeight: 1.6 }}>Select a body from the tree to view its system.</p>
      </div>
    );
  }

  // ── Render. ─────────────────────────────────────────────────────────────

  const SELECTED_HIGHLIGHT_RADIUS = 8;

  const halfViewboxRaw = halfViewport;
  // SVG renders bodies in a coordinate system centered at (0,0). We use
  // viewBox to handle the centered coordinate system and a transform on
  // the inner group for pan. Pan is in screen pixels; body positions are
  // pre-scaled to SVG units before transform is applied.

  // Date display formatting via formatCalendarDate, in the
  // primary calendar's frame.
  let displayDateStr = "";
  if (calendar) {
    try {
      const calDate = absoluteDayToCalendarDate(calendar, displayDay);
      if (calDate) displayDateStr = formatCalendarDate(calDate, calendar);
    } catch (e) { /* leave blank */ }
  }
  if (!displayDateStr) displayDateStr = `day ${displayDay}`;

  const stepperBtn = (label, deltaDays, title) => (
    <button
      onClick={() => stepDate(deltaDays)}
      title={title}
      style={{
        padding: "3px 8px",
        background: "var(--surf2)",
        border: "1px solid var(--border)",
        color: "var(--text)",
        borderRadius: 3,
        fontSize: 11,
        cursor: "pointer",
        fontFamily: "inherit",
        fontVariantNumeric: "tabular-nums",
      }}
    >{label}</button>
  );

  const toggleCheckbox = (label, checked, onChange, title) => (
    <label
      title={title || ""}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontSize: 12, color: "var(--text-dim)",
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ cursor: "pointer" }}
      />
      {label}
    </label>
  );

  const showMomentBanner = currentMomentDay == null && !momentBannerDismissed;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: VIEWPORT_SIZE + 32 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: 26, margin: 0 }}>
            {rootBody.name || "(unnamed system)"}
          </h2>
          <span style={{ color: "var(--text-dim)", fontSize: 13 }}>
            {systemBodies.length} {systemBodies.length === 1 ? "body" : "bodies"}
            {isFollowingMoment && currentMomentDay != null && " · following current moment"}
          </span>
        </div>
      </div>

      {brokenChainBodies.length > 0 && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 10,
          padding: "8px 12px",
          background: "var(--surf2)",
          border: "1px solid var(--border)",
          borderLeft: "3px solid var(--accent)",
          borderRadius: 3,
          fontSize: 12, lineHeight: 1.5, color: "var(--text-dim)",
        }}>
          <div style={{ flex: 1 }}>
            <strong style={{ color: "var(--text)" }}>
              {brokenChainBodies.length === 1 ? "1 body couldn't be positioned" : `${brokenChainBodies.length} bodies couldn't be positioned`}
            </strong>
            {" — left out of the diagram. Usually means a parent body in the chain has no mass set. Affected: "}
            <span style={{ color: "var(--text)" }}>
              {brokenChainBodies.map(b => b.name || "(unnamed)").join(", ")}
            </span>
            .
          </div>
        </div>
      )}

      {showMomentBanner && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 10,
          padding: "8px 12px",
          background: "var(--surf2)",
          border: "1px solid var(--border)",
          borderLeft: "3px solid var(--accent-dim)",
          borderRadius: 3,
          fontSize: 12, lineHeight: 1.5, color: "var(--text-dim)",
        }}>
          <div style={{ flex: 1 }}>
            <strong style={{ color: "var(--text)" }}>No current moment set.</strong>{" "}
            The view is anchored to calendar epoch. The Now button stays disabled until you set a current moment in World Settings.
          </div>
          <button
            onClick={() => setMomentBannerDismissed(true)}
            title="Dismiss for this session"
            style={{
              background: "transparent", border: "none", color: "var(--text-dim)",
              cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0,
              marginLeft: 6,
            }}
          >×</button>
        </div>
      )}

      {/* Date stepper. Discrete buttons over a dropdown — fewer state
          fields, more direct interaction. */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {stepperBtn("−1y",  -daysPerYear,  "Back one year")}
        {stepperBtn("−1mo", -daysPerMonth, "Back one month (~)")}
        {stepperBtn("−1w",  -7,            "Back one week")}
        {stepperBtn("−1d",  -1,            "Back one day")}
        <span style={{
          padding: "3px 10px",
          background: "var(--surf)",
          border: "1px solid var(--border)",
          borderRadius: 3,
          fontSize: 12, color: "var(--text)",
          fontVariantNumeric: "tabular-nums",
          minWidth: 130, textAlign: "center",
        }}>{displayDateStr}</span>
        {stepperBtn("+1d",  1,             "Forward one day")}
        {stepperBtn("+1w",  7,             "Forward one week")}
        {stepperBtn("+1mo", daysPerMonth,  "Forward one month (~)")}
        {stepperBtn("+1y",  daysPerYear,   "Forward one year")}
        <button
          onClick={goToNow}
          disabled={currentMomentDay == null}
          title={currentMomentDay == null ? "No current moment set in World Settings" : "Snap to current moment"}
          style={{
            marginLeft: 8,
            padding: "3px 10px",
            background: isFollowingMoment ? "var(--accent-glow)" : "var(--surf2)",
            border: `1px solid ${isFollowingMoment ? "var(--accent-dim)" : "var(--border)"}`,
            color: isFollowingMoment ? "var(--accent)" : "var(--text)",
            borderRadius: 3,
            fontSize: 11,
            cursor: currentMomentDay == null ? "default" : "pointer",
            fontFamily: "inherit",
            opacity: currentMomentDay == null ? 0.5 : 1,
          }}
        >Now</button>
      </div>

      {/* Viewpoints widget — collapsed by default. r020 saved viewpoints
          capture date + zoom + pan + selection + display toggles so a
          worldbuilder can pin and recall specific configurations. */}
      <div>
        <button
          onClick={() => setViewpointsOpen(!viewpointsOpen)}
          style={{
            padding: "3px 10px",
            border: "1px solid var(--border)",
            background: viewpointsOpen ? "rgba(200,169,110,0.18)" : "transparent",
            color: "var(--text)",
            fontSize: 11,
            fontFamily: "inherit",
            cursor: "pointer",
            borderRadius: 3,
          }}
          title="Saved viewpoints"
        >
          Viewpoints ({savedViewpoints.length}) {viewpointsOpen ? "▴" : "▾"}
        </button>
        {viewpointsOpen && (
          <div style={{ marginTop: 6, padding: 10, background: "var(--surf2)", border: "1px solid var(--border)", borderRadius: 3 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: savedViewpoints.length > 0 ? 10 : 0 }}>
              <input
                type="text"
                value={newViewpointName}
                onChange={e => setNewViewpointName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); handleSaveViewpoint(); } }}
                placeholder="Name for current view"
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
                onClick={handleSaveViewpoint}
                disabled={!newViewpointName.trim()}
                style={{
                  padding: "4px 12px",
                  border: "1px solid var(--border)",
                  background: newViewpointName.trim() ? "var(--accent)" : "transparent",
                  color: newViewpointName.trim() ? "var(--bg)" : "var(--text-dim)",
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: newViewpointName.trim() ? "pointer" : "not-allowed",
                  borderRadius: 3,
                }}
              >Save current</button>
            </div>
            {savedViewpoints.length === 0 ? (
              <div style={{ fontSize: 11, color: "var(--text-dim)", fontStyle: "italic", padding: 4 }}>
                No saved viewpoints yet. Configure the view (date, zoom, pan, display toggles), name it, and save.
              </div>
            ) : (
              <div style={{ maxHeight: 160, overflowY: "auto" }}>
                {savedViewpoints.map(vp => {
                  const snap = vp.snapshot || {};
                  const focalName = snap.selectedBodyId
                    ? (bodiesById[snap.selectedBodyId]?.name || "(missing body)")
                    : "(no focus)";
                  return (
                    <div key={vp.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{vp.name}</div>
                        <div style={{ fontSize: 10, color: "var(--text-dim)" }}>
                          {focalName} · {Number.isFinite(snap.zoom) ? snap.zoom.toFixed(2) : "1.00"}×
                          {snap.date != null ? " · pinned date" : " · following moment"}
                        </div>
                      </div>
                      <button
                        onClick={() => { loadSavedViewpoint(vp.id); setViewpointsOpen(false); }}
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
                        onClick={() => deleteSavedViewpoint(vp.id)}
                        title="Delete this viewpoint"
                        style={{
                          padding: "3px 6px",
                          border: "1px solid var(--border)",
                          background: "transparent",
                          color: "var(--text-dim)",
                          fontSize: 12,
                          cursor: "pointer",
                          fontFamily: "inherit",
                          borderRadius: 3,
                        }}
                      >×</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Display toggles. r019 surfaced orbital paths / labels / size
          scaling; r020 added grid; r021 adds trails (with days input). */}
      <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", padding: "2px 0" }}>
        {toggleCheckbox(
          "Orbital paths",
          !!toggles.orbitalPaths,
          (v) => writeToggles({ orbitalPaths: v }),
          "Show ellipse traces behind each body"
        )}
        {toggleCheckbox(
          "Body labels",
          !!toggles.bodyLabels,
          (v) => writeToggles({ bodyLabels: v }),
          "Show body name next to each marker"
        )}
        {toggleCheckbox(
          "Grid",
          !!toggles.grid,
          (v) => writeToggles({ grid: v }),
          "Show concentric AU rings centered on the root"
        )}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {toggleCheckbox(
            "Trails",
            !!toggles.trails,
            (v) => writeToggles({ trails: v }),
            "Show each body's recent positions over the trail window"
          )}
          {toggles.trails && (
            <>
              <input
                type="number"
                value={trailDays}
                onChange={(e) => setTrailDays(e.target.value)}
                min={1}
                step={1}
                title="Trail window in days (auto-capped at 95% of each body's orbital period)"
                style={{
                  width: 70,
                  padding: "2px 6px",
                  background: "var(--surf2)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  borderRadius: 3,
                  fontSize: 12,
                  fontFamily: "inherit",
                  fontVariantNumeric: "tabular-nums",
                }}
              />
              <span style={{ fontSize: 11, color: "var(--text-dim)" }}>days</span>
            </>
          )}
        </div>
        <label style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 12, color: "var(--text-dim)",
        }}>
          Size:
          <select
            value={toggles.sizeScaling || "visual"}
            onChange={(e) => writeToggles({ sizeScaling: e.target.value })}
            style={{
              padding: "2px 6px",
              background: "var(--surf2)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              borderRadius: 3,
              fontSize: 12,
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            <option value="visual">Visual (flat)</option>
            <option value="actual">Actual (log-scaled)</option>
          </select>
        </label>
      </div>

      {/* r021: kind colors override widget. Collapsed by default. Two
          columns (computable / narrative) with native color inputs +
          per-kind reset. Header has Reset all. */}
      <div>
        <button
          onClick={() => setKindColorsOpen(!kindColorsOpen)}
          style={{
            padding: "3px 10px",
            border: "1px solid var(--border)",
            background: kindColorsOpen ? "rgba(200,169,110,0.18)" : "transparent",
            color: "var(--text)",
            fontSize: 11,
            fontFamily: "inherit",
            cursor: "pointer",
            borderRadius: 3,
          }}
          title="Kind colors override defaults for the whole world"
        >
          Kind colors ({customizedKindCount} customized) {kindColorsOpen ? "▴" : "▾"}
        </button>
        {kindColorsOpen && (
          <div style={{ marginTop: 6, padding: 10, background: "var(--surf2)", border: "1px solid var(--border)", borderRadius: 3 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: "var(--text-dim)", fontStyle: "italic" }}>
                Per-body overrides (set in the body's Display block) win over kind colors.
              </span>
              <button
                onClick={resetAllKindColors}
                disabled={customizedKindCount === 0}
                style={{
                  padding: "3px 10px",
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: customizedKindCount === 0 ? "var(--text-dim)" : "var(--text)",
                  fontSize: 10,
                  cursor: customizedKindCount === 0 ? "default" : "pointer",
                  fontFamily: "inherit",
                  borderRadius: 3,
                  opacity: customizedKindCount === 0 ? 0.5 : 1,
                }}
              >Reset all</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 20px" }}>
              {[
                { heading: "Computable", kinds: BODY_KINDS },
                { heading: "Narrative", kinds: NARRATIVE_BODY_KINDS },
              ].map(group => (
                <div key={group.heading}>
                  <div style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: "var(--text-dim)", fontWeight: 600, marginBottom: 4, paddingBottom: 3, borderBottom: "1px solid var(--border)" }}>
                    {group.heading}
                  </div>
                  {group.kinds.map(k => {
                    const customized = !!kindColorsMap[k.id];
                    const effective = kindColorsMap[k.id] || observeColorForKind(k.id);
                    return (
                      <div key={k.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0" }}>
                        <span style={{ width: 16, color: "var(--text-dim)", fontSize: 11, flexShrink: 0 }}>{k.symbol}</span>
                        <span style={{ flex: 1, fontSize: 12, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k.label}</span>
                        <input
                          type="color"
                          value={effective}
                          onChange={(e) => setKindColor(k.id, e.target.value)}
                          title={`Color for ${k.label}`}
                          style={{
                            width: 28,
                            height: 20,
                            padding: 0,
                            border: "1px solid var(--border)",
                            background: "transparent",
                            cursor: "pointer",
                          }}
                        />
                        <button
                          onClick={() => setKindColor(k.id, null)}
                          disabled={!customized}
                          title={customized ? "Reset to default" : "(already default)"}
                          style={{
                            padding: "1px 6px",
                            border: "1px solid var(--border)",
                            background: "transparent",
                            color: customized ? "var(--text-dim)" : "var(--text-dim)",
                            fontSize: 10,
                            cursor: !customized ? "default" : "pointer",
                            fontFamily: "inherit",
                            borderRadius: 2,
                            opacity: customized ? 1 : 0.4,
                          }}
                        >reset</button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          position: "relative",
          width: VIEWPORT_SIZE,
          height: VIEWPORT_SIZE,
          background: "var(--surf2)",
          border: "1px solid var(--border)",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <svg
          ref={svgRef}
          width={VIEWPORT_SIZE}
          height={VIEWPORT_SIZE}
          viewBox={`${-halfViewboxRaw} ${-halfViewboxRaw} ${VIEWPORT_SIZE} ${VIEWPORT_SIZE}`}
          onMouseDown={onPanStart}
          style={{
            display: "block",
            cursor: "grab",
            userSelect: "none",
          }}
        >
          <g transform={`translate(${panX} ${panY})`}>
            {/* Origin crosshair — quiet marker so empty space still has
                a sense of center. */}
            <line x1={-12} y1={0} x2={12} y2={0} stroke="var(--border)" strokeWidth={1} />
            <line x1={0} y1={-12} x2={0} y2={12} stroke="var(--border)" strokeWidth={1} />

            {/* r020 grid rings — concentric circles centered on the
                root body's position, at adaptive AU intervals. Rendered
                BEFORE orbit paths and body markers so it sits behind. */}
            {toggles.grid && gridRings.map((rAU, idx) => (
              <g key={`grid-${idx}`} style={{ pointerEvents: "none" }}>
                <circle
                  cx={0} cy={0} r={rAU * effectiveScale}
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth={0.5}
                  opacity={0.6}
                  strokeDasharray="2 3"
                />
                <text
                  x={rAU * effectiveScale + 3}
                  y={-2}
                  fill="var(--text-dim)"
                  fontSize={9}
                  fontFamily="inherit"
                  opacity={0.7}
                >
                  {rAU < 1
                    ? `${rAU.toFixed(2)} AU`
                    : `${rAU} AU`}
                </text>
              </g>
            ))}

            {/* Orbit path traces. Rendered BEFORE the body circles so
                bodies sit on top of their paths. Stroke uses each body's
                resolved color (per-body override → kind override → kind
                default) at low opacity. Moon kind renders dashed to
                visually distinguish satellite orbits from primary orbits
                (consistent with trail styling). */}
            {toggles.orbitalPaths && systemBodies.map(b => {
              if (b.id === rootBody.id) return null;
              const pts = orbitPaths.get(b.id);
              if (!pts || pts.length < 2) return null;
              const color = resolveBodyColor(b);
              const isMoon = b.kind === "moon";
              const d = pts.map((p, idx) => (
                (idx === 0 ? "M " : "L ") +
                (p.x * effectiveScale).toFixed(2) + " " +
                (-p.y * effectiveScale).toFixed(2)
              )).join(" ");
              return (
                <path
                  key={`orbit-${b.id}`}
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth={1}
                  strokeDasharray={isMoon ? "3 3" : undefined}
                  opacity={0.35}
                  style={{ pointerEvents: "none" }}
                />
              );
            })}

            {/* r021: trail traces. Renders backward-in-time positions of
                each body over the trail window. Same color as orbit
                path, slightly higher opacity (0.5) so the trail reads
                as recent vs the always-on orbit reference. Moon
                kind dashes match. Rendered BEFORE bodies (after orbits)
                so bodies sit on top of both layers. */}
            {toggles.trails && systemBodies.map(b => {
              if (b.id === rootBody.id) return null;
              const pts = trailPaths.get(b.id);
              if (!pts || pts.length < 2) return null;
              const color = resolveBodyColor(b);
              const isMoon = b.kind === "moon";
              const d = pts.map((p, idx) => (
                (idx === 0 ? "M " : "L ") +
                (p.x * effectiveScale).toFixed(2) + " " +
                (-p.y * effectiveScale).toFixed(2)
              )).join(" ");
              return (
                <path
                  key={`trail-${b.id}`}
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.3}
                  strokeDasharray={isMoon ? "3 3" : undefined}
                  opacity={0.5}
                  style={{ pointerEvents: "none" }}
                />
              );
            })}

            {/* Body markers + selection rings + labels. */}
            {systemBodies.map(b => {
              // r052: skip broken-chain bodies entirely; banner warns about them.
              if (brokenChainIdSet.has(b.id)) return null;
              const p = positions.get(b.id) || { x: 0, y: 0, z: 0 };
              const sx = p.x * effectiveScale;
              const sy = -p.y * effectiveScale;
              const isRoot = b.id === rootBody.id;
              const isSelected = b.id === selectedBodyId;
              const radius = getBodyRadius(b, isRoot);
              const resolvedColor = resolveBodyColor(b);
              const fill = isSelected ? "var(--accent)" : resolvedColor;
              const isBlackHole = b.kind === "black-hole";
              return (
                <g key={b.id}>
                  {isSelected && (
                    <circle
                      cx={sx} cy={sy} r={Math.max(SELECTED_HIGHLIGHT_RADIUS, radius + 4)}
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth={1.5}
                      opacity={0.6}
                      style={{ pointerEvents: "none" }}
                    />
                  )}
                  <circle
                    cx={sx} cy={sy} r={radius}
                    fill={fill}
                    stroke={isBlackHole ? "var(--text)" : "var(--bg)"}
                    strokeWidth={isBlackHole ? 1 : 0.5}
                    style={{ cursor: "pointer" }}
                    onMouseDown={(e) => {
                      // Stop propagation so the body click doesn't also
                      // start a pan drag.
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectBody && onSelectBody(b.id);
                    }}
                  >
                    <title>{b.name || "(unnamed)"}</title>
                  </circle>
                  {toggles.bodyLabels && (
                    <text
                      x={sx + radius + 4}
                      y={sy + 3}
                      fill={isSelected ? "var(--accent)" : "var(--text-dim)"}
                      fontSize={10}
                      fontFamily="inherit"
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {b.name || "(unnamed)"}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Zoom controls — floating in the bottom-right corner. */}
        <div style={{ position: "absolute", bottom: 10, right: 10, display: "flex", gap: 4, alignItems: "center" }}>
          <span style={{ color: "var(--text-dim)", fontSize: 11, marginRight: 6, fontVariantNumeric: "tabular-nums" }}>
            {zoom.toFixed(2)}×
          </span>
          <button
            onClick={zoomOut}
            title="Zoom out"
            style={observeButtonStyle()}
          >−</button>
          <button
            onClick={zoomIn}
            title="Zoom in"
            style={observeButtonStyle()}
          >+</button>
          <button
            onClick={resetView}
            title="Reset view"
            style={{ ...observeButtonStyle(), width: "auto", padding: "0 10px", fontSize: 11 }}
          >Reset</button>
        </div>

        {/* Hint when there's nothing to render beyond the root. */}
        {systemBodies.length === 1 && (
          <div style={{ position: "absolute", top: 10, left: 10, color: "var(--text-dim)", fontSize: 11, fontStyle: "italic", maxWidth: 320, lineHeight: 1.5 }}>
            Only the root body — give it children with orbital elements (semi-major axis + parent mass) to see them at their positions.
          </div>
        )}
      </div>
    </div>
  );
}

function observeButtonStyle() {
  return {
    width: 26,
    height: 26,
    padding: 0,
    background: "var(--surf)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    borderRadius: 3,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "inherit",
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

// ─── Event mode (r022 foundation) ───────────────────────────────────────────
//
// Unified read-only browser across three event sources:
//   - Festival / Holiday entries (state.entries, "Festival / Holiday" template)
//   - Historical Event entries  (state.entries, "Historical Event"  template)
//   - Computed events from the latest Compute run
//     (state.ephemeris.compute.results)
//
// Surface: sortable table (date / name / type / source / bodies/refs),
// filter pill bar (source + alignment type when Computed is enabled),
// click-row drawer with details + "Open entry" jump for entries.
//
// r022 deferrals: promote-to-entry workflow for computed events ships
// in r023 (creates a Festival/Holiday entry with recurrence info in
// notes per the v1.5 scoping decision).
//
// Sort + filter + drawer state persists to state.ephemeris.event slice
// (locked at r002). Filters default to all sources visible.

function EventModeContent({ state, updateState, bodies, onOpenEntry, onPromoteEvent, isLocked }) {
  // ── Hooks first; conditional returns after. ────────────────────────────

  const eph = state.ephemeris || makeDefaultEphemerisState();
  const eventState = eph.event || makeDefaultEphemerisState().event;
  const filters = eventState.filters || {};
  const sort = eventState.sort || { column: "date", direction: "asc" };
  const drawer = eventState.drawer || { isOpen: false, eventId: null };

  // Source visibility filters. Default: all visible (undefined → true).
  const showFestival   = filters.showFestival   !== false;
  const showHistorical = filters.showHistorical !== false;
  const showComputed   = filters.showComputed   !== false;
  // Alignment type filter (computed only). Stored as an array on state;
  // r030 Bug 5 fix: the Set is constructed inside the visibleRows useMemo
  // body rather than here, because building it here would create a new
  // Set reference on every render and force the useMemo to recompute
  // even when nothing relevant changed. The pill-toggle UI below
  // accesses the array directly via `hiddenAlignmentTypesArr.includes(t.id)`.
  const hiddenAlignmentTypesArr = Array.isArray(filters.hiddenAlignmentTypes)
    ? filters.hiddenAlignmentTypes
    : [];

  // Calendar / entries / templates pulled from state.
  const calendar = state?.world?.calendar;
  const entries = Array.isArray(state?.entries) ? state.entries : [];
  const templates = Array.isArray(state?.templates) ? state.templates : [];

  // Lookup: template id → template, name → template (built-in only).
  const tplById = useMemo(() => {
    const m = {};
    templates.forEach(t => { if (t && t.id) m[t.id] = t; });
    return m;
  }, [templates]);
  const festivalTpl = useMemo(
    () => templates.find(t => t && t.name === "Festival / Holiday" && t.origin === "builtin"),
    [templates]
  );
  const historicalTpl = useMemo(
    () => templates.find(t => t && t.name === "Historical Event" && t.origin === "builtin"),
    [templates]
  );

  // Body id → body for resolving computed-event body refs.
  const bodiesById = useMemo(() => {
    const m = {};
    (bodies || []).forEach(b => { if (b && b.id) m[b.id] = b; });
    return m;
  }, [bodies]);

  // Helper: find the calendar-date field on a template (first one wins).
  // Returns its field id or null if none.
  const findCalendarDateFieldId = (template) => {
    if (!template || !Array.isArray(template.fields)) return null;
    const found = template.fields.find(f => f && f.type === "calendar-date");
    return found ? (found.id || found.fieldId || null) : null;
  };
  // Helper: find Type field id (for entry rows' type column).
  const findFieldIdByLabel = (template, label) => {
    if (!template || !Array.isArray(template.fields)) return null;
    const found = template.fields.find(f => f && f.label === label);
    return found ? (found.id || found.fieldId || null) : null;
  };
  // Helper: normalize a select-field value to a display string. Select
  // fields with otherTextField store as {value, customText} when "Other"
  // is chosen — reveal the customText in that case. Local copy of the
  // helper that lives inside the entry-card component; if either drifts,
  // update both. Kept inline to avoid hoisting a shared helper just for
  // this one Ephemeris consumer.
  const formatSelectValue = (v) => {
    if (!v) return null;
    if (typeof v === "string") return v;
    if (typeof v === "object") {
      const base = v.value || "";
      if (base === "Other" && v.customText) return v.customText;
      return base || null;
    }
    return String(v);
  };

  // Project a calendar-date value (in entry's bound calendar) to absoluteDay
  // (primary calendar coords). Defensive — returns null on bad input.
  const projectEntryDateToAbsoluteDay = (dateVal, entry) => {
    if (!dateVal || dateVal.year == null) return null;
    const entryCal = getCalendar(state, entry && entry.calendarId);
    if (!entryCal) return null;
    try {
      return calendarDateToAbsoluteDay(entryCal, dateVal);
    } catch (e) {
      return null;
    }
  };

  // Compute mode results (latest Compute run). Each item has shape
  // { absoluteDay, alignmentType, ..metric.., bodyIds }. Source = "computed".
  // r023: each result row is stamped with its alignmentType at run time,
  // so a user changing the alignment type in the query form without
  // re-running no longer mislabels stale results. Fallback to
  // currentQuery.alignmentType preserves behavior for any results that
  // pre-date this fix (session-only since results aren't persisted).
  const computeResults = useMemo(() => {
    const r = eph.compute && Array.isArray(eph.compute.results) ? eph.compute.results : [];
    const fallbackType = eph.compute?.currentQuery?.alignmentType || "phase";
    return r.map((res, idx) => {
      const at = res.alignmentType || fallbackType;
      const meta = ALIGNMENT_TYPES.find(t => t.id === at);
      return {
        key: `computed-${at}-${res.absoluteDay}-${(res.bodyIds || []).join(",")}-${idx}`,
        absoluteDay: res.absoluteDay,
        source: "computed",
        alignmentType: at,
        name: `${meta?.label || at} alignment`,
        typeLabel: meta?.label || at,
        bodies: (res.bodyIds || []).map(id => bodiesById[id]).filter(Boolean),
        raw: res,
      };
    });
  }, [eph.compute, bodiesById]);

  // Festival / Holiday entries with a Calendar Date value, projected.
  const festivalRows = useMemo(() => {
    if (!festivalTpl) return [];
    const dateFid = findCalendarDateFieldId(festivalTpl);
    const typeFid = findFieldIdByLabel(festivalTpl, "Type");
    if (!dateFid) return [];
    return entries
      .filter(e => e && e.templateId === festivalTpl.id)
      .map(e => {
        const dateVal = e.fields?.[dateFid];
        const abs = projectEntryDateToAbsoluteDay(dateVal, e);
        if (abs == null) return null;
        const typeVal = e.fields?.[typeFid];
        const typeLabel = typeFid ? formatSelectValue(typeVal) : "";
        return {
          key: `festival-${e.id}`,
          absoluteDay: abs,
          source: "festival",
          name: e.name || "(unnamed)",
          typeLabel: typeLabel || "Festival",
          entryId: e.id,
          bodies: [],
          raw: e,
        };
      })
      .filter(Boolean);
  }, [festivalTpl, entries, calendar, state?.calendars]);

  // Historical Event entries with a Calendar Date value, projected.
  const historicalRows = useMemo(() => {
    if (!historicalTpl) return [];
    const dateFid = findCalendarDateFieldId(historicalTpl);
    const typeFid = findFieldIdByLabel(historicalTpl, "Type");
    // r028: Duration is a calendar-date-range field on Historical Event.
    // When the entry has no point Calendar Date, fall back to Duration.start
    // so span-only entries still appear in Event mode. Duration is captured
    // on the row regardless of which date drove the row position so the
    // drawer can display the full span.
    const durationFid = (historicalTpl.fields || [])
      .find(f => f && f.type === "calendar-date-range")
      ?.id || null;
    if (!dateFid && !durationFid) return [];
    return entries
      .filter(e => e && e.templateId === historicalTpl.id)
      .map(e => {
        const dateVal = dateFid ? e.fields?.[dateFid] : null;
        const durationVal = durationFid ? e.fields?.[durationFid] : null;
        // Resolve the row's date: prefer point Calendar Date; fall back to
        // Duration.start. If both empty → exclude.
        let abs = projectEntryDateToAbsoluteDay(dateVal, e);
        let dateFromDuration = false;
        if (abs == null && durationVal && durationVal.start) {
          abs = projectEntryDateToAbsoluteDay(durationVal.start, e);
          dateFromDuration = true;
        }
        if (abs == null) return null;
        const typeVal = e.fields?.[typeFid];
        const typeLabel = typeFid ? formatSelectValue(typeVal) : "";
        return {
          key: `historical-${e.id}`,
          absoluteDay: abs,
          source: "historical",
          name: e.name || "(unnamed)",
          typeLabel: typeLabel || "Historical",
          entryId: e.id,
          bodies: [],
          duration: durationVal || null,
          dateFromDuration,
          raw: e,
        };
      })
      .filter(Boolean);
  }, [historicalTpl, entries, calendar, state?.calendars]);

  // Unified, filtered, sorted row list.
  const visibleRows = useMemo(() => {
    // r030 Bug 5 fix: Set construction lives inside the memo body so a
    // new array reference (with same content) doesn't bust this useMemo
    // every render. Dep below depends on the array itself, not a Set.
    const hiddenAlignment = new Set(hiddenAlignmentTypesArr);
    const all = [];
    if (showFestival)   festivalRows.forEach(r => all.push(r));
    if (showHistorical) historicalRows.forEach(r => all.push(r));
    if (showComputed) {
      computeResults.forEach(r => {
        if (!hiddenAlignment.has(r.alignmentType)) all.push(r);
      });
    }
    const col = sort.column || "date";
    const dir = sort.direction === "desc" ? -1 : 1;
    all.sort((a, b) => {
      if (col === "date") {
        return ((a.absoluteDay ?? 0) - (b.absoluteDay ?? 0)) * dir;
      }
      if (col === "name") {
        return (a.name || "").localeCompare(b.name || "") * dir;
      }
      if (col === "type") {
        return (a.typeLabel || "").localeCompare(b.typeLabel || "") * dir;
      }
      if (col === "source") {
        return (a.source || "").localeCompare(b.source || "") * dir;
      }
      return 0;
    });
    return all;
  }, [festivalRows, historicalRows, computeResults, showFestival, showHistorical, showComputed, hiddenAlignmentTypesArr, sort.column, sort.direction]);

  // Selected drawer row.
  const drawerRow = useMemo(() => {
    if (!drawer.isOpen || !drawer.eventId) return null;
    return visibleRows.find(r => r.key === drawer.eventId)
        || festivalRows.find(r => r.key === drawer.eventId)
        || historicalRows.find(r => r.key === drawer.eventId)
        || computeResults.find(r => r.key === drawer.eventId)
        || null;
  }, [drawer.isOpen, drawer.eventId, visibleRows, festivalRows, historicalRows, computeResults]);

  // ── State writers. ─────────────────────────────────────────────────────

  // r029: writeEvent gates filters / sort / drawer state — pure view-state.
  // None of these touch body or entry data. Allowed in locked mode.
  const writeEvent = (patch) => {
    updateState(prev => ({
      ...prev,
      ephemeris: {
        ...(prev.ephemeris || makeDefaultEphemerisState()),
        event: {
          ...((prev.ephemeris && prev.ephemeris.event) || makeDefaultEphemerisState().event),
          ...patch,
        },
      },
    }));
  };
  const toggleFilter = (key) => {
    // Source filters are tristate-by-default: stored boolean (true/false),
    // undefined = true. Toggle inverts.
    const cur = filters[key] !== false;
    writeEvent({ filters: { ...filters, [key]: !cur } });
  };
  const toggleAlignmentTypeHidden = (typeId) => {
    const cur = new Set(hiddenAlignmentTypesArr);
    if (cur.has(typeId)) cur.delete(typeId);
    else cur.add(typeId);
    writeEvent({ filters: { ...filters, hiddenAlignmentTypes: Array.from(cur) } });
  };
  const setSort = (column) => {
    // Click same column → flip direction; new column → asc default.
    const nextDir = sort.column === column
      ? (sort.direction === "asc" ? "desc" : "asc")
      : "asc";
    writeEvent({ sort: { column, direction: nextDir } });
  };
  const openDrawer = (eventKey) => {
    writeEvent({ drawer: { isOpen: true, eventId: eventKey } });
  };
  const closeDrawer = () => {
    writeEvent({ drawer: { isOpen: false, eventId: null } });
  };

  // Date formatter (primary calendar, via formatCalendarDate).
  const formatAbsDay = (abs) => {
    if (abs == null || !Number.isFinite(abs)) return "";
    if (!calendar) return `day ${abs}`;
    try {
      const cd = absoluteDayToCalendarDate(calendar, abs);
      if (!cd) return `day ${abs}`;
      return formatCalendarDate(cd, calendar) || `day ${abs}`;
    } catch (e) {
      return `day ${abs}`;
    }
  };

  // r028: format a calendar-date-range value for the drawer. Renders the
  // entry's bound calendar (matches the projection used to position the
  // row). Handles open-ended ranges:
  //   - both filled  → "YYYY MMM DD – YYYY MMM DD"
  //   - start only   → "since YYYY MMM DD"
  //   - end only     → "until YYYY MMM DD"
  //   - both empty   → null (caller suppresses the row)
  const formatDuration = (durationVal, entry) => {
    if (!durationVal) return null;
    const startFilled = durationVal.start && durationVal.start.year != null;
    const endFilled   = durationVal.end   && durationVal.end.year   != null;
    if (!startFilled && !endFilled) return null;
    const entryCal = getCalendar(state, entry && entry.calendarId);
    const fmt = (d) => formatCalendarDate(d, entryCal) || "";
    if (startFilled && endFilled) return `${fmt(durationVal.start)} – ${fmt(durationVal.end)}`;
    if (startFilled)              return `since ${fmt(durationVal.start)}`;
    return `until ${fmt(durationVal.end)}`;
  };

  // ── Render. ────────────────────────────────────────────────────────────

  const counts = {
    festival: festivalRows.length,
    historical: historicalRows.length,
    computed: computeResults.length,
  };

  const sortIndicator = (column) => {
    if (sort.column !== column) return "";
    return sort.direction === "asc" ? " ▲" : " ▼";
  };

  const sourceBadge = (source) => {
    const style = {
      padding: "1px 6px",
      borderRadius: 10,
      fontSize: 10,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    };
    if (source === "festival") return <span style={{ ...style, background: "rgba(200,158,200,0.18)", color: "#c89ec8" }}>Festival</span>;
    if (source === "historical") return <span style={{ ...style, background: "rgba(158,200,110,0.18)", color: "#9ec86e" }}>Historical</span>;
    if (source === "computed") return <span style={{ ...style, background: "var(--accent-glow)", color: "var(--accent)" }}>Computed</span>;
    return <span style={style}>{source}</span>;
  };

  const filterPill = (label, active, onClick, count) => (
    <button
      onClick={onClick}
      style={{
        padding: "3px 10px",
        background: active ? "var(--accent-glow)" : "transparent",
        border: `1px solid ${active ? "var(--accent-dim)" : "var(--border)"}`,
        color: active ? "var(--accent)" : "var(--text-dim)",
        borderRadius: 12,
        fontSize: 11,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {label}{count != null ? ` (${count})` : ""}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 1100 }}>
      <div>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: 26, margin: 0 }}>
          Events
        </h2>
        <div style={{ color: "var(--text-dim)", fontSize: 13, marginTop: 2 }}>
          {visibleRows.length} of {counts.festival + counts.historical + counts.computed} visible
        </div>
      </div>

      {/* Filter pill bar. Source toggles, plus per-alignment-type
          toggles when Computed is enabled. */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 11, color: "var(--text-dim)", marginRight: 4 }}>Sources:</span>
        {filterPill("Festival", showFestival, () => toggleFilter("showFestival"), counts.festival)}
        {filterPill("Historical", showHistorical, () => toggleFilter("showHistorical"), counts.historical)}
        {filterPill("Computed", showComputed, () => toggleFilter("showComputed"), counts.computed)}
        {showComputed && counts.computed > 0 && (
          <>
            <span style={{ width: 1, height: 20, background: "var(--border)", margin: "0 6px" }} />
            <span style={{ fontSize: 11, color: "var(--text-dim)", marginRight: 4 }}>Alignment:</span>
            {ALIGNMENT_TYPES.map(t => filterPill(
              t.label,
              !hiddenAlignmentTypesArr.includes(t.id),
              () => toggleAlignmentTypeHidden(t.id)
            ))}
          </>
        )}
      </div>

      {/* Hint banner when no source data exists at all. */}
      {counts.festival + counts.historical + counts.computed === 0 && (
        <div style={{
          padding: "10px 14px",
          background: "var(--surf2)",
          border: "1px solid var(--border)",
          borderRadius: 4,
          color: "var(--text-dim)",
          fontSize: 12, lineHeight: 1.6,
        }}>
          No events to show. Create <strong>Festival / Holiday</strong> or <strong>Historical Event</strong> entries with a calendar date, or run a query in <strong>Compute</strong> to surface computed alignments here.
        </div>
      )}

      {/* Table + drawer side-by-side when drawer is open, otherwise
          full-width table. */}
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            border: "1px solid var(--border)",
            borderRadius: 4,
            overflow: "hidden",
            background: "var(--surf)",
          }}>
            {/* Header row */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "150px 1fr 140px 100px 1fr",
              fontSize: 11,
              color: "var(--text-dim)",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              borderBottom: "1px solid var(--border)",
              background: "var(--surf2)",
            }}>
              {[
                { id: "date",   label: "Date" },
                { id: "name",   label: "Name" },
                { id: "type",   label: "Type" },
                { id: "source", label: "Source" },
                { id: "bodies", label: "Bodies / refs", sortable: false },
              ].map(col => (
                <div
                  key={col.id}
                  onClick={() => col.sortable === false ? null : setSort(col.id)}
                  style={{
                    padding: "6px 10px",
                    cursor: col.sortable === false ? "default" : "pointer",
                    userSelect: "none",
                  }}
                >
                  {col.label}{col.sortable === false ? "" : sortIndicator(col.id)}
                </div>
              ))}
            </div>
            {/* Body rows */}
            <div style={{ maxHeight: 560, overflowY: "auto" }}>
              {visibleRows.length === 0 ? (
                <div style={{ padding: 16, color: "var(--text-dim)", fontSize: 12, fontStyle: "italic", textAlign: "center" }}>
                  No matching events. Adjust the filters above.
                </div>
              ) : visibleRows.map(row => {
                const isSelected = drawer.isOpen && drawer.eventId === row.key;
                return (
                  <div
                    key={row.key}
                    onClick={() => openDrawer(row.key)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "150px 1fr 140px 100px 1fr",
                      fontSize: 12,
                      borderBottom: "1px solid var(--border)",
                      background: isSelected ? "var(--accent-glow)" : "transparent",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ padding: "6px 10px", color: "var(--text)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {formatAbsDay(row.absoluteDay)}
                    </div>
                    <div style={{ padding: "6px 10px", color: isSelected ? "var(--accent)" : "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {row.name}
                    </div>
                    <div style={{ padding: "6px 10px", color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {row.typeLabel}
                    </div>
                    <div style={{ padding: "6px 10px" }}>
                      {sourceBadge(row.source)}
                    </div>
                    <div style={{ padding: "6px 10px", color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {row.bodies && row.bodies.length > 0
                        ? row.bodies.map(b => b.name || "(unnamed)").join(", ")
                        : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Detail drawer. Shows when a row is selected. */}
        {drawer.isOpen && drawerRow && (
          <div style={{
            width: 320,
            flexShrink: 0,
            padding: 14,
            background: "var(--surf)",
            border: "1px solid var(--border)",
            borderRadius: 4,
            alignSelf: "flex-start",
          }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: 18, margin: 0, color: "var(--text)" }}>
                {drawerRow.name}
              </h3>
              <button
                onClick={closeDrawer}
                title="Close"
                style={{ background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: 16, padding: 0 }}
              >×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12, color: "var(--text)" }}>
              <div>
                <div style={{ color: "var(--text-dim)", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Date</div>
                <div style={{ fontVariantNumeric: "tabular-nums" }}>{formatAbsDay(drawerRow.absoluteDay)}</div>
              </div>
              {drawerRow.source === "historical" && (() => {
                // r028: surface Duration on Historical Event entries when it's
                // filled. The Date row above shows the row's positioning date
                // (Calendar Date if present, else Duration.start as fallback).
                // The Duration row below shows the full span — independent of
                // which end drove the row date. Suppressed when Duration is
                // empty or missing entirely.
                const durStr = formatDuration(drawerRow.duration, drawerRow.raw);
                if (!durStr) return null;
                return (
                  <div>
                    <div style={{ color: "var(--text-dim)", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Duration</div>
                    <div style={{ fontVariantNumeric: "tabular-nums" }}>{durStr}</div>
                    {drawerRow.dateFromDuration && (
                      <div style={{ color: "var(--text-dim)", fontSize: 10, fontStyle: "italic", marginTop: 2 }}>
                        Date column uses span start (no point date set)
                      </div>
                    )}
                  </div>
                );
              })()}
              <div>
                <div style={{ color: "var(--text-dim)", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Type</div>
                <div>{drawerRow.typeLabel || "—"}</div>
              </div>
              <div>
                <div style={{ color: "var(--text-dim)", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Source</div>
                <div>{sourceBadge(drawerRow.source)}</div>
              </div>
              {drawerRow.bodies && drawerRow.bodies.length > 0 && (
                <div>
                  <div style={{ color: "var(--text-dim)", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Bodies</div>
                  <div>{drawerRow.bodies.map(b => b.name || "(unnamed)").join(", ")}</div>
                </div>
              )}
              {drawerRow.source === "computed" && drawerRow.raw && (
                <div>
                  <div style={{ color: "var(--text-dim)", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Metric</div>
                  <div style={{ fontVariantNumeric: "tabular-nums", fontSize: 11 }}>
                    {drawerRow.alignmentType === "phase"       && `Spread: ${(drawerRow.raw.spreadDegrees ?? 0).toFixed(2)}°`}
                    {drawerRow.alignmentType === "conjunction" && `Separation: ${(drawerRow.raw.separationDegrees ?? 0).toFixed(2)}°`}
                    {drawerRow.alignmentType === "eclipse"     && `Magnitude: ${(drawerRow.raw.magnitude ?? 0).toFixed(3)}`}
                    {drawerRow.alignmentType === "nodal"       && `Max node dist: ${(drawerRow.raw.maxNodeDistanceDegrees ?? 0).toFixed(2)}°`}
                  </div>
                </div>
              )}
            </div>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
              {(drawerRow.source === "festival" || drawerRow.source === "historical") && drawerRow.entryId && onOpenEntry && (
                <button
                  onClick={() => onOpenEntry(drawerRow.entryId)}
                  style={{
                    padding: "6px 12px",
                    background: "var(--accent)",
                    color: "var(--bg)",
                    border: "none",
                    borderRadius: 3,
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    cursor: "pointer",
                  }}
                >Open entry</button>
              )}
              {drawerRow.source === "computed" && (
                <button
                  onClick={() => {
                    if (!onPromoteEvent) return;
                    closeDrawer();
                    onPromoteEvent(drawerRow);
                  }}
                  disabled={isLocked || !onPromoteEvent}
                  title="Create a Festival / Holiday entry pre-filled with this event's date and details"
                  style={{
                    padding: "6px 12px",
                    background: "var(--accent)",
                    color: "var(--bg)",
                    border: "none",
                    borderRadius: 3,
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    cursor: (isLocked || !onPromoteEvent) ? "default" : "pointer",
                    opacity: (isLocked || !onPromoteEvent) ? 0.5 : 1,
                  }}
                >Promote to Festival / Holiday entry</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}