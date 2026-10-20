
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
const MAP_STROKE_WIDTHS = [2, 4, 8];        // viewBox units
const MAP_TEXT_SIZES = [24, 36, 56];        // viewBox units, Cormorant Garamond
const MAP_SHAPE_TYPES = ["rect", "ellipse", "polygon", "stroke", "text", "stamp"];
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
    strokeWidth: pick(s.strokeWidth, MAP_STROKE_WIDTHS, 4),
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

// state.mapStamps: stamps imported from stamp packs, world-scoped. Shape-checked
// here; the import sanitizer (allowlisted elements and attributes) arrives with
// stamp packs (cut 6) and runs on import and on load. Until then nothing renders
// a stamp, so an unsanitized body cannot reach a page.
function ensureMapStamps(list) {
  return (Array.isArray(list) ? list : [])
    .filter(s => s && typeof s === "object" && typeof s.id === "string" && s.id)
    .map(s => ({
      id: s.id,
      name: (typeof s.name === "string" && s.name.trim()) ? s.name : s.id,
      viewBox: typeof s.viewBox === "string" ? s.viewBox : "0 0 64 64",
      body: typeof s.body === "string" ? s.body : "",
    }));
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

// One normalized shape to one node, or null for a type nothing renders yet
// (stamps arrive at cut 5).
function mapShapeNode(s) {
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
      if (s.rotation) attrs.transform = `rotate(${f(s.rotation)} ${f(s.x)} ${f(s.y)})`;
      return { tag: "text", attrs, children: [s.text] };
    }
    default:
      return null;
  }
}

// opts: { id, className, label, imageHref, imageWidth, imageHeight }. With an
// image the canvas is the image's natural size and the background is not
// drawn; without one the background rect (and its grain) comes first. Then one
// <g> per visible layer, in order. The returned root also carries width and
// height so a caller can read the canvas size it rendered at.
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
  d.layers.forEach(layer => {
    if (!layer.visible) return;
    children.push({ tag: "g", attrs: { "data-layer": layer.id }, children: layer.shapes.map(mapShapeNode).filter(Boolean) });
  });
  const attrs = { xmlns: "http://www.w3.org/2000/svg", viewBox: `0 0 ${f(width)} ${f(height)}`, role: "img" };
  if (o.className) attrs.class = o.className;
  if (o.label) attrs["aria-label"] = o.label;
  return { tag: "svg", attrs, children: defs.length > 0 ? [{ tag: "defs", children: defs }, ...children] : children, width, height };
}

// Static markup for the HTML export. Text and attribute values are escaped;
// empty elements self-close, which HTML's parser honors for SVG content.
function mapTreeToString(node) {
  if (node == null) return "";
  if (typeof node === "string") return mapEscapeXml(node);
  const attrs = Object.entries(node.attrs || {})
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => ` ${k}="${mapEscapeXml(v)}"`)
    .join("");
  const kids = (node.children || []).map(mapTreeToString).join("");
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

// Shared resize handler for the map canvas. Returns a mousedown handler that the
// caller wires onto a resize-handle element. Drags the canvas width as a percentage
// of its parent. Pin positions are 0-1 normalized so they track the canvas size.
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
    const parentWidth = parent.clientWidth;

    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const deltaPct = (dx / parentWidth) * 100;
      const next = Math.max(25, Math.min(100, startSize + deltaPct));
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
  }), [mapData, entry.id, entry.name, imageUrl, imageSize]);
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
      <div className="map-empty">
        <div className="map-empty-glyph">▣</div>
        <div>Image not found: <code>{mapData.image}</code></div>
        <div style={{ fontSize: 11, marginTop: 4 }}>
          {dirHandle ? "Check the connected image folder." : "No image folder connected — set one in Settings."}
        </div>
      </div>
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
      <div className="map-canvas view-mode" ref={canvasRef} style={{ width: `${sizePct}%` }}>
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
        {sizePct < 100 && <div className="map-size-indicator">{Math.round(sizePct)}%</div>}
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

function MapEditor({ mapData, onChange, dirHandle, imageFolder, entries, bodies, flash }) {
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
  }), [data, imageUrl, imageSize]);

  // Size heal, once: the first time an image loads while the drawing is still
  // empty, record its natural size as the drawing's size (the renderer already
  // draws at that size; this keeps the units if the image is removed later).
  // Once the drawing has content the size is fixed and this never fires.
  useEffect(() => {
    if (!data.image || !imageSize) return;
    const d = data.drawing;
    if (mapDrawingHasContent(d)) return;
    if (d.width === imageSize.width && d.height === imageSize.height) return;
    onChange({ ...data, drawing: { ...d, width: imageSize.width, height: imageSize.height } });
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
            onChange({ ...data, image: filename });
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
        onChange({ ...data, image: dataUrl });
      } catch (err) {
        flash && flash("Failed to read image", "error");
      }
    };
    fileInput.click();
  };

  const removeImage = () => {
    if (!confirm("Remove the map image? The drawing and the pins stay on the canvas.")) return;
    onChange({ ...data, image: null });
  };

  const handleCanvasClick = (e) => {
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
    onChange({ ...data, pins: [...pins, newPin] });
    setSelectedPinId(newPin.id);
  };

  const handlePinMouseDown = (e, pinId) => {
    e.stopPropagation();
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
      onChange({ ...data, pins: pins.map(p => p.id === draggingPinId ? { ...p, x, y } : p) });
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

  const updatePin = (pinId, patch) => {
    onChange({ ...data, pins: pins.map(p => p.id === pinId ? { ...p, ...patch } : p) });
  };
  const deletePin = (pinId) => {
    onChange({ ...data, pins: pins.filter(p => p.id !== pinId) });
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
        <span className="map-editor-hint">
          Click on map to add pin · Click pin to edit · Drag pin to move
        </span>
      </div>

      {data.image && errored ? (
        <div className="map-empty" style={{ borderTop: "none", borderRadius: "0 0 3px 3px" }}>
          <div>Image not found: <code>{data.image}</code></div>
          <button className="btn btn-ghost" onClick={setImage}>Pick a different image</button>
        </div>
      ) : !canvasReady ? (
        <div className="map-empty" style={{ borderTop: "none" }}>Loading image...</div>
      ) : (
          <div className="map-canvas" ref={canvasRef} onClick={handleCanvasClick} style={{ borderRadius: "0 0 3px 3px", width: `${sizePct}%` }}>
            <div style={{ position: "relative", width: `${mapZoom * 100}%`, transition: "width 100ms ease" }}>
              {mapTreeToReact(canvasTree, "canvas", { ref: imgRef })}
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
            </div>
            {sizePct < 100 && <div className="map-size-indicator">{Math.round(sizePct)}%</div>}
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
function CartographiaIndexView({ state, isLocked, onOpen, onCreate, onDelete }) {
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
          The bound collection of maps. Each map is a clickable image canvas with time-aware pin filtering and cross-references to other entries through its pins. Open a map to add or edit pins.
        </div>
        {!isLocked && (
          <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
            <button className="btn btn-accent" onClick={onCreate}>+ New Map</button>
          </div>
        )}
      </div>

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