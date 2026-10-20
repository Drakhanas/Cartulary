
// ─── Family tree view ──────────────────────────────────────────────────────────

function buildFamilyData(entries, templates) {
  const tplById = Object.fromEntries(templates.map(t => [t.id, t]));
  const entryIds = new Set(entries.map(e => e.id));
  const parentsOf = {};   // childId  -> [{id, label}, ...]
  const childrenOf = {};  // parentId -> [{id, label}, ...] (label is the parent-side role label)
  const spousesOf = {};   // id       -> [{id, label, status}, ...]

  entries.forEach(e => {
    parentsOf[e.id] = [];
    childrenOf[e.id] = [];
    spousesOf[e.id] = [];
  });

  // Status precedence for spouse reconciliation (Bug 6):
  // former > estranged > active. Two-sided definitions reconcile to the most-restrictive
  // status. Each side's self-asserted label is preserved (e.g. "Wife" on one side,
  // "Husband" on the other). Iteration-order independent.
  const SPOUSE_STATUS_PREC = { former: 3, estranged: 2, active: 1 };
  const upsertSpouse = (ownerId, partnerId, ownerLabel, ownerStatus, isOwnerSelfAssertion) => {
    const existing = spousesOf[ownerId].find(r => r.id === partnerId);
    if (!existing) {
      spousesOf[ownerId].push({ id: partnerId, label: ownerLabel, status: ownerStatus });
      return;
    }
    const newPrec = SPOUSE_STATUS_PREC[ownerStatus] || 0;
    const existingPrec = SPOUSE_STATUS_PREC[existing.status] || 0;
    if (newPrec > existingPrec) existing.status = ownerStatus;
    if (isOwnerSelfAssertion) existing.label = ownerLabel;
  };

  entries.forEach(e => {
    const tpl = tplById[e.templateId];
    if (!tpl) return;
    tpl.fields.forEach(f => {
      if (f.type !== "entry-ref" || !f.relationKind) return;
      const refs = getRelationValues((e.fields || {})[f.id], f.multi);
      refs.forEach(({ id: rid, label: override, status }) => {
        if (!entryIds.has(rid)) return;
        const label = (override && override.trim()) || f.label;
        if (f.relationKind === "parent") {
          if (!parentsOf[e.id].some(r => r.id === rid)) {
            parentsOf[e.id].push({ id: rid, label });
          }
          if (!childrenOf[rid].some(r => r.id === e.id)) {
            childrenOf[rid].push({ id: e.id, label });
          }
        } else if (f.relationKind === "spouse") {
          const spouseStatus = status || "active";
          // e's self-assertion: authoritative for label on e's own side.
          upsertSpouse(e.id, rid, label, spouseStatus, true);
          // Mirror onto the partner's side. If the partner self-asserts later
          // (or has already), their own label takes precedence; status reconciles
          // to the more restrictive of the two.
          upsertSpouse(rid, e.id, label, spouseStatus, false);
        }
      });
    });
  });

  return { parentsOf, childrenOf, spousesOf };
}

function buildFamilyTree(focalId, family, maxUp = 5, maxDown = 5) {
  const { parentsOf, childrenOf, spousesOf } = family;
  const ancestorGens = {}; // negative gen -> [ids]
  const descendantGens = {};

  // Walk up
  let cur = [focalId];
  for (let g = 1; g <= maxUp; g++) {
    const next = [];
    cur.forEach(id => {
      (parentsOf[id] || []).forEach(({ id: pid }) => {
        if (!next.includes(pid)) next.push(pid);
      });
    });
    if (next.length === 0) break;
    ancestorGens[-g] = next;
    cur = next;
  }

  // Walk down
  cur = [focalId];
  for (let g = 1; g <= maxDown; g++) {
    const next = [];
    cur.forEach(id => {
      (childrenOf[id] || []).forEach(({ id: cid }) => {
        if (!next.includes(cid)) next.push(cid);
      });
    });
    if (next.length === 0) break;
    descendantGens[g] = next;
    cur = next;
  }

  // Focal generation: siblings + focal + spouses
  const focalParentIds = (parentsOf[focalId] || []).map(p => p.id);
  const focalSpouseIds = (spousesOf[focalId] || []).map(s => s.id);
  const siblings = [];
  if (focalParentIds.length > 0) {
    Object.keys(parentsOf).forEach(eid => {
      if (eid === focalId) return;
      const eParentIds = (parentsOf[eid] || []).map(p => p.id);
      if (eParentIds.some(p => focalParentIds.includes(p))) siblings.push(eid);
    });
  }
  const focalGen = [...siblings, focalId, ...focalSpouseIds];

  return { ancestorGens, focalGen, descendantGens };
}

function FamilyView({ state, onOpenEntry, onExportFamilyTree, onUpdateViewPrefs }) {
  const svgRef = useRef(null);
  const [focalId, setFocalId] = useState(null);
  // View-level calendar selector. Lifespan dates in tree nodes project through
  // viewCalendar — so a tree mixing characters from different cultures still
  // reads consistently in whichever reckoning the user picks. Single-calendar
  // worlds get no selector and behavior unchanged from pre-v1.4.
  const { calendar: viewCalendar, Selector: ViewCalendarSelector, hasAdditional } = getViewCalendarContext(state, "familyCalendarId", onUpdateViewPrefs);
  // User-controlled depth caps. Defaults at 5 each direction. Stored as
  // strings so the user can type freely (clear the field, type new digits)
  // without intermediate clamping fighting them mid-typing. Derived numeric
  // values used everywhere downstream are clamped 1-10.
  const [maxUpStr, setMaxUpStr] = useState("5");
  const [maxDownStr, setMaxDownStr] = useState("5");
  const clampDepth = (v) => Math.max(1, Math.min(10, parseInt(v, 10) || 1));
  const maxUp = clampDepth(maxUpStr);
  const maxDown = clampDepth(maxDownStr);

  const family = useMemo(() => buildFamilyData(state.entries, state.templates), [state.entries, state.templates]);

  const hasAnyRelations = useMemo(() => {
    return state.templates.some(t =>
      t.fields.some(f => f.type === "entry-ref" && (f.relationKind === "parent" || f.relationKind === "spouse"))
    );
  }, [state.templates]);

  // Auto-pick focal: someone with relations, or first entry
  useEffect(() => {
    if (focalId && state.entries.find(e => e.id === focalId)) return;
    const withRel = state.entries.find(e =>
      (family.parentsOf[e.id]?.length || 0) > 0 ||
      (family.childrenOf[e.id]?.length || 0) > 0 ||
      (family.spousesOf[e.id]?.length || 0) > 0
    );
    setFocalId(withRel?.id || state.entries[0]?.id || null);
  }, [focalId, state.entries, family]);

  // Render with d3
  useEffect(() => {
    if (!svgRef.current || !focalId || !state.entries.find(e => e.id === focalId)) return;
    const tree = buildFamilyTree(focalId, family, maxUp, maxDown);
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const NODE_W = 158, NODE_H = 56, HGAP = 22, VGAP = 76;
    const tplById = Object.fromEntries(state.templates.map(t => [t.id, t]));
    const entById = Object.fromEntries(state.entries.map(e => [e.id, e]));

    // ── Sosa-Stradonitz numbering for ancestors ──────────────────────────────
    // Focal = #1. Each person N's "father slot" is #2N, "mother slot" is #2N+1.
    // The father/mother distinction is purely positional (left vs right of the
    // tree). Labels like "Father"/"Mother" steer the assignment when present;
    // ID-sort breaks ties otherwise. Pedigree collapse (same person appearing
    // via two paths) keeps the first-seen Sosa number.
    const sortParentsForSosa = (parents) => [...parents].sort((a, b) => {
      const al = (a.label || "").toLowerCase();
      const bl = (b.label || "").toLowerCase();
      const isF = (s) => /\b(father|dad|sire|papa)\b/.test(s) && !/grand/.test(s);
      const isM = (s) => /\b(mother|mom|dam|mama)\b/.test(s) && !/grand/.test(s);
      const aF = isF(al), aM = isM(al), bF = isF(bl), bM = isM(bl);
      if (aF && !bF) return -1;
      if (bF && !aF) return 1;
      if (aM && !bM) return 1;
      if (bM && !aM) return -1;
      return a.id < b.id ? -1 : 1;
    });
    const sosa = { [focalId]: 1 };
    {
      const queue = [{ id: focalId, num: 1 }];
      while (queue.length > 0) {
        const { id, num } = queue.shift();
        const gen = Math.floor(Math.log2(num));
        if (gen >= maxUp) continue;  // user-controlled depth cap
        const sorted = sortParentsForSosa(family.parentsOf[id] || []);
        if (sorted[0] && !sosa[sorted[0].id]) {
          sosa[sorted[0].id] = num * 2;
          queue.push({ id: sorted[0].id, num: num * 2 });
        }
        if (sorted[1] && !sosa[sorted[1].id]) {
          sosa[sorted[1].id] = num * 2 + 1;
          queue.push({ id: sorted[1].id, num: num * 2 + 1 });
        }
      }
    }

    // Determine actual ancestor depth for tight tree-width budgeting
    let actualMaxGen = 0;
    Object.entries(sosa).forEach(([id, num]) => {
      if (num === 1) return;
      const g = Math.floor(Math.log2(num));
      if (g > actualMaxGen) actualMaxGen = g;
    });

    const SLOT_MIN = NODE_W + HGAP;
    const baseWidth = actualMaxGen > 0 ? SLOT_MIN * Math.pow(2, actualMaxGen) : SLOT_MIN;

    const positions = {};

    // Position Sosa-numbered ancestors. Each gen g has 2^g slots; slot
    // indices 0..2^g-1 evenly span baseWidth, centered on x=0.
    Object.entries(sosa).forEach(([id, num]) => {
      if (num === 1) return;  // focal placed separately
      const gen = Math.floor(Math.log2(num));
      const slotIdx = num - Math.pow(2, gen);
      const slotWidth = baseWidth / Math.pow(2, gen);
      const slotCenterX = -baseWidth / 2 + (slotIdx + 0.5) * slotWidth;
      positions[id] = {
        x: slotCenterX - NODE_W / 2,
        y: -gen * (NODE_H + VGAP),
        gen: -gen,
        sosa: num,
      };
    });

    // Place "extra" ancestors not picked up by Sosa (rare: 3+ parents on a
    // single child). They go in their generation row, to the right of the
    // Sosa-positioned ancestors at that gen.
    Object.entries(tree.ancestorGens).forEach(([gStr, ids]) => {
      const ng = parseInt(gStr);  // negative gen number
      const gen = -ng;             // positive gen depth
      const y = ng * (NODE_H + VGAP);
      const placedXsAtGen = Object.values(positions)
        .filter(p => p.gen === ng)
        .map(p => p.x);
      const startX = placedXsAtGen.length > 0
        ? Math.max(...placedXsAtGen) + NODE_W + HGAP
        : -NODE_W / 2 + (gen > 0 ? (NODE_W + HGAP) : 0);
      let cursorX = startX;
      ids.forEach(id => {
        if (positions[id]) return;  // already Sosa-placed
        positions[id] = { x: cursorX, y, gen: ng };
        cursorX += NODE_W + HGAP;
      });
    });

    // Place focal generation: focal at x=0, siblings to the left, spouses to
    // the right. Anchoring focal at x=0 (rather than centering the whole row)
    // keeps the Sosa ancestor tree symmetric above its descendant.
    {
      const ids = tree.focalGen;
      const focalIdx = Math.max(0, ids.indexOf(focalId));
      ids.forEach((id, i) => {
        positions[id] = {
          x: -NODE_W / 2 + (i - focalIdx) * (NODE_W + HGAP),
          y: 0,
          gen: 0,
        };
      });
    }

    // Position descendants. For each descendant, compute the desired x as the
    // mean of its positioned parents' x. Then sort the row by desired x and
    // resolve overlaps with a simple left-anchored greedy pass.
    Object.entries(tree.descendantGens).forEach(([gStr, ids]) => {
      const g = parseInt(gStr);
      const y = g * (NODE_H + VGAP);
      const desired = ids.map(id => {
        const parents = (family.parentsOf[id] || [])
          .map(p => p.id)
          .filter(pid => positions[pid]);
        if (parents.length === 0) return { id, x: -NODE_W / 2 };
        const mean = parents.reduce((s, pid) => s + positions[pid].x, 0) / parents.length;
        return { id, x: mean };
      });
      desired.sort((a, b) => a.x - b.x);
      for (let i = 1; i < desired.length; i++) {
        const minX = desired[i - 1].x + NODE_W + HGAP;
        if (desired[i].x < minX) desired[i].x = minX;
      }
      desired.forEach(({ id, x }) => {
        positions[id] = { x, y, gen: g };
      });
    });

    // viewBox bounds
    const xs = Object.values(positions).map(p => p.x);
    const ys = Object.values(positions).map(p => p.y);
    const minX = (xs.length ? Math.min(...xs) : 0) - 60;
    const maxX = (xs.length ? Math.max(...xs) : 0) + NODE_W + 60;
    const minY = (ys.length ? Math.min(...ys) : 0) - 40;
    const maxY = (ys.length ? Math.max(...ys) : 0) + NODE_H + 40;

    svg.attr("viewBox", `${minX} ${minY} ${maxX - minX} ${maxY - minY}`)
       .attr("preserveAspectRatio", "xMidYMid meet");

    const root = svg.append("g");

    // Arrowhead marker definitions
    const defs = svg.append("defs");
    defs.append("marker")
      .attr("id", "fam-arrow-down")
      .attr("viewBox", "0 0 10 10")
      .attr("refX", 8).attr("refY", 5)
      .attr("markerWidth", 7).attr("markerHeight", 7)
      .attr("orient", "auto")
      .append("path")
        .attr("d", "M 0 0 L 10 5 L 0 10 z")
        .attr("fill", "var(--text-dim)");
    defs.append("marker")
      .attr("id", "fam-arrow-spouse-end")
      .attr("viewBox", "0 0 10 10")
      .attr("refX", 8).attr("refY", 5)
      .attr("markerWidth", 6).attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
        .attr("d", "M 0 0 L 10 5 L 0 10 z")
        .attr("fill", "var(--accent-dim)");
    defs.append("marker")
      .attr("id", "fam-arrow-spouse-start")
      .attr("viewBox", "0 0 10 10")
      .attr("refX", 2).attr("refY", 5)
      .attr("markerWidth", 6).attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
        .attr("d", "M 10 0 L 0 5 L 10 10 z")
        .attr("fill", "var(--accent-dim)");

    // Edges - parent to child (with arrowhead pointing at child)
    const edgeG = root.append("g").attr("class", "family-edges");
    // Per-child descent lines. When a child has multiple visible parents,
    // draw each parent → junction → child as a tee: each parent drops to a
    // shared junction Y between the parent row and the child row, runs across
    // to a midpoint, and one descent line continues from there down to the
    // child. When the child has just one visible parent, fall back to a
    // simple L-line. Junction-style mirrors how Ancestry-class genealogy
    // tools group parent pairs visually. The Mother/Father per-parent labels
    // that used to render under each parent are dropped — with the grouped
    // descent line, the role distinction becomes redundant and the labels
    // would overlap the new line geometry.
    Object.entries(family.parentsOf).forEach(([cid, parents]) => {
      if (!positions[cid]) return;
      const visibleParents = parents.filter(({ id }) => positions[id]);
      if (visibleParents.length === 0) return;

      const cp = positions[cid];
      const childX = cp.x + NODE_W / 2;
      const childY = cp.y;

      if (visibleParents.length === 1) {
        const pp = positions[visibleParents[0].id];
        const x1 = pp.x + NODE_W / 2;
        const y1 = pp.y + NODE_H;
        const midY = y1 + (childY - y1) * 0.5;
        edgeG.append("path")
          .attr("d", `M ${x1} ${y1} L ${x1} ${midY} L ${childX} ${midY} L ${childX} ${childY}`)
          .attr("fill", "none")
          .attr("stroke", "var(--text-dim)")
          .attr("stroke-width", 1.5)
          .attr("marker-end", "url(#fam-arrow-down)");
      } else {
        // Two or more parents — junction-style descent.
        // Geometry has three Y levels:
        //   parentBottomY  — where parent nodes end
        //   junctionY      — where parents come together (40% down toward child)
        //   siblingsBarY   — horizontal sibling connector (just above child row)
        // Each parent drops to junctionY and runs to the midpoint. From there
        // a single descent drops to the siblings bar. From the siblings bar a
        // short vertical line drops into each child. The visible 18px gap
        // between siblings bar and child top gives each child its own drop
        // line rather than the connector running flush against the node tops.
        const parentXs = visibleParents.map(p => positions[p.id].x + NODE_W / 2);
        const parentBottomY = Math.max(...visibleParents.map(p => positions[p.id].y + NODE_H));
        const junctionY = parentBottomY + (childY - parentBottomY) * 0.4;
        const siblingsBarY = childY - 18;
        const midX = (Math.min(...parentXs) + Math.max(...parentXs)) / 2;

        // Each parent drops to junctionY at its own X, runs horizontally to
        // midX. Drawn per-parent so multiple children sharing the same parents
        // overlap these strokes identically (cosmetic redundancy, no artifact).
        parentXs.forEach(px => {
          edgeG.append("path")
            .attr("d", `M ${px} ${parentBottomY} L ${px} ${junctionY} L ${midX} ${junctionY}`)
            .attr("fill", "none")
            .attr("stroke", "var(--text-dim)")
            .attr("stroke-width", 1.5);
        });

        // From the junction midpoint, descend to the siblings bar, then run
        // across to this child's X, then drop into the child. Each child's
        // path overlaps the others on the descent and on the shared portion
        // of the siblings bar; non-shared portions extend out to that child.
        edgeG.append("path")
          .attr("d", `M ${midX} ${junctionY} L ${midX} ${siblingsBarY} L ${childX} ${siblingsBarY} L ${childX} ${childY}`)
          .attr("fill", "none")
          .attr("stroke", "var(--text-dim)")
          .attr("stroke-width", 1.5)
          .attr("marker-end", "url(#fam-arrow-down)");
      }
    });

    // Spouse line drawing in Linea is deferred for now. Focal-level spouses
    // still render as nodes (positioned next to the focal); when they share
    // children with the focal, the parent-grouping descent geometry implies
    // the pairing — both Aria and Caelan show as parents of Sera/Mar via the
    // junction-style descent above. Childless spouses appear as adjacent
    // floating nodes without a visible connector. Acceptable for v1.2;
    // revisit if usage shows it's confusing.

    // Nodes
    const nodeG = root.append("g").attr("class", "family-nodes");
    Object.entries(positions).forEach(([id, pos]) => {
      const ent = entById[id];
      if (!ent) return;
      const tpl = tplById[ent.templateId];
      const isFocal = id === focalId;
      const isDeceased = isEntryDeceased(ent, tpl);

      const g = nodeG.append("g")
        .attr("transform", `translate(${pos.x}, ${pos.y})`)
        .style("cursor", "pointer")
        .style("opacity", isDeceased ? 0.7 : 1)
        .on("click", (event) => {
          event.stopPropagation();
          if (event.shiftKey) onOpenEntry(id);
          else setFocalId(id);
        });

      // Native SVG tooltip — shows the untruncated entry name + template
      // on hover. Critical for nodes whose name was truncated to fit the box.
      g.append("title")
        .text(tpl?.name ? `${ent.name} (${tpl.name})` : ent.name);

      g.append("rect")
        .attr("width", NODE_W).attr("height", NODE_H).attr("rx", 4)
        .attr("fill", isFocal ? "var(--accent-glow)" : "var(--surf2)")
        .attr("stroke", isFocal ? (tpl?.color || "var(--accent)") : "var(--text-dim)")
        .attr("stroke-width", isFocal ? 2.5 : 1)
        .attr("stroke-dasharray", isDeceased && !isFocal ? "4 3" : null);

      if (tpl?.icon) {
        g.append("text")
          .attr("x", 12).attr("y", 22)
          .attr("fill", tpl.color || "var(--accent)")
          .attr("font-size", 14)
          .text(tpl.icon);
      }

      // Append the name with the full text, then iteratively chop until it
      // fits within the box's text area. Character-based truncation underestimates
      // wide letters (M, W, etc.) and lets text escape the box. Available width
      // is the box minus left text-offset (32) minus right padding (8).
      const NAME_MAX_W = NODE_W - 32 - 8;
      const fullName = isDeceased ? `✝ ${ent.name}` : ent.name;
      const nameEl = g.append("text")
        .attr("x", 32).attr("y", 24)
        .attr("fill", isFocal ? "var(--text-bright)" : "var(--text)")
        .attr("font-size", 13)
        .attr("font-family", "DM Sans, sans-serif")
        .attr("font-weight", isFocal ? 500 : 400)
        .attr("font-style", isDeceased ? "italic" : "normal")
        .text(fullName);
      let displayed = fullName;
      while (nameEl.node().getComputedTextLength() > NAME_MAX_W && displayed.length > 2) {
        displayed = displayed.slice(0, -2) + "…";
        nameEl.text(displayed);
      }

      // Secondary line below the name — prefer lifespan dates (DOB-DOD)
      // when the entry has a populated calendar-date-range field, fall
      // back to template name otherwise. Format: "1903-2003" with both,
      // "1980-Living" when no end date and not deceased, "1980-?" when
      // marked deceased without a death year. Approximate flag prepends ~.
      // Years project through viewCalendar via absoluteDay so a tree
      // mixing entries from different bound calendars reads consistently.
      let secondaryText = tpl?.name || "";
      if (tpl) {
        const lifespanField = tpl.fields.find(f => f.type === "calendar-date-range");
        if (lifespanField) {
          const ls = (ent.fields || {})[lifespanField.id];
          if (ls && (ls.start?.year != null || ls.end?.year != null)) {
            const entryCal = getCalendar(state, ent.calendarId);
            const projectYear = (date) => {
              if (!date || date.year == null) return null;
              const absDay = calendarDateToAbsoluteDay(entryCal, date);
              if (absDay == null) return null;
              const viewDate = absoluteDayToCalendarDate(viewCalendar, absDay);
              return viewDate?.year ?? null;
            };
            const startProj = projectYear(ls.start);
            const endProj = projectYear(ls.end);
            const startYr = startProj != null
              ? `${ls.start.approximate ? "~" : ""}${startProj}`
              : "?";
            const endYr = endProj != null
              ? `${ls.end.approximate ? "~" : ""}${endProj}`
              : (isDeceased ? "?" : "Living");
            secondaryText = `${startYr}\u2013${endYr}`;
          }
        }
      }
      const tplEl = g.append("text")
        .attr("x", 32).attr("y", 41)
        .attr("fill", "var(--text-dim)")
        .attr("font-size", 10)
        .attr("font-family", "DM Sans, sans-serif")
        .text(secondaryText);
      let tplDisplayed = secondaryText;
      while (tplEl.node().getComputedTextLength() > NAME_MAX_W && tplDisplayed.length > 2) {
        tplDisplayed = tplDisplayed.slice(0, -2) + "…";
        tplEl.text(tplDisplayed);
      }
    });

    // Zoom
    const zoom = d3.zoom()
      .scaleExtent([0.25, 2.5])
      .on("zoom", (event) => root.attr("transform", event.transform));
    svg.call(zoom);
    svgRef.current.__zoomBehavior = zoom;
  }, [focalId, state.entries, state.templates, family, onOpenEntry, maxUp, maxDown, viewCalendar, state.calendars]);

  // Empty states
  if (state.entries.length === 0) {
    return (
      <div className="family-view">
        <div className="family-empty">
          <div className="family-empty-glyph">⌂</div>
          <div className="family-empty-text">No entries yet.</div>
        </div>
      </div>
    );
  }

  if (!hasAnyRelations) {
    return (
      <div className="family-view">
        <div className="family-empty">
          <div className="family-empty-glyph">⌂</div>
          <div className="family-empty-text">No family relations configured.</div>
          <div className="family-empty-hint">
            Edit a template (typically Character), add an Entry Reference field labeled e.g. "Parents", and set its <strong>family role</strong> to "Parent of this". The tree builds itself.
            <br /><br />
            Optional: add another field with role "Spouse of this" for marriage links.
          </div>
        </div>
      </div>
    );
  }

  const sortedEntries = [...state.entries].sort((a, b) => a.name.localeCompare(b.name));
  const tree = focalId ? buildFamilyTree(focalId, family, maxUp, maxDown) : null;
  const stats = tree ? {
    ancestors: Object.values(tree.ancestorGens).reduce((s, ids) => s + ids.length, 0),
    descendants: Object.values(tree.descendantGens).reduce((s, ids) => s + ids.length, 0),
    focalRow: tree.focalGen.length,
  } : null;

  const zoomBy = (factor) => {
    if (!svgRef.current?.__zoomBehavior) return;
    d3.select(svgRef.current).transition().duration(200).call(svgRef.current.__zoomBehavior.scaleBy, factor);
  };
  const zoomReset = () => {
    if (!svgRef.current?.__zoomBehavior) return;
    d3.select(svgRef.current).transition().duration(300).call(svgRef.current.__zoomBehavior.transform, d3.zoomIdentity);
  };

  return (
    <div className="family-view">
      <svg ref={svgRef} className="family-svg" />

      <div className="family-controls">
        <div className="family-controls-label">Focal</div>
        <select
          className="input"
          value={focalId || ""}
          onChange={e => setFocalId(e.target.value)}
          style={{ width: "100%" }}
        >
          {sortedEntries.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        {hasAdditional && (
          <div style={{ marginTop: 8 }}>
            <ViewCalendarSelector />
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 2 }}>Generations up</div>
            <input
              type="number"
              className="input"
              min={1}
              max={10}
              value={maxUpStr}
              onChange={e => setMaxUpStr(e.target.value)}
              onBlur={() => setMaxUpStr(String(clampDepth(maxUpStr)))}
              style={{ width: "100%" }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 2 }}>Generations down</div>
            <input
              type="number"
              className="input"
              min={1}
              max={10}
              value={maxDownStr}
              onChange={e => setMaxDownStr(e.target.value)}
              onBlur={() => setMaxDownStr(String(clampDepth(maxDownStr)))}
              style={{ width: "100%" }}
            />
          </div>
        </div>
        <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 8, lineHeight: 1.5 }}>
          Click a node to refocus on that person. Shift+click to open the entry.
        </div>
        {onExportFamilyTree && focalId && (
          <button
            className="btn btn-ghost btn-small"
            style={{ marginTop: 8, width: "100%" }}
            onClick={() => onExportFamilyTree(focalId)}
            title="Download this family tree as Markdown (.md). Includes ancestors with Sosa-Stradonitz numbering, spouses, siblings, and descendants."
          >
            Export tree as Markdown ↓
          </button>
        )}
      </div>

      {stats && (
        <div className="family-stats">
          {stats.ancestors} ancestors · {stats.focalRow} on focal row · {stats.descendants} descendants
        </div>
      )}

      <div className="family-zoom-controls">
        <button className="graph-zoom-btn" onClick={() => zoomBy(1.4)} title="Zoom in">+</button>
        <button className="graph-zoom-btn" onClick={() => zoomBy(0.7)} title="Zoom out">−</button>
        <button className="graph-zoom-btn" onClick={zoomReset} title="Reset" style={{ fontSize: 11 }}>⊙</button>
      </div>
    </div>
  );
}