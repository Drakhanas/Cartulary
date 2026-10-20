
// ─── Forced Alignment workspace (v1.5 r045) ─────────────────────────────────
//
// Inverse of Compute: pick bodies + target date + alignment type + optional
// recurrence; the workspace shows what edits force that alignment and (on
// confirm) writes them. Math is M₀-only for one-shot, M₀ + sma rewrite for
// recurring. See computeForceAlignPreview for the per-body math.

function ForceAlignModeContent({ state, updateState, bodies, isLocked }) {
  const eph = state.ephemeris || makeDefaultEphemerisState();
  const fa = eph.forceAlign || makeDefaultEphemerisState().forceAlign;
  const primaryCalendar = state.world?.calendar;
  const calendars = Array.isArray(state.calendars) ? state.calendars : [];
  const selectedCalendar = fa.targetCalendarId
    ? (calendars.find(c => c && c.id === fa.targetCalendarId) || primaryCalendar)
    : primaryCalendar;

  const bodiesById = useMemo(() => {
    const m = {};
    bodies.forEach(b => { if (b && b.id) m[b.id] = b; });
    return m;
  }, [bodies]);

  const updateForceAlign = (patch) => {
    updateState(s => {
      const cur = s.ephemeris || makeDefaultEphemerisState();
      return {
        ...s,
        ephemeris: {
          ...cur,
          forceAlign: { ...(cur.forceAlign || makeDefaultEphemerisState().forceAlign), ...patch },
        },
      };
    });
  };

  // Target day in absoluteDay terms (the primary-calendar frame all math
  // runs in). If the user picked a date in an additional calendar, the
  // helper handles the anchor conversion. Null when no date picked.
  const targetDayAbs = useMemo(() => {
    if (!fa.targetDate || !selectedCalendar) return null;
    const ab = calendarDateToAbsoluteDay(selectedCalendar, fa.targetDate);
    return Number.isFinite(ab) ? ab : null;
  }, [fa.targetDate, selectedCalendar]);

  // Live preview — recomputes on any input change. No "Compute changes"
  // button; the user sees consequences as they tweak.
  const preview = useMemo(() => {
    if (!fa.bodyIds || fa.bodyIds.length === 0) return { eligible: [], ineligible: [], warnings: [] };
    if (!Number.isFinite(targetDayAbs)) return { eligible: [], ineligible: [], warnings: [] };
    const recur = Number.isFinite(fa.recurInterval) && fa.recurInterval > 0 ? fa.recurInterval : null;
    return computeForceAlignPreview(fa.bodyIds, bodies, bodiesById, fa.alignmentType || "phase", targetDayAbs, recur, Number.isFinite(fa.phaseReferenceFraction) ? fa.phaseReferenceFraction : 0);
  }, [fa.bodyIds, bodies, bodiesById, fa.alignmentType, targetDayAbs, fa.recurInterval, fa.phaseReferenceFraction]);

  const canApply = !isLocked && preview.eligible.length > 0 && Number.isFinite(targetDayAbs);

  const applyForceAlign = () => {
    if (!canApply) return;
    const recur = Number.isFinite(fa.recurInterval) && fa.recurInterval > 0 ? fa.recurInterval : null;
    const isEclipse = (fa.alignmentType || "phase") === "eclipse";
    const fieldsList = isEclipse
      ? (recur ? "semi-major axis, ascending node, and mean-anomaly-at-epoch" : "ascending node and mean-anomaly-at-epoch")
      : (recur ? "semi-major axis and mean-anomaly-at-epoch" : "mean-anomaly-at-epoch");
    const recurClause = recur ? ` to recur every ${recur} days` : "";
    const msg = `Apply forced alignment? This will rewrite ${fieldsList} on ${preview.eligible.length} ${preview.eligible.length === 1 ? "body" : "bodies"}${recurClause}. Current orbital values for these fields will be overwritten.`;
    if (!window.confirm(msg)) return;

    const norm = (a) => ((a % 360) + 360) % 360;
    const editMap = new Map();
    preview.eligible.forEach(row => editMap.set(row.id, row));

    // r051: snapshot per-field before/after for revert. Only the fields the
    // apply will actually touch get captured, so a later revert won't blast
    // unrelated manual edits the user might have made in between.
    const snapshots = preview.eligible.map(row => {
      const before = { meanAnomalyAtEpoch: row.currentM0 };
      const after  = { meanAnomalyAtEpoch: norm(row.newM0) };
      if (recur) {
        before.semiMajorAxis = row.currentSma;
        after.semiMajorAxis  = row.newSma;
      }
      if (row.omegaRewritten) {
        before.ascendingNode = row.currentOmega;
        after.ascendingNode  = norm(row.newOmega);
      }
      return { id: row.id, name: row.name, before, after };
    });
    const lastApplyRecord = {
      timestamp: Date.now(),
      alignmentType: fa.alignmentType || "phase",
      targetDate: fa.targetDate ? { ...fa.targetDate } : null,
      targetCalendarId: fa.targetCalendarId || null,
      targetDayAbs,
      recurInterval: recur,
      phaseReferenceFraction: Number.isFinite(fa.phaseReferenceFraction) ? fa.phaseReferenceFraction : 0,
      snapshots,
    };

    updateState(s => {
      const newBodies = (s.celestialBodies || []).map(b => {
        if (!b || !editMap.has(b.id)) return b;
        const row = editMap.get(b.id);
        const oe = { ...(b.orbitalElements || {}) };
        oe.meanAnomalyAtEpoch = norm(row.newM0);
        if (recur) oe.semiMajorAxis = row.newSma;
        if (row.omegaRewritten) oe.ascendingNode = norm(row.newOmega);
        return { ...b, orbitalElements: oe };
      });
      const cur = s.ephemeris || makeDefaultEphemerisState();
      const curFa = cur.forceAlign || makeDefaultEphemerisState().forceAlign;
      return {
        ...s,
        celestialBodies: newBodies,
        ephemeris: { ...cur, forceAlign: { ...curFa, lastApply: lastApplyRecord } },
      };
    });
  };

  // r051: revert restores each snapshotted body's pre-apply values for the
  // specific fields that were changed. Manual edits to other fields (or to
  // bodies that weren't part of the apply) are preserved.
  const revertLastApply = () => {
    const last = fa.lastApply;
    if (!last || !last.snapshots || last.snapshots.length === 0) return;
    const count = last.snapshots.length;
    if (!window.confirm(`Revert the last apply? This restores ${count} ${count === 1 ? "body" : "bodies"} to their pre-apply orbital values. Any manual edits to those bodies' affected fields since the apply will be lost.`)) return;
    const snapMap = new Map();
    last.snapshots.forEach(sn => snapMap.set(sn.id, sn));
    updateState(s => {
      const newBodies = (s.celestialBodies || []).map(b => {
        if (!b || !snapMap.has(b.id)) return b;
        const sn = snapMap.get(b.id);
        const oe = { ...(b.orbitalElements || {}) };
        Object.entries(sn.before).forEach(([k, v]) => { oe[k] = v; });
        return { ...b, orbitalElements: oe };
      });
      const cur = s.ephemeris || makeDefaultEphemerisState();
      const curFa = cur.forceAlign || makeDefaultEphemerisState().forceAlign;
      return {
        ...s,
        celestialBodies: newBodies,
        ephemeris: { ...cur, forceAlign: { ...curFa, lastApply: null } },
      };
    });
  };

  // r051: verify replays the apply's settings in the Compute workspace
  // pointed at exactly the target day, so the user can see whether the
  // alignment shows up as Compute would detect it. Keeps Compute's own
  // tolerance untouched.
  const verifyInCompute = () => {
    const last = fa.lastApply;
    if (!last) return;
    const ids = last.snapshots.map(sn => sn.id);
    updateState(s => {
      const cur = s.ephemeris || makeDefaultEphemerisState();
      const curCompute = cur.compute || makeDefaultEphemerisState().compute;
      return {
        ...s,
        ephemeris: {
          ...cur,
          currentMode: "compute",
          compute: {
            ...curCompute,
            currentQuery: {
              ...(curCompute.currentQuery || {}),
              alignmentType: last.alignmentType,
              bodyIds: ids,
              dateRangeStart: last.targetDayAbs,
              dateRangeEnd: last.targetDayAbs,
            },
          },
        },
      };
    });
  };

  const dismissLastApply = () => {
    updateForceAlign({ lastApply: null });
  };

  // Compose a human-readable "X minutes ago" for the lastApply timestamp.
  // Live updates would require a ticking interval; keep static for simplicity
  // — recomputes on every render so the value freshens whenever the user
  // interacts with the workspace.
  const formatTimeAgo = (ts) => {
    if (!Number.isFinite(ts)) return "";
    const secs = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (secs < 60) return "just now";
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins} ${mins === 1 ? "minute" : "minutes"} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} ${hrs === 1 ? "hour" : "hours"} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} ${days === 1 ? "day" : "days"} ago`;
  };

  // Year-conversion helper for the recurrence helper line.
  const recurDaysInCalendarYears = (() => {
    if (!Number.isFinite(fa.recurInterval) || fa.recurInterval <= 0) return null;
    if (!selectedCalendar) return null;
    const yearLen = (selectedCalendar.months || []).reduce((s, m) => s + (m.days || 0), 0);
    if (!yearLen) return null;
    return fa.recurInterval / yearLen;
  })();

  const fmtSma = (v) => Number.isFinite(v) ? v.toExponential(3).replace("e+0", "e").replace("e-0", "e-") : "—";
  const fmtSmaShort = (v) => {
    if (!Number.isFinite(v)) return "—";
    const abs = Math.abs(v);
    if (abs >= 1000 || (abs > 0 && abs < 0.01)) return v.toExponential(3);
    return Number(v.toFixed(4)).toString();
  };
  const fmtDeg = (v) => Number.isFinite(v) ? `${v.toFixed(2)}°` : "—";

  return (
    <div style={{ maxWidth: 920 }}>
      <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: 22, margin: "0 0 6px 0", color: "var(--text)" }}>Forced Alignment</h3>
      <p style={{ color: "var(--text-dim)", fontSize: 13, lineHeight: 1.55, margin: "0 0 20px 0" }}>
        Pick bodies from the tree, choose a date and the kind of alignment you want, and this workspace will tell you what edits force it — or apply them for you. Inverse of Compute: instead of finding when bodies happen to line up, you decide when they do.
      </p>

      {/* r051: Last-apply summary with Verify-in-Compute, Revert, Dismiss.
          Persists across mode switches and across the bodies-empty path —
          a user might apply, navigate away, come back to revert. */}
      {fa.lastApply && fa.lastApply.snapshots && fa.lastApply.snapshots.length > 0 && (
        <div style={{
          marginBottom: 18,
          padding: "12px 14px",
          background: "var(--surf2)",
          border: "1px solid var(--border)",
          borderLeft: "3px solid var(--accent)",
          borderRadius: 3,
        }}>
          <div style={{ fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 6, fontWeight: 600 }}>
            Last applied · {formatTimeAgo(fa.lastApply.timestamp)}
          </div>
          <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.55, marginBottom: 10 }}>
            <strong>{fa.lastApply.alignmentType}</strong> alignment on{" "}
            <strong>{fa.lastApply.snapshots.length}</strong> {fa.lastApply.snapshots.length === 1 ? "body" : "bodies"}
            {fa.lastApply.recurInterval ? `, recurring every ${fa.lastApply.recurInterval} days` : ""}
            {". "}
            <span style={{ color: "var(--text-dim)" }}>
              Affected: {fa.lastApply.snapshots.map(sn => sn.name).join(", ")}.
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={verifyInCompute}
              style={{
                padding: "5px 12px", fontSize: 12, fontFamily: "inherit",
                background: "transparent", color: "var(--text)",
                border: "1px solid var(--border)", borderRadius: 3, cursor: "pointer",
              }}
              title="Switch to Compute with this alignment's bodies, type, and date pre-filled so you can confirm it shows up."
            >Verify in Compute →</button>
            <button
              onClick={revertLastApply}
              disabled={isLocked}
              style={{
                padding: "5px 12px", fontSize: 12, fontFamily: "inherit",
                background: "transparent", color: isLocked ? "var(--text-dim)" : "var(--text)",
                border: "1px solid var(--border)", borderRadius: 3,
                cursor: isLocked ? "not-allowed" : "pointer",
                opacity: isLocked ? 0.5 : 1,
              }}
              title={isLocked ? "World is locked — revert disabled" : "Restore each affected body's pre-apply orbital values for the fields this apply changed."}
            >Revert</button>
            <button
              onClick={dismissLastApply}
              style={{
                padding: "5px 12px", fontSize: 12, fontFamily: "inherit",
                background: "transparent", color: "var(--text-dim)",
                border: "1px solid var(--border)", borderRadius: 3, cursor: "pointer",
              }}
              title="Forget this apply record. Doesn't revert anything — just clears the section."
            >Dismiss</button>
          </div>
        </div>
      )}

      {/* P3: empty-world bridge. Forced Alignment requires bodies; if the
          world has none, route users to AsBo where the tutorial seed lives. */}
      {bodies.length === 0 ? (
        <div style={{
          padding: "18px 20px",
          background: "var(--surf2)",
          border: "1px solid var(--border)",
          borderRadius: 4,
          color: "var(--text-dim)",
          fontSize: 13,
          lineHeight: 1.55,
        }}>
          <div style={{ marginBottom: 10 }}>
            No bodies in this world yet. Forced Alignment edits existing celestial bodies — you'll need at least a parent body (a star or planet) and a satellite to force into alignment with it.
          </div>
          <button
            onClick={() => updateState(s => {
              const cur = s.ephemeris || makeDefaultEphemerisState();
              return { ...s, ephemeris: { ...cur, currentMode: "asbo" } };
            })}
            style={{
              padding: "6px 14px", fontSize: 12, fontFamily: "inherit",
              background: "transparent", color: "var(--text)",
              border: "1px solid var(--border)", borderRadius: 3, cursor: "pointer",
            }}
          >Go to Astronomical Body →</button>
        </div>
      ) : (
        <>

      {/* Bodies chip strip */}
      <div style={{ marginBottom: 18 }}>
        <label style={asboLabelStyle()}>Picked bodies ({fa.bodyIds.length} selected)</label>
        {fa.bodyIds.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--text-dim)", fontStyle: "italic", padding: "8px 0" }}>
            Pick eligible bodies from the tree on the left. Bodies need a parent body with mass, and their own semi-major axis set, to participate.
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "2px 0" }}>
            {fa.bodyIds.map(id => {
              const b = bodies.find(x => x && x.id === id);
              return (
                <span key={id} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 4px 3px 10px", background: "rgba(200,169,110,0.18)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12, color: "var(--text)" }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>{b?.name || "(unknown)"}</span>
                  <button
                    onClick={() => updateForceAlign({ bodyIds: fa.bodyIds.filter(x => x !== id) })}
                    title="Remove"
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, padding: 0, border: "none", background: "transparent", color: "var(--text-dim)", fontSize: 14, cursor: "pointer", borderRadius: "50%", lineHeight: 1 }}
                  >×</button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Alignment type */}
      <div style={{ marginBottom: 18 }}>
        <label style={asboLabelStyle()}>
          <span title="What kind of celestial arrangement to force. Phase = all picks at the same point in their cycle. Conjunction = same sky angle from the central star. Eclipse = one body lined up to block another from an observer. Nodal = bodies at their orbital crossing points." style={{ borderBottom: "1px dotted var(--text-dim)", cursor: "help" }}>Alignment type</span>
        </label>
        <select
          value={fa.alignmentType || "phase"}
          onChange={e => updateForceAlign({ alignmentType: e.target.value })}
          style={asboInputStyle()}
        >
          {ALIGNMENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4, fontStyle: "italic" }}>
          {ALIGNMENT_TYPES.find(t => t.id === (fa.alignmentType || "phase"))?.hint}
        </div>
        {fa.alignmentType === "eclipse" && (
          <div style={{ marginTop: 8, padding: "8px 10px", background: "var(--surf2)", border: "1px solid var(--border)", borderLeft: "3px solid var(--accent)", borderRadius: 3, fontSize: 12, color: "var(--text-dim)", lineHeight: 1.5 }}>
            Eclipse forcing rewrites each picked body's ascending node to 0 (so its orbital plane contains the shared eclipse direction) and sets mean-anomaly-at-epoch so the body sits on that line at the target day. Inclination is preserved — tilted orbits still work because every tilted plane passes through the shared line. Multi-body syzygy of 3+ bodies works the same as a 2-body eclipse. Pick the WHOLE chain you want aligned (e.g., for a moon-planet-star eclipse, pick both the moon and the planet — unpicked ancestors stay where they are and the chain doesn't line up). Disc coverage isn't auto-checked — run a Compute Eclipse query after to verify.
          </div>
        )}
      </div>

      {/* P1: Phase reference fraction — only meaningful for phase alignment. */}
      {(fa.alignmentType || "phase") === "phase" && (
        <div style={{ marginBottom: 18 }}>
          <label style={asboLabelStyle()}>
            <span title="Where each body should be in its orbital cycle, expressed as a fraction. 0 = periapsis (closest point to parent). 0.5 = apoapsis (farthest). NOTE: this is orbital-position fraction, NOT lunar-phase fraction. For moons, 0 doesn't mean 'New' and 0.5 doesn't mean 'Full' — those are illumination-based concepts that depend on the moon's geometry relative to the star, not its orbital position relative to its parent. To force a specific lunar phase, you'll need a different approach (use Compute to find when the desired phase occurs naturally)." style={{ borderBottom: "1px dotted var(--text-dim)", cursor: "help" }}>Phase fraction</span>
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4 }}>
            <input
              type="number"
              value={Number.isFinite(fa.phaseReferenceFraction) ? fa.phaseReferenceFraction : 0}
              onChange={e => {
                const v = e.target.value;
                const n = v === "" ? 0 : parseFloat(v);
                updateForceAlign({ phaseReferenceFraction: Number.isFinite(n) ? Math.max(0, Math.min(0.999, n)) : 0 });
              }}
              step="0.01"
              min="0"
              max="0.999"
              style={{ ...asboInputStyle(), width: 100 }}
            />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                { v: 0, label: "Periapsis (0)" },
                { v: 0.25, label: "¼ (0.25)" },
                { v: 0.5, label: "Apoapsis (0.5)" },
                { v: 0.75, label: "¾ (0.75)" },
              ].map(p => (
                <button
                  key={p.v}
                  onClick={() => updateForceAlign({ phaseReferenceFraction: p.v })}
                  style={{
                    padding: "4px 8px", fontSize: 11, fontFamily: "inherit",
                    background: Math.abs((fa.phaseReferenceFraction ?? 0) - p.v) < 0.001 ? "rgba(200,169,110,0.18)" : "transparent",
                    color: "var(--text-dim)",
                    border: "1px solid var(--border)", borderRadius: 3, cursor: "pointer",
                  }}
                >{p.label}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Target date + calendar */}
      <div style={{ marginBottom: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={asboLabelStyle()}>Calendar</label>
          <select
            value={fa.targetCalendarId || ""}
            onChange={e => updateForceAlign({ targetCalendarId: e.target.value || null, targetDate: null })}
            style={asboInputStyle()}
          >
            <option value="">{primaryCalendar?.name || "Primary"}</option>
            {calendars.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={asboLabelStyle()}>Target date</label>
          <CalendarDateEditor
            value={fa.targetDate}
            onChange={v => updateForceAlign({ targetDate: v })}
            calendar={selectedCalendar}
            allowApproximate={false}
          />
          {Number.isFinite(targetDayAbs) && (
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4, fontStyle: "italic" }}>
              Resolves to absolute day {targetDayAbs}. If you edit this calendar's months later, the date above stays the same but the absolute day shifts — watch this number if you change calendar definitions.
            </div>
          )}
        </div>
      </div>

      {/* Recurrence */}
      <div style={{ marginBottom: 18 }}>
        <label style={asboLabelStyle()}>
          <span title="Optional. Force the alignment to recur every N days. Recurring requires rewriting semi-major axis per body (so the orbital periods divide N evenly), which is a more invasive edit than the one-shot M₀-only case." style={{ borderBottom: "1px dotted var(--text-dim)", cursor: "help" }}>Recurrence</span>
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor: "pointer" }}>
            <input type="radio" name="recur" checked={!Number.isFinite(fa.recurInterval) || fa.recurInterval <= 0} onChange={() => updateForceAlign({ recurInterval: null })} />
            Once at target date
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor: "pointer" }}>
            <input type="radio" name="recur" checked={Number.isFinite(fa.recurInterval) && fa.recurInterval > 0} onChange={() => updateForceAlign({ recurInterval: 365 })} />
            Recurring every
          </label>
          <input
            type="number"
            value={Number.isFinite(fa.recurInterval) ? fa.recurInterval : ""}
            onChange={e => {
              const v = e.target.value;
              const n = v === "" ? null : parseFloat(v);
              updateForceAlign({ recurInterval: Number.isFinite(n) && n > 0 ? n : null });
            }}
            disabled={!Number.isFinite(fa.recurInterval) || fa.recurInterval <= 0}
            style={{ ...asboInputStyle(), width: 100 }}
            min="1"
            step="1"
          />
          <span style={{ fontSize: 12, color: "var(--text-dim)" }}>days</span>
        </div>
        {Number.isFinite(recurDaysInCalendarYears) && (
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4, fontStyle: "italic" }}>
            ≈ {recurDaysInCalendarYears.toFixed(2)} {selectedCalendar?.name || "primary"} year{Math.abs(recurDaysInCalendarYears - 1) < 0.005 ? "" : "s"}
          </div>
        )}
      </div>

      {/* Preview */}
      <div style={{ marginBottom: 16, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
        <div style={asboLabelStyle()}>Preview</div>
        {fa.bodyIds.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--text-dim)", fontStyle: "italic", padding: "8px 0" }}>Pick bodies above to see the edits.</div>
        )}
        {fa.bodyIds.length > 0 && !Number.isFinite(targetDayAbs) && (
          <div style={{ fontSize: 12, color: "var(--text-dim)", fontStyle: "italic", padding: "8px 0" }}>Set a target date to see the edits.</div>
        )}
        {preview.eligible.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-dim)" }}>
                  <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600 }}>Body</th>
                  {Number.isFinite(fa.recurInterval) && fa.recurInterval > 0 && (
                    <>
                      <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 600 }}>sma (AU)</th>
                      <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 600 }}>Δsma</th>
                      <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 600 }}>k</th>
                    </>
                  )}
                  {fa.alignmentType === "eclipse" && (
                    <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 600 }}>Ω</th>
                  )}
                  <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 600 }}>M₀</th>
                </tr>
              </thead>
              <tbody>
                {preview.eligible.map(row => (
                  <tr key={row.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "6px 8px" }}>
                      {row.warnLargeSma && <span title="Large semi-major-axis change (>50%) — this rewrites the orbit significantly." style={{ color: "var(--accent)", marginRight: 4 }}>⚠</span>}
                      {row.name}
                    </td>
                    {Number.isFinite(fa.recurInterval) && fa.recurInterval > 0 && (
                      <>
                        <td style={{ padding: "6px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                          <span style={{ color: "var(--text-dim)" }}>{fmtSmaShort(row.currentSma)}</span>
                          <span style={{ color: "var(--text-dim)", margin: "0 4px" }}>→</span>
                          {fmtSmaShort(row.newSma)}
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: row.warnLargeSma ? "var(--accent)" : "var(--text-dim)" }}>
                          {row.deltaSmaPct >= 0 ? "+" : ""}{row.deltaSmaPct.toFixed(1)}%
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--text-dim)" }}>
                          {row.kValue}
                        </td>
                      </>
                    )}
                    {fa.alignmentType === "eclipse" && (
                      <td style={{ padding: "6px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        <span style={{ color: "var(--text-dim)" }}>{fmtDeg(row.currentOmega)}</span>
                        <span style={{ color: "var(--text-dim)", margin: "0 4px" }}>→</span>
                        {fmtDeg(row.newOmega)}
                      </td>
                    )}
                    <td style={{ padding: "6px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      <span style={{ color: "var(--text-dim)" }}>{fmtDeg(row.currentM0)}</span>
                      <span style={{ color: "var(--text-dim)", margin: "0 4px" }}>→</span>
                      {fmtDeg(row.newM0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {preview.warnings && preview.warnings.length > 0 && (
          <div style={{ marginTop: 10, padding: 10, background: "var(--surf2)", borderLeft: "3px solid var(--accent)", border: "1px solid var(--border)", borderRadius: 3 }}>
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Chain warnings ({preview.warnings.length})</div>
            {preview.warnings.map(w => (
              <div key={w.id} style={{ fontSize: 12, padding: "3px 0", lineHeight: 1.5 }}>
                <span style={{ color: "var(--text)", fontWeight: 500 }}>{w.name}:</span>
                <span style={{ color: "var(--text-dim)", marginLeft: 6 }}>{w.message}</span>
              </div>
            ))}
          </div>
        )}
        {preview.ineligible.length > 0 && (
          <div style={{ marginTop: 10, padding: 10, background: "var(--surf2)", border: "1px solid var(--border)", borderRadius: 3 }}>
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Skipped ({preview.ineligible.length})</div>
            {preview.ineligible.map(row => (
              <div key={row.id} style={{ fontSize: 12, padding: "2px 0" }}>
                <span style={{ color: "var(--text)" }}>{row.name}</span>
                <span style={{ color: "var(--text-dim)", marginLeft: 8 }}>{row.reason}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Apply */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button
          onClick={applyForceAlign}
          disabled={!canApply}
          style={{
            padding: "8px 18px",
            background: canApply ? "var(--accent)" : "var(--surf2)",
            color: canApply ? "var(--bg)" : "var(--text-dim)",
            border: "1px solid var(--border)",
            borderRadius: 3,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: canApply ? "pointer" : "not-allowed",
          }}
        >Apply</button>
        <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
          {isLocked ? "World is locked — apply disabled" : !Number.isFinite(targetDayAbs) ? "Set a target date" : preview.eligible.length === 0 ? "No eligible bodies" : `Will edit ${preview.eligible.length} ${preview.eligible.length === 1 ? "body" : "bodies"}`}
        </span>
      </div>
        </>
      )}
    </div>
  );
}