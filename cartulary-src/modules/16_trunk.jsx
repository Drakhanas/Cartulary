
// ─── Settings ──────────────────────────────────────────────────────────────────

function SettingsView({ world, entries, templates, onUpdateMeta, onExport, onExportMarkdown, onExportMarkdownZip, onImport, onNewWorld, dirHandle, fsaaSupported, onSetupFolder, onDisconnectFolder, prefs, onUpdatePrefs, isLocked, onNavigateToKalendarium, onCreateManualSnapshot, onRestoreSnapshot, onExportSnapshot, onDeleteSnapshot }) {
  const fileRef = useRef(null);
  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    if (f) onImport(f);
    e.target.value = "";
  };

  return (
    <div className="settings-view">
      <div className="settings-section">
        <div className="section-hdr" style={{ marginTop: 0 }}>Appearance</div>
        <div className="form-field">
          <label className="form-label">Theme</label>
          <div className="appearance-options">
            {[
              { v: "default", label: "Default" },
              { v: "high-contrast", label: "High Contrast" },
            ].map(opt => (
              <button
                key={opt.v}
                type="button"
                className={`appearance-btn ${prefs.theme === opt.v ? "active" : ""}`}
                onClick={() => onUpdatePrefs({ theme: opt.v })}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="appearance-hint">High Contrast theme increases color contrast for low-vision accessibility (black/white/yellow).</div>
        </div>
        <div className="form-field">
          <label className="form-label">Font Size</label>
          <div className="appearance-options">
            {[
              { v: "small", label: "Small" },
              { v: "medium", label: "Medium" },
              { v: "large", label: "Large" },
              { v: "x-large", label: "Extra Large" },
            ].map(opt => (
              <button
                key={opt.v}
                type="button"
                className={`appearance-btn ${prefs.fontSize === opt.v ? "active" : ""}`}
                onClick={() => onUpdatePrefs({ fontSize: opt.v })}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="appearance-hint">Affects the entire UI. Family tree text uses its own zoom controls.</div>
        </div>
      </div>

      <div className="settings-section">
        <div className="section-hdr" style={{ marginTop: 0 }}>World</div>
        <div className="form-field">
          <label className="form-label">World Name</label>
          <input className="input" value={world.name} onChange={e => onUpdateMeta({ name: e.target.value })} />
        </div>
        <div className="form-field">
          <label className="form-label">Description</label>
          <AutoTextarea value={world.description} onChange={v => onUpdateMeta({ description: v })} placeholder="A short description of this world..." />
        </div>
      </div>

      <div className="settings-section">
        <div className="section-hdr">Variant Filter</div>
        <div className="cal-section-help">
          Filter the entry list to one variant of your world — an "Edition" field splitting
          content between rule editions, an "Era" field splitting it between world-ages, and
          so on. Name a Dropdown field below (matched by label across all templates) and a
          variant picker appears above the entry list. With a variant picked, entries whose
          field holds a different value are hidden; templates without the field, and entries
          with it unset, always stay visible. The optional second field names a Yes/No
          Dropdown marking an entry as belonging to every variant. Applies to the entry
          list only — views, exports, and reference pickers are never filtered.
        </div>
        <div className="form-field">
          <label className="form-label">Variant Field Label</label>
          <input
            className="input"
            value={world.variantAxis ? world.variantAxis.fieldLabel : ""}
            placeholder={"e.g. Edition"}
            onChange={e => {
              const v = e.target.value;
              if (!v.trim()) { onUpdateMeta({ variantAxis: null }); return; }
              // Changing the axis resets the active pick — a previously
              // active value is meaningless against a different field.
              onUpdateMeta({ variantAxis: { fieldLabel: v, flagLabel: world.variantAxis ? world.variantAxis.flagLabel : "", active: "" } });
            }}
          />
        </div>
        <div className="form-field">
          <label className="form-label">All-Variants Flag Field Label (optional)</label>
          <input
            className="input"
            value={world.variantAxis ? world.variantAxis.flagLabel : ""}
            placeholder={"e.g. Applies to Both Editions"}
            disabled={!world.variantAxis}
            onChange={e => onUpdateMeta({ variantAxis: { ...world.variantAxis, flagLabel: e.target.value } })}
          />
        </div>
      </div>

      <div className="settings-section">
        <div className="section-hdr">Calendar</div>
        <div className="cal-section-help">
          Calendar management has moved to <strong>Kalendarium</strong>. The world's primary calendar lives there alongside any additional calendars you've defined.
        </div>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "12px 14px",
          background: "var(--bg-panel)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          marginTop: 8,
        }}>
          <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
            Primary calendar: <strong style={{ color: "var(--text)" }}>{world.calendar?.name || "Gregorian"}</strong>
            {" · "}
            {world.calendar?.months?.length || 0} month{(world.calendar?.months?.length || 0) === 1 ? "" : "s"}
            {" · "}
            {(world.calendar?.eras || []).length} era{((world.calendar?.eras || []).length) === 1 ? "" : "s"}
          </div>
          <button className="btn btn-ghost" onClick={onNavigateToKalendarium}>
            Open Kalendarium →
          </button>
        </div>
      </div>

      <div className="settings-section">
        <div className="section-hdr">Images</div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-title">Image Folder</div>
            <div className="settings-row-desc">
              {fsaaSupported
                ? "Connect a folder where images are saved. Inserted images are written there as files; without a folder, images embed inline (larger save files)."
                : "Your browser doesn't support direct folder access. Images will embed inline as base64. For folder-based images, use Chrome or Edge."}
            </div>
            <div className={`fsaa-status ${dirHandle ? "connected" : ""}`} style={{ marginTop: 8 }}>
              <div className="fsaa-status-dot" />
              <span>{dirHandle ? `Connected: ${dirHandle.name}` : (fsaaSupported ? "No folder connected" : "Not supported in this browser")}</span>
            </div>
          </div>
          <div className="settings-row-action" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {fsaaSupported && (
              dirHandle
                ? <>
                    <button className="btn btn-ghost" onClick={onSetupFolder}>Change</button>
                    <button className="btn btn-danger" onClick={onDisconnectFolder}>Disconnect</button>
                  </>
                : <button className="btn btn-accent" onClick={onSetupFolder}>Connect Folder</button>
            )}
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="section-hdr">Access</div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-title">Lock to view-only</div>
            <div className="settings-row-desc">Hides edit / new / delete controls and disables the Calendar editor. Lock state persists in the save file. Unlocking requires a confirmation.</div>
          </div>
          <div className="settings-row-action">
            <div className={`toggle ${world.locked ? "on" : ""}`} onClick={() => {
              if (world.locked) {
                if (!confirm("Unlock this world? Edit controls will be visible again.")) return;
              }
              onUpdateMeta({ locked: !world.locked });
            }}>
              <div className="toggle-knob" />
            </div>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="section-hdr">Save File</div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-title">Export world</div>
            <div className="settings-row-desc">Download your world as a JSON file. This is the canonical save format — keep it next to your image folder.</div>
          </div>
          <div className="settings-row-action">
            <button className="btn btn-accent" onClick={onExport}>Export .json</button>
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-title">Export as Markdown</div>
            <div className="settings-row-desc">Download a human-readable Markdown version with all references resolved to names. Useful as a player handout, printed reference, or context for an AI assistant. Not a save file — use the JSON export to back up your world.</div>
          </div>
          <div className="settings-row-action" style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
            <button className="btn btn-accent" onClick={() => onExportMarkdown(false)}>Export .md</button>
            <button className="btn btn-ghost" onClick={() => onExportMarkdown(true)} title="Includes secret-marked fields. Use only for personal/GM reference.">Export .md (with secrets)</button>
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-title">Export as Markdown + images</div>
            <div className="settings-row-desc">Same as above, but bundled as a .zip with all referenced images in an <code>images/</code> folder alongside the .md. Image references in the Markdown point to <code>images/filename.ext</code>. Useful for sharing a self-contained world reference.</div>
          </div>
          <div className="settings-row-action" style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
            <button className="btn btn-accent" onClick={() => onExportMarkdownZip(false)}>Export .zip</button>
            <button className="btn btn-ghost" onClick={() => onExportMarkdownZip(true)} title="Includes secret-marked fields. Use only for personal/GM reference.">Export .zip (with secrets)</button>
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-title">Import world</div>
            <div className="settings-row-desc">Load a previously exported world file. This will replace the current world.</div>
          </div>
          <div className="settings-row-action">
            <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>Import .json</button>
            <input ref={fileRef} type="file" accept=".json,application/json" className="hidden-file-input" onChange={onPickFile} />
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="section-hdr">Reminders</div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-title">Backup reminder</div>
            <div className="settings-row-desc">When on, a banner appears at the top of the app once it's been more than 2 hours since your last JSON export and you have unsaved changes. The banner has Export and Snooze 1 hour buttons. Turn this off if you have your own backup workflow.</div>
          </div>
          <div className="settings-row-action">
            <div className={`toggle ${prefs.disableBackupReminder ? "" : "on"}`} onClick={() => onUpdatePrefs({ disableBackupReminder: !prefs.disableBackupReminder })}>
              <div className="toggle-knob" />
            </div>
          </div>
        </div>
      </div>

      <VersionHistoryPanel
        onCreateManual={onCreateManualSnapshot}
        onRestore={onRestoreSnapshot}
        onExport={onExportSnapshot}
        onDelete={onDeleteSnapshot}
      />

      <div className="danger-zone">
        <div className="danger-zone-title">Danger Zone</div>
        <div className="settings-row" style={{ borderBottom: "none", padding: "8px 0" }}>
          <div className="settings-row-info">
            <div className="settings-row-title">Start new world</div>
            <div className="settings-row-desc">Wipe everything and start fresh. Export first if you want to keep the current world.</div>
          </div>
          <div className="settings-row-action">
            <button className="btn btn-danger" onClick={onNewWorld}>Reset</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Graph view ────────────────────────────────────────────────────────────────

// Edge labels that get filtered out when links are being built. Lowercase,
// compared case-insensitively. Reasoning: "Description" and "Notes" are
// catch-all prose fields, so a [[wiki-link]] inside one produces an edge
// that just means "X is mentioned somewhere in Y's description prose" —
// which doesn't describe the relationship in any useful way. The edge
// still draws (the connection is real and worth seeing), but these labels
// are excluded from the concatenated text along the line. Adding more
// vague labels in future is a one-element addition to the set.
const VAGUE_EDGE_LABELS = new Set(["description", "notes"]);

function GraphView({ state, onOpenEntry, showSecrets, onSavePositions, zoomTransformRef }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [enabledTemplates, setEnabledTemplates] = useState(() => new Set());
  const [hoveredId, setHoveredId] = useState(null);

  // Focus mode: zoom in on one entry's neighborhood up to N hops away.
  // focusEntryId is the canonical entry ID (or null = show everything).
  // focusInputText is what's currently in the combobox input — only commits
  // to focusEntryId on exact name match. focusDepth is user-selectable
  // 1-15 hops; deeper values quickly include the whole graph in densely
  // connected worlds. Stored as string so typing in the input doesn't
  // fight intermediate empty/partial values.
  const [focusInputText, setFocusInputText] = useState("");
  const [focusEntryId, setFocusEntryId] = useState(null);
  const [focusDepthStr, setFocusDepthStr] = useState("1");
  const clampFocusDepth = (v) => Math.max(1, Math.min(15, parseInt(v, 10) || 1));
  const focusDepth = clampFocusDepth(focusDepthStr);

  // Latest-ref pattern for callbacks. The parent (App) passes fresh function
  // references every render — putting these in the simulation useEffect's
  // deps would re-run the whole d3 setup on every parent re-render, including
  // re-renders from unrelated state changes (like position writebacks below,
  // which need to NOT trigger a sim rebuild). Using a ref lets us call the
  // latest callback without depending on its identity.
  const onOpenEntryRef = useRef(onOpenEntry);
  const onSavePositionsRef = useRef(onSavePositions);
  useEffect(() => { onOpenEntryRef.current = onOpenEntry; });
  useEffect(() => { onSavePositionsRef.current = onSavePositions; });

  // v1.3: zoomTransformRef is hoisted to App so the viewport survives view-
  // away-and-back navigation, not just sim rebuilds within this mount. Each
  // sim init reads/writes the ref directly; see zoom setup in the simulation
  // useEffect below.

  // Build nodes + links from state
  const { nodes, links, perTemplateCount } = useMemo(() => {
    // v1.5 r076: synthetic templates (registered non-entry node sources, e.g.
    // Astronomical Body) join the template lookup so node coloring, the legend,
    // and toggles treat them uniformly with real templates.
    const synthTpls = getRegisteredSyntheticTemplates();
    const tplById = Object.fromEntries([...state.templates, ...synthTpls].map(t => [t.id, t]));
    const ents = state.entries.filter(e => enabledTemplates.has(e.templateId));

    // Registered nodes (bodies) gated by the same enabledTemplates toggle as
    // entries, keyed on their synthetic template id.
    const regNodes = getRegisteredGraphNodes(state).filter(n => enabledTemplates.has(n.templateId));

    // idSet spans entries AND registered nodes so addLink no longer drops
    // entry->body / body->body edges.
    const idSet = new Set([...ents.map(e => e.id), ...regNodes.map(n => n.id)]);

    // Name → id lookup for resolving wiki-links (lowercase, exact-match).
    // Entries first, then registered nodes (first writer wins on collision).
    const nameToId = {};
    ents.forEach(e => { nameToId[e.name.trim().toLowerCase()] = e.id; });
    regNodes.forEach(n => { const k = (n.name || "").trim().toLowerCase(); if (k && !(k in nameToId)) nameToId[k] = n.id; });

    const nodes = [
      ...ents.map(e => ({
        id: e.id,
        name: e.name,
        templateId: e.templateId,
        color: tplById[e.templateId]?.color || "#888",
      })),
      ...regNodes,
    ];

    let links = [];
    const seen = new Set();  // dedupe (source, target, label, kind)
    const addLink = (sourceId, targetId, label, kind = "directed") => {
      if (sourceId === targetId) return;
      if (!idSet.has(sourceId) || !idSet.has(targetId)) return;
      let key;
      if (kind === "spouse") {
        // Spouse is undirected: dedup regardless of declaration direction
        const [a, b] = [sourceId, targetId].sort();
        key = `${a}|${b}|spouse|${label}`;
      } else {
        key = `${sourceId}|${targetId}|${label}|${kind}`;
      }
      if (seen.has(key)) return;
      seen.add(key);
      links.push({ source: sourceId, target: targetId, label, kind });
    };

    const wikiRe = /\[\[([^\]\n]+)\]\]/g;

    ents.forEach(e => {
      const tpl = tplById[e.templateId];
      if (!tpl) return;

      const walk = (fields, fieldValues) => {
        fields.forEach(f => {
          if (f.secret && !showSecrets) return;
          const val = fieldValues[f.id];

          if (f.type === "entry-ref") {
            if (f.relationKind === "parent") {
              // Field is on child, refs are parents. Reverse so arrow points parent → child (matches family tree).
              const items = getRelationValues(val, f.multi);
              items.forEach(({ id: rid, label }) => addLink(rid, e.id, (label && label.trim()) || f.label, "directed"));
            } else if (f.relationKind === "spouse") {
              const items = getRelationValues(val, f.multi);
              items.forEach(({ id: rid, label }) => addLink(e.id, rid, (label && label.trim()) || f.label, "spouse"));
            } else {
              const refIds = f.multi ? (Array.isArray(val) ? val : []) : (val ? [val] : []);
              refIds.forEach(rid => addLink(e.id, rid, f.label, "directed"));
            }
          } else if ((f.type === "textarea" || f.type === "text") && typeof val === "string" && val.length) {
            // Scan for wiki-links, supporting [[target]] and [[target|custom label]]
            let m;
            wikiRe.lastIndex = 0;
            while ((m = wikiRe.exec(val)) !== null) {
              const inner = m[1].trim();
              const pipe = inner.indexOf("|");
              const targetName = pipe >= 0 ? inner.substring(0, pipe).trim() : inner;
              const customLabel = pipe >= 0 ? inner.substring(pipe + 1).trim() : null;
              const targetId = nameToId[targetName.toLowerCase()];
              if (targetId) addLink(e.id, targetId, customLabel || f.label);
            }
          } else if (f.type === "group" && Array.isArray(val)) {
            val.forEach(inst => walk(f.subfields || [], inst));
          } else if (f.type === "grid") {
            // Grid cells that are entry-refs produce directed edges, labeled
            // by the grid field. (Family roles live on relationKind fields, not
            // cells, so grid cells never feed Linea — only this general graph.)
            forEachGridRefCell(coerceGridValue(val), (rid, cid, cell) => {
              if (typeof cell.value === "string" && cell.value) addLink(e.id, cell.value, f.label, "directed");
            });
          }
        });
      };
      walk(tpl.fields, e.fields || {});
    });

    // v1.5 r076: registered intra-source edges (e.g. body orbital hierarchy,
    // star -> planet -> moon). Fed through addLink so they dedup and respect
    // the now body-inclusive idSet — orbits edges only draw when the body
    // source is toggled on, since toggled-off bodies aren't in idSet.
    getRegisteredGraphEdges(state).forEach(ed => addLink(ed.source, ed.target, ed.label, ed.kind || "directed"));

    // Post-process: merge same-direction same-kind edges between the same
    // node pair into a single link, concatenating their distinct labels with
    // " // ". This collapses cases like Faction having both "Members" and
    // "Council Members" fields pointing at the same target into one edge
    // labeled "Members // Council Members". Opposite-direction reciprocal
    // pairs (e.g., Husband edge A→B and Wife edge B→A; Headquarters edge
    // A→B and Faction Control edge B→A) stay as separate links because
    // direction encodes which node the label describes — the label always
    // describes the target. Vague labels (Description, Notes) are filtered
    // out before concatenation so they never contribute to visible text;
    // the link itself still draws since the connection between the entries
    // is real even when the field name doesn't describe the relationship.
    {
      const grouped = new Map();
      links.forEach(l => {
        const k = `${l.source}|${l.target}|${l.kind}`;
        if (!grouped.has(k)) {
          grouped.set(k, { source: l.source, target: l.target, kind: l.kind, labels: [] });
        }
        const lbl = (l.label || "").trim();
        if (lbl && !VAGUE_EDGE_LABELS.has(lbl.toLowerCase())) {
          const g = grouped.get(k);
          if (!g.labels.includes(lbl)) g.labels.push(lbl);
        }
      });
      links = Array.from(grouped.values()).map(g => ({
        source: g.source,
        target: g.target,
        kind: g.kind,
        label: g.labels.join(" // "),
      }));

      // Annotate each link with whether it has a reciprocal partner (an
      // opposite-direction edge between the same nodes, same kind). This
      // drives label positioning later: links with a reciprocal partner
      // sit near the target end so the two labels don't collide at the
      // midpoint; lonely links center at the midpoint to maximize the
      // truncation budget.
      const present = new Set(links.map(l => `${l.source}|${l.target}|${l.kind}`));
      links.forEach(l => {
        l.hasReciprocal = present.has(`${l.target}|${l.source}|${l.kind}`);
      });
    }

    const perTemplateCount = {};
    state.entries.forEach(e => { perTemplateCount[e.templateId] = (perTemplateCount[e.templateId] || 0) + 1; });
    getRegisteredGraphNodes(state).forEach(n => { perTemplateCount[n.templateId] = (perTemplateCount[n.templateId] || 0) + 1; });

    // Focus mode: BFS from focusEntryId through links treated as undirected,
    // up to focusDepth hops. Keep only reachable nodes; keep links whose
    // both endpoints are reachable. If the focus entry isn't in the current
    // node set (filtered out by template toggles), fall through to "show
    // everything" so the user isn't staring at an empty graph.
    if (focusEntryId && nodes.some(n => n.id === focusEntryId)) {
      const adj = {};
      links.forEach(l => {
        // At this point in useMemo, source/target are still ID strings
        // (d3 hasn't mutated them into node-object refs yet).
        const s = typeof l.source === "object" ? l.source.id : l.source;
        const t = typeof l.target === "object" ? l.target.id : l.target;
        (adj[s] = adj[s] || new Set()).add(t);
        (adj[t] = adj[t] || new Set()).add(s);
      });
      const reachable = new Set([focusEntryId]);
      let frontier = new Set([focusEntryId]);
      for (let d = 0; d < focusDepth; d++) {
        const nextFrontier = new Set();
        frontier.forEach(id => {
          (adj[id] || new Set()).forEach(nbr => {
            if (!reachable.has(nbr)) {
              reachable.add(nbr);
              nextFrontier.add(nbr);
            }
          });
        });
        frontier = nextFrontier;
        if (frontier.size === 0) break;
      }
      const filteredNodes = nodes.filter(n => reachable.has(n.id));
      const filteredLinks = links.filter(l => {
        const s = typeof l.source === "object" ? l.source.id : l.source;
        const t = typeof l.target === "object" ? l.target.id : l.target;
        return reachable.has(s) && reachable.has(t);
      });
      return { nodes: filteredNodes, links: filteredLinks, perTemplateCount };
    }

    return { nodes, links, perTemplateCount };
  }, [state.entries, state.templates, state.celestialBodies, enabledTemplates, showSecrets, focusEntryId, focusDepth]);

  // Set up d3 force simulation
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    if (nodes.length === 0) return;

    const container = containerRef.current;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Arrowhead defs. refX positions tip relative to line endpoint; we shorten line in tick handler so tip lands at node edge.
    const defs = svg.append("defs");
    defs.append("marker")
      .attr("id", "graph-arrow-end")
      .attr("viewBox", "0 0 10 10")
      .attr("refX", 9).attr("refY", 5)
      .attr("markerWidth", 6).attr("markerHeight", 6)
      .attr("orient", "auto-start-reverse")
      .append("path")
        .attr("d", "M 0 0 L 10 5 L 0 10 z")
        .attr("fill", "var(--text-dim)");

    // Containers for zoom/pan
    const zoomG = svg.append("g").attr("class", "zoom-group");
    const linkG = zoomG.append("g").attr("class", "links");
    const labelG = zoomG.append("g").attr("class", "edge-labels");
    const nodeG = zoomG.append("g").attr("class", "nodes");

    // Zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => {
        zoomG.attr("transform", event.transform);
        zoomTransformRef.current = event.transform;
      });
    svg.call(zoom);
    // v1.3: restore previous zoom/pan if we're rebuilding (filter toggle,
    // focus change, etc). Calling zoom.transform programmatically also
    // fires the "zoom" handler above, which positions zoomG and refreshes
    // the ref to itself — idempotent.
    if (zoomTransformRef.current) {
      svg.call(zoom.transform, zoomTransformRef.current);
    }

    // v1.3: Persistent layout. Apply any saved positions BEFORE the simulation
    // initializes so d3 sees these nodes as pre-placed. fx/fy pin them against
    // force movement; x/y seed the starting coordinates so collide/charge
    // calculations have correct values from tick zero. Track which nodes did
    // NOT have saved positions ("newlyPlaced") so we can bulk-commit their
    // settled positions on simulation.on("end") — and skip the commit for
    // nodes whose positions were already saved (no spurious updatedAt bumps).
    const savedPositions = (state.concordance && state.concordance.positions) || {};
    const newlyPlaced = new Set();
    nodes.forEach(d => {
      const saved = savedPositions[d.id];
      if (saved) {
        d.fx = saved.x;
        d.fy = saved.y;
        d.x = saved.x;
        d.y = saved.y;
      } else {
        newlyPlaced.add(d.id);
      }
    });
    // If every visible node has a saved position, the simulation has nothing
    // to settle — skip the cooling loop entirely (no bounce). If any nodes
    // are new, the simulation cools normally and the new ones settle around
    // the pinned majority.
    const allPinned = newlyPlaced.size === 0 && nodes.length > 0;

    // Sim — collide is set provisionally; we'll refine it once labels are
    // rendered and we can measure their actual widths. Default circle radius
    // (34) is fine until the proper per-node radius is computed below.
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(110).strength(0.7))
      .force("charge", d3.forceManyBody().strength(-340))
      .force("center", d3.forceCenter(width / 2, height / 2))
      // forceCenter only translates the system so its centroid sits at the
      // middle — it exerts no restoring pull, so under charge repulsion alone
      // disconnected nodes and loosely-linked bodies drift apart without bound
      // (they were landing thousands of px out and, once persisted, froze there
      // on load). forceX/forceY add a gentle pull toward the middle that contains
      // the whole graph while staying weak enough not to crush the link-driven
      // structure. Pinned nodes (saved positions) ignore these like any force.
      .force("x", d3.forceX(width / 2).strength(0.07))
      .force("y", d3.forceY(height / 2).strength(0.07))
      .force("collide", d3.forceCollide(34))
      .alphaDecay(0.03);

    // Render links
    const linkSel = linkG.selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("class", "graph-link")
      .attr("marker-end", "url(#graph-arrow-end)")
      .attr("marker-start", d => d.kind === "spouse" ? "url(#graph-arrow-end)" : null);

    // Edge labels
    const labelSel = labelG.selectAll("text")
      .data(links)
      .enter().append("text")
      .attr("class", "graph-edge-label")
      .attr("text-anchor", "middle")
      .text(d => d.label || "");

    // Truncate edge labels that don't fit along their line. Uses
    // getComputedTextLength to measure the actual rendered glyph run,
    // iteratively chops chars and appends "..." until it fits within the
    // available budget. The budget depends on where the label sits along
    // the line (see labelPosFor): centered labels (no reciprocal partner)
    // get the full line minus node padding; off-center labels (sharing
    // their line with a reciprocal-direction label) are bounded by the
    // smaller of the two side gaps so they don't overrun their target
    // node. Floors at "..." even if that overhangs — better a small
    // overhang than a missing label. Recomputed on initial settle and
    // during drag.
    const NODE_PADDING = 11;        // node radius (9) + visual breathing room
    const labelPosFor = d => d.hasReciprocal ? 0.7 : 0.5;
    function truncateLabels() {
      labelSel.each(function(d) {
        const fullText = d.label || "";
        const sel = d3.select(this);
        if (!fullText) { sel.text(""); return; }
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const lineLen = Math.hypot(dx, dy);
        const t = labelPosFor(d);
        const maxLen = Math.max(20, 2 * Math.min(t, 1 - t) * lineLen - 2 * NODE_PADDING);
        sel.text(fullText);
        if (this.getComputedTextLength() <= maxLen) return;
        let n = fullText.length;
        while (n > 0) {
          n--;
          sel.text(fullText.slice(0, n) + "...");
          if (this.getComputedTextLength() <= maxLen) return;
        }
        sel.text("...");
      });
    }

    // Nodes
    const nodeSel = nodeG.selectAll("g")
      .data(nodes)
      .enter().append("g")
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        onOpenEntryRef.current(d.id);
      })
      .on("mouseenter", (event, d) => setHoveredId(d.id))
      .on("mouseleave", () => setHoveredId(null))
      .call(d3.drag()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x; d.fy = event.y;
          truncateLabels();
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          // Leave d.fx/d.fy set — node stays pinned at drop location instead
          // of drifting back under force. After the initial layout settles
          // (see simulation.on("end") below), all nodes are pinned, so a drag
          // moves only its target node and the rest of the graph holds still.
          // v1.3: persist the dropped position so it survives reload and
          // travels with world JSON export. Surgical patch — only this one
          // node's position writes back to state.
          onSavePositionsRef.current({ [d.id]: { x: d.x, y: d.y } });
        })
      );

    nodeSel.append("circle")
      .attr("class", "graph-node-circle")
      .attr("r", 9)
      .attr("fill", d => d.color);

    const nodeLabelSel = nodeSel.append("text")
      .attr("class", "graph-node-label")
      .attr("x", 13)
      .attr("y", 4)
      .text(d => d.name);

    // Measure rendered label widths so the collide force accounts for label
    // extent, not just the 9-pixel circle. Long entry names were overlapping
    // each other visually because nodes sat close enough that their right-
    // extending labels intersected. We use getBBox on the rendered text so
    // the measurement honors the user's --font-scale and actual glyph widths.
    // The collide radius for each node = label start offset (13) + label
    // width + a small gap. Floored at 34 so the bare-circle case still has
    // breathing room. forceCollide(d => ...) accepts a per-node accessor.
    const LABEL_X_OFFSET = 13;
    const LABEL_GAP = 6;
    nodeLabelSel.each(function(d) {
      try {
        d.labelWidth = this.getBBox().width;
      } catch (_) {
        // getBBox can throw if the SVG isn't laid out yet; fall back to a
        // character-count estimate that's roughly right for sans-serif at 12px.
        d.labelWidth = (d.name?.length || 0) * 6.5;
      }
    });
    simulation.force("collide", d3.forceCollide(d =>
      Math.max(34, LABEL_X_OFFSET + (d.labelWidth || 50) + LABEL_GAP)
    ));

    // Pre-tick with the now label-aware collide so the initial layout
    // already respects label boundaries. Without this the graph briefly
    // snaps to a tighter layout before the collide pushes it apart.
    // v1.3: skip the pre-cool entirely if every node has a saved position —
    // there's nothing to settle, and 60 wasted ticks just delay the first
    // paint.
    if (!allPinned) {
      for (let i = 0; i < 60; i++) simulation.tick();
    }

    // Tick body extracted so we can call it manually in the all-pinned case
    // (where the simulation is stopped before its internal RAF loop fires
    // any ticks). For the normal case it gets registered as the "tick"
    // callback and fires per-frame during cooling and during drags.
    const runTick = () => {
      const NODE_R = 9, GAP = 4; // node radius + small gap before arrow tip
      linkSel
        .attr("x1", d => {
          const dx = d.target.x - d.source.x, dy = d.target.y - d.source.y;
          const len = Math.hypot(dx, dy) || 1;
          // For spouse (arrow on both ends), pull source end inward too. Otherwise leave at center.
          const offset = d.kind === "spouse" ? (NODE_R + GAP) : 0;
          return d.source.x + (dx / len) * offset;
        })
        .attr("y1", d => {
          const dx = d.target.x - d.source.x, dy = d.target.y - d.source.y;
          const len = Math.hypot(dx, dy) || 1;
          const offset = d.kind === "spouse" ? (NODE_R + GAP) : 0;
          return d.source.y + (dy / len) * offset;
        })
        .attr("x2", d => {
          const dx = d.target.x - d.source.x, dy = d.target.y - d.source.y;
          const len = Math.hypot(dx, dy) || 1;
          return d.target.x - (dx / len) * (NODE_R + GAP);
        })
        .attr("y2", d => {
          const dx = d.target.x - d.source.x, dy = d.target.y - d.source.y;
          const len = Math.hypot(dx, dy) || 1;
          return d.target.y - (dy / len) * (NODE_R + GAP);
        });
      // Edge labels: rotate to follow the line. Lonely edges (no reciprocal
      // partner) sit at the midpoint for maximum readable budget; edges that
      // share their line with a reciprocal-direction partner sit near the
      // target end so the two labels don't collide at the midpoint. Lines
      // whose direction would render text upside-down (compass 180°-359° /
      // screen angle outside [-90°, 90°]) get flipped 180° so text stays
      // right-side-up. The perpendicular offset (sin θ, -cos θ) always
      // points toward the "above-text" side after the flip is applied.
      labelSel.attr("transform", d => {
        const t = labelPosFor(d);
        const labelX = d.source.x + (d.target.x - d.source.x) * t;
        const labelY = d.source.y + (d.target.y - d.source.y) * t;
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        let angleRad = Math.atan2(dy, dx);
        if (angleRad > Math.PI / 2) angleRad -= Math.PI;
        else if (angleRad < -Math.PI / 2) angleRad += Math.PI;
        const angleDeg = angleRad * 180 / Math.PI;
        const OFFSET = 4;
        const offsetX = OFFSET * Math.sin(angleRad);
        const offsetY = -OFFSET * Math.cos(angleRad);
        return `translate(${labelX + offsetX},${labelY + offsetY}) rotate(${angleDeg})`;
      });
      nodeSel.attr("transform", d => `translate(${d.x}, ${d.y})`);
    };

    simulation.on("tick", runTick);

    // Render once now so first paint shows nodes at correct positions
    // (saved or pre-cooled). Without this, the user briefly sees nodes at
    // their default <g> origin (0,0) before the first RAF tick fires.
    runTick();
    truncateLabels();

    // Once the auto-cooling layout finishes, pin every node at its settled
    // position. From here on, forces still tick but pinned nodes ignore them,
    // so dragging one node doesn't ripple through the rest of the graph.
    // Filter or focus changes cause this useEffect to fire again (deps on
    // [nodes, links]). The new run reads saved positions out of
    // state.concordance.positions and pre-pins those nodes from tick zero,
    // so the user doesn't see anything reset — visible nodes resume at their
    // saved coordinates. Only nodes without saved positions need the cooling
    // loop to find a place to land.
    // v1.3: commit any newly-placed nodes' settled positions to state so
    // they persist for next mount. Pinned nodes (those that started with
    // saved positions) didn't move, so we skip them to avoid spurious
    // updatedAt bumps from no-op rewrites.
    simulation.on("end", () => {
      nodes.forEach(d => { d.fx = d.x; d.fy = d.y; });
      truncateLabels();
      if (newlyPlaced.size > 0) {
        const patch = {};
        nodes.forEach(d => {
          if (newlyPlaced.has(d.id)) patch[d.id] = { x: d.x, y: d.y };
        });
        onSavePositionsRef.current(patch);
      }
    });

    // v1.3: all-pinned case skips the internal RAF cooling loop. The
    // simulation still exists so drag handlers can restart it on demand,
    // but it doesn't burn ~1.5s of CPU running forces that can't move
    // anything. on("end") never fires in this branch, which is fine —
    // newlyPlaced is empty so the bulk-save would be a no-op anyway.
    if (allPinned) {
      simulation.stop();
    }

    // Expose zoom controls via DOM data attribute hack — let's just store on the node for buttons
    svg.node().__zoomBehavior = zoom;

    return () => simulation.stop();
  }, [nodes, links]);

  // Hover highlighting (apply CSS classes based on hoveredId)
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    if (!hoveredId) {
      svg.selectAll(".graph-link").classed("highlighted faded", false);
      svg.selectAll(".graph-node-circle").classed("highlighted faded", false);
      svg.selectAll(".graph-node-label").classed("faded", false);
      return;
    }
    // Build set of connected node ids
    const connected = new Set([hoveredId]);
    links.forEach(l => {
      const s = typeof l.source === "object" ? l.source.id : l.source;
      const t = typeof l.target === "object" ? l.target.id : l.target;
      if (s === hoveredId) connected.add(t);
      if (t === hoveredId) connected.add(s);
    });
    svg.selectAll(".graph-link").each(function(l) {
      const s = typeof l.source === "object" ? l.source.id : l.source;
      const t = typeof l.target === "object" ? l.target.id : l.target;
      const isConn = (s === hoveredId || t === hoveredId);
      d3.select(this).classed("highlighted", isConn).classed("faded", !isConn);
    });
    svg.selectAll(".graph-node-circle").each(function(n) {
      const isConn = connected.has(n.id);
      d3.select(this).classed("highlighted", n.id === hoveredId).classed("faded", !isConn);
    });
    svg.selectAll(".graph-node-label").each(function(n) {
      d3.select(this).classed("faded", !connected.has(n.id));
    });
  }, [hoveredId, links]);

  const toggleTemplate = (id) => {
    const next = new Set(enabledTemplates);
    if (next.has(id)) next.delete(id); else next.add(id);
    setEnabledTemplates(next);
  };

  const allOn = () => setEnabledTemplates(new Set([...state.templates.map(t => t.id), ...getRegisteredSyntheticTemplates().map(t => t.id)]));
  const allOff = () => setEnabledTemplates(new Set());

  const zoomBy = (factor) => {
    if (!svgRef.current?.__zoomBehavior) return;
    d3.select(svgRef.current).transition().duration(200).call(svgRef.current.__zoomBehavior.scaleBy, factor);
  };
  const zoomReset = () => {
    if (!svgRef.current?.__zoomBehavior) return;
    d3.select(svgRef.current).transition().duration(300).call(svgRef.current.__zoomBehavior.transform, d3.zoomIdentity);
  };

  // v1.3: hover info pane. Reuses the existing hoveredId state (which also
  // drives the connected-node highlight). When a node is hovered, this
  // computes a read-only summary: name, template (with icon + color), tags,
  // facts block (born / lifespan / spouses), a preview of the first non-empty
  // prose field, and connection count from the current visible link set.
  // Secret fields are skipped when showSecrets is off, same convention as the
  // rest of the codebase. Markdown is stripped from the preview so it reads
  // as plain text — wiki-links become bare names, formatting markers are
  // removed, newlines collapse to spaces. Preview caps at 240 chars so even
  // long fields can't blow up the pane height.
  //
  // Lifespan uses the same convention as Linea: first calendar-date-range
  // field on the template, year-only "start–end" with approximate marker.
  // DOB is the same field's start, formatted richly (day+month if available).
  // Spouses walk all entry-ref fields with relationKind === SPOUSE_KIND,
  // resolve partner ids, display compactly with year-only marriage dates.
  const hoveredEntryDetails = useMemo(() => {
    if (!hoveredId) return null;
    const entry = state.entries.find(e => e.id === hoveredId);
    if (!entry) return null;
    const tpl = state.templates.find(t => t.id === entry.templateId);
    if (!tpl) return null;
    const calendar = state.world?.calendar || null;

    let connCount = 0;
    links.forEach(l => {
      const s = typeof l.source === "object" ? l.source.id : l.source;
      const t = typeof l.target === "object" ? l.target.id : l.target;
      if (s === hoveredId || t === hoveredId) connCount++;
    });

    const tags = Array.isArray(entry.tags) ? entry.tags.filter(Boolean) : [];

    // Date formatters scoped to this entry's calendar. fmtYear is compact
    // year-only with the approximate marker (used for lifespan + spouse
    // marriage dates where density matters). fmtRich is the fullest available
    // form: "DD Month, YYYY ERA" if all three are present, "Month, YYYY ERA"
    // if monthIndex but no day, falls back to just year. Used for DOB.
    const fmtYear = (d) => (d && d.year != null)
      ? `${d.approximate ? "~" : ""}${d.year}`
      : null;
    const fmtRich = (d) => {
      if (!d || d.year == null) return null;
      const prefix = d.approximate ? "~" : "";
      const era = calendar ? findEra(d.year, calendar.eras || []) : null;
      const eraSuffix = era?.shortName ? ` ${era.shortName}` : "";
      if (calendar && d.monthIndex != null && d.day != null) {
        const mo = calendar.months?.[d.monthIndex];
        const moName = mo?.name || `Month ${d.monthIndex + 1}`;
        return `${prefix}${d.day} ${moName}, ${d.year}${eraSuffix}`;
      }
      if (calendar && d.monthIndex != null) {
        const mo = calendar.months?.[d.monthIndex];
        const moName = mo?.name || `Month ${d.monthIndex + 1}`;
        return `${prefix}${moName}, ${d.year}${eraSuffix}`;
      }
      return `${prefix}${d.year}${eraSuffix}`;
    };

    // Range fact (first calendar-date-range field). Section label comes from
    // the field itself — "Lifespan" for Character, "Active period" for
    // Faction, "Reign" for a monarch template, whatever the template author
    // chose. Don't force person-semantics on non-person entries. The compact
    // year–year range follows Linea's convention. When the start has more
    // than year-level granularity (month/day populated), the full date shows
    // on a primary line and the year range is the dim secondary line; when
    // it's year-only, just the range.
    let rangeBlock = null;
    const lifespanField = (tpl.fields || []).find(f => f.type === "calendar-date-range");
    if (lifespanField) {
      const ls = entry.fields?.[lifespanField.id];
      if (ls && (ls.start?.year != null || ls.end?.year != null)) {
        const startYr = fmtYear(ls.start) || "?";
        const isDeceased = isEntryDeceased(entry, tpl);
        const endYr = fmtYear(ls.end) || (isDeceased ? "?" : "Living");
        const range = `${startYr}\u2013${endYr}`;
        const hasRichStart = ls.start && ls.start.year != null &&
                            (ls.start.monthIndex != null || ls.start.day != null);
        rangeBlock = {
          label: lifespanField.label || "Range",
          richStart: hasRichStart ? fmtRich(ls.start) : null,
          range,
        };
      }
    }

    // Spouse declarations grouped by source-field label. Each entry-ref
    // field with relationKind === SPOUSE_KIND becomes one visual section,
    // headed by the field's display label ("Wife" / "Husband" / "Spouse" /
    // "Bonded" / "Marriages" / whatever the template author chose). Fields
    // with identical labels merge into one group (covers degenerate templates
    // with duplicate-named fields, and matches what a user reading the
    // template would expect to see). Per-row label overrides — the speaker-
    // relative label on each declaration ("First Wife", "Estranged Husband",
    // etc.) — are still shown inline on the row, since they're distinct from
    // the field name itself.
    const spouseGroupsByLabel = new Map();
    for (const f of (tpl.fields || [])) {
      if (f.type !== "entry-ref" || f.relationKind !== SPOUSE_KIND) continue;
      const items = getRelationValues(entry.fields?.[f.id], f.multi);
      if (!items.length) continue;
      const groupLabel = f.label || "Spouse";
      if (!spouseGroupsByLabel.has(groupLabel)) {
        spouseGroupsByLabel.set(groupLabel, []);
      }
      const groupRows = spouseGroupsByLabel.get(groupLabel);
      for (const it of items) {
        if (!it.id || it.id === entry.id) continue;
        const partner = state.entries.find(e => e.id === it.id);
        if (!partner) continue;
        const mStr = fmtYear(it.marriedOn);
        const eStr = fmtYear(it.endedOn);
        let dates = null;
        if (mStr && eStr) dates = `${mStr}\u2013${eStr}`;
        else if (mStr) dates = `${mStr}\u2013`;
        else if (eStr) dates = `?\u2013${eStr}`;
        groupRows.push({
          id: it.id,
          name: partner.name,
          label: it.label || null,
          status: it.status && it.status !== "active" ? it.status : null,
          dates,
        });
      }
    }
    const spouseGroups = Array.from(spouseGroupsByLabel.entries())
      .filter(([_label, rows]) => rows.length > 0)
      .map(([label, rows]) => ({ label, rows }));

    // Other structured facts — every populated non-prose field that isn't
    // already represented elsewhere on the pane. Each one becomes its own
    // subsection labeled by the field's display label, so a Location's
    // "Region", a Faction's "Government", a Character's "Status" / "Title" /
    // "Affiliations", etc. all surface in the entry's own terminology.
    //   Skipped categories:
    //   - textarea: that's the long-prose preview at the bottom
    //   - calendar-date-range: already rendered in rangeBlock
    //   - tags: already rendered as chips
    //   - entry-ref + spouse relationKind: already in spouseGroups
    //   - entry-ref + parent relationKind: kinship belongs to Linea, would
    //     just duplicate that surface and crowd the pane
    //   - color, url, image, name-history, group: don't render well in a
    //     compact glanceable pane
    //   - cascade child selects (dependsOn set): rendered combined with their
    //     parent in the parent's row. Skip standalone.
    // Multi-value entry-refs are joined with commas; ids that don't resolve
    // are silently dropped rather than showing "(missing)" clutter.
    //
    // For cascade-pair display: when a parent select has a cascade child on
    // the same template, the child's value is appended to the parent's
    // rendered string as " - {child}". When the child uses otherTextField
    // and the user typed custom text, formatSelectDisplay handles that —
    // the word "Other" never appears, the customText takes its place.
    const entriesById = {};
    for (const e of state.entries) entriesById[e.id] = e;
    // Pre-index cascade children by their parent field id so we can find
    // a parent's child in one lookup during the iteration.
    const cascadeChildByParentId = {};
    for (const f of (tpl.fields || [])) {
      if (f.type === "select" && f.dependsOn) {
        cascadeChildByParentId[f.dependsOn] = f;
      }
    }
    const otherFacts = [];
    for (const f of (tpl.fields || [])) {
      if (f.secret && !showSecrets) continue;
      // v1.3: showWhen conditional visibility — skip hidden fields from hover pane
      if (!isFieldVisible(f, entry.fields || {})) continue;
      if (f.type === "textarea") continue;
      if (f.type === "longform") continue;
      if (f.type === "calendar-date-range") continue;
      if (f.type === "tags") continue;
      if (f.type === "name-history") continue;
      if (f.type === "group") continue;
      if (f.type === "image") continue;
      if (f.type === "url") continue;
      if (f.type === "color") continue;
      if (f.type === "entry-ref" && f.relationKind === SPOUSE_KIND) continue;
      if (f.type === "entry-ref" && f.relationKind === "parent") continue;
      // Skip cascade children — rendered combined with parent below.
      if (f.type === "select" && f.dependsOn) continue;

      const v = entry.fields?.[f.id];
      if (v == null || v === "") continue;

      let renderedValue = null;
      if (f.type === "entry-ref") {
        const ids = getEntryRefIds(f, v);
        const names = ids.map(id => entriesById[id]?.name).filter(Boolean);
        if (names.length === 0) continue;
        renderedValue = names.join(", ");
      } else if (f.type === "calendar-date") {
        if (typeof v !== "object" || v.year == null) continue;
        renderedValue = fmtRich(v);
        if (!renderedValue) continue;
      } else if (f.type === "select") {
        // Use formatSelectDisplay to handle both bare-string and
        // {value, customText} storage shapes uniformly. Empty/whitespace
        // strings produce no row.
        const displayVal = formatSelectDisplay(v);
        if (!displayVal || !displayVal.trim()) continue;
        renderedValue = displayVal.trim();
        // If this is a cascade parent, combine the child's value in.
        const childField = cascadeChildByParentId[f.id];
        if (childField) {
          const childDisplay = formatSelectDisplay(entry.fields?.[childField.id]);
          if (childDisplay && childDisplay.trim()) {
            renderedValue = `${renderedValue} - ${childDisplay.trim()}`;
          }
        }
      } else if (f.type === "text") {
        if (typeof v !== "string" || !v.trim()) continue;
        renderedValue = v.trim();
      } else if (f.type === "number") {
        if (typeof v !== "number" || Number.isNaN(v)) continue;
        renderedValue = String(v);
      } else {
        continue; // unknown field type — skip rather than guess
      }

      otherFacts.push({ id: f.id, label: f.label || f.id, value: renderedValue });
    }

    let preview = null;
    for (const f of (tpl.fields || [])) {
      if (f.secret && !showSecrets) continue;
      // v1.3: showWhen conditional visibility — skip hidden fields from preview
      if (!isFieldVisible(f, entry.fields || {})) continue;
      if (f.type !== "textarea" && f.type !== "text") continue;
      const val = entry.fields?.[f.id];
      if (typeof val !== "string" || !val.trim()) continue;
      let stripped = val
        .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
        .replace(/\[\[([^\]]+)\]\]/g, "$1")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/!?\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/\n+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (stripped.length > 240) stripped = stripped.substring(0, 240).trimEnd() + "…";
      preview = { label: f.label, text: stripped };
      break;
    }

    return { entry, tpl, connCount, tags, rangeBlock, spouseGroups, otherFacts, preview };
  }, [hoveredId, state.entries, state.templates, state.world, links, showSecrets]);

  return (
    <div className="graph-view" ref={containerRef}>
      <svg ref={svgRef} className="graph-svg" />

      {hoveredEntryDetails && (
        <div className="graph-hover-pane">
          <div className="graph-hover-name">{hoveredEntryDetails.entry.name}</div>
          <div className="graph-hover-template">
            <span className="graph-hover-template-icon" style={{ color: hoveredEntryDetails.tpl.color || "var(--accent)" }}>
              {hoveredEntryDetails.tpl.icon || "◆"}
            </span>
            <span>{hoveredEntryDetails.tpl.name}</span>
          </div>
          {hoveredEntryDetails.tags.length > 0 && (
            <div className="graph-hover-tags">
              {hoveredEntryDetails.tags.map(t => (
                <span key={t} className="graph-hover-tag">{t}</span>
              ))}
            </div>
          )}
          {(hoveredEntryDetails.rangeBlock || hoveredEntryDetails.spouseGroups.length > 0 || hoveredEntryDetails.otherFacts.length > 0) && (
            <div className="graph-hover-facts">
              {hoveredEntryDetails.rangeBlock && (
                <div className="graph-hover-fact">
                  <div className="graph-hover-fact-label">{hoveredEntryDetails.rangeBlock.label}</div>
                  {hoveredEntryDetails.rangeBlock.richStart && (
                    <div className="graph-hover-fact-value">{hoveredEntryDetails.rangeBlock.richStart}</div>
                  )}
                  <div className={hoveredEntryDetails.rangeBlock.richStart ? "graph-hover-fact-value-secondary" : "graph-hover-fact-value"}>
                    {hoveredEntryDetails.rangeBlock.range}
                  </div>
                </div>
              )}
              {hoveredEntryDetails.spouseGroups.map(g => (
                <div key={g.label} className="graph-hover-fact">
                  <div className="graph-hover-fact-label">{g.label}</div>
                  {g.rows.map(s => (
                    <div key={s.id} className="graph-hover-spouse">
                      <span>{s.name}</span>
                      {s.label && <span className="graph-hover-spouse-label"> ({s.label})</span>}
                      {s.status && <span className="graph-hover-spouse-label"> [{s.status}]</span>}
                      {s.dates && <span className="graph-hover-spouse-dates"> · {s.dates}</span>}
                    </div>
                  ))}
                </div>
              ))}
              {hoveredEntryDetails.otherFacts.map(fact => (
                <div key={fact.id} className="graph-hover-fact">
                  <div className="graph-hover-fact-label">{fact.label}</div>
                  <div className="graph-hover-fact-value">{fact.value}</div>
                </div>
              ))}
            </div>
          )}
          {hoveredEntryDetails.preview && (
            <div className="graph-hover-preview">
              <div className="graph-hover-preview-label">{hoveredEntryDetails.preview.label}</div>
              <div className="graph-hover-preview-text">{hoveredEntryDetails.preview.text}</div>
            </div>
          )}
          <div className="graph-hover-meta">
            <span>
              {hoveredEntryDetails.connCount === 0
                ? "Unconnected"
                : `${hoveredEntryDetails.connCount} connection${hoveredEntryDetails.connCount === 1 ? "" : "s"}`}
            </span>
            <span className="graph-hover-hint">Click to open</span>
          </div>
        </div>
      )}

      <div className="graph-controls">
        <div className="graph-controls-section">
          <div className="graph-controls-title">Focus</div>
          <input
            className="input"
            list="graph-focus-list"
            value={focusInputText}
            onChange={e => {
              const text = e.target.value;
              setFocusInputText(text);
              // v1.3: only commit focus on entries whose template is enabled.
              // Typing a hidden-template entry's full name no longer accepts
              // it; matching falls through to setFocusEntryId(null).
              const matched = state.entries.find(en =>
                en.name.toLowerCase() === text.toLowerCase().trim() &&
                enabledTemplates.has(en.templateId)
              );
              setFocusEntryId(matched ? matched.id : null);
            }}
            placeholder="Type entry name..."
            style={{ width: "100%", marginBottom: 6 }}
          />
          <datalist id="graph-focus-list">
            {/* v1.3: only suggest entries from enabled templates so the
                autocomplete doesn't offer choices that would silently fail
                to focus. */}
            {state.entries
              .filter(e => enabledTemplates.has(e.templateId))
              .map(e => <option key={e.id} value={e.name} />)}
          </datalist>
          {focusEntryId && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--text-dim)" }}>
              <span>Hops:</span>
              <input
                type="number"
                className="input"
                min={1}
                max={15}
                value={focusDepthStr}
                onChange={e => setFocusDepthStr(e.target.value)}
                onBlur={() => setFocusDepthStr(String(clampFocusDepth(focusDepthStr)))}
                style={{ width: 56 }}
              />
              <a href="#" onClick={e => { e.preventDefault(); setFocusEntryId(null); setFocusInputText(""); }} style={{ color: "var(--text-dim)", textDecoration: "none", marginLeft: "auto" }}>clear</a>
            </div>
          )}
        </div>
        <div className="graph-controls-section">
          <div className="graph-controls-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Templates</span>
            <span style={{ fontSize: 10, letterSpacing: 0 }}>
              <a href="#" onClick={(e) => { e.preventDefault(); allOn(); }} style={{ color: "var(--accent)", textDecoration: "none", marginRight: 8 }}>all</a>
              <a href="#" onClick={(e) => { e.preventDefault(); allOff(); }} style={{ color: "var(--text-dim)", textDecoration: "none" }}>none</a>
            </span>
          </div>
          {[...state.templates, ...getRegisteredSyntheticTemplates()].map(t => (
            <label key={t.id} className="graph-filter-row">
              <input type="checkbox" checked={enabledTemplates.has(t.id)} onChange={() => toggleTemplate(t.id)} />
              <span className="graph-filter-color" style={{ background: t.color }} />
              <span className="graph-filter-name">{t.name}</span>
              <span className="graph-filter-count">{perTemplateCount[t.id] || 0}</span>
            </label>
          ))}
        </div>
      </div>

      {nodes.length === 0 && (
        <div className="graph-empty">
          <div className="graph-empty-glyph">◍</div>
          <div>{state.entries.length === 0 ? "No entries yet." : "No entries match the current filter."}</div>
        </div>
      )}

      {nodes.length > 0 && (
        <div className="graph-stats">
          {nodes.length} {nodes.length === 1 ? "node" : "nodes"} · {links.length} {links.length === 1 ? "connection" : "connections"}
          {!showSecrets && " · secrets hidden"}
        </div>
      )}

      <div className="graph-zoom-controls">
        <button className="graph-zoom-btn" onClick={() => zoomBy(1.4)} title="Zoom in">+</button>
        <button className="graph-zoom-btn" onClick={() => zoomBy(0.7)} title="Zoom out">−</button>
        <button className="graph-zoom-btn" onClick={zoomReset} title="Reset zoom" style={{ fontSize: 11 }}>⊙</button>
      </div>
    </div>
  );
}

// ─── Map drawing model (v1.6 pillar 3) ─────────────────────────────────────────
// The vector drawing under a map's pins. Pure data: mapData.drawing is a
// viewBox-sized canvas with a background and ordered layers of shapes. The
// renderer (cut 2) and the editor (cuts 3+) consume it, migrate() backfills it
// on load, and ensureMapData() coerces anything malformed to defaults on read
// rather than throwing (defensive validation before state touches). Pins stay
// 0-1 normalized to the canvas rect and are NOT part of the drawing. Build
// sheet: docs/cartographia-plus-spec.md.

// The fixed palette the editor offers. Stored as hex on each shape, so a stamp
// pack can carry colors outside it; the palette constrains authoring, not data.
const MAP_PALETTE = [
  { id: "ink",       label: "Ink",       hex: "#2b2420" },
  { id: "sepia",     label: "Sepia",     hex: "#6b4e2e" },
  { id: "parchment", label: "Parchment", hex: "#e8dcc0" },
  { id: "forest",    label: "Forest",    hex: "#4f6b3a" },
  { id: "water",     label: "Water",     hex: "#5b7f99" },
  { id: "stone",     label: "Stone",     hex: "#8a8378" },
  { id: "blood",     label: "Blood",     hex: "#8c3b2e" },
  { id: "chalk",     label: "Chalk",     hex: "#f4efe4" },
];

// Background presets for image-less maps: a fill plus a grain amount (0-1) for
// the feTurbulence texture the renderer lays over it. Not drawn under an image.
const MAP_BACKGROUND_PRESETS = [
  { id: "white",     label: "White",     fill: "#ffffff", grain: 0 },
  { id: "vellum",    label: "Vellum",    fill: "#f1e9d6", grain: 0.25 },
  { id: "parchment", label: "Parchment", fill: "#e8dcc0", grain: 0.45 },
];
const MAP_STROKE_WIDTH_RANGE = { min: 1, max: 32, limit: 64 };   // viewBox units; the slider's range, and the widest the data accepts
const MAP_TEXT_SIZES = [24, 36, 56];        // viewBox units, Cormorant Garamond
const MAP_SHAPE_TYPES = ["rect", "ellipse", "polygon", "stroke", "text", "stamp", "region"];
// Default canvas for a map with no image. With an image, the renderer sets the
// drawing's size to the image's natural pixel size the first time it loads
// while the drawing is still empty (cut 2); after that the size is fixed,
// because pins are normalized to the canvas rect and would move otherwise.
const MAP_DRAWING_DEFAULT_SIZE = { width: 1600, height: 1000 };

function makeDefaultMapLayer(name) {
  return { id: `layer-${genId().slice(-6)}`, name: name || "Drawing", visible: true, locked: false, shapes: [] };
}

function makeDefaultDrawing(width, height) {
  const preset = MAP_BACKGROUND_PRESETS[1]; // vellum
  return {
    width: Number.isFinite(width) && width > 0 ? Math.round(width) : MAP_DRAWING_DEFAULT_SIZE.width,
    height: Number.isFinite(height) && height > 0 ? Math.round(height) : MAP_DRAWING_DEFAULT_SIZE.height,
    background: { fill: preset.fill, grain: preset.grain },
    layers: [makeDefaultMapLayer("Drawing")],
  };
}

// One shape, coerced to its type's field set. Returns null for a shape that
// cannot be rendered (unknown type, a polygon with fewer than three points, a
// stamp with no stamp id); the caller drops those. Everything else lands on a
// default rather than failing, and a well-formed shape round-trips unchanged.
function ensureMapShape(s) {
  if (!s || typeof s !== "object") return null;
  const type = MAP_SHAPE_TYPES.includes(s.type) ? s.type : null;
  if (!type) return null;
  const num = (v, d) => (Number.isFinite(v) ? v : d);
  const hex = (v) => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : null);
  const pick = (v, list, d) => (list.includes(v) ? v : d);
  const out = {
    id: (typeof s.id === "string" && s.id) ? s.id : `shape-${genId().slice(-6)}`,
    type,
    fill: hex(s.fill),
    stroke: hex(s.stroke),
    strokeWidth: Math.max(MAP_STROKE_WIDTH_RANGE.min, Math.min(MAP_STROKE_WIDTH_RANGE.limit, Math.round(num(s.strokeWidth, 4)))),
  };
  if (type === "rect" || type === "ellipse" || type === "text" || type === "stamp") {
    out.x = num(s.x, 0);
    out.y = num(s.y, 0);
  }
  if (type === "rect" || type === "ellipse" || type === "stamp") {
    out.w = Math.max(1, num(s.w, 100));
    out.h = Math.max(1, num(s.h, 100));
  }
  if (type === "rect" || type === "polygon" || type === "stroke") {
    out.smooth = s.smooth === true;
  }
  if (type === "region") {
    const rings = (Array.isArray(s.rings) ? s.rings : [])
      .map(r => (Array.isArray(r) ? r : []).filter(p => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])).map(p => [p[0], p[1]]))
      .filter(r => r.length >= 3);
    if (rings.length === 0) return null;
    out.rings = rings;
    out.smooth = s.smooth === true;
  }
  if (type === "polygon" || type === "stroke") {
    const pts = (Array.isArray(s.points) ? s.points : [])
      .filter(p => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]))
      .map(p => [p[0], p[1]]);
    if (pts.length < (type === "polygon" ? 3 : 2)) return null;
    out.points = pts;
  }
  if (type === "text") {
    out.text = typeof s.text === "string" ? s.text : "";
    out.fontSize = pick(s.fontSize, MAP_TEXT_SIZES, 36);
    out.rotation = num(s.rotation, 0);
    out.arc = Math.max(-180, Math.min(180, num(s.arc, 0))); // degrees of bend; 0 is a straight label
  }
  if (type === "stamp") {
    if (typeof s.stampId !== "string" || !s.stampId) return null;
    out.stampId = s.stampId;
    out.rotation = num(s.rotation, 0);
  }
  return out;
}

// The whole drawing, coerced. Ids are preserved where present and minted where
// absent, so a second pass over the result changes nothing; migrate() relies
// on that.
function ensureDrawingShape(drawing) {
  const src = (drawing && typeof drawing === "object") ? drawing : {};
  const num = (v, d) => (Number.isFinite(v) ? v : d);
  const hex = (v) => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : null);
  const preset = MAP_BACKGROUND_PRESETS[1];
  const bg = (src.background && typeof src.background === "object") ? src.background : {};
  const layersSrc = (Array.isArray(src.layers) ? src.layers : []).filter(l => l && typeof l === "object");
  const layers = layersSrc.map((l, i) => ({
    id: (typeof l.id === "string" && l.id) ? l.id : `layer-${genId().slice(-6)}`,
    name: (typeof l.name === "string" && l.name.trim()) ? l.name : `Layer ${i + 1}`,
    visible: l.visible !== false,
    locked: l.locked === true,
    shapes: (Array.isArray(l.shapes) ? l.shapes : []).map(ensureMapShape).filter(Boolean),
  }));
  if (layers.length === 0) layers.push(makeDefaultMapLayer("Drawing"));
  return {
    width: Math.max(1, Math.round(num(src.width, MAP_DRAWING_DEFAULT_SIZE.width))),
    height: Math.max(1, Math.round(num(src.height, MAP_DRAWING_DEFAULT_SIZE.height))),
    background: {
      fill: hex(bg.fill) || preset.fill,
      grain: Math.max(0, Math.min(1, num(bg.grain, preset.grain))),
    },
    layers,
  };
}

// mapData as every consumer may assume it: image (string or null, as the r001
// migration kept it), pins (array, untouched here), drawing (normalized).
function ensureMapData(md) {
  const src = (md && typeof md === "object") ? md : {};
  return {
    image: typeof src.image === "string" ? src.image : null,
    pins: Array.isArray(src.pins) ? src.pins : [],
    drawing: ensureDrawingShape(src.drawing),
  };
}

function makeDefaultMapData() {
  return ensureMapData(null);
}

// state.mapStamps: stamps imported from stamp packs, world-scoped, each
// `{ id, name, viewBox, body, packId, pack }` with the id namespaced by its
// pack (`forest__pine`). Rebuilt here on every load: ids normalized and
// deduplicated, the viewBox validated, and every body put through the
// sanitizer again, so a hand-edited or foreign world file cannot carry markup
// the import would have refused. A stamp with nothing left after cleaning is
// dropped. Built-in stamps are never stored.
function ensureMapStamps(list) {
  const seen = new Set();
  const out = [];
  (Array.isArray(list) ? list : []).forEach(s => {
    if (!s || typeof s !== "object") return;
    const id = mapStampSlug(s.id);
    if (!id || seen.has(id)) return;
    const clean = sanitizeMapStampBody(s.body);
    if (!clean.body) return;
    seen.add(id);
    out.push({
      id,
      name: (typeof s.name === "string" && s.name.trim()) ? s.name.trim().slice(0, 60) : id,
      viewBox: mapStampViewBox(s.viewBox) || "0 0 64 64",
      body: clean.body,
      packId: (typeof s.packId === "string" && s.packId) ? mapStampSlug(s.packId) : "",
      pack: (typeof s.pack === "string" && s.pack.trim()) ? s.pack.trim().slice(0, 80) : "",
    });
  });
  return out;
}

// What a stamp body may contain. A stamp pack is the first third-party markup
// Cartulary renders in-app and writes into exported pages other people open,
// so the body is not trusted as text: it is parsed and rebuilt from this list,
// elements and attributes alike, with every attribute value held to a plain
// charset (numbers, path data, transforms, colors) and `url(` refused outright.
// No text, no href, no style, no use, no script, no handlers, and nothing in a
// namespace. Values that pass cannot run or fetch anything.
const MAP_STAMP_ALLOWLIST = {
  elements: ["g", "path", "circle", "ellipse", "rect", "polygon", "polyline", "line"],
  attrs: ["d", "points", "cx", "cy", "r", "rx", "ry", "x", "y", "x1", "y1", "x2", "y2", "width", "height",
    "fill", "fill-rule", "fill-opacity", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin",
    "stroke-dasharray", "stroke-opacity", "stroke-miterlimit", "opacity", "transform"],
  value: /^[A-Za-z0-9 .,#()%+\-]*$/,
};

// A stamp or pack id: lower-case letters, digits, underscore, dash; anything
// else becomes a dash; at most forty characters. Empty when nothing survives.
function mapStampSlug(v) {
  return String(v == null ? "" : v).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

// "minx miny width height", four finite numbers with a positive size, as a
// normalized string; null for anything else.
function mapStampViewBox(v) {
  if (typeof v !== "string") return null;
  const parts = v.trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || !parts.every(Number.isFinite) || parts[2] <= 0 || parts[3] <= 0) return null;
  return parts.map(n => String(Math.round(n * 1000) / 1000)).join(" ");
}

// The sanitizer. Returns the rebuilt body and the list of what it removed,
// each entry readable ("<script>", "onclick on <path>", a refused value).
// The body is parsed with the HTML parser, as inline svg inside a page,
// because that is how the app (innerHTML) and an exported page render it:
// what the sanitizer sees is what would have rendered, unbound prefixes and
// unclosed tags included, where the XML parser would refuse a body a browser
// draws without complaint. An unparseable body comes back empty.
function sanitizeMapStampBody(body) {
  const dropped = [];
  if (typeof body !== "string" || !body.trim()) return { body: "", dropped };
  let doc;
  try {
    doc = new DOMParser().parseFromString(`<!DOCTYPE html><html><body><svg xmlns="http://www.w3.org/2000/svg">${body}</svg></body></html>`, "text/html");
  } catch (err) {
    return { body: "", dropped: ["markup that could not be parsed"] };
  }
  const root = doc && doc.body ? doc.body.querySelector("svg") : null;
  if (!root) return { body: "", dropped: ["markup that could not be parsed"] };
  if (Array.from(doc.body.childNodes).some(n => n !== root && !(n.nodeType === 3 && !n.textContent.trim()))) dropped.push("content outside the drawing (after a stray closing tag)");
  const allowedEl = new Set(MAP_STAMP_ALLOWLIST.elements);
  const allowedAttr = new Set(MAP_STAMP_ALLOWLIST.attrs);
  const build = (el) => {
    const tag = el.localName;
    if (el.namespaceURI !== "http://www.w3.org/2000/svg" || !allowedEl.has(tag)) { dropped.push(`<${tag}>`); return ""; }
    const attrs = [];
    Array.from(el.attributes).forEach(a => {
      const name = a.name;
      if (!allowedAttr.has(name)) { dropped.push(`${name} on <${tag}>`); return; }
      const v = a.value.trim();
      if (!MAP_STAMP_ALLOWLIST.value.test(v) || /url\s*\(/i.test(v)) { dropped.push(`${name}="${v.slice(0, 24)}${v.length > 24 ? "\u2026" : ""}" on <${tag}>`); return; }
      attrs.push(` ${name}="${v}"`);
    });
    const kids = Array.from(el.children).map(build).join("");
    return kids ? `<${tag}${attrs.join("")}>${kids}</${tag}>` : `<${tag}${attrs.join("")}/>`;
  };
  const out = Array.from(root.children).map(build).join("");
  return { body: out, dropped };
}

// A pack file, parsed and sanitized but not yet applied. ok:false carries an
// error for the flash; ok:true carries the pack ({id, name}), the stamps as
// they will be stored (ids namespaced), and a report: what the sanitizer
// removed per stamp, which stamps were dropped and why, and how many of the
// survivors replace a stamp already in the world (same pack, re-imported).
function parseMapStampPack(text, existing) {
  let parsed;
  try { parsed = JSON.parse(text); } catch (err) { return { ok: false, error: "Couldn't parse that file as JSON." }; }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || parsed.cartulary_mapstamp_pack !== 1 || !Array.isArray(parsed.stamps)) {
    return { ok: false, error: "That doesn't look like a Cartulary stamp pack." };
  }
  if (parsed.stamps.length > 500) return { ok: false, error: "A stamp pack holds at most 500 stamps." };
  const name = (typeof parsed.name === "string" && parsed.name.trim()) ? parsed.name.trim().slice(0, 80) : "Imported stamps";
  const packId = mapStampSlug((typeof parsed.id === "string" && parsed.id.trim()) ? parsed.id : name) || "pack";
  const seen = new Set();
  const stamps = [];
  const removed = [];
  const droppedStamps = [];
  parsed.stamps.forEach((s, i) => {
    const rawId = (s && typeof s.id === "string") ? s.id : "";
    const label = rawId || `stamp #${i + 1}`;
    const sid = mapStampSlug(rawId);
    if (!s || typeof s !== "object" || !sid) { droppedStamps.push({ id: label, reason: "no usable id" }); return; }
    if (seen.has(sid)) { droppedStamps.push({ id: label, reason: "duplicate id" }); return; }
    if (typeof s.body !== "string") { droppedStamps.push({ id: label, reason: "no body" }); return; }
    if (s.body.length > 200000) { droppedStamps.push({ id: label, reason: "body over 200 KB" }); return; }
    const clean = sanitizeMapStampBody(s.body);
    const items = clean.dropped.slice();
    const vb = mapStampViewBox(s.viewBox);
    if (s.viewBox != null && !vb) items.push(`viewBox "${String(s.viewBox).slice(0, 24)}" replaced by 0 0 64 64`);
    if (items.length) removed.push({ id: sid, items });
    if (!clean.body) { droppedStamps.push({ id: label, reason: "nothing left after cleaning" }); return; }
    seen.add(sid);
    stamps.push({
      id: `${packId}__${sid}`,
      name: (typeof s.name === "string" && s.name.trim()) ? s.name.trim().slice(0, 60) : sid,
      viewBox: vb || "0 0 64 64",
      body: clean.body,
      packId,
      pack: name,
    });
  });
  const existingIds = new Set((Array.isArray(existing) ? existing : []).map(s => s.id));
  const updated = stamps.filter(s => existingIds.has(s.id)).length;
  return { ok: true, pack: { id: packId, name }, stamps, report: { removed, dropped: droppedStamps, updated, added: stamps.length - updated } };
}

// A pack file for export: the pack's own ids (the namespace stripped), so a
// re-import lands on the same world ids and replaces its own.
function buildMapStampPackFile(id, name, stamps) {
  const prefix = `${id}__`;
  return {
    cartulary_mapstamp_pack: 1,
    id,
    name,
    exported_at: new Date().toISOString(),
    stamps: (stamps || []).map(s => ({
      id: s.id.startsWith(prefix) ? s.id.slice(prefix.length) : s.id,
      name: s.name,
      viewBox: s.viewBox,
      body: s.body,
    })),
  };
}

// How many placed stamps reference each stamp id, and on how many maps.
function mapStampUsage(state) {
  const out = {};
  (state && Array.isArray(state.cartographia) ? state.cartographia : []).forEach(rec => {
    const d = rec && rec.mapData && rec.mapData.drawing;
    const onThisMap = new Set();
    (d && Array.isArray(d.layers) ? d.layers : []).forEach(l => (Array.isArray(l.shapes) ? l.shapes : []).forEach(s => {
      if (!s || s.type !== "stamp" || typeof s.stampId !== "string") return;
      const u = out[s.stampId] || (out[s.stampId] = { shapes: 0, maps: 0 });
      u.shapes += 1;
      if (!onThisMap.has(s.stampId)) { onThisMap.add(s.stampId); u.maps += 1; }
    }));
  });
  return out;
}

// Imported stamps grouped by pack, in first-seen order; stamps with no pack
// (a hand-edited world) group under "Ungrouped".
function mapStampGroups(stamps) {
  const groups = [];
  const byId = new Map();
  (Array.isArray(stamps) ? stamps : []).forEach(s => {
    const id = (typeof s.packId === "string" && s.packId) ? s.packId : "stamps";
    let g = byId.get(id);
    if (!g) {
      g = { id, name: (typeof s.pack === "string" && s.pack) ? s.pack : (id === "stamps" ? "Ungrouped" : id), stamps: [] };
      byId.set(id, g);
      groups.push(g);
    }
    g.stamps.push(s);
  });
  return groups;
}

// ─── Map drawing renderer (v1.6 pillar 3) ──────────────────────────────────────
// One tree, two serializers. buildMapDrawingTree() turns a drawing (plus the
// map image, when there is one) into a plain node tree {tag, attrs, children};
// mapTreeToReact() renders that tree in the app and mapTreeToString() writes it
// into the HTML export. Nothing else draws a map, so the two cannot drift.
// Attribute names are SVG's own (stroke-width, font-family) and the React
// serializer camel-cases them. Shapes arrive normalized by ensureMapShape, so
// every number is finite and every color is hex or null; the renderer draws
// what the data says and invents nothing, except that a text shape with no
// fill is drawn in ink, because invisible text is never what anyone meant.
//
// Canvas size: the image's natural pixel size when an image exists (pins are
// 0-1 normalized to the canvas rect, which is the image's rect today, and that
// must not move), else the drawing's stored width and height. The editor
// records the natural size into the drawing the first time an image loads
// while the drawing is still empty, so removing the image later keeps the
// shapes' units; the view never writes.

function mapNum(n) {
  return String(Math.round(n * 100) / 100);
}

function mapEscapeXml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// True when any layer, visible or not, holds a shape. The export skips an
// image-less map with no pins and no content; MapEditor's size heal only runs
// while this is false.
function mapDrawingHasContent(drawing) {
  const d = ensureDrawingShape(drawing);
  return d.layers.some(l => l.shapes.length > 0);
}

// Quadratic path through the midpoints of consecutive segments, with the
// vertices as control points. Open for strokes, closed for polygons.
function mapSmoothPath(points, closed) {
  const n = points.length;
  const f = mapNum;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  if (n < 2) return "";
  if (n === 2) return `M${f(points[0][0])} ${f(points[0][1])} L${f(points[1][0])} ${f(points[1][1])}`;
  const parts = [];
  if (closed) {
    const start = mid(points[n - 1], points[0]);
    parts.push(`M${f(start[0])} ${f(start[1])}`);
    for (let i = 0; i < n; i++) {
      const c = points[i];
      const e = mid(c, points[(i + 1) % n]);
      parts.push(`Q${f(c[0])} ${f(c[1])} ${f(e[0])} ${f(e[1])}`);
    }
    parts.push("Z");
  } else {
    parts.push(`M${f(points[0][0])} ${f(points[0][1])}`);
    for (let i = 1; i < n - 1; i++) {
      const c = points[i];
      const e = mid(c, points[i + 1]);
      parts.push(`Q${f(c[0])} ${f(c[1])} ${f(e[0])} ${f(e[1])}`);
    }
    parts.push(`L${f(points[n - 1][0])} ${f(points[n - 1][1])}`);
  }
  return parts.join(" ");
}

// Paper grain: fractal noise tinted a warm brown, alpha scaled by the grain
// amount, laid over the background fill as a second rect. sRGB interpolation
// so the tint reads the same in-app and in the export.
function mapGrainFilterNode(id, grain) {
  const a = mapNum(0.6 * grain);
  return {
    tag: "filter",
    attrs: { id, x: "0", y: "0", width: "100%", height: "100%", "color-interpolation-filters": "sRGB" },
    children: [
      { tag: "feTurbulence", attrs: { type: "fractalNoise", baseFrequency: "0.65", numOctaves: "3", seed: "11", stitchTiles: "stitch", result: "noise" } },
      { tag: "feColorMatrix", attrs: { in: "noise", type: "matrix", values: `0 0 0 0 0.36  0 0 0 0 0.27  0 0 0 0 0.16  0 0 0 ${a} 0` } },
    ],
  };
}


// The four built-in stamps: line art in a 64 x 64 box. Parts carry no fill or
// stroke of their own so they inherit the shape's from the <use>; parts that
// must stay hollow say fill="none". Line weight is the symbol's own and scales
// with the stamp. Bodies are markup written as markup (the `raw` node below);
// these are code. Imported stamps (state.mapStamps) have the same shape and
// reach the renderer only through ensureMapStamps, which sanitizes every body
// on load, so nothing unsanitized reaches a page either way.
const MAP_BUILTIN_STAMPS = [
  { id: "mountain", name: "Mountain", viewBox: "0 0 64 64",
    body: '<path d="M3 56 L23 18 L33 34 L41 24 L61 56 Z" stroke-width="3" stroke-linejoin="round"/><path d="M23 18 L27 28 L22 33 L27 39 L21 45" fill="none" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/><path d="M41 24 L44 31 L40 35 L44 40" fill="none" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' },
  { id: "tree", name: "Tree", viewBox: "0 0 64 64",
    body: '<path d="M32 4 L19 26 L26 26 L15 42 L25 42 L12 58 L52 58 L39 42 L49 42 L38 26 L45 26 Z" stroke-width="3" stroke-linejoin="round"/><path d="M29 58 V63 H35 V58" fill="none" stroke-width="3" stroke-linejoin="round"/>' },
  { id: "settlement", name: "Settlement", viewBox: "0 0 64 64",
    body: '<path d="M6 58 V36 L16 26 L26 36 V58 Z" stroke-width="3" stroke-linejoin="round"/><path d="M26 58 V30 L39 16 L52 30 V58 Z" stroke-width="3" stroke-linejoin="round"/><path d="M52 58 V40 L58 34 V58 Z" stroke-width="3" stroke-linejoin="round"/><path d="M35 58 V44 H43 V58" fill="none" stroke-width="2.5" stroke-linejoin="round"/><path d="M39 16 V8 L46 10 L39 12" fill="none" stroke-width="2.5" stroke-linejoin="round"/>' },
  { id: "compass", name: "Compass rose", viewBox: "0 0 64 64",
    body: '<circle cx="32" cy="32" r="25" fill="none" stroke-width="2.5"/><path d="M32 3 L37 32 L32 61 L27 32 Z" stroke-width="2.5" stroke-linejoin="round"/><path d="M9 32 L32 27 L55 32 L32 37 Z" stroke-width="2.5" stroke-linejoin="round"/><path d="M12 12 L32 28 L52 12" fill="none" stroke-width="1.5"/><path d="M12 52 L32 36 L52 52" fill="none" stroke-width="1.5"/><circle cx="32" cy="32" r="3" fill="none" stroke-width="2"/>' },
];

// A stamp by id: the built-ins first, then the world's imported stamps.
function mapStampDef(id, stamps) {
  return MAP_BUILTIN_STAMPS.find(s => s.id === id) || (Array.isArray(stamps) ? stamps.find(s => s && s.id === id) : null) || null;
}

// A label's width, estimated from its characters: the renderer has no DOM to
// measure with, and the export runs where there is none. Cormorant Garamond
// capitals run about 0.68 em, lower case about 0.45, a space a quarter. Only
// a bent label depends on this, and only for where its apex sits.
function mapTextWidthEstimate(text, fontSize) {
  let w = 0;
  for (const ch of String(text || "")) {
    if (ch === " ") w += 0.25;
    else if (/[A-Z]/.test(ch)) w += 0.68;
    else if (/[0-9]/.test(ch)) w += 0.5;
    else if (/[ilj.,:;'!|]/.test(ch)) w += 0.25;
    else if (/[mwMW]/.test(ch)) w += 0.85;
    else w += 0.45;
  }
  return Math.max(fontSize * 0.5, w * fontSize);
}

// Where a label turns: its anchor when straight, the apex of its arc when bent.
function mapTextPivot(s) {
  if (Math.abs(s.arc || 0) >= 1) return [s.x + mapTextWidthEstimate(s.text, s.fontSize) / 2, s.y];
  return [s.x, s.y];
}

// The path a bent label runs along: a circular arc whose apex is the label's
// middle, bending through `arc` degrees over the label's estimated width,
// arching up for positive values and down for negative. The path runs well
// past both ends of the label so a wider-than-estimated label is never cut
// off; the label is centred on it, so the spare path is invisible.
function mapTextArcPath(s) {
  const f = mapNum;
  const theta = Math.min(180, Math.max(1, Math.abs(s.arc))) * Math.PI / 180;
  const wc = mapTextWidthEstimate(s.text, s.fontSize);
  const R = wc / (2 * Math.sin(theta / 2));
  const half = Math.min(170 * Math.PI / 180, (wc * 0.85 + s.fontSize) / R); // half the path's angle, in radians
  const [ax, ay] = mapTextPivot(s);
  const up = s.arc > 0;
  const cy = up ? ay + R : ay - R;
  const base = up ? -Math.PI / 2 : Math.PI / 2;
  const a1 = up ? base - half : base + half; // the left end
  const a2 = up ? base + half : base - half; // the right end
  const p1 = [ax + R * Math.cos(a1), cy + R * Math.sin(a1)];
  const p2 = [ax + R * Math.cos(a2), cy + R * Math.sin(a2)];
  const large = half > Math.PI / 2 ? 1 : 0;
  const sweep = up ? 1 : 0;
  return `M${f(p1[0])} ${f(p1[1])} A${f(R)} ${f(R)} 0 ${large} ${sweep} ${f(p2[0])} ${f(p2[1])}`;
}

// One normalized shape to one node, or null for a stamp whose symbol is not
// known. ctx ({idBase, defs, stampsUsed, stamps, placeholder}) comes from
// buildMapDrawingTree: a bent label's path goes into the defs, a stamp's
// symbol (built in or from ctx.stamps) is recorded so the tree can emit it
// once, and with ctx.placeholder (the editor) a stamp whose symbol is missing
// draws as a dashed box with a question mark so it can be found, re-pointed,
// or deleted; the view and the export draw nothing for it. Without ctx a bent
// label renders straight and a stamp renders nothing.
function mapShapeNode(s, ctx) {
  const f = mapNum;
  const paint = { fill: s.fill || "none", stroke: s.stroke || "none" };
  if (s.stroke) {
    paint["stroke-width"] = f(s.strokeWidth);
    paint["stroke-linejoin"] = "round";
    paint["stroke-linecap"] = "round";
  }
  const common = { "data-shape": s.id };
  switch (s.type) {
    case "rect": {
      const attrs = { ...common, x: f(s.x), y: f(s.y), width: f(s.w), height: f(s.h), ...paint };
      if (s.smooth) {
        const r = f(Math.min(s.w, s.h) / 8);
        attrs.rx = r;
        attrs.ry = r;
      }
      return { tag: "rect", attrs };
    }
    case "ellipse":
      return { tag: "ellipse", attrs: { ...common, cx: f(s.x + s.w / 2), cy: f(s.y + s.h / 2), rx: f(s.w / 2), ry: f(s.h / 2), ...paint } };
    case "polygon":
      if (s.smooth) return { tag: "path", attrs: { ...common, d: mapSmoothPath(s.points, true), ...paint } };
      return { tag: "polygon", attrs: { ...common, points: s.points.map(p => `${f(p[0])},${f(p[1])}`).join(" "), ...paint } };
    case "region": {
      const d = s.rings.map(r => (s.smooth ? mapSmoothPath(r, true) : `M${r.map(p => `${f(p[0])} ${f(p[1])}`).join(" L")} Z`)).join(" ");
      return { tag: "path", attrs: { ...common, d, "fill-rule": "evenodd", ...paint } };
    }
    case "stroke": {
      const linePaint = { ...paint, fill: "none" };
      if (s.smooth) return { tag: "path", attrs: { ...common, d: mapSmoothPath(s.points, false), ...linePaint } };
      return { tag: "polyline", attrs: { ...common, points: s.points.map(p => `${f(p[0])},${f(p[1])}`).join(" "), ...linePaint } };
    }
    case "text": {
      const attrs = {
        ...common,
        x: f(s.x), y: f(s.y),
        "font-family": "'Cormorant Garamond', serif",
        "font-size": f(s.fontSize),
        fill: s.fill || MAP_PALETTE[0].hex,
      };
      if (s.stroke) {
        attrs.stroke = s.stroke;
        attrs["stroke-width"] = f(s.strokeWidth);
        attrs["stroke-linejoin"] = "round";
        attrs["paint-order"] = "stroke";
      }
      if (s.rotation) {
        const [px, py] = mapTextPivot(s);
        attrs.transform = `rotate(${f(s.rotation)} ${f(px)} ${f(py)})`;
      }
      if (ctx && Math.abs(s.arc || 0) >= 1) {
        const pid = `${ctx.idBase}-arc-${String(s.id).replace(/[^A-Za-z0-9_-]/g, "")}`;
        ctx.defs.push({ tag: "path", attrs: { id: pid, d: mapTextArcPath(s), fill: "none" } });
        delete attrs.x;
        delete attrs.y;
        return { tag: "text", attrs, children: [{ tag: "textPath", attrs: { href: `#${pid}`, startOffset: "50%", "text-anchor": "middle" }, children: [s.text] }] };
      }
      return { tag: "text", attrs, children: [s.text] };
    }
    case "stamp": {
      if (!ctx) return null;
      const def = mapStampDef(s.stampId, ctx.stamps);
      if (!def) {
        if (!ctx.placeholder) return null;
        const g = { ...common, "data-missing-stamp": s.stampId };
        if (s.rotation) g.transform = `rotate(${f(s.rotation)} ${f(s.x + s.w / 2)} ${f(s.y + s.h / 2)})`;
        return { tag: "g", attrs: g, children: [
          { tag: "rect", attrs: { x: f(s.x), y: f(s.y), width: f(s.w), height: f(s.h), fill: "none", stroke: MAP_PALETTE[6].hex, "stroke-width": "2", "stroke-dasharray": "6 4", "vector-effect": "non-scaling-stroke" } },
          { tag: "text", attrs: { x: f(s.x + s.w / 2), y: f(s.y + s.h / 2), "text-anchor": "middle", "dominant-baseline": "central", "font-family": "'DM Sans', sans-serif", "font-size": f(Math.max(8, Math.min(s.w, s.h) * 0.5)), fill: MAP_PALETTE[6].hex }, children: ["?"] },
        ] };
      }
      ctx.stampsUsed.set(def.id, def);
      const attrs = { ...common, href: `#${ctx.idBase}-stamp-${String(def.id).replace(/[^A-Za-z0-9_-]/g, "")}`, x: f(s.x), y: f(s.y), width: f(s.w), height: f(s.h), fill: s.fill || "none", stroke: s.stroke || "none" };
      if (s.rotation) attrs.transform = `rotate(${f(s.rotation)} ${f(s.x + s.w / 2)} ${f(s.y + s.h / 2)})`;
      return { tag: "use", attrs };
    }
    default:
      return null;
  }
}

// opts: { id, className, label, imageHref, imageWidth, imageHeight, stamps,
// placeholder }. stamps is the world's imported stamps (state.mapStamps), which
// the built-ins come before; placeholder is the editor's, see mapShapeNode.
// With an image the canvas is the image's natural size and the background is not
// drawn; without one the background rect (and its grain) comes first. Then one
// <g> per visible layer, in order. <defs> carries the grain filter, the path
// of every bent label, and a <symbol> for every stamp the map uses, all with
// ids prefixed by the map so several maps on one exported page never collide.
// The returned root also carries width and height so a caller can read the
// canvas size it rendered at.
function buildMapDrawingTree(drawing, opts) {
  const o = opts || {};
  const d = ensureDrawingShape(drawing);
  const f = mapNum;
  const hasImage = typeof o.imageHref === "string" && o.imageHref.length > 0;
  const width = hasImage && Number.isFinite(o.imageWidth) && o.imageWidth > 0 ? o.imageWidth : d.width;
  const height = hasImage && Number.isFinite(o.imageHeight) && o.imageHeight > 0 ? o.imageHeight : d.height;
  const idBase = `map-${String(o.id || "canvas").replace(/[^A-Za-z0-9_-]/g, "")}`;
  const defs = [];
  const children = [];
  if (hasImage) {
    children.push({ tag: "image", attrs: { "data-role": "image", href: o.imageHref, x: "0", y: "0", width: f(width), height: f(height) } });
  } else {
    children.push({ tag: "rect", attrs: { "data-role": "background", x: "0", y: "0", width: f(width), height: f(height), fill: d.background.fill } });
    if (d.background.grain > 0) {
      const fid = `${idBase}-grain`;
      defs.push(mapGrainFilterNode(fid, d.background.grain));
      children.push({ tag: "rect", attrs: { "data-role": "grain", x: "0", y: "0", width: f(width), height: f(height), filter: `url(#${fid})` } });
    }
  }
  const ctx = { idBase, defs, stampsUsed: new Map(), stamps: Array.isArray(o.stamps) ? o.stamps : [], placeholder: !!o.placeholder };
  d.layers.forEach(layer => {
    if (!layer.visible) return;
    children.push({ tag: "g", attrs: { "data-layer": layer.id }, children: layer.shapes.map(s => mapShapeNode(s, ctx)).filter(Boolean) });
  });
  ctx.stampsUsed.forEach(def => {
    defs.push({ tag: "symbol", attrs: { id: `${idBase}-stamp-${String(def.id).replace(/[^A-Za-z0-9_-]/g, "")}`, viewBox: def.viewBox, overflow: "visible" }, raw: def.body });
  });
  const attrs = { xmlns: "http://www.w3.org/2000/svg", viewBox: `0 0 ${f(width)} ${f(height)}`, role: "img" };
  if (o.className) attrs.class = o.className;
  if (o.label) attrs["aria-label"] = o.label;
  return { tag: "svg", attrs, children: defs.length > 0 ? [{ tag: "defs", children: defs }, ...children] : children, width, height };
}

// Static markup for the HTML export. Text and attribute values are escaped;
// empty elements self-close, which HTML's parser honors for SVG content. A
// node with `raw` is a stamp symbol: its body is markup written as markup.
function mapTreeToString(node) {
  if (node == null) return "";
  if (typeof node === "string") return mapEscapeXml(node);
  const attrs = Object.entries(node.attrs || {})
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => ` ${k}="${mapEscapeXml(v)}"`)
    .join("");
  const kids = node.raw != null ? String(node.raw) : (node.children || []).map(mapTreeToString).join("");
  return kids ? `<${node.tag}${attrs}>${kids}</${node.tag}>` : `<${node.tag}${attrs}/>`;
}

// React elements for the app. SVG's dashed attribute names become React's
// camel-cased props (data-* and aria-* stay as they are); `extra` lands on the
// root, which is how the editor attaches its ref.
function mapTreeToReact(node, key, extra) {
  if (node == null) return null;
  if (typeof node === "string") return node;
  const props = { key };
  Object.entries(node.attrs || {}).forEach(([k, v]) => {
    if (v == null || v === "") return;
    let name = k;
    if (k === "class") name = "className";
    else if (k.includes("-") && !k.startsWith("data-") && !k.startsWith("aria-")) name = k.replace(/-([a-z])/g, (m, c) => c.toUpperCase());
    props[name] = v;
  });
  if (extra) Object.assign(props, extra);
  if (node.raw != null) {
    props.dangerouslySetInnerHTML = { __html: String(node.raw) };
    return React.createElement(node.tag, props);
  }
  const children = (node.children || []).map((c, i) => mapTreeToReact(c, i));
  return React.createElement(node.tag, props, ...children);
}

// Natural pixel size of the image at `url`, or null until it loads. The
// canvas waits for it, because the viewBox is the natural size and a canvas
// that resized after first paint would move every pin. A load failure reports
// through onError (the "Image not found" state), which the folder-path case
// never had before.
function useImageNaturalSize(url, onError) {
  const [size, setSize] = useState(null);
  useEffect(() => {
    setSize(null);
    if (!url) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => { if (!cancelled) setSize({ width: img.naturalWidth, height: img.naturalHeight }); };
    img.onerror = () => { if (!cancelled && onError) onError(); };
    img.src = url;
    return () => { cancelled = true; };
  }, [url]);
  return size;
}

// ─── Map drawing tools (v1.6 pillar 3) ─────────────────────────────────────────
// The editor's tools. Pin is a tool in the strip and the default, so a map
// opens exactly as it did before there was a strip; the drawing tools hand
// pointer events to the svg and make the pins inert until Pin is picked again.
// Tool state is local to the editor and never persisted. The drawing changes
// only through onChange, one new mapData each time, the same as pins do.
// Overlays (the selection box, the shape in progress, the rubber line) live in
// a second svg the editor owns, over the canvas, with no pointer events, so
// the one tree stays the drawing and the export cannot pick an overlay up.
// Coordinates convert the way pins do: a fraction of the svg's rect times the
// viewBox, so a pin and a vertex placed at the same cursor agree. Since r034
// every write goes through the editor's history (useMapHistory), one step
// per completed gesture, and shapes go to an explicit active layer.

const MAP_TOOLS = [
  { id: "pin",     label: "Pin",     hint: "Click on map to add pin · Click pin to edit · Drag pin to move" },
  { id: "select",  label: "Select",  hint: "Click a shape to select it · Drag to move · Drag a point or a corner to reshape · Drag the knob above to turn (Shift snaps) · Delete removes it · Right-click returns to Pin" },
  { id: "rect",    label: "Rect",    hint: "Drag on the map to draw a rectangle · Right-click when done" },
  { id: "ellipse", label: "Ellipse", hint: "Drag on the map to draw an ellipse · Right-click when done" },
  { id: "polygon", label: "Polygon", hint: "Click to place the corners of a closed, filled area · First corner, double-click, Enter, or right-click closes it · Esc discards" },
  { id: "stroke",  label: "Line",    hint: "Click to place the points of an open line · Double-click, Enter, or right-click finishes it · Esc discards" },
  { id: "freehand", label: "Freehand", hint: "Drag on the map to draw a line freehand · Esc while dragging discards it · Right-click when done" },
  { id: "fill",    label: "Fill",    hint: "Click inside an area to fill it with the Fill color · The fill goes under the lines around it, and small gaps in them close · Right-click when done" },
  { id: "text",    label: "Text",    hint: "Click on the map to place a label · Edit it, its size, its angle, and its arc in the strip · Right-click when done" },
  { id: "stamp",   label: "Stamp",   hint: "Pick a stamp in the strip, then click to place it or drag to size it · Right-click when done" },
];

// Canvas sizes offered on image-less maps (an image map's canvas is the image).
const MAP_CANVAS_PRESETS = [
  { id: "landscape", label: "Landscape 1600 × 1000", width: 1600, height: 1000 },
  { id: "portrait",  label: "Portrait 1000 × 1600",  width: 1000, height: 1600 },
  { id: "square",    label: "Square 1200 × 1200",    width: 1200, height: 1200 },
];

// Freehand: a new point every `spacing` of the canvas width while dragging
// (4 units at 1600 wide), Douglas-Peucker on release at `tolerance` of the
// width (4 units at 1600, about two screen pixels at the default width, which
// is where hand jitter lives), the tolerance raised by half until the stroke is
// under `maxPoints`; a polygon or line with more than `handleCap` points has
// no per-point handles in Select. All in canvas units, so the result does not
// depend on zoom.
const MAP_FREEHAND = { spacing: 1 / 400, tolerance: 1 / 400, maxPoints: 400, handleCap: 40 };

// Douglas-Peucker, iterative. Consecutive duplicates are dropped first; the
// ends always survive. Points are [x, y] pairs in canvas units.
function mapSimplifyPoints(points, tolerance) {
  const pts = [];
  points.forEach(p => { const last = pts[pts.length - 1]; if (!last || last[0] !== p[0] || last[1] !== p[1]) pts.push(p); });
  if (pts.length <= 2) return pts;
  const keep = new Array(pts.length).fill(false);
  keep[0] = true; keep[pts.length - 1] = true;
  const stack = [[0, pts.length - 1]];
  const tol2 = tolerance * tolerance;
  while (stack.length) {
    const [a, b] = stack.pop();
    if (b - a < 2) continue;
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let best = -1, bestD = 0;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = pts[i];
      let d2;
      if (len2 === 0) {
        d2 = (px - ax) * (px - ax) + (py - ay) * (py - ay);
      } else {
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
        const qx = ax + t * dx, qy = ay + t * dy;
        d2 = (px - qx) * (px - qx) + (py - qy) * (py - qy);
      }
      if (d2 > bestD) { bestD = d2; best = i; }
    }
    if (best >= 0 && bestD > tol2) { keep[best] = true; stack.push([a, best], [best, b]); }
  }
  return pts.filter((p, i) => keep[i]);
}

// The bucket fill's numbers: the trace raster's long side in pixels (the
// canvas is scaled down to it when bigger), the flood's color tolerance (the
// sum of the four channel differences from the clicked pixel, 0 to 1020), the
// gap closing in trace pixels (the fillable area is eroded by this much
// before the flood and the result grown back by one more, so a gap in an
// outline up to twice this closes on its own and the fill tucks under the
// line), the simplifier's tolerance in trace pixels, and the most points a
// region keeps (the tolerance is raised by half until it fits).
const MAP_FILL = { traceMax: 2048, tolerance: 96, close: 5, simplify: 1.25, maxPoints: 2000 };

// The pixels within `tolerance` of the seed's color, one byte per pixel.
function mapMatchMask(img, w, h, sx, sy, tolerance) {
  const data = img.data;
  const mask = new Uint8Array(w * h);
  const i0 = (sy * w + sx) * 4;
  const r0 = data[i0], g0 = data[i0 + 1], b0 = data[i0 + 2], a0 = data[i0 + 3];
  for (let i = 0, j = 0; i < w * h; i++, j += 4) {
    if (Math.abs(data[j] - r0) + Math.abs(data[j + 1] - g0) + Math.abs(data[j + 2] - b0) + Math.abs(data[j + 3] - a0) <= tolerance) mask[i] = 1;
  }
  return mask;
}

// The mask grown by `k` pixels in every direction (a square window, done as a
// horizontal pass then a vertical one). Shrinking is growing the complement.
function mapDilateMask(mask, w, h, k) {
  if (!(k > 0)) return mask;
  const pass = (src, stride, len, count, step) => {
    const out = new Uint8Array(src.length);
    for (let line = 0; line < count; line++) {
      const base = line * step;
      // a window of 2k + 1 centred on the output pixel, kept as a running count
      let sum = 0;
      for (let i = 0; i < len + k; i++) {
        if (i < len && src[base + i * stride]) sum++;
        if (i - 2 * k - 1 >= 0 && src[base + (i - 2 * k - 1) * stride]) sum--;
        const o = i - k;
        if (o >= 0 && o < len && sum > 0) out[base + o * stride] = 1;
      }
    }
    return out;
  };
  const horizontal = pass(mask, 1, w, h, w);
  return pass(horizontal, w, h, w, 1);
}

// A 4-connected flood from (sx, sy) over the set pixels of `fillable`,
// scanline by scanline. Returns the flooded mask.
function mapFloodMask(fillable, w, h, sx, sy) {
  const mask = new Uint8Array(w * h);
  if (!fillable[sy * w + sx]) return mask;
  const stack = [[sx, sy]];
  while (stack.length) {
    const [x, y] = stack.pop();
    const i = y * w + x;
    if (mask[i] || !fillable[i]) continue;
    let xl = x, xr = x;
    while (xl > 0 && !mask[i - (x - xl) - 1] && fillable[i - (x - xl) - 1]) xl--;
    while (xr < w - 1 && !mask[i + (xr - x) + 1] && fillable[i + (xr - x) + 1]) xr++;
    for (let xx = xl; xx <= xr; xx++) mask[y * w + xx] = 1;
    for (let dy = -1; dy <= 1; dy += 2) {
      const yy = y + dy;
      if (yy < 0 || yy >= h) continue;
      let inRun = false;
      for (let xx = xl; xx <= xr; xx++) {
        const j = yy * w + xx;
        const ok = !mask[j] && fillable[j];
        if (ok && !inRun) { stack.push([xx, yy]); inRun = true; } else if (!ok) inRun = false;
      }
    }
  }
  return mask;
}

// The mask's boundary as closed rings of pixel corners: every edge between a
// set pixel and an unset one (or the raster's edge) is a directed segment
// running clockwise around the set pixels, and the segments link into loops.
// Outer edges and holes both come out, which the even-odd fill wants.
function mapTraceMask(mask, w, h) {
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : mask[y * w + x]);
  const segs = new Map();
  const add = (sx, sy, ex, ey) => {
    const k = sx * (h + 1) + sy;
    const list = segs.get(k);
    if (list) list.push(ex, ey); else segs.set(k, [ex, ey]);
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      if (!at(x, y - 1)) add(x, y, x + 1, y);
      if (!at(x + 1, y)) add(x + 1, y, x + 1, y + 1);
      if (!at(x, y + 1)) add(x + 1, y + 1, x, y + 1);
      if (!at(x - 1, y)) add(x, y + 1, x, y);
    }
  }
  const rings = [];
  segs.forEach((list, k) => {
    while (list.length) {
      const sx = Math.floor(k / (h + 1)), sy = k % (h + 1);
      const ring = [[sx, sy]];
      let ey = list.pop(), ex = list.pop();
      let guard = 0;
      while (!(ex === sx && ey === sy) && guard++ < 4000000) {
        ring.push([ex, ey]);
        const next = segs.get(ex * (h + 1) + ey);
        if (!next || !next.length) break;
        ey = next.pop(); ex = next.pop();
      }
      if (ring.length >= 4) rings.push(ring);
    }
  });
  return rings;
}

// The svg drawn to a canvas at `scale` times its size, for the download's
// png and for the bucket fill's trace. Everything the svg needs is inline,
// so the canvas stays clean and can be read back. Rejects when the svg will
// not decode.
function mapSvgToCanvas(svg, width, height, scale) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas);
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("the svg would not decode")); };
    img.src = url;
  });
}

// Shift a normalized shape by (dx, dy) viewBox units, rounded to two decimals
// so stored coordinates stay short.
function translateMapShape(s, dx, dy) {
  const r = (v) => Math.round(v * 100) / 100;
  if (s.type === "polygon" || s.type === "stroke") return { ...s, points: s.points.map(p => [r(p[0] + dx), r(p[1] + dy)]) };
  if (s.type === "region") return { ...s, rings: s.rings.map(ring => ring.map(p => [r(p[0] + dx), r(p[1] + dy)])) };
  return { ...s, x: r(s.x + dx), y: r(s.y + dy) };
}

// A shape's frame in its own coordinates, before its rotation, padded the way
// the selection box is: the box the handles sit on, and the point the shape
// turns around (a stamp its middle, a label its pivot). A rect, ellipse, or
// stamp carries its box; a label's is the measured selection box the hook
// keeps, so a label has no frame until it is selected. Null for a polygon or
// line, which have points instead.
function mapShapeFrame(s, selBox) {
  if (!s) return null;
  if (s.type === "rect" || s.type === "ellipse" || s.type === "stamp") {
    const pad = (s.type !== "stamp" && s.stroke ? s.strokeWidth / 2 : 0) + 2;
    return { x: s.x - pad, y: s.y - pad, w: s.w + 2 * pad, h: s.h + 2 * pad, cx: s.x + s.w / 2, cy: s.y + s.h / 2 };
  }
  if (s.type === "text") {
    if (!selBox) return null;
    const [cx, cy] = mapTextPivot(s);
    return { x: selBox.x, y: selBox.y, w: selBox.w, h: selBox.h, cx, cy };
  }
  return null;
}

// All of the tool interaction, as a hook so MapEditor's render stays readable.
// Takes the normalized mapData and the editor's commit (useMapHistory's, which
// takes an options object after the record), the svg ref (the canvas, for
// coordinates and hit tests), the canvas div ref (focused on mousedown so the
// browser's own keyboard scrolling stays on the canvas), and the canvas size
// the tree rendered at.
function useMapDrawing({ data, onChange, svgRef, canvasRef, width, height, fillContext }) {
  const [tool, setToolState] = useState("pin");
  const [filling, setFilling] = useState(false); // a bucket fill in flight; a second click waits
  const [fillNote, setFillNote] = useState(null); // why the last fill did nothing, in the hint until the next click or tool
  // Defaults for the first shape: stone fill, sepia stroke. Stone because a
  // fill has to be visibly a fill on white, vellum, and parchment alike;
  // parchment on vellum read as an outline.
  const [style, setStyle] = useState({ fill: "#8a8378", stroke: "#6b4e2e", strokeWidth: 4, smooth: true });
  const [selectedShapeId, setSelectedShapeId] = useState(null);
  const [draft, setDraft] = useState(null);     // rect/ellipse: {type, x0, y0, x1, y1}; polygon/stroke: {type, points}
  const [cursor, setCursor] = useState(null);   // [x, y] while a polygon or line is in progress
  const [moving, setMoving] = useState(null);   // {id, startX, startY, origin} while Select drags a whole shape
  const [vertexDrag, setVertexDrag] = useState(null); // {id, index} while Select drags one point of a polygon or line
  const [selBox, setSelBox] = useState(null);   // selection box in viewBox units, measured from the DOM
  const [activeLayerId, setActiveLayerId] = useState(null); // explicit; falls back to the first visible unlocked layer
  const [focusTextId, setFocusTextId] = useState(null); // a label just placed: the strip's field takes focus once, then forgets
  const [stampId, setStampId] = useState(MAP_BUILTIN_STAMPS[0].id); // the stamp the Stamp tool places next
  const [handleDrag, setHandleDrag] = useState(null); // {kind: "scale"|"rotate", id, handle, origin, start, seq} while Select drags a frame handle

  const drawing = data.drawing;
  const layers = drawing.layers;
  // The active layer is the one picked in the panel (or the strip's Layer
  // select); until one is picked, or if it was deleted, the first visible
  // unlocked layer. A hidden or locked active layer refuses drawing, and the
  // hint says which, rather than quietly drawing somewhere else.
  const activeLayer = layers.find(l => l.id === activeLayerId) || layers.find(l => l.visible && !l.locked) || layers[0] || null;
  const targetLayer = activeLayer && activeLayer.visible && !activeLayer.locked ? activeLayer : null;
  const allShapes = layers.flatMap(l => l.shapes);
  const selectable = layers.filter(l => l.visible && !l.locked).flatMap(l => l.shapes);
  const selectedShape = selectedShapeId ? (allShapes.find(s => s.id === selectedShapeId) || null) : null;

  const r2 = (v) => Math.round(v * 100) / 100;
  const toPoint = (e) => {
    const el = svgRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const fx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const fy = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return [r2(fx * width), r2(fy * height)];
  };
  // viewBox units per screen pixel, for click tolerances that should feel the same at any zoom
  const unitsPerPx = () => {
    const el = svgRef.current;
    const rect = el ? el.getBoundingClientRect() : null;
    return rect && rect.width ? width / rect.width : 1;
  };

  // Every write: one new mapData through the history. opts.coalesce names a
  // gesture so its many commits are one undo step.
  const setLayers = (next, opts) => onChange({ ...data, drawing: { ...drawing, layers: next } }, opts);
  const addShape = (raw) => {
    if (!targetLayer) return null;
    const shape = ensureMapShape({ id: `shape-${genId().slice(-6)}`, ...raw });
    if (!shape) return null;
    setLayers(layers.map(l => l.id === targetLayer.id ? { ...l, shapes: [...l.shapes, shape] } : l));
    return shape.id;
  };
  const updateShape = (id, patch, opts) => {
    setLayers(layers.map(l => ({ ...l, shapes: l.shapes.map(s => s.id === id ? (ensureMapShape({ ...s, ...patch }) || s) : s) })), opts);
  };
  const deleteShape = (id) => {
    setLayers(layers.map(l => ({ ...l, shapes: l.shapes.filter(s => s.id !== id) })));
    if (selectedShapeId === id) setSelectedShapeId(null);
  };

  // Layer operations. Layers draw in array order, so "up" is toward the end.
  const addLayer = () => {
    const layer = makeDefaultMapLayer(`Layer ${layers.length + 1}`);
    setLayers([...layers, layer]);
    setActiveLayerId(layer.id);
  };
  const renameLayer = (id, name) => setLayers(layers.map(l => l.id === id ? { ...l, name } : l), { coalesce: `rename-${id}` });
  const toggleLayerVisible = (id) => {
    setLayers(layers.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
    if (selectedShape && layers.some(l => l.id === id && l.visible && l.shapes.some(s => s.id === selectedShape.id))) setSelectedShapeId(null);
  };
  const toggleLayerLocked = (id) => {
    setLayers(layers.map(l => l.id === id ? { ...l, locked: !l.locked } : l));
    if (selectedShape && layers.some(l => l.id === id && !l.locked && l.shapes.some(s => s.id === selectedShape.id))) setSelectedShapeId(null);
  };
  const moveLayer = (id, dir) => {
    const i = layers.findIndex(l => l.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= layers.length) return;
    const next = layers.slice();
    const [l] = next.splice(i, 1);
    next.splice(j, 0, l);
    setLayers(next);
  };
  const deleteLayer = (id) => {
    if (layers.length <= 1) return;
    const l = layers.find(x => x.id === id);
    if (!l) return;
    if (l.shapes.length > 0 && !confirm(`Delete layer "${l.name}" and its ${l.shapes.length} ${l.shapes.length === 1 ? "shape" : "shapes"}? Undo brings it back.`)) return;
    setLayers(layers.filter(x => x.id !== id));
    if (selectedShape && l.shapes.some(s => s.id === selectedShape.id)) setSelectedShapeId(null);
  };
  const moveShapeToLayer = (shapeId, layerId) => {
    const from = layers.find(l => l.shapes.some(s => s.id === shapeId));
    const shape = from ? from.shapes.find(s => s.id === shapeId) : null;
    if (!shape || !layers.some(l => l.id === layerId) || from.id === layerId) return;
    setLayers(layers.map(l => {
      if (l.id === from.id) return { ...l, shapes: l.shapes.filter(s => s.id !== shapeId) };
      if (l.id === layerId) return { ...l, shapes: [...l.shapes, shape] };
      return l;
    }));
    const to = layers.find(l => l.id === layerId);
    if (selectedShapeId === shapeId && to && (!to.visible || to.locked)) setSelectedShapeId(null);
  };

  const setTool = (t) => {
    setToolState(t);
    setFillNote(null);
    setDraft(null);
    setCursor(null);
    setMoving(null);
    setVertexDrag(null);
    setHandleDrag(null);
    if (t !== "select") setSelectedShapeId(null);
  };

  // The strip shows the selected shape's style when there is one, else the
  // defaults; a change edits the selected shape and becomes the default too.
  const current = selectedShape
    ? { fill: selectedShape.fill, stroke: selectedShape.stroke, strokeWidth: selectedShape.strokeWidth, smooth: !!selectedShape.smooth }
    : style;
  const applyStyle = (patch, coalesceKey) => {
    setStyle(st => ({ ...st, ...patch }));
    if (selectedShape) updateShape(selectedShape.id, patch, coalesceKey ? { coalesce: `${coalesceKey}-${selectedShape.id}` } : undefined);
  };
  // Text content, size, and angle edit the selected shape only, never the
  // defaults; typing coalesces into one undo step per field.
  const editSelected = (patch, coalesceKey) => {
    if (!selectedShape) return;
    updateShape(selectedShape.id, patch, coalesceKey ? { coalesce: `${coalesceKey}-${selectedShape.id}` } : undefined);
  };

  // Commits the polygon or line in progress (a rect or ellipse commits on
  // mouseup instead) and returns the new shape's id, or null.
  const finishDraft = (pointsOverride) => {
    if (!draft) return null;
    let id = null;
    if (draft.type === "freehand") {
      let tol = MAP_FREEHAND.tolerance * width;
      let pts = mapSimplifyPoints(draft.points, tol);
      while (pts.length > MAP_FREEHAND.maxPoints) { tol *= 1.5; pts = mapSimplifyPoints(draft.points, tol); }
      if (pts.length >= 2) {
        id = addShape({ type: "stroke", points: pts.map(p => [r2(p[0]), r2(p[1])]), fill: null, stroke: style.stroke, strokeWidth: style.strokeWidth, smooth: true });
      }
      setDraft(null);
      setCursor(null);
      return id;
    }
    if (draft.type === "polygon" || draft.type === "stroke") {
      const pts = pointsOverride || draft.points;
      if (pts.length >= (draft.type === "polygon" ? 3 : 2)) {
        id = addShape({ type: draft.type, points: pts, fill: draft.type === "stroke" ? null : style.fill, stroke: style.stroke, strokeWidth: style.strokeWidth, smooth: style.smooth });
      }
    }
    setDraft(null);
    setCursor(null);
    return id;
  };
  const cancelDraft = () => { setDraft(null); setCursor(null); };

  const onSvgMouseDown = (e) => {
    if (e.button !== 0) return;
    if (canvasRef.current && canvasRef.current.focus) canvasRef.current.focus({ preventScroll: true });
    const p = toPoint(e);
    if (!p) return;
    if (tool === "rect" || tool === "ellipse" || tool === "stamp") {
      if (!targetLayer) return;
      e.preventDefault();
      setDraft({ type: tool, x0: p[0], y0: p[1], x1: p[0], y1: p[1] });
      return;
    }
    if (tool === "freehand") {
      if (!targetLayer) return;
      e.preventDefault();
      setDraft({ type: "freehand", points: [p] });
      return;
    }
    if (tool === "select") {
      // In Select the overlay takes the events: its hit copies carry data-shape,
      // the selected polygon's or line's point handles carry data-vertex, and
      // the selected frame's corners and knob carry data-handle.
      const handle = e.target && e.target.closest ? e.target.closest("[data-handle]") : null;
      if (handle && selectedShape) {
        e.preventDefault();
        const h = handle.getAttribute("data-handle");
        setHandleDrag({ kind: h === "rotate" ? "rotate" : "scale", id: selectedShape.id, handle: h, origin: selectedShape, start: p, seq: Date.now() });
        return;
      }
      const vertex = e.target && e.target.closest ? e.target.closest("[data-vertex]") : null;
      if (vertex && selectedShape) {
        e.preventDefault();
        setVertexDrag({ id: selectedShape.id, index: parseInt(vertex.getAttribute("data-vertex"), 10), seq: Date.now() });
        return;
      }
      const hit = e.target && e.target.closest ? e.target.closest("[data-shape]") : null;
      const id = hit ? hit.getAttribute("data-shape") : null;
      const shape = id ? selectable.find(s => s.id === id) : null;
      if (!shape) { setSelectedShapeId(null); return; }
      e.preventDefault();
      setSelectedShapeId(shape.id);
      setMoving({ id: shape.id, startX: p[0], startY: p[1], origin: shape, seq: Date.now() });
    }
  };
  // Right-click: in a drawing tool, finish what is in progress and go to Select
  // with it selected; in Select, back to Pin. Never the browser's menu.
  const onSvgContextMenu = (e) => {
    e.preventDefault();
    if (tool === "pin") return;
    if (tool === "select") { setTool("pin"); return; }
    const id = finishDraft();
    setToolState("select");
    setMoving(null);
    setVertexDrag(null);
    setHandleDrag(null);
    setSelectedShapeId(id || ((tool === "text" || tool === "stamp") ? selectedShapeId : null));
  };
  // The bucket fill. The drawing as it stands is rasterized off-screen (the
  // image when there is one, the background without its grain, every visible
  // layer), flooded from the click, grown a pixel, traced, simplified, and
  // committed as a region (Smooth off: the trace is within a pixel already,
  // and smoothing would bend a rectangle into an oval) just above the topmost
  // painted shape under the click, else at the bottom of the active layer.
  // One undo step. The layers
  // it edits are the ones at the click; an edit landing during the trace
  // (tens of milliseconds) would be overwritten, which is accepted.
  // The index, in the active layer, of the topmost shape whose paint covers
  // the point (a fill, a label, a stamp; not a line, not a hollow shape), or
  // -1. A region's holes do not cover. Read from the rendered svg, so it is
  // taken at the click, before the trace.
  const coverIndex = (p) => {
    const svg = svgRef.current;
    if (!svg || !targetLayer) return -1;
    const pt = typeof svg.createSVGPoint === "function" ? svg.createSVGPoint() : null;
    for (let i = targetLayer.shapes.length - 1; i >= 0; i--) {
      const s = targetLayer.shapes[i];
      if (!s.fill && s.type !== "stamp" && s.type !== "text") continue;
      const el = svg.querySelector(`[data-shape="${s.id.replace(/["\\]/g, "")}"]`);
      if (!el) continue;
      let inside = false;
      try {
        if (pt && typeof el.isPointInFill === "function") { pt.x = p[0]; pt.y = p[1]; inside = el.isPointInFill(pt); }
        else { const b = el.getBBox(); inside = p[0] >= b.x && p[0] <= b.x + b.width && p[1] >= b.y && p[1] <= b.y + b.height; }
      } catch (err) { inside = false; }
      if (inside) return i;
    }
    return -1;
  };
  const fillAt = async (p) => {
    if (!targetLayer || filling || !fillContext) return;
    setFillNote(null);
    const above = coverIndex(p);
    setFilling(true);
    try {
      const fc = await fillContext();
      const tree = buildMapDrawingTree({ ...drawing, background: { ...drawing.background, grain: 0 } }, {
        id: "fill", imageHref: fc.imageHref, imageWidth: fc.imageWidth, imageHeight: fc.imageHeight, stamps: fc.stamps,
      });
      // The trace svg is loaded as an image: it needs its size on the root (an
      // svg with only a viewBox draws nothing to a canvas in Firefox, and a
      // blank canvas would flood everything) and, for older engines, href
      // doubled as xlink:href, as the download does.
      const double = (node) => {
        if (!node || typeof node !== "object") return;
        if ((node.tag === "image" || node.tag === "use" || node.tag === "textPath") && node.attrs && node.attrs.href) node.attrs["xlink:href"] = node.attrs.href;
        (node.children || []).forEach(double);
      };
      double(tree);
      tree.attrs = { ...tree.attrs, "xmlns:xlink": "http://www.w3.org/1999/xlink", width: mapNum(tree.width), height: mapNum(tree.height) };
      const scale = Math.min(1, MAP_FILL.traceMax / Math.max(width, height));
      const canvas = await mapSvgToCanvas(mapTreeToString(tree), width, height, scale);
      const pw = canvas.width, ph = canvas.height;
      const img = canvas.getContext("2d").getImageData(0, 0, pw, ph);
      // A raster with no opaque pixel at all is a failed trace, not a map; a
      // flood over it would take the whole canvas.
      let painted = false;
      for (let i = 3; i < img.data.length; i += 4) { if (img.data[i]) { painted = true; break; } }
      if (!painted) { setFillNote("The map could not be traced in this browser, so nothing was filled"); return; }
      let sx = Math.max(0, Math.min(pw - 1, Math.floor(p[0] * scale)));
      let sy = Math.max(0, Math.min(ph - 1, Math.floor(p[1] * scale)));
      const k = MAP_FILL.close;
      const matching = mapMatchMask(img, pw, ph, sx, sy, MAP_FILL.tolerance);
      // Gap closing: the fillable area shrunk by k pixels is the complement of
      // the barrier grown by k, so a gap narrower than 2k is sealed. The
      // click may sit within k of a line; then the flood starts from the
      // nearest open pixel in reach, and if there is none the area is too
      // narrow to fill at all.
      const barrier = new Uint8Array(pw * ph);
      for (let i = 0; i < barrier.length; i++) barrier[i] = matching[i] ? 0 : 1;
      const grown = mapDilateMask(barrier, pw, ph, k);
      const open = new Uint8Array(pw * ph);
      for (let i = 0; i < open.length; i++) open[i] = grown[i] ? 0 : 1;
      if (!open[sy * pw + sx]) {
        let best = null, bestD = Infinity;
        for (let dy = -k; dy <= k; dy++) {
          for (let dx = -k; dx <= k; dx++) {
            const x = sx + dx, y = sy + dy;
            if (x < 0 || y < 0 || x >= pw || y >= ph || !open[y * pw + x]) continue;
            const d = dx * dx + dy * dy;
            if (d < bestD) { bestD = d; best = [x, y]; }
          }
        }
        if (!best) { setFillNote("Too close to a line to fill here; click further inside the area"); return; }
        sx = best[0]; sy = best[1];
      }
      const mask = mapDilateMask(mapFloodMask(open, pw, ph, sx, sy), pw, ph, k + 1);
      const traced = mapTraceMask(mask, pw, ph);
      let tol = MAP_FILL.simplify;
      let rings;
      for (;;) {
        rings = traced
          .map(ring => { const s = mapSimplifyPoints([...ring, ring[0]], tol); if (s.length > 1 && s[0][0] === s[s.length - 1][0] && s[0][1] === s[s.length - 1][1]) s.pop(); return s; })
          .filter(ring => ring.length >= 3)
          .map(ring => ring.map(q => [r2(q[0] / scale), r2(q[1] / scale)]));
        if (rings.reduce((n, ring) => n + ring.length, 0) <= MAP_FILL.maxPoints) break;
        tol *= 1.5;
      }
      if (rings.length === 0) return;
      const shape = ensureMapShape({ id: `shape-${genId().slice(-6)}`, type: "region", rings, fill: style.fill, stroke: null, strokeWidth: style.strokeWidth, smooth: false });
      if (!shape) return;
      setLayers(layers.map(l => {
        if (l.id !== targetLayer.id) return l;
        const next = l.shapes.slice();
        next.splice(above >= 0 ? above + 1 : 0, 0, shape);
        return { ...l, shapes: next };
      }));
    } catch (err) {
      console.warn("Map fill failed", err); // nothing lands; the hint goes back to the tool's
    } finally {
      setFilling(false);
    }
  };

  const onSvgClick = (e) => {
    if (tool === "fill") {
      const p = toPoint(e);
      if (p) fillAt(p);
      return;
    }
    if (tool === "text") {
      // A label at the click, in ink, selected so the strip's field takes it.
      if (!targetLayer) return;
      const p = toPoint(e);
      if (!p) return;
      const id = addShape({ type: "text", x: p[0], y: p[1], text: "Label", fontSize: style.fontSize || 36, rotation: 0, fill: MAP_PALETTE[0].hex, stroke: null, strokeWidth: style.strokeWidth });
      if (id) { setSelectedShapeId(id); setFocusTextId(id); }
      return;
    }
    if (tool !== "polygon" && tool !== "stroke") return;
    if (!targetLayer) return;
    const p = toPoint(e);
    if (!p) return;
    if (!draft) { setDraft({ type: tool, points: [p] }); setCursor(p); return; }
    if (tool === "polygon" && draft.points.length >= 3) {
      const first = draft.points[0];
      if (Math.hypot(p[0] - first[0], p[1] - first[1]) <= 10 * unitsPerPx()) { finishDraft(); return; }
    }
    setDraft({ ...draft, points: [...draft.points, p] });
  };
  const onSvgDoubleClick = (e) => {
    if (!draft || (draft.type !== "polygon" && draft.type !== "stroke")) return;
    e.preventDefault();
    // the double-click's two clicks each placed a vertex at the same spot; drop the duplicate
    let pts = draft.points;
    if (pts.length >= 2) {
      const a = pts[pts.length - 1], b = pts[pts.length - 2];
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) <= 3 * unitsPerPx()) pts = pts.slice(0, -1);
    }
    finishDraft(pts);
  };
  const onSvgMouseMove = (e) => {
    if (!draft || (draft.type !== "polygon" && draft.type !== "stroke")) return;
    const p = toPoint(e);
    if (p) setCursor(p);
  };
  // Keys are document-wide while a drawing tool is active, because the strip's
  // buttons take focus when clicked and a Delete that only worked with the
  // canvas focused would fail right after picking a swatch. Typing targets are
  // left alone, and Enter on a focused button is the button's.
  useEffect(() => {
    if (tool === "pin") return;
    const handler = (e) => {
      const t = e.target;
      const tag = t && t.tagName ? t.tagName.toUpperCase() : "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable)) return;
      if (e.key === "Escape") {
        if (draft) cancelDraft();
        else if (selectedShapeId) setSelectedShapeId(null);
        else return;
        e.preventDefault();
        return;
      }
      if (e.key === "Enter" && tag !== "BUTTON" && draft && (draft.type === "polygon" || draft.type === "stroke")) {
        e.preventDefault();
        finishDraft();
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedShape && (tool === "select" || tool === "text" || tool === "stamp")) {
        e.preventDefault();
        deleteShape(selectedShape.id);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [tool, draft, selectedShapeId, layers]);

  // Freehand: window listeners so a drag that leaves the canvas still ends
  // cleanly (toPoint clamps to the edge). A point is taken when the cursor
  // has moved `spacing` of the width since the last one; release commits the
  // simplified stroke through finishDraft and the tool stays Freehand.
  useEffect(() => {
    if (!draft || draft.type !== "freehand") return;
    const minGap = MAP_FREEHAND.spacing * width;
    const move = (e) => {
      const p = toPoint(e);
      if (!p) return;
      setDraft(d => {
        if (!d || d.type !== "freehand") return d;
        const last = d.points[d.points.length - 1];
        if (Math.hypot(p[0] - last[0], p[1] - last[1]) < minGap) return d;
        return { ...d, points: [...d.points, p] };
      });
    };
    const up = () => { finishDraft(); };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [draft]);

  // Press-drag-release for rect, ellipse, and stamp: window listeners so a
  // drag that leaves the canvas still ends cleanly. For a rect or ellipse a
  // drag under two units each way is a click and places nothing; for a stamp
  // a click places the chosen stamp at 120 units centred on it, and a drag
  // places it square at the drag's larger side. A placed stamp is selected,
  // so the strip's angle controls and the frame's handles apply to it.
  useEffect(() => {
    if (!draft || (draft.type !== "rect" && draft.type !== "ellipse" && draft.type !== "stamp")) return;
    const move = (e) => { const p = toPoint(e); if (p) setDraft(d => (d ? { ...d, x1: p[0], y1: p[1] } : d)); };
    const up = () => {
      const d = draft;
      const x = Math.min(d.x0, d.x1), y = Math.min(d.y0, d.y1);
      const w = Math.abs(d.x1 - d.x0), h = Math.abs(d.y1 - d.y0);
      if (d.type === "stamp") {
        const size = Math.max(w, h);
        const box = size >= 8
          ? { x: r2(x), y: r2(y), w: r2(size), h: r2(size) }
          : { x: r2(d.x0 - 60), y: r2(d.y0 - 60), w: 120, h: 120 };
        const id = addShape({ type: "stamp", stampId, ...box, rotation: 0, fill: style.fill, stroke: style.stroke, strokeWidth: style.strokeWidth });
        if (id) setSelectedShapeId(id);
      } else if (w >= 2 && h >= 2) {
        addShape({ type: d.type, x: r2(x), y: r2(y), w: r2(w), h: r2(h), fill: style.fill, stroke: style.stroke, strokeWidth: style.strokeWidth, smooth: d.type === "rect" ? style.smooth : undefined });
      }
      setDraft(null);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [draft]);

  // Select-tool drag: the shape follows the cursor from its origin, so the
  // offset is always measured from where the drag began, never accumulated.
  useEffect(() => {
    if (!moving) return;
    const move = (e) => {
      const p = toPoint(e);
      if (!p) return;
      const dx = p[0] - moving.startX, dy = p[1] - moving.startY;
      setLayers(layers.map(l => ({ ...l, shapes: l.shapes.map(s => s.id === moving.id ? translateMapShape(moving.origin, dx, dy) : s) })), { coalesce: `move-${moving.id}-${moving.seq}` });
    };
    const up = () => setMoving(null);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [moving, layers]);

  // Vertex drag: one point of the selected polygon or line follows the cursor.
  useEffect(() => {
    if (!vertexDrag) return;
    const move = (e) => {
      const p = toPoint(e);
      if (!p) return;
      setLayers(layers.map(l => ({ ...l, shapes: l.shapes.map(s => (s.id === vertexDrag.id && Array.isArray(s.points))
        ? { ...s, points: s.points.map((q, i) => (i === vertexDrag.index ? p : q)) }
        : s) })), { coalesce: `vertex-${vertexDrag.id}-${vertexDrag.index}-${vertexDrag.seq}` });
    };
    const up = () => setVertexDrag(null);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [vertexDrag, layers]);

  // Frame handles. Both drags apply the cursor's movement since the press to
  // the shape as it was at the press, so nothing jumps on the first move and
  // nothing accumulates. A corner moves in the shape's own frame (the
  // movement is turned back by the shape's angle); the opposite corner stays
  // where it is on the canvas, which for a turned stamp means its centre
  // moves. A stamp keeps its aspect, a rect or ellipse does not; nothing goes
  // under 8 units. The knob adds the angle the cursor has swept around the
  // frame's pivot; Shift snaps the result to 15 degrees.
  useEffect(() => {
    if (!handleDrag) return;
    const o = handleDrag.origin;
    const frame = mapShapeFrame(o, selBox);
    if (!frame) { setHandleDrag(null); return; }
    const move = (e) => {
      const p = toPoint(e);
      if (!p) return;
      const start = handleDrag.start;
      if (handleDrag.kind === "rotate") {
        const a0 = Math.atan2(start[1] - frame.cy, start[0] - frame.cx);
        const a1 = Math.atan2(p[1] - frame.cy, p[0] - frame.cx);
        let deg = (o.rotation || 0) + (a1 - a0) * 180 / Math.PI;
        if (e.shiftKey) deg = Math.round(deg / 15) * 15;
        deg = ((deg + 180) % 360 + 360) % 360 - 180;
        updateShape(o.id, { rotation: r2(deg) }, { coalesce: `rotate-${o.id}-${handleDrag.seq}` });
        return;
      }
      if (o.type !== "rect" && o.type !== "ellipse" && o.type !== "stamp") return;
      const th = (o.rotation || 0) * Math.PI / 180;
      const cos = Math.cos(th), sin = Math.sin(th);
      const turn = (dx, dy) => [dx * cos - dy * sin, dx * sin + dy * cos];
      const unturn = (dx, dy) => [dx * cos + dy * sin, -dx * sin + dy * cos];
      const [dlx, dly] = unturn(p[0] - start[0], p[1] - start[1]);
      const h = handleDrag.handle;
      const sx = h.includes("w") ? 1 : -1; // the anchor corner's side of the centre
      const sy = h.includes("n") ? 1 : -1;
      const ax = sx * o.w / 2, ay = sy * o.h / 2;   // the anchor, from the old centre
      const gx = -ax + dlx, gy = -ay + dly;         // the dragged corner, moved
      let w = Math.max(8, sx * (ax - gx));          // a corner dragged past its anchor stops at 8
      let hh = Math.max(8, sy * (ay - gy));
      if (o.type === "stamp") {
        const k = Math.max(w / o.w, hh / o.h);
        w = Math.max(8, o.w * k);
        hh = Math.max(8, o.h * k);
      }
      const [awx, awy] = turn(ax, ay);
      const [nax, nay] = turn(sx * w / 2, sy * hh / 2);
      const ncx = frame.cx + awx - nax, ncy = frame.cy + awy - nay;
      updateShape(o.id, { x: r2(ncx - w / 2), y: r2(ncy - hh / 2), w: r2(w), h: r2(hh) }, { coalesce: `scale-${o.id}-${handleDrag.seq}` });
    };
    const up = () => setHandleDrag(null);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [handleDrag, layers]);

  // The selection box comes from the rendered element's bbox, which covers
  // every shape type the same way (text and stamps included, later), padded
  // by half the stroke the bbox leaves out.
  useEffect(() => {
    if (!selectedShape || !svgRef.current) { setSelBox(null); return; }
    const el = svgRef.current.querySelector(`[data-shape="${selectedShape.id.replace(/["\\]/g, "")}"]`);
    if (!el || typeof el.getBBox !== "function") { setSelBox(null); return; }
    try {
      const b = el.getBBox();
      const pad = (selectedShape.stroke ? selectedShape.strokeWidth / 2 : 0) + 2;
      setSelBox({ x: b.x - pad, y: b.y - pad, w: b.width + 2 * pad, h: b.height + 2 * pad });
    } catch (err) {
      setSelBox(null);
    }
  }, [selectedShape, data]);

  const toolDef = MAP_TOOLS.find(t => t.id === tool) || MAP_TOOLS[0];
  let hint = toolDef.hint;
  if (fillNote) hint = fillNote;
  if (filling) hint = "Filling\u2026";
  if (tool !== "pin" && !targetLayer) {
    hint = activeLayer
      ? `The active layer "${activeLayer.name}" is ${activeLayer.visible ? "locked" : "hidden"}; pick another in Layers, or ${activeLayer.visible ? "unlock" : "show"} it`
      : "No layer to draw on; add one in Layers";
  }

  return {
    tool, setTool, hint, current, applyStyle, editSelected,
    stampId, setStampId,
    selectedShape, deleteSelected: () => { if (selectedShape) deleteShape(selectedShape.id); },
    draft, cursor, selBox, style, selectable,
    layers, activeLayerId: activeLayer ? activeLayer.id : null, setActiveLayerId,
    focusTextId, consumeFocusText: () => setFocusTextId(null),
    addLayer, renameLayer, toggleLayerVisible, toggleLayerLocked, moveLayer, deleteLayer, moveShapeToLayer,
    onSvgMouseDown, onSvgClick, onSvgDoubleClick, onSvgMouseMove, onSvgContextMenu,
  };
}
// Undo/redo over the whole mapData, pins included: one history of snapshots,
// editor-local, gone when the editor closes. commit(next, opts) is what every
// write goes through; a snapshot of the current record is pushed before each
// step. opts.coalesce names a gesture (a drag, a run of typing in one field):
// consecutive commits under the same name are one step, so a drag of any
// length undoes in one go and the first keystroke's snapshot is the one that
// comes back. opts.silent writes through with no step (the image-size heal).
// Keys are document-wide while the editor is mounted, typing fields excluded,
// so a text field keeps the browser's own undo.
function useMapHistory(data, onChange, limit) {
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const keyRef = useRef(null);
  const [, bump] = useState(0);
  const max = limit || 50;
  const commit = (next, opts) => {
    const o = opts || {};
    if (!o.silent) {
      const key = o.coalesce || null;
      if (!(key && keyRef.current === key)) {
        pastRef.current.push(data);
        if (pastRef.current.length > max) pastRef.current.shift();
      }
      futureRef.current = [];
      keyRef.current = key;
      bump(n => n + 1);
    }
    onChange(next);
  };
  const undo = () => {
    if (pastRef.current.length === 0) return;
    const prev = pastRef.current.pop();
    futureRef.current.push(data);
    keyRef.current = null;
    bump(n => n + 1);
    onChange(prev);
  };
  const redo = () => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current.pop();
    pastRef.current.push(data);
    keyRef.current = null;
    bump(n => n + 1);
    onChange(next);
  };
  useEffect(() => {
    const handler = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const t = e.target;
      const tag = t && t.tagName ? t.tagName.toUpperCase() : "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable)) return;
      const k = typeof e.key === "string" ? e.key.toLowerCase() : "";
      if (k === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((k === "z" && e.shiftKey) || k === "y") { e.preventDefault(); redo(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [data]);
  return { commit, undo, redo, canUndo: pastRef.current.length > 0, canRedo: futureRef.current.length > 0 };
}


// The strip under the editor toolbar: tools, the size presets on an image-less
// map, Undo and Redo, the Layers toggle and the active layer, and (for the
// drawing tools, or while a shape is selected) the fill and stroke swatches,
// the width, Smooth, the text controls for a label, the shape's layer, and
// Delete.
function MapToolStrip({ drawing, history, showPresets, presetValue, onPreset, canvasSize, onCustomSize, layersOpen, onToggleLayers, stamps }) {
  const { tool, setTool, current, applyStyle, editSelected, selectedShape, deleteSelected, layers, activeLayerId, setActiveLayerId, moveShapeToLayer, focusTextId, consumeFocusText } = drawing;
  const worldStamps = Array.isArray(stamps) ? stamps : [];
  const [pickerOpen, setPickerOpen] = useState(false);
  const kind = selectedShape ? selectedShape.type : tool;
  // The Custom canvas size fields: seeded from the canvas whenever Custom
  // opens or the size changes under them, applied by Set or Enter.
  const [customW, setCustomW] = useState(canvasSize ? String(canvasSize.width) : "");
  const [customH, setCustomH] = useState(canvasSize ? String(canvasSize.height) : "");
  useEffect(() => {
    if (!canvasSize) return;
    setCustomW(String(canvasSize.width));
    setCustomH(String(canvasSize.height));
  }, [presetValue === "custom", canvasSize ? canvasSize.width : 0, canvasSize ? canvasSize.height : 0]);
  const setCustomSize = () => { if (onCustomSize) onCustomSize(parseFloat(customW), parseFloat(customH)); };
  // The text field takes focus once, for the label that was just placed, so
  // typing replaces "Label". Not on any other mount: a label reselected or
  // brought back by undo would otherwise steal the next keyboard shortcut.
  const textRef = useRef(null);
  useEffect(() => {
    if (focusTextId && selectedShape && selectedShape.id === focusTextId && textRef.current) {
      textRef.current.focus();
      textRef.current.select();
      consumeFocusText();
    }
  }, [focusTextId, selectedShape]);
  const showStyle = tool !== "pin" && (tool !== "select" || !!selectedShape);
  const showFill = kind !== "stroke" && kind !== "freehand";
  const showStroke = kind !== "fill"; // a bucket fill lands with no stroke; give it one in Select
  const showSmooth = kind === "rect" || kind === "polygon" || kind === "stroke" || kind === "freehand" || kind === "region";
  const isText = !!selectedShape && selectedShape.type === "text";
  const hasAngle = !!selectedShape && (selectedShape.type === "text" || selectedShape.type === "stamp");
  const showWidth = kind !== "stamp" && kind !== "fill"; // a stamp's line weight is the symbol's own
  const { stampId, setStampId } = drawing;
  const shapeLayer = selectedShape ? layers.find(l => l.shapes.some(s => s.id === selectedShape.id)) : null;
  const swatches = (value, onPick) => (
    <span className="map-swatches">
      {MAP_PALETTE.map(c => (
        <button
          key={c.id}
          type="button"
          className={`map-swatch ${value === c.hex ? "active" : ""}`}
          style={{ background: c.hex }}
          title={c.label}
          onClick={() => onPick(c.hex)}
        />
      ))}
      <button type="button" className={`map-swatch map-swatch-none ${value == null ? "active" : ""}`} title="None" onClick={() => onPick(null)} />
    </span>
  );
  return (
    <div className="map-tools">
      <div className="map-tools-row">
        {MAP_TOOLS.map(t => (
          <button key={t.id} type="button" className={`btn btn-small ${tool === t.id ? "btn-accent" : "btn-ghost"}`} onClick={() => setTool(t.id)} title={t.hint}>{t.label}</button>
        ))}
        {showPresets && (
          <>
            <span className="map-tools-sep" />
            <span className="map-tools-label">Canvas</span>
            <select className="input map-tools-select" value={presetValue} onChange={e => onPreset(e.target.value)} title="Canvas size, in drawing units">
              {MAP_CANVAS_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              <option value="custom">Custom…</option>
            </select>
            {presetValue === "custom" && canvasSize && (
              <>
                <input className="input map-tools-num" type="number" min="100" max="10000" step="1" value={customW} onChange={e => setCustomW(e.target.value)} onKeyDown={e => { if (e.key === "Enter") setCustomSize(); }} title="Canvas width, 100 to 10000" />
                <span className="map-tools-label">×</span>
                <input className="input map-tools-num" type="number" min="100" max="10000" step="1" value={customH} onChange={e => setCustomH(e.target.value)} onKeyDown={e => { if (e.key === "Enter") setCustomSize(); }} title="Canvas height, 100 to 10000" />
                <button type="button" className="btn btn-small btn-accent" onClick={setCustomSize} title="Apply this canvas size">Set</button>
              </>
            )}
          </>
        )}
        <span className="map-tools-sep" />
        <button type="button" className="btn btn-small btn-ghost" disabled={!history.canUndo} onClick={history.undo} title="Undo (Ctrl+Z)">Undo</button>
        <button type="button" className="btn btn-small btn-ghost" disabled={!history.canRedo} onClick={history.redo} title="Redo (Ctrl+Shift+Z or Ctrl+Y)">Redo</button>
        <span className="map-tools-sep" />
        <button type="button" className={`btn btn-small ${layersOpen ? "btn-accent" : "btn-ghost"}`} onClick={onToggleLayers} title="Show or hide the layer list">Layers</button>
        <span className="map-tools-label">Layer</span>
        <select className="input map-tools-select" value={activeLayerId || ""} onChange={e => setActiveLayerId(e.target.value)} title="The layer new shapes go to">
          {layers.map(l => <option key={l.id} value={l.id}>{l.name}{l.visible ? "" : " (hidden)"}{l.locked ? " (locked)" : ""}</option>)}
        </select>
      </div>
      {showStyle && (
        <div className="map-tools-row">
          {(tool === "stamp" || (selectedShape && selectedShape.type === "stamp")) && (() => {
            // Pick arms the stamp for the next placement and swaps the selected
            // stamp's symbol, which is also how a missing stamp is re-pointed.
            const pick = (id) => { setStampId(id); if (selectedShape && selectedShape.type === "stamp") editSelected({ stampId: id }); };
            const armed = worldStamps.find(s => s.id === stampId) || null;
            const missing = selectedShape && selectedShape.type === "stamp" && !mapStampDef(selectedShape.stampId, worldStamps) ? selectedShape.stampId : null;
            return (
              <>
                <span className="map-tools-label">Stamp</span>
                {armed && (
                  <button type="button" className="map-stamp-pick active" title={`${armed.name} (${armed.pack || "imported"})`} onClick={() => setPickerOpen(true)}>
                    <svg viewBox={armed.viewBox} width="22" height="22" fill={current.fill || "none"} stroke={current.stroke || "none"} aria-hidden="true" dangerouslySetInnerHTML={{ __html: armed.body }} />
                  </button>
                )}
                {MAP_BUILTIN_STAMPS.map(st => (
                  <button
                    key={st.id}
                    type="button"
                    className={`map-stamp-pick ${stampId === st.id ? "active" : ""}`}
                    title={st.name}
                    onClick={() => pick(st.id)}
                  >
                    <svg viewBox={st.viewBox} width="22" height="22" fill={current.fill || "none"} stroke={current.stroke || "none"} aria-hidden="true" dangerouslySetInnerHTML={{ __html: st.body }} />
                  </button>
                ))}
                {worldStamps.length > 0 && <button type="button" className="btn btn-small btn-ghost" onClick={() => setPickerOpen(true)} title="Every stamp, built in and imported">More{"\u2026"}</button>}
                {missing && <span className="map-tools-missing" title="This stamp's pack is not in the world; pick another symbol or delete the shape">missing: {missing}</span>}
                {pickerOpen && <MapStampPicker stamps={worldStamps} current={stampId} fill={current.fill} stroke={current.stroke} onPick={(id) => { pick(id); setPickerOpen(false); }} onClose={() => setPickerOpen(false)} />}
              </>
            );
          })()}
          {showFill && <><span className="map-tools-label">Fill</span>{swatches(current.fill, v => applyStyle({ fill: v }))}</>}
          {showStroke && <><span className="map-tools-label">Stroke</span>{swatches(current.stroke, v => applyStyle({ stroke: v }))}</>}
          {showWidth && (
            <>
              <span className="map-tools-label">Width</span>
              <input
                className="map-tools-range"
                type="range"
                min={MAP_STROKE_WIDTH_RANGE.min} max={MAP_STROKE_WIDTH_RANGE.max} step="1"
                value={Math.min(MAP_STROKE_WIDTH_RANGE.max, current.strokeWidth)}
                onChange={e => applyStyle({ strokeWidth: parseInt(e.target.value, 10) || MAP_STROKE_WIDTH_RANGE.min }, "width")}
                title="Line width, in drawing units"
              />
              <input
                className="input map-tools-num"
                type="number"
                min={MAP_STROKE_WIDTH_RANGE.min} max={MAP_STROKE_WIDTH_RANGE.limit} step="1"
                value={current.strokeWidth}
                onChange={e => { const v = parseInt(e.target.value, 10); if (Number.isFinite(v)) applyStyle({ strokeWidth: Math.max(MAP_STROKE_WIDTH_RANGE.min, Math.min(MAP_STROKE_WIDTH_RANGE.limit, v)) }, "width"); }}
                onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") e.target.blur(); }}
                title="Line width, 1 to 64"
              />
            </>
          )}
          {showSmooth && (
            <button type="button" className={`btn btn-small ${current.smooth ? "btn-accent" : "btn-ghost"}`} onClick={() => applyStyle({ smooth: !current.smooth })} title="Round the corners and curve the path through its points">Smooth</button>
          )}
          {isText && (
            <>
              <span className="map-tools-label">Text</span>
              <input
                ref={textRef}
                className="input map-tools-text"
                value={selectedShape.text}
                onChange={e => editSelected({ text: e.target.value }, "text")}
                onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") e.target.blur(); }}
                placeholder="Label"
              />
              <span className="map-tools-label">Size</span>
              {MAP_TEXT_SIZES.map(sz => (
                <button key={sz} type="button" className={`btn btn-small ${selectedShape.fontSize === sz ? "btn-accent" : "btn-ghost"}`} onClick={() => editSelected({ fontSize: sz })}>{sz}</button>
              ))}
              <span className="map-tools-label">Arc</span>
              <input
                className="map-tools-range"
                type="range"
                min="-180" max="180" step="5"
                value={selectedShape.arc || 0}
                onChange={e => editSelected({ arc: parseInt(e.target.value, 10) || 0 }, "arc")}
                title="Bend the label along an arc: right arches it up, left bends it down"
              />
              <span className="map-tools-value">{selectedShape.arc || 0}°</span>
              {!!selectedShape.arc && <button type="button" className="btn btn-small btn-ghost" onClick={() => editSelected({ arc: 0 })} title="Straighten the label">Straight</button>}
            </>
          )}
          {hasAngle && (
            <>
              <span className="map-tools-label">Angle</span>
              <button type="button" className="btn btn-small btn-ghost" onClick={() => editSelected({ rotation: Math.round(((selectedShape.rotation || 0) - 15) * 100) / 100 })} title="Rotate 15 degrees counter-clockwise">−15</button>
              <input
                className="input map-tools-num"
                type="number"
                step="1"
                value={Math.round((selectedShape.rotation || 0) * 100) / 100}
                onChange={e => { const v = parseFloat(e.target.value); if (Number.isFinite(v)) editSelected({ rotation: v }, "rotation"); }}
                title="Angle in degrees"
              />
              <button type="button" className="btn btn-small btn-ghost" onClick={() => editSelected({ rotation: Math.round(((selectedShape.rotation || 0) + 15) * 100) / 100 })} title="Rotate 15 degrees clockwise">+15</button>
            </>
          )}
          {selectedShape && layers.length > 1 && (
            <>
              <span className="map-tools-label">Layer</span>
              <select className="input map-tools-select" value={shapeLayer ? shapeLayer.id : ""} onChange={e => moveShapeToLayer(selectedShape.id, e.target.value)} title="Move this shape to another layer">
                {layers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </>
          )}
          {selectedShape && <button type="button" className="btn btn-small btn-danger" onClick={deleteSelected}>Delete shape</button>}
        </div>
      )}
    </div>
  );
}

// The grid the strip's More... button opens: every stamp, built in and
// imported, grouped by pack; a click arms it (and swaps the selected stamp's
// symbol, as the inline buttons do) and closes.
function MapStampPicker({ stamps, current, fill, stroke, onPick, onClose }) {
  const groups = [{ id: "builtin", name: "Built in", stamps: MAP_BUILTIN_STAMPS }, ...mapStampGroups(stamps)];
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">Choose a stamp</div>
        <div className="modal-body">
          {groups.map(g => (
            <div key={g.id} className="modal-section">
              <div className="modal-section-hdr">{g.name}</div>
              <div className="map-stamp-grid">
                {g.stamps.map(s => (
                  <button key={s.id} type="button" className={`map-stamp-tile ${current === s.id ? "active" : ""}`} title={s.id} onClick={() => onPick(s.id)}>
                    <svg viewBox={s.viewBox} width="40" height="40" fill={fill || "none"} stroke={stroke || "none"} aria-hidden="true" dangerouslySetInnerHTML={{ __html: s.body }} />
                    <span className="map-stamp-tile-name">{s.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// The layer panel under the strip: one row per layer, top-most first (the
// last layer in the array draws on top). Pick the active layer, rename it in
// place, show or hide, lock or unlock, move it up or down the stack, delete
// it (asks when it has shapes; undo brings it back), or add one on top.
function MapLayerPanel({ drawing }) {
  const { layers, activeLayerId, setActiveLayerId, addLayer, renameLayer, toggleLayerVisible, toggleLayerLocked, moveLayer, deleteLayer } = drawing;
  const rows = [...layers].reverse();
  return (
    <div className="map-layers">
      <div className="map-layers-head">
        <span className="map-tools-label">Layers</span>
        <span className="map-layers-note">Top of the stack first. Shapes go to the active layer.</span>
        <span style={{ flex: 1 }} />
        <button type="button" className="btn btn-small btn-ghost" onClick={addLayer}>+ Add layer</button>
      </div>
      {rows.map((l, i) => {
        const idx = layers.length - 1 - i;
        const active = l.id === activeLayerId;
        return (
          <div key={l.id} className={`map-layer-row ${active ? "active" : ""} ${l.visible ? "" : "hidden-layer"}`}>
            <button type="button" className={`map-layer-pick ${active ? "active" : ""}`} title={active ? "Active layer" : "Make this the active layer"} onClick={() => setActiveLayerId(l.id)}>{active ? "◉" : "○"}</button>
            <input
              className="input map-layer-name"
              value={l.name}
              onChange={e => renameLayer(l.id, e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") e.target.blur(); }}
              title="Layer name"
            />
            <span className="map-layer-count">{l.shapes.length} {l.shapes.length === 1 ? "shape" : "shapes"}</span>
            <button type="button" className={`btn btn-small ${l.visible ? "btn-ghost" : "btn-accent"}`} onClick={() => toggleLayerVisible(l.id)} title={l.visible ? "Hide this layer (it stays out of the export too)" : "Show this layer"}>{l.visible ? "Hide" : "Hidden"}</button>
            <button type="button" className={`btn btn-small ${l.locked ? "btn-accent" : "btn-ghost"}`} onClick={() => toggleLayerLocked(l.id)} title={l.locked ? "Unlock this layer" : "Lock this layer (nothing on it can be selected or drawn)"}>{l.locked ? "Locked" : "Lock"}</button>
            <button type="button" className="btn btn-small btn-ghost" disabled={idx === layers.length - 1} onClick={() => moveLayer(l.id, 1)} title="Move up the stack">↑</button>
            <button type="button" className="btn btn-small btn-ghost" disabled={idx === 0} onClick={() => moveLayer(l.id, -1)} title="Move down the stack">↓</button>
            <button type="button" className="btn btn-small btn-danger" disabled={layers.length === 1} onClick={() => deleteLayer(l.id)} title={layers.length === 1 ? "The last layer stays" : "Delete this layer"}>×</button>
          </div>
        );
      })}
    </div>
  );
}


// The editor's overlay svg, same viewBox as the canvas. In the drawing tools
// it has no pointer events and draws the shape in progress in the current
// style, the rubber line to the cursor and the closing line for a polygon,
// the placed vertices (the first one larger, since clicking it closes the
// polygon), and the selection box. In Select it takes the pointer events and
// also carries an invisible hit copy of every selectable shape with a
// 14-pixel stroke that does not scale with zoom (a 4-unit line is under two
// screen pixels wide, and nobody should have to hit that), plus draggable
// point handles for the selected polygon or line.
function MapEditorOverlay({ width, height, drawing }) {
  const { tool, draft, cursor, selBox, style, selectable, selectedShape, onSvgMouseDown, onSvgContextMenu } = drawing;
  const f = mapNum;
  const items = [];
  const vertexR = Math.max(3, width / 220);
  const selectMode = tool === "select";
  if (selectMode) {
    // A stamp is hit through its whole box, turned with it; a label through a
    // copy of its text (bent the same way, so the hit copies need their own
    // arc paths); everything else through a copy of its outline.
    const hitCtx = { idBase: "hit", defs: [], stampsUsed: new Map() };
    selectable.forEach(s => {
      if (s.type === "stamp") {
        const attrs = { "data-shape": s.id, "data-hit": "shape", x: f(s.x), y: f(s.y), width: f(s.w), height: f(s.h), fill: "transparent", stroke: "transparent", "stroke-width": "14", "vector-effect": "non-scaling-stroke" };
        if (s.rotation) attrs.transform = `rotate(${f(s.rotation)} ${f(s.x + s.w / 2)} ${f(s.y + s.h / 2)})`;
        items.push(mapTreeToReact({ tag: "rect", attrs }, `hit-${s.id}`));
        return;
      }
      const node = mapShapeNode(s, hitCtx);
      if (!node) return;
      const attrs = { ...node.attrs, fill: s.type === "stroke" || !s.fill ? "none" : "transparent", stroke: "transparent", "stroke-width": "14", "vector-effect": "non-scaling-stroke", "data-hit": "shape" };
      delete attrs.filter;
      items.push(mapTreeToReact({ ...node, attrs }, `hit-${s.id}`));
    });
    if (hitCtx.defs.length > 0) items.unshift(mapTreeToReact({ tag: "defs", children: hitCtx.defs }, "hit-defs"));
  }
  if (draft && draft.type === "stamp") {
    const x = Math.min(draft.x0, draft.x1), y = Math.min(draft.y0, draft.y1);
    const size = Math.max(Math.abs(draft.x1 - draft.x0), Math.abs(draft.y1 - draft.y0));
    if (size >= 8) items.push(<rect key="draft" x={f(x)} y={f(y)} width={f(size)} height={f(size)} fill="none" stroke={style.stroke || MAP_PALETTE[0].hex} strokeWidth={1} strokeDasharray="6 6" vectorEffect="non-scaling-stroke" opacity={0.7} />);
  } else if (draft && (draft.type === "rect" || draft.type === "ellipse")) {
    const x = Math.min(draft.x0, draft.x1), y = Math.min(draft.y0, draft.y1);
    const w = Math.abs(draft.x1 - draft.x0), h = Math.abs(draft.y1 - draft.y0);
    const paint = { fill: style.fill || "none", stroke: style.stroke || "none", strokeWidth: style.strokeWidth, opacity: 0.6 };
    if (draft.type === "rect") {
      const r = style.smooth ? Math.min(w, h) / 8 : 0;
      items.push(<rect key="draft" x={f(x)} y={f(y)} width={f(w)} height={f(h)} rx={f(r)} ry={f(r)} {...paint} />);
    } else {
      items.push(<ellipse key="draft" cx={f(x + w / 2)} cy={f(y + h / 2)} rx={f(w / 2)} ry={f(h / 2)} {...paint} />);
    }
  } else if (draft && draft.type === "freehand") {
    items.push(<polyline key="draft" points={draft.points.map(p => `${f(p[0])},${f(p[1])}`).join(" ")} fill="none" stroke={style.stroke || MAP_PALETTE[0].hex} strokeWidth={style.strokeWidth} strokeLinejoin="round" strokeLinecap="round" opacity={0.7} />);
  } else if (draft) {
    const pts = draft.points;
    const trail = cursor ? [...pts, cursor] : pts;
    items.push(<polyline key="draft" points={trail.map(p => `${f(p[0])},${f(p[1])}`).join(" ")} fill="none" stroke={style.stroke || MAP_PALETTE[0].hex} strokeWidth={style.strokeWidth} strokeLinejoin="round" strokeLinecap="round" opacity={0.7} />);
    if (draft.type === "polygon" && cursor && pts.length >= 2) {
      items.push(<line key="close" x1={f(cursor[0])} y1={f(cursor[1])} x2={f(pts[0][0])} y2={f(pts[0][1])} stroke={style.stroke || MAP_PALETTE[0].hex} strokeWidth={1} strokeDasharray="6 6" vectorEffect="non-scaling-stroke" opacity={0.6} />);
    }
    pts.forEach((p, i) => {
      const first = i === 0 && draft.type === "polygon";
      items.push(<circle key={`v${i}`} cx={f(p[0])} cy={f(p[1])} r={f(first ? vertexR * 1.6 : vertexR)} fill={first ? "#c8a96e" : "#f4efe4"} stroke={MAP_PALETTE[0].hex} strokeWidth={1} vectorEffect="non-scaling-stroke" />);
    });
  }
  const frame = selectedShape ? mapShapeFrame(selectedShape, selBox) : null;
  if (frame) {
    // The frame turns with the shape. In Select its corners scale (not a
    // label's: its sizes are the fixed three) and, for a stamp or a label, a
    // knob above the top edge turns it. Each handle is a visible mark with a
    // transparent hit target on top, as the point handles are.
    const rot = selectedShape.rotation || 0;
    const hr = Math.max(4, width / 130);
    const g = [];
    g.push(<rect key="frame" x={f(frame.x)} y={f(frame.y)} width={f(frame.w)} height={f(frame.h)} fill="none" stroke="#c8a96e" strokeWidth={1} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" pointerEvents="none" />);
    if (selectMode && selectedShape.type !== "text") {
      [["nw", frame.x, frame.y], ["ne", frame.x + frame.w, frame.y], ["sw", frame.x, frame.y + frame.h], ["se", frame.x + frame.w, frame.y + frame.h]].forEach(([h, hx, hy]) => {
        g.push(<rect key={`c${h}`} x={f(hx - hr)} y={f(hy - hr)} width={f(hr * 2)} height={f(hr * 2)} fill="#f4efe4" stroke="#2b2420" strokeWidth={1} vectorEffect="non-scaling-stroke" pointerEvents="none" />);
        g.push(<rect key={`ch${h}`} x={f(hx - hr)} y={f(hy - hr)} width={f(hr * 2)} height={f(hr * 2)} fill="transparent" stroke="transparent" strokeWidth={14} vectorEffect="non-scaling-stroke" data-handle={h} />);
      });
    }
    if (selectMode && (selectedShape.type === "stamp" || selectedShape.type === "text")) {
      const kx = frame.x + frame.w / 2, ky = frame.y - Math.max(16, width / 60);
      g.push(<line key="kl" x1={f(kx)} y1={f(frame.y)} x2={f(kx)} y2={f(ky)} stroke="#c8a96e" strokeWidth={1} vectorEffect="non-scaling-stroke" pointerEvents="none" />);
      g.push(<circle key="kc" cx={f(kx)} cy={f(ky)} r={f(hr)} fill="#c8a96e" stroke="#2b2420" strokeWidth={1} vectorEffect="non-scaling-stroke" pointerEvents="none" />);
      g.push(<circle key="kh" cx={f(kx)} cy={f(ky)} r={f(hr)} fill="transparent" stroke="transparent" strokeWidth={16} vectorEffect="non-scaling-stroke" data-handle="rotate" />);
    }
    items.push(<g key="frame-g" transform={rot ? `rotate(${f(rot)} ${f(frame.cx)} ${f(frame.cy)})` : undefined}>{g}</g>);
  } else if (selBox) {
    items.push(<rect key="sel" x={f(selBox.x)} y={f(selBox.y)} width={f(selBox.w)} height={f(selBox.h)} fill="none" stroke="#c8a96e" strokeWidth={1} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" pointerEvents="none" />);
  }
  if (selectMode && selectedShape && Array.isArray(selectedShape.points) && selectedShape.points.length <= MAP_FREEHAND.handleCap) {
    // A visible dot, then its hit target on top: a transparent disk (the
    // stroke ring alone leaves the centre of a small circle unhittable in
    // Chromium) plus a transparent 16-pixel non-scaling stroke around it.
    const hr = Math.max(4, width / 130);
    selectedShape.points.forEach((p, i) => {
      items.push(<circle key={`h${i}`} cx={f(p[0])} cy={f(p[1])} r={f(hr)} fill="#f4efe4" stroke="#2b2420" strokeWidth={1} vectorEffect="non-scaling-stroke" pointerEvents="none" />);
      items.push(<circle key={`hh${i}`} cx={f(p[0])} cy={f(p[1])} r={f(hr)} fill="transparent" stroke="transparent" strokeWidth={16} vectorEffect="non-scaling-stroke" data-vertex={i} />);
    });
  }
  return (
    <svg
      className="map-overlay"
      viewBox={`0 0 ${f(width)} ${f(height)}`}
      aria-hidden="true"
      onMouseDown={selectMode ? onSvgMouseDown : undefined}
      onContextMenu={selectMode ? onSvgContextMenu : undefined}
    >
      {items}
    </svg>
  );
}

// ─── Map view ──────────────────────────────────────────────────────────────────

function useMapImageUrl(filename, dirHandle, imageFolder) {
  const [url, setUrl] = useState(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setUrl(null);
    setErrored(false);
    if (!filename) return;

    if (filename.startsWith("data:")) {
      setUrl(filename);
      return;
    }

    if (dirHandle) {
      let objectUrl = null;
      let cancelled = false;
      (async () => {
        try {
          const fh = await dirHandle.getFileHandle(filename);
          const file = await fh.getFile();
          objectUrl = URL.createObjectURL(file);
          if (!cancelled) setUrl(objectUrl);
        } catch (e) {
          if (!cancelled) setErrored(true);
        }
      })();
      return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }

    setUrl(`${imageFolder || "world-images"}/${filename}`);
  }, [filename, dirHandle, imageFolder]);

  return { url, errored, setErrored };
}

// The map font for a downloaded file. An svg opened on its own, or loaded as
// an image to be drawn to a canvas, is a sealed document: it cannot see the
// page's web fonts, so a label would fall back to the viewer's serif. The
// download embeds Cormorant Garamond instead: the Google Fonts stylesheet
// names the latin woff2, which is fetched and written in as a data URL. One
// fetch per session, cached on the function; offline, or on any failure,
// null, and the file falls back silently.
function mapFontFaceCss() {
  if (!mapFontFaceCss.promise) {
    mapFontFaceCss.promise = (async () => {
      try {
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), 8000);
        const css = await (await fetch("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400&display=swap", { signal: ctl.signal })).text();
        const blocks = css.match(/@font-face\s*\{[^}]*\}/g) || [];
        const latin = blocks.find(b => /unicode-range:\s*U\+0000-00FF/i.test(b)) || blocks[0];
        const m = latin ? /url\((https:[^)\s"']+\.woff2)\)/.exec(latin) : null;
        if (!m) throw new Error("no woff2 url");
        const bytes = new Uint8Array(await (await fetch(m[1], { signal: ctl.signal })).arrayBuffer());
        clearTimeout(timer);
        let bin = "";
        for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
        return `@font-face{font-family:'Cormorant Garamond';font-style:normal;font-weight:400;src:url(data:font/woff2;base64,${btoa(bin)}) format('woff2');}`;
      } catch (err) {
        return null;
      }
    })();
  }
  return mapFontFaceCss.promise;
}

// The svg of a saved map as a standalone file: the drawing with the image
// inlined as a data URL when it can be read (a data URL passes through, a
// folder image is read through the folder handle, a filename with no folder
// cannot be read and the file is written without it, which the caller says),
// the world's stamps resolved, hidden layers omitted, no pins (pins are app
// data with their own renderer), the map font embedded when it can be
// fetched, href doubled as xlink:href on image, use, and textPath so older
// viewers open it, and width and height on the root so a viewer, and Firefox
// drawing it to a canvas, know its size. Returns { svg, width, height,
// imageMissing }.
async function buildMapDownloadSvg(rec, state, dirHandle) {
  const mapData = ensureMapData(rec.mapData);
  let imageHref = null;
  let imageMissing = false;
  if (mapData.image) {
    if (mapData.image.startsWith("data:")) {
      imageHref = mapData.image;
    } else if (dirHandle) {
      try {
        const fh = await dirHandle.getFileHandle(mapData.image);
        imageHref = await fileToDataUrl(await fh.getFile());
      } catch (err) {
        imageMissing = true;
      }
    } else {
      imageMissing = true;
    }
  }
  const size = imageHref ? await loadImageNaturalSizeForExport(imageHref) : null;
  if (imageHref && !size) { imageHref = null; imageMissing = true; }
  const tree = buildMapDrawingTree(mapData.drawing, {
    id: rec.id,
    label: rec.name,
    imageHref,
    imageWidth: size ? size.width : null,
    imageHeight: size ? size.height : null,
    stamps: state ? state.mapStamps : [],
  });
  const double = (node) => {
    if (!node || typeof node !== "object") return;
    if ((node.tag === "image" || node.tag === "use" || node.tag === "textPath") && node.attrs && node.attrs.href) node.attrs["xlink:href"] = node.attrs.href;
    (node.children || []).forEach(double);
  };
  double(tree);
  const fontCss = await mapFontFaceCss();
  if (fontCss) tree.children.unshift({ tag: "style", raw: fontCss });
  const attrs = { ...tree.attrs, "xmlns:xlink": "http://www.w3.org/1999/xlink", width: mapNum(tree.width), height: mapNum(tree.height) };
  delete attrs.class;
  tree.attrs = attrs;
  return { svg: `<?xml version="1.0" encoding="UTF-8"?>\n${mapTreeToString(tree)}`, width: tree.width, height: tree.height, imageMissing };
}

// The svg drawn to a canvas: a PNG blob at `scale` times the canvas size.
// Everything the svg needs is inline (the image, the stamps, the font), so
// the canvas stays clean and can be read back. Rejects when the svg will not
// decode or the browser produces no image.
function rasterizeMapSvg(svg, width, height, scale) {
  return mapSvgToCanvas(svg, width, height, scale).then(canvas => new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error("the browser produced no image"))), "image/png");
  }));
}

// Shared resize handler for the map canvas. Returns a mousedown handler that the
// caller wires onto a resize-handle element. Drags the canvas width as a percentage
// of its parent, 25% to 150%. Past 100% the canvas grows out of its column on
// both sides (the caller centres it with a negative margin), but never past the
// scroll pane, which clips sideways and would take the handle with it; the
// handle stays under the cursor either way. Pin positions are 0-1 normalized so
// they track the canvas size.
function useResizeHandler(canvasRef, sizePct, setSizePct) {
  return (e) => {
    e.preventDefault();
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const startX = e.clientX;
    const startSize = sizePct;
    // The column's content width, from the canvas itself: the parent's
    // clientWidth includes its padding, which the percentage does not.
    const parentWidth = canvas.getBoundingClientRect().width * 100 / startSize || parent.clientWidth;
    const pane = canvas.closest(".body") || canvas.closest(".main");
    const room = pane ? pane.clientWidth - 48 : parentWidth;
    const maxPct = Math.max(100, Math.min(150, (room / parentWidth) * 100));
    // The handle rides the right edge, which moves 1:1 with the cursor below
    // 100% and at half the width change above it (the growth is centred).
    const edgeOf = (pct) => (pct <= 100 ? pct - 100 : (pct - 100) / 2);
    const pctOf = (edge) => (edge <= 0 ? 100 + edge : 100 + edge * 2);
    const startEdge = edgeOf(startSize);

    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const deltaPct = (dx / parentWidth) * 100;
      const next = Math.max(25, Math.min(maxPct, pctOf(startEdge + deltaPct)));
      setSizePct(next);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
}

function MapPin({ pin, entries, templates, asOfYear, timeMode, isSelected, onClick, onMouseDown, editable }) {
  const linkedEntry = pin.entryId ? entries.find(e => e.id === pin.entryId) : null;
  const color = pin.color || "#c8a96e";
  const linkBroken = pin.entryId && !linkedEntry;
  const initial = (pin.label || "•").trim().charAt(0).toUpperCase() || "•";
  // Resolve display name as of the map's current year if time mode is on
  // and the linked entry has name-history data covering that year. Falls
  // back to entry.name otherwise.
  const linkedDisplayName = useMemo(() => {
    if (!linkedEntry) return null;
    if (asOfYear == null || !Array.isArray(templates)) return linkedEntry.name;
    const tpl = templates.find(t => t.id === linkedEntry.templateId);
    if (!tpl) return linkedEntry.name; // bodies (and template-less entries) have no name-history
    return resolveEntryNameAtYear(linkedEntry, tpl, asOfYear);
  }, [linkedEntry, templates, asOfYear]);

  return (
    <div
      className={`map-pin ${editable ? "editable" : ""} ${isSelected ? "selected" : ""}`}
      style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}
      onClick={onClick}
      onMouseDown={onMouseDown}
    >
      <div className="map-pin-marker" style={{ background: color }}>
        <span className="map-pin-marker-inner">{initial}</span>
      </div>
      <div className="map-pin-label">
        <span className={linkBroken ? "map-pin-label-broken" : ""}>{pin.label || "(unnamed)"}</span>
        {linkedEntry && <span className="map-pin-label-arrow">→ {linkedDisplayName}</span>}
        {linkBroken && <span className="map-pin-label-arrow">(missing entry)</span>}
        {timeMode && pin.permanent && (
          <span className="map-pin-permanent-marker" title="Always visible (ignores time mode)">◇</span>
        )}
      </div>
    </div>
  );
}

function MapView({ entry, dirHandle, imageFolder, entries, templates, calendar, onOpenEntry, state, onUpdateViewPrefs }) {
  const mapData = useMemo(() => ensureMapData(entry.mapData), [entry.mapData]);
  const { url: imageUrl, errored, setErrored } = useMapImageUrl(mapData.image, dirHandle, imageFolder);
  const imageSize = useImageNaturalSize(mapData.image ? imageUrl : null, () => setErrored(true));
  // The canvas renders once the image, if there is one, has loaded with a
  // known natural size; an image-less map renders at once on its background.
  const canvasReady = !mapData.image || (!errored && !!imageUrl && !!imageSize);
  const canvasTree = useMemo(() => buildMapDrawingTree(mapData.drawing, {
    id: entry.id,
    className: "map-image",
    label: entry.name,
    imageHref: mapData.image ? imageUrl : null,
    imageWidth: imageSize ? imageSize.width : null,
    imageHeight: imageSize ? imageSize.height : null,
    stamps: state ? state.mapStamps : [],
  }), [mapData, entry.id, entry.name, imageUrl, imageSize, state ? state.mapStamps : null]);
  // Download the saved map as a file: an svg, or a png at twice the canvas
  // size, capped at sixteen million pixels (Safari's canvas limit) so a huge
  // canvas writes a smaller file rather than a blank one. The note beside the
  // buttons says what was written, and when the image could not be read.
  const [downloadNote, setDownloadNote] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const downloadMap = async (kind) => {
    if (downloading) return;
    setDownloading(true);
    setDownloadNote(`Writing ${kind.toUpperCase()}\u2026`);
    try {
      const built = await buildMapDownloadSvg(entry, state, dirHandle);
      const base = slugify(entry.name) || "map";
      let blob;
      let note;
      if (kind === "svg") {
        blob = new Blob([built.svg], { type: "image/svg+xml;charset=utf-8" });
        note = `Wrote ${base}.svg (${mapNum(built.width)} \u00d7 ${mapNum(built.height)}).`;
      } else {
        const scale = Math.min(2, Math.sqrt(16000000 / Math.max(1, built.width * built.height)));
        blob = await rasterizeMapSvg(built.svg, built.width, built.height, scale);
        note = `Wrote ${base}.png (${Math.round(built.width * scale)} \u00d7 ${Math.round(built.height * scale)}, ${scale < 2 ? "scaled to fit sixteen million pixels" : "at 2x"}).`;
      }
      if (built.imageMissing) note += " The image could not be read, so the file has the drawing only.";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${base}.${kind}`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setDownloadNote(note);
    } catch (err) {
      setDownloadNote(`Could not write the ${kind.toUpperCase()}: ${err && err.message ? err.message : err}.`);
    } finally {
      setDownloading(false);
    }
  };
  const downloadRow = (
    <div className="map-download-row">
      <span className="map-tools-label">Download</span>
      <button type="button" className="btn btn-small btn-ghost" disabled={downloading} onClick={() => downloadMap("svg")} title="The drawing and the image as a standalone svg, with the map font embedded; pins are not in it">SVG</button>
      <button type="button" className="btn btn-small btn-ghost" disabled={downloading} onClick={() => downloadMap("png")} title="The same, drawn at twice the canvas size">PNG</button>
      {downloadNote && <span className="map-download-note">{downloadNote}</span>}
    </div>
  );
  const pins = mapData.pins || [];
  const canvasRef = useRef(null);
  const [sizePct, setSizePct] = useState(100);

  // Ctrl+scroll zoom on the map canvas. Simple wrapper-width approach (no
  // transform): the inner wrapper claims zoom × natural width, the image's
  // width:100% naturally grows to fill it, and pins keep their percentage
  // positioning. Range 0.5–4, factor 1.15. Wider upper bound than Stemma
  // because maps benefit from deep zoom-in. Listener bound natively with
  // passive:false so Ctrl+wheel doesn't trigger browser page zoom.
  //
  // Effect deps include canvasReady because the map-canvas div is gated
  // behind the early `if (!canvasReady) return <map-empty>` while an image
  // loads: first mount has no canvas and the ref is null. The effect re-runs
  // when the canvas mounts and binds to it.
  const [mapZoom, setMapZoom] = useState(1);
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const handler = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setMapZoom(z => {
        const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
        return Math.max(0.5, Math.min(4, z * factor));
      });
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [canvasReady]);

  // View-level calendar selector. Scrubber bounds, year input, era buttons,
  // and the year label all render in viewCalendar's frame. Internally every
  // comparison happens on absoluteDay, so pins linked to entries from
  // different calendars filter correctly regardless of which calendar drives
  // the scrubber. Single-calendar worlds get no selector; behavior identical
  // to pre-v1.4.
  const { calendar: viewCalendar, Selector: ViewCalendarSelector, hasAdditional } = getViewCalendarContext(state, "mapCalendarId", onUpdateViewPrefs);

  // ── Time mode state (Map-integrated chronicles) ─────────────────────────────
  // Off by default — pins render normally, no temporal filtering.
  // When on, the year scrubber controls which pins show; pins linked to entries
  // whose first calendar-date-range field doesn't cover the current year are
  // either hidden (default) or rendered faded (toggle).
  const [timeMode, setTimeMode] = useState(false);
  const [showFaded, setShowFaded] = useState(false);
  const [timeYear, setTimeYear] = useState(null);

  // v1.5 r079: bodies merge into the map's resolution pool so pins resolve
  // (and the editor binds) to Astronomical Bodies. Memoized so entriesById and
  // the temporal/visibility passes don't rebuild every render.
  const mapEntriesWithBodies = useMemo(() => [
    ...(entries || []),
    ...(state?.celestialBodies || []).map(b => ({ id: b.id, name: b.name || "(unnamed)", templateId: BODY_REF_SENTINEL, _isBody: true })),
  ], [entries, state?.celestialBodies]);
  const entriesById = useMemo(() => Object.fromEntries(mapEntriesWithBodies.map(e => [e.id, e])), [mapEntriesWithBodies]);
  const templatesById = useMemo(() => Object.fromEntries((templates || []).map(t => [t.id, t])), [templates]);

  // Compute absoluteDay bounds from all pinned entries' temporal ranges
  // (each projected through its own bound calendar). Then convert to a
  // viewCalendar-frame year range for the scrubber UI. Pins from different
  // calendars co-exist on the same absolute axis, so a span from one
  // tradition correctly bounds a span from another even if their raw year
  // numbers don't overlap.
  const yearBounds = useMemo(() => {
    let loAbs = null, hiAbs = null;
    pins.forEach(p => {
      if (!p.entryId) return;
      const linked = entriesById[p.entryId];
      if (!linked) return;
      const tpl = templatesById[linked.templateId];
      if (!tpl) return;
      const r = getEntryTemporalRangeAbsDay(linked, tpl, state);
      if (!r) return;
      (r.absoluteDays || []).forEach(d => {
        if (loAbs === null || d < loAbs) loAbs = d;
        if (hiAbs === null || d > hiAbs) hiAbs = d;
      });
    });
    if (loAbs === null) return { min: 0, max: 100 };
    // Convert the absoluteDay bounds to viewCalendar years.
    const loYear = absoluteDayToCalendarDate(viewCalendar, loAbs)?.year ?? 0;
    const hiYear = absoluteDayToCalendarDate(viewCalendar, hiAbs)?.year ?? loYear;
    if (loYear === hiYear) return { min: loYear - 5, max: hiYear + 5 };
    return { min: loYear, max: hiYear };
  }, [pins, entriesById, templatesById, state, viewCalendar]);

  // Initialize / clamp timeYear into the bounds when the bounds change or
  // when entering time mode for the first time. Bounds shift when viewCalendar
  // changes (year numbers re-frame), so this also handles selector switches.
  useEffect(() => {
    if (!timeMode) return;
    if (timeYear == null) {
      setTimeYear(yearBounds.min);
      return;
    }
    if (timeYear < yearBounds.min) setTimeYear(yearBounds.min);
    else if (timeYear > yearBounds.max) setTimeYear(yearBounds.max);
  }, [timeMode, yearBounds.min, yearBounds.max]);

  const handleResizeStart = useResizeHandler(canvasRef, sizePct, setSizePct);

  // Era buttons rebound to viewCalendar.eras — the selected display calendar
  // owns which eras show up. Filters by viewCalendar's own year frame.
  const eras = (viewCalendar?.eras || []).filter(e => e.startYear != null && e.startYear >= yearBounds.min && e.startYear <= yearBounds.max);
  const hasAnyTemporalData = useMemo(() => {
    return pins.some(p => {
      if (!p.entryId) return false;
      const linked = entriesById[p.entryId];
      if (!linked) return false;
      const tpl = templatesById[linked.templateId];
      if (!tpl) return false;
      return !!getEntryTemporalRange(linked, tpl);
    });
  }, [pins, entriesById, templatesById]);

  // If all temporal data disappears (entries deleted, fields cleared, etc.)
  // while time mode is on, drop out of time mode. The toggle is hidden when
  // there's no data, so leaving timeMode=true would be a stuck state.
  useEffect(() => {
    if (timeMode && !hasAnyTemporalData) setTimeMode(false);
  }, [timeMode, hasAnyTemporalData]);

  if (mapData.image && errored) {
    return (
      <>
        {downloadRow}
        <div className="map-empty">
          <div className="map-empty-glyph">▣</div>
          <div>Image not found: <code>{mapData.image}</code></div>
          <div style={{ fontSize: 11, marginTop: 4 }}>
            {dirHandle ? "Check the connected image folder." : "No image folder connected — set one in Settings."}
          </div>
        </div>
      </>
    );
  }
  if (!canvasReady) return <div className="map-empty">Loading...</div>;

  const visiblePins = pins.map(p => {
    if (!timeMode) return { pin: p, state: "normal" };
    // Convert the scrubber's viewCalendar-frame year into an absoluteDay
    // so the comparison aligns with each pin entry's own-calendar bounds
    // through the universal axis.
    const yr = timeYear ?? yearBounds.min;
    const absDay = calendarDateToAbsoluteDay(viewCalendar, { year: yr, monthIndex: 0, day: 1 });
    const visible = isPinVisibleAtAbsDay(p, entriesById, templatesById, state, absDay);
    if (visible) return { pin: p, state: "normal" };
    if (showFaded) return { pin: p, state: "faded" };
    return { pin: p, state: "hidden" };
  });
  const hiddenCount = visiblePins.filter(v => v.state === "hidden").length;

  return (
    <>
      {hasAnyTemporalData && (
        <div className="map-time-controls">
          <button
            className={`btn btn-small ${timeMode ? "btn-accent" : "btn-ghost"}`}
            onClick={() => setTimeMode(m => !m)}
            title={timeMode
              ? "Leave time mode. All pins render normally again."
              : "Enter time mode. Pins with temporal range data filter by the chosen year."}
          >
            {timeMode ? "Time On" : "Time"}
          </button>
          {timeMode && (
            <>
              {hasAdditional && (
                <>
                  <ViewCalendarSelector />
                  <span style={{ width: 1, height: 18, background: "var(--border)", margin: "0 4px" }} />
                </>
              )}
              <button className="chrono-edit-stepbtn" onClick={() => setTimeYear(y => Math.max(yearBounds.min, (y ?? yearBounds.min) - 1))} title="Year −1">−</button>
              <input
                className="input"
                type="number"
                value={timeYear ?? yearBounds.min}
                min={yearBounds.min} max={yearBounds.max}
                onChange={e => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v)) setTimeYear(Math.max(yearBounds.min, Math.min(yearBounds.max, v)));
                }}
                style={{ width: 80, textAlign: "center" }}
              />
              <button className="chrono-edit-stepbtn" onClick={() => setTimeYear(y => Math.min(yearBounds.max, (y ?? yearBounds.min) + 1))} title="Year +1">+</button>
              <input
                className="map-time-slider"
                type="range"
                min={yearBounds.min} max={yearBounds.max}
                value={timeYear ?? yearBounds.min}
                onChange={e => setTimeYear(parseInt(e.target.value, 10))}
              />
              <span className="map-time-yearlabel">{formatYear(timeYear ?? yearBounds.min, viewCalendar)}</span>
              {eras.length > 0 && (
                <span className="map-time-eras">
                  {eras.map(era => (
                    <button
                      key={era.shortName + era.startYear}
                      className="btn btn-ghost btn-small"
                      onClick={() => setTimeYear(Math.max(yearBounds.min, Math.min(yearBounds.max, era.startYear)))}
                      title={`Jump to ${era.name}`}
                    >
                      {era.shortName || era.name}
                    </button>
                  ))}
                </span>
              )}
              <label className="chrono-edit-approx" title="Show pins outside the current year as faded instead of hiding them">
                <input type="checkbox" checked={showFaded} onChange={e => setShowFaded(e.target.checked)} />
                <span style={{ fontFamily: "inherit", fontSize: "calc(12px * var(--font-scale))" }}>show faded</span>
              </label>
            </>
          )}
        </div>
      )}
      {downloadRow}
      <div className={`map-canvas view-mode ${mapZoom > 1 ? "zoomed" : ""}`} ref={canvasRef} style={{ width: `${sizePct}%`, marginLeft: sizePct > 100 ? `${(100 - sizePct) / 2}%` : undefined }}>
        <div style={{ position: "relative", width: `${mapZoom * 100}%`, transition: "width 100ms ease" }}>
          {mapTreeToReact(canvasTree, "canvas")}
          {visiblePins.map(({ pin, state }) => {
            if (state === "hidden") return null;
            return (
              <div key={pin.id} className={state === "faded" ? "map-pin-faded" : ""}>
                <MapPin
                  pin={pin}
                  entries={mapEntriesWithBodies}
                  templates={templates}
                  asOfYear={timeMode ? timeYear : null}
                  timeMode={timeMode}
                  editable={false}
                  onClick={() => pin.entryId && onOpenEntry(pin.entryId)}
                />
              </div>
            );
          })}
        </div>
        {Math.round(sizePct) !== 100 && <div className="map-size-indicator">{Math.round(sizePct)}%</div>}
        <div className="map-resize-handle" onMouseDown={handleResizeStart} title="Drag to resize · double-click to reset" onDoubleClick={() => setSizePct(100)} />
      </div>
      {pins.length > 0 && (
        <div className="map-stats">
          <span>{pins.length} {pins.length === 1 ? "pin" : "pins"}</span>
          <span>{pins.filter(p => p.entryId).length} linked to entries</span>
          {timeMode && pins.some(p => p.permanent) && (
            <span>{pins.filter(p => p.permanent).length} always visible</span>
          )}
          {timeMode && hiddenCount > 0 && !showFaded && (
            <span className="map-stats-hidden">{hiddenCount} hidden by time filter</span>
          )}
        </div>
      )}
    </>
  );
}

function MapEditor({ mapData, onChange, dirHandle, imageFolder, entries, bodies, flash, stamps }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [selectedPinId, setSelectedPinId] = useState(null);
  const [draggingPinId, setDraggingPinId] = useState(null);
  const [dragMoved, setDragMoved] = useState(false);
  const [sizePct, setSizePct] = useState(100);
  const data = useMemo(() => ensureMapData(mapData), [mapData]);
  const pins = data.pins || [];
  const { url: imageUrl, errored, setErrored } = useMapImageUrl(data.image, dirHandle, imageFolder);
  const imageSize = useImageNaturalSize(data.image ? imageUrl : null, () => setErrored(true));
  const canvasReady = !data.image || (!errored && !!imageUrl && !!imageSize);
  const canvasTree = useMemo(() => buildMapDrawingTree(data.drawing, {
    id: "editor",
    className: "map-image",
    imageHref: data.image ? imageUrl : null,
    imageWidth: imageSize ? imageSize.width : null,
    imageHeight: imageSize ? imageSize.height : null,
    stamps,
    placeholder: true,
  }), [data, imageUrl, imageSize, stamps]);
  // Every write to the record goes through the history (one step per gesture;
  // pins included, by decision at session 19). The hook writes through it too.
  const history = useMapHistory(data, onChange);
  const commit = history.commit;
  const [layersOpen, setLayersOpen] = useState(false);
  // What the bucket fill rasterizes besides the drawing: the image as a data
  // URL (a folder image's blob URL cannot be loaded inside a sealed svg, so it
  // is read once per image and kept), its natural size, and the stamps.
  const fillImageRef = useRef({ url: null, data: null });
  const fillContext = async () => {
    let imageHref = null;
    if (data.image && imageUrl && imageSize) {
      if (imageUrl.startsWith("data:")) {
        imageHref = imageUrl;
      } else {
        if (fillImageRef.current.url !== imageUrl) {
          try {
            fillImageRef.current = { url: imageUrl, data: await fileToDataUrl(await (await fetch(imageUrl)).blob()) };
          } catch (err) {
            fillImageRef.current = { url: imageUrl, data: null };
          }
        }
        imageHref = fillImageRef.current.data;
      }
    }
    return { imageHref, imageWidth: imageSize ? imageSize.width : null, imageHeight: imageSize ? imageSize.height : null, stamps };
  };
  const drawing = useMapDrawing({ data, onChange: commit, svgRef: imgRef, canvasRef, width: canvasTree.width, height: canvasTree.height, fillContext });
  // Canvas size presets for image-less maps. With shapes or pins on the map
  // the switch warns first, because nothing is transformed: shapes keep their
  // coordinates (anything beyond the new edges is cut off) and pins keep their
  // 0-1 positions, so they shift against the drawing. An image map's canvas is
  // the image's size and has no picker.
  const showPresets = !data.image;
  const [customSizeOpen, setCustomSizeOpen] = useState(false); // Custom picked while the size still matches a preset
  const presetValue = customSizeOpen ? "custom" : (MAP_CANVAS_PRESETS.find(p => p.width === data.drawing.width && p.height === data.drawing.height) || { id: "custom" }).id;
  const applyCanvasSize = (width, height, label) => {
    if (width === data.drawing.width && height === data.drawing.height) return;
    const hasWork = pins.length > 0 || mapDrawingHasContent(data.drawing);
    if (hasWork && !confirm(`Change the canvas to ${label}? Shapes keep their coordinates and anything beyond the new edges is cut off; pins keep their relative positions and will shift against the drawing. Undo restores it.`)) return;
    commit({ ...data, drawing: { ...data.drawing, width, height } });
  };
  const applyPreset = (id) => {
    if (id === "custom") { setCustomSizeOpen(true); return; }
    setCustomSizeOpen(false);
    const p = MAP_CANVAS_PRESETS.find(x => x.id === id);
    if (p) applyCanvasSize(p.width, p.height, p.label);
  };
  // Custom: whole units, 100 to 10000 a side; out-of-range entries are clamped.
  const applyCustomSize = (w, h) => {
    const clamp = (v, d) => (Number.isFinite(v) ? Math.max(100, Math.min(10000, Math.round(v))) : d);
    const width = clamp(w, data.drawing.width), height = clamp(h, data.drawing.height);
    setCustomSizeOpen(false);
    applyCanvasSize(width, height, `${width} × ${height}`);
  };

  // Size heal, once: the first time an image loads while the drawing is still
  // empty, record its natural size as the drawing's size (the renderer already
  // draws at that size; this keeps the units if the image is removed later).
  // Once the drawing has content the size is fixed and this never fires.
  useEffect(() => {
    if (!data.image || !imageSize) return;
    const d = data.drawing;
    if (mapDrawingHasContent(d)) return;
    if (d.width === imageSize.width && d.height === imageSize.height) return;
    commit({ ...data, drawing: { ...d, width: imageSize.width, height: imageSize.height } }, { silent: true });
  }, [data, imageSize, onChange]);

  // Ctrl+scroll zoom, mirroring MapView. Wrapper-width approach keeps the
  // pin-placement and drag math zoom-independent: handlers read imgRef's
  // getBoundingClientRect (the svg canvas), which already reflects the actual
  // rendered size at any zoom level, so click-to-fraction conversion still
  // works.
  //
  // Effect deps include canvasReady because the map-canvas div is gated
  // behind it while an image loads: the ref is null on first mount, and the
  // effect re-runs when the canvas mounts and binds to it.
  const [mapZoom, setMapZoom] = useState(1);
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const handler = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setMapZoom(z => {
        const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
        return Math.max(0.5, Math.min(4, z * factor));
      });
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [canvasReady]);
  const handleResizeStart = useResizeHandler(canvasRef, sizePct, setSizePct);

  const setImage = async () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (dirHandle) {
        const ok = await verifyHandlePermission(dirHandle);
        if (ok) {
          try {
            const filename = await generateUniqueFilename(dirHandle, file.name);
            const fh = await dirHandle.getFileHandle(filename, { create: true });
            const writable = await fh.createWritable();
            await writable.write(file);
            await writable.close();
            commit({ ...data, image: filename });
            return;
          } catch (err) {
            console.error("FSAA write failed", err);
          }
        }
      }

      // base64 fallback - warn for big files since maps tend to be large
      if (file.size > 1024 * 1024) {
        const proceed = confirm(`This image is ${(file.size / 1024 / 1024).toFixed(1)} MB. Without an image folder set up, it will be embedded directly in your save file. Continue?\n\nTip: cancel and connect an image folder in Settings to keep saves small.`);
        if (!proceed) return;
      }
      try {
        const dataUrl = await fileToDataUrl(file);
        commit({ ...data, image: dataUrl });
      } catch (err) {
        flash && flash("Failed to read image", "error");
      }
    };
    fileInput.click();
  };

  const removeImage = () => {
    if (!confirm("Remove the map image? The drawing and the pins stay on the canvas.")) return;
    commit({ ...data, image: null });
  };

  const handleCanvasClick = (e) => {
    if (drawing.tool !== "pin") return;
    if (e.target && e.target.closest && e.target.closest(".map-resize-handle")) return; // a click on the resize grip is not a pin
    if (draggingPinId) return;
    if (dragMoved) { setDragMoved(false); return; }
    if (selectedPinId) { setSelectedPinId(null); return; }
    if (!imgRef.current) return;

    const rect = imgRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;

    const newPin = {
      id: `pin-${genId().slice(0, 6)}`,
      x, y, label: "", entryId: null, color: null, notes: "",
    };
    commit({ ...data, pins: [...pins, newPin] });
    setSelectedPinId(newPin.id);
  };

  const pinDragSeq = useRef(0);
  const handlePinMouseDown = (e, pinId) => {
    e.stopPropagation();
    pinDragSeq.current += 1;
    setDraggingPinId(pinId);
    setDragMoved(false);
  };

  // Drag handling
  useEffect(() => {
    if (!draggingPinId) return;
    const startX = pins.find(p => p.id === draggingPinId)?.x ?? 0;
    const startY = pins.find(p => p.id === draggingPinId)?.y ?? 0;
    let moved = false;

    const handleMove = (e) => {
      if (!imgRef.current) return;
      const rect = imgRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      if (Math.abs(x - startX) > 0.002 || Math.abs(y - startY) > 0.002) {
        moved = true;
      }
      commit({ ...data, pins: pins.map(p => p.id === draggingPinId ? { ...p, x, y } : p) }, { coalesce: `pin-drag-${draggingPinId}-${pinDragSeq.current}` });
    };
    const handleUp = () => {
      if (!moved) {
        // It was a click, not a drag - select the pin
        setSelectedPinId(draggingPinId);
      } else {
        setDragMoved(true);
      }
      setDraggingPinId(null);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [draggingPinId, data, pins, onChange]);

  // Pin field edits coalesce per field, so a label typed in one go is one
  // undo step; a different field, or a drag in between, starts a new one.
  const updatePin = (pinId, patch) => {
    const field = Object.keys(patch)[0] || "field";
    commit({ ...data, pins: pins.map(p => p.id === pinId ? { ...p, ...patch } : p) }, { coalesce: `pin-${pinId}-${field}` });
  };
  const deletePin = (pinId) => {
    commit({ ...data, pins: pins.filter(p => p.id !== pinId) });
    setSelectedPinId(null);
  };

  const selectedPin = pins.find(p => p.id === selectedPinId);
  // v1.5 r079: bodies join the pin-link picker pool so a pin can target an
  // Astronomical Body. Body synth-entries carry the body sentinel as templateId.
  const sortedEntries = useMemo(() => [
    ...entries,
    ...(bodies || []).map(b => ({ id: b.id, name: b.name || "(unnamed)", templateId: BODY_REF_SENTINEL, _isBody: true })),
  ].sort((a, b) => a.name.localeCompare(b.name)), [entries, bodies]);

  return (
    <div className="map-editor">
      <div className="map-editor-toolbar">
        <button className="btn btn-ghost" onClick={setImage}>{data.image ? "Change Image" : "Set Image"}</button>
        {data.image && <button className="btn btn-danger" onClick={removeImage}>Remove Image</button>}
        <span style={{ flex: 1 }} />
        <span className="map-editor-hint">{drawing.hint}</span>
      </div>
      <MapToolStrip drawing={drawing} history={history} showPresets={showPresets} presetValue={presetValue} onPreset={applyPreset} canvasSize={{ width: data.drawing.width, height: data.drawing.height }} onCustomSize={applyCustomSize} layersOpen={layersOpen} onToggleLayers={() => setLayersOpen(o => !o)} stamps={stamps} />
      {layersOpen && <MapLayerPanel drawing={drawing} />}

      {data.image && errored ? (
        <div className="map-empty" style={{ borderTop: "none", borderRadius: "0 0 3px 3px" }}>
          <div>Image not found: <code>{data.image}</code></div>
          <button className="btn btn-ghost" onClick={setImage}>Pick a different image</button>
        </div>
      ) : !canvasReady ? (
        <div className="map-empty" style={{ borderTop: "none" }}>Loading image...</div>
      ) : (
          <div
            className={`map-canvas tool-${drawing.tool} ${drawing.tool !== "pin" ? "draw-mode" : ""} ${mapZoom > 1 ? "zoomed" : ""}`}
            ref={canvasRef}
            onClick={handleCanvasClick}
            tabIndex={0}
            style={{ borderRadius: "0 0 3px 3px", width: `${sizePct}%`, marginLeft: sizePct > 100 ? `${(100 - sizePct) / 2}%` : undefined }}
          >
            <div style={{ position: "relative", width: `${mapZoom * 100}%`, transition: "width 100ms ease" }}>
              {mapTreeToReact(canvasTree, "canvas", {
                ref: imgRef,
                onMouseDown: drawing.onSvgMouseDown,
                onMouseMove: drawing.onSvgMouseMove,
                onClick: drawing.onSvgClick,
                onDoubleClick: drawing.onSvgDoubleClick,
                onContextMenu: drawing.onSvgContextMenu,
              })}
              {pins.map(pin => (
                <MapPin
                  key={pin.id}
                  pin={pin}
                  entries={entries}
                  editable
                  isSelected={pin.id === selectedPinId}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => handlePinMouseDown(e, pin.id)}
                />
              ))}
              <MapEditorOverlay width={canvasTree.width} height={canvasTree.height} drawing={drawing} />
            </div>
            {Math.round(sizePct) !== 100 && <div className="map-size-indicator">{Math.round(sizePct)}%</div>}
            <div className="map-resize-handle" onMouseDown={handleResizeStart} title="Drag to resize · double-click to reset" onDoubleClick={() => setSizePct(100)} />
          </div>
      )}

      {selectedPin && (
        <div className="pin-editor-panel">
          <div className="pin-editor-title">
            <span>Edit Pin</span>
            <span className="pin-editor-coords">{(selectedPin.x * 100).toFixed(1)}%, {(selectedPin.y * 100).toFixed(1)}%</span>
          </div>
          <div className="form-field">
            <label className="form-label">Label</label>
            <input
              className="input"
              value={selectedPin.label || ""}
              onChange={e => updatePin(selectedPin.id, { label: e.target.value })}
              placeholder="Pin label..."
              autoFocus
            />
          </div>
          <div className="form-field">
            <label className="form-label">Linked Entry</label>
            <select className="input" value={selectedPin.entryId || ""} onChange={e => updatePin(selectedPin.id, { entryId: e.target.value || null })}>
              <option value="">— None —</option>
              {sortedEntries.map(e => <option key={e.id} value={e.id}>{e.name}{e._isBody ? " (Astronomical Body)" : ""}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label className="pin-permanent-toggle">
              <input
                type="checkbox"
                checked={!!selectedPin.permanent}
                onChange={e => updatePin(selectedPin.id, { permanent: e.target.checked })}
              />
              <span>Always visible (ignore time mode)</span>
            </label>
            <div className="pin-permanent-hint">
              {selectedPin.permanent
                ? "This pin will show on the map regardless of the time scrubber, even if its linked entry has a date range."
                : "When time mode is on, this pin filters by its linked entry's date range. Pins linked to entries with no date range are hidden."}
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">Color</label>
            <div className="input-row">
              <input type="color" className="input" value={selectedPin.color || "#c8a96e"} onChange={e => updatePin(selectedPin.id, { color: e.target.value })} />
              {selectedPin.color && <button className="btn btn-ghost" onClick={() => updatePin(selectedPin.id, { color: null })}>Reset to default</button>}
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">Notes</label>
            <textarea
              className="input"
              value={selectedPin.notes || ""}
              onChange={e => updatePin(selectedPin.id, { notes: e.target.value })}
              placeholder="Notes about this pin..."
              rows={2}
            />
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <button className="btn btn-danger" onClick={() => deletePin(selectedPin.id)}>Delete Pin</button>
            <span style={{ flex: 1 }} />
            <button className="btn btn-ghost" onClick={() => setSelectedPinId(null)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Cartographia ──────────────────────────────────────────────────────────────
// Top-level view that indexes every map in the world. Maps are first-class
// records in state.cartographia (a flat slice, Stemma-shaped), promoted out of
// kind:"map" entries in v1.6 r001. Each record carries name, tags, three fields
// (Description / Scope-Region / Notes via cartographiaMapSchema), and mapData
// (image + pins). The index is a flat list; opening a record routes to the
// per-map view (canvas above the schema fields). No template picker: there is
// no map-kind template anymore.

// The Stamps panel at the head of the Cartographia index (above the map list;
// a world has far fewer stamps than maps, by Drak's call): every imported stamp
// grouped by pack with a preview, Delete per stamp and per pack (warning with
// the count of placed stamps that will go missing), Export per pack (its own
// ids, so a re-import replaces its own), Import pack, and Export built-ins as
// a pack, which is a correct file to start a new pack from. An import that
// has nothing to report lands at once with a flash; one where the sanitizer
// removed something, or dropped a stamp, shows the report first, with Cancel.
function MapStampsPanel({ state, isLocked, onChange, flash }) {
  const stamps = Array.isArray(state.mapStamps) ? state.mapStamps : [];
  const [pending, setPending] = useState(null); // a parsed pack waiting on the report modal
  const usage = useMemo(() => mapStampUsage(state), [state.cartographia]);
  const groups = mapStampGroups(stamps);
  const say = (text, type) => { if (flash) flash(text, type); };
  const download = (filename, obj) => {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const applyPack = (parsed) => {
    const incoming = new Map(parsed.stamps.map(s => [s.id, s]));
    const next = stamps.map(s => (incoming.has(s.id) ? incoming.get(s.id) : s));
    parsed.stamps.forEach(s => { if (!stamps.some(e => e.id === s.id)) next.push(s); });
    onChange(next);
    const r = parsed.report;
    say(`Imported "${parsed.pack.name}": ${plural(r.added, "new stamp", "new stamps")}, ${r.updated} updated${r.dropped.length ? `, ${r.dropped.length} dropped` : ""}.`);
  };
  const importPack = () => {
    if (isLocked) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const parsed = parseMapStampPack(String(reader.result || ""), stamps);
        if (!parsed.ok) { say(parsed.error, "error"); return; }
        if (parsed.report.removed.length || parsed.report.dropped.length || parsed.stamps.length === 0) { setPending(parsed); return; }
        applyPack(parsed);
      };
      reader.onerror = () => say("Couldn't read that file.", "error");
      reader.readAsText(file);
    };
    input.click();
  };
  const exportGroup = (g) => {
    download(`${g.id}.cartulary-stamps.json`, buildMapStampPackFile(g.id, g.name, g.stamps));
    say(`Exported "${g.name}" (${plural(g.stamps.length, "stamp", "stamps")}).`);
  };
  const exportBuiltins = () => {
    download("cartulary-builtins.cartulary-stamps.json", buildMapStampPackFile("cartulary-builtins", "Cartulary built-in stamps", MAP_BUILTIN_STAMPS));
    say("Exported the four built-in stamps as a pack. Edit it, rename it, and import it to make your own.");
  };
  const usageNote = (ids) => {
    let shapes = 0;
    const maps = new Set();
    ids.forEach(id => { const u = usage[id]; if (u) { shapes += u.shapes; } });
    (Array.isArray(state.cartographia) ? state.cartographia : []).forEach(rec => {
      const d = rec && rec.mapData && rec.mapData.drawing;
      if ((d && Array.isArray(d.layers) ? d.layers : []).some(l => (Array.isArray(l.shapes) ? l.shapes : []).some(s => s && s.type === "stamp" && ids.includes(s.stampId)))) maps.add(rec.id);
    });
    return shapes > 0 ? ` It is placed ${plural(shapes, "time", "times")} on ${plural(maps.size, "map", "maps")}; those will show as missing until a pack with it is imported again.` : "";
  };
  const removeStamp = (s) => {
    if (isLocked) return;
    if (!confirm(`Delete the stamp "${s.name}"?${usageNote([s.id])}`)) return;
    onChange(stamps.filter(x => x.id !== s.id));
  };
  const removeGroup = (g) => {
    if (isLocked) return;
    if (!confirm(`Delete the pack "${g.name}" and its ${plural(g.stamps.length, "stamp", "stamps")}?${usageNote(g.stamps.map(s => s.id))}`)) return;
    const ids = new Set(g.stamps.map(s => s.id));
    onChange(stamps.filter(x => !ids.has(x.id)));
  };
  const listMore = (items, max) => (items.length > max ? [...items.slice(0, max), `and ${items.length - max} more`] : items);
  return (
    <div className="map-stamps">
      <div className="map-stamps-head">
        <span className="map-stamps-title">Stamps</span>
        {!isLocked && <button type="button" className="btn btn-small btn-accent" onClick={importPack} title="Import a stamp pack (.json)">+ Import pack</button>}
        <button type="button" className="btn btn-small btn-ghost" onClick={exportBuiltins} title="A correct pack file with the four built-in stamps, to start your own from">Export built-ins as a pack</button>
      </div>
      {groups.length === 0 ? (
        <div className="map-stamps-empty">No imported stamps. The map editor's Stamp tool has four built in; a stamp pack adds more.</div>
      ) : groups.map(g => (
        <div key={g.id} className="map-stamp-group">
          <div className="map-stamp-group-head">
            <span className="map-stamp-group-name">{g.name}</span>
            <span>{plural(g.stamps.length, "stamp", "stamps")}</span>
            <span style={{ flex: 1 }} />
            <button type="button" className="btn btn-small btn-ghost" onClick={() => exportGroup(g)} title="Write this pack back out as a file">Export</button>
            {!isLocked && <button type="button" className="btn btn-small btn-danger" onClick={() => removeGroup(g)} title="Delete this pack and every stamp in it">Delete pack</button>}
          </div>
          <div className="map-stamp-grid">
            {g.stamps.map(s => (
              <div key={s.id} className="map-stamp-tile" title={`${s.name} (${s.id})`}>
                <svg viewBox={s.viewBox} width="40" height="40" fill={MAP_PALETTE[5].hex} stroke={MAP_PALETTE[0].hex} aria-hidden="true" dangerouslySetInnerHTML={{ __html: s.body }} />
                <span className="map-stamp-tile-name">{s.name}</span>
                {!isLocked && <button type="button" className="map-stamp-tile-x" title="Delete this stamp" onClick={() => removeStamp(s)}>{"\u00d7"}</button>}
              </div>
            ))}
          </div>
        </div>
      ))}
      {pending && (
        <div className="modal-backdrop" onClick={() => setPending(null)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">Import stamp pack "{pending.pack.name}"</div>
            <div className="modal-body">
              <p>
                {pending.stamps.length === 0
                  ? "Nothing in this pack can be imported."
                  : `${plural(pending.stamps.length, "stamp", "stamps")} will import: ${pending.report.added} new${pending.report.updated ? `, ${pending.report.updated} replacing ${pending.report.updated === 1 ? "a stamp" : "stamps"} this pack imported before` : ""}.`}
              </p>
              {pending.report.removed.length > 0 && (
                <div className="modal-notice modal-notice-warning">
                  <strong>The sanitizer removed:</strong>
                  <ul>{listMore(pending.report.removed, 12).map((r, i) => (typeof r === "string" ? <li key={i}>{r}</li> : <li key={i}><code>{r.id}</code>: {r.items.join(", ")}</li>))}</ul>
                </div>
              )}
              {pending.report.dropped.length > 0 && (
                <div className="modal-notice modal-notice-warning">
                  <strong>Dropped:</strong>
                  <ul>{listMore(pending.report.dropped, 12).map((r, i) => (typeof r === "string" ? <li key={i}>{r}</li> : <li key={i}><code>{r.id}</code>: {r.reason}</li>))}</ul>
                </div>
              )}
              <p className="map-stamps-note">A stamp body may hold only g, path, circle, ellipse, rect, polygon, polyline, and line, with geometry, paint, opacity, and transform attributes. Everything else is removed on import and again whenever the world loads.</p>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setPending(null)}>Cancel</button>
              <button type="button" className="btn btn-accent" disabled={pending.stamps.length === 0} onClick={() => { applyPack(pending); setPending(null); }}>Import {plural(pending.stamps.length, "stamp", "stamps")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CartographiaIndexView({ state, isLocked, onOpen, onCreate, onDelete, onStampsChange, flash }) {
  const maps = (Array.isArray(state.cartographia) ? state.cartographia : [])
    .slice()
    .sort((a, b) => {
      // Most-recently-updated first; records without updatedAt sort to bottom.
      const ad = a.updatedAt || "";
      const bd = b.updatedAt || "";
      if (ad === bd) return (a.name || "").localeCompare(b.name || "");
      return ad < bd ? 1 : -1;
    });

  // Description preview: read the fixed Description field id, strip light
  // markdown, truncate to ~140 chars.
  const previewFor = (rec) => {
    const raw = (rec.fields || {})[CART_FIELD_DESCRIPTION];
    if (!raw || typeof raw !== "string") return null;
    const cleaned = raw
      .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, n, d) => d || n)
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/\*\*|__|\*|_|`/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (cleaned.length === 0) return null;
    return cleaned.length > 140 ? cleaned.slice(0, 137).trimEnd() + "\u2026" : cleaned;
  };

  return (
    <div style={{ padding: "20px 24px", maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
        <div style={{ color: "var(--text-dim)", fontSize: 14, lineHeight: 1.5, maxWidth: 560 }}>
          The bound collection of maps. Each map is a canvas, an image or a blank sheet, with a drawing on it and time-aware pins over it that cross-reference other entries. Open a map to draw on it or place pins.
        </div>
        {!isLocked && (
          <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
            <button className="btn btn-accent" onClick={onCreate}>+ New Map</button>
          </div>
        )}
      </div>

      <MapStampsPanel state={state} isLocked={isLocked} onChange={onStampsChange || (() => {})} flash={flash} />

      {maps.length === 0 ? (
        <div style={{
          padding: "60px 20px",
          textAlign: "center",
          color: "var(--text-dim)",
          fontStyle: "italic",
          border: "1px dashed var(--border)",
          borderRadius: 6,
          background: "var(--surf)",
        }}>
          No maps yet.{!isLocked && " Click + New Map above to create one."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 1, border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
          {maps.map(rec => {
            const pinCount = rec.mapData?.pins?.length || 0;
            const hasImage = !!rec.mapData?.image;
            const preview = previewFor(rec);
            return (
              <div
                key={rec.id}
                className="stemma-index-row"
                style={{ padding: "12px 16px", background: "var(--surf)", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 12 }}
                onClick={() => onOpen(rec.id)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ color: "#7ec8c8", fontSize: 13 }}>{"\u25a3"}</span>
                      <span>{rec.name || "(unnamed map)"}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-dim)", whiteSpace: "nowrap" }}>
                      {pinCount} {pinCount === 1 ? "pin" : "pins"}
                      {!hasImage && <span style={{ color: "var(--text-dim)", fontStyle: "italic" }}> · no image</span>}
                      {rec.updatedAt && <span> · updated {fmtDate(rec.updatedAt)}</span>}
                    </div>
                  </div>
                  {preview && (
                    <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 4 }}>
                      {preview}
                    </div>
                  )}
                  {Array.isArray(rec.tags) && rec.tags.length > 0 && (
                    <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {rec.tags.map(t => (
                        <span key={t} style={{ fontSize: 11, padding: "2px 8px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-dim)" }}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
                {!isLocked && (
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button
                      className="btn"
                      style={{ padding: "3px 8px", fontSize: 12, color: "var(--danger)", borderColor: "rgba(184,92,76,.35)" }}
                      onClick={ev => {
                        ev.stopPropagation();
                        if (confirm(`Delete map "${rec.name}"? This cannot be undone.`)) {
                          onDelete(rec.id);
                        }
                      }}
                      title="Delete this map"
                    >Delete</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}