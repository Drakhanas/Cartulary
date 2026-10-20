
function AsBoModeContent({
  state, bodies, selectedBodyId, onOpenEntry,
  onSaveBody, onDeleteBody, onCreateBody,
  onSelectBody, onCreateChildBody, onSetBodyColor,
  onLoadTutorial,
  isLocked, startInEditMode,
}) {
  const body = bodies.find(b => b && b.id === selectedBodyId);
  const [draft, setDraft] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Reset edit + confirm state when the selection changes. Switching bodies
  // mid-edit discards the draft — same pattern as entry editing elsewhere
  // in Cartulary. No unsaved-changes warning in r007; that's r008 polish.
  useEffect(() => {
    setDraft(null);
    setConfirmingDelete(false);
  }, [selectedBodyId]);

  // Auto-enter edit mode when a freshly-created body lands here. The
  // createBody flow in EphemerisView sets editingNewBody=true alongside
  // the selection; this effect picks that up and opens the form so the
  // user can immediately fill in the new body's fields.
  useEffect(() => {
    if (startInEditMode && body && draft === null) {
      setDraft({ ...body });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startInEditMode, body && body.id]);

  if (!body) {
    return (
      <div style={{ color: "var(--text-dim)", maxWidth: 560 }}>
        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: 22, margin: "0 0 12px 0", color: "var(--text)" }}>Astronomical Body</h3>
        <p style={{ lineHeight: 1.6, margin: "0 0 16px 0" }}>
          {bodies.length === 0
            ? "No bodies in this world yet. Create one to start defining your sky."
            : "Select a body from the tree to view or edit it, or create a new one."}
        </p>
        {!isLocked && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
            <button
              onClick={() => onCreateBody()}
              style={{ padding: "8px 16px", border: "1px solid var(--accent-dim)", background: "var(--accent-glow)", color: "var(--accent)", borderRadius: 4, cursor: "pointer", fontSize: 13 }}
            >+ New Body</button>
            {bodies.length === 0 && onLoadTutorial && (
              <button
                onClick={onLoadTutorial}
                title="Adds a working example system (Sol + Terra + Luna) so you can see the math working before you pick any numbers. Available only when the world is empty."
                style={{ padding: "6px 14px", border: "1px solid var(--border)", background: "transparent", color: "var(--text-dim)", borderRadius: 4, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}
              >Tutorial: add example bodies (Sol, Terra, Luna)</button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Edit mode.
  if (draft !== null) {
    return (
      <AsBoEditForm
        draft={draft}
        setDraft={setDraft}
        body={body}
        state={state}
        bodies={bodies}
        onSave={() => { onSaveBody(body.id, draft); setDraft(null); }}
        onCancel={() => setDraft(null)}
        onSelectBody={onSelectBody}
        onCreateChildBody={onCreateChildBody}
        onSetBodyColor={onSetBodyColor}
        isLocked={isLocked}
      />
    );
  }

  // View mode.
  const entries = state?.entries || [];
  const templates = state?.templates || [];
  const calendar = state?.world?.calendar;
  const kind = BODY_KIND_BY_ID[body.kind] || { label: body.kind || "(unknown)", symbol: "?" };
  const isComputable = isComputableKind(body.kind);
  const parent = body.parentBodyId ? bodies.find(b => b && b.id === body.parentBodyId) : null;
  const oe = body.orbitalElements || {};
  const pp = body.physicalParams || {};
  // Moon phase (view). Plain object (not a hook — we're past the edit-mode
  // early return). geometryAvailable reuses the calendar resolver's predicate.
  const bodiesByIdView = {};
  (bodies || []).forEach(b => { if (b && b.id) bodiesByIdView[b.id] = b; });
  const moonGeoAvailable = body.kind === "moon" && computeMoonPhaseGeometric(body, 0, bodiesByIdView) != null;
  const effCycleView = Number.isFinite(body.synodicCycleDays) ? body.synodicCycleDays : null;
  const effAnchorView = Number.isFinite(body.phaseAnchorDay) ? body.phaseAnchorDay : null;
  const showMoonPhase = body.kind === "moon" && (moonGeoAvailable || Number.isFinite(effCycleView));

  // Narrative-field helpers. All defensive against missing fields so a body
  // that was never an entry (e.g., one created from calendar.celestials only,
  // not name-merged) doesn't render empty rows.
  const has = (v) => {
    if (v == null) return false;
    if (typeof v === "string") return v.trim() !== "";
    if (Array.isArray(v)) return v.length > 0;
    return true;
  };
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
  const formatCalDate = (v) => {
    if (!v || v.year == null) return null;
    const prefix = v.approximate ? "~" : "";
    return `${prefix}${formatCalendarDate(v, calendar)}`;
  };
  const lookupRefName = (id) => {
    const e = entries.find(x => x && x.id === id);
    if (e) return e.name || "(unnamed)";
    const b = bodies.find(x => x && x.id === id);
    if (b) return b.name || "(unnamed)";
    return null;
  };
  const renderRefList = (ids) => {
    if (!Array.isArray(ids) || ids.length === 0) return null;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {ids.map((id, i) => {
          const name = lookupRefName(id);
          if (!name) {
            return <span key={i} style={{ padding: "2px 8px", background: "var(--surf2)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text-dim)", fontSize: 12, opacity: 0.6 }}>(missing)</span>;
          }
          return (
            <a
              key={i}
              href="#"
              onClick={(e) => { e.preventDefault(); if (onOpenEntry) onOpenEntry(id); }}
              style={{ padding: "2px 8px", background: "var(--accent-glow)", border: "1px solid var(--accent-dim)", borderRadius: 12, color: "var(--accent)", fontSize: 12, textDecoration: "none", cursor: "pointer" }}
            >
              {name}
            </a>
          );
        })}
      </div>
    );
  };

  const showNarrativeType = has(body.type) && body.type !== kind.label;
  const statusStr = formatSelectValue(body.status);
  const discoveredStr = formatCalDate(body.discoveredFounded);

  const hasNarrativeText = has(body.physicalProperties) || has(body.climateConditions) || has(body.mythologicalSignificance) || has(body.description) || has(body.history) || has(body.notes);
  const tagsList = typeof body.tags === "string"
    ? body.tags.split(",").map(t => t.trim()).filter(Boolean)
    : Array.isArray(body.tags) ? body.tags.filter(Boolean) : [];

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, minWidth: 0 }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: 30, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {body.name || "(unnamed)"}
          </h2>
          <span style={{ color: "var(--text-dim)", fontSize: 13, flexShrink: 0 }}>{kind.label}{!isComputable && " · narrative"}</span>
        </div>
        {!isLocked && (
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button onClick={() => setDraft({ ...body })} style={{ padding: "6px 14px", background: "var(--accent)", color: "var(--bg)", border: "none", borderRadius: 3, fontSize: 12, cursor: "pointer" }}>Edit</button>
            <button
              onClick={() => { if (confirmingDelete) { onDeleteBody(body.id); } else { setConfirmingDelete(true); } }}
              style={{ padding: "6px 14px", background: confirmingDelete ? "#a04848" : "transparent", color: confirmingDelete ? "#fff" : "var(--text-dim)", border: "1px solid var(--border)", borderRadius: 3, fontSize: 12, cursor: "pointer" }}
              title={confirmingDelete ? "Click again to confirm delete" : "Delete this body"}
            >
              {confirmingDelete ? "Confirm delete" : "Delete"}
            </button>
            {confirmingDelete && (
              <button onClick={() => setConfirmingDelete(false)} style={{ padding: "6px 10px", background: "transparent", color: "var(--text-dim)", border: "1px solid var(--border)", borderRadius: 3, fontSize: 12, cursor: "pointer" }}>Cancel</button>
            )}
          </div>
        )}
      </div>
      {confirmingDelete && (() => {
        // v1.5 r080: show the blast radius before a body delete commits. The
        // delete silently scrubs inbound entry refs (deleteBody → scrubEntryRefs);
        // this surfaces how many links will go first, mirroring the calendar
        // destructive-op warning. The entries themselves are untouched.
        const refCount = countInboundEntryRefs(state.entries, state.templates, body.id);
        if (refCount === 0) return null;
        return (
          <div style={{ fontSize: 12, color: "#d08a8a", marginBottom: 12, padding: "6px 10px", border: "1px solid #a04848", borderRadius: 3, background: "rgba(160,72,72,0.08)" }}>
            Referenced by {refCount} {refCount === 1 ? "entry" : "entries"}. Deleting this body removes {refCount === 1 ? "that reference" : "those references"}; the {refCount === 1 ? "entry stays" : "entries stay"} intact.
          </div>
        );
      })()}
      {parent ? (
        <div style={{ color: "var(--text-dim)", fontSize: 13, marginBottom: 20 }}>
          {isComputable && isComputableKind(parent.kind) ? "Orbits " : "Under "}
          <strong style={{ color: "var(--text)" }}>{parent.name}</strong>
        </div>
      ) : (
        <div style={{ color: "var(--text-dim)", fontSize: 13, marginBottom: 20, fontStyle: "italic" }}>
          Top-level body (no parent assigned)
        </div>
      )}
      {tagsList.length > 0 && (
        <AsBoReadonlyBlock title="Tags">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {tagsList.map((t, i) => (
              <span key={i} style={{ padding: "2px 8px", background: "var(--surf2)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text)", fontSize: 12 }}>{t}</span>
            ))}
          </div>
        </AsBoReadonlyBlock>
      )}
      <AsBoReadonlyBlock title="Identity">
        <AsBoFieldRow label="Kind" value={kind.label} />
        <AsBoFieldRow label="Parent" value={parent ? parent.name : "—"} />
        {has(body.otherNames) && <AsBoFieldRow label="Other Names" value={body.otherNames} />}
        {showNarrativeType && <AsBoFieldRow label="Type (narrative)" value={body.type} />}
        {has(statusStr) && <AsBoFieldRow label="Status" value={statusStr} />}
        {has(discoveredStr) && <AsBoFieldRow label="Discovered / Founded" value={discoveredStr} />}
        <AsBoFieldRow label="ID" value={<code style={{ fontSize: 11 }}>{body.id}</code>} />
      </AsBoReadonlyBlock>
      {isComputable && body.parentBodyId && (() => {
        // Derived values mirror the edit form (AB.6 hybrid inline + panel,
        // primary derivations beside source). When neither apsides nor
        // period are computable, the Derived sub-section is suppressed so
        // the block doesn't end with placeholder dashes.
        const apsides = computeApsides(oe.semiMajorAxis, oe.eccentricity);
        const parentMass = parent?.physicalParams?.mass;
        const parentHasMass = Number.isFinite(parentMass) && parentMass > 0;
        const periodDays = computeOrbitalPeriodDays(oe.semiMajorAxis, parentMass);
        const tidalLockStatus = computeTidalLockStatus(body.rotationPeriod, periodDays);
        const hasDerived = apsides || Number.isFinite(periodDays) || tidalLockStatus;
        return (
          <AsBoReadonlyBlock title="Orbital Elements">
            {!parentHasMass && (
              <div style={{
                marginBottom: 10,
                padding: "8px 10px",
                background: "var(--surf2)",
                borderLeft: "3px solid var(--accent)",
                border: "1px solid var(--border)",
                borderRadius: 3,
                fontSize: 12,
                color: "var(--text-dim)",
                lineHeight: 1.45,
              }}>
                ⚠ <strong style={{ color: "var(--text)" }}>{parent?.name || "Parent body"}</strong> has no mass set. Orbital period can't compute, and this body will fall back to the system's root position in the Observe diagram. Set the parent's mass to fix.
              </div>
            )}
            <AsBoFieldRow label="Semi-major axis" value={fmtNum(oe.semiMajorAxis, "AU")} tooltip={FIELD_TOOLTIPS.semiMajorAxis} />
            <AsBoFieldRow label="Eccentricity" value={fmtNum(oe.eccentricity)} tooltip={FIELD_TOOLTIPS.eccentricity} />
            <AsBoFieldRow label="Inclination" value={fmtNum(oe.inclination, "°")} tooltip={FIELD_TOOLTIPS.inclination} />
            <AsBoFieldRow label="Ascending node (Ω)" value={fmtNum(oe.ascendingNode, "°")} tooltip={FIELD_TOOLTIPS.ascendingNode} />
            <AsBoFieldRow label="Argument of periapsis (ω)" value={fmtNum(oe.argumentOfPeriapsis, "°")} tooltip={FIELD_TOOLTIPS.argumentOfPeriapsis} />
            <AsBoFieldRow label="Mean anomaly at epoch" value={fmtNum(oe.meanAnomalyAtEpoch, "°")} tooltip={FIELD_TOOLTIPS.meanAnomalyAtEpoch} />
            {hasDerived && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                <div style={{ fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 4, fontWeight: 600 }}>Derived</div>
                {apsides && (
                  <>
                    <AsBoFieldRow label="Periapsis" value={fmtNum(apsides.perihelion, "AU")} />
                    <AsBoFieldRow label="Apoapsis" value={fmtNum(apsides.aphelion, "AU")} />
                  </>
                )}
                {Number.isFinite(periodDays) && (
                  <AsBoFieldRow label="Orbital period" value={formatOrbitalPeriod(periodDays)} />
                )}
                {tidalLockStatus && (
                  <AsBoFieldRow
                    label="Tidal lock"
                    value={tidalLockStatus === "locked"
                      ? <span>Tidally locked <span style={{ color: "var(--text-dim)", fontSize: 11, marginLeft: 6, fontStyle: "italic" }}>(rotation ≈ orbital period)</span></span>
                      : <span>Free rotation <span style={{ color: "var(--text-dim)", fontSize: 11, marginLeft: 6, fontStyle: "italic" }}>(rotation ≠ orbital period)</span></span>
                    }
                  />
                )}
              </div>
            )}
          </AsBoReadonlyBlock>
        );
      })()}
      {(() => {
        // Physical Parameters block always renders for computable kinds
        // (mass/radius/tilt make sense regardless of parent), and for any
        // body with narrative atmosphere/gravity/rotation values. Surface
        // gravity is the only inline-derived value here in r008; escape
        // velocity, density, and friends land in the r009 panel.
        const surfaceG = isComputable
          ? computeSurfaceGravity(pp.mass, pp.radius)
          : null;
        const hasPhysicalNarrative = has(body.atmosphere) || has(body.gravity) || Number.isFinite(body.rotationPeriod);
        // Suppress block if non-computable body has no narrative values.
        if (!isComputable && !hasPhysicalNarrative) return null;
        return (
          <AsBoReadonlyBlock title={isComputable ? "Physical Parameters" : "Physical (narrative)"}>
            {isComputable && <AsBoFieldRow label="Mass" value={fmtNum(pp.mass, "M⊕")} tooltip={FIELD_TOOLTIPS.mass} />}
            {isComputable && <AsBoFieldRow label="Radius" value={fmtNum(pp.radius, "R⊕")} tooltip={FIELD_TOOLTIPS.radius} />}
            {isComputable && <AsBoFieldRow label="Axial tilt" value={fmtNum(pp.axialTilt, "°")} tooltip={FIELD_TOOLTIPS.axialTilt} />}
            {has(body.atmosphere) && <AsBoFieldRow label="Atmosphere" value={body.atmosphere} />}
            {has(body.gravity) && <AsBoFieldRow label="Gravity" value={body.gravity} />}
            {Number.isFinite(body.rotationPeriod) && <AsBoFieldRow label="Rotation Period" value={`${body.rotationPeriod} days`} tooltip={FIELD_TOOLTIPS.rotationPeriod} />}
            {Number.isFinite(surfaceG) && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                <div style={{ fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 4, fontWeight: 600 }}>Derived</div>
                <AsBoFieldRow
                  label="Surface gravity"
                  value={<span>{fmtNum(surfaceG, "g")} <span style={{ color: "var(--text-dim)", fontSize: 12 }}>({fmtNum(surfaceG * 9.81, "m/s²")})</span></span>}
                />
              </div>
            )}
          </AsBoReadonlyBlock>
        );
      })()}
      <AsBoSecondaryDerivedBlock
        body={body}
        bodies={bodies}
        isComputable={isComputable}
      />
      <AsBoReadonlyBlock title="References">
        <AsBoChildrenRow
          body={body}
          bodies={bodies}
          onSelectBody={onSelectBody}
          onCreateChildBody={onCreateChildBody}
          isLocked={isLocked}
        />
        {has(body.visibleFrom) && <AsBoFieldRow label="Visible From" value={renderRefList(body.visibleFrom)} />}
        {has(body.notableLocations) && <AsBoFieldRow label="Notable Locations" value={renderRefList(body.notableLocations)} />}
        {has(body.inhabitedBy) && <AsBoFieldRow label="Inhabited By" value={renderRefList(body.inhabitedBy)} />}
        {has(body.sacredTo) && <AsBoFieldRow label="Sacred to" value={renderRefList(body.sacredTo)} />}
      </AsBoReadonlyBlock>
      {hasNarrativeText && (
        <AsBoReadonlyBlock title="Narrative">
          {has(body.physicalProperties) && <AsBoNarrativeField label="Physical Properties" text={body.physicalProperties} entries={entries} templates={templates} bodies={bodies} onOpenEntry={onOpenEntry} />}
          {has(body.climateConditions) && <AsBoNarrativeField label="Climate / Conditions" text={body.climateConditions} entries={entries} templates={templates} bodies={bodies} onOpenEntry={onOpenEntry} />}
          {has(body.mythologicalSignificance) && <AsBoNarrativeField label="Mythological Significance" text={body.mythologicalSignificance} entries={entries} templates={templates} bodies={bodies} onOpenEntry={onOpenEntry} />}
          {has(body.description) && <AsBoNarrativeField label="Description" text={body.description} entries={entries} templates={templates} bodies={bodies} onOpenEntry={onOpenEntry} />}
          {has(body.history) && <AsBoNarrativeField label="History" text={body.history} entries={entries} templates={templates} bodies={bodies} onOpenEntry={onOpenEntry} />}
          {has(body.notes) && <AsBoNarrativeField label="Notes" text={body.notes} entries={entries} templates={templates} bodies={bodies} onOpenEntry={onOpenEntry} />}
        </AsBoReadonlyBlock>
      )}
      {showMoonPhase && (
        <AsBoReadonlyBlock title="Moon phase">
          <div style={{ marginBottom: 8, fontSize: 12, color: "var(--text-dim)", fontStyle: "italic", lineHeight: 1.5 }}>
            {moonGeoAvailable
              ? `Phase is computed from this moon's orbital geometry.${Number.isFinite(effCycleView) ? " The synodic-cycle values below are kept as a fallback but aren't currently used." : ""}`
              : "The calendar grid draws this moon's phase from these synodic-cycle values."}
          </div>
          {Number.isFinite(effCycleView) && <AsBoFieldRow label="Synodic cycle" value={`${effCycleView} days`} tooltip={FIELD_TOOLTIPS.synodicCycleDays} />}
          {Number.isFinite(effAnchorView) && <AsBoFieldRow label="Phase anchor" value={`day ${effAnchorView}`} tooltip={FIELD_TOOLTIPS.phaseAnchorDay} />}
        </AsBoReadonlyBlock>
      )}
    </div>
  );
}

// Edit form for a single body. r007 covers everything that was on the v1.4
// Astronomical Body template plus the kind picker (grouped Computable /
// Narrative) and body-only parent picker. Orbital element editing
// (semi-major axis, eccentricity, etc.) and physical parameter editing
// (mass, radius, axial tilt) ship in r008 alongside the Compute / Observe /
// Event surfaces.
function AsBoEditForm({ draft, setDraft, body, state, bodies, onSave, onCancel, onSelectBody, onCreateChildBody, onSetBodyColor, isLocked }) {
  const entries = state?.entries || [];
  const templates = state?.templates || [];
  const calendar = state?.world?.calendar;

  // Resolve template ids for the ref pickers. Pre-r007 v1.4 worlds always
  // have these templates (built-ins). Defensive: skip filter if missing.
  const tplIdByName = useMemo(() => {
    const m = {};
    (templates || []).forEach(t => { m[t.name] = t.id; });
    return m;
  }, [templates]);
  const locationTplId = tplIdByName["Location"];
  const raceTplId     = tplIdByName["Race / Species / Ancestry"];
  const deityTplId    = tplIdByName["Deity / Entity"];

  // Synthesized ref-field configs. refTemplatesId is the runtime-resolved
  // form that EntryRefEditor consumes; we feed it directly with the
  // resolved ids to skip the resolveTemplateRefs detour. Visible From also
  // includes BODY_REF_SENTINEL so the user can pick a body (e.g., "visible
  // from the moon").
  const visibleFromField = useMemo(() => ({
    label: "Visible From", type: "entry-ref", multi: true,
    refTemplatesId: [locationTplId, BODY_REF_SENTINEL].filter(Boolean),
  }), [locationTplId]);
  const notableLocationsField = useMemo(() => ({
    label: "Notable Locations", type: "entry-ref", multi: true,
    refTemplatesId: [locationTplId].filter(Boolean),
  }), [locationTplId]);
  const inhabitedByField = useMemo(() => ({
    label: "Inhabited By", type: "entry-ref", multi: true,
    refTemplatesId: [raceTplId].filter(Boolean),
  }), [raceTplId]);
  const sacredToField = useMemo(() => ({
    label: "Sacred to", type: "entry-ref", multi: true,
    refTemplatesId: [deityTplId].filter(Boolean),
  }), [deityTplId]);
  const parentField = useMemo(() => ({
    label: "Parent Body", type: "entry-ref", multi: false,
    refTemplatesId: [BODY_REF_SENTINEL],
  }), []);

  const isComputable = isComputableKind(draft.kind);
  const update = (key, value) => setDraft({ ...draft, [key]: value });

  // Status: select-with-other shape. v1.4 stored either a string or
  // { value, customText } object. The editor normalizes to the object
  // shape on every change.
  const STATUS_OPTIONS = ["Active", "Dead", "Dormant", "Destroyed", "Extinct", "Mythical", "Unknown", "Other"];
  const statusValue = (() => {
    if (!draft.status) return "";
    if (typeof draft.status === "string") return draft.status;
    if (typeof draft.status === "object") return draft.status.value || "";
    return "";
  })();
  const statusCustom = (draft.status && typeof draft.status === "object") ? (draft.status.customText || "") : "";

  // Bodies eligible as parent: all except self.
  const eligibleParents = useMemo(() => bodies.filter(b => b.id !== body.id), [bodies, body.id]);

  // The body currently set as parent (if any). Drives the orbital-period
  // derivation in the Orbital block — period needs parent mass. Recomputes
  // when the draft's parent picker changes.
  const parentBodyForDraft = useMemo(
    () => (draft.parentBodyId ? bodies.find(b => b.id === draft.parentBodyId) : null),
    [bodies, draft.parentBodyId]
  );
  // For the synodic block's "is geometry available?" check — reuses the same
  // computeMoonPhaseGeometric the calendar resolver uses, so the inert
  // indicator can't drift from what actually drives the grid.
  const bodiesById = useMemo(() => {
    const m = {};
    (bodies || []).forEach(b => { if (b && b.id) m[b.id] = b; });
    return m;
  }, [bodies]);

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <input
          type="text"
          value={draft.name || ""}
          onChange={e => update("name", e.target.value)}
          placeholder="Body name"
          style={{
            flex: 1, fontSize: 20, padding: "8px 10px",
            background: "var(--surf)", border: "1px solid var(--border)",
            color: "var(--text)", borderRadius: 3,
            fontFamily: "inherit",
          }}
        />
        <button onClick={onSave} style={{ padding: "8px 18px", background: "var(--accent)", color: "var(--bg)", border: "none", borderRadius: 3, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>Save</button>
        <button onClick={onCancel} style={{ padding: "8px 14px", background: "transparent", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 3, fontSize: 13, cursor: "pointer" }}>Cancel</button>
      </div>

      <AsBoEditBlock title="Tags">
        <input
          type="text"
          value={typeof draft.tags === "string" ? draft.tags : (Array.isArray(draft.tags) ? draft.tags.join(", ") : "")}
          onChange={e => update("tags", e.target.value)}
          placeholder="comma-separated"
          style={asboInputStyle()}
        />
      </AsBoEditBlock>

      <AsBoEditBlock title="Identity">
        <AsBoEditRow label="Kind" hint="Computable kinds drive phase math, eclipses, and alignment queries. Narrative kinds are lore-only — orbital math is skipped.">
          <select
            value={draft.kind || ""}
            onChange={e => update("kind", e.target.value)}
            style={asboInputStyle()}
          >
            <optgroup label="Computable (orbital math)">
              {BODY_KINDS.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
            </optgroup>
            <optgroup label="Narrative (lore only)">
              {NARRATIVE_BODY_KINDS.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
            </optgroup>
          </select>
        </AsBoEditRow>
        <AsBoEditRow label="Parent Body" hint={eligibleParents.length === 0 ? "No bodies exist yet to orbit. Create a parent (a star, planet, etc.) first, then return here to set it." : undefined}>
          <EntryRefEditor
            field={parentField}
            value={draft.parentBodyId}
            onChange={v => {
              // Non-relation single-value EntryRefEditor returns a string
              // (selected id) or "" (cleared). Coerce both empty and
              // missing-shape values to null so the body's parentBodyId
              // stays clean ("" → null prevents top-level-vs-orphan confusion
              // in the tree).
              if (!v) update("parentBodyId", null);
              else if (typeof v === "string") update("parentBodyId", v);
              else if (v && v.id) update("parentBodyId", v.id);
              else update("parentBodyId", null);
            }}
            entries={entries}
            templates={templates}
            bodies={eligibleParents}
            selfEntryId={body.id}
            calendar={calendar}
          />
        </AsBoEditRow>
        <AsBoEditRow label="Other Names">
          <input type="text" value={draft.otherNames || ""} onChange={e => update("otherNames", e.target.value)} style={asboInputStyle()} />
        </AsBoEditRow>
        <AsBoEditRow label="Type (narrative)" hint="Free-form. The kind picker above is the structured taxonomy; this field holds any v1.4 or user-curated type label.">
          <input type="text" value={draft.type || ""} onChange={e => update("type", e.target.value)} style={asboInputStyle()} />
        </AsBoEditRow>
        <AsBoEditRow label="Status">
          <div style={{ display: "flex", gap: 6 }}>
            <select
              value={statusValue}
              onChange={e => {
                const v = e.target.value;
                if (!v) update("status", null);
                else if (v === "Other") update("status", { value: "Other", customText: statusCustom });
                else update("status", { value: v, customText: "" });
              }}
              style={{ ...asboInputStyle(), flex: 1 }}
            >
              <option value="">— None —</option>
              {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            {statusValue === "Other" && (
              <input
                type="text"
                value={statusCustom}
                onChange={e => update("status", { value: "Other", customText: e.target.value })}
                placeholder="Custom status…"
                style={{ ...asboInputStyle(), flex: 1 }}
              />
            )}
          </div>
        </AsBoEditRow>
        <AsBoEditRow label="Discovered / Founded">
          <CalendarDateEditor
            value={draft.discoveredFounded}
            onChange={v => update("discoveredFounded", v)}
            calendar={calendar}
            allowApproximate={true}
          />
        </AsBoEditRow>
      </AsBoEditBlock>

      {isComputable && draft.parentBodyId && (
        <AsBoOrbitalEditBlock
          draft={draft}
          setDraft={setDraft}
          parentBody={parentBodyForDraft}
        />
      )}
      {isComputable && !draft.parentBodyId && (
        // v1.5 r042: surface why the Orbital Elements block isn't showing.
        // Mirrors the narrative-kind note below in style + tone.
        <div style={{ marginTop: 16, padding: 12, background: "var(--surf2)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text-dim)", fontSize: 12, lineHeight: 1.5 }}>
          Orbital elements appear here once a Parent Body is set above. Top-level bodies (a root star, an unattached rogue planet, etc.) have no orbit to edit.
        </div>
      )}

      {draft.kind === "moon" && (
        <AsBoSynodicEditBlock
          draft={draft}
          setDraft={setDraft}
          bodiesById={bodiesById}
        />
      )}

      {isComputable && (
        <AsBoPhysicalEditBlock
          draft={draft}
          setDraft={setDraft}
        />
      )}

      {isComputable && (
        <AsBoSecondaryDerivedBlock
          body={draft}
          bodies={bodies}
          isComputable={isComputable}
        />
      )}

      <AsBoEditBlock title="Physical (narrative)">
        <AsBoEditRow label="Atmosphere">
          <input type="text" value={draft.atmosphere || ""} onChange={e => update("atmosphere", e.target.value)} style={asboInputStyle()} />
        </AsBoEditRow>
        <AsBoEditRow label="Gravity">
          <input type="text" value={draft.gravity || ""} onChange={e => update("gravity", e.target.value)} style={asboInputStyle()} />
        </AsBoEditRow>
        <AsBoEditRow label="Rotation Period (days)" tooltip={FIELD_TOOLTIPS.rotationPeriod}>
          <input
            type="number"
            value={draft.rotationPeriod ?? ""}
            onChange={e => {
              const v = e.target.value;
              update("rotationPeriod", v === "" ? null : parseFloat(v));
            }}
            style={asboInputStyle()}
            step="any"
          />
        </AsBoEditRow>
      </AsBoEditBlock>

      <AsBoEditBlock title="References">
        <AsBoChildrenRow
          body={body}
          bodies={bodies}
          onSelectBody={onSelectBody}
          onCreateChildBody={onCreateChildBody}
          isLocked={isLocked}
        />
        <AsBoEditRow label="Visible From">
          <EntryRefEditor field={visibleFromField} value={draft.visibleFrom || []} onChange={v => update("visibleFrom", v)} entries={entries} templates={templates} bodies={bodies} selfEntryId={body.id} calendar={calendar} />
        </AsBoEditRow>
        <AsBoEditRow label="Notable Locations">
          <EntryRefEditor field={notableLocationsField} value={draft.notableLocations || []} onChange={v => update("notableLocations", v)} entries={entries} templates={templates} bodies={bodies} selfEntryId={body.id} calendar={calendar} />
        </AsBoEditRow>
        <AsBoEditRow label="Inhabited By">
          <EntryRefEditor field={inhabitedByField} value={draft.inhabitedBy || []} onChange={v => update("inhabitedBy", v)} entries={entries} templates={templates} bodies={bodies} selfEntryId={body.id} calendar={calendar} />
        </AsBoEditRow>
        <AsBoEditRow label="Sacred to">
          <EntryRefEditor field={sacredToField} value={draft.sacredTo || []} onChange={v => update("sacredTo", v)} entries={entries} templates={templates} bodies={bodies} selfEntryId={body.id} calendar={calendar} />
        </AsBoEditRow>
      </AsBoEditBlock>

      <AsBoEditBlock title="Narrative">
        <AsBoEditRow label="Physical Properties">
          <AutoTextarea value={draft.physicalProperties || ""} onChange={v => update("physicalProperties", v)} placeholder="Physical Properties" />
        </AsBoEditRow>
        <AsBoEditRow label="Climate / Conditions">
          <AutoTextarea value={draft.climateConditions || ""} onChange={v => update("climateConditions", v)} placeholder="Climate / Conditions" />
        </AsBoEditRow>
        <AsBoEditRow label="Mythological Significance">
          <AutoTextarea value={draft.mythologicalSignificance || ""} onChange={v => update("mythologicalSignificance", v)} placeholder="Mythological Significance" />
        </AsBoEditRow>
        <AsBoEditRow label="Description">
          <AutoTextarea value={draft.description || ""} onChange={v => update("description", v)} placeholder="Description" />
        </AsBoEditRow>
        <AsBoEditRow label="History">
          <AutoTextarea value={draft.history || ""} onChange={v => update("history", v)} placeholder="History" />
        </AsBoEditRow>
        <AsBoEditRow label="Notes">
          <AutoTextarea value={draft.notes || ""} onChange={v => update("notes", v)} placeholder="Notes" />
        </AsBoEditRow>
      </AsBoEditBlock>

      {/* r021: per-body color override for Observe rendering. Lives at
          the bottom of the edit form as display/metadata, not body data.
          Writes immediately to state.ephemeris.observe.bodyColorOverrides
          rather than through draft — color is view state, not entity
          state, so the Save button doesn't gate it. */}
      <AsBoEditBlock title="Display">
        {(() => {
          const observeSlice = state?.ephemeris?.observe;
          const kindColorsMap = (observeSlice && observeSlice.kindColors && typeof observeSlice.kindColors === "object") ? observeSlice.kindColors : {};
          const bodyOverridesMap = (observeSlice && observeSlice.bodyColorOverrides && typeof observeSlice.bodyColorOverrides === "object") ? observeSlice.bodyColorOverrides : {};
          const hasOverride = typeof bodyOverridesMap[body.id] === "string" && !!bodyOverridesMap[body.id];
          const kindOverride = typeof kindColorsMap[body.kind] === "string" && !!kindColorsMap[body.kind];
          const effective = bodyOverridesMap[body.id] || kindColorsMap[body.kind] || observeColorForKind(body.kind);
          const sourceLabel = hasOverride
            ? "per-body override"
            : (kindOverride ? "kind override" : "kind default");
          return (
            <AsBoEditRow
              label="Color (Observe)"
              hint="Used by the Observe view for this body and its orbit/trail. Per-body overrides kind colors."
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="color"
                  value={effective}
                  onChange={(e) => onSetBodyColor && onSetBodyColor(body.id, e.target.value)}
                  disabled={!onSetBodyColor}
                  style={{
                    width: 36,
                    height: 24,
                    padding: 0,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    cursor: !onSetBodyColor ? "default" : "pointer",
                  }}
                />
                <button
                  onClick={() => onSetBodyColor && onSetBodyColor(body.id, null)}
                  disabled={!hasOverride || !onSetBodyColor}
                  title={hasOverride ? "Clear the per-body override; fall back to kind color" : "(no per-body override set)"}
                  style={{
                    padding: "3px 10px",
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--text-dim)",
                    fontSize: 11,
                    cursor: (!hasOverride || !onSetBodyColor) ? "default" : "pointer",
                    fontFamily: "inherit",
                    borderRadius: 3,
                    opacity: hasOverride ? 1 : 0.5,
                  }}
                >Reset to default</button>
                <span style={{ fontSize: 11, color: "var(--text-dim)", fontStyle: "italic" }}>
                  {sourceLabel}
                </span>
              </div>
            </AsBoEditRow>
          );
        })()}
      </AsBoEditBlock>

      {!isComputable && (
        <div style={{ marginTop: 16, padding: 12, background: "var(--surf2)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text-dim)", fontSize: 12, lineHeight: 1.5 }}>
          Narrative kind — does not participate in the Compute / Observe / Event surfaces. Orbital elements and physical parameters are skipped for this body.
        </div>
      )}
    </div>
  );
}

function AsBoEditBlock({ title, children }) {
  return (
    <div style={{ marginTop: 18, padding: "12px 14px", background: "var(--surf)", border: "1px solid var(--border)", borderRadius: 4 }}>
      <div style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 10, fontWeight: 600 }}>{title}</div>
      {children}
    </div>
  );
}

// v1.5 r041: plain-language explanations for the technical orbital and
// physical fields. Shown via the AsBoEditRow / AsBoFieldRow `tooltip` prop —
// hover the label text and the browser surfaces this as a tooltip. Written
// for worldbuilders who haven't taken orbital mechanics; uses Earth/Sun
// referents for grounding, no calculus.
const FIELD_TOOLTIPS = {
  semiMajorAxis: "How big the orbit is — half the long axis. Measured in AU (1 AU = Earth-Sun distance). Useful reference points: Earth's Moon orbits Earth at 0.00257 AU; Jupiter orbits the Sun at 5.2 AU. Bigger number = wider orbit = longer period.",
  eccentricity: "How squashed the orbit is. 0 is a perfect circle. 0.5 is a clear oval. Closer to 1 means very stretched (the body swings far out, then back close). Earth's orbit around the Sun is about 0.017 — nearly circular. Luna's orbit around Earth is about 0.055.",
  inclination: "How tilted the orbit is, compared to a flat reference plane. 0° = orbits flat. 90° = orbits sideways over the poles. Most planets orbit nearly flat; moons sometimes have larger tilts (Luna's is 5°).",
  ascendingNode: "Imagine the tilted orbit crossing a flat reference plane: this is where it crosses going upward, expressed as an angle around the parent body. Changing it swivels the whole orbit around the parent.",
  argumentOfPeriapsis: "Where in the orbit the body comes closest to its parent. Measured as an angle along the orbital path from the ascending node. Change it and the closest-approach point shifts to a different part of the orbit.",
  meanAnomalyAtEpoch: "Where in the orbit the body is at day zero of your world. Just the starting position — 0° means starting at periapsis (closest point), 180° means starting at apoapsis (farthest).",
  mass: "How heavy the body is, in Earth masses. Earth = 1, Sun ≈ 332,946. Used for orbit math: heavier parents mean their satellites orbit faster.",
  radius: "How big the body is across, in Earth radii. Earth = 1, Sun ≈ 109. Display-only — doesn't affect orbital math.",
  axialTilt: "How much the body's spin axis leans relative to its orbital plane. Earth's is about 23.5°, which is what gives Earth its seasons. Display-only.",
  rotationPeriod: "How long the body takes to spin once on its axis (your local 'day length'). Earth = 1, Venus = 243. Display-only.",
  synodicCycleDays: "How many days one full new→full→new moon cycle takes. Earth's real Moon takes about 29.5 days. Used when there's no orbital geometry to compute phase from.",
  phaseAnchorDay: "An absolute day in your world when this moon is at the New phase. Everything else in the cycle counts from there.",
};

function AsBoEditRow({ label, hint, tooltip, children }) {
  // v1.5 r041: optional `tooltip` shows a plain-language explanation on hover
  // over the label TEXT (not the input). Distinct from `hint`, which renders
  // as static italic copy below the label. Used to demystify the astronomy
  // jargon on orbital/physical fields without crowding the form layout.
  const labelEl = tooltip ? (
    <span title={tooltip} style={{ borderBottom: "1px dotted var(--text-dim)", cursor: "help" }}>{label}</span>
  ) : label;
  return (
    <div style={{ display: "flex", padding: "5px 0", fontSize: 13, lineHeight: 1.5, alignItems: "flex-start" }}>
      <div style={{ width: 200, color: "var(--text-dim)", flexShrink: 0, paddingTop: 6 }}>
        {labelEl}
        {hint && <div style={{ fontSize: 11, color: "var(--text-dim)", fontStyle: "italic", marginTop: 2, lineHeight: 1.4 }}>{hint}</div>}
      </div>
      <div style={{ flex: 1, color: "var(--text)", minWidth: 0 }}>{children}</div>
    </div>
  );
}

// Shared input style for AsBo editor controls. Matches the input class
// used elsewhere in Cartulary so the editor blends in with EntryForm-side
// editing surfaces.
const asboInputStyle = () => ({
  width: "100%",
  padding: "6px 8px",
  background: "var(--surf2)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  borderRadius: 3,
  fontSize: 13,
  fontFamily: "inherit",
  boxSizing: "border-box",
});

// Editor block for the six classical orbital elements. Renders only when
// the body has a parent (top-level bodies don't have orbits to edit per
// AB.2 doctrine: "Orbital: expanded for bodies with parents; collapsed/
// hidden for stars"). The orbital block is also gated on isComputable in
// the caller — narrative kinds skip orbital math entirely.
//
// Eccentricity gets a slider 0–0.99 plus a synced numeric input. The cap
// matches the doctrine entry "Ephemeris math depth is full Keplerian, not
// simplified" — parabolic and hyperbolic trajectories (e ≥ 1) are out of
// scope for v1.5; the math assumes bound elliptical orbits throughout.
//
// Derived values (orbital period, perihelion/aphelion) render inline at
// the bottom of the block per AB.6 "Hybrid inline + panel" — primary
// derivations beside their source block. Period needs parent mass; when
// parent mass is missing, the row labels what's missing rather than just
// rendering "—" (better UX hint than a silent dash).
function AsBoOrbitalEditBlock({ draft, setDraft, parentBody }) {
  const oe = draft.orbitalElements || {};
  const updateOrbital = (key, value) => {
    setDraft({
      ...draft,
      orbitalElements: { ...(draft.orbitalElements || {}), [key]: value },
    });
  };
  // v1.5 r043: kind-aware sample orbital values for the "Use sample values"
  // button. Gives a working circular orbit at a reasonable scale for the
  // body's kind so an explorer can see the math do something without picking
  // six numbers. Fallback is Earth-like (1 AU) for any kind not listed.
  const SAMPLE_SMA_BY_KIND = {
    star: 0.1, planet: 1, moon: 0.00257, "dwarf-planet": 30,
    asteroid: 2.5, comet: 10, "rogue-planet": 1, "black-hole": 10,
    "meteor-shower": 1,
  };
  const applySampleOrbit = () => {
    const sma = SAMPLE_SMA_BY_KIND[draft.kind] != null ? SAMPLE_SMA_BY_KIND[draft.kind] : 1;
    // Confirm only if any orbital element has been edited from its default
    // (semiMajorAxis null + everything else 0). Avoids a needless prompt on
    // fresh bodies; protects against blowing away user work on edited ones.
    const hasUserData = oe.semiMajorAxis != null
      || (Number.isFinite(oe.eccentricity)        && oe.eccentricity        !== 0)
      || (Number.isFinite(oe.inclination)         && oe.inclination         !== 0)
      || (Number.isFinite(oe.ascendingNode)       && oe.ascendingNode       !== 0)
      || (Number.isFinite(oe.argumentOfPeriapsis) && oe.argumentOfPeriapsis !== 0)
      || (Number.isFinite(oe.meanAnomalyAtEpoch)  && oe.meanAnomalyAtEpoch  !== 0);
    if (hasUserData && !window.confirm("Replace current orbital values with sample values for this kind?")) return;
    setDraft({
      ...draft,
      orbitalElements: {
        semiMajorAxis: sma,
        eccentricity: 0,
        inclination: 0,
        ascendingNode: 0,
        argumentOfPeriapsis: 0,
        meanAnomalyAtEpoch: 0,
      },
    });
  };
  // Numeric input → updateOrbital. Empty string clears to null (vs 0,
  // which is a meaningful value for inclination / mean anomaly / ω / Ω
  // and shouldn't be confused with "unset"). Defensive parseFloat handles
  // partial input like "1e" during typing — invalid parses pass through
  // as NaN, the store rejects NaN by coercing back to null.
  const numericChange = (key, raw) => {
    if (raw === "" || raw == null) return updateOrbital(key, null);
    const n = parseFloat(raw);
    updateOrbital(key, Number.isFinite(n) ? n : null);
  };

  // Eccentricity slider (range input) drives the same store key as the
  // numeric field. The range step is 0.01 (100 stops across 0–0.99) which
  // is precise enough for slider-driven edits; the numeric field allows
  // finer entry. Slider value clamps the display to 0 when the stored
  // value is null/invalid so the thumb has a real position.
  const eccDisplayValue = Number.isFinite(oe.eccentricity)
    ? Math.max(0, Math.min(0.99, oe.eccentricity))
    : 0;
  const onEccSlider = (raw) => {
    const n = parseFloat(raw);
    if (Number.isFinite(n)) updateOrbital("eccentricity", Math.max(0, Math.min(0.99, n)));
  };
  const onEccNumber = (raw) => {
    if (raw === "" || raw == null) return updateOrbital("eccentricity", null);
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return updateOrbital("eccentricity", null);
    updateOrbital("eccentricity", Math.max(0, Math.min(0.99, n)));
  };

  const a = oe.semiMajorAxis;
  const e = oe.eccentricity;
  const parentMass = parentBody?.physicalParams?.mass;
  const apsides = computeApsides(a, e);
  const periodDays = computeOrbitalPeriodDays(a, parentMass);
  // Tidal lock detection — rotation period matching orbital period
  // signals 1:1 spin-orbit lock. Most worldbuilder-relevant for moons but
  // applies to any orbiter with both periods set (e.g., a tidally-locked
  // exoplanet around a close-in star).
  const tidalLockStatus = computeTidalLockStatus(draft.rotationPeriod, periodDays);

  // Derived values are shown inline at the bottom of the block, separated
  // from the editable rows with a thin border so the visual hierarchy is
  // clear (editable above, derived below). Block hides entirely when no
  // derived values are computable yet — avoids a "Derived: — / —" stub
  // before the user has entered any orbital data.
  const hasAnyDerived = apsides || Number.isFinite(periodDays) || tidalLockStatus;

  return (
    <AsBoEditBlock title="Orbital Elements">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
        <button
          onClick={applySampleOrbit}
          title="Fill these six values with a working circular orbit at a reasonable scale for this body's kind. Tweak from there."
          style={{
            padding: "4px 10px", fontSize: 11, fontFamily: "inherit",
            background: "transparent", color: "var(--text-dim)",
            border: "1px solid var(--border)", borderRadius: 3, cursor: "pointer",
          }}
        >Use sample values</button>
      </div>
      <AsBoEditRow label="Semi-major axis (AU)" tooltip={FIELD_TOOLTIPS.semiMajorAxis}>
        <input
          type="number"
          value={Number.isFinite(a) ? a : ""}
          onChange={e => numericChange("semiMajorAxis", e.target.value)}
          style={asboInputStyle()}
          step="any"
          min="0"
        />
      </AsBoEditRow>
      <AsBoEditRow label="Eccentricity" tooltip={FIELD_TOOLTIPS.eccentricity} hint="Bound elliptical orbits only (0 ≤ e ≤ 0.99). Parabolic and hyperbolic trajectories out of scope.">
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            type="range"
            value={eccDisplayValue}
            onChange={e => onEccSlider(e.target.value)}
            min="0"
            max="0.99"
            step="0.01"
            style={{ flex: 1, accentColor: "var(--accent)" }}
          />
          <input
            type="number"
            value={Number.isFinite(e) ? e : ""}
            onChange={e => onEccNumber(e.target.value)}
            style={{ ...asboInputStyle(), width: 90, flex: "0 0 auto" }}
            step="0.01"
            min="0"
            max="0.99"
          />
        </div>
      </AsBoEditRow>
      <AsBoEditRow label="Inclination (°)" tooltip={FIELD_TOOLTIPS.inclination}>
        <input
          type="number"
          value={Number.isFinite(oe.inclination) ? oe.inclination : ""}
          onChange={e => numericChange("inclination", e.target.value)}
          style={asboInputStyle()}
          step="any"
        />
      </AsBoEditRow>
      <AsBoEditRow label="Ascending node Ω (°)" tooltip={FIELD_TOOLTIPS.ascendingNode}>
        <input
          type="number"
          value={Number.isFinite(oe.ascendingNode) ? oe.ascendingNode : ""}
          onChange={e => numericChange("ascendingNode", e.target.value)}
          style={asboInputStyle()}
          step="any"
        />
      </AsBoEditRow>
      <AsBoEditRow label="Argument of periapsis ω (°)" tooltip={FIELD_TOOLTIPS.argumentOfPeriapsis}>
        <input
          type="number"
          value={Number.isFinite(oe.argumentOfPeriapsis) ? oe.argumentOfPeriapsis : ""}
          onChange={e => numericChange("argumentOfPeriapsis", e.target.value)}
          style={asboInputStyle()}
          step="any"
        />
      </AsBoEditRow>
      <AsBoEditRow label="Mean anomaly at epoch (°)" tooltip={FIELD_TOOLTIPS.meanAnomalyAtEpoch}>
        <input
          type="number"
          value={Number.isFinite(oe.meanAnomalyAtEpoch) ? oe.meanAnomalyAtEpoch : ""}
          onChange={e => numericChange("meanAnomalyAtEpoch", e.target.value)}
          style={asboInputStyle()}
          step="any"
        />
      </AsBoEditRow>
      {hasAnyDerived && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 6, fontWeight: 600 }}>Derived</div>
          {apsides && (
            <>
              <AsBoEditRow label="Periapsis (closest)">
                <span style={{ fontSize: 13, color: "var(--text)" }}>{fmtNum(apsides.perihelion, "AU")}</span>
              </AsBoEditRow>
              <AsBoEditRow label="Apoapsis (farthest)">
                <span style={{ fontSize: 13, color: "var(--text)" }}>{fmtNum(apsides.aphelion, "AU")}</span>
              </AsBoEditRow>
            </>
          )}
          <AsBoEditRow label="Orbital period">
            <span style={{ fontSize: 13, color: "var(--text)" }}>
              {Number.isFinite(periodDays)
                ? formatOrbitalPeriod(periodDays)
                : <span style={{ color: "var(--text-dim)", fontStyle: "italic" }}>
                    {!Number.isFinite(a) ? "needs semi-major axis"
                      : !parentBody ? "needs parent body"
                      : !Number.isFinite(parentMass) ? `needs ${parentBody.name || "parent"}'s mass`
                      : "—"}
                  </span>
              }
            </span>
          </AsBoEditRow>
          {tidalLockStatus && (
            <AsBoEditRow label="Tidal lock">
              <span style={{ fontSize: 13, color: "var(--text)" }}>
                {tidalLockStatus === "locked"
                  ? <span>Tidally locked <span style={{ color: "var(--text-dim)", fontSize: 11, marginLeft: 6, fontStyle: "italic" }}>(rotation ≈ orbital period)</span></span>
                  : <span>Free rotation <span style={{ color: "var(--text-dim)", fontSize: 11, marginLeft: 6, fontStyle: "italic" }}>(rotation ≠ orbital period)</span></span>
                }
              </span>
            </AsBoEditRow>
          )}
        </div>
      )}
    </AsBoEditBlock>
  );
}

// Editor block for physical parameters: mass, radius, axial tilt. Mass in
// Earth masses (M⊕), radius in Earth radii (R⊕), tilt in degrees, all per
// AB.9 fixed-units doctrine. For stars the doctrine notes radius could
// switch to solar radii — deferred to a future kind-aware-units pass.
//
// Surface gravity shown as inline derived value below the inputs, in
// Earth-g units (Earth = 1.0g; dimensionless ratio M/R²). Other derived
// physical values (escape velocity, Schwarzschild radius, density, etc.)
// land in r009's secondary-derived collapsible panel per AB.6.
function AsBoSynodicEditBlock({ draft, setDraft, bodiesById }) {
  // Synodic-cycle fallback for moon phase. Always shown on moons. When the
  // moon has complete orbital geometry the calendar grid computes phase
  // geometrically and these values are inert — the block dims and says so,
  // but stays editable so the user can pre-set a fallback.
  //
  // legacyCycle (the v1.4 migration carrier) was promoted into these
  // first-class fields at load-time migration, so this block reads them
  // directly — there is no separate fallback store any more.
  const effCycle = Number.isFinite(draft.synodicCycleDays) ? draft.synodicCycleDays : null;
  const effAnchor = Number.isFinite(draft.phaseAnchorDay) ? draft.phaseAnchorDay : null;

  const setCycle = (raw) => {
    if (raw === "" || raw == null) return setDraft({ ...draft, synodicCycleDays: null });
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return setDraft({ ...draft, synodicCycleDays: null });
    setDraft({ ...draft, synodicCycleDays: Math.max(1, Math.round(n * 10) / 10) });
  };
  const setAnchor = (raw) => {
    if (raw === "" || raw == null) return setDraft({ ...draft, phaseAnchorDay: null });
    const n = parseInt(raw, 10);
    setDraft({ ...draft, phaseAnchorDay: Number.isFinite(n) ? n : null });
  };

  const geometryAvailable = computeMoonPhaseGeometric(draft, 0, bodiesById) != null;

  return (
    <AsBoEditBlock title="Synodic Cycle (moon phase fallback)">
      <div style={{
        fontSize: 12,
        color: "var(--text-dim)",
        fontStyle: "italic",
        lineHeight: 1.5,
        marginBottom: 10,
      }}>
        {geometryAvailable
          ? "Full orbital geometry is set — the calendar grid computes this moon's phase from its orbit. These values are kept as a fallback but aren't currently used."
          : "No orbital geometry yet — the calendar grid uses these values to draw this moon's phase. Set a parent body, semi-major axis, and parent mass to switch to geometric phase."}
      </div>
      <div style={{ opacity: geometryAvailable ? 0.5 : 1 }}>
        <AsBoEditRow label="Synodic cycle (days)" tooltip={FIELD_TOOLTIPS.synodicCycleDays} hint="Length of one new→full→new cycle. Tenths allowed (e.g. 29.5).">
          <input
            type="number"
            value={Number.isFinite(effCycle) ? effCycle : ""}
            onChange={e => setCycle(e.target.value)}
            style={asboInputStyle()}
            step="0.1"
            min="1"
          />
        </AsBoEditRow>
        <AsBoEditRow label="Phase anchor (day)" tooltip={FIELD_TOOLTIPS.phaseAnchorDay} hint="Absolute day on which this moon is New (phase zero).">
          <input
            type="number"
            value={Number.isFinite(effAnchor) ? effAnchor : ""}
            onChange={e => setAnchor(e.target.value)}
            style={asboInputStyle()}
            step="1"
          />
        </AsBoEditRow>
      </div>
    </AsBoEditBlock>
  );
}

function AsBoPhysicalEditBlock({ draft, setDraft }) {
  const pp = draft.physicalParams || {};
  const updatePhysical = (key, value) => {
    setDraft({
      ...draft,
      physicalParams: { ...(draft.physicalParams || {}), [key]: value },
    });
  };
  const numericChange = (key, raw) => {
    if (raw === "" || raw == null) return updatePhysical(key, null);
    const n = parseFloat(raw);
    updatePhysical(key, Number.isFinite(n) ? n : null);
  };

  const surfaceG = computeSurfaceGravity(pp.mass, pp.radius);

  return (
    <AsBoEditBlock title="Physical Parameters">
      <AsBoEditRow label="Mass (M⊕)" tooltip={FIELD_TOOLTIPS.mass} hint="Earth masses. Sun ≈ 332946 M⊕ if entering a star. Required for any satellites of this body to compute orbital motion.">
        <input
          type="number"
          value={Number.isFinite(pp.mass) ? pp.mass : ""}
          onChange={e => numericChange("mass", e.target.value)}
          style={asboInputStyle()}
          step="any"
          min="0"
        />
      </AsBoEditRow>
      <AsBoEditRow label="Radius (R⊕)" tooltip={FIELD_TOOLTIPS.radius} hint="Earth radii.">
        <input
          type="number"
          value={Number.isFinite(pp.radius) ? pp.radius : ""}
          onChange={e => numericChange("radius", e.target.value)}
          style={asboInputStyle()}
          step="any"
          min="0"
        />
      </AsBoEditRow>
      <AsBoEditRow label="Axial tilt (°)" tooltip={FIELD_TOOLTIPS.axialTilt}>
        <input
          type="number"
          value={Number.isFinite(pp.axialTilt) ? pp.axialTilt : ""}
          onChange={e => numericChange("axialTilt", e.target.value)}
          style={asboInputStyle()}
          step="any"
        />
      </AsBoEditRow>
      {draft.kind === "star" && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 6, fontWeight: 600 }}>Habitable zone</div>
          <AsBoEditRow
            label="Model"
            hint="How to compute the habitable zone bounds. Conservative is the classic narrow Kasting (1993) range; optimistic uses the wider Kopparapu (2013) limits (recent-Venus to early-Mars); manual lets you set inner and outer bounds directly."
          >
            <select
              value={pp.hzModel || "conservative"}
              onChange={e => updatePhysical("hzModel", e.target.value)}
              style={asboInputStyle()}
            >
              <option value="conservative">Conservative (Kasting 1993)</option>
              <option value="optimistic">Optimistic (Kopparapu 2013)</option>
              <option value="manual">Manual bounds</option>
            </select>
          </AsBoEditRow>
          {(pp.hzModel || "conservative") !== "manual" && (
            <AsBoEditRow
              label="Luminosity override (L☉)"
              hint="Optional. Solar luminosity units. Leave blank to derive from stellar mass via main-sequence physics (L = M^3.5). Set explicitly for giants, pre-main-sequence stars, or anything else where M-L doesn't apply."
            >
              <input
                type="number"
                value={Number.isFinite(pp.luminosity) ? pp.luminosity : ""}
                onChange={e => numericChange("luminosity", e.target.value)}
                style={asboInputStyle()}
                step="any"
                min="0"
                placeholder="(derive from mass)"
              />
            </AsBoEditRow>
          )}
          {(pp.hzModel || "conservative") === "manual" && (
            <>
              <AsBoEditRow
                label="Inner bound (AU)"
                hint="Innermost orbital distance considered habitable. Closer than this, the planet would be too hot (runaway greenhouse, water loss)."
              >
                <input
                  type="number"
                  value={Number.isFinite(pp.hzInnerAU) ? pp.hzInnerAU : ""}
                  onChange={e => numericChange("hzInnerAU", e.target.value)}
                  style={asboInputStyle()}
                  step="any"
                  min="0"
                />
              </AsBoEditRow>
              <AsBoEditRow
                label="Outer bound (AU)"
                hint="Outermost orbital distance considered habitable. Beyond this, the planet would be too cold (CO₂ condensation, snowball)."
              >
                <input
                  type="number"
                  value={Number.isFinite(pp.hzOuterAU) ? pp.hzOuterAU : ""}
                  onChange={e => numericChange("hzOuterAU", e.target.value)}
                  style={asboInputStyle()}
                  step="any"
                  min="0"
                />
              </AsBoEditRow>
            </>
          )}
        </div>
      )}
      {Number.isFinite(surfaceG) && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 6, fontWeight: 600 }}>Derived</div>
          <AsBoEditRow label="Surface gravity">
            <span style={{ fontSize: 13, color: "var(--text)" }}>
              {fmtNum(surfaceG, "g")}
              <span style={{ color: "var(--text-dim)", fontSize: 12, marginLeft: 6 }}>
                ({fmtNum(surfaceG * 9.81, "m/s²")})
              </span>
            </span>
          </AsBoEditRow>
        </div>
      )}
    </AsBoEditBlock>
  );
}

// Collapsible "Derived values" block per AB.2 (collapsed by default) and
// AB.6 (panel for secondary derivations). Renders the values that don't
// fit inline beside their source block: escape velocity, Schwarzschild
// radius (black holes only), Hill sphere, habitable zone (stars only),
// and synodic periods against siblings.
//
// Used in both view mode and edit mode — derived values are read-only in
// either context, so the same component serves. Block returns null when
// the body has no computable secondary derivations (e.g., a freshly-
// created body with no mass/radius yet) so the workspace doesn't show a
// vestigial empty toggle.
function AsBoSecondaryDerivedBlock({ body, bodies, isComputable }) {
  const [expanded, setExpanded] = useState(false);
  if (!isComputable) return null;

  const pp = body.physicalParams || {};
  const oe = body.orbitalElements || {};
  const parent = body.parentBodyId ? bodies.find(b => b.id === body.parentBodyId) : null;
  const parentMass = parent?.physicalParams?.mass;

  // Available kinds (only show what makes sense for this body's kind).
  const escapeVelocity = computeEscapeVelocityKmS(pp.mass, pp.radius);
  const hillSphere     = computeHillSphereAU(oe.semiMajorAxis, pp.mass, parentMass);
  const schwarzschild  = body.kind === "black-hole" ? computeSchwarzschildRadiusKm(pp.mass) : null;
  const habitableZone  = body.kind === "star" ? computeHabitableZoneAU(pp) : null;

  // Synodic periods against siblings sharing the same parent. Skips self;
  // skips siblings without enough data to compute a period. List unsorted
  // — preserves storage order so the user can correlate to tree order.
  const bodyPeriod = computeOrbitalPeriodDays(oe.semiMajorAxis, parentMass);
  const synodics = (parent && Number.isFinite(bodyPeriod))
    ? bodies
        .filter(b => b && b.id !== body.id && b.parentBodyId === body.parentBodyId)
        .map(sib => {
          const sibPeriod = computeOrbitalPeriodDays(sib.orbitalElements?.semiMajorAxis, parentMass);
          if (!Number.isFinite(sibPeriod)) return null;
          return { name: sib.name || "(unnamed)", period: computeSynodicPeriodDays(bodyPeriod, sibPeriod) };
        })
        .filter(Boolean)
    : [];

  const hasAny =
    escapeVelocity != null
    || hillSphere != null
    || schwarzschild != null
    || habitableZone != null
    || synodics.length > 0;
  if (!hasAny) return null;

  return (
    <div style={{ marginTop: 18, background: "var(--surf)", border: "1px solid var(--border)", borderRadius: 4 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%",
          padding: "12px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--text)",
          fontFamily: "inherit",
          textAlign: "left",
        }}
      >
        <span style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "var(--text-dim)", fontWeight: 600 }}>
          Derived values
        </span>
        <span style={{ color: "var(--text-dim)", fontSize: 11 }}>{expanded ? "▾ collapse" : "▸ expand"}</span>
      </button>
      {expanded && (
        <div style={{ padding: "0 14px 12px" }}>
          {escapeVelocity != null && (
            <AsBoFieldRow label="Escape velocity" value={`${escapeVelocity.toFixed(2)} km/s`} />
          )}
          {hillSphere != null && (
            <AsBoFieldRow label="Hill sphere" value={fmtNum(hillSphere, "AU")} />
          )}
          {schwarzschild != null && (
            <AsBoFieldRow label="Schwarzschild radius" value={fmtNum(schwarzschild, "km")} />
          )}
          {habitableZone && (
            <AsBoFieldRow
              label="Habitable zone"
              value={
                <span>
                  {habitableZone.innerAU.toFixed(3)} – {habitableZone.outerAU.toFixed(3)} AU
                  <span style={{ color: "var(--text-dim)", fontSize: 11, marginLeft: 8, fontStyle: "italic" }}>
                    {habitableZone.model === "manual"
                      ? "manual bounds"
                      : `Kasting (${habitableZone.model})${habitableZone.luminosityOverride ? ", L override" : ""}`}
                  </span>
                </span>
              }
            />
          )}
          {synodics.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4, fontStyle: "italic" }}>
                Synodic periods (recurrence vs siblings):
              </div>
              {synodics.map((s, i) => (
                <AsBoFieldRow
                  key={i}
                  label={`  vs ${s.name}`}
                  value={
                    s.period === Infinity
                      ? <span style={{ fontStyle: "italic", color: "var(--text-dim)" }}>identical period — never lap</span>
                      : formatOrbitalPeriod(s.period)
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Narrative-field renderer for AsBo. Uses MarkdownDisplay so wiki-links,
// entry-refs in prose, and lists render the way they would on an entry view.
// r026: wiki-links to body names now resolve here too (and on the entry
// side) via MarkdownDisplay's bodies prop.
function AsBoNarrativeField({ label, text, entries, templates, bodies, onOpenEntry }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 4, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text)" }}>
        <MarkdownDisplay markdown={text || ""} entries={entries} templates={templates} bodies={bodies} onOpenEntry={onOpenEntry} />
      </div>
    </div>
  );
}

function AsBoReadonlyBlock({ title, children }) {
  return (
    <div style={{ marginTop: 18, padding: "12px 14px", background: "var(--surf)", border: "1px solid var(--border)", borderRadius: 4 }}>
      <div style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 10, fontWeight: 600 }}>{title}</div>
      {children}
    </div>
  );
}

function AsBoFieldRow({ label, value, tooltip }) {
  // v1.5 r041: optional `tooltip` shows a plain-language explanation on hover
  // over the label text — view-mode counterpart of AsBoEditRow's tooltip.
  const labelEl = tooltip ? (
    <span title={tooltip} style={{ borderBottom: "1px dotted var(--text-dim)", cursor: "help" }}>{label}</span>
  ) : label;
  return (
    <div style={{ display: "flex", padding: "3px 0", fontSize: 13, lineHeight: 1.6 }}>
      <div style={{ width: 200, color: "var(--text-dim)", flexShrink: 0 }}>{labelEl}</div>
      <div style={{ flex: 1, color: "var(--text)" }}>{value}</div>
    </div>
  );
}

// v1.5 r016: derived children row for AsBo References block.
// Label adapts to parent kind — Moons for planet / dwarf-planet, Bodies
// for everything else. Generic enough that it doesn't lie when a
// worldbuilder uses an unusual parent/child arrangement.
function getChildrenLabel(parentKindId) {
  if (parentKindId === "planet" || parentKindId === "dwarf-planet") return "Moons";
  return "Bodies";
}

// Derived block: scans state.celestialBodies for entries whose
// parentBodyId points at this body. Always rendered (empty state shows
// placeholder + "+ Add body" button). Single source of truth stays
// parentBodyId on the child — this is a read-only display that lets
// users navigate by clicking, or create a new child with parentBodyId
// pre-filled. No denormalization, no reciprocity logic to maintain.
function AsBoChildrenRow({ body, bodies, onSelectBody, onCreateChildBody, isLocked }) {
  const label = getChildrenLabel(body.kind);
  const children = (bodies || []).filter(b => b && b.parentBodyId === body.id);
  return (
    <div style={{ display: "flex", padding: "3px 0", fontSize: 13, lineHeight: 1.6 }}>
      <div style={{ width: 200, color: "var(--text-dim)", flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, color: "var(--text)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          {children.length === 0 && (
            <span style={{ color: "var(--text-dim)", fontStyle: "italic", fontSize: 12 }}>None</span>
          )}
          {children.map(child => {
            const k = BODY_KIND_BY_ID[child.kind];
            const sym = k ? k.symbol : "?";
            return (
              <button
                key={child.id}
                onClick={() => onSelectBody && onSelectBody(child.id)}
                title={k ? `${child.name || "(unnamed)"} · ${k.label}` : (child.name || "(unnamed)")}
                style={{
                  padding: "2px 10px",
                  background: "var(--accent-glow)",
                  border: "1px solid var(--accent-dim)",
                  borderRadius: 12,
                  color: "var(--accent)",
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <span style={{ marginRight: 4, opacity: 0.7 }}>{sym}</span>
                {child.name || "(unnamed)"}
              </button>
            );
          })}
          {!isLocked && onCreateChildBody && (
            <button
              onClick={() => onCreateChildBody(body.id)}
              title={`Create a new body with ${body.name || "this body"} as its parent`}
              style={{
                padding: "2px 10px",
                background: "transparent",
                border: "1px dashed var(--border)",
                borderRadius: 12,
                color: "var(--text-dim)",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              + Add child body
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const asboLabelStyle = () => ({
  display: "block",
  fontSize: 11,
  letterSpacing: 0.5,
  textTransform: "uppercase",
  color: "var(--text-dim)",
  marginBottom: 4,
  fontWeight: 600,
});