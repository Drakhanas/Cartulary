
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
    // v1.7 r003: a referenced body, Glossopoeia record, or map is named too,
    // where it used to drop out of the pane.
    const registeredNameById = {};
    for (const n of getRegisteredGraphNodes(state)) registeredNameById[n.id] = n.name;
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
        const names = ids.map(id => entriesById[id]?.name || registeredNameById[id]).filter(Boolean);
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